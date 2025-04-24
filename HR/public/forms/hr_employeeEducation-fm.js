/* global AC HR UB $App _ */
exports.formCode = {
  initComponentDone,
  initUBComponent,
  initComponentStart,
  doFormDataReady,
  onControlChanged,
  onBeforeSave
}

function onBeforeSave () {
  let me = this
  let dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))
  let dateTo = AC.dateService.truncTimeToUtcNull(me.record.get('dateTo'))
  let dateIssue = AC.dateService.truncTimeToUtcNull(me.record.get('dateIssue'))
  return UB.Repository('hr_employee')
    .attrs(['birthDate'])
    .where('ID', '=', me.record.data.employeeID)
    .selectSingle().then(birthDate => {
      if (birthDate.birthDate) {
        let birthDateUtc = AC.dateService.truncTimeToUtcNull(birthDate.birthDate)
        if (dateFrom && dateFrom <= birthDateUtc) {
          $App.dialogError(UB.i18n('Дата вступу повинна бути більшою за дату народження працівника'), 'Помилка')
          return Promise.resolve(false)
        }
      }
      if (dateFrom && dateTo && dateFrom >= dateTo) {
        $App.dialogError(UB.i18n('Дата закінчення навчання повинна бути більшою за дату вступу'), 'Помилка')
        return Promise.resolve(false)
      }
      if (dateFrom && dateIssue && dateFrom >= dateIssue) {
        $App.dialogError(UB.i18n('Дата видачі повинна бути більшою за дату вступу'), 'Помилка')
        return Promise.resolve(false)
      }
    })
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
  me.on('controlChanged', onControlChanged, me)
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

  AC.viewUtils.setWhereListProperty(me.attr.dictSpecialtyID, [
    [ 'specialityType', '=', '1', 'type1' ],
    [ 'specialityType', 'isNull', undefined, 'typeNull' ]
  ], ['([type1] OR [typeNull])'], [])

  if (me.record.get('employeeDocID')) {
    ['dictDocKindID', 'docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
      if (me.record.get(`employeeDocID.${me.attr[attrName].recordField}`)) {
        me.attr[attrName].setReadOnly(true)
      }
    })
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
    me.down('docAttachment').setReadOnly(true)
  }
  me.attr.worksAndStudies.setReadOnly(!me.record.get('dateFrom'))
}

function onControlChanged (field, value) {
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
      case 'dateFrom':
        me.attr.worksAndStudies.setReadOnly(!value)
        if (!value) {
          me.attr.worksAndStudies.setValue(false)
        }
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