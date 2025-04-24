/* global AC appAC UB */

exports.formCode = {
  initComponentDone,
  initComponentStart,
  onControlChanged,
  onBeforeSave,
  setAccrualsByDate
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('manualsaving', manualSaving, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

async function onRecordLoaded (record, data) {
  const me = this
  if (me.isNewInstance) {
    const item = await UB.Repository('hr_dictSalarySchemeDet')
      .attrs(['coefMin', 'coefMax', 'dateFrom', 'dateTo'])
      .where('dictSalarySchemeLevelID', '=', me.record.get('dictSalarySchemeLevelID'))
      .orderBy('dateFrom', 'desc')
      .selectSingle()
    if (item) {
      me.record.set('coefMin', item.coefMin)
      me.record.set('coefMax', item.coefMax)
      if (!AC.dateService.isMaxDate(item.dateTo)) {
        me.record.set('dateFromEmpty', AC.dateService.addDays(item.dateTo, 1))
        me.setAccrualsByDate(me.record.get('dateFromEmpty'))
      }
    }
  }
}

function onBeforeSave () {
  const me = this
  if (me.setAccrualByMinValue) {
    if (!me.record.get('accrualSumMax')) me.record.set('accrualSumMax', me.record.get('accrualSumMin'))
    if (!me.record.get('accrualSum')) me.record.set('accrualSum', me.record.get('accrualSumMin'))
  }
  return Promise.resolve(true)
}

async function onFormDataReady () {
  const me = this
  if (!me.isNewInstance) {
    me.attr.accrualSumMax.setMinValue(me.record.get('accrualSumMin'))
    me.attr.accrualSum.setMinValue(me.record.get('accrualSumMin'))
    me.attr.accrualSum.setMaxValue(me.record.get('accrualSumMax'))
  }
  if (!me.notRefreshAfterSave) {
    const salaryScheme = await UB.Repository('hr_dictSalarySchemeLevel')
      .attrs('dictSalarySchemeID.setAccrualByMinValue', 'dictSalarySchemeID.schemeType')
      .selectById(me.record.get('dictSalarySchemeLevelID'), {
        'dictSalarySchemeID.setAccrualByMinValue': 'setAccrualByMinValue',
        'dictSalarySchemeID.schemeType': 'schemeType'
      }) || {}
    me.setAccrualByMinValue = salaryScheme.setAccrualByMinValue
    if (me.setAccrualByMinValue) {
      me.attr.accrualSumMax.setAllowBlank(true)
      me.attr.accrualSum.setAllowBlank(true)
    } else {
      me.attr.coefMin.setDisabled(salaryScheme.schemeType === '2')
      me.attr.coefMax.setDisabled(salaryScheme.schemeType === '2')
      me.attr.coefMin.setAllowBlank(salaryScheme.schemeType === '2')
      me.attr.coefMax.setAllowBlank(salaryScheme.schemeType === '2')
      me.attr.accrualSum.setAllowBlank(salaryScheme.schemeType === '1')
      me.attr.accrualSumMin.setAllowBlank(salaryScheme.schemeType === '1')
      me.attr.accrualSumMax.setAllowBlank(salaryScheme.schemeType === '1')
    }
  }
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'accrualSumMin':
      me.attr.accrualSumMax.setMinValue(value)
      me.attr.accrualSum.setMinValue(value)
      break
    case 'accrualSumMax':
      me.attr.accrualSum.setMaxValue(value)
      break
    case 'dateFromEmpty':
      me.setAccrualsByDate(value)
      break
    case 'coefMin':
      me.setAccrualsByDate(me.attr.dateFromEmpty.getValue(), 'accrualSumMin')
      break
    case 'coefMax':
      me.setAccrualsByDate(me.attr.dateFromEmpty.getValue(), 'accrualSumMax')
      break
  }
}

async function setAccrualsByDate (onDate, ctrlName) {
  const me = this
  if (onDate && AC.dateService.isValid(onDate)) {
    const schemeID = await UB.Repository('hr_dictSalarySchemeLevel')
      .attrs('dictSalarySchemeID')
      .where('ID', '=', me.record.get('dictSalarySchemeLevelID'))
      .selectScalar()
    const accrualSum = await UB.Repository('hr_dictSalarySchemeBase')
      .attrs('accrualSum')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('dictSalarySchemeID', '=', schemeID)
      .selectScalar()
    if (accrualSum) {
      if (!ctrlName || ctrlName === 'accrualSumMin') {
        me.attr.accrualSumMin.setValue(AC.currencyService.round((me.attr.coefMin.getValue() || 0) * accrualSum, 2) || 0)
      }
      if (!ctrlName || ctrlName === 'accrualSumMax') {
        me.attr.accrualSumMax.setValue(AC.currencyService.round((me.attr.coefMax.getValue() || 0) * accrualSum, 2) || 0)
      }
    }
  }
}

function manualSaving (me, action) {
  if (action && action.length) {
    action = action[0]
  }
  me.notRefreshAfterSave = (action && action.actionId === UB.view.BasePanel.actionId.saveAndClose)
}
