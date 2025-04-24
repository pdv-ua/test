/* global AC UB $App */

exports.formCode = {
  initComponentDone,
  onBeforeSave,
  onAfterSave
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onBeforeSave () {
  const me = this
  me.record.set('baseAccrual', me.record.get('koef') === 1)
  const dateFrom = AC.dateService.shiftDate(me.record.get('dateFrom'))
  me.record.set('dateFromEmpty', me.record.get('dateFrom'))
  return UB.Repository('hr_dictTarifCoeff')
    .attrs(['ID'])
    .where('ID', '!=', me.instanceID)
    .where('koef', '=', me.record.get('koef'))
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()
    .then(data => {
      if (data && data.length) {
        $App.dialogInfo(UB.i18n('Вже існує запис з таким коефіцієнтом. Закрийте старий запис'))
        return Promise.resolve(false)
      }
      if (Object.keys(me.record.modified).includes('koef')) {
        const detailStore = me.down('ubdetailgrid').getStore()
        if (detailStore.count()) {
          return $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('При зміні значення "Коефіцієнт" всі детальні рядки будуть перерозраховані. Продовжити?'))
        }
      }
      return Promise.resolve(true)
    })
}

function onAfterSave () {
  const me = this
  me.down('ubdetailgrid').getStore().load()
}
