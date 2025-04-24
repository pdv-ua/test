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
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const showTabNum = order.showTabNum

    const result = {
      items: [],
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: printDocumentView,
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: responsiblesInfo,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
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
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      titleOrder: 'Про припинення виконання обов’язків' // (order.titleOrder || '').replace(/&/g, '&nbsp;')
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const whereArray = [['empOrderType', '=', 'ACTINGCLOSE']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const actingOrdDet = await UB.Repository('hr_empOrderActingcloseDet')
      .attrs(['ID', 'positionID', 'employeeID', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const actingDet = await UB.Repository('hr_empOrderActingCloseEmp')
      .attrs(['ID', 'itemIdx', 'paraID', 'dateTo'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let itemIdx = 0
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const actingOrdDetItem = _.find(actingOrdDet, { ID: item.ID })
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (actingOrdDetItem) {
        /*
        let posInfoGen = HR.reportUtils.formatFullName(item['employeeID.genName'] || item['employeeID.fullFIO'], true)
        posInfoGen = posInfoGen ? ` <b>${posInfoGen}</b>` : ''
        const actingPosName = HR.reportUtils.makePositionName(item['employeePositionID.positionID.fullNameGen'] || item['employeePositionID.positionID.nameGen'] || item['employeePositionID.positionID.name'] || '', item['employeePositionID.positionID.isOrgBoss'])
        */
        let posInfoGen = ''
        let actingPosName = ''
        if (item.employeePositionID) {
          const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
          const genPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', false, result.notUseMiddleNameInOrder)
          posInfoGen = genPosInfo.empName ? ` ${boldFormatBegin}${genPosInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}` : ''
          actingPosName = genPosInfo.posName
        } else {
          actingPosName = item['positionID.fullNameGen'] || item['positionID.fullName'] || item['positionID.name'] || ''
        }

        const actingDetItems = actingDet.filter(itm => itm.paraID === item.ID && itm.ID !== item.ID)
        let orderWord = UB.i18n('Припинити')
        orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
        if (actingDetItems.length) {
          const itemIdxText = orderDet.length === 1 && taskDet.tasks.length === 0 ? '' : `${++itemIdx}. `
          if (actingDetItems.length) {
            if (actingDetItems.length === 1) {
              const actingDetItem = actingDetItems[0]
              const empItem = _.find(orderDet, { ID: actingDetItem.ID })
              const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(empItem, 'dat', true, result.notUseMiddleNameInOrder)
              const datName = datPosInfo.empName
              const posName = datPosInfo.posName ? ', ' + HR.reportUtils.makePositionName(datPosInfo.posName, empItem['employeePositionID.positionID.isOrgBoss']) + orgGen + ',' : ''
              const dateTo = actingDetItem.dateTo ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(actingDetItem.dateTo) : ''
              const tabNum = showTabNum && empItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, empItem['employeeNumberID.tabNum']) : ''

              let text = UB.i18n(`{7} {0}{6}{1} виконання обов'язків{2} {3}{4}{5}.`, boldFormatBegin + datName + boldFormatEnd, posName, posInfoGen.length ? '' : UB.i18n(' за посадою'),
                actingPosName, posInfoGen, dateTo, tabNum ? ' ' + tabNum : '', orderWord)
              text = text.replace('</b> ', ' </b>')
              result.items.push({
                toOrder: toOrder,
                index: itemIdxText,
                text: text,
                emps: []
              })
            } else {
              let text = UB.i18n(`{4} виконання обов'язків{0} {1}{2} таким працівникам {3}:`, posInfoGen.length ? '' : UB.i18n(' за посадою'), actingPosName, posInfoGen, result.organizationNameGen, orderWord)
              text = text.replace('</b> ', ' </b>')

              const resItem = {
                toOrder: toOrder,
                index: itemIdxText,
                text: text,
                emps: []
              }
              for (let j = 0; j < actingDetItems.length; j++) {
                const actingDetItem = actingDetItems[j]
                const empItem = _.find(orderDet, { ID: actingDetItem.ID })
                const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(empItem, 'dat', true, result.notUseMiddleNameInOrder)
                const datName = datPosInfo.empName
                const posName = datPosInfo.posName ? ', ' + HR.reportUtils.makePositionName(datPosInfo.posName, empItem['employeePositionID.positionID.isOrgBoss']) + orgGen : ''
                const dateTo = actingDetItem.dateTo ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(actingDetItem.dateTo) : ''
                let lastChar = (j === actingDetItems.length - 1) ? '.' : ';'
                const aTabNum = showTabNum && empItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, empItem['employeeNumberID.tabNum']) : ''
                text = `${datName}${aTabNum ? ' ' + aTabNum : ''}${posName}${dateTo}${lastChar}`
                text = text.replace('</b> ', ' </b>')
                resItem.emps.push({
                  text: text
                })
              }
              result.items.push(resItem)
            }
          }
          if (actingOrdDetItem.reason) {
            result.items.push({
              toOrder: toOrder,
              text: UB.i18n(`Підстава: {0}.`, actingOrdDetItem.reason),
              emps: []
            })
          }
        }
      }
    }

    if (result.items.length === 1 && (!taskDet.tasks || taskDet.tasks.length === 0)) {
      result.items[0].index = ''
    }
    result.items = result.items.filter(el => el.toOrder)

    if (taskDet) {
      result.tasks = taskDet.tasks.map(e => ({
        task: `${itemIdx === 0 && taskDet.tasks.length === 1 ? '' : ++itemIdx + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      }))
    }

    return result
  }
}
