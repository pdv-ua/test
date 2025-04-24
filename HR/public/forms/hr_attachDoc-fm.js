/* global $App */
exports.formCode = {
  initUBComponent: function () {
    let me = this
    me.attrDoc = me.getField('document')
    me.attrCaption = me.getField('caption')
    me.getField('document').on('change', me.onChange, me)
    if (this.isEditMode) {
      this.setTitle(UB.i18n('<span style="text-align:right; width: 50%"> Додаток'))
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
    me.on('formDataReady', me.onFormDataReady, me)
    me.saveInstanceOld = me.saveInstance
    me.saveInstance = me.saveInstanceNew
  },

  onFormDataReady () {
    const me = this
    if (me.customParams && me.customParams.readOnly) {
      me.hideAction(me, 'fDelete')
      me.down('toolbar').down('menu').items.items = []
    }
  },

  hideAction (me, actionName) {
    let action = me.actions[actionName]
    if (action) {
      action.blocked = true
      action.disable()
      action.hide()
    }
    action = me.actionsKeyMap[actionName]
    if (action) {
      action.disable()
    }
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

  askToMainDocument: function (entityID, fileName) {
    let me = this
    let sender = me.sender
    return sender.askToMainDocument(entityID, fileName)
  },

  saveAttachToMainDocument: function () {
    let me = this
    let isDirty = me.attrDoc.isDirty()
    let docAttachValue = me.attrDoc.getValue()
    if (docAttachValue) {
      docAttachValue = JSON.parse(docAttachValue)
    }
    if (!isDirty || !docAttachValue || docAttachValue.deleting) return Promise.resolve(true)

    let attachmentID = me.record.get('ID')
    let entityID = me.record.get('entityID')

    return me.askToMainDocument(entityID, docAttachValue.origName).then(function (docInfo) {
      if (!docInfo) return true
      return $App.connection.getDocument({
        entity: 'hr_attachDoc',
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
  }
}
