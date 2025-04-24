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
    result.colNames = []
    result.colNames2 = []
    result.colNums = []

    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID || 0 })
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

    const posData = await HR.orgStructReportUtils.getPositionData(onDate, childOrgIDs, departments, reportParams.dictFundSourceID, reportParams.positionCategory, result.showAddInfo, result.showTarifInfo || result.showTarifTable)

    const repCode = '09'
    const repSetParam = await UB.Repository('hr_repSetParam')
      .attrs(['ID', 'name'])
      .where('dictStReportID.code', '=', repCode)
      .orderBy('reportNumStrPadded')
      .selectAsObject()
    let repSetElement = await HR.accrualService.accrualSumGetSetElementsPromise(nextOnDate, repCode).selectAsObject()
    repSetElement = _.groupBy(repSetElement, 'repSetParamID')

    const accrualData = []
    for (let i = 0; i < repSetParam.length; i++) {
      accrualData.push({
        elements: repSetElement[repSetParam[i].ID] ? repSetElement[repSetParam[i].ID].map(el => el.elementID) : [],
        value: 0,
        valueQuantity: 0
      })
      result.colNames.push({ name: repSetParam[i].name })
      result.colNames2.push({ name: ' ' })
    }
    result.colCount = accrualData.length
    result.showDepColumn = reportParams.onlyRowsOnExport && reportType === 'xlsx'
    result.colSpan = result.colCount + 9 + (result.showAddInfo ? 5 : 0) + (result.showEmpInfo ? 4 : 0) +
      (result.showFop ? 1 : 0) + (result.showTarifInfo && result.showAddInfo ? 1 : 0) + (result.showTarifInfo && result.showEmpInfo ? 1 : 0) +
      (result.showDepColumn ? 1 : 0)
    result.colSpanPaymentType = result.colCount + 4 + (result.showFop ? 1 : 0)
    result.colSpan2 = Math.ceil(result.colSpan / 2) < 7 ? Math.ceil(result.colSpan / 2) : 7
    result.colSpan1 = result.colSpan - result.colSpan2
    result.colSpan3 = Math.ceil(result.colSpan / 2)
    result.colSpan4 = result.colSpan - result.colSpan3
    result.tableWidth = 890 + (result.colCount * 80) + (result.showAddInfo ? 500 : 0) + (result.showEmpInfo ? 460 : 0) +
      (result.showFop ? 100 : 0) + (result.showTarifInfo && result.showAddInfo ? 80 : 0) + (result.showTarifInfo && result.showEmpInfo ? 120 : 0) +
      (result.showDepColumn ? 150 : 0)
    result.dateEntryStr = onDate ? AC.dateService.formatDate(onDate, 'dd mmm yyyy') + ' р.' : '"___" _______________ 20__ р.'

    for (let i = (result.showNn ? 3 : 2); i <= result.colSpan - (result.showNn ? 0 : 1); i++) {
      result.colNums.push({ name: i })
    }

    const positionAccrualData = await UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'accrualSum', 'accrualRate', 'payElID', 'calcSum'])
      .whereIf(childOrgIDs.length, 'positionID.orgID', 'in', childOrgIDs)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .exists(HR.accrualService.accrualSumGetSetElementsPromise(nextOnDate, repCode).correlation('elementID', 'payElID'))
      .selectAsObject()

    result.minSalarySum = await UB.Repository('hr_dictSalaryMinSize')
      .attrs(['monthValue'])
      .where('[dateFrom]', '<=', onDate)
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectScalar() || 0

    const empDataPromise = result.showEmpInfo ? HR.orgStructReportUtils.getEmployeePositionData(onDate, childOrgIDs, departments, reportParams.dictFundSourceID, reportParams.positionCategory, result.showTarifInfo) : undefined
    const empData = result.showEmpInfo ? await empDataPromise.selectAsObject() : undefined

    let employeeIDs = !result.showEmpInfo || empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeID)))
    const empCertificationAcc = result.showEmpInfo ? await HR.orgStructReportUtils.getEmpCertificationAccData(employeeIDs, empDataPromise) : {}
    const employeeExperience = result.showEmpInfo ? await HR.orgStructReportUtils.getEmployeeExperience(employeeIDs, empDataPromise) : {}
    const employeeRankData = result.showEmpInfo ? await HR.orgStructReportUtils.getEmployeeRankData(onDate, employeeIDs, empDataPromise) : []

    employeeIDs = !result.showEmpInfo || empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
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

    const tree = HR.orgStructReportUtils.generateDataConsolidated(2, onDate, result.showNn, result.colSpan, result.colSpanPaymentType,
      orgs, reportParams.departmentID || reportParams.organizationID || 0, orgStruct, posData, positionAccrualData,
      accrualData, empData, empLongTermAbsc, empCertificationAcc, employeeAccrualData, organizationAccrualData,
      employeeExperience, employeeRankData, dictSalaryRanks, payelExpData,
      result.minSalarySum, result.groupPos, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1,
      result.showDeptCodes, result.showWokers, result.namePosition, result.showEmpInfo, result.showAddInfo,
      result.monthsFop, result.showTarifInfo, result.showTarifTable, result.positionCategoryGroupBy,
      false, result.showDepColumn, result.separateRounding)

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
      if (result.showTarifInfo) {
        sumArray.push('tarifAccrualSumQuantity')
      }
      if (result.showFop) {
        sumArray.push('fundSumByMonths')
      }

      result.dataPC = result.showCategory ? HR.orgStructReportUtils.generateGroupedData(result.data, UB.i18n('Всього за категоріями персоналу'), 'positionCategoryName', UB.i18n('Без категорії'), 'positionCategorySortOrder', accrualData.length, sumArray, result.roundTo, result.roundToQuantity, result.showNn, result.showEmpInfo, result.showAddInfo, result.showFop, result.showTarifInfo) : []
      const dataPT = result.showTarifTable ? HR.orgStructReportUtils.generateGroupedData(result.data, UB.i18n('Всього за тарифними розрядами'), 'tarifName', UB.i18n('Без тарифного розряду'), 'tarifSortOrder', accrualData.length, sumArray, result.roundTo, result.roundToQuantity, result.showNn, result.showEmpInfo, result.showAddInfo, result.showFop, result.showTarifInfo) : []
      if (dataPT && dataPT.length) {
        result.dataPC.push(...dataPT)
      }
    }

    return result
  },
  onParamPanelConfig: function () {
    return HR.orgStructReportUtils.getParamsOrgStructConsolidated(this, 2)
  }
}
