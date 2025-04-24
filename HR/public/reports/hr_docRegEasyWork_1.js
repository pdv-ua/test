/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },
  getData (reportParams) {
    return Promise.all([
      UB.Repository('hr_empOrderEasyWork')
        .attrs(['ID', 'orderNumber', 'orderDate', 'dateFrom', 'dateTo', 'avgSum',
          'employeePositionID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'payElID.name'])
        .selectById(reportParams.instanceID),
      UB.Repository('hr_accrualAvg')
        .attrs(['periodID.name', 'periodID.dateFrom', 'periodID.dateTo', 'opDays', 'opSum', 'baseSum'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'periodID.name': 'periodName',
          'periodID.dateFrom': 'dateFrom',
          'periodID.dateTo': 'dateTo'
        }),
      UB.Repository('hr_orderRegistryDt')
        .attrs(['payElID.name', 'periodSalaryID.description', 'days', 'baseSum', 'paySum'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'payElID.name': 'payElName',
          'periodSalaryID.description': 'description'
        })
    ]).then(([docRegAvgPay, empOrderAvg, orderRegistryDt]) => {
      return Promise.all([
        UB.Repository('hr_employeePositionS')
          .attrs(['ID', 'positionID.name', 'organizationID.name', 'departmentID.name'])
          .where('employeeID.mi_deleteDate', '>=', '#maxdate')
          .where('positionID.state', '=', 'ACTIVE')
          .where('positionID.mi_dateFrom', '<=', docRegAvgPay.orderDate || docRegAvgPay.dateFrom)
          .where('positionID.mi_dateTo', '>=', docRegAvgPay.orderDate || docRegAvgPay.dateTo)
          .where('positionID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('departmentID.mi_dateFrom', '<=', docRegAvgPay.orderDate || docRegAvgPay.dateFrom)
          .joinCondition('departmentID.mi_dateTo', '>=', docRegAvgPay.orderDate || docRegAvgPay.dateTo)
          .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('departmentID.state', '=', 'ACTIVE')
          .joinCondition('organizationID.mi_dateFrom', '<=', docRegAvgPay.orderDate || docRegAvgPay.dateFrom)
          .joinCondition('organizationID.mi_dateTo', '>=', docRegAvgPay.orderDate || docRegAvgPay.dateTo)
          .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('organizationID.state', '=', 'ACTIVE')
          .selectById(docRegAvgPay.employeePositionID),
        UB.Repository('hr_employeePositionS')
          .attrs(['ID', 'positionID.name', 'organizationID.name', 'departmentID.name'])
          .where('employeeID.mi_deleteDate', '>=', '#maxdate')
          .where('positionID.state', '=', 'ACTIVE')
          .where('positionID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('departmentID.mi_dateFrom', '<=', docRegAvgPay.orderDate || docRegAvgPay.dateFrom)
          .joinCondition('departmentID.mi_dateTo', '>=', docRegAvgPay.orderDate || docRegAvgPay.dateTo)
          .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('departmentID.state', '=', 'ACTIVE')
          .joinCondition('organizationID.mi_dateFrom', '<=', docRegAvgPay.orderDate || docRegAvgPay.dateFrom)
          .joinCondition('organizationID.mi_dateTo', '>=', docRegAvgPay.orderDate || docRegAvgPay.dateTo)
          .joinCondition('organizationID.mi_deleteDate', '>=', '#maxdate')
          .joinCondition('organizationID.state', '=', 'ACTIVE')
          .orderBy('positionID.mi_dateFrom', 'desc')
          .orderBy('positionID.mi_dateTo', 'desc')
          .selectById(docRegAvgPay.employeePositionID)
      ]).then(([employeeInfo, employeeInfoLast]) => ({
        docRegAvgPay,
        empOrderAvg,
        orderRegistryDt,
        employeeInfo,
        employeeInfoLast
      }))
    })
  },
  getParams: function (data) {
    const emplInfo = data.employeeInfo || data.employeeInfoLast || null
    const result = {
      orgName: emplInfo ? emplInfo['organizationID.name'] || '' : '',
      depName: emplInfo ? emplInfo['departmentID.name'] || '' : '',
      posName: emplInfo ? emplInfo['positionID.name'] || '' : '',
      tabNum: data.docRegAvgPay['employeeNumberID.tabNum'] || '',
      employeeName: data.docRegAvgPay['employeeID.fullFIO'] || '',
      orderNumber: data.docRegAvgPay['orderNumber'] || '',
      orderDate: data.docRegAvgPay['orderDate'] ? AC.dateService.formatDate(data.docRegAvgPay['orderDate']) : '',
      payElName: data.docRegAvgPay['payElID.name'],
      avgSum: data.docRegAvgPay['avgSum'] || 0,
      periodName: `${data.docRegAvgPay['dateFrom'] ? AC.dateService.formatDate(data.docRegAvgPay['dateFrom']) : ''}` +
      `${data.docRegAvgPay['dateTo'] ? ' - ' + AC.dateService.formatDate(data.docRegAvgPay['dateTo']) : ''}`,
      avg: data.empOrderAvg.map((item, index) => {
        return {
          index: index + 1,
          periodName: item.periodName || '',
          opDays: item.opDays || 0,
          totalDays: item.dateFrom && item.dateTo ? AC.dateService.dayDiff(item.dateFrom, item.dateTo) : 0,
          opSum: item.opSum || 0,
          baseSum: item.baseSum || 0
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
          days: item.days || 0,
          baseSum: item.baseSum || 0,
          paySum: item.paySum || 0
        }
      }),
      totalDt: {
        days: 0,
        paySum: 0
      }
    }

    result.totalAvg.opDays = result.avg.reduce((result, item) => (result + item.opDays), 0)
    result.totalAvg.totalDays = result.avg.reduce((result, item) => (result + item.totalDays), 0)
    result.totalAvg.opSum = result.avg.reduce((result, item) => (result + item.opSum), 0)
    result.totalAvg.baseSum = result.avg.reduce((result, item) => (result + item.baseSum), 0)

    result.totalDt.days = result.dt.reduce((result, item) => (result + item.days), 0)
    result.totalDt.paySum = result.dt.reduce((result, item) => (result + item.paySum), 0)

    return AC.reportService.removeEmptyValues(result)
  }
}
