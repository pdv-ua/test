/* global AC HR appAC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged,
  setDefCountry,
  setCategoryFilter
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
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
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.setDefCountry()
    const currentOrgID = appAC.globalOrganization()
    me.record.set('organizationID', currentOrgID)
    const byOrganizationNameCtrl = me.down('[name=byOrganizationName]')
    byOrganizationNameCtrl.setValue(appAC.globalOrganizationName())
    me.record.set('byOrganizationID', currentOrgID)
  } else {
    me.setCategoryFilter(me.record.get('groupCategory'))
    AC.viewUtils.setFilterValue(me.attr.dictTrainingTopicID, {
      dictProfCompetencyID: me.record.get('dictProfCompetencyID')
    })
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
    AC.viewUtils.setFormReadOnly(me, true, ['docType', 'employeeDocID', 'dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'docDate'])
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'isInsideCountry':
      me.setDefCountry(value)
      break
    case 'hours':
      if (value) {
        let ects = AC.currencyService.round(1.0 * value / 30, 2)
        me.record.set('ects', ects)
      }
      break
    case 'groupCategory':
      me.setCategoryFilter(value)
      break
    case 'dictProfCompetencyID':
      AC.viewUtils.setFilterValue(me.attr.dictTrainingTopicID, {
        dictProfCompetencyID: value
      })
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

function setDefCountry (isInsideCountry) {
  const me = this
  let isInCountry = (isInsideCountry === undefined) ? me.attr.isInsideCountry.getValue() : isInsideCountry
  if (isInCountry) {
    const defCountryID = AC.settings.get('country', null, null)
    me.record.set('countryID', defCountryID)
  }
}

function setCategoryFilter (value) {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.dictProfCompetencyID, {
    groupCategory: value
  })
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
