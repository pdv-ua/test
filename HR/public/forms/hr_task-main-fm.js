/* global $App, UB, appAC AC */
exports.formCode = {
  getEventButton (event) {
    const me = this
    return me.query('button[event=' + event + ']')[0]
  },
  initUBComponent: function () {
    const me = this

    me.getDockedItems('toolbar[dock="top"]')[0].setVisible(false)
    me.headerPanel && me.headerPanel.setVisible(false)
    const newState = me.record.get('mi_wfState')
    if (newState !== 'NEW') {
      me.disableEdit()
      me.getEventButton('approve').hide()
      me.getEventButton('reject').hide()
      me.getField('executionDate').show()
    }

    let entityName = me.record.get('docID.orderClass.entityName')
    if (entityName === 'hr_empOrder' && newState === 'NEW' && AC.entityUtils.verifyRightsMethod(entityName, 'canEditOnReconciliation')) {
      me.getEventButton('editOrder').setVisible(true)
    }
    me.getEventButton('editOrder').on('click', () => {
      if (me.record.get('docID.empOrderType') === 'EXTRACT') {
        entityName = 'hr_empOrderExtract'
      }
      $App.dialogYesNo('Увага', UB.i18n('Всі раніше виконані дії щодо погодження цього документу будуть скасовані! Продовжити?')).then(result => {
        if (result) {
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_empOrder',
            method: 'editOnReconciliation',
            orderID: me.record.get('docID')
          }).then(() => {
            $App.doCommand({
              cmdType: 'showForm',
              entity: entityName,
              instanceID: me.record.get('docID'),
              target: $App.getViewport().centralPanel,
              tabId: entityName + me.record.get('docID'),
              isModal: false,
              isModalDialog: false
            })
            me.close()
          }).catch(e => {
            me.setLoading(false)
            throw e
          })
        }
      })
    })
    me.getEventButton('showOrder').on('click', () => {
      if (me.record.get('docID.empOrderType') === 'EXTRACT') {
        entityName = 'hr_empOrderExtract'
      }

      $App.doCommand({
        cmdType: 'showForm',
        entity: entityName,
        instanceID: me.record.get('docID'),
        target: $App.getViewport().centralPanel,
        tabId: entityName + me.record.get('docID'),
        isModal: false,
        isModalDialog: false
      })
    })
    if (me.record.get('comments')) {
      me.getField('comments').show()
    }

    const onClickApprove = () => {
      let entityName = me.record.get('docID.orderClass.entityName')
      if (me.record.get('docID.empOrderType') === 'EXTRACT') {
        entityName = 'hr_empOrderExtract'
      }
      me.maskForm()
      me.saveInstance().then(F => {
        return UB.Repository('ac_settingsOrg')
          .attrs(['value'])
          .where('organizationID', '=', appAC.globalOrganization())
          .where('[constantID.code]', '=', 'useCEP')
          .selectScalar()
          .then(r => r === '1')
      }).then(useCEPValue => {
        if (useCEPValue) {
          const docID = me.record.get('participantID.recStageID.docID')
          let signatureID
          me.maskForm()
          return $App.connection.pki().then(/** @param pki {UbPkiInterface} */pki => {
            return $App.connection.getDocument({
              entity: entityName,
              attribute: 'document',
              ID: docID
            }, {
              bypassCache: true, resultIsBinary: true
            }).then(docBin => {
              const signedDoc = pki.sign(docBin, true)
              const cachingPrivateKey = AC.settings.get('cachingPrivateKey', appAC.globalOrganization())
              if (!cachingPrivateKey) {
                pki.closePrivateKey()
              }
              return signedDoc
            })
          }).then(function (binSignature) {
            return $App.connection.addNewAsObject({
              entity: 'hr_empOrderSignature',
              fieldList: ['ID']
            }).then(rec => {
              signatureID = rec.ID

              return $App.connection.setDocument(binSignature, {
                entity: 'hr_empOrderSignature',
                attribute: 'signature',
                ID: signatureID,
                filename: signatureID + '.p7s'
              })
            })
          }).then(signatureJSON => {
            return $App.connection.runTrans([{
              entity: 'hr_empOrderSignature',
              method: 'insert',
              execParams: {
                ID: signatureID,
                docID: me.record.get('docID'),
                participantID: me.record.get('participantID'),
                signature: signatureJSON
              }
            }, {
              entity: 'hr_task',
              method: 'setResolution',
              ID: me.instanceID,
              resolution: 'ACCEPTED'
            },
            {
              entity: 'hr_empOrdListAppruv',
              method: 'updateEmpOrdListAppruvList',
              taskID: me.instanceID
            }])
          }).then(() => {
            $App.dialogInfo(UB.i18n('Було створено КЕП'))
          })
        } else {
          return $App.connection.run({
            entity: 'hr_task',
            method: 'setResolution',
            ID: me.instanceID,
            resolution: 'ACCEPTED'
          })
        }
      }).then(function () {
        if (me.store) {
          me.store.load()
        }
        me.close()
      }).finally(() => {
        me.unmaskForm()
      })
    }
    me.on('formDataReady', function () {
      if (me.defaultValues && me.defaultValues.isClickApprove) {
        onClickApprove()
      }
      me.down('[name=docDocument]').setVisible(me.record.get('participantID.recStageID.docID'))
    })
    me.getEventButton('approve').on('click', onClickApprove, me)
    me.getEventButton('reject').on('click', () => {
      let resolutionText = me.record.get('resolutionText')
      if (!resolutionText) {
        $App.dialogInfo(UB.i18n('Необхідно заповнити зміст резолюції'))
        return
      }
      me.record.set('resolution', 'REJECTED')
      me.record.set('executionDate', AC.dateService.unshiftDate(AC.dateService.currentDateTime()))
      me.saveInstance()
        .then(f => {
          if (me.store) {
            me.store.load()
          }
          $App.connection.run({
            entity: 'hr_dictMailTmplByEvents',
            method: 'mailDeclineDocEvent',
            taskID: me.instanceID,
            docID: me.record.get('docID'),
            resolutionText: me.record.get('resolutionText'),
            organizationID: me.record.get('organizationID')
          })
          me.close()
        })
    }, me)
    // let pdfEd = me.down('ubpdf')
  }
}
