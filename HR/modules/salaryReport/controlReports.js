const UB = require('@unitybase/ub')
const App = UB.App

const _ = require('lodash')
const dateService = require('../../../AC/modules/dataServices/dateService')
const currencyService = require('../../../AC/public/core/currencyService')
const reportService = require('../../../HR/modules/reportService')
const entityBaseService = require('../../../AC/modules/entityServices/entityBaseService')
const staffService = require('../staffService')
const stringService = require('../../../AC/modules/dataServices/stringService')
const treeUtils = require('../../../HR/public/core/treeUtils')
const settingsService = require('../../../AC/modules/entityServices/settingsService')
const periodService = require('../../../HR/modules/periodService')

module.exports = {
  getDebtEmployeesData,
  getAppointDismissEmployesData,
  getAccrualReleasedData,
  getTimeCostData,
  getLongVacationData,
  getEmployeeAccrualList
}

function getDebtEmployeesData (params) {
  const sqlDialect = entityBaseService.getSQLDialect()

  params.periodFrom = params.isGroupReport ? dateService.shiftDate(params.periodToDateFrom) : dateService.shiftDate(params.periodFrom)
  params.periodTo = params.isGroupReport ? dateService.shiftDate(params.periodToDateTo) : dateService.shiftDate(params.periodTo)

  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  const currPeriod = periodService.getCurrentPeriod(params.orgID)

  currPeriod['dateFrom'] = dateService.shiftDate(currPeriod.dateFrom)
  currPeriod['dateTo'] = dateService.shiftDate(currPeriod.dateTo)

  const resultData = {
    organizationName: hrOrg.name,
    hideHeader: params.hideHeader
  }
  resultData.periodName = (params.isGroupReport ? params.periodToRaw : params.periodRaw) || ''

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
          .where('orgID', '=', params.orgID)
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
  if (deptIDs) {
    params.includeSubOrg = false
  }
  resultData.showOrgName = params.includeSubOrg
  resultData.columnCount = params.includeSubOrg ? 15 : 14

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

  const dictFundSourceFSSU = UB.Repository('ac_fundSource')
    .attrs(['ID'])
    .where('dictFundTypeID.code', '=', '02')
    .selectAsArrayOfValues()

  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const accrualBalance = UB.DataStore('hr_accrualBalance')
  accrualBalance.runSQL(`SELECT ab.employeeNumberID "employeeNumberID"
    ,e.fullFIO "fullFIO"
    ,n.tabNum "tabNum"
    ,n.tabNumSort "tabNumSort"
    ,n.dateFrom "dateFrom"
    ,n.orgID "orgID"
    ,${entityBaseService.isMsSql() ? '(CASE YEAR(n.dateTo) WHEN 9999 THEN NULL  ELSE n.dateTo END)' : '(CASE Extract(YEAR from n.dateTo) WHEN 9999 THEN null ELSE n.dateTo END)'} AS "dateTo"
    ,ab.sumFrom "sumFrom"
    ,ab.sumPlus "sumPlus"
    ,ab.sumMinus "sumMinus"
    ,ab.sumPay "sumPay"
    ,ab.sumTo "sumTo"
    ,(SELECT  ${sqlDialect.top} fs.description from ac_fundSource fs where fs.ID = ab.dictFundSourceID ${sqlDialect.limit}) AS "fundSource"
    ,(SELECT  ${sqlDialect.top} fs.ID from ac_fundSource fs where fs.ID = ab.dictFundSourceID ${sqlDialect.limit}) AS "fundSourceID"
    ,(select ${sqlDialect.top} org.name from hr_organization org where org.mi_data_id = n.orgID and org.state = 'ACTIVE' and org.mi_deleteDate >= '9999-12-31' order by org.mi_dateTo desc ${sqlDialect.limit}) as "orgName"
    ,(SELECT ${sqlDialect.top} dep.name FROM hr_department dep 
      WHERE dep.mi_data_id = p.departmentID AND dep.state = 'ACTIVE' AND dep.mi_dateFrom <= p.dateTo AND dep.mi_deleteDate >= '9999-12-31'
      ORDER BY dep.mi_dateTo DESC ${sqlDialect.limit}
    ) AS "depName"
    ,(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = n.orgID and d.parentUnitID = n.orgID and state = 'ACTIVE' 
        and (select ${sqlDialect.top} dep.mi_treePath from hr_employeePosition ep  
          left join hr_department dep on dep.mi_data_id = ep.departmentID and dep.orgID = ep.organizationID and dep.state = 'ACTIVE'
            and dep.mi_dateFrom <= ep.dateTo and dep.mi_deleteDate >= '9999-12-31'
          where ep.ID = p.ID order by dep.mi_dateTo desc
          ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit} 
    ) AS "selfStructDepName"
    ,${useActualPositionName ? `p.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'p.positionID', 'name', 'p.dictPositionID')}`} as "posName" 
    ,p.positionID as "positionID"
    ,p.dictPositionID as "dictPositionID"
    ,p.departmentID as "departmentID"
    ,(case when p.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
        where pos.mi_data_id = p.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
      else (select dp.idxNum from hr_dictPosition dp where dp.ID = p.dictPositionID) end) "posIdxNum"    
    FROM hr_accrualBalance ab
      JOIN hr_employeeNumber n ON n.ID = ab.employeeNumberID
      JOIN hr_employee e ON e.ID = n.employeeID
      LEFT JOIN hr_employeePosition p ON p.employeeNumberID = n.ID AND p.isActive = 1
      AND (p.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where ep2.employeeNumberID = n.ID
        and ep2.mi_deleteDate >= '9999-12-31' and ep2.isActive = 1 AND ep2.dateFrom <= :dateTo: AND (ep2.dateTo >= :dateTo: OR (n.dateTo < :dateTo: AND ep2.dateTo < :dateTo:))
        ${deptIDs ? ` and ep2.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''} order by ep2.dateTo desc ${sqlDialect.limit}))
       AND p.mi_deleteDate >= '9999-12-31'
    WHERE ab.periodCalcID${entityBaseService.getInExpression('periodIds')}
    ${deptIDs ? ` and p.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''}
    ORDER BY ${params.groupDataByDep ? (entityBaseService.isMsSql() ? 'posIdxNum,' : '22,') : ''}e.fullFIO, n.tabNumSort,${entityBaseService.isMsSql() ? 'fundSource' : '13'}
     `,
  {
    dateTo: params.periodTo,
    periodIds,
    deptIDs
  })

  const totalAttrs = ['sumFrom', 'sumPlus', 'sumMinus', 'sumPay', 'sumTo', 'debtByOrg', 'debtByEmp']
  const balance = accrualBalance.getAsJsObject()
  resultData.data = []
  resultData.totalSumFrom = 0
  resultData.totalSumPlus = 0
  resultData.totalSumMinus = 0
  resultData.totalSumPay = 0
  resultData.totalSumTo = 0
  resultData.totalDebtByOrg = 0
  resultData.totalDebtByEmp = 0
  resultData.totalByFundSource = []
  const emps = []
  balance.forEach(row => {
    row.dateFrom = dateService.formatDate(row.dateFrom)
    row.dateTo = row.dateTo ? dateService.formatDate(row.dateTo) : ''
    row.debtByOrg = row.sumTo > 0 ? Math.abs(row.sumTo) : 0
    row.debtByEmp = row.sumTo < 0 ? Math.abs(row.sumTo) : 0
    row.showOrgName = resultData.showOrgName
    if ((params.showDebtByOrg && !dictFundSourceFSSU.includes(row.fundSourceID) && row.sumTo > 0) ||
      (params.showDebtByFSSU && dictFundSourceFSSU.includes(row.fundSourceID) && row.sumTo > 0) ||
      (params.showDebtByEmployee && row.sumTo < 0)) {
      resultData.totalSumFrom += row.sumFrom
      resultData.totalSumPlus += row.sumPlus
      resultData.totalSumMinus += row.sumMinus
      resultData.totalSumPay += row.sumPay
      resultData.totalSumTo += row.sumTo
      resultData.totalDebtByOrg += row.debtByOrg
      resultData.totalDebtByEmp += row.debtByEmp
      emps.push(row)
      const fst = resultData.totalByFundSource.find(o => o.fundSourceID === row.fundSourceID)
      if (fst) {
        totalAttrs.forEach(attr => {
          fst[attr] += row[attr] || 0
        })
      } else {
        const newtotal = {
          fundSourceID: row.fundSourceID,
          fundSource: row.fundSource
        }
        totalAttrs.forEach(attr => {
          newtotal[attr] = row[attr] || 0
        })
        resultData.totalByFundSource.push(newtotal)
      }
    }
  })
  resultData.debtParamName = ''
  if (params.showDebtByOrg && params.showDebtByFSSU && !params.showDebtByEmployee) {
    resultData.debtParamName = 'Заборгованість за підприємством та СС'
  }
  if (params.showDebtByOrg && !params.showDebtByFSSU && !params.showDebtByEmployee) {
    resultData.debtParamName = 'Заборгованість за підприємством'
  }
  if (!params.showDebtByOrg && params.showDebtByFSSU && !params.showDebtByEmployee) {
    resultData.debtParamName = 'Заборгованість за СС'
  }
  if (params.showDebtByOrg && !params.showDebtByFSSU && params.showDebtByEmployee) {
    resultData.debtParamName = 'Заборгованість за підприємством та працівником'
  }
  if (!params.showDebtByOrg && params.showDebtByFSSU && params.showDebtByEmployee) {
    resultData.debtParamName = 'Заборгованість за СС та працівником'
  }
  if (!params.showDebtByOrg && !params.showDebtByFSSU && params.showDebtByEmployee) {
    resultData.debtParamName = 'Заборгованість за працівником'
  }
  resultData.departmentName = depName

  function orgTreeDataToReport (curNode, depts, isGroupDep, orgID) {
    if (curNode.isNotEmpty) {
      const depart = {
        emps: curNode.emps,
        isGroupDep: isGroupDep,
        isOrg: false,
        columnCount: resultData.columnCount
      }
      if (curNode.name) {
        depart.dept = isGroupDep ? { columnCount: resultData.columnCount, deptName: curNode.name } : null
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
        showOrgName: resultData.showOrgName,
        columnCount: resultData.columnCount,
        depSum: {
          title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`,
          sumFrom: curNode.calcSum.allSum.sumFrom,
          sumPlus: curNode.calcSum.allSum.sumPlus,
          sumMinus: curNode.calcSum.allSum.sumMinus,
          sumPay: curNode.calcSum.allSum.sumPay,
          sumTo: curNode.calcSum.allSum.sumTo,
          debtByOrg: curNode.calcSum.allSum.debtByOrg,
          debtByEmp: curNode.calcSum.allSum.debtByEmp
        }
      }
      depts.push(depart)
    }
  }

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { sumFrom: 0, sumPlus: 0, sumMinus: 0, sumPay: 0, sumTo: 0, debtByOrg: 0, debtByEmp: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.sumFrom = currencyService.round(curNode.calcSum.allSum.sumFrom + (el.sumFrom || 0), 2)
          curNode.calcSum.allSum.sumPlus = currencyService.round(curNode.calcSum.allSum.sumPlus + (el.sumPlus || 0), 2)
          curNode.calcSum.allSum.sumMinus = currencyService.round(curNode.calcSum.allSum.sumMinus + (el.sumMinus || 0), 2)
          curNode.calcSum.allSum.sumPay = currencyService.round(curNode.calcSum.allSum.sumPay + (el.sumPay || 0), 2)
          curNode.calcSum.allSum.sumTo = currencyService.round(curNode.calcSum.allSum.sumTo + (el.sumTo || 0), 2)
          curNode.calcSum.allSum.debtByOrg = currencyService.round(curNode.calcSum.allSum.debtByOrg + (el.debtByOrg) || 0, 2)
          curNode.calcSum.allSum.debtByEmp = currencyService.round(curNode.calcSum.allSum.debtByEmp + (el.debtByEmp || 0), 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.sumFrom = currencyService.round(curNode.calcSum.allSum.sumFrom + (cur.calcSum.allSum.sumFrom || 0), 2)
        curNode.calcSum.allSum.sumPlus = currencyService.round(curNode.calcSum.allSum.sumPlus + (cur.calcSum.allSum.sumPlus || 0), 2)
        curNode.calcSum.allSum.sumMinus = currencyService.round(curNode.calcSum.allSum.sumMinus + (cur.calcSum.allSum.sumMinus || 0), 2)
        curNode.calcSum.allSum.sumPay = currencyService.round(curNode.calcSum.allSum.sumPay + (cur.calcSum.allSum.sumPay || 0), 2)
        curNode.calcSum.allSum.sumTo = currencyService.round(curNode.calcSum.allSum.sumTo + (cur.calcSum.allSum.sumTo || 0), 2)
        curNode.calcSum.allSum.debtByOrg = currencyService.round(curNode.calcSum.allSum.debtByOrg + (cur.calcSum.allSum.debtByOrg) || 0, 2)
        curNode.calcSum.allSum.debtByEmp = currencyService.round(curNode.calcSum.allSum.debtByEmp + (cur.calcSum.allSum.debtByEmp || 0), 2)
      })
    }
  }

  function compareEmps (a, b) {
    return a.posIdxNum === b.posIdxNum
      ? (a['fullFIO'] === b['fullFIO']
        ? a.tabNumSort - b.tabNumSort
        : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
      : a.posIdxNum - b.posIdxNum
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')

  const depts = []
  if (params.groupDataByDep) {
    orgNames.forEach(org => {
      if (params.organizationID && params.includeSubOrg) {
        depts.push({
          emps: [],
          isGroupDep: true,
          isOrg: true,
          columnCount: resultData.columnCount,
          dept: { columnCount: resultData.columnCount, deptName: org.description, showOrgName: resultData.showOrgName }
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
      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, params.groupDataByDep, org.ID)
      depts.forEach(dep => {
        dep.emps.sort(compareEmps)
      })
    })
  } else {
    const depart = {
      emps,
      isGroupDep: false,
      columnCount: resultData.columnCount
    }
    depts.push(depart)
  }
  if (orgIDs.length > 1 || !params.groupDataByDep) {
    const calcSum = {
      allSum: { sumFrom: 0, sumPlus: 0, sumMinus: 0, sumPay: 0, sumTo: 0, debtByOrg: 0, debtByEmp: 0 }
    }

    emps.forEach(emp => {
      calcSum.allSum.sumFrom = currencyService.round((emp.sumFrom || 0) + (calcSum.allSum.sumFrom || 0), 2)
      calcSum.allSum.sumPlus = currencyService.round((emp.sumPlus || 0) + (calcSum.allSum.sumPlus || 0), 2)
      calcSum.allSum.sumMinus = currencyService.round((emp.sumMinus || 0) + (calcSum.allSum.sumMinus || 0), 2)
      calcSum.allSum.sumPay = currencyService.round((emp.sumPay || 0) + (calcSum.allSum.sumPay || 0), 2)
      calcSum.allSum.sumTo = currencyService.round((emp.sumBalRes || 0) + (calcSum.allSum.sumTo || 0), 2)
      calcSum.allSum.debtByOrg = currencyService.round(emp.debtByOrg + (calcSum.allSum.debtByOrg) || 0, 2)
      calcSum.allSum.debtByEmp = currencyService.round(emp.debtByEmp + (calcSum.allSum.debtByEmp || 0), 2)
    })
  }
  resultData.depts = depts
  resultData.showTotalAll = (!params.groupDataByDep) || (orgIDs && orgIDs.length > 1)
  return resultData
}

function getAppointDismissEmployesData (params) {
  // const params = ctx.mParams.execParams
  params.departmentName = ''
  const sqlDialect = entityBaseService.getSQLDialect()
  function getParentEmpNumberIDData (prevID, currentID) {
    const storePrevData = UB.DataStore('hr_employeeNumber')
    storePrevData.runSQL(`
    SELECT ${sqlDialect.top} porg.name, en.parentEmpNumberID "prevID", en.dateFrom "dateFrom", en.dateTo "dateTo"
    FROM hr_employeeNumber en
    LEFT JOIN ac_organization porg ON porg.ID = en.orgID 
    ${prevID ? 'WHERE en.ID = :prevID:' : ''}
    ${currentID ? 'WHERE en.parentEmpNumberID = :currentID:' : ''}
    AND en.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}`,
    { prevID, currentID })

    const prevData = storePrevData.getAsJsObject()

    if (prevData && prevData.length) {
      return [...prevData][0]
    }

    return []
  }

  let depClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':periodTo:')
  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':periodTo:')
  let depName
  let deptIDs

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

  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs(['name', 'mi_treePath'])
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.periodToDateTo })
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
      .where('mi_dateFrom', '<=', params.periodToDateTo)
      .where('mi_dateTo', '>=', params.periodToDateTo)
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

  if (params.dictMultiGroupID) {
    depName = 'група підрозділів ' + UB.Repository('hr_dictMultiGroup')
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
          .where('orgID', '=', params.orgID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', params.periodToDateTo)
          .where('mi_dateTo', '>=', params.periodToDateTo)
          .where('mi_treePath', 'like', `%/${departmentID.departmentID}/%`)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
      })
    }
    if (Array.isArray(deptIDs) && deptIDs.length) {
      depClause = `AND ep.departmentID ${entityBaseService.getInExpression('deptIDs')}`
    }
  }

  const store = UB.DataStore('hr_employeeNumber')
  store.runSQL(`
  SELECT en.ID "ID"
  , en.tabNum "tabNum"
  , emp.fullFIO "FIFO"
  , ep.factPosition
  , ep.ID
  , '' "movedData"
  , en.dateFrom "From"
  , en.dateTo "To"
  , p.ID "previousEmpNumber"
  , en.parentEmpNumberID
  , ${staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name')} as "orgName"
  ,(SELECT ${sqlDialect.top} a1.name FROM hr_employeeNumber n1
    JOIN ac_organization a1 ON a1.ID = n1.orgID
    WHERE n1.parentEmpNumberID = p.ID
    ${sqlDialect.limit}
  ) as "previousOrg"
  ,(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = en.orgID and d.parentUnitID = en.orgID and state = 'ACTIVE' 
    and ( select ${sqlDialect.top} dep.mi_treePath  
    from hr_department dep  where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE'  
    order by dep.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') 
    order by d.mi_dateTo desc ${sqlDialect.limit}) AS "selfStructDepName"
  ,(SELECT ${sqlDialect.top} dp.name
    FROM hr_employeePosition ep
    LEFT JOIN hr_dictPosition dp ON dp.ID = ep.dictPositionID
    WHERE ep.employeeNumberID = en.ID
    AND ep.isActive = 1
    AND ep.mi_deleteDate >= '9999-12-31'
    ORDER BY ep.dateTo desc ${sqlDialect.limit}) AS "posName"
    ,(SELECT ${sqlDialect.top} dp.idxNum
      FROM hr_employeePosition ep
      LEFT JOIN hr_dictPosition dp ON dp.ID = ep.dictPositionID
      WHERE ep.employeeNumberID = en.ID
      AND ep.isActive = 1
      AND ep.mi_deleteDate >= '9999-12-31'
      ORDER BY ep.dateTo desc ${sqlDialect.limit}) AS "idxNum"
  ,${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name')} as "departmentName"
  ,${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'mi_treePath')} as "dep_mi_treePath"
  FROM 
  hr_employeeNumber en
    LEFT JOIN hr_employeeNumber p ON en.parentEmpNumberID = p.ID
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
      AND emp.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_employeePosition ep ON ep.employeeNumberID = en.ID
      AND ep.isActive = 1
      AND (ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where ep2.employeeNumberID = en.ID
        and ep2.mi_deleteDate >= '9999-12-31' and ep2.isActive = 1 AND ep2.dateFrom <= :dateTo: AND (ep2.dateTo >= :dateTo: OR (en.dateTo < :dateTo: AND ep2.dateTo < :dateTo:))
        ${deptIDs ? ` and ep2.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''} order by ep2.dateTo desc ${sqlDialect.limit}))
   AND ep.mi_deleteDate >= '9999-12-31'
    LEFT JOIN ac_organization porg ON porg.ID = en.orgID
  WHERE 
  ((en.dateFrom between :dateFrom: and :dateTo:)
  OR
  (en.dateTo between :dateFrom: and :dateTo:))
  AND en.mi_deleteDate >= '9999-12-31' 
  ${orgClause}
  ${depClause}
  ORDER BY "orgName", "dep_mi_treePath", "idxNum", "FIFO", "tabNum", "From"
  `
  , {
    organizationID: params.organizationID,
    departmentID: params.departmentID,
    dateFrom: dateService.shiftDate(params.periodFromDateFrom),
    dateTo: dateService.shiftDate(params.periodToDateTo),
    periodTo: dateService.shiftDate(params.periodToDateTo),
    deptIDs
  })

  const finalAll = store.getAsJsObject()

  const allData = [...finalAll]

  const stateOrg = settingsService.getByCode('hrFuncOrgType', params.orgID) === '2'
  const showAddDescrPerson = settingsService.getByCode('hrShowAddDescrPerson', params.orgID) === true
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

  const colSpan = 14 + (stateOrg ? 2 : 0) + (showAddDescrPerson ? 1 : 0) + (useActualPositionName ? 1 : 0)
  let totalMoved = 0

  const allWithMoved = allData.map(emp => {
    emp.depName = emp.departmentName
    emp.structDepName = emp.selfStructDepName
    emp.includeSubOrg = !params.includeSubOrg
    emp.enOrgName = params.includeSubOrg ? emp.enOrgName : ''

    emp.From = (emp.From === '9999-12-31T00:00:00Z' ||
    (new Date(emp.From) < params.periodFromDateFrom))
      ? ''
      : dateService.formatDate(dateService.shiftDate(emp.From))

    emp.To = (emp.To === '9999-12-31T00:00:00Z' ||
    (new Date(emp.To) > params.periodToDateTo))
      ? ''
      : dateService.formatDate(dateService.shiftDate(emp.To))

    if (emp.previousEmpNumber) {
      if (emp.From) {
        let prevOrgData = getParentEmpNumberIDData(emp.previousEmpNumber)
        if (Object.keys(prevOrgData).length) {
          emp.movedData = 'Переведений з ' + prevOrgData.name
        }
      }
    }

    if (emp.To) {
      let NextOrgData = getParentEmpNumberIDData(false, emp.ID)
      if (Object.keys(NextOrgData).length) {
        emp.movedData = 'Переведений у ' + NextOrgData.name
      }
    }

    return emp
  })

  const result = {
    organizationName: (params.includeSubOrg ? hrOrg.name + ' (з підлеглими)' : hrOrg.name),
    columnCount: params.includeSubOrg ? 9 : 8,
    includeSubOrg: !params.includeSubOrg,
    cols: colSpan,
    cols2: Math.ceil((colSpan - 3) / 2),
    cols3: (colSpan - 3) - Math.ceil((colSpan - 3) / 2),
    widthTable: params.includeSubOrg ? 1090 : 970,
    dateFrom: dateService.formatDate(dateService.shiftDate(params.periodFromDateFrom)),
    dateTo: dateService.formatDate(dateService.shiftDate(params.periodToDateTo)),
    depName,
    departmentName: params.departmentName + (params.includeSubDep ? ' (з підлеглими)' : ''),
    includeDepName: !params.departmentName.length,
    includeMultiGroup: !params.dictMultiGroupID,
    colNums: [],
    totalMoved,
    rows: allWithMoved,
    totalEmployeeAppointed: finalAll.filter(em => em.From !== '').length,
    totalEmployeeDism: finalAll.filter(em => em.To !== '').length,
    periodHeader: generateReportPeriod(params.periodFromDateFrom, params.periodToDateTo)
  }

  return result
}

function generateReportPeriod (period1, period2) {
  const year1 = period1.getFullYear()
  const year2 = period2.getFullYear()
  const month1 = period1.getMonth()
  const month2 = period2.getMonth()
  const month1Name = dateService.formatDate(period1, 'mmmm').toLocaleLowerCase()
  const month2Name = dateService.formatDate(period2, 'mmmm').toLocaleLowerCase()

  if (month1 === 0 && month2 === 11 && year1 === year2) {
    return `за ${year1} рік`
  } else if ((year1 === year2) && (month1 === month2)) {
    return `за ${month1Name} ${year1} року`
  } else {
    return `за період з ${month1Name} ${year1} року по ${month2Name} ${year2} року`
  }
}

function getAccrualReleasedData (params) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

  let headPosition = ''
  let headEmployee = ''
  if (params.headEmployeePositionID && params.headEmployeeNumberID) {
    let headPositionID = UB.Repository('hr_employeePositionSR')
      .attrs('positionID')
      .where('ID', '=', params.headEmployeePositionID)
      .selectSingle() || ''
    headPosition = headPositionID ? UB.Repository('hr_position')
      .attrs('fullName')
      .where('mi_data_id', '=', headPositionID.positionID)
      .where('state', '=', 'ACTIVE')
      .selectSingle() : null
    headEmployee = UB.Repository('hr_employeeNumberS')
      .attrs('employeeID.shortFIO')
      .where('ID', '=', params.headEmployeeNumberID)
      .selectSingle() || ''
  }

  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
  const accrualStore = UB.DataStore('hr_accrual')
  const sqlDialect = entityBaseService.getSQLDialect()
  const period = periodService.getPeriod(params.periodID)
  accrualStore.runSQL(`  SELECT en.tabNum as "tabNum", e1.fullFIO as "fullFIO", en.dateTo as "dateTo", 
  a1.periodCalc as "periodCalc", a1.periodSalary as "periodSalary", pe.code, pe.codeSort, pe.description,
   sum(a1.paySum) as "paySum", pe.description as "payElName" ,dep.name as "depName" 
   ,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "posName"       
    FROM hr_accrual a1 
      inner JOIN hr_payEl pe ON pe.ID = a1.payElID   
      inner JOIN hr_method m ON m.ID = pe.methodID     
      inner JOIN hr_methodGroup mg ON mg.ID = m.methodGroupID    
      inner JOIN hr_employeeNumber en ON en.ID = a1.employeeNumberID      
      inner JOIN hr_employee e1 ON e1.ID = en.employeeID     
      JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1
       AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.mi_deleteDate >= '9999-12-31' 
       order by ep2.dateFrom desc ${sqlDialect.limit}) 
      LEFT JOIN hr_department dep on dep.ID = ep.departmentID 
      LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID              
        and pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
        Where              
        pos2.mi_data_id = ep.positionID              
        and pos2.orgID = en.orgID               
        and (pos2.mi_dateFrom <= en.dateTo or en.dateTo is null)             
        and pos2.mi_dateTo >= en.dateFrom              
        and pos2.mi_deleteDate >= '9999-12-31'              
        and pos2.state = 'ACTIVE'             
        order by pos2.mi_dateFrom desc ${sqlDialect.limit}             
        )
    WHERE
      a1.periodCalcID = :periodID:
      and a1.periodCalc > en.dateTo
      and (a1.flagsRec & 8192) = 0
      ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
    GROUP BY en.tabNum, en.tabNumSort, e1.fullFIO, en.dateTo, a1.periodCalc, a1.periodSalary, pe.code, pe.codeSort, pe.description,
        en.ID, e1.ID, ep.positionID, ep.dictPositionID, ep.departmentID, dep.name, pos.name, mg.groupType, ep.factPosName, ep.dictPositionID
    ORDER BY e1.fullFIO, en.tabNumSort, a1.periodSalary, mg.groupType desc, pe.codeSort
  `, {
    periodID: params.periodID,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo
  })

  const data = accrualStore.getAsJsObject().filter(el => el.paySum !== 0)
  let allSum = 0
  let numb = 1
  data.forEach(el => {
    el.periodSalary = dateService.formatDate(el.periodSalary)
    el.dateTo = dateService.formatDate(el.dateTo)
    el.numb = numb++
    allSum += el.paySum
  })

  return {
    periodName: params.periodRaw,
    orgName: hrOrg.name,
    reportDate: dateService.formatDate(new Date(), 'dd.mm.yyyy hh:nn:ss'),
    headEmployee: headEmployee ? headEmployee['employeeID.shortFIO'] : '',
    headPosition: headPosition ? headPosition.fullName : '',
    allSum: allSum,
    data
  }
}

function getTimeCostData (params) {
  const staffUnitStore = UB.DataStore('hr_staffUnit')
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()
  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

  const showPeriod = params.showPeriod
  const showPeriodElInput = params.showPeriodElInput
  const groupReportByDep = params.groupReportByDep
  const checkPosDepChange = params.checkPosDepChange
  const showZeroSumRows = params.showZeroSumRows
  const showOrder = params.showOrder
  const setOrderBy = params.setOrderBy
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true

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

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'orgID', 'dateFrom', 'dateTo', 'name')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .orderBy('dateFrom')
    .selectAsObject()

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

  let periodName
  if (params.periodFrom.getMonth() === params.periodTo.getMonth() && params.periodFrom.getFullYear() === params.periodTo.getFullYear()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  const reportParams = reportService.getReportParams(params.orgID, ['ReportTimeCost'])
  let timeCostColumnList = UB.Repository('hr_dictTimeCost')
    .attrs(['ID', 'description', 'code', 'nameSmall'])
    .where('ID', 'in', reportParams['ReportTimeCostIDs'])
    .selectAsObject()

  let empNumberDS = UB.DataStore('hr_employeeNumber')

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')

  let emps = []
  empNumberDS.runSQL(`SELECT 
      en.ID as "employeeNumberID"
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
      ,ep.factPosition as "actualPositionName"
      ,dsc.description as "staffCatName"
      ,st.name as "sexType"
      ,e.birthDate as "birthDate"
      ,en.dateFrom as "startWork"
      ,en.dateTo as "endWork"
      ,ep.mtCount as "mtCount"
      ,dp.description as "positionName"
      ,dsc.description as "staffCatName"
      ,ws.name as "workSchedule"
      ,ecb.description as "dictCategoryECB"
      ,gla.description as "accountName"
      ,wt.name as "workerType"
      ,wp.name as "workPlace"      
      ,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"
      ,(select ${sqlDialect.top} dep.description from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
      and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
      ,null as "periodName"
      ,en.orgID as "orgID"
      ,0 as "sumFrom"
      ,0 as "sumPlus"
      ,0 as "sumMinus"
      ,0 as "sumPay"
      ,0 as "sumTo"
      FROM hr_employeeNumber en   
      LEFT JOIN  hr_employeePosition ep ON ep.isActive = 1 and
       ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
       ep2.employeeNumberID = en.ID 
       and ep2.isActive = 1
       and ep2.dateFrom <= :dateTo:
       and ep2.mi_deleteDate >= '9999-12-31' 
       order by ep2.dateFrom desc ${sqlDialect.limit}) 
       LEFT JOIN hr_dictPosition dp on dp.ID = ep.dictPositionID 
      LEFT JOIN hr_employee e ON e.ID = en.employeeID
      LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID
      LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID
      LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID
      LEFT JOIN gl_account gla ON  gla.ID = ep.accountID
      LEFT JOIN ubm_enum st on st.code = e.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'
      LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'
      LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'      
      WHERE en.orgID${entityBaseService.getInExpression('orgIDs')}
      AND en.mi_deleteDate >= '9999-12-31' 
      ${deptClause} 
      ORDER BY en.description`
  , {
    orgIDs,
    deptIDs,
    dateTo: params.periodTo,
    dateFrom: params.periodFrom,
    departmentID: params.departmentID
  })
  const tmpEmps = empNumberDS.getAsJsObject()

  let timeSheetDS = UB.DataStore('tim_timeSheet')
  timeSheetDS.runSQL(
    `select
   o.description "orderDescription",
   pv.ID "inputPeriodID",
   ts.orderID "orderID",
   pd.ID "periodID",
   pd.name "periodName",
   pv.name "inputPeriodName",
   ts.monthDay "monthDay",
   SUM(case WHEN ts.isFactHour = 1 THEN ts.factHour else ts.normHour end) "hours",
   count(*) "days",
   ts.employeeNumberID "employeeNumberID",
   ts.factTimeCostID "factTimeCostID"
   ${checkPosDepChange ? `,(case when ts.positionID IS NOT NULL then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = ts.positionID and pos.state = 'ACTIVE'
  AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) else (select dp.name from hr_dictPosition dp where dp.ID = ts.dictPositionID) end) "posName",
  (select ${sqlDialect.top} dep.name from hr_department dep where dep.mi_data_id = ts.departmentID and dep.state = 'ACTIVE' and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) "depName",
  ts.departmentID` : ''}     
  from ( 
  SELECT ${sqlDialect.dialect === 'MSSQL2012' ? 'DATEFROMPARTS(YEAR(t.dateWork), MONTH(t.dateWork), 1)' : `(make_date(date_part('years',(t.dateWork))::int, date_part('month',(t.dateWork))::int, 1))`} monthDay, 
    t.*, dtc.isFactHour
    ${checkPosDepChange ? `, ep.positionID, ep.dictPositionID, ep.departmentID` : ''}
    FROM tim_timeSheet t
     ${checkPosDepChange ? `LEFT JOIN  hr_employeePosition ep ON ep.employeeNumberID = t.employeeNumberID and ep.dateFrom <= t.dateWork and ep.dateTo >= t.dateWork and ep.isActive = 1 and ep.mi_deleteDate >= '9999-12-31'` : ''}
    LEFT JOIN hr_dictTimeCost dtc ON dtc.ID = t.factTimeCostID
    where t.dateWork >= :dateFrom: AND t.dateWork <= :dateTo: AND t.isActive = 1 AND t.mi_deleteDate >= '9999-12-31'
  ) ts
  JOIN hr_employeeNumber en ON en.ID = ts.employeeNumberID
  JOIN hr_dictPeriod pv ON pv.ID = ts.periodID
  JOIN hr_dictPeriod pd ON pd.dateFrom = ts.monthDay and pd.orgID = en.orgID and pd.mi_deleteDate >= '9999-12-31'
  LEFT JOIN hr_order o on o.ID = ts.orderID
  where en.ID${entityBaseService.getInExpression('empIDs')}
  and ts.factTimeCostID${entityBaseService.getInExpression('timeCostIDs')}
  GROUP BY ts.employeeNumberID,
   ts.factTimeCostID,
  ts.monthDay,
  pd.name, pv.name,
  pd.ID, pv.ID,
  ts.orderID,
  o.description
  ${checkPosDepChange ? `,ts.positionID, ts.dictPositionID, ts.departmentID` : ''}
  ORDER BY  ts.employeeNumberID, ts.monthDay`,
    {
      empIDs: tmpEmps.length ? tmpEmps.map(o => o.employeeNumberID) : [0],
      timeCostIDs: timeCostColumnList.length ? timeCostColumnList.map(o => o.ID) : [0],
      dateFrom: params.periodFrom,
      dateTo: params.periodTo
    }
  )
  let timeSheets = timeSheetDS.getAsJsObject()

  tmpEmps.forEach(emp => {
    let periods = periodList.filter(o => o.orgID === emp.orgID)
    periods.forEach(item => {
      const newEmp = JSON.parse(JSON.stringify(emp))
      newEmp.periodID = item.ID
      newEmp.empPeriodName = item.name
      newEmp.empPeriodDateFrom = item.dateFrom
      let timeSheetData = timeSheets.filter(el => el.employeeNumberID === emp.employeeNumberID && el.periodID === item.ID)
      let inputPeriods = []
      timeSheetData.forEach(el => {
        let rowIdx = inputPeriods.findIndex(row => row.inputPeriodID === el.inputPeriodID)
        if (rowIdx < 0) {
          inputPeriods.push({
            inputPeriodID: el.inputPeriodID,
            inputPeriodName: el.inputPeriodName,
            rows: [JSON.parse(JSON.stringify(el))]
          })
        } else {
          inputPeriods[rowIdx].rows.push(el)
        }
      })
      if (inputPeriods.length) {
        inputPeriods.forEach(el => {
          newEmp.inputPeriodID = el.inputPeriodID
          newEmp.inputPeriodName = el.inputPeriodName
          el.rows.forEach(row => {
            newEmp.timeCostList = JSON.parse(JSON.stringify([row]))
            newEmp.orderID = el.orderId
            if (checkPosDepChange) {
              newEmp.positionName = (row.posName || '')
              newEmp.depName = (row.depName || '')
              newEmp.departmentID = (row.departmentID || '')
            }
            emps.push(JSON.parse(JSON.stringify(newEmp)))
          })
        })
      } else {
        newEmp.inputPeriodID = ''
        newEmp.inputPeriodName = ''
        emps.push(JSON.parse(JSON.stringify(newEmp)))
      }
    })
  })

  let summarySection = {
    allHours: 0,
    allDays: 0,
    timeCostList: {}
  }
  timeCostColumnList.forEach(o => {
    summarySection.timeCostList[o.ID] = JSON.parse(JSON.stringify(o))
    summarySection.timeCostList[o.ID].days = 0
    summarySection.timeCostList[o.ID].hours = 0
  })
  let timeCostExistColList = []

  emps = emps.map(emp => {
    emp.allHours = 0
    emp.allDays = 0
    emp.orderDescription = ''

    let timeCostColumns = {}
    let timeCostList = []
    timeCostColumnList.forEach(o => {
      timeCostColumns[o.ID] = JSON.parse(JSON.stringify(o))
      timeCostColumns[o.ID].days = 0
      timeCostColumns[o.ID].hours = 0
    })
    if (emp.timeCostList) {
      emp.timeCostList.forEach(el => {
        timeCostColumns[el.factTimeCostID].days = el.days
        timeCostColumns[el.factTimeCostID].hours = el.hours
        summarySection.timeCostList[el.factTimeCostID].days += el.days
        summarySection.timeCostList[el.factTimeCostID].hours += el.hours
        emp.allHours += el.hours
        emp.allDays += el.days

        if ((el.days > 0 || el.hours > 0) && !timeCostExistColList.includes(el.factTimeCostID)) timeCostExistColList.push(el.factTimeCostID)
        if (el.orderDescription) {
          emp.orderDescription = emp.orderDescription === '' ? el.orderDescription : `${emp.orderDescription}; ${el.orderDescription}`
        }
      })
    }
    timeCostColumnList.forEach(o => {
      timeCostList.push(timeCostColumns[o.ID])
    })

    emp.timeCostList = JSON.parse(JSON.stringify(timeCostList))
    summarySection.allHours += emp.allHours
    summarySection.allDays += emp.allDays
    emp.birthDate = dateService.formatDate(emp.birthDate)
    emp.startWork = dateService.formatDate(emp.startWork)
    emp.endWork = dateService.isMaxDate(emp.endWork) ? '' : dateService.formatDate(emp.endWork)
    return emp
  })

  let empsGroupedList = []
  emps.forEach(emp => {
    if (!empsGroupedList.find(el => el.employeeNumberID === emp.employeeNumberID)) {
      empsGroupedList.push(emp)
    } else {
      let existRow = empsGroupedList.find(el => el.employeeNumberID === emp.employeeNumberID &&
        (!showPeriod || el.periodID === emp.periodID) &&
        (!showPeriodElInput || el.inputPeriodID === emp.inputPeriodID) &&
        (!showOrder || el.orderID === emp.orderID))
      if (existRow) {
        existRow.timeCostList.map(timeCost => {
          timeCost.days += emp.timeCostList.find(el => el.ID === timeCost.ID).days
          timeCost.hours += emp.timeCostList.find(el => el.ID === timeCost.ID).hours
          return timeCost
        })
        existRow.allHours += emp.allHours
        existRow.allDays += emp.allDays
        existRow.orderDescription = (existRow.orderDescription && existRow.orderDescription !== '' ? (`${existRow.orderDescription}` + `${emp.orderDescription && emp.orderDescription !== '' ? '; ' : ''}`) : '') + (emp.orderDescription && emp.orderDescription !== '' ? `${emp.orderDescription}` : '')
      } else {
        empsGroupedList.push(emp)
      }
    }
  })

  emps = empsGroupedList
  if (!showZeroSumRows) {
    emps = emps.filter(row => row.allDays !== 0 || row.allHours !== 0)
  }

  timeCostColumnList = timeCostColumnList.filter(el => timeCostExistColList.includes(el.ID))
  emps.forEach(emp => {
    const period = periodList.find(o => o.ID === emp.periodID)
    emp.periodSort = period ? dateService.shiftDate(period.dateFrom).getTime() : 0
    const periodInput = periodList.find(o => o.ID === emp.inputPeriodID)
    emp.periodInputSort = !showZeroSumRows && periodInput ? dateService.shiftDate(periodInput.dateFrom).getTime() : 0
    if (!params.groupReportByDep) emp.posIdxNum = 0
    emp.timeCostList = emp.timeCostList.filter(el => timeCostExistColList.includes(el.ID))
  })

  let fixedColumnsCount = 6
  let fixedColumnsWidth = 220

  let extraColumnsCount = params.extraColumns.length
  let extraColumnsWidth = 125 * params.extraColumns.length

  let additionalColumnsCount = (showPeriod ? 1 : 0) + (showPeriodElInput ? 1 : 0) + (showOrder ? 1 : 0)
  let additionalColumnsWidth = (showPeriod ? 120 : 0) + (showPeriodElInput ? 120 : 0) + 240 + (125 * 3) + (showOrder ? 125 : 0)

  let timeCostColumnsCount = timeCostColumnList.length * 2
  let timeCostColumnsWidth = 240 * (timeCostColumnList.length)

  const allColumnCount = fixedColumnsCount + timeCostColumnsCount + extraColumnsCount + additionalColumnsCount + (useActualPositionName ? 1 : 0)
  const staffColumnCount = 3 + (useActualPositionName ? 1 : 0)
  let allAddColumnCount = timeCostColumnsCount + extraColumnsCount + additionalColumnsCount + (useActualPositionName ? 1 : 0)
  let sheetSize = fixedColumnsWidth + timeCostColumnsWidth + extraColumnsWidth + additionalColumnsWidth
  let colBeforeSum = 1 + (showPeriod ? 1 : 0) + (showPeriodElInput ? 1 : 0)

  function compareEmps (a, b) {
    switch (setOrderBy) {
      case '1':
        return a['periodSort'] === b['periodSort']
          ? (a['fullFIO'] === b['fullFIO'] ? (a.tabNumSort - b.tabNumSort) : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
          : a['periodSort'] - b['periodSort']
      case '2':
        if (showPeriod) {
          return a['fullFIO'] === b['fullFIO']
            ? (a['periodSort'] === b['periodSort'] ? (a.tabNumSort - b.tabNumSort) : a['periodSort'] - b['periodSort']) : stringService.compareStringUa(a['fullFIO'], b['fullFIO'])
        } else {
          return a['fullFIO'] === b['fullFIO']
            ? (a.tabNumSort - b.tabNumSort) : stringService.compareStringUa(a['fullFIO'], b['fullFIO'])
        }
      case '3':
        if (showPeriod) {
          return a['tabNumSort'] === b['tabNumSort']
            ? (a['fullFIO'] === b['fullFIO'] ? (a['periodSort'] - b['periodSort']) : stringService.compareStringUa(a['fullFIO'], b['fullFIO'])) : a['tabNumSort'] - b['tabNumSort']
        } else {
          return a['tabNumSort'] === b['tabNumSort']
            ? (stringService.compareStringUa(a['fullFIO'], b['fullFIO'])) : a['tabNumSort'] - b['tabNumSort']
        }
      default:
        return a.posIdxNum === b.posIdxNum
          ? (a['fullFIO'] === b['fullFIO']
            ? (a.tabNumSort === b.tabNumSort
              ? (a['periodSort'] === b['periodSort'] ? a['periodInput'] - b['periodInput'] : a['periodSort'] - b['periodSort'])
              : a.tabNumSort - b.tabNumSort)
            : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
          : a.posIdxNum - b.posIdxNum
    }
  }

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
        showPeriod,
        showPeriodElInput,
        showOrder,
        useActualPositionName,
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
        isExtraColumnExist: params.extraColumns.length > 0,
        extraColumnsCount,
        staffColumnCount,
        depSum: {
          title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`,
          allDays: curNode.calcSum.allSum.allDays,
          allHours: curNode.calcSum.allSum.allHours,
          timeCostColumnList: curNode.calcSum.timeCostColumnList,
          isExtraColumnExist: params.extraColumns.length > 0,
          extraColumnsCount,
          staffColumnCount,
          colBeforeSum,
          showOrder
        }
      }
      depts.push(depart)
    }
  }

  function orgTreeCalcDepSum (curNode, payElCount = 0) {
    curNode.calcSum = {
      allSum: { allHours: 0, allDays: 0 },
      timeCostColumnList: []
    }
    for (let i = 0; i < timeCostColumnList.length; i++) curNode.calcSum.timeCostColumnList.push({ days: 0, hours: 0 })

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.allHours = currencyService.round(curNode.calcSum.allSum.allHours + (el.allHours || 0), 2)
          curNode.calcSum.allSum.allDays = currencyService.round(curNode.calcSum.allSum.allDays + (el.allDays || 0), 2)
          curNode.calcSum.timeCostColumnList.forEach((pe, ind) => {
            pe.days = currencyService.round(pe.days + (el.timeCostList[ind].days || 0), 2)
            pe.hours = currencyService.round(pe.hours + (el.timeCostList[ind].hours || 0), 2)
          })
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur, payElCount)
        curNode.calcSum.allSum.allHours = currencyService.round(curNode.calcSum.allSum.allHours + (cur.calcSum.allSum.allHours || 0), 2)
        curNode.calcSum.allSum.allDays = currencyService.round(curNode.calcSum.allSum.allDays + (cur.calcSum.allSum.allDays || 0), 2)
        curNode.calcSum.timeCostColumnList.forEach((pe, ind) => {
          pe.days = currencyService.round(pe.days + (cur.calcSum.timeCostColumnList[ind].days || 0))
          pe.hours = currencyService.round(pe.hours + (cur.calcSum.timeCostColumnList[ind].hours || 0))
        })
      })
    }
  }

  let depts = []
  if (groupReportByDep) {
    orgNames.forEach(org => {
      if (emps.filter(o => o.orgID === org.ID).length) {
        if (params.organizationID && params.includeSubOrg) {
          depts.push({
            emps: [],
            isGroupDep: true,
            isOrg: true,
            showPeriod,
            showPeriodElInput,
            showOrder,
            useActualPositionName,
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
            isExtraColumnExist: params.extraColumns.length > 0,
            extraColumnsCount,
            staffColumnCount,
            dept: {
              colCount: allColumnCount,
              deptName: org.description,
              showOrder,
              isExtraColumnExist: params.extraColumns.length > 0,
              extraColumnsCount,
              staffColumnCount
            }
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
        orgTreeCalcDepSum(orgTree[0], params.extraColumns.length)
        orgTreeDataToReport(orgTree[0], depts, params.groupReportByDep, org.ID)

        depts = depts.map(dep => {
          dep.emps.sort(compareEmps)
          return dep
        })
      }
    })
  } else {
    emps.sort(compareEmps)
    const depart = {
      emps,
      isGroupDep: false
    }
    depts.push(depart)
  }
  let summary = {
    allDays: summarySection.allDays,
    allHours: summarySection.allHours,
    timeCostColumnList: []
  }
  timeCostColumnList.forEach(el => {
    summary.timeCostColumnList.push(summarySection.timeCostList[el.ID])
  })

  depts.forEach(dep => {
    dep.emps = dep.emps.map(o => {
      o.showPeriod = showPeriod
      o.showPeriodElInput = showPeriodElInput
      o.showOrder = showOrder
      o.timeCostColumnList = timeCostColumnList
      o.useActualPositionName = useActualPositionName
      o.showColumnSexType = params.extraColumns.includes('sexType')
      o.showColumnBirthDate = params.extraColumns.includes('birthDate')
      o.showColumnDateFrom = params.extraColumns.includes('dateFrom')
      o.showColumnDateTo = params.extraColumns.includes('dateTo')
      o.showColumnWorkerType = params.extraColumns.includes('workerType')
      o.showColumnWorkSchedule = params.extraColumns.includes('workScheduleID')
      o.showColumnWorkPlace = params.extraColumns.includes('workPlace')
      o.showColumnDictStaffCat = params.extraColumns.includes('dictStaffCatID')
      o.showColumnMtCount = params.extraColumns.includes('mtCount')
      o.showColumnDictCategoryECB = params.extraColumns.includes('dictCategoryECBID')
      o.showColumnAccountID = params.extraColumns.includes('accountID')
      o.showColumnDictCostType = params.extraColumns.includes('dictCostType')
      return o
    })
  })
  staffUnitStore.freeNative()

  return {
    depts,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `,
    periodName,
    depName,
    fixedColumnsCount,
    fixedColumnsWidth,
    timeCostColumnsCount,
    timeCostColumnsWidth,
    extraColumnsCount,
    extraColumnsWidth,
    allColumnCount,
    colBeforeSum,
    sheetSize,
    showPeriod,
    showPeriodElInput,
    showOrder,
    useActualPositionName,
    staffColumnCount,
    allAddColumnCount,
    isDep: params.departmentID ? { depName } : null,
    timeCostColumnList,
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
    isExtraColumnExist: params.extraColumns.length > 0,
    showOnlySummary: !groupReportByDep,
    summary
  }
}

function getLongVacationData (params) {
  params.dateFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.dateTo = dateService.shiftDate(params.periodToDateTo)
  params.OnDate = dateService.shiftDate(params.periodToDateTo)
  const resultData = {
    personTable: [],
    onDate: '',
    dateFrom: '',
    dateTo: '',
    org: UB.i18n('Органiзацiя'),
    departmentName: '',
    quantityPerson: 0,
    orgName: '',
    PeriodReport: '',
    depName: '',
    VacationTable: []
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
        .where('orgID', '=', params.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', params.dateFrom)
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
          .where('orgID', '=', params.orgID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', params.dateTo)
          .where('mi_dateTo', '>=', params.dateTo)
          .where('mi_treePath', 'like', `%/${departmentID}/%`)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
      })
    }
  }

  const myMassiveTimeCostID = reportService.getReportParams(params.orgID, ['ReportSheetTimeCost'])

  const ds = UB.DataStore('hr_empListUnpaidLongVac')

  let fieldList = ['tabNum', 'fullFIO', 'posName', 'vdateFrom', 'vdateTo', 'depName', 'vacDescription', 'orgName', 'dictVacationKindName', 'selfStructDepName', 'vacKindID', 'vacName', 'docName', 'orderNumber', 'orderDate', 'NewDateTo', 'employeeID', 'factTimeCostID', 'orderID']

  params.deptIDs = deptIDs

  global.hr_empListUnpaidLongVac.search3({
    entity: 'hr_empListUnpaidLongVac',
    dataStore: ds,
    fieldList: fieldList,
    mParams: params,
    myMassiveFactTimeCostID: myMassiveTimeCostID.ReportSheetTimeCostIDs
  })

  resultData.data = ds.getAsJsObject()
  ds.freeNative()

  resultData.personTable = resultData.data

  let rowIndexToCopy = 0
  resultData.personTable.forEach(item => {
    if (item.vacName === null) {
      item.vacName = ''
    }

    let firstVac = true
    let resultQuerry = UB.Repository('tim_timeSheet')
      .attrs('planID', 'dateWork')
      .where('employeeNumberID', '=', item.employeeNumberID)
      .where('factTimeCostID', '=', item.factTimeCostID)
      .orderBy('planID')
      .selectAsObject()
    if (!item.orderID) {
      let nextPlanId = 0
      let massivePlanID = []
      let a = 1
      resultQuerry.forEach(itemData => {
        massivePlanID.push(itemData.dateWork)
        if (a < resultQuerry.length) {
          nextPlanId = resultQuerry[a].planID
        }
        if (itemData.planID < nextPlanId - 1) {
          if (!firstVac) {
            let copiedRow = Object.assign({}, resultData.personTable[rowIndexToCopy])
            copiedRow.vdateFrom = massivePlanID[0]
            copiedRow.vdateTo = massivePlanID[massivePlanID.length - 1]
            resultData.personTable.push(copiedRow)
            massivePlanID = []
          } else {
            item.vdateFrom = massivePlanID[0]
            item.vdateTo = massivePlanID[massivePlanID.length - 1]
            massivePlanID = []
          }
          firstVac = false
        }
        if (a === resultQuerry.length && massivePlanID.length && !firstVac) {
          let copiedRow = Object.assign({}, resultData.personTable[rowIndexToCopy])
          copiedRow.vdateFrom = massivePlanID[0]
          copiedRow.vdateTo = massivePlanID[massivePlanID.length - 1]
          resultData.personTable.push(copiedRow)
          massivePlanID = []
        }
        a = a + 1
      })
    } else {
      UB.Repository('tim_timeSheet')
        .attrs('MAX([dateWork])', 'MIN([dateWork])')
        .where('employeeNumberID', '=', item.employeeNumberID)
        .where('factTimeCostID', '=', item.factTimeCostID)
        .where('orderID', '=', item.orderID)
        .selectAsObject().forEach(itemVacData => {
          item.vdateFrom = itemVacData['MIN([dateWork])']
          item.vdateTo = itemVacData['MAX([dateWork])']
        })
    }
    rowIndexToCopy = rowIndexToCopy + 1
  })
  if (params.includeSubOrg === true) {
    resultData.orgName = orgNames[0].description + ' (з підлеглими)'
  } else {
    resultData.orgName = orgNames[0].description
  }
  resultData.quantityPerson = resultData.personTable.length

  const findMassive = _.groupBy(resultData.personTable, 'vacName')

  const vacationKeys = Object.keys(findMassive)

  vacationKeys.forEach(item => {
    resultData.VacationTable.push({ vacName: item, QuantityVacation: findMassive[item].length })
  })

  resultData.personTable.forEach(item => {
    if (item.docName == null) {
      if (dateService.formatDate(item.vdateFrom).length && dateService.formatDate(item.vdateTo).length) {
        item.vacDescription = 'з ' + dateService.formatDate(item.vdateFrom) + ' по ' + dateService.formatDate(item.vdateTo)
      } else if (!dateService.formatDate(item.vdateFrom).length || !dateService.formatDate(item.vdateTo).length) {
        item.vacDescription = 'Відсутність у періоді звіту з ' + dateService.formatDate(item.vdateFrom) + ' по ' + dateService.formatDate(item.vdateTo)
      }
    } else {
      item.vacDescription = ''
      if (dateService.formatDate(item.vdateFrom).length) {
        item.vacDescription = 'з ' + dateService.formatDate(item.vdateFrom)
      }
      if (dateService.formatDate(item.vdateFrom).length) {
        item.vacDescription = item.vacDescription + ' по ' + dateService.formatDate(item.vdateTo)
      }
      item.vacDescription = item.vacDescription + ' - ' + item.docName + ' № ' + item.orderNumber + ' від ' + dateService.formatDate(item.orderDate)
    }
    if (dateService.shiftDate(item.vdateFrom) >= dateService.shiftDate(params.dateFrom)) {
      item.vdateFrom = dateService.formatDate(item.vdateFrom)
    } else {
      item.vdateFrom = ''
    }

    if (dateService.shiftDate(params.dateTo) >= dateService.shiftDate(item.vdateTo)) {
      item.vdateTo = dateService.formatDate(item.vdateTo)
    } else {
      item.vdateTo = ''
    }
    item.OnDate = dateService.formatDate(item.OnDate)
  })

  if (params.includeSubDep) {
    resultData.depName = 'Підрозділ ' + depName
  } else if (params.departmentID) {
    resultData.depName = 'Підрозділ ' + depName
  } else if (params.dictMultiGroupID) {
    resultData.depName = 'Група підрозділів ' + depName
  }

  if (!params.dateFrom.getMonth() && params.dateTo.getMonth() === 11) {
    resultData.PeriodReport = 'За ' + params.dateTo.getFullYear() + ' рік'
  } else if (params.dateFrom === params.dateTo) {
    resultData.PeriodReport = 'За ' + dateService.formatDate(params.dateFrom) + ' року. ' + dateService.formatDate(params.dateTo)
  } else {
    resultData.PeriodReport = 'За період з ' + dateService.formatDate(params.dateFrom) + ' року по ' + dateService.formatDate(params.dateTo) + ' року.'
  }
  return resultData
}

function getEmployeeAccrualList (params) {
  const sqlDialect = entityBaseService.getSQLDialect()
  if (!params.extraColumns) params.extraColumns = []
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

  const resultData = {
    tableWidth: 1600,
    data: [],
    colSpan: 12,
    permColSpan: 12,
    addColSpan: 0,
    columsConfig: [],
    title: [],
    colNums: [],
    organizationName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''}`
  }

  const configColumns = {}
  function addConfigColumns (attr, name, width) {
    configColumns[attr] = params.extraColumns.includes(name)
    resultData.colSpan += configColumns[attr] ? 1 : 0
    resultData.addColSpan += configColumns[attr] ? 1 : 0
    resultData.tableWidth += configColumns[attr] ? width : 0
  }
  addConfigColumns('showColumnSexType', 'sexType', 100)
  addConfigColumns('showColumnBirthDate', 'birthDate', 100)
  addConfigColumns('showColumnDateFrom', 'dateFrom', 100)
  addConfigColumns('showColumnDateTo', 'dateTo', 100)
  addConfigColumns('showColumnWorkerType', 'workerType', 150)
  addConfigColumns('showColumnWorkSchedule', 'workScheduleID', 150)
  addConfigColumns('showColumnWorkPlace', 'workPlace', 150)
  addConfigColumns('showColumnDictStaffCat', 'dictStaffCatID', 150)
  addConfigColumns('showColumnMtCount', 'mtCount', 100)
  addConfigColumns('showColumnDictCategoryECB', 'dictCategoryECBID', 150)
  addConfigColumns('showColumnAccountID', 'accountID', 150)
  addConfigColumns('showColumnDictCostType', 'dictCostType', 150)
  addConfigColumns('showColumnOrder', 'order', 200)

  function addConfig (obj) {
    for (let key in configColumns) {
      resultData[key] = configColumns[key]
    }
  }
  addConfig(resultData)
  const orgsData = UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'name'])
    .where('state', '=', 'ACTIVE')
    .whereIf(params.includeSubOrg, 'mi_treePath', 'like', `%/${params.organizationID}/%`)
    .whereIf(!params.includeSubOrg, 'mi_data_id', '=', params.organizationID)
    .where('mi_dateFrom', '<=', params.periodTo)
    .where('mi_dateTo', '>=', params.periodFrom)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('treePath')
    .selectAsObject()
  if (!orgsData.length) {
    orgsData.push({ mi_data_id: params.organizationID, name: params.organizationName })
  }

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
      deptIDs = departments.length ? departments.map(o => o.mi_data_id) : [params.departmentID]
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
        deptIDs = deptIDs.concat(subDepts.map(o => o.mi_data_id))
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
      })
    }
  }

  function getEmpInfo (empItem) {
    const obj = {
      posIdxNum: empItem.posIdxNum || 0,
      tabNumSort: empItem.tabNumSort || 0,
      nameSort: empItem.fullFIO || '',
      dateFromSort: empItem.dateFrom,
      dateToSort: empItem.dateTo,
      tabNum: empItem.tabNum || '',
      name: empItem.fullFIO || '',
      orgName: empItem.orgName || '',
      depName: empItem.depName || '',
      posName: empItem.positionName || '',
      dateFrom: dateService.formatDate(empItem.dateFrom),
      dateTo: dateService.formatDate(empItem.dateTo) === '31.12.9999' ? '' : dateService.formatDate(empItem.dateTo),
      sexType: configColumns['showColumnSexType'] ? empItem.sexType || '' : '',
      birthDate: configColumns['showColumnBirthDate'] ? dateService.formatDate(empItem.birthDate) : '',
      startWork: configColumns['showColumnDateFrom'] ? dateService.formatDate(empItem.startWork) : '',
      endWork: configColumns['showColumnDateTo'] ? dateService.formatDate(empItem.endWork) : '',
      workerType: configColumns['showColumnWorkerType'] ? empItem.workerTypeName || '' : '',
      workSchedule: configColumns['showColumnWorkSchedule'] ? empItem.workSchedule || '' : '',
      workPlace: configColumns['showColumnWorkPlace'] ? empItem.workPlaceName || '' : '',
      staffCatName: configColumns['showColumnDictStaffCat'] ? empItem.staffCatName || '' : '',
      mtCount: configColumns['showColumnMtCount'] ? empItem.mtCount || '' : '',
      dictCategoryECB: configColumns['showColumnDictCategoryECB'] ? empItem.dictCategoryECB || '' : '',
      dictCostType: configColumns['showColumnDictCostType'] ? empItem.dictCostType || '' : '',
      accountName: configColumns['showColumnAccountID'] ? empItem.accountName || '' : ''
    }
    return obj
  }

  function addAccrual (empItem, empAccrual, orgAccrual, tfAccrual) {
    const dataAccrual = []
    empAccrual.forEach(accItem => {
      const obj = getEmpInfo(empItem)
      obj.payElID = accItem.payElID
      obj.bold = 'font-weight: bold; '
      obj.dateFromAcc = dateService.formatDate(accItem.dateFrom)
      obj.dateToAcc = dateService.formatDate(accItem.dateTo) === '31.12.9999' ? '' : dateService.formatDate(accItem.dateTo)
      obj.accrualRate = accItem.accrualRate
      obj.accrualSum = accItem.accrualSum
      obj.payName = accItem['payElID.description'] || ''
      obj.order = configColumns['showColumnOrder'] ? accItem['orderID.description'] || '' : ''
      obj.payNameSort = accItem['payElID.codeSort'] || ''

      addConfig(obj)
      dataAccrual.push(obj)
    })

    orgAccrual.forEach(accItem => {
      if (!dataAccrual.find(o => o.payElID === accItem.payElID) &&
        !((accItem.excludeDepartment && accItem.departmentID.includes(empItem.departmentID)) || (!accItem.excludeDepartment && accItem.departmentID.length && !accItem.departmentID.includes(empItem.departmentID))) &&
        !((accItem.excludePosition && accItem.dictPositionID.includes(empItem.dictPositionID)) || (!accItem.excludePosition && accItem.dictPositionID.length && !accItem.dictPositionID.includes(empItem.dictPositionID))) &&
        !((accItem.excludeStaff && accItem.dictStaffCatID.includes(empItem.dictStaffCatID)) || (!accItem.excludeStaff && accItem.dictStaffCatID.length && !accItem.dictStaffCatID.includes(empItem.dictStaffCatID))) &&
        !((accItem.excludeEmpCategory && accItem.dictEmpCategoryID.includes(empItem.dictEmpCategoryID)) || (!accItem.excludeEmpCategory && accItem.dictEmpCategoryID.length && !accItem.dictEmpCategoryID.includes(empItem.dictEmpCategoryID))) &&
        !((accItem.excludeWorkPlace && accItem.workPlace.includes(empItem.workPlace)) || (!accItem.excludeWorkPlace && accItem.workPlace.length && !accItem.workPlace.includes(empItem.workPlace))) &&
        !((accItem.excludeWorkerType && accItem.workerType.includes(empItem.workerType)) || (!accItem.excludeWorkerType && accItem.workerType.length && !accItem.workerType.includes(empItem.workerType)))
      ) {
        const obj = getEmpInfo(empItem)
        obj.payElID = accItem.payElID
        obj.bold = ''
        obj.dateFromAcc = dateService.formatDate(accItem.dateFrom)
        obj.dateToAcc = dateService.formatDate(accItem.dateTo) === '31.12.9999' ? '' : dateService.formatDate(accItem.dateTo)
        obj.accrualRate = accItem.rate
        obj.accrualSum = accItem.paySum
        obj.payName = accItem['payElID.description'] || ''
        obj.order = ''
        obj.payNameSort = accItem['payElID.codeSort'] || ''
        addConfig(obj)
        dataAccrual.push(obj)
      }
    })

    tfAccrual.forEach(accItem => {
      const obj = getEmpInfo(empItem)
      obj.payElID = accItem.payElID
      obj.bold = ''
      obj.dateFromAcc = dateService.formatDate(accItem.dateFrom)
      obj.dateToAcc = dateService.formatDate(accItem.dateTo) === '31.12.9999' ? '' : dateService.formatDate(accItem.dateTo)
      obj.accrualRate = accItem.rate
      obj.accrualSum = accItem.accrualSum
      obj.payName = accItem['payElID.description'] || ''
      obj.order = ''
      obj.payNameSort = accItem['payElID.codeSort'] || ''

      for (let key in obj) {
        if (!['posIdxNum', 'tabNumSort', 'nameSort', 'dateFromSort', 'dateToSort', 'payNameSort', 'payElID', 'bold', 'accrualRate', 'accrualSum'].includes(key) && obj[key]) {
          obj[key] = `<i>${obj[key]}</i>`
        }
      }
      addConfig(obj)
      dataAccrual.push(obj)
    })
    return dataAccrual
  }

  function sortData (a, b) {
    switch (params.setOrderBy) {
      case '1': // 'за періодом'
        return !dateService.dayDiff(b.dateFromSort, a.dateFromSort)
          ? !dateService.dayDiff(b.dateToSort, a.dateToSort)
            ? (a['nameSort'] === b['nameSort']
              ? a.tabNumSort === b.tabNumSort ? (a['payNameSort'] - b['payNameSort']) : (a.tabNumSort - b.tabNumSort)
              : stringService.compareStringUa(a['nameSort'], b['nameSort']))
            : dateService.dayDiff(b.dateToSort, a.dateToSort)
          : dateService.dayDiff(b.dateFromSort, a.dateFromSort)
      case '2': // 'за ПІБ'
        return a['nameSort'] === b['nameSort']
          ? !dateService.dayDiff(b.dateFromSort, a.dateFromSort)
            ? !dateService.dayDiff(b.dateToSort, a.dateToSort)
              ? a.tabNumSort === b.tabNumSort
                ? (a['payNameSort'] - b['payNameSort'])
                : (a.tabNumSort - b.tabNumSort)
              : dateService.dayDiff(b.dateToSort, a.dateToSort)
            : dateService.dayDiff(b.dateFromSort, a.dateFromSort)
          : stringService.compareStringUa(a['nameSort'], b['nameSort'])
      case '3': // 'за табельним номером'
        return a.tabNumSort === b.tabNumSort
          ? a['nameSort'] === b['nameSort']
            ? !dateService.dayDiff(b.dateFromSort, a.dateFromSort)
              ? !dateService.dayDiff(b.dateToSort, a.dateToSort)
                ? (a['payNameSort'] - b['payNameSort'])
                : dateService.dayDiff(b.dateToSort, a.dateToSort)
              : dateService.dayDiff(b.dateFromSort, a.dateFromSort)
            : stringService.compareStringUa(a['nameSort'], b['nameSort'])
          : (a.tabNumSort - b.tabNumSort)
      default:
        return a.posIdxNum === b.posIdxNum
          ? a['nameSort'] === b['nameSort']
            ? a.tabNumSort === b.tabNumSort
              ? !dateService.dayDiff(b.dateFromSort, a.dateFromSort)
                ? !dateService.dayDiff(b.dateToSort, a.dateToSort)
                  ? (a['payNameSort'] - b['payNameSort'])
                  : dateService.dayDiff(b.dateToSort, a.dateToSort)
                : dateService.dayDiff(b.dateFromSort, a.dateFromSort)
              : (a.tabNumSort - b.tabNumSort)
            : stringService.compareStringUa(a['nameSort'], b['nameSort'])
          : a.posIdxNum - b.posIdxNum
    }
  }

  const payElData = params.payElListParams ? JSON.parse(params.payElListParams) : []
  const payElIDs = payElData.map(el => el.payElID)
  if ((params.showEmptyDateTo || params.showWithDateTo) && (params.indAccrual || params.orgAccrual || params.tarifAccrual)) {
    const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true
    orgsData.forEach(orgData => {
      const employeeAccrual = params.indAccrual ? UB.Repository('hr_employeeAccrual')
        .attrs(['ID', 'employeeNumberID', 'accrualSum', 'accrualRate', 'dateFrom', 'dateTo', 'payElID', 'payElID.description', 'payElID.codeSort'])
        .attrsIf(configColumns['showColumnOrder'], 'orderID.description')
        .where('employeeNumberID.orgID', '=', orgData.mi_data_id)
        .whereIf(payElIDs.length, 'payElID', 'in', payElIDs)
        .where('dateTo', '>=', params.periodFrom)
        .where('dateFrom', '<=', params.periodTo)
        .whereIf(params.showEmptyDateTo && !params.showWithDateTo, 'dateTo', '=', '#maxdate')
        .whereIf(!params.showEmptyDateTo && params.showWithDateTo, 'dateTo', '<>', '#maxdate')
        .selectAsObject() : []
      employeeAccrual.forEach(row => {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
      })
      const organizationAccrual = params.orgAccrual ? UB.Repository('hr_payPerm')
        .attrs(['ID', 'paySum', 'rate', 'excludeStaff', 'payElID', 'payElID.description', 'payElID.codeSort', 'dateFrom', 'dateTo',
          'excludePosition', 'excludeDepartment', 'excludeWorkPlace', 'excludeWorkerType', 'excludeEmpCategory'])
        .where('excludeOrg', '=', 0, 'excOrg')
        .where('excludeOrg', '=', 1, 'inexcOrg')
        .whereIf(payElIDs.length, 'payElID', 'in', payElIDs)
        .where('dateTo', '>=', params.periodFrom)
        .where('dateFrom', '<=', params.periodTo)
        .whereIf(params.showEmptyDateTo && !params.showWithDateTo, 'dateTo', '=', '#maxdate')
        .whereIf(!params.showEmptyDateTo && params.showWithDateTo, 'dateTo', '<>', '#maxdate')
        .exists(UB.Repository('hr_payPermDt')
          .correlation('payPermID', 'ID')
          .where('orgID', '=', orgData.mi_data_id)
          .where('permType', '=', '1')
          .where('mi_deleteDate', '>=', '#maxdate'),
        'org')
        .notExists(UB.Repository('hr_payPermDt')
          .correlation('payPermID', 'ID')
          .where('permType', '=', '1')
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notOrg')
        .notExists(UB.Repository('hr_payPermDt')
          .correlation('payPermID', 'ID')
          .where('orgID', '=', orgData.mi_data_id)
          .where('permType', '=', '1')
          .where('mi_deleteDate', '>=', '#maxdate'),
        'inorg')
        .logic('(([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))')
        .selectAsObject() : []
      const payPermDt = organizationAccrual.length ? UB.Repository('hr_payPermDt')
        .attrs(['ID', 'payPermID', 'orgID', 'dictStaffCatID', 'dictPositionID', 'permType', 'departmentID', 'workPlace', 'workerType', 'dictEmpCategoryID'])
        .where('permType', '!=', '1')
        .where('payPermID', 'in', organizationAccrual.map(o => o.ID))
        .selectAsObject() : []

      organizationAccrual.forEach(orgAccr => {
        orgAccr.dateFrom = dateService.shiftDate(orgAccr.dateFrom)
        orgAccr.dateTo = dateService.shiftDate(orgAccr.dateTo)
        orgAccr.departmentID = payPermDt.filter(o => o.permType === '4' && o.payPermID === orgAccr.ID).map(o => o.departmentID)
        orgAccr.dictPositionID = payPermDt.filter(o => o.permType === '3' && o.payPermID === orgAccr.ID).map(o => o.dictPositionID)
        orgAccr.dictStaffCatID = payPermDt.filter(o => o.permType === '2' && o.payPermID === orgAccr.ID).map(o => o.dictStaffCatID)
        orgAccr.workPlace = payPermDt.filter(o => o.permType === '5' && o.payPermID === orgAccr.ID).map(o => o.workPlace)
        orgAccr.workerType = payPermDt.filter(o => o.permType === '6' && o.payPermID === orgAccr.ID).map(o => o.workerType)
        orgAccr.dictEmpCategoryID = payPermDt.filter(o => o.permType === '11' && o.payPermID === orgAccr.ID).map(o => o.dictEmpCategoryID)
      })

      const tarifAccrual = params.tarifAccrual ? UB.Repository('trf_accrual')
        .attrs(['ID', 'positionID.workPlaceID.employeeNumberID', 'positionID.dictPositionID', 'accrualSum', 'rate', 'positionID.workPlaceID.dateFrom', 'positionID.workPlaceID.dateTo',
          'payElID', 'payElID.description', 'payElID.codeSort'])
        .where('positionID.workPlaceID.documentID.orgID', '=', orgData.mi_data_id)
        .whereIf(payElIDs.length, 'payElID', 'in', payElIDs)
        .where('positionID.workPlaceID.dateTo', '>=', params.periodFrom)
        .where('positionID.workPlaceID.dateFrom', '<=', params.periodTo)
        .whereIf(params.showEmptyDateTo && !params.showWithDateTo, 'positionID.workPlaceID.dateTo', '=', '#maxdate')
        .whereIf(!params.showEmptyDateTo && params.showWithDateTo, 'positionID.workPlaceID.dateTo', '<>', '#maxdate')
        .where('positionID.workPlaceID.state', '=', 'POSTED')
        .where('positionID.workPlaceID.employeeNumberID.empWorkPlace', '=', '5')
        .where('mi_deleteDate', '>=', '#maxdate')
        .selectAsObject({
          'positionID.workPlaceID.dateFrom': 'dateFrom',
          'positionID.workPlaceID.dateTo': 'dateTo',
          'positionID.workPlaceID.employeeNumberID': 'employeeNumberID',
          'positionID.dictPositionID': 'dictPositionID'
        }) : []
      tarifAccrual.forEach(row => {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
      })

      if (employeeAccrual.length || organizationAccrual.length || tarifAccrual.length) {
        const empNumberDS = UB.DataStore('hr_employeeNumber')
        const epClause = params.checkPosDepChange
          ? ` in (select ep2.ID from hr_employeePosition ep2 where
            ep2.employeeNumberID = en.ID  and ep2.isActive = 1 and ep2.mi_deleteDate >= '9999-12-31'
            and ep2.dateFrom <= :dateTo: and ep2.dateTo >= :dateFrom: )`
          : ` = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where
            ep2.employeeNumberID = en.ID  and ep2.isActive = 1 and ep2.mi_deleteDate >= '9999-12-31'
            and ep2.dateFrom <= :dateTo: order by ep2.dateFrom desc ${sqlDialect.limit})`

        empNumberDS.runSQL(`SELECT 
          en.ID as "employeeNumberID"
          ,en.employeeID as "employeeID"
          ,ep.ID as "employeePositionID"
          ,ep.positionID as "positionID"
          ,ep.dictPositionID as "dictPositionID"
          ,ep.dictEmpCategoryID as "dictEmpCategoryID"
          ,ep.departmentID as "departmentID"
          ,(case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.idxNum from hr_position pos 
              where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
            else (select dp.idxNum from hr_dictPosition dp where dp.ID = ep.dictPositionID) end) "posIdxNum"
          ,en.tabNum as "tabNum"
          ,en.tabNumSort as "tabNumSort"
          ,e.fullFIO as "fullFIO"
          ${configColumns['showColumnSexType'] ? ',st.name as "sexType"' : ''}
          ${configColumns['showColumnBirthDate'] ? ',e.birthDate as "birthDate"' : ''}
          ${configColumns['showColumnDateFrom'] ? ',en.dateFrom as "startWork"' : ''}
          ${configColumns['showColumnDateTo'] ? ',en.dateTo as "endWork"' : ''}
          ,ep.dateFrom as "dateFrom" 
          ,ep.dateTo as "dateTo" 
          ${configColumns['showColumnMtCount'] ? ',ep.mtCount as "mtCount"' : ''}
          ,ep.factPosition as "factPosition"
          ,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "positionName" 
          ${configColumns['showColumnDictStaffCat'] ? ',dsc.description as "staffCatName"' : ''}
          ${configColumns['showColumnWorkSchedule'] ? ',ws.name as "workSchedule"' : ''}
          ${configColumns['showColumnDictCategoryECB'] ? ',ecb.description as "dictCategoryECB"' : ''}
          ${configColumns['showColumnAccountID'] ? ',gla.description as "accountName"' : ''}
          ,ep.workerType as "workerType"
          ${configColumns['showColumnWorkerType'] ? ',wt.name as "workerTypeName"' : ''}
          ${configColumns['showColumnWorkPlace'] ? ',wp.name as "workPlaceName"' : ''}
          ,ep.workPlace as "workPlace"
          ${configColumns['showColumnDictCostType'] ? `,(SELECT ${sqlDialect.top} description FROM ac_dictCostType dct WHERE dct.ID = ep.d0Value OR dct.ID = ep.d1Value OR dct.ID = ep.d2Value OR dct.ID = ep.d3Value OR dct.ID = ep.d4Value OR dct.ID = ep.d5Value OR dct.ID = ep.d6Value OR dct.ID = ep.d7Value OR dct.ID = ep.d8Value OR dct.ID = ep.d9Value ${sqlDialect.limit}) as "dictCostType"` : ''}
          ,(select ${sqlDialect.top} dep.name from hr_department dep where dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' 
          and dep.mi_deleteDate >= '9999-12-31' order by dep.mi_dateTo desc ${sqlDialect.limit}) as "depName"
      
          FROM hr_employeeNumber en   
          INNER JOIN  hr_employeePosition ep ON ep.isActive = 1 and
                ep.ID ${epClause}
          LEFT JOIN hr_employee e ON e.ID = en.employeeID
          LEFT JOIN hr_dictPosition dp on dp.ID = ep.dictPositionID 
          ${configColumns['showColumnDictStaffCat'] ? 'LEFT JOIN hr_dictStaffCat dsc on dsc.ID = ep.dictStaffCatID' : ''}
          ${configColumns['showColumnWorkSchedule'] ? 'LEFT JOIN hr_workSchedule ws on ws.ID = ep.workScheduleID' : ''}
          ${configColumns['showColumnDictCategoryECB'] ? 'LEFT JOIN hr_dictCategoryECB ecb ON ecb.ID = ep.dictCategoryECBID' : ''}
          ${configColumns['showColumnAccountID'] ? 'LEFT JOIN gl_account gla ON  gla.ID = ep.accountID' : ''}
          ${configColumns['showColumnSexType'] ? "LEFT JOIN ubm_enum st on st.code = e.sexType and st.eGroup = 'HR_SEX_TYPE' and st.mi_deleteDate >='9999-12-31'" : ''}
          ${configColumns['showColumnWorkerType'] ? "LEFT JOIN ubm_enum wt on wt.code = ep.workerType and wt.eGroup = 'HR_WORKER_TYPE' and wt.mi_deleteDate >='9999-12-31'" : ''}
          ${configColumns['showColumnWorkPlace'] ? "LEFT JOIN ubm_enum wp on wp.code = ep.workPlace and wp.eGroup = 'HR_WORKER_PLACE' and wt.mi_deleteDate >='9999-12-31'" : ''}      
          WHERE en.orgID = :orgID:
            AND ep.dateFrom <= :dateTo: AND ep.dateTo >= :dateFrom:   
            AND en.mi_deleteDate >= '9999-12-31'
            ${deptIDs ? ` and ep.departmentID${entityBaseService.getInExpression('deptIDs')}` : ''} 
        `, {
          orgID: orgData.mi_data_id,
          deptIDs,
          dateTo: params.periodTo,
          dateFrom: params.periodFrom
        })
        const employeePositionData = empNumberDS.getAsJsObject()
        employeePositionData.forEach(row => {
          row.dateFrom = dateService.shiftDate(row.dateFrom)
          row.dateTo = dateService.shiftDate(row.dateTo)
        })
        if (employeePositionData.length) {
          if (params.groupReportByDep) {
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
              ORDER BY u.treePath`, {
              orgID: orgData.mi_data_id,
              dateTo: params.periodTo
            })
            const structByOrg = staffUnitStore.getAsJsObject()

            if (orgsData.length > 1) {
              resultData.data.push({
                isTitle: true,
                isOrg: true,
                colSpan: resultData.colSpan,
                name: orgData.name
              })
            }

            function getStructData (level, rootItem) {
              const result = []
              const currentStructItems = structByOrg.filter(el => el.parentUnitID === rootItem)
              // : structByOrg.filter(el => !el.parentUnitID)

              if (rootItem === orgData.mi_data_id) {
                const empData = employeePositionData.filter(el => !el['departmentID'])
                const data = []
                empData.forEach(empItem => {
                  empItem.orgName = orgData.name
                  const dataAccrual = addAccrual(empItem,
                    employeeAccrual.filter(accItem => accItem.employeeNumberID === empItem.employeeNumberID &&
                      accItem.dateTo >= empItem.dateFrom && accItem.dateFrom <= empItem.dateTo),
                    organizationAccrual,
                    tarifAccrual.filter(accItem => accItem.employeeNumberID === empItem.employeeNumberID &&
                      accItem.dateTo >= empItem.dateFrom && accItem.dateFrom <= empItem.dateTo && accItem.dictPositionID === empItem.dictPositionID))
                  if (dataAccrual.length) {
                    data.push(...dataAccrual)
                  }
                })
                if (data.length) {
                  data.sort(sortData)
                  result.push(...data)
                }
              }

              if (!currentStructItems.length) {
                return result
              }

              currentStructItems.forEach(structItem => {
                const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
                const empData = employeePositionData.filter(el => el['departmentID'] === structItem.mi_data_id)

                const data = []
                empData.forEach(empItem => {
                  empItem.orgName = orgData.name
                  const dataAccrual = addAccrual(empItem,
                    employeeAccrual.filter(accItem => accItem.employeeNumberID === empItem.employeeNumberID &&
                      accItem.dateTo >= empItem.dateFrom && accItem.dateFrom <= empItem.dateTo),
                    organizationAccrual,
                    tarifAccrual.filter(accItem => accItem.employeeNumberID === empItem.employeeNumberID &&
                      accItem.dateTo >= empItem.dateFrom && accItem.dateFrom <= empItem.dateTo && accItem.dictPositionID === empItem.dictPositionID))
                  if (dataAccrual.length) {
                    data.push(...dataAccrual)
                  }
                })

                const subData = getStructData(level + 1, structItem.mi_data_id)

                if (data.length) {
                  result.push({
                    isTitle: true,
                    colSpan: resultData.colSpan,
                    name: str + structItem.name
                  })
                  data.sort(sortData)
                  result.push(...data)
                }
                if (subData.length) {
                  result.push(...subData)
                }
              })

              return result
            }

            const data = getStructData(1, orgData.mi_data_id)
            if (data.length) {
              resultData.data.push(...data)
            }
          } else {
            const data = []
            employeePositionData.forEach(empItem => {
              empItem.orgName = orgData.name
              let dataAccrual = addAccrual(empItem,
                employeeAccrual.filter(accItem => accItem.employeeNumberID === empItem.employeeNumberID &&
                  accItem.dateTo >= empItem.dateFrom && accItem.dateFrom <= empItem.dateTo),
                organizationAccrual,
                tarifAccrual.filter(accItem => accItem.employeeNumberID === empItem.employeeNumberID &&
                  accItem.dateTo >= empItem.dateFrom && accItem.dateFrom <= empItem.dateTo && accItem.dictPositionID === empItem.dictPositionID))
              if (dataAccrual.length) {
                data.push(...dataAccrual)
              }
            })
            if (data.length) {
              data.sort(sortData)
              resultData.data.push(...data)
            }
          }
        } // employeePositionData
      }// payElIDs.length
    })
  }
  if (params.reportTemplateName) {
    resultData.title.push({ colSpan: resultData.colSpan, addColSpan: resultData.addColSpan, text: `Згідно шаблону: ${params.reportTemplateName}` })
  }
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    resultData.title.push({ colSpan: resultData.colSpan, addColSpan: resultData.addColSpan, text: `за ${params.periodFromRaw} року` })
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    resultData.title.push({ colSpan: resultData.colSpan, addColSpan: resultData.addColSpan, text: `за ${params.periodTo.getFullYear()} рік` })
  } else {
    resultData.title.push({ colSpan: resultData.colSpan, addColSpan: resultData.addColSpan, text: `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року` })
  }
  if (depName) {
    resultData.title.push({ colSpan: resultData.colSpan, addColSpan: resultData.addColSpan, text: depName })
  }

  for (let i = 1; i <= resultData.colSpan; i++) {
    resultData.colNums.push({ name: i })
  }

  return resultData
}
