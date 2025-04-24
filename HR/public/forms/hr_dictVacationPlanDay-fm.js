/* global $App UB AC */
exports.formCode = {
  initComponentDone,
  initComponentStart,
  onBeforeSave,
  onControlChanged,
  onFormDataReady
}

function initComponentStart () {
  let me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (!me.attr.dictStaffCatID.getValue()) {
    me.attr.dictStaffSubCatID.setDisabled(true)
  }
}

function onBeforeSave () {
  const me = this
  const dictVacationKindID = me.attr.dictVacationKindID.getValue()
  const positionType = me.attr.positionType.getValue()
  const dictGovernmTypeID = me.attr.dictGovernmTypeID.getValue()
  const dictStaffCatID = me.attr.dictStaffCatID.getValue()
  const dictStaffSubCatID = me.attr.dictStaffSubCatID.getValue()
  const dateFrom = AC.dateService.shiftDate(me.attr.dateFrom.getValue())
  let dateTo = me.attr.dateToEmpty.getValue()
  dateTo = (dateTo && AC.dateService.shiftDate(dateTo)) || AC.dateService.maxDate()
  return UB.Repository('hr_dictVacationPlanDay')
    .attrs(['ID', 'dictVacationKindID', 'positionType', 'dateFrom', 'dateToEmpty'])
    .where('dictVacationKindID', '=', dictVacationKindID)
    .whereIf(positionType, 'positionType', '=', positionType)
    .whereIf(!positionType, 'positionType', 'isNull')
    .whereIf(dictGovernmTypeID, 'dictGovernmTypeID', '=', dictGovernmTypeID)
    .whereIf(!dictGovernmTypeID, 'dictGovernmTypeID', 'isNull')
    .whereIf(dictStaffCatID, 'dictStaffCatID', '=', dictStaffCatID)
    .whereIf(!dictStaffCatID, 'dictStaffCatID', 'isNull')
    .whereIf(dictStaffSubCatID, 'dictStaffSubCatID', '=', dictStaffSubCatID)
    .whereIf(!dictStaffSubCatID, 'dictStaffSubCatID', 'isNull')
    .where('ID', '!=', me.instanceID)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()
    .then(planDays => {
      let res = true
      if (planDays && planDays.length) {
        $App.dialogInfo(UB.i18n('Існує інший запис довідника, в якому "Вид відпустки", "Тип посади", "Тип організації", "Категорія персоналу", "Підкатегорія персоналу" мають однакові значення, а періоди дії перетинаються'))
        res = false
      }
      return Promise.resolve(res)
    })
}

function onControlChanged (field, value) {
  let me = this
  switch (field.name) {
    case 'dictStaffCatID':
      if (value) {
        me.attr.dictStaffSubCatID.setDisabled(false)
      } else {
        me.attr.dictStaffSubCatID.setDisabled(true)
      }
      break
  }
}
