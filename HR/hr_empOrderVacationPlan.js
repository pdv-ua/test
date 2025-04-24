const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const dateService = require('../AC/modules/dataServices/dateService')
const timeCostService = require('../HR/modules/timeCostService')
const timService = require('../HR/modules/timService')
const orderService = require('../HR/modules/orderService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('clearVacationPlan')
me.entity.addMethod('addDefaultVacationPlan')
me.entity.addMethod('addDefaultPluralistVacationPlan')
me.entity.addMethod('getVacationPlanData')
me.entity.addMethod('doPosting')
me.entity.addMethod('addBalance')

function doClearVacationPlan (orderDetID) {
  const vacPlanStore = UB.DataStore(__entityName)
  const existVacPlan = UB.Repository(__entityName)
    .attrs(['ID', 'dictVacationKindID'])
    .where('orderDetID', '=', orderDetID)
    .selectAsObject()
  existVacPlan.forEach(row => {
    vacPlanStore.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })
  vacPlanStore.freeNative()
}

function setAttr (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.dateEndEmpty) {
    execParams.dateEnd = execParams.dateEndEmpty
  } else {
    execParams.dateEnd = '#maxdate'
  }
  const dictVacationKindID = execParams.dictVacationKindID || instanceData.dictVacationKindID
  const dayCount = execParams.dayCount || instanceData.dayCount
  if (execParams.dictVacationKindID || execParams.dayCount) {
    const dictVacationKindName = UB.Repository('hr_dictVacationKind')
      .attrs(['name'])
      .where('ID', '=', dictVacationKindID)
      .limit(1)
      .selectScalar()
    execParams.description = `${dictVacationKindName} = ${dayCount}`
  }
}

function beforeInsert (ctx) {
  if (ctx.mParams.isInternalOperation) {
    return
  }
  setAttr(ctx)
}

function beforeUpdate (ctx) {
  setAttr(ctx)
}

/** Очищення планової відпустки по пункту наказу
 * @param {object} ctx
 * @param {number} ctx.mParams.orderDetID пункт наказу
 */
me.clearVacationPlan = function (ctx) {
  const mParams = ctx.mParams
  let orderDetID = mParams.orderDetID
  doClearVacationPlan(orderDetID)
}

/** Автоматичне додавання планової відпустки по працівнику
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.employeeNumberID таб. номер
 * @param {string} ctx.mParams.positionType Тип посади
 * @param {Date} ctx.mParams.onDate на дату
 * @param {Date} ctx.mParams.empPosDateFrom дата призначення на посаду
 * @param {number} ctx.mParams.orderDetID пункт наказу
 * @param {string} ctx.mParams.planKindOption режим, як вибирати види відпустки
 *   ('PLANDAY' - по довіднику hr_dictVacationPlanDay (за замовченням), 'EMPPLAN' - по відкритим записам картки права на відпустку)
 */
me.addDefaultVacationPlan = function (ctx) {
  const mParams = ctx.mParams
  let messages = []
  let employeeID = mParams.employeeID
  let employeeNumberID = mParams.employeeNumberID
  let positionType = mParams.positionType
  let onDate = dateService.shiftDate(mParams.onDate)
  let empPosDateFrom = dateService.shiftDate(mParams.empPosDateFrom)
  let empPosDateTo = dateService.shiftDate(mParams.empPosDateTo)
  let orderDetID = mParams.orderDetID
  let planKindOption = mParams.planKindOption
  let dontClear = mParams.dontClear

  !dontClear && doClearVacationPlan(orderDetID)

  const vacPlanStore = UB.DataStore(__entityName)
  let planDay
  if (planKindOption === 'EMPPLAN') {
    planDay = UB.Repository('hr_empVacationPlan')
      .attrs(['dictVacationKindID', 'dictVacationKindID.code'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', empPosDateFrom)
      .where('dateTo', '>=', empPosDateFrom)
      .selectAsObject()
  }
  if (planKindOption !== 'EMPPLAN' || (planDay && planDay.length === 0)) {
    planDay = UB.Repository('hr_dictVacationPlanDay')
      .attrs(['dictVacationKindID', 'dictVacationKindID.code'])
      .where('positionType', '=', positionType)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
  }
  if (planDay.length > 0) {
    const existVacPlan = UB.Repository(__entityName)
      .attrs('dictVacationKindID')
      .where('orderDetID', '=', orderDetID)
      .selectAsObject()
    const isVacPlan = !!existVacPlan.length
    planDay.forEach(planItem => {
      let dictVacationKindID = planItem.dictVacationKindID
      let vactKindCode = planItem['dictVacationKindID.code']
      let expCalcDate
      let expCalcDateTo
      let expIsFromOrder = false
      /* isDState - Додаткова оплачуєма відпустка за стаж держ служби */
      let isDState = (vactKindCode === 'dState')
      if (isDState) {
        expCalcDate = UB.Repository('hr_empOrderExperience')
          .attrs(['calcDate'])
          .where('empOrderDetID', '=', orderDetID)
          .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
          .limit(1)
          .selectScalar()
        if (expCalcDate) {
          expIsFromOrder = true
        } else {
          let empExp = UB.Repository('hr_employeeExperience')
            .attrs(['calcDate', 'startCalcDate'])
            .where('employeeID', '=', employeeID)
            .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
            .limit(1)
            .selectSingle()
          if (empExp) {
            expCalcDate = dateService.shiftDate(empExp.calcDate)
            expCalcDateTo = empExp.startCalcDate ? dateService.shiftDate(empExp.startCalcDate) : null
          }
        }
      }
      let existVacKind = isVacPlan && existVacPlan.find(item => item.dictVacationKindID === dictVacationKindID)
      if (!existVacKind) {
        let vacParams = {
          employeeID: employeeID,
          dictVacationKindID: dictVacationKindID,
          positionType: positionType,
          empPosDateFrom: empPosDateFrom,
          empPosDateTo: empPosDateTo,
          onDate: onDate,
          expCalcDate: expCalcDate,
          expCalcDateTo: expCalcDateTo,
          expIsFromOrder: expIsFromOrder
        }
        me.getVacationPlanData({
          mParams: vacParams
        })
        let planData = vacParams.result
        if (planData) {
          let isMainPart = false
          vacPlanStore.run('insert', {
            execParams: {
              orderDetID: orderDetID,
              dictVacationKindID: dictVacationKindID,
              dateFrom: planData.dateFrom,
              dateTo: planData.dateTo,
              dateEndEmpty: planData.dateEnd,
              dayCount: planData.dayCount,
              isMainPart: isMainPart
            }
          })
        }
        if (vacParams.message) {
          messages.push(vacParams.message)
        }
      }
    })
  }
  if (messages.length > 0) {
    mParams.messages = JSON.stringify(messages)
  }
  vacPlanStore.freeNative()
}

/** Отримання значень за замовченням для права на відпустку (для наказів)
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {string} ctx.mParams.positionType Тип посади
 * @param {Date} ctx.mParams.onDate на дату
 * @param {Date} ctx.mParams.empPosDateFrom дата призначення на посаду
 * @param {Date} ctx.mParams.empPosDateTo дата закінчення призначення на посаду
 * @param {number} ctx.mParams.dictVacationKindID вид відпустки
 * @param {number} ctx.mParams.expCalcDate приведена дата розрахунку стажу
 */
me.getVacationPlanData = function (ctx) {
  const mParams = ctx.mParams
  let employeeID = mParams.employeeID
  let dictVacationKindID = mParams.dictVacationKindID
  let positionType = mParams.positionType
  let empPosDateFrom = dateService.shiftDate(mParams.empPosDateFrom)
  let empPosDateTo = mParams.empPosDateTo && dateService.shiftDate(mParams.empPosDateTo)
  let onDate = dateService.shiftDate(mParams.onDate)
  let expCalcDate = mParams.expCalcDate && dateService.shiftDate(mParams.expCalcDate)
  let expCalcDateTo = mParams.expCalcDateTo && dateService.shiftDate(mParams.expCalcDateTo)
  let expIsFromOrder = mParams.expIsFromOrder
  if (!(employeeID && dictVacationKindID && positionType && empPosDateFrom && onDate)) {
    return
  }

  const dictVacData = UB.Repository('hr_dictVacationKind')
    .attrs(['code', 'vactAccum', 'isProportional'])
    .selectById(dictVacationKindID)
  if (!dictVacData) {
    const dictVac = UB.Repository('hr_dictVacationKind')
      .attrs(['name'])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(dictVacationKindID) || {}
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено вид відпустки "{0}". Можливо його було видалено', (dictVac.name || ''))}>>>`)
  }
  let isStateExp = dictVacData.code === 'dState'
  const noDStateDataMsg = 'Не заповнено стаж державної служби або стажу недостатньо для надання відпустки'
  if (isStateExp && !expCalcDate) {
    mParams.message = noDStateDataMsg
    return
  }

  const dictVacDays = UB.Repository('hr_dictVacationPlanDay')
    .attrs(['dayCount'])
    .where('dictVacationKindID', '=', dictVacationKindID)
    .where('positionTypeNotEmpty', '=', positionType)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .limit(1)
    .selectSingle()

  let dateFrom
  let dateTo
  let dateEnd = null
  if (isStateExp) {
    if (!expIsFromOrder) {
      let exp = dateService.getExpCalcDate({
        calcDateFrom: expCalcDate,
        calcDateTo: expCalcDateTo,
        onDate: empPosDateFrom
      })
      expCalcDate = exp.calcDate
    }
    dateFrom = dateService.getExpCalcDateFrom(empPosDateFrom, expCalcDate)
  } else {
    if (dictVacData.vactAccum === '3') {
      /* Протягом календарного року */
      dateFrom = dateService.firstDayOfYear(empPosDateFrom)
    } else {
      dateFrom = empPosDateFrom
    }
  }

  if (dateFrom) {
    dateTo = dateService.addDays(dateService.addYears(dateFrom, 1), -1)
    if (empPosDateTo && empPosDateTo < dateTo && dateFrom < empPosDateTo) {
      dateTo = empPosDateTo
    }
    dateEnd = empPosDateTo
    let dayCount
    if (isStateExp) {
      /* startCalcDate: dateService.maxDate() - Стаж вираховується по dateFrom */
      let expData = { calcDate: expCalcDate, startCalcDate: dateService.maxDate() }
      dayCount = timeCostService.getVacPlanDays({
        employeeID,
        periodDateFrom: dateFrom,
        dictVacationKindID,
        defaultValue: 0,
        expData
      })
      if (!dayCount) {
        mParams.message = noDStateDataMsg
        return
      }
    } else {
      if (dictVacDays && dictVacDays.dayCount) {
        dayCount = dictVacDays.dayCount
        if (dayCount) {
          if (dictVacData.isProportional && empPosDateTo) {
            let dateDiff = dateService.dateDiff(empPosDateFrom, empPosDateTo)
            if (dateDiff < 365) {
              dayCount = Math.round(dayCount * dateDiff / 365)
            }
          }
        }
      }
    }

    mParams.result = {
      dateFrom: dateFrom,
      dateTo: dateTo,
      dateEnd: dateEnd,
      dayCount: dayCount || 0
    }
  }
}

me.doPosting = function (order, para, saved, isNewTabNum = true) {
  const newItems = UB.Repository(__entityName)
    .attrs(['dictVacationKindID', 'dateFrom', 'dateTo', 'dateEndNotEmpty', 'dayCount', 'isRest', 'isMainPart',
      'dictVacationKindID.isProportional', 'dayFact'])
    .where('orderDetID', '=', para.ID)
    .orderBy('dictVacationKindID', 'asc')
    .orderBy('isRest', 'asc')
    .orderBy('dayCount', 'desc')
    .orderBy('dateFrom', 'asc')
    .selectAsObject()
  const newGroupedItems = UB.Repository(__entityName)
    .attrs(['dictVacationKindID', 'MIN([dateFrom])', 'MAX([dayCount])', 'MIN([dateEndNotEmpty])'])
    .where('orderDetID', '=', para.ID)
    .groupBy(['dictVacationKindID'])
    .selectAsObject({
      'MIN([dateFrom])': 'dateFrom',
      'MAX([dayCount])': 'dayCount',
      'MIN([dateEndNotEmpty])': 'dateEndNotEmpty'
    })
  const openPlans = UB.Repository('hr_empVacationPlan')
    .attrs(['ID', 'dictVacationKindID', 'dateTo', 'isPause'])
    .where('employeeNumberID', '=', para.employeeNumberID)
    .where('dateTo', '>', para.dateFrom)
    .selectAsObject()
  const basePosEmpNumID = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID'])
    .where('employeeID', '=', para.employeeID)
    .where('dateFrom', '<=', para.dateFrom)
    .where('dateTo', '>=', para.dateFrom)
    .where('workPlace', '=', '1')
    .limit(1)
    .selectScalar() || 0
  const basePlan = UB.Repository('hr_empVacationPlan')
    .attrs(['dictVacationKindID', 'dayCount'])
    .where('employeeNumberID', '=', basePosEmpNumID)
    .where('dateTo', '>', para.dateFrom)
    .selectAsObject()
  const paraDateFrom = new Date(para.dateFrom)
  /* UBHR-10726 */
  /* if (!isNewTabNum) {
    // Наказ про сумісництво
    openPlans.forEach(openPlan => {
      let newItem = newGroupedItems.find(itm => itm.dictVacationKindID === openPlan.dictVacationKindID)
      orderService.updateByOrder({
        store: 'hr_empVacationPlan',
        params: {
          ID: openPlan.ID,
          dateTo: dateService.addDays(para.dateFrom, -1),
          isPause: !newItem
        },
        saved: saved,
        oldValues: {
          dateTo: openPlan.dateTo,
          isPause: openPlan.isPause
        }
      })
    })
  } */
  const vacPlanStore = UB.DataStore('hr_empVacationPlan')
  newGroupedItems.forEach(newGroupedItem => {
    let openPlanItem = openPlans.find(itm => itm.dictVacationKindID === newGroupedItem.dictVacationKindID)
    if (!openPlanItem) {
      let empVacPlanID = vacPlanStore.generateID()
      let basePlanItem = basePlan && basePlan.find(itm => itm.dictVacationKindID === newGroupedItem.dictVacationKindID)
      orderService.insertByOrder({
        store: 'hr_empVacationPlan',
        params: {
          ID: empVacPlanID,
          employeeID: para.employeeID,
          employeeNumberID: para.employeeNumberID,
          dictVacationKindID: newGroupedItem.dictVacationKindID,
          dateFrom: _.min([paraDateFrom, new Date(newGroupedItem.dateFrom)]),
          dateTo: newGroupedItem.dateEndNotEmpty,
          dayCount: (basePlanItem && basePlanItem.dayCount) || newGroupedItem.dayCount,
          orderID: para.employeePositionID,
          orderDetID: para.ID,
          reason: order.description,
          isPause: false
        },
        saved: saved
      })
      newGroupedItem.empVacationPlanID = empVacPlanID
    } else {
      newGroupedItem.empVacationPlanID = openPlanItem.ID
    }
  })
  const perItems = _.sortBy(newItems, ['dictVacationKindID', 'dateFrom'])
  perItems.forEach(perItem => {
    let newGrpItem = newGroupedItems.find(itm => itm.dictVacationKindID === perItem.dictVacationKindID)
    let perDateTo = new Date(perItem.dateTo)
    let fromOrgID = (perDateTo <= paraDateFrom) ? para['srcOrganizationID.mi_data_id'] : null
    let dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(newGrpItem.dateEndNotEmpty), dateService.shiftDate(dateService.addDays((dateService.addYears(perItem.dateFrom, 1)), -1))))
    let newPerParams = {
      empVacationPlanID: newGrpItem.empVacationPlanID,
      dateFrom: perItem.dateFrom,
      dateTo: dateTo,
      dayCountPlan: perItem.dayCount,
      isMainPart: perItem.isMainPart,
      fromOrgID: fromOrgID
    }
    if (order['empOrderType'] === 'PLURALIST') {
      const vp = UB.Repository('hr_empVacationPeriod')
        .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan'])
        .where('empVacationPlanID.employeeNumberID', '=', para.employeeNumberID)
        .where('empVacationPlanID.dictVacationKindID', '=', perItem.dictVacationKindID)
        .where('dateFrom', '<=', perItem.dateTo)
        .where('dateTo', '>=', perItem.dateFrom)
        .limit(1)
        .selectSingle()
      if (!vp) {
        if (perItem['dictVacationKindID.isProportional'] === 0) {
          const vacPeriod = UB.Repository('hr_empVacationPeriod')
            .attrs(['dateTo'])
            .where('empVacationPlanID.employeeNumberID', '=', para.employeeNumberID)
            .where('empVacationPlanID.dictVacationKindID', '=', perItem.dictVacationKindID)
            .orderBy('dateTo', 'desc')
            .limit(1)
            .selectSingle()
          if (vacPeriod) {
            if (dateService.shiftDate(vacPeriod.dateTo) < dateService.shiftDate(perItem.dateTo)) {
              newPerParams.dateFrom = dateService.addDays(vacPeriod.dateTo, 1)
              newPerParams.dateTo = dateService.addDays(dateService.addYears(vacPeriod.dateTo, 1), -1)
            } else {
              newPerParams = null
            }
          }
        }
      } else {
        if (!isNewTabNum) {
          const lastPos = UB.Repository('hr_employeePositionS')
            .attrs('ID', 'dateTo')
            .where('employeeNumberID', '=', para.employeeNumberID)
            .where('workPlace', '=', '2')
            .where('dateTo', '<', para.dateFrom)
            .orderByDesc('dateTo')
            .limit(1)
            .selectSingle()
          const periodDateFrom = dateService.shiftDate(vp.dateFrom)
          const periodDateTo = dateService.shiftDate(vp.dateTo)
          if (lastPos && periodDateFrom < dateService.shiftDate(lastPos.dateTo) && periodDateTo > dateService.shiftDate(lastPos.dateTo)) {
            const newDateTo = dateService.addDays(para.dateFrom, -1)
            orderService.updateByOrder({
              store: 'hr_empVacationPeriod',
              params: {
                ID: vp.ID,
                dateTo: newDateTo,
                dayCountPlan: Math.round(vp.dayCountPlan * dateService.dateDiff(periodDateFrom, newDateTo) / (dateService.dateDiff(periodDateFrom, periodDateTo)))
              },
              saved: saved,
              oldValues: {
                dateTo: vp.dateTo,
                dayCountPlan: vp.dayCountPlan
              }
            })
          }
        }
        // newPerParams = null
      }
    }
    if (newPerParams) {
      if (para.parentEmpNumberID) {
        const orgName = UB.Repository('hr_employeeNumberS').attrs('orgName').where('ID', '=', para.parentEmpNumberID).limit(1).selectScalar() || ''
        newPerParams.dayCountFactCorr = perItem.dayFact
        newPerParams.comment = String(UB.i18n('Використані на попередньому місці роботи ({0})', orgName)).substr(0, 200) || null
      }
      orderService.insertByOrder({
        store: 'hr_empVacationPeriod',
        params: newPerParams,
        saved: saved
      })
    }
  })
  vacPlanStore.freeNative()
}

/** Автоматичне додавання планової відпустки по працівнику для сумісництва
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.employeeNumberID таб. номер
 * @param {string} ctx.mParams.positionType Тип посади
 * @param {Date} ctx.mParams.dateFrom дата призначення на посаду
 * @param {Date} ctx.mParams.dateTo дата закінчення роботи
 * @param {number} ctx.mParams.orderDetID пункт наказу
 * @param {string} ctx.mParams.planKindOption режим, як вибирати види відпустки
 *   ('PLANDAY' - по довіднику hr_dictVacationPlanDay (за замовченням), 'EMPPLAN' - по відкритим записам картки права на відпустку)
 */
me.addDefaultPluralistVacationPlan = function (ctx) {
  const mParams = ctx.mParams
  let employeeID = mParams.employeeID
  let employeeNumberID = mParams.employeeNumberID
  let positionType = mParams.positionType
  let dateFrom = mParams.dateFrom
  let dateTo = mParams.dateTo
  let orderDetID = mParams.orderDetID
  let planKindOption = mParams.planKindOption || 'PLANDAY'
  let dontClear = mParams.dontClear
  const messages = []

  !dontClear && doClearVacationPlan(orderDetID)

  const vacPlanStore = UB.DataStore(__entityName)
  let planDay
  if (planKindOption === 'EMPPLAN') {
    planDay = UB.Repository('hr_empVacationPlan')
      .attrs(['dictVacationKindID', 'dictVacationKindID.code'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
    if (planDay.length === 0 || !employeeNumberID) {
      employeeNumberID = UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID'])
        .where('employeeID', '=', employeeID)
        .where('workPlace', '=', '1')
        .where('dateFrom', '<=', dateFrom)
        .where('dateTo', '>=', dateFrom)
        .limit(1)
        .selectScalar()
      if (employeeNumberID) {
        planDay = UB.Repository('hr_empVacationPlan')
          .attrs(['dictVacationKindID', 'dictVacationKindID.code'])
          .where('employeeNumberID', '=', employeeNumberID)
          .where('dateFrom', '<=', dateFrom)
          .where('dateTo', '>=', dateFrom)
          .selectAsObject()
      }
    }
  }
  if (planKindOption !== 'EMPPLAN' || (planDay && planDay.length === 0)) {
    planDay = UB.Repository('hr_dictVacationPlanDay')
      .attrs(['dictVacationKindID', 'dictVacationKindID.code'])
      .where('positionType', '=', positionType)
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .selectAsObject()
  }
  if (planDay.length > 0) {
    planDay.forEach(planItem => {
      let dictVacationKindID = planItem.dictVacationKindID
      let vactKindCode = planItem['dictVacationKindID.code']
      let expCalcDate
      let expIsFromOrder = false
      /* isDState - Додаткова оплачуєма відпустка за стаж держ служби */
      let isDState = (vactKindCode === 'dState')
      if (isDState) {
        expCalcDate = UB.Repository('hr_empOrderExperience')
          .attrs(['calcDate'])
          .where('empOrderDetID', '=', orderDetID)
          .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
          .limit(1)
          .selectScalar()
        if (expCalcDate) {
          expIsFromOrder = true
        } else {
          expCalcDate = UB.Repository('hr_employeeExperience')
            .attrs(['calcDate'])
            .where('employeeID', '=', employeeID)
            .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
            .limit(1)
            .selectScalar()
        }
      }
      let vacParams = {
        employeeID: employeeID,
        dictVacationKindID: dictVacationKindID,
        positionType: positionType,
        empPosDateFrom: dateFrom,
        empPosDateTo: dateTo,
        onDate: dateFrom,
        expCalcDate: expCalcDate,
        expIsFromOrder: expIsFromOrder
      }
      me.getVacationPlanData({
        mParams: vacParams
      })
      let planData = vacParams.result
      if (planData) {
        vacPlanStore.run('insert', {
          execParams: {
            orderDetID: orderDetID,
            dictVacationKindID: dictVacationKindID,
            dateFrom: planData.dateFrom,
            dateTo: planData.dateTo,
            // dateEndEmpty: planData.dateEnd, // для сумісництва не треба закривати право на відпустку
            dayCount: planData.dayCount,
            isMainPart: false
          }
        })
      }
      if (vacParams.message) {
        messages.push(vacParams.message)
      }
    })
  }
  vacPlanStore.freeNative()
  ctx.mParams.messages = JSON.stringify(messages)
}

/** Додати залишки права на відрпустку з попередньої організації
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.srcOrganizationID попередня організація
 * @param {number} ctx.mParams.orderDetID пункт наказу
 * @param {Date} ctx.mParams.onDate поточна дата
 */
me.addBalance = function (ctx) {
  const mParams = ctx.mParams
  const employeeID = mParams.employeeID
  const srcOrganizationID = mParams.srcOrganizationID
  const orderDetID = mParams.orderDetID
  const onDate = (mParams.onDate && dateService.shiftDate(mParams.onDate)) || dateService.currentDate()
  const srcOrgData = UB.Repository('hr_empVacationPeriod')
    .attrs(['dateFrom', 'dateTo', 'dayRecalc', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.name'])
    .where('empVacationPlanID.employeeID', '=', employeeID)
    .where('empVacationPlanID.employeeNumberID.orgID', '=', srcOrganizationID)
    .where('empVacationPlanID.mi_deleteDate', '=', '9999-12-31')
    .where('empVacationPlanID.employeeNumberID.mi_deleteDate', '=', '9999-12-31')
    .where('dayRecalc', '>', 0)
    .selectAsObject({
      'empVacationPlanID.dictVacationKindID': 'dictVacationKindID',
      'empVacationPlanID.dictVacationKindID.name': 'dictVacationKindName'
    })
  if (srcOrgData.length > 0) {
    const vacPlanStore = UB.DataStore(__entityName)
    const existedRecalc = UB.Repository(__entityName)
      .attrs(['ID'])
      .where('orderDetID', '=', orderDetID)
      .where('isRest', '=', true)
      .selectAsObject()
    if (existedRecalc.length > 0) {
      existedRecalc.forEach(itm => {
        vacPlanStore.run('delete', {
          execParams: {
            ID: itm.ID
          }
        })
      })
    }
    srcOrgData.forEach(orgItem => {
      let description = `${orgItem.dictVacationKindName} = ${orgItem.dayRecalc}`
      vacPlanStore.run('insert', {
        execParams: {
          orderDetID: orderDetID,
          dictVacationKindID: orgItem.dictVacationKindID,
          dateFrom: orgItem.dateFrom,
          dateTo: orgItem.dateTo,
          dayCount: orgItem.dayRecalc,
          description: description,
          isMainPart: true,
          isRest: true
        },
        isInternalOperation: true
      })
    })
    vacPlanStore.freeNative()
  } else {
    let empName = UB.Repository('hr_employee')
      .attrs('shortFIO')
      .where('ID', '=', employeeID)
      .limit(1)
      .selectScalar()
    let orgName = UB.Repository('hr_organization')
      .attrs('name')
      .where('mi_data_id', '=', srcOrganizationID)
      .misc({ __mip_ondate: onDate })
      .limit(1)
      .selectScalar()
    mParams.message = UB.i18n(`В системі не зафіксовані залишки відпусток працівника {0} в організації "{1}"`, empName, orgName)
  }
}
