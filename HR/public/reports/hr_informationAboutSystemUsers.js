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
      entity: 'uba_user',
      method: 'reportList',
      organizationID: reportParams.organizationID,
      includeChildOrgs: reportParams.includeChildOrgs
    })
      .then(response => {
        return me.getAllData(response, reportParams.organizationID)
      })
  },

  getAllData: async function (result, organizationID) {
    result.organizationName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .selectScalar()

    return result
  },

  getParams: function (data) {
    const resData = JSON.parse(data.resultData)

    const params = {
      rows: [],
      columnCount: 8,
      colSpan: 8,
      onDate: AC.dateService.formatDate(appAC.globalApplicationDate()),
      organizationName: data.organizationName + (data.includeChildOrgs ? ' (з підлеглими)' : ''),
      tableWidth: 2220 + (data.showAddDescrPerson ? 200 : 0) + (data.useActualPositionName ? 150 : 0)
    }

    // const tableFields = data.resultData.fields
    const tableFields = [ 'name',
      'employyeNum_dsc',
      'disabled',
      'mi_createDate',
      'creator_name',
      'description',
      'OrgsName',
      'RolesName',
      'user_dsc']
    // set data for rows
    if (resData.length === 0) {
      for (let i = 1; i < 8; i++) {
        const obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        params.rows.push(obj)
      }
    } else {
      let k = 1
      resData.forEach(item => {
        const obj = {}
        obj['pn'] = k
        tableFields.forEach(attr => {
          if (attr === 'disabled') {
            obj[attr] = item[attr] ? 'Так' : 'Hi'
          } else if (attr === 'mi_createDate') {
            obj[attr] = AC.dateService.formatDate(item[attr])
          } else {
            obj[attr] = item[attr]
          }
        })
        params.rows.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
  },

  onChangeIncludeChildOrgs: function (form, onDate = appAC.globalApplicationDate()) {
    const orgID = form.down('[name=organizationID]').getValue()
    const includeChildOrgs = form.down('[name=includeChildOrgs]').getValue()
    const whereList = [
      ['state', '=', 'ACTIVE'],
      ['orgID.state', '=', 'ACTIVE'],
      ['orgID.mi_dateFrom', '<=', onDate],
      ['orgID.mi_dateTo', '>=', onDate]
    ]
    whereList.push(includeChildOrgs
      ? ['orgID.mi_treePath', 'like', `/${orgID || 0}/`]
      : ['orgID', '=', orgID || 0])
  },
  getIncludeChildOrgs: function (accMainReportsSubOrg, config) {
    const me = this
    config = config || {}
    const res = {
      xtype: 'checkboxfield',
      name: config.name || 'includeChildOrgs',
      boxLabel: config.boxLabel || UB.i18n('з підлеглими'),
      labelWidth: config.noBoxLabel ? undefined : (config.labelWidth || 110),
      width: config.noWidth ? undefined : (config.width || 140),
      checked: config.checked || false,
      readOnly: !accMainReportsSubOrg,
      listeners: {
        change: function (ctrl) {
          const form = ctrl.up('[name=paramPanel]') || ctrl.up('form')
          if (form) {
            me.onChangeIncludeChildOrgs(form)
          }
        }
      }
    }
    return _.merge(res, config)
  },
  onParamPanelConfig: function () {
    const me = this
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
                          }
                        },
                        orderList: { orderBy: { expression: 'description' } },
                        __mip_ondate: appAC.globalApplicationDate()
                      }

                    }),
                    me.getIncludeChildOrgs(true)
                  ]
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          onDate: appAC.globalApplicationDate()
        }
      }
    })
    return paramForm
  }
}
