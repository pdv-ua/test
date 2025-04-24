/* global AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged,
  onBeforeSave,
  setDefCountry,
  refreshDictTrainingKindData
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('onBeforeSave', onBeforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  HR.orderManager.createShowImportAction(me)
}

function onFormDataReady () {
  const me = this
  let srcOrganizationName = me.down('[name=srcOrganizationName]')
  srcOrganizationName.setValue(me.record.get('srcOrganizationName') || me.record.get('srcOrganizationID.name'))
  if (me.isNewInstance) {
    me.setDefCountry()
    me.record.set('organizationID', appAC.globalOrganization())
  }
  HR.orderManager.disabledIf(me)
  HR.orderManager.requiredIf(me)

  AC.viewUtils.setWhereListProperty(me.attr.employeeDocID, [
    [ 'employeeID', '=', me.record.get('employeeID') ]
  ], null, [])

  if (me.record.get('employeeDocID')) {
    ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'docDate'].forEach(attrName => {
      if (me.record.get(`employeeDocID.${me.attr[attrName].recordField}`)) {
        me.attr[attrName].setReadOnly(true)
      }
    })
  }
  if (me.record.get('orderID')) {
    AC.viewUtils.showToast(UB.i18n('Запис створено наказом. Тільки перегляд', UB.i18n('Увага')))
    AC.viewUtils.setFormReadOnly(me, true, ['docType', 'dictDocKindID', 'employeeDocID', 'docNumber', 'docSeries', 'docDate', 'docIssuer'])
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'isInsideCountry':
      me.setDefCountry(value)
      break
    case 'dictTrainingKindID':
      me.refreshDictTrainingKindData()
      break
    case 'employeeDocID':
      ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'docDate'].forEach(attrName => {
        const attrValue = attrName === 'docDate'
          ? AC.dateService.shiftDate(field.getFieldValue(me.attr[attrName].recordField))
          : field.getFieldValue(me.attr[attrName].recordField)
        me.attr[attrName][me.attr[attrName].setValueById ? 'setValueById' : 'setValue'](attrValue)
        me.attr[attrName].setReadOnly(!!value && !!attrValue)
      })
      break
  }
  HR.orderManager.disabledIf(me)
  HR.orderManager.requiredIf(me)
}

function onBeforeSave () {
  const me = this
  me.record.set('srcOrganizationName', me.down('[name=srcOrganizationName]').getRawValue())
}

function setDefCountry (isInsideCountry) {
  const me = this
  let isInCountry = (isInsideCountry === undefined) ? me.attr.isInsideCountry.getValue() : isInsideCountry
  if (isInCountry) {
    const defCountryID = AC.settings.get('country', null, null)
    me.record.set('countryID', defCountryID)
  }
}

function refreshDictTrainingKindData () {
  const me = this
  let trainKindReco = AC.gridUtils.getCurrentRecord(me.attr.dictTrainingKindID)
  if (trainKindReco) {
    me.record.set('dictTrainingKindID.trainingLevel', trainKindReco.get('trainingLevel'))
    me.record.set('dictTrainingKindID.dictStaffCatID.name', trainKindReco.get('dictStaffCatID.name'))
  } else {
    me.record.set('dictTrainingKindID.trainingLevel', null)
    me.record.set('dictTrainingKindID.dictStaffCatID.name', null)
  }
}
