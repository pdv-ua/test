/* global UB, AC _ HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const me = this
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
      titleOrder: UB.i18n('Про заохочення'),
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
      items: []
    }

    // _.merge(result, order)
    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Нагородити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const whereArray = [['empOrderType', '=', 'REWARD']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID', 'isGroup'], whereArray, true)
    let detail = await UB.Repository('hr_empOrderRewardDet')
      .attrs(['ID', 'bonusID.name', 'bonusID.caseType', 'bonusID.directive', 'bonusID.title', 'title', 'isExternal', 'employeeID.fullFIO',
        'firstName', 'middleName', 'lastName'])
      .where('orderID', '=', ID)
      .orderBy('bonusID.name')
      .orderBy('lastName')
      .orderBy('firstName')
      .orderBy('middleName')
      .selectAsObject()
    const tasks = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let iter = 1
    if (detail.length === 1) {
      const item = detail[0]
      const el = orderDet.find(o => o.ID === item.ID)
      _.merge(item, el || [])
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      const empName = HR.reportUtils.getInfoItemOrderInCase(item, item['bonusID.caseType'].toLowerCase() || 'gen', true, result.notUseMiddleNameInOrder)
      const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
      let text = `${tasks && tasks.tasks && tasks.tasks.length ? `${iter++}. ` : ''}${item['bonusID.directive'] ? me.getDirective(item['bonusID.directive'], result.smallOrderWord) : orderWord  + ' ' + HR.nameCase.uncap(item['bonusID.name'])}`
      if (item.isExternal) {
        empName.empName = HR.reportUtils.getFullName(item.lastName, item.firstName, item.middleName, true)
        empName.posName = item.title || ''
      }
      text += ` ${boldFormatBegin}${empName.empName}${tabNum? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${empName.posName ? ', ' + HR.reportUtils.makePositionName(empName.posName, item['employeePositionID.positionID.isOrgBoss']) + orgGen : ''}.`
      if (toOrder) {
        result.items.push({
          text: text
        })
      }

      result.titleOrder = item['bonusID.title'] ? item['bonusID.title'] : UB.i18n('Про заохочення ') + HR.nameCase.uncap(item['bonusID.name'])
    } else {
      detail = _.groupBy(detail, 'bonusID.name')
      _.forEach(detail, items => {
        if (_.size(detail) === 1) {
          result.titleOrder = items[0]['bonusID.title'] ? items[0]['bonusID.title'] : UB.i18n('Про заохочення ') + HR.nameCase.uncap(items[0]['bonusID.name'])
        }
        result.items.push({
          text: `${_.size(detail) > 1 || (tasks && tasks.tasks && tasks.tasks.length) ? `${iter++}. ` : ''}${items[0]['bonusID.directive'] ? me.getDirective(items[0]['bonusID.directive'], result.smallOrderWord) : orderWord + ' ' + HR.nameCase.uncap(items[0]['bonusID.name'])}:`,
          data: items.map((item, npp) => {
            const el = orderDet.find(o => o.ID === item.ID)
            _.merge(item, el || [])
            const toOrder = orderExtract && orderExtract.ID
              ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
              : true
            const empName = HR.reportUtils.getInfoItemOrderInCase(item, item['bonusID.caseType'].toLowerCase() || 'gen', true, result.notUseMiddleNameInOrder)
            const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
            if (item.isExternal) {
              empName.empName = HR.reportUtils.getFullName(item.lastName, item.firstName, item.middleName, true)
              empName.posName = item.title || ''
            }
            return {
              toOrder: toOrder,
              text: `${boldFormatBegin}${empName.empName}${tabNum? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${empName.posName ? ', ' + HR.reportUtils.makePositionName(empName.posName, item['employeePositionID.positionID.isOrgBoss']) + orgGen : ''}${npp === items.length - 1 ? '.' : ';'}`
            }
          }).filter(el => el.toOrder)
        })
      })
      result.items = result.items.filter(el => el.data.length)
    }

    result.tasks = tasks.tasks.map(e => ({
      task: `${iter > 1 ? (iter++) + '. ' : ''}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return result
  },

  getDirective: function (directive, smallOrderWord) {
    if (!directive) return ''
    if (smallOrderWord) return directive
    directive = directive.split(' ')
    directive[0] = directive[0].toUpperCase()
    return directive.join(' ')
  }
}
