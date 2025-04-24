/* global AC HR appAC UB */
/* global Ext $App _ XLSX Blob saveAs FileReader js_beautify  JSLINT js_beautify DevUtils localStorage UB AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged/*,
  setDefCountry,
  setCategoryFilter//*/
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  /*const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
  HR.orderManager.createShowImportAction(me)
  //*/
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onFormDataReady () {
  const me = this

  var isPatent = me.record.get('typeSuccess') === '1' // HR_SUCCESS_TYPE.Патент
  var isPublication = me.record.get('typeSuccess') === '2' // HR_SUCCESS_TYPE.Публікація

  me.attr.dictPublicationKindID.setReadOnly(!isPublication)
  me.attr.publishingHouse.setReadOnly(!isPublication)
  me.attr.publicationName.setReadOnly(!isPublication)
  me.attr.pagesNumber.setReadOnly(!isPublication)

  me.attr.dictDocBasisKindID.setReadOnly(!isPatent)
  me.attr.docBasisNumber.setReadOnly(!isPatent)
  me.attr.docBasisSeries.setReadOnly(!isPatent)
  me.attr.docBasisDate.setReadOnly(!isPatent)

  /*if (me.isNewInstance) {
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
    AC.viewUtils.setFormReadOnly(me, true)
  }
  //*/
}

function onControlChanged (field, value, oldValue) {
  const me = this

  switch (field.name) {
    case 'typeSuccess':
      var isPatent = field.getValue() === '1' // HR_SUCCESS_TYPE.Патент
      var isPublication = field.getValue() === '2' // HR_SUCCESS_TYPE.Публікація

      me.attr.dictPublicationKindID.setReadOnly(!isPublication)
      me.attr.publishingHouse.setReadOnly(!isPublication)
      me.attr.publicationName.setReadOnly(!isPublication)
      me.attr.pagesNumber.setReadOnly(!isPublication)
    
      if (!isPublication) {
        me.attr.dictPublicationKindID.setValue(null)
        me.attr.publishingHouse.setValue(null)
        me.attr.publicationName.setValue(null)
        me.attr.pagesNumber.setValue(null)
      }

      me.attr.dictDocBasisKindID.setReadOnly(!isPatent)
      me.attr.docBasisNumber.setReadOnly(!isPatent)
      me.attr.docBasisSeries.setReadOnly(!isPatent)
      me.attr.docBasisDate.setReadOnly(!isPatent)

      if (!isPatent) {
        me.attr.dictDocBasisKindID.setValue(null)
        me.attr.docBasisNumber.setValue(null)
        me.attr.docBasisSeries.setValue(null)
        me.attr.docBasisDate.setValue(null)
      }

      break
  }

  /*switch (field.name) {
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
  //*/
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
      DevUtils.showg(me.entityName)
    }
  })
}
/*
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
//*/
