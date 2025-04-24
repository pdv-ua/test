/* global AC */
exports.formCode = {
  initComponentStart: function () { // Вызывается прямо перед запуском инициализации формы.
    // В этом событии  можно изменить конфигурацию формы.
    let me = this
    me.on('afterrender', function () {
      let win = this.window
      if (win) {
        if (!win.height) {
          win.height = 600
        }
        if (!win.width) {
          win.width = 800
        }
      }
    })
  },

  addBaseActions: function () {
    this.callParent(arguments)
  },
  initUBComponent: function () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

  },
  initComponentDone: function () {
    this.on('beforeSaveForm', function (a, b, c, d) {
    })
    this.on('beforeClose', function (a) {
    })
    this.on('recordloaded', function (a) {
      let
        me = this
      let sender = me.sender
      let empOrderType
      if (sender) {
        empOrderType = AC.viewUtils.getFilterValue(sender, 'empOrderType')
      }
      if (empOrderType) {
        me.getField('empOrderType').setValue(empOrderType)
        me.record.set('empOrderType', empOrderType)
        me.getField('empOrderType').setReadOnly(true)
      } else {
        me.getField('empOrderType').setReadOnly(false)
      }

      me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
        if (modified.includes('dummy')) {

        }
      })
    })
    this.on('formDataReady', function (a) {
    })
    this.on('beforeSaveForm', function (a) {
    })
    this.on('aftersave', function (a) {
    })
    this.on('beforeDelete', function (a) {
    })
    this.on('afterDelete', function (a) {
    })
    this.on('beforeClose', function (a) {
    })
  }
}
