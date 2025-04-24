/* global AC appAC UB */

exports.formCode = {
  initComponentDone,
  initComponentStart,
  onClose
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

async function onFormDataReady () {
  const me = this
  const schemeKind = await UB.Repository('hr_dictSalaryScheme')
    .attrs('schemeType')
    .where('ID', '=', me.record.get('dictSalarySchemeID'))
    .selectScalar()
  if (schemeKind !== '1') {
    me.down('[name=calcBtn]').hide()
  }
}

function onControlChanged (field, value) {
  let me = this
  switch (field.name) {
    case 'code':
      me.attr.sortNumber.setValue(Number(String(value || '').replace(/[^\d]/g, '') || 0))
      break
  }
}

function onClose (ID, store, formWasSaved) {
  const me = this
  if (formWasSaved) {
    AC.gridUtils.refreshSenderGrid(me)
  }
}
