/* global $App Ext UB AC appAC _ HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => {
      return AC.reportService.generateReport(me.getParams(data), me)
    })
  },

  getData: async function (reportParams) {
    const me = this

    return $App.connection.run({
      entity: 'hr_empListMilitary',
      method: 'search',
      ...reportParams
    })
      .then(response => {
        return me.getAllData(response, reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
      })
  },

  getAllData: async function (result, onDate, organizationID, departmentID) {
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, organizationID, departmentID)
    result.showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID)
    result.useActualPositionName = AC.settings.get('hrOrderActualPositionName', organizationID) === true
    return result
  },

  getParams: function (data) {
    const resData = data.resultData.data

    const params = {
      personTable: [],
      showAddDescrPerson: data.showAddDescrPerson,
      useActualPositionName: data.useActualPositionName,
      colSpan: 15 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      tableWidth: 1700 + (data.showAddDescrPerson ? 150 : 0) + (data.useActualPositionName ? 100 : 0),
      dateFrom: data.dateFrom ? AC.dateService.formatDate(data.dateFrom) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || ''
    }

    const tableFields = data.resultData.fields

    // set fields names
    /*
    data.resultData.fields.forEach(item => {
      params[item] = item
    })
     */

    // set data for personTable
    if (!resData) {
      for (let i = 1; i < 6; i++) {
        const obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.useActualPositionName = data.useActualPositionName
        params.personTable.push(obj)
      }
    } else {
      let k = 1
      const rows = []
      resData.forEach(item => {
        const obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          if (attr === 'militaryState') {
            obj[attr] = (item[j] === '2') ? UB.i18n('Так') : ''
          } else {
            obj[attr] = item[j]
          }
          j++
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.useActualPositionName = data.useActualPositionName
        rows.push(obj)
      })
      const datas = _.groupBy(rows, 'employeeID')
      _.forEach(datas, items => {
        items = _.sortBy(items, 'workPlace')
        const row = items[0]
        row.pn = k++
        params.personTable.push(row)
      })
    }
    return AC.reportService.removeEmptyValues(params)
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
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 160,
                  width: 280,
                  allowBlank: false,
                  fieldLabel: UB.i18n('Станом на'),
                  value: AC.dateService.todayDate()
                },
                {
                  xtype: 'checkboxfield',
                  name: 'fullPosName',
                  fieldLabel: UB.i18n('Повна назва посади'),
                  labelWidth: 160,
                  margin: '4 0 0 50',
                  checked: false
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'dictStateMilitaryID',
                  fieldLabel: UB.i18n('Стан війскового обліку'),
                  labelWidth: 160,
                  width: 700,
                  gridFieldList: ['name'],
                  displayField: 'name',
                  ubRequest: {
                    entity: 'hr_dictStateMilitary',
                    fieldList: ['ID', 'code', 'name'],
                    whereList: {
                      miDel: {
                        expression: '[mi_deleteUser]',
                        condition: 'isNull'
                      }
                    },
                    orderList: { orderBy: { expression: 'code' } }
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          dateFrom: AC.dateService.truncTimeToUtcNull(frm.findField('dateFrom').getValue()),
          onDate: appAC.globalApplicationDate(),
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          dictStateMilitaryID: frm.findField('dictStateMilitaryID').getValue(),
          fullPosName: frm.findField('fullPosName').getValue()
        }
      }
    })
    return paramForm
  }
}
