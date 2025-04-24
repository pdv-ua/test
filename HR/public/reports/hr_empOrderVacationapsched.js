/* global UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      titleOrder: '',
      orderDet: []
    }
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }
    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '')
    result.orderNumber = `${order.orderNumber || ''}${order['dictEmpOrderIndexID.code'] ? '/' + order['dictEmpOrderIndexID.code'] : ''}`
    result.organizationName = order.orderOrganizationName
    result.city = await HR.reportUtils.getCityName(order['organizationID'])
    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')
    const onDate = order.orderDate || appAC.globalApplicationDate()
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const dataDet = await UB.Repository('hr_empOrderVacationapschedDet')
      .attrs(['ID', 'year', 'organizationID.nameGen', 'organizationID.name', 'mi_deleteDate'])
      .where('orderID', '=', ID)
      .where('organizationID.mi_dateFrom', '<=', onDate)
      .where('organizationID.mi_dateTo', '>=', onDate)
      .where('organizationID.state', '=', 'ACTIVE')
      .selectAsObject()
    let index = 1
    for (let i = 0; i < dataDet.length; i++) {
      result.titleOrder = UB.i18n(`Про затвердження графіку відпусток на {0} рік`, dataDet[i].year)
      result.orderDet.push({
        index: index++,
        text: UB.i18n(`Затвердити графік відпусток працівників {0} на {1} рік (Додаток 1 до цього наказу).`, dataDet[i]['organizationID.nameGen'] || dataDet[i]['organizationID.name'], dataDet[i].year)
      })
    }
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    if (taskDet) {
      result.tasks = taskDet.tasks.map(e => ({
        task: `${index++}. ${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      }))
    }

    return result
  }
}
