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
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return {
        emblem: HR.reportUtils.getEmblem()
      }
    }

    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const showTabNum = order.showTabNum

    const result = {
      emblem: HR.reportUtils.getEmblem(),
      data: [],
      titleOrder: '',
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: printDocumentView,
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
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;')
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Відкликати')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'RECALL', 'EXITDOWNTIME']]] : [['empOrderType', 'in', ['RECALL', 'EXITDOWNTIME']]]
    const empOrder = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    let recallDet = await UB.Repository('hr_empOrderRecallDet')
      .attrs(['ID', 'employeeNumberID', 'grantOrderParaID.orderID', 'grantOrderParaID.empOrderType', 'reason'])
      .where('orderID', '=', ID)
      .selectAsObject()
    const recallListDet = await UB.Repository('hr_empOrderRecallListDet')
      .attrs(['entityParaID', 'dayCount', 'dateFrom', 'dateTo'])
      .where('orderID', '=', ID)
      .selectAsObject()
    const exitDowntimeDet = await UB.Repository('hr_empOrderExitdowntimeDet')
      .attrs(['ID', 'dateFrom', 'grantOrderID', 'reason', 'orderWord'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .exists(UB.Repository('hr_empOrderExitdowntimeListDet')
        .correlation('paraID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID))
      .selectAsObject()
    let exitDowntimeListDet = await UB.Repository('hr_empOrderExitdowntimeListDet')
      .attrs(['ID', 'paraID', 'employeeID.fullFIO', 'employeeNumberID'])
      .where('orderID', '=', ID)
      .selectAsObject()
    if (!order.sortItems && exitDowntimeListDet && exitDowntimeListDet.length) {
      order.sortItems = 'STAFF'
    }
    let ids = order.sortItems === 'STAFF' ? _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID']))) : []
    const departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
    _.forEach(empOrder, item => {
      let orderItem = recallDet.find(o => o.ID === item.ID)
      if (!orderItem) {
        orderItem = exitDowntimeListDet.find(o => o.ID === item.ID)
      }
      if (orderItem) {
        _.merge(orderItem, item)
        orderItem.toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (order.sortItems === 'STAFF' && item['employeePositionID.departmentID'] && departments[item['employeePositionID.departmentID']]) {
          orderItem['structID'] = departments[item['employeePositionID.departmentID']].treePath
          orderItem['structName'] = departments[item['employeePositionID.departmentID']].name
        } else {
          orderItem['structID'] = (order.subOrganization ? order['masterOrganizationID.treePath'] : order['organizationID.treePath'])
          orderItem['structName'] = ''
        }
      }
    })

    // заменим тип пиказа
    ids = _.compact(_.uniq(exitDowntimeDet.map(el => el.grantOrderID)))
    if (ids.length) {
      const data = await UB.Repository('hr_empOrderDet')
        .attrs(['orderID', 'empOrderType', 'employeeNumberID'])
        .where('employeeNumberID', 'isNotNull')
        .where('orderID', 'in', ids)
        .selectAsObject()
      data.forEach(el => {
        const orderItems = exitDowntimeDet.filter(o => o['grantOrderID'] === el.orderID) //  если разными пунктами создавать отмену одного и того же приказа
        orderItems.forEach(orderItem => {
          const item = exitDowntimeListDet.find(o => o.employeeNumberID === el.employeeNumberID && o['paraID'] === orderItem.ID)
          if (item) {
            item.empOrderType = el.empOrderType
          }
        })
      })
    }

    let titleName
    if (recallDet.length === 1 && exitDowntimeDet.length === 0) {
      let typeOrder = ''
      switch (recallDet[0]['grantOrderParaID.empOrderType']) {
        case 'MISSION':
          typeOrder = UB.i18n('відрядження')
          break
        case 'MISSION_TRAINING':
          typeOrder = UB.i18n('відрядження з метою навчання')
          break
        case 'DOWNTIME':
          typeOrder = UB.i18n('простою')
          break
        case 'TRAINING':
          typeOrder = UB.i18n('направлення на навчання')
          break
      }

      order.titleOrder = order.titleOrder || UB.i18n('Про відкликання {0}', typeOrder ? UB.i18n('з ') + typeOrder : '')
      titleName = HR.reportUtils.formatShortNameInOrder(recallDet[0]['employeeID.genName'] || recallDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
    } else if (recallDet.length === 0 && exitDowntimeListDet.length === 1) {
      let typeOrder = ''
      switch (exitDowntimeListDet[0]['empOrderType']) {
        case 'DOWNTIME':
          typeOrder = UB.i18n('простою')
          break
        case 'TEMPSUSPEND':
          typeOrder = UB.i18n('тимчасового призупинення роботи')
          break
      }

      order.titleOrder = order.titleOrder || UB.i18n('Про вихід {0}', typeOrder ? UB.i18n('з ') + typeOrder : '')
      titleName = HR.reportUtils.formatShortNameInOrder(exitDowntimeListDet[0]['employeeID.genName'] || exitDowntimeListDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
    } else if (recallDet.length === 0 && exitDowntimeDet.length === 0) {
      titleName = ''
    } else {
      if (recallDet.length && !exitDowntimeDet.length) {
        order.titleOrder = order.titleOrder || UB.i18n('Про відкликання')
      } else if (!recallDet.length && exitDowntimeDet.length) {
        order.titleOrder = order.titleOrder || UB.i18n('Про вихід')
      } else if (recallDet.length && exitDowntimeDet.length) {
        order.titleOrder = order.titleOrder || UB.i18n('Про відкликання та про вихід')
      } else {
        order.titleOrder = order.titleOrder || ''
      }
      titleName = UB.i18n('працівників')
    }
    result.titleOrder = `${order.titleOrder || ''}${order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')
    const cntPunkt = (taskDet ? taskDet.length : 0) + (recallDet ? recallDet.length : 0)

    let index = 1
    await me.makeTextRecallDet(recallDet, recallListDet, orgGen, showTabNum, orderWord, boldFormatBegin, boldFormatEnd, result.notUseMiddleNameInOrder)
    if (order.sortItems === 'STAFF') {
      recallDet = _.sortBy(recallDet, 'structID')
    }

    const stDepts = order.sortItems === 'STAFF'
      ? _.groupBy(recallDet, item => item.structID)
      : order.sortItems === 'ORDER'
        ? _.groupBy(empOrder.filter(item => exitDowntimeDet.find(o => o.ID === item.ID) || recallDet.find(o => o.ID === item.ID) || taskDet.tasks.find(o => o.ID === item.ID)), 'ID')
        : _.groupBy(recallDet, 'null')
    _.forEach(stDepts, stItems => {
      if (stItems[0].empOrderType === 'EXITDOWNTIME') {
        const orderItem = exitDowntimeDet.find(o => o.ID === stItems[0].ID)
        if (orderItem) {
          const items = me.makeTextTempsuspendDet([orderItem], exitDowntimeListDet, result.organizationNameGen, orgGen, order.sortItems, showTabNum, result.smallOrderWord, result.notUseMiddleNameInOrder)
          _.forEach(items, item => {
            const itemIdxText = cntPunkt === 1 || !item.orderText ? '' : `${index++}. `
            item.orderText = itemIdxText + item.orderText
            result.data.push(item)
          })
        }
      } else if (stItems[0].empOrderType === 'TASK') {
        const itemIdxText = cntPunkt === 1 ? '' : `${index++}. `
        const orderItem = taskDet.tasks.find(o => o.ID === stItems[0].ID)
        if (orderItem) {
          const text = `${itemIdxText} ${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
          result.data.push({
            orderText: text,
            stName: '',
            deps: []
          })
        }
      } else {
        stItems = order.sortItems === 'STAFF' ? _.sortBy(stItems, ['structID']) : stItems
        const objSt = {
          text: '',
          stName: order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
          deps: []
        }
        const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
        _.forEach(depts, depItems => {
          const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')

          if (order.sortItems === 'STAFF') {
            depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
          }
          if (order.sortItems === 'ALPHABET') {
            depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
          }
          const objDep = {
            depName: order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
            items: []
          }

          depItems.forEach(el => {
            const itemIdxText = cntPunkt === 1 ? '' : `${index++}. `
            const orderItem = order.sortItems === 'ORDER' ? recallDet.find(o => o.ID === el.ID) : el
            if (orderItem.toOrder) {
              objDep.items.push({
                text: `${itemIdxText}${orderItem.textToOrder}`,
                department: []
              })
            }
          })

          if (objDep.items.length) {
            objSt.deps.push(objDep)
          }
        })
        if (objSt.deps.length) {
          result.data.push(objSt)
        }
      }
    })
    if (order.sortItems !== 'ORDER') {
      const items = me.makeTextTempsuspendDet(exitDowntimeDet, exitDowntimeListDet, result.organizationNameGen, orgGen, order.sortItems, showTabNum, result.smallOrderWord, result.notUseMiddleNameInOrder)
      _.forEach(items, item => {
        const itemIdxText = cntPunkt === 1 || !item.orderText ? '' : `${index++}. `
        item.orderText = itemIdxText + item.orderText
        result.data.push(item)
      })
    }

    result.tasks = order.sortItems === 'ORDER' ? [] : taskDet.tasks.map(e => ({
      task: `${cntPunkt === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  },
  makeTextRecallDet: async function (recallDet, recallListDet, orgGen, showTabNum, orderWord, boldFormatBegin, boldFormatEnd, notUseMiddleNameInOrder) {
    const orderInfo = {}
    for (let i = 0; i < recallDet.length; i++) {
      let e = recallDet[i]
      if (e.toOrder) {
        const posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(e, 'acc', true, notUseMiddleNameInOrder)
        const periodsList = recallListDet.filter(det => det.entityParaID === e.ID)
        let timeCostName = ''
        if (e['grantOrderParaID.orderID']) {
          let orderID = e['grantOrderParaID.orderID']
          if (orderInfo[orderID]) {
            timeCostName = orderInfo[orderID]['name']
          } else {
            if (e['grantOrderParaID.empOrderType'] === 'DOWNTIME') { // Приказ на простой создаёт постоянное начисление, которое создаёт запись в табель
              orderID = await UB.Repository('hr_employeeAccrual')
                .attrs(['ID'])
                .where('orderID', '=', orderID)
                .where('employeeNumberID', '=', e.employeeNumberID)
                .selectScalar()
            }
            if (orderID) {
              const ts = await UB.Repository('tim_timeSheet')
                .attrs(['factTimeCostID.name'])
                .where('orderID', '=', orderID)
                .where('employeeNumberID', '=', e.employeeNumberID)
                .where('isActive', '=', 1)
                .limit(1)
                .selectAsObject()
              if (ts && ts.length) {
                timeCostName = (ts[0]['factTimeCostID.name'] || '')
                timeCostName = timeCostName.split('(')[0]
              }
            }
            orderInfo[e['grantOrderParaID.orderID']] = { name: timeCostName }
          }
        }

        const tabNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
        e.textToOrder = orderWord + ' ' + boldFormatBegin + (posInfoAcc.empName || '') +
          (tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd) +
          `${posInfoAcc && posInfoAcc.posName ? ', ' + posInfoAcc.posName + orgGen : ''}${timeCostName ? ' ' + UB.i18n('з') + ' ' + timeCostName : ''}` +
          `${periodsList.length ? ' ' : ''}${periodsList.map(p => {
            return UB.i18n(`з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(p.dateFrom), AC.dateService.formatDate(p.dateTo))
          }).join(', ')}` +
          `${e.reason ? ' ' + e.reason : ''}.`
      }
    }
  },
  makeTextTempsuspendDet: function (exitDowntimeDet, exitDowntimeListDet, organizationNameGen, orgGen, sortItems, showTabNum, smallOrderWord, notUseMiddleNameInOrder) {
    const res = []
    _.forEach(exitDowntimeDet, orderItem => {
      let detItems = _.groupBy(exitDowntimeListDet.filter(el => el.paraID === orderItem.ID), 'empOrderType')
      _.forEach(detItems, orderItems => {
        let text = orderItem.orderWord
          ? orderItem.orderWord + ' '
          : smallOrderWord
            ? (orderItems[0]['empOrderType'] === 'DOWNTIME' ? UB.i18n('Припинити простій ') : UB.i18n('Приступити до виконання обов`язків '))
            : (orderItems[0]['empOrderType'] === 'DOWNTIME' ? UB.i18n('ПРИПИНИТИ простій ') : UB.i18n('ПРИСТУПИТИ до виконання обов`язків '))

        text += UB.i18n('з&nbsp;{0}', AC.dateService.formatDate(orderItem.dateFrom)) + ' ' + UB.i18n('працівникам {0}', organizationNameGen) +
            `${orderItem.reason ? ' ' + orderItem.reason : ''}` + ':'

        if (sortItems === 'STAFF') {
          orderItems.sort(HR.reportUtils.funcOrderTreePathSort)
        }

        const stDepts = _.groupBy(orderItems, item => sortItems === 'STAFF' ? item['structID'] : 'null')

        _.forEach(stDepts, stItems => {
          if (sortItems === 'STAFF') {
            stItems = _.sortBy(stItems, ['employeePositionID.departmentID.idxNum'])
          }
          const objSt = {
            orderText: text,
            stName: sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
            deps: []
          }
          text = ''
          const depts = _.groupBy(stItems, item => sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
          _.forEach(depts, depItems => {
            const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')

            if (sortItems === 'STAFF') {
              depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
            }
            if (sortItems === 'ALPHABET') {
              depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
            }
            const objDep = {
              depName: sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
              persons: depItems.map((el, ind) => {
                const posInfoDat = HR.reportUtils.getInfoItemOrderInCase(el, 'dat', true, notUseMiddleNameInOrder)
                const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
                return {
                  toOrder: el.toOrder,
                  npp: (ind + 1),
                  posName: posInfoDat && posInfoDat.posName ? posInfoDat.posName + orgGen : '',
                  empName: (posInfoDat.empName || '') + (tabNum ? ' ' + tabNum : '')
                }
              }).filter(o => o.toOrder)
            }

            if (objDep.persons.length) {
              objSt.deps.push(objDep)
            }
          })
          if (objSt.deps.length) {
            res.push(objSt)
          }
        })
      })
    })

    return res
  }

}
