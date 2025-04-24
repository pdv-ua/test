/* global Ext $App DevUtils HR appAC _  UB AC  */

Ext.define('HR.controls.staffTreeControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.staffTreeControl',
  layout: {
    type: 'vbox',
    align: 'stretch'
  },
  flex: 1,
  dockedItems: [
    {
      xtype: 'toolbar',
      dock: 'top',
      ubID: 'mainToolbar',
      enableOverflow: true,
      items: [
        { name: 'edit', disabled: true },
        { name: 'editDepName', disabled: true },
        { name: 'reload', disabled: true },
        { name: 'addOrgStructure', hidden: true },
        { name: 'addOrg', hidden: true, disabled: true },
        { name: 'addDep', hidden: true, disabled: true },
        { name: 'addPos', hidden: true, disabled: true },
        { name: 'copyOrgUnit', hidden: true, disabled: true },
        { name: 'copyDepTree', hidden: true, disabled: true },
        { name: 'posSearchAndCompare', hidden: true, disabled: true },
        { name: 'liquidate', hidden: true, disabled: true },
        { name: 'restore', hidden: true, disabled: true },
        { name: 'restoreChanges', hidden: true, disabled: true },
        { name: 'moveNodeUp', hidden: true, disabled: true },
        { name: 'moveNodeDown', hidden: true, disabled: true },
        { name: 'printOrgPlanUnit', hidden: true, disabled: true },
        { name: 'calcPositionCount', hidden: true },
        {
          name: 'searchText',
          xtype: 'textfield',
          maxSize: 200,
          flex: 1,
          skipSetReadOnly: true,
          emptyText: UB.i18n('Введіть рядок для пошуку, Enter - шукати'),
          enableKeyEvents: true,
          listeners: {
            keydown: (ctrl, ev) => {
              if (ev.keyCode === 13) {
                ctrl.up('[doSearch]').doSearch()
              }
            }
          }
        },
        {
          name: 'searchBtn',
          actionId: 'search',
          iconCls: 'fas fa-search',
          cls: 'blue-action',
          handler: btn => {
            btn.up('[doSearch]').doSearch()
          }
        },
        {
          xtype: 'component',
          flex: 1,
          name: 'componentStub'
        },
        {
          xtype: 'ubcombobox',
          name: 'dictFundSource',
          fieldLabel: UB.i18n('Джерело фінансування'),
          labelWidth: 100,
          flex: 1,
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
            change: function (ctrl, value) {
              const me = ctrl.up('[tree]')
              me.dictFundSourceID = value
              me.reloadNode()
            }
          }
        },
        {
          xtype: 'checkbox',
          name: 'showAllPos',
          fieldLabel: UB.i18n('Приховати інші'),
          labelWidth: 80,
          listeners: {
            change: function (ctrl, value) {
              const me = ctrl.up('[tree]')
              me.showAllPos = !value
              me.reloadNode()
            }
          }
        }
      ]
    }
  ],
  isModal: true,
  additionAttr: [],
  orgIDs: [],
  editOrganization: true,
  dictFundSourceID: null,
  showAllPos: true,
  showNode: ['hr_organization', 'hr_department', 'hr_position'],

  initComponent: function () {
    let me = this
    let store
    let tree
    me.store = store = Ext.create('Ext.data.TreeStore', {
      fields: me.fields ||
          [
            {
              name: 'ID',
              type: 'number'
            },
            {
              name: 'text',
              type: 'string'
            },
            {
              name: 'description',
              type: 'string'
            },
            {
              name: 'posCount',
              type: 'number'
            },
            {
              name: 'quantity',
              type: 'text'
            },
            {
              name: 'quantityLead',
              type: 'text'
            },
            {
              name: 'code',
              type: 'string'
            },
            {
              name: 'idxNum',
              type: 'number'
            },
            {
              name: 'state',
              type: 'string'
            },
            {
              name: 'dateFrom',
              type: 'string'
            },
            {
              name: 'dateTo',
              type: 'string'
            },
            {
              name: 'staffOrder',
              type: 'string'
            },
            {
              name: 'stateCode',
              type: 'string'
            },
            {
              name: 'mi_data_id',
              type: 'number'
            },
            {
              name: 'mi_dateFrom',
              type: 'date'
            },
            {
              name: 'liquidate',
              type: 'number'
            },
            {
              name: 'linkToSourceID',
              type: 'number'
            },
            {
              name: 'addDescrPosition',
              type: 'string'
            }
          ],
      proxy: {
        type: 'ubproxy'
      },
      lazyLoad: true,
      root: {
        text: 'root',
        id: null,
        expanded: true,
        children: []
      }
    })
    const editing = me.cellEditing
      ? Ext.create('Ext.grid.plugin.CellEditing', {
        clicksToEdit: 1,
        autoCancel: false,
        errorSummary: false
      }) : null
    if (me.cellEditing) {
      editing.on('edit', function (editor, context) {
        if (_.isFunction(me.edit)) {
          const result = me.edit(editor, context)
          if (result === false) {
            return false
          }
        }
      })
      editing.on('canceledit', function (editor, context) {
        if (_.isFunction(me.canceledit)) {
          const result = me.canceledit(editor, context)
          if (result === false) {
            return false
          }
        }
      })
      editing.on('beforeedit', function (editor, context) {
        if (context.grid.editingPlugin.editing || me.isReadOnly) {
          return false
        }
        if (context.record && context.record.raw && context.record.raw.mi_unityEntity === 'hr_department') {
          return false
        }
        if (_.isFunction(me.onBeforeEdit)) {
          let result = me.onBeforeEdit(editor, context)
          if (result === false) {
            return false
          }
        }
      })
      editing.on('validateedit', function (editor, context) {
        if (_.isFunction(me.onValidateEdit)) {
          let result = me.onValidateEdit(editor, context)
          if (result === false) {
            return false
          }
        }
      })
    }

    me.tree = tree = Ext.create('Ext.tree.Panel', {
      flex: me.searchFeature ? 4 : 0.35,
      header: false,
      loadMask: true,
      autoScroll: true,
      folderSort: false,
      animate: false,
      singleExpand: false,
      store: store,
      rootVisible: false,
      layout: 'fit',
      plugins: [].concat(me.cellEditing ? [editing] : []),
      viewConfig: {
        toggleOnDblClick: false,
        /*
        plugins: {
          ptype: 'treeviewdragdrop',
          enableDrag: true,
          enableDrop: true
        },
        */
        listeners: {
          nodedragover: function (targetNode, position, dragData) {
            const rec = dragData.records[0]
            const tree = targetNode.getOwnerTree()
            if (tree.moveNodesDisabled === undefined) {
              const me = tree.up()
              if (me.readOnly) {
                tree.moveNodesDisabled = true
              } else {
                const contextMenu = tree.contextMenu
                const moveNodeUp = contextMenu.down('[name=moveNodeUp]')
                tree.moveNodesDisabled = me.readOnly || !moveNodeUp || moveNodeUp.hidden
              }
            }
            return !tree.moveNodesDisabled && rec.parentNode === targetNode.parentNode && rec.raw.nodeType !== 'EMPUNIT'
          },
          beforedrop: function (node, data, overModel, dropPosition, dropHandlers) {
            dropHandlers.wait = true
            $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Перемістити вузол ?')).then(isAgree => {
              if (isAgree) {
                let nodeData = overModel.parentNode.childNodes.map(item => {
                  return {
                    ID: item.raw.ID,
                    idxNum: item.raw.idxNum,
                    mi_unityEntity: item.raw.mi_unityEntity,
                    text: item.raw.text
                  }
                })
                tree.setLoading(UB.i18n('Переміщення... '))
                HR.treeUtils.changeIdxNum({
                  movedNodeID: data.records[0].raw.ID,
                  targetNodeID: overModel.raw.ID,
                  dir: dropPosition,
                  data: nodeData
                }).then(result => {
                  tree.setLoading(false)
                  if (result.error) {
                    AC.viewUtils.showToast(UB.i18n('Помилка'), result.error)
                  } else {
                    dropHandlers.processDrop()
                    overModel.parentNode.childNodes.forEach((node, i) => {
                      node.raw.idxNum = result.data[i].newIdxNum
                    })
                  }
                })
              } else {
                dropHandlers.cancelDrop()
              }
            })
          },
          drop: function (node, data, overModel, dropPosition, dropHandlers) {

          }
        }
      },
      defaults: {
        autoScroll: true
      },
      columns: me.columns || [
        {
          xtype: 'treecolumn',
          flex: 1,
          sortable: false,
          dataIndex: 'text'
        },
        {
          text: UB.i18n('Гранична кількість посад'),
          width: 100,
          dataIndex: 'quantity',
          showIf: () => me.empOrderType === 'ORGSTRUCTURE'
        },
        {
          text: UB.i18n('Керівництво'),
          width: 100,
          dataIndex: 'quantityLead',
          showIf: () => me.empOrderType === 'ORGSTRUCTURE'
        },
        {
          text: UB.i18n('Стан'),
          width: 100,
          dataIndex: 'state'
        },
        {
          text: UB.i18n('Дата початку дії'),
          width: 100,
          sortable: false,
          hidden: true,
          dataIndex: 'dateFrom'
        },
        {
          text: UB.i18n('Дата закінчення дії'),
          width: 100,
          sortable: false,
          hidden: true,
          dataIndex: 'dateTo'
        },
        {
          text: UB.i18n('Наказ'),
          width: 300,
          dataIndex: 'staffOrder',
          showIf: () => me.emporderType !== 'TARIFFING'
        }
      ]
    })

    tree.on('beforeitemdblclick', function (node) {
      let selectForm = this.up('[onSelectNodeHandler]')
      if (selectForm) {
        selectForm.onSelectNodeHandler(me).then(() => this.up('window').close())
      } else {
        this.editNode(node, !me.readOnly)
      }
    }, me)
    tree.on('beforeitemexpand', function (node, opt) {
      const me = this
      const rawNode = me.getRawNode(node)
      if (!node.firstChild) {
        me.appendItems(rawNode.mi_data_id, node)
      }
      if (rawNode.nodeType === 'MORE') {
        node.parentNode.eachChild(function (n) {
          if (n !== node && n.raw.nodeType === 'MORE') {
            n.collapse()
          }
        })
      }
    }, me)
    tree.on('afteritemexpand', function (node, opt) {

    }, me)
    tree.on('afteritemcollapse', me.nodeCollapse, me)
    tree.on('select', function (node) {
      me.setMenuItemsVisibility(tree, node)
      me.enableToolbarItems(true)
      if (_.isFunction(me.onSelectNode)) {
        me.onSelectNode(node, me)
      }
    }, me)
    tree.on('render', function () {
      me.setMenuItemsVisibility(tree, tree.getRootNode())
      me.showToolbar(!me.hideToolbar)
    }, me)
    tree.on('itemcontextmenu', function (view, node, htmlItem, index, e, eOpts) {
      tree.contextMenu && this.contextMenu.showAt(e.getXY())
      me.setMenuItemsVisibility(tree, node)
      e.stopEvent()
    }, tree)
    tree.on('columnresize', (ct) => {
      me.saveState(ct.gridDataColumns || ct.columnManager.columns)
    })
    tree.on('columnmove', (ct) => {
      me.saveState(ct.gridDataColumns || ct.columnManager.columns)
    })
    tree.on('columnhide', (ct) => {
      me.saveState(ct.gridDataColumns || ct.columnManager.columns)
    })
    tree.on('columnshow', (ct) => {
      me.saveState(ct.gridDataColumns || ct.columnManager.columns)
    })

    me.tree = tree
    me.total = 100
    if (me.searchFeature) {
      me.treeSearchControl = Ext.widget('treeSearchControl', {
        xtype: 'treeSearchControl',
        flex: 1,
        staffTreeControl: me
      })
      me.doSearch = function (isSilence) {
        const treeSearchControl = me.treeSearchControl
        const searchText = (me.down('[name=searchText]').getValue() || '').trim()
        const form = me.up('[formCode]')
        let searchMode = me.searchMode || 'FULL'
        if (form) {
          if (form.formCode === 'hr_staffTreeOrg') {
            searchMode = 'ORG'
          }
        }
        if (searchText.length < 4) {
          !isSilence && AC.viewUtils.showToast(UB.i18n('Пошуковий рядок має містити не менше, ніж 4 символи'))
          return
        }
        treeSearchControl.search({
          onDate: me.onDate,
          startID: me.organization || appAC.globalOrganization(),
          search: searchText,
          searchMode: searchMode,
          staffTableID: form.instanceID
        }).then(() => {
          treeSearchControl.show()
          Ext.defer(() => {
            treeSearchControl.down('[name=searchResult]').getView().focus()
          }, 100)
        })
      }
      me.items = [ tree,
        { xtype: 'splitter' },
        me.treeSearchControl
      ]
    } else {
      me.items = [ tree ]
    }
    me.callParent(arguments)

    me.saveState = (columns) => {
      if (!me.stateId || !columns || !columns.length) {
        return
      }
      const settings = []
      columns.forEach(col => {
        if (!me.checkColumn || col.dataIndex !== 'isChecked') {
          settings.push({
            dataIndex: col.dataIndex,
            width: col.width,
            hidden: col.hidden
          })
        }
      })
      UB.core.UBLocalStorageManager.setItem(me.stateId, JSON.stringify(settings))
    }
    me.appendItems(!me.allOrganization ? [me.rootID || me.organization || 0] : null, store.getRootNode())
    me.tree.region = 'center'
    me.setReadOnly = (value) => {
      me.readOnly = value
      me.tree.contextMenu.items.items.forEach(item => {
        if (['addOrgStructure', 'editDepName', 'edit', 'addOrg', 'addDep', 'addPos', 'liquidate', 'restore', 'restoreChanges',
          'copyOrgUnit', 'copyDepTree', 'printOrgPlanUnit', 'joinFundSource'].includes(item.name)) {
          item[value ? 'hide' : 'show']()
        }
      })
    }
    let menuItems = [{
      text: UB.i18n('Редагувати'),
      hidden: me.readOnly,
      name: 'edit',
      iconCls: 'fa fa-pencil',
      handler: function (item) {
        me.editNode(item.parentMenu.contextNode, true)
      }
    },
    {
      text: UB.i18n('Змінити назву підрозділу'),
      hidden: me.readOnly,
      name: 'editDepName',
      iconCls: 'fa fa-pencil-ruler',
      handler: function (item) {
        me.editDepNameMode = true
        me.editNode(item.parentMenu.contextNode, true)
        delete me.editDepNameMode
      }
    },
    {
      text: UB.i18n('Перечитати дочірні'),
      name: 'reload',
      iconCls: 'u-icon-refresh',
      handler: function (item) {
        let node = item.parentMenu.contextNode
        me.reloadNode(node)
      }
    },
    {
      text: UB.i18n('Оновити порядкові номери'),
      name: 'reNumerate',
      iconCls: 'u-icon-digits',
      hidden: true,
      handler: function (item) {
        let node = item.parentMenu.contextNode
        me.reNumerateStaffUnit(node)
      }
    },
    {
      text: UB.i18n('Оновити додаткову інформацію'),
      name: 'updateAddDescription',
      iconCls: 'u-icon-tags',
      hidden: true,
      handler: function (item) {
        let node = item.parentMenu.contextNode
        me.updateAddDescription(node)
      }
    },
    {
      text: UB.i18n('Оновити ФОП посад'),
      name: 'updateAllPosFunds',
      iconCls: 'fas fa-calculator',
      hidden: true,
      handler: function (item) {
        let node = item.parentMenu.contextNode
        me.updateAllPosFunds(node)
      }
    }]
    if (me.isPlan && me.empOrderType !== 'TARIFFING') {
      menuItems.push({
        text: UB.i18n('Підключити зміни зі структури'),
        tooltip: UB.i18n('Підключити зміни зі структури'),
        name: 'addOrgStructure',
        iconCls: 'fa fa-clipboard',
        hidden: me.readOnly,
        handler: function () {
          if (me.addOrgStructure) {
            me.addOrgStructure(me)
          }
        }
      })
    }
    if (me.editOrganization && me.empOrderType !== 'ORGSTRUCTURE') {
      menuItems.push(
        {
          text: UB.i18n('Додати Організацію'),
          name: 'addOrg',
          iconCls: 'fa fa-plus',
          hidden: me.readOnly,
          handler: function () {
            me.addOrg()
          }
        }
      )
    }
    if (me.empOrderType !== 'ORGONLY') {
      menuItems.push({
        text: UB.i18n('Додати підрозділ'),
        tooltip: UB.i18n('Додати підрозділ'),
        name: 'addDep',
        iconCls: 'home-plus-icon',
        hidden: me.readOnly,
        handler: function () {
          me.addDep()
        }
      })
    }
    if (me.empOrderType !== 'ORGONLY') {
      menuItems.push(
        {
          text: UB.i18n('Додати посаду'),
          tooltip: UB.i18n('Додати посаду'),
          name: 'addPos',
          iconCls: 'briefcase-plus-icon',
          hidden: me.readOnly,
          handler: function () {
            me.addPos()
          }
        }
      )
    }
    if (me.empOrderType !== 'ORGONLY') {
      menuItems.push({
        text: UB.i18n('Копіювати'),
        tooltip: UB.i18n('Копіювати'),
        name: 'copyOrgUnit',
        iconCls: 'fa fa-copy',
        hidden: me.readOnly,
        handler: function () {
          // перекрито на події itemcontextmenu
        }
      })
      if (me.isPlan) {
        menuItems.push({
          text: UB.i18n('Копіювати підрозділ (з підпорядкованими)'),
          tooltip: UB.i18n('Копіювати підрозділ (з підпорядкованими)'),
          name: 'copyDepTree',
          iconCls: 'home-with-briefcase-icon',
          hidden: me.readOnly,
          handler: function (item) {
            $App.dialogYesNo('Увага', 'Копіювати нарахування до посад?').then(result => {
              let node = item.parentMenu.contextNode
              const rawNode = me.getRawNode(node)
              me.addDep(rawNode.ID, me.getParentNode(node), { withChilds: true, withAccruals: result })
            })
          }
        })
      }
      if (me.allowJoinFundSource) {
        menuItems.push({
          text: UB.i18n('Об\'єднати джерела фінансування'),
          tooltip: UB.i18n('Об\'єднати джерела фінансування посад'),
          name: 'joinFundSource',
          iconCls: 'fas fa-compress-arrows-alt',
          handler: function () {
            // перекрито на події itemcontextmenu
          }
        })
      }
      menuItems.push({
        text: UB.i18n('Добір осіб (із порівнянням)'),
        tooltip: UB.i18n('Добір осіб (із порівнянням)'),
        name: 'posSearchAndCompare',
        iconCls: 'fa fa-search-plus',
        hidden: true,
        handler: function (item) {
          const node = item.parentMenu.contextNode
          const rawNode = me.getRawNode(node)
          let posID = rawNode.ID
          let searchParams = []
          // Рівень освіти: "Другий (магістерський) рівень вищої освіти"
          UB.Repository('hr_dictEducationLevel')
            .attrs(['ID'])
            .where('code', '=', '11')
            .selectSingle()
            .then(data => {
              if (data) {
                searchParams.push({
                  attribute: 'hr_employeeEducation.dictEducationLevelID',
                  condition: 'equal',
                  value: data.ID
                })
              }
              // Мова: Українська - наявний запис
              return UB.Repository('hr_dictLanguage')
                .attrs(['ID'])
                .where('code', '=', 'uk')
                .selectSingle()
            }).then(data => {
              if (data) {
                searchParams.push({
                  attribute: 'hr_employeeLanguage.dictLanguageID',
                  condition: 'equal',
                  value: data.ID
                })
              }
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_searchEmployee',
                tabId: 'searchEmployee_' + posID,
                customParams: {
                  searchParams: HR.searchUtils.getSearchParams(searchParams),
                  searchAllOrg: true,
                  senderParams: {
                    posID: posID
                  }
                },
                target: $App.getViewport().centralPanel
              })
            })
        }
      })
      menuItems.push({
        text: UB.i18n('Перемістити вище'),
        tooltip: UB.i18n('Перемістити вище на один елемент'),
        name: 'moveNodeUp',
        iconCls: 'fas fa-arrow-up',
        hidden: me.readOnly,
        handler: function (item) {
          me.moveNode(me.getCurrentRecord(), 'up')
        }
      })
      menuItems.push({
        text: UB.i18n('Перемістити нижче'),
        tooltip: UB.i18n('Перемістити нижче на один елемент'),
        name: 'moveNodeDown',
        iconCls: 'fas fa-arrow-down',
        hidden: me.readOnly,
        handler: function (item) {
          me.moveNode(me.getCurrentRecord(), 'down')
        }
      })
    }

    menuItems = menuItems.concat([
      {
        text: UB.i18n('Ліквідувати'),
        tooltip: UB.i18n('Ліквідувати'),
        iconCls: 'fas fa-times-circle',
        name: 'liquidate',
        hidden: me.readOnly,
        handler: function (item) {
          me.liquidateUnit(item.parentMenu.contextNode)
        }
      },
      {
        text: UB.i18n('Відновити ліквідування'),
        tooltip: UB.i18n('Відновити ліквідування'),
        iconCls: 'fa fa-repeat',
        name: 'restore',
        hidden: me.readOnly,
        handler: function (item) {
          me.restoreUnit(item.parentMenu.contextNode)
        }
      },
      {
        text: UB.i18n('Відновити зміни'),
        tooltip: UB.i18n('Відновити зміни'),
        iconCls: 'fa fa-broom',
        name: 'restoreChanges',
        hidden: me.readOnly,
        handler: function (item) {
          me.restoreChanges(item.parentMenu.contextNode)
        }
      }
    ])

    menuItems.push({
      text: UB.i18n('Таблиця змін'),
      tooltip: UB.i18n('Таблиця змін'),
      name: 'printOrgPlanUnit',
      iconCls: 'far fa-file-excel',
      hidden: me.readOnly,
      handler: function (item) {
        const parentForm = me.up('form')
        const node = item.parentMenu.contextNode
        const rawNode = me.getRawNode(node)
        $App.doCommand({
          cmdType: 'showReport',
          tabId: 'report_printOrgPlanUnit' + Date.now(),
          target: $App.getViewport().centralPanel,
          cmdData: {
            reportCode: 'hr_orgplanChangesUnit',
            reportParams: {
              staffTableID: parentForm.instanceID,
              unitID: rawNode.mi_data_id,
              nodeType: rawNode.nodeType,
              onDate: parentForm.record.get('entryDate')
            },
            reportOptions: {
              allowExportToExcel: true,
              isModal: false
            }
          }
        })
      }
    })
    if (me.empOrderType === 'ORGSTRUCTURE') {
      menuItems.push(
        {
          text: UB.i18n('Розрахунок кількості посад для організації'),
          name: 'calcPositionCount',
          iconCls: 'fas fa-calculator',
          cls: 'fill-action',
          hidden: !AC.entityUtils.verifyRightsMethod('hr_staffUnit', 'getPositionCount'),
          handler: function () {
            if (me.calcPositionCount) {
              me.calcPositionCount(me)
            }
          }
        }
      )
    }
    if (me.readOnly && me.allowModifyEntity) {
      menuItems.push({
        text: UB.i18n('Редагувати'),
        tooltip: UB.i18n('Редагувати'),
        iconCls: 'fas fa-pencil-alt',
        name: 'editOrgLite',
        handler: function (item) {
          me.editNode(item.parentMenu.contextNode)
        }
      })
      menuItems.push({
        text: UB.i18n('Додати підрозділ'),
        tooltip: UB.i18n('Додати підрозділ'),
        iconCls: 'home-plus-icon',
        name: 'addDepLite',
        handler: function () {
          me.addDepLite()
        }
      })
      menuItems.push({
        text: UB.i18n('Редагувати підрозділ'),
        tooltip: UB.i18n('Редагувати підрозділ'),
        iconCls: 'fas fa-pencil-alt',
        name: 'editDepLite',
        handler: function (item) {
          me.editNode(item.parentMenu.contextNode)
        }
      })
      menuItems.push({
        text: UB.i18n('Ліквідувати підрозділ'),
        tooltip: UB.i18n('Ліквідувати підрозділ'),
        iconCls: 'fas fa-times-circle',
        name: 'liquidateDep',
        handler: function (item) {
          me.liquidateUnit(item.parentMenu.contextNode)
        }
      })
      menuItems.push({
        text: UB.i18n('Додати посаду'),
        tooltip: UB.i18n('Додати посаду'),
        name: 'addPosLite',
        iconCls: 'briefcase-plus-icon',
        handler: function () {
          me.addPosLite()
        }
      })
      menuItems.push({
        text: UB.i18n('Редагувати посаду'),
        tooltip: UB.i18n('Редагувати посаду'),
        name: 'editPosLite',
        iconCls: 'fas fa-pencil-alt',
        handler: function (item) {
          me.editNode(item.parentMenu.contextNode)
        }
      })
      menuItems.push({
        text: UB.i18n('Ліквідувати посаду'),
        tooltip: UB.i18n('Ліквідувати посаду'),
        iconCls: 'fas fa-times-circle',
        name: 'liquidatePos',
        handler: function (item) {
          me.liquidateUnit(item.parentMenu.contextNode)
        }
      })
    }
    if (me.readOnly && me.allowCreateEmpOrder) {
      menuItems.push({
        text: UB.i18n('Призначити працівника'),
        tooltip: UB.i18n('Призначити працівника'),
        name: 'appointEmployee',
        handler: function (item) {
          me.createEmployeeOrder(item.parentMenu.contextNode, 'APPOINT')
        }
      })
      menuItems.push({
        text: UB.i18n('Звільнити працівника'),
        tooltip: UB.i18n('Звільнити працівника'),
        name: 'dismissEmployee',
        handler: function (item) {
          me.createEmployeeOrder(item.parentMenu.contextNode, 'DISM')
        }
      })
      menuItems.push({
        text: UB.i18n('Перевести працівника'),
        tooltip: UB.i18n('Перевести працівника'),
        name: 'moveEmployee',
        handler: function (item) {
          me.createEmployeeOrder(item.parentMenu.contextNode, 'MOVE')
        }
      })
    }
    menuItems.push({
      text: '?',
      hidden: true,
      name: 'isSecondaryChanges',
      iconCls: 'fas fa-edit'
    })
    if ($App.domainInfo.models.DEV) {
      menuItems.push({
        xtype: 'menuseparator'
      })

      menuItems.push({
        text: UB.i18n('Властивості вузла'),
        name: 'nodeProperty',
        iconCls: 'fa fa-list-alt',
        handler: function (menuItem) {
          let node = tree.contextMenu.contextNode
          if (node && node.lastFocused) {
            node = node.lastFocused
          }
          if (!node) {
            node = me.getCurrentRecord()
          }
          DevUtils.inspect(node)
        }
      })
      menuItems.push({
        text: UB.i18n('Запис'),
        name: 'showRecord',
        iconCls: 'fa fa-list',
        handler: function (menuItem) {
          let node = tree.contextMenu.contextNode
          if (node && node.lastFocused) {
            node = node.lastFocused
          }
          if (!node) {
            node = me.getCurrentRecord()
          }
          if (!node) {
            return
          }
          let entity = me.getEntity(node)
          if (entity) {
            DevUtils.showRecord(entity, node.raw.ID, '', { customTitle: node.raw.text + ' ' + entity })
          }
        }
      })
    }
    tree.contextMenu = new Ext.menu.Menu({
      items: menuItems
    })
    me.tree.columns.forEach(item => {
      if (item.showIf) {
        if (!item.showIf(me)) {
          item.hide()
        }
      }
    })
    if (me.stateId) {
      const settings = JSON.parse(UB.core.UBLocalStorageManager.getItem(me.stateId) || '[]')
      if (settings.length) {
        settings.forEach(col => {
          const findColumn = me.tree.columns.find(o => o.dataIndex === col.dataIndex)
          if (findColumn && !findColumn.init) {
            findColumn.init = true
            if (col.width) {
              delete findColumn.flex
              findColumn.width = col.width
            }
          }
        })
      }
    }

    me.initToolbarItems()
    me.getEntity = function (node) {
      if (!node) {
        return null
      }
      if (node.raw.mi_unityEntity) {
        return node.raw.mi_unityEntity
      }
      switch (node.raw.nodeType) {
        case 'DEPUNIT': return 'hr_department'
        case 'POSUNIT': return 'hr_position'
        case 'ORGUNIT': return 'hr_organization'
        default: return null
      }
    }
    me.moveNode = function (node, direction) {
      node = node || me.getCurrentRecord()
      if (!node) {
        return
      }
      direction = direction.toLowerCase()
      const targetNode = direction === 'up' ? node.previousSibling : node.nextSibling
      const parentNode = me.getParentNode(node)
      if (!targetNode || !parentNode) {
        return
      }
      const raw = me.getRawNode(node)
      let idxNum = 0
      let pNode
      let delta = 0
      if (direction === 'up') {
        pNode = targetNode.previousSibling
        if (pNode) {
          delta = Math.ceil((targetNode.raw.idxNum - pNode.raw.idxNum) / 2)
          if (delta === 0) {
            delta = Math.ceil(targetNode.raw.idxNum / 2)
          }
          idxNum = targetNode.raw.idxNum - (delta || 1)
        }
      } else {
        pNode = targetNode.nextSibling
        if (pNode) {
          delta = Math.ceil((pNode.raw.idxNum - targetNode.raw.idxNum) / 2)
          idxNum = targetNode.raw.idxNum + (delta || 1)
        } else {
          idxNum = targetNode.raw.idxNum + 100
        }
      }

      if (idxNum === 0) {
        idxNum = direction === 'up' ? targetNode.raw.idxNum - 1 : targetNode.raw.idxNum + (targetNode.nextSibling ? 1 : 100)
      }

      const parentForm = me.up('form')
      const onDate = AC.dateService.truncTimeToUtcNull(parentForm.record.get('entryDate'))
      if (['ACTIVE', 'NEW'].includes(node.raw.stateCode)) {
        tree.up().setLoading(UB.i18n('Переміщення... '))
      }
      let promise
      if (node.raw.stateCode === 'ACTIVE') {
        promise = $App.connection.run({
          entity: 'hr_staffUnit',
          method: 'createNewVersion',
          ID: raw.ID,
          onDate: onDate,
          attrsToChange: {
            idxNum: idxNum,
            staffOrderID: parentForm.record.get('ID'),
            isSecondaryChanges: 1
          }
        })
      } else {
        promise = $App.connection.run({
          entity: me.getEntity(node),
          method: 'update',
          __skipOptimisticLock: true,
          execParams: {
            ID: node.raw.ID,
            idxNum: idxNum,
            isSecondaryChanges: (raw.isSecondaryChanges === '') ? 1 : raw.isSecondaryChanges
          }
        })
      }
      promise.then(mParams => {
        const reco = mParams.record
        if (reco) { // Зробили версію
          node.data.ID = node.raw.ID = reco.ID
          node.data.stateCode = node.raw.stateCode = reco.state
          node.set('cls', 'org-nodechanged')
          node.raw.dateFrom = node.data.dateFrom = Ext.Date.format(onDate, 'd.m.Y')
          node.raw.isSecondaryChanges = (raw.isSecondaryChanges === '') ? 1 : raw.isSecondaryChanges
          node.data.state = node.raw.state = UB.i18n('Змінено')
        }
        node.raw.idxNum = idxNum
        if (direction === 'up') {
          parentNode.insertBefore(node, targetNode)
        } else {
          parentNode.insertBefore(node, targetNode.nextSibling)
        }
        me.reloadNode(parentNode)
        tree.up().setLoading(false)
      }).catch(e => {
        tree.up().setLoading(false)
        AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
      })
    }
    me.addOrg = function () {
      let n = me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      me.addItem(n, 'hr_organization')
    }
    me.addDep = function (sourceID, parentNode, options = {}) {
      let n = parentNode || me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      if (sourceID) {
        me.sourceID = sourceID
      }
      let parentConfig = {}
      me.addItem(n, 'hr_department', parentConfig, options)
    }
    me.addDepLite = function (sourceID, parentNode, options = {}) {
      let n = parentNode || me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      me.addItemLite(n, 'hr_department')
    }
    me.addPos = function (sourceID, parentNode) {
      let n = parentNode || me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      if (sourceID) {
        me.sourceID = sourceID
      }
      me.addItem(n, 'hr_position')
    }
    me.addPosLite = function (sourceID, parentNode) {
      let n = parentNode || me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      if (sourceID) {
        me.sourceID = sourceID
      }
      me.addItemLite(n, 'hr_position')
    }
    me.copyPos = function (sourceID, parentNode) {
      let n = parentNode || me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      const parentForm = me.up('form')
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_staffTreeCopyPosParams',
        sender: me,
        parentNode: n,
        cmpInitConfig: {
          defaultValues: {
            sourceID: sourceID,
            staffTableID: parentForm.instanceID,
            onDate: parentForm.record.get('entryDate'),
            parentID: n.get('mi_data_id'),
            rootID: me.rootID,
            orgID: parentForm.record.get('orgID')
          }
        }
      })
    }
    me.joinFundSource = function (targetID, parentNode) {
      let n = parentNode || me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_staffTreeJoinFundSource',
        sender: me,
        cmpInitConfig: {
          parentNode: n,
          defaultValues: {
            targetID: targetID,
            parentID: n.get('mi_data_id')
          }
        }
      })
    }
    me.liquidateUnit = function (node, edit) {
      const recordData = me.getCurrentRecord().getData()
      if (!recordData.ID || recordData.liquidate || (!me.editOrganization && me.orgIDs.includes(recordData.mi_data_id))) {
        return
      }
      let nodeType = me.getCurrentRecord().raw.nodeType
      let dialogMsg = nodeType === 'POSUNIT' ? UB.i18n(`Ліквідувати {0}?`, recordData.text) : UB.i18n(`Ліквідувати {0}, та всі підпорядковані організаційні одиниці?`, recordData.text)
      const parentNode = me.getCurrentRecord().parentNode
      $App.dialogYesNo('Попередження', dialogMsg)
        .then(function (choice) {
          if (choice) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_staffUnit',
              method: me.allowModifyEntity ? 'liquidateLite' : 'liquidate',
              instanceID: recordData.ID,
              onDate: me.onDate,
              orderID: me.orderID,
              empOrderType: me.empOrderType
            }).then(() => {
              me.reloadNode(parentNode)
            }).finally(() => {
              me.setLoading(false)
            })
          }
        })
    }
    me.restoreUnit = function (node, edit) {
      const recordData = me.getCurrentRecord().getData()
      if ((!recordData.ID || !recordData.liquidate) && recordData.stateCode !== 'NEW') {
        return
      }
      const parentNode = me.getCurrentRecord().parentNode
      if (parentNode.getData().liquidate) {
        $App.dialogInfo(UB.i18n(`Необхідно спочатку відновити {0}`, parentNode.getData().text))
        return
      }
      $App.dialogYesNo('Попередження', UB.i18n(`Відновити {0}, та всі підпорядковані організаційні одиниці?`, recordData.text))
        .then(function (choice) {
          if (choice) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_staffUnit',
              method: 'restore',
              instanceID: recordData.ID,
              onDate: me.onDate,
              orderID: me.orderID
            }).then(() => {
              me.reloadNode(parentNode)
            }).finally(() => {
              me.setLoading(false)
            })
          }
        })
    }
    me.restoreChanges = function (node, edit) {
      const recordData = me.getCurrentRecord().getData()
      if ((!recordData.ID || !recordData.liquidate) && recordData.stateCode !== 'NEW') {
        return
      }
      const parentNode = me.getCurrentRecord().parentNode
      $App.dialogYesNo('Попередження', UB.i18n(`Відновити {0}?`, recordData.text))
        .then(function (choice) {
          if (choice) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_staffUnit',
              method: 'restoreChanges',
              instanceID: recordData.ID,
              onDate: me.onDate,
              orderID: me.orderID
            }).then(() => {
              me.reloadNode(parentNode)
            }).finally(() => {
              me.setLoading(false)
            })
          }
        })
    }
    me.reNumerateStaffUnit = function (node) {
      const recordData = me.getCurrentRecord().getData()
      if (!recordData.ID) {
        return
      }
      $App.dialogYesNo('Попередження', UB.i18n('Оновити порядкові номери?'))
        .then(function (choice) {
          if (choice) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_staffUnit',
              method: 'reNumerateStaffUnit',
              parentUnitID: recordData.ID,
              orgID: appAC.globalOrganization(),
              onDate: me.onDate,
              orderID: me.orderID
            }).then(() => {
              me.reloadNode(node)
            }).finally(() => {
              me.setLoading(false)
            })
          }
        })
    }
    me.updateAddDescription = function (node) {
      const recordData = me.getCurrentRecord().getData()
      if (!recordData.ID) {
        return
      }
      $App.dialogYesNo('Попередження', UB.i18n('Оновити додаткову інформацію?'))
        .then(function (choice) {
          if (choice) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_position',
              method: 'updateAllPosAddDescription',
              orgID: appAC.globalOrganization(),
              onDate: me.onDate
            }).then(() => {
              me.reloadNode(node)
            }).finally(() => {
              me.setLoading(false)
            })
          }
        })
    }
    me.updateAllPosFunds = function (node) {
      const recordData = me.getCurrentRecord().getData()
      if (!recordData.ID) {
        return
      }
      $App.dialogYesNo('Попередження', UB.i18n('Буде виконано оновлення розрахункових значень нарахувань та суми посади на Дату початку дії зрізу посад. Оновити ФОП посад?'))
        .then(function (choice) {
          if (choice) {
            me.setLoading(true)
            $App.connection.run({
              entity: 'hr_position',
              method: 'updateAllPosFunds',
              orgID: appAC.globalOrganization(),
              onDate: me.onDate
            }).then(() => {
              me.reloadNode(node)
            }).finally(() => {
              me.setLoading(false)
            })
          }
        })
    }
    me.reloadNode = function (node) {
      if (node && !node.isRoot) {
        node = node.lastSelected
      }
      if (node && !node.isRoot()) {
        node.collapse()
        me.freeChild(node)
        node.set('leaf', false)
        node.expand()
        me.refreshNodeQuantity(node)
        me.selectNode(node)
      } else {
        const rootNode = me.tree.getRootNode()
        if (rootNode) {
          me.clearTree(rootNode)
          me.appendItems(me.rootID ? [me.rootID] : (me.orgIDs.length ? me.orgIDs : [appAC.globalOrganization()]), rootNode)
          me.selectNode(rootNode)
        }
      }
    }

    me.refreshNodeQuantity = function (node) {
      const resultItem = Object.assign({}, node.raw)
      HR.treeUtils.getDepartmentPosCount({
        dataItem: resultItem,
        onDate: me.onDate,
        empOrderType: 'NOTHING',
        dictFundSourceID: me.dictFundSourceID,
        orderID: me.orderID
      }).then(newItem => {
        node.set('quantity', newItem.posCount || '')
      })
    }

    me.editNode = function (node, edit) {
      const me = this
      const recordData = me.getCurrentRecord().raw
      const parentNode = me.getCurrentRecord().parentNode
      const editDepNameMode = me.editDepNameMode
      delete me.editDepNameMode

      function afterNodeEdit () {
        me.reloadNode(parentNode)
      }

      if (!me.sender) {
        let entityForm
        let instanceID = recordData.ID
        switch (recordData.nodeType) {
          case 'ORGUNIT':
          {
            entityForm = 'hr_organization'
            if (edit && recordData.stateCode !== 'NEW' && me.editOrganization) {
              HR.treeUtils.checkFutureVersion(recordData.ID, recordData['mi_data_id'], me.onDate).then(result => {
                if (result) {
                  HR.treeUtils.newVersionOrg(recordData.ID, me.orderID, me.onDate, afterNodeEdit)
                }
              })
              return
            }
            break
          }
          case 'DEPUNIT':
          {
            entityForm = 'hr_department'
            if (edit && recordData.stateCode !== 'NEW') {
              HR.treeUtils.checkFutureVersion(recordData.ID, recordData['mi_data_id'], me.onDate).then(result => {
                if (result) {
                  HR.treeUtils.newVersionDep(recordData.ID, me.orderID, me.onDate, afterNodeEdit, {
                    rootID: me.rootID,
                    isNameOnly: editDepNameMode
                  })
                }
              })
              return
            }
            break
          }
          case 'POSUNIT':
          {
            entityForm = 'hr_position'
            if (edit && recordData.stateCode !== 'NEW') {
              HR.treeUtils.checkFutureVersion(recordData.ID, recordData['mi_data_id'], me.onDate).then(result => {
                if (result) {
                  HR.treeUtils.newVersionPos(recordData.ID, me.orderID, me.onDate, afterNodeEdit, {
                    rootID: me.rootID
                  })
                }
              })
              return
            }
            break
          }
          case 'EMPUNIT':
          {
            if (AC.entityUtils.verifyRightsMethod('hr_employee', 'view')) {
              entityForm = 'hr_employee'
              instanceID = recordData.employeeID
            }
            break
          }
        }
        if (!entityForm) {
          return
        }

        const config = {
          cmdType: 'showForm',
          formCode: entityForm,
          entity: entityForm,
          instanceID: instanceID,
          sender: me,
          __mip_ondate: false,
          cmpInitConfig: {
            isDirectCreate: me.allowModifyEntity,
            employeeNumberID: recordData.employeeNumberID || null,
            afterClose: afterNodeEdit
          },
          customParams: {
            rootID: me.rootID || appAC.globalOrganization()
          }
        }
        if (me.orderState && me.orderState !== 'PROJECT') {
          config.cmpInitConfig.customSettings = {
            readOnly: true
          }
        }

        $App.doCommand(config)
      } else {
        me.sender.treePosWin = me.up('window')
        me.up('window').closeAction = 'hide'
        const form = me.sender
        if (me.customParams && me.customParams.selectType && !_.contains(me.customParams.selectType, recordData.nodeType)) {
          return
        }
        form && form.setPosFromTree && form.setPosFromTree(recordData)
        me.up('window').close()
      }
    }
  },

  createEmployeeOrder (node, empOrderType) {
    const me = this
    const recordData = me.getCurrentRecord().getData()
    const createOrderDetail = function () {
      const formOrder = this
      formOrder.un('recordloaded', createOrderDetail)
      if (empOrderType === 'APPOINT') {
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hr_empOrderAppointDet',
          sender: formOrder.query('[paraGrid=true]')[0],
          isModal: true,
          customParams: {
            isGroup: false,
            empOrderType
          },
          cmpInitConfig: {
            beforeRender: function () {
              const form = this
              form.on('formDataReadyFinished', function () {
                if (this.isNewInstance) {
                  const depCtrl = this.down('[name=departmentID]')
                  if (depCtrl) this.onControlChanged(depCtrl)
                  const posCtrl = this.down('[name=positionID]')
                  if (posCtrl) this.onControlChanged(posCtrl)
                }
              })
            }
          },
          initialFieldValues: {
            departmentID: node && node.parentNode ? node.parentNode.get('ID') : null,
            positionID: recordData['ID']
          }
        })
      }
      if (empOrderType === 'DISM') {
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hr_empOrderDismDet',
          sender: formOrder.query('[paraGrid=true]')[0],
          isModal: true,
          customParams: {
            isGroup: false,
            empOrderType
          },
          cmpInitConfig: {
            beforeRender: function () {
              const form = this
              form.on('formDataReadyFinished', function () {
                const ctrl = this.down('[name=employeePositionID]')
                if (ctrl) this.onControlChanged(ctrl)
              })
            }
          },
          initialFieldValues: {
            employeePositionID: recordData['ID']
          }
        })
      }
      if (empOrderType === 'MOVE') {
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hr_empOrderMoveDet',
          sender: formOrder.query('[paraGrid=true]')[0],
          isModal: true,
          customParams: {
            isGroup: false,
            empOrderType
          },
          cmpInitConfig: {
            beforeRender: function () {
              const form = this
              form.on('formDataReadyFinished', function () {
                if (this.isNewInstance) {
                  const ctrl = this.down('[name=employeePositionID]')
                  if (ctrl) {
                    ctrl.setValueById(recordData['ID'])
                  }
                }
              })
            }
          }
        })
      }
    }
    $App.connection.run({
      entity: 'hr_staffUnit',
      method: 'createEmployeeOrder',
      empOrderType,
      organizationID: appAC.globalOrganization(),
      onDate: appAC.globalApplicationDate()
    }).then(mParams => {
      if (mParams.orderID) {
        const commandConfig = {
          formCode: 'hr_empOrder',
          entity: 'hr_empOrder',
          cmdType: 'showForm',
          instanceID: mParams.orderID,
          sender: me,
          cmpInitConfig: {
            initComponentStart () {
              const formOrder = this
              formOrder.on('recordloaded', createOrderDetail)
            }
          }
        }
        $App.doCommand(commandConfig)
      }
      /*
      positionID: node.get('mi_data_id'),
      employeePositionID: empOrderType === 'APPOINT' ? null : recordData.get('ID')
      $App.doCommand({
        cmdType: 'showForm',
        entity: 'hr_empOrderAppointDet',
        sender: me,
        instanceID: mParams.orderID,
        customParams: {
          isGroup: false,
          empOrderType
        }
      })
      */
    })
  },

  setMenuItemsVisibility (tree, node) {
    const me = this
    const contextMenu = tree.contextMenu
    const raw = me.getRawNode(node)
    if (!raw) {
      return
    }
    contextMenu.contextNode = node
    let copyOrgUnitItem = contextMenu.down('[name=copyOrgUnit]')
    let joinFundSourceItem = contextMenu.down('[name=joinFundSource]')
    let addPosItem = contextMenu.down('[name=addPos]')
    let addDepItem = contextMenu.down('[name=addDep]')
    let editDepName = contextMenu.down('[name=editDepName]')
    let reNumerateItem = contextMenu.down('[name=reNumerate]')
    let updateAddDescItem = contextMenu.down('[name=updateAddDescription]')
    let updateFundsItem = contextMenu.down('[name=updateAllPosFunds]')
    // let isSecondaryChanges = contextMenu.down('[name=isSecondaryChanges]')
    const form = me.up('form')
    let isSecondaryChanges = null
    if (form) {
      let tb = me.up('form').down('toolbar')
      const allActions = tb && tb.query('[menuId=AllActions]')[0]
      isSecondaryChanges = allActions && allActions.down('[name=isSecondaryChanges]')
      if (isSecondaryChanges) {
        isSecondaryChanges.setVisible(['DEPUNIT', 'POSUNIT'].includes(raw.nodeType))
        isSecondaryChanges.setText(raw.isSecondaryChanges === '' ? UB.i18n('Невідомі зміни') : raw.isSecondaryChanges ? UB.i18n('Неосновні зміни') : UB.i18n('Основні зміни'))
      }
    }

    if (reNumerateItem) {
      reNumerateItem.setVisible(raw.nodeType === 'ORGUNIT')
    }
    if (updateAddDescItem && AC.entityUtils.verifyRightsMethod('hr_position', 'updateAllPosAddDescription')) {
      updateAddDescItem.setVisible(raw.nodeType === 'ORGUNIT')
    }
    if (updateFundsItem && AC.entityUtils.verifyRightsMethod('hr_position', 'updateAllPosFunds')) {
      updateFundsItem.setVisible(raw.nodeType === 'ORGUNIT')
    }
    if (addPosItem) {
      addPosItem.hide()
      if ((me.empOrderType !== 'ORGSTRUCTURE' && me.empOrderType !== 'ORGONLY') || raw.nodeType === 'ORGUNIT') {
        addPosItem.setVisible(!me.readOnly)
      }
    }
    const allowLinkToPos = AC.settings.get('hrStaffTableDisallowLinkToPos') === false
    if (raw.mi_unityEntity === 'hr_position' && !allowLinkToPos) {
      addPosItem && addPosItem.setVisible(false)
      addDepItem && addDepItem.setVisible(false)
    } else {
      addDepItem && addDepItem.setVisible(!me.readOnly)
    }
    if (copyOrgUnitItem && !me.readOnly) {
      if (raw.nodeType === 'DEPUNIT') {
        // copyOrgUnitItem.setText('Копіювати підрозділ')
        copyOrgUnitItem.show()
        copyOrgUnitItem.handler = function () {
          me.addDep(raw.ID, me.getParentNode(node))
        }
      } else if (raw.nodeType === 'POSUNIT') {
        // copyOrgUnitItem.setText('Копіювати посаду')
        copyOrgUnitItem.handler = function () {
          me.copyPos(raw.ID, me.getParentNode(node))
        }
        if (!AC.entityUtils.verifyRightsMethod('hr_position', 'copyPosition')) {
          copyOrgUnitItem.hide()
        } else {
          copyOrgUnitItem.show()
        }
      } else {
        copyOrgUnitItem.hide()
      }
    }
    if (joinFundSourceItem && me.allowJoinFundSource) {
      if (raw.nodeType === 'POSUNIT') {
        joinFundSourceItem.handler = function () {
          me.joinFundSource(raw.ID, me.getParentNode(node))
        }
        if (!AC.entityUtils.verifyRightsMethod('hr_position', 'joinPositionFundSource')) {
          joinFundSourceItem.hide()
        } else {
          joinFundSourceItem.show()
        }
      } else {
        joinFundSourceItem.hide()
      }
    }
    let copyDepTreeItem = contextMenu.down('[name=copyDepTree]')
    if (copyDepTreeItem) {
      if (raw.nodeType === 'DEPUNIT' && !me.readOnly) {
        copyDepTreeItem.show()
      } else {
        copyDepTreeItem.hide()
      }
    }
    if (editDepName) {
      editDepName.setVisible(raw.nodeType === 'DEPUNIT' && !me.readOnly)
    }
    let searchItem = contextMenu.down('[name=posSearchAndCompare]')
    if (searchItem && !me.isPlan && me.empOrderType !== 'ORGSTRUCTURE' && me.empOrderType !== 'TARIFFING') {
      if (raw.nodeType === 'POSUNIT') {
        searchItem.show()
      } else {
        searchItem.hide()
      }
    }
    const isOrgOrEmpType = ['ORGUNIT', 'EMPUNIT'].includes(raw.nodeType)
    const isEnabledForOrgOnly = !me.readOnly && me.empOrderType === 'ORGONLY'
    const isEnabledForOrgOrEmp = !me.readOnly && !isOrgOrEmpType
    let liquidateItem = contextMenu.down('[name=liquidate]')
    if (liquidateItem) {
      liquidateItem.setVisible(isEnabledForOrgOrEmp || isEnabledForOrgOnly)
    }
    let restoreItem = contextMenu.down('[name=restore]')
    if (restoreItem) {
      restoreItem.setVisible(isEnabledForOrgOrEmp || isEnabledForOrgOnly)
    }
    let restoreChangesItem = contextMenu.down('[name=restoreChanges]')
    if (restoreChangesItem) {
      restoreChangesItem.setVisible(isEnabledForOrgOrEmp || isEnabledForOrgOnly)
    }
    let moveNodeUpItem = contextMenu.down('[name=moveNodeUp]')
    if (moveNodeUpItem) {
      moveNodeUpItem.setVisible(isEnabledForOrgOrEmp)
    }
    let moveNodeDownItem = contextMenu.down('[name=moveNodeDown]')
    if (moveNodeDownItem) {
      moveNodeDownItem.setVisible(isEnabledForOrgOrEmp)
    }

    const printOrgPlanUnit = contextMenu.down('[name=printOrgPlanUnit]')
    if (printOrgPlanUnit) {
      if (!me.readOnly && (raw.nodeType === 'DEPUNIT' || raw.nodeType === 'POSUNIT')) {
        printOrgPlanUnit.show()
      } else {
        printOrgPlanUnit.hide()
      }
    }
    if (me.allowModifyEntity) {
      const editOrgLiteItem = contextMenu.down('[name=editOrgLite]')
      const addDepLiteItem = contextMenu.down('[name=addDepLite]')
      const addPosLiteItem = contextMenu.down('[name=addPosLite]')
      const editDepLiteItem = contextMenu.down('[name=editDepLite]')
      const editPosLiteItem = contextMenu.down('[name=editPosLite]')
      const liquidatePosItem = contextMenu.down('[name=liquidatePos]')
      const liquidateDepItem = contextMenu.down('[name=liquidateDep]')
      editOrgLiteItem && editOrgLiteItem[raw.nodeType === 'ORGUNIT' ? 'show' : 'hide']()
      addDepLiteItem && addDepLiteItem[raw.nodeType === 'DEPUNIT' || raw.nodeType === 'ORGUNIT' ? 'show' : 'hide']()
      editDepLiteItem && editDepLiteItem[raw.nodeType === 'DEPUNIT' ? 'show' : 'hide']()
      liquidateDepItem && liquidateDepItem[raw.nodeType === 'DEPUNIT' ? 'show' : 'hide']()
      addPosLiteItem && addPosLiteItem[raw.nodeType === 'DEPUNIT' || raw.nodeType === 'ORGUNIT' ? 'show' : 'hide']()
      editPosLiteItem && editPosLiteItem[raw.nodeType === 'POSUNIT' ? 'show' : 'hide']()
      liquidatePosItem && liquidatePosItem[raw.nodeType === 'POSUNIT' ? 'show' : 'hide']()
    }
    if (me.allowCreateEmpOrder) {
      const appointEmployeeItem = contextMenu.down('[name=appointEmployee]')
      const dismissEmployeeItem = contextMenu.down('[name=dismissEmployee]')
      const moveEmployeeItem = contextMenu.down('[name=moveEmployee]')
      appointEmployeeItem && appointEmployeeItem[raw.nodeType === 'POSUNIT' ? 'show' : 'hide']()
      dismissEmployeeItem && dismissEmployeeItem[raw.nodeType === 'EMPUNIT' ? 'show' : 'hide']()
      moveEmployeeItem && moveEmployeeItem[raw.nodeType === 'EMPUNIT' ? 'show' : 'hide']()
    }
  },

  getRawNode (node) {
    return node.raw || (node.lastSelected && node.lastSelected.raw)
  },

  getParentNode: function (node) {
    return node.parentNode || (node.lastSelected && node.lastSelected.parentNode)
  },

  initToolbarItems () {
    const me = this
    const tree = me.tree
    const toolbar = me.dockedItems.items[0]
    if (me.hideToolbar) {
      toolbar.hide()
    } else {
      me.menuToDockedItems(tree.contextMenu.items, toolbar.items, { hideText: true })
      me.enableToolbarItems(false)
    }
  },

  menuToDockedItems (menuItems, dockedItems, cfg) {
    for (let i = 0; i < menuItems.items.length; i++) {
      let menuItem = menuItems.items[i]
      let itemName = menuItem.name
      let dockedItem = dockedItems.items.find(item => item.name === itemName)
      if (dockedItem) {
        dockedItem.hidden = menuItem.hidden
        if (menuItem.iconCls) {
          dockedItem.iconCls = menuItem.iconCls
        }
        if (menuItem.cls) {
          dockedItem.cls = menuItem.cls
        }
        if (menuItem.text) {
          if (!cfg.hideText || dockedItem.showText) {
            dockedItem.text = menuItem.text
          }
        }
        dockedItem.tooltip = menuItem.tooltip || menuItem.text
        if (menuItem.emptyText) {
          dockedItem.emptyText = menuItem.emptyText
        }
        if (menuItem.handler) {
          dockedItem.handler = function () {
            !menuItem.hidden && menuItem.handler(menuItem)
          }
        }
      }
    }
  },

  showToolbar (toShow) {
    const me = this
    const toolbar = me.down('toolbar')
    toShow = (toShow !== undefined) ? toShow : me.isEditMode
    if (toShow) {
      toolbar.show()
    } else {
      toolbar.hide()
    }
  },

  enableToolbarItems (showTreeItems = true) {
    const me = this
    const tree = me.tree
    const toolbar = me.dockedItems.items[0]
    if (showTreeItems) {
      me.enableMenuToDockItems(tree.contextMenu.items, toolbar.items, { hideText: true })
    } else {
      me.enableTreeDockedItems(toolbar.items)
    }
    me.enableSearchDockedItems(toolbar.items)
    me.enableFundSourceDockedItems(toolbar.items)
  },

  enableMenuToDockItems (menuItems, dockedItems) {
    for (let i = 0; i < menuItems.items.length; i++) {
      let menuItem = menuItems.items[i]
      let itemName = menuItem.name
      let dockedItem = itemName && dockedItems.items.find(item => item.name === itemName)
      if (dockedItem) {
        if (menuItem.hidden) {
          dockedItem.disable()
        } else {
          dockedItem.enable()
        }
      }
    }
  },

  enableTreeDockedItems (dockedItems) {
    for (let i = 0; i < dockedItems.items.length; i++) {
      let dockedItem = dockedItems.items[i]
      if (dockedItem) {
        if (dockedItem.disabled) {
          dockedItem.disable()
        } else {
          dockedItem.enable()
        }
      }
    }
  },

  enableSearchDockedItems (dockedItems) {
    const me = this
    for (let i = 0; i < dockedItems.items.length; i++) {
      let dockedItem = dockedItems.items[i]
      if (dockedItem && dockedItem.name.startsWith('search')) {
        if (me.searchFeature) {
          dockedItem.show()
        } else {
          dockedItem.hide()
        }
      }
    }
  },

  enableFundSourceDockedItems (dockedItems) {
    const me = this
    for (let i = 0; i < dockedItems.items.length; i++) {
      let dockedItem = dockedItems.items[i]
      if (dockedItem && dockedItem.name.startsWith('dictFundSource')) {
        const dockedStub = dockedItems.find(o => o.name.startsWith('componentStub'))
        const dockedCheckHide = dockedItems.find(o => o.name.startsWith('showAllPos'))
        if (me.filterByFundSource) {
          dockedItem.show()
          dockedStub && dockedStub.hide()
          dockedCheckHide && dockedCheckHide.show()
        } else {
          dockedItem.hide()
          dockedStub && dockedStub.show()
          dockedCheckHide && dockedCheckHide.hide()
        }
      }
    }
  },

  addItem: function (parentNode, entityName, parentConfig = {}, options = {}) {
    const me = this
    const defaultValues = {}
    const sourceID = me.sourceID
    delete me.sourceID
    let promise
    defaultValues.parentUnitID = parentNode && parentNode.get('mi_data_id') ? parentNode.get('mi_data_id') : null
    defaultValues.rootID = me.rootID || (entityName !== 'hr_organization' ? appAC.globalOrganization() : null)
    if (me.orderID) {
      defaultValues.staffOrderID = me.orderID
      defaultValues['staffOrderID.entryDate'] = me.onDate
      defaultValues.mi_dateFrom = me.onDate
    }
    let attrsToCopy
    if (sourceID) {
      if (entityName === 'hr_department') {
        attrsToCopy = [
          'code',
          'name',
          'fullName',
          'parentUnitID',
          'dictDepTypeID',
          'departmentKindID',
          'nameNom',
          'nameGen',
          'nameDat',
          'nameAcc',
          'nameOr',
          'nameLoc',
          'nameVoc',
          'fullNameNom',
          'fullNameGen',
          'fullNameDat',
          'fullNameAcc',
          'fullNameOr',
          'fullNameLoc',
          'fullNameVoc',
          'quantity',
          'quantityLead',
          'excludeNameInPos',
          'positionChiefID',
          'employeeChiefID',
          'curatorID'
        ]
      } else if (entityName === 'hr_position') {
        attrsToCopy = [
          'positionType',
          'dictPositionID',
          'code',
          'name',
          'fullName',
          'parentUnitID',
          'positionCategory',
          'dictStaffCatID',
          'dictStaffSubCatID',
          'dictWagePayID',
          'psCategory',
          'dictStatePayID',
          'dictFundSourceID',
          'payElID',
          'nameNom',
          'nameGen',
          'nameDat',
          'nameAcc',
          'nameOr',
          'nameLoc',
          'nameVoc',
          'fullNameNom',
          'fullNameGen',
          'fullNameDat',
          'fullNameAcc',
          'fullNameOr',
          'fullNameLoc',
          'fullNameVoc',
          'accrualSum',
          'quantity',
          'personalType',
          'psCategory',
          'payElID',
          'isOrgBoss',
          'dictCostTypeID',
          'dictSalarySchemeLevelID',
          'paymentType',
          'dictTarifCoeffID',
          'dictMilitaryRankID',
          'dictMilitarySpecialityID',
          'dictSpecialtyID',
          'dictEmpCategoryID',
          'dictAcademStatusID',
          'comment'
        ]
      } else {
        attrsToCopy = []
      }
      if (attrsToCopy.length) {
        promise = UB.Repository(entityName).attrs(attrsToCopy.concat(['mi_data_id', 'mi_treePath'])).selectById(sourceID)
      }
    }
    if (!promise) {
      promise = Promise.resolve(null)
    }
    promise.then(data => {
      if (data) {
        attrsToCopy.forEach(item => {
          defaultValues[item] = data[item]
        })
      }
      if (entityName === 'hr_department' && me.rootID && options.withChilds) {
        defaultValues.parentUnitID = me.rootID
      }
      let config = {
        cmdType: 'showForm',
        formCode: entityName,
        entity: entityName,
        parentConfig: parentConfig,
        cmpInitConfig: {
          defaultValues: defaultValues,
          afterClose: _.isFunction(options.onAfterClose) ? options.onAfterClose : () => {
            me.reloadNode(parentNode)
          },
          onCustomSave: (form) => {
            if (options.withChilds && !form.isDepTreeCopied) {
              form.isDepTreeCopied = true
              const parentForm = me.up('form')
              if (parentForm && (parentForm.formCode === 'hr_staffTable' || parentForm.formCode === 'hr_staffTariffing')) {
                let staffTableID = parentForm.instanceID
                let onDate = AC.dateService.shiftDate(parentForm.record.get('entryDate'))
                $App.connection.run({
                  entity: 'hr_staffUnit',
                  method: 'copyUnitTree',
                  sourceID: sourceID,
                  sourceDataID: data.mi_data_id,
                  newDeptID: form.record.get('mi_data_id'),
                  treePath: data.mi_treePath,
                  onDate: onDate,
                  staffTableID: staffTableID,
                  instanceID: form.instanceID,
                  withAccruals: options.withAccruals
                }).then(function (result) {
                  if (result) {
                    me.reloadNode(parentNode)
                  }
                })
              }
            }
          }
        },
        isModal: true,
        sender: me
      }
      $App.doCommand(config)
    })
  },

  addItemLite: function (parentNode, entityName) {
    const me = this
    const defaultValues = {}
    defaultValues.parentUnitID = parentNode && parentNode.get('mi_data_id') ? parentNode.get('mi_data_id') : null
    defaultValues.rootID = me.rootID || (entityName !== 'hr_organization' ? appAC.globalOrganization() : null)
    defaultValues.mi_dateFrom = (parentNode ? parentNode.get('mi_dateFrom') || parentNode.raw.mi_dateFrom : appAC.globalApplicationDate()) || appAC.globalApplicationDate()
    defaultValues.state = 'ACTIVE'
    $App.doCommand({
      cmdType: 'showForm',
      formCode: entityName,
      entity: entityName,
      cmpInitConfig: {
        defaultValues: defaultValues,
        afterClose: () => {
          me.reloadNode(parentNode)
        },
        isModal: true,
        isDirectCreate: true,
        sender: me
      }
    })
  },

  getCurrentRecord: function () {
    let selectedNode
    const me = this
    if (me.tree.getSelectionModel().hasSelection()) {
      selectedNode = me.tree.getSelectionModel().getSelection()
      if (selectedNode) {
        return selectedNode[0]
      }
    }
    return null
  },

  nodeCollapse: function (node, opt) {

  },

  freeChild: function (node) {
    node.removeAll()
  },

  /**
   * @param {Number|null} parentID
   * @param {Ext.data.NodeInterface} node
   * @returns {Promise}
   */
  appendItems: function (parentID, node) {
    const me = this
    let promise
    try {
      if (_.isArray(parentID)) {
        me.clearTree(node)
        promise = me.loadFilter(parentID, me.store.getRootNode(), me.showNode, me.orderID, me.onDate, me.additionAttr, me.orgIDs)
      } else {
        promise = me.loadItems(parentID, node, me.showNode, me.orderID, me.onDate, me.additionAttr, me.orgIDs)
      }
      node.set('leaf', true)
      return promise.then(function (data) {
        if (!Array.isArray(data)) {
          return Promise.resolve(false)
        }
        if (!data.length) {
          return Promise.resolve(false)
        }
        if (me.isNotChildOrg && !node.isRoot()) {
          data.forEach((item, idx) => {
            if (me.isNotChildOrg && item.nodeType === 'ORGUNIT' && !node.isRoot()) {
              data.splice(idx, 1)
            }
          })
          if (!data.length) {
            return Promise.resolve(false)
          }
        }
        Ext.suspendLayouts(true)
        me.store.suspendEvents()
        me.tree.suspendEvents()
        let calcFieldsPromise
        if (me.calcFields) {
          calcFieldsPromise = me.calcFields(data)
        } else {
          calcFieldsPromise = Promise.resolve(data)
        }
        return calcFieldsPromise
      }).then(data => {
        if (!(data && data.length)) {
          return
        }
        let hasChild = data.hasChild || []
        node.appendChild(data)
        node.set('leaf', false)
        node.eachChild(function (n) {
          if (!n.raw.ID) {
            n.set('leaf', false)
          } else {
            n.set('leaf', !hasChild.includes(n.raw.ID))
          }
          if (n.raw.tooltip) {
            n.set('qtip', n.raw.tooltip)
          }
          if (n.raw.nodeType === 'DEP_ROOT') {
            n.set('cls', 'group-node')
          }
          if (n.raw.liquidate) {
            n.set('cls', 'grd-color-red')
          } else {
            if (n.raw.stateCode === 'NEW') {
              n.set('cls', n.raw.mi_data_id === n.raw.ID
                ? (n.raw.linkToSourceID ? 'org-nodenewstructure' : 'org-nodenew')
                : (n.raw.linkToSourceID ? 'org-nodechangedstructure' : 'org-nodechanged'))
            }
          }
        })
        node.set('leaf', !node.firstChild)
        me.store.resumeEvents()
        Ext.resumeLayouts(true)
        me.tree.resumeEvents()
        if (data[0].nodeType === 'ORG_ROOT') {
          node.firstChild.expand()
        }
        if (data[0].nodeType === 'ORGUNIT' || data[0].nodeType === 'DEPUNIT') {
          me.tree.getSelectionModel().select(node.firstChild)
          if (me.isExpandRoot && node.firstChild) {
            node.firstChild.expand()
          }
        }
        return data
      })
    } catch (e) {
      Ext.resumeLayouts(true)
      me.store.resumeEvents()
      me.tree.resumeEvents()
    }
  },

  clearTree: function (node) {
    while (node.childNodes.length) {
      node.removeChild(node.firstChild)
    }
  },

  loadFilter: function (masterID, parentNode, showNode, orderID, onDate, additionAttr, orgIDs) {
    return this.loadItems(masterID, parentNode, showNode, orderID, onDate, additionAttr, orgIDs)
  },

  loadItems: function (masterID, parentNode, showNode, orderID, onDate, additionAttr, orgIDs) {
    const me = this
    HR.treeUtils.empOrderType = me.empOrderType
    return HR.treeUtils.loadItems(masterID, parentNode, showNode, orderID, onDate, additionAttr, orgIDs, me.dictFundSourceID, me.showAllPos)
  },

  reload: function () {
    const me = this
    me.reloadNode(me.tree.contextMenu.contextNode)
  },

  selectNode (node) {
    const me = this
    if (!node) {
      node = me.getCurrentRecord()
      if (!node) {
        return
      }
    }
    me.tree.getSelectionModel().select(node)
  }
})
