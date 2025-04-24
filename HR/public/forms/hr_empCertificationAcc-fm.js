/* global AC HR _ appAC */
exports.formCode = {
  initComponentDone,
  initUBComponent,
  initComponentStart,
  doFormDataReady,
  controlChanged
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function initUBComponent () {
  const me = this
  me.sender = me.sender || me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
}

function initComponentStart () {
  const me = this

  me.on('formDataReady', doFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
}

function doFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }

  AC.viewUtils.setWhereListProperty(me.attr.employeeDocID, [
    [ 'employeeID', '=', me.record.get('employeeID') ]
  ], null, [])

  if (me.record.get('employeeDocID')) {
    ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
      if (me.record.get(`employeeDocID.${me.attr[attrName].recordField}`)) {
        me.attr[attrName].setReadOnly(true)
      }
    })
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  me.attr.dictEmpCategoryID.setAllowBlank(AC.settings.get('hrCertificationObligAttrs', appAC.globalOrganization()) === '2')
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
    me.down('docAttachment').setReadOnly(true)
  }
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeeDocID':
        ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
          const attrValue = attrName === 'dateIssue'
            ? AC.dateService.shiftDate(field.getFieldValue(me.attr[attrName].recordField))
            : field.getFieldValue(me.attr[attrName].recordField)
          me.attr[attrName][me.attr[attrName].setValueById ? 'setValueById' : 'setValue'](attrValue)
          me.attr[attrName].setReadOnly(!!value && !!attrValue)
        })
        break
    }
  }
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
