/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams)
      .then(data => me.getParams(data))
      .then(params => AC.reportService.generateReport(params, me))
  },

  getData (reportParams) {
    return Promise.all([
      HR.reportUtils.getEmpOrderExtract(reportParams.params ? reportParams.params.orderExtraID || 0 : 0)])
      .then(([orderExtract]) => {
        const whereArray = [['empOrderType', 'in', 'VEHICLEASSIGN']]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderVehicleassignDet')
              .attrs(['ID', 'employeeID.genName', 'employeeID.accusativeName', 'employeeID.fullFIO', 'employeeID.sexType',
                'dateFrom', 'dateTo', 'vehicleID.description', 'vehicleID.govNum', 'strVehicle', 'givingType'])
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
    let titleName
    const showTabNum = data.order.showTabNum
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', data.order['organizationID']) === true

    data.order.titleOrder = data.order.titleOrder || UB.i18n('Про закріплення автотранспортного засобу')

    let i = 1
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
      titleOrder: `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;'),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      text: data.orderDet.length >= 1,
      items: [],
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)

    data.orderDet.forEach(e => {
      let orderWord = e.givingType === 'ASSIGN'
        ? UB.i18n('ЗАКРІПИТИ')
        : UB.i18n('НАДАТИ')
      orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
      const boldFormatBegin = params.normalFullName ? '' : '<b>'
      const boldFormatEnd = params.normalFullName ? '' : '</b>'

      const item = data.empOrder.find(o => o.ID === e.ID)
      _.merge(e, item || [])
      const toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      const caseCode = e.givingType === 'ASSIGN' ? 'ins' : 'dat'
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, caseCode, true, params.notUseMiddleNameInOrder)
      if (caseCode === 'ins') {
        posInfo.posName = e['employeePositionID.dictPositionID.nameOr'] || posInfo.posName
      } else {
        posInfo.posName = posInfo['dictPosName']
      }
      posInfo.posName = HR.nameCase.uncap(posInfo.posName)
      if (useActualPositionName) {
        posInfo.posName += ' ' + e['employeePositionID.posNameAddition']
        posInfo.posName += ' ' + e['employeePositionID.departmentID.nameGen']
      }
      const tabNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
      let text = `${orderWord} з ` +
        AC.dateService.formatDate(e.dateFrom) + ' року' +
        (e.dateTo ? ` по ${AC.dateService.formatDate(e.dateTo)} року ` : ' ') +
        (e.givingType === 'ASSIGN' ? ' за ' : '') +
        `${boldFormatBegin}${posInfo.empName || ''}${boldFormatEnd}${tabNum ? ' ' + tabNum : ''}, ${posInfo.posName}` +
        (e.givingType === 'ASSIGN' ? UB.i18n(' автотранспортний засіб ') : UB.i18n(' право керування автотранспортним засобом ')) +
        `${e['strVehicle']}` +
        (e.givingType === 'ASSIGN' ? UB.i18n(' з правом керування та обслуговування даного автотранспортного засобу.') : UB.i18n('.'))

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
    params.tasks = data.tasks.tasks.map(e => ({
      task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  }
}
