/* global Ext _ $App UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let staffTableID = reportParams.staffTableID
    let onDate = reportParams.onDate
    if (reportParams.caller && reportParams.caller.record) {
      let reco = reportParams.caller.record
      staffTableID = reco.get('staffTableID') || reportParams.instanceID
      onDate = AC.dateService.shiftDate(reco.get('orderDate'))
    }
    let result = {}
    let currDate = appAC.globalApplicationDate()
    if (!onDate) {
      const staffTable = await UB.Repository('hr_staffTable')
        .attrs(['orderDate'])
        .misc({ __mip_recordhistory_all: true })
        .selectById(staffTableID)
      if ((staffTable && staffTable.orderDate)) {
        onDate = AC.dateService.shiftDate(staffTable.orderDate)
      } else {
        onDate = currDate
      }
    }
    const organizationID = appAC.globalOrganization()
    const orgData = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', organizationID)
      .misc({ __mip_ondate: onDate })
      .selectAsObject()
    result.orgName = orgData.length && orgData[0].name
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    let childOrgIDs = [organizationID] // await HR.treeUtils.getChildOrgs(organizationID, onDate)

    let reportData = await $App.connection.run({
      entity: 'hr_reportOrgstructInfo',
      method: 'getData',
      orgs: childOrgIDs,
      onDate: onDate,
      currDate: currDate,
      staffTableID: staffTableID
    })
    let dataRec = JSON.parse(reportData.resultData)
    result = _.merge(result, dataRec)
    return result
  },
  onParamPanelConfig: function () {
    let report = this
    let incomeParams = report.incomeParams
    let paramForm = Ext.create('UBS.ReportParamForm', {
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
            HR.controlService.getOrgCombo({ readOnly: true, allowBlank: true, labelWidth: 140 }),
            {
              xtype: 'ubcombobox',
              name: 'staffTableID',
              fieldLabel: UB.i18n('Штатний розпис'),
              labelWidth: 140,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTable',
                fieldList: ['ID', 'description'],
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
                render: function (ctrl) {
                  const paramForm = ctrl.up('form')
                  const tabForm = paramForm.ownerCt
                  tabForm.globalOrganizationChange = () => {
                    AC.viewUtils.setWhereListProperty(ctrl, [
                      ['orgID', '=', appAC.globalOrganization()]
                    ], null, ['clearStore', 'clearWhereList', 'clearValue'])
                  }
                  if (incomeParams && incomeParams.staffTableID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        ctrl.setValueById(incomeParams.staffTableID)
                      }
                    })
                    ctrl.store.load()
                  }
                }
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        let incomeParams = this.incomeParams
        let onDate = incomeParams && incomeParams.onDate
        return {
          staffTableID: frm.findField('staffTableID').getValue() || 0,
          onDate: onDate
        }
      }
    })
    return paramForm
  }
}
