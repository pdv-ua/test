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
        const whereArray = [['empOrderType', 'in', 'MILSERVICERET']]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderMilserviceretDet')
              .attrs(['ID', 'employeeID.genName', 'employeeID.accusativeName', 'employeeID.fullFIO', 'employeeID.sexType', 'dateFrom', 'reason'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView, configObj
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
      items: [],
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    const orderWord = UB.i18n('Вважати')
    params.orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
    const boldFormatBegin = params.normalFullName ? '' : '<b>'
    const boldFormatEnd = params.normalFullName ? '' : '</b>'

    data.orderDet.forEach(e => {
      const item = data.empOrder.find(o => o.ID === e.ID)
      _.merge(e, item || [])
      const toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      // const posName = HR.reportUtils.makePositionName(e['employeePositionID.positionID.fullNameAcc'] || e['employeePositionID.positionID.nameAcc'] || e['employeePositionID.positionID.name'] || '', e['employeePositionID.positionID.isOrgBoss'])
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'acc', true, params.notUseMiddleNameInOrder)
      const tabNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
      params.items.push({
        toOrder: toOrder,
        i: `${data.orderDet.length === 1 && (!data.tasks || !data.tasks.tasks || data.tasks.tasks.length === 0) ? '' : i++ + '. '}`,
        name: boldFormatBegin + (posInfo.empName || '') + boldFormatEnd,
        dateFrom: UB.i18n(`{0}&nbsp;року`, AC.dateService.formatDate(e.dateFrom)),
        position: posInfo && posInfo.posName ? posInfo.posName + orgGen + ', ' : '',
        started: e['employeeID.sexType'] === 'W' ? UB.i18n('такою, що приступила') : UB.i18n('таким, що приступив'),
        tabNum: tabNum ? ' ' + tabNum : '',
        reason: e.reason ? UB.i18n(`Підстава: {0}.`, e.reason) : ''
      })
    })

    params.items = params.items.filter(el => el.toOrder)
    if (data.orderDet.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    }
    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    params.tasks = data.tasks.tasks.map(e => ({
      task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(params)
  }
}
