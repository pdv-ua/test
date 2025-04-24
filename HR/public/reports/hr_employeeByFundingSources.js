/* global Ext UB AC appAC HR $App */
exports.reportCode = {
  buildReport: async function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams

    const result = await $App.connection.run({
      entity: 'hr_report',
      method: 'fundingSourceSearch',
      resultData: '',
      params: reportParams
    })

    let allResult = await me.getData(result, reportParams)
    return AC.reportService.generateReport(allResult, me)
  },

  getData: async function (result, reportParams) {
    const params = {
      colSpan: 10 + (result.showAddDescrPerson ? 1 : 0) + (reportParams.useActualPositionName ? 1 : 0),
      tableWidth: 1500 + (result.showAddDescrPerson ? 150 : 0) + (reportParams.useActualPositionName ? 150 : 0),
      personTable: [],
      dateFrom: reportParams.dateFrom ? AC.dateService.formatDate(reportParams.dateFrom) : '',
      organizationName: result.organizationName || '',
      departmentName: result.organizationName || '',
      dictEmpCategoryID: reportParams.dictEmpCategoryIDName || '',
      dictStaffCatID: reportParams.dictStaffCatIDName || '',
      workPlace: reportParams.workPlaceName || '',
      dictFundSourceID: reportParams.dictFundSourceIDName || ''
    }

    params.personTable = JSON.parse(result.params.resultReportData)

    if (reportParams.includeChildOrgs) {
      params.organizationName = await HR.reportUtils.getNameOrganization(reportParams.onDate, reportParams.organizationID) + ' (з підлеглими)'
    } else if (!reportParams.includeChildOrgs) {
      params.organizationName = await HR.reportUtils.getNameOrganization(reportParams.onDate, reportParams.organizationID)
    }
    if (reportParams.includeChildDepts) {
      params.departmentName = await HR.reportUtils.getNameDepartment(reportParams.onDate, reportParams.organizationID, reportParams.departmentID) + ' (з підлеглими)'
    } else if (!reportParams.includeChildDepts) {
      params.departmentName = await HR.reportUtils.getNameDepartment(reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    }
    return params
  },

  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 130,
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
                  labelWidth: 130,
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
            },
            {
              name: 'dictFundSourceID',
              fieldLabel: UB.i18n('Джерело фінансування'),
              xtype: 'ubcombobox',
              labelWidth: 130,
              width: 700,
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'ac_fundSource',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name']
              }
            },
            {
              xtype: 'datefield',
              name: 'dateFrom',
              labelWidth: 130,
              width: 250,
              fieldLabel: UB.i18n('Станом на'),
              value: AC.dateService.todayDate()
            },
            {
              xtype: 'ubcombobox',
              name: 'workPlace',
              labelWidth: 130,
              width: 700,
              fieldLabel: UB.i18n('Місце роботи'),
              hideEntityItemInContext: true,
              enumGroupFilter: 'HR_WORKER_PLACE',
              valueField: 'code',
              displayField: 'name',
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
                whereList: {
                  eGroup: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: { 'eGroup': 'HR_WORKER_PLACE' }
                  }
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictEmpCategoryID',
              ubID: 'dictEmpCategoryID',
              fieldLabel: UB.i18n('Кваліфікаційна категорія'),
              labelWidth: 130,
              width: 700,
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'hr_dictEmpCategory',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictStaffCatID',
              ubID: 'dictStaffCatID',
              labelWidth: 130,
              width: 700,
              fieldLabel: UB.i18n('Категорія персоналу'),
              displayField: 'name',
              valueField: 'ID',
              ubRequest: {
                entity: 'hr_dictStaffCat',
                fieldList: ['ID', 'code', 'name'],
                orderList: { orderBy: { expression: 'name' } }
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        let dateFrom = frm.findField('dateFrom').getValue() || appAC.globalApplicationDate()
        return {
          dateFrom: AC.dateService.truncTimeToUtcNull(dateFrom),
          onDate: appAC.globalApplicationDate(),
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          workPlace: frm.findField('workPlace').getValue(),
          dictEmpCategoryID: frm.findField('dictEmpCategoryID').getValue(),
          dictStaffCatID: frm.findField('dictStaffCatID').getValue(),
          dictFundSourceID: frm.findField('dictFundSourceID').getValue(),
          workPlaceName: frm.findField('workPlace').rawValue,
          dictEmpCategoryIDName: frm.findField('dictEmpCategoryID').rawValue,
          dictStaffCatIDName: frm.findField('dictStaffCatID').rawValue,
          dictFundSourceIDName: frm.findField('dictFundSourceID').rawValue,
          resultData: []
        }
      }
    })
    return paramForm
  }
}
