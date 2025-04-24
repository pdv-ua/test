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

/* function onBeforeSave () {
  const me = this
  let dateFrom = AC.dateService.unshiftDate(me.attr.dateFromEmpty.getValue())
  let dateTo = AC.dateService.unshiftDate(me.attr.dateToEmpty.getValue())
  return Promise.resolve(UB.Repository('hr_dictWorkTypeTariff')
    .attrs(['dateTo', 'dateFrom', 'tariffSum'])
    .where('dictWorkTypeID', '=', me.attr.dictWorkTypeID.getValue())
    .where('ID', '!=', me.instanceID)
    .selectAsObject().then(res => {
      let warnList = res.filter(obj => {
        return dateTo === null ? !(obj.dateTo < dateFrom) : !(obj.dateFrom > dateTo || obj.dateTo < dateFrom)
      })
      if (warnList.length) {
        let wrnText = UB.i18n('Для тарифів ') + me.attr.tariffSum.getValue() + UB.i18n(' (діє з ') + AC.dateService.formatDate(dateFrom) + (dateTo ? (UB.i18n(' по ') + AC.dateService.formatDate(dateTo)) : '') + ')'
        warnList.forEach(res => {
          wrnText += (UB.i18n(' та ') + res.tariffSum + UB.i18n(' (діє з ') + AC.dateService.formatDate(res.dateFrom) + UB.i18n(' по ') + AC.dateService.formatDate(res.dateTo) + ')')
        })
        $App.dialogInfo(wrnText + UB.i18n(' періоди дії перетинаються! Збереження неможливе!'))
        return false
      }
    })
  )
} */

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

  }
}
