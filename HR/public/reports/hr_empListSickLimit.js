/* global Ext UB AC HR appAC appHR */

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
      entity: 'hr_empListSickLimit',
      method: 'search',
      fieldList: [ 'tabNum', 'fullFIO', 'posName', 'typeSickLimit', 'docNumber', 'period', 'lastName', 'firstName' ],
      orgID: reportParams.orgID,
      onDate: reportParams.onDate,
      dateFrom: reportParams.dateFrom,
      dateTo: reportParams.dateTo,
      departmentID: reportParams.departmentID,
      includeChildDepts: reportParams.includeChildDepts
    }).then(response => {
      return me.getAllData(response, reportParams.orgID, reportParams.departmentID, reportParams.includeChildDepts)
    })
  },

  getAllData: async function (result, orgID, departmentID, includeChildDepts) {
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
      departmentName: ''
    }
    params.org = data.orgName

    // set titles
    if (data.dateFrom) {
      params.dateFrom = AC.dateService.formatDate(data.dateFrom)
    }

    if (data.dateTo) {
      params.dateTo = AC.dateService.formatDate(data.dateTo)
    }

    if (data.onDate) {
      params.onDate = AC.dateService.formatDate(data.onDate)
    }

    if (data.departmentName) {
      params.departmentName = (data.departmentName ? data.departmentName : '') + (data.includeChildDepts ? ' із підлеглими' : '')
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
          obj[attr] = item[j]
          j++
        })
        params.personTable.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
  },

  onParamPanelConfig: function () {
    // let pDateFrom = appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
    //     alert(response.dateFrom) })

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
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 100,
                  width: 240,
                  allowBlank: false,
                  fieldLabel: UB.i18n('Перiод з'),
                  listeners: {
                    afterrender: function (crtl) {
                      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => { crtl.setValue(response.dateFrom) })
                    }
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 50,
                  width: 240,
                  allowBlank: false,
                  fieldLabel: UB.i18n('по'),
                  listeners: {
                    afterrender: function (crtl) {
                      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => { crtl.setValue(response.dateTo) })
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
        return {
          dateFrom: AC.dateService.truncTimeToUtcNull(frm.findField('dateFrom').getValue()),
          dateTo: AC.dateService.truncTimeToUtcNull(frm.findField('dateTo').getValue()),
          orgID: appAC.globalOrganization(),
          onDate: appAC.globalApplicationDate(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildDepts: frm.findField('includeChildDepts').getValue()
        }
      }
    })
    return paramForm
  }

}
