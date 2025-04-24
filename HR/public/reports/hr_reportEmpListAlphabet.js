/* global $App Ext UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams

    return me.getData(reportParams)
      .then(data => {
        return AC.reportService.generateReport(me.getParams(data), me)
      }
      )
  },

  getData: async function (reportParams) {
    const me = this

    return $App.connection.run({
      entity: 'hr_empListAlphabet',
      method: 'search',
      ...reportParams
    })
      .then(response => {
        return me.getAllData(response, reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
      })
  },

  getAllData: async function (result, onDate, organizationID, departmentID) {
    result.showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID) === true
    result.useActualPositionName = AC.settings.get('hrOrderActualPositionName', organizationID) === true
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, organizationID, departmentID)
    result.psCategoryName = result.psCategory ? UB.core.UBEnumManager.getStore('HR_POSITION_PSCATEGORY').getById(result.psCategory).get('name') : ''
    result.posCategoryName = result.positionCategory ? UB.core.UBEnumManager.getStore('HR_POSITION_CATEGORY').getById(result.positionCategory).get('name') : ''
    result.workPlaceName = result.workPlaceName ? result.workPlaceName.replace(/,/g, ', ') : ''
    return result
  },

  getParams: function (data) {
    let resData = data.resultData.data
    const funcOrgType = AC.settings.get('hrFuncOrgType', data.organizationID)
    const params = {
      personTable: [],
      showAddDescrPerson: data.showAddDescrPerson,
      useActualPositionName: data.useActualPositionName,
      colSpan: 12 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      tableWidth: 1900 + (data.showAddDescrPerson ? 200 : 0) + (data.useActualPositionName ? 200 : 0),
      dateFrom: data.dateFrom ? AC.dateService.formatDate(data.dateFrom) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || '',
      psCategoryName: data.psCategoryName || data.posCategoryName ? (funcOrgType === '1' ? 'Категорія посади: ' : 'Категорія: ') + (data.psCategoryName || data.posCategoryName) : '',
      psCategoryTitle: funcOrgType === '1' ? 'Категорія посади' : 'Категорія',
      workPlaceName: data.workPlaceName ? 'Місце роботи: ' + data.workPlaceName : ''
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
        obj.showAddDescrPerson = data.showAddDescrPerson
        params.personTable.push(obj)
      }
    } else {
      let k = 1
      resData.forEach(item => {
        let obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          obj[attr] = item[j]
          if (attr === 'depName') obj['depName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depName'])
          if (attr === 'structDepName') obj['structDepName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['structDepName'])
          j++
        })
        let phoneMobile = obj.phoneMobile ? UB.i18n(`Телефон мобільний {0}`, obj.phoneMobile) : ''
        let phoneWorking = obj.phoneWorking ? UB.i18n(`Телефон робочий {0}`, obj.phoneWorking) : ''
        let phoneHome = obj.phoneHome ? UB.i18n(`Телефон домашній {0}`, obj.phoneHome) : ''
        obj.phones = [phoneMobile, phoneWorking, phoneHome].filter(Boolean).join(';<br/>')
        obj.contact = obj.contact ? obj.contact.replace(/\+/g, ';<br/>') : ''
        obj.address = obj.address ? obj.address.replace(/\+/g, ';<br/>') : ''
        obj.email = obj.email ? obj.email.replace(/;/g, ';<br/>') : ''
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
    const funcOrgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())
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
              xtype: 'panel',
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 130,
                  width: 250,
                  allowBlank: false,
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate(),
                  listeners: {
                    change: function (fld) {
                      if (fld.isValid()) {
                        const form = fld.up('form')
                        const departmentID = form.down('[name=departmentID]')
                        departmentID.setValue()
                        departmentID.store.ubRequest.__mip_ondate = fld.getValue()
                        departmentID.store.load()
                      }
                    }
                  }
                },
                {
                  xtype: 'checkboxfield',
                  name: 'fullPosName',
                  fieldLabel: UB.i18n('Повна назва посади'),
                  margin: '4 0 0 50',
                  labelWidth: 160,
                  width: 440,
                  checked: false
                }
              ]
            },
            {
              xtype: 'ubcombobox',
              name: 'psCategory',
              fieldLabel: UB.i18n('Категорія'),
              labelWidth: 130,
              width: 700,
              valueField: 'code',
              hidden: funcOrgType === '1',
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'code', 'eGroup'],
                whereList: {
                  enumGroupFilter: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: {
                      val: 'HR_POSITION_PSCATEGORY'
                    }
                  }
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'positionCategory',
              fieldLabel: UB.i18n('Категорія посади'),
              labelWidth: 130,
              width: 700,
              valueField: 'code',
              hidden: funcOrgType !== '1',
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'code', 'eGroup'],
                whereList: {
                  enumGroupFilter: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: {
                      val: 'HR_POSITION_CATEGORY'
                    }
                  }
                }
              }
            },
            {
              xtype: 'ubboxselect',
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
              },
              listeners: {
                /*
                afterrender: function (ctrl) {
                  ctrl.getStore().load({
                    callback: function (store) {
                      var flt = store.filter(item => {
                        return item.data['code'] === '1'
                      })
                      ctrl.setValue(flt)
                    }
                  })
                }
                */
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        return {
          dateFrom: AC.dateService.truncTimeToUtcNull(frm.findField('dateFrom').getValue()),
          onDate: appAC.globalApplicationDate(),
          psCategory: funcOrgType === '1' ? undefined : frm.findField('psCategory').getValue(),
          positionCategory: funcOrgType === '1' ? frm.findField('positionCategory').getValue() : undefined,
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          fullPosName: frm.findField('fullPosName').getValue(),
          workPlace: frm.findField('workPlace').getValue(),
          workPlaceName: frm.findField('workPlace').getRawValue()
        }
      }
    })
    return paramForm
  }
}
