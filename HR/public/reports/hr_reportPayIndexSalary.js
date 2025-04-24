/* global Ext UB AC appAC appHR */
// const orgService = require('../../../HR/modules/orgService')

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    }
    )
  },

  getReportData: async function (reportParams) {
    const me = this

    let orgID = reportParams.orgID
    let dateFrom = reportParams.dateFrom
    let dateTo = reportParams.dateTo
    let posEmployeeID = reportParams.posEmployeeID
    let posAccountantID = reportParams.posAccountantID
    let dateReport = reportParams.dateReport

    let result = {
      payTable: [],
      totalPaySum: 0,
      totalBaseSum: 0,
      planSum: 0
    }

    result.dateTo = AC.dateService.formatDate(dateTo)
    result.dateReport = AC.dateService.formatDate(dateReport)

    const orgName = await UB.Repository('hr_organization')
      .attrs(['name', 'nameDat'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .selectSingle()
    result.orgName = orgName['nameDat'] || orgName['name']

    const employeePosition = await UB.Repository('hr_employeePositionSR')
      .attrs(['employeeNumberID', 'positionID.name', 'workerType.name', 'employeeID', 'raiseSalary'])
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.orgID', '=', orgID)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', dateReport)
      .where('positionID.mi_dateTo', '>=', dateReport)
      .orderBy('dateFrom', 'desc')
      .selectById(posEmployeeID, {
        'employeeNumberID': 'employeeNumberID', 'positionID.name': 'position', 'workerType.name': 'workerType', 'employeeID': 'employeeID', 'raiseSalary': 'raiseSalary'
      })

    result.workerType = employeePosition['workerType'] ? employeePosition['workerType'].toLowerCase() : ''
    result.position = employeePosition['position'] || ''
    result.raiseSalary = employeePosition['raiseSalary'] ? AC.dateService.formatDate(employeePosition['raiseSalary']) : ''

    const emp = await UB.Repository('hr_employee')
      .attrs(['fullFIO', 'datName', 'taxCode'])
      .where('mi_deleteDate', '>=', '#maxdate')
      .selectById(employeePosition['employeeID'])
    result.emp = emp ? emp['datName'] || emp['fullFIO'] : ''
    result.taxCode = emp && emp['taxCode'] ? emp['taxCode'] : ''

    if (posAccountantID) {
      const acc = await UB.Repository('hr_employeePositionSR')
        .attrs(['employeeID.shortFIO'])
        .selectById(posAccountantID)
      result.accountantFIO = acc['employeeID.shortFIO'] || ''
    } else {
      result.accountantFIO = ''
    }

    // payTable
    const pay = await UB.Repository('hr_accrual')
      .attrs(['periodSalaryID', 'periodSalaryID.name', 'mtCount', 'sum([baseSum])', 'koef', 'sum([paySum])'])
      .where('periodCalc', '>=', dateFrom)
      .where('periodCalc', '<=', dateTo)
      .where('employeeNumberID', '=', employeePosition.employeeNumberID)
      .where('payElID.methodID.code', '=', '24')
      .where('flagsRecSum', '!=', 8192)
    // 24 надо, а 4 - для Debug
      .groupBy(['periodSalaryID', 'periodSalaryID.name', 'mtCount', 'koef'])
      .selectAsObject({
        'periodSalaryID.name': 'periodSalary', 'mtCount': 'mtCount', 'sum([baseSum])': 'baseSum', 'koef': 'koef', 'sum([paySum])': 'paySum'
      })

    if (pay) {
      pay.forEach(row => {
        result.totalPaySum += row['paySum']
        result.totalBaseSum += row['baseSum']
      })
      result.payTable = pay
    }

    const selectPayElIDfirst = await UB.Repository('hr_payEl')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('methodID.code', '=', '24')
      .selectSingle()

    const selectPayElID = await UB.Repository('hr_accrual')
      .attrs(['payElID', 'payElID.dateFrom', 'payElID.dateTo'])
      .where('periodCalc', '>=', dateFrom)
      .where('periodCalc', '<=', dateTo)
      .where('employeeNumberID', '=', employeePosition.employeeNumberID)
      .where('payElID.methodID.code', '=', '24')
      .where('flagsRecSum', '!=', 8192)
      .orderBy('dateFrom', 'desc')
      .selectSingle()

    const selectPayEl = {
      payElID: selectPayElID ? selectPayElID.payElID : selectPayElIDfirst.ID,
      dateFrom: selectPayElID ? selectPayElID['payElID.dateFrom'] : selectPayElIDfirst.dateFrom,
      dateTo: selectPayElID ? selectPayElID['payElID.dateTo'] : selectPayElIDfirst.dateTo
    }

    const period = await UB.Repository('hr_dictPeriod')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('orgID', '=', orgID)
      .where('dateFrom', '<=', dateReport)
      .where('dateTo', '>=', dateReport)
      .selectSingle()

    let planSum = await $App.connection.run({
      entity: 'hr_reportPayIndexSalary',
      method: 'calcPlan',
      orgID: orgID,
      dateFrom: dateFrom,
      dateTo: dateTo,
      employeeNumberID: employeePosition.employeeNumberID,
      dateReport: dateReport,
      period: period,
      selectPayEl: selectPayEl
    })
    result.planSum = planSum.resultData
    return result
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
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 140,
                  width: 280,
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
                  labelWidth: 60,
                  width: 100,
                  allowBlank: false,
                  fieldLabel: UB.i18n('по'),
                  listeners: {
                    afterrender: function (crtl) {
                      appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => { crtl.setValue(response.dateTo) })
                    }
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateReport',
                  labelWidth: 100,
                  width: 140,
                  margin: '2 0 0 35',
                  fieldLabel: UB.i18n('Дата видачи'),
                  listeners: {
                    afterrender: function (crtl) {
                      crtl.setValue(appAC.globalApplicationDate())
                    },
                    change: function (ctrl) {
                      if (ctrl.getValue() && ctrl.isValid()) {
                        const form = ctrl.up('form')
                        const posEmployeeID = form.down('[name=posEmployeeID]')
                        const posAccountantID = form.down('[name=posAccountantID]')
                        const reportDate = AC.dateService.shiftDate(ctrl.getValue())
                        let whereList = [
                          ['dateFrom', '<=', reportDate || appAC.globalApplicationDate()],
                          ['dateTo', '>=', reportDate || appAC.globalApplicationDate()],
                          ['organizationID', '=', appAC.globalOrganization()],

                          ['employeeNumberID.mi_deleteDate', '>=', '#maxdate'],
                          ['employeeNumberID.dateFrom', '<=', reportDate],
                          ['employeeNumberID.dateTo', '>=', reportDate]

                        ]
                        AC.viewUtils.setWhereListProperty(posEmployeeID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                        AC.viewUtils.setWhereListProperty(posAccountantID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                        posAccountantID.store.isChange = false
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
                  layout: { type: 'hbox' },
                  items: [
                    {
                      xtype: 'empPositionCombobox',
                      name: 'posEmployeeID',
                      fieldLabel: UB.i18n('Працівник'),
                      labelWidth: 140,
                      width: 788,
                      allowBlank: false,
                      valueField: 'ID',
                      displayField: 'description',
                      disableModifyEntity: true,
                      ubRequest: {
                        entity: 'hr_employeePositionSR',
                        method: UB.core.UBCommand.methodName.SELECT,
                        fieldList: ['ID', 'description'],
                        orderList: { orderBy: { expression: 'employeeNumberID.tabNumSort' } }
                      }
                    }
                  ]
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'empPositionCombobox',
                  name: 'posAccountantID',
                  fieldLabel: UB.i18n('Головний бухгалтер'),
                  disableModifyEntity: true,
                  labelWidth: 140,
                  width: 788,
                  valueField: 'ID',
                  displayField: 'description',
                  ubRequest: {
                    entity: 'hr_employeePositionS',
                    method: UB.core.UBCommand.methodName.SELECT,
                    fieldList: ['ID', 'description', 'positionID'],
                    orderList: { orderBy: { expression: 'employeeNumberID.tabNumSort' } }
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
                            if (response.ID && ctrl.store.data.items.length > 0) {
                              let filterEmpOfPos = ctrl.store.data.items.filter(emp => emp.data.positionID === response.ID)
                              ctrl.setValueById(filterEmpOfPos[0].data.ID)
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
        let dateFrom = frm.findField('dateFrom').getValue()
        dateFrom = AC.dateService.truncTimeToUtcNull(dateFrom)

        let dateTo = frm.findField('dateTo').getValue()
        dateTo = AC.dateService.truncTimeToUtcNull(dateTo)

        let dateReport = frm.findField('dateReport').getValue()
        dateReport = dateReport ? AC.dateService.truncTimeToUtcNull(dateReport) : appAC.globalApplicationDate()

        // let periodID = frm.findField('periodID').getValue()
        let posEmployeeID = frm.findField('posEmployeeID').getValue()
        let posAccountantID = frm.findField('posAccountantID').getValue()

        let orgID = appAC.globalOrganization()
        let onDate = appAC.globalApplicationDate()
        return {
          dateReport: dateReport,
          orgID: orgID,
          onDate: onDate,
          dateFrom: dateFrom,
          dateTo: dateTo,
          posEmployeeID: posEmployeeID,
          posAccountantID: posAccountantID
        }
      }
    })
    return paramForm
  }

}
