/* global AC HR Ext */
/* jshint maxerr: 10000 */
exports.formCode = {
  controlChanged,
  initComponentStart,
  enableControls,
  initComponentDone,
  recordLoaded
}

function initComponentStart () {
  let isDateValid = aDate => aDate && aDate.getFullYear
  if (!Ext.form.field.VTypes.renewDate) {
    let renewDateVType = {
      renewDate: function (val, ctrl) {
        let me = ctrl.up('form')
        let dateRenew = new Date(ctrl.getValue())
        if (!isDateValid(dateRenew)) {
          return false
        }
        return true
      },
      renewDateText: UB.i18n('Дата поновлення повинна бути більше дати звільнення або дорівнювати даті звільнення'),
      renewDateMask: ''
    }
    Ext.apply(Ext.form.field.VTypes, renewDateVType)
  }
  this.on('controlChanged', controlChanged, this)
}

function enableControls () {
  const me = this
  const isReadOnly = !(me.orderForm.isEditable && me.orderForm.isEditable())
  HR.orderManager.enableControls({ me: me, isEnabled: !isReadOnly })
}

function recordLoaded (a) {
  const me = this
  me.enableControls()
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  if (!me.orderForm) {
    return
  }
  if (me.isNewInstance) {
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
  }
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
  })
}

function initComponentDone () {
  let
    me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    if (me.sender) {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
  }
  me.orderState = me.orderForm && me.orderForm.record.get('orderState')

  me.onBeforeSave = () => {
    let dateRenew = AC.dateService.truncTimeToUtcNull(new Date(me.record.get('dateFrom')))
    let dateDism = AC.dateService.truncTimeToUtcNull(new Date(me.record.get('dismParaID.dateFrom')))
    if (dateRenew <= dateDism) {
      AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Дата поновлення повинна бути більшою за дату звільнення'))
      return Promise.resolve(false)
    }
    return Promise.resolve(true)
  }

  me.on('recordloaded', recordLoaded)
  me.on('formDataReady', () => {
    HR.orderManager.setTitleByOrderType(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    AC.viewUtils.setWhereListProperty(me.attr.dismParaID, [
      ['organizationID', '=', me.orderForm.record.get('organizationID')]
    ])
    me.attr['dismParaID.orderID.orderNumber'].setReadOnly(true)
    me.attr['dismParaID.orderID.orderDate'].setReadOnly(true)
    me.attr['dismParaID.dateFrom'].setReadOnly(true)
    me.attr['dismParaID.orderID.dictEmpOrderIndexID'].setReadOnly(true)
    HR.orderManager.disableContextMenuItems(me.attr.dismParaID, ['editItem', 'showLookup', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.attr.employeeID, ['editItem', 'showLookup', 'addItem'])
    me.attr.employeeID.getStore().ubRequest.whereList.exist.value.whereList.orgID = {
      condition: 'equal',
      expression: '[organizationID]',
      value: me.orderForm.record.get('organizationID')
    }
  })

  /*this.on('beforeSaveForm', function (a) {})
  this.on('aftersave', function (a) {})
  this.on('beforeDelete', function (a) {})
  this.on('afterDelete', function (a) {})
  this.on('beforeClose', function (a) {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })*/

  AC.viewUtils.setAttr(me)
}

function controlChanged (ctrl, value, oldValue) {
  let me = this
  switch (ctrl.name) {
    case 'employeeID':
      if (me.attr.dismParaID.getFieldValue('employeeID') !== value || !value) {
        if (value) {
          AC.viewUtils.setWhereListProperty(me.attr.dismParaID, [
            ['employeeID', '=', value]
          ])
        } else {
          AC.viewUtils.deleteWhereListProperty(me.attr.dismParaID, 'employeeID', '=')
        }
        me.attr.dismParaID.setValueById(null)
        me.attr.dismParaID.getStore().load()
      }
      break
    case 'dismParaID':
      let employeeID = me.attr.dismParaID.getFieldValue('employeeID')
      if (employeeID !== value && value) {
        me.attr.employeeID.setValueById(employeeID)
      }
      me.record.set('employeePositionID', me.attr.dismParaID.getFieldValue('employeePositionID'))
      me.attr['dismParaID.orderID.orderNumber'].setValue(ctrl.getFieldValue('orderID.orderNumber'))
      me.attr['dismParaID.orderID.orderDate'].setValue(ctrl.getFieldValue('orderID.orderDate'))
      me.attr['dismParaID.dateFrom'].setValue(ctrl.getFieldValue('dateFrom'))
      me.attr['dismParaID.orderID.dictEmpOrderIndexID'].setValueById(ctrl.getFieldValue('orderID.dictEmpOrderIndexID'))
      let dateFromTo = me.attr['dismParaID.dateFrom'].getValue()
      if (AC.dateService.isValid(dateFromTo)) {
        dateFromTo.setDate(dateFromTo.getDate() + 1)
        me.attr['dateFrom'].setValue(dateFromTo)
      }
      break
  }
}
