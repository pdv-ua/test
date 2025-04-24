/* global HR AC $App _ appAC UB Ext AC appHR COA */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  setDimensionFilter,
  postInit,
  onFormDataReady,
  onControlChanged,
  onAfterOrderSave,
  onGridEdit,
  reCalc,
  onCheckValidBeforeSaveOrder
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDtRD', 'orderRegistryDtRL'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
  if (!me.actions.calcAction) {
    me.actions.calcAction = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcAction',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcAction',
      handler: function () {
        if (me.isFilter) {
          me.isFilter = !me.isFilter
          me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
          const btn = me.down('[name=filterButton]')
          btn.addCls(me.isFilter ? 'custom-action_btn' : '')
          btn.removeCls(!me.isFilter ? 'custom-action_btn' : '')
          btn.setTooltip(me.isFilter ? UB.i18n('Виключити додаткові параметри') : UB.i18n('Додаткові параметри'))
        }
        me.reCalc(me)
      }
    })
  }

  me.actions.filterButtonAction = new Ext.Action({
    xtype: 'button',
    name: 'filterButton',
    iconCls: 'u-icon-layers',
    text: UB.i18n('Додаткові параметри'),
    handler: function (btn) {
      me.isFilter = !me.isFilter
      if (me.isFilter) {
        me.setLoading(true)
        me.gridData = {}
        me.orderConfig.detailGrids.forEach(gridName => {
          me.gridData[gridName] = me.attr[gridName].getData()
        })
        me.attr.dictProgClassList[AC.settings.get('hrProgClassAcc', appAC.globalOrganization()) ? 'show' : 'hide']()
        me.attr.dictProjectList[AC.settings.get('hrProjectAcc', appAC.globalOrganization()) ? 'show' : 'hide']()
        me.setLoading(false)
      } else {
        me.setLoading(true)
        me.orderConfig.detailGrids.forEach(gridName => {
          const store = me.attr[`${gridName}`].getStore()
          Ext.suspendLayouts()
          me.attr[`${gridName}`].suspendEvents()
          store.suspendEvents()
          me.attr[`${gridName}`].setLocalStoreData(me.gridData[gridName])
          me.attr[`${gridName}`].resumeEvents()
          store.resumeEvents()
          Ext.resumeLayouts(true)
          me.attr[`${gridName}`].getView().refreshView()
        })
        me.setLoading(false)
      }
      me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
      btn.addCls(me.isFilter ? 'custom-action_btn' : '')
      btn.removeCls(!me.isFilter ? 'custom-action_btn' : '')
      btn.setTooltip(me.isFilter ? UB.i18n('Виключити додаткові параметри') : UB.i18n('Додаткові параметри'))
    }
  })
}
function setDimensionFilter (me) {
  me.setLoading(true)
  const fundSourceList = me.attr.dictFundSourceList.getValue() ? me.attr.dictFundSourceList.getValue().split(',').map(o => Number(o)) : null
  const departmentList = me.attr.departmentList.getValue() ? me.attr.departmentList.getValue().split(',').map(o => Number(o)) : null
  const dictProgClassList = me.attr.dictProgClassList.getValue() ? me.attr.dictProgClassList.getValue().split(',').map(o => Number(o)) : null
  const dictProjectList = me.attr.dictProjectList.getValue() ? me.attr.dictProjectList.getValue().split(',').map(o => Number(o)) : null
  const fundSourceIDs = []
  const departmentIDs = []
  const dictProgClassIDs = []
  const dictProjectIDs = []
  const dimFilterValue = {}
  let dimFilter = false
  if (!me.dimensionControl) {
    me.dimensionControl = {}
  }
  Object.keys(me.dimensionControl).forEach(entityName => {
    if (me.dimensionControl[entityName] && me.dimensionControl[entityName].control && me.dimensionControl[entityName].control.getValue()) {
      dimFilterValue[me.dimensionControl[entityName].dimID] = me.dimensionControl[entityName].control.getValue().split(',').map(o => Number(o))
      dimFilter = true
    }
  })

  me.orderConfig.detailGrids.forEach(gridName => {
    const data = me.gridData[gridName]
    const resultData = []
    data.forEach(row => {
      const accrualDt = row.accrualDt ? JSON.parse(row.accrualDt) : []
      const resultAccrualDt = []
      let paySum = 0
      accrualDt.forEach(aDt => {
        if (aDt.dictFundSourceID && !fundSourceIDs.find(o => o === aDt.dictFundSourceID)) {
          fundSourceIDs.push(aDt.dictFundSourceID)
        }
        if (aDt.departmentID && !departmentIDs.find(o => o === aDt.departmentID)) {
          departmentIDs.push(aDt.departmentID)
        }
        if (aDt.dictProgClassID && !dictProgClassIDs.find(o => o === aDt.dictProgClassID)) {
          dictProgClassIDs.push(aDt.dictProgClassID)
        }
        if (aDt.dictProjectID && !dictProjectIDs.find(o => o === aDt.dictProjectID)) {
          dictProjectIDs.push(aDt.dictProjectID)
        }
        for (let i = 0; i < 10; i++) {
          if (aDt[`d${i}`] && aDt[`d${i}Value`]) {
            const dim = COA.dimsById[aDt[`d${i}`]]
            if (dim.entityName !== 'ac_dictFundSource' && dim.entityName !== 'org_department') {
              if (!me.dimensionControl[dim.entityName]) {
                me.dimensionControl[dim.entityName] = { dimIDs: [], description: dim.description, dimID: dim.ID }
              }
              if (!me.dimensionControl[dim.entityName].dimIDs.find(o => o === aDt[`d${i}Value`])) {
                me.dimensionControl[dim.entityName].dimIDs.push(aDt[`d${i}Value`])
              }
            }
          }
        }
        let dfz = true
        if (dimFilter) {
          Object.keys(dimFilterValue).forEach(dimID => {
            if (dfz) {
              let dres = false
              for (let i = 0; i < 10; i++) {
                if (aDt[`d${i}`] === Number(dimID) && dimFilterValue[dimID].find(o => o === aDt[`d${i}Value`])) {
                  dres = true
                }
              }
              if (!dres) {
                dfz = false
              }
            }
          })
        }

        if ((!fundSourceList || fundSourceList.find(o => o === aDt.dictFundSourceID)) &&
          (!departmentList || departmentList.find(o => o === aDt.departmentID)) &&
          (!dictProgClassList || dictProgClassList.find(o => o === aDt.dictProgClassID)) &&
          (!dictProjectList || fundSourceList.find(o => o === aDt.dictProjectID)) && dfz
        ) {
          paySum += (aDt.paySum || 0)
          resultAccrualDt.push(aDt)
        }
      })
      if (paySum !== 0) {
        row.paySum = AC.currencyService.round(paySum, 2)
        row.accrualDt = JSON.stringify(resultAccrualDt)
        resultData.push(row)
      }
    })
    const store = me.attr[`${gridName}`].getStore()
    Ext.suspendLayouts()
    me.attr[`${gridName}`].suspendEvents()
    store.suspendEvents()
    me.attr[`${gridName}`].setLocalStoreData(resultData)
    me.attr[`${gridName}`].resumeEvents()
    store.resumeEvents()
    Ext.resumeLayouts(true)
    me.attr[`${gridName}`].getView().refreshView()
  })
  AC.viewUtils.setFilterValue(me.attr.dictFundSourceList, { ID: fundSourceIDs.length ? fundSourceIDs : 0 })
  AC.viewUtils.setFilterValue(me.attr.departmentList, { mi_data_id: departmentIDs.length ? departmentIDs : 0 })
  AC.viewUtils.setFilterValue(me.attr.dictProgClassList, { ID: dictProgClassIDs.length ? dictProgClassIDs : 0 })
  AC.viewUtils.setFilterValue(me.attr.dictProjectList, { ID: dictProjectIDs.length ? dictProjectIDs : 0 })
  const dimLayout = me.down('[name=dimLayout]')
  Object.keys(me.dimensionControl).forEach(entityName => {
    if (!me.dimensionControl[entityName].control) {
      const entityInfo = $App.domainInfo.get(entityName)
      me.dimensionControl[entityName].control = Ext.create('UB.ux.form.field.UBBoxSelect',
        {
          labelWidth: 170,
          multiSelect: true,
          fieldLabel: me.dimensionControl[entityName].description,
          displayField: entityInfo.descriptionAttribute,
          valueField: 'ID',
          ubRequest: {
            entity: entityName,
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', entityInfo.descriptionAttribute]
          },
          listeners: {
            blur: () => {
              me.setDimensionFilter(me)
            }
          }
        })
      dimLayout.add(me.dimensionControl[entityName].control)
    }
    AC.viewUtils.setFilterValue(me.dimensionControl[entityName].control, { ID: me.dimensionControl[entityName].dimIDs ? me.dimensionControl[entityName].dimIDs : 0 })
  })
  me.setLoading(false)
}

function postInit (me, record, data) {
  const storeDtRD = me.attr.orderRegistryDtRD.getStore()
  const storeDtRL = me.attr.orderRegistryDtRL.getStore()
  Ext.suspendLayouts()
  me.attr.orderRegistryDtRD.suspendEvents()
  me.attr.orderRegistryDtRL.suspendEvents()
  storeDtRD.suspendEvents()
  storeDtRL.suspendEvents()
  if (_.get(me, 'formData.detail.orderRegistryDtRD.length')) {
    me.attr.orderRegistryDtRD.setLocalStoreData(me.formData.detail.orderRegistryDtRD)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDtRD.getStore().removeAll()
  }
  if (_.get(me, 'formData.detail.orderRegistryDtRL.length')) {
    me.attr.orderRegistryDtRL.setLocalStoreData(me.formData.detail.orderRegistryDtRL)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDtRL.getStore().removeAll()
  }
  me.attr.orderRegistryDtRD.resumeEvents()
  me.attr.orderRegistryDtRL.resumeEvents()
  storeDtRD.resumeEvents()
  storeDtRL.resumeEvents()
  Ext.resumeLayouts(true)
  me.attr.orderRegistryDtRD.getView().refreshView()
  me.attr.orderRegistryDtRL.getView().refreshView()
  HR.orderManager.setSourceOrderDescription(me)
}

function reCalc (me) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }
  const params = {
    orgID: me.record.get('organizationID'),
    periodCalcID: me.attr.periodID.getValue(),
    periodSalaryID: me.attr.periodID.getValue(),
    payElID: me.attr.payElID.getValue(),
    periodFromAvg: me.attr.periodFromAvg.getValue(),
    instanceID: me.instanceID
  }
  if (params.payElID && params.periodSalaryID && me.attr.periodFromAvg.getValue()) {
    me.attr.orderRegistryDtRD.removeAll()
    me.attr.orderRegistryDtRL.removeAll()
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'calcRegistryReserve',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      const storeDtRD = me.attr.orderRegistryDtRD.getStore()
      const storeDtRL = me.attr.orderRegistryDtRL.getStore()
      Ext.suspendLayouts()
      me.attr.orderRegistryDtRD.suspendEvents()
      me.attr.orderRegistryDtRL.suspendEvents()
      storeDtRD.suspendEvents()
      storeDtRL.suspendEvents()
      me.attr.orderRegistryDtRD.setLocalStoreData(data.orderRegistryDtRD)
      me.attr.orderRegistryDtRL.setLocalStoreData(data.orderRegistryDtRL)
      me.attr.orderRegistryDtRD.resumeEvents()
      me.attr.orderRegistryDtRL.resumeEvents()
      storeDtRD.resumeEvents()
      storeDtRL.resumeEvents()
      Ext.resumeLayouts(true)
      me.attr.orderRegistryDtRD.getView().refreshView()
      me.attr.orderRegistryDtRL.getView().refreshView()
      me.setIsDirty(true)
      me.setLoading(false)
    }, (err) => {
      if (err.config && err.config.timeout) {
        let countAttempt = 1
        let timerId = setTimeout(setCalc, 120000)
        function setCalc () {
          if (countAttempt > 30) {
            clearTimeout(timerId)
            me.setLoading(false)
          } else {
            countAttempt++
            UB.Repository('ac_entityJsonData')
              .attrs(['isActual', 'entityData'])
              .selectById(me.instanceID).then(rersp => {
                if (rersp && rersp.isActual && rersp.entityData) {
                  clearTimeout(timerId)
                  $App.connection.getDocument({
                    entity: 'ac_entityJsonData',
                    attribute: 'entityData',
                    ID: me.instanceID
                  }, { resultIsBinary: false, encoding: 'utf8' })
                    .then(data => {
                      const storeDtRD = me.attr.orderRegistryDtRD.getStore()
                      const storeDtRL = me.attr.orderRegistryDtRL.getStore()
                      Ext.suspendLayouts()
                      me.attr.orderRegistryDtRD.suspendEvents()
                      me.attr.orderRegistryDtRL.suspendEvents()
                      storeDtRD.suspendEvents()
                      storeDtRL.suspendEvents()
                      me.attr.orderRegistryDtRD.setLocalStoreData(data.orderRegistryDtRD)
                      me.attr.orderRegistryDtRL.setLocalStoreData(data.orderRegistryDtRL)
                      me.attr.orderRegistryDtRD.resumeEvents()
                      me.attr.orderRegistryDtRL.resumeEvents()
                      storeDtRD.resumeEvents()
                      storeDtRL.resumeEvents()
                      Ext.resumeLayouts(true)
                      me.attr.orderRegistryDtRD.getView().refreshView()
                      me.attr.orderRegistryDtRL.getView().refreshView()
                      me.setIsDirty(true)
                      me.setLoading(false)
                    }, (errData) => {
                      me.setLoading(false)
                      throw errData
                    })
                } else {
                  timerId = setTimeout(setCalc, 120000)
                }
              }, (errS) => {
                timerId = setTimeout(setCalc, 120000)
                throw errS
              })
          }
        }
      } else {
        me.setLoading(false)
        throw err
      }
    })
  }
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  if (me.isFilter) {
    $App.dialogInfo(UB.i18n('Попередження'), UB.i18n('Увага! Необхідно зняти фільтри'))
    return Promise.resolve(false)
  }
  return Promise.resolve(true)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('periodSalaryID', me.record.get('periodID'))
    me.record.set('periodCalcID', me.record.get('periodID'))
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        if (name !== 'name') {
          me.record.set(name, value)
        }
      })
    }
  }
  appHR.getCurrentPeriod(appAC.globalOrganization()).then(currentPeriod => {
    me.currentPeriod = currentPeriod
    if (me.isNewInstance && me.defaultValues && me.defaultValues.name) {
      me.record.set('name', `${me.defaultValues.name} ${UB.i18n('на')} ${AC.dateService.formatDate(AC.dateService.firstDayOfMonth(AC.dateService.addMonths(currentPeriod.dateFrom, 1)))}`)
    }
    if (me.record.get('payElID')) {
      UB.Repository('hr_balanceVacation')
        .attrs(['periodCalcID'])
        .where('orgID', '=', me.record.get('organizationID'))
        .where('payElID', '=', me.record.get('payElID'))
        .groupBy('periodCalcID')
        .selectAsObject().then(res => {
          if (res.length) {
            AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { ID: res.map(o => o.periodCalcID) })
          } else {
            AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { orgID: me.record.get('organizationID'), dateFrom: { value: currentPeriod.dateFrom, condition: '<=' } })
          }
        })
    } else {
      AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { orgID: me.record.get('organizationID'), dateFrom: { value: currentPeriod.dateFrom, condition: '<=' } })
    }
  })

  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '203',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: me.record.get('organizationID') })

  const readOnlyAttr = ['payElID']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.attr.periodID.setReadOnly(true)
  me.attr.dictFundSourceList.setReadOnly(false)
  me.attr.departmentList.setReadOnly(false)
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'payElID':
      if (value) {
        UB.Repository('hr_balanceVacation')
          .attrs(['periodCalcID'])
          .where('orgID', '=', me.record.get('organizationID'))
          .where('payElID', '=', value)
          .orderByDesc('periodCalcID')
          .groupBy('periodCalcID')
          .selectAsObject().then(res => {
            if (res.length) {
              AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { ID: res.map(o => o.periodCalcID) }, ['clearValue'])
              me.attr.periodFromAvg.setValueById(res[0].periodCalcID)
            } else {
              AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { orgID: me.record.get('organizationID'), dateFrom: { value: me.currentPeriod.dateFrom, condition: '<=' } }, ['clearValue'])
            }
          })
      } else {
        AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { orgID: me.record.get('organizationID'), dateFrom: { value: me.currentPeriod.dateFrom, condition: '<=' } }, ['clearValue'])
      }

      break
    case 'periodFromAvg':
    case 'periodID':
      if (value) {
        me.reCalc(me)
      }
      break
  }
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    const storeDtRD = me.attr.orderRegistryDtRD.getStore()
    const storeDtRL = me.attr.orderRegistryDtRL.getStore()
    Ext.suspendLayouts()
    me.attr.orderRegistryDtRD.suspendEvents()
    me.attr.orderRegistryDtRL.suspendEvents()
    storeDtRD.suspendEvents()
    storeDtRL.suspendEvents()
    me.attr.orderRegistryDtRD.setLocalStoreData(me.formData.detail.orderRegistryDtRD, false, true)
    me.attr.orderRegistryDtRL.setLocalStoreData(me.formData.detail.orderRegistryDtRL, false, true)
    me.attr.orderRegistryDtRD.resumeEvents()
    me.attr.orderRegistryDtRL.resumeEvents()
    storeDtRD.resumeEvents()
    storeDtRL.resumeEvents()
    Ext.resumeLayouts(true)
    me.attr.orderRegistryDtRD.getView().refreshView()
    me.attr.orderRegistryDtRL.getView().refreshView()
  }
}

function onGridEdit (me, context) {
  switch (context.column.field.name) {
    case 'paySum':
      context.record.set('flagsFix', (context.record.get('flagsFix') || 0) | 1 << 1)
      context.record.set('accrualDt', HR.accrualService.correctAccrualDt(context.record.get('accrualDt'), context.record.get('paySum')))
      break
    case 'baseSum':
      context.record.set('flagsFix', (context.record.get('flagsFix') || 0) | 1 << 1)
      context.record.set('accrualAddDt', HR.accrualService.correctAccrualDt(context.record.get('accrualAddDt'), context.record.get('baseSum')))
      context.record.set('paySum', (context.record.get('baseSum') || 0) - (context.record.get('sumTo') || 0))
      context.record.set('accrualDt', HR.accrualService.correctAccrualDt(context.record.get('accrualDt'), context.record.get('paySum')))
      break
  }
}
