/* global AC HR */
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
      items: []
    }
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }
    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '')
    result.orderNumber = order.orderNumber
    result.orderIndex = order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
    result.organizationName = order.orderOrganizationName
    result.titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')
    result.city = await HR.reportUtils.getCityName(order['organizationID'])
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate)
    const taskDet = await HR.reportUtils.getTaskInfo(ID, order.orderDate || order.entryDate, order.showTabNum)
    let itemIdx = 0
    for (let i = 0; i < orderDet.length; i++) {
      let item = orderDet[i]
      let empOrderType = item.empOrderType
      if (empOrderType === 'TASK') {
        let taskText = await taskDet.getText(item.ID, AC.dateService.unshiftDate(order.orderDate || order.entryDate), true, 'gen')
        if (taskText) {
          result.items.push({ text: `${++itemIdx}. ${taskText}` })
        }
      }
    }
    return result
  }
}
