/* global AC UB _ Ext HR appAC $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onBeforeSave,
  onRecordLoaded,
  onControlChanged,
  setOrdersPanels,
  setOrdersDescription
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('aftersave', onAfterSave, me)
  me.on('onBeforeSave', onBeforeSave, me)
  me.on('beforesave', beforeSave, me)

  me.actions.fDelete.hide()

  me.gridConfig = {
    detailGrids: ['positionFundSourceDt']
  }
}

function onRecordLoaded (record, data) {
  const me = this
  me.setOrdersDescription()
  const orderStore = me.attr.orderID.getStore()
  orderStore.ubRequest.whereList = {
    exists: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'hr_empOrderDet',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[orderID]=[{master}.ID]',
            condition: 'custom'
          },
          employeeNumberID: {
            condition: 'equal',
            expression: '[employeeNumberID]',
            value: me.record.get('employeeNumberID')
          }
        }
      }
    },
    orderState: {
      expression: '[orderState]',
      condition: 'in',
      value: ['POSTED', 'PROCESSED']
    },
    empOrderType: {
      expression: '[empOrderType]',
      condition: '=',
      value: 'STAFFTABLE'
    }
  }
  orderStore.ubRequest.logicalPredicates = ['([orderState] AND ([exists] OR [empOrderType]))']
  const changeOrderStore = me.attr.changeOrderID.getStore()
  changeOrderStore.ubRequest.whereList = {
    exists: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'hr_empOrderDet',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[orderID]=[{master}.ID]',
            condition: 'custom'
          },
          employeeNumberID: {
            condition: 'equal',
            expression: '[employeeNumberID]',
            value: me.record.get('employeeNumberID')
          }
        }
      }
    },
    orderState: {
      expression: '[orderState]',
      condition: 'in',
      value: ['POSTED', 'PROCESSED']
    },
    empOrderType: {
      expression: '[empOrderType]',
      condition: '=',
      value: 'STAFFTABLE'
    }
  }
  changeOrderStore.ubRequest.logicalPredicates = ['([orderState] AND ([exists] OR [empOrderType]))']
  me.detail = data.detail ? JSON.parse(data.detail) : []
  if (_.get(me, 'detail.positionFundSourceDt.length')) {
    me.attr.positionFundSourceDt.setLocalStoreData(me.detail.positionFundSourceDt)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  AC.viewUtils.setFormReadOnly(me, true, [], true)
  me.actions['fDelete'].hide()
  me.setActionDisabled('fDelete', true)
  me.setOrdersPanels(false)
  me.attr.orderID.setAllowBlank(true)
  me.attr.dimControl.setValue(me.record.getData())
  const extraFields = ['orgName', 'depNameActual', 'posStaffNameActual', 'positionTypeName']
  UB.Repository('hr_employeePositionS')
    .attrs(extraFields)
    .selectById(me.instanceID)
    .then(pos => {
      if (pos) {
        extraFields.forEach(fld => {
          me.attr[fld].setValue(pos[fld])
        })
      }
    })
  me.attr.positionFundSourceDt.setReadOnly(true)

  const hrProgClassAcc = AC.settings.get('hrProgClassAcc', appAC.globalOrganization())
  me.attr.dictProgClassID[hrProgClassAcc ? 'show' : 'hide']()
  HR.orderManager.setIsDirty(me, false)
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  if (notShowSalary) {
    me.attr.accrualSum.hide()
  }
}

function setOrdersPanels (editable = false) {
  const me = this
  me.down('[ubID=orderEditPanel]').setVisible(editable)
  me.down('[ubID=orderPanel]').setVisible(!editable)
  me.down('[ubID=changeOrderPanel]').setVisible(!editable)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['accountDimensionsControl', 'acGrid'])
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  if (AC.entityUtils.verifyRightsMethod('hr_employeePosition', 'canEditPos')) {
    allActions.menu.add({
      text: UB.i18n('Редагувати'),
      name: 'actionAllowEdit',
      handler: function () {
        let editable = ['dateFrom', 'mtCount', 'dictTarifCoeffID', 'payElID', 'dictContractKindID', 'contractType',
          'dictCategoryECBID', 'dictStaffCatID', 'dictEmpCategoryID', 'posNameAddition', 'accrualSum'
        ]
        if (AC.entityUtils.verifyRightsMethod('hr_employeePosition', 'canEditDateTo')) {
          editable.push('dateToEmpty')
        }
        editable.forEach(ctrlName => {
          me.attr[ctrlName].setReadOnly(false)
        })
        me.attr.positionFundSourceDt.setReadOnly(false)
        Ext.defer(() => {
          me.attr.dateFrom.focus()
        }, 1)
      }
    })
    allActions.menu.add({
      text: UB.i18n('Оновити фактичну назву'),
      name: 'actionUpdateFactPos',
      handler: function () {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_employeePosition',
          method: 'updateFactPosition',
          instanceID: me.instanceID
        }).then(() => {
          me.setLoading(false)
        }, err => {
          me.setLoading(false)
          throw err
        })
      }
    })
  }

  allActions.menu.add({
    text: UB.i18n('Накази'),
    name: 'actionEditOrder',
    hidden: !AC.entityUtils.verifyRightsMethod('hr_employeePosition', 'canEditOrders'),
    handler: function () {
      me.setOrdersPanels(true)
      const editable = ['orderID', 'changeOrderID']
      editable.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
        me.attr[ctrlName].disableContextMenu = false
        me.attr[ctrlName].hideEntityItemInContext = true
      })
    }
  })
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orgID') || appAC.globalOrganization()
  me.attr.positionFundSourceDt.on('changeData', (grid) => {
    const me = grid.up('form')
    const mtCountTotal = grid.getStore().data.items.reduce((sum, item) => {
      return sum + AC.currencyService.round(item.get('mtCount'))
    }, 0)
    if (grid.getStore().data.items.length) me.record.set('mtCount', AC.currencyService.round(mtCountTotal))
    HR.orderManager.setIsDirty(me, true)
  })
  if (AC.settings.get('hrOrderAllowSelectDictPosition', appAC.globalOrganization())) {
    me.attr.posNameAddition.show()
  }
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'dictCostTypeID':
        me.attr.accountID.setValueById(field.getFieldValue('accountID'))
    }
  }
}

function onAfterSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.detail = data.detail ? (typeof data.detail === 'string' ? JSON.parse(data.detail) : data.detail) : []
    if (_.get(me, 'detail.positionFundSourceDt.length')) {
      me.attr.positionFundSourceDt.setLocalStoreData(me.detail.positionFundSourceDt)
    }
  }
}

async function onBeforeSave () {
  const me = this
  const mtCountTotal = AC.currencyService.round(me.attr.positionFundSourceDt.getStore().data.items.reduce((sum, item) => {
    return sum + AC.currencyService.round(item.get('mtCount'))
  }, 0))
  if (me.record.get('mtCount') && me.attr.positionFundSourceDt.getStore().data.items.length && mtCountTotal !== me.record.get('mtCount')) {
    await $App.dialogError(UB.i18n('Загальна кількість ставок не дорівнює кількості ставок по джерелам фінансування.'))
    return false
  }
}

function beforeSave (me, params) {
  const formData = { details: {} }
  if (me.gridConfig.detailGrids) {
    me.gridConfig.detailGrids.forEach((item) => {
      let grid = me.down(`[name=${item}]`)
      formData.details[item] = grid.getAttributeData()
    })
    params.details = JSON.stringify(formData.details)
  }
}

function setOrdersDescription () {
  const me = this
  if (me.record.get('orderID.empOrderType') === 'STAFFTABLE') {
    UB.Repository('hr_staffTable')
      .attrs('entryOrderID', 'entryOrderID.description')
      .selectById(me.record.get('orderID')).then(row => {
        if (row) {
          me.attr['openingOrder'].setVisible(true)
          me.attr['openingOrder'].setReadOnly(true)
          me.attr['openingOrder'].setValue(row['entryOrderID.description'])
          me.attr['openingOrder'].inputEl.on('click', function () {
            UB.Repository('hr_order')
              .attrs(['ID', 'orderClass.entityName'])
              .selectById(row['entryOrderID'])
              .then(result => {
                const formCode = result && result['orderClass.entityName']
                const formStore = UB.core.UBStoreManager.getFormStore()
                if (formStore.findRecord('code', formCode, 0, false, true, true)) {
                  $App.doCommand({
                    cmdType: 'showForm',
                    formCode: formCode,
                    entity: result['orderClass.entityName'],
                    instanceID: row['entryOrderID'] || 0,
                    tabId: result['orderClass.entityName'] + (row['entryOrderID'] || 0),
                    target: $App.getViewport().centralPanel
                  })
                }
              })
          }, me)
        }
      })
  } else {
    HR.orderManager.setSourceOrderDescription(me, 'orderID', 'openingOrder')
  }
  if (me.record.get('closeOrderID.empOrderType') === 'STAFFTABLE') {
    UB.Repository('hr_staffTable')
      .attrs('entryOrderID', 'entryOrderID.description')
      .selectById(me.record.get('closeOrderID')).then(row => {
        if (row) {
          me.attr['closingOrder'].setVisible(true)
          me.attr['closingOrder'].setReadOnly(true)
          me.attr['closingOrder'].setValue(row['entryOrderID.description'])
          me.attr['closingOrder'].inputEl.on('click', function () {
            UB.Repository('hr_order')
              .attrs(['ID', 'orderClass.entityName'])
              .selectById(row['entryOrderID'])
              .then(result => {
                const formCode = result && result['orderClass.entityName']
                const formStore = UB.core.UBStoreManager.getFormStore()
                if (formStore.findRecord('code', formCode, 0, false, true, true)) {
                  $App.doCommand({
                    cmdType: 'showForm',
                    formCode: formCode,
                    entity: result['orderClass.entityName'],
                    instanceID: row['entryOrderID'] || 0,
                    tabId: result['orderClass.entityName'] + (row['entryOrderID'] || 0),
                    target: $App.getViewport().centralPanel
                  })
                }
              })
          }, me)
        }
      })
  } else {
    HR.orderManager.setSourceOrderDescription(me, 'closeOrderID', 'closingOrder')
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
