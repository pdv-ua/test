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
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const whereArray = [['empOrderType', '=', 'TRIALPROLONG']]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderTrialprolongDet')
              .attrs(['ID', 'dateTo', 'reason', 'reasonDoc', 'dayCount', 'employeeID.fullFIO', 'employeeID.datName', 'employeeID.genName'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, respPosInfo, city, printDocumentView]) => {
            const employeeIDs = orderDet && orderDet.length > 0 ? _.compact(_.uniq(orderDet.map(el => el.employeeID))) : []
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
              UB.Repository('hr_employeeWorkbook')
                .attrs(['ID', 'dateTrialEnd', 'appointOrder', 'employeeID'])
                .where('dateTrialEnd', 'isNotNull')
                .where('appointOrder', 'isNotNull')
                .whereIf(employeeIDs && employeeIDs.length > 0, 'employeeID', 'in', employeeIDs)
                .whereIf(!employeeIDs && employeeIDs.length === 0, 'employeeID', '=', 0)
                .selectAsObject()
            ]).then(([tasks, workbook]) => {
              const descriptions = workbook && workbook.length > 0 ? _.uniq(workbook.map(el => el.appointOrder)) : []
              return Promise.all([
                UB.Repository('hr_order')
                  .attrs(['ID', 'organizationID.nameGen', 'organizationID.name', 'orderDate', 'orderNumberFullView', 'description'])
                  .where('[organizationID.mi_dateFrom] <= [orderDate]', 'custom')
                  .where('[organizationID.mi_dateTo] >= [orderDate]', 'custom')
                  .whereIf(descriptions && descriptions.length > 0, 'description', 'in', descriptions)
                  .whereIf(!descriptions && descriptions.length === 0, 'description', '=', 0)
                  .selectAsObject()
              ]).then(([orders]) => ({
                empOrder,
                orderDet,
                tasks,
                respPosInfo,
                city,
                order,
                workbook,
                orders,
                orderExtract,
                printDocumentView,
                configObj
              }))
            })
          })
        })
      })
  },

  getParams: async function (data) {
    let index = 0
    let titleName
    const showTabNum = data.order.showTabNum

    data.workbook = data.workbook && data.workbook.length ? _.groupBy(data.workbook, 'employeeID') : []
    data.orders = data.orders && data.orders.length ? _.groupBy(data.orders, 'description') : []
    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''

    let orderWord = UB.i18n('Продовжити')
    orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const params = {
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      orderReason: data.order.reason
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
      items: data.orderDet.map(e => {
        const item = data.empOrder.find(o => o.ID === e.ID)
        _.merge(e, item || [])
        const toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        let orderInfo = data.workbook[e.employeeID] ? data.workbook[e.employeeID][0].appointOrder : ''
        if (orderInfo && data.orders[orderInfo]) {
          orderInfo = `${data.orders[orderInfo][0]['organizationID.nameGen'] || data.orders[orderInfo][0]['organizationID.nameGen'] || ''} ${UB.i18n('від')}&nbsp;${AC.dateService.formatDate(data.orders[orderInfo][0]['orderDate'])} №&nbsp;${data.orders[orderInfo][0]['orderNumberFullView']}`
        }
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'dat', true, data.configObj.notUseMiddleNameInOrder)
        const tabNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
        let txt = (data.orderDet.length > 1 || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? `${++index}. ` : '') + `${orderWord} ${boldFormatBegin}${posInfo.empName || ''}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}`
        txt += `${posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen + ',' : ''}`
        txt += UB.i18n(' строк випробування')
        txt += orderInfo ? UB.i18n(', визначений наказом ') + orderInfo : ''
        txt += e.dayCount ? UB.i18n(`, а саме на {0}&nbsp;{1}`, e.dayCount, AC.dateService.plural(UB.i18n('робочий день_робочі дні_робочих днів'), e.dayCount)) : ''
        txt += UB.i18n(` до&nbsp;{0}.`, AC.dateService.formatDate(e.dateTo)) // ${e.reason ? ' у зв\'язку з ' + e.reason : ''}

        return {
          toOrder: toOrder,
          text: txt,
          reasonDoc: e.reasonDoc ? { reasonDoc: UB.i18n(`Підстава: {0}.`, e.reasonDoc) } : null
        }
      }),
      tasks: data.tasks.tasks.map(e => ({
        task: `${index === 0 && data.tasks.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)

    if (data.orderDet.length === 1) {
      data.order.titleOrder = data.order.titleOrder ? data.order.titleOrder : UB.i18n('Про продовження випробувального терміну')
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.datName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    }
    params.titleOrder = `${data.order.titleOrder || ''}${titleName ? `<br/>${titleName}` : ''}`.replace(/&/g, '&nbsp;')

    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  }
}
