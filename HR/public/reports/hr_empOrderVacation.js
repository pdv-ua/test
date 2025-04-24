/* global UB  AC HR _ appAC */
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
          const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['MATERIALTRANSFER', 'TASK', 'VACATION', 'VACATIONLONG']]] : [['empOrderType', 'in', ['VACATION', 'VACATIONLONG']]]
          const documentView = AC.settings.get('hrEmpOrderPrintType', order.masterOrganizationID || order.organizationID)
          const printDocumentView = documentView === order.documentOrderType ? documentView : order.documentOrderType
          const configObj = { printDocumentView }
          return Promise.all([
            HR.reportUtils.getOrderPrintConfig(configObj, order.subOrganization ? order.masterOrganizationID : order.organizationID),
            HR.reportUtils.getEmpOrderDet(reportParams.instanceID, onDate, ['departmentID', 'positionID.positionType'], whereArray, true),
            UB.Repository('hr_empOrderVacationDet')
              .attrs(['ID', 'isRst', 'dateFrom', 'dateTo', 'dayCount', 'reason', 'reasonDoc', 'employeeID.fullFIO', 'employeeID.datName',
                'isMoneyHelp', 'positionID.positionType', 'calcDateTo', 'calcDayCount', 'moneyHelpPayElID.calcAvgType'])
              .where('orderID', '=', reportParams.instanceID)
              .selectAsObject(),
            UB.Repository('hr_empOrderVacationlongDet')
              .attrs(['ID', 'dateFrom', 'dateTo', 'dayCount', 'reason', 'reasonDoc', 'employeeID.fullFIO', 'employeeID.datName',
                'employeeID.genName', 'dictVacationKindID.nameAcc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
                'dictVacationKindID.byArticle', 'isTempVacancy'])
              .orderBy('dateFrom', 'asc')
              .orderBy('dateTo', 'asc')
              .where('orderID', '=', reportParams.instanceID)
              .selectAsObject(),
            UB.Repository('hr_empOrderVacationListDet')
              .attrs(['ID', 'itemIdx', 'entityParaID', 'dictVacationKindID.isRst', 'dictVacationKindID.name', 'dayCount',
                'empVacationPeriodID.dayCountPlan', 'dateFrom', 'dateTo', 'empVacationPeriodID.description',
                'empVacationPeriodID.dateFrom', 'empVacationPeriodID.dateTo', 'dictVacationKindID.nameAcc', 'dictVacationKindID.byArticle',
                'isPart', 'dictVacationKindID.nameGen', 'dictVacationKindID.isDay', 'dictVacationKindID.code', 'employeeID',
                'dictVacationKindID.dayAccumCondition', 'dictVacationKindID.vactAccum', 'empVacationPeriodID.fromOrgID'])
              .where('orderID', '=', reportParams.instanceID)
              .orderBy('dateFrom', 'asc')
              .orderBy('dateTo', 'asc')
              .selectAsObject(),
            UB.Repository('hr_empOrderAcc')
              .attrs(['payElID.name', 'qtty', 'accrualSum', 'empOrderDetID'])
              .where('empOrderID', '=', reportParams.instanceID)
              .selectAsObject(),
            HR.reportUtils.getResponsiblesForOrder(order, printDocumentView === 'APPOINTMENT'),
            HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID),
            UB.Repository('hr_empOrderActingDet')
              .attrs(['ID', 'paraID', 'dateFrom', 'dateTo', 'employeeID.fullFIO', 'employeeID', 'employeeID.accusativeName',
                'employeeID.genName', 'employeeID.datName', 'employeeID.shortFIO', 'employeePositionID', 'payForExtraLoad',
                'payElID.calcAlgorithm', 'positionID.positionType', 'employeeNumberID.tabNum'])
              .where('orderID', '=', reportParams.instanceID)
              .selectAsObject(),
            UB.Repository('hr_empOrderMaterialtransferDet')
              .attrs(['ID', 'employeePositionID', 'employeePositionID.employeeID', 'employeePositionID.employeeID.genName', 'employeePositionID.employeeID.fullFIO',
                'toEmployeePositionID.employeeID', 'toEmployeePositionID.employeeID.datName', 'toEmployeePositionID.employeeID.fullFIO', 'toEmployeePositionID',
                'employeeNumberID.tabNum', 'toEmployeePositionID.employeeNumberID.tabNum', 'departmentID'])
              .where('orderID', '=', reportParams.instanceID)
              .selectAsObject(),
            UB.Repository('hr_commission')
              .attrs(['orderDetID', 'employeePositionID.employeeID', 'employeePositionID.employeeID.fullFIO', 'memberType.name', 'employeePositionID.employeeNumberID.tabNum'])
              .where('orderID', '=', reportParams.instanceID)
              .where('memberType.mi_deleteDate', '>=', '#maxdate')
              .orderBy('memberType')
              .orderBy('lineNum')
              .selectAsObject(),
            UB.Repository('hr_empMilitaryRanks')
              .attrs(['ID', 'employeeID', 'dictMilitaryRankID.name', 'dictMilitaryRankID.datName', 'orderDate'])
              .where('dictMilitaryRankID', 'isNotNull')
              .exists(UB.Repository('hr_empOrderDet')
                .correlation('employeeID', 'employeeID')
                .where('orderID', '=', reportParams.instanceID)
              )
              .selectAsObject(),
            printDocumentView
          ]).then(([configObj, empOrder, orderDet, orderLongDet, orderNext, orderAcc, orderResp, city, actDet, matTransfer, commission, empMilitaryRanks, printDocumentView]) => {
            // const employeeIDIDs = empOrder && empOrder.length > 0 ? _.uniq(empOrder.map(el => el.employeeID)) : []
            const employeePositionIDs = actDet && actDet.length > 0 ? _.uniq(actDet.map(el => el.employeePositionID)) : []
            employeePositionIDs.push(...matTransfer && matTransfer.length > 0 ? _.uniq(matTransfer.map(el => el.toEmployeePositionID)) : [])
            employeePositionIDs.push(...matTransfer && matTransfer.length > 0 ? _.uniq(matTransfer.map(el => el.employeePositionID)) : [])
            const flt = orderNext && orderNext.length > 0 ? orderNext.filter(item => item['dictVacationKindID.code'] === 'dState') : []
            const ids = flt && flt.length > 0 ? flt.map(el => el.employeeID) : []
            const dateFrom = orderNext && orderNext.length > 0 ? _.min(orderNext.map(item => item.dateFrom)) || AC.dateService.todayDate() : AC.dateService.todayDate()
            const dateTo = orderNext && orderNext.length > 0 ? _.max(orderNext.map(item => item.dateTo)) || AC.dateService.todayDate() : AC.dateService.todayDate()
            const depIds = _.compact(_.uniq(empOrder.map(item => item['employeePositionID.departmentID'])))
            const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true
            return Promise.all([
              HR.reportUtils.getTask(reportParams.instanceID, order.orderDate || order.entryDate, order.showTabNum, configObj.notUseMiddleNameInOrder),
              UB.Repository('hr_employeeExperience').attrs(['ID', 'employeeID', 'dictExperienceID.code', 'calcDate'])
                .where('dictExperienceID.code', '=', '6')
                .whereIf(ids && ids.length > 0, 'employeeID', 'in', ids)
                .whereIf(!ids && ids.length === 0, 'employeeID', '=', 0)
                .selectAsObject(),
              UB.Repository('hr_calendarHoliday').attrs(['dayHoliday', 'monthHoliday.code', 'yearHoliday', 'dateFrom', 'dateTo'])
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
                  .where('orgID', '=', order.masterOrganizationID || order.organizationID)
                  .where('mi_deleteDate', '>=', '#maxdate'),
                'org'
                ).notExists(UB.Repository('hr_calendarHolidayDt')
                  .correlation('calendarHolidayID', 'ID')
                  .where('mi_deleteDate', '>=', '#maxdate'),
                'notOrg')
                .notExists(UB.Repository('hr_calendarHolidayDt')
                  .correlation('calendarHolidayID', 'ID')
                  .where('orgID', '=', order.masterOrganizationID || order.organizationID)
                  .where('mi_deleteDate', '>=', '#maxdate'),
                'inorg'
                )
                // condition by orgID }
                .logic('(([yearFrom] and [yearTo]) or ([yearNull])) and (([dateFrom]) or [dateFromIsNull]) and (([dateTo]) or [dateToIsNull])' +
                ' AND (([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))' // condition by orgID
                )
                .selectAsObject(),
              HR.reportUtils.getPromiseEmployeePositionForOrders(employeePositionIDs, order.masterOrganizationID || order.organizationID, order.organizationID, order.orderDate || order.entryDate, ['Nom', 'Gen', 'Dat', 'Acc'], useSexType),
              HR.reportUtils.getDepartmentStructName(depIds, order.organizationID, order.orderDate || order.entryDate)
            ]).then(([task, employeeExperience, calendarHoliday, employeePosition, departments]) => ({
              empOrder,
              orderDet,
              orderLongDet,
              orderNext,
              task,
              orderAcc,
              orderResp,
              city,
              actDet,
              matTransfer,
              commission,
              order,
              employeeExperience,
              calendarHoliday,
              employeePosition,
              orderExtract,
              empMilitaryRanks,
              departments,
              printDocumentView,
              configObj
            }))
          })
        })
      })
  },

  getParams: async function (data) {
    const me = this
    let orderPersons = []
    let showTabNum = data.order.showTabNum // AC.settings.get('hrOrderTabNum', data.order.masterOrganizationID || data.order.organizationID) === true
    const groupVacEmp = AC.settings.get('hrOrderVacEmpGroup', data.order.masterOrganizationID || data.order.organizationID) === true
    const showArticle = AC.settings.get('hrEmpOrderMoveAbsentArticle', data.order.masterOrganizationID || data.order.organizationID) === true
    const experienceWithoutPeriod = AC.settings.get('hrOrderVacExpWithoutPeriod', data.order.masterOrganizationID || data.order.organizationID) === true

    await HR.reportUtils.checkEmployeeChange(data.order.orderDate, ['fullFIO', 'accusativeName', 'genName', 'datName', 'shortFIO'], data.actDet)
    await HR.reportUtils.checkEmployeeChange(data.order.orderDate, ['fullFIO', 'genName'], data.matTransfer, undefined, 'employeePositionID.employeeID')
    await HR.reportUtils.checkEmployeeChange(data.order.orderDate, ['fullFIO', 'datName'], data.matTransfer, undefined, 'toEmployeePositionID.employeeID')
    await HR.reportUtils.checkEmployeeChange(data.order.orderDate, ['fullFIO'], data.commission, undefined, 'employeePositionID.employeeID')

    data.empMilitaryRanks = _.groupBy(data.empMilitaryRanks, 'employeeID')
    data.employeePosition = data.employeePosition && data.employeePosition.length > 0 ? _.groupBy(data.employeePosition, 'ID') : []
    data.empOrder.forEach(item => {
      let det = data.orderDet.find(o => o.ID === item.ID)
      if (!det) {
        det = data.orderLongDet.find(o => o.ID === item.ID)
      }
      if (det) {
        _.merge(det, item)
        det.toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
        det['employeePositionID.workPlace'] = det['employeePositionID.workPlace'] || '9'
        det.depID = 0
        det.depIdxNum = ''
        det.depName = ''

        if (data.order.sortItems === 'STAFF') {
          const fEl = det['employeePositionID.workPlace'] === '1' ? det : data.empOrder.find(item => item['employeePositionID.workPlace'] === '1' && item.employeeID === det.employeeID) || det
          if (fEl['employeePositionID.departmentID'] !== data.order.organizationID && fEl['employeePositionID.departmentID'] !== data.order.masterOrganizationID) {
            det.depID = fEl['employeePositionID.departmentID']
            det.depIdxNum = fEl['employeePositionID.departmentID.idxNum'] || ''
            det.depName = fEl['employeePositionID.departmentID.name'] || ''
          }
        } else {
          det.depID = det['employeePositionID.departmentID'] || 0
        }

        det['structID'] = ''
        det['structName'] = ''
        if (data.order.sortItems === 'STAFF') {
          const fEl = det['employeePositionID.workPlace'] === '1' ? det : data.empOrder.find(el => el['employeePositionID.workPlace'] === '1' && el.employeeID === det.employeeID) || det
          if (fEl['employeePositionID.departmentID'] && data.departments[fEl['employeePositionID.departmentID']]) {
            det['structID'] = data.departments[fEl['employeePositionID.departmentID']].treePath
            det['structName'] = data.departments[fEl['employeePositionID.departmentID']].name
          }
        }

        det.next = []
        det.acc = []
        det.act = []
        data.orderNext.forEach(next => {
          if (next.entityParaID === det.ID) {
            next.experience = ''
            if (next['dictVacationKindID.code'] === 'dState') {
              const empExperience = data.employeeExperience.find(o => o.employeeID === next.employeeID)
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
            det.next.push(next)
          }
        })
        data.orderAcc.forEach(acc => {
          if (acc.empOrderDetID === det.ID) {
            det.acc.push(acc)
          }
        })
        data.actDet.forEach(act => {
          if (act.paraID === det.ID) {
            det.act.push(act)
          }
        })
        orderPersons.push(det)
      }
    })

    const lenOrderPersons = orderPersons.length

    let titleName
    if ((data.orderDet.length + data.orderLongDet.length) === 1) {
      if ((data.orderDet.length === 1 ? data.orderDet[0]['employeePositionID.positionID.positionType'] : data.orderLongDet[0]['employeePositionID.positionID.positionType']) !== '4') {
        titleName = data.orderDet.length === 1
          ? HR.reportUtils.formatShortNameInOrder(data.orderDet[0]['employeeID.datName'] || data.orderDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
          : HR.reportUtils.formatShortNameInOrder(data.orderLongDet[0]['employeeID.datName'] || data.orderLongDet[0]['employeeID.fullFIO'], { notUseMiddleNameInOrder: data.configObj.notUseMiddleNameInOrder })
      }
    } else if (data.orderDet.length !== 0 || data.orderLongDet.length !== 0) {
      titleName = UB.i18n('працівникам')
    }

    if (data.order.sortItems === 'STAFF') {
      orderPersons = _.sortBy(orderPersons, 'structID')
    }

    const detailGroup = data.order.sortItems === 'STAFF'
      ? _.groupBy(orderPersons, item => item.depID)
      : data.order.sortItems === 'ORDER'
        ? _.groupBy(data.empOrder.filter(item => data.orderDet.find(o => o.ID === item.ID) || data.orderLongDet.find(o => o.ID === item.ID) || data.task.tasks.find(o => o.ID === item.ID) || data.matTransfer.find(o => o.ID === item.ID)), 'ID')
        : _.groupBy(orderPersons, 'null')

    data.matTransfer = data.matTransfer && data.matTransfer.length ? _.groupBy(data.matTransfer, item => {
      return data.empOrder.find(el => data.order.sortItems !== 'ORDER' && el.employeePositionID === item.employeePositionID) ? item.employeePositionID : 0
    }) : []

    const params = {
      printDocumentView: data.printDocumentView,
      titleOrderParams: data.printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
      orderType: data.printDocumentView === 'APPOINTMENT'
        ? UB.i18n('РОЗПОРЯДЖЕННЯ')
        : data.orderExtract && data.orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З'),
      emblem: HR.reportUtils.getEmblem(),
      titleOrder: `${data.order.titleOrder || ''}${data.order.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`.replace(/&/g, '&nbsp;'),
      preamble: (data.order.preamble || '').replace(/&/g, '&nbsp;'),
      data: [],
      orderIndex: data.order['dictEmpOrderIndexID.code'] === null ? '' : `/${data.order['dictEmpOrderIndexID.code']}`,
      responsiblesInfo: data.orderResp,
      recpart: data.recpart,
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
      mainRespPos: data.printDocumentView === 'APPOINTMENT' && data.orderResp.length ? data.orderResp[0].respPos || '' : ''
    }
    HR.reportUtils.copyToParams(params, data.configObj)
    const orgGen = data.order.subOrganization && (data.order['organizationID.nameGen'] || data.order['organizationID.name'])
      ? ' ' + (data.order['organizationID.nameGen'] || data.order['organizationID.name']) : ''
    const boldFormatBegin = params.normalFullName ? '' : '<b>'
    const boldFormatEnd = params.normalFullName ? '' : '</b>'
    let orderWord = UB.i18n('Надати')
    orderWord = params.smallOrderWord ? orderWord : orderWord.toUpperCase()

    let index = 1
    const cntPunkt = (data.task.tasks ? data.task.tasks.length : 0) + (data.orderDet ? data.orderDet.length : 0) +
      (data.matTransfer[0] ? data.matTransfer[0].length : 0)

    _.forEach(detailGroup, stItems => {
      if (stItems[0].empOrderType === 'TASK') {
        const orderItem = data.task.tasks.find(o => o.ID === stItems[0].ID)
        if (orderItem) {
          const text = `${cntPunkt === 1 ? '' : `${index++}. `}${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
          params.data.push({
            stName: '',
            deps: [{
              depName: '',
              items: [{ textDetail: text }]
            }]
          })
        }
      } else if (stItems[0].empOrderType === 'MATERIALTRANSFER' && data.matTransfer[0]) {
        const orderItem = data.matTransfer[0].find(o => o.ID === stItems[0].ID)
        if (orderItem) {
          let matTransfer = me.getMatTransferInfo([orderItem], data.commission, data.employeePosition,
            cntPunkt > 1, showTabNum, index, orgGen, params.notUseMiddleNameInOrder)
          index += cntPunkt > 1 ? matTransfer.length : 0
          matTransfer = matTransfer.filter(el => el.toOrder)
          matTransfer.forEach(el => {
            params.data.push({
              stName: '',
              deps: [{
                depName: '',
                items: [{ textDetail: el.text }]
              }]
            })
          })
        }
      } else {
        stItems = data.order.sortItems === 'STAFF' ? _.sortBy(stItems, ['employeePositionID.departmentID.treePath']) : stItems
        const objSt = {
          stName: data.order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
          deps: []
        }
        const depts = _.groupBy(stItems, item => data.order.sortItems === 'STAFF' ? item.departmentID : 'null')
        _.forEach(depts, depItems => {
          const depName = HR.nameCase.cap(depItems[0]['employeePositionID.departmentID.name'] || '')
          if (data.order.sortItems === 'STAFF') {
            depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
          }
          if (data.order.sortItems === 'ALPHABET') {
            depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
          }
          const objDep = {
            depName: data.order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
            items: []
          }

          let fltOrderPersons = data.order.sortItems === 'ORDER'
            ? orderPersons.filter(el => el.ID === stItems[0].ID)
            : depItems

          if (groupVacEmp) {
            fltOrderPersons = _.groupBy(fltOrderPersons, item => {
              return item.employeeID + '/' + AC.dateService.formatDate(item.calcDateFrom || item.dateFrom) + '/' +
                AC.dateService.formatDate(item.calcDateTo || item.dateTo) + '/' + (item.calcDayCount || item.dayCount)
            })
          } else {
            fltOrderPersons = _.groupBy(fltOrderPersons, 'ID')
          }

          _.forEach(fltOrderPersons, persons => {
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
            const posInfoDat = HR.reportUtils.getInfoItemOrderInCase(firstEl, 'dat', true, params.notUseMiddleNameInOrder)
            // const position = HR.reportUtils.makePositionName(posInfoDat.posName, firstEl['employeePositionID.positionID.isOrgBoss'])
            const militaryRank = firstEl['employeePositionID.positionID.positionType'] === '4'
              ? HR.reportUtils.getMilitaryRanks(data.empMilitaryRanks[firstEl.employeeID], data.order.orderDate || appAC.globalApplicationDate(), 'datName') : ''

            const actLen = persons.reduce((res, el) => res + (el.act ? el.act.length : 0), 0)
            const matLen = persons.reduce((res, el) => res + (data.matTransfer[el.employeePositionID] ? data.matTransfer[el.employeePositionID].length : 0), 0)
            let dontShowIndex = ((lenOrderPersons === 1 || lenOrderPersons === persons.length)) && ((!data.task || data.task.tasks.length === 0) && (!data.matTransfer[0] || data.matTransfer[0].length === 0))
            if (dontShowIndex && (lenOrderPersons === 1 || lenOrderPersons === persons.length)) {
              if (actLen > 0 || matLen > 0) {
                dontShowIndex = false
              }
            }

            let text = dontShowIndex ? '' : `${index++}. `
            text += orderWord  + ' ' + boldFormatBegin + (militaryRank ? militaryRank + ' ' : '') + HR.reportUtils.formatFullNameInOrder(firstEl['employeeID.datName'] || firstEl['employeeID.fullFIO'], { notUseMiddleNameInOrder: params.notUseMiddleNameInOrder })
            text += (persons.length === 1 && showTabNum && firstEl['employeeNumberID.tabNum'] ? ' ' + boldFormatEnd + UB.i18n(`(Таб. №&nbsp;{0})`, firstEl['employeeNumberID.tabNum']) : boldFormatEnd)
            text += posInfoDat.posName ? ', ' + posInfoDat.posName + orgGen : ''

            let restInfo
            let resArr = []
            persons = _.sortBy(persons, ['employeePositionID.workPlace', 'ID'])
            _.forEach(persons, el => {
              if (persons.length > 1) {
                let workPlace
                switch (el['employeePositionID.workPlace']) {
                  case '1':
                    workPlace = UB.i18n('за основним місцем роботи')
                    break
                  case '2':
                    workPlace = UB.i18n('за внутрішнім сумісництвом')
                    break
                  case '3':
                    workPlace = UB.i18n('за зовнішнім сумісництвом')
                    break
                  default:
                    workPlace = UB.i18n('за місцем роботи')
                }
                resArr.push({
                  toOrder: el.toOrder,
                  text: '<font color="blue">' + workPlace + (showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0}):`, el['employeeNumberID.tabNum']) : ':') + '</font>'
                })
              }

              restInfo = ''
              if (el.empOrderType === 'VACATIONLONG') {
                resArr.push({
                  toOrder: el.toOrder,
                  text: (persons.length === 1 ? ', ' : ' - ') + HR.nameCase.uncap(el['dictVacationKindID.nameAcc'] || el['dictVacationKindID.name'] || '') +
                    (showArticle && el['dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + el['dictVacationKindID.byArticle'] : '') +
                    (AC.dateService.dateDiff(el.dateFrom, el.dateTo)
                      ? UB.i18n(` з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(el.dateFrom), AC.dateService.formatDate(el.dateTo))
                      : UB.i18n(` на&nbsp;{0}`, AC.dateService.formatDate(el.dateTo))) + (el.reason ? ' ' + el.reason : '') +
                    (el.isTempVacancy ? '' : ` тривалістю ${el.dayCount}&nbsp;${AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), el.dayCount)}`) +
                    '.'
                })
                if (persons.length === 1) {
                  restInfo = resArr.length ? resArr[0].text || '' : ''
                  resArr = []
                }
              } else {
                el.next.forEach((e, indx) => {
                  resArr.push({
                    toOrder: el.toOrder,
                    text: (el.next.length > 1 || persons.length > 1 ? '- ' : ', ') + (e['empVacationPeriodID.fromOrgID'] && e['empVacationPeriodID.fromOrgID'] !== data.order.organizationID ? UB.i18n('невикористану за попереднім місцем роботи ') : '') +
                      (e.isPart ? UB.i18n('частину ') + HR.nameCase.uncap(e['dictVacationKindID.nameGen'] || e['dictVacationKindID.name'] || '')
                        : HR.nameCase.uncap(e['dictVacationKindID.nameAcc'] || e['dictVacationKindID.name'] || '')) +
                      (showArticle && e['dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + e['dictVacationKindID.byArticle'] : '') +
                      (e['dictVacationKindID.code'] === 'dAddO' ? ',' : '') +
                      (e.experience || '') + (AC.dateService.dateDiff(e.dateFrom, e.dateTo)
                      ? ` з&nbsp;${AC.dateService.formatDate(e.dateFrom)} по&nbsp;${AC.dateService.formatDate(e.dateTo)}` : ` на&nbsp;${AC.dateService.formatDate(e.dateTo)}`) +
                      (e['dictVacationKindID.dayAccumCondition'] === 'noHolidays' ? me.getHolidaysInfo(data.calendarHoliday, e.dateFrom, e.dateTo) : '') +
                      ` тривалістю ${e.dayCount}&nbsp;${AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), e.dayCount)}` +
                      (el.isRst ? UB.i18n(' пропорційно до відпрацьованого часу ') : '') +
                      (e['dictVacationKindID.isDay'] && e.showPeriod
                        ? e['dictVacationKindID.vactAccum'] === '3'
                          ? UB.i18n(` за&nbsp;{0}&nbsp;рік`, AC.dateService.formatDate(e['empVacationPeriodID.dateFrom'], 'yyyy'))
                          : UB.i18n(` за період роботи з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(e['empVacationPeriodID.dateFrom']), AC.dateService.formatDate(e['empVacationPeriodID.dateTo']))
                        : '') +
                      (el.reason ? ' ' + el.reason : '') +
                      (el.isMoneyHelp && el.next.length === 1 && persons.length === 1 ? me.makeMoneyHelp(el, el['moneyHelpPayElID.calcAvgType'] || '') : '') +
                      (indx < (el.next.length - 1) ? ';' : '.')
                  })
                })
                if ((el.next && el.next.length > 1) || persons.length > 1) {
                  restInfo = persons.length > 1 ? '' : UB.i18n(` відпустку тривалістю {0}&nbsp;{1}`, el.calcDayCount || el.dayCount,
                    AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), el.calcDayCount || el.dayCount)) +
                    /* (AC.dateService.dateDiff(el.calcDateFrom, el.calcDateTo || el.dateTo)
                      ? ` з&nbsp;${AC.dateService.formatDate(el.calcDateFrom)} по&nbsp;${AC.dateService.formatDate(el.calcDateTo || el.dateTo)}`
                      : ` на&nbsp;${AC.dateService.formatDate(el.calcDateTo || el.dateTo)}`) */
                    (el.isMoneyHelp ? me.makeMoneyHelp(el, el['moneyHelpPayElID.calcAvgType'] || '') : '') + `:`
                } else {
                  restInfo = resArr.length ? resArr[0].text || '' : ''
                  resArr = []
                }
              }
            })

            const actingInfo = []
            _.forEach(persons, el => {
              // const posInfoGen = HR.reportUtils.getPosIncaseInfo(el, 'gen', false)
              const posNameGen = el['employeePositionID.positionID.fullNameGen'] || el['employeePositionID.positionID.nameGen'] || el['employeePositionID.positionID.name'] || ''
              const personActingInfo = me.makeActing(el.act, (el['employeeID.genName'] || el['employeeID.fullFIO'] || ''), (showTabNum && el['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, el['employeeNumberID.tabNum']) : ''),
                HR.reportUtils.makePositionName(posNameGen, el['employeePositionID.positionID.isOrgBoss']),
                data.employeePosition, el.dateFrom, el.dateTo, el['positionID.positionType'] === '1', showTabNum,
                /* persons.length */ !(lenOrderPersons === 1 || lenOrderPersons === persons.length) ? 0 : index, orgGen, params.notUseMiddleNameInOrder)
              if (personActingInfo.length) {
                index += /* persons.length */ !(lenOrderPersons === 1 || lenOrderPersons === persons.length) ? 0 : personActingInfo.length
                actingInfo.push(...personActingInfo)
              }
            })

            const matTransfer = []
            _.forEach(persons, el => {
              const personMatTransfer = data.matTransfer[el.employeePositionID] ? me.getMatTransferInfo(data.matTransfer[el.employeePositionID], data.commission, data.employeePosition, true, showTabNum, index, orgGen, params.notUseMiddleNameInOrder) : []
              if (personMatTransfer.length) {
                // index += /* persons.length */ dontShowIndex ? 0 : personMatTransfer.length
                index += personMatTransfer.length
                matTransfer.push(...personMatTransfer)
              }
              if (data.matTransfer[el.employeePositionID]) {
                // чтобы избежать задвоения вывода инфрмации о мат. ценностях для сотрудника, если он в приказе более одного раза
                data.matTransfer[el.employeePositionID] = []
              }
            })

            if (persons.length > 1) {
              restInfo = UB.i18n(` відпустку тривалістю {0}&nbsp;{1} `, firstEl.calcDayCount || firstEl.dayCount,
                AC.dateService.plural(UB.i18n('календарний день_календарних дні_календарних днів'), firstEl.calcDayCount || firstEl.dayCount))
              restInfo += AC.dateService.dateDiff(firstEl.calcDateFrom || firstEl.dateFrom, firstEl.calcDateTo || firstEl.dateTo)
                ? UB.i18n(` з&nbsp;{0} по&nbsp;{1}`, AC.dateService.formatDate(firstEl.calcDateFrom || firstEl.dateFrom), AC.dateService.formatDate(firstEl.calcDateTo || firstEl.dateTo))
                : UB.i18n(` на&nbsp;{0}`, AC.dateService.formatDate(firstEl.calcDateTo || firstEl.dateTo))
              restInfo += firstEl.isMoneyHelp ? me.makeMoneyHelp(firstEl, firstEl['moneyHelpPayElID.calcAvgType'] || '') : ''
              restInfo += `:`
            }

            if (firstEl.toOrder) {
              objDep.items.push({
                textDetail: text + restInfo,
                resArr: resArr,
                reason: UB.i18n(`{0}`, firstEl.reasonDoc ? 'Підстава: ' + firstEl.reasonDoc : ''), // остальные ??? Сейчас поле не используется ?!
                actingInfo: actingInfo,
                matTransfer: matTransfer
              })
            }
          })
          if (objDep.items.length) {
            objSt.deps.push(objDep)
          }
        })
        if (objSt.deps.length) {
          params.data.push(objSt)
        }
      }
    })

    if (data.matTransfer[0]) {
      for (let i = 0; i < data.matTransfer[0].length; i++) {
        const item = data.matTransfer[0][i]
        item.toOrder = data.orderExtract && data.orderExtract.ID
          ? ((data.orderExtract.departmentID ? data.orderExtract.departmentID === item.departmentID : true) && (data.orderExtract.employeePositionID ? data.orderExtract.employeePositionID === item.employeePositionID : true))
          : true
      }
    }

    params.unrefMatTransfer = data.order.sortItems !== 'ORDER' && data.matTransfer[0] ? me.getMatTransferInfo(data.matTransfer[0], data.commission, data.employeePosition,
      (index !== 1 || (data.task && data.task.tasks.length !== 0)), showTabNum, index, orgGen, params.notUseMiddleNameInOrder) : []
    index += params.unrefMatTransfer.length

    // params.detail = params.detail.filter(el => el.toOrder)

    params.tasks = data.order.sortItems === 'ORDER' ? [] : data.task.tasks.map(e => ({
      task: `${index === 1 && data.task.tasks.length === 1 ? '' : index++ + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))

    return AC.reportService.removeEmptyValues(params)
  },

  makeActing: function (act, fio, tabNum, positionName, employeePosition, dateFrom, dateTo, positionType, showTabNum, index, orgGen, notUseMiddleNameInOrder) {
    const me = this
    const items = []
    act.forEach((el, index) => {
      let posName = ''
      const positionTypeAct = el['positionID.positionType'] === '1'

      if (employeePosition[el.employeePositionID]) {
        let posInfoAcc = HR.reportUtils.getInfoItemOrderInCase(employeePosition[el.employeePositionID][0], 'acc', true, notUseMiddleNameInOrder, '')
        posName = posInfoAcc.posName
        // posName = HR.reportUtils.makePositionName(posInfoAcc.posName, employeePosition[el.employeePositionID][0]['positionID.isOrgBoss'])
      }
      let str = UB.i18n(` - виконання обов'язків {0}{1} `, positionName || '____________________', orgGen)
      if (AC.dateService.dateDiff(el.dateFrom, dateFrom) || AC.dateService.dateDiff(el.dateTo, dateTo)) {
        if (AC.dateService.dateDiff(el.dateFrom, el.dateTo)) {
          str += UB.i18n(`з&nbsp;{0} `, AC.dateService.formatDate(el.dateFrom))
          str += UB.i18n(` по&nbsp;{0} `, AC.dateService.formatDate(el.dateTo))
        } else {
          str += UB.i18n(`на&nbsp;{0} `, AC.dateService.formatDate(el.dateFrom))
        }
      }

      str += UB.i18n(`покласти на {0}`, HR.reportUtils.formatShortNameInOrder(el['employeeID.accusativeName'] || el['employeeID.fullFIO'], { notUseMiddleNameInOrder, separator: '&nbsp;' }))
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
      index: index === 0 ? '' : `${index++}. `,
      value: (items.length === 1 ? UB.i18n(`На період відпустки {0}{1}`, fio, items[0].value.replace(' -', '')) : UB.i18n(`На період відпустки {0}:`, fio)),
      items: (items.length > 1 ? items : [])
    }] : []
  },

  getExtraLoadInfo: function (payForExtraLoad, calcAlgorithm, positionTypeAct, positionType, end) {
    if (calcAlgorithm === '3') {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу {1}, який заміщує{2}`, payForExtraLoad, positionTypeAct ? 'державного службовця' : 'працівника', end)
    } else if (calcAlgorithm === '1') {
      return UB.i18n(`у розмірі різниці заробітку відсутнього і заміщаючого працівників{0}`, end)
    } else {
      return UB.i18n(`у розмірі {0} відсотків посадового окладу тимчасово відсутнього {1}{2}`, payForExtraLoad, positionType ? 'державного службовця' : 'працівника', end)
    }
  },

  getMatTransferInfo: function (matTransfer, commission, employeePosition, needIndex, showTabNum, index, orgGen, notUseMiddleNameInOrder) {
    if (!matTransfer) {
      return []
    }
    const res = []
    matTransfer.forEach(matTransItem => {
      const toEmpName = HR.reportUtils.formatShortNameInOrder(matTransItem['toEmployeePositionID.employeeID.datName'] || matTransItem['toEmployeePositionID.employeeID.fullFIO'] || '', { notUseMiddleNameInOrder })
      const tabNumTo = showTabNum && matTransItem['toEmployeePositionID.employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, matTransItem['toEmployeePositionID.employeeNumberID.tabNum']) : ''
      let toPosName = ''
      if (employeePosition[matTransItem.toEmployeePositionID]) {
        let posInfoDat = HR.reportUtils.getInfoItemOrderInCase(employeePosition[matTransItem.toEmployeePositionID][0], 'dat', true, notUseMiddleNameInOrder, '')
        toPosName = posInfoDat.posName
        // toPosName = HR.reportUtils.makePositionName(posInfoDat.posName, employeePosition[matTransItem.toEmployeePositionID][0]['positionID.isOrgBoss'])
      }
      const fromEmpName = HR.reportUtils.formatShortNameInOrder(matTransItem['employeePositionID.employeeID.genName'] || matTransItem['employeePositionID.employeeID.fullFIO'] || '', { notUseMiddleNameInOrder })
      const tabNumFrom = showTabNum && matTransItem['employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, matTransItem['employeeNumberID.tabNum']) : ''
      let fromPosName = ''
      if (employeePosition[matTransItem.employeePositionID]) {
        let posInfoGen = HR.reportUtils.getInfoItemOrderInCase(employeePosition[matTransItem.employeePositionID][0], 'gen', true, notUseMiddleNameInOrder, '')
        fromPosName = posInfoGen.posName
        // fromPosName = HR.reportUtils.makePositionName(posInfoGen.posName, employeePosition[matTransItem.employeePositionID][0]['positionID.isOrgBoss'])
      }

      const header = UB.i18n(`{0}{1}{2}, прийняти матеріальні цінності від {3}{4}{5} по акту прийому-передачі`, toEmpName, tabNumTo, toPosName ? ', ' + toPosName + orgGen : '', fromEmpName, tabNumFrom, fromPosName ? ', ' + fromPosName + orgGen : '')
      const members = []
      commission.filter(el => el.orderDetID === matTransItem.ID).forEach(item => {
        const tabNum = showTabNum && item['employeePositionID.employeeNumberID.tabNum'] ? UB.i18n(` (Таб. №&nbsp;{0})`, item['employeePositionID.employeeNumberID.tabNum']) : ''
        members.push(`${HR.reportUtils.formatShortNameInOrder(item['employeePositionID.employeeID.fullFIO'] || '', { notUseMiddleNameInOrder })}${tabNum}${item['memberType.name'] ? ' - ' + HR.nameCase.uncap(item['memberType.name']) : ''}`)
      })
      res.push({
        toOrder: matTransItem.hasOwnProperty('toOrder') ? matTransItem.toOrder : true,
        text: `${needIndex ? `${index++}. ` : ''}${header}${members.length ? UB.i18n(' при участі комісії у складі: ') + members.join(', ') : ''}. ${UB.i18n('Акт прийому-передачі подати в бухгалтерію')}.`
      })
    })
    return res
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
    return result.length > 0 ? UB.i18n(' (не враховуючи ') + result.map(item => AC.dateService.getStringFormatDate(item, '', '', UB.i18n(' року')).replace(/ /g, '&nbsp;')).join(', ') + (result.length === 1 ? UB.i18n(' - святковий день) ') : UB.i18n(' - святкові дні) ')) : ''
  },

  makeMoneyHelp: function (el, calcAvgType) {
    let result = ''
    const calcAvg = calcAvgType === 'PLAN' ? UB.i18n('посадового окладу') : UB.i18n('середньомісячної заробітної плати')
    switch (el['positionID.positionType']) {
      case '1':
        result = UB.i18n(`грошової допомоги у розмірі {0}`, calcAvg)
        break
      case '6':
        result = UB.i18n(`матеріальної допомоги для оздоровлення у розмірі {0} (Постанова КМУ від&nbsp;18.01.2017 № 15)`, calcAvg)
        break
      case '5':
        result = UB.i18n(`матеріальної допомоги на оздоровлення у розмірі {0}`, calcAvg)
        break
      default:
        result = UB.i18n(`матеріальної допомоги для оздоровлення у розмірі {0}`, calcAvg)
    }
    return UB.i18n(` з виплатою {0}`, result)
  }
}
