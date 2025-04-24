/* global UB AC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data, reportParams), me))
  },
  getData (reportParams) {
    return Promise.all([
      UB.Repository('hr_docRegVacationCompensation')
        .attrs(['ID', 'orderNumber', 'orderDate', 'dateFromAvg', 'dateToAvg', 'dayCount', 'avgSum',
          'employeePositionID', 'employeeID.fullFIO', 'employeeNumberID.tabNum', 'employeePositionID.organizationID', 'employeePositionID.positionID.name', 'employeePositionID.dictPositionID.name', 'employeePositionID.departmentID'])
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
        .attrs(['payElID.name', 'periodSalaryID.description', 'days', 'baseSum', 'paySum', 'accrualDt', 'payElID.genName'])
        .where('orderID', '=', reportParams.instanceID)
        .selectAsObject({
          'payElID.name': 'payElName',
          'periodSalaryID.description': 'description',
          'payElID.genName': 'payElGenName'
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
      payElGenName: data.orderRegistryDt.length > 0 ? data.orderRegistryDt[0].payElGenName : '',
      avg: data.empOrderAvg.map((item, index) => {
        return {
          index: index + 1,
          periodName: item.periodName || '',
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
          days: item.days || 0,
          baseSum: item.baseSum || 0,
          paySum: isSum(item, reportParams, 'paySum') || 0
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
