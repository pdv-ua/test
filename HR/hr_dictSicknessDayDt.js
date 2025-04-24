const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.on('insert:before', checkIntersections)
me.on('update:before', checkIntersections)

function checkIntersections (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const { execParams } = ctx.mParams

  const builder = UB.Repository('hr_dictSicknessDayDt')
    .attrs(['ID', 'dateFrom', 'dateTo', 'dictSicknessDayID.dictIllnessReasonID.name', 'illnessRegime.name'])
    .where('ID', '<>', execParams.ID || instanceData.ID)
    .where('dateFrom', '<=', execParams.dateTo || instanceData.dateTo)
    .where('dateTo', '>=', execParams.dateFrom || instanceData.dateFrom)
    .where('dictSicknessDayID', '=', execParams.dictSicknessDayID || instanceData.dictSicknessDayID)
    .where('illnessRegime', '=', execParams.illnessRegime || instanceData.illnessRegime)

  if (execParams.isAge || instanceData.isAge) {
    builder
      .where('minAge', '<=', execParams.maxAge || instanceData.maxAge)
      .where('maxAge', '>=', execParams.minAge || instanceData.minAge)
  }

  const intersections = builder.selectSingle()

  if (intersections) {
    throw new UB.UBAbort(`<<<${UB.i18n('Вже існує налаштування для причини непрацездатності "{0}" та лікарняного режиму "{1}", період дії якого перетинається з поточним', intersections['dictSicknessDayID.dictIllnessReasonID.name'], intersections['illnessRegime.name'])}>>>`)
  }
}
