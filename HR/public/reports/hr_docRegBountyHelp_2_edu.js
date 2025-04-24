/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData (reportParams) {
    return Promise.all([
      UB.Repository('hr_docRegBountyHelp')
        .attrs(['ID', 'orderNumber', 'orderDate', 'countMonth', 'avgSumMonth', 'dateFrom',
          'employeePositionID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'employeeNumberID', 'dateFromAvg', 'dateToAvg', 'employeeID.empTaxCodeType.name', 'employeeID.taxCode', 'employeePositionID.positionID.name', 'employeePositionID.dictPositionID.name', 'employeePositionID.departmentID', 'employeePositionID.organizationID'])
        .selectById(reportParams.instanceID),
      UB.Repository('hr_accrualAvg')
        .attrs(['periodID.name', 'periodID.dateFrom', 'periodID.dateTo', 'opDays', 'opSum', 'baseSum', 'accrualDt'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'periodID.name': 'periodName',
          'periodID.dateFrom': 'dateFrom',
          'periodID.dateTo': 'dateTo'
        }),
      UB.Repository('hr_orderRegistryDt')
        .attrs(['payElID.name', 'periodSalaryID.description', 'periodSalaryID.dateFrom',
          'periodSalaryID.dateTo', 'countMonth', 'baseSum', 'paySum', 'payElID.genName', 'accrualDt'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'payElID.name': 'payElName',
          'periodSalaryID.description': 'description',
          'payElID.genName': 'payElGenName'
        })
    ]).then(([docRegAvgMonth, empOrderAvg, orderRegistryDt]) => {
      return Promise.all([
        UB.Repository('hr_organization')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('mi_dateFrom', '<=', docRegAvgMonth.orderDate || docRegAvgMonth.dateFrom)
          .where('mi_dateTo', '>=', docRegAvgMonth.orderDate)
          .selectById(docRegAvgMonth['employeePositionID.organizationID']),
        UB.Repository('hr_department')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', docRegAvgMonth['employeePositionID.organizationID'])
          .where('mi_dateFrom', '<=', docRegAvgMonth.orderDate || docRegAvgMonth.dateFrom)
          .where('mi_dateTo', '>=', docRegAvgMonth.orderDate)
          .where('mi_deleteDate', '>=', '#maxdate')
          .selectById(docRegAvgMonth['employeePositionID.departmentID'])
      ]).then(([employeeOrg, employeeDepartment]) => ({
        docRegAvgMonth,
        empOrderAvg,
        orderRegistryDt,
        employeeOrg,
        employeeDepartment
      }))
    })
  },
  getParams: function (data, reportParams) {
    const { employeeOrg } = data
    const { employeeDepartment } = data
    const filterAccrualAvg = JSON.parse(reportParams.filterAccrualAvg || '[]')
    const isSum = (item, reportParams, sumParam) => {
      let result = null
      let dictFundSourceIDs = []
      if (reportParams.dictFundSourceIDs && reportParams.dictFundSourceIDs.length) {
        dictFundSourceIDs = reportParams.dictFundSourceIDs.split(',').map(o => Number(o) || null)
      }
      let dictProgClassIDs = []
      if (reportParams.dictProgClassIDs && reportParams.dictProgClassIDs.length) {
        dictProgClassIDs = reportParams.dictProgClassIDs.split(',').map(o => Number(o) || null)
      }
      if (item.accrualDt && item.accrualDt.length) {
        if (dictFundSourceIDs.length && dictProgClassIDs.length) {
          const filterAccrualDt = item.accrualDt.filter(o => dictFundSourceIDs.includes(o.dictFundSourceID) && dictProgClassIDs.includes(o.dictProgClassID))
          result = filterAccrualDt.reduce((acc, cur) => acc + cur.paySum, 0) || 0
        } else if (dictFundSourceIDs.length && !dictProgClassIDs.length) {
          const filterAccrualDt = item.accrualDt.filter(o => dictFundSourceIDs.includes(o.dictFundSourceID))
          result = filterAccrualDt.reduce((acc, cur) => acc + cur.paySum, 0) || 0
        } else if (!dictFundSourceIDs.length && dictProgClassIDs.length) {
          const filterAccrualDt = item.accrualDt.filter(o => dictProgClassIDs.includes(o.dictProgClassID))
          result = filterAccrualDt.reduce((acc, cur) => acc + cur.paySum, 0) || 0
        } else if (!dictFundSourceIDs.length && !dictProgClassIDs.length) {
          result = item[sumParam]
        }
      } else if (!dictFundSourceIDs.length || !dictProgClassIDs.length) {
        result = 0
      }
      return result
    }

    if (filterAccrualAvg.length) data.empOrderAvg = filterAccrualAvg
    const result = {
      orgName: employeeOrg ? employeeOrg.name : '',
      depName: employeeDepartment ? employeeDepartment.name : '',
      posName: data.docRegAvgMonth['employeePositionID.positionID.name'] ? data.docRegAvgMonth['employeePositionID.positionID.name'] : data.docRegAvgMonth['employeePositionID.dictPositionID.name'] || '',
      tabNum: data.docRegAvgMonth['employeeNumberID.tabNum'] || '',
      employeeName: data.docRegAvgMonth['employeeID.fullFIO'] || '',
      empTaxCode: data.docRegAvgMonth['employeeID.empTaxCodeType.name'] && data.docRegAvgMonth['employeeID.taxCode']
        ? { employeeTaxType: `${data.docRegAvgMonth['employeeID.empTaxCodeType.name']}:` || '', employeeTaxCode: data.docRegAvgMonth['employeeID.taxCode'] || '' } : null,
      sickLimit: data.sickLimit && data.sickLimit.length > 0 ? data.sickLimit : [],
      seria: data.docRegAvgMonth['seria'] || '',
      orderNumber: data.docRegAvgMonth['orderNumber'] || '',
      orderDate: data.docRegAvgMonth['orderDate'] ? AC.dateService.formatDate(data.docRegAvgMonth['orderDate']) : '',
      reasonName: data.docRegAvgMonth['parentSicknessID'] ? `${data.docRegAvgMonth['dictIllnessReasonID.name']} ${UB.i18n('(продовжений)')}` : `${data.docRegAvgMonth['dictIllnessReasonID.name']} ${UB.i18n('(первинний)')}`,
      sicknessPeriod: `${data.docRegAvgMonth['dateFrom'] ? 'з ' + AC.dateService.formatDate(data.docRegAvgMonth['dateFrom']) : ''}` +
      `${data.docRegAvgMonth['dateTo'] ? ' по ' + AC.dateService.formatDate(data.docRegAvgMonth['dateTo']) : ''}`,
      standingAll: data.docRegAvgMonth['standingAll'] ? (('0' + Math.floor(data.docRegAvgMonth['standingAll'] / 12)).substr(-2, 2) + 'р.' + ('0' + (data.docRegAvgMonth['standingAll'] - Math.floor(data.docRegAvgMonth['standingAll'] / 12) * 12)).substr(-2, 2) + 'м') : '',
      rate: data.docRegAvgMonth['rate'] || '',
      avgCalcType: data.docRegAvgMonth['avgCalcType.name'] || '',
      avgSum: data.docRegAvgMonth['avgSum'] || 0,
      standingYearMonth: data.docRegAvgMonth['standingYearMonth'] || '',
      calcSum: data.docRegAvgMonth['calcSum'] || 0,
      payElGenName: data.orderRegistryDt.length > 0 ? data.orderRegistryDt[0].payElGenName : '',
      avg: data.empOrderAvg.map((item, index) => {
        return {
          index: index + 1,
          periodName: item.periodName || item['periodID.name'] || '',
          opDays: item.opDays || 0,
          totalDays: item.dateFrom && item.dateTo ? AC.dateService.dayDiff(item.dateFrom, item.dateTo) : 0,
          opSum: isSum(item, reportParams, 'opSum'),
          baseSum: isSum(item, reportParams, 'baseSum')
        }
      }),
      totalAvg: {
        opDays: 0,
        totalDays: 0,
        opSum: 0,
        baseSum: 0
      },
      dt: data.orderRegistryDt.map(item => {
        return {
          payElName: item.payElName || '',
          description: item.description || '',
          days: item.countMonth || 0,
          baseSum: item.baseSum || 0,
          paySum: isSum(item, reportParams, 'paySum') || 0
        }
      }),
      totalDt: {
        period: 0,
        days: 0,
        paySum: 0
      },
      totalPaySumStr: ''
    }

    result.totalAvg.opDays = result.avg.reduce((result, item) => (AC.currencyService.round(result + item.opDays, 2)), 0)
    result.totalAvg.totalDays = result.avg.reduce((result, item) => (AC.currencyService.round(result + item.totalDays, 2)), 0)
    result.totalAvg.opSum = result.avg.reduce((result, item) => (AC.currencyService.round(result + item.opSum, 2)), 0)
    result.totalAvg.baseSum = result.avg.reduce((result, item) => (AC.currencyService.round(result + item.baseSum, 2)), 0)

    result.totalDt.period = result.dt.reduce((result, item) => (AC.currencyService.round(result + item.period, 2)), 0)
    result.totalDt.days = result.dt.reduce((result, item) => (AC.currencyService.round(result + item.days, 2)), 0)
    result.totalDt.paySum = result.dt.reduce((result, item) => (AC.currencyService.round(result + item.paySum, 2)), 0)

    result.totalPaySumStr = AC.currencyService.currencyToWordsUkr(result.totalDt.paySum)

    return AC.reportService.removeEmptyValues(result)
  }
}
