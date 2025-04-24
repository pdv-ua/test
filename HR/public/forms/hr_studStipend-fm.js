/* global AC _ UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  setStipendAmount
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('aftersave', afterSave, me)
  me.on('beforesave', onPrepareDataBeforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'dateFrom':
      me.attr.dateToEmpty.setMinValue(value)
      me.setStipendAmount(me.attr.typeStipend.getValue(), me.attr.averageScore.getValue() || 0)
      break
    case 'typeStipend':
      me.setStipendAmount(value, me.attr.averageScore.getValue() || 0)
      break
    case 'averageScore':
      me.setStipendAmount(me.attr.typeStipend.getValue(), value || 0)
      break
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
}

function setStipendAmount (typeStipend, averageScore) {
  const me = this
  if (typeStipend) {
    const onDate = me.attr.dateFrom.getValue()
    if (!onDate || !AC.dateService.isValid(onDate)) {
      return
    }
    me.setLoading(true)
    UB.Repository('hr_dictStipendAmount')
      .attrs('accrualSum')
      .where('orgID', '=', appAC.globalOrganization())
      .where('dictTypeStipendID', '=', typeStipend)
      .where('averageScoreMin', '<=', averageScore || 0)
      .where('averageScoreMax', '>=', averageScore || 0)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .limit(1)
      .selectScalar()
      .then(value => {
        me.attr.sumStipend.setValue(value || 0)
      })
      .finally(() => {
        me.setLoading(false)
      })
  } else {
    me.attr.sumStipend.setValue(0)
  }
}

function afterSave (me) {
  if (me.notRefreshAfterSave) {
    me.notRefreshAfterSave = true
  } else {
    const gridSender = AC.gridUtils.isUbGrid(me.sender) ? me.sender : (me.sender && me.sender.ownerCt)
    if (AC.gridUtils.isUbGrid(gridSender)) {
      gridSender.onRefresh()
    }
  }
}

function onPrepareDataBeforeSave (me, params) {
  if (params.execParams.dateFrom) {
    params.execParams.dateFrom = AC.dateService.truncTimeToUtcNull(params.execParams.dateFrom)
  }
  if (params.execParams.dateToEmpty) {
    params.execParams.dateToEmpty = AC.dateService.truncTimeToUtcNull(params.execParams.dateToEmpty)
  }
}
