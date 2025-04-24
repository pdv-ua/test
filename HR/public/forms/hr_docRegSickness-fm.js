/* global AC HR $App _ UB Ext appAC appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  onFormDataReady,
  onControlChanged,
  postInit,
  onAfterOrderSave,
  calcSickness,
  setDocRegSicknessDt,
  onGridEdit,
  selectParentSickness,
  setDays,
  addBaseActions,
  onAfterRender,
  getDimension,
  setParentData,
  doReversalAction,
  doCancelReversalAction,
  onCheckValidBeforeSaveOrder,
  recalSickness,
  setLinkedDocsDescription,
  setAvgDataFromPriorDocument,
  checkDateFirst,
  beforePosting,
  setEmployeeFilter
}

const parentSicknessAttrs = ['employeeFamilyID', 'avgCalcType', 'standingAll', 'standingYearMonth', 'rate',
  'dateFromAvg', 'dateToAvg', 'avgSum', 'calcSum', 'dateFirst', 'isOnlyFOP']

const parentAccrualAttrs = ['avgCalcType', 'dateFromAvg', 'dateToAvg', 'dateFirst', 'isOnlyFOP']

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt', 'accrualAvg', 'docRegSicknessDt'],
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
  if (_.get(me, 'formData.detail.accrualAvg.length')) {
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg)
  } else if (data.method !== 'addnew') {
    me.attr.accrualAvg.removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
  me.setLinkedDocsDescription()
}

function onAttrKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function initOrderComponentDone (me) {
  ['dateFrom', 'dateTo', 'calendarDayCount', 'dayCount', 'avgCalcType', 'dateFromAvg', 'dateToAvg', 'avgSum',
    'standingAll', 'standingYearMonth', 'rate', 'calcSum', 'dateFirst'].forEach(attrName => {
    me.attr[attrName].on('blur', changeParams)
    me.attr[attrName].on('keypress', onAttrKeypress)
  })
  let tb = me.down('toolbar')
  tb.insert(tb.items.length - 4, {
    xtype: 'button',
    scale: 'medium',
    iconCls: 'u-icon-circle-minus',
    cls: 'red-action',
    actionId: 'reversalActionBtn',
    tooltip: UB.i18n('Сторнувати'),
    text: UB.i18n('Сторно'),
    hidden: true,
    handler: function (btn) {
      const me = btn.up('form')
      me.doReversalAction()
    }
  })
  tb.insert(tb.items.length - 4, {
    xtype: 'button',
    scale: 'medium',
    iconCls: 'u-icon-circle-close',
    cls: 'red-action',
    actionId: 'cancelReversalActionBtn',
    hidden: true,
    text: UB.i18n('Скасувати сторно'),
    tooltip: UB.i18n('Скасувати сторнування'),
    handler: function (btn) {
      const me = btn.up('form')
      me.doCancelReversalAction()
    }
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') === 'POSTED' || ctrl.readOnly) {
    return
  }

  const flagsFix = me.record.get('flagsFix')
  const flagsRec = me.record.get('flagsRec')
  const value = ctrl.getValue()
  switch (ctrl.name) {
    case 'dateFrom':
    case 'dateTo':
      if (value && ctrl.calcValue !== value) {
        checkDictIllnessReason(me)
        setDocRegSicknessDt(me).then((result) => {
          result && calcSickness(me, true, true)
        })
      }
      break
    case 'dateFirst':
      if (value && ctrl.calcValue !== value) {
        checkDictIllnessReason(me)
        calcSickness(me, true, true)
      }
      break
    case 'dateFromAvg' :
    case 'dateToAvg' :
      if (!ctrl.readOnly) {
        const store = me.attr.orderRegistryDt.getStore()
        const allRecords = store.snapshot || store.data
        if (ctrl.calcValue !== value) {
          if (value && ctrl.isValid()) {
            me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
            allRecords.each(record => {
              record.set('flagsFix', record.get('flagsFix') | ctrl.flagsFix)
            })
          } else {
            me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
            allRecords.each(record => {
              record.set('flagsFix', record.get('flagsFix') & ~ctrl.flagsFix)
            })
          }
          calcSickness(me, false, true)
        }
      }
      break
    case 'avgSum' :
    case 'standingAll':
    case 'standingYearMonth':
    case 'calcSum':
    case 'rate':
      if (ctrl.calcValue !== value) {
        const store = me.attr.orderRegistryDt.getStore()
        const allRecords = store.snapshot || store.data
        if (value) {
          me.record.set('flagsFix', flagsFix | ctrl.flagsFix)
          allRecords.each(record => {
            record.set('flagsFix', record.get('flagsFix') | ctrl.flagsFix)
          })
        } else {
          me.record.set('flagsFix', flagsFix & ~ctrl.flagsFix)
          allRecords.each(record => {
            record.set('flagsFix', record.get('flagsFix') & ~ctrl.flagsFix)
          })
        }
        calcSickness(me)
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
        calcSickness(me, false, true)
      }
      me.attr.dateFromAvg.setReadOnly(value !== 'PREVIOUS' || me.attr.parentSicknessID.getValue() || me.record.get('parentAccrualID'))
      me.attr.dateToAvg.setReadOnly(value !== 'PREVIOUS' || me.attr.parentSicknessID.getValue() || me.record.get('parentAccrualID'))
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
    me.attr.accrualAvg.setLocalStoreData(me.formData.detail.accrualAvg, false, true)
  }
}

async function onFormDataReady () {
  const me = this
  me.reversalActionBtn = me.down('[actionId=reversalActionBtn]')
  me.cancelReversalActionBtn = me.down('[actionId=cancelReversalActionBtn]')

  me.baseDoc = me.record.get('empOrderID')
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
  }

  const readOnlyAttr = ['orderDate', 'orderNumber', 'employeePositionID', 'dateFrom', 'dateTo']
  const isPosted = me.record.get('orderState') === 'POSTED'
  const isReadOnly = isPosted || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })

  me.attr.dateFirst.setReadOnly(isPosted)
  me.attr.parentSicknessID.setReadOnly(isPosted)
  me.actions.calcSickness.setDisabled(isPosted)

  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '13' })
  me.setEmployeeFilter(me.attr.dismissed.getValue())
  /*
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
    ['dateTo', '<', '#maxdate', 'dismDateTo'],
    ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
    ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
    ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
  ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
  */
  me.attr.workPlaceOnly[AC.settings.get('hrTariffingEducational', appAC.globalOrganization()) ? 'show' : 'hide']()

  me.attr.orderRegistryDt.getStore().sort('dateFrom', 'ASC')
  me.attr.accrualAvg.getStore().sort('dateFrom', 'ASC')
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  me.attr.dateFrom.calcValue = me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null
  me.attr.dateTo.calcValue = me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null
  me.attr.dateFirst.calcValue = me.record.get('dateFirst') ? AC.dateService.shiftDate(me.record.get('dateFirst')) : null
  me.attr.dayCount.calcValue = me.record.get('dayCount')
  me.attr.calendarDayCount.calcValue = me.record.get('calendarDayCount')
  me.attr.dateFromAvg.calcValue = me.record.get('dateFromAvg') ? AC.dateService.shiftDate(me.record.get('dateFromAvg')) : null
  me.attr.dateToAvg.calcValue = me.record.get('dateToAvg') ? AC.dateService.shiftDate(me.record.get('dateToAvg')) : null
  me.attr.avgCalcType.calcValue = me.record.get('avgCalcType')
  me.attr.avgSum.calcValue = me.record.get('avgSum')
  me.attr.standingAll.calcValue = me.record.get('standingAll')
  me.attr.standingYearMonth.calcValue = me.record.get('standingYearMonth')
  me.attr.rate.calcValue = me.record.get('rate')
  me.attr.rateLabel.setValue(me.record.get('rate'))
  me.attr.calcSum.calcValue = me.record.get('calcSum')
  me.down('[name=standingAllInYearLabel]').setText(me.record.get('standingAll') ? (('' + Math.floor(me.record.get('standingAll') / 12)).substr(-2, 2) + ' р.' + (' ' + (me.record.get('standingAll') - Math.floor(me.record.get('standingAll') / 12) * 12)).substr(-2, 2) + ' м.') : '')
  if (me.record.get('standingYearMonth') && me.record.get('dateFrom')) {
    me.down('[name=workLess6monthsLabel]').setText(me.record.get('standingYearMonth') < 6 ? UB.i18n('Менше 6 місяців') : '')
  }
  me.attr.dateFromAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('parentSicknessID') || isPosted)
  me.attr.dateToAvg.setReadOnly(me.record.get('avgCalcType') !== 'PREVIOUS' || me.record.get('parentSicknessID') || isPosted)
  AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
    'employeeID': me.record.get('employeeID')
  }, [ 'setDisabled' ])
  if (!me.isNewInstance) {
    await filterParentSickness(me, me.record.get('employeeNumberID'))
    AC.viewUtils.setWhereListProperty(me.attr.dictIllnessReasonID, [
      ['illnessKind', '=', me.record.get('illnessKind')]
    ])
  } else {
    setDictIllnessReason(me)
  }
  setSerieCtrlState(me, me.record.get('illnessKind'))
  me.attr.employeeFamilyID.setVisible(me.record.get('dictIllnessReasonID.payElFSSUID.methodID.code') === '19')
  if (me.record.get('dictIllnessReasonID.payElFSSUID.methodID.code') !== '19') {
    me.attr.employeeFamilyID.setValue()
  }
  if (me.record.get('orderState') !== 'POSTED') {
    const parentSicknessID = me.record.get('parentSicknessID')
    if (parentSicknessID) {
      parentSicknessAttrs.forEach(attrName => {
        me.attr[attrName].setReadOnly(!!parentSicknessID)
      })
    }
    const parentAccrualID = me.record.get('parentAccrualID')
    if (parentAccrualID) {
      parentAccrualAttrs.forEach(attrName => {
        me.attr[attrName].setReadOnly(!!parentAccrualID)
      })
    }
  }

  if (!me.isNewInstance) {
    if (me.record.get('parentSicknessID')) {
      me.skipRecalcByParent = true
      me.attr.parentSicknessID.setValueById(me.record.get('parentSicknessID'))
    } else if (me.record.get('parentAccrualID')) {
      me.skipRecalcByParent = true
      me.attr.parentSicknessID.setValueById(me.record.get('parentAccrualID'))
    }
  }

  const msekDateFrom = me.record.get('msekDateFrom')
  me.attr.msekDateTo.setAllowBlank(!msekDateFrom)
  me.attr.msekResult.setAllowBlank(!msekDateFrom)
  me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
  me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
  const baseDepended = ['orderDate', 'orderNumber', 'seria', 'employeePositionID', 'employeeNumberID', 'employeeID',
    'dateFrom', 'dateTo', 'easyDateFrom', 'easyDateTo', 'isReg', 'sickNotes', 'notPay', 'illnessKind'
  ]
  baseDepended.forEach(attrName => {
    me.attr[attrName].setReadOnly(me.baseDoc || isPosted)
  })
  const postDepended = ['standingAll', 'standingYearMonth', 'dictIllnessReasonID', 'employeeFamilyID',
    'msekDateFrom', 'msekDateTo', 'msekResult', 'actNumber', 'actDate'
  ]
  postDepended.forEach(attrName => {
    me.attr[attrName].setReadOnly(isPosted)
  })
  if (isPosted) {
    me.attr.seria.setAllowBlank(true)
  } else {
    if (me.record.get('parentSicknessID')) {
      me.attr.dictIllnessReasonID.setReadOnly(me.record.get('parentSicknessID.illnessKind') === me.record.get('illnessKind'))
    } else {
      me.attr.dictIllnessReasonID.setReadOnly(false)
    }
  }
  me.attr.docRegSicknessDt.setReadOnly(me.baseDoc || isPosted)
  const parentData = await UB.Repository('hr_docRegSickness')
    .attrs(['ID'])
    .where('parentSicknessID', '=', me.instanceID)
    .limit(1)
    .selectSingle()
  if (parentData) {
    me.attr.employeePositionID.setReadOnly(true)
    me.attr.dictIllnessReasonID.setReadOnly(true)
    me.attr.employeeFamilyID.setReadOnly(true)
  }
  me.currentPeriod = await appHR.getCurrentPeriod(me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization())
  const reversalData = await UB.Repository('hr_orderRegistryDt')
    .attrs(['ID'])
    .where('orderID', '=', me.instanceID)
    .where('periodCalcID.dateFrom', '<', me.currentPeriod.dateFrom)
    .where('orderID.orderState', '=', 'POSTED')
    .notExists(UB.Repository('hr_orderRegistryDt')
      .where('orderID', '=', me.instanceID)
      .where('periodCalcID.dateFrom', '>=', me.currentPeriod.dateFrom)
      .where('orderID.orderState', '=', 'POSTED')
    )
    .limit(1)
    .selectSingle()
  if (reversalData) {
    me.down('[actionId=reversalActionBtn]').show()
  } else {
    me.down('[actionId=reversalActionBtn]').hide()
  }
  const cancelReversalData = await UB.Repository('hr_orderRegistryDt')
    .attrs(['ID'])
    .where('orderID', '=', me.instanceID)
    .where('periodCalcID', 'isNull')
    .where('storno', '=', '1')
    .limit(1)
    .selectSingle()
  if (cancelReversalData) {
    me.down('[actionId=cancelReversalActionBtn]').show()
  } else {
    me.down('[actionId=cancelReversalActionBtn]').hide()
  }
  HR.orderManager.disableContextMenuItems(me.attr.parentSicknessID, ['showLookup', 'addItem'])
  me.actions.subEmpAction.setDisabled(!AC.entityUtils.verifyRightsMethod('hr_docRegSickness', 'addSubEmpOrder') || me.record.get('empOrderID') || !(me.record.get('orderState') === 'POSTED' && me.record.get('employeePositionID.workPlace') === '1' && !me.record.get('dictIllnessReasonID.payElFSSUID.includeSecondJobs')))
  me.checkDateFirst()
}

function selectParentSickness (me) {
  if (me.attr.employeePositionID.getValue() && me.attr.dateFrom.getValue() && me.attr.dateFrom.isValid()) {
    me.attr.parentSicknessID.store.clearFilter()
    const parentDocRegSickness = UB.Repository('hr_docRegSickness')
      .attrs(['ID'])
      .orderBy('dateFrom')
      .where('employeeNumberID', '=', me.attr.employeeNumberID.getValue())
      .where('dateTo', '=', AC.dateService.addDays(AC.dateService.truncTimeToUtcNull(me.attr.dateFrom.getValue()), -1))
    me.attr.employeeFamilyID.getValue() && parentDocRegSickness.where('employeeFamilyID', '=', me.attr.employeeFamilyID.getValue())

    parentDocRegSickness
      .orderByDesc('dateTo')
      .selectSingle().then(docRegSickness => {
        if (docRegSickness && docRegSickness.ID) {
          me.attr.parentSicknessID.setValueById(docRegSickness.ID)
        } else {
          me.attr.parentSicknessID.setValueById(null)
        }
      })
  }
}

function onControlChanged (me, field, value) {
  if (me.formDataReady) {
    switch (field.name) {
      case 'workPlaceOnly':
        me.attr.dateFrom.setValue()
        me.attr.dayCount.setValue()
        me.attr.paySum.setValue()
        AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
          (value ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
        ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'], ['clearValue', 'clearStore'])
        break
      case 'dictIllnessReasonID':
        me.attr.employeeFamilyID.setVisible(field.getFieldValue('payElFSSUID.methodID.code') === '19')
        if (field.getFieldValue('payElFSSUID.methodID.code') !== '19') {
          me.attr.employeeFamilyID.setValue()
        }
        setDocRegSicknessDt(me).then(result => {
          result && calcSickness(me, true, false)
        })
        break
      case 'notPay':
        setDocRegSicknessDt(me).then(result => {
          result && calcSickness(me)
        })
        break
      case 'msekDateFrom':
        me.attr.msekDateTo.setValue()
        me.attr.msekResult.setValue()
        me.attr.msekDateTo.setAllowBlank(!value)
        me.attr.msekResult.setAllowBlank(!value)
        break
      case 'dateFirst':
        if (AC.dateService.isValid(me.attr.dateFirst.getValue())) {
          me.checkDateFirst()
        }
        break
      case 'msekResult':
        calcSickness(me)
        break
      case 'msekDateTo':
        if (AC.dateService.isValid(me.attr.msekDateTo.getValue())) {
          calcSickness(me)
        }
        break
      case 'employeePositionID':
        const employeeID = field.getFieldValue('employeeID')
        me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
        me.attr.employeeID.setValue(employeeID)
        me.attr.avgCalcType.setValue()
        me.attr.dateFromAvg.setValue()
        me.attr.dateToAvg.setValue()
        me.attr.avgSum.setValue()
        me.attr.standingAll.setValue()
        me.attr.standingYearMonth.setValue()
        me.attr.calcSum.setValue()
        me.attr.rate.setValue()
        me.attr.dateFrom.setValue()
        me.attr.dateTo.setValue()
        me.attr.isOnlyFOP.setValue(me.attr.employeePositionID.getFieldValue('workPlace') !== '1')
        filterParentSickness(me, field.getFieldValue('employeeNumberID')).then(() => {
          me.selectParentSickness(me)
          AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
            'employeeID': employeeID
          }, [ 'setDisabled', 'clearValue' ])
          calcSickness(me, true, true)
        })
        break
      case 'dateFrom': {
        if (!me.attr.parentSicknessID.getValue()) {
          me.record.set('dateFirst', value)
          me.selectParentSickness(me)
        }
        me.attr.dateTo.setMinValue(me.attr.dateFrom.getValue())
        me.setDays(me)
        setDocRegSicknessDt(me)
        break
      }
      case 'dateTo': {
        me.attr.dateFrom.setMaxValue(me.attr.dateTo.getValue())
        me.setDays(me)
        setDocRegSicknessDt(me)
        break
      }
      case 'illnessKind':
        if (value !== me.record.get('illnessKind')) {
          // setDictIllnessReason(me, value)
          if (value !== '1') {
            me.attr.seria.setValue()
          }
          me.attr.notPay.setValue(value === '2')
          me.attr.notPay.setDisabled(value === '2')
          setSerieCtrlState(me, value)
          calcSickness(me)
        }
        if (value) {
          AC.viewUtils.setWhereListProperty(me.attr.dictIllnessReasonID, [
            ['illnessKind', '=', value]
          ])
        }
        if (value && me.attr.parentSicknessID.getValue() && me.attr.parentSicknessID.getFieldValue('source') === 'docRegSickness') {
          me.attr.dictIllnessReasonID.setReadOnly(me.attr.parentSicknessID.getFieldValue('illnessKind') === value)
          if (me.attr.parentSicknessID.getFieldValue('illnessKind') === value && me.attr.dictIllnessReasonID.getValue() !== me.attr.parentSicknessID.getFieldValue('dictIllnessReasonID')) {
            me.attr.dictIllnessReasonID.setValueById(me.attr.parentSicknessID.getFieldValue('dictIllnessReasonID'))
          }
        } else {
          me.attr.dictIllnessReasonID.setReadOnly(false)
        }
        break
      case 'orderNumber':
        me.attr.orderRegistryDt.getStore().data.items.forEach((row, idx) => { row.set(field.name, value) })
        break
      case 'orderDate':
        if (field.isValid()) {
          me.attr.avgCalcType.setValue()
          me.attr.dateFromAvg.setValue()
          me.attr.dateToAvg.setValue()
          me.attr.avgSum.setValue()
          me.attr.standingAll.setValue()
          me.attr.standingYearMonth.setValue()
          me.attr.calcSum.setValue()
          me.attr.rate.setValue()
          me.setEmployeeFilter(me.attr.dismissed.getValue())
          /*
          AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
            ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
            ['dateTo', '<', '#maxdate', 'dismDateTo'],
            ['[dateTo] = [employeeNumberID.dateTo]', 'custom', undefined, 'dismNumDate'],
            ['dateTo', '>=', me.record.get('orderDate'), 'dateTo'],
            ['dateFrom', '<=', me.record.get('orderDate'), 'dateFrom']
          ], ['(([dateTo] AND [dateFrom]) OR ([dismDateTo] AND [dismNumDate]))'])
          */
        }
        break
      case 'isOnlyFOP':
        setDocRegSicknessDt(me).then(result => {
          result && calcSickness(me, true, true)
        })
        break
    }
  }
}

async function filterParentSickness (me, employeeNumberID) {
  me.setLoading(true)
  const mParams = await $App.connection.run({
    entity: 'hr_employeeNumber',
    method: 'getParentEmpNumbers',
    employeeNumberID: employeeNumberID || 0
  })
  me.setLoading(false)
  const parentEmpNumbers = mParams.parentEmpNumbers ? JSON.parse(mParams.parentEmpNumbers) : []
  const empNumberIDs = parentEmpNumbers.map(o => o.employeeNumberID)
  empNumberIDs.push(me.record.get('employeeNumberID') || 0)
  AC.viewUtils.setWhereListProperty(me.attr.parentSicknessID,
    [
      ['employeeNumberID', 'in', empNumberIDs],
      ['ID', '!=', me.instanceID]
    ],
    null,
    ['clearWhereList', 'clearStore']
  )
}

function setDocRegSicknessDt (me) {
  if (!me.attr.dateFrom.getValue() || !me.attr.dateFrom.isValid() || !me.attr.dateTo.getValue() || !me.attr.dateTo.isValid()) {
    return Promise.resolve(false)
  }
  if (me.attr.docRegSicknessDt.editingPlugin.editing) me.attr.docRegSicknessDt.editingPlugin.cancelEdit()
  const store = me.attr.docRegSicknessDt.getStore()
  const dateFrom = AC.dateService.unshiftDate(me.attr.dateFrom.getValue())
  const dateTo = AC.dateService.unshiftDate(me.attr.dateTo.getValue())
  const dateFirst = AC.dateService.unshiftDate(me.attr.dateFirst.getValue())
  let recModifyMin
  let recModifyMax
  const maxDayFOP = me.attr.dictIllnessReasonID.getFieldValue('maxDayFOP') || 0
  const isOnlyFOP = me.attr.isOnlyFOP.getValue()
  const maxDateFop = AC.dateService.addDays(dateFirst, maxDayFOP - 1)
  if (isOnlyFOP) {
    store.each(record => {
      if (AC.dateService.unshiftDate(record.get('dateFrom')) > maxDateFop) {
        store.remove(record)
      } else if (AC.dateService.unshiftDate(record.get('dateTo')) > maxDateFop) {
        record.set('dateTo', maxDateFop)
      }
    })
    if (dateTo > maxDateFop) {
      me.attr.docRegSicknessDt.addNewRecord(
        {
          dateFrom: AC.dateService.addDays(maxDateFop, 1),
          dateTo: AC.dateService.shiftDate(dateTo),
          illnessRegime: '6',
          empOrderSicknessID: me.instanceID
        }
      )
    }
  }
  store.each(record => {
    const recordDateFrom = AC.dateService.unshiftDate(record.get('dateFrom'))
    const recordDateTo = AC.dateService.unshiftDate(record.get('dateTo'))
    if (recordDateFrom > dateTo || recordDateTo < dateFrom) {
      store.remove(record)
    } else {
      if (dateFrom > recordDateFrom && dateFrom <= recordDateTo) {
        record.set('dateFrom', AC.dateService.shiftDate(dateFrom))
      }
      if (dateTo >= recordDateFrom && dateTo < recordDateTo) {
        record.set('dateTo', AC.dateService.shiftDate(dateTo))
      }
    }
    if (recModifyMin === undefined || record.get('dateFrom') < recModifyMin.get('dateFrom')) {
      recModifyMin = record
    }
    if (recModifyMax === undefined || record.get('dateTo') > recModifyMax.get('dateTo')) {
      recModifyMax = record
    }
    if (!isOnlyFOP) {
      if (record.get('illnessRegime') === '6') {
        record.set('illnessRegime', '1')
      }
    }
  })
  if (recModifyMin !== undefined && recModifyMin.get('dateFrom') > dateFrom) {
    recModifyMin.set('dateFrom', AC.dateService.shiftDate(dateFrom))
  }
  if (recModifyMax !== undefined && recModifyMax.get('dateTo') < dateTo) {
    recModifyMax.set('dateTo', AC.dateService.shiftDate(dateTo))
  }
  if (!store.getCount()) {
    me.attr.docRegSicknessDt.addNewRecord(
      {
        dateFrom: AC.dateService.shiftDate(dateFrom),
        dateTo: AC.dateService.shiftDate(dateTo),
        illnessRegime: '1',
        empOrderSicknessID: me.instanceID
      }
    )
  }
  return Promise.resolve(true)
}

function calcSickness (me, clear, clearAvg, skipCheckDt) {
  if (me.record.get('orderState') === 'POSTED') {
    return
  }
  if (!me.attr.employeePositionID.getValue() || !me.attr.dictIllnessReasonID.getValue() || !me.attr.dateFrom.getValue() ||
    !me.attr.dateTo.getValue()) {
    return
  }

  if (!me.attr.dictIllnessReasonID.getFieldValue('payElFSSUID')) {
    AC.viewUtils.showToast(UB.i18n('Для обраної причини непрацездатності не вказано вид оплати!'), UB.i18n('Помилка'))
    return
  }

  if (!skipCheckDt && !checkSicknessDt(me)) {
    return false
  }

  me.setLoading(UB.i18n('Перерахунок. Зачекайте'))
  const store = me.attr.orderRegistryDt.getStore()
  if (clear) {
    me.record.set('flagsRec', 2)
    me.record.set('flagsFix', 0)
    const data = me.attr.orderRegistryDt.getData()
    for (let row = data.length - 1; row >= 0; --row) {
      if (!(data[row].flagsRec & 1 << 9) && (!data[row].periodCalcID || AC.dateService.shiftDate(data[row].periodCalc) >= me.currentPeriod.dateFrom)) {
        me.attr.orderRegistryDt.removeDataRow(data[row], row)
      }
    }
  }

  if (clearAvg || me.attr.parentSicknessID.getValue()) {
    me.attr.accrualAvg.removeAll()
  }

  const params = {
    orgID: me.record.get('orderRegistryID.organizationID'),
    orderNumber: me.record.get('orderNumber'),
    orderDate: me.record.get('orderDate'),
    orderRegistryID: me.record.get('orderRegistryID'),
    periodCalcID: me.record.get('orderRegistryID.periodID'),
    employeeNumberID: me.attr.employeePositionID.getFieldValue('employeeNumberID'),
    dictIllnessReasonID: me.attr.dictIllnessReasonID.getValue(),
    payElID: me.attr.dictIllnessReasonID.getFieldValue('payElFSSUID'),
    parentSicknessID: me.record.get('parentSicknessID'),
    parentAccrualID: me.record.get('parentAccrualID'),
    employeeFamilyID: me.attr.employeeFamilyID.getValue(),
    orderID: me.instanceID,
    flagsRec: me.record.get('flagsRec'),
    flagsFix: me.record.get('flagsFix'),
    dateFrom: me.attr.dateFrom.getValue(),
    calendarDayCount: me.attr.calendarDayCount.getValue(),
    dayCount: me.attr.dayCount.getValue(),
    dateTo: me.attr.dateTo.getValue(),
    standingAll: me.attr.standingAll.getValue(),
    standingYearMonth: me.attr.standingYearMonth.getValue(),
    rate: me.attr.rate.getValue(),
    baseSum: me.attr.avgSum.getValue(),
    calcSum: me.attr.calcSum.getValue(),
    avgCalcType: me.attr.avgCalcType.getValue(),
    dateFromAvg: me.attr.dateFromAvg.getValue(),
    dateToAvg: me.attr.dateToAvg.getValue(),
    notPay: me.attr.notPay.getValue(),
    msekDateTo: me.attr.msekDateTo.getValue(),
    msekResult: me.attr.msekResult.getValue(),
    sicknessDt: me.attr.docRegSicknessDt.getData(),
    accruals: [],
    accrualsAvg: [],
    method: '4',
    dateFirst: me.attr.dateFirst.getValue()
  }
  if (!clear) {
    me.attr.orderRegistryDt.getData().forEach((data, idx) => {
      if (!(data.flagsRec & 1 << 9) && (!data.periodCalcID || AC.dateService.shiftDate(data.periodCalc) >= me.currentPeriod.dateFrom)) {
        params.accruals.push(Object.assign(data, { idx: idx }))
      }
    })
  }
  if (!clearAvg && !me.attr.parentSicknessID.getValue()) {
    me.attr.accrualAvg.getData().forEach((data, idx) => {
      params.accrualsAvg.push(Object.assign(data, { idx: idx }))
    })
  }
  $App.connection.run({
    entity: 'hr_docRegSickness',
    method: 'calcSickness',
    params: JSON.stringify(params)
  }).then(response => {
    const data = JSON.parse(response.resultData)
    const storeAvg = me.attr.accrualAvg.getStore()
    me.attr.dateFrom.calcValue = AC.dateService.shiftDate(data.dateFrom)
    me.attr.dateFrom.setValue(me.attr.dateFrom.calcValue)
    me.attr.dateTo.calcValue = AC.dateService.shiftDate(data.dateTo)
    me.attr.dateTo.setValue(AC.dateService.shiftDate(data.dateTo))
    me.attr.dayCount.calcValue = data.dayCount
    me.attr.dayCount.setValue(me.attr.dayCount.calcValue)
    me.attr.calendarDayCount.calcValue = data.calendarDayCount
    me.attr.calendarDayCount.setValue(me.attr.calendarDayCount.calcValue)
    me.attr.dateFromAvg.calcValue = AC.dateService.shiftDate(data.dateFromAvg)
    me.attr.dateFromAvg.setValue(me.attr.dateFromAvg.calcValue)
    me.attr.dateToAvg.calcValue = AC.dateService.shiftDate(data.dateToAvg)
    me.attr.dateToAvg.setValue(me.attr.dateToAvg.calcValue)
    me.attr.avgCalcType.calcValue = data.avgCalcType
    me.attr.avgCalcType.setValue(me.attr.avgCalcType.calcValue)
    me.attr.avgSum.calcValue = data.baseSum
    me.attr.avgSum.setValue(me.attr.avgSum.calcValue)
    me.attr.standingAll.calcValue = data.standingAll
    me.attr.standingAll.setValue(me.attr.standingAll.calcValue)
    me.down('[name=standingAllInYearLabel]').setText(data.standingAll ? (('' + Math.floor(data.standingAll / 12)).substr(-2, 2) + ' р.' + (' ' + (data.standingAll - Math.floor(data.standingAll / 12) * 12)).substr(-2, 2) + ' м.') : '')
    me.attr.standingYearMonth.calcValue = data.standingYearMonth
    me.attr.standingYearMonth.setValue(me.attr.standingYearMonth.calcValue)
    me.down('[name=workLess6monthsLabel]').setText(data.workLess6months ? data.workLess6months : '')
    me.attr.standingAllInYear.setValue(data.standingAllInYear)
    me.attr.rate.calcValue = data.rate
    me.attr.rate.setValue(me.attr.rate.calcValue)
    me.attr.rateLabel.setValue(me.attr.rate.calcValue)
    me.attr.calcSum.calcValue = data.calcSum
    me.attr.calcSum.setValue(me.attr.calcSum.calcValue)
    me.attr.minSalary.setValue(data.minSalary)
    me.attr.maxECB.setValue(data.maxECB)
    me.attr.maxECBDay.setValue(data.maxECBDay)
    me.attr.paySum.setValue(data.paySum)
    if (data.dateFirst) {
      me.attr.dateFirst.calcValue = AC.dateService.shiftDate(data.dateFirst)
      me.attr.dateFirst.setValue(me.attr.dateFirst.calcValue)
    }
    if (data.dictIllnessReasonID && me.attr.dictIllnessReasonID.getValue() !== data.dictIllnessReasonID) {
      me.attr.dictIllnessReasonID.calcValue = data.dictIllnessReasonID
      me.attr.dictIllnessReasonID.setValueById(data.dictIllnessReasonID)
    }
    if (data.employeeFamilyID && me.attr.employeeFamilyID.getValue() !== data.employeeFamilyID) {
      me.attr.employeeFamilyID.setValueById(data.employeeFamilyID)
    }
    me.record.set('employeeSickLimitID', data.employeeSickLimitID || null)
    me.record.set('dayFSSU', data.dayFSSU || null)
    if (clear || !store.count()) {
      data.accruals.forEach(accr => {
        accr.orderID = me.instanceID
        accr.orderNumber = me.record.get('orderNumber')
        accr.orderDate = me.record.get('orderDate')
        accr.orderRegistryID = me.record.get('orderRegistryID')
        accr.rate = data.rate
        accr.periodCalcID = null
        accr['periodCalcID.name'] = null
      })
      store.insert(store.data.length, data.accruals)
    } else {
      data.accruals.forEach(accr => {
        const record = store.getAt(accr.idx)
        if (record) {
          record.set('avgCalcType', accr.avgCalcType)
          record.set('baseSum', accr.baseSum)
          record.set('dateFromAvg', accr.dateFromAvg)
          record.set('dateToAvg', accr.dateToAvg)
          record.set('paySum', accr.paySum)
          record.set('mask', accr.mask)
          record.set('flagsRec', accr.flagsRec)
          record.set('flagsFix', accr.flagsFix)
          record.set('rate', data.rate)
          record.set('accrualDt', accr.accrualDt ? JSON.stringify(accr.accrualDt) : null)
        }
      })
    }

    if (data.accrualsAvg) {
      if (clearAvg || !storeAvg.count() || me.attr.parentSicknessID.getValue()) {
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
            record.set('opSum', accr.opSum)
            record.set('accrualDt', accr.accrualDt)
          }
        })
      }
    }
    storeAvg.sort('dateFrom', 'ASC')
    me.attr.accrualAvg.GridSummary.dataBind()
    store.sort('dateFrom', 'ASC')
    me.attr.orderRegistryDt.GridSummary.dataBind()
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
  me.calcSickness(me)
}

function setDays (me) {
  const { dateFrom, dateTo } = me.attr
  if (dateFrom.getValue() && dateFrom.isValid() && dateTo.getValue() && dateTo.isValid()) {
    const dateFromTime = dateFrom.getValue().getTime()
    const dateToTime = dateTo.getValue().getTime()
    const oneDay = 1000 * 60 * 60 * 24

    const days = (dateToTime - dateFromTime) / oneDay
    me.record.set('days', days + 1)
  } else {
    me.record.set('days')
  }
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

  me.actions.subEmpAction = new Ext.Action({
    actionId: 'subEmpAction',
    eventId: 'subEmpAction',
    iconCls: 'u-icon-copy',
    cls: 'add-currect-action',
    tooltip: UB.i18n('Додати для сумісників'),
    text: UB.i18n('Додати для сумісників'),
    handler: function () {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_docRegSickness',
        method: 'addSubEmpOrder',
        params: {
          orderID: me.instanceID
        }
      }).then(response => {
        me.setLoading(false)
        const resultData = JSON.parse(response.resultData)
        if (resultData.length) {
          resultData.forEach(orderID => {
            $App.doCommand({
              cmdType: 'showForm',
              entityName: 'hr_docRegSickness',
              entity: 'hr_docRegSickness',
              isModal: false,
              tabId: 'hr_docRegSickness' + orderID,
              target: $App.getViewport().centralPanel,
              instanceID: orderID
            })
          })
        } else {
          AC.viewUtils.showToast(UB.i18n('Виконано'))
        }
      }, (err) => {
        me.setLoading(false)
        throw err
      })
    }
  })

  if (!me.actions.calcSickness) {
    me.actions.calcSickness = new Ext.Action({
      iconCls: 'fas fa-calculator',
      cls: 'fill-action',
      actionId: 'calcBtn',
      text: UB.i18n('Розрахувати'),
      eventId: 'calcBtn',
      handler: function () {
        me.calcSickness(me, true, true)
      }
    })
  }
  me.actions.empNumAction = new Ext.Action({
    actionId: 'empNumAction',
    eventId: 'empNumAction',
    iconCls: 'el-icon-s-custom',
    cls: 'blue-action',
    tooltip: UB.i18n('Особовий рахунок'),
    text: UB.i18n('Особовий рахунок'),
    handler: function () {
      const employeeNumberID = me.record.get('employeeNumberID')
      if (employeeNumberID) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumber',
          entity: 'hr_employeeNumber',
          instanceID: employeeNumberID,
          tabId: `hr_employeeNumber-${employeeNumberID}`,
          target: $App.getViewport().centralPanel
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
      const employeeNumberID = me.record.get('employeeNumberID')
      if (employeeNumberID) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: employeeNumberID
            }
          },
          tabId: `hr_rl${employeeNumberID}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })
}

function onAfterRender () {
  const me = this
  me.attr.dayCount.inputCell.on('contextmenu', dayCountContextMenu, me)
}

function dayCountContextMenu (e, t) {
  const me = this

  async function showTimeSheet () {
    await $App.doCommand({
      cmdType: 'showForm',
      formCode: 'tim_timeSheet',
      cmpInitConfig: {
        defaultValues: {
          employeeNumberID: me.record.get('employeeNumberID')
        }
      },
      tabId: `tim_timeSheet${me.record.get('employeeNumberID')}`,
      target: $App.getViewport().centralPanel
    })
  }

  if (!me.dayCountContextMenu) {
    me.dayCountContextMenu = Ext.create('Ext.menu.Menu', { items: [
      {
        text: UB.i18n('Табель'),
        iconCls: '',
        itemID: 'experiencePeriod',
        scope: me,
        handler: showTimeSheet
      }
    ] })
  }
  me.dayCountContextMenu.showAt(e.getXY())
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

function setParentData (ctrl) {
  const me = this
  const value = ctrl.getValue()
  if (!me.skipRecalcByParent) {
    let skipSetFirst = false
    if (ctrl.getFieldValue('source') === 'docRegSickness') {
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(AC.dateService.addDays(ctrl.getFieldValue('dateTo'), 1)))
      me.record.set('parentSicknessID', value)
      me.record.set('parentAccrualID', null)
      if (!me.record.get('empOrderSicknessID') || !me.record.get('dictIllnessReasonID')) {
        me.attr.dictIllnessReasonID.setValueById(ctrl.getFieldValue('dictIllnessReasonID'))
        skipSetFirst = true
      }
      me.attr.dictIllnessReasonID.setReadOnly(me.record.get('illnessKind') === ctrl.getFieldValue('illnessKind'))
      parentSicknessAttrs.forEach(attrName => {
        me.attr[attrName].setReadOnly(!!value)
      })
    } else {
      me.attr.dateFirst.setReadOnly(false)
      me.record.set('parentSicknessID', null)
      me.record.set('parentAccrualID', value)
      parentAccrualAttrs.forEach(attrName => {
        me.attr[attrName].setReadOnly(!!value)
      })
      me.attr.dictIllnessReasonID.setReadOnly(false)
    }
    if (!value) {
      me.record.set('dateFirst', me.record.get('dateFrom'))
    }
    checkDictIllnessReason(me, skipSetFirst)
    me.skipRecalcByParent = false
    setDocRegSicknessDt(me).then(() => {
      calcSickness(me, true, true)
    })
  }
}

function doReversalAction () {
  const me = this
  $App.showModal({
    formCode: 'hr_orderRegistryDialog',
    description: UB.i18n('Попередження'),
    isClosable: true,
    customParams: {
      message: UB.i18n(`Документ нарахування було проведено у закритому періоді!`),
      buttons: [UB.i18n('Не сторнувати'), UB.i18n('Тільки сторнувати'), UB.i18n('Сторнувати та розрахувати ')],
      buttonWidth: 210
    }
  }).then(buttonIndex => {
    if (buttonIndex) {
      me.setLoading(true)
      const action = buttonIndex === 2 ? 'recalc' : 'revers'
      $App.connection.run({
        entity: 'hr_orderRegistry',
        method: 'doReversalDocReg',
        execParams: {
          ID: me.record.get('orderRegistryID'),
          docRegID: me.instanceID,
          action: action
        }
      }).then(() => {
        me.setLoading(false)
        me.onRefresh()
      }).catch(err => {
        me.setLoading(false)
        throw err
      })
    }
  })
}

function doCancelReversalAction () {
  const me = this
  $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Скасувати сторнування документа?'))
    .then(function (choice) {
      if (choice) {
        $App.connection.run({
          entity: 'hr_orderRegistry',
          method: 'doCancelReversalDocReg',
          execParams: {
            ID: me.record.get('orderRegistryID'),
            docRegID: me.instanceID
          }
        }).then(() => {
          me.setLoading(false)
          me.onRefresh()
        }).catch(err => {
          me.setLoading(false)
          throw err
        })
      }
    })
}

function setDictIllnessReason (me, value, skipSetFirst) {
  AC.viewUtils.setWhereListProperty(me.attr.dictIllnessReasonID, [
    ['illnessKind', '=', value || me.record.get('illnessKind')],
    ['dateFrom', '<=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate())],
    ['dateTo', '>=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate())]
  ], undefined, ['clearValue', 'clearStore', 'clearWhereList'])
  if (!skipSetFirst) {
    UB.Repository('hr_dictIllnessReason')
      .attrs(['ID'])
      .where('illnessKind', '=', value || me.record.get('illnessKind'))
      .where('dateFrom', '<=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate()))
      .where('dateTo', '>=', AC.dateService.unshiftDate(me.record.get('dateFirst') || me.record.get('dateFrom') || AC.dateService.todayDate()))
      .orderBy('orderN')
      .selectScalar().then(dictIllnessReasonID => {
        if (dictIllnessReasonID) {
          me.record.set('dictIllnessReasonID', dictIllnessReasonID)
        }
      })
  }
}
function checkDictIllnessReason (me, skipSetFirst) {
  if (me.attr.dictIllnessReasonID.getValue()) {
    if (!(AC.dateService.unshiftDate(me.attr.dictIllnessReasonID.getFieldValue('dateFrom')) <= AC.dateService.unshiftDate(me.attr.dateFrom.getValue()) &&
        AC.dateService.unshiftDate(me.attr.dictIllnessReasonID.getFieldValue('dateTo')) >= AC.dateService.unshiftDate(me.attr.dateFrom.getValue()))) {
      $App.dialogInfo('Увага! Період дії вказаної причини непрацездатності не відповідає даті початку первинного лікарняного!')
      setDictIllnessReason(me, me.record.get('illnessKind'), skipSetFirst)
    }
  } else {
    setDictIllnessReason(me, me.record.get('illnessKind'), skipSetFirst)
  }
}

function setSerieCtrlState (me, value) {
  me.attr.seria.setDisabled(value !== '1')
  me.attr.seria.setAllowBlank(value !== '1')
}

function checkSicknessDt (me, showError = true) {
  const sicknessDt = me.attr.docRegSicknessDt.getData()
  let period
  const dateFrom = AC.dateService.unshiftDate(me.record.get('dateFrom'))
  const dateTo = AC.dateService.unshiftDate(me.record.get('dateTo'))
  let date = dateFrom
  const badDays = []
  do {
    period = sicknessDt.find(o => AC.dateService.unshiftDate(o.dateFrom) <= date && date <= AC.dateService.unshiftDate(o.dateTo))
    if (!period) {
      badDays.push(AC.dateService.formatDate(date))
    }
    date = AC.dateService.addDays(date, 1)
  } while (date <= dateTo)
  if (badDays.length) {
    if (showError) $App.dialogError(UB.i18n('Для {0} відсутні рядки на закладці "Звільнення від роботи"! Виправіть перед збереженням!', badDays.join(',')))
    return false
  }
  return true
}

async function onCheckValidBeforeSaveOrder () {
  const me = this
  const skipCheck = me.record.get('orderState') === 'PROJECT' && me.record.modified && me.record.modified.orderState === 'POSTED'
  if (!skipCheck && me.record.get('illnessKind') !== me.attr.dictIllnessReasonID.getFieldValue('illnessKind')) {
    await $App.dialogError(UB.i18n(`Причина непрацездатності не відповідає типу документа!`), 'Увага')
    return false
  }
  if (me.record.get('parentSicknessID')) {
    const doc = await UB.Repository('hr_docRegSickness')
      .attrs('ID', 'description', 'empOrderID')
      .where('parentSicknessID', '=', me.record.get('parentSicknessID'))
      .where('ID', '!=', me.instanceID)
      .limit(1)
      .selectSingle()
    if (doc) {
      const timeSheetDay = await UB.Repository('tim_timeSheet')
        .attrs('ID')
        .where('orderID', 'in', [doc.ID, doc.empOrderID || 0])
        .where('isCanceled', '=', 0)
        .limit(1)
        .selectSingle()
      if (timeSheetDay) {
        await $App.dialogError(UB.i18n(`Попередній лист - "${me.attr.parentSicknessID.getFieldValue('description')}" вже вказано як первинний для лікарняного "${doc.description}". Збереження не можливо!`), 'Увага')
        return false
      }
    }
  }
  if (checkSicknessDt(me)) {
    const response = await $App.connection.run({
      entity: 'hr_employeeNumber',
      method: 'checkDateWork',
      employeeNumberID: me.record.get('employeeNumberID'),
      onDate: AC.dateService.shiftDate(me.record.get('dateFrom'))
    })
    if (!response.isValid) {
      return $App.dialogYesNo('Увага', UB.i18n('На дату початку лікарняного особа ще не працювала в організації! Все одно зберегти?'))
    }
  } else {
    return false
  }
}

function recalSickness () {
  const me = this
  if (checkSicknessDt(me, false)) {
    calcSickness(me, true, true)
  }
}

async function setLinkedDocsDescription () {
  const me = this
  const childOrder = await UB.Repository('hr_docRegSickness')
    .attrs(['ID', 'dateFrom', 'dateTo', 'dictIllnessReasonID.name', 'seria', 'orderNumber', 'orderDate', 'description'])
    .where('parentSicknessID', '=', me.instanceID)
    .selectSingle()
  if (childOrder) {
    me.attr['childOrderDescription'].setValue(`${childOrder.description} (${childOrder['dictIllnessReasonID.name']})`)
    me.attr['childOrderDescription'].on('focus', function () {
      const formCode = 'hr_docRegSickness'
      const formStore = UB.core.UBStoreManager.getFormStore()
      if (formStore.findRecord('code', formCode, 0, false, true, true)) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: formCode,
          entity: 'hr_docRegSickness',
          instanceID: childOrder.ID || 0,
          tabId: 'hr_docRegSickness' + (childOrder.ID || 0),
          target: $App.getViewport().centralPanel
        })
      }
    }, me)
  }
  const sicknessRequis = await UB.Repository('hr_sicknessRequisAccrual')
    .attrs(['sicknessRequisDtID.sicknessRequisID', 'sicknessRequisDtID.sicknessRequisID.description'])
    .where('accrualID', 'in', UB.Repository('hr_accrual').attrs('ID')
      .whereIf(me.record.get('empOrderSicknessID'), 'empOrderID', '=', me.record.get('empOrderSicknessID'))
      .whereIf(!me.record.get('empOrderSicknessID'), 'orderID', '=', me.instanceID)
    ).selectSingle({
      'sicknessRequisDtID.sicknessRequisID': 'sicknessRequisID',
      'sicknessRequisDtID.sicknessRequisID.description': 'description'
    })
  if (sicknessRequis) {
    me.attr['sicknessRequisDescription'].setValue(sicknessRequis.description)
    me.attr['sicknessRequisDescription'].on('focus', function () {
      const formCode = 'hr_sicknessRequis'
      const formStore = UB.core.UBStoreManager.getFormStore()
      if (formStore.findRecord('code', formCode, 0, false, true, true)) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: formCode,
          entity: 'hr_sicknessRequis',
          instanceID: sicknessRequis.sicknessRequisID || 0,
          tabId: 'hr_sicknessRequis' + (sicknessRequis.sicknessRequisID || 0),
          target: $App.getViewport().centralPanel
        })
      }
    }, me)
    const payRoll = await UB.Repository('hr_RollRequis')
      .attrs(['payRollID', 'payRollID.orderNumber', 'payRollID.description', 'payRollID.orderType'])
      .where('sicknessRequisID', '=', sicknessRequis.sicknessRequisID)
      .selectSingle({
        'payRollID.orderNumber': 'orderNumber',
        'payRollID.description': 'description',
        'payRollID.orderType': 'orderType'
      })
    if (payRoll) {
      me.attr['payRollDescription'].setValue(`${payRoll.description} №${payRoll.orderNumber}`)
      me.attr['payRollDescription'].on('focus', function () {
        const formCode = payRoll['orderType']
        const formStore = UB.core.UBStoreManager.getFormStore()
        if (formStore.findRecord('code', formCode, 0, false, true, true)) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: formCode,
            entity: 'hr_payRoll',
            instanceID: payRoll.payRollID || 0,
            tabId: 'hr_payRoll' + (payRoll.payRollID || 0),
            target: $App.getViewport().centralPanel
          })
        }
      }, me)
    }
  }
}

function setAvgDataFromPriorDocument (me) {
  if (me.record.get('orderState') === 'POSTED' || !me.record.get('employeeNumberID') || !me.attr.accrualAvg.getStore().count()) {
    return
  }
  UB.Repository('hr_docRegSickness')
    .attrs(['ID', 'dateFrom', 'dateTo', 'dictIllnessReasonID.payElFSSUID.description'])
    .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
    .where('ID', '<>', me.instanceID)
    .orderByDesc('dateFrom')
    .selectAsObject({
      'dictIllnessReasonID.payElFSSUID.description': 'payElID.description'
    }).then(docs => {
      if (docs.length) {
        docs.forEach(row => {
          row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
          row.dateTo = AC.dateService.shiftDate(row.dateTo)
        })
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_docRegSelect',
          isModal: true,
          cmpInitConfig: {
            sourceData: docs,
            onSelect: (doc) => {
              UB.Repository('hr_accrualAvg')
                .attrs(['periodID', 'flagsFix', 'opDays', 'baseSum', 'opSum', 'accrualDt'])
                .where('orderID', '=', doc.ID)
                .selectAsObject().then(accrualAvgs => {
                  const store = me.attr.accrualAvg.getStore()
                  const allRecords = store.snapshot || store.data
                  allRecords.each(record => {
                    if (!record.get('opSum')) {
                      const accrualAvg = accrualAvgs.find(o => o.periodID === record.get('periodID'))
                      if (accrualAvg) {
                        record.set('opDays', accrualAvg.opDays)
                        record.set('baseSum', accrualAvg.baseSum)
                        record.set('opSum', accrualAvg.opSum)
                        record.set('accrualDt', JSON.stringify(accrualAvg.accrualDt || []))
                        record.set('flagsFix', 131137) // (1 << 0) | 1 << 6 | 1 << 17
                      }
                    }
                  })
                  me.calcSickness(me, false, false)
                })
            }
          }
        })
      } else {
        $App.dialogInfo(UB.i18n(`Попередні документи нарахування відсутні!`))
      }
    })
}

function isValidDateFirst (me) {
  const dateFrom = me.attr.dateFrom.getValue()
  const dateFirst = me.attr.dateFirst.getValue()
  return dateFirst && !me.record.get('parentSicknessID') && !me.record.get('parentAccrualID')
    ? dateFrom && dateFirst && dateFrom.getTime() === dateFirst.getTime() : true
}

function checkDateFirst () {
  const me = this
  if (!isValidDateFirst(me)) {
    me.attr.dateFirst.inputEl.addCls('grd-color-red')
  } else {
    me.attr.dateFirst.inputEl.removeCls('grd-color-red')
  }
}

function beforePosting () {
  const me = this
  me.postMessage = ''
  if (!isValidDateFirst(me)) {
    me.postMessage = UB.i18n('Вказана дата початку первинного але не вказан первинний лист. ')
  }
  return Promise.resolve(true)
}

function setEmployeeFilter (showDismissed = false) {
  const me = this
  const orderDate = AC.dateService.truncTimeToUtcNull(me.attr.orderDate.getValue())
  if (showDismissed) {
    AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
      ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
      ['dateFrom', '<=', orderDate],
      ['dateTo', '<', orderDate],
      ['[dateTo] = [maxDateTo]', 'custom', undefined],
      (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
    ])
  } else {
    AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
      ['organizationID', '=', me.record.get('orderRegistryID.organizationID')],
      ['dateFrom', '<=', orderDate],
      ['dateTo', '>=', orderDate],
      (me.record.get('workPlaceOnly') ? ['employeeNumberID.empWorkPlace', '=', '5'] : ['employeeNumberID.empWorkPlace', 'isNull'])
    ])
  }
}
