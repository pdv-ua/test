exports.formCode = {
  initComponentStart: function () { // Вызывается прямо перед запуском инициализации формы.
    // В этом событии  можно изменить конфигурацию формы.
  },

  addBaseActions: function () {
    this.callParent(arguments)
  },
  initUBComponent: function () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

  },
  initComponentDone: function () {
  }
}
