const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const App = UB.App
const path = require('path')
const xlsxService = require('../AC/modules/documentBuilder/xlsxService')
const dateService = require('../AC/modules/dataServices/dateService')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const typicalOrgPlanByPayPrint = require('./modules/printForm/typicalOrgPlanByPayPrint')
const typicalOrgPlanByPayGrpPrint = require('./modules/printForm/typicalOrgPlanByPayGrpPrint')
const typicalOrgPlanByPayTariffingPrint = require('./modules/printForm/typicalOrgPlanByPayTrfPrint')
const tariffingPrint = require('./modules/printForm/tariffingPrint')
const reportService = require('../HR/modules/reportService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const accrualService = require('../HR/modules/accrualService')
const staffService = require('../HR/modules//staffService')
const _ = require('lodash')

me.entity.addMethod('generateXlsx')
me.entity.addMethod('getRespPosition')
me.entity.addMethod('runTypicalOrgPlanByPay')
me.entity.addMethod('runTariffing')
me.entity.addMethod('runTypicalOrgPlanByPayGrp')
me.entity.addMethod('runTypicalOrgPlanByPayTariffing')
me.entity.addMethod('getListEmpCount')
me.entity.addMethod('getAvgListEmpCount')
me.entity.addMethod('getAvgListEmpCountOnDate')
me.entity.addMethod('getAvgListEmpCountFull')
me.entity.addMethod('getAvgListEmpCountFullEnergo')
me.entity.addMethod('getAverageSalaryReport')
me.entity.addMethod('getImportData')
me.entity.addMethod('getListControlAppointment')
me.entity.addMethod('getListControlDictPosition')
me.entity.addMethod('fundingSourceSearch')
me.entity.addMethod('getListDictPositionSearch')
me.entity.addMethod('getListFixedVacationDaysSearch')
me.entity.addMethod('getListEmployeePositionSearch')
me.entity.addMethod('getListExtraRankAssignments')

me.generateXlsx = function (ctx) {
  let mParams = ctx.mParams
  let fileName = mParams.fileName
  if (!(fileName.endsWith('.xlsx') || fileName.endsWith('.xlst'))) {
    fileName += '.xlsx'
  }
  const configDir = process.configPath
  const templatePath = path.join(configDir, App.domainInfo.models.HR.path, 'modules', 'template', fileName)
  let params = JSON.parse(mParams.params)

  const result = xlsxService.generateXlsxDocument(templatePath, params)
  mParams.content = JSON.stringify(result)
}

me.getRespPosition = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const onDate = dateService.shiftDate(params.onDate)
  const resultData = {}

  params.respPositions.forEach(respName => {
    resultData[respName] = {}
  })

  const orgRespPosition = UB.Repository('hr_orgRespPosition')
    .where('[organizationID]', '=', params.organizationID)
    .where('[dateFrom]', '<=', onDate)
    .where('[dateTo]', '>=', onDate, 'dt1')
    .where('[dateTo]', 'isNull', undefined, 'dt2')
    .where('respPosition', 'in', params.respPositions) // ['mainChief', 'accChief'])
    .logic('([dt1] OR [dt2])')
    .attrs(['respPosition', 'positionID'])
    .misc({ __mip_recordhistory_all: true })
    .limit(1)
    .selectAsObject()
  orgRespPosition.forEach(resp => {
    const pos = UB.Repository('hr_employeePositionS')
      .attrs(['posName', 'employeeID', 'ID', 'employeeNumberID'])
      .where('[organizationID]', '=', params.organizationID)
      .where('[dateFrom]', '<=', onDate)
      .where('[positionID]', '=', resp.positionID)
      .orderByDesc('dateTo')
      .misc({ __mip_recordhistory_all: true })
      .limit(1)
      .selectSingle()
    const dataEx = UB.Repository('hr_dictTempExecution')
      .attrs(['employeePositionID', 'employeePositionID.employeeNumberID'])
      .where('employeePositionTempID', '=', pos ? pos.ID : 0, 'w1')
      .where('employeePositionTempID.employeeID', '=', pos ? pos.employeeID : 0, 'w2')
      .where('employeePositionTempID.positionID', '=', resp.positionID, 'w3')
      .where('positionTempID', '=', resp.positionID, 'wp')
      .logic('(([w1] OR ([w2] and [w3])) OR [wp])')
      .where('organizationID', '=', params.organizationID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .orderBy('numQueue')
      .limit(1)
      .selectSingle()

    resultData[resp.respPosition].positionID = resp.positionID
    resultData[resp.respPosition].employeePositionID = dataEx ? dataEx.employeePositionID : (pos ? pos.ID : null)
    resultData[resp.respPosition].employeeNumberID = dataEx ? dataEx['employeePositionID.employeeNumberID'] : (pos ? pos.employeeNumberID : null)
  })
  mParams.resultData = JSON.stringify(resultData)
}

me.runTypicalOrgPlanByPay = function (ctx) {
  const requestParams = ctx.mParams
  const result = typicalOrgPlanByPayPrint.getXlsx(JSON.parse(requestParams.params))
  requestParams.resp = JSON.stringify(generateBase64Str(result))
}

me.runTariffing = function (ctx) {
  const requestParams = ctx.mParams
  const result = tariffingPrint.getXlsx(JSON.parse(requestParams.params))
  requestParams.resp = JSON.stringify(generateBase64Str(result))
}

me.runTypicalOrgPlanByPayGrp = function (ctx) {
  const requestParams = ctx.mParams
  const result = typicalOrgPlanByPayGrpPrint.getXlsx(JSON.parse(requestParams.params))
  requestParams.resp = JSON.stringify(generateBase64Str(result))
}

me.runTypicalOrgPlanByPayTariffing = function (ctx) {
  const requestParams = ctx.mParams
  const result = typicalOrgPlanByPayTariffingPrint.getXlsx(JSON.parse(requestParams.params))
  requestParams.resp = JSON.stringify(generateBase64Str(result))
}
me.getListEmpCount = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.onDate = dateService.shiftDate(params.onDate)
  const result = reportService.getListEmpCount(params)

  mParams.resultData = JSON.stringify(result)
}

me.getAvgListEmpCount = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.dateFrom = dateService.shiftDate(params.dateFrom)
  params.dateTo = dateService.shiftDate(params.dateTo)
  const result = reportService.getAvgListEmpCount(params)

  mParams.resultData = JSON.stringify(result)
}

me.getAvgListEmpCountOnDate = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.onDate = dateService.shiftDate(params.onDate)
  const result = reportService.getAvgListEmpCountOnDate(params)

  mParams.resultData = JSON.stringify(result)
}

me.getAvgListEmpCountFull = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.dateFrom = dateService.shiftDate(params.dateFrom)
  params.dateTo = dateService.shiftDate(params.dateTo)
  const result = reportService.getAvgListEmpCountFull(params)

  mParams.resultData = JSON.stringify(result)
}

me.getAvgListEmpCountFullEnergo = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.dateFrom = dateService.shiftDate(params.dateFrom)
  params.dateTo = dateService.shiftDate(params.dateTo)
  const result = reportService.getAvgListEmpCountFullEnergo(params)

  mParams.resultData = JSON.stringify(result)
}

me.getAverageSalaryReport = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const dec = 3

  const organizationID = execParams.organizationID || 0
  const departmentID = execParams.departmentID || 0
  const onDate = execParams.onDate || dateService.currentDate()
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)

  const orgs = UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'nameDat', 'nameGen', 'name'])
    .whereIf(execParams.includeChildOrgs, 'mi_treePath', 'like', `/${organizationID}/`)
    .whereIf(!execParams.includeChildOrgs, 'mi_data_id', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('mi_treePath')
    .selectAsObject()

  const orgName = orgs.find(o => o['mi_data_id'] === organizationID)

  const repParams = UB.Repository('hr_repSetParam')
    .attrs(['ID', 'code', 'name'])
    .where('code', 'startWith', 'AS')
    .selectAsObject()

  const columns = [
    { value: 7, name: 'AS_col7', total: 0 },
    { value: 12, name: 'AS_col12', total: 0 },
    { value: 17, name: 'AS_col17', total: 0 },
    { value: 22, name: 'AS_col22', total: 0 },
    { value: 27, name: 'AS_col27', total: 0 },
    { value: 32, name: 'AS_col32', total: 0 },
    { value: 33, name: 'AS_col33', total: 0 }
  ]

  const colValues = UB.Repository('hr_repSetElement')
    .attrs(['ID', 'accountID', 'accountID.code', 'repSetParamID'])
    .where('repSetParamID.code', 'in', columns.map(el => el.name))
    .selectAsObject()

  columns.forEach(item => {
    item.repParams = repParams.find(o => o.code === item.name)
    item.title = item.repParams ? item['repParams'].name || '' : ''
  })

  const rowValues = UB.Repository('hr_repSetElement')
    .attrs(['ID', 'dictPositionGroupID', 'dictPositionGroupID.code', 'repSetParamID.code', 'dictCostPlaceTypeID'])
    .where('repSetParamID.code', 'startWith', 'AS')
    .selectAsObject()

  const prodCostIDs = rowValues.filter(o => o['repSetParamID.code'] === 'AS_prodCost').map(o => o.dictCostPlaceTypeID)
  const admCostIDs = rowValues.filter(o => o['repSetParamID.code'] === 'AS_admCost').map(o => o.dictCostPlaceTypeID)

  const result = {
    dataAvg: [],
    dataFop: [],
    departmentName: null,
    dateFrom: dateService.formatDate(dateFrom),
    dateTo: dateService.formatDate(dateTo),
    organizationName: orgName && (orgName.nameGen || orgName.name),
    column5Name: execParams.typeReportName,
    title: execParams.typeReport === 'type1' ? UB.i18n(`ДОВІДКА ПРО СЕРЕДНЬООБЛІКОВУ ЧИСЕЛЬНІСТЬ ТА СЕРЕДНЮ ЗАРОБІТНЮ ПЛАТУ`)
      : UB.i18n(`ДОВІДКА ПРО СЕРЕДНЮ КІЛЬКІСТЬ ТА СЕРЕДНЮ ЗАРОБІТНЮ ПЛАТУ`)
  }

  columns.forEach(item => {
    result[`column${item.value}id`] = (repParams.find(o => o.code === `AS_col${item.value}`) || { ID: null }).ID
    result[`column${item.value}Name`] = item.title
    result[`column${item.value}code`] = item.name
  })
  let departments = []
  if (departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath', 'orgID'])
      .where('mi_data_id', '=', departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_recordhistory_all: true })
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()
    const departmentName = dept ? (dept.description || dept.fullName) : ''
    result.departmentName = dept && execParams.includeChildDepts ? UB.i18n(`{0} (з підлеглими)`, departmentName) : departmentName
    departments = [departmentID]
    if (dept && execParams.includeChildDepts) {
      departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', dept.orgID)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateFrom)
        .where('mi_treePath', 'startsWith', dept['mi_treePath'])
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
        .map(o => o['mi_data_id'])
        .concat([departmentID])
    }
  }

  const sqlDialect = entityBaseService.getSQLDialect()
  const store = UB.DataStore('hr_employeePosition')

  const avgEmpList = []
  const empDataAll = []

  orgs.forEach(org => {
    const orgID = org['mi_data_id']
    const avgListEmpCount = execParams.typeReport === 'type2'
      ? reportService.getAvgListEmpCount({
        orgID: orgID,
        dateFrom,
        dateTo,
        workPlace: ['1', '3'],
        withCPH: true,
        departmentID: departmentID || null,
        includeChildDepts: execParams.includeChildDepts
      })
      : reportService.getAvgListEmpCount({
        orgID: orgID,
        dateFrom,
        dateTo,
        departmentID: departmentID || null,
        includeChildDepts: execParams.includeChildDepts
      })

    Object.keys(avgListEmpCount.employeeNumbers).forEach(empID => {
      avgEmpList[empID] = Object.assign({}, avgListEmpCount.employeeNumbers[empID])
    })

    store.runSQL(`
      SELECT employeeNumberID as "employeeNumberID",
        positionID as "positionID"
      FROM hr_employeePosition ep
      WHERE ep.organizationID = :orgID: 
        AND ep.isActive = 1
        AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where ep2.employeeNumberID = ep.employeeNumberID 
          and ep2.isActive = 1 and ep2.mi_deleteDate >= '9999-12-31' ${departmentID ? 'AND ep.departmentID = ep2.departmentID' : ''} 
          order by ep2.dateFrom desc ${sqlDialect.limit})
        AND ep.mi_deleteDate >= '9999-12-31'
        ${departmentID ? 'AND departmentID' + entityBaseService.getInExpression('departments') : ''}
    `, {
      orgID: orgID,
      dateFrom,
      dateTo,
      departments
    })
    const empData = store.getAsJsObject()

    const posData = UB.Repository('hr_position')
      .attrs('mi_data_id', 'dictPositionGroupID', 'dictPositionGroupID.code', 'dictCostTypeID')
      .where('state', '=', 'ACTIVE')
      .where('orgID', '=', orgID)
      .misc({ __mip_ondate: dateTo })
      .selectAsObject()

    const dictCostTypeData = UB.Repository('ac_dictCostType')
      .attrs(['ID', 'code', 'name', 'accountID', 'accountID.code', 'dictCostPlaceTypeID'])
      .selectAsObject()

    let pos
    empData.forEach(emp => {
      pos = posData.find(o => o['mi_data_id'] === emp.positionID)
      if (!pos && emp.positionID) {
        pos = UB.Repository('hr_position')
          .attrs('mi_data_id', 'dictPositionGroupID', 'dictPositionGroupID.code', 'dictCostTypeID')
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', orgID)
          .where('[mi_dateTo] = [mi_maxDateTo]', 'custom')
          .where('mi_data_id', '=', emp.positionID)
          .misc({ __mip_recordhistory_all: true })
          .selectSingle()
        if (pos) {
          posData.push(Object.assign({}, pos))
        }
      }
      const dictCostType = pos ? dictCostTypeData.find(o => o.ID === pos.dictCostTypeID) : null
      emp.dictPositionGroup = pos ? (pos['dictPositionGroupID.code'] || '').trim() : ''
      emp.dictCostPlaceTypeID = dictCostType ? dictCostType.dictCostPlaceTypeID : null
      emp.accountCode = dictCostType ? (dictCostType['accountID.code'] || '').trim() : ''
      empDataAll.push(Object.assign({}, emp))
    })
  })

  const rowCodes = ['AS_str1.1', 'AS_str2.1', 'AS_str3.1', 'AS_str4.1', 'AS_str5.1', 'AS_str6.1', 'AS_str7.1',
    'AS_str8.1', 'AS_str9.1', 'AS_str10.1', 'AS_str11.1', 'AS_str12.1', 'AS_str13.1', 'AS_str14.1', 'AS_str15.1', 'AS_str16.1']

  const row4codes = ['AS_str5.1', 'AS_str6.1', 'AS_str7.1', 'AS_str8.1', 'AS_str9.1', 'AS_str10.1']
  const row11codes = ['AS_str12.1', 'AS_str13.1', 'AS_str14.1', 'AS_str15.1', 'AS_str16.1']

  let npp = 1
  let col4total = 0
  let col5total = 0
  let col6total = 0

  const totalsAvg = []

  function calculateRowAvg (pName, idx, costIDs, group) {
    if (pName === 'AS_str4.1') {
      let obj = {
        npp,
        name: UB.i18n('ІТР, всього:'),
        nkre: '',
        isTotal: true,
        code: pName,
        group,
        col4value: 0,
        col5value: 0,
        col6value: 0
      }
      columns.forEach(item => {
        obj[`col${item.value}value`] = 0
      })
      result.dataAvg.push(obj)

      totalsAvg[idx] = {
        npp,
        name: UB.i18n('ІТР, всього:'),
        nkre: '',
        code: pName,
        group: 'total',
        col4value: 0,
        col5value: 0,
        col6value: 0
      }
      columns.forEach(item => {
        totalsAvg[idx][`col${item.value}value`] = 0
      })
    } else if (pName === 'AS_str11.1') {
      const obj = {
        npp,
        name: UB.i18n('робітники, всього:'),
        nkre: '',
        isTotal: true,
        code: pName,
        group,
        col4value: 0,
        col5value: 0,
        col6value: 0
      }
      columns.forEach(item => {
        obj[`col${item.value}value`] = 0
      })
      result.dataAvg.push(obj)
      totalsAvg[idx] = {
        npp,
        name: UB.i18n('робітники, всього:'),
        nkre: '',
        code: pName,
        group: 'total',
        col4value: 0,
        col5value: 0,
        col6value: 0
      }
      columns.forEach(item => {
        totalsAvg[idx][`col${item.value}value`] = 0
      })
    } else {
      const param = repParams.find(o => o.code === pName)
      const codes = rowValues.filter(o => o['repSetParamID.code'] === pName).map(o => (o['dictPositionGroupID.code'] || '').trim())

      const empNumbers = empDataAll.filter(o => codes.includes(o.dictPositionGroup) && costIDs.includes(o.dictCostPlaceTypeID))

      let col6value = 0 // (7+12+17+22+27+32+33)
      const values = {}
      columns.forEach(item => {
        const codes = item.repParams ? colValues.filter(o => o.repSetParamID === item['repParams'].ID).map(o => (o['accountID.code'] || '').substring(0, 4)) : []
        const numbers = empNumbers.filter(o => codes.includes(o.accountCode.substring(0, 4)))
        const dayCount = numbers.reduce((sum, row) => {
          return sum + (avgEmpList[row.employeeNumberID] || { dayCount: 0 }).dayCount
        }, 0)
        values[item.name] = accrualService.round(dayCount, dec) || 0
        item.total += values[item.name]
        col6value += values[item.name]
      })

      const dayCount = empNumbers.reduce((sum, row) => {
        return sum + (avgEmpList[row.employeeNumberID] || { dayCount: 0 }).dayCount
      }, 0)
      const col5value = accrualService.round(dayCount, dec) || 0
      const col4value = Math.round(col5value)
      col6value = accrualService.round(col5value - col6value, dec)

      col4total += col4value
      col5total += col5value
      col6total += col6value

      if (row4codes.includes(pName)) {
        const row = result.dataAvg.find(o => o.code === 'AS_str4.1' && o.group === group)
        if (row) {
          row.col4value += (col4value || 0)
          row.col5value += (col5value || 0)
          row.col6value += (col6value || 0)
          columns.forEach(item => {
            row[`col${item.value}value`] += (values[item.name] || 0)
          })
        }
      }
      if (row11codes.includes(pName)) {
        const row = result.dataAvg.find(o => o.code === 'AS_str11.1' && o.group === group)
        if (row) {
          row.col4value += (col4value || 0)
          row.col5value += (col5value || 0)
          row.col6value += (col6value || 0)
          columns.forEach(item => {
            row[`col${item.value}value`] += (values[item.name] || 0)
          })
        }
      }

      const data = {
        npp,
        name: param ? param.name : pName,
        nkre: [...new Set(empNumbers.map(o => o.dictPositionGroup))].sort().join(', '),
        cellcode: pName,
        cellid: param ? param.ID : 0,
        code: pName,
        col4value,
        col5value,
        col6value
      }
      columns.forEach(item => {
        data[`col${item.value}value`] = (values[item.name] || 0)
      })
      result.dataAvg.push(data)
      const el = totalsAvg[idx]
      if (el) {
        el.nkre = [...new Set(empNumbers.map(o => o.dictPositionGroup))].concat(el.nkre || [])
        el.col4value += (data.col4value || 0)
        el.col5value += (data.col5value || 0)
        el.col6value += (data.col6value || 0)
        columns.forEach(item => {
          el[`col${item.value}value`] += (data[`col${item.value}value`] || 0)
        })
      } else {
        totalsAvg[idx] = Object.assign({}, data)
        totalsAvg[idx].nkre = [...new Set(empNumbers.map(o => o.dictPositionGroup))]
      }
    }
  }

  result.dataAvg.push({
    npp: npp++,
    name: UB.i18n('Виробнича собівартість'),
    nkre: '',
    isHead: true,
    cellcode: 'AS_prodCost',
    cellid: (repParams.find(o => o.code === 'AS_prodCost') || { ID: null }).ID
  })
  rowCodes.forEach((pName, idx) => {
    calculateRowAvg(pName, idx, prodCostIDs, 'prod')
    npp++
  })
  let obj = {
    npp: npp++,
    name: UB.i18n('Всього по Виробнича собівартість'),
    nkre: '',
    isTotal: true,
    col4value: col4total,
    col5value: col5total,
    col6value: col6total
  }
  columns.forEach(item => {
    obj[`col${item.value}value`] = item.total || 0
  })
  result.dataAvg.push(obj)

  col4total = 0
  col5total = 0
  col6total = 0
  columns.forEach(item => {
    item.total = 0
  })

  result.dataAvg.push({
    npp: npp++,
    name: UB.i18n('Адміністративні витрати'),
    nkre: '',
    isHead: true,
    cellcode: 'AS_admCost',
    cellid: (repParams.find(o => o.code === 'AS_admCost') || { ID: null }).ID
  })
  rowCodes.forEach((pName, idx) => {
    calculateRowAvg(pName, idx, admCostIDs, 'admin')
    npp++
  })
  obj = {
    npp: npp++,
    name: UB.i18n('Всього по Адміністративні витрати'),
    nkre: '',
    isTotal: true,
    col4value: col4total,
    col5value: col5total,
    col6value: col6total
  }
  columns.forEach(item => {
    obj[`col${item.value}value`] = item.total || 0
  })
  result.dataAvg.push(obj)

  result.dataAvg.push({
    npp: npp++,
    name: UB.i18n('Всього чисельність персоналу'),
    nkre: '',
    isHead: true
  })
  col4total = 0
  col5total = 0
  col6total = 0
  columns.forEach(item => {
    item.total = 0
  })

  totalsAvg.forEach(item => {
    const theObj = {
      npp: npp++,
      name: item.name,
      nkre: [...new Set(item.nkre)].sort().join(', '),
      isTotal: true,
      code: item.code,
      group: item.group,
      col4value: item.col4value,
      col5value: item.col5value,
      col6value: item.col6value
    }
    columns.forEach(el => {
      theObj[`col${el.value}value`] = item[`col${el.value}value`] || 0
      el.total += item[`col${el.value}value`] || 0
    })

    result.dataAvg.push(theObj)
    col4total += item.col4value
    col5total += item.col5value
    col6total += item.col6value

    if (row4codes.includes(item.code)) {
      const row = result.dataAvg.find(o => o.code === 'AS_str4.1' && o.group === 'total')
      if (row) {
        row.col4value += (item.col4value || 0)
        row.col5value += (item.col5value || 0)
        row.col6value += (item.col6value || 0)
        columns.forEach(el => {
          row[`col${el.value}value`] += item[`col${el.value}value`] || 0
        })
      }
    }
    if (row11codes.includes(item.code)) {
      const row = result.dataAvg.find(o => o.code === 'AS_str11.1' && o.group === 'total')
      if (row) {
        row.col4value += (item.col4value || 0)
        row.col5value += (item.col5value || 0)
        row.col6value += (item.col6value || 0)
        columns.forEach(el => {
          row[`col${el.value}value`] += item[`col${el.value}value`] || 0
        })
      }
    }
  })
  result.avgCol4Total = accrualService.round(col4total, dec)
  result.avgCol5Total = accrualService.round(col5total, dec)
  result.avgCol6Total = accrualService.round(col6total, dec)
  columns.forEach(item => {
    result[`avgCol${item.value}Total`] = accrualService.round(item.total, dec)
  })

  const reportParams = reportService.getReportParams(execParams.organizationID, ['FOZP', 'FDZP', 'ZKV'], ['notFOPS03'])
  const fopPayElIDs = [...reportParams.FOZPIDs, ...reportParams.FDZPIDs, ...reportParams.ZKVIDs]
  if (!fopPayElIDs.length) {
    fopPayElIDs.push(0)
  }
  const fopEmpList = []

  orgs.forEach(org => {
    const orgID = org['mi_data_id']
    store.runSQL(`
      SELECT employeeNumberID as "employeeNumberID",
        positionID as "positionID",
        workPlace as "workPlace",
        en.dateTo as "dateTo"
      FROM hr_employeePosition ep INNER JOIN hr_employeeNumber en on en.ID = ep.employeeNumberID
      WHERE ep.organizationID = :orgID: 
        AND ep.isActive = 1
        AND ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where ep2.employeeNumberID = ep.employeeNumberID 
          and ep2.isActive = 1 and ep2.mi_deleteDate >= '9999-12-31' ${departmentID ? 'AND ep.departmentID = ep2.departmentID' : ''} 
          order by ep2.dateFrom desc ${sqlDialect.limit})
        AND ep.mi_deleteDate >= '9999-12-31'
        ${departmentID ? 'AND departmentID ' + entityBaseService.getInExpression('departments') : ''}
        AND ep.workPlace <> '3'
        AND ep.employeeNumberID IN (
          SELECT employeeNumberID FROM hr_accrual
          WHERE
            payElID ${entityBaseService.getInExpression('fopPayElIDs')} 
            AND ((periodCalc BETWEEN :dateFrom: AND :dateTo: AND periodSalary <= :dateTo:) OR (periodCalc < :dateFrom: AND periodSalary BETWEEN :dateFrom: AND :dateTo:))
            AND flagsRec & 8192 != 8192
        )
    `, {
      orgID: orgID,
      dateFrom,
      dateTo,
      fopPayElIDs,
      departments
    })
    const empData = store.getAsJsObject()

    const posData = UB.Repository('hr_position')
      .attrs('mi_data_id', 'dictPositionGroupID', 'dictPositionGroupID.code', 'dictCostTypeID')
      .where('state', '=', 'ACTIVE')
      .where('orgID', '=', orgID)
      .misc({ __mip_ondate: dateTo })
      .selectAsObject()

    const dictCostTypeData = UB.Repository('ac_dictCostType')
      .attrs(['ID', 'code', 'name', 'accountID', 'accountID.code', 'dictCostPlaceTypeID'])
      .selectAsObject()

    const empMilService = UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID'])
      .where('orderID.empOrderType', '=', 'MILSERVICE')
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateTo)
      .groupBy('employeeNumberID')
      .selectAsObject()

    let pos
    empData.forEach(emp => {
      pos = posData.find(o => o['mi_data_id'] === emp.positionID)
      if (!pos && emp.positionID) {
        pos = UB.Repository('hr_position')
          .attrs('mi_data_id', 'dictPositionGroupID', 'dictPositionGroupID.code', 'dictCostTypeID')
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', orgID)
          .where('[mi_dateTo] = [mi_maxDateTo]', 'custom')
          .where('mi_data_id', '=', emp.positionID)
          .misc({ __mip_recordhistory_all: true })
          .selectSingle()
        if (pos) {
          posData.push(Object.assign({}, pos))
        }
      }
      const dictCostType = pos ? dictCostTypeData.find(o => o.ID === pos.dictCostTypeID) : null
      emp.dictPositionGroup = pos ? (pos['dictPositionGroupID.code'] || '').trim() : ''
      emp.dictCostPlaceTypeID = dictCostType ? dictCostType.dictCostPlaceTypeID : null
      emp.accountCode = dictCostType ? (dictCostType['accountID.code'] || '').trim() : ''
      const isMilService = empMilService.find(o => o.employeeNumberID === emp.employeeNumberID)
      if (execParams.typeReport === 'type2' || avgEmpList[emp.employeeNumberID] || emp.workPlace === '2' || dateService.shiftDate(emp.dateTo) < dateFrom || isMilService) {
        fopEmpList.push(Object.assign({}, emp))
      }
    })
  })

  let fop4total = 0
  let fop5total = 0
  columns.forEach(item => {
    item.total = 0
  })

  const totalsFop = []
  function calculateRowFop (pName, idx, costIDs, group) {
    if (pName === 'AS_str4.1') {
      const obj = {
        npp,
        name: UB.i18n('ІТР, всього:'),
        nkre: '',
        isTotal: true,
        code: pName,
        group,
        col4value: 0,
        col5value: 0
      }
      columns.forEach(item => {
        obj[`col${item.value}value`] = 0
      })
      result.dataFop.push(obj)
      totalsFop[idx] = {
        npp,
        name: UB.i18n('ІТР, всього:'),
        nkre: '',
        code: pName,
        group: 'total',
        col4value: 0,
        col5value: 0
      }
      columns.forEach(item => {
        totalsFop[idx][`col${item.value}value`] = 0
      })
    } else if (pName === 'AS_str11.1') {
      const obj = {
        npp,
        name: UB.i18n('робітники, всього:'),
        nkre: '',
        isTotal: true,
        code: pName,
        group,
        col4value: 0,
        col5value: 0
      }
      columns.forEach(item => {
        obj[`col${item.value}value`] = 0
      })
      result.dataFop.push(obj)
      totalsFop[idx] = {
        npp,
        name: UB.i18n('робітники, всього:'),
        nkre: '',
        code: pName,
        group: 'total',
        col4value: 0,
        col5value: 0
      }
      columns.forEach(item => {
        totalsFop[idx][`col${item.value}value`] = 0
      })
    } else {
      const param = repParams.find(o => o.code === pName)
      const codes = rowValues.filter(o => o['repSetParamID.code'] === pName).map(o => (o['dictPositionGroupID.code'] || '').trim())

      const empNumbers = fopEmpList.filter(o => codes.includes(o.dictPositionGroup) && costIDs.includes(o.dictCostPlaceTypeID))
      const payTotals = UB.Repository('hr_accrual')
        .where('[employeeNumberID]', 'in', empNumbers.map(row => row.employeeNumberID))
        .where('[payElID]', 'in', fopPayElIDs)
        .where(`(flagsRec & 8192 != 8192)`, 'custom')
        .where('periodCalc', '<=', dateTo, 'cond1')
        .where('periodCalc', '>=', dateFrom, 'cond2')
        .where('periodSalary', '<=', dateTo, 'cond3')
        .where('periodCalc', '<', dateFrom, 'cond4')
        .where('periodSalary', '>=', dateFrom, 'cond5')
        .where('periodSalary', '<=', dateTo, 'cond6')
        .logic('(([cond1] AND [cond2] AND [cond3]) OR ([cond4] AND [cond5] AND [cond6]))')
        .attrs(['SUM([paySum])', 'employeeNumberID'])
        .groupBy('employeeNumberID')
        .selectAsObject({
          'SUM([paySum])': 'sumValue'
        })

      const fopValues = {}
      columns.forEach(item => {
        const codes = item.repParams ? colValues.filter(o => o.repSetParamID === item['repParams'].ID).map(o => (o['accountID.code'] || '').substring(0, 4)) : []
        const numbers = empNumbers.filter(o => codes.includes(o.accountCode.substring(0, 4)))
        const payItemTotals = payTotals.filter(el => numbers.map(row => row.employeeNumberID).indexOf(el.employeeNumberID) !== -1).reduce((res, el) => res + el.sumValue, 0)
        fopValues[item.name] = accrualService.round(payItemTotals, dec) || 0
        item.total += fopValues[item.name]
      })

      const payTotalsValue = payTotals.reduce((res, el) => res + el.sumValue, 0)
      const fop4value = accrualService.round(payTotalsValue / 1000, 1)
      const fop5value = accrualService.round(payTotalsValue, 2) || 0
      fop4total += fop4value
      fop5total += fop5value

      if (row4codes.includes(pName)) {
        const row = result.dataFop.find(o => o.code === 'AS_str4.1' && o.group === group)
        if (row) {
          row.col4value += (fop4value || 0)
          row.col5value += (fop5value || 0)
          columns.forEach(item => {
            row[`col${item.value}value`] += (fopValues[item.name] || 0)
          })
        }
      }
      if (row11codes.includes(pName)) {
        const row = result.dataFop.find(o => o.code === 'AS_str11.1' && o.group === group)
        if (row) {
          row.col4value += (fop4value || 0)
          row.col5value += (fop5value || 0)
          columns.forEach(item => {
            row[`col${item.value}value`] += (fopValues[item.name] || 0)
          })
        }
      }

      const data = {
        npp,
        name: param ? param.name : pName,
        nkre: [...new Set(empNumbers.map(o => o.dictPositionGroup))].sort().join(', '),
        cellcode: pName,
        cellid: param ? param.ID : 0,
        code: pName,
        col4value: fop4value,
        col5value: fop5value
      }
      columns.forEach(item => {
        data[`col${item.value}value`] = (fopValues[item.name] || 0)
      })

      result.dataFop.push(data)
      const el = totalsFop[idx]
      if (el) {
        el.nkre = [...new Set(empNumbers.map(o => o.dictPositionGroup))].concat(el.nkre || [])
        el.col4value += (data.col4value || 0)
        el.col5value += (data.col5value || 0)
        columns.forEach(item => {
          el[`col${item.value}value`] += (data[`col${item.value}value`] || 0)
        })
      } else {
        totalsFop[idx] = Object.assign({}, data)
        totalsFop[idx].nkre = [...new Set(empNumbers.map(o => o.dictPositionGroup))]
      }
    }
  }

  result.dataFop.push({
    npp: npp++,
    name: UB.i18n('Виробнича собівартість'),
    nkre: '',
    isHead: true,
    cellcode: 'AS_prodCost',
    cellid: (repParams.find(o => o.code === 'AS_prodCost') || { ID: null }).ID
  })
  rowCodes.forEach((pName, idx) => {
    calculateRowFop(pName, idx, prodCostIDs, 'prod')
    npp++
  })
  obj = {
    npp: npp++,
    name: UB.i18n('Всього по Виробнича собівартість'),
    nkre: '',
    isTotal: true,
    col4value: fop4total,
    col5value: fop5total
  }
  columns.forEach(item => {
    obj[`col${item.value}value`] = item.total
  })
  result.dataFop.push(obj)

  fop4total = 0
  fop5total = 0
  columns.forEach(item => {
    item.total = 0
  })

  result.dataFop.push({
    npp: npp++,
    name: UB.i18n('Адміністративні витрати'),
    nkre: '',
    isHead: true,
    cellcode: 'AS_admCost',
    cellid: (repParams.find(o => o.code === 'AS_admCost') || { ID: null }).ID
  })
  rowCodes.forEach((pName, idx) => {
    calculateRowFop(pName, idx, admCostIDs, 'admin')
    npp++
  })
  obj = {
    npp: npp++,
    name: UB.i18n('Всього по Адміністративні витрати'),
    nkre: '',
    isTotal: true,
    col4value: fop4total,
    col5value: fop5total
  }
  result.dataFop.push(obj)
  columns.forEach(item => {
    obj[`col${item.value}value`] = item.total
  })

  result.dataFop.push({
    npp: npp++,
    name: UB.i18n('Всього фонд заробітної плати'),
    nkre: '',
    isHead: true
  })
  fop4total = 0
  fop5total = 0
  columns.forEach(item => {
    item.total = 0
  })

  totalsFop.forEach(item => {
    const theObj = {
      npp: npp++,
      name: item.name,
      nkre: [...new Set(item.nkre)].sort().join(', '),
      isTotal: true,
      code: item.code,
      group: item.group,
      col4value: item.col4value,
      col5value: item.col5value
    }
    columns.forEach(el => {
      theObj[`col${el.value}value`] = item[`col${el.value}value`] || 0
      el.total += item[`col${el.value}value`] || 0
    })

    result.dataFop.push(theObj)
    fop4total += item.col4value
    fop5total += item.col5value
    if (row4codes.includes(item.code)) {
      const row = result.dataFop.find(o => o.code === 'AS_str4.1' && o.group === 'total')
      if (row) {
        row.col4value += (item.col4value || 0)
        row.col5value += (item.col5value || 0)
        columns.forEach(el => {
          row[`col${el.value}value`] += item[`col${el.value}value`] || 0
        })
      }
    }
    if (row11codes.includes(item.code)) {
      const row = result.dataFop.find(o => o.code === 'AS_str11.1' && o.group === 'total')
      if (row) {
        row.col4value += (item.col4value || 0)
        row.col5value += (item.col5value || 0)
        columns.forEach(el => {
          row[`col${el.value}value`] += item[`col${el.value}value`] || 0
        })
      }
    }
  })
  result.fopCol4Total = accrualService.round(fop4total, 2)
  result.fopCol5Total = accrualService.round(fop5total, 2)
  columns.forEach(item => {
    result[`fopCol${item.value}Total`] = accrualService.round(item.total, dec)
  })
  mParams.resultData = JSON.stringify(result)
}

me.getImportData = function (ctx) {
  const mParams = ctx.mParams.params
  let massiveData = []
  let orgIDs = mParams.valueOrganizationID

  if (mParams.valueSyncData) {
    const resultFirstQuery = UB.Repository('ac_integrateMap')
      .attrs(['entityName', 'internalID', 'extrnlSystmCode', 'externalID'])
      .whereIf(mParams.valueEntityName, 'entityName', '=', mParams.valueEntityName)
      .whereIf(mParams.extrnlSystmCodeValue, 'extrnlSystmCode', '=', mParams.extrnlSystmCodeValue)
      .selectAsObject()

    resultFirstQuery.forEach(element => {
      let myIDparam = 'ID'
      let myOrgIdParam = 'organizationID'
      let myDescription = ''
      let state
      if (element.entityName === 'hr_organization' || element.entityName === 'hr_department' || element.entityName === 'hr_position') {
        myOrgIdParam = 'orgID'
        myIDparam = 'mi_data_id'
        state = 'ACTIVE'
      } else if (element.entityName === 'hr_employeeNumber') {
        myOrgIdParam = 'orgID'
      }
      if (App.domainInfo.entities[element.entityName].attributes.description) {
        myDescription = 'description'
      }
      let haveOrgID = App.domainInfo.entities[element.entityName].attributes[myOrgIdParam] || false
      let haveMideleteDate = App.domainInfo.entities[element.entityName].attributes.mi_deleteDate || false

      const resultSecondQuery = UB.Repository(element.entityName)
        .attrs([myDescription, 'mi_deleteDate', myIDparam])
        .where(myIDparam, '=', element.internalID)
        .whereIf(orgIDs && haveOrgID, myOrgIdParam, 'in', orgIDs)
        .whereIf(state, 'state', '=', 'ACTIVE')
        .whereIf(haveMideleteDate, 'mi_deleteDate', '>=', '#maxdate')
        .selectAsObject()

      resultSecondQuery.forEach(element2 => {
        let deleteDate = dateService.formatDate(element2.mi_deleteDate)
        if (deleteDate === '31.12.9999') {
          deleteDate = ''
        }
        massiveData.push(
          {
            description: element2.description || '',
            entityName: element.entityName,
            internalID: element2[myIDparam],
            externalID: element.externalID,
            extrnlSystmCode: mParams.extrnlSystmCodeValue,
            mi_deleteDate: deleteDate
          }
        )
      })
    })
  } else if (!mParams.valueSyncData) {
    const massiveIDs = UB.Repository('ac_integrateMap')
      .attrs(['internalID'])
      .where('mi_deleteDate', '=', '9999-12-31')
      .selectAsArrayOfValues()

    const resultFirstQuery = UB.Repository('ac_integrateMap')
      .attrs(['entityName', 'externalID', 'internalID'])
      .where('mi_deleteDate', '=', '9999-12-31')
      .whereIf(mParams.valueEntityName, 'entityName', '=', mParams.valueEntityName)
      .selectAsObject()

    const uniqueEntityNames = new Set()
    resultFirstQuery.forEach(item => {
      uniqueEntityNames.add(item.entityName)
    })

    const uniqueEntityNamesArray = Array.from(uniqueEntityNames)

    uniqueEntityNamesArray.forEach(element => {
      let myIDparam = 'ID'
      let myOrgIdParam = 'organizationID'
      let state
      let myDescription = ''
      if (element === 'hr_organization' || element === 'hr_department' || element === 'hr_position') {
        myOrgIdParam = 'orgID'
        myIDparam = 'mi_data_id'
        state = 'ACTIVE'
      } else if (element === 'hr_employeeNumber') {
        myOrgIdParam = 'orgID'
      }
      if (App.domainInfo.entities[element].attributes.description) {
        myDescription = 'description'
      }
      let haveOrgID = App.domainInfo.entities[element].attributes[myOrgIdParam] || false
      let haveMideleteDate = App.domainInfo.entities[element].attributes.mi_deleteDate || false

      const resultSecondQuery = UB.Repository(element)
        .attrs([myIDparam, myDescription, 'mi_deleteDate'])
        .where('mi_deleteDate', '=', '9999-12-31')
        .whereIf(state, 'state', '=', 'ACTIVE')
        .where(myIDparam, 'notIn', massiveIDs)
        .whereIf(orgIDs && haveOrgID, myOrgIdParam, 'in', orgIDs)
        .whereIf(haveMideleteDate, 'mi_deleteDate', '>=', '#maxdate')
        .selectAsObject()

      resultSecondQuery.forEach(element2 => {
        let deleteDate = dateService.formatDate(element2.mi_deleteDate)
        if (deleteDate === '31.12.9999') {
          deleteDate = ''
        }

        const externalID = resultFirstQuery.find(item => item.internalID === element2[myIDparam])
        massiveData.push(
          {
            entityName: element,
            internalID: element2[myIDparam],
            description: element2.description || '',
            extrnlSystmCode: mParams.extrnlSystmCodeValue,
            externalID: externalID,
            mi_deleteDate: deleteDate
          }
        )
      })
    })
  }

  mParams.resultData = JSON.stringify(massiveData)
}

me.getListControlAppointment = function (ctx) {
  const mParams = ctx.mParams.params
  const myEntity = ctx.mParams.params.myEntity

  let querryFieldList = ['employeeNumberID.tabNum', 'ID', 'employeeID.fullFIO', 'posName', 'depName', 'orgName', 'dictPositionID']
  let miDeleteDateParam = false
  let isActiveDateParam
  let idDateParam
  let dateToParam
  let notNullParam

  if (myEntity === 'hr_dictPosition') {
    querryFieldList.push('dictPositionID.dateTo', 'dictPositionID.isActive', 'dictPositionID.ID', 'dictPositionID.mi_deleteDate')
    isActiveDateParam = 'dictPositionID.isActive'
    idDateParam = 'dictPositionID.ID'
    dateToParam = 'dictPositionID.dateTo'
    miDeleteDateParam = 'dictPositionID.mi_deleteDate'
  } else if (myEntity === 'hr_dictWagePay') {
    querryFieldList.push('dictWagePayID.dateTo', 'dictWagePayID.ID', 'dictWagePayID.mi_deleteDate')
    dateToParam = 'dictWagePayID.dateTo'
    idDateParam = 'dictWagePayID.ID'
    miDeleteDateParam = 'dictWagePayID.mi_deleteDate'
  } else if (myEntity === 'hr_workSchedule') {
    querryFieldList.push('workScheduleID.dateTo', 'workScheduleID.ID', 'workScheduleID.mi_deleteDate')
    dateToParam = 'workScheduleID.dateTo'
    idDateParam = 'workScheduleID.ID'
    miDeleteDateParam = 'workScheduleID.mi_deleteDate'
  } else if (myEntity === 'hr_dictStaffCat') {
    querryFieldList.push('dictStaffCatID.mi_deleteDate', 'dictStaffCatID.ID')
    miDeleteDateParam = 'dictStaffCatID.mi_deleteDate'
    idDateParam = 'dictStaffCatID.ID'
  } else if (myEntity === 'hr_empPosFundSource') {
    querryFieldList.push('dictFundSourceID', 'dictFundSourceID.name', 'dictFundSourceID.dateTo', 'dictFundSourceID.mi_deleteDate')
    dateToParam = 'dictFundSourceID.dateTo'
    idDateParam = 'dictFundSourceID'
    notNullParam = 'dictFundSourceID'
    miDeleteDateParam = 'dictFundSourceID.mi_deleteDate'
  } else if (myEntity === 'ac_dictProgClass') {
    querryFieldList.push('dictProgClassID.mi_deleteDate', 'dictProgClassID.ID')
    miDeleteDateParam = 'dictProgClassID.mi_deleteDate'
    idDateParam = 'dictProgClassID.ID'
  } else if (myEntity === 'hr_dictCategoryECB') {
    querryFieldList.push('dictCategoryECBID.mi_deleteDate', 'dictCategoryECBID.ID')
    miDeleteDateParam = 'dictCategoryECBID.mi_deleteDate'
    idDateParam = 'dictCategoryECBID.ID'
  } else if (myEntity === 'hr_dictContractKind') {
    querryFieldList.push('dictContractKindID.mi_deleteDate', 'dictContractKindID.ID')
    miDeleteDateParam = 'dictContractKindID.mi_deleteDate'
    idDateParam = 'dictContractKindID.ID'
  } else if (myEntity === 'hr_dictTarifCoeff') {
    querryFieldList.push('dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictTarifCoeffID.mi_deleteDate', 'dictTarifCoeffID.dateTo')
    notNullParam = 'dictTarifCoeffID'
    idDateParam = 'dictTarifCoeffID'
    miDeleteDateParam = 'dictTarifCoeffID.mi_deleteDate'
    dateToParam = 'dictTarifCoeffID.dateTo'
  } else if (myEntity === 'hr_payEl') {
    querryFieldList.push('payElID.dateTo', 'payElID.ID', 'payElID.mi_deleteDate')
    dateToParam = 'payElID.dateTo'
    idDateParam = 'payElID.ID'
    miDeleteDateParam = 'payElID.mi_deleteDate'
  } else if (myEntity === 'hr_dictRank') {
    querryFieldList.push('dictRankID.isActive', 'dictRankID.ID', 'dictRankID.mi_deleteDate')
    isActiveDateParam = 'dictRankID.isActive'
    idDateParam = 'dictRankID.ID'
    miDeleteDateParam = 'dictRankID.mi_deleteDate'
  } else if (myEntity === 'hr_dictEmpCategory') {
    querryFieldList.push('dictEmpCategoryID.mi_deleteDate', 'dictEmpCategoryID.ID')
    miDeleteDateParam = 'dictEmpCategoryID.mi_deleteDate'
    idDateParam = 'dictEmpCategoryID.ID'
  }

  const resultQuestion = UB.Repository('hr_employeePositionS')
    .attrs(querryFieldList)
    .whereIf(mParams.orgIDs, 'organizationID', 'in', mParams.orgIDs)
    .whereIf(mParams.deptIDs, 'departmentID', 'in', mParams.deptIDs)
    .whereIf(notNullParam, notNullParam, 'isNotNull')
    .where('dateTo', '>=', mParams.dateTo)
    .where('dateFrom', '<=', mParams.dateTo)
    .selectAsObject()

  let resultQuestion2 = []

  if (myEntity === 'hr_empPosFundSource') {
    resultQuestion2 = UB.Repository('ac_fundSource')
      .attrs('ID', 'mi_deleteDate', 'dateTo')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  } else if (myEntity === 'hr_dictTarifCoeff') {
    resultQuestion2 = UB.Repository('hr_dictTarifCoeffDet')
      .attrs('ID', 'dictTarifCoeffID', 'dateTo', 'mi_deleteDate')
      .selectAsObject()
  }

  let massiveData = []
  for (const row of resultQuestion) {
    let myIDparam = row[idDateParam]
    let descriptionProblem = ''
    if (myIDparam !== null) {
      descriptionProblem = 'ID = ' + myIDparam + ': '
      if (myEntity === 'hr_empPosFundSource') {
        descriptionProblem = ''
        const filteredRecords = resultQuestion2.filter(record =>
          record.ID === row[idDateParam]
        )

        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + UB.i18n('Запис джерела фінансування видалено') + ' (ID = ' + row[idDateParam] + '); '
        }

        if (filteredRecords.length && filteredRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo || dateService.unshiftDate(record.mi_deleteDate) < dateService.unshiftDate(dateService.maxDate()))) {
          descriptionProblem = descriptionProblem + UB.i18n('жоден запис джерел фінансування станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним')
        }
      } else if (myEntity === 'hr_dictTarifCoeff') {
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictTarifCoeffID === row['dictTarifCoeffID']
        )

        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + UB.i18n('запис видалено') + '; '
        }
        if (dateService.unshiftDate(row[dateToParam]) < mParams.dateTo) {
          descriptionProblem = descriptionProblem + UB.i18n('завершено термін дії') + '; '
        }

        if (filteredRecords.length && filteredRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo)) {
          descriptionProblem = descriptionProblem + UB.i18n('жоден запис окладів по тарифному розряду станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним')
        }
      } else {
        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + UB.i18n('запис видалено') + '; '
        }
        if (dateService.unshiftDate(row[dateToParam]) <= mParams.dateTo) {
          descriptionProblem = descriptionProblem + UB.i18n('завершено термін дії') + '; '
        }
        if (row[isActiveDateParam] === 0) {
          descriptionProblem = descriptionProblem + UB.i18n('знято ознаку дії') + '; '
        }
      }
      if (descriptionProblem === 'ID = ' + myIDparam + ': ') {
        descriptionProblem = ''
      }
      if (descriptionProblem.slice(-2) === '; ') {
        descriptionProblem = descriptionProblem.slice(0, -2)
      }
      if (descriptionProblem !== '') {
        massiveData.push(
          {
            DescriptionProblem: descriptionProblem,
            tabNum: row['employeeNumberID.tabNum'],
            ID: row['ID'],
            fullFIO: row['employeeID.fullFIO'],
            name: row['posName'],
            orgName: row['orgName'],
            depName: row['depName']
          }
        )
      }
    }
  }
  mParams.resultData = JSON.stringify(massiveData)
}

me.getListControlDictPosition = function (ctx) {
  const mParams = ctx.mParams.params
  const myEntity = ctx.mParams.params.myEntity

  let querryFieldList = ['ID', 'code', 'name', 'departmentName', 'orgName']
  let miDeleteDateParam = false
  let isActiveDateParam
  let idDateParam
  let dateToParam
  let notNullParam
  let schemeIDMiDeleteDate
  let schemeID
  let miDeleteDateParamQuerry

  if (myEntity === 'hr_dictPosition') {
    querryFieldList.push('dictPositionID.dateTo', 'dictPositionID.isActive', 'dictPositionID.ID', 'dictPositionID.mi_deleteDate')
    isActiveDateParam = 'dictPositionID.isActive'
    idDateParam = 'dictPositionID.ID'
    dateToParam = 'dictPositionID.dateTo'
    miDeleteDateParam = 'dictPositionID.mi_deleteDate'
  } else if (myEntity === 'hr_dictWagePay') {
    querryFieldList.push('dictWagePayID.dateTo', 'dictWagePayID.ID', 'dictWagePayID.mi_deleteDate')
    dateToParam = 'dictWagePayID.dateTo'
    idDateParam = 'dictWagePayID.ID'
    miDeleteDateParam = 'dictWagePayID.mi_deleteDate'
  } else if (myEntity === 'hr_dictStaffCat') {
    querryFieldList.push('dictStaffCatID.mi_deleteDate', 'dictStaffCatID.ID')
    miDeleteDateParam = 'dictStaffCatID.mi_deleteDate'
    idDateParam = 'dictStaffCatID.ID'
  } else if (myEntity === 'hr_dictStaffSubCat') {
    querryFieldList.push('dictStaffSubCatID.mi_deleteDate', 'dictStaffSubCatID.ID')
    miDeleteDateParam = 'dictStaffSubCatID.mi_deleteDate'
    idDateParam = 'dictStaffSubCatID.ID'
  } else if (myEntity === 'hr_dictStatePay') {
    querryFieldList.push('dictStatePayID.dateTo', 'dictStatePayID.ID', 'dictStatePayID.mi_deleteDate')
    dateToParam = 'dictStatePayID.dateTo'
    idDateParam = 'dictStatePayID.ID'
    miDeleteDateParam = 'dictStatePayID.mi_deleteDate'
  } else if (myEntity === 'hr_payEl') {
    querryFieldList.push('payElID.dateTo', 'payElID.ID', 'payElID.mi_deleteDate')
    dateToParam = 'payElID.dateTo'
    idDateParam = 'payElID.ID'
    miDeleteDateParam = 'payElID.mi_deleteDate'
  } else if (myEntity === 'hr_positionfundsource') {
    querryFieldList.push('fundSourcePositionID.dictFundSourceID')
    idDateParam = 'fundSourcePositionID.dictFundSourceID'
    // miDeleteDateParam = 'fundSourcePositionID.dictFundSourceID.mi_deleteDate'
    miDeleteDateParamQuerry = 'fundSourcePositionID.mi_deleteDate'
  } else if (myEntity === 'hr_workSchedule') {
    querryFieldList.push('workScheduleID.dateTo', 'workScheduleID.ID', 'workScheduleID.mi_deleteDate')
    dateToParam = 'workScheduleID.dateTo'
    idDateParam = 'workScheduleID.ID'
    miDeleteDateParam = 'workScheduleID.mi_deleteDate'
  } else if (myEntity === 'hr_specialty') {
    querryFieldList.push('dictSpecialtyID.isActive', 'dictSpecialtyID.ID', 'dictSpecialtyID.mi_deleteDate')
    isActiveDateParam = 'dictSpecialtyID.isActive'
    idDateParam = 'dictSpecialtyID.ID'
    miDeleteDateParam = 'dictSpecialtyID.mi_deleteDate'
  } else if (myEntity === 'hr_dictEmpCategory') {
    querryFieldList.push('dictEmpCategoryID.mi_deleteDate', 'dictEmpCategoryID.ID')
    miDeleteDateParam = 'dictEmpCategoryID.mi_deleteDate'
    idDateParam = 'dictEmpCategoryID.ID'
  } else if (myEntity === 'hr_dictTarifCoeff') {
    querryFieldList.push('dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictTarifCoeffID.mi_deleteDate', 'dictTarifCoeffID.dateTo')
    dateToParam = 'dictTarifCoeffID.dateTo'
    notNullParam = 'dictTarifCoeffID'
    idDateParam = 'dictTarifCoeffID'
    miDeleteDateParam = 'dictTarifCoeffID.mi_deleteDate'
  } else if (myEntity === 'hr_dictPositionKind') {
    querryFieldList.push('dictPositionKindID.mi_deleteDate', 'dictPositionKindID.ID')
    miDeleteDateParam = 'dictPositionKindID.mi_deleteDate'
    idDateParam = 'dictPositionKindID.ID'
  } else if (myEntity === 'hr_dictPositionGroup') {
    querryFieldList.push('dictPositionGroupID.mi_deleteDate', 'dictPositionGroupID.ID')
    miDeleteDateParam = 'dictPositionGroupID.mi_deleteDate'
    idDateParam = 'dictPositionGroupID.ID'
  } else if (myEntity === 'hr_dictSalarySchemeLevel') {
    querryFieldList.push('dictSalarySchemeLevelID', 'dictSalarySchemeLevelID.dictSalarySchemeID.mi_deleteDate', 'dictSalarySchemeLevelID.dictSalarySchemeID', 'dictSalarySchemeLevelID.isActive', 'dictSalarySchemeLevelID.dateTo', 'dictSalarySchemeLevelID.mi_deleteDate')
    dateToParam = 'dictSalarySchemeLevelID.dateTo'
    idDateParam = 'dictSalarySchemeLevelID'
    isActiveDateParam = 'dictSalarySchemeLevelID.isActive'
    miDeleteDateParam = 'dictSalarySchemeLevelID.mi_deleteDate'
    schemeIDMiDeleteDate = 'dictSalarySchemeLevelID.dictSalarySchemeID.mi_deleteDate'
    schemeID = 'dictSalarySchemeLevelID.dictSalarySchemeID'
  } else if (myEntity === 'ac_dictCostType') {
    querryFieldList.push('dictCostTypeID.dateTo', 'dictCostTypeID.ID', 'dictCostTypeID.mi_deleteDate')
    dateToParam = 'dictCostTypeID.dateTo'
    idDateParam = 'dictCostTypeID.ID'
    miDeleteDateParam = 'dictCostTypeID.mi_deleteDate'
  } else if (myEntity === 'hr_dictMilitaryRank') {
    querryFieldList.push('dictMilitaryRankID.mi_deleteDate', 'dictMilitaryRankID.ID')
    miDeleteDateParam = 'dictMilitaryRankID.mi_deleteDate'
    idDateParam = 'dictMilitaryRankID.ID'
  } else if (myEntity === 'hr_dictMilitarySpeciality') {
    querryFieldList.push('dictMilitarySpecialityID.mi_deleteDate', 'dictMilitarySpecialityID.ID')
    miDeleteDateParam = 'dictMilitarySpecialityID.mi_deleteDate'
    idDateParam = 'dictMilitarySpecialityID.ID'
  } else if (myEntity === 'hr_dictAcademStatus') {
    querryFieldList.push('dictAcademStatusID.mi_deleteDate', 'dictAcademStatusID.ID')
    miDeleteDateParam = 'dictAcademStatusID.mi_deleteDate'
    idDateParam = 'dictAcademStatusID.ID'
  } else if (myEntity === 'hr_dictDegree') {
    querryFieldList.push('dictDegreeID.mi_deleteDate', 'dictDegreeID.ID')
    miDeleteDateParam = 'dictDegreeID.mi_deleteDate'
    idDateParam = 'dictDegreeID.ID'
  }

  const resultQuestion = UB.Repository('hr_position')
    .attrs(querryFieldList)
    .whereIf(mParams.orgIDs, 'orgID', 'in', mParams.orgIDs)
    .whereIf(mParams.deptIDs, 'departmentID', 'in', mParams.deptIDs)
    .whereIf(notNullParam, notNullParam, 'isNotNull')
    .whereIf(miDeleteDateParamQuerry, miDeleteDateParamQuerry, '=', '#maxdate')
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: mParams.dateTo })
    .selectAsObject()

  let resultQuestion2 = []

  if (myEntity === 'hr_positionfundsource') {
    resultQuestion2 = UB.Repository('ac_fundSource')
      .attrs('ID', 'mi_deleteDate', 'dateTo')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  } else if (myEntity === 'hr_dictTarifCoeff') {
    resultQuestion2 = UB.Repository('hr_dictTarifCoeffDet')
      .attrs('dictTarifCoeffID', 'dateTo', 'mi_deleteDate')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  } else if (myEntity === 'hr_dictSalarySchemeLevel') {
    resultQuestion2 = UB.Repository('hr_dictSalarySchemeDet')
      .attrs('dictSalarySchemeLevelID', 'dateTo', 'mi_deleteDate')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  }

  let massiveData = []
  for (const row of resultQuestion) {
    let myIDparam = row[idDateParam]
    let descriptionProblem = ''
    if (myIDparam !== null) {
      descriptionProblem = 'ID = ' + myIDparam + ': '
      if (myEntity === 'hr_positionfundsource') {
        const filteredRecords = resultQuestion2.filter(record =>
          record.ID === row[idDateParam]
        )
        if (filteredRecords.length) {
          if (dateService.unshiftDate(filteredRecords[0].mi_deleteDate) < dateService.unshiftDate(dateService.maxDate())) {
            descriptionProblem = descriptionProblem + UB.i18n('запис видалено') + '; '
          }
          if (dateService.unshiftDate(filteredRecords[0].dateTo) < mParams.dateTo) {
            descriptionProblem = descriptionProblem + UB.i18n('завершено термін дії') + '; '
          }
        }
      } else if (myEntity === 'hr_dictTarifCoeff') {
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictTarifCoeffID === row['dictTarifCoeffID']
        )

        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + UB.i18n('запис видалено') + '; '
        }
        if (dateService.unshiftDate(row[dateToParam]) <= mParams.dateTo) {
          descriptionProblem = descriptionProblem + UB.i18n('завершено термін дії') + '; '
        }
        if (filteredRecords.length && filteredRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo)) {
          descriptionProblem = descriptionProblem + UB.i18n('жоден запис окладів по тарифному розряду станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним')
        }
      } else if (myEntity === 'hr_dictSalarySchemeLevel') {
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictSalarySchemeLevelID === row['dictSalarySchemeLevelID']
        )

        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('запис видалено') + '; '
        }

        if (dateService.unshiftDate(row[dateToParam]) <= mParams.dateTo) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('завершено термін дії') + '; '
        }

        if (!row[isActiveDateParam]) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('знято ознаку дії') + '; '
        }

        if (dateService.unshiftDate(row[schemeIDMiDeleteDate]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('запис схеми посадових окладів є видаленим') + ' (ID = ' + row[schemeID] + '); '
        }

        if (filteredRecords.length && filteredRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo)) {
          descriptionProblem = descriptionProblem + UB.i18n('жоден запис окладу для обраного рівня станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним')
        }
      } else {
        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + UB.i18n('запис видалено') + '; '
        }
        if (dateService.unshiftDate(row[dateToParam]) <= mParams.dateTo) {
          descriptionProblem = descriptionProblem + UB.i18n('завершено термін дії') + '; '
        }
        if (row[isActiveDateParam] === 0) {
          descriptionProblem = descriptionProblem + UB.i18n('знято ознаку дії') + '; '
        }
      }
      if (descriptionProblem === 'ID = ' + myIDparam + ': ') {
        descriptionProblem = ''
      }
      if (descriptionProblem.slice(-2) === '; ') {
        descriptionProblem = descriptionProblem.slice(0, -2)
      }
      if (descriptionProblem !== '') {
        massiveData.push(
          {
            DescriptionProblem: descriptionProblem,
            ID: row['ID'],
            code: row['code'],
            name: row['name'],
            orgName: row['orgName'],
            depName: row['departmentName']
          }
        )
      }
    }
  }
  mParams.resultData = JSON.stringify(massiveData)
}

me.fundingSourceSearch = function (ctx) {
  const mParams = ctx.mParams.params

  let orgIDs = []

  if (mParams.organizationID) {
    orgIDs = [mParams.organizationID]
    if (mParams.includeChildOrgs) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${mParams.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [mParams.organizationID]
  }

  let depName = ''
  let deptIDs = null
  if (mParams.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', mParams.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: mParams.onDate })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (mParams.includeChildDepts) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', mParams.organizationID)
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [mParams.departmentID]
      }
    } else {
      deptIDs = [mParams.departmentID]
    }
  }

  let massiveData = []

  let result = UB.Repository('hr_employeePositionS')
    .attrs(['fundSourceEmpPosID', 'ID', 'fundSources', 'employeeNumberID.tabNum', 'employeeID.fullFIO', 'employeeID.taxCode', 'description', 'mtCount', 'posStaffName', 'dictFundSourceID.name', 'posAccrualSum', 'dateFrom', 'dateTo', 'workPlace.name', 'dictEmpCategoryID.description', 'dictStaffCatID.name', 'workScheduleID.name', 'payElID.name', 'contractType', 'dictContractKindID.name', 'orgName', 'selfStructDepName', 'depName', 'dictPositionID.name', 'posNameAddition', 'dictFundSourceID', 'positionID.mi_data_id'])
    .where('organizationID', 'in', orgIDs)
    .whereIf(deptIDs, 'departmentID', 'in', deptIDs)
    .whereIf(mParams.dictEmpCategoryID, 'dictEmpCategoryID', '=', mParams.dictEmpCategoryID)
    .whereIf(mParams.dictStaffCatID, 'dictStaffCatID', '=', mParams.dictStaffCatID)
    .whereIf(mParams.workPlace, 'workPlace', '=', mParams.workPlace)
    .where('dateTo', '>=', mParams.onDate)
    .orderBy('employeeNumberID.tabNum', 'employeeID.fullFIO')

  if (mParams.dictFundSourceID) {
    result.exists(UB.Repository('hr_empPosFundSource')
      .correlation('employeePositionID', 'ID')
      .where('dictFundSourceID', '=', mParams.dictFundSourceID)
    )
  }

  result = result.selectAsObject()
  if (mParams.workPlace && result.length) {
    mParams.workPlace = result[0]['workPlace.name']
  }
  if (mParams.dictStaffCatID && result.length) {
    mParams.dictStaffCatID = result[0]['dictStaffCatID.name']
  }
  if (mParams.dictEmpCategoryID && result.length) {
    mParams.dictEmpCategoryID = result[0]['workScheduleID.name']
  }

  result = result.filter((item, index, self) => {
    const jsonString = JSON.stringify(item)
    return index === self.findIndex(obj => JSON.stringify(obj) === jsonString)
  })

  result.forEach((item) => {
    let myDateTo = dateService.formatDate(item['dateTo'])
    if (myDateTo === '31.12.9999') {
      myDateTo = ''
    }
    let resultParse = JSON.parse(item.fundSources)
    if (resultParse && resultParse.length > 1) {
      resultParse.forEach((itemfundSources) => {
        var findID = item['ID']
        var findmtCount = item['fundSourceEmpPosID.mtCount']
        var foundPerson = massiveData.find(function (findUniq) {
          return findUniq.ID === findID && findUniq.fundSourceEmpPosIDmtCount === findmtCount
        })
        if (!foundPerson) {
          const resultQuerry = UB.Repository('hr_empPosFundSource')
            .attrs(['dictFundSourceID.name', 'mtCount', 'dictFundSourceID'])
            .where('dictFundSourceID', '=', itemfundSources.dictFundSourceID)
            .where('employeePositionID', '=', item['fundSourceEmpPosID'])
            .selectSingle()
          let quantityPositionFundSource = ''
          const resultpositionFundSource = UB.Repository('hr_positionFundSource')
            .attrs(['dictFundSourceID.name', 'quantity'])
            .where('dictFundSourceID', '=', itemfundSources.dictFundSourceID)
            .where('positionID.mi_data_id', '=', item['positionID.mi_data_id'])
            .selectSingle()

          if (resultpositionFundSource) {
            quantityPositionFundSource = resultpositionFundSource.quantity
          }

          massiveData.push({
            ID: item['ID'],
            tabNum: item['employeeNumberID.tabNum'],
            fullFIO: item['employeeID.fullFIO'],
            taxCode: item['employeeID.taxCode'],
            description: item['description'],
            mtCount: resultQuerry.mtCount || 0,
            posStaffName: item['posStaffName'],
            dictFundSourceIDName: resultQuerry['dictFundSourceID.name'],
            fundSourceEmpPosIDmtCount: quantityPositionFundSource,
            posAccrualSum: item['posAccrualSum'],
            dateFrom: dateService.formatDate(item['dateFrom']),
            dateTo: myDateTo,
            workPlace: item['workPlace.name'],
            dictEmpCategoryIDDescription: item['dictEmpCategoryID.description'],
            dictStaffCatIDName: item['dictStaffCatID.name'],
            workScheduleIDName: item['workScheduleID.name'],
            payElIDName: item['payElID.name'],
            contractType: item['contractType'],
            dictContractKindIDName: item['dictContractKindID.name'],
            organizationName: item['orgName'],
            selfStructDepName: item['selfStructDepName'],
            depName: item['depName'],
            dictPositionIDName: item['dictPositionID.name'],
            posNameAddition: item['posNameAddition'],
            dictFundSourceID: resultQuerry['dictFundSourceID']
          })
        }
      })
    } else {
      let myMtCount = ''
      let dictFundSourceID = item['dictFundSourceID']
      const resultQuerry = UB.Repository('hr_positionFundSource')
        .attrs(['quantity', 'dictFundSourceID'])
        .where('positionID.mi_data_id', '=', item['positionID.mi_data_id'])
        .where('dictFundSourceID', '=', item['dictFundSourceID'])
        .selectSingle()
      if (resultQuerry !== undefined) {
        myMtCount = resultQuerry.quantity
        dictFundSourceID = resultQuerry['dictFundSourceID']
      }

      massiveData.push({
        ID: item['ID'],
        tabNum: item['employeeNumberID.tabNum'],
        fullFIO: item['employeeID.fullFIO'],
        taxCode: item['employeeID.taxCode'],
        description: item['description'],
        mtCount: item['mtCount'],
        posStaffName: item['posStaffName'],
        dictFundSourceIDName: item['dictFundSourceID.name'],
        fundSourceEmpPosIDmtCount: myMtCount,
        posAccrualSum: item['posAccrualSum'],
        dateFrom: dateService.formatDate(item['dateFrom']),
        dateTo: myDateTo,
        workPlace: item['workPlace.name'],
        dictEmpCategoryIDDescription: item['dictEmpCategoryID.description'],
        dictStaffCatIDName: item['dictStaffCatID.name'],
        workScheduleIDName: item['workScheduleID.name'],
        payElIDName: item['payElID.name'],
        contractType: item['contractType'],
        dictContractKindIDName: item['dictContractKindID.name'],
        organizationName: item['orgName'],
        selfStructDepName: item['selfStructDepName'],
        depName: item['depName'],
        dictPositionIDName: item['dictPositionID.name'],
        posNameAddition: item['posNameAddition'],
        dictFundSourceID: dictFundSourceID
      })
    }
  })

  if (mParams.dictFundSourceID) {
    massiveData = massiveData.filter(function (item) {
      return item.dictFundSourceID === mParams.dictFundSourceID
    })
  }
  mParams.resultReportData = JSON.stringify(massiveData)
}

me.getListDictPositionSearch = function (ctx) {
  const mParams = ctx.mParams.params
  const myEntity = ctx.mParams.params.myEntity

  let querryFieldList = ['ID', 'code', 'name', 'fullName']
  let miDeleteDateParam = false
  let schemeIDMiDeleteDate, schemeID, dateToParam, idDateParam, isActiveDateParam, notNullParam, nameParam

  if (myEntity === 'hr_dictProfession') {
    querryFieldList.push('dictProfessionID.mi_deleteDate', 'dictProfessionID.ID')
    miDeleteDateParam = 'dictProfessionID.mi_deleteDate'
    idDateParam = 'dictProfessionID.ID'
  } else if (myEntity === 'hr_dictStaffCat') {
    querryFieldList.push('dictStaffCatID.mi_deleteDate', 'dictStaffCatID')
    miDeleteDateParam = 'dictStaffCatID.mi_deleteDate'
    idDateParam = 'dictStaffCatID'
  } else if (myEntity === 'hr_dictWagePay') {
    querryFieldList.push('dictWagePayID.dateTo', 'dictWagePayID', 'dictWagePayID.mi_deleteDate')
    dateToParam = 'dictWagePayID.dateTo'
    idDateParam = 'dictWagePayID'
    miDeleteDateParam = 'dictWagePayID.mi_deleteDate'
  } else if (myEntity === 'hr_dictStatePay') {
    querryFieldList.push('dictStatePayID.dateTo', 'dictStatePayID', 'dictStatePayID.mi_deleteDate')
    dateToParam = 'dictStatePayID.dateTo'
    idDateParam = 'dictStatePayID'
    miDeleteDateParam = 'dictStatePayID.mi_deleteDate'
  } else if (myEntity === 'hr_dictStaffSubCat') {
    querryFieldList.push('dictStaffSubCatID.mi_deleteDate', 'dictStaffSubCatID')
    miDeleteDateParam = 'dictStaffSubCatID.mi_deleteDate'
    idDateParam = 'dictStaffSubCatID'
  } else if (myEntity === 'hr_specialty') {
    querryFieldList.push('dictSpecialtyID.isActive', 'dictSpecialtyID', 'dictSpecialtyID.mi_deleteDate')
    isActiveDateParam = 'dictSpecialtyID.isActive'
    idDateParam = 'dictSpecialtyID'
    miDeleteDateParam = 'dictSpecialtyID.mi_deleteDate'
  } else if (myEntity === 'hr_dictEmpCategoryClass') {
    querryFieldList.push('dictEmpCategoryID.mi_deleteDate', 'dictEmpCategoryID')
    miDeleteDateParam = 'dictEmpCategoryID.mi_deleteDate'
    idDateParam = 'dictEmpCategoryID'
  } else if (myEntity === 'hr_dictTarifCoeffOnly') {
    querryFieldList.push('dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictTarifCoeffID.mi_deleteDate', 'dictTarifCoeffID.dateTo')
    idDateParam = 'dictTarifCoeffID'
    miDeleteDateParam = 'dictTarifCoeffID.mi_deleteDate'
    dateToParam = 'dictTarifCoeffID.dateTo'
  } else if (myEntity === 'hr_workSchedule') {
    querryFieldList.push('workScheduleID.dateTo', 'workScheduleID', 'workScheduleID.mi_deleteDate')
    dateToParam = 'workScheduleID.dateTo'
    idDateParam = 'workScheduleID'
    miDeleteDateParam = 'workScheduleID.mi_deleteDate'
  } else if (myEntity === 'trf_worknorm') {
    querryFieldList.push('workNormID.mi_deleteDate', 'workNormID')
    miDeleteDateParam = 'workNormID.mi_deleteDate'
    idDateParam = 'workNormID'
  } else if (myEntity === 'ac_dictCostType') {
    querryFieldList.push('dictCostTypeID.dateTo', 'dictCostTypeID', 'dictCostTypeID.mi_deleteDate')
    dateToParam = 'dictCostTypeID.dateTo'
    idDateParam = 'dictCostTypeID'
    miDeleteDateParam = 'dictCostTypeID.mi_deleteDate'
  } else if (myEntity === 'hr_dictSalarySchemeLevel') {
    querryFieldList.push('dictSalarySchemeLevelID', 'dictSalarySchemeLevelID.dictSalarySchemeID.mi_deleteDate', 'dictSalarySchemeLevelID.dictSalarySchemeID', 'dictSalarySchemeLevelID.isActive', 'dictSalarySchemeLevelID.dateTo', 'dictSalarySchemeLevelID.mi_deleteDate')
    dateToParam = 'dictSalarySchemeLevelID.dateTo'
    idDateParam = 'dictSalarySchemeLevelID'
    isActiveDateParam = 'dictSalarySchemeLevelID.isActive'
    miDeleteDateParam = 'dictSalarySchemeLevelID.mi_deleteDate'
    schemeIDMiDeleteDate = 'dictSalarySchemeLevelID.dictSalarySchemeID.mi_deleteDate'
    schemeID = 'dictSalarySchemeLevelID.dictSalarySchemeID'
  } else if (myEntity === 'hr_payEl') {
  } else if (myEntity === 'hr_dictEmpCategory') {
    querryFieldList.push('dictEmpCategoryID.mi_deleteDate', 'dictEmpCategoryID', 'dictEmpCategoryID.name')
    miDeleteDateParam = 'dictEmpCategoryID.mi_deleteDate'
    idDateParam = 'dictEmpCategoryID'
    nameParam = 'dictEmpCategoryID.name'
  } else if (myEntity === 'hr_dictTarifCoeff') {
    querryFieldList.push('dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictTarifCoeffID.mi_deleteDate', 'dictTarifCoeffID.dateTo')
    idDateParam = 'dictTarifCoeffID'
    miDeleteDateParam = 'dictTarifCoeffID.mi_deleteDate'
    dateToParam = 'dictTarifCoeffID.dateTo'
  } else if (myEntity === 'hr_dictAcademStatus') {
    querryFieldList.push('dictAcademStatusID.mi_deleteDate', 'dictAcademStatusID.ID')
    miDeleteDateParam = 'dictAcademStatusID.mi_deleteDate'
    idDateParam = 'dictAcademStatusID.ID'
  } else if (myEntity === 'hr_dictDegree') {
    querryFieldList.push('dictDegreeID.mi_deleteDate', 'dictDegreeID.ID')
    miDeleteDateParam = 'dictDegreeID.mi_deleteDate'
    idDateParam = 'dictDegreeID.ID'
  }

  const resultQuestion = UB.Repository('hr_dictPosition')
    .attrs(querryFieldList)
    .whereIf(idDateParam, idDateParam, 'isNotNull')
    .where('isActive', '=', 1)
    .selectAsObject()

  let resultQuestion2 = []

  if (myEntity === 'hr_dictSalarySchemeLevel') {
    resultQuestion2 = UB.Repository('hr_dictSalarySchemeDet')
      .attrs('dictSalarySchemeLevelID', 'dateTo', 'mi_deleteDate')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  } else if (myEntity === 'hr_payEl') {
    resultQuestion2 = UB.Repository('hr_dictPositionPayEl')
      .attrs('ID', 'payElID', 'dateTo', 'mi_deleteDate', 'dictPositionID', 'payElID.dateTo', 'payElID.mi_deleteDate')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  } else if (myEntity === 'hr_dictEmpCategory') {
    resultQuestion2 = UB.Repository('hr_dictEmpCatTarifPos')
      .attrs('ID', 'dictEmpCategoryID', 'dateTo', 'mi_deleteDate', 'dictPositionID', 'dictEmpCategoryID.mi_deleteDate')
      .selectAsObject()
  } else if (myEntity === 'hr_dictTarifCoeff') {
    resultQuestion2 = UB.Repository('hr_dictEmpCatTarifPos')
      .attrs('ID', 'dictTarifCoeffID', 'dateTo', 'mi_deleteDate', 'dictPositionID', 'dictTarifCoeffID.mi_deleteDate', 'dictTarifCoeffID.dateTo')
      .misc({ __allowSelectSafeDeleted: true })
      .selectAsObject()
  }

  let massiveData = []
  for (const row of resultQuestion) {
    let myIDparam = row[idDateParam]
    let descriptionProblem = 'ID = ' + myIDparam + ': '
    if (myIDparam !== null) {
      if (myEntity === 'hr_dictSalarySchemeLevel') {
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictSalarySchemeLevelID === row['dictSalarySchemeLevelID']
        )

        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('запис видалено') + '; '
        }
        if (dateService.unshiftDate(row[dateToParam]) < mParams.dateTo) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('завершено термін дії') + '; '
        }
        if (!row[isActiveDateParam]) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('знято ознаку дії') + '; '
        }

        if (dateService.unshiftDate(row[schemeIDMiDeleteDate]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('запис схеми посадових окладів є видаленим') + ' (ID = ' + row[schemeID] + '); '
        }

        if (filteredRecords.length && filteredRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo || dateService.unshiftDate(record.mi_deleteDate) < dateService.unshiftDate(dateService.maxDate()))) {
          descriptionProblem = descriptionProblem + UB.i18n('жоден запис окладу для обраного рівня станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним')
        }
      } else if (myEntity === 'hr_payEl') {
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictPositionID === row['ID']
        )
        const filteredActualRecords = filteredRecords.filter(record =>
          record.mi_deleteDate === '9999-12-31T00:00:00Z'
        )
        for (const filteredRow of filteredActualRecords) {
          myIDparam = row['ID']
          descriptionProblem = ''
          if (dateService.unshiftDate(filteredRow['payElID.mi_deleteDate']) < dateService.unshiftDate(dateService.maxDate())) {
            descriptionProblem = descriptionProblem + ' ' + UB.i18n('запис виду оплат є видаленим') + ' (ID = ' + filteredRow['payElID'] + '); '
          }
        }
        if (filteredActualRecords.length && filteredActualRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo || dateService.unshiftDate(record.mi_deleteDate) < dateService.unshiftDate(dateService.maxDate()))) {
          descriptionProblem = descriptionProblem + ' ' + UB.i18n('жоден запис виду оплати станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним')
        }
      } else if (myEntity === 'hr_dictEmpCategory') {
        descriptionProblem = ''
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictPositionID === row['ID']
        )
        const filteredActualRecords = filteredRecords.filter(record =>
          record.mi_deleteDate === '9999-12-31T00:00:00Z'
        )
        if (filteredActualRecords.length && filteredActualRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo || dateService.unshiftDate(record.mi_deleteDate) < dateService.unshiftDate(dateService.maxDate()))) {
          descriptionProblem = UB.i18n('жоден запис категорії станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним') + '; '
        }
        for (const rowActualRecords of filteredActualRecords) {
          if (dateService.unshiftDate(rowActualRecords['dictEmpCategoryID.mi_deleteDate']) < dateService.unshiftDate(dateService.maxDate())) {
            descriptionProblem = descriptionProblem + UB.i18n('запис довідника категорій є видаленим ') + '(ID = ' + rowActualRecords['dictEmpCategoryID'] + '); '
            break
          }
        }
      } else if (myEntity === 'hr_dictTarifCoeff') {
        descriptionProblem = ''
        const filteredRecords = resultQuestion2.filter(record =>
          record.dictPositionID === row['ID']
        )
        const filteredActualRecords = filteredRecords.filter(record =>
          record.mi_deleteDate === '9999-12-31T00:00:00Z'
        )
        if (filteredActualRecords.length && filteredActualRecords.every(record => dateService.unshiftDate(record.dateTo) <= mParams.dateTo)) {
          descriptionProblem = UB.i18n('жоден запис тарифного розряду станом на') + ' ' + dateService.formatDate(mParams.dateTo, 'dd.mm.yyyy') + ' ' + UB.i18n('не є актуальним') + '; '
        }
        for (const rowActualRecords of filteredActualRecords) {
          if (dateService.unshiftDate(rowActualRecords['dictTarifCoeffID.mi_deleteDate']) < dateService.unshiftDate(dateService.maxDate())) {
            descriptionProblem = descriptionProblem + UB.i18n('запис довідника тарифних розрядів є видаленим ') + '(ID = ' + rowActualRecords['dictTarifCoeffID'] + '); '
            break
          }
        }
      } else {
        if (dateService.unshiftDate(row[miDeleteDateParam]) < dateService.unshiftDate(dateService.maxDate())) {
          descriptionProblem = descriptionProblem + UB.i18n('запис видалено') + '; '
        }
        if (dateService.unshiftDate(row[dateToParam]) <= mParams.dateTo) {
          descriptionProblem = descriptionProblem + UB.i18n('завершено термін дії') + '; '
        }
        if (row[isActiveDateParam] === 0) {
          descriptionProblem = descriptionProblem + UB.i18n('знято ознаку дії') + '; '
        }
      }
      if (descriptionProblem === 'ID = ' + myIDparam + ': ') {
        descriptionProblem = ''
      }
      if (descriptionProblem.slice(-2) === '; ') {
        descriptionProblem = descriptionProblem.slice(0, -2)
      }
      if (descriptionProblem !== '') {
        massiveData.push(
          {
            DescriptionProblem: descriptionProblem,
            ID: row['ID'],
            code: row['code'],
            name: row['name'],
            fullName: row['fullName']
          }
        )
      }
    }
  }
  mParams.resultData = JSON.stringify(massiveData)
}

me.getListFixedVacationDaysSearch = function (ctx) {
  const mParams = ctx.mParams.params

  let orgIDs = []

  if (mParams.organizationID) {
    orgIDs = [mParams.organizationID]
    if (mParams.includeChildOrgs) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${mParams.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [mParams.organizationID]
  }

  let depName = ''
  let deptIDs = null
  if (mParams.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', mParams.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: mParams.onDate })
      .selectSingle()
    depName = dept.description || dept.fullName

    if (mParams.includeChildDepts) {
      depName += ' (з підлеглими)'
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', mParams.organizationID)
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [mParams.departmentID]
      }
    } else {
      deptIDs = [mParams.departmentID]
    }
  }

  let massiveData = []
  let listAttrs = ['empVacationPlanID.employeeID.fullFIO', 'empVacationPlanID.employeeNumberID.posName', 'empVacationPlanID.dictVacationKindID.name', 'dayFix', 'empVacationPlanID.employeeNumberID.depName', 'empVacationPlanID.employeeNumberID.selfStructDepName', 'empVacationPlanID.employeeNumberID.selfStructDepID', 'empVacationPlanID.employeeNumberID.depID', 'empVacationPlanID.employeeID', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID', 'dateFrom', 'dateTo']
  if (mParams.WithDetailsByPeriods) {
    listAttrs.push('description')
  }

  let result = UB.Repository('hr_empVacationPeriod')
    .attrs(listAttrs)
    .where('empVacationPlanID.employeeNumberID.orgID', 'in', orgIDs)
    .whereIf(deptIDs, 'empVacationPlanID.employeeNumberID.depID', 'in', deptIDs)
    .whereIf(mParams.dictStaffCatID, 'empVacationPlanID.employeeNumberID.dictStaffCatID', '=', mParams.dictStaffCatID)
    .whereIf(mParams.dictVacationKindID, 'empVacationPlanID.dictVacationKindID', 'in', mParams.dictVacationKindID.split(','))
    .whereIf(mParams.workPlace, 'empVacationPlanID.employeeNumberID.workPlaceCode', '=', mParams.workPlace)
    .where('dayFix', '>', 0)
    .where('dateTo', '<=', mParams.dateFrom)
    .orderBy('empVacationPlanID.employeeID.fullFIO', 'empVacationPlanID.employeeNumberID.posName', 'empVacationPlanID.dictVacationKindID.name', 'dateTo')
    .selectAsObject()

  if (mParams.WithDetailsByPeriods) {
    result.forEach((itemResult) => {
      massiveData.push({
        fullFIO: itemResult['empVacationPlanID.employeeID.fullFIO'],
        actualPositionName: itemResult['empVacationPlanID.employeeNumberID.posName'],
        dictVacationKindIDName: itemResult['empVacationPlanID.dictVacationKindID.name'],
        dayFix: itemResult['dayFix'] || 0,
        organizationID: mParams.organizationID,
        posID: null,
        depID: itemResult['empVacationPlanID.employeeNumberID.depID'],
        description: itemResult['description'],
        depName: itemResult['empVacationPlanID.employeeNumberID.depName'],
        selfStructDepName: itemResult['empVacationPlanID.employeeNumberID.selfStructDepName'],
        selfStructDepID: itemResult['empVacationPlanID.employeeNumberID.selfStructDepID'],
        firstPeriod: itemResult['dateFrom'],
        lastPeriod: itemResult['dateTo']
      })
    })
  } else {
    result.forEach((itemResult) => {
      const foundItem = massiveData.find(item => item.employeeID === itemResult['empVacationPlanID.employeeID'] && item.dictVacationKindID === itemResult['empVacationPlanID.dictVacationKindID'] && item.empVacationPlanID === itemResult['empVacationPlanID'])

      const foundItemResult = result.filter(item =>
        item['empVacationPlanID.employeeID'] === itemResult['empVacationPlanID.employeeID'] &&
        item.empVacationPlanID === itemResult['empVacationPlanID'] &&
        item.dayFix > 0
      )

      if (foundItem) {
        foundItem.dayFix = foundItem.dayFix + itemResult['dayFix']
        if (foundItemResult.length) {
          foundItemResult.forEach(item => {
            if (!foundItem.lastPeriod) {
              foundItem.lastPeriod = item.dateTo
            } else if (dateService.unshiftDate(foundItem.lastPeriod) < dateService.unshiftDate(item.dateTo)) {
              foundItem.lastPeriod = item.dateTo
            }
          })
        } else {
          foundItem.lastPeriod = itemResult['dateTo']
        }
        if (foundItemResult.length) {
          foundItemResult.forEach(item => {
            if (!foundItem.firstPeriod) {
              foundItem.firstPeriod = item.dateFrom
            } else if (dateService.unshiftDate(foundItem.firstPeriod) > dateService.unshiftDate(item.dateFrom)) {
              foundItem.firstPeriod = item.dateFrom
            }
          })
        } else {
          foundItem.firstPeriod = itemResult['dateFrom']
        }
      } else {
        massiveData.push({
          fullFIO: itemResult['empVacationPlanID.employeeID.fullFIO'],
          actualPositionName: itemResult['empVacationPlanID.employeeNumberID.posName'],
          dictVacationKindIDName: itemResult['empVacationPlanID.dictVacationKindID.name'],
          dayFix: itemResult['dayFix'] || 0,
          organizationID: mParams.organizationID,
          posID: null,
          depID: itemResult['empVacationPlanID.employeeNumberID.depID'],
          description: itemResult['description'],
          employeeID: itemResult['empVacationPlanID.employeeID'],
          dictVacationKindID: itemResult['empVacationPlanID.dictVacationKindID'],
          empVacationPlanID: itemResult['empVacationPlanID'],
          firstPeriod: itemResult['dateFrom'],
          lastPeriod: itemResult['dateTo'],
          depName: itemResult['empVacationPlanID.employeeNumberID.depName'],
          selfStructDepName: itemResult['empVacationPlanID.employeeNumberID.selfStructDepName'],
          selfStructDepID: itemResult['empVacationPlanID.employeeNumberID.selfStructDepID']
        })
      }
    }
    )
    massiveData.forEach((item) => {
      item.description = dateService.formatDate(item.firstPeriod) + ' - ' + dateService.formatDate(item.lastPeriod)
    })
  }

  massiveData.sort((a, b) => {
    if (a.fullFIO > b.fullFIO) return -1
    if (a.fullFIO < b.fullFIO) return 1

    if (a.actualPositionName > b.actualPositionName) return -1
    if (a.actualPositionName < b.actualPositionName) return 1

    if (a.dictVacationKindIDName > b.dictVacationKindIDName) return -1
    if (a.dictVacationKindIDName < b.dictVacationKindIDName) return 1

    if (new Date(a.firstPeriod) > new Date(b.firstPeriod)) return -1
    if (new Date(a.firstPeriod) < new Date(b.firstPeriod)) return 1
  })

  massiveData = massiveData.filter(item => item.dayFix !== 0)

  let resultGroup = _.groupBy(massiveData, 'depName')
  let resultGroup2 = _.groupBy(massiveData, 'selfStructDepName')
  if (mParams.showResultsByDep) {
    let myPersonResults = []
    let myOrgResults = []

    const vacationKeys = Object.keys(resultGroup)

    vacationKeys.forEach(item => {
      myPersonResults.push({ depName: item, quantity: resultGroup[item].reduce((sum, obj) => sum + obj.dayFix, 0), depID: resultGroup[item][0].depID, structured: false })
    })

    const vacationKeys2 = Object.keys(resultGroup2)

    vacationKeys2.forEach(item => {
      myPersonResults.push({ depName: item, quantity: resultGroup2[item].reduce((sum, obj) => sum + obj.dayFix, 0), depID: resultGroup2[item][0].selfStructDepID, structured: true })
    })
    if (!mParams.departmentID) {
      myOrgResults.push({ depName: 'організації', quantity: massiveData.reduce((sum, obj) => sum + obj.dayFix, 0) })
    }
    mParams.personResults = JSON.stringify(myPersonResults)
    mParams.orgResults = JSON.stringify(myOrgResults)
  }
  mParams.resultReportData = JSON.stringify(massiveData)
}

me.getListEmployeePositionSearch = function (ctx) {
  const mParams = ctx.mParams.params

  let orgIDs = []

  if (mParams.organizationID) {
    orgIDs = [mParams.organizationID]
    if (mParams.includeChildOrgs) {
      const orgs = UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${mParams.organizationID}/%`)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      if (orgs.length) {
        orgIDs = orgs.map(o => o.mi_data_id)
      }
    }
  } else {
    orgIDs = [mParams.organizationID]
  }

  let deptIDs = []
  if (mParams.departmentID) {
    const dept = UB.Repository('hr_department')
      .attrs(['description', 'fullName', 'mi_treePath'])
      .where('mi_data_id', '=', mParams.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: mParams.onDate })
      .selectSingle()

    if (mParams.includeChildDepts) {
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('orgID', '=', mParams.organizationID)
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'startsWith', dept.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsObject()
      if (departments.length) {
        deptIDs = departments.map(o => o.mi_data_id)
      } else {
        deptIDs = [mParams.departmentID]
      }
    } else {
      deptIDs = [mParams.departmentID]
    }
  }

  let massiveOrgEmployee = UB.Repository('hr_employeePosition')
    .attrs(['employeeID'])
    .where('workPlace', '=', 1)
    .whereIf(orgIDs.length, 'organizationID', 'in', orgIDs)
    .whereIf(deptIDs.length, 'departmentID', 'in', deptIDs)
    .where('dateTo', '>', mParams.dateTo)
    .where('dateFrom', '<=', mParams.dateTo)
    .selectAsArrayOfValues()

  let reultQuestion = UB.Repository('hr_employeePosition')
    .attrs(['ID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'positionID', 'departmentID', 'organizationID', 'employeeID'])
    .where('workPlace', '=', 1)
    .where('employeeID', 'in', massiveOrgEmployee)
    .where('dateTo', '>', mParams.dateTo)
    .where('dateFrom', '<=', mParams.dateTo)
    .groupBy(['ID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'positionID', 'departmentID', 'organizationID', 'employeeID'])
    .orderBy('employeeID')
    .selectAsObject({
      'employeeID.fullFIO': 'fullFIO',
      'employeeNumberID.tabNum': 'tabNum',
      'positionID': 'positionIDName',
      'departmentID': 'departmentIDName',
      'organizationID': 'organizationIDName' })

  let groupedData = {}
  reultQuestion.forEach(function (item) {
    if (!groupedData[item.employeeID]) {
      groupedData[item.employeeID] = []
    }
    groupedData[item.employeeID].push(item)
  })

  let filteredData = Object.values(groupedData).filter(function (items) {
    return items.length >= 2
  })

  filteredData.sort(function (a, b) {
    return a[0].employeeID - b[0].employeeID
  })

  let endResult = [].concat.apply([], filteredData)

  let columnPos = endResult.map(obj => obj.positionIDName).filter(name => name !== null)
  let columnDep = endResult.map(obj => obj.departmentIDName).filter(name => name !== null)
  let columnOrg = endResult.map(obj => obj.organizationIDName).filter(name => name !== null)

  let allNameOrgs = UB.Repository('hr_organization')
    .attrs('ID', 'name')
    .where('ID', 'in', columnOrg)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  let allNamePos = UB.Repository('hr_position')
    .attrs('ID', 'name')
    .where('ID', 'in', columnPos)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  let allDepName = UB.Repository('hr_department')
    .attrs('ID', 'name')
    .where('ID', 'in', columnDep)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  endResult.forEach(row => {
    let foundItemNamePos = allNamePos.filter(item => item.ID === row.positionIDName)
    let foundItemNameDep = allDepName.filter(item => item.ID === row.departmentIDName)
    let foundItemNameOrgs = allNameOrgs.filter(item => item.ID === row.organizationIDName)

    if (foundItemNameOrgs.length) {
      row.organizationIDName = foundItemNameOrgs[0].name
    }
    if (foundItemNamePos.length) {
      row.positionIDName = foundItemNamePos[0].name
    }
    if (foundItemNameDep.length) {
      row.departmentIDName = foundItemNameDep[0].name
    }
  })
  mParams.resultData = JSON.stringify(endResult)
}

me.getListExtraRankAssignments = function (ctx) {
  const mParams = ctx.mParams.params

  const { dateTo = dateService.shiftDate(mParams.dateTo), orgIDs, deptIDs, isDepartment = deptIDs.length } = mParams
  // const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', appAC.globalOrganization()) === true
  // ,${useActualPositionName ? `ep.factPosName` : `${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name', 'ep.dictPositionID')}`} as "posName"

  const store = UB.DataStore('hr_employeePosition')

  store.runSQL(`
  SELECT e.ID, e.fullFIO, p.tabNum, ep.positionID, ep.departmentID, ep.organizationID
  ,${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name')} as "departmentName"
  ,${staffService.getOrgFldOnDateSql(':dateTo:', 'ep.organizationID', 'name')} as "orgName"
  ,${staffService.getPosFldOnDateSql2(':dateTo:', 'ep.positionID', 'name')} as "positionName"
  FROM hr_employeePosition ep
  INNER JOIN hr_employee e ON ep.employeeID = e.ID
  AND e.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_employeeNumber p ON ep.employeeNumberID = p.ID
  AND p.mi_deleteDate >= '9999-12-31'
  WHERE 
  ep.mi_deleteDate >= '9999-12-31'
  AND ep.isActive = 1
  AND ep.dateFrom <= :onDate:
  AND ep.dateTo >= :onDate:
  AND ep.organizationID${entityBaseService.getInExpression('orgIDs')}
  ${isDepartment ? 'AND departmentID' + entityBaseService.getInExpression('deptIDs') : ''}
  AND ((
    SELECT COUNT(*)
    FROM hr_publServRang r
    WHERE r.employeeID = e.ID
    AND r.dateTo >= '9999-12-31'
    AND r.mi_deleteDate >= '9999-12-31'
  ) >= 2 OR (
    SELECT COUNT(*)
    FROM hr_publServRang r
    WHERE r.employeeID = e.ID
  AND (r.dateTo >= '2020-08-17' AND r.dateFrom <= '2020-08-17')
    AND r.mi_deleteDate >= '9999-12-31'
) >= 2 )
    `, {
    onDate: dateService.todayDate(),
    orgIDs,
    deptIDs,
    dateTo
  })

  const empData = store.getAsJsObject()

  mParams.resultData = JSON.stringify(empData)
}
