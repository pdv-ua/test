/* global UB $App Ext */
module.exports = {
  getPayElListParamTabs,
  getPayElGroupListParamTabs,
  getGeneralRegistryExtraTab,
  getEmployeeAccrualListExtraTab
}

function getPayElListParamTabs (me, currTabs, title, gridName = 'payElListParams', otherParams = {}) {
  currTabs.push({
    title: title,
    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    items: [
      {
        xtype: 'acGrid',
        name: gridName,
        autoScroll: true,
        flex: 1,
        notWriteChanges: true,
        storeType: 'local',
        showToolBar: true,
        hideDefaultAction: true,
        disablePaging: true,
        loadMaskMessage: UB.i18n('Завантаження даних...'),
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion', 'audit', 'itemSelect', 'history', 'prefilter'],
        includeCustomReadOnly: [],
        includeContextMenuReadOnly: [],
        enableMultifilter: true,
        onItemDoubleClick: () => {},
        setGridValue: (grid, data) => {
          me.record[gridName] = JSON.stringify(data)
          UB.Repository('hr_payEl')
            .attrs(['ID', 'description', 'methodID.methodGroupID.groupType.name', 'methodID.methodGroupID.name'])
            .selectAsObject({
              'methodID.methodGroupID.groupType.name': 'groupType',
              'methodID.methodGroupID.name': 'groupName'
            }).then(resultData => {
              data.forEach(row => {
                const payEl = resultData.find(o => o.ID === row.payElID) || {}
                row.ID = row.payElID
                row.description = payEl.description || ''
                row.groupType = payEl.groupType || ''
                row.groupName = payEl.groupName || ''
              })
              grid.setLocalStoreData(data)
            })
        },
        getGridValue: (grid) => {
          const data = []
          const records = grid.getData()
          records.forEach(row => {
            data.push({ payElID: row.payElID, orderN: row.orderN })
          })
          return data
        },
        customToolBarActions: [
          {
            tooltip: UB.i18n('Редагувати список'),
            actionId: 'addByList',
            iconCls: 'u-icon-edit-alt',
            scale: 'medium',
            cls: 'fill-action',
            handler: function (btn) {
              const grid = btn.up(`[name=${gridName}]`)
              const sourceData = (grid.getStore().snapshot || grid.getStore().data).items.map(o => o.getData())
              const selectData = sourceData.map(o => o.payElID)
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_payElSelect',
                cmpInitConfig: {
                  selectData,
                  sourceData,
                  sourceAttr: 'payElID',
                  valueAttr: 'payElID',
                  isAutoCalc: otherParams.isAutoCalc && otherParams.isAutoCalc === 1 ? 1 : null,
                  methodGroupCode: otherParams.methodGroupCode || null,
                  methodCode: otherParams.methodCode || null,
                  payElEntryType: otherParams.payElEntryType || null,
                  enableOrderN: otherParams.enablePayElOrderN || null,
                  onSelectData: (data) => {
                    if (data.remove.length || data.add.length) {
                      const records = grid.getData().map(o => { return { payElID: o.payElID, orderN: o.orderN } })
                      if (data.remove.length) {
                        for (let i = records.length - 1; i >= 0; --i) {
                          if (data.remove.find(o => o === records[i].payElID)) {
                            records.splice(i, 1)
                          }
                        }
                      }
                      if (data.add.length) {
                        data.add.forEach(row => {
                          records.push({
                            payElID: otherParams.enablePayElOrderN ? row.ID : row,
                            orderN: otherParams.enablePayElOrderN ? row.orderN : 0
                          })
                        })
                      }
                      grid.setGridValue(grid, records)
                    }
                  }
                }
              })
            }
          }
        ],
        fields: [
          { name: 'ID' },
          { name: 'payElID' },
          { name: 'description',
            columnConfig: {
              text: UB.i18n('Вид оплати'),
              flex: 1
            }
          },
          { name: 'orderN',
            columnConfig: {
              text: UB.i18n('Порядок відображення'),
              flex: 1,
              sortBy: 'Number',
              filterBy: 'float'
            }
          },
          { name: 'groupType',
            columnConfig: {
              text: UB.i18n('Тип'),
              flex: 1
            }
          },
          { name: 'groupName',
            columnConfig: {
              text: UB.i18n('Група'),
              flex: 1
            }
          }
        ]
      }
    ]
  })
}
function getPayElGroupListParamTabs (me, currTabs, title, gridName = 'payElListParams', otherParams = {}) {
  let selectedRecord = null
  const mainGrid = Ext.create('AC.controls.AcGrid', {
    xtype: 'acGrid',
    // title: UB.i18n('Показник'),
    name: gridName,
    width: 200,
    autoScroll: true,
    cellEditing: false,
    formCode: 'hr_groupParam',
    clicksToEdit: 2,
    region: 'west',
    storeType: 'local',
    disablePaging: true,
    notWriteChanges: true,
    showToolBar: true,
    viewConfig: {
      markDirty: false
    },
    hideActions: ['addNewByCurrent'],
    customToolBarActions: [
      {
        xtype: 'button',
        tooltip: UB.i18n('Видалити'),
        scale: 'medium',
        iconCls: 'u-icon-delete',
        cls: 'delete-action',
        handler: function () {
          mainGrid.onDel()
        }
      }
    ],
    onAfterRender: (grid) => {
      grid.on('changeData', (grd, event) => {
        if (event === 'delete') {
          detailGrid.setLocalStoreData([])
          detailTitle.setValue('')
        }
      })
    },
    onSaveEditData: function (form, grid, record, formData) {
      if (record && formData) {
        record.set('name', formData.name)
        record.set('fullName', formData.fullName)

        detailTitle.setValue(formData.fullName || formData.name || '')
      } else {
        const data = mainGrid.getData()
        const newRow = {
          ID: data.length ? Math.max(...data.map(el => el.ID)) + 1 : 1,
          name: formData.name,
          fullName: formData.fullName,
          detail: []
        }
        data.push(newRow)
        mainGrid.setLocalStoreData(data)
      }
      const data = mainGrid.getData()
      me.record[gridName] = JSON.stringify(data)
    },
    onItemClick: (view, record) => {
      selectedRecord = record
      detailGrid.setLocalStoreData(record.get('detail') || [])
      detailTitle.setValue(record.get('fullName') || record.get('name') || '')
    },
    /*
    onBeforeEdit: (control, context) => {
      selectedRecord = context.record
      if (!context.record.get('ID')) {
        context.record.set('ID', (context.store.max('ID') || 0) + 1)
      }
      if (!context.record.get('detail')) {
        context.record.set('detail', [])
      }
      detailGrid.setLocalStoreData(context.record.get('detail'))
      detailTitle.setValue(context.record.get('fullName') || context.record.get('name') || '')
    },
    edit: (control, context) => {
      me.record[gridName] = JSON.stringify(mainGrid.getData())
      detailTitle.setValue(context.record.get('fullName') || context.record.get('name') || context.record.get('name') || '')
    }, */
    setGridValue: (grid, data) => {
      me.record[gridName] = JSON.stringify(data)
      mainGrid.setLocalStoreData(data)
      detailGrid.setLocalStoreData([])
    },
    getGridValue: (grid) => {
      const data = []
      const records = grid.getData()
      records.forEach(row => {
        data.push({ ID: row.ID, name: row.name, fullName: row.fullName, detail: row.detail })
      })
      return data
    },
    fields: [
      { name: 'ID' },
      { name: 'detail' },
      { name: 'name',
        columnConfig: {
          text: UB.i18n('Назва показника'),
          flex: 1
        }
      },
      { name: 'fullName'  }
    ]
  })
  const detailTitle = Ext.create('Ext.form.field.Text', {
    xtype: 'textfield',
    disabled: true,
    value: '',
    heigth: 25,
    margin: '7 10 10 7'
  })
  const detailGrid = Ext.create('AC.controls.AcGrid', {
    xtype: 'acGrid',
    autoScroll: true,
    region: 'center',
    // title: UB.i18n('Вибрані значення'),
    notWriteChanges: true,
    storeType: 'local',
    showToolBar: true,
    hideDefaultAction: true,
    disablePaging: true,
    loadMaskMessage: UB.i18n('Завантаження даних...'),
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion', 'audit', 'itemSelect', 'history', 'prefilter'],
    includeCustomReadOnly: [],
    includeContextMenuReadOnly: [],
    enableMultifilter: true,
    viewConfig: {
      markDirty: false
    },
    onItemDoubleClick: () => {},
    setGridValue: (grid, data) => {
      UB.Repository('hr_payEl')
        .attrs(['ID', 'description', 'methodID.methodGroupID.groupType.name', 'methodID.methodGroupID.name'])
        .selectAsObject({
          'methodID.methodGroupID.groupType.name': 'groupType',
          'methodID.methodGroupID.name': 'groupName'
        }).then(resultData => {
          data.forEach(row => {
            const payEl = resultData.find(o => o.ID === row.payElID) || {}
            row.ID = row.payElID
            row.description = payEl.description || ''
            row.groupType = payEl.groupType || ''
            row.groupName = payEl.groupName || ''
          })
          grid.setLocalStoreData(data)
        })
    },
    customToolBarActions: [
      {
        xtype: 'button',
        tooltip: UB.i18n('Оновити'),
        scale: 'medium',
        iconCls: 'u-icon-refresh',
        handler: function () {
          const record = mainGrid.getSelectedRowData()
          if (record) {
            detailGrid.setLocalStoreData(record.detail || [])
            // detailGrid.setTitle(record.fullName || record.name || '')
            detailTitle.setValue(record.fullName || record.name || '')
          }
        }
      },
      {
        tooltip: UB.i18n('Редагувати список'),
        actionId: 'addByList',
        iconCls: 'u-icon-edit-alt',
        scale: 'medium',
        cls: 'fill-action',
        handler: function (btn) {
          if (!selectedRecord) {
            return
          }
          const sourceData = (detailGrid.getStore().snapshot || detailGrid.getStore().data).items.map(o => o.getData())
          const selectData = sourceData.map(o => o.payElID)
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_payElSelect',
            cmpInitConfig: {
              selectData,
              sourceData,
              sourceAttr: 'payElID',
              valueAttr: 'payElID',
              isAutoCalc: otherParams.isAutoCalc && otherParams.isAutoCalc === 1 ? 1 : null,
              methodGroupCode: otherParams.methodGroupCode || null,
              methodCode: otherParams.methodCode || null,
              payElEntryType: otherParams.payElEntryType || null,
              enableOrderN: otherParams.enablePayElOrderN || null,
              onSelectData: (data) => {
                if (data.remove.length || data.add.length) {
                  const records = detailGrid.getData().map(o => { return { payElID: o.payElID, orderN: o.orderN } })
                  if (data.remove.length) {
                    for (let i = records.length - 1; i >= 0; --i) {
                      if (data.remove.find(o => o === records[i].payElID)) {
                        records.splice(i, 1)
                      }
                    }
                  }
                  if (data.add.length) {
                    data.add.forEach(row => {
                      records.push({
                        payElID: otherParams.enablePayElOrderN ? row.ID : row,
                        orderN: otherParams.enablePayElOrderN ? row.orderN : 0
                      })
                    })
                  }
                  selectedRecord.set('detail', records)
                  detailGrid.setGridValue(detailGrid, records)

                  const dataMG = mainGrid.getData()
                  me.record[gridName] = JSON.stringify(dataMG)
                }
              }
            }
          })
        }
      }
    ],
    fields: [
      { name: 'ID' },
      { name: 'payElID' },
      { name: 'description',
        columnConfig: {
          text: UB.i18n('Вид оплати'),
          flex: 1
        }
      },
      { name: 'orderN',
        columnConfig: {
          text: UB.i18n('Порядок відображення'),
          flex: 1,
          sortBy: 'Number',
          filterBy: 'float'
        }
      },
      { name: 'groupType',
        columnConfig: {
          text: UB.i18n('Тип'),
          flex: 1
        }
      },
      { name: 'groupName',
        columnConfig: {
          text: UB.i18n('Група'),
          flex: 1
        }
      }
    ]
  })
  currTabs.push({
    xtype: 'panel',
    title: title,
    autoScroll: true,
    layout: {
      type: 'hbox'
    },
    items: [mainGrid,
      {
        xtype: 'panel',
        layout: { type: 'vbox', align: 'stretch'},
        flex: 1,
        items: [
          detailTitle,
          detailGrid
        ]
      }
    ]
  })
}

function getGeneralRegistryExtraTab (me, currTabs, editorStud) {
  currTabs.push({
    itemId: 'tabReportExtra',
    title: UB.i18n('Додаткові параметри'),
    autoScroll: true,
    margin: '5, 0, 0, 0',
    layout: {
      type: 'hbox'
    },
    items: [
      {
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        width: 400,
        autoScroll: true,
        items: [
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Групувати види оплати:'),
            labelWidth: 350,
            name: 'groupPay',
            listeners: {
              change: function (ctrl, value) {
                me.record['groupPay'] = value
                if (me.attr.showPayName) {
                  if (!value) {
                    me.attr.showPayName.setValue()
                  }
                  me.attr.showPayName.setReadOnly(!value)
                  me.attr.showPayName.setDisabled(!value)
                }

                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати види оплати при їх групуванні:'),
            labelWidth: 350,
            name: 'showPayName',
            listeners: {
              change: function (ctrl, value) {
                me.record['showPayName'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Виключити рядки з нульовими сумами:'),
            labelWidth: 350,
            name: 'hideZeroRow',
            listeners: {
              change: function (ctrl, value) {
                me.record['hideZeroRow'] = value
                me.clearPrintForm()
              }
            }
          }
        ]
      },
      getGeneralRegistryExtraColumnsGrid(me, editorStud)
    ]
  })
}

function getGeneralRegistryExtraColumnsGrid (me, editorStud) {
  return {
    xtype: 'acGrid',
    name: 'extraColumnsListGR',
    width: 450,
    autoScroll: true,
    storeType: 'local',
    disablePaging: true,
    notWriteChanges: true,
    showToolBar: false,
    viewConfig: {
      markDirty: false
    },
    checkColumn: {},
    hideActions: ['edit', 'del', 'addNewByCurrent', 'addNew'],
    fields: [
      { name: 'code' },
      { name: 'description', columnConfig: { text: UB.i18n('Додаткові стовбці'), flex: 1 } }
    ],
    getRowClass: function (record) {
      if (record.get('isChecked')) {
        return 'ub-grid-row-selected'
      }
    },
    setGridValue: (grid, data) => {
      me.record['extraColumns'] = data
      Ext.suspendLayouts()
      grid.getStore().suspendEvents()
      grid.suspendEvents()
      const allRecords = grid.getStore()
      allRecords.each(rec => {
        rec.beginEdit()
        const code = rec.get('code')
        if (me.record['extraColumns'].includes(code)) {
          rec.set('isChecked', true)
        } else {
          rec.set('isChecked', false)
        }
        rec.endEdit(true)
      })
      grid.resumeEvents()
      grid.getStore().resumeEvents()
      Ext.resumeLayouts(true)
      grid.getView().refresh()
    },
    getGridValue: (grid) => {
      const data = []
      const records = grid.getCheckedRow()
      records.forEach(row => {
        data.push(row.data.code)
      })
      return data
    },
    loadColumns: async (grid) => {
      const storeData = [
        { code: 'sexType', description: UB.i18n('Стать') },
        { code: 'birthDate', description: UB.i18n('Дата народження') },
        { code: 'dateFrom', description: UB.i18n('Дата прийому на роботу') },
        { code: 'dateTo', description: UB.i18n('Дата звільнення') },
        { code: 'workerType', description: UB.i18n('Форма зайнятості') },
        { code: 'workScheduleID', description: UB.i18n('Графік роботи') },
        { code: 'workPlace', description: UB.i18n('Місце роботи') },
        { code: 'dictStaffCatID', description: UB.i18n('Категорія персоналу') },
        { code: 'mtCount', description: UB.i18n('Кількість ставок') },
        { code: 'dictCategoryECBID', description: UB.i18n('Категорія застрахованої особи') },
        { code: 'accountID', description: UB.i18n('Рахунок витрат') }
      ]
      const costType = await UB.Repository('hr_payDim')
        .attrs('ID')
        .where('dimension.entityName', '=', 'ac_dictCostType')
        .where('dimension.mi_deleteDate', '=', '#maxdate')
        .selectSingle()
      if (costType) {
        storeData.push({ code: 'dictCostType', description: UB.i18n('Місце виникнення витрат') })
      }

      if (editorStud) {
        const storStudeData = [
          { code: 'studDateFrom', description: UB.i18n('Дата початку навчання') },
          { code: 'studDateTo', description: UB.i18n('Дата закінчення навчання') },
          { code: 'studFaculity', description: UB.i18n('Факультет') },
          { code: 'studSemester', description: UB.i18n('Курс') },
          { code: 'studGroup', description: UB.i18n('Група') },
          { code: 'studTabNum', description: UB.i18n('Номер залікової книжки') },
          { code: 'studTypeStudy', description: UB.i18n('Вид навчання') },
          { code: 'studFormStudy', description: UB.i18n('Форма навчання') },
          { code: 'studDictLevel', description: UB.i18n('Освітній рівень') },
          { code: 'studDictStaffCat', description: UB.i18n('Категорія персоналу для розрахунків') }
        ]
        storeData.push(...storStudeData)
      }

      grid.setLocalStoreData(storeData)
    },
    onAfterRender: (grid) => {
      grid.on('changeChecked', (tree, record) => {
        if (!me.record['extraColumns']) me.record['extraColumns'] = []
        if (record) {
          if (record.get('isChecked')) {
            const idx = me.record['extraColumns'].indexOf(record.get('code'))
            if (idx === -1) me.record['extraColumns'].push(record.get('code'))
          } else {
            const idx = me.record['extraColumns'].indexOf(record.get('code'))
            if (idx >= 0) me.record['extraColumns'].splice(idx, 1)
          }
        } else {
          const allRecords = grid.getStore().snapshot || grid.getStore().data
          if (allRecords.length) {
            allRecords.each(rec => {
              if (rec.get('isChecked')) {
                const idx = me.record['extraColumns'].indexOf(rec.get('code'))
                if (idx === -1) me.record['extraColumns'].push(rec.get('code'))
              } else {
                const idx = me.record['extraColumns'].indexOf(rec.get('code'))
                if (idx >= 0) me.record['extraColumns'].splice(idx, 1)
              }
            })
          }
        }
        me.clearPrintForm()
      })
    }
  }
}

function getEmployeeAccrualListExtraTab (me, currTabs) {
  currTabs.push({
    itemId: 'tabReportExtra',
    title: UB.i18n('Додаткові параметри'),
    autoScroll: true,
    margin: '5, 0, 0, 0',
    layout: {
      type: 'hbox'
    },
    items: [
      {
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        width: 400,
        autoScroll: true,
        items: [
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати  постійні нарахування/утримання по організації'),
            labelWidth: 350,
            name: 'orgAccrual',
            listeners: {
              change: function (ctrl, value) {
                me.record['orgAccrual'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати  індивідуальні нарахування/утримання'),
            labelWidth: 350,
            name: 'indAccrual',
            listeners: {
              change: function (ctrl, value) {
                me.record['indAccrual'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати записи із документів тарифікації "Розрахунок тарифікації"'),
            labelWidth: 350,
            name: 'tarifAccrual',
            listeners: {
              change: function (ctrl, value) {
                me.record['tarifAccrual'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати записи із заповненою датою кінця дії'),
            labelWidth: 350,
            name: 'showWithDateTo',
            listeners: {
              change: function (ctrl, value) {
                me.record['showWithDateTo'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати записи із безстроковою дією'),
            labelWidth: 350,
            name: 'showEmptyDateTo',
            listeners: {
              change: function (ctrl, value) {
                me.record['showEmptyDateTo'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Відображати записи з врахуванням зміни посади та підрозділу у місяцях періоду звіту'),
            labelWidth: 350,
            name: 'checkPosDepChange',
            listeners: {
              change: function (ctrl, value) {
                me.record['checkPosDepChange'] = value
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'checkbox',
            fieldLabel: UB.i18n('Групувати в розрізі структурних підрозділів'),
            labelWidth: 350,
            name: 'groupReportByDep',
            listeners: {
              change: function (ctrl, value) {
                me.record['groupReportByDep'] = value
                if (!value && me.record['setOrderBy'] && me.record['setOrderBy'] === '4') {
                  me.attr.setOrderBy.setValue('1')
                }
                me.clearPrintForm()
              }
            }
          },
          {
            xtype: 'ubcombobox',
            dataType: 'Enum',
            enumGroupFilter: 'HR_ORDER_BY',
            fieldLabel: UB.i18n('Впорядкувати'),
            name: 'setOrderBy',
            labelWidth: 120,
            valueField: 'code',
            displayField: 'name',
            disableContextMenu: true,
            hideEntityItemInContext: true,
            ubRequest: {
              entity: 'ubm_enum',
              method: UB.core.UBCommand.methodName.SELECT,
              fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
              whereList: {
                eGroup: {
                  expression: '[eGroup]',
                  condition: 'equal',
                  values: { 'eGroup': 'HR_ORDER_BY' }
                }
              }
            },
            listeners: {
              change: function (ctrl, value) {
                me.record['setOrderBy'] = value
                if (value === '4') {
                  me.attr.groupReportByDep.setValue(true)
                }
                me.clearPrintForm()
              }
            }
          }
        ]
      },
      getEmployeeAccrualListColumnsGrid(me)
    ]
  })
}

function getEmployeeAccrualListColumnsGrid (me) {
  return {
    xtype: 'acGrid',
    name: 'extraColumnsListGR',
    width: 450,
    autoScroll: true,
    storeType: 'local',
    disablePaging: true,
    notWriteChanges: true,
    showToolBar: false,
    viewConfig: {
      markDirty: false
    },
    checkColumn: {},
    hideActions: ['edit', 'del', 'addNewByCurrent', 'addNew'],
    fields: [
      { name: 'code' },
      { name: 'description', columnConfig: { text: UB.i18n('Додаткові стовбці'), flex: 1 } }
    ],
    getRowClass: function (record) {
      if (record.get('isChecked')) {
        return 'ub-grid-row-selected'
      }
    },
    setGridValue: (grid, data) => {
      me.record['extraColumns'] = data
      Ext.suspendLayouts()
      grid.getStore().suspendEvents()
      grid.suspendEvents()
      const allRecords = grid.getStore()
      allRecords.each(rec => {
        rec.beginEdit()
        const code = rec.get('code')
        if (me.record['extraColumns'].includes(code)) {
          rec.set('isChecked', true)
        } else {
          rec.set('isChecked', false)
        }
        rec.endEdit(true)
      })
      grid.resumeEvents()
      grid.getStore().resumeEvents()
      Ext.resumeLayouts(true)
      grid.getView().refresh()
    },
    getGridValue: (grid) => {
      const data = []
      const records = grid.getCheckedRow()
      records.forEach(row => {
        data.push(row.data.code)
      })
      return data
    },
    loadColumns: async (grid) => {
      const storeData = [
        { code: 'sexType', description: UB.i18n('Стать') },
        { code: 'birthDate', description: UB.i18n('Дата народження') },
        { code: 'dateFrom', description: UB.i18n('Дата прийому на роботу') },
        { code: 'dateTo', description: UB.i18n('Дата звільнення') },
        { code: 'workerType', description: UB.i18n('Форма зайнятості') },
        { code: 'workScheduleID', description: UB.i18n('Графік роботи') },
        { code: 'workPlace', description: UB.i18n('Місце роботи') },
        { code: 'dictStaffCatID', description: UB.i18n('Категорія персоналу') },
        { code: 'mtCount', description: UB.i18n('Кількість ставок') },
        { code: 'dictCategoryECBID', description: UB.i18n('Категорія застрахованої особи') }
      ]

      const costType = await UB.Repository('hr_payDim')
        .attrs('ID')
        .where('dimension.entityName', '=', 'ac_dictCostType')
        .where('dimension.mi_deleteDate', '=', '#maxdate')
        .selectSingle()
      if (costType) {
        storeData.push({ code: 'dictCostType', description: UB.i18n('Місце виникнення витрат') })
      }

      storeData.push({ code: 'accountID', description: UB.i18n('Рахунок витрат') })
      storeData.push({ code: 'order', description: UB.i18n('Відображати накази для постійних нарахувань') })

      grid.setLocalStoreData(storeData)
    },
    onAfterRender: (grid) => {
      grid.on('changeChecked', (tree, record) => {
        if (!me.record['extraColumns']) me.record['extraColumns'] = []
        if (record) {
          if (record.get('isChecked')) {
            const idx = me.record['extraColumns'].indexOf(record.get('code'))
            if (idx === -1) me.record['extraColumns'].push(record.get('code'))
          } else {
            const idx = me.record['extraColumns'].indexOf(record.get('code'))
            if (idx >= 0) me.record['extraColumns'].splice(idx, 1)
          }
        } else {
          const allRecords = grid.getStore().snapshot || grid.getStore().data
          if (allRecords.length) {
            allRecords.each(rec => {
              if (rec.get('isChecked')) {
                const idx = me.record['extraColumns'].indexOf(rec.get('code'))
                if (idx === -1) me.record['extraColumns'].push(rec.get('code'))
              } else {
                const idx = me.record['extraColumns'].indexOf(rec.get('code'))
                if (idx >= 0) me.record['extraColumns'].splice(idx, 1)
              }
            })
          }
        }
        me.clearPrintForm()
      })
    }
  }
}