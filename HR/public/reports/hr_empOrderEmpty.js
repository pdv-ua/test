/* global UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => me.getParams(data)).then(params => AC.reportService.generateReport(params, me))
  },
  getData: async function (reportParams) {
    const orderDet = await UB.Repository('hr_empOrderChgemployeeDet')
      .attrs(['ID', 'employeeID.fullFIO', 'genName', 'employeeID.datName', 'fullFIO',
        'employeePositionID.positionID.fullNameGen', 'employeePositionID.positionID.nameGen', 'employeeID.genName',
        'employeePositionID.positionID.name'])
      .where('orderID', '=', reportParams.instanceID)
      .orderBy('itemIdx')
      .selectAsObject()
    const order = await HR.reportUtils.getEmpOrder(reportParams.instanceID)
    const orderResp = await HR.reportUtils.getResponsiblesForOrder(order)
    const taskDet = await HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum)
    const city = await HR.reportUtils.getCityName(order.organizationID)
    return { order, orderDet, orderResp, taskDet, city }
  },
  getParams: async function (data) {
    let titleName

    if (data.orderDet.length === 1) {
      titleName = HR.reportUtils.formatShortName(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'])
    } else if (data.orderDet.length === 0) {
      titleName = ''
    } else {
      titleName = UB.i18n('працівників')
    }

    const params = {
      emblem: HR.reportUtils.getEmblem(),
      orderNumber: data.order.orderNumber,
      orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
      titleName: `${titleName}`,
      city: data.city,
      orderDate: AC.dateService.getStringFormatDate(data.order.orderDate, '', ''),
      titleOrder: (data.order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      reason: data.order.reason ? UB.i18n(`Підстава: {0}.`, data.order.reason) : '',
      organizationName: data.order.orderOrganizationName,
      responsiblesInfo: data.orderResp,
      detail: data.orderDet.map(e => ({
        fullNameFirst: e['employeeID.datName'] || e['employeeID.fullFIO'],
        secondName: e.fullFIO,
        genName: e.genName,
        genOrganization: `${data.order['organizationID.nameGen']}, ` || `${data.order['organizationID.name']}, `,
        position: (e['employeePositionID.positionID.nameGen'] || e['employeePositionID.positionID.name']) === null
          ? '' : `${e['employeePositionID.positionID.nameGen']}, ` || `${e['employeePositionID.positionID.name']}, `
      }))

    }
    await HR.reportUtils.getOrderPrintConfig(params, data.order.subOrganization ? data.order.masterOrganizationID : data.order.organizationID)
    params.logoPaddingLeft += 3
    return AC.reportService.removeEmptyValues(params)
  }
}
