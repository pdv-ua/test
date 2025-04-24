/* global HR AC UB appAC */
exports.formCode = {
  getEmpOrderType,
  setDictTimeCostID,
  initComponentStart,
  initComponentDone,
  enableControls,
  onAfterOrderSave
}

function getEmpOrderType () {
  return this.customParams.empOrderType || this.record.get('empOrderType')
}

function setDictTimeCostID () {
  let me = this
  let dictTimeCostID = me.getField('dictTimeCostID')
  return UB.Repository('hr_dictTimeCost')
    .attrs('ID')
    .where('code', '=', appAC.langCodei18n('НеявкаДог'))
    .selectSingle().then(rec => {
      if (rec) {
        dictTimeCostID.setValueById(rec.ID)
      }
    })
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('formDataReady', function () {
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    HR.orderManager.disableContextMenuItems(me.getField('dictTimeCostID'), ['addItem', 'editItem'])
  })
  me.on('recordloaded', async function () {
    let me = this
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    if (me.isNewInstance) {
      me.record.set('organizationID', me.masterForm.record.get('organizationID'))
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('empOrderType', me.customParams.empOrderType)
      const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
      if (config) {
        me.record.set('payElID', config.payElIDMain)
        me.record.set('dictTimeCostID', config.dictTimeCostID)
      }
      if (!me.record.get('dictTimeCostID')) {
        me.setDictTimeCostID()
      }
    } else {
      me.customParams.empOrderType = me.record.get('empOrderType')
    }
    me.masterForm.filterEmployeePosition(me, {
      attrToFilter: 'employeePositionID'
    })

    me.enableControls()
    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.setTitleByOrderType(me)
  })
  me.onBeforeSave = () => {
    return Promise.resolve(true)
  }
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.orderForm = me.masterForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }

  me.orderState = me.orderForm.record.get('orderState')
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [{
      organizationID: value => me.orderForm.record.get('organizationID'),
      empOrderType: value => value,
      orderID: value => value,
      dateFrom: value => AC.dateService.truncTimeToUtcNull(value),
      isPaymentProp: value => value
    }], 4)
  }
}

function enableControls () {
  const me = this
  const dictTimeCostID = me.getField('dictTimeCostID')
  const payElID = me.getField('payElID')
  const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
  if (config) {
    payElID.setDisabled(!config.canEditPayElMain)
    dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
  } else {
    payElID.setDisabled(true)
    dictTimeCostID.setDisabled(true)
  }
  return this.masterForm.enableParaControls(this)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}
