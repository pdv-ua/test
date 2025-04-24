const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const timeCostService = require('./modules/timeCostService')
const storeService = require('../AC/modules/dataServices/localStoreService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('getData')
me.entity.addMethod('selectData')
me.entity.addMethod('setAttrs')
me.entity.addMethod('canEditVacFact')
me.entity.addMethod('calcFields')
me.entity.addMethod('recalcCurrVacPeriods')

function recalcVacPeriods (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!mParams.skipCalcFields && (execParams.dayCountPlan !== undefined || execParams.dayCountFactCorr !== undefined)) {
    timeCostService.calcVacPeriods({
      mParams: {
        execParams: {
          ID: execParams.ID
        }
      }
    })
  }
}

function beforeInsert (ctx) {
  ctx.mParams.method = 'insert'
  me.setAttrs(ctx)
}

function afterInsert (ctx) {
  recalcVacPeriods(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  ctx.mParams.method = 'update'
  me.setAttrs(ctx)
}

function afterUpdate (ctx) {
  recalcVacPeriods(ctx)
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const vacOrders = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['description'])
    .where('empVacationPeriodID', '=', execParams.ID)
    .where('orderID.orderState', '!=', 'PROJECT')
    .selectAsObject()
  if (vacOrders.length > 0) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити запис. Існують проведені накази про надання відпустки, які використовують цей період')}>>>`)
  }
}

/* Обчислення розрахункових полів dayFact, dayCountFact, dayDiff
* @param {object} ctx
* @param {number} ctx.mParams.ID період відпустки
* @param {number} ctx.mParams.employeeNumberID таб. номер
* @param {number} ctx.mParams.employeeID працівник
* @param {number} ctx.mParams.dictVacationKindID вид відпустки
* @param {number} ctx.mParams.orgID організація
*/
me.calcFields = (ctx) => {
  ctx.mParams.forceCalc = true
  timeCostService.calcVacPeriods(ctx)
}

function doGetData (ctx) {
  const mParams = ctx.mParams
  const empVacationPlanID = mParams.empVacationPlanID
  const empVacationPlanIDs = mParams.empVacationPlanIDs
  let onDate = (mParams.customParams && mParams.customParams.onDate) || mParams.onDate || dateService.currentDate()
  mParams.showZeroes = (mParams.customParams && mParams.customParams.showZeroes) || false
  let data = []
  let empVacPlan
  if (empVacationPlanID) {
    empVacPlan = UB.Repository('hr_empVacationPlan')
      .attrs(['ID', 'employeeNumberID', 'dictVacationKindID', 'employeeNumberID.dateTo'])
      .where('ID', '=', empVacationPlanID)
      .selectAsObject()
  } else if (empVacationPlanIDs) {
    empVacPlan = UB.Repository('hr_empVacationPlan')
      .attrs(['ID', 'employeeNumberID', 'dictVacationKindID', 'employeeNumberID.dateTo'])
      .where('ID', 'in', empVacationPlanIDs)
      .selectAsObject()
  }
  if (empVacPlan && empVacPlan.length > 0) {
    empVacPlan.forEach(empVacPlanItem => {
      const employeeNumberID = empVacPlanItem.employeeNumberID
      const dictVacationKindID = empVacPlanItem.dictVacationKindID
      const dOnDate = new Date(onDate)
      const fireDate = new Date(empVacPlanItem['employeeNumberID.dateTo'])
      if (dOnDate > fireDate) {
        onDate = fireDate
      }
      let vacPeriod = timeCostService.getVacFactDays({
        employeeNumberID,
        dictVacationKindID,
        fieldList: mParams.fieldList,
        addFields: !mParams.fieldList && ['expYears', 'dayRecalc', 'dayReturn'],
        onDate,
        toRecalc: false
      })

      let periodData = vacPeriod.filter(itm => itm.empVacationPlanID === empVacPlanItem.ID && (mParams.showZeroes || itm.dayDiff !== 0))
      if (periodData.length > 0) {
        data.push(...periodData)
      }
    })
    /* Сортування зроблено в timeCostService.getVacFactDays */
    // data = _.orderBy(data, ['dateFrom'], ['asc'])
  }
  return data
}

/**
 * Отримати дані по періоду відпустки
 * @param {object} ctx
 * @param {number} ctx.mParams.empVacationPlanID планування відпустки
 * @return {Array}
 */
me.getData = (ctx) => {
  const mParams = ctx.mParams
  let data = doGetData(ctx)
  mParams.resultData = JSON.stringify(data)
  return true
}

/**
 * Отримати дані по періоду відпустки з контролу
 * @param {object} ctx
 * @param {number} ctx.mParams.empVacationPlanID планування відпустки
 * @return {Array}
 */
me.selectData = ctx => {
  const mParams = ctx.mParams
  let data = doGetData(ctx)
  storeService.initArrayToStore(ctx.dataStore, data, mParams)
  ctx.inherited = false
  return true
}

/* Установка атрибутів, що розраховуються  */
me.setAttrs = (ctx) => {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  let instanceData
  if (ctx.dataStore) {
    instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  } else {
    instanceData = UB.Repository(__entityName)
      .attrs(['dateFrom', 'dateTo', 'dayCountPlan'])
      .selectById(execParams.ID)
  }
  if (!instanceData) {
    // запис видалено
    return
  }
  const dateFrom = execParams.dateFrom || instanceData.dateFrom
  const dateTo = execParams.dateTo || instanceData.dateTo
  // const dayCountPlan = execParams.dayCountPlan || instanceData.dayCountPlan || 0
  // const vacFact = timeCostService.getVacFactDays({ currPeriodID: execParams.ID })
  // let dayDiff = (vacFact[0] && vacFact[0].dayDiff) || dayCountPlan
  const dayDiff = execParams.dayDiff === undefined ? instanceData.dayDiff : execParams.dayDiff
  execParams.descriptionExt = UB.i18n(`{0} - {1} (Залишок періоду - {2} дн.)`, dateService.formatDate(dateFrom), dateService.formatDate(dateTo), dayDiff || 0)
  if (mParams.runUpdate) {
    UB.DataStore(__entityName).run('update', {
      __skipOptimisticLock: true,
      execParams: execParams,
      isOrderOperation: true,
      skipCalcFields: true
    })
  }
}

me.canEditVacFact = (ctx) => {
  const mParams = ctx.mParams
  mParams.result = entityBaseService.userIsMemberOf({ roleNames: ['acc_editorFactVacation'] })
}

me.recalcCurrVacPeriods = function (ctx) {
  const mParams = ctx.mParams
  timeCostService.calcVacPeriods({
    mParams: {
      execParams: {
        orgID: mParams.orgID,
        onDate: mParams.onDate,
        calcFields: ['dayDiff'],
        currentOnly: true
      }
    }
  })
}
