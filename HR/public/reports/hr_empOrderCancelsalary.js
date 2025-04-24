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
        const whereArray = [['empOrderType', '=', 'CANCELSALARY']]
        return Promise.all([
          HR.reportUtils.getEmpOrder(reportParams.instanceID)])
          .then(([order]) => {
            const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
            const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
            const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
            const configObj = { printDocumentView }
            return Promise.all([
              HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
              HR.reportUtils.getEmpOrderDet(reportParams.instanceID, onDate, ['departmentID'], whereArray, false),
              UB.Repository('hr_empOrderChgSalEmpDet')
                .attrs(['ID', 'payElID.name', 'payElID.printName', 'payElID.genName', 'dateFrom', 'dateTo', 'newValue', 'firstName', 'lastName', 'middleName', 'accrualRate',
                  'employeeID.datName', 'organizationID.nameGen', 'organizationID.name', 'employeeNumberID',
                  'orderID.preamble', 'orderID.comment', 'orderID.reason', 'employeeID.fullFIO', 'employeeID.genName',
                  'payElID', 'entityParaID', 'paraID', 'accrualID'])
                .where('empOrderType', '=', 'CANCELSALARY')
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              UB.Repository('hr_empOrderCancelsalaryDet')
                .attrs(['ID', 'payElID.name', 'payElID.printName', 'payElID', 'reason', 'payElID.methodID.valuation'])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              printDocumentView
            ]).then(([configObj, empOrder, orderDet, orderDetCancel, printDocumentView]) => {
              // const onDate = AC.dateService.truncTimeToUtcNull(order.orderDate || order.entryDate)
              const payElIDs = orderDetCancel.map(el => el.payElID)
              const employeeNumberIDs = orderDet.map(el => el.employeeNumberID)
              const ord = UB.Repository('hr_employeeAccrual')
                .attrs(['ID', 'payElID', 'employeeNumberID', 'orderID.orderNumber', 'orderID.orderDate', 'dateFrom', 'dateTo'])
                .where('orderID', 'isNotNull')
                .whereIf(payElIDs, 'payElID', 'in', payElIDs)
                .whereIf(!payElIDs, 'payElID', '=', 0)
                .whereIf(employeeNumberIDs, 'employeeNumberID', 'in', employeeNumberIDs)
                .whereIf(!employeeNumberIDs, 'employeeNumberID', '=', 0)
                // .whereIf(onDate, 'dateFrom', '<=', onDate)
                // .whereIf(onDate, 'dateTo', '>=', onDate)
                .where('mi_deleteDate', '>=', '#maxdate')
              return Promise.all([
                HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
                ord.selectAsObject(),
                HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
                HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID)
              ]).then(([tasks, orderForCancel, respPosInfo, city]) => ({
                empOrder,
                respPosInfo,
                city,
                orderDet,
                orderForCancel,
                orderDetCancel,
                order,
                tasks,
                orderExtract,
                printDocumentView,
                configObj
              }))
            })
          })
      })
  },
  getParams: async function (data) {
    let numb = 1
    let titleName
    const showTabNum = data.order.showTabNum

    const getFormatArr = (arr, one, typeText, titleOrg, reason, accrual) => {
      const res = []
      let text
      let oneAccrual = true
      let showDate = true
      let lastDate
      if (typeText === 2) {
        const ids = _.uniq(arr.map(item => item.employeeNumberID))
        const flt = accrual.filter(item => ids.indexOf(item.employeeNumberID) !== -1)
        oneAccrual = (flt && flt.length === 1)
      } else {
        arr.sort((a, b) => (a.dateTo > b.dateTo) ? 1 : -1)
      }

      arr.forEach((el, ind) => {
        const item = data.empOrder.find(o => o.ID === el.ID)
        _.merge(el, item || [])
        const toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        if (typeText === 1) {
          const pos = HR.reportUtils.makePositionName(el['employeePositionID.positionID.fullNameDat'] || el['employeePositionID.positionID.nameDat'] || el['employeePositionID.positionID.name'] || '', el['employeePositionID.positionID.isOrgBoss'])
          const tabNum = showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
          if (one) {
            text = `${UB.i18n('Скасувати')} &nbsp;${boldFormatBegin}${HR.reportUtils.formatFullNameInOrder(el['employeeID.datName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}, `
            text += pos ? pos + ' ' : ''
            text += `${titleOrg}, ${el['payElID.printName'] || el['payElID.name']}${UB.i18n(', у розмірі ')}`
            text += el.accrualRate ? (el.accrualRate + UB.i18n('&nbsp;відсотків посадового окладу')) : el.newValue ? (el.newValue + UB.i18n('&nbsp;гривень')) : ''
            text += reason ? `&nbsp;${reason || ''}. ` : '. '
            text += UB.i18n('Вважати останнім днем дії нарахування ') + (AC.dateService.formatDate(el.dateTo) === '31.12.9999' ? UB.i18n('____________&nbsp;року.') : UB.i18n(`{0}&nbsp;року.`, AC.dateService.formatDate(el.dateTo)))
          } else {
            text = `${boldFormatBegin}${HR.reportUtils.formatFullNameInOrder(el['employeeID.datName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd},&nbsp;`
            text += pos ? pos + ', ' : ''
            text += UB.i18n(`у розмірі `)
            text += el.accrualRate ? (el.accrualRate + UB.i18n('&nbsp;відсотків посадового окладу')) : el.newValue ? (el.newValue + UB.i18n('&nbsp;гривень')) : ''
            text += reason ? `&nbsp;${reason}` : ''
            text += (ind + 1) < arr.length ? ';' : '.'
          }
          if (!lastDate || AC.dateService.dateDiff(lastDate, el.dateTo)) {
            lastDate = el.dateTo
            showDate = true
          } else showDate = false

          res.push({
            toOrder: toOrder,
            ind: ind++,
            text: text,
            dateTo: showDate && AC.dateService.formatDate(el.dateTo) !== '31.12.9999' ? `${AC.dateService.formatDate(el.dateTo)}` : ''
          })
        } else {
          const flt = accrual.filter(item => item.ID === el.accrualID)
          // const flt = accrual.filter(item => item.employeeNumberID === el.employeeNumberID && item.dateFrom <= el.dateTo && item.dateTo >= el.dateTo)
          flt.forEach((item, ind2) => {
            if (oneAccrual) {
              text = UB.i18n(`Визнати таким, що втратив чинність, наказ {0}`, titleOrg)
            } else {
              text = ''
            }
            text += item['orderID.orderDate'] ? UB.i18n(' від&nbsp;') + AC.dateService.formatDate(item['orderID.orderDate']) : ''
            text += UB.i18n(`{0} у частині встановлення нарахування {1}`, item['orderID.orderNumber'] ? UB.i18n(' №&nbsp;') + item['orderID.orderNumber'] : '', HR.reportUtils.formatFullNameInOrder(el['employeeID.genName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder }))
            text += (ind + ind2 + 2) < (arr.length + flt.length) ? ';' : '.'
            res.push({
              toOrder: toOrder,
              ind: '',
              text: text,
              dateTo: ''
            })
          })
        }
      })

      return res
    }

    const params = {
      emblem: HR.reportUtils.getEmblem(),
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      printDocumentView: data.printDocumentView,
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      data: [],
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
      detail: [],
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    const boldFormatBegin = params.normalFullName ? '' : '<b>'
    const boldFormatEnd = params.normalFullName ? '' : '</b>'

    data.orderDetCancel.forEach(el => {
      const flt = data.orderDet.filter(elem => el.ID === elem.entityParaID)
      const accrual = data.orderForCancel.filter(elem => el.payElID === elem.payElID)
      if (flt && flt.length > 0) {
        const items = getFormatArr(flt, flt.length === 1, 1, data.order['organizationID.nameGen'] || data.order['organizationID.name'], el.reason || '', []).filter(el => el.toOrder)
        if (items.length) {
          let accrualItems = []
          if (accrual && accrual.length > 0) {
            accrualItems = getFormatArr(flt, flt.length === 1, 2, data.order['organizationID.nameGen'] || data.order['organizationID.name'], el.reason || '', accrual).filter(el => el.toOrder)
          }
          params.detail.push({
            one: flt.length === 1,
            i: data.orderDet.length > 1 || (accrualItems && accrualItems.length > 0) || (data.tasks.tasks && data.tasks.tasks.length) ? `${numb++}. ` : '',
            text: flt.length === 1 ? '' : UB.i18n(`Скасувати {0} таким працівникам {1}:`, el['payElID.printName'] || el['payElID.name'], data.order['organizationID.nameGen'] || data.order['organizationID.name']),
            items: items
          })
          if (accrualItems.length) {
            params.detail.push({
              one: flt.length === 1,
              i: `${numb++}. `,
              text: flt.length === 1 ? '' : UB.i18n(`Визнати такими, що втратили чинність, накази {0}:`, data.order['organizationID.nameGen'] || data.order['organizationID.name']),
              items: accrualItems
            })
          } else {
            // numb++
          }
        } else {
          if (data.orderDet.length > 1 || (accrual && accrual.length > 0) || (data.tasks.tasks && data.tasks.tasks.length)) {
            numb++
          }
          if (accrual && accrual.length > 0) {
            numb++
          }
        }
      }
    })

    if (data.orderDet.length === 1) {
      params.titleName = UB.i18n(`Про скасування нарахування {0} {1}`, data.orderDet[0] && data.orderDet[0]['payElID.name'] ? data.orderDet[0]['payElID.name'].toLowerCase() : '', HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.datName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder }))
    } else if (data.orderDet.length === 0) {
      params.titleName = ''
    } else {
      params.titleName = UB.i18n(`Про скасування нарахування {0} працівникам {1}`, data.orderDet[0] && (data.orderDet[0]['payElID.genName'] || data.orderDet[0]['payElID.name']) ? (data.orderDet[0]['payElID.genName'] || data.orderDet[0]['payElID.name']).toLowerCase() : '', data.order['organizationID.nameGen'] || data.order['organizationID.nameGen'])
    }

    params.tasks = data.tasks.tasks.map(e => ({
      task: `${numb === 1 && data.tasks.tasks.length === 1 ? '' : numb++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(params)
  }
}
