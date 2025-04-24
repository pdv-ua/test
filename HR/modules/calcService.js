const UB = require('@unitybase/ub')
const App = UB.App
const rlService = require('../modules/rlService')
const periodService = require('../../HR/modules/periodService')
const accrualService = require('../../HR/modules/accrualService')
const dateService = require('../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')

module.exports = {
  runNextElementQueue,
  addCalcQueue,
  addCalcPlanQueue,
  runNextElementPlanQueue,
  addCalcTimeSheetQueue,
  runNextElementTimeSheetQueue
}

function runNextElementQueue () {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const storeCalcOrgState = UB.DataStore('hr_calcOrgState')
  let firstCalcQueue = UB.Repository('hr_calcQueue')
    .attrs(['ID', 'orgID', 'employeeNumberID', 'empOrganizationID', 'allOrganization', 'calcBalance'])
    .orderByDesc('allOrganization')
    .orderByDesc('orgID')
    .orderByDesc('calcBalance')
    .limit(1)
    .selectSingle()
  const hrOffRecalculate = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'hrOffRecalculate')
    .selectScalar()
  while (firstCalcQueue) {
    const store = UB.DataStore('hr_calcQueue')
    if (firstCalcQueue.allOrganization) {
      const runQuery = () => {
        store.execSQL(`UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate: `, { modifyDate: new Date((new Date()).setMilliseconds(0)) })
        store.execSQL(`DELETE FROM hr_calcQueue `, {})
        storeCalcOrgState.execSQL(` UPDATE hr_calcOrgState SET flags = 0 WHERE flags = 1`)
      }
      try {
        db.savepointWrap(runQuery)
        App.dbCommit()
      } catch (error) {
        console.error(error)
      }
      store.runSQL(`SELECT mi_data_id AS "ID" FROM hr_organization WHERE state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' GROUP BY mi_data_id `, {})
      const orgData = store.getAsJsObject()
      orgData.forEach(organization => {
        const hrOffRecalculateOrg = UB.Repository('ac_settingsOrg')
          .attrs(['value'])
          .where('organizationID', '=', organization.ID)
          .where('constantID.code', '=', 'hrOffRecalculate')
          .selectScalar()
        if (!((hrOffRecalculate === '1' && hrOffRecalculateOrg !== '0') || (hrOffRecalculateOrg === '1'))) {
          const period = periodService.getCurrentPeriod(organization.ID)
          if (period.ID) {
            store.runSQL(`SELECT ns.ID "ID", en.ID AS "employeeNumberID", ns.mi_modifyDate "mi_modifyDate", ns.flags
                   FROM hr_employeeNumber en
                   LEFT JOIN hr_employeeNumState ns ON en.ID = ns.employeeNumberID
                   WHERE en.orgID = :orgID: AND ((en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom:) 
                   ${period.priorPeriodID ? ` OR (EXISTS (select 1 from hr_accrualBalance b where b.employeeNumberID = en.ID and b.periodCalcID = :priorPeriodID: and b.sumTo <> 0))` : ''})
                   AND en.empWorkPlace is null 
                   AND NOT EXISTS (SELECT 1 from hr_employeePosition p where p.employeeNumberID = en.ID and p.workPlace = '2' AND p.isActive = 1 AND p.dateFrom <= :dateTo: AND p.dateTo >= :dateFrom: 
           AND p.mi_deleteDate >= '9999-12-31') AND en.mi_deleteDate >= '9999-12-31'`,
            {
              orgID: organization.ID,
              dateFrom: dateService.addMonths(period.dateFrom, -3),
              dateTo: period.dateTo,
              priorPeriodID: period.priorPeriodID
            })
            const employeeNumbers = store.getAsJsObject()
            let payCalcID = rlService.startPayCalc(organization.ID, employeeNumbers.length, 0, `Черга перерахунку ЗП allOrganization orgID = ${organization.ID}`)
            console.log(`Початок розрахунку orgID = ${organization.ID} - Кількість ${employeeNumbers.length} - ${dateService.formatDate(new Date(), 'dd.mm.yyyy hh:nn:ss')}`, 'calc')
            accrualService.removeIncorrectAccrual({ orgID: organization.ID })
            App.dbCommit()
            let stopDate = rlService.autoCalculate({
              orgID: organization.ID,
              periodID: period.ID,
              payCalcID,
              employeeNumbers: employeeNumbers
            })
            console.log(`Кінець розрахунку orgID = ${organization.ID} - Кількість ${employeeNumbers.length} - ${dateService.formatDate(new Date(), 'dd.mm.yyyy hh:nn:ss')}`, 'calc')
            rlService.stopPayCalc(payCalcID, stopDate)
            if (period.nextPeriodID) {
              const recalcNumberNextPeriod = UB.Repository('hr_payCalcDateFrom')
                .attrs(['ID', 'employeeNumberID'])
                .where('periodCalcID', '=', period.nextPeriodID)
                .where('periodSalaryID', '=', period.nextPeriodID)
                .where('employeeNumberID', 'in', employeeNumbers.map(o => o.employeeNumberID))
                .selectAsObject()
              if (recalcNumberNextPeriod.length) {
                const nextPeriod = periodService.getPeriod(period.nextPeriodID)
                nextPeriod.isCurrent = 1
                payCalcID = rlService.startPayCalc(organization.ID, recalcNumberNextPeriod.length, 0, `Черга перерахунку ЗП allOrganization orgID = ${organization.ID} (майбутній період)`)
                stopDate = rlService.autoCalculate({
                  cont: { periodCalc: nextPeriod },
                  orgID: organization.ID,
                  periodID: period.nextPeriodID,
                  payCalcID,
                  employeeNumbers: recalcNumberNextPeriod,
                  calculateProperty: { calcType: 1 << 5 }
                })
                rlService.stopPayCalc(payCalcID, stopDate)
              }
            }
          }
        }
      })
    } else if (firstCalcQueue.orgID) {
      const runQuery = () => {
        store.execSQL(`DELETE FROM hr_calcQueue WHERE orgID = :orgID: OR empOrganizationID = :orgID: `, { orgID: firstCalcQueue.orgID })
        storeCalcOrgState.execSQL(` UPDATE hr_calcOrgState SET flags = 0 WHERE orgID = :orgID: AND flags = 1`, { orgID: firstCalcQueue.orgID })
      }
      try {
        db.savepointWrap(runQuery)
        App.dbCommit()
      } catch (error) {
        console.error(error)
      }
      const hrOffRecalculateOrg = UB.Repository('ac_settingsOrg')
        .attrs(['value'])
        .where('organizationID', '=', firstCalcQueue.orgID)
        .where('constantID.code', '=', 'hrOffRecalculate')
        .selectScalar()
      if (!((hrOffRecalculate === '1' && hrOffRecalculateOrg !== '0') || (hrOffRecalculateOrg === '1'))) {
        const period = periodService.getCurrentPeriod(firstCalcQueue.orgID)
        if (period.ID) {
          const runQuery2 = () => {
            store.execSQL(`UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate: 
        WHERE flags != 0 AND employeeNumberID IN (SELECT en.ID FROM hr_employeeNumber en  
        WHERE en.orgID = :orgID: AND en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom: 
        AND en.mi_deleteDate >= '9999-12-31')`,
            {
              modifyDate: new Date((new Date()).setMilliseconds(0)),
              orgID: firstCalcQueue.orgID,
              dateFrom: dateService.addMonths(period.dateFrom, -3),
              dateTo: period.dateTo
            })
          }
          try {
            db.savepointWrap(runQuery2)
            App.dbCommit()
          } catch (error) {
            console.error(error)
          }
          store.runSQL(` SELECT ns.ID "ID", en.ID AS "employeeNumberID", ns.mi_modifyDate "mi_modifyDate", ns.flags
                   FROM hr_employeeNumber en
                   LEFT JOIN hr_employeeNumState ns ON en.ID = ns.employeeNumberID
                   WHERE en.orgID = :orgID: AND ((en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom:)
                   ${period.priorPeriodID ? ` OR (EXISTS (select 1 from hr_accrualBalance b where b.employeeNumberID = en.ID and b.periodCalcID = :priorPeriodID: and b.sumTo <> 0))
                   OR (EXISTS (select 1 from hr_accrual a where a.employeeNumberID = en.ID and a.periodCalcID = :periodID:))` : ''})
                   AND en.empWorkPlace is null 
                   AND NOT EXISTS (SELECT 1 from hr_employeePosition p where p.employeeNumberID = en.ID and p.workPlace = '2' AND p.isActive = 1 AND p.dateFrom <= :dateTo: AND p.dateTo >= :dateFrom: 
           AND p.mi_deleteDate >= '9999-12-31')
                   AND en.mi_deleteDate >= '9999-12-31' 
                   `,
          {
            orgID: firstCalcQueue.orgID,
            dateFrom: dateService.addMonths(period.dateFrom, -3),
            dateTo: period.dateTo,
            priorPeriodID: period.priorPeriodID,
            periodID: period.ID
          })
          const employeeNumbers = store.getAsJsObject()
          accrualService.removeIncorrectAccrual({ orgID: firstCalcQueue.orgID })
          let payCalcID = rlService.startPayCalc(firstCalcQueue.orgID, employeeNumbers.length, 0, `Черга перерахунку ЗП orgID = ${firstCalcQueue.orgID}`)
          App.dbCommit()
          let stopDate = rlService.autoCalculate({
            orgID: firstCalcQueue.orgID,
            periodID: period.ID,
            payCalcID,
            employeeNumbers
          })
          rlService.stopPayCalc(payCalcID, stopDate)
          if (period.nextPeriodID) {
            const recalcNumberNextPeriod = UB.Repository('hr_payCalcDateFrom')
              .attrs(['ID', 'employeeNumberID'])
              .where('periodCalcID', '=', period.nextPeriodID)
              .where('periodSalaryID', '=', period.nextPeriodID)
              .where('employeeNumberID', 'in', employeeNumbers.map(o => o.employeeNumberID))
              .selectAsObject()
            if (recalcNumberNextPeriod.length) {
              const nextPeriod = periodService.getPeriod(period.nextPeriodID)
              nextPeriod.isCurrent = 1
              payCalcID = rlService.startPayCalc(firstCalcQueue.orgID, recalcNumberNextPeriod.length, 0, `Черга перерахунку ЗП orgID = ${firstCalcQueue.orgID} (майбутній період)`)
              stopDate = rlService.autoCalculate({
                cont: { periodCalc: nextPeriod },
                orgID: firstCalcQueue.orgID,
                periodID: period.nextPeriodID,
                payCalcID,
                employeeNumbers: recalcNumberNextPeriod,
                calculateProperty: { calcType: 1 << 5 }
              })
              rlService.stopPayCalc(payCalcID, stopDate)
            }
          }
        }
      }
    } else if (firstCalcQueue.empOrganizationID) {
      const hrOffRecalculateOrg = UB.Repository('ac_settingsOrg')
        .attrs(['value'])
        .where('organizationID', '=', firstCalcQueue.empOrganizationID)
        .where('constantID.code', '=', 'hrOffRecalculate')
        .selectScalar()
      const period = periodService.getCurrentPeriod(firstCalcQueue.empOrganizationID)
      store.runSQL(` SELECT cq.ID AS "cqID", ns.ID "ID", cq.employeeNumberID "employeeNumberID", ns.mi_modifyDate "mi_modifyDate", ns.flags, n.mainEmpNumberID "mainEmpNumberID"
                   FROM hr_calcQueue cq
                   LEFT JOIN hr_employeeNumState ns ON cq.employeeNumberID = ns.employeeNumberID
                   JOIN hr_employeeNumber n ON n.ID = cq.employeeNumberID
                   WHERE cq.empOrganizationID = :orgID:
                   ${firstCalcQueue.calcBalance ? ' and cq.calcBalance = 1 ' : ''}
                   ORDER BY cq.employeeNumberID `, { orgID: firstCalcQueue.empOrganizationID })
      const data = store.getAsJsObject()
      if (data.length) {
        const runQuery = () => {
          store.execSQL(`DELETE FROM hr_calcQueue WHERE ID${entityBaseService.getInExpression('removeIDs')}
           ${firstCalcQueue.calcBalance ? ' and calcBalance = 1 ' : ''}`,
          { removeIDs: data.map(o => o.cqID) })
          storeCalcOrgState.execSQL(` UPDATE hr_calcOrgState SET flags = 0 WHERE orgID = :orgID: AND flags = 1`, { orgID: firstCalcQueue.empOrganizationID })
          const employeeNumbers = []
          data.forEach(row => {
            if (row.ID/* && !row.mainEmpNumberID */) {
              employeeNumbers.push(row.ID)
            }
            if (row.mainEmpNumberID && !employeeNumbers.find(o => o === row.mainEmpNumberID)) {
              employeeNumbers.push(row.mainEmpNumberID)
            }
          })
          if (employeeNumbers.length) {
            store.execSQL(`UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate: 
            WHERE employeeNumberID${entityBaseService.getInExpression('employeeNumbers')}`,
            {
              employeeNumbers: employeeNumbers,
              modifyDate: new Date((new Date()).setMilliseconds(0))
            })
          }
        }
        try {
          db.savepointWrap(runQuery)
          App.dbCommit()
        } catch (error) {
          console.error(error)
        }
      }
      if (period && data.length && !((hrOffRecalculate === '1' && hrOffRecalculateOrg !== '0') || (hrOffRecalculateOrg === '1'))) {
        const employeeNumbers = []
        data.forEach((row, idx) => {
          if (idx === 0 || data[idx - 1].employeeNumberID !== row.employeeNumberID) {
            employeeNumbers.push(row)
          }
        })
        if (employeeNumbers.length) {
          const workPlace2 = UB.Repository('hr_employeePosition').attrs(['employeeID'])
            .where('organizationID', '=', firstCalcQueue.empOrganizationID)
            .where('employeeNumberID', 'in', employeeNumbers.map(o => o.employeeNumberID))
            .where('dateFrom', '<=', period.dateTo)
            .where('dateTo', '>=', period.dateFrom)
            .where('workPlace', '=', '2')
            .where('isActive', '=', 1)
            .groupBy('employeeID')
            .selectAsObject()
          if (workPlace2.length) {
            const workPlace1 = UB.Repository('hr_employeePosition').attrs(['employeeNumberID'])
              .where('organizationID', '=', firstCalcQueue.empOrganizationID)
              .where('employeeID', 'in', workPlace2.map(o => o.employeeID))
              .where('dateFrom', '<=', period.dateTo)
              .where('dateTo', '>=', period.dateFrom)
              .where('workPlace', '=', '1')
              .where('isActive', '=', 1)
              .groupBy('employeeNumberID')
              .selectAsObject()
            workPlace1.forEach(emp => {
              if (emp.employeeNumberID && !employeeNumbers.find(o => o.employeeNumberID === emp.employeeNumberID)) {
                employeeNumbers.push({ employeeNumberID: emp.employeeNumberID })
              }
            })
          }
        }
        let payCalcID = rlService.startPayCalc(firstCalcQueue.empOrganizationID, employeeNumbers.length, 0, `Черга перерахунку ЗП Працівники orgID = ${firstCalcQueue.empOrganizationID}`)
        App.dbCommit()
        let stopDate = firstCalcQueue.calcBalance
          ? rlService.autoCalculateBalance({ orgID: firstCalcQueue.empOrganizationID, periodID: period.ID, employeeNumbers })
          : rlService.autoCalculate({
            orgID: firstCalcQueue.empOrganizationID,
            periodID: period.ID,
            payCalcID,
            employeeNumbers
          })
        rlService.stopPayCalc(payCalcID, stopDate)
        if (period.nextPeriodID) {
          const recalcNumberNextPeriod = UB.Repository('hr_payCalcDateFrom')
            .attrs(['ID', 'employeeNumberID'])
            .where('periodCalcID', '=', period.nextPeriodID)
            .where('periodSalaryID', '=', period.nextPeriodID)
            .where('employeeNumberID', 'in', employeeNumbers.map(o => o.employeeNumberID))
            .selectAsObject()
          if (recalcNumberNextPeriod.length) {
            const nextPeriod = periodService.getPeriod(period.nextPeriodID)
            nextPeriod.isCurrent = 1
            payCalcID = rlService.startPayCalc(firstCalcQueue.empOrganizationID, recalcNumberNextPeriod.length, 0, `Черга перерахунку ЗП Працівники orgID = ${firstCalcQueue.empOrganizationID} (майбутній період)`)
            stopDate = rlService.autoCalculate({
              cont: { periodCalc: nextPeriod },
              orgID: firstCalcQueue.empOrganizationID,
              periodID: period.nextPeriodID,
              payCalcID,
              employeeNumbers: recalcNumberNextPeriod,
              calculateProperty: { calcType: 1 << 5 }
            })
            rlService.stopPayCalc(payCalcID, stopDate)
          }
        }
      }
    } else {
      const runQuery = () => {
        store.execSQL(` DELETE FROM hr_calcQueue WHERE ID = :ID: `, { ID: firstCalcQueue.ID })
      }
      try {
        db.savepointWrap(runQuery)
        App.dbCommit()
      } catch (error) {
        console.error(error)
      }
    }

    store.freeNative()
    global.gc()
    firstCalcQueue = UB.Repository('hr_calcQueue')
      .attrs(['ID', 'orgID', 'employeeNumberID', 'empOrganizationID', 'allOrganization'])
      .orderByDesc('allOrganization')
      .orderByDesc('orgID')
      .limit(1)
      .selectSingle()
  }
}

function addCalcQueue ({ orgID, employeeNumbers, allOrganization = false, calcBalance = 0, description = '', entityName }) {
  const store = UB.DataStore('hr_calcQueue')
  const storeLog = UB.DataStore('hr_calcQueueLog')
  const storeNumState = UB.DataStore('hr_employeeNumState')
  const storeCalcOrgState = UB.DataStore('hr_calcOrgState')
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  let logOrgID = null
  let allOrgCalc = 0
  let orgCalc = 0
  let numCount = null

  if (employeeNumbers && employeeNumbers.length && employeeNumbers[0]) {
    const organizationID = UB.Repository('hr_employeeNumberS').attrs(['orgID']).where('ID', '=', employeeNumbers[0]).selectScalar()
    const empNumIDs = UB.Repository('hr_employeeNumState')
      .attrs('employeeNumberID')
      .where('employeeNumberID', 'in', employeeNumbers)
      .where('flags', '=', '1')
      .selectAsObject()
    const runQuery = () => {
      if (empNumIDs.length) {
        storeNumState.execSQL(` UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate:
        WHERE employeeNumberID${entityBaseService.getInExpression('employeeNumbers')}`,
        { modifyDate: new Date((new Date()).setMilliseconds(0)), employeeNumbers: empNumIDs.map(o => o.employeeNumberID) })
      }
      const calcOrgStateID = UB.Repository('hr_calcOrgState')
        .attrs(['ID'])
        .where('orgID', '=', organizationID || 0)
        .where('flags', '=', 1)
        .selectScalar()
      if (calcOrgStateID) {
        storeCalcOrgState.execSQL(` UPDATE hr_calcOrgState SET flags = 0 WHERE ID = :calcOrgStateID:`,
          { calcOrgStateID })
      }
    }
    try {
      db.savepointWrap(runQuery)
    } catch (error) {
      console.error(error)
    }

    logOrgID = organizationID
    numCount = employeeNumbers.length
    const calcList = []
    employeeNumbers.forEach(employeeNumberID => {
      calcList.push({
        ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUE') : store.generateID(),
        empOrganizationID: organizationID,
        employeeNumberID,
        allOrganization: 0,
        calcBalance: calcBalance ? 1 : 0
      })
    })
    if (calcList.length) {
      if (App && App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
        store.execSQL(
          `INSERT INTO hr_calcQueue (ID,empOrganizationID,employeeNumberID,allOrganization,calcBalance)
         select * from OPENJSON(?) 
         WITH (  
         ID bigint '$.ID',
         empOrganizationID bigint '$.empOrganizationID',
         employeeNumberID bigint '$.employeeNumberID',
         allOrganization numeric(1) '$.allOrganization',
         calcBalance numeric(1) '$.calcBalance'
          )`, { p1: JSON.stringify(calcList) })
      } else {
        store.execSQL(
          `INSERT INTO hr_calcQueue (ID,empOrganizationID,employeeNumberID,allOrganization,calcBalance)(
        SELECT (data->>'ID')::BIGINT, 
        (data->>'empOrganizationID')::BIGINT, 
        (data->>'employeeNumberID')::BIGINT, 
        (data->>'allOrganization')::SMALLINT,
        (data->>'calcBalance')::SMALLINT
         FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(calcList) }
        )
      }
    }
  } else if (orgID) {
    logOrgID = orgID
    orgCalc = 1
    const runQuery = () => {
      storeCalcOrgState.execSQL(` UPDATE hr_calcOrgState SET flags = 0 WHERE orgID = :orgID: and flags = 1 `, { orgID })
    }
    try {
      db.savepointWrap(runQuery)
    } catch (error) {
      console.error(error)
    }
    store.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUE') : store.generateID(),
        orgID: orgID,
        allOrganization: false,
        calcBalance
      }
    })
  } else if (allOrganization) {
    allOrgCalc = 1
    const runQuery = () => {
      store.execSQL(` UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate: `, { modifyDate: new Date((new Date()).setMilliseconds(0)) })
      store.execSQL(` DELETE FROM hr_calcQueue `, {})
      storeCalcOrgState.execSQL(` UPDATE hr_calcOrgState SET flags = 0 WHERE flags = 1`, {})
    }
    try {
      db.savepointWrap(runQuery)
    } catch (error) {
      console.error(error)
    }
    store.runSQL(` SELECT mi_data_id AS "ID" FROM hr_organization WHERE state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' GROUP BY mi_data_id `, {})
    const orgData = store.getAsJsObject()
    const calcList = []

    orgData.forEach(organization => {
      calcList.push({
        ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUE') : store.generateID(),
        orgID: organization.ID,
        allOrganization: 0,
        calcBalance: calcBalance ? 1 : 0
      })
    })
    if (calcList.length) {
      if (App && App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
        store.execSQL(
          `INSERT INTO hr_calcQueue (ID,orgID,allOrganization,calcBalance)
         select * from OPENJSON(?) 
         WITH (  
         ID bigint '$.ID',
         orgID bigint '$.orgID',
         allOrganization numeric(1) '$.allOrganization',
         calcBalance numeric(1) '$.calcBalance'
          )`, { p1: JSON.stringify(calcList) })
      } else {
        store.execSQL(
          `INSERT INTO hr_calcQueue (ID,orgID,allOrganization,calcBalance)(
        SELECT (data->>'ID')::BIGINT, 
        (data->>'orgID')::BIGINT, 
        (data->>'allOrganization')::SMALLINT,
        (data->>'calcBalance')::SMALLINT
         FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(calcList) }
        )
      }
    }
  }

  storeLog.run('insert', {
    __skipOptimisticLock: true,
    __skipSelectAfterInsert: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUELOG') : storeLog.generateID(),
      actionTime: new Date(),
      orgID: logOrgID,
      actionType: '1',
      allOrgCalc,
      orgCalc,
      numCount,
      calcBalance,
      description: `${description || ''}${entityName ? ` ${(App.domainInfo.entities[entityName] || {}).description}` : ''}`
    }
  })
  store.freeNative()
}

function addCalcPlanQueue ({ orgID, workScheduleID, description, entityName }) {
  const store = UB.DataStore('hr_calcPlanQueue')
  const storeLog = UB.DataStore('hr_calcQueueLog')
  store.run('insert', {
    __skipOptimisticLock: true,
    __skipSelectAfterInsert: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCPLANQUEUE') : store.generateID(),
      orgID: orgID || null,
      workScheduleID: workScheduleID || null,
      description: description || null
    }
  })
  storeLog.run('insert', {
    __skipOptimisticLock: true,
    __skipSelectAfterInsert: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUELOG') : storeLog.generateID(),
      actionTime: new Date(),
      orgID: orgID || null,
      actionType: '3',
      allOrgCalc: false,
      orgCalc: (!workScheduleID),
      numCount: null,
      calcBalance: false,
      description: `${description || ''}${entityName ? ` ${(App.domainInfo.entities[entityName] || {}).description}` : ''}`
    }
  })
}

function runNextElementPlanQueue () {
  const timeSheetService = require('../../TIM/modules/timeSheetService')
  let firstCalcQueue = UB.Repository('hr_calcPlanQueue')
    .attrs(['ID', 'orgID', 'workScheduleID', 'description'])
    .orderBy('workScheduleID')
    .orderBy('orgID')
    .limit(1)
    .selectSingle()

  while (firstCalcQueue) {
    const store = UB.DataStore('hr_calcPlanQueue')
    if (firstCalcQueue.orgID && firstCalcQueue.workScheduleID) {
      store.execSQL(` DELETE FROM hr_calcPlanQueue WHERE workScheduleID = :workScheduleID: AND orgID = :orgID: `,
        { workScheduleID: firstCalcQueue.workScheduleID, orgID: firstCalcQueue.orgID })
      App.dbCommit()
      const period = periodService.getCurrentPeriod(firstCalcQueue.orgID)
      if (period.ID) {
        timeSheetService.calcPlan({
          workScheduleID: firstCalcQueue.workScheduleID,
          organizationID: firstCalcQueue.orgID,
          calcDateFrom: dateService.firstDayOfYear(period.dateFrom),
          calcDateTo: dateService.lastDayOfYear(dateService.addMonths(period.dateTo, 12))
        })
      }
    } else if (!firstCalcQueue.orgID && firstCalcQueue.workScheduleID) {
      store.runSQL(` SELECT mi_data_id AS "ID" FROM hr_organization WHERE state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' GROUP BY mi_data_id `, {})
      store.execSQL(` DELETE FROM hr_calcPlanQueue WHERE workScheduleID = :workScheduleID: `, { workScheduleID: firstCalcQueue.workScheduleID })
      App.dbCommit()
      const orgData = store.getAsJsObject()
      orgData.forEach(organization => {
        const period = periodService.getCurrentPeriod(organization.ID)
        if (period.ID) {
          timeSheetService.calcPlan({
            workScheduleID: firstCalcQueue.workScheduleID,
            organizationID: organization.ID,
            calcDateFrom: dateService.firstDayOfYear(period.dateFrom),
            calcDateTo: dateService.lastDayOfYear(dateService.addMonths(period.dateTo, 12))
          })
          App.dbCommit()
        }
      })
    } else if (firstCalcQueue.orgID && !firstCalcQueue.workScheduleID) {
      const period = periodService.getCurrentPeriod(firstCalcQueue.orgID)
      store.execSQL(` DELETE FROM hr_calcPlanQueue WHERE orgID = :orgID: `, { orgID: firstCalcQueue.orgID })
      App.dbCommit()
      if (period.ID) {
        const workSchedules = UB.Repository('hr_workSchedule')
          .attrs(['ID', 'organizationID'])
          .selectAsObject()
        workSchedules.forEach(workShed => {
          timeSheetService.calcPlan({
            workScheduleID: workShed.ID,
            organizationID: firstCalcQueue.orgID,
            calcDateFrom: dateService.firstDayOfYear(period.dateFrom),
            calcDateTo: dateService.lastDayOfYear(dateService.addMonths(period.dateTo, 12)),
            runCalcTimeSheet: false
          })
        })
        addCalcTimeSheetQueue({ orgID: firstCalcQueue.orgID, description: firstCalcQueue.description })
      }
    } else if (!firstCalcQueue.orgID && !firstCalcQueue.workScheduleID) {
      store.runSQL(` SELECT mi_data_id AS "ID" FROM hr_organization WHERE state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' GROUP BY mi_data_id `, {})
      const orgData = store.getAsJsObject()
      const workSchedules = UB.Repository('hr_workSchedule').attrs(['ID', 'organizationID']).selectAsObject()
      store.execSQL(` DELETE FROM hr_calcPlanQueue `, {})
      App.dbCommit()
      orgData.forEach(organization => {
        const period = periodService.getCurrentPeriod(organization.ID)
        if (period.ID) {
          workSchedules.forEach(workShed => {
            if (workShed.organizationID === null || workShed.organizationID === organization.ID) {
              timeSheetService.calcPlan({
                workScheduleID: workShed.ID,
                organizationID: organization.ID,
                calcDateFrom: dateService.firstDayOfYear(period.dateFrom),
                calcDateTo: dateService.lastDayOfYear(dateService.addMonths(period.dateTo, 12)),
                runCalcTimeSheet: false
              })
              App.dbCommit()
            }
          })
          addCalcTimeSheetQueue({ orgID: organization.ID, description: firstCalcQueue.description })
        }
        App.dbCommit()
      })
    }
    try {
      store.execSQL(` DELETE FROM hr_calcPlanQueue WHERE ID = :ID: `, { ID: firstCalcQueue.ID })
      App.dbCommit()
    } catch (error) {
      console.error(error)
    }
    store.freeNative()
    global.gc()
    firstCalcQueue = UB.Repository('hr_calcPlanQueue')
      .attrs(['ID', 'orgID', 'workScheduleID'])
      .orderBy('workScheduleID')
      .orderBy('orgID')
      .limit(1)
      .selectSingle()
  }
}

function addCalcTimeSheetQueue ({ orgID, employeeNumberID, workScheduleID, description, entityName }) {
  const store = UB.DataStore('hr_calcTimeSheetQueue')
  const storeLog = UB.DataStore('hr_calcQueueLog')
  let employeeNumber
  if (employeeNumberID) {
    // const employeeNumbers = [employeeNumberID]
    employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['ID', 'orgID', 'mainEmpNumberID', 'description']).selectById(employeeNumberID)
    /* if (employeeNumber) {
      if (employeeNumber.mainEmpNumberID) {
        employeeNumbers.push(employeeNumber.mainEmpNumberID)
      } else {
        const childEmployeeNumbers = UB.Repository('hr_employeeNumberS')
          .attrs(['ID'])
          .where('orgID', '=', employeeNumber.orgID)
          .where('mainEmpNumberID', '=', employeeNumber.ID)
          .selectAsObject()
        childEmployeeNumbers.forEach(row => {
          employeeNumbers.push(row.ID)
        })
      }
    } */
    //  employeeNumbers.forEach(row => {
    store.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCTIMESHEETQUEUE') : store.generateID(),
        orgID: orgID || null,
        employeeNumberID: employeeNumberID || null,
        workScheduleID: workScheduleID || null,
        description: description || null
      }
    })
    // })
  } else {
    store.run('insert', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCTIMESHEETQUEUE') : store.generateID(),
        orgID: orgID || null,
        employeeNumberID: employeeNumberID || null,
        workScheduleID: workScheduleID || null,
        description: description || null
      }
    })
  }
  storeLog.run('insert', {
    __skipOptimisticLock: true,
    __skipSelectAfterInsert: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams: {
      ID: (App && App.dbConnections && App.dbConnections.DEFAULT) ? accrualService.getID('S_HR_CALCQUEUELOG') : storeLog.generateID(),
      actionTime: new Date(),
      orgID: orgID || (employeeNumber ? employeeNumber.orgID : null),
      actionType: '2',
      allOrgCalc: !(orgID || employeeNumberID),
      orgCalc: (!employeeNumberID && !workScheduleID),
      numCount: employeeNumberID ? 1 : null,
      calcBalance: false,
      description: `${description || ''}${entityName ? ` ${(App.domainInfo.entities[entityName] || {}).description}` : ''}${employeeNumber ? ` ${employeeNumber.description}` : ''}`
    }
  })
}

function runNextElementTimeSheetQueue () {
  const timeSheetService = require('../../TIM/modules/timeSheetService')
  let firstCalcQueue = UB.Repository('hr_calcTimeSheetQueue')
    .attrs(['ID', 'orgID', 'employeeNumberID', 'employeeNumberID.orgID', 'workScheduleID', 'description'])
    .orderBy('workScheduleID')
    .orderBy('orgID')
    .orderBy('employeeNumberID')
    .limit(1)
    .selectSingle()
  while (firstCalcQueue) {
    const store = UB.DataStore('hr_calcTimeSheetQueue')
    if (!firstCalcQueue.employeeNumberID && !firstCalcQueue.orgID) {
      try {
        if (!firstCalcQueue.workScheduleID) {
          store.execSQL(` DELETE FROM hr_calcTimeSheetQueue `, {})
        } else {
          store.execSQL(` DELETE FROM hr_calcTimeSheetQueue WHERE workScheduleID = :workScheduleID: `, { workScheduleID: firstCalcQueue.workScheduleID })
        }
        App.dbCommit()
      } catch (error) {
        console.error(error)
      }
      store.runSQL(` SELECT mi_data_id AS "ID" FROM hr_organization WHERE state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' GROUP BY mi_data_id `, {})
      const orgData = store.getAsJsObject()
      orgData.forEach(organization => {
        const period = periodService.getCurrentPeriod(organization.ID)
        if (period && period.ID) {
          const periods = [period.ID, period.nextPeriodID]
          periods.forEach(periodID => {
            timeSheetService.fillTimeSheet({
              organizationID: organization.ID,
              periodID: periodID,
              workScheduleID: firstCalcQueue.workScheduleID,
              checkPeriod: false,
              runCalc: false
            })
          })
          addCalcQueue({ orgID: organization.ID, description: firstCalcQueue.description || `(${UB.i18n('Переформування табеля по всім організаціям')})` })
        }
        App.dbCommit()
      })
    } else if (firstCalcQueue.orgID) {
      const period = periodService.getCurrentPeriod(firstCalcQueue.orgID)
      try {
        if (!firstCalcQueue.workScheduleID) {
          store.execSQL(` DELETE FROM hr_calcTimeSheetQueue WHERE orgID = :orgID: `, { orgID: firstCalcQueue.orgID })
        } else {
          store.execSQL(` DELETE FROM hr_calcTimeSheetQueue WHERE orgID = :orgID: AND workScheduleID = :workScheduleID: `,
            { orgID: firstCalcQueue.orgID, workScheduleID: firstCalcQueue.workScheduleID })
        }
        App.dbCommit()
      } catch (error) {
        console.error(error)
      }
      if (period && period.ID) {
        const periods = [period.ID, period.nextPeriodID]
        periods.forEach(periodID => {
          timeSheetService.fillTimeSheet({
            organizationID: firstCalcQueue.orgID,
            periodID: periodID,
            workScheduleID: firstCalcQueue.workScheduleID,
            checkPeriod: false,
            runCalc: false
          })
        })
        addCalcQueue({ orgID: firstCalcQueue.orgID, description: firstCalcQueue.description || `(${UB.i18n('Переформування табеля по організації')})` })
      }
    } else if (firstCalcQueue.employeeNumberID) {
      const period = periodService.getCurrentPeriod(firstCalcQueue['employeeNumberID.orgID'])
      const employeeList = UB.Repository('hr_calcTimeSheetQueue')
        .attrs(['ID', 'employeeNumberID'])
        .where('employeeNumberID.orgID', '=', firstCalcQueue['employeeNumberID.orgID'])
        .selectAsObject()
      const employeeNumbers = []
      const IDs = [firstCalcQueue.ID]
      employeeList.forEach(row => {
        employeeNumbers.push(row.employeeNumberID)
        IDs.push(row.ID)
      })

      try {
        store.execSQL(`DELETE FROM hr_calcTimeSheetQueue WHERE ID${entityBaseService.getInExpression('IDs')}`, { IDs })
        App.dbCommit()
      } catch (error) {
        console.error(error)
      }
      if (period && period.ID) {
        const periods = [period.ID, period.nextPeriodID]
        periods.forEach(periodID => {
          timeSheetService.fillTimeSheet({
            organizationID: firstCalcQueue['employeeNumberID.orgID'],
            periodID: periodID,
            employeeNumbers,
            checkPeriod: false
          })
        })
      }
    }

    store.freeNative()
    global.gc()
    firstCalcQueue = UB.Repository('hr_calcTimeSheetQueue')
      .attrs(['ID', 'orgID', 'employeeNumberID', 'employeeNumberID.orgID', 'workScheduleID'])
      .orderBy('workScheduleID')
      .orderBy('orgID')
      .orderBy('employeeNumberID')
      .limit(1)
      .selectSingle()
  }
}
