/* global _ UB AC HR */
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
      items: [],
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
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || ''
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    const whereArray = [['empOrderType', '=', 'ACTINGORD']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const actingOrdDet = await UB.Repository('hr_empOrderActingordDet')
      .attrs(['ID', 'employeeID.datName', 'employeeID.fullFIO', 'actingReasonKindID.orderText', 'dateFrom', 'dateTo', 'employeeID.genName', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject({
        'actingReasonKindID.orderText' : 'actingReason'
      })
    const actingDet = await UB.Repository('hr_empOrderActingDet')
      .attrs(['ID', 'itemIdx', 'paraID', 'employeeID', 'employeeID.accusativeName', 'employeeID.datName', 'employeeID.genName', 'employeeID.fullFIO',
        'employeePositionID', 'dateFrom', 'dateTo', 'condition', 'payForExtraLoad',
        'payElID.calcAlgorithm', 'positionID.positionType'
      ])
      .attrsIf(showTabNum, ['employeeNumberID.tabNum'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['accusativeName', 'datName', 'genName', 'fullFIO'], actingDet)

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    result.titleOrder = actingDet && actingDet.length === 1 ? UB.i18n('Про тимчасове покладення виконання обов’язків') : result.titleOrder

    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true
    const ids = _.uniq(actingDet.map(item => item.employeePositionID))
    let employeePosition = await HR.reportUtils.getPromiseEmployeePositionForOrders(ids, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Acc'], useSexType)
    employeePosition = employeePosition && employeePosition.length ? _.groupBy(employeePosition, 'ID') : []

    /*
    for (let i = 0; i < ids.length; i++) {
      employeePosition[ids[i]] = await HR.reportUtils.getResponsiblesIncaseInfo(ids[i], order.orderDate || order.entryDate, 'acc')
    }
       */

    let itemIdx = 0
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const actingOrdDetItem = _.find(actingOrdDet, { ID: item.ID })
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (actingOrdDetItem) {
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
        let posInfoGen = HR.reportUtils.formatFullNameInOrder(item['employeeID.genName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
        posInfoGen = posInfoGen ? ` ${boldFormatBegin}${posInfoGen}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}` : ''

        let posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, result.notUseMiddleNameInOrder, item.employeePositionID ? 'employeePositionID.' : '', {
          notActualPositionName: !item.employeePositionID
        })
        const newPosName = posInfo.posName
        // const newPosName = HR.reportUtils.makePositionName(item['employeePositionID.positionID.fullNameGen'] || item['employeePositionID.positionID.nameGen'] || item['employeePositionID.positionID.name'] || '', item['employeePositionID.positionID.isOrgBoss'])

        const mainDateFrom = actingOrdDetItem.dateFrom
        const mainDateTo = actingOrdDetItem.dateTo
        const positionType = item['employeePositionID.positionID.positionType'] === '1'
        const actingDetItems = actingDet.filter(itm => itm.paraID === item.ID && itm.ID !== item.ID)
        let orderWord = UB.i18n('Покласти')
        orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
        if (actingDetItems.length) {
          const itemIdxText = orderDet.length === 1 && taskDet.tasks.length === 0 ? '' : `${++itemIdx}. `
          if (actingDetItems.length === 1) {
            const actingDetItem = actingDetItems[0]
            const empNameAcc = result.notUseMiddleNameInOrder
              ? HR.reportUtils.formatFullNameInOrder(actingDetItem['employeeID.accusativeName'] || actingDetItem['employeeID.fullFIO'] || '', { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
              : actingDetItem['employeeID.accusativeName'] || actingDetItem['employeeID.fullFIO'] || ''
            // const posInfoAcc = employeePosition[actingDetItem.employeePositionID]
            let posNameAcc = '' // posInfoAcc.respPosFull.length ? ', ' + HR.nameCase.uncap(posInfoAcc.respPosFull) + orgGen : ''
            // if (posNameAcc.length && item.employeePositionID) {
            //  posNameAcc += ','
            // }
            if (employeePosition[actingDetItem.employeePositionID]) {
              let posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[actingDetItem.employeePositionID][0], 'acc', true, result.notUseMiddleNameInOrder, '')
              posNameAcc = posInfo.posName ? ', ' + posInfo.posName + orgGen + ',' : ''
            }
            const dateFrom = actingDetItem.dateFrom || mainDateFrom
            const dateFromStr = dateFrom ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(dateFrom) : ''
            const dateTo = actingDetItem.dateTo || mainDateTo
            const dateToStr = dateTo && AC.dateService.formatDate(dateTo) !== '31.12.9999' ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(dateTo) : ''
            const payForExtraLoad = actingDetItem.payForExtraLoad || (actingDetItem['payElID.calcAlgorithm'] && actingDetItem['payElID.calcAlgorithm'] === '1')

            let text = ''
            if (item.employeePositionID) {
              text = UB.i18n(`{0}{12} тимчасово виконання обов'язків {1}{2}{3} на {4}{10}{5}{6}{7}{8}{9}{11}.`, itemIdxText, newPosName, orgGen, posInfoGen,
                boldFormatBegin + (empNameAcc || '') + boldFormatEnd,
                posNameAcc, dateFromStr, dateToStr, dateFromStr || dateToStr ? UB.i18n('&nbsp;року') : '', actingDetItem.condition ? ' ' + actingDetItem.condition : '', tabNum ? ' ' + tabNum : '',
                actingOrdDetItem.actingReason ? ' ' + actingOrdDetItem.actingReason : '', orderWord)
            } else {
              text = UB.i18n(`{0}{2} тимчасово{1}`, itemIdxText, dateFromStr, orderWord) +
                (dateToStr || UB.i18n(` до призначення в установленому законодавством порядку {0}{1},`, newPosName, orgGen)) +
                UB.i18n(` виконання обов'язків за відповідною вакантною посадою на {0}{1}{2}.`, boldFormatBegin + (empNameAcc || '') + boldFormatEnd,
                  posNameAcc, actingOrdDetItem.actingReason ? ' ' + actingOrdDetItem.actingReason : '')
            }
            text = text.replace('</b> ', ' </b>')
            result.items.push({
              toOrder: toOrder,
              indent: 1,
              text: text
            })
            if (payForExtraLoad) {
              result.items.push({
                toOrder: toOrder,
                indent: 1,
                text: UB.i18n(`Встановити {0} `, HR.reportUtils.formatShortNameInOrder(actingDetItem['employeeID.datName'] || actingDetItem['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })) +
                  UB.i18n(`виплату за додаткове навантаження у зв’язку з виконанням обов’язків тимчасово відсутнього {0} `, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника')) +
                    me.getExtraLoadInfo(actingDetItem.payForExtraLoad, actingDetItem['payElID.calcAlgorithm'], actingDetItem['positionID.positionType'] === '1', positionType, '.')
              })
            }
          } else {
            const resItem = {
              toOrder: toOrder,
              indent: 1,
              text: item.employeePositionID
                ? UB.i18n(`{0}{6} тимчасово виконання обов’язків {1}{2}{3} на таких працівників {4}{5}:`, itemIdxText, newPosName, orgGen, posInfoGen, result.organizationNameGen, actingOrdDetItem.actingReason ? ' ' + actingOrdDetItem.actingReason : '', orderWord)
                : UB.i18n(`{0}{5} тимчасово до призначення в установленому законодавством порядку {1}{2}, виконання обов'язків за відповідною вакантною посадою на таких працівників {3}{4}:`, itemIdxText, newPosName, orgGen, result.organizationNameGen, actingOrdDetItem.actingReason ? ' ' + actingOrdDetItem.actingReason : '', orderWord),
              emps: []
            }
            for (let j = 0; j < actingDetItems.length; j++) {
              const actingDetItem = actingDetItems[j]
              // const posInfo = employeePosition[actingDetItem.employeePositionID]
              let posName = '' // posInfo.respPosFull.length ? ' - ' + HR.nameCase.uncap(posInfo.respPosFull) : ''
              const empNameAcc = result.notUseMiddleNameInOrder
                ? HR.reportUtils.formatFullNameInOrder(actingDetItem['employeeID.accusativeName'] || actingDetItem['employeeID.fullFIO'] || '', { lastNameInUpperCase: false, notUseMiddleNameInOrder : result.notUseMiddleNameInOrder })
                : actingDetItem['employeeID.accusativeName'] || actingDetItem['employeeID.fullFIO'] || ''
              if (employeePosition[actingDetItem.employeePositionID]) {
                let posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[actingDetItem.employeePositionID][0], 'acc', true, result.notUseMiddleNameInOrder, '')
                posName = posInfo.posName ? ' - ' + posInfo.posName + orgGen : ''
              }
              const aTabNum = showTabNum && actingDetItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, actingDetItem['employeeNumberID.tabNum']) : ''

              const dateFrom = actingDetItem.dateFrom || mainDateFrom
              const dateFromStr = dateFrom ? UB.i18n('з&nbsp;') + AC.dateService.formatDate(dateFrom) : ''
              const dateTo = actingDetItem.dateTo || mainDateTo
              const dateToStr = dateTo && AC.dateService.formatDate(dateTo) !== '31.12.9999'
                ? UB.i18n(' по&nbsp;') + AC.dateService.formatDate(dateTo) : ''
              const payForExtraLoad = actingDetItem.payForExtraLoad || (actingDetItem['payElID.calcAlgorithm'] && actingDetItem['payElID.calcAlgorithm'] === '1')
              let lastChar = (j === actingDetItems.length - 1) && !payForExtraLoad ? '.' : ';'
              let text = `${dateFromStr}${dateToStr}${dateFromStr || dateToStr ? UB.i18n('&nbsp;року') : ''}${actingDetItem.condition ? ' ' + actingDetItem.condition : ''} на ${boldFormatBegin}${empNameAcc}${aTabNum ? ' ' + boldFormatEnd + aTabNum : boldFormatEnd}${posName}${lastChar}`
              text = text.replace('</b> ', ' </b>')
              resItem.emps.push({
                text: text
              })
              if (payForExtraLoad) {
                lastChar = (j === actingDetItems.length - 1) ? '.' : ';'
                resItem.emps.push({ text: `${UB.i18n('встановити')} ${HR.reportUtils.formatShortNameInOrder(actingDetItem['employeeID.datName'] || actingDetItem['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })} ` +
                    UB.i18n(`виплату за додаткове навантаження у зв’язку з виконанням обов’язків тимчасово відсутнього {0} `, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника')) +
                      me.getExtraLoadInfo(actingDetItem.payForExtraLoad, actingDetItem['payElID.calcAlgorithm'], actingDetItem['positionID.positionType'] === '1', positionType, lastChar)
                })
              }
            }
            result.items.push(resItem)
          }
          if (actingOrdDetItem.reason) {
            result.items.push({
              toOrder: toOrder,
              text: UB.i18n(`Підстава: {0}.`, actingOrdDetItem.reason),
              indent: 1
            })
          }
        }
      }
    }

    result.items = result.items.filter(el => el.toOrder)
    if (taskDet) {
      result.tasks = taskDet.tasks.map(e => ({
        task: `${itemIdx === 0 && taskDet.tasks.length === 1 ? '' : ++itemIdx + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      }))
    }

    return result
  },

  getExtraLoadInfo: function (payForExtraLoad, calcAlgorithm, positionTypeAct, positionType, end) {
    if (calcAlgorithm === '3') {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу {1}, який заміщує{2}`, payForExtraLoad, positionTypeAct ? UB.i18n('державного службовця') : UB.i18n('працівника'), end)
    } else if (calcAlgorithm === '1') {
      return UB.i18n(`у розмірі різниці заробітку відсутнього і заміщаючого працівників{0}`, end)
    } else {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу тимчасово відсутнього {1}{2}`, payForExtraLoad, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника'), end)
    }
  }

}
