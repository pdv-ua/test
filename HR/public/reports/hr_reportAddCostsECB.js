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
      entity: 'hr_reportAddCostsECB',
      method: 'search',
      fieldList: [ 'tabNum', 'fullFIO', 'posName', 'period', 'sourceSum', 'rate', 'paySum', 'baseSum', 'employeeNumberID' ],
      orgID: reportParams.orgID,
      onDate: reportParams.onDate,
      departmentID: reportParams.departmentID,
      periodID: reportParams.periodID,
      periodDateTo: reportParams.periodDateTo,
      includeChildDepts: reportParams.includeChildDepts
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
      totalSumECB: 0,
      totalAddECB: 0,
      totalGeneralECB: 0
    }
    params.org = data.orgName

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
        obj['sum'] = ' '
        obj['sumECB'] = ' '
        obj['addECB'] = ' '
        obj['generalECB'] = ' '
        params.personTable.push(obj)
      }
    } else {
      let personTable = []
      // params.period = params.periodName
      resData.forEach(item => {
        let obj = {}
        let j = 0
        // obj['pn'] = k
        tableFields.forEach(attr => {
          // if (attr === 'sum' || attr === 'sumECB' || attr === 'addECB' || attr === 'generalECB') {
          if (attr === 'sourceSum' || attr === 'rate' || attr === 'paySum' || attr === 'baseSum') {
            obj[attr] = item[j] ? AC.currencyService.round(item[j], 2) : 0
          } else {
            obj[attr] = item[j]
          }
          j++
        })
        personTable.push(obj)
        // k++
      })

      let k = 1
      personTable = personTable.length ? _.groupBy(personTable, item => { return `${item.employeeNumberID}/${item.period}/${item.rate}` }) : {}
      _.forEach(personTable, items => {
        const obj = {
          tabNum: items[0].tabNum,
          fullFIO: items[0].fullFIO,
          posName: items[0].posName,
          period: items[0].period,
          baseSum: items.reduce((res, af) => (res + (af.baseSum || 0)), 0),
          sum: items.reduce((res, af) => (res + (af.sourceSum || 0)), 0),
          sumECB: AC.currencyService.round(items.reduce((res, af) => (res + (af.sourceSum * af.rate / 100)),  0)),
          generalECB: items.reduce((res, af) => (res + (af.paySum || 0)), 0),
        }

        obj.addECB = obj.generalECB - obj.sumECB
        if (obj.sum < obj.baseSum) {
          obj.pn = k++
          params.personTable.push(obj)

          params.totalSum += obj.sum
          params.totalSumECB += obj.sumECB
          params.totalAddECB += obj.addECB
          params.totalGeneralECB += obj.generalECB
        }
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
