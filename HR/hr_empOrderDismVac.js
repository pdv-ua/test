const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const _ = require('lodash')
const storeService = require('../AC/modules/dataServices/localStoreService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const timeCostService = require('../HR/modules/timeCostService')

me.entity.addMethod('groupSelect')
me.entity.addMethod('addRecalcDays')
me.entity.addMethod('clearRecalcDays')
me.entity.addMethod('clear')
me.entity.addMethod('closeVacDays')
me.entity.addMethod('getRecalcDays')

/**
 * Отримати дані згруповані по виду відпустки
 * @param {object} ctx
 * @param {number} ctx.mParams.whereList.orderDetID.value ID пункту наказу про звільнення (hr_empOrderDismDet)
 */
me.groupSelect = function (ctx) {
  const mParams = ctx.mParams
  const orderDetID = selectService.getFilterValue(mParams, 'orderDetID') || 0
  let oldFieldList = _.clone(mParams.fieldList)
  mParams.fieldList = oldFieldList
  mParams.whereList = {}

  let data = UB.Repository(__entityName)
    .attrs(['employeeNumberID', 'employeeNumberID.tabNum', 'orderDetID', 'dictVacationKindID', 'dictVacationKindID.name', 'SUM([dayDiff])', 'SUM([dayRestitute])',
      'SUM([dayRecalc])', 'SUM([dayReturn])'])
    .where('orderDetID', '=', orderDetID)
    .groupBy(['orderDetID', 'employeeNumberID', 'employeeNumberID.tabNum', 'dictVacationKindID', 'dictVacationKindID.name'])
    .orderBy('employeeNumberID.tabNum')
    .orderBy('dictVacationKindID.name')
    .selectAsObject({
      'SUM([dayDiff])': 'dayDiff',
      'SUM([dayRestitute])': 'dayRestitute',
      'SUM([dayRecalc])': 'dayRecalc',
      'SUM([dayReturn])': 'dayReturn'
    })
  data = storeService.formDataByFieldList(data, oldFieldList)

  storeService.initArrayToStore(ctx.dataStore, data, mParams)
  ctx.inherited = false
  return true
}

/**
 * Додати дані компенсації по пункту наказу про звільнення
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeNumberID ID запису з табельним номером працівника
 * @param {number} ctx.mParams.orderDetID ID пункту наказу про звільнення (hr_empOrderDismDet)
 * @param {number} ctx.mParams.orgID організація
 * @param {Date} ctx.mParams.onDate на дату
 */
me.addRecalcDays = function (ctx) {
  const mParams = ctx.mParams
  const employeePositionID = mParams.employeePositionID
  const orderDetID = mParams.orderDetID || 0
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate)
  const empPos = UB.Repository('hr_employeePositionS')
    .attrs(['workPlace', 'employeeNumberID', 'employeeID'])
    .where('ID', '=', employeePositionID)
    .selectSingle()
  const dictReasonDism = UB.Repository('hr_dictReasonDism')
    .attrs(['ID', 'isDeductExcessLeave'])
    .where('ID', '=', mParams.dictReasonDismID)
    .selectSingle()
  const isDeductExcessLeave = (dictReasonDism && dictReasonDism.isDeductExcessLeave) || false

  let employeeNumbers = empPos ? [empPos.employeeNumberID] : [0]
  if (empPos && empPos.workPlace === '1') {
    // Якщо це основне місце роботи, то розраховуємо також для сумісників
    let partTimePos = UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID'])
      .where('employeeID', '=', empPos.employeeID)
      .where('workPlace', '=', '2')
      /* UBHR-10920 - перераховувати по закритим сумісникам, UBHR-15679 - але не перераховувати, якщо при звільненні
        сумісника виконався розрахунок, тобто є дні "Компенсувати" або "Відрахувати" */
      // .where('dateFrom', '<=', onDate)
      // .where('dateTo', '>=', onDate)
      .where('organizationID', '=', orgID)
      .groupBy(['employeeNumberID'])
      .selectAsObject()
    employeeNumbers = employeeNumbers.concat(partTimePos.map(item => item.employeeNumberID))
  }
  me.clear(ctx)
  const store = UB.DataStore(__entityName)
  const data = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'empVacationPlanID', 'empVacationPlanID.dictVacationKindID', 'dateFrom', 'dateTo', 'empVacationPlanID.employeeNumberID',
      'empVacationPlanID.dictVacationKindID.isProportionalCompensate'])
    .where('empVacationPlanID.dictVacationKindID.isDismComp', '=', 1)
    .where('empVacationPlanID.employeeNumberID', 'in', employeeNumbers)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .selectAsObject({
      'empVacationPlanID.dictVacationKindID': 'dictVacationKindID',
      'empVacationPlanID.employeeNumberID': 'employeeNumberID',
      'empVacationPlanID.dictVacationKindID.isProportionalCompensate': 'isProportionalCompensate'
    })

  let calcData = []
  employeeNumbers.forEach(empNumID => {
    let empNumData = global.hr_empVacationPlan.getData({ orgID, employeeNumberID: empNumID, dictVacationKindID: null, onDate, isGrouped: false })
    calcData = calcData.concat(empNumData)
  })
  let resultData = []
  if (data.length) {
    data.forEach(item => {
      if (dateService.shiftDate(item.dateFrom) <= onDate) {
        const employeeNumberID = item.employeeNumberID
        let calcItem = calcData.find(itm => itm.ID === item.ID)
        if (calcItem && calcItem.daysDiffOrig !== 0) {
          let periodDateTo = dateService.shiftDate(item.dateTo)
          if (item.isProportionalCompensate && periodDateTo > onDate) {
            periodDateTo = onDate
          }
          let dayRestitute = 0
          let dayReturn = 0
          // UBHR-15679, не встановлювати відрахування, бо перерахунок вже здійснено (є дні "Компенсувати" або "Відрахувати")
          if ((calcItem.dayComp === 0 && calcItem.dayReturn === 0) || item.employeeNumberID === empPos.employeeNumberID) {
            if (calcItem.daysDiffOrig < 0) {
              if (!isDeductExcessLeave) {
                dayReturn = -1 * calcItem.daysDiffOrig
              }
            } else {
              dayRestitute = calcItem.daysDiff
            }
          }
          if (dayRestitute !== 0 || dayReturn !== 0) {
            resultData.push({
              dayReturn: dayReturn
            })
            store.run('insert', {
              execParams: {
                employeeNumberID: employeeNumberID,
                orderDetID: orderDetID,
                dictVacationKindID: item.dictVacationKindID,
                empVacationPeriodID: item.ID,
                dayDiff: calcItem.daysDiff,
                dayRestitute: dayRestitute,
                dayRecalc: 0,
                recalcDate: onDate,
                dayReturn: dayReturn,
                periodDesc: `${dateService.formatDate(item.dateFrom)} - ${dateService.formatDate(periodDateTo)}`,
                dayReturnIsEdit: isDeductExcessLeave
              }
            })
          }
        }
      }
    })
  }
  store.freeNative()
  mParams.result = true
  mParams.data = isDeductExcessLeave ? JSON.stringify(resultData) : ''
  return true
}

/**
 * Очистити дні перерахунку компенсації по пункту наказу про звільнення
 * @param {object} ctx
 * @param {number} ctx.mParams.orderDetID ID пункту наказу про звільнення (hr_empOrderDismDet)
 */
me.clearRecalcDays = function (ctx) {
  const mParams = ctx.mParams
  const orderDetID = mParams.orderDetID || 0
  const store = UB.DataStore(__entityName)
  const items = UB.Repository(__entityName)
    .attrs('ID', 'dayDiff')
    .where('orderDetID', '=', orderDetID)
    .selectAsObject()
  items.forEach(item => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dayRestitute: item.dayDiff > 0 ? item.daysDiff : 0,
        dayRecalc: 0
      }
    })
  })
  store.freeNative()
  return true
}

/**
 * Очистити дані перерахунку компенсації по пункту наказу про звільнення
 * @param {object} ctx
 * @param {number} ctx.mParams.orderDetID ID пункту наказу про звільнення (hr_empOrderDismDet)
 */
me.clear = function (ctx) {
  const mParams = ctx.mParams
  const orderDetID = mParams.orderDetID || 0
  const store = UB.DataStore(__entityName)
  const items = UB.Repository(__entityName)
    .attrs('ID')
    .where('orderDetID', '=', orderDetID)
    .selectAsObject()
  items.forEach(item => {
    store.run('delete', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID
      }
    })
  })
  store.freeNative()
  return true
}

/**
 * Закрити періоди відпустки при звільненні
 * @param {para} запис сутності hr_empOrderDismDet
 * @param {saved} старі значення полів для відновлення при відміні проведення
 */
me.closeVacDays = function ({ para, saved }) {
  /* закриття запису плану відпустки */
  const vacPlan = UB.Repository('hr_empVacationPlan')
    .attrs(['ID', 'dateTo', 'dictVacationKindID.isProportionalCompensate'])
    .where('employeeNumberID', '=', para.employeeNumberID)
    .where('dateTo', '>', para.dateFrom)
    .selectAsObject({
      'dictVacationKindID.isProportionalCompensate': 'isProportionalCompensate'
    })
  vacPlan.forEach(item => {
    let dateTo = para.dateFrom
    if (!item.isProportionalCompensate) {
      const vacPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs(['dateTo'])
        .where('empVacationPlanID', '=', item.ID)
        .where('dateFrom', '<=', para.dateFrom)
        .where('dateTo', '>=', para.dateFrom)
        .selectSingle()
      if (vacPeriod) {
        dateTo = vacPeriod.dateTo
      }
    }
    orderService.updateByOrder({
      store: 'hr_empVacationPlan',
      params: {
        ID: item.ID,
        dateTo: dateTo
      },
      oldValues: {
        dateTo: item.dateTo
      },
      saved: saved
    })
  })

  const vacPeriods = timeCostService.getVacFactDays({
    employeeNumberID: para.employeeNumberID,
    addFields: ['empVacationPlanID.dictVacationKindID.isDismComp', 'empVacationPlanID.dictVacationKindID.isProportionalCompensate']
  })

  const dismVac = UB.Repository('hr_empOrderDismVac')
    .attrs(['empVacationPeriodID', 'dictVacationKindID', 'dayRestitute', 'dayRecalc', 'dayReturn', 'recalcDate',
      'orderDetID.organizationID', 'orderDetID.orderID', 'orderDetID.orderID.orderNumber', 'orderDetID.orderID.orderDate',
      'orderDetID.employeeID', 'orderDetID.employeePositionID', 'orderDetID.employeeNumberID', 'orderDetID.dateFrom',
      'orderDetID.orderID.periodID'
    ])
    .where('orderDetID', '=', para.ID)
    .selectAsObject({
      'orderDetID.organizationID': 'organizationID',
      'orderDetID.orderID': 'orderID',
      'orderDetID.orderID.orderNumber': 'orderNumber',
      'orderDetID.orderID.orderDate': 'orderDate',
      'orderDetID.employeeID': 'employeeID',
      'orderDetID.employeePositionID': 'employeePositionID',
      'orderDetID.employeeNumberID': 'employeeNumberID',
      'orderDetID.dateFrom': 'dateFrom',
      'orderDetID.orderID.periodID': 'periodID'
    })
  // const paraDateFrom = new Date(para.dateFrom)
  vacPeriods.forEach(item => {
    /* let toUpdate = false
    let params = {
      ID: item.ID
    }
    let oldValues = {}
    let itemDateFrom = new Date(item.dateFrom)
    let itemDateTo = new Date(item.dateTo) */
    // let isDismComp = item['empVacationPlanID.dictVacationKindID.isDismComp']

    /* закрити датою звільнення планові періоди відпустки */
    /* if (itemDateFrom <= paraDateFrom && itemDateTo >= paraDateFrom) {
      if (item['empVacationPlanID.dictVacationKindID.isProportionalCompensate']) {
        params.dateTo = paraDateFrom
      }
      params.isCanceled = true
      oldValues.dateTo = itemDateTo
      oldValues.isCanceled = item.isCanceled
      toUpdate = true
    } */
    /* обнулити планові дні, якщо є залишок днів та ознака "Обов'язкова компенсація при звільненні" */
    /* if (item.hasDayDiff && isDismComp) {
      params.dayCountPlan = 0
      oldValues.dayCountPlan = item.dayCountPlan
      toUpdate = true
    } */

    let dismVacItem = dismVac.find(vac => vac.empVacationPeriodID === item.ID)
    if (dismVacItem) {
      /* UBHR-11065, Врахувати залишок відпустки, якщо вона припадає на дату звільнення */
      /* Зміни відмінено, UBHR-14915, Залишок відпустки відраховується в планових днях періоду відпустки */
      /* const vacOnDateFrom = UB.Repository('hr_employeeVacation')
        .attrs(['empVacationPeriodID', 'dateFrom', 'dateTo'])
        .where('employeeNumberID', '=', para.employeeNumberID)
        .where('dateTo', '>', para.dateFrom)
        .selectAsObject()
      let vacInPer = vacOnDateFrom.find(vac => vac.empVacationPeriodID === item.ID)
      if (vacInPer && dismVacItem.dayReturn) {
        let dayCountFactCorr = item.dayCountFactCorr || 0
        params.dayCountFactCorr = dayCountFactCorr - dismVacItem.dayReturn
        oldValues.dayCountFactCorr = dayCountFactCorr
        toUpdate = true
      } */

      /* if (toUpdate) {
        orderService.updateByOrder({
          store: 'hr_empVacationPeriod',
          params: params,
          saved: saved,
          oldValues: oldValues,
          mParams: {
            skipCalcFields: true
          }
        })
      } */

      /* додати дні компенсації / повернення / перерахунку */
      let compParams = {
        empVacationPeriodID: item.ID
      }
      compParams.dayComp = dismVacItem.dayRestitute
      compParams.dayRecalc = dismVacItem.dayRecalc
      compParams.dayReturn = dismVacItem.dayReturn
      compParams.recalcDate = dismVacItem.recalcDate
      orderService.insertByOrder({
        store: 'hr_empVacationComp',
        params: compParams,
        saved: saved
      })

      /* додати запис в картку "Відпустки" працівника */
      let dayCount
      let vacationStatus
      if (dismVacItem.dayRecalc) {
        dayCount = dismVacItem.dayRecalc
        vacationStatus = 'DISMRECALC'
      } else if (dismVacItem.dayReturn) {
        dayCount = -dismVacItem.dayReturn
        vacationStatus = 'DISMRET'
      } else {
        dayCount = dismVacItem.dayRestitute
        vacationStatus = 'DISMCOMP'
      }
      orderService.insertByOrder({
        store: 'hr_employeeVacation',
        params: {
          organizationID: dismVacItem.organizationID,
          orderNumber: dismVacItem.orderNumber,
          orderDate: dismVacItem.orderDate,
          orderID: dismVacItem.orderID,
          paraID: para.ID,
          dictVacationKindID: dismVacItem.dictVacationKindID,
          employeeID: dismVacItem.employeeID,
          employeePositionID: dismVacItem.employeePositionID,
          employeeNumberID: dismVacItem.employeeNumberID,
          dayCount: dayCount,
          cntDay: dayCount,
          dateFrom: dismVacItem.dateFrom,
          dateTo: null,
          dictPeriodID: dismVacItem.periodID,
          empVacationPeriodID: dismVacItem.empVacationPeriodID,
          avgSum: 0,
          vacationStatus: vacationStatus,
          orderState: 'POSTED'
        },
        mParams: {
          skipCalcFields: true
        },
        saved: saved
      })
    }
  })

  /* Видалити планові періоди, які ще не розпочалися на момент звільнення */
  let vacPeriods4Del = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dateTo'])
    .where('empVacationPlanID.employeeNumberID', '=', para.employeeNumberID)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '>', para.dateFrom)
    .selectAsObject()
  vacPeriods4Del.forEach(item => {
    orderService.deleteByOrder({
      store: 'hr_empVacationPeriod',
      params: {
        ID: item.ID
      },
      saved: saved
    })
  })
}

me.getRecalcDays = function (ctx) {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const onDate = dateService.shiftDate(mParams.onDate)
  let empVacData = global.hr_empVacationPlan.getData({
    orgID,
    employeeNumberID: mParams.employeeNumberID,
    dictVacationKindID: null,
    onDate,
    isGrouped: false
  })
  mParams.resultData = JSON.stringify(empVacData)
}
