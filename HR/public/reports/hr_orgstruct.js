/* global Ext _ UB AC HR appAC $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const organizationID = reportParams.organizationID || 0
    const departmentID = reportParams.departmentID || 0
    const dictFundSourceID = reportParams.dictFundSourceID || 0
    const onDate = reportParams.onDate || AC.dateService.todayDate()
    const groupPos = reportParams.groupPos || false
    const showDeptCodes = (reportParams.showDeptCodes !== undefined) ? reportParams.showDeptCodes : true
    const result = {
      data: [],
      showTotals: true,
      onDate: AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.')),
      year: onDate.getFullYear(),
      departmentName: '',
      fundSourceName: reportParams.dictFundSourceName || '',
      progClassName: reportParams.dictProgClass || '',
      fundName: reportParams.dictFundTypeName ? reportParams.dictFundTypeName + UB.i18n(' фонд') : '',
      showNn: (reportParams.showNn !== undefined) ? reportParams.showNn : true,
      showCategory: (reportParams.showCategory !== undefined) ? reportParams.showCategory : true,
      showWokers: (reportParams.showWokers !== undefined) ? reportParams.showWokers : true,
      totalFunsSumToWord: ''
    }

    const orgNames = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.organizationName = HR.nameCase.cap((orgNames && (orgNames.nameGen || orgNames.name)) || '')
    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }

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
    if (departmentID && reportParams.includeChildDepts) {
      orgStruct
        .where('mi_treePath', 'like', '/' + departmentID + '/', 'u1')
        .where('mi_data_id', '=', departmentID, 'u2')
        .logic('([u1] or [u2])')
    }
    if (departmentID && !reportParams.includeChildDepts) {
      orgStruct
        .where('parentUnitID', '=', departmentID, 'u1')
        .where('mi_data_id', '=', departmentID, 'u2')
        .where('mi_unityEntity', '=', 'hr_position', 'u3')
        .logic('(([u1] and [u3]) or [u2])')
    }

    orgStruct = await orgStruct.selectAsObject()
    if (!orgStruct) {
      return result
    }

    let posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity',
        'paymentType', 'positionCategory', 'positionCategory.sortOrder', 'positionCategory.name'])
      .attrsIf(dictFundSourceID, ['fundSourcePositionID.ID', 'fundSourcePositionID.quantity'])
      .misc({ __mip_ondate: onDate })
      .where('state', '=', 'ACTIVE')
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
      .orderBy('dictPositionID.fullName')
      .orderBy('dictPositionID.name')
    if (dictFundSourceID) {
      posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
    }
    posData = await posData.selectAsObject()

    const deptData = await HR.reportUtils.getDepartmentTypeNames(organizationID, onDate, departmentID, ['nameDat'])
    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = _.find(deptData, { ID: item.ID })
      item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    })

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.showTotals = settingsOrg.showTotals
    result.roundToQuantity = settingsOrg.roundToQuantity
    if (reportParams.roundTo === undefined) {
      result.roundTo = settingsOrg.roundTo
    } else {
      result.roundTo = reportParams.roundTo <= 0 ? 'numberGroup' : 'decimal2'
    }
    result.showCategory = settingsOrg.hrFuncOrgType !== '2' ? result.showCategory : false
    result.showWokers = settingsOrg.hrFuncOrgType !== '2' ? result.showWokers : false

    const tree = HR.reportUtils.generateDataForStructReport('orgStruct', organizationID, departmentID || organizationID, orgStruct, posData, [],
      groupPos, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1, showDeptCodes, false, false, false,
      result.showWokers, [], false, false, 1, result.showNn)
    result.data = tree && tree.data ? tree.data : []
    result.totalQuantityStr = HR.reportUtils.quantityToString(tree.quantity, tree.roundToQuantity)
    result.totalFunsSumStr = HR.reportUtils.quantityToString(tree.fundSum, result.roundTo)
    result.totalFunsSumToWord = HR.orgStructReportUtils.fundSumToStr(tree.fundSum, result.roundTo)

    result.dataPC = result.showCategory ? HR.reportUtils.generateDataForStructReportByPositionCategory(result.data, ['fundSum'], result.roundTo, result.roundToQuantity, [{
      name: 'showNn',
      value: result.showNn
    }]) : []

    return result
  },
  onParamPanelConfig: function () {
    const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
    const incomeParams = this.incomeParams || {}
    const me = this
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
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  name: 'groupPos',
                  fieldLabel: UB.i18n('Групувати посади'),
                  labelWidth: 160,
                  value: false
                },
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 150,
                  width: 270,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                },
                HR.reportUtils.roundToCombo({
                  labelWidth: 150,
                  width: 350,
                  defaultValue: 0,
                  simpleRound: true
                })
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
                  value: true
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showDeptCodes',
                  fieldLabel: UB.i18n('Коди підрозділів'),
                  labelWidth: 150,
                  width: 210,
                  value: true
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showCategory',
                  fieldLabel: UB.i18n('Формувати підсумки по категоріям'),
                  labelWidth: 280,
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
        const dictFundSourceID = frm.findField('dictFundSourceID')
        const reco = AC.gridUtils.getCurrentRecord(dictFundSourceID)
        const dictFundTypeName = reco && reco.get('dictFundTypeName')
        const dictProgClass = reco && reco.get('dictProgClass')
        const params = {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
          groupPos: frm.findField('groupPos').getValue() || false,
          roundTo: frm.findField('roundToCombo').getValue(),
          showNn: frm.findField('showNn').getValue() === true,
          showDeptCodes: frm.findField('showDeptCodes').getValue() === true,
          showCategory: frm.findField('showCategory').getValue() === true,
          showWokers: frm.findField('showWokers').getValue() === true,
          dictFundSourceID: frm.findField('dictFundSourceID').getValue(),
          dictFundSourceName: frm.findField('dictFundSourceID').getRawValue(),
          dictFundTypeName: dictFundTypeName,
          dictProgClass: dictProgClass
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
    })
    return me.paramForm
  }
}
