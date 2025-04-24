/* global HR  AC */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  HR.orderManager.init(me)
  me.on('afterrender', () => HR.orderManager.disableContextMenuItems(me.getField('orgID'), ['showLookup']))
}
/**
 * Add actions in toolbar
 */
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: {
        action: ['postingAction', 'fDelete']
      },
      POSTED: {
        action: ['cancelPostingAction']
      }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

/**
 * @event onFormDataReady
 * Fires when data bonded and all form required data loaded (combobox data, details data e.t.c.)
 */
function onFormDataReady () {
  const me = this
  const readOnly = !(me.record.get('orderState') === 'PROJECT')
  if (!me.attr.staffTreeControl) {
    me.attr.staffTreeControl = me.down('staffTreeControl')
  }

  me.attr.staffTreeControl.setReadOnly(readOnly)
  me.attr.staffTreeControl.orderID = me.instanceID
  me.attr.orgID.store.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
  me.attr.orgID.store.load()
  if (me.isNewInstance) {
    me.record.set('entryDate', me.record.get('orderDate'))
    delete me.attr.orgID.store.ubRequest.__mip_recordhistory_all
  } else {
    me.attr.staffTreeControl.onDate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    me.attr.staffTreeControl.organization = me.record.get('orgID')
    const node = me.attr.staffTreeControl.tree.store.getRootNode()
    if (node) {
      me.attr.staffTreeControl.clearTree(node)
      me.attr.staffTreeControl.appendItems(me.record.get('orgID') ? [me.record.get('orgID')] : null, node)
    }
  }
  if (!AC.entityUtils.verifyRightsMethod('hr_organization', 'allowEditAll')) {
    me.attr.staffTreeControl.editOrganization = false
  }
}
