/* global Ext _ UB AC HR $App appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = {
      showQuantity: (reportParams.showQuantity !== undefined) ? reportParams.showQuantity : true,
      data: []
    }

    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .selectSingle()
    result.organizationName = orgData ? (orgData.nameGen || orgData.name) : ''
    result.onDate = AC.dateService.getStringFormatDate(reportParams.onDate, '', '', UB.i18n(' р.'))

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(reportParams.organizationID)
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.boldMainDep = settingsOrg.boldMainDep

    const orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'code', 'name', 'mi_unityEntity'])
      .where('state', '=', 'ACTIVE')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', reportParams.onDate)
      .where('mi_dateTo', '>=', reportParams.onDate)
      .whereIf(reportParams.organizationID, 'orgID', '=', reportParams.organizationID)
      .whereIf(!reportParams.organizationID, 'parentUnitID', 'isNotNull')
      .orderBy('idxNum')
      .selectAsObject()

    if (!orgStruct) {
      return result
    }

    let deptData
    const depts = await $App.connection.run({
      entity: 'hr_department',
      method: 'getWithQuantityFact',
      orgID: reportParams.organizationID,
      onDate: reportParams.onDate
    })
    deptData = JSON.parse(depts.resultData)

    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = _.find(deptData, { ID: item.ID })
      item.quantity = deptItem ? deptItem.quantity || 0 : 0
      item['dictDepTypeID.code'] = deptItem['dictDepTypeID.code'] || ''
      item['departmentKindID.code'] = deptItem['departmentKindID.code'] || ''
      item.quantityFact = deptItem ? deptItem.quantityFact || 0 : 0
    })

    // В данном отчете нам нужны ТОЛЬКО посады, которые напрямую подчиняются организации
    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'quantity'])
      .misc({ __mip_ondate: reportParams.onDate })
      .where('state', '=', 'ACTIVE')
      .whereIf(reportParams.organizationID, 'parentUnitID', '=', reportParams.organizationID)
      .orderBy('dictPositionID.fullName')
      .orderBy('dictPositionID.name')
      .selectAsObject()
    const tree = HR.reportUtils.generateDataForStructReport('orgCounts', reportParams.organizationID, reportParams.organizationID, orgStruct, posData,
      [], false, 'numberGroup', result.roundToQuantity, 0, false, false,
      true, result.boldMainDep, false, [], false, false, result.colSpan)
    result.data = tree && tree.data ? tree.data : []

    if (reportParams.showDepartmentCode) {
      result.data.forEach(item => {
        item.indexNum = item.code || ''
      })
    }
    result.colSpan = 2 + (result.showQuantity ? 1 : 0)
    result.sheetWidth = 540 + (result.showQuantity ? 100 : 0)
    if (!result.showQuantity) {
      result.data = result.data.filter(item => !item.isTotal)
    }

    result.data = result.data.map(row => {
      return Object.assign({}, row, {
        showQuantity: result.showQuantity
      })
    })

    return result
  },
  onParamPanelConfig: function () {
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
              readOnly: true
            }),
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 120,
                  width: 240,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate()
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showQuantity',
                  fieldLabel: UB.i18n('Виводити кількість посад'),
                  labelWidth: 210,
                  value: true
                },
                {
                  xtype: 'checkboxfield',
                  name: 'showDepartmentCode',
                  fieldLabel: UB.i18n('Відображати код підрозділу'),
                  labelWidth: 210,
                  value: false
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const params = {
          organizationID: frm.findField('organizationID').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate()),
          showQuantity: frm.findField('showQuantity').getValue() || false,
          showDepartmentCode: frm.findField('showDepartmentCode').getValue() || false
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    return paramForm
  }
}
