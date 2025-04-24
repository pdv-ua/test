/* global AC HR $App _ Ext UB appAC appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcSeverance,
  onGridEdit,
  addBaseActions,
  configureAccrualAvg
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['accrualAvg'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.accrualAvg.length')) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg)
  } else if (data.method !== 'addnew') {
    me.attr.accrualAvg.removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSumRst', 'avgDayRst', 'avgSumWork', 'payElID',
    'countMonth', 'paySum', 'calcEarnings'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  let flagsFix = me.record.get('flagsFix')
  let flagsRec = me.record.get('flagsRec')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
    case 'payElID':
    case 'countMonth':
      if (value && ctrl.calcValue !== value) {
        calcSeverance(me, true, true)
      }
      break
    case 'dateFromAvg' :
    case 'dateToAvg' :
      if (!ctrl.readOnly) {
        if (ctrl.calcValue !== value) {
          if (value && ctrl.isValid()) {
            me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
          } else {
            me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
          }
          calcSeverance(me, false, true)
        }
      }
      break
    case 'avgSum' :
    case 'calcSum':
    case 'avgSumRst':
    case 'avgDayRst':
    case 'avgSumWork':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcSeverance(me, false, false)
      }
      break
    case 'paySum':
      if (value && ctrl.calcValue !== value) {
        me.record.set('flagsFix', flagsFix | 1 << 1)
        ctrl.calcValue = value
        calcSeverance(me, false, false)
      }
      break
    case 'avgCalcType' :
      if (ctrl.calcValue !== value) {
        if (value) {
          const flag = value === 'FACT' ? (1 << 7) : value === 'PLAN' ? (1 << 8) : (1 << 6)
          me.record.set('flagsRec', flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12)) | flag)
        } else {
          me.record.set('flagsRec', flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8) | (1 << 11) | (1 << 12)))
        }
        me.attr.dateFromAvg.calcValue = null
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.calcValue = null
        me.attr.dateToAvg.setValue()
        me.record.set('flagsFix', flagsFix & ~(me.attr.dateFromAvg.flagsFix | me.attr.dateToAvg.flagsFix))
        calcSeverance(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
    case 'calcEarnings' :
      if (ctrl.calcValue !== value) {
        me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        calcSeverance(me, false, false)
      }
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg, false, true)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    if (me.attr.payElID.getFieldValue('calcEarnings') === 'ACCRUAL') {
      me.attr.calcEarnings.setValue(me.attr.employeePositionID.getFieldValue('payElID.calcProportion') || 'DAY')
    } else {
      me.record.set('calcEarnings', me.attr.payElID.getFieldValue('calcEarnings') || 'DAY')
    }
  }

  // AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '22' })
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    // let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '22',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    // payElStore.load()
  })
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')
  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.avgSumRst.calcValue = me.record.get('avgSum')
  me.attr.avgDayRst.calcValue = me.record.get('avgSum')
  me.attr.avgSumWork.calcValue = me.record.get('avgSum')
  me.attr.paySum.calcValue = me.record.get('paySum')
  me.attr.calcEarnings.calcValue = me.record.get('calcEarnings')
  me.configureAccrualAvg()
  if (!me.attr.dateFromAvg.readOnly) me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  if (!me.attr.dateToAvg.readOnly) me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('orderState') === 'POSTED')
  /*
  me.attr['avgCalcType'].store.filter({
    filterFn: function (item) { return item.get('code') !== 'PLAN' }
  })
  */
  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'countMonth']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcSeverance.setDisabled(me.record.get('orderState') === 'POSTED')

  me.maxDateTo = AC.dateService.addMonths(AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom')), 12)
  if (!me.isNewInstance) setDateRange(me)
}

function setDateRange (me) {
  me.attr.dateFrom.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateFrom.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo') > me.maxDateTo ? me.maxDateTo : me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo'))
}

function checkDateRange (me) {
  if (!AC.dateService.isValid(me.record.get('dateFrom'))) return false
  const dateVal = AC.dateService.formatDate(me.record.get('dateFrom'))
  if (AC.dateService.unshiftDate(me.record.get('dateFrom')) < me.attr.dateFrom.minValue) {
    AC.viewUtils.showToast(UB.i18n(`Дата розрахунку {0} не може бути раніше ніж {1}!`, dateVal, AC.dateService.formatDate(me.attr.dateFrom.minValue)))
    return false
  }
  if (AC.dateService.unshiftDate(me.record.get('dateFrom')) > me.attr.dateFrom.maxValue) {
    AC.viewUtils.showToast(UB.i18n(`Дата розрахунку  {0} не може бути пізніше ніж {1}!`, dateVal, AC.dateService.formatDate(me.attr.dateFrom.maxValue)))
    return false
  }
  return true
}

function onControlChanged (me, field, value) {
  if (me.formDataReady) {
    switch (field.name) {
      case 'workPlaceOnly':
        me.attr.dateFrom.setValue()
        me.attr.countMonth.setValue()
        me.attr.paySum.setValue()
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
        break
      case 'employeePositionID':
        const employeeID = field.getFieldValue('employeeID')
        me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
        me.attr.employeeID.setValue(employeeID)
        me.attr.avgCalcType.setValue()
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        setDateRange(me)
        calcSeverance(me, true, true)
        AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
          'employeeID': employeeID
        }, [ 'setDisabled', 'clearValue' ])
        break
      case 'orderDate':
        if (field.isValid()) {
          me.attr.avgCalcType.setValue()
          me.attr.dateFromAvg.setValue()
          me.attr.dateToAvg.setValue()
          AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
            ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
            ['dateTo', '<', '#maxdate', 'dismDateTo'],
            ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
            ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
            ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
            (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
          ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
        }
        break
      case 'dictFundSourceID':
        calcSeverance(me, false, false)
        break
      case 'payElID':
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        if (field.getFieldValue('calcEarnings') === 'ACCRUAL') {
          me.attr.calcEarnings.setValue(me.attr.employeePositionID.getFieldValue('payElID.calcProportion') || 'DAY')
        } else {
          me.attr.calcEarnings.setValue(field.getFieldValue('calcEarnings') || 'DAY')
        }
        calcSeverance(me, true, true, 'dateTo')
        break
    }
  }
}

function calcSeverance (me, clear, clearAvg) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }

  if (!me.attr.employeePositionID.getValue() || !me.attr.dateFrom.getValue() || !me.attr.payElID.getValue()) {
    return
  }

  if (!checkDateRange(me)) {
    return
  }

  me.setLoading(true)

  if (clear) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }
  if (clearAvg) {
    me.attr.accrualAvg.removeAll()
  }
  let flagsFix = me.record.get('flagsFix')
  if (me.attr.dictFundSourceID.getValue()) {
    me.record.set('flagsFix', flagsFix | 1 << 14)
  } else {
    me.record.set('flagsFix', flagsFix & ~(1 << 14))
  }

  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    orderID: me.instanceID,
    payElID: me.attr.payElID.getValue(),
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    countMonth: me.attr.countMonth.getValue(),
    baseSum: me.attr.avgSumRst.getValue(),
    avgDays: me.attr.avgDayRst.getValue(),
    avgSumMonth: me.attr.avgSumWork.getValue(),
    paySum: me.attr.paySum.getValue(),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    calcEarnings: me.attr.calcEarnings.getValue(),
    accruals: [],
    accrualsAvg: []
  }
  if (!clearAvg) {
    me.attr.accrualAvg.getData().forEach((data, idx) => {
      params.accrualsAvg.push(Object.assign(data, { idx: idx }))
    })
  }
  $App.connection.run({
    entity: 'hr_docRegSeverancePay',
    method: 'calcSeverance',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dateFromAvg.calcValue = AC.dateService.shiftDate(data.dateFromAvg)
    me.attr.dateFromAvg.setValue(me.attr.dateFromAvg.calcValue)
    me.attr.dateToAvg.calcValue = AC.dateService.shiftDate(data.dateToAvg)
    me.attr.dateToAvg.setValue(me.attr.dateToAvg.calcValue)
    me.attr.avgCalcType.calcValue = data.avgCalcType
    me.attr.avgCalcType.setValue(me.attr.avgCalcType.calcValue)
    me.attr.avgSumRst.calcValue = data.baseSum
    me.attr.avgSumRst.setValue(me.attr.avgSumRst.calcValue)
    me.attr.avgDayRst.calcValue = data.avgDays
    me.attr.avgDayRst.setValue(me.attr.avgDayRst.calcValue)
    me.attr.avgSumWork.calcValue = data.avgSumMonth
    me.attr.avgSumWork.setValue(me.attr.avgSumWork.calcValue)
    me.attr.paySum.setValue(data.paySum)
    me.attr.paySum.calcValue = data.paySum
    me.attr.calcEarnings.calcValue = data.calcEarnings
    me.attr.calcEarnings.setValue(me.attr.calcEarnings.calcValue)
    me.record.set('accrualDt', data.accrualDt)
    me.configureAccrualAvg()
    if (clearAvg) {
      me.attr.accrualAvg.removeAll()
    }

    if (data.accrualsAvg) {
      if (clearAvg || !storeAvg.count()) {
        data.accrualsAvg.forEach(accr => {
          accr.orderID = me.instanceID
          accr.accrualDt = JSON.stringify(accr.accrualDt)
        })
        storeAvg.insert(storeAvg.data.length, data.accrualsAvg)
      } else {
        data.accrualsAvg.forEach(accr => {
          const record = storeAvg.getAt(accr.idx)
          accr.accrualDt = JSON.stringify(accr.accrualDt)
          if (record) {
            record.set('flagsFix', accr.flagsFix)
            record.set('opDays', accr.opDays)
            record.set('opHours', accr.opHours)
            record.set('baseSum', accr.baseSum)
            record.set('opSum', accr.opSum)
            record.set('accrualDt', accr.accrualDt)
          }
        })
      }
    }
    storeAvg.sort('dateFrom', 'ASC')
    me.attr.accrualAvg.GridSummary.dataBind()
    me.attr.dateFromAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS')
    me.attr.dateToAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS')
    me.setIsDirty(true)
    me.setLoading(false)
  })
}

function onGridEdit (me, gridName, context) {
  const ctrl = context.column.field
  if (ctrl.flagsFix) {
    if (context.value === null) {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    } else {
      if (context.column.field.prevValue !== context.value) {
        context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
      }
    }
  }
  me.calcSeverance(me)
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    printDocumentAction: true,
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)

  if (!me.actions.calcSeverance) {
    me.actions.calcSeverance = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcSeverance(me, true, true)
      }
    })
  }

  if (!me.actions.analytic) {
    me.actions.analytic = new Ext.Action({
      iconCls: 'el-icon-notebook-2',
      cls: 'blue-action',
      actionId: 'analyticBtn',
      text: UB.i18n('Аналітика'),
      eventId: 'analyticBtn',
      handler: function (context) {
        const accrualDt = me.record.get('accrualDt')
        if (accrualDt) {
          $App.connection.run({
            entity: 'hr_rl',
            method: 'getDimension',
            params: typeof accrualDt === 'object' ? JSON.stringify(accrualDt) : accrualDt,
            orgID: me.record.get('orderRegistryID.organizationID')
          }).then(response => {
            const data = JSON.parse(response.resultData)
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_rlDimension',
              isModal: true,
              cmpInitConfig: {
                defaultValues: data,
                typeData: 'orderRegistryDt',
                readOnly: me.record.get('orderState') === 'POSTED',
                paySum: me.record.get('paySum'),
                orgID: me.record.get('orderRegistryID.organizationID'),
                employeeNumberID: me.attr.employeeNumberID.getValue(),
                onSave: (accrualDt) => {
                  me.record.set('flagsFix', me.record.get('flagsFix') | 1 << 14 | 1 << 15 | 1 << 16 | 1 << 17)
                  me.record.set('accrualDt', JSON.stringify(accrualDt))
                }
              }
            })
          })
        }
      }
    })
  }
}

function configureAccrualAvg () {
  const me = this
  me.attr.accrualAvg.down('[dataIndex = opDays]')[me.record.get('calcEarnings') !== 'HOUR' ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = opHours]')[me.record.get('calcEarnings') === 'HOUR' ? 'show' : 'hide']()
}
