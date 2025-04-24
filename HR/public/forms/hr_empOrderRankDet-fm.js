/* global HR AC $App UB appAC */
exports.formCode = {
  initComponentStart,
  initUBComponent,
  initComponentDone,
  addBaseActions,
  setNextRank,
  getRankPaySum,
  enableControls,
  onAfterOrderSave,
  onControlChanged
}

function setNextRank (employeeID) {
  let me = this
  if (employeeID) {
    $App.connection.run({
      entity: 'hr_employee',
      method: 'getNextPublServRang',
      onDate: new Date(me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate')),
      employeeID: employeeID
    }).then(mParams => {
      const dictRankCtrl = me.getField('dictRankID')
      if (dictRankCtrl) dictRankCtrl.setValueById(mParams.dictRankID)
      me.curRankCode = parseInt(mParams.curRankCode) || null
      if (me.curRankCode === 1) {
        if (dictRankCtrl) dictRankCtrl.setValueById(mParams.curRankID)
      }
      me.getRankPaySum(mParams.curRankID)
    })
  } else {
    me.getField('dictRankID').setValueById(null)
    me.curRankCode = null
  }
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
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
    me.orderConfig = {
      detailGrids: []
    }
  })

  me.on('formDataReady', async function () {
    me.masterForm.makeReasonSelector(me)
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    if (me.orderState === 'PROJECT') {
      const onDate = me.record.get('dateFrom') || me.record.get('orderDate') || me.record.get('entryDate') || appAC.globalApplicationDate()
      let employeePositionCtrl = me.getField('employeePositionID')
      let store = employeePositionCtrl.getStore()
      if (store) {
        store.ubRequest.whereList = {
          ePosFrom: {
            expression: '[dateFrom]',
            condition: 'lessEqual',
            value: onDate

          },
          ePosTo: {
            expression: '[dateTo]',
            condition: 'moreEqual',
            value: onDate
          },
          o: {
            expression: '[organizationID]',
            condition: 'equal',
            value: me.record.get('organizationID')
          }
        }
        store.load()
      }
    }
    if (!me.isNewInstance && !me.curRankCode) {
      $App.connection.run({
        entity: 'hr_employee',
        method: 'getNextPublServRang',
        onDate: AC.dateService.shiftDate(me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate')),
        employeeID: me.record.get('employeePositionID.employeeID')
      }).then(mParams => {
        me.curRankCode = parseInt(mParams.curRankCode) || null
      })
    }
    if (me.isNewInstance) {
      const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
      if (config) {
        me.record.set('payElID', config.payElIDMain)
      }
    }
    me.enableControls()
  })

  me.on('recordloaded', function () {
    let me = this
    HR.orderManager.showIf(me)
    if (me.isNewInstance) {
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate')))
      me.record.set('orderID', me.masterForm.instanceID)
      UB.Repository('hr_dictRankAssignKind')
        .attrs('ID')
        .where('code', '=', '2') // чергове
        .selectSingle().then(data => {
          if (data) {
            me.getField('rankAssignKindID').setValueById(data.ID)
          }
        })
    }
    HR.orderManager.setDefaultValues(me)
    me.curRankCode = null
  })

  me.onBeforeSave = async () => {
    const dictRankCtrl = me.down('[name=dictRankID]')
    const empID = me.getField("employeePositionID").getFieldValue("employeeID")
    const result = await HR.orderManager.offerToCorrectSeveralPublServRang(me, empID)
    if (result == false ) return false
    
    return HR.orderManager.checkRankPsCategory(me.down('[name=employeePositionID]').getFieldValue('psCatCode'), dictRankCtrl.getFieldValue('code'))
      .then((result) => {
        if (result) {
          return HR.orderManager.checkRankValue(me, dictRankCtrl, true)
        } else {
          return Promise.resolve(false)
        }
      })
  }

  /*me.on('beforeClose', function () {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })*/
}

function addBaseActions () {
  this.callParent(arguments)
}

function getRankPaySum (dictRankID) {
  const me = this
  if (!dictRankID) dictRankID = me.getField('dictRankID').getValue()
  if (dictRankID) {
    const onDate = AC.dateService.shiftDate(me.masterForm.record.get('orderDate') || me.masterForm.record.get('entryDate'))
    UB.Repository('hr_dictSalaryRank')
      .attrs('paySum')
      .where('dictRankID', '=', dictRankID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle().then(data => {
        if (data) {
          me.record.set('paySum', data.paySum)
        }
      })
  }
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.masterForm = me.customParams.orderForm
  } else {
    me.masterForm = me.sender.up('form')
  }
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
  })
  me.orderState = me.masterForm.record.get('orderState')
  me.on('controlChanged', onControlChanged, me)
}

function initUBComponent () {
  const me = this
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.masterForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value,
      rankAssignKindID: value => value,
      dictRankID: value => value
    }], 4)
  }
}

function enableControls () {
  const me = this
  const payElCtrl = me.getField('payElID')
  if (payElCtrl && payElCtrl.rendered) {
    const config = me.orderAttrConfigList && me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
    if (config) {
      payElCtrl.setDisabled(!config.canEditPayElMain)
    } else {
      payElCtrl.setDisabled(true)
    }
  }
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'dictRankID':
      field.clearInvalid()
      HR.orderManager.checkRankValue(this, field)
      me.getRankPaySum(value)
      break
    case 'employeePositionID':
      me.setNextRank(field.getFieldValue('employeeID'))
      break
  }
}
