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

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)

    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'MEDEXAMINATION']]] : [['empOrderType', '=', 'MEDEXAMINATION']]
    const empOrder = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const orderDet = await UB.Repository('hr_empOrderMedexaminationDet')
      .attrs(['ID', 'payElID', 'dictVacationKindID', 'empMedExText'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .exists(UB.Repository('hr_empOrderMedexaminationListDet')
        .correlation('paraID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('orderID', '=', ID))
      .selectAsObject()
    let orderListDet = await UB.Repository('hr_empOrderMedexaminationListDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID.workScheduleID'])
      .where('orderID', '=', ID)
      .selectAsObject({
        'employeePositionID.workScheduleID': 'workScheduleID'
      })
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)
    const workScheduleData = []
    let wsObj
    for (let i = 0; i < orderListDet.length; i++) {
      if (orderListDet[i].workScheduleID) {
        wsObj = workScheduleData.find(el => el.workScheduleID === orderListDet[i].workScheduleID && el.dateFrom === orderListDet[i].dateFrom && el.dateTo === orderListDet[i].dateTo)
        if (wsObj) {
          orderListDet[i].hours = wsObj.hours
        } else {
          const planByOrgID = AC.settings.get('hrUsePlanByOrg', order.subOrganization ? order.masterOrganizationID : order.organizationID)
          let hours = await UB.Repository('tim_plan')
            .attrs(['workHours'])
            .where('workScheduleID', '=', orderListDet[i].workScheduleID)
            .where('organizationID', '=', planByOrgID || (order.subOrganization ? order.masterOrganizationID : order.organizationID))
            .where('dayDate', '>=', AC.dateService.shiftDate(orderListDet[i].dateFrom))
            .where('dayDate', '<=', AC.dateService.shiftDate(orderListDet[i].dateTo))
            .selectAsObject()

          orderListDet[i].hours = hours && hours.length ? hours.reduce((result, item) => (result + item.workHours), 0) : 0
          workScheduleData.push({
            workScheduleID: orderListDet[i].workScheduleID,
            dateFrom: orderListDet[i].dateFrom,
            dateTo: orderListDet[i].dateTo,
            hours: orderListDet[i].hours
          })
        }
      } else {
        orderListDet[i].hours = 0
      }
    }

    const ids = order.sortItems === 'STAFF' ? _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID']))) : []
    const departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate)

    if (orderListDet && orderListDet.length) {
      orderListDet.forEach(el => {
        const item = empOrder.find(o => o.ID === el.ID)
        _.merge(el, item || [])
        el.toOrder = orderExtract && orderExtract.ID
          ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID || orderExtract.departmentID === item['employeePositionID.departmentID'] : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (el['employeePositionID.departmentID'] && !el['employeePositionID.departmentID.idxNum'] && !el['employeePositionID.departmentID.name']) {
          el['employeePositionID.departmentID'] = null
        }
        if (order.sortItems === 'STAFF' && item['employeePositionID.departmentID'] && departments[item['employeePositionID.departmentID']]) {
          el['structID'] = departments[item['employeePositionID.departmentID']].treePath
          el['structName'] = departments[item['employeePositionID.departmentID']].name
        } else {
          el['structID'] = (order.subOrganization ? order['masterOrganizationID.treePath'] : order['organizationID.treePath'])
          el['structName'] = ''
        }
      })
    }

    let titleName
    order.titleOrder = order.titleOrder || UB.i18n('Про компенсацію за проходження медогляду')

    if (orderListDet.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(orderListDet[0]['employeeID.genName'] || orderListDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
    } else if (orderListDet.length !== 0) {
      titleName = UB.i18n('працівників ')// + result.organizationNameGen
    }
    result.titleOrder = `${order.titleOrder}${order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`

    const getEmployeeList = (arr, indexText) => {
      const res = []
      if (order.sortItems === 'STAFF') {
        arr = arr.sort(HR.reportUtils.funcOrderTreePathSort)
      }
      if (!order.sortItems || order.sortItems === 'ALPHABET') {
        arr = arr.sort(HR.reportUtils.funcOrderFioTabNumSort)
      }
      arr.forEach((el, ind) => {
        const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб.&nbsp;№&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(el, 'dat', true, result.notUseMiddleNameInOrder)
        const dates = AC.dateService.dateDiff(el.dateFrom, el.dateTo)
          ? UB.i18n(`з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(el.dateFrom), AC.dateService.formatDate(el.dateTo))
          : AC.dateService.formatDate(el.dateTo)
        // const hours = el.hours ? ` (${el.hours} год)` : ''
        const hours = ` (${el.hours || 0}&nbsp;${UB.i18n('год')})`
        res.push({
          toOrder: el.toOrder,
          name: `${indexText + (ind + 1) + '. '}${boldFormatBegin}${posInfo.empName}${boldFormatEnd}${tabNum ? ' ' + tabNum : ''}${posInfo.posName ? ' ' + posInfo.posName + orgGen : ''} - ${dates}${hours}${(ind + 1) < arr.length ? ';' : '.'}`
        })
      })
      return res
    }

    const cntPunkt = (taskDet ? taskDet.tasks.length : 0) + (orderDet ? orderDet.length : 0)
    let index = 1
    _.forEach(empOrder, (empOrderItem) => {
      if (empOrderItem.empOrderType === 'TASK') {
        const orderItem = taskDet.tasks.find(o => o.ID === empOrderItem.ID)
        if (orderItem) {
          const text = (cntPunkt === 1 ? '' : `${index++}. `) + `${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
          result.data.push({
            text: text,
            items: []
          })
        }
      } else {
        const orderItem = orderDet.find(o => o.ID === empOrderItem.ID)
        if (orderItem) {
          let orderWord = orderItem.payElID ? UB.i18n('Провести оплату') : UB.i18n('Компенсувати')
          orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
          const indexText = cntPunkt === 1 ? '' : `${index++}.`

          let orderItems = orderListDet.filter(o => o.paraID === orderItem.ID)
          orderItems = order.sortItems === 'STAFF' ? _.sortBy(orderItems, ['structID']) : orderItems
          let text = `${indexText ? indexText + ' ' : ''}${orderWord}`
          if (orderItem.payElID) {
            text += orderItem.empMedExText ? ' ' + orderItem.empMedExText : ''
            text += ' ' + UB.i18n('з розрахунку середнього заробітку за вказані дні працівникам:')
          } else {
            text += ' ' + UB.i18n('протягом року після проходження медогляду  днями відпочинку за додатковою заявою  за вказані дні проходження медогляду працівникам:')
          }

          const objItem = {
            text: text,
            items: []
          }

          const stDepts = _.groupBy(orderItems, item => order.sortItems === 'STAFF' ? item.structID : 'null')
          _.forEach(stDepts, stItems => {
            stItems = order.sortItems === 'STAFF' ? _.sortBy(stItems, ['structID']) : stItems
            const objSt = {
              stName: order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
              deps: []
            }
            const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' ? item['employeePositionID.departmentID'] : 'null')
            _.forEach(depts, depItems => {
              const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
              const persons = getEmployeeList(depItems, indexText).filter(el => el.toOrder)
              if (persons.length) {
                objSt.deps.push({
                  depName: order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
                  persons: persons
                })
              }
            })
            if (objSt.deps.length) {
              objItem.items.push(objSt)
            }
          })
          if (objItem.items.length) {
            result.data.push(objItem)
          }
        }
      }
    })

    result.tasks = order.sortItems === 'ORDER' ? [] : taskDet.tasks.map(e => ({
      task: `${index === 1 && taskDet.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  }
}
