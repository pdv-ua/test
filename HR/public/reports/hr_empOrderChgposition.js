/* global _ UB AC HR */
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
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : UB.i18n('Н А К А З'),
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
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      data: []
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Встановити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, [], [['empOrderType', '=', 'CHGPOSITION']], true)
    const chgPositionDet = await UB.Repository('hr_empOrderChgpositionDet')
      .attrs(['ID', 'actionType.name', 'actionType', 'dateFrom', 'isTemporary', 'planDateTo'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    const attrsDet = await UB.Repository('hr_empOrderChgPositionAttrsDet')
      .attrs(['paraID', 'dictEmpPosAttrID.name', 'dictEmpPosAttrID.nameGen', 'newValueText'])
      .where('orderID', '=', ID)
      .selectAsObject()

    const emplsDet = await UB.Repository('hr_empOrderChgPositionEmpDet')
      .attrs(['ID', 'paraID', 'employeePositionID.positionID', 'employeeID.fullFIO', 'employeeID.datName'])
      .where('orderID', '=', ID)
      .orderBy('employeeID.fullFIO')
      .selectAsObject()

    emplsDet.forEach(e => {
      const item = orderDet.find(o => o.ID === e.ID)
      if (item) {
        _.merge(e, item || [])
      }
    })

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    let index = 1
    for (let i = 0; i < orderDet.length; i++) {
      const det = _.find(chgPositionDet, { ID: orderDet[i].ID })
      if (det && attrsDet && attrsDet.length && emplsDet && emplsDet.length) {
        const attrs = attrsDet
          .filter(elem => det.ID === elem.paraID)
          .map(elem => `${HR.nameCase.uncap(elem['dictEmpPosAttrID.nameGen'] || elem['dictEmpPosAttrID.name'] || '')} - ${HR.nameCase.uncap(elem.newValueText || '')}`)
          .join(', ')
        const empls = emplsDet.filter(elem => det.ID === elem.paraID)
        const dateFrom = (det.planDateTo && det.isTemporary ? UB.i18n(' на період') : '') + (det.dateFrom ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(det.dateFrom) : '')
        const dateTo = det.planDateTo && det.isTemporary ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(det.planDateTo) : ''
        const itemIdxText = empls.length === 0 || (chgPositionDet.length === 1 && taskDet.tasks.length === 0) ? '' : `${index++}. `

        if (empls.length === 1) {
          const posInfoDat = HR.reportUtils.getInfoItemOrderInCase(empls[0], 'dat', false, result.notUseMiddleNameInOrder)
          const tabNum = showTabNum && empls[0]['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, empls[0]['employeeNumberID.tabNum']) : ''
          result.data.push({
            text: `${itemIdxText}${orderWord} ${boldFormatBegin + posInfoDat.empName + boldFormatEnd}${tabNum ? ' ' + tabNum : ''}${posInfoDat.posName ? ', ' + posInfoDat.posName + orgGen : ''},${dateFrom}${dateTo} ${attrs}.`
//              UB.i18n(`{0}ВСТАНОВИТИ {1}{6}{2},{3}{4} {5}.`, itemIdxText, boldFormatBegin + posInfoDat.empName + boldFormatEnd, posInfoDat.posName ? ', ' + posInfoDat.posName + orgGen : '',
//              dateFrom, dateTo, attrs, tabNum ? ' ' + tabNum : '')
          })
        } else if (empls.length > 1) {
          result.data.push({
            text: UB.i18n(`{0}{4}{1}{2} {3}, наступним працівникам:`, itemIdxText, dateFrom, dateTo, attrs, orderWord),
            persons: empls.map((elem, index) => {
              const posInfoNom = HR.reportUtils.getInfoItemOrderInCase(elem, 'dat', false, result.notUseMiddleNameInOrder)
              const tabNum = showTabNum && elem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, elem['employeeNumberID.tabNum']) : ''
              const last = index === empls.length - 1 ? '.' : ';'
              return {
                name: `- ${posInfoNom.empName || ''}${tabNum ? ' ' + tabNum : ''}${posInfoNom.posName ? ', ' + posInfoNom.posName + orgGen : ''}${last}`
              }
            })
          })
        }
      }
    }

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
