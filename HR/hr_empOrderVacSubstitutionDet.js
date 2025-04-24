const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:after', afterDelete)

me.entity.addMethod('clearActingDet')
me.entity.addMethod('clearVacSubstitutionDet')
me.entity.addMethod('fillVacSubstitution')
me.entity.addMethod('vacSubstitutionNote')
me.entity.addMethod('checkVacSubstitution')
me.entity.addMethod('validateVacSubstitution')

function beforeInsert (ctx) {
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
}

function beforeUpdate (ctx) {
  ebs.setDateTo(ctx)
}

function afterInsert (ctx) {
  const inParams = ctx.mParams.execParams
  const orderUnityStore = UB.DataStore('hr_employeeOrder')
  if (inParams.orderID && inParams.employeePositionID) {
    const emp = UB.Repository('hr_employeePositionS')
      .attrs(['employeeID', 'employeeNumberID'])
      .selectById(inParams.employeePositionID)
    orderUnityStore.run('insert', {
      execParams: {
        ID: inParams.ID,
        orderID: inParams.orderID,
        employeeID: emp.employeeID,
        employeeNumberID: emp.employeeNumberID,
        employeePositionID: inParams.employeePositionID,
        mi_unityEntity: ctx.dataStore.entity.name
      }
    })
  }
}

function afterUpdate (ctx) {
  const inParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeeOrder').attrs(['ID']).selectById(inParams.ID)) {
    const orderUnityStore = UB.DataStore('hr_employeeOrder')
    const emp = UB.Repository('hr_employeePositionS')
      .attrs(['employeeID', 'employeeNumberID'])
      .selectById(inParams.employeePositionID) || {}
    const ep = {
      ID: inParams.ID,
      employeePositionID: inParams.employeePositionID,
      employeeID: emp.employeeID,
      employeeNumberID: emp.employeeNumberID
    }

    if (inParams.orderID) {
      ep.orderID = inParams.orderID
    }
    if (inParams.orderID !== undefined) ep.orderID = inParams.orderID
    orderUnityStore.run('update', {
      execParams: ep,
      __skipOptimisticLock: true
    })
  }
}

function afterDelete (ctx) {
  const inParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeeOrder').attrs(['ID']).selectById(inParams.ID)) {
    UB.DataStore('hr_employeeOrder').run('delete', {
      execParams: { ID: inParams.ID }
    })
  }
}

me.clearActingDet = function (ctx) {
  const paraID = ctx.mParams.paraID || null
  const actingDet = UB.Repository('hr_empOrderActingDet')
    .attrs(['ID'])
    .where('paraID', '=', paraID)
    .selectAsObject()
  const store = UB.DataStore('hr_empOrderActingDet')
  actingDet.forEach(det => {
    store.run('delete', {
      execParams: {
        ID: det.ID
      }
    })
  })
}

me.clearVacSubstitutionDet = function (ctx) {
  const paraID = ctx.mParams.paraID || null
  const itemsDet = UB.Repository('hr_empOrderVacSubstitutionDet')
    .attrs(['ID'])
    .where('paraID', '=', paraID)
    .selectAsObject()
  const store = UB.DataStore('hr_empOrderVacSubstitutionDet')
  itemsDet.forEach(det => {
    store.run('delete', {
      execParams: {
        ID: det.ID
      }
    })
  })
}

me.fillVacSubstitution = function (ctx) {
  const execParams = ctx.mParams.execParams
  me.clearActingDet(ctx)
  me.clearVacSubstitutionDet(ctx)
  const onDate = execParams.onDate || execParams.dateFrom
  const paraID = ctx.mParams.paraID
  const checkDictContractKind = execParams.checkDictContractKind || false
  const empPos = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'dictContractKindID', 'description')
    .where('organizationID', '=', execParams.organizationID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('positionID', '=', execParams.positionID)
    .where('employeeNumberID', '<>', execParams.employeeNumberID)
    .selectAsObject()
  const store = UB.DataStore('hr_empOrderVacSubstitutionDet')
  const errors = []
  empPos.forEach(row => {
    if (checkDictContractKind && !row.dictContractKindID) {
      errors.push(row.description)
    } else {
      store.run('insert', {
        execParams: {
          ID: store.generateID(),
          orderID: execParams.orderID,
          paraID: paraID,
          employeePositionID: row.ID,
          dateFrom: execParams.dateFrom,
          dateTo: '#maxdate',
          dictContractKindID: row.dictContractKindID,
          note: getVacSubstitutionNote(row.employeeNumberID, execParams.positionID, row.dateTo)
        }
      })
    }
  })
  ctx.mParams.errors = JSON.stringify(errors)
}

me.vacSubstitutionNote = function (ctx) {
  const execParams = ctx.mParams.execParams
  const empPos = UB.Repository('hr_employeePositionS')
    .attrs('dateFrom', 'dateTo', 'employeeNumberID')
    .selectById(execParams.employeePositionID)
  ctx.mParams.note = getVacSubstitutionNote(empPos.employeeNumberID, execParams.positionID, empPos.dateTo)
}

function getVacSubstitutionNote (employeeNumberID, positionID, dateTo) {
  const posHistory = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'dateFrom', 'dateTo', 'positionID')
    .where('employeeNumberID', '=', employeeNumberID)
    .orderBy('dateFrom', 'desc')
    .select()
  let posStart = posHistory.get('positionID') === positionID ? posHistory.get('dateFrom') : null
  let flag = true
  while (!posHistory.eof && flag) {
    if (posHistory.get('positionID') !== positionID) {
      flag = false
    } else {
      posStart = posHistory.get('dateFrom')
    }
    posHistory.next()
  }
  return (posStart ? `${UB.i18n('З')} ${dateService.formatDate(posStart)}` : '') + (dateService.isMaxDate(dateService.shiftDate(dateTo)) ? '' : ` ${UB.i18n('по')} ${dateService.formatDate(dateTo)}`)
}

me.checkVacSubstitution = function (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.isValid = validateVacSubstitutionDay(execParams.employeeNumberID, execParams.dateFrom)
}

me.validateVacSubstitution = function (ctx) {
  const execParams = ctx.mParams.execParams
  const errors = []
  const detail = UB.Repository('hr_empOrderDet')
    .attrs('ID', 'mi_unityEntity')
    .where('orderID', '=', execParams.orderID)
    .where('empOrderType', '=', 'DISM')
    .where('isExternal', '<>', 1)
    .where(`coalesce([orderState], '!') <> 'CANCELED'`, 'custom')
    .where(`coalesce([paraID.orderState], '!') <> 'CANCELED'`, 'custom')
    .selectAsObject()
  detail.forEach(item => {
    const para = UB.Repository(item.mi_unityEntity)
      .attrs(['ID', 'dateFrom', 'employeePositionID', 'employeeNumberID', 'employeeID',
        'employeeNumberID.description', 'employeeID.fullFIO'
      ]).misc({ __mip_recordhistory_all: true }).selectById(item.ID)
    const vacSubstDet = UB.Repository('hr_empOrderVacSubstitutionDet')
      .attrs(['employeePositionID.employeeNumberID.description'])
      .where('paraID', '=', item.ID)
      .selectAsObject({
        'employeePositionID.employeeNumberID.description': 'description'
      })
    if (vacSubstDet.length) {
      const isValid = validateVacSubstitutionDay(para.employeeNumberID, para.dateFrom)
      if (!isValid) {
        const empList = UB.i18n(`Продовжити час перебування на посаді {0} не можливо.`, vacSubstDet.map(o => o['description']).join(', '))
        errors.push(UB.i18n(`{0} {1} на дату звільнення не знаходиться у довготривалій відпустці.`, empList, para['employeeNumberID.description']))
      }
    }
  })
  ctx.mParams.errors = errors
}

function validateVacSubstitutionDay (employeeNumberID, dateFrom) {
  const longVacCodes = ['dCh3Y', 'dCh6Y']
  let isValid = false
  const dictTimeCost = UB.Repository('hr_dictVacationKind')
    .attrs('dictTimeCostID')
    .where('code', 'in', longVacCodes)
    .where('dictTimeCostID', 'isNotNull')
    .selectAsObject()

  if (dictTimeCost.length) {
    const timeSheetDayID = UB.Repository('tim_timeSheet')
      .attrs('ID')
      .where('dateWork', '=', dateService.shiftDate(dateFrom))
      .where('factTimeCostID', 'in', dictTimeCost.map(o => o.dictTimeCostID))
      .where('isActive', '=', 1)
      .where('employeeNumberID', '=', employeeNumberID)
      .selectSingle()
    isValid = !!timeSheetDayID
  }
  return isValid
}
