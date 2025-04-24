/* global UB */
exports.formCode = {
  initUBComponent,
  onChange
}

function initUBComponent () {
  let me = this
  me.attrDoc = me.getField('document')
  me.attrCaption = me.getField('caption')
 // me.on('beforeClose', me.beforeClose, me)
  me.getField('document').on('change', me.onChange, me)
  if (this.isEditMode) {
    this.setTitle(UB.i18n('<span style="text-align:right; width: 50%"> Додаток'))
  } else {
    this.setTitle('<span style="text-align:right; width: 50%">' + UB.i18n('Додаток') + UB.format(' ({0})', UB.i18n('dobavlenie')) || '----')
  }
}

function onChange () {
  let me = this
  let documentValue = me.attrDoc.getValue()
  let originalValue = me.attrDoc.originalValue
  if (originalValue !== documentValue) {
    originalValue = JSON.parse(originalValue && originalValue.length ? originalValue : '{}')
    documentValue = JSON.parse(documentValue && documentValue.length ? documentValue : '{}')
    if (documentValue.deleting) {
      me.attrCaption.setValue(null)
    } else {
      if (originalValue.md5 !== documentValue.md5 || originalValue.origName !== documentValue.origName) {
        let fileName = documentValue.origName || null
        me.attrCaption.setValue(fileName)
      }
    }
  }
}

/*function beforeClose () {
  const me = this
  if (me.sender) {
    let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    if (grid) {
      grid.onRefresh()
    }
  }
}*/
