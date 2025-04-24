/* global Ext, UB, $App appAC HR _ */
Ext.define('HR.controls.dataTreeControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.datatreecontrol',
  layout: {
    type: 'vbox',
    align: 'stretch'
  },
  flex: 1,
  viewConfig: {
    toggleOnDblClick: false
  },
  isModal: true,
  additionAttr: [],
  orgIDs: [],

  initComponent: function () {
    let me = this
    let store
    let tree
    me.store = store = Ext.create('Ext.data.TreeStore', {
      fields: me.fields,
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
    me.tree = tree = Ext.create('Ext.tree.Panel', {
      flex: 0.35,
      header: false,
      loadMask: true,
      autoScroll: true,
      folderSort: false,
      animate: false,
      singleExpand: false,
      store: store,
      rootVisible: false,
      layout: 'fit',
      defaults: {
        autoScroll: true
      },
      columns: me.columns || [{
        xtype: 'treecolumn',
        flex: 1,
        sortable: false,
        dataIndex: 'text'
      },
      {
        text: UB.i18n('Стан'),
        width: 100,
        dataIndex: 'state'
      },
      {
        text: UB.i18n('Дата початку дії'),
        width: 100,
        dataIndex: 'dateFrom'
      },
      {
        text: UB.i18n('Дата закінчення дії'),
        width: 100,
        dataIndex: 'dateTo'
      },
      {
        text: UB.i18n('Наказ'),
        width: 300,
        dataIndex: 'staffOrder'
      }
      ]
    })

    tree.on('beforeitemdblclick', function (node) {
      let selectForm = this.up('[onSelectNodeHandler]')
      if (selectForm) {
        selectForm.onSelectNodeHandler(me).then(() => this.up('window').close())
      } else {
        this.editNode(node)
      }
    }, me)

    tree.on('beforeitemexpand', function (node, opt) {
      const me = this
      if (!node.firstChild) {
        me.appendItems(node.raw.mi_data_id, node)
      }
      if (node.raw.nodeType === 'MORE') {
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
    tree.on('select', function (node) {}, me)
    tree.on('itemcontextmenu', function (view, node, htmlItem, index, e, eOpts) {
      if (this.contextMenu) {
        this.contextMenu.contextNode = node
        this.contextMenu.showAt(e.getXY())
        e.stopEvent()
      }
    }, tree)

    me.tree = tree
    me.total = 100
    me.items = [tree]
    me.callParent(arguments)
    me.appendItems(null, store.getRootNode())
    me.tree.region = 'center'
    me.setReeadOnly = (value) => {
      me.readOnly = value
      me.tree.contextMenu.items.items.forEach(item => {
        if (['edit', 'addOrg', 'addDep', 'addPos', 'liquidate', 'restore'].includes(item.name)) {
          item[value ? 'hide' : 'show']()
        }
      })
    }
    let menuItems = [{
      text: UB.i18n('Редагувати'),
      hidden: me.readOnly,
      name: 'edit',
      handler: function (item) {
        me.editNode(item.parentMenu.contextNode, true)
      }
    },
    {
      text: UB.i18n('Перечитати дочірні'),
      name: 'reload',
      handler: function (item) {
        let node = item.parentMenu.contextNode
        me.reloadNode(node)
      }
    },
    {
      text: UB.i18n('Додати Організацію'),
      name: 'addOrg',
      hidden: me.readOnly,
      handler: function () {
        me.addOrg()
      }
    },
    {
      text: UB.i18n('Додати Підрозділ'),
      name: 'addDep',
      hidden: me.readOnly,
      handler: function () {
        me.addDep()
      }
    },
    {
      text: UB.i18n('Додати Посаду'),
      name: 'addPos',
      hidden: me.readOnly,
      handler: function () {
        me.addPos()
      }
    },
    {
      text: UB.i18n('Ліквідувати'),
      name: 'liquidate',
      hidden: me.readOnly,
      handler: function (item) {
        me.liquidateUnit(item.parentMenu.contextNode)
      }
    },
    {
      text: UB.i18n('Відновити'),
      name: 'restore',
      hidden: me.readOnly,
      handler: function (item) {
        me.restoreUnit(item.parentMenu.contextNode)
      }
    }

    ]
    if ($App.domainInfo.models.DEV) {
      menuItems.push({
        xtype: 'menuseparator'
      })

      menuItems.push({
        text: UB.i18n('Властивості вузла'),
        handler: function (menuItem) {
          window.DevUtils.inspect(tree.contextMenu.contextNode)
        }
      })
    }
    tree.contextMenu = new Ext.menu.Menu({
      items: menuItems
    })

    me.tree.listeners = {
      contextmenu: function (node, e) {
        node.select()
        const c = node.getOwnerTree().contextMenu
        c.contextNode = node
        c.showAt(e.getXY())
      }
    }
    me.addOrg = function () {
      let n = me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      me.addItem(n, 'hr_organization')
    }
    me.addDep = function () {
      let n = me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      me.addItem(n, 'hr_department')
    }
    me.addPos = function () {
      let n = me.getCurrentRecord()
      if (!n || !n.data || !n.get('mi_data_id')) {
        n = me.tree.getRootNode().childNodes[0] || me.tree.getRootNode()
      }
      me.addItem(n, 'hr_position')
    }

    me.reloadNode = function (node) {
      if (node && !node.isRoot()) {
        node.collapse()
        me.freeChild(node)
        node.set('leaf', false)
        node.expand()
      } else {
        const rootNode = me.tree.getRootNode()
        if (rootNode) {
          me.clearTree(rootNode)
          me.appendItems(me.orgIDs.length ? me.orgIDs : [appAC.globalOrganization()], rootNode)
        }
      }
    }

    me.editNode = function (node, edit) {
      const me = this
      const recordData = me.getCurrentRecord(node).raw
      const parentNode = me.getCurrentRecord(node).parentNode
      if (!me.sender) {
        let entityForm
        let instanceID = recordData.ID
        switch (recordData.nodeType) {
          case 'ORGUNIT':
          {
            entityForm = 'hr_organization'
            if (edit && recordData.stateCode !== 'NEW') {
              HR.treeUtils.newVersionOrg(recordData.ID, me.orderID, me.onDate, () => {
                me.reloadNode(parentNode)
              })
              return
            }
            break
          }
          case 'DEPUNIT':
          {
            entityForm = 'hr_department'
            if (edit && recordData.stateCode !== 'NEW') {
              HR.treeUtils.newVersionDep(recordData.ID, me.orderID, me.onDate, () => {
                me.reloadNode(parentNode)
              })
              return
            }
            break
          }
          case 'POSUNIT':
          {
            entityForm = 'hr_position'
            if (edit && recordData.stateCode !== 'NEW') {
              HR.treeUtils.newVersionPos(recordData.ID, me.orderID, me.onDate, () => {
                me.reloadNode(parentNode)
              })
              return
            }
            break
          }
          case 'EMPUNIT':
          {
            entityForm = 'hr_employee'
            instanceID = recordData.employeeID
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
            afterClose: () => {
              me.reloadNode(parentNode)
            }
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
  addItem: function (parentNode, entityName, parentConfig = {}) {
    const me = this
    const defaultValues = {}
    defaultValues.parentUnitID = parentNode && parentNode.get('mi_data_id') ? parentNode.get('mi_data_id') : null
    if (me.orderID) {
      defaultValues.staffOrderID = me.orderID
      defaultValues['staffOrderID.entryDate'] = me.onDate
      defaultValues.mi_dateFrom = me.onDate
    }
    let config = {
      cmdType: 'showForm',
      formCode: entityName,
      entity: entityName,
      parentConfig: parentConfig,
      cmpInitConfig: {
        defaultValues: defaultValues,
        afterClose: () => {
          me.reloadNode(parentNode)
        }
      },
      isModal: true,
      sender: me
    }
    $App.doCommand(config)
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
        promise = me.loadFilter(parentID, me.store.getRootNode(), me.orderID, me.onDate, me.additionAttr, me.orgIDs)
      } else {
        promise = me.loadItems(parentID, node, me.orderID, me.onDate, me.additionAttr, me.orgIDs)
      }
      node.set('leaf', true)
      promise.then(function (data) {
        let hasChild = data.hasChild || []
        if (!data.length) {
          return
        }
        if (me.isNotChildOrg && !node.isRoot()) {
          data.forEach((item, idx) => {
            if (me.isNotChildOrg && item.nodeType === 'ORGUNIT' && !node.isRoot()) {
              data.splice(idx, 1)
            }
          })
        }
        Ext.suspendLayouts(true)
        me.store.suspendEvents()
        me.tree.suspendEvents()
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
              n.set('cls', 'org-nodenew')
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
        if (data[0].nodeType === 'ORGUNIT') {
          me.tree.getSelectionModel().select(node.firstChild)
          if (me.isExpandRoot && node.firstChild) {
            node.firstChild.expand()
          }
        }
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

  loadFilter: function (masterID, parentNode, orderID, onDate, additionAttr, orgIDs) {
    return this.loadItems(masterID, parentNode, orderID, onDate, additionAttr, orgIDs)
  },

  loadItems: function (masterID) {
    let me = this
    let result = []
    result.hasChild = []
    return UB.Repository(me.entityName).attrs(me.fields.map(item => item.name))
      .where(me.parentAttr, masterID ? '=' : 'isNull')
      .selectAsObject().then(data => {
        data.forEach(item => {
          result.push({
            description: item.description
          })
          result.hasChild.push(item.ID)
        })
        return result
      })
  }
})
