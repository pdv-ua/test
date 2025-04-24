/* global AC UB appAC */

exports.formCode = {
  initComponentDone,
  initComponentStart,
  onFormDataReady,
  onAfterSave,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function getBaseAccrualSum (onDate) {
  return UB.Repository('hr_dictTarifCoeffDet')
    .attrs('accrualSum')
    .where('dictTarifCoeffID.baseAccrual', '=', true)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectScalar()
}

async function calcAccrualSum (me) {
  const onDate = me.attr.dateFrom.getValue()
  if (AC.dateService.isValid(onDate)) {
    const baseAccrualSum = await getBaseAccrualSum(onDate)
    me.attr.accrualSum.setValue(AC.currencyService.round((baseAccrualSum || 0) * me.attr.dictTarifCoeffID.getFieldValue('koef'), 0))
  }
}

function onAfterSave () {
  AC.gridUtils.refreshSenderGrid(this)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.attr.dateFrom.setValue(appAC.globalApplicationDate())
  }
}

function onControlChanged (field) {
  const me = this
  switch (field.name) {
    case 'dateFrom': {
      calcAccrualSum(me)
      break
    }
  }
}
