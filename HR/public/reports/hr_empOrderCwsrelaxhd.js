/* global UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => me.getParams(data)).then(params => AC.reportService.generateReport(params, me))
  },

  getData (reportParams) {
    return Promise.all([
      HR.reportUtils.getEmpOrderExtract(reportParams.params ? reportParams.params.orderExtraID || 0 : 0)])
      .then(([orderExtract]) => {
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)]).then(([order]) => {
          const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
          const whereArray = [['empOrderType', 'in', ['CWSRELAXHD', 'CWSRELAXHDGRP']]]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, onDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderCwsrelaxhdDet')
              .attrs(['ID', 'dictTimeCostID',
                'sourceParaID.orderID.dictEmpOrderIndexID', 'sourceParaDescription', 'dateTo', 'sourceParaID.orderID.orderDate',
                'sourceParaID.dateFrom', 'sourceParaID.orderID.dictEmpOrderIndexID.code',
                'sourceParaID.orderID.orderNumber', 'employeeID.fullFIO', 'employeeID.genName', 'dateFrom'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            UB.Repository('hr_empOrderCwsrelaxhdgrpDet')
              .attrs(['ID', 'typeCompensation'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            UB.Repository('hr_empOrderCwsRelaxhdGrpEmp')
              .attrs(['ID', 'paraID', 'workHours', 'dateFrom', 'dateRest', 'reasonOrderID.orderDate',
                'reasonOrderID.dictEmpOrderIndexID.code', 'reasonOrderID.orderNumber'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('itemIdx')
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, orderDetGrp, orderDetEmp, respPosInfo, city, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderDet,
              orderDetGrp,
              orderDetEmp,
              tasks,
              respPosInfo,
              city,
              order,
              orderExtract,
              printDocumentView,
              configObj
            }))
          })
        })
      })
  },

  getParams: async function (data) {
    let i = 1
    let titleName = ''
    const showTabNum = data.order.showTabNum

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const organizationNameGen = data.order['organizationID.nameGen'] || data.order['organizationID.name'] || ''
    let orderWord = UB.i18n('Надати')
    orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
    let orderWord2 = UB.i18n('Компенсувати')
    orderWord2 = data.configObj.smallOrderWord ? orderWord2 : orderWord2.toUpperCase()
    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const params = {
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      reason: data.order.reason
        ? {
          indent: data.printDocumentView === 'APPOINTMENT' ? 'text-indent: 34px;' : '',
          text: UB.i18n(`Підстава: {0}.`, data.order.reason)
        }
        : null,
      orderBlock: data.printDocumentView !== 'APPOINTMENT'
        ? {
          city: data.city,
          orderNumber: data.order.orderNumber || '',
          orderDate: AC.dateService.getStringFormatDate(data.order.orderDate, '', ''),
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
          organizationName: data.order.orderOrganizationName,
          order: UB.i18n('НАКАЗУЮ:')
        }
        : null,
      appointmentBlock: data.printDocumentView === 'APPOINTMENT'
        ? {
          orderDate: AC.dateService.formatDate(data.order.orderDate) || '________________',
          orderNumber: data.order.orderNumber || '________________',
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`
        }
        : null,
      mainRespPos: data.printDocumentView === 'APPOINTMENT' && data.respPosInfo.length ? data.respPosInfo[0].respPos || '' : '',
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      items: [],
      responsiblesInfo: data.respPosInfo
    }

    const cntDets = data.orderDet.length + data.orderDetEmp.length === 1
    data.empOrder.map(e => {
      if (e.empOrderType === 'CWSRELAXHD') {
        const item = data.orderDet.find(o => o.ID === e.ID)
        if (item) {
          _.merge(item, e)

          if (cntDets === 1) {
            titleName = HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
          }

          const toOrder = data.orderExtract && data.orderExtract.ID
            ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
            : true
          const posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, data.configObj.notUseMiddleNameInOrder)
          const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

          const oNumber = item['sourceParaID.orderID.orderNumber'] ? `№&nbsp;${item['sourceParaID.orderID.orderNumber']}` : ''
          const oIndex = item['sourceParaID.orderID.dictEmpOrderIndexID.code'] ? `/${item['sourceParaID.orderID.dictEmpOrderIndexID.code']}` : ''
          // const dateFrom = AC.dateService.formatDate(item['sourceParaID.dateFrom']) === AC.dateService.formatDate(item.dateFrom) ? '' : ` ${AC.dateService.formatDate(item['sourceParaID.dateFrom'])}`
          const oDate = AC.dateService.formatDate(item['sourceParaID.orderID.orderDate'])

          const sourceParaDescription = oNumber
            ? UB.i18n(`{0} (наказ {1} від&nbsp;{2} {3}{4})`, item.dateFrom ? ' ' + AC.dateService.formatDate(item.dateFrom) : '', organizationNameGen, oDate, oNumber, oIndex)
            : `${AC.dateService.formatDate(item.dateTo)}${(item.sourceParaDescription ? ' ' + item.sourceParaDescription : '')}`

          let text = (cntDets === 1) && (!data.tasks || data.tasks.tasks.length === 0) ? '' : `${i++}. ` + orderWord + ' '
          text += boldFormatBegin + (posInfo.empName || '') + boldFormatEnd + (tabNum ? ' ' + tabNum : '')
          text += posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen : ''
          text += ' ' + AC.dateService.formatDate(item.dateFrom) + ' ' + UB.i18n('день відпочинку за роботу у вихідний день') + sourceParaDescription + '.'

          text = text.replace('</b> ', ' </b>')
          text = text.replace('</b>,', ',</b>&nbsp;')

          params.items.push({
            toOrder,
            text
          })
        }
      }
      if (e.empOrderType === 'CWSRELAXHDGRP') {
        const itemGroup = data.orderDetGrp.find(o => o.ID === e.ID)
        if (itemGroup) {
          const empItems = data.orderDetEmp.filter(o => o.paraID === itemGroup.ID)
          empItems.forEach(item => {
            const detItem = data.empOrder.find(o => o.ID === item.ID)
            if (detItem) {
              _.merge(item, detItem)

              if (cntDets === 1) {
                titleName = HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
              }

              const toOrder = data.orderExtract && data.orderExtract.ID
                ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
                : true
              const posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true, data.configObj.notUseMiddleNameInOrder)
              const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''

              const oNumber = item['reasonOrderID.orderNumber'] ? `№&nbsp;${item['reasonOrderID.orderNumber']}` : ''
              const oIndex = item['reasonOrderID.dictEmpOrderIndexID.code'] ? `/${item['reasonOrderID.dictEmpOrderIndexID.code']}` : ''
              const oDate = AC.dateService.formatDate(item['reasonOrderID.orderDate'])

              const sourceParaDescription = oNumber
                ? UB.i18n(` (наказ {0} від&nbsp;{1} {2}{3})`, organizationNameGen, oDate, oNumber, oIndex)
                : ''

              let text = (cntDets === 1) && (!data.tasks || data.tasks.tasks.length === 0) ? '' : `${i++}. ` + (itemGroup.typeCompensation === 'MONEY' ? orderWord2 : orderWord) + ' '
              text += boldFormatBegin + (posInfo.empName || '') + boldFormatEnd + (tabNum ? ' ' + tabNum : '')
              text += posInfo && posInfo.posName ? ', ' + posInfo.posName + orgGen : ''
              if (itemGroup.typeCompensation === 'MONEY') {
                text += ' ' + UB.i18n('роботу у вихідний день') + (item.dateFrom ? ` ${AC.dateService.formatDate(item.dateFrom)}` : '')
                text += item.workHours ? ' ' + UB.i18n('на') + ' ' + item.workHours + ' ' + AC.dateService.plural(UB.i18n('робочу годину_робочих годин_робочих годин'), item.workHours) : ''
                text += ' ' + UB.i18n('згідно ст. 107 КЗпП України – провести оплату праці в подвійному розмірі') + '.'
              } else {
                text += (item.dateRest ? ' ' + AC.dateService.formatDate(item.dateRest) : '') + ' ' + UB.i18n('день відпочинку за роботу у вихідний день')
                text += (item.dateFrom ? ` ${AC.dateService.formatDate(item.dateFrom)}` : '') + sourceParaDescription + '.'
              }
              text = text.replace('</b> ', ' </b>')
              text = text.replace('</b>,', ',</b>&nbsp;')

              params.items.push({
                toOrder,
                text
              })
            }
          })
        }
      }
    })

    params.items = params.items.filter(el => el.toOrder)
    params.tasks = data.tasks.tasks.map(e => ({
      task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    params.titleOrder = `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;')

    HR.reportUtils.copyToParams(params, data.configObj)
    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  }
}
