/* global UB AC HR _ */
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
      titleOrder: UB.i18n(`Про  встановлення<br />посадових окладів`),
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
      orgNameGen: order.subOrganization
        ? HR.reportUtils.fixOrganizationName((order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name']).toUpperCase())
        : HR.reportUtils.fixOrganizationName((order['organizationID.nameGen'] || order['organizationID.name']).toUpperCase()),
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      data: []
    }
    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(order.organizationID)
    result.roundTo = settingsOrg.roundTo

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'STAFFTABLEMOVE']]] : [['empOrderType', '=', 'STAFFTABLEMOVE']]
    if (orderExtract && orderExtract.ID && orderExtract.departmentID) {
      whereArray.push(['departmentID', '=', orderExtract.departmentID])
    }
    if (orderExtract && orderExtract.ID && orderExtract.employeePositionID) {
      whereArray.push(['employeePositionID', '=', orderExtract.employeePositionID])
    }
    const empOrder = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const orderST = await UB.Repository('hr_empOrderStafftablemoveDet')
      .attrs(['ID', 'staffTableID.entryDate'])
      .where('orderID', '=', ID)
      .selectAsObject()

    let orderDet = await UB.Repository('hr_empOrderSTMovePosDet')
      .attrs(['ID', 'paraID', 'accrualSum', 'prevAccrualSum', 'posFullNameNom', 'prevPosFullNameNom', 'posFullName', 'prevPosFullName', 'employeeID', 'positionID'])
      .where('orderID', '=', ID)
      .selectAsObject()
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let ids = _.compact(_.uniq(empOrder.map(el => el.positionID)))
    const posGen = await HR.reportUtils.getPositionName(ids, ['fullNameGen', 'nameGen', 'name'], order.orderDate || order.entryDate, order.organizationID, ['isOrgBoss'], 'ID')

    ids = orderDet.map(en => en.employeeID)
    let publServRang = await UB.Repository('hr_publServRang')
      .attrs(['ID', 'dictRankID.printNameGen', 'dictRankID.name', 'dateFrom', 'dateTo', 'employeeID'])
      .where('employeeID', 'in', ids)
      .orderBy('dateFrom')
      .selectAsObject()
    publServRang = publServRang && publServRang.length ? _.groupBy(publServRang, 'employeeID') : []
    let departments = []
    if (order.sortItems === 'STAFF') {
      const ids = _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID'])))
      departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
    }

    // для сортировки делаем сразу
    orderDet.forEach(el => {
      let item = orderST.find(o => o.ID === el.paraID)
      el.fromDate = item ? item['staffTableID.entryDate'] : undefined

      item = empOrder.find(o => o.ID === el.ID)
      el.found = !!item
      if (item) {
        _.merge(el, item || [])
      }
      if (publServRang[el.employeeID]) {
        const rank = publServRang[el.employeeID].find(o => o.employeeID === el.employeeID && o.dateFrom <= el.fromDate && o.dateTo >= el.fromDate)
        el.rankName = rank ? rank['dictRankID.printNameGen'] || rank['dictRankID.name'] || '' : ''
      } else {
        el.rankName = ''
      }
      if (order.sortItems === 'STAFF' && item['employeePositionID.departmentID'] && departments[item['employeePositionID.departmentID']]) {
        el['structID'] = departments[item['employeePositionID.departmentID']].treePath
        el['structName'] = departments[item['employeePositionID.departmentID']].name
      } else {
        el['structID'] = ''
        el['structName'] = ''
      }
    })

    let i = 1
    const cntPunkt = (taskDet.tasks ? taskDet.tasks.length : 0) + (orderDet ? orderDet.length : 0)

    if (empOrder && empOrder.length) {
      const arr = order.sortItems === 'ORDER'
        ? _.groupBy(empOrder.filter(item => orderDet.find(o => o.ID === item.ID) || taskDet.tasks.find(o => o.ID === item.ID)), 'paraID')
        : _.groupBy(orderDet.filter(item => item.found), 'fromDate')
      _.forEach(arr, items => {
        if (items[0].empOrderType === 'TASK') {
          const orderItem = taskDet.tasks.find(o => o.ID === items[0].ID)
          if (orderItem) {
            const text = `${cntPunkt === 1 ? '' : `${i++}. `}${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
            result.data.push({
              text: text,
              rows: []
            })
          }
        } else {
          const detItems = order.sortItems === 'ORDER'
            ? orderDet.filter(el => el.paraID === items[0].paraID)
            : items
          const dateFrom = detItems[0].fromDate ? AC.dateService.formatDate(detItems[0].fromDate) : ''

          let chngItems = me.getItems(i, detItems.filter(el => el.posFullNameNom !== el.prevPosFullNameNom || el.posFullName !== el.prevPosFullName), orgGen, result.roundTo, posGen, order.sortItems, showTabNum, result.normalFullName, 'acc', result.notUseMiddleNameInOrder)
          if (chngItems.length) {
            let orderWord = UB.i18n('Вважати такими')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            result.data.push({
              emptyRow: i > 1,
              text: UB.i18n(`{0}. {1}, що{2} продовжують працювати на посадах {3}, працівників:`, i, orderWord,
                dateFrom ? ' ' + UB.i18n('з') + '&nbsp;' + dateFrom + '&nbsp;' + UB.i18n('року') : '', result.organizationNameGen),
              rows: chngItems
            })
            i++
          }

          chngItems = me.getItems(i, detItems.filter(el => el.accrualSum !== el.prevAccrualSum), orgGen, result.roundTo, posGen, order.sortItems, showTabNum, result.normalFullName, 'dat', result.notUseMiddleNameInOrder)
          if (chngItems.length) {
            let orderWord = UB.i18n('Встановити')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            result.data.push({
              emptyRow: i > 1,
              text: UB.i18n(`{0}. {1} новий оклад{2} відповідно до змін у штатному розписі {3} таким працівникам:`, i, orderWord,
                dateFrom ? ' ' + UB.i18n('з') + '&nbsp;' + dateFrom + '&nbsp;' + UB.i18n('року') : '', result.organizationNameGen),
              rows: chngItems
            })
            i++
          }
        }
      })
    }

    result.tasks = order.sortItems === 'ORDER' ? [] : taskDet.tasks.map(e => ({
      task: `${i === 1 && taskDet.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  },
  getItems: function (index, array, orgGen, roundTo, posGen, sortItems, showTabNum, normalFullName, caseCode, notUseMiddleNameInOrder) {
    if (!array || array.length === 0) return []
    const result = []
    const boldFormatBegin = normalFullName ? '' : '<b>'
    const boldFormatEnd = normalFullName ? '' : '</b>'
    if (sortItems === 'STAFF') {
      array = _.sortBy(array, ['structID'])
    }
    const stDepts = _.groupBy(array, item => sortItems === 'STAFF' ? item.structID : 'null')
    _.forEach(stDepts, stItems => {
      stItems = sortItems === 'STAFF' ? _.sortBy(stItems, ['employeePositionID.departmentID.treePath']) : stItems
      const objSt = {
        stName: sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
        deps: []
      }
      const depts = _.groupBy(stItems, item => sortItems === 'STAFF' ? item['employeePositionID.departmentID.name'] : 'null')
      _.forEach(depts, depItems => {
        const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
        if (sortItems === 'STAFF') {
          depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
        }
        if (!sortItems || sortItems === 'ALPHABET') {
          depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
        }
        const objDep = {
          depName: sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
          items: depItems.map((item, npp) => {
            const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
            const posInfoInCase = HR.reportUtils.getInfoItemOrderInCase(item, caseCode, true, notUseMiddleNameInOrder)
            const posName = posGen[item.positionID] ? HR.reportUtils.makePositionName(posGen[item.positionID].name, posGen[item.positionID].isOrgBoss) : ''
            const accrualSum = AC.currencyService.round(item.accrualSum || item.prevAccrualSum || 0, roundTo === 'numberGroup' ? 0 : 2)
            const rankName = item['employeePositionID.positionID.positionType'] === '1' ? (item.rankName || '').replace(/ /g, '&nbsp;') : ''
            const positionType = item['employeePositionID.positionID.positionType'] === '1'
              ? caseCode === 'acc' ? UB.i18n('державного службовця') : UB.i18n('державному службовцю')
              : caseCode === 'acc' ? UB.i18n('працівника') : UB.i18n('працівнику')
            return {
              persons: `${index}.${npp + 1}. ${boldFormatBegin}${posInfoInCase.empName}${tabNum ? ' ' + boldFormatEnd + tabNum + ' ' : ' ' + boldFormatEnd}- ${positionType}${rankName ? ' ' + rankName : ''}${posName ? UB.i18n(' на посаді ') + posName : ''}${accrualSum ? UB.i18n(' з посадовим окладом ') + HR.reportUtils.formatAsCurrency(accrualSum) + UB.i18n('&nbsp;гривень на місяць') : ''}${npp < array.length - 1 ? ';' : '.'}`
            }
          })
        }

        if (objDep.items.length) {
          objSt.deps.push(objDep)
        }
      })

      if (objSt.deps.length) {
        result.push(objSt)
      }
    })
    return result
  }
}
