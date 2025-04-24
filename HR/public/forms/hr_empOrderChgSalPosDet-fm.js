/* global HR AC  */
exports.formCode = {
  controlChanged,
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
    me.on('controlChanged', controlChanged, me)
  },

  addBaseActions: function () {
    let me = this
    me.callParent(arguments)
  },

  initUBComponent: function () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

  },

  filterDepartment: function ({
    isReload = false,
    isClear = false
  }) {
    let me = this
    return me.orderForm.filterDepartment({
      form: me,
      isReload: isReload,
      isClear: isClear,
      orgAttr: 'organizationID'
    })
  },

  filterPosition: function ({
    isReload = false,
    isClear = false
  } = {}) {
    let me = this
    return me.orderForm.filterPosition({
      form: me,
      isReload: isReload,
      isClear: isClear,
      orgAttr: 'organizationID'
    })
  },
  enableControls: function () {
    return this.orderForm.enableParaControls(this)
  },
  calcNewValue: function () {
    let me = this
    let mRec = me.masterForm.record
    let oldValue = Number(me.record.get('oldValue'))

    let diff = (oldValue / 100 * Number(mRec.get('changeValue')))
    if (mRec.get('changeKind') === 'DEC') {
      diff = -diff
    }
    // let roundingValue = (mRec.get('roundingValue')||1)*100
    let newValue = Math.round(oldValue + diff)
    me.getField('newValue').setValue(newValue)
  },

  initComponentDone: function () {
    let
      me = this
    if (me.customParams.orderForm) {
      me.masterForm = me.orderForm = me.customParams.orderForm
    } else {
      me.masterForm = me.orderForm = me.sender.up('form')
      if (me.masterForm.orderForm) {
        me.orderForm = me.masterForm.orderForm
      }
    }
    me.orderState = me.orderForm.record.get('orderState')

    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }
    me.on('recordloaded', function (a) {
      let
        me = this
      me.filterDepartment({})
      me.filterPosition({})
      if (me.isNewInstance) {
        me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('dateFrom')))
        me.record.set('orderID', me.masterForm.record.get('orderID'))
        me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      }

      me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
        if (modified.includes('departmentID')) {
          me.filterPosition({
            isReload: true,
            isClear: true
          })
        }
        if (modified.includes('positionID')) {
          let rec = AC.gridUtils.getCurrentRecord(me.getField('positionID'))
          me.getField('oldValue').setValue(rec ? rec.get('accrualSum') : null)
          me.calcNewValue()
        }

        HR.orderManager.showIf(me)
        HR.orderManager.requiredIf(me)
      })

      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
    })
    me.on('formDataReady', function (a) {
      me.enableControls()
    })
    /*this.on('beforeSaveForm', function (a) {})
    this.on('aftersave', function (a) {

    })
    this.on('beforeDelete', function (a) {})
    this.on('afterDelete', function (a) {})
    this.on('beforeClose', function (a) {
      if (me.sender) {
        let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
        if (grid) {
          grid.onRefresh()
        }
      }
      let grid = me.masterForm.down('[name=hr_empOrderChgSalEmpDet]')
      if (grid && grid.onRefresh) {
        grid.onRefresh()
      }
    })*/

    AC.viewUtils.setAttr(me)
  }
}

function controlChanged (field, value) {

}
