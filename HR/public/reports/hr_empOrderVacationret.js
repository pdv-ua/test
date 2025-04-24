/* global UB AC HR _ appAC */
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
          HR.reportUtils.getEmpOrder(reportParams.instanceID)])
          .then(([order]) => {
            const whereArray = [['empOrderType', '=', 'VACATIONRET']]
            const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
            const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
            const configObj = { printDocumentView }
            return Promise.all([
              HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
              HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true),
              UB.Repository('hr_empOrderVacationretDet')
                .attrs(['ID', 'dateFrom', 'isBreaking', 'reason', 'reasonDoc', 'primeVacationParaID.dictVacationKindID.nameAcc',
                  'primeVacationParaID.dictVacationKindID.nameGen', 'primeVacationParaID.dictVacationKindID.name', 'retPositionID',
                  'retPositionID.isOrgBoss', 'retPositionID.fullNameGen', 'retPositionID.fullName', 'retPositionID.name',
                  'primeVacationParaID.dictVacationKindID.nameLoc', 'reasonOrder'])
                .where('orderID', '=', reportParams.instanceID)
                .orderBy('itemIdx')
                .selectAsObject(),
              HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
              HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
              UB.Repository('hr_empOrderVacSubstitutionDet')
                .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID', 'employeePositionID.employeeID', 'employeePositionID.employeeID.datName',
                  'employeePositionID.employeeID.fullFIO', 'employeePositionID.employeeNumberID.tabNum', 'employeePositionID.employeeID.sexType'])
                .where('orderID', '=', reportParams.instanceID)
                .selectAsObject(),
              printDocumentView
            ]).then(([configObj, empOrder, orderDet, respPosInfo, city, vacSubstitutionDet, printDocumentView]) => {
              const employeePositionIDs = vacSubstitutionDet && vacSubstitutionDet.length > 0 ? _.uniq(vacSubstitutionDet.map(el => el.employeePositionID)) : []
              const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.organizationID || appAC.globalOrganization()) === true
              return Promise.all([
                HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
                HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Dat'], useSexType)
              ]).then(([tasks, employeePosition]) => ({
                empOrder,
                orderDet,
                tasks,
                respPosInfo,
                city,
                order,
                orderExtract,
                vacSubstitutionDet,
                employeePosition,
                printDocumentView,
                configObj
              }))
            })
          })
      })
  },

  getParams: async function (data) {
    let i = 1
    let titleName
    const me = this
    const showTabNum = data.order.showTabNum // AC.settings.get('hrOrderTabNum', data.order.masterOrganizationID || data.order.organizationID) === true
    data.employeePosition = data.employeePosition && data.employeePosition.length > 0 ? _.groupBy(data.employeePosition, 'ID') : []
    await HR.reportUtils.checkEmployeeChange(data.order.orderDate, ['fullFIO', 'datName'], data.vacSubstitutionDet, undefined, 'employeePositionID.employeeID')

    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''

    const boldFormatBegin = data.configObj.normalFullName ? '' : '<b>'
    const boldFormatEnd = data.configObj.normalFullName ? '' : '</b>'

    const params = {
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      emblem: HR.reportUtils.getEmblem(),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      orderReason: data.order.reason
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
      items: data.orderDet.map(e => {
        const item = data.empOrder.find(o => o.ID === e.ID)
        _.merge(e, item || [])
        const toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        let txt = ''
        const vac = data.vacSubstitutionDet.filter(item => item.paraID === e.ID)
        const iText = vac.length || data.orderDet.length > 1 || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? `${i++}. ` : ''

        let reasonOrder
        if (e.isBreaking) {
          let orderWord = UB.i18n('Перервати')
          orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
          const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'dat', false, data.configObj.notUseMiddleNameInOrder)
          txt = UB.i18n(`{0}{2} з&nbsp;{1} `, iText, AC.dateService.formatDate(e.dateFrom), orderWord)
          txt += e['primeVacationParaID.dictVacationKindID.nameAcc'] || e['primeVacationParaID.dictVacationKindID.name'] || ''
          txt += ` ${posInfo.posName}${orgGen}`
          txt += ` ${boldFormatBegin}${HR.reportUtils.formatFullNameInOrder(e['employeeID.datName'] || e['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })}` + (showTabNum && e['employeeNumberID.tabNum'] ? ' ' + boldFormatEnd + `(Таб. №&nbsp;${e['employeeNumberID.tabNum']})` : boldFormatEnd)
          txt += `${e.reason ? '&nbsp;' + e.reason : ''}.`
          reasonOrder = e.reasonOrder ? 'Підстава: ' + e.reasonOrder + '.' : ''
        } else {
          let orderWord = UB.i18n('Вважати')
          orderWord = data.configObj.smallOrderWord ? orderWord : orderWord.toUpperCase()
          let posName = e.retPositionID ? e['retPositionID.fullNameGen'] || e['retPositionID.fullName'] || e['retPositionID.name'] : ''
          if (!posName) {
            const posInfo = HR.reportUtils.getInfoItemOrderInCase(e, 'gen', true, data.configObj.notUseMiddleNameInOrder)
            posName = posInfo.posName
          } else {
            posName = HR.reportUtils.makePositionName(posName, e['retPositionID.isOrgBoss'])
          }

          txt = `${iText}${orderWord} ${boldFormatBegin}${HR.reportUtils.formatFullNameInOrder(e['employeeID.accusativeName'] || e['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })}` + (showTabNum && e['employeeNumberID.tabNum'] ? ' ' + boldFormatEnd + `(Таб. №&nbsp;${e['employeeNumberID.tabNum']}) ` : ' ' + boldFormatEnd)
          txt += e['employeeID.sexType'] === 'W' ? UB.i18n('такою, що вийшла з ') : UB.i18n('таким, що вийшов з ')
          txt += e['primeVacationParaID.dictVacationKindID.nameGen'] || e['primeVacationParaID.dictVacationKindID.name'] || ''
          txt += (e['employeeID.sexType'] === 'W' ? ' та приступила' : ' та приступив') + ' до виконання службових обов`язків на посаді '
          txt += `${posName}${orgGen}`
          txt += UB.i18n(` з&nbsp;{0}{1}, з посадовим окладом згідно із штатним розписом.`, AC.dateService.formatDate(e.dateFrom), e.reason ? ' ' + e.reason : '')
          txt += `${(e.reasonOrder && AC.settings.get('hrEnableReasonDoc', data.order.organizationID || appAC.globalOrganization())) ? '&nbsp;Підстава: ' + e.reasonOrder + '.' : ''}`
        }
        const vacLoc = HR.nameCase.uncap(e['primeVacationParaID.dictVacationKindID.nameLoc'] || e['primeVacationParaID.dictVacationKindID.name'] || '')
        return {
          toOrder: toOrder,
          text: txt,
          reasonText: reasonOrder,
          vacSubInfo: vac.length ? me.makeVacSubstitution(data.orderDet.length > 1 || (data.tasks && data.tasks.tasks && data.tasks.tasks.length) ? 0 : i++, vac, vacLoc, e['employeeID.genName'] || e['employeeID.fullFIO'], e['employeeID.accusativeName'] || e['employeeID.fullFIO'],
            (showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''), e['employeeID.sexType'],
            HR.reportUtils.makePositionName(e['employeePositionID.positionID.fullNameGen'] || e['employeePositionID.positionID.name'], e['employeePositionID.positionID.isOrgBoss']),
            data.employeePosition, e.dateFrom, e.dateTo, e['positionID.positionType'] === '1', showTabNum, orgGen,
            data.configObj.normalFullName, data.configObj.smallOrderWord, data.configObj.notUseMiddleNameInOrder) : []
        }
      }),
      tasks: data.tasks.tasks.map(e => ({
        task: `${i === 1 && data.tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
      })),
      responsiblesInfo: data.respPosInfo
    }
    HR.reportUtils.copyToParams(params, data.configObj)

    if (data.orderDet.length === 1) {
      data.order.titleOrder = data.order.titleOrder ? data.order.titleOrder
        : data.orderDet[0].isBreaking ? UB.i18n('Про переривання відпустки') : UB.i18n('Про вихід на роботу')
      titleName = HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.genName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
    } else if (data.orderDet.length !== 0) {
      titleName = ''
    }
    params.titleOrder = `${data.order.titleOrder || ''}${titleName ? `<br/>${titleName}` : ''}`.replace(/&/g, '&nbsp;')

    params.items = params.items.filter(el => el.toOrder)
    return AC.reportService.removeEmptyValues(params)
  },

  makeVacSubstitution: function (i, vacSub, vacNameLoc, fioGen, fioAcc, tabNum, sexType, positionName, employeePosition, dateFrom, dateTo, positionType, showTabNum, orgGen, normalFullName, smallOrderWord, notUseMiddleNameInOrder) {
    const items = []
    const sexTypeVac = vacSub.length === 1 ? (vacSub[0]['employeePositionID.employeeID.sexType'] === 'W' ? UB.i18n('призначеній') : UB.i18n('призначеному')) : UB.i18n('призначеним')
    const boldFormatBegin = normalFullName ? '' : '<b>'
    const boldFormatEnd = normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Припинити')
    orderWord = smallOrderWord ? orderWord : orderWord.toUpperCase()

    vacSub.forEach((el) => {
      let posName = ''
      if (employeePosition[el.employeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[el.employeePositionID][0], 'dat', false, notUseMiddleNameInOrder, '')
        posName = posInfo.posName || ''
        /*
        posName = HR.reportUtils.makePositionName(employeePosition[el.employeePositionID][0]['positionID.fullNameDat'] ||
            employeePosition[el.employeePositionID][0]['positionID.nameDat'] ||
            employeePosition[el.employeePositionID][0]['positionID.name'] || '', employeePosition[el.employeePositionID][0]['positionID.isOrgBoss'])
         */
      }

      let str = `${boldFormatBegin}${HR.reportUtils.formatShortNameInOrder(el['employeePositionID.employeeID.datName'] || el['employeePositionID.employeeID.fullFIO'], { notUseMiddleNameInOrder, separator: '&nbsp;' })}`
      str += showTabNum && el['employeePositionID.employeeNumberID.tabNum'] ? ' ' + boldFormatEnd + UB.i18n(`(Таб. №&nbsp;{0})`, el['employeePositionID.employeeNumberID.tabNum']) : boldFormatEnd
      str += posName ? `, ${posName}${orgGen}` : ''
      items.push(str)
    })

    fioGen = HR.reportUtils.formatShortNameInOrder(fioGen, { notUseMiddleNameInOrder, separator: '&nbsp;' }) + tabNum
    return {
      index: i ? `${i}. ` : '',
      value: UB.i18n(`{3} {0}, {1} на цю посаду на період перебування основного {2} `, items.join(', '), sexTypeVac, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника'), orderWord) +
        UB.i18n(`{0} у {1}, перебування на цій посаді з&nbsp;{2} `, fioGen, vacNameLoc, AC.dateService.formatDate(AC.dateService.addDays(dateFrom, -1))) +
        UB.i18n(`у зв'язку з поверненням основного працівника {0} до виконання своїх обов'язків.`, fioGen)
    }
  }
}
