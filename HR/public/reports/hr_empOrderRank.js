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
      items: [],
      titleOrder: UB.i18n(`Про присвоєння рангів державним службовцям`)
    }
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    result.orderType = orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З')
    const showTabNum = order.showTabNum

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '')
    result.orderNumber = order.orderNumber
    result.orderIndex = order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
    result.organizationName = order.orderOrganizationName
    // result.titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')
    result.city = await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID)
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const whereArray = [['empOrderType', '=', 'RANK']]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const rankDet = await UB.Repository('hr_empOrderRankDet')
      .attrs(['ID', 'dateFrom', 'rankAssignKindID.name', 'rankAssignKindID.name4Rep', 'dictRankID', 'dictRankID.printName', 'dictRankID.name',
        'dictRankID.infoText', 'reason', 'dictRankReasonID.name', 'employeePositionID.psCatCode',
        'payElID', 'paySum', 'payElID.name', 'payElID.printName'])
      .where('orderID', '=', ID)
      .selectAsObject()

    const flt = rankDet.filter(rankDetItem => rankDetItem['employeePositionID.psCatCode'] && rankDetItem.dictRankID)
    const dictRankPsCategory = flt && flt.length
      ? await UB.Repository('hr_dictRankPsCategory')
        .attrs(['ID', 'psCategory', 'dictRankID'])
        .where('psCategory', 'in', _.uniq(flt.map(rankDetItem => rankDetItem['employeePositionID.psCatCode'])))
        .where('dictRankID', 'in', _.uniq(flt.map(rankDetItem => rankDetItem.dictRankID)))
        .selectAsObject()
      : []

    let index = 0
    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      if (item.empOrderType === 'RANK') {
        const rankDetItem = _.find(rankDet, { ID: item.ID })
        const toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (rankDetItem) {
          const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
          const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, result.notUseMiddleNameInOrder)
          const datName = datPosInfo.empName
          const posName = datPosInfo.posName ? ', ' + HR.reportUtils.makePositionName(datPosInfo.posName, item['employeePositionID.positionID.isOrgBoss']) + orgGen + ',' : ''
          const rankAssignKindName = rankDetItem['rankAssignKindID.name4Rep'] || ''
          const rankName = (rankDetItem['dictRankID.infoText'] || rankDetItem['dictRankID.printName'] || rankDetItem['dictRankID.name'] || '').replace(/ /g, '&nbsp;')
          const itemIdxText = rankDet.length === 1 && taskDet.tasks.length === 0 ? '' : `${++index}. `
          const outRank = rankDetItem['employeePositionID.psCatCode'] && rankDetItem.dictRankID && _.find(dictRankPsCategory, { psCategory: rankDetItem['employeePositionID.psCatCode'], dictRankID: rankDetItem.dictRankID })
            ? '' : UB.i18n(' поза межами відповідної категорії посад')

          let orderWord = UB.i18n('Присвоїти')
          orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
          result.items.push({
            toOrder: toOrder,
            text: `${itemIdxText}${orderWord} ${boldFormatBegin}${datName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName}&nbsp;${rankAssignKindName} ${rankName}` +
              ` ${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(rankDetItem.dateFrom)}${outRank}${rankDetItem['dictRankReasonID.name'] ? ' ' + rankDetItem['dictRankReasonID.name'] : ''}` +
              `${rankDetItem.reason ? ' ' + rankDetItem.reason : ''}.`
          })
          if (rankDetItem.payElID && rankDetItem.paySum) {
            const accrualStr = UB.i18n(` у розмірі {0}&nbsp;гривень`, HR.reportUtils.formatAsCurrency(rankDetItem.paySum))
            result.items.push({
              toOrder: toOrder,
              text: UB.i18n(`Встановити {0} {1}{2} з&nbsp;{3}.`, HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }), HR.nameCase.uncap(rankDetItem['payElID.printName'] || rankDetItem['payElID.name'] || ''), accrualStr, AC.dateService.formatDate(rankDetItem.dateFrom))
            })
          }

          if (rankDet.length === 1) {
            result.titleOrder = (HR.nameCase.uncap(rankDetItem['rankAssignKindID.name']) === UB.i18n('достроково') ? UB.i18n('Про дострокове присвоєння рангу державного службовця<br />') : UB.i18n('Про присвоєння чергового рангу державного службовця<br />')) +
                HR.reportUtils.formatShortNameInOrder(datPosInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
          }
        }
      }
    }

    result.items = result.items.filter(el => el.toOrder)
    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 0 & taskDet.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
