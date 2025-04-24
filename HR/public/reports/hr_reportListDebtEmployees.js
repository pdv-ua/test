/* global Ext UB AC HR appAC appHR appHR _ */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    if (reportParams.isGroupReport) {
      reportParams.orgID = reportParams.organizationID
    }
    return me.getData(reportParams).then(data => AC.reportService.generateReport(me.getParams(data), me))
  },
  getData (reportParams) {
    return Promise.all([
      appHR.getCurrentPeriod(reportParams.orgID),
      UB.Repository('hr_dictPeriod')
        .attrs(['ID', 'name', 'dateFrom'])
        .selectById(reportParams.periodID),
      UB.Repository('hr_department')
        .attrs('ID')
        .whereIf(reportParams.departmentID && reportParams.includeChildDepts, 'mi_treePath', 'like', `/${reportParams.departmentID}/`)
        .whereIf(reportParams.departmentID && !reportParams.includeChildDepts, 'mi_data_id', '=', reportParams.departmentID)
        .whereIf(!reportParams.departmentID && !reportParams.includeChildDepts, 'mi_data_id', '=', 0)
        .selectAsArrayOfValues()
    ]).then(([currPeriod, period, depIDs]) => {
      currPeriod.dateFrom = AC.dateService.shiftDate(currPeriod.dateFrom)
      period.dateFrom = AC.dateService.shiftDate(period.dateFrom)
      return Promise.all([
        UB.Repository('hr_organization')
          .attrs(['fullName'])
          .where('mi_data_id', '=', reportParams.orgID)
          .where('state', '=', 'ACTIVE')
          .selectScalar(),
        UB.Repository('hr_department')
          .attrs(['name'])
          .where('mi_data_id', '=', reportParams.departmentID)
          .where('state', '=', 'ACTIVE')
          .where('mi_deleteDate', '>=', '#maxdate')
          .orderBy('mi_dateFrom', 'desc')
          .selectScalar(),
        UB.Repository('hr_accrualBalance')
          .attrs(['periodCalcID', 'sumFrom', 'employeeNumberID', 'employeeNumberID.tabNum',
            'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.posName'])
          .where('employeeNumberID.orgID', '=', reportParams.orgID)
          .whereIf(depIDs.length, 'employeeNumberID.depID', 'in', depIDs)
          .whereIf(period.dateFrom > currPeriod.dateFrom, 'periodCalcID', 'in', currPeriod.ID)
          .whereIf(period.dateFrom <= currPeriod.dateFrom, 'periodCalcID', '=', reportParams.periodID)
          .orderBy('employeeNumberID.employeeID.fullFIO')
          .selectAsObject({
            'employeeNumberID.employeeID.fullFIO': 'fullFIO',
            'employeeNumberID.tabNum': 'tabNum',
            'employeeNumberID.posName': 'posName'
          }),
        UB.Repository('hr_accrual')
          .attrs('sum([paySum])', 'employeeNumberID')
          .where('periodSalaryID.dateFrom', '<=', period.dateFrom)
          .where('periodSalaryID.dateTo', '>=', currPeriod.dateFrom)
          .where('employeeNumberID.orgID', '=', reportParams.orgID)
          .where('flagsRecSum', '!=', 8192)
          .whereIf(depIDs.length, 'employeeNumberID.depID', 'in', depIDs)
          .whereIf(period.dateFrom <= currPeriod.dateFrom, 'ID', '=', 0) // not needed
          .whereIf(!AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess'), 'employeeNumberID.limitedAccess', '=', 0) // limitedAccess
          .groupBy(['employeeNumberID'])
          .selectAsObject({
            'sum([paySum])': 'paySum'
          })
      ]).then(([organizationName, departmentName, balance, accrual]) => ({
        currPeriod, organizationName, departmentName, period, balance, accrual, includeChildDepts: reportParams.includeChildDepts
      }))
    })
  },

  getParams: function (data) {
    // hr_reportListDebtEmployees
    data.accrual = data.accrual && data.accrual.length > 0 ? _.groupBy(data.accrual, 'employeeNumberID') : []
    const balance = []
    // have to manually calculate the sums due to the Position field
    data.balance.forEach((item) => {
      if (balance.length === 0) {
        balance.push(item)
      } else {
        const fnd = balance.find((el) => (
          el.periodCalcID === item.periodCalcID && el.employeeNumberID === item.employeeNumberID &&
            el.tabNum === item.tabNum && el.fullFIO === item.fullFIO && el.posName === item.posName))
        if (fnd) {
          fnd.sumFrom += item.sumFrom
        } else {
          balance.push(item)
        }
      }
    })

    const result = {
      periodName: data.period.name || '',
      organizationName: data.organizationName || '',
      departmentName: (data.departmentName ? data.departmentName : '') + (data.includeChildDepts ? ' із підлеглими' : ''),
      rows: balance.map((row, index) => {
        let summ = 0
        if (data.period.dateFrom <= data.currPeriod.dateFrom) {
          summ = row.sumFrom
        } else {
          if (data.accrual[row.employeeNumberID]) {
            const val = data.accrual[row.employeeNumberID][0]
            summ = (row.sumFrom || 0) + (val.paySum || 0)
          } else {
            summ = (row.sumFrom || 0)
          }
        }
        return Object.assign({}, row, {
          pn: index + 1,
          summ: -summ,
          summTxt: AC.currencyService.formatAsCurrency(-summ, 2)
        })
      }),
      totalSum: 0
    }

    result.rows = result.rows.filter(item => item.summ > 0.01)
    result.totalSum = result.rows.reduce((accum, obj) => (obj.summ + accum), 0)
    result.totalSum = result.totalSum ? AC.currencyService.formatAsCurrency(result.totalSum, 2) : '0,00'
    return AC.reportService.removeEmptyValues(result)
  },

  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
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
                  fieldLabel: UB.i18n('Станом на початок'),
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
                  labelWidth: 110,
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
                HR.controlService.getIncludeChildDepts()
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const periodID = frm.findField('periodID').getValue()
        let tData = frm.findField('periodID').store.data.items.filter(it => it.data.ID === periodID)
        tData = tData[0].data.dateTo
        const periodDateTo = AC.dateService.truncTimeToUtcNull(tData)
        return {
          periodDateTo: periodDateTo,
          orgID: appAC.globalOrganization(),
          departmentID: frm.findField('departmentID').getValue() || 0,
          includeChildDepts: frm.findField('includeChildDepts').getValue(),
          periodID: periodID
        }
      }
    })
    return paramForm
  }

}
