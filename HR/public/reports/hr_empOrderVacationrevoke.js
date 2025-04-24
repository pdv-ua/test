/* global UB AC HR _ appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => me.getParams(data)).then(params => AC.reportService.generateReport(params, me))
  },

  getData (reportParams) {
    return Promise.all([
      HR.reportUtils.getEmpOrderExtract(reportParams.params ? reportParams.params.orderExtraID || 0 : 0)])
      .then(([orderExtract]) => {
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)])
          .then(([order]) => {
            const whereArray = [['empOrderType', 'in', ['VACATIONREVOKE', 'VACRETPROLONG']]]
            const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
            const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
            const configObj = { printDocumentView }
            return Promise.all([
              HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
              HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
              UB.Repository('hr_empOrderVacationrevokeDet')
                .attrs(['ID', 'orderID', 'orderID.orderNumber', 'orderID.entryDate', 'dateFrom', 'dateTo', 'reason', 'dayCount', 'empOrderType', 'itemIdx'])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              UB.Repository('hr_empOrderVacretprolongDet')
                .attrs(['ID', 'orderID', 'orderID.orderNumber', 'orderID.entryDate', 'dateFrom', 'dateTo', 'reason', 'dayCount', 'empOrderType', 'itemIdx'])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
              HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
              HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
              UB.Repository('hr_empOrderVacationListDet')
                .attrs(['orderID', 'employeePositionID', 'dateFrom', 'dateTo', 'dayCount', 'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'paraID'])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              UB.Repository('hr_empOrderVacationMoveDet')
                .attrs(['orderID', 'employeePositionID', 'dateFrom', 'dateTo', 'dayCount', 'dictVacationKindID.name', 'dictVacationKindID.nameGen', 'paraID'])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              printDocumentView
            ]).then(([configObj, empOrder, orderDet, orderRetDet, tasks, respPosInfo, city, orderVacList, orderVacMove, printDocumentView]) => {
              return Promise.all([
                HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
              ]).then(([tasks]) => {
                return {
                  empOrder,
                  orderDet: orderDet.concat(orderRetDet).sort((a, b) => a.itemIdx - b.itemIdx),
                  tasks,
                  respPosInfo,
                  city,
                  orderVacList,
                  orderVacMove,
                  order,
                  orderExtract,
                  printDocumentView,
                  configObj
                }
              })
            })
          })
      })
  },

  getParams: async function (data) {
    data.orderDet.forEach(det => {
      const item = data.empOrder.find(o => o.ID === det.ID)
      det.toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      _.merge(det, item || [])
      det.vacList = []
      data.orderVacList.forEach(vac => {
        if (vac.employeePositionID === det.employeePositionID && det.ID === vac.paraID) {
          det.vacList.push(vac)
        }
      })
      det.vacMove = []
      data.orderVacMove.forEach(vac => {
        if (vac.employeePositionID === det.employeePositionID && det.ID === vac.paraID) {
          det.vacMove.push(vac)
        }
      })
    })
    const showTabNum = data.order.showTabNum //AC.settings.get('hrOrderTabNum', data.order.organizationID || appAC.globalOrganization()) === true

    let i = 1
    let titleName = ''

    if (data.orderDet.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    }

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    data.order.titleOrder = data.order.titleOrder || UB.i18n('Про відкликання з відпустки')

    let orderWord = UB.i18n('Відкликати')
    orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const params = {
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      emblem: HR.reportUtils.getEmblem(),
      titleOrder: `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;'),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      orgGen: data.order['organizationID.nameGen'] || data.order['organizationID.name'],
      reason: data.order.reason
        ? {
          indent: data.printDocumentView === 'APPOINTMENT' ? 'text-indent: 34px;' : '',
          text: UB.i18n(`Підстава: {0}.`, data.order.reason)
        }
        : null,
      orderBlock: data.printDocumentView !== 'APPOINTMENT'
        ? {
          city: data.city,
          orderNumber: data.order.orderNumber || '',
          orderDate: AC.dateService.getStringFormatDate(data.order.orderDate, '', ''),
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
          organizationName: data.order.orderOrganizationName,
          order: UB.i18n('НАКАЗУЮ:')
        }
        : null,
      appointmentBlock: data.printDocumentView === 'APPOINTMENT'
        ? {
          orderDate: AC.dateService.formatDate(data.order.orderDate) || '________________',
          orderNumber: data.order.orderNumber || '________________',
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`
        }
        : null,
      mainRespPos: data.printDocumentView === 'APPOINTMENT' && data.respPosInfo.length ? data.respPosInfo[0].respPos || '' : '',
      items: data.orderDet.map(e => {
        const posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(e, 'acc', true, data.configObj.notUseMiddleNameInOrder)
        return {
          toOrder: e.toOrder,
          i: data.orderDet.length > 1 || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? `${i++}. ` : '',
          orderWord: orderWord,
          name: boldFormatBegin + posInfoAcc.empName + (showTabNum && e['employeeNumberID.tabNum'] ? ' ' + boldFormatEnd + UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : boldFormatEnd),
          position: posInfoAcc.posName ? ', ' + posInfoAcc.posName + orgGen + ',' : '',
          vacOrderInfo: e.vacList.map(el => UB.i18n(' із ') + (el['dictVacationKindID.nameGen'] || el['dictVacationKindID.name'] || '') +
            UB.i18n(` з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(el['dateFrom']), AC.dateService.formatDate(el['dateTo']))).join(', '),
          reason: e.reason ? `, ${e.reason}` : '',
          vacMoveInfo: e.empOrderType === 'VACRETPROLONG'
            ? ' та надати ' + (e['employeeID.sexType'] === 'W' ? 'їй' : e['employeeID.sexType'] === 'M' ? 'йому' : 'йому(їй)') + ' невикористані дні' + e.vacMove.map(el => UB.i18n(' із ') + (el['dictVacationKindID.nameGen'] || el['dictVacationKindID.name'] || '') +
            UB.i18n(` з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(el['dateFrom']), AC.dateService.formatDate(el['dateTo']))).join(', ')
            : ' з подальшим наданням невикористаних днів відпустки за окремою заявою'
        }
      }),
      tasks: data.tasks.tasks.map(e => ({
        task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo,
      recpart: data.recpart
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  }
}
