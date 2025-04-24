/* global AC HR moment */
exports.formCode = {
  setCategoryFilter: function (value) {
    const me = this
    if (me.isReadOnly) {
      return
    }
    if (value === undefined) {
      value = me.record.get('groupCategory')
    }
    AC.viewUtils.setFilterValue(me.getField('dictProfCompetencyID'), {
      groupCategory: value
    })
  },
  setTopicFilter: function ({ value, isClearFilter } = {}) {
    const me = this
    if (me.isReadOnly) {
      return
    }

    let topicCtrl = me.down('[name=dictTrainingTopicName]')
    let req = topicCtrl.getStore().ubRequest
    delete req.whereList
    if (isClearFilter) {
      return
    }
    if (value === undefined) {
      value = me.record.get('dictProfCompetencyID')
    }

    if (value) {
      req.whereList = {
        dictProfCompetency: {
          expression: '[dictProfCompetencyID]',
          condition: 'equal',
          value: value
        }
      }
    }
    topicCtrl.getStore().load()
  },
  calcPeriod: function (ctrl) {
    let me = this
    if (ctrl.getValue()) {
      let dateFrom = me.getField('dateFrom')
      let dateTo = me.getField('dateTo')
      let dayCount = me.getField('dayCount')
      switch (ctrl) {
        case dateFrom:
          if (dayCount.getValue()) {
            dateTo.setValue(moment(dateFrom.getValue()).add(dayCount.getValue() - 1, 'days').toDate())
          } else if (dateTo.getValue()) {
            dayCount.setValue(moment(dateTo.getValue()).diff(moment(dateFrom.getValue()), 'days') + 1)
          }
          break
        case dateTo:
          if (dateFrom.getValue()) {
            dayCount.setValue(moment(dateTo.getValue()).diff(moment(dateFrom.getValue()), 'days') + 1)
          }
          break
        case dayCount:
          if (dateFrom.getValue()) {
            dateTo.setValue(moment(dateFrom.getValue()).add(dayCount.getValue() - 1, 'days').toDate())
          }
          break
      }
    }
  },
  showFields: function (isShow) {
    let me = this
    isShow = isShow === undefined ? me.record.get('isFromCatalog') : isShow
    me.getField('groupCategory').setVisible(isShow)
    me.getField('dictProfCompetencyID').setVisible(isShow)
  },

  initComponentStart: function () {
    let me = this
    me.orderConfig = {
      detailGrids: []
    }

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
    })
    me.on('recordloaded', function (a) {
      let me = this
      if (me.isNewInstance) {
        me.record.set('organizationID', me.masterForm.record.get('organizationID'))
        me.record.set('isGroup', true)
        me.record.set('isPrintAddon', me.orderForm.record.get('isAppendix'))
      }
      me.enableControls()
      HR.orderManager.setDefaultValues(me)
      me.down('[name=destOrganizationName]').setValue(me.record.get('destOrganizationName'))
      me.down('[name=cityName]').setValue(me.record.get('cityName'))
      HR.orderManager.requiredIf(me)
      HR.orderManager.showIf(me)
      me.setCategoryFilter()
      me.setTopicFilter({
        isClearFilter: !me.record.get('isFromCatalog')
      })
      me.showFields()
    })
    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }
    me.on('controlChanged', (field, value) => {
      switch (field.name) {
        case 'isFromCatalog':
        {
          me.showFields(value)
          me.setCategoryFilter()
          let topicCtrl = me.down('[name=dictTrainingTopicName]')
          me.setTopicFilter({
            isClearFilter: !value
          })
          if (value) {
            topicCtrl.setValue()
          } else {
            me.record.set('groupCategory', null)
            me.record.set('dictProfCompetencyID', null)
          }
          topicCtrl.getStore().load()
          break
        }
        case 'groupCategory':
          me.setCategoryFilter(value)
          me.getField('dictProfCompetencyID').setValue()
          break
        case 'dictProfCompetencyID':
          let topicCtrl = me.down('[name=dictTrainingTopicName]')
          me.setTopicFilter({ value: value })
          if (value) {
            topicCtrl.setValue()
          }
          break
        case 'isContinueWork':
          me.setPaymentControls(value, field)
      }
    }, me)
  },

  addBaseActions: function () {
    this.callParent(arguments)
  },

  initComponentDone: function () {
    const me = this
    let grid
    me.masterForm = me.customParams.orderForm || me.sender.up('form')
    me.orderForm = me.masterForm
    me.orderState = me.masterForm.record.get('orderState')

    if (me.orderState === 'PROJECT') {
      HR.orderManager.setNextRecordMaker(me, [
        'dateFrom',
        'dayCount',
        'dateTo',
        'purpose',
        'isGroup',
        {
          destOrganizationID: value => value,
          cityID: value => value,
          destOrganizationName: value => value,
          cityName: value => value,
          organizationID: value => me.masterForm.record.get('organizationID'),
          empOrderType: value => value,
          orderID: value => value
        }
      ], 4)
    }

    if (me.sender) {
      grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
    }
    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }
    me.onAfterSave = function () {
      if (grid) {
        grid.onRefresh()
      }
    }
    me.on('beforeClose', function (a) {
      if (grid) {
        grid.onRefresh()
      }
    })

    me.on('formDataReady', async () => {
      if (me.isNewInstance) {
        me.record.set('orderID', me.masterForm.instanceID)
        me.setDefCountry()
      }
      me.masterForm.makeReasonSelector(me)
      HR.orderManager.showIf(me)
      HR.orderManager.disabledIf(me)
      HR.orderManager.requiredIf(me)
      me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
      me.setPaymentControls(me.record.get('isContinueWork'))
      const funcOrgType = AC.settings.get('hrFuncOrgType', me.record.get('organizationID'))
      if (funcOrgType === '1') {
        /* Сфера діяльності організації = Загальна */
        me.down('[ubID=trainingFieldSet]').show()
      }
      if (funcOrgType === '2') {
        /* Сфера діяльності організації = Державна служба */
        me.down('[ubID=educationFieldSet]').show()
      }
    })

    me.on('controlChanged', (field, value, oldValue) => {
      switch (field.name) {
        case 'isInsideCountry':
          me.setDefCountry(value)
          break
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
      }
      HR.orderManager.showIf(me)
      HR.orderManager.disabledIf(me)
      HR.orderManager.requiredIf(me)
    })
  },

  enableControls: function () {
    this.isReadOnly = this.masterForm.enableParaControls(this, this.query('[allowCustomText]'))
    return this.isReadOnly
  },

  onAfterSave: function () {},

  setDefCountry: function (isInsideCountry) {
    const me = this
    let isInCountry = (isInsideCountry === undefined) ? me.getField('isInsideCountry').getValue() : isInsideCountry
    if (isInCountry) {
      const defCountryID = AC.settings.get('country', null, null)
      me.record.set('countryID', defCountryID)
    }
  },

  setIsDirty: function (value) {
    const me = this
    me.setActionDisabled('save', !value)
    me.setActionDisabled('saveAndClose', !value)
    me.record.dirty = value
  },

  setPaymentControls: function (value, ctrl) {
    const me = this
    const dictTimeCostID = me.getField('dictTimeCostID')
    const payElID = me.getField('payElID')
    if (value) {
      dictTimeCostID.setDisabled(true)
      dictTimeCostID.setValue()
      payElID.setDisabled(true)
      payElID.setValue()
    } else {
      const config = me.orderAttrConfigList.length ? me.orderAttrConfigList[0] : null
      if (config) {
        if ((me.isNewInstance || (ctrl && ctrl.name === 'isContinueWork')) && !me.record.get('payElID')) {
          payElID.setValueById(config.payElIDMain)
        }
        payElID.setDisabled(!config.canEditPayElMain)
        if ((me.isNewInstance || (ctrl && ctrl.name === 'isContinueWork')) && !me.record.get('dictTimeCostID')) {
          dictTimeCostID.setValueById(config.dictTimeCostID)
        }
        dictTimeCostID.setDisabled(!config.canEditDictTimeCost)
      } else {
        payElID.setDisabled(true)
        payElID.setValue()
      }
    }
  }
}
