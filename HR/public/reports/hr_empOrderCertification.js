/* global UB AC HR _ */
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
          const whereArray = [['empOrderType', '=', 'CERTIFICATION']]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
            UB.Repository('hr_empOrderCertificationDet')
              .attrs(['ID', 'certificationType', 'dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictTarifCoeffID.code', 'departmentID.code', 'accrualSum',
                'dictEmpCategoryID', 'dictEmpCategoryID.code', 'dictEmpCategoryID.name', 'dictSpecialtyID.name',
                'info', 'reason', 'orderDate', 'dateFrom'])
              .where('orderID', '=', reportParams.instanceID)
              .selectAsObject(),
            UB.Repository('hr_empOrderAcc')
              .attrs(['payElID.name', 'payElID.code', 'payElID.printName', 'accrualSum', 'accrualRate',
                'empOrderDetID', 'dateFrom', 'dateTo'])
              .where('empOrderID', '=', reportParams.instanceID)
              .selectAsObject({
                'payElID.code': 'payCode',
                'payElID.name': 'payName',
                'payElID.printName': 'payPrintName'
              }),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, orderAcc, respPosInfo, city, printDocumentView]) => {
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder)
            ]).then(([tasks]) => ({
              empOrder,
              orderDet,
              orderAcc,
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
    const me = this
    let titleName
    const showTabNum = data.order.showTabNum
    if (data.empOrder.length === 1) {
      titleName = HR.reportUtils.formatShortNameInOrder(data.empOrder[0]['employeeID.datName'] || data.empOrder[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    } else if (data.empOrder.length !== 0) {
      titleName = UB.i18n('працівникам')
    }

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const params = {
      emblem: HR.reportUtils.getEmblem(),
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      responsiblesInfo: data.respPosInfo,
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
          organizationName: data.order.orderOrganizationName,
          orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
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
      titleOrder: `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;'),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      items: [],
      showSumma: AC.settings.get('hrOrderAccrualByStaffTable', data.order['organizationID'] || data.order['masterOrganizationID']),
      showAccrual: AC.settings.get('hrShowAccrualMoveCert', data.order['organizationID'] || data.order['masterOrganizationID'])
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    const boldFormatBegin = params.normalFullName ? '' : '<b>'
    const boldFormatEnd = params.normalFullName ? '' : '</b>'

    _.forEach(data.orderDet, orderItem => {
      const item = data.empOrder.find(o => o.ID === orderItem.ID)
      _.merge(orderItem, item || [])
      orderItem.toOrder = data.orderExtract && data.orderExtract.ID
        ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      orderItem.staffCat = (orderItem['employeePositionID.positionID.dictStaffCatID.name'] || '').toLowerCase() === UB.i18n('лікарі') ? '1' : '2'
    })

    let index = 0
    const hrCertificationObligAttrs = AC.settings.get('hrCertificationObligAttrs', data.order.masterOrganizationID || data.order.organizationID) || '3'
    if (hrCertificationObligAttrs === '3') {
      data.orderDet = _.sortBy(data.orderDet, ['staffCat', 'certificationType.name', 'dictEmpCategoryID.code', 'dictSpecialtyID.name', 'departmentID.code'])
      data.orderDet = _.groupBy(data.orderDet, item => { return `${item.staffCat}/${item.certificationType}/${item['dictEmpCategoryID.code']}/${item['dictSpecialtyID.name' || '']}` })
      _.forEach(data.orderDet, det => {
        const indexText = (data.empOrder && data.empOrder.length > 1) || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? ++index + '.' : ''
        let text = indexText ? indexText + ' ' : ''
        if (det[0].staffCat === '1') {
          let orderWord = (det[0].certificationType || '') === 'ASSIGN' ? UB.i18n('Присвоєно') : UB.i18n('Підтверджено')
          orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
          text += UB.i18n(`{0} кваліфікаційну категорію {1}`, orderWord, (det[0]['dictEmpCategoryID.name'] || '').toUpperCase())
        } else {
          let orderWord = UB.i18n('Затвердити')
          orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
          text += UB.i18n(`{2} рішення про {0} кваліфікаційної категорії {1}`, (det[0].certificationType || '') === 'ASSIGN' ? UB.i18n('присвоєння') : UB.i18n('підтвердження'), (det[0]['dictEmpCategoryID.name'] || '').toUpperCase(), orderWord)
        }
        text += `${det[0]['dictSpecialtyID.name'] ? UB.i18n(' зі спеціальності ') + HR.nameCase.uncap(det[0]['dictSpecialtyID.name']) : ''} ${UB.i18n('працівникам')}:`
        const obj = {
          text: text,
          accrual: [],
          data: det.map((el, inx) => {
            const posInfo = HR.reportUtils.getInfoItemOrderInCase(el, 'dat', true, params.notUseMiddleNameInOrder)
            const orderAccRows = data.orderAcc.filter(e => e.empOrderDetID === el.ID)
            const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
            return {
              toOrder: el.toOrder,
              emp: `${indexText}${inx + 1}. ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo.posName ? ', ' + HR.reportUtils.makePositionName(posInfo.posName, el['employeePositionID.positionID.isOrgBoss']) + orgGen : ''}${el.orderDate
                ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(el.orderDate) + UB.i18n('&nbsp;року')
                : ''}.`,
              tarif: el['dictTarifCoeffID.code'] ? UB.i18n('Тарифний розряд - ') + el['dictTarifCoeffID.code'] + '.' : '',
              accrualSum: el.accrualSum && params.showSumma ? `${UB.i18n('Посадовий оклад')} - ${HR.reportUtils.formatAsCurrency(el.accrualSum)}&nbsp;${UB.i18n('грн')}.` : '',
              info: el.info ? `${el.info}.` : '',
              reason: el.reason ? UB.i18n('Підстава: ') + el.reason + '.' : '',
              accrual: orderAccRows.length && params.showAccrual ? me.makeAccrualInfo(posInfo, orderAccRows, data.configObj.notUseMiddleNameInOrder) : []
            }
          }).filter(el => el.toOrder)
        }
        if (obj.data.length) {
          params.items.push(obj)
        }
      })
    } else {
      _.forEach(data.orderDet, det => {
        const orderAccRows = data.orderAcc.filter(el => el.empOrderDetID === det.ID)
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(det, 'dat', true, params.notUseMiddleNameInOrder)
        const indexText = (data.empOrder && data.empOrder.length > 1) || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? ++index + '.' : ''
        const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''

        let orderWord = (det.certificationType || '') === 'ASSIGN' ? UB.i18n('Присвоїти') : (hrCertificationObligAttrs === '2' ? UB.i18n('Підтвердити') : UB.i18n('Підтверджено'))
        orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()

        let text = indexText ? indexText + ' ' : ''
        text += orderWord
        text += ` ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posInfo.posName ? ', ' + HR.reportUtils.makePositionName(posInfo.posName, det['employeePositionID.positionID.isOrgBoss']) + orgGen : ''}`
        text += det.dateFrom ? UB.i18n(' з&nbsp;') + AC.dateService.formatDate(det.dateFrom) + UB.i18n('&nbsp;року') : ''
        if (hrCertificationObligAttrs === '1') {
          text += ` ${UB.i18n('кваліфікаційну категорію')} - ${det['dictEmpCategoryID.name']}.`
          text += det.dictTarifCoeffID ? ` ${UB.i18n('Тарифний розряд')} - ${HR.nameCase.uncap(det['dictTarifCoeffID.code'] || '')}.` : ''
        } else {
          orderWord = UB.i18n('Підтверджено')
          orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
          text += ` ${HR.nameCase.uncap(det['dictTarifCoeffID.code'] || '')} ${UB.i18n('розряд')}.`
          text += det.dictEmpCategoryID && (det.certificationType || '') === 'ASSIGN' ? ` ${UB.i18n('Кваліфікаційна категорія')} - ${det['dictEmpCategoryID.name']}.` : ''
          text += det.dictEmpCategoryID && (det.certificationType || '') !== 'ASSIGN' ? ` ${UB.i18n('{0} кваліфікаційну категорію', orderWord)} - ${det['dictEmpCategoryID.name']}.` : ''
        }
        if (det.accrualSum && params.showSumma) {
          text += ` ${UB.i18n('Посадовий оклад')} - ${HR.reportUtils.formatAsCurrency(det.accrualSum)}&nbsp;${UB.i18n('грн')}.`
        }
        params.items.push({
          text: text,
          data: [],
          accrual: orderAccRows.length && params.showAccrual ? me.makeAccrualInfo(posInfo, orderAccRows, data.configObj.notUseMiddleNameInOrder) : []
        })
      })
    }

    params.tasks = data.tasks.tasks.map(e => ({
      task: `${index === 0 && data.tasks.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return AC.reportService.removeEmptyValues(params)
  },
  makeAccrualInfo: function (posInfo, orderAccRows, notUseMiddleNameInOrder) {
    const data = []
    if (orderAccRows && orderAccRows.length) {
      orderAccRows.forEach((el, idx) => {
        const accrualStr = el.accrualSum
          ? UB.i18n(` у розмірі {0}&nbsp;гривень`, HR.reportUtils.formatAsCurrency(el.accrualSum))
          : (el.accrualRate
            ? UB.i18n(` у розмірі {0}&nbsp;відсотків`, el.accrualRate)
            : '')
        const accrualDateFrom = el.dateFrom ? `${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(el.dateFrom)}` : ''
        const accrualDateTo = (!el.dateTo || AC.dateService.isMaxDate(el.dateTo)) ? '' : ` ${UB.i18n('по')}&nbsp;${AC.dateService.formatDate(el.dateTo)}`

        if (orderAccRows.length === 1) {
          data.push({
            indent: 1,
            text: el.payCode === '42'
              ? `${UB.i18n('Виплатити')} ${HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder: notUseMiddleNameInOrder })} ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}.`
              : `${UB.i18n('Встановити')} ${HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder: notUseMiddleNameInOrder })} ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}${accrualDateFrom ? ' ' : ''}${accrualDateFrom}${accrualDateTo}.`
          })
        } else {
          if (idx === 0) {
            data.push({
              text: el.payCode === '42'
                ? `${UB.i18n('Виплатити')} ${HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder: notUseMiddleNameInOrder })}:`
                : `${UB.i18n('Встановити')} ${HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder: notUseMiddleNameInOrder })}:`
            })
          }
          data.push({
            text: el.payCode === '42'
              ? `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}${idx === (orderAccRows.length - 1) ? '.' : ';'}`
              : `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}${accrualDateFrom ? ' ' : ''}${accrualDateFrom}${accrualDateTo}${idx === (orderAccRows.length - 1) ? '.' : ';'}`
          })
        }
      })
    }
    return data
  }
}
