/* global UB AC HR  */
exports.formCode = {
  recordLoaded,
  initComponentStart,
  addBaseActions,
  initComponentDone,
  enableControls,
  onAfterOrderSave
}

function recordLoaded (a) {
  let me = this

  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
  })
  HR.orderManager.showIf(me)
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    let paraID = me.record.get('paraID')
    if (paraID) {
      UB.Repository('hr_empOrderDet').attrs(['ID', 'mi_unityEntity', 'dateFrom', 'dateTo']).selectById(paraID).then(data => {
        if (data) {
          me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(data.dateFrom))
          me.record.set('dateTo', AC.dateService.truncTimeToUtcNull(data.dateTo))
        }
      })
    }
  }
  me.orderForm && me.orderForm.filterEmployeePosition(me, { attrToFilter: 'employeePositionID' })
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
}

function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('recordloaded', recordLoaded)
  me.on('onBeforeSave', onBeforeSave, me)
}

function addBaseActions () {
  this.callParent(arguments)
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.sender.up('form')
    me.orderForm = me.masterForm && me.masterForm.orderForm
  }
  me.orderState = (me.orderForm && me.orderForm.record.get('orderState')) || 'POSTED'
  if (me.orderState === 'PROJECT') {
    HR.orderManager.setNextRecordMaker(me, [
      'paraID',
      {
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }], 4)
  }
}

function enableControls () {
  const me = this
  const isEnabled = me.orderState === 'PROJECT'
  me.query('[attributeName]').forEach(item => item.setReadOnly && item.setReadOnly(!isEnabled))
  me.actions.fDelete.setDisabled(!isEnabled)
  const condition = me.down('[name=condition]')
  condition.setReadOnly(!isEnabled)
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

async function onBeforeSave () {
  const me = this
  await HR.orderManager.checkEmpOrderAccDateFrom(me)
}
