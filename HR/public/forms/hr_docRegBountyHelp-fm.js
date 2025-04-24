/* global AC HR $App _ UB Ext appAC appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  configureAccrualAvg,
  onControlChanged,
  postInit,
  onCheckValidBeforeSaveOrder,
  onAfterOrderSave,
  calcBountyHelp,
  onGridEdit,
  addBaseActions,
  setControls,
  setDateRange,
  isFixedSum
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

function doCheckPayElInYear (me, onDate) {
  const pYear = onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom') || me.record.get('dateFrom'))
  return UB.Repository('hr_accrual')
    .attrs(['payElID.name', 'paySum', 'periodCalcID.name'])
    .where('[employeeNumberID]', '=', me.record.get('employeeNumberID'))
    .where('[payElID]', '=', me.attr.payElID.getValue())
    .where('[periodSalaryID.dateFrom]', '>=', AC.dateService.firstDayOfYear(pYear))
    .where('[periodSalaryID.dateFrom]', '<=', AC.dateService.lastDayOfYear(pYear))
    .where('flagsRecSum', '!=', 8192)
    .where('flagsRecReversal', '!=', 512)
    .where('orderID', '!=', me.instanceID)
    .notExists(UB.Repository('hr_accrual')
      .correlation('linkToParentID', 'ID')
      .where('[employeeNumberID]', '=', me.record.get('employeeNumberID'))
      .where('[payElID]', '=', me.attr.payElID.getValue())
      .where('flagsRecReversal', '=', 512)
      .where('flagsRecSum', '!=', 8192))
    .selectAsObject().then(results => {
      if (results.length > 0) {
        if (me.attr.payElID.getFieldValue('methodID.code') === '36' && me.attr.payElID.getFieldValue('notLimitPayments')) {
          return $App.dialogYesNo(UB.i18n('Увага'), UB.i18n(`{0} у сумі {1} вже була нарахована працівнику у {2}! Продовжити?`, results[0]['payElID.name'], results[0]['paySum'], results[0]['periodCalcID.name']))
        } else {
          $App.dialogError(UB.i18n(`{0} у сумі {1} вже була нарахована працівнику у {2}!`, results[0]['payElID.name'], results[0]['paySum'], results[0]['periodCalcID.name']), 'Помилка')
          return false
        }
      } else {
        return true
      }
    })
}

function onCheckValidBeforeSaveOrder () {
  return this.record.modified && this.record.modified.orderState === 'POSTED' ? Promise.resolve(true) : doCheckPayElInYear(this)
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum', 'avgDays', 'avgSumMonth', 'paySum', 'countMonth', 'rate', 'periodSalaryID'].forEach(attrName => {
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
      if (value && ctrl.calcValue !== value) {
        doCheckPayElInYear(me, value).then(() => {
          calcBountyHelp(me, true, true, ctrl.name)
        })
      }
      break
    case 'dateFromAvg':
    case 'dateToAvg':
      if (ctrl.calcValue !== value) {
        if (value && ctrl.isValid()) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcBountyHelp(me, false, true)
      }
      break
    case 'avgSum':
    case 'avgDays':
    case 'avgSumMonth':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcBountyHelp(me, false, false)
      }
      break
    case 'rate':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcBountyHelp(me, false, false)
      }
      break
    case 'paySum':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
        calcBountyHelp(me, false, false)
      }
      break
    case 'avgCalcType':
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
        me.attr.avgSum.calcValue = null
        me.attr.avgSum.setValue()
        me.attr.avgDays.calcValue = null
        me.attr.avgDays.setValue()
        me.attr.avgSumMonth.calcValue = null
        me.attr.avgSumMonth.setValue()
        me.record.set('flagsFix', flagsFix & ~(me.attr.dateFromAvg.flagsFix | me.attr.dateToAvg.flagsFix | me.attr.avgSum.flagsFix | me.attr.avgDays.flagsFix | me.attr.avgSumMonth.flagsFix))
        calcBountyHelp(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS')
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS')
      break
    case 'countMonth':
      if (value && ctrl.calcValue !== value) {
        calcBountyHelp(me, false, false)
      }
      break
    case 'periodSalaryID':
      if (ctrl.calcValue !== value) {
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
        }
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

function isFixedSum () {
  return !!this.record.get('empOrderID') && this.record.get('valuation') === 'SUM'
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    setSalaryPeriod(me, AC.dateService.currentDate())
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('orderRegistryID.organizationID') })
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': me.payElMethodFilter || '37',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom'],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  const isPosted = me.record.get('orderState') === 'POSTED'
  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'countMonth', 'rate', 'periodSalaryID']
  const isReadOnly = isPosted || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcBountyHelp.setDisabled(isPosted)

  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')
  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.paySum.calcValue = me.record.get('paySum')
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.avgSum.calcValue = me.record.get('avgSum')
  me.attr.avgDays.calcValue = me.record.get('avgDays')
  me.attr.avgSumMonth.calcValue = me.record.get('avgSumMonth')
  me.attr.rate.calcValue = me.record.get('rate')
  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || isPosted)
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || isPosted)

  const isFixedSum = me.isFixedSum() || isPosted
  me.attr.avgSumMonth.setReadOnly(isFixedSum)

  me.maxDateTo = AC.dateService.addMonths(AC.dateService.lastDayOfMonth(me.record.get('orderRegistryID.periodID.dateFrom')), 12)
  me.configureAccrualAvg(me.record.get('avgCalcType') === 'PREVIOUS')
  if (!me.isNewInstance) {
    me.setDateRange()
  }
  me.setControls()
}

function configureAccrualAvg (state) {
  const me = this
  me.attr.accrualAvg.down('[dataIndex = opKoef]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSumNotIndex]')[state ? 'show' : 'hide']()
  me.attr.accrualAvg.down('[dataIndex = baseSum]').setText(state ? UB.i18n('Заробіток, що індексується') : UB.i18n('Заробіток'))
}

function setDateRange () {
  const me = this
  me.attr.dateFrom.setMinValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateFrom'))
  me.attr.dateFrom.setMaxValue(me.attr.employeePositionID.getFieldValue('employeeNumberID.dateTo') > me.maxDateTo ? me.maxDateTo : me.attr.employeePositionID.getFieldValue('dateTo'))
}

function checkDateRange (me) {
  if (!AC.dateService.isValid(me.record.get('dateFrom'))) return false
  const dateVal = AC.dateService.formatDate(me.record.get('dateFrom'))
  if (me.record.get('dateFrom') < me.attr.dateFrom.minValue) {
    AC.viewUtils.showToast(UB.i18n(`Дата розрахунку {0} не може бути раніше ніж {1}!`, dateVal, AC.dateService.formatDate(me.attr.dateFrom.minValue)))
    return false
  }
  if (me.record.get('dateFrom') > me.attr.dateFrom.maxValue) {
    AC.viewUtils.showToast(UB.i18n(`Дата розрахунку  {0} не може бути пізніше ніж {1}!`, dateVal, AC.dateService.formatDate(me.attr.dateFrom.maxValue)))
    return false
  }
  return true
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'workPlaceOnly':
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      me.attr.avgDays.setValue()
      me.attr.avgSumMonth.setValue()
      me.attr.paySum.setValue()
      me.attr.rate.setValue()
      me.setDateRange()
      calcBountyHelp(me, true, true)
      break
    case 'payElID':
      me.attr.avgCalcType.setValue()
      me.attr.dateFromAvg.setValue()
      me.attr.dateToAvg.setValue()
      me.attr.avgSum.setValue()
      me.attr.avgDays.setValue()
      me.attr.rate.setValue()
      if (!me.isFixedSum()) {
        me.attr.avgSumMonth.setValue()
      }
      me.attr.paySum.setValue()
      me.setControls()
      doCheckPayElInYear(me).then(() => {
        calcBountyHelp(me, true, true)
      })
      break
    case 'orderDate':
      if (field.isValid()) {
        me.attr.avgCalcType.setValue()
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        me.attr.avgSum.setValue()
        me.attr.avgDays.setValue()
        me.attr.avgSumMonth.setValue()
        me.attr.paySum.setValue()
        me.attr.rate.setValue()
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
    case 'dateFrom':
      if (field.isValid() && value) {
        setSalaryPeriod(me, value)
      }
      break
    case 'dictFundSourceID':
      calcBountyHelp(me, false, false)
      break
  }
}

function setSalaryPeriod (me, onDate) {
  const setBountyHelpVacationPeriod = AC.settings.get('setBountyHelpVacationPeriod', me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization())
  if (setBountyHelpVacationPeriod) {
    UB.Repository('hr_dictPeriod')
      .attrs(['ID'])
      .where('orgID', '=', me.record.get('orderRegistryID.organizationID'))
      .where('isClosed', '=', 0)
      .where('dateFrom', '<=', AC.dateService.unshiftDate(onDate))
      .where('dateTo', '>=', AC.dateService.unshiftDate(onDate))
      .selectScalar().then(periodID => {
        me.attr.periodSalaryID.setValueById(periodID || null)
      })
  } else {
    appHR.getCurrentPeriod(me.record.get('orderRegistryID.organizationID')).then(period => {
      me.attr.periodSalaryID.setValueById(period.ID || null)
    })
  }
}

function calcBountyHelp (me, clear, clearAvg, ctrlName) {
  if (!me.attr.employeePositionID.getValue() || !me.attr.payElID.getValue() || !me.attr.dateFrom.getValue()) {
    return
  }
  if (!checkDateRange(me)) {
    return
  }

  me.setLoading(true)

  if (clear) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    setSalaryPeriod(me, me.attr.dateFrom.getValue())
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
    flagsFix: me.record.get('flagsFix') | (me.record.get('empOrderID') ? 1 << 9 : 0),
    dateFrom: me.attr.dateFrom.getValue(),
    paySum: me.attr.paySum.getValue(),
    ctrlName: ctrlName,
    baseSum: me.attr.avgSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    avgDays: me.attr.avgDays.getValue(),
    avgSumMonth: me.attr.avgSumMonth.getValue(),
    countMonth: me.attr.countMonth.getValue(),
    rate: me.attr.rate.getValue(),
    valuation: me.record.get('valuation'),
    dictFundSourceID: me.attr.dictFundSourceID.getValue(),
    accruals: [],
    accrualsAvg: []
  }
  if (!clearAvg) {
    me.attr.accrualAvg.getData().forEach((data, idx) => {
      params.accrualsAvg.push(Object.assign(data, { idx: idx }))
    })
  }
  $App.connection.run({
    entity: 'hr_docRegBountyHelp',
    method: 'calcBountyHelp',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.paySum.calcValue = data.paySum
    me.attr.paySum.setValue(me.attr.paySum.calcValue)
    me.attr.dateFromAvg.calcValue = AC.dateService.shiftDate(data.dateFromAvg)
    me.attr.dateFromAvg.setValue(me.attr.dateFromAvg.calcValue)
    me.attr.dateToAvg.calcValue = AC.dateService.shiftDate(data.dateToAvg)
    me.attr.dateToAvg.setValue(me.attr.dateToAvg.calcValue)
    me.attr.avgCalcType.calcValue = data.avgCalcType
    me.attr.avgCalcType.setValue(me.attr.avgCalcType.calcValue)
    me.attr.avgSum.calcValue = data.baseSum
    me.attr.avgSum.setValue(me.attr.avgSum.calcValue)
    me.attr.avgDays.calcValue = data.avgDays
    me.attr.avgDays.setValue(me.attr.avgDays.calcValue)
    me.attr.avgSumMonth.calcValue = data.avgSumMonth
    me.attr.avgSumMonth.setValue(me.attr.avgSumMonth.calcValue)
    me.attr.rate.calcValue = data.rate
    me.attr.rate.setValue(me.attr.rate.calcValue)
    me.attr.periodSalaryID.calcValue = me.attr.periodSalaryID.getValue()
    me.configureAccrualAvg(data.avgCalcType === 'PREVIOUS')
    me.record.set('accrualDt', data.accrualDt)
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
            record.set('baseSum', accr.baseSum)
            record.set('baseSumNotIndex', accr.baseSumNotIndex)
            record.set('opSum', accr.opSum)
            record.set('opKoef', accr.opKoef)
            record.set('accrualDt', accr.accrualDt)
          }
        })
      }
    }
    const flagsRec = me.record.get('flagsRec')
    const flag = data.avgCalcType === 'FACT' ? (1 << 7) : data.avgCalcType === 'PLAN' ? (1 << 8) : (1 << 6)
    me.record.set('flagsRec', flagsRec & ~((1 << 6) | (1 << 7) | (1 << 8)) | flag)
    storeAvg.sort('dateFrom', 'ASC')
    me.attr.accrualAvg.GridSummary.dataBind()
    me.setIsDirty(true)
    me.attr.dateFromAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS')
    me.attr.dateToAvg.setReadOnly(data.avgCalcType !== 'PREVIOUS')
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
  me.calcBountyHelp(me)
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

  if (!me.actions.calcBountyHelp) {
    me.actions.calcBountyHelp = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcBountyHelp(me, true, true)
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

function setControls () {
  const me = this
  const isPlan = me.attr.payElID.getFieldValue('calcAvgType') !== 'AVG'
  if (isPlan) me.attr.avgCalcType.setValue('PLAN')
  me.attr.avgCalcType.setVisible(!isPlan)
  me.attr.dateFromAvg.setVisible(!isPlan)
  me.attr.dateToAvg.setVisible(!isPlan)
  me.attr.avgSum.setVisible(!isPlan)
  me.attr.avgDays.setVisible(!isPlan)
  me.attr.avgSumMonth.setVisible(isPlan)
  me.attr.rate.setVisible(isPlan)
  me.attr.countMonth.setVisible(!isPlan)
  me.attr.accrualAvg.setVisible(!isPlan)
}
