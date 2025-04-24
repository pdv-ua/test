/* global UB, $App, Ext  AC */
Ext.define('HR.controls.empPositionCombobox', {
  extend: 'UB.ux.form.field.UBComboBox',
  alias: 'widget.empPositionCombobox',
  autoGroupFilter: true,
  disableContextMenu: false,
  disableAddItem: false,
  disableShowLookup: false,
  disableClearSelection: false,
  customContextActions: [],
  displayField: 'description',
  addWorkPlace: false,

  gridFieldList: [
    { name: 'description', description: UB.i18n('Працівник') },
    { name: 'depName', description: UB.i18n('Підрозділ') },
    { name: 'posName', description: UB.i18n('Посада') }, 'dateFrom', 'dateTo',
    { name: 'workScheduleID.name', description: UB.i18n('Графік роботи') },
    { name: 'workPlace', description: UB.i18n('Місце роботи') },
    { name: 'workerType', description: UB.i18n('Вид зайнятості') },
    { name: 'contractType.name', description: UB.i18n('Тип договору') },
    'mtCount',
    { name: 'dictStaffCatID.name', description: UB.i18n('Категорія персоналу') },
    { name: 'dictContractKindID.name', description: UB.i18n('Вид договору') },
    { name: 'dictTarifCoeffID.name', description: UB.i18n('Тарифний розряд') },
    { name: 'dictRankID.name', description: UB.i18n('Ранг держслужбовця') }
  ],
  orderList: { orderBy: { expression: 'description' } },
  initComponent: function () {
    let me = this
    if (me.addWorkPlace || me.addDateTo) {
      me.tpl = new Ext.XTemplate('<ul class="x-list-plain"><tpl for="."><li role="option" class="boundlist-{[xindex % 2 === 0 ? "even" : "odd"]}  ' +
        Ext.baseCSSPrefix + 'boundlist-item">' +
        '<span>{description}</span><span><small style="color:gray;">{[this.getWorkerPlace(values)]}{[this.getVacancyDate(values)]}{[this.getReleased(values)]}</small></span></li></tpl></ul>', {

        getWorkerPlace: function (reco) {
          const workPlace = reco.workPlace ? UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').getById(reco.workPlace) : null
          return ' ' + (workPlace ? workPlace.get('name') : '')
        },
        getVacancyDate: function (reco) {
          let result = ''
          if (reco.vacancyDateFrom) {
            result += `, ${UB.i18n('відсутність')} ${AC.dateService.formatDate(reco.vacancyDateFrom)}`
          }
          if (reco.vacancyDateTo && reco.vacancyDateTo.getFullYear() !== 9999) {
            result += ` - ${AC.dateService.formatDate(reco.vacancyDateTo)}`
          }
          return result
        },
        getReleased: function (reco) {
          return (me.addDateTo && reco['employeeNumberID.dateTo'] && reco['employeeNumberID.dateTo'] < AC.dateService.currentDate()) ? ` ${UB.i18n('звільнено')} ${AC.dateService.formatDate(reco['employeeNumberID.dateTo'])}` : ''
        }
      })
    }
    me.callParent(arguments)
  },

  initContextMenu: function () {
    let me = this
    if (me.disableContextMenu) {
      return
    }
    let store = me.getStore()
    let menuItems = []
    let entityName = (store.ubRequest ? store.ubRequest.entity : null) || store.entityName
    if ($App.domainInfo.has(entityName)) {
      menuItems.push({
        text: UB.i18n('selectFromDictionary') + ' (F9)',
        iconCls: 'fa fa-table',
        // iconCls: 'ub-icon-table',
        itemID: 'showLookup',
        handler: me.showLookup,
        hidden: me.disableShowLookup,
        disabled: me.disabled || me.readOnly,
        scope: me
      })
      menuItems.push({
        text: UB.i18n('clearSelection') + ' (Ctrl+BackSpace)',
        iconCls: 'fa fa-eraser',
        itemID: 'clearValue',
        hidden: me.disableClearSelection,
        handler: me.clearValue,
        disabled: me.disabled || me.readOnly,
        scope: me
      })
    }
    me.customContextActions.forEach(item => {
      if (!item.scope) {
        item.scope = me
      }
      menuItems.push(item)
    })

    me.contextMenu = Ext.create('Ext.menu.Menu', { items: menuItems })

    me.showLookupButton = me.contextMenu.items.getAt(0)
    me.clearValueButton = me.contextMenu.items.getAt(1)

    me.keyMap = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [
        {
          ctrl: false,
          shift: false,
          alt: false,
          key: 120,
          handler: function (keyCode, e) {
            if (!me.disabled && !me.readOnly && !me.hideEntityItemInContext) {
              e.stopEvent()
              me.showLookup()
            }
            return true
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
  showLookup: function () {
    let me = this
    let store
    let entityName
    let instanceID
    let config
    let hideActions = ['refresh', 'exportXls', 'exportCsv', 'exportHtml', 'showPreview', 'itemLink',
      'commandLink', 'addNewByCurrent', 'del', 'addNew', 'edit', 'newVersion', 'audit', 'history', 'showDetail']

    store = me.getStore()
    entityName = store.entityName
    if (!entityName) { return }
    instanceID = me.getValue()
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
          fieldList: me.gridFieldList,
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
