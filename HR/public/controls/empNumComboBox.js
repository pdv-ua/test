/* global UB, $App, Ext, AC */
Ext.define('HR.controls.empNumComboBox', {
  extend: 'UB.ux.form.field.UBComboBox',
  alias: 'widget.empNumComboBox',
  autoGroupFilter: true,
  disableContextMenu: false,
  disableAddItem: false,
  disableEditItem: false,
  disableShowLookup: false,
  disableClearSelection: true,
  customContextActions: [],
  addReleased: false,
  addWorkPeriod: false,
  addPlural: false,
  showFormCode: 'hr_employeeNumber',
  showEntityName: 'hr_employeeNumber',
  instanceAttr: 'ID',

  initComponent: function () {
    let me = this
    me.callParent(arguments)
  },

  initContextMenu: function () {
    let me = this
    if (me.addDateTo || me.addPlural || me.addPosName || me.addOrgName || me.addWorkPeriod) {
      me.tpl = new Ext.XTemplate('<ul class="x-list-plain"><tpl for="."><li role="option" class="boundlist-{[xindex % 2 === 0 ? "even" : "odd"]}  ' +
          Ext.baseCSSPrefix + 'boundlist-item">' +
          '<span>{description}</span><span><normal style="color:gray;">{[this.getPosName(values)]}{[this.getReleased(values)]}{[this.getPlural(values)]}{[this.getOrgName(values)]}{[this.getWorkPeriod(values)]} </small></span></li></tpl></ul>', {
        getReleased: function (reco) {
          return (me.addDateTo && reco.dateTo && reco.dateTo < AC.dateService.currentDate()) ? ` ${UB.i18n('звільнено')} ${AC.dateService.formatDate(reco.dateTo)}` : ''
        },
        getWorkPeriod: function (reco) {
          return me.addWorkPeriod ? `${AC.dateService.formatDate(reco.dateFrom)} - ${(reco.dateTo && reco.dateTo < AC.dateService.currentDate()) ? `${AC.dateService.formatDate(reco.dateTo)}` : ''}` : ''
        },
        getPlural: function (reco) {
          return (me.addPlural && ((reco.dateTo && reco.dateTo > AC.dateService.currentDate()) || !reco.dateTo) && reco.workPlaceCode === '2') ? ` ${UB.i18n('внутрішнє сумісництво')}`
            : ((me.addPlural && reco.workPlaceCode) === '5' ? ` ${UB.i18n('посадове місце')} ${reco['empDictPositionID.name'] || ''}` : '')
        },
        getPosName: function (reco) {
          return me.addPosName && reco.posName && reco.posName.length > 0 ? ` ${reco.posName}` : ''
        },
        getOrgName: function (reco) {
          return me.addOrgName && reco.orgName ? ` (${reco.orgName})` : ''
        }
      })
    }
    if (me.disableContextMenu || !AC.entityUtils.verifyRightsMethod(me.showEntityName, 'view')) {
      return
    }
    let store = me.getStore()
    let menuItems = []
    let entityName = (store.ubRequest ? store.ubRequest.entity : null) || store.entityName
    if ($App.domainInfo.has(entityName)) {
      menuItems.push({
        text: UB.i18n('Відкрити') + ' (Ctrl+E)',
        iconCls: 'fa fa-edit',
        itemID: 'editItem',
        handler: me.editItem,
        hidden: me.hideEntityItemInContext || me.disableModifyEntity || me.disableEditItem,
        disabled: me.disabled || me.disableModifyEntity,
        scope: me
      })
    }
    menuItems.push({
      text: UB.i18n('clearSelection') + ' (Ctrl+BackSpace)',
      iconCls: 'fa fa-eraser',
      itemID: 'clearValue',
      hidden: me.disableClearSelection,
      handler: me.clearValue,
      disabled: me.disabled || me.readOnly,
      scope: me
    })
    me.customContextActions.forEach(item => {
      if (!item.scope) {
        item.scope = me
      }
      menuItems.push(item)
    })

    me.contextMenu = Ext.create('Ext.menu.Menu', { items: menuItems })

    me.editItemButton = me.contextMenu.items.getAt(0)
    me.clearValueButton = me.contextMenu.items.getAt(1)

    me.keyMap = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        ctrl: true,
        shift: false,
        alt: false,
        key: Ext.EventObject.E,
        handler: function (keyCode, e) {
          e.stopEvent()
          me.editItem()
        }
      },
      {
        ctrl: true,
        shift: false,
        alt: false,
        key: 8,
        handler: function (keyCode, e) {
          if (!me.disabled && !me.readOnly) {
            e.stopEvent()
            me.clearValue()
          }
          return true
        }
      },
      {
        ctrl: true,
        shift: false,
        alt: false,
        key: 65,
        handler: function (keyCode, e) {
          me.ctrlCDown = true
          return true
        }
      },
      {
        ctrl: true,
        shift: false,
        alt: false,
        key: 67,
        handler: function (/* keyCode, e */) {
          // e.stopEvent();
          me.ctrlCDown = true
          return true
        }
      }]
    })
  },
  editItem: function (initValue) {
    const me = this
    const instanceID = me.getFieldValue(me.instanceAttr)
    const cmdConfig = {
      cmdType: UB.core.UBCommand.commandType.showForm,
      entity: me.showEntityName,
      formCode: me.showFormCode,
      instanceID: instanceID,
      sender: me,
      tabId: Ext.id(null, me.entityName),
      target: $App.getViewport().centralPanel
    }
    if (instanceID) {
      UB.core.UBApp.doCommand(cmdConfig)
    }
  },
  showLookup: function () {
    let me = this
    let store
    let entityName
    let instanceID
    let config
    let hideActions = ['refresh', 'exportXls', 'exportCsv', 'exportHtml', 'showPreview', 'itemLink',
      'commandLink', 'addNewByCurrent', 'del', 'newVersion', 'audit', 'history', 'showDetail']

    store = me.getStore()
    entityName = store.entityName
    if (!entityName) { return }
    instanceID = me.getValue()

    if (me.disableAddItem) {
      hideActions.push('addNew')
    }
    if (me.disableEditItem) {
      hideActions.push('edit')
    }
    config = {
      entity: entityName,
      cmdType: UB.core.UBCommand.commandType.showList,
      description: $App.domainInfo.get(entityName, true).getEntityDescription(),
      isModal: true,
      sender: me,
      selectedInstanceID: instanceID,
      hideActions: hideActions,
      onItemSelected: function (selected) {
        if (me.setValueById) {
          me.getStore().clearData()
          me.setValueById(selected.get(me.valueField || 'ID'))
        }
      },
      cmdData: {
        params: [{
          entity: entityName,
          method: 'select',
          fieldList: me.gridFieldList ? me.gridFieldList : '*',
          whereList: store.ubRequest.whereList,
          logicalPredicates: store.ubRequest.logicalPredicates,
          __mip_ondate: me.getStore().ubRequest.__mip_ondate
        }]
      }
    }
    let filters = store.filters.clone()
    filters.removeAtKey(me.userFilterId)
    config.filters = filters

    UB.core.UBApp.doCommand(config)
  }
})
