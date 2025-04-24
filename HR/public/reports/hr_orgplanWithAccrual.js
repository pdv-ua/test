/* global Ext _ UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const organizationID = appAC.globalOrganization()
    const result = {
      data: [],
      departmentName: '',
      fundName: '',
      progClassName: '',
      fundSourceName: '',
      totalFunsSumToWord: '',
      showCategory: (reportParams.showCategory !== undefined) ? reportParams.showCategory : true,
      showWokers: (reportParams.showWokers !== undefined) ? reportParams.showWokers : true,
      printSignerInfo: false,
      byFundSource: false,
      signData: [],
      agreeData: [],
      approverData: [],
      colNameRow1: [],
      colNameRow2: [],
      colNameRow2Exist: false,
      colNames2: [],
      colNums: [],
      monthsFop: (reportParams.monthsFop !== undefined) ? reportParams.monthsFop : 6,
      showFop: ((reportParams.monthsFop !== undefined) ? reportParams.monthsFop : 6) !== 0,
      showNn: true
    }
    result.monthsFopStr = result.monthsFop ? `${result.monthsFop}&nbsp;${AC.dateService.plural(UB.i18n('місяць_місяці_місяців'), result.monthsFop)}` : ''

    let paramStaffTableID = reportParams.staffTableID
    let staffTableID = paramStaffTableID
    let departmentID = null
    let dictFundSourceID = null
    let onDate = reportParams.onDate

    if (reportParams.caller && reportParams.caller.record) {
      const reco = reportParams.caller.record
      paramStaffTableID = reportParams.instanceID
      staffTableID = reco.get('staffTableID') || paramStaffTableID
      dictFundSourceID = reco.get('dictFundSourceID')
      departmentID = reco.get('departmentID')
      onDate = AC.dateService.shiftDate(reco.get('orderDate'))
      result.printSignerInfo = reco.get('printSignerInfo')
      result.byFundSource = reco.get('byFundSource')
    }

    const staffTable = await UB.Repository('hr_staffTable')
      .attrs(['orderDate', 'groupJobsPrint', 'printSignerInfo', 'dictFundSourceID', 'departmentID', 'docInfo',
        'byFundSource', 'entryOrderEntryDate', 'respPositionID', 'respEmployeePositionID',
        'respPosition2ID', 'respEmployeePosition2ID', 'respPosition3ID', 'respEmployeePosition3ID',
        'respPosition4ID', 'respEmployeePosition4ID', 'respPosition5ID', 'respEmployeePosition5ID'])
      .misc({ __mip_recordhistory_all: true })
      .selectById(staffTableID)
    result.entryOrderEntryDate = staffTable.entryOrderEntryDate ? UB.i18n('Вводиться з {0}&nbsp;р.', AC.dateService.formatDate(staffTable.entryOrderEntryDate)) : 'Вводиться з __________________________'
    if (!onDate) {
      if ((staffTable && staffTable.orderDate)) {
        onDate = AC.dateService.shiftDate(staffTable.orderDate)
      } else {
        onDate = appAC.globalApplicationDate()
      }
    }
    if (!reportParams || reportParams.docInfo === undefined) {
      result.docInfo = staffTable.docInfo || ''
    } else {
      result.docInfo = reportParams.docInfo || ''
    }
    result.docInfo = result.docInfo ? result.docInfo.split('/').map(el => { return { text: el } }) : []

    const nextOnDate = AC.dateService.addDays(onDate, 1)
    const accrualDataConfig = await HR.orgStructReportUtils.getColumnsAccrualData(nextOnDate, result)
    const minConfig = await HR.orgStructReportUtils.getConfigAddToMinimum(organizationID, onDate, accrualDataConfig)

    for (let i = 1; i <= result.colNames2.length + 6 + (result.showNn ? 1 : 0) + (result.showFop ? 1 : 0); i++) {
      result.colNums.push({ name: i, cs: !result.showNn && i === 1 ? 2 : 1 })
    }
    result.colSpan = result.colNums.length + (result.showNn ? 0 : 1)
    result.colSpanPaymentType = accrualDataConfig.length
    result.colSpan2 = Math.ceil(result.colSpan / 2) //  < 4 ? 4 : Math.ceil(result.colSpan / 2)
    result.colSpan1 = result.colSpan - 1 - result.colSpan2
    result.colSpan3 = Math.ceil(result.colSpan / 2)
    result.colSpan4 = result.colSpan - result.colSpan3
    result.tableWidth = 860 + (result.showFop ? 100 : 0) + (accrualDataConfig.length * 100)

    if (!dictFundSourceID && staffTable && staffTable.dictFundSourceID) {
      dictFundSourceID = staffTable.dictFundSourceID
    }
    if (!departmentID && staffTable && staffTable.departmentID) {
      departmentID = staffTable.departmentID
    }
    const groupJobsPrint = staffTable && staffTable.groupJobsPrint
    result.printSignerInfo = staffTable ? staffTable.printSignerInfo : result.printSignerInfo
    result.byFundSource = staffTable ? staffTable.byFundSource : result.byFundSource
    result.year = onDate.getFullYear()
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    const orgIDs = [organizationID]
    const orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate, undefined, false, departmentID)
    if (!orgStruct) {
      return result
    }
    const deptData = await HR.reportUtils.getDepartmentTypeNames(orgIDs, onDate, departmentID, ['nameDat'])
    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = _.find(deptData, { ID: item.ID })
      item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    })

    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }

    let posData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
        'positionType', 'quantity', 'paymentType', 'dictPositionID.dictProfessionID.code', 'name', 'departmentID', 'dictStaffCatID',
        'dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictSalarySchemeLevelID', 'dictSalarySchemeLevelID.name'])
      .attrsIf(result.showWokers || result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
      .attrsIf(dictFundSourceID || result.byFundSource, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity'])
      .where('orgID', 'in', orgIDs)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('staffOrderID', '=', staffTableID, 'order')
      .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .misc({ __mip_recordhistory_all: true })
    if (dictFundSourceID || result.byFundSource) {
      posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
    }
    posData = await posData.selectAsObject()

    const posDataByFundSource = result.byFundSource && posData && posData.length ? _.groupBy(posData, 'fundSourcePositionID.dictFundSourceID') : { 'null': posData || [] }

    const dictFundSourceIDs = dictFundSourceID ? [dictFundSourceID] : []
    if (result.byFundSource) {
      for (var key in posDataByFundSource) {
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

    const accrualData = await UB.Repository('hr_staffTableAccrual')
      .attrs(['dictPositionID', 'dictStatePayID', 'positionType', 'accrualSum', 'staffTableAccrualID', 'positionID'])
      .where('staffTableID', '=', paramStaffTableID)
      .selectAsObject()

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.separateRounding = settingsOrg.separateRounding
    result.showTotals = settingsOrg.showTotals
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.twoApprover = settingsOrg.twoApprover
    result.shortNamePayEl = settingsOrg.shortNamePayEl
    result.namePosition = settingsOrg.namePosition
    result.showCategory = settingsOrg.hrFuncOrgType !== '2' ? result.showCategory : false
    result.showWokers = settingsOrg.hrFuncOrgType !== '2' ? result.showWokers : false
    result.colSpan3 = Math.ceil((result.colSpan - 2) / 2)
    result.colSpan4 = result.colSpan - 2 - result.colSpan3

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate, organizationID, false)
    if (orgs && orgs.length) {
      result.organizationName = HR.nameCase.cap(orgs[0].nameGen || orgs[0].name || '')
      if (orgs[0].parentUnitID && (orgs[0]['parentUnitID.shortName@hr_organization'] || orgs[0]['parentUnitID.name@hr_organization'])) {
        result.organizationName = HR.nameCase.cap(orgs[0].shortName || orgs[0].name || '')
        result.organizationName2 = orgs[0]['parentUnitID.shortName@hr_organization'] || orgs[0]['parentUnitID.name@hr_organization']
      }
    }

    const positionAccrualData = await UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'positionID.parentUnitID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.name',
        'payElID.shortPrintName', 'calcSum'])
      .whereIf(organizationID, 'positionID.orgID', 'in', organizationID)
      .where('positionID.mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('positionID.mi_dateTo', '>=', onDate, 'dateTo')
      .where('positionID.state', '=', 'ACTIVE', 'active')
      .where('positionID.staffOrderID', '=', staffTableID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('ID', 'positionID')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject({
        'positionID.parentUnitID': 'parentUnitID',
        'payElID.name': 'payElName',
        'payElID.shortPrintName': 'shortPayElName'
      })

    await HR.orgStructReportUtils.fillPositionByTarifAndSchemeInfo(posData, onDate)

    const agreedOrg = await HR.reportUtils.getStaffAgreedOrgName(organizationID)
    if (agreedOrg) {
      result.agreedOrg = agreedOrg
    }

    if (result.printSignerInfo) {
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

      let maxLen = 70
      let rowHeight = 22
      result.signData.forEach(el => {
        el.rowHeight = el.posName && el.posName.length > maxLen ? rowHeight * Math.ceil(el.posName.length / maxLen) : rowHeight
      })

      maxLen = 60
      rowHeight = 26
      result.agreeData.forEach((el, idx) => {
        el.rowHeight = el.posName && el.posName.length > maxLen ? rowHeight * Math.ceil(el.posName.length / maxLen) : rowHeight
        result[idx === 0 ? 'agreeDataFirst' : 'agreeDataSecond'] = el
      })
      result.approverData.forEach(el => {
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

    const resultByFundSource = {
      showAccrual: result.showAccrual,
      colSpan: result.colSpan,
      tableWidth: result.tableWidth,
      dataFundSource: []
    }

    _.forEach(posDataByFundSource, posDataItems => {
      const theObjResult = Object.assign({}, result)
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
      const config = {
        roundTo: result.roundTo,
        roundToQuantity: result.roundToQuantity,
        showWokers: result.showWokers,
        groupJobsPrint: groupJobsPrint,
        namePosition: result.namePosition,
        colSpanPaymentType: result.colSpanPaymentType,
        colSpan: result.colSpan,
        monthsFop: result.monthsFop,
        showLevelTotals: result.showTotals ? 2 : 1,
        showNn: result.showNn,
        shortNamePayEl: result.shortNamePayEl,
        showDeptCodes: false,
        separateRounding: result.separateRounding
      }
      const tree = HR.orgStructReportUtils.generateDataForReportWithAccrual(organizationID, departmentID || organizationID, orgStruct, accrualData, posDataItems, positionAccrualData, accrualDataConfig, minConfig, config)
      theObjResult.data = tree && tree.data ? tree.data : []
      theObjResult.totalQuantityStr = HR.reportUtils.quantityToString(tree.total.quantity, tree.total.roundToQuantity)
      theObjResult.totalFunsSumStr = HR.reportUtils.quantityToString(tree.total.fundSum, result.roundTo)
      theObjResult.totalFunsSumToWord = HR.orgStructReportUtils.fundSumToStr(tree.total.fundSum, result.roundTo)

      HR.orgStructReportUtils.setZeroToNullValue(theObjResult.data)
      theObjResult.dataPC = result.showCategory ? HR.orgStructReportUtils.generateGroupedData(theObjResult.data, UB.i18n('Всього за категоріями персоналу'), 'positionCategoryName', UB.i18n('Без категорії'), 'positionCategorySortOrder', accrualDataConfig.length, ['fundSumByMonths', 'fundSum'], result.roundTo, result.roundToQuantity, result.showNn, false, false, result.showFop, false, true) : []
      resultByFundSource.dataFundSource.push(theObjResult)
    })

    // сортируем и проставляем разрыв страницы
    resultByFundSource.dataFundSource.sort((a, b) => (a.npp > b.npp) ? 1 : -1)
    let i = 1
    _.forEach(resultByFundSource.dataFundSource, theObjResult => {
      theObjResult.isPageBreak = i < _.size(resultByFundSource.dataFundSource)
      i++
    })

    return resultByFundSource
  },
  onParamPanelConfig: function () {
    const report = this
    const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
    const staffTableReadOnly = (this.incomeParams && this.incomeParams.staffTableReadOnly) || false
    const docInfo = (report.incomeParams && report.incomeParams.docInfo) || '' // C.settings.get('hrDocInfoForOrgstruct', appAC.globalOrganization()) || ''
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              readOnly: true,
              labelWidth: 190
            }),
            {
              xtype: 'ubcombobox',
              readOnly: staffTableReadOnly,
              name: 'staffTableID',
              fieldLabel: UB.i18n('Штатний розпис'),
              labelWidth: 190,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTable',
                fieldList: ['ID', 'description', 'docInfo'],
                whereList: {
                  orgID: {
                    expression: '[orgID]',
                    condition: '=',
                    values: {
                      value: appAC.globalOrganization()
                    }
                  }
                },
                orderList: { orderBy: { expression: 'orderDate' } }
              },
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const docInfo = form.down('[name=docInfo]')
                  const docInfovalue = ctrl.getFieldValue('docInfo') || ''
                  docInfo.setValue(docInfovalue)
                },
                render: function (ctrl) {
                  if (report.incomeParams && report.incomeParams.staffTableID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        ctrl.setValueById(report.incomeParams.staffTableID)
                      }
                    })
                    ctrl.store.load()
                  }
                }
              }
            },
            {
              xtype: 'textfield',
              name: 'docInfo',
              fieldLabel: UB.i18n('Затверджено документом'),
              labelWidth: 190,
              value: docInfo
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'numberfield',
                  name: 'monthsFop',
                  fieldLabel: UB.i18n('Кількість місяців для розрахунку ФОП'),
                  vtype: 'numberValidator',
                  labelWidth: 190,
                  width: 370,
                  minValue: 0,
                  maxValue: 1200,
                  value: 6
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showCategory',
                  fieldLabel: UB.i18n('Формувати підсумки по категоріям'),
                  labelWidth: 190,
                  value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
                  hidden: funcOrgType === '2'
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showWokers',
                  fieldLabel: UB.i18n('Окремо підсумки по робітникам'),
                  labelWidth: 230,
                  value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
                  hidden: funcOrgType === '2'
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const onDate = this.incomeParams && this.incomeParams.onDate
        const params = {
          staffTableID: frm.findField('staffTableID').getValue() || 0,
          onDate: onDate,
          showCategory: frm.findField('showCategory').getValue() === true,
          showWokers: frm.findField('showWokers').getValue() === true,
          docInfo: frm.findField('docInfo').getValue(),
          monthsFop: frm.findField('monthsFop').getValue()
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    return paramForm
  }
}
