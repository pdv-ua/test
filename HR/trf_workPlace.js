const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')
const accrualService = require('../HR/modules/accrualService')
const algorithmService = require('../HR/modules/algorithmService')
const orderService = require('../HR/modules/orderService')
const tarifficationService = require('../HR/modules/tarifficationService')
const calcService = require('../HR/modules/calcService')
const periodService = require('../HR/modules/periodService')

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('setWorkPlaces')
me.entity.addMethod('calcPositions')
me.entity.addMethod('calcEmployeeExperience')
me.entity.addMethod('getDictAccrualDt')
me.entity.addMethod('calcWorkPlaces')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.details = [
  {
    detailName: 'position',
    entityName: 'trf_position',
    docIDName: 'workPlaceID',
    fieldList: orderService.setFieldListAttribute([
      'dictPositionID.caption', 'dictSubjectID.description', 'dictTarifCoeffID.name',
      'dictFundSourceID.name',
      'dictProgClassID.description',
      // 'workScheduleID.name',
      'workNormID.weekHours',
      'rate', 'accrualSum', 'dictEducationLevelID',
      'dictEducationRankID.description', 'dictQualificationID', 'dictRankID', 'dictRankID.description',
      'dictPositionID.positionType', 'dictPositionID.dictStaffCatID.accCategory', 'posIndex', 'dictPartID', 'dictPartID.name'
    ], ['lineNum']),
    orderBy: 'posIndex',
    JSONAttr: ['accrual'],
    subDetail: [
      {
        subDetailName: 'accrual',
        subEntityName: 'trf_accrual',
        subDocIDName: 'positionID',
        orderBy: 'priority',
        subFieldList: orderService.setFieldListAttribute([
          'payElID.methodID.code', 'payElID.description', 'flagsFix', 'baseSum', 'experienceYears', 'experienceMonths',
          'accrualRate', 'hours', 'rate', 'accrualSum', 'priority', 'flagsFix', 'dictPupilID', 'dictPupilID.name',
          'employeeAccrualID', 'employeeAccrualID.dateFrom', 'employeeAccrualID.dateTo',
          'leadingClass'
        ],
        ['lineNum'])
      }
    ]
  }
]

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  orderService.saveDetails(ctx, me.details)
  if (execParams.state === 'POSTED') {
    me.doPosting(ctx)
  }
  updateDocument(ctx)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeDelete (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (instanceData.state === 'POSTED') {
    throw new UB.UBAbort(`<<<Неможливо видалити проведене робоче місце>>>`)
  }
}

function beforeInsert (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, previousValues)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  entityService.setAttrs(ctx, false, ctx.previousValues)
  setDescription(ctx)
  orderService.saveDetails(ctx, me.details)
  if (execParams.state) {
    if (execParams.state === 'POSTED') {
      me.doPosting(ctx)
    }
    if (execParams.state === 'PROJECT') {
      me.doCancelPosting(ctx)
    }
  }
}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const workPlaceDescription = (execParams.employeeNumberID || previousValues.employeeNumberID)
    ? UB.Repository('hr_employeeNumberSR')
      .attrs(['description'])
      .where('ID', '=', (execParams.employeeNumberID || previousValues.employeeNumberID))
      .selectScalar() : 'Вакансія'
  const positionDescription = (execParams.dictPositionID || previousValues.dictPositionID)
    ? UB.Repository('hr_dictPosition')
      .attrs(['description'])
      .where('ID', '=', (execParams.dictPositionID || previousValues.dictPositionID))
      .selectScalar() : ''
  execParams.description = `${workPlaceDescription}${positionDescription ? ` / ${positionDescription}` : ''}`
}

me.doPosting = function (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = Object.assign(Object.assign({}, ctx.previousValues), execParams)
  const document = UB.Repository('trf_document').attrs(['ID', 'orgID', 'type', 'description']).selectById(instanceData.documentID)
  const postedWorkPlace = findPostedWorkPlace(ctx)
  if (postedWorkPlace) {
    postedWorkPlace.dateFrom = dateService.formatDate(dateService.shiftDate(postedWorkPlace.dateFrom))
    throw new UB.UBAbort(`<<<${UB.i18n('Вже існує проведене робоче місце {0}. Документ № {1} від {2}, {3}.',
      postedWorkPlace.description, postedWorkPlace.docNumber, dateService.formatDate(dateService.shiftDate(postedWorkPlace.dateFrom)), postedWorkPlace.name)}>>>`)
  }
  const workPlace = UB.Repository('trf_workPlace')
    .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'documentID.type', 'employeeNumberID.description',
      'departmentID', 'departmentID.name', 'dictPositionID.name', 'description'])
    .selectById(execParams.ID)
  workPlace.dateFrom = execParams.dateFrom || workPlace.dateFrom
  workPlace.dateTo = execParams.dateTo || workPlace.dateTo
  workPlace.employeeNumberID = execParams.employeeNumberID || workPlace.employeeNumberID
  workPlace.departmentID = execParams.departmentID || workPlace.departmentID

  const workPlaceName = workPlace.employeeNumberID
    ? workPlace['employeeNumberID.description']
    : `${workPlace['dictPositionID.name']}, ${workPlace['departmentID.name']}`
  if (!checkDictFundSourceID(workPlace.ID)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не визначено джерело фінансування для посадових мість робочого місця {0}.', workPlaceName)}>>>`)
  }
  if (!checkProgClassID(workPlace.ID)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не визначено КПК для посадових мість робочого місця {0}.', workPlaceName)}>>>`)
  }
  if (!checkDictSubjectID(workPlace.ID)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не визначено предмет для посадових місць робочого місяця {0}.', workPlaceName)}>>>`)
  }
  if (!checkDicPupilID(workPlace.ID)) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не визначено категорію учнів для нарахувань робочого місяця {0}.', workPlaceName)}>>>`)
  }
  if (workPlace && workPlace.employeeNumberID && workPlace.dateFrom && workPlace['documentID.type'] === 'FACT') {
    const currentPeriod = periodService.getCurrentPeriod(document.orgID)
    const recalcEmployeeNumbers = [workPlace.employeeNumberID]
    const changedValues = { workPlace: [], updateEmployeeNumbers: [], updateEmployeePositions: [], insertEmployeeNumbers: [], insertEmployeePositions: [] }
    const workPlaceStore = UB.DataStore('trf_workPlace')
    const dateFrom = dateService.shiftDate(workPlace.dateFrom)
    const dateTo = dateService.shiftDate(workPlace.dateTo)
    const workPlaces = UB.Repository('trf_workPlace')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'documentID.docNumber', 'documentID.dateFrom', 'documentID.name', 'employeeNumberID.description'])
      .where('employeeNumberID', '=', workPlace.employeeNumberID)
      .where('state', '=', 'POSTED')
      .where('documentID.type', '=', 'FACT')
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('ID', '<>', workPlace.ID)
      .selectAsObject()
    const workPlaceIDs = [workPlace.ID]
    let payElID = null
    const payElEntry = [0]
    const payElIDs = UB.Repository('hr_payEl').attrs('ID').where('methodID.code', '=', '1').selectAsObject()
    const payElEntryList = payElIDs.length ? UB.Repository('hr_payElEntry').attrs(['payElID', 'payElBaseID'])
      .where('payElID', 'in', payElIDs.map(o => o.ID))
      .where('entryType', '=', 'SUM')
      // .where('payElBaseID.methodID.code', 'notIn', ['143', '144', '145', '152'])
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject() : []
    payElIDs.forEach(payEl => {
      if (!payElID) {
        const entry = payElEntryList.filter(o => o.payElID === payEl.ID)
        if (entry.length) {
          payElID = payEl.ID
          payElEntry.push(...entry.map(o => o.payElBaseID))
        }
      }
    })

    workPlaces.forEach(wp => {
      if (dateService.shiftDate(wp.dateFrom) > dateFrom && dateService.shiftDate(wp.dateFrom) <= dateTo) {
        throw new UB.UBAbort(`<<<${UB.i18n('Вже існує проведене робоче місце {0}. Документ № {1} від {2}, {3}. яка починається в період дії поточного робочого місця',
          wp['employeeNumberID.description'], wp['documentID.docNumber'], dateService.formatDate(dateService.shiftDate(wp['documentID.dateFrom'])), wp['documentID.name'])}>>>`)
      }
      changedValues.workPlace.push({
        ID: wp.ID,
        dateTo: wp.dateTo
      })
      workPlaceStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: wp.ID,
          dateTo: dateFrom > dateService.shiftDate(wp.dateFrom) ? dateService.addDays(dateFrom, -1) : dateService.shiftDate(wp.dateFrom)
        }
      })
      workPlaceIDs.push(wp.ID)
    })

    const employeeNumberStore = UB.DataStore('hr_employeeNumber')
    const employeePositionStore = UB.DataStore('hr_employeePosition')
    const empPosFundSourceStore = UB.DataStore('hr_empPosFundSource')
    const mainEmployeeNumber = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'orgID', 'tabNum', 'employeeID', 'dateFrom', 'dateTo', 'payOutID', 'personalAccount', 'bankSubAccount', 'limitedAccess'])
      .selectById(workPlace.employeeNumberID)
    const employeeNumbers = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'empWorkPlace', 'empDictPositionID', 'tabNumIndex', 'dateFrom', 'dateTo', 'changeOrderID'])
      .where('mainEmpNumberID', '=', workPlace.employeeNumberID)
      .where('empWorkPlace', '=', '5')
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
    let tabNumIndex = employeeNumbers.reduce((index, row) => {
      if (row.tabNumIndex > index) {
        index = row.tabNumIndex
      }
      row.dictFundSources = []
      return index
    }, 0) || 0
    const mainEmployeePosition = UB.Repository('hr_employeePosition')
      .attrs(['*', 'workScheduleID.weekDays', 'workScheduleID.isSummarized', 'workScheduleID.organizationID'])
      .where('employeeNumberID', '=', workPlace.employeeNumberID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .limit(1)
      .selectSingle()
    const mainEmployeePositions = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID', 'orderID', 'isActive', 'payElID'])
      .where('employeeNumberID', '=', workPlace.employeeNumberID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
    const positions = UB.Repository('trf_position').attrs(['ID', 'dictPositionID', 'rate', 'dictRankID', 'accrualSum',
      'dictProgClassID', 'dictFundSourceID', 'dictTarifCoeffID', 'dictQualificationID', 'workNormID', 'workNormID.weekHours'])
      .where('workPlaceID', '=', workPlace.ID)
      // .where('rate', '>', 0)
      .orderBy('posIndex')
      .selectAsObject()
    const allPosData = {
      dictPositionID: positions.length ? positions[0].dictPositionID : null,
      mtCount: 0,
      accrualSum: 0,
      dictRankID: positions.length ? positions[0].dictRankID : null,
      dictQualificationID: positions.length ? positions[0].dictQualificationID : null,
      dictProgClassID: positions.length ? positions[0].dictProgClassID : null,
      dictFundSourceID: positions.length ? positions[0].dictFundSourceID : null,
      dictTarifCoeffID: positions.length ? positions[0].dictTarifCoeffID : null,
      dictFundSources: []
    }
    positions.forEach((position, idx) => {
      position.accrualSum = (UB.Repository('trf_accrual').attrs(['SUM([accrualSum])'])
        .where('positionID', '=', position.ID)
        .where('payElID', 'in', payElEntry).selectScalar() || 0) * (position.rate || 0)
      allPosData.mtCount = accrualService.round((allPosData.mtCount || 0) + (position.rate || 0), 6)
      let workScheduleID = mainEmployeePosition ? mainEmployeePosition.workScheduleID : null
      const workSchedule = UB.Repository('hr_workSchedule')
        .attrs(['ID', 'weekDays', 'weekHours'])
        .where('weekHours', '=', position['workNormID.weekHours'])
        .whereIf(mainEmployeePosition, 'weekDays', '=', mainEmployeePosition['workScheduleID.weekDays'])
        .whereIf(mainEmployeePosition, 'isSummarized', '=', mainEmployeePosition['workScheduleID.isSummarized'])
        .whereIf(mainEmployeePosition, 'organizationID', '=', mainEmployeePosition['workScheduleID.organizationID'])
        .limit(1)
        .orderBy('code')
        .selectSingle()

      if (workSchedule) {
        workScheduleID = workSchedule.ID
      }
      if (idx === 0) {
        allPosData.accrualSum = (position.accrualSum || 0) / (position.rate || 0)
      }
      const mainDictFundSource = allPosData.dictFundSources.find(o => o.dictFundSourceID === (position.dictFundSourceID || null) && o.dictProgClassID === (position.dictProgClassID || null))
      if (mainDictFundSource) {
        mainDictFundSource.mtCount = accrualService.round((mainDictFundSource.mtCount || 0) + (position.rate || 0), 6)
      } else {
        allPosData.dictFundSources.push({ dictFundSourceID: (position.dictFundSourceID || null), dictProgClassID: (position.dictProgClassID || null), mtCount: (position.rate || 0) })
      }
      let employeeNumber = employeeNumbers.find(o => o.empDictPositionID === position.dictPositionID)
      if (!employeeNumber) {
        employeeNumber = {
          empDictPositionID: position.dictPositionID,
          mtCount: position.rate || 0,
          accrualSum: position.accrualSum || 0,
          dictRankID: position.dictRankID,
          dictQualificationID: position.dictQualificationID,
          dictProgClassID: position.dictProgClassID,
          dictFundSourceID: position.dictFundSourceID,
          dictTarifCoeffID: position.dictTarifCoeffID,
          dictFundSources: [ { dictFundSourceID: (position.dictFundSourceID || null), dictProgClassID: (position.dictProgClassID || null), mtCount: (position.rate || 0) } ],
          workScheduleID
        }
        employeeNumbers.push(employeeNumber)
      } else {
        employeeNumber.mtCount = accrualService.round((employeeNumber.mtCount || 0) + (position.rate || 0), 6)
        employeeNumber.accrualSum = (employeeNumber.accrualSum || 0) + (position.accrualSum || 0)
        employeeNumber.dictProgClassID = employeeNumber.dictProgClassID || position.dictProgClassID
        employeeNumber.dictFundSourceID = employeeNumber.dictFundSourceID || position.dictFundSourceID
        employeeNumber.dictTarifCoeffID = employeeNumber.dictTarifCoeffID || position.dictTarifCoeffID
        if (!employeeNumber.workScheduleID) {
          employeeNumber.workScheduleID = workScheduleID
        }
        const dictFundSource = employeeNumber.dictFundSources.find(o => o.dictFundSourceID === (position.dictFundSourceID || null) && o.dictProgClassID === (position.dictProgClassID || null))
        if (dictFundSource) {
          dictFundSource.mtCount = accrualService.round((dictFundSource.mtCount || 0) + (position.rate || 0), 6)
        } else {
          employeeNumber.dictFundSources.push({ dictFundSourceID: (position.dictFundSourceID || null), dictProgClassID: (position.dictProgClassID || null), mtCount: (position.rate || 0) })
        }
        if (employeeNumber.ID) {
          employeeNumber.update = true
        }
      }
    })
    // allPosData.accrualSum = employeeNumbers.length ? employeeNumbers[0].accrualSum / employeeNumbers[0].mtCount : 0
    // Редагуєм призначення основного
    mainEmployeePositions.forEach(row => {
      const uExecParams = {
        ID: row.ID,
        dateFrom: dateService.shiftDate(row.dateFrom) <= dateFrom ? dateService.shiftDate(row.dateFrom) : dateService.addDays(dateFrom, -1),
        dateTo: dateService.shiftDate(row.dateTo) >= dateTo ? dateFrom.getTime() === dateService.shiftDate(row.dateFrom).getTime() ? dateService.shiftDate(row.dateFrom) : dateService.addDays(dateFrom, -1) : dateService.shiftDate(row.dateTo),
        changeOrderID: workPlace.ID,
        payElID: row.payElID || payElID,
        isActive: dateFrom.getTime() !== dateService.shiftDate(row.dateFrom).getTime()
      }
      const changeExecParams = {
        ID: row.ID,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo,
        changeOrderID: row.changeOrderID,
        payElID: row.payElID,
        isActive: row.isActive
      }
      if (uExecParams.payElID === row.payElID) {
        delete uExecParams.payElID
        delete changeExecParams.payElID
      }
      if (uExecParams.isActive === row.isActive) {
        delete uExecParams.isActive
        delete changeExecParams.isActive
      }
      if (uExecParams.dateFrom.getTime() === dateService.shiftDate(row.dateFrom).getTime()) {
        delete uExecParams.dateFrom
        delete changeExecParams.dateFrom
      }
      if (uExecParams.dateTo.getTime() === dateService.shiftDate(row.dateTo).getTime()) {
        delete uExecParams.dateTo
        delete changeExecParams.dateTo
      }

      changedValues.updateEmployeePositions.push(changeExecParams)

      employeePositionStore.run('update', {
        __skipOptimisticLock: true,
        isDirectUpdate: true,
        skipCheckTabNum: true,
        execParams: uExecParams
      })
    })

    const store = UB.DataStore('hr_employeePosition')
    store.runSQL(`SELECT ID "ID" FROM hr_employeePosition WHERE employeeNumberID = :employeeNumberID: AND
          orderID = :orderID: AND mi_deleteUser IS NOT NULL`, {
      employeeNumberID: workPlace.employeeNumberID,
      orderID: workPlace.ID
    })
    const mainPosition = store.getAsJsObject()
    const newMainEmployeePosition = Object.assign({}, mainEmployeePosition || {})
    if (mainEmployeePosition) {
      delete newMainEmployeePosition.mi_createUser
      delete newMainEmployeePosition.mi_createDate
      delete newMainEmployeePosition.mi_deleteDate
      delete newMainEmployeePosition.mi_deleteUser
      delete newMainEmployeePosition.mi_modifyDate
      delete newMainEmployeePosition.mi_modifyUser
      delete newMainEmployeePosition['workScheduleID.weekDays']
      delete newMainEmployeePosition['workScheduleID.isSummarized']
      delete newMainEmployeePosition['workScheduleID.organizationID']
    } else {
      newMainEmployeePosition.employeeID = mainEmployeeNumber.employeeID
      newMainEmployeePosition.employeeNumberID = workPlace.employeeNumberID
      newMainEmployeePosition.organizationID = mainEmployeeNumber.orgID
      newMainEmployeePosition.isActive = 1
      newMainEmployeePosition.workPlace = '1'
    }
    newMainEmployeePosition.orderID = workPlace.ID
    newMainEmployeePosition.dateFrom = dateService.shiftDate(dateFrom)
    newMainEmployeePosition.dateTo = dateService.shiftDate(dateTo)
    newMainEmployeePosition.dictPositionID = allPosData.dictPositionID
    newMainEmployeePosition.mtCount = allPosData.mtCount

    newMainEmployeePosition.dictRankID = allPosData.dictRankID
    newMainEmployeePosition.dictQualificationID = allPosData.dictQualificationID
    newMainEmployeePosition.accrualSum = accrualService.round(allPosData.accrualSum || 0)
    newMainEmployeePosition.dictProgClassID = allPosData.dictProgClassID
    newMainEmployeePosition.dictTarifCoeffID = allPosData.dictTarifCoeffID
    if (!newMainEmployeePosition.payElID) {
      newMainEmployeePosition.payElID = payElID
    }
    if (mainPosition.length) {
      store.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = '9999-12-31', mi_deleteUser = null WHERE ID = :ID:`, {
        ID: mainPosition[0].ID
      })
      newMainEmployeePosition.ID = mainPosition[0].ID
      employeePositionStore.run('update', {
        isDirectUpdate: true,
        __skipOptimisticLock: true,
        execParams: newMainEmployeePosition
      })
    } else {
      newMainEmployeePosition.employeeNumberID = workPlace.employeeNumberID
      newMainEmployeePosition.ID = employeePositionStore.generateID()
      employeePositionStore.run('insert', {
        execParams: newMainEmployeePosition
      })
    }
    const mainEmpPosFundSource = UB.Repository('hr_empPosFundSource')
      .attrs(['ID', 'dictFundSourceID', 'dictProgClassID', 'mtCount'])
      .where('employeeNumberID', '=', workPlace.employeeNumberID)
      .where('employeePositionID', '=', newMainEmployeePosition.ID)
      .selectAsObject()
    mainEmpPosFundSource.forEach(row => {
      const fundSource = allPosData.dictFundSources.find(o => o.dictFundSourceID === (row.dictFundSourceID || null) && o.dictProgClassID === (row.dictProgClassID || null) && !o.isUpdate)
      if (fundSource) {
        empPosFundSourceStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            dictFundSourceID: fundSource.dictFundSourceID,
            dictProgClassID: fundSource.dictProgClassID,
            mtCount: fundSource.mtCount
          }
        })
        fundSource.isUpdate = true
      } else {
        empPosFundSourceStore.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      }
    })
    allPosData.dictFundSources.forEach(row => {
      if (!row.isUpdate) {
        empPosFundSourceStore.run('insert', {
          execParams: {
            ID: empPosFundSourceStore.generateID(),
            employeeNumberID: workPlace.employeeNumberID,
            employeePositionID: newMainEmployeePosition.ID,
            dictFundSourceID: row.dictFundSourceID,
            dictProgClassID: row.dictProgClassID,
            mtCount: row.mtCount
          }
        })
      }
    })
    employeeNumbers.forEach(employeeNumber => {
      if (employeeNumber.ID && !employeeNumber.update) {
        const employeePositions = UB.Repository('hr_employeePositionS')
          .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID'])
          .where('employeeNumberID', '=', employeeNumber.ID)
          .where('orderID', 'in', workPlaceIDs)
          .where('dateFrom', '<=', dateTo)
          .where('dateTo', '>=', dateFrom)
          .selectAsObject()
        employeePositions.forEach(row => {
          changedValues.updateEmployeePositions.push({
            ID: row.ID,
            dateTo: row.dateTo,
            changeOrderID: row.changeOrderID,
            employeeNumberID: employeeNumber.ID
          })
          employeePositionStore.run('update', {
            __skipOptimisticLock: true,
            skipCheckTabNum: true,
            execParams: {
              ID: row.ID,
              dateTo: dateService.addDays(dateFrom, -1),
              changeOrderID: workPlace.ID
            }
          })
        })
        recalcEmployeeNumbers.push(employeeNumber.ID)
      } else {
        const newEmployePosition = {
          orderID: workPlace.ID,
          employeeID: mainEmployeeNumber.employeeID,
          employeeNumberID: employeeNumber.ID,
          organizationID: mainEmployeeNumber.orgID,
          departmentID: mainEmployeePosition ? mainEmployeePosition.departmentID : null,
          dateFrom: dateService.shiftDate(dateFrom),
          dateTo: dateService.shiftDate(dateTo),
          dictPositionID: employeeNumber.empDictPositionID,
          mtCount: employeeNumber.mtCount,
          isActive: 1,
          workPlace: '5',
          workScheduleID: employeeNumber.workScheduleID,
          payElID: mainEmployeePosition ? mainEmployeePosition.payElID : payElID,
          dictStaffCatID: mainEmployeePosition ? mainEmployeePosition.dictStaffCatID : null,
          workerType: mainEmployeePosition ? mainEmployeePosition.workerType : null,
          // dictCategoryECBID: mainEmployeePosition ? mainEmployeePosition.dictCategoryECBID : null,
          contractType: mainEmployeePosition ? mainEmployeePosition.contractType : null,
          dictContractKindID: mainEmployeePosition ? mainEmployeePosition.dictContractKindID : null,
          dictEmpCategoryID: mainEmployeePosition ? mainEmployeePosition.dictEmpCategoryID : null,
          dictRankID: employeeNumber.dictRankID,
          dictQualificationID: employeeNumber.dictQualificationID,
          accrualSum: accrualService.round(employeeNumber.accrualSum / employeeNumber.mtCount),
          dictProgClassID: employeeNumber.dictProgClassID || null,
          dictTarifCoeffID: employeeNumber.dictTarifCoeffID || null
        }

        if (!employeeNumber.ID) {
          employeeNumber.ID = employeeNumberStore.generateID()
          employeeNumberStore.run('insert', {
            __skipOptimisticLock: true,
            skipCheckTabNum: true,
            execParams: {
              ID: employeeNumber.ID,
              orgID: mainEmployeeNumber.orgID,
              employeeID: mainEmployeeNumber.employeeID,
              payOutID: mainEmployeeNumber.payOutID,
              personalAccount: mainEmployeeNumber.personalAccount,
              bankSubAccount: mainEmployeeNumber.bankSubAccount,
              limitedAccess: mainEmployeeNumber.limitedAccess,
              dateFrom: dateFrom,
              dateTo: mainEmployeeNumber.dateTo,
              kind: 'WORK',
              mainEmpNumberID: mainEmployeeNumber.ID,
              orderID: workPlace.ID,
              empWorkPlace: '5',
              empDictPositionID: employeeNumber.empDictPositionID,
              tabNum: `${mainEmployeeNumber.tabNum}.${++tabNumIndex}`
            }
          })
          newEmployePosition.employeeNumberID = employeeNumber.ID
          newEmployePosition.ID = employeePositionStore.generateID()
          employeePositionStore.run('insert', {
            execParams: newEmployePosition
          })
          if (employeeNumber.dictFundSources.length) {
            employeeNumber.dictFundSources.forEach(row => {
              empPosFundSourceStore.run('insert', {
                execParams: {
                  ID: empPosFundSourceStore.generateID(),
                  employeeNumberID: employeeNumber.ID,
                  employeePositionID: newEmployePosition.ID,
                  dictFundSourceID: row.dictFundSourceID,
                  dictProgClassID: row.dictProgClassID,
                  mtCount: row.mtCount
                }
              })
            })
          }
        } else {
          if (employeeNumber.dateFrom && dateService.shiftDate(employeeNumber.dateFrom) > dateFrom) {
            employeeNumberStore.run('update', {
              __skipOptimisticLock: true,
              skipCheckTabNum: true,
              execParams: {
                ID: employeeNumber.ID,
                dateFrom: dateFrom
              }
            })
          }
          let employeePositionPayElID
          const employeePositions = UB.Repository('hr_employeePosition')
            .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID', 'orderID', 'isActive', 'payElID'])
            .where('employeeNumberID', '=', employeeNumber.ID)
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateFrom)
            .where('orderID', 'in', workPlaceIDs)
            .orderBy('dateFrom')
            .selectAsObject()
          if (employeePositions.length) {
            employeePositions.forEach(row => {
              if (row.payElID) {
                employeePositionPayElID = row.payElID
              }
              changedValues.updateEmployeePositions.push({
                ID: row.ID,
                dateTo: row.dateTo,
                changeOrderID: row.changeOrderID,
                employeeNumberID: employeeNumber.ID
              })
              employeePositionStore.run('update', {
                __skipOptimisticLock: true,
                skipCheckTabNum: true,
                execParams: {
                  ID: row.ID,
                  dateTo: dateFrom > dateService.shiftDate(row.dateFrom) ? dateService.addDays(dateFrom, -1) : dateService.shiftDate(row.dateFrom),
                  changeOrderID: workPlace.ID
                }
              })
            })
          }
          store.runSQL(`SELECT ID "ID" FROM hr_employeePosition WHERE employeeNumberID = :employeeNumberID: AND
          orderID = :orderID: AND mi_deleteUser IS NOT NULL`, {
            employeeNumberID: employeeNumber.ID,
            orderID: workPlace.ID
          })
          const wpPosition = store.getAsJsObject()
          if (wpPosition.length) {
            store.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = '9999-12-31', mi_deleteUser = null WHERE ID = :ID:`, {
              ID: wpPosition[0].ID
            })

            newEmployePosition.ID = wpPosition[0].ID
            if (employeePositionPayElID) {
              newEmployePosition.payElID = employeePositionPayElID
            }
            employeePositionStore.run('update', {
              isDirectUpdate: true,
              __skipOptimisticLock: true,
              execParams: newEmployePosition
            })
            const newEmpPosFundSource = UB.Repository('hr_empPosFundSource')
              .attrs(['ID', 'dictFundSourceID', 'dictProgClassID', 'mtCount'])
              .where('employeeNumberID', '=', employeeNumber.ID)
              .where('employeePositionID', '=', newEmployePosition.ID)
              .selectAsObject()
            newEmpPosFundSource.forEach(row => {
              const fundSource = employeeNumber.dictFundSources.find(o => o.dictFundSourceID === (row.dictFundSourceID || null) && o.dictProgClassID === (row.dictProgClassID || null) && !o.isUpdate)
              if (fundSource) {
                empPosFundSourceStore.run('update', {
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    dictFundSourceID: fundSource.dictFundSourceID,
                    dictProgClassID: fundSource.dictProgClassID,
                    mtCount: fundSource.mtCount
                  }
                })
                fundSource.isUpdate = true
              } else {
                empPosFundSourceStore.run('delete', {
                  execParams: {
                    ID: row.ID
                  }
                })
              }
            })
            employeeNumber.dictFundSources.forEach(row => {
              if (!row.isUpdate) {
                empPosFundSourceStore.run('insert', {
                  execParams: {
                    ID: empPosFundSourceStore.generateID(),
                    employeeNumberID: employeeNumber.ID,
                    employeePositionID: newEmployePosition.ID,
                    dictFundSourceID: row.dictFundSourceID,
                    dictProgClassID: row.dictProgClassID,
                    mtCount: row.mtCount
                  }
                })
              }
            })
          } else {
            newEmployePosition.employeeNumberID = employeeNumber.ID
            newEmployePosition.ID = employeePositionStore.generateID()
            employeePositionStore.run('insert', {
              execParams: newEmployePosition
            })
            employeeNumber.dictFundSources.forEach(row => {
              if (!row.isUpdate) {
                empPosFundSourceStore.run('insert', {
                  execParams: {
                    ID: empPosFundSourceStore.generateID(),
                    employeeNumberID: employeeNumber.ID,
                    employeePositionID: newEmployePosition.ID,
                    dictFundSourceID: row.dictFundSourceID,
                    dictProgClassID: row.dictProgClassID,
                    mtCount: row.mtCount
                  }
                })
              }
            })
          }
        }
        recalcEmployeeNumbers.push(employeeNumber.ID)
      }
    })
    execParams.changedValues = JSON.stringify(changedValues)
    recalcEmployeeNumbers.forEach(employeeNumberID => {
      accrualService.setRecalculatePeriod({
        orgID: document.orgID,
        employeeNumberID: employeeNumberID,
        periodCalcID: currentPeriod.ID,
        dateFrom: workPlace.dateFrom,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Проведено тарифікацію')} ${document.description}`
      })
    })
    addCalcQueue(document.orgID, [workPlace.employeeNumberID], execParams.ID, dateFrom)
  }
  updateDocument(ctx)
}

me.doCancelPosting = function (ctx) {
  const workPlace = UB.Repository('trf_workPlace').attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'documentID.type', 'changedValues',
    'documentID.orgID', 'documentID.description']).selectById(ctx.mParams.execParams.ID)
  if (workPlace && workPlace.employeeNumberID && workPlace.dateFrom && workPlace['documentID.type'] === 'FACT') {
    const currentPeriod = periodService.getCurrentPeriod(workPlace['documentID.orgID'])
    const recalcEmployeeNumbers = [workPlace.employeeNumberID]
    const workPlaceStore = UB.DataStore('trf_workPlace')
    const employeePositionStore = UB.DataStore('hr_employeePosition')
    const employeeNumberStore = UB.DataStore('hr_employeeNumber')
    const changedValues = workPlace.changedValues ? JSON.parse(workPlace.changedValues) : null
    workPlace.dateFrom = dateService.shiftDate(workPlace.dateFrom)
    if (changedValues && changedValues.workPlace) {
      changedValues.workPlace.forEach(row => {
        if (UB.Repository('trf_workPlace').attrs(['ID']).selectById(row.ID)) {
          workPlaceStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              dateTo: dateService.shiftDate(row.dateTo)
            }
          })
        }
      })
    } else {
      const priorWorkPlace = UB.Repository('trf_workPlace')
        .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo'])
        .where('employeeNumberID', '=', workPlace.employeeNumberID)
        .where('state', '=', 'POSTED')
        .where('documentID.type', '=', 'FACT')
        .where('dateTo', '=', dateService.addDays(workPlace.dateFrom, -1))
        .where('ID', '<>', ctx.mParams.execParams.ID)
        .selectSingle()
      if (priorWorkPlace) {
        if (UB.Repository('trf_workPlace').attrs(['ID']).selectById(priorWorkPlace.ID)) {
          workPlaceStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: priorWorkPlace.ID,
              dateTo: dateService.shiftDate(workPlace.dateTo)
            }
          })
        }
      }
    }
    const employeePositions = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID', 'orderID', 'isActive', 'employeeNumberID', 'employeeNumberID.orderID', 'employeeNumberID.empWorkPlace'])
      .where('orderID', '=', workPlace.ID)
      .orderBy('dateFrom')
      .selectAsObject()
    employeePositions.forEach(row => {
      employeePositionStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
      if (row['employeeNumberID.orderID'] === workPlace.ID && row['employeeNumberID.empWorkPlace'] === '5') {
        if (UB.Repository('hr_accrual').attrs(['ID']).where('employeeNumberID', '=', row.employeeNumberID).where('periodCalcID.isClosed', '=', 1).limit(1).selectSingle() ||
          UB.Repository('hr_accrual').attrs(['ID']).where('employeeNumberID', '=', row.employeeNumberID).where('payElID.methodID.methodGroupID.groupType', '=', 'FORPAY').limit(1).selectSingle() ||
          UB.Repository('hr_orderRegistryDt').attrs(['orderRegistryID']).where('employeeNumberID', '=', row.employeeNumberID).where('orderRegistryID.mi_deleteDate', '>=', '#maxdate').limit(1).selectSingle() ||
          UB.Repository('hr_payRollDt').attrs(['payRollID']).where('employeeNumberID', '=', row.employeeNumberID).where('reason', '=', '0').where('payRollID.mi_deleteDate', '>=', '#maxdate').limit(1).selectSingle()
        ) {
          if (!recalcEmployeeNumbers.find(o => o === row.employeeNumberID)) {
            recalcEmployeeNumbers.push(row.employeeNumberID)
          }
        } else {
          if (UB.Repository('hr_employeeNumber').attrs(['ID']).where('ID', '=', row.employeeNumberID).limit(1).selectSingle()) {
            employeeNumberStore.run('delete', {
              isOrderOperation: true,
              execParams: {
                ID: row.employeeNumberID
              }
            })
          }
        }
      } else {
        if (!recalcEmployeeNumbers.find(o => o === row.employeeNumberID)) {
          recalcEmployeeNumbers.push(row.employeeNumberID)
        }
      }
    })
    if (changedValues && changedValues.updateEmployeePositions) {
      changedValues.updateEmployeePositions.forEach(row => {
        if (UB.Repository('hr_employeePosition').attrs(['ID']).misc({ __skipRls: true }).selectById(row.ID)) {
          if (row.employeeNumberID && !recalcEmployeeNumbers.find(o => o === row.employeeNumberID)) {
            recalcEmployeeNumbers.push(row.employeeNumberID)
          }
          if (row.dateFrom) {
            row.dateFrom = dateService.shiftDate(row.dateFrom)
          }
          if (row.dateTo) {
            row.dateTo = dateService.shiftDate(row.dateTo)
          }
          delete row.employeeNumberID
          employeePositionStore.run('update', {
            __skipOptimisticLock: true,
            __skipRls: true,
            execParams: row
          })
        }
      })
    }
    recalcEmployeeNumbers.forEach(employeeNumberID => {
      accrualService.setRecalculatePeriod({
        orgID: workPlace['documentID.orgID'],
        employeeNumberID: employeeNumberID,
        periodCalcID: currentPeriod.ID,
        dateFrom: workPlace.dateFrom,
        entityName: __entityName,
        initiatorID: ctx.mParams.execParams.ID,
        description: `${UB.i18n('Відміна проведення тарифікації')} ${workPlace['documentID.description']}`
      })
    })
    addCalcQueue(workPlace['documentID.orgID'], [workPlace.employeeNumberID], workPlace.ID, dateService.shiftDate(workPlace.dateFrom))
  }
  updateDocument(ctx)
}

function updateDocument (ctx) {
  const previewData = ctx.previousValues || {}
  const documentID = ctx.mParams.execParams.documentID || previewData.documentID
  const workPlaces = getAllWorkPlaces(documentID)
  const posteds = workPlaces.filter(i => i.state === 'POSTED')
  if (!posteds.length) {
    updateTrfDocument({ ID: documentID, docState: 'PROJECT' })
  } else if (workPlaces.length === posteds.length) {
    updateTrfDocument({ ID: documentID, docState: 'POSTED' })
  } else {
    updateTrfDocument({ ID: documentID, docState: 'PARTIALLY' })
  }
}

function updateTrfDocument (p) {
  const SQL = `
    update trf_document
    set docState = :docState:
    where ID = :ID:`
  const store = UB.DataStore('trf_document')
  store.execSQL(SQL, p)
}

function getAllWorkPlaces (ID) {
  const data = UB.Repository('trf_workPlace')
    .attrs(['ID', 'state'])
    .where('documentID', '=', ID)
    .selectAsObject()
  return data
}

function addCalcQueue (orgID, employeeNumbers, initiatorID, dateFrom) {
  if (employeeNumbers.length) {
    employeeNumbers.forEach(employeeNumberID => {
      accrualService.setRecalculatePeriod({
        orgID,
        employeeNumberID,
        dateFrom,
        entityName: __entityName,
        initiatorID,
        description: `${UB.i18n('Робочі місця тарифікації')} ${dateService.formatDate(dateService.shiftDate(dateFrom))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumbers,
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
}

me.setWorkPlaces = function (ctx) {
  const workPlaceStore = UB.DataStore('trf_workPlace')
  const positionStore = UB.DataStore('trf_position')
  const accrualStore = UB.DataStore('trf_accrual')
  const params = ctx.mParams
  const dateFrom = params.addEmployee.dateFrom ? dateService.shiftDate(params.addEmployee.dateFrom) : dateService.firstDayOfYear(new Date())
  const dateTo = params.addEmployee.dateTo ? dateService.shiftDate(params.addEmployee.dateTo) : dateService.lastDayOfYear(new Date())
  const orderNumber = params.addEmployee.orderNumber
  const orderDate = params.addEmployee.orderDate ? dateService.shiftDate(params.addEmployee.orderDate) : null
  const cont = {}
  params.addEmployee.Numbers.forEach(employeeNumberID => {
    const workPlace = Object.assign(tarifficationService.getWorkPlace(params.addEmployee.docType, employeeNumberID, dateFrom) || {}, {
      ID: workPlaceStore.generateID(),
      documentID: params.addEmployee.docID,
      employeeNumberID,
      dateFrom,
      dateTo,
      orderNumber,
      orderDate,
      type: params.addEmployee.docType
    })
    const positions = tarifficationService.getPositions(params.addEmployee.orgID, workPlace)
    tarifficationService.calcPositions({ cont, orgID: params.addEmployee.orgID, workPlace, positions })
    delete workPlace.type
    workPlace.state = 'PROJECT'
    workPlaceStore.run('insert', {
      skipOldCode: true,
      execParams: workPlace
    })
    positions.forEach(position => {
      position.ID = positionStore.generateID()
      position.workPlaceID = workPlace.ID
      const accrual = position.accrual
      delete position.accrual
      delete position.internalId
      delete position['workScheduleID.daysWork']
      delete position['workNormID.weekHours']
      positionStore.run('insert', {
        skipOldCode: true,
        execParams: position
      })
      accrual.forEach(accr => {
        delete accr.internalId
        accr.positionID = position.ID
        accrualStore.run('insert', {
          skipOldCode: true,
          execParams: accr
        })
      })
    })
  })
}

me.calcPositions = function (ctx) {
  const params = JSON.parse(ctx.mParams.params)
  const cont = {}
  const workPlace = params.workPlace
  workPlace.dateFrom = dateService.shiftDate(workPlace.dateFrom)
  workPlace.dateTo = dateService.shiftDate(workPlace.dateTo)
  const positions = params.position ? params.position : tarifficationService.getPositions(params.orgID, workPlace, params.params)
  tarifficationService.calcPositions({ cont, orgID: params.orgID, workPlace, positions, params: params.params })
  ctx.mParams.workPlace = JSON.stringify(workPlace)
  ctx.mParams.position = JSON.stringify(positions)
}

me.calcEmployeeExperience = function (ctx) {
  const params = JSON.parse(ctx.mParams.params)
  params.onDate = dateService.shiftDate(params.onDate)
  const employeeExperience = tarifficationService.calcEmployeeExperience(params)
  ctx.mParams.employeeExperience = JSON.stringify(employeeExperience)
}

me.getDictAccrualDt = function (ctx) {
  const params = JSON.parse(ctx.mParams.params)
  const dictAccrualDt = tarifficationService.getDictAccrualDt(params)
  ctx.mParams.dictAccrualDt = JSON.stringify(dictAccrualDt)
}

function findPostedWorkPlace (ctx) {
  const workPlace = UB.Repository('trf_workPlace').attrs(['ID', 'employeeNumberID', 'dateFrom', 'documentID.type']).selectById(ctx.mParams.execParams.ID)
  if (workPlace && workPlace.employeeNumberID && workPlace.dateFrom) {
    const dateFrom = dateService.shiftDate(workPlace.dateFrom)
    return UB.Repository('trf_workPlace')
      .attrs(['ID', 'documentID.docNumber', 'documentID.dateFrom', 'documentID.name', 'employeeNumberID.description'])
      .where('employeeNumberID', '=', workPlace.employeeNumberID)
      .where('state', '=', 'POSTED')
      .whereIf(workPlace['documentID.type'], 'documentID.type', '=', workPlace['documentID.type'])
      .where('dateFrom', '=', dateFrom)
      .where('ID', '<>', ctx.mParams.execParams.ID)
      .selectSingle({
        'documentID.docNumber': 'docNumber',
        'documentID.dateFrom': 'dateFrom',
        'documentID.name': 'name',
        'employeeNumberID.description': 'description'
      })
  }
  return null
}

me.calcWorkPlaces = function (ctx) {
  const workPlaceStore = UB.DataStore('trf_workPlace')
  const positionStore = UB.DataStore('trf_position')
  const accrualStore = UB.DataStore('trf_accrual')
  const params = ctx.mParams
  const cont = {}
  const workPlaces = JSON.parse(params.IDs)
  workPlaces.forEach(wp => {
    const workPlace = UB.Repository('trf_workPlace')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dictPositionID', 'documentID.type', 'documentID.orgID'])
      .selectById(wp.ID)
    const positions = UB.Repository('trf_position')
      .attrs(['ID', 'accrualSum', 'rate', 'workPlaceID',
        'dictPositionID', 'dictSubjectID', 'dictQualificationID',
        'dictEducationRankID', 'dictRankID', 'dictTarifCoeffID',
        // 'workScheduleID',
        'workNormID',
        'dictEducationLevelID', 'dictFundSourceID', 'dictProgClassID'])
      .where('workPlaceID', '=', wp.ID)
      .selectAsObject()

    const originWorkPlace = Object.assign({}, workPlace)
    const originPositions = positions.map(a => { return Object.assign({}, a) })

    if (positions.length) {
      positions.forEach(position => {
        const accrual = UB.Repository('trf_accrual')
          .attrs(['positionID', 'payElID', 'dictPupilID', 'baseSum',
            'hours', 'accrualSum', 'rate', 'flagsFix', 'experienceYears', 'experienceMonths',
            'accrualRate'])
          .where('positionID', '=', position.ID)
          .selectAsObject()
        position.accrual = accrual

        const originPosition = originPositions.find(o => o.ID === position.ID)
        originPosition.accrual = accrual.map(a => { return Object.assign({}, a) })
      })
    }

    tarifficationService.calcPositions({ cont, orgID: workPlace['documentID.orgID'], workPlace, positions })

    const isDifferent = workPlace.positionID !== originWorkPlace.positionID ||
      positions.length !== originPositions.length ||
      positions.reduce((a, v, index) => {
        return a ||
          v.ID !== originPositions[index].ID ||
          v.posIndex !== originPositions[index].posIndex ||
          v.accrualSum !== originPositions[index].accrualSum ||
          v.dictPositionID !== originPositions[index].dictPositionID ||
          v.dictSubjectID !== originPositions[index].dictSubjectID ||
          v.dictQualificationID !== originPositions[index].dictQualificationID ||
          v.dictEducationRankID !== originPositions[index].dictEducationRankID ||
          v.dictEducationLevelID !== originPositions[index].dictEducationLevelID ||
          v.dictTarifCoeffID !== originPositions[index].dictTarifCoeffID ||
          v.dictRankID !== originPositions[index].dictRankID ||
          v.dictFundSourceID !== originPositions[index].dictFundSourceID ||
          v.dictProgClassID !== originPositions[index].dictProgClassID ||
          v.workNormID !== originPositions[index].workNormID ||
          v.dictPartID !== originPositions[index].dictPartID ||
          v.accrualSum !== originPositions[index].accrualSum ||
          v.rate !== originPositions[index].rate ||
          v.accrual.length !== originPositions[index].accrual.length ||
          v.accrual.reduce((b, c, i) => {
            const originAccrual = originPositions[index].accrual[i]
            return b ||
              c.ID !== originAccrual.ID ||
              c.payElID !== originAccrual.payElID ||
              c.baseSum !== originAccrual.baseSum ||
              c.rate !== originAccrual.rate ||
              c.accrualRate !== originAccrual.accrualRate ||
              c.accrualSum !== originAccrual.accrualSum
          }, false)
      }, false)

    if (isDifferent) {
      const { ID, employeeNumberID, dateFrom, dictPositionID } = workPlace
      workPlaceStore.run('update', {
        __skipOptimisticLock: true,
        execParams: { ID, employeeNumberID, dateFrom, dictPositionID }
      })
      originPositions.forEach(position => {
        const { ID } = position
        positionStore.run('delete', { execParams: { ID } })
      })
      positions.forEach(position => {
        position.workPlaceID = workPlace.ID
        const accrual = position.accrual
        delete position.accrual
        delete position.internalId
        delete position['workNormID.weekHours']
        position.ID = positionStore.generateID()
        positionStore.run('insert', {
          skipOldCode: true,
          execParams: position
        })
        accrual.forEach(accr => {
          accr.positionID = position.ID
          accr.ID = accrualStore.generateID()
          delete accr.internalId
          accrualStore.run('insert', {
            skipOldCode: true,
            execParams: accr
          })
        })
      })
    }
  })
}

function checkDicPupilID (workPlaceID) {
  const dictPositionIDs = UB.Repository('trf_accrual')
    .attrs(['positionID.dictPositionID'])
    .where('positionID.workPlaceID', '=', workPlaceID)
    .where('payElID.methodID.code', 'in', ['146', '148'])
    .where('dictPupilID', 'isNull')
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({ 'positionID.dictPositionID': 'dictPositionID' })
    .map(o => o.dictPositionID)
    .filter((value, index, self) => { return self.indexOf(value) === index })
  if (dictPositionIDs.length) {
    return !UB.Repository('trf_dictPositionProps')
      .attrs(['ID'])
      .where('dictPositionID', 'in', dictPositionIDs)
      .where('pupil', '=', '1')
      .selectSingle()
  }
  return true
}

function checkDictSubjectID (workPlaceID) {
  const dictPositionIDs = UB.Repository('trf_position')
    .attrs(['dictPositionID'])
    .where('workPlaceID', '=', workPlaceID)
    .where('dictSubjectID', 'isNull')
    .selectAsObject()
    .map(o => o.dictPositionID)
    .filter((value, index, self) => { return self.indexOf(value) === index })
  if (dictPositionIDs.length) {
    return !UB.Repository('trf_dictPositionProps')
      .attrs(['ID'])
      .where('dictPositionID', 'in', dictPositionIDs)
      .where('subject', '=', '1')
      .limit(1)
      .selectSingle()
  }
  return true
}

function checkDictFundSourceID (workPlaceID) {
  return !UB.Repository('trf_position')
    .attrs(['ID'])
    .where('workPlaceID', '=', workPlaceID)
    .where('dictFundSourceID', 'isNull')
    .limit(1)
    .selectSingle()
}

function checkProgClassID (workPlaceID) {
  return !UB.Repository('trf_position')
    .attrs(['ID'])
    .where('workPlaceID', '=', workPlaceID)
    .where('dictProgClassID', 'isNull')
    .limit(1)
    .selectSingle()
}
