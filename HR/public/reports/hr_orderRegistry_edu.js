/* global UB AC appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData (reportParams) {
    const dictFundSourceIDs = reportParams.dictFundSourceIDs && reportParams.dictFundSourceIDs.length ? reportParams.dictFundSourceIDs.split(',').map(o => Number(o) || null) : []
    const dictProgClassIDs = reportParams.dictProgClassIDs && reportParams.dictProgClassIDs.length ? reportParams.dictProgClassIDs.split(',').map(o => Number(o) || null) : []
    return Promise.all([
      UB.Repository('hr_orderRegistryDt')
        .attrs(['ID', 'tabNum', 'employeeNumberID.description', 'posName', 'rate', 'baseSum', 'rateOff', 'paySumOff', 'paySum', 'periodCalcID.name', 'periodSalaryID.name', 'orderRegistryID.docNumber', 'orderRegistryID.orderDate', 'dictFundSourceID', 'dictProgClassID'])
        .where('orderRegistryID', '=', reportParams.instanceID)
        .where('mi_deleteDate', '>=', '#maxdate')
        .whereIf(dictFundSourceIDs.length, 'dictFundSourceID', '=', dictFundSourceIDs)
        .whereIf(dictProgClassIDs.length, 'dictProgClassID', '=', dictProgClassIDs)
        .selectAsObject({
          'employeeNumberID.description': 'employeeFIO', 'periodCalcID.name': 'periodCalcName', 'periodSalaryID.name': 'periodSalaryName', 'orderRegistryID.docNumber': 'docNumber', 'orderRegistryID.orderDate': 'orderDate'
        }),
      UB.Repository('hr_orderRegistry')
        .attrs(['orderNumber', 'periodID.name', 'docNumber', 'orderDate'])
        .where('mi_deleteDate', '>=', '#maxdate')
        .selectById(reportParams.instanceID),
      UB.Repository('hr_organization')
        .attrs(['name'])
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
        .selectById(appAC.globalOrganization())
    ]).then(([orderRegistryDt, orderRegistry, organizationName]) => ({
      orderRegistryDt,
      orderRegistry,
      organizationName
    }))
  },
  getParams: function (data, reportParams) {
    const result = {
      orgName: data.organizationName ? data.organizationName.name : '',
      periodName: data.orderRegistry['periodID.name'] || '',
      docNumber: data.orderRegistry.docNumber || '',
      docDate: data.orderRegistry.orderDate ? `${AC.dateService.formatDate(data.orderRegistry.orderDate)} року` : '',
      orderRegistryDt: data.orderRegistryDt.map((item) => {
        return {
          periodCalcName: item.periodCalcName ? item.periodCalcName : item.periodSalaryName,
          employeeFIO: item.employeeFIO || '',
          posName: item.posName || '',
          rate: item.rate || 0,
          baseSum: item.baseSum || 0,
          rateOff: item.rateOff || 0,
          paySumOff: item.paySumOff || 0,
          paySum: item.paySum || 0
        }
      }),
      total: {
        baseSum: 0,
        paySumOff: 0,
        paySum: 0
      }
    }
    result.total.baseSum = data.orderRegistryDt.reduce((result, item) => (AC.currencyService.round(result + item.baseSum, 2)), 0)
    result.total.paySumOff = data.orderRegistryDt.reduce((result, item) => (AC.currencyService.round(result + item.paySumOff, 2)), 0)
    result.total.paySum = data.orderRegistryDt.reduce((result, item) => (AC.currencyService.round(result + item.paySum, 2)), 0)
    return AC.reportService.removeEmptyValues(result)
  }
}
