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
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
      reason: order.reason
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
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      preamblePunkt: '',
      organizationNameGen: order.subOrganization
        ? order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name'] || ''
        : order['organizationID.nameGen'] || order['organizationID.name'] || '',
      titleOrder: UB.i18n('Про накладення дисциплінарного стягнення'),
      items: []
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Накласти дисциплінарне стягнення')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)
    const respPosInfoGen = await HR.reportUtils.getResponsiblesIncaseInfo(order.respEmployeePositionID, order.orderDate || order.entryDate, 'gen')
    result.respNameGen = respPosInfoGen ? HR.reportUtils.formatFullNameInOrder(respPosInfoGen.respName, { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) : ''
    const respPosInfoOr = await HR.reportUtils.getResponsiblesIncaseInfo(order.respEmployeePositionID, order.orderDate || order.entryDate, 'ins')
    result.respNameOr = respPosInfoOr ? HR.reportUtils.formatFullNameInOrder(respPosInfoOr.respName, { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }) : ''

    const whereArray = [['empOrderType', '=', 'PENALTY']]
    if (orderExtract && orderExtract.ID && orderExtract.departmentID) {
      whereArray.push(['departmentID', '=', orderExtract.departmentID])
    }
    if (orderExtract && orderExtract.ID && orderExtract.employeePositionID) {
      whereArray.push(['employeePositionID', '=', orderExtract.employeePositionID])
    }
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, undefined, whereArray, true)
    let penaltyDet = await UB.Repository('hr_empOrderPenaltyDet')
      .attrs(['ID', 'reason', 'docDescription', 'dictPenaltyReasonID.name4Rep', 'dictPenaltyID',
        'dictPenaltyID.preamble', 'dictPenaltyID.directive', 'dictPenaltyID.caseType', 'dictPenaltyID.title', 'dictPenaltyID.name'
      ])
      .whereIf(orderExtract && orderExtract.ID && orderExtract.departmentID, 'departmentID', '=', orderExtract.departmentID)
      .whereIf(orderExtract && orderExtract.ID && orderExtract.employeePositionID, 'employeePositionID', '=', orderExtract.employeePositionID)
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    const countDet = penaltyDet.length
    penaltyDet = penaltyDet && penaltyDet.length ? _.groupBy(penaltyDet, 'dictPenaltyID') : []

    let index = 0
    _.forEach(penaltyDet, penaltyDetItems => {
      const itemIdxText = _.size(penaltyDet) === 1 && taskDet.tasks.length === 0 ? '' : `${++index}. `
      const obj = {
        text: countDet === 1 ? '' : itemIdxText + (penaltyDetItems[0]['dictPenaltyID.directive']
          ? result.smallOrderWord ? penaltyDetItems[0]['dictPenaltyID.directive'] : penaltyDetItems[0]['dictPenaltyID.directive'].toUpperCase()
          : orderWord + ' ' + penaltyDetItems[0]['dictPenaltyID.name']) + UB.i18n(' на:'),
        items: []
      }

      _.forEach(penaltyDetItems, (penaltyDetItem, ind) => {
        const item = _.find(orderDet, { ID: penaltyDetItem.ID })
        const toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true

        if (countDet === 1 || _.size(penaltyDet) === 1) {
          result.titleOrder = penaltyDetItem['dictPenaltyID.title'] || result.titleOrder
        }
        if (countDet === 1) {
          result.preamblePunkt = penaltyDetItem['docDescription'] || ''
        }

        const empInfo = HR.reportUtils.getInfoItemOrderInCase(item, penaltyDetItem['dictPenaltyID.caseType'] || 'dat', false, result.notUseMiddleNameInOrder)
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
        obj.items.push({
          toOrder: toOrder,
          text: (countDet === 1 ? itemIdxText + (penaltyDetItem['dictPenaltyID.directive'] ? penaltyDetItem['dictPenaltyID.directive'].toUpperCase()
            : orderWord + ' ' +  penaltyDetItem['dictPenaltyID.name']) : '') +
          ` ${boldFormatBegin}${empInfo.empName}${tabNum? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${empInfo.posName ? ', ' + empInfo.posName + orgGen : ''}` +
          `${penaltyDetItem['dictPenaltyReasonID.name4Rep'] ? ' ' + penaltyDetItem['dictPenaltyReasonID.name4Rep'] : ''}${ind < penaltyDetItems.length - 1 ? ';' : '.'}`
        })
      })

      obj.items = obj.items.filter(el => el.toOrder)
      if (obj.items.length) {
        if (obj.text.length) {
          result.items.push({
            text: obj.text
          })
        }
        result.items.push(...obj.items)
      }
    })

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 0 && taskDet.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
