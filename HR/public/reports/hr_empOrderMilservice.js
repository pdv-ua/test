/* global UB AC HR _ */
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
        const whereArray = [['empOrderType', 'in', 'MILSERVICE']]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderMilserviceDet')
              .attrs(['ID', 'employeeID.accusativeName', 'employeeID.fullFIO', 'dateFrom', 'dateTo', 'dictTimeCostID.name', 'isPosReserved',
                'dictMilitaryDutyID.orderTitle', 'dictMilitaryDutyID.orderText', 'employeeID.genName', 'payElID', 'reason'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, respPosInfo, city, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderDet,
              tasks,
              respPosInfo,
              city,
              order,
              orderExtract,
              printDocumentView,
              configObj
            }))
          })
        })
      })
  },

  getParams: async function (data) {
    let titleName = data.orderDet.length > 1 ? UB.i18n('працівників'): ''
    const showTabNum = data.order.showTabNum

    let i = 1
    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    function getSaveText(payElID, isPosReserved) {
      let text = UB.i18n('зі збереженням місця роботи')
      if (isPosReserved) {
        text += payElID ? UB.i18n(', посади і середнього заробітку') : ' ' + UB.i18n('і посади')
      } else {
        text += payElID ? ' ' + UB.i18n('і середнього заробітку') : ''
      }

      return text
    }
    const params = {
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
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
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      text: data.orderDet.length >= 1,
      items: [],
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    let orderWord = UB.i18n('Увільнити')
    orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
    const boldFormatBegin = params.normalFullName ? '' : '<b>'
    const boldFormatEnd = params.normalFullName ? '' : '</b>'

    data.orderDet.forEach(e => {
      const item = data.empOrder.find(o => o.ID === e.ID)
      _.merge(e, item || [])
      const toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'acc', true, params.notUseMiddleNameInOrder)
      const tabNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
      const text = `${orderWord} ${boldFormatBegin}${posInfo.empName || ''}${boldFormatEnd}${tabNum ? ' ' + tabNum : ''}` +
        UB.i18n(`{0} від роботи з&nbsp;{1}{2}&nbsp;року`, posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen : '', AC.dateService.formatDate(e.dateFrom), e.dateTo ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(e.dateTo) : '') + UB.i18n(' у зв`язку з ') +
        `${e['dictMilitaryDutyID.orderTitle'] || UB.i18n('на військову службу')} ${getSaveText(e.payElID, e.isPosReserved)} ${UB.i18n('на період проходження')} ${e['dictMilitaryDutyID.orderText'] || UB.i18n('військової служби')}.`
      params.items.push({
        toOrder: toOrder,
        i: `${data.orderDet.length === 1 && (!data.tasks || !data.tasks.tasks || data.tasks.tasks.length === 0) ? '' : i++ + '. '}`,
        text: text
      })
      if (e.reason) {
        params.items.push({
          toOrder: toOrder,
          text: UB.i18n(`Підстава: {0}.`, e.reason),
          indent: 1
        })
      }
    })
    params.items = params.items.filter(el => el.toOrder)

    if (data.orderDet.length === 1) {
      data.order.titleOrder = data.order.titleOrder || UB.i18n('Про увільнення у зв\'язку з {0}', data.orderDet[0]['dictMilitaryDutyID.orderTitle'] || UB.i18n('на військову службу'))
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    } else {
      data.order.titleOrder = data.order.titleOrder || UB.i18n('Про увільнення ')
    }
    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    params.tasks = data.tasks.tasks.map(e => ({
      task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return AC.reportService.removeEmptyValues(params)
  }
}
