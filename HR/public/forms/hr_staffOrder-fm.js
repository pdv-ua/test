/* global HR  AC appAC */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  afterPosting
}

function initComponentStart () {
  let me = this
  if (me.entityName === 'hr_staffOrderOrgStructure') {
    let staffTreeControlConfig = AC.viewUtils.dfmDown(me, 'name=staffTreeControl')
    staffTreeControlConfig.empOrderType = 'ORGONLY'
  }
  me.orderConfig = {
    detailGrids: []
  }
  HR.orderManager.init(me)
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
  if (!me.attr.staffTreeControl) {
    me.attr.staffTreeControl = me.down('staffTreeControl')
  }
  me.attr.staffTreeControl.orderID = me.instanceID
  if (me.isNewInstance) {
    me.record.set('entryDate', me.record.get('orderDate'))
    me.attr.orgID.store.ubRequest.__mip_ondate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    delete me.attr.orgID.store.ubRequest.__mip_recordhistory_all
    HR.treeUtils.getOrgResp('signer4Orgstruct', 'employeeID').then(data => {
      if (data && data.employeeID) {
        me.attr.respEmployeeID.setValueById(data.employeeID)
      }
    })
  } else {
    me.attr.staffTreeControl.onDate = AC.dateService.truncTimeToUtcNull(me.record.get('orderDate'))
    me.attr.staffTreeControl.organization = me.record.get('orgID')
    const node = me.attr.staffTreeControl.tree.store.getRootNode()
    if (node) {
      me.attr.staffTreeControl.clearTree(node)
      me.attr.staffTreeControl.appendItems(me.record.get('orgID') ? [me.record.get('orgID')] : null, node)
    }
  }
}

function afterPosting (me) {
  if (appAC) {
    appAC.refreshGlobalOrganization()
  }
}
