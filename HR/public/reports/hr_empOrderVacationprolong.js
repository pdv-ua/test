/* global UB AC HR _ appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const order = await HR.reportUtils.getEmpOrder(reportParams.instanceID)
    if (!order) {
      return {
        emblem: HR.reportUtils.getEmblem()
      }
    }

    const orderExtract = await HR.reportUtils.getEmpOrderExtract(reportParams.params ? reportParams.params.orderExtraID || 0 : 0)
    const whereArray = [['empOrderType', 'in', ['VACATIONPROLONG', 'VACATIONPROLONGL']]]
    const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
    const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
    const empOrder = await HR.reportUtils.getEmpOrderDet(reportParams.instanceID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    const orderDet = await UB.Repository('hr_empOrderVacationprolongDet')
      .attrs(['ID', 'dateFrom', 'dateTo', 'reason', 'dayCount',
        'dictVacationKindID.dayAccumCondition', 'positionID.positionType', 'empOrderType', 'empOrderSicknessID', 'employeePositionID',
        'empOrderSicknessID.dateFrom', 'empOrderSicknessID.dateTo', 'reasonDoc',
        'dictVacationKindID.byArticle', 'action', 'grantVacationParaID', 'grantVacationParaID.orderID.description',
        'grantVacationParaID.dateFrom', 'grantVacationParaID.calcDateTo', 'grantVacationParaID.dateTo', 'grantVacationParaID.calcDayCount', 'grantVacationParaID.dayCount',
        'causeVacationParaID', 'causeVacationParaID.dictVacationKindID.nameAcc', 'causeVacationParaID.dictVacationKindID.name',
        'causeVacationParaID.dateFrom', 'causeVacationParaID.dateTo'
      ])
      .where('orderID', '=', reportParams.instanceID)
      .orderBy('itemIdx')
      .selectAsObject()
    const orderLongDet = await UB.Repository('hr_empOrderVacationprolonglDet')
      .attrs(['ID', 'dateFrom', 'dateTo', 'reason', 'dayCount', 'reasonDoc',
        'positionID.positionType', 'empOrderType', 'positionID', 'employeeNumberID', 'isActingContinue', 'calcDayCount', 'calcDateTo',
        'primeVacationParaID.dictVacationKindID.nameAcc', 'primeVacationParaID.dictVacationKindID.nameLoc', 'primeVacationParaID.dictVacationKindID.name',
        'primeVacationParaID.dateTo', 'primeVacationParaID.dictVacationKindID.dayAccumCondition', 'primeVacationParaID.dictVacationKindID.byArticle'])
      .where('orderID', '=', reportParams.instanceID)
      .orderBy('itemIdx')
      .selectAsObject()
    const respPosInfo = await HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT')
    const orderNext = await UB.Repository('hr_empOrderVacationListDet')
      .attrs(['itemIdx', 'entityParaID', 'dayCount', 'dateFrom', 'dateTo', 'dictVacationKindID.dayAccumCondition', 'dictVacationKindID.nameGen', 'employeeID',
        'dictVacationKindID.name', 'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'dictVacationKindID.byArticle', 'dictVacationKindID.code'])
      .where('orderID', '=', reportParams.instanceID)
      .orderBy('itemIdx')
      .selectAsObject()
    let ids = orderDet.filter(el => el.action === 'CANCEL' || el.action === 'TRANSFER').map(el => el.grantVacationParaID)
    const orderNextForCancelType = ids && ids.length ? await UB.Repository('hr_empOrderVacationListDet')
      .attrs(['itemIdx', 'entityParaID', 'dayCount', 'dateFrom', 'dateTo', 'dictVacationKindID.dayAccumCondition', 'dictVacationKindID.nameGen',
        'dictVacationKindID.name', 'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'dictVacationKindID.byArticle',
        'employeeID', 'dictVacationKindID.code'])
      .where('entityParaID', 'in', ids)
      .orderBy('itemIdx')
      .selectAsObject() : []
    const actDet = await UB.Repository('hr_empOrderActingDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeeID', 'employeeID.fullFIO', 'employeeID.accusativeName', 'condition',
        'employeeID.genName', 'employeeID.datName', 'employeeID.shortFIO', 'employeePositionID', 'payForExtraLoad',
        'payElID.calcAlgorithm', 'positionID.positionType', 'employeeNumberID.tabNum'])
      .where('orderID', '=', reportParams.instanceID)
      .orderBy('itemIdx')
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'genName', 'accusativeName', 'datName', 'shortFIO'], actDet)

    const vacSubstitutionDet = await UB.Repository('hr_empOrderVacSubstitutionDet')
      .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeePositionID', 'employeePositionID.employeeID', 'employeePositionID.employeeID.datName', 'employeePositionID.employeeID.fullFIO',
        'employeePositionID.employeeNumberID.tabNum', 'employeePositionID.employeeID.sexType'])
      .where('orderID', '=', reportParams.instanceID)
      .selectAsObject()
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['fullFIO', 'datName'], vacSubstitutionDet, undefined, 'employeePositionID.employeeID')

    const dateFrom = orderNext && orderNext.length > 0 ? _.min(orderNext.map(item => item.dateFrom)) || AC.dateService.todayDate() : AC.dateService.todayDate()
    const dateTo = orderNext && orderNext.length > 0 ? _.max(orderNext.map(item => item.dateTo)) || AC.dateService.todayDate() : AC.dateService.todayDate()
    const employeePositionIDs = actDet && actDet.length > 0 ? _.uniq(actDet.map(el => el.employeePositionID)) : []
    if (vacSubstitutionDet && vacSubstitutionDet.length > 0) {
      employeePositionIDs.push(..._.uniq(vacSubstitutionDet.map(el => el.employeePositionID)))
    }

    const calendarHoliday = await UB.Repository('hr_calendarHoliday').attrs(['dayHoliday', 'monthHoliday.code', 'yearHoliday', 'dateFrom', 'dateTo'])
      .where('yearHoliday', '>=', dateFrom.getFullYear(), 'yearFrom')
      .where('yearHoliday', '<=', dateTo.getFullYear(), 'yearTo')
      .where('yearHoliday', 'isNull', undefined, 'yearNull')
      .where('dateFrom', '<=', dateTo, 'dateFrom')
      .where('dateTo', '>=', dateFrom, 'dateTo')
      .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
      .where('dateTo', 'isNull', undefined, 'dateToIsNull')
      // condition by orgID {
      .where('excludeOrg', '=', 0, 'excOrg')
      .where('excludeOrg', '=', 1, 'inexcOrg')
      .exists(UB.Repository('hr_calendarHolidayDt')
        .correlation('calendarHolidayID', 'ID')
        .where('orgID', '=', order.organizationID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'org'
      ).notExists(UB.Repository('hr_calendarHolidayDt')
        .correlation('calendarHolidayID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notOrg')
      .notExists(UB.Repository('hr_calendarHolidayDt')
        .correlation('calendarHolidayID', 'ID')
        .where('orgID', '=', order.organizationID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'inorg'
      )
      // condition by orgID }
      .logic('(([yearFrom] and [yearTo]) or ([yearNull])) and (([dateFrom]) or [dateFromIsNull]) and (([dateTo]) or [dateToIsNull])' +
      ' AND (([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))' // condition by orgID
      )
      .selectAsObject()

    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.organizationID || appAC.globalOrganization()) === true
    const showTabNum = order.showTabNum // AC.settings.get('hrOrderTabNum', order.masterOrganizationID || order.organizationID) === true
    const groupVacEmp = AC.settings.get('hrOrderVacEmpGroup', order.masterOrganizationID || order.organizationID) === true
    const showArticle = AC.settings.get('hrEmpOrderMoveAbsentArticle', order.masterOrganizationID || order.organizationID) === true
    const experienceWithoutPeriod = AC.settings.get('hrOrderVacExpWithoutPeriod', order.masterOrganizationID || order.organizationID) === true

    let employeePosition = employeePositionIDs && employeePositionIDs.length > 0
      ? await HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Gen', 'Dat', 'Acc'], useSexType)
      : []
    employeePosition = employeePosition && employeePosition.length ? _.groupBy(employeePosition, 'ID') : []

    ids = _.compact(empOrder.map(el => el.employeeID))
    const employeeExperience = ids && ids.length > 0 ? await UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'employeeID', 'dictExperienceID.code', 'calcDate'])
      .where('dictExperienceID.code', '=', '6')
      .where('employeeID', 'in', ids)
      .selectAsObject() : []

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const params = {
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      emblem: HR.reportUtils.getEmblem(),
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      responsiblesInfo: respPosInfo,
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
      mainRespPos: printDocumentView === 'APPOINTMENT' && respPosInfo.length ? respPosInfo[0].respPos || '' : '',
      items: []
    }
    await HR.reportUtils.getOrderPrintConfig(params, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = params.normalFullName ? '' : '<b>'
    const boldFormatEnd = params.normalFullName ? '' : '</b>'

    let i = 1
    let titleName = ''
    const orderPersons = []
    empOrder.forEach(det => {
      det.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === det.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === det.employeePositionID : true))
        : true
      let item = orderDet.find(o => o.ID === det.ID)
      if (!item) {
        item = orderLongDet.find(o => o.ID === det.ID)
      }
      if (item && (item.used === undefined || !item.used)) {
        det.additonalDets = []
        _.merge(det, item || [])
        titleName = HR.reportUtils.formatShortNameInOrder(det['employeeID.genName'] || det['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })

        det.next = det.action === 'CANCEL' || det.action === 'TRANSFER'
          ? orderNextForCancelType.filter(item => item.entityParaID === det.grantVacationParaID)
          : orderNext.filter(item => item.entityParaID === det.ID)
        det.act = actDet.filter(item => item.paraID === det.ID)
        det.vac = vacSubstitutionDet.filter(item => item.paraID === det.ID)

        // Якщо в наказі є декілька пунктів про перенесення відпустки (одна і та сама) одному працівнику на підставі декількох лікарняного
        if (det.action === 'TRANSFER') {
          det.additonalDets = orderDet.filter(d => d.action === 'TRANSFER' && d.ID !== det.ID && d.employeePositionID === det.employeePositionID &&
              d.grantVacationParaID === det.grantVacationParaID && d.empOrderSicknessID)
          det.additonalDets.forEach(fltDet => {
            const detItem = orderDet.find(o => o.ID === fltDet.ID)
            detItem.used = true
            // det.next.push(...orderNextForCancelType.filter(item => item.entityParaID === fltDet.grantVacationParaID))
            det.act.push(...actDet.filter(item => item.paraID === fltDet.ID))
            det.vac.push(...vacSubstitutionDet.filter(item => item.paraID === fltDet.ID))
          })
        }

        det.next.forEach(next => {
          next.experience = ''
          if (next['dictVacationKindID.code'] === 'dState') {
            const empExperience = employeeExperience.find(o => o.employeeID === next.employeeID)
            if (experienceWithoutPeriod) {
              if (empExperience && empExperience.calcDate) {
                const ymd = AC.dateService.getYmd(empExperience.calcDate, next['empVacationPeriodID.dateFrom'] || next.dateFrom, true)
                next.experience = ` ${ymd.years}&nbsp;${AC.dateService.plural('рік_роки_років', ymd.years)}`
              } else {
                next.experience = UB.i18n('___ років')
              }
            }
            next.showPeriod = !experienceWithoutPeriod
          } else {
            next.showPeriod = true
          }
        })

        if (det.empOrderType === 'VACATIONPROLONG') {
          det.vacationInfo = det.next.map(el => {
            return UB.i18n(`частину {0}`, HR.nameCase.uncap(el['dictVacationKindID.nameGen'] || el['dictVacationKindID.name'] || '')) +
              (showArticle && el['dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + el['dictVacationKindID.byArticle'] : '') + (el.experience || '') +
              (det.action === 'TRANSFER' ? '' : UB.i18n(` тривалістю {0}&nbsp;{1}`, el.dayCount, AC.dateService.plural('календарний день_календарних дні_календарних днів', el.dayCount))) +
              (el.showPeriod ? UB.i18n(` за період роботи з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(el['empVacationPeriodID.dateFrom']), AC.dateService.formatDate(el['empVacationPeriodID.dateTo'])) : '')
          }).join(', ')
          det.vacationDates = AC.dateService.formatDate(det['grantVacationParaID.calcDateFrom'] || det['grantVacationParaID.dateFrom']) + '/' +
            AC.dateService.formatDate(det['grantVacationParaID.calcDateTo'] || det['grantVacationParaID.dateTo']) + '/' + (det['grantVacationParaID.calcDayCount'] || det['grantVacationParaID.dayCount'])
        } else {
          det.vacationInfo = ''
          det.vacationDates = '' + det.ID
        }
        orderPersons.push(det)
      }
    })

    const tasks = await HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, params.notUseMiddleNameInOrder)

    if (orderDet.length === 1 || orderLongDet.length === 1) {
      const orderItem = orderDet.length === 1 ? orderDet[0] : orderLongDet[0]

      if (!order.titleOrder && orderItem.empOrderType === 'VACATIONPROLONG') {
        order.titleOrder = orderItem.action === 'PROLONG'
          ? UB.i18n('Про надання відпустки')
          : orderItem.action === 'TRANSFER' ? UB.i18n('Про перенесення відпустки') : UB.i18n('Про скасування відпустки')
      }
    } else if (orderDet.length !== 0 || orderLongDet.length !== 0) {
      titleName = UB.i18n('працівникам')
    }
    params.titleOrder = (order.titleOrder || '') + `<br/>${titleName}`.replace(/&/g, '&nbsp;')

    const actingPosArray = {}
    for (let j = 0; j < orderPersons.length; j++) {
      const e = orderPersons[j]
      if (e.empOrderType === 'VACATIONPROLONGL' && e.isActingContinue) {
        if (e.positionID && AC.dateService.isValid(e['primeVacationParaID.dateTo']) && e.employeeNumberID) {
          actingPosArray[e.ID] = await UB.Repository('hr_employeePositionS') // не можу зрозуміти, чи викристовуються, тому поки не змінюю визначення назви посади (фактична назва)
            .attrs(['ID', 'workPlace', 'employeeID.datName', 'employeeID.fullFIO', 'employeeID.sexType',
              'positionID.fullNameDat', 'positionID.nameDat', 'positionID.fullName', 'employeeNumberID.tabNum',
              'positionID.isOrgBoss'])
            .where('employeeNumberID', '<>', e.employeeNumberID)
            .where('dateFrom', '<=', e['primeVacationParaID.dateTo'])
            .where('dateTo', '>=', e['primeVacationParaID.dateTo'])
            .where('positionID', '=', e.positionID)
            .where('employeeID.mi_deleteDate', '>=', '#maxdate')
            .where('positionID.state', '=', 'ACTIVE')
            .where('positionID.mi_dateFrom', '<=', e['primeVacationParaID.dateTo'])
            .where('positionID.mi_dateTo', '>=', e['primeVacationParaID.dateTo'])
            .where('positionID.mi_deleteDate', '>=', '#maxdate')
            .selectAsObject()
        }
      }
    }

    function makeOrderDet (firstEl, actingInfo, nameInfo) {
      const prolongObj = {
        toOrder: firstEl.toOrder,
        index: `${i++}. `,
        text: '',
        addText: [],
        actingInfo: [],
        vacSubInfo: [],
        reason: UB.i18n(`{0}`, firstEl.reasonDoc ? 'Підстава: ' + firstEl.reasonDoc : '')
      }

      if (actingInfo && actingInfo.length) {
        actingInfo[0].index = orderPersons.length > 1 || (tasks && tasks.tasks && tasks.tasks.length) ? '' : `${i++}. `
        prolongObj.actingInfo = actingInfo
      }

      const posInfo = HR.reportUtils.getInfoItemOrderInCase(firstEl, 'dat', true, params.notUseMiddleNameInOrder)
      const posName = posInfo.posName ? ', ' + posInfo.posName + orgGen : ''

      // const posName = HR.reportUtils.makePositionName(firstEl['employeePositionID.positionID.fullNameDat'] || firstEl['employeePositionID.positionID.nameDat'] || firstEl['employeePositionID.positionID.fullName'] || '', firstEl['employeePositionID.positionID.isOrgBoss'])
      // const empName = HR.reportUtils.formatFullNameInOrder(firstEl['employeeID.datName'] || firstEl['employeeID.fullFIO'], true)
      const tabNum = showTabNum && firstEl['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, firstEl['employeeNumberID.tabNum']) : ''
      if (firstEl.empOrderType === 'VACATIONPROLONG') {
        let sicknesDates = ''
        let dayCount = firstEl.dayCount || 0
        if (firstEl.additonalDets && firstEl.additonalDets.length) {
          sicknesDates = firstEl.additonalDets.map(d => {
            dayCount += d.dayCount || 0
            return UB.i18n(`з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(d['empOrderSicknessID.dateFrom']), AC.dateService.formatDate(d['empOrderSicknessID.dateTo']))
          }).join(', ')
        }
        const sicknes = firstEl.empOrderSicknessID || firstEl.causeVacationParaID
          ? UB.i18n(', у зв’язку з') + (firstEl.empOrderSicknessID ? UB.i18n(' тимчасовою непрацездатністю працівника з&nbsp;{0} по&nbsp;{1}', AC.dateService.formatDate(firstEl['empOrderSicknessID.dateFrom']), AC.dateService.formatDate(firstEl['empOrderSicknessID.dateTo'])) + (sicknesDates ? ', ' + sicknesDates : '') : '') +
          (firstEl.causeVacationParaID ? UB.i18n(` виходом під час відпустки працівника у {0} відпустку з&nbsp;{1} по&nbsp;{2}`, HR.nameCase.uncap(firstEl['causeVacationParaID.dictVacationKindID.nameAcc'] || firstEl['causeVacationParaID.dictVacationKindID.name'] || ''), AC.dateService.formatDate(firstEl['causeVacationParaID.dateFrom']), AC.dateService.formatDate(firstEl['causeVacationParaID.dateTo'])) : '')
          : ''
        if (firstEl.empOrderSicknessID && firstEl.reason === 'у зв’язку з тимчасовою непрацездатністю працівника під час відпустки') {
          firstEl.reason = ''
        }
        const reason = firstEl.reason ? ', ' + firstEl.reason : ''

        const info = firstEl.vacationInfo
        /*
        const info =  firstEl.next.map(el => {
          return UB.i18n(`частину {0}`, HR.nameCase.uncap(el['dictVacationKindID.nameGen'] || el['dictVacationKindID.name'] || '')) +
            (showArticle && el['dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + el['dictVacationKindID.byArticle'] : '') + (el.experience || '') +
            (firstEl.action === 'TRANSFER' ? '' : UB.i18n(` тривалістю {0}&nbsp;{1}`, el.dayCount, AC.dateService.plural('календарний день_календарних дні_календарних днів', el.dayCount))) +
            (el.showPeriod ? UB.i18n(` за період роботи з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(el['empVacationPeriodID.dateFrom']), AC.dateService.formatDate(el['empVacationPeriodID.dateTo'])) : '')
        }).join(', ')
        */

        firstEl.dateTo = firstEl.calcDateTo || firstEl.dateTo
        const periodInfo = firstEl.action === 'PROLONG'
          ? (AC.dateService.dateDiff(firstEl.dateFrom, firstEl.dateTo)
            ? UB.i18n(` з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(firstEl.dateFrom), AC.dateService.formatDate(firstEl.dateTo))
            : UB.i18n(` на&nbsp;{0}`, AC.dateService.formatDate(firstEl.dateFrom))) +
          (firstEl['primeVacationParaID.dictVacationKindID.dayAccumCondition'] === 'noHolidays' ? me.getHolidaysInfo(calendarHoliday, firstEl.dateFrom, firstEl.dateTo) : '')
          : ''

        if (firstEl.action === 'PROLONG') {
          let orderWord = UB.i18n('Надати')
          orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
          prolongObj.text += orderWord + ` ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName ? posName + ',' : ''} ` +
            periodInfo +
            UB.i18n(' невикористану') + sicknes + (info.length ? ', ' + info : '') +
            (nameInfo.length ? ', ' + nameInfo.join('') : '') +
            reason + '.'
        } else if (firstEl.action === 'TRANSFER') {
          let orderWord = UB.i18n('Перенести')
          orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
          prolongObj.text += orderWord + ` ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName ? posName + ',' : ''} ` + info +
            UB.i18n(` тривалістю {0}&nbsp;{1}`, dayCount, AC.dateService.plural('календарний день_календарних дні_календарних днів', dayCount)) +
            (nameInfo.length ? ', ' + nameInfo.join('') : '') +
            UB.i18n(' на інший період, що буде погоджений з керівництвом додатково') + sicknes + reason + '.'
        } else {
          let orderWord = UB.i18n('Скасувати')
          orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
          prolongObj.text += orderWord + ' ' + (firstEl['grantVacationParaID.orderID.description'] ? firstEl['grantVacationParaID.orderID.description'] : UB.i18n('наказ')) +
            UB.i18n(' в частині надання') + ` ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName ? posName + ',' : ''} ` + info + reason + '.'
        }
      } else {
        const vacAcc = HR.nameCase.uncap(firstEl['primeVacationParaID.dictVacationKindID.nameAcc'] || firstEl['primeVacationParaID.dictVacationKindID.name'] || '') +
          (showArticle && firstEl['primeVacationParaID.dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + firstEl['primeVacationParaID.dictVacationKindID.byArticle'] : '')
        const vacLoc = HR.nameCase.uncap(firstEl['primeVacationParaID.dictVacationKindID.nameLoc'] || firstEl['primeVacationParaID.dictVacationKindID.name'] || '') +
          (showArticle && firstEl['primeVacationParaID.dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + firstEl['primeVacationParaID.dictVacationKindID.byArticle'] : '')

        prolongObj.vacSubInfo = firstEl.vac.length ? me.makeVacSubstitution(orderPersons.length > 1 || (tasks && tasks.tasks && tasks.tasks.length) ? 0 : i++, firstEl.vac, vacLoc, firstEl['employeeID.genName'] || firstEl['employeeID.fullFIO'], firstEl['employeeID.accusativeName'] || firstEl['employeeID.fullFIO'],
          (showTabNum && firstEl['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, firstEl['employeeNumberID.tabNum']) : ''), firstEl['employeeID.sexType'],
          HR.reportUtils.makePositionName(firstEl['employeePositionID.positionID.fullNameGen'] || firstEl['employeePositionID.positionID.name'], firstEl['employeePositionID.positionID.isOrgBoss']),
          employeePosition, firstEl.dateFrom, firstEl.dateTo, firstEl['positionID.positionType'] === '1', showTabNum, orgGen, params.notUseMiddleNameInOrder) : []

        const info = (AC.dateService.dateDiff(firstEl.dateFrom, firstEl.dateTo) ? UB.i18n(` з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(firstEl.dateFrom), AC.dateService.formatDate(firstEl.dateTo)) : UB.i18n(` на&nbsp;{0}`, AC.dateService.formatDate(firstEl.dateFrom))) +
          (firstEl['primeVacationParaID.dictVacationKindID.dayAccumCondition'] === 'noHolidays' ? me.getHolidaysInfo(calendarHoliday, firstEl.dateFrom, firstEl.dateTo) : '')

        let orderWord = UB.i18n('Продовжити')
        orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()
        prolongObj.text += `${orderWord} ${boldFormatBegin}${posInfo.empName}${tabNum ? ' ' + boldFormatEnd + tabNum : boldFormatEnd}${posName}${nameInfo.length ? nameInfo.join('') : ''} ${vacAcc}${info}.`
        const actingPos = actingPosArray[firstEl.ID]
        if (actingPos && actingPos.length) {
          const empNameGen = HR.reportUtils.formatShortNameInOrder(firstEl['employeeID.genName'] || firstEl['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })
          const vacLoc = HR.nameCase.uncap(firstEl['primeVacationParaID.dictVacationKindID.nameLoc'] || firstEl['primeVacationParaID.dictVacationKindID.name'] || '')
          prolongObj.addText = actingPos.map(pos => {
            const empName = HR.reportUtils.formatFullNameInOrder(pos['employeeID.datName'] || pos['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })
            const posName = HR.reportUtils.makePositionName(pos['positionID.fullNameDat'] || pos['positionID.nameDat'] || pos['positionID.fullName'] || '', pos['positionID.isOrgBoss'])
            const tNum = showTabNum && pos['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, pos['employeeNumberID.tabNum']) : ''
            const positionType = firstEl['positionID.positionType'] ? UB.i18n('державного службовця') : UB.i18n('працівника')
            const sexType = firstEl['employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його')

            return {
              text: UB.i18n('{0}. {10} {1}{2}{3} термін перебування на цій посаді на період перебування основного ' +
                '{4} {5}{6} у {7} з&nbsp;{8} до дня {9} фактичного виходу з цієї відпустки.',
              i++, boldFormatBegin + empName, tNum ? ' ' + boldFormatEnd + tNum : boldFormatEnd, posName ? ', ' + posName + orgGen + ',' : '',
              positionType, empNameGen, tabNum ? ' ' + tabNum : '', vacLoc, AC.dateService.formatDate(firstEl.dateFrom), sexType,
              orderWord)
            }
          })
        }
      }
      if (i === 2 && orderPersons.length === 1 && (!tasks || !tasks.tasks || tasks.tasks.length === 0)) {
        prolongObj.index = ''
      }
      params.items.push(prolongObj)
    }

    const grpOrderPersons = groupVacEmp
      ? _.groupBy(orderPersons, item => { return item.action + '/' + item.employeeID })
      : _.groupBy(orderPersons, 'ID')

    _.forEach(grpOrderPersons, personsByEmployee => {
      personsByEmployee = _.sortBy(personsByEmployee, 'employeePositionID.workPlace')
      const grpByVacationInfo = groupVacEmp
        ? _.groupBy(personsByEmployee, 'vacationDates')
        : _.groupBy(personsByEmployee, 'ID')

      _.forEach(grpByVacationInfo, persons => {
        let firstEl = persons.length === 1 ? persons[0] : persons.find(item => item['employeePositionID.workPlace'] === '1')
        if (!firstEl) {
          firstEl = persons.find(item => item['employeePositionID.workPlace'] === '2')
          if (!firstEl) {
            firstEl = persons.find(item => item['employeePositionID.workPlace'] === '3')
            if (!firstEl) {
              firstEl = persons.find(item => item['employeePositionID.workPlace'] === '9')
            }
          }
        }
        if (firstEl.action === 'CANCEL') {
          const personActingInfo = firstEl.act.length ? me.makeActing(firstEl.act, firstEl['employeeID.genName'] || firstEl['employeeID.fullFIO'], (showTabNum && firstEl['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, firstEl['employeeNumberID.tabNum']) : ''),
            HR.reportUtils.makePositionName(firstEl['employeePositionID.positionID.fullNameGen'] || firstEl['employeePositionID.positionID.name'], firstEl['employeePositionID.positionID.isOrgBoss']),
            employeePosition, firstEl.dateFrom, firstEl.dateTo, firstEl['positionID.positionType'] === '1', showTabNum, orgGen, params.notUseMiddleNameInOrder) : []
          makeOrderDet(firstEl, personActingInfo, '')
          _.forEach(persons, e => {
            if (e.ID !== firstEl.ID) {
              const personActingInfo = e.act.length ? me.makeActing(e.act, e['employeeID.genName'] || e['employeeID.fullFIO'], (showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''),
                HR.reportUtils.makePositionName(e['employeePositionID.positionID.fullNameGen'] || e['employeePositionID.positionID.name'], e['employeePositionID.positionID.isOrgBoss']),
                employeePosition, e.dateFrom, e.dateTo, e['positionID.positionType'] === '1', showTabNum, orgGen, params.notUseMiddleNameInOrder) : []
              makeOrderDet(e, personActingInfo, '')
            }
          })
        } else {
          const actingInfo = []
          const nameInfo = []
          _.forEach(persons, e => {
            const personActingInfo = e.act.length ? me.makeActing(e.act, e['employeeID.genName'] || e['employeeID.fullFIO'], (showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''),
              HR.reportUtils.makePositionName(e['employeePositionID.positionID.fullNameGen'] || e['employeePositionID.positionID.name'], e['employeePositionID.positionID.isOrgBoss']),
              employeePosition, e.dateFrom, e.dateTo, e['positionID.positionType'] === '1', showTabNum, orgGen, params.notUseMiddleNameInOrder) : []
            if (personActingInfo.length) {
            // index += /* persons.length */ !(lenOrderPersons === 1 || lenOrderPersons === persons.length) ? 0 : personActingInfo.length
              actingInfo.push(...personActingInfo)
            }
            if (e.ID !== firstEl.ID) {
              const posInfoDat = HR.reportUtils.getInfoItemOrderInCase(e, 'dat', true, params.notUseMiddleNameInOrder)
              // const psName = HR.reportUtils.makePositionName(e['employeePositionID.positionID.fullNameDat'] || e['employeePositionID.positionID.nameDat'] || e['employeePositionID.positionID.fullName'] || '', e['employeePositionID.positionID.isOrgBoss'])
              const tbNum = showTabNum && e['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, e['employeeNumberID.tabNum']) : ''
              const days = e.action === 'TRANSFER' ? UB.i18n(` тривалістю {0}&nbsp;{1}`, e.dayCount || 0, AC.dateService.plural('календарний день_календарних дні_календарних днів', e.dayCount || 0)) : ''
              let text = tbNum
              text += posInfoDat.posName ? (text ? ', ' : '') + posInfoDat.posName + orgGen + (e.vacationInfo || days ? ', ' : '') : ''
              text += e.vacationInfo ? ' ' + e.vacationInfo : ''
              text += days
              nameInfo.push(text)
              // nameInfo.push(`, ${tbNum}${tbNum && psName ? ', ' : ''}${psName ? psName + orgGen + ',' : ''}${e.vacationInfo ? ' ' + e.vacationInfo : ''}${days}`)
            }
          })
          makeOrderDet(firstEl, actingInfo, nameInfo)
        }
      })
    })
    if (params.items.length === 1 && !params.items[0].actingInfo && !params.items[0].vacSubInfo && (!tasks || !tasks.tasks || !tasks.tasks.length)) {
      params.items[0].index = ''
    }
    params.items = params.items.filter(el => el.toOrder)

    params.tasks = tasks.tasks.map(e => ({
      task: `${i === 1 && tasks.tasks.length === 1 ? '' : i++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return AC.reportService.removeEmptyValues(params)
  },

  makeActing: function (act, fio, tabNum, positionName, employeePosition, dateFrom, dateTo, positionType, showTabNum, orgGen, notUseMiddleNameInOrder) {
    const me = this
    const items = []
    act.forEach((el, index) => {
      let posName = ''
      const positionTypeAct = el['positionID.positionType'] === '1'

      if (employeePosition[el.employeePositionID]) {
        const posInfo = HR.reportUtils.getInfoItemOrderInCase(employeePosition[el.employeePositionID][0], 'acc', false, notUseMiddleNameInOrder, '')
        posName = posInfo.posName || ''
        /*
        posName = HR.reportUtils.makePositionName(employeePosition[el.employeePositionID][0]['positionID.fullNameAcc'] ||
            employeePosition[el.employeePositionID][0]['positionID.nameAcc'] ||
            employeePosition[el.employeePositionID][0]['positionID.name'] || '', employeePosition[el.employeePositionID][0]['positionID.isOrgBoss'])
        */
      }
      let str = UB.i18n(` - виконання обов'язків {0}{1} `, positionName || '____________________', orgGen)
      const condition = el.condition ? `${el.condition} ` : ''
      const dateTo = !condition.length && el.dateTo && AC.dateService.dateDiff(el.dateFrom, el.dateTo) ? UB.i18n(`по&nbsp;{0} `, AC.dateService.formatDate(el.dateTo)) : ''
      const dateFrom = el.dateFrom ? UB.i18n(`{0}&nbsp;{1} `, !condition.length && !dateTo.length && el.dateTo ? 'на' : 'з', AC.dateService.formatDate(el.dateFrom)) : ''
      str += `${dateFrom}${dateTo}${condition}`
      str += UB.i18n(`покласти на {0}`, HR.reportUtils.formatShortNameInOrder(el['employeeID.accusativeName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder }))
      str += showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''
      str += posName ? `, ${posName}${orgGen}` : ''
      str += (el.payForExtraLoad || index !== act.length - 1 ? ';' : '.')
      items.push({ value: str })
      if (el.payForExtraLoad || (el['payElID.calcAlgorithm'] && el['payElID.calcAlgorithm'] === '1')) {
        items.push({ value: UB.i18n(` - встановити {0}`, HR.reportUtils.formatShortNameInOrder(el['employeeID.datName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder })) +
              (showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : '') +
              UB.i18n(` виплату за додаткове навантаження у зв’язку з виконанням обов’язків тимчасово відсутнього {0} `, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника')) +
              me.getExtraLoadInfo(el.payForExtraLoad, el['payElID.calcAlgorithm'], positionTypeAct, positionType, index !== act.length - 1 ? ';' : '.')
        })
      }
    })

    fio = HR.reportUtils.formatShortNameInOrder(fio, { notUseMiddleNameInOrder }) + tabNum
    return items.length ? [{
      index: '', // i ? `${i}. ` : '',
      value: (items.length === 1 ? UB.i18n(`На період відпустки {0}{1}`, fio, items[0].value.replace(' -', '')) : UB.i18n(`На період відпустки {0}:`, fio)),
      items: (items.length > 1 ? items : [])
    }] : []
  },

  makeVacSubstitution: function (i, vacSub, vacNameLoc, fioGen, fioAcc, tabNum, sexType, positionName, employeePosition, dateFrom, dateTo, positionType, showTabNum, orgGen, notUseMiddleNameInOrder) {
    const items = []
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

      let str = `${HR.reportUtils.formatShortNameInOrder(el['employeePositionID.employeeID.datName'] || el['employeePositionID.employeeID.fullFIO'], { notUseMiddleNameInOrder, separator: '&nbsp;' })}`
      str += showTabNum && el['employeePositionID.employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, el['employeePositionID.employeeNumberID.tabNum']) : ''
      str += posName ? `, ${posName}${orgGen}` : ''
      items.push(str)
    })

    fioGen = HR.reportUtils.formatShortNameInOrder(fioGen, { notUseMiddleNameInOrder, separator: '&nbsp;' }) + tabNum
    sexType = sexType === 'W' ? UB.i18n('її') : UB.i18n('його')
    return {
      index: i ? `${i}. ` : '',
      value: UB.i18n('ПРОДОВЖИТИ {0}, термін перебування на цій посаді на період перебування основного працівника {1} у {2} з&nbsp;{3} до дня {4} фактичного виходу з цієї відпустки.',
        items.join(', '), fioGen, vacNameLoc, AC.dateService.formatDate(dateFrom), sexType)
    }
  },

  getExtraLoadInfo: function (payForExtraLoad, calcAlgorithm, positionTypeAct, positionType, end) {
    if (calcAlgorithm === '3') {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу {1}, який заміщує{2}`, payForExtraLoad, positionTypeAct ? UB.i18n('державного службовця') : UB.i18n('працівника'), end)
    } else if (calcAlgorithm === '1') {
      return UB.i18n(`у розмірі різниці заробітку відсутнього і заміщаючого працівників{0}`, end)
    } else {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу тимчасово відсутнього {1}{2}`, payForExtraLoad, positionType ? UB.i18n('державного службовця') : UB.i18n('працівника'), end)
    }
  },

  getHolidaysInfo: function (calendarHoliday, dateFrom, dateTo) {
    function includes (arr, dt) {
      let res = false
      if (arr && arr.length) {
        res = !!arr.find(item => { return item.getTime() === dt.getTime() })
      }
      return res
    }

    const result = []
    if (!calendarHoliday || calendarHoliday.length === 0 || !dateFrom || !dateTo || dateFrom > dateTo) {
      return ''
    }
    calendarHoliday.forEach(holiday => {
      holiday.dateFrom = (holiday.dateFrom && AC.dateService.shiftDate(holiday.dateFrom)) || AC.dateService.minDate()
      holiday.dateTo = (holiday.dateTo && AC.dateService.shiftDate(holiday.dateTo)) || AC.dateService.maxDate()
      if (holiday.yearHoliday) {
        const date = AC.dateService.shiftDate(new Date(holiday.yearHoliday, holiday['monthHoliday.code'] - 1, holiday.dayHoliday))
        if ((dateFrom <= date) && (dateTo >= date) && !includes(result, date) && holiday.dateFrom <= date && date <= holiday.dateTo) {
          result.push(date)
        }
      } else {
        let dt = AC.dateService.shiftDate(new Date(dateFrom.getFullYear(), holiday['monthHoliday.code'] - 1, holiday.dayHoliday))
        while (dt <= dateTo) {
          if ((dateFrom <= dt) && (dateTo >= dt) && !includes(result, dt) && holiday.dateFrom <= dt && dt <= holiday.dateTo) {
            result.push(dt)
          }
          dt = AC.dateService.addYears(dt, 1)
        }
      }
    })

    result.sort((date1, date2) => {
      if (date1 < date2) {
        return -1
      }
      if (date1 > date2) {
        return 1
      }

      return 0
    })
    return result.length > 0 ? UB.i18n(' (не враховуючи ') + result.map(item => AC.dateService.getStringFormatDate(item, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;')).join(', ') + (result.length === 1 ? UB.i18n(' - святковий день) ') : UB.i18n(' - святкові дні)')) : ''
  }
}
