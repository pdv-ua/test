/* global AC HR UB $App */
exports.formCode = {
  initComponentStart: function () {
    const me = this
    me.on('afterrender', function () {
      let win = this.window
      if (win) {
        if (!win.height) {
          win.height = 600
        }
        if (!win.width) {
          win.width = 800
        }
      }
      me.orderConfig = {
        detailGrids: []
      }

      if (me.orderState === 'PROJECT') {
        HR.orderManager.setNextRecordMaker(me, [{
          organizationID: value => me.masterForm.record.get('organizationID'),
          orderID: value => value,
          paraID: value => value,
          trainingDirection: value => me.record.get('trainingDirection'),
          dictTrainingKindID: value => me.record.get('dictTrainingKindID'),
          lectureCycle: value => me.record.get('lectureCycle'),
          dictSpecialityID: value => me.record.get('dictSpecialityID')
        }], 4)
      }
    })
    me.on('controlChanged', me.onControlChanged)
    me.on('recordloaded', function (a) {
      const me = this
      if (me.isNewInstance) {
        me.record.set('organizationID', me.masterForm.record.get('organizationID'))
        me.record.set('payElID', me.masterForm.record.get('payElID'))
        me.record.set('dictTimeCostID', me.masterForm.record.get('dictTimeCostID'))
      }
      me.orderForm.filterEmployeePosition(me, {
        attrToFilter: 'employeePositionID'
      })
      me.empOrderType = me.record.get('empOrderType') || (me.masterForm && me.masterForm.record.get('empOrderType'))
      HR.orderManager.setDefaultValues(me)
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
      me.enableControls()
      me.setWarning()
    })
    me.on('formDataReady', me.formDataReady)
    me.on('aftersave', me.onAfterOrderSave)
  },

  addBaseActions: function () {
    this.callParent(arguments)
  },

  formDataReady: async function () {
    const me = this
    if (!me.empOrderType) me.empOrderType = me.record.get('empOrderType') || (me.masterForm && me.masterForm.record.get('empOrderType'))
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.empOrderType, me.record.get('organizationID'))
    HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
    if (!me.isNewInstance) {
      me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, me.getField('employeePositionID').getFieldValue('dictStaffCatID'), me.getField('employeePositionID').getFieldValue('positionType'))
    }
    me.setPaymentControls()
  },

  initComponentDone: function () {
    let me = this
    if (me.customParams.orderForm) {
      me.masterForm = me.orderForm = me.customParams.orderForm
    } else {
      me.masterForm = me.sender.up('form')
      me.orderForm = (me.masterForm && me.masterForm.orderForm) || (me.masterForm.sender && me.masterForm.sender.up('form'))
    }
    me.record.store.on('update', () => {
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
    })
    me.orderState = me.orderForm.record.get('orderState')
    const empPosCtrl = me.getField('employeePositionID')
    empPosCtrl.getStore().on('load', () => {
      me.setWarning()
    })

    const isEmpAgreed = me.getField('isEmpAgreed')
    isEmpAgreed.showIf(isEmpAgreed, me)
  },

  enableControls: function () {
    const me = this
    if (me.isNewInstance) {
      me.actions.fDelete.hide()
    } else {
      me.actions.fDelete.show()
    }
    if (me.empOrderType === 'MISSION' || me.empOrderType === 'MISSION_TRAINING') {
      me.down('[ubID=payTimeBox]').show()
    }
    return me.orderForm.enableParaControls(this)
  },

  onBeforeSave: function () {
    const me = this
    return new Promise(function (resolve) {
      if (me.isSenderEntity('hr_empOrderMissionDet') && me.masterForm && me.masterForm.onBeforeEmpSave) {
        const empPosCtrl = me.getField('employeePositionID')
        let empPosReco = AC.gridUtils.getCurrentRecord(empPosCtrl)
        if (empPosReco) {
          let isEmpAgreed = me.getField('isEmpAgreed').getValue()
          return me.masterForm.onBeforeEmpSave(resolve, empPosReco.get('employeeNumberID'), empPosReco.get('employeeID'), isEmpAgreed)
        } else {
          return resolve(true)
        }
      } else {
        return resolve(true)
      }
    })
  },

  onAfterOrderSave: function () {
    const me = this
    me.enableControls()
    const senderGrid = AC.gridUtils.getSenderGrid(me)
    if (senderGrid) {
      // AC.gridUtils.refreshSenderGrid(me)
      senderGrid.fireEvent('changeData', senderGrid, 'update')
    }
  },

  onControlChanged: function (field, value, oldValue) {
    const me = this
    switch (field.name) {
      case 'dictTrainingKindID':
        let trainKindReco = AC.gridUtils.getCurrentRecord(field)
        if (trainKindReco) {
          me.record.set('dictTrainingKindID.trainingLevel', trainKindReco.get('trainingLevel'))
          me.record.set('dictTrainingKindID.dictStaffCatID.name', trainKindReco.get('dictStaffCatID.name'))
        } else {
          me.record.set('dictTrainingKindID.trainingLevel', null)
          me.record.set('dictTrainingKindID.dictStaffCatID.name', null)
        }
        break
      case 'employeePositionID':
        me.orderAttrConfig = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
        me.setPaymentControls(true)
        if (value && me.masterForm && me.masterForm.record && me.masterForm.record.get('dateFrom')) {
          if (field.getFieldValue('employeeNumberID.dateFrom') > me.masterForm.record.get('dateFrom')) {
            $App.dialogInfo(UB.i18n('Вказана дата початку відрядження менша за дату прийняття в організацію'), UB.i18n('Увага'))
          }
        }
        break
    }
  },

  setWarning: function () {
    const me = this
    if (me.masterForm && me.masterForm.getEmpWarning) {
      const empPosCtrl = me.getField('employeePositionID')
      let empPosReco = AC.gridUtils.getCurrentRecord(empPosCtrl)
      if (!empPosReco) {
        return
      }
      let getMsgPromise = me.masterForm.getEmpWarning(empPosReco.get('employeeNumberID'), empPosReco.get('employeeID'))
      const warnings = me.down('[name=warnings]')
      getMsgPromise.then(msg => {
        let hasMsg = !!msg
        if (hasMsg) {
          warnings.setText(msg)
        } else {
          warnings.setText('')
        }
        warnings.setVisible(hasMsg)
      })
    }
  },

  isSenderEntity: function (entity) {
    const me = this
    const senderGrid = AC.gridUtils.getSenderGrid(me)
    return senderGrid && senderGrid.customParams && senderGrid.customParams.entityName === entity
  },

  setPaymentControls: function (isChange) {
    const me = this
    if (me.empOrderType !== 'MISSION' && me.empOrderType !== 'MISSION_TRAINING') return
    const dictTimeCostID = me.getField('dictTimeCostID')
    const payElID = me.getField('payElID')
    const config = me.orderAttrConfig || (me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null)
    if (config) {
      if (isChange || (me.isNewInstance && !me.record.get('payElID'))) {
        if (me.orderForm.isHolidayPay !== undefined) {
          if (me.orderForm.isHolidayPay) {
            payElID.setValueById(config.payElIDAdd)
          }
          else {
            payElID.setValueById(config.payElIDMain)
          }
        }
        else 
          payElID.setValueById(config.payElIDMain)
      }
      payElID.setDisabled(!config.canEditPayElMain)
      if (isChange || (me.isNewInstance && !me.record.get('dictTimeCostID'))) {
        dictTimeCostID.setValueById(config.dictTimeCostID)
      }
      dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
    } else {
      payElID.setDisabled(true)
      dictTimeCostID.setDisabled(true)
    }
  }
}
