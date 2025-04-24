/* global UB AC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => me.getParams(data)).then(params => AC.reportService.generateReport(params, me))
  },

  getData (reportParams) {
    return Promise.all([
      HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => Promise.all([
      HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, undefined, undefined, false),
      UB.Repository('hr_empOrderVacationlongDet')
        .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'reason', 'reasonDoc', 'employeeID.fullFIO', 'employeeID.datName',
          'employeeID.genName', 'dictVacationKindID.nameGen', 'dictVacationKindID.name'])
        .where('orderID', '=', reportParams.instanceID)
        .orderBy('itemIdx')
        .selectAsObject(),
      UB.Repository('hr_empOrderMaterialtransferDet')
        .attrs(['ID', 'employeePositionID', 'toEmployeePositionID.employeeID.datName', 'toEmployeePositionID.employeeID.fullFIO',
          'toEmployeePositionID.positionID.nameDat', 'toEmployeePositionID.positionID.name'])
        .where('orderID', '=', reportParams.instanceID)
        .where('toEmployeePositionID.positionID.mi_dateFrom', '<=', order.orderDate || order.entryDate)
        .where('toEmployeePositionID.positionID.mi_dateTo', '>=', order.orderDate || order.entryDate)
        .where('toEmployeePositionID.positionID.state', '=', 'ACTIVE')
        .where('toEmployeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
        .orderBy('itemIdx')
        .selectAsObject(),
      UB.Repository('hr_commission')
        .attrs(['orderID', 'employeePositionID.description', 'memberType.name'])
        .where('orderID', '=', reportParams.instanceID)
        .where('memberType.mi_deleteDate', '>=', '#maxdate')
        .orderBy('memberType')
        .orderBy('lineNum')
        .selectAsObject(),
      HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate),
      HR.reportUtils.getResponsiblesForOrder(order),
      HR.reportUtils.getCityName(order.organizationID)
    ]).then(([empOrder, orderDet, matTransfer, commission, tasks, respPosInfo, city]) => ({
      empOrder,
      orderDet,
      matTransfer,
      commission,
      tasks,
      respPosInfo,
      city,
      order
    })))
  },

  getParams: async function (data) {
    const me = this
    let i = 1
    let titleName
    if (data.orderDet.length === 1) {
      titleName = HR.reportUtils.formatShortName(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'])
    } else if (data.orderDet.length !== 0) {
      titleName = UB.i18n('працівників')
    }

    const params = {
      emblem: HR.reportUtils.getEmblem(),
      city: data.city,
      orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
      orderNumber: data.order.orderNumber,
      orderDate: AC.dateService.getStringFormatDate(data.order.orderDate, '', ''),
      titleOrder: `${data.order.titleOrder || ''}${titleName ? `<br/>${titleName}` : ''}`.replace(/&/g, '&nbsp;'),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      organizationName: HR.reportUtils.fixOrganizationName((data.order['organizationID.nameNom'] || data.order['organizationID.name']).toUpperCase()),
      orderReason: data.order.reason ? { reason: UB.i18n(`Підстава: {0}.`, data.order.reason) } : null,
      items: data.orderDet.map(e => {
        const item = data.empOrder.find(o => o.ID === e.ID)
        _.merge(e, item || [])
        return {
          text: `${i++}. ${UB.i18n('НАДАТИ')} ${HR.reportUtils.formatFullName(e['employeeID.datName'] || e['employeeID.fullFIO'], true)} ` +
              (e['employeePositionID.positionID.fullNameDat'] || e['employeePositionID.positionID.nameDat'] || e['employeePositionID.positionID.name']) +
          `, ${HR.nameCase.uncap(e['dictVacationKindID.nameGen'] || e['dictVacationKindID.name'] || '')} ` +
          UB.i18n(` з&nbsp;{0}`, e.dateFrom.getFullYear() === e.dateTo.getFullYear() ? AC.dateService.formatDate(e.dateFrom, 'dd mmm') : AC.dateService.getStringFormatDate(e.dateFrom, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;')) +
          UB.i18n(` по&nbsp;{0}`, AC.dateService.getStringFormatDate(e.dateTo, '', '', ' року').replace(/ /g, '&nbsp;')) +
          (e.reason ? ' ' + e.reason : '') + '.',
          matTransfer: me.getMatTransferInfo(e.employeePositionID, data.matTransfer, data.commission, data.orderDet)
        }
      }),
      unrefMatTransfer: me.getMatTransferInfo(null, data.matTransfer, data.commission, data.orderDet, data.matTransfer.length > 0 ? i++ : i),
      tasks: data.tasks.tasks.map(e => ({
        task: `${i++}. ${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo
    }
    await HR.reportUtils.getOrderPrintConfig(params, data.order.subOrganization ? data.order.masterOrganizationID : data.order.organizationID)
    return AC.reportService.removeEmptyValues(params)
  },

  getMatTransferInfo: function (employeePositionID, matTransfer, commission, orderDet, idx) {
    const res = []
    let matTransferItems
    if (employeePositionID) {
      matTransferItems = matTransfer.filter(item => item.employeePositionID === employeePositionID)
    } else {
      matTransferItems = []
      matTransfer.forEach(matTransItem => {
        const orderDetRef = orderDet.find(item => item.employeePositionID === matTransItem.employeePositionID)
        if (!orderDetRef) {
          matTransferItems.push(matTransItem)
        }
      })
    }
    matTransferItems.forEach(matTransItem => {
      const empName = matTransItem['toEmployeePositionID.employeeID.datName'] || matTransItem['toEmployeePositionID.employeeID.fullFIO']
      const posName = matTransItem['toEmployeePositionID.positionID.nameDat'] || matTransItem['toEmployeePositionID.positionID.name']
      const header = UB.i18n(`{0}, {1}, прийняти матеріальні цінності по акту прийому-передачі при участі комісії у складі:`, empName, posName)
      const members = []
      commission.forEach(item => {
        members.push(`${item['employeePositionID.description']} - ${item['memberType.name']}`)
      })
      const footer = UB.i18n(`Акт прийому-передачі подати в бухгалтерію`)
      res.push({
        index: idx,
        text: `${header} ${members.length ? members.join(', ') : '... '}. ${footer}.`
      })
    })
    return res
  }
}
