/* global Ext _ UB AC appAC HR $App */
let reportObj

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = await HR.staffTariffing.getReportData(reportParams)
    reportObj = result
    return result
  },
  onParamPanelConfig: function () {
    const initialDate = appAC.globalApplicationDate()
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        render: function (form) {
          const reportViewer = form.ownerCt
          reportViewer.exportToXLSX = exportToXLSX
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'hbox' },
          defaults: { labelWidth: 150 },
          items: [
            { layout: { type: 'vbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 150,
                  width: 650,
                  allowBlank: false,
                  disableContextMenu: true,
                  addFields: ['nameGen', 'nameDat', 'name'],
                  readOnly: true
                }),
                HR.controlService.get2DepCombo({
                  labelWidth: 150,
                  width: 650,
                  displayField: 'description'
                }),
                {
                  xtype: 'ubcombobox',
                  name: 'dictFundSourceID',
                  fieldLabel: UB.i18n('Джерело фінансування'),
                  labelWidth: 150,
                  width: 650,
                  hideEntityItemInContext: true,
                  gridFieldList: ['ID', 'name', 'description'],
                  valueField: 'ID',
                  displayField: 'name',
                  ubRequest: {
                    entity: 'ac_fundSource',
                    method: 'selectByOrg',
                    fieldList: ['ID', 'name']
                  },
                  listeners: {
                    afterrender: function (ctrl) {
                      ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                    }
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  fieldLabel: UB.i18n('Станом на'),
                  value: initialDate,
                  allowBlank: false,
                  width: 320,
                  labelWidth: 150,
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      for (let i = 1; i <= 2; i++) {
                        const respPositionID = form.down(`[name=respPositionID${i}]`)
                        const onDate = ctrl.getValue()
                        const onDateIsValid = AC.dateService.isValid(onDate)
                        if (onDateIsValid) {
                          AC.viewUtils.setWhereListProperty(respPositionID, [['mi_dateFrom', '<=', onDate], ['mi_dateTo', '>=', onDate]],
                            null, ['clearStore', 'clearValue'])
                        }
                        respPositionID.setDisabled(!onDateIsValid)
                      }
                    }
                  }
                },
                {
                  layout: { type: 'hbox' },
                  items: [{
                    xtype: 'checkboxfield',
                    labelWidth: 200,
                    name: 'indexInVacancy',
                    value: 1,
                    fieldLabel: UB.i18n('Нумерація рядків вакансій')
                  }, {
                    xtype: 'checkboxfield',
                    labelWidth: 170,
                    name: 'byStaff',
                    value: 1,
                    fieldLabel: UB.i18n('За штатним розписом')
                  }, {
                    xtype: 'checkboxfield',
                    labelWidth: 390,
                    name: 'useCoef',
                    hidden: true,
                    fieldLabel: UB.i18n('Суми надбавок та доплат виводити згідно обсягу робіт')
                  }]
                }
              ] },
            { layout: { type: 'vbox' },
              items: [
                {
                  layout: { type: 'hbox' },
                  items: [
                    {
                      layout: {
                        type: 'vbox',
                        align: 'stretch'
                      },
                      flex: 1,
                      items: [
                        {
                          xtype: 'fieldset',
                          name: 'signer1',
                          layout: { type: 'vbox', align: 'stretch' },
                          margin: '5 0 5 10',
                          padding: '0 0 5 0',
                          flex: 1,
                          style: 'border-color: #2f7c94',
                          items: [
                            HR.orgStructReportUtils.getSignatoryCombos({
                              onDate: initialDate,
                              noOrgRespPosition: true,
                              signer4EmpOrder: 'signer4Stafflist',
                              labelWidth: 140,
                              width: 652,
                              allowBlank: true,
                              name1: 'respPositionID1',
                              fieldLabel1: UB.i18n('Підписант 1 (посада)'),
                              name2: 'respEmp1',
                              fieldLabel2: UB.i18n('Підписав'),
                              onDateControl: 'onDate'
                            })
                          ]
                        },
                        {
                          xtype: 'fieldset',
                          name: 'signer2',
                          layout: { type: 'vbox', align: 'stretch' },
                          margin: '5 0 5 10',
                          padding: '0 0 5 0',
                          flex: 1,
                          style: 'border-color: #2f7c94',
                          items: [
                            HR.orgStructReportUtils.getSignatoryCombos({
                              onDate: initialDate,
                              noOrgRespPosition: true,
                              signer4EmpOrder: 'signer4StafflistSecond',
                              labelWidth: 140,
                              width: 652,
                              allowBlank: true,
                              name1: 'respPositionID2',
                              fieldLabel1: UB.i18n('Підписант 2 (посада)'),
                              name2: 'respEmp2',
                              fieldLabel2: UB.i18n('Підписав'),
                              onDateControl: 'onDate'
                            })
                          ]
                        }
                      ]
                    }
                  ]
                }
              ] }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const orgIDCtrl = frm.findField('organizationID')
        const structDepCtrl = frm.findField('structDepID')
        const childDepCtrl = frm.findField('childDepID')
        let structDepID = structDepCtrl.getValue()
        const childDepID = childDepCtrl.getValue()
        let structDepName
        const childDepName = (childDepID && childDepCtrl.getFieldValue('nameGen') && childDepCtrl.getFieldValue('nameGen').trim()) || childDepCtrl.getFieldValue('name')
        // const dictFundSourceCtrl = frm.findField('dictFundSourceID')
        if (childDepID && !structDepID) {
          structDepID = childDepCtrl.getFieldValue('parentUnitID')
          const structDepReco = structDepCtrl.getStore().data.items.find(rec => rec.get('mi_data_id') === structDepID)
          structDepName = structDepReco && structDepReco.get('name')
        } else {
          structDepName = (structDepID && structDepCtrl.getFieldValue('nameGen') && structDepCtrl.getFieldValue('nameGen').trim()) || structDepCtrl.getFieldValue('name')
        }
        return {
          orgID: orgIDCtrl.getValue() || 0,
          orgName: (orgIDCtrl.getFieldValue('nameGen') && orgIDCtrl.getFieldValue('nameGen').trim()) || orgIDCtrl.getFieldValue('name'),
          orgNameDat: (orgIDCtrl.getFieldValue('nameDat') && orgIDCtrl.getFieldValue('nameDat').trim()) || orgIDCtrl.getFieldValue('name'),
          structDepID: structDepID || 0,
          structDepName: HR.nameCase.cap(structDepName || ''),
          childDepID: childDepID || 0,
          childDepName: HR.nameCase.cap(childDepName || ''),
          dictFundSourceID: frm.findField('dictFundSourceID').getValue(),
          onDate: frm.findField('onDate').getValue(),
          respPositionID1: frm.findField('respPositionID1').getValue(),
          respEmp1: frm.findField('respEmp1').getValue(),
          respPositionID2: frm.findField('respPositionID2').getValue(),
          respEmp2: frm.findField('respEmp2').getValue(),
          indexInVacancy: frm.findField('indexInVacancy').getValue(),
          byStaff: frm.findField('byStaff').getValue(),
          useCoef: frm.findField('useCoef').getValue()
        }
      }
    })
    reportObj = undefined
    return paramForm
  }
}

function exportToXLSX () {
  if (!reportObj) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.generateExcelReport('hr_report', 'runTariffing', 'Tariffing.xlsx', reportObj, this)
}
