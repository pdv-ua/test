/* global UB Ext */
Ext.define('HR.controls.hrMultiSelectBox', {
  extend: 'UB.ux.form.field.UBBoxSelect',
  alias: 'widget.hrMultiSelectBox',
  initComponent: function () {
    var me = this
    me.callParent(arguments)
  },
  setValueById: function (id, isDefault, onLoadValue, scope) {
    var me = this
    var originalReq, ids
    if (!id) {
      me.setValue(id)
      if (isDefault) {
        me.resetOriginalValue()
      }
      if (onLoadValue) {
        Ext.callback(onLoadValue, scope || me, [me])
      }
      return
    }
    originalReq = me.store.ubRequest

    if (typeof (id) !== 'string') {
      id = String(id)
    }
    if (this.valueField === 'ID') {
      ids = id.split(',').map(function (val) { return parseInt(val, 10) })
    } else {
      ids = id.replace(/"/g, '').split(',')
    }

    UB.Repository(originalReq.entity).attrs(originalReq.fieldList)
      .whereIf(ids.length > 1, '[' + this.valueField + ']', 'in', ids)
      .whereIf(ids.length === 1, '[' + this.valueField + ']', '=', ids[0])
      .whereIf(this.enumGroupFilter, '[eGroup]', '=', this.enumGroupFilter)
      .where('state', '=', 'ACTIVE')
    // these `misc` allows to display entries that have been deleted or closed by the `History` mixin
      .selectAsStore().then(function (store) {
        var values = []
        store.each(function (record) {
          values.push(record)
        })
        if (me.store) { // in case of Save&close action store can be null here
          me.setValue(values)
          if (isDefault) {
            me.resetOriginalValue()
          }
          if (onLoadValue) {
            Ext.callback(onLoadValue, scope || me, [me])
          }
        }
      })
  }
})
