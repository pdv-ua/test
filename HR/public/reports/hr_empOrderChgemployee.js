/* global _ UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
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
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
      orderReason: order.reason
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
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      items: []
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const whereArray = [['empOrderType', '=', 'CHGEMPLOYEE']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const chgempDet = await UB.Repository('hr_empOrderChgemployeeDet')
      .attrs(['ID', 'fullFIO', 'fullFIOOld', 'firstNameOld', 'lastNameOld', 'middleNameOld', 'genNameOld', 'datNameOld',
        'accusativeNameOld', 'insNameOld', 'locNameOld', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const task = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let itemIdx = 0
    const orgNameGen = order['organizationID.nameGen'] || order['organizationID.name'] || ''
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      const chgempDetItem = _.find(chgempDet, { ID: item.ID })
      if (chgempDetItem) {
        const itemIdxText = (orderDet.length > 1) || (task && task.tasks && task.tasks.length) ? `${++itemIdx}. ` : ''
        const oldEmpName = orderExtract && orderExtract.ID
          ?  HR.reportUtils.getFullName(chgempDetItem['lastNameOld'], chgempDetItem['firstNameOld'], chgempDetItem['middleNameOld'], true)
          : HR.reportUtils.getFullName(item['employeeID.lastName'], item['employeeID.firstName'], item['employeeID.middleName'], true)
        const newEmpName = HR.reportUtils.formatFullNameInOrder(chgempDetItem.fullFIO)
        const oldEmpGenInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, false)

        const empNameGen = HR.reportUtils.formatShortNameInOrder(orderExtract && orderExtract.ID ? chgempDetItem.genNameOld || oldEmpName.empName || '' : oldEmpGenInfo.empName)
        let posNameGen = oldEmpGenInfo.posName
        if (posNameGen) {
          posNameGen = ', ' + HR.reportUtils.makePositionName(posNameGen, item['employeePositionID.positionID.isOrgBoss'])
        }
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

        result.items.push({
          toOrder: toOrder,
          indent: 1,
          text: UB.i18n(`{0}Змінити прізвище {4}{1}{5}{3} на {4}{2}{5}&nbsp;у трудовій книжці, облікових та бухгалтерських документах `,
            itemIdxText, oldEmpName, newEmpName, tabNum ? ' ' + tabNum : '', boldFormatBegin, boldFormatEnd) +
            `${empNameGen}${posNameGen} ${orgNameGen}.`
        })

        if (chgempDetItem.reason) {
          result.items.push({
            toOrder: toOrder,
            text: UB.i18n(`Підстава: {0}.`, chgempDetItem.reason),
            indent: 1
          })
        }
      }
    }

    result.tasks = task.tasks.map(e => ({
      task: `${itemIdx === 0 && task.tasks.length === 1 ? '' : ++itemIdx + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    if (chgempDet.length === 1) {
      const item = orderDet[0]
      const datEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'gen', true)
      if (orderExtract && orderExtract.ID) {
        const chgempDetItem = _.find(chgempDet, { ID: item.ID })
        if (chgempDetItem) {
          datEmpInfo.empName = HR.reportUtils.getFullName(chgempDetItem['lastNameOld'], chgempDetItem['firstNameOld'], chgempDetItem['middleNameOld'], true)
        }
      }
      const titleName = HR.reportUtils.formatShortNameInOrder(datEmpInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
      result.titleName = `${titleName}`
    } else if (chgempDet.length === 0) {
      result.titleName = ''
    } else {
      result.titleName = UB.i18n('працівників')
    }
    result.titleOrder = `${order.titleOrder || ''}${order.titleOrder && result.titleName ? '<br/>' : ''}${result.titleName || ''}`.replace(/&/g, '&nbsp;')
    result.items = result.items.filter(el => el.toOrder)

    return result
  }
}
