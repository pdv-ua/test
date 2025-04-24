const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const _ = require('lodash')
const dateService = require('../AC/modules/dataServices/dateService')
const storeService = require('../AC/modules/dataServices/localStoreService')
const selectService = require('../AC/modules/dataServices/selectService')
const timeCostService = require('./modules/timeCostService')
const timService = require('./modules/timService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

me.entity.addMethod('selectAvailableVacationDays')
me.entity.addMethod('getAvailableVacationDays')
me.entity.addMethod('getAvailableVacationDaysSql')
me.entity.addMethod('getVacPeriodDays')
me.entity.addMethod('getMainPartIsUsed')
me.entity.addMethod('addDefaultVacationPlan')
me.entity.addMethod('getData')
me.entity.addMethod('getDataReq')
me.entity.addMethod('selectData')
me.entity.addMethod('getVacPlanDays')
me.entity.addMethod('autoAddPeriods')
me.entity.addMethod('getVacFactDays')
me.entity.addMethod('getVacPlanDateFrom')
me.entity.addMethod('checkVacKindExists')
me.entity.addMethod('getNewID')
me.entity.addMethod('updateVacationTimeSheet')
me.entity.addMethod('recalcPlanDays')
me.entity.addMethod('getVacationInfoSql')
me.entity.addMethod('fixVacations')

function checkIsStatePos (employeeNumberID, dictVacationKindID, dictVacationKindCode, dateFrom) {
  if (!employeeNumberID || !dictVacationKindID || !dateFrom) {
    return false
  }

  const dictVacationKind = UB.Repository('hr_dictVacationKind').attrs(['ID', 'isDisableNewPeriods']).selectById(dictVacationKindID)
  if (dictVacationKind && dictVacationKind.isDisableNewPeriods) {
    return false
  }

  if (!dictVacationKindCode) {
    dictVacationKindCode = UB.Repository('hr_dictVacationKind')
      .attrs('code')
      .where('ID', '=', dictVacationKindID)
      .limit(1)
      .selectScalar()
  }
  if (dictVacationKindCode !== 'dState') {
    return true
  }
  return UB.Repository('hr_employeePositionS')
    .attrs(['positionID.positionType'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .joinCondition('positionID.state', '=', 'ACTIVE')
    .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('[positionID.mi_dateTo] = [positionID.mi_maxDateTo]', 'custom')
    .where('positionID.positionType', '=', '1')
    .limit(1)
    .selectSingle()
}

function checkHasStateExp (dictVacationKindID, dictVacationKindCode, dayCount) {
  if (!dictVacationKindID) {
    return false
  }
  if (!dictVacationKindCode) {
    dictVacationKindCode = UB.Repository('hr_dictVacationKind')
      .attrs('code')
      .where('ID', '=', dictVacationKindID)
      .limit(1)
      .selectScalar()
  }
  if (dictVacationKindCode !== 'dState') {
    return true
  }
  return dayCount > 0
}

function canAutoAdd ({ employeeNumberID, employeeID, empVacationPlanID, dictVacationKindID, dictVacationKindCode, dateFrom }) {
  return checkIsStatePos(employeeNumberID, dictVacationKindID, dictVacationKindCode, dateFrom)
}

/* Автоматичне створення запису по періоду після вставки запису про право на відпустку */
function insertDefaultPeriod (ctx) {
  const execParams = ctx.mParams.execParams
  const ID = execParams.ID
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  let dateFrom = dateService.shiftDate(execParams.dateFrom)
  let addedYearDate = dateService.addDays(dateService.addMonths(dateFrom, 12), -1)
  let execDateTo = execParams.dateTo && dateService.shiftDate(execParams.dateTo)
  let dateTo = execDateTo && execDateTo < addedYearDate ? execDateTo : addedYearDate
  // const isPause = execParams.isPause
  let dayCount = execParams.dayCount
  if (canAutoAdd({ employeeNumberID, empVacationPlanID: ID, dictVacationKindID, dateFrom })) {
    dayCount = timeCostService.getVacPlanDays({
      employeeNumberID,
      periodDateFrom: dateFrom,
      periodDateTo: dateTo,
      planDateTo: execParams.dateTo,
      dictVacationKindID,
      defaultValue: dayCount
    })
    if (checkHasStateExp(dictVacationKindID, undefined, dayCount)) {
      UB.DataStore('hr_empVacationPeriod').run('insert', {
        execParams: {
          empVacationPlanID: ID,
          dateFrom: dateFrom,
          dateTo: dateTo,
          dayCountPlan: dayCount
        }
      })
    }
  }
}

function setAttr (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.dateToEmpty !== undefined) {
    const dateTo = execParams.dateToEmpty
    if (dateTo) {
      execParams.dateTo = dateTo
    } else {
      execParams.dateTo = dateService.maxDate()
    }
  }
  const orderDetID = execParams.orderDetID
  const employeeBenefitsID = execParams.employeeBenefitsID
  const otherReasons = execParams.otherReasons
  if (orderDetID) {
    execParams.reason = UB.Repository('hr_empOrderDet')
      .attrs(['orderID.description'])
      .where('ID', '=', orderDetID)
      .selectScalar()
  } else if (employeeBenefitsID) {
    execParams.reason = UB.Repository('hr_employeeBenefits')
      .attrs(['description'])
      .where('ID', '=', employeeBenefitsID)
      .selectScalar()
  } else if (otherReasons) {
    execParams.reason = otherReasons
  }
}

function beforeInsert (ctx) {
  setAttr(ctx)
  me.checkVacKindExists(ctx)
  if (ctx.mParams.msg) {
    throw new UB.UBAbort(`<<<${ctx.mParams.msg}>>>`)
  }
}

function beforeUpdate (ctx) {
  setAttr(ctx)
}

function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.isOrderOperation || mParams.isImportOperation) {
    return
  }
  insertDefaultPeriod(ctx)
}

function beforeDelete (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const vacPeriod = UB.Repository('hr_empVacationPeriod')
    .attrs('ID')
    .where('empVacationPlanID', '=', execParams.ID)
    .selectAsObject()
  const ds = UB.DataStore('hr_empVacationPeriod')
  vacPeriod.forEach(item => {
    ds.run('delete', {
      isImportOperation: mParams.isImportOperation,
      execParams: {
        ID: item.ID
      }
    })
  })
  ds.freeNative()
  /* if (mParams.isImportOperation) {
    let impSourceID = UB.Repository(__entityName).attrs('impSourceID').selectById(execParams.ID).impSourceID
    if (impSourceID) {
      let vacPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs('ID')
        .where('empVacationPlanID', '=', execParams.ID)
        .where('impSourceID', '=', impSourceID)
        .selectAsObject()
      const ds = UB.DataStore('hr_empVacationPeriod')
      vacPeriod.forEach(item => {
        ds.run('delete', {
          isImportOperation: true,
          execParams: {
            ID: item.ID
          }
        })
      })
      ds.freeNative()
    }
  } */
}

function checkLongTermForState (employeeNumberID, minDateFrom) {
  return UB.Repository('hr_empLongTermAbsc')
    .attrs('ID', 'dateFrom', 'dateTo')
    .where('employeeNumberID', '=', employeeNumberID)
    // .where('dateFrom', '<=', minDateFrom)
    .where('dateTo', '>', minDateFrom)
    .limit(1)
    .selectSingle()
}

function getNewDatesStateVac (employeeID, employeeNumberID, dateFrom) {
  let newDateFrom, newDateTo
  let isNewDates = false
  let stateExpCalcDate = UB.Repository('hr_employeeExperience')
    .attrs('calcDate')
    .where('employeeID', '=', employeeID)
    .where('dictExperienceID.code', '=', timService.CONSTANTS.stateExpCode)
    .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .where('startCalcDate', 'isNull', undefined, 'startCalcDateIsNull')
    .where('calcDate', '<=', dateFrom, 'calcDateLess')
    .where('startCalcDate', '>=', dateFrom, 'startCalcDateMore')
    .where('employeeNumberID', '=', employeeNumberID, 'empNum')
    .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
    .logic('([empNum] OR [empNumNull]) AND ([startCalcDateIsNull] OR ([calcDateLess] AND [startCalcDateMore]))')
    .orderByDesc('employeeNumberID')
    .limit(1)
    .selectScalar()
  if (stateExpCalcDate) {
    const endLongTermAbsc = UB.Repository('hr_empLongTermAbsc')
      .attrs('max([dateTo])')
      .where('employeeNumberID', '=', employeeNumberID)
      // .where('dateFrom', '<=', minDateFrom)
      .where('dateTo', '>', dateFrom)
      .limit(1)
      .selectScalar()
    if (endLongTermAbsc) {
      isNewDates = true
      stateExpCalcDate = dateService.shiftDate(stateExpCalcDate)
      newDateFrom = dateService.shiftDate(new Date(dateService.shiftDate(dateService.addDays(endLongTermAbsc, 1)).getFullYear(), stateExpCalcDate.getMonth(), stateExpCalcDate.getDate()))
      newDateTo = dateService.addDays(dateService.addYears(newDateFrom, 1), -1)
    }
  } else {
    return {
      error: true,
      stateExpCalcDate: null
    }
  }
  return isNewDates ? { dateFrom: newDateFrom, dateTo: newDateTo } : null
}

function getDefaultDateFrom (employeeNumberID) {
  let empPos = UB.Repository('hr_employeePositionS')
    .attrs(['MIN([dateFrom])'])
    .where('employeeNumberID', '=', employeeNumberID)
    .selectAsObject({
      'MIN([dateFrom])': 'dateFrom'
    })
  empPos = empPos && empPos[0]
  return empPos && empPos.dateFrom && dateService.shiftDate(empPos.dateFrom)
}

function autoAddPeriods4Org (orgID, onDate) {
  // const prevYears = settingsService.get('hrEmpVacationSchedulerPrevYears', orgID, null) || 0
  const prevYearsVal = UB.Repository('ac_settingsOrg')
    .attrs(['value'])
    .where('[constantID.code]', '=', 'hrEmpVacationSchedulerPrevYears')
    .where('organizationID', '=', orgID)
    .selectScalar() || null
  const prevYears = Number(prevYearsVal) || 0

  // const weeksToEnd = settingsService.get('hrEmpVacationSchedulerWeeksToEnd', orgID, null) || 0
  const weeksToEndVal = UB.Repository('ac_settingsOrg')
    .attrs(['value'])
    .where('[constantID.code]', '=', 'hrEmpVacationSchedulerWeeksToEnd')
    .where('organizationID', '=', orgID)
    .selectScalar() || null
  const weeksToEnd = Number(weeksToEndVal) || 0

  const currentDate = onDate || dateService.currentTruncDate()
  const dateFrom = prevYears > 0 ? dateService.addYears(dateService.shiftDate(new Date(currentDate.getFullYear(), 0, 1)), -1 * prevYears) : currentDate
  const dateTo = weeksToEnd > 0 ? dateService.addDays(currentDate, weeksToEnd * 7) : dateService.addMonths(currentDate, 1)
  const isMsSql = entityBaseService.isMsSql()
  let dateFrom4Sql = `'${dateService.formatDate(dateFrom, 'yyyy-mm-dd')}'`
  if (!isMsSql) {
    dateFrom4Sql = `date ${dateFrom4Sql}`
  }
  const dateFromExpr = `CASE WHEN [empVacationPlanID.dateFrom] > ${dateFrom4Sql} THEN [empVacationPlanID.dateFrom] ELSE ${dateFrom4Sql} END`
  const periodData = UB.Repository('hr_empVacationPeriod')
    .attrs(['empVacationPlanID', 'empVacationPlanID.employeeID', 'empVacationPlanID.employeeNumberID',
      'empVacationPlanID.dictVacationKindID.code', 'empVacationPlanID.dateFrom', 'empVacationPlanID.dateTo', 'empVacationPlanID.dayCount',
      'empVacationPlanID.dictVacationKindID', 'minDateFrom', 'maxDateTo', 'MAX([dateFrom])', 'MAX([dateTo])'])
    .where('dateTo', '>=', dateFrom)
    .where('dateTo', '<', dateTo)
    .where('empVacationPlanID.dateTo', '>=', dateFrom)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .where('empVacationPlanID.dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
    .where('[dateTo] < [empVacationPlanID.dateTo]', 'custom')
    .where('empVacationPlanID.isPauseNotNull', '=', false)
    .where('empVacationPlanID.employeeNumberID.orgID', '=', orgID)
    .where('empVacationPlanID.employeeNumberID.dateTo', '>=', dateTo)
    .where('empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .notExists(
      UB.Repository('hr_empVacationPeriod')
        .correlation('empVacationPlanID', 'empVacationPlanID')
        .where('dateTo', '>=', dateTo)
        .where('mi_deleteDate', '>=', '#maxdate'), 'hasntNewPeriod')
    .notExists(
      UB.Repository('hr_empVacationPeriod')
        .correlation('empVacationPlanID', 'empVacationPlanID')
        .where(isMsSql ? `[dateFrom] < DATEADD(year, 1, ${dateFromExpr})` : `[dateFrom] < ${dateFromExpr} + interval '1 year'`, 'custom')
        .where('mi_deleteDate', '>=', '#maxdate'), 'hasntOldPeriod')
    .logic('[hasntNewPeriod] OR [hasntOldPeriod]')
    .groupBy(['empVacationPlanID', 'empVacationPlanID.employeeID', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.dateFrom',
      'empVacationPlanID.dateTo', 'empVacationPlanID.dayCount', 'empVacationPlanID.dictVacationKindID.code',
      'empVacationPlanID.dictVacationKindID'])
    .selectAsObject({
      'empVacationPlanID.employeeID': 'employeeID',
      'empVacationPlanID.employeeNumberID': 'employeeNumberID',
      'empVacationPlanID.dateFrom': 'planDateFrom',
      'empVacationPlanID.dateTo': 'planDateTo',
      'empVacationPlanID.dayCount': 'planDayCount',
      'empVacationPlanID.dictVacationKindID.code': 'vacKindCode',
      'empVacationPlanID.dictVacationKindID': 'dictVacationKindID',
      'MAX([dateFrom])': 'dateFrom',
      'MAX([dateTo])': 'dateTo'
    })
  /* UBHR-14429, враховувати наявність відкритого призначення станом на дату початку періоду */
  const empPosHist = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
    .where('organizationID', '=', orgID)
    .where('isActive', '=', true)
    .where('dateFrom', '<=', dateTo)
    .where('mi_deleteDate', '>=', '#maxdate')
    .orderBy('employeeNumberID')
    .orderBy('dateFrom')
    .selectAsObject()
  empPosHist.forEach(empPosItem => {
    empPosItem.dateFrom = new Date(empPosItem.dateFrom)
    empPosItem.dateTo = new Date(empPosItem.dateTo)
  })
  const empPos = empPosHist.filter(itm => itm.dateTo >= dateTo)
  // Внутрішні сумісники
  const plData = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID'])
    .where('organizationID', '=', orgID)
    .where('isActive', '=', true)
    .where('dateFrom', '<=', currentDate)
    .where('dateTo', '>=', currentDate)
    .where('workPlace', '=', '2')
    .joinCondition('positionID.state', '=', 'ACTIVE')
    .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  const periods = periodData.filter(pItem => empPos.find(epItem => epItem.employeeNumberID === pItem.employeeNumberID))
  if (periods.length > 0) {
    const empVacPeriods = UB.Repository('hr_empVacationPeriod')
      .attrs('empVacationPlanID', 'dateFrom', 'dateTo')
      .where('empVacationPlanID', 'in', periods.map(o => o.empVacationPlanID))
      .where('dateFrom', '>=', dateFrom)
      .selectAsObject()
    empVacPeriods.forEach(o => {
      o.dateFrom = dateService.shiftDate(o.dateFrom)
      o.dateTo = dateService.shiftDate(o.dateTo)
    })

    const storeEmpVacPer = UB.DataStore('hr_empVacationPeriod')
    periods.forEach(per => {
      let planDateFrom = new Date(per.planDateFrom)
      let planDateTo = new Date(per.planDateTo)
      let minDateFrom = new Date(per.minDateFrom)
      let maxDateTo = new Date(per.maxDateTo)
      let isMainPart = false // UBHR-12118

      // UBHR-11653 - додавати початкові періоди перед першим періодом, якщо не заведено
      let startDate = _.max([planDateFrom, dateFrom])
      let prevDateTo = dateService.addDays(minDateFrom, -1)
      let prevDateFrom = dateService.addDays(dateService.addYears(prevDateTo, -1), 1)
      while (prevDateFrom >= startDate) {
        let dayCountPlan = timeCostService.getVacPlanDays({
          employeeID: per.employeeID,
          employeeNumberID: per.employeeNumberID,
          periodDateFrom: prevDateFrom,
          periodDateTo: prevDateTo,
          planDateTo: planDateTo,
          dictVacationKindID: per.dictVacationKindID,
          defaultValue: per.planDayCount
        })
        let canAdd = canAutoAdd({
          employeeNumberID: per.employeeNumberID,
          employeeID: per.employeeID,
          empVacationPlanID: per.empVacationPlanID,
          dictVacationKindID: per.dictVacationKindID,
          dictVacationKindCode: per.vacKindCode,
          dateFrom: prevDateFrom
        })
        let isDefDates = true
        let newDateFrom, newDateTo
        if (canAdd) {
          if (per.vacKindCode === 'dState') {
            if (checkLongTermForState(per.employeeNumberID, dateService.shiftDate(per.dateFrom))) {
              const newDates = getNewDatesStateVac(per.employeeID, per.employeeNumberID, dateService.shiftDate(per.dateFrom))
              if (newDates) {
                if (!newDates.error) {
                  isDefDates = false
                  newDateFrom = newDates.dateFrom
                  newDateTo = newDates.dateTo
                } else {
                  canAdd = false
                }
              }
            }
          }
        }
        if (canAdd) {
          let description = `${dateService.formatDate(prevDateFrom)} - ${dateService.formatDate(prevDateTo)}`
          if (!isDefDates) {
            description = `${dateService.formatDate(newDateFrom)} - ${dateService.formatDate(newDateTo)}`
          }
          storeEmpVacPer.run('insert', {
            execParams: {
              empVacationPlanID: per.empVacationPlanID,
              dateFrom: isDefDates ? prevDateFrom : newDateFrom,
              dateTo: isDefDates ? prevDateTo : newDateTo,
              dayCountPlan: dayCountPlan,
              description: description,
              isMainPart: isMainPart,
              dayDiff: dayCountPlan
            }
          })
        }
        prevDateTo = dateService.addDays(prevDateFrom, -1)
        prevDateFrom = dateService.addDays(dateService.addYears(prevDateTo, -1), 1)
      }

      // Нові періоди, більше макс. дати існуючих періодів
      if (maxDateTo < dateTo) {
        let periodDateFrom = dateService.addDays(new Date(per.dateTo), 1)
        /* UBHR-14429 - не додавати періоди, якщо не було призначення на дату початку періоду */
        const empPos4Per = empPosHist.filter(itm => itm.employeeNumberID === per.employeeNumberID && itm.dateTo > periodDateFrom)
        if (empPos4Per.length > 0) {
          if (periodDateFrom < empPos4Per[0].dateFrom) {
            // На дату нового періоду немає призначення, беремо дату нового періоду з дати наступного призначення
            periodDateFrom = empPos4Per[0].dateFrom
          }
          let periodDateTo = dateService.shiftDate(Math.min(dateService.addDays(dateService.addYears(periodDateFrom, 1), -1), planDateTo))
          let isDateToPassed = false // для ще одного циклу після того, як стане periodDateTo > dateTo
          let isEmpPos = true // чи існує призначення на дату початку нового періоду
          while (isEmpPos && (periodDateTo <= dateTo || !isDateToPassed)) {
            isDateToPassed = periodDateTo > dateTo
            let dayCountPlan = timeCostService.getVacPlanDays({
              employeeID: per.employeeID,
              employeeNumberID: per.employeeNumberID,
              periodDateFrom: periodDateFrom,
              periodDateTo: periodDateTo,
              planDateTo: planDateTo,
              dictVacationKindID: per.dictVacationKindID,
              defaultValue: per.planDayCount
            })
            let canAdd = canAutoAdd({
              employeeNumberID: per.employeeNumberID,
              employeeID: per.employeeID,
              empVacationPlanID: per.empVacationPlanID,
              dictVacationKindID: per.dictVacationKindID,
              dictVacationKindCode: per.vacKindCode,
              dateFrom: periodDateFrom
            })
            if (canAdd) {
              let isPluralist = plData.find(itm => itm.employeeNumberID === per.employeeNumberID)
              if (isPluralist) {
                // не додавати період, якщо: поточне місце роботи працівника = Внутрішній сумісник та для останнього
                // внесеного періоду відпустки дата закінчення мінус дата початку менше року
                let periodYears = dateService.yearsDiff(per.dateFrom, dateService.addDays(per.dateTo, 1))
                canAdd = periodYears >= 1
              }
            }
            let evp = empVacPeriods.find(o => o.empVacationPlanID === per.empVacationPlanID && o.dateFrom.getTime() === periodDateFrom.getTime() && o.dateTo.getTime() === periodDateTo.getTime())
            if (canAdd && periodDateFrom <= periodDateTo && !evp) {
              if (checkHasStateExp(per.dictVacationKindID, per.vacKindCode, dayCountPlan)) {
                let isDefDates = true
                let newDateFrom, newDateTo
                if (per.vacKindCode === 'dState') {
                  if (checkLongTermForState(per.employeeNumberID, dateService.shiftDate(per.dateFrom))) {
                    const newDates = getNewDatesStateVac(per.employeeID, per.employeeNumberID, dateService.shiftDate(per.dateFrom))
                    if (newDates) {
                      if (!newDates.error) {
                        isDefDates = false
                        newDateFrom = newDates.dateFrom
                        newDateTo = newDates.dateTo
                      } else {
                        canAdd = false
                      }
                    }
                  }
                }
                if (canAdd) {
                  let description = `${dateService.formatDate(periodDateFrom)} - ${dateService.formatDate(periodDateTo)}`
                  if (!isDefDates) {
                    description = `${dateService.formatDate(newDateFrom)} - ${dateService.formatDate(newDateTo)}`
                  }
                  storeEmpVacPer.run('insert', {
                    execParams: {
                      empVacationPlanID: per.empVacationPlanID,
                      dateFrom: isDefDates ? periodDateFrom : newDateFrom,
                      dateTo: isDefDates ? periodDateTo : newDateTo,
                      dayCountPlan: dayCountPlan,
                      description: description,
                      isMainPart: isMainPart,
                      dayDiff: dayCountPlan
                    }
                  })
                }
              }
            }
            periodDateFrom = dateService.addYears(periodDateFrom, 1)
            const empPos4NextPer = empPos4Per.filter(itm => itm.dateTo > periodDateFrom)
            if (empPos4NextPer.length > 0) {
              if (periodDateFrom < empPos4NextPer[0].dateFrom) {
                // На дату нового періоду немає призначення, беремо дату нового періоду з дати наступного призначення
                periodDateFrom = empPos4NextPer[0].dateFrom
              }
              periodDateTo = dateService.addDays(dateService.addYears(periodDateFrom, 1), -1)
              if (periodDateFrom > planDateTo) {
                isEmpPos = false
              }
            } else {
              isEmpPos = false
            }
          }
        }
      }
    })
    storeEmpVacPer.freeNative()
  }
}

/**
 * Розрахунок доступних працівнику днів для виду відпустки вказану на дату
 * @param {object} ctx
 * @param {string} ctx.mParams.employeeNumberID працівник
 * @param {number} ctx.mParams.orgID організація
 * @param {Date} ctx.mParams.onDate на дату
 * @param {Date} ctx.mParams.upToDate якщо вказано, то кількість доступних днів береться пропорційно періоду до дати upToDate
 * @param {number} ctx.mParams.dictVacationKindID (не обов'язковий) ID виду відпустки
 * @param {string} ctx.mParams.dictVacationKindCode (не обов'язковий) код виду відпустки
 * @param {bool} ctx.mParams.getPeriods (не обов'язковий) виводити періоди планування в mParams.periods
 * @return {Array} [
 {
     employeeNumberID,
     dictVacationKindID,
     dictVacationKindName,
     daysPlan, // Днів по плану
     daysFact, // Днів використано
     daysDiff  // Доступні працівнику дні, що залишилися
   }, ...
 ]
 */
me.selectAvailableVacationDays = ctx => {
  const mParams = ctx.mParams
  let dictVacationKindID = mParams.dictVacationKindID
  if (!dictVacationKindID) {
    let dictVacationKindCode = mParams.dictVacationKindCode
    if (dictVacationKindCode) {
      dictVacationKindID = UB.Repository('hr_dictVacationKind')
        .attrs(['ID'])
        .where('code', '=', dictVacationKindCode)
        .selectScalar()
    }
  }
  const onDate = mParams.onDate
  let employeeNumberID = mParams.employeeNumberID
  const empPos = mParams.employeePositionID
    ? UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'employeeNumberID.tabNum', 'workPlace', 'employeeID'])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(mParams.employeePositionID)
    : null
  if (!employeeNumberID) {
    if (empPos) {
      employeeNumberID = empPos.employeeNumberID
    } else {
      throw new UB.UBAbort('<<<hr_empVacationPlan.js->selectAvailableVacationDays(): Необхідно передати ID або призначення, або табельного номеру>>>')
    }
  }
  const orgID = mParams.orgID
  const getPeriods = mParams.getPeriods
  const addInfo = {
    upToDate: mParams.upToDate ? dateService.shiftDate(mParams.upToDate) : undefined
  }
  if (getPeriods) {
    addInfo.periods = []
  }
  let resData = me.getAvailableVacationDays(employeeNumberID, orgID, onDate, dictVacationKindID, addInfo)
  let tabNum = empPos ? empPos['employeeNumberID.tabNum'] : UB.Repository('hr_employeeNumberS').attrs('tabNum').where('ID', '=', employeeNumberID).selectScalar()
  resData.forEach(item => {
    item.employeeNumberID = employeeNumberID
    item.tabNum = tabNum
  })
  ctx.mParams.isLessThen6Months = addInfo.isLessThen6Months
  if (mParams.withPartTime && empPos && empPos.workPlace === '1') {
    let partTimePos = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'employeeNumberID.tabNum'])
      .where('employeeID', '=', empPos.employeeID)
      .where('workPlace', '=', '2')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('organizationID', '=', orgID)
      .selectAsObject()
    partTimePos.forEach(partTimePosItem => {
      const partAddInfo = getPeriods ? { periods: [] } : {}
      const partTimeVac = me.getAvailableVacationDays(partTimePosItem.employeeNumberID, orgID, onDate, null, partAddInfo)
      partTimeVac.forEach(partTimeVacItem => {
        partTimeVacItem.employeeNumberID = partTimePosItem.employeeNumberID
        partTimeVacItem.tabNum = partTimePosItem['employeeNumberID.tabNum']
      })
      resData = resData.concat(partTimeVac)
      if (getPeriods) {
        addInfo.periods = addInfo.periods.concat(partAddInfo.periods)
      }
    })
  }
  ctx.mParams.resultData = JSON.stringify(resData)
  if (getPeriods) {
    ctx.mParams.repiods = JSON.stringify(addInfo.periods)
  }
}

/**
 * Отримати дані доступних днів відпустки
 * @param {number} employeeNumberID працівник
 * @param {number} orgID організація
 * @param {Date} onDate на дату
 * @param {number} dictVacationKindID вид відпустки
 * @param {object} addInfo додаткова інформація
 * @return {Array}
 */
me.getAvailableVacationDays = function (employeeNumberID, orgID, onDate, dictVacationKindID, addInfo) {
  onDate = (onDate && new Date(onDate)) || dateService.currentDate()
  const upToDate = addInfo && addInfo.upToDate && new Date(addInfo.upToDate)
  const currPeriodID = addInfo && addInfo.currPeriodID
  const currYear = addInfo && addInfo.currYear
  const getPeriods = !!(addInfo && addInfo.periods)
  const res = []
  let empVac
  const isVacLong = timeCostService.isVacLong(dictVacationKindID)
  if (isVacLong) {
    let vacKindName = UB.Repository('hr_dictVacationKind')
      .attrs(['name'])
      .where('ID', '=', dictVacationKindID)
      .selectScalar()
    empVac = [{
      employeeNumberID,
      dictVacationKindID,
      isProportional: false,
      vacKindName: vacKindName
    }]
  } else {
    empVac = UB.Repository('hr_empVacationPeriod')
      .attrs(['empVacationPlanID.employeeNumberID', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.isProportional',
        'empVacationPlanID.dictVacationKindID.name', 'MIN([dateFrom])'])
      .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
      .whereIf(employeeNumberID, 'empVacationPlanID.employeeNumberID', '=', employeeNumberID)
      .whereIf(orgID, 'empVacationPlanID.employeeNumberID.orgID', '=', orgID)
      .whereIf(!employeeNumberID, 'empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .groupBy(['empVacationPlanID.employeeNumberID', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.isProportional',
        'empVacationPlanID.dictVacationKindID.name'])
      .selectAsObject({
        'empVacationPlanID.employeeNumberID': 'employeeNumberID',
        'empVacationPlanID.dictVacationKindID': 'dictVacationKindID',
        'empVacationPlanID.dictVacationKindID.isProportional': 'isProportional',
        'empVacationPlanID.dictVacationKindID.name': 'vacKindName',
        'MIN([dateFrom])': 'dateFrom'
      })
  }
  const currYearDateBeg = currYear && dateService.getYearBegin(currYear)
  const currYearDateEnd = currYear && dateService.getYearEnd(currYear)
  const vacPeriod = timeCostService.getVacFactDays({
    employeeNumberID,
    dictVacationKindID,
    orgID,
    currPeriodID,
    upToDate,
    dateFrom: currYearDateBeg,
    dateTo: currYearDateEnd,
    addFields: ['maxDateTo', 'isMainPart']
  })
  let vacFactCurrYear = currYear && timeCostService.getVacFactDays({ employeeNumberID, dictVacationKindID, orgID, dateFrom: currYearDateBeg, dateTo: currYearDateEnd })
  const yearVacMainPart = timService.CONSTANTS.yearVacMainPart
  let hasProportionalVac = false
  let isMoreThen6Months = false
  let totalDaysDiff = 0
  let totalDaysDiffNoCheck = 0
  let currPeriodDaysDiff = 0
  let currYearDaysFact = 0
  let partPlanDays = 0
  empVac.forEach(empVacItem => {
    let enID = empVacItem.employeeNumberID
    let dictVacKindID = empVacItem.dictVacationKindID
    let isProportional = empVacItem.isProportional
    let resItem = {
      employeeNumberID: enID,
      dictVacationKindID: dictVacKindID,
      dictVacationKindName: empVacItem.vacKindName,
      daysPlan: 0,
      daysPlanOnDate: 0,
      daysPlanNoCheck: 0,
      daysFact: 0,
      daysComp: 0,
      daysDiff: 0,
      daysFix: 0,
      daysDiffOnDate: 0,
      daysDiffNoCheck: 0
    }
    let currentPeriodDaysPlan = 0
    let currentPeriodDaysFact = 0
    let currentPeriodDaysComp = 0
    let vacPeriodItems = vacPeriod.filter(perItem => perItem.employeeNumberID === enID && perItem.dictVacationKindID === dictVacKindID)
    vacPeriodItems.forEach(perItem => {
      /* UBHR-9480 Не враховуємо від'ємну кількість днів (що було імпортовано при міграції) */
      let dayCountPlan = perItem.dayCountPlan >= 0 ? perItem.dayCountPlan : 0
      let perDayCountPlan = dayCountPlan
      let perDayCountPlanNoCheck = dayCountPlan
      let perDayCountFact = 0
      let perDayCountComp = 0
      let perDateFrom = new Date(perItem.dateFrom)
      let perDateTo = new Date(perItem.dateTo)
      let isBeforeOnDatePeriod = (perDateFrom <= onDate)
      let isOnDatePeriod = (perDateFrom <= onDate && perDateTo >= onDate)
      let isCurrentPeriod = currPeriodID ? currPeriodID === perItem.ID
        : upToDate && perDateFrom <= upToDate && (perDateTo >= upToDate || dateService.equals(perDateTo, new Date(perItem.maxDateTo)))
      let perDayCountProp
      if (isProportional) {
        if (isOnDatePeriod) {
          perDayCountProp = timeCostService.getProportDays({
            orgID,
            fromDate: perDateFrom,
            toDate: perDateTo,
            onDate,
            employeeNumberID: enID,
            planDays: perDayCountPlan,
            isPartYear: perItem.isPartYear
          })
        } else {
          perDayCountProp = perDayCountPlan
        }
        let allMonths = dateService.monthDiff(empVacItem.dateFrom, onDate)
        let perIsLessThen6Months = (allMonths < 6)
        if (perIsLessThen6Months) {
          perDayCountPlan = (onDate > perDateFrom) ? perDayCountProp : 0
        } else {
          if (isCurrentPeriod) {
            perDayCountPlan = perDayCountProp
          }
          isMoreThen6Months = true
        }
        hasProportionalVac = true
      } else {
        perDayCountProp = perDayCountPlan
      }
      perDayCountFact += perItem.dayCountFact
      if (currYear) {
        let factItemCurrYear = vacFactCurrYear.find(factItem => factItem.ID && factItem.ID === perItem.ID)
        if (factItemCurrYear) {
          currYearDaysFact += factItemCurrYear.dayCountFact
        }
      }
      perDayCountComp += perItem.dayComp
      resItem.daysPlan += perDayCountPlan
      resItem.daysPlanNoCheck += perDayCountPlanNoCheck
      resItem.daysFact += perDayCountFact
      resItem.daysComp += perDayCountComp
      if (isBeforeOnDatePeriod) {
        resItem.daysPlanOnDate += perDayCountProp
        let daysFactAndComp = resItem.daysFact + resItem.daysComp
        resItem.daysDiffOnDate = resItem.daysPlanOnDate > daysFactAndComp ? resItem.daysPlanOnDate - daysFactAndComp : 0
      }
      if (isCurrentPeriod) {
        currentPeriodDaysPlan += perDayCountPlanNoCheck
        currentPeriodDaysFact += perDayCountFact
        currentPeriodDaysComp += perDayCountComp
      }
      let perPartDays = perDayCountPlanNoCheck - (perDayCountFact + perDayCountComp) - (!perItem.isMainPart ? yearVacMainPart : 0)
      partPlanDays += perPartDays > 0 ? perPartDays : 0
      if (getPeriods) {
        let perDateDiff = perDayCountPlanNoCheck > perDayCountFact + perDayCountComp ? perDayCountPlanNoCheck - perDayCountFact - perDayCountComp : 0
        addInfo.periods.push({ dictVacationKindID: perItem.dictVacationKindID, dateFrom: perDateFrom, dateTo: perDateTo, daysDiff: perDateDiff })
      }
    })
    let daysFactComp = resItem.daysFact + resItem.daysComp
    resItem.daysDiff = resItem.daysPlan > daysFactComp ? resItem.daysPlan - daysFactComp : 0
    resItem.daysDiffNoCheck = resItem.daysPlanNoCheck > daysFactComp ? resItem.daysPlanNoCheck - daysFactComp : 0
    let currentPeriodDaysFactComp = currentPeriodDaysFact + currentPeriodDaysComp
    currPeriodDaysDiff += currentPeriodDaysPlan > currentPeriodDaysFactComp ? currentPeriodDaysPlan - currentPeriodDaysFactComp : 0
    totalDaysDiff += resItem.daysDiff
    totalDaysDiffNoCheck += resItem.daysDiffNoCheck
    res.push(resItem)
  })
  if (currYear) {
    let factItemsWoPer = vacFactCurrYear.filter(factItem => !factItem.ID)
    if (factItemsWoPer.length > 0) {
      factItemsWoPer.forEach(fItem => {
        currYearDaysFact += fItem.dayCountFact
      })
    }
  }
  if (addInfo) {
    if (!hasProportionalVac) {
      let empPosDateFrom = getDefaultDateFrom(employeeNumberID)
      if (empPosDateFrom) {
        let months = dateService.monthDiff(empPosDateFrom, onDate)
        addInfo.isLessThen6Months = months < 6
      } else {
        addInfo.isLessThen6Months = true
      }
    } else {
      addInfo.isLessThen6Months = !isMoreThen6Months
    }
    addInfo.totalDaysDiff = totalDaysDiff
    addInfo.totalDaysDiffNoCheck = totalDaysDiffNoCheck
    if (currPeriodID || upToDate) {
      addInfo.currentPeriodDaysDiff = currPeriodDaysDiff
    }
    if (currYear) {
      addInfo.currYearDaysFact = currYearDaysFact
    }
    addInfo.partPlanDays = partPlanDays
  }
  return res
}

/**
 * Отримати дані для відпустки для прямого виклику (не з контролу)
 * @param {number} orgID організація
 * @param {number} employeeNumberID працівник
 * @param {number} dictVacationKindID вид відпустки
 * @param {Date} onDate на дату
 * @param {Date} dateTo дата закінчення обчислення факту днів відпустки
 * @param {Boolean} isGrouped групувати по виду відпустки
 * @return {Array}
 */
me.getData = function ({ orgID, employeeNumberID, dictVacationKindID, onDate, dateTo, isGrouped, employeeID, noCheckProportional, noCheckFuturePeriods }) {
  onDate = (onDate && new Date(onDate)) || dateService.currentDate()
  if (isGrouped === undefined) {
    isGrouped = true
  }
  const upToDate = onDate
  let res = []
  let empVac
  let empOrgID
  if (!orgID && employeeNumberID) {
    empOrgID = UB.Repository('hr_employeeNumberS').attrs('orgID').where('ID', '=', employeeNumberID).selectScalar()
  }
  const fixMonth = orgID || empOrgID ? (settingsService.get('hrVacFixMonth', orgID || empOrgID) || 0) : 0
  if (isGrouped) {
    empVac = UB.Repository('hr_empVacationPeriod')
      .attrs(['empVacationPlanID', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.dictVacationKindID',
        'empVacationPlanID.dictVacationKindID.isProportional', 'empVacationPlanID.dictVacationKindID.name'])
      .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
      .whereIf(employeeNumberID, 'empVacationPlanID.employeeNumberID', '=', employeeNumberID)
      .whereIf(employeeID, 'empVacationPlanID.employeeID', '=', employeeID)
      .whereIf(orgID, 'empVacationPlanID.employeeNumberID.orgID', '=', orgID)
      .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .groupBy(['empVacationPlanID', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.dictVacationKindID',
        'empVacationPlanID.dictVacationKindID.isProportional', 'empVacationPlanID.dictVacationKindID.name'])
      .selectAsObject()
  } else {
    empVac = UB.Repository('hr_empVacationPeriod')
      .attrs(['ID', 'empVacationPlanID', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.dictVacationKindID',
        'empVacationPlanID.dictVacationKindID.isProportional', 'empVacationPlanID.dictVacationKindID.name'])
      .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
      .whereIf(employeeNumberID, 'empVacationPlanID.employeeNumberID', '=', employeeNumberID)
      .whereIf(employeeID, 'empVacationPlanID.employeeID', '=', employeeID)
      .whereIf(orgID, 'empVacationPlanID.employeeNumberID.orgID', '=', orgID)
      .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
  }
  const vacPeriod = timeCostService.getVacFactDays({ employeeNumberID, employeeID, dictVacationKindID, orgID, addFields: ['dayRecalc', 'dayReturn'], onDate, upToDate, dateTo })
  empVac.forEach(empVacItem => {
    let empVacationPlanID = empVacItem.empVacationPlanID
    let enID = empVacItem['empVacationPlanID.employeeNumberID']
    let dictVacKindID = empVacItem['empVacationPlanID.dictVacationKindID']
    let isProportional = empVacItem['empVacationPlanID.dictVacationKindID.isProportional']
    let resItem = {
      ID: empVacItem.ID,
      empVacationPlanID: empVacationPlanID,
      employeeNumberID: enID,
      dictVacationKindID: dictVacKindID,
      dictVacationKindName: empVacItem['empVacationPlanID.dictVacationKindID.name'],
      daysPlan: 0,
      daysPlanAll: 0,
      daysFact: 0,
      dayComp: 0,
      daysDiff: 0,
      dayDiffAll: 0,
      dayFix: 0,
      dayReturn: 0,
      dayRecalc: 0
    }
    let vacPeriodItems = isGrouped ? vacPeriod.filter(perItem => perItem.empVacationPlanID === empVacationPlanID)
      : vacPeriod.filter(perItem => perItem.empVacationPeriodID === empVacItem.ID)
    vacPeriodItems.forEach(perItem => {
      let perDayCountPlan = perItem.dayCountPlan
      let perDayCountFact = 0
      let perDayCountComp = 0
      let perDayCountReturn = 0
      let perDateFrom = new Date(perItem.dateFrom)
      let perDateTo = new Date(perItem.dateTo)
      let isCurrentPeriod = (upToDate && perDateFrom <= upToDate && perDateTo >= upToDate)
      let isFuturePeriod = perDateFrom > upToDate
      let isLastPeriodDate = dateService.equals(perDateTo, onDate)
      perDayCountFact += perItem.dayCountFact
      perDayCountComp += perItem.dayComp
      perDayCountReturn += perItem.dayReturn
      resItem.daysPlanAll += perDayCountPlan
      if (!isFuturePeriod || noCheckFuturePeriods) {
        if (!noCheckProportional && isCurrentPeriod && isProportional && !isLastPeriodDate /* UBHR-15708 */) {
          resItem.daysPlan += timeCostService.getProportDays({
            orgID: perItem.orgID,
            fromDate: perDateFrom,
            toDate: perDateTo,
            onDate: onDate,
            employeeNumberID: enID,
            planDays: perDayCountPlan,
            isPartYear: perItem.isPartYear
          })
        } else {
          resItem.daysPlan += perDayCountPlan
        }
      }
      resItem.daysFact += perDayCountFact
      resItem.dayComp += perDayCountComp
      resItem.dayReturn += perDayCountReturn
      resItem.dayRecalc += perItem.dayRecalc
      if (fixMonth > 0) {
        resItem.dayFix += perItem.dayFix || 0
      }
    })
    /* UBHR-10218, не показувати від'ємних днів, що залишилися */
    let daysDiff = resItem.daysPlan - (resItem.daysFact + resItem.dayFix + resItem.dayComp + (resItem.dayRecalc || 0) + (resItem.dayReturn || 0))
    resItem.daysDiff = daysDiff > 0 ? daysDiff : 0
    let daysDiffAll = resItem.daysPlanAll - (resItem.daysFact + resItem.dayFix + resItem.dayComp + (resItem.dayRecalc || 0) + (resItem.dayReturn || 0))
    resItem.daysDiffAll = daysDiffAll > 0 ? daysDiffAll : 0
    resItem.daysDiffOrig = daysDiff
    res.push(resItem)
  })
  return res
}

/**
 * Отримати дані для відпустки для виклику з клієнта
 * @param {number} orgID організація
 * @param {number} employeeNumberID працівник
 * @param {number} dictVacationKindID вид відпустки
 * @param {Date} onDate на дату
 * @param {Boolean} isGrouped групувати по виду відпустки
 * @return {Array}
 */
me.getDataReq = ctx => {
  const mParams = ctx.mParams
  const orgID = mParams.orgID
  const employeeNumberID = mParams.employeeNumberID
  const dictVacationKindID = mParams.dictVacationKindID
  const onDate = dateService.shiftDate(mParams.onDate)
  const isGrouped = mParams.isGrouped
  mParams.resultData = JSON.stringify(me.getData({ orgID, employeeNumberID, dictVacationKindID, onDate, isGrouped }))
}

/**
 * Отримати дані для відпустки, згруповані по виду відпустки, з полем "Доступно днів" (dayToUse), для прив'язки до контролу
 * @param {object} ctx
 * @param {number} ctx.mParams.orgID організація
 * @param {number} ctx.mParams.employeeNumberID працівник
 * @param {number} ctx.mParams.dictVacationKindID вид відпустки
 * @param {Date} onDate на дату
 */
me.selectData = ctx => {
  const mParams = ctx.mParams
  const orgID = mParams.orgID || selectService.getFilterValue(mParams, 'orgID')
  const employeeNumberID = mParams.employeeNumberID || selectService.getFilterValue(mParams, 'employeeNumberID')
  const employeeID = mParams.employeeID || selectService.getFilterValue(mParams, 'employeeID')
  const dictVacationKindID = mParams.dictVacationKindID || selectService.getFilterValue(mParams, 'dictVacationKindID')
  let onDate = (mParams.customParams && mParams.customParams.onDate) || mParams.onDate
  onDate = dateService.shiftDate(onDate)
  const noCheckProportional = mParams.customParams && mParams.customParams.noCheckProportional
  const noCheckFuturePeriods = mParams.customParams && mParams.customParams.noCheckFuturePeriods

  const calcData = me.getData({ orgID, employeeNumberID, dictVacationKindID, onDate, isGrouped: true, employeeID, noCheckProportional, noCheckFuturePeriods })

  let data = UB.Repository('hr_empVacationPlan').attrs(mParams.fieldList)
  mParams.whereList && Object.keys(mParams.whereList).forEach(key => {
    let valueObj = mParams.whereList[key]
    let values = valueObj.values
    let value
    if (typeof values === 'object') {
      let valueKey = Object.keys(values)[0]
      value = valueKey && values[valueKey]
    } else {
      value = valueObj.value
    }
    data = data.where(valueObj.expression, valueObj.condition, value)
  })
  Object.keys(mParams.orderList).forEach(key => {
    let valueObj = mParams.orderList[key]
    data = data.orderBy(valueObj.expression, valueObj.order)
  })
  data = data.selectAsObject()

  let resData = []
  data.forEach(item => {
    let resItem = _.clone(item)
    let calcItem = calcData.find(itm => itm.empVacationPlanID === item.ID)
    if (calcItem) {
      resItem.dayDiff = calcItem.daysDiffAll
      resItem.dayToUse = calcItem.daysDiff
      resItem.dayComp = calcItem.dayComp
      resItem.dayReturn = calcItem.dayReturn
    } else {
      resItem.dayToUse = 0
    }
    resData.push(resItem)
  })

  storeService.initArrayToStore(ctx.dataStore, resData, mParams)
  ctx.inherited = false
  return true
}

/** Доступні працівнику дні відпустки в вигляді sql для списків
 Результат використовується для значення поля в об'єкті aliases:
 aliases: {
   dayRest: { field: global['hr_empVacationPlan'].getAvailableVacationDaysSql({dictVacationKindID: mParams.dictVacationKindID,
     onDate: mParams.onDate, employeeNumberAlias: 'en.ID', orgID: mParams.orgID}) }
 * @param {number} dictVacationKindID вид відпустки
 * @param {Date} onDate на дату
 * @param {string} employeeNumberAlias аліас таблиці hr_employeeNumber
 * @param {number} orgID організація - список
 * @param {bool} checkPlanProportion перевіряти пропорційність плану (true - для поля "Залишилося днів", false - для поля "Доступно днів")
 * @return {string}
 */
me.getAvailableVacationDaysSql = function ({ dictVacationKindID, onDate, employeeNumberAlias, orgID, checkPlanProportion = true, showOverUsedVac = false }) {
  const isMsSql = entityBaseService.isMsSql()
  let onDateStr = isMsSql ? dateService.getMsSqlDateString(onDate) : dateService.getPgSqlDateString(onDate)
  let dayCountPlanExpr
  let fieldAlias
  const dayDiffExpr = '(vp.dayFact + vp.dayCountFactCorr + vp.dayComp)'
  if (checkPlanProportion) {
    let dayFromDiff = isMsSql ? `DATEDIFF(DAY, vp.dateFrom, ${onDateStr})` : `DATE_PART('day', ${onDateStr} - vp.dateFrom)`
    dayCountPlanExpr = `CASE
      WHEN vp.isProportional = 1 and ${onDateStr} between vp.dateFrom and vp.dateTo and (vp.monthCount is null or (vp.monthCount < 12))
        THEN COALESCE(ROUND((vp.dayCountPlan * 1.0 / COALESCE(vp.monthCount, 12)) * ((${dayFromDiff} + 1) / 30.44)${isMsSql ? ', 0' : ''}), 0)
      ELSE vp.dayCountPlan END`
    fieldAlias = 'dayToUse'
  } else {
    dayCountPlanExpr = `vp.dayCountPlan`
    fieldAlias = 'dayRest'
  }
  let fieldExpression = !showOverUsedVac
    ? `SUM(CASE WHEN vp.dayCountPlan <= 0 THEN 0
      WHEN ${dayCountPlanExpr} > ${dayDiffExpr}
        THEN ${dayCountPlanExpr} - ${dayDiffExpr}
      ELSE 0 END) as ${fieldAlias}`
    : `SUM(CASE WHEN vp.dayCountPlan <= 0 THEN 0
      ELSE ${dayCountPlanExpr} - ${dayDiffExpr} END) as ${fieldAlias}`
  let sql = `(SELECT
      ${fieldExpression}
    FROM 
      (SELECT pl.employeeNumberID, pl.dictVacationKindID, vk.isProportional, vp.dayCountPlan, vp.dateFrom, vp.dateTo, COALESCE(vp.dayFact, 0) as dayFact,
        COALESCE(vp.dayCountFactCorr, 0) as dayCountFactCorr, SUM(COALESCE(vc.dayComp, 0)) as dayComp, MIN(vexc.monthCount) as monthCount
      FROM  
        hr_empVacationPlan pl
        inner join hr_employeeNumber en on en.ID = pl.employeeNumberID
          and en.mi_deleteDate >= '9999-12-31'
          and en.orgID in (${orgID})
        inner join hr_empVacationPeriod vp on vp.empVacationPlanID = pl.ID
          and vp.mi_deleteDate >= '9999-12-31'
        inner join hr_dictVacationKind vk on vk.ID = pl.dictVacationKindID
        left join
          (select vc.empVacationPeriodID, SUM(vc.dayComp) as dayComp
          from hr_empVacationComp vc
            inner join hr_empVacationPeriod cp on cp.ID = vc.empVacationPeriodID
            inner join hr_empVacationPlan cpl on cpl.ID = cp.empVacationPlanID
            inner join hr_employeeNumber en on en.ID = cpl.employeeNumberID
              and en.orgID in (${orgID})
          group by vc.empVacationPeriodID) vc
          on vc.empVacationPeriodID = vp.ID
        left join 
          (select ep.organizationID, ep.employeeNumberID, COALESCE(MIN(vexc.monthCount), MIN(vexc2.monthCount)) as monthCount
          from hr_employeePosition ep
            left join hr_dictVacCompException vexc on vexc.orgID = ep.organizationID
              and vexc.dictStaffCatID = ep.dictStaffCatID
              and COALESCE(vexc.dateFrom, '2000-01-01') <= ${onDateStr}
              and COALESCE(vexc.dateTo, '9999-12-31') >= ${onDateStr}
              and vexc.mi_deleteDate = '9999-12-31'
            left join hr_dictVacCompException vexc2 on vexc2.orgID is null
              and vexc2.dictStaffCatID = ep.dictStaffCatID
              and COALESCE(vexc2.dateFrom, '2000-01-01') <= ${onDateStr}
              and COALESCE(vexc2.dateTo, '9999-12-31') >= ${onDateStr}
              and vexc2.mi_deleteDate = '9999-12-31'  
          where  
            ep.organizationID in (${orgID})
            and ep.isActive = 1
            and ep.dateFrom <= ${onDateStr}
            and ep.dateTo >= ${onDateStr}
            and ep.mi_deleteDate = '9999-12-31'
          group by ep.organizationID, ep.employeeNumberID) vexc
          on vexc.organizationID = en.orgID
            and vexc.employeeNumberID = en.ID
      WHERE
        pl.mi_deleteDate >= '9999-12-31'
        ${dictVacationKindID ? `and pl.dictVacationKindID in (${dictVacationKindID})` : ``}
        and vp.dateFrom <= ${onDateStr}
      GROUP BY pl.employeeNumberID, pl.dictVacationKindID, vk.isProportional, vp.dayCountPlan, vp.dateFrom, vp.dateTo, vp.dayFact, vp.dayCountFactCorr
      ) vp
    WHERE
      vp.employeeNumberID = ${employeeNumberAlias}  
    )
    `
  return sql
}

/** Пропорційне розбиття днів відпустки за рік на період dateFrom/dateTo
 * @param {object} ctx
 * @param {Date} ctx.mParams.dateFrom дата з
 * @param {Date} ctx.mParams.dateTo дата по
 * @param {number} ctx.mParams.planDays планові дні
 * @return {number}
 */
me.getVacPeriodDays = function (ctx) {
  const mParams = ctx.mParams
  mParams.result = timeCostService.getPeriodDays(mParams.dateFrom, mParams.dateTo, mParams.planDays)
}

/** Визначається, чи використана основна частина відпустки
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeNumberID працівник
 * @param {Date} ctx.mParams.dateFrom дата з
 * @param {Date} ctx.mParams.dateTo дата по
 * @return {Boolean} ctx.mParams.result
 */
me.getMainPartIsUsed = function (ctx) {
  const mParams = ctx.mParams
  const dateFrom = mParams.dateTo && dateService.shiftDate(mParams.dateFrom)
  mParams.result = false
  let employeeNumberID = mParams.employeeNumberID
  if (employeeNumberID) {
    let currPeriodID = mParams.currPeriodID
    let periodData = UB.Repository('hr_empVacationPeriod')
      .attrs(['isMainPart', 'isBackOrder'])
      .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
      .where('empVacationPlanID.dictVacationKindID.code', 'like', 'dYear%')
      .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(dateFrom && !currPeriodID, 'dateFrom', '<=', dateFrom)
      .whereIf(currPeriodID, 'ID', '=', currPeriodID)
      .orderByDesc('dateFrom')
      .limit(1)
      .selectSingle()
    mParams.result = !!(periodData && periodData.isMainPart)
    mParams.isBackOrder = !!(periodData && periodData.isBackOrder)
  }
}

/** Автоматичне додавання планової відпустки по працівнику
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.employeeNumberID ID запису з табельним номером працівника
 * @param {string} ctx.mParams.positionType Тип посади
 * @param {Date} ctx.mParams.onDate на дату
 */
me.addDefaultVacationPlan = function (ctx) {
  const mParams = ctx.mParams
  let employeeID = mParams.employeeID
  let employeeNumberID = mParams.employeeNumberID
  let positionType = mParams.positionType
  let dictGovernmTypeID = mParams.dictGovernmTypeID
  let dictStaffCatID = mParams.dictStaffCatID
  let dictStaffSubCatID = mParams.dictStaffSubCatID
  let dictPositionID = mParams.dictPositionID
  let onDate = dateService.shiftDate(mParams.onDate)
  const vacPlanStore = UB.DataStore(__entityName)
  const planData = []

  const dictPosVacation = dictPositionID ? UB.Repository('hr_dictPosVacationPlan')
    .attrs(['dictVacationKindID', 'dictVacationKindID.name', 'dictVacationKindID.code', 'dictVacationKindID.vactAccum', 'dayCount'])
    .where('dictPositionID', '=', dictPositionID)
    .where('dictVacationKindID.mi_deleteDate', '=', '#maxdate')
    .selectAsObject() : []

  if (dictPosVacation.length) {
    dictPosVacation.forEach(item => {
      if (!planData.find(o => o.dictVacationKindID === item.dictVacationKindID)) {
        planData.push(item)
      }
    })
  } else {
    const planVacations = UB.Repository('hr_dictVacationPlanDay')
      .attrs(['dictVacationKindID', 'dictVacationKindID.mi_deleteDate', 'dictVacationKindID.name'])
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .groupBy(['dictVacationKindID', 'dictVacationKindID.mi_deleteDate', 'dictVacationKindID.name'])
      .orderBy('dictVacationKindID')
      .selectAsObject()

    planVacations.forEach(plan => {
      /* UBHR-14443 */
      if (!dateService.isMaxDate(plan['dictVacationKindID.mi_deleteDate'])) {
        throw new UB.UBAbort(`<<<${UB.i18n('Невірно налаштовано довідник "Дні відпустки за видами відпустки та типами посад" для типу посади "{0}". Скоригуйте дані',
          plan['dictVacationKindID.name'])}>>>`)
      }
      let vacPlanDays = UB.Repository('hr_dictVacationPlanDay')
        .attrs(['dictVacationKindID', 'dictVacationKindID.name', 'dictVacationKindID.code', 'dictVacationKindID.vactAccum',
          'MAX([dayCount])', 'positionType', 'dictGovernmTypeID', 'dictStaffCatID', 'dictStaffSubCatID'])
        .where('dictVacationKindID', '=', plan.dictVacationKindID)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .groupBy(['dictVacationKindID', 'dictVacationKindID.name', 'dictVacationKindID.code', 'dictVacationKindID.vactAccum',
          'positionType', 'dictGovernmTypeID', 'dictStaffCatID', 'dictStaffSubCatID'])
        .orderBy('dictVacationKindID')
        .selectAsObject({
          'MAX([dayCount])': 'dayCount'
        })
      if (vacPlanDays.length) {
        let vacPlanDayReco
        if (positionType) {
          vacPlanDayReco = vacPlanDays.find(item => item.positionType === positionType)
          if (!vacPlanDayReco) {
            vacPlanDays = vacPlanDays.filter(item => !item.positionType)
            vacPlanDayReco = vacPlanDays.find(item => !item.positionType)
          } else {
            vacPlanDays = vacPlanDays.filter(item => item.positionType === positionType)
          }
        }
        if (dictGovernmTypeID) {
          vacPlanDayReco = vacPlanDays.find(item => item.dictGovernmTypeID === dictGovernmTypeID)
          if (!vacPlanDayReco) {
            vacPlanDayReco = vacPlanDays.find(item => !item.dictGovernmTypeID)
            vacPlanDays = vacPlanDays.filter(item => !item.dictGovernmTypeID)
          } else {
            vacPlanDays = vacPlanDays.filter(item => item.dictGovernmTypeID === dictGovernmTypeID)
          }
        }
        if (dictStaffCatID) {
          vacPlanDayReco = vacPlanDays.find(item => item.dictStaffCatID === dictStaffCatID)
          if (!vacPlanDayReco) {
            vacPlanDayReco = vacPlanDays.find(item => !item.dictStaffCatID)
            vacPlanDays = vacPlanDays.filter(item => !item.dictStaffCatID)
          } else {
            vacPlanDays = vacPlanDays.filter(item => item.dictStaffCatID === dictStaffCatID)
          }
        }
        if (dictStaffSubCatID) {
          vacPlanDayReco = vacPlanDays.find(item => item.dictStaffSubCatID === dictStaffSubCatID)
          if (!vacPlanDayReco) {
            vacPlanDayReco = vacPlanDays.find(item => !item.dictStaffSubCatID)
          }
        }
        if (!vacPlanDayReco) {
          vacPlanDayReco = vacPlanDays.find(item => !item.positionType && !item.dictGovernmTypeID && !item.dictStaffCatID && !item.dictStaffSubCatID)
        }
        if (vacPlanDayReco) {
          planData.push(vacPlanDayReco)
        }
      }
    })
  }

  let empPosDateFrom = getDefaultDateFrom(employeeNumberID)
  let stateVacIsAdded = false
  let stateVacCanBeAdded = true
  let stateDayCountPlan
  if (planData.length) {
    const existVacPlan = UB.Repository(__entityName)
      .attrs('dictVacationKindID')
      .where('employeeNumberID', '=', employeeNumberID)
      .selectAsObject()
    const isVacPlan = !!existVacPlan.length
    planData.forEach(planItem => {
      let dictVacationKindID = planItem.dictVacationKindID
      let vactKindCode = planItem['dictVacationKindID.code']
      /* isDState - Додаткова оплачуєма відпустка за стаж держ служби */
      let isDState = (vactKindCode === 'dState')
      let existVacKind = isVacPlan && existVacPlan.find(item => item.dictVacationKindID === dictVacationKindID)
      if (!existVacKind) {
        let dateFrom
        if (isDState) {
          let stateDateFrom = timeCostService.getVacPlanDateFrom(employeeNumberID, employeeID, planItem.dictVacationKindID)
          if (stateDateFrom) {
            dateFrom = stateDateFrom
            stateDayCountPlan = timeCostService.getVacPlanDays({
              employeeID,
              employeeNumberID,
              periodDateFrom: stateDateFrom,
              dictVacationKindID
            })
          } else {
            stateVacCanBeAdded = false
          }
        } else {
          let vactAccum = planItem['dictVacationKindID.vactAccum']
          dateFrom = ['2', '4'].includes(vactAccum) ? empPosDateFrom : (vactAccum === '3' ? dateService.firstDayOfYear(empPosDateFrom) : undefined)
        }
        if (dateFrom) {
          let dayCount
          if (isDState) {
            if (stateDayCountPlan) {
              dayCount = stateDayCountPlan
            }
            stateVacIsAdded = true
          } else {
            dayCount = planItem.dayCount
          }
          vacPlanStore.run('insert', {
            execParams: {
              employeeID: employeeID,
              employeeNumberID: employeeNumberID,
              dictVacationKindID: dictVacationKindID,
              dateFrom: dateFrom,
              dayCount: dayCount || 0,
              description: `${planItem['dictVacationKindID.name']} = ${dayCount}`
            }
          })
        }
      } else {
        if (isDState) {
          stateVacIsAdded = true
        }
      }
    })
  } else {
    const posTypeName = UB.Repository('ubm_enum')
      .attrs(['name'])
      .where('eGroup', '=', 'HR_POSITION_TYPE')
      .where('code', '=', positionType)
      .selectScalar()
    mParams.msg = UB.i18n(`Для типу посади "{0}" не вказано видів відпусток, які автоматично встановлюються`, posTypeName)
  }
  if (!stateVacIsAdded && stateVacCanBeAdded) {
    /* Додаткову оплачуєму відпустку за стаж держ служби - не заведено в hr_dictVacationPlanDay, то додаємо все одно */
    const stateVacKind = UB.Repository('hr_dictVacationKind')
      .attrs(['ID', 'name'])
      .where('code', '=', 'dState')
      .selectSingle()
    if (stateVacKind) {
      stateDayCountPlan = timeCostService.getVacPlanDays({
        employeeID,
        employeeNumberID,
        periodDateFrom: empPosDateFrom,
        dictVacationKindID: stateVacKind.ID
      })
    }
    if (stateDayCountPlan) {
      vacPlanStore.run('insert', {
        execParams: {
          employeeID: employeeID,
          employeeNumberID: employeeNumberID,
          dictVacationKindID: stateVacKind.ID,
          dateFrom: empPosDateFrom,
          dayCount: stateDayCountPlan,
          description: `${stateVacKind.name} = ${stateDayCountPlan}`
        }
      })
    }
  }
  vacPlanStore.freeNative()
}

/** Отримати кількість планових днів відпустки за період
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.employeeNumberID ID запису з табельним номером працівника
 * @param {Date} ctx.mParams.periodDateFrom дата з
 * @param {Date} ctx.mParams.periodDateTo дата по
 * @param {number} ctx.mParams.dictVacationKindID вид відпустки
 * @param {number} ctx.mParams.defaultValue значення за замовченням
 * @return {number} ctx.mParams.result
 */
me.getVacPlanDays = function (ctx) {
  const mParams = ctx.mParams
  const periodDateFrom = dateService.shiftDate(mParams.periodDateFrom)
  const periodDateTo = mParams.periodDateTo && dateService.shiftDate(mParams.periodDateTo)
  const planDateTo = mParams.planDateTo && dateService.shiftDate(mParams.planDateTo)
  let dayCountPlan = timeCostService.getVacPlanDays({
    employeeID: mParams.employeeID,
    employeeNumberID: mParams.employeeNumberID,
    periodDateFrom: periodDateFrom,
    periodDateTo: periodDateTo,
    planDateTo: planDateTo,
    dictVacationKindID: mParams.dictVacationKindID,
    defaultValue: mParams.defaultValue
  })
  if (!isNaN(dayCountPlan) && dayCountPlan !== undefined) {
    mParams.result = dayCountPlan
  } else {
    mParams.result = false
  }
  if (mParams.checkLongTerm) {
    if (checkLongTermForState(mParams.employeeNumberID, periodDateFrom)) {
      const newDates = getNewDatesStateVac(mParams.employeeID, mParams.employeeNumberID, periodDateFrom)
      if (newDates) {
        if (!newDates.error) {
          mParams.newDateFrom = newDates.dateFrom
          mParams.newDateTo = newDates.dateTo
        } else {
          mParams.hasError = true
          mParams.canAdd = false
        }
      }
    }
  }
  return true
}

/** Додавання нових періодів відпустки по шедулєру
 * @param {object} ctx
 */
me.autoAddPeriods = function (ctx) {
  const currentDate = dateService.currentTruncDate()
  const orgs = UB.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: currentDate })
    .selectAsObject()
  const mParams = ctx ? ctx.mParams : { execParams: {} }
  const execParams = mParams.execParams || {}
  const actionDate = execParams.actionDate ? dateService.shiftDate(execParams.actionDate) : null
  orgs.forEach(org => {
    autoAddPeriods4Org(org.mi_data_id, actionDate)
  })
}

/** Отримати кількість використаних по факту днів відпустки за період
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeNumberID ID запису з табельним номером працівника
 * @param {number} ctx.mParams.dictVacationKindID вид відпустки
 * @param {Date} ctx.mParams.dateFrom дата з
 * @param {Date} ctx.mParams.dateTo дата по
 * @param {Boolean} ctx.mParams.isForYear визначати за рік
 * @return {object} ctx.mParams.result { yearFactDays - кількість використаних днів, yearMaxDays - макс. можлива кількісь днів на рік }
 */
me.getVacFactDays = function (ctx) {
  const mParams = ctx.mParams
  const dateFrom = dateService.shiftDate(mParams.dateFrom)
  const dateTo = dateService.shiftDate(mParams.dateTo)
  let yearFactDays = timService.getPeriodVacDays(mParams.employeeNumberID, mParams.dictVacationKindID, dateFrom, dateTo,
    mParams.isForYear)
  mParams.result = {
    yearFactDays: yearFactDays,
    yearMaxDays: timService.CONSTANTS.yearVacMaxDays
  }
}

/** Отримати дату початку дії права на відпустку
 * @param {object} ctx
 * @param {number} ctx.mParams.employeeNumberID ID запису з табю номером
 * @param {number} ctx.mParams.employeeID працівник
 * @param {number} ctx.mParams.dictVacationKindID вид відпустки
 * @return {date} ctx.mParams.result
 */
me.getVacPlanDateFrom = function (ctx) {
  const mParams = ctx.mParams
  mParams.result = timeCostService.getVacPlanDateFrom(mParams.employeeNumberID, mParams.employeeID, mParams.dictVacationKindID)
}

/* Перевірка, щоб не існувало вказаного виду відпустки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.ID запис виду відпустки
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @param {number} ctx.mParams.execParams.dictVacationKindID вид відпустки
 * @param {date} ctx.mParams.execParams.dateFrom дата початку періоду відпустки
 * @param {date} ctx.mParams.execParams.dateTo дата закінчення періоду відпустки
 * @return {string} текст помилки
 */
me.checkVacKindExists = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const ID = execParams.ID || 0
  const employeeNumberID = execParams.employeeNumberID
  const dictVacationKindID = execParams.dictVacationKindID
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  let msg
  if (employeeNumberID && dictVacationKindID && dateService.isValid(dateFrom)) {
    const dateTo = dateService.shiftDate(execParams.dateTo) || dateService.maxDate()
    const checkData = UB.Repository(__entityName)
      .attrs(['dateFrom', 'dateTo', 'dictVacationKindID.name'])
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('ID', '!=', ID)
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dictVacationKindID', '=', dictVacationKindID)
      .orderBy('dateFrom', 'asc')
      .selectAsObject()
    if (checkData.length) {
      let msgArray = []
      checkData.forEach(item => {
        let dateToStr = dateService.isMaxDate(item.dateTo) ? '' : UB.i18n(` по {0}`, dateService.formatDate(item.dateTo))
        msgArray.push(UB.i18n(`з {0}{1}`, dateService.formatDate(item.dateFrom), dateToStr))
      })
      let dictVacationKindName = checkData[0]['dictVacationKindID.name']
      msg = UB.i18n(`Вже існує запис для виду відпустки "{0}": {1}`, dictVacationKindName, msgArray.join(', '))
    }

    if (!msg) {
      let periodDateTo = dateService.addDays(dateService.addYears(dateFrom, 1), -1)
      if (dateTo < periodDateTo) {
        periodDateTo = dateTo
      }
      const checkPeriodData = UB.Repository('hr_empVacationPeriod')
        .attrs(['dateFrom', 'dateTo', 'empVacationPlanID.dictVacationKindID.name'])
        .where('dateFrom', '<=', periodDateTo)
        .where('dateTo', '>=', dateFrom)
        .where('empVacationPlanID', '!=', ID)
        .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
        .where('empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
        .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
        .orderBy('dateFrom', 'asc')
        .selectAsObject({
          'empVacationPlanID.dictVacationKindID.name': 'vacKindName'
        })
      if (checkPeriodData.length > 0) {
        msg = UB.i18n(`Вже існує запис для виду відпустки "{0}" за період з діапазоном дат, який перетинається з внесеним`, checkPeriodData[0].vacKindName)
      }
    }
  }
  mParams.msg = msg || ''
  return true
}

/* Згенерувати новий ID з клієнта
 * @return {ID}
 */
me.getNewID = ctx => {
  const mParams = ctx.mParams
  mParams.newID = UB.DataStore(__entityName).generateID()
}

me.updateVacationTimeSheet = () => {
  const empVacOrder = UB.Repository('hr_empOrder')
    .attrs('ID', 'empOrderType')
    .where('empOrderType', 'in', ['VACATION', 'VACATION_G', 'VACATIONPROLONG', 'VACATIONPROLONGL', 'VACATIONUNPAID', 'VACATIONKID', 'VACATIONLONG', 'VACATIONLONG_G'])
    .where('orderState', 'in', ['POSTED', 'PROCESSED'])
    .selectAsObject()
  const wrongTimeSheet = []
  empVacOrder.forEach(order => {
    const vacList = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['dateFrom', 'dateTo', 'employeeNumberID', 'dictVacationKindID.payElID.dictTimeCostID'])
      .where('orderID', '=', order.ID)
      .selectAsObject({
        'dictVacationKindID.payElID.dictTimeCostID': 'dictTimeCostID'
      })
    vacList.forEach(vac => {
      const dictTimeCostID = vac['dictTimeCostID']
      if (dictTimeCostID) {
        const vacTimeSheet = UB.Repository('tim_timeSheet')
          .attrs(['ID', 'dateWork', 'factTimeCostID.nameSmall'])
          .where('orderID', '=', order.ID)
          .where('factTimeCostID', '!=', dictTimeCostID)
          .where('employeeNumberID', '=', vac.employeeNumberID)
          .where('dateWork', '>=', dateService.shiftDate(vac.dateFrom))
          .where('dateWork', '<=', dateService.shiftDate(vac.dateTo))
          .selectAsObject()
        vacTimeSheet.forEach(ts => {
          wrongTimeSheet.push({
            ID: ts.ID,
            factTimeCostID: dictTimeCostID
          })
        })
      }
    })
  })
  const timeSheetStore = UB.DataStore('tim_timeSheet')
  wrongTimeSheet.forEach(item => {
    timeSheetStore.run('update', {
      __skipOptimisticLock: true,
      __skipSelectAfterUpdate: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: item
    })
  })
}

me.recalcPlanDays = ({ employeeNumberID, dismDate, saved }) => {
  const empVacationPlan = UB.Repository('hr_empVacationPlan')
    .attrs(['ID'])
    .where('employeeNumberID', '=', employeeNumberID)
    .selectAsObject()
  if (empVacationPlan.length) {
    empVacationPlan.forEach(empPlan => {
      let empVacationPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayFact', 'empVacationPlanID.dayCount'])
        .where('empVacationPlanID', '=', empPlan.ID)
        .where('dateTo', '>=', dismDate)
        .orderBy('dateFrom')
        .selectAsObject()
      if (empVacationPeriod.length) {
        let isEnded = false
        empVacationPeriod.forEach(empPeriod => {
          if (!isEnded) {
            let empPeriodDateFrom = new Date(empPeriod.dateFrom)
            let paraDateFrom = new Date(dismDate)
            if (empPeriodDateFrom <= paraDateFrom) {
              let periodDays = timeCostService.getPeriodDays(empPeriodDateFrom, paraDateFrom, empPeriod['empVacationPlanID.dayCount'])
              orderService.updateByOrder({
                store: 'hr_empVacationPeriod',
                params: {
                  ID: empPeriod.ID,
                  dateTo: paraDateFrom,
                  dayCountPlan: periodDays
                },
                saved: saved,
                oldValues: {
                  dateTo: empPeriod.dateTo,
                  dayCountPlan: empPeriod.dayCountPlan
                }
              })
            } else {
              isEnded = true
            }
          }
          if (isEnded && empPeriod.dayFact === 0) {
            orderService.deleteByOrder({
              store: 'hr_empVacationPeriod',
              params: {
                ID: empPeriod.ID
              },
              saved: saved
            })
          }
          isEnded = true
        })
      }
    })
  }
}

/** Доступні працівнику дні відпустки в вигляді sql для списків
 Результат використовується для значення поля в об'єкті aliases:
 * @param {number} dictVacationKindID вид відпустки
 * @param {Date} onDate на дату
 * @param {number} orgID організація - список
 * @param {bool} showDetails відобрадати періоди відпусток, чи виводити тільки сгруповані дні
 * @param {bool} showOverUsedVac Показувати надлишково використані відпустки
 * @param {bool} showFixDays
 * @return {string}
 */
me.getVacationInfoSql = function ({ dictVacationKindID, onDate, orgID, showDetails = false, showOverUsedVac = false, showFixDays = false }) {
  const isMsSql = entityBaseService.isMsSql()
  let onDateStr = isMsSql ? dateService.getMsSqlDateString(onDate) : dateService.getPgSqlDateString(onDate)
  let dayCountPlanExpr
  const dayDiffExpr = `(vp.dayFact + ${showFixDays ? 'vp.dayFix +' : ''} vp.dayCountFactCorr + vp.dayComp)`
  const dayFromDiff = isMsSql ? `DATEDIFF(DAY, vp.dateFrom, ${onDateStr})` : `DATE_PART('day', ${onDateStr} - vp.dateFrom)`
  const monthFromDiff = isMsSql ? `DATEDIFF(MONTH, vp.dateFrom, ${onDateStr})` : `DATE_PART('month', ${onDateStr} - vp.dateFrom)`

  function getFieldExpression (dayCountPlanExpr, fieldAlias) {
    const sumBegin = showDetails ? '' : 'SUM('
    const sumEnd = showDetails ? '' : ')'

    return !showOverUsedVac
      ? `${sumBegin}CASE WHEN vp.dayCountPlan <= 0 THEN 0  
                WHEN ${dayCountPlanExpr} > ${dayDiffExpr} THEN ${dayCountPlanExpr} - ${dayDiffExpr}
                ELSE 0 END${sumEnd} as ${fieldAlias} `
      : `${sumBegin}CASE WHEN vp.dayCountPlan <= 0 THEN 0
         ELSE ${dayCountPlanExpr} - ${dayDiffExpr} END${sumEnd} as ${fieldAlias} `
  }

  let fieldList = []
  dayCountPlanExpr = `CASE
      WHEN vp.isProportional = 1 and ${onDateStr} between vp.dateFrom and vp.dateTo and (vp.monthCount is null or (vp.monthCount > ${monthFromDiff}))
        THEN COALESCE(ROUND((vp.dayCountPlan * 1.0 / COALESCE(vp.monthCount, 12)) * ((${dayFromDiff} + 1) / 30.44)${isMsSql ? ', 0' : ''}), 0)
      ELSE vp.dayCountPlan END`
  fieldList.push(getFieldExpression(dayCountPlanExpr, 'dayToUse'))

  dayCountPlanExpr = `vp.dayCountPlan`
  fieldList.push(getFieldExpression(dayCountPlanExpr, 'dayRest'))
  fieldList.push(`${showDetails ? '' : 'SUM('}vp.dayFix${showDetails ? '' : ')'} as dayFix `)

  if (showDetails) {
    let period = `concat(CASE when vp.dateFrom is not null then ${isMsSql ? 'convert(char(10), vp.dateFrom, 104)' : "to_char(vp.dateFrom, 'DD.MM.YYYY')"} ELSE '' END, ` +
      ` CASE when vp.dateFrom is not null and dateTo is not null then ' - ' ELSE '' END, ` +
      ` CASE when vp.dateTo is not null then ${isMsSql ? 'convert(char(10), vp.dateTo, 104)' : "to_char(vp.dateTo, 'DD.MM.YYYY')"} ELSE '' END) `
    fieldList.push(`${period} as periodValue `)
    fieldList.push(`vp.dateFrom as vpDateFrom `)
    fieldList.push(`vp.dateTo as vpdateTo `)
    fieldList.push(`vp.dayCountPlan as dayCountPlan `)
  }
  let sql = `(SELECT vp.employeeNumberID, ${fieldList.join(', ')}
    FROM 
      (SELECT pl.employeeNumberID, pl.dictVacationKindID, vk.isProportional, vp.dayCountPlan, vp.dateFrom, vp.dateTo, COALESCE(vp.dayFact, 0) as dayFact,
        COALESCE(vp.dayCountFactCorr, 0) as dayCountFactCorr, SUM(COALESCE(vc.dayComp, 0)) as dayComp, MIN(vexc.monthCount) as monthCount,
        COALESCE(vp.dayFix, 0) as dayFix
      FROM  
        hr_empVacationPlan pl
        inner join hr_employeeNumber en on en.ID = pl.employeeNumberID
          and en.mi_deleteDate >= '9999-12-31'
          and en.orgID in (${orgID})
        inner join hr_empVacationPeriod vp on vp.empVacationPlanID = pl.ID
          and vp.mi_deleteDate >= '9999-12-31'
        inner join hr_dictVacationKind vk on vk.ID = pl.dictVacationKindID
        left join
          (select vc.empVacationPeriodID, SUM(vc.dayComp) as dayComp
          from hr_empVacationComp vc
            inner join hr_empVacationPeriod cp on cp.ID = vc.empVacationPeriodID
            inner join hr_empVacationPlan cpl on cpl.ID = cp.empVacationPlanID
            inner join hr_employeeNumber en on en.ID = cpl.employeeNumberID
              and en.orgID in (${orgID})
          group by vc.empVacationPeriodID) vc
          on vc.empVacationPeriodID = vp.ID
        left join 
          (select ep.organizationID, ep.employeeNumberID, COALESCE(MIN(vexc.monthCount), MIN(vexc2.monthCount)) as monthCount
          from hr_employeePosition ep
            left join hr_dictVacCompException vexc on vexc.orgID = ep.organizationID
              and vexc.dictStaffCatID = ep.dictStaffCatID
              and COALESCE(vexc.dateFrom, '2000-01-01') <= ${onDateStr}
              and COALESCE(vexc.dateTo, '9999-12-31') >= ${onDateStr}
              and vexc.mi_deleteDate = '9999-12-31'
            left join hr_dictVacCompException vexc2 on vexc2.orgID is null
              and vexc2.dictStaffCatID = ep.dictStaffCatID
              and COALESCE(vexc2.dateFrom, '2000-01-01') <= ${onDateStr}
              and COALESCE(vexc2.dateTo, '9999-12-31') >= ${onDateStr}
              and vexc2.mi_deleteDate = '9999-12-31'  
          where  
            ep.organizationID in (${orgID})
            and ep.isActive = 1
            and ep.dateFrom <= ${onDateStr}
            and ep.dateTo >= ${onDateStr}
            and ep.mi_deleteDate = '9999-12-31'
          group by ep.organizationID, ep.employeeNumberID) vexc
          on vexc.organizationID = en.orgID
            and vexc.employeeNumberID = en.ID
      WHERE
        pl.mi_deleteDate >= '9999-12-31'
        ${dictVacationKindID ? `and pl.dictVacationKindID in (${dictVacationKindID})` : ``}
        and vp.dateFrom <= ${onDateStr}
      GROUP BY pl.employeeNumberID, pl.dictVacationKindID, vk.isProportional, vp.dayCountPlan, vp.dateFrom, vp.dateTo, vp.dayFact, vp.dayCountFactCorr, vp.dayFix
      ) vp
      ${showDetails ? '' : ' GROUP BY vp.employeeNumberID '}
    )
    `
  return sql
}

/**
 * Фіксація відпусток по шедулєру
**/
me.fixVacations = function () {
  const currentDate = dateService.currentTruncDate()
  const orgData = UB.Repository('ac_settingsOrg')
    .attrs(['organizationID', 'value'])
    .where('[constantID.code]', '=', 'hrVacFixMonth')
    .where('value', 'isNotNull')
    .exists(UB.Repository('hr_organization')
      .correlation('mi_data_id', 'organizationID')
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', currentDate)
      .where('mi_dateTo', '>=', currentDate)
      .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject()

  const store = UB.DataStore('hr_empVacationPeriod')
  orgData.forEach(row => {
    const fixMonth = Number(row['value'])
    if (fixMonth > 0) {
      const dateFrom = dateService.addMonths(currentDate, -1 * fixMonth)
      const periodData = UB.Repository('hr_empVacationPeriod')
        .attrs(['ID', 'empVacationPlanID.employeeNumberID', 'empVacationPlanID.employeeID', 'empVacationPlanID.dictVacationKindID',
          'dayDiff', 'dayFix'])
        .where('dateFrom', '<=', dateFrom)
        .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
        .where('empVacationPlanID.employeeNumberID.orgID', '=', row['organizationID'])
        .where('empVacationPlanID.employeeNumberID.dateTo', '>=', currentDate)
        .where('empVacationPlanID.employeeNumberID.mi_deleteDate', '>=', '#maxdate')
        .where('hasDayDiff', '=', 1)
        .selectAsObject()
      periodData.forEach(item => {
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: item.ID,
            dayFix: (item.dayFix || 0) + (item.dayDiff || 0)
          }
        })
        const ctx = {
          mParams: {
            forceCalc: true,
            execParams: {
              ID: item.ID, // період відпустки
              employeeNumberID: item['empVacationPlanID.employeeNumberID'], // таб. номер
              employeeID: item['empVacationPlanID.employeeID']
            }
          }
        }
        timeCostService.calcVacPeriods(ctx)
      })
    }
  })
}
