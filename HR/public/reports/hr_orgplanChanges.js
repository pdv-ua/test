/* global Ext _ UB AC HR appAC $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    let ID = reportParams.orderID
    let staffTableID = reportParams.staffTableID || 0
    let onDate = reportParams.onDate || appAC.globalApplicationDate()
    let orderState
    let docType = ''
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      delData: [],
      addData: [],
      departmentName: '',
      respName: '',
      fundName: '',
      progClassName: '',
      totalFunsSumToWord: '',
      printSignerInfo: true,
      byFundSource: false,
      printNotMajorChanges: false,
      signData: [],
      agreeData: [],
      approverData: [],
      dataPC: [],
      title1: UB.i18n('П&nbsp;Е&nbsp;Р&nbsp;Е&nbsp;Л&nbsp;І&nbsp;К&nbsp; &nbsp;З&nbsp;М&nbsp;І&nbsp;Н'),
      title2: '',
      heightTitle2: 24,
      ecoPrintPlan: (reportParams.ecoPrint !== undefined) ? reportParams.ecoPrint : false,
      onlyRows: false // (reportParams.onlyRows !== undefined) ? reportParams.onlyRows : false
    }

    let dictFundSourceID = null
    let departmentID = null

    if (reportParams.caller && reportParams.caller.record) {
      const reco = reportParams.caller.record
      ID = reco.get('ID')
      onDate = AC.dateService.shiftDate(reco.get('orderDate'))
      dictFundSourceID = reco.get('dictFundSourceID')
      departmentID = reco.get('departmentID')
      result.ecoPrintPlan = reportParams.caller && reportParams.caller.attr.ecoPrint ? reportParams.caller.attr.ecoPrint.getValue() || false : false
      result.onlyRows = reportParams.caller && reportParams.caller.attr.onlyRows ? reportParams.caller.attr.onlyRows.getValue() || false : false
    }
    result.emptyDate = result.ecoPrintPlan ? UB.i18n('"_____"_________________ 20___ р.') : UB.i18n('"_____"_______________ 20___ р.')

    if (!ID) {
      return result
    }
    let organizationID
    let groupJobsPrint = true
    let staffTable
    if (staffTableID) {
      // Виклик з меню "Накази за штатним розписом"
      const order = await HR.reportUtils.getEmpOrder(ID, ['orderState'])
      if (!order) {
        return result
      }
      staffTable = await UB.Repository('hr_staffTable')
        .attrs(['groupJobsPrint', 'docType', 'printSignerInfo', 'printNotMajorChanges', 'dictFundSourceID', 'entryOrderID.entryDate',
          'departmentID', 'docInfo', 'staffTableID', 'staffTableID.entryOrderID.entryDate', 'changeListNumber', 'byFundSource',
          'entryOrderEntryDate', 'respPositionID', 'respEmployeePositionID', 'respPosition2ID', 'respEmployeePosition2ID',
          'respPosition3ID', 'respEmployeePosition3ID', 'respPosition4ID', 'respEmployeePosition4ID', 'respPosition5ID', 'respEmployeePosition5ID'])
        .misc({ __mip_recordhistory_all: true })
        .misc({ __allowSelectSafeDeleted: true })
        .selectById(staffTableID)
      result.entryOrderEntryDate = staffTable.entryOrderEntryDate ? UB.i18n('Вводиться з {0}&nbsp;р.', AC.dateService.formatDate(staffTable.entryOrderEntryDate)) : 'Вводиться з __________________________'
      result.entryDate = staffTable['entryOrderID.entryDate']
      result.staffTableEntryDate = staffTable['staffTableID.entryOrderID.entryDate']
      groupJobsPrint = staffTable.groupJobsPrint || false
      if (!dictFundSourceID && staffTable && staffTable.dictFundSourceID) {
        dictFundSourceID = staffTable.dictFundSourceID
      }

      if (!departmentID && staffTable && staffTable.departmentID) {
        departmentID = staffTable.departmentID
      }
      docType = staffTable.docType || ''
      organizationID = order.organizationID || 0
      onDate = onDate || order.orderDate
      orderState = order.orderState || ''
      result.printSignerInfo = staffTable ? staffTable.printSignerInfo : result.printSignerInfo
      result.byFundSource = staffTable ? staffTable.byFundSource : result.byFundSource
      result.printNotMajorChanges = staffTable ? staffTable.printNotMajorChanges : result.printNotMajorChanges
      result.changeListNumber = staffTable.changeListNumber ? `№ ${staffTable.changeListNumber} ` : ''

      // result.organizationName = order['organizationID.name']
      // result.organizationNameGen = order['organizationID.nameGen'] || result.organizationName

      result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '', UB.i18n(' р.'))
      result.year = onDate.getFullYear()
      await HR.reportUtils.getOrderPrintConfig(result, order.organizationID)

      const respPosInfo = await HR.reportUtils.getResponsiblesIncaseInfo(order.respEmployeePositionID, order.orderDate || order.entryDate)
      if (respPosInfo && respPosInfo.respName) {
        result.respName = (respPosInfo && respPosInfo.respName) || ''
      }
    } else {
      // Виклик з меню "Планування штатного розпису"
      staffTableID = ID
      staffTable = await UB.Repository('hr_staffTable')
        .attrs(['orgID', 'orderDate', 'orderState', 'orgID.name', 'orgID.nameGen', 'entryOrderID.entryDate', 'byFundSource',
          'changeListNumber', 'groupJobsPrint', 'docType', 'printSignerInfo', 'printNotMajorChanges', 'dictFundSourceID',
          'departmentID', 'docInfo', 'staffTableID', 'staffTableID.entryOrderID.entryDate', 'entryOrderEntryDate',
          'respPositionID', 'respEmployeePositionID', 'respPosition2ID', 'respEmployeePosition2ID',
          'respPosition3ID', 'respEmployeePosition3ID', 'respPosition4ID', 'respEmployeePosition4ID', 'respPosition5ID', 'respEmployeePosition5ID'])
        .joinCondition('orgID.mi_dateFrom', '<=', onDate)
        .joinCondition('orgID.mi_dateTo', '>=', onDate)
        .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
        .selectById(ID)
      if (staffTable) {
        organizationID = staffTable.orgID
        dictFundSourceID = staffTable.dictFundSourceID || 0
        departmentID = staffTable.departmentID || 0
        // result.organizationName = staffTable['orgID.name']
        // result.organizationNameGen = staffTable['orgID.nameGen'] || result.organizationName
        result.orderDate = AC.dateService.getStringFormatDate(staffTable.orderDate, '', '', UB.i18n(' р.'))
        orderState = staffTable.orderState || ''
        docType = staffTable.docType || ''
        result.entryOrderEntryDate = staffTable.entryOrderEntryDate ? UB.i18n('Вводиться з {0}&nbsp;р.', AC.dateService.formatDate(staffTable.entryOrderEntryDate)) : 'Вводиться з __________________________'
        result.entryDate = staffTable['entryOrderID.entryDate']
        result.staffTableEntryDate = staffTable['staffTableID.entryOrderID.entryDate']
        result.changeListNumber = staffTable.changeListNumber ? `№ ${staffTable.changeListNumber} ` : ''
        result.year = onDate.getFullYear()
        groupJobsPrint = staffTable.groupJobsPrint || false
        result.printSignerInfo = staffTable ? staffTable.printSignerInfo : result.printSignerInfo
        result.byFundSource = staffTable ? staffTable.byFundSource : result.byFundSource
        result.printNotMajorChanges = staffTable ? staffTable.printNotMajorChanges : result.printNotMajorChanges
        await HR.reportUtils.getOrderPrintConfig(result, organizationID)
      }
    }
    if (docType === 'ACCRUAL' || docType === 'ACCRUAL_CHANGES') {
      result.byFundSource = false
    }

    if (!reportParams || reportParams.docInfo === undefined) {
      result.docInfo = (staffTable && staffTable.docInfo) || '' // AC.settings.get('hrDocInfoForOrgstruct', appAC.globalOrganization())
    } else {
      result.docInfo = reportParams.docInfo || ''
    }
    result.docInfo = result.docInfo ? result.docInfo.split('/').map(el => { return { text: el } }) : []

    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    if (dictFundSourceID) {
      const fundSource = await UB.Repository('ac_dictFundSource')
        .attrs(['dictFundTypeID.name'].concat($App.domainInfo.entities.ac_dictFundSource.dictProgClassID ? ['dictProgClassID.description'] : []))
        .where('organizationID', '=', organizationID)
        .where('fundSourceID', '=', dictFundSourceID)
        .selectSingle()
      result.fundName = HR.nameCase.cap(fundSource && fundSource['dictFundTypeID.name'] ? fundSource['dictFundTypeID.name'] + UB.i18n(' фонд') : '')
      result.progClassName = HR.nameCase.cap((fundSource && fundSource['dictProgClassID.description']) || '')
      if (fundSource) {
        const fundSource = await UB.Repository('ac_fundSource')
          .attrs(['dictFundTypeID.name'])
          .where('fundSourceID', '=', dictFundSourceID)
          .selectSingle()
        result.fundName = HR.nameCase.cap(fundSource && fundSource['dictFundTypeID.name'] ? fundSource['dictFundTypeID.name'] + UB.i18n(' фонд') : '')
      }
    }

    const orgIDs = [organizationID]
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.separateRounding = settingsOrg.separateRounding
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.showAccrual = settingsOrg.hrStaffReportShowAccrual
    result.showCategory = settingsOrg.hrStaffReportShowAccrual
    result.twoApprover = settingsOrg.twoApprover
    result.shortNamePayEl = settingsOrg.shortNamePayEl
    result.colSpan = result.showAccrual ? 9 : 6
    result.colSpan2 = result.showAccrual ? 8 : 5
    result.colSpan3 = Math.ceil((result.colSpan - 2) / 2)
    result.colSpan4 = result.colSpan - 2 - result.colSpan3
    result.tableWidth = result.ecoPrintPlan && result.showAccrual ? 600 : 640
    result.tableOrientation = /* result.showAccrual ? 'landscape' : */ 'portrait'
    result.showTotals = settingsOrg.showTotals
    result.namePosition = settingsOrg.namePosition
    result.fontSizeH = result.ecoPrintPlan ? 12 : 14
    result.fontSizeT = result.ecoPrintPlan ? 10 : 12
    result.rowHeightDefault = result.ecoPrintPlan ? 24 : 26
    result.rowHeightHead = result.ecoPrintPlan ? 44 : 56

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate, organizationID, false)
    if (orgs && orgs.length) {
      result.organizationName = HR.nameCase.cap(orgs[0].nameGen || orgs[0].name || '')
      if (orgs[0].parentUnitID && (orgs[0]['parentUnitID.shortName@hr_organization'] || orgs[0]['parentUnitID.name@hr_organization'])) {
        result.organizationName = HR.nameCase.cap(orgs[0].shortName || orgs[0].name || '')
        result.organizationName2 = orgs[0]['parentUnitID.shortName@hr_organization'] || orgs[0]['parentUnitID.name@hr_organization']
      }
    }
    const resultByFundSource = {
      showAccrual: result.showAccrual,
      colSpan: result.colSpan,
      tableWidth: result.tableWidth,
      dataFundSource: []
    }
    const dictFundSourceIDs = dictFundSourceID ? [dictFundSourceID] : []

    const deptData = await HR.reportUtils.getDepartmentTypeNames(orgIDs, onDate, departmentID, ['nameDat'])

    const agreedOrg = await HR.reportUtils.getStaffAgreedOrgName(organizationID)
    if (agreedOrg) {
      result.agreedOrg = agreedOrg
    }

    if (result.showAccrual) {
      const previousOrders = []
      if (staffTable.staffTableID) {
        const previousStaffTables = await UB.Repository('hr_staffTable')
          .attrs(['entryOrderID.entryDate'])
          .where('staffTableID', '=', staffTable.staffTableID)
          .where('ID', '<>', staffTableID)
          .where('orderState', '=', 'POSTED')
          .whereIf(result.entryDate, 'entryOrderID.entryDate', '<', result.entryDate)
          .orderBy('entryOrderID.orderDate')
          .selectAsObject()
        _.forEach(previousStaffTables, item => {
          if (item['entryOrderID.entryDate']) {
            const date = AC.dateService.formatDate(item['entryOrderID.entryDate']) + `&nbsp;${UB.i18n('р.')}`
            if (previousOrders.indexOf(date) === -1) {
              previousOrders.push(date)
            }
          }
        })
      }
      let previousOrdersList = ''
      for (let i = 0; i < previousOrders.length; i++) {
        if (i === 0) {
          previousOrdersList = previousOrders[i]
        } else {
          previousOrdersList += (i === previousOrders.length - 1 ? UB.i18n(' та ') : ', ') + previousOrders[i]
        }
      }
      // result.previousOrders.join(', ')

      result.staffTableEntryDate = result.staffTableEntryDate ? AC.dateService.formatDate(result.staffTableEntryDate) + `&nbsp;${UB.i18n('р.')}` : ''
      result.title2 = UB.i18n(`до штатного розпису, затвердженого {0}{1}`, result.staffTableEntryDate || `_________________ ${UB.i18n('р.')}`, previousOrdersList ? ' та переліків змін до нього, затверджених ' + previousOrdersList : '')
      result.heightTitle2 = previousOrders.length <= 2 ? 24 : 24 * (1 + Math.ceil(previousOrders.length / 6))
    } else {
      result.title1 = `Зміни ${result.changeListNumber}до штатного розпису на ${result.year} рік`
    }

    if (result.printSignerInfo && staffTable) {
      const par = {
        respPositionID1: staffTable.respPositionID,
        respEmp1: staffTable.respEmployeePositionID,
        respPositionID2: staffTable.respPosition2ID,
        respEmp2: staffTable.respEmployeePosition2ID,
        respPositionID3: staffTable.respPosition3ID,
        respEmp3: staffTable.respEmployeePosition3ID,
        respPositionID4: result.twoApprover ? staffTable.respPosition4ID : null,
        respEmp4: result.twoApprover ? staffTable.respEmployeePosition4ID : null,
        respPositionID5: staffTable.respPosition5ID,
        respEmp5: staffTable.respEmployeePosition5ID
      }
      await HR.orgStructReportUtils.getSingers(result, par, onDate)

      let maxLen = result.showAccrual ? 70 : 55
      let rowHeight = 22
      result.signData.forEach(el => {
        el.emptyDate = result.emptyDate
        el.rowHeight = el.posName && el.posName.length > maxLen ? rowHeight * Math.ceil(el.posName.length / maxLen) : rowHeight
      })

      maxLen = result.showAccrual ? 60 : 40
      rowHeight = 26
      result.agreeData.forEach((el, idx) => {
        el.emptyDate = result.emptyDate
        el.rowHeight = el.posName && el.posName.length > maxLen ? rowHeight * Math.ceil(el.posName.length / maxLen) : rowHeight
        result[idx === 0 ? 'agreeDataFirst' : 'agreeDataSecond'] = el
      })
      result.approverData.forEach(el => {
        el.emptyDate = result.emptyDate
        el.approverRowHeight = el.approverPosName && el.approverPosName.length > maxLen ? rowHeight * Math.ceil(el.approverPosName.length / maxLen) : rowHeight
        if (result['agreeDataFirst']) {
          el.approverRowHeight = Math.max(el.approverRowHeight, result['agreeDataFirst'].rowHeight)
        }
        result['approvedDataFirst'] = el
        if (el.approverOrgID === organizationID) {
          el.approverOrgName = ''
        }
      })
    }

    /* Старі посади на onDate. Вважається, що нові зміни будуть введені в дію датою onDate */
    const oldOnDate = (orderState === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
    const oldOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'liquidate', 'mi_treePath',
        'staffOrderID', 'quantity', 'state'])
      .where('orgID', '=', organizationID)
      .where('mi_dateFrom', '<=', oldOnDate)
      .where('mi_dateTo', '>=', oldOnDate)
      .where('state', '=', 'ACTIVE')
      .where('liquidate', '=', 0)
      .whereIf(departmentID, 'mi_treePath', 'like', '/' + departmentID + '/')
      .selectAsObject()

    const ids = oldOrgStruct.filter(orgItem => orgItem.mi_unityEntity === 'hr_position').map(orgItem => orgItem.mi_data_id)
    let posOld = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
        'positionType', 'quantity', 'mi_treePath', 'paymentType', 'name', 'dictPositionID.dictProfessionID.code', 'comment'])
      .attrsIf(result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
      .attrsIf(dictFundSourceID || result.byFundSource, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity'])
      .where('orgID', 'in', orgIDs)
      .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
      .where('mi_data_id', 'in', ids)
      .misc({ __mip_ondate: oldOnDate })
      .where('state', '=', 'ACTIVE')
    if (dictFundSourceID || result.byFundSource) {
      posOld.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
    }
    posOld = await posOld.selectAsObject()

    const oldPositionAccrualData = result.showAccrual ? await UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID.name',
        'payElID.shortPrintName', 'calcSum'])
      .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
      .where('positionID.mi_dateFrom', '<=', oldOnDate)
      .where('positionID.mi_dateTo', '>=', oldOnDate)
      .where('positionID.state', '=', 'ACTIVE')
      .where('payElID.methodID.code', '<>', '144')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject({
        'positionID.parentUnitID': 'parentUnitID',
        'payElID.name': 'payElName',
        'payElID.shortPrintName': 'shortPayElName'
      }) : []

    const posOldByFundSource = result.byFundSource && posOld && posOld.length ? _.groupBy(posOld, 'fundSourcePositionID.dictFundSourceID') : { 'null': posOld || [] }
    if (result.byFundSource) {
      for (var key in posOldByFundSource) {
        if (key && key !== 'null') {
          dictFundSourceIDs.push(key)
        }
      }
    }
    let fundSourceData = []
    if (dictFundSourceIDs.length) {
      const rowsQuery = Object.assign({
        entity: 'ac_fundSource',
        method: 'selectByOrg',
        fieldList: ['ID', 'name', 'dictFundTypeName', 'dictProgClass']
      }, {
        orgID: organizationID,
        IDs: dictFundSourceIDs
      })
      fundSourceData = await UB.connection.runTransAsObject([rowsQuery])
      fundSourceData = (fundSourceData && fundSourceData[0] && fundSourceData[0].resultData) || []
    }
    _.forEach(posOldByFundSource, (posDataItems, key) => {
      const theObjResult = Object.assign({}, result)
      theObjResult.dictFundSourceID = key // posDataItems[0]['fundSourcePositionID.dictFundSourceID']
      if (posDataItems.length && posDataItems[0]['fundSourcePositionID.dictFundSourceID']) {
        const afundSource = _.find(fundSourceData, { ID: posDataItems[0]['fundSourcePositionID.dictFundSourceID'] })
        if (afundSource) {
          theObjResult.fundName = afundSource.dictFundTypeName ? afundSource.dictFundTypeName + UB.i18n(' фонд') : ''
          theObjResult.progClassName = afundSource.dictProgClass || ''
          theObjResult.fundSourceName = afundSource.name || ''
        }
        theObjResult.npp = 1
      } else if (result.byFundSource) {
        theObjResult.fundSourceName = UB.i18n('Джерело не вказано')
        theObjResult.npp = 2
      }

      const treeOld = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, oldOrgStruct, posDataItems, [], groupJobsPrint,
        result.roundTo, result.roundToQuantity, 0, false, true, false, false, false,
        oldPositionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)

      theObjResult.oldTotalQuantity = treeOld.quantity
      theObjResult.roundToOldTotalQuantity = result.roundToQuantity || HR.reportUtils.getQuantityFractional(treeOld.quantity)
      theObjResult.oldTotalBasepay = treeOld.basepay
      theObjResult.oldTotalBasepay5 = treeOld.basepay5
      theObjResult.oldTotalFundpay = treeOld.fundSum

      if (!result.onlyRows && result.showCategory && treeOld && treeOld.data) {
        theObjResult.dataPC = HR.reportUtils.generateDataForStructReportByPositionCategory(treeOld.data, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], result.roundTo, result.roundToQuantity, [{
          name: 'showAccrual',
          value: result.showAccrual
        }])
      }
      resultByFundSource.dataFundSource.push(theObjResult)
    })

    if ((docType === 'ACCRUAL' || docType === 'ACCRUAL_CHANGES') && orderState !== 'POSTED') {
      const orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate)
      if (!orgStruct) {
        return resultByFundSource // result
      }
      // result.newTotalFundpay = 0
      // result.newTotalQuantity = 0
      // группировки по джерелам тут не должно быть
      const theObjResult = resultByFundSource.dataFundSource[0]

      const posData = await UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
          'positionType', 'quantity', 'mi_treePath', 'paymentType', 'name', 'dictPositionID.dictProfessionID.code', 'comment'])
        .attrsIf(result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
        .where('orgID', 'in', orgIDs)
        .where('liquidate', '=', 0)
        .where('mi_dateFrom', '<=', onDate, 'dateFrom')
        .where('mi_dateTo', '>=', onDate, 'dateTo')
        .where('state', '=', 'ACTIVE', 'active')
        .where('staffOrderID', '=', staffTableID, 'order')
        .notExists(UB.Repository('hr_staffUnit')
          .correlation('mi_data_id', 'mi_data_id')
          .where('staffOrderID', '=', staffTableID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.fullName')
        .orderBy('dictPositionID.name')
        .selectAsObject()

      const positionAccrualData = result.showAccrual ? await UB.Repository('hr_positionAccrual')
        .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID.name',
          'payElID.shortPrintName', 'calcSum'])
        .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
        .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
        .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
        .where('positionID.state', '=', 'ACTIVE', 'active')
        .where('payElID.methodID.code', '<>', '144')
        .where('positionID.staffOrderID', '=', staffTableID, 'order')
        .notExists(UB.Repository('hr_staffUnit')
          .correlation('ID', 'positionID')
          .where('staffOrderID', '=', staffTableID)
          .where('mi_deleteDate', '>=', '#maxdate'),
        'notExist')
        .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
        .misc({ __mip_recordhistory_all: true })
        // .where('dateFrom', '<=', onDate)
        // .where('dateTo', '>=', onDate)
        .selectAsObject({
          'positionID.parentUnitID': 'parentUnitID',
          'payElID.name': 'payElName',
          'payElID.shortPrintName': 'shortPayElName'
        }) : []

      const accrualData = await UB.Repository('hr_staffTableAccrual')
        .attrs(['dictPositionID', 'dictStatePayID', 'positionType', 'accrualSum', 'staffTableAccrualID', 'positionID'])
        .where('staffTableID', '=', staffTableID)
        .selectAsObject()

      const changePosData = posData.filter(posItem => {
        const orgItem = orgStruct ? _.find(orgStruct, { mi_data_id: posItem.mi_data_id }) : undefined
        let accrualItem = accrualData.find(item => item.dictPositionID === posItem.dictPositionID &&
          item.positionID === posItem.ID && item.staffTableAccrualID &&
          ((posItem.dictStatePayID && item.dictStatePayID === posItem.dictStatePayID && item.positionType === posItem.positionType) ||
            (!posItem.dictStatePayID && !item.dictStatePayID && item.positionType === posItem.positionType)))

        accrualItem = accrualItem || accrualData.find(item => item.dictPositionID === posItem.dictPositionID &&
          !item.staffTableAccrualID &&
          ((posItem.dictStatePayID && item.dictStatePayID === posItem.dictStatePayID && item.positionType === posItem.positionType) ||
            (!posItem.dictStatePayID && !item.dictStatePayID && item.positionType === posItem.positionType)))

        orgItem.accrualSum = orgItem.accrualSum || 0 // if old value is null
        return accrualItem && _.isNumber(accrualItem.accrualSum) && _.isNumber(orgItem.accrualSum) && accrualItem.accrualSum !== orgItem.accrualSum
      })
      const chgTreeIds = HR.treeUtils.treePathAsArray(changePosData)
      const changeOrgStruct = chgTreeIds && chgTreeIds.length ? orgStruct.filter(item => {
        return chgTreeIds.indexOf(item.mi_data_id.toString()) !== -1
      }) : []

      changeOrgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
        const deptItem = _.find(deptData, { ID: item.ID })
        item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
      })

      let tree = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, changeOrgStruct, changePosData, [], groupJobsPrint,
        result.roundTo, result.roundToQuantity, 0, false, true, false, false, false,
        positionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)
      theObjResult.delData = tree && tree.data ? tree.data : []
      if (result.onlyRows) {
        theObjResult.delData = theObjResult.delData.filter(el => !el.isTotal && !el.isDepartment)
        // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
        theObjResult.delData.filter(el => el.paymentType).forEach(el => {
          el.paymentType = ''
        })
      }
      theObjResult.delTotals = tree && tree.data ? {
        roundTo: result.roundTo,
        roundToQuantity: result.roundToQuantity || HR.reportUtils.getQuantityFractional(tree.quantity),
        totalDelQuantity: tree.quantity,
        totalDelFundpay: tree.fundSum,
        totalDelBasepay: tree.basepay,
        totalDelBasepay5: tree.basepay5
      } : undefined
      if (!result.onlyRows && result.showCategory && tree && tree.data) {
        const dataPC = HR.reportUtils.generateDataForStructReportByPositionCategory(tree.data, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], result.roundTo, result.roundToQuantity, [{ name: 'showAccrual', value: result.showAccrual }])
        me.sumCategory(theObjResult.dataPC, dataPC, result.roundToQuantity, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], false)
      }

      tree = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, changeOrgStruct, changePosData, accrualData, groupJobsPrint,
        result.roundTo, result.roundToQuantity, 0, false, true, false, false, false,
        positionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)

      theObjResult.addData = tree && tree.data ? tree.data : []
      if (result.onlyRows) {
        theObjResult.addData = theObjResult.addData.filter(el => !el.isTotal && !el.isDepartment)
        // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
        theObjResult.addData.filter(el => el.paymentType).forEach(el => {
          el.paymentType = ''
        })
      }

      theObjResult.addTotals = tree && tree.data ? {
        roundTo: result.roundTo,
        roundToQuantity: result.roundToQuantity || HR.reportUtils.getQuantityFractional(tree.quantity),
        totalAddQuantity: tree.quantity,
        totalAddFundpay: tree.fundSum,
        totalAddBasepay: tree.basepay,
        totalAddBasepay5: tree.basepay5
      } : undefined
      if (!result.onlyRows && result.showCategory && tree && tree.data) {
        const dataPC = HR.reportUtils.generateDataForStructReportByPositionCategory(tree.data, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], result.roundTo, result.roundToQuantity, [{ name: 'showAccrual', value: result.showAccrual }])
        me.sumCategory(theObjResult.dataPC, dataPC, result.roundToQuantity, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], true)
      }
    } else {
      const newOrgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate, undefined, true)
      /* Старі посади на onDate. Вважається, що нові зміни будуть введені в дію датою onDate */
      // если надо показывать итогои по категории, то берем все изменения независимо от признака printNotMajorChanges
      const delUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && orgItem.liquidate && (result.showCategory || result.printNotMajorChanges || (!result.printNotMajorChanges && orgItem.isSecondaryChanges === 0)))
      const addUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && !orgItem.liquidate && (result.showCategory || result.printNotMajorChanges || (!result.printNotMajorChanges && orgItem.isSecondaryChanges === 0)))

      /* В addUnits знаходяться нові та змінені оргодиниці. Змінені оргодиниці з addUnits повинні також попадати в ліквідовані delUnits зі старими окладами */
      const changedUnits = []
      const changedUnitIds = [0]
      addUnits.forEach(addUnit => {
        if (orderState === 'POSTED') {
          addUnit.state = 'NEW'
        }
        const currDataID = addUnit.mi_data_id
        const oldUnit = _.find(oldOrgStruct, { mi_data_id: currDataID })
        if (oldUnit) {
          oldUnit.isSecondaryChanges = addUnit.isSecondaryChanges // признак возьмем со текущего объекта
          oldUnit.state = addUnit.state // признак возьмем со текущего объекта
          // addUnit.state = 'ACTIVE' // убирем признак NEW
          changedUnits.push(oldUnit)
          changedUnitIds.push(currDataID)
        }
      })

      const delTreeIds = HR.treeUtils.treePathAsArray(delUnits)
      const chgTreeIds = HR.treeUtils.treePathAsArray(changedUnits)
      const delStruct = []
      let delPos = []
      let existsNotActiveDepartment = false
      newOrgStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity === 'hr_department' && orgItem.state !== 'ACTIVE') {
          existsNotActiveDepartment = true
        }
        const currDataID = orgItem.mi_data_id
        const currDataIDStr = currDataID.toString()
        if (delTreeIds.includes(currDataIDStr)) {
          delStruct.push(orgItem)
        } else if (chgTreeIds.includes(currDataIDStr)) {
          const addUnitToDel = _.find(changedUnits, { mi_data_id: currDataID })
          if (addUnitToDel) {
            delStruct.push(addUnitToDel)
          } else {
            delStruct.push(orgItem)
          }
        }
      })
      const addTreeIds = HR.treeUtils.treePathAsArray(addUnits)
      const addStruct = []
      let addPos = []
      let addPosByFundSource = []
      let delPosByFundSource = []
      newOrgStruct.forEach(orgItem => {
        if (addTreeIds.includes(orgItem.mi_data_id.toString())) {
          addStruct.push(orgItem)
        }
      })

      const hrStaffChangesMtCountSum = AC.settings.get('hrStaffChangesMtCountSum', organizationID)
      let addPositionAccrualData = []
      let delPositionAccrualData = []
      let dictFundSourceIDsAddOrDel = []
      if (addStruct.length) {
        addPos = UB.Repository('hr_position')
          .attrs(['ID', 'mi_data_id', 'parentUnitID', 'staffOrderID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name',
            'quantity', 'mi_treePath', 'paymentType', 'name', 'dictPositionID.dictProfessionID.code', 'comment'])
          .attrsIf(result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
          .attrsIf(dictFundSourceID || result.byFundSource, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity', 'fundSourcePositionID.isChanged'])
          .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
          .where('orgID', '=', organizationID)
          .where('staffOrderID', '=', staffTableID)
          .where('liquidate', '=', 0)
          .misc({ __mip_recordhistory_all: true })
          .orderBy('dictPositionID.fullName')
          .orderBy('dictPositionID.name')

        if (dictFundSourceID || result.byFundSource) {
          addPos.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
        }
        addPos = await addPos.selectAsObject()

        if (result.showAccrual) {
          addPositionAccrualData = await UB.Repository('hr_positionAccrual')
            .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID.name',
              'payElID.shortPrintName', 'calcSum'])
            .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
            .where('positionID.liquidate', '=', 0)
            .where('positionID.staffOrderID', '=', staffTableID)
            .where('payElID.methodID.code', '<>', '144')
            .misc({ __mip_recordhistory_all: true })
            // .where('positionID.mi_dateFrom', '<=', onDate)
            // .where('positionID.mi_dateTo', '>=', onDate)
            .where('positionID.mi_deleteDate', '>=', '#maxdate')
            .selectAsObject({
              'positionID.parentUnitID': 'parentUnitID',
              'payElID.name': 'payElName',
              'payElID.shortPrintName': 'shortPayElName'
            })
        }
      }

      if (delStruct.length) {
        delPos = UB.Repository('hr_position')
          .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name',
            'quantity', 'mi_treePath', 'paymentType', 'name', 'dictPositionID.dictProfessionID.code', 'comment'])
          .attrsIf(result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
          .attrsIf(dictFundSourceID || result.byFundSource, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity', 'fundSourcePositionID.isChanged'])
          .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
          .where('orgID', '=', organizationID)
          .where('staffOrderID', '=', staffTableID)
          .where('liquidate', '=', 1)
          .misc({ __mip_recordhistory_all: true })
          .orderBy('dictPositionID.fullName')
          .orderBy('dictPositionID.name')
        if (dictFundSourceID || result.byFundSource) {
          delPos.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
        }
        delPos = await delPos.selectAsObject()

        if (result.showAccrual) {
          delPositionAccrualData = await UB.Repository('hr_positionAccrual')
            .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID.name',
              'payElID.shortPrintName', 'calcSum'])
            .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
            .where('positionID.liquidate', '=', 1)
            .where('positionID.staffOrderID', '=', staffTableID)
            .where('payElID.methodID.code', '<>', '144')
            .misc({ __mip_recordhistory_all: true })
            // .where('positionID.mi_dateFrom', '<=', onDate)
            // .where('positionID.mi_dateTo', '>=', onDate)
            .where('positionID.mi_deleteDate', '>=', '#maxdate')
            .selectAsObject({
              'positionID.parentUnitID': 'parentUnitID',
              'payElID.name': 'payElName',
              'payElID.shortPrintName': 'shortPayElName'
            })
        }
        let chgPos = await UB.Repository('hr_position')
          .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name',
            'quantity', 'mi_treePath', 'paymentType', 'name', 'dictPositionID.dictProfessionID.code', 'comment'])
          .attrsIf(result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
          .attrsIf(dictFundSourceID || result.byFundSource, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity', 'fundSourcePositionID.isChanged'])
          .whereIf(dictFundSourceID, 'positionID.fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
          .where('orgID', '=', organizationID)
          .where('staffOrderID', '=', staffTableID)
          .where('mi_data_id', 'in', changedUnitIds)
          .misc({ __mip_recordhistory_all: true })
          .orderBy('dictPositionID.fullName')
          .orderBy('dictPositionID.name')
        if (dictFundSourceID || result.byFundSource) {
          chgPos.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
        }
        chgPos = await chgPos.selectAsObject()
        if (chgPos.length) {
          const chgToDelPos = []
          const notToAddPosIDs = []
          let chgOldPos = await UB.Repository('hr_position')
            .attrs(['ID', 'mi_data_id', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity', 'paymentType',
              'name', 'dictPositionID.dictProfessionID.code', 'comment'])
            .attrsIf(result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
            .attrsIf(dictFundSourceID || result.byFundSource, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity', 'fundSourcePositionID.isChanged'])
            .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
            .where('orgID', '=', organizationID)
            .where('mi_data_id', 'in', changedUnitIds)
            .where('state', '=', 'ACTIVE')
            .misc({ __mip_ondate: oldOnDate })
          if (dictFundSourceID || result.byFundSource) {
            chgOldPos.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
          }
          chgOldPos = await chgOldPos.selectAsObject()

          let chgPositionAccrualData = []
          if (result.showAccrual) {
            chgPositionAccrualData = await UB.Repository('hr_positionAccrual')
              .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID.name',
                'payElID.shortPrintName', 'calcSum'])
              .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
              .where('positionID', 'in', chgOldPos.map(el => el.ID))
              .where('payElID.methodID.code', '<>', '144')
              .misc({ __mip_recordhistory_all: true })
              // .where('positionID.mi_dateFrom', '<=', (orderState === 'POSTED') ? oldOnDate : onDate)
              // .where('positionID.mi_dateTo', '>=', (orderState === 'POSTED') ? oldOnDate : onDate)
              .where('positionID.mi_deleteDate', '>=', '#maxdate')
              .selectAsObject({
                'positionID.parentUnitID': 'parentUnitID',
                'payElID.name': 'payElName',
                'payElID.shortPrintName': 'shortPayElName'
              })
          }

          // Для змінених вузлів назву та кількість треба брати з попереднього старого запису
          chgPos.forEach(chgPosItem => {
            const oldPosItem = (dictFundSourceID || result.byFundSource)
              ? _.find(chgOldPos, { mi_data_id: chgPosItem.mi_data_id, 'fundSourcePositionID.dictFundSourceID': chgPosItem['fundSourcePositionID.dictFundSourceID'] })
              : _.find(chgOldPos, { mi_data_id: chgPosItem.mi_data_id })
            chgPosItem.found = !!oldPosItem
            if (oldPosItem) {
              chgPosItem['dictPositionID.fullName'] = oldPosItem['dictPositionID.fullName']
              chgPosItem['dictPositionID.name'] = oldPosItem['dictPositionID.name']
              chgPosItem['dictPositionID.dictProfessionID.code'] = oldPosItem['dictPositionID.dictProfessionID.code']

              if (result.showCategory) {
                chgPosItem['positionCategory'] = oldPosItem['positionCategory']
                chgPosItem['positionCategory.sortOrder'] = oldPosItem['positionCategory.sortOrder']
                chgPosItem['positionCategory.name'] = oldPosItem['positionCategory.name']
              }
              if (dictFundSourceID || result.byFundSource) {
                chgPosItem['fundSourcePositionID.ID'] = oldPosItem['fundSourcePositionID.ID']
                chgPosItem['fundSourcePositionID.dictFundSourceID'] = oldPosItem['fundSourcePositionID.dictFundSourceID']
                chgPosItem['fundSourcePositionID.quantity'] = oldPosItem['fundSourcePositionID.quantity']
              }

              chgPosItem.name = oldPosItem.name
              chgPosItem.quantity = oldPosItem.quantity
              chgPosItem.paymentType = oldPosItem.paymentType
              chgPosItem.comment = oldPosItem.comment

              const fltAccural = chgPositionAccrualData.filter(el => el.positionID === oldPosItem.ID)
              _.forEach(fltAccural, acc => {
                acc.positionID = chgPosItem.ID
              })
            }

            /* UBHR-9881, при встановленій константі "Перелік змін. Підсумовувати кількість ставок" - виводити лише різницю кількості ставок */
            if (hrStaffChangesMtCountSum) {
              const existedAddPos = addPos.find(addPosItem => addPosItem.mi_data_id === chgPosItem.mi_data_id)
              if (existedAddPos) {
                const qntDiff = existedAddPos.quantity - chgPosItem.quantity
                if (qntDiff < 0) {
                  chgPosItem.quantity = (-1) * qntDiff
                  chgToDelPos.push(chgPosItem)
                  notToAddPosIDs.push(existedAddPos.mi_data_id)
                } else if (qntDiff > 0) {
                  existedAddPos.quantity = qntDiff
                } else {
                  chgToDelPos.push(chgPosItem)
                }
              } else {
                chgToDelPos.push(chgPosItem)
              }
            } else {
              chgToDelPos.push(chgPosItem)
            }
          })
          // поищем удаленные записи с джерелами
          if (result.byFundSource) {
            chgOldPos.forEach(chgPosItem => {
              const pos = _.find(chgPos, { mi_data_id: chgPosItem.mi_data_id, 'fundSourcePositionID.dictFundSourceID': chgPosItem['fundSourcePositionID.dictFundSourceID'] })
              // если не нашли, то ее удалили и это надо показать
              if (!pos) {
                chgPosItem['fundSourcePositionID.isChanged'] = true
                chgPosItem.found = true
                chgToDelPos.push(chgPosItem)
              }
            })
          }

          delPositionAccrualData.push(...chgPositionAccrualData)

          if (chgToDelPos.length) {
            delPos.push(...chgToDelPos.filter(el => el.found))
          }
          if (hrStaffChangesMtCountSum && notToAddPosIDs.length) {
            addPos = addPos.filter(addPosItem => !notToAddPosIDs.includes(addPosItem.mi_data_id))
          }
        }
      }

      addPosByFundSource = result.byFundSource && addPos && addPos.length ? _.groupBy(addPos, 'fundSourcePositionID.dictFundSourceID') : { 'null': addPos || [] }
      if (result.byFundSource) {
        for (let key in addPosByFundSource) {
          if (key && key !== 'null') {
            dictFundSourceIDsAddOrDel.push(key)
          }
        }
      }

      delPosByFundSource = result.byFundSource && delPos && delPos.length ? _.groupBy(delPos, 'fundSourcePositionID.dictFundSourceID') : { 'null': delPos || [] }
      if (result.byFundSource) {
        for (let key in delPosByFundSource) {
          if (key && key !== 'null') {
            dictFundSourceIDsAddOrDel.push(key)
          }
        }
      }

      dictFundSourceIDsAddOrDel = dictFundSourceIDsAddOrDel.filter(el => dictFundSourceIDs.indexOf(el) === -1)
      // Если появились новые записи Джерел
      if (dictFundSourceIDsAddOrDel.length) {
        const rowsQuery = Object.assign({
          entity: 'ac_fundSource',
          method: 'selectByOrg',
          fieldList: ['ID', 'name', 'dictFundTypeName', 'dictProgClass']
        }, {
          orgID: organizationID,
          IDs: dictFundSourceIDsAddOrDel
        })
        let aData = await UB.connection.runTransAsObject([rowsQuery])
        aData = (aData && aData[0] && aData[0].resultData) || []
        _.forEach(aData, afundSource => {
          const theObjResult = Object.assign({}, result)
          theObjResult.dictFundSourceID = afundSource.ID
          theObjResult.fundName = afundSource.dictFundTypeName ? afundSource.dictFundTypeName + UB.i18n(' фонд') : ''
          theObjResult.progClassName = afundSource.dictProgClass || ''
          theObjResult.fundSourceName = afundSource.name || ''
          theObjResult.oldTotalQuantity = 0
          theObjResult.roundToOldTotalQuantity = result.roundToQuantity || HR.reportUtils.getQuantityFractional(0)
          theObjResult.oldTotalBasepay = 0
          theObjResult.oldTotalBasepay5 = 0
          theObjResult.oldTotalFundpay = 0
          resultByFundSource.dataFundSource.push(theObjResult)
        })
      }

      if (delStruct.length) {
        delStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
          const deptItem = _.find(deptData, { ID: item.ID })
          item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
        })
      }
      if (addStruct.length) {
        addStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
          const deptItem = _.find(deptData, { ID: item.ID })
          item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
        })
      }

      // строим дерево если были имзенения в посаде
      // при печати по джерелам: новые подразделения у которых нет посад (нет джерел) выводятся для всех джерел
      // если у новой посады есть посада, то тогда новое подразеделение должно выводится только в том джереле(джерелах) которое есть в посаде

      _.forEach(resultByFundSource.dataFundSource, resultItem => {
        if (delStruct.length) {
          if (delPosByFundSource[resultItem.dictFundSourceID] || existsNotActiveDepartment || orderState === 'POSTED') {
            const treeStruct = []
            if (existsNotActiveDepartment && !result.printNotMajorChanges) {
              _.forEach(delStruct, orgItem => {
                const newOrgItem = Object.assign({}, orgItem)
                if (orgItem.mi_unityEntity === 'hr_department' && orgItem.state !== 'ACTIVE') {
                  const fnd = delPos.length === 0
                    ? _.find(changedUnits, { mi_data_id: orgItem.mi_data_id })
                    : delPos.find(posItem => posItem.mi_treePath.includes(orgItem.mi_treePath) &&
                    ((posItem['fundSourcePositionID.dictFundSourceID'] ? posItem['fundSourcePositionID.dictFundSourceID'] + '' : 'null') !== resultItem.dictFundSourceID))
                  if (fnd) {
                    newOrgItem.state = 'ACTIVE'
                  }
                }
                treeStruct.push(newOrgItem)
              })
            } else {
              treeStruct.push(...delStruct)
            }
            let tree
            if (result.showCategory || result.printNotMajorChanges) {
              // чтобы выводились все подразделения для проведенного ШР
              tree = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, treeStruct, delPosByFundSource[resultItem.dictFundSourceID] || [], [], groupJobsPrint,
                result.roundTo, result.roundToQuantity, /* result.showAccrual ? */ result.showTotals ? 2 : 1 /*: 0 */, false, true, false, false, false,
                delPositionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)
              resultItem.delData = tree && tree.data ? tree.data : []
              if (result.onlyRows) {
                resultItem.delData = resultItem.delData.filter(el => !el.isTotal && !el.isDepartment)
                // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
                resultItem.delData.filter(el => el.paymentType).forEach(el => {
                  el.paymentType = ''
                })
              }

              if (!result.onlyRows) {
                const dataPC = HR.reportUtils.generateDataForStructReportByPositionCategory(tree.data, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], result.roundTo, result.roundToQuantity, [{
                  name: 'showAccrual',
                  value: result.showAccrual
                }])
                me.sumCategory(resultItem.dataPC, dataPC, result.roundToQuantity, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], false)
              }
            }
            // второй раз для отображения изменеий, если надо выводить в ПФ только основные имзенения
            if (!result.printNotMajorChanges) {
              const changesItems = treeStruct.filter(orgItem => {
                const isSecondaryChanges = orgItem.isSecondaryChanges === undefined || orgItem.isSecondaryChanges === null ? 1 : orgItem.isSecondaryChanges
                return isSecondaryChanges === 0
              })
              const changesIds = changesItems.map(orgItem => orgItem.mi_data_id)
              const ids = HR.treeUtils.treePathAsArray(changesItems)
              tree = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, treeStruct.filter(orgItem => ids.indexOf(orgItem.mi_data_id + '') !== -1), (delPosByFundSource[resultItem.dictFundSourceID] || []).filter(orgItem => (!result.byFundSource || resultItem.dictFundSourceID === 'null' || (result.byFundSource && orgItem['fundSourcePositionID.isChanged'])) && changesIds.indexOf(orgItem.mi_data_id) !== -1), [], groupJobsPrint,
                result.roundTo, result.roundToQuantity, /* result.showAccrual ? */ result.showTotals ? 2 : 1 /*: 0 */, false, true, false, false, false,
                delPositionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)
              resultItem.delData = tree && tree.data ? tree.data : []
              if (result.onlyRows) {
                resultItem.delData = resultItem.delData.filter(el => !el.isTotal && !el.isDepartment)
                // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
                resultItem.delData.filter(el => el.paymentType).forEach(el => {
                  el.paymentType = ''
                })
              }
            }

            resultItem.delTotals = tree && tree.data && tree.data.length // (tree.quantity || tree.fundSum || tree.basepay || tree.basepay5)
              ? {
                roundTo: result.roundTo,
                roundToQuantity: result.roundToQuantity || HR.reportUtils.getQuantityFractional(tree.quantity),
                totalDelQuantity: tree.quantity,
                totalDelFundpay: tree.fundSum,
                totalDelBasepay: tree.basepay,
                totalDelBasepay5: tree.basepay5
              } : undefined
          }
        }
        if (addStruct.length) {
          if (addPosByFundSource[resultItem.dictFundSourceID] || existsNotActiveDepartment || orderState === 'POSTED') {
            const treeStruct = []
            if (existsNotActiveDepartment && !result.printNotMajorChanges) {
              _.forEach(addStruct, orgItem => {
                const newOrgItem = Object.assign({}, orgItem)
                if (orgItem.mi_unityEntity === 'hr_department' && orgItem.state !== 'ACTIVE') {
                  const fnd = addPos.length === 0
                    ? _.find(changedUnits, { mi_data_id: orgItem.mi_data_id })
                    : addPos.find(posItem => posItem.mi_treePath.includes(orgItem.mi_treePath) &&
                    ((posItem['fundSourcePositionID.dictFundSourceID'] ? posItem['fundSourcePositionID.dictFundSourceID'] + '' : 'null') !== resultItem.dictFundSourceID))
                  if (fnd) {
                    newOrgItem.state = 'ACTIVE'
                  }
                }
                treeStruct.push(newOrgItem)
              })
            } else {
              treeStruct.push(...addStruct)
            }

            let tree
            if (result.showCategory || result.printNotMajorChanges) {
              tree = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, treeStruct, addPosByFundSource[resultItem.dictFundSourceID] || [], [], groupJobsPrint,
                result.roundTo, result.roundToQuantity, /* result.showAccrual ? */ result.showTotals ? 2 : 1 /*: 0 */, false, true, false, false, false,
                addPositionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)
              resultItem.addData = tree && tree.data ? tree.data : []
              if (result.onlyRows) {
                resultItem.addData = resultItem.addData.filter(el => !el.isTotal && !el.isDepartment)
                // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
                resultItem.addData.filter(el => el.paymentType).forEach(el => {
                  el.paymentType = ''
                })
              }

              if (!result.onlyRows) {
                const dataPC = HR.reportUtils.generateDataForStructReportByPositionCategory(tree.data, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], result.roundTo, result.roundToQuantity, [{
                  name: 'showAccrual',
                  value: result.showAccrual
                }])
                me.sumCategory(resultItem.dataPC, dataPC, result.roundToQuantity, ['fundSum', 'basepayQuantity', 'basepay5Quantity'], true)
              }
            }
            // второй раз для отображения изменеий, если надо выводить в ПФ только основные имзеенения
            if (!result.printNotMajorChanges) {
              const changesItems = treeStruct.filter(orgItem => {
                const isSecondaryChanges = orgItem.isSecondaryChanges === undefined || orgItem.isSecondaryChanges === null ? 1 : orgItem.isSecondaryChanges
                return isSecondaryChanges === 0
              })
              const changesIds = changesItems.map(orgItem => orgItem.mi_data_id)
              const ids = HR.treeUtils.treePathAsArray(changesItems)
              tree = HR.reportUtils.generateDataForStructReport('orgPlanChanges', organizationID, organizationID, treeStruct.filter(orgItem => ids.indexOf(orgItem.mi_data_id + '') !== -1), (addPosByFundSource[resultItem.dictFundSourceID] || []).filter(orgItem => (!result.byFundSource || resultItem.dictFundSourceID === 'null' || (result.byFundSource && orgItem['fundSourcePositionID.isChanged'])) && changesIds.indexOf(orgItem.mi_data_id) !== -1), [], groupJobsPrint,
                result.roundTo, result.roundToQuantity, /* result.showAccrual ? */ result.showTotals ? 2 : 1 /*: 0 */, false, true, false, false, false,
                addPositionAccrualData, result.showAccrual, result.namePosition, result.colSpan, false, result.ecoPrintPlan, result.shortNamePayEl, result.separateRounding)
              resultItem.addData = tree && tree.data ? tree.data : []
              if (result.onlyRows) {
                resultItem.addData = resultItem.addData.filter(el => !el.isTotal && !el.isDepartment)
                // уберем текст 'Згідно умов трудового договору', чтобы не было группировки полей
                resultItem.addData.filter(el => el.paymentType).forEach(el => {
                  el.paymentType = ''
                })
              }
            }
            resultItem.addTotals = tree && tree.data && tree.data.length // (tree.quantity || tree.fundSum || tree.basepay || tree.basepay5)
              ? {
                roundTo: result.roundTo,
                roundToQuantity: result.roundToQuantity || HR.reportUtils.getQuantityFractional(tree.quantity),
                totalAddQuantity: tree.quantity,
                totalAddFundpay: tree.fundSum,
                totalAddBasepay: tree.basepay,
                totalAddBasepay5: tree.basepay5
              } : undefined
          }
        }
      })
    }

    let i = 1
    // сортируем и проставляем разрыв страницы и делаем рассчеты
    resultByFundSource.dataFundSource.sort((a, b) => (a.npp > b.npp) ? 1 : -1)
    _.forEach(resultByFundSource.dataFundSource, resultItem => {
      resultItem.isPageBreak = i < _.size(resultByFundSource.dataFundSource)
      i++

      if (resultItem.dataPC.length) {
        resultItem.dataPC[0].name = UB.i18n('Усього підлягає затвердженню:')
        resultItem.dataPC = _.sortBy(resultItem.dataPC.filter(el => el.quantity !== 0 || el.basepayQuantity !== 0 || el.basepay5Quantity !== 0 || el.fundSum !== 0), 'sortOrder')
      }
      _.forEach(resultItem.delData, el => {
        el.colSpan2 = result.colSpan2
      })
      _.forEach(resultItem.addData, el => {
        el.colSpan2 = result.colSpan2
      })

      const newTotalQuantity = resultItem.oldTotalQuantity - (resultItem.delTotals ? resultItem.delTotals.totalDelQuantity : 0) + (resultItem.addTotals ? resultItem.addTotals.totalAddQuantity : 0)
      const newTotalFundpay = resultItem.oldTotalFundpay - (resultItem.delTotals ? resultItem.delTotals.totalDelFundpay : 0) + (resultItem.addTotals ? resultItem.addTotals.totalAddFundpay : 0)
      const newTotalBasepay = resultItem.oldTotalBasepay - (resultItem.delTotals ? resultItem.delTotals.totalDelBasepay : 0) + (resultItem.addTotals ? resultItem.addTotals.totalAddBasepay : 0)
      const newTotalBasepay5 = resultItem.oldTotalBasepay5 - (resultItem.delTotals ? resultItem.delTotals.totalDelBasepay5 : 0) + (resultItem.addTotals ? resultItem.addTotals.totalAddBasepay5 : 0)

      resultItem.roundToQuantity = resultItem.roundToQuantity || HR.reportUtils.getQuantityFractional(newTotalQuantity)
      resultItem.newTotalQuantity = newTotalQuantity
      resultItem.newTotalQuantityStr = HR.reportUtils.quantityToString(newTotalQuantity, result.roundToQuantity)
      resultItem.newTotalFundpay = AC.currencyService.round(newTotalFundpay || 0, result.roundTo === 'numberGroup' ? 0 : 2)
      resultItem.newTotalBasepay = AC.currencyService.round(newTotalBasepay || 0, result.roundTo === 'numberGroup' ? 0 : 2)
      resultItem.newTotalBasepay5 = AC.currencyService.round(newTotalBasepay5 || 0, result.roundTo === 'numberGroup' ? 0 : 2)
      resultItem.newTotalFundpayStr = HR.reportUtils.quantityToString(resultItem.newTotalFundpay, result.roundTo)
      resultItem.totalFunsSumToWord = HR.orgStructReportUtils.fundSumToStr(resultItem.newTotalFundpay, result.roundTo)
    })
    return resultByFundSource
  },
  onParamPanelConfig: function () {
    const report = this
    const docInfo = (report.incomeParams && report.incomeParams.docInfo) || ''
    const ecoPrint = (report.incomeParams && report.incomeParams.ecoPrint) || false
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'ubcombobox',
              readOnly: true,
              name: 'empOrderID',
              fieldLabel: UB.i18n('Наказ штатного розпису'),
              labelWidth: 180,
              gridFieldList: ['description'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_empOrder',
                fieldList: ['ID', 'description', 'staffTableID', 'staffTableID.docInfo', 'orderDate'],
                whereList: {
                  organizationID: {
                    expression: '[organizationID]',
                    condition: 'in',
                    values: {
                      value: [0]
                    }
                  },
                  empOrderType: {
                    expression: '[empOrderType]',
                    condition: '=',
                    values: {
                      value: 'STAFFLIST'
                    }
                  }
                },
                orderList: { orderBy: { expression: 'description' } }
              },
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const docInfo = form.down('[name=docInfo]')
                  const docInfovalue = ctrl.getFieldValue('staffTableID.docInfo') || ''
                  docInfo.setValue(docInfovalue)
                },
                render: function (ctrl) {
                  const orgID = appAC.globalOrganization()
                  const onDate = appAC.globalApplicationDate()
                  HR.treeUtils.getChildOrgsPromise(orgID, onDate).then(data => {
                    const childOrgIDs = [orgID]
                    data.forEach(orgItem => {
                      childOrgIDs.push(orgItem.mi_data_id)
                    })
                    ctrl.store.ubRequest.whereList.organizationID.values.value = childOrgIDs
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        if (report.incomeParams.staffTableID) {
                          ctrl.setValueById(report.incomeParams.orderID)
                        } else {
                          const staffTableID = report.incomeParams.orderID
                          const storeItems = ctrl.store.data.items
                          const selItem = _.find(storeItems, { data: { staffTableID: staffTableID } })
                          if (selItem) {
                            ctrl.setValue(selItem.data.ID)
                          }
                        }
                      }
                    })
                    ctrl.store.load({ start: 0, limit: 10000, page: 1 })
                  })
                }
              }
            },
            {
              xtype: 'textfield',
              name: 'docInfo',
              fieldLabel: UB.i18n('Затверджено документом'),
              labelWidth: 180,
              value: docInfo
            },
            {
              xtype: 'checkbox',
              name: 'ecoPrint',
              fieldLabel: UB.i18n('Екодрук'),
              labelWidth: 180,
              value: ecoPrint
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const empOrderID = frm.findField('empOrderID')
        const reco = AC.gridUtils.getCurrentRecord(empOrderID)
        const staffTableID = reco && reco.get('staffTableID')
        const onDate = (reco && reco.get('orderDate')) ? AC.dateService.shiftDate(reco.get('orderDate')) : undefined
        const params = {
          orderID: empOrderID.getValue() || 0,
          staffTableID: staffTableID || 0,
          onDate: onDate,
          docInfo: frm.findField('docInfo').getValue(),
          ecoPrint: frm.findField('ecoPrint').getValue()
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    return paramForm
  },
  sumCategory: function (dataPC, values, roundToQuantity, sumArray, add) {
    _.forEach(values, item => {
      if (dataPC.length === 0) {
        dataPC.push(Object.assign({}, item))
      } else {
        const obj = _.find(dataPC, { ID: item.ID })
        if (obj) {
          obj.quantity += item.quantity * (add ? 1 : -1)
          obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)

          _.forEach(sumArray, itemName => {
            obj[itemName] += item[itemName] * (add ? 1 : -1)
          })
        } else {
          const newObj = Object.assign({}, item)
          _.forEach(sumArray, itemName => {
            newObj[itemName] = item[itemName] * (add ? 1 : -1)
          })
          dataPC.push(newObj)
        }
      }
    })
  }
}
