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
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], [['empOrderType', '=', 'ADDPAY']], false),
            UB.Repository('hr_empOrderAddpayDet')
              .attrs([ 'ID', 'dateFrom', 'dateTo', 'isWeekend', 'isTimeWork', 'reason' ])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            UB.Repository('hr_empOrderAddpayListDet')
              .attrs(['ID', 'entityParaID', 'employeeID.datName', 'employeeID.fullFIO'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, orderDetSecond, respPosInfo, city, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderDet,
              orderDetSecond,
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
    let index = 0
    let titleName
    const showTabNum = data.order.showTabNum

    data.order.titleOrder = data.order.titleOrder || UB.i18n('Про оплату додаткової роботи')
    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const params = {
      emblem: HR.reportUtils.getEmblem(),
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: data.printDocumentView,
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      data: [],
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

    data.empOrder.forEach(item => {
      const det = data.orderDet.find(o => o.ID === item.ID)
      if (det) {
        const flt = data.orderDetSecond.filter(d => d.entityParaID === det.ID)
        const empList = _.compact(flt.map(elem => {
          const el = data.empOrder.find(o => o.ID === elem.ID)
          elem = _.merge(elem, el || [])
          const toOrder = data.orderExtract && data.orderExtract.ID
            ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === elem.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === elem.employeePositionID : true))
            : true
          const name = HR.reportUtils.formatShortNameInOrder(elem['employeeID.datName'] || elem['employeeID.fullFIO'], { lastNameInUpperCase: true, notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })
          const posName = HR.reportUtils.makePositionName(elem['employeePositionID.positionID.fullNameDat'] || elem['employeePositionID.positionID.nameDat'] || elem['employeePositionID.positionID.name'] || '', elem['employeePositionID.positionID.isOrgBoss'])
          const tabNum = showTabNum && elem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, elem['employeeNumberID.tabNum']) : ''
          return toOrder ? `${name}${tabNum ? ' ' + tabNum : ''}${posName ? ' ' + posName + orgGen : ''}` : ''
        })).join(', ')

        let text = (data.orderDet && data.orderDet.length > 1) || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? ++index + '. ' : ''
        text += empList ? empList + ', ' : ''
        text += UB.i18n(`оплатити {0} `, det.isWeekend ? UB.i18n('додатково в подвійному розмірі роботу у вихідний день') : UB.i18n('додаткову роботу'))
        if (AC.dateService.formatDate(det.dateFrom) === AC.dateService.formatDate(det.dateTo)) {
          text += UB.i18n(`{0} з&nbsp;{1}&nbsp;години`, AC.dateService.formatDate(det.dateFrom), AC.dateService.formatDate(det.dateFrom, 'hh:nn'))
          text += UB.i18n(` до&nbsp;{0}&nbsp;години `, AC.dateService.formatDate(det.dateTo, 'hh:nn'))
        } else {
          text += UB.i18n(`з&nbsp;{0}&nbsp;години {1}`, AC.dateService.formatDate(det.dateFrom, 'hh:nn'), AC.dateService.formatDate(det.dateFrom))
          text += UB.i18n(` до&nbsp;{0}&nbsp;години {1} `, AC.dateService.formatDate(det.dateTo, 'hh:nn'), AC.dateService.formatDate(det.dateTo))
        }
        text += (det.reason ? ' ' + det.reason : '') + '.'

        if (empList.length || (flt.length && (!data.orderExtract || !data.orderExtract.ID))) {
          params.items.push({
            text: text
          })
        }
      }
    })

    if (data.orderDetSecond.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDetSecond[0]['employeeID.genName'] || data.orderDetSecond[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })
    } else if (data.orderDetSecond.length !== 0) {
      titleName = UB.i18n('працівникам')
    }
    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;'),

    params.tasks = data.tasks.tasks.map(e => ({
      task: `${index === 0 && data.tasks.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(params)
  }
}
