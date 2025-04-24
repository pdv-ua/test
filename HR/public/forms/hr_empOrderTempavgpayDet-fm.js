/* global AC HR UB $App appAC Ext */
exports.formCode = {
  controlChanged,
  initComponentStart,
  enableControls,
  initComponentDone,
  onCheckValidBeforeSaveForm,
  recordLoaded,
  setPaymentControls,
  addBaseActions,
  checkDictTimeCost
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('controlChanged', controlChanged, me)
  me.on('afterrender', () => {
    me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
  })

}

function initComponentDone () {
  const me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    if (me.sender) {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
  }

  me.orderState = me.orderForm && me.orderForm.record.get('orderState')

  me.onBeforeSave = () => {
    return me.onCheckValidBeforeSaveForm()
  }

  me.on('recordloaded', recordLoaded)
  me.on('formDataReady', async () => {
    HR.orderManager.setTitleByOrderType(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['editItem', 'addItem'])
    HR.orderManager.disableContextMenuItems(me.attr.dictTimeCostID, ['editItem', 'addItem'])
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    if (!me.isNewInstance) {
      me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.attr.employeePositionID.getFieldValue('dictStaffCatID'), me.attr.employeePositionID.getFieldValue('positionType'))
    }
    me.enableControls()
  })

  AC.viewUtils.setAttr(me)
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
}

function enableControls () {
  const me = this
  const isPosted = me.orderForm ? me.orderForm.enableParaControls(me) : true
  if (!me.orderForm) {
    HR.orderManager.enableControls({
      me: me,
      isEnabled: false
    })
  }
  if (!isPosted) me.setPaymentControls()
  return isPosted
}

function recordLoaded () {
  const me = this
  if (!me.orderForm) {
    return
  }
  if (me.isNewInstance) {
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
  }
  HR.orderManager.setDefaultValues(me)
  HR.orderManager.showIf(me)
  HR.orderManager.requiredIf(me)
  me.orderForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID'
  })
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
  })
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'dictReasonTempAvgPayID',
      {
        organizationID: value => me.masterForm.record.get('organizationID'),
        payElID: value => value,
        dictTimeCostID: value => value,
        empOrderType: value => value,
        orderID: value => value,
        dateFrom: value => value,
        dateToEmpty: value => value
      }
    ], 4)
  }
  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'orderWord',
    dictReasonField: 'orderWord',
    entityName: 'hr_dictOrderDetOrderWord'
  })
}

function controlChanged (field, value, oldValue) {
  let me = this
  switch (field.name) {
    case 'employeePositionID':
      me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
      // me.setPaymentControls(true)
      break
    case 'payElID':
      me.record.set('dictTimeCostID', field.getFieldValue('dictTimeCostID'))
      me.checkDictTimeCost()
      break
  }
}

function onCheckValidBeforeSaveForm () {
  const me = this
  if (me.attr.dateToEmpty.getValue() && me.attr.dateFrom.getValue() > me.attr.dateToEmpty.getValue()) {
    $App.dialogInfo(UB.i18n(`Дата початку ${AC.dateService.formatDate(me.attr.dateFrom.getValue())} не може бути більшою за дату прийняття ${AC.dateService.formatDate(me.attr.dateToEmpty.getValue())}!`))
    return Promise.resolve(false)
  }
  if (!me.checkDictTimeCost()) {
    return Promise.resolve(false)
  }
  /*
  return $App.connection.run({
    entity: me.entityName,
    method: 'checkCrossTimeSheet',
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    dictTimeCostID: me.attr.dictTimeCostID.getValue(),
    dateFrom: me.attr.dateFrom.getValue(),
    dateTo: me.attr.dateTo.getValue()
  }).then(mParams => {
    if (mParams.result) {
      const result = JSON.parse(mParams.result)
      if (Array.isArray(result) && result.length) {
        const msg = UB.i18n(`У табелі існують елементи, для яких неможливий перетин з "{0}": `, me.attr.dictTimeCostID.getFieldValue('nameSmall'))
        return $App.dialogYesNo(UB.i18n('Попередження'), msg + result.slice(1, 50).join(', ') + UB.i18n('... Зберегти ?')).then(isAgree => {
          return Promise.resolve(isAgree)
        })
      } else {
        return Promise.resolve(true)
      }
    } else {
      return Promise.resolve(true)
    }
  })
  */
}

function setPaymentControls (isSetValue) {
  const me = this
  const config = me.orderAttrConfig
  if (config) {
    // me.attr.payElID.setDisabled(!config.canEditPayElMain)
    if (isSetValue) {
      me.record.set('payElID', config.payElIDMain)
    }
  } else {
    // me.attr.payElID.setDisabled(true)
    // me.attr.dictTimeCostID.setDisabled(true)
  }
}

function checkDictTimeCost () {
  const me = this
  if (me.attr.payElID.getValue() && !me.attr.payElID.getFieldValue('dictTimeCostID')) {
    $App.dialogInfo(UB.i18n(`Для вибраного виду оплати у довіднику не встановлений елемент обліку робочого часу. Неможливо коректне заповнення табелю обліку робочого часу. Виберіть інший вид оплати або виправте в довіднику.`))
    return false
  }
  return true
}
