/* global Ext UB $App AC */
Ext.define('HR.controls.reportParamControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.reportparamcontrol',

  layout: 'fit',

  initComponent: function () {
    const me = this

    const hasListParamAccess = true// $App.connection.userData().roles.split(',').indexOf('Admin') >= 0
    const supportedLists = ['hr_payEl', 'hr_position', 'hr_employeeNumber', 'hr_dictTimeCost', 'hr_dictPosition']
    const filterByOrgLists = ['hr_position', 'hr_employeeNumber']

    me.items = [
      {
        xtype: 'panel',
        layout: { type: 'hbox', align: 'stretch' },
        items: [
          {
            xtype: 'panel',
            layout: 'fit',
            width: 300,
            items: [
              {
                xtype: 'entitygridpanel',
                itemId: 'reportParamGrid',
                cmdType: 'showList',
                entityConfig: {
                  entity: 'hr_reportParam',
                  method: 'select',
                  fieldList: [
                    {
                      name: 'listParamID',
                      visibility: false
                    },
                    {
                      name: 'listParamID.shortName',
                      description: UB.i18n('Назва показника'),
                      editor: {
                        maxWidth: 300,
                        width: 300,
                        whereList: {
                          byTable: {
                            expression: '[tableName]',
                            condition: 'isNotNull'
                          }
                        }
                      },
                      config: {
                        width: 300,
                        maxWidth: 300,
                        resizable: false
                      }
                    },
                    {
                      name: 'listParamID.fullName',
                      visibility: false
                    },
                    {
                      name: 'listParamID.code',
                      visibility: false
                    },
                    {
                      name: 'listParamID.tableName',
                      visibility: false
                    }
                  ],
                  whereList: {
                    byTable: {
                      expression: '[listParamID.tableName]',
                      condition: 'isNotNull'
                    },
                    byActualParam: {
                      expression: '[listParamID.mi_deleteUser]',
                      condition: 'isNull'
                    },
                    byReport: {
                      expression: '[reportCode]',
                      condition: 'equal',
                      value: me.reportCode
                    }
                  }
                },
                parentContext: {
                  reportCode: me.reportCode
                },
                detailFields: ['reportCode'],
                disableSearchBar: true,
                hideMenuAllActions: true,
                menuAllActionsActionList: [],
                toolbarActionList: ['addNew', 'del'],
                customActions: (hasListParamAccess) ? [
                  {
                    itemId: 'createParam',
                    iconCls: 'fas fa-folder',
                    text: UB.i18n('Створити налаштування'),
                    handler: function (btn) {
                      $App.doCommand({
                        cmdType: 'showForm',
                        entity: 'hr_listParam',
                        sender: me.attr.reportParamGrid,
                        cmpInitConfig: {
                          bindToReport: me.reportCode
                        }
                      })
                    }
                  }
                ] : [],
                afterInit: function () {
                  this.plugins.filter(p => p.alias.indexOf('plugin.rowediting') >= 0).forEach(p => { p.clicksToEdit = 2 })
                },
                onItemContextMenu: function () {}
              }
            ]
          },
          {
            xtype: 'panel',
            layout: 'fit',
            flex: 1,
            items: [
              {
                xtype: 'panel',
                hidden: true,
                itemId: 'reportValuesPanel',
                layout: 'border',
                bodyStyle: { backgroundColor: 'white' },
                items: [
                  {
                    xtype: 'textfield',
                    itemId: 'currentParamFld',
                    disabled: true,
                    region: 'north'
                  },
                  {
                    xtype: 'panel',
                    layout: 'fit',
                    padding: '0 15 0 15',
                    region: 'center',
                    items: [
                      {
                        xtype: 'entitygridpanel',
                        itemId: 'reportValuesGrid',
                        flex: 1,
                        rowEditing: true,
                        cmdType: 'showList',
                        entityConfig: {
                          entity: 'hr_idParam',
                          method: 'select',
                          fieldList: [
                            {
                              name: 'descriptionID',
                              visibility: false
                            },
                            {
                              name: 'descriptionID.description',
                              description: UB.i18n('Вибрані значення'),
                              editor: {
                                width: 800,
                                maxWidth: 800,
                                allowBlank: false,
                                enableKeyEvents: true,
                                disableContextMenu: true,
                                fieldList: ['ID', 'description']
                              },
                              config: {
                                width: 800,
                                maxWidth: 800,
                                resizable: false
                              },
                              sortable: false,
                              filterable: false
                            }
                          ],
                          whereList: {
                            byParam: {
                              expression: '[listParamID]',
                              condition: 'isNull'
                            },
                            byOrg: {
                              expression: '[orgID]',
                              condition: 'isNull'
                            }
                          },
                          orderList: {
                            byOrderN: { expression: '[orderN]' }
                          }
                        },
                        disableSearchBar: true,
                        hideMenuAllActions: true,
                        menuAllActionsActionList: [],
                        toolbarActionList: ['addNew', 'del'],
                        customActions: [{
                          itemId: 'valuesList',
                          text: UB.i18n('Додати списком'),
                          actionId: 'addByList',
                          iconCls: 'fas fa-edit',
                          scale: 'medium',
                          cls: 'fill-action',
                          handler: function (btn) {
                            if (supportedLists.indexOf(me.attr.reportValuesGrid.store.ubRequest.tableNameForMapping) < 0) {
                              return
                            }
                            let payElEntryType = ['PAYMENT']
                            if (me.attr.reportValuesGrid.parentContext.listParamCode.indexOf('_TaxPaid') > 0 || me.attr.reportValuesGrid.parentContext.listParamCode.indexOf('_PaySum') > 0) {
                              payElEntryType = ['PAYMENT', 'OFFTAKE', 'FORPAY']
                            }
                            UB.Repository('hr_idParam')
                              .where('[listParamID]', '=', me.attr.reportValuesGrid.parentContext.listParamID)
                              .where('[orgID]', '=', me.attr.reportValuesGrid.parentContext.orgID)
                              .attrs(['ID', 'valuesID'])
                              .selectAsObject()
                              .then(result => {
                                switch (me.attr.reportValuesGrid.store.ubRequest.tableNameForMapping) {
                                  case 'hr_payEl':
                                    $App.doCommand({
                                      cmdType: 'showForm',
                                      formCode: 'hr_payElSelect',
                                      cmpInitConfig: {
                                        withPeriod: true,
                                        payElEntryType: payElEntryType,
                                        selectData: result.map(o => o.valuesID),
                                        sourceData: result,
                                        sourceAttr: 'valuesID',
                                        listParamID: me.attr.reportValuesGrid.parentContext.listParamID,
                                        tabsCode: ['FOZP', 'FDZP', 'ZKV'].includes(me.attr.reportValuesGrid.parentContext.listParamCode) ? ['FOZP', 'FDZP', 'ZKV'] : null,
                                        orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                        onSelectData: (data) => {
                                          if (data.remove.length || data.add.length) {
                                            $App.connection.run({
                                              entity: 'hr_idParam',
                                              method: 'updateValuesIDs',
                                              listParamID: me.attr.reportValuesGrid.parentContext.listParamID,
                                              orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                              data: JSON.stringify(data)
                                            }).then(() => {
                                              me.attr.reportValuesGrid.getStore().load()
                                            })
                                          }
                                        }
                                      }
                                    })
                                    break
                                  case 'hr_position':
                                    $App.doCommand({
                                      cmdType: 'showForm',
                                      formCode: 'hr_positionSearch',
                                      isModal: true,
                                      cmpInitConfig: {
                                        orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                        readOnlyAttr: [],
                                        onSelect: (data) => {
                                          const existPositions = []
                                          data.forEach(row => {
                                            if (result.filter(o => o.valuesID === row.mi_data_id).length === 0) {
                                              $App.connection.insert({
                                                entity: 'hr_idParam',
                                                execParams: {
                                                  orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                                  listParamID: me.attr.reportValuesGrid.parentContext.listParamID,
                                                  valuesID: row.mi_data_id
                                                }
                                              })
                                            } else {
                                              existPositions.push(row['description'])
                                            }
                                          })
                                          if (existPositions.length) {
                                            $App.dialogInfo(UB.i18n(`Посади які вже були додані раніше </br> {0}`, existPositions.join('</br>')))
                                          }
                                          me.attr.reportValuesGrid.getStore().load()
                                        }
                                      }
                                    })
                                    break
                                  case 'hr_employeeNumber':
                                    $App.doCommand({
                                      cmdType: 'showForm',
                                      formCode: 'hr_employeeNumberSearch',
                                      isModal: true,
                                      cmpInitConfig: {
                                        orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                        readOnlyAttr: [],
                                        onSelect: (data) => {
                                          const existEmployeeNumbers = []

                                          data.forEach(row => {
                                            if (result.filter(o => o.valuesID === row.employeeNumberID).length === 0) {
                                              $App.connection.insert({
                                                entity: 'hr_idParam',
                                                execParams: {
                                                  orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                                  listParamID: me.attr.reportValuesGrid.parentContext.listParamID,
                                                  valuesID: row.employeeNumberID
                                                }
                                              })
                                            } else {
                                              existEmployeeNumbers.push(row['employeeNumberID.description'])
                                            }
                                          })
                                          if (existEmployeeNumbers.length) {
                                            $App.dialogInfo(UB.i18n(`Працівники які вже були додані раніше </br> {0}`, existEmployeeNumbers.join('</br>')))
                                          }
                                          me.attr.reportValuesGrid.getStore().load()
                                        }
                                      }
                                    })
                                    break
                                  case 'hr_dictTimeCost':
                                    const grid = me.attr.reportValuesGrid
                                    const sourceData = (grid.getStore().snapshot || grid.getStore().data).items.map(o => o.getData())
                                    const selectData = sourceData.map(o => o.descriptionID)
                                    $App.doCommand({
                                      cmdType: 'showForm',
                                      formCode: 'hr_timeCostSelect',
                                      entity: 'hr_dictTimeCost',
                                      store: grid.getStore(),
                                      cmpInitConfig: {
                                        selectData,
                                        sourceData,
                                        exclude: ['OTHER'],
                                        onSelectData: (data) => {
                                          if (data.remove.length || data.add.length) {
                                            $App.connection.run({
                                              entity: 'hr_idParam',
                                              method: 'updateValuesIDs',
                                              listParamID: me.attr.reportValuesGrid.parentContext.listParamID,
                                              orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                              data: JSON.stringify(data)
                                            }).then(() => {
                                              grid.getStore().load()
                                            })
                                          }
                                        }
                                      }
                                    })
                                    break
                                  case 'hr_dictPosition':
                                    UB.Repository('hr_dictPosition')
                                      .attrs(['ID', 'code', 'name', 'codeSort', 'description'])
                                      .orderBy('codeSort')
                                      .selectAsObject().then(sourceData => {
                                        const selectData = []
                                        result.forEach(o => selectData.push(Object.assign({ value: o.valuesID, ID: o.ID })))
                                        $App.doCommand({
                                          cmdType: 'showForm',
                                          formCode: 'hr_dictPositionSelect',
                                          cmpInitConfig: {
                                            selectData,
                                            sourceData,
                                            onSelectData: (data) => {
                                              if (data.remove.length || data.add.length) {
                                                $App.connection.run({
                                                  entity: 'hr_idParam',
                                                  method: 'updateValuesIDs',
                                                  listParamID: me.attr.reportValuesGrid.parentContext.listParamID,
                                                  orgID: me.attr.reportValuesGrid.parentContext.orgID,
                                                  data: JSON.stringify(data)
                                                }).then(() => {
                                                  me.attr.reportValuesGrid.getStore().load()
                                                })
                                              }
                                            }
                                          }
                                        })
                                      })
                                    break
                                }
                              })
                          }
                        }],
                        detailFields: ['listParamID', 'orgID'], // we need this for parentContext to work
                        onBeforeEdit: (editor, context) => {
                          const combo = context.grid.columns.find((item) => item.dataIndex === 'descriptionID.description').field
                          combo.store.ubRequest.entity = context.grid.store.ubRequest.tableNameForMapping
                          if (filterByOrgLists.indexOf(context.grid.store.ubRequest.tableNameForMapping) >= 0) {
                            if (!combo.store.ubRequest.whereList) {
                              combo.store.ubRequest.whereList = {}
                            }
                            combo.store.ubRequest.whereList.byOrg = {
                              expression: '[orgID]',
                              condition: 'equal',
                              values: { orgID: me.attr.reportValuesGrid.parentContext.orgID }
                            }
                          } else {
                            if (combo.store.ubRequest.whereList) {
                              delete combo.store.ubRequest.whereList.byOrg
                            }
                          }
                          UB.Repository('hr_idParam')
                            .where('[listParamID]', '=', me.attr.reportValuesGrid.parentContext.listParamID)
                            .where('[orgID]', '=', me.attr.reportValuesGrid.parentContext.orgID)
                            .attrs(['descriptionID', 'valuesID'])
                            .selectAsObject()
                            .then(result => {
                              const value = result
                                .filter(o => o.descriptionID !== context.record.data.descriptionID)
                                .map(o => o.valuesID)

                              if (value.length) {
                                if (!combo.store.ubRequest.whereList) {
                                  combo.store.ubRequest.whereList = {}
                                }
                                combo.store.ubRequest.whereList.ID = {
                                  expression: '[ID]',
                                  condition: 'notIn',
                                  value
                                }
                              }
                            })
                        },
                        afterInit: function () {
                          this.plugins.filter(p => p.alias.indexOf('plugin.rowediting') >= 0).forEach(p => { p.clicksToEdit = 2 })
                        },
                        onItemContextMenu: function () {}
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]

    me.callParent(arguments)

    me.attr = {
      reportParamGrid: me.queryById('reportParamGrid'),
      reportValuesPanel: me.queryById('reportValuesPanel'),
      reportValuesGrid: me.queryById('reportValuesGrid'),
      currentParamFld: me.queryById('currentParamFld'),
      valuesListBtn: me.queryById('valuesList')
    }

    if (!hasListParamAccess) {
      me.attr.reportParamGrid.setReadOnly(true)
      me.attr.reportValuesGrid.setReadOnly(true)
    }

    const actions = UB.view.EntityGridPanel.actionId
    const hotKeys = UB.view.EntityGridPanel.hotKeys
    me.attr.reportParamGrid.actions[actions.addNew].each(ctrl => ctrl.setTooltip(UB.i18n('Додати налаштування') + hotKeys[actions.addNew].text))
    me.attr.reportParamGrid.actions[actions.del].each(ctrl => ctrl.setTooltip(UB.i18n('Видалити налаштування') + hotKeys[actions.del].text))
    me.attr.reportValuesGrid.actions[actions.addNew].each(ctrl => ctrl.setTooltip(UB.i18n('Додати значення') + hotKeys[actions.addNew].text))
    me.attr.reportValuesGrid.actions[actions.del].each(ctrl => ctrl.setTooltip(UB.i18n('Видалити значення') + hotKeys[actions.del].text))

    function onParamSelect (selectedRow) {
      const store = me.attr.reportValuesGrid.getStore()
      let orgID = me.up('form').record.get ? me.up('form').record.get(me.orgAttrName || 'organizationID') : me.up('form').record[me.orgAttrName || 'organizationID']
      const parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', orgID)
      if (parentOrdID) {
        orgID = Number(parentOrdID)
      }
      if (!selectedRow || !selectedRow.get('ID')) {
        me.attr.currentParamFld.setValue('')
        me.attr.reportValuesGrid.parentContext = {
          listParamID: null,
          orgID: null
        }
        store.ubRequest.tableNameForMapping = null
        store.ubRequest.whereList.byParam = {
          expression: '[listParamID]',
          condition: 'isNull'
        }
        store.ubRequest.whereList.byOrg = {
          expression: '[orgID]',
          condition: 'isNull'
        }
        me.attr.reportValuesPanel.hide()
      } else {
        me.attr.currentParamFld.setValue(selectedRow.get('listParamID.fullName'))
        me.attr.reportValuesGrid.parentContext = {
          listParamID: selectedRow.get('listParamID'),
          listParamCode: selectedRow.get('listParamID.code'),
          orgID: orgID
        }
        store.ubRequest.tableNameForMapping = selectedRow.get('listParamID.tableName')
        store.ubRequest.whereList.byParam = {
          expression: '[listParamID]',
          condition: 'equal',
          values: { paramID: me.attr.reportValuesGrid.parentContext.listParamID }
        }
        store.ubRequest.whereList.byOrg = {
          expression: '[orgID]',
          condition: 'equal',
          values: { orgID: me.attr.reportValuesGrid.parentContext.orgID }
        }
        me.attr.valuesListBtn.setVisible(supportedLists.indexOf(store.ubRequest.tableNameForMapping) >= 0 && hasListParamAccess)
        if (me.attr.valuesListBtn.isVisible()) {
          me.attr.reportValuesGrid.actions.addNew.hide()
          me.attr.reportValuesGrid.actions.del.hide()
        } else {
          me.attr.reportValuesGrid.actions.addNew.show()
          me.attr.reportValuesGrid.actions.del.show()
        }
        me.attr.reportValuesPanel.show()
      }
      me.attr.reportValuesGrid.onRefresh()
    }

    me.attr.reportParamGrid.on('selectionchange', (selectionModel, selected) => {
      onParamSelect(selected && selected[0])
    })
    me.attr.reportParamGrid.store.on('load', () => {
      if (!me.attr.reportParamGrid.getSelectionModel().getSelection().length && me.attr.reportParamGrid.store.count()) {
        onParamSelect(me.attr.reportParamGrid.store.getAt(0))
      }
    })

    me.attr.reportParamGrid.on('changeData', () => {
      me.attr.reportParamGrid.store.reload()
    })

    me.setReportCode = (reportCode) => {
      if (reportCode) {
        me.reportCode = reportCode
        const store = me.attr.reportParamGrid.store
        store.ubRequest.whereList.byReport.value = reportCode
        me.attr.reportParamGrid.store.reload()
      }
    }
    me.on('afterrender', () => {
      const me = this
      if (me.readOnly) {
        me.attr.reportParamGrid.setReadOnly(true)
        me.down('[itemId=createParam]').hide()
        const tb = me.attr.reportParamGrid.down('toolbar')
        tb && tb.hide()
      }
      if (me.toolBarReadOnly) {
        me.attr.reportValuesGrid.down('toolbar').hide()
      }
    })
  }
})
