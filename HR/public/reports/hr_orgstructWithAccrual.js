/* global Ext _ UB AC appAC HR $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const organizationID = appAC.globalOrganization()
    const onDate = reportParams.onDate || AC.dateService.todayDate()
    const result = await HR.orgStructReportUtils.getResultObj(reportParams)
    result.colNameRow1 = []
    result.colNameRow2 = []
    result.colNameRow2Exist = false
    result.colNames2 = []
    result.colNums = []
    result.approverData = []
    result.printSignerInfo = true
    result.byFundSource = false

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

    result.year = onDate.getFullYear()
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    const orgIDs = [organizationID]
    let orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum'])
      .where('liquidate', '=', 0)
      .where('state', '=', 'ACTIVE')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .whereIf(!organizationID, 'parentUnitID', 'isNotNull')
      .orderBy('idxNum')
    if (reportParams.departmentID && reportParams.includeChildDepts) {
      orgStruct
        .where('mi_treePath', 'like', '/' + reportParams.departmentID + '/', 'u1')
        .where('mi_data_id', '=', reportParams.departmentID, 'u2')
        .logic('([u1] or [u2])')
    }
    if (reportParams.departmentID && !reportParams.includeChildDepts) {
      orgStruct
        .where('parentUnitID', '=', reportParams.departmentID, 'u1')
        .where('mi_data_id', '=', reportParams.departmentID, 'u2')
        .where('mi_unityEntity', '=', 'hr_position', 'u3')
        .logic('(([u1] and [u3]) or [u2])')
    }

    orgStruct = await orgStruct.selectAsObject()
    if (!orgStruct) {
      return result
    }

    const deptData = await HR.reportUtils.getDepartmentTypeNames(orgIDs, onDate, reportParams.departmentID, ['nameDat'])
    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = _.find(deptData, { ID: item.ID })
      item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    })
    const departments = await HR.orgStructReportUtils.getDepartmentIDs(onDate, orgIDs, reportParams.departmentID, reportParams.includeChildDepts)

    let posData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
        'positionType', 'quantity', 'paymentType', 'dictPositionID.dictProfessionID.code', 'name', 'departmentID', 'dictStaffCatID',
        'dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictSalarySchemeLevelID', 'dictSalarySchemeLevelID.name'])
      .attrsIf(result.showWokers || result.showCategory, ['positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
      .attrsIf(reportParams.dictFundSourceID, ['fundSourcePositionID.ID', 'fundSourcePositionID.dictFundSourceID', 'fundSourcePositionID.quantity'])
      .where('orgID', 'in', orgIDs)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('state', '=', 'ACTIVE')
      .whereIf(reportParams.dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', reportParams.dictFundSourceID)
      .whereIf(reportParams.positionCategory, 'positionCategory', '=', reportParams.positionCategory)
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .misc({ __mip_recordhistory_all: true })
    if (reportParams.dictFundSourceID) {
      posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
    }
    posData = await posData.selectAsObject()

    const posDataByFundSource = result.byFundSource && posData && posData.length ? _.groupBy(posData, 'fundSourcePositionID.dictFundSourceID') : { 'null': posData || [] }

    const dictFundSourceIDs = reportParams.dictFundSourceID ? [reportParams.dictFundSourceID] : []
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

    // const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    // result.showTotals = settingsOrg.showTotals
    // result.roundTo = settingsOrg.roundTo
    // result.roundToQuantity = settingsOrg.roundToQuantity
    // result.twoApprover = settingsOrg.twoApprover
    // namePosition = settingsOrg.namePosition
    // result.showCategory = settingsOrg.hrFuncOrgType !== '2' ? result.showCategory : false
    // result.showWokers = settingsOrg.hrFuncOrgType !== '2' ? result.showWokers : false
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
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
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
    /*
    result.approverData.forEach(el => {
      el.approverRowHeight = el.approverPosName && el.approverPosName.length > maxLen ? rowHeight * Math.ceil(el.approverPosName.length / maxLen) : rowHeight
      if (result['agreeDataFirst']) {
        el.approverRowHeight = Math.max(el.approverRowHeight, result['agreeDataFirst'].rowHeight)
      }
      result['approvedDataFirst'] = el
    })
     */

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
        groupJobsPrint: result.groupPos,
        namePosition: result.namePosition,
        colSpanPaymentType: result.colSpanPaymentType,
        colSpan: result.colSpan,
        monthsFop: result.monthsFop,
        showLevelTotals: result.showTotals ? 2 : 1,
        showNn: result.showNn,
        showDeptCodes: result.showDeptCodes
      }
      const tree = HR.orgStructReportUtils.generateDataForReportWithAccrual(organizationID, reportParams.departmentID || organizationID, orgStruct, [], posDataItems, positionAccrualData, accrualDataConfig, minConfig, config)
      theObjResult.data = tree && tree.data ? tree.data : []
      theObjResult.totalQuantityStr = HR.reportUtils.quantityToString(tree.total.quantity, tree.total.roundToQuantity)
      theObjResult.totalFunsSumStr = HR.reportUtils.quantityToString(tree.total.fundSum, result.roundTo)
      theObjResult.totalFunsSumToWord = HR.orgStructReportUtils.fundSumToStr(tree.total.fundSum, result.roundTo)

      theObjResult.dataPC = result.showCategory ? HR.orgStructReportUtils.generateGroupedData(theObjResult.data, UB.i18n('Всього за категоріями персоналу'), 'positionCategoryName', UB.i18n('Без категорії'), 'positionCategorySortOrder', accrualDataConfig.length, ['fundSumByMonths', 'fundSum'], result.roundTo, result.roundToQuantity, result.showNn, false, false, result.showFop, false, true) : []

      HR.orgStructReportUtils.setZeroToNullValue(theObjResult.data)
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
    const me = this
    const organizationID = appAC.globalOrganization()
    const funcOrgType = AC.settings.get('hrFuncOrgType', organizationID)
    const docInfo = AC.settings.get('hrDocInfoForOrgstruct', organizationID) || ''
    const twoApprover = AC.settings.get('hrTwoApproverInStaffTable', organizationID) === true
    const incomeParams = this.incomeParams || {}

    me.paramForm = Ext.create('UBS.ReportParamForm', {
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
            HR.controlService.getCollapseInfoPanel('Звіт формується по даним по окладу та нарахуванням, які взяті з карток посад штатної книги станом на вказану дату.'),
            HR.controlService.getOrgCombo({
              labelWidth: 160,
              readOnly: true,
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const departmentID = form.down('[name=departmentID]')
                  const orgID = ctrl.getValue()
                  const whereList = [
                    ['orgID', '=', orgID || 0],
                    ['state', '=', 'ACTIVE']
                  ]
                  AC.viewUtils.setWhereListProperty(departmentID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                  departmentID.setDisabled(!orgID)
                }
              }
            }),
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 160,
                  displayField: 'description',
                  flex: 1,
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=includeChildDepts]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=includeChildDepts]').setValue()
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildDepts()
              ]
            },
            {
              xtype: 'ubcombobox',
              name: 'dictFundSourceID',
              fieldLabel: UB.i18n('Джерело фінансування'),
              labelWidth: 160,
              width: 500,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'name', 'description'],
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'ac_fundSource',
                method: 'selectByOrg',
                fieldList: ['ID', 'name', 'dictFundTypeName', 'dictProgClass']
              },
              listeners: {
                afterrender: function (ctrl) {
                  ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'positionCategory',
              fieldLabel: UB.i18n('Категорія посади'),
              labelWidth: 160,
              width: 500,
              valueField: 'code',
              displayField: 'name',
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'code', 'eGroup'],
                whereList: {
                  enumGroupFilter: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: {
                      val: 'HR_POSITION_CATEGORY'
                    }
                  }
                }
              }
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 160,
                  width: 270,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                },
                HR.reportUtils.roundToCombo({
                  labelWidth: 160,
                  width: 350,
                  defaultValue: 0,
                  simpleRound: true
                }),
                {
                  xtype: 'numberfield',
                  name: 'monthsFop',
                  fieldLabel: UB.i18n('Кількість місяців для розрахунку ФОП'),
                  vtype: 'numberValidator',
                  labelWidth: 280,
                  width: 370,
                  minValue: 0,
                  maxValue: 1200,
                  value: 0
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  name: 'showNn',
                  fieldLabel: UB.i18n('Колонка № з/п'),
                  labelWidth: 160,
                  width: 270,
                  value: true
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showCategory',
                  fieldLabel: UB.i18n('Формувати підсумки по категоріям'),
                  labelWidth: 250,
                  value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
                  hidden: funcOrgType === '2'
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  name: 'showDeptCodes',
                  fieldLabel: UB.i18n('Коди підрозділів'),
                  labelWidth: 160,
                  width: 270,
                  value: true
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showWokers',
                  fieldLabel: UB.i18n('Окремо підсумки по робітникам'),
                  labelWidth: 250,
                  value: funcOrgType !== '2', /* Сфера діяльності організації = Державна служба */
                  hidden: funcOrgType === '2'
                },
                {
                  xtype: 'checkboxfield',
                  name: 'groupPos',
                  fieldLabel: UB.i18n('Групувати посади'),
                  labelWidth: 160,
                  width: 220,
                  value: false
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  layout: {
                    type: 'vbox',
                    align: 'stretch'
                  },
                  flex: 1,
                  items: [
                    {
                      xtype: 'fieldset',
                      name: 'signer1',
                      layout: { type: 'vbox', align: 'stretch' },
                      margin: '5 0 5 10',
                      padding: '0 0 5 0',
                      flex: 1,
                      style: 'border-color: #2f7c94',
                      items: [
                        HR.orgStructReportUtils.getSignatoryCombos({
                          signer4EmpOrder: 'signer4Stafflist',
                          labelWidth: 100,
                          width: 750,
                          allowBlank: true,
                          name1: 'respPositionID1',
                          fieldLabel1: UB.i18n('Підписант 1 (посада)'),
                          name2: 'respEmp1',
                          fieldLabel2: UB.i18n('Підписав')
                        })
                      ]
                    },
                    {
                      xtype: 'fieldset',
                      name: 'signer2',
                      layout: { type: 'vbox', align: 'stretch' },
                      margin: '5 0 5 10',
                      padding: '0 0 5 0',
                      flex: 1,
                      style: 'border-color: #2f7c94',
                      items: [
                        HR.orgStructReportUtils.getSignatoryCombos({
                          signer4EmpOrder: 'signer4StafflistSecond',
                          labelWidth: 100,
                          width: 750,
                          allowBlank: true,
                          name1: 'respPositionID2',
                          fieldLabel1: UB.i18n('Підписант 2 (посада)'),
                          name2: 'respEmp2',
                          fieldLabel2: UB.i18n('Підписав')
                        })
                      ]
                    }
                  ]
                },
                {
                  layout: {
                    type: 'vbox',
                    align: 'stretch'
                  },
                  flex: 1,
                  items: [
                    {
                      xtype: 'fieldset',
                      name: 'signer3',
                      layout: { type: 'vbox', align: 'stretch' },
                      margin: '5 0 5 10',
                      padding: '0 0 5 0',
                      flex: 1,
                      style: 'border-color: #2f7c94',
                      items: [
                        HR.orgStructReportUtils.getSignatoryCombos({
                          signer4EmpOrder: 'approver4Stafflist',
                          labelWidth: 100,
                          width: 750,
                          allowBlank: true,
                          name1: 'respPositionID3',
                          fieldLabel1: UB.i18n('Затвердив 1 (посада)'),
                          name2: 'respEmp3',
                          fieldLabel2: UB.i18n('Підписав')
                        })
                      ]
                    },
                    {
                      xtype: 'fieldset',
                      name: 'signer4',
                      layout: { type: 'vbox', align: 'stretch' },
                      margin: '5 0 5 10',
                      padding: '0 0 5 0',
                      flex: 1,
                      style: 'border-color: #2f7c94',
                      hidden: !twoApprover,
                      items: [
                        HR.orgStructReportUtils.getSignatoryCombos({
                          signer4EmpOrder: 'approver4StafflistSecond',
                          hidden: !twoApprover,
                          labelWidth: 100,
                          width: 750,
                          allowBlank: true,
                          name1: 'respPositionID4',
                          fieldLabel1: UB.i18n('Затвердив 2 (посада)'),
                          name2: 'respEmp4',
                          fieldLabel2: UB.i18n('Підписав')
                        })
                      ]
                    }
                  ]
                }
              ]
            },
            {
              xtype: 'textfield',
              name: 'docInfo',
              fieldLabel: UB.i18n('Затверджено документом'),
              labelWidth: 160,
              value: docInfo
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const dictFundSourceID = frm.findField('dictFundSourceID')
        const reco = AC.gridUtils.getCurrentRecord(dictFundSourceID)
        const dictFundTypeName = reco && reco.get('dictFundTypeName')
        const dictProgClass = reco && reco.get('dictProgClass')
        const params = {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          positionCategory: frm.findField('positionCategory').getValue() || 0,
          positionCategoryName: frm.findField('positionCategory').getRawValue() || '',
          dictFundSourceID: frm.findField('dictFundSourceID').getValue() || 0,
          dictFundSourceName: frm.findField('dictFundSourceID').getRawValue(),
          dictFundTypeName: dictFundTypeName,
          dictProgClass: dictProgClass,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
          groupPos: frm.findField('groupPos').getValue() || false,
          roundTo: frm.findField('roundToCombo').getValue(),
          showNn: frm.findField('showNn').getValue() === true,
          showDeptCodes: frm.findField('showDeptCodes').getValue() === true,
          showCategory: frm.findField('showCategory').getValue() === true,
          showWokers: frm.findField('showWokers').getValue() === true,
          respPositionID1: frm.findField('respPositionID1').getValue(),
          respEmp1: frm.findField('respEmp1').getValue(),
          respPositionID2: frm.findField('respPositionID2').getValue(),
          respEmp2: frm.findField('respEmp2').getValue(),
          respPositionID3: frm.findField('respPositionID3').getValue(),
          respEmp3: frm.findField('respEmp3').getValue(),
          respPositionID4: frm.findField('respPositionID4').getValue(),
          respEmp4: frm.findField('respEmp4').getValue(),
          docInfo: frm.findField('docInfo').getValue(),
          monthsFop: frm.findField('monthsFop').getValue() || 0
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })

    me.paramForm.on('afterrender', () => {
      if (incomeParams.dictFundSourceID) {
        me.paramForm.down('[name=dictFundSourceID]').setValueById(incomeParams.dictFundSourceID)
      }

      $App.connection.run({
        entity: 'hr_employeePosition',
        method: 'getStaffTableSignerList',
        onDate: appAC.globalApplicationDate(),
        organizationID: appAC.globalOrganization()
      }).then(mParams => {
        for (let i = 1; i <= (twoApprover ? 4 : 3); i++) {
          if (mParams.result[`signer${i}`].respPositionID) {
            me.paramForm.down(`[name=respPositionID${i}]`).setValueById(mParams.result[`signer${i}`].respPositionID)
          }
        }
      })
    })

    return me.paramForm
  }
}
