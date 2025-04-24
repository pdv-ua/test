/* global Ext $App UB AC appAC appHR */

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
      entity: 'hr_memorialOrder5',
      method: 'getMemOrder5PayReportData',
      orgID: reportParams.orgID,
      periodID: reportParams.periodID,
      dictFundSourceID: reportParams.dictFundSourceID,
      isIncludeEmpty: reportParams.isIncludeEmpty
    }).then(response => {
      response = JSON.parse(response.resultData)
      response.fields = [ 'entryOperationName', 'accountDtCode', 'accountKtCode', 'sum' ]
      return me.getAllData(response, reportParams.orgID, reportParams.periodID, reportParams.perfomerID,
        reportParams.checkingID, reportParams.accountantID, reportParams.dateReport, reportParams.onDate)
    })
  },

  getAllData: async function (result, orgID, periodID, perfomerID, checkingID, accountantID, dateReport, currDate) {
    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName', 'EDRPOUCode'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      // .misc({ __mip_ondate: dateReport })
      .misc({ __mip_ondate: currDate })
      .selectSingle()
    result.orgName = orgName['fullName']
    result.EDRPOUCode = orgName['EDRPOUCode']

    const period = await UB.Repository('hr_dictPeriod')
      .attrs(['name'])
      .where('ID', '=', periodID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectScalar()
    result.period = period

    result[`perfomerIDPosition`] = ''
    result[`perfomerIDFIO`] = ''
    result[`checkingIDPosition`] = ''
    result[`checkingIDFIO`] = ''
    result[`accountantIDFIO`] = ''
    let respEmps = [ perfomerID, checkingID, accountantID ].filter(Boolean).filter((el, index, arr) => arr.indexOf(el) === index)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', orgID)

    if (respEmps.length > 0) {
      const posVacObj = await $App.connection.run({
        entity: 'hr_memorialOrder5',
        method: 'getSignerData',
        signers: respEmps.join(', '),
        onDate: currDate,
        useActualPositionName: useActualPositionName
      })
      let signerData = JSON.parse(posVacObj.resultData)

      signerData.forEach(item => {
        if (item.epID === perfomerID) {
          result[`perfomerIDPosition`] = item['posName'] ? item['posName'] : ''
          result[`perfomerIDFIO`] = item['shortFIO'] ? item['shortFIO'] : ''
        }
        if (item.epID === checkingID) {
          result[`checkingIDPosition`] = item['posName'] ? item['posName'] : ''
          result[`checkingIDFIO`] = item['shortFIO'] ? item['shortFIO'] : ''
        }
        if (item.epID === accountantID) {
          result[`accountantIDFIO`] = item['shortFIO'] ? item['shortFIO'] : ''
        }
      })
    }

    result.dateReport = dateReport
    return result
  },

  getParams: function (data) {
    let resData = data.resultData

    const params = {
      personTable: [],
      onDate: '',
      dateFrom: '',
      dateTo: '',
      org: UB.i18n('Органiзацiя'),
      departmentName: '',
      EDRPOUCode: '',
      period: ''
    }
    params.org = data.orgName
    params.EDRPOUCode = data.EDRPOUCode
    params.period = data.period
    params.dateReport = AC.dateService.getStringFormatDate(data.dateReport, '', '')

    params.perfomerIDPosition = data.perfomerIDPosition ? data.perfomerIDPosition : ''
    params.perfomerIDFIO = data.perfomerIDFIO ? data.perfomerIDFIO : ''

    params.checkingIDPosition = data.checkingIDPosition ? data.checkingIDPosition : ''
    params.checkingIDFIO = data.checkingIDFIO ? data.checkingIDFIO : ''

    params.accountantIDPosition = data.accountantIDPosition ? data.accountantIDPosition : ''
    params.accountantIDFIO = data.accountantIDFIO ? data.accountantIDFIO : ''

    let tableFields = data.fields

    params.totalSumText = data.totalSumText
    params.totalSum = data.totalSum

    // set fields names
    data.fields.forEach(item => {
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
      params.personTable = resData
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
                  allowBlank: false,
                  name: 'periodID',
                  fieldLabel: UB.i18n('Період звіту'),
                  labelWidth: 180,
                  width: 350,
                  // hideEntityItemInContext: true,
                  selectOnFocus: true,
                  ubRequest: {
                    entity: 'hr_dictPeriod',
                    fieldList: ['ID', 'description', 'dateFrom', 'dateTo', 'orgID'],
                    orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } }
                  },
                  pageSize: 50,
                  listeners: {
                    afterrender: function (ctrl) {
                      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
                        ctrl.setValueById(response.ID)
                      })
                    },
                    beforeQuerySend: function () {
                      this.store.ubRequest.whereList = {
                        orgID: {
                          expression: '[orgID]',
                          condition: 'equal',
                          value: appAC.globalOrganization()
                        }
                      }
                      if (!this.whereListIsSet) this.whereListIsSet = true
                      else this.store.reload()
                    },
                    expand: appHR.periodExpand
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateReport',
                  labelWidth: 100,
                  width: 240,
                  margin: '2 0 0 35',
                  allowBlank: false,
                  fieldLabel: UB.i18n('Дата звіту'),
                  listeners: {
                    afterrender: function (crtl) {
                      crtl.setValue(appAC.globalApplicationDate())
                    },
                    change: function (ctrl) {
                      if (ctrl.getValue() && ctrl.isValid()) {
                        const form = ctrl.up('form')
                        const perfomerID = form.down('[name=perfomerID]')
                        const checkingID = form.down('[name=checkingID]')
                        const accountantID = form.down('[name=accountantID]')
                        const reportDate = AC.dateService.shiftDate(ctrl.getValue())
                        let whereList = [
                          ['dateFrom', '<=', reportDate || appAC.globalApplicationDate()],
                          ['dateTo', '>=', reportDate || appAC.globalApplicationDate()],
                          ['organizationID', '=', appAC.globalOrganization()]
                        ]
                        AC.viewUtils.setWhereListProperty(perfomerID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                        AC.viewUtils.setWhereListProperty(checkingID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])

                        AC.viewUtils.setWhereListProperty(accountantID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                        accountantID.store.isChange = false
                      }
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubboxselect',
                  name: 'dictFundSourceID',
                  fieldLabel: UB.i18n('Джерело фінансування'),
                  labelWidth: 180,
                  width: 490,
                  displayField: 'name',
                  valueField: 'ID',
                  multiSelect: true,
                  allowBlank: true,
                  ubRequest: {
                    entity: 'ac_fundSource',
                    method: 'selectByOrg',
                    fieldList: ['ID', 'name']
                  },
                  listeners: {
                    afterrender: function (ctrl) {
                      ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                      ctrl.store.ubRequest.emptyValue = true
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'perfomerID',
                  fieldLabel: UB.i18n('Виконавець'),
                  labelWidth: 180,
                  width: 640,
                  valueField: 'ID',
                  displayField: 'description',
                  ubRequest: {
                    entity: 'hr_employeePositionS',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'description']
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'checkingID',
                  fieldLabel: UB.i18n('Перевірив'),
                  labelWidth: 180,
                  width: 640,
                  valueField: 'ID',
                  displayField: 'description',
                  ubRequest: {
                    entity: 'hr_employeePositionS',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'description']
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'accountantID',
                  fieldLabel: UB.i18n('Головний бухгалтер'),
                  labelWidth: 180,
                  width: 640,
                  valueField: 'ID',
                  displayField: 'description',
                  ubRequest: {
                    entity: 'hr_employeePositionS',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'description', 'positionID']
                  },
                  listeners: {
                    render: function (ctrl) {
                      ctrl.store.on('load', () => {
                        if (!ctrl.store.isChange) {
                          ctrl.store.isChange = true

                          const form = ctrl.up('form')
                          let dateReport = form.down('[name=dateReport]')
                          dateReport = AC.dateService.shiftDate(dateReport.getValue())
                          appHR.getAccountantChiefPosition(appAC.globalOrganization(), dateReport).then(response => {
                            if (response.ID && ctrl.store && ctrl.store.data && ctrl.store.data.items && ctrl.store.data.items.length > 0) {
                              let filterEmpOfPos = ctrl.store.data.items.filter(emp => emp.data.positionID === response.ID)
                              if (filterEmpOfPos && filterEmpOfPos.length > 0) ctrl.setValueById(filterEmpOfPos[0].data.ID)
                            }
                          })
                        }
                      })
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        let dateReport = frm.findField('dateReport').getValue()
        dateReport = AC.dateService.truncTimeToUtcNull(dateReport)

        let periodID = frm.findField('periodID').getValue()
        let perfomerID = frm.findField('perfomerID').getValue()
        let checkingID = frm.findField('checkingID').getValue()
        let accountantID = frm.findField('accountantID').getValue()
        let dictFundSourceID = frm.findField('dictFundSourceID').getValue()
        let isIncludeEmpty = false
        if (dictFundSourceID === '') {
          dictFundSourceID = []
        } else {
          dictFundSourceID = dictFundSourceID.split(',').map(id => parseInt(id))
          isIncludeEmpty = dictFundSourceID.includes(0)
        }

        let orgID = appAC.globalOrganization()
        let onDate = appAC.globalApplicationDate()
        return {
          dateReport: dateReport,
          orgID: orgID,
          onDate: onDate,
          periodID: periodID,
          perfomerID: perfomerID,
          checkingID: checkingID,
          accountantID: accountantID,
          isIncludeEmpty,
          dictFundSourceID: dictFundSourceID.filter(ID => ID !== 0)
        }
      }
    })
    return paramForm
  }

}
