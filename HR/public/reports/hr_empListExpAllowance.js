/* global UB, HR, AC, Ext, $App, appAC */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let organizationID = reportParams.orgID
    let respID = reportParams.respID
    let dateFrom = AC.dateService.shiftDate(reportParams.dateFrom)
    let dateTo = AC.dateService.shiftDate(reportParams.dateTo)
    // let onDate = AC.dateService.todayDate()
    let onDate = appAC.globalApplicationDate()
    let result = {
      dateFrom: AC.dateService.formatDate(dateFrom),
      dateTo: AC.dateService.formatDate(dateTo),
      respName: '',
      respPosName: '',
      subOrg: '',
      onDate: AC.dateService.formatDate(appAC.globalApplicationDate())
    }

    let childOrgIDs

    if (reportParams.subOrg) {
      childOrgIDs = await HR.treeUtils.getChildOrgs(organizationID, onDate)
      result.subOrg = UB.i18n('(з підпорядкованими організаціями)')
    } else {
      childOrgIDs = [organizationID]
    }

    const org = await UB.Repository('hr_organization')
      .attrs(['EDRPOUCode', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.organizationName = org.name || ''

    if (respID) {
      let respPosInfo = await UB.Repository('hr_employeePositionS')
        .attrs('ID', 'employeeID.shortFIO', 'positionID')
        .where('ID', '=', respID)
        .where('employeeID.mi_deleteDate', '>=', '#maxdate')
        .selectSingle()
      if (respPosInfo) {
        result.respName = respPosInfo['employeeID.shortFIO']
        result.respPosName = await UB.Repository('hr_position')
          .attrs(['fullName'])
          .where('mi_data_id', '=', respPosInfo['positionID'] ? respPosInfo['positionID'] : 0)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: onDate })
          .selectScalar()
      }
    }

    Object.assign(reportParams, { childOrgIDs: childOrgIDs.join(',') })

    const rowsQuery1 = Object.assign({
      entity: 'hr_empListExpAllowance',
      method: 'getEmpListExpAllowanceData'
    }, reportParams)

    const [
      { resultData: emps }
    ] = await UB.connection.runTransAsObject([rowsQuery1])
    Object.assign(result, JSON.parse(emps))
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
            HR.controlService.getAppChildOrgCombo({
              labelWidth: 145
            }),
            {
              xtype: 'checkboxfield',
              labelWidth: 145,
              name: 'subOrg',
              fieldLabel: UB.i18n('З підпорядкованими організаціями'),
              checked: false
            },
            {
              layout: { type: 'hbox' },
              flex: 1,
              items: [
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 145,
                  width: 300,
                  fieldLabel: UB.i18n('За період з'),
                  allowBlank: false,
                  value: AC.dateService.addMonths(new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0), +1),
                  validator: function (value) {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()

                    let yDiff = AC.dateService.yearsDiff(new Date(f), new Date(t))
                    let res = true
                    if (yDiff && yDiff !== 0) {
                      res = UB.i18n('Діапазон дат не повинен перевищувати рік')
                    } else if (f > t) {
                      res = UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                    } else {
                      me.findField('dateTo').clearInvalid()
                    }
                    return res
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 30,
                  width: 100,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: AC.dateService.lastDayOfMonth(AC.dateService.addMonths(new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0), +1)),
                  validator: function (value) {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()

                    let yDiff = AC.dateService.yearsDiff(new Date(f), new Date(t))
                    let res = true
                    if (yDiff && yDiff !== 0) {
                      res = UB.i18n('Діапазон дат не повинен перевищувати рік')
                    } else if (f > t) {
                      res = UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                    } else {
                      me.findField('dateFrom').clearInvalid()
                    }
                    return res
                  }
                }
              ]
            },

            {
              xtype: 'ubcombobox',
              name: 'payElID',
              fieldLabel: UB.i18n('Вид нарахування'),
              labelWidth: 145,
              gridFieldList: ['description'],
              displayField: 'description',
              allowBlank: false,
              hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
              disableModifyEntity: true,
              fieldList: ['ID', 'description', 'codeSort'],
              ubRequest: {
                entity: 'hr_payEl',
                fieldList: ['ID', 'description'],
                whereList: {
                  methodId: {
                    expression: '[methodID.code]',
                    condition: '=',
                    values: {
                      value: '6'
                    }
                  }
                },
                orderList: { orderBy: { expression: 'codeSort' } }
              },
              listeners: {
                afterrender: function (ctrl) {
                  UB.Repository('hr_payEl')
                    .attrs(['ID'])
                    .where('methodID.code', '=', '6')
                    .selectAsObject()
                    .then(response => {
                      if (response && response.length === 1) {
                        ctrl.setValueById(response[0].ID)
                      }
                    })
                }
              }

            },

            HR.controlService.getRespEmpCombo({
              name: 'respID',
              fieldLabel: UB.i18n('Відповідальний'),
              labelWidth: 145,
              width: 540,
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
          // organizationID: frm.findField('organizationID').getValue() || 0,
          orgID: frm.findField('organizationID').getValue() || 0,
          respID: frm.findField('respID').getValue() || 0,
          dateFrom: frm.findField('dateFrom').getValue(),
          dateTo: frm.findField('dateTo').getValue(),

          subOrg: frm.findField('subOrg').getValue(),
          payElID: frm.findField('payElID').getValue(),
          onDate: appAC.globalApplicationDate()
        }
      }
    })
    return paramForm
  }
}
