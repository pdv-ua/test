/* global Ext UB AC HR appAC $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для корректной выгрузки в Excel
      me.incomeParams = reportParams
    }
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: function (reportParams) {
    return $App.connection.run({
      entity: 'hr_report',
      method: 'getAverageSalaryReport',
      execParams: reportParams
    }).then(mParams => {
      return JSON.parse(mParams.resultData)
    }, e => {
      throw e
    })
  },
  onReportClick: function (e) {
    drillDown(e.target.dataset['cellcode'], e.target.dataset['cellid'])
    e.preventDefault()
  },
  onParamPanelConfig: function () {
    const me = this
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const typeReport = Ext.create('Ext.data.Store', {
      fields: ['id', 'name']
    })
    typeReport.add({ id: 'type1', name: UB.i18n('Середньооблікова чисельність') })
    typeReport.add({ id: 'type2', name: UB.i18n('Середня кількість') })

    me.paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
          HR.orderManager.disableContextMenuItems(this.down('[name=typeReport]'), ['clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              xtype: 'combobox',
              allowBlank: false,
              editable: false,
              name: 'typeReport',
              fieldLabel: UB.i18n('Вид статистики'),
              labelWidth: 160,
              width: 700,
              valueField: 'id',
              displayField: 'name',
              store: typeReport,
              queryMode: 'local',
              value: 'type1',
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const fields = {
                    dateFrom: form.down('[name=dateFrom]').hide(),
                    dateTo: form.down('[name=dateTo]').hide(),
                    onDate: form.down('[name=onDate]').hide()
                  }
                  if (ctrl.getValue() === 'type3') {
                    fields.onDate.show()
                  } else {
                    fields.dateFrom.show()
                    fields.dateTo.show()
                  }
                  fields.dateFrom.setAllowBlank(ctrl.getValue() === 'type3')
                  fields.dateTo.setAllowBlank(ctrl.getValue() === 'type3')
                  fields.onDate.setAllowBlank(ctrl.getValue() !== 'type3')
                }
              }
            },
            {
              layout: { type: 'hbox' },
              flex: 1,
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 160,
                  width: 300,
                  fieldLabel: UB.i18n('За період з'),
                  allowBlank: false,
                  value: AC.dateService.firstDayOfMonth(new Date()),
                  validator: function () {
                    const ctrl = this
                    if (ctrl) {
                      let form = ctrl.up('form')
                      const f = form.down('[name=dateFrom]').getValue()
                      const t = form.down('[name=dateTo]').getValue()
                      return (f && t && f > t)
                        ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                        : true
                    }
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 30,
                  width: 100,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: AC.dateService.lastDayOfMonth(new Date()),
                  validator: function () {
                    const ctrl = this
                    if (ctrl) {
                      let form = ctrl.up('form')
                      const f = form.down('[name=dateFrom]').getValue()
                      const t = form.down('[name=dateTo]').getValue()
                      return (f && t && f > t)
                        ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                        : true
                    }
                  }
                }
              ]
            },
            {
              xtype: 'datefield',
              name: 'onDate',
              labelWidth: 160,
              width: 270,
              fieldLabel: UB.i18n('Станом на'),
              hidden: true,
              value: appAC.globalApplicationDate()
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 160,
                  width: 700,
                  flex: 1,
                  readOnly: !accMainReportsSubOrg,
                  ubRequest: {
                    entity: 'hr_organization',
                    fieldList: ['mi_data_id', 'description', 'mi_treePath'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        values: {
                          state: 'ACTIVE'
                        }
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        values: {
                          state: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
                        }
                      }
                    },
                    orderList: { orderBy: { expression: 'description' } },
                    __mip_ondate: appAC.globalApplicationDate()
                  },
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      HR.controlService.onChangeIncludeChildOrgs(form)
                    }
                  }
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg)
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 160,
                  width: 700,
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
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          typeReport: frm.findField('typeReport').getValue(),
          typeReportName: frm.findField('typeReport').getRawValue(),
          organizationID: frm.findField('organizationID').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue() || false,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue()),
          dateFrom: AC.dateService.shiftDate(frm.findField('dateFrom').getValue()),
          dateTo: AC.dateService.shiftDate(frm.findField('dateTo').getValue())
        }
      }
    })
    return me.paramForm
  }
}

function drillDown (cellCode, cellID) {
  if (cellID) {
    $App.doCommand({
      cmdType: 'showForm',
      entity: 'hr_repSetParam',
      instanceID: cellID,
      isModal: true
    })
  }
}
