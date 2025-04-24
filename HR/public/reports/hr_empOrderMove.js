/* global _ UB AC HR appAC */
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

    const result = {
      emblem: HR.reportUtils.getEmblem(),
      showSumma: false,
      showRank: false,
      showArticle: false,
      showMtCount: false,
      funcOrgType: false,
      showAccrual: false,
      printDocumentView: printDocumentView,
      titleOrderParams: printDocumentView === 'APPOINTMENT' ? 'padding-left: 34px; ' : '',
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
      preamble: (order.preamble || '').replace(/&/g, '&nbsp;'),
      titleOrder: (order.titleOrder || '').replace(/&/g, '&nbsp;'),
      items: []
    }
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', order.organizationID || appAC.globalOrganization()) === true

    let settingsOrg = await UB.Repository('ac_settingsOrg')
      .attrs(['value', 'constantID.code'])
      .where('organizationID', '=', order.masterOrganizationID || order.organizationID)
      .where('[constantID.code]', 'in', ['hrOrderAccrualByStaffTable', 'hrEmpOrderMoveRank', 'hrEmpOrderMoveAbsentArticle', 'hrFuncOrgType', 'hrShowAccrualMoveCert'])
      .selectAsObject({
        'constantID.code': 'code'
      })
    if (settingsOrg) {
      settingsOrg = _.groupBy(settingsOrg, 'code')
      result.showSumma = settingsOrg['hrOrderAccrualByStaffTable'] ? settingsOrg['hrOrderAccrualByStaffTable'][0].value === '1' : false
      result.showRank = settingsOrg['hrEmpOrderMoveRank'] ? settingsOrg['hrEmpOrderMoveRank'][0].value === '1' : false
      result.showArticle = settingsOrg['hrEmpOrderMoveAbsentArticle'] ? settingsOrg['hrEmpOrderMoveAbsentArticle'][0].value === '1' : false
      result.showMtCount = settingsOrg['hrFuncOrgType'] ? settingsOrg['hrFuncOrgType'][0].value === '1' : false
      result.funcOrgType = settingsOrg['hrFuncOrgType'] ? settingsOrg['hrFuncOrgType'][0].value === '1' : false
      result.showAccrual = settingsOrg['hrShowAccrualMoveCert'] ? settingsOrg['hrShowAccrualMoveCert'][0].value === '1' : false
    }
    const showPositionCategory = AC.settings.get('hrOrderРositionCategory', order.masterOrganizationID || order.organizationID) === true
    const showTabNum = order.showTabNum

    const whereArray = [['empOrderType', 'in', ['MOVE', 'PROLONGATION']]]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID', 'employeePositionID.mtCount', 'employeePositionID.workPlace'], whereArray, true)
    const orderDetVehicle = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'],
      [['empOrderType', 'in', ['VEHICLEASSIGN']]], true)
    const moveDet = await UB.Repository('hr_empOrderMoveDet')
      .attrs(['ID', 'positionID', 'mtCount',
        'dateFrom', 'accrualSum', 'isRankSave', 'isRankAssign', 'dictRankID.printName', 'reason',
        'employeeID', 'employeeID.sexType', 'isTrialPeriod', 'dateTrialEnd', 'dictTrialPeriodID.name',
        'employeeNumberID', 'termAddPayment', 'termAddPayment.name', 'addPayDateFrom', 'addPayDateTo',
        'vacPositionID', 'vacPositionID.employeeID', 'vacPositionID.employeeNumberID',
        'vacPositionID.employeeID.sexType', 'vacPositionID.employeeID.fullFIO', 'vacPositionID.employeeID.genName',
        'vacPositionID.employeeID.lastName', 'vacPositionID.employeeID.firstName', 'vacPositionID.employeeID.middleName',
        'dictReasonMovingKindID.name4Rep', 'dictReasonMovingKindID.name4RepFem', 'isPreservExistCharges',
        'employeePositionID.changeOrderID', 'employeePositionID.orderID', 'employeePositionID.orderID.empOrderType',
        'workPlace', 'dictPositionID', 'dictPositionID.nameGen', 'dictPositionID.nameGenF', 'dictPositionID.name',
        'dictPositionID.nameDat', 'dictPositionID.nameDatF', 'positionID.positionCategory.name',
        'workScheduleID.scheduleDescription', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'dateTo', 'empOrderType',
        'dictEmpCategoryID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'posNameAddition',
        'addOrderText'
      ])
      .where('orderID', '=', ID)
      .selectAsObject()
    let empOrderFundSource = await UB.Repository('hr_empOrderFundSource')
      .attrs(['paraID', 'dictFundSourceID', 'dictFundSourceID.name', 'dictFundSourceID.genName', 'mtCount'])
      .where('dictFundSourceID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID', '=', ID)
      .selectAsObject()

    const prolongDet = await UB.Repository('hr_empOrderProlongationDet')
      .attrs(['ID', 'positionID', 'mtCount',
        'dateFrom', 'accrualSum', 'isRankSave', 'isRankAssign', 'dictRankID.printName', 'reason',
        'employeeID', 'employeeID.sexType', 'isTrialPeriod', 'dateTrialEnd', 'dictTrialPeriodID.name',
        'employeeNumberID', 'termAddPayment', 'termAddPayment.name', 'addPayDateFrom', 'addPayDateTo',
        'vacPositionID', 'vacPositionID.employeeID', 'vacPositionID.employeeNumberID',
        'vacPositionID.employeeID.sexType', 'vacPositionID.employeeID.fullFIO', 'vacPositionID.employeeID.genName',
        'vacPositionID.employeeID.lastName', 'vacPositionID.employeeID.firstName', 'vacPositionID.employeeID.middleName',
        'dictReasonMovingKindID.name4Rep', 'dictReasonMovingKindID.name4RepFem', 'isPreservExistCharges',
        'employeePositionID.changeOrderID', 'employeePositionID.orderID', 'employeePositionID.orderID.empOrderType',
        'workPlace', 'dictPositionID.nameGen', 'dictPositionID.nameGenF', 'dictPositionID.name',
        'dictPositionID.nameDat', 'dictPositionID.nameDatF', 'positionID.positionCategory.name',
        'workScheduleID.scheduleDescription', 'dictTarifCoeffID', 'dictTarifCoeffID.code', 'dateTo',
        'empOrderType', 'dictTermAppointID.name', 'dictTermAppointID.nameGen', 'contractNumber', 'contractDate',
        'dictEmpCategoryID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'posNameAddition'
      ])
      .where('orderID', '=', ID)
      .selectAsObject()
    const rankDet = await HR.reportUtils.getRankInfo(ID)
    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName', 'middleName', 'fullFIO', 'genName'], moveDet, undefined, 'vacPositionID.employeeID')
    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName', 'middleName', 'fullFIO', 'genName'], prolongDet, undefined, 'vacPositionID.employeeID')

    let ids = moveDet && moveDet.length > 0 ? _.uniq(moveDet.map(el => el.employeeNumberID)) : []
    ids.push(...(moveDet && moveDet.length > 0 ? _.uniq(moveDet.filter(el => el['vacPositionID.employeeNumberID']).map(el => el['vacPositionID.employeeNumberID'])) : []))

    let empLongTermAbsc = await UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'orderID', 'paraID', 'description'])
      .where('employeeNumberID', 'in', ids)
      .selectAsObject()
    empLongTermAbsc = empLongTermAbsc && empLongTermAbsc.length ? _.groupBy(empLongTermAbsc, 'employeeNumberID') : []

    const orderAcc = result.showAccrual ? await UB.Repository('hr_empOrderAcc')
      .attrs(['payElID.code', 'payElID.name', 'payElID.printName', 'accrualSum', 'accrualRate', 'empOrderDetID', 'dateFrom', 'dateTo'])
      .where('empOrderID', '=', ID)
      .where('isAutoNotClose', '=', 0)
      .selectAsObject({
        'payElID.name': 'payName',
        'payElID.code': 'payCode',
        'payElID.printName': 'payPrintName'
      }) : []

    ids = prolongDet && prolongDet.length > 0 ? _.uniq(prolongDet.map(el => el.employeeID)) : []
    let empRangeScience = ids && ids.length ? await UB.Repository('hr_empRangeScience')
      .attrs(['employeeID', 'docNumber', 'docDate', 'degreeName', 'dictDegreeID.name', 'dictDegreeID.shortName'])
      .where('employeeID', 'in', ids)
      .selectAsObject() : []
    empRangeScience = empRangeScience.map(row => {
      return Object.assign({}, row, {
        docDateSort: row.docDate || new Date(1, 1, 1)
      })
    })
    empRangeScience = empRangeScience && empRangeScience.length ? _.groupBy(empRangeScience, 'employeeID') : []

    let empAcademStatus = ids && ids.length ? await UB.Repository('hr_empAcademStatus')
      .attrs(['ID', 'employeeID', 'docNumber', 'docDate', 'dictAcademStatusID.name', 'dictAcademStatusID.nameDat', 'setStatus', 'dictAcademStatusID.isOfficial'])
      .where('employeeID', 'in', ids)
      .selectAsObject({
        'dictAcademStatusID.isOfficial': 'isOfficial'
      }) : []
    empAcademStatus = empAcademStatus.map(row => {
      return Object.assign({}, row, {
        docDateSort: row.docDate || new Date(1, 1, 1),
        isOfficialSort: row.isOfficial ? 1 : 2,
        setStatusSort: row.setStatus && row.setStatus === 'BYORG' ? 1 : 2
      })
    })
    empAcademStatus = empAcademStatus && empAcademStatus.length ? _.groupBy(empAcademStatus, 'employeeID') : []

    let empMilitaryRanks = await UB.Repository('hr_empMilitaryRanks')
      .attrs(['ID', 'employeeID', 'dictMilitaryRankID.name', 'dictMilitaryRankID.genName', 'dictMilitaryRankID.datName', 'orderDate'])
      .where('dictMilitaryRankID', 'isNotNull')
      .exists(UB.Repository('hr_empOrderDet')
        .correlation('employeeID', 'employeeID')
        .where('orderID', '=', ID)
      )
      .selectAsObject()
    empMilitaryRanks = _.groupBy(empMilitaryRanks, 'employeeID')

    const cnt = orderDet && orderDet.length ? orderDet.filter(item => _.find(moveDet, { ID: item.ID })).length + orderDet.filter(item => _.find(prolongDet, { ID: item.ID })).length : 0
    let index = 0
    const fulllDepartmentNames = {} // полний перелік назв підрозділів

    for (let i = 0; i < orderDet.length; i++) {
      const item = orderDet[i]
      const moveDetItem = item.empOrderType === 'MOVE'
        ? _.find(moveDet, { ID: item.ID })
        : _.find(prolongDet, { ID: item.ID })
      const toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (moveDetItem) {
        if (empLongTermAbsc[moveDetItem.employeeNumberID]) {
          const flt = empLongTermAbsc[moveDetItem.employeeNumberID].filter(el => el.dateFrom <= AC.dateService.shiftDate(moveDetItem.dateFrom) && el.dateTo >= AC.dateService.shiftDate(moveDetItem.dateFrom))
          if (flt && flt.length) {
            moveDetItem.vacancyDateFrom = flt[0].dateFrom
            moveDetItem.vacancyDateTo = flt[0].dateTo
            moveDetItem.vacancyOrderID = flt[0].orderID
            moveDetItem.vacancyParaID = flt[0].paraID
            moveDetItem.vacancyDescription = flt[0].description ? HR.nameCase.uncap(flt[0].description) : UB.i18n('довготривалій відпустці')
          }
        }
        if (moveDetItem['vacPositionID.employeeNumberID'] && empLongTermAbsc[moveDetItem['vacPositionID.employeeNumberID']]) {
          const flt = empLongTermAbsc[moveDetItem['vacPositionID.employeeNumberID']].filter(el => el.dateFrom <= AC.dateService.shiftDate(moveDetItem.dateFrom) && el.dateTo >= AC.dateService.shiftDate(moveDetItem.dateFrom))
          if (flt && flt.length) {
            moveDetItem.vacPositionDateFrom = flt[0].dateFrom
            moveDetItem.vacPositionDateTo = flt[0].dateTo
            moveDetItem.vacPositionOrderID = flt[0].orderID
            moveDetItem.vacPositionParaID = flt[0].paraID
            moveDetItem.vacPositionDescription = flt[0].description ? HR.nameCase.uncap(flt[0].description) : UB.i18n('довготривалій відпустці')
          }
        }
        const tabNum = showTabNum && item['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, item['employeeNumberID.tabNum']) : ''
        const currPositionCategoryName = showPositionCategory && item['employeePositionID.positionID.positionCategory.name']
          ? ` (${UB.i18n('категорія посади')}: ${item['employeePositionID.positionID.positionCategory.name']})`
          : ''
        let posInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, result.notUseMiddleNameInOrder)
        const oldPosName = posInfo.posName
          ? UB.i18n(' з посади ') + posInfo.posName + currPositionCategoryName + orgGen
          : ''
        posInfo = HR.reportUtils.getInfoItemOrderInCase(item, moveDetItem.empOrderType === 'MOVE' ? 'acc' : 'dat', true, result.notUseMiddleNameInOrder)

        const positionCategoryName = showPositionCategory && moveDetItem['positionID.positionCategory.name']
          ? ` (${UB.i18n('категорія посади')}: ${moveDetItem['positionID.positionCategory.name']})`
          : ''

        const newPosName = await me.getPosName(moveDetItem.positionID || 0, order.orderDate || order.entryDate, item['employeePositionID.positionID.positionType'] === '4', useSexType && item['employeeID.sexType'] === 'W')
        if (useActualPositionName || (moveDetItem.dictEmpCategoryID && item['employeePositionID.positionID.positionType'] !== '4')) {
          newPosName.posNameGen = useSexType && moveDetItem['employeeID.sexType'] === 'W'
            ? HR.nameCase.uncap(moveDetItem['dictPositionID.nameGenF'] || moveDetItem['dictPositionID.nameGen'] || moveDetItem['dictPositionID.name'] || '')
            : HR.nameCase.uncap(moveDetItem['dictPositionID.nameGen'] || moveDetItem['dictPositionID.name'] || '')
          newPosName.posNameGen = HR.reportUtils.makePositionName(newPosName.posNameGen, newPosName.isOrgBoss)

          newPosName.posNameDat = useSexType && moveDetItem['employeeID.sexType'] === 'W'
            ? HR.nameCase.uncap(moveDetItem['dictPositionID.nameDatF'] || moveDetItem['dictPositionID.nameDat'] || moveDetItem['dictPositionID.name'] || '')
            : HR.nameCase.uncap(moveDetItem['dictPositionID.nameDat'] || moveDetItem['dictPositionID.name'] || '')
          newPosName.posNameDat = HR.reportUtils.makePositionName(newPosName.posNameDat, newPosName.isOrgBoss)

          let depName = ''
          if (newPosName.mi_treePath) {
            if (fulllDepartmentNames[newPosName.mi_treePath]) {
              depName = fulllDepartmentNames[newPosName.mi_treePath]
            } else {
              depName = await HR.reportUtils.getFullDepartmentNameByTree(newPosName.mi_treePath, order.organizationID, order.orderDate || order.entryDate)
              fulllDepartmentNames[newPosName.mi_treePath] = depName
            }
          }

          const nameAddition = moveDetItem.posNameAddition
          newPosName.posNameGen = HR.reportUtils.removeDuplicateWords([newPosName.posNameGen, nameAddition, moveDetItem['dictEmpCategoryID.genName'] || '', depName].filter(Boolean).join(' ') || '')
          newPosName.posNameDat = HR.reportUtils.removeDuplicateWords([newPosName.posNameDat, nameAddition, moveDetItem['dictEmpCategoryID.genName'] || '', depName].filter(Boolean).join(' ') || '')
        }

        if (!newPosName.posNameGen && moveDetItem.workPlace === '4') {
          newPosName.posNameGen = HR.nameCase.uncap(moveDetItem['dictPositionID.fullNameGen'] || moveDetItem['dictPositionID.nameGen'] || moveDetItem['dictPositionID.name'])
          newPosName.posName = useSexType && moveDetItem['employeeID.sexType'] === 'W'
            ? HR.nameCase.uncap(moveDetItem['dictPositionID.nameGenF'] || moveDetItem['dictPositionID.nameGen'] || moveDetItem['dictPositionID.name'] || '')
            : HR.nameCase.uncap(moveDetItem['dictPositionID.nameGen'] || moveDetItem['dictPositionID.name'] || '')

          // newPosName.isOrgBoss = false
        }

        const dateFrom = AC.dateService.formatDate(moveDetItem.dateFrom)
        const dateTo = moveDetItem.dateTo ? (AC.dateService.formatDate(moveDetItem.dateTo) === '31.12.9999' ? '' : ' по&nbsp;' + AC.dateService.formatDate(moveDetItem.dateTo)) : ''
        let dictReasonMovingKindName = moveDetItem['employeeID.sexType'] === 'W'
          ? moveDetItem['dictReasonMovingKindID.name4RepFem'] || moveDetItem['dictReasonMovingKindID.name4Rep'] || ''
          : moveDetItem['dictReasonMovingKindID.name4Rep'] || ''
        dictReasonMovingKindName = dictReasonMovingKindName ? ', ' + HR.nameCase.uncap(dictReasonMovingKindName) : ''
        const baseSum = moveDetItem.accrualSum
        const basePay = (moveDetItem.workPlace !== '4' && result.showSumma && baseSum
          ? ' ' + HR.reportUtils.formatAsCurrency(baseSum) + UB.i18n('&nbsp;грн. на місяць')
          : '') + (moveDetItem.isPreservExistCharges ? UB.i18n(' зі збереженням усіх раніше встановлених надбавок та доплат') : '')
        let rankAction = ''
        if (result.showRank && (moveDetItem.isRankSave || moveDetItem.isRankAssign)) {
          let rAct
          let rankName
          if (moveDetItem.isRankSave) {
            rAct = UB.i18n('зберегти')
            const rankDetItem = rankDet.find(o =>
              o.employeeID === item.employeeID &&
                AC.dateService.shiftDate(o.dateFrom) <= AC.dateService.shiftDate(moveDetItem.dateFrom) &&
                AC.dateService.shiftDate(o.dateTo || AC.dateService.maxDate()) >= AC.dateService.shiftDate(moveDetItem.dateFrom))
            if (rankDetItem) {
              rankName = (rankDetItem['dictRankID.printName'] || '').replace(/ /g, '&nbsp;')
            }
          } else {
            rAct = UB.i18n('присвоїти')
            rankName = (moveDetItem['dictRankID.printName'] || '').replace(/ /g, '&nbsp;')
          }
          if (rankName) {
            const subj = item['employeeID.sexType'] === 'W' ? UB.i18n('їй') : UB.i18n('йому')
            rankAction = UB.i18n(` та {0} {1} {2} державного службовця`, rAct, subj, rankName)
          }
        }
        let trialText = ''
        if (result.showRank && moveDetItem.isTrialPeriod && moveDetItem['dictTrialPeriodID.name']) {
          trialText = UB.i18n(` Встановлено випробувальний строк {0} (до&nbsp;{1}).`, HR.nameCase.uncap(moveDetItem['dictTrialPeriodID.name']), AC.dateService.formatDate(moveDetItem['dateTrialEnd']))
        }

        let vacPosition = ''
        if (moveDetItem.vacPositionID) {
          // Переведення на посаду, якщо там є призначений Працівник, який знаходиться у відпустці, довготривалій відпустці, військовій службі
          let employee = moveDetItem['vacPositionID.employeeID.genName'] || moveDetItem['vacPositionID.employeeID.fullFIO'] ||
              HR.reportUtils.getFullName(moveDetItem['vacPositionID.employeeID.lastName'], moveDetItem['vacPositionID.employeeID.firstName'],
                moveDetItem['vacPositionID.employeeID.middleName'], false)
          employee = HR.reportUtils.formatShortNameInOrder(employee, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })

          const orderDet = await me.findOrderInfo(moveDetItem.vacPositionOrderID, moveDetItem.vacPositionParaID)
          if (orderDet) {
            if (orderDet.empOrderType === 'MILSERVICE') {
              vacPosition = UB.i18n(` на період військової служби {0}, до дня {1} фактичного виходу з військової служби,`, employee, moveDetItem['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
            } else if (orderDet['dictVacationKindID.isTempVacancy']) {
              vacPosition = UB.i18n(` на період {0} {1},`, HR.nameCase.uncap(orderDet['dictVacationKindID.nameGen'] || orderDet['dictVacationKindID.name'] || ''), employee)
              vacPosition += UB.i18n(` до дня {0} фактичного виходу з відпустки,`, moveDetItem['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
            } else {
              vacPosition = UB.i18n(` на період відсутності {0}, до дня {1} фактичного виходу,`, employee, moveDetItem['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
            }
          } else {
            vacPosition = UB.i18n(` на період відсутності {0}, до дня {1} фактичного виходу,`, employee, moveDetItem['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
          }
        }

        let textVacancy = ''
        if (moveDetItem.vacancyDateFrom || moveDetItem.vacancyDateTo) {
          // Переведення працівника, який знаходиться у відпустці, довготривалій відпустці, військовій службі
          const orderDet = await me.findOrderInfo(moveDetItem.vacancyOrderID, moveDetItem.vacancyParaID)
          if (orderDet && orderDet.dateFrom && (orderDet.dateFrom <= moveDetItem.dateFrom) &&
               (!orderDet.dateTo || (orderDet.dateTo && moveDetItem.dateFrom <= orderDet.dateTo))) {
            textVacancy = UB.i18n(`Вважати {0}, {1}, що продовжує`, HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }), item['employeeID.sexType'] === 'W' ? UB.i18n('такою') : UB.i18n('таким'))
            if (orderDet.empOrderType === 'MILSERVICE') {
              textVacancy += UB.i18n(' перебування на військовій службі.')
            } else {
              const vac = result.showArticle
                ? orderDet['dictVacationKindID.byArticle'] || orderDet['dictVacationKindID.nameLoc'] || orderDet['dictVacationKindID.name'] || ''
                : orderDet['dictVacationKindID.nameLoc'] || orderDet['dictVacationKindID.name'] || ''
              textVacancy += UB.i18n(` перебувати {0} з&nbsp;{1}`, HR.nameCase.uncap(vac), AC.dateService.formatDate(orderDet.dateFrom))
              textVacancy += moveDetItem['employeePositionID.vacancyDateTo'] ? UB.i18n(` по&nbsp;{0}.`, AC.dateService.formatDate(orderDet.dateTo)) : '.'
            }
          } else if (moveDetItem.vacancyDescription && moveDetItem.vacancyDateFrom && moveDetItem.vacancyDateTo &&
              moveDetItem.vacancyDateFrom <= moveDetItem.dateFrom && moveDetItem.dateFrom <= moveDetItem.vacancyDateTo) {
            textVacancy = UB.i18n(`Вважати {0}, {1}, що продовжує перебувати у {2}.`, HR.reportUtils.formatShortNameInOrder(posInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }), item['employeeID.sexType'] === 'W' ? UB.i18n('такою') : UB.i18n('таким'), moveDetItem.vacancyDescription)
          }
        }

        let textAddPayment = ''
        if (moveDetItem.termAddPayment && moveDetItem.termAddPayment !== 'NONE_TERM') {
          const insEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'ins', false)
          textAddPayment = UB.i18n(`Зберегти за {0} {1} попередній середній заробіток `, HR.reportUtils.formatShortNameInOrder(insEmpInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }), item['employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
          textAddPayment += moveDetItem.termAddPayment === 'OTHER_TERM'
            ? UB.i18n(`з&nbsp;{0} по&nbsp;{1}.`, AC.dateService.formatDate(moveDetItem.addPayDateFrom), AC.dateService.formatDate(moveDetItem.addPayDateTo))
            : HR.nameCase.uncap(moveDetItem['termAddPayment.name']) + '.'
        }

        const textMtCountFrom = result.showMtCount && item['employeePositionID.mtCount'] ? item['employeePositionID.mtCount'] === 1 ? UB.i18n(' (повна ставка)') : UB.i18n(` ({0}&nbsp;ставки)`, HR.reportUtils.formatAsNumberStr(item['employeePositionID.mtCount'])) : ''
        const textMtCount = result.showMtCount && moveDetItem.mtCount ? moveDetItem.mtCount === 1 ? UB.i18n(' (на повну ставку)') : UB.i18n(` (на {0}&nbsp;ставки)`, HR.reportUtils.formatAsNumberStr(moveDetItem.mtCount)) : ''
        let workPlaceFrom = ''
        if (item['employeePositionID.workPlace'] === '2') {
          workPlaceFrom = UB.i18n(' за внутрішнім сумісництвом')
        } else if (item['employeePositionID.workPlace'] === '3') {
          workPlaceFrom = UB.i18n(' за зовнішнім сумісництвом')
        } else if (item['employeePositionID.workPlace'] === '4') {
          workPlaceFrom = UB.i18n(' поза штатом')
        }
        let workPlace = ''
        if (moveDetItem.workPlace === '2') {
          workPlace = UB.i18n(' за внутрішнім сумісництвом')
        } else if (moveDetItem.workPlace === '3') {
          workPlace = UB.i18n(' за зовнішнім сумісництвом')
        } else if (moveDetItem.workPlace === '4') {
          workPlace = UB.i18n(' поза штатом')
        }

        const fsData = empOrderFundSource.filter(fsItem => fsItem.paraID === item.ID && fsItem.dictFundSourceID)
        let dictFundSource = []
        fsData.forEach((fsItem, npp) => {
          const last = fsItem.length === 1 || npp === fsData.length - 1
            ? ''
            : npp < fsData.length - 2 ? ', ' : ' та '
          dictFundSource.push(UB.i18n(`{0}&nbsp;{1} за рахунок коштів {2}{3}`, fsItem.mtCount || 0, (fsItem.mtCount || 0) === 1 ? 'ставку' : 'ставки', fsItem['dictFundSourceID.genName'] || fsItem['dictFundSourceID.name'] || '', last))
        })
        const dictFundSourceText = dictFundSource.length
          ? UB.i18n(` Оплата праці на {0}.`, dictFundSource.join(''))
          : ''
        let text = ''
        const indexStr = cnt === 1 /* && !textAddPayment.length && !textVacancy.length */ && orderDetVehicle.length === 0 && (!taskDet.tasks || !taskDet.tasks.length) ? '' : ++index + '. '
        if (moveDetItem.empOrderType === 'PROLONGATION') {
          let science = '' // UB.i18n('без наукового ступеня')
          let academ = ''
          if (empRangeScience[item.employeeID]) {
            const el = _.sortBy(empRangeScience[item.employeeID], ['docDateSort', 'ID'])[empRangeScience[item.employeeID].length - 1]
            science = el.degreeName || el['dictDegreeID.shortName'] || el['dictDegreeID.name'] || ''
          }
          if (empAcademStatus[item.employeeID]) {
            const el = empAcademStatus[item.employeeID].sort(function (a, b) {
              if (a.isOfficialSort < b.isOfficialSort) {
                return -1
              }
              if (a.isOfficialSort > b.isOfficialSort) {
                return 1
              }
              if (a.setStatusSort < b.setStatusSort) {
                return -1
              }
              if (a.setStatusSort > b.setStatusSort) {
                return 1
              }
              // последний по дате
              if (a.docDateSort > b.docDateSort) {
                return -1
              }
              if (a.docDateSort < b.docDateSort) {
                return 1
              }
              // если выше все одинаково, то берет последнюю запись
              if (a.ID > b.ID) {
                return -1
              }
              if (a.ID < b.ID) {
                return 1
              }
              return 0
            })[0]
            academ = el['dictAcademStatusID.nameDat'] || el['dictAcademStatusID.name'] || ''
          }
          const dictTermAppoint = moveDetItem['dictTermAppointID.nameGen'] || moveDetItem['dictTermAppointID.name'] || ''

          const contract = moveDetItem.contractNumber
            ? UB.i18n(', на умовах укладеного з ним контракту {0}{1}', moveDetItem.contractDate ? UB.i18n('від') + ' ' + AC.dateService.formatDate(moveDetItem.contractDate) : '', moveDetItem.contractNumber ? ' №' + moveDetItem.contractNumber : '')
            : ', ' + textMtCount + (moveDetItem.workPlace === '4' ? '' : ' з посадовим окладом згідно штатного розпису') + basePay

          let orderWord = UB.i18n('Продовжити')
          orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()

          text = UB.i18n(`{0}{12} трудові відносини {1}{2}{3}{11}, на посаді {4}, з&nbsp;{5}{6}{7}{8}{9}{10}`, indexStr, science ? science + (academ ? ', ' : ' ') : '',
            academ ? academ + ' ' : '', boldFormatBegin + posInfo.empName + boldFormatEnd,
            newPosName.posNameGen + positionCategoryName, dateFrom, dateTo, dictTermAppoint ? UB.i18n(' терміном на ') + dictTermAppoint : '',
            vacPosition ? vacPosition.substr(0, vacPosition.length - 1) : '', dictReasonMovingKindName, contract, tabNum ? ' ' + tabNum : '',
            orderWord)
          text += dictFundSourceText
          text += !moveDetItem.contractNumber && result.funcOrgType && moveDetItem.dictTarifCoeffID ? UB.i18n(` Тарифний розряд - {0}`, moveDetItem['dictTarifCoeffID.code']) : ''
        } else {
          if (item['employeePositionID.positionID.positionType'] === '4') {
            const militaryRank = HR.reportUtils.getMilitaryRanks(empMilitaryRanks[item.employeeID], order.orderDate || appAC.globalApplicationDate(), 'genName')
            const pInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, result.notUseMiddleNameInOrder, '')
            let orderWord = UB.i18n('Вважати')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            text = UB.i18n(`{0} {13} {1}{2}{12}{3} {4}, що справи та посаду {6} {5} i {7} до виконання службових обов’язків {8}{9} {10}&nbsp;{11}`,
              indexStr, militaryRank ? militaryRank + ' ' : '', boldFormatBegin + posInfo.empName + boldFormatEnd, pInfo.posName ? ', ' + pInfo.posName : '',
              item['employeeID.sexType'] === 'W' ? UB.i18n('такою') : UB.i18n('таким'), item['employeeID.sexType'] === 'W' ? UB.i18n('здала') : UB.i18n('здав'), pInfo.posName,
              item['employeeID.sexType'] === 'W' ? UB.i18n('приступила') : UB.i18n('приступив'), HR.reportUtils.makePositionName(newPosName.posNameGen + positionCategoryName, newPosName.isOrgBoss),
              newPosName.militaryRank ? UB.i18n(', штатна категорія "') + newPosName.militaryRank + '"' : '', UB.i18n('з'), dateFrom, tabNum ? ' ' + tabNum : '',
              orderWord)
          } else {
            let orderWord = UB.i18n('Перевести')
            orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
            text = UB.i18n(`{0}{18} {1}{17}{2}{14}{3} з&nbsp;{4}{16} на посаду {5}{6}{15}{7}{8}{13}{9}{10}{11} {12}`, indexStr,
              boldFormatBegin + posInfo.empName + boldFormatEnd, oldPosName,
              textMtCountFrom, dateFrom, newPosName.posNameGen + positionCategoryName, orgGen, textMtCount, vacPosition, basePay, rankAction, dictReasonMovingKindName,
              trialText, moveDetItem.workPlace === '4' ? '' : ' з посадовим окладом згідно штатного розпису', workPlaceFrom, workPlace, dateTo, tabNum ? ' ' + tabNum : '',
              orderWord)
            text += dictFundSourceText
            text += (result.funcOrgType && moveDetItem.dictTarifCoeffID ? UB.i18n(` Тарифний розряд - {0}`, moveDetItem['dictTarifCoeffID.code']) : '')
          }
        }
        text = text.replace('</B> ', ' </B>')
        text = text.replace('</B>,', ',</B>&nbsp;')
        text += (moveDetItem.addOrderText ? ' ' + moveDetItem.addOrderText + '.' : '.')
        result.items.push({
          toOrder: toOrder,
          indent: 1,
          text: text
        })

        if (item['employeePositionID.positionID.positionType'] === '4') {
          const militaryRank = HR.reportUtils.getMilitaryRanks(empMilitaryRanks[item.employeeID], order.orderDate || appAC.globalApplicationDate(), 'datName')
          const pos = newPosName.posNameDat + positionCategoryName
          let orderWord = UB.i18n('Встановити')
          orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: UB.i18n(`{5} {0}{1}{2} {3}&nbsp;{4} посадовий оклад згідно з{5} тарифним розрядом за Єдиною тарифною сіткою розрядів і коефіцієнтів з оплати праці.`,
              militaryRank ? militaryRank + ' ' : '', HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }),
              pos ? ', ' + pos : '', UB.i18n('з'), dateFrom, newPosName.tarifCode ? ' ' + newPosName.tarifCode : '', orderWord)
          })
        }

        if (textAddPayment.length) {
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: /* `${cnt > 1 ? '' : ++index + '. '}` + */ textAddPayment
          })
        }
        if (textVacancy.length) {
          result.items.push({
            toOrder: toOrder,
            indent: 1,
            text: /* `${cnt > 1 ? '' : ++index + '. '}` + */ textVacancy
          })
        }

        let orderAccRows = orderAcc.filter(el => el.empOrderDetID === moveDetItem.ID)
        if (!moveDetItem.isPreservExistCharges && orderAccRows && orderAccRows.length > 0 && (moveDetItem.empOrderType === 'MOVE' || !moveDetItem.contractNumber)) {
          orderAccRows = _.groupBy(orderAccRows, item => { return item.payCode === '42' })
          _.forEach(orderAccRows, orderAccItems => {
            orderAccItems.forEach((el, idx) => {
              const accrualStr = el.accrualSum
                ? UB.i18n(` у розмірі {0}&nbsp;гривень`, HR.reportUtils.formatAsCurrency(el.accrualSum))
                : (el.accrualRate
                  ? UB.i18n(` у розмірі {0}&nbsp;відсотків`, el.accrualRate) + (result.funcOrgType ? UB.i18n(' окладу') : UB.i18n(' від посадового окладу'))
                  : '')
              const accrualDateFrom = el.dateFrom ? UB.i18n(`з&nbsp;{0}`, AC.dateService.formatDate(el.dateFrom)) : ''
              const accrualDateTo = (!el.dateTo || AC.dateService.isMaxDate(el.dateTo)) ? '' : UB.i18n(` по&nbsp;{0}`, AC.dateService.formatDate(el.dateTo))

              if (orderAccItems.length === 1) {
                result.items.push({
                  toOrder: toOrder,
                  indent: 1,
                  text: el.payCode === '42'
                    ? UB.i18n(`Виплатити {0} {1} {2}.`, HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }), HR.nameCase.uncap(el.payPrintName || el.payName || ''), accrualStr)
                    : UB.i18n(`Встановити {0} {1} {2} {3}{4}.`, HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }), HR.nameCase.uncap(el.payPrintName || el.payName || ''), accrualStr, accrualDateFrom, accrualDateTo)
                })
              } else {
                if (idx === 0) {
                  result.items.push({
                    toOrder: toOrder,
                    indent: 1,
                    text: el.payCode === '42'
                      ? UB.i18n(`Виплатити {0}:`, HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }))
                      : UB.i18n(`Встановити {0}:`, HR.reportUtils.formatShortNameInOrder(item['employeeID.datName'] || item['employeeID.fullFIO'], { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder }))
                  })
                }
                result.items.push({
                  toOrder: toOrder,
                  indent: 1,
                  text: el.payCode === '42'
                    ? `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}${idx === (orderAccItems.length - 1) ? '.' : ';'}`
                    : `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr} ${accrualDateFrom}${accrualDateTo}${idx === (orderAccItems.length - 1) ? '.' : ';'}`
                })
              }
            })
          })
        }

        if (result.funcOrgType && moveDetItem['workScheduleID.scheduleDescription'] && moveDetItem.empOrderType === 'MOVE') {
          result.items.push({
            toOrder: toOrder,
            text: UB.i18n('Графік роботи: ') + moveDetItem['workScheduleID.scheduleDescription'],
            indent: 1
          })
        }

        if (moveDetItem.reason && AC.settings.get('hrEnableReasonDoc', order.organizationID || appAC.globalOrganization())) {
          result.items.push({
            toOrder: toOrder,
            text: UB.i18n(`Підстава: {0}.`, moveDetItem.reason),
            indent: 0
          })
        }
      }
    }

    if (moveDet.length === 1) {
      const item = orderDet.filter(el => el.empOrderType !== 'TASK')[0]
      const datEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'gen', true)
      const titleName = item['employeePositionID.positionID.positionType'] === '4' ? '' : HR.reportUtils.formatShortNameInOrder(datEmpInfo.empName, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })
      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
    } else if (moveDet.length !== 0) {
      result.titleOrder = `${result.titleOrder || ''}${result.titleOrder ? '<br/>' : ''}${UB.i18n('працівників')}`
    }

    const vehicleDet = await UB.Repository('hr_empOrderVehicleassignDet')
      .attrs(['ID', 'employeeID.genName', 'employeeID.accusativeName', 'employeeID.fullFIO', 'employeeID.sexType',
        'dateFrom', 'dateTo', 'vehicleID.description', 'vehicleID.govNum', 'givingType',
        'employeePositionID.dictPositionID.nameOr', 'employeeNumberID.tabNum', 'strVehicle'])
      .where('orderID', '=', ID)
      .orderBy('itemIdx')
      .selectAsObject()

    for (let i = 0; i < orderDetVehicle.length; i++) {
      const vehicleDetRow = _.find(orderDetVehicle, { ID: vehicleDet[i].ID })
      _.merge(vehicleDetRow, vehicleDet[i] || [])

      const boldFormatBegin = '<b>'
      const boldFormatEnd = '</b>'
      const caseCode = vehicleDetRow.givingType === 'ASSIGN' ? 'ins' : 'dat'
      const posInfo = HR.reportUtils.getInfoItemOrderInCase(vehicleDetRow, caseCode, true, result.notUseMiddleNameInOrder)
      if (caseCode === 'ins') {
        posInfo.posName = vehicleDetRow['employeePositionID.dictPositionID.nameOr'] || posInfo.posName
      }
      const tabNum = showTabNum && vehicleDetRow['employeeNumberID.tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, vehicleDetRow['employeeNumberID.tabNum']) : ''

      let text = (vehicleDetRow.givingType === 'ASSIGN' ? UB.i18n('ЗАКРІПИТИ з ') : UB.i18n('НАДАТИ з ')) +
        AC.dateService.formatDate(vehicleDetRow.dateFrom) + ' року' +
        (vehicleDetRow.dateTo ? ` по ${AC.dateService.formatDate(vehicleDetRow.dateTo)} року ` : ' ') +
        (vehicleDetRow.givingType === 'ASSIGN' ? ' за ' : '') +
        `${boldFormatBegin}${posInfo.empName || ''}${boldFormatEnd}${tabNum ? ' ' + tabNum : ''}, ${posInfo.posName}` +
        (vehicleDetRow.givingType === 'ASSIGN'
          ? UB.i18n(' автотранспортний засіб ')
          : UB.i18n(' право керування автотранспортним засобом ')) +
          vehicleDetRow['strVehicle'] +
          (vehicleDetRow.givingType === 'ASSIGN'
            ? UB.i18n(' з правом керування та обслуговування даного автотранспортного засобу.')
            : UB.i18n('.'))

      result.items.push({
        toOrder: true,
        text: `${index === 1 ? '' : ++index + '. '}${text}`,
        indent: 1
      })
    }

    result.items = result.items.filter(el => el.toOrder)

    result.tasks = taskDet.tasks.map(e => ({
      task: `${index === 0 && taskDet.tasks.length === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  },
  getPosName: async function (id, pDate, isMilitary, femaleName) {
    function getNameValue (caseCode, data) {
      const name = data[`fullName${caseCode}`]
      const nameF = femaleName ? data[`fullName${caseCode}F`] : ''
      return nameF || name
    }
    const obj = {
      posName: '',
      posNameGen: '',
      posNameDat: '',
      militaryRank: '',
      tarifCode: '',
      isOrgBoss: false,
      mi_treePath: ''
    }
    if (!id) {
      return obj
    }
    const position = await UB.Repository('hr_position')
      .attrs(['mi_data_id'])
      .misc({ __mip_recordhistory_all: true })
      .selectById(id || 0)

    if (!position || !position.mi_data_id) {
      return ''
    }

    const atts = ['isOrgBoss', 'fullNameGen', 'fullNameDat', 'fullName', 'mi_treePath']
    if (femaleName) {
      atts.push(...['fullNameGenF', 'fullNameDatF'])
    }
    if (isMilitary) {
      atts.push('dictMilitaryRankID.name')
      atts.push('dictTarifCoeffID.code')
    }

    for (let k = 0; k < 2; k++) {
      const empPosition = UB.Repository('hr_position')
        .attrs(atts)
        .where('mi_data_id', '=', position.mi_data_id || 0)
        .where('state', '=', 'ACTIVE')
        .where('mi_deleteDate', '>=', '#maxdate')
      if (k === 0) {
        empPosition.misc({ __mip_ondate: pDate })
      } else {
        empPosition
          .misc({ __mip_recordhistory_all: true })
          .orderBy('mi_dateFrom', 'desc')
          .orderBy('mi_dateTo', 'desc')
      }

      const empPositionData = await empPosition.selectAsObject()
      if (empPositionData && empPositionData.length > 0) {
        obj.isOrgBoss = empPositionData[0]['isOrgBoss'] || false
        obj.posName = HR.reportUtils.makePositionName(empPositionData[0][`fullName`] || '', obj.isOrgBoss)
        obj.posNameGen = HR.reportUtils.makePositionName(getNameValue('Gen', empPositionData[0]), obj.isOrgBoss)
        obj.posNameDat = HR.reportUtils.makePositionName(getNameValue('Dat', empPositionData[0]), obj.isOrgBoss)
        obj.militaryRank = isMilitary ? empPositionData[0]['dictMilitaryRankID.name'] || '' : ''
        obj.tarifCode = isMilitary ? empPositionData[0]['dictTarifCoeffID.code'] || '' : ''
        obj.mi_treePath = empPositionData[0]['mi_treePath'] || ''
        k = 2
      }
    }
    return obj
  },
  findOrderInfo: async function (orderID, paraID) {
    const config = [{
      type: 'VACATION',
      ub: 'hr_empOrderVacationListDet',
      attr: ['ID', 'empOrderType', 'dictVacationKindID.nameLoc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
        'dictVacationKindID.byArticle', 'dictVacationKindID.isTempVacancy', 'dateFrom', 'dateTo'],
      alias: {}
    }, {
      type: 'VACATIONLONG',
      ub: 'hr_empOrderVacationlongDet',
      attr: ['ID', 'empOrderType', 'dictVacationKindID.nameLoc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
        'dictVacationKindID.byArticle', 'dictVacationKindID.isTempVacancy', 'dateFrom', 'dateTo'],
      alias: {}
    }, {
      type: 'VACATIONPROLONGL',
      ub: 'hr_empOrderVacationprolonglDet',
      attr: ['ID', 'empOrderType', 'primeVacationParaID.dictVacationKindID.nameLoc', 'primeVacationParaID.dictVacationKindID.nameGen',
        'primeVacationParaID.dictVacationKindID.name', 'primeVacationParaID.dictVacationKindID.byArticle', 'primeVacationParaID.dictVacationKindID.isTempVacancy',
        'primeVacationParaID.dateFrom', 'dateTo'], // дата начала с оригинального приказа, а дата окончания с приказа продолжения
      alias: {
        'primeVacationParaID.dictVacationKindID.nameLoc': 'dictVacationKindID.nameLoc',
        'primeVacationParaID.dictVacationKindID.nameGen': 'dictVacationKindID.nameGen',
        'primeVacationParaID.dictVacationKindID.name': 'dictVacationKindID.name',
        'primeVacationParaID.dictVacationKindID.byArticle': 'dictVacationKindID.byArticle',
        'primeVacationParaID.dictVacationKindID.isTempVacancy': 'dictVacationKindID.isTempVacancy',
        'primeVacationParaID.dateFrom': 'dateFrom'
      }
    }, {
      type: 'MILSERVICE',
      ub: 'hr_empOrderMilserviceDet',
      attr: ['ID', 'empOrderType', 'dateFrom', 'dateTo'],
      alias: {}
    }]
    if (!orderID || !paraID) {
      return undefined
    }

    const empOrderType = await UB.Repository('hr_empOrderDet')
      .attrs('empOrderType')
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('orderID', '=', orderID)
      .where('ID', '=', paraID)
      .selectScalar()

    const flt = _.find(config, { type: empOrderType })
    if (!flt) {
      return undefined
    }
    const orderDet = await UB.Repository(flt.ub)
      .attrs(flt.attr)
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('ID', '=', paraID)
      .selectSingle(flt.alias)

    return orderDet
  }
}
