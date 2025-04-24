/* global  UB AC HR */
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
          const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
          const whereArray = [['empOrderType', '=', 'CWSRELAXDONOR']]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, onDate, ['departmentID'], whereArray, true),
            HR.reportUtils.getResponsiblesIncaseInfo(reportParams.instanceID, onDate),
            UB.Repository('hr_empOrderCwsrelaxdonorDet')
              .attrs(['ID', 'employeeID.datName', 'employeeID.fullFIO', 'employeeID.genName', 'employeeID.accusativeName', 'dateFrom', 'dateTo', 'employeeID.sexType'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderResp, orderDet, respPosInfo, city, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderResp,
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
    let i = 1
    let titleName = data.orderDet.length !== 0 ? UB.i18n('працівникам') : ''
    const showTabNum = data.order.showTabNum

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

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
      items: data.orderDet.map(e => {
        const item = data.empOrder.find(o => o.ID === e.ID)

        if (data.orderDet.length === 1) {
          titleName = HR.reportUtils.formatShortNameInOrder(item['employeeID.genName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
        }

        const toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        const posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(item, 'acc', true, data.configObj.notUseMiddleNameInOrder)
        const posInfoDat = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, data.configObj.notUseMiddleNameInOrder)
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
        const res = {
          toOrder: toOrder,
          i: `${!e.dateFrom && data.orderDet.length === 1 && (!data.tasks || !data.tasks.tasks || data.tasks.tasks.length === 0) ? '' : i++ + '. '}`,
          fullFIO: boldFormatBegin + posInfoAcc.empName,
          tabNum: tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd,
          position:  posInfoAcc && posInfoAcc.posName ? posInfoAcc.posName + orgGen : '',
          byHeOrShe: e['employeeID.sexType'] === 'W' ? UB.i18n('нею') : UB.i18n('ним'),
          dateDonor: e.dateTo ? AC.dateService.getStringFormatDate(e.dateTo, '', '').replace(/ /g, '&nbsp;') : ''
        }
        if (e.dateFrom) {
          res.dayRest = {
            i: `${i++}.`,
            dateFrom: AC.dateService.getStringFormatDate(e.dateFrom, '', '').replace(/ /g, '&nbsp;'),
            position: posInfoDat && posInfoDat.posName ? posInfoDat.posName + orgGen : '',
            nameDat: posInfoDat.empName
          }
        }
        return res
      }),
      tasks: data.tasks.tasks.map(e => ({
        task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  }
}
