/* global Ext $App UB AC HR appAC appHR */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => {
      return AC.reportService.generateReport(me.getParams(data), me)
    }
    )
  },

  getData (reportParams) {
    const me = this
    return $App.connection.run({
      entity: 'hr_reportGreaterMaxECB',
      method: 'search',
      fieldList: [ 'tabNum', 'fullFIO', 'posName', 'sum', 'maxSum', 'greater', 'period' ],
      orgID: reportParams.orgID,
      onDate: reportParams.onDate,
      departmentID: reportParams.departmentID,
      includeChildDepts: reportParams.includeChildDepts,
      periodID: reportParams.periodID,
      periodDateTo: reportParams.periodDateTo
    }).then(response => {
      return me.getAllData(response, reportParams.orgID, reportParams.departmentID, reportParams.periodID, reportParams.includeChildDepts)
    })
  },

  getAllData: async function (result, orgID, departmentID, periodID, includeChildDepts) {
    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .selectScalar()
    result.orgName = orgName

    const departmentName = await UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', departmentID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .orderBy('mi_dateFrom', 'desc')
      .selectScalar()
    result.departmentName = departmentName
    result.includeChildDepts = includeChildDepts

    const periodName = await UB.Repository('hr_dictPeriod')
      .attrs(['name'])
      .selectById(periodID)
    result.periodName = periodName['name']

    return result
  },

  getParams: function (data) {
    let resData = data.resultData.data

    const params = {
      personTable: [],
      onDate: '',
      dateFrom: '',
      dateTo: '',
      org: UB.i18n('Органiзацiя'),
      departmentName: '',
      totalSum: 0,
      totalMaxSum: 0,
      totalGreater: 0
    }
    params.org = data.orgName

    // set titles
    // if (data.onDate) {
    //   params.onDate = AC.dateService.formatDate(data.onDate)
    // }

    if (data.departmentName) {
      params.departmentName = (data.departmentName ? data.departmentName : '') + (data.includeChildDepts ? ' із підлеглими' : '')
    }

    if (data.periodName) {
      params.periodName = data.periodName
    }

    let tableFields = data.resultData.fields

    // set fields names
    data.resultData.fields.forEach(item => {
      params[item] = item
    })

    // set data for personTable
    if (resData.length === 0) {
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
          if (attr === 'sum' || attr === 'maxSum' || attr === 'greater') {
            item[j] = item[j] ? AC.currencyService.round(item[j], 2) : 0
            obj[attr] = item[j]

            params.totalSum = AC.currencyService.round(params.totalSum += attr === 'sum' ? item[j] : 0, 2)
            params.totalMaxSum = AC.currencyService.round(params.totalMaxSum += attr === 'maxSum' ? item[j] : 0, 2)
            params.totalGreater = AC.currencyService.round(params.totalGreater += attr === 'greater' ? item[j] : 0, 2)
            // params.totalSum += attr === 'sum' ? item[j] : 0
            // params.totalMaxSum += attr === 'maxSum' ? item[j] : 0
            // params.totalGreater += attr === 'greater' ? item[j] : 0
          } else {
            obj[attr] = item[j]
          }
          j++
        })
        params.personTable.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
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
                  name: 'periodID',
                  fieldLabel: UB.i18n('Період'),
                  labelWidth: 100,
                  valueField: 'ID',
                  displayField: 'description',
                  pageSize: 50,
                  width: 350,
                  allowBlank: false,
                  ubRequest: {
                    entity: 'hr_dictPeriod',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'description', 'dateFrom', 'dateTo', 'orgID'],
                    whereList: {
                      orgID: {
                        expression: '[orgID]',
                        condition: 'equal',
                        value: appAC.globalOrganization()
                      }
                    },
                    orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } }
                  },
                  listeners: {
                    expand: appHR.periodExpand,
                    afterrender: function (ctrl) {
                      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
                        ctrl.setValueById(response.ID)
                      })
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 100,
                  width: 640,
                  filterByGlobalOrg: true,
                  displayField: 'description',
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
                HR.controlService.getIncludeChildDepts() ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        let periodID = frm.findField('periodID').getValue()
        let tData = frm.findField('periodID').store.data.items.filter(it => it.data.ID === periodID)
        tData = tData[0].data.dateTo
        let periodDateTo = AC.dateService.truncTimeToUtcNull(tData)
        return {
          periodDateTo: periodDateTo,
          orgID: appAC.globalOrganization(),
          onDate: appAC.globalApplicationDate(),
          departmentID: frm.findField('departmentID').getValue(),
          periodID: periodID,
          includeChildDepts: frm.findField('includeChildDepts').getValue()
        }
      }
    })
    return paramForm
  }

}
