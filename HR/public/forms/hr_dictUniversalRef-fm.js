/* global appAC AC Blob _ HR $App UB */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  onControlChanged,
  onBeforeSave
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('onBeforeSave', onBeforeSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
}

function onControlChanged (field, value, oldValue) {
  const me = this
}

async function onBeforeSave () {
  const me = this
  const inBuildRefCodes = [
    'osobovaKartka', 'dovidkaZMiscyaRoboty', 'dovidkaZMiscyaRoboty2', 'dovidkaZMiscyaRoboty3', 'dovidkaZMiscyaRobotyPregnVac', 'dovidkaZMiscyaRobotyMission',
    'dergSlugOsobovaKartka', 'dergSlugOsobovaKartka2020', 'empOath', 'empCommitment', 'empCivilMemo', 'dovidkaNotUsedVacation', 'agreementProcessingData',
    'povidomZminaOblikData', 'biografDovidka', 'employeeWorkbook', 'employeeWorkbookDt', 'employeeWorkbookDt6', 'calcExperience'
  ]
  const dictUniversalRef = await UB.Repository('hr_dictUniversalRef')
    .attrs(['ID'])
    .where('organizationID', '=', me.record.get('organizationID'))
    .where('ID', '!=', me.instanceID)
    .where('code', '=', me.record.get('code'))
    .selectAsObject()
  if (dictUniversalRef && dictUniversalRef.length) {
    await $App.dialogError(UB.i18n(`Код шаблону довідки має бути унікальним!\nШаблон з кодом "${me.record.get('code')}" вже існує для даної організації!`))
    return false
  } else if (inBuildRefCodes.includes(me.record.get('code'))) {
    await $App.dialogError(UB.i18n(`Код шаблону довідки має бути унікальним!\n"${me.record.get('code')}" - є кодом вбудованої довідки!`))
    return false
  }
  return true
}
