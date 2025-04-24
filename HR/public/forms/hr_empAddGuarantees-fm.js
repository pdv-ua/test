/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  controlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.employeeDocID, {
    employeeID: me.record.get('employeeID')
  })

  if (me.record.get('employeeDocID')) {
    ['docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
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
  }
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeeDocID':
        ['docNumber', 'docSeries', 'docIssuer', 'dateIssue'].forEach(attrName => {
          const attrValue = attrName === 'dateIssue'
            ? AC.dateService.shiftDate(field.getFieldValue(me.attr[attrName].recordField))
            : field.getFieldValue(me.attr[attrName].recordField)
          me.attr[attrName][me.attr[attrName].setValueById ? 'setValueById' : 'setValue'](attrValue)
          me.attr[attrName].setReadOnly(!!value && !!attrValue)
        })
        break
      case 'dateFrom':
        if (value && AC.dateService.isValid(value)) {
          me.attr.dateToEmpty.setMinValue(value)
        } else {
          me.attr.dateToEmpty.setMinValue()
        }
        break
    }
  }
}
