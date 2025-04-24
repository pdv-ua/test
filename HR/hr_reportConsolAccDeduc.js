const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const currencyService = require('../AC/public/core/currencyService')
const stringService = require('../AC/modules/dataServices/stringService')
const _ = require('lodash')

me.entity.addMethod('getReportData')

me.getReportData = function (ctx) {
  const reportParams = ctx.mParams.execParams || {}

  reportParams.sqlDialect = entityBaseService.getSQLDialect()

  let orgID = reportParams.orgID
  let periodFromID = reportParams.periodFromID
  let periodToID = reportParams.periodToID
  let periodDateFrom = dateService.shiftDate(reportParams.periodDateFrom)
  let periodDateTo = dateService.shiftDate(reportParams.periodDateTo)
  let departmentID = reportParams.departmentID
  let subDepartment = reportParams.subDepartment

  if (reportParams.isGroupReport) {
    orgID = reportParams.organizationID
    subDepartment = reportParams.includeSubDep
    reportParams.periodTo = reportParams.periodToDateTo
    periodDateFrom = dateService.shiftDate(reportParams.periodFromDateFrom)
    periodDateTo = dateService.shiftDate(reportParams.periodToDateTo)
    reportParams.dictFundSourceID = []
  }

  const hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'description')
    .where('mi_data_id', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: reportParams.periodTo })
    .orderBy('mi_dateFrom', 'desc')
    .selectSingle()

  let result = {
    orgName: hrOrg.name + (reportParams.includeSubOrg ? ' (з підлеглими)' : ''),
    charges: [],
    holds: [],
    payments: [],
    chargesFund: [],
    totalCharges: 0,
    totalHolds: 0,
    totalPayments: 0,
    totalChargesFund: 0,
    totalSum: 0,
    hideHeader: reportParams.hideHeader
  }

  reportParams.orgIDs = [orgID]
  if (reportParams.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${orgID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      reportParams.orgIDs = orgs.map(o => o.mi_data_id)
    }
  }

  const firstPeriod = UB.Repository('hr_dictPeriod')
    .attrs(['dateFrom', 'dateTo'])
    .selectById(periodFromID)

  const priorPeriodList = UB.Repository('hr_dictPeriod')
    .attrs(['priorPeriodID'])
    .where('orgID', 'in', reportParams.orgIDs)
    .where('dateFrom', '>=', dateService.shiftDate(firstPeriod.dateFrom))
    .where('dateTo', '<=', dateService.shiftDate(firstPeriod.dateTo))
    .selectAsObject()

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs(['ID'])
    .where('orgID', 'in', reportParams.orgIDs)
    .where('dateFrom', '>=', periodDateFrom)
    .where('dateTo', '<=', periodDateTo)
    .selectAsObject()

  reportParams.periodIds = periodList.map(o => o.ID)
  reportParams.priorPeriodIds = priorPeriodList.map(o => o.priorPeriodID)

  const lastPeriod = UB.Repository('hr_dictPeriod')
    .attrs(['dateFrom', 'dateTo'])
    .selectById(periodToID)

  const lastPeriodList = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'priorPeriodID'])
    .where('orgID', 'in', reportParams.orgIDs)
    .where('dateFrom', '>=', dateService.shiftDate(lastPeriod.dateFrom))
    .where('dateTo', '<=', dateService.shiftDate(lastPeriod.dateTo))
    .selectAsObject()
  reportParams.lastPeriodIds = lastPeriodList.map(o => o.ID)

  const periodFromName = UB.Repository('hr_dictPeriod')
    .attrs(['name'])
    .selectById(periodFromID)
  result.periodName = `${periodFromName['name']} року`
  if (dateService.shiftDate(firstPeriod['dateFrom']).getMonth() === 0 && dateService.shiftDate(lastPeriod['dateTo']).getMonth() === 11 && dateService.shiftDate(firstPeriod['dateFrom']).getFullYear() === dateService.shiftDate(lastPeriod['dateTo']).getFullYear()) {
    result.periodName = `${new Date(firstPeriod['dateFrom']).getFullYear()} рік`
  } else if (periodFromID !== periodToID) {
    const periodToName = UB.Repository('hr_dictPeriod')
      .attrs(['name'])
      .selectById(periodToID)
    result.periodName = `період з ${periodFromName['name']} року по ${periodToName['name']} року`
  }
  let deptName
  reportParams.deptIDs = null
  if (departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodDateTo })
      .selectSingle()
    deptName = dept.description || dept.fullName
    if (subDepartment) {
      deptName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', 'in', reportParams.orgIDs)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', periodDateTo)
        .where('mi_dateTo', '>=', periodDateTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        reportParams.deptIDs = departments.map(o => o.mi_data_id)
      } else {
        reportParams.deptIDs = [departmentID]
      }
    } else {
      reportParams.deptIDs = [departmentID]
    }
  }
  reportParams.deptClause = reportParams.deptIDs ? `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}` : ''

  result.departmentName = deptName || ''

  getParamsDebt(result, reportParams)
  getParamsDebtFSSU(result, reportParams)
  if ((!reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) || !result.fccyDebtFrom) result.fccyDebtFrom = 0

  result.debtFrom = result.orgDebtFrom + result.fccyDebtFrom - result.empDebtFrom

  // charges
  setParamsSum(result, 'charges', 'PAYMENT', 'totalCharges', reportParams)
  // holds
  setParamsSum(result, 'holds', 'OFFTAKE', 'totalHolds', reportParams)
  // payments
  setParamsSum(result, 'payments', 'FORPAY', 'totalPayments', reportParams)

  if ((!reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) || !result.fccyDebtTo) result.fccyDebtTo = 0

  result.debtTo = result.orgDebtTo + result.fccyDebtTo - result.empDebtTo

  // chargesFund
  let totalChargesFund = 0
  let chargesFund
  let dataStore
  if (!reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty) {
    dataStore = UB.DataStore('hr_accrualFund')
    dataStore.runSQL(`
      SELECT hpf.code as "code", hpf.name as "name", sum(round(acc.paySum,2)) as "paySum"
        FROM hr_accrualFund acc
          LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
          LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
          LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
          LEFT JOIN hr_payFund hpf ON acc.payFundID = hpf.ID 
          LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${reportParams.sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= ${reportParams.checkDepChangeInPeriod ? 'pc.dateFrom' : 'pc.dateTo'}
            and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${reportParams.sqlDialect.limit})
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
          AND hpf.isRecSum = 0 
          ${reportParams.deptClause}
          ${!reportParams.limitedAccess ? 'AND en.limitedAccess = 0' : ''}      
          GROUP BY acc.payFundID, hpf.code, hpf.name 
          ORDER BY hpf.code
    `, {
      orgIDs: reportParams.orgIDs,
      deptIDs: reportParams.deptIDs,
      periodIds: reportParams.periodIds
    })
  } else {
    dataStore = UB.DataStore('hr_accrualFundDt')
    let extraWhereClause
    if (!reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) {
      extraWhereClause = 'AND dt.dictFundSourceID IS NULL'
    } else if (reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) {
      extraWhereClause = `AND (dt.dictFundSourceID IS NULL OR dt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')})`
    } else if (reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty) {
      extraWhereClause = `AND dt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')}`
    }
    dataStore.runSQL(`
      SELECT hpf.code as "code", hpf.name as "name", sum(round(dt.paySum,2)) as "paySum"
        FROM hr_accrualFundDt dt INNER JOIN hr_accrualFund acc ON dt.accrualFundID = acc.ID
          LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
          LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
          LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
          LEFT JOIN hr_payFund hpf ON acc.payFundID = hpf.ID 
          LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${reportParams.sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= ${reportParams.checkDepChangeInPeriod ? 'pc.dateFrom' : 'pc.dateTo'}
            and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${reportParams.sqlDialect.limit})
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
          AND hpf.isRecSum = 0 
          ${reportParams.deptClause}
          ${!reportParams.limitedAccess ? 'AND en.limitedAccess = 0' : ''}     
          ${extraWhereClause}           
          GROUP BY acc.payFundID, hpf.code, hpf.name 
          ORDER BY hpf.code
    `, {
      orgIDs: reportParams.orgIDs,
      deptIDs: reportParams.deptIDs,
      periodIds: reportParams.periodIds,
      dictFundSourceIds: reportParams.dictFundSourceID
    })
  }
  chargesFund = dataStore.getAsJsObject()

  chargesFund.forEach(row => {
    row['paySum'] = row['paySum'] ? currencyService.round(row['paySum'], 2) : 0
    totalChargesFund = currencyService.round(totalChargesFund += row['paySum'], 2)
  })
  result.chargesFund = chargesFund
  result.totalChargesFund = totalChargesFund

  ctx.mParams.result = JSON.stringify(result)
}

function getParamsDebt (result, reportParams) {
  const dataStore = UB.DataStore('hr_accrualBalance')
  let extraWhereClause = ''
  if (!reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) {
    extraWhereClause = 'AND acc.dictFundSourceID IS NULL'
  } else if (!reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty) {
    extraWhereClause = `AND (fs.dictFundTypeID IS NULL OR (fs.dictFundTypeID IS NOT NULL AND ft.code != '02'))`
  } else if (reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) {
    extraWhereClause = `AND (acc.dictFundSourceID IS NULL OR (acc.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')} AND ft.code != '02'))`
  } else if (reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty) {
    extraWhereClause = `AND (acc.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')} AND ft.code != '02')`
  }
  dataStore.runSQL(`
    SELECT sum(sumTo) as "sumTo", acc.periodCalcID as "periodCalcID", acc.employeeNumberID as "employeeNumberID", po.name as "payOutName"
      FROM hr_accrualBalance acc
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID          
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${reportParams.sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= ${reportParams.checkDepChangeInPeriod ? 'pc.dateFrom' : 'pc.dateTo'}
            and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${reportParams.sqlDialect.limit})
         LEFT JOIN ac_fundSource fs ON acc.dictFundSourceID = fs.ID
         LEFT JOIN ac_dictFundType ft ON fs.dictFundTypeID = ft.ID 
         LEFT JOIN hr_payOut po ON po.id = coalesce( 
              (SELECT ${reportParams.sqlDialect.top} payOutID from hr_employeePayOut empPO where empPO.employeeNumberID = en.ID and empPO.mi_deleteDate >= '9999-12-31' order by isDefault, empPO.ID ${reportParams.sqlDialect.limit}),
              en.payOutID,
              (select ${reportParams.sqlDialect.top} id from hr_payOut defPayOut where defPayOut.organizationID = en.orgID and defPayOut.isDefault = 1 and defPayOut.mi_deleteDate >= '9999-12-31' ${reportParams.sqlDialect.limit}))
         
       WHERE acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND en.orgID ${entityBaseService.getInExpression('orgIDs')}      
        ${reportParams.deptClause}
        ${!reportParams.limitedAccess ? 'AND en.limitedAccess = 0' : ''}      
        ${extraWhereClause}
      GROUP BY acc.periodCalcID, acc.employeeNumberID, po.name  
  `, {
    orgIDs: reportParams.orgIDs,
    deptIDs: reportParams.deptIDs,
    periodIds: reportParams.lastPeriodIds.concat(reportParams.priorPeriodIds),
    dictFundSourceIds: reportParams.dictFundSourceID
  })
  const debet = dataStore.getAsJsObject()

  let periodOrgSum = 0
  let periodEmpSum = 0
  let priorPeriodOrgSum = 0
  let priorPeriodEmpSum = 0
  debet.forEach(row => {
    if (reportParams.lastPeriodIds.includes(row.periodCalcID)) {
      periodEmpSum = currencyService.round(periodEmpSum + (row['sumTo'] < 0 ? -1 * row['sumTo'] : 0))
      periodOrgSum = currencyService.round(periodOrgSum + (row['sumTo'] > 0 ? row['sumTo'] : 0))
    } else {
      priorPeriodEmpSum = currencyService.round(priorPeriodEmpSum + (row['sumTo'] < 0 ? -1 * row['sumTo'] : 0))
      priorPeriodOrgSum = currencyService.round(priorPeriodOrgSum + (row['sumTo'] > 0 ? row['sumTo'] : 0))
    }
  })
  result.orgDebtTo = periodOrgSum
  result.empDebtTo = periodEmpSum
  result.orgDebtFrom = priorPeriodOrgSum
  result.empDebtFrom = priorPeriodEmpSum
  result.debtToPayOut = []
  result.totalDebtToPayOut = 0
  if (result.orgDebtTo) {
    let fltDebet = debet.filter(row => row['sumTo'] > 0 && reportParams.lastPeriodIds.includes(row.periodCalcID))
    fltDebet = fltDebet && fltDebet.length ? _.groupBy(fltDebet, 'payOutName') : {}
    _.forEach(fltDebet, rows => {
      const sum = rows.reduce((acc, cur) => acc + cur.sumTo, 0) || 0
      result.totalDebtToPayOut += sum
      result.debtToPayOut.push({
        name: rows[0].payOutName || 'Не вказано',
        paySum: sum
      })
    })
  }
  result.debtToPayOut = result.debtToPayOut.sort((s1, s2) => {
    return stringService.compareStringUa(s1.name, s2.name)
  })
  result.showDebtToPayOut = !!result.debtToPayOut.length

}

function setParamsSum (result, tableSumName, groupType, totalSumParamName, reportParams) {
  let totalSum = 0
  let sum
  let dataStore
  let extraWhereClause = ''
  if (!reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty) {
    dataStore = UB.DataStore('hr_accrual')
    dataStore.runSQL(`
    SELECT pe.code as "code", pe.name as "name", sum(paySum) as "paySum"
      FROM hr_accrual acc
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${reportParams.sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= ${reportParams.checkDepChangeInPeriod ? 'pc.dateFrom' : 'pc.dateTo'}
            and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${reportParams.sqlDialect.limit})
        INNER JOIN hr_payEl pe ON pe.ID = acc.payElID 
        INNER JOIN hr_method m on pe.methodID = m.ID 
        INNER JOIN hr_methodGroup mg on m.methodGroupID = mg.ID          
      WHERE acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND en.orgID ${entityBaseService.getInExpression('orgIDs')}      
        ${reportParams.deptClause}
        ${!reportParams.limitedAccess ? 'AND en.limitedAccess = 0' : ''}      
        AND mg.groupType = :groupType:
        AND acc.flagsRec & 8192 != 8192  AND en.empWorkPlace is NULL   
        GROUP BY acc.payElID, pe.code, pe.name, pe.codeSort 
        ORDER BY pe.codeSort
  `, {
      orgIDs: reportParams.orgIDs,
      deptIDs: reportParams.deptIDs,
      periodIds: reportParams.periodIds,
      groupType
    })
  } else {
    if (!reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) {
      extraWhereClause = 'AND dt.dictFundSourceID IS NULL'
    } else if (reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) {
      extraWhereClause = `AND (dt.dictFundSourceID IS NULL OR dt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')})`
    } else if (reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty) {
      extraWhereClause = `AND dt.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')}`
    }
    dataStore = UB.DataStore('hr_accrualDt')
    dataStore.runSQL(`
    SELECT pe.code as "code", pe.name as "name", sum(dt.paySum) as "paySum"
      FROM hr_accrualDt dt INNER JOIN hr_accrual acc ON dt.accrualID = acc.ID
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${reportParams.sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= ${reportParams.checkDepChangeInPeriod ? 'pc.dateFrom' : 'pc.dateTo'}
            and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${reportParams.sqlDialect.limit})
        INNER JOIN hr_payEl pe ON pe.ID = acc.payElID 
        INNER JOIN hr_method m on pe.methodID = m.ID 
        INNER JOIN hr_methodGroup mg on m.methodGroupID = mg.ID          
      WHERE acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND en.orgID ${entityBaseService.getInExpression('orgIDs')}      
        ${reportParams.deptClause}
        ${!reportParams.limitedAccess ? 'AND en.limitedAccess = 0' : ''}     
        ${extraWhereClause} 
        AND mg.groupType = :groupType:
        AND acc.flagsRec & 8192 != 8192  AND en.empWorkPlace is NULL   
        GROUP BY acc.payElID, pe.code, pe.name, pe.codeSort 
        ORDER BY pe.codeSort
  `, {
      orgIDs: reportParams.orgIDs,
      deptIDs: reportParams.deptIDs,
      periodIds: reportParams.periodIds,
      dictFundSourceIds: reportParams.dictFundSourceID,
      groupType
    })
  }
  sum = dataStore.getAsJsObject()
  sum.forEach(row => {
    row['paySum'] = row['paySum'] ? currencyService.round(row['paySum'], 2) : 0
    totalSum = currencyService.round(totalSum += row['paySum'], 2)
  })
  result[tableSumName] = sum

  result[totalSumParamName] = totalSum
}

function getParamsDebtFSSU (result, reportParams) {
  const dataStore = UB.DataStore('hr_accrualBalance')
  let extraWhereClause = ''
  if ((!reportParams.dictFundSourceID.length && reportParams.isIncludeEmpty) ||
    (!reportParams.dictFundSourceID.length && !reportParams.isIncludeEmpty)) {
    extraWhereClause = `AND ft.code = '02'`
  } else if (reportParams.dictFundSourceID.length) {
    extraWhereClause = `AND (acc.dictFundSourceID ${entityBaseService.getInExpression('dictFundSourceIds')} AND ft.code = '02')`
  }
  dataStore.runSQL(`
    SELECT sum(sumTo) as "sumTo", periodCalcID as "periodCalcID"
      FROM hr_accrualBalance acc
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID          
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${reportParams.sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= ${reportParams.checkDepChangeInPeriod ? ':periodDateFrom:' : 'pc.dateTo'}
            and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${reportParams.sqlDialect.limit})
         LEFT JOIN ac_fundSource fs ON acc.dictFundSourceID = fs.ID
         LEFT JOIN ac_dictFundType ft ON fs.dictFundTypeID = ft.ID 
      WHERE acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND en.orgID ${entityBaseService.getInExpression('orgIDs')}      
        ${reportParams.deptClause}
        ${!reportParams.limitedAccess ? 'AND en.limitedAccess = 0' : ''}      
        ${extraWhereClause}
      GROUP BY periodCalcID       
  `, {
    orgIDs: reportParams.orgIDs,
    deptIDs: reportParams.deptIDs,
    periodIds: reportParams.lastPeriodIds.concat(reportParams.priorPeriodIds),
    dictFundSourceIds: reportParams.dictFundSourceID
  })
  const debet = dataStore.getAsJsObject()
  debet.forEach(row => {
    if (reportParams.lastPeriodIds.includes(row.periodCalcID)) {
      result.fccyDebtTo = (result.fccyDebtTo || 0) + row['sumTo'] || 0
    } else {
      result.fccyDebtFrom = (result.fccyDebtFrom || 0) + row['sumTo'] || 0
    }
  })
}
