exports.formCode = {
  initUBComponent: function () {
    const me = this
    let vpnPass1Ctrl = this.down('#vpnPass1')
    vpnPass1Ctrl.validator = function (value) {
      return me.record.get('uPasswordHashVpn') === value
    }
    let setPasswordCtrl = this.down('#setPassword')
    setPasswordCtrl.on('click', function () {
      me.saveForm()
    })

    me.on('beforeSaveForm', function (functionList) {
      functionList.push([0,
        function () {
        }
      ])
    })
  }
}
