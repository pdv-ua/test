const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const dateService = require('../../AC/modules/dataServices/dateService')
const tpManager = require('../../AC/modules/documentBuilder/tpManager')
const algorithmService = require('../../HR/modules/algorithmService')
const accrualService = require('../../HR/modules/accrualService')
const periodService = require('../../HR/modules/periodService')
const glCore = require('../../GL/modules/glCore')
const documentService = require('../../AC/modules/entityServices/documentService')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const orgService = require('./orgService')
const settingsService = require('../../AC/modules/entityServices/settingsService')

module.exports = {
  reCalcEmployeeAccrual,
  savePeriodOrgBalance,
  savePeriodOrgEntry,
  getDataByOperation,
  getDataByPeriod,
  getDataByPayEl,
  getDataByPayFund,
  postingXLSX,
  recalcPaymentOrder,
  doPostingEntry,
  doCancelPostingEntry,
  getStateEntry,
  deleteEntry
}

function employeeLimitedAccess (orgID) {
  if (App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
    return false
  } else {
    return UB.Repository('hr_employeeNumberS').attrs('ID').where('orgID', '=', orgID).where('limitedAccess', '=', 1).selectScalar()
  }
}

function reCalcEmployeeAccrual (orgID, period, employeeNumbers, description) {
  const rlService = require('../../HR/modules/rlService')
  if (!employeeNumbers) {
    employeeNumbers = UB.Repository('hr_employeeNumberS')
      .attrs(['ID'])
      .where('orgID', '=', orgID)
      .where('dateFrom', '<=', period.dateTo)
      .where('dateTo', '>=', period.dateFrom)
      .selectAsObject().map(o => o.ID)
  }
  rlService.getCalcAccrual({}, orgID, employeeNumbers, period.ID, description || `Розрахункова відомість`)
}

function savePeriodOrgBalance (orgID, period) {
  if (period.orgID !== orgID) {
    return
  }
  const store = UB.DataStore('hr_paySummary')
  const paySummaryPeriod = UB.Repository('hr_paySummary')
    .attrs(['ID'])
    .where('orgID', '=', orgID)
    .where('periodID', '=', period.ID)
    .limit(1)
    .selectSingle()
  const payCalcSummarySheet = []
  const payFundSummarySheet = []
  store.execSQL(`DELETE FROM hr_payCalcSummarySheet WHERE periodID = :periodID: AND orgID = :orgID: `, { periodID: period.ID, orgID })
  store.execSQL(`DELETE FROM hr_payFundSummarySheet WHERE periodID = :periodID: AND orgID = :orgID:`, { periodID: period.ID, orgID })
  const priorPeriod = UB.Repository('hr_dictPeriod').attrs(['priorPeriodID']).selectById(period.ID)
  let privSum = {
    debtOrgSum: 0,
    debtEmployeeSum: 0,
    fundSum: 0
  }
  let paySummary = {
    accruedSum: 0,
    deductedSum: 0,
    paidSum: 0,
    fundSum: 0
  }
  if (priorPeriod && priorPeriod.priorPeriodID) {
    const priorPeriodSum = UB.Repository('hr_paySummary')
      .attrs(['debtOrgSum', 'debtEmployeeSum', 'fundSum'])
      .where('orgID', '=', orgID)
      .where('periodID', '=', priorPeriod.priorPeriodID)
      .limit(1)
      .selectSingle()
    if (priorPeriodSum) {
      Object.assign(privSum, priorPeriodSum)
    }
  }
  const paySummaryStore = UB.DataStore('hr_paySummary')
  store.runSQL(` SELECT 
    SUM(CASE WHEN g.groupType = 'PAYMENT' AND a.flagsRec & 8192 = 0 THEN a.paySum ELSE 0 END) as "accruedSum",
    SUM(CASE WHEN g.groupType = 'OFFTAKE' AND a.flagsRec & 8192 = 0 THEN a.paySum ELSE 0 END) as "deductedSum",
    SUM(CASE WHEN g.groupType = 'FORPAY' AND a.flagsRec & 8192 = 0 THEN a.paySum ELSE 0 END) as "paidSum",
    SUM(a.paySum) as "paySum",
    a.payElID "payElID"
  FROM hr_accrual a
    JOIN hr_payEl p ON a.payElID = p.ID
    JOIN hr_method m ON p.methodID = m.ID
    JOIN hr_methodGroup g ON m.methodGroupID = g.ID
    JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID AND n.empWorkPlace IS NULL
  WHERE a.periodCalcID = :periodID: AND a.flagsRec & 4096 = 0
  GROUP BY a.payElID
  `,
  {
    periodID: period.ID
  })
  const data = store.getAsJsObject()

  store.runSQL(` 
         SELECT 
           SUM(CASE WHEN empBal.sumTo < 0 THEN empBal.sumTo * -1 ELSE 0 END) AS "debtEmployeeSum",
           SUM(CASE WHEN empBal.sumTo > 0 THEN empBal.sumTo ELSE 0 END) AS "debtOrgSum"
           FROM (SELECT employeeNumberID, sum(sumTo) as sumTo
         FROM hr_accrualBalance
         WHERE periodCalcID = :periodID:
         GROUP BY employeeNumberID) empBal`,
  {
    periodID: period.ID
  })
  const balanceData = store.getAsJsObject()[0]
  store.runSQL(` SELECT
   COUNT(*) as "employees",
   SUM(CASE WHEN n.dateFrom BETWEEN :dateFrom: AND :dateTo: THEN 1 ELSE 0 END) as "hired",
   SUM(CASE WHEN n.dateTo BETWEEN :dateFrom: AND :dateTo: THEN 1 ELSE 0 END) as "quitted"
  FROM hr_employeeNumber n 
  WHERE n.orgID = :orgID: AND n.dateFrom <= :dateTo: AND n.dateTo >= :dateFrom: AND n.empWorkPlace IS NULL
   AND n.mi_deleteDate >= :maxDate: `,
  {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    orgID: orgID,
    maxDate: dateService.maxDate()
  })

  let empData = store.getAsJsObject()[0]

  Object.assign(paySummary, empData)
  Object.keys(data).forEach(key => { if (data[key] === null) { data[key] = 0 } })

  data.forEach(row => {
    payCalcSummarySheet.push({
      ID: accrualService.getID('S_HR_PAYCALCSUMMARYSHEET'),
      periodID: period.ID,
      orgID: orgID,
      payElID: row.payElID,
      paySum: row.paySum
    })
    paySummary.accruedSum = accrualService.round(paySummary.accruedSum + (row.accruedSum || 0), 2)
    paySummary.deductedSum = accrualService.round(paySummary.deductedSum + (row.deductedSum || 0), 2)
    paySummary.paidSum = accrualService.round(paySummary.paidSum + (row.paidSum || 0), 2)
  })
  paySummary.accruedSum = accrualService.round(paySummary.accruedSum)
  paySummary.deductedSum = accrualService.round(paySummary.deductedSum)
  paySummary.paidSum = accrualService.round(paySummary.paidSum)
  if (payCalcSummarySheet.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_payCalcSummarySheet(ID, periodID, orgID, payElID, paySum)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        periodID bigint '$.periodID',
        orgID bigint '$.orgID',
        payElID bigint '$.payElID',
        paySum numeric(19, 2) '$.paySum'
       )`, { p1: JSON.stringify(payCalcSummarySheet) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_payCalcSummarySheet(ID, periodID, orgID, payElID, paySum) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'periodID')::BIGINT, 
            (data->>'orgID')::BIGINT, 
            (data->>'payElID')::BIGINT,
            (data->>'paySum')::numeric(19, 2) 
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(payCalcSummarySheet) }
      )
    }
  }

  store.runSQL(` SELECT SUM(ROUND(a.paySum,2)) as "paySum", a.payFundID "payFundID" 
                 FROM hr_accrualFund a
                 JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID AND n.empWorkPlace IS NULL
                 WHERE a.periodCalcID = :periodID: GROUP BY payFundID`,
  { periodID: period.ID })
  const fund = store.getAsJsObject()

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

  paySummary.debtOrgSum = accrualService.round(balanceData.debtOrgSum)
  paySummary.debtEmployeeSum = accrualService.round(balanceData.debtEmployeeSum)
  paySummary.fundSum = accrualService.round(paySummary.fundSum)

  if (paySummaryPeriod && paySummaryPeriod.ID) {
    paySummary.ID = paySummaryPeriod.ID
  } else {
    paySummary.periodID = period.ID
    paySummary.orgID = orgID
  }
  paySummary.dateCalc = dateService.currentDateTime()
  paySummaryStore.run(paySummaryPeriod && paySummaryPeriod.ID ? 'update' : 'insert', {
    __skipOptimisticLock: true,
    __skipSelectAfterInsert: true,
    __skipRls: true,
    __skipAclRls: true,
    execParams:
      paySummary
  })
  store.freeNative()
  paySummaryStore.freeNative()
  recalcPaymentOrder(orgID, period)
  savePeriodOrgEntry(orgID, period)
  const storeCalcOrgState = UB.DataStore('hr_calcOrgState')
  const calcOrgStateID = UB.Repository('hr_calcOrgState')
    .attrs(['ID'])
    .where('orgID', '=', orgID)
    .selectScalar()
  if (calcOrgStateID) {
    storeCalcOrgState.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterInsert: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: calcOrgStateID,
        flags: 1
      }
    })
  } else {
    storeCalcOrgState.run('insert', {
      execParams: {
        orgID,
        flags: 1
      }
    })
  }
}

function recalcPaymentOrder (orgID, recalcPeriod) {
  const period = typeof recalcPeriod === 'object' ? recalcPeriod : periodService.getPeriod(recalcPeriod)
  try {
    const obligatoryList = orgService.getOrgObligatory(orgID).map(o => o.ID)
    const obligatoryListStr = obligatoryList.length ? `(${String(obligatoryList)})` : '(0)'

    const payObligatoryStore = UB.DataStore('hr_payObligatory')

    payObligatoryStore.runSQL(` SELECT r.payObligatoryID "payObligatoryID", r.dictFundSourceID "dictFundSourceID", 
                               r.dictProgClassID "dictProgClassID", r.dictProjectID "dictProjectID",  r.paySum "paySum" 
                              FROM ( 
                              SELECT o.ID payObligatoryID, adt.dictFundSourceID, adt.dictProgClassID, adt.dictProjectID, SUM(adt.paySum) paySum
                              FROM hr_payObligatory o
                              JOIN hr_payElDepend d ON d.ownerID = o.ID AND :dateFrom: <= d.dateTo and :dateTo: >= d.dateFrom AND d.mi_deleteDate >= '9999-12-31'
                              JOIN hr_accrual a ON a.payElID = d.payElID AND a.periodCalcID = :periodID:
                              JOIN hr_accrualDt adt ON adt.accrualID = a.ID
                              WHERE o.ID in ${obligatoryListStr} AND o.mi_deleteDate >= '9999-12-31'
                              GROUP BY o.ID, adt.dictFundSourceID, adt.dictProgClassID, adt.dictProjectID
                              UNION ALL
                              SELECT o.ID payObligatoryID, adt.dictFundSourceID, adt.dictProgClassID, adt.dictProjectID, SUM(adt.paySum) paySum
                              from hr_payObligatory o
                              JOIN hr_payFundDepend d ON d.ownerID = o.ID AND :dateFrom: <= d.dateTo and :dateTo: >= d.dateFrom AND d.mi_deleteDate >= '9999-12-31'
                              JOIN hr_accrualFund a ON a.payFundID = d.fundID AND a.periodCalcID = :periodID:
                              LEFT JOIN hr_accrualFundDt adt ON adt.accrualFundID = a.ID
                              WHERE o.ID in ${obligatoryListStr} AND o.mi_deleteDate >= '9999-12-31'
                              GROUP BY o.id, adt.dictFundSourceID, adt.dictProgClassID, adt.dictProjectID ) r
                              ORDER BY r.payObligatoryID, r.dictFundSourceID, r.dictProgClassID, r.dictProjectID
                            `, {
      periodID: period.ID,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo
    })
    const payPlans = payObligatoryStore.getAsJsObject()

    payObligatoryStore.runSQL(` SELECT o.id "payObligatoryID", pdt.dictFundSourceID "dictFundSourceID",
                                pdt.dictProgClassID "dictProgClassID", pdt.dictProjectID "dictProjectID",  sum(pdt.paySum) "paySum"
                              FROM hr_paymentOrder p
                              join hr_payRoll r1 on r1.ID = p.payRollID
                              JOIN hr_payObligatory o ON o.id = p.payObligatoryID
                              JOIN hr_paymentOrderAccDt pdt ON pdt.paymentOrderID = p.ID
                              WHERE r1.organizationID = :orgID: AND o.mi_deleteDate >= '9999-12-31'
                              AND p.payRollID is not null 
                              AND p.periodCalcID = :periodID:
                              GROUP BY o.id, pdt.dictFundSourceID, pdt.dictProgClassID, pdt.dictProjectID
                              ORDER BY o.ID, pdt.dictFundSourceID, pdt.dictProgClassID, pdt.dictProjectID
                               `, {
      periodID: period.ID,
      orgID
    })
    const payFacts = payObligatoryStore.getAsJsObject()
    payObligatoryStore.freeNative()
    const obligatoryData = []
    payPlans.forEach(pay => {
      const obligatory = obligatoryData.find(o => o.payObligatoryID === pay.payObligatoryID)
      if (obligatory) {
        obligatory.paySum = accrualService.round(obligatory.paySum + pay.paySum, 2)
        obligatory.paymentOrderAccDt = algorithmService.sumAccrualDtByDictFundSource(obligatory.paymentOrderAccDt, [{
          dictFundSourceID: pay.dictFundSourceID,
          dictProgClassID: pay.dictProgClassID,
          dictProjectID: pay.dictProjectID,
          paySum: pay.paySum
        }])
      } else {
        obligatoryData.push({
          payObligatoryID: pay.payObligatoryID,
          paymentOrderAccDt: [{ dictFundSourceID: pay.dictFundSourceID, dictProgClassID: pay.dictProgClassID, dictProjectID: pay.dictProjectID, paySum: pay.paySum }],
          paySum: pay.paySum
        })
      }
    })

    payFacts.forEach(pay => {
      const obligatory = obligatoryData.find(o => o.payObligatoryID === pay.payObligatoryID)
      if (obligatory) {
        obligatory.paySum = accrualService.round(obligatory.paySum - pay.paySum, 2)
        obligatory.paymentOrderAccDt = algorithmService.sumAccrualDtByDictFundSource(obligatory.paymentOrderAccDt, [{
          dictFundSourceID: pay.dictFundSourceID,
          dictProgClassID: pay.dictProgClassID,
          paySum: -1 * pay.paySum
        }])
      } else {
        obligatoryData.push({
          payObligatoryID: pay.payObligatoryID,
          paymentOrderAccDt: [{ dictFundSourceID: pay.dictFundSourceID, dictProgClassID: pay.dictProgClassID, paySum: -1 * pay.paySum }],
          paySum: -1 * pay.paySum
        })
      }
    })
    const paymentOrderStore = UB.DataStore('hr_paymentOrder')
    const paymentOrders = UB.Repository('hr_paymentOrder')
      .attrs(['ID', 'payObligatoryID', 'paySum'])
      .where('periodCalcID', '=', period.ID)
      .where('payRollID', 'isNull')
      .selectAsObject()

    obligatoryData.forEach(obl => {
      const paymentOrder = paymentOrders.find(o => o.payObligatoryID === obl.payObligatoryID)
      if (paymentOrder) {
        paymentOrder.processed = true
        if (obl.paySum > 0.01) {
          paymentOrderStore.run('update', {
            __skipOptimisticLock: true,
            __skipSelectAfterUpdate: true,
            __skipUsingAllFieldsForSelectBeforeUpdate: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              ID: paymentOrder.ID,
              paySum: obl.paySum,
              paymentOrderAccDt: JSON.stringify(obl.paymentOrderAccDt)
            }
          })
        } else {
          Session.runAsAdmin(function () {
            paymentOrderStore.run('delete', {
              __skipOptimisticLock: true,
              __skipRls: true,
              __skipAclRls: true,
              execParams: {
                ID: paymentOrder.ID
              }
            })
          })
        }
      } else {
        if (obl.paySum > 0) {
          paymentOrderStore.run('insert', {
            __skipOptimisticLock: true,
            __skipSelectAfterInsert: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              periodCalcID: period.ID,
              payObligatoryID: obl.payObligatoryID,
              orderState: 'PROJECT',
              paymentOrderAccDt: JSON.stringify(obl.paymentOrderAccDt),
              paySum: obl.paySum
            }
          })
        }
      }
    })
    paymentOrders.forEach(paymentOrder => {
      if (!paymentOrder.processed) {
        Session.runAsAdmin(function () {
          paymentOrderStore.run('delete', {
            __skipOptimisticLock: true,
            __skipRls: true,
            __skipAclRls: true,
            execParams: {
              ID: paymentOrder.ID
            }
          })
        })
      }
    })
    paymentOrderStore.freeNative()
  } catch (error) {
    console.error(error)
  }
}

function savePeriodOrgEntry (orgID, period) {
  const coa = glCore.getCOA()
  const sqlDialect = entityBaseService.getSQLDialect()
  deleteEntry(period.ID)
  const payAccOperations = []
  let byEmployeePosition = false
  const entryOperations = UB.Repository('hr_entryAcc')
    .attrs(['entryOperationID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'accountDtID', 'accountKtID',
      'operPeriod', 'operSum', 'isReversal', 'excludeOrg', 'excludeDepartment', 'excludeFundSource', 'excludeWorkPlace',
      'entryAccDt',
      'dimensionDt0', 'dimensionDt0Value', 'dimensionDt1', 'dimensionDt1Value',
      'dimensionDt2', 'dimensionDt2Value', 'dimensionDt3', 'dimensionDt3Value',
      'dimensionDt4', 'dimensionDt4Value', 'dimensionDt5', 'dimensionDt5Value',
      'dimensionDt6', 'dimensionDt6Value', 'dimensionDt7', 'dimensionDt7Value',
      'dimensionDt8', 'dimensionDt8Value', 'dimensionDt9', 'dimensionDt9Value',
      'dimensionKt0', 'dimensionKt0Value', 'dimensionKt1', 'dimensionKt1Value',
      'dimensionKt2', 'dimensionKt2Value', 'dimensionKt3', 'dimensionKt3Value',
      'dimensionKt4', 'dimensionKt4Value', 'dimensionKt5', 'dimensionKt5Value',
      'dimensionKt6', 'dimensionKt6Value', 'dimensionKt7', 'dimensionKt7Value',
      'dimensionKt8', 'dimensionKt8Value', 'dimensionKt9', 'dimensionKt9Value'
    ])
    .selectAsObject()
  entryOperations.forEach(row => {
    if (row.entryAccDt) {
      row.entryAccDt = JSON.parse(row.entryAccDt)
      if (row.entryAccDt.wp && row.entryAccDt.wp.length) {
        byEmployeePosition = true
      }
    }
  })
  const accrualStore = UB.DataStore('hr_accrual')
  accrualStore.runSQL(` SELECT p.entryOperationID "entryOperationID", g.groupType "groupType", a.paySum "accrualPaySum", 
    a.periodSalaryID "periodSalaryID", a.periodSalary "periodSalary", a.periodCalcID "periodCalcID", a.employeeNumberID "employeeNumberID",
    a.payElID "payElID", adt.paySum "paySum", adt.dictFundSourceID "dictFundSourceID", adt.dictProgClassID "dictProgClassID", adt.dictProjectID "dictProjectID",
    adt.departmentID "departmentID", adt.accountID "accountID", adt.d0, adt.d1, adt.d2, adt.d3, adt.d4, adt.d5, adt.d6, adt.d7, adt.d8, adt.d9,
    adt.d0Value "d0Value", adt.d1Value "d1Value", adt.d2Value "d2Value", adt.d3Value "d3Value", adt.d4Value "d4Value",
    adt.d5Value "d5Value", adt.d6Value "d6Value", adt.d7Value "d7Value", adt.d8Value "d8Value", adt.d9Value "d9Value"
  FROM hr_accrual a
    JOIN hr_payEl p ON p.ID = a.payElID
    JOIN hr_method m ON p.methodID = m.ID
    JOIN hr_methodGroup g ON m.methodGroupID = g.ID
    JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID AND n.empWorkPlace IS NULL
    LEFT JOIN hr_accrualDt adt ON adt.accrualID = a.ID
  WHERE a.periodCalcID = :periodID: AND a.flagsRec & 4096 = 0
  ORDER BY p.entryOperationID
  `, {
    periodID: period.ID
  })
  const accruals = accrualStore.getAsJsObject()
  accrualStore.freeNative()

  const accrualFundStore = UB.DataStore('hr_accrualFund')
  accrualFundStore.runSQL(` SELECT p.entryOperationID "entryOperationID", a.paySum AS "accrualPaySum",
   a.periodSalaryID "periodSalaryID", a.periodSalary "periodSalary", a.periodCalcID "periodCalcID", a.employeeNumberID "employeeNumberID",
   adt.payElID "payElID", adt.paySum "paySum", adt.dictFundSourceID "dictFundSourceID", adt.dictProgClassID "dictProgClassID",
    adt.dictProjectID "dictProjectID", adt.departmentID "departmentID", adt.accountID "accountID",
    adt.d0, adt.d1, adt.d2, adt.d3, adt.d4, adt.d5, adt.d6, adt.d7, adt.d8, adt.d9,
    adt.d0Value "d0Value", adt.d1Value "d1Value", adt.d2Value "d2Value", adt.d3Value "d3Value", adt.d4Value "d4Value",
    adt.d5Value "d5Value", adt.d6Value "d6Value", adt.d7Value "d7Value", adt.d8Value "d8Value", adt.d9Value "d9Value"
  FROM hr_accrualFund a
    JOIN hr_payFund p ON p.ID = a.payFundID
    JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID AND n.empWorkPlace IS NULL
    LEFT JOIN hr_accrualFundDt adt ON adt.accrualFundID = a.ID
  WHERE a.periodCalcID = :periodID:
  ORDER BY p.entryOperationID
  `, {
    periodID: period.ID
  })
  const accrualFunds = accrualFundStore.getAsJsObject()
  accrualFundStore.freeNative()

  let employeeNumbers = []
  if (byEmployeePosition) {
    const employeeNumberStore = UB.DataStore('hr_employeeNumber')
    employeeNumberStore.runSQL(` 
    SELECT en.ID "ID",
    (SELECT ${sqlDialect.top} ep.workPlace FROM hr_employeePosition ep WHERE ep.employeeNumberID = en.ID AND 
    ep.dateFrom <= :dateTo: AND ep.isActive = 1 AND ep.mi_deleteDate >= '9999-12-31' order by ep.dateTo desc ${sqlDialect.limit}) "wp"
    FROM hr_employeeNumber en 
    WHERE en.orgID = :orgID:
    AND (EXISTS (SELECT 1 FROM hr_accrual a WHERE a.employeeNumberID = en.ID AND  a.periodCalcID = :periodID: AND a.flagsRec & 4096 = 0) OR
    EXISTS (SELECT 1 FROM hr_accrualFund a WHERE a.employeeNumberID = en.ID AND  a.periodCalcID = :periodID:))
    ORDER BY en.ID
  `, {
      orgID: orgID,
      periodID: period.ID,
      dateTo: period.dateTo
    })
    employeeNumbers = employeeNumberStore.getAsJsObject()
    employeeNumberStore.freeNative()
  }
  accruals.forEach(acc => {
    if (!acc.entryOperationID) { return }
    const entryAcc = entryOperations.filter(o => o.entryOperationID === acc.entryOperationID)
    acc.periodSalary = dateService.shiftDate(acc.periodSalary)
    entryAcc.forEach(entry => {
      if ((!entry.operPeriod || (entry.operPeriod === 'prior' && acc.periodSalary < period.dateFrom) ||
          (entry.operPeriod === 'current' && acc.periodSalaryID === period.ID) ||
          (entry.operPeriod === 'priorCurrent' && acc.periodSalary <= period.dateFrom) ||
          (entry.operPeriod === 'next' && acc.periodSalary > period.dateFrom) ||
          (entry.operPeriod === 'nextAdditional' && acc.periodSalary > period.dateFrom)) &&
          (!entry.operSum || (entry.operSum && ((entry.operSum === 'moreZero' && acc.accrualPaySum > 0) || (entry.operSum === 'lessZero' && acc.accrualPaySum < 0)))) &&
        (!entry.entryAccDt || (
          (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(period.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(period.orgID))) &&
          (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(acc.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(acc.departmentID))) &&
          (!entry.entryAccDt.fs || !entry.entryAccDt.fs.length || (entry.excludeFundSource && !entry.entryAccDt.fs.includes(acc.dictFundSourceID)) || (!entry.excludeFundSource && entry.entryAccDt.fs.includes(acc.dictFundSourceID))) &&
          (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length ||
            (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)) ||
            (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)))
        ))
      ) {
        const periodSalaryID = (entry.operPeriod === 'nextAdditional' && acc.periodSalary > period.dateFrom) ? acc.periodSalaryID : period.ID
        let payAccOperation = payAccOperations.find(o => o.entryOperationID === acc.entryOperationID && o.periodSalaryID === periodSalaryID)
        if (!payAccOperation) {
          payAccOperation = {
            orgID: orgID,
            periodCalcID: period.ID,
            periodSalaryID,
            entryOperationID: acc.entryOperationID,
            totalSum: 0,
            payAccOperationDt: []
          }
          payAccOperations.push(payAccOperation)
        }

        const payAccOperationDt = {
          accountDtID: acc.groupType === 'PAYMENT' ? (entry.accountDtID || acc.accountID) : entry.accountDtID,
          accountKtID: entry.accountKtID,
          dictFundSourceID: acc.dictFundSourceID || entry.dictFundSourceID,
          dictProgClassID: acc.dictProgClassID || entry.dictProgClassID,
          dictProjectID: acc.dictProjectID || entry.dictProjectID,
          payAccOperationPayEl: []
        }
        let dimPos = 0
        const accountDt = coa.byId[payAccOperationDt.accountDtID]
        if (accountDt && accountDt.dims) {
          accountDt.dims.forEach(dim => {
            let isSetValue = false
            if (dim) {
              payAccOperationDt[`dimensionDt${dimPos}`] = dim.ID
              for (let i = 0; i < 10; i++) {
                if (!isSetValue && entry[`dimensionDt${i}`] && entry[`dimensionDt${i}`] === dim.ID && entry[`dimensionDt${i}Value`]) {
                  payAccOperationDt[`dimensionDt${dimPos}Value`] = entry[`dimensionDt${i}Value`]
                  dimPos++
                  isSetValue = true
                  return
                }
              }
              if (!isSetValue) {
                for (let i = 0; i < 10; i++) {
                  if (!isSetValue && acc[`d${i}`] && acc[`d${i}`] === dim.ID && acc[`d${i}Value`]) {
                    payAccOperationDt[`dimensionDt${dimPos}Value`] = acc[`d${i}Value`]
                    dimPos++
                    isSetValue = true
                    return
                  }
                }
              }
            }
          })
        }
        const accountKt = coa.byId[payAccOperationDt.accountKtID]
        dimPos = 0
        if (accountKt && accountKt.dims) {
          accountKt.dims.forEach(dim => {
            let isSetValue = false
            if (dim) {
              payAccOperationDt[`dimensionKt${dimPos}`] = dim.ID
              for (let i = 0; i < 10; i++) {
                if (!isSetValue && entry[`dimensionKt${i}`] && entry[`dimensionKt${i}`] === dim.ID && entry[`dimensionKt${i}Value`]) {
                  payAccOperationDt[`dimensionKt${dimPos}Value`] = entry[`dimensionKt${i}Value`]
                  dimPos++
                  isSetValue = true
                  return
                }
              }
              if (!isSetValue) {
                for (let i = 0; i < 10; i++) {
                  if (!isSetValue && acc[`d${i}`] && acc[`d${i}`] === dim.ID && acc[`d${i}Value`]) {
                    payAccOperationDt[`dimensionKt${dimPos}Value`] = acc[`d${i}Value`]
                    dimPos++
                    isSetValue = true
                    return
                  }
                }
              }
            }
          })
        }
        payAccOperationDt.sumOperation = (acc.paySum !== null ? acc.paySum : (acc.accrualPaySum || 0)) * (entry.isReversal ? -1 : 1)

        const opDt = payAccOperation.payAccOperationDt.find(o => o.dictFundSourceID === payAccOperationDt.dictFundSourceID &&
            o.dictProgClassID === payAccOperationDt.dictProgClassID && o.dictProjectID === payAccOperationDt.dictProjectID &&
            o.accountDtID === payAccOperationDt.accountDtID && o.accountKtID === payAccOperationDt.accountKtID &&
            o.dimensionDt0 === payAccOperationDt.dimensionDt0 && o.dimensionDt0Value === payAccOperationDt.dimensionDt0Value &&
            o.dimensionKt0 === payAccOperationDt.dimensionKt0 && o.dimensionKt0Value === payAccOperationDt.dimensionKt0Value &&
            o.dimensionDt1 === payAccOperationDt.dimensionDt1 && o.dimensionDt1Value === payAccOperationDt.dimensionDt1Value &&
            o.dimensionKt1 === payAccOperationDt.dimensionKt1 && o.dimensionKt1Value === payAccOperationDt.dimensionKt1Value &&
            o.dimensionDt2 === payAccOperationDt.dimensionDt2 && o.dimensionDt2Value === payAccOperationDt.dimensionDt2Value &&
            o.dimensionKt2 === payAccOperationDt.dimensionKt2 && o.dimensionKt2Value === payAccOperationDt.dimensionKt2Value &&
            o.dimensionDt3 === payAccOperationDt.dimensionDt3 && o.dimensionDt3Value === payAccOperationDt.dimensionDt3Value &&
            o.dimensionKt3 === payAccOperationDt.dimensionKt3 && o.dimensionKt3Value === payAccOperationDt.dimensionKt3Value &&
            o.dimensionDt4 === payAccOperationDt.dimensionDt4 && o.dimensionDt4Value === payAccOperationDt.dimensionDt4Value &&
            o.dimensionKt4 === payAccOperationDt.dimensionKt4 && o.dimensionKt4Value === payAccOperationDt.dimensionKt4Value &&
            o.dimensionDt5 === payAccOperationDt.dimensionDt5 && o.dimensionDt5Value === payAccOperationDt.dimensionDt5Value &&
            o.dimensionKt5 === payAccOperationDt.dimensionKt5 && o.dimensionKt5Value === payAccOperationDt.dimensionKt5Value &&
            o.dimensionDt6 === payAccOperationDt.dimensionDt6 && o.dimensionDt6Value === payAccOperationDt.dimensionDt6Value &&
            o.dimensionKt6 === payAccOperationDt.dimensionKt6 && o.dimensionKt6Value === payAccOperationDt.dimensionKt6Value &&
            o.dimensionDt7 === payAccOperationDt.dimensionDt7 && o.dimensionDt7Value === payAccOperationDt.dimensionDt7Value &&
            o.dimensionKt7 === payAccOperationDt.dimensionKt7 && o.dimensionKt7Value === payAccOperationDt.dimensionKt7Value &&
            o.dimensionDt8 === payAccOperationDt.dimensionDt8 && o.dimensionDt8Value === payAccOperationDt.dimensionDt8Value &&
            o.dimensionKt8 === payAccOperationDt.dimensionKt8 && o.dimensionKt8Value === payAccOperationDt.dimensionKt8Value &&
            o.dimensionDt9 === payAccOperationDt.dimensionDt9 && o.dimensionDt9Value === payAccOperationDt.dimensionDt9Value &&
            o.dimensionKt9 === payAccOperationDt.dimensionKt9 && o.dimensionKt9Value === payAccOperationDt.dimensionKt9Value
        )
        if (opDt) {
          const operationPayEl = opDt.payAccOperationPayEl.find(o => o.periodSalaryID === acc.periodSalaryID &&
              o.payElID === acc.payElID)
          if (operationPayEl) {
            operationPayEl.paySum = accrualService.round(operationPayEl.paySum + payAccOperationDt.sumOperation, 2)
          } else {
            opDt.payAccOperationPayEl.push({
              periodSalaryID: acc.periodSalaryID,
              payElID: acc.payElID,
              paySum: payAccOperationDt.sumOperation
            })
          }
          opDt.sumOperation = accrualService.round(opDt.sumOperation + payAccOperationDt.sumOperation, 2)
        } else {
          payAccOperationDt.payAccOperationPayEl.push({
            periodSalaryID: acc.periodSalaryID,
            payElID: acc.payElID,
            paySum: payAccOperationDt.sumOperation
          })
          payAccOperation.payAccOperationDt.push(payAccOperationDt)
        }
        payAccOperation.totalSum = accrualService.round(payAccOperation.totalSum + payAccOperationDt.sumOperation, 2)
      }
    })
  })

  accrualFunds.forEach(acc => {
    if (!acc.entryOperationID) { return }
    const entryAcc = entryOperations.filter(o => o.entryOperationID === acc.entryOperationID)
    acc.periodSalary = dateService.shiftDate(acc.periodSalary)
    entryAcc.forEach(entry => {
      if ((!entry.operPeriod || (entry.operPeriod === 'prior' && acc.periodSalary < period.dateFrom) ||
        (entry.operPeriod === 'current' && acc.periodSalaryID === period.ID) ||
        (entry.operPeriod === 'priorCurrent' && acc.periodSalary <= period.dateFrom) ||
        (entry.operPeriod === 'next' && acc.periodSalary > period.dateFrom) ||
        (entry.operPeriod === 'nextAdditional' && acc.periodSalary > period.dateFrom)) &&
        (!entry.operSum || (entry.operSum && ((entry.operSum === 'moreZero' && acc.accrualPaySum > 0) || (entry.operSum === 'lessZero' && acc.accrualPaySum < 0)))) &&
        (!entry.entryAccDt || (
          (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(period.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(period.orgID))) &&
          (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(acc.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(acc.departmentID))) &&
          (!entry.entryAccDt.fs || !entry.entryAccDt.fs.length || (entry.excludeFundSource && !entry.entryAccDt.fs.includes(acc.dictFundSourceID)) || (!entry.excludeFundSource && entry.entryAccDt.fs.includes(acc.dictFundSourceID))) &&
          (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length ||
            (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)) ||
            (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)))
        ))
      ) {
        const periodSalaryID = (entry.operPeriod === 'nextAdditional' && acc.periodSalary > period.dateFrom) ? acc.periodSalaryID : period.ID
        let payAccOperation = payAccOperations.find(o => o.entryOperationID === acc.entryOperationID && o.periodSalaryID === periodSalaryID)
        if (!payAccOperation) {
          payAccOperation = {
            orgID: orgID,
            periodCalcID: period.ID,
            periodSalaryID,
            entryOperationID: acc.entryOperationID,
            totalSum: 0,
            payAccOperationDt: []
          }
          payAccOperations.push(payAccOperation)
        }

        const payAccOperationDt = {
          accountDtID: entry.accountDtID || acc.accountID,
          accountKtID: entry.accountKtID,
          dictFundSourceID: acc.dictFundSourceID || entry.dictFundSourceID,
          dictProgClassID: acc.dictProgClassID || entry.dictProgClassID,
          dictProjectID: acc.dictProjectID || entry.dictProjectID,
          payAccOperationPayEl: []
        }
        let dimPos = 0
        const accountDt = coa.byId[payAccOperationDt.accountDtID]
        if (accountDt && accountDt.dims) {
          accountDt.dims.forEach(dim => {
            let isSetValue = false
            if (dim) {
              payAccOperationDt[`dimensionDt${dimPos}`] = dim.ID
              for (let i = 0; i < 10; i++) {
                if (!isSetValue && entry[`dimensionDt${i}`] && entry[`dimensionDt${i}`] === dim.ID && entry[`dimensionDt${i}Value`]) {
                  payAccOperationDt[`dimensionDt${dimPos}Value`] = entry[`dimensionDt${i}Value`]
                  dimPos++
                  isSetValue = true
                  return
                }
              }
              if (!isSetValue) {
                for (let i = 0; i < 10; i++) {
                  if (!isSetValue && acc[`d${i}`] && acc[`d${i}`] === dim.ID && acc[`d${i}Value`]) {
                    payAccOperationDt[`dimensionDt${dimPos}Value`] = acc[`d${i}Value`]
                    dimPos++
                    isSetValue = true
                    return
                  }
                }
              }
              dimPos++
            }
          })
        }
        const accountKt = coa.byId[payAccOperationDt.accountKtID]
        dimPos = 0
        if (accountKt && accountKt.dims) {
          accountKt.dims.forEach(dim => {
            let isSetValue = false
            if (dim) {
              payAccOperationDt[`dimensionKt${dimPos}`] = dim.ID
              for (let i = 0; i < 10; i++) {
                if (!isSetValue && entry[`dimensionKt${i}`] && entry[`dimensionKt${i}`] === dim.ID && entry[`dimensionKt${i}Value`]) {
                  payAccOperationDt[`dimensionKt${dimPos}Value`] = entry[`dimensionKt${i}Value`]
                  isSetValue = true
                  dimPos++
                  return
                }
              }
              if (!isSetValue) {
                for (let i = 0; i < 10; i++) {
                  if (!isSetValue && acc[`d${i}`] && acc[`d${i}`] === dim.ID && acc[`d${i}Value`]) {
                    payAccOperationDt[`dimensionKt${dimPos}Value`] = acc[`d${i}Value`]
                    isSetValue = true
                    dimPos++
                    return
                  }
                }
              }
              dimPos++
            }
          })
        }

        payAccOperationDt.sumOperation = (acc.paySum !== null ? acc.paySum : (acc.accrualPaySum || 0)) * (entry.isReversal ? -1 : 1)

        const opDt = payAccOperation.payAccOperationDt.find(o => o.dictFundSourceID === payAccOperationDt.dictFundSourceID &&
        o.dictProgClassID === payAccOperationDt.dictProgClassID && o.dictProjectID === payAccOperationDt.dictProjectID &&
        o.accountDtID === payAccOperationDt.accountDtID && o.accountKtID === payAccOperationDt.accountKtID &&
        o.dimensionDt0 === payAccOperationDt.dimensionDt0 && o.dimensionDt0Value === payAccOperationDt.dimensionDt0Value &&
        o.dimensionKt0 === payAccOperationDt.dimensionKt0 && o.dimensionKt0Value === payAccOperationDt.dimensionKt0Value &&
        o.dimensionDt1 === payAccOperationDt.dimensionDt1 && o.dimensionDt1Value === payAccOperationDt.dimensionDt1Value &&
        o.dimensionKt1 === payAccOperationDt.dimensionKt1 && o.dimensionKt1Value === payAccOperationDt.dimensionKt1Value &&
        o.dimensionDt2 === payAccOperationDt.dimensionDt2 && o.dimensionDt2Value === payAccOperationDt.dimensionDt2Value &&
        o.dimensionKt2 === payAccOperationDt.dimensionKt2 && o.dimensionKt2Value === payAccOperationDt.dimensionKt2Value &&
        o.dimensionDt3 === payAccOperationDt.dimensionDt3 && o.dimensionDt3Value === payAccOperationDt.dimensionDt3Value &&
        o.dimensionKt3 === payAccOperationDt.dimensionKt3 && o.dimensionKt3Value === payAccOperationDt.dimensionKt3Value &&
        o.dimensionDt4 === payAccOperationDt.dimensionDt4 && o.dimensionDt4Value === payAccOperationDt.dimensionDt4Value &&
        o.dimensionKt4 === payAccOperationDt.dimensionKt4 && o.dimensionKt4Value === payAccOperationDt.dimensionKt4Value &&
        o.dimensionDt5 === payAccOperationDt.dimensionDt5 && o.dimensionDt5Value === payAccOperationDt.dimensionDt5Value &&
        o.dimensionKt5 === payAccOperationDt.dimensionKt5 && o.dimensionKt5Value === payAccOperationDt.dimensionKt5Value &&
        o.dimensionDt6 === payAccOperationDt.dimensionDt6 && o.dimensionDt6Value === payAccOperationDt.dimensionDt6Value &&
        o.dimensionKt6 === payAccOperationDt.dimensionKt6 && o.dimensionKt6Value === payAccOperationDt.dimensionKt6Value &&
        o.dimensionDt7 === payAccOperationDt.dimensionDt7 && o.dimensionDt7Value === payAccOperationDt.dimensionDt7Value &&
        o.dimensionKt7 === payAccOperationDt.dimensionKt7 && o.dimensionKt7Value === payAccOperationDt.dimensionKt7Value &&
        o.dimensionDt8 === payAccOperationDt.dimensionDt8 && o.dimensionDt8Value === payAccOperationDt.dimensionDt8Value &&
        o.dimensionKt8 === payAccOperationDt.dimensionKt8 && o.dimensionKt8Value === payAccOperationDt.dimensionKt8Value &&
        o.dimensionDt9 === payAccOperationDt.dimensionDt9 && o.dimensionDt9Value === payAccOperationDt.dimensionDt9Value &&
        o.dimensionKt9 === payAccOperationDt.dimensionKt9 && o.dimensionKt9Value === payAccOperationDt.dimensionKt9Value
        )

        if (opDt) {
          const operationPayEl = opDt.payAccOperationPayEl.find(o => o.periodSalaryID === acc.periodSalaryID &&
          o.payElID === acc.payElID)
          if (operationPayEl) {
            operationPayEl.paySum = accrualService.round(operationPayEl.paySum + payAccOperationDt.sumOperation, 2)
          } else {
            opDt.payAccOperationPayEl.push({
              periodSalaryID: acc.periodSalaryID,
              payElID: acc.payElID,
              paySum: payAccOperationDt.sumOperation
            })
          }

          opDt.sumOperation = accrualService.round(opDt.sumOperation + payAccOperationDt.sumOperation, 2)
        } else {
          payAccOperationDt.payAccOperationPayEl.push({
            periodSalaryID: acc.periodSalaryID,
            payElID: acc.payElID,
            paySum: payAccOperationDt.sumOperation
          })

          payAccOperation.payAccOperationDt.push(payAccOperationDt)
        }
        payAccOperation.totalSum = accrualService.round(payAccOperation.totalSum + payAccOperationDt.sumOperation, 2)
      }
    })
  })

  saveEntry(payAccOperations)
}
function deleteEntry (periodID) {
  const store = UB.DataStore('hr_payAccOperation')
  store.execSQL(`DELETE FROM hr_payAccOperationPayEl WHERE payAccOperationDtID in (SELECT ID FROM hr_payAccOperationDt WHERE payAccOperationID
      IN (SELECT ID FROM hr_payAccOperation WHERE periodCalcID = :periodID:))`, { periodID })
  store.execSQL(`DELETE FROM hr_payAccOperationDt WHERE payAccOperationID in (SELECT ID FROM hr_payAccOperation WHERE periodCalcID = :periodID:)`, { periodID })
  store.execSQL(`DELETE FROM hr_payAccOperation WHERE periodCalcID = :periodID:`, { periodID })
  store.freeNative()
}
function saveEntry (payAccOperations) {
  const store = UB.DataStore('hr_payAccOperation')
  const operation = []
  const operationDt = []
  const operationPayEl = []
  payAccOperations.forEach(acc => {
    acc.totalSum = accrualService.round(acc.totalSum)
    if (acc.totalSum !== 0 || acc.payAccOperationDt.find(o => (o.sumOperation || 0) !== 0)) {
      acc.ID = accrualService.getID('S_HR_PAYACCOPERATION')
      operation.push({
        ID: acc.ID,
        orgID: acc.orgID,
        periodCalcID: acc.periodCalcID,
        periodSalaryID: acc.periodSalaryID,
        entryOperationID: acc.entryOperationID,
        totalSum: acc.totalSum
      })
      if (acc.payAccOperationDt) {
        acc.payAccOperationDt.forEach(accDt => {
          accDt.ID = accrualService.getID('S_HR_PAYACCOPERATIONDT')
          if ((accDt.sumOperation || 0) !== 0) {
            operationDt.push({
              ID: accDt.ID,
              payAccOperationID: acc.ID,
              sumOperation: accrualService.round(accDt.sumOperation || 0),
              dictFundSourceID: accDt.dictFundSourceID || null,
              dictProgClassID: accDt.dictProgClassID || null,
              dictProjectID: accDt.dictProjectID || null,
              accountDtID: accDt.accountDtID || null,
              accountKtID: accDt.accountKtID || null,
              dimensionDt0: accDt.dimensionDt0 || null,
              dimensionDt0Value: accDt.dimensionDt0Value || null,
              dimensionDt1: accDt.dimensionDt1 || null,
              dimensionDt1Value: accDt.dimensionDt1Value || null,
              dimensionDt2: accDt.dimensionDt2 || null,
              dimensionDt2Value: accDt.dimensionDt2Value || null,
              dimensionDt3: accDt.dimensionDt3 || null,
              dimensionDt3Value: accDt.dimensionDt3Value || null,
              dimensionDt4: accDt.dimensionDt4 || null,
              dimensionDt4Value: accDt.dimensionDt4Value || null,
              dimensionDt5: accDt.dimensionDt5 || null,
              dimensionDt5Value: accDt.dimensionDt5Value || null,
              dimensionDt6: accDt.dimensionDt6 || null,
              dimensionDt6Value: accDt.dimensionDt6Value || null,
              dimensionDt7: accDt.dimensionDt7 || null,
              dimensionDt7Value: accDt.dimensionDt7Value || null,
              dimensionDt8: accDt.dimensionDt8 || null,
              dimensionDt8Value: accDt.dimensionDt8Value || null,
              dimensionDt9: accDt.dimensionDt9 || null,
              dimensionDt9Value: accDt.dimensionDt9Value || null,
              dimensionKt0: accDt.dimensionKt0 || null,
              dimensionKt0Value: accDt.dimensionKt0Value || null,
              dimensionKt1: accDt.dimensionKt1 || null,
              dimensionKt1Value: accDt.dimensionKt1Value || null,
              dimensionKt2: accDt.dimensionKt2 || null,
              dimensionKt2Value: accDt.dimensionKt2Value || null,
              dimensionKt3: accDt.dimensionKt3 || null,
              dimensionKt3Value: accDt.dimensionKt3Value || null,
              dimensionKt4: accDt.dimensionKt4 || null,
              dimensionKt4Value: accDt.dimensionKt4Value || null,
              dimensionKt5: accDt.dimensionKt5 || null,
              dimensionKt5Value: accDt.dimensionKt5Value || null,
              dimensionKt6: accDt.dimensionKt6 || null,
              dimensionKt6Value: accDt.dimensionKt6Value || null,
              dimensionKt7: accDt.dimensionKt7 || null,
              dimensionKt7Value: accDt.dimensionKt7Value || null,
              dimensionKt8: accDt.dimensionKt8 || null,
              dimensionKt8Value: accDt.dimensionKt8Value || null,
              dimensionKt9: accDt.dimensionKt9 || null,
              dimensionKt9Value: accDt.dimensionKt9Value || null
            })
            if (accDt.payAccOperationPayEl) {
              accDt.payAccOperationPayEl.forEach(accPayEl => {
                if (accPayEl.payElID && (accPayEl.paySum || 0) !== 0) {
                  operationPayEl.push({
                    ID: accrualService.getID('S_HR_PAYACCOPERATIONPAYEL'),
                    payAccOperationDtID: accDt.ID,
                    periodSalaryID: accPayEl.periodSalaryID,
                    payElID: accPayEl.payElID,
                    paySum: accPayEl.paySum || 0
                  })
                }
              })
            }
          }
        })
      }
    }
  })
  if (operation.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_payAccOperation(ID, orgID, periodCalcID, periodSalaryID, entryOperationID, totalSum)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        orgID bigint '$.orgID',
        periodCalcID bigint '$.periodCalcID',
        periodSalaryID bigint '$.periodSalaryID',
        entryOperationID bigint '$.entryOperationID',
        totalSum numeric(19, 2) '$.totalSum'
       )`, { p1: JSON.stringify(operation) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_payAccOperation(ID, orgID, periodCalcID, periodSalaryID, entryOperationID, totalSum) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'orgID')::BIGINT, 
            (data->>'periodCalcID')::BIGINT, 
            (data->>'periodSalaryID')::BIGINT, 
            (data->>'entryOperationID')::BIGINT, 
            (data->>'totalSum')::numeric(19, 2)
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(operation) }
      )
    }
  }
  if (operationDt.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_payAccOperationDt(ID, payAccOperationID, sumOperation, dictFundSourceID, dictProgClassID,
          dictProjectID, accountDtID, accountKtID,
          dimensionDt0, dimensionDt0Value, dimensionDt1, dimensionDt1Value,
          dimensionDt2, dimensionDt2Value, dimensionDt3, dimensionDt3Value,
          dimensionDt4, dimensionDt4Value, dimensionDt5, dimensionDt5Value,
          dimensionDt6, dimensionDt6Value, dimensionDt7, dimensionDt7Value,
          dimensionDt8, dimensionDt8Value, dimensionDt9, dimensionDt9Value,
          dimensionKt0, dimensionKt0Value, dimensionKt1, dimensionKt1Value,
          dimensionKt2, dimensionKt2Value, dimensionKt3, dimensionKt3Value,
          dimensionKt4, dimensionKt4Value, dimensionKt5, dimensionKt5Value,
          dimensionKt6, dimensionKt6Value, dimensionKt7, dimensionKt7Value,
          dimensionKt8, dimensionKt8Value, dimensionKt9, dimensionKt9Value)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        payAccOperationID bigint '$.payAccOperationID',
        sumOperation numeric(19, 2) '$.sumOperation',
        dictFundSourceID bigint '$.dictFundSourceID',
        dictProgClassID bigint '$.dictProgClassID',
        dictProjectID bigint '$.dictProjectID',
        accountDtID bigint '$.accountDtID',
        accountKtID bigint '$.accountKtID',
        dimensionDt0 bigint '$.dimensionDt0',
        dimensionDt0Value bigint '$.dimensionDt0Value',
        dimensionDt1 bigint '$.dimensionDt1',
        dimensionDt1Value bigint '$.dimensionDt1Value',
        dimensionDt2 bigint '$.dimensionDt2',
        dimensionDt2Value bigint '$.dimensionDt2Value',
        dimensionDt3 bigint '$.dimensionDt3',
        dimensionDt3Value bigint '$.dimensionDt3Value',
        dimensionDt4 bigint '$.dimensionDt4',
        dimensionDt4Value bigint '$.dimensionDt4Value',
        dimensionDt5 bigint '$.dimensionDt5',
        dimensionDt5Value bigint '$.dimensionDt5Value',
        dimensionDt6 bigint '$.dimensionDt6',
        dimensionDt6Value bigint '$.dimensionDt6Value',
        dimensionDt7 bigint '$.dimensionDt7',
        dimensionDt7Value bigint '$.dimensionDt7Value',
        dimensionDt8 bigint '$.dimensionDt8',
        dimensionDt8Value bigint '$.dimensionDt8Value',
        dimensionDt9 bigint '$.dimensionDt9',
        dimensionDt9Value bigint '$.dimensionDt9Value',
        dimensionKt0 bigint '$.dimensionKt0',
        dimensionKt0Value bigint '$.dimensionKt0Value',
        dimensionKt1 bigint '$.dimensionKt1',
        dimensionKt1Value bigint '$.dimensionKt1Value',
        dimensionKt2 bigint '$.dimensionKt2',
        dimensionKt2Value bigint '$.dimensionKt2Value',
        dimensionKt3 bigint '$.dimensionKt3',
        dimensionKt3Value bigint '$.dimensionKt3Value',
        dimensionKt4 bigint '$.dimensionKt4',
        dimensionKt4Value bigint '$.dimensionKt4Value',
        dimensionKt5 bigint '$.dimensionKt5',
        dimensionKt5Value bigint '$.dimensionKt5Value',
        dimensionKt6 bigint '$.dimensionKt6',
        dimensionKt6Value bigint '$.dimensionKt6Value',
        dimensionKt7 bigint '$.dimensionKt7',
        dimensionKt7Value bigint '$.dimensionKt7Value',
        dimensionKt8 bigint '$.dimensionKt8',
        dimensionKt8Value bigint '$.dimensionKt8Value',
        dimensionKt9 bigint '$.dimensionKt9',
        dimensionKt9Value bigint '$.dimensionKt9Value'
        
       )`, { p1: JSON.stringify(operationDt) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_payAccOperationDt(ID, payAccOperationID, sumOperation, dictFundSourceID, dictProgClassID,
          dictProjectID, accountDtID, accountKtID,
          dimensionDt0, dimensionDt0Value, dimensionDt1, dimensionDt1Value,
          dimensionDt2, dimensionDt2Value, dimensionDt3, dimensionDt3Value,
          dimensionDt4, dimensionDt4Value, dimensionDt5, dimensionDt5Value,
          dimensionDt6, dimensionDt6Value, dimensionDt7, dimensionDt7Value,
          dimensionDt8, dimensionDt8Value, dimensionDt9, dimensionDt9Value,
          dimensionKt0, dimensionKt0Value, dimensionKt1, dimensionKt1Value,
          dimensionKt2, dimensionKt2Value, dimensionKt3, dimensionKt3Value,
          dimensionKt4, dimensionKt4Value, dimensionKt5, dimensionKt5Value,
          dimensionKt6, dimensionKt6Value, dimensionKt7, dimensionKt7Value,
          dimensionKt8, dimensionKt8Value, dimensionKt9, dimensionKt9Value) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'payAccOperationID')::BIGINT, 
            (data->>'sumOperation')::numeric(19, 6),
            (data->>'dictFundSourceID')::BIGINT, 
            (data->>'dictProgClassID')::BIGINT, 
            (data->>'dictProjectID')::BIGINT, 
            (data->>'accountDtID')::BIGINT, 
            (data->>'accountKtID')::BIGINT, 
            (data->>'dimensionDt0')::BIGINT,  (data->>'dimensionDt0Value')::BIGINT,
            (data->>'dimensionDt1')::BIGINT,  (data->>'dimensionDt1Value')::BIGINT,
            (data->>'dimensionDt2')::BIGINT,  (data->>'dimensionDt2Value')::BIGINT,
            (data->>'dimensionDt3')::BIGINT,  (data->>'dimensionDt3Value')::BIGINT,
            (data->>'dimensionDt4')::BIGINT,  (data->>'dimensionDt4Value')::BIGINT,
            (data->>'dimensionDt5')::BIGINT,  (data->>'dimensionDt5Value')::BIGINT,
            (data->>'dimensionDt6')::BIGINT,  (data->>'dimensionDt6Value')::BIGINT,
            (data->>'dimensionDt7')::BIGINT,  (data->>'dimensionDt7Value')::BIGINT,
            (data->>'dimensionDt8')::BIGINT,  (data->>'dimensionDt8Value')::BIGINT,
            (data->>'dimensionDt9')::BIGINT,  (data->>'dimensionDt9Value')::BIGINT, 
            (data->>'dimensionKt0')::BIGINT,  (data->>'dimensionKt0Value')::BIGINT,
            (data->>'dimensionKt1')::BIGINT,  (data->>'dimensionKt1Value')::BIGINT,
            (data->>'dimensionKt2')::BIGINT,  (data->>'dimensionKt2Value')::BIGINT,
            (data->>'dimensionKt3')::BIGINT,  (data->>'dimensionKt3Value')::BIGINT,
            (data->>'dimensionKt4')::BIGINT,  (data->>'dimensionKt4Value')::BIGINT,
            (data->>'dimensionKt5')::BIGINT,  (data->>'dimensionKt5Value')::BIGINT,
            (data->>'dimensionKt6')::BIGINT,  (data->>'dimensionKt6Value')::BIGINT,
            (data->>'dimensionKt7')::BIGINT,  (data->>'dimensionKt7Value')::BIGINT,
            (data->>'dimensionKt8')::BIGINT,  (data->>'dimensionKt8Value')::BIGINT,
            (data->>'dimensionKt9')::BIGINT,  (data->>'dimensionKt9Value')::BIGINT
            FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(operationDt) }
      )
    }
  }
  if (operationPayEl.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_payAccOperationPayEl(ID, payAccOperationDtID, periodSalaryID, payElID, paySum)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        payAccOperationDtID bigint '$.payAccOperationDtID',
        periodSalaryID bigint '$.periodSalaryID',
        payElID bigint '$.payElID',
        paySum numeric(19, 2) '$.paySum'
       )`, { p1: JSON.stringify(operationPayEl) }
      )
    } else {
      store.execSQL(
        `INSERT INTO hr_payAccOperationPayEl(ID, payAccOperationDtID, periodSalaryID, payElID, paySum) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'payAccOperationDtID')::BIGINT, 
            (data->>'periodSalaryID')::BIGINT, 
            (data->>'payElID')::BIGINT, 
            (data->>'paySum')::numeric(19, 2)
        FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(operationPayEl) }
      )
    }
  }

  store.freeNative()
}

function getDepartments (orgID, departmentID, childDep, onDate) {
  if (departmentID && childDep) {
    let departmentIDs = UB.Repository('hr_department')
      .attrs(['mi_data_id'])
      .where('orgID', '=', orgID)
      .where('mi_treePath', 'like', `%/${departmentID}/%`)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectAsObject().map(o => o.mi_data_id)
    return departmentIDs
  } else if (departmentID) {
    return [departmentID]
  } else return null
}

function getDataByPeriod (periodID, dictFundSourceID, departmentID, childDep, dictProgClassID, dictProjectID) {
  const periodService = require('../../HR/modules/periodService')
  const sqlDialect = entityBaseService.getSQLDialect()
  const period = periodService.getPeriod(periodID)
  const limitedAccess = employeeLimitedAccess(period.orgID)
  const resultData = {}
  const periodIds = [periodID]
  const store = UB.DataStore('hr_accrual')
  if (period.priorPeriodID) {
    periodIds.push((period.priorPeriodID))
  }
  const departmentIDs = getDepartments(period.orgID, departmentID, childDep, period.dateTo)
  const dictFundSourceIDs = accrualService.getIDsFromString(dictFundSourceID)
  const dictProgClassIDs = accrualService.getIDsFromString(dictProgClassID)
  const dictProjectIDs = accrualService.getIDsFromString(dictProjectID)
  let paySummary = UB.Repository('hr_paySummary')
    .attrs(['ID', 'periodID', 'orgID', 'dateCalc', 'employees', 'hired', 'quitted', 'accruedSum', 'deductedSum',
      'paidSum', 'debtOrgSum', 'debtEmployeeSum', 'fundSum'])
    .where('periodID', 'in', periodIds)
    .selectAsObject()

  resultData.departmentIDs = departmentIDs
  resultData.balanceOut = paySummary.find(o => o.periodID === periodID) || {}
  resultData.balanceIn = paySummary.find(o => o.periodID === period.priorPeriodID) || {}
  if (departmentIDs || limitedAccess) {
    store.runSQL(` SELECT COUNT(*) as "employees",
         SUM(CASE WHEN n.dateFrom BETWEEN :dateFrom: AND :dateTo: THEN 1 ELSE 0 END) as "hired",
         SUM(CASE WHEN n.dateTo BETWEEN :dateFrom: AND :dateTo: THEN 1 ELSE 0 END) as "quitted"
        FROM hr_employeeNumber n 
        WHERE n.orgID = :orgID: AND n.dateFrom <= :dateTo: AND n.dateTo >= :dateFrom: AND n.mi_deleteDate >= :maxDate: 
        ${limitedAccess ? ' AND n.limitedAccess = 0 ' : ''}
        AND EXISTS ( SELECT 1 FROM hr_employeePosition p where p.employeeNumberID = n.ID 
                 AND p.dateFrom <= :dateTo: AND p.dateTo >= :dateFrom: AND p.mi_deleteDate >= :maxDate: 
           ${departmentIDs ? ` AND p.departmentID${entityBaseService.getInExpression('departmentID')}` : ''})`,
    {
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      orgID: period.orgID,
      maxDate: dateService.maxDate(),
      departmentID: departmentIDs
    })
    let empData = store.getAsJsObject()[0]
    resultData.balanceOut.employees = empData.employees
    resultData.balanceOut.hired = empData.hired
    resultData.balanceOut.quitted = empData.quitted
  }
  if (dictFundSourceIDs || departmentIDs || limitedAccess || dictProgClassIDs || dictProjectIDs) {
    store.runSQL(`SELECT 
           SUM(CASE WHEN empBal.sumTo < 0 THEN empBal.sumTo * -1 ELSE 0 END) AS "debtEmployeeSum",
           SUM(CASE WHEN empBal.sumTo > 0 THEN empBal.sumTo ELSE 0 END) AS "debtOrgSum"
           FROM (SELECT b.employeeNumberID, sum(b.sumTo) as sumTo
                 FROM hr_accrualBalance b
                  ${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = b.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
                 WHERE b.periodCalcID = :periodID:
                  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
                  ${dictFundSourceIDs ? ` AND (b.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}
                  ${dictFundSourceIDs && dictFundSourceIDs.includes(0) ? ' OR b.dictFundSourceID IS NULL' : ''}` : ''}
                  ${dictFundSourceIDs ? ')' : ''}
                  ${dictProgClassIDs ? ` AND (b.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}
                  ${dictProgClassIDs && dictProgClassIDs.includes(0) ? ' OR b.dictProgClassID IS NULL' : ''}` : ''}
                  ${dictProgClassIDs ? ')' : ''}
                  ${dictProjectIDs ? ` AND (b.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}
                  ${dictProjectIDs && dictProjectIDs.includes(0) ? ' OR b.dictProjectID IS NULL' : ''}` : ''}
                  ${dictProjectIDs ? ')' : ''}
                  ${(departmentIDs) ? ` AND EXISTS ( SELECT 1 FROM hr_employeePosition p JOIN hr_employeeNumber n ON n.ID = p.employeeNumberID where p.employeeNumberID = b.employeeNumberID  
                     AND ((p.dateFrom <= :dateTo: AND p.dateTo >= :dateTo:) OR (n.dateTo < :dateTo: AND
                     p.ID = (SELECT ${sqlDialect.top} p1.ID FROM hr_employeePosition p1 WHERE p1.employeeNumberID = b.employeeNumberID AND p1.mi_deleteDate >= '9999-12-31'
                     and p1.isActive = 1 ORDER BY p1.dateTo DESC ${sqlDialect.limit})
                     )) AND p.mi_deleteDate >= '9999-12-31'
                     ${departmentIDs ? ` AND p.departmentID${entityBaseService.getInExpression('departmentIDs')}` : ''})` : ''}
                  GROUP BY b.employeeNumberID) empBal`,
    {
      periodID: period.priorPeriodID,
      dictFundSourceIDs,
      dictProgClassIDs,
      dictProjectIDs,
      departmentIDs,
      orgID: period.orgID,
      dateTo: period.dateTo
    })
    const balanceDataFrom = store.getAsJsObject()[0]
    resultData.balanceIn.debtOrgSum = balanceDataFrom.debtOrgSum
    resultData.balanceIn.debtEmployeeSum = balanceDataFrom.debtEmployeeSum
    store.runSQL(`SELECT 
           SUM(CASE WHEN empBal.sumTo < 0 THEN empBal.sumTo * -1 ELSE 0 END) AS "debtEmployeeSum",
           SUM(CASE WHEN empBal.sumTo > 0 THEN empBal.sumTo ELSE 0 END) AS "debtOrgSum"
           FROM (SELECT b.employeeNumberID, sum(b.sumTo) as sumTo
                 FROM hr_accrualBalance b
                  ${limitedAccess ? ` JOIN hr_employeeNumber en ON en.ID = b.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
                   WHERE b.periodCalcID = :periodID:
                  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
                  ${dictFundSourceIDs ? ` AND (b.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}
                  ${dictFundSourceIDs && dictFundSourceIDs.includes(0) ? ' OR b.dictFundSourceID IS NULL' : ''}` : ''}
                  ${dictFundSourceIDs ? ')' : ''}
                  ${dictProgClassIDs ? ` AND (b.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}
                  ${dictProgClassIDs && dictProgClassIDs.includes(0) ? ' OR b.dictProgClassID IS NULL' : ''}` : ''}
                  ${dictProgClassIDs ? ')' : ''}
                  ${dictProjectIDs ? ` AND (b.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}
                  ${dictProjectIDs && dictProjectIDs.includes(0) ? ' OR b.dictProjectID IS NULL' : ''}` : ''}
                  ${dictProjectIDs ? ')' : ''}
                  ${(departmentIDs) ? ` AND EXISTS ( SELECT 1 FROM hr_employeePosition p JOIN hr_employeeNumber n ON n.ID = p.employeeNumberID where p.employeeNumberID = b.employeeNumberID  
                     AND ((p.dateFrom <= :dateTo: AND p.dateTo >= :dateTo:) OR (n.dateTo < :dateTo: AND
                     p.ID = (SELECT ${sqlDialect.top} p1.ID FROM hr_employeePosition p1 WHERE p1.employeeNumberID = b.employeeNumberID AND p1.mi_deleteDate >= '9999-12-31'
                     and p1.isActive = 1 ORDER BY p1.dateTo DESC ${sqlDialect.limit})
                     )) AND p.mi_deleteDate >= '9999-12-31'
                     ${departmentIDs ? ` AND p.departmentID${entityBaseService.getInExpression('departmentIDs')}` : ''})` : ''}
                  GROUP BY b.employeeNumberID) empBal`,
    {
      periodID: period.ID,
      dictFundSourceIDs,
      dictProgClassIDs,
      dictProjectIDs,
      departmentIDs,
      orgID: period.orgID,
      dateTo: period.dateTo
    })
    const balanceDataTo = store.getAsJsObject()[0]
    resultData.balanceOut.debtOrgSum = balanceDataTo.debtOrgSum
    resultData.balanceOut.debtEmployeeSum = balanceDataTo.debtEmployeeSum
  }
  if (dictFundSourceIDs || departmentIDs || dictProgClassIDs || dictProjectIDs) {
    store.runSQL(`SELECT
          SUM(aDt.paySum) as "paySum",
          a.payElID "payElID",
          a.periodCalcID "periodID",
          p.code "code",
          p.name "name",
          p.mi_deleteUser "payElDeleted",
          g.groupType "payType",
          m.code "methodCode",
          p.ignoreInCalcPay "ignoreInCalcPay"
        FROM hr_accrual a
          JOIN hr_employeeNumber n ON n.ID = a.employeeNumberID AND n.empWorkPlace IS NULL
          JOIN hr_payEl p ON a.payElID = p.ID
          JOIN hr_method m ON p.methodID = m.ID
          JOIN hr_methodGroup g ON m.methodGroupID = g.ID
          JOIN hr_accrualDt aDt ON a.ID = aDt.accrualID
          ${limitedAccess ? ` JOIN hr_employeeNumber en ON en.ID = a.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
          WHERE a.periodCalcID = :periodID: 
          AND a.flagsRec & 8192 != 8192
        ${dictFundSourceIDs ? `and (aDt.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}
        ${dictFundSourceIDs && dictFundSourceIDs.includes(0) ? ' OR aDt.dictFundSourceID IS NULL' : ''}` : ''}
        ${dictFundSourceIDs ? ')' : ''}
        ${dictProgClassIDs ? `and (aDt.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}
        ${dictProgClassIDs && dictProgClassIDs.includes(0) ? ' OR aDt.dictProgClassID IS NULL' : ''}` : ''}
        ${dictProgClassIDs ? ')' : ''}
        ${dictProjectIDs ? ` and (aDt.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}
        ${dictProjectIDs && dictProjectIDs.includes(0) ? ' OR aDt.dictProjectID IS NULL' : ''}` : ''}
        ${dictProjectIDs ? ')' : ''}
        ${departmentIDs ? `and (aDt.departmentID${entityBaseService.getInExpression('departmentIDs')})` : ''}
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        GROUP BY a.payElID, a.periodCalcID, p.code, p.name, p.mi_deleteUser, g.groupType, m.code, p.codeSort, p.ignoreInCalcPay
        ORDER BY p.codeSort
  `, {
      periodID: period.ID,
      dictFundSourceIDs,
      dictProgClassIDs,
      dictProjectIDs,
      departmentIDs
    })
    resultData.accrual = store.getAsJsObject()

    store.runSQL(` SELECT 
          SUM(aFDt.paySum) as "paySum",
          aF.payFundID "payFundID",
          pF.code "code",
          pF.name "name",
          aF.periodCalcID "periodID",
          pF.isRecSum "isRecSum"
        FROM hr_accrualFund aF
          JOIN hr_employeeNumber n ON n.ID = aF.employeeNumberID AND n.empWorkPlace IS NULL
          JOIN hr_payFund pF ON aF.payFundID = pF.ID
          JOIN hr_accrualFundDt aFDt ON aF.ID = aFDt.accrualFundID
          ${limitedAccess ? `JOIN hr_employeeNumber en ON en.ID = aF.employeeNumberID AND en.mi_deleteDate >= '9999-12-31'` : ''}
        WHERE aF.periodCalcID = :periodID: 
        ${dictFundSourceIDs ? `and (aFDt.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}
        ${dictFundSourceIDs && dictFundSourceIDs.includes(0) ? ' OR aFDt.dictFundSourceID IS NULL' : ''}` : ''}
        ${dictFundSourceIDs ? ')' : ''}
        ${dictProgClassIDs ? `and (aFDt.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}
        ${dictProgClassIDs && dictProgClassIDs.includes(0) ? ' OR aFDt.dictProgClassID IS NULL' : ''}` : ''}
        ${dictProgClassIDs ? ')' : ''}
        ${dictProjectIDs ? ` and (aFDt.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}
        ${dictProjectIDs && dictProjectIDs.includes(0) ? ' OR aFDt.dictProjectID IS NULL' : ''}` : ''}
        ${dictProjectIDs ? ')' : ''}
        ${departmentIDs ? `and (aFDt.departmentID${entityBaseService.getInExpression('departmentIDs')})` : ''}
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        GROUP BY aF.payFundID, pF.code, pF.name, aF.periodCalcID, pF.isRecSum, pF.codeSort
        ORDER BY pF.codeSort
  `,
    {
      periodID: period.ID,
      dictFundSourceIDs,
      dictProgClassIDs,
      dictProjectIDs,
      departmentIDs
    })
    resultData.accrualFund = store.getAsJsObject()
  } else if (limitedAccess) {
    store.runSQL(`SELECT
          SUM(a.paySum) as "paySum",
          a.payElID "payElID",
          a.periodCalcID "periodID",
          p.code "code",
          p.name "name",
          p.mi_deleteUser "payElDeleted",
          g.groupType "payType",
          m.code "methodCode",
          p.ignoreInCalcPay "ignoreInCalcPay"
        FROM hr_accrual a
          JOIN hr_payEl p ON a.payElID = p.ID
          JOIN hr_method m ON p.methodID = m.ID
          JOIN hr_methodGroup g ON m.methodGroupID = g.ID
          JOIN hr_employeeNumber en ON en.ID = a.employeeNumberID AND en.empWorkPlace IS NULL AND en.mi_deleteDate >= '9999-12-31' 
          WHERE a.periodCalcID = :periodID: 
          AND a.flagsRec & 8192 != 8192
          AND en.limitedAccess = 0
        GROUP BY a.payElID, a.periodCalcID, p.code, p.name, p.mi_deleteUser, g.groupType, m.code, p.codeSort, p.ignoreInCalcPay
        ORDER BY p.codeSort
  `, {
      periodID: period.ID
    })
    resultData.accrual = store.getAsJsObject()
    store.runSQL(` SELECT
          SUM(round(aF.paySum,2)) as "paySum",
          aF.payFundID "payFundID",
          pF.code "code",
          pF.name "name",
          aF.periodCalcID "periodID",
          pF.isRecSum "isRecSum"
        FROM hr_accrualFund aF
          JOIN hr_payFund pF ON aF.payFundID = pF.ID
          JOIN hr_employeeNumber en ON en.ID = aF.employeeNumberID AND en.empWorkPlace IS NULL AND en.mi_deleteDate >= '9999-12-31'
        WHERE aF.periodCalcID = :periodID: 
        AND en.limitedAccess = 0
        GROUP BY aF.payFundID, pF.code, pF.name, aF.periodCalcID, pF.isRecSum, pF.codeSort
        ORDER BY pF.codeSort
  `,
    {
      periodID: period.ID
    })
    resultData.accrualFund = store.getAsJsObject()
  } else {
    resultData.accrual = UB.Repository('hr_payCalcSummarySheet')
      .attrs(['ID', 'payElID', 'payElID.code', 'payElID.name', 'paySum', 'payElID.methodID.code', 'payElID.methodID.methodGroupID.groupType', 'periodID', 'payElID.mi_deleteUser', 'payElID.ignoreInCalcPay'])
      .where('periodID', '=', periodID)
      .orderBy('payElID.codeSort')
      .selectAsObject({
        'payElID.code': 'code',
        'payElID.name': 'name',
        'payElID.methodID.code': 'methodCode',
        'payElID.methodID.methodGroupID.groupType': 'payType',
        'payElID.mi_deleteUser': 'payElDeleted',
        'payElID.ignoreInCalcPay': 'ignoreInCalcPay'
      })
    resultData.accrualFund = UB.Repository('hr_payFundSummarySheet')
      .attrs(['ID', 'payFundID', 'payFundID.code', 'payFundID.name', 'payFundID.isRecSum', 'paySum', 'periodID'])
      .where('periodID', '=', periodID)
      .orderBy('payFundID.codeSort')
      .selectAsObject({
        'payFundID.code': 'code',
        'payFundID.name': 'name',
        'payFundID.isRecSum': 'isRecSum'
      })
  }
  resultData.paymentOrder = UB.Repository('hr_paymentOrder')
    .attrs(['ID', 'paySum', 'payObligatoryID', 'payObligatoryID.name',
      'payObligatoryID.organizationID.name', 'payRollID.orderNumber', 'payRollID.orderDate',
      'payRollID.description', 'orderState', 'contrAccountID.description', 'contrAccountID.organizationID.name'
    ])
    .where('periodCalcID', '=', periodID)
    .where('paySum', '!=', 0)
    .joinCondition('payObligatoryID.organizationID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'payObligatoryID.name': 'name',
      'contrAccountID.organizationID.name': 'contractorName',
      'contrAccountID.description': 'contrAccountName',
      'payRollID.description': 'payRollName',
      'payObligatoryID.organizationID.name': 'payerName',
      'mi_modifyDate': 'payRollDate'
    })

  resultData.paymentOrder.forEach(row => {
    row.docDescription = (row['payRollName'] || row['payRollID.orderNumber'] || row['payRollID.orderDate'])
      ? `${row['payRollName'] || ''} ${row['payRollID.orderNumber'] || ''} ${row['payRollID.orderDate'] ? dateService.formatDate(row['payRollID.orderDate']) : ''}`
      : null
    delete row['payRollID.orderNumber']
    delete row['payRollID.orderDate']
    delete row['payRollID.description']
  })

  resultData.accOperation = UB.Repository('hr_payAccOperationDt')
    .attrs(['ID', 'payAccOperationID', 'payAccOperationID.entryOperationID.name', 'payAccOperationID.entryOperationID.code',
      'sumOperation', 'accountDtID.description', 'accountKtID.description', 'accountDtID.code', 'accountKtID.code',
      'dictFundSourceID.name', 'dictFundSourceID', 'dictProgClassID.name', 'dictProgClassID', 'dictProjectID.name', 'dictProjectID',
      'dimensionDt0.description', 'dimensionDt0Value.caption', 'dimensionDt1.description', 'dimensionDt1Value.caption',
      'dimensionDt2.description', 'dimensionDt2Value.caption', 'dimensionDt3.description', 'dimensionDt3Value.caption',
      'dimensionDt4.description', 'dimensionDt4Value.caption', 'dimensionDt5.description', 'dimensionDt5Value.caption',
      'dimensionDt6.description', 'dimensionDt6Value.caption', 'dimensionDt7.description', 'dimensionDt7Value.caption',
      'dimensionDt8.description', 'dimensionDt8Value.caption', 'dimensionDt9.description', 'dimensionDt9Value.caption',
      'dimensionKt0.description', 'dimensionKt0Value.caption', 'dimensionKt1.description', 'dimensionKt1Value.caption',
      'dimensionKt2.description', 'dimensionKt2Value.caption', 'dimensionKt3.description', 'dimensionKt3Value.caption',
      'dimensionKt4.description', 'dimensionKt4Value.caption', 'dimensionKt5.description', 'dimensionKt5Value.caption',
      'dimensionKt6.description', 'dimensionKt6Value.caption', 'dimensionKt7.description', 'dimensionKt7Value.caption',
      'dimensionKt8.description', 'dimensionKt8Value.caption', 'dimensionKt9.description', 'dimensionKt9Value.caption'
    ])
    .whereIf(dictFundSourceIDs, 'dictFundSourceID', 'in', dictFundSourceIDs, 'df')
    .whereIf(dictFundSourceIDs && dictFundSourceIDs.includes(0), 'dictFundSourceID', 'isNull', undefined, 'dfNull')
    .whereIf(dictProgClassIDs, 'dictProgClassID', 'in', dictProgClassIDs, 'pc')
    .whereIf(dictProgClassIDs && dictProgClassIDs.includes(0), 'dictProgClassID', 'isNull', undefined, 'pcNull')
    .whereIf(dictProjectIDs, 'dictProjectID', 'in', dictProjectIDs, 'dp')
    .whereIf(dictProjectIDs && dictProjectIDs.includes(0), 'dictProjectID', 'isNull', undefined, 'dpNull')
    .where('payAccOperationID.periodSalaryID', '=', periodID)
    .logic((dictFundSourceIDs && dictFundSourceIDs.includes(0) ? '([df] OR [dfNull])' : '(1 = 1)') +
      'and' + (dictProgClassIDs && dictProgClassIDs.includes(0) ? '([pc] OR [pcNull])' : '(1 = 1)') +
      'and' + (dictProjectIDs && dictProjectIDs.includes(0) ? '([dp] OR [dpNull])' : '(1 = 1)')
    )
    .orderBy('payAccOperationID.entryOperationID.code')
    .selectAsObject({
      'payAccOperationID.entryOperationID.code': 'code',
      'payAccOperationID.entryOperationID.name': 'name',
      'accountDtID.description': 'dtDescription',
      'accountKtID.description': 'ktDescription',
      'accountDtID.code': 'dtCode',
      'accountKtID.code': 'ktCode',
      'dictFundSourceID.name': 'dictFundSourceIDName',
      'dictProgClassID.name': 'dictProgClassIDName',
      'dictProjectID.name': 'dictProjectIDName',
      'dimensionDt0.description': 'dimensionDt0',
      'dimensionDt0Value.caption': 'dimensionDt0Value',
      'dimensionDt1.description': 'dimensionDt1',
      'dimensionDt1Value.caption': 'dimensionDt1Value',
      'dimensionDt2.description': 'dimensionDt2',
      'dimensionDt2Value.caption': 'dimensionDt2Value',
      'dimensionDt3.description': 'dimensionDt3',
      'dimensionDt3Value.caption': 'dimensionDt3Value',
      'dimensionDt4.description': 'dimensionDt4',
      'dimensionDt4Value.caption': 'dimensionDt4Value',
      'dimensionDt5.description': 'dimensionDt5',
      'dimensionDt5Value.caption': 'dimensionDt5Value',
      'dimensionDt6.description': 'dimensionDt6',
      'dimensionDt6Value.caption': 'dimensionDt6Value',
      'dimensionDt7.description': 'dimensionDt7',
      'dimensionDt7Value.caption': 'dimensionDt7Value',
      'dimensionDt8.description': 'dimensionDt8',
      'dimensionDt8Value.caption': 'dimensionDt8Value',
      'dimensionDt9.description': 'dimensionDt9',
      'dimensionDt9Value.caption': 'dimensionDt9Value',
      'dimensionKt0.description': 'dimensionKt0',
      'dimensionKt0Value.caption': 'dimensionKt0Value',
      'dimensionKt1.description': 'dimensionKt1',
      'dimensionKt1Value.caption': 'dimensionKt1Value',
      'dimensionKt2.description': 'dimensionKt2',
      'dimensionKt2Value.caption': 'dimensionKt2Value',
      'dimensionKt3.description': 'dimensionKt3',
      'dimensionKt3Value.caption': 'dimensionKt3Value',
      'dimensionKt4.description': 'dimensionKt4',
      'dimensionKt4Value.caption': 'dimensionKt4Value',
      'dimensionKt5.description': 'dimensionKt5',
      'dimensionKt5Value.caption': 'dimensionKt5Value',
      'dimensionKt6.description': 'dimensionKt6',
      'dimensionKt6Value.caption': 'dimensionKt6Value',
      'dimensionKt7.description': 'dimensionKt7',
      'dimensionKt7Value.caption': 'dimensionKt7Value',
      'dimensionKt8.description': 'dimensionKt8',
      'dimensionKt8Value.caption': 'dimensionKt8Value',
      'dimensionKt9.description': 'dimensionKt9',
      'dimensionKt9Value.caption': 'dimensionKt9Value'
    })
  const dictFundSources = UB.Repository('ac_dictFundSource')
    .attrs(['ID', 'fundSourceID', 'name'])
    .where('organizationID', '=', period.orgID)
    .selectAsObject()
  resultData.accOperation.forEach(row => {
    if (row.dictFundSourceID) {
      const dictFundSource = dictFundSources.find(o => o.fundSourceID === row.dictFundSourceID)
      if (dictFundSource) {
        row.dictFundSourceIDName = dictFundSource.name
      }
    }
  })
  resultData.entry = getStateEntry(period)
  return resultData
}

function getDataByOperation (operationID) {
  return UB.Repository('hr_payAccOperationPayEl')
    .attrs(['periodSalaryID.name', 'payElID.code', 'payElID.name', 'paySum'])
    .where('payAccOperationDtID', '=', operationID)
    .orderBy('periodSalaryID')
    .orderBy('payElID.code')
    .selectAsObject({
      'periodSalaryID.name': 'periodName',
      'payElID.code': 'code',
      'payElID.name': 'name'
    })
}

function getDataByPayEl (periodID, payElID, dictFundSourceID, departmentID, childDep, dictProgClassID, dictProjectID) {
  const period = periodService.getPeriod(periodID)
  const limitedAccess = employeeLimitedAccess(period.orgID)
  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('hr_accrual')
  if (dictFundSourceID || departmentID || dictProgClassID) {
    const departmentIDs = getDepartments(period.orgID, departmentID, childDep, period.dateTo)
    const dictFundSourceIDs = accrualService.getIDsFromString(dictFundSourceID)
    const dictProgClassIDs = accrualService.getIDsFromString(dictProgClassID)
    const dictProjectIDs = accrualService.getIDsFromString(dictProjectID)
    store.runSQL(`SELECT SUM(aDt.paySum) as "paySum", a.employeeNumberID "employeeNumberID", en.description "fullFIO", en.tabNum as "tabNum", en.tabNumSort as "tabNumSort",
                          (select ${sqlDialect.top} (case when pos.name IS NOT NULL then pos.name else dp.name end) 
                          from hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID 
                          and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' and 
                          pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' 
                          left join hr_dictPosition dp ON dp.ID = ep.dictPositionID
                          where ep.employeeNumberID = en.ID and ep.isActive = 1 
                          and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                          and ep.mi_deleteDate >= '9999-12-31' 
                          order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) as "posName",
                          (select ${sqlDialect.top} dep.name from hr_employeePosition ep 
                          left join hr_department dep on dep.mi_data_id = ep.departmentID 
                          and dep.orgID = ep.organizationID and dep.state = 'ACTIVE' 
                          and dep.mi_dateFrom <= ep.dateTo and dep.mi_deleteDate >= '9999-12-31'
                          where ep.employeeNumberID = en.ID and ep.isActive = 1 
                          and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                          and ep.mi_deleteDate >= '9999-12-31' 
                          order by ep.dateTo desc, dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
                     FROM hr_accrual a
                     JOIN hr_accrualDt aDt ON a.ID = aDt.accrualID
                     JOIN hr_employeeNumber en ON en.ID = a.employeeNumberID AND en.empWorkPlace IS NULL
                     WHERE a.periodCalcID = :periodID: 
                          AND a.payElID = :payElID:
                          AND a.flagsRec & 4096 = 0
                          ${dictFundSourceIDs ? `and (aDt.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
                          ${dictFundSourceIDs && dictFundSourceIDs.includes(0) ? ' OR aDt.dictFundSourceID IS NULL' : ''}
                          ${dictFundSourceIDs ? ')' : ''}
                          ${dictProgClassIDs ? `and (aDt.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
                          ${dictProgClassIDs && dictProgClassIDs.includes(0) ? ' OR aDt.dictProgClassID IS NULL' : ''}
                          ${dictProgClassIDs ? ')' : ''}
                          ${dictProjectIDs ? ` and (aDt.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}` : ''}
                          ${dictProjectIDs && dictProjectIDs.includes(0) ? ' OR aDt.dictProjectID IS NULL' : ''}
                          ${dictProjectIDs ? ')' : ''}
                          ${departmentIDs ? ` AND (aDt.departmentID${entityBaseService.getInExpression('departmentIDs')})` : ''}
                          ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
                           GROUP BY a.employeeNumberID, en.description, en.dateFrom, en.dateTo, en.ID, en.tabNum, en.tabNumSort
                           ORDER BY en.description`,
    {
      periodID: periodID,
      payElID: payElID,
      dictFundSourceIDs,
      dictProgClassIDs,
      dictProjectIDs,
      departmentIDs,
      dateTo: period.dateTo
    })
    return store.getAsJsObject()
  } else {
    store.runSQL(`SELECT SUM(a.paySum) as "paySum", a.employeeNumberID "employeeNumberID", en.description "fullFIO", en.tabNum as "tabNum", en.tabNumSort as "tabNumSort",
                          (select ${sqlDialect.top} (case when pos.name IS NOT NULL then pos.name else dp.name end) 
                          from hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID 
                          and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' and 
                          pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' 
                          left join hr_dictPosition dp ON dp.ID = ep.dictPositionID
                          where ep.employeeNumberID = en.ID and ep.isActive = 1 
                          and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                          and ep.mi_deleteDate >= '9999-12-31' 
                          order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) as "posName",
                          (select ${sqlDialect.top} dep.name from hr_employeePosition ep 
                          left join hr_department dep on dep.mi_data_id = ep.departmentID 
                          and dep.orgID = ep.organizationID and dep.state = 'ACTIVE' 
                          and dep.mi_dateFrom <= ep.dateTo and dep.mi_deleteDate >= '9999-12-31'
                          where ep.employeeNumberID = en.ID and ep.isActive = 1 
                          and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                          and ep.mi_deleteDate >= '9999-12-31' 
                          order by ep.dateTo desc, dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
                     FROM hr_accrual a
                     JOIN hr_employeeNumber en ON en.ID = a.employeeNumberID AND en.empWorkPlace IS NULL
                     WHERE a.periodCalcID = :periodID: 
                          AND a.payElID = :payElID:
                          AND a.flagsRec & 4096 = 0
                          ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
                           GROUP BY a.employeeNumberID, en.description, en.dateFrom, en.dateTo, en.ID, en.tabNum, en.tabNumSort
                           ORDER BY en.description`,
    {
      periodID: periodID,
      payElID: payElID,
      dateTo: period.dateTo
    })
    return store.getAsJsObject()
  }
}

function getDataByPayFund (periodID, payFundID, dictFundSourceID, departmentID, childDep, dictProgClassID, dictProjectID) {
  let accrualFund
  const period = periodService.getPeriod(periodID)
  const limitedAccess = employeeLimitedAccess(period.orgID)
  const store = UB.DataStore('hr_accrual')
  const sqlDialect = entityBaseService.getSQLDialect()
  if (dictFundSourceID || departmentID || dictProgClassID || dictProjectID) {
    const departmentIDs = getDepartments(period.orgID, departmentID, childDep, period.dateTo)
    const dictFundSourceIDs = accrualService.getIDsFromString(dictFundSourceID)
    const dictProgClassIDs = accrualService.getIDsFromString(dictProgClassID)
    const dictProjectIDs = accrualService.getIDsFromString(dictProjectID)
    store.runSQL(` SELECT sum(round(aFDt.paySum,2)) as "paySum",  a.employeeNumberID "employeeNumberID", en.description "fullFIO",
                        (select ${sqlDialect.top} (case when pos.name IS NOT NULL then pos.name else dp.name end) 
                         FROM hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID 
                        and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' and 
                        pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' 
                        left join hr_dictPosition dp ON dp.ID = ep.dictPositionID
                        where ep.employeeNumberID = en.ID and ep.isActive = 1 
                        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                        and ep.mi_deleteDate >= '9999-12-31'
                        order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) as "posName",
                        ( select ${sqlDialect.top} dep.name from hr_employeePosition ep 
                        left join hr_department dep on dep.mi_data_id = ep.departmentID 
                        and dep.orgID = ep.organizationID and dep.state = 'ACTIVE' 
                        and dep.mi_dateFrom <= ep.dateTo and dep.mi_deleteDate >= '9999-12-31'
                        where ep.employeeNumberID = en.ID and ep.isActive = 1 
                        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                        and ep.mi_deleteDate >= '9999-12-31' 
                        order by ep.dateTo desc, dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
                     FROM hr_accrualFund a
                     JOIN hr_accrualFundDt aFDt ON a.ID = aFDt.accrualFundID
                     JOIN hr_employeeNumber en ON en.ID = a.employeeNumberID AND en.empWorkPlace IS NULL
                     WHERE a.periodCalcID = :periodID: 
                        AND a.payFundID = :payFundID:
                         ${dictFundSourceIDs ? `and (aFDt.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDs')}` : ''}
                         ${dictFundSourceIDs && dictFundSourceIDs.includes(0) ? ' OR aFDt.dictFundSourceID IS NULL' : ''}
                         ${dictFundSourceIDs ? ')' : ''}
                         ${dictProgClassIDs ? `and (aFDt.dictProgClassID${entityBaseService.getInExpression('dictProgClassIDs')}` : ''}
                         ${dictProgClassIDs && dictProgClassIDs.includes(0) ? ' OR aFDt.dictProgClassID IS NULL' : ''}
                         ${dictProgClassIDs ? ')' : ''}
                         ${dictProjectIDs ? ` and (aFDt.dictProjectID${entityBaseService.getInExpression('dictProjectIDs')}` : ''}
                         ${dictProjectIDs && dictProjectIDs.includes(0) ? ' OR aFDt.dictProjectID IS NULL' : ''}
                         ${dictProjectIDs ? ')' : ''}
                         ${departmentIDs ? ` AND (aFDt.departmentID${entityBaseService.getInExpression('departmentIDs')})` : ''}
                         ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
                         GROUP BY a.employeeNumberID, en.description, en.dateFrom, en.dateTo, en.ID
                         ORDER BY en.description`,
    {
      periodID: periodID,
      payFundID: payFundID,
      dictFundSourceIDs,
      dictProgClassIDs,
      dictProjectIDs,
      departmentIDs,
      dateTo: period.dateTo
    })
    accrualFund = store.getAsJsObject().map(row => {
      row.paySum = accrualService.round(row.paySum || 0)
      return row
    })
  } else {
    accrualFund = UB.Repository('hr_accrualFund')
      .attrs(['employeeNumberID', 'employeeNumberID.description', 'sum(round([paySum],2))', 'employeeNumberID.posName', 'employeeNumberID.depName'])
      .where('periodCalcID', '=', periodID)
      .where('payFundID', '=', payFundID)
      .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0)
      .groupBy(['employeeNumberID', 'employeeNumberID.description', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo', 'employeeNumberID.ID'])
      .orderBy('employeeNumberID.description')
      .selectAsObject({
        'sum(round([paySum],2))': 'paySum',
        'employeeNumberID.description': 'fullFIO',
        'employeeNumberID.posName': 'posName',
        'employeeNumberID.depName': 'depName'
      })

    store.runSQL(` SELECT sum(round(a.paySum,2)) as "paySum",  a.employeeNumberID "employeeNumberID", en.description "fullFIO",
                        (select ${sqlDialect.top} (case when pos.name IS NOT NULL then pos.name else dp.name end) 
                         FROM hr_employeePosition ep left join hr_position pos on pos.mi_data_id = ep.positionID 
                        and pos.orgID = ep.organizationID and pos.state = 'ACTIVE' and 
                        pos.mi_dateFrom <= ep.dateTo and pos.mi_deleteDate >= '9999-12-31' 
                        left join hr_dictPosition dp ON dp.ID = ep.dictPositionID
                        where ep.employeeNumberID = en.ID and ep.isActive = 1 
                        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                        and ep.mi_deleteDate >= '9999-12-31'
                        order by ep.dateTo desc, pos.mi_dateTo desc ${sqlDialect.limit}) as "posName",
                        ( select ${sqlDialect.top} dep.name from hr_employeePosition ep 
                        left join hr_department dep on dep.mi_data_id = ep.departmentID 
                        and dep.orgID = ep.organizationID and dep.state = 'ACTIVE' 
                        and dep.mi_dateFrom <= ep.dateTo and dep.mi_deleteDate >= '9999-12-31'
                        where ep.employeeNumberID = en.ID and ep.isActive = 1 
                        and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.dateFrom <= :dateTo:
                        and ep.mi_deleteDate >= '9999-12-31' 
                        order by ep.dateTo desc, dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
                     FROM hr_accrualFund a
                     JOIN hr_employeeNumber en ON en.ID = a.employeeNumberID AND en.empWorkPlace IS NULL
                     WHERE a.periodCalcID = :periodID: 
                        AND a.payFundID = :payFundID:
                         ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
                         GROUP BY a.employeeNumberID, en.description, en.dateFrom, en.dateTo, en.ID
                         ORDER BY en.description`,
    {
      periodID: periodID,
      payFundID: payFundID,
      dateTo: period.dateTo
    })
    accrualFund = store.getAsJsObject().map(row => {
      row.paySum = accrualService.round(row.paySum || 0)
      return row
    })
  }
  return accrualFund
}
function postingXLSX (period) {
  const payAccOperation = UB.Repository('hr_payAccOperationDt')
    .attrs(['payAccOperationID', 'payAccOperationID.entryOperationID.name', 'payAccOperationID.entryOperationID.code',
      'sumOperation', 'accountDtID.name', 'accountKtID.name', 'accountDtID.code', 'accountKtID.code',
      'dictFundSourceID.name', 'dictProgClassID.name', 'dictProjectID.name',
      'dimensionDt0.description', 'dimensionDt0Value.caption', 'dimensionDt1.description', 'dimensionDt1Value.caption',
      'dimensionDt2.description', 'dimensionDt2Value.caption', 'dimensionDt3.description', 'dimensionDt3Value.caption',
      'dimensionDt4.description', 'dimensionDt4Value.caption', 'dimensionDt5.description', 'dimensionDt5Value.caption',
      'dimensionDt6.description', 'dimensionDt6Value.caption', 'dimensionDt7.description', 'dimensionDt7Value.caption',
      'dimensionDt8.description', 'dimensionDt8Value.caption', 'dimensionDt9.description', 'dimensionDt9Value.caption',
      'dimensionKt0.description', 'dimensionKt0Value.caption', 'dimensionKt1.description', 'dimensionKt1Value.caption',
      'dimensionKt2.description', 'dimensionKt2Value.caption', 'dimensionKt3.description', 'dimensionKt3Value.caption',
      'dimensionKt4.description', 'dimensionKt4Value.caption', 'dimensionKt5.description', 'dimensionKt5Value.caption',
      'dimensionKt6.description', 'dimensionKt6Value.caption', 'dimensionKt7.description', 'dimensionKt7Value.caption',
      'dimensionKt8.description', 'dimensionKt8Value.caption', 'dimensionKt9.description', 'dimensionKt9Value.caption'
    ])

    .where('payAccOperationID.periodSalaryID', '=', period.ID)
    .orderBy('payAccOperationID.entryOperationID.code')
    .selectAsObject()
  const doc = new tpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '2',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 10
        },
        height: 8
      }
    },
    docTable: {
      baseStyle: 'baseBlock',
      font: { size: 9, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: [{ width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 40 }, { width: 20 }, { width: 40 },
          { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
          { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
          { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
          { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
          { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 },
          { width: 20 }]
      }
    }
  }, 'xlsx')

  let table = []
  table.push([
    { content: 'Організація' },
    { content: 'Операція' },
    { content: 'Розрахунковий період' },
    { content: 'Дата проводки' },
    { content: 'Дебет, Номер рахунку' },
    { content: 'Дебет, Назва рахунку' },
    { content: 'Кредит, Номер рахунку' },
    { content: 'Кредит, Назва рахунку' },
    { content: 'Сума' },
    { content: 'Джерело фінансування' },
    { content: 'Вид аналітики Дт (0)' },
    { content: 'Значення аналітики Дт (0)' },
    { content: 'Вид аналітики Дт (1)' },
    { content: 'Значення аналітики Дт (1)' },
    { content: 'Вид аналітики Дт (2)' },
    { content: 'Значення аналітики Дт (2)' },
    { content: 'Вид аналітики Дт (3)' },
    { content: 'Значення аналітики Дт (3)' },
    { content: 'Вид аналітики Дт (4)' },
    { content: 'Значення аналітики Дт (4)' },
    { content: 'Вид аналітики Дт (5)' },
    { content: 'Значення аналітики Дт (5)' },
    { content: 'Вид аналітики Дт (6)' },
    { content: 'Значення аналітики Дт (6)' },
    { content: 'Вид аналітики Дт (7)' },
    { content: 'Значення аналітики Дт (7)' },
    { content: 'Вид аналітики Дт (8)' },
    { content: 'Значення аналітики Дт (8)' },
    { content: 'Вид аналітики Дт (9)' },
    { content: 'Значення аналітики Дт (9)' },
    { content: 'Вид аналітики Кт (0)' },
    { content: 'Значення аналітики Кт (0)' },
    { content: 'Вид аналітики Кт (1)' },
    { content: 'Значення аналітики Кт (1)' },
    { content: 'Вид аналітики Кт (2)' },
    { content: 'Значення аналітики Кт (2)' },
    { content: 'Вид аналітики Кт (3)' },
    { content: 'Значення аналітики Кт (3)' },
    { content: 'Вид аналітики Кт (4)' },
    { content: 'Значення аналітики Кт (4)' },
    { content: 'Вид аналітики Кт (5)' },
    { content: 'Значення аналітики Кт (5)' },
    { content: 'Вид аналітики Кт (6)' },
    { content: 'Значення аналітики Кт (6)' },
    { content: 'Вид аналітики Кт (7)' },
    { content: 'Значення аналітики Кт (7)' },
    { content: 'Вид аналітики Кт (8)' },
    { content: 'Значення аналітики Кт (8)' },
    { content: 'Вид аналітики Кт (9)' },
    { content: 'Значення аналітики Кт (9)' }
  ])
  const orgName = UB.Repository('hr_organization')
    .attrs(['name'])
    .where('mi_data_id', '=', period.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: period.dateTo })
    .selectScalar() || ''
  const dateFrom = dateService.formatDate(period.dateFrom)
  const dateTo = dateService.formatDate(period.dateTo)
  payAccOperation.forEach(row => {
    table.push([
      { content: orgName },
      { content: row['payAccOperationID.entryOperationID.name'] },
      { content: dateFrom },
      { content: dateTo },
      { content: row['accountDtID.code'] },
      { content: row['accountDtID.name'] },
      { content: row['accountKtID.code'] },
      { content: row['accountKtID.name'] },
      { content: row['sumOperation'], style: { align: 'right', format: '#,##0.00' } },
      { content: row['dictFundSourceID.name'] },
      // { content: row['dictProgClassID.name'] },
      { content: row['dimensionDt0.description'] },
      { content: row['dimensionDt0Value.caption'] },
      { content: row['dimensionDt1.description'] },
      { content: row['dimensionDt1Value.caption'] },
      { content: row['dimensionDt2.description'] },
      { content: row['dimensionDt2Value.caption'] },
      { content: row['dimensionDt3.description'] },
      { content: row['dimensionDt3Value.caption'] },
      { content: row['dimensionDt4.description'] },
      { content: row['dimensionDt4Value.caption'] },
      { content: row['dimensionDt5.description'] },
      { content: row['dimensionDt5Value.caption'] },
      { content: row['dimensionDt6.description'] },
      { content: row['dimensionDt6Value.caption'] },
      { content: row['dimensionDt7.description'] },
      { content: row['dimensionDt7Value.caption'] },
      { content: row['dimensionDt8.description'] },
      { content: row['dimensionDt8Value.caption'] },
      { content: row['dimensionDt9.description'] },
      { content: row['dimensionDt9Value.caption'] },
      { content: row['dimensionKt0.description'] },
      { content: row['dimensionKt0Value.caption'] },
      { content: row['dimensionKt1.description'] },
      { content: row['dimensionKt1Value.caption'] },
      { content: row['dimensionKt2.description'] },
      { content: row['dimensionKt2Value.caption'] },
      { content: row['dimensionKt3.description'] },
      { content: row['dimensionKt3Value.caption'] },
      { content: row['dimensionKt4.description'] },
      { content: row['dimensionKt4Value.caption'] },
      { content: row['dimensionKt5.description'] },
      { content: row['dimensionKt5Value.caption'] },
      { content: row['dimensionKt6.description'] },
      { content: row['dimensionKt6Value.caption'] },
      { content: row['dimensionKt7.description'] },
      { content: row['dimensionKt7Value.caption'] },
      { content: row['dimensionKt8.description'] },
      { content: row['dimensionKt8Value.caption'] },
      { content: row['dimensionKt9.description'] },
      { content: row['dimensionKt9Value.caption'] }
    ])
  })
  doc.table(table, 'docTable')
  return { data: doc.getDocument(), fileName: `${dateService.formatDate(dateService.currentDate(), 'dd_mm_yyyy')}_Проводки_по_зарплаті_за_Период_${orgName || ''}.xlsx` }
}

function doPostingEntry (period, withoutFundSource) {
  if (!global['sia_docAccOperation'] && !global['biz_docAccOperation']) {
    return 'Операція неможлива'
  }

  const hrEntryOrgDepSinkPosition = settingsService.getByCode('hrEntryOrgDepSinkPosition', period.orgID)
  const hrProgClassAcc = settingsService.getByCode('hrProgClassAcc', period.orgID)

  let mainDepartment = null
  if (hrEntryOrgDepSinkPosition) {
    mainDepartment = UB.Repository('org_department').attrs(['ID', 'organizationID']).where('entryOrganizationID', '=', period.orgID).limit(1).selectSingle()
    if (!mainDepartment) {
      return 'Не вибрано організацію в довіднику підрозділів головної організаціїї в полі "Організація для проведення" '
    }
  }
  const coa = glCore.getCOA()
  const entityName = global['sia_docAccOperation'] ? 'sia_docAccOperation' : 'biz_docAccOperation'
  doCancelPostingEntry(period)
  const errorMessages = []
  const accOperation = UB.Repository('hr_payAccOperationDt')
    .attrs(['ID', 'payAccOperationID', 'sumOperation', 'accountDtID', 'accountKtID', 'dictFundSourceID', 'dictProgClassID',
      'payAccOperationID.entryOperationID.description', 'dictFundSourceID.name', 'dictProgClassID.name',
      'dimensionDt0', 'dimensionDt0Value', 'dimensionDt1', 'dimensionDt1Value',
      'dimensionDt2', 'dimensionDt2Value', 'dimensionDt3', 'dimensionDt3Value',
      'dimensionDt4', 'dimensionDt4Value', 'dimensionDt5', 'dimensionDt5Value',
      'dimensionDt6', 'dimensionDt6Value', 'dimensionDt7', 'dimensionDt7Value',
      'dimensionDt8', 'dimensionDt8Value', 'dimensionDt9', 'dimensionDt9Value',
      'dimensionKt0', 'dimensionKt0Value', 'dimensionKt1', 'dimensionKt1Value',
      'dimensionKt2', 'dimensionKt2Value', 'dimensionKt3', 'dimensionKt3Value',
      'dimensionKt4', 'dimensionKt4Value', 'dimensionKt5', 'dimensionKt5Value',
      'dimensionKt6', 'dimensionKt6Value', 'dimensionKt7', 'dimensionKt7Value',
      'dimensionKt8', 'dimensionKt8Value', 'dimensionKt9', 'dimensionKt9Value',
      'payAccOperationID.entryOperationID.name'
    ])
    .where('payAccOperationID.periodSalaryID', '=', period.ID)
    .orderBy('dictFundSourceID')
    .orderBy('payAccOperationID.entryOperationID.code')
    .selectAsObject({
      'payAccOperationID.entryOperationID.name': 'operationName'
    })

  const operationKind = UB.Repository('gl_operationKind')
    .attrs(['ID'])
    .where('docClass.entityName', '=', entityName)
    .orderByDesc('isDefault')
    .limit(1)
    .selectSingle()
  if (!operationKind) {
    return 'Не знайдено вид операції для Бухальерської проводки'
  }
  let dictFundSources = []
  if (hrEntryOrgDepSinkPosition) {
    const treePath = UB.Repository('hr_organization')
      .attrs('mi_treePath')
      .where('mi_data_id', '=', period.orgID)
      .where('state', '=', 'ACTIVE')
      .limit(1)
      .selectScalar()
    dictFundSources = UB.Repository('ac_dictFundSource').attrs(['ID', 'fundSourceID', 'dictProgClassID']).where('organizationID', 'in', treePath ? treePath.split('/').map(o => Number(o)) : [period.orgID]).where('fundSourceID', 'isNotNull').selectAsObject()
  } else {
    dictFundSources = UB.Repository('ac_dictFundSource').attrs(['ID', 'fundSourceID', 'dictProgClassID']).where('organizationID', '=', period.orgID).where('fundSourceID', 'isNotNull').selectAsObject()
  }

  let dictFundSourceID
  let docID
  let docStore = UB.DataStore(entityName)
  let docDtStore = UB.DataStore(`${entityName}Dt`)
  const accDocs = []
  let idx = -1
  let lineNum = 1
  const respEmployeeID = UB.Session.uData.hrEmployeeID || null
  accOperation.forEach(op => {
    const dictFundSource = op.dictFundSourceID ? dictFundSources.find(o => o.fundSourceID === op.dictFundSourceID && (!hrProgClassAcc || o.dictProgClassID === op.dictProgClassID)) : null
    op.dictFundSourceID = dictFundSource ? dictFundSource.ID : null
    if (dictFundSourceID !== op.dictFundSourceID) {
      dictFundSourceID = op.dictFundSourceID
      docID = docStore.generateID()
      accDocs.push({
        ID: docID,
        operationKindID: operationKind.ID,
        organizationID: mainDepartment ? mainDepartment.organizationID : period.orgID,
        dictFundSourceID: op.dictFundSourceID,
        totalSum: 0,
        periodID: period.ID,
        comment: `Розрахункова відомість (заробітна плата) за ${period.name}`,
        accDt: []
      })
      idx++
      lineNum = 1
    }
    if (!op.dictFundSourceID) {
      if (!withoutFundSource) {
        errorMessages.push(`${op['payAccOperationID.entryOperationID.description']} сума: ${op.sumOperation} 
      ${op['dictFundSourceID.name'] ? `не має джерела фінансування ${op['dictFundSourceID.name']}${hrProgClassAcc ? `, КПК ${op['dictProgClassID.name']}` : ''} в бухгалтерії` : 'не заповнено джерело фінансування в зарплаті'}`)
      } else {
        accDocs[idx].notPosting = true
      }
    }

    accDocs[idx].totalSum = accrualService.round(accDocs[idx].totalSum + op.sumOperation)
    const accDt = {
      docAccOperationID: accDocs[idx].ID,
      lineNum: lineNum++,
      accountDtID: op.accountDtID,
      accountKtID: op.accountKtID,
      sumOperation: op.sumOperation,
      noteOperation: op.operationName
    }
    let dimPos = 0
    const accountDt = coa.byId[op.accountDtID]
    if (accountDt && accountDt.dims) {
      accountDt.dims.forEach(dim => {
        let isSetValue = false
        if (dim) {
          accDt[`dimensionDt${dimPos}`] = dim.ID
          if (dim.entityName === 'org_department' && mainDepartment) {
            accDt[`dimensionDt${dimPos}Value`] = mainDepartment.ID
          } else {
            for (let i = 0; i < 10; i++) {
              if (!isSetValue && op[`dimensionDt${i}`] && op[`dimensionDt${i}`] === dim.ID && op[`dimensionDt${i}Value`]) {
                accDt[`dimensionDt${dimPos}Value`] = op[`dimensionDt${i}Value`]
                isSetValue = true
                dimPos++
                return
              }
            }
          }
          dimPos++
        }
      })
    }
    const accountKt = coa.byId[op.accountKtID]
    dimPos = 0
    if (accountKt && accountKt.dims) {
      accountKt.dims.forEach(dim => {
        let isSetValue = false
        if (dim) {
          accDt[`dimensionKt${dimPos}`] = dim.ID
          if (dim.entityName === 'org_department' && mainDepartment) {
            accDt[`dimensionDt${dimPos}Value`] = mainDepartment.ID
          } else {
            for (let i = 0; i < 10; i++) {
              if (!isSetValue && op[`dimensionKt${i}`] && op[`dimensionKt${i}`] === dim.ID && op[`dimensionKt${i}Value`]) {
                accDt[`dimensionKt${dimPos}Value`] = op[`dimensionKt${i}Value`]
                isSetValue = true
                dimPos++
                return
              }
            }
          }
          dimPos++
        }
      })
    }
    accDocs[idx].accDt.push(accDt)
  })
  if (!errorMessages.length || withoutFundSource) {
    accDocs.forEach((doc) => {
      if (doc.totalSum !== 0) {
        docStore.run('insert', {
          execParams: {
            ID: doc.ID,
            docDate: period.dateTo,
            operationKindID: doc.operationKindID,
            organizationID: doc.organizationID,
            dictFundSourceID: doc.dictFundSourceID,
            respEmployeeID,
            totalSum: doc.totalSum,
            periodID: doc.periodID,
            comment: doc.comment
          }
        })
        doc.accDt.forEach(dt => {
          if (dt.sumOperation !== 0) {
            docDtStore.run('insert', {
              execParams: dt
            })
          }
        })
        if (!doc.notPosting) {
          docStore.run('update', {
            __skipOptimisticLock: true,
            runPosting: true,
            execParams: {
              ID: doc.ID,
              docState: 'POSTED'
            }
          })
        }
      }
    })
  }

  return errorMessages.length ? UB.i18n(`Не заповнено Джерело фінансування:<br> {0}`, errorMessages.join('<br>')) : ''
}
function doCancelPostingEntry (period) {
  if (!global['sia_docAccOperation'] && !global['biz_docAccOperation']) {
    return ''
  }
  const hrEntryOrgDepSinkPosition = settingsService.getByCode('hrEntryOrgDepSinkPosition', period.orgID)

  let mainDepartment = null
  if (hrEntryOrgDepSinkPosition) {
    mainDepartment = UB.Repository('org_department').attrs(['ID', 'organizationID']).where('entryOrganizationID', '=', period.orgID).limit(1).selectSingle()
    if (!mainDepartment) {
      return 'Не вибрано організацію в довіднику підрозділів головної організаціїї в полі "Організація для проведення" '
    }
  }
  const entityName = global['sia_docAccOperation'] ? 'sia_docAccOperation' : 'biz_docAccOperation'
  const docStore = UB.DataStore(entityName)
  const docAccOperation = UB.Repository(entityName)
    .attrs(['ID', 'docState'])
    .where('organizationID', '=', mainDepartment ? mainDepartment.organizationID : period.orgID)
    .where('periodID', '=', period.ID)
    .selectAsObject()
  docAccOperation.forEach(doc => {
    if (doc.docState === 'POSTED') {
      docStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: doc.ID,
          docState: 'PROJECT'
        }
      })
      documentService.cancelPosting(entityName, doc.ID)
    }
    docStore.run('delete', {
      execParams: {
        ID: doc.ID
      }
    })
  })
  return ''
}

function getStateEntry (period) {
  if (!global['sia_docAccOperation'] && !global['biz_docAccOperation']) {
    return {
      posting: false,
      cancelPosting: false,
      locAccounts: []
    }
  }
  const entityNameDt = global['sia_docAccOperationDt'] ? 'sia_docAccOperationDt' : 'biz_docAccOperationDt'
  const docAccOperationDt = UB.Repository(entityNameDt)
    .attrs(['ID', 'docAccOperationID.docDate', 'docAccOperationID.docState', 'accountDtID', 'accountKtID'])
    .where('docAccOperationID.organizationID', '=', period.orgID)
    .where('docAccOperationID.periodID', '=', period.ID)
    .selectAsObject()
  const accounts = []
  docAccOperationDt.forEach(docDt => {
    if (docDt.accountDtID && !accounts.find(o => o === docDt.accountDtID)) {
      accounts.push(docDt.accountDtID)
    }
    if (docDt.accountKtID && !accounts.find(o => o === docDt.accountKtID)) {
      accounts.push(docDt.accountKtID)
    }
  })
  const locAcc = UB.Repository('gl_account').attrs(['ID', 'lockDate', 'code'])
    .where('ID', 'in', accounts)
    .selectAsObject()
  const locAccounts = []
  let hesPosting = false
  docAccOperationDt.forEach(docDt => {
    if (docDt.accountDtID) {
      const acc = locAcc.find(o => o.ID === docDt.accountDtID)
      if (acc && acc.lockDate && new Date(acc.lockDate) >= new Date(docDt['docAccOperationID.docDate']) && !locAccounts.find(o => o === acc.code)) {
        locAccounts.push(acc.code)
      }
    }
    if (docDt.accountKtID) {
      const acc = locAcc.find(o => o.ID === docDt.accountKtID)
      if (acc && acc.lockDate && new Date(acc.lockDate) >= new Date(docDt['docAccOperationID.docDate']) && !locAccounts.find(o => o === acc.code)) {
        locAccounts.push(acc.code)
      }
    }
    if (!hesPosting && docDt['docAccOperationID.docState'] === 'POSTED') {
      hesPosting = true
    }
  })

  return {
    posting: !(locAccounts.length || hesPosting),
    cancelPosting: !(locAccounts.length),
    locAccounts
  }
}
