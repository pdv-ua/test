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
    const nextOnDate = AC.dateService.addDays(onDate, 1)
    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)

    const result = await HR.orgStructReportUtils.getResultObj(reportParams)
    const repCode = '10'
    /*
    const repSetParam = await UB.Repository('hr_repSetParam')
      .attrs(['ID', 'name'])
      .where('dictStReportID.code', '=', repCode)
      .selectAsObject()
     */
    const repSetElementPromise = HR.accrualService.accrualSumGetSetElementsPromise(nextOnDate, repCode)
    let repSetElement = await repSetElementPromise.selectAsObject()
    repSetElement = _.groupBy(repSetElement, 'repSetParamID.code')

    const accrualData = []
    for (let i = 1; i <= 7; i++) {
      accrualData.push({
        elements: repSetElement[`ConsVS${i}`] ? repSetElement[`ConsVS${i}`].map(el => el.elementID) : [],
        value: 0,
        valueQuantity: 0
      })
    }

    result.showDepColumn = reportParams.onlyRowsOnExport && reportType === 'xlsx'
    result.widthTable = 810 + (result.showEmpInfo ? 100 : 0) + (result.showFop ? 100 : 0) + (accrualData.length * 80) +
      (result.showDepColumn ? 150 : 0)
    result.colSpan = accrualData.length + 9 + (result.showEmpInfo ? 1 : 0) + (result.showFop ? 1 : 0) +
      (result.showDepColumn ? 1 : 0)
    result.colSpan2 = 5
    result.colSpan1 = result.colSpan - result.colSpan2
    result.colSpan3 = Math.ceil(result.colSpan / 2)
    result.colSpan4 = result.colSpan - result.colSpan3
    result.colSpanPaymentType = 2 + (result.showFop ? 1 : 0) + accrualData.length
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

    const posData = await HR.orgStructReportUtils.getPositionData(onDate, childOrgIDs, departments, reportParams.dictFundSourceID, reportParams.positionCategory, false, false, true)

    const positionAccrualData = await UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID', 'calcSum'])
      .whereIf(childOrgIDs.length, 'positionID.orgID', 'in', childOrgIDs)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .exists(repSetElementPromise.correlation('elementID', 'payElID'))
      .selectAsObject({
        'positionID.parentUnitID': 'parentUnitID'
      })

    let empDataPromise = result.showEmpInfo ? HR.orgStructReportUtils.getEmployeePositionData(onDate, childOrgIDs, departments,
      reportParams.dictFundSourceID, reportParams.positionCategory, false) : undefined
    const empData = result.showEmpInfo ? await empDataPromise.selectAsObject() : undefined

    let employeeIDs = !result.showEmpInfo || empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeID)))
    if (result.showEmpInfo) {
      empDataPromise.correlation('employeeID', 'employeeID')
    }

    employeeIDs = !result.showEmpInfo || empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
    if (result.showEmpInfo) {
      empDataPromise = HR.orgStructReportUtils.getEmployeePositionData(onDate, childOrgIDs, departments, reportParams.dictFundSourceID, reportParams.positionCategory)
      empDataPromise.correlation('employeeNumberID', 'employeeNumberID')
    }
    const empLongTermAbsc = result.showEmpInfo ? await HR.orgStructReportUtils.getEmpLongTermAbscData(onDate, employeeIDs, empDataPromise) : {}

    const tree = HR.orgStructReportUtils.generateDataConsolidated(3, onDate, result.showNn, result.colSpan, result.colSpanPaymentType,
      orgs, reportParams.departmentID || reportParams.organizationID, orgStruct, posData, positionAccrualData,
      accrualData, empData, empLongTermAbsc, [], {}, {},
      [], [], [], [],
      0, result.groupPos, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1,
      result.showDeptCodes, result.showWokers, result.namePosition, result.showEmpInfo, false,
      result.monthsFop, false, false, [], false,
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
      const sumArray = ['basepayQuantity', 'fundSum']

      if (result.showFop) {
        sumArray.push('fundSumByMonths')
      }
      result.dataPC = result.showCategory ? HR.orgStructReportUtils.generateGroupedData(result.data, UB.i18n('Всього за категоріями персоналу'),
        'positionCategoryName', UB.i18n('Без категорії'), 'positionCategorySortOrder', accrualData.length, sumArray, result.roundTo, result.roundToQuantity,
        result.showNn, result.showEmpInfo, false, result.showFop, false) : []
    }
    return result
  },
  onParamPanelConfig: function () {
    return HR.orgStructReportUtils.getParamsOrgStructConsolidated(this, 3)
  }
}
