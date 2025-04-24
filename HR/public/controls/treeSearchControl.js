/* global  Ext AC _ $App UB */

Ext.define('HR.controls.treeSearchControl', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.treeSearchControl',
  closable: true,
  layout: 'fit',
  closeAction: 'hide',
  hidden: true,
  title: UB.i18n('Результати пошуку'),
  items: [
    {
      name: 'searchResult',
      xtype: 'grid',
      cls: 'ub-entity-grid',
      hideHeaders: true,
      store: {
        type: 'array',
        store: [],
        fields: [
          { name: 'mi_treePath', type: 'string' },
          { name: 'mi_unityEntity', type: 'string' },
          { name: 'name', type: 'string' }
        ]
      },
      columns: [
        {
          dataIndex: 'mi_treePath',
          hidden: true
        },
        {
          dataIndex: 'mi_unityEntity',
          renderer: function (value, metadata, record, rowIndex, colIndex, store) {
            switch (value) {
              case 'hr_employee':
                metadata.css += ' person-base-icon '
                break
              case 'hr_position':
                metadata.css += ` pos-4-icon`
                break
              case 'hr_department':
                metadata.css += ` dep-base-icon`
                break
            }
            return '&nbsp;'
          },
          width: 40
        },
        {
          text: UB.i18n('Назва'),
          flex: 4,
          dataIndex: 'name'
        }
      ],
      listeners: {
        afterrender: grid => {
          // grid.reload = me.loadEmployeeExperience
          grid.contextMenu = new Ext.menu.Menu({
            name: 'gridContextMenu',
            items: [{
              text: UB.i18n('Перейти'),
              scope: grid,
              handler: () => {
                grid.up('treeSearchControl').gotoInTree()
              }
            }]
          })
          grid.getView().on('itemdblclick', () => {
            grid.up('treeSearchControl').gotoInTree()
          })
        },
        itemcontextmenu: (view, record, item, index, event) => {
          const grid = view.up('grid')
          event.stopEvent()
          grid.contextMenu.showAt(event.getXY())
        }
      }
    }
  ],
  clearSearchResult: function () {
    const grid = this.down('[name=searchResult]')
    grid.getStore().loadData([])
  },
  find: async function (treeControl, path) {
    function findNode (tree, parent, miDataID) {
      if (!parent) {
        parent = tree.getStore().getRootNode().firstChild
      }
      if (parent.raw.nodeType === 'EMPUNIT') {
        parent = parent.parentNode
        let result = null
        parent.eachChild(node => {
          if (node.raw.ID === miDataID) {
            result = node
            return false
          }
        })
        return Promise.resolve(result)
      }
      let promise = parent.firstChild ? Promise.resolve(true) : treeControl.appendItems(parent.raw.mi_data_id, parent)
      return promise.then(() => {
        let result = null
        if (parent.raw.mi_data_id === miDataID) {
          result = parent
        } else {
          parent.expand()
          parent.eachChild(node => {
            if ((node.raw.mi_data_id !== undefined && node.raw.mi_data_id === miDataID) || node.raw.employeeID === miDataID) {
              result = node
              return false
            } else {
              if (node.raw.ID === miDataID) {
                result = node
                return false
              }
            }
          })
        }
        return result
      })
    }

    const form = treeControl.up('[formCode]')
    form.setLoading(UB.i18n('Пошук...'))
    Ext.suspendLayouts()
    treeControl.tree.suspendEvents()
    treeControl.tree.getStore().suspendEvents()

    let ids = _.compact(path.split('/'))
    let node = null
    for (let i = 0, len = ids.length; i < len; ++i) {
      node = await findNode(treeControl.tree, node, Number(ids[i]))
    }
    Ext.resumeLayouts(true)
    treeControl.tree.resumeEvents()
    treeControl.tree.getStore().resumeEvents()
    if (node) {
      Ext.defer(() => {
        treeControl.tree.focus()
      }, 100)
      treeControl.tree.getSelectionModel().select(node)
    }
    form.setLoading(false)
    return node
  },
  initComponent: function () {
    const me = this
    me.gotoInTree = () => {
      const grid = me.down('[name=searchResult]')
      let reco = AC.gridUtils.getCurrentRecord(grid)
      if (!reco) {
        return Promise.resolve(null)
      }
      return me.find(me.staffTreeControl, reco.get('mi_treePath'))
    }
    me.search = ({ onDate, startID, search, searchMode = 'FULL', dictFundSourceID = null, staffTableID = null }) => {
      const form = me.up('[formCode]')
      form.setLoading(UB.i18n('Пошук...'))
      return $App.connection.run({
        entity: 'hr_staffUnit',
        method: 'treeSearch',
        startID: startID,
        onDate: onDate,
        search: search,
        searchMode: searchMode,
        dictFundSourceID,
        staffTableID
      }).then(mParams => {
        const data = JSON.parse(mParams.data)
        me.down('[name=searchResult]').getStore().loadData(data)
        me.setTitle(UB.i18n(`Результати пошуку ({0})`, data.length))
        return Promise.resolve(data)
      }).finally(() => {
        form.setLoading(false)
      })
    }
    me.callParent(arguments)
  }
})
