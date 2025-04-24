/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData (reportParams) {
    return Promise.all([
      UB.Repository('hr_docRegVacation')
        .attrs(['ID', 'orderNumber', 'orderDate', 'dateFrom', 'dateTo', 'dayCount', 'avgSum',
          'employeePositionID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'employeePositionID.positionID.name', 'employeePositionID.organizationID', 'employeePositionID.departmentID', 'employeePositionID.dictPositionID.name'])
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
        .attrs(['payElID.name', 'periodSalaryID.description', 'days', 'baseSum', 'paySum', 'calendarDays', 'accrualDt', 'payElID.genName'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'payElID.name': 'payElName',
          'periodSalaryID.description': 'description',
          'payElID.genName': 'payElGenName'
        })
    ]).then(([docRegVacation, empOrderAvg, orderRegistryDt]) => {
      return Promise.all([
        UB.Repository('hr_organization')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('mi_dateFrom', '<=', docRegVacation.orderDate || docRegVacation.dateFrom)
          .where('mi_dateTo', '>=', docRegVacation.orderDate || docRegVacation.dateTo)
          .selectById(docRegVacation['employeePositionID.organizationID']),
        UB.Repository('hr_department')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', docRegVacation['employeePositionID.organizationID'])
          .where('mi_dateFrom', '<=', docRegVacation.orderDate || docRegVacation.dateFrom)
          .where('mi_dateTo', '>=', docRegVacation.orderDate || docRegVacation.dateTo)
          .where('mi_deleteDate', '>=', '#maxdate')
          .selectById(docRegVacation['employeePositionID.departmentID'])
      ]).then(([employeeOrg, employeeDepartment]) => ({
        docRegVacation,
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
    const isOpDays = (opSum, opDays, baseSum) => {
      const dayKoef = opDays ? opSum / opDays : 0
      const result = dayKoef ? baseSum / dayKoef : 0
      return AC.currencyService.round(result, 0)
    }
    const result = {
      orgName: employeeOrg ? employeeOrg.name : '',
      depName: employeeDepartment ? employeeDepartment.name : '',
      posName: data.docRegVacation['employeePositionID.positionID.name'] ? data.docRegVacation['employeePositionID.positionID.name'] : data.docRegVacation['employeePositionID.dictPositionID.name'] || '',
      tabNum: data.docRegVacation['employeeNumberID.tabNum'] || '',
      employeeName: data.docRegVacation['employeeID.fullFIO'] || '',
      orderNumber: data.docRegVacation['orderNumber'] || '',
      orderDate: data.docRegVacation['orderDate'] ? AC.dateService.formatDate(data.docRegVacation['orderDate']) : '',
      periodName: '',
      dayCount: data.docRegVacation['dayCount'] || '___',
      avgSum: data.docRegVacation['avgSum'] || 0,
      vacationPeriod: `${data.docRegVacation['dateFrom'] ? 'з ' + AC.dateService.formatDate(data.docRegVacation['dateFrom']) : ''}` +
      `${data.docRegVacation['dateTo'] ? ' по ' + AC.dateService.formatDate(data.docRegVacation['dateTo']) : ''}`,
      payElGenName: data.orderRegistryDt.length > 0 ? data.orderRegistryDt[0].payElGenName : '',
      avg: data.empOrderAvg.map((item, index) => {
        const result = {
          index: index + 1,
          periodName: item.periodName || item['periodID.name'] || '',
          baseSum1: item.baseSum,
          opSum: isSum(item, reportParams, 'opSum'),
          baseSum: isSum(item, reportParams, 'baseSum')
        }
        result.opDays = isOpDays(item.opSum, item.opDays, result.opSum) || 0
        return result
      }),
      totalAvg: {
        opDays: 0,
        opSum: 0,
        baseSum: 0
      },
      dt: data.orderRegistryDt.map(item => {
        const result = {
          payElName: item.payElName || '',
          description: item.description || '',
          period: item.calendarDays || 0,
          paySum: isSum(item, reportParams, 'paySum') || 0
        }
        result.period = isOpDays(item.paySum, item.calendarDays, result.paySum) || 0
        return result
      }),
      totalDt: {
        period: 0,
        days: 0,
        paySum: 0
      }
    }

    result.totalAvg.opDays = result.avg.reduce((result, item) => (result + item.opDays), 0)
    result.totalAvg.opSum = result.avg.reduce((result, item) => (result + item.opSum), 0)
    result.totalAvg.baseSum = result.avg.reduce((result, item) => (result + item.baseSum), 0)

    result.totalDt.period = result.dt.reduce((result, item) => (result + item.period), 0)
    result.totalDt.days = result.dt.reduce((result, item) => (result + item.days), 0)
    result.totalDt.paySum = result.dt.reduce((result, item) => (result + item.paySum), 0)

    return AC.reportService.removeEmptyValues(result)
  }
}
