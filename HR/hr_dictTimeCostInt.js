const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterInsert)

me.entity.addMethod('getPriority')

function beforeInsert (ctx) {
  validateData(ctx)
  checkCrossRecord(ctx.mParams.execParams)
}

function beforeUpdate (ctx) {
  validateData(ctx)
  checkCrossRecord(Object.assign({}, JSON.parse(ctx.dataStore.asJSONObject)[0] || {}, ctx.mParams.execParams))
}

function afterInsert (ctx) {
  calcService.addCalcTimeSheetQueue({ entityName: 'hr_dictTimeCostInt' })
}

function validateData (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.priorityType) {
    let priorityType = execParams.priorityType
    switch (priorityType) {
      case 'elemFirst' :
        execParams.isElemFirst = 1
        execParams.isDateFirst = 0
        break
      case 'elemSecond' :
        execParams.isElemFirst = 0
        execParams.isDateFirst = 0
        break
      case 'dateFirst' :
        execParams.isElemFirst = 1
        execParams.isDateFirst = 1
        break
      case 'dateSecond' :
        execParams.isElemFirst = 0
        execParams.isDateFirst = 1
        break
    }
  }
}

function checkCrossRecord (data) {
  const checkCross = UB.Repository('hr_dictTimeCostInt')
    .attrs('ID')
    .where('dictTimeCost1ID', '=', data.dictTimeCost1ID)
    .where('dictTimeCost2ID', '=', data.dictTimeCost2ID)
    .where('dateFrom', '<=', data.dateToEmpty ? dateService.shiftDate(data.dateToEmpty) : dateService.maxDate())
    .where('dateTo', '>=', data.dateFromEmpty ? dateService.shiftDate(data.dateFromEmpty) : dateService.minDate())
    .where('ID', '!=', data.ID)
    .selectSingle()

  if (checkCross) throw new UB.UBAbort(`<<<${UB.i18n('Існує запис для вказаної пари з періодом, який перетинається з поточним! Зберігти неможливо!')}>>>`)
}

/**
 * Отримати пріорітет між 2-ма елементами робочого часу
 * @param {number} dictTimeCost1ID елемент робочого часу 1
 * @param {number} dictTimeCost2ID елемент робочого часу 2
 * @param {date} onDate на дату
 * @return {string} пріорітет: 'elemFirst' чи 'elemSecond'
 */
me.getPriority = function (dictTimeCost1ID, dictTimeCost2ID, onDate) {
  return UB.Repository('hr_dictTimeCostInt')
    .attrs('priorityType')
    .where('dictTimeCost1ID', '=', dictTimeCost1ID)
    .where('dictTimeCost2ID', '=', dictTimeCost2ID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectScalar()
}
