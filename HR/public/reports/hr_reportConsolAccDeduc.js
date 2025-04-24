/* global Ext UB $App AC appAC appHR */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (reportParams) {
    reportParams.limitedAccess = AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess')
    return $App.connection.run({
      entity: 'hr_reportConsolAccDeduc',
      method: 'getReportData',
      execParams: reportParams
    }).then(mParams => {
      return JSON.parse(mParams.result)
    })
  },

  onParamPanelConfig: function () {
    let paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'organizationID',
                  fieldLabel: UB.i18n('Організація'),
                  labelWidth: 110,
                  width: 750,
                  valueField: 'mi_data_id',
                  displayField: 'description',
                  allowBlank: false,
                  disableContextMenu: true,
                  ubRequest: {
                    entity: 'hr_organization',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['mi_data_id', 'name', 'description', 'mi_treePath'],
                    whereList: {
                      mi_treePath: {
                        expression: '[mi_treePath]',
                        condition: 'startWith',
                        value: `/${appAC.globalOrganization()}/`
                      },
                      isActive: {
                        expression: '[state]',
                        condition: 'equal',
                        value: 'ACTIVE'
                      }
                    }
                  },
                  listeners: {
                    change: function (ctrl) {
                      const paramForm = ctrl.up('form')
                      const depCtrl = paramForm.down('[name=departmentID]')
                      depCtrl && depCtrl.setValue()
                    }
                  }
                },
                {
                  xtype: 'checkbox',
                  fieldLabel: UB.i18n('з підлеглими'),
                  labelWidth: 200,
                  name: 'includeSubOrg',
                  listeners: {
                    change: function (ctrl) {
                      const paramForm = ctrl.up('form')
                      const depCtrl = paramForm.down('[name=departmentID]')
                      depCtrl && depCtrl.setValue()
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  layout: { type: 'hbox' },
                  items: [
                    {
                      xtype: 'ubcombobox',
                      allowBlank: false,
                      name: 'periodFromID',
                      fieldLabel: UB.i18n('Період звіту:'),
                      labelWidth: 110,
                      pageSize: 50,
                      width: 360,
                      hideEntityItemInContext: true,
                      disableContextMenu: true,
                      selectOnFocus: true,
                      ubRequest: {
                        entity: 'hr_dictPeriod',
                        fieldList: ['ID', 'description', 'dateFrom', 'dateTo', 'orgID', 'priorPeriodID', 'nextPeriodID', 'name'],
                        orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } }
                      },
                      listeners: {
                        beforeQuerySend: function () {
                          this.store.ubRequest.whereList = {
                            orgID: {
                              expression: '[orgID]',
                              condition: 'equal',
                              value: appAC.globalOrganization()
                            }
                          }
                          if (!this.whereListIsSet) this.whereListIsSet = true
                          else this.store.reload()
                        },
                        change: function (ctrl, value) {
                          const me = ctrl.up('form')
                          const rec = AC.gridUtils.getCurrentRecord(ctrl)
                          const periodToCtrl = me.down('[name=periodToID]')
                          if (value && periodToCtrl) {
                            if (!periodToCtrl.getValue() || periodToCtrl.getFieldValue('dateFrom') < rec.get('dateFrom')) {
                              periodToCtrl.setValueById(value)
                            }
                            const depCtrl = me.down('[name=departmentID]')
                            if (depCtrl && depCtrl.getValue()) {
                              let depID = depCtrl.getValue()
                              depCtrl.clearValue()

                              depCtrl.store.ubRequest.__mip_ondate = periodToCtrl.getFieldValue('dateTo') || appAC.globalApplicationDate()
                              depCtrl.store.load().then(res => {
                                if (depID) {
                                  if (depCtrl.store && depCtrl.store.data && depCtrl.store.data.items.length > 0) {
                                    let newDep = depCtrl.store.data.items.find(el => el.data.mi_data_id === depID)
                                    if (newDep) {
                                      depCtrl.setValueById(newDep.data.mi_data_id)
                                    }
                                  }
                                }
                              })
                            }
                          }
                        },
                        expand: appHR.periodExpand
                      }
                    },
                    {
                      xtype: 'label',
                      text: UB.i18n('-'),
                      cls: 'x-form-item-label',
                      margin: '8 45 0 55',
                      width: 10
                    },
                    {
                      xtype: 'ubcombobox',
                      allowBlank: false,
                      name: 'periodToID',
                      fieldLabel: '',
                      width: 250,
                      hideEntityItemInContext: true,
                      disableContextMenu: true,
                      selectOnFocus: true,
                      ubRequest: {
                        entity: 'hr_dictPeriod',
                        fieldList: ['ID', 'description', 'dateFrom', 'dateTo', 'orgID', 'priorPeriodID', 'nextPeriodID', 'name'],
                        orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } }
                      },
                      listeners: {
                        beforeQuerySend: function () {
                          this.store.ubRequest.whereList = {
                            orgID: {
                              expression: '[orgID]',
                              condition: 'equal',
                              value: appAC.globalOrganization()
                            }
                          }
                          if (!this.whereListIsSet) this.whereListIsSet = true
                          else this.store.reload()
                        },
                        change: function (ctrl, value) {
                          const me = ctrl.up('form')
                          const rec = AC.gridUtils.getCurrentRecord(ctrl)
                          const depCtrl = me.down('[name=departmentID]')
                          let periodTo = rec ? rec.get('dateTo') : null
                          const periodFromCtrl = me.down('[name=periodFromID]')
                          if (value && periodFromCtrl) {
                            if (!periodFromCtrl.getValue() || periodFromCtrl.getFieldValue('dateFrom') > rec.get('dateFrom')) {
                              periodFromCtrl.setValueById(value)
                            }
                          }
                          if (depCtrl) {
                            let depID = depCtrl.getValue()
                            depCtrl.clearValue()

                            periodTo ? depCtrl.store.ubRequest.__mip_ondate = periodTo
                              : depCtrl.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()

                            depCtrl.store.load().then(res => {
                              if (depID) {
                                if (depCtrl.store && depCtrl.store.data && depCtrl.store.data.items.length > 0) {
                                  let newDep = depCtrl.store.data.items.find(el => el.data.mi_data_id === depID)
                                  if (newDep) {
                                    depCtrl.setValueById(newDep.data.mi_data_id)
                                  }
                                }
                              }
                            })
                          }
                        },
                        expand: appHR.periodExpand
                      }
                    }
                  ]
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'departmentID',
                  fieldLabel: UB.i18n('Підрозділ'),
                  labelWidth: 110,
                  width: 750,
                  valueField: 'mi_data_id',
                  displayField: 'caption',
                  disableContextMenu: true,
                  ubRequest: {
                    entity: 'hr_department',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['mi_data_id', 'name', 'orgID', 'description', 'mi_treePath', 'caption'],
                    whereList: {}
                  },
                  listeners: {
                    beforeQuerySend: function () {
                      const me = this.up('form')
                      this.store.ubRequest.__mip_ondate = me.down('[name=periodToID]').getFieldValue('dateTo') || appAC.globalApplicationDate()
                      const includeSubOrg = me.down('[name=includeSubOrg]') ? me.down('[name=includeSubOrg]').getValue() : false
                      const orgCtrl = (me.down('[name=organizationID]') && me.down('[name=organizationID]').getValue()) ? me.down('[name=organizationID]').getValue() : appAC.globalOrganization()

                      if (includeSubOrg) {
                        this.store.ubRequest.whereList = {
                          miTreePath: {
                            expression: '[mi_treePath]',
                            condition: 'like',
                            value: `%/${orgCtrl}/%`
                          },
                          isActive: {
                            expression: '[state]',
                            condition: 'equal',
                            value: 'ACTIVE'
                          }
                        }
                      } else {
                        this.store.ubRequest.whereList = {
                          orgID: {
                            expression: '[orgID]',
                            condition: 'equal',
                            value: orgCtrl
                          },
                          isActive: {
                            expression: '[state]',
                            condition: 'equal',
                            value: 'ACTIVE'
                          }
                        }
                      }
                      if (!this.whereListIsSet) this.whereListIsSet = true
                      else this.store.reload()
                    },
                    change: function (ctrl) {
                      const me = ctrl.up('form')
                      me.down('[name=subDepartment]').setValue(false)
                    }
                  }
                },
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'subDepartment',
                  fieldLabel: UB.i18n('з підлеглими підрозділами')
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubboxselect',
                  name: 'dictFundSourceID',
                  fieldLabel: UB.i18n('Джерело фінансування'),
                  labelWidth: 110,
                  width: 750,
                  displayField: 'name',
                  valueField: 'ID',
                  multiSelect: true,
                  allowBlank: true,
                  ubRequest: {
                    entity: 'ac_fundSource',
                    method: 'selectByOrg',
                    fieldList: ['ID', 'name']
                  },
                  listeners: {
                    afterrender: function (ctrl) {
                      ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                      ctrl.store.ubRequest.emptyValue = true
                    }
                  }
                }
              ]
            },
            {
              xtype: 'checkbox',
              fieldLabel: UB.i18n('Враховувати зміну підрозділу у місяцях періоду'),
              labelWidth: 360,
              name: 'checkDepChangeInPeriod'
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()

        const periodFromID = frm.findField('periodFromID').getValue()
        const priorPeriodID = frm.findField('periodFromID').getFieldValue('priorPeriodID')
        const periodDateFrom = AC.dateService.truncTimeToUtcNull(frm.findField('periodFromID').getFieldValue('dateFrom'))

        const periodToID = frm.findField('periodToID').getValue()
        const periodDateTo = AC.dateService.truncTimeToUtcNull(frm.findField('periodToID').getFieldValue('dateTo'))

        let dictFundSourceID = frm.findField('dictFundSourceID').getValue()
        let isIncludeEmpty = false
        if (dictFundSourceID === '') {
          dictFundSourceID = []
        } else {
          dictFundSourceID = dictFundSourceID.split(',').map(id => parseInt(id))
          isIncludeEmpty = dictFundSourceID.includes(0)
        }
        return {
          periodDateFrom,
          periodDateTo,
          orgID: frm.findField('organizationID').getValue(),
          includeSubOrg: frm.findField('includeSubOrg').getValue(),
          onDate: appAC.globalApplicationDate(),
          periodFromID,
          periodToID,
          priorPeriodID,
          checkDepChangeInPeriod: frm.findField('checkDepChangeInPeriod').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          subDepartment: frm.findField('subDepartment').getValue(),
          isIncludeEmpty,
          dictFundSourceID: dictFundSourceID.filter(ID => ID !== 0)
        }
      }
    })
    paramForm.on('afterrender', () => {
      UB.Repository('hr_organization')
        .attrs('mi_treePath')
        .where('mi_data_id', '=', appAC.globalOrganization())
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: appAC.globalApplicationDate() })
        .selectSingle().then(org => {
          const orgCtrl = paramForm.down('[name=organizationID]')
          if (org) {
            AC.viewUtils.setWhereListProperty(orgCtrl, [
              ['mi_treePath', 'startWith', org.mi_treePath],
              ['state', 'equal', 'ACTIVE']
            ], null, ['clearWhereList'])
          }
          orgCtrl.setValueById(appAC.globalOrganization())
        })
      if (!AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')) {
        paramForm.down('[name=organizationID]').hide()
        paramForm.down('[name=includeSubOrg]').hide()
      }
      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
        paramForm.down('[name=periodFromID]').setValueById(response.ID)
        paramForm.down('[name=periodToID]').setValueById(response.ID)
      })
    })
    return paramForm
  }

}
