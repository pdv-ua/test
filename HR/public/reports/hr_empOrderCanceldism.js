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
        const whereArray = [['empOrderType', '=', 'CANCELDISM']]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
            const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
            const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
            const configObj = { printDocumentView }
            return Promise.all([
              HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
              HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
              UB.Repository('hr_empOrderCanceldismDet')
                .attrs(['ID', 'employeeID', 'dismParaID.orderID.orderNumber', 'employeeID.accusativeName', 'dismParaID.orderID.dictEmpOrderIndexID.code', 'dismParaID.orderID.orderDate',
                  'employeeID.genName', 'employeeID.fullFIO', 'dateFrom', 'dismOrderID', 'dismParaID.dateFrom' ])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
              HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
              printDocumentView
            ]).then(([configObj, empOrder, orderDet, respPosInfo, city, printDocumentView]) => {
              const ids = orderDet && orderDet.length > 0 ? _.uniq(orderDet.map(el => el.dismOrderID)) : []
              return Promise.all([
                HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
                UB.Repository('hr_publServRang')
                  .attrs(['employeeID', 'dictRankID.code', 'dictRankID.name', 'dictRankID.printName', 'dateFrom', 'dateTo'])
                  .exists(UB.Repository('hr_empOrderDet')
                    .correlation('employeeID', 'employeeID')
                    .whereIf(ids && ids.length > 0, 'orderID', 'in', ids)
                    .whereIf(!ids || ids.length === 0, 'orderID', '=', 0)
                    .where('dateTo', '=', '#maxdate', 'exp2')
                    .where('dateTo', 'isNull', undefined, 'exp1')
                    .where('mi_deleteDate', '>=', '#maxdate')
                    .logic('(([exp1]) or ([exp2]))'))
                  .selectAsObject()
              ]).then(([tasks, rankInfo]) => ({
                empOrder,
                orderDet,
                rankInfo,
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
    let titleName

    const showTabNum = data.order.showTabNum

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''

    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const params = {
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      emblem: HR.reportUtils.getEmblem(),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      data: [],
      orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
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
        const rank = data.rankInfo.find(el => el.employeeID === e.employeeID &&
          el.dateFrom <= e['dismParaID.dateFrom'] &&
          (el.dateTo || AC.dateService.maxDate()) >= e['dismParaID.dateFrom'])
        const item = data.empOrder.find(o => o.ID === e.ID)
        _.merge(e, item || [])
        const toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        const genPosInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'gen', false, data.configObj.notUseMiddleNameInOrder)
        const tabNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
        return {
          toOrder: toOrder,
          i: `${data.orderDet.length === 1 && (!data.tasks || !data.tasks.tasks || data.tasks.tasks.length === 0) ? '' : i++ + '. '}`,
          i2: `${data.orderDet.length === 1 && (!data.tasks || !data.tasks.tasks || data.tasks.tasks.length === 0) ? '' : i++ + '. '}`,
          rmDate: AC.dateService.formatDate(e['dismParaID.orderID.orderDate']),
          rmOrderNumder: '№&nbsp;' + e['dismParaID.orderID.orderNumber'] + (e['dismParaID.orderID.dictEmpOrderIndexID.code'] ? `/${e['dismParaID.orderID.dictEmpOrderIndexID.code']}` : ''),
          name: boldFormatBegin + HR.reportUtils.formatFullNameInOrder(e['employeeID.genName'] || e['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder }) + boldFormatEnd,
          tabNum: tabNum ? ' ' + tabNum : '',
          accusativeName: HR.reportUtils.formatShortNameInOrder(e['employeeID.accusativeName'] || e['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder }),
          shortName: HR.reportUtils.formatShortNameInOrder(e['employeeID.genName'] || e['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder }),
          dateFrom: e.dateFrom ? UB.i18n(`{0} року`, AC.dateService.formatDate(e.dateFrom)) : '',
          dateOrderRm: AC.dateService.formatDate(e['dismParaID.orderID.orderDate']),
          position: genPosInfo && genPosInfo.posName ? genPosInfo.posName + orgGen : '', // HR.reportUtils.makePositionName(e['employeePositionID.positionID.fullNameGen'] || e['employeePositionID.positionID.nameGen'] || e['employeePositionID.positionID.name'] || '', e['employeePositionID.positionID.isOrgBoss']) + orgGen,
          rankInfo: rank ? UB.i18n(`, {0} присвоєно {1}`, e['employeeID.sexType'] ? 'якій' : 'якому', (rank['dictRankID.printName'] || '').replace(/ /g, '&nbsp;')) : ''
        }
      }),
      tasks: data.tasks.tasks.map(e => ({
        task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo
    }

    HR.reportUtils.copyToParams(params, data.configObj)
    if (data.orderDet.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    }
    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  }
}
