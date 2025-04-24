/* global UB, HR, AC, Ext, appAC */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const dateFrom = AC.dateService.shiftDate(reportParams.dateFrom)
    const dateTo = AC.dateService.shiftDate(reportParams.dateTo)
    const onDate = AC.dateService.todayDate()
    const result = {
      rows: [],
      dateFrom: AC.dateService.formatDate(dateFrom),
      dateTo: AC.dateService.formatDate(dateTo)
    }

    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, reportParams.organizationID)
    const depData = await UB.Repository('hr_department')
      .attrs(['name', 'nameDat'])
      .where('mi_data_id', '=', reportParams.departmentID)
      .where('orgID', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.departmentName = depData ? depData.nameDat || depData.name : ''

    const paramsQuery = {
      organizationID: reportParams.organizationID,
      includeChildOrgs: false,
      departmentID: reportParams.departmentID,
      includeChildDepts: reportParams.type.type === '1',
      dateFrom: dateFrom,
      dateTo: dateTo,
      onDate: onDate
    }

    const rowsQuery1 = Object.assign({
      entity: 'hr_empListAppointed',
      method: 'search2'
    }, paramsQuery)

    const rowsQuery2 = Object.assign({
      entity: 'hr_empListMoved',
      method: 'search2'
    }, paramsQuery)

    const rowsQuery3 = Object.assign({
      entity: 'hr_empListDism',
      method: 'search2'
    }, paramsQuery)

    let [
      { resultData: pos1 },
      { resultData: pos2 },
      { resultData: pos3 }
    ] = await UB.connection.runTransAsObject([rowsQuery1, rowsQuery2, rowsQuery3])

    if (pos1 && pos1.length > 0) {
      pos1 = pos1.sort(me.sortRule)
      result.rows.push({
        name: UB.i18n('Прийнято: ') + pos1.length,
        items: pos1.map(item => {
          return {
            posName: item.posName,
            tabNum: item.tabNum,
            fullFIO: item.fullFIO,
            depTree: item.depTree,
            orderInfo: `${item.orderNumber ? '№' + item.orderNumber : ''} ${item.orderDate ? ' від ' + AC.dateService.formatDate(item.orderDate) : ''}`,
            comment: item.comment || ''
          }
        })
      })
    }

    if (pos3 && pos3.length > 0) {
      pos3 = pos3.sort(me.sortRule)
      result.rows.push({
        name: UB.i18n('Звільнено: ') + pos3.length,
        items: pos3.map(item => {
          return {
            posName: item.posName,
            tabNum: item.tabNum,
            fullFIO: item.fullFIO,
            depTree: item.depTree,
            orderInfo: `${item.orderNumber ? '№' + item.orderNumber : ''} ${item.orderDate ? ' від ' + AC.dateService.formatDate(item.orderDate) : ''}`,
            comment: item.comment || ''
          }
        })
      })
    }

    if (pos2 && pos2.length > 0) {
      pos2 = pos2.sort(me.sortRule)
      result.rows.push({
        name: UB.i18n('Переведено: ') + pos2.length,
        items: pos2.map(item => {
          return {
            posName: item.posName,
            tabNum: item.tabNum,
            fullFIO: item.fullFIO,
            depTree: item.depTree,
            orderInfo: `${item.orderNumber ? '№' + item.orderNumber : ''} ${item.orderDate ? ' від ' + AC.dateService.formatDate(item.orderDate) : ''}`,
            comment: item.comment || ''
          }
        })
      })
    }

    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 145,
              readOnly: true,
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
                  },
                  path: {
                    expression: '[mi_treePath]',
                    condition: 'like',
                    values: {
                      state: `/${appAC.globalOrganization()}/`
                    }
                  }
                },
                orderList: { orderBy: { expression: 'description' } },
                __mip_ondate: appAC.globalApplicationDate()
              },
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const departmentID = form.down('[name=departmentID]')
                  const orgID = ctrl.getValue()
                  const whereList = [
                    ['orgID', '=', orgID || 0],
                    ['state', '=', 'ACTIVE']
                  ]
                  AC.viewUtils.setWhereListProperty(departmentID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                  departmentID.setDisabled(!orgID)
                }
              }
            }),
            HR.controlService.getDepCombo({
              allowBlank: false,
              displayField: 'description',
              labelWidth: 145
            }),
            {
              xtype: 'radiogroup',
              fieldLabel: UB.i18n('З підпорядкованими підрозділами'),
              height: 50,
              labelWidth: 145,
              width: 540,
              name: 'type',
              columns: 2,
              items: [{
                name: 'type',
                boxLabel: UB.i18n('Так'),
                inputValue: '1',
                checked: true
              }, {
                name: 'type',
                boxLabel: UB.i18n('Ні'),
                inputValue: '2'
              }]
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
                  fieldLabel: UB.i18n('Період з'),
                  allowBlank: false,
                  value: new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0),
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t)
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
                  value: new Date(),
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t)
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          type: frm.findField('type').getValue(),
          dateFrom: frm.findField('dateFrom').getValue(),
          dateTo: frm.findField('dateTo').getValue()
        }
      }
    })
    return paramForm
  },
  sortRule: function (s1, s2) {
    let i = (s1.posIndex || 0) === (s2.posIndex || 0) ? 0 : ((s1.posIndex || 0) > (s2.posIndex || 0) ? 1 : -1)
    if (i === 0) {
      i = HR.reportUtils.CompareStringUa((s1.fullFIO || ''), (s2.fullFIO || ''))
    }
    return i
  }
}
