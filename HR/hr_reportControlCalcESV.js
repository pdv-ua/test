const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const currencyService = require('../AC/public/core/currencyService')
const stringService = require('../AC/modules/dataServices/stringService')

me.entity.addMethod('getReportData')
me.entity.addMethod('getDetailData')

function prepareReportParams (params) {
  const periodFrom = dateService.shiftDate(params.periodDateFrom)
  const periodTo = dateService.shiftDate(params.periodDateTo)

  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  let orgIDs = [params.orgID]
  if (params.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.orgID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  }

  const periodIds = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', periodFrom)
    .where('dateTo', '<=', periodTo)
    .selectAsArrayOfValues()

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'pYear', 'dictMonthID.code', 'name', 'dateFrom', 'dateTo')
    .where('ID', 'in', periodIds)
    .orderBy('dateFrom')
    .selectAsObject({
      'dictMonthID.code': 'pMonth'
    })

  let periodName
  if (params.periodFromID === params.periodToID) {
    const p = periodList.find(o => o.ID === params.periodFromID)
    periodName = `${p ? p.name : '?'} року`
  } else if (periodFrom.getMonth() === 0 && periodTo.getMonth() === 11 && periodTo.getFullYear() === periodFrom.getFullYear()) {
    periodName = `${periodTo.getFullYear()} рік`
  } else {
    const pf = periodList.find(o => o.ID === params.periodFromID)
    const pt = periodList.find(o => o.ID === params.periodToID)
    periodName = `період з ${pf ? pf.name : '?'} року по ${pt ? pt.name : '?'} року`
  }

  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName
    if (params.subDepartment) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', periodTo)
        .where('mi_dateTo', '>=', periodTo)
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }

  const payFundPayEls = UB.Repository('hr_payFundBase')
    .attrs('payElID')
    .where('payFundID.mi_deleteDate', '>=', '#maxdate')
    .selectAsArrayOfValues()
  if (!payFundPayEls.length) payFundPayEls.push(0)

  const payFundExcludePayEls = UB.Repository('hr_payFundExclude')
    .attrs('payElID')
    .where('payFundID.mi_deleteDate', '>=', '#maxdate')
    .selectAsArrayOfValues()
  if (!payFundExcludePayEls.length) payFundExcludePayEls.push(0)

  let hrOrg = UB.Repository('hr_organization')
    .attrs('name', 'description')
    .where('mi_data_id', '=', params.orgID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: periodTo })
    .orderBy('mi_dateFrom', 'desc')
    .selectSingle()

  return {
    periodFrom,
    periodTo,
    periodName,
    periodIds,
    periodList,
    payFundPayEls,
    payFundExcludePayEls,
    deptIDs,
    orgIDs,
    depName,
    orgName: hrOrg ? (hrOrg.name + (params.includeSubOrg ? ' (з підлеглими)' : '')) : '',
    limitedAccess
  }
}

function getAccrualData (paramName, isTotal, params, reportParams) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const deptClause = reportParams.deptIDs ? `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}` : ''

  const dataStore = UB.DataStore('hr_accrual')
  let fieldList = ['sum(paySum) as "paySum"']
  let groupList = []
  let orderByList = []
  let limitedAccessClause = ''
  let extraWhereClause = ''
  if (!isTotal) {
    if (params.showPayEl) {
      fieldList.push('acc.payElID as "payElID"')
      fieldList.push('pe.description as "payElName"')
      groupList.push('acc.payElID')
      groupList.push('pe.description')
      orderByList.push('pe.description')
    }
    if (params.showPeriodCalc) {
      fieldList.push('acc.periodCalcID as "periodCalcID"')
      fieldList.push('pc.name as "periodCalc"')
      groupList.push('acc.periodCalcID')
      groupList.push('pc.name')
      groupList.push('pc.dateFrom')
      orderByList.push('pc.dateFrom')
    }
    if (params.showPeriodSalary) {
      fieldList.push('acc.periodSalaryID as "periodSalaryID"')
      fieldList.push('ps.name as "periodSalary"')
      groupList.push('ps.name')
      groupList.push('acc.periodSalaryID')
      groupList.push('ps.dateFrom')
      orderByList.push('ps.dateFrom')
    }
    if (params.showEmployee) {
      fieldList.push('acc.employeeNumberID as "employeeNumberID"')
      fieldList.push('emp.fullFIO as "fullFIO"')
      fieldList.push('en.tabNum as "tabNum"')
      fieldList.push('en.tabNumSort as "tabNumSort"')

      groupList.push('acc.employeeNumberID')
      groupList.push('emp.fullFIO')
      groupList.push('en.tabNum')
      groupList.push('en.tabNumSort')
      limitedAccessClause = 'AND en.limitedAccess = 0'
      orderByList.push('emp.fullFIO')
      orderByList.push('en.tabNumSort')
    }
  }
  if (paramName === 'paySumESVOn') {
    extraWhereClause = `AND acc.payElID ${entityBaseService.getInExpression('payFundPayEls')}`
  }
  if (paramName === 'paySumESVOff') {
    extraWhereClause = `AND acc.payElID ${entityBaseService.getNotInExpression('payFundPayEls')}`
  }
  if (paramName === 'dismAccrualSum') {
    extraWhereClause = `AND acc.periodCalc > en.dateTo 
      AND acc.payElID ${entityBaseService.getInExpression('payFundPayEls')}                 
      AND acc.payElID ${entityBaseService.getInExpression('payFundExcludePayEls')}
    `
  }
  if (paramName === 'controlChargedSum') {
    extraWhereClause = `AND acc.payElID ${entityBaseService.getInExpression('payFundPayEls')}`
  }
  dataStore.runSQL(`
    SELECT ${fieldList.join(',')}
      FROM hr_accrual acc
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
        LEFT JOIN hr_dictPeriod ps ON ps.ID=acc.periodSalaryID
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= pc.dateTo and ep2.mi_deleteDate >= '9999-12-31' 
          order by ep2.dateFrom desc ${sqlDialect.limit})
        INNER JOIN hr_payEl pe ON pe.ID = acc.payElID 
        INNER JOIN hr_method m on pe.methodID = m.ID 
        INNER JOIN hr_methodGroup mg on m.methodGroupID = mg.ID          
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
        AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND mg.groupType = 'PAYMENT'
        AND acc.flagsRec & 8192 != 8192
        AND en.empWorkPlace is null
        ${extraWhereClause}
        ${deptClause}
        ${params.limitedAccess ? limitedAccessClause : ''}     
        ${groupList.length ? 'GROUP BY ' + groupList.join(',') : ''} 
        ${orderByList.length ? 'ORDER BY ' + orderByList.join(',') : ''}
  `, {
    orgIDs: reportParams.orgIDs,
    deptIDs: reportParams.deptIDs,
    periodIds: reportParams.periodIds,
    payFundPayEls: reportParams.payFundPayEls,
    payFundExcludePayEls: reportParams.payFundExcludePayEls
  })
  return dataStore.getAsJsObject()
}

function getFundData (paramName, isTotal, params, reportParams) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let deptClause = reportParams.deptIDs ? `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}` : ''

  const dataStore = UB.DataStore('hr_accrualFund')
  let fieldList = ['sum(round(acc.paySum,2)) as "paySum"', 'sum(acc.baseSum) as "baseSum"',
    'sum(acc.sourceSum) as "sourceSum"', 'sum(acc.baseSum-acc.addMinSum) as "limitSum"'
  ]
  let groupList = []
  let orderByList = []
  let limitedAccessClause = ''
  let extraWhereClause = ''
  let extraJoinClause = ''
  if (!isTotal) {
    if (params.showRate) {
      fieldList.push('acc.rate')
      groupList.push('acc.rate')
    }
    if (params.showPayFund) {
      fieldList.push('acc.payFundID as "payFundID"')
      fieldList.push('hpf.description as "payFundName"')
      groupList.push('acc.payFundID')
      groupList.push('hpf.description')
      orderByList.push('hpf.description')
    }
    if (params.showEmployee) {
      fieldList.push('acc.employeeNumberID as "employeeNumberID"')
      fieldList.push('emp.fullFIO as "fullFIO"')
      fieldList.push('en.tabNum as "tabNum"')
      fieldList.push('en.tabNumSort as "tabNumSort"')
      groupList.push('acc.employeeNumberID')
      groupList.push('emp.fullFIO')
      groupList.push('en.tabNum')
      groupList.push('en.tabNumSort')
      limitedAccessClause = 'AND en.limitedAccess = 0'
      orderByList.push('emp.fullFIO')
      orderByList.push('en.tabNumSort')
    }
    if (params.showPeriodCalc) {
      fieldList.push('acc.periodCalcID as "periodCalcID"')
      fieldList.push('pc.name as "periodCalc"')
      groupList.push('acc.periodCalcID')
      groupList.push('pc.name')
      groupList.push('pc.dateFrom')
      orderByList.push('pc.dateFrom')
    }
    if (params.showPeriodSalary) {
      fieldList.push('acc.periodSalaryID as "periodSalaryID"')
      fieldList.push('ps.name as "periodSalary"')
      groupList.push('ps.name')
      groupList.push('acc.periodSalaryID')
      groupList.push('ps.dateFrom')
      orderByList.push('ps.dateFrom')
    }
    if (params.showPayEl) {
      fieldList.push('afd.payElID AS "payElID"')
      fieldList.push('pe.description AS "payElName"')
      fieldList.push('SUM(round(afd.paySum,2)) AS "paySumDet"')
      fieldList.push('SUM(afd.baseSum) AS "baseSumDet"')
      fieldList.push('SUM(afd.sourceSum) AS "sourceSumDet"')
      groupList.push('afd.payElID')
      groupList.push('pe.description')
    }
  }
  if (paramName === 'addBaseCalcSum' && isTotal) {
    extraWhereClause = `AND fm.code = '2'`
    extraJoinClause = `LEFT JOIN hr_payFund pf ON pf.ID = acc.payFundID LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID`
    fieldList.push(`SUM(CASE WHEN fm.code = '2' THEN acc.baseSum ELSE 0 END) as "addMinSum"`)
  } else {
    fieldList.push('sum(acc.addMinSum) as "addMinSum"')
  }
  if (paramName === 'excMaxBaseSum') {
    extraJoinClause = `LEFT JOIN hr_payFund pf ON pf.ID = acc.payFundID LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID`
    extraWhereClause = `AND fm.code = '1'`
  }
  if (paramName === 'chargedFactSum' || paramName === 'controlChargedSum') {
    extraJoinClause = `LEFT JOIN hr_payFund pf ON pf.ID = acc.payFundID LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID`
    fieldList.push(`SUM(CASE WHEN fm.code = '2' THEN acc.baseSum ELSE 0 END) AS "addMinSum2"`)
  }
  if (paramName === 'addBaseCalcSum' && !isTotal) {
    fieldList.push('SUM(acc.paySumAll) AS "paySumAll"')
    fieldList.push('SUM(acc.addMinSumAll) AS "addMinSumAll"')
    fieldList.push('SUM(acc.sourceSumAll) AS "sourceSumAll"')
    extraWhereClause = `AND acc.addMinSum <> 0`
    dataStore.runSQL(`
      WITH acc_emp (paySumAll, addMinSumAll, sourceSumAll, rate, employeeNumberID, employeeID, periodCalcID, periodSalaryID) AS
      (SELECT
          SUM(round(af.paySum,2)) AS "paySumAll"
         ,SUM(CASE WHEN fm.code = '2' THEN af.baseSum ELSE 0 END) AS "addMinSumAll"
         ,SUM(af.sourceSum) AS "sourceSumAll"
         ,af.rate
         ,af.employeeNumberID AS "employeeNumberID"
         ,en.employeeID AS "employeeID"
         ,af.periodCalcID AS "periodCalcID"
         ,af.periodSalaryID AS "periodSalaryID"
        FROM hr_accrualFund af
        LEFT JOIN hr_employeeNumber en
          ON af.employeeNumberID = en.ID
        LEFT JOIN hr_payFund pf
          ON pf.ID = af.payFundID
        LEFT JOIN hr_payFundMethod fm
          ON fm.ID = pf.payFundMethodID
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
            AND af.periodCalcID ${entityBaseService.getInExpression('periodIds')}
            AND pf.isRecSum = 0
            AND en.empWorkPlace is null
        GROUP BY af.rate,af.employeeNumberID,en.employeeID,af.periodCalcID,af.periodSalaryID),
      acc (paySum, addMinSum, baseSum, sourceSum, limitSum, paySumAll, addMinSumAll, sourceSumAll, rate, employeeNumberID, employeeID, periodCalcID, periodSalaryID) AS (
        SELECT
          SUM(round(af.paySum,2)) AS "paySum"
         ,SUM(CASE WHEN fm.code = '2' THEN af.baseSum ELSE 0 END) AS "addMinSum"
         ,SUM(af.baseSum) AS "baseSum"       
         ,SUM(af.sourceSum) AS "sourceSum"
         ,sum(af.baseSum-af.addMinSum) as "limitSum"
         ,(SELECT SUM(t.paySumAll) FROM acc_emp t WHERE t.rate = af.rate and t.employeeID = en.employeeID and t.periodCalcID = af.periodCalcID AND t.periodSalaryID = af.periodSalaryID) AS "paySumAll"
         ,(SELECT SUM(t.addMinSumAll) FROM acc_emp t WHERE t.rate = af.rate and t.employeeID = en.employeeID and t.periodCalcID = af.periodCalcID AND t.periodSalaryID = af.periodSalaryID) AS "addMinSumAll"
         ,(SELECT SUM(t.sourceSumAll) FROM acc_emp t WHERE t.rate = af.rate and t.employeeID = en.employeeID and t.periodCalcID = af.periodCalcID AND t.periodSalaryID = af.periodSalaryID) AS "sourceSumAll"
         ,af.rate
         ,af.employeeNumberID AS "employeeNumberID"
         ,en.employeeID as "employeeID"
         ,af.periodCalcID as "periodCalcID"
         ,af.periodSalaryID as "periodSalaryID"
        FROM hr_accrualFund af
          LEFT JOIN hr_employeeNumber en ON af.employeeNumberID=en.ID
          LEFT JOIN hr_payFund pf ON pf.ID = af.payFundID
          LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
            AND af.periodCalcID ${entityBaseService.getInExpression('periodIds')}
            AND pf.isRecSum = 0
            AND en.empWorkPlace is null
        GROUP BY af.rate,af.employeeNumberID,en.employeeID,af.periodCalcID,af.periodSalaryID
      )    
      SELECT ${fieldList.join(',')}
        FROM acc
          LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
          LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
          LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
          LEFT JOIN hr_dictPeriod ps ON ps.ID=acc.periodSalaryID
          ${params.showPayFund ? 'LEFT JOIN hr_payFund as hpf ON tmp.payFundID = hpf.ID' : ''} 
          LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
            where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= pc.dateTo and ep2.mi_deleteDate >= '9999-12-31' 
            order by ep2.dateFrom desc ${sqlDialect.limit})
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND en.empWorkPlace is null
          ${deptClause}
          ${params.limitedAccess ? limitedAccessClause : ''}      
          ${extraWhereClause}
          ${groupList.length ? 'GROUP BY ' + groupList.join(',') : ''} 
          ${groupList.length ? 'HAVING SUM(acc.addMinSum) <> 0' : ''}
          ${orderByList.length ? 'ORDER BY ' + orderByList.join(',') : ''}
    `, {
      orgIDs: reportParams.orgIDs,
      deptIDs: reportParams.deptIDs,
      periodIds: reportParams.periodIds
    })
  } else {
    dataStore.runSQL(`
      SELECT ${fieldList.join(',')}
        FROM hr_accrualFund acc
          LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
          LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
          LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
          LEFT JOIN hr_dictPeriod ps ON ps.ID=acc.periodSalaryID
          LEFT JOIN hr_payFund hpf ON acc.payFundID = hpf.ID 
          ${params.showPayEl ? 'LEFT JOIN hr_accrualFundDt afd ON afd.accrualFundID = acc.ID' : ''} 
          ${params.showPayEl ? 'LEFT JOIN hr_payEl pe ON pe.ID = afd.payElID' : ''} 
          LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
            where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= pc.dateTo and ep2.mi_deleteDate >= '9999-12-31' 
            order by ep2.dateFrom desc ${sqlDialect.limit})
          ${extraJoinClause}  
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
          AND hpf.isRecSum = 0          
          AND en.empWorkPlace is null
          ${deptClause}
          ${params.limitedAccess ? limitedAccessClause : ''}      
          ${extraWhereClause}
          ${groupList.length ? 'GROUP BY ' + groupList.join(',') : ''} 
          ${orderByList.length ? 'ORDER BY ' + orderByList.join(',') : ''}
    `, {
      orgIDs: reportParams.orgIDs,
      deptIDs: reportParams.deptIDs,
      periodIds: reportParams.periodIds
    })
  }
  return dataStore.getAsJsObject()
}

function getExcMaxBaseSumData (params, reportParams) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let deptClause = reportParams.deptIDs ? `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}` : ''

  const dataStore = UB.DataStore('hr_accrualFund')
  let fieldList = ['sum(round(acc.paySum,2)) as "paySum"', 'sum(acc.addMinSum) as "addMinSum"', 'sum(acc.baseSum) as "baseSum"',
    'sum(acc.sourceSum) as "sourceSum"', 'sum(acc.baseSum-acc.addMinSum) as "limitSum"', 'sum(acc.paySumAll) AS "paySumAll"',
    'sum(acc.baseSumAll) AS "baseSumAll"', 'sum(acc.sourceSumAll) AS "sourceSumAll"'
  ]
  let groupList = []
  let orderByList = []
  let limitedAccessClause = ''
  if (params.showRate) {
    fieldList.push('acc.rate')
    groupList.push('acc.rate')
  }
  if (params.showPayFund) {
    fieldList.push('acc.payFundID as "payFundID"')
    fieldList.push('hpf.description as "payFundName"')
    groupList.push('acc.payFundID')
    groupList.push('hpf.description')
    orderByList.push('hpf.description')
  }
  if (params.showEmployee) {
    fieldList.push('acc.employeeNumberID as "employeeNumberID"')
    fieldList.push('emp.fullFIO as "fullFIO"')
    fieldList.push('en.tabNum as "tabNum"')
    groupList.push('acc.employeeNumberID')
    groupList.push('emp.fullFIO')
    groupList.push('en.tabNum')
    groupList.push('en.tabNumSort')
    limitedAccessClause = 'AND en.limitedAccess = 0'
    orderByList.push('emp.fullFIO')
    orderByList.push('en.tabNumSort')
  }
  if (params.showPeriodCalc) {
    fieldList.push('acc.periodCalcID as "periodCalcID"')
    fieldList.push('pc.name as "periodCalc"')
    groupList.push('acc.periodCalcID')
    groupList.push('pc.name')
    groupList.push('pc.dateFrom')
    orderByList.push('pc.dateFrom')
  }
  if (params.showPeriodSalary) {
    fieldList.push('acc.periodSalaryID as "periodSalaryID"')
    fieldList.push('ps.name as "periodSalary"')
    groupList.push('ps.name')
    groupList.push('acc.periodSalaryID')
    groupList.push('ps.dateFrom')
    orderByList.push('ps.dateFrom')
  }
  if (params.showPayEl) {
    fieldList.push('afd.payElID AS "payElID"')
    fieldList.push('pe.description AS "payElName"')
    fieldList.push('SUM(round(afd.paySum,2)) AS "paySumDet"')
    fieldList.push('SUM(afd.baseSum) AS "baseSumDet"')
    fieldList.push('SUM(afd.sourceSum) AS "sourceSumDet"')
    groupList.push('afd.payElID')
    groupList.push('pe.description')
  }

  dataStore.runSQL(`
    WITH tmp (employeeNumberID, periodSalaryID) AS (
      SELECT acc.employeeNumberID AS "employeeNumberID", acc.periodSalaryID AS "periodSalaryID"
      FROM hr_accrualFund acc LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID = en.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID = acc.periodCalcID
        LEFT JOIN hr_dictPeriod ps ON ps.ID = acc.periodSalaryID
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1
          AND ep.ID = (SELECT ${sqlDialect.top} ep2.ID
            FROM hr_employeePosition ep2
            WHERE ep2.employeeNumberID = en.ID
            AND ep2.isActive = 1
            AND ep2.dateFrom <= pc.dateTo
            AND ep2.mi_deleteDate >= '9999-12-31'
            ORDER BY ep2.dateFrom DESC ${sqlDialect.limit})
        LEFT JOIN hr_payFund pf ON pf.ID = acc.payFundID 
        LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID            
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
        AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND en.empWorkPlace is null
        ${params.limitedAccess ? limitedAccessClause : ''}
        ${deptClause}        
        AND fm.code = '1'
        AND pf.isRecSum = 0
      GROUP BY acc.employeeNumberID,acc.periodSalaryID
      HAVING ABS(SUM(sourceSum)) > ABS(SUM(baseSum))
    ),
    acc_emp (paySumAll, baseSumAll, sourceSumAll, rate, employeeNumberID, employeeID, periodCalcID, periodSalaryID, payFundID) AS
      (SELECT
          SUM(round(af.paySum,2)) AS "paySumAll"
         ,SUM(af.baseSum) AS "baseSumAll"
         ,SUM(af.sourceSum) AS "sourceSumAll"
         ,af.rate
         ,af.employeeNumberID AS "employeeNumberID"
         ,en.employeeID AS "employeeID"
         ,af.periodCalcID AS "periodCalcID"
         ,af.periodSalaryID AS "periodSalaryID"
         ,af.payFundID AS "payFundID"
        FROM hr_accrualFund af
        LEFT JOIN hr_employeeNumber en
          ON af.employeeNumberID = en.ID
        LEFT JOIN hr_payFund pf
          ON pf.ID = af.payFundID
        LEFT JOIN hr_payFundMethod fm
          ON fm.ID = pf.payFundMethodID
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND en.empWorkPlace is null
          AND af.periodCalcID ${entityBaseService.getInExpression('periodIds')}
          AND pf.isRecSum = 0
          AND fm.code = '1'
        GROUP BY af.rate,af.employeeNumberID,en.employeeID,af.periodCalcID,af.periodSalaryID,af.payFundID),
      acc (paySum, addMinSum, baseSum, sourceSum, limitSum, paySumAll, baseSumAll, sourceSumAll, rate, employeeNumberID, employeeID, periodCalcID, periodSalaryID, payFundID) AS (
        SELECT
          SUM(round(af.paySum,2)) AS "paySum"
         ,SUM(CASE WHEN fm.code = '2' THEN af.baseSum ELSE 0 END) AS "addMinSum"
         ,SUM(af.baseSum) AS "baseSum"       
         ,SUM(af.sourceSum) AS "sourceSum"
         ,sum(af.baseSum-af.addMinSum) as "limitSum"
         ,(SELECT SUM(t.paySumAll) FROM acc_emp t WHERE t.rate = af.rate and t.employeeID = en.employeeID and t.periodCalcID = af.periodCalcID AND t.periodSalaryID = af.periodSalaryID AND t.payFundID = af.payFundID) AS "paySumAll"
         ,(SELECT SUM(t.baseSumAll) FROM acc_emp t WHERE t.rate = af.rate and t.employeeID = en.employeeID and t.periodCalcID = af.periodCalcID AND t.periodSalaryID = af.periodSalaryID AND t.payFundID = af.payFundID) AS "baseSumAll"
         ,(SELECT SUM(t.sourceSumAll) FROM acc_emp t WHERE t.rate = af.rate and t.employeeID = en.employeeID and t.periodCalcID = af.periodCalcID AND t.periodSalaryID = af.periodSalaryID AND t.payFundID = af.payFundID) AS "sourceSumAll"
         ,af.rate
         ,af.employeeNumberID AS "employeeNumberID"
         ,en.employeeID as "employeeID"
         ,af.periodCalcID as "periodCalcID"
         ,af.periodSalaryID as "periodSalaryID"
         ,af.payFundID as "payFundID"
        FROM hr_accrualFund af
          LEFT JOIN hr_employeeNumber en ON af.employeeNumberID=en.ID
          LEFT JOIN hr_payFund pf ON pf.ID = af.payFundID
          LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND af.periodCalcID ${entityBaseService.getInExpression('periodIds')}
          AND pf.isRecSum = 0
          AND en.empWorkPlace is null
        GROUP BY af.rate,af.employeeNumberID,en.employeeID,af.periodCalcID,af.periodSalaryID,af.payFundID
      )  
    SELECT ${fieldList.join(',')}
      FROM acc
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_employee emp ON en.employeeID=emp.ID
        LEFT JOIN hr_dictPeriod pc ON pc.ID=acc.periodCalcID
        LEFT JOIN hr_dictPeriod ps ON ps.ID=acc.periodSalaryID
        LEFT JOIN hr_payFund hpf ON acc.payFundID = hpf.ID 
        ${params.showPayEl ? 'LEFT JOIN hr_accrualFundDt afd ON afd.accrualFundID = acc.ID' : ''} 
        ${params.showPayEl ? 'LEFT JOIN hr_payEl pe ON pe.ID = afd.payElID' : ''} 
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= pc.dateTo and ep2.mi_deleteDate >= '9999-12-31' 
          order by ep2.dateFrom desc ${sqlDialect.limit})
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
        AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND hpf.isRecSum = 0          
        AND en.empWorkPlace is null
        AND EXISTS(SELECT 1 FROM tmp WHERE tmp.employeeNumberID = acc.employeeNumberID AND tmp.periodSalaryID=acc.periodSalaryID)
        ${groupList.length ? 'GROUP BY ' + groupList.join(',') : ''} 
        ${orderByList.length ? 'ORDER BY ' + orderByList.join(',') : ''}
  `, {
    orgIDs: reportParams.orgIDs,
    deptIDs: reportParams.deptIDs,
    periodIds: reportParams.periodIds
  })
  return dataStore.getAsJsObject()
}

function getTaxBaseSumData (reportParams) {
  const dataStore = UB.DataStore('hr_accrualFund')
  const sqlDialect = entityBaseService.getSQLDialect()
  const deptClause = reportParams.deptIDs ? `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}` : ''
  dataStore.runSQL(`
    SELECT acc.periodCalcID as "periodCalcID"
        ,hp.name as "periodCalc"
        ,rate as "rate"
        ,sum(acc.sourceSum) as "sourceSum"
        ,sum(acc.baseSum) as "baseSum"
        ,sum(acc.addMinSum) as "addMinSum"
      FROM hr_accrualFund acc
        LEFT JOIN hr_employeeNumber en ON acc.employeeNumberID=en.ID
        LEFT JOIN hr_dictPeriod hp ON hp.ID=acc.periodCalcID
        LEFT JOIN hr_payFund hpf ON acc.payFundID = hpf.ID 
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
          where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= hp.dateTo and ep2.mi_deleteDate >= '9999-12-31' 
          order by ep2.dateFrom desc ${sqlDialect.limit})
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
        AND acc.periodCalcID ${entityBaseService.getInExpression('periodIds')}
        AND hpf.isRecSum = 0          
        AND en.empWorkPlace is null
        ${deptClause}
        ${reportParams.limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      GROUP BY acc.periodCalcID, hp.name, hp.dateFrom, acc.rate
      ORDER BY hp.dateFrom, acc.rate              
  `, {
    orgIDs: reportParams.orgIDs,
    deptIDs: reportParams.deptIDs,
    periodIds: reportParams.periodIds
  })
  return dataStore.getAsJsObject()
}

me.getReportData = function (ctx) {
  const params = ctx.mParams.execParams
  const reportParams = prepareReportParams(params)

  let result = {
    totalSum: 0,
    paySumESVOn: 0,
    paySumESVOff: 0,
    addBaseCalcSum: 0,
    excMaxBaseSum: 0,
    dismAccrualSum: 0,
    chargedPlanSum: 0,
    chargedFactSum: 0,
    controlChargedSum: 0,
    factSum: 0,
    taxBaseSum: 0,
    controlSum: 0,
    orgName: reportParams.orgName,
    depName: reportParams.depName,
    periodName: reportParams.periodName
  }

  let acc = getAccrualData('totalSum', true, {}, reportParams)
  if (acc.length) {
    result.totalSum = acc[0]['paySum'] || 0
  }

  acc = getAccrualData('paySumESVOn', true, {}, reportParams)
  if (acc.length) {
    result.paySumESVOn = acc[0]['paySum'] || 0
  }

  acc = getAccrualData('paySumESVOff', true, {}, reportParams)
  if (acc.length) {
    result.paySumESVOff = acc[0]['paySum'] || 0
  }

  acc = getAccrualData('dismAccrualSum', true, {}, reportParams)
  if (acc.length) {
    result.dismAccrualSum = acc[0]['paySum'] || 0
  }

  acc = getFundData('', true, {}, reportParams)
  if (acc.length) {
    result.chargedFactSum = acc[0]['baseSum'] || 0
    result.factSum = acc[0]['paySum'] || 0
  }

  acc = getFundData('addBaseCalcSum', true, {}, reportParams)
  if (acc.length) {
    result.addBaseCalcSum = acc[0]['addMinSum'] || 0
  }

  const accruals = getFundData('excMaxBaseSum', false, { showPeriodSalary: true, showEmployee: true }, reportParams)
  result.excMaxBaseSum = accruals.reduce((sum, acc) => {
    sum += Math.abs(acc['sourceSum']) > Math.abs(acc['baseSum']) ? acc['sourceSum'] - acc['baseSum'] : 0
    return sum
  }, 0)

  const accFunds = getTaxBaseSumData(reportParams)
  result.taxBaseSum = accFunds.reduce((sum, acc) => {
    sum += currencyService.round(acc['baseSum'] * (acc['rate'] || 0) / 100)
    return sum
  }, 0)

  result.chargedPlanSum = result.paySumESVOn + result.addBaseCalcSum - result.excMaxBaseSum - result.dismAccrualSum
  result.controlChargedSum = Math.abs(result.chargedPlanSum - result.chargedFactSum)
  result.controlSum = Math.abs(result.factSum - result.taxBaseSum)

  result.correctChargedSum = result.controlChargedSum < 1
  result.correctControlSum = result.controlSum < 1

  ctx.mParams.resultData = JSON.stringify(result)
}

me.getDetailData = function (ctx) {
  const params = ctx.mParams.execParams
  const reportParams = prepareReportParams(params)
  let minTableWidth = 150
  let cellSpan = 5
  switch (params.cellCode) {
    case 'chargedFactSum':
    case 'factSum':
      minTableWidth = 600
      cellSpan = 6
      break
    case 'excMaxBaseSum':
      minTableWidth = 1350
      cellSpan = 10
      break
    case 'addBaseCalcSum':
      minTableWidth = 1500
      cellSpan = 10
      break
    case 'totalSum':
    case 'paySumESVOn':
    case 'paySumESVOff':
    case 'dismAccrualSum':
      cellSpan = 4
      break
  }
  const result = {
    showPeriodCalc: params.showPeriodCalc,
    showPeriodSalary: params.showPeriodSalary,
    showEmployee: params.showEmployee,
    showPayEl: params.showPayEl,
    showPayFund: params.showPayFund,
    showRate: params.showRate,
    data: [],
    totalSum: 0,
    tableWidth: minTableWidth,
    cellSpan,
    orgName: reportParams.orgName,
    depName: reportParams.depName,
    periodName: reportParams.periodName
  }
  if (params.showPeriodCalc) {
    result.tableWidth += 150
    result.cellSpan++
  }
  if (params.showPeriodSalary) {
    result.tableWidth += 150
    result.cellSpan++
  }
  if (params.showEmployee) {
    result.tableWidth += 330
    result.cellSpan += 2
  }
  if (params.showPayEl) {
    result.tableWidth += 250
    result.cellSpan++
  }
  if (params.showPayFund) {
    result.tableWidth += 200
    result.cellSpan++
  }
  if (params.showRate) {
    result.tableWidth += 150
    result.cellSpan++
  }
  if (['totalSum', 'paySumESVOn', 'paySumESVOff', 'dismAccrualSum'].includes(params.cellCode)) {
    result.data = getAccrualData(params.cellCode, false, params, reportParams)
    result.data.forEach(row => {
      row.showPeriodCalc = params.showPeriodCalc
      row.showPeriodSalary = params.showPeriodSalary
      row.showEmployee = params.showEmployee
      row.showPayEl = params.showPayEl
      result.totalSum += row.paySum || 0
    })
    if (!params.showPeriodCalc) {
      result.tableWidth += 150
    }
    if (!params.showPeriodSalary) {
      result.tableWidth += 150
    }
    if (!params.showPayEl) {
      result.tableWidth += 250
    }
  }
  if (params.cellCode === 'taxBaseSum') {
    result.totalSourceSum = 0
    result.totalAddMinSum = 0
    result.totalExcMaxBaseSum = 0
    result.totalBaseSum = 0
    result.data = getTaxBaseSumData(reportParams)
    result.data.forEach(row => {
      row.calcSum = currencyService.round(row['baseSum'] * (row['rate'] || 0) / 100)
      row.excMaxBaseSum = currencyService.round(row['sourceSum'] - row['baseSum']) || 0
      result.totalSum += row.calcSum || 0
      result.totalSourceSum += row.sourceSum || 0
      result.totalAddMinSum += row.addMinSum || 0
      result.totalExcMaxBaseSum += row.excMaxBaseSum || 0
      result.totalBaseSum += row.baseSum || 0
    })
  }
  if (params.cellCode === 'addBaseCalcSum') {
    result.totalSourceSum = 0
    result.totalAddMinSum = 0
    result.totalPaySum = 0
    result.totalBaseSum = 0
    result.totalSum = 0
    result.totalSourceSumAll = 0
    result.totalAddMinSumAll = 0
    result.totalPaySumAll = 0
    result.totalSumAll = 0
    result.showAddBaseCalcSum = true
    result.showAddMinSumAll = true
    result.showSourceSumAll = true
    result.showPaySumAll = true
    result.showTotalSum = true
    result.showTotalSumAll = true
    params.showRate = true
    result.data = getFundData(params.cellCode, false, params, reportParams)
    result.data.forEach(row => {
      row.showPeriodCalc = params.showPeriodCalc
      row.showPeriodSalary = params.showPeriodSalary
      row.showEmployee = params.showEmployee
      row.showAddBaseCalcSum = true
      row.showAddMinSumAll = true
      row.showSourceSumAll = true
      row.showPaySumAll = true
      row.showTotalSum = true
      row.showTotalSumAll = true
      row.totalSum = (row.sourceSum || 0) + (row.addMinSum || 0)
      row.totalSumAll = (row.sourceSumAll || 0) + (row.addMinSumAll || 0)
      result.totalSourceSum += row.sourceSum || 0
      result.totalAddMinSum += row.addMinSum || 0
      result.totalPaySum += row.paySum || 0
      result.totalBaseSum += row.baseSum || 0
      result.totalSum += row.totalSum || 0
      result.totalSourceSumAll += row.sourceSumAll || 0
      result.totalAddMinSumAll += row.addMinSumAll || 0
      result.totalPaySumAll += row.paySumAll || 0
      result.totalSumAll += row.totalSumAll || 0
    })
  }
  if (params.cellCode === 'excMaxBaseSum') {
    params.showRate = true
    const data = getExcMaxBaseSumData(params, reportParams)
    result.totalSourceSum = 0
    result.totalAddMinSum = 0
    result.totalPaySum = 0
    result.totalBaseSum = 0
    result.totalCalcSum = 0
    result.totalExcMaxBaseSum = 0
    result.totalSourceSumAll = 0
    result.totalBaseSumAll = 0
    result.totalPaySumAll = 0
    result.totalExcMaxBaseSumAll = 0
    result.showExcMaxBaseSum = true
    result.showBaseSum = true
    result.showSourceSumAll = true
    result.showPaySumAll = true
    result.showBaseSumAll = true
    result.showExcMaxBaseSumAll = true
    data.forEach(row => {
      row.excMaxBaseSum = (row['sourceSum'] - row['baseSum']) || 0
      row.showPeriodCalc = params.showPeriodCalc
      row.showPeriodSalary = params.showPeriodSalary
      row.showEmployee = params.showEmployee
      row.showExcMaxBaseSum = true
      row.showBaseSum = true
      row.showSourceSumAll = true
      row.showPaySumAll = true
      row.showBaseSumAll = true
      row.showExcMaxBaseSumAll = true
      row.excMaxBaseSumAll = (row.sourceSumAll || 0) - (row.baseSumAll || 0)
      result.data.push(row)
      result.totalSourceSum += row.sourceSum || 0
      result.totalAddMinSum += row.addMinSum || 0
      result.totalPaySum += row.paySum || 0
      result.totalBaseSum += row.baseSum || 0
      result.totalExcMaxBaseSum += row.excMaxBaseSum || 0
      result.totalSourceSumAll += row.sourceSumAll || 0
      result.totalBaseSumAll += row.baseSumAll || 0
      result.totalPaySumAll += row.paySumAll || 0
      result.totalExcMaxBaseSumAll += row.excMaxBaseSumAll || 0
    })
  }
  if (params.cellCode === 'controlSum') {
    const accruals = getFundData('controlSum', false, { showPeriodCalc: true, showEmployee: true, showRate: true }, reportParams)
    accruals.forEach(row => {
      const calcSum = Math.abs(currencyService.round((row.limitSum + row.addMinSum) * row.rate / 100) - row.paySum)
      if (calcSum >= 0.05) {
        result.data.push(row)
      }
    })
    result.totalSourceSum = 0
    result.totalAddMinSum = 0
    result.totalPaySum = 0
    result.totalBaseSum = 0
    result.totalCalcSum = 0
    result.totalLimitSum = 0
    result.totalDiffSum = 0
    result.data.forEach(row => {
      row.calcSum = currencyService.round((row.limitSum + row.addMinSum) * row.rate / 100)
      row.diffSum = currencyService.round(row.paySum - row.calcSum)
      result.totalSourceSum += row.sourceSum || 0
      result.totalAddMinSum += row.addMinSum || 0
      result.totalPaySum += row.paySum || 0
      result.totalBaseSum += row.baseSum || 0
      result.totalLimitSum += row.limitSum || 0
      result.totalCalcSum += row.calcSum || 0
      result.totalDiffSum += row.diffSum || 0
    })
  }
  if (params.cellCode === 'controlChargedSum') {
    const factAccruals = getAccrualData(params.cellCode, false, { showPeriodCalc: true, showEmployee: true }, reportParams)
    const dismAccruals = getAccrualData('dismAccrualSum', false, { showPeriodCalc: true, showEmployee: true }, reportParams)
    const accrualFunds = getFundData(params.cellCode, false, { showPeriodCalc: true, showEmployee: true }, reportParams)
    const newAccruals = []
    accrualFunds.forEach(row => {
      row.factSum = 0
    })
    dismAccruals.forEach(row => {
      const acc = factAccruals.find(o => o.employeeNumberID === row.employeeNumberID && o.periodCalcID === row.periodCalcID)
      if (acc) {
        acc.paySum -= row.paySum
      }
    })
    factAccruals.forEach(row => {
      const acc = accrualFunds.find(o => o.employeeNumberID === row.employeeNumberID && o.periodCalcID === row.periodCalcID)
      if (acc) {
        acc.factSum = row.paySum
      } else {
        newAccruals.push(row)
      }
    })
    newAccruals.forEach(row => {
      accrualFunds.push({
        employeeNumberID: row.employeeNumberID,
        fullFIO: row.fullFIO,
        tabNum: row.tabNum,
        periodCalcID: row.periodCalcID,
        periodCalc: row.periodCalc,
        factSum: row.paySum,
        paySum: 0,
        addMinSum: 0,
        baseSum: 0,
        sourceSum: 0,
        limitSum: 0
      })
    })
    result.totalSourceSum = 0
    result.totalAddMinSum = 0
    result.totalPaySum = 0
    result.totalBaseSum = 0
    result.totalFactSum = 0
    result.totalLimitSum = 0
    result.totalCalcSum = 0
    result.totalDiffSum = 0
    result.totalExcMaxBaseSum = 0
    accrualFunds.forEach(row => {
      row.addMinSum = row['addMinSum2'] || 0
      row.excMaxBaseSum = (row.sourceSum || 0) - (row.baseSum || 0) + (row.addMinSum || 0)
      if (row.sourceSum * row.excMaxBaseSum < 0) row.excMaxBaseSum = 0
      row.calcSum = (row.factSum || 0) - (row.excMaxBaseSum || 0) + (row.addMinSum || 0)
      row.diffSum = currencyService.round(row.calcSum - (row.baseSum || 0))
      row.limitSum = (row.factSum || 0) - row.excMaxBaseSum
      let isShow = !params.showOnlyErrors || Math.abs(row.calcSum - (row.baseSum || 0)) >= 0.01
      if (isShow) {
        result.totalSourceSum += row.sourceSum || 0
        result.totalAddMinSum += row.addMinSum || 0
        result.totalPaySum += row.paySum || 0
        result.totalBaseSum += row.baseSum || 0
        result.totalLimitSum += row.limitSum || 0
        result.totalFactSum += row.factSum || 0
        result.totalCalcSum += row.calcSum || 0
        result.totalDiffSum += row.diffSum || 0
        result.totalExcMaxBaseSum += row.excMaxBaseSum || 0
        result.data.push(row)
      }
    })
    result.data.sort((a, b) => stringService.compareStringUa(a.fullFIO, b.fullFIO) === 1 ? 1
      : stringService.compareStringUa(a.fullFIO, b.fullFIO) === 0
        ? (a.tabNumSort === b.tabNumSort ? a.periodCalc - b.periodCalc : a.tabNumSort - b.tabNumSort) : -1)
  }
  if (params.cellCode === 'chargedFactSum' || params.cellCode === 'factSum') {
    result.data = getFundData(params.cellCode, false, params, reportParams)
    result.totalSourceSum = 0
    result.totalAddMinSum = 0
    result.totalPaySum = 0
    result.totalBaseSum = 0
    result.totalExcMaxBaseSum = 0
    result.showAddBaseCalcSum = true // params.cellCode === 'factSum'
    result.data.forEach(row => {
      if (params.showPayEl) {
        row.sourceSum = row['sourceSumDet']
        row.baseSum = row['baseSumDet']
        row.paySum = row['paySumDet']
      }
      row.showPeriodCalc = params.showPeriodCalc
      row.showPeriodSalary = params.showPeriodSalary
      row.showEmployee = params.showEmployee
      row.showPayEl = params.showPayEl
      row.showPayFund = params.showPayFund
      row.showRate = params.showRate
      if (params.cellCode === 'chargedFactSum') {
        row.addMinSum = row['addMinSum2'] || 0
        row.excMaxBaseSum = (row['sourceSum'] - (row['baseSum'] - row['addMinSum'])) || 0
      } else {
        row.excMaxBaseSum = (row['baseSum'] - row['sourceSum'] > 0 ? row['baseSum'] - row['sourceSum'] : 0) || 0
      }
      result.totalSourceSum += row.sourceSum || 0
      result.totalAddMinSum += row.addMinSum || 0
      result.totalPaySum += row.paySum || 0
      result.totalBaseSum += row.baseSum || 0
      result.totalExcMaxBaseSum += row.excMaxBaseSum || 0
    })
  }
  result.cellSpan1 = result.cellSpan - 1
  ctx.mParams.resultData = JSON.stringify(result)
}
