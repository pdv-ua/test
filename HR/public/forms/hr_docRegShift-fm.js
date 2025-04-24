/* global UB _ $App AC HR Ext */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  calcShift,
  postInit,
  onAfterOrderSave,
  onCheckValidBeforeSaveOrder,
  addBaseActions,
  getDimension,
  setPayElList,
  setAccrual
}

function onCheckValidBeforeSaveOrder () {
  // const me = this
  // if (!me.attr.orderRegistryDt.getStore().count()) {
  //   $App.dialogInfo(UB.i18n('Необхідно додати нарахування'))
  //   return Promise.resolve(false)
  // } else {
  // let result = true
  // const data = me.attr.orderRegistryDt.getData()
  // data.forEach(row => {
  //   if (!row.payElID || !row.dateFrom || !row.dateTo || row.baseSum === null || row.planHours === null ||
  //     row.hours === null || row.paySum === null) {
  //     result = false
  //   }
  // })
  // if (!result) {
  //   $App.dialogInfo(UB.i18n('Необхідно коректно заповнити дані нарахувань'))
  // }
  // return Promise.resolve(result)
  // }
  return Promise.resolve(true)
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'dateTo', 'days', 'hours'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
      if (value && ctrl.calcValue !== value) {
        me.attr.days.setValue(null)
        me.attr.hours.setValue(null)
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
          ['dateTo', '<', '#maxdate', 'dismDateTo'],
          ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
          ['dateTo', '>=', value || me.record.get('periodSalaryID.dateFrom'), 'dateTo'],
          ['dateFrom', '<=', value || me.record.get('periodSalaryID.dateFrom'), 'dateFrom'],
          ['employeeNumberID.mi_deleteDate', '>=', '#maxdate'],
          ['employeeNumberID.dateFrom', '<=', value || me.record.get('periodSalaryID.dateFrom')],
          ['employeeNumberID.dateTo', '>=', value || me.record.get('periodSalaryID.dateFrom')],
          (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearWhereList'])
        calcShift({ me })
      }
      break
    case 'dateTo':
      if (ctrl.skipChanged) {
        ctrl.skipChanged = false
      } else if (value && ctrl.calcValue !== value) {
        me.attr.days.setValue(null)
        me.attr.hours.setValue(null)
        calcShift({ me })
      }
      break
    case 'days':
      if (ctrl.skipChanged) {
        ctrl.skipChanged = false
      } else if (value && ctrl.calcValue !== value) {
        calcShift({ me, days: value })
      }
      break
    case 'hours':
      if (ctrl.skipChanged) {
        ctrl.skipChanged = false
      } else if (value && ctrl.calcValue !== value) {
        calcShift({ me, hours: value })
      }
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    me.record.set('calcTimeType', 'HOUR')
    me.record.set('rateType', 'AVERAGE')
    me.addAutoAccruals = true
  }

  const dateFrom = AC.dateService.shiftDate(me.record.get('periodSalaryID.dateFrom'))
  const dateTo = AC.dateService.shiftDate(me.record.get('periodSalaryID.dateTo'))
  const minDateFrom = AC.dateService.shiftDate(Math.max(dateFrom, me.record.get('employeeNumberID.dateFrom') ? AC.dateService.shiftDate(me.record.get('employeeNumberID.dateFrom')) : dateFrom))
  const maxDateTo = AC.dateService.shiftDate(Math.min(dateTo, me.record.get('employeeNumberID.dateTo') ? AC.dateService.shiftDate(me.record.get('employeeNumberID.dateTo')) : dateTo))
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', dateFrom, 'dateTo'],
    ['dateFrom', '<=', dateFrom, 'dateFrom'],
    ['employeeNumberID.mi_deleteDate', '>=', '#maxdate'],
    ['employeeNumberID.dateFrom', '<=', dateFrom],
    ['employeeNumberID.dateTo', '>=', dateFrom],
    (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  AC.viewUtils.setWhereListProperty(me.attr.linkEmployeeNumberID, [
    ['orgID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '>=', dateFrom],
    ['dateFrom', '<=', dateTo]
  ])
  // AC.viewUtils.setWhereListProperty(me.attr.workScheduleID, [
  //   ['organizationID', '=', me.record.get('orderRegistryID.organizationID'), 'org'],
  //   ['organizationID', 'isNull', null, 'orgNull']
  // ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])
  me.attr.orderRegistryDt.getStore().sort('dateFrom', 'ASC')
  me.attr.dateFrom.setMinValue(minDateFrom)
  me.attr.dateFrom.setMaxValue(maxDateTo)
  me.attr.dateTo.setMinValue(minDateFrom)
  me.attr.dateTo.setMaxValue(maxDateTo)
  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  // me.attr.workScheduleID.calcValue = me.record.get('workScheduleID')
  me.attr.workNormID.calcValue = me.record.get('workNormID')
  me.attr.dictTarifCoeffID.calcValue = me.record.get('dictTarifCoeffID')
  if (me.isNewInstance) {
    me.attr.dateFrom.setValue(dateFrom)
    me.attr.dateTo.setValue(dateTo)
  }
  const readOnlyAttr = ['orderNumber', 'employeePositionID']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  me.actions.calcShift.setDisabled(me.record.get('orderState') === 'POSTED')
  AC.viewUtils.setFilterValue(me.attr.trfPositionID, {
    'workPlaceID.employeeNumberID': me.record.get('linkEmployeeNumberID') || me.record.get('employeeNumberID'),
    'workPlaceID.state': 'POSTED',
    'workPlaceID.documentID.type': 'FACT',
    'workPlaceID.dateFrom': {
      value: AC.dateService.shiftDate(me.record.get('dateTo') || new Date()),
      condition: '<='
    },
    'workPlaceID.dateTo': {
      value: AC.dateService.shiftDate(me.record.get('dateFrom') || new Date()),
      condition: '>='
    }
  })
  me.attr.days.calcValue = me.record.get('days')
  me.attr.hours.calcValue = me.record.get('hours')
  me.attr.byDays = me.down('[name=byDays]')
  me.attr.byHours = me.down('[name=byHours]')
  me.attr.byDays[me.attr.calcTimeType.getValue() === 'DAY' ? 'show' : 'hide']()
  me.attr.byHours[me.attr.calcTimeType.getValue() !== 'DAY' ? 'show' : 'hide']()
  AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['planDays'], me.attr.calcTimeType.getValue() === 'DAY')
  AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['days'], me.attr.calcTimeType.getValue() === 'DAY')
  AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['planHours'], me.attr.calcTimeType.getValue() !== 'DAY')
  AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['hours'], me.attr.calcTimeType.getValue() !== 'DAY')

  Ext.defer(() => {
    me.attr.employeePositionID.focus()
  }, 10)
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'linkEmployeeNumberID':
      me.attr.trfPositionID.calcValue = null
      me.attr.trfPositionID.clearValue()
      AC.viewUtils.setFilterValue(me.attr.trfPositionID, {
        'workPlaceID.employeeNumberID': value || me.record.get('employeeNumberID'),
        'workPlaceID.state': 'POSTED',
        'workPlaceID.documentID.type': 'FACT',
        'workPlaceID.dateFrom': {
          value: AC.dateService.shiftDate(me.record.get('dateTo') || new Date()),
          condition: '<='
        },
        'workPlaceID.dateTo': {
          value: AC.dateService.shiftDate(me.record.get('dateFrom') || new Date()),
          condition: '>='
        }
      })
      me.addAutoAccruals = true
      calcShift({ me, reload: true })
      break
    case 'dictPositionExID':
      if (value !== field.calcValue) {
        if (value) {
          me.attr.dictTarifCoeffID.calcValue = field.getFieldValue('dictTarifCoeffID')
          me.record.set('dictTarifCoeffID', field.getFieldValue('dictTarifCoeffID'))
          me.attr.workNormID.calcValue = field.getFieldValue('workNormID')
          me.record.set('workNormID', field.getFieldValue('workNormID'))
        } else {
          me.attr.dictTarifCoeffID.calcValue = me.attr.employeePositionID.getFieldValue('dictTarifCoeffID')
          me.record.set('dictTarifCoeffID', me.attr.employeePositionID.getFieldValue('dictTarifCoeffID'))
          me.attr.workNormID.calcValue = me.attr.employeePositionID.getFieldValue('dictPositionID.workNormID')
          me.record.set('workNormID', me.attr.employeePositionID.getFieldValue('dictPositionID.workNormID'))
        }
        me.addAutoAccruals = true
        calcShift({ me, reload: true, attrParams: { [field.name]: value } })
      } else {
        field.calcValue = value
      }
      break
    case 'trfPositionID':
      if (value !== field.calcValue) {
        me.attr.dictTarifCoeffID.calcValue = me.attr.trfPositionID.getFieldValue('dictTarifCoeffID')
        me.record.set('dictTarifCoeffID', me.attr.trfPositionID.getFieldValue('dictTarifCoeffID'))
        me.addAutoAccruals = true
        calcShift({ me, reload: true, attrParams: { [field.name]: value } })
      }
      break
    case 'workPlaceOnly':
      AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
        (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
      ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      me.attr.employeeID.setValue(field.getFieldValue('employeeID'))
      me.attr.dictPositionID.calcValue = field.getFieldValue('dictPositionID')
      me.record.set('dictPositionID', field.getFieldValue('dictPositionID'))
      me.attr.workNormID.calcValue = field.getFieldValue('dictPositionID.workNormID')
      me.record.set('workNormID', field.getFieldValue('dictPositionID.workNormID'))
      me.attr.dictTarifCoeffID.calcValue = field.getFieldValue('dictTarifCoeffID')
      me.record.set('dictTarifCoeffID', field.getFieldValue('dictTarifCoeffID'))
      me.attr.dictPositionExID.calcValue = field.getFieldValue('dictPositionID')
      me.record.set('dictPositionExID', field.getFieldValue('dictPositionID'))
      me.attr.trfPositionID.calcValue = null
      me.attr.trfPositionID.clearValue()
      me.addAutoAccruals = true
      const dateFrom = AC.dateService.shiftDate(me.record.get('periodSalaryID.dateFrom'))
      const dateTo = AC.dateService.shiftDate(me.record.get('periodSalaryID.dateTo'))
      const minDateFrom = AC.dateService.shiftDate(Math.max(dateFrom, field.getFieldValue('employeeNumberID.dateFrom') ? AC.dateService.shiftDate(field.getFieldValue('employeeNumberID.dateFrom')) : dateFrom))
      const maxDateTo = AC.dateService.shiftDate(Math.min(dateTo, field.getFieldValue('employeeNumberID.dateTo') ? AC.dateService.shiftDate(field.getFieldValue('employeeNumberID.dateTo')) : dateTo))
      me.attr.dateFrom.setMinValue(minDateFrom)
      me.attr.dateFrom.setMaxValue(maxDateTo)
      me.attr.dateTo.setMinValue(minDateFrom)
      me.attr.dateTo.setMaxValue(maxDateTo)
      if (me.attr.dateFrom.getValue() < minDateFrom) {
        me.attr.dateFrom.setValue(minDateFrom)
      } else if (me.attr.dateFrom.getValue() > maxDateTo) {
        me.attr.dateFrom.setValue(maxDateTo)
      }
      if (me.attr.dateTo.getValue() < minDateFrom) {
        me.attr.dateTo.setValue(minDateFrom)
      } else if (me.attr.dateTo.getValue() > maxDateTo) {
        me.attr.dateFrom.setValue(maxDateTo)
      }
      me.calcShift({ me, reload: true })
      break
    case 'dictPositionID':
      if (value !== field.calcValue) {
        me.attr.trfPositionID.calcValue = null
        me.attr.trfPositionID.clearValue()
        me.addAutoAccruals = true
        me.calcShift({ me, reload: true, attrParams: { [field.name]: value } })
      }
      break
    case 'dictTarifCoeffID':
    case 'rateType':
      if (value !== field.calcValue) {
        me.calcShift({ me, attrParams: { [field.name]: value } })
      }
      break
    case 'workNormID':
      if (value !== field.calcValue) {
        me.calcShift({ me, attrParams: { [field.name]: value } })
      }
      break
    case 'calcTimeType':
      if (value !== field.calcValue) {
        me.attr.byDays[me.attr.calcTimeType.getValue() === 'DAY' ? 'show' : 'hide']()
        me.attr.byHours[me.attr.calcTimeType.getValue() !== 'DAY' ? 'show' : 'hide']()
        AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['planDays'], me.attr.calcTimeType.getValue() === 'DAY')
        AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['days'], me.attr.calcTimeType.getValue() === 'DAY')
        AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['planHours'], me.attr.calcTimeType.getValue() !== 'DAY')
        AC.gridUtils.setGridColumnVisible(me.attr.orderRegistryDt, ['hours'], me.attr.calcTimeType.getValue() !== 'DAY')
        me.calcShift({ me })
      }
      break
  }
}

function calcShift ({ me, reload, accruals, payElIDs, days, hours, attrParams = {} }) {
  if (me.record.get('orderState') === 'POSTED' || !me.attr.employeePositionID.getValue() || !me.attr.dateFrom.getValue() ||
    !me.attr.dateTo.getValue()) {
    if (me.record.get('orderState') === 'PROJECT') {
      me.record.set('flagsRec', 2)
      me.record.set('flagsFix', 0)
      me.attr.orderRegistryDt.removeAll()
    }
    return
  }
  if (!accruals || accruals.length > 1) {
    me.setLoading(true)
  }

  if (reload) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    me.attr.orderRegistryDt.removeAll()
  }
  const params = Object.assign({
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    periodSalaryID: me.record.get('periodSalaryID'),
    payElID: me.record.get('orderRegistryID.payElID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    employeePositionID: me.attr.employeePositionID.getValue(),
    dictPositionID: me.attr.dictPositionID.getValue(),
    dictPositionExID: me.attr.dictPositionExID.getValue(),
    dictTarifCoeffID: me.record.get('dictTarifCoeffID'),

    mainDictPositionID: me.attr.employeePositionID.getFieldValue('dictPositionID'),
    trfPositionID: me.record.get('trfPositionID'),
    dictFundSourceID: me.attr.employeePositionID.getFieldValue('dictFundSourceID'),
    dictProgClassID: me.attr.employeePositionID.getFieldValue('dictProgClassID'),

    calcTimeType: me.attr.calcTimeType.getValue(),
    workScheduleID: me.attr.employeePositionID.getFieldValue('workScheduleID'),
    workNormID: me.record.get('workNormID'),
    rateType: me.attr.rateType.getValue(),
    orderID: me.instanceID,
    // flagsRec: me.record.get('flagsRec'),
    // flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    planDays: me.attr.planDays.getValue(),
    planHours: me.attr.planHours.getValue(),
    days: days || me.attr.days.getValue(),
    hours: hours || me.attr.hours.getValue(),
    payElIDs,
    reload: !!reload,
    accruals: [],
    addAutoAccruals: me.addAutoAccruals
  }, attrParams)
  const allRecord = me.attr.orderRegistryDt.getStore().snapshot || me.attr.orderRegistryDt.getStore().data
  if (!reload) {
    if (accruals) {
      params.accruals = accruals
    } else {
      allRecord.items.forEach((row) => {
        params.accruals.push(Object.assign(row.getData(), { idx: row.internalId }))
      })
    }
  }
  $App.connection.run({
    entity: 'hr_docRegShift',
    method: 'calcShift',
    params: JSON.stringify(params)
  }).then(response => {
    me.addAutoAccruals = false
    let data = JSON.parse(response.resultData)
    const store = me.attr.orderRegistryDt.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dateTo.calcValue = AC.dateService.shiftDate(data.dateTo)
    me.attr.dateTo.setValue(AC.dateService.shiftDate(data.dateTo))
    me.attr.trfPositionID.calcValue = data.trfPositionID
    me.attr.trfPositionID.setValueById(data.trfPositionID)
    // me.attr.workScheduleID.calcValue = data.workScheduleID
    // me.attr.workScheduleID.setValueById(data.workScheduleID)
    // me.attr.workNormID.calcValue = data.workNormID
    // me.attr.workNormID.setValueById(data.workNormID)
    // me.attr.dictTarifCoeffID.calcValue = data.dictTarifCoeffID
    // me.attr.dictTarifCoeffID.setValueById(data.dictTarifCoeffID)
    me.attr.planDays.setValue(data.planDays)
    me.attr.planHours.setValue(data.planHours)
    me.attr.days.calcValue = data.days
    me.attr.days.setValue(data.days)
    me.attr.hours.calcValue = data.hours
    me.attr.hours.setValue(data.hours)
    me.attr.orderRegistryDt.removeAll()
    me.attr.docError.setValue(data.docError)
    if (reload || !store.count()) {
      data.accruals.forEach(accr => {
        accr.orderID = me.instanceID
        accr.orderRegistryID = me.record.get('orderRegistryID')
      })
      store.insert(store.data.length, data.accruals)
    } else {
      const updateAttrNames = ['periodCalc', 'periodSalary', 'periodCalcID', 'periodSalaryID', 'payElID', 'payElID',
        'payElID.description', 'mask', 'maskAdd', 'flagsFix', 'flagsRec', 'accrualDt', 'dateFrom', 'dateTo',
        'dictFundSourceID.name', 'dictFundSourceID',
        'dictProgClassID.description', 'dictProgClassID',
        'baseSum', 'planDays', 'days', 'planHours', 'hours', 'rate', 'paySum',
        'payElID.methodID.code'
      ]

      data.accruals.forEach(accr => {
        const record = store.getByInternalId(accr.idx)
        if (record) {
          updateAttrNames.forEach(attrName => {
            record.set(attrName, accr.hasOwnProperty(attrName) ? accr[attrName] : null)
          })
        } else {
          accr.orderID = me.instanceID
          accr.orderRegistryID = me.record.get('orderRegistryID')
          store.insert(store.data.length, [accr])
        }
      })
    }
    const paySum = data.accruals.reduce((a, b) => { return a + b['paySum'] }, 0)
    const addPaySum = data.accruals
      .filter(o => o['payElID.methodID.code'] !== '150')
      .reduce((a, b) => { return a + b['paySum'] }, 0)
    me.attr.paySum.setValue(paySum)
    me.attr.addPaySum.setValue(addPaySum)

    store.sort('dateFrom', 'ASC')
    me.attr.orderRegistryDt.GridSummary.dataBind()
    me.setIsDirty(true)
    me.setLoading(false)
  })
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
  me.actions.empNumAction = new Ext.Action({
    actionId: 'empNumAction',
    eventId: 'empNumAction',
    iconCls: 'el-icon-s-custom',
    cls: 'blue-action',
    tooltip: UB.i18n('Особовий рахунок'),
    text: UB.i18n('Особовий рахунок'),
    handler: function () {
      if (me.attr.employeeNumberID.getValue()) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumber',
          entity: 'hr_employeeNumber',
          instanceID: me.attr.employeeNumberID.getValue(),
          tabId: `hr_employeeNumber-${me.attr.employeeNumberID.getValue()}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })

  me.actions.trfWorkPlace = new Ext.Action({
    actionId: 'trfWorkPlace',
    eventId: 'trfWorkPlace',
    iconCls: 'far fa-list-alt',
    cls: 'green-action',
    tooltip: UB.i18n('Тарифікація'),
    text: UB.i18n('Тарифікація'),
    handler: function () {
      if (me.attr.employeeNumberID.getValue()) {
        UB.Repository('trf_workPlace')
          .attrs(['ID'])
          .where('employeeNumberID', '=', (me.attr.employeeNumberID.getFieldValue('empWorkPlace') === '5' && me.attr.employeeNumberID.getFieldValue('mainEmpNumberID')) ? me.attr.employeeNumberID.getFieldValue('mainEmpNumberID') : me.attr.employeeNumberID.getValue())
          .where('state', '=', 'POSTED')
          .where('documentID.type', '=', 'FACT')
          .where('dateFrom', '<=', AC.dateService.shiftDate(me.attr.dateFrom.getValue()))
          .where('dateTo', '>=', AC.dateService.shiftDate(me.attr.dateFrom.getValue()))
          .selectScalar().then(instanceID => {
            if (instanceID) {
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'trf_workPlaceEdit',
                entity: 'trf_workPlace',
                instanceID,
                tabId: `trf_workPlace-${instanceID}`,
                target: $App.getViewport().centralPanel
              })
            } else {
              $App.dialogInfo(UB.i18n(`Для працівника {0} не створена тарифікація`, me.attr.employeePositionID.getFieldValue('description')))
            }
          })
      }
    },
    scope: me
  })

  me.actions.rlAction = new Ext.Action({
    actionId: 'rlAction',
    eventId: 'rlAction',
    iconCls: 'el-icon-tickets',
    cls: 'blue-action',
    tooltip: UB.i18n('Розрахунковий лист'),
    text: UB.i18n('Розрахунковий лист'),
    handler: function () {
      if (me.attr.employeeNumberID.getValue()) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: me.attr.employeeNumberID.getValue()
            }
          },
          tabId: `hr_rl${me.attr.employeeNumberID.getValue()}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })
  HR.orderManager.addOrderAction(me)

  if (!me.actions.calcShift) {
    me.actions.calcShift = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcShift({ me })
      }
    })
  }
}

function getDimension (me, record) {
  if (record) {
    const accrualDt = record.get('accrualDt')
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
            paySum: record.get('paySum'),
            orgID: me.record.get('orderRegistryID.organizationID'),
            employeeNumberID: me.attr.employeeNumberID.getValue(),
            onSave: (accrualDt) => {
              record.set('flagsFix', record.get('flagsFix') | 1 << 14 | 1 << 15 | 1 << 16 | 1 << 17)
              record.set('accrualDt', JSON.stringify(accrualDt))
            }
          }
        })
      })
    }
  }
}
function setPayElList (me) {
  UB.Repository('hr_payEl')
    .attrs(['ID', 'code', 'name', 'description'])
    .where('methodID.code', '=', '150', 'met150')
    .where('methodID.code', 'in', ['4', '6'], 'extra')
    .where('ID', 'in',
      UB.Repository('hr_payElEntry').attrs('payElID')
        .where('payElBaseID', '=', me.record.get('orderRegistryID.payElID'))
        .where('entryType', '=', 'SUM')
        .where('dateFrom', '<=', me.attr.dateTo.getValue())
        .where('dateTo', '>=', me.attr.dateFrom.getValue())
      , 'payElEntry')
    .logic('(([met150]) or (([extra]) and ([payElEntry])))')
    .orderBy('description')
    .selectAsObject()
    .then(sourceData => {
      const selectData = []
      const allRecords = me.attr.orderRegistryDt.getStore().snapshot || me.attr.orderRegistryDt.getStore().data
      allRecords.each(record => {
        selectData.push({ ID: record.get('payElID'), value: record.get('payElID') })
      })

      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElListSelect',
        cmpInitConfig: {
          sourceData,
          selectData,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              if (data.remove.length) {
                const records = me.attr.orderRegistryDt.getData()
                for (let row = records.length - 1; row >= 0; --row) {
                  if (data.remove.find(o => o === records[row].payElID)) {
                    me.attr.orderRegistryDt.removeDataRow(data[row], row)
                  }
                }
              }
              me.calcShift({ me, reload: false, accruals: null, payElIDs: data.add })
            }
          }
        }
      })
    })
}

function setFocus (me, gridName, record) {
  if (record) {
    const selModel = me.attr[gridName].getSelectionModel()
    let view = me.attr[gridName].getView()
    view.focus()
    selModel.select(record)
  }
}

function setAccrual (me, grid, record, formData) {
  if (!record) {
    let index = grid.getStore().data.length
    grid.getStore().insert(index, {})
    record = grid.getStore().getAt(index)
  }
  Object.keys(formData).forEach(name => {
    record.set(name, formData[name])
  })
  record.set('change', true)
  setFocus(me, 'orderRegistryDt', record)
  me.calcShift({ me })
}
