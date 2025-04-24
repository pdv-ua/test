/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },
  getData (reportParams) {
    return Promise.all([
      UB.Repository('hr_docRegVacationCompensation')
        .attrs(['ID', 'orderNumber', 'orderDate', 'dateFromAvg', 'dateToAvg', 'dayCount', 'avgSum',
          'employeePositionID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'employeePositionID.organizationID', 'employeePositionID.positionID.name', 'employeePositionID.dictPositionID.name', 'employeePositionID.departmentID'])
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
    ]).then(([docRegVacationCompensation, empOrderAvg, orderRegistryDt]) => {
      return Promise.all([
        UB.Repository('hr_organization')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('mi_dateFrom', '<=', docRegVacationCompensation.orderDate || docRegVacationCompensation.dateFromAvg)
          .where('mi_dateTo', '>=', docRegVacationCompensation.orderDate || docRegVacationCompensation.dateToAvg)
          .selectById(docRegVacationCompensation['employeePositionID.organizationID']),
        UB.Repository('hr_department')
          .attrs(['name'])
          .where('state', '=', 'ACTIVE')
          .where('orgID', '=', docRegVacationCompensation['employeePositionID.organizationID'])
          .where('mi_dateFrom', '<=', docRegVacationCompensation.orderDate || docRegVacationCompensation.dateFromAvg)
          .where('mi_dateTo', '>=', docRegVacationCompensation.orderDate || docRegVacationCompensation.dateToAvg)
          .where('mi_deleteDate', '>=', '#maxdate')
          .selectById(docRegVacationCompensation['employeePositionID.departmentID'])
      ]).then(([employeeOrg, employeeDepartment]) => ({
        docRegVacationCompensation,
        empOrderAvg,
        orderRegistryDt,
        employeeOrg,
        employeeDepartment
      }))
    })
  },
  getParams: function (data) {
    const { employeeOrg } = data
    const { employeeDepartment } = data
    const result = {
      orgName: employeeOrg ? employeeOrg.name : '',
      depName: employeeDepartment ? employeeDepartment.name : '',
      posName: data.docRegVacationCompensation['employeePositionID.positionID.name'] ? data.docRegVacationCompensation['employeePositionID.positionID.name'] : data.docRegVacationCompensation['employeePositionID.dictPositionID.name'] || '',
      tabNum: data.docRegVacationCompensation['employeeNumberID.tabNum'] || '',
      employeeName: data.docRegVacationCompensation['employeeID.fullFIO'] || '',
      orderNumber: data.docRegVacationCompensation['orderNumber'] || '',
      orderDate: data.docRegVacationCompensation['orderDate'] ? AC.dateService.formatDate(data.docRegVacationCompensation['orderDate']) : '',
      dayCount: data.docRegVacationCompensation['dayCount'] || '',
      avgSum: data.docRegVacationCompensation['avgSum'] || 0,
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
        period: 0,
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
