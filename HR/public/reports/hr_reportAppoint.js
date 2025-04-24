/* global appAC Ext _ UB AC HR $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let appointData = reportParams.appoints
    appointData = (typeof appointData === 'string') ? JSON.parse(appointData) : appointData

    let organizationID = appAC.globalOrganization()
    let onDate = AC.dateService.todayDate()
    let bossID = reportParams.bossID || 0
    let accID = reportParams.accID || 0

    let s = (AC.dateService.formatDate(onDate, 'ddmmyyyy')).split('')
    let result = {
      rows: [],
      type1: reportParams.type.type === '1' ? 'x' : '',
      type2: reportParams.type.type === '2' ? 'x' : '',
      bossName: '',
      bossTax: '',
      accName: '',
      accTax: '',
      onDate1: s[0] || '',
      onDate2: s[1] || '',
      onDate3: s[2] || '',
      onDate4: s[3] || '',
      onDate5: s[4] || '',
      onDate6: s[5] || '',
      onDate7: s[6] || '',
      onDate8: s[7] || ''
    }
    const org = await UB.Repository('hr_organization')
      .attrs(['EDRPOUCode', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.organizationName = org.name || ''
    let code = (org.EDRPOUCode || '').split('')
    result.organizationEDRPOUCode1 = code[0] || ''
    result.organizationEDRPOUCode2 = code[1] || ''
    result.organizationEDRPOUCode3 = code[2] || ''
    result.organizationEDRPOUCode4 = code[3] || ''
    result.organizationEDRPOUCode5 = code[4] || ''
    result.organizationEDRPOUCode6 = code[5] || ''
    result.organizationEDRPOUCode7 = code[6] || ''
    result.organizationEDRPOUCode8 = code[7] || ''
    result.organizationEDRPOUCode9 = code[8] || ''
    result.organizationEDRPOUCode10 = code[9] || ''

    let respPosInfo = await UB.Repository('hr_employeePositionS')
      .attrs('ID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.taxCode')
      .where('ID', 'in', [bossID, accID])
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    respPosInfo = respPosInfo ? _.groupBy(respPosInfo, 'ID') : []
    if (respPosInfo[bossID]) {
      result.bossName = respPosInfo[bossID][0]['employeeID.firstName'] ? respPosInfo[bossID][0]['employeeID.firstName'].substr(0, 1) + ' . ' : ''
      result.bossName += respPosInfo[bossID][0]['employeeID.middleName'] ? respPosInfo[bossID][0]['employeeID.middleName'].substr(0, 1) + ' . ' : ''
      result.bossName += respPosInfo[bossID][0]['employeeID.lastName']
      s = (respPosInfo[bossID][0]['employeeID.taxCode'] || '').split('')
      result.bossTax1 = s[0] || ''
      result.bossTax2 = s[1] || ''
      result.bossTax3 = s[2] || ''
      result.bossTax4 = s[3] || ''
      result.bossTax5 = s[4] || ''
      result.bossTax6 = s[5] || ''
      result.bossTax7 = s[6] || ''
      result.bossTax8 = s[7] || ''
      result.bossTax9 = s[8] || ''
      result.bossTax10 = s[9] || ''
    }
    if (respPosInfo[accID]) {
      result.accName = respPosInfo[accID][0]['employeeID.firstName'] ? respPosInfo[accID][0]['employeeID.firstName'].substr(0, 1) + ' . ' : ''
      result.accName += respPosInfo[accID][0]['employeeID.middleName'] ? respPosInfo[accID][0]['employeeID.middleName'].substr(0, 1) + ' . ' : ''
      result.accName += respPosInfo[accID][0]['employeeID.lastName']
      result.accTax = respPosInfo[accID][0]['employeeID.taxCode'] || ''
      s = (respPosInfo[accID][0]['employeeID.taxCode'] || '').split('')
      result.accTax1 = s[0] || ''
      result.accTax2 = s[1] || ''
      result.accTax3 = s[2] || ''
      result.accTax4 = s[3] || ''
      result.accTax5 = s[4] || ''
      result.accTax6 = s[5] || ''
      result.accTax7 = s[6] || ''
      result.accTax8 = s[7] || ''
      result.accTax9 = s[8] || ''
      result.accTax10 = s[9] || ''
    }

    result.rows = appointData.map((item, i) => {
      let code = ((item['taxCode'] || '') + ' '.repeat(10)).substr(0, 10).split('')
      let orderDate = (item['orderDate'] ? item['orderDate'].replace(/\./g, '') : '        ').split('')
      let fromDate = (item['dateFrom'] ? item['dateFrom'].replace(/\./g, '') : '        ').split('')
      return {
        index: i + 1,
        tax1: code[0] || '',
        tax2: code[1] || '',
        tax3: code[2] || '',
        tax4: code[3] || '',
        tax5: code[4] || '',
        tax6: code[5] || '',
        tax7: code[6] || '',
        tax8: code[7] || '',
        tax9: code[8] || '',
        tax10: code[9] || '',
        lastName: item['lastName'] || '',
        middleName: item['middleName'] || '',
        firstName: item['firstName'] || '',
        orderNum: item['orderNumber'] || '',
        orderDate1: orderDate[0] || '',
        orderDate2: orderDate[1] || '',
        orderDate3: orderDate[2] || '',
        orderDate4: orderDate[3] || '',
        orderDate5: orderDate[4] || '',
        orderDate6: orderDate[5] || '',
        orderDate7: orderDate[6] || '',
        orderDate8: orderDate[7] || '',
        fromDate1: fromDate[0] || '',
        fromDate2: fromDate[1] || '',
        fromDate3: fromDate[2] || '',
        fromDate4: fromDate[3] || '',
        fromDate5: fromDate[4] || '',
        fromDate6: fromDate[5] || '',
        fromDate7: fromDate[6] || '',
        fromDate8: fromDate[7] || ''
      }
    })
    s = ((appointData.length > 10 ? '' : '0') + appointData.length).split('')
    result.rowCount1 = s[0] || ''
    result.rowCount2 = s[1] || ''
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
                  xtype: 'radiogroup',
                  fieldLabel: UB.i18n('Тип'),
                  labelWidth: 135,
                  width: 540,
                  name: 'type',
                  columns: 2,
                  items: [{
                    name: 'type',
                    boxLabel: UB.i18n('Початкове'),
                    inputValue: '1',
                    checked: true
                  }, {
                    name: 'type',
                    boxLabel: UB.i18n('Скасовуюче'),
                    inputValue: '2'
                  }],
                  listeners: {
                    change: (crtl, value) => {
                      const me = paramForm.getForm()
                      let f = me.findField('dateFrom')
                      let t = me.findField('dateTo')
                      let btn = paramForm.down('[name=addBtn]')
                      f.setAllowBlank(value.type === '2')
                      t.setAllowBlank(value.type === '2')
                      if ((!f.getValue() || !t.getValue()) && value.type === '1') {
                        if (btn) btn.setDisabled(true)
                      } else {
                        if (btn) btn.setDisabled(false)
                      }
                    }
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 135,
                  width: 300,
                  fieldLabel: UB.i18n('Призначення з'),
                  value: AC.dateService.todayDate(),
                  allowBlank: false,
                  validator: function (value) {
                    let me = paramForm.getForm()
                    let f = me.findField('dateFrom')
                    let t = me.findField('dateTo')
                    let btn = paramForm.down('[name=addBtn]')
                    let rb = me.findField('type').getValue()
                    if ((!f.getValue() || !t.getValue()) && rb.type === '1') {
                      if (btn) btn.setDisabled(true)
                    } else {
                      if (btn) btn.setDisabled(false)
                    }
                    return (f.getValue() > t.getValue())
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 30,
                  width: 100,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: AC.dateService.todayDate(),
                  validator: function (value) {
                    let me = paramForm.getForm()
                    let f = me.findField('dateFrom')
                    let t = me.findField('dateTo')
                    let btn = paramForm.down('[name=addBtn]')
                    let rb = me.findField('type').getValue()
                    if ((!f.getValue() || !t.getValue()) && rb.type === '1') {
                      if (btn) btn.setDisabled(true)
                    } else {
                      if (btn) btn.setDisabled(false)
                    }
                    return (f.getValue() > t.getValue())
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                }
              ]
            }
          ]
        },
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getRespEmpCombo({
                  name: 'bossID',
                  fieldLabel: UB.i18n('Керівник'),
                  labelWidth: 135,
                  width: 540,
                  allowBlank: true,
                  defaultOrgBoss: true
                }),
                HR.controlService.getRespEmpCombo({
                  name: 'accID',
                  fieldLabel: UB.i18n('Головний бухгалтер'),
                  labelWidth: 135,
                  width: 543,
                  allowBlank: true
                })
              ]
            }
          ]
        },
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          dockedItems: [{
            xtype: 'toolbar',
            dock: 'right',
            items: [{
              text: UB.i18n('Сформувати XML'),
              name: 'makeXML',
              iconCls: 'fas fa-file-code',
              cls: 'fill-action',
              dock: 'right',
              disabled: true,
              handler: function (btn) {
                let type = this.up('form').down('[name=type]').getValue()
                let dateTo = this.up('form').down('[name=dateTo]').getValue()
                let bossID = this.up('form').down('[name=bossID]').getValue()
                let accID = this.up('form').down('[name=accID]').getValue()
                let numReport = this.up('form').down('[name=numberReport]').getValue()
                let grid = this.up('form').down('[name=grid]')
                let gridItems = grid.getSelectionModel().selected.items
                gridItems = gridItems ? gridItems.map(item => item.data) : []
                exportToXML(type, dateTo, bossID, accID, numReport, gridItems)
              }
            }]
          }],
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'numberfield',
                  name: 'numberReport',
                  labelWidth: 135,
                  width: 250,
                  fieldLabel: UB.i18n('Номер за день'),
                  allowBlank: false,
                  maxValue: 9999,
                  minValue: 1,
                  value: 1
                }
              ]
            }
          ]
        },
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              layout: 'fit',
              items: [
                {
                  xtype: 'acGrid',
                  name: 'grid',
                  stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_reportAppoint_grid'),
                  flex: 1,
                  height: 280,
                  region: 'center',
                  autoScroll: true,
                  storeType: 'local',
                  disablePaging: true,
                  showToolBar: true,
                  cellEditing: true,
                  notWriteChanges: true,
                  useCheckBoxColumn: true,
                  pagerConfig: { pageSize: 1000 },
                  customToolBarActions: [
                    {
                      tooltip: UB.i18n('Додати списком'),
                      iconCls: 'fas fa-angle-double-down',
                      cls: 'add-list-action',
                      name: 'addBtn',
                      handler: function (btn) {
                        let grid = this.up('form').down('[name=grid]')
                        let f = this.up('form').down('[name=dateFrom]').getValue()
                        let t = this.up('form').down('[name=dateTo]').getValue()
                        if (f) {
                          f = Ext.Date.clearTime(f)
                          f.setHours(0, 0, 0)
                        }
                        if (t) {
                          t = Ext.Date.clearTime(t)
                          t.setHours(23, 59, 59)
                        }
                        let appoints = []
                        let btnXML = paramForm.down('[name=makeXML]')
                        if (btnXML) btnXML.setDisabled(true)
                        grid.getStore().removeAll()
                        UB.Repository('hr_employeePositionS')
                          .attrs(['ID', 'description', 'dateFrom', 'tabNum', 'orderID.orderNumber', 'orderID.orderDate',
                            'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.taxCode'])
                          .whereIf(f, 'orderID.orderDate', '>=', f)
                          .whereIf(t, 'orderID.orderDate', '<=', t)
                          .where('orderID.orderState', '=', 'POSTED')
                          .where('orderID.empOrderType', '=', 'APPOINT')
                          .where('contractType', '=', '1')
                          .where('workPlace', '!=', '2')
                          .where('organizationID', '=', appAC.globalOrganization())
                          .selectAsObject().then((result) => {
                            if (result.length) {
                              appoints = result.map((item) => {
                                return {
                                  ID: item['ID'],
                                  taxCode: item['employeeID.taxCode'] || '',
                                  lastName: item['employeeID.lastName'] || '',
                                  middleName: item['employeeID.middleName'] || '',
                                  firstName: item['employeeID.firstName'] || '',
                                  description: item['description'] || '',
                                  orderNumber: item['orderID.orderNumber'] || '',
                                  orderDate: item['orderID.orderDate'] ? AC.dateService.formatDate(item['orderID.orderDate'], 'dd.mm.yyyy') : '',
                                  dateFrom: item['dateFrom'] ? AC.dateService.formatDate(item['dateFrom'], 'dd.mm.yyyy') : ''
                                }
                              })
                              grid.setLocalStoreData(appoints)
                              const sm = grid.getSelectionModel()
                              sm.selectAll(true)

                              if (btnXML) btnXML.setDisabled(false)
                            }
                          })

                        grid.getStore().on('remove', (grid) => {
                          let c = grid.data.items.length
                          let btnXML = paramForm.down('[name=makeXML]')
                          if (btnXML) btnXML.setDisabled(c === 0)
                        })
                      }
                    }
                  ],
                  onRowChecked: function (grid) {
                    let me = this
                    const form = me.up('form')
                    if (form) {
                      let btnXML = form.down('[name=makeXML]')
                      if (btnXML) btnXML.setDisabled(grid.selected.length === 0)
                    }
                  },
                  onRowUnchecked: function (grid) {
                    let me = this
                    const form = me.up('form')
                    if (form) {
                      let btnXML = form.down('[name=makeXML]')
                      if (btnXML) btnXML.setDisabled(grid.selected.length === 0)
                    }
                  },
                  edit: function (control, context) {
                    if (context.record.phantom && context.record.dirtySave !== null) {
                      context.record.dirtySave = null
                    }
                    return true
                  },
                  onBeforeEdit: function (editor, context) {
                    let me = paramForm.getForm()
                    let f = me.findField('dateFrom').getValue()
                    let t = me.findField('dateTo').getValue()
                    let grid = paramForm.down('[name=grid]')
                    const colEmployee = AC.gridUtils.getColumnByIndex(context.grid, 'description')

                    grid.getStore().on('remove', (grid) => {
                      let c = grid.data.items.length
                      let btnXML = paramForm.down('[name=makeXML]')
                      if (btnXML) btnXML.setDisabled(c === 0)
                    })

                    colEmployee.field.on('change', (ctrl, value, oldValue) => {
                      if (oldValue === undefined || value === oldValue || oldValue === null) {
                        return
                      }
                      const data = ctrl.valueModels && ctrl.valueModels[0] && ctrl.valueModels[0].data
                      if (data && data.ID) {
                        let btnXML = paramForm.down('[name=makeXML]')
                        if (btnXML) btnXML.setDisabled(false)
                        context.record.set('taxCode', data['employeeID.taxCode'] || '')
                        context.record.set('lastName', data['employeeID.lastName'] || '')
                        context.record.set('middleName', data['employeeID.middleName'] || '')
                        context.record.set('firstName', data['employeeID.firstName'] || '')
                        context.record.set('orderNumber', data['orderID.orderNumber'] || '')
                        context.record.set('orderDate', data['orderID.orderDate'] ? AC.dateService.formatDate(data['orderID.orderDate'], 'dd.mm.yyyy') : '')
                        context.record.set('dateFrom', data['dateFrom'] ? AC.dateService.formatDate(data['dateFrom'], 'dd.mm.yyyy') : '')
                      }
                    })

                    let whereListParams = [
                      ['organizationID', 'organizationID', '=', appAC.globalOrganization()],
                      ['contractType', 'contractType', '=', '1'],
                      ['workPlace', 'workPlace', '!=', '2'],
                      ['orderState', 'orderID.orderState', '=', 'POSTED'],
                      ['empOrderType', 'orderID.empOrderType', '=', 'APPOINT']
                    ]
                    if (f) {
                      f = Ext.Date.clearTime(f)
                      f.setHours(0, 0, 0)
                      whereListParams.push(['fromDate', 'orderID.orderDate', '>=', f])
                    }
                    if (t) {
                      t = Ext.Date.clearTime(t)
                      t.setHours(23, 59, 59)
                      whereListParams.push(['toDate', 'orderID.orderDate', '<=', t])
                    }

                    if (colEmployee.field) {
                      let store = colEmployee.field.getStore ? colEmployee.field.getStore() : colEmployee.field.store
                      let ubRequest = store.ubRequest
                      ubRequest.whereList = {}
                      let whereList = ubRequest.whereList
                      whereListParams.forEach(item => {
                        whereList[item[0]] = {
                          condition: item[2],
                          expression: '[' + item[1] + ']',
                          values: { [item[0]]: item[3] }
                        }
                      })
                      colEmployee.field.getStore().load()
                    }
                  },
                  fields: [
                    {
                      name: 'ID'
                    },
                    {
                      name: 'taxCode'
                    },
                    {
                      name: 'lastName'
                    },
                    {
                      name: 'middleName'
                    },
                    {
                      name: 'firstName'
                    },
                    {
                      name: 'description',
                      columnConfig: {
                        text: UB.i18n('Призначення'),
                        flex: 1,
                        editor: {
                          xtype: 'accombobox',
                          hideEntityItemInContext: true,
                          dataType: 'Entity',
                          fieldList: ['ID', 'description', 'organizationID', 'orderID.orderState', 'orderID.empOrderType',
                            'dateFrom', 'tabNum', 'orderID.orderNumber', 'orderID.orderDate',
                            'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.taxCode'],
                          whereList: {
                            organization: {
                              expression: '[organizationID]',
                              condition: '=',
                              value: appAC.globalOrganization()
                            },
                            contractType: {
                              expression: '[contractType]',
                              condition: '=',
                              value: '1'
                            },
                            workPlace: {
                              expression: '[workPlace]',
                              condition: '!=',
                              value: '2'
                            },
                            orderState: {
                              expression: '[orderID.orderState]',
                              condition: '=',
                              value: 'POSTED'
                            },
                            empOrderType: {
                              expression: '[orderID.empOrderType]',
                              condition: '=',
                              value: 'APPOINT'
                            },
                            fromDate: {
                              expression: '[orderID.orderDate]',
                              condition: '>=',
                              value: AC.dateService.todayDate()
                            },
                            toDate: {
                              expression: '[orderID.orderDate]',
                              condition: '<=',
                              value: AC.dateService.todayDate()
                            }
                          },
                          associatedEntity: 'hr_employeePositionSR',
                          displayField: 'description',
                          valueField: 'description',
                          storeAttributeValueField: 'ID',
                          allowBlank: false
                        }
                      }
                    },
                    {
                      name: 'orderNumber',
                      columnConfig: {
                        text: UB.i18n('№ наказу'),
                        width: 150,
                        editor: {
                          readOnly: true
                        }
                      }
                    },
                    {
                      name: 'orderDate',
                      columnConfig: {
                        text: UB.i18n('Дата наказу'),
                        width: 150,
                        editor: {
                          readOnly: true
                        }
                      }
                    },
                    {
                      name: 'dateFrom',
                      columnConfig: {
                        text: UB.i18n('Дата початку роботи'),
                        width: 160,
                        editor: {
                          readOnly: true
                        }
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        let grid = owner.down('[name=grid]')
        let gridItems = grid.getSelectionModel().selected.items
        gridItems = gridItems ? gridItems.map(item => item.data) : []
        return {
          type: frm.findField('type').getValue(),
          bossID: frm.findField('bossID').getValue() || 0,
          accID: frm.findField('accID').getValue() || 0,
          appoints: JSON.stringify(gridItems)
        }
      }
    })
    return paramForm
  }
}

async function exportToXML (type, dateTo, bossID, accID, numReport, appointData) {
  let allBodyAttrNames1 = [
    'HPAGES', 'HTIN', 'HNAME', 'HFILL', 'R011G1', 'HKBOS', 'HBOS', 'HKBUH', 'HBUH']
  let allBodyAttrNames2 = ['T1RXXXXG4', 'T1RXXXXG5S', 'T1RXXXXG61S', 'T1RXXXXG62S', 'T1RXXXXG63S', 'T1RXXXXG7S', 'T1RXXXXG8D', 'T1RXXXXG9D']

  if (type.type === '1') allBodyAttrNames1.push('H01')
  if (type.type === '2') allBodyAttrNames1.push('H02')

  let organizationID = appAC.globalOrganization()
  let onDate = AC.dateService.todayDate()
  const org = await UB.Repository('hr_organization')
    .attrs(['EDRPOUCode', 'name', 'dictSprStiID'])
    .where('mi_data_id', '=', organizationID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: onDate })
    .selectSingle()

  let respPosInfo = await UB.Repository('hr_employeePositionS')
    .attrs('ID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.taxCode')
    .where('ID', 'in', [bossID || 0, accID || 0])
    .where('employeeID.mi_deleteDate', '>=', '#maxdate')
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.mi_dateFrom', '<=', onDate)
    .where('positionID.mi_dateTo', '>=', onDate)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  respPosInfo = respPosInfo ? _.groupBy(respPosInfo, 'ID') : []
  let bossName = ''
  let bossTax = ''
  let accName = ''
  let accTax = ''
  if (bossID && respPosInfo[bossID]) {
    bossName = respPosInfo[bossID][0]['employeeID.firstName'] ? respPosInfo[bossID][0]['employeeID.firstName'].substr(0, 1) + ' . ' : ''
    bossName += respPosInfo[bossID][0]['employeeID.middleName'] ? respPosInfo[bossID][0]['employeeID.middleName'].substr(0, 1) + ' . ' : ''
    bossName += respPosInfo[bossID][0]['employeeID.lastName']
    bossTax = respPosInfo[bossID][0]['employeeID.taxCode'] || ''
  }
  if (accID && respPosInfo[accID]) {
    accName = respPosInfo[accID][0]['employeeID.firstName'] ? respPosInfo[accID][0]['employeeID.firstName'].substr(0, 1) + ' . ' : ''
    accName += respPosInfo[accID][0]['employeeID.middleName'] ? respPosInfo[accID][0]['employeeID.middleName'].substr(0, 1) + ' . ' : ''
    accName += respPosInfo[accID][0]['employeeID.lastName']
    accTax = respPosInfo[accID][0]['employeeID.taxCode'] || ''
  }

  let hkstiOrig = org.dictSprStiID
  const dictSprStiOrig = hkstiOrig ? await UB.Repository('ac_dictSprSti').attrs(['cReg', 'cRaj', 'hksti']).selectById(hkstiOrig) || {} : {}

  let data = {
    DECLAR: {
      DECLARHEAD: {
        TIN: org.EDRPOUCode || '',
        C_DOC: 'J30',
        C_DOC_SUB: '010',
        C_DOC_VER: '1',
        C_DOC_TYPE: '0',
        C_DOC_CNT: numReport || '1',
        C_REG: dictSprStiOrig.cReg || '',
        C_RAJ: dictSprStiOrig.cRaj || '',
        PERIOD_MONTH: dateTo ? AC.dateService.formatDate(dateTo, 'mm') : '',
        PERIOD_TYPE: '1',
        PERIOD_YEAR: dateTo ? AC.dateService.formatDate(dateTo, 'yyyy') : '',
        C_DOC_STAN: '1',
        C_STI_ORIG: dictSprStiOrig.hksti || '',
        LINKED_DOCS: {
          $: {
            'xsi:nil': 'true'
          }
        },
        D_FILL: AC.dateService.formatDate(onDate, 'ddmmyyyy'),
        SOFTWARE: 'A5'
      },
      DECLARBODY: {
      },
      PARAMS: {
        REPORTNAME: null
      }
    }
  }
  data.DECLAR['$'] = {
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:noNamespaceSchemaLocation': 'J3001001.xsd'
  }
  allBodyAttrNames1.forEach(attr => {
    data.DECLAR.DECLARBODY[attr] = null
  })
  allBodyAttrNames2.forEach(attr => {
    data.DECLAR.DECLARBODY[attr] = []
  })

  data.DECLAR.DECLARBODY.HPAGES = '1'
  data.DECLAR.DECLARBODY.HTIN = org.EDRPOUCode || ''
  data.DECLAR.DECLARBODY.HNAME = org.name || ''
  if (type.type === '1') data.DECLAR.DECLARBODY.H01 = '1'
  if (type.type === '2') data.DECLAR.DECLARBODY.H02 = '1'

  let rownum = 1
  appointData.forEach(item => {
    data.DECLAR.DECLARBODY['T1RXXXXG4'].push({ $: { ROWNUM: rownum }, _: '1' })
    data.DECLAR.DECLARBODY['T1RXXXXG5S'].push({ $: { ROWNUM: rownum }, _: item['taxCode'] || '' })
    data.DECLAR.DECLARBODY['T1RXXXXG61S'].push({ $: { ROWNUM: rownum }, _: item['lastName'] || '' })
    data.DECLAR.DECLARBODY['T1RXXXXG62S'].push({ $: { ROWNUM: rownum }, _: item['firstName'] || '' })
    data.DECLAR.DECLARBODY['T1RXXXXG63S'].push({ $: { ROWNUM: rownum }, _: item['middleName'] || '' })
    data.DECLAR.DECLARBODY['T1RXXXXG7S'].push({ $: { ROWNUM: rownum }, _: item['orderNumber'] || '' })
    data.DECLAR.DECLARBODY['T1RXXXXG8D'].push({ $: { ROWNUM: rownum }, _: item['orderDate'] ? item['orderDate'].replace(/\./g, '') : '' })
    data.DECLAR.DECLARBODY['T1RXXXXG9D'].push({ $: { ROWNUM: rownum }, _: item['dateFrom'] ? item['dateFrom'].replace(/\./g, '') : '' })
    rownum++
  })

  data.DECLAR.DECLARBODY.HFILL = AC.dateService.formatDate(onDate, 'ddmmyyyy')
  data.DECLAR.DECLARBODY.R011G1 = rownum - 1
  data.DECLAR.DECLARBODY.HKBOS = bossTax
  data.DECLAR.DECLARBODY.HBOS = bossName
  data.DECLAR.DECLARBODY.HKBUH = accTax
  data.DECLAR.DECLARBODY.HBUH = accName

  const attrListHead = ['TIN', 'C_DOC', 'C_DOC_SUB', 'C_DOC_VER', 'C_DOC_TYPE', 'C_DOC_CNT', 'C_REG', 'C_RAJ', 'PERIOD_MONTH', 'PERIOD_TYPE', 'PERIOD_YEAR', 'C_STI_ORIG', 'C_DOC_STAN', 'LINKED_DOCS', 'D_FILL', 'SOFTWARE']
  allBodyAttrNames1.push(...allBodyAttrNames2)
  const attrList = allBodyAttrNames1.filter(aName => aName !== 'HZB' && aName !== 'HZS' && aName !== 'HZD')
  const xmlData = {
    DECLAR: {
      $: JSON.parse(JSON.stringify(data.DECLAR.$)),
      DECLARHEAD: createDeclarAt({ declar: data.DECLAR.DECLARHEAD, attrList: attrListHead }),
      DECLARBODY: createDeclarAt({ declar: data.DECLAR.DECLARBODY, attrList })
    }
  }

  $App.connection.run({
    entity: 'hr_exportToXML',
    method: 'export',
    params: {
      data: JSON.stringify(xmlData)
    }
  }).then((result) => {
    if (result.result) {
      let resultData = JSON.parse(result.result)
      AC.filesService.saveAsByBase64Buffer(resultData.dataXML, resultData.xmlFileName, { type: 'text/xml' })
    }
  })
}

function createDeclarAt ({ declar, attrList, dec = 0 }) {
  const result = { }
  if (!declar) {
    return result
  }

  const emptyValue = { $: { 'xsi:nil': 'true' } }

  Object.keys(declar)
    .forEach(attr => {
      if (attrList.includes(attr)) {
        result[attr] = declar[attr]
      }

      if (!(/^R\d*X*G\d*/.test(attr) || /^T\d+RX+G\d+S/.test(attr) || /^T\d+RX+G\d+/.test(attr) || /^T\d+RX+G\d+D/.test(attr))) {
        return
      }

      if (declar[attr] instanceof Array && declar[attr].some(item => !item._)) {
        result[attr] = declar[attr].map(item => {
          if (!item._) {
            item['$'] = !item['$'] ? emptyValue : Object.assign({}, item['$'], emptyValue['$'])
          }

          return item
        })

        return
      }

      if (!declar[attr] || declar[attr] === 0) {
        result[attr] = emptyValue
        return
      }
      if (isNaN(declar[attr])) {
        result[attr] = declar[attr]
        return
      }
      result[attr] = parseFloat(declar[attr]).toFixed(dec)
    })
  return result
}
