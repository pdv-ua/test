/* global Ext $App UB AC appAC HR _ */
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
      entity: 'hr_empListDisability',
      method: 'search',
      organizationID: reportParams.organizationID,
      includeChildOrgs: reportParams.includeChildOrgs,
      departmentID: reportParams.departmentID,
      includeChildDepts: reportParams.includeChildDepts,
      onDate: reportParams.onDate,
      dateFrom: reportParams.dateFrom,
      workPlaceID: reportParams.workPlaceID || ''
    })
      .then(response => {
        return me.getAllData(response, reportParams.onDate, reportParams.organizationID, reportParams.departmentID, reportParams.workPlaceName)
      })
  },

  getAllData: async function (result, onDate, organizationID, departmentID, workPlaceName) {
    result.organizationName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .selectScalar()

    result.departmentName = departmentID ? await UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', departmentID)
      .where('orgID', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({ __mip_ondate: onDate })
      .selectScalar() : ''

    result.workPlace = workPlaceName || ''
    result.showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID)
    result.useActualPositionName = AC.settings.get('hrOrderActualPositionName', organizationID) === true
    return result
  },

  getParams: function (data) {
    const resData = data.resultData.data
    const params = {
      showAddDescrPerson: data.showAddDescrPerson,
      useActualPositionName: data.useActualPositionName,
      colSpan: 13 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      widthTable: 1700 + (data.showAddDescrPerson ? 200 : 0) + (data.useActualPositionName ? 150 : 0),
      personTable: [],
      dateFrom: data.dateFrom ? AC.dateService.formatDate(data.dateFrom) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || '',
      workPlace: data.workPlace || ''
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
      resData.forEach(item => {
        const obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          if (attr === 'benefitDateFrom' || attr === 'benefitDateTo') {
            obj[attr] = item[j] ? AC.dateService.formatDate(item[j]) : ''
          } else if (attr === 'dayCount' && !item[j]) {
            obj[attr] = 0
          } else if (attr === 'disability' || attr === 'benefDocs') {
            obj[attr] = []
            if (item[j]) {
              const sArr = item[j].split('; ')
              sArr.forEach((el, index) => {
                el = el.trim() + (index !== sArr.length - 1 ? '; ' : '')
                obj[attr].push({ val: el })
              })
            } else {
              obj[attr].push({ val: '' })
            }
          } else {
            obj[attr] = item[j]
          }
          if (attr === 'depTree') obj['depTree'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depTree'])
          if (attr === 'depName') obj['depName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depName'])
          j++
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.useActualPositionName = data.useActualPositionName
        params.personTable.push(obj)
        k++
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
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
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
                  name: 'workPlaceID',
                  fieldLabel: UB.i18n('Місце роботи'),
                  labelWidth: 130,
                  width: 700,
                  valueField: 'code',
                  displayField: 'name',
                  allowBlank: true,
                  ubRequest: {
                    entity: 'ubm_enum',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'name', 'code', 'eGroup'],
                    whereList: {
                      enumGroupFilter: {
                        expression: '[eGroup]',
                        condition: 'equal',
                        values: {
                          val: 'HR_WORKER_PLACE'
                        }
                      }
                    }
                  },
                  listeners: {
                    render: function (ctrl) {
                      ctrl.store.on('load', () => {
                        if (!ctrl.store.isLoaded) {
                          const storeItems = ctrl.store.data.items
                          const selItem = _.find(storeItems, { data: { code: '1' } })
                          if (selItem) {
                            ctrl.setValue(selItem.data.code)
                          }
                          ctrl.store.isLoaded = true
                        }
                      })
                      ctrl.store.load()
                    }
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
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          workPlaceID: frm.findField('workPlaceID').getValue() || 0,
          workPlaceName: frm.findField('workPlaceID').getRawValue() || 0,
          onDate: appAC.globalApplicationDate()
        }
      }
    })
    return paramForm
  }
}
