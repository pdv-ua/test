/* global $App UB AC */

exports.formCode = {

  initComponentDone: function () {
    const me = this
    if (me.sender && me.sender.readOnly) {
      me.isReadOnly = true
      AC.viewUtils.setFormReadOnly(me, true)
      me.canEdit = false
      me.actions['fDelete'].hide()
      me.setActionDisabled('fDelete', true)
    }
  },

  initUBComponent: function () {
    let me = this
    me.attrDoc = me.getField('document')
    me.attrCaption = me.getField('caption')
    me.on('beforeClose', me.beforeClose, me)
    me.getField('document').on('change', me.onChange, me)
    if (this.isEditMode) {
      this.setTitle('<span style="text-align:right; width: 50%">' + UB.i18n('Додаток'))
    } else {
      this.setTitle('<span style="text-align:right; width: 50%">' + UB.i18n('Додаток') + UB.format(' ({0})', UB.i18n('dobavlenie')) || '----')
    }
    if (me.initialConfig && me.initialConfig.sender && me.initialConfig.sender.showOriginal) {
      let showOriginalMenuItem = me.query('menucheckitem[eventId=showOriginal]')[0]
      if (showOriginalMenuItem) {
        showOriginalMenuItem.setChecked(me.initialConfig.sender.showOriginal)
        me.onShowOriginal(showOriginalMenuItem)
      }
    }

    me.on('aftersave', me.aftersave, me)
    me.on('afterdelete', me.afterdelete, me)

    me.saveInstanceOld = me.saveInstance
    me.saveInstance = me.saveInstanceNew
  },

  saveInstanceNew: function (force) {
    let me = this
    let sender = me.sender

    return me.saveAttachToMainDocument().then(function (oldSave) {
      if (oldSave) {
        return me.saveInstanceOld(force)
      }

      if (sender) {
        sender.fireEvent('aftersaveToMainDocument', me)
      }

      me.closeForce = true
      me.closeWindow(true)
      me.deleteInstanceID()

      return -1
    })
  },

  askToMainDocument: function (documentID, fileName) {
    let me = this
    let sender = me.sender
    return sender.askToMainDocument(documentID, fileName)
  },

  saveAttachToMainDocument: function () {
    let me = this

    let isDirty = me.attrDoc.isDirty()
    let docAttachValue = me.attrDoc.getValue()
    if (docAttachValue) {
      docAttachValue = JSON.parse(docAttachValue)
    }

    let attachmentID = me.record.get('ID')
    let documentID = me.record.get('documentID')

    if (!isDirty || !docAttachValue || docAttachValue.deleting) return Promise.resolve(true)

    return me.askToMainDocument(documentID, docAttachValue.origName).then(function (docInfo) {
      if (docInfo) {
        return $App.connection.getDocument({
          entity: 'hr_orderAttachment',
          attribute: 'document',
          isDirty: docAttachValue.isDirty,
          ID: attachmentID
        }, {
          bypassCache: true, resultIsBinary: true
        }).then(function (contentData) {
          return $App.connection.post('setDocument', contentData, {
            params: {
              entity: docInfo.mi_unityEntity,
              attribute: 'document',
              ID: docInfo.ID,
              filename: docAttachValue.origName
            },
            headers: { 'Content-Type': 'application/octet-stream' }
          })
        }).then(function (response) {
          let resultValue = response.data
          return JSON.stringify(resultValue.result)
        }).then(function (resultDocumentValue) {
          let query = {
            entity: docInfo.mi_unityEntity,
            method: 'update',
            fieldList: ['ID', 'document', 'mi_modifyDate', 'mi_modifyUser'],
            __skipOptimisticLock: true,
            execParams: {
              ID: docInfo.ID,
              document: resultDocumentValue,
              mi_modifyDate: docInfo.mi_modifyDate,
              mi_modifyUser: docInfo.mi_modifyUser
            }
          }
          return $App.connection.run(query).then(function () {
            return false
          })
        })
      }

      return true
    })
  },

  aftersave: function () {
    let me = this
    let sender = me.sender

    if (sender) {
      sender.fireEvent('aftersave', me)
    }
  },

  afterdelete: function () {
    let me = this
    let sender = me.sender

    if (sender) {
      sender.fireEvent('afterdelete', me)
    }
  },

  onChange: function () {
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
  },

  beforeClose: function () {
    const me = this
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  }
}
