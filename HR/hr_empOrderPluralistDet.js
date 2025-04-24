const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const moment = require('moment')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')
const calcService = require('../HR/modules/calcService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const employeeService = require('../HR/modules/employeeService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsertUpdate)
me.on('update:after', afterInsertUpdate)

me.entity.addMethod('checkTabNum')
me.entity.addMethod('getVacListIDs')
me.entity.addMethod('doPosting')

function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams

  let attr = ctx.dataStore.entity.attributes['description']
  if (attr) {
    // execParams.description = ebs.getCompositeAttributeValue(ctx, 'description', cs.compositeFields, cs.compositeSeparator, false)
    const tarifCode = UB.Repository('hr_dictTarifCoeff').attrs('code').where('ID', '=', execParams.dictTarifCoeffID || instanceData.dictTarifCoeffID || -1).selectScalar() || '-'
    const wsName = UB.Repository('hr_workSchedule').attrs('name').where('ID', '=', execParams.workScheduleID || instanceData.workScheduleID || -1).selectScalar() || '-'
    const ecbName = UB.Repository('hr_dictCategoryECB').attrs('name').where('ID', '=', execParams.dictCategoryECBID || instanceData.dictCategoryECBID || -1).selectScalar() || '-'
    execParams.description = UB.i18n(`ставок {0}; розряд {1}; графік {2}; кат.заст.ос. {3}`, execParams.mtCount || instanceData.mtCount, tarifCode, wsName, ecbName)
  }
  execParams.title = ebs.getCompositeAttributeValue(ctx, 'title', ['departmentID.name', 'positionID.name', 'tabNum'], ' ', false)
  if (!execParams.description && !instanceData.description) {
    execParams.description = execParams.title
  }
  if (execParams.employeeID) {
    let pos = UB.Repository('hr_employee')
      .attrs([
        'firstName',
        'lastName',
        'middleName'
      ])
      .where('ID', '=', execParams.employeeID)
      .select()
    execParams.firstName = pos.get('firstName')
    execParams.lastName = pos.get('lastName')
    execParams.middleName = pos.get('middleName')

    let order
    if (!execParams.empOrderType && !instanceData.empOrderType && execParams.orderID) {
      order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.empOrderType = order.get('empOrderType')
    }
    if (!execParams.organizationID && !instanceData.organizationID && execParams.orderID) {
      order = order || UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.organizationID = order.get('organizationID')
    }
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  ebs.setDateTo(ctx)
  setDescription(ctx)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  const positionType = UB.Repository('hr_position')
    .attrs('positionType')
    .where('ID', '=', execParams.positionID)
    .selectScalar()
  const vacCtx = { mParams: {} }
  vacCtx.mParams = {
    employeeID: execParams.employeeID,
    employeeNumberID: execParams.employeeNumberID || null,
    positionType: positionType || '0',
    dateFrom: execParams.dateFrom,
    dateTo: execParams.dateTo,
    orderDetID: execParams.ID,
    messages: []
  }
  global['hr_empOrderVacationPlan'].addDefaultPluralistVacationPlan(vacCtx)
}

/**
 * Перевірити табельний номер
 * @param {object} ctx
 * @param {string} ctx.tabNum табельний номер
 * @param {number} ctx.organizationID організація
 * @param {number} ctx.ID Наказ про прийом на роботу. Деталь
 */
me.checkTabNum = function (ctx) {
  const execParams = ctx.mParams.execParams
  let tabNum = (execParams && execParams.tabNum) || ctx.mParams.tabNum
  const ID = (execParams && execParams.ID) || ctx.mParams.ID
  const organizationID = (execParams && execParams.organizationID) || ctx.mParams.organizationID

  if (!tabNum) {
    return
  }
  tabNum = String(tabNum)
  const allowSameTabNum = settingsService.getByCode('hrAllowSameTabNum', organizationID)
  const excludeEmployeeID = allowSameTabNum ? ctx.mParams.employeeID : null
  let info = UB.Repository('hr_employeeNumberS')
    .attrs('description')
    .where('tabNum', '=', tabNum)
    .whereIf(excludeEmployeeID, 'employeeID', '!=', excludeEmployeeID)
    .where('orgID', '=', organizationID)
    .selectScalar()
  if (info) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже зайнятий ({0})`, info)
    return
  }
  info = UB.Repository(__entityName)
    .attrs(['orderID.orderDate', 'orderID.orderNumber'])
    .where('tabNum', '=', tabNum)
    .where('organizationID', '=', organizationID)
    .where('ID', '<>', ID).select()
  if (!info.eof) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже введений у наказі про сумісництво № {0} від {1}`, info.get(1), info.get(0) ? moment(info.get(0)).format('DD.MM.YYYY') : '""')
  }
  info = UB.Repository('hr_empOrderAppointDet')
    .attrs(['orderID.orderDate', 'orderID.orderNumber'])
    .where('tabNum', '=', tabNum)
    .where('organizationID', '=', organizationID)
    .where('ID', '<>', ID).select()
  if (!info.eof) {
    ctx.mParams.info = UB.i18n(`Табельний номер вже введений у наказі про призначення № {0} від {1}`, info.get(1), info.get(0) ? moment(info.get(0)).format('DD.MM.YYYY') : '""')
  }
}

/**
 * Сформувати перелік осіб, які обіймають посаду та знаходяться у довготривалий відпустці
 * @param {object} ctx
 * @param {string} ctx.positionID
 * @param {number} ctx.organizationID
 * @param {number} ctx.dateFrom
 */
me.getVacListIDs = function (ctx) {
  const execParams = ctx.mParams.execParams
  let positionID = (execParams && execParams.positionID) || ctx.mParams.positionID
  const onDate = (execParams && execParams.onDate) || ctx.mParams.onDate
  const exceptEmpID = (execParams && execParams.exceptEmpID) || ctx.mParams.exceptEmpID
  const organizationID = (execParams && execParams.organizationID) || ctx.mParams.organizationID

  if (positionID && onDate && organizationID) {
    const prevPosID = UB.Repository('hr_position')
      .attrs('mi_data_id')
      .where('ID', '=', positionID)
      .selectScalar()

    if (prevPosID) {
      positionID = prevPosID
    }

    const store = UB.DataStore('hr_employeePosition')
    let sql = `
      select hep.ID from hr_employeePosition hep 
      join hr_empLongTermAbsc helta on helta .employeeNumberID = hep.employeeNumberID
      where hep.organizationID = :organizationID: AND hep.positionID = :positionID: 
      AND hep.dateFrom <= :onDate: AND hep.dateTo > :onDate:
      AND helta.dateFrom <= :onDate: AND helta.dateTo > :onDate:
      AND hep.mi_deleteDate >= '9999-12-31' AND helta.mi_deleteDate >= '9999-12-31' `
    if (exceptEmpID) {
      sql += ` AND hep.employeeID != ` + exceptEmpID
    }
    store.runSQL(sql, { positionID, organizationID, onDate })
    const result = store.getAsJsObject()
    store.freeNative()
    ctx.mParams.resultData = result.map(x => x['ID'])
  }
}

me.doPosting = ({ item, order, saved, isImportOperation, currentPeriod }) => {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'tabNum', 'dateFrom', 'dateTo', 'isResponsible', 'dictStaffCatID', 'isNewTabNum', 'employeeNumberID',
      'organizationID.mi_data_id', 'departmentID.mi_data_id', 'positionID', 'positionID.state', 'positionID.mi_data_id',
      'positionID.mi_dateFrom', 'positionID.mi_dateTo', 'employeeID', 'accrualSum', 'payElID', 'dictCategoryECBID',
      'workScheduleID', 'workerType', 'workPlace', 'contractType', 'mtCount', 'dictContractKindID', 'dictTarifCoeffID',
      'positionID.positionCategory.name', 'positionID.positionType', 'positionID.name', 'isChangeActivePos',
      'orderID', 'orderID.description', 'positionID.psCategory.name', 'employeeID.fullFIO', 'positionID.fullName',
      'dictFundSourceID', 'positionID.dictFundSourceID', 'dictCostTypeID', 'dictCostTypeID.accountID', 'dictEmpCategoryID',
      'posNameAddition', 'dictPositionID', 'positionID.fullNameNom', 'positionID.fullNameNomF', 'employeeID.sexType',
      'vacPositionID', 'vacPositionID.employeeNumberID'
    ])
    .selectById(item.ID)
  para.dateFrom = dateService.shiftDate(para.dateFrom)
  para.dateTo = dateService.shiftDate(para.dateTo)

  const mainPosition = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'dictCategoryECBID', 'dictFundSourceID', 'accountID'])
    .where('organizationID', '=', para['organizationID.mi_data_id'])
    .where('employeeID', '=', para.employeeID)
    .where('dateFrom', '<=', para.dateFrom)
    .where('dateTo', '>=', para.dateFrom)
    .where('workPlace', '=', '1')
    .selectSingle()
  if (para.workPlace === '2' && !mainPosition) {
    throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} не має призначення за основним місцем роботи', para['employeeID.fullFIO'])}>>>`)
  }

  let curPosition = {}
  orderService.checkIsParaOk(para)
  if (!para.payElID) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0}. Не вказано вид оплати для окладу, проведення неможливе', para['employeeID.fullFIO'])}>>>`)
  }
  if (!para['dictFundSourceID']) para['dictFundSourceID'] = para['positionID.dictFundSourceID']
  if (para.isNewTabNum) {
    para.employeeNumberID = orderService.insertByOrder({
      store: 'hr_employeeNumber',
      params: {
        employeeID: para.employeeID,
        dateFrom: para.dateFrom,
        dateTo: '#maxdate',
        tabNum: para.tabNum,
        orgID: para['organizationID.mi_data_id'],
        orderID: order.ID,
        paraID: para.ID,
        changeOrderID: null
      },
      saved: saved
    })
  } else {
    if (!para.employeeNumberID) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} не вказано табельний номер', para['employeeID.fullFIO'])}>>>`)
    }
    const empNum = UB.Repository('hr_employeeNumberS')
      .attrs(['ID'])
      .selectById(para.employeeNumberID)
    if (!empNum) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} не знайдено табельний номер, можливо було видалено', para['employeeID.fullFIO'])}>>>`)
    }
    const lastPos = UB.Repository('hr_employeePositionS')
      .attrs('dictCategoryECBID', 'dictFundSourceID', 'accountID', 'workScheduleID', 'dictStaffCatID')
      .where('employeeNumberID', '=', para.employeeNumberID)
      .orderByDesc('dateFrom')
      .selectSingle()
    if (lastPos) {
      if (!para.dictCategoryECBID) para.dictCategoryECBID = lastPos.dictCategoryECBID
      if (!para.dictFundSourceID) para.dictFundSourceID = lastPos.dictFundSourceID
      if (!para.accountID) para.accountID = lastPos.accountID
      if (!para.workScheduleID) para.workScheduleID = lastPos.workScheduleID
      if (!para.dictStaffCatID) para.dictStaffCatID = lastPos.dictStaffCatID
    }
    if (para.isChangeActivePos) {
      curPosition = UB.Repository('hr_employeePositionS')
        .attrs('*')
        .where('employeeNumberID', '=', para.employeeNumberID)
        .where('dateFrom', '<=', para.dateFrom)
        .where('dateTo', '>=', para.dateFrom)
        .where('changeOrderID', 'isNull')
        .where('workPlace', '=', '2')
        .selectSingle()
      if (!curPosition) {
        throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} не знайдено діючого призначення, або є більш пізднє призначення', para['employeeID.fullFIO'])}>>>`)
      }
      const inOneDay = dateService.shiftDate(curPosition['dateFrom']).getTime() === para.dateFrom.getTime()
      orderService.updateByOrder({
        store: 'hr_employeePosition',
        params: {
          ID: curPosition.ID,
          dateTo: inOneDay ? dateService.shiftDate(para.dateFrom) : dateService.addDays(para.dateFrom, -1),
          changeOrderID: para.orderID,
          isActive: inOneDay ? 0 : 1
        },
        saved: saved,
        oldValues: {
          dateTo: curPosition.dateTo,
          changeOrderID: curPosition.changeOrderID,
          isActive: 1
        }
      })
    } else if (!para.isNewTabNum) {
      const curpos = UB.Repository('hr_employeePositionS')
        .attrs('ID', 'dateTo', 'changeOrderID', 'dateFrom')
        .where('employeeNumberID', '=', para.employeeNumberID)
        .where('changeOrderID', 'isNull')
        .orderByDesc('dateTo')
        .selectSingle()
      if (curpos) {
        if (dateService.shiftDate(curpos.dateTo) >= para.dateFrom) {
          throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} є більш пізднє призначення', para['employeeID.fullFIO'])}>>>`)
        }
        orderService.updateByOrder({
          store: 'hr_employeePosition',
          params: {
            ID: curpos.ID,
            changeOrderID: para.orderID
          },
          saved: saved,
          oldValues: {
            changeOrderID: curpos.changeOrderID,
            isActive: 1
          }
        })
      }
    }
  }
  const dictContractKind = UB.Repository('hr_dictContractKind')
    .attrs(['code', 'isTerm']).selectById(para.dictContractKindID)
  const withReturn = para.isChangeActivePos && dictContractKind && dictContractKind.code === '20' && dictContractKind.isTerm

  para['accountID'] = para['dictCostTypeID.accountID']
  let coa = global['COA']
  if (coa && coa.dims['ac_dictCostType']) {
    para.d0 = coa.dims['ac_dictCostType'].ID
    para.d0Value = para['dictCostTypeID']
  }
  const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', order.organizationID)
  const workPosition = (isUseSexType && para['employeeID.sexType'] === 'W' ? para['positionID.fullNameNomF'] : para['positionID.fullNameNom']) || para['positionID.fullName']

  if (!para.dictCategoryECBID) para.dictCategoryECBID = mainPosition.dictCategoryECBID
  if (!para.dictFundSourceID) para.dictFundSourceID = mainPosition.dictFundSourceID
  if (!para.accountID) para.accountID = mainPosition.accountID
  para.changeOrderID = null
  para.appointOrder = para['orderID.description']
  para.appointReason = UB.i18n('Внутрішннє сумісництво')
  para.planDateTo = withReturn ? dateService.shiftDate(para.dateTo) : null
  para.employeePositionID = orderService.createEmployeePosition({
    para: para,
    saved: saved,
    isCreateWorkBookRecord: true,
    isImportOperation: isImportOperation,
    isNotCheckPosition: item.empOrderType === 'APPOINT_LIQ',
    mParams: {
      isOrgAppoint: true,
      positionCategory: para['positionID.positionType'] === '1' ? para['positionID.psCategory.name'] : null,
      positionType: para['positionID.positionType'],
      workPosition
    }
  })
  orderService.updateByOrder({
    store: item.mi_unityEntity,
    params: {
      ID: para.ID,
      employeePositionID: para.employeePositionID,
      employeeNumberID: para.employeeNumberID
    },
    saved: saved,
    oldValues: {
      employeePositionID: null,
      employeeNumberID: para.isNewTabNum ? null : para.employeeNumberID
    }
  })
  const dictFundSource = UB.Repository('hr_empOrderFundSource')
    .attrs(['dictFundSourceID', 'mtCount'])
    .where('paraID', '=', para.ID)
    .selectAsObject()
  dictFundSource.forEach(row => {
    orderService.insertByOrder({
      store: 'hr_empPosFundSource',
      params: {
        employeePositionID: para.employeePositionID,
        employeeNumberID: para.employeeNumberID,
        dictFundSourceID: row.dictFundSourceID,
        mtCount: row.mtCount || 0
      },
      saved: saved
    })
  })

  if (withReturn && para.employeePositionID) {
    const newPosition = UB.Repository('hr_employeePosition')
      .attrs('*')
      .selectById(para.employeePositionID)
    if (newPosition) {
      orderService.clearMiAttrs(curPosition)
      orderService.clearMiAttrs(newPosition)
      UB.DataStore('hr_employeePosition').run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: para.employeePositionID,
          changedValues: JSON.stringify({
            oldValues: curPosition,
            newValues: newPosition
          })
        }
      })
    }
  }
  const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
  const dictTimeCostNotWork = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('НіПр')).limit(1).selectScalar()
  const dateFrom = dateService.shiftDate(para.dateFrom)
  // const period = periodService.getPeriodOnDate(para['organizationID.mi_data_id'], dateFrom)
  if (!para.isNewTabNum) {
    if (currentPeriod && currentPeriod.ID && (dictTimeCost || dictTimeCostNotWork)) {
      timService.cancelTimeSheetByTimeCost(para.employeeNumberID, currentPeriod, [dictTimeCost || 0, dictTimeCostNotWork || 0], order.ID, dateFrom)
    }
  }

  // Нарахування
  orderService.createOrderAccrual({ para: para, saved: saved, isClosePrev: true, skipAutoCalcCondition: true, isAddMethod74: true })

  employeeService.updateEmployeeAddPersonDescription(para.employeeNumberID)

  calcService.addCalcTimeSheetQueue({ employeeNumberID: para.employeeNumberID, entityName: 'hr_empOrderPluralistDet' })
  if (!para.isChangeActivePos) {
    global.hr_empOrderVacationPlan.doPosting(order, para, saved, para.isNewTabNum)
  }

  if (para['vacPositionID.employeeNumberID']) {
    orderService.insertByOrder({
      store: 'hr_longTermReplace',
      params: {
        employeeNumberReplID: para.employeeNumberID,
        employeeNumberAbsID: para['vacPositionID.employeeNumberID'],
        organizationID: para['organizationID.mi_data_id'],
        dateFrom: para.dateFrom,
        dateToEmpty: para.dateTo,
        createOrderID: order.ID,
        changeOrderID: null
      },
      saved: saved
    })
  }
}

function afterInsertUpdate (ctx) {
  orderService.saveOrderFundSource(ctx)
}
