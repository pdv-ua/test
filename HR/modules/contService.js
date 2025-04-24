const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
module.exports = {
  initDict
}

function initDict (cont, entityList = []) {
  cont.dict = {}
  // Довідник Графіки роботи
  if (!entityList.length || entityList.includes('workSchedule')) {
    cont.dict.hr_workSchedule = UB.Repository('hr_workSchedule').attrs(['ID', 'isSummarized', 'payElID', 'isPayDayOff',
      'isPayHoliday', 'isNightHours', 'isEveningHours', 'isOvertime', 'isDayAsPlan', 'periodSummarized',
      'normScheduleID', 'planScheduleID', 'isMtCount', 'maxMtCount', 'weekHours', 'weekDays']).selectAsObject()
  }
  // Довідник Джерела фінансування
  if (!entityList.length || entityList.includes('fundSource')) {
    cont.dict.ac_fundSource = UB.Repository('ac_fundSource').attrs(['ID', 'name', 'dictFundTypeID.code']).selectAsObject()
    cont.dict.ac_dictFundSource = UB.Repository('ac_dictFundSource').attrs(['ID', 'fundSourceID', 'dictFundTypeID.code']).where('organizationID', '=', cont.orgID).selectAsObject()
    cont.dict.dictFundSourceFSSU = cont.dict.ac_fundSource.filter(o => o['dictFundTypeID.code'] === '02').map(o => o.ID)
  } else {
    cont.dict.dictFundSourceFSSU = []
  }
  // Типова проводка
  if (!entityList.length || entityList.includes('entryAcc')) {
    cont.dict.hr_entryAcc = UB.Repository('hr_entryAcc').attrs('*').selectAsObject()
    cont.dict.hr_entryAcc.forEach(row => {
      row.entryAccDt = row.entryAccDt ? JSON.parse(row.entryAccDt) : {}
    })
  }
  // Довідник Прожитковий мінімум
  if (!entityList.length || entityList.includes('dictLivingCost')) {
    cont.dict.hr_dictLivingCost = UB.Repository('hr_dictLivingCost').orderByDesc('dateFrom')
      .attrs(['ID', 'dateFrom', 'childrenUnder6', 'childrenTo18', 'workingPerson', 'nonWorkingPerson']).selectAsObject()
    cont.dict.hr_dictLivingCost.forEach(row => { row.dateFrom = dateService.shiftDate(row.dateFrom) })
  }
  // Довідник Розмір індексації
  if (!entityList.length || entityList.includes('dictIndexSalary')) {
    cont.dict.hr_dictIndexSalary = UB.Repository('hr_dictIndexSalary').orderByDesc('dateFrom')
      .attrs(['ID', 'dateFrom', 'indexValue', 'isBase']).selectAsObject()
    cont.dict.hr_dictIndexSalary.forEach(row => { row.dateFrom = dateService.shiftDate(row.dateFrom) })
  }
  // Довідник Розмір мінімальної ЗП
  if (!entityList.length || entityList.includes('dictSalaryMinSize')) {
    cont.dict.hr_dictSalaryMinSize = UB.Repository('hr_dictSalaryMinSize').orderByDesc('dateFrom').attrs('*').selectAsObject()
    cont.dict.hr_dictSalaryMinSize.forEach(row => { row.dateFrom = dateService.shiftDate(row.dateFrom) })
  }
  // Ставки ПДФО
  if (!entityList.length || entityList.includes('taxRate')) {
    cont.dict.hr_taxRate = UB.Repository('hr_taxRate').orderByDesc('yearFrom').orderByDesc('sumFrom').attrs('*').selectAsObject()
  }
  // Пільги ПДФО
  if (!entityList.length || entityList.includes('taxLimit')) {
    cont.dict.hr_taxLimit = UB.Repository('hr_taxLimit').orderByDesc('dateFrom').attrs('*').selectAsObject()
  }
  // Види доходів фізичних осіб
  if (!entityList.length || entityList.includes('dictTaxIndivid')) {
    cont.dict.hr_dictTaxIndivid = UB.Repository('hr_dictTaxIndivid').orderByDesc('dateFrom').attrs('*').selectAsObject()
  }
  // Види робіт
  // cont.dict.hr_dictWorkType = UB.Repository('hr_dictWorkType').orderByDesc('dateFrom').attrs('*').selectAsObject()
  // Базовий розмір податкової соціальної пільги
  if (!entityList.length || entityList.includes('taxLimitBase')) {
    cont.dict.hr_taxLimitBase = UB.Repository('hr_taxLimitBase').orderByDesc('yearFrom').attrs('*').selectAsObject()
  }
  // База нарахування ЄСВ
  if (!entityList.length || entityList.includes('maxBaseECB')) {
    cont.dict.hr_maxBaseECB = UB.Repository('hr_maxBaseECB').orderByDesc('dateFrom').attrs('*').selectAsObject()
    cont.dict.hr_maxBaseECB.forEach(row => { row.dateFrom = dateService.shiftDate(row.dateFrom) })
  }
  // Ставки ЄСВ
  if (!entityList.length || entityList.includes('dictRateTaxECB')) {
    cont.dict.hr_dictRateTaxECB = UB.Repository('hr_dictRateTaxECB').orderByDesc('dateFrom')
      .attrs(['ID', 'dictTypeTaxECBID', 'rate', 'dateFrom', 'dateTo']).selectAsObject()
    cont.dict.hr_dictRateTaxECB.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
  }
  // Шифр витрат
  if (!entityList.length || entityList.includes('payDim')) {
    cont.dict.hr_payDim = UB.Repository('hr_payDim').attrs(['ID', 'dimension', 'dimOrder', 'required']).orderByDesc('dimOrder').selectAsObject()
  }
  // Категорії застрахованої особи
  if (!entityList.length || entityList.includes('dictCategoryECB')) {
    cont.dict.hr_dictCategoryECB = UB.Repository('hr_dictCategoryECB').attrs(['ID', 'code', 'name', 'dictTypeTaxECBID']).selectAsObject()
  }
  // Відсотки для лікарняного (від стажу)
  if (!entityList.length || entityList.includes('dictIllnessPercent')) {
    cont.dict.hr_dictIllnessPercent = UB.Repository('hr_dictIllnessPercent').attrs(['ID', 'code', 'name', 'value', 'minMonths', 'dateFrom', 'dateTo']).orderByDesc('minMonths').selectAsObject()
  }
  // види стажів
  if (!entityList.length || entityList.includes('dictExperience')) {
    cont.dict.hr_dictExperience = UB.Repository('hr_dictExperience')
      .attrs(['ID', 'code', 'methodExpID', 'methodExpID.code', 'dateFrom', 'dateTo']).selectAsObject()
  }
  //
  if (!entityList.length || entityList.includes('dictTimeCost')) {
    cont.dict.rules = UB.Repository('hr_dictTimeCostInt')
      .attrs(['dictTimeCost1ID', 'dictTimeCost2ID', 'isElemFirst', 'isDateFirst'])
      .selectAsObject()
    cont.dict.hr_dictTimeCost = UB.Repository('hr_dictTimeCost')
      .attrs(['ID', 'code', 'name', 'nameSmall', 'nameShort', 'timeCostType'])
      .selectAsObject()
  }
  if (!entityList.length || entityList.includes('workNorm')) {
    cont.dict.trf_workNorm = UB.Repository('trf_workNorm').attrs(['ID', 'weekHours']).selectAsObject()
  }

  /* if (!entityList.length || entityList.includes('workNormDt')) {
    cont.dict.trf_workNormDt = UB.Repository('trf_workNormDt')
      .attrs(['ID', 'workNormID', 'workNormID.weekHours', 'year', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12', 'avg'])
      .where('workNormID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'workNormID.weekHours': 'weekHours'
      })
  } */
  if (!entityList.length || entityList.includes('dictVacCompException')) {
    cont.dict.hr_dictVacCompException = UB.Repository('hr_dictVacCompException')
      .attrs(['dictStaffCatID', 'dateFromNotEmpty', 'dateToNotEmpty', 'monthCount'])
      .where('orgID', '=', cont.orgID, 'orgID')
      .where('orgID', 'isNull', undefined, 'orgNull')
      .logic('([orgID] OR [orgNull])')
      .orderBy('dictStaffCatID')
      .orderByDesc('orgID')
      .orderBy('dateFromNotEmpty')
      .selectAsObject({
        'dateFromNotEmpty': 'dateFrom',
        'dateToNotEmpty': 'dateTo'
      })
    cont.dict.hr_dictRateTaxECB.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
  }

  // Операційно-трудові нормативи
  if (!entityList.length || entityList.includes('dictWorkOperation')) {
    cont.dict.hr_dictWorkOperation = UB.Repository('hr_dictWorkOperation')
      .attrs(['ID', 'payment', 'dictMeasureID', 'norm', 'rate', 'isCalcProportion', 'dateFrom', 'dateTo'])
      .selectAsObject()
    cont.dict.hr_dictWorkOperation.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    cont.dict.hr_dictWorkOperationDt = UB.Repository('hr_dictWorkOperationDt')
      .attrs(['ID', 'dictWorkOperationID', 'quantity', 'rate'])
      .orderBy('dictWorkOperationID')
      .orderBy('quantity')
      .selectAsObject()
  }

  // Нарахування за KPI
  if (!entityList.length || entityList.includes('dictKpiAccrual')) {
    cont.dict.hr_dictKpiAccrual = UB.Repository('hr_dictKpiAccrual')
      .attrs(['ID', 'dateFrom', 'dateTo', 'excludeOrg', 'excludeStaff', 'excludePosition', 'excludeDepartment', 'excludeWorkPlace', 'excludeWorkerType'])
      .selectAsObject()
    const rate = UB.Repository('hr_dictKpiAccrualRate')
      .attrs(['dictKpiAccrualID', 'KPI', 'rate', 'paySum'])
      .orderBy('dictKpiAccrualID')
      .orderBy('KPI')
      .selectAsObject()
    rate.forEach(o => {
      o.KPI = o.KPI || 0
      o.rate = o.rate || 0
    })
    const cond = UB.Repository('hr_dictKpiAccrualCond')
      .attrs(['dictKpiAccrualID', 'conditionType', 'orgID', 'dictStaffCatID', 'dictPositionID', 'departmentID', 'workPlace', 'workerType'])
      .orderBy('dictKpiAccrualID')
      .orderBy('conditionType')
      .selectAsObject()
    const payEl = UB.Repository('hr_dictKpiAccrualPayEl')
      .attrs(['dictKpiAccrualID', 'payElID'])
      .orderBy('dictKpiAccrualID')
      .orderBy('payElID')
      .selectAsObject()
    cont.dict.hr_dictKpiAccrual.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      row.rate = rate.filter(o => o.dictKpiAccrualID === row.ID).map(o => { return { KPI: o.KPI, rate: o.rate, paySum: o.paySum } })
      row.payEl = payEl.filter(o => o.dictKpiAccrualID === row.ID).map(o => o.payElID)
      row.org = cond.filter(o => o.dictKpiAccrualID === row.ID && o.conditionType === '1').map(o => o.orgID)
      row.staffCat = cond.filter(o => o.dictKpiAccrualID === row.ID && o.conditionType === '2').map(o => o.dictStaffCatID)
      row.position = cond.filter(o => o.dictKpiAccrualID === row.ID && o.conditionType === '3').map(o => o.dictPositionID)
      row.department = cond.filter(o => o.dictKpiAccrualID === row.ID && o.conditionType === '4').map(o => o.departmentID)
      row.workPlace = cond.filter(o => o.dictKpiAccrualID === row.ID && o.conditionType === '5').map(o => o.workPlace)
      row.workerType = cond.filter(o => o.dictKpiAccrualID === row.ID && o.conditionType === '6').map(o => o.workerType)
    })
  }
}
