exports.formCode = {
  /* global AC */
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
    let
      me = this
    me.on('beforeSaveForm', function (a, b, c, d) {
    })
    me.on('beforeClose', function (a) {
    })
    me.on('recordloaded', function (a) {
      let sender = me.sender
      let empOrderType = AC.viewUtils.getFilterValue(sender, 'empOrderType')
      if (me.isNewInstance) {
        if (empOrderType) {
          me.record.set('empOrderType', empOrderType)
          me.getField('empOrderType').setDisabled(true)
        }
      }

      me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
        if (modified.includes('dummy')) {

        }
      })
    })
    me.on('formDataReady', function (a) {
    })
    me.on('beforeSaveForm', function (a) {
    })
    me.on('aftersave', function (a) {
    })
    me.on('beforeDelete', function (a) {
    })
    me.on('afterDelete', function (a) {
    })
    me.on('beforeClose', function (a) {
    })
  }
}
