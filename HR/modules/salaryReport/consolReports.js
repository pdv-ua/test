const UB = require('@unitybase/ub')
const App = UB.App

const _ = require('lodash')
const dateService = require('../../../AC/modules/dataServices/dateService')
const currencyService = require('../../../AC/public/core/currencyService')
const accrualService = require('../../../HR/modules/accrualService')
const periodService = require('../../../HR/modules/periodService')
const reportService = require('../../../HR/modules/reportService')
const settingsService = require('../../../AC/modules/entityServices/settingsService')
const entityBaseService = require('../../../AC/modules/entityServices/entityBaseService')
const staffService = require('../staffService')
const stringService = require('../../../AC/modules/dataServices/stringService')
const treeUtils = require('../../../HR/public/core/treeUtils')

module.exports = {
  getIncTaxData,
  getPaySummaryData,
  getConsolCategData,
  getNReportData,
  getCalcFundsData,
  getFOPData,
  getIndividualEmpContractData,
  getGeneralRegistryData,
  get1NCData,
  getCostItemsData
}

function getPaySummaryData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  params.dictFundSourceID = params.dictFundSourceID ? params.dictFundSourceID : []
  params.isIncludeEmpty = params.dictFundSourceID.includes(0)
  if (params.isIncludeEmpty) {
    params.dictFundSourceID.filter(ID => ID !== 0)
  }

  const sqlDialect = entityBaseService.getSQLDialect()
  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  const showCalcPeriod = params.showCalcPeriod // Відображати розрахункові періоди
  const showSalaryPeriod = params.showSalaryPeriod // Відображати облікові періоди
  const checkPosDepChange = params.checkPosDepChange && !params.joinEmpAccounts
  const showZeroPayElSumRows = params.showZeroPayElSumRows // Виводити рядки з нульовими сумами у видах оплати
  const showOnlyZeroPayElSumRows = params.showOnlyZeroPayElSumRows // Виводити тільки рядки з нульовими сумами у видах оплати
  const showOrgName = params.organizationID && !params.groupReportByDep
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const joinEmpAccounts = params.joinEmpAccounts // Всі особові рахунки працівника разом
  const hideTrfPosition = !params.showTrfPosition // Відображати посадові місця
  // Виводити рядки з нульовими сумами showZeroSumRows
  // Відображати рядки з нульовими сумами тільки при наявності запису у РЛ showZeroSumRowsWithAcc
  /*
  const showSumPlus = params.showSumPlus
  const showSumMinus = params.showSumMinus
  const showSumPay = params.showSumPay
  const showSumBalRes = params.showSumBalRes
  */
  if (!params.extraColumns) params.extraColumns = []

  let orgIDs = []
  let orgNames = []
  if (params.organizationID) {
    orgIDs = [params.organizationID]
    if (params.includeSubOrg) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [params.orgID]
  }
  orgIDs.forEach(orgID => {
    const org = UB.Repository('hr_organization')
      .attrs(['treePath', 'description'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .limit(1)
      .selectSingle()
    orgNames.push({
      ID: orgID,
      treePath: org ? org.treePath : '',
      description: org ? org.description : ''
    })
  })
  orgNames.sort((a, b) => a.treePath < b.treePath ? -1 : 1)

  const periodIds = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsArrayOfValues()

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'pYear', 'dictMonthID.code', 'name', 'dateFrom')
    .where('ID', 'in', periodIds)
    .orderBy('dateFrom')
    .selectAsObject({
      'dictMonthID.code': 'pMonth'
    })

  const calcPeriods = []
  periodList.forEach(p => {
    p.dateFrom = dateService.shiftDate(p.dateFrom)
    const el = calcPeriods.find(o => o.dateFrom.getTime() === p.dateFrom.getTime())
    if (!el) {
      calcPeriods.push({
        pYear: p.pYear,
        pMonth: p.pMonth,
        name: p.name,
        dateFrom: p.dateFrom
      })
    }
  })

  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: params.periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.periodTo)
        .where('mi_dateTo', '>=', params.periodTo)
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

  const idParamStore = UB.DataStore('hr_idParam')
  idParamStore.runSQL(`  SELECT ip.ID as "ipID", pl.ID as "payElID", pl.description as "description"
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'     
    WHERE      
      ip.mi_deleteDate >= '9999-12-31' 
      and ip.orgID = :orgID:
      and ip.userID = :userID:
      and lp.code = 'ReportRstAll' 
      ORDER BY ip.orderN
  `, {
    orgID: params.orgID,
    userID: params.userID || 0
  })
  const payEls = idParamStore.getAsJsObject()
  idParamStore.freeNative()

  let payElIDs = payEls.map(el => el.payElID)
  if (!payElIDs.length) {
    payElIDs = [0]
  }

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')

  let abFundSourceWhere = ''
  const isIncludeEmptyFundSource = params.dictFundSourceID.includes(0)
  if (params.dictFundSourceID.length && !isIncludeEmptyFundSource) {
    abFundSourceWhere = ` AND ab.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDInList')}`
  } else if (params.dictFundSourceID.length === 1 && isIncludeEmptyFundSource) {
    abFundSourceWhere = ` AND ab.dictFundSourceID IS NULL`
  } else if (params.dictFundSourceID.length && isIncludeEmptyFundSource) {
    abFundSourceWhere = ` AND (ab.dictFundSourceID${entityBaseService.getInExpression('dictFundSourceIDInList')} OR ab.dictFundSourceID IS NULL)`
  }

  let periodWhere = showCalcPeriod
    ? `AND ab.periodCalcID${entityBaseService.getInExpression('periodIds')}`
    : `AND hp.dateFrom >= :periodFromDate: AND hp.dateFrom <= :periodToDate:`
  const empNumberDS = UB.DataStore('hr_employeeNumber')
  // 1
  let empsAB = []
  empNumberDS.runSQL(`SELECT 
    en.ID as "employeeNumberID"
    ,en.employeeID as "employeeID"
    ,en.description as "enDescription"
    ,ep.ID as "employeePositionID"
    ,ep.positionID as "positionID"
    ,ep.dictPositionID as "dictPositionID"
    ,ep.departmentID as "departmentID"
    ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
        where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
      else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
    ,en.tabNum as "tabNum"
    ,en.tabNumSort as "tabNumSort"
    ,e.fullFIO as "fullFIO"
    ,st.name as "sexType"
    ,e.birthDate as "birthDate"
    ,en.dateFrom as "startWork"
    ,en.dateTo as "endWork"
    ,ep.mtCount as "mtCount"
    ,ep.factPosition as "factPosition"
    ,dp.description as "positionName"
    ,dsc.description as "staffCatName"
    ,ws.name as "workSchedule"
    ,ecb.description as "dictCategoryECB"
    ,gla.description as "accountName"
    ,wt.name as "workerType"
    ,wp.name as "workPlace"
    ,ep.workPlace as "workPlaceCode"
    ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
    ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
    and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
    ,${showCalcPeriod ? 'hp.dateFrom' : 'null'} as "periodCalc"
    ,${showCalcPeriod ? 'hp.name' : 'null'} as "periodName"
    ,en.orgID as "orgID"
    ,${showCalcPeriod ? 'SUM(ab.sumFrom)' : 'SUM(CASE WHEN hp.dateFrom = :periodFromDate: THEN ab.sumFrom ELSE 0 END)'} "sumFrom"
    ,SUM(ab.sumPlus) "sumPlus"
    ,SUM(ab.sumMinus) "sumMinus"
    ,SUM(ab.sumPay) "sumPay"
    ,SUM(ab.sumTo) "sumTo"
    FROM hr_employeeNumber en   
    LEFT JOIN hr_accrualBalance ab ON ab.employeeNumberID=en.ID     
    LEFT JOIN hr_dictPeriod hp ON hp.ID=ab.periodCalcID
    LEFT JOIN  hr_employeePosition ep ON ep.isActive = 1 and
     ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
     ep2.employeeNumberID = en.ID 
     and ep2.isActive = 1
     and ep2.dateFrom <= ${checkPosDepChange ? 'hp.dateTo' : ':dateTo:'}   
     and ep2.mi_deleteDate >= '9999-12-31' 
     order by ep2.dateFrom desc ${sqlDialect.limit}) 
    LEFT JOIN hr_employee e ON e.ID = en.employeeID
    LEFT JOIN hr_dictPosition dp on dp.ID = ep.dictPositionID 
    LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
    LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
    LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
    LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
    LEFT JOIN ubm_enum st on st.code = e.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
    LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
    LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
    WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
    ${periodWhere}
    AND en.mi_deleteDate >= '9999-12-31' 
    ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
    ${deptClause} 
    ${abFundSourceWhere}
    ${hideTrfPosition ? ` AND COALESCE(ep.workPlace, '0') != '5' ` : ''}
    GROUP BY en.ID, en.employeeID, en.description, ep.ID, ep.positionID, ep.dictPositionID, ep.departmentID,en.tabNum,en.tabNumSort,e.fullFIO,dp.description,
      dsc.description ${showCalcPeriod ? ',hp.dateFrom, hp.name' : ''}, st.name, e.birthDate, en.dateFrom, en.dateTo, ep.mtCount,
      ep.factPosition, dp.description, dsc.description, ws.name, ecb.description, gla.description, wt.name, wp.name, ep.workPlace, en.orgID,
      ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value
    HAVING SUM(ab.sumFrom) <> 0 OR SUM(ab.sumPlus) <> 0 OR SUM(ab.sumPay) <> 0
    ORDER BY en.description`, {
    orgIDs,
    periodIds,
    periodFromDate: params.periodFrom,
    periodToDate: params.periodTo,
    deptIDs,
    dictFundSourceIDInList: params.dictFundSourceID,
    dateTo: params.periodTo,
    dateFrom: params.periodFrom,
    departmentID: params.departmentID
  })
  empsAB = empNumberDS.getAsJsObject()
  if (!showCalcPeriod) {
    empsAB.forEach(row => {
      row.sumTo = (row.sumFrom || 0) + (row.sumPlus || 0) - (row.sumMinus || 0) - (row.sumPay || 0)
    })
  }

  empsAB.forEach(emp => {
    emp.periodCalc = dateService.shiftDate(emp.periodCalc)
    if (!showCalcPeriod && !emp.periodCalc) {
      emp.periodCalc = params.periodFrom
    }
    emp.periodCalcN = emp.periodCalc ? emp.periodCalc.getTime() : 0
  })
  periodWhere = showCalcPeriod
    ? `AND acc.periodCalcID${entityBaseService.getInExpression('periodIds')}`
    : `AND hp.dateFrom >= :periodFromDate: AND hp.dateFrom <= :periodToDate:`
  let emps = []
  if (!params.dictFundSourceID.length && !deptIDs) {
    empNumberDS.runSQL(`SELECT 
      en.ID as "employeeNumberID"
      ,en.employeeID as "employeeID"
      ,en.description as "enDescription"
      ,ep.ID as "employeePositionID"
      ,ep.positionID as "positionID"
      ,ep.dictPositionID as "dictPositionID"
      ,ep.departmentID as "departmentID"
      ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
          where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
        else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
      ,en.tabNum as "tabNum"
      ,en.tabNumSort as "tabNumSort"
      ,e.fullFIO as "fullFIO"
      ,st.name as "sexType"
      ,e.birthDate as "birthDate"
      ,en.dateFrom as "startWork"
      ,en.dateTo as "endWork"
      ,ep.mtCount as "mtCount"
      ,ep.factPosition as "factPosition"
      ,dp.description as "positionName"
      ,dsc.description as "staffCatName"
      ,ws.name as "workSchedule"
      ,ecb.description as "dictCategoryECB"
      ,gla.description as "accountName"
      ,wt.name as "workerType"
      ,wp.name as "workPlace"
      ,ep.workPlace as "workPlaceCode"
      ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
      ,${showCalcPeriod ? 'hp.dateFrom' : 'null'} as "periodCalc"
      ,${showCalcPeriod ? 'hp.name' : 'null'} as "periodName"
      ,en.orgID as "orgID"
      ,0 as "sumFrom"
      ,0 as "sumPlus"
      ,0 as "sumMinus"
      ,0 as "sumPay"
      ,0 as "sumTo"
      FROM hr_employeeNumber en   
      LEFT JOIN hr_accrual acc ON acc.employeeNumberID=en.ID     
      LEFT JOIN hr_dictPeriod hp ON hp.ID=acc.periodCalcID
      LEFT JOIN  hr_employeePosition ep ON ep.isActive = 1 and
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.dateFrom <= ${checkPosDepChange ? 'hp.dateTo' : ':dateTo:'}   
       and ep2.mi_deleteDate >= '9999-12-31' 
       order by ep2.dateFrom desc ${sqlDialect.limit}) 
      LEFT JOIN hr_employee e ON e.ID = en.employeeID
      LEFT JOIN hr_dictPosition dp on dp.ID = ep.dictPositionID 
      LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
      LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
      LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
      LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
      LEFT JOIN ubm_enum st on st.code = e.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
      LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
      LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
      WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
      AND acc.payElID${entityBaseService.getInExpression('payElIDs')} 
      ${periodWhere}
      AND (acc.flagsRec & 4096 = 0)
      AND en.mi_deleteDate >= '9999-12-31' 
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      ${deptClause} 
      ${hideTrfPosition ? ` AND COALESCE(ep.workPlace, '0') != '5' ` : ''}
      ${!showZeroPayElSumRows ? ' AND acc.paySum <>0' : ''}
      GROUP BY en.ID, en.employeeID, en.description, ep.ID, ep.positionID, ep.dictPositionID, ep.departmentID,en.tabNum,en.tabNumSort,e.fullFIO,ep.factPosition,
        dsc.description ${showCalcPeriod ? ',hp.dateFrom, hp.name' : ''}, st.name, e.birthDate, en.dateFrom, en.dateTo, ep.mtCount,
        dp.description, dsc.description, ws.name, ecb.description, gla.description, wt.name, wp.name, ep.workPlace, en.orgID,
        ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value
      ORDER BY en.description`, {
      orgIDs,
      periodIds,
      periodFromDate: params.periodFrom,
      periodToDate: params.periodTo,
      deptIDs,
      dateTo: params.periodTo,
      dateFrom: params.periodFrom,
      departmentID: params.departmentID,
      payElIDs
    })
  } else {
    empNumberDS.runSQL(`SELECT 
      en.ID as "employeeNumberID"
      ,en.employeeID as "employeeID" 
      ,en.description as "enDescription"
      ,ep.ID as "employeePositionID"
      ,ep.positionID as "positionID"
      ,ep.dictPositionID as "dictPositionID"
      ,ep.departmentID as "departmentID"
      ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
          where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
        else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
      ,en.tabNum as "tabNum"
      ,en.tabNumSort as "tabNumSort"
      ,e.fullFIO as "fullFIO"
      ,st.name as "sexType"
      ,e.birthDate as "birthDate"
      ,en.dateFrom as "startWork"
      ,en.dateTo as "endWork"
      ,ep.mtCount as "mtCount"
      ,ep.factPosition as "factPosition"
      ,dp.description as "positionName"
      ,dsc.description as "staffCatName"
      ,ws.name as "workSchedule"
      ,ecb.description as "dictCategoryECB"
      ,gla.description as "accountName"
      ,wt.name as "workerType"
      ,wp.name as "workPlace"
      ,ep.workPlace as "workPlaceCode"
      ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
      ,${showCalcPeriod ? 'hp.dateFrom' : 'null'} as "periodCalc"
      ,${showCalcPeriod ? 'hp.name' : 'null'} as "periodName"
      ,en.orgID as "orgID"
      ,0 as "sumFrom"
      ,0 as "sumPlus"
      ,0 as "sumMinus"
      ,0 as "sumPay"
      ,0 as "sumTo"
      FROM hr_employeeNumber en   
      LEFT JOIN hr_accrual acc ON acc.employeeNumberID=en.ID
      LEFT JOIN hr_accrualDt ab ON ab.accrualID = acc.ID
      LEFT JOIN hr_dictPeriod hp ON hp.ID=acc.periodCalcID
      LEFT JOIN  hr_employeePosition ep ON ep.isActive = 1 and
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.dateFrom <= ${checkPosDepChange ? 'hp.dateTo' : ':dateTo:'}   
       and ep2.mi_deleteDate >= '9999-12-31' 
       order by ep2.dateFrom desc ${sqlDialect.limit}) 
      LEFT JOIN hr_employee e ON e.ID = en.employeeID
      LEFT JOIN hr_dictPosition dp on dp.ID = ep.dictPositionID 
      LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
      LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
      LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
      LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
      LEFT JOIN ubm_enum st on st.code = e.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
      LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
      LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
      WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
      AND acc.payElID${entityBaseService.getInExpression('payElIDs')}
      ${abFundSourceWhere} 
      ${periodWhere}
      AND (acc.flagsRec & 4096 = 0)
      AND en.mi_deleteDate >= '9999-12-31' 
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      ${deptClause} 
      ${hideTrfPosition ? ` AND COALESCE(ep.workPlace, '0') != '5' ` : ''}
      ${!showZeroPayElSumRows ? ' AND acc.paySum <>0' : ''}
      GROUP BY en.ID, en.employeeID, en.description, ep.ID, ep.positionID, ep.dictPositionID, ep.departmentID,en.tabNum,
        en.tabNumSort,e.fullFIO,dp.description, dsc.description ${showCalcPeriod ? ',hp.dateFrom, hp.name' : ''}, st.name,
         e.birthDate, en.dateFrom, en.dateTo, ep.mtCount, dsc.description, ws.name, ecb.description, 
         gla.description, wt.name, wp.name, ep.workPlace, en.orgID, ep.factPosition,
         ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value
      ORDER BY en.description`, {
      orgIDs,
      periodIds,
      periodFromDate: params.periodFrom,
      periodToDate: params.periodTo,
      deptIDs,
      dateTo: params.periodTo,
      dateFrom: params.periodFrom,
      departmentID: params.departmentID,
      payElIDs,
      dictFundSourceIDInList: params.dictFundSourceID
    })
  }
  emps = empNumberDS.getAsJsObject()
  emps.forEach(emp => {
    emp.periodCalc = dateService.shiftDate(emp.periodCalc)
    if (!showCalcPeriod && !emp.periodCalc) {
      emp.periodCalc = params.periodFrom
    }
    emp.periodCalcN = emp.periodCalc ? emp.periodCalc.getTime() : 0
    if (params.showSaldo) {
      const abEmp = empsAB.find(o => o.employeeNumberID === emp.employeeNumberID && o.periodCalcN === emp.periodCalcN)
      if (abEmp) {
        emp.sumFrom = abEmp.sumFrom
        emp.sumPlus = abEmp.sumPlus
        emp.sumMinus = abEmp.sumMinus
        emp.sumPay = abEmp.sumPay
        emp.sumTo = abEmp.sumTo
      }
    }
  })
  if (showZeroPayElSumRows && !params.showZeroSumRowsWithAcc) {
    empsAB.forEach(emp => {
      if (!emps.find(o => o.employeeNumberID === emp.employeeNumberID && o.periodCalcN === emp.periodCalcN &&
        o.positionID === emp.positionID && o.dictPositionID === emp.dictPositionID && o.departmentID === emp.departmentID)) {
        emps.push(emp)
      }
    })
  }
  const empsWithZero = []
  if (params.showZeroSumRows && !params.showZeroSumRowsWithAcc) {
    const periodList = UB.Repository('hr_dictPeriod')
      .attrs('ID', 'dateFrom', 'dateTo', 'name')
      .where('ID', 'in', periodIds)
      .selectAsObject()
    periodList.forEach(period => {
      const empNumIds = emps.filter(o => o.periodCalc.getTime() === dateService.shiftDate(period.dateFrom).getTime()).map(el => el.employeeNumberID).filter(Boolean)
      if (!empNumIds.length) empNumIds.push(0)
      empNumberDS.runSQL(`SELECT 
        en.ID as "employeeNumberID"
        ,en.employeeID as "employeeID"
        ,en.description as "enDescription"
        ,ep.ID as "employeePositionID"
        ,ep.positionID as "positionID"
        ,ep.dictPositionID as "dictPositionID"
        ,ep.departmentID as "departmentID"
        ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
            where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
        ,en.tabNum as "tabNum"
        ,en.tabNumSort as "tabNumSort"
        ,e.fullFIO as "fullFIO"
        ,dp.description as "positionName"
        ,dsc.description as "staffCatName"
        ,st.name as "sexType"
        ,e.birthDate as "birthDate"
        ,en.dateFrom as "startWork"
        ,en.dateTo as "endWork"
        ,ep.mtCount as "mtCount"
        ,ep.factPosition as "factPosition"
        ,dsc.description as "staffCatName"
        ,ws.name as "workSchedule"
        ,ecb.description as "dictCategoryECB"
        ,gla.description as "accountName"
        ,wt.name as "workerType"
        ,wp.name as "workPlace"        
        ,ep.workPlace as "workPlaceCode"
        ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
        ,en.orgID as "orgID"
        ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
        and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
        FROM hr_employeeNumber en   
          INNER JOIN  hr_employeePosition ep ON ep.employeeNumberID = en.ID 
          LEFT JOIN hr_employee e ON e.ID = en.employeeID
          LEFT JOIN hr_dictPosition dp on dp.ID = ep.dictPositionID 
          LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
          LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
          LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
          LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
          LEFT JOIN ubm_enum st on st.code = e.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
          LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
          LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
          AND en.ID ${entityBaseService.getNotInExpression('empNumIds')}
          AND ep.isActive = 1 AND ep.dateFrom <= :dateTo: AND ep.dateTo >= :dateFrom: AND ep.mi_deleteDate >= '9999-12-31' 
          AND en.mi_deleteDate >= '9999-12-31' 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${deptClause} 
        ${hideTrfPosition ? ` AND COALESCE(ep.workPlace, '0') != '5' ` : ''}
        ORDER BY en.description`, {
        orgIDs,
        empNumIds,
        deptIDs,
        dateTo: checkPosDepChange ? period.dateTo : params.periodTo,
        dateFrom: checkPosDepChange ? period.dateFrom : params.periodFrom,
        departmentID: params.departmentID
      })
      const empWithZeroInPeriod = empNumberDS.getAsJsObject()
      empWithZeroInPeriod.forEach(emp => {
        if (!empsWithZero.find(o => o.employeeNumberID === emp.employeeNumberID)) {
          emp.periodCalc = showCalcPeriod ? dateService.shiftDate(period.dateFrom) : null
          emp.sumFrom = 0
          emp.sumPlus = 0
          emp.sumMinus = 0
          emp.sumPay = 0
          emp.sumTo = 0
          emp.sumBalRes = 0
          emp.periodName = showCalcPeriod ? period.name : ''
          emp.periodSalaryID = null
          emp.periodSalaryName = ''
          emp.paySumPayEl = []
          empsWithZero.push(emp)
        }
      })
    })
    empsWithZero.forEach(emp => {
      if (!emps.find(o => o.employeeNumberID === emp.employeeNumberID)) {
        emps.push(emp)
      }
    })
  }
  let payElColumns = []
  const payElColumnsForTitle = []
  // 4-9
  if (emps && emps.length > 0) {
    let empNumbersIDs = emps.map(el => el.employeeNumberID).filter(Boolean)
    emps.forEach(emp => {
      emp.positionName = useActualPositionName ? emp.factPosition : emp.positionName
      emp.sumBalRes = currencyService.round(emp.sumFrom + emp.sumPlus - emp.sumMinus - emp.sumPay, 2)
      emp.isDep = params.departmentID ? { depName } : null
      emp.isNotDep = !params.groupReportByDep
      emp.isGroupDep = params.groupReportByDep
      emp.showSalaryPeriod = params.showSalaryPeriod
      emp.showCalcPeriod = params.showCalcPeriod
      emp.showSaldo = params.showSaldo
      emp.showOrgName = showOrgName
      emp.showColumnSexType = params.extraColumns.includes('sexType')
      emp.showColumnBirthDate = params.extraColumns.includes('birthDate')
      emp.showColumnDateFrom = params.extraColumns.includes('dateFrom')
      emp.showColumnDateTo = params.extraColumns.includes('dateTo')
      emp.showColumnWorkerType = params.extraColumns.includes('workerType')
      emp.showColumnWorkSchedule = params.extraColumns.includes('workScheduleID')
      emp.showColumnWorkPlace = params.extraColumns.includes('workPlace')
      emp.showColumnDictStaffCat = params.extraColumns.includes('dictStaffCatID')
      emp.showColumnMtCount = params.extraColumns.includes('mtCount')
      emp.showColumnDictCategoryECB = params.extraColumns.includes('dictCategoryECBID')
      emp.showColumnAccountID = params.extraColumns.includes('accountID')
      emp.showColumnDictCostType = params.extraColumns.includes('dictCostType')
      emp.birthDate = dateService.formatDate(emp.birthDate)
      emp.startWork = dateService.formatDate(emp.startWork)
      emp.endWork = dateService.isMaxDate(emp.endWork) ? '' : dateService.formatDate(emp.endWork)
      emp.mtCount = currencyService.formatAsCurrency(emp.mtCount)
      const org = orgNames.find(o => o.ID === emp.orgID)
      emp.orgName = org ? org.description : ''
      emp.workPlaceCode = emp.workPlaceCode === '2' ? '6' : emp.workPlaceCode
    })
    const joinEmpMap = {}
    if (joinEmpAccounts) {
      emps.sort((a, b) => {
        return a['orgID'] === b['orgID'] ? (a['employeeID'] === b['employeeID'] ? (a['workPlaceCode'] < b['workPlaceCode'] ? -1 : 1) : a['employeeID'] - b['employeeID']) : a['orgID'] - b['orgID']
      })
      const empsNew = []
      emps.forEach(item => {
        const idx = empsNew.findIndex(o => o.orgID === item.orgID && o.employeeID === item.employeeID && (showCalcPeriod ? o.periodCalc.getTime() === item.periodCalc.getTime() : true))
        if (idx >= 0) {
          const el = empsNew[idx]
          el.sumFrom += item.sumFrom || 0
          el.sumPlus += item.sumPlus || 0
          el.sumMinus += item.sumMinus || 0
          el.sumPay += item.sumPay || 0
          el.sumTo += item.sumTo || 0
          el.sumBalRes += item.sumBalRes || 0
          joinEmpMap[item.employeeNumberID] = el.employeeNumberID
        } else {
          empsNew.push(Object.assign({}, item))
        }
      })
      emps = empsNew
    }

    // 10
    let paySumPayEl = []
    let fieldList = []
    let groupByList = []
    if (!params.dictFundSourceID.length && !deptIDs) {
      fieldList = ['employeeNumberID', 'payElID', 'sum([paySum])']
      groupByList = ['employeeNumberID', 'payElID']
      if (showCalcPeriod) {
        fieldList = fieldList.concat(['periodCalcID', 'periodCalc'])
        groupByList = groupByList.concat(['periodCalcID', 'periodCalc'])
      }
      if (showSalaryPeriod) {
        fieldList = fieldList.concat(['periodSalaryID', 'periodSalary', 'periodSalaryID.name'])
        groupByList = groupByList.concat(['periodSalaryID', 'periodSalary', 'periodSalaryID.name'])
      }
      paySumPayEl = UB.Repository('hr_accrual')
        .attrs(fieldList)
        .where('employeeNumberID', 'in', empNumbersIDs)
        .where('periodCalcID', 'in', periodIds)
        .where('payElID', 'in', payElIDs)
        .where(`(flagsRec & 4096 = 0)`, 'custom')
        .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0)
        .groupBy(groupByList)
        .selectAsObject({
          'sum([paySum])': 'paySum',
          'periodSalaryID.name': 'periodSalaryName'
        })
    } else {
      fieldList = ['accrualID.employeeNumberID', 'accrualID.payElID', 'sum([paySum])']
      groupByList = ['accrualID.employeeNumberID', 'accrualID.payElID']
      if (showCalcPeriod) {
        fieldList = fieldList.concat(['accrualID.periodCalcID', 'accrualID.periodCalc'])
        groupByList = groupByList.concat(['accrualID.periodCalcID', 'accrualID.periodCalc'])
      }
      if (showSalaryPeriod) {
        fieldList = fieldList.concat(['accrualID.periodSalaryID', 'accrualID.periodSalary', 'accrualID.periodSalaryID.name'])
        groupByList = groupByList.concat(['accrualID.periodSalaryID', 'accrualID.periodSalary', 'accrualID.periodSalaryID.name'])
      }
      paySumPayEl = UB.Repository('hr_accrualDt')
        .attrs(fieldList)
        .where('accrualID.employeeNumberID', 'in', empNumbersIDs)
        .where('accrualID.periodCalcID', 'in', periodIds)
        .where('accrualID.payElID', 'in', payElIDs)
        .where(`([accrualID.flagsRec] & 4096 = 0)`, 'custom')
        .whereIf(limitedAccess, 'accrualID.employeeNumberID.limitedAccess', '=', 0)
        .groupBy(groupByList)
        .whereIf(deptIDs && deptIDs.length, 'departmentID', 'in', deptIDs)

      if (params.dictFundSourceID.length && !isIncludeEmptyFundSource) {
        paySumPayEl.where('dictFundSourceID', 'in', params.dictFundSourceID)
      } else if (params.dictFundSourceID.length && isIncludeEmptyFundSource) {
        paySumPayEl
          .where('dictFundSourceID', 'in', params.dictFundSourceID, 'dictFundSourceIDInList')
          .where('dictFundSourceID', 'isNull', undefined, 'dictFundSourceIDIsNull')
          .logic('(([dictFundSourceIDIsNull]) OR ([dictFundSourceIDInList]))')
      } else if (params.dictFundSourceID.length === 1 && isIncludeEmptyFundSource) {
        paySumPayEl.where('dictFundSourceID', 'isNull')
      }
      paySumPayEl = paySumPayEl.selectAsObject({
        'sum([paySum])': 'paySum',
        'accrualID.employeeNumberID': 'employeeNumberID',
        'accrualID.payElID': 'payElID',
        'accrualID.periodSalaryID.name': 'periodSalaryName',
        'accrualID.periodSalaryID': 'periodSalaryID',
        'accrualID.periodCalcID': 'periodCalcID',
        'accrualID.periodSalary': 'periodSalary',
        'accrualID.periodCalc': 'periodCalc'
      })
    }
    paySumPayEl.forEach(o => {
      if (o.periodSalary) o.periodSalary = dateService.shiftDate(o.periodSalary)
      if (o.periodCalc) o.periodCalc = dateService.shiftDate(o.periodCalc)
      if (joinEmpAccounts && joinEmpMap[o.employeeNumberID]) {
        o.employeeNumberID = joinEmpMap[o.employeeNumberID]
      }
    })
    // get payElColumns
    payEls.forEach(pl => {
      if (paySumPayEl.find(ps => ps.payElID === pl.payElID)) {
        payElColumns.push(pl)
        payElColumnsForTitle.push({ name: '' })
      }
    })
    // showOnlyZeroPayElSumRows
    // fill for each emp.paySumPayEl
    if (payElColumns.length > 0) {
      const newEmpList = []
      emps.forEach(emp => {
        const paySumPayElEmp = paySumPayEl.filter(ps => ps.employeeNumberID === emp.employeeNumberID)
        if (showSalaryPeriod) {
          emp.paySumPayEl = []
          emp.periodSalaryName = ''
          emp.periodSalaryID = null
          payElColumns.forEach(() => {
            emp.paySumPayEl.push({ sum: null })
          })
          const empSalaryPeriods = []
          paySumPayElEmp.filter(ps => (showCalcPeriod ? ps.periodCalc.getTime() === emp.periodCalc.getTime() : true))
            .forEach(el => {
              periodIds.push(el.periodSalaryID)
              if (!empSalaryPeriods.find(o => o.periodSalary.getTime() === el.periodSalary.getTime())) {
                empSalaryPeriods.push({
                  periodSalaryID: el.periodSalaryID,
                  periodSalary: el.periodSalary,
                  periodSalaryName: el.periodSalaryName
                })
              }
            })
          empSalaryPeriods.forEach(periodSalary => {
            if (emp.periodCalc.getTime() === periodSalary.periodSalary.getTime()) {
              emp.paySumPayEl = []
              emp.periodSalaryName = periodSalary.periodSalaryName
              emp.periodSalaryID = periodSalary.periodSalaryID
              payElColumns.forEach((plColumn, ind) => {
                emp.paySumPayEl.push({ sum: null })
                const payElEmp = paySumPayElEmp.filter(ps => ps.payElID === plColumn.payElID && ps.periodSalary.getTime() === periodSalary.periodSalary.getTime() && (!showCalcPeriod || ps.periodCalc.getTime() === emp.periodCalc.getTime()))
                let empPaySumPay = payElEmp.reduce((sum, o) => sum + o.paySum, 0)
                emp.paySumPayEl[ind].sum = payElEmp.length ? currencyService.round(empPaySumPay || 0, 2) : null
              })
            } else {
              const newEmp = Object.assign({}, emp)
              newEmp.sumBalRes = 0
              newEmp.sumFrom = 0
              newEmp.sumPlus = 0
              newEmp.sumMinus = 0
              newEmp.sumPay = 0
              newEmp.sumTo = 0
              newEmp.paySumPayEl = []
              newEmp.periodSalaryName = periodSalary.periodSalaryName
              newEmp.periodSalaryID = periodSalary.periodSalaryID
              payElColumns.forEach((plColumn, ind) => {
                newEmp.paySumPayEl.push({ sum: null })
                const payElEmp = paySumPayElEmp.filter(ps => ps.payElID === plColumn.payElID && ps.periodSalary.getTime() === periodSalary.periodSalary.getTime() && (!showCalcPeriod || ps.periodCalc.getTime() === emp.periodCalc.getTime()))
                let empPaySumPay = payElEmp.reduce((sum, o) => sum + o.paySum, 0)
                newEmp.paySumPayEl[ind].sum = payElEmp.length ? currencyService.round(empPaySumPay || 0, 2) : null
              })
              newEmpList.push(newEmp)
            }
          })
        } else {
          emp.paySumPayEl = []
          emp.periodSalaryName = ''
          payElColumns.forEach((plColumn, ind) => {
            emp.paySumPayEl.push({ sum: null })
            const payElEmp = paySumPayElEmp.filter(ps => ps.payElID === plColumn.payElID && (!showCalcPeriod || ps.periodCalc.getTime() === emp.periodCalc.getTime()))
            let empPaySumPay = payElEmp.reduce((sum, o) => sum + o.paySum, 0)
            emp.paySumPayEl[ind].sum = payElEmp.length ? currencyService.round(empPaySumPay || 0, 2) : null
          })
        }
      })
      newEmpList.forEach(newEmp => {
        emps.push(newEmp)
      })
    }
    emps.forEach(emp => {
      const periodCalc = periodList.find(o => o.ID === emp.periodCalcID)
      emp.periodCalcSort = showCalcPeriod && periodCalc ? dateService.shiftDate(periodCalc.dateFrom).getTime() : 0
      const periodSalary = periodList.find(o => o.ID === emp.periodSalaryID)
      emp.periodSalarySort = showSalaryPeriod && periodSalary ? dateService.shiftDate(periodSalary.dateFrom).getTime() : 0
      if (!params.groupReportByDep) emp.posIdxNum = 0
      emp.isExclude = showZeroPayElSumRows || !emp.paySumPayEl ? false : emp.paySumPayEl.every(o => !o.sum)
    })
  }

  if (!showZeroPayElSumRows) {
    emps = emps.filter(o => !o.isExclude)
  }

  if (showOnlyZeroPayElSumRows) {
    emps = emps.filter(emp => emp.paySumPayEl && emp.paySumPayEl.every(o => !o.sum))
  }

  let fixedColumns = 4 + (params.showSaldo ? 5 : 0) + (params.groupReportByDep ? 0 : 1) + (showSalaryPeriod ? 1 : 0) + (showCalcPeriod ? 1 : 0) + params.extraColumns.length
  let fixedColumnsWidth = 30 + 220 + (params.showSaldo ? 80 * 5 : 0) + 125 + 125 + (params.groupReportByDep ? 0 : 125) + (showCalcPeriod ? 120 : 0) + (showSalaryPeriod ? 120 : 0) + (125 * params.extraColumns.length)
  let payElColumnCount = payElColumns.length
  let allColumnCount = fixedColumns + payElColumnCount
  let floatColumnCount = allColumnCount - 2
  let sheetSize = fixedColumnsWidth + 80 * payElColumnCount

  function orgTreeDataToReport (curNode, depts, isGroupDep, orgID) {
    if (curNode.isNotEmpty) {
      const depart = {
        emps: curNode.emps,
        isGroupDep: isGroupDep,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = isGroupDep ? { colCount: allColumnCount, deptName: curNode.name } : null
      }

      depts.push(depart)
    }
    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, isGroupDep, orgID)
    })

    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      const depart = {
        emps: [],
        isGroupDep: isGroupDep,
        showSalaryPeriod,
        showCalcPeriod,
        showSaldo: params.showSaldo,
        showOrgName,
        showColumnSexType: params.extraColumns.includes('sexType'),
        showColumnBirthDate: params.extraColumns.includes('birthDate'),
        showColumnDateFrom: params.extraColumns.includes('dateFrom'),
        showColumnDateTo: params.extraColumns.includes('dateTo'),
        showColumnWorkerType: params.extraColumns.includes('workerType'),
        showColumnWorkSchedule: params.extraColumns.includes('workScheduleID'),
        showColumnWorkPlace: params.extraColumns.includes('workPlace'),
        showColumnDictStaffCat: params.extraColumns.includes('dictStaffCatID'),
        showColumnMtCount: params.extraColumns.includes('mtCount'),
        showColumnDictCategoryECB: params.extraColumns.includes('dictCategoryECBID'),
        showColumnAccountID: params.extraColumns.includes('accountID'),
        showColumnDictCostType: params.extraColumns.includes('dictCostType'),
        depSum: { title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
      }

      if (params.showSaldo) {
        depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.sumFrom })
        depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.sumPlus })
        depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.sumMinus })
        depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.sumPay })
        depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.sumBalRes })
      }

      curNode.calcSum.payElSum.forEach(s => {
        depart.depSum.dsum.push({ sum: s.sum })
      })
      depts.push(depart)
    }
  }

  function orgTreeCalcDepSum (curNode, payElCount = 0) {
    curNode.calcSum = {
      allSum: { sumFrom: 0, sumPlus: 0, sumMinus: 0, sumPay: 0, sumBalRes: 0 },
      payElSum: []
    }
    for (let i = 0; i < payElCount; i++) curNode.calcSum.payElSum.push({ sum: 0 })

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.sumFrom = currencyService.round(curNode.calcSum.allSum.sumFrom + (el.sumFrom || 0), 2)
          curNode.calcSum.allSum.sumPlus = currencyService.round(curNode.calcSum.allSum.sumPlus + (el.sumPlus || 0), 2)
          curNode.calcSum.allSum.sumMinus = currencyService.round(curNode.calcSum.allSum.sumMinus + (el.sumMinus || 0), 2)
          curNode.calcSum.allSum.sumPay = currencyService.round(curNode.calcSum.allSum.sumPay + (el.sumPay || 0), 2)
          curNode.calcSum.allSum.sumBalRes = currencyService.round(curNode.calcSum.allSum.sumBalRes + (el.sumBalRes) || 0, 2)
          curNode.calcSum.payElSum.forEach((pe, ind) => {
            pe.sum = currencyService.round(pe.sum + (el.paySumPayEl[ind].sum || 0), 2)
          })
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur, payElCount)
        curNode.calcSum.allSum.sumFrom = currencyService.round(curNode.calcSum.allSum.sumFrom + (cur.calcSum.allSum.sumFrom || 0), 2)
        curNode.calcSum.allSum.sumPlus = currencyService.round(curNode.calcSum.allSum.sumPlus + (cur.calcSum.allSum.sumPlus || 0), 2)
        curNode.calcSum.allSum.sumMinus = currencyService.round(curNode.calcSum.allSum.sumMinus + (cur.calcSum.allSum.sumMinus || 0), 2)
        curNode.calcSum.allSum.sumPay = currencyService.round(curNode.calcSum.allSum.sumPay + (cur.calcSum.allSum.sumPay || 0), 2)
        curNode.calcSum.allSum.sumBalRes = currencyService.round(curNode.calcSum.allSum.sumBalRes + (cur.calcSum.allSum.sumBalRes || 0), 2)
        curNode.calcSum.payElSum.forEach((pe, ind) => {
          pe.sum = currencyService.round(pe.sum + (cur.calcSum.payElSum[ind].sum || 0))
        })
      })
    }
  }

  function compareEmps (a, b) {
    return a.posIdxNum === b.posIdxNum
      ? (a['fullFIO'] === b['fullFIO']
        ? (a.tabNumSort === b.tabNumSort
          ? (a['periodCalcSort'] === b['periodCalcSort'] ? a['periodSalarySort'] - b['periodSalarySort'] : a['periodCalcSort'] - b['periodCalcSort'])
          : a.tabNumSort - b.tabNumSort)
        : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
      : a.posIdxNum - b.posIdxNum
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')

  let allSum = {}
  const depts = []

  if (params.groupReportByDep) {
    orgNames.forEach(org => {
      if (params.organizationID && params.includeSubOrg) {
        depts.push({
          emps: [],
          isGroupDep: true,
          isOrg: true,
          dept: { colCount: allColumnCount, deptName: org.description }
        })
      }
      staffUnitStore.runSQL(`  SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.fullName as "fullName", 
     u.mi_unityEntity as "mi_unityEntity", dep.description as "depdescription", u.idxNum
      FROM hr_staffUnit u 
        LEFT JOIN hr_department dep ON dep.ID = u.ID      
      WHERE
        u.orgID = :orgID:
        and u.mi_deleteDate >= '9999-12-31' 
        and u.state = 'ACTIVE' 
        and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = u.orgID 
        and u2.mi_data_id = u.mi_data_id 
        and u2.mi_deleteDate >= '9999-12-31' 
        and u2.state = 'ACTIVE' 
        order by u2.mi_dateFrom desc ${sqlDialect.limit})    
      ORDER BY u.treePath   
    `, {
        orgID: org.ID,
        dateTo: params.periodTo
      })
      const orgStruct = staffUnitStore.getAsJsObject()
      const orgTree = treeUtils.orgTree(org.ID, emps.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)
      orgTreeCalcDepSum(orgTree[0], payElColumnCount)
      orgTreeDataToReport(orgTree[0], depts, params.groupReportByDep, org.ID)
      allSum = {}
      depts.forEach(dep => {
        dep.emps.sort(compareEmps)
      })
    })
  } else {
    emps.sort(compareEmps)
    const depart = {
      emps,
      isGroupDep: false
    }
    depts.push(depart)
  }
  if (orgIDs.length > 1 || !params.groupReportByDep) {
    const calcSum = {
      allSum: { sumFrom: 0, sumPlus: 0, sumMinus: 0, sumPay: 0, sumBalRes: 0 },
      payElSum: []
    }
    for (let i = 0; i < payElColumnCount; i++) calcSum.payElSum.push({ sum: 0 })

    emps.forEach(emp => {
      calcSum.allSum.sumFrom = currencyService.round((emp.sumFrom || 0) + (calcSum.allSum.sumFrom || 0), 2)
      calcSum.allSum.sumPlus = currencyService.round((emp.sumPlus || 0) + (calcSum.allSum.sumPlus || 0), 2)
      calcSum.allSum.sumMinus = currencyService.round((emp.sumMinus || 0) + (calcSum.allSum.sumMinus || 0), 2)
      calcSum.allSum.sumPay = currencyService.round((emp.sumPay || 0) + (calcSum.allSum.sumPay || 0), 2)
      calcSum.allSum.sumBalRes = currencyService.round((emp.sumBalRes || 0) + (calcSum.allSum.sumBalRes || 0), 2)
      calcSum.payElSum.forEach((pe, ind) => {
        pe.sum = currencyService.round(pe.sum + (emp.paySumPayEl[ind].sum || 0), 2)
      })
    })
    allSum = { title: `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
    if (params.showSaldo) {
      allSum.dsum.push({ sum: calcSum.allSum.sumFrom })
      allSum.dsum.push({ sum: calcSum.allSum.sumPlus })
      allSum.dsum.push({ sum: calcSum.allSum.sumMinus })
      allSum.dsum.push({ sum: calcSum.allSum.sumPay })
      allSum.dsum.push({ sum: calcSum.allSum.sumBalRes })
    }
    calcSum.payElSum.forEach(s => {
      allSum.dsum.push({ sum: s.sum })
    })
  }
  const isFundSource = !!params.dictFundSourceID.length
  const fundSourceDescriptionList = UB.Repository('ac_fundSource')
    .attrs(['name'])
    .where('ID', 'in', params.dictFundSourceID)
    .selectAsArrayOfValues()
  let fundSourceTitle, fundSourceDescription
  if (params.dictFundSourceID.length > 1 && isIncludeEmptyFundSource) {
    fundSourceTitle = 'Джерела фінансування:'
    fundSourceDescription = fundSourceDescriptionList.join(', ') + ', та з пустим джерелом фінансування'
  } else if (params.dictFundSourceID.length === 1 && isIncludeEmptyFundSource) {
    fundSourceTitle = ''
    fundSourceDescription = 'З пустим джерелом фінансування'
  } else if (params.dictFundSourceID.length && !isIncludeEmptyFundSource) {
    fundSourceTitle = 'Джерела фінансування:'
    fundSourceDescription = fundSourceDescriptionList.join(', ')
  }
  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  let fixedColCount = 4
  if (showCalcPeriod) {
    fixedColCount++
  }
  if (showSalaryPeriod) {
    fixedColCount++
  }
  let positionColCount = 1 // 2 + (!params.groupReportByDep ? 1 : 0) + params.extraColumns.length
  floatColumnCount -= positionColCount
  if (floatColumnCount < 4) {
    floatColumnCount = allColumnCount - 2
    positionColCount = 0
  }
  staffUnitStore.freeNative()

  return {
    orgName: hrOrg.name,
    periodName,
    depts,
    payElColumns,
    allColumnCount,
    floatColumnCount,
    positionColCount,
    fixedColCount,
    sheetSize,
    isFundSource,
    fundSourceDescription,
    fundSourceTitle,
    showSalaryPeriod,
    showCalcPeriod,
    showOrgName,
    showSaldo: params.showSaldo,
    blocksNum: payElColumnCount ? { payElColumnCount } : null,
    isDep: params.departmentID ? { depName } : null,
    isNotDep: !params.groupReportByDep,
    isGroupDep: params.groupReportByDep,
    showOnlyAllSum: !params.groupReportByDep || orgIDs.length > 1,
    showColumnSexType: params.extraColumns.includes('sexType'),
    showColumnBirthDate: params.extraColumns.includes('birthDate'),
    showColumnDateFrom: params.extraColumns.includes('dateFrom'),
    showColumnDateTo: params.extraColumns.includes('dateTo'),
    showColumnWorkerType: params.extraColumns.includes('workerType'),
    showColumnWorkSchedule: params.extraColumns.includes('workScheduleID'),
    showColumnWorkPlace: params.extraColumns.includes('workPlace'),
    showColumnDictStaffCat: params.extraColumns.includes('dictStaffCatID'),
    showColumnMtCount: params.extraColumns.includes('mtCount'),
    showColumnDictCategoryECB: params.extraColumns.includes('dictCategoryECBID'),
    showColumnAccountID: params.extraColumns.includes('accountID'),
    showColumnDictCostType: params.extraColumns.includes('dictCostType'),
    allSum,
    payElColumnsForTitle
  }
}

function getIncTaxData (params) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)

  let periodDateTo = dateService.shiftDate(params.periodTo)
  let periodDateFrom = dateService.shiftDate(params.periodFrom)

  let deptName
  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)
  let orgIDs = []
  if (params.organizationID) {
    orgIDs = [params.organizationID]
    if (params.includeSubOrg) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [params.orgID]
  }

  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodDateTo })
      .selectSingle()
    deptName = dept.description || dept.fullName
  }
  let departmentName = deptName || ''

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':periodDateTo:')

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'dateFrom', 'dateTo')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsObject()
  const periodIds = periodList.map(el => el.ID)
  const periodListForCacl = params.departmentID && params.checkPosDepChange
    ? periodList
    : [{ IDs: periodIds, dateFrom: params.periodFrom, dateTo: params.periodTo }]

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  const accrualFundDtDS = UB.DataStore('hr_accrualFundDt')
  const accrual = []
  const payCalcSummarySheet = []
  const allRates = []

  periodListForCacl.forEach(periodItem => {
    accrualFundDtDS.runSQL(`
      select pe.description as "description", pe.code,
      sum(adt.sourceSum) as "paySum",
      sum(adt.baseSum) as "sumOnESV",
      sum(adt.paySum) as "sumESV",
      a.rate as "rate", adt.payElID as "payElID",
      f.isRecSum as "isRecSum" 
      FROM hr_employeeNumber en
      JOIN hr_accrualFund a on a.employeeNumberID = en.ID 
      JOIN hr_payFund f on f.ID = a.payFundID    
      JOIN hr_accrualFundDt adt on adt.accrualFundID = a.ID  
      left join hr_payEl pe on pe.ID = adt.payElID
      ${params.departmentID ? `JOIN  hr_employeePosition ep ON ep.isActive = 1 and
           ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
           ep2.employeeNumberID = en.ID 
           and ep2.isActive = 1
           and ep2.dateFrom <= :periodDateTo:  
           and ep2.dateTo >= :periodDateFrom:
           and ep2.mi_deleteDate >= '9999-12-31' 
            ${deptClause} 
           order by ep2.dateFrom desc ${sqlDialect.limit})` : ''}
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')} 
        and a.periodCalcID ${entityBaseService.getInExpression('periodIDs')}  
        and en.mi_deleteDate >= '9999-12-31'
        and en.empWorkPlace is null
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      group by a.rate, adt.payElID, pe.code, pe.description, f.isRecSum
      HAVING sum(a.sourceSum) <> 0 OR sum(a.baseSum) <> 0 OR sum(a.paySum) <> 0
      order by pe.code`, {
      orgIDs,
      periodIDs: periodItem.ID ? [periodItem.ID] : periodItem.IDs,
      periodDateTo: periodItem.dateTo,
      periodDateFrom: periodItem.dateFrom,
      departmentID: params.departmentID
    })
    const accrualPeriod = accrualFundDtDS.getAsJsObject()
    accrualPeriod.forEach(accr => {
      if (!accr.description) {
        accr.description = 'Не визначен вид оплати в імпортованих даних'
      }
    })
    accrual.push(...accrualPeriod)

    accrualFundDtDS.runSQL(`SELECT a.payElID as "payElID", pe.code, pe.description, sum(a.paySum) as "accrued"  
      FROM hr_accrual a  
      JOIN hr_payEl pe ON pe.ID = a.payElID  
      JOIN hr_method m ON m.ID = pe.methodID  
      JOIN hr_methodGroup mg ON mg.ID = m.methodGroupID  
      JOIN hr_employeeNumber en on en.ID = a.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
      ${params.departmentID ? `JOIN  hr_employeePosition ep ON ep.isActive = 1 and
           ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
           ep2.employeeNumberID = en.ID 
           and ep2.isActive = 1
           and ep2.dateFrom <= :periodDateTo:  
           and ep2.dateTo >= :periodDateFrom:
           and ep2.mi_deleteDate >= '9999-12-31' 
           ${deptClause} 
           order by ep2.dateFrom desc ${sqlDialect.limit})` : ''} 
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      WHERE a.orgID ${entityBaseService.getInExpression('orgIDs')}  
      AND a.periodCalcID ${entityBaseService.getInExpression('periodIDs')}   
      AND mg.groupType = :groupType: and (a.flagsRec & 8192 = 0)
      AND en.empWorkPlace is null 
      group by a.payElID, pe.code, pe.description
      HAVING sum(a.paySum) <> 0  `, {
      orgIDs,
      periodIDs: periodItem.ID ? [periodItem.ID] : periodItem.IDs,
      periodDateTo: periodItem.dateTo,
      periodDateFrom: periodItem.dateFrom,
      groupType: 'PAYMENT',
      departmentID: params.departmentID
    })
    const payCalcSummarySheetPeriod = accrualFundDtDS.getAsJsObject()
    payCalcSummarySheetPeriod.forEach(row => {
      const item = payCalcSummarySheet.find(el => el.payElID === row.payElID)
      if (item) {
        item.accrued += row.accrued
      } else {
        payCalcSummarySheet.push(row)
      }
    })
  })

  payCalcSummarySheet.forEach(row => {
    const acc = accrual.find(o => o.payElID === row.payElID)
    if (acc) {
      acc.accrued = row.accrued
    } else {
      accrual.push(row)
    }
  })

  _.compact(_.uniq(accrual.map(el => el.rate))).forEach(value => {
    allRates.push({ rate: value })
  })

  return {
    accrual: accrual.sort((a, b) => (Number(String(a.code || '99999').replace(/[^\d-]/g, '') || 0) < Number(String(b.code || '9999').replace(/[^\d-]/g, '') || 0))
      ? -1 : (Number(String(a.code || '99999').replace(/[^\d-]/g, '') || 0) > Number(String(b.code || '99999').replace(/[^\d-]/g, '') || 0)) ? 1 : 0),
    departmentName: departmentName ? `${departmentName} ${params.includeSubDep ? '(з підлеглими)' : ''} ` : '',
    period: periodName,
    allRates,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `
  }
}

function getConsolCategData (params) {
  let periodFrom = dateService.shiftDate(params.objPeriodFromDateFrom)
  let periodTo = dateService.shiftDate(params.objPeriodToDateTo)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const dictFundSource = params.dictFundSourceID && params.dictFundSourceID !== '' ? params.dictFundSourceID : []
  params.isIncludeEmpty = dictFundSource.includes(0)
  const sqlDialect = entityBaseService.getSQLDialect()
  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  let strPeriodName
  if (periodFrom.getFullYear() === periodTo.getFullYear() &&
    periodFrom.getMonth() === 0 && periodTo.getMonth() === 11) {
    strPeriodName = UB.i18n(` {0} рік`, periodFrom.getFullYear())
  } else if (params.objPeriodFromID === params.objPeriodToID) {
    strPeriodName = UB.Repository('hr_dictPeriod').attrs('name')
      .where('ID', '=', params.objPeriodFromID)
      .selectScalar() + ' року'
  } else {
    const period = UB.Repository('hr_dictPeriod').attrs('ID', 'name')
      .where('ID', 'in', [params.objPeriodFromID, params.objPeriodToID])
      .selectAsObject()
    strPeriodName = UB.i18n(` {0} року по {1} року`, period.find(p => p.ID === params.objPeriodFromID).name, period.find(p => p.ID === params.objPeriodToID).name)
  }

  let depName
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName
    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
    }
  }

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')

  let totalPaymentSum = 0
  let totalOfftakeSum = 0
  let totalForpaySum = 0
  let totalAccrualFundSum = 0
  let totalPayOffSum = 0
  let totalAccrualFundOffSum = 0

  let accrualFund
  let payment
  let offtake
  let forpay
  let accrualFundOff
  let payOff
  let totalPaymentSCSum
  let totalOfftakeSCSum
  let totalForpaySCSum
  let totalAccFundSCSum
  let totalPayOffSCSum
  let totalAccFundOffSCSum

  let fundSourceDescription
  let fundSourceTitle

  function getAccData (accData, totalStaffCatSum, dictStaffCatIDs) {
    let res = []
    dictStaffCatIDs.forEach(scID => totalStaffCatSum.push({ paySum: 0 }))

    let curObj
    accData.forEach(obj => {
      if (!res.find(o => o.payElID === obj.payElID)) {
        curObj = Object.assign({}, obj)
        let objsOfPayElID = accData.filter(el => el.payElID === obj.payElID)
        curObj.staffCatSum = []
        dictStaffCatIDs.forEach((scID, ind) => {
          let accObjStaffCat = objsOfPayElID.find(el => el.dictStaffCatID === scID)
          let accObjPaySum = accObjStaffCat ? currencyService.round(accObjStaffCat.paySum, 2) : 0
          curObj.staffCatSum.push({ paySum: accObjPaySum })
          totalStaffCatSum[ind].paySum = currencyService.round(totalStaffCatSum[ind].paySum + accObjPaySum, 2)
        })
        curObj.paySum = accData.filter(el => el.payElID === obj.payElID).reduce((sum, curValue) => sum + curValue.paySum, 0)
        res.push(curObj)
      }
    })
    return res
  }
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  let staffCategories = UB.Repository('hr_idParam')
    .attrs('dictStaffCatID', 'dictStaffCatID.name')
    .where('listParamID.code', '=', 'ReportRstStaffCat')
    .where('orgID', '=', Number(parentOrdID || params.orgID))
    .orderBy('orderN')
    .selectAsObject({
      'dictStaffCatID.name': 'name'
    })

  if (staffCategories && staffCategories.length > 0) {
    let dictStaffCatIDs = staffCategories.map(el => el.dictStaffCatID)

    const fundSourceDescriptionList = dictFundSource.length ? UB.Repository('ac_fundSource')
      .attrs(['name'])
      .where('ID', 'in', dictFundSource)
      .selectAsArrayOfValues() : []
    let fundSourceWhere = ''
    if (!dictFundSource.length && params.isIncludeEmpty) {
      fundSourceWhere = 'AND dt.dictFundSourceID IS NULL'
      fundSourceTitle = ''
      fundSourceDescription = 'З пустим джерелом фінансування'
    } else if (dictFundSource.length && params.isIncludeEmpty) {
      fundSourceWhere = `AND (dt.dictFundSourceID IS NULL OR dt.dictFundSourceID in (${dictFundSource.join(',')}))`
      fundSourceTitle = 'Джерела фінансування:'
      fundSourceDescription = `${fundSourceDescriptionList.join(', ')}, та з пустим джерелом фінансування`
    } else if (dictFundSource.length && !params.isIncludeEmpty) {
      fundSourceWhere = `AND dt.dictFundSourceID in (${dictFundSource.join(',')})`
      fundSourceTitle = 'Джерела фінансування:'
      fundSourceDescription = fundSourceDescriptionList.join(', ')
    }
    // 4-6 payment, 7-9 offtake, 10-12  forpay
    const accrualDS = UB.DataStore('hr_accrual')
    const accrualDS2 = UB.DataStore('hr_accrual')

    for (let i = 1; i <= 2; i++) {
      if (!dictFundSource.length && !params.isIncludeEmpty) {
        const sqlText = `SELECT acc.payElID as "payElID", sum(acc.paySum) AS "paySum",
          pf.name as "payName", pf.code as "payCode", pf.codeSort, methGr.groupType as "methGrType", ep.dictStaffCatID as "dictStaffCatID" 
        FROM hr_accrual acc
          INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
          INNER JOIN hr_payEl pf ON pf.ID = acc.payElID 
          INNER JOIN hr_method meth on pf.methodID = meth.ID 
          INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID
          INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = acc.periodCalcID  
          INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and 
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= :dateTo:   
         and ep2.mi_deleteDate >= '9999-12-31' 
         order by ep2.dateFrom desc ${sqlDialect.limit}) 
        WHERE en.orgID = :orgID: 
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
        AND (methGr.groupType = 'PAYMENT' or methGr.groupType = 'OFFTAKE' or methGr.groupType = 'FORPAY')
        ${i === 1 ? 'AND acc.flagsRec & 8192 != 8192' : 'AND acc.flagsRec & 8192 = 8192 AND acc.flagsRec & 4096 != 4096'}  
        AND ep.dictStaffCatID in (${dictStaffCatIDs}) 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${deptClause}  
        GROUP BY acc.payElID, pf.name, pf.code, methGr.groupType, ep.dictStaffCatID, pf.codeSort
        ORDER BY pf.codeSort`

        if (i === 1) {
          accrualDS.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        } else {
          accrualDS2.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        }
      } else {
        const sqlText = `SELECT acc.payElID as "payElID", sum(dt.paySum) AS "paySum",
          pf.name as "payName", pf.code as "payCode", pf.codeSort, methGr.groupType as "methGrType", ep.dictStaffCatID as "dictStaffCatID" 
        FROM hr_accrual acc
          INNER JOIN hr_accrualDt dt ON acc.ID = dt.accrualID
          INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
          INNER JOIN hr_payEl pf ON pf.ID = acc.payElID 
          INNER JOIN hr_method meth on pf.methodID = meth.ID 
          INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID
          INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = acc.periodCalcID  
          INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and 
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= :dateTo:   
         and ep2.mi_deleteDate >= '9999-12-31' 
         order by ep2.dateFrom desc ${sqlDialect.limit}) 
        WHERE en.orgID = :orgID: 
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
        AND (methGr.groupType = 'PAYMENT' or methGr.groupType = 'OFFTAKE' or methGr.groupType = 'FORPAY')
        ${i === 1 ? 'AND acc.flagsRec & 8192 != 8192' : 'AND acc.flagsRec & 8192 = 8192 AND acc.flagsRec & 4096 != 4096'}  
        AND ep.dictStaffCatID in (${dictStaffCatIDs}) 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${deptClause} 
        ${fundSourceWhere} 
        GROUP BY acc.payElID, pf.name, pf.code, methGr.groupType, ep.dictStaffCatID, pf.codeSort
        ORDER BY pf.codeSort`
        if (i === 1) {
          accrualDS.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        } else {
          accrualDS2.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        }
      }
    }
    const accruals = accrualDS.getAsJsObject()
    const accruals2 = accrualDS2.getAsJsObject()

    const paymentData = accruals.filter(el => el.methGrType === 'PAYMENT')
    totalPaymentSum = paymentData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum = curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
    totalPaymentSCSum = []
    payment = getAccData(paymentData, totalPaymentSCSum, dictStaffCatIDs)

    const offtakeData = accruals.filter(el => el.methGrType === 'OFFTAKE')
    totalOfftakeSum = offtakeData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum = curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
    totalOfftakeSCSum = []
    offtake = getAccData(offtakeData, totalOfftakeSCSum, dictStaffCatIDs)

    const forpayData = accruals.filter(el => el.methGrType === 'FORPAY')
    totalForpaySum = forpayData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum = curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
    totalForpaySCSum = []
    forpay = getAccData(forpayData, totalForpaySCSum, dictStaffCatIDs)

    // 13-15
    totalPayOffSum = accruals2.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum = curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
    totalPayOffSCSum = []
    payOff = getAccData(accruals2, totalPayOffSCSum, dictStaffCatIDs)

    // 16-18, 19-21
    const accrualFundDS = UB.DataStore('hr_accrualFund')
    const accrualFundDS2 = UB.DataStore('hr_accrualFund')

    for (let i = 1; i <= 2; i++) {
      if (!dictFundSource.length && !params.isIncludeEmpty) {
        const sqlText = `SELECT af.payFundID as "payElID", SUM(ROUND(af.paySum,2)) AS "paySum",
          pf.name as "payName", pf.codeSort, pf.code as "payCode", ep.dictStaffCatID as "dictStaffCatID" 
        FROM hr_accrualFund af
          INNER JOIN hr_employeeNumber en ON en.ID = af.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
          INNER JOIN hr_payFund pf ON pf.ID = af.payFundID and pf.mi_deleteDate >= '9999-12-31' 
          INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = af.periodCalcID  
          INNER JOIN  hr_employeePosition ep ON ep.isActive = 1 and 
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= :dateTo:   
         and ep2.mi_deleteDate >= '9999-12-31' 
         order by ep2.dateFrom desc ${sqlDialect.limit})  
        WHERE en.orgID = :orgID: 
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom:
        ${i === 1 ? 'AND pf.isRecSum != 1' : 'AND pf.isRecSum = 1'} 
        AND ep.dictStaffCatID in (${dictStaffCatIDs}) 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${deptClause} 
        GROUP BY af.payFundID, pf.name, pf.code, ep.dictStaffCatID, pf.codeSort
        ORDER BY pf.codeSort`
        if (i === 1) {
          accrualFundDS.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        } else {
          accrualFundDS2.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        }
      } else {
        const sqlText = `SELECT af.payFundID as "payElID", SUM(ROUND(dt.paySum,2)) AS "paySum",
          pf.name as "payName", pf.codeSort, pf.code as "payCode", ep.dictStaffCatID as "dictStaffCatID" 
        FROM hr_accrualFund af
          INNER JOIN hr_accrualFundDt dt ON dt.accrualFundID = af.ID
          INNER JOIN hr_employeeNumber en ON en.ID = af.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
          INNER JOIN hr_payFund pf ON pf.ID = af.payFundID and pf.mi_deleteDate >= '9999-12-31' 
          INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = af.periodCalcID  
          INNER JOIN  hr_employeePosition ep ON ep.isActive = 1 and 
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= :dateTo:   
         and ep2.mi_deleteDate >= '9999-12-31' 
         order by ep2.dateFrom desc ${sqlDialect.limit})  
        WHERE en.orgID = :orgID: 
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom:
        ${i === 1 ? 'AND pf.isRecSum != 1' : 'AND pf.isRecSum = 1'} 
        AND ep.dictStaffCatID in (${dictStaffCatIDs}) 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${fundSourceWhere} 
        ${deptClause} 
        GROUP BY af.payFundID, pf.name, pf.code, ep.dictStaffCatID, pf.codeSort
        ORDER BY pf.codeSort`
        if (i === 1) {
          accrualFundDS.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        } else {
          accrualFundDS2.runSQL(sqlText, {
            orgID: params.orgID,
            dateTo: periodTo,
            dateFrom: periodFrom,
            departmentID: params.departmentID
          })
        }
      }
    }
    const accrualFundData = accrualFundDS.getAsJsObject()
    const accrualFundData2 = accrualFundDS2.getAsJsObject()

    totalAccrualFundSum = accrualFundData.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum = curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
    totalAccFundSCSum = []
    accrualFund = getAccData(accrualFundData, totalAccFundSCSum, dictStaffCatIDs)

    totalAccrualFundOffSum = accrualFundData2.reduce((sum, curValue) => currencyService.round(sum + (curValue.paySum = curValue.paySum ? currencyService.round(curValue.paySum, 2) : 0), 2), 0)
    totalAccFundOffSCSum = []
    accrualFundOff = getAccData(accrualFundData2, totalAccFundOffSCSum, dictStaffCatIDs)
  }

  let fixedColumns = 4
  let fixedColumnsWidth = 40 + 300 + 100
  let staffCatCount = staffCategories.length
  let allColumnCount = fixedColumns + staffCatCount
  let sheetSize = fixedColumnsWidth + 80 * staffCatCount

  return {
    orgName: hrOrg.name,
    strPeriodName,
    accrualFund,
    totalAccrualFundSum,
    payment,
    totalPaymentSum,
    offtake,
    totalOfftakeSum,
    forpay,
    totalForpaySum,
    allColumnCount,
    sheetSize,
    isDep: params.departmentID ? { depName } : null,
    staffCategories,
    blocksNum: staffCatCount > 0 ? { staffCatCount } : null,
    totalPaymentSCSum,
    totalOfftakeSCSum,
    totalForpaySCSum,
    totalAccFundSCSum,
    fundSourceTitle,
    fundSourceDescription,
    isFundSource: !!(dictFundSource.length || params.isIncludeEmpty),
    payOff,
    totalPayOffSCSum,
    totalPayOffSum,
    accrualFundOff,
    totalAccrualFundOffSum,
    totalAccFundOffSCSum
  }
}

function getNReportData (params) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const reportDate = dateService.formatDate(params.reportDate)
  const period = params.periodRaw.split(' ')

  params.periodFrom = dateService.shiftDate(params.periodFrom)
  params.periodTo = dateService.shiftDate(params.periodTo)

  const org = reportService.getHrOrg(params.orgID, params.periodTo)

  const accrual = {}
  let accrualData = []
  let order = {}

  let tabs = ['FOZP', 'FDZP', 'ZKV']

  let rowValByTab = {
    'FOZP': 'Фонд основної заробітної плати:',
    'FDZP': 'Фонд додаткової заробітної плати:',
    'ZKV': 'Інші заохочувальні та компенсаційні виплати:',
    'other': 'Інші виплати, що не належать до фонду оплати праці:'
  }
  const valueParamProps = reportService.getReportParamProps(params.orgID, tabs)
  const reportParams = reportService.getReportParams(params.orgID, tabs)

  function getQueryByRow (rowType, tabCode, rp) {
    let query = UB.Repository('hr_accrual')
      .attrs('sum([paySum])', 'payElID', 'payElID.description', 'payElID.codeSort')
      .where('periodCalcID', '=', params.periodID)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0)
      .groupBy(['payElID', 'payElID.description', 'payElID.codeSort'])
      .orderBy('payElID.codeSort')
    switch (rowType) {
      case 'tabs':
        query.where('payElID', 'in', rp[`${tabCode}IDs`].length ? rp[`${tabCode}IDs`] : [0])
        break
      case 'other':
        const fopPayElIDs = [...rp.FOZPIDs, ...rp.FDZPIDs, ...rp.ZKVIDs]
        query.where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
          .whereIf(fopPayElIDs.length, 'payElID', 'notIn', fopPayElIDs)
        break
      case 'hold':
        query = query.where('payElID.methodID.methodGroupID.groupType', '!=', 'PAYMENT')
        break
    }
    switch (params.reportCode) {
      case 'hr_accrual-N6':
        query.where('employeeNumberID', '=', params.employeeNumberID)
        break
      case 'hr_accrual-N7':
        query.where('employeeNumberID.orgID', '=', params.orgID)
        break
    }

    return query.selectAsObject({
      'sum([paySum])': 'paySum',
      'payElID.description': 'payElName'
    })
  }

  let globalOrder = 0
  tabs.forEach(tabCode => {
    order = {}
    accrual[tabCode + 'Sum'] = 0
    valueParamProps[`${tabCode}IDs`].forEach(idParam => {
      order[idParam.valuesID] = idParam.orderN
    })
    accrual[tabCode] = getQueryByRow('tabs', tabCode, reportParams)

    accrual[tabCode].forEach(item => {
      item.orderN = order[item.payElID]
      item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
      accrual[tabCode + 'Sum'] = currencyService.round(accrual[tabCode + 'Sum'] += item.paySum, 2)
    })

    accrual[tabCode].sort((a, b) => (a.orderN > b.orderN) ? 1 : ((b.orderN > a.orderN) ? -1 : 0))

    accrual[tabCode].forEach(item => {
      item.orderN = ++globalOrder
    })

    accrualData = accrualData.concat([{
      orderN: '',
      paySum: accrual[tabCode + 'Sum'] || 0,
      payElID: '',
      payElName: `<strong>${rowValByTab[tabCode]}</strong>`
    }],
    accrual[tabCode], [{
      orderN: '',
      paySum: null,
      payElID: '',
      payElName: '&nbsp;'
    }])
  })

  accrual['other'] = getQueryByRow('other', null, reportParams)

  accrual['otherSum'] = 0
  accrual['other'].forEach(item => {
    item.orderN = ++globalOrder
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    accrual['otherSum'] = currencyService.round(accrual['otherSum'] += item.paySum, 2)
  })

  accrualData = accrualData.concat([{
    orderN: null,
    paySum: accrual['otherSum'],
    payElID: null,
    payElName: `<strong>${rowValByTab['other']}</strong>`
  }],
  accrual['other'], [{
    orderN: '',
    paySum: null,
    payElID: '',
    payElName: '&nbsp;'
  }])

  accrual['hold'] = getQueryByRow('hold', null, reportParams)

  accrual['holdSum'] = 0
  accrual['hold'].forEach((item, i) => {
    item.orderN = i + 1
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    accrual['holdSum'] = currencyService.round(accrual['holdSum'] += item.paySum, 2)
  })

  if (accrual['hold'].length) {
    if (accrualData.length > accrual['hold'].length) {
      for (let i = 0; i < accrualData.length; i++) {
        if (accrual['hold'].length <= i) {
          break
        }

        Object.assign(accrualData[i], {
          hOrderN: i + 1,
          hPayElName: accrual['hold'][i].payElName,
          hPaySum: accrual['hold'][i].paySum
        })
      }
    } else {
      for (let i = 0; i < accrual['hold'].length; i++) {
        if (accrualData[i]) {
          Object.assign(accrualData[i], {
            hOrderN: i + 1,
            hPayElName: accrual['hold'][i].payElName,
            hPaySum: accrual['hold'][i].paySum
          })
        } else {
          accrualData.push({
            orderN: '',
            payElName: '',
            paySum: '',
            hOrderN: i + 1,
            hPayElName: accrual['hold'][i].payElName,
            hPaySum: accrual['hold'][i].paySum
          })
        }
      }
    }
  }

  const otherParams = {}

  if (params.reportCode === 'hr_accrual-N6') {
    otherParams.empPosData = UB.Repository('hr_employeePositionSR')
      .attrs('employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.sexType.name', 'employeeNumberID.tabNum',
        'employeeNumberID.employeeID.taxCode', 'posName', 'dictPosCodeZKPPTR', 'posNameDiff', 'factPosName')
      .where('ID', '=', params.employeePositionID)
      .selectSingle({
        'employeeNumberID.employeeID.fullFIO': 'fullFIO',
        'employeeNumberID.employeeID.sexType.name': 'sexType',
        'employeeNumberID.tabNum': 'tabNum',
        'employeeNumberID.employeeID.taxCode': 'taxCode'
      })

    const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
    otherParams.empPosData.posFull = useActualPositionName ? otherParams.empPosData.factPosName : otherParams.empPosData.posNameDiff
    if (otherParams.empPosData.dictPosCodeZKPPTR) otherParams.empPosData.posFull = `${otherParams.empPosData.posFull || ''} (${otherParams.empPosData.dictPosCodeZKPPTR})`.trim()

    otherParams.timeSheet = UB.Repository('tim_timeSheet')
      .attrs('count([ID])', 'sum([factHour])')
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('dateWork', '>=', params.periodFrom)
      .where('dateWork', '<=', params.periodTo)
      .where('factTimeCostID.timeCostType', '=', 'WORK')
      .where('isActive', '=', 1)
      .selectSingle({
        'count([ID])': 'count',
        'sum([factHour])': 'factHour'
      })

    otherParams.timeSheet.timeSheetFull = otherParams.timeSheet.count
    if (otherParams.timeSheet.factHour) otherParams.timeSheet.timeSheetFull = `${otherParams.timeSheet.timeSheetFull} (${otherParams.timeSheet.factHour})`
  }

  return {
    orgName: org.name,
    EDRPOUCode: org.EDRPOUCode,
    periodMonth: period[0],
    periodYear: period[1].substring(2),
    reportDate,
    accrualData,
    sumAll: (accrual['FOZPSum'] + accrual['FDZPSum'] + accrual['ZKVSum'] + accrual['otherSum']) || 0,
    accountant: params.accEmployeePositionID ? UB.Repository('hr_employeePositionS').attrs('employeeNumberID.employeeID.shortFIO').where('ID', '=', params.accEmployeePositionID).selectScalar() : null,
    otherParams,
    holdSum: accrual.holdSum || 0
  }
}

function getCalcFundsData (params) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  params.dictFundSourceID = params.dictFundSourceID ? params.dictFundSourceID : []
  params.isIncludeEmpty = params.dictFundSourceID.includes(0)
  if (params.isIncludeEmpty) {
    params.dictFundSourceID.filter(ID => ID !== 0)
  }
  let periodFrom = dateService.shiftDate(params.objPeriodFromDateFrom)
  let periodTo = dateService.shiftDate(params.objPeriodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()
  let hrOrg = reportService.getHrOrg(params.orgID, periodTo)

  const showCalcPeriod = params.showCalcPeriod
  const showSalaryPeriod = params.showSalaryPeriod
  const checkPosDepChange = params.checkPosDepChange
  const showOrgName = params.organizationID && !params.groupReportByDep

  if (!params.extraColumns) params.extraColumns = []

  let orgIDs = []
  let orgNames = []
  if (params.organizationID) {
    orgIDs = [params.organizationID]
    if (params.includeSubOrg) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [params.orgID]
  }
  orgIDs.forEach(orgID => {
    const org = UB.Repository('hr_organization')
      .attrs(['treePath', 'description'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()
    orgNames.push({
      ID: orgID,
      treePath: org ? org.treePath : '',
      description: org ? org.description : ''
    })
  })
  orgNames.sort((a, b) => a.treePath < b.treePath ? -1 : 1)

  let strPeriodName
  if (periodFrom.getFullYear() === periodTo.getFullYear() &&
    periodFrom.getMonth() === 0 && periodTo.getMonth() === 11) {
    strPeriodName = UB.i18n(` {0} рік`, periodFrom.getFullYear())
  } else if (params.objPeriodFromID === params.objPeriodToID) {
    strPeriodName = UB.Repository('hr_dictPeriod').attrs('name')
      .where('ID', '=', params.objPeriodFromID)
      .selectScalar() + ' ' + UB.i18n('року')
  } else {
    const period = UB.Repository('hr_dictPeriod').attrs('ID', 'name')
      .where('ID', 'in', [params.objPeriodFromID, params.objPeriodToID])
      .selectAsObject()
    strPeriodName = UB.i18n(` {0} року по {1} року`, period.find(p => p.ID === params.objPeriodFromID).name, period.find(p => p.ID === params.objPeriodToID).name)
  }

  let departmentName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodTo })
      .selectSingle()
    departmentName = dept.description || dept.fullName
    if (params.includeSubDep) {
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
  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')
  let accrualFundDS
  const accrualFundESV = {}
  let payFundVals = []
  let accrualFundEmps

  let dictFundSource
  let empNumbers = []
  const isIncludeEmptyFundSource = params.dictFundSourceID.includes(0)

  if (params.dictFundSourceID.length || params.isIncludeEmpty || (checkPosDepChange && deptIDs)) {
    accrualFundDS = UB.DataStore('hr_accrualFundDt')
    if (params.dictFundSourceID.length && !isIncludeEmptyFundSource) {
      dictFundSource = ` and afdt.dictFundSourceID in (${params.dictFundSourceID}) `
    } else if (params.dictFundSourceID.length === 1 && isIncludeEmptyFundSource) {
      dictFundSource = ` and afdt.dictFundSourceID is null `
    } else if (params.dictFundSourceID.length && isIncludeEmptyFundSource) {
      dictFundSource = ` and ((afdt.dictFundSourceID in (${params.dictFundSourceID})) or (afdt.dictFundSourceID is null)) `
    }

    // 3
    accrualFundDS.runSQL(`select
        af.employeeNumberID as "employeeNumberID"
        ,sum(round(afdt.sourceSum,2)) as "sourceSum"
        ,sum(round(afdt.baseSum,2)) as "baseSum"
        ,sum(round(afdt.paySum,2)) as "paySum"
        ,emp.fullFIO as "fullFIO"
        ,en.tabNum as "tabNum"
        ,en.tabNumSort as "tabNumSort"
        ,${showSalaryPeriod ? 'periodSalaryID' : 'null'} as "periodSalaryID"
        ,${showSalaryPeriod ? 'periodSalary.dateFrom' : 'null'} as "periodSalary"
        ,${showSalaryPeriod ? 'periodSalary.name' : 'null'} as "periodSalaryName"
        ,${showCalcPeriod ? 'periodCalcID' : 'null'} as "periodCalcID"
        ,${showCalcPeriod ? 'periodCalc.dateFrom' : 'null'} as "periodCalc"
        ,${showCalcPeriod ? 'periodCalc.name' : 'null'} as "periodCalcName"
        ,(case when ep.positionID is not null 
          then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' 
            AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.name from hr_dictPosition dp where dp.ID = ep.dictPositionID) 
        end) as "posName"  
        ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = afdt.departmentID and dep.state = 'ACTIVE' 
          and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"        
        ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
            where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
        ,ep.factPosition as "factPosition"      
        ,ep.positionID as "positionID"
        ,afdt.departmentID as "departmentID"
        ,en.orgID as "orgID"     
        ,dsc.description as "staffCatName"
        ,st.name as "sexType"
        ,emp.birthDate as "birthDate"
        ,en.dateFrom as "startWork"
        ,en.dateTo as "endWork"
        ,ep.mtCount as "mtCount"
        ,dsc.description as "staffCatName"
        ,ws.name as "workSchedule"
        ,ecb.description as "dictCategoryECB"
        ,gla.description as "accountName"
        ,wt.name as "workerType"
        ,wp.name as "workPlace"      
        ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      FROM hr_accrualFundDt afdt 
        INNER JOIN hr_accrualFund af on afdt.accrualFundID=af.ID 
        INNER JOIN hr_employeeNumber en on en.ID=af.employeeNumberID 
        INNER join hr_employee emp on emp.ID=en.employeeID 
        INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = af.periodCalcID 
        INNER JOIN hr_dictPeriod periodSalary on periodSalary.ID=af.periodSalaryID 
        LEFT JOIN hr_employeePosition ep ON ep.isActive = 1 and
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= ${checkPosDepChange ? 'periodCalc.dateTo' : ':dateTo:'}   
         and ep2.mi_deleteDate >= '9999-12-31' 
         order by ep2.dateFrom desc ${sqlDialect.limit}) 
        LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
        LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
        LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
        LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
        LEFT JOIN ubm_enum st on st.code = emp.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')} 
      AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      ${deptIDs ? ' AND afdt.departmentID ' + entityBaseService.getInExpression('deptIDs') : ''}
      ${dictFundSource || ''} 
      GROUP BY af.employeeNumberID, emp.fullFIO, en.tabNum, en.tabNumSort, ${showSalaryPeriod ? 'af.periodSalaryID, periodSalary.dateFrom, periodSalary.name,' : ''}
        ${showCalcPeriod ? 'af.periodCalcID, periodCalc.dateFrom, periodCalc.name,' : ''} ep.dictPositionID, ep.factPosition, ep.positionID, afdt.departmentID, en.orgID,
        st.name, emp.birthDate, en.dateFrom, en.dateTo, ep.mtCount, dsc.description, ws.name, ecb.description, gla.description, wt.name, wp.name,
        ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value    
      ORDER BY emp.fullFIO, en.tabNumSort ${showSalaryPeriod ? ', periodSalary.dateFrom' : ''} ${showCalcPeriod ? ', periodCalc.dateFrom' : ''}`, {
      orgIDs,
      dateTo: periodTo,
      dateFrom: periodFrom,
      deptIDs,
      departmentID: params.departmentID
    })

    accrualFundEmps = accrualFundDS.getAsJsObject()
    if (accrualFundEmps && accrualFundEmps.length) {
      empNumbers = accrualFundEmps.map(el => el.employeeNumberID)
      accrualFundDS.runSQL(`SELECT
        af.employeeNumberID as "employeeNumberID"
        ,af.payFundID as "payFundID"
        ,af.rate as "rate"
        ,pf.description as "payFundName"
        ,pf.codeSort as "codeSort"
        ,${showSalaryPeriod ? 'af.periodSalaryID' : 'null'} as "periodSalaryID"
        ,${showCalcPeriod ? 'af.periodCalcID' : 'null'} as "periodCalcID"
        ,sum(round(afdt.sourceSum,2)) AS "sourceSum"
        ,sum(round(afdt.baseSum,2)) AS "baseSum"
        ,sum(round(afdt.paySum,2)) AS "paySum"
        FROM hr_accrualFundDt afdt 
          INNER JOIN hr_accrualFund af on afdt.accrualFundID=af.ID 
          INNER JOIN hr_payFund pf ON pf.ID = af.payFundID 
          INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = af.periodCalcID 
        WHERE af.employeeNumberID ${entityBaseService.getInExpression('empNumbers')} 
        ${dictFundSource || ''} 
        ${deptIDs ? ' AND afdt.departmentID ' + entityBaseService.getInExpression('deptIDs') : ''}
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
        GROUP BY af.payFundID, af.employeeNumberID, af.rate, pf.sequence, pf.description, pf.codeSort
          ${showSalaryPeriod ? ', af.periodSalaryID' : ''} ${showCalcPeriod ? ',af.periodCalcID' : ''}
        ORDER BY pf.codeSort`, {
        dateTo: periodTo,
        dateFrom: periodFrom,
        empNumbers,
        deptIDs
      })

      let accrualFundData1 = accrualFundDS.getAsJsObject()

      accrualFundData1.forEach(item => {
        let currGroup = `${item.employeeNumberID}${item.periodCalcID}${item.periodSalaryID}`
        if (!accrualFundESV[currGroup]) accrualFundESV[currGroup] = {}
        accrualFundESV[currGroup][item.payFundID] = item

        // accFund.payFundID, pf.name payFundName, accFund.rate
        if (!(payFundVals.find(obj => obj.payFundID === item.payFundID && obj.payFundName === item.payFundName && obj.rate === item.rate))) {
          payFundVals.push({ payFundID: item.payFundID, payFundName: item.payFundName, rate: item.rate })
        }
      })
    }
  } else {
    accrualFundDS = UB.DataStore('hr_accrualFund')
    // 3
    accrualFundDS.runSQL(`select 
        af.employeeNumberID as "employeeNumberID"
        ,sum(round(af.sourceSum,2)) as "sourceSum"
        ,sum(round(af.baseSum,2)) as "baseSum" 
        ,sum(round(af.paySum,2)) as "paySum"
        ,emp.fullFIO as "fullFIO"
        ,en.tabNum as "tabNum"
        ,en.tabNumSort as "tabNumSort"
        ,${showSalaryPeriod ? 'periodSalaryID' : 'null'} as "periodSalaryID"
        ,${showSalaryPeriod ? 'periodSalary.dateFrom' : 'null'} as "periodSalary"
        ,${showSalaryPeriod ? 'periodSalary.name' : 'null'} as "periodSalaryName"
        ,${showCalcPeriod ? 'periodCalcID' : 'null'} as "periodCalcID"
        ,${showCalcPeriod ? 'periodCalc.dateFrom' : 'null'} as "periodCalc"
        ,${showCalcPeriod ? 'periodCalc.name' : 'null'} as "periodCalcName"
        ,(case when ep.positionID is not null 
          then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' 
            AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.name from hr_dictPosition dp where dp.ID = ep.dictPositionID) 
        end) as "posName"
        ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
          and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"        
        ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
            where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
        ,ep.factPosition as "factPosition"        
        ,ep.positionID as "positionID"
        ,ep.departmentID as "departmentID"
        ,en.orgID as "orgID"     
        ,dsc.description as "staffCatName"
        ,st.name as "sexType"
        ,emp.birthDate as "birthDate"
        ,en.dateFrom as "startWork"
        ,en.dateTo as "endWork"
        ,ep.mtCount as "mtCount"
        ,dsc.description as "staffCatName"
        ,ws.name as "workSchedule"
        ,ecb.description as "dictCategoryECB"
        ,gla.description as "accountName"
        ,wt.name as "workerType"
        ,wp.name as "workPlace"      
        ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      FROM hr_accrualFund af 
        INNER JOIN hr_employeeNumber en on en.ID=af.employeeNumberID 
        INNER join hr_employee emp on emp.ID=en.employeeID 
        INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = af.periodCalcID 
        INNER JOIN hr_dictPeriod periodSalary on periodSalary.ID=af.periodSalaryID 
       LEFT join  hr_employeePosition ep ON ep.isActive = 1 and
         ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
         ep2.employeeNumberID = en.ID 
         and ep2.isActive = 1
         and ep2.dateFrom <= ${checkPosDepChange ? 'periodCalc.dateTo' : ':dateTo:'}   
         and ep2.mi_deleteDate >= '9999-12-31' 
         order by ep2.dateFrom desc ${sqlDialect.limit}) 
        LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
        LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
        LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
        LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
        LEFT JOIN ubm_enum st on st.code = emp.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
      WHERE
        en.orgID ${entityBaseService.getInExpression('orgIDs')} 
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${deptClause} 
      GROUP BY af.employeeNumberID, emp.fullFIO, en.tabNum, en.tabNumSort, ${showSalaryPeriod ? 'af.periodSalaryID, periodSalary.dateFrom, periodSalary.name,' : ''}
        ${showCalcPeriod ? 'af.periodCalcID, periodCalc.dateFrom, periodCalc.name,' : ''} ep.dictPositionID, ep.factPosition, ep.positionID, ep.departmentID, st.name, emp.birthDate,
        en.dateFrom, en.dateTo, ep.mtCount, dsc.description, ws.name, ecb.description, gla.description, wt.name, wp.name, en.orgID,
        ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value  
      ORDER BY emp.fullFIO, en.tabNumSort ${showSalaryPeriod ? ', periodSalary.dateFrom' : ''} ${showCalcPeriod ? ', periodCalc.dateFrom' : ''}`, {
      orgIDs,
      dateTo: periodTo,
      dateFrom: periodFrom,
      departmentID: params.departmentID
    })

    accrualFundEmps = accrualFundDS.getAsJsObject()

    if (accrualFundEmps && accrualFundEmps.length > 0) {
      empNumbers = accrualFundEmps.map(el => el.employeeNumberID)

      accrualFundDS.runSQL(`SELECT
        af.employeeNumberID as "employeeNumberID"
        ,af.payFundID as "payFundID"
        ,af.rate as "rate"
        ,pf.description as "payFundName"
        ,pf.codeSort as "codeSort"
        ,${showSalaryPeriod ? 'af.periodSalaryID' : 'null'} as "periodSalaryID"
        ,${showCalcPeriod ? 'af.periodCalcID' : 'null'} as "periodCalcID"
        ,sum(round(af.sourceSum,2)) AS "sourceSum"
        ,sum(round(af.baseSum,2)) AS "baseSum"
        ,sum(round(af.paySum,2)) AS "paySum"
        FROM hr_accrualFund af  
          INNER JOIN hr_payFund pf ON pf.ID = af.payFundID 
          INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = af.periodCalcID 
        WHERE af.employeeNumberID ${entityBaseService.getInExpression('empNumbers')} 
        AND periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
        GROUP BY af.payFundID, af.employeeNumberID, af.rate, pf.sequence, pf.description, pf.codeSort
        ${showSalaryPeriod ? ',af.periodSalaryID' : ''} ${showCalcPeriod ? ',af.periodCalcID' : ''}
        ORDER BY pf.codeSort`, {
        dateTo: periodTo,
        dateFrom: periodFrom,
        empNumbers
      })

      let accrualFundData1 = accrualFundDS.getAsJsObject()

      accrualFundData1.forEach(item => {
        let currGroup = `${item.employeeNumberID}${item.periodCalcID}${item.periodSalaryID}`
        if (!accrualFundESV[currGroup]) accrualFundESV[currGroup] = {}
        accrualFundESV[currGroup][item.payFundID] = item
        if (!(payFundVals.find(obj => obj.payFundID === item.payFundID && obj.payFundName === item.payFundName && obj.rate === item.rate))) {
          payFundVals.push({ payFundID: item.payFundID, payFundName: item.payFundName, rate: item.rate })
        }
      })
    }
  }

  // 4
  const accrualDS = UB.DataStore('hr_accrual')
  if (!params.dictFundSourceID.length && !params.isIncludeEmpty && (!deptIDs || !checkPosDepChange)) {
    accrualDS.runSQL(`SELECT 
        acc.employeeNumberID as "employeeNumberID"
        ,sum(acc.paySum) AS "paySum"
        ,emp.fullFIO as "fullFIO"
        ,en.tabNum as "tabNum"
        ,en.tabNumSort as "tabNumSort"
        ,${showSalaryPeriod ? 'periodSalaryID' : 'null'} as "periodSalaryID"
        ,${showSalaryPeriod ? 'periodSalary.dateFrom' : 'null'} as "periodSalary"
        ,${showSalaryPeriod ? 'periodSalary.name' : 'null'} as "periodSalaryName"
        ,${showCalcPeriod ? 'periodCalcID' : 'null'} as "periodCalcID"
        ,${showCalcPeriod ? 'periodCalc.dateFrom' : 'null'} as "periodCalc"
        ,${showCalcPeriod ? 'periodCalc.name' : 'null'} as "periodCalcName"
        ,(case when ep.positionID is not null 
          then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' 
            AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.name from hr_dictPosition dp where dp.ID = ep.dictPositionID) 
        end) as "posName",
        (select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
        and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"        
        ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
            where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
        ,ep.positionID as "positionID"
        ,ep.departmentID as "departmentID"     
        ,ep.factPosition as "factPosition"        
        ,en.orgID as "orgID"
        ,dsc.description as "staffCatName"
        ,st.name as "sexType"
        ,emp.birthDate as "birthDate"
        ,en.dateFrom as "startWork"
        ,en.dateTo as "endWork"
        ,ep.mtCount as "mtCount"
        ,dsc.description as "staffCatName"
        ,ws.name as "workSchedule"
        ,ecb.description as "dictCategoryECB"
        ,gla.description as "accountName"
        ,wt.name as "workerType"
        ,wp.name as "workPlace"      
        ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      FROM hr_accrual acc
        INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
        INNER JOIN hr_employee emp on emp.ID=en.employeeID 
        INNER JOIN hr_dictPeriod periodSalary on periodSalary.ID=acc.periodSalaryID 
        INNER JOIN hr_payEl pf ON pf.ID = acc.payElID 
        INNER JOIN hr_method meth on pf.methodID = meth.ID
        INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID 
        INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = acc.periodCalcID 
        LEFT JOIN  hr_employeePosition ep ON ep.employeeNumberID = en.ID AND ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31'
         AND ep.dateFrom = (select ${sqlDialect.top}
                        ep2.dateFrom from hr_employeePosition ep2
                        JOIN hr_employeeNumber n on n.ID = ep2.employeeNumberID
                        left JOIN hr_employee e on e.ID = ep2.employeeID
                        where ep2.employeeNumberID = ep.employeeNumberID
                        and ep2.mi_deleteDate >= '9999-12-31' and ep2.isActive = 1 and ep2.dateFrom <= :dateTo:
                        AND (ep2.dateTo >= :dateTo: OR (n.dateTo < :dateTo: AND ep2.dateTo < :dateTo:))    
                        ${deptIDs ? ` and ep2.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
                          order by ep2.dateTo desc ${sqlDialect.limit})
          
         
        LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
        LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
        LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
        LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
        LEFT JOIN ubm_enum st on st.code = emp.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
        WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
        AND periodCalc <= :dateTo: and periodCalc >= :dateFrom: 
        AND methGr.groupType = 'PAYMENT'
        AND en.empWorkPlace is NULL        
        AND acc.flagsRec & 8192 != 8192 
        ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
        ${deptClause}  
        GROUP BY acc.employeeNumberID, en.tabNum, en.tabNumSort, emp.fullFIO, ${showSalaryPeriod ? 'acc.periodSalaryID, periodSalary.dateFrom, periodSalary.name,' : ''}
        ${showCalcPeriod ? 'acc.periodCalcID, periodCalc.dateFrom, periodCalc.name,' : ''} ep.dictPositionID, ep.factPosition, ep.positionID, ep.departmentID, st.name, emp.birthDate,
        en.dateFrom, en.dateTo, ep.mtCount, dsc.description, ws.name, ecb.description, gla.description, wt.name, wp.name, en.orgID,
        ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value
    `, {
      orgIDs,
      deptIDs,
      dateTo: periodTo,
      dateFrom: periodFrom,
      departmentID: params.departmentID
    })
  } else {
    accrualDS.runSQL(`SELECT
      acc.employeeNumberID as "employeeNumberID"
      ,sum(afdt.paySum) AS "paySum"
      ,emp.fullFIO as "fullFIO"
      ,en.tabNum as "tabNum"
      ,en.tabNumSort as "tabNumSort"
      ,${showSalaryPeriod ? 'periodSalaryID' : 'null'} as "periodSalaryID"
      ,${showSalaryPeriod ? 'periodSalary.dateFrom' : 'null'} as "periodSalary"
      ,${showSalaryPeriod ? 'periodSalary.name' : 'null'} as "periodSalaryName"
      ,${showCalcPeriod ? 'periodCalcID' : 'null'} as "periodCalcID"
      ,${showCalcPeriod ? 'periodCalc.dateFrom' : 'null'} as "periodCalc"
      ,${showCalcPeriod ? 'periodCalc.name' : 'null'} as "periodCalcName"
      ,(case when ep.positionID is not null
          then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' 
            AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
          else (select dp.name from hr_dictPosition dp where dp.ID = ep.dictPositionID) 
        end) as "posName"
      ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
          and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"        
      ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
          where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
        else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
      ,ep.factPosition as "factPosition" 
      ,ep.positionID as "positionID"
      ,ep.departmentID as "departmentID"
      ,en.orgID as "orgID"
      ,dsc.description as "staffCatName"
      ,st.name as "sexType"
      ,emp.birthDate as "birthDate"
      ,en.dateFrom as "startWork"
      ,en.dateTo as "endWork"
      ,ep.mtCount as "mtCount"
      ,dsc.description as "staffCatName"
      ,ws.name as "workSchedule"
      ,ecb.description as "dictCategoryECB"
      ,gla.description as "accountName"
      ,wt.name as "workerType"
      ,wp.name as "workPlace"      
      ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      FROM hr_accrual acc
        INNER JOIN hr_accrualDt afdt ON acc.ID = afdt.accrualID
        INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
        INNER JOIN hr_employee emp on emp.ID=en.employeeID 
        INNER JOIN hr_dictPeriod periodSalary on periodSalary.ID=acc.periodSalaryID 
        INNER JOIN hr_payEl pf ON pf.ID = acc.payElID
        INNER JOIN hr_method meth on pf.methodID = meth.ID
        INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID 
        INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = acc.periodCalcID 
        INNER JOIN hr_employeePosition ep ON ep.employeeNumberID = en.ID AND ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31'
                        AND ep.dateFrom = (select ${sqlDialect.top}
                        ep2.dateFrom from hr_employeePosition ep2
                        JOIN hr_employeeNumber n on n.ID = ep2.employeeNumberID
                        left JOIN hr_employee e on e.ID = ep2.employeeID
                        where ep2.employeeNumberID = ep.employeeNumberID
                        and ep2.mi_deleteDate >= '9999-12-31' and ep2.isActive = 1 and ep2.dateFrom <= :dateTo:
                        AND (ep2.dateTo >= :dateTo: OR (n.dateTo < :dateTo: AND ep2.dateTo < :dateTo:))    
                        ${deptIDs ? ` and ep2.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
                        order by ep2.dateTo desc ${sqlDialect.limit})
        LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
        LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
        LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
        LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
        LEFT JOIN ubm_enum st on st.code = emp.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
        LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
      WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')}
      AND acc.periodCalc <= :dateTo: and acc.periodCalc >= :dateFrom: 
      AND methGr.groupType = 'PAYMENT'
      AND acc.flagsRec & 8192 != 8192 
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
      ${deptIDs ? ' AND afdt.departmentID ' + entityBaseService.getInExpression('deptIDs') : ''}      
      ${dictFundSource || ''} 
      GROUP BY acc.employeeNumberID, en.tabNum, en.tabNumSort, emp.fullFIO, ${showSalaryPeriod ? 'acc.periodSalaryID, periodSalary.dateFrom, periodSalary.name,' : ''}
        ${showCalcPeriod ? 'acc.periodCalcID, periodCalc.dateFrom, periodCalc.name,' : ''} ep.dictPositionID, ep.factPosition, ep.positionID, en.orgID, ep.departmentID,
        st.name, emp.birthDate, en.dateFrom, en.dateTo, ep.mtCount, dsc.description, ws.name, ecb.description, gla.description, wt.name, wp.name,
        ep.d0Value, ep.d1Value, ep.d2Value, ep.d3Value, ep.d4Value, ep.d5Value, ep.d6Value, ep.d7Value, ep.d8Value, ep.d9Value  
    `, {
      orgIDs,
      dateTo: periodTo,
      dateFrom: periodFrom,
      deptIDs,
      departmentID: params.departmentID
    })
  }

  const accrualEmpData = accrualDS.getAsJsObject()

  accrualFundEmps.forEach(item => {
    item.accPaySum = 0
  })

  accrualEmpData.forEach(item => {
    const emp = accrualFundEmps.find(o => o.employeeNumberID === item.employeeNumberID && o.periodSalaryID === item.periodSalaryID && o.periodCalcID === item.periodCalcID)
    if (emp) {
      emp.accPaySum = item.paySum
    } else {
      const newItem = Object.assign(item, {})
      newItem.accPaySum = item.paySum
      newItem.paySum = 0
      newItem.sourceSum = 0
      newItem.baseSum = 0
      accrualFundEmps.push(newItem)
    }
  })

  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true
  accrualFundEmps.forEach(item => {
    item.posName = useActualPositionName ? item.factPosition || '' : item.posName
    const org = orgNames.find(o => o.ID === item.orgID)
    item.orgName = org ? org.description : ''
    if (!params.groupReportByDep) item.posIdxNum = 0
    item.birthDate = dateService.formatDate(item.birthDate)
    item.startWork = dateService.formatDate(item.startWork)
    item.endWork = dateService.isMaxDate(item.endWork) ? '' : dateService.formatDate(item.endWork)
    item.mtCount = currencyService.formatAsCurrency(item.mtCount)
    item.periodSalarySort = item.periodSalary ? dateService.shiftDate(item.periodSalary).getTime() : 0
    item.periodCalcSort = item.periodCalc ? dateService.shiftDate(item.periodCalc).getTime() : 0
    item.showColumnSexType = params.extraColumns.includes('sexType')
    item.showColumnBirthDate = params.extraColumns.includes('birthDate')
    item.showColumnDateFrom = params.extraColumns.includes('dateFrom')
    item.showColumnDateTo = params.extraColumns.includes('dateTo')
    item.showColumnWorkerType = params.extraColumns.includes('workerType')
    item.showColumnWorkSchedule = params.extraColumns.includes('workScheduleID')
    item.showColumnWorkPlace = params.extraColumns.includes('workPlace')
    item.showColumnDictStaffCat = params.extraColumns.includes('dictStaffCatID')
    item.showColumnMtCount = params.extraColumns.includes('mtCount')
    item.showColumnDictCategoryECB = params.extraColumns.includes('dictCategoryECBID')
    item.showColumnAccountID = params.extraColumns.includes('accountID')
    item.showColumnDictCostType = params.extraColumns.includes('dictCostType')
    item.showOrgName = showOrgName
    item.showCalcPeriod = showCalcPeriod
    item.showSalaryPeriod = showSalaryPeriod
  })

  function compareEmps (a, b) {
    return (a.posIdxNum === b.posIdxNum ? (a['fullFIO'] === b['fullFIO']
      ? (a.tabNumSort === b.tabNumSort ? a['periodSalarySort'] - b['periodSalarySort'] : a.tabNumSort - b.tabNumSort)
      : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
      : a.posIdxNum - b.posIdxNum)
  }
  accrualFundEmps.sort(compareEmps)

  let isFundSource = !!(params.dictFundSourceID.length || params.isIncludeEmpty)
  let fundSourceDescriptionList = UB.Repository('ac_fundSource')
    .attrs(['name'])
    .where('ID', 'in', params.dictFundSourceID)
    .selectAsArrayOfValues()
  let fundSourceTitle, fundSourceDescription
  if (params.dictFundSourceID.length > 1 && isIncludeEmptyFundSource) {
    fundSourceTitle = 'Джерела фінансування:'
    fundSourceDescription = fundSourceDescriptionList.join(', ') + ', та з пустим джерелом фінансування'
  } else if (params.dictFundSourceID.length === 1 && isIncludeEmptyFundSource) {
    fundSourceTitle = ''
    fundSourceDescription = 'З пустим джерелом фінансування'
  } else if (params.dictFundSourceID.length && !isIncludeEmptyFundSource) {
    fundSourceTitle = 'Джерела фінансування:'
    fundSourceDescription = fundSourceDescriptionList.join(', ')
  }

  function orgTreeDataToReport (curNode, depts, orgID) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps
      }
      if (curNode.name) {
        depart.dept = { colCount: allColSpanNum, deptName: curNode.name }
      }
      depts.push(depart)
    }
    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, orgID)
    })

    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      let depart = {
        emps: [],
        depSum: { title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
      }

      depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.accPaySum })
      depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.sourceSum })
      depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.baseSum })
      depart.depSum.dsum.push({ sum: curNode.calcSum.allSum.paySum })

      curNode.calcSum.payFundArr.forEach(s => {
        depart.depSum.dsum.push({ sum: s.sourceSum })
        depart.depSum.dsum.push({ sum: s.baseSum })
        depart.depSum.dsum.push({ sum: s.paySum })
      })

      depts.push(depart)
    }
  }

  function orgTreeCalcDepSum (curNode, payFundCount = 0) {
    curNode.calcSum = {
      allSum: { sourceSum: 0, baseSum: 0, paySum: 0, accPaySum: 0 },
      payFundArr: [] }

    for (let i = 0; i < payFundCount; i++) curNode.calcSum.payFundArr.push({ sourceSum: 0, baseSum: 0, paySum: 0 })

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.sourceSum = currencyService.round(curNode.calcSum.allSum.sourceSum += el.sourceSum || 0, 2)
          curNode.calcSum.allSum.baseSum = currencyService.round(curNode.calcSum.allSum.baseSum += el.baseSum || 0, 2)
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.accPaySum = currencyService.round(curNode.calcSum.allSum.accPaySum += el.accPaySum || 0, 2)

          curNode.calcSum.payFundArr.forEach((pf, ind) => {
            pf.sourceSum = currencyService.round(pf.sourceSum += el.payFundArr[ind].sourceSum || 0, 2)
            pf.baseSum = currencyService.round(pf.baseSum += el.payFundArr[ind].baseSum || 0, 2)
            pf.paySum = currencyService.round(pf.paySum += el.payFundArr[ind].paySum || 0, 2)
          })
        })
      }
      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur, payFundCount)

        curNode.calcSum.allSum.sourceSum = currencyService.round(curNode.calcSum.allSum.sourceSum += cur.calcSum.allSum.sourceSum || 0, 2)
        curNode.calcSum.allSum.baseSum = currencyService.round(curNode.calcSum.allSum.baseSum += cur.calcSum.allSum.baseSum || 0, 2)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.accPaySum = currencyService.round(curNode.calcSum.allSum.accPaySum += cur.calcSum.allSum.accPaySum || 0, 2)

        curNode.calcSum.payFundArr.forEach((pf, ind) => {
          pf.sourceSum = currencyService.round(pf.sourceSum += cur.calcSum.payFundArr[ind].sourceSum || 0, 2)
          pf.baseSum = currencyService.round(pf.baseSum += cur.calcSum.payFundArr[ind].baseSum || 0, 2)
          pf.paySum = currencyService.round(pf.paySum += cur.calcSum.payFundArr[ind].paySum || 0, 2)
        })
      })
    }
  }
  const payFundById = {}
  payFundVals.forEach(item => {
    payFundById[item.payFundID] = item.payFundName
  })

  let sheetSize = 33 + 35 + 155 + 125 + 145 + 125 + 210 + (params.groupReportByDep ? 0 : 125) + (showSalaryPeriod ? 125 : 0) + (showCalcPeriod ? 125 : 0) + params.extraColumns.length * 125
  let fixedColumn = 6 + (showSalaryPeriod ? 1 : 0) + (showCalcPeriod ? 1 : 0) + params.extraColumns.length + (showOrgName ? 1 : 0)
  let blocksNum = payFundVals.length
  const groupColumn = fixedColumn - 1
  const allSum = { sum0: 0, sum1: 0, sum2: 0, sum3: 0 }

  sheetSize += payFundVals.length * 210

  // total sum
  accrualFundEmps.forEach(item => {
    item.sourceSum = item.sourceSum ? currencyService.round(item.sourceSum, 2) : 0
    item.baseSum = item.baseSum ? currencyService.round(item.baseSum, 2) : 0
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    allSum.sum0 = currencyService.round(allSum.sum0 += item.accPaySum, 2)
    allSum.sum1 = currencyService.round(allSum.sum1 += item.sourceSum, 2)
    allSum.sum2 = currencyService.round(allSum.sum2 += item.baseSum, 2)
    allSum.sum3 = currencyService.round(allSum.sum3 += item.paySum, 2)

    item.payFundArr = []

    const currFundESV = accrualFundESV[`${item.employeeNumberID}${item.periodCalcID}${item.periodSalaryID}`] || {}
    payFundVals.forEach((block, j) => {
      const currFundEl = currFundESV[block.payFundID] || {}
      currFundEl.sourceSum = currFundEl.sourceSum ? currencyService.round(currFundEl.sourceSum, 2) : 0
      currFundEl.baseSum = currFundEl.baseSum ? currencyService.round(currFundEl.baseSum, 2) : 0
      currFundEl.paySum = currFundEl.paySum ? currencyService.round(currFundEl.paySum, 2) : 0

      item.payFundArr.push(currFundEl ? { sourceSum: currFundEl.sourceSum || 0, baseSum: currFundEl.baseSum || 0, paySum: currFundEl.paySum || 0 } : { sourceSum: 0, baseSum: 0, paySum: 0 })

      const currJ = 1 + 3 * (j + 1)
      !allSum.hasOwnProperty('sum' + currJ) && Object.assign(allSum, { ['sum' + currJ]: 0, ['sum' + (1 + currJ)]: 0, ['sum' + (2 + currJ)]: 0 })
      allSum['sum' + currJ] = currencyService.round(allSum['sum' + currJ] += currFundEl.sourceSum || 0, 2)
      allSum['sum' + (1 + currJ)] = currencyService.round(allSum['sum' + (1 + currJ)] += currFundEl.baseSum || 0, 2)
      allSum['sum' + (2 + currJ)] = currencyService.round(allSum['sum' + (2 + currJ)] += currFundEl.paySum || 0, 2)
    })
  })

  const allSumArr = []
  for (let i = 0; i <= (payFundVals.length * 3) + 3; i++) {
    allSumArr.push({ sum: allSum['sum' + i] })
  }
  const colspanNum = blocksNum * 3

  let allColSpanNum = 3 + colspanNum + fixedColumn

  const titleColSpan = fixedColumn > 10 ? 10 : fixedColumn
  const restColSpan = allColSpanNum - titleColSpan - 3

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  let depts = []
  if (params.groupReportByDep) {
    orgNames.forEach(org => {
      if (accrualFundEmps.filter(el => el.orgID === org.ID).length) {
        if (params.organizationID && params.includeSubOrg) {
          depts.push({
            emps: [],
            isOrg: true,
            dept: { colCount: allColSpanNum, deptName: org.description }
          })
        }
        staffUnitStore.runSQL(`  SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.fullName as "fullName", 
   u.mi_unityEntity as "mi_unityEntity", dep.description as "depdescription",u.treePath as "treePath", u.idxNum as "idxNum"
    FROM hr_staffUnit u 
      LEFT JOIN hr_department dep ON dep.ID = u.ID      
    WHERE
      u.orgID = :orgID:
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = :orgID: 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE' 
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
          orgID: org.ID,
          dateTo: periodTo
        })
        const orgStruct = staffUnitStore.getAsJsObject()
        // check DepartmetID
        accrualFundEmps.forEach(item => {
          if (!orgStruct.find(e => e.mi_data_id === item.departmentID)) {
            item.departmentID = null
            item.positionID = null
          }
        })
        let orgTree = treeUtils.orgTree(org.ID, accrualFundEmps.filter(el => el.orgID === org.ID), dateService.shiftDate(params.objPeriodToDateTo), orgStruct)
        orgTreeCalcDepSum(orgTree[0], payFundVals.length || 0)
        orgTreeDataToReport(orgTree[0], depts, org.ID, 1)
      }
    })
  } else {
    accrualFundEmps.sort(compareEmps)
    const depart = {
      emps: accrualFundEmps
    }
    depts.push(depart)
  }
  staffUnitStore.freeNative()
  let number = 1
  depts.forEach(dep => {
    dep.groupColumn = groupColumn
    dep.emps.forEach(emp => { emp.num = number++ })
  })

  return {
    hrOrg,
    strPeriodName,
    departmentName,
    accrualFundESV,
    payFundVals,
    isFundSource,
    showCalcPeriod,
    showSalaryPeriod,
    showOrgName,
    showColumnSexType: params.extraColumns.includes('sexType'),
    showColumnBirthDate: params.extraColumns.includes('birthDate'),
    showColumnDateFrom: params.extraColumns.includes('dateFrom'),
    showColumnDateTo: params.extraColumns.includes('dateTo'),
    showColumnWorkerType: params.extraColumns.includes('workerType'),
    showColumnWorkSchedule: params.extraColumns.includes('workScheduleID'),
    showColumnWorkPlace: params.extraColumns.includes('workPlace'),
    showColumnDictStaffCat: params.extraColumns.includes('dictStaffCatID'),
    showColumnMtCount: params.extraColumns.includes('mtCount'),
    showColumnDictCategoryECB: params.extraColumns.includes('dictCategoryECBID'),
    showColumnAccountID: params.extraColumns.includes('accountID'),
    showColumnDictCostType: params.extraColumns.includes('dictCostType'),
    fundSourceDescription,
    fundSourceTitle,
    accrualFundData: accrualFundEmps,
    sheetSize,
    colspanNum,
    allColSpanNum,
    fixedColumn,
    groupColumn,
    titleColSpan,
    restColSpan,
    blocksNum,
    payFundNames: payFundVals,
    isDep: params.departmentID ? { depName: `${departmentName} ${departmentName && params.includeSubDep ? UB.i18n('(з підлеглими)') : ''}` } : null,
    allSumArr,
    depts
  }
}

function getFOPData (params) {
  const periodCalcName = params.periodToDateTo.getFullYear() === params.periodFromDateFrom.getFullYear() && params.periodFromDateFrom.getMonth() === params.periodToDateTo.getMonth()
    ? `${params.periodFromDateFrom.getMonth() + 1}.${params.periodFromDateFrom.getFullYear()}`
    : params.periodToDateTo.getFullYear() === params.periodFromDateFrom.getFullYear()
      ? `${params.periodFromDateFrom.getMonth() + 1}-${params.periodToDateTo.getMonth() + 1}.${params.periodToDateTo.getFullYear()}`
      : `${params.periodFromDateFrom.getMonth() + 1}.${params.periodFromDateFrom.getFullYear()}-${params.periodToDateTo.getMonth() + 1}.${params.periodToDateTo.getFullYear()}`

  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)

  const sqlDialect = entityBaseService.getSQLDialect()
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.organizationID)
  const idParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'valuesID', 'listParamID.shortName'])
    .where('[listParamID.code]', 'in', ['FOZP', 'FDZP', 'ZKV', '1yesCostWork', '2notCostWork'], 'cond1')
    .where('[listParamID.code]', 'like', '%_groupCat', 'cond2')
    .where('[orgID]', '=', Number(parentOrdID || params.organizationID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject()

  const payElIDsFOZP = idParams.filter(idParam => idParam['listParamID.code'] === 'FOZP').map(idParam => idParam.valuesID)
  const payElIDsFDZP = idParams.filter(idParam => idParam['listParamID.code'] === 'FDZP').map(idParam => idParam.valuesID)
  const payElIDsZKV = idParams.filter(idParam => idParam['listParamID.code'] === 'ZKV').map(idParam => idParam.valuesID)
  const payElIDs1yesCostWork = idParams.filter(idParam => idParam['listParamID.code'] === '1yesCostWork').map(idParam => idParam.valuesID)
  const payElIDs2notCostWork = idParams.filter(idParam => idParam['listParamID.code'] === '2notCostWork').map(idParam => idParam.valuesID)
  const payElIDsGroupCats = idParams.filter(idParam => idParam['listParamID.code'].includes('_groupCat'))

  const hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  let orgIDs = [params.organizationID]
  if (params.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  }

  let deptIDs = null
  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs(['name', 'mi_treePath'])
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.periodTo })
    .selectSingle() : null
  if (department) {
    params.departmentName = department.name
    department.fullPath = department.mi_treePath.slice(0, -1).slice(1).split('/')
    department.fullPath = department.fullPath.map(depID => {
      let dep = UB.Repository('hr_department')
        .attrs(['ID', 'name'])
        .selectById(parseInt(depID, 10))
      return { depName: dep ? dep.name : false }
    }).filter(el => el.depName)
    department.fullPath[department.fullPath.length - 1].depName += params.includeSubDep ? UB.i18n(` з підлеглими`) : ''
  }

  if (params.includeSubDep) {
    const departments = UB.Repository('hr_department')
      .attrs(['mi_data_id'])
      .where('orgID', 'in', orgIDs)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', params.periodTo)
      .where('mi_dateTo', '>=', params.periodTo)
      .where('mi_treePath', 'startsWith', department.mi_treePath)
      .misc({ __mip_recordhistory_all: true })
      .groupBy('mi_data_id')
      .selectAsObject()
    if (departments.length) {
      deptIDs = departments.map(o => o.mi_data_id)
    } else {
      deptIDs = [params.departmentID]
    }
  } else {
    deptIDs = params.departmentID ? [params.departmentID] : null
  }

  let orgDet = reportService.getHrOrg(params.organizationID, params.periodTo)

  function classifiedAccrual (accrual, epData = employeePositions) {
    return accrual.map(el => {
      const poss = epData.filter(o => o.employeeNumberID === el.employeeNumberID)

      let pos
      if (poss.length === 1) {
        pos = poss[0]
      } else if (poss.length) {
        pos = poss.sort((a, b) => a.dateTo > b.dateTo ? -1 : 1)[0]
      }

      el.displaySection = null
      if (pos && ['1', '2'].includes(pos['workPlace'])) {
        el.displaySection = pos ? (payElIDs1yesCostWork.includes(pos['dictCostPlaceTypeID']) ? '1yesCostWork' : payElIDs2notCostWork.includes(pos['dictCostPlaceTypeID']) ? '2notCostWork' : null) : null
      }
      el.workPlace = pos ? pos['workPlace'] : null
      el.displayCategory = []
      if (pos) {
        payElIDsGroupCats.forEach(cat => {
          if (cat['valuesID'] === pos['dictStaffCatID']) {
            el.displayCategory.push(cat['listParamID.code'])
          }
        })
      }

      el.dictStaffCatID = pos ? pos.dictStaffCatID : null
      el.organizationID = pos ? pos.organizationID : params.organizationID
      el.organizationName = pos ? pos.orgName : orgDet.name
      el.departmentID = pos ? pos.departmentID : null
      el.departmentName = pos ? pos['depName'] : null
      let orgMiTreePath = pos ? pos['orgMiTreePath'].split('/').filter(o => o).map(o => parseInt(o)) : [params.organizationID]
      el.parentOrgID = orgMiTreePath[orgMiTreePath.length - 1]
      return el
    })
  }

  const employeePositionDS = UB.DataStore('hr_accrual')
  const periodsByDate = periodService.getPeriodsByDate(params.organizationID, params.periodFrom, params.periodTo)
  const employeePositions = []
  let accrual = []

  periodsByDate.forEach(periodItem => {
    employeePositionDS.runSQL(`SELECT
    p.ID "ID",
    p.employeeNumberID "employeeNumberID",
    p.workPlace "workPlace",
    p.dictStaffCatID "dictStaffCatID",
    sc.code "dictStaffCatCode",
    p.organizationID "organizationID",
    p.dateTo as "dateTo"
   ,(SELECT ${sqlDialect.top}
        d.mi_data_id
      FROM hr_department d
      WHERE d.orgID = p.organizationID
      AND d.parentUnitID${entityBaseService.getInExpression('structIDs')} 
      AND d.state = 'ACTIVE'
      AND d.mi_dateFrom <= :periodTo:
      AND d.mi_deleteDate >= '9999-12-31'
      AND (SELECT ${sqlDialect.top}
          dep.mi_treePath
        FROM hr_department dep
        WHERE dep.mi_data_id = p.departmentID
        AND dep.state = 'ACTIVE'
        AND d.mi_deleteDate >= '9999-12-31'
        ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit})
      LIKE CONCAT('%', d.mi_treePath, '%') ${sqlDialect.limit})
    AS "departmentID"
  
   ,(SELECT ${sqlDialect.top}
        d.description
      FROM hr_department d
      WHERE d.orgID = p.organizationID
      AND d.parentUnitID${entityBaseService.getInExpression('structIDs')} 
      AND d.state = 'ACTIVE'
      AND d.mi_dateFrom <= :periodTo:
      AND d.mi_deleteDate >= '9999-12-31'
      AND (SELECT ${sqlDialect.top}
          dep.mi_treePath
        FROM hr_department dep
        WHERE dep.mi_data_id = p.departmentID
        AND dep.state = 'ACTIVE'
        AND d.mi_deleteDate >= '9999-12-31'
        ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit})
      LIKE CONCAT('%', d.mi_treePath, '%') ${sqlDialect.limit})
    AS "depName"
  
   ,(SELECT ${sqlDialect.top}
        org.description
      FROM hr_organization org
      WHERE org.mi_data_id = p.organizationID
      AND org.state = 'ACTIVE'
      AND org.mi_dateFrom <= :periodTo:
      AND org.mi_deleteDate >= '9999-12-31'
      ORDER BY org.mi_dateTo DESC ${sqlDialect.limit})
    AS "orgName"
   ,(SELECT ${sqlDialect.top}
        dct.dictCostPlaceTypeID
      FROM ac_dictCostType dct
      WHERE dct.ID = p.d0Value
      OR dct.ID = p.d1Value
      OR dct.ID = p.d2Value
      OR dct.ID = p.d3Value
      OR dct.ID = p.d4Value
      OR dct.ID = p.d5Value
      OR dct.ID = p.d6Value
      OR dct.ID = p.d7Value
      OR dct.ID = p.d8Value
      OR dct.ID = p.d9Value
    ${sqlDialect.limit} )
    AS "dictCostPlaceTypeID"
  
  ,(select mi_treePath from hr_organization org where org.ID = p.organizationID) as "orgMiTreePath"
  ,(select parentUnitID from hr_organization org where org.ID = p.organizationID) as "orgParentUnitID"
  
  FROM hr_employeePosition p
  LEFT JOIN hr_dictStaffCat sc
    ON sc.ID = p.dictStaffCatID
  
  WHERE p.organizationID${entityBaseService.getInExpression('orgIDs')}
    AND
    p.employeeNumberID ${params.employeeNumberID ? `= ${params.employeeNumberID}` : `in (SELECT
      acc.employeeNumberID
      FROM hr_accrual acc
      LEFT JOIN hr_payEl pl
      ON acc.payElID = pl.ID
      LEFT JOIN hr_method m
      ON pl.methodID = m.ID
      LEFT JOIN hr_methodGroup g
      ON g.ID = m.methodGroupID
        AND g.groupType = 'PAYMENT'
      WHERE acc.orgID${entityBaseService.getInExpression('orgIDs')} AND
      ((acc.periodCalc = :periodFrom: AND acc.periodSalary <= :periodFrom: ) OR (acc.periodCalc < :periodFrom: AND acc.periodSalary = :periodFrom: )) AND 
      acc.flagsRec & 8192 = 0
      GROUP BY acc.employeeNumberID)`}
      
    AND 
    p.dateFrom = (select ${sqlDialect.top}
      ep2.dateFrom from hr_employeePosition ep2
      JOIN hr_employeeNumber n on n.ID = ep2.employeeNumberID
      left JOIN hr_employee e on e.ID = ep2.employeeID
      where ep2.employeeNumberID = p.employeeNumberID
      and ep2.mi_deleteDate >= '9999-12-31' 
      and ep2.isActive = 1 and ep2.dateFrom <= :periodTo:        
      ${deptIDs ? `and p.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
      ${params.isIncludeOnlyWoman ? `and e.sexType = 'W'` : ''}
      order by ep2.dateFrom desc ${sqlDialect.limit})
    AND p.isActive = 1
    AND p.mi_deleteDate >= '9999-12-31' 
    ORDER BY p.dateTo DESC`, {
      orgIDs,
      deptIDs,
      structIDs: !params.departmentID ? orgIDs : deptIDs,
      periodFrom: periodItem.dateFrom,
      periodTo: periodItem.dateTo
    })

    const employeePositionPeriod = employeePositionDS.getAsJsObject()
    const ids = employeePositions.length ? employeePositions.map(o => o.ID) : []
    employeePositions.push(...ids ? employeePositionPeriod.filter(o => !ids.includes(o.ID)) : employeePositionPeriod)

    const accrualDS = UB.Repository('hr_accrual')
      .attrs(['employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'periodCalc', 'periodSalary', 'sum([paySum])', 'payElID', 'payElID.codeSort', 'payElID.code', 'payElID.name'])
      .where('orgID', 'in', orgIDs)
      .whereIf(!employeePositionPeriod.length, 'employeeNumberID', '=', 0)
      .whereIf(employeePositionPeriod.length, 'employeeNumberID', 'in', employeePositionPeriod.map(o => o.employeeNumberID))
      .where('periodCalc', '=', periodItem.dateFrom, 'pc1')
      .where('periodSalary', '<=', periodItem.dateFrom, 'pc1_1')
      .where('periodCalc', '<', periodItem.dateFrom, 'pc2')
      .where('periodSalary', '=', periodItem.dateFrom, 'pc3')
      .where('flagsRecSum', '!=', 8192)
      .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
      .logic('(([pc1] and [pc1_1]) or ([pc2] and [pc3]))')
      .orderBy('payElID.codeSort')
      .orderBy('periodSalary')
      .groupBy(['payElID.code', 'payElID.name', 'payElID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID', 'payElID.codeSort', 'periodCalc', 'periodSalary'])
      .selectAsObject()
    accrual.push(...classifiedAccrual(accrualDS, employeePositionPeriod))
  })

  const lastDateFrom = periodsByDate && periodsByDate[periodsByDate.length - 1] && periodsByDate[periodsByDate.length - 1].dateFrom
  const employeeNumberIDs = employeePositions.length ? _.uniq(employeePositions.map(o => o.employeeNumberID)) : []
  let accrualFuture = lastDateFrom ? UB.Repository('hr_accrual')
    .attrs(['employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'periodCalc', 'periodSalary', 'sum([paySum])', 'payElID', 'payElID.code', 'payElID.codeSort', 'payElID.name'])
    .where('orgID', 'in', orgIDs)
    .whereIf(employeeNumberIDs.length, 'employeeNumberID', 'in', employeeNumberIDs)
    .where('periodCalc', '=', lastDateFrom)
    .where('periodSalary', '>', lastDateFrom)
    .where('flagsRecSum', '!=', 8192)
    .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
    .orderBy('payElID.codeSort')
    .orderBy('periodSalary')
    .groupBy(['payElID.code', 'payElID.name', 'payElID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID', 'payElID.codeSort', 'periodCalc', 'periodSalary'])
    .selectAsObject() : []

  // accrual = classifiedAccrual(accrual)
  accrualFuture = classifiedAccrual(accrualFuture)

  let listCostWork = getListCostWork('1yesCostWork', accrual, payElIDsGroupCats)
  let listYesCostWork = listCostWork.listCostWork
  let colListYesCostWork = listCostWork.colListCostWork

  let listCostWorkFuture = getListCostWork('1yesCostWork', accrualFuture, payElIDsGroupCats)
  let listYesCostWorkFuture = listCostWorkFuture.listCostWork
  colListYesCostWork.concat(listCostWorkFuture.colListCostWork.filter(el => colListYesCostWork.includes({ colName: el.colName })))

  listCostWork = getListCostWork('2notCostWork', accrual, payElIDsGroupCats)
  let listNotCostWork = listCostWork.listCostWork
  let colListNotCostWork = listCostWork.colListCostWork

  listCostWorkFuture = getListCostWork('2notCostWork', accrualFuture, payElIDsGroupCats)
  let listNotCostWorkFuture = listCostWorkFuture.listCostWork
  colListNotCostWork.concat(listCostWorkFuture.colListCostWork.filter(el => colListNotCostWork.includes({ colName: el.colName })))

  let listOtherWork = {}
  if (accrual.filter(el => el.displaySection === null)) {
    listOtherWork = { 'Категорії групи Інші': accrual.filter(el => el.displaySection === null) }
  }
  let listOtherWorkFuture = {}
  if (accrualFuture.filter(el => el.displaySection === null)) {
    listOtherWorkFuture = { 'Категорії групи Інші': accrualFuture.filter(el => el.displaySection === null) }
  }

  let payElList = []
  let periodSalaryList = []
  let departmentList = []
  const periods = periodService.getArrayPeriods(params.organizationID, params.periodFrom)
  accrual.forEach(el => {
    if (!payElList.find(row => row.payElID === el.payElID)) {
      payElList.push({ payElID: el.payElID, payElCodeSort: el['payElID.codeSort'], payElCode: el['payElID.code'], payElName: el['payElID.name'] })
    }

    if (params.includeSubOrg && !params.departmentID) {
      if (!departmentList.find(row => row.ID === el.parentOrgID)) {
        departmentList.push({ ID: el.parentOrgID, departmentName: el.organizationName, payElID: el.payElID })
      }
    } else {
      if (!departmentList.find(row => row.ID === el.departmentID)) {
        departmentList.push({ ID: el.departmentID, departmentName: el.departmentName, payElID: el.payElID })
      }
    }

    if (!periodSalaryList.includes(el.periodSalary)) {
      periodSalaryList.push(el.periodSalary)
    }
  })
  let payElListFuture = []
  let periodSalaryListFuture = []
  accrualFuture.forEach(el => {
    if (!payElListFuture.find(row => row.payElID === el.payElID)) {
      payElListFuture.push({ payElID: el.payElID, payElCodeSort: el['payElID.codeSort'], payElCode: el['payElID.code'], payElName: el['payElID.name'] })
    }
    if (!periodSalaryListFuture.includes(el.periodSalary)) {
      periodSalaryListFuture.push(el.periodSalary)
    }
  })

  payElList = payElList.map(payEl => {
    let tempListYesCostWork = {}
    Object.keys(listYesCostWork).forEach(key => {
      tempListYesCostWork[key] = listYesCostWork[key].filter(o => o.payElID === payEl.payElID)
    })

    let tempListNotCostWork = {}
    Object.keys(listNotCostWork).forEach(key => {
      tempListNotCostWork[key] = listNotCostWork[key].filter(o => o.payElID === payEl.payElID)
    })

    let tempListOtherWork = {}
    Object.keys(listOtherWork).forEach(key => {
      tempListOtherWork[key] = listOtherWork[key].filter(o => o.payElID === payEl.payElID)
    })
    return {
      payElID: payEl.payElID,
      payElCode: payEl.payElCode,
      payElCodeSort: payEl.payElCodeSort,
      payElName: payEl.payElName,
      listYesCostWork: tempListYesCostWork,
      listNotCostWork: tempListNotCostWork,
      listOtherWork: tempListOtherWork
    }
  }).sort((a, b) => a.payElCode > b.payElCode ? 1 : 0)

  departmentList = departmentList.map(dep => {
    let tempListYesCostWork = {}
    Object.keys(listYesCostWork).forEach(key => {
      if (params.includeSubOrg && !params.departmentID) {
        tempListYesCostWork[key] = listYesCostWork[key].filter(o => o.parentOrgID === dep.ID)
      } else {
        tempListYesCostWork[key] = listYesCostWork[key].filter(o => o.departmentID === dep.ID)
      }
    })

    let tempListNotCostWork = {}
    Object.keys(listNotCostWork).forEach(key => {
      if (params.includeSubOrg && !params.departmentID) {
        tempListNotCostWork[key] = listNotCostWork[key].filter(o => o.parentOrgID === dep.ID)
      } else {
        tempListNotCostWork[key] = listNotCostWork[key].filter(o => o.departmentID === dep.ID)
      }
    })

    let tempListOtherWork = {}
    Object.keys(listOtherWork).forEach(key => {
      if (params.includeSubOrg && !params.departmentID) {
        tempListOtherWork[key] = listOtherWork[key].filter(o => o.parentOrgID === dep.ID)
      } else {
        tempListOtherWork[key] = listOtherWork[key].filter(o => o.departmentID === dep.ID)
      }
    })
    return {
      departmentID: dep.ID,
      departmentName: dep.departmentName,
      listYesCostWork: tempListYesCostWork,
      listNotCostWork: tempListNotCostWork,
      listOtherWork: tempListOtherWork
    }
  })

  payElListFuture = payElListFuture.map(payEl => {
    let tempListYesCostWork = {}
    Object.keys(listYesCostWorkFuture).forEach(key => {
      tempListYesCostWork[key] = listYesCostWorkFuture[key].filter(o => o.payElID === payEl.payElID)
    })

    let tempListNotCostWork = {}
    Object.keys(listNotCostWorkFuture).forEach(key => {
      tempListNotCostWork[key] = listNotCostWorkFuture[key].filter(o => o.payElID === payEl.payElID)
    })

    let tempListOtherWork = {}
    Object.keys(listOtherWorkFuture).forEach(key => {
      tempListOtherWork[key] = listOtherWorkFuture[key].filter(o => o.payElID === payEl.payElID)
    })
    return {
      payElID: payEl.payElID,
      payElCode: payEl.payElCode,
      payElCodeSort: payEl.payElCodeSort,
      payElName: payEl.payElName,
      listYesCostWork: tempListYesCostWork,
      listNotCostWork: tempListNotCostWork,
      listOtherWork: tempListOtherWork
    }
  }).sort((a, b) => a.payElCode > b.payElCode ? 1 : 0)

  let FOZP = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElList, periodSalaryList, periodCalcName, payElIDsFOZP, params, periods)
  let ZKV = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElList, periodSalaryList, periodCalcName, payElIDsZKV, params, periods)
  let FDZP = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElList, periodSalaryList, periodCalcName, payElIDsFDZP, params, periods)
  let OTHER = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElList, periodSalaryList, periodCalcName, payElIDsFOZP.concat(payElIDsFDZP, payElIDsZKV), params, periods, true)

  let SUMMARY = {
    periodCalcName,
    staffSum_all: currencyService.round(OTHER.sectionSummary.staffSum_all + FOZP.sectionSummary.staffSum_all + FDZP.sectionSummary.staffSum_all + ZKV.sectionSummary.staffSum_all),
    otherSum_all: currencyService.round(OTHER.sectionSummary.otherSum_all + FOZP.sectionSummary.otherSum_all + FDZP.sectionSummary.otherSum_all + ZKV.sectionSummary.otherSum_all),
    allSum_all: currencyService.round(OTHER.sectionSummary.allSum_all + FOZP.sectionSummary.allSum_all + FDZP.sectionSummary.allSum_all + ZKV.sectionSummary.allSum_all),
    staffSum_calc: currencyService.round(OTHER.sectionSummary.staffSum_calc + FOZP.sectionSummary.staffSum_calc + FDZP.sectionSummary.staffSum_calc + ZKV.sectionSummary.staffSum_calc),
    otherSum_calc: currencyService.round(OTHER.sectionSummary.otherSum_calc + FOZP.sectionSummary.otherSum_calc + FDZP.sectionSummary.otherSum_calc + ZKV.sectionSummary.otherSum_calc),
    allSum_calc: currencyService.round(OTHER.sectionSummary.allSum_calc + FOZP.sectionSummary.allSum_calc + FDZP.sectionSummary.allSum_calc + ZKV.sectionSummary.allSum_calc),
    staffSum_otherPeriods: currencyService.round(OTHER.sectionSummary.staffSum_otherPeriods + FOZP.sectionSummary.staffSum_otherPeriods + FDZP.sectionSummary.staffSum_otherPeriods + ZKV.sectionSummary.staffSum_otherPeriods),
    otherSum_otherPeriods: currencyService.round(OTHER.sectionSummary.otherSum_otherPeriods + FOZP.sectionSummary.otherSum_otherPeriods + FDZP.sectionSummary.otherSum_otherPeriods + ZKV.sectionSummary.otherSum_otherPeriods),
    allSum_otherPeriods: currencyService.round(OTHER.sectionSummary.allSum_otherPeriods + FOZP.sectionSummary.allSum_otherPeriods + FDZP.sectionSummary.allSum_otherPeriods + ZKV.sectionSummary.allSum_otherPeriods),
    yesCostWorkCatSum: [],
    yesCostWorkCatSum_calc: [],
    yesCostWorkCatSum_otherPeriods: [],
    notCostWorkCatSum: [],
    notCostWorkCatSum_calc: [],
    notCostWorkCatSum_otherPeriods: []
  }
  OTHER.sectionSummary.yesCostWorkCatSum.forEach((el, idx) => {
    SUMMARY.yesCostWorkCatSum.push({ value: currencyService.round(el.value + FOZP.sectionSummary.yesCostWorkCatSum[idx].value + FDZP.sectionSummary.yesCostWorkCatSum[idx].value + ZKV.sectionSummary.yesCostWorkCatSum[idx].value) })
  })
  OTHER.sectionSummary.yesCostWorkCatSum_calc.forEach((el, idx) => {
    SUMMARY.yesCostWorkCatSum_calc.push({ value: currencyService.round(el.value + FOZP.sectionSummary.yesCostWorkCatSum_calc[idx].value + FDZP.sectionSummary.yesCostWorkCatSum_calc[idx].value + ZKV.sectionSummary.yesCostWorkCatSum_calc[idx].value) })
  })
  OTHER.sectionSummary.yesCostWorkCatSum_otherPeriods.forEach((el, idx) => {
    SUMMARY.yesCostWorkCatSum_otherPeriods.push({ value: currencyService.round(el.value + FOZP.sectionSummary.yesCostWorkCatSum_otherPeriods[idx].value + FDZP.sectionSummary.yesCostWorkCatSum_otherPeriods[idx].value + ZKV.sectionSummary.yesCostWorkCatSum_otherPeriods[idx].value) })
  })
  OTHER.sectionSummary.notCostWorkCatSum.forEach((el, idx) => {
    SUMMARY.notCostWorkCatSum.push({ value: currencyService.round(el.value + FOZP.sectionSummary.notCostWorkCatSum[idx].value + FDZP.sectionSummary.notCostWorkCatSum[idx].value + ZKV.sectionSummary.notCostWorkCatSum[idx].value) })
  })
  OTHER.sectionSummary.notCostWorkCatSum_calc.forEach((el, idx) => {
    SUMMARY.notCostWorkCatSum_calc.push({ value: currencyService.round(el.value + FOZP.sectionSummary.notCostWorkCatSum_calc[idx].value + FDZP.sectionSummary.notCostWorkCatSum_calc[idx].value + ZKV.sectionSummary.notCostWorkCatSum_calc[idx].value) })
  })
  OTHER.sectionSummary.notCostWorkCatSum_otherPeriods.forEach((el, idx) => {
    SUMMARY.notCostWorkCatSum_otherPeriods.push({ value: currencyService.round(el.value + FOZP.sectionSummary.notCostWorkCatSum_otherPeriods[idx].value + FDZP.sectionSummary.notCostWorkCatSum_otherPeriods[idx].value + ZKV.sectionSummary.notCostWorkCatSum_otherPeriods[idx].value) })
  })
  params.organizationName = hrOrg.description
  let FOPDep = getFOPDepSectionData(colListYesCostWork, colListNotCostWork, departmentList, periodCalcName, payElIDsFOZP.concat(payElIDsFDZP, payElIDsZKV), params)

  let FOZPFuture = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElListFuture, periodSalaryListFuture, periodCalcName, payElIDsFOZP, params, periods).sectionSummary
  let ZKVFuture = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElListFuture, periodSalaryListFuture, periodCalcName, payElIDsZKV, params, periods).sectionSummary
  let FDZPFuture = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElListFuture, periodSalaryListFuture, periodCalcName, payElIDsFDZP, params, periods).sectionSummary
  let OTHERFuture = getFOPSectionData(colListYesCostWork, colListNotCostWork, payElListFuture, periodSalaryListFuture, periodCalcName, payElIDsFOZP.concat(payElIDsFDZP, payElIDsZKV), params, periods, true).sectionSummary
  FOZPFuture.sectionName = UB.i18n('Фонд основної заробітної плати')
  FDZPFuture.sectionName = UB.i18n('Фонд додаткової заробітної плати')
  ZKVFuture.sectionName = UB.i18n('Інші заохочувальні та компенсаційні виплати')
  OTHERFuture.sectionName = UB.i18n('Інші виплати, що не входять у ФОП')

  let SUMMARYFuture = {
    staffSum_all: currencyService.round(FOZPFuture.staffSum_all + ZKVFuture.staffSum_all + FDZPFuture.staffSum_all + OTHERFuture.staffSum_all),
    otherSum_all: currencyService.round(FOZPFuture.otherSum_all + ZKVFuture.otherSum_all + FDZPFuture.otherSum_all + OTHERFuture.otherSum_all),
    allSum_all: currencyService.round(FOZPFuture.allSum_all + ZKVFuture.allSum_all + FDZPFuture.allSum_all + OTHERFuture.allSum_all),
    yesCostWorkCatSum: [],
    notCostWorkCatSum: []
  }
  OTHERFuture.yesCostWorkCatSum.forEach((el, idx) => {
    SUMMARYFuture.yesCostWorkCatSum.push({ value: currencyService.round(el.value + FOZPFuture.yesCostWorkCatSum[idx].value + FDZPFuture.yesCostWorkCatSum[idx].value + ZKVFuture.yesCostWorkCatSum[idx].value) })
  })
  OTHERFuture.notCostWorkCatSum.forEach((el, idx) => {
    SUMMARYFuture.notCostWorkCatSum.push({ value: currencyService.round(el.value + FOZPFuture.notCostWorkCatSum[idx].value + FDZPFuture.notCostWorkCatSum[idx].value + ZKVFuture.notCostWorkCatSum[idx].value) })
  })

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }
  return {
    period: periodName, // params.periodRaw,
    orgName: `${hrOrg.name} ${department ? '' : params.includeSubOrg ? UB.i18n(` (з підлеглими)`) : ''}`,
    department: department ? department.fullPath : [],
    isIncludeOnlyWoman: params.isIncludeOnlyWoman,
    colCount: 8 + (colListYesCostWork.length || 1) + (colListNotCostWork.length || 1),
    sheetWidth: (((colListYesCostWork.length || 1) + (colListNotCostWork.length || 1)) * 80) + 650,
    colYesWidth: (colListYesCostWork.length || 1) * 80,
    colNotWidth: (colListNotCostWork.length || 1) * 80,
    colListYesCostWork: colListYesCostWork.length ? colListYesCostWork : [{ colName: '' }],
    colListNotCostWork: colListNotCostWork.length ? colListNotCostWork : [{ colName: '' }],
    FOZP: FOZP.section,
    FOZPSum: FOZP.sectionSummary,
    FDZP: FDZP.section,
    FDZPSum: FDZP.sectionSummary,
    ZKV: ZKV.section,
    ZKVSum: ZKV.sectionSummary,
    OTHER: OTHER.section,
    OTHERSum: OTHER.sectionSummary,
    SUMMARY: SUMMARY,
    FOPDep: FOPDep.section,
    FOPDepSum: FOPDep.sectionSummary,
    FUTURE: [FOZPFuture, FDZPFuture, ZKVFuture, OTHERFuture],
    SUMMARYFuture: SUMMARYFuture
  }
}

function getListCostWork (displaySection, accrual, payElIDsGroupCats) {
  let colListCostWork = []
  let listCostWork = {}
  let listCostWorkOther = []
  accrual.filter(el => el.displaySection === displaySection).forEach(el => {
    if (el.displayCategory.length) {
      el.displayCategory.forEach(cat => {
        let catName = payElIDsGroupCats.find(o => o['listParamID.code'] === cat)['listParamID.shortName']
        if (listCostWork[catName]) {
          listCostWork[catName].push(el)
        } else {
          listCostWork[catName] = [el]
          colListCostWork.push({ colName: catName, colCode: cat })
        }
      })
    } else {
      listCostWorkOther.push(el)
    }
  })

  colListCostWork = colListCostWork.sort((a, b) => (a.colCode > b.colCode) ? 1 : ((b.colCode > a.colCode) ? -1 : 0))

  let sortedList = {}
  colListCostWork.forEach(el => {
    sortedList[el.colName] = listCostWork[el.colName]
  })

  listCostWork = sortedList
  if (listCostWorkOther.length) {
    listCostWork['Категорії групи Інші'] = listCostWorkOther
    colListCostWork.push({ colName: 'Інші' })
  }
  colListCostWork.push({ colName: 'Всього' })
  return { colListCostWork, listCostWork }
}

function getFOPSectionData (colListYesCostWorkList, colListNotCostWorkList, payElList, periodSalaryIDList, periodCalcName, payElIDsOfSection, params, periods, isExclude = false) {
  let section = []
  let sectionSummary = {
    periodCalcName: periodCalcName,
    yesCostWorkCatSum: { },
    notCostWorkCatSum: { },
    staffSum_all: 0,
    otherSum_all: 0,
    allSum_all: 0,

    yesCostWorkCatSum_calc: { },
    notCostWorkCatSum_calc: { },
    staffSum_calc: 0,
    otherSum_calc: 0,
    allSum_calc: 0,

    yesCostWorkCatSum_otherPeriods: { },
    notCostWorkCatSum_otherPeriods: { },
    staffSum_otherPeriods: 0,
    otherSum_otherPeriods: 0,
    allSum_otherPeriods: 0
  }
  colListYesCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.yesCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  colListNotCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.notCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  if (!sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }
  if (!sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }
  payElList.forEach(payEl => {
    let cond = (!isExclude ? payElIDsOfSection.includes(payEl.payElID) : !payElIDsOfSection.includes(payEl.payElID))
    if (cond) {
      let lineCounter = 0
      let colListYesCostWorkPayEl = []
      let colListNotCostWorkPayEl = []
      let staffSumPayEl = 0
      let otherSumPayEl = 0
      let allSumPayEl = 0

      let periodSalaryList = periodSalaryIDList.map(periodSalary => {
        let tempListYesCostWork = {}
        Object.keys(payEl.listYesCostWork).forEach(key => {
          tempListYesCostWork[key] = payEl.listYesCostWork[key].filter(o => o.periodSalary === periodSalary)
        })

        let tempListNotCostWork = {}
        Object.keys(payEl.listNotCostWork).forEach(key => {
          tempListNotCostWork[key] = payEl.listNotCostWork[key].filter(o => o.periodSalary === periodSalary)
        })

        let tempListOtherWork = {}
        Object.keys(payEl.listOtherWork).forEach(key => {
          tempListOtherWork[key] = payEl.listOtherWork[key].filter(o => o.periodSalary === periodSalary)
        })
        return {
          periodSalary,
          listYesCostWork: tempListYesCostWork,
          listNotCostWork: tempListNotCostWork,
          listOtherWork: tempListOtherWork
        }
      })
      periodSalaryList.forEach(period => {
        let colListYesCostWork = []
        let colListNotCostWork = []
        let staffSum = 0
        let otherSum = 0
        let yesCostWorkSum = 0
        let notCostWorkSum = 0

        Object.keys(period.listYesCostWork).forEach(key => {
          let sumForCat = 0
          period.listYesCostWork[key].forEach(accrual => {
            sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
            if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
              // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
              sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? sectionSummary.yesCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_calc += accrual['sum([paySum])']
            } else {
              sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? sectionSummary.yesCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
            }
          })
          staffSum += sumForCat
          yesCostWorkSum += sumForCat
          colListYesCostWork.push({
            catName: key,
            value: currencyService.round(sumForCat)
          })
          let index = colListYesCostWorkPayEl.findIndex(el => el.catName === key)
          if (index >= 0) {
            colListYesCostWorkPayEl[index].value = currencyService.round(colListYesCostWorkPayEl[index].value + sumForCat)
          } else {
            colListYesCostWorkPayEl.push({
              catName: key,
              value: currencyService.round(sumForCat)
            })
          }
          sectionSummary.yesCostWorkCatSum[key] = sectionSummary.yesCostWorkCatSum[key] ? sectionSummary.yesCostWorkCatSum[key] + sumForCat : sumForCat
          sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_calc[key]) : 0
          sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_otherPeriods[key]) : 0
        })
        colListYesCostWork.push({
          catName: 'Всього',
          value: currencyService.round(yesCostWorkSum)
        })
        let index = colListYesCostWorkPayEl.findIndex(el => el.catName === 'Всього')
        if (index >= 0) {
          colListYesCostWorkPayEl[index].value = currencyService.round(colListYesCostWorkPayEl[index].value + yesCostWorkSum)
        } else {
          colListYesCostWorkPayEl.push({
            catName: 'Всього',
            value: currencyService.round(yesCostWorkSum)
          })
        }
        sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] + yesCostWorkSum)

        Object.keys(period.listNotCostWork).forEach(key => {
          let sumForCat = 0
          period.listNotCostWork[key].forEach(accrual => {
            sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
            // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
            if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
              sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? sectionSummary.notCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_calc += accrual['sum([paySum])']
            } else {
              sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? sectionSummary.notCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
              sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
            }
          })
          staffSum += sumForCat
          notCostWorkSum += sumForCat
          colListNotCostWork.push({
            catName: key,
            value: currencyService.round(sumForCat)
          })
          let index = colListNotCostWorkPayEl.findIndex(el => el.catName === key)
          if (index >= 0) {
            colListNotCostWorkPayEl[index].value = currencyService.round(colListNotCostWorkPayEl[index].value + sumForCat)
          } else {
            colListNotCostWorkPayEl.push({
              catName: key,
              value: currencyService.round(sumForCat)
            })
          }
          sectionSummary.notCostWorkCatSum[key] = sectionSummary.notCostWorkCatSum[key] ? sectionSummary.notCostWorkCatSum[key] + sumForCat : sumForCat
          sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_calc[key]) : 0
          sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_otherPeriods[key]) : 0
        })
        colListNotCostWork.push({
          catName: 'Всього',
          value: currencyService.round(notCostWorkSum)
        })
        index = colListNotCostWorkPayEl.findIndex(el => el.catName === 'Всього')
        if (index >= 0) {
          colListNotCostWorkPayEl[index].value = currencyService.round(colListNotCostWorkPayEl[index].value + notCostWorkSum)
        } else {
          colListNotCostWorkPayEl.push({
            catName: 'Всього',
            value: currencyService.round(notCostWorkSum)
          })
        }
        sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] + notCostWorkSum)

        Object.keys(period.listOtherWork).forEach(key => {
          period.listOtherWork[key].forEach(accrual => {
            otherSum += accrual['sum([paySum])']
            // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
            if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
              sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc + accrual['sum([paySum])'])
            } else {
              sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods + accrual['sum([paySum])'])
            }
          })
        })

        sectionSummary.staffSum_all += staffSum
        sectionSummary.otherSum_all += otherSum
        sectionSummary.allSum_all += otherSum + staffSum

        staffSumPayEl = currencyService.round(staffSumPayEl + staffSum)
        otherSumPayEl = currencyService.round(otherSumPayEl + otherSum)
        allSumPayEl = currencyService.round(staffSumPayEl + otherSumPayEl)

        sectionSummary.allSum_calc = sectionSummary.staffSum_calc + sectionSummary.otherSum_calc
        sectionSummary.allSum_otherPeriods = sectionSummary.staffSum_otherPeriods + sectionSummary.otherSum_otherPeriods

        if (staffSum !== 0 || otherSum !== 0) {
          const periodSalaryName = periods.find(o => o.dateFrom.getTime() === dateService.shiftDate(period.periodSalary).getTime())
          lineCounter++
          section.push({
            isPayElLine: true,
            payElName: payEl.payElName,
            payElCode: payEl.payElCode,
            periodSalaryName: periodSalaryName ? periodSalaryName.name : '',
            colListYesCostWork,
            colListNotCostWork,
            staffSum: currencyService.round(staffSum),
            otherSum: currencyService.round(otherSum),
            allSum: currencyService.round(staffSum + otherSum)
          })
        }
      })

      if (lineCounter > 1) {
        section.push({
          isSubSumLine: true,
          payElName: payEl.payElName,
          colListYesCostWork: colListYesCostWorkPayEl,
          colListNotCostWork: colListNotCostWorkPayEl,
          staffSum: currencyService.round(staffSumPayEl),
          otherSum: currencyService.round(otherSumPayEl),
          allSum: currencyService.round(allSumPayEl)
        })
      }
    }
  })

  let yesCostWorkCatSumList = []
  let notCostWorkCatSumList = []
  let yesCostWorkCatSumListCalc = []
  let notCostWorkCatSumListCalc = []
  let yesCostWorkCatSumListOtherPeriods = []
  let notCostWorkCatSumListOtherPeriods = []
  Object.keys(sectionSummary.yesCostWorkCatSum).forEach(key => yesCostWorkCatSumList.push({ value: sectionSummary.yesCostWorkCatSum[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum).forEach(key => notCostWorkCatSumList.push({ value: sectionSummary.notCostWorkCatSum[key] }))
  sectionSummary.yesCostWorkCatSum = yesCostWorkCatSumList
  sectionSummary.notCostWorkCatSum = notCostWorkCatSumList

  Object.keys(sectionSummary.yesCostWorkCatSum_calc).forEach(key => yesCostWorkCatSumListCalc.push({ value: sectionSummary.yesCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_calc).forEach(key => notCostWorkCatSumListCalc.push({ value: sectionSummary.notCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.yesCostWorkCatSum_otherPeriods).forEach(key => yesCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.yesCostWorkCatSum_otherPeriods[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_otherPeriods).forEach(key => notCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.notCostWorkCatSum_otherPeriods[key] }))

  let yesCostWorkCatSumCalcSum = 0
  let notCostWorkCatSumCalcSum = 0
  let yesCostWorkCatSumOtherPeriodsSum = 0
  let notCostWorkCatSumOtherPeriodsSum = 0

  yesCostWorkCatSumListCalc.forEach(el => {
    yesCostWorkCatSumCalcSum += el.value
  })
  yesCostWorkCatSumListCalc.push({ value: currencyService.round(yesCostWorkCatSumCalcSum) })
  sectionSummary.yesCostWorkCatSum_calc = yesCostWorkCatSumListCalc

  notCostWorkCatSumListCalc.forEach(el => {
    notCostWorkCatSumCalcSum += el.value
  })
  notCostWorkCatSumListCalc.push({ value: currencyService.round(notCostWorkCatSumCalcSum) })
  sectionSummary.notCostWorkCatSum_calc = notCostWorkCatSumListCalc

  yesCostWorkCatSumListOtherPeriods.forEach(el => {
    yesCostWorkCatSumOtherPeriodsSum += el.value
  })
  yesCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(yesCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.yesCostWorkCatSum_otherPeriods = yesCostWorkCatSumListOtherPeriods

  notCostWorkCatSumListOtherPeriods.forEach(el => {
    notCostWorkCatSumOtherPeriodsSum += el.value
  })
  notCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(notCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.notCostWorkCatSum_otherPeriods = notCostWorkCatSumListOtherPeriods

  sectionSummary.staffSum_all = currencyService.round(sectionSummary.staffSum_all)
  sectionSummary.otherSum_all = currencyService.round(sectionSummary.otherSum_all)
  sectionSummary.allSum_all = currencyService.round(sectionSummary.allSum_all)
  sectionSummary.staffSum_calc = currencyService.round(sectionSummary.staffSum_calc)
  sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc)
  sectionSummary.allSum_calc = currencyService.round(sectionSummary.allSum_calc)
  sectionSummary.staffSum_otherPeriods = currencyService.round(sectionSummary.staffSum_otherPeriods)
  sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods)
  sectionSummary.allSum_otherPeriods = currencyService.round(sectionSummary.allSum_otherPeriods)

  return { section, sectionSummary }
}

function getFOPDepSectionData (colListYesCostWorkList, colListNotCostWorkList, departmentList, periodCalcName, payElIDsOfSection, params) {
  let section = []
  let sectionSummary = {
    periodCalcName: periodCalcName,
    yesCostWorkCatSum: { },
    notCostWorkCatSum: { },
    staffSum_all: 0,
    otherSum_all: 0,
    allSum_all: 0,

    yesCostWorkCatSum_calc: { },
    notCostWorkCatSum_calc: { },
    staffSum_calc: 0,
    otherSum_calc: 0,
    allSum_calc: 0,

    yesCostWorkCatSum_otherPeriods: { },
    notCostWorkCatSum_otherPeriods: { },
    staffSum_otherPeriods: 0,
    otherSum_otherPeriods: 0,
    allSum_otherPeriods: 0
  }
  colListYesCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.yesCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.yesCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  colListNotCostWorkList.forEach(el => {
    if (el.colName !== 'Всього') {
      sectionSummary.notCostWorkCatSum[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_calc[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
      sectionSummary.notCostWorkCatSum_otherPeriods[el.colName === 'Інші' ? 'Категорії групи Інші' : el.colName] = 0
    }
  })
  if (!sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }
  if (!sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього']) {
    sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = 0
  }

  departmentList.forEach(department => {
    let colListYesCostWork = []
    let colListNotCostWork = []
    let staffSum = 0
    let otherSum = 0
    let yesCostWorkSum = 0
    let notCostWorkSum = 0

    Object.keys(department.listYesCostWork).forEach(key => {
      let sumForCat = 0
      department.listYesCostWork[key].forEach(accrual => {
        sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
        // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
        if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
          sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? sectionSummary.yesCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_calc += accrual['sum([paySum])']
        } else {
          sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? sectionSummary.yesCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
        }
      })
      staffSum += sumForCat
      yesCostWorkSum += sumForCat
      colListYesCostWork.push({
        catName: key,
        value: currencyService.round(sumForCat)
      })
      sectionSummary.yesCostWorkCatSum[key] = sectionSummary.yesCostWorkCatSum[key] ? sectionSummary.yesCostWorkCatSum[key] + sumForCat : sumForCat
      sectionSummary.yesCostWorkCatSum_calc[key] = sectionSummary.yesCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_calc[key]) : 0
      sectionSummary.yesCostWorkCatSum_otherPeriods[key] = sectionSummary.yesCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.yesCostWorkCatSum_otherPeriods[key]) : 0
    })
    colListYesCostWork.push({
      catName: 'Всього',
      value: currencyService.round(yesCostWorkSum)
    })
    sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.yesCostWorkCatSum['Категорії групи ЯВсього'] + yesCostWorkSum)

    Object.keys(department.listNotCostWork).forEach(key => {
      let sumForCat = 0
      department.listNotCostWork[key].forEach(accrual => {
        sumForCat = currencyService.round(sumForCat + accrual['sum([paySum])'])
        // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
        if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodTo.getTime()) {
          sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? sectionSummary.notCostWorkCatSum_calc[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_calc += accrual['sum([paySum])']
        } else {
          sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? sectionSummary.notCostWorkCatSum_otherPeriods[key] + accrual['sum([paySum])'] : accrual['sum([paySum])']
          sectionSummary.staffSum_otherPeriods += accrual['sum([paySum])']
        }
      })
      staffSum += sumForCat
      notCostWorkSum += sumForCat
      colListNotCostWork.push({
        catName: key,
        value: currencyService.round(sumForCat)
      })
      sectionSummary.notCostWorkCatSum[key] = sectionSummary.notCostWorkCatSum[key] ? sectionSummary.notCostWorkCatSum[key] + sumForCat : sumForCat
      sectionSummary.notCostWorkCatSum_calc[key] = sectionSummary.notCostWorkCatSum_calc[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_calc[key]) : 0
      sectionSummary.notCostWorkCatSum_otherPeriods[key] = sectionSummary.notCostWorkCatSum_otherPeriods[key] ? currencyService.round(sectionSummary.notCostWorkCatSum_otherPeriods[key]) : 0
    })
    colListNotCostWork.push({
      catName: 'Всього',
      value: currencyService.round(notCostWorkSum)
    })
    sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] = currencyService.round(sectionSummary.notCostWorkCatSum['Категорії групи ЯВсього'] + notCostWorkSum)

    Object.keys(department.listOtherWork).forEach(key => {
      department.listOtherWork[key].forEach(accrual => {
        otherSum += accrual['sum([paySum])']
        // if (dateService.shiftDate(accrual.periodSalary).getTime() === params.periodFrom.getTime()) {
        if (dateService.shiftDate(accrual.periodSalary).getTime() >= params.periodFrom.getTime() && dateService.shiftDate(accrual.periodSalary).getTime() <= params.periodFrom.getTime()) {
          sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc + accrual['sum([paySum])'])
        } else {
          sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods + accrual['sum([paySum])'])
        }
      })
    })

    sectionSummary.staffSum_all += staffSum
    sectionSummary.otherSum_all += otherSum
    sectionSummary.allSum_all += otherSum + staffSum

    sectionSummary.allSum_calc = sectionSummary.staffSum_calc + sectionSummary.otherSum_calc
    sectionSummary.allSum_otherPeriods = sectionSummary.staffSum_otherPeriods + sectionSummary.otherSum_otherPeriods

    if (staffSum !== 0 || otherSum !== 0) {
      section.push({
        departmentName: department.departmentName ? department.departmentName : !params.departmentID ? params.organizationName : params.departmentName,
        colListYesCostWork,
        colListNotCostWork,
        staffSum: currencyService.round(staffSum),
        otherSum: currencyService.round(otherSum),
        allSum: currencyService.round(staffSum + otherSum)
      })
    }
  })

  let yesCostWorkCatSumList = []
  let notCostWorkCatSumList = []
  let yesCostWorkCatSumListCalc = []
  let notCostWorkCatSumListCalc = []
  let yesCostWorkCatSumListOtherPeriods = []
  let notCostWorkCatSumListOtherPeriods = []
  Object.keys(sectionSummary.yesCostWorkCatSum).forEach(key => yesCostWorkCatSumList.push({ value: sectionSummary.yesCostWorkCatSum[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum).forEach(key => notCostWorkCatSumList.push({ value: sectionSummary.notCostWorkCatSum[key] }))
  sectionSummary.yesCostWorkCatSum = yesCostWorkCatSumList
  sectionSummary.notCostWorkCatSum = notCostWorkCatSumList

  Object.keys(sectionSummary.yesCostWorkCatSum_calc).forEach(key => yesCostWorkCatSumListCalc.push({ value: sectionSummary.yesCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_calc).forEach(key => notCostWorkCatSumListCalc.push({ value: sectionSummary.notCostWorkCatSum_calc[key] }))
  Object.keys(sectionSummary.yesCostWorkCatSum_otherPeriods).forEach(key => yesCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.yesCostWorkCatSum_otherPeriods[key] }))
  Object.keys(sectionSummary.notCostWorkCatSum_otherPeriods).forEach(key => notCostWorkCatSumListOtherPeriods.push({ value: sectionSummary.notCostWorkCatSum_otherPeriods[key] }))

  let yesCostWorkCatSumCalcSum = 0
  let notCostWorkCatSumCalcSum = 0
  let yesCostWorkCatSumOtherPeriodsSum = 0
  let notCostWorkCatSumOtherPeriodsSum = 0

  yesCostWorkCatSumListCalc.forEach(el => {
    yesCostWorkCatSumCalcSum += el.value
  })
  yesCostWorkCatSumListCalc.push({ value: currencyService.round(yesCostWorkCatSumCalcSum) })
  sectionSummary.yesCostWorkCatSum_calc = yesCostWorkCatSumListCalc

  notCostWorkCatSumListCalc.forEach(el => {
    notCostWorkCatSumCalcSum += el.value
  })
  notCostWorkCatSumListCalc.push({ value: currencyService.round(notCostWorkCatSumCalcSum) })
  sectionSummary.notCostWorkCatSum_calc = notCostWorkCatSumListCalc

  yesCostWorkCatSumListOtherPeriods.forEach(el => {
    yesCostWorkCatSumOtherPeriodsSum += el.value
  })
  yesCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(yesCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.yesCostWorkCatSum_otherPeriods = yesCostWorkCatSumListOtherPeriods

  notCostWorkCatSumListOtherPeriods.forEach(el => {
    notCostWorkCatSumOtherPeriodsSum += el.value
  })
  notCostWorkCatSumListOtherPeriods.push({ value: currencyService.round(notCostWorkCatSumOtherPeriodsSum) })
  sectionSummary.notCostWorkCatSum_otherPeriods = notCostWorkCatSumListOtherPeriods

  sectionSummary.staffSum_all = currencyService.round(sectionSummary.staffSum_all)
  sectionSummary.otherSum_all = currencyService.round(sectionSummary.otherSum_all)
  sectionSummary.allSum_all = currencyService.round(sectionSummary.allSum_all)
  sectionSummary.staffSum_calc = currencyService.round(sectionSummary.staffSum_calc)
  sectionSummary.otherSum_calc = currencyService.round(sectionSummary.otherSum_calc)
  sectionSummary.allSum_calc = currencyService.round(sectionSummary.allSum_calc)
  sectionSummary.staffSum_otherPeriods = currencyService.round(sectionSummary.staffSum_otherPeriods)
  sectionSummary.otherSum_otherPeriods = currencyService.round(sectionSummary.otherSum_otherPeriods)
  sectionSummary.allSum_otherPeriods = currencyService.round(sectionSummary.allSum_otherPeriods)

  return { section, sectionSummary }
}

function getIndividualEmpContractData (params) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  let periodTo = dateService.shiftDate(params.periodToDateTo)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const employeePositionID = params.employeePositionID
  // const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const monthData = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name', 'dateFrom', 'dateTo', 'dictMonthID.name')
    .where('orgID', '=', params.orgID)
    .where('dateFrom', '<=', periodTo)
    .where('dateTo', '>=', periodFrom)
    .where('dictMonthID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject({ 'dictMonthID.name': 'monthName' })

  let months = []
  if (periodFrom.getFullYear() === periodTo.getFullYear()) {
    monthData.forEach(m => {
      months.push({ month: m.monthName })
    })
  } else {
    monthData.forEach(m => {
      months.push({ month: m.name })
    })
  }
  const hrOrg = reportService.getHrOrg(params.orgID, periodTo)

  let orgIDs = [params.organizationID]
  if (params.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  }
  let strPeriodName
  if (periodFrom.getFullYear() === periodTo.getFullYear() &&
    periodFrom.getMonth() === 0 && periodTo.getMonth() === 11) {
    strPeriodName = UB.i18n(`за {0} рік`, periodFrom.getFullYear())
  } else if (params.periodFromID === params.periodToID) {
    strPeriodName = UB.i18n(`за {0} року`, monthData[0].name)
  } else {
    strPeriodName = UB.i18n(`з {0} року по {1} року`, monthData.find(p => p.ID === params.periodFromID).name, monthData.find(p => p.ID === params.periodToID).name)
  }

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'name', 'dateFrom', 'dateTo')
    .where('orgID', '=', params.organizationID)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsObject()

  let depName = false
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName
    deptIDs = [params.departmentID]
    if (params.includeSubDep) {
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
      }
    }
  }
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.organizationID)
  const idParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'valuesID', 'listParamID.shortName'])
    .where('[listParamID.code]', 'in', ['FOZP', 'FDZP', 'ZKV', '1yesCostWork', '2notCostWork'], 'cond1')
    .where('[listParamID.code]', 'like', '%_groupCat', 'cond2')
    .where('[orgID]', '=', Number(parentOrdID || params.organizationID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject()
  const payElIDsFOZP = idParams.filter(idParam => idParam['listParamID.code'] === 'FOZP').map(idParam => idParam.valuesID)
  const payElIDsFDZP = idParams.filter(idParam => idParam['listParamID.code'] === 'FDZP').map(idParam => idParam.valuesID)
  const payElIDsZKV = idParams.filter(idParam => idParam['listParamID.code'] === 'ZKV').map(idParam => idParam.valuesID)
  const payElIDsFZP = payElIDsFOZP.concat(payElIDsFDZP, payElIDsZKV)

  let avgListEmpCount = {}
  orgIDs.forEach(orgID => {
    const result = reportService.getAvgListEmpCount({
      orgID,
      dateFrom: dateService.shiftDate(periodFrom),
      dateTo: dateService.shiftDate(periodTo),
      departmentID: params.departmentID,
      includeChildDepts: params.includeSubDep,
      workPlace: ['1', '2', '3']
    })
    if (result) {
      avgListEmpCount = Object.assign(avgListEmpCount, result.employeeNumbers)
    }
  })

  let accrual = []
  let employeePositions = []
  periodList.forEach(period => {
    const employeePositionDS = UB.DataStore('hr_accrual')
    employeePositionDS.runSQL(`SELECT
  p.employeeNumberID "employeeNumberID", 
  p.workPlace "workPlace", 
  p.dictStaffCatID "dictStaffCatID", 
  sc.code "dictStaffCatCode", 
  sc.name "dictStaffCatName",
  p.organizationID "organizationID"
,(SELECT ${sqlDialect.top}
      d.mi_data_id
    FROM hr_department d
    WHERE d.orgID = p.organizationID
    AND d.parentUnitID${entityBaseService.getInExpression('structIDs')} 
    AND d.state = 'ACTIVE'
    AND d.mi_dateFrom <= :periodTo:
    AND d.mi_deleteDate >= '9999-12-31'
    AND (SELECT ${sqlDialect.top}
        dep.mi_treePath
      FROM hr_department dep
      WHERE dep.mi_data_id = p.departmentID
      AND dep.state = 'ACTIVE'
      AND d.mi_deleteDate >= '9999-12-31'
      ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit})
    LIKE CONCAT('%', d.mi_treePath, '%') ${sqlDialect.limit})
  AS "departmentID"

 ,(SELECT ${sqlDialect.top}
      d.description
    FROM hr_department d
    WHERE d.orgID = p.organizationID
    AND d.parentUnitID${entityBaseService.getInExpression('structIDs')} 
    AND d.state = 'ACTIVE'
    AND d.mi_dateFrom <= :periodTo:
    AND d.mi_deleteDate >= '9999-12-31'
    AND (SELECT ${sqlDialect.top}
        dep.mi_treePath
      FROM hr_department dep
      WHERE dep.mi_data_id = p.departmentID
      AND dep.state = 'ACTIVE'
      AND d.mi_deleteDate >= '9999-12-31'
      ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit})
    LIKE CONCAT('%', d.mi_treePath, '%') ${sqlDialect.limit})
  AS "depName"

 ,(SELECT ${sqlDialect.top}
      org.description
    FROM hr_organization org
    WHERE org.mi_data_id = p.organizationID
    AND org.state = 'ACTIVE'
    AND org.mi_dateFrom <= :periodTo:
    AND org.mi_deleteDate >= '9999-12-31'
    ORDER BY org.mi_dateTo DESC ${sqlDialect.limit})
  AS "orgName"
 ,(SELECT ${sqlDialect.top}
      dct.dictCostPlaceTypeID
    FROM ac_dictCostType dct
    WHERE dct.ID = p.d0Value
    OR dct.ID = p.d1Value
    OR dct.ID = p.d2Value
    OR dct.ID = p.d3Value
    OR dct.ID = p.d4Value
    OR dct.ID = p.d5Value
    OR dct.ID = p.d6Value
    OR dct.ID = p.d7Value
    OR dct.ID = p.d8Value
    OR dct.ID = p.d9Value
  ${sqlDialect.limit} )
  AS "dictCostPlaceTypeID"

FROM hr_employeePosition p
LEFT JOIN hr_dictStaffCat sc
  ON sc.ID = p.dictStaffCatID

WHERE  p.organizationID${entityBaseService.getInExpression('orgIDs')}
  ${employeePositionID ? 'AND p.ID = ' + employeePositionID : ''}
  AND
  p.employeeNumberID in (SELECT
    acc.employeeNumberID
    FROM hr_accrual acc
    LEFT JOIN hr_payEl pl
    ON acc.payElID = pl.ID
    LEFT JOIN hr_method m
    ON pl.methodID = m.ID
    LEFT JOIN hr_methodGroup g
    ON g.ID = m.methodGroupID
      AND g.groupType = 'PAYMENT'
    WHERE acc.orgID${entityBaseService.getInExpression('orgIDs')} AND
    ((acc.periodCalc between :periodFrom: AND :periodTo: AND acc.periodSalary <= :periodTo: ) OR (acc.periodCalc < :periodFrom: AND acc.periodSalary between :periodFrom: AND :periodTo:))
  AND acc.flagsRec & 8192 = 0
    GROUP BY acc.employeeNumberID)
    
  AND 
  p.dateFrom = (select ${sqlDialect.top}
    ep2.dateFrom from hr_employeePosition ep2
    left JOIN hr_employee e on e.ID = ep2.employeeID
    where ep2.isActive = 1
    and ep2.workerType = '4'
    and ep2.mi_deleteDate >= '9999-12-31' 
    and ep2.employeeNumberID = p.employeeNumberID    
    and ep2.dateFrom <= :periodTo:
    and ep2.dateTo >= :periodFrom:
    ${deptIDs ? `and p.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
    ${params.isIncludeOnlyWoman ? `and e.sexType = 'W'` : ''}
    order by ep2.dateFrom desc ${sqlDialect.limit})

      AND p.isActive = 1
AND p.mi_deleteDate >= '9999-12-31' 
ORDER BY p.dateTo DESC`, {
      orgIDs,
      deptIDs,
      periodFrom: dateService.shiftDate(period.dateFrom),
      periodTo: dateService.shiftDate(period.dateTo),
      structIDs: !params.departmentID ? orgIDs : deptIDs
    })

    const employeePositionsList = employeePositionDS.getAsJsObject()
    employeePositions = employeePositions.concat(employeePositionsList)

    const accrualList = UB.Repository('hr_accrual')
      .attrs(['employeeNumberID', 'employeeNumberID.employeeID.fullFIO', 'periodCalc', 'periodSalary', 'sum([paySum])', 'payElID', 'payElID.code', 'payElID.name'])
      .where('orgID', 'in', orgIDs)
      .where('employeeNumberID', 'in', employeePositionsList.map(o => o.employeeNumberID))
      // .whereIf(limitedAccess, 'employeeNumberID.limitedAccess', '=', 0)
      .where('periodCalc', '>=', dateService.shiftDate(period.dateFrom), 'pc1_1')
      .where('periodCalc', '<=', dateService.shiftDate(period.dateTo), 'pc1_2')
      .where('periodSalary', '<=', dateService.shiftDate(period.dateTo), 'pc1_3')
      .where('periodCalc', '<', dateService.shiftDate(period.dateFrom), 'pc2_1')
      .where('periodSalary', '>=', dateService.shiftDate(period.dateFrom), 'pc2_2')
      .where('periodSalary', '<=', dateService.shiftDate(period.dateTo), 'pc2_3')

      /* .where('periodCalc', '=', dateService.shiftDate(periodFrom), 'pc1')
          .where('periodCalc', '<', dateService.shiftDate(periodFrom), 'pc2')
          .where('periodSalary', '=', dateService.shiftDate(periodFrom), 'pc3') */
      .where('flagsRecSum', '!=', 8192)
      .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
      .logic('(([pc1_1] and [pc1_2] and [pc1_3]) or ([pc2_1] and [pc2_2] and [pc2_3]))')
      /* .logic('([pc1] or ([pc2] and [pc3]))') */
      .orderBy('payElID.code')
      .orderBy('periodSalary')
      .groupBy(['payElID.name', 'payElID', 'employeeNumberID.employeeID.fullFIO', 'employeeNumberID', 'payElID.code', 'periodCalc', 'periodSalary'])
      .selectAsObject()

    accrualList.map(el => {
      const pos = employeePositionsList.find(o => o.employeeNumberID === el.employeeNumberID)
      el.workPlace = pos.workPlace
      el.dictStaffCatID = pos.dictStaffCatID
      el.dictStaffCatCode = pos['dictStaffCatCode']
      el.dictStaffCatName = pos['dictStaffCatName']
      el.isInState = ['1', '2'].includes(pos['workPlace'])
      return el
    })

    accrual = accrual.concat(accrualList)
  })

  let payElList = []
  let dictStaffCatList = []
  let colList = []
  let FZPSumDetDefault = []

  accrual.forEach(el => {
    if (!payElList.find(row => row.payElID === el.payElID)) {
      payElList.push({ payElID: el.payElID, payElCodeSort: el['payElID.codeSort'], payElCode: el['payElID.code'], payElName: el['payElID.name'] })
    }
    if (!dictStaffCatList.find(row => row.dictStaffCatID === el.dictStaffCatID)) {
      dictStaffCatList.push({ dictStaffCatID: el.dictStaffCatID, dictStaffCatName: el.dictStaffCatName, dictStaffCatCode: el.dictStaffCatCode, isInState: el.isInState })
    }
    if (!(FZPSumDetDefault.find(row => row.dictStaffCatID === el.dictStaffCatID)) && el.isInState) {
      colList.push({ colName: el.dictStaffCatName })
      FZPSumDetDefault.push({
        dictStaffCatID: el.dictStaffCatID,
        value: 0
      })
    }
  })
  if (accrual.find(el => el.dictStaffCatID === null)) {
    dictStaffCatList.push({ dictStaffCatID: null, dictStaffCatName: 'Категорія не заповнена', dictStaffCatCode: '0' })
    if (accrual.find(el => el.dictStaffCatID === null && el.isInState)) {
      colList.push({ colName: 'Категорія не заповнена' })
      FZPSumDetDefault.push({
        dictStaffCatID: null,
        value: 0
      })
    }
  }

  let avgListSummary = {
    avgListEmpCountStateSum: 0,
    avgListEmpCountSumDet: [].concat(FZPSumDetDefault.map(o => Object.assign({}, o)))
  }
  employeePositions.filter(el => ['1', '2'].includes(el['workPlace'])).forEach(pos => {
    let cat = avgListSummary.avgListEmpCountSumDet.find(el => el.dictStaffCatID === pos.dictStaffCatID)
    if (cat) {
      avgListSummary.avgListEmpCountStateSum = currencyService.round(avgListSummary.avgListEmpCountStateSum + (avgListEmpCount[pos.employeeNumberID] ? avgListEmpCount[pos.employeeNumberID].dayCount : 0))
      avgListSummary.avgListEmpCountSumDet.find(el => el.dictStaffCatID === pos.dictStaffCatID).value = currencyService.round(cat.value + (avgListEmpCount[pos.employeeNumberID] ? avgListEmpCount[pos.employeeNumberID].dayCount : 0))
    }
  })

  let summaryAll = {
    FZPStateSum: 0,
    FZPSumDet: [].concat(FZPSumDetDefault.map(o => Object.assign({}, o))),
    FZPOtherSum: 0,
    FZPAllSum: 0,
    avgListEmpCountStateSum: avgListSummary.avgListEmpCountStateSum
  }
  let FOZPData
  [ summaryAll, FOZPData ] = getIECDataDet(accrual, payElList, payElIDsFOZP, dictStaffCatList, summaryAll, FZPSumDetDefault)
  let FDZPData
  [ summaryAll, FDZPData ] = getIECDataDet(accrual, payElList, payElIDsFDZP, dictStaffCatList, summaryAll, FZPSumDetDefault)
  let ZKVData
  [ summaryAll, ZKVData ] = getIECDataDet(accrual, payElList, payElIDsZKV, dictStaffCatList, summaryAll, FZPSumDetDefault)
  let FZPData
  [ summaryAll, FZPData ] = getIECDataDet(accrual, payElList, payElIDsFZP, dictStaffCatList, summaryAll, FZPSumDetDefault, true)

  summaryAll.FZPSumDet.map((el, idx) => {
    el.dayCount = avgListSummary.avgListEmpCountSumDet[idx].value
    return el
  })

  return {
    allColCount: 6 + colList.length * 2,
    colListCount: colList.length * 2,
    colListWidth: colList.length * 2 * 80,
    sheetWidth: 1000 + (colList.length * 2 * 80),
    strPeriodName,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `,
    depName,
    colList: colList,
    isColListEmpty: !!colList.length,
    FOZP: FOZPData.section,
    FDZP: FDZPData.section,
    ZKV: ZKVData.section,
    FZP: FZPData.section,
    FOZPSummary: FOZPData.sectionSummary,
    FDZPSummary: FDZPData.sectionSummary,
    ZKVSummary: ZKVData.sectionSummary,
    FZPSummary: FZPData.sectionSummary,
    summaryAll,
    empName: employeePositionID ? params.employeePosRaw || '' : ''
  }
}

function getIECDataDet (accrual, payElList, sectionList, dictStaffCatList, summaryAll, FZPSumDetDefault, isExclude = false) {
  let FZPSumDetDef = []
  FZPSumDetDefault.forEach(o => {
    FZPSumDetDef.push({
      dictStaffCatID: o.dictStaffCatID,
      value: 0
    })
  })
  let section = []
  let sectionSummary = {
    FZPStateSum: 0,
    FZPSumDet: [].concat(FZPSumDetDef.map(o => Object.assign({}, o))),
    FZPOtherSum: 0,
    FZPAllSum: 0
  }
  payElList.forEach(payEl => {
    let cond
    if (isExclude) {
      cond = !sectionList.includes(payEl.payElID)
    } else {
      cond = sectionList.includes(payEl.payElID)
    }
    if (cond) {
      let FZPStateSum = 0
      let FZPOtherSum = 0
      let accrualPayEl = accrual.filter(el => el.payElID === payEl.payElID)
      let FZPSumDet = [].concat(FZPSumDetDef.map(o => Object.assign({}, o)))

      dictStaffCatList.forEach(staffCat => {
        let value = 0
        accrualPayEl.filter(el => el.dictStaffCatID === staffCat.dictStaffCatID).forEach(el => {
          if (el.isInState) {
            value += el['sum([paySum])']
            FZPStateSum += el['sum([paySum])']
          } else {
            FZPOtherSum += el['sum([paySum])']
          }
        })
        if (value !== 0) {
          FZPSumDet.find(el => el.dictStaffCatID === staffCat.dictStaffCatID).value = currencyService.round(FZPSumDet.find(el => el.dictStaffCatID === staffCat.dictStaffCatID).value + value)
          sectionSummary.FZPSumDet.find(el => el.dictStaffCatID === staffCat.dictStaffCatID).value = currencyService.round(sectionSummary.FZPSumDet.find(el => el.dictStaffCatID === staffCat.dictStaffCatID).value + value)
          if (!isExclude) {
            summaryAll.FZPSumDet.find(el => el.dictStaffCatID === staffCat.dictStaffCatID).value = currencyService.round(summaryAll.FZPSumDet.find(el => el.dictStaffCatID === staffCat.dictStaffCatID).value + value)
          }
        }
      })

      FZPSumDet.forEach(el => {
        sectionSummary.FZPStateSum = currencyService.round(sectionSummary.FZPStateSum + el.value)
        if (!isExclude) {
          summaryAll.FZPStateSum = currencyService.round(summaryAll.FZPStateSum + el.value)
          summaryAll.FZPAllSum = currencyService.round(summaryAll.FZPAllSum + el.value)
        }
      })

      sectionSummary.FZPOtherSum = currencyService.round(sectionSummary.FZPOtherSum + FZPOtherSum)
      sectionSummary.FZPAllSum = currencyService.round(sectionSummary.FZPOtherSum + sectionSummary.FZPStateSum)
      if (!isExclude) {
        summaryAll.FZPOtherSum = currencyService.round(summaryAll.FZPOtherSum + FZPOtherSum/* sectionSummary.FZPOtherSum */)
        summaryAll.FZPAllSum = currencyService.round(summaryAll.FZPAllSum + FZPOtherSum/* sectionSummary.FZPOtherSum */)
      }
      section.push({
        payElName: `${payEl.payElCode} ${payEl.payElName}`,
        FZPStateSum: currencyService.round(FZPStateSum),
        FZPSumDet,
        FZPOtherSum: currencyService.round(FZPOtherSum),
        FZPAllSum: currencyService.round(FZPOtherSum + FZPStateSum)
      })
    }
  })

  return [summaryAll, { section, sectionSummary }]
}

function getGeneralRegistryData (params) {
  if (!params.extraColumns) params.extraColumns = []
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)

  // console.log('GR !!!. params = ', params)
  const resultData = {
    showTaxFree: false,
    periodName: '',
    tableWidth: 0,
    columsHead: [],
    data: [],
    allColumsCount: 6,
    showToPay: false,
    columsConfig: [],
    showCode: false,
    title: [],
    signers: UB.Repository('hr_dictSigners')
      .attrs(['ID', 'departmentID', 'employeePositionID', 'employeeNumberID.employeeID.shortFIO', 'orderN', 'signerName', 'positionName'])
      .where('orgID', '=', params.orgID)
      .where('signerCode', '=', 'ACCRUALREPORTS')
      .where('departmentID', 'isNull')
      .orderBy('orderN')
      .selectAsObject({
        'employeeNumberID.employeeID.shortFIO': 'signerShortName'
      }) || []
  }
  const configColumns = {
    showColumnSexType: params.typeGroupReport === '4' ? params.extraColumns.includes('sexType') : false,
    showColumnBirthDate: params.typeGroupReport === '4' ? params.extraColumns.includes('birthDate') : false,
    showColumnDateFrom: params.typeGroupReport === '4' ? params.extraColumns.includes('dateFrom') : false,
    showColumnDateTo: params.typeGroupReport === '4' ? params.extraColumns.includes('dateTo') : false,
    showColumnWorkerType: params.typeGroupReport === '4' ? params.extraColumns.includes('workerType') : false,
    showColumnWorkSchedule: params.typeGroupReport === '4' ? params.extraColumns.includes('workScheduleID') : false,
    showColumnWorkPlace: params.typeGroupReport === '4' ? params.extraColumns.includes('workPlace') : false,
    showColumnDictStaffCat: params.typeGroupReport === '4' ? params.extraColumns.includes('dictStaffCatID') : false,
    showColumnMtCount: params.typeGroupReport === '4' ? params.extraColumns.includes('mtCount') : false,
    showColumnDictCategoryECB: params.typeGroupReport === '4' ? params.extraColumns.includes('dictCategoryECBID') : false,
    showColumnAccountID: params.typeGroupReport === '4' ? params.extraColumns.includes('accountID') : false,
    showColumnDictCostType: params.typeGroupReport === '4' ? params.extraColumns.includes('dictCostType') : false,
    showColumnStudDateFrom: params.typeGroupReport === '8' ? params.extraColumns.includes('studDateFrom') : false,
    showColumnStudDateTo: params.typeGroupReport === '8' ? params.extraColumns.includes('studDateTo') : false,
    showColumnStudFaculity: params.typeGroupReport === '8' ? params.extraColumns.includes('studFaculity') : false,
    showColumnStudSemester: params.typeGroupReport === '8' ? params.extraColumns.includes('studSemester') : false,
    showColumnStudGroup: params.typeGroupReport === '8' ? params.extraColumns.includes('studGroup') : false,
    showColumnStudTabNum: params.typeGroupReport === '8' ? params.extraColumns.includes('studTabNum') : false,
    showColumnStudTypeStudy: params.typeGroupReport === '8' ? params.extraColumns.includes('studTypeStudy') : false,
    showColumnStudFormStudy: params.typeGroupReport === '8' ? params.extraColumns.includes('studFormStudy') : false,
    showColumnStudDictLevel: params.typeGroupReport === '8' ? params.extraColumns.includes('studDictLevel') : false,
    showColumnStudDictStaffCat: params.typeGroupReport === '8' ? params.extraColumns.includes('studDictStaffCat') : false
  }

  function addConfig (obj) {
    for (let key in configColumns) {
      obj[key] = configColumns[key]
    }
  }
  addConfig(resultData)

  let colName = ''
  let groupBy = 'null'
  let groupField = 'ID'
  let structField = 'depID'
  switch (params.typeGroupReport) {
    case '1':
      colName = 'Організація'
      groupBy = 'orgID'
      groupField = 'orgName'
      structField = 'depID'
      break
    case '2':
      colName = 'Структурний підрозділ'
      groupBy = 'selfStructDep'
      groupField = 'selfStructDepName'
      structField = 'depID'
      break
    case '3':
      colName = 'Підрозділ'
      groupBy = 'depID'
      groupField = 'depName'
      structField = 'depID'
      break
    case '4':
      colName = 'ПІБ'
      groupBy = 'enID'
      groupField = 'fullFIO'
      structField = 'depID'
      break
    case '5':
      colName = 'Факультет'
      groupBy = 'faculityID'
      groupField = 'faculityName'
      break
    case '6':
      colName = 'Курс'
      groupBy = 'yearStudy'
      groupField = 'yearStudy'
      structField = 'faculityID'
      break
    case '7':
      colName = 'Група'
      groupBy = 'groupID'
      groupField = 'groupName'
      structField = 'faculityID'
      break
    case '8':
      colName = 'ПІБ'
      groupBy = 'enID'
      groupField = 'fullFIO'
      structField = 'faculityID'
      break
  }

  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const sqlDialect = entityBaseService.getSQLDialect()

  const orgNames = UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'name'])
    .where('state', '=', 'ACTIVE')
    .whereIf(params.includeSubOrg, 'mi_treePath', 'like', `%/${params.organizationID}/%`)
    .whereIf(!params.includeSubOrg, 'mi_data_id', '=', params.organizationID)
    .where('mi_dateFrom', '<=', params.periodTo)
    .where('mi_dateTo', '>=', params.periodFrom)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('treePath')
    .selectAsObject()
  const orgIDs = orgNames.map(o => o.mi_data_id)

  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsArrayOfValues()

  const accrualDS = UB.DataStore('hr_accrual')
  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: params.periodTo })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.organizationID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.periodTo)
        .where('mi_dateTo', '>=', params.periodTo)
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
  if (params.dictMultiGroupID) {
    depName = UB.Repository('hr_dictMultiGroup')
      .attrs('name')
      .where('ID', '=', params.dictMultiGroupID)
      .selectScalar()
    const depts = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', params.dictMultiGroupID)
      .selectAsObject()
    deptIDs = depts.map(o => o.departmentID)
    if (params.includeSubMultiGroup) {
      depName += ' (з підлеглими)'
      depts.forEach(item => {
        const subDepts = UB.Repository('hr_department')
          .attrs(['mi_data_id'])
          .where('orgID', '=', params.organizationID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', params.periodTo)
          .where('mi_dateTo', '>=', params.periodTo)
          .where('mi_treePath', 'like', `%/${item.departmentID}/%`)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
      })
    }
  }
  let depClause = ''
  const levelShowDepTitleAndTotal = ['3', '4', '6', '7', '8'].includes(params.typeGroupReport) ? 1 : 0
  const showDepTitleAndTotal = ['3', '4', '6', '7', '8'].includes(params.typeGroupReport)
    ? false
    : !((params.facultyID || (Array.isArray(deptIDs) && deptIDs.length === 1)))
  if (Array.isArray(deptIDs) && deptIDs.length) {
    depClause = `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}`
  }

  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':periodTo:')
  let faculityClause = ''
  let yearClause = ''

  if (params.facultyID) {
    faculityClause = ` and exists (select 1 from hr_studEducationHistory st
      where st.employeeNumberID = en.ID and  st.departmentID = ${params.facultyID} and 
      st.dateFrom <= :periodTo: and st.dateTo >= :periodFrom: and st.mi_deleteDate >= '9999-12-31') `
  }

  if (params.yearStudy) {
    yearClause = ` and exists (select 1 from hr_studEducationHistory st
      where st.employeeNumberID = en.ID and st.semester in (${params.yearStudy * 2 - 1}, ${params.yearStudy * 2}) and 
            st.dateFrom <= :periodTo: and st.dateTo >= :periodFrom: and st.mi_deleteDate >= '9999-12-31') `
  }

  if (params.studGroup) {
    yearClause = ` and exists (select 1 from hr_studEducationHistory st
      where st.employeeNumberID = en.ID and st.groupID = ${params.studGroup} and 
            st.dateFrom <= :periodTo: and st.dateTo >= :periodFrom: and st.mi_deleteDate >= '9999-12-31') `
  }
  let payElData = !params.groupPay && params.payElListParams ? JSON.parse(params.payElListParams) : []
  let payElGroupData = params.groupPay && params.payElGroupParams ? JSON.parse(params.payElGroupParams) : []
  let payElClause = ''
  let payElIDs = []
  if (!params.groupPay && payElData.length && payElData.length < 1000) {
    payElIDs = payElData.map(el => el.payElID)
    payElClause = `AND acc.payElID ${entityBaseService.getInExpression('payElIDs')}`
  }
  if (params.groupPay && payElGroupData.length && payElGroupData.length < 1000) {
    payElGroupData.forEach(items => {
      if (items.detail.length) {
        items.payElIDs = items.detail.map(el => el.payElID)
        payElIDs.push(...items.payElIDs)
      }
    })
    if (payElIDs.length && payElIDs.length < 1000) {
      payElClause = `AND acc.payElID ${entityBaseService.getInExpression('payElIDs')}`
    } else {
      payElIDs = []
    }
  }

  accrualDS.runSQL(` SELECT en.id as "enID", en.tabNum as "tabNum", en.tabNumSort as "tabNumSort", emp.fullFIO as "fullFIO", 
    acc.payElID as payElID, acc.paySum as "paySum",
    case when meth.code='26' then (select sum(COALESCE(ti.taxFreeSum, 0) +  COALESCE(ti.privilegeSum, 0)) from hr_taxIndividAcc ti where ti.accrualID = acc.ID and (ti.taxFreeSum is not null or ti.privilegeSum is not null) ) else 0 end as taxFreeSum,
    dep.name as "depName", dep.mi_data_id as "depID",
    faculity.name as "faculityName", faculity.ID as "faculityID",
    en.orgID as "orgID",
    en.tabNum as "tabNum",
    st.name as "sexType",
    emp.birthDate as "birthDate",
    en.dateFrom as "startWork",
    en.dateTo as "endWork",
    wt.name as "workerType",
    ws.name as "workSchedule",
    wp.name as "workPlace",
    dsc.description as "staffCatName",
    ep.mtCount as "mtCount",
    ecb.description as "dictCategoryECB",
    gla.description as "accountName",
    sc.description as "dictStaffCatName",
    
    (select ${sqlDialect.top} formStudy.name from hr_studEducationKind studKind
      inner join ubm_enum formStudy on formStudy.code = studKind.formStudy and formStudy.eGroup = 'HR_EDUC_FORM'
      where studKind.employeeNumberID = en.ID and studKind.dateFrom <= :periodTo: and studKind.dateTo >= :periodFrom:
      and studKind.mi_deleteDate >= '9999-12-31' order by studKind.dateFrom desc ${sqlDialect.limit}) as "formStudyName",

    (select ${sqlDialect.top} typeStudy.name from hr_studEducationKind studKind
      inner join hr_dictTypeStudy typeStudy on typeStudy.id = studKind.typeStudy and typeStudy.mi_deleteDate >= '9999-12-31' 
      where studKind.employeeNumberID = en.ID and studKind.dateFrom <= :periodTo: and studKind.dateTo >= :periodFrom:
      and studKind.mi_deleteDate >= '9999-12-31' order by studKind.dateFrom desc ${sqlDialect.limit}) as "typeStudyName",

    (select ${sqlDialect.top} eduLevel.name from hr_studEducationKind studKind
      inner join hr_dictEducLevel eduLevel on eduLevel.id = studKind.dictLevelID and eduLevel.mi_deleteDate >= '9999-12-31' 
      where studKind.employeeNumberID = en.ID and studKind.dateFrom <= :periodTo: and studKind.dateTo >= :periodFrom:
      and studKind.mi_deleteDate >= '9999-12-31' order by studKind.dateFrom desc ${sqlDialect.limit}) as "eduLevelName",

    (SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType",

    (SELECT ${sqlDialect.top} d.ID from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}) as "selfStructDep",
    (SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}) as "selfStructDepName",
    ${staffService.getOrgFldOnDateSql(':periodTo:', 'en.orgID', 'name')} as "orgName",
    (select ${sqlDialect.top} stud.semester from hr_studEducationHistory stud where stud.employeeNumberID = en.ID and stud.dateFrom <= :periodTo: and stud.dateTo >= :periodFrom: and stud.mi_deleteDate >= '9999-12-31' order by stud.dateFrom desc ${sqlDialect.limit}) as "semester",
    (select ${sqlDialect.top} studGroup.name from hr_studEducationHistory stud inner join hr_dictStudGroup studGroup on studGroup.id = stud.groupID where stud.employeeNumberID = en.ID and stud.dateFrom <= :periodTo: and stud.dateTo >= :periodFrom: and stud.mi_deleteDate >= '9999-12-31' order by stud.dateFrom desc ${sqlDialect.limit}) as "groupName",
    (select ${sqlDialect.top} stud.groupID from hr_studEducationHistory stud where stud.employeeNumberID = en.ID and stud.dateFrom <= :periodTo: and stud.dateTo >= :periodFrom: and stud.mi_deleteDate >= '9999-12-31' order by stud.dateFrom desc ${sqlDialect.limit}) as "groupID"
 
  FROM hr_accrual acc
  INNER JOIN hr_payEl pl ON pl.ID = acc.payElID
  INNER JOIN hr_method meth on pl.methodID = meth.ID     
  JOIN hr_employeeNumber en on en.ID = acc.employeeNumberID
  JOIN hr_employee emp on en.employeeID = emp.ID 
  JOIN hr_dictPeriod salperiod on salperiod.ID = acc.periodSalaryID
  JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1 
     and ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where ep2.isActive = 1
     and ep2.mi_deleteDate >= '9999-12-31' and ep2.employeeNumberID = ep.employeeNumberID    
     and ep2.dateFrom <= :periodTo: order by ep2.dateFrom desc ${sqlDialect.limit})
  LEFT JOIN hr_department dep on dep.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2              
     Where dep2.mi_data_id = ep.departmentID  and dep2.orgID = en.orgID                
       and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
                                   when en.dateTo <= :periodTo: then en.dateTo end)                
       and dep2.mi_deleteDate >= '9999-12-31' and dep2.state = 'ACTIVE'              
     order by dep2.mi_dateFrom desc ${sqlDialect.limit})
  LEFT JOIN hr_department faculity on faculity.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2 INNER join hr_studEducationHistory stud2 on stud2.departmentID = dep2.mi_data_id   
     Where stud2.employeeNumberID = en.ID  and dep2.orgID = en.orgID                      
       and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
                                   when en.dateTo <= :periodTo: then en.dateTo end)                
       and dep2.mi_deleteDate >= '9999-12-31' and dep2.state = 'ACTIVE'
       and stud2.mi_deleteDate >= '9999-12-31'              
     order by dep2.mi_dateFrom desc ${sqlDialect.limit})
    LEFT JOIN ubm_enum st on st.code = emp.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
    LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
    LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
    LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
    LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
    LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
    LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
    LEFT JOIN hr_dictStaffCat sc ON sc.ID = ep.dictStaffCatID
      
  WHERE
    en.mi_deleteDate >= '9999-12-31' and ep.mi_deleteDate >= '9999-12-31' and emp.mi_deleteDate >= '9999-12-31'
    ${orgClause}
    and acc.periodCalcID${entityBaseService.getInExpression('periodIDs')}
    and (acc.flagsRec & 8192 != 8192) 
    ${depClause} 
    ${faculityClause} 
    ${yearClause} 
    ${payElClause} 
    and en.empWorkPlace is NULL   
    ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
  ORDER BY dep.treePath, emp.fullFIO, en.tabNumSort`, {
    organizationID: params.organizationID,
    periodIDs,
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    deptIDs: deptIDs,
    payElIDs: payElIDs
  })
  let accrual = accrualDS.getAsJsObject()
  if (params.hideZeroRow) {
    accrual = accrual.filter(el => el.paySum) // non zero
  }

  // console.log('GR !!!. accrual. size = ', accrual.length)
  accrual.forEach(accItem => {
    accItem.yearStudy = ''
    if (accItem.semester) {
      accItem.yearStudy = '' + Math.trunc((accItem.semester + 1) / 2)
    }
  })
  let realpayElIDs = _.uniq(accrual.map(el => el.payElID))

  const firstBand = { cols: [] }
  const groupBand = { cols: [] }
  const secondBand = { cols: [] }
  const rowspan = 2 + (params.showPayName ? 1 : 0)
  firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: colName })
  resultData.columsConfig.push({ width: 200 })
  if (params.typeGroupReport === '4') {
    resultData.showCode = true
    firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: 'Таб.№' })
    resultData.columsConfig.push({ width: 100, align: 'left' })
  }
  if (params.typeGroupReport === '8') {
    resultData.showCode = true
    firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: 'Курс' })
    resultData.columsConfig.push({ width: 50, align: 'center' })
  }

  function addColumns (configName, title, width) {
    if (resultData[configName]) {
      firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: title })
      resultData.columsConfig.push({ width: width, align: 'center' })
    }
  }

  addColumns('showColumnSexType', UB.i18n('Стать'), 80)
  addColumns('showColumnBirthDate', UB.i18n('Дата народження'), 100)
  addColumns('showColumnDateFrom', UB.i18n('Дата прийому на роботу'), 100)
  addColumns('showColumnDateTo', UB.i18n('Дата звільнення'), 100)
  addColumns('showColumnWorkerType', UB.i18n('Форма зайнятості'), 100)
  addColumns('showColumnWorkSchedule', UB.i18n('Графік роботи'), 150)
  addColumns('showColumnWorkPlace', UB.i18n('Місце роботи'), 120)
  addColumns('showColumnDictStaffCat', UB.i18n('Категорія персоналу'), 120)
  addColumns('showColumnMtCount', UB.i18n('Кількість ставок'), 80)
  addColumns('showColumnDictCategoryECB', UB.i18n('Категорія застрахованої особи'), 150)
  addColumns('showColumnAccountID', UB.i18n('Рахунок витрат'), 150)
  addColumns('showColumnDictCostType', UB.i18n('Місце виникнення витрат'), 150)

  addColumns('showColumnStudDateFrom', UB.i18n('Дата початку навчання'), 100)
  addColumns('showColumnStudDateTo', UB.i18n('Дата закінчення навчання'), 100)
  addColumns('showColumnStudFaculity', UB.i18n('Факультет'), 100)
  addColumns('showColumnStudSemester', UB.i18n('Курс'), 50)
  addColumns('showColumnStudGroup', UB.i18n('Група'), 150)
  addColumns('showColumnStudTabNum', UB.i18n('Номер залікової книжки'), 100)
  addColumns('showColumnStudTypeStudy', UB.i18n('Вид навчання'), 100)
  addColumns('showColumnStudFormStudy', UB.i18n('Форма навчання'), 100)
  addColumns('showColumnStudDictLevel', UB.i18n('Освітній рівень'), 100)
  addColumns('showColumnStudDictStaffCat', UB.i18n('Категорія персоналу для розрахунків'), 150)

  // let payElData = params.payElListParams ? JSON.parse(params.payElListParams) : []

  payElIDs = []
  if (params.groupPay) {
    payElGroupData.forEach(items => {
      if (items.detail.length) {
        items.detail = items.detail.length ? items.detail.filter(el => realpayElIDs.includes(el.payElID)) : []
        items.payElIDs = items.detail.length ? items.detail.map(el => el.payElID) : []
        payElIDs.push(...items.payElIDs)
      }
    })
  } else {
    payElData = payElData.length ? payElData.filter(el => realpayElIDs.includes(el.payElID)) : []
    payElIDs = payElData.map(el => el.payElID)
  }
  resultData.showToPay = !!payElIDs.length

  const payElList = UB.Repository('hr_payEl')
    .attrs(['ID', 'description', 'methodID.methodGroupID.groupType', 'methodID.code'])
    .whereIf(payElIDs && payElIDs.length <= 1000, 'ID', 'in', payElIDs)
    .selectAsObject({
      'ID': 'payElID',
      'description': 'payElName',
      'methodID.methodGroupID.groupType': 'groupType',
      'methodID.code': 'method'
    })
  payElData.forEach(row => {
    const payEl = payElList.find(o => o.payElID === row.payElID) || {}
    row.payElName = payEl.payElName || ''
    row.groupType = payEl.groupType || null
    row.method = payEl.method || ''
  })
  payElGroupData.forEach(items => {
    items.detail.forEach(row => {
      const payEl = payElList.find(o => o.payElID === row.payElID) || {}
      row.payElName = payEl.payElName || ''
      row.groupType = payEl.groupType || null
      row.method = payEl.method || ''
    })
  })

  realpayElIDs = _.uniq(payElIDs) // _.uniq(payElData.map(el => el.payElID))
  accrual = realpayElIDs.length ? accrual.filter(el => realpayElIDs.includes(el.payElID)) : []

  const payEls = {}
  const payElsGroups = {}

  function addPays (filter, title, totalTitle) {
    if (params.groupPay) {
      payEls[filter] = []
      payElsGroups[filter] = []
      let cntCols = 0

      payElGroupData.forEach(items => {
        let fldPayEls = items.detail.filter(el => el.groupType === filter)
        if (fldPayEls.length) {
          if (params.showPayName) {
            payEls[filter].push(...fldPayEls)
            payEls[filter].push({
              ID: items.ID,
              payEls: fldPayEls
            })
          } else {
            payElsGroups[filter].push({
              ID: items.ID,
              payEls: fldPayEls
            })
          }

          groupBand.cols.push(!params.showPayName ? { spanInfo: '', name: items.name } : { spanInfo: ` colspan= "${fldPayEls.length + 1}" `, name: items.name })
          if (params.showPayName) {
            cntCols += fldPayEls.length + 1
            fldPayEls.forEach(el => {
              resultData.columsConfig.push({ width: 100 })
              secondBand.cols.push({ name: el.payElName, spanInfo: '' })
            })
            resultData.columsConfig.push({ width: 100 })
            secondBand.cols.push({ name: 'Всього по групі', spanInfo: '' })
          } else {
            cntCols += 1
            resultData.columsConfig.push({ width: 100 })
            // secondBand.cols.push({ name: el.payElName, spanInfo: '' })
          }
        }
      })
      if (cntCols) {
        firstBand.cols.push(cntCols === 1 ? { spanInfo: '', name: title } : { spanInfo: ` colspan= "${cntCols}" `, name: title })
        firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: totalTitle })
        resultData.columsConfig.push({ width: 150 })
      }
    } else {
      let fldPayEls = payElData.filter(el => el.groupType === filter)
      payEls[filter] = fldPayEls || []
      if (fldPayEls.length) {
        firstBand.cols.push(fldPayEls.length === 1 ? { spanInfo: '', name: title } : { spanInfo: ` colspan= "${fldPayEls.length}" `, name: title })
        fldPayEls.forEach(el => {
          resultData.columsConfig.push({ width: 100 })
          secondBand.cols.push({ name: el.payElName, spanInfo: '' })
        })
        firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: totalTitle })
        resultData.columsConfig.push({ width: 150 })
      }
    }
  }

  addPays('PAYMENT', 'Нараховано', 'Всього нараховано')
  const off = payElData.length ? payElData.filter(el => el.groupType === 'OFFTAKE').map(el => el.payElID) : []
  if (off.length && accrual.filter(el => off.includes(el.payElID) && el.taxFreeSum).length) {
    resultData.showTaxFree = true
    firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: 'В тому числі не підлягає оподаткуванню' })
    resultData.columsConfig.push({ width: 150 })
  }

  addPays('OFFTAKE', 'Утримано', 'Всього утримано')
  addPays('FORPAY', 'Виплачено', 'Всього виплачено')

  if (resultData.showToPay) {
    firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: 'До виплати' })
    resultData.columsConfig.push({ width: 150 })
  }
  firstBand.cols.push({ spanInfo: `rowspan= "${rowspan}"`, name: 'Кількість' })
  resultData.columsConfig.push({ width: 100 })

  if (!secondBand.cols.length && !groupBand.cols.length) {
    firstBand.cols.forEach(el => {
      el.spanInfo = ''
    })
  }

  resultData.columsHead.push(firstBand)
  if (groupBand.cols.length) {
    resultData.columsHead.push(groupBand)
  }
  if (secondBand.cols.length) {
    resultData.columsHead.push(secondBand)
  }
  resultData.allColumsCount = resultData.columsConfig.length
  resultData.tableWidth = resultData.columsConfig.reduce((sum, elem) => sum + elem.width, 0)

  resultData.title.push({ allColumsCount: resultData.allColumsCount, text: 'На виплату ' + (params.reportTemplateName ? params.reportTemplateName : 'нарахувань, утримань та виплат') })
  if (depName || params.facultyName || params.yearStudy || params.studGroupName) {
    resultData.title.push({ allColumsCount: resultData.allColumsCount, text: [depName, params.facultyName, params.yearStudy ? params.yearStudy + ' ' + 'курс' : '', params.studGroupName].filter(Boolean).join(', ') })
  }

  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    resultData.title.push({ allColumsCount: resultData.allColumsCount, text: `за ${params.periodFromRaw} року` })
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    resultData.title.push({ allColumsCount: resultData.allColumsCount, text: `за ${params.periodTo.getFullYear()} рік` })
  } else {
    resultData.title.push({ allColumsCount: resultData.allColumsCount, text: `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року` })
  }

  function getObjTotal (title) {
    const objTotal = {
      bold: 'font-weight: bold; background-color: #f0f0f0;',
      showToPay: resultData.showToPay,
      colSpan: resultData.showCode ? 2 : 1,
      isTotal: true,
      showCode: false,
      name: title,
      code: '',
      payValues: [],
      toPay: 0,
      quatity: 0
    }
    getSum(objTotal, 'PAYMENT', undefined)
    getSum(objTotal, 'OFFTAKE', undefined, resultData.showTaxFree)
    getSum(objTotal, 'FORPAY', undefined)

    addConfig(objTotal)

    return objTotal
  }
  function getSum (obj, payType, items, needTaxItem = false) {
    let totalValue = 0
    const arrayPayEls = params.groupPay && !params.showPayName ? payElsGroups[payType] : payEls[payType]
    if (!arrayPayEls || !arrayPayEls.length) return totalValue

    const taxItem = { value: 0 }
    if (needTaxItem) {
      obj.payValues.push(taxItem)
    }
    arrayPayEls.forEach(payElItem => {
      if (items) {
        const accItems = payElItem.payEls
          ? items.filter(elem => payElItem.payEls.map(el => el.payElID).includes(elem.payElID))
          : items.filter(elem => elem.payElID === payElItem.payElID)
        let value = accItems && accItems.length ? accItems.reduce((sum, acc) => sum + currencyService.round(acc.paySum || 0, 2), 0) : 0
        obj.payValues.push({ value: value })
        totalValue += payElItem.payEls && params.groupPay && params.showPayName ? 0 : value
        if (needTaxItem) {
          value = accItems && accItems.length ? accItems.reduce((sum, acc) => sum + currencyService.round(acc.taxFreeSum || 0, 2), 0) : 0
          taxItem.value += value
        }
      } else {
        obj.payValues.push({ value: 0 })
      }
    })

    obj.payValues.push({ value: totalValue })
    return totalValue
  }

  function addToObj (total, obj) {
    total.toPay += obj.toPay
    total.quatity += obj.quatity
    for (let i = 0; i < obj.payValues.length; i++) {
      total.payValues[i].value += obj.payValues[i].value
    }
  }
  function getAccData (accrualItems, total, orgName) {
    const data = []
    accrualItems = accrualItems.length ? _.groupBy(accrualItems, groupBy) : {}
    _.forEach(accrualItems, items => {
      const item = items[0]
      const objItem = {
        bold: '',
        isTotal: false,
        showToPay: resultData.showToPay,
        showCode: resultData.showCode,
        name: item[groupBy] ? (item[groupField] || '') : orgName,
        code: params.typeGroupReport === '4' ? item.tabNum || '' : params.typeGroupReport === '8' ? item.yearStudy || '' : '',
        payValues: [],
        toPay: 0,
        quatity: _.uniq(items.map(el => el.enID)).length
      }
      if (params.typeGroupReport === '4') {
        objItem.sexType = item.sexType || ''
        objItem.birthDate = item.birthDate ? dateService.formatDate(item.birthDate) : ''
        objItem.startWork = item.startWork ? dateService.formatDate(item.startWork) : ''
        objItem.endWork = item.endWork && dateService.formatDate(item.endWork) !== '31.12.9999' ? dateService.formatDate(item.endWork) : ''
        objItem.workerType = item.workerType || ''
        objItem.workSchedule = item.workSchedule || ''
        objItem.workPlace = item.workPlace || ''
        objItem.staffCatName = item.staffCatName || ''
        objItem.mtCount = item.mtCount || ''
        objItem.dictCategoryECB = item.dictCategoryECB || ''
        objItem.accountName = item.accountName || ''
        objItem.dictCostType = item.dictCostType || ''
      }
      if (params.typeGroupReport === '8') {
        objItem.startWork = item.startWork ? dateService.formatDate(item.startWork) : ''
        objItem.endWork = item.endWork && dateService.formatDate(item.endWork) !== '31.12.9999' ? dateService.formatDate(item.endWork) : ''
        objItem.faculityName = item.faculityName || ''
        objItem.yearStudy = item.yearStudy || ''
        objItem.groupName = item.groupName || ''
        objItem.tabNum = item.tabNum || ''
        objItem.typeStudyName = item.typeStudyName || ''
        objItem.formStudyName = item.formStudyName || ''
        objItem.eduLevelName = item.eduLevelName || ''
        objItem.tabNum = item.tabNum || ''
      }

      addConfig(objItem)

      objItem.toPay = getSum(objItem, 'PAYMENT', items)
      let totalSuma = getSum(objItem, 'OFFTAKE', items, resultData.showTaxFree)
      objItem.toPay = objItem.toPay - totalSuma
      totalSuma = getSum(objItem, 'FORPAY', items)
      objItem.toPay = objItem.toPay - totalSuma

      data.push(objItem)

      // totals
      if (total) {
        addToObj(total, objItem)
      }
      addToObj(objTotal, objItem)
    })
    return data
  }
  function getStructData (level, rootItem, structItems, accrualItems, total, orgName) {
    const result = []
    const currentStructItems = rootItem
      ? structItems.filter(el => el.parentUnitID === rootItem)
      : structItems.filter(el => !el.parentUnitID)
    if (!currentStructItems.length) {
      return result
    }

    currentStructItems.forEach(structItem => {
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      const accruals = accrual.filter(el => el[structField] === structItem.mi_data_id)
      const objStructTotal = getObjTotal(str + 'Всього по' + ' ' + structItem.name)
      const data = getAccData(accruals, objStructTotal, orgName)
      const subData = getStructData(level + 1, structItem.mi_data_id, structItems, accrualItems, objStructTotal)

      if (data.length || subData.length) {
        if (showDepTitleAndTotal || (levelShowDepTitleAndTotal && levelShowDepTitleAndTotal === level)) {
          result.push({
            isTitle: true,
            allColumsCount: resultData.allColumsCount,
            name: str + structItem.name
          })
        }

        if (data.length) {
          result.push(...data)
        }
        if (subData.length) {
          result.push(...subData)
        }

        if (showDepTitleAndTotal || (levelShowDepTitleAndTotal && levelShowDepTitleAndTotal === level)) {
          result.push(objStructTotal)
        }
      }
      addToObj(total, objStructTotal)
    })

    return result
  }

  const objTotal = getObjTotal('Всього')
  orgNames.forEach(orgItem => {
    let haveData = false
    const staffUnitStore = UB.DataStore('hr_staffUnit')
    staffUnitStore.runSQL(` SELECT u.mi_data_id as "mi_data_id", u.parentUnitID as "parentUnitID", u.name as "name", 
      u.treePath as "treePath", u.idxNum as "idxNum"
    FROM hr_staffUnit u JOIN hr_department dep ON dep.ID = u.ID      
    WHERE
      u.orgID = :orgID:
      and u.mi_deleteDate >= '9999-12-31' 
      and u.state = 'ACTIVE' 
      and u.ID = (select ${sqlDialect.top} u2.ID from hr_staffUnit u2 where u2.orgID = :orgID: 
      and u2.mi_data_id = u.mi_data_id 
      and u2.mi_deleteDate >= '9999-12-31' 
      and u2.state = 'ACTIVE' 
      order by u2.mi_dateFrom desc ${sqlDialect.limit})    
    ORDER BY u.treePath   
  `, {
      orgID: orgItem.mi_data_id,
      dateTo: params.periodTo
    })
    const structByOrg = staffUnitStore.getAsJsObject()
    const accrualByOrg = accrual.filter(el => el.orgID === orgItem.mi_data_id)

    const objOrgTotal = getObjTotal('Всього по ' + orgItem.name)
    let objOrgTitle
    if (orgNames.length > 1 && params.typeGroupReport !== '1') { // byOrg
      objOrgTitle = {
        isTitle: true,
        allColumsCount: resultData.allColumsCount,
        name: orgItem.name
      }
      resultData.data.push(objOrgTitle)
    }
    if (params.typeGroupReport === '1') {
      const data = getAccData(accrualByOrg, undefined, '')
      if (data.length) {
        resultData.data.push(...data)
      }
    } else {
      if (params.typeGroupReport === '2' || params.typeGroupReport === '5') {
        const data = getAccData(accrualByOrg, objOrgTotal, orgItem.name)
        if (data.length) {
          haveData = true
          resultData.data.push(...data)
        }
      } else {
        const accruals = accrual.filter(el => el.orgID === orgItem.mi_data_id && !el[structField])
        if (accruals.length) {
          const data = getAccData(accruals, objOrgTotal, orgItem.name)
          if (data.length) {
            haveData = true
            resultData.data.push(...data)
          }
        }
        const data = getStructData(1, orgItem.mi_data_id, structByOrg, accrualByOrg, objOrgTotal, orgItem.name)
        if (data.length) {
          haveData = true
          resultData.data.push(...data)
        }
      }
      if (orgNames.length > 1 && haveData) {
        resultData.data.push(objOrgTotal)
      }
      if (!haveData && objOrgTitle) {
        resultData.data.pop()
      }
    }
  })

  resultData.data.push(objTotal)
  resultData.signers.forEach(el => {
    el.allColumsCount = resultData.allColumsCount
    el.allColumsCount2 = resultData.allColumsCount - 3
    el.twoCol = resultData.allColumsCount < 5
    el.allColumsCount3 = Math.ceil(resultData.allColumsCount / 2)
    el.allColumsCount4 = resultData.allColumsCount - el.allColumsCount3
  })
  return resultData
}

function get1NCData (params) {
  params.dateFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.dateTo = dateService.shiftDate(params.periodToDateTo)
  params.dateFromPrev = dateService.addYears(params.dateFrom, -1)
  params.dateToPrev = dateService.addYears(params.dateTo, -1)
  const resultData = {
    table7: [],
    table71: [
      { npp: '7.1.1.', isText: true, value: '', name: 'На підприємстві відсутня заборгованість з виплати заробітної плати та з виплат у зв’язку з тимчасовою непрацездатністю' },
      { npp: '7.1.2.', isSuma: true, value: 0, name: 'Сума заборгованості з виплати заробітної плати, грн' },
      { npp: '7.1.3.', isNumber: true, value: 0, name: 'Кількість працівників, яким своєчасно не виплачено заробітну плату, осіб (у цілих числах)' },
      { npp: '7.1.4.', isSuma: true, value: 0, name: 'Сума заборгованості з виплат працівникам у зв’язку з тимчасовою непрацездатністю, уключаючи оплату перших п’яти днів, грн' }
    ],
    tableTitle: [],
    table8: [
      { npp: '1', value3: 0, value4: 0, value5: 0, value6: 0, value7: 0, value8: 0, value9: 0, value10: 0, value11: 0, value12: 0, name: 'Середня кількість працівників, всього, у тому числі' },
      { npp: '1.1', value3: 0, value4: 0, value5: 0, value6: 0, value7: 0, value8: 0, value9: 0, value10: 0, value11: 0, value12: 0, name: '&nbsp;'.repeat(5) + 'середньооблікова кількість штатних працівників*' },
      { npp: '1.2', value3: 0, value4: 0, value5: 0, value6: 0, value7: 0, value8: 0, value9: 0, value10: 0, value11: 0, value12: 0, name: '&nbsp;'.repeat(5) + 'середня кількість зовнішніх сумісників' },
      { npp: '1.3', value3: 0, value4: 0, value5: 0, value6: 0, value7: 0, value8: 0, value9: 0, value10: 0, value11: 0, value12: 0, name: '&nbsp;'.repeat(5) + 'середня кількість працюючих за цивільно-правовими договорами' }
    ]
  }

  let periodName
  if (params.dateTo.getFullYear() === params.dateFrom.getFullYear() && params.dateFrom.getMonth() === params.dateTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.dateFrom.getMonth() === 0 && params.dateTo.getMonth() === 11 && params.dateTo.getFullYear() === params.dateFrom.getFullYear()) {
    periodName = `за ${params.dateTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }
  resultData.tableTitle.push({ text: periodName })

  const sqlDialect = entityBaseService.getSQLDialect()
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.organizationID)
  const idParams = UB.Repository('hr_idParam')
    .attrs(['listParamID.code', 'valuesID'])
    .where('[listParamID.code]', 'in', ['FOZP', 'FDZP', 'ZKV'], 'cond1')
    .where('[listParamID.code]', 'like', '1NC%', 'cond2')
    .where('[orgID]', '=', Number(parentOrdID || params.organizationID))
    .where('[listParamID.mi_deleteUser]', 'isNull')
    .logic('(([cond1]) or ([cond2]))')
    .selectAsObject({
      'listParamID.code': 'code'
    })

  const payElIDsFOZP = idParams.filter(idParam => idParam.code === 'FOZP').map(idParam => idParam.valuesID)
  const payElIDsFDZP = idParams.filter(idParam => idParam.code === 'FDZP').map(idParam => idParam.valuesID)
  const payElIDsZKV = idParams.filter(idParam => idParam.code === 'ZKV').map(idParam => idParam.valuesID)
  const payElFOPAll = [...payElIDsFOZP, ...payElIDsFDZP, ...payElIDsZKV]
  const adminPositionIDs = idParams.filter(idParam => idParam.code === '1NCAdminPosition').map(idParam => idParam.valuesID)

  const dictPositiontParams = UB.Repository('hr_listParam')
    .attrs(['code', 'shortName'])
    .where('code', 'notIn', ['1NCnotAvgQuantity', '1NCAdminPosition'], 'cond1')
    .where('code', 'like', '1NC%', 'cond2')
    .where('[mi_deleteUser]', 'isNull')
    .logic('(([cond1]) and ([cond2]))')
    .selectAsObject()
  dictPositiontParams.forEach(elem => {
    elem.other = false
    switch (elem.code) {
      case '1NC1':
        elem.shortName = 'Керівники'
        break
      case '1NC2':
        elem.shortName = 'Керівники структурних підрозділів'
        break
      case '1NC3':
        elem.shortName = 'Лікарі'
        break
      case '1NC4':
        elem.shortName = 'Середній медичний персонал (в тому числі фельдшери, парамедики)'
        break
      case '1NC5':
        elem.shortName = 'Молодший медичний персонал/прибиральники службових приміщень'
        break
      case '1NCAdminPosition':
        elem.shortName = 'Виконують  управлінські функції'
        break
    }
  })
  dictPositiontParams.push({ code: '1NC6', shortName: 'Інші працівники', other: true, codes: dictPositiontParams.map(el => el.code) })

  const hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  let orgIDs = [params.organizationID]
  if (params.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  }

  let deptIDs = null
  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs(['name', 'mi_treePath'])
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.dateTo })
    .selectSingle() : null
  if (department) {
    params.departmentName = department.name
    department.fullPath = department.mi_treePath.slice(0, -1).slice(1).split('/')
    department.fullPath = department.fullPath.map(depID => {
      let dep = UB.Repository('hr_department')
        .attrs(['ID', 'name'])
        .selectById(parseInt(depID, 10))
      return { depName: dep ? dep.name : false }
    }).filter(el => el.depName)
    department.fullPath[department.fullPath.length - 1].depName += params.includeSubDep ? UB.i18n(` з підлеглими`) : ''
    if (department.fullPath.length) {
      _.forEach(department.fullPath, dep => {
        resultData.tableTitle.push({ text: dep.depName })
      })
    }
  } else {
    resultData.tableTitle.push({ text: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''}` })
  }

  if (params.includeSubDep) {
    const departments = UB.Repository('hr_department')
      .attrs(['mi_data_id'])
      .where('orgID', 'in', orgIDs)
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', params.dateTo)
      .where('mi_dateTo', '>=', params.dateTo)
      .where('mi_treePath', 'startsWith', department.mi_treePath)
      .misc({ __mip_recordhistory_all: true })
      .groupBy('mi_data_id')
      .selectAsObject()
    if (departments.length) {
      deptIDs = departments.map(o => o.mi_data_id)
    } else {
      deptIDs = [params.departmentID]
    }
  } else {
    deptIDs = params.departmentID ? [params.departmentID] : null
  }

  let sqlText = `SELECT ep.employeeNumberID "employeeNumberID", ep.workPlace "workPlace", 
    COALESCE(ep.dictPositionID, pos.dictPositionID) "dictPositionID"
  FROM hr_employeePosition ep
  JOIN hr_employeeNumber en on en.ID = ep.employeeNumberID
  LEFT JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
       WHERE  pos2.mi_data_id = ep.positionID and pos2.orgID = en.orgID 
          and pos2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :dateTo:) then :dateTo: 
                                   when en.dateTo <= :dateTo: then en.dateTo end) 
          and pos2.mi_deleteDate >= '9999-12-31'              
          and pos2.state = 'ACTIVE' 
       order by pos2.mi_dateFrom desc ${sqlDialect.limit})
 
  WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')} 
        AND ep.employeeNumberID in (SELECT acc.employeeNumberID FROM hr_accrual acc  
    LEFT JOIN hr_payEl pl ON acc.payElID = pl.ID
    LEFT JOIN hr_method m ON pl.methodID = m.ID
    LEFT JOIN hr_methodGroup g ON g.ID = m.methodGroupID AND g.groupType = 'PAYMENT'
    WHERE acc.orgID${entityBaseService.getInExpression('orgIDs')} AND
    ((acc.periodCalc >= :dateFrom: AND acc.periodCalc <= :dateTo: AND acc.periodSalary <= :dateTo: ) 
    OR (acc.periodCalc < :dateFrom: AND acc.periodSalary >= :dateFrom: AND acc.periodSalary <= :dateTo: )) AND 
    acc.flagsRec & 8192 = 0
    GROUP BY acc.employeeNumberID)
    
  AND ep.id = (select ${sqlDialect.top}
    ep2.id from hr_employeePosition ep2
    JOIN hr_employeeNumber n on n.ID = ep2.employeeNumberID
    left JOIN hr_employee e on e.ID = ep2.employeeID
    where ep2.employeeNumberID = ep.employeeNumberID  and ep2.mi_deleteDate >= '9999-12-31' 
    and ep2.isActive = 1 and ep2.dateFrom <= :dateTo:        
    ${deptIDs ? `and ep.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
    order by ep2.dateFrom desc ${sqlDialect.limit})
  AND ep.isActive = 1
  AND ep.mi_deleteDate >= '9999-12-31' 
  ORDER BY ep.dateTo DESC`

  let employeePositionDS = UB.DataStore('hr_employeePosition')
  employeePositionDS.runSQL(sqlText, {
    orgIDs,
    deptIDs,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo
  })
  let employeePositions = employeePositionDS.getAsJsObject()
  employeePositionDS.runSQL(sqlText, {
    orgIDs,
    deptIDs,
    dateFrom: params.dateFromPrev,
    dateTo: params.dateToPrev
  })
  const employeePositionsPrev = employeePositionDS.getAsJsObject()

  function getAccrual (dateFrom, dateTo, ids) {
    const resultDataAccrual = []
    const arrayIDs = _.chunk(ids, 1000)
    for (let i = 0; i < arrayIDs.length; i++) {
      const data = UB.Repository('hr_accrual')
        .attrs(['employeeNumberID', 'payElID', 'sum([paySum])'])
        .where('orgID', 'in', orgIDs)
        .where('employeeNumberID', 'in', arrayIDs[i].map(o => o.employeeNumberID))
        .where('periodCalc', '>=', dateFrom, 'pc1_1')
        .where('periodCalc', '<=', dateTo, 'pc1_2')
        .where('periodSalary', '<=', dateTo, 'pc1_3')
        .where('periodCalc', '<', dateFrom, 'pc2_1')
        .where('periodSalary', '>=', dateFrom, 'pc2_2')
        .where('periodSalary', '<=', dateTo, 'pc2_3')
        .where('flagsRecSum', '!=', 8192)
        .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
        .logic('(([pc1_1] and [pc1_2] and [pc1_3]) or ([pc2_1] and [pc2_2] and [pc2_3]))')
        .groupBy(['employeeNumberID', 'payElID'])
        .selectAsObject({
          'sum([paySum])': 'paySum'
        })
      resultDataAccrual.push(...data)
    }
    return resultDataAccrual
  }
  const accrual = getAccrual(params.dateFrom, params.dateTo, employeePositions)
  const accrualPrev = getAccrual(params.dateFromPrev, params.dateFromPrev, employeePositionsPrev)

  // === Table 7
  function getObj (npp, name, bold = false) {
    return {
      bold: bold ? 'font-weight: bold; ' : '',
      npp: npp,
      name: name,
      total: 0,
      totalPrev: 0,
      valueFOZP: 0,
      valueFOZPPrev: 0,
      valueFDZP: 0,
      valueFDZPPrev: 0,
      valueZKV: 0,
      valueZKVPrev: 0,
      valueOther: 0,
      valueOtherPrev: 0
    }
  }
  function getSumms (obj, total, table7 = true) {
    if (table7) {
      obj.total = obj.valueFOZP + obj.valueFDZP + obj.valueZKV
      obj.totalPrev = obj.valueFOZPPrev + obj.valueFDZPPrev + obj.valueZKVPrev
    }

    for (let field in total) {
      if (field !== 'name' && field !== 'npp' && field !== 'bold') {
        total[field] += obj[field]
      }
    }
    if (table7) {
      total.total += obj.valueOther
      total.totalPrev += obj.valueOtherPrev
    }
  }

  const totalObj = getObj('1.', 'Фонд оплати праці штатних працівників, всього', true)
  resultData.table7.push(totalObj)
  const workPlaces = ['1', '2']

  function getSuma (dictPositionIDs, accrualData, payElIDs, includePay, includePosition, employees) {
    if (!accrualData || !accrualData.length) return 0
    const fldAccrual = includePay
      ? includePosition
        ? accrualData.filter(el => payElIDs.includes(el.payElID) && employees.filter(emp => emp.employeeNumberID === el.employeeNumberID && workPlaces.includes(emp.workPlace) && dictPositionIDs.includes(emp.dictPositionID)).length)
        : accrualData.filter(el => payElIDs.includes(el.payElID) && employees.filter(emp => emp.employeeNumberID === el.employeeNumberID && workPlaces.includes(emp.workPlace) && (!dictPositionIDs.length || !dictPositionIDs.includes(emp.dictPositionID))).length)
      : includePosition
        ? accrualData.filter(el => !payElIDs.includes(el.payElID) && employees.filter(emp => emp.employeeNumberID === el.employeeNumberID && workPlaces.includes(emp.workPlace) && dictPositionIDs.includes(emp.dictPositionID)).length)
        : accrualData.filter(el => !payElIDs.includes(el.payElID) && employees.filter(emp => emp.employeeNumberID === el.employeeNumberID && workPlaces.includes(emp.workPlace) && (!dictPositionIDs.length || !dictPositionIDs.includes(emp.dictPositionID))).length)
    const suma = fldAccrual ? fldAccrual.reduce((sum, curValue) => sum + curValue.paySum, 0) : 0
    return suma
  }

  _.forEach(dictPositiontParams, (item, npp) => {
    const rowObj = getObj(`1.${npp + 1}`, item.shortName)
    const items = item.other
      ? idParams.filter(el => item.codes.includes(el.code))
      : idParams.filter(el => el.code === item.code)
    const ids = items ? items.map(el => el.valuesID) : []
    if (ids.length || item.other) {
      rowObj.valueFOZP = payElIDsFOZP.length ? getSuma(ids, accrual, payElIDsFOZP, true, !item.other, employeePositions) : 0
      rowObj.valueFOZPPrev = payElIDsFOZP.length ? getSuma(ids, accrualPrev, payElIDsFOZP, true, !item.other, employeePositionsPrev) : 0
      rowObj.valueFDZP = payElIDsFDZP.length ? getSuma(ids, accrual, payElIDsFDZP, true, !item.other, employeePositions) : 0
      rowObj.valueFDZPPrev = payElIDsFDZP.length ? getSuma(ids, accrualPrev, payElIDsFDZP, true, !item.other, employeePositionsPrev) : 0
      rowObj.valueZKV = payElIDsZKV.length ? getSuma(ids, accrual, payElIDsZKV, true, !item.other, employeePositions) : 0
      rowObj.valueZKVPrev = payElIDsZKV.length ? getSuma(ids, accrualPrev, payElIDsZKV, true, !item.other, employeePositionsPrev) : 0
      rowObj.valueOther = getSuma(ids, accrual, payElFOPAll, false, !item.other, employeePositions)
      rowObj.valueOtherPrev = getSuma(ids, accrualPrev, payElFOPAll, false, !item.other, employeePositionsPrev)
      getSumms(rowObj, totalObj)
    }
    rowObj.valueOther = undefined
    rowObj.valueOtherPrev = undefined
    resultData.table7.push(rowObj)
  })

  // === Table 7.1
  sqlText = `SELECT ep.employeeNumberID "employeeNumberID", ep.workPlace "workPlace", 
    sc.accCategory as "accCategory", ep.organizationID as "organizationID",
    COALESCE(ep.dictPositionID, pos.dictPositionID) "dictPositionID"
  FROM hr_employeePosition ep
  JOIN hr_employeeNumber en on en.ID = ep.employeeNumberID
  LEFT JOIN hr_dictStaffCat sc ON sc.ID = ep.dictStaffCatID
  LEFT JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
       WHERE  pos2.mi_data_id = ep.positionID and pos2.orgID = en.orgID 
          and pos2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :dateTo:) then :dateTo: 
                                   when en.dateTo <= :dateTo: then en.dateTo end) 
          and pos2.mi_deleteDate >= '9999-12-31'              
          and pos2.state = 'ACTIVE' 
       order by pos2.mi_dateFrom desc ${sqlDialect.limit})
 
  WHERE ep.organizationID${entityBaseService.getInExpression('orgIDs')} 
   
  AND ep.id = (select ${sqlDialect.top}
    ep2.id from hr_employeePosition ep2
    JOIN hr_employeeNumber n on n.ID = ep2.employeeNumberID
    left JOIN hr_employee e on e.ID = ep2.employeeID
    where ep2.employeeNumberID = ep.employeeNumberID  and ep2.mi_deleteDate >= '9999-12-31' 
    and ep2.isActive = 1 and ep2.dateFrom <= :dateTo:        
    ${deptIDs ? `and ep.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
    order by ep2.dateFrom desc ${sqlDialect.limit})
  AND ep.isActive = 1
  AND ep.mi_deleteDate >= '9999-12-31' 
  ORDER BY ep.dateTo DESC`

  employeePositionDS = UB.DataStore('hr_employeePosition')
  employeePositionDS.runSQL(sqlText, {
    orgIDs,
    deptIDs,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo
  })
  employeePositions = employeePositionDS.getAsJsObject()
  employeePositions.filter(el => el.workPlace === '4' && el.accCategory !== '7').forEach(empItem => {
    empItem.workPlace = ''
  })

  let accSum = 0
  let empBalanceAll = []
  const sicknesPayEls = UB.Repository('hr_payEl').attrs(['ID']).where('methodID.code', 'in', ['17', '19', '20', '40', '41', '48']).misc({ __allowSelectSafeDeleted: true }).selectAsObject().map(o => o.ID)

  for (let k = 0; k < orgIDs.length; k++) {
    const period = periodService.getPeriodOnDate(orgIDs[k], params.dateTo)
    if (params.departmentID) {
      const ids = _.chunk(employeePositions.filter(el => el.organizationID === orgIDs[k]).map(el => el.employeeNumberID), 1000)
      for (let i = 0; i < ids.length; i++) {
        const empBalance = UB.Repository('hr_accrualBalance')
          .attrs(['SUM([sumFrom])', 'SUM([sumPay])', 'employeeNumberID.employeeID'])
          .where('periodCalcID', '=', period.ID)
          .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
          .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
          .logic('([fund] OR [notFund])')
          .where('employeeNumberID', 'in', ids[i])
          .groupBy(['employeeNumberID.employeeID'])
          .selectAsObject()
        empBalanceAll.push(...empBalance)
      }
    } else {
      empBalanceAll = UB.Repository('hr_accrualBalance')
        .attrs(['SUM([sumFrom])', 'SUM([sumPay])', 'employeeNumberID.employeeID'])
        .where('periodCalcID', '=', period.ID)
        .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
        .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
        .logic('([fund] OR [notFund])')
        .groupBy(['employeeNumberID.employeeID'])
        .selectAsObject()
    }

    accSum = 0
    let empCount = 0
    empBalanceAll.forEach(row => {
      if ((row['SUM([sumFrom])'] - row['SUM([sumPay])']) > 0) {
        if ((row['SUM([sumFrom])'] - row['SUM([sumPay])']) > 0 && (!params.minDebtEmp || params.minDebtEmp <= (row['SUM([sumFrom])'] - row['SUM([sumPay])']))) {
          accSum = accrualService.round(accSum + (row['SUM([sumFrom])'] - row['SUM([sumPay])']))
          empCount++
        }
      }
    })
    resultData.table71[1].value += accrualService.round(accSum, 2)
    resultData.table71[2].value += empCount

    if (accSum > 0 && sicknesPayEls.length) {
      const empData = {}
      const periods = [{
        period: Object.assign({}, period),
        sumSaldo: 0,
        sicknesSum: 0
      }]

      let currentEmployeeNumberBalance = []
      if (params.departmentID) {
        const ids = _.chunk(employeePositions.filter(el => el.organizationID === orgIDs[k]).map(el => el.employeeNumberID), 1000)
        for (let i = 0; i < ids.length; i++) {
          const balance = UB.Repository('hr_accrualBalance')
            .attrs(['employeeNumberID', 'SUM([sumFrom])', 'SUM([sumPay])', 'SUM([sumPlus])', 'SUM([sumMinus])', 'SUM([sumTo])'])
            .where('employeeNumberID', 'in', ids[i])
            .where('periodCalcID', '=', period.ID)
            .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
            .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
            .logic('([fund] OR [notFund])')
            .groupBy(['employeeNumberID'])
            .selectAsObject()
          currentEmployeeNumberBalance.push(...balance)
        }
      } else {
        currentEmployeeNumberBalance = UB.Repository('hr_accrualBalance')
          .attrs(['employeeNumberID', 'SUM([sumFrom])', 'SUM([sumPay])', 'SUM([sumPlus])', 'SUM([sumMinus])', 'SUM([sumTo])'])
          .where('periodCalcID', '=', period.ID)
          .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
          .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
          .logic('([fund] OR [notFund])')
          .groupBy(['employeeNumberID'])
          .selectAsObject()
      }

      let employeeNumberIDs = []
      currentEmployeeNumberBalance.forEach(row => {
        if (((row['SUM([sumFrom])'] || 0) + (row['SUM([sumPlus])'] || 0) - (row['SUM([sumMinus])']) - (row['SUM([sumPay])'] || 0)) >= (!params.minDebtEmp ? 0 : params.minDebtEmp)) {
          empData[row.employeeNumberID] = [{
            periodID: period.ID,
            sumFrom: row['SUM([sumFrom])'] || 0,
            sumPlus: 0,
            sumPay: row['SUM([sumPay])'] || 0,
            sumMinus: 0,
            sumTo: 0,
            sumSaldo: 0,
            sicknesSum: 0
          }]
          employeeNumberIDs.push(row.employeeNumberID)
        }
      })
      let priorPeriod = periodService.getPeriodOnDate(orgIDs[k], dateService.addMonths(period.dateFrom, -1))
      while (priorPeriod && employeeNumberIDs.length) {
        const currentEmployeeNumberBalance = UB.Repository('hr_accrualBalance')
          .attrs(['employeeNumberID', 'SUM([sumFrom])', 'SUM([sumPay])', 'SUM([sumPlus])', 'SUM([sumMinus])', 'SUM([sumTo])'])
          .where('employeeNumberID', 'in', employeeNumberIDs)
          .where('periodCalcID', '=', priorPeriod.ID)
          .where('dictFundSourceID.dictFundTypeID.code', 'notIn', ['02', '03'], 'fund')
          .where('dictFundSourceID.dictFundTypeID.code', 'isNull', undefined, 'notFund')
          .logic('([fund] OR [notFund])')
          .groupBy(['employeeNumberID'])
          .selectAsObject()
        employeeNumberIDs = []
        currentEmployeeNumberBalance.forEach(row => {
          if (((row['SUM([sumFrom])'] || 0) + (row['SUM([sumPlus])'] || 0) - (row['SUM([sumMinus])']) - (row['SUM([sumPay])'] || 0)) >= 0) {
            empData[row.employeeNumberID].push({
              periodID: priorPeriod.ID,
              sumFrom: row['SUM([sumFrom])'] || 0,
              sumPlus: row['SUM([sumPlus])'] || 0,
              sumPay: row['SUM([sumPay])'] || 0,
              sumMinus: row['SUM([sumMinus])'] || 0,
              sumTo: row['SUM([sumTo])'] || 0,
              sumSaldo: (row['SUM([sumPlus])'] || 0) - (row['SUM([sumMinus])'] || 0),
              sicknesSum: 0
            })
            employeeNumberIDs.push(row.employeeNumberID)
          }
        })
        let sicknesAccrual = UB.Repository('hr_accrual')
          .attrs(['SUM([paySum])', 'employeeNumberID'])
          .where('[employeeNumberID]', 'in', employeeNumberIDs.length ? employeeNumberIDs : [0])
          .where('[payElID]', 'in', sicknesPayEls)
          .where('periodCalcID', '=', priorPeriod.ID)
          .where(`(flagsRec & 8192 != 8192)`, 'custom')
          .groupBy(['employeeNumberID'])
          .selectAsObject()
        sicknesAccrual.forEach(row => {
          const empPeriod = empData[row.employeeNumberID].find(o => o.periodID === priorPeriod.ID)
          empPeriod.sicknesSum = accrualService.round((row['SUM([paySum])'] || 0) / empPeriod.sumPlus * empPeriod.sumSaldo)
          empPeriod.sumSaldo = accrualService.round(empPeriod.sumSaldo - empPeriod.sicknesSum)
        })
        if (employeeNumberIDs.length) {
          periods.push({
            period: Object.assign({}, priorPeriod),
            sumSaldo: 0,
            sicknesSum: 0
          })
        }
        priorPeriod = periodService.getPeriodOnDate(orgIDs[k], dateService.addMonths(priorPeriod.dateFrom, -1))
      }

      Object.keys(empData).forEach(empNumID => {
        for (let i = empData[empNumID].length - 1; i >= 0; i--) {
          if (empData[empNumID][i].sicknesSum > 0) {
            for (let j = i; j >= 0; j--) {
              if (empData[empNumID][i].sicknesSum > 0) {
                if (empData[empNumID][j].sicknesSum < 0) {
                  let calcSum = Math.min(accrualService.round(empData[empNumID][i].sicknesSum, -1 * empData[empNumID][j].sicknesSum))
                  empData[empNumID][i].sicknesSum = accrualService.round(empData[empNumID][i].sicknesSum - calcSum)
                  empData[empNumID][j].sicknesSum = accrualService.round(empData[empNumID][j].sicknesSum + calcSum)
                }
                if (empData[empNumID][j].sumPay > 0 && empData[empNumID][i].sicknesSum > 0) {
                  let calcSum = Math.min(empData[empNumID][i].sicknesSum, empData[empNumID][j].sumPay)
                  empData[empNumID][i].sicknesSum = accrualService.round(empData[empNumID][i].sicknesSum - calcSum)
                  empData[empNumID][j].sumPay = accrualService.round(empData[empNumID][j].sumPay - calcSum)
                }
              }
            }
          }
          if (empData[empNumID][i].sumSaldo !== 0) {
            for (let j = i; j >= 0; j--) {
              if (empData[empNumID][j].sumPay > 0) {
                let calcSum = Math.min(empData[empNumID][i].sumSaldo, empData[empNumID][j].sumPay)
                empData[empNumID][i].sumSaldo = accrualService.round(empData[empNumID][i].sumSaldo - calcSum)
                empData[empNumID][j].sumPay = accrualService.round(empData[empNumID][j].sumPay - calcSum)
              }
            }
          }
          if (empData[empNumID][i].sicknesSum > 0) {
            const debtPeriod = periods.find(o => o.period.ID === empData[empNumID][i].periodID)
            debtPeriod.sicknesSum = accrualService.round(debtPeriod.sicknesSum + empData[empNumID][i].sicknesSum)
          }
          if (empData[empNumID][i].sumSaldo > 0) {
            const debtPeriod = periods.find(o => o.period.ID === empData[empNumID][i].periodID)
            debtPeriod.sumSaldo = accrualService.round(debtPeriod.sumSaldo + empData[empNumID][i].sumSaldo)
          }
        }
      })

      let sicknesSum = 0
      periods.forEach(resPeriod => {
        sicknesSum = accrualService.round(sicknesSum + resPeriod.sicknesSum)
      })

      resultData.table71[3].value += accrualService.round(sicknesSum, 2)
    }
  }

  resultData.table71[0].value = resultData.table71[1].value || resultData.table71[3].value ? 'ні' : 'так'

  // === Table 8
  let timeSheetData = []
  const ids = _.chunk(employeePositions.map(el => el.employeeNumberID), 1000)
  for (let i = 0; i < ids.length; i++) {
    const ts = UB.Repository('tim_timeSheet')
      .where('[employeeNumberID]', 'in', ids[i])
      .where('[isActive]', '=', true)
      .where('[factTimeCostID.timeCostType]', '=', 'WORK', 'workType')
      .where('[factTimeCostID.code]', '=', 'Вдр', 'businessTrip')
      .where('[dateWork]', '>=', params.dateFrom)
      .where('[dateWork]', '<=', params.dateTo)
      .logic('([workType] OR [businessTrip])')
      .attrs(['SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [normHour] END)', 'employeeNumberID'])
      .groupBy(['employeeNumberID'])
      .selectAsObject({
        'SUM(CASE WHEN [factTimeCostID.timeCostType] = \'WORK\' THEN [factHour] ELSE [normHour] END)': 'sum'
      })
    timeSheetData.push(...ts)
  }

  const employeesADM = adminPositionIDs ? employeePositions.filter(emp => adminPositionIDs.includes(emp.dictPositionID)).map(el => el.employeeNumberID) : []
  function calcRow (num, employeeNumbers, workPlaces) {
    const rowObj = resultData.table8[num]
    let np = 4
    _.forEach(dictPositiontParams, paramItem => {
      const items = paramItem.other
        ? idParams.filter(el => paramItem.codes.includes(el.code))
        : idParams.filter(el => el.code === paramItem.code)
      const dictPositionIDs = items ? items.map(el => el.valuesID) : []
      if (dictPositionIDs.length) {
        const employees = paramItem.other
          ? employeePositions.filter(emp => !dictPositionIDs.includes(emp.dictPositionID) && workPlaces.includes(emp.workPlace)).map(el => el.employeeNumberID)
          : employeePositions.filter(emp => dictPositionIDs.includes(emp.dictPositionID) && workPlaces.includes(emp.workPlace)).map(el => el.employeeNumberID)
        if (employees && employees.length) {
          rowObj[`value12`] += timeSheetData.filter(el => employees.includes(el.employeeNumberID)).reduce((sum, curValue) => sum + curValue.sum, 0)
          _.forEach(employeeNumbers, (item, id) => {
            if (employees.includes(parseInt(id))) {
              rowObj[`value3`] += item.dayCount
              if (paramItem.code === '1NC2' || paramItem.code === '1NC6') {
                if (employeesADM.length && employeesADM.includes(parseInt(id))) {
                  rowObj[`value${np}`] += item.dayCount
                } else {
                  rowObj[`value${np + 1}`] += item.dayCount
                }
              } else {
                rowObj[`value${np}`] += item.dayCount
              }
            }
          })
        }
      }
      np += paramItem.code === '1NC2' || paramItem.code === '1NC6' ? 2 : 1
    })
    getSumms(rowObj, totalRow8, false)
  }

  const totalRow8 = resultData.table8[0]
  for (let i = 0; i < orgIDs.length; i++) {
    const parametrs = {
      workPlace: ['1'],
      orgID: orgIDs[i],
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      departmentID: params.departmentID,
      includeChildDepts: params.includeSubDep
    }
    let aList = reportService.getAvgListEmpCount(parametrs)
    if (aList && aList.dayCount !== 0 && aList.employeeNumbers) {
      calcRow(1, aList.employeeNumbers, ['1'])
    }

    parametrs.workPlace = ['3']
    parametrs.withCPH = true
    aList = reportService.getAvgListEmpCount(parametrs)
    if (aList && aList.dayCount !== 0 && aList.employeeNumbers) {
      calcRow(2, aList.employeeNumbers, ['3'])
      calcRow(3, aList.employeeNumbers, ['4'])
    }
  }
  return resultData
}

function getCostItemsData (params) {
  params.dateFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.dateTo = dateService.shiftDate(params.periodToDateTo)
  const moveFrom = dateService.shiftDate(params.periodFrom)
  const reportDateFrom = dateService.shiftDate(Math.min(params.dateFrom.getTime(), moveFrom.getTime()))

  const sqlDialect = entityBaseService.getSQLDialect()
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')

  const resultData = {
    tableTitle: [],
    tableHead1: [],
    tableHead2: [],
    tableHead3: [],
    tableWidth: 1150,
    colSpan: 12,
    colSpan2: 4,
    data: []
  }

  let orgIDs = []
  let orgNames = []
  if (params.organizationID) {
    orgIDs = [params.organizationID]
    if (params.includeSubOrg) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${params.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [params.organizationID]
  }
  orgIDs.forEach(orgID => {
    const org = UB.Repository('hr_organization')
      .attrs(['treePath', 'description'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .limit(1)
      .selectSingle()
    orgNames.push({
      ID: orgID,
      treePath: org ? org.treePath : '',
      description: org ? org.description : ''
    })
  })
  orgNames.sort((a, b) => a.treePath < b.treePath ? -1 : 1)

  let depName
  let deptIDs = null
  if (params.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', params.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: params.dateTo })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (params.includeSubDep) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', params.organizationID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.dateTo)
        .where('mi_dateTo', '>=', params.dateTo)
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
  if (params.dictMultiGroupID) {
    depName = UB.Repository('hr_dictMultiGroup')
      .attrs('name')
      .where('ID', '=', params.dictMultiGroupID)
      .selectScalar()
    const depts = UB.Repository('hr_dictMultiGroupDep')
      .attrs('departmentID')
      .where('dictMultiGroupID', '=', params.dictMultiGroupID)
      .selectAsObject()
    deptIDs = depts.map(o => o.departmentID)
    if (params.includeSubMultiGroup) {
      depName += ' (з підлеглими)'
      depts.forEach(departmentID => {
        const subDepts = UB.Repository('hr_department')
          .attrs(['mi_data_id'])
          .where('orgID', '=', params.organizationID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', params.periodTo)
          .where('mi_dateTo', '>=', params.periodTo)
          .where('mi_treePath', 'like', `%/${departmentID}/%`)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
      })
    }
  }

  const glAccount = {}
  UB.Repository('gl_account')
    .attrs('ID', 'code', 'name')
    .selectAsObject().forEach(row => {
      glAccount[row.ID] = { code: row.code, name: row.name }
    })

  const getGlAccountName = function (accountID) {
    const glAcc = glAccount[accountID]
    return glAcc ? glAcc['name'] : ''
  }

  const getGlAccountCode = function (accountID) {
    const glAcc = glAccount[accountID]
    return glAcc ? glAcc['code'] : ''
  }

  const getGlAccountDesc = function (accountID) {
    const glAcc = glAccount[accountID]
    return glAcc ? glAcc['code'] + ' ' + glAcc['name'] : ''
  }

  const dictCostType = {}
  UB.Repository('ac_dictCostType')
    .attrs('ID', 'accountID')
    .selectAsObject().forEach(row => {
      dictCostType[row.ID] = row.accountID
    })

  resultData.tableTitle.push({ text: orgNames[0].description + (params.includeSubOrg ? ' (з підлеглими)' : '') })

  if (!params.dateFrom.getMonth() && params.dateTo.getMonth() === 11) {
    resultData.tableTitle.push({ text: 'за ' + params.dateTo.getFullYear() + ' рік' })
  } else if (params.dateFrom === params.dateTo) {
    resultData.tableTitle.push({ text: 'за ' + dateService.formatDate(params.dateFrom) + ' року. ' + dateService.formatDate(params.dateTo) })
  } else {
    resultData.tableTitle.push({ text: 'за період з ' + dateService.formatDate(params.dateFrom) + ' року по ' + dateService.formatDate(params.dateTo) + ' року.' })
  }
  if (params.includeSubDep) {
    resultData.tableTitle.push({ text: 'Підрозділ ' + depName })
  } else if (params.departmentID) {
    resultData.tableTitle.push({ text: 'Підрозділ ' + depName })
  } else if (params.dictMultiGroupID) {
    resultData.tableTitle.push({ text: 'Група підрозділів ' + depName })
  }

  const accrualDS = UB.DataStore('hr_accrual')
  let sqlText = `SELECT acc.ID as "accrualID", 
      acc.payElID as "payElID",
      acc.periodCalcID as "periodCalcID",
      acc.periodSalaryID as "periodSalaryID",
      acc.periodCalc as "periodCalc",
      acc.periodSalary as "periodSalary",
      meth.code as "methCode",
      entryOperationID as "entryOperationID",
      acc.employeeNumberID as "employeeNumberID",
      dt.departmentID as "departmentID",
      methGr.groupType as "groupType",
      acc.orgID as "orgID",
      (SELECT ${sqlDialect.top} ID FROM ac_dictCostType dct 
        WHERE dct.ID = dt.d0Value OR dct.ID = dt.d1Value OR dct.ID = dt.d2Value OR dct.ID = dt.d3Value 
            OR dct.ID = dt.d4Value OR dct.ID = dt.d5Value OR dct.ID = dt.d6Value OR dct.ID = dt.d7Value 
            OR dct.ID = dt.d8Value OR dct.ID = dt.d9Value
        ${sqlDialect.limit}
      ) "dictCostTypeID",
      sum(dt.paySum) AS "paySum"
  FROM hr_accrual acc
    INNER JOIN hr_accrualDt dt ON acc.ID = dt.accrualID
    INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pf ON pf.ID = acc.payElID 
    INNER JOIN hr_method meth on pf.methodID = meth.ID 
    INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID
    INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and 
     ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
     ep2.employeeNumberID = en.ID 
     and ep2.isActive = 1
     and ep2.dateFrom <= :dateTo:   
     and ep2.mi_deleteDate >= '9999-12-31' 
     order by ep2.dateFrom desc ${sqlDialect.limit}) 
  WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')} 
  AND acc.periodCalc <= :dateTo: and acc.periodCalc >= :dateFrom: 
  -- AND acc.flagsRec & 8192 != 8192   
  ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
  ${deptIDs ? ' AND ep.departmentID ' + entityBaseService.getInExpression('deptIDs') : ''}
  GROUP BY acc.ID, acc.payElID, acc.periodCalcID, acc.periodSalaryID, acc.periodCalc, acc.periodSalary, meth.code,
   entryOperationID, acc.employeeNumberID, dt.departmentID, methGr.groupType, acc.orgID,
   dt.d0Value, dt.d1Value, dt.d2Value, dt.d3Value, dt.d4Value, dt.d5Value, dt.d6Value, dt.d7Value, dt.d8Value, dt.d9Value
  `
  accrualDS.runSQL(sqlText, {
    orgIDs,
    dateFrom: reportDateFrom,
    dateTo: params.dateTo,
    deptIDs
  })

  let accrualData = accrualDS.getAsJsObject()

  const entryOperationSet = {}
  const entryOperations = UB.Repository('hr_entryAcc')
    .attrs(['entryOperationID', 'dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'accountDtID', 'accountKtID',
      'operPeriod', 'operSum', 'isReversal', 'excludeOrg', 'excludeDepartment', 'excludeFundSource', 'excludeWorkPlace',
      'entryAccDt', 'entryOperationID.code', 'entryOperationID.name', 'entryOperationID.description'
    ])
    .selectAsObject()
  let byEmployeePosition
  entryOperations.forEach(row => {
    entryOperationSet[row['entryOperationID']] = {
      code: row['entryOperationID.code'],
      name: row['entryOperationID.name'],
      description: row['entryOperationID.description']
    }
    if (row.entryAccDt) {
      row.entryAccDt = JSON.parse(row.entryAccDt)
      if (row.entryAccDt.wp && row.entryAccDt.wp.length) {
        byEmployeePosition = true
      }
    }
  })

  let employeeNumbers = []
  if (byEmployeePosition) {
    const employeeNumberStore = UB.DataStore('hr_employeeNumber')
    employeeNumberStore.runSQL(` 
    SELECT en.ID "ID",
    ep.workPlace "wp"
    FROM hr_employeeNumber en 
      INNER JOIN hr_employeePosition ep ON ep.isActive = 1 and 
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.dateFrom <= :dateTo:   
       and ep2.mi_deleteDate >= '9999-12-31' 
       order by ep2.dateFrom desc ${sqlDialect.limit}) 
    WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')} 
    ${deptIDs ? ' AND ep.departmentID ' + entityBaseService.getInExpression('deptIDs') : ''}
    AND EXISTS (SELECT 1 FROM hr_accrual a WHERE a.employeeNumberID = en.ID AND a.periodCalc <= :dateTo: 
      and a.periodCalc >= :dateFrom: AND a.flagsRec & 4096 = 0) 
    ORDER BY en.ID
  `, {
      orgIDs,
      dateFrom: reportDateFrom,
      dateTo: params.dateTo,
      deptIDs
    })
    employeeNumbers = employeeNumberStore.getAsJsObject()
    employeeNumberStore.freeNative()
  }
  accrualData.forEach(acc => {
    acc.periodCalc = dateService.shiftDate(acc.periodCalc)
    acc.periodSalary = dateService.shiftDate(acc.periodSalary)
    acc.accountDtID = 0
    acc.accountKtID = 0
    acc.isInclude = false
    if (acc.entryOperationID) {
      const entryAcc = entryOperations.filter(o => o.entryOperationID === acc.entryOperationID)
      let isNotFound = true
      entryAcc.forEach(entry => {
        if (isNotFound) {
          if ((!entry.operPeriod || (entry.operPeriod === 'prior' && acc.periodSalary < acc.periodCalc) ||
              (entry.operPeriod === 'current' && acc.periodSalaryID === acc.periodCalcID) ||
              (entry.operPeriod === 'priorCurrent' && acc.periodSalary <= acc.periodCalc) ||
              (entry.operPeriod === 'next' && acc.periodSalary > acc.periodCalc) ||
              (entry.operPeriod === 'nextAdditional' && acc.periodSalary > acc.periodCalc)) &&
            (!entry.operSum || (entry.operSum && ((entry.operSum === 'moreZero' && acc.paySum > 0) || (entry.operSum === 'lessZero' && acc.paySum < 0)))) &&
            (!entry.entryAccDt || (
              (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(acc.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(acc.orgID))) &&
              (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(acc.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(acc.departmentID))) &&
              (!entry.entryAccDt.fs || !entry.entryAccDt.fs.length || (entry.excludeFundSource && !entry.entryAccDt.fs.includes(acc.dictFundSourceID)) || (!entry.excludeFundSource && entry.entryAccDt.fs.includes(acc.dictFundSourceID))) &&
              (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length ||
                (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)) ||
                (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)))
            ))
          ) {
            const accountDt = getGlAccountCode(entry.accountDtID)
            const accountKt = getGlAccountCode(entry.accountKtID)
            if (String(accountDt).indexOf('66') === 0 || String(accountKt).indexOf('66') === 0) {
              acc.accountDtID = entry.accountDtID || 0
              acc.accountKtID = entry.accountKtID || 0
              acc.accountDt = accountDt
              acc.accountKt = accountKt
              acc.isInclude = true
              isNotFound = false
              acc.accountID = acc.dictCostTypeID ? dictCostType[acc.dictCostTypeID] : 0
            }
          }
        }
      })
    }
    acc.sumKt = String(acc.accountKt).indexOf('66') === 0 ? acc.paySum : 0
    acc.sumDt = String(acc.accountKt).indexOf('66') === 0 ? 0 : acc.paySum
  })

  accrualData = accrualData.filter(o => o.isInclude)

  const groupData5 = []
  accrualData.filter(o => o.periodCalc >= params.dateFrom && o.periodCalc <= params.dateTo && o.paySum !== 0).forEach(acc => {
    const idx = groupData5.findIndex(o => o.entryOperationID === acc.entryOperationID && o.accountID === acc.accountID)
    if (idx >= 0) {
      const el = groupData5[idx]
      el.sumDt += (acc.sumDt || 0)
      el.sumKt += (acc.sumKt || 0)
      el.sum += acc.groupType === 'PAYMENT' ? (acc.paySum || 0) : 0
    } else {
      groupData5.push({
        entryOperationID: acc.entryOperationID,
        accountID: acc.accountID,
        accountDtID: acc.accountDtID,
        accountKtID: acc.accountKtID,
        isDt: String(acc.accountKt).indexOf('66') === 0 ? 1 : 0,
        sumDt: acc.sumDt || 0,
        sumKt: acc.sumKt || 0,
        sum: acc.groupType === 'PAYMENT' ? (acc.paySum || 0) : 0
      })
    }
  })

  const payElTaxIndivid = UB.Repository('hr_payElTaxIndivid')
    .attrs('taxIndividID', 'payElID')
    .where('taxIndividID.mi_deleteDate', '>=', '#maxdate')
    .where('payElID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  const accrualTaxIDs = accrualData.filter(item => ['26'].includes(item.methCode)).map(o => o.accrualID)
  const taxIndividAcc = UB.Repository('hr_taxIndividAcc')
    .attrs('accrualID.employeeNumberID', 'taxIndividID', 'sum([incomeSum])', 'sum([taxSum])', 'sum([taxFreeSum])', 'sum([privilegeSum])')
    .where('accrualID', 'in', accrualTaxIDs.concat([0]))
    .groupBy(['accrualID.employeeNumberID', 'taxIndividID'])
    .selectAsObject({
      'accrualID.employeeNumberID': 'employeeNumberID',
      'sum([incomeSum])': 'incomeSum',
      'sum([taxSum])': 'taxSum',
      'sum([taxFreeSum])': 'taxFreeSum',
      'sum([privilegeSum])': 'privilegeSum'
    })

  const accrualDataTax = []
  taxIndividAcc.forEach(tax => {
    const payElTax = payElTaxIndivid.filter(o => o.taxIndividID === tax.taxIndividID).map(o => o.payElID)
    const accruals = accrualData.filter(o => o.employeeNumberID === tax.employeeNumberID && payElTax.includes(o.payElID))
    const paySum = accruals.reduce((sum, o) => sum + (o['paySum'] || 0), 0)
    accruals.forEach(acc => {
      acc.privilegeSum = (tax['privilegeSum'] || 0) / (paySum || 0) * acc.paySum
      acc.taxFreeSum = (tax['taxFreeSum'] || 0) / (paySum || 0) * acc.paySum
      accrualDataTax.push({
        entryOperationID: acc.entryOperationID,
        accountID: acc.accountID,
        accountDtID: acc.accountDtID,
        accountKtID: acc.accountKtID,
        taxFreeSum: (acc.taxFreeSum || 0) + (acc.privilegeSum || 0)
      })
    })
  })

  const groupDataTax = []
  accrualDataTax.forEach(acc => {
    const idx = groupDataTax.findIndex(o => o.entryOperationID === acc.entryOperationID && o.accountDtID === acc.accountDtID && o.accountKtID === acc.accountKtID)
    if (idx >= 0) {
      const el = groupDataTax[idx]
      el.taxFreeSum += acc.taxFreeSum || 0
    } else {
      groupDataTax.push({
        entryOperationID: acc.entryOperationID,
        accountDtID: acc.accountDtID,
        accountKtID: acc.accountKtID,
        taxFreeSum: acc.taxFreeSum || 0
      })
    }
  })

  groupData5.forEach(acc => {
    const dataTax = accrualDataTax.filter(o => o.entryOperationID === acc.entryOperationID && o.accountID === acc.accountID && o.accountDtID === acc.accountDtID && o.accountKtID === acc.accountKtID)
    acc.taxFreeSum = dataTax.reduce((sum, o) => sum + (o['taxFreeSum'] || 0), 0)
  })

  sqlText = `SELECT 
    acc.payFundID as "payFundID", 
    pf.name AS "payFundName",
    fm.code as "pfmCode",
    acc.rate,
    acc.periodCalcID as "periodCalcID",
    acc.periodSalaryID as "periodSalaryID",
    acc.periodCalc as "periodCalc",
    acc.periodSalary as "periodSalary",
    dt.payElID as "payElID",
    acc.employeeNumberID AS "employeeNumberID",
    pf.entryOperationID AS "entryOperationID",
    dt.departmentID,
    dt.dictFundSourceID,
    acc.orgID as "orgID",
    (SELECT ${sqlDialect.top} ID FROM ac_dictCostType dct 
      WHERE dct.ID = dt.d0Value OR dct.ID = dt.d1Value OR dct.ID = dt.d2Value OR dct.ID = dt.d3Value 
          OR dct.ID = dt.d4Value OR dct.ID = dt.d5Value OR dct.ID = dt.d6Value OR dct.ID = dt.d7Value 
          OR dct.ID = dt.d8Value OR dct.ID = dt.d9Value
      ${sqlDialect.limit}
    ) "dictCostTypeID",
    sum(dt.paySum) AS "paySum",
    sum(dt.sourceSum) AS "sourceSum",
    sum(dt.baseSum) AS "baseSum"
  FROM hr_accrualFund acc
    INNER JOIN hr_accrualFundDt dt ON acc.ID = dt.accrualFundID
    INNER JOIN hr_payFund pf ON pf.ID=acc.payFundID
    LEFT JOIN hr_payFundMethod fm ON fm.ID = pf.payFundMethodID
    LEFT JOIN hr_entryOperation eo ON pf.entryOperationID = eo.ID
    INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_employeePosition ep ON ep.isActive = 1 AND 
     ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 
        where ep2.employeeNumberID = en.ID and ep2.isActive = 1 and ep2.dateFrom <= :dateTo:
        and ep2.mi_deleteDate >= '9999-12-31' order by ep2.dateFrom desc ${sqlDialect.limit}) 
  WHERE en.orgID ${entityBaseService.getInExpression('orgIDs')} 
    AND acc.periodCalc <= :dateTo: and acc.periodCalc >= :dateFrom:
    -- AND pf.isRecSum=0
    ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
    ${deptIDs ? ' AND ep.departmentID ' + entityBaseService.getInExpression('deptIDs') : ''}
  GROUP BY acc.payFundID, pf.name, fm.code, acc.rate, acc.periodCalcID, acc.periodSalaryID, acc.periodCalc, acc.periodSalary,
   dt.payElID, acc.employeeNumberID, pf.entryOperationID, dt.departmentID, dt.dictFundSourceID, acc.orgID,
   dt.d0Value, dt.d1Value, dt.d2Value, dt.d3Value, dt.d4Value, dt.d5Value, dt.d6Value, dt.d7Value, dt.d8Value, dt.d9Value
 `

  accrualDS.runSQL(sqlText, {
    orgIDs,
    dateFrom: reportDateFrom,
    dateTo: params.dateTo,
    deptIDs
  })

  let accrualFundData = accrualDS.getAsJsObject()
  accrualFundData.forEach(acc => {
    acc.periodCalc = dateService.shiftDate(acc.periodCalc)
    acc.periodSalary = dateService.shiftDate(acc.periodSalary)
    acc.accountDtID = 0
    acc.accountKtID = 0
    if (acc.entryOperationID) {
      const entryAcc = entryOperations.filter(o => o.entryOperationID === acc.entryOperationID)
      let isNotFound = true
      entryAcc.forEach(entry => {
        if (isNotFound) {
          if ((!entry.operPeriod || (entry.operPeriod === 'prior' && acc.periodSalary < acc.periodCalc) ||
              (entry.operPeriod === 'current' && acc.periodSalaryID === acc.periodCalcID) ||
              (entry.operPeriod === 'priorCurrent' && acc.periodSalary <= acc.periodCalc) ||
              (entry.operPeriod === 'next' && acc.periodSalary > acc.periodCalc) ||
              (entry.operPeriod === 'nextAdditional' && acc.periodSalary > acc.periodCalc)) &&
            (!entry.operSum || (entry.operSum && ((entry.operSum === 'moreZero' && acc.paySum > 0) || (entry.operSum === 'lessZero' && acc.paySum < 0)))) &&
            (!entry.entryAccDt || (
              (!entry.entryAccDt.org || !entry.entryAccDt.org.length || (entry.excludeOrg && !entry.entryAccDt.org.includes(acc.orgID)) || (!entry.excludeOrg && entry.entryAccDt.org.includes(acc.orgID))) &&
              (!entry.entryAccDt.dep || !entry.entryAccDt.dep.length || (entry.excludeDepartment && !entry.entryAccDt.dep.includes(acc.departmentID)) || (!entry.excludeDepartment && entry.entryAccDt.dep.includes(acc.departmentID))) &&
              (!entry.entryAccDt.fs || !entry.entryAccDt.fs.length || (entry.excludeFundSource && !entry.entryAccDt.fs.includes(acc.dictFundSourceID)) || (!entry.excludeFundSource && entry.entryAccDt.fs.includes(acc.dictFundSourceID))) &&
              (!entry.entryAccDt.wp || !entry.entryAccDt.wp.length ||
                (entry.excludeWorkPlace && !entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)) ||
                (!entry.excludeWorkPlace && entry.entryAccDt.wp.includes((accrualService.binarySearch(employeeNumbers, acc.employeeNumberID, 0, employeeNumbers.length - 1, 'ID') || {}).wp)))
            ))
          ) {
            acc.accountKtID = entry.accountKtID || 0
            isNotFound = false
          }
        }
      })
    }
    acc.accountID = acc.dictCostTypeID ? dictCostType[acc.dictCostTypeID] : 0
  })

  const groupDataFund13 = []
  accrualFundData.filter(o => o.periodCalc >= params.dateFrom && o.periodCalc <= params.dateTo).forEach(acc => {
    const idx = groupDataFund13.findIndex(o => o.entryOperationID === acc.entryOperationID && o.accountID === acc.accountID && o.payFundID === acc.payFundID && o.rate === acc.rate && o.accountDtID === acc.accountDtID && o.accountKtID === acc.accountKtID)
    if (idx >= 0) {
      const el = groupDataFund13[idx]
      el.baseSum += (acc.baseSum || 0)
      el.sourceSum += (acc.sourceSum || 0)
      el.paySum += (acc.paySum || 0)
      el.extraSum += acc.pfmCode === '2' ? 0 : (acc.sourceSum || 0) - (acc.baseSum || 0)
      el.addBaseSum += acc.pfmCode === '2' ? (acc.baseSum || 0) : 0
    } else {
      groupDataFund13.push({
        entryOperationID: acc.entryOperationID,
        accountID: acc.accountID,
        payFundID: acc.payFundID,
        payFundName: acc.payFundName,
        rate: acc.rate,
        accountDtID: acc.accountDtID,
        accountKtID: acc.accountKtID,
        isDt: 0,
        baseSum: acc.baseSum || 0,
        sourceSum: acc.sourceSum || 0,
        extraSum: acc.pfmCode === '2' ? 0 : (acc.sourceSum || 0) - (acc.baseSum || 0),
        addBaseSum: acc.pfmCode === '2' ? (acc.baseSum || 0) : 0,
        paySum: acc.paySum || 0
      })
    }
  })

  const columns = []
  const groupDataFund = []
  groupDataFund13.forEach(acc => {
    const idx = groupDataFund.findIndex(o => o.entryOperationID === acc.entryOperationID && o.accountID === acc.accountID && o.payFundID === acc.payFundID && o.rate === acc.rate)
    const incomeSum = 0 // accrualData.filter(o => o.groupType === 'PAYMENT' && o.entryOperationID === acc.entryOperationID && o.accountKtID === acc.accountKtID).reduce((sum, o) => sum + (o['paySum'] || 0), 0)
    if (idx >= 0) {
      const el = groupDataFund[idx]
      el.baseSum += (acc.baseSum || 0)
      el.sourceSum += (acc.sourceSum || 0)
      el.paySum += (acc.paySum || 0)
      el.sum += incomeSum
      el.taxFreeSum = 0 // incomeSum - (acc.sourceSum || 0)
      el.extraSum += (acc.extraSum || 0)
      el.addBaseSum += (acc.addBaseSum || 0)
    } else {
      groupDataFund.push({
        entryOperationID: acc.entryOperationID,
        accountID: acc.accountID,
        payFundID: acc.payFundID,
        rate: acc.rate,
        isDt: 0,
        sum: incomeSum, // сума нарахована
        baseSum: acc.baseSum || 0, // базова сума
        sourceSum: acc.sourceSum || 0, // нараховано
        paySum: acc.paySum || 0, // сума ЄСВ
        extraSum: acc.extraSum || 0, // Сума перевищення
        addBaseSum: acc.addBaseSum || 0,
        taxFreeSum: 0 // incomeSum - (acc.sourceSum || 0) // неоподаткована сума
      })
    }
    const el = columns.find(o => o.payFundID === acc.payFundID && o.rate === acc.rate && o.accountKtID === acc.accountKtID)
    if (!el) {
      columns.push({
        payFundID: acc.payFundID,
        rate: acc.rate,
        accountKtID: acc.accountKtID,
        accountKt: getGlAccountCode(acc.accountKtID) || '&nbsp;',
        name: acc.payFundName
      })
    }
  })

  const groupDataAcc = groupData5.concat(groupDataFund).filter(row => row.sumDt || row.sumKt || row.sum || row.taxFreeSum || row.extraSum || row.baseSum || row.sourceSum || row.addBaseSum || row.paySum)
  const tableData4 = []

  groupDataAcc.forEach(acc => {
    const idx = tableData4.findIndex(o => o.entryOperationID === acc.entryOperationID && o.accountID === acc.accountID && o.isDt === acc.isDt)
    if (idx >= 0) {
      const el = tableData4[idx]
      el.sumDt += (acc.sumDt || 0)
      el.sumKt += (acc.sumKt || 0)
      el.sum = Math.max(el.sum, acc.sum)
      el.baseSum += (acc.baseSum || 0)
      el.sourceSum += (acc.sourceSum || 0)
      el.paySum += (acc.paySum || 0)
      el.taxFreeSum += (acc.taxFreeSum || 0)
      el.extraSum += (acc.extraSum || 0)
      el.addBaseSum += (acc.addBaseSum || 0)
      el.payFunds.push({
        payFundID: acc.payFundID,
        paySum: acc.paySum
      })
    } else {
      tableData4.push({
        entryOperationID: acc.entryOperationID || 0,
        accountID: acc.accountID || 0,
        payFunds: [{
          payFundID: acc.payFundID,
          paySum: acc.paySum
        }],
        isDt: acc.isDt || 0,
        sumDt: acc.sumDt || 0,
        sumKt: acc.sumKt || 0,
        sum: acc.sum || 0, // сума нарахована
        baseSum: acc.baseSum || 0, // базова сума
        sourceSum: acc.sourceSum || 0, // нараховано
        paySum: acc.paySum || 0, // сума ЄСВ
        taxFreeSum: acc.taxFreeSum || 0, // неоподаткована сума
        extraSum: acc.extraSum || 0, // Сума перевищення
        addBaseSum: acc.addBaseSum || 0 // Додаткова база
      })
    }
  })

  function makeTotal (totalRow, data) {
    const totalAttrs = ['sumDt', 'sumKt', 'sum', 'sumTaxFree', 'sumExtra', 'sumAdd', 'sumBase', 'paySum', 'sumTotal']
    data.forEach(row => {
      totalAttrs.forEach(attr => {
        totalRow[attr] += row[attr] || 0
      })
    })
  }

  function renumerate (data) {
    data.forEach((row, idx) => {
      row.npp = idx + 1
    })
  }

  columns.sort((a, b) => stringService.compareStringUa(a.accountKt, b.accountKt) || (a.rate < b.rate ? -1 : 1))

  const getEntryOperationName = function (entryOperationID) {
    const item = entryOperationSet[entryOperationID]
    return item ? item['description'] : ''
  }

  // розділ 5
  const rows4 = []
  let rowTotal4 = {
    name: 'Всього',
    name2: '',
    isJoin: false,
    sumDt: 0,
    sumKt: 0,
    sum: 0,
    sumTaxFree: 0,
    sumExtra: 0,
    sumBase: 0,
    sumAdd: 0,
    paySum: 0,
    sumTotal: 0,
    total: true,
    tableValues: columns.map(o => { return { value: 0 } })
  }
  tableData4.forEach((row, npp) => {
    const tableValues = []
    columns.forEach((col, idx) => {
      // const pf = row.payFunds.find(o => o.payFundID === col.payFundID)
      const paySum = row.payFunds.filter(o => o.payFundID === col.payFundID).reduce((sum, o) => sum + o['paySum'], 0)
      tableValues[idx] = { value: paySum || null }
      rowTotal4.tableValues[idx].value += tableValues[idx].value || 0
    })
    rows4.push({
      name: getEntryOperationName(row.entryOperationID),
      name2: getGlAccountCode(row.accountID),
      isJoin: false,
      isDt: row.isDt || 0,
      sumDt: row.sumDt || null,
      sumKt: row.sumKt || null,
      sum: row.sum || null,
      sumTaxFree: row.taxFreeSum || null,
      sumExtra: row.extraSum || null,
      sumBase: row.baseSum || null,
      sumAdd: row.addBaseSum || null,
      paySum: row.paySum || null,
      sumTotal: (row.sumKt || 0) + (row.paySum || 0) - (row.sumDt || 0) || null,
      total: false,
      tableValues
    })
  })
  rows4.sort((a, b) => a.isDt < b.isDt ? -1 : (a.isDt > b.isDt ? 1 : (stringService.compareStringUa(a.name, b.name) || stringService.compareStringUa(a.name2, b.name2))))
  makeTotal(rowTotal4, rows4)
  renumerate(rows4)
  rows4.push(rowTotal4)
  resultData.data.push({
    name: 'У розрізі статтів витрат',
    rows: rows4
  })

  // розділ 5
  const tableData5 = []
  groupDataAcc.forEach(acc => {
    const idx = tableData5.findIndex(o => o.accountID === (acc.accountID || 0) /* && o.isDt === acc.isDt */)
    if (idx >= 0) {
      const el = tableData5[idx]
      el.sumDt += (acc.sumDt || 0)
      el.sumKt += (acc.sumKt || 0)
      el.sum += (acc.sum || 0) // Math.max(el.sum, acc.sum)
      el.baseSum += (acc.baseSum || 0)
      el.sourceSum += (acc.sourceSum || 0)
      el.paySum += (acc.paySum || 0)
      el.taxFreeSum += (acc.taxFreeSum || 0)
      el.extraSum += (acc.extraSum || 0)
      el.addBaseSum += (acc.addBaseSum || 0)
      el.payFunds.push({
        payFundID: acc.payFundID,
        paySum: acc.paySum
      })
    } else {
      tableData5.push({
        accountID: acc.accountID || 0,
        payFunds: [{
          payFundID: acc.payFundID,
          paySum: acc.paySum
        }],
        isDt: acc.isDt || 0,
        sumDt: acc.sumDt || 0,
        sumKt: acc.sumKt || 0,
        sum: acc.sum || 0, // сума нарахована
        baseSum: acc.baseSum || 0, // базова сума
        sourceSum: acc.sourceSum || 0, // нараховано
        paySum: acc.paySum || 0, // сума ЄСВ
        taxFreeSum: acc.taxFreeSum || 0, // неоподаткована сума
        extraSum: acc.extraSum || 0, // Сума перевищення
        addBaseSum: acc.addBaseSum || 0 // Додаткова база
      })
    }
  })

  const rows5 = []
  let rowTotal5 = {
    npp: 0,
    name: 'Всього',
    name2: '',
    isJoin: true,
    sumDt: 0,
    sumKt: 0,
    sum: 0,
    sumTaxFree: 0,
    sumExtra: 0,
    sumBase: 0,
    sumAdd: 0,
    paySum: 0,
    sumTotal: 0,
    total: true,
    tableValues: columns.map(o => { return { value: 0 } })
  }
  tableData5.forEach((row, npp) => {
    const tableValues = []
    columns.forEach((col, idx) => {
      // const pf = row.payFunds.find(o => o.payFundID === col.payFundID)
      const paySum = row.payFunds.filter(o => o.payFundID === col.payFundID).reduce((sum, o) => sum + o['paySum'], 0)
      tableValues[idx] = { value: paySum || null }
      rowTotal5.tableValues[idx].value += tableValues[idx].value || 0
    })
    rows5.push({
      npp: npp + 1,
      name: getGlAccountCode(row.accountID),
      name2: '',
      isJoin: true,
      isDt: row.isDt || 0,
      sumDt: row.sumDt || null,
      sumKt: row.sumKt || null,
      sum: row.sum || null,
      sumTaxFree: row.taxFreeSum || null,
      sumExtra: row.extraSum || null,
      sumBase: row.baseSum || null,
      sumAdd: row.addBaseSum || null,
      paySum: row.paySum || null,
      sumTotal: (row.sumKt || 0) + (row.paySum || 0) - (row.sumDt || 0) || null,
      total: false,
      tableValues
    })
  })
  rows5.sort((a, b) => a.isDt < b.isDt ? -1 : (a.isDt > b.isDt ? 1 : stringService.compareStringUa(a.name, b.name)))
  renumerate(rows5)
  makeTotal(rowTotal5, rows5)
  rows5.push(rowTotal5)
  resultData.data.push({
    name: 'У розрізі рахунків',
    rows: rows5
  })

  // розділ 6

  const tableData6 = []
  accrualData.filter(o => o.periodCalc >= moveFrom && o.periodCalc <= params.dateTo).forEach(acc => {
    const idx = tableData6.findIndex(o => o.periodCalcInt === acc.periodCalc.getTime())
    if (idx >= 0) {
      const el = tableData6[idx]
      el.sumDt += (acc.sumDt || 0)
      el.sumKt += (acc.sumKt || 0)
    } else {
      tableData6.push({
        periodCalcInt: acc.periodCalc.getTime(),
        sumDt: acc.sumDt || 0,
        sumKt: acc.sumKt || 0,
        paySum: 0,
        payFunds: []
      })
    }
  })
  accrualFundData.filter(o => o.periodCalc >= moveFrom && o.periodCalc <= params.dateTo).forEach(acc => {
    const idx = tableData6.findIndex(o => o.periodCalcInt === acc.periodCalc.getTime())
    if (idx >= 0) {
      const el = tableData6[idx]
      el.paySum += (acc.paySum || 0)
      el.payFunds.push({
        payFundID: acc.payFundID,
        paySum: acc.paySum
      })
    } else {
      tableData6.push({
        periodCalcInt: acc.periodCalc.getTime(),
        payFunds: [{
          payFundID: acc.payFundID,
          paySum: acc.paySum
        }],
        sumDt: acc.sumDt || 0,
        sumKt: acc.sumKt || 0,
        paySum: acc.paySum || 0
      })
    }
  })

  const rows6 = []
  let rowTotal6 = {
    npp: 0,
    name: 'Всього',
    name2: '',
    isJoin: true,
    sumDt: 0,
    sumKt: 0,
    sum: 0,
    sumTaxFree: 0,
    sumExtra: 0,
    sumBase: 0,
    sumAdd: 0,
    paySum: 0,
    sumTotal: 0,
    total: true,
    tableValues: columns.map(o => { return { value: 0 } })
  }
  tableData6.forEach((row, npp) => {
    const tableValues = []
    columns.forEach((col, idx) => {
      const paySum = row.payFunds.filter(o => o.payFundID === col.payFundID).reduce((sum, o) => sum + o['paySum'], 0)
      tableValues[idx] = { value: paySum || null }
      rowTotal6.tableValues[idx].value += tableValues[idx].value || 0
    })
    rows6.push({
      npp: npp + 1,
      name: dateService.formatDate(dateService.shiftDate(row.periodCalcInt), 'mmmm yyyy'),
      name2: '',
      isJoin: true,
      periodCalcInt: row.periodCalcInt,
      sumDt: row.sumDt || null,
      sumKt: row.sumKt || null,
      paySum: row.paySum || null,
      sumTotal: (row.sumKt || 0) + (row.paySum || 0) - (row.sumDt || 0) || null,
      total: false,
      tableValues
    })
  })
  rows6.sort((a, b) => a.periodCalcInt < b.periodCalcInt ? -1 : 1)
  renumerate(rows6)
  makeTotal(rowTotal6, rows6)
  rows6.push(rowTotal6)
  resultData.data.push({
    name: 'Рух коштів з ' + dateService.formatDate(moveFrom, 'mmm yyyy'),
    rows: rows6
  })

  resultData.tableHead1 = columns.map(o => { return { name: o.name } })
  resultData.tableHead2 = columns.map(o => { return { name: o.rate + '%' } })
  resultData.tableHead3 = columns.map(o => { return { name: o.accountKt } })
  resultData.colSpan2 += columns.length
  resultData.colSpan += columns.length
  resultData.tableWidth = 1150 + columns.length * 100
  accrualDS.freeNative()
  return resultData
}
