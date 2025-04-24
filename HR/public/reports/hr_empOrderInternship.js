/* global UB, AC, HR */
exports.reportCode = {
  buildReport  (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0)
      .then(data => AC.reportService.generateReport(data, me))
  },

  async getReportData (ID, orderExtraID) {
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
      items: [],
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
      titleOrder: (order.titleOrder || UB.i18n('Про стажування')).replace(/&/g, '&nbsp;'),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;')
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWordIntern = UB.i18n('Допустити')
    let orderWord = UB.i18n('Призначити')
    orderWordIntern = result.smallOrderWord ? orderWordIntern : orderWordIntern.toUpperCase()
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const whereArray = [
      ['empOrderType', '=', 'INTERNSHIP'],
      ['mi_unityEntity', '!=', 'hr_empOrderInternshipListDet']
    ]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID', 'isGroup'], whereArray, true)
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    const internships = await UB.Repository('hr_empOrderInternshipDet')
      .attrs('ID', 'departmentID.name', 'departmentID.nameNom', 'departmentID.nameLoc', 'internshipType', 'dateFrom', 'dateTo',
        'payElID.name', 'payElID.orName', 'bountySum', 'valuationType', 'valuationType.name', 'educationOrgID.name',
        'educationOrgID.nameGen', 'description')
      .where('orderID', '=', ID)
      .selectAsObject()

    const interns = await UB.Repository('hr_empOrderInternshipListDet')
      .attrs('lastName', 'firstName', 'middleName', 'paraID')
      .where('orderID', '=', ID)
      .selectAsObject()

    interns.forEach(item => {
      item.fullName = result.notUseMiddleNameInOrder
        ? [item.lastName, item.firstName].filter(Boolean).join(' ')
        : [item.lastName, item.firstName, item.middleName].filter(Boolean).join(' ')
      item.shortName = result.notUseMiddleNameInOrder
        ? [item.lastName, item.lastName && item.firstName ? ' ' : '', item.firstName ? item.firstName.substr(0, 1).toUpperCase() + '.' : ''].filter(Boolean).join('')
        : [item.lastName, item.lastName && (item.firstName || item.middleName) ? ' ' : '', item.firstName ? item.firstName.substr(0, 1).toUpperCase() + '.' : '', item.middleName ? item.middleName.substr(0, 1).toUpperCase() + '.' : ''].filter(Boolean).join('')
    })
    let index = 1
    internships.forEach(item => {
      const det = orderDet.find(el => el.ID === item.ID)
      _.merge(item, det || [])
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true

      const itemInterns = interns.filter(intern => intern.paraID === item.ID)
      const internshipType = item.internshipType === '0' ? UB.i18n('виробничої практики') : item.internshipType === '1' ? UB.i18n('переддипломної практики') : UB.i18n('стажування')

      const educationOrg = item['educationOrgID.nameGen'] || item['educationOrgID.name']
      const payElName = item['payElID.orName'] || item['payElID.name']
      result.items.push({
        toOrder,
        text:  `${index++}. ` + orderWordIntern + ' ' + UB.i18n('до проходження') + ' ' + internshipType +
          ' ' + UB.i18n(`з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(item.dateFrom), AC.dateService.formatDate(item.dateTo)) +
          ' ' + UB.i18n('у') + ' ' + (item['departmentID.nameNom'] || item['departmentID.name']) +
          (educationOrg ? ' ' + UB.i18n('студентів') + ' ' + educationOrg : '') + (itemInterns.length ? ' ' : '') + itemInterns.map(elem => elem.shortName).join(', ') + (itemInterns.length ? '' : '.')
      })

      const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? ' ' + UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'acc', true, result.notUseMiddleNameInOrder)

      let bountySumText = ''
      if (item.bountySum) {
        bountySumText = (payElName ? ' ' + UB.i18n('з') + ' ' + HR.nameCase.uncap(payElName) : '')
        if (item.valuationType) {
            if (item.valuationType === 'RATE') {
              bountySumText += ` ${item.bountySum}&nbsp;${AC.dateService.plural('відсоток_відсотків_відсотків', item.bountySum)} ${UB.i18n('посадового окладу')}`
            } else {
              bountySumText += ` ${HR.reportUtils.formatAsCurrency(item.bountySum)}&nbsp;${UB.i18n('грн')}`
            }
        } else {
          bountySumText += ' ' + item.bountySum
        }
      }
      bountySumText += bountySumText.length && bountySumText.substr(-1) === '.' ? '' : '.'

      result.items.push({
        toOrder,
        text: (internships.length > 1 || (taskDet.tasks && taskDet.tasks.length) ? '' : `${index++}. `) + orderWord +
          ' ' + UB.i18n('керівником') + ' ' + internshipType + (itemInterns.length ? ' ' : '') +
          itemInterns.map(elem => elem.shortName).join(', ') + (posInfo.posName ? ' ' + posInfo.posName + orgGen : '') +
          (posInfo.empName ? ' ' : '') + boldFormatBegin + (posInfo.empName || '') + (tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd) +
          bountySumText
      })

    })

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    result.items = result.items.filter(el => el.toOrder)

    return result
  }
}
