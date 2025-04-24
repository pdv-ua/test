/* global Ext UB */
Ext.define('HR.controls.TextAreaEditWindow', {
  extend: 'Ext.window.Window',
  alias: 'widget.textareawindow',
  height: 160,
  width: 550,
  modal: true,
  layout: { type: 'vbox', align: 'stretch' },
  initComponent: function () {
    const me = this
    me.items = [
      {
        xtype: 'textarea',
        name: 'editField',
        flex: 1,
        // fieldStyle: 'background-color: #cceaff;',
        fieldStyle: 'background-color: #ffffff;',
        margin: '10 10 5 10',
        listeners: {
          afterrender: (ctrl) => {
            me.value && ctrl.setValue(me.value)
            Ext.defer(function () {
              ctrl.focus(false)
            }, 500)
          }
        }
      },
      {
        layout: { type: 'hbox', align: 'middle', pack: 'center' },
        margin: '5 5 10 5',
        items: [
          new Ext.button.Button({
            text: UB.i18n('ok'),
            tooltip: UB.i18n('ok'),
            iconCls: 'fa fa-check',
            cls: 'green-action',
            handler: function (btn) {
              const editField = me.down('[name=editField]')
              me.onOk && me.onOk(editField.getValue())
              me.close()
            }
          }),
          new Ext.button.Button({
            text: UB.i18n('cancel'),
            tooltip: UB.i18n('cancel'),
            iconCls: 'iconReject',
            handler: function (btn) {
              me.onCancel && me.onCancel(me)
              me.close()
            }
          })
        ]
      }
    ]
    me.callParent(arguments)
  }
})
