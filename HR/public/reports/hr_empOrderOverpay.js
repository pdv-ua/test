/* global _ UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return {
        emblem: HR.reportUtils.getEmblem()
      }
    }
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const showTabNum = order.showTabNum

    const result = {
      emblem: HR.reportUtils.getEmblem(),
      funcOrgType: false,
      showAccrual: true,
      items: [],
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: printDocumentView,
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
      orderReason: order.reason
        ? {
          indent: printDocumentView === 'APPOINTMENT' ? 'text-indent: 34px;' : '',
          text: UB.i18n(`Підстава: {0}.`, order.reason)
        }
        : null,
      orderBlock: printDocumentView !== 'APPOINTMENT'
        ? {
          city: await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
          orderNumber: order.orderNumber || '',
          orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', ''),
          orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`,
          organizationName: order.orderOrganizationName,
          order: UB.i18n('НАКАЗУЮ:')
        }
        : null,
      appointmentBlock: printDocumentView === 'APPOINTMENT'
        ? {
          orderDate: AC.dateService.formatDate(order.orderDate) || '________________',
          orderNumber: order.orderNumber || '________________',
          orderIndex: order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
        }
        : null,
      mainRespPos: printDocumentView === 'APPOINTMENT' && responsiblesInfo.length ? responsiblesInfo[0].respPos || '' : '',
      titleOrder: UB.i18n('Про  оплату додаткової праці за виробничою потребою'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;')
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Оплатити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    let orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], [['empOrderType', '=', 'OVERPAY']], true)

    const overpayDet = await UB.Repository('hr_empOrderOverpayDet')
      .attrs(['ID', 'reason', 'periodID.name'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const orderDetSecond = await UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'employeeID.datName', 'employeeID.fullFIO', 'entityParaID', 'orderText', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let index = 1
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const appointDetRow = _.find(overpayDet, { ID: item.ID })
      if (appointDetRow) {
        if (orderDetSecond && orderDetSecond.length) {
          const det = orderDetSecond.filter(elem => appointDetRow.ID === elem.entityParaID)
          _.forEach(det, detItem => {
            const itemIdxText = orderDetSecond.length === 1 && taskDet.tasks.length === 0 ? '' : `${index++}. `
            const itm = orderDet.find(o => o.ID === detItem.ID)
            _.merge(detItem, itm || [])
            const toOrder = orderExtract && orderExtract.ID
              ? ((orderExtract.departmentID ? orderExtract.departmentID === itm.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === itm.employeePositionID : true))
              : true
            let posInfo = HR.reportUtils.getInfoItemOrderInCase(detItem, 'dat', true, result.notUseMiddleNameInOrder)
            const tabNum = showTabNum && itm['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, itm['employeeNumberID.tabNum']) : ''
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              text: `${itemIdxText}${orderWord} ${boldFormatBegin + (posInfo.empName || '')}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen : ''}${detItem.orderText ? ' ' + detItem.orderText : '.'}`
            })
            if (detItem.reason) {
              result.items.push({
                toOrder: toOrder,
                text: UB.i18n(`Підстава: {0}.`, detItem.reason),
                indent: 0
              })
            }
          })
        }
      }
    }

    result.items = result.items.filter(el => el.toOrder)
    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
