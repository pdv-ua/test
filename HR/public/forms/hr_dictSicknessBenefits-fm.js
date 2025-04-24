/* global Ext $App AC UB */

exports.formCode = {
  initComponentStart,
  onFormDataReady,
  onControlChanged,
  onBeforeSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  let formShell = Ext.create('AC.formShell')
  formShell.init(me)
}

function onFormDataReady () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.shell.requiredIf()
  me.shell.readOnlyIf()
}

function onControlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'isPercent':
      case 'isMinAvgSumPeriod':
      case 'isMaxAvgSumPeriod':
      case 'isMinAvgSumRst':
      case 'isMaxAvgSumRst':
        me.shell.requiredIf()
        me.shell.readOnlyIf()
        break
    }
  }
}

function onBeforeSave () {
  const me = this
  return new Promise(function (resolve) {
    const errorMessages = []
    if (me.attr.dateFrom.getValue() > me.attr.dateTo.getValue()) {
      errorMessages.push(UB.i18n(`Дата початку дії більше дати закінчення!'`))
    }
    if (errorMessages.length) {
      $App.dialogInfo(errorMessages.join('<br>'))
      resolve(false)
    } else {
      UB.Repository('hr_dictSicknessBenefits')
        .attrs(['dictIllnessReasonID.name', 'typeBenefitsKind.name', 'dictBenefitsKindID.name', 'typeExperience.name', 'dateFrom', 'dateTo'])
        .where('dictIllnessReasonID', 'equal', me.attr.dictIllnessReasonID.getValue())
        .where('typeBenefitsKind', 'equal', me.attr.typeBenefitsKind.getValue())
        .where('dictBenefitsKindID', 'equal', me.attr.dictBenefitsKindID.getValue())
        .where('typeExperience', 'equal', me.attr.typeExperience.getValue())
        .where('dateFrom', 'lessEqual', me.attr.dateTo.getValue())
        .where('dateTo', 'moreEqual', me.attr.dateFrom.getValue())
        .where('ID', 'notEqual', me.instanceID)
        .selectAsObject()
        .then(res => {
          if (res.length) {
            res.forEach((item) => {
              errorMessages.push(UB.i18n(`Вже існує налаштування для пільги '{0}', 
                причини непрацездатності '{1}', належності пільги '{2}' 
                та типом стажу '{3}', період дії якого з '{4}'
                по '{5}' перетинається з поточним`, item['dictBenefitsKindID.name'], item['dictIllnessReasonID.name'],
              item['typeBenefitsKind.name'], item['typeExperience.name'], AC.dateService.formatDate(item['dateFrom']),
              AC.dateService.formatDate(item['dateTo'])))
            })
          }

          if (errorMessages.length) {
            $App.dialogInfo(errorMessages.join('<br>'))
            resolve(false)
          } else {
            resolve(true)
          }
        })
    }
  })
}
