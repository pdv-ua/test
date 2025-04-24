/* global $App Ext UB AC appAC HR _ */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams

    return me.getData(reportParams)
      .then(data => {
        return AC.reportService.generateReport(me.getParams(data), me)
      })
  },

  getData: async function (reportParams) {
    const me = this

    return $App.connection.run({
      entity: 'hr_empListHarmful',
      method: 'search',
      ...reportParams
    })
      .then(response => {
        return me.getAllData(response, reportParams.onDate, reportParams.organizationID, reportParams.departmentID, reportParams.dictHarmfulKindID)
      })
  },

  getAllData: async function (result, onDate, organizationID, departmentID, dictHarmfulKindID) {
    result.showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID)
    result.useActualPositionName = AC.settings.get('hrOrderActualPositionName', organizationID) === true
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, organizationID, departmentID)
    result.harmfulName = await UB.Repository('hr_dictHarmfulKind')
      .attrs(['name'])
      .where('ID', '=', dictHarmfulKindID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectScalar()

    return result
  },

  getParams: function (data) {
    const resData = data.resultData.data

    const params = {
      showAddDescrPerson: data.showAddDescrPerson,
      useActualPositionName: data.useActualPositionName,
      colSpan: 8 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      tableWidth: 1150 + (data.showAddDescrPerson ? 200 : 0) + (data.useActualPositionName ? 200 : 0),
      personTable: [],
      dateFrom: data.dateFrom ? AC.dateService.formatDate(data.dateFrom) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || '',
      harmfulName: data.harmfulName || ''
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
        tableFields.forEach(attr => {
          if (attr === 'workDateFrom' || attr === 'posDateFrom') {
            if (item[j]) {
              obj[attr] = AC.dateService.formatDate(item[j])
            } else {
              obj[attr] = ''
            }
          } else {
            obj[attr] = item[j]
          }
          if (attr === 'depTree') obj['depTree'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depTree'])
          if (attr === 'depFirst') obj['depFirst'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depFirst'])
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
                        value:  'ACTIVE'
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        value: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
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
              xtype: 'datefield',
              name: 'dateFrom',
              labelWidth: 130,
              width: 240,
              allowBlank: false,
              fieldLabel: UB.i18n('Станом на'),
              value: AC.dateService.todayDate()
            },
            {
              xtype: 'ubcombobox',
              name: 'dictHarmfulKindID',
              fieldLabel: UB.i18n('Вид шкiдливих умов працi:'),
              labelWidth: 130,
              width: 700,
              allowBlank: false,
              ubRequest: {
                entity: 'hr_dictHarmfulKind',
                fieldList: ['ID', 'name']
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const dateFrom = frm.findField('dateFrom').getValue()
        return {
          dateFrom: AC.dateService.truncTimeToUtcNull(dateFrom),
          onDate: appAC.globalApplicationDate(),
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          dictHarmfulKindID: frm.findField('dictHarmfulKindID').getValue()
        }
      }
    })
    return paramForm
  }
}
