exports.formCode = {
    initComponentStart, 
    addBaseActions,
    initComponentDone
}

function initComponentStart() { 
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
}

function addBaseActions() {
    this.callParent(arguments)
}

function initComponentDone() {
    this.on('beforeSaveForm', function (a, b, c, d) {})
    this.on('beforeClose', function (a) {})
    this.on('recordloaded', function (a) {
        let me = this
        if (me.isNewInstance) {
            me.record.set('organizationID', appAC.globalOrganization())
          }
    })

    this.on('formDataReady', function (a) {})
    this.on('beforeSaveForm', function (a) {})
    this.on('aftersave', function (a) {})
    this.on('beforeDelete', function (a) {})
    this.on('afterDelete', function (a) {})
    this.on('beforeClose', function (a) {})
}    
