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

module.exports = {
  getDeducTaxData,
  getDeducMilitaryTaxData,
  getUnionPayData,
  getMinWageData,
  getVacationData,
  getSickRegisterData,
  getAlimentData,
  getBonusData,
  getControlCalcVacReserveData
}

function getDeducTaxData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

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
    .attrs('ID', 'pYear', 'dictMonthID.code', 'name', 'dateFrom', 'dateTo')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo).orderBy('dateFrom')
    .selectAsObject({
      'dictMonthID.code': 'pMonth'
    })

  const department = params.departmentID ? UB.Repository('hr_department')
    .attrs('name')
    .where('mi_data_id', '=', params.departmentID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: params.periodTo })
    .selectScalar() : null

  let fieldList = [ 'fullFIO', 'tabNum', 'period', 'periodDateFrom', 'posName', 'depName', 'paySum', 'taxSum', 'baseSum', 'benefitsSum', 'posIdxNum',
    'departmentID', 'orgName', 'orgID', 'positionID']

  const accruaDeducTaxStore = UB.DataStore('hr_reportDeducTax')
  accruaDeducTaxStore.run('search', {
    fieldList: fieldList,
    organizationID: params.organizationID,
    includeSubOrg: params.includeSubOrg,
    departmentID: params.departmentID,
    includeSubDep: params.includeSubDep,
    periodList: JSON.stringify(periodList),
    periodDateTo: params.periodTo,
    periodDateFrom: params.periodFrom
  })

  const accrual = accruaDeducTaxStore.getAsJsObject()

  // paySum, taxSum, benefitsSum, noTaxable, taxedSum
  accrual.forEach(item => {
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    item.taxSum = item.taxSum ? currencyService.round(item.taxSum, 2) : 0
    item.baseSum = item.baseSum ? currencyService.round(item.baseSum, 2) : 0
    item.benefitsSum = item.benefitsSum ? currencyService.round(item.benefitsSum, 2) : 0

    item.periodSort = item.periodDateFrom ? dateService.shiftDate(item.periodDateFrom).getTime() : 0

    item['noTaxable'] = currencyService.round(item['paySum'] - item['baseSum'], 2)
    item['taxedSum'] = currencyService.round(item['baseSum'] - item['benefitsSum'], 2)
  })

  let allColumnCount = 10
  const staffUnitStore = UB.DataStore('hr_staffUnit')
  function compareEmps (a, b) {
    return a.posIdxNum === b.posIdxNum ? (a['fullFIO'] === b['fullFIO']
      ? (a.tabNumSort === b.tabNumSort ? a['periodSort'] - b['periodSort'] : a.tabNumSort - b.tabNumSort)
      : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
      : a.posIdxNum - b.posIdxNum
  }

  function orgTreeDataToReport (curNode, depts, orgID) {
    if (curNode.isNotEmpty) {
      const depart = {
        emps: curNode.emps,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
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
      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { paySum: 0, taxSum: 0, benefitsSum: 0, noTaxable: 0, taxedSum: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.taxSum = currencyService.round(curNode.calcSum.allSum.taxSum += el.taxSum || 0, 2)
          curNode.calcSum.allSum.benefitsSum = currencyService.round(curNode.calcSum.allSum.benefitsSum += el.benefitsSum || 0, 2)
          curNode.calcSum.allSum.noTaxable = currencyService.round(curNode.calcSum.allSum.noTaxable += el.noTaxable || 0, 2)
          curNode.calcSum.allSum.taxedSum = currencyService.round(curNode.calcSum.allSum.taxedSum += el.taxedSum || 0, 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.taxSum = currencyService.round(curNode.calcSum.allSum.taxSum += cur.calcSum.allSum.taxSum || 0, 2)
        curNode.calcSum.allSum.benefitsSum = currencyService.round(curNode.calcSum.allSum.benefitsSum += cur.calcSum.allSum.benefitsSum || 0, 2)
        curNode.calcSum.allSum.noTaxable = currencyService.round(curNode.calcSum.allSum.noTaxable += cur.calcSum.allSum.noTaxable || 0, 2)
        curNode.calcSum.allSum.taxedSum = currencyService.round(curNode.calcSum.allSum.taxedSum += cur.calcSum.allSum.taxedSum || 0, 2)
      })
    }
  }

  let depts = []

  orgNames.forEach(org => {
    if (accrual.filter(o => o.orgID === org.ID).length) {
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
      const orgTree = treeUtils.orgTree(org.ID, accrual.filter(o => o.orgID === org.ID), params.periodTo, orgStruct)
      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
      depts.forEach(dep => {
        if (dep && dep.emps) dep.emps.sort(compareEmps)
      })
    }
  })

  let number = 1
  depts.forEach(dep => {
    if (dep && dep.emps) dep.emps.forEach(emp => { emp.num = number++ })
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
    periodName: periodName,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''}`,
    departmentName: department && params.includeSubDep ? UB.i18n(`{0} (з підлеглими)`, department) : department || '',
    depts
  }
}

function getDeducMilitaryTaxData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

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

  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsArrayOfValues()

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  let depName = false
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
    }
  }

  let fieldList = [ 'tabNum', 'fullFIO', 'posName', 'paySum', 'taxSum', 'baseSum', 'period', 'depName', 'departmentID', 'positionID', 'orgName', 'selfStructDepName', 'orgID' ]

  const accruaDeducTaxStore = UB.DataStore('hr_reportDeducMilitaryTax')
  accruaDeducTaxStore.run('search', {
    fieldList: fieldList,
    orgID: params.orgID,
    includeSubOrg: params.includeSubOrg,
    departmentID: params.departmentID,
    periodIDs,
    periodDateFrom: params.periodFrom,
    periodDateTo: params.periodTo,
    includeSubDep: params.includeSubDep
  })

  const accrual = accruaDeducTaxStore.getAsJsObject()

  accrual.forEach(item => {
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    item.taxSum = item.taxSum ? currencyService.round(item.taxSum, 2) : 0
    item.baseSum = item.baseSum ? currencyService.round(item.baseSum, 2) : 0
    item['noTaxable'] = currencyService.round(item['paySum'] - item['baseSum'], 2)
  })

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { paySum: 0, noTaxable: 0, baseSum: 0, taxSum: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.noTaxable = currencyService.round(curNode.calcSum.allSum.noTaxable += el.noTaxable || 0, 2)
          curNode.calcSum.allSum.baseSum = currencyService.round(curNode.calcSum.allSum.baseSum += el.baseSum || 0, 2)
          curNode.calcSum.allSum.taxSum = currencyService.round(curNode.calcSum.allSum.taxSum += el.taxSum || 0, 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.noTaxable = currencyService.round(curNode.calcSum.allSum.noTaxable += cur.calcSum.allSum.noTaxable || 0, 2)
        curNode.calcSum.allSum.baseSum = currencyService.round(curNode.calcSum.allSum.baseSum += cur.calcSum.allSum.baseSum || 0, 2)
        curNode.calcSum.allSum.taxSum = currencyService.round(curNode.calcSum.allSum.taxSum += cur.calcSum.allSum.taxSum || 0, 2)
      })
    }
  }
  function orgTreeDataToReport (curNode, depts, orgID) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
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
      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  let depts = []
  let allColumnCount = 9

  orgNames.forEach(org => {
    if (accrual.filter(o => o.orgID === org.ID).length) {
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
      const orgTree = treeUtils.orgTree(org.ID, accrual.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)
      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
    }
  })
  staffUnitStore.freeNative()
  let number = 1
  depts.forEach(dep => {
    if (dep && dep.emps) dep.emps.forEach(emp => { emp.num = number++ })
  })

  return {
    periodName,
    departmentName: depName,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''}`,
    depts
  }
}

function getUnionPayData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  let extendedFieldList = params.extendedFieldList ? JSON.parse(params.extendedFieldList) : null
  let gridData = params.gridData ? JSON.parse(params.gridData) : []
  let filtersItems = params.filtersItems ? JSON.parse(params.filtersItems) : []
  let sortersItems = params.sortersItems ? JSON.parse(params.sortersItems) : []
  const sqlDialect = entityBaseService.getSQLDialect()
  let accrual = []
  const allSum = {
    incomeSum: 0,
    incomeNoSum: 0,
    incomeWithSum: 0,
    paySum: 0
  }
  const notes = []
  let sorter
  let allColumnCount = 13
  let partTitleColCount = 7
  let addDep

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

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
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

  filtersItems.forEach(filt => {
    const curFilter = extendedFieldList.find(el => el.name === filt.property)
    notes.push({ filterName: `${curFilter.description}:`, value: filt.value })
  })

  // round and num
  gridData.forEach((item, i) => {
    item.incomeSum = item.incomeSum ? currencyService.round(item.incomeSum, 2) : 0
    item.incomeNoSum = item.incomeNoSum ? currencyService.round(item.incomeNoSum, 2) : 0
    item.incomeWithSum = item.incomeWithSum ? currencyService.round(item.incomeWithSum, 2) : 0
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    item.num = i + 1

    // не такие как в грид (для грида лежат в resultData.allSum)
    allSum.incomeSum = currencyService.round(allSum.incomeSum += item.incomeSum, 2)
    allSum.incomeNoSum = currencyService.round(allSum.incomeNoSum += item.incomeNoSum, 2)
    allSum.incomeWithSum = currencyService.round(allSum.incomeWithSum += item.incomeWithSum, 2)
    allSum.paySum = currencyService.round(allSum.paySum += item.paySum, 2)
  })

  if (sortersItems[0]) sorter = sortersItems[0].property

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { incomeSum: 0, incomeNoSum: 0, incomeWithSum: 0, paySum: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.incomeSum = currencyService.round(curNode.calcSum.allSum.incomeSum += el.incomeSum || 0, 2)
          curNode.calcSum.allSum.incomeNoSum = currencyService.round(curNode.calcSum.allSum.incomeNoSum += el.incomeNoSum || 0, 2)
          curNode.calcSum.allSum.incomeWithSum = currencyService.round(curNode.calcSum.allSum.incomeWithSum += el.incomeWithSum || 0, 2)
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)

        curNode.calcSum.allSum.incomeSum = currencyService.round(curNode.calcSum.allSum.incomeSum += cur.calcSum.allSum.incomeSum || 0, 2)
        curNode.calcSum.allSum.incomeNoSum = currencyService.round(curNode.calcSum.allSum.incomeNoSum += cur.calcSum.allSum.incomeNoSum || 0, 2)
        curNode.calcSum.allSum.incomeWithSum = currencyService.round(curNode.calcSum.allSum.incomeWithSum += cur.calcSum.allSum.incomeWithSum || 0, 2)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        // curNode.calcSum.allSum.incomeSum += cur.calcSum.allSum.incomeSum || 0
        // curNode.calcSum.allSum.incomeNoSum += cur.calcSum.allSum.incomeNoSum || 0
        // curNode.calcSum.allSum.incomeWithSum += cur.calcSum.allSum.incomeWithSum || 0
        // curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0
      })
    }
  }
  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isGroupDep: true,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
      }

      depts.push(depart)
    }
    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, orgID)
    })

    // if (curNode.isNotEmpty && curNode.name) {
    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      let depart = {
        emps: [],
        isGroupDep: true,
        depSum: { title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
      }
      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  let depts = []

  if ((sorter && sorter === 'depName') || (!sorter)) {
    orgNames.forEach(org => {
      if (gridData.filter(o => o.orgID === org.ID).length) {
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
        const orgTree = treeUtils.orgTree(org.ID, gridData.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)

        orgTreeCalcDepSum(orgTree[0])
        orgTreeDataToReport(orgTree[0], depts, org.ID)
      }
    })
  } else {
    allColumnCount = 14
    addDep = UB.i18n('Підрозділ')
    partTitleColCount = 5
    depts.push({ emps: gridData })
    depts.push({ depSum: { title: UB.i18n('Всього'), dsum: allSum } })
  }

  return {
    period: periodName,
    department: depName,
    accrual,
    allSum,
    notes,
    sorter,
    depts,
    allColumnCount,
    partTitleColCount,
    addDep
  }
}

function getMinWageData (params) {
  const sqlDialect = entityBaseService.getSQLDialect()
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

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

  const periodIDs = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsArrayOfValues()

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
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  const accrualDS = UB.DataStore('hr_accrual')

  const depClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':periodTo:')
  const orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':periodTo:')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true

  accrualDS.runSQL(` SELECT dep.name as "depName", dep.ID as "depID", en.tabNum as "tabNum", emp.fullFIO as "fullFIO", 
 ${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':periodTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "posName", 
  salperiod.name as "period",
  acc.mtCount as "mtCount",
  acc.days as "days",
  acc.baseSum as "baseSum",
  acc.paySum as "paySum",
  (acc.baseSum + acc.paySum) AS "allSum", 
  ep.departmentID as "departmentID", 
  ep.positionID as "positionID",
  en.orgID as "orgID",
  (SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}) as "selfStructDepName",
  ${staffService.getOrgFldOnDateSql(':periodTo:', 'en.orgID', 'name')} as "orgName"
FROM hr_accrual acc
JOIN hr_employeeNumber en on en.ID = acc.employeeNumberID
JOIN hr_employee emp on en.employeeID = emp.ID 
JOIN hr_payEl pl on acc.payElID = pl.ID
JOIN hr_method meth on pl.methodID = meth.ID AND meth.code = '25'
JOIN hr_dictPeriod salperiod on salperiod.ID = acc.periodSalaryID
JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1 
and ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
where ep2.isActive = 1
and ep2.mi_deleteDate >= '9999-12-31' 
and ep2.employeeNumberID = ep.employeeNumberID    
and ep2.dateFrom <= :periodTo:  
order by ep2.dateFrom desc ${sqlDialect.limit})
LEFT JOIN hr_department dep on dep.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2              
  Where               
  dep2.mi_data_id = ep.departmentID                
  and dep2.orgID = en.orgID                
  and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
 when en.dateTo <= :periodTo: then en.dateTo 
 end)                
  and dep2.mi_deleteDate >= '9999-12-31'               
  and dep2.state = 'ACTIVE'              
  order by dep2.mi_dateFrom desc ${sqlDialect.limit})
LEFT JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
Where              
pos2.mi_data_id = ep.positionID              
and pos2.orgID = en.orgID 
and pos2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
 when en.dateTo <= :periodTo: then en.dateTo 
 end) 
and pos2.mi_deleteDate >= '9999-12-31'              
and pos2.state = 'ACTIVE' 
order by pos2.mi_dateFrom desc ${sqlDialect.limit}             
) 
left join hr_dictPosition dictPos on dictPos.ID = ep.dictPositionID 
WHERE
en.mi_deleteDate >= '9999-12-31' 
and ep.mi_deleteDate >= '9999-12-31'
and emp.mi_deleteDate >= '9999-12-31'
${orgClause}
and acc.periodCalcID${entityBaseService.getInExpression('periodIDs')}
and (acc.flagsRec & 8192 != 8192) 
${depClause} 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
ORDER BY dep.treePath, coalesce(pos.idxNum, dictPos.idxNum), emp.fullFIO`, {
    organizationID: params.organizationID,
    periodIDs,
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    departmentID: params.departmentID
  })

  let accrual = accrualDS.getAsJsObject()
  // mtCount days baseSum paySum allSum
  accrual.forEach(item => {
    item.mtCount = item.mtCount ? currencyService.round(item.mtCount, 2) : 0
    item.days = item.days ? currencyService.round(item.days, 2) : 0
    item.baseSum = item.baseSum ? currencyService.round(item.baseSum, 2) : 0
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    item.allSum = item.allSum ? currencyService.round(item.allSum, 2) : 0
  })

  let depts = []
  let allColumnCount = 12
  const staffUnitStore = UB.DataStore('hr_staffUnit')

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { baseSum: 0, paySum: 0, allSum: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.baseSum = currencyService.round(curNode.calcSum.allSum.baseSum += el.baseSum || 0, 2)
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.allSum = currencyService.round(curNode.calcSum.allSum.allSum += el.allSum || 0, 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.baseSum = currencyService.round(curNode.calcSum.allSum.baseSum += cur.calcSum.allSum.baseSum || 0, 2)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.allSum = currencyService.round(curNode.calcSum.allSum.allSum += cur.calcSum.allSum.allSum || 0, 2)
      })
    }
  }
  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
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
      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  orgNames.forEach(org => {
    if (accrual.filter(o => o.orgID === org.ID).length) {
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
      const orgTree = treeUtils.orgTree(org.ID, accrual.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)
      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
    }
  })
  staffUnitStore.freeNative()

  let number = 1
  depts.forEach(dep => {
    if (dep && dep.emps) dep.emps.forEach(emp => { emp.num = number++ })
  })

  return {
    period: periodName,
    department: depName,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''}`,
    depts
  }
}

function getVacationData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  let extendedFieldList = params.extendedFieldList ? JSON.parse(params.extendedFieldList) : null
  let gridData = params.gridData ? JSON.parse(params.gridData) : []
  let filtersItems = params.filtersItems ? JSON.parse(params.filtersItems) : []
  let sortersItems = params.sortersItems ? JSON.parse(params.sortersItems) : []
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

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

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  let depName
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
    }
  }

  function compareEmps (a, b) {
    return a.tabNumSort === b.tabNumSort ? b.tabNumSort - a.tabNumSort : a.tabNumSort - b.tabNumSort
  }

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { paySum: 0, days: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.days = currencyService.round(curNode.calcSum.allSum.days += el.days || 0, 0)
        })
      }
      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.days = currencyService.round(curNode.calcSum.allSum.days += cur.calcSum.allSum.days || 0, 0)
      })
    }
  }
  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isGroupDep: true,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
      }
      depts.push(depart)
    }

    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, orgID)
    })

    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      let depart = {
        emps: [],
        isGroupDep: true,
        depSum: { title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
      }

      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  const allSum = { paySum: 0, days: 0 }
  const notes = []
  let sorter

  filtersItems.forEach(filt => {
    const curFilter = extendedFieldList.find(el => el.name === filt.property)
    notes.push({ filterName: `${curFilter.description}:`, value: filt.value })
  })

  gridData.forEach((item, i) => {
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    allSum.paySum = currencyService.round(allSum.paySum += item.paySum, 2)
    allSum.days = currencyService.round(allSum.days += item.days, 0)
  })

  if (sortersItems[0]) sorter = sortersItems[0].property

  let depts = []
  function showDataByPayEl (data) {
    if (!data || !data.length) return
    let gridDataByPayEl = [...data]
    gridDataByPayEl.sort((a, b) => (a.payElCode > b.payElCode) ? 1 : -1)
    gridDataByPayEl = _.groupBy(gridDataByPayEl, 'payElID')
    depts.push({ payElSum: { title: UB.i18n('У тому числі в розрізі видів оплати:'), isTitle: true } })
    _.forEach(gridDataByPayEl, items => {
      depts.push({ payElSum: { title: items[0].payElName, dsum: { days: items.reduce((res, item) => res + item.days || 0, 0), paySum: items.reduce((res, item) => res + item.paySum || 0, 0) } } })
    })
  }
  let allColumnCount = 13
  orgNames.forEach(org => {
    if (gridData.filter(o => o.orgID === org.ID).length) {
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
      let gridDatabyOrg = gridData.filter(o => o.orgID === org.ID)
      const orgTree = treeUtils.orgTree(org.ID, gridDatabyOrg, params.periodTo, orgStruct, true)

      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
      depts.forEach(dep => {
        if (dep && dep.emps) dep.emps.sort(compareEmps)
      })
      showDataByPayEl(gridDatabyOrg)
    }
  })

  let number = 1
  depts.forEach(dep => {
    if (dep && dep.emps) dep.emps.forEach(emp => { emp.num = number++ })
  })
  return {
    period: periodName,
    department: depName,
    allSum,
    notes,
    sorter,
    depts,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `
  }
}

function getSickRegisterData (params) {
  let periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  let periodTo = dateService.shiftDate(params.periodToDateTo)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  const sqlDialect = entityBaseService.getSQLDialect()
  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)

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
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    strPeriodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    strPeriodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    strPeriodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  let depName
  let deptIDs = null
  let accrualDS
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
        deptIDs = departments.map(o => o.mi_data_id).join(', ')
      } else {
        deptIDs = [params.departmentID]
      }
    } else {
      deptIDs = [params.departmentID]
    }
  }

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')
  let orgClause = staffService.getOrganizationClause(params.organizationID, params.includeSubOrg, ':dateTo:')
  const dictFundSource = params.dictFundSourceID && params.dictFundSourceID !== '' ? params.dictFundSourceID : []
  const dictProgClass = params.dictProgClassID && params.dictProgClassID !== '' ? params.dictProgClassID : []
  params.isIncludeEmptyDictFundSourceID = dictFundSource.includes(0)
  accrualDS = UB.DataStore('hr_accrual')
  params.isIncludeEmptyDictProgClassID = dictProgClass.includes(0)

  accrualDS = UB.DataStore('hr_accrual')
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.organizationID) === true
  if (dictFundSource.length || dictProgClass.length) {
    let fundSourceWhere = ''
    let dictProgClassWhere = ''

    if (!dictFundSource.length && params.isIncludeEmptyDictFundSourceID) {
      fundSourceWhere = 'AND accDt.dictFundSourceID IS NULL'
    } else if (dictFundSource.length && params.isIncludeEmptyDictFundSourceID) {
      fundSourceWhere = `AND (accDt.dictFundSourceID IS NULL OR accDt.dictFundSourceID in (${dictFundSource.join(',')}))`
    } else if (dictFundSource.length && !params.isIncludeEmptyDictFundSourceID) {
      fundSourceWhere = `AND accDt.dictFundSourceID in (${dictFundSource.join(',')})`
    }

    if (!dictProgClass.length && params.isIncludeEmptyDictProgClassID) {
      dictProgClassWhere = 'AND accDt.dictProgClassID IS NULL'
    } else if (dictProgClass.length && params.isIncludeEmptyDictProgClassID) {
      dictProgClassWhere = `AND (accDt.dictProgClassID IS NULL OR accDt.dictProgClassID in (${dictProgClass.join(',')}))`
    } else if (dictProgClass.length && !params.isIncludeEmptyDictProgClassID) {
      dictProgClassWhere = `AND accDt.dictProgClassID in (${dictProgClass.join(',')})`
    }
    accrualDS.runSQL(`SELECT  ep.positionID as "positionID", en.orgID as "orgID", ep.dictPositionID as "dictPositionID", en.tabNum as "tabNum", emp.fullFIO as "fullFIO", 
    ${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "posName",   
    ${staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name')} as "orgName",
  docRegSickness.seria as "seria", docRegSickness.orderNumber as "orderNumber",
  docRegSickness.ID as "docRegSicknessID",
  (select dictIllReason.code from hr_dictIllnessReason dictIllReason 
where dictIllReason.ID = docRegSickness.dictIllnessReasonID and dictIllReason.mi_deleteDate >= '9999-12-31') as "illReason", 
  acc.orderDateFrom as "orderDateFrom", acc.orderDateTo as "orderDateTo", 
  periodCalc.name as "periodCalcName", periodSal.name as "periodSalName", 
  periodCalc.dateFrom as "periodCalcDateFrom",
  pl.description as "payElDescription",
  pl.ID as "payElID",
  pl.codeSort as "payElCodeSort",
   acc.days as "days", 
  (select dictFundType.code from ac_fundSource dictFundSource 
  inner join ac_dictFundType dictFundType ON dictFundType.ID = dictFundSource.dictFundTypeID and dictFundType.mi_deleteDate >= '9999-12-31'
  where dictFundSource.ID = pl.dictFundSourceID and dictFundSource.mi_deleteDate >= '9999-12-31') as "plFSSU",
  docRegSickness.standingAll as "standingAll", 
  acc.rate as "rate", acc.baseSum as "baseSum", 
  sum(accDt.paySum) as "paySum" 
FROM hr_accrual acc
  INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
  INNER JOIN hr_employee emp ON emp.ID = en.employeeID and emp.mi_deleteDate >= '9999-12-31' 
  INNER JOIN hr_payEl pl ON pl.ID = acc.payElID 
  INNER JOIN hr_method meth on pl.methodID = meth.ID 
  INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID 
  INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = acc.periodCalcID and periodCalc.mi_deleteDate >= '9999-12-31' 
  INNER JOIN hr_dictPeriod periodSal ON periodSal.ID = acc.periodSalaryID and periodSal.mi_deleteDate >= '9999-12-31'   
  LEFT JOIN hr_docRegSickness docRegSickness ON docRegSickness.ID = acc.orderID and docRegSickness.mi_deleteDate >= '9999-12-31' 
  INNER JOIN  hr_employeePosition ep ON ep.isActive = 1 and
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1
 and ep2.dateFrom <= :dateTo:   
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit}) 
 INNER JOIN hr_accrualDt accDt ON accDt.accrualID = acc.ID 
WHERE periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
AND methGr.code = '5' 
AND acc.flagsRec & 8192 != 8192 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
${deptClause}
${orgClause} 
${fundSourceWhere}
${dictProgClassWhere}
GROUP BY  ep.positionID, en.orgID, ep.dictPositionID, en.tabNum, en.tabNumSort, emp.fullFIO, docRegSickness.seria, 
          docRegSickness.orderNumber, docRegSickness.ID, docRegSickness.dictIllnessReasonID, acc.orderDateFrom,acc.orderDateTo, 
          periodCalc.name, periodSal.name, periodCalc.dateFrom, pl.description, pl.ID, pl.codeSort, acc.days, docRegSickness.standingAll, acc.rate, acc.baseSum, pl.dictFundSourceID, acc.ID,acc.dateFrom
ORDER BY emp.fullFIO, en.tabNumSort, acc.orderDateFrom, acc.dateFrom `
    , {
      organizationID: params.organizationID,
      dateTo: periodTo,
      dateFrom: periodFrom,
      departmentID: params.departmentID
    })
  } else {
    accrualDS.runSQL(`SELECT  ep.positionID as "positionID", en.orgID as "orgID", ep.dictPositionID as "dictPositionID", en.tabNum as "tabNum", emp.fullFIO as "fullFIO", 
    ${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "posName",   
    ${staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name')} as "orgName",
  docRegSickness.seria as "seria", docRegSickness.orderNumber as "orderNumber",
  docRegSickness.ID as "docRegSicknessID",
  (select dictIllReason.code from hr_dictIllnessReason dictIllReason 
where dictIllReason.ID = docRegSickness.dictIllnessReasonID and dictIllReason.mi_deleteDate >= '9999-12-31') as "illReason", 
  acc.orderDateFrom as "orderDateFrom", acc.orderDateTo as "orderDateTo", 
  periodCalc.name as "periodCalcName", periodSal.name as "periodSalName", 
  periodCalc.dateFrom as "periodCalcDateFrom",
  pl.description as "payElDescription",
  pl.ID as "payElID",
  pl.codeSort as "payElCodeSort",
   acc.days as "days", 
  (select dictFundType.code from ac_fundSource dictFundSource 
  inner join ac_dictFundType dictFundType ON dictFundType.ID = dictFundSource.dictFundTypeID and dictFundType.mi_deleteDate >= '9999-12-31'
  where dictFundSource.ID = pl.dictFundSourceID and dictFundSource.mi_deleteDate >= '9999-12-31') as "plFSSU",
  docRegSickness.standingAll as "standingAll", 
  acc.rate as "rate", acc.baseSum as "baseSum", 
  acc.paySum as "paySum"  
FROM hr_accrual acc
  INNER JOIN hr_employeeNumber en ON en.ID = acc.employeeNumberID and en.mi_deleteDate >= '9999-12-31' 
  INNER JOIN hr_employee emp ON emp.ID = en.employeeID and emp.mi_deleteDate >= '9999-12-31' 
  INNER JOIN hr_payEl pl ON pl.ID = acc.payElID 
  INNER JOIN hr_method meth on pl.methodID = meth.ID 
  INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID 
  INNER JOIN hr_dictPeriod periodCalc ON periodCalc.ID = acc.periodCalcID and periodCalc.mi_deleteDate >= '9999-12-31' 
  INNER JOIN hr_dictPeriod periodSal ON periodSal.ID = acc.periodSalaryID and periodSal.mi_deleteDate >= '9999-12-31'   
  LEFT JOIN hr_docRegSickness docRegSickness ON docRegSickness.ID = acc.orderID and docRegSickness.mi_deleteDate >= '9999-12-31' 
  INNER JOIN  hr_employeePosition ep ON ep.isActive = 1 and
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1
 and ep2.dateFrom <= :dateTo:   
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit}) 
WHERE periodCalc.dateFrom <= :dateTo: and periodCalc.dateTo >= :dateFrom: 
AND methGr.code = '5' 
AND acc.flagsRec & 8192 != 8192 
${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
${deptClause}
${orgClause} 
ORDER BY emp.fullFIO, en.tabNumSort, acc.orderDateFrom, acc.dateFrom `
    , {
      organizationID: params.organizationID,
      dateTo: periodTo,
      dateFrom: periodFrom,
      departmentID: params.departmentID
    })
  }

  const emps = accrualDS.getAsJsObject()

  emps.forEach(emp => {
    emp.orgDays = emp.plFSSU === '02' ? 0 : emp.days
    emp.fssuDays = emp.plFSSU === '02' ? emp.days : 0
    emp.orderDateFrom = emp.orderDateFrom ? dateService.formatDate(emp.orderDateFrom) : null
    emp.orderDateTo = emp.orderDateTo ? dateService.formatDate(emp.orderDateTo) : null
    emp.seriaNumber = [emp.seria, emp.orderNumber].filter(Boolean).join(' ')

    emp.paySum = emp.paySum ? `${currencyService.round(Number(emp.paySum), 2)}` : Number('0.00')
  })

  let allColumnCount = 18
  let depts = []

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { orgDaysSum: 0, fssuDaysSum: 0, paySum: 0 } }
    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.orgDaysSum = currencyService.round(curNode.calcSum.allSum.orgDaysSum + (el.orgDays || 0), 2)
          curNode.calcSum.allSum.fssuDaysSum = currencyService.round(curNode.calcSum.allSum.fssuDaysSum + (el.fssuDays || 0), 2)
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum + (el.paySum || 0), 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.orgDaysSum = currencyService.round(curNode.calcSum.allSum.orgDaysSum + (cur.calcSum.allSum.orgDaysSum || 0), 2)
        curNode.calcSum.allSum.fssuDaysSum = currencyService.round(curNode.calcSum.allSum.fssuDaysSum + (cur.calcSum.allSum.fssuDaysSum || 0), 2)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum + (cur.calcSum.allSum.paySum || 0), 2)
      })
    }
  }

  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
      }

      depts.push(depart)
    }
    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, orgID)
    })

    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      let depart = {
        emps: [],
        depSum: {
          title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`,
          dsum: {
            orgDaysSum: curNode.calcSum.allSum.orgDaysSum,
            fssuDaysSum: curNode.calcSum.allSum.fssuDaysSum,
            paySum: curNode.calcSum.allSum.paySum
          }
        }
      }
      depts.push(depart)
    }
  }

  function compareEmps (a, b) {
    let aPeriodCalcDateFrom = new Date(a.periodCalcDateFrom)
    let bPeriodCalcDateFrom = new Date(b.periodCalcDateFrom)
    return aPeriodCalcDateFrom === bPeriodCalcDateFrom ? aPeriodCalcDateFrom - bPeriodCalcDateFrom : aPeriodCalcDateFrom - bPeriodCalcDateFrom
  }

  if (params.sorterType === 'STAFF') {
    const staffUnitStore = UB.DataStore('hr_staffUnit')
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
      let empsOrgList = emps.filter(o => o.orgID === org.ID)
      const orgStruct = staffUnitStore.getAsJsObject()
      const orgTree = treeUtils.orgTree(org.ID, empsOrgList, periodTo, orgStruct, true)

      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)

      if (empsOrgList && empsOrgList.length) {
        let payElBlock = {
          emps: [],
          payElBlockTitle: UB.i18n('В тому числі в розрізі видів оплати')
        }
        depts.push(payElBlock)

        let payElColList = []
        empsOrgList.forEach(emp => {
          if (!payElColList.find(el => el.payElID === emp.payElID)) {
            payElColList.push({
              emps: [],
              isPayElBlock: true,
              payElDescription: emp.payElDescription,
              payElID: emp.payElID,
              payElCodeSort: emp.payElCodeSort,
              orgDays: 0,
              fssuDays: 0,
              paySum: 0
            })
          }
          payElColList.find(el => el.payElID === emp.payElID).orgDays += emp.orgDays
          payElColList.find(el => el.payElID === emp.payElID).fssuDays += emp.fssuDays
          payElColList.find(el => el.payElID === emp.payElID).paySum += Number(emp.paySum)
        })
        payElColList.sort((a, b) => {
          return a.codeSort === b.codeSort ? b.codeSort - a.codeSort : a.codeSort - b.codeSort
        })
        payElColList.forEach(el => depts.push(el))
      }
    })
  } else if (params.sorterType === 'PERIODCALC') {
    emps.sort(compareEmps)
    let depart = {
      emps: emps,
      isOrg: false
    }
    depts.push(depart)

    depart = {
      emps: [],
      depSum: {
        title: `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`,
        dsum: {
          orgDaysSum: 0,
          fssuDaysSum: 0,
          paySum: 0
        }
      }
    }
    emps.forEach(emp => {
      depart.depSum.dsum.orgDaysSum = currencyService.round(depart.depSum.dsum.orgDaysSum + (emp.orgDays || 0), 2)
      depart.depSum.dsum.fssuDaysSum = currencyService.round(depart.depSum.dsum.fssuDaysSum + (emp.fssuDays || 0), 2)
      depart.depSum.dsum.paySum = currencyService.round(depart.depSum.dsum.paySum + (Number(emp.paySum) || 0), 2)
    })
    depts.push(depart)

    if (emps && emps.length) {
      let payElBlock = {
        emps: [],
        payElBlockTitle: UB.i18n('В тому числі в розрізі видів оплати')
      }
      depts.push(payElBlock)

      let payElColList = []
      let payElSum = {
        isPayElSum: true,
        emps: [],
        title: UB.i18n('Всього'),
        orgDaysSum: 0,
        fssuDaysSum: 0,
        paySum: 0
      }
      emps.forEach(emp => {
        if (!payElColList.find(el => el.payElID === emp.payElID)) {
          payElColList.push({
            emps: [],
            isPayElBlock: true,
            payElDescription: emp.payElDescription,
            payElID: emp.payElID,
            payElCodeSort: emp.payElCodeSort,
            orgDays: 0,
            fssuDays: 0,
            paySum: 0
          })
        }
        payElColList.find(el => el.payElID === emp.payElID).orgDays += emp.orgDays
        payElColList.find(el => el.payElID === emp.payElID).fssuDays += emp.fssuDays
        payElColList.find(el => el.payElID === emp.payElID).paySum += Number(emp.paySum)
      })
      payElColList.sort((a, b) => {
        return a.codeSort === b.codeSort ? b.codeSort - a.codeSort : a.codeSort - b.codeSort
      })
      payElColList.forEach(el => {
        payElSum.orgDaysSum += el.orgDays
        payElSum.fssuDaysSum += el.fssuDays
        payElSum.paySum += el.paySum
        depts.push(el)
      })
      depts.push(payElSum)
    }
  }

  let number = 1
  depts.forEach(dep => {
    if (dep && dep.emps) dep.emps.forEach(emp => { emp.num = number++ })
  })

  return {
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `,
    strPeriodName,
    isDep: params.departmentID ? { depName } : null,
    depts,
    allColumnCount
  }
}

function getAlimentData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  let extendedFieldList = params.extendedFieldList ? JSON.parse(params.extendedFieldList) : null
  let gridData = params.gridData ? JSON.parse(params.gridData) : []
  let filtersItems = params.filtersItems ? JSON.parse(params.filtersItems) : []
  let sortersItems = params.sortersItems ? JSON.parse(params.sortersItems) : []
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

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

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
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

  const accrualDt = UB.Repository('hr_accrualDt')
    .attrs(['ID', 'accrualID', 'paySum', 'dictFundSourceID', 'dictFundSourceID.name'])
    .where('accrualID', 'in', gridData.map(o => o.accrualID))
    .orderBy('accrualID')
    .selectAsObject()

  let dictFundSourceList = []
  accrualDt.forEach(el => {
    if (!dictFundSourceList.find(o => o.dictFundSourceID === el.dictFundSourceID)) {
      dictFundSourceList.push({
        dictFundSourceID: el.dictFundSourceID,
        dictFundSourceName: el['dictFundSourceID.name'] || 'Без джерела фінансування'
      })
    }
  })
  if (!dictFundSourceList.length) {
    dictFundSourceList.push({
      dictFundSourceID: null,
      dictFundSourceName: 'Без джерела фінансування'
    })
  }

  let fundSourceColCount = (params.includeFundSourceBlock ? dictFundSourceList.length : 0)
  let fundSourceColWidth = fundSourceColCount * 100
  let allColumnCount = 16 + fundSourceColCount
  let sheetWidth = 1540 + fundSourceColWidth

  function compareEmps (a, b) {
    return a.tabNumSort === b.tabNumSort ? b.tabNumSort - a.tabNumSort : a.tabNumSort - b.tabNumSort
  }

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { incomingDebtSum: 0, calculatedSum: 0, paySum: 0, debt: 0, fundSumList: [] }
    }
    dictFundSourceList.forEach(el => curNode.calcSum.allSum.fundSumList.push({ fundSum: 0 }))

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.incomingDebtSum = currencyService.round(curNode.calcSum.allSum.incomingDebtSum += el.incomingDebtSum || 0, 2)
          curNode.calcSum.allSum.calculatedSum = currencyService.round(curNode.calcSum.allSum.calculatedSum += el.calculatedSum || 0, 2)
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
          curNode.calcSum.allSum.debt = currencyService.round(curNode.calcSum.allSum.debt += el.debt || 0, 2)

          let idx = 0
          curNode.calcSum.allSum.fundSumList = curNode.calcSum.allSum.fundSumList.map(o => {
            o.fundSum = currencyService.round(o.fundSum += el.dictFundList[idx].paySumFund || 0, 2)
            idx++
            return o
          })
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)

        curNode.calcSum.allSum.incomingDebtSum = currencyService.round(curNode.calcSum.allSum.incomingDebtSum += cur.calcSum.allSum.incomingDebtSum || 0, 2)
        curNode.calcSum.allSum.calculatedSum = currencyService.round(curNode.calcSum.allSum.calculatedSum += cur.calcSum.allSum.calculatedSum || 0, 2)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
        curNode.calcSum.allSum.debt = currencyService.round(curNode.calcSum.allSum.debt += cur.calcSum.allSum.debt || 0, 2)

        let idx = 0
        curNode.calcSum.allSum.fundSumList = curNode.calcSum.allSum.fundSumList.map(o => {
          o.fundSum = currencyService.round(o.fundSum += cur.calcSum.allSum.fundSumList[idx].fundSum || 0, 2)
          idx++
          return o
        })
      })
    }
  }
  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
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
      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  const allSum = {
    incomingDebtSum: 0,
    calculatedSum: 0,
    paySum: 0,
    debt: 0
  }
  const notes = []
  let sorter
  let depts = []

  filtersItems.forEach(filt => {
    const curFilter = extendedFieldList.find(el => el.name === filt.property)
    notes.push({ filterName: `${curFilter.description}:`, value: filt.value })
  })

  // round and num
  gridData.forEach((item, i) => {
    item.incomingDebtSum = item.incomingDebtSum ? currencyService.round(item.incomingDebtSum, 2) : 0
    item.calculatedSum = item.calculatedSum ? currencyService.round(item.calculatedSum, 2) : 0
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    item.debt = item.debt ? currencyService.round(item.debt, 2) : 0

    // const sumsArr = ['incomingDebtSum', 'calculatedSum', 'paySum', 'debt']
    allSum.incomingDebtSum = currencyService.round(allSum.incomingDebtSum += item.incomingDebtSum, 2)
    allSum.calculatedSum = currencyService.round(allSum.calculatedSum += item.calculatedSum, 2)
    allSum.paySum = currencyService.round(allSum.paySum += item.paySum, 2)
    allSum.debt = currencyService.round(allSum.debt += item.debt, 2)

    item.dictFundList = []
    let accrualDtRow = accrualDt.filter(o => o.accrualID === item.accrualID)
    item.includeFundSourceBlock = params.includeFundSourceBlock
    dictFundSourceList.forEach(el => {
      let paySumFund = accrualDtRow.find(o => o.dictFundSourceID === el.dictFundSourceID) ? accrualDtRow.find(o => o.dictFundSourceID === el.dictFundSourceID).paySum : 0
      item.dictFundList.push({ paySumFund: currencyService.round(paySumFund, 2) })
    })
  })

  if (sortersItems[0]) sorter = sortersItems[0].property

  orgNames.forEach(org => {
    if (gridData.filter(o => o.orgID === org.ID).length) {
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
      const orgTree = treeUtils.orgTree(org.ID, gridData.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)

      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
      depts.forEach(dep => {
        if (dep && dep.emps) dep.emps.sort(compareEmps)
      })
    }
  })

  staffUnitStore.freeNative()

  let num = 0
  depts.forEach((item) => { item.emps.forEach((emp) => { emp.num = num + 1; num++ }) })

  return {
    period: periodName,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `,
    department: depName,
    allSum,
    notes,
    sorter,
    depts,
    allColumnCount,
    fundSourceColCount,
    sheetWidth,
    dictFundSourceList,
    includeFundSourceBlock: params.includeFundSourceBlock
  }
}

function getBonusData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  let extendedFieldList = params.extendedFieldList ? JSON.parse(params.extendedFieldList) : null
  let gridData = params.gridData ? JSON.parse(params.gridData) : []
  let filtersItems = params.filtersItems ? JSON.parse(params.filtersItems) : []
  let sortersItems = params.sortersItems ? JSON.parse(params.sortersItems) : []
  const sqlDialect = entityBaseService.getSQLDialect()

  let hrOrg = reportService.getHrOrg(params.orgID, params.periodTo)

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

  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
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

  function compareEmps (a, b) {
    return a.tabNumSort === b.tabNumSort ? b.tabNumSort - a.tabNumSort : a.tabNumSort - b.tabNumSort
  }

  function orgTreeCalcDepSum (curNode) {
    curNode.calcSum = {
      allSum: { paySum: 0 }
    }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += el.paySum || 0, 2)
        })
      }
      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur)
        curNode.calcSum.allSum.paySum = currencyService.round(curNode.calcSum.allSum.paySum += cur.calcSum.allSum.paySum || 0, 2)
      })
    }
  }

  function orgTreeDataToReport (curNode, depts, orgID, level = 1) {
    if (curNode.isNotEmpty) {
      let depart = {
        emps: curNode.emps,
        isGroupDep: true,
        isOrg: false
      }
      if (curNode.name) {
        depart.dept = { colCount: allColumnCount, deptName: curNode.name }
      }
      depts.push(depart)
    }

    curNode.childs.forEach(ep => {
      orgTreeDataToReport(ep, depts, orgID)
    })

    if ((curNode.isNotEmpty && curNode.name) || curNode.mi_data_id === orgID) {
      let depart = {
        emps: [],
        isGroupDep: true,
        depSum: { title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`, dsum: [] }
      }

      depart.depSum.dsum = curNode.calcSum.allSum
      depts.push(depart)
    }
  }

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  const allSum = { paySum: 0 }
  const notes = []
  let sorter

  filtersItems.forEach(filt => {
    const curFilter = extendedFieldList.find(el => el.name === filt.property)
    notes.push({ filterName: `${curFilter.description}:`, value: filt.value })
  })

  gridData.forEach((item, i) => {
    item.paySum = item.paySum ? currencyService.round(item.paySum, 2) : 0
    allSum.paySum = currencyService.round(allSum.paySum += item.paySum, 2)
  })

  if (sortersItems[0]) sorter = sortersItems[0].property

  function showDataByPayEl (data) {
    if (!data || !data.length) return
    let gridDataByPayEl = [...data]
    gridDataByPayEl.sort((a, b) => (a.payElCode > b.payElCode) ? 1 : -1)
    gridDataByPayEl = _.groupBy(gridDataByPayEl, 'payElID')
    depts.push({ payElSum: { title: UB.i18n('У тому числі в розрізі видів оплати:'), isTitle: true } })
    _.forEach(gridDataByPayEl, items => {
      depts.push({ payElSum: { title: items[0].payElName, dsum: { days: items.reduce((res, item) => res + item.days || 0, 0), paySum: items.reduce((res, item) => res + item.paySum || 0, 0) } } })
    })
  }

  let depts = []

  let allColumnCount = 12
  orgNames.forEach(org => {
    if (gridData.filter(o => o.orgID === org.ID).length) {
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
      const orgTree = treeUtils.orgTree(org.ID, gridData.filter(o => o.orgID === org.ID), params.periodTo, orgStruct, true)

      orgTreeCalcDepSum(orgTree[0])
      orgTreeDataToReport(orgTree[0], depts, org.ID)
      depts.forEach(dep => {
        if (dep && dep.emps) dep.emps.sort(compareEmps)
      })
      showDataByPayEl(gridData)
    }
  })

  let number = 1
  depts.forEach(dep => {
    if (dep && dep.emps) dep.emps.forEach(emp => { emp.num = number++ })
  })

  return {
    period: periodName,
    department: depName,
    allSum,
    notes,
    sorter,
    depts,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `
  }
}

function getControlCalcVacReserveData (params) {
  params.periodFrom = dateService.shiftDate(params.periodFromDateFrom)
  params.periodTo = dateService.shiftDate(params.periodToDateTo)
  const sqlDialect = entityBaseService.getSQLDialect()
  let hrOrg = reportService.getHrOrg(params.organizationID, params.periodTo)
  const checkPosDepChange = params.checkPosDepChange
  const showZeroSumRows = params.showZeroSumRows
  const groupReportByDep = params.groupReportByDep

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

  const periodIds = UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', 'in', orgIDs)
    .where('dateFrom', '>=', params.periodFrom)
    .where('dateTo', '<=', params.periodTo)
    .selectAsArrayOfValues()

  const periodList = UB.Repository('hr_dictPeriod')
    .attrs('ID', 'pYear', 'dictMonthID.code', 'name', 'dateFrom', 'dateTo')
    .where('ID', 'in', periodIds)
    .orderBy('dateFrom')
    .selectAsObject({
      'dictMonthID.code': 'pMonth'
    })
  let periodName
  if (params.periodTo.getFullYear() === params.periodFrom.getFullYear() && params.periodFrom.getMonth() === params.periodTo.getMonth()) {
    periodName = `за ${params.periodFromRaw} року`
  } else if (params.periodFrom.getMonth() === 0 && params.periodTo.getMonth() === 11 && params.periodTo.getFullYear() === params.periodFrom.getFullYear()) {
    periodName = `за ${params.periodTo.getFullYear()} рік`
  } else {
    periodName = `за період з ${params.periodFromRaw} року по ${params.periodToRaw} року`
  }

  const calcPeriods = []
  periodList.forEach(p => {
    p.dateFrom = dateService.shiftDate(p.dateFrom)
    p.dateTo = dateService.shiftDate(p.dateTo)
    const el = calcPeriods.find(o => o.dateFrom.getTime() === p.dateFrom.getTime())
    if (!el) {
      calcPeriods.push({
        pYear: p.pYear,
        pMonth: p.pMonth,
        name: p.name,
        dateFrom: p.dateFrom,
        dateTo: p.dateTo
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
  const parentOrdID = settingsService.getByCode('hrUseReportSettingsParentOrg', params.orgID)
  idParamStore.runSQL(`  SELECT ip.ID as "ipID", pl.ID as "payElID", pl.description as "description", lp.code as "lpMethodCode"
    FROM hr_idParam ip 
    INNER JOIN hr_listParam lp ON lp.ID = ip.listParamID and lp.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_payEl pl ON pl.ID = ip.valuesID and pl.mi_deleteDate >= '9999-12-31'    
    INNER JOIN hr_method mtd ON mtd.ID = pl.methodID  
    WHERE      
      ip.mi_deleteDate >= '9999-12-31' 
      and ip.orgID = :orgID: 
      and mtd.code = '201'
      ORDER BY ip.orderN
  `, {
    orgID: Number(parentOrdID || params.orgID)
  })
  let payEls = idParamStore.getAsJsObject()
  if (payEls.filter(row => row.lpMethodCode === 'ReportRezerv').length) {
    payEls = payEls.filter(row => row.lpMethodCode === 'ReportRezerv')
  }
  idParamStore.freeNative()

  let accrual = UB.Repository('hr_accrual')
    .attrs(['*', 'periodSalaryID.name', 'periodCalcID.name'])
    .where('orgID', 'in', orgIDs)
    .where('payElID', 'in', payEls.map(o => o.payElID))
    .where('periodCalc', '>=', dateService.shiftDate(params.periodFrom))
    .where('periodCalc', '<=', dateService.shiftDate(params.periodTo))
    .where(`(flagsRec & 4096 = 0)`, 'custom')
    .selectAsObject({
      'periodSalaryID.name': 'periodSalaryName',
      'periodCalcID.name': 'periodCalcName'
    })

  let accrualFund = UB.Repository('hr_accrualFundDt')
    .attrs([ 'sum([paySum])', 'accrualFundID.employeeNumberID', 'accrualFundID.rate', 'accrualFundID.periodSalaryID' ])
    .where('accrualFundID.employeeNumberID', 'in', accrual.map(o => o.employeeNumberID))
    .where('accrualFundID.periodSalaryID.dateTo', '>=', dateService.shiftDate(params.periodFrom))
    .where('accrualFundID.periodSalaryID.dateFrom', '<=', dateService.shiftDate(params.periodTo))
    .where('accrualFundID.payFundID.isRecSum', '=', 1)
    .where('payElID', 'in', payEls.map(o => o.payElID))
    .groupBy(['accrualFundID.periodSalaryID', 'accrualFundID.employeeNumberID', 'accrualFundID.rate'])
    .selectAsObject({
      'sum([paySum])': 'paySumECV',
      'accrualFundID.employeeNumberID': 'employeeNumberID',
      'accrualFundID.rate': 'rateECV',
      'accrualFundID.periodSalaryID': 'periodSalaryID'
    })

  let empNumberDS = UB.DataStore('hr_employeeNumber')

  let deptClause = staffService.getDepartmentClause(params.departmentID, params.includeSubDep, ':dateTo:')

  let emps = []

  if (!checkPosDepChange) {
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
      ,(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}) as "selfStructDepName"
      ,${staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name')} as "orgName"
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
    tmpEmps.forEach(emp => {
      calcPeriods.forEach(item => {
        const newEmp = Object.assign({}, emp)
        newEmp.periodCalc = dateService.shiftDate(item.dateFrom)
        newEmp.periodName = item.name
        emps.push(newEmp)
      })
    })
  } else {
    calcPeriods.forEach(item => {
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
      ,(SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = ep.organizationID and d.parentUnitID = ep.organizationID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}) as "selfStructDepName"
      ,${staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name')} as "orgName"
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
      AND en.mi_deleteDate >= '9999-12-31' 
      ${deptClause} 
      ORDER BY en.description`
      , {
        orgIDs,
        deptIDs,
        dateTo: item.dateTo,
        dateFrom: item.dateFrom,
        departmentID: params.departmentID
      })

      let tmpEmps = empNumberDS.getAsJsObject()
      tmpEmps.forEach(emp => {
        const newEmp = JSON.parse(JSON.stringify(emp))
        newEmp.periodCalc = dateService.shiftDate(item.dateFrom)
        newEmp.periodName = item.name
        emps.push(newEmp)
      })
    })
  }

  const summary = {
    koef: 0,
    paySum: 0,
    paySumECV: 0
  }

  let bazeColumnCount = 15
  let allColumnCount = bazeColumnCount + params.extraColumns.length
  let sheetSize = 30 + 30 + 820 + (120 * 7) + (125 * params.extraColumns.length)

  function compareEmps (a, b) {
    return a.posIdxNum === b.posIdxNum
      ? (a['fullFIO'] === b['fullFIO']
        ? (a.tabNumSort === b.tabNumSort
          ? (a['periodCalcSort'] === b['periodCalcSort'] ? a['periodSalarySort'] - b['periodSalarySort'] : a['periodCalcSort'] - b['periodCalcSort'])
          : a.tabNumSort - b.tabNumSort)
        : stringService.compareStringUa(a['fullFIO'], b['fullFIO']))
      : a.posIdxNum - b.posIdxNum
  }

  emps = emps.map(emp => {
    let accrualData = accrual.find(el => el.employeeNumberID === emp.employeeNumberID && dateService.shiftDate(el.periodCalc).getTime() === dateService.shiftDate(emp.periodCalc).getTime())

    if (accrualData) {
      emp = Object.assign({}, emp, accrualData)
      summary.koef += emp.koef
      summary.paySum += Number(emp.paySum)
      let accrualFundData = accrualFund.find(el => el.employeeNumberID === emp.employeeNumberID && el.periodSalaryID === accrualData.periodSalaryID)
      if (accrualFundData) {
        emp.rateECV = accrualFundData.rateECV
        emp.paySumECV = accrualFundData.paySumECV
        summary.paySumECV += emp.paySumECV
      }
    } else {
      emp.paySumAccrual = 0
      emp.calendarDays = 0
      emp.baseSum = 0
      emp.paySum = 0
      emp.periodCalcName = emp.periodName
      emp.isZeroAccrual = true
      emp.rateECV = 0
      emp.paySumECV = 0
    }

    emp.birthDate = dateService.formatDate(emp.birthDate)
    emp.startWork = dateService.formatDate(emp.startWork)
    emp.endWork = dateService.isMaxDate(emp.endWork) ? '' : dateService.formatDate(emp.endWork)

    return emp
  })

  if (!showZeroSumRows) {
    emps = emps.filter(row => !(row.isZeroAccrual))
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

        depSum: {
          isExtraColumnExist: params.extraColumns.length > 0,
          extraColumnCount: params.extraColumns.length,
          title: curNode.name + `&nbsp;&nbsp;&nbsp;${UB.i18n('Всього')}`,
          koef: curNode.calcSum.koef,
          paySum: curNode.calcSum.paySum,
          paySumECV: curNode.calcSum.paySumECV
        }
      }
      depts.push(depart)
    }
  }

  function orgTreeCalcDepSum (curNode, payElCount = 0) {
    curNode.calcSum = { koef: 0, paySum: 0, paySumECV: 0 }

    if (curNode.isNotEmpty) {
      if (curNode.emps && curNode.emps.length > 0) {
        curNode.emps.forEach(el => {
          curNode.calcSum.koef = currencyService.round(curNode.calcSum.koef + (el.koef || 0), 2)
          curNode.calcSum.paySum = currencyService.round(curNode.calcSum.paySum + (el.paySum || 0), 2)
          curNode.calcSum.paySumECV = currencyService.round(curNode.calcSum.paySumECV + (el.paySumECV || 0), 2)
        })
      }

      curNode.childs.forEach(cur => {
        orgTreeCalcDepSum(cur, payElCount)
        curNode.calcSum.koef = currencyService.round(curNode.calcSum.koef + (cur.calcSum.koef || 0), 2)
        curNode.calcSum.paySum = currencyService.round(curNode.calcSum.paySum + (cur.calcSum.paySum || 0), 2)
        curNode.calcSum.paySumECV = currencyService.round(curNode.calcSum.paySumECV + (cur.calcSum.paySumECV || 0), 2)
      })
    }
  }

  let allSum = {}
  let depts = []

  const staffUnitStore = UB.DataStore('hr_staffUnit')
  if (groupReportByDep) {
    orgNames.forEach(org => {
      if (emps.filter(o => o.orgID === org.ID).length) {
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
        orgTreeCalcDepSum(orgTree[0], params.extraColumns.length)
        orgTreeDataToReport(orgTree[0], depts, params.groupReportByDep, org.ID)
        allSum = {}
        depts.forEach(dep => {
          if (dep && dep.emps) dep.emps.sort(compareEmps)
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

  let num = 1
  depts.forEach(dep => {
    dep.emps = dep.emps.map(o => {
      o.num = num++
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
    sheetSize,
    allColumnCount,
    showOnlySummary: !groupReportByDep,
    extraColumnCount: params.extraColumns.length,
    isExtraColumnExist: params.extraColumns.length > 0,
    orgName: `${hrOrg.name} ${params.includeSubOrg ? '(з підлеглими)' : ''} `,
    periodName,
    isDep: params.departmentID ? { depName } : null,
    depts,
    summary
  }
}
