const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const periodService = require('../HR/modules/periodService')
const timeSheetService = require('../TIM/modules/timeSheetService')
const entityService = require('../HR/modules/entityService')
const accrualService = require('../HR/modules/accrualService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const employeeService = require('../HR/modules/employeeService')
const nameCaseService = require('../HR/modules/nameCaseService')
const _ = require('lodash')

me.on('update:before', ctx => beforeUpdate(ctx, 'update'))
me.on('insert:before', ctx => beforeUpdate(ctx, 'insert'))
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:after', afterDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('getOrderSignerInfo')
me.entity.addMethod('getOrderSignerList')
me.entity.addMethod('getStaffTableSignerList')
me.entity.addMethod('restoreTemporaryPositions')
me.entity.addMethod('shiftIncorrectDates')
me.entity.addMethod('updateFactPosition')
me.entity.addMethod('selectForK1')
me.entity.addMethod('createOrderMove')

me.entity.addMethod('canDelete')
me.entity.addMethod('canEditDateTo')
me.entity.addMethod('canEditPos')
me.entity.addMethod('canEditOrders')

me.canDelete = () => {} // метод для перевірки прав на ручне видалення
me.canEditDateTo = () => {} // метод для перевірки прав на редагування дати закінчення
me.canEditPos = () => {} // метод для перевірки прав на редагування Призначення
me.canEditOrders = () => {} // метод для перевірки прав на редагування наказів

me.details = [
  {
    detailName: 'positionFundSourceDt',
    entityName: 'hr_empPosFundSource',
    docIDName: 'employeePositionID',
    fieldList: orderService.setFieldListAttribute([
      'employeeNumberID', 'dictFundSourceID.description', 'dictProjectID.description', 'dictProgClassID.description', 'mtCount', 'dictFundSourceID.mi_deleteUser'
    ], ['lineNum'])
  }
]

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

me.getOrderSignerInfo = ctx => {
  const empOrderType = ctx.mParams.empOrderType || 'EMPORDER'
  const organizationID = ctx.mParams.organizationID
  const onDate = dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate()
  const onDateSql = dateService.formatDate(onDate, 'YYYY-MM-DD')
  const positionID = ctx.mParams.positionID
  let isGetSecondSigner = ctx.mParams.isGetSecondSigner
  ctx.mParams.result = {
    positionID: null,
    employeePositionID: null
  }
  let respPosition
  switch (empOrderType) {
    case 'EMPORDER':
      respPosition = isGetSecondSigner ? ('signer4EmpOrderSecond' || -1) : ('signer4EmpOrder' || -1)
      break
    case 'ORGSTRUCTURE':
      respPosition = isGetSecondSigner ? ('signer4OrgstructSecond' || -1) : ('signer4Orgstruct' || -1)
      break
    case 'STAFFLIST':
      respPosition = isGetSecondSigner ? ('signer4StafflistSecond' || -1) : ('signer4Stafflist' || -1)
      break
    case 'VACATIONAPSCHED':
      respPosition = 'signer4VacSchedule' || -1
      break
  }
  const orgRespPosition = UB.Repository('hr_orgRespPosition')
    .attrs('positionID', 'positionID.name', 'mi_createDate')
    .where(`coalesce(dateFrom, '2000-01-01') <= '${onDateSql}'`, 'custom')
    .where(`coalesce(dateTo, '9999-12-31') >= '${onDateSql}'`, 'custom')
    .where('organizationID', '=', organizationID)
    .where('respPosition', '=', respPosition)
    .orderBy('mi_createDate', 'desc')
    .selectAsObject()
  if (orgRespPosition.length === 0) {
    return
  }
  const empPos = UB.Repository('hr_employeePosition')
    .attrs('ID', 'workPlace', 'positionID', 'positionID.name')
    .where('positionID', 'in', orgRespPosition.map(item => item.positionID))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .orderBy('mi_createDate', 'desc')
    .selectAsObject()
  if (empPos.length) {
    empPos.map(el => {
      el.mi_createDate = orgRespPosition.find(o => o.positionID === el.positionID).mi_createDate
      return el
    })
    empPos.sort((a, b) => b.mi_createDate > a.mi_createDate)
    ctx.mParams.result.positionID = positionID || empPos[0].positionID
    let posPred = !positionID ? '' : ` OR 
    (
    hep.positionID = :positionID: AND 
    NOT EXISTS (
        SELECT elta.employeeNumberID from hr_empLongTermAbsc elta
          WHERE elta.employeeNumberID = hep.employeeNumberID
          AND :onDate: between coalesce(elta.dateFrom, '2000-01-01') and coalesce(elta.dateTo, '9999-12-31')       
        )
    )
`
    let sql = `select hep.ID "ID", hep.description, hep.positionID "positionID", hep.employeeID "employeeID", hep.employeeNumberID "employeeNumberID" 
    from hr_employeePosition hep
    where (hep.employeeNumberID in (
            SELECT ep.employeeNumberID FROM hr_dictTempExecution dte  
              INNER JOIN hr_employeePosition ep ON ep.ID=dte.employeePositionID                 
              WHERE dte.positionTempID = :positionID:  and dte.mi_deleteDate >= '9999-12-31'                 
              and :onDate: between coalesce(dte.dateFrom, '2000-01-01') and coalesce(dte.dateTo, '9999-12-31')             
            UNION ALL
            SELECT  act.employeeNumberID
            FROM hr_empOrderActingDet act  
              INNER JOIN hr_empOrderDet det ON det.ID=act.paraID  
              INNER JOIN hr_empOrder o ON o.ID=act.orderID  
              LEFT JOIN hr_position pos ON pos.ID=det.positionID  
              WHERE (o.orderState='POSTED' OR o.orderState='PROCESSED') AND act.mi_deleteDate>='9999-12-31' 
                AND pos.mi_data_id=:positionID:                 
                AND :onDate: between coalesce(act.dateFrom, '2000-01-01') and coalesce(act.dateTo, '9999-12-31')                 
    )${posPred})
    and  :onDate: between hep.dateFrom and hep.dateTo
    and  hep.mi_deleteDate >= '9999-12-31'`
    const store = UB.DataStore(__entityName)
    store.runSQL(sql, {
      positionID: positionID || empPos[0].positionID,
      onDate: onDate
    })
    const data = store.getAsJsObject()
    if (data.length === 1) {
      ctx.mParams.result.employeePositionID = data[0].ID
    } else {
      ctx.mParams.result.employeePositionID = positionID ? null : empPos[0].ID
    }
  } else {
    ctx.mParams.result.positionID = positionID || orgRespPosition[0].positionID
  }
}

me.getOrderSignerList = ctx => {
  const empOrderType = ctx.mParams.empOrderType || 'EMPORDER'
  const organizationID = ctx.mParams.organizationID
  const onDate = dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate()
  const sqlDialect = entityBaseService.getSQLDialect()
  let isGetSecondSigner = ctx.mParams.isGetSecondSigner
  ctx.mParams.result = {}
  let respPosition
  switch (empOrderType) {
    case 'EMPORDER':
      respPosition = isGetSecondSigner ? ('signer4EmpOrderSecond' || -1) : ('signer4EmpOrder' || -1)
      break
    case 'ORGSTRUCTURE':
      respPosition = isGetSecondSigner ? ('signer4OrgstructSecond' || -1) : ('signer4Orgstruct' || -1)
      break
    case 'STAFFLIST':
      respPosition = isGetSecondSigner ? ('signer4StafflistSecond' || -1) : ('signer4Stafflist' || -1)
      break
    case 'VACATIONAPSCHED':
      respPosition = 'signer4VacSchedule' || -1
      break
  }
  let sql = `SELECT ${sqlDialect.dialect === 'MSSQL2012' ? 'TOP 30' : ''} 
    A01.ID
   ,A01.mi_data_id
   ,A01.description
   ,A01.state
   ,A01.mi_modifyDate
  FROM hr_position A01
  WHERE A01.state = 'ACTIVE'
  AND A01.mi_dateFrom <= :onDate:
  AND A01.mi_dateTo >=  :onDate:
  AND ( :onDate: BETWEEN A01.mi_dateFrom AND A01.mi_dateTo)
  AND A01.mi_deleteDate >= '9999-12-31'
  AND ((EXISTS (SELECT
      1
    FROM hr_orgRespPosition A02
    WHERE A02.positionID = A01.mi_data_id
    AND A02.mi_deleteDate =  '9999-12-31'
    AND A02.dateFrom <=  :onDate:
    AND A02.dateTo >=  :onDate:
    AND A02.organizationID = :orgID:
    AND A02.respPosition = :respPosition:)
  ))
  ORDER BY A01.mi_createDate DESC
  ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'LIMIT 30'}`
  const store = UB.DataStore(__entityName)
  store.runSQL(sql, {
    orgID: organizationID,
    onDate: onDate,
    respPosition: respPosition,
    empOrderType: empOrderType
  })
  ctx.mParams.result.respPositionIDList = store.getAsJsObject().map(o => o.mi_data_id)
  let posPred = !ctx.mParams.positionID ? '' : ` OR 
    (
    hep.positionID = :positionID: AND 
    NOT EXISTS (
        SELECT elta.employeeNumberID from hr_empLongTermAbsc elta
          WHERE elta.employeeNumberID = hep.employeeNumberID
          AND :onDate: between coalesce(elta.dateFrom, '2000-01-01') and coalesce(elta.dateTo, '9999-12-31') 
        )
    )
`
  sql = `select hep.ID "ID"
    from hr_employeePosition hep
    where (hep.employeeNumberID in (
            SELECT ep.employeeNumberID FROM hr_dictTempExecution dte  
              INNER JOIN hr_employeePosition ep ON ep.ID=dte.employeePositionID                 
              WHERE dte.positionTempID = :positionID:  and dte.mi_deleteDate >= '9999-12-31'                 
              and :onDate: between coalesce(dte.dateFrom, '2000-01-01') and coalesce(dte.dateTo, '9999-12-31')             
            UNION ALL
            SELECT  act.employeeNumberID
            FROM hr_empOrderActingDet act  
              INNER JOIN hr_empOrderDet det ON det.ID=act.paraID  
              INNER JOIN hr_empOrder o ON o.ID=act.orderID  
              LEFT JOIN hr_position pos ON pos.ID=det.positionID  
              WHERE (o.orderState='POSTED' OR o.orderState='PROCESSED') AND act.mi_deleteDate>='9999-12-31' 
                AND pos.mi_data_id = :positionID:              
                AND :onDate: between coalesce(act.dateFrom, '2000-01-01') and coalesce(act.dateTo, '9999-12-31')                 
    )${posPred})
    and  :onDate: between hep.dateFrom and hep.dateTo
    and  hep.mi_deleteDate >= '9999-12-31'`
  store.runSQL(sql, {
    positionID: ctx.mParams.positionID,
    onDate: onDate
  })
  ctx.mParams.result.respEmployeePositionIDList = store.getAsJsObject().map(o => o.ID)
}

me.getStaffTableSignerList = ctx => {
  const organizationID = ctx.mParams.organizationID
  const onDate = dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate()
  ctx.mParams.result = {}
  ctx.mParams.result.signer1 = getPositonForStaffTable({
    organizationID,
    onDate,
    respPosition: 'signer4Stafflist'
  })
  ctx.mParams.result.signer2 = getPositonForStaffTable({
    organizationID,
    onDate,
    respPosition: 'signer4StafflistSecond'
  })
  ctx.mParams.result.signer3 = getPositonForStaffTable({
    organizationID,
    onDate,
    respPosition: 'approver4Stafflist'
  })
  ctx.mParams.result.signer4 = getPositonForStaffTable({
    organizationID,
    onDate,
    respPosition: 'approver4StafflistSecond'
  })
  ctx.mParams.result.signer5 = getPositonForStaffTable({
    organizationID,
    onDate,
    respPosition: 'approverOfStaffList'
  })
}

function getPositonForStaffTable (params) {
  let result = {
    respPositionID: null,
    respEmployeePositionID: null
  }
  const sqlDialect = entityBaseService.getSQLDialect()
  let sql = `SELECT ${sqlDialect.dialect === 'MSSQL2012' ? 'TOP 30' : ''} 
    A01.ID
   ,A01.mi_data_id
   ,A01.description
   ,A01.state
   ,A01.mi_modifyDate
  FROM hr_position A01
  join hr_orgRespPosition orp on orp.positionID = A01.mi_data_id and
    orp.positionID = A01.mi_data_id
    AND orp.mi_deleteDate =  '9999-12-31'
    AND orp.dateFrom <=  :onDate:
    AND orp.dateTo >=  :onDate:
    AND orp.organizationID = :orgID:
    AND orp.respPosition = :respPosition:
  WHERE A01.state = 'ACTIVE'
  AND A01.mi_dateFrom <= :onDate:
  AND A01.mi_dateTo >=  :onDate:
  AND ( :onDate: BETWEEN A01.mi_dateFrom AND A01.mi_dateTo)
  AND A01.mi_deleteDate >= '9999-12-31'
  ORDER BY orp.mi_createDate DESC
  ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'LIMIT 30'}`
  const store = UB.DataStore(__entityName)
  store.runSQL(sql, {
    orgID: params.organizationID,
    onDate: params.onDate,
    respPosition: params.respPosition
  })
  let select = store.getAsJsObject().map(o => o.mi_data_id)
  result.respPositionID = select.length ? select[0] : null
  if (result.respPositionID) {
    let posPred = ` OR 
    (
    hep.positionID = :respPositionID: AND 
    NOT EXISTS (
        SELECT elta.employeeNumberID from hr_empLongTermAbsc elta
          WHERE elta.employeeNumberID = hep.employeeNumberID
          AND :onDate: between coalesce(elta.dateFrom, '2000-01-01') and coalesce(elta.dateTo, '9999-12-31') 
        )
    )
`
    sql = `select hep.ID "ID"
    from hr_employeePosition hep
    where (hep.employeeNumberID in (
            SELECT ep.employeeNumberID FROM hr_dictTempExecution dte  
              INNER JOIN hr_employeePosition ep ON ep.ID=dte.employeePositionID                 
              WHERE dte.positionTempID = :respPositionID:  
              and dte.mi_deleteDate >= '9999-12-31'                 
              and :onDate: between coalesce(dte.dateFrom, '2000-01-01') 
              and coalesce(dte.dateTo, '9999-12-31')             
            UNION ALL
            SELECT  act.employeeNumberID
            FROM hr_empOrderActingDet act  
              INNER JOIN hr_empOrderDet det ON det.ID=act.paraID  
              INNER JOIN hr_empOrder o ON o.ID=act.orderID  
              LEFT JOIN hr_position pos ON pos.ID=det.positionID  
              WHERE (o.orderState='POSTED' OR o.orderState='PROCESSED') 
              AND act.mi_deleteDate>='9999-12-31' 
                AND pos.mi_data_id = :respPositionID: 
                AND :onDate: between coalesce(act.dateFrom, '2000-01-01') 
                and coalesce(act.dateTo, '9999-12-31')                 
    )${posPred})
    and  :onDate: between hep.dateFrom and hep.dateTo
    and  hep.mi_deleteDate >= '9999-12-31'`
    store.runSQL(sql, {
      respPositionID: result.respPositionID,
      onDate: params.onDate
    })
    select = store.getAsJsObject().map(o => o.ID)
    result.respEmployeePositionID = select.length === 1 ? select[0] : null
  }
  return result
}

me.rls = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.ID) {
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    whereList.isActive = {
      expression: '[isActive]',
      condition: 'equal',
      value: 1
    }
  }
}

me.rlsR = (ctx) => {
  const mParams = ctx.mParams
  if (!mParams.ID || !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    if (!mParams.ID) {
      whereList.isActive = {
        expression: '[isActive]',
        condition: 'equal',
        value: 1
      }
    }
    if (!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
      whereList.limitedAccess = {
        expression: '[employeeNumberID.limitedAccess]',
        condition: 'equal',
        value: 0
      }
      if (!mParams.ID) {
        whereList.isActive = {
          expression: '[isActive]',
          condition: 'equal',
          value: 1
        }
      }
    }
  }
} // метод для перевірки обмеженого доступу

function afterInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams

  if (mParams.details) {
    orderService.saveDetails(ctx, me.details, { docID: ctx.mParams.execParams.ID })
  }

  if (execParams.employeeNumberID && !ctx.mParams.isImport) {
    accrualService.setRecalculatePeriod({
      orgID: execParams.organizationID,
      employeeNumberID: execParams.employeeNumberID,
      dateFrom: execParams.dateFrom,
      entityName: __entityName,
      initiatorID: execParams.ID,
      description: `${UB.i18n('Призначення на посаду')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
    })
    calcService.addCalcTimeSheetQueue({ employeeNumberID: execParams.employeeNumberID, entityName: 'hr_employeePosition' })
    employeeService.updateEmployeeAddPersonDescription(execParams.employeeNumberID)
  }
  if (ctx.mParams.skipBefore) {
    return
  }
  if (!execParams.changeOrderID && !mParams.isImport) {
    setTimeSheet(execParams.employeeNumberID, execParams.organizationID, execParams.dateFrom, execParams.dateTo)
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  orderService.updateEmployeeOnStaff(execParams.ID, execParams.organizationID)
}

function afterUpdate (ctx) {
  const previousValues = ctx.previousValues || {}
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!mParams.isImport) {
    let calcDate = (execParams.dateFrom || previousValues.dateFrom)
    if (execParams.dateToEmpty || execParams.dateTo) {
      if (!Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'dateToEmpty', 'dateTo',
        'description', 'factPosName', 'factPosition', 'changeOrderID', 'separationID', 'isActive'].includes(o))) {
        calcDate = dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo) < dateService.maxDate()
          ? dateService.addDays(dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo), 1) : execParams.dateToEmpty || execParams.dateTo
      }
    }
    if (Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'description', 'factPosName',
      'factPosition', 'changeOrderID', 'separationID', 'isActive'].includes(o))) {
      accrualService.setRecalculatePeriod({
        orgID: execParams.organizationID || previousValues.organizationID,
        employeeNumberID: execParams.employeeNumberID || previousValues.employeeNumberID,
        dateFrom: calcDate,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Призначення на посаду')} ${dateService.formatDate(dateService.shiftDate(calcDate))}`
      })
    }
    if (Object.keys(execParams).find(o => ['mtCount', 'workScheduleID'].includes(o))) {
      const currentPeriod = periodService.getCurrentPeriod(execParams.organizationID || previousValues.organizationID)
      const periods = periodService.getPeriodsByDate(execParams.organizationID || previousValues.organizationID,
        dateService.shiftDate(execParams.dateFrom || previousValues.dateFrom),
        dateService.shiftDate(Math.min(dateService.shiftDate(execParams.dateFrom || previousValues.dateFrom), dateService.addDays(currentPeriod.dateFrom, -1))))
      periods.forEach(period => {
        try {
          timeSheetService.fillTimeSheet({
            organizationID: execParams.organizationID || previousValues.organizationID,
            periodID: period.ID,
            employeeNumbers: [execParams.employeeNumberID || previousValues.employeeNumberID],
            checkPeriod: false
          })
        } catch (e) {}
      })
    }
    if (Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'description', 'factPosName', 'factPosition', 'changeOrderID'].includes(o))) {
      calcService.addCalcTimeSheetQueue({ employeeNumberID: execParams.employeeNumberID || previousValues.employeeNumberID, entityName: 'hr_employeePosition' })
    }
    if (Object.keys(execParams).find(o => ['dictTarifCoeffID', 'dictStaffCatID'].includes(o))) {
      employeeService.updateEmployeeAddPersonDescription(execParams.employeeNumberID || previousValues.employeeNumberID)
    }
  }
  if (ctx.mParams.skipBefore) {
    return
  }
  if (Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'description', 'factPosName', 'factPosition'].includes(o))) {
    if (!execParams.changeOrderID && !previousValues.changeOrderID && !mParams.isImport) {
      setTimeSheet(execParams.employeeNumberID || previousValues.employeeNumberID, execParams.organizationID || previousValues.organizationID,
        execParams.dateFrom || previousValues.dateFrom, execParams.dateTo || previousValues.dateTo
      )
    }
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
  orderService.updateEmployeeOnStaff(execParams.ID, execParams.organizationID || previousValues.organizationID)
}

function saveComplexAttributes (ctx) {
  const mParams = ctx.mParams
  const complexAttrParams = mParams.complexAttrParams || {}
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const complexAttrs = Object.keys(execParams).filter(param => param.includes('.'))
  const attrs = global[__entityName].entity.attributes
  complexAttrs.forEach(attr => {
    const parts = attr.split('.')
    const selfAttr = attrs[parts[parts.length - 2]]
    const associationAttr = selfAttr.associationAttr || 'ID'
    let associatedID
    if (associationAttr === 'mi_data_id') {
      let associatedRecord = UB.Repository(associationAttr)
        .attrs('ID')
        .where(associationAttr, '=', instanceData[selfAttr.code])
      if (complexAttrParams[attr]) {
        const onDate = complexAttrParams[attr].onDate || new Date()
        associatedRecord = associatedRecord
          .where('mi_dateFrom', '<=', onDate)
          .where('mi_dateTo', '<=', onDate)
          .where('state', '=', complexAttrParams[attr].state || 'ACTIVE')
      }
      associatedID = associatedRecord.selectScalar()
    } else {
      associatedID = instanceData[selfAttr.code]
    }
    const updParams = {
      ID: associatedID
    }
    updParams[parts[parts.length - 1]] = execParams[attr]
    UB.DataStore(selfAttr.associatedEntity).run('update', {
      __skipOptimisticLock: true,
      execParams: updParams
    })
    delete execParams[attr]
  })
}

function beforeDelete (ctx) {
  const mParams = ctx.mParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  if (!mParams.isImport) {
    employeeService.updateEmployeeAddPersonDescription(instanceData.employeeNumberID)
  }
  if (UB.Repository('org_employeeonstaff').attrs(['ID']).selectById(ctx.mParams.execParams.ID)) {
    UB.DataStore('org_employeeonstaff').run('delete', {
      byHR: true,
      execParams: {
        ID: ctx.mParams.execParams.ID
      }
    })
  }
}

function beforeUpdate (ctx, method) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.previousValues = instanceData
  if (mParams.isDirectUpdate) {
    saveComplexAttributes(ctx)
  }

  if (ctx.mParams.skipBefore) {
    return
  }
  entityService.setAttrs(ctx)

  const orgID = execParams.organizationID || instanceData.organizationID
  const onDate = execParams.dateFrom ? dateService.shiftDate(execParams.dateFrom) : dateService.shiftDate(instanceData.dateFrom)

  const employee = UB.Repository('hr_employee')
    .attrs(['ID', 'shortFIO', 'fullFIO', 'sexType'])
    .where('ID', '=', execParams.employeeID || instanceData.employeeID)
    .misc({ __allowSelectSafeDeleted: true })
    .limit(1)
    .selectSingle()
  let position = null
  if (mParams.isHistorical) {
    position = (execParams.positionID || (execParams.positionID !== null && instanceData.positionID))
      ? UB.Repository('hr_position')
        .attrs(['ID', 'fullNameNom', 'fullNameNomF', 'fullName', 'positionType', 'name', 'nameNom', 'nameNomF', 'dictPositionID', 'nameAddition'])
        .where('mi_data_id', '=', execParams.positionID || instanceData.positionID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .limit(1)
        .selectSingle()
      : null
  } else {
    position = (execParams.positionID || (execParams.positionID !== null && instanceData.positionID))
      ? UB.Repository('hr_position')
        .attrs(['ID', 'fullNameNom', 'fullNameNomF', 'fullName', 'positionType', 'name', 'nameNom', 'nameNomF', 'dictPositionID', 'nameAddition'])
        .where('mi_data_id', '=', execParams.positionID || instanceData.positionID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_recordhistory_all: true })
        .orderBy('mi_dateTo', 'desc')
        .limit(1)
        .selectSingle()
      : null
  }
  if (!mParams.isNotCheckPosition && !mParams.isImport && !mParams.isImportOperation && execParams.positionID && !position) {
    throw new UB.UBAbort(`<<<${UB.i18n('На дату {0} не дісна вибрана посада для працівника {1}', dateService.formatDate((execParams.dateFrom || instanceData.dateFrom), 'dd.mm.yyyy'), employee ? employee['fullFIO'] : '')}>>>`)
  }
  const descriptionCheckAttrs = ['description', 'dictPositionID', 'positionID', 'departmentID', 'employeeID',
    'employeeNumberID', 'dictEmpCategoryID', 'dictFundSourceID', 'posNameAddition'
  ]
  if (Object.keys(execParams).find(o => descriptionCheckAttrs.includes(o))) {
    const allowSelectDictPosition = settingsService.getByCode('hrOrderAllowSelectDictPosition', orgID) === true
    const hrUseStaffingTable = settingsService.getByCode('hrUseStaffingTable', orgID) !== false
    if (!allowSelectDictPosition && hrUseStaffingTable && execParams.positionID && position && position.dictPositionID) {
      execParams.dictPositionID = position.dictPositionID
    }
    const dictPosition = (execParams.dictPositionID || (execParams.dictPositionID !== null && instanceData.dictPositionID))
      ? UB.Repository('hr_dictPosition')
        .attrs(['ID', 'name', 'nameNom', 'nameNomF'])
        .selectById(execParams.dictPositionID || instanceData.dictPositionID)
      : null
    let department = null
    if (mParams.isHistorical) {
      department = (execParams.departmentID || instanceData.departmentID)
        ? UB.Repository('hr_department')
          .attrs(['ID', 'name', 'nameGen'])
          .where('mi_data_id', '=', execParams.departmentID || instanceData.departmentID)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: onDate })
          .limit(1)
          .selectSingle() : null
    } else {
      department = (execParams.departmentID || instanceData.departmentID)
        ? UB.Repository('hr_department')
          .attrs(['ID', 'name', 'nameGen'])
          .where('mi_data_id', '=', execParams.departmentID || instanceData.departmentID)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateTo', 'desc')
          .limit(1)
          .selectSingle() : null
    }
    const employeeNumber = UB.Repository('hr_employeeNumberS')
      .attrs(['tabNum'])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(execParams.employeeNumberID || instanceData.employeeNumberID)

    let fundSourceName = ''
    const dictFundSourceID = execParams.dictFundSourceID === undefined ? instanceData.dictFundSourceID : execParams.dictFundSourceID
    if (dictFundSourceID) {
      const fundSource = UB.Repository('ac_fundSource').attrs('name', 'nominalName').where('ID', '=', dictFundSourceID).limit(1).selectSingle()
      if (fundSource) {
        fundSourceName = `(${fundSource['nominalName'] || fundSource['name']}) `
      }
    }
    let empCategoryName = ''
    const dictEmpCategoryID = execParams.dictEmpCategoryID === undefined ? instanceData.dictEmpCategoryID : execParams.dictEmpCategoryID
    if (dictEmpCategoryID) {
      const empCat = UB.Repository('hr_dictEmpCategory').attrs(['genName']).selectById(dictEmpCategoryID)
      if (empCat) {
        empCategoryName = empCat.genName || ''
      }
      if (empCategoryName) {
        empCategoryName = ' ' + empCategoryName
      }
    }
    let posNameAddition = allowSelectDictPosition
      ? (execParams.posNameAddition === undefined ? instanceData.posNameAddition : execParams.posNameAddition) || ''
      : (position ? position['nameAddition'] : '') || ''
    if (posNameAddition) {
      posNameAddition = ' ' + posNameAddition
    }
    employee.sexType = employee.sexType || 'M'
    const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', orgID)
    const isOrderActualPositionName = settingsService.getByCode('hrOrderActualPositionName', orgID)
    let posName
    if (isOrderActualPositionName) {
      posName = isUseSexType
        ? (employee.sexType === 'W'
          ? (dictPosition ? ' ' + (dictPosition.nameNomF || dictPosition.name) : (position ? ' ' + (position.nameNomF || position.name) : ''))
          : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : (position ? ' ' + (position.nameNom || position.name) : '')))
        : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : (position ? ' ' + (position.nameNom || position.name) : ''))
    } else {
      posName = isUseSexType
        ? (employee.sexType === 'W'
          ? (position ? ' ' + (position.nameNomF || position.name) : (dictPosition ? ' ' + (dictPosition.nameNomF || dictPosition.name) : ''))
          : (position ? ' ' + (position.nameNom || position.name) : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : ''))
        )
        : (position ? ' ' + position.name : (dictPosition ? ' ' + dictPosition.name : ''))
    }

    let factPosName = nameCaseService.removeDuplicateWords(`${posName}${posNameAddition}${empCategoryName}`)
    let depName = department ? ' ' + (department.nameGen || department.name) : ''
    if (isUseSexType && !isOrderActualPositionName) {
      depName = ''
    }
    if (isUseSexType && !isOrderActualPositionName && !allowSelectDictPosition) {
      posNameAddition = ''
    }
    let posDepName = nameCaseService.removeDuplicateWords(`${posName}${posNameAddition}${empCategoryName}${depName}`)
    const factPosNameLength = entityService.getFieldSize(ctx.dataStore, 'factPosName') || 500
    const factPositionLength = entityService.getFieldSize(ctx.dataStore, 'factPosition') || 1000

    execParams.factPosName = factPosName ? factPosName.substring(0, factPosNameLength) : null
    execParams.factPosition = posDepName ? posDepName.substring(0, factPositionLength) : null
    if (posDepName) {
      posDepName = ' ' + posDepName
    }
    const descriptionLength = entityService.getFieldSize(ctx.dataStore, 'description') || 1000
    const tmpLen = String(employee.shortFIO).length + String(fundSourceName).length + String(employeeNumber.tabNum).length + 3
    if (descriptionLength < String(posDepName).length + tmpLen) {
      posDepName = posDepName.substring(0, descriptionLength - tmpLen - 3) + '...'
    }
    execParams.description = `${employee.shortFIO}${posDepName} ${fundSourceName}[${employeeNumber.tabNum}]`
  }
  if (/* !mParams.isOrderOperation && */ !mParams.isDirectUpdate && !ctx.mParams.isImport) {
    const mainPosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('organizationID', '=', orgID)
      .where('employeeID', '=', execParams.employeeID || instanceData.employeeID)
      .where('employeeNumberID', '!=', execParams.employeeNumberID || instanceData.employeeNumberID)
      .where('ID', '!=', execParams.ID)
      .where('dateFrom', '<=', execParams.dateTo || instanceData.dateTo)
      .where('dateTo', '>=', execParams.dateFrom || instanceData.dateFrom)
      .where('workPlace', '=', '1')
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .limit(1)
      .selectSingle()
    if (['1', '3'].includes(execParams.workPlace || instanceData.workPlace) && mainPosition) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} вже є призначення з місцем роботи - основне', employee.fullFIO)}>>>`)
    }
    if (['1'].includes(execParams.workPlace || instanceData.workPlace) &&
      UB.Repository('hr_employeePositionS')
        .attrs(['ID'])
        .where('organizationID', '=', orgID)
        .where('employeeID', '=', execParams.employeeID || instanceData.employeeID)
        .where('employeeNumberID', '!=', execParams.employeeNumberID || instanceData.employeeNumberID)
        .where('ID', '!=', execParams.ID)
        .where('dateFrom', '<=', execParams.dateTo || instanceData.dateTo)
        .where('dateTo', '>=', execParams.dateFrom || instanceData.dateFrom)
        .where('workPlace', '=', '3')
        .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
        .limit(1)
        .selectSingle()) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} вже є призначення з місцем роботи - зовнішній сумісник', employee.fullFIO)}>>>`)
    }
    if ((execParams.workPlace || instanceData.workPlace) === '2' && !mainPosition) {
      throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} не має призначення за основним місцем роботи', employee.fullFIO)}>>>`)
    }
  }
  if (mParams.formData) {
    saveFormData(ctx)
  }
  if (mParams.details) {
    ctx.mParams.formData = JSON.stringify({ detail: JSON.parse(mParams.details) })
    if (method === 'update') {
      orderService.saveDetails(ctx, me.details, { docID: ctx.mParams.execParams.ID })
    }
  }
  delete execParams.appointOrder
  delete execParams.appointReason
  delete execParams.dischargeReason
  delete execParams.dismOrder
  delete execParams.dateTrialEnd
  delete execParams.dictTrialPeriodID
  delete execParams.isCreateWorkBookRecord
}

function afterDelete (ctx) {
  if (ctx.mParams.skipBefore) {
    return
  }
  const execParams = ctx.mParams.execParams
  const storeEmployeePosition = UB.DataStore('hr_employeePosition')
  const removePosition = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'organizationID', 'orderID', 'changeOrderID'])
    .misc({ __allowSelectSafeDeleted: true, __skipRls: true })
    .selectById(execParams.ID)
  const positionHistory = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'positionID', 'accrualSum', 'isActive', 'orderID',
      'changeOrderID', 'separationID'])
    .where('employeeNumberID', '=', removePosition.employeeNumberID)
    .orderBy('dateFrom')
    .orderBy('ID')
    .selectAsObject()
  let priorPosition = !ctx.mParams.isOrderOperation ? positionHistory.find(o => o.changeOrderID === removePosition.orderID) : null
  let nextPosition = positionHistory.find(o => o.orderID === removePosition.changeOrderID)
  if (priorPosition && nextPosition) {
    storeEmployeePosition.run('update', {
      skipBefore: true,
      __skipOptimisticLock: true,
      execParams: {
        ID: priorPosition.ID,
        changeOrderID: nextPosition ? nextPosition.orderID : null,
        dateTo: dateService.shiftDate(removePosition.dateTo),
        isActive: (nextPosition && dateService.shiftDate(removePosition.dateTo).getTime() === dateService.shiftDate(nextPosition.dateFrom).getTime()) ? 0 : 1
      }
    })
  } else if (priorPosition && !nextPosition) {
    storeEmployeePosition.run('update', {
      skipBefore: true,
      __skipOptimisticLock: true,
      execParams: {
        ID: priorPosition.ID,
        changeOrderID: null,
        dateTo: dateService.unshiftDate(dateService.maxDate()),
        isActive: 1
      }
    })
  }
  if (priorPosition && !ctx.mParams.isImport) {
    setTimeSheet(removePosition.employeeNumberID, removePosition.organizationID, removePosition.dateFrom, removePosition.dateTo)
  }
  if (!ctx.mParams.isImport) {
    accrualService.setRecalculatePeriod({
      orgID: removePosition.organizationID,
      employeeNumberID: removePosition.employeeNumberID,
      dateFrom: removePosition.dateFrom,
      entityName: __entityName,
      initiatorID: execParams.ID,
      description: `${UB.i18n('Призначення на посаду')}  ${UB.i18n('видалення')} ${dateService.formatDate(dateService.shiftDate(removePosition.dateFrom))}`
    })
    calcService.addCalcTimeSheetQueue({ employeeNumberID: removePosition.employeeNumberID, entityName: 'hr_employeePosition' })
  }
}

function saveFormData (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const formData = mParams.formData
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const orderStore = UB.DataStore('hr_orderPay')
  const storePosition = UB.DataStore('hr_employeePosition')
  const storeNumber = UB.DataStore('hr_employeeNumber')
  if (mParams.method === 'insert') {
    const priorPosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', execParams.employeeNumberID)
      .where('dateFrom', '<=', dateService.shiftDate(formData.dateFrom))
      .orderByDesc('dateTo')
      .limit(1)
      .selectSingle()
    const nextPosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'dateFrom', 'dateTo', 'orderID'])
      .where('employeeNumberID', '=', execParams.employeeNumberID)
      .where('dateFrom', '>=', dateService.shiftDate(formData.dateFrom))
      .orderBy('dateFrom')
      .limit(1)
      .selectSingle()
    if (priorPosition && dateService.shiftDate(priorPosition.dateFrom) >= dateService.shiftDate(formData.dateFrom)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Попреднє призначення має більш пізню дату початку дії')}>>>`)
    }
    if (priorPosition && formData.dateTo && dateService.shiftDate(priorPosition.dateFrom) >= dateService.shiftDate(formData.dateTo)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наступне призначення має більш ранню дату початку дії')}>>>`)
    }
    if (nextPosition && (!formData.dateTo || dateService.shiftDate(nextPosition.dateFrom) >= dateService.shiftDate(formData.dateTo))) {
      execParams.dateTo = formData.dateTo = dateService.addDays(dateService.shiftDate(nextPosition.dateFrom), -1)
    }
    if (nextPosition) {
      execParams.changeOrderID = nextPosition.orderID
    }

    let orderID = orderStore.generateID()
    let entryDate = dateService.shiftDate(formData.dateFrom)
    orderStore.run('insert', {
      execParams: {
        ID: orderID,
        employeeNumberID: execParams.employeeNumberID,
        orderState: 'POSTED',
        empOrderType: priorPosition ? 'MOVE' : 'APPOINT',
        orderNumber: formData.orderNumber || null,
        orderDate: formData.orderDate ? dateService.shiftDate(formData.orderDate) : null,
        entryDate: entryDate,
        description: `${priorPosition ? UB.i18n('Додано призначення через особовий рахунок') : UB.i18n('Прийнято на роботу через особовий рахунок')
        } ${formData.orderNumber || ''} ${formData.orderDate ? dateService.formatDate(dateService.shiftDate(formData.orderDate)) : ''}`
      }
    })

    if (priorPosition) {
      if (dateService.isMaxDate(priorPosition.dateTo) || dateService.shiftDate(priorPosition.dateTo) > entryDate) {
        storePosition.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: priorPosition.ID,
            dateTo: dateService.addDays(entryDate, -1),
            changeOrderID: orderID
          }
        })
      } else {
        storePosition.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: priorPosition.ID,
            changeOrderID: orderID
          }
        })
      }
    }
    execParams.dateFrom = entryDate
    execParams.dateTo = formData.dateTo ? dateService.shiftDate(formData.dateTo) : dateService.maxDate()
    execParams.orderID = orderID
  } else if (Object.keys(formData).length) {
    const priorPosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('changeOrderID', '=', instanceData.orderID)
      .where('employeeNumberID', '=', instanceData.employeeNumberID)
      .limit(1)
      .selectSingle()
    const entryDate = formData.dateFrom ? dateService.shiftDate(formData.dateFrom) : null
    if (priorPosition && entryDate && dateService.shiftDate(priorPosition.dateFrom) >= entryDate) {
      throw new UB.UBAbort(`<<<${UB.i18n('Попреднє призначення має більш пізню дату початку дії')}>>>`)
    }

    const orderParams = {
      ID: instanceData.orderID
    }
    if (formData.orderNumber) {
      orderParams.orderNumber = formData.orderNumber
    }
    if (formData.orderDate) {
      orderParams.orderDate = dateService.shiftDate(formData.orderDate)
    }
    if (entryDate) {
      orderParams.entryDate = entryDate
      execParams.dateFrom = entryDate
    }
    if (UB.Repository('hr_order').attrs(['orderClass.entityName'])
      .where('ID', '=', instanceData.orderID).selectScalar() === 'hr_orderPay') {
      orderStore.run('update', {
        __skipOptimisticLock: true,
        execParams: orderParams
      })
    }
    if (formData.dateTo === null) {
      formData.dateTo = dateService.maxDate()
    }
    if (formData.dateTo) {
      execParams.dateTo = dateService.shiftDate(formData.dateTo)
      if (!execParams.dateFrom && dateService.shiftDate(instanceData.dateFrom) > execParams.dateTo) {
        throw new UB.UBAbort(`<<<${UB.i18n('Дата закінчення призначення не може бути раніше ніж дата початку дії')}>>>`)
      }
      if (instanceData.changeOrderID && execParams.dateTo) {
        const nextPosition = UB.Repository('hr_employeePositionS')
          .attrs(['ID', 'dateTo', 'dateFrom'])
          .where('orderID', '=', instanceData.changeOrderID)
          .where('employeeNumberID', '=', instanceData.employeeNumberID)
          .limit(1)
          .selectSingle()
        if (nextPosition) {
          if (dateService.shiftDate(nextPosition.dateTo) <= execParams.dateTo) {
            throw new UB.UBAbort(`<<<${UB.i18n('Наступне призначення має більш раню дату закінчення дії')}>>>`)
          }
          if (dateService.shiftDate(nextPosition.dateFrom) <= execParams.dateTo) {
            storePosition.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPosition.ID,
                dateFrom: dateService.addDays(execParams.dateTo, 1)
              }
            })
          }
        }
      }
    }
    if (priorPosition && entryDate) {
      if (dateService.shiftDate(priorPosition.dateTo) >= dateService.shiftDate(entryDate)) {
        storePosition.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: priorPosition.ID,
            dateTo: dateService.addDays(entryDate, -1)
          }
        })
      }
    } else {
      const empNumber = UB.Repository('hr_employeeNumberS')
        .attrs(['dateFrom', 'dateTo'])
        .selectById(instanceData.employeeNumberID)
      if (execParams.dateFrom && dateService.shiftDate(execParams.dateFrom) < dateService.shiftDate(empNumber.dateFrom)) {
        storeNumber.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: instanceData.employeeNumberID,
            dateFrom: dateService.shiftDate(execParams.dateFrom)
          }
        })
      }
    }
  }
}

function setTimeSheet (employeeNumberID, organizationID, dateFrom, dateTo) {
  const currentPeriod = periodService.getCurrentPeriod(organizationID)
  const periods = periodService.getPeriodsByDate(organizationID, dateService.shiftDate(dateFrom), dateService.shiftDate(Math.min(dateService.shiftDate(dateTo), currentPeriod.dateTo)))

  periods.forEach(period => {
    timeSheetService.fillTimeSheet({
      organizationID,
      periodID: period.ID,
      employeeNumbers: [employeeNumberID],
      checkPeriod: false
    })
  })
}

me.restoreTemporaryPositions = ctx => {
  const mParams = ctx ? ctx.mParams : { execParams: {} }
  const execParams = mParams.execParams || {}
  const actionDate = execParams.actionDate ? dateService.shiftDate(execParams.actionDate) : dateService.currentDate()
  const daysBefore = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('[constantID.code]', '=', 'hrDaysBeforeRestorePosition')
    .selectScalar()

  if (!daysBefore) return

  const maxPlanDateTo = dateService.addDays(actionDate, Number(daysBefore))
  const empPositions = UB.Repository('hr_employeePosition')
    .attrs(['*', 'employeeID.fullFIO'])
    .where('planDateTo', '<=', maxPlanDateTo)
    .where('planDateTo', '>=', actionDate)
    .where('changeOrderID', 'isNull')
    .selectAsObject({
      'employeeID.fullFIO': 'fullFIO'
    })

  const logStore = UB.DataStore('hr_changePosSchLog')
  const empPosDataStore = UB.DataStore('hr_employeePosition')
  const empNumDataStore = UB.DataStore('hr_employeeNumber')

  if (execParams.clearLog) {
    logStore.execSQL(`delete from hr_changePosSchLog`, {})
  }

  const mappedAttrs = []
  for (let attr in me.entity.attributes) {
    if (me.entity.attributes.hasOwnProperty(attr)) {
      const obj = me.entity.attributes[attr]
      if (obj.mapping) {
        mappedAttrs.push(attr)
      }
    }
  }
  const subAttrs = global['hr_employeePositionS'].entity.attributes
  for (let attr in subAttrs) {
    if (subAttrs.hasOwnProperty(attr)) {
      const obj = subAttrs[attr]
      if (obj.mapping) {
        mappedAttrs.push(attr)
      }
    }
  }

  empPositions.forEach(item => {
    const planDateTo = dateService.shiftDate(item.planDateTo)
    // check dateTo
    const dateTo = dateService.shiftDate(item.dateTo)
    const prevID = item.ID
    const prevOrderID = item.orderID
    const fullFIO = item.fullFIO
    delete item.fullFIO
    if (dateService.isMaxDate(dateTo) || dateTo.getTime() === planDateTo.getTime()) {
      // check changed params
      if (!item.changedValues) {
        logStore.run('insert', {
          execParams: {
            employeePositionID: item.ID,
            organizationID: item.organizationID,
            fullFIO: fullFIO,
            description: item.description,
            actionDate: actionDate,
            actionMessage: `Помилка! Відсутні значення для відновлення (changedValues = null)`
          }
        })
      } else {
        const changedValues = JSON.parse(item.changedValues) || {}
        const entityAttr = empPosDataStore.entity.attributes
        const oldValues = changedValues.oldValues || {}
        const newValues = changedValues.newValues || {}
        const priorID = oldValues.ID
        delete oldValues.ID
        delete oldValues.changedValues
        let hasErrors = false
        for (let attr in oldValues) {
          if (oldValues.hasOwnProperty(attr) && entityAttr.hasOwnProperty(attr)) {
            const type = entityAttr[attr].dataType.toUpperCase()
            let curValue = item[attr]
            let newValue = newValues[attr]
            let curValueCompare = curValue
            let newValueCompare = newValue
            switch (type) {
              case 'DATE':
                curValue = curValue ? dateService.shiftDate(curValue) : null
                newValue = newValue ? dateService.shiftDate(newValue) : null
                curValueCompare = curValue ? dateService.shiftDate(curValue).getTime() : null
                newValueCompare = newValue ? dateService.shiftDate(newValue).getTime() : null
                break
              case 'INT':
              case 'BIGINT':
              case 'CURRENCY':
              case 'FLOAT':
              case 'BOOLEAN':
              case 'ENTITY':
                curValue = curValue ? Number(curValue) : null
                newValue = newValue ? Number(newValue) : null
                curValueCompare = curValue
                newValueCompare = newValue
                break
            }
            if (curValueCompare === newValueCompare) {
              item[attr] = oldValues[attr]
            } else {
              if (!mappedAttrs.includes(attr)) {
                hasErrors = true
                logStore.run('insert', {
                  execParams: {
                    employeePositionID: item.ID,
                    organizationID: item.organizationID,
                    description: item.description,
                    fullFIO: fullFIO,
                    planDateTo: planDateTo,
                    changedValues: item.changedValues,
                    actionDate: actionDate,
                    actionMessage: UB.i18n(`Помилка! Атрибут {0} було змінено. Поточне значення={1}. Попереднє значення={2}`, attr, item[attr], newValues[attr])
                  }
                })
              }
            }
          }
        }
        if (!hasErrors) {
          try {
            // close employeePosition
            empPosDataStore.run('update', {
              __skipOptimisticLock: true,
              isOrderOperation: true,
              execParams: {
                ID: item.ID,
                dateTo: planDateTo,
                changeOrderID: prevOrderID
              }
            })
            // delete mi_ attrs
            for (const attr in item) {
              // eslint-disable-next-line no-prototype-builtins
              if (item.hasOwnProperty(attr)) {
                if (attr.startsWith('mi_')) {
                  delete item[attr]
                }
              }
            }
            const dateFrom = dateService.addDays(planDateTo, 1)
            item.ID = empPosDataStore.generateID()
            item.planDateTo = null
            item.changedValues = null
            item.orderID = prevOrderID
            item.dateFrom = dateFrom
            item.dateTo = dateService.maxDate()
            // create new employeePosition
            empPosDataStore.run('insert', {
              execParams: item
            })
            priorID && orderService.copyEmpPosFundSource({ priorID, newID: item.ID, isDirect: true })
            empNumDataStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: item.employeeNumberID,
                dateTo: dateService.maxDate()
              }
            })
            logStore.run('insert', {
              execParams: {
                employeePositionID: prevID,
                organizationID: item.organizationID,
                employeePositionNewID: item.ID,
                description: item.description,
                fullFIO: fullFIO,
                planDateTo: planDateTo,
                changedValues: JSON.stringify(changedValues),
                actionDate: actionDate,
                actionMessage: null
              }
            })
          } catch (e) {
            logStore.run('insert', {
              execParams: {
                organizationID: item.organizationID,
                employeePositionID: prevID,
                employeePositionNewID: prevID,
                fullFIO: fullFIO,
                description: item.description,
                planDateTo: planDateTo,
                changedValues: JSON.stringify(changedValues),
                actionDate: actionDate,
                actionMessage: UB.i18n(`Невідома помилка: {0}`, e.message)
              }
            })
          }
        }
      }
    } else {
      logStore.run('insert', {
        execParams: {
          organizationID: item.organizationID,
          employeePositionID: item.ID,
          description: item.description,
          fullFIO: fullFIO,
          planDateTo: planDateTo,
          changedValues: item.changedValues,
          actionDate: actionDate,
          actionMessage: UB.i18n(`Помилка! Призначення було закрите (Дата закінчення дії={0} )`, dateService.formatDate(dateTo))
        }
      })
    }
  })
}

me.shiftIncorrectDates = () => {
  const store = UB.DataStore('hr_employeePosition')
  if (entityBaseService.isPostgreSql()) {
    store.runSQL(`
      SELECT ID as "ID", dateFrom as "dateFrom", dateTo as "dateTo" 
        FROM hr_employeePosition hp
        WHERE hp.mi_deleteDate>= '9999-12-31' AND (DATE_PART('hour', hp.dateFrom) <> 0 OR DATE_PART('hour', hp.dateTo)<>0)
    `, {})
  } else {
    store.runSQL(`
      SELECT ID as "ID", dateFrom as "dateFrom", dateTo as "dateTo" 
        FROM hr_employeePosition hp
        WHERE hp.mi_deleteDate>= '9999-12-31' AND (DATEPART(hh, hp.dateFrom) <> 0 OR DATEPART(hh, hp.dateTo)<>0)
    `, {})
  }
  const empData = store.getAsJsObject()
  empData.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        dateFrom: dateService.shiftDate(row.dateFrom),
        dateTo: dateService.shiftDate(row.dateTo)
      }
    })
  })
  store.freeNative()
}

me.updateFactPosition = function (ctx) {
  const instanceID = ctx.mParams.instanceID
  const store = UB.DataStore('hr_employeePosition')
  store.run('update', {
    __skipOptimisticLock: true,
    isDirectUpdate: true,
    isNotCheckPosition: true,
    execParams: {
      ID: instanceID,
      description: null
    }
  })
}
/*
  data for report K1
 */
me.selectForK1 = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let depClause = ''
  if (ctx.mParams.departmentID && ctx.mParams.includeChildDepts) {
    depClause = ` and ep.departmentID IN (select dep.mi_data_id from hr_department dep
      where dep.mi_treePath like '%${ctx.mParams.departmentID}%' and dep.state = 'ACTIVE' 
      and dep.mi_dateFrom <= :dateTo: and dep.mi_dateTo >= :dateTo:
      and dep.mi_deleteDate >= '9999-12-31' )`
  } else if (ctx.mParams.departmentID && !ctx.mParams.includeChildDepts) {
    depClause = ` and ep.departmentID = ${ctx.mParams.departmentID} `
  }

  const epClause = ctx.mParams.empPosIDs && ctx.mParams.empPosIDs.length ? `and ep.ID${entityBaseService.getInExpression('epIDs')}` : ''

  let sqlText = `SELECT A01.ID as "employeeNumberID",
    A02.positionID as "positionID",
    A02.ID AS "ID",
    A01.dateFrom as "dateFrom",
    A01.dateTo as "dateTo",
    A03.dictPositionID as "dictPositionID",
    A01.mi_deleteDate as "mi_deleteDate",
    A03.positionCategory as "positionCategory",
    A04.positionCategory AS "dictPositionCategory",
    A01.employeeID as "employeeID",
    A05.birthDate as "birthDate",
    A05.sexType as "sex"

  FROM hr_employeeNumber A01
  INNER JOIN hr_employeePosition A02 ON A02.ID = (select  ${sqlDialect.top} ep.ID from hr_employeePosition ep
    where ep.employeeNumberID = A01.ID and ep.isActive = 1  and ep.mi_deleteDate >= '9999-12-31'
    AND ep.dateFrom <= :dateTo:
    ${epClause}
    ${depClause}
    order by ep.dateTo desc ${sqlDialect.limit})
  INNER JOIN hr_employee A05 ON A05.ID=A01.employeeID
  LEFT JOIN hr_position A03 ON A03.id = (select ${sqlDialect.top} posSubQ.ID
    from hr_position posSubQ 
    where posSubQ.mi_data_id = A02.positionID  
      and posSubQ.state = 'ACTIVE' 
      and posSubQ.mi_dateFrom <= :dateTo:
      and posSubQ.mi_deleteDate >= '9999-12-31'
      and posSubQ.orgID in (${ctx.mParams.orgIDs.join(', ')})
    order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})            
  LEFT JOIN hr_dictPosition A04 ON A04.ID=A03.dictPositionID

  WHERE A01.dateFrom<= :dateTo: AND A01.dateTo>= :dateFrom:
  AND A01.orgID IN (${ctx.mParams.orgIDs.join(', ')})
  AND A01.mi_deleteDate >= '9999-12-31'
  AND A02.workPlace = '1' AND COALESCE(A02.contractType, '') <> '2'
`

  let empPosData = []
  const store = UB.DataStore('hr_employeePosition')
  if (ctx.mParams.empPosIDs && ctx.mParams.empPosIDs.length) {
    const ids = _.chunk(ctx.mParams.empPosIDs, 1000)
    for (let i = 0; i < ids.length; i++) {
      store.runSQL(sqlText, {
        dateFrom: ctx.mParams.dateFrom,
        dateTo: ctx.mParams.dateTo,
        epIDs: ids[i]
      })
      const data = store.getAsJsObject()
      empPosData.push(...data)
    }
  } else {
    store.runSQL(sqlText, {
      dateFrom: ctx.mParams.dateFrom,
      dateTo: ctx.mParams.dateTo
    })
    empPosData = store.getAsJsObject()
  }

  store.freeNative()
  ctx.mParams.resultData = JSON.stringify(empPosData)
}

me.createOrderMove = function (ctx) {
  const mParams = ctx.mParams
  const orderNumber = UB.i18n('(проєкт)')
  const orderDate = ctx.mParams.onDate

  const orderClass = UB.Repository('hr_orderClass')
    .attrs('ID')
    .where('entityName', '=', 'hr_empOrder')
    .selectScalar()

  let orderID

  const empOrderStore = UB.DataStore('hr_empOrder')

  orderID = empOrderStore.generateID()
  empOrderStore.run('insert', {
    execParams: {
      ID: orderID,
      orderNumber: orderNumber,
      orderDate: orderDate,
      entryDate: orderDate,
      organizationID: mParams.organizationID,
      empOrderType: mParams.empOrderType,
      orderClass: orderClass,
      periodID: periodService.getCurrentPeriod(ctx.mParams.organizationID).ID,
      reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}',
      orderState: 'PROJECT'
    }
  })

  empOrderStore.freeNative()

  const employeePosition = UB.Repository('hr_employeePosition')
    .attrs(['ID', 'dictCategoryECBID'])
    .selectById(mParams.employeePositionID)
  ctx.mParams.orderID = orderID
  ctx.mParams.dictCategoryECBID = (employeePosition && employeePosition.dictCategoryECBID) || null
  return true
}
