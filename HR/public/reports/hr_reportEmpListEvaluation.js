/* global $App Ext UB AC appAC HR */
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
      entity: 'hr_reportEmpListEvaluation',
      method: 'search',
      ...reportParams
    }).then(response => {
      return me.getAllData(response, reportParams)
    })
  },

  getAllData: async function (result, reportParams) {
    const onDate4Sql = AC.dateService.shiftDate(reportParams.onDate)
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate4Sql, reportParams.organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate4Sql, reportParams.organizationID, reportParams.departmentID)
    result.showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)

    if (reportParams.respID) {
      const respName = await UB.Repository('hr_employeePositionS')
        .attrs(['employeeID.shortFIO'])
        .where('ID', '=', reportParams.respID)
        .selectScalar()
      result.respName = respName || ''
    }

    return result
  },

  getParams: function (data) {
    let resData = data.resultData.data

    const params = {
      personTable: [],
      year: data.year,
      dateFrom: data.onDate ? AC.dateService.formatDate(data.onDate) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || ''
    }

    let tableFields = data.resultData.fields

    // set fields names
    /*
    data.resultData.fields.forEach(item => {
      params[item] = item
    })
     */

    // set data for personTable
    if (!resData) {
      for (let i = 1; i < 6; i++) {
        let obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        params.personTable.push(obj)
      }
    } else {
      let k = 1
      resData.forEach(item => {
        let obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          if (attr === 'conclusionDate') {
            if (item[j]) {
              obj[attr] = AC.dateService.formatDate(item[j])
            } else {
              obj[attr] = ''
            }
          } else {
            obj[attr] = item[j]
          }
          if (attr === 'depName') obj['depName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depName'])
          if (attr === 'depFirst') obj['depFirst'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depFirst'])
          j++
        })
        if (data.showAddDescrPerson && obj.addDescrPerson) {
          obj.comment = obj.addDescrPerson + (obj.comment ? '<br />' : '') + (obj.comment || '')
        }
        params.personTable.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
  },

  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    let paramForm = Ext.create('UBS.ReportParamForm', {
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
              xtype: 'numberfield',
              labelWidth: 130,
              width: 210,
              name: 'year',
              fieldLabel: UB.i18n('За рік'),
              maxValue: 9999,
              minValue: 1970,
              allowBlank: false,
              vtype: 'numberValidator',
              listeners: {
                afterrender: function (crtl) {
                  let year = appAC.globalApplicationDate().getFullYear()
                  crtl.setValue(year)
                }
              }
            },
            HR.controlService.getRespEmpCombo({
              name: 'respID',
              fieldLabel: UB.i18n('Відповідальний'),
              labelWidth: 130,
              width: 700,
              allowBlank: true,
              defaultOrgBoss: false,
              listeners: {
                render: function (ctrl) {
                  if ($App.connection.userData().employeeNumberID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        let id = $App.connection.userData().employeeNumberID
                        UB.Repository('hr_employeePositionS')
                          .attrs('ID', 'dateFrom')
                          .where('employeeNumberID', '=', id)
                          .orderBy('dateFrom', 'desc')
                          .selectAsObject()
                          .then(posInfo => {
                            if (posInfo && posInfo.length > 0) {
                              ctrl.setValueById(posInfo[0].ID)
                            }
                            ctrl.store.isLoaded = true
                          })
                      }
                    })
                  }
                  ctrl.store.load()
                }
              }
            })
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          onDate: appAC.globalApplicationDate(),
          year: frm.findField('year').getValue(),
          respID: frm.findField('respID').getValue() || 0
        }
      }
    })
    return paramForm
  }
}
