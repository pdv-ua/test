/* global Ext UB $App AC appAC */
Ext.define('HR.controls.positionSearchControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.positionsearchcontrol',

  layout: 'border',

  initComponent: function () {
    const me = this
    const divider = ','

    me.items = [
      {
        xtype: 'panel',
        name: 'searchParamsPanel',
        layout: 'accordion',
        layoutConfig: {
          collapsible: true,
          collapsed: false
        },
        region: 'north',
        items: [
          {
            xtype: 'panel',
            hidden: true,
            name: 'hiddenPanel',
            collapsed: true
          },
          {
            title: UB.i18n('Параметри відбору посад'),
            layout: { type: 'vbox', align: 'stretch' },
            name: 'searchParamsPanel',
            collapsed: false,
            items: [
              {
                layout: { type: 'hbox' },
                items: [
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Тип посади'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'posTypeSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: function () {
                              const sourceData = me.getEnumData('HR_POSITION_TYPE')
                              me.selectElements({
                                attrName: 'positionType',
                                attrTextName: 'positionTypeText',
                                sourceData,
                                selectedData: me.params.positionType
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'positionTypeText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Посада'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictPositionSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictPosition')
                                .attrs(['ID', 'description'])
                                .orderBy('description')
                                .selectAsObject()
                              me.selectElements({
                                attrName: 'dictPosition',
                                attrTextName: 'dictPositionText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictPositionText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                layout: { type: 'hbox' },
                items: [
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Категорія посади'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'positionCategorySelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: function () {
                              const sourceData = me.getEnumData('HR_POSITION_CATEGORY')
                              me.selectElements({
                                attrName: 'positionCategory',
                                attrTextName: 'positionCategoryText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'positionCategoryText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Категорія персоналу'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictStaffCatSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictStaffCat')
                                .attrs(['ID', 'name'])
                                .orderBy('name')
                                .selectAsObject({
                                  'name': 'description'
                                })
                              me.selectElements({
                                attrName: 'dictStaffCat',
                                attrTextName: 'dictStaffCatText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictStaffCatText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                layout: { type: 'hbox' },
                items: [
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Вид посади'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictPositionKindSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictPositionKind')
                                .attrs(['ID', 'name'])
                                .orderBy('name')
                                .selectAsObject({
                                  'name': 'description'
                                })
                              me.selectElements({
                                attrName: 'dictPositionKind',
                                attrTextName: 'dictPositionKindText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictPositionKindText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Група посади'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictPositionGroupSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictPositionGroup')
                                .attrs(['ID', 'name'])
                                .orderBy('name')
                                .selectAsObject({
                                  'name': 'description'
                                })
                              me.selectElements({
                                attrName: 'dictPositionGroup',
                                attrTextName: 'dictPositionGroupText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictPositionGroupText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                xtype: 'fieldset',
                title: UB.i18n('Підрозділ'),
                margin: '5 5 0 5',
                padding: '0 0 5 5',
                items: [
                  {
                    layout: { type: 'hbox' },
                    items: [
                      {
                        xtype: 'button',
                        name: 'selectDepartmentBtn',
                        margin: '5 5 5 5',
                        height: 30,
                        style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                        iconCls: 'fas fa-filter',
                        cls: 'fill-action',
                        handler: async function () {
                          const sourceData = await UB.Repository('hr_department')
                            .attrs(['mi_data_id', 'name', 'description'])
                            .where('orgID', '=', me.orgID || appAC.globalOrganization())
                            .misc({ __mip_ondate: me.onDate || appAC.globalApplicationDate() })
                            .where('state', '=', 'ACTIVE')
                            .orderBy('code')
                            .selectAsObject({
                              'mi_data_id': 'ID'
                            })
                          me.selectElements({
                            attrName: 'department',
                            attrTextName: 'departmentText',
                            sourceData
                          })
                        }
                      },
                      {
                        xtype: 'textfield',
                        flex: 1,
                        name: 'departmentText',
                        readOnly: true
                      }
                    ]
                  }
                ]
              },
              {
                layout: { type: 'hbox' },
                items: [
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Джерело фінансування'),
                    flex: 1,
                    margin: '5 5 5 5',
                    padding: '0 0 5 5',
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'fundSourceSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: function () {
                              $App.connection.run({
                                entity: 'ac_fundSource',
                                method: 'selectByOrg',
                                fieldList: ['ID', 'name'],
                                orgID: appAC.globalOrganization()
                              }).then(result => {
                                const sourceData = []
                                result.resultData.data.forEach(item => {
                                  sourceData.push({
                                    ID: item[0],
                                    description: item[1]
                                  })
                                })
                                me.selectElements({
                                  attrName: 'dictFundSource',
                                  attrTextName: 'dictFundSourceText',
                                  sourceData
                                })
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictFundSourceText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Кваліфікаційна категорія'),
                    margin: '5 5 0 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictEmpCategorySelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictEmpCategory')
                                .attrs(['ID', 'name'])
                                .orderBy('name')
                                .selectAsObject({
                                  'name': 'description'
                                })
                              me.selectElements({
                                attrName: 'dictEmpCategory',
                                attrTextName: 'dictEmpCategoryText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictEmpCategoryText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                layout: { type: 'hbox' },
                items: [
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Група (рівень) за схемою окладів'),
                    margin: '5 5 5 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictSalarySchemeLevelSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictSalarySchemeLevel')
                                .attrs(['ID', 'name'])
                                .where('isActive', '=', 1)
                                .exists(UB.Repository('hr_dictSalarySchemeOrg')
                                  .correlation('dictSalarySchemeID', 'dictSalarySchemeID')
                                  .where('orgID', '=', appAC.globalOrganization())
                                )
                                .orderBy('name')
                                .selectAsObject({
                                  'name': 'description'
                                })
                              me.selectElements({
                                attrName: 'dictSalarySchemeLevel',
                                attrTextName: 'dictSalarySchemeLevelText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictSalarySchemeLevelText',
                            readOnly: true
                          }
                        ]
                      }
                    ]
                  },
                  {
                    xtype: 'fieldset',
                    title: UB.i18n('Тарифний розряд'),
                    margin: '5 5 5 5',
                    padding: '0 0 5 5',
                    flex: 1,
                    items: [
                      {
                        layout: { type: 'hbox' },
                        items: [
                          {
                            xtype: 'button',
                            name: 'dictTarifCoeffSelectBtn',
                            margin: '5 5 5 5',
                            height: 30,
                            style: 'border: 1px solid #BFBFBF; border-radius: 4px;',
                            iconCls: 'fas fa-filter',
                            cls: 'fill-action',
                            handler: async function () {
                              const sourceData = await UB.Repository('hr_dictTarifCoeff')
                                .attrs(['ID', 'name'])
                                .orderBy('name')
                                .selectAsObject({
                                  'name': 'description'
                                })
                              me.selectElements({
                                attrName: 'dictTarifCoeff',
                                attrTextName: 'dictTarifCoeffText',
                                sourceData
                              })
                            }
                          },
                          {
                            xtype: 'textfield',
                            flex: 1,
                            name: 'dictTarifCoeffText',
                            readOnly: true
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
      },
      {
        xtype: 'acGrid',
        stripeRows: true,
        storeType: 'local',
        disablePaging: true,
        autoScroll: true,
        name: 'positionList',
        stateId: UB.core.UBLocalStorageManager.getKeyUI('positionSearchControl_positionList'),
        notWriteChanges: true,
        showToolBar: true,
        flex: 1,
        useCheckBoxColumn: true,
        checkboxModelConfig: {
          showHeaderCheckbox: true
        },
        hideActions: ['edit', 'del', 'addNewByCurrent', 'addNew'],
        region: 'center',
        customToolBarActions: [
          {
            xtype: 'button',
            tooltip: UB.i18n('Відібрати посади'),
            text: UB.i18n('Відібрати посади'),
            iconCls: 'fas fa-angle-double-down',
            cls: 'fill-action',
            handler: function () {
              me.selectPosition()
            }
          },
          {
            xtype: 'component',
            width: 50
          },
          {
            xtype: 'checkbox',
            name: 'hideSelected',
            labelWidth: 200,
            fieldLabel: UB.i18n('Не показувати вже доданих'),
            listeners: {
              change: function (ctrl) {
                const me = ctrl.up('form')
                if (me.loaded && me.selected.length) me.selectPosition()
              }
            }
          },
          {
            xtype: 'component',
            flex: 1
          },
          {
            xtype: 'button',
            tooltip: UB.i18n('Пошук посад'),
            iconCls: 'fa fa-search',
            cls: 'blue-action',
            handler: function () {
              me.attr.searchPanel.collapse()
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_searchPosition',
                customParams: {
                  showSelectButton: true
                },
                cmpInitConfig: {
                  onSelectData: function (data, isDelete) {
                    const posIDs = data.map(o => o.ID)
                    me.selectPosition(posIDs)
                  }
                }
              })
            }
          }
        ],
        fields: [
          { name: 'name', columnConfig: { text: UB.i18n('Посада'), flex: 1, filterBy: 'string' } },
          { name: 'depName', columnConfig: { text: UB.i18n('Підрозділ'), flex: 1, filterBy: 'string' } },
          { name: 'accrualSum', columnConfig: { text: UB.i18n('Поточний оклад'), flex: 1, floatFormat: 2, filterBy: 'float' } },
          { name: 'dictSalarySchemeLevel', columnConfig: { text: UB.i18n('Рівень схеми посадового окладу'), flex: 1, filterBy: 'string' } },
          { name: 'dictTarifCoeff', columnConfig: { text: UB.i18n('Тарифний розряд'), flex: 1, filterBy: 'string' } },
          { name: 'positionCategoryName', columnConfig: { text: UB.i18n('Категорія посади'), flex: 1, filterBy: 'string' } },
          { name: 'departmentID' },
          { name: 'positionID' }
        ],
        getRowClass: function (row) {
          const selectedRow = me.selected.find(o => o === row.get('positionID'))
          if (selectedRow) {
            return 'grd-color-blue-italic'
          }
        }
      },
      {
        xtype: 'panel',
        layout: { type: 'hbox', pack: 'end' },
        region: 'south',
        style: 'border-top: 1px solid #BFBFBF',
        items: [
          {
            xtype: 'button',
            text: UB.i18n('Відмінити'),
            width: 120,
            height: 30,
            margin: '10 10 10 0',
            handler: function () {
              me.up('window').close()
            }
          },
          {
            xtype: 'button',
            text: UB.i18n('Додати'),
            width: 120,
            height: 30,
            margin: '10 10 10 0',
            handler: function () {
              me.closeAndLoad()
            }
          }
        ]
      }
    ]

    me.selectElements = function ({ attrName, attrTextName, sourceData = [] }) {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_elementSelectEx',
        cmpInitConfig: {
          sourceData,
          selectedData: me.params[attrName],
          onSelectData: (data) => {
            me.params[attrName] = data.selected
            me.params[attrTextName] = data.selected.reduce((res, item) => {
              res += item.description + divider
              return res
            }, '')
            me.attr[attrTextName].setValue(me.params[attrTextName])
          }
        }
      })
    }

    me.getEnumData = function (enumName) {
      const sourceData = []
      UB.core.UBEnumManager.getArrayStore(enumName).data.items.forEach(item => {
        sourceData.push({
          ID: item.get('code'),
          description: item.get('name')
        })
      })
      return sourceData
    }

    me.closeAndLoad = function () {
      const selection = me.attr.grid.getSelectionModel().selected.items
      if (!selection.length) {
        $App.dialogInfo(UB.i18n('Не вибрано жодного елементу'), UB.i18n('Увага'))
        return
      }
      if (me.onSelectData && _.isFunction(me.onSelectData)) {
        const data = []
        selection.forEach(item => {
          data.push(item.getData())
        })
        me.onSelectData(data)
      }
      me.up('window').close()
    }

    me.selectPosition = async (posIDs = []) => {
      me.setLoading(true)
      const onDate = me.onDate || appAC.globalApplicationDate()
      const positionQuery = UB.Repository('hr_position')
        .attrs(['ID', 'parentUnitID', 'name', 'depDescription', 'accrualSum', 'positionCategory.name',
          'dictSalarySchemeLevelID.description', 'dictSalarySchemeLevelID.accrualSumMax'
        ])
        .where('orgID', '=', me.orgID || appAC.globalOrganization())
        .where('state', '=', 'ACTIVE')
        .where('liquidate', '=', 0)
        .whereIf(me.paymentType, 'paymentType', '=', me.paymentType)
        .misc({
          __mip_ondate: onDate
        })
      if (me.attr.hideSelected.getValue()) {
        positionQuery.where('ID', 'notIn', me.selected)
      }
      if (posIDs.length) {
        positionQuery.where('ID', 'in', posIDs)
      } else {
        if (me.params.positionType.length) {
          positionQuery.where('positionType', 'in', me.params.positionType.map(o => o.value))
        }
        if (me.params.positionCategory.length) {
          positionQuery.where('positionCategory', 'in', me.params.positionCategory.map(o => o.value))
        }
        if (me.params.dictStaffCat.length) {
          positionQuery.where('dictStaffCatID', 'in', me.params.dictStaffCat.map(o => o.value))
        }
        if (me.params.dictPosition.length) {
          positionQuery.where('dictPositionID', 'in', me.params.dictPosition.map(o => o.value))
        }
        if (me.params.dictPositionKind.length) {
          positionQuery.where('dictPositionKindID', 'in', me.params.dictPositionKind.map(o => o.value))
        }
        if (me.params.dictPositionGroup.length) {
          positionQuery.where('dictPositionGroupID', 'in', me.params.dictPositionGroup.map(o => o.value))
        }
        if (me.params.department.length) {
          positionQuery.where('parentUnitID', 'in', me.params.department.map(o => o.value))
        }
        if (me.params.dictFundSource.length) {
          positionQuery.exists(UB.Repository('hr_positionFundSource')
            .correlation('positionID', 'ID')
            .where('dictFundSourceID', 'in', me.params.dictFundSource.map(o => o.value))
          )
        }
        if (me.params.dictEmpCategory.length) {
          positionQuery.where('dictEmpCategoryID', 'in', me.params.dictEmpCategory.map(o => o.value))
        }
        if (me.params.dictSalarySchemeLevel.length) {
          positionQuery.where('dictSalarySchemeLevelID', 'in', me.params.dictSalarySchemeLevel.map(o => o.value))
        }
        if (me.params.dictTarifCoeff.length) {
          positionQuery.where('dictTarifCoeffID', 'in', me.params.dictTarifCoeff.map(o => o.value))
        }
      }
      try {
        const data = await positionQuery.selectAsObject({
          'positionCategory.name': 'positionCategoryName',
          'ID': 'positionID',
          'dictSalarySchemeLevelID.description': 'dictSalarySchemeLevel',
          'dictTarifCoeffID.description': 'dictTarifCoeff',
          'depDescription': 'depName'
        })
        me.setLoading(false)
        const store = me.attr.grid.getStore()
        me.attr.grid.removeAll()
        store.insert(store.data.length, data)
        me.attr.hiddenPanel && me.attr.hiddenPanel.expand()
      } catch (e) {
        me.setLoading(false)
      }
      me.loaded = true
    }

    me.attrList = [ 'positionType', 'positionCategory', 'dictStaffCat', 'dictPositionKind', 'dictPositionGroup', 'department',
      'dictFundSource', 'dictEmpCategory', 'dictSalarySchemeLevel', 'dictTarifCoeff', 'dictPosition'
    ]

    me.on('afterrender', () => {
      const me = this
      me.attr = {
        panel: me.down('[name=changesParamsPanel]'),
        grid: me.down('[name=positionList]'),
        searchPanel: me.down('[name=searchParamsPanel]'),
        hiddenPanel: me.down('[name=hiddenPanel]'),
        positionTypeText: me.down('[name=positionTypeText]'),
        positionCategoryText: me.down('[name=positionCategoryText]'),
        dictStaffCatText: me.down('[name=dictStaffCatText]'),
        departmentText: me.down('[name=departmentText]'),
        dictPositionText: me.down('[name=dictPositionText]'),
        dictPositionKindText: me.down('[name=dictPositionKindText]'),
        dictPositionGroupText: me.down('[name=dictPositionGroupText]'),
        dictFundSourceText: me.down('[name=dictFundSourceText]'),
        dictEmpCategoryText: me.down('[name=dictEmpCategoryText]'),
        dictSalarySchemeLevelText: me.down('[name=dictSalarySchemeLevelText]'),
        dictTarifCoeffText: me.down('[name=dictTarifCoeffText]'),
        hideSelected: me.down('[name=hideSelected]')
      }
      me.attrList.forEach(attrName => {
        if (me.params[attrName].length) {
          me.params[attrName + 'Text'] = me.params[attrName].reduce((res, item) => {
            res += item.description + divider
            return res
          }, '')
          me.attr[attrName + 'Text'].setValue(me.params[attrName + 'Text'])
        }
      })
      const hideSelectedChkBox = me.down('[name=hideSelected]')
      if (hideSelectedChkBox) {
        hideSelectedChkBox.inputEl.el.setStyle('margin-top', '2px')
      }
    })

    me.params = {
      ID: null
    }

    me.attrList.forEach(attrName => {
      me.params[attrName] = me[attrName] || []
      me.params[attrName + 'Text'] = ''
    })

    me.selected = me.selected || []
    me.loaded = false

    me.callParent(arguments)
  }

})
