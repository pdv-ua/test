/* global UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID) {
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return {}
    }
    const city = await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const cancellationDet = await UB.Repository('hr_empOrderCancellationDet')
      .attrs(['ID', 'targetOrderID', 'targetOrderID.orderDate', 'targetOrderID.orderNumber', 'action', 'dateInvalidation'
      ])
      .where('orderID', '=', ID)
      .selectAsObject()
    let index = 1

    const configObj = { printDocumentView: ''}
    await HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID)

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)

    const result = {
      emblem: HR.reportUtils.getEmblem(),
      orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', ''),
      orderNumber: order.orderNumber,
      orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`,
      organizationName: order.orderOrganizationName,
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      city: city,
      reason: order.reason ? UB.i18n(`Підстава: {0}.`, order.reason) : undefined,
      items: cancellationDet.map(e => ({
        item: e.action === 'CANCELNOTTAKEEFFECT'
          ? UB.i18n(`{0}Скасувати наказ від&nbsp;{1} №&nbsp;{2}, як нереалізований.`, cancellationDet.length === 1 && (!taskDet.tasks || taskDet.tasks.length === 0) ? '' : index++ + '. ', AC.dateService.formatDate(e['targetOrderID.orderDate']), e['targetOrderID.orderNumber'])
          : UB.i18n(`{0}Визнати наказ від&nbsp;{1} №&nbsp;{2} таким, що втратив чинність з&nbsp;{3}.`, cancellationDet.length === 1 && (!taskDet.tasks || taskDet.tasks.length === 0) ? '' : index++ + '. ', AC.dateService.formatDate(e['targetOrderID.orderDate']), e['targetOrderID.orderNumber'], AC.dateService.formatDate(e['dateInvalidation']))
      })),
      tasks: taskDet.tasks.map(e => ({
        task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      }))
    }
    HR.reportUtils.copyToParams(result, configObj)

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    return result
  }
}
