/* global _ UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams, me.reportType).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams, reportType) {
    const onDate = reportParams.onDate || AC.dateService.todayDate()
    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)

    const result = await HR.orgStructReportUtils.getResultObj(reportParams)
    result.showDepColumn = reportParams.onlyRowsOnExport && reportType === 'xlsx'
    result.widthTable = 830 + (result.showEmpInfo ? 460 : 0) + (result.showFop ? 100 : 0) + (result.showDepColumn ? 150 : 0)
    result.colSpan = 8 + (result.showEmpInfo ? 4 : 0) + (result.showFop ? 1 : 0) + (result.showDepColumn ? 1 : 0)
    result.colSpan2 = 5
    result.colSpan1 = result.colSpan - result.colSpan2
    result.colSpan3 = Math.ceil(result.colSpan / 2)
    result.colSpan4 = result.colSpan - result.colSpan3
    result.colSpanPaymentType = 3 + (result.showFop ? 1 : 0)
    result.colNums = []
    for (let i = (result.showNn ? 3 : 2); i <= result.colSpan - (result.showNn ? 0 : 1); i++) {
      result.colNums.push({ name: i })
    }
    /*
    const dateEntry = await UB.Repository('hr_empOrder')
      .attrs('entryDate')
      .where('organizationID', '=', reportParams.organizationID)
      .where('orderState', '=', 'POSTED')
      .where('empOrderType', '=', 'STAFFLIST')
      .where('entryDate', '<=', onDate)
      .orderByDesc('entryDate')
      .limit(1)
      .selectScalar()

    result.dateEntryStr = dateEntry ? AC.dateService.formatDate(dateEntry, 'dd mmm yyyy') + ' р.' : '"___" _______________ 20__ р.'
     */
    result.dateEntryStr = onDate ? AC.dateService.formatDate(onDate, 'dd mmm yyyy') + ' р.' : '"___" _______________ 20__ р.'

    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    if (orgNames) {
      result.organizationName = HR.nameCase.cap(orgNames.nameGen || orgNames.name || '')
      if (orgNames.parentUnitID && (orgNames['parentUnitID.shortName@hr_organization'] || orgNames['parentUnitID.name@hr_organization'])) {
        result.organizationName = HR.nameCase.cap(orgNames.shortName || orgNames.name || '')
        result.organizationName2 = orgNames['parentUnitID.shortName@hr_organization'] || orgNames['parentUnitID.name@hr_organization']
      }
    }

    const departments = await HR.orgStructReportUtils.getDepartmentIDs(onDate, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    const orgStruct = await HR.orgStructReportUtils.getStaffUnitData(onDate, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts, departments)
    if (!orgStruct) {
      return result
    }

    const posData = await HR.orgStructReportUtils.getPositionData(onDate, childOrgIDs, departments, reportParams.dictFundSourceID, reportParams.positionCategory, false)

    const positionAccrualData = await UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.name', 'payElID.shortPrintName', 'calcSum'])
      .whereIf(childOrgIDs.length, 'positionID.orgID', 'in', childOrgIDs)
      .where('payElID.methodID.code', '<>', '144')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      // .where('dateFrom', '<=', onDate)
      // .where('dateTo', '>=', onDate)
      .selectAsObject({
        'positionID.parentUnitID': 'parentUnitID',
        'payElID.name': 'payElName',
        'payElID.shortPrintName': 'shortPayElName'
      })

    let empDataPromise = result.showEmpInfo ? HR.orgStructReportUtils.getEmployeePositionData(onDate, childOrgIDs, departments,
      reportParams.dictFundSourceID, reportParams.positionCategory, false) : undefined
    const empData = result.showEmpInfo ? await empDataPromise.selectAsObject() : undefined

    let employeeIDs = !result.showEmpInfo || empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeID)))
    if (result.showEmpInfo) {
      empDataPromise.correlation('employeeID', 'employeeID')
    }
    const empCertificationAcc = result.showEmpInfo ? await HR.orgStructReportUtils.getEmpCertificationAccData(employeeIDs, empDataPromise) : {}
    const employeeExperience = result.showEmpInfo ? await HR.orgStructReportUtils.getEmployeeExperience(employeeIDs, empDataPromise) : {}
    const employeeRankData = result.showEmpInfo ? await HR.orgStructReportUtils.getEmployeeRankData(onDate, employeeIDs, empDataPromise) : []

    employeeIDs = !result.showEmpInfo || empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
    if (result.showEmpInfo) {
      empDataPromise = HR.orgStructReportUtils.getEmployeePositionData(onDate, childOrgIDs, departments, reportParams.dictFundSourceID, reportParams.positionCategory)
      empDataPromise.correlation('employeeNumberID', 'employeeNumberID')
    }
    const empLongTermAbsc = result.showEmpInfo ? await HR.orgStructReportUtils.getEmpLongTermAbscData(onDate, employeeIDs, empDataPromise) : {}
    const employeeAccrualData = {}
    const organizationAccrualData = {}
    if (result.showEmpInfo) {
      for (let i = 0; i < orgs.length; i++) {
        employeeIDs = empData.filter(el => el.organizationID === orgs[i].mi_data_id).map(el => el.employeeNumberID)
        employeeAccrualData[orgs[i].mi_data_id] = await HR.orgStructReportUtils.getEmployeeAccrualData(onDate, employeeIDs, orgs[i].mi_data_id)
        organizationAccrualData[orgs[i].mi_data_id] = await HR.orgStructReportUtils.getPayPermInfo(orgs[i].mi_data_id, undefined, onDate, onDate, undefined, undefined, 'ReportConsolidated')
      }
    }

    const dictSalaryRanks = result.showEmpInfo ? await HR.accrualService.accrualSumGetDictSalaryRanks(onDate) : []
    const payelExpData = result.showEmpInfo ? await HR.orgStructReportUtils.getPayElExperience(onDate) : []

    const tree = HR.orgStructReportUtils.generateDataConsolidated(1, onDate, result.showNn, result.colSpan, result.colSpanPaymentType,
      orgs, reportParams.departmentID || reportParams.organizationID, orgStruct, posData, positionAccrualData,
      [], empData, empLongTermAbsc, empCertificationAcc, employeeAccrualData, organizationAccrualData,
      employeeExperience, employeeRankData, dictSalaryRanks, payelExpData,
      0, result.groupPos, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1,
      result.showDeptCodes, result.showWokers, result.namePosition, result.showEmpInfo, false,
      result.monthsFop, false, false, [], reportParams.shortNamePay,
      result.showDepColumn, result.separateRounding)

    result.data = tree && tree.data ? tree.data : []
    if (reportParams.onlyRowsOnExport && reportType === 'xlsx') {
      result.data = result.data.filter(el => !el.isTotal && !el.isDepartment)
      // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
      result.data.filter(el => el.paymentType).forEach(el => {
        el.paymentType = ''
      })
    }

    result.totalQuantityStr = HR.reportUtils.quantityToString(tree.total.quantity, tree.total.roundToQuantity)
    result.totalFunsSumStr = HR.reportUtils.quantityToString(tree.total.fundSum, result.roundTo)
    result.totalFunsSumToWord = HR.orgStructReportUtils.fundSumToStr(tree.total.fundSum, result.roundTo)
    if (!(reportParams.onlyRowsOnExport && reportType === 'xlsx')) {
      const sumArray = ['basepayQuantity', 'accrualTotalQuantity', 'addToMinSalary', 'fundSum']
      if (result.showEmpInfo) {
        sumArray.push('accrualSumQuantity')
        sumArray.push('accrualEmpTotal')
      }
      if (result.showFop) {
        sumArray.push('fundSumByMonths')
      }
      result.dataPC = result.showCategory ? HR.orgStructReportUtils.generateGroupedData(result.data, UB.i18n('Всього за категоріями персоналу'),
        'positionCategoryName', UB.i18n('Без категорії'), 'positionCategorySortOrder', 0, sumArray, result.roundTo, result.roundToQuantity,
        result.showNn, result.showEmpInfo, false, result.showFop, false) : []
    }
    return result
  },
  onParamPanelConfig: function () {
    return HR.orgStructReportUtils.getParamsOrgStructConsolidated(this, 1)
  }
}
