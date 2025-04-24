/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData (reportParams) {
    return Promise.all([
      UB.Repository('hr_docRegSickness')
        .attrs(['ID', 'seria', 'parentSicknessID', 'orderNumber', 'orderDate', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'dateFrom', 'dateTo',
          'employeeID', 'employeePositionID', 'dictIllnessReasonID.name', 'standingAll', 'rate',
          'avgSum', 'standingYearMonth', 'calcSum', 'avgCalcType.name', 'employeeID.empTaxCodeType.name', 'employeeID.taxCode', 'employeePositionID.positionID.name', 'employeePositionID.dictPositionID.name', 'employeePositionID.departmentID', 'employeePositionID.organizationID'])
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
          'periodSalaryID.dateTo', 'calendarDays', 'days', 'rate', 'baseSum', 'paySum', 'accrualDt'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'payElID.name': 'payElName',
          'periodSalaryID.description': 'description'
        })
    ]).then(([docRegSickness, empOrderAvg, orderRegistryDt]) => {
      return Promise.all([
        UB.Repository('hr_organization')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('mi_dateFrom', '<=', docRegSickness.orderDate || docRegSickness.dateFrom)
          .where('mi_dateTo', '>=', docRegSickness.orderDate || docRegSickness.dateTo)
          .selectById(docRegSickness['employeePositionID.organizationID']),
        UB.Repository('hr_department')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', docRegSickness['employeePositionID.organizationID'])
          .where('mi_dateFrom', '<=', docRegSickness.orderDate || docRegSickness.dateFrom)
          .where('mi_dateTo', '>=', docRegSickness.orderDate || docRegSickness.dateTo)
          .where('mi_deleteDate', '>=', '#maxdate')
          .selectById(docRegSickness['employeePositionID.departmentID']),
        UB.Repository('hr_employeeSickLimit')
          .attrs(['ID', 'dictSickLimitID.fullName'])
          .where('employeeID.mi_deleteDate', '>=', '#maxdate')
          .where('employeeID', '=', docRegSickness.employeeID)
          .where('dateFrom', '<=', docRegSickness.dateFrom)
          .where('dateTo', '>=', docRegSickness.dateTo)
          .selectAsObject({
            'dictSickLimitID.fullName': 'name'
          })
      ]).then(([employeeOrg, employeeDepartment, sickLimit]) => ({
        docRegSickness,
        empOrderAvg,
        orderRegistryDt,
        employeeOrg,
        employeeDepartment,
        sickLimit
      }))
    })
  },
  getParams: function (data, reportParams) {
    const { employeeOrg } = data
    const { employeeDepartment } = data
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
    const filterAccrualAvg = JSON.parse(reportParams.filterAccrualAvg || '[]')

    if (filterAccrualAvg.length) data.empOrderAvg = filterAccrualAvg
    const result = {
      orgName: employeeOrg ? employeeOrg.name : '',
      depName: employeeDepartment ? employeeDepartment.name : '',
      posName: data.docRegSickness['employeePositionID.positionID.name'] ? data.docRegSickness['employeePositionID.positionID.name'] : data.docRegSickness['employeePositionID.dictPositionID.name'] || '',
      tabNum: data.docRegSickness['employeeNumberID.tabNum'] || '',
      employeeName: data.docRegSickness['employeeID.fullFIO'] || '',
      empTaxCode: data.docRegSickness['employeeID.empTaxCodeType.name'] && data.docRegSickness['employeeID.taxCode']
        ? { employeeTaxType: `${data.docRegSickness['employeeID.empTaxCodeType.name']}:` || '', employeeTaxCode: data.docRegSickness['employeeID.taxCode'] || '' } : null,
      sickLimit: data.sickLimit && data.sickLimit.length > 0 ? data.sickLimit : [],
      seria: data.docRegSickness['seria'] || '',
      orderNumber: data.docRegSickness['orderNumber'] || '',
      orderDate: data.docRegSickness['orderDate'] ? AC.dateService.formatDate(data.docRegSickness['orderDate']) : '',
      reasonName: data.docRegSickness['parentSicknessID'] ? `${data.docRegSickness['dictIllnessReasonID.name']} ${UB.i18n('(продовжений)')}` : `${data.docRegSickness['dictIllnessReasonID.name']} ${UB.i18n('(первинний)')}`,
      sicknessPeriod: `${data.docRegSickness['dateFrom'] ? 'з ' + AC.dateService.formatDate(data.docRegSickness['dateFrom']) : ''}` +
      `${data.docRegSickness['dateTo'] ? ' по ' + AC.dateService.formatDate(data.docRegSickness['dateTo']) : ''}`,
      standingAll: data.docRegSickness['standingAll'] ? (('0' + Math.floor(data.docRegSickness['standingAll'] / 12)).substr(-2, 2) + 'р.' + ('0' + (data.docRegSickness['standingAll'] - Math.floor(data.docRegSickness['standingAll'] / 12) * 12)).substr(-2, 2) + 'м') : '',
      rate: data.docRegSickness['rate'] || '',
      avgCalcType: data.docRegSickness['avgCalcType.name'] || '',
      avgSum: data.docRegSickness['avgSum'] || 0,
      standingYearMonth: data.docRegSickness['standingYearMonth'] || '',
      calcSum: data.docRegSickness['calcSum'] || 0,
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
          period: item.calendarDays || 0,
          days: item.days || 0,
          rate: item.rate || '',
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
