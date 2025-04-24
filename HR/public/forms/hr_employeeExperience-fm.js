/* global AC HR UB $App appAC */
/* global Ext $App _ XLSX Blob saveAs FileReader js_beautify  JSLINT js_beautify DevUtils localStorage UB AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  initData,
  postInit,
  onAfterSave,
  onAfterDelete,
  refreshParentForm,
  recalcYmd,
  recalcCalcDate,
  controlChanged,
  afterGridEdit,
  beforeGridEdit,
  onValidateEdit,
  onBeforeSetLocalStoreData,
  onCheckValidBeforeSaveForm,
  calcExp
}

function onCheckValidBeforeSaveForm () {
  let me = this
  let calcDate = AC.dateService.truncTimeToUtcNull(me.record.get('calcDate'))
  return UB.Repository('hr_employee')
    .attrs(['birthDate'])
    .where('ID', '=', me.commandConfig.cmpInitConfig.employeeID)
    .selectSingle().then(birthDate => {
      if (birthDate.birthDate && AC.dateService.truncTimeToUtcNull(birthDate.birthDate) >= calcDate) {
        $App.dialogError(UB.i18n('Увага, внесений стаж перевищує вік працівника'), UB.i18n('Помилка'))
        return Promise.resolve(false)
      }
    })
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('afterDelete', onAfterDelete, me)
}

function initComponentDone () {
  const me = this
  me.gridConfig = {
    detailGrids: ['employeeExperienceDt']
  }
  AC.acEditGridManager.init(me)
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  me.calcMethod = AC.settings.get('hrCalcExperienceMethod', appAC.globalOrganization())
  createActions(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function calcExp (dateFrom, dateTo, koef, onDate) {
  const me = this
  dateTo = dateTo || onDate
  const dayCount = Math.floor(AC.dateService.dateDiff(dateFrom, dateTo) * (koef || 1))
  const ymd = me.calcMethod === 'SIMPLE'
    ? AC.dateService.daysToYmd(dayCount)
    : AC.dateService.getYmd(AC.dateService.addDays(dateTo, -1 * dayCount), dateTo, true)
  return {
    totalDays: dayCount,
    years: ymd.years,
    months: ymd.months,
    days: ymd.days
  }
}

function onBeforeSetLocalStoreData (me, detail) {
  const onDate = me.parentRecord ? me.parentRecord.get('onDate') : (me.calcDate || AC.dateService.todayDate())
  detail.forEach(row => {
    row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
    row.dateTo = AC.dateService.shiftDate(row.dateTo)
    const exp = me.calcExp(row.dateFrom, row.dateTo, row.koef, onDate)
    row.days = exp.days
    row.years = exp.years
    row.months = exp.months
    row.totalDays = exp.totalDays
  })
  if (detail.length) {
    const totalDays = detail.reduce((cnt, row) => {
      cnt += row.totalDays
      return cnt
    }, 0)
    const calcDate = AC.dateService.addDays(onDate, -1 * totalDays)
    const ymd = AC.dateService.getYmd(calcDate, me.attr.onDate.getValue(), false)
    me.attr.years.setValue(ymd.years)
    me.attr.months.setValue(ymd.months)
    me.attr.days.setValue(ymd.days)
    me.attr.calcDate.setValue(calcDate)
  }
}

function onFormDataReady () {
  const me = this
  me.initData(me)
  const methodCode = me.attr.dictExperienceID.getFieldValue('methodExpID.code')
  setControls(me, methodCode)
  setExpGuideText(me)
  me.attr.onDate.setReadOnly(true)
  me.down('[name=labelOnDateAlert]').hide()
}

function initData (me) {
  if (me.isInited) {
    return
  }
  if (me.parentRecord) {
    if (me.isNewInstance) {
      me.record.set('employeeID', me.parentRecord.get('employeeID'))
      me.record.set('dictExperienceID', me.parentRecord.get('ID') || me.parentRecord.get('dictExperienceID'))
      let calcDate = me.parentRecord.get('calcDate')
      if (!calcDate) {
        calcDate = AC.dateService.getCalcDate(me.parentRecord.get('years'), me.parentRecord.get('months'),
          me.parentRecord.get('days'), me.parentRecord.get('onDate') || AC.dateService.todayDate())
      }
      me.attr.calcDate.setValue(calcDate)
    } else {
      if (me.clearEmployeeNumber) {
        me.record.set('employeeNumberID', null)
      }
    }
    const onDate = me.down('[name=onDate]')
    const years = me.down('[name=years]')
    const months = me.down('[name=months]')
    const days = me.down('[name=days]')
    me.isInnerChange = true
    try {
      onDate.setValue(me.parentRecord.get('onDate') || AC.dateService.todayDate())
      years.setValue(me.parentRecord.get('years'))
      months.setValue(me.parentRecord.get('months'))
      days.setValue(me.parentRecord.get('days'))
    } finally {
      me.isInnerChange = false
    }
    me.attr.onDate = onDate
    me.attr.years = years
    me.attr.months = months
    me.attr.days = days
    me.isInited = true
  } else {
    if (me.isAddNew && me.isNewInstance) {
      me.attr.dictExperienceID.setReadOnly(false)
      me.record.set('employeeID', me.employeeID)
      me.record.set('employeeNumberID', me.employeeNumberID)
      me.attr.calcDate.setValue(me.calcDate)
      recalcYmd(me)
      me.down('[name=onDate]').setValue(me.calcDate)
    }
  }
}

function postInit (me) {
  const store = me.attr.employeeExperienceDt.getStore()
  if (store) {
    store.sort('dateFrom')
    store.on('datachanged', function (store) {
      const isReadOnly = store.data.length > 0
      me.attr.years.setReadOnly(isReadOnly)
      me.attr.months.setReadOnly(isReadOnly)
      me.attr.days.setReadOnly(isReadOnly)
      me.attr.calcDate.setReadOnly(isReadOnly)
      me.attr.startCalcDate.setReadOnly(isReadOnly)
    })
  }
}

function onAfterSave () {
  const me = this
  me.refreshParentForm(me)
  me.down('[name=labelOnDateAlert]').hide()
}

function onAfterDelete () {
  const me = this
  me.refreshParentForm(me)
}

function refreshParentForm (me) {
  const grid = me.sender && me.sender.ownerCt
  if (grid && grid.reload) {
    const parentForm = grid.up('form')
    grid.reload(parentForm)
  }
}

function recalcYmd (me) {
  if (me.isInnerChange) {
    return
  }
  me.isInnerChange = true
  try {
    const onDate = me.attr.startCalcDate.getValue() && AC.dateService.isValid(me.attr.startCalcDate.getValue())
      ? me.attr.startCalcDate.getValue() : me.attr.onDate.getValue()
    let ymd
    if (me.calcMethod === 'SIMPLE') {
      const dayCount = AC.dateService.dayDiff(me.attr.calcDate.getValue(), onDate)
      ymd = AC.dateService.daysToYmd(dayCount)
    } else {
      ymd = AC.dateService.getYmd(me.attr.calcDate.getValue(), onDate, true)
    }
    if (ymd) {
      me.attr.years.setValue(ymd.years)
      me.attr.months.setValue(ymd.months)
      me.attr.days.setValue(ymd.days)
    }
  } finally {
    me.isInnerChange = false
  }
}

function recalcCalcDate (me) {
  if (me.isInnerChange) {
    return
  }
  me.isInnerChange = true
  try {
    const onDate = me.attr.startCalcDate.getValue() && AC.dateService.isValid(me.attr.startCalcDate.getValue())
      ? me.attr.startCalcDate.getValue() : me.attr.onDate.getValue()
    if (me.calcMethod === 'SIMPLE') {
      const dayCount = AC.dateService.ymdToDays({ years: me.attr.years.getValue(), months: me.attr.months.getValue(), days: me.attr.days.getValue() })
      const calcDateVal = AC.dateService.addDays(onDate, -1 * dayCount + 1)
      calcDateVal && me.attr.calcDate.setValue(calcDateVal)
    } else {
      const calcDateVal = AC.dateService.getCalcDate(me.attr.years.getValue(), me.attr.months.getValue(), me.attr.days.getValue(), onDate)
      calcDateVal && me.attr.calcDate.setValue(calcDateVal)
    }
  } finally {
    me.isInnerChange = false
  }
}

function setControls (me, methodCode) {
  me.attr.employeeExperienceDt.setVisible(methodCode === '8')
  if (methodCode !== '8') {
    me.attr.employeeExperienceDt.removeAll()
  }
  if (me.isNewInstance) {
    const labelSize = me.down('[name=labelSize]')
    if (labelSize) {
      labelSize.setText(UB.i18n('Заповніть розмір стажу, розрахується дата початку'))
    }
    const labelPeriod = me.down('[name=labelPeriod]')
    if (labelPeriod) {
      labelPeriod.setText(UB.i18n('або заповніть дату початку, розрахується розмір стажу'))
    }
  }
}

function controlChanged (field) {
  const me = this
  switch (field.name) {
    case 'dictExperienceID':
      setControls(me, field.getFieldValue('methodExpID.code'))
      break
  }
}

function beforeGridEdit (context) {
  if (!context.record.get('koef')) context.record.set('koef', 1)
}

function afterGridEdit (editor, context) {
  const me = this
  const dmy = me.calcExp(context.record.get('dateFrom'), context.record.get('dateTo'), context.record.get('koef'), me.attr.onDate.getValue())
  context.record.set('days', dmy.days)
  context.record.set('months', dmy.months)
  context.record.set('years', dmy.years)
}

function onValidateEdit (editor, context) {
  if (!AC.dateService.isValid(context.record.get('dateFrom'))) return false
  if (!AC.dateService.isValid(context.record.get('dateTo'))) return false
}

async function setExpGuideText (me) {
  const messages = []
  const panel = me.down('[name=expGuidePanel]')
  panel.height = 200
  if (me.record.get('employeeNumberID')) {
    const tabNum = await UB.Repository('hr_employeeNumberS')
      .attrs('tabNum')
      .where('ID', '=', me.record.get('employeeNumberID'))
      .selectScalar()
    if (tabNum) {
      messages.push(UB.i18n('Вказаний стаж встановлений для конкретного табельного номеру - {0} (такий вид стажу може відрізнятись від значень стажів встановлених на картці особи)', tabNum))
    }
  }
  if (me.record.get('impSourceID')) {
    const orgName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .misc({ __mip_recordhistory_all: true })
      .selectById(me.record.get('impSourceID'))
    messages.push(`${UB.i18n('Запис створено міграцією')} [${AC.dateService.formatDate(me.record.get('modifyDate'), 'dd.mm.yyyy hh:nn:ss')}, ${orgName || ''}]`)
  } else if (me.record.get('isFromWorkbook')) {
    messages.push(`${UB.i18n('Запис створено при авторозрахунку за трудовою книжкою')} [${AC.dateService.formatDate(me.record.get('modifyDate'), 'dd.mm.yyyy hh:nn:ss') || ''}, ${me.record.get('modifyUserID.employeeNumberID.employeeID.fullFIO') || ''}]`)
  } else if (me.parentRecord && me.isNewInstance) {
    messages.push(UB.i18n('Стаж не був встановлений Працівнику, але пропонується Системою для даного типу посади'))
  } else if (me.record.get('orderID')) {
    messages.push(`${UB.i18n('Запис створено наказом')}: ${me.record.get('orderID.description') || ''}`)
  } else if (!me.isNewInstance) {
    messages.push(`${UB.i18n('Запис створено користувачем вручну')} [${AC.dateService.formatDate(me.record.get('modifyDate'), 'dd.mm.yyyy hh:nn:ss') || ''}, ${me.record.get('modifyUserID.employeeNumberID.employeeID.fullFIO') || ''}]`)
  }
  if (me.record.get('startCalcDate')) {
    const wbDism = await UB.Repository('hr_employeeWorkbook')
      .attrs('workPlace')
      .where('dateTo', '=', AC.dateService.shiftDate(me.record.get('startCalcDate')))
      .where('employeeID', '=', me.record.get('employeeID'))
      .selectSingle()
    messages.push(`${UB.i18n('Нарахування стажу припинене з')} ${AC.dateService.formatDate(me.record.get('startCalcDate'))} ${wbDism ? `(${UB.i18n('при звільненні з')} ${wbDism.workPlace || '?'} )` : ''}`)
  }
  const onDate = me.attr.startCalcDate.getValue() && AC.dateService.isValid(me.attr.startCalcDate.getValue())
    ? me.attr.startCalcDate.getValue() : me.attr.onDate.getValue()
  if (me.parentRecord && me.parentRecord.get('method') === '4' && me.employeeNumberID) {
    let excludeExperience = me.parentRecord.get('excludeExperience') || 0
    if (excludeExperience > 0) {
      const dictTimeCostList = await UB.Repository('hr_payEl')
        .attrs(['dictTimeCostID'])
        .where('methodID.code', '=', '57')
        .where('dictTimeCostID', 'isNotNull')
        .selectAsObject()
      const vacationList = await UB.Repository('tim_timeSheet')
        .attrs(['orderID.description'])
        .where('employeeNumberID', '=', me.employeeNumberID)
        .where('isActive', '=', 1)
        .where('factTimeCostID', 'in', dictTimeCostList.map(o => o.dictTimeCostID))
        .where('orderID', 'isNotNull')
        .where('dateWork', '<=', onDate)
        .groupBy(['orderID.description'])
        .selectAsObject() || 0
      messages.push(UB.i18n('При розрахунку стажу не враховуються термін відпусток - {0}, який, за табелем становить {1} днів.', vacationList.map(o => o['orderID.description']).join(', '), excludeExperience))
      const totalDays = me.parentRecord && me.parentRecord.get('totalDays')
      messages.push(UB.i18n('К-ть днів стажу без урахування днів відпустки: {0}', totalDays))
    }
  }
  const days = AC.dateService.dateDiff(me.record.get('calcDate'), onDate) + 1
  messages.push(`${UB.i18n('Загальна к-ть днів')}: ${days || 0}`)
  const yy = me.attr.years.getValue() || 0
  const mm = me.attr.months.getValue() || 0
  const dd = me.attr.days.getValue() || 0
  messages.push(UB.i18n('Відлік {0} днів за календарем від дати {1} становить {2}р., {3}м., {4}д (розрахунок включає граничні дні до днів стажу)', days, AC.dateService.formatDate(onDate), yy, mm, dd))
  panel.getEl().setHTML(`<ul>${messages.map(s => '<li>' + s + '</li>').join('')}</ul>`)
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  // const customReadOnly = AC.entityUtils.verifyRightsMethod()

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    iconCls: 'iconEdit',
    disabled: !AC.entityUtils.verifyRightsMethod('hr_employeeExperience', 'canEditOnDate'),
    handler: function () {
      me.attr.onDate.setReadOnly(false)
      me.down('[name=labelOnDateAlert]').show()
    }
  })
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
