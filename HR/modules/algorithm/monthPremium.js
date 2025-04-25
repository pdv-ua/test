/**
 * Щомісячна премія
 */

const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params, sourceAccr }) => {
  const flagsFix = params.flagsFix || 0
  const mtCount = params.mtCount || 1
  let paySum
  let paySumAccrual
  
  if (['45', '46', '47', '65', '206'].includes(cont.payEl[params.payElID].method.code)) {
    let timeKoef = 1
    if (['65'].includes(cont.payEl[params.payElID].method.code) && cont.payEl[params.payElID].isTimeSheet) {
      timeKoef = (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) !== 0)
        ? (cont.payEl[params.payElID].isTimeSheet ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) /
          ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days)) : 1) : 1
    } else if (['47'].includes(cont.payEl[params.payElID].method.code) && cont.payEl[params.payElID].isTimeSheet && params.flagsRec & 1 << 1) {
      timeKoef = (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) !== 0)
        ? (cont.payEl[params.payElID].isTimeSheet ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) /
          ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days)) : 1) : 1
    }
    paySumAccrual = (flagsFix & 1 << 21) ? params.baseSum : (((params.rate !== null && params.rate >= 0) ? (params.baseSum * params.rate / 100) : params.baseSum) / timeKoef)
  } else {
    paySumAccrual = flagsFix & 1 << 21 ? params.paySumAccrual
      : (
        (params.rate !== null && params.rate >= 0)
          ? ((cont.payEl[params.payElID].isTimeSheet && ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) === 0) ? 0
            : (params.baseSum * params.rate / 100) /
          (cont.payEl[params.payElID].isTimeSheet ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) /
            ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days)) : 1))
          : ((((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) !== 0 || !cont.payEl[params.payElID].isTimeSheet)
            ? (params.baseSum / (cont.payEl[params.payElID].isTimeSheet ? (((!params.flagsRec || params.flagsRec & 1 << 5) ? params.planHours : params.planDays) /
          ((!params.flagsRec || params.flagsRec & 1 << 5) ? params.hours : params.days)) : 1))
            : 0)
      )
  }
   
  paySumAccrual = Number.isFinite(paySumAccrual) ? accrualService.roundPayEl(paySumAccrual, cont.payEl[params.payElID].roundUpTo) : 0
  // if ((flagsFix & 1 << 21)) {
  //   params.rate = params.baseSum ? paySumAccrual / (params.baseSum / 100) : 0
  // }
  if (params.rateOff) {
    params.paySumOff = paySumAccrual * params.rateOff / 100
  }
  
  paySum = (flagsFix & 2) ? params.paySum : accrualService.roundPayEl(paySumAccrual - (params.paySumOff || 0), cont.payEl[params.payElID].roundUpTo)

  return {
    periodCalcID: periodCalc.ID,
    periodSalaryID: periodSalary.ID,
    periodCalc: periodCalc.dateFrom,
    periodSalary: periodSalary.dateFrom,
    employeeNumberID: params.employeeNumberID,
    payElID: params.payElID,
    flagsRec: params.flagsRec,
    flagsFix,
    baseSum: params.baseSum,
    rate: params.rate,
    paySumAccrual,
    paySum,
    rateOff: params.rateOff || 0,
    paySumOff: params.paySumOff || 0,
    mask: params.mask,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    hoursByDays: params.hoursByDays,
    planHoursByDays: params.planHoursByDays,
    dateFromAvg: params.dateFromAvg,
    dateToAvg: params.dateToAvg,
    sumAvg: params.sumAvg,
    extraRate: params.extraRate,
    dictFundSourceID: params.dictFundSourceID,
    dictProgClassID: params.dictProgClassID,
    dictProjectID: params.dictProjectID || null,
    calcParams: params.calcParams || null,
    KPI: params.KPI || null,
    accrualDt: postingService.getAccrualDt({
      cont,
      sourceAccr,
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
        paySum,
        rate: params.rate
      }
    })
  }
}
