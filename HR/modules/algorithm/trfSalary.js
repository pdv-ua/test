/**
 * Педагогічне навантаження
 */
const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')
const algorithmService = require('../algorithmService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr = {} }) => {
  const payEl = cont.payEl[params.payElID]
  const flagsFix = params.flagsFix || 0
  const mtCount = (params.flagsFix & 1 << 8)
    ? params.mtCount
    : params.weekHours
      ? (params.loadHours / params.weekHours)
      : cont.payEl[params.payElID].isMtCount
        ? (params.mtCount || 1)
        : 1
  // const year = periodSalary.dateFrom.getFullYear()
  // const workNorm = params.workNormID ? cont.dict.trf_workNormDt.find(o => o.workNormID === params.workNormID && o.year === year) : null
  // const month = periodSalary.dateFrom.getMonth()
  const planHours = params.planHours // workNorm ? workNorm['m' + (month + 1)] : params.planHours
  const planDays = params.planDays
  const days = params.days
  const hours = params.hours
  // planDays ? accrualService.round(planHours * days / planDays) : params.hours  // workNorm && planDays ? accrualService.round(planHours * days / planDays) : params.hours
  params.planHoursByDays = algorithmService.calcHoursByDays(params.planHoursByDays, planHours)
  params.hoursByDays = algorithmService.calcHoursByDays(params.hoursByDays, hours, params.mask)
  let paySum = params.paySum
  if (!(flagsFix & 1 << 1)) {
    if (cont.payEl[params.payElID].calcSumType === 'FACT' && !params.fixBaseSum) {
      paySum = accrualService.roundPayEl((params.baseSum || 0) *
        (params.rate ? (params.rate || 0) / 100 : 1), payEl.roundUpTo)
    } else {
      paySum = accrualService.roundPayEl(params.baseSum / (params.flagsRec & 1 << 5 ? planHours : planDays) *
        (params.flagsRec & 1 << 5 ? hours : days) *
        (mtCount || 1) *
        (params.rate ? (params.rate || 0) / 100 : 1),
      payEl.roundUpTo)
    }
  }

  sourceAccr.accrualDt = [{
    dictFundSourceID: params.dictFundSourceID,
    dictProgClassID: params.dictProgClassID,
    dictProjectID: params.dictProjectID,
    dictPositionID: params.dictPositionID,
    paySum
  }]

  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    flagsFix,
    mask: params.mask,
    baseSum: params.baseSum,
    paySum,
    rate: params.rate || null,
    days,
    hours,
    planHours,
    planDays,
    mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    hoursByDays: params.hoursByDays,
    planHoursByDays: params.planHoursByDays,
    leadingHoursByDays: params.leadingHoursByDays,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    dictPositionID: params.dictPositionID || null,
    calcParams: params.calcParams || null,
    workNormID: params.workNormID,
    loadHours: params.loadHours,
    accrualDt: postingService.getAccrualDt({
      cont,
      params: {
        flagsFix,
        periodSalary,
        dictFundSourceID: params.dictFundSourceID || null,
        dictProgClassID: params.dictProgClassID || null,
        dictProjectID: params.dictProjectID || null,
        accrualDt: params.accrualDt || null,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        payElID: params.payElID,
        paySum
      },
      sourceAccr
    }),
    trfPositionID: params.trfPositionID || null,
    dictPupilID: params.dictPupilID || null,
    groupID: params.groupID || null
  }
}
