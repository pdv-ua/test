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
      data: [],
      dataAddon: [],
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
      organizationNameGen: order['organizationID.nameGen'] || order['organizationID.name'] || '',
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;')
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Встановити')
    orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'DOWNTIME', 'TEMPSUSPEND']]] : [['empOrderType', 'in', ['DOWNTIME', 'TEMPSUSPEND']]]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const downtimeDet = await UB.Repository('hr_empOrderDowntimeDet')
      .attrs(['ID', 'departmentID', 'dateFrom', 'dateTo', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .exists(UB.Repository('hr_empOrderDowntimeListDet')
        .correlation('paraID', 'ID')
        .where('departmentID', 'isNotNull')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID))
      .selectAsObject()
    const tempsuspendDet = await UB.Repository('hr_empOrderTempsuspendDet')
      .attrs(['ID', 'textOrder', 'dateFrom', 'dateTo', 'reason'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()
    let downtimeListDet = await UB.Repository('hr_empOrderDowntimeListDet')
      .attrs(['ID', 'paraID', 'employeeID.fullFIO', 'departmentID'])
      .where('departmentID', 'isNotNull')
      .where('orderID', '=', ID)
      .selectAsObject()
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    let titleName = (downtimeDet.length + tempsuspendDet.length) > 1 ? UB.i18n('працівників') : ''

    if (downtimeDet.length && !tempsuspendDet.length) {
      order.titleOrder = order.titleOrder || UB.i18n('Про встановлення простою')
    } else if (!downtimeDet.length && tempsuspendDet.length) {
      order.titleOrder = order.titleOrder || UB.i18n('Про тимчасове призупинення роботи')
    } else if (downtimeDet.length && tempsuspendDet.length) {
      order.titleOrder = order.titleOrder || UB.i18n('Про встановлення простою  та про тимчасове призупинення роботи')
    } else {
      order.titleOrder = order.titleOrder || ''
    }

    let index = 1 // нумерация пунктов приказа
    let downtimeInOtrder = false // переменная которая хранит признак что уже вывели пункт о простоях, простои всегда одним пунктом выодим

    const cntPunkt = (taskDet.tasks ? taskDet.tasks.length : 0) + (downtimeDet ? downtimeDet.length : 0) +
      (tempsuspendDet ? tempsuspendDet.length : 0)

    const ids = order.sortItems === 'STAFF' ? _.compact(_.uniq(orderDet.map(item => item['employeePositionID.departmentID']))) : []
    const departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)
    // const depIds = downtimeListDet && downtimeListDet.length ? _.compact(_.uniq(downtimeListDet.map(el => el['departmentID']))) : []
    // const depNamesForPerson = await HR.reportUtils.getDepartmentsName(depIds, ['name'], order.orderDate || order.entryDate, order.organizationID, ['treePath'])

    orderDet.forEach(orderItem => {
      let item = downtimeListDet.find(o => o.ID === orderItem.ID)
      if (!item) {
        item = tempsuspendDet.find(o => o.ID === orderItem.ID)
      }

      if (item) {
        _.merge(item, orderItem || [])
        if ((downtimeListDet.length + tempsuspendDet.length) === 1) {
          titleName = HR.reportUtils.formatShortNameInOrder(item['employeeID.genName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
        }

        item.toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (order.sortItems === 'STAFF' && orderItem['employeePositionID.departmentID'] && departments[orderItem['employeePositionID.departmentID']]) {
          item['structID'] = departments[orderItem['employeePositionID.departmentID']].treePath
          item['structName'] = departments[orderItem['employeePositionID.departmentID']].name
        } else {
          item['structID'] = (order.subOrganization ? order['masterOrganizationID.treePath'] : order['organizationID.treePath'])
          item['structName'] = ''
        }

        if (item.empOrderType === 'DOWNTIME') {
          const posInfoDat = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, result.notUseMiddleNameInOrder)
          const id = item['departmentID'] || order.organizationID
          item.depID = id === order.organizationID ? order.organizationID : id
          item.depName = id === order.organizationID ? order['organizationID.name'] : HR.nameCase.cap(item['employeePositionID.departmentID.name'] || '')
          item.depIdxNum = id === order.organizationID ? '' : item['employeePositionID.departmentID.treePath'] || ''
          item.posName = posInfoDat && posInfoDat.posName ? posInfoDat.posName + orgGen : ''
        }
      }
    })

    function addDowntime () {
      if (!downtimeInOtrder && downtimeListDet && downtimeListDet.length) {
        downtimeListDet = _.sortBy(downtimeListDet, ['depIdxNum'])
        downtimeListDet = _.groupBy(downtimeListDet, 'depID')

        const itemIdxText = cntPunkt === 1 ? '' : `${index++}. `
        const itemObj = {
          text: `${itemIdxText} ${orderWord} простій у структурних підрозділах ${result.organizationNameGen} у вказаний період або до окремих розпоряджень згідно з додатком:`,
          department: []
        }
        result.data.push({
          stName: '',
          deps: [{
            depName: '',
            items: [itemObj]
          }]
        })

        let indx = 1
        let npp = 1 // нумерация сотрудников
        _.forEach(downtimeListDet, (deps) => {
          // найдем пункты приказов по указанному подразделению
          const paraIDs = _.groupBy(deps, 'paraID')
          _.forEach(paraIDs, downtimeItems => {
            const downtimeItem = downtimeDet.find(o => o.ID === downtimeItems[0].paraID)
            if (downtimeItem) {
              const depObj = {
                name: `${itemIdxText}${indx}. ${deps[0].depName} ` +
                  `з&nbsp;${AC.dateService.formatDate(downtimeItem.dateFrom)}${downtimeItem.dateTo ? ` до&nbsp;${AC.dateService.formatDate(downtimeItem.dateTo)}` : ''}` +
                  `${downtimeItem.reason ? ', ' + downtimeItem.reason : ''}${indx < _.size(downtimeListDet) - 1 ? ';' : '.'}`
              }
              const objAdd = {
                text: `${indx}. Встановити простій у структурному підрозділі ${deps[0].depName} з&nbsp;${AC.dateService.formatDate(downtimeItem.dateFrom)}${downtimeItem.dateTo ? ` до&nbsp;${AC.dateService.formatDate(downtimeItem.dateTo)}` : ''}`,
                items: []
              }
              if (order.sortItems === 'ORDER') {
                downtimeItems = _.sortBy(downtimeItems, 'itemIdx')
              }
              if (order.sortItems === 'STAFF') {
                downtimeItems = downtimeItems.sort(HR.reportUtils.funcOrderTreePathSort)
              }
              if (order.sortItems === 'ALPHABET') {
                downtimeItems = downtimeItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
              }

              downtimeItems.forEach(elem => {
                if (!_.find(objAdd.items, { name: elem['employeeID.fullFIO'] || '', posName: elem.posName })) {
                  const tabNum = showTabNum && elem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, elem['employeeNumberID.tabNum']) : ''
                  objAdd.items.push({
                    toOrder: elem.toOrder,
                    npp: `${npp++}.`,
                    name: (elem['employeeID.fullFIO'] || '') + (tabNum ? ' ' + tabNum : ''),
                    posName: elem.posName ? elem.posName + orgGen : ''
                  })
                }
              })
              indx++
              objAdd.items = objAdd.items.filter(el => el.toOrder)
              if (objAdd.items.length) {
                itemObj.department.push(depObj)
                result.dataAddon.push(objAdd)
              }
            }
          })
        })
      }
      downtimeInOtrder = true
    }

    if (order.sortItems !== 'ORDER') {
      addDowntime()
    }

    let stDepts = order.sortItems === 'ORDER' ? orderDet : tempsuspendDet
    stDepts = order.sortItems === 'STAFF' ? _.sortBy(stDepts, ['structID']) : stDepts
    stDepts = order.sortItems === 'ORDER' ? _.groupBy(stDepts, 'ID') : _.groupBy(stDepts, 'structID')
    _.forEach(stDepts, stItems => {
      stItems = order.sortItems === 'STAFF' ? _.sortBy(stItems, ['structID']) : stItems
      const objSt = {
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
          if (el.empOrderType === 'DOWNTIME') {
            addDowntime()
          } else {
            const itemIdxText = cntPunkt === 1 ? '' : `${index++}. `
            if (el.empOrderType === 'TASK') {
              const orderItem = taskDet.tasks.find(o => o.ID === el.ID)
              if (orderItem) {
                const text = `${itemIdxText} ${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
                objDep.items.push({
                  text: text,
                  department: []
                })
              }
            }

            if (el.empOrderType === 'TEMPSUSPEND') {
              const orderItem = order.sortItems === 'ORDER' ? tempsuspendDet.find(o => o.ID === el.ID) : el
              if (orderItem.toOrder) {
                const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(orderItem, 'dat', true, result.notUseMiddleNameInOrder)
                const datName = datPosInfo.empName
                const posName = datPosInfo.posName ? ', ' +datPosInfo.posName + orgGen : ''
                const dateFrom = AC.dateService.formatDate(orderItem.dateFrom)
                const dateTo = orderItem.dateTo ? (AC.dateService.formatDate(orderItem.dateTo) === '31.12.9999' ? '' : ' по&nbsp;' + AC.dateService.formatDate(orderItem.dateTo)) : ''
                const tabNum = showTabNum && orderItem['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, orderItem['employeeNumberID.tabNum']) : ''
                objDep.items.push({
                  text: `${itemIdxText}${orderItem.textOrder} з&nbsp;${dateFrom}${dateTo} ${boldFormatBegin}${datName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName}${orderItem.reason ? ' ' + orderItem.reason : ''}.`,
                  department: []
                })
              }
            }
          }
        })

        if (objDep.items.length) {
          objSt.deps.push(objDep)
        }
      })
      if (objSt.deps.length) {
        result.data.push(objSt)
      }
    })

    result.line = result.dataAddon && result.dataAddon.length ? '_'.repeat(30) : null
    result.organizationNameGen = order.subOrganization
      ? order['masterOrganizationID.nameGen'] || order['masterOrganizationID.name'] || ''
      : order['organizationID.nameGen'] || order['organizationID.name'] || ''

    result.titleOrder = `${order.titleOrder || ''}${order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    result.tasks = order.sortItems === 'ORDER' ? [] : taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
