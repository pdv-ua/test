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
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: printDocumentView,
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
      data: []
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    let orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], [['empOrderType', '=', 'RISKPAY']])
    const riskpayDet = await UB.Repository('hr_empOrderRiskpayDet')
      .attrs(['ID', 'periodID.name', 'departmentID', 'payElID.name', 'payElID.printName', 'payRate', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    let orderDetSecond = await UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID', 'newValue', 'employeeID.fullFIO', 'employeePositionID.departmentID', 'entityParaID'])
      .where('orderID', '=', ID)
      .selectAsObject()
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let depIds = _.compact(_.uniq(riskpayDet.map(el => el.departmentID)))
    const depNames = await HR.reportUtils.getDepartmentsName(depIds, ['nameGen', 'name'], order.orderDate || order.entryDate, order.organizationID)

    depIds = _.compact(_.uniq(orderDetSecond.map(el => el['employeePositionID.departmentID'])))
    const depNamesForPerson = await HR.reportUtils.getDepartmentsName(depIds, ['name'], order.orderDate || order.entryDate, order.organizationID, ['idxNum'])

    const useSexType = await AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID)

    orderDetSecond.forEach(item => {
      const itm = orderDet.find(o => o.ID === item.ID)
      _.merge(item, itm || [])
      item.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID || orderExtract.departmentID === item['employeePositionID.departmentID'] : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      const id = item['employeePositionID.positionID.parentUnitID']
      item.depName = id === order.organizationID ? order['organizationID.name'] : (depNamesForPerson[id] ? HR.nameCase.cap(depNamesForPerson[id].name) : '')
      item.depIdxNum = id === order.organizationID ? '' : (depNamesForPerson[id] ? depNamesForPerson[id].idxNum || '' : '')
      item.posName = useSexType && (item['employeeID.sexType'] === 'W') ? HR.reportUtils.makePositionName(item['employeePositionID.positionID.nameDatF'] || item['employeePositionID.positionID.name'] || '', item['employeePositionID.positionID.isOrgBoss']) : HR.reportUtils.makePositionName(item['employeePositionID.positionID.nameDat'] || item['employeePositionID.positionID.name'] || '', item['employeePositionID.positionID.isOrgBoss'])
    })
    orderDetSecond = _.sortBy(orderDetSecond, ['depIdxNum', 'posName'])

    let index = 1 // нумерация пунктов приказа
    let npp = 1 // нумерация сотрудников
    for (let i = 0; i < riskpayDet.length; i++) {
      const riskpayDetRow = riskpayDet[i]
      const depName = depNames[riskpayDetRow.departmentID] ? HR.nameCase.uncap(depNames[riskpayDetRow.departmentID].name) + ', ' : ''
      let det = orderDetSecond && orderDetSecond.length ? orderDetSecond.filter(elem => riskpayDetRow.ID === elem.entityParaID) : []
      if (det && det.length) {
        const itemIdxText = riskpayDet.length === 1 && taskDet.tasks.length === 0 ? '' : `${index++}. `
        det = _.groupBy(det, 'employeePositionID.positionID.parentUnitID')
        const obj = {
          text: UB.i18n(`{0}Виплатити працівникам {1}{2} {3}`, itemIdxText, depName, riskpayDetRow.reason ? riskpayDetRow.reason + ',' : '', HR.nameCase.uncap(riskpayDetRow['payElID.printName'] || riskpayDetRow['payElID.name'] || '')) +
            UB.i18n(` у розмірі <b>{0}</b>&nbsp;{1} за шкідливість `, riskpayDetRow.payRate || '', AC.dateService.plural(UB.i18n('відсотка_відсотки_відсотків'), riskpayDetRow.payRate)) +
            UB.i18n(`{0}:`, riskpayDetRow['periodID.name'] ? ' за <b>' + HR.nameCase.uncap(riskpayDetRow['periodID.name']).replace(/ /g, '&nbsp;') + (riskpayDetRow['periodID.name'].indexOf('року') !== -1 ? '' : UB.i18n('&nbsp;року')) + '</b>' : ''),
          department: []
        }
        _.forEach(det, detItem => {
          const items = detItem.map((elem) => {
            return {
              toOrder: elem.toOrder,
              npp: `${npp++}.`,
              name: (result.notUseMiddleNameInOrder
                ? HR.reportUtils.formatFullNameInOrder(elem['employeeID.fullFIO'] || '', { lastNameInUpperCase: false, notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
                : elem['employeeID.fullFIO'] || '') +
                (showTabNum && elem['employeeNumberID.tabNum'] ? ' ' + UB.i18n(`(Таб. №&nbsp;{0})`, elem['employeeNumberID.tabNum']) : ''),
              posName: elem.posName ? elem.posName + orgGen : '',
              quantity: elem.newValue,
              roundToQuantity: 'decimal2' // HR.reportUtils.getQuantityFractional(elem.newValue || 0)
            }
          }).filter(el => el.toOrder)
          if (items.length) {
            obj.department.push({
              name: detItem[0].depName,
              items: items
            })
          }
        })

        if (obj.department.length) {
          result.data.push(obj)
        }
      }
    }

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
