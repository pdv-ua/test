/* global UB AC */

module.exports = [{
  title: UB.i18n('Параметри'),
  xtype: 'panel',
  layout: 'fit',
  align: 'stretch',
  border: 2,
  layoutConfig: {
    collapsible: true,
    collapsed: true
  },
  flex: 1,
  items: [
    {
      xtype: 'panel',
      hidden: true,
      collapsed: false
    },
    {
      xtype: 'panel',
      collapsed: false,
      layout: { type: 'vbox', align: 'stretch' },
      items: [ ]
    }
  ]
},
{
  title: UB.i18n('Налаштування показників'),
  xtype: 'panel',
  layout: 'fit',
  align: 'stretch',
  border: 2,
  layoutConfig: {
    collapsible: true,
    collapsed: true
  },
  flex: 1,
  items: [
    {
      xtype: 'panel',
      hidden: true,
      collapsed: false
    },
    {
      xtype: 'reportparamcontrol',
      collapsed: false,
      reportCode: 'H0110001'
    }
  ]
},
{
  title: UB.i18n('Норматив робочих місць для інвалідів'),
  xtype: 'panel',
  layout: 'fit',
  align: 'stretch',
  border: 2,
  layoutConfig: {
    collapsible: true,
    collapsed: true
  },
  flex: 1,
  items: [
    {
      xtype: 'panel',
      hidden: true,
      collapsed: false
    },
    {
      xtype: 'panel',
      collapsed: false,
      items: [
        {
          xtype: 'entitygridpanel',
          itemId: 'salaryScaleGrid',
          flex: 1,
          rowEditing: true,
          cmdType: 'showList',
          entityConfig: {
            entity: 'hr_valuesParam',
            method: 'select',
            fieldList: [
              {
                name: 'orderN',
                description: '№',
                editor: {
                  width: 30,
                  maxWidth: 30,
                  enableKeyEvents: true,
                  disableContextMenu: true
                },
                config: {
                  width: 30,
                  maxWidth: 30,
                  resizable: false
                },
                sortable: true,
                filterable: false
              },
              {
                name: 'valuesFloat',
                description: UB.i18n('Чисельність від'),
                editor: {
                  width: 200,
                  maxWidth: 200,
                  enableKeyEvents: true,
                  disableContextMenu: true,
                  allowBlank: false
                },
                config: {
                  width: 200,
                  maxWidth: 200,
                  resizable: false
                },
                sortable: true,
                filterable: false
              },
              {
                name: 'valuesFloat1',
                description: UB.i18n('Кількість інвалідів'),
                editor: {
                  width: 200,
                  maxWidth: 200,
                  enableKeyEvents: true,
                  disableContextMenu: true,
                  allowBlank: false
                },
                config: {
                  width: 200,
                  maxWidth: 200,
                  resizable: false
                },
                sortable: true,
                filterable: false
              },
              {
                name: 'valuesFloat2',
                description: UB.i18n('Відсоток інвалідів'),
                editor: {
                  width: 200,
                  maxWidth: 200,
                  enableKeyEvents: true,
                  disableContextMenu: true,
                  allowBlank: false
                },
                config: {
                  width: 200,
                  maxWidth: 200,
                  resizable: false
                },
                sortable: true,
                filterable: false
              },
              {
                name: 'valuesFloat3',
                description: UB.i18n('Коеф.санкцій'),
                editor: {
                  width: 200,
                  maxWidth: 200,
                  enableKeyEvents: true,
                  disableContextMenu: true,
                  allowBlank: false
                },
                config: {
                  width: 200,
                  maxWidth: 200,
                  resizable: false
                },
                sortable: true,
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
          detailFields: ['listParamID', 'orgID'], // we need this for parentContext to work
          onBeforeEdit: (editor, context) => {
            const orderNEdit = context.grid.columns.find((item) => item.dataIndex === 'orderN').field
            orderNEdit.setDisabled(true)
            orderNEdit.setAllowBlank(true)
            const valuesFloatEdit = context.grid.columns.filter((item) => item.dataIndex.includes('valuesFloat'))
            valuesFloatEdit.forEach(elem => elem.field.setValue()) // we need this for correct enabling of save button (for some reason form is considered initially valid on second row insert but save button is initially disabled)
            let ClickvaluesFloat1 = false
            let ClickvaluesFloat2 = false

            context.grid.columns.find((item) => item.dataIndex === 'valuesFloat1').field.on('change', (ctrl, value) => {
              if (!ClickvaluesFloat2) {
                ClickvaluesFloat1 = true
                ctrl.up('grid').columns.find((item) => item.dataIndex === 'valuesFloat2').field.setValue(0)
                ClickvaluesFloat1 = false
                ClickvaluesFloat2 = false
              }
            })
            context.grid.columns.find((item) => item.dataIndex === 'valuesFloat2').field.on('change', (ctrl, value) => {
              if (!ClickvaluesFloat1) {
                ClickvaluesFloat2 = true
                ctrl.up('grid').columns.find((item) => item.dataIndex === 'valuesFloat1').field.setValue(0)
                ClickvaluesFloat1 = false
                ClickvaluesFloat2 = false
              }
            })
          },
          afterInit: function () {
            const grid = this
            grid.plugins.filter(p => p.alias.indexOf('plugin.rowediting') >= 0).forEach(p => { p.clicksToEdit = 2 })
            grid.on('changeData', (me, changeType) => {
              if (['insert', 'update', 'delete'].indexOf(changeType) >= 0) {
                grid.onRefresh()
              }
            })
            UB.Repository('hr_reportParam')
              .where('[listParamID.code]', '=', '<Б>')
              .where('[listParamID.mi_deleteUser]', 'isNull')
              .where('[reportCode]', '=', 'H0110001')
              .attrs(['listParamID'])
              .selectScalar()
              .then(listParamID => {
                let parentOrdID = AC.settings.get('hrUseReportSettingsParentOrg', grid.up('form').record.get('organizationID'))
                if (parentOrdID) {
                  parentOrdID = Number(parentOrdID)
                }
                grid.parentContext = {
                  listParamID: listParamID,
                  orgID: parentOrdID || grid.up('form').record.get('organizationID')
                }
                grid.store.ubRequest.whereList.byParam = {
                  expression: '[listParamID]',
                  condition: 'equal',
                  values: { paramID: listParamID }
                }
                grid.store.ubRequest.whereList.byOrg = {
                  expression: '[orgID]',
                  condition: 'equal',
                  values: { orgID: this.parentContext.orgID }
                }
              })
          },
          onItemContextMenu: function () {}
        }
      ]
    }
  ]
}
]
