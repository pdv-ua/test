/* global Ext AC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  onAfterSave,
  enableControls
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', me.onFormDataReady, me)
  me.on('afterSave', me.onAfterSave, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  filterEmpOrderSickness(me)
}

function onFormDataReady () {
  const me = this
  me.enableControls()
}

function onControlChanged (field, value, oldValue) {
  switch (field.name) {
    case 'isPay':
      break
  }
}

function onAfterSave () {
  const me = this
  me.enableControls()
}

function enableControls () {
  const me = this
  let reco = me.record
  const isPosted = (reco.get('sicknessMeetingID.orderState') === 'POSTED')
  const attrs = Object.keys(me.attr)
  attrs.forEach((attrName) => {
    let ctrl = me.attr[attrName]
    ctrl && ctrl.setDisabled && ctrl.setDisabled(isPosted)
  })
}

function filterEmpOrderSickness (me) {
  UB.Repository('hr_empOrderSickness')
    .attrs(['ID', 'description'])
    .where('illnessKind', '=', '1')
    .where('orderState', '=', 'POSTED')
    .notExists(UB.Repository('hr_sicknessMeetingDt')
      .correlation('empOrderSicknessID', 'ID')
      .where('empOrderSicknessID.illnessKind', '=', '1')
      .where('empOrderSicknessID.orderState', '=', 'POSTED')
      .where('mi_deleteDate', '=', AC.dateService.maxDate()))
    .orderBy('description', 'asc')
    .selectAsObject()
    .then(data => {
      me.attr.empOrderSicknessID.store = Ext.create('Ext.data.Store', { fields: ['ID', 'description'],
        data: data
      })
    })
}
