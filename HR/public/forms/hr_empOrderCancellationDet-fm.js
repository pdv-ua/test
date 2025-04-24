/* global HR, AC */
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
      // HR.orderManager.disableContextMenuItems(me.down('[attributeName=employeePositionID]'), ['editItem', 'addItem' ])
    })
  },

  createActions: function () {
    const me = this
    if (!me.actions.fillData) {
      // me.actions.fillData = new Ext.Action({
      //   actionId: 'fillData',
      //   iconCls: 'fas fa-angle-double-down',
      //   cls: 'fill-action',
      //   eventId: 'fillData',
      //   text: 'Завантажити згідно вибраним параметрам',
      //   handler: async item => {
      //     let me = item.up('form')
      //     if (await me.saveForm() === -1) {
      //       return
      //     }
      //     //   const gridPos = me.down('[name=hr_empOrderChgSalPosDet]')
      //     //   const gridEmp = me.down('[name=hr_empOrderChgSalEmpDet]')
      //     $App.doCommand({
      //       cmdType: 'showForm',
      //       formCode: 'hr_empOrder-params',
      //       sender: me,
      //       customParams: {
      //         onClose: () => {
      //           // gridPos.onRefresh()
      //           // gridEmp.onRefresh()
      //         }
      //       }
      //     })
      //   }

      // })
    }
  },
  addBaseActions: function () {
    this.createActions()
    this.callParent(arguments)
  },
  initUBComponent: function () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .

  },
  enableControls: function () {
    this.masterForm.enableParaControls(this)
  },

  initComponentDone: function () {
    let me = this
    let sender = me.sender

    if (me.customParams.orderForm) {
      me.masterForm = me.orderForm = me.customParams.orderForm
    } else {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
    if (sender) {
      let reco = AC.gridUtils.getCurrentRecord(sender)
      if (reco) {
        let tab = me.down(`[name=${reco.get('mi_unityEntity')}]`)
        if (tab) {
          tab.show()
        }
      }
    }
    me.orderState = me.masterForm.record.get('orderState')
    me.on('beforeClose', function (a) {
      if (sender) {
        let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
        if (grid) {
          grid.onRefresh()
        }
      }
    })
    me.on('recordloaded', async function (a) {
      const me = this
      me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
        // HR.orderManager.showIf(me)
        // HR.orderManager.requiredIf(me)
        if (modified.includes('action')) {
          checkVisibleControls(me)
        }
      })
      const organizationID = me.orderForm.record.get('organizationID')
      if (me.isNewInstance) {
        me.record.set('orderID', me.masterForm.instanceID)
        me.record.set('organizationID', organizationID)
      }
      me.onBeforeSave = () => {
        return Promise.resolve(true)
      }

      HR.orderManager.setDefaultValues(me)
      // me.masterForm.makeReasonSelector(me)
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
      me.enableControls()

      const fieldTargetOrder = me.getField('targetOrderID')
      AC.viewUtils.setFilterValue(fieldTargetOrder, {
        orderState: { value: ['POSTED', 'PROCESSED'], condition: 'in' },
        organizationID: organizationID
      })
      me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
      let isProject = me.orderState === 'PROJECT'
      if (isProject && !me.isNextRecordMakerExists) {
        me.isNextRecordMakerExists = true
        HR.orderManager.setNextRecordMaker(me, [
          'dictReasonDismID',
          {
            isExternal: value => value,
            bonusID: value => value,
            organizationID: value => me.masterForm.record.get('organizationID'),
            empOrderType: value => value,
            orderID: value => value
          }
        ], 4)
      }
    })
    me.on('formDataReady', function (a) {
      checkVisibleControls(me)
    })

    this.on('beforeSaveForm', function (a) {})
    this.on('aftersave', function (a) {})
    this.on('beforeDelete', function (a) {})
    this.on('afterDelete', function (a) {})
    this.on('beforeClose', function (a) {})
  }
}

function checkVisibleControls (form) {
  const actionField = form.getField('action')
  const dateInvalidationField = form.getField('dateInvalidation')
  const action = actionField.getValue()
  const isDECLAREVOID = action === 'DECLAREVOID'
  dateInvalidationField.setAllowBlank(!isDECLAREVOID)
  dateInvalidationField.setVisible(isDECLAREVOID)
}
