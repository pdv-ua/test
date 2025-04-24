const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const calcService = require('../HR/modules/calcService')
const accrualService = require('../HR/modules/accrualService')
const algorithmService = require('../HR/modules/algorithmService')
const nameCaseService = require('../HR/modules/nameCaseService')
const payElService = require('../HR/modules/payElService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const staffService = require('../HR/modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const employeeService = require('../HR/modules/employeeService')
const rlService = require('../HR/modules/rlService')
const paySummaryService = require('../HR/modules/paySummaryService')
const _ = require('lodash')
const timService = require('./modules/timService')
const glCore = require('../GL/modules/glCore')
const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]

me.entity.addMethod('setDictCategoryECB')
me.entity.addMethod('setDepartmentInEmpPos')
me.entity.addMethod('setMiTreePath')
me.entity.addMethod('setEmployeePositionDescription')
me.entity.addMethod('timeSheetCorrect')
me.entity.addMethod('updatePosQuantity')
me.entity.addMethod('setEmployeeNumberDateFrom')
me.entity.addMethod('unitTabs')
me.entity.addMethod('changeEmployee')
me.entity.addMethod('updateEmployeeFIO')
me.entity.addMethod('updateEmployeePosition')
me.entity.addMethod('deleteEmployeePosition')
me.entity.addMethod('setIsIndexSalary')
me.entity.addMethod('updateAccrualPayEl')
me.entity.addMethod('updatePayEl')
me.entity.addMethod('replaceWorkSchedule')
me.entity.addMethod('updateFundBalance')
me.entity.addMethod('deleteFundBalance')
me.entity.addMethod('deleteDepartment')
me.entity.addMethod('createPayAccrual')
me.entity.addMethod('loadCertification')
me.entity.addMethod('fillEmployeePositionTariff')
me.entity.addMethod('fillEmployeePositionAccrual')
me.entity.addMethod('setEmployeeNameCases')
me.entity.addMethod('clearEmployeeNameCases')
me.entity.addMethod('updateEntityDescription')
me.entity.addMethod('createAccrualDt')
me.entity.addMethod('fillEmpPosData')
me.entity.addMethod('transferRl')
me.entity.addMethod('updateDictPeriod')
me.entity.addMethod('calcPosAccrual')
me.entity.addMethod('updateEmployeeDocKind')
me.entity.addMethod('updateAddPersonDescription')
me.entity.addMethod('recalcEsv')
me.entity.addMethod('deletePeriodCalcData')
me.entity.addMethod('updateDepCodes')
me.entity.addMethod('updateEmpCategory')
me.entity.addMethod('setMiTreePathByAllOrgs')
me.entity.addMethod('fillEmpAddGuarantees')
me.entity.addMethod('updateEmployeeOnStaff')
me.entity.addMethod('fillFacultyStudGroup')
me.entity.addMethod('setPositionInEmpPos')
me.entity.addMethod('setEmployeeOrg')
me.entity.addMethod('fillEmployeePosInWorkBook')
me.entity.addMethod('shiftIncorrectDates')
me.entity.addMethod('createTarifications')
me.entity.addMethod('createRlTarifications')
me.entity.addMethod('recalcFlagsRlImp')
me.entity.addMethod('changeDepartmentKtID2ClID')
me.entity.addMethod('timeSheetTarifications')
me.entity.addMethod('corectionSheetChange')
me.entity.addMethod('corectionMissionTimeSheet')
me.entity.addMethod('deleteOrgDep')
me.entity.addMethod('fixPosOrg')
function setLog (params, start = false, commit = true) {
  const store = UB.DataStore('hr_importCustomLog')
  if (start) {
    UB.DataStore('hr_importCustomLog').execSQL(`delete FROM hr_importCustomLog WHERE orgID = :orgID: AND entityName = :entityName:`, {
      orgID: params.orgID, entityName: params.entityName
    })
  }

  const execParams = {
    ID: store.generateID(),
    msgType: params.msgType,
    operationDate: new Date(),
    userID: Session.uData.userID,
    orgID: params.orgID,
    entityName: params.entityName,
    targetOrgID: params.targetOrgID || null,
    description: `${params.description}`.substring(0, 1999)
  }
  store.run('insert', {
    __skipOptimisticLock: true,
    __skipSelectAfterInsert: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams
  })
  if (commit) {
    App.dbCommit()
  }
}

me.updatePosQuantity = function (ctx) {
  if (!ctx.mParams.orgID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не вибрана організація')}>>>`)
  }
  UB.DataStore(__entityName).execSQL(`update hr_position set quantity = 1 where quantity is null and orgID = :orgID:`, {
    orgID: ctx.mParams.orgID
  })
  UB.DataStore(__entityName).execSQL(`update hr_staffUnit set quantity = 1 where quantity is null and mi_unityEntity = 'hr_position' and orgID = :orgID:`, {
    orgID: ctx.mParams.orgID
  })
}
me.setMiTreePath = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const sql = `
  WITH ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'RECURSIVE'} tree (id, mi_data_id, parentUnitID, mi_unityEntity, mi_treePath, mi_treePathNew, treePath, treePathNew)
  AS (
      SELECT  
        id, 
        mi_data_id, 
        parentUnitID AS "parentUnitID", 
        mi_unityEntity AS "mi_unityEntity", 
        mi_treePath AS "mi_treePath", 
        CAST(CONCAT('/', CAST(mi_data_id AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600)) AS "mi_treePathNew", 
        treePath AS "treePath",
        CAST(CONCAT('/', CAST(SUBSTRING(CAST(10000000+idxNum AS NATIONAL CHAR VARYING(600)),3,10) AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600)) AS "treePathNew"
      FROM hr_staffUnit
        WHERE parentUnitID is null
          and orgID = :orgID:
          and mi_deleteDate >= '9999-12-31'
          and :onDate: between mi_dateFrom and mi_dateTo
          and state = 'ACTIVE'
    UNION ALL
      SELECT 
          t.id, 
          t.mi_data_id, 
          t.parentUnitID, 
          t.mi_unityEntity,
          t.mi_treePath, 
          CAST(CONCAT(tree.mi_treePathNew, CAST(t.mi_data_id AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600)),
          t.treePath, 
          CAST(CONCAT(tree.treePathNew, CAST(SUBSTRING(CAST(10000000+t.idxNum as NATIONAL CHAR VARYING(600)),3,10) AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600))
      FROM hr_staffUnit t
        INNER JOIN tree ON tree.mi_data_id = t.parentUnitID
        WHERE t.mi_deleteDate >= '9999-12-31'
            and :onDate: between mi_dateFrom and mi_dateTo
            and t.state = 'ACTIVE'
  ) 
  SELECT 
    id "ID", 
    mi_data_id "mi_data_id", 
    parentUnitID "parentUnitID", 
    mi_unityEntity "mi_unityEntity", 
    mi_treePath "mi_treePath", 
    mi_treePathNew "mi_treePathNew", 
    treePath "treePath", 
    treePathNew "treePathNew"
  FROM tree
   `
  const store = UB.DataStore(__entityName)
  store.runSQL(sql, {
    orgID: ctx.mParams.orgID,
    onDate: dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate()
  })
  const treeData = store.getAsJsObject()

  treeData.forEach(item => {
    if (!item['treePath'] || item['treePath'] !== item['treePathNew'] || !item['mi_treePath'] || item['mi_treePath'] !== item['mi_treePathNew']) {
      store.execSQL(`UPDATE hr_staffUnit SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
        ID: item.ID,
        treePathNew: item['treePathNew'],
        mi_treePathNew: item['mi_treePathNew']
      })
      if (item['mi_unityEntity'] === 'hr_position') {
        store.execSQL(`UPDATE hr_position SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew'],
          mi_treePathNew: item['mi_treePathNew']
        })
      }
      if (item['mi_unityEntity'] === 'hr_department') {
        store.execSQL(`UPDATE hr_department SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew'],
          mi_treePathNew: item['mi_treePathNew']
        })
      }
      if (item['mi_unityEntity'] === 'hr_organization') {
        store.execSQL(`UPDATE hr_organization SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew'],
          mi_treePathNew: item['mi_treePathNew']
        })
      }
    }
  })
  store.freeNative()
}

me.setDictCategoryECB = function (ctx) {
  const mParams = ctx.mParams
  const logParams = {
    orgID: mParams.orgID,
    targetOrgID: mParams.orgID,
    entityName: mParams.method
  }
  setLog(Object.assign({ msgType: '0', description: `${UB.i18n('Запуск')} ${JSON.stringify(mParams)}` }, logParams), true)
  const runMethod = () => {
    const store = UB.DataStore('hr_employeePosition')
    store.execSQL(`UPDATE hr_employeePosition SET
                   dictCategoryECBID = :dictCategoryECBID:
                   WHERE organizationID = :organizationID:`,
    { organizationID: mParams.orgID, dictCategoryECBID: mParams.dictCategoryECBID })
  }
  try {
    db.savepointWrap(runMethod)
    setLog(Object.assign({ msgType: '0', description: UB.i18n('Зaвершено') }, logParams))
  } catch (error) {
    setLog(Object.assign({ msgType: '1', description: error }, logParams))
    mParams.msgType = 1
  }
}
me.setDepartmentInEmpPos = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_employeePosition')
  const resultData = []
  const employeePositions = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'positionID', 'departmentID', 'departmentHistoryID', 'description'])
    .where('organizationID', '=', mParams.orgID)
    .where('dateFrom', '<=', dateService.shiftDate(mParams.onDate))
    .where('dateTo', '>=', dateService.shiftDate(mParams.onDate))
    .selectAsObject()

  employeePositions.forEach(pos => {
    if (pos.positionID) {
      const posData = UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'parentUnitID', 'parentUnitID.mi_unityEntity', 'parentUnitID.code', 'parentUnitID.name'])
        .misc({ __mip_ondate: dateService.shiftDate(mParams.onDate) })
        .where('mi_data_id', '=', pos.positionID)
        .where('state', '=', 'ACTIVE')
        .joinCondition('parentUnitID.mi_dateFrom', '<=', dateService.shiftDate(mParams.onDate))
        .joinCondition('parentUnitID.mi_dateTo', '>=', dateService.shiftDate(mParams.onDate))
        .joinCondition('parentUnitID.mi_deleteDate', '>=', '#maxdate')
        .joinCondition('parentUnitID.state', '=', 'ACTIVE')
        .orderByDesc('mi_dateTo')
        .selectSingle()
      if (posData && posData['parentUnitID.mi_unityEntity'] === 'hr_department' && posData.parentUnitID !== pos.departmentID) {
        resultData.push(`${pos.description} - [${posData['parentUnitID.code']}] ${posData['parentUnitID.name']}`)
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          isImport: true,
          execParams: {
            ID: pos.ID,
            departmentID: posData.parentUnitID,
            departmentHistoryID: pos.departmentHistoryID || pos.departmentID,
            description: null
          }
        })
      }
    }
  })
  mParams.resultData = JSON.stringify(resultData)
}

me.setEmployeePositionDescription = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_employeePosition')
  const fillAll = mParams.fillAll
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate)
  let employeePositions = UB.Repository('hr_employeePositionS')
    .attrs(['ID'])
    .where('organizationID', '=', orgID)
    .whereIf(!fillAll, 'dateFrom', '<=', onDate)
    .whereIf(!fillAll, 'dateTo', '>=', onDate)
    .selectAsObject()

  employeePositions.forEach(pos => {
    store.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      isImport: true,
      isHistorical: fillAll,
      execParams: {
        ID: pos.ID,
        description: null
      }
    })
  })
  if (!fillAll) {
    employeePositions = UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('organizationID', '=', orgID)
      .where('dateFrom', '>=', onDate)
      .selectAsObject()

    employeePositions.forEach(pos => {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        isImport: true,
        execParams: {
          ID: pos.ID,
          description: null
        }
      })
    })
  }
}

me.timeSheetCorrect = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('tim_timeSheet')
  const timTimeSheetStore = UB.DataStore('tim_timeSheet')
  data.forEach(row => {
    row.dateWork = dateService.shiftDate(row.dateWork)
    const timeSheetDay = UB.Repository('tim_timeSheet')
      .attrs(['*'])
      .where('employeeNumberID', '=', row.employeeNumberID)
      .where('dateWork', '=', dateService.shiftDate(row.dateWork))
      .where('isActive', '=', 1)
      .selectSingle()
    if (timeSheetDay && !timeSheetDay.isSchedule) {
      row.isActive = 0
    } else {
      timTimeSheetStore.execSQL('UPDATE tim_timeSheet SET isActive = :isActive:  WHERE ID = :ID:', { ID: timeSheetDay.ID, isActive: 0 })
    }
    row.isSchedule = 0
    row.isCanceled = 0
    row.isCorrection = 1
    store.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      isImport: true,
      execParams: row
    })
  })
}
me.setEmployeeNumberDateFrom = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_employeeNumber')
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'employeeID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', mParams.orgID)
    .selectAsObject()
  employeeNumbers.forEach(employeeNumber => {
    const employeeWorkbook = UB.Repository('hr_employeeWorkbook')
      .attrs(['ID', 'employeeID', 'dateFrom', 'dateTo'])
      .where('employeeID', '=', employeeNumber.employeeID)
      .where('organizationID', '=', mParams.orgID)
      .where('isOrgAppoint', '=', 1)
      .orderBy('dateFrom')
      .selectSingle()
    if (employeeWorkbook && employeeWorkbook.dateFrom) {
      store.execSQL(`UPDATE hr_employeeNumber SET
                   dateFrom = :dateFrom:
                   WHERE ID = :ID:`,
      {
        ID: employeeNumber.ID,
        dateFrom: dateService.shiftDate(employeeWorkbook.dateFrom)
      })
    }
  })
}

me.transferRl = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_accrual')
  const periodFrom = mParams.periodFromRlID ? periodService.getPeriod(mParams.periodFromRlID) : null
  const dateFrom = periodFrom ? periodFrom.dateFrom : dateService.minDate()
  const periodTo = mParams.periodToRlID ? periodService.getPeriod(mParams.periodToRlID) : null
  const dateTo = periodTo ? periodTo.dateTo : dateService.maxDate()

  store.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID in 
  (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID: and employeeNumberPartID = :employeeNumberPartID: and periodCalc >= :dateFrom: and periodCalc <= :dateTo: )`,
  { employeeNumberID: mParams.targetRlID, employeeNumberPartID: mParams.sourceRlID, dateFrom, dateTo })
  store.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID in 
  (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID: and employeeNumberPartID = :employeeNumberPartID: and periodCalc >= :dateFrom: and periodCalc <= :dateTo: )`,
  { employeeNumberID: mParams.targetRlID, employeeNumberPartID: mParams.sourceRlID, dateFrom, dateTo })
  store.execSQL(`DELETE FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:  and employeeNumberPartID = :employeeNumberPartID: and periodCalc >= :dateFrom: and periodCalc <= :dateTo:`,
    { employeeNumberID: mParams.targetRlID, employeeNumberPartID: mParams.sourceRlID, dateFrom, dateTo })
  store.execSQL(`UPDATE hr_accrual SET
     employeeNumberID = :employeeNumberID:
     WHERE employeeNumberID = :employeeNumberPartID: and periodCalc >= :dateFrom: and periodCalc <= :dateTo:`,
  { employeeNumberID: mParams.targetRlID, employeeNumberPartID: mParams.sourceRlID, dateFrom, dateTo })
  store.execSQL(`UPDATE hr_accrualFund SET
     employeeNumberID = :employeeNumberID:
     WHERE employeeNumberID = :employeeNumberPartID: and periodCalc >= :dateFrom: and periodCalc <= :dateTo:`,
  { employeeNumberID: mParams.targetRlID, employeeNumberPartID: mParams.sourceRlID, dateFrom, dateTo })
}

me.unitTabs = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_employeeNumber')
  const source = UB.Repository('hr_employeeNumberS').attrs(['ID', 'employeeID', 'dateFrom', 'dateTo']).selectById(mParams.sourceID)
  const target = UB.Repository('hr_employeeNumberS').attrs(['ID', 'employeeID', 'dateFrom', 'dateTo']).selectById(mParams.targetID)
  if (!source || !target) {
    throw new UB.UBAbort(`<<<${UB.i18n('Дані номери вже поєднані')}>>>`)
  }
  if (source.employeeID !== target.employeeID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не можуть бути поєднані призначення для різних Осіб')}>>>`)
  }

  store.execSQL(`UPDATE hr_employeeNumber set dateFrom = :dateFrom:, dateTo = :dateTo: where ID = :ID:`, {
    ID: mParams.targetID,
    dateFrom: dateService.shiftDate(Math.min(dateService.shiftDate(source.dateFrom), dateService.shiftDate(target.dateFrom))),
    dateTo: dateService.shiftDate(Math.max(dateService.shiftDate(source.dateTo), dateService.shiftDate(target.dateTo)))
  })
  store.execSQL(`UPDATE hr_employeeNumber set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where ID = :ID:`,
    { deleteDate: new Date(), userID: Session.uData.userID, ID: mParams.sourceID })

  store.execSQL(`DELETE FROM tim_timeSheet WHERE employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID in (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:)`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID in (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:)`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID in (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:)`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID in (SELECT ID FROM hr_accrualFund WHERE employeeNumberID = :employeeNumberID:)`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_accrualFund WHERE  employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_accrualBalance WHERE  employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_calcQueue WHERE employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_calcTimeSheetQueue WHERE employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })
  store.execSQL(`DELETE FROM hr_employeeNumState WHERE  employeeNumberID = :employeeNumberID:`, { employeeNumberID: mParams.sourceID })

  const entities = App.domainInfo.entities
  Object.keys(entities).forEach(entityName => {
    if (entities[entityName].dsType !== 'Virtual' && entities[entityName].attributes) {
      Object.keys(entities[entityName].attributes).forEach(attrName => {
        if (entities[entityName].attributes[attrName].dataType === 'Entity' &&
            !entities[entityName].attributes[attrName].mapping &&
            ['hr_employeeNumber', 'hr_employeeNumberS', 'hr_employeeNumberSR'].includes(entities[entityName].attributes[attrName].associatedEntity)) {
          store.execSQL(` UPDATE ${(entities[entityName].mapping && entities[entityName].mapping.execName) ? entities[entityName].mapping.execName : entityName} set ${attrName} = :targetID: 
         where ${attrName} = :sourceID:`, {
            sourceID: mParams.sourceID,
            targetID: mParams.targetID
          })
        }
      })
    }
  })
}

me.changeEmployee = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_employee')
  if (!mParams.sourceID || !mParams.targetID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Виберіть обидві особи')}>>>`)
  }
  const entities = App.domainInfo.entities
  Object.keys(entities).forEach(entityName => {
    if (entities[entityName].dsType !== 'Virtual' && entities[entityName].attributes) {
      Object.keys(entities[entityName].attributes).forEach(attrName => {
        if (entities[entityName].attributes[attrName].dataType === 'Entity' &&
          !entities[entityName].attributes[attrName].mapping &&
          ['hr_employee'].includes(entities[entityName].attributes[attrName].associatedEntity)) {
          store.execSQL(` UPDATE ${(entities[entityName].mapping && entities[entityName].mapping.execName) ? entities[entityName].mapping.execName : entityName} set ${attrName} = :targetID: 
         where ${attrName} = :sourceID:`, {
            sourceID: mParams.sourceID,
            targetID: mParams.targetID
          })
        }
      })
    }
  })
}
me.updateEmployeeFIO = function (ctx) {
  const store = UB.DataStore('hr_employee')
  const repFrom = [/E/g, /e/g, /T/g, /I/g, /i/g, /O/g, /o/g, /P/g, /p/g, /A/g, /a/g, /H/g, /K/g, /k/g, /X/g, /x/g, /C/g, /c/g, /B/g, /M/g]
  const repTo = ['Е', 'е', 'Т', 'І', 'і', 'О', 'о', 'Р', 'р', 'А', 'а', 'Н', 'К', 'к', 'Х', 'х', 'С', 'с', 'В', 'М']
  const nameAttrs = ['firstName', 'lastName', 'middleName', 'shortFIO', 'fullFIO', 'genName', 'datName',
    'description', 'accusativeName', 'insName', 'locName', 'vocName']
  const nameDescAttrs = ['description']
  const employees = UB.Repository('hr_employee').attrs(['ID'].concat(nameAttrs)).selectAsObject()
  employees.forEach(row => {
    nameAttrs.forEach(nameAttr => {
      if (row[nameAttr]) {
        repFrom.forEach((reg, idx) => {
          row[nameAttr] = row[nameAttr].replace(reg, repTo[idx])
        })
      }
    })
    store.execSQL(`UPDATE hr_employee SET 
    firstName = :firstName:, lastName =:lastName:, middleName = :middleName:, shortFIO = :shortFIO:, fullFIO = :fullFIO:,
    genName = :genName:, datName = :datName:, description = :description:, accusativeName = :accusativeName:,
    insName = :insName:, locName = :locName:, vocName = :vocName:
    WHERE ID = :ID: `, {
      ID: row.ID,
      firstName: row.firstName,
      lastName: row.lastName,
      middleName: row.middleName,
      shortFIO: row.shortFIO,
      fullFIO: row.fullFIO,
      genName: row.genName,
      datName: row.datName,
      description: row.description,
      accusativeName: row.accusativeName,
      insName: row.insName,
      locName: row.locName,
      vocName: row.vocName
    })
  })
  const employeeNumbers = UB.Repository('hr_employeeNumberS').attrs(['ID'].concat(nameDescAttrs)).selectAsObject()
  employeeNumbers.forEach(row => {
    nameDescAttrs.forEach(nameAttr => {
      if (row[nameAttr]) {
        repFrom.forEach((reg, idx) => {
          row[nameAttr] = row[nameAttr].replace(reg, repTo[idx])
        })
      }
    })
    store.execSQL(`UPDATE hr_employeeNumber SET description = :description: WHERE ID = :ID: `, {
      ID: row.ID,
      description: row.description
    })
  })
  const employeePositions = UB.Repository('hr_employeePositionS').attrs(['ID'].concat(nameDescAttrs)).selectAsObject()
  employeePositions.forEach(row => {
    nameDescAttrs.forEach(nameAttr => {
      if (row[nameAttr]) {
        repFrom.forEach((reg, idx) => {
          row[nameAttr] = row[nameAttr].replace(reg, repTo[idx])
        })
      }
    })
    store.execSQL(`UPDATE hr_employeePosition SET description = :description: WHERE ID = :ID: `, {
      ID: row.ID,
      description: row.description
    })
  })
}

me.deleteEmployeePosition = function (ctx) {
  const mParams = ctx.mParams
  let store = UB.DataStore('hr_employeePosition')
  store.execSQL(`UPDATE hr_employeePosition SET mi_deleteUser = :userID:, mi_deleteDate = '2000-01-01' 
  WHERE organizationID = :orgID: AND mi_deleteDate >= '9999-12-31' 
  and ID NOT IN (SELECT m1.outputID from hr_importMap m1 where m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition')`,
  { orgID: mParams.orgID })
}

me.updateEmployeePosition = function (ctx) {
  const mParams = ctx.mParams
  let store = UB.DataStore('hr_employeePosition')
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', mParams.orgID)
    .selectAsObject()
  employeeNumbers.forEach(employeeNumber => {
    store.runSQL(`SELECT p.ID, p.dateFrom, p.departmentID, p.positionID, p.dictPositionID, p.dictWagePayID,
      p.workPlace, p.dictRankID, p.dictTrialPeriodID, p.dateTrialEnd, p.contractType, p.dictContractKindID,
      p.planDateTo, p.dictTarifCoeffID, p.isResponsible, p.paraID, p.orderID, p.changeOrderID
      FROM hr_employeePosition p 
      JOIN hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID = p.ID
    WHERE p.employeeNumberID = :employeeNumberID: AND p.mi_deleteDate >= '9999-12-31'
    ORDER BY p.dateTo desc
    `, {
      orgID: mParams.orgID,
      employeeNumberID: employeeNumber.ID
    })
    const payData = store.getAsJsObject()
    if (payData.length) {
      const payEmployeePositionID = payData[0].ID
      store.runSQL(`SELECT p.ID, p.dateFrom, p.departmentID, p.positionID, p.dictPositionID, p.dictWagePayID,
      p.workPlace, p.dictRankID, p.dictTrialPeriodID, p.dateTrialEnd, p.contractType, p.dictContractKindID,
      p.planDateTo, p.dictTarifCoeffID, p.isResponsible, p.paraID, p.orderID, p.changeOrderID FROM hr_employeePosition p 
    LEFT JOIN hr_importMap m1 on m1.orgID = :orgID: and m1.entityName = 'hr_employeePosition' and m1.outputID = p.ID
    WHERE p.employeeNumberID = :employeeNumberID: AND p.mi_deleteDate = '2000-01-01' and m1.ID IS NULL
    ORDER BY p.dateTo desc
    `, {
        orgID: mParams.orgID,
        employeeNumberID: employeeNumber.ID
      })
      const hrData = store.getAsJsObject()
      if (hrData.length) {
        const hrEmployeePosition = hrData[0]
        const hrEmployeePositionID = hrData[0].ID
        store.execSQL(`UPDATE hr_employeePosition SET 
        departmentID = :departmentID:, positionID = :positionID:, dictPositionID = :dictPositionID:, dictWagePayID = :dictWagePayID:,
        workPlace = :workPlace:, dictRankID = :dictRankID:, dictTrialPeriodID = :dictTrialPeriodID:, dateTrialEnd = :dateTrialEnd:,
        contractType = :contractType:, dictContractKindID = :dictContractKindID:, planDateTo = :planDateTo:,
        dictTarifCoeffID = :dictTarifCoeffID:, isResponsible = :isResponsible:, paraID = :paraID:, orderID = :orderID:, changeOrderID = :changeOrderID:
        WHERE ID = :ID: `, {
          ID: payEmployeePositionID,
          departmentID: hrEmployeePosition.departmentID,
          positionID: hrEmployeePosition.positionID,
          dictPositionID: hrEmployeePosition.dictPositionID,
          dictWagePayID: hrEmployeePosition.dictWagePayID,
          workPlace: hrEmployeePosition.workPlace,
          dictRankID: hrEmployeePosition.dictRankID,
          dictTrialPeriodID: hrEmployeePosition.dictTrialPeriodID,
          dateTrialEnd: hrEmployeePosition.dateTrialEnd,
          contractType: hrEmployeePosition.contractType,
          dictContractKindID: hrEmployeePosition.dictContractKindID,
          planDateTo: hrEmployeePosition.planDateTo,
          dictTarifCoeffID: hrEmployeePosition.dictTarifCoeffID,
          isResponsible: hrEmployeePosition.isResponsible,
          paraID: hrEmployeePosition.paraID,
          orderID: hrEmployeePosition.orderID,
          changeOrderID: hrEmployeePosition.changeOrderID
        })
        store.execSQL(`UPDATE hr_employeeWorkbook SET employeePositionID = :payEmployeePositionID: WHERE employeePositionID = :hrEmployeePositionID: `, {
          payEmployeePositionID,
          hrEmployeePositionID
        })
        payData.forEach(row => {
          if (row.ID !== payEmployeePositionID) {
            const hrPos = hrData.find(o => dateService.shiftDate(o.dateFrom).getTime() === dateService.shiftDate(row.dateFrom).getTime() && o.ID !== hrEmployeePositionID)
            if (hrPos) {
              store.execSQL(`UPDATE hr_employeePosition SET 
                contractType = :contractType:, paraID = :paraID:, orderID = :orderID:, dictContractKindID = :dictContractKindID:,
                dictTrialPeriodID = :dictTrialPeriodID:, dateTrialEnd = :dateTrialEnd:, workPlace = :workPlace:, dictWagePayID = :dictWagePayID:
                WHERE ID = :ID: `, {
                ID: row.ID,
                contractType: hrPos.contractType,
                paraID: hrPos.paraID,
                orderID: hrPos.orderID,
                dictContractKindID: hrPos.dictContractKindID,
                dictTrialPeriodID: hrPos.dictTrialPeriodID,
                dateTrialEnd: hrPos.dateTrialEnd,
                workPlace: hrPos.workPlace,
                dictWagePayID: hrPos.dictWagePayID
              })
            }
          }
        })
        hrData.forEach(row => {
          store.execSQL(`UPDATE hr_employeePosition SET mi_deleteUser = :userID:, mi_deleteDate = '2000-01-01' WHERE ID = :ID:`,
            { ID: row.ID, userID: Session.uData.userID })
        })
      }
    }
  })
}
me.setIsIndexSalary = function (ctx) {
  const mParams = ctx.mParams
  const logParams = {
    orgID: mParams.orgID,
    targetOrgID: mParams.orgID,
    entityName: mParams.method
  }
  setLog(Object.assign({ msgType: '0', description: `${UB.i18n('Запуск')} ${JSON.stringify(mParams)}` }, logParams), true)
  const runMethod = () => {
    const onDate = dateService.shiftDate(mParams.isIndexDateFrom)
    const store = UB.DataStore('hr_employeePosition')
    const employeePositions = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'accrualSum'])
      .where('employeeNumberID.orgID', '=', mParams.orgID)
      .where('dateFrom', '=', onDate)
      .where('[dateFrom] <> [employeeNumberID.dateFrom]', 'custom')
      .where('isIndex', '=', 0)
      .selectAsObject()
    const dateTo = dateService.addDays(onDate, -1).getTime()
    employeePositions.forEach(row => {
      const employeePosition = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID', 'dateTo', 'accrualSum'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('dateFrom', '<', onDate)
        .orderByDesc('dateFrom')
        .selectSingle()
      if (employeePosition && employeePosition.accrualSum < row.accrualSum &&
        dateService.shiftDate(employeePosition.dateTo).getTime() === dateTo) {
        store.execSQL(` UPDATE hr_employeePosition set isIndex = 1
         where ID = :ID:`, {
          ID: row.ID
        })
      }
    })
  }
  try {
    db.savepointWrap(runMethod)
    setLog(Object.assign({ msgType: '0', description: UB.i18n('Зaвершено') }, logParams))
  } catch (error) {
    setLog(Object.assign({ msgType: '1', description: error }, logParams))
    mParams.msgType = 1
  }
}

me.updateAccrualPayEl = function (ctx) {
  const mParams = ctx.mParams
  const sourceID = mParams.payElFromID
  const targetID = mParams.payElToID
  const orgID = mParams.orgID
  const tabNums = mParams.tabNums
  const store = UB.DataStore('hr_payEl')
  store.execSQL(`UPDATE hr_accrual SET payElID = :targetID: WHERE orgID = :orgID: AND payElID = :sourceID: 
  ${tabNums ? `and employeeNumberID in (select ID from hr_employeeNumber where orgID = :orgID: and tabNum in (${tabNums.replace(/ /g, '')}))` : ''}
  `, {
    targetID: targetID,
    sourceID: sourceID,
    orgID: orgID
  })

  store.execSQL(`UPDATE hr_accrualFundDt SET payElID = :targetID: WHERE  payElID = :sourceID:
   and accrualFundID in (select n.ID from hr_accrualFund f join hr_employeeNumber n on n.ID = f.employeeNumberID and n.orgID = :orgID:
   where f.orgID = :orgID: ${tabNums ? `and n.tabNum in (${tabNums.replace(/ /g, '')})` : ''} )`, {
    targetID: targetID,
    sourceID: sourceID,
    orgID: orgID
  })
}
me.updatePayEl = function (ctx) {
  const mParams = ctx.mParams
  const sourceID = mParams.payElIDFrom
  const targetID = mParams.payElIDTo
  const store = UB.DataStore('hr_payEl')
  const sqlDialect = entityBaseService.getSQLDialect()
  if (sourceID && targetID) {
    const entities = App.domainInfo.entities
    Object.keys(entities).forEach(entityName => {
      if (entities[entityName].dsType !== 'Virtual' && entities[entityName].attributes) {
        Object.keys(entities[entityName].attributes).forEach(attrName => {
          if (entities[entityName].attributes[attrName].dataType === 'Entity' &&
            !entities[entityName].attributes[attrName].mapping &&
            ['hr_payEl'].includes(entities[entityName].attributes[attrName].associatedEntity)) {
            store.execSQL(` UPDATE ${(entities[entityName].mapping && entities[entityName].mapping.execName) ? entities[entityName].mapping.execName : entityName} set ${attrName} = :targetID: 
         where ${attrName} = :sourceID:`, {
              sourceID,
              targetID
            })
          }
        })
      }
    })
    store.runSQL(`SELECT count(*) as cnt, taxIndividID, payElID from hr_payElTaxIndivid
    where  payElID = :payElID: and mi_deleteDate>='9999-12-31'
    GROUP BY taxIndividID, payElID
    HAVING count(*) > 1`, { payElID: targetID })
    const taxIndivid = store.getAsJsObject()
    taxIndivid.forEach(row => {
      store.runSQL(`SELECT ${sqlDialect.top} ID from hr_payElTaxIndivid where mi_deleteUser is NULL and payElID = :payElID:
       and taxIndividID = :taxIndividID: ${sqlDialect.limit}`, { payElID: targetID, taxIndividID: row.taxIndividID })
      const delRows = store.getAsJsObject()
      delRows.forEach(delRow => {
        store.execSQL(`DELETE FROM hr_payElTaxIndivid WHERE ID = :ID:`, { ID: delRow.ID })
      })
    })
    store.runSQL(`SELECT count(*) as cnt, entryType, payElBaseID, payElID from hr_payElEntry
    where mi_deleteDate>='9999-12-31' and payElBaseID = :payElBaseID:
    GROUP BY entryType, payElBaseID, payElID
    HAVING count(*) > 1`, { payElBaseID: targetID })
    const payElEntry = store.getAsJsObject()
    payElEntry.forEach(row => {
      store.runSQL(`SELECT ${sqlDialect.top} ID from hr_payElEntry where mi_deleteDate>='9999-12-31' and payElBaseID = :payElBaseID:
       and payElID = :payElID: and entryType = :entryType: ${sqlDialect.limit}`, { payElBaseID: targetID, payElID: row.payElID, entryType: row.entryType })
      const delRows = store.getAsJsObject()
      delRows.forEach(delRow => {
        store.execSQL(`DELETE FROM hr_payElEntry WHERE ID = :ID:`, { ID: delRow.ID })
      })
    })
    UB.DataStore('hr_payEl').run('delete', {
      execParams: {
        ID: sourceID
      }
    })
  }
}

me.replaceWorkSchedule = ctx => {
  const mParams = ctx.mParams
  const logParams = {
    orgID: mParams.orgID,
    targetOrgID: mParams.orgID,
    entityName: mParams.method
  }
  setLog(Object.assign({ msgType: '0', description: `${UB.i18n('Запуск')} ${JSON.stringify(mParams)}` }, logParams), true)
  const runMethod = () => {
    const mParams = ctx.mParams
    UB.DataStore(__entityName).execSQL(`
            update hr_employeePosition set workScheduleID = :workScheduleToID:
              where organizationID = :orgID:
              ${mParams.workScheduleFromID ? 'and workScheduleID = :workScheduleFromID:' : 'and workScheduleID is NULL'}
        `, {
      orgID: mParams.orgID,
      workScheduleToID: mParams.workScheduleToID,
      workScheduleFromID: mParams.workScheduleFromID
    })
  }
  try {
    db.savepointWrap(runMethod)
    setLog(Object.assign({ msgType: '0', description: UB.i18n('Зaвершено') }, logParams))
  } catch (error) {
    setLog(Object.assign({ msgType: '1', description: error }, logParams))
    mParams.msgType = 1
  }
}

me.updateFundBalance = ctx => {
  const mParams = ctx.mParams
  const period = periodService.getCurrentPeriod(mParams.orgID)
  const store = UB.DataStore('hr_accrualBalance')
  if (period) {
    const delFundSourceList = UB.Repository('ac_fundSource')
      .attrs(['ID', 'mi_deleteDate'])
      .where('mi_deleteDate', '<', '#maxdate')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()

    const accrualBalanceFund = UB.Repository('hr_accrualBalance')
      .attrs(['employeeNumberID', 'dictFundSourceID', 'SUM([sumTo])'])
      .where('periodCalcID', '=', period.priorPeriodID)
      .whereIf(mParams.allFundSource, 'dictFundSourceID', '!=', mParams.dictFundSourceIDTo, 'fundall')
      .whereIf(mParams.nullFundSource || mParams.allFundSource, 'dictFundSourceID', 'isNull', undefined, 'fundnull')
      .whereIf(mParams.dictFundSourceIDFrom, 'dictFundSourceID', '=', mParams.dictFundSourceIDFrom)
      .whereIf(mParams.delFundSource, 'dictFundSourceID', 'in', delFundSourceList.length ? delFundSourceList : [0])
      .whereIf(mParams.tabNumsFundSource, 'employeeNumberID', 'in', mParams.tabNumsFundSource.split(','))
      .logic(mParams.allFundSource ? '([fundall] OR [fundnull])' : '(1=1)')
      .groupBy(['employeeNumberID', 'dictFundSourceID'])
      .selectAsObject({
        'SUM([sumTo])': 'sumTo'
      })
    const accrualBalance = UB.Repository('hr_accrualBalance')
      .attrs(['employeeNumberID', 'SUM([sumTo])'])
      .where('periodCalcID', '=', period.priorPeriodID)
      .whereIf(mParams.allFundSource, 'dictFundSourceID', '!=', mParams.dictFundSourceIDTo, 'fundall')
      .whereIf(mParams.nullFundSource || mParams.allFundSource, 'dictFundSourceID', 'isNull', undefined, 'fundnull')
      .whereIf(mParams.dictFundSourceIDFrom, 'dictFundSourceID', '=', mParams.dictFundSourceIDFrom)
      .whereIf(mParams.delFundSource, 'dictFundSourceID', 'in', delFundSourceList.length ? delFundSourceList : [0])
      .whereIf(mParams.tabNumsFundSource, 'employeeNumberID', 'in', mParams.tabNumsFundSource.split(','))
      .logic(mParams.allFundSource ? '([fundall] OR [fundnull])' : '(1=1)')
      .groupBy(['employeeNumberID'])
      .selectAsObject({
        'SUM([sumTo])': 'sumTo'
      })
    accrualBalanceFund.forEach(row => {
      if (row.sumTo && row.sumTo !== 0) {
        store.run('insert', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            employeeNumberID: row.employeeNumberID,
            periodCalcID: period.priorPeriodID,
            dictFundSourceID: row.dictFundSourceID,
            sumFrom: 0,
            sumPlus: 0,
            sumMinus: 0,
            sumPay: 0,
            sumTo: -1 * row.sumTo,
            isImport: 0,
            isCorrection: 1
          }
        })
      }
    })
    accrualBalance.forEach(row => {
      if (row.sumTo && row.sumTo !== 0) {
        store.run('insert', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            employeeNumberID: row.employeeNumberID,
            periodCalcID: period.priorPeriodID,
            dictFundSourceID: mParams.dictFundSourceIDTo,
            sumFrom: 0,
            sumPlus: 0,
            sumMinus: 0,
            sumPay: 0,
            sumTo: row.sumTo,
            isImport: 0,
            isCorrection: 1
          }
        })
      }
    })
    calcService.addCalcQueue({ orgID: mParams.orgID, calcBalance: 1, description: `Calc Balance` })
  }
}

me.deleteFundBalance = ctx => {
  const mParams = ctx.mParams
  const period = periodService.getCurrentPeriod(mParams.orgID)
  if (period) {
    UB.DataStore(__entityName).execSQL(` DELETE FROM hr_accrualBalance where periodCalcID = :periodCalcID: AND isCorrection = 1`, {
      periodCalcID: period.priorPeriodID
    })
    calcService.addCalcQueue({ orgID: mParams.orgID, calcBalance: 1, description: `Calc Balance` })
  }
}

me.deleteDepartment = ctx => {
  const mParams = ctx.mParams
  const onDate = mParams.depDateFrom ? dateService.shiftDate(mParams.depDateFrom) : dateService.minDate()
  const store = UB.DataStore('hr_department')
  const depStore = UB.DataStore('org_department')
  store.runSQL(` SELECT d.* from hr_department d
    --join hr_importMap m on m.outputID = d.mi_data_id and m.entityName = 'hr_department'
  where d.orgID = :orgID: and d.mi_deleteDate>='9999-12-31' and d.mi_createDate >= :onDate: -- and m.ID is not null 
    `, {
    orgID: mParams.orgID,
    onDate
  })
  const departments = store.getAsJsObject()

  departments.forEach(dep => {
    if (!UB.Repository('hr_staffUnit').attrs(['ID']).where('parentUnitID', '=', dep.mi_data_id).where('orgID', '=', mParams.orgID).selectSingle()) {
      store.execSQL(`update hr_staffUnit SET mi_deleteDate = '2021-06-01', mi_deleteUser = 10 where ID = :ID:`, { ID: dep.ID })
      store.execSQL(`update hr_department SET mi_deleteDate = '2021-06-01', mi_deleteUser = 10 where ID = :ID:`, { ID: dep.ID })
      if (UB.Repository('org_department')
        .attrs(['ID'])
        .where('ID', '=', dep.mi_data_id)
        .where('mi_createDate', '>=', onDate)
        .selectSingle()) {
        depStore.run('delete', { execParams: { ID: dep.mi_data_id } })
      }
    }
  })
}

me.createPayAccrual = ctx => {
  const mParams = ctx.mParams
  const currentPeriod = periodService.getCurrentPeriod(mParams.orgID)
  const priorPeriod = periodService.getPeriod(currentPeriod.priorPeriodID)
  const minDate = dateService.minDate()
  const cont = {
    payEl: payElService.getPayEl({ orgID: mParams.orgID })
  }
  cont.periods = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'name', 'isClosed', 'isCurrent', 'isBlock', 'priorPeriodID', 'nextPeriodID'])
    .where('orgID', '=', mParams.orgID)
    .orderBy('dateFrom')
    .selectAsObject()
  cont.periods.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const store = UB.DataStore('hr_accrual')
  const accrualStore = UB.DataStore('hr_accrual')
  const accrualDtStore = UB.DataStore('hr_accrualDt')
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', mParams.orgID)
    .selectAsObject()

  store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID in (SELECT ID FROM hr_accrual WHERE orgID = :orgID: AND payElID = :payElID: AND flagsRec & 8 = 8 )`,
    { orgID: mParams.orgID, periodCalcID: priorPeriod.ID, payElID: mParams.payElID })
  store.execSQL(`DELETE FROM hr_accrual WHERE orgID = :orgID: AND payElID = :payElID: AND flagsRec & 65544 = 65544`,
    { orgID: mParams.orgID, periodCalcID: priorPeriod.ID, payElID: mParams.payElID })

  employeeNumbers.forEach(employeeNumber => {
    const accruals = accrualService.getAccrual(mParams.orgID, employeeNumber.ID, minDate, null, priorPeriod.dateTo)
    const recalcPeriod = accruals.reduce((per, accr) => {
      if (!per.includes(accr.periodCalcID)) {
        per.push(accr.periodCalcID)
      }
      return per
    }, [])
    recalcPeriod.forEach(periodID => {
      const period = cont.periods.find(o => o.ID === periodID)
      let paySum = 0
      const accrualDt = []
      accruals.forEach(accr => {
        if (accr.paySum !== 0 && !(accr.flagsRec & 1 << 12) && (accr.periodCalcID === periodID)) {
          if (!accr.accrualDt) { accr.accrualDt = [] }
          if (!accr.accrualDt.length) {
            accr.accrualDt.push({
              paySum: accr.paySum,
              dictFundSourceID: null
            })
          } else {
            let sumDt = 0
            accr.accrualDt.forEach(accrDt => {
              sumDt = accrualService.round(sumDt + accrDt.paySum)
            })
            if (sumDt !== accr.paySum) {
              accr.accrualDt[0].paySum = accrualService.round(accr.accrualDt[0].paySum + accr.paySum - sumDt)
            }
          }
          paySum = accrualService.round(paySum + ((cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? 1 : -1) * (accr.paySum || 0)))
          accr.accrualDt.forEach(accrDt => {
            const accDt = accrualDt.find(o => o.dictFundSourceID === (accrDt.dictFundSourceID || null))
            if (accDt) {
              accDt.paySum = accrualService.round(accDt.paySum + ((cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? 1 : -1) * (accrDt.paySum || 0)))
            } else {
              accrualDt.push({
                paySum: ((cont.payEl[accr.payElID].method.groupType === 'PAYMENT' ? 1 : -1) * accrDt.paySum),
                dictFundSourceID: accrDt.dictFundSourceID || null
              })
            }
          })
        }
      })
      if (paySum > 0) {
        const accrual = {
          ID: accrualService.getID('S_HR_ACCRUAL'),
          orgID: mParams.orgID,
          periodCalcID: period.ID,
          periodSalaryID: period.ID,
          periodCalc: period.dateFrom,
          periodSalary: period.dateFrom,
          employeeNumberID: employeeNumber.ID,
          payElID: mParams.payElID,
          flagsRec: 65544,
          flagsFix: 0,
          mask: 0,
          maskAdd: 0,
          paySum,
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          calculateDate: new Date(),
          isAvg: 0
        }
        accrualStore.run('insert', {
          __skipOptimisticLock: true,
          __skipSelectAfterInsert: true,
          __skipRls: true,
          __skipAclRls: true,
          execParams: accrual
        })
        accrualDt.forEach(accrDt => {
          accrDt.accrualID = accrual.ID
          accrDt.ID = accrualService.getID('S_HR_ACCRUALDT')
          accrualDtStore.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: accrDt
          })
        })
      }
    })
  })
}
me.loadCertification = ctx => {
  const argv = require('@unitybase/base').argv
  const path = require('path')
  const configDir = process.configPath
  const appConfigs = argv.getServerConfiguration()
  const accModel = 'HR'

  const model = appConfigs.application.domain.models.find(o => o.name === accModel)
  const initDataScriptPath = path.join(configDir, model.path, '_migration')

  const csvChartAccData = getArrayFromCsv(path.join(initDataScriptPath, 'certification.csv'), ';')
  const errorMessages = []
  let dictDocKindID = UB.Repository('ac_dictDocKind').attrs(['ID']).where('name', '=', 'Сертифікат').selectScalar()
  const empCertificationAccStore = UB.DataStore('hr_empCertificationAcc')
  const employeeDocsStore = UB.DataStore('hr_employeeDocs')
  if (!dictDocKindID) {
    const dictDocKindStore = UB.DataStore('ac_dictDocKind')
    dictDocKindID = dictDocKindStore.generateID()
    dictDocKindStore.run('insert', {
      execParams: {
        ID: dictDocKindID,
        code: '27',
        name: 'Сертифікат'
      }
    })
  }
  csvChartAccData.forEach((row, idx) => {
    if (idx > 0 && row[12]) {
      const employeeID = UB.Repository('hr_employee').attrs(['ID']).where('taxCode', '=', String(row[0])).selectScalar()
      if (employeeID) {
        const certificationDate = row[10] ? dateService.shiftDate(new Date(row[10].substr(6, 4), row[10].substr(3, 2) - 1, row[10].substr(0, 2))) : null
        const validityDate = row[11] ? dateService.shiftDate(new Date(row[11].substr(6, 4), row[11].substr(3, 2) - 1, row[11].substr(0, 2))) : null
        const docNumber = String(row[12])
        const empCertificationAcc = UB.Repository('hr_empCertificationAcc')
          .attrs(['*'])
          .where('employeeID', '=', employeeID)
          .where('certificationDate', '=', certificationDate)
          // .where('dictDocKindID', '=', dictDocKindID)
          .selectSingle()
        const dictEmpCategory = UB.Repository('hr_dictEmpCategory').attrs(['*']).selectAsObject()
        const specialty = UB.Repository('hr_specialty').attrs(['*']).selectAsObject()

        let employeeDocID = empCertificationAcc ? empCertificationAcc.employeeDocID : null
        if (!empCertificationAcc || !empCertificationAcc.employeeDocID) {
          employeeDocID = employeeDocsStore.generateID()
          employeeDocsStore.run('insert', {
            execParams: {
              ID: employeeDocID,
              employeeID: employeeID,
              dictDocKindID: dictDocKindID,
              docNumber: docNumber,
              docIssuedDate: certificationDate
            }
          })
        } else if (empCertificationAcc.employeeDocID) {
          employeeDocsStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: empCertificationAcc.employeeDocID,
              dictDocKindID: dictDocKindID,
              docNumber: docNumber,
              docIssuedDate: certificationDate
            }
          })
        }
        if (!specialty.find(o => o.name.toLowerCase() === String(row[6]).toLowerCase())) {
          throw new UB.UBAbort(`<<<Не знайдено ІНН<br>${errorMessages.join('<br>')}>>>`)
        }

        if (empCertificationAcc) {
          empCertificationAccStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: empCertificationAcc.ID,
              employeeID: employeeID,
              dictEmpCategoryID: dictEmpCategory.find(o => o.name.toLowerCase() === String(row[4]).toLowerCase()).ID,
              typeCertification: String(row[5]) === 'підтверджена' ? 'CONFIRM' : String(row[5]) === 'подовжена' ? 'PROLONG' : 'ASSIGN',
              dictSpecialtyID: specialty.find(o => o.name.toLowerCase() === String(row[6]).toLowerCase()).ID,
              certificationDate,
              validityDate,
              orderNumber: String(row[7]),
              orderDate: row[8] ? dateService.shiftDate(new Date(row[8].substr(6, 4), row[8].substr(3, 2) - 1, row[8].substr(0, 2))) : null,
              orderAuthor: String(row[9]),
              employeeDocID: employeeDocID,
              dictDocKindID: dictDocKindID,
              docNumber: docNumber,
              dateIssue: certificationDate
            }
          })
        } else {
          empCertificationAccStore.run('insert', {
            __skipOptimisticLock: true,
            execParams: {
              employeeID: employeeID,
              dictEmpCategoryID: dictEmpCategory.find(o => o.name.toLowerCase() === String(row[4]).toLowerCase()).ID,
              typeCertification: String(row[5]) === 'підтверджена' ? 'CONFIRM' : String(row[5]) === 'подовжена' ? 'PROLONG' : 'ASSIGN',
              dictSpecialtyID: specialty.find(o => o.name.toLowerCase() === String(row[6]).toLowerCase()).ID,
              certificationDate,
              validityDate,
              orderNumber: String(row[7]),
              orderDate: row[8] ? dateService.shiftDate(new Date(row[8].substr(6, 4), row[8].substr(3, 2) - 1, row[8].substr(0, 2))) : null,
              orderAuthor: String(row[9]),
              employeeDocID: employeeDocID,
              dictDocKindID: dictDocKindID,
              docNumber: docNumber,
              dateIssue: certificationDate
            }
          })
        }
      } else {
        errorMessages.push(row[0])
      }
    }
  })
}

function getArrayFromCsv (fileName, delimiter = ';') {
  const csv = require('@unitybase/base').csv
  const fs = require('fs')

  let fContent = fs.readFileSync(fileName, 'utf8')

  if (!fContent) {
    throw new Error(`File ${fileName} is empty or not exist`)
  }

  return csv.parse(fContent.trim(), delimiter)
}

me.fillEmployeePositionTariff = ctx => {
  const mParams = ctx.mParams
  const orgID = mParams.orgID || 0
  const onDate = mParams.onDate || dateService.currentDate()
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('hr_employeePosition')

  store.runSQL(`SELECT A01.ID,
    (select ${sqlDialect.top} pos.dictTarifCoeffID from hr_position pos where pos.mi_data_id = A01.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) AS posDictTarifCoeffID
    FROM hr_employeePosition A01  
    WHERE organizationID = :orgID: AND :onDate: BETWEEN A01.dateFrom AND A01.dateTo AND A01.positionID IS NOT NULL AND A01.dictTarifCoeffID IS NULL AND A01.mi_deleteDate>='9999-12-31' 
  `, {
    onDate,
    orgID
  })
  const empData = store.getAsJsObject()
  empData.forEach(item => {
    if (item['posDictTarifCoeffID']) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          dictTarifCoeffID: item['posDictTarifCoeffID']
        }
      })
    }
  })
}

me.fillEmployeePositionAccrual = ctx => {
  const mParams = ctx.mParams
  const orgID = mParams.orgID || 0
  const onDate = mParams.onDate || dateService.currentDate()
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('hr_employeePosition')

  store.runSQL(`SELECT A01.ID,
    (select ${sqlDialect.top} pos.accrualSum from hr_position pos where pos.mi_data_id = A01.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) AS posAccrualSum
    FROM hr_employeePosition A01  
    WHERE organizationID = :orgID: AND :onDate: BETWEEN A01.dateFrom AND A01.dateTo AND A01.positionID IS NOT NULL AND A01.contractType != '3'
      AND (A01.accrualSum IS NULL OR A01.accrualSum = 0) AND A01.mi_deleteDate>='9999-12-31' 
  `, {
    onDate,
    orgID
  })
  const empData = store.getAsJsObject()
  empData.forEach(item => {
    if (item['posAccrualSum']) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          accrualSum: item['posAccrualSum']
        }
      })
    }
  })
}

me.setEmployeeNameCases = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID || 0

  const store = UB.DataStore('hr_employee')

  const rules = nameCaseService.loadRules()
  const caseNameList = ['genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName']

  const employeeList = UB.Repository('hr_employee')
    .attrs(['ID', 'firstName', 'lastName', 'middleName', 'sexType', 'genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName'])
    .exists(UB.Repository('ac_employeeOrg')
      .correlation('employeeID', 'ID')
      .where('organizationID', '=', orgID || 0))
    .selectAsObject()
  let gender
  let isUpdate
  employeeList.forEach(emp => {
    gender = emp.sexType === 'W' ? 'female' : emp.sexType === 'M' ? 'male' : null
    const nc = nameCaseService.getNameCase((emp.lastName || '').trim(), (emp.firstName || '').trim(), (emp.middleName || '').trim(), gender, rules)
    isUpdate = false
    const newEmp = {
      ID: emp.ID
    }
    caseNameList.forEach(caseName => {
      if (!emp[caseName]) {
        const value = (nc.getSurName(caseName) + ' ' + nc.getName(caseName) + ' ' + nc.getLastName(caseName)).trim()
        if (value) {
          isUpdate = true
          newEmp[caseName] = value
        }
      }
    })
    if (isUpdate) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: newEmp
      })
    }
  })
}

me.clearEmployeeNameCases = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID || 0
  const store = UB.DataStore('hr_employee')

  const employeeList = UB.Repository('hr_employee')
    .attrs(['ID'])
    .exists(UB.Repository('ac_employeeOrg')
      .correlation('employeeID', 'ID')
      .where('organizationID', '=', orgID || 0))
    .selectAsObject()
  employeeList.forEach(emp => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: emp.ID,
        genName: null,
        datName: null,
        accusativeName: null,
        insName: null,
        locName: null,
        vocName: null
      }
    })
  })
}

me.updateEntityDescription = function (ctx) {
  const mParams = ctx.mParams
  const entityName = mParams.entityName
  if (!entityName) return
  const whereList = mParams.whereList
  const store = UB.DataStore(entityName)
  const itemsQuery = UB.Repository(entityName)
    .attrs(['ID'])
  _.forEach(whereList, clause => {
    itemsQuery.where(clause.expression, clause.condition, clause.value)
  })
  const items = itemsQuery.selectAsObject()
  items.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      isImport: true,
      execParams: {
        ID: row.ID,
        description: null
      }
    })
  })
}
me.createAccrualDt = function (ctx) {
  const coa = glCore.getCOA()
  const mParams = ctx.mParams
  const onDate = dateService.todayDate()
  const logParams = {
    orgID: mParams.orgID,
    entityName: mParams.method
  }
  const mainPeriod = mParams.periodID ? periodService.getPeriod(mParams.periodID) : null
  const mainCurrentPeriod = periodService.getCurrentPeriod(mParams.orgID) || {}
  const description = `${UB.i18n('Запуск')} ${mainPeriod ? `за ${mainPeriod.name} ` : `за всі періоди до ${mainCurrentPeriod.name} `}${
    mParams.allPayEl ? 'для всіх записів розрахункового листа ' : ''}${
    mParams.payElName ? `${mParams.payElName} ` : ''}${
    mParams.allPayFund ? `для всіх записів нарахування на заробітну плату ` : ''}${
    mParams.payFundName ? `${mParams.payFundName} ` : ''}`
  setLog(Object.assign({ msgType: '0', targetOrgID: mParams.orgID, description }, logParams), true)
  const store = UB.DataStore('hr_accrual')
  const storeAccrualDt = UB.DataStore('hr_accrualDt')
  const storeAccrualFundDt = UB.DataStore('hr_accrualFundDt')
  const payEl = payElService.getPayEl({ orgID: mParams.orgID })
  const orgIDs = mParams.childOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]

  const d0 = (coa && coa.dims['org_department']) ? coa.dims['org_department'].ID : null
  orgIDs.forEach(orgID => {
    setLog(Object.assign({ msgType: '0', targetOrgID: orgID, description: `${UB.i18n('Початок формування')}` }, logParams))
    const currentPeriod = periodService.getCurrentPeriod(orgID)
    const period = mainPeriod ? periodService.getPeriodOnDate(orgID, mainPeriod.dateFrom) : null
    let isRun = true
    if (mainPeriod && !period) {
      setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: `Період ${mainPeriod.name} не знайдено! Формування для організації припинено!` }, logParams))
    }
    if (isRun && mainPeriod && period && !period.isClosed) {
      setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: `Період ${mainPeriod.name} ще не закритий! Формування для організації припинено!` }, logParams))
    }

    const runMethod = () => {
      if (mParams.allPayEl || mParams.payElID) {
        store.runSQL(`select a.ID AS "ID", a.paySum AS "paySum", COALESCE((SELECT sum(aDt.paySum) FROM hr_accrualDt aDt WHERE aDt.accrualID = a.ID),0) AS "paySumDt",
                a.dateFrom AS "dateFrom", a.dateTo AS "dateTo", a.employeeNumberID AS "employeeNumberID", a.payElID AS "payElID" 
                FROM  hr_accrual a
                where a.orgID = :orgID: 
                ${period ? 'AND a.periodCalcID = :periodID:' : ''}
                ${mParams.payElID ? 'AND a.payElID = :payElID:' : ''}
                and a.flagsRec & 4096 = 0 and a.flagsRec & 8192 = 0
                and a.periodCalc < :dateFrom:
                and a.paySum <> COALESCE((SELECT sum(aDt.paySum) FROM hr_accrualDt aDt WHERE aDt.accrualID = a.ID),0)
                
  `, { orgID, periodID: period ? period.ID : null, dateFrom: currentPeriod.dateFrom, payElID: mParams.payElID })
        const accruals = store.getAsJsObject()
        accruals.forEach(acc => {
          if (acc.paySum === 0 && acc.paySumDt !== 0) {
            store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID = :accrualID: AND paySum <> 0`,
              { accrualID: acc.ID })
          } else {
            const pos = UB.Repository('hr_employeePosition')
              .attrs(['dictFundSourceID', 'departmentID'])
              .where('[employeeNumberID]', '=', acc.employeeNumberID)
              .where('[dateFrom]', '<=', dateService.shiftDate(acc.dateTo))
              .where('[dateTo]', '>=', dateService.shiftDate(acc.dateFrom)).limit(1)
              .selectSingle() || {}
            const execParams = {
              ID: accrualService.getID('S_HR_ACCRUALDT'),
              accrualID: acc.ID,
              paySum: accrualService.round(acc.paySum - acc.paySumDt),
              departmentID: (mParams.depFromPos ? pos.departmentID : null) || null,
              dictFundSourceID: (mParams.fsFromPay ? payEl[acc.payElID].dictFundSourceID : null) || (mParams.fsFromPos ? pos.dictFundSourceID : null) || null
            }
            if (mParams.depFromPos && execParams.departmentID && d0) {
              execParams.d0 = d0
              execParams.d0Value = execParams.departmentID
            }

            storeAccrualDt.run('insert', {
              __skipOptimisticLock: true,
              __skipSelectAfterInsert: true,
              __skipRls: true,
              __skipAclRls: true,
              execParams
            })
          }
        })

        store.runSQL(`select aDt.ID AS "ID", aDt.d0 "d0", aDt.d0Value "d0Value", aDt.departmentID "departmentID", aDt.dictFundSourceID "dictFundSourceID",
          a.dateFrom AS "dateFrom", a.dateTo AS "dateTo", a.employeeNumberID AS "employeeNumberID", a.payElID AS "payElID", aDt.accrualID "accrualID" 
            FROM hr_accrual a  
              JOIN hr_accrualDt aDt ON a.ID = aDt.accrualID
                where a.orgID = :orgID: 
                ${period ? 'AND a.periodCalcID = :periodID:' : ''}
                ${mParams.payElID ? 'AND a.payElID = :payElID:' : ''}
                AND a.paySum <> 0 and a.flagsRec & 4096 = 0 and a.flagsRec & 8192 = 0
                and a.periodCalc < :dateFrom:
                ORDER BY aDt.accrualID
                `,
        { orgID, periodID: period ? period.ID : null, dateFrom: currentPeriod.dateFrom, payElID: mParams.payElID })
        const accrualDts = store.getAsJsObject()
        accrualDts.forEach(acc => {
          if (((mParams.fsFromPay || mParams.fsFromPos) && (!mParams.exDt || !acc.dictFundSourceID)) || (mParams.depFromPos && (!mParams.exDt || !acc.departmentID))) {
            const pos = ((mParams.fsFromPos && !acc.dictFundSourceID) || (mParams.depFromPos && !acc.departmentID)) ? (UB.Repository('hr_employeePosition')
              .attrs(['dictFundSourceID', 'departmentID'])
              .where('[employeeNumberID]', '=', acc.employeeNumberID)
              .where('[dateFrom]', '<=', dateService.shiftDate(acc.dateTo))
              .where('[dateTo]', '>=', dateService.shiftDate(acc.dateFrom)).limit(1)
              .selectSingle() || {}) : {}
            const execParams = {
              ID: acc.ID
            }
            if (!mParams.exDt || !acc.dictFundSourceID) {
              execParams.dictFundSourceID = (mParams.fsFromPay ? payEl[acc.payElID].dictFundSourceID : null) || (mParams.fsFromPos ? pos.dictFundSourceID : null) || null
            }
            if (!mParams.exDt || !acc.departmentID) {
              execParams.departmentID = (mParams.depFromPos ? pos.departmentID : null) || null
              if (mParams.depFromPos && execParams.departmentID && d0 && !acc.d0) {
                execParams.d0 = d0
                execParams.d0Value = execParams.departmentID
              }
            }
            if (Object.keys(execParams).length > 1) {
              storeAccrualDt.run('update', {
                __skipOptimisticLock: true,
                __skipSelectAfterInsert: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams
              })
            }
          }
        })
      }
      if (mParams.allPayFund || mParams.payFundID) {
        store.runSQL(`select a.ID AS "ID", a.paySum AS "paySum", COALESCE((SELECT sum(aDt.paySum) FROM hr_accrualFundDt aDt WHERE aDt.accrualFundID = a.ID), 0) AS "paySumDt",
                p.dateFrom AS "dateFrom", p.dateTo AS "dateTo", a.employeeNumberID AS "employeeNumberID" 
                FROM  hr_accrualFund a
                join hr_dictPeriod p ON p.ID = a.periodCalcID 
                where a.orgID = :orgID: 
                ${period ? 'AND a.periodCalcID = :periodID:' : ''}
                ${mParams.payFundID ? 'AND a.payFundID = :payFundID:' : ''}
                AND p.dateFrom < :dateFrom:
                and a.paySum <> COALESCE((SELECT sum(aDt.paySum) FROM hr_accrualFundDt aDt WHERE aDt.accrualFundID = a.ID), 0)                
  `, { orgID, periodID: period ? period.ID : null, dateFrom: currentPeriod.dateFrom, payFundID: mParams.payFundID })
        const accrualFounds = store.getAsJsObject()
        accrualFounds.forEach(acc => {
          if (acc.paySum === 0 && acc.paySumDt !== 0) {
            store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID = :accrualFundID: AND paySum <> 0`,
              { accrualFundID: acc.ID })
          } else {
            const pos = UB.Repository('hr_employeePosition')
              .attrs(['dictFundSourceID', 'departmentID'])
              .where('[employeeNumberID]', '=', acc.employeeNumberID)
              .where('[dateFrom]', '<=', dateService.shiftDate(acc.dateTo))
              .where('[dateTo]', '>=', dateService.shiftDate(acc.dateFrom)).limit(1)
              .selectSingle() || {}

            const execParams = {
              ID: accrualService.getID('S_HR_ACCRUALFUNDDT'),
              accrualFundID: acc.ID,
              paySum: accrualService.round(acc.paySum - acc.paySumDt),
              departmentID: (mParams.depFromPos ? pos.departmentID : null) || null,
              dictFundSourceID: (mParams.fsFromPos ? pos.dictFundSourceID : null) || null
            }
            if (mParams.depFromPos && execParams.departmentID && d0) {
              execParams.d0 = d0
              execParams.d0Value = execParams.departmentID
            }

            storeAccrualFundDt.run('insert', {
              __skipOptimisticLock: true,
              __skipSelectAfterInsert: true,
              __skipRls: true,
              __skipAclRls: true,
              execParams
            })
          }
        })

        store.runSQL(`select aDt.ID AS "ID", aDt.d0 "d0", aDt.d0Value "d0Value", aDt.departmentID "departmentID", aDt.dictFundSourceID "dictFundSourceID",
          a.periodSalary AS "dateFrom", a.employeeNumberID AS "employeeNumberID"
            FROM hr_accrualFund a  
              JOIN hr_accrualFundDt aDt ON a.ID = aDt.accrualFundID
                where a.orgID = :orgID: 
                ${period ? 'AND a.periodCalcID = :periodID:' : ''}
                ${mParams.payFundID ? 'AND a.payFundID = :payFundID:' : ''}
                 AND a.paySum <> 0 AND a.periodCalc < :dateFrom:
                `,
        { orgID, periodID: period ? period.ID : null, dateFrom: currentPeriod.dateFrom, payFundID: mParams.payFundID })
        const accrualDts = store.getAsJsObject()
        accrualDts.forEach(acc => {
          if (((mParams.fsFromPay || mParams.fsFromPos) && (!mParams.exDt || !acc.dictFundSourceID)) || (mParams.depFromPos && (!mParams.exDt || !acc.departmentID))) {
            const pos = ((mParams.fsFromPos && !acc.dictFundSourceID) || (mParams.depFromPos && !acc.departmentID)) ? (UB.Repository('hr_employeePosition')
              .attrs(['dictFundSourceID', 'departmentID'])
              .where('[employeeNumberID]', '=', acc.employeeNumberID)
              .where('[dateFrom]', '<=', dateService.lastDayOfMonth(dateService.shiftDate(acc.dateFrom)))
              .where('[dateTo]', '>=', dateService.shiftDate(acc.dateFrom)).limit(1)
              .selectSingle() || {}) : {}
            const execParams = {
              ID: acc.ID
            }
            if (!mParams.exDt || !acc.dictFundSourceID) {
              execParams.dictFundSourceID = (mParams.fsFromPos ? pos.dictFundSourceID : null) || null
            }
            if (!mParams.exDt || !acc.departmentID) {
              execParams.departmentID = (mParams.depFromPos ? pos.departmentID : null) || null
              if (mParams.depFromPos && execParams.departmentID && d0 && !acc.d0) {
                execParams.d0 = d0
                execParams.d0Value = execParams.departmentID
              }
            }
            if (Object.keys(execParams).length > 1) {
              storeAccrualFundDt.run('update', {
                __skipOptimisticLock: true,
                __skipSelectAfterInsert: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams
              })
            }
          }
        })
      }
    }
    if (isRun) {
      try {
        db.savepointWrap(runMethod)
        setLog(Object.assign({ msgType: '0', targetOrgID: orgID, description: UB.i18n('Зaвершено') }, logParams))
      } catch (error) {
        setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: error }, logParams))
        mParams.msgType = 1
      }
    }
  })
}

me.fillEmpPosData = function (ctx) {
  const coa = glCore.getCOA()
  const mParams = ctx.mParams
  const orgID = mParams.orgID || 0
  const onDate = mParams.onDate || dateService.currentDate()
  const source = mParams.source
  const attrs = mParams.attrs || []
  const fullUpdate = mParams.fullUpdate

  let dimID

  if (attrs.includes('dictCostTypeID')) {
    if (coa && coa.dims['ac_dictCostType']) {
      dimID = coa.dims['ac_dictCostType'].ID
    }
  }

  const dimAttrs = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']
  const dimValueAttrs = ['d0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value']

  if (source === 'position') {
    const store = UB.DataStore('hr_employeePosition')
    const fieldList = ['mi_data_id'].concat(attrs)
    const posData = UB.Repository('hr_position')
      .attrs(fieldList)
      .where('orgID', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateTo', '>=', '#maxdate')
      .misc({
        __mip_recordhistory_all: true
      })
      .groupBy(fieldList)
      .selectAsObject()
    posData.forEach(pos => {
      const empData = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'd0', 'd0Value', 'd1', 'd1Value', 'd2', 'd2Value', 'd3', 'd3Value', 'd4', 'd4Value', 'd5', 'd5Value',
          'd6', 'd6Value', 'd7', 'd7Value', 'd8', 'd8Value', 'd9', 'd9Value'].concat(attrs))
        .where('positionID', '=', pos['mi_data_id'])
        .where('organizationID', '=', orgID)
        .where('dateTo', '>=', '#maxdate')
        .selectAsObject()
      empData.forEach(emp => {
        const execParams = {
          ID: emp.ID
        }
        let isUpdate = false
        attrs.forEach(attr => {
          if (attr === 'dictCostTypeID' && dimID) {
            const idx = dimAttrs.findIndex(o => emp[o] === dimID)
            if (idx >= 0) {
              if (fullUpdate || !emp[dimValueAttrs[idx]]) {
                execParams[dimValueAttrs[idx]] = pos[attr]
                isUpdate = true
              }
            } else {
              for (let i in dimAttrs) {
                if (!emp[dimAttrs[i]]) {
                  execParams[dimAttrs[i]] = dimID
                  execParams[dimValueAttrs[i]] = pos[attr]
                  isUpdate = true
                  break
                }
              }
            }
          } else {
            if (fullUpdate || !emp[attr]) {
              execParams[attr] = pos[attr]
              isUpdate = true
            }
          }
        })
        if (isUpdate) {
          store.run('update', {
            __skipOptimisticLock: true,
            execParams
          })
        }
      })
    })
  }
  if (source === 'employee') {
    const store = UB.DataStore('hr_position')
    const fieldList = ['positionID'].concat(attrs)
    const empData = UB.Repository('hr_employeePositionS')
      .attrs(fieldList)
      .where('organizationID', '=', orgID)
      .where('positionID', 'isNotNull')
      .where('dateTo', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
      .selectAsObject()
    empData.forEach(emp => {
      const posData = UB.Repository('hr_position')
        .attrs(['ID'].concat(attrs))
        .where('mi_data_id', '=', emp['positionID'])
        .where('state', '=', 'ACTIVE')
        .where('mi_dateTo', '>=', '#maxdate')
        .misc({
          __mip_recordhistory_all: true
        })
        .selectAsObject()
      posData.forEach(pos => {
        const execParams = {
          ID: pos.ID
        }
        let isUpdate = false
        attrs.forEach(attr => {
          if (fullUpdate || !pos[attr]) {
            execParams[attr] = emp[attr]
            isUpdate = true
          }
        })
        if (isUpdate) {
          store.run('update', {
            __skipOptimisticLock: true,
            execParams
          })
        }
      })
    })
  }
}

function updateDictPeriodOrg (orgID, dateFrom) {
  const currentPeriod = UB.Repository('hr_dictPeriod')
    .attrs(['dateFrom'])
    .where('orgID', '=', orgID)
    .where('isCurrent', '=', 1)
    .selectSingle()
  if (currentPeriod) {
    currentPeriod.dateFrom = dateService.shiftDate(currentPeriod.dateFrom)
  }

  if (!currentPeriod || !currentPeriod.dateFrom || currentPeriod.dateFrom !== dateFrom) {
    const store = UB.DataStore('hr_dictPeriod')
    const closed = UB.i18n('закритий')
    store.execSQL(`UPDATE hr_dictPeriod SET isCurrent = 0, isClosed = 1, description = concat(name, ' (${closed})') WHERE orgID = :orgID: and dateFrom <= :dateFrom: and mi_deleteDate >= '9999-12-31'`, {
      orgID,
      dateFrom
    })
    store.execSQL(`UPDATE hr_dictPeriod SET isCurrent = 0, isClosed = 0, description = name WHERE orgID = :orgID: and dateFrom >= :dateFrom: and mi_deleteDate >= '9999-12-31'`, {
      orgID,
      dateFrom
    })
    const current = UB.i18n('поточний')
    store.execSQL(`UPDATE hr_dictPeriod SET isCurrent = 1, isClosed = 0, description = concat(name, ' (${current})') WHERE orgID = :orgID: and dateFrom = :dateFrom: and mi_deleteDate >= '9999-12-31'`, {
      orgID,
      dateFrom
    })
  }

  // update dictPeriod for subOrganizations
  UB.Repository('ac_organization')
    .attrs(['ID'])
    .where('parentID', '=', orgID)
    .selectAsObject()
    .filter(o => o.ID !== orgID)
    .forEach(org => {
      updateDictPeriodOrg(org.ID, dateFrom)
    })
}

me.updateDictPeriod = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  updateDictPeriodOrg(orgID, dateFrom)
}

function getSum (value, rate, basepay) {
  value = value || 0
  let res = rate ? accrualService.round((basepay || 0) * rate / 100) : (value || 0)
  return res
}

me.calcPosAccrual = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  let onDate = mParams.onDate ? dateService.shiftDate(mParams.onDate) : null
  const recalcAccrualSum = mParams.recalcAccrualSum
  const calcAccrualType = settingsService.getByCode('hrCalcSumPosAccrual', orgID)
  const roundUpTo = settingsService.getByCode('hrRoundAccrualStaffTable', orgID)
  const positions = UB.Repository('hr_position')
    .attrs(['ID', 'accrualSum', 'quantity', 'positionType', 'dictTarifCoeffID', 'paymentType', 'mi_dateFrom'])
    .where('orgID', '=', orgID)
    .whereIf(onDate, 'mi_dateFrom', '<=', onDate)
    .whereIf(onDate, 'mi_dateTo', '>=', onDate)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  const positionIDs = positions.map(o => o.ID)
  const dictTarifCoeffDet = UB.Repository('hr_dictTarifCoeffDet')
    .attrs(['dictTarifCoeffID', 'accrualSum', 'dateFrom', 'dateTo'])
    .orderBy('dictTarifCoeffID')
    .orderBy('dateFrom')
    .selectAsObject()
  dictTarifCoeffDet.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  const store = UB.DataStore('hr_positionAccrual')
  if (positionIDs.length) {
    if (calcAccrualType === 'ACCRUAL') {
      const positionData = staffService.getPlanSumByPosition({ onDate, orgID, positionIDs, dictTarifCoeffDet })
      positionData.forEach(position => {
        position.payEl.forEach(accrual => {
          store.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
            ID: accrual.ID,
            calcSum: accrual.planSum || 0
          })
        })
      })
    } else {
      const accrData = UB.Repository('hr_positionAccrual')
        .attrs(['ID', 'positionID.accrualSum', 'accrualSum', 'accrualRate', 'calcSum', 'positionID.dictTarifCoeffID', 'payElID.methodID.code', 'positionID.mi_dateFrom'])
        .where('positionID', 'in', positionIDs)
        .selectAsObject()
      accrData.forEach(accrPosItem => {
        let calcSum = 0
        if (accrPosItem['payElID.methodID.code'] === '144') {
          const calcDate = dateService.shiftDate(accrPosItem['positionID.mi_dateFrom'])
          const dictTarifCoeff = dictTarifCoeffDet.find(o => o.dictTarifCoeffID === accrPosItem['positionID.dictTarifCoeffID'] && o.dateFrom <= calcDate && o.dateTo >= calcDate) || {}
          calcSum = getSum(accrPosItem.accrualSum, accrPosItem.accrualRate, (dictTarifCoeff.accrualSum || 0)) || 0
        } else {
          calcSum = getSum(accrPosItem.accrualSum, accrPosItem.accrualRate, accrPosItem['positionID.accrualSum']) || 0
        }
        store.execSQL(`UPDATE hr_positionAccrual SET calcSum = :calcSum: WHERE ID = :ID:`, {
          ID: accrPosItem.ID,
          calcSum
        })
      })
    }
  }
  const parentOrgID = settingsService.getByCode('hrUseReportSettingsParentOrg', orgID)
  const repParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'valuesID'])
    .where('[listParamID.code]', 'in', ['FOZP', 'FDZP', 'ZKV'])
    .where('[orgID]', '=', Number(parentOrgID || orgID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .selectAsObject()

  const accrPosData = UB.Repository('hr_positionAccrual')
    .attrs(['positionID', 'calcSum'])
    .where('positionID', 'in', positionIDs)
    .where('payElID.methodID.code', '=', '144')
    .selectAsObject()

  positions.forEach(pos => {
    if (recalcAccrualSum && pos.paymentType === 'TARIF' && pos.dictTarifCoeffID) {
      const calcDate = dateService.shiftDate(pos['mi_dateFrom'])
      const dictTarifCoeff = dictTarifCoeffDet.find(o => o.dictTarifCoeffID === pos['dictTarifCoeffID'] && o.dateFrom <= calcDate && o.dateTo >= calcDate)
      if (dictTarifCoeff) {
        const accrTarifSum = accrPosData.filter(o => o.positionID === pos.ID).reduce((sum, o) => sum + (o.calcSum || 0), 0)
        const posAccrualSum = (dictTarifCoeff.accrualSum || 0) + accrTarifSum
        store.execSQL(`UPDATE hr_position SET accrualSum = :accrualSum: WHERE ID = :ID:`, {
          ID: pos.ID,
          accrualSum: posAccrualSum
        })
      }
    }
    const funds = staffService.calculatePositionFunds(pos.ID, pos.orgID, pos.accrualSum, pos.quantity, repParams, roundUpTo)
    store.execSQL(`UPDATE hr_position SET fundBasePay = :fundBasePay:, fundAddPay = :fundAddPay:, fundOtherPay = :fundOtherPay:, fundTotal = :fundTotal: WHERE ID = :ID:`, {
      ID: pos.ID,
      fundBasePay: funds.fundBase,
      fundAddPay: funds.fundAdd,
      fundOtherPay: funds.fundOther,
      fundTotal: funds.fundAll
    })
  })
}

me.updateEmployeeDocKind = function (ctx) {
  const orgID = ctx.mParams.orgID
  const dictDocKindFromID = ctx.mParams.dictDocKindFromID
  const dictDocKindToID = ctx.mParams.dictDocKindToID
  if (orgID && dictDocKindFromID && dictDocKindToID && dictDocKindFromID !== dictDocKindToID) {
    const employeeList = UB.Repository('hr_employee')
      .attrs(['ID'])
      .exists(UB.Repository('ac_employeeOrg')
        .correlation('employeeID', 'ID')
        .where('organizationID', '=', orgID)
        .where('mi_deleteDate', '=', '#maxdate')
        .where('employeeID.mi_deleteDate', '=', '#maxdate')
      )
      .selectAsObject()
    if (employeeList.length) {
      const store = UB.DataStore('hr_employeeDocs')
      const docList = UB.Repository('hr_employeeDocs')
        .attrs(['ID'])
        .where('dictDocKindID', '=', dictDocKindFromID)
        .where('employeeID', 'in', employeeList.map(o => o.ID))
        .selectAsObject()
      docList.forEach(row => {
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: row.ID,
            dictDocKindID: dictDocKindToID
          }
        })
      })
    }
  }
}

me.updateAddPersonDescription = function (ctx) {
  const mParams = ctx.mParams
  UB.Repository('hr_employeePosition')
    .attrs(['employeeNumberID'])
    .where('organizationID', '=', mParams.orgID)
    .where('dateFrom', '<=', dateService.shiftDate(mParams.onDate))
    .where('dateTo', '>=', dateService.shiftDate(mParams.onDate))
    .selectAsObject().forEach(item => {
      employeeService.updateEmployeeAddPersonDescription(item.employeeNumberID)
    })
}

me.recalcEsv = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const mParams = ctx.mParams
  const onDate = dateService.todayDate()
  const tabNums = mParams.tabNums
  const store = UB.DataStore('hr_employeeNumber')
  const logParams = {
    orgID: mParams.orgID,
    entityName: mParams.method
  }
  const mainPeriod = mParams.periodCalcID ? periodService.getPeriod(mParams.periodCalcID) : null
  const mainCurrentPeriod = periodService.getCurrentPeriod(mParams.orgID) || {}
  const description = `${UB.i18n('Запуск')} ${mainPeriod ? `за ${mainPeriod.name} ` : `за всі періоди до ${mainCurrentPeriod.name} `}${
    mParams.tabNums ? `для табельних номерів ${mParams.tabNums}` : 'для всіх особових рахунків організації'}${
    mParams.recalcEntry ? `з переформуванням проведень ` : ''}`
  setLog(Object.assign({ msgType: '0', targetOrgID: mParams.orgID, description }, logParams), true)
  const orgIDs = mParams.childOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]

  orgIDs.forEach(orgID => {
    setLog(Object.assign({ msgType: '0', targetOrgID: orgID, description: `${UB.i18n('Початок формування')}` }, logParams))
    const runMethod = () => {
      const periods = mParams.periodCalcID ? [periodService.getPeriodOnDate(orgID, mainPeriod.dateFrom).ID]
        : UB.Repository('hr_dictPeriod').attrs(['ID'])
          .where('orgID', '=', orgID)
          .where('isClosed', '=', false)
          .selectAsObject().map(o => o.ID)
      periods.forEach(periodID => {
        const period = periodService.getPeriod(periodID)
        let isRun = true
        if (period.orgID !== orgID) {
          setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: `Період ${mainPeriod.name} не належить організації!` }, logParams))
          mParams.msgType = 1
          isRun = false
        }
        // if (!period.isClosed) {
        //   setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: `Період ${mainPeriod.name} не закритий!` }, logParams))
        //   mParams.msgType = 1
        //   isRun = false
        // }
        if (isRun) {
          let employeeNumbers
          if (tabNums) {
            store.runSQL(`SELECT en.ID AS "employeeNumberID" 
    FROM hr_employeeNumber en
    WHERE en.orgID = :orgID: and en.tabNum${entityBaseService.getInExpression('tabNums')} AND en.mi_deleteDate >= '9999-12-31'  
  `, {
              orgID: orgID,
              tabNums: tabNums.replace(/ /g, '').split(',')
            })
            employeeNumbers = store.getAsJsObject()
          } else {
            store.runSQL(` SELECT ns.ID "ID", en.ID AS "employeeNumberID", ns.mi_modifyDate "mi_modifyDate", ns.flags,
          (SELECT ${sqlDialect.top} p.workPlace from hr_employeePosition p where p.employeeNumberID = en.ID and p.isActive = 1 AND p.dateFrom <= :dateTo: AND p.dateTo >= :dateFrom: 
           AND p.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) workPlace
                   FROM hr_employeeNumber en
                   LEFT JOIN hr_employeeNumState ns ON en.ID = ns.employeeNumberID
                   WHERE en.orgID = :orgID: AND ((en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom:)
                   ${period.priorPeriodID ? ` OR (EXISTS (select 1 from hr_accrualBalance b where b.employeeNumberID = en.ID and b.periodCalcID = :priorPeriodID: and b.sumTo <> 0))
                   OR (EXISTS (select 1 from hr_accrual a where a.employeeNumberID = en.ID and a.periodCalcID = :periodID:))` : ''})
                   AND en.mi_deleteDate >= '9999-12-31' 
                   ORDER BY workPlace DESC`,
            {
              orgID,
              dateFrom: dateService.addMonths(period.dateFrom, -3),
              dateTo: period.dateTo,
              priorPeriodID: period.priorPeriodID,
              periodID: period.ID

            })
            employeeNumbers = store.getAsJsObject()
          }
          if (!employeeNumbers.length && mParams.periodCalcID) {
            setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: `Не знайдено жодного працівника!` }, logParams))
            mParams.msgType = 1
          }
          if (employeeNumbers.length) {
            const storeLog = UB.DataStore('hr_calcQueueLog')
            storeLog.run('insert', {
              __skipOptimisticLock: true,
              __skipSelectAfterInsert: true,
              __skipRls: true,
              __skipAclRls: true,
              execParams: {
                ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUELOG') : storeLog.generateID(),
                actionTime: new Date(),
                numCount: employeeNumbers.length,
                orgCalc: !tabNums,
                orgID,
                actionType: '4',
                description: `Період перерахунку ${period.name} ` + (tabNums ? `По табельним номерам ${tabNums}` : `По всім працівникам`)
              }
            })
            const cont = {}
            employeeNumbers.forEach(employeeNumber => {
              const employeeNumberID = employeeNumber.employeeNumberID
              rlService.autoCalculate({
                cont,
                orgID,
                periodID: period.ID,
                employeeNumbers: [employeeNumberID],
                calculateProperty: { calcType: 1 << 6 }
              })
              // Видалення існуючих
              store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID in (SELECT ID FROM hr_accrualFund WHERE periodCalcID = :periodID:
    AND employeeNumberID = :employeeNumberID: AND orderID is NULL)`, { employeeNumberID, periodID: period.ID })
              store.execSQL(`DELETE FROM hr_accrualFund WHERE periodCalcID = :periodID:
    AND employeeNumberID = :employeeNumberID: AND orderID is NULL`, { employeeNumberID, periodID: period.ID })
              // Запис перерахованих
              cont.employeeNumberID = employeeNumberID
              accrualService.saveAutoCalcAccrualFund(cont)
              cont.emp[employeeNumberID] = null
            })
            // Перерахунок по організації
            store.execSQL(`DELETE FROM hr_payFundSummarySheet WHERE periodID = :periodID: AND orgID = :orgID:`, {
              periodID: period.ID,
              orgID
            })
            store.runSQL(` SELECT SUM(ROUND(a.paySum,2)) as "paySum", a.payFundID "payFundID" FROM hr_accrualFund a
                 WHERE a.periodCalcID = :periodID: GROUP BY payFundID`,
            { periodID: period.ID })
            const fund = store.getAsJsObject()
            const payFundSummarySheet = []
            let paySummary = {
              fundSum: 0
            }
            fund.forEach(row => {
              payFundSummarySheet.push({
                ID: accrualService.getID('S_HR_PAYFUNDSUMMARYSHEET'),
                periodID: period.ID,
                orgID: orgID,
                payFundID: row.payFundID,
                paySum: accrualService.round(row.paySum || 0)
              })
              paySummary.fundSum = accrualService.round(paySummary.fundSum + (row.paySum || 0), 2)
            })
            if (payFundSummarySheet.length) {
              if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
                store.execSQL(
                  `INSERT INTO hr_payFundSummarySheet(ID, periodID, orgID, payFundID, paySum)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        periodID bigint '$.periodID',
        orgID bigint '$.orgID',
        payFundID bigint '$.payFundID',
        paySum numeric(19, 2) '$.paySum'
       )`, { p1: JSON.stringify(payFundSummarySheet) }
                )
              } else {
                store.execSQL(
                  `INSERT INTO hr_payFundSummarySheet(ID, periodID, orgID, payFundID, paySum) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'periodID')::BIGINT, 
            (data->>'orgID')::BIGINT, 
            (data->>'payFundID')::BIGINT,
            (data->>'paySum')::numeric(19, 2) 
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(payFundSummarySheet) }
                )
              }
            }
            const paySummaryPeriod = UB.Repository('hr_paySummary')
              .attrs(['ID'])
              .where('orgID', '=', orgID)
              .where('periodID', '=', period.ID)
              .selectSingle()
            if (paySummaryPeriod && paySummaryPeriod.ID) {
              paySummary.ID = paySummaryPeriod.ID
              const paySummaryStore = UB.DataStore('hr_paySummary')
              paySummaryStore.run('update', {
                __skipOptimisticLock: true,
                __skipSelectAfterInsert: true,
                __skipRls: true,
                __skipAclRls: true,
                execParams:
                paySummary
              })
            }
            if (mParams.recalcEntry) {
              paySummaryService.savePeriodOrgEntry(orgID, period)
            }
          }
        }
      })
    }
    runMethod()
    /* try {
      db.savepointWrap(runMethod)
      App.dbCommit()
      setLog(Object.assign({ msgType: '0', targetOrgID: orgID, description: UB.i18n('Перерахунок ЄСВ виконано без помилок!') }, logParams))
    } catch (error) {
      setLog(Object.assign({ msgType: '1', targetOrgID: orgID, description: `Під час перерахунку ЄСВ виникла помилка! Формування для організації припинено! ${error}` }, logParams))
      mParams.msgType = 1
    } */
  })
}

me.deletePeriodCalcData = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const renewTimesheet = mParams.renewTimesheet
  const cleanTimesheet = mParams.cleanTimesheet
  const periodDateFrom = mParams.periodDateFrom
  const currentPeriodID = mParams.currentPeriodID
  let store = UB.DataStore('ac_settingsOrg')

  let constant = UB.Repository('ac_settingsOrg')
    .attrs(['ID', 'value'])
    .where('organizationID', '=', orgID)
    .where('[constantID.code]', '=', 'hrTimeSheetReCalcDate')
    .selectSingle()
  if (constant) {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: constant.ID,
        value: dateService.formatDate(periodDateFrom)
      }
    })
  } else {
    constant = UB.Repository('ac_constant')
      .attrs(['ID'])
      .where('code', '=', 'hrTimeSheetReCalcDate')
      .selectSingle()

    store.run('insert', {
      execParams: {
        organizationID: orgID,
        constantID: constant.ID,
        value: dateService.formatDate(periodDateFrom)
      }
    })
  }
  if (renewTimesheet || cleanTimesheet) {
    let hrMinReCalcDate = UB.Repository('ac_settingsOrg')
      .attrs(['ID', 'value'])
      .where('organizationID', '=', orgID)
      .where('[constantID.code]', '=', 'hrMinReCalcDate')
      .selectSingle()

    if (cleanTimesheet) {
      let timeSheetUB = UB.Repository('tim_timeSheet')
        .attrs(['ID'])
        .where('employeeNumberID.orgID', '=', orgID)
        .where('dateWork', '<', periodDateFrom)
        .selectAsObject()
      if (timeSheetUB && timeSheetUB.length) {
        store = UB.DataStore('tim_timeSheet')
        store.execSQL(`UPDATE tim_timeSheet SET mi_deleteDate = :mi_deleteDate:, mi_deleteUser = :mi_deleteUser: 
        WHERE ID${entityBaseService.getInExpression('IDList')}`,
        {
          IDList: timeSheetUB.map(o => o.ID),
          mi_deleteDate: new Date('2010-10-10'),
          mi_deleteUser: Session.uData.userID
        })
      }

      store = UB.DataStore('ac_settingsOrg')
      if (hrMinReCalcDate) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: hrMinReCalcDate.ID,
            value: dateService.formatDate(periodDateFrom)
          }
        })
      } else {
        hrMinReCalcDate = UB.Repository('ac_constant')
          .attrs(['ID'])
          .where('code', '=', 'hrMinReCalcDate')
          .selectSingle()

        store.run('insert', {
          execParams: {
            organizationID: orgID,
            constantID: hrMinReCalcDate.ID,
            value: dateService.formatDate(periodDateFrom)
          }
        })
      }
    } else if (renewTimesheet) {
      let timeSheetUB = UB.Repository('tim_timeSheet')
        .attrs(['ID'])
        .where('employeeNumberID.orgID', '=', orgID)
        .where('mi_deleteDate', '=', '2010-10-10')
        .misc({ __allowSelectSafeDeleted: true })
        .selectAsObject()
      store = UB.DataStore('tim_timeSheet')
      if (timeSheetUB && timeSheetUB.length) {
        store.execSQL(`UPDATE tim_timeSheet SET mi_deleteDate = :mi_deleteDate:, mi_deleteUser = :mi_deleteUser: 
        WHERE ID${entityBaseService.getInExpression('IDList')}`,
        {
          IDList: timeSheetUB.map(o => o.ID),
          mi_deleteDate: dateService.maxDate(),
          mi_deleteUser: null
        })
      }
      store = UB.DataStore('ac_settingsOrg')
      if (hrMinReCalcDate) {
        store.run('delete', {
          __skipOptimisticLock: true,
          execParams: {
            ID: hrMinReCalcDate.ID
          }
        })
      }
    }
  }

  store = UB.DataStore('hr_accrual')
  store.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID in (SELECT ID FROM hr_accrual WHERE periodCalc < :periodDateFrom: and orgID = :orgID:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID in (SELECT ID FROM hr_accrual WHERE periodCalc < :periodDateFrom: and orgID = :orgID:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID in (SELECT ID FROM hr_accrual WHERE periodCalc < :periodDateFrom: and orgID = :orgID:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_accrual WHERE periodCalc < :periodDateFrom: and orgID = :orgID:;`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID in (SELECT ID FROM hr_accrualFund WHERE periodCalc < :periodDateFrom: and orgID = :orgID:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_accrualFund WHERE periodCalc < :periodDateFrom: and orgID = :orgID:;`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE From hr_accrualBalance where periodCalcID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_payCalcSummarySheet WHERE periodID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_payFundSummarySheet WHERE periodID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`UPDATE hr_paySummary SET accruedSum = 0, deductedSum = 0, paidSum = 0, debtOrgSum = 0, fundSum = 0 WHERE periodID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_payAccOperationPayEl WHERE payAccOperationDtID in (SELECT ID FROM hr_payAccOperationDt WHERE payAccOperationID
       IN (SELECT ID FROM hr_payAccOperation WHERE periodCalcID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:)));`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(` DELETE FROM hr_payAccOperationDt WHERE payAccOperationID in (SELECT ID FROM hr_payAccOperation WHERE periodCalcID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:));
`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_payAccOperation WHERE periodCalcID in (SELECT ID from hr_dictPeriod where orgID = :orgID: and dateFrom < :periodDateFrom:);`, { orgID, periodDateFrom, currentPeriodID })
  store.execSQL(`DELETE FROM hr_payCalcDateFrom WHERE periodCalcID = :currentPeriodID:;`, { orgID, periodDateFrom, currentPeriodID })

  store.freeNative()
}

/* $App.connection.run({
  entity: 'hr_importCustom',
  method: 'updateDepCodes'
}) */
me.updateDepCodes = function (ctx) {
  const deptsData = UB.Repository('hr_department')
    .attrs(['ID', 'code', 'codeSort', 'mi_data_id'])
    .where('state', '=', 'ACTIVE')
    .selectAsObject() || []
  let store = UB.DataStore('hr_department')
  deptsData.forEach(dep => {
    let orgDep = UB.Repository('cost_dictCenter')
      .attrs(['ID', 'code'])
      .where('departmentID', '=', dep.mi_data_id)
      .selectAsObject()

    let updateCode, codeSort, codeList

    if (orgDep && orgDep.length) {
      if (orgDep.length === 1) {
        updateCode = orgDep[0].code
        codeList = String(updateCode || '0').match(/\d+/g) || ['0']
        codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
      } else {
        let lastCode = orgDep.find(el => el.code.endsWith('.'))
        if (lastCode) {
          updateCode = lastCode.code
          codeList = String(updateCode || '0').match(/\d+/g) || ['0']
          codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
        } else {
          let filteredCodes = orgDep.filter(el => !el.code.startsWith('04'))
          if (filteredCodes.length === 1) {
            updateCode = filteredCodes[0].code
            codeList = String(updateCode || '0').match(/\d+/g) || ['0']
            codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
          } else {
            // else cases not found
          }
        }
      }
    } else {
      updateCode = 0
      codeList = String(updateCode || '0').match(/\d+/g) || ['0']
      codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
    }

    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: dep.ID,
        code: updateCode,
        codeSort
      }
    })
  })
}

me.updateEmpCategory = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate)
  const posData = UB.Repository('hr_position')
    .attrs('ID', 'mi_data_id', 'dictEmpCategoryID', 'dictSpecialtyID')
    .where('orgID', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({
      __mip_ondate: onDate
    })
    .selectAsObject()
  const empPos = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'positionID', 'employeeID', 'employeeNumberID')
    .where('organizationID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('dictEmpCategoryID', 'isNull')
    .selectAsObject()

  const empCertificationAcc = empPos.length ? UB.Repository('hr_empCertificationAcc')
    .attrs('ID', 'employeeID', 'dictEmpCategoryID', 'dictSpecialtyID')
    .where('certificationDate', '<=', onDate)
    .where('validityDate', '>=', onDate)
    .where('employeeID', 'in', empPos.map(o => o.employeeID))
    .selectAsObject() : []

  const store = UB.DataStore('hr_employeePosition')
  empPos.forEach(emp => {
    const posItem = posData.find(o => o['mi_data_id'] === emp.positionID)
    if (posItem) {
      const certItem = empCertificationAcc.find(o => o.employeeID === emp.employeeID && o.dictSpecialtyID === posItem.dictSpecialtyID)
      if (certItem) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: emp.ID,
            dictEmpCategoryID: certItem.dictEmpCategoryID
          }
        })
      }
    }
  })
}
me.setMiTreePathByAllOrgs = function (ctx) {
  const store = UB.DataStore(__entityName)
  const orgIDs = UB.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('state', '=', 'ACTIVE')
    .where('mi_dateFrom', '<=', dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate())
    .where('mi_dateTo', '>=', dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate())
    .selectAsArrayOfValues()

  const treeData = getDataOrgs(orgIDs, dateService.shiftDate(ctx.mParams.onDate) || dateService.currentDate())
  treeData.forEach(item => {
    if (!item['treePath'] || item['treePath'] !== item['treePathNew'] || !item['mi_treePath'] || item['mi_treePath'] !== item['mi_treePathNew']) {
      store.execSQL(`UPDATE hr_staffUnit SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
        ID: item.ID,
        treePathNew: item['treePathNew'],
        mi_treePathNew: item['mi_treePathNew']
      })
      if (item['mi_unityEntity'] === 'hr_position') {
        store.execSQL(`UPDATE hr_position SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew'],
          mi_treePathNew: item['mi_treePathNew']
        })
      }
      if (item['mi_unityEntity'] === 'hr_department') {
        store.execSQL(`UPDATE hr_department SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew'],
          mi_treePathNew: item['mi_treePathNew']
        })
      }
      if (item['mi_unityEntity'] === 'hr_organization') {
        store.execSQL(`UPDATE hr_organization SET treePath = :treePathNew:, mi_treePath = :mi_treePathNew: WHERE ID = :ID:`, {
          ID: item.ID,
          treePathNew: item['treePathNew'],
          mi_treePathNew: item['mi_treePathNew']
        })
      }
    }
  })
  store.freeNative()
}
function getData (orgID, onDate) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const sql = `
  WITH ${sqlDialect.dialect === 'MSSQL2012' ? '' : 'RECURSIVE'} tree (id, mi_data_id, parentUnitID, mi_unityEntity, mi_treePath, mi_treePathNew, treePath, treePathNew)
  AS (
    SELECT  
      id, 
      mi_data_id, 
      parentUnitID AS "parentUnitID", 
      mi_unityEntity AS "mi_unityEntity", 
      mi_treePath AS "mi_treePath", 
      CAST(CONCAT('/', CAST(mi_data_id AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600)) AS "mi_treePathNew", 
      treePath AS "treePath",
      CAST(CONCAT('/', CAST(SUBSTRING(CAST(10000000+idxNum AS NATIONAL CHAR VARYING(600)),3,10) AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600)) AS "treePathNew"
    FROM hr_staffUnit
      WHERE parentUnitID is null
        and orgID  = :orgID:
        and mi_deleteDate >= '9999-12-31'
        and :onDate: between mi_dateFrom and mi_dateTo
        and state = 'ACTIVE'
  UNION ALL
    SELECT 
        t.id, 
        t.mi_data_id, 
        t.parentUnitID, 
        t.mi_unityEntity,
        t.mi_treePath, 
        CAST(CONCAT(tree.mi_treePathNew, CAST(t.mi_data_id AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600)),
        t.treePath, 
        CAST(CONCAT(tree.treePathNew, CAST(SUBSTRING(CAST(10000000+t.idxNum as NATIONAL CHAR VARYING(600)),3,10) AS NATIONAL CHAR VARYING(600)), '/') AS NATIONAL CHAR VARYING(600))
    FROM hr_staffUnit t
      INNER JOIN tree ON tree.mi_data_id = t.parentUnitID
      WHERE t.mi_deleteDate >= '9999-12-31'
          and :onDate: between mi_dateFrom and mi_dateTo
          and t.state = 'ACTIVE'
) 
SELECT 
  id "ID", 
  mi_data_id "mi_data_id", 
  parentUnitID "parentUnitID", 
  mi_unityEntity "mi_unityEntity", 
  mi_treePath "mi_treePath", 
  mi_treePathNew "mi_treePathNew", 
  treePath "treePath", 
  treePathNew "treePathNew"
FROM tree
   `
  const store = UB.DataStore(__entityName)
  store.runSQL(sql, {
    orgID,
    onDate
  })
  return store.getAsJsObject()
}
function getDataOrgs (orgIDs, onDate) {
  const resultData = []
  orgIDs.forEach(o => {
    const treeData = getData(o, onDate)
    treeData.forEach(t => {
      const findDuplicate = resultData.find(r => r.ID === t.ID)
      if (!findDuplicate) resultData.push(t)
    })
  })
  return resultData
}

me.fillEmpAddGuarantees = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate)

  // страховий стаж
  const dictExperienceID = UB.Repository('hr_dictExperience')
    .attrs('ID')
    .where('methodExpID.code', '=', '4')
    .selectScalar()

  if (!dictExperienceID) {
    throw new UB.UBAbort(`<<<${UB.i18n('В довіднику видів стажів не знайдено Страховий стаж')}>>>`)
  }

  const curYear = onDate.getFullYear()
  const endOfYear = dateService.getYearEnd(curYear)
  const beginOfYear = dateService.getYearBegin(curYear)

  if (dictExperienceID) {
    const employeeList = UB.Repository('hr_employeeNumber')
      .attrs('employeeID', 'employeeID.birthDate')
      .where('orgID', '=', orgID)
      .where('employeeID.birthDate', 'isNotNull')
      .exists(UB.Repository('hr_employeePosition')
        .correlation('employeeNumberID', 'ID')
        .where('isActive', '=', 1)
        .where('dateFrom', '<=', endOfYear)
        .where('dateTo', '>=', beginOfYear)
        .where('mi_deleteDate', '>=', '#maxdate')
      )
      .exists(UB.Repository('hr_employeeExperience')
        .correlation('employeeID', 'employeeID')
        .where('dictExperienceID', '=', dictExperienceID)
        .where('mi_deleteDate', '>=', '#maxdate')
      )
      .notExists(UB.Repository('hr_empAddGuarantees')
        .correlation('employeeID', 'employeeID')
        .where('addGuarant', '=', '7')
        .where('mi_deleteDate', '>=', '#maxdate')
      )
      .groupBy(['employeeID', 'employeeID.birthDate'])
      .selectAsObject({
        'employeeID.birthDate': 'birthDate'
      })
    const store = UB.DataStore('hr_empAddGuarantees')
    employeeList.forEach(emp => {
      const birthDate = dateService.shiftDate(emp.birthDate)
      const age = dateService.getYmd(birthDate, endOfYear)
      const expCalcDate = UB.Repository('hr_employeeExperience')
        .attrs('calcDate')
        .where('employeeID', '=', emp.employeeID)
        .where('dictExperienceID', '=', dictExperienceID)
        .selectScalar()
      const onDate = dateService.shiftDate(new Date(curYear, birthDate.getMonth(), birthDate.getDate()))
      const exp = dateService.getYmd(dateService.shiftDate(expCalcDate), onDate)
      const isAdd = ([50, 51, 52].includes(age.years) && exp.years >= 19) ||
        ([53, 54].includes(age.years) && exp.years >= 9 && exp.years <= 18) ||
        (age.years >= 55 && exp.years < 9)
      if (isAdd) {
        store.run('insert', {
          execParams: {
            employeeID: emp.employeeID,
            addGuarant: '7',
            dateFrom: onDate
          }
        })
      }
    })
  }
}
me.updateEmployeeOnStaff = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const sLang = me.entity.connectionConfig.supportLang
  const employeePosition = UB.Repository('hr_employeePosition')
    .attrs(['ID', 'employeeID', 'organizationID', 'departmentID', 'dictPositionID', 'dictPositionID.name', 'dictPositionID.fullName',
      'employeeNumberID.tabNum', 'workPlace', 'dateFrom', 'dateTo', 'description'])
    .whereIf(orgID, 'organizationID', '=', orgID)
    .where('dictPositionID', 'isNotNull')
    .selectAsObject()
  const employeeonstaff = UB.Repository('org_employeeonstaff')
    .attrs(['ID', 'employeeID', 'organizationID', 'staffUnitID', 'tabNo', 'employeeOnStaffType', 'mi_dateFrom', 'mi_dateTo', 'mi_deleteUser'])
    .whereIf(orgID, 'organizationID', '=', orgID)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()
  const store = UB.DataStore('org_employeeonstaff')
  const storeStaffunit = UB.DataStore('org_staffunit')
  const storeEmployeeonstaff = UB.DataStore('org_employeeonstaff')
  employeePosition.forEach(pos => {
    const staff = employeeonstaff.find(o => o.ID === pos.ID)
    let staffUnitID = UB.Repository('org_staffunit').attrs(['ID'])
      .where('organizationID', '=', pos.organizationID)
      .where('parentID', '=', pos.departmentID || pos.organizationID)
      .where('professionID', '=', pos.dictPositionID)
      .exists(UB.Repository('org_employeeonstaff')
        .correlation('staffUnitID', 'ID')
        .where('employeeID', '=', pos.employeeID)
      )
      .limit(1).selectScalar()
    if (!staffUnitID) {
      staffUnitID = storeStaffunit.generateID()
      const execParams = {
        ID: staffUnitID,
        organizationID: pos.organizationID,
        parentID: pos.departmentID || pos.organizationID,
        professionID: pos.dictPositionID,
        name: pos['dictPositionID.name'],
        fullName: pos['dictPositionID.fullName'] || pos['dictPositionID.name']
      }
      sLang.forEach(lang => {
        const suffix = '_' + lang + '^'
        execParams['name' + suffix] = pos['dictPositionID.name']
      })
      try {
        storeStaffunit.run('insert', {
          __skipOptimisticLock: true,
          entity: 'org_staffunit',
          execParams
        })
      } catch (e) {}
    }
    try {
      if (staff && staff.mi_deleteUser) {
        store.execSQL(`UPDATE org_employeeonstaff SET mi_deleteDate = '9999-12-31', mi_deleteUser = null WHERE ID = :ID:`, {
          ID: staff.ID
        })
      }
      storeEmployeeonstaff.run(staff ? 'update' : 'insert', {
        entity: 'org_employeeonstaff',
        __skipOptimisticLock: true,
        execParams: {
          ID: pos.ID,
          employeeID: pos.employeeID,
          organizationID: pos.organizationID,
          staffUnitID,
          tabNo: pos['employeeNumberID.tabNum'],
          employeeOnStaffType: pos.workPlace || '4',
          mi_dateFrom: pos.dateFrom,
          mi_dateTo: pos.dateTo,
          description: pos.description
        }
      })
    } catch (e) {}
  })
}

me.fillFacultyStudGroup = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const groups = UB.Repository('hr_dictStudGroup')
    .attrs('ID', 'code')
    .where('departmentID', 'isNull')
    .selectAsObject()
  const deparments = UB.Repository('hr_department')
    .attrs('ID', 'mi_data_id', 'code')
    .where('orgID', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .selectAsObject()
  const storeGroup = UB.DataStore('hr_dictStudGroup')
  const storeHist = UB.DataStore('hr_studEducationHistory')
  const storeEmpPos = UB.DataStore('hr_employeePosition')
  const errors = []
  groups.forEach(row => {
    const groupCode = String(row['code']).replace(/[^\d]/g, '')
    let l = groupCode.length
    let depCode = l > 2 ? groupCode[l - 3] : ''
    if (depCode) {
      let dep = deparments.find(o => o.code === depCode)
      if (dep) {
        storeGroup.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: row.ID,
            departmentID: dep['mi_data_id']
          }
        })
        const studHistory = UB.Repository('hr_studEducationHistory')
          .attrs('ID', 'employeeNumberID')
          .where('groupID', '=', row.ID)
          .where('departmentID', 'isNull')
          .selectAsObject()
        const empNumIds = []
        studHistory.forEach(item => {
          empNumIds.push(item['employeeNumberID'])
          storeHist.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            execParams: {
              ID: item.ID,
              departmentID: dep['mi_data_id']
            }
          })
        })
        const studEmpPos = UB.Repository('hr_employeePosition')
          .attrs('ID')
          .where('employeeNumberID', 'in', empNumIds)
          .where('departmentID', 'isNull')
          .selectAsObject()
        studEmpPos.forEach(item => {
          storeEmpPos.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            isImport: true,
            isDirectUpdate: true,
            execParams: {
              ID: item.ID,
              departmentID: dep['mi_data_id'],
              description: null
            }
          })
        })
      } else {
        errors.push(UB.i18n('Не знайдено факультету с кодом {0}', depCode))
      }
    } else {
      errors.push(UB.i18n('Не задано код факультету для групи {0}', row['code']))
    }
  })
  if (errors.length) {
    ctx.mParams.errors = JSON.stringify(errors)
  }
}

me.setPositionInEmpPos = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('hr_employeePosition')
  const onDate = dateService.shiftDate(mParams.onDate)
  const sqlDialect = entityBaseService.getSQLDialect()

  const positionList = UB.Repository('hr_position')
    .attrs('mi_data_id', 'name', 'parentUnitID')
    .where('orgID', '=', mParams.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()

  const departmentList = UB.Repository('hr_department')
    .attrs('mi_data_id', 'name')
    .where('orgID', '=', mParams.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectAsObject()

  positionList.forEach(row => {
    row['name'] = row['name'].toUpperCase()
  })

  departmentList.forEach(row => {
    row['name'] = row['name'].toUpperCase()
  })

  store.runSQL(`SELECT ep.ID "ID"
     ,ep.departmentID "departmentID"
     ,(select ${sqlDialect.top} dep.name from hr_department dep where dep.mi_data_id = ep.departmentID and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) "depName"
     ,ep.dictPositionID "dictPositionID"
     ,dp.name "dictPositionName"
    FROM hr_employeePosition ep
    LEFT JOIN hr_dictPosition dp
      ON dp.ID = ep.dictPositionID
    WHERE ep.organizationID = :orgID:
    AND ep.dateFrom <= :onDate:
    AND ep.dateTo >= :onDate:
    AND ep.isActive = 1
    AND ep.positionID IS NULL
    AND ep.dictPositionID IS NOT NULL
    AND ep.mi_deleteDate >= '9999-12-31'
  `, {
    orgID: mParams.orgID,
    onDate
  })

  const employeePositions = store.getAsJsObject()

  employeePositions.forEach(item => {
    const dep = departmentList.find(o => o.name === String(item['depName']).toUpperCase())
    const departmentID = dep ? dep['mi_data_id'] : item['departmentID']
    const pos = positionList.find(o => o['parentUnitID'] === departmentID && o['name'] === String(item['dictPositionName']).toUpperCase())
    if (pos) {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        isImport: true,
        execParams: {
          ID: item.ID,
          positionID: pos['mi_data_id'],
          departmentID: departmentID,
          description: null
        }
      })
    }
  })
}

me.setEmployeeOrg = function (ctx) {
  const mParams = ctx.mParams
  const store = UB.DataStore('ac_employeeOrg')
  const employeeOrg = UB.Repository('ac_employeeOrg')
    .attrs(['organizationID', 'employeeID'])
    .whereIf(mParams.isCurrentOrg, 'organizationID', '=', mParams.orgID)
    .selectAsObject()
  const employeeNumber = UB.Repository('hr_employeeNumber')
    .attrs(['orgID', 'employeeID'])
    .whereIf(mParams.isCurrentOrg, 'orgID', '=', mParams.orgID)
    .groupBy(['orgID', 'employeeID'])
    .selectAsObject()

  employeeNumber.forEach(row => {
    if (!employeeOrg.find(o => o.organizationID === row.orgID && o.employeeID === row.employeeID)) {
      store.run('insert', {
        execParams: {
          ID: store.generateID(),
          organizationID: row.orgID,
          employeeID: row.employeeID
        }
      })
    }
  })
}

me.fillEmployeePosInWorkBook = function (ctx) {
  const mParams = ctx.mParams

  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('hr_employeeWorkbook')

  store.runSQL(`select ID "ID",
    (select ${sqlDialect.top} id from hr_employeePosition hp where hp.employeeID=wb.employeeID and mi_deleteDate>='9999-12-31' and workPlace='1' and dateTo >='9999-12-31'
      order by dateFrom desc ${sqlDialect.limit}) "employeePositionID"
    from hr_employeeWorkbook wb
    where dateTo >='9999-12-31'
        and mi_deleteDate>='9999-12-31'
        and employeePositionID is null
        and employeeID in (select employeeID from hr_employeePosition ep where organizationID=:orgID: and ep.mi_deleteDate>='9999-12-31')
  `, {
    orgID: mParams.orgID
  })
  const wbList = store.getAsJsObject()
  wbList.forEach(row => {
    if (row.employeePositionID) {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        isImport: true,
        execParams: {
          ID: row.ID,
          employeePositionID: row.employeePositionID
        }
      })
    }
  })
}

me.shiftIncorrectDates = (ctx) => {
  const entityName = ctx.mParams.entityName
  const fieldName = ctx.mParams.fieldName
  if (!entityName || !fieldName) return
  const store = UB.DataStore(entityName)
  if (entityBaseService.isPostgreSql()) {
    store.runSQL(`
      SELECT ID as "ID", ${fieldName} as "${fieldName}" 
        FROM ${entityName}
        WHERE mi_deleteDate>= '9999-12-31' AND DATE_PART('hour', ${fieldName}) <> 0
    `, {})
  } else {
    store.runSQL(`
      SELECT ID as "ID", ${fieldName} as "${fieldName}" 
        FROM ${entityName}
        WHERE mi_deleteDate >= '9999-12-31' AND DATEPART(hh, ${fieldName}) <> 0
    `, {})
  }
  const data = store.getAsJsObject()
  data.forEach(row => {
    const params = {
      ID: row.ID
    }
    params[fieldName] = dateService.shiftDate(row[fieldName])
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: params
    })
  })
  store.freeNative()
}

me.createTarifications = (ctx) => {
  const mParams = ctx.mParams
  const onDate = dateService.todayDate()
  const employeeNumberStore = UB.DataStore('hr_employeeNumber')
  const employeePositionStore = UB.DataStore('hr_employeePosition')
  const empPosFundSourceStore = UB.DataStore('hr_empPosFundSource')
  const orgIDs = mParams.tariffChildOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]
  const logParams = {
    orgID: mParams.orgID,
    targetOrgID: mParams.orgID,
    entityName: mParams.method
  }
  setLog(Object.assign({ msgType: '0', description: `${UB.i18n('Запуск')} ${JSON.stringify(mParams)}` }, logParams))
  const employeeNumbers = mParams.tariffTabNums ? UB.Repository('hr_employeeNumber')
    .attrs(['ID'])
    .whereIf(orgIDs, 'orgID', 'in', orgIDs)
    .where('tabNum', 'in', mParams.tariffTabNums.replace(/ /g, '').split(','))
    .selectAsObject().map(o => o.ID) : null
  if (employeeNumbers && !employeeNumbers.length) {
    employeeNumbers.push(0)
  }
  let payElID = null
  const payElEntry = [0]
  const payElIDs = UB.Repository('hr_payEl').attrs('ID').where('methodID.code', '=', '1').selectAsObject()
  const payElEntryList = payElIDs.length ? UB.Repository('hr_payElEntry').attrs(['payElID', 'payElBaseID'])
    .where('payElID', 'in', payElIDs.map(o => o.ID))
    .where('entryType', '=', 'SUM')
    // .where('payElBaseID.methodID.code', 'notIn', ['143', '144', '145', '152'])
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
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

  orgIDs.forEach(orgID => {
    const workPlaces = UB.Repository('trf_workPlace')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'documentID.type', 'employeeNumberID.description', 'departmentID', 'departmentID.name', 'dictPositionID.name'])
      .where('documentID.orgID', '=', orgID)
      .where('documentID.type', '=', 'FACT')
      .where('state', '=', 'POSTED')
      .where('employeeNumberID', 'isNotNull')
      .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('employeeNumberID')
      .orderBy('dateFrom')
      .selectAsObject()
    workPlaces.forEach(workPlace => {
      const dateFrom = dateService.shiftDate(workPlace.dateFrom)
      const dateTo = dateService.shiftDate(workPlace.dateTo)
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

      let mainEmployeePositions = UB.Repository('hr_employeePosition')
        .attrs(['*', 'workScheduleID.weekDays', 'workScheduleID.isSummarized', 'workScheduleID.organizationID'])
        .where('employeeNumberID', '=', workPlace.employeeNumberID)
        .where('dateFrom', '<=', dateTo)
        .where('dateTo', '>=', dateFrom)
        .orderBy('dateFrom')
        .selectAsObject()
      let mainEmployeePosition = mainEmployeePositions.find(o => o.orderID === workPlace.ID) || (mainEmployeePositions.length ? mainEmployeePositions[0] : null)
      /* let workNormAvg = 0
        if (mainEmployeePosition && mainEmployeePosition.workScheduleID) {
            workNormAvg = algorithmService.getPlanTime(document.orgID, mainEmployeePosition.workScheduleID, dateService.firstDayOfMonth(dateFrom), dateService.lastDayOfMonth(dateFrom))
        } */
      const positions = UB.Repository('trf_position').attrs(['ID', 'dictPositionID', 'rate', 'dictRankID', 'accrualSum',
        'dictProgClassID', 'dictFundSourceID', 'dictTarifCoeffID', 'dictQualificationID', 'workNormID.weekHours'])
        .where('workPlaceID', '=', workPlace.ID)
        // .where('rate', '>', 0)
        .orderBy('posIndex')
        .selectAsObject()
      const allPosData = {
        dictPositionID: positions.length ? positions[0].dictPositionID : null,
        mtCount: 0,
        accrualSum: 0,
        planHours: 0,
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
        let workNormAvg = { hours: 0 }
        if (workScheduleID) {
          workNormAvg = algorithmService.getPlanTime(document.orgID, workScheduleID, dateService.firstDayOfMonth(dateFrom), dateService.lastDayOfMonth(dateFrom))
        }

        allPosData.planHours = accrualService.round((allPosData.planHours || 0) + workNormAvg.hours, 3)
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
            planHours: workNormAvg.hours || 0,
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
          employeeNumber.planHours = accrualService.round((employeeNumber.planHours || 0) + (workNormAvg.hours || 0), 3)
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
      // Редагуєм призначення основного

      mainEmployeePositions.forEach(row => {
        employeePositionStore.run('update', {
          isImport: true,
          __skipOptimisticLock: true,
          isDirectUpdate: true,
          isNotCheckPosition: true,
          skipCheckTabNum: true,
          execParams: {
            ID: row.ID,
            dateFrom: dateService.shiftDate(row.dateFrom) <= dateFrom ? dateService.shiftDate(row.dateFrom) : dateService.addDays(dateFrom, -1),
            dateTo: dateService.shiftDate(Math.max(dateService.shiftDate(row.dateTo) >= dateTo ? dateFrom.getTime() === dateService.shiftDate(row.dateFrom).getTime() ? dateService.shiftDate(row.dateFrom) : dateService.addDays(dateFrom, -1) : dateService.shiftDate(row.dateTo),
              dateFrom.getTime() === dateService.shiftDate(row.dateFrom).getTime() ? dateService.shiftDate(row.dateFrom) : dateService.addDays(dateFrom, -1))),
            changeOrderID: workPlace.ID,
            payElID,
            isActive: dateFrom.getTime() !== dateService.shiftDate(row.dateFrom).getTime()
          }
        })
      })

      const store = UB.DataStore('hr_employeePosition')
      store.execSQL(`delete FROM hr_empPosFundSource WHERE employeePositionID in (select ID FROM hr_employeePosition WHERE  employeeNumberID = :employeeNumberID: AND
          orderID = :orderID: AND mi_deleteUser IS NOT NULL)`, {
        employeeNumberID: workPlace.employeeNumberID,
        orderID: workPlace.ID
      })
      store.execSQL(`delete FROM hr_employeePosition WHERE employeeNumberID = :employeeNumberID: AND
          orderID = :orderID: AND mi_deleteUser IS NOT NULL`, {
        employeeNumberID: workPlace.employeeNumberID,
        orderID: workPlace.ID
      })
      store.runSQL(`SELECT ID "ID" FROM hr_employeePosition WHERE employeeNumberID = :employeeNumberID: AND
          orderID = :orderID: AND mi_deleteUser IS NOT NULL`, {
        employeeNumberID: workPlace.employeeNumberID,
        orderID: workPlace.ID
      })
      const mainPosition = store.getAsJsObject()
      let newMainEmployeePosition = Object.assign({}, mainEmployeePosition || {})
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
        mainEmployeePosition = UB.Repository('hr_employeePosition')
          .attrs(['*'])
          .where('employeeNumberID', '=', workPlace.employeeNumberID)
          .where('dateFrom', '<', dateTo)
          .orderByDesc('dateFrom')
          .limit(1)
          .selectSingle()
        if (mainEmployeePosition) {
          newMainEmployeePosition = Object.assign({}, mainEmployeePosition || {})
        }

        newMainEmployeePosition.employeeID = mainEmployeeNumber.employeeID
        newMainEmployeePosition.employeeNumberID = workPlace.employeeNumberID
        newMainEmployeePosition.organizationID = mainEmployeeNumber.orgID
        newMainEmployeePosition.isActive = 1
        newMainEmployeePosition.workPlace = '1'
      }
      const checkAttr = ['departmentID', 'workScheduleID', 'workerType', 'workPlace', 'dictCategoryECBID', 'contractType', 'dictContractKindID', 'dictEmpCategoryID', 'dictStaffCatID']
      const lastEmployeePosition = UB.Repository('hr_employeePosition')
        .attrs(checkAttr)
        .where('employeeNumberID', '=', workPlace.employeeNumberID)
        .where('dateFrom', '<', dateTo)
        .orderByDesc('dateFrom')
        .selectAsObject()
      checkAttr.forEach(attrName => {
        if (!newMainEmployeePosition[attrName]) {
          const last = lastEmployeePosition.find(o => o[attrName])
          if (last) {
            newMainEmployeePosition[attrName] = last[attrName]
          }
        }
      })
      newMainEmployeePosition.orderID = workPlace.ID
      newMainEmployeePosition.dateFrom = dateService.shiftDate(dateFrom)
      newMainEmployeePosition.dateTo = dateService.shiftDate(dateTo)
      newMainEmployeePosition.dictPositionID = allPosData.dictPositionID
      newMainEmployeePosition.mtCount = allPosData.mtCount

      newMainEmployeePosition.dictRankID = allPosData.dictRankID
      newMainEmployeePosition.dictQualificationID = allPosData.dictQualificationID
      newMainEmployeePosition.planHours = allPosData.planHours
      newMainEmployeePosition.accrualSum = accrualService.round(allPosData.accrualSum || 0) // accrualService.round((allPosData.accrualSum || 0) / (allPosData.mtCount || 0), 2)
      newMainEmployeePosition.dictProgClassID = allPosData.dictProgClassID
      newMainEmployeePosition.dictTarifCoeffID = allPosData.dictTarifCoeffID
      newMainEmployeePosition.payElID = payElID
      if (mainPosition.length) {
        store.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = '9999-12-31', mi_deleteUser = null WHERE ID = :ID:`, {
          ID: mainPosition[0].ID
        })
        newMainEmployeePosition.ID = mainPosition[0].ID
        employeePositionStore.run('update', {
          isImport: true,
          isDirectUpdate: true,
          isNotCheckPosition: true,
          __skipOptimisticLock: true,
          execParams: newMainEmployeePosition
        })
      } else {
        newMainEmployeePosition.employeeNumberID = workPlace.employeeNumberID
        newMainEmployeePosition.ID = employeePositionStore.generateID()

        employeePositionStore.run('insert', {
          isImport: true,
          isDirectUpdate: true,
          isNotCheckPosition: true,
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
      // Зміни додаткових табельних
      employeeNumbers.forEach(employeeNumber => {
        if (employeeNumber.ID && !employeeNumber.update) {
          const employeePositions = UB.Repository('hr_employeePositionS')
            .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID'])
            .where('employeeNumberID', '=', employeeNumber.ID)
            .where('orderID', '=', workPlace.ID)
            .where('dateFrom', '<=', dateTo)
            .where('dateTo', '>=', dateFrom)
            .selectAsObject()
          employeePositions.forEach(row => {
            employeePositionStore.run('update', {
              isImport: true,
              __skipOptimisticLock: true,
              isDirectUpdate: true,
              isNotCheckPosition: true,
              skipCheckTabNum: true,
              execParams: {
                ID: row.ID,
                dateTo: dateService.addDays(dateFrom, -1),
                dateFrom: dateService.shiftDate(row.dateFrom) > dateService.addDays(dateFrom, -1) ? dateService.addDays(dateFrom, -1) : dateService.shiftDate(row.dateFrom),
                changeOrderID: workPlace.ID
              }
            })
          })
        } else {
          const newEmployePosition = {
            orderID: workPlace.ID,
            employeeID: mainEmployeeNumber.employeeID,
            employeeNumberID: employeeNumber.ID,
            organizationID: mainEmployeeNumber.orgID,
            departmentID: mainEmployeePosition.departmentID,
            dateFrom: dateService.shiftDate(dateFrom),
            dateTo: dateService.shiftDate(dateTo),
            dictPositionID: employeeNumber.empDictPositionID,
            mtCount: employeeNumber.mtCount,
            isActive: 1,
            workPlace: '5',
            workScheduleID: employeeNumber.workScheduleID,
            payElID: payElID, // mainEmployeePosition ? mainEmployeePosition.payElID : null,
            dictStaffCatID: newMainEmployeePosition ? newMainEmployeePosition.dictStaffCatID : null,
            workerType: newMainEmployeePosition ? newMainEmployeePosition.workerType : null,
            // dictCategoryECBID: mainEmployeePosition ? mainEmployeePosition.dictCategoryECBID : null,
            contractType: newMainEmployeePosition ? newMainEmployeePosition.contractType : null,
            dictContractKindID: newMainEmployeePosition ? newMainEmployeePosition.dictContractKindID : null,
            dictEmpCategoryID: newMainEmployeePosition ? newMainEmployeePosition.dictEmpCategoryID : null,
            dictRankID: employeeNumber.dictRankID,
            dictQualificationID: employeeNumber.dictQualificationID,
            planHours: employeeNumber.planHours,
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
              isImport: true,
              isDirectUpdate: true,
              isNotCheckPosition: true,
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
            const wpPositions = UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID', 'orderID'])
              .where('employeeNumberID', '=', employeeNumber.ID)
              .where('dateFrom', '<=', dateTo)
              .where('dateTo', '>=', dateFrom)
              // .where('orderID', '=', workPlace.ID)
              // .limit(1)
              .selectAsObject()
            if (wpPositions.length) {
              newEmployePosition.ID = (wpPositions.find(o => o.orderID === workPlace.ID) || {}).ID || wpPositions[0].ID
              wpPositions.forEach(wp => {
                if (wp.ID !== newEmployePosition.ID) {
                  employeePositionStore.run('update', {
                    isImport: true,
                    __skipOptimisticLock: true,
                    skipCheckTabNum: true,
                    isDirectUpdate: true,
                    isNotCheckPosition: true,
                    execParams: {
                      ID: wp.ID,
                      dateFrom: dateService.shiftDate(wp.dateFrom) < dateFrom ? dateService.shiftDate(wp.dateFrom) : dateService.addDays(dateFrom, -1),
                      dateTo: dateService.shiftDate(Math.max(dateService.shiftDate(wp.dateTo) >= dateTo ? dateService.addDays(dateFrom, -1) : dateService.shiftDate(wp.dateTo),
                        dateService.shiftDate(wp.dateFrom) < dateFrom ? dateService.shiftDate(wp.dateFrom) : dateService.addDays(dateFrom, -1))),
                      changeOrderID: workPlace.ID
                    }
                  })
                }
              })

              employeePositionStore.run('update', {
                isImport: true,
                isDirectUpdate: true,
                isNotCheckPosition: true,
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
                isImport: true,
                isDirectUpdate: true,
                isNotCheckPosition: true,
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
        }
      })
    })
  })
  setLog(Object.assign({ msgType: '0', description: UB.i18n('Зaвершено') }, logParams))
}

me.createRlTarifications = (ctx) => {
  const mParams = ctx.mParams
  const onDate = dateService.todayDate()
  const dateFrom = mParams.dateFrom ? dateService.shiftDate(mParams.dateFrom) : null
  const dateTo = mParams.dateTo ? dateService.shiftDate(mParams.dateTo) : null
  const store = UB.DataStore('hr_accrual')
  const orgIDs = mParams.tariffRlChildOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]

  const employeeNumbers = mParams.tariffRlTabNums ? UB.Repository('hr_employeeNumber')
    .attrs(['ID'])
    .whereIf(orgIDs, 'orgID', 'in', orgIDs)
    .where('tabNum', 'in', mParams.tariffRlTabNums.replace(/ /g, '').split(','))
    .selectAsObject().map(o => o.ID) : null
  if (employeeNumbers && !employeeNumbers.length) {
    employeeNumbers.push(0)
  }
  orgIDs.forEach(orgID => {
    const mainEmployeeNumbers = UB.Repository('trf_workPlace')
      .attrs(['employeeNumberID'])
      .where('documentID.orgID', '=', orgID)
      .where('documentID.type', '=', 'FACT')
      .where('state', '=', 'POSTED')
      .where('employeeNumberID', 'isNotNull')
      .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
      .orderBy('employeeNumberID')
      .groupBy('employeeNumberID')
      .selectAsObject()
    mainEmployeeNumbers.forEach(emp => {
      const childNumbers = UB.Repository('hr_employeeNumberS')
        .attrs(['ID', 'empWorkPlace', 'empDictPositionID', 'tabNumIndex', 'dateTo', 'changeOrderID'])
        .where('mainEmpNumberID', '=', emp.employeeNumberID)
        .where('empWorkPlace', '=', '5')
        .selectAsObject()
      if (childNumbers.length) {
        const accrual = UB.Repository('hr_accrual')
          .attrs(['*'])
          .where('employeeNumberID', '=', emp.employeeNumberID)
          .where('source', '=', 'trf_accrual')
          .whereIf(dateFrom, 'periodCalc', '>=', dateFrom)
          .whereIf(dateTo, 'periodCalc', '<=', dateTo)
          .where(`((flagsRec & 4096 = 0) AND (flagsRec & 1048576 = 0))`, 'custom')
          .where('dictPositionID', 'isNotNull')
          .orderBy('ID')
          .selectAsObject()
        let accIDs = []
        const orderIDs = []

        accrual.forEach(accr => {
          accr.dateFrom = dateService.shiftDate(accr.dateFrom)
          accr.dateTo = dateService.shiftDate(accr.dateTo)
          accr.dateFromAvg = accr.dateFromAvg ? dateService.shiftDate(accr.dateFromAvg) : accr.dateFromAvg
          accr.dateToAvg = accr.dateToAvg ? dateService.shiftDate(accr.dateToAvg) : accr.dateToAvg
          accr.periodCalc = dateService.shiftDate(accr.periodCalc)
          accr.periodSalary = dateService.shiftDate(accr.periodSalary)
          accIDs.push(accr.ID)
          if (accr.orderID) {
            orderIDs.push(accr.orderID)
          }
        })
        let taxIndividAcc = UB.Repository('hr_taxIndividAcc')
          .attrs(['ID', 'taxIndividID', 'taxSum', 'incomeSum', 'taxFreeSum', 'privilegeSum', 'accrualID'])
          .where('accrualID', 'in', accIDs.length ? accIDs : [0])
          .orderBy('accrualID')
          .selectAsObject()
        let accrualDt = UB.Repository('hr_accrualDt')
          .attrs(['ID', 'accrualID', 'paySum', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'departmentID', 'accountID',
            'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
            'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
          .where('accrualID', 'in', accIDs.length ? accIDs : [0])
          .orderBy('accrualID')
          .selectAsObject()
        accIDs = null
        let accr
        taxIndividAcc.forEach(row => {
          if (!accr || accr.ID !== row.accrualID) {
            accr = accrualService.binarySearch(accrual, row.accrualID, 0, accrual.length - 1, 'ID')
          }
          if (accr) {
            if (accr.taxIndividAcc) {
              accr.taxIndividAcc.push(row)
            } else {
              accr.taxIndividAcc = [row]
            }
          }
        })
        taxIndividAcc = null
        accr = null
        accrualDt.forEach(row => {
          if (!accr || accr.ID !== row.accrualID) {
            accr = accrualService.binarySearch(accrual, row.accrualID, 0, accrual.length - 1, 'ID')
          }
          if (accr) {
            if (accr.accrualDt) {
              accr.accrualDt.push(row)
            } else {
              accr.accrualDt = [row]
            }
          }
        })

        accrual.forEach(accr => {
          const childNumber = childNumbers.find(o => o.empDictPositionID === accr.dictPositionID)
          if (childNumber) {
            const acc = Object.assign({}, accr)
            acc.employeeNumberPartID = childNumber.ID // accr.employeeNumberID
            // acc.employeeNumberID = employeeNumberID
            // acc.insert = true
            acc.calcParams = acc.calcParams ? (typeof acc.calcParams === 'object' ? acc.calcParams : JSON.parse(acc.calcParams)) : {}
            acc.calcParams.createFromAccrualID = acc.ID
            acc.calcParams = JSON.stringify(acc.calcParams)
            delete acc.ID
            acc.flagsRec = accr.flagsRec | 1 << 20
            store.execSQL(`UPDATE hr_accrual SET employeeNumberID = :employeeNumberID: WHERE ID = :ID:`, {
              ID: accr.ID,
              employeeNumberID: childNumber.ID
            })
            accrualService.saveAccrual({ accrual: acc })
          }
        })
      }
    })
  })
}

me.recalcFlagsRlImp = (ctx) => {
  const mParams = ctx.mParams
  const onDate = dateService.todayDate()
  const dateFrom = mParams.dateFrom ? dateService.shiftDate(mParams.dateFrom) : null
  const dateTo = mParams.dateTo ? dateService.shiftDate(mParams.dateTo) : null
  const store = UB.DataStore('hr_accrual')
  const accStore = UB.DataStore('hr_accrual')
  const orgIDs = mParams.impRlChildOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]

  const employeeNumbers = mParams.impRlTabNums ? UB.Repository('hr_employeeNumber')
    .attrs(['ID'])
    .whereIf(orgIDs, 'orgID', 'in', orgIDs)
    .where('tabNum', 'in', mParams.impRlTabNums.replace(/ /g, '').split(','))
    .selectAsObject().map(o => o.ID) : null
  if (employeeNumbers && !employeeNumbers.length) {
    employeeNumbers.push(0)
  }
  orgIDs.forEach(orgID => {
    store.execSQL(`UPDATE hr_accrual set flagsRec = flagsRec | 512 WHERE orgID = :orgID: AND (flagsRec & 8 = 8) AND paySum < 0 AND (flagsRec & 512 = 0)
    ${dateFrom ? ' AND periodCalc >= :dateFrom:' : ''} ${dateTo ? 'AND periodCalc <= :dateTo:' : ''} `, {
      orgID,
      dateFrom,
      dateTo
    })
    let accruals = UB.Repository('hr_accrual')
      .attrs(['ID', 'orgID', 'employeeNumberID', 'payElID', 'linkToParentID', 'paySum', 'periodCalc', 'periodCalcID', 'periodSalary', 'periodSalaryID'])
      .where('orgID', '=', orgID)
      .where(`((flagsRec & 8 = 8) and (flagsRec & 512 = 512))`, 'custom')
      .where('paySum', '<', 0)
      .whereIf(dateFrom, 'periodCalc', '>=', dateFrom)
      .whereIf(dateTo, 'periodCalc', '<=', dateTo)
      .selectAsObject()

    accruals.forEach(row => {
      const parentAccruals = UB.Repository('hr_accrual')
        .attrs(['ID', 'paySum', 'periodCalc', 'periodCalcID', 'periodSalary'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orgID', '=', orgID)
        .where('payElID', '=', row.payElID)
        .where('periodSalaryID', '=', row.periodSalaryID)
        .where('ID', '!=', row.ID)
        .where('periodCalc', '<=', row.periodCalc)
        .where(`((flagsRec & 8 = 8) and (flagsRec & 512 = 0))`, 'custom')
        .orderBy('periodCalc')
        .selectAsObject()
      if (parentAccruals.length) {
        const execParams = {
          ID: row.ID,
          linkToParentID: null
        }
        if (parentAccruals.length === 1) {
          execParams.linkToParentID = parentAccruals[0].ID
        } else {
          const parentAccrual = parentAccruals.find(o => o.paySum >= (-1 * row.paySum))
          if (parentAccrual) {
            execParams.linkToParentID = parentAccrual.ID
          } else {
            execParams.linkToParentID = parentAccruals[0].ID
          }
        }
        if (execParams.linkToParentID) {
          accStore.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            isImport: true,
            execParams
          })
        }
      }
    })

    accruals = UB.Repository('hr_accrual')
      .attrs(['ID', 'orgID', 'employeeNumberID', 'payElID', 'linkToParentID', 'paySum', 'periodCalc', 'periodCalcID', 'periodSalary', 'periodSalaryID'])
      .where('orgID', '=', orgID)
      .where(`([periodCalc] > [periodSalary] AND  [flagsRec] & 8 = 8)`, 'custom')
      .where('payElID.methodID.methodGroupID.code', '=', 3)
      .whereIf(dateFrom, 'periodCalc', '>=', dateFrom)
      .whereIf(dateTo, 'periodCalc', '<=', dateTo)
      .selectAsObject()

    accruals.forEach(row => {
      let parentAccruals = UB.Repository('hr_accrual')
        .attrs(['ID', 'paySum', 'orgID', 'employeeNumberID', 'payElID', 'linkToParentID', 'periodCalc', 'periodCalcID', 'periodSalary', 'periodSalaryID'])
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('orgID', '=', orgID)
        .where('payElID', '=', row.payElID)
        .where('periodSalaryID', '=', row.periodSalaryID)
        .where('periodCalcID', '=', row.periodSalaryID)
        .where('ID', '!=', row.ID)
        .where(`((flagsRec & 8 = 8) and (flagsRec & 512 = 0))`, 'custom')
        .orderBy('ID')
        .selectAsObject()
      const execParams = {
        ID: row.ID,
        linkToParentID: null
      }
      if (parentAccruals.length) {
        if (parentAccruals.length === 1) {
          execParams.linkToParentID = parentAccruals[0].ID
        } else {
          const parentAccrual = parentAccruals.find(o => o.paySum >= (-1 * row.paySum))
          if (parentAccrual) {
            execParams.linkToParentID = parentAccrual.ID
          } else {
            execParams.linkToParentID = parentAccruals[0].ID
          }
        }
      } else {
        parentAccruals = UB.Repository('hr_accrual')
          .attrs(['ID', 'paySum', 'orgID', 'employeeNumberID', 'payElID', 'linkToParentID', 'periodCalc', 'periodCalcID', 'periodSalary', 'periodSalaryID', 'payElID.methodID.methodGroupID.code'])
          .where('employeeNumberID', '=', row.employeeNumberID)
          .where('orgID', '=', orgID)
          .where('payElID', '=', row.payElID)
          .where('periodSalaryID', '=', row.periodSalaryID)
          .where('periodCalc', '<=', row.periodSalary)
          .where('ID', '!=', row.ID)
          .where(`((flagsRec & 8 = 8) and (flagsRec & 512 = 0))`, 'custom')
          .orderBy('periodCalc')
          .selectAsObject()
        if (parentAccruals.length) {
          if (parentAccruals.length === 1) {
            execParams.linkToParentID = parentAccruals[0].ID
          } else {
            const parentAccrual = parentAccruals.find(o => o.paySum >= (-1 * row.paySum))
            if (parentAccrual) {
              execParams.linkToParentID = parentAccrual.ID
            } else {
              execParams.linkToParentID = parentAccruals[0].ID
            }
          }
        }
      }
      if (execParams.linkToParentID) {
        accStore.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          isImport: true,
          execParams
        })
      }
    })
  })
}

me.changeDepartmentKtID2ClID = function () {
  const depData = UB.Repository('ac_integrateMap')
    .attrs('ID', 'externalID')
    .where('entityName', '=', 'hr_department')
    .where('extrnlSystmCode', '=', 'EXPRESS')
    .selectAsObject()
  const ktClData = UB.Repository('ac_integrateMap')
    .attrs('internalID', 'externalID')
    .where('entityName', '=', 'ktID2clID')
    .where('extrnlSystmCode', '=', 'EXPRESS')
    .selectAsObject()
  const kt2cl = {}
  ktClData.forEach(o => {
    kt2cl[o['internalID']] = o['externalID']
  })
  const store = UB.DataStore('ac_integrateMap')
  depData.forEach(row => {
    if (kt2cl[row['externalID']]) {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        execParams: {
          ID: row['ID'],
          externalID: kt2cl[row['externalID']]
        }
      })
    } else {
      store.run('delete', {
        execParams: {
          ID: row['ID']
        }
      })
    }
  })
}

me.timeSheetTarifications = (ctx) => {
  const timService = require('../HR/modules/timService')
  const mParams = ctx.mParams
  const onDate = dateService.todayDate()
  const storeTimeSheet = UB.DataStore('tim_timeSheet')
  const rules = UB.Repository('hr_dictTimeCostInt')
    .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
    .selectAsObject()
  const orgIDs = mParams.childOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]

  orgIDs.forEach(orgID => {
    const period = periodService.getCurrentPeriod(orgID)
    const employeeNumbers = mParams.tabNums ? UB.Repository('hr_employeeNumber')
      .attrs(['ID'])
      .whereIf(orgIDs, 'orgID', 'in', orgIDs)
      .where('tabNum', 'in', mParams.tabNums.replace(/ /g, '').split(','))
      .selectAsObject().map(o => o.ID) : null
    let timeSheets = UB.Repository('tim_timeSheet')
      .attrs(['*', 'orderID.orderClass.entityName'])
      .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
      .where('employeeNumberID.orgID', '=', orgID)
      .where('employeeNumberID.mainEmpNumberID', 'isNull')
      .where('isActive', '=', 1)
      .where('isCorrection', '=', 1, 'corr')
      .where('orderID.orderClass.entityName', '=', 'hr_empOrderUni', 'uni')
      .logic('([corr] OR [uni])')
      .orderBy('employeeNumberID')
      .selectAsObject()

    let employeeNumberID
    let workPlaceEmployeeNumbers = []
    let employeePositions = []
    let workPlaceEmployeePositions = []
    timeSheets.forEach(timeSheet => {
      if (employeeNumberID !== timeSheet.employeeNumberID) {
        employeeNumberID = timeSheet.employeeNumberID
        workPlaceEmployeeNumbers = UB.Repository('hr_employeeNumberS')
          .attrs(['ID', 'empDictPositionID', 'dateFrom', 'dateTo'])
          .where('mainEmpNumberID', '=', timeSheet.employeeNumberID)
          .selectAsObject()
        employeePositions = workPlaceEmployeeNumbers.length
          ? UB.Repository('hr_employeePositionS')
            .attrs(['ID', 'dictPositionID', 'dateFrom', 'dateTo', 'employeeNumberID.description'])
            .where('employeeNumberID', '=', timeSheet.employeeNumberID)
            .selectAsObject()
          : []
        workPlaceEmployeePositions = workPlaceEmployeeNumbers.length
          ? UB.Repository('hr_employeePositionS')
            .attrs(['ID', 'dictPositionID', 'employeeNumberID', 'dateFrom', 'dateTo'])
            .where('employeeNumberID', 'in', workPlaceEmployeeNumbers.map(o => o.ID))
            .selectAsObject()
          : []
      }
      if (workPlaceEmployeeNumbers.length) {
        timeSheet.dateWork = dateService.shiftDate(timeSheet.dateWork)
        const employeePosition = employeePositions.find(o => dateService.shiftDate(o.dateFrom) <= timeSheet.dateWork && dateService.shiftDate(o.dateTo) >= timeSheet.dateWork)
        if (employeePosition && employeePosition.dictPositionID) {
          const workPlaceEmployeePosition = workPlaceEmployeePositions.find(o => o.dictPositionID === employeePosition.dictPositionID && dateService.shiftDate(o.dateFrom) <= timeSheet.dateWork && dateService.shiftDate(o.dateTo) >= timeSheet.dateWork)
          if (workPlaceEmployeePosition && !UB.Repository('tim_timeSheet')
            .attrs(['ID', 'orderID.orderClass.entityName'])
            .where('employeeNumberID', '=', workPlaceEmployeePosition.employeeNumberID)
            .where('dateWork', '=', timeSheet.dateWork)
            .where('orderID', '=', timeSheet.orderID)
            .where('isCorrection', '=', timeSheet.isCorrection)
            .selectSingle()) {
            timeSheet.ID = storeTimeSheet.generateID()
            timeSheet.employeeNumberID = workPlaceEmployeePosition.employeeNumberID
            delete timeSheet['orderID.orderClass.entityName']
            delete timeSheet.mi_createUser
            delete timeSheet.mi_createDate
            delete timeSheet.mi_deleteDate
            delete timeSheet.mi_deleteUser
            delete timeSheet.mi_modifyDate
            delete timeSheet.mi_modifyUser
            storeTimeSheet.run('insert', { execParams: timeSheet })
            if (timeSheet.isActive) {
              timService.changeActiveByDateWork(workPlaceEmployeePosition.employeeNumberID, timeSheet.dateWork, rules)
            }
          }
        }
      }
    })
  })
}
me.corectionSheetChange = (ctx) => {
  const timeSheetService = require('../TIM/modules/timeSheetService')
  const calendarService = require('../HR/modules/calendarService')
  const mParams = ctx.mParams
  const periodFrom = mParams.periodFromID ? periodService.getPeriod(mParams.periodFromID) : null
  const periodTo = mParams.periodToID ? periodService.getPeriod(mParams.periodToID) : null
  const periodDateFrom = periodFrom ? periodFrom.dateFrom : dateService.minDate()
  const periodDateTo = periodTo ? periodTo.dateTo : dateService.maxDate()
  const onDate = dateService.todayDate()
  const storeTimeSheet = UB.DataStore('tim_timeSheet')
  const orgIDs = mParams.childOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]

  const removeAttrs = ['orderID', 'typeSheetChange']
  orgIDs.forEach(orgID => {
    const holidays = calendarService.getHolidays(periodDateFrom, periodTo ? dateService.addDays(periodDateTo, 1) : periodDateTo, orgID)
    const employeeNumbers = mParams.tabNums ? UB.Repository('hr_employeeNumber')
      .attrs(['ID'])
      .whereIf(orgIDs, 'orgID', 'in', orgIDs)
      .where('tabNum', 'in', mParams.tabNums.replace(/ /g, '').split(','))
      .selectAsObject().map(o => o.ID) : null
    const timeSheetChanges = UB.Repository('hr_timeSheetChangeEmp')
      .attrs(['timeSheetChangeID', 'timeSheetChangeID.orderID', 'timeSheetChangeID.periodID',
        'timeSheetChangeID.paraID', 'timeSheetChangeID.periodID.dateFrom', 'employeeNumberID', 'timeSheetChangeID.typeSheetChange',
        'timeSheetChangeID.dateFrom', 'timeSheetChangeID.dateTo', 'timeSheetChangeID.method', 'timeSheetChangeID.hoursMinus',
        'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID.description'
      ])
      .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
      .where('timeSheetChangeID.organizationID', '=', orgID)
      .where('timeSheetChangeID.orderState', '=', 'POSTED')
      .where('timeSheetChangeID.typeSheetChange', '<>', '4')
      .where('timeSheetChangeID.dateFrom', '<=', periodDateTo)
      .where('timeSheetChangeID.dateTo', '>=', periodDateFrom)
      .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('employeeNumberID')
      .selectAsObject()
    const positions = timeSheetChanges.length ? UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'workScheduleID', 'workScheduleID.isMtCount', 'employeeNumberID', 'employeeNumberID.dateFrom', 'dictPositionID',
        'employeeNumberID.dateTo', 'dateFrom', 'dateTo', 'isFactWorkSchedule', 'mtCount', 'orderID', 'employeeNumberID.mainEmpNumberID' ])
      .where('organizationID', '=', orgID)
      .where('employeeNumberID', 'in', timeSheetChanges.map(o => o.employeeNumberID))
      .orderBy('employeeNumberID')
      .orderBy('dateFrom')
      .selectAsObject() : []
    const empPosition = {}
    const workSchedules = []
    positions.forEach(pos => {
      if (!empPosition[pos.employeeNumberID]) {
        empPosition[pos.employeeNumberID] = []
      }
      pos.dateFrom = dateService.shiftDate(pos.dateFrom)
      pos.dateTo = dateService.shiftDate(pos.dateTo)
      empPosition[pos.employeeNumberID].push(pos)
      if (pos.workScheduleID && !workSchedules.includes(pos.workScheduleID)) {
        workSchedules.push(pos.workScheduleID)
      }
    })
    const planByOrgID = settingsService.getByCode('hrUsePlanByOrg', orgID)
    let allPlans = UB.Repository('tim_plan')
      .attrs(['ID', 'workScheduleID', 'workScheduleDaysID.numDay', 'workScheduleID.planScheduleID', 'workScheduleID.normScheduleID',
        'dayDate', 'dictTimeCostID', 'dictTimeCostID.timeCostType', 'workHours', 'nightHours', 'eveningHours', 'isMtCount', 'harmHours', 'dopHours',
        'workScheduleID.maxMtCount'
      ])
      .where('dayDate', '>=', periodDateFrom)
      .where('dayDate', '<=', periodDateTo)
      .where('organizationID', '=', planByOrgID || orgID)
      .where('workScheduleID', 'in', workSchedules)
      .orderBy('dayDate')
      .selectAsObject({
        'workScheduleDaysID.numDay': 'numDay',
        'dictTimeCostID.timeCostType': 'timeCostType',
        'workScheduleID.planScheduleID': 'planScheduleID',
        'workScheduleID.normScheduleID': 'normScheduleID',
        'workScheduleID.maxMtCount': 'maxMtCount'
      })
    const plans = {}
    allPlans.forEach(pl => {
      if (!plans[pl.workScheduleID]) {
        plans[pl.workScheduleID] = []
      }
      pl.dayDate = dateService.shiftDate(pl.dayDate)
      plans[pl.workScheduleID].push(pl)
    })
    timeSheetChanges.forEach(timeSheetChange => {
      const changeDataFrom = dateService.shiftDate(Math.max(periodDateFrom, dateService.shiftDate(timeSheetChange['timeSheetChangeID.dateFrom']), dateService.shiftDate(timeSheetChange['employeeNumberID.dateFrom'])))
      const changeDataTo = dateService.shiftDate(Math.max(periodDateTo, dateService.shiftDate(timeSheetChange['timeSheetChangeID.dateTo']), dateService.shiftDate(timeSheetChange['employeeNumberID.dateTo'])))
      let position = _.clone(empPosition[timeSheetChange.employeeNumberID][0])
      const timeSheets = UB.Repository('tim_timeSheet')
        .attrs(['*'])
        .where('employeeNumberID', '=', timeSheetChange.employeeNumberID)
        .where('orderID', '=', timeSheetChange.timeSheetChangeID)
        .where('isCorrection', '=', 1)
        .selectAsObject()
      if (timeSheets.length) {
        const empTimeSheetChanges = timeSheetService.getEmpTimeSheetChange([timeSheetChange], changeDataFrom, changeDataTo, allPlans, position.workScheduleID, empPosition[timeSheetChange.employeeNumberID], orgID, holidays)

        timeSheets.forEach(timeSheet => {
          const correctRow = Object.assign({}, timeSheet)
          removeAttrs.forEach(attrName => {
            delete correctRow[attrName]
          })
          correctRow.ID = storeTimeSheet.generateID()
          correctRow.isSchedule = 0
          correctRow.isCorrection = 1
          storeTimeSheet.run('insert', { execParams: correctRow })
          timeSheet.dateWork = dateService.shiftDate(timeSheet.dateWork)
          const dateTime = timeSheet.dateWork.getTime()
          const dayChange = empTimeSheetChanges.find(o => o.dateWork.getTime() === dateTime)
          const updateTimeSheet = {
            ID: timeSheet.ID,
            isCorrection: 0,
            isActive: 0
          }
          if (dayChange) {
            const pos = empPosition[timeSheet.employeeNumberID].find(o => o.dateFrom <= timeSheet.dateWork && o.dateTo >= timeSheet.dateWork)
            const workScheduleID = pos ? pos.workScheduleID : position.workScheduleID
            const plan = (plans[workScheduleID] || []).find(o => o.dayDate.getTime() === dateTime)
            if (plan) {
              let mtCount = pos ? (pos['workScheduleID.isMtCount'] ? (pos.mtCount || 1) : 1) : (position['workScheduleID.isMtCount'] ? (position.mtCount || 1) : 1)
              const factHour = (dayChange.notChangeHoursWork ? plan.workHours : dayChange.hoursWork)
              const factHourNight = (dayChange.notChangeHoursWork ? plan.nightHours : (plan.nightHours > factHour ? factHour : plan.nightHours))
              const factHourEvening = (dayChange.notChangeHoursWork ? plan.eveningHours : (plan.eveningHours > (factHour - factHourNight) ? factHour - factHourNight : plan.eveningHours))
              updateTimeSheet.factTimeCostID = dayChange.dictTimeCostID
              updateTimeSheet.factHour = factHour * mtCount
              updateTimeSheet.factHourNight = factHourNight * mtCount
              updateTimeSheet.factHourEvening = factHourEvening * mtCount
              updateTimeSheet.factHourHarmful = ((plan.harmHours || 0) * mtCount)
              updateTimeSheet.factHourDop = (plan.dopHours || 0) * mtCount
              updateTimeSheet.factHourPlus = 0
            }
          }
          storeTimeSheet.run('update', { __skipOptimisticLock: true, execParams: updateTimeSheet })
        })
      }
    })
  })
}

me.corectionMissionTimeSheet = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.periodFromID || !mParams.periodToID) {
    return
  }
  const periodFrom = mParams.periodFromID ? periodService.getPeriod(mParams.periodFromID) : null
  const periodTo = mParams.periodToID ? periodService.getPeriod(mParams.periodToID) : null

  const periodDateFrom = periodFrom ? periodFrom.dateFrom : null
  const periodDateTo = periodTo ? periodTo.dateTo : null

  if (periodDateFrom && periodDateTo) {
    const onDate = dateService.todayDate()
    const orgIDs = mParams.childOrg
      ? UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject().map(o => o.mi_data_id)
      : [mParams.orgID]

    const employeeNumbers = mParams.tabNums ? UB.Repository('hr_employeeNumber')
      .attrs(['ID'])
      .whereIf(orgIDs, 'orgID', 'in', orgIDs)
      .where('tabNum', 'in', mParams.tabNums.replace(/ /g, '').split(','))
      .selectAsObject().map(o => o.ID) : null

    const timeSheet = UB.Repository('tim_timeSheet')
      .attrs(['ID', 'employeeNumberID', 'planID', 'planTimeCostID', 'planHour', 'planHourNight', 'planHourEvening', 'orderID',
        'isSchedule', 'isCorrection', 'isActive', 'factHour', 'factHourNight', 'factHourEvening', 'factTimeCostID',
        'dateWork', 'isCanceled'])
      .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
      .whereIf(!employeeNumbers, 'employeeNumberID.orgID', 'in', orgIDs)
      .where('dateWork', '>=', periodDateFrom)
      .where('dateWork', '<=', periodDateTo)
      .orderBy('dateWork')
      .selectAsObject()
    timeSheet.forEach(row => {
      row['dateWork'] = dateService.shiftDate(row['dateWork'])
    })

    const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
      .attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'payElID', 'orderID', 'empOrderID', 'isAvg',
        'payElID.dictTimeCostAvgID', 'payElID.dictTimeCostWorkID', 'orderRegistryID.periodID', 'periodCalcID'
      ])
      .where('empOrderID.empOrderType', '=', 'MISSION')
      .where('orderID.orderState', '=', 'POSTED')
      .whereIf(employeeNumbers, 'employeeNumberID', 'in', employeeNumbers)
      .whereIf(!employeeNumbers, 'employeeNumberID.orgID', 'in', orgIDs)
      .where('dateFrom', '<=', periodDateTo)
      .where('dateTo', '>=', periodDateFrom)
      .misc({ __skipRls: true })
      .selectAsObject()

    const timeSheetParams = []
    const timeSheetCanceled = []
    orderRegistryDt.forEach(row => {
      let date = dateService.shiftDate(Math.max(dateService.shiftDate(row.dateFrom), periodDateFrom))
      let dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(row.dateTo), periodDateTo))
      while (date <= dateTo) {
        const timeSheetDayByOrder = timeSheet.find(o => o.dateWork.getTime() === date.getTime() && o.employeeNumberID === row['employeeNumberID'] && o.orderID === row['orderID'])
        if (!timeSheetDayByOrder) {
          const timeSheetDay = timeSheet.find(o => o.dateWork.getTime() === date.getTime() && o.employeeNumberID === row['employeeNumberID'] && o.orderID === row['empOrderID'])
          if (timeSheetDay) {
            const item = {
              orderID: row['orderID'],
              entityName: 'hr_docRegBusinessTrip',
              employeeNumberID: row.employeeNumberID,
              periodID: row.periodCalcID,
              createPeriodID: row.periodCalcID,
              dateWork: date,
              factTimeCostID: row.isAvg ? row['payElID.dictTimeCostAvgID'] : row['payElID.dictTimeCostWorkID'],
              factHour: row.isAvg ? 0 : (timeSheetDay.planHour || 0)
            }
            timeSheetParams.push(item)
            if (timeSheetDay.isCanceled) {
              timeSheetCanceled.push(item)
            }
          }
        }
        date = dateService.nextDay(date)
      }
    })
    if (timeSheetParams.length) {
      timService.setTimeSheet(timeSheetParams)
    }
    if (timeSheetCanceled.length) {
      const storeTimeSheet = UB.DataStore('tim_timeSheet')
      const rules = UB.Repository('hr_dictTimeCostInt')
        .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
        .selectAsObject()
      timeSheetCanceled.forEach(item => {
        storeTimeSheet.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: item.ID,
            isActive: 0,
            periodID: item.periodID,
            createPeriodID: item.createPeriodID,
            canceledPeriodID: item.canceledPeriodID,
            isCanceled: 1
          }
        })
        timService.changeActiveByDateWork(item.employeeNumberID, item.dateWork, rules)
      })
      storeTimeSheet.freeNative()
    }
  }
}

me.deleteOrgDep = (ctx) => {
  const mParams = ctx.mParams
  const onDate = mParams.onDate ? dateService.shiftDate(mParams.onDate) : dateService.todayDate()
  const store = UB.DataStore('org_department')
  const orgIDs = !mParams.allOrg ? (mParams.childOrg
    ? UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.orgID}/%`)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject().map(o => o.mi_data_id)
    : [mParams.orgID]) : []

  store.execSQL(`UPDATE gl_dimValue set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where ID in (
  SELECT d.ID FROM org_department d
  WHERE d.mi_deleteUser is NULL
   AND NOT EXISTS (SELECT 1 FROM hr_department hd WHERE hd.mi_data_id = d.ID AND hd.state = 'ACTIVE'
   AND hd.mi_dateTo >= :onDate: AND hd.mi_deleteUser IS NULL
      ${!mParams.allOrg ? `and hd.orgID${entityBaseService.getInExpression('orgIDs')}` : ''} )
  ${!mParams.allOrg ? `and d.organizationID${entityBaseService.getInExpression('orgIDs')}` : ''} 
   )`,
  { deleteDate: new Date(), userID: Session.uData.userID, ID: mParams.sourceID, orgIDs, onDate })
  store.execSQL(`UPDATE org_unit set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where ID in (
  SELECT d.ID FROM org_department d
  WHERE d.mi_deleteUser is NULL
   AND NOT EXISTS (SELECT 1 FROM hr_department hd WHERE hd.mi_data_id = d.ID AND hd.state = 'ACTIVE'
   AND hd.mi_dateTo >= :onDate: AND hd.mi_deleteUser IS NULL
      ${!mParams.allOrg ? `and hd.orgID${entityBaseService.getInExpression('orgIDs')}` : ''} )
  ${!mParams.allOrg ? `and d.organizationID${entityBaseService.getInExpression('orgIDs')}` : ''} 
   )`,
  { deleteDate: new Date(), userID: Session.uData.userID, ID: mParams.sourceID, orgIDs, onDate })
  store.execSQL(`UPDATE org_department set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where ID in (
  SELECT d.ID FROM org_department d
  WHERE d.mi_deleteUser is NULL
   AND NOT EXISTS (SELECT 1 FROM hr_department hd WHERE hd.mi_data_id = d.ID AND hd.state = 'ACTIVE'
   AND hd.mi_dateTo >= :onDate: AND hd.mi_deleteUser IS NULL
   ${!mParams.allOrg ? `and hd.orgID${entityBaseService.getInExpression('orgIDs')}` : ''} )
  ${!mParams.allOrg ? `and d.organizationID${entityBaseService.getInExpression('orgIDs')}` : ''} 
   )`,
  { deleteDate: new Date(), userID: Session.uData.userID, ID: mParams.sourceID, orgIDs, onDate })
  store.execSQL(`UPDATE org_employeeonstaff set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate:
   where mi_deleteUser IS NULL 
   AND NOT EXISTS (SELECT 1 FROM hr_employeePosition hd WHERE hd.ID = org_employeeonstaff.ID 
   AND hd.dateTo >= :onDate: AND hd.mi_deleteUser IS NULL
   ${!mParams.allOrg ? `and hd.organizationID${entityBaseService.getInExpression('orgIDs')}` : ''} )
  ${!mParams.allOrg ? `and org_employeeonstaff.organizationID${entityBaseService.getInExpression('orgIDs')}` : ''} 
   
  `,
  { deleteDate: new Date(), userID: Session.uData.userID, ID: mParams.sourceID, orgIDs, onDate })

  const staffUnitStore = UB.DataStore('org_staffunit')
  store.runSQL(`SELECT s.ID "ID" from org_staffunit s
where s.mi_deleteUser is null 
 ${!mParams.allOrg ? `and s.organizationID${entityBaseService.getInExpression('orgIDs')}` : ''} 
 AND NOT EXISTS (SELECT 1 FROM org_employeeonstaff es WHERE es.staffUnitID = s.ID AND es.mi_deleteUser is null )`, {
    orgIDs
  })
  const deleteStaffUnits = store.getAsJsObject()
  deleteStaffUnits.forEach(row => {
    staffUnitStore.run('delete', {
      execParams: {
        ID: row['ID']
      }
    })
  })

  const staffunits = UB.Repository('org_staffunit').attrs(['ID'])
    .whereIf(!mParams.allOrg, 'organizationID', 'in', orgIDs)
    .selectAsObject()

  staffunits.forEach(row => {
    staffUnitStore.run('update', {
      fieldList: [],
      caller: 'org_employeeonstaff',
      execParams: {
        ID: row.ID,
        [`caption_${App.defaultLang}^`]: ''
      },
      __skipOptimisticLock: true
    })
  })
}

me.fixPosOrg = (ctx) => {
  const mParams = ctx.mParams
  const sLang = global['hr_employeePosition'].entity.connectionConfig.supportLang
  const deleteStaffunit = []
  const storeStaffunit = UB.DataStore('org_staffunit')
  const storeEmployeeonstaff = UB.DataStore('org_employeeonstaff')
  const employeeonstaffs = UB.Repository('org_employeeonstaff')
    .attrs(['ID', 'organizationID', 'staffUnitID', 'staffUnitID.parentID', 'staffUnitID.professionID', 'staffUnitID.name', 'staffUnitID.fullName'])
    .whereIf(!mParams.allOrg, 'organizationID', '=', mParams.orgID)
    .selectAsObject()

  employeeonstaffs.forEach(employeeonstaff => {
    if (!deleteStaffunit.find(o => o === employeeonstaff.staffUnitID)) {
      deleteStaffunit.push(employeeonstaff.staffUnitID)
    }
    const staffUnitID = storeStaffunit.generateID()
    const execParams = {
      ID: staffUnitID,
      organizationID: employeeonstaff.organizationID,
      parentID: employeeonstaff['staffUnitID.parentID'],
      professionID: employeeonstaff['staffUnitID.professionID'],
      name: employeeonstaff['staffUnitID.name'],
      fullName: employeeonstaff['staffUnitID.fullName']
    }
    sLang.forEach(lang => {
      const suffix = '_' + lang + '^'
      execParams['name' + suffix] = employeeonstaff['staffUnitID.name']
    })
    storeStaffunit.run('insert', {
      __skipOptimisticLock: true,
      entity: 'org_staffunit',
      execParams
    })

    storeEmployeeonstaff.run('update', {
      entity: 'org_employeeonstaff',
      __skipOptimisticLock: true,
      execParams: {
        ID: employeeonstaff.ID,
        staffUnitID
      }
    })
  })
  deleteStaffunit.forEach(ID => {
    storeStaffunit.run('delete', {
      __skipOptimisticLock: true,
      entity: 'org_staffunit',
      execParams: { ID }
    })
  })
}
