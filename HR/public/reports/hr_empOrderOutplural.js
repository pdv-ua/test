/* global _ UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      items: []
    }
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    result.orderType = orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З')
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }
    const showTabNum = order.showTabNum

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '')
    result.orderNumber = order.orderNumber
    result.orderIndex = order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
    result.organizationName = order.orderOrganizationName
    result.titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')
    result.city = await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID)
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const whereArray = [['empOrderType', '=', 'OUTPLURAL']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const outPluralDet = await UB.Repository('hr_empOrderOutpluralDet')
      .attrs(['ID', 'dateFrom', 'reason'])
      .where('orderID', '=', ID)
      .selectAsObject()

    let index = 0
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const outPluralDetItem = _.find(outPluralDet, { ID: item.ID })
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (outPluralDetItem) {
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
        const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, result.notUseMiddleNameInOrder)
        const genPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, result.notUseMiddleNameInOrder)
        const itemIdxText = outPluralDet.length === 1 && taskDet.tasks.length === 0 ? '' : `${++index}. `
        const dateFrom = AC.dateService.formatDate(AC.dateService.addDays(outPluralDetItem.dateFrom, 1))
        let orderWord = UB.i18n('Припинити')
        orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
        result.items.push({
          toOrder: toOrder,
          text: `${itemIdxText}${UB.i18n('{0} оплату сумісництва', orderWord)} ${boldFormatBegin}${datPosInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${genPosInfo.posName ? UB.i18n(' по посаді ') +
              HR.reportUtils.makePositionName(genPosInfo.posName, item['employeePositionID.positionID.isOrgBoss']) + orgGen : ''}` +
            ` ${UB.i18n('з')}&nbsp;${dateFrom}${outPluralDetItem.reason ? ' ' + outPluralDetItem.reason : ''}.`
        })
      }
    }
    if (outPluralDet.length === 1) {
      const item = orderDet[0]
      const genEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'gen', true)
      const titleName = HR.reportUtils.formatShortNameInOrder(genEmpInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
      result.titleOrder += `${result.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
    } else if (outPluralDet.length > 1) {
      result.titleOrder += UB.i18n(` працівників`)
    }

    result.items = result.items.filter(el => el.toOrder)
    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 0 & taskDet.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
