/**
 * Змінний бригадний наряд
 */
const accrualService = require('../../../HR/modules/accrualService')
const postingService = require('../../../HR/modules/postingService')

module.exports.run = ({ cont, periodCalc, periodSalary, params }) => {
  const payEl = cont.payEl[params.payElID]
  const flagsFix = params.flagsFix || 0
  const operationID = params.dictWorkOperationID || null
  const operation = cont.dict.hr_dictWorkOperation.find(o => o.ID === operationID)
  // const payment = (!(flagsFix & 1 << 10) && operation ? operation.payment : params.payment) || 0
  const payment = operation ? operation.payment : params.payment || 0
  const norm = (!(flagsFix & 1 << 11) && !(params.flagsRec & 1 << 19) && operation ? operation.norm : params.norm) || 0
  const planQuantity = (!(flagsFix & 1 << 18) && !(params.flagsRec & 1 << 19) && operation ? operation.norm : params.planQuantity) || 0
  // const dictMeasureID = (!(flagsFix & 1 << 12) && operation ? operation.dictMeasureID : params.dictMeasureID) || ''
  const workYield = !(flagsFix & 1 << 13) ? planQuantity : params.yield
  const baseSum = ((flagsFix & 1 << 0) ? params.baseSum : accrualService.getWorkOperationRate(cont, operationID, workYield)) || 0
  let paySum = params.paySum
  if (!(flagsFix & 1 << 1)) {
    switch (payment) {
      case '1': // За розцінкою
        paySum = baseSum * (workYield || 0)
        paySum = accrualService.roundPayEl(paySum, payEl.roundUpTo)
        break
      case '2': // Денний тариф
        paySum = operation.isCalcProportion ? baseSum * (workYield || 0) / (planQuantity || 0) : baseSum
        paySum = accrualService.roundPayEl(paySum, payEl.roundUpTo)
        break
    }
  }
  const accrualDt = cont.employeeNumberID ? postingService.getAccrualDt({
    cont,
    params: {
      flagsFix,
      dictFundSourceID: params.dictFundSourceID || null,
      dictProgClassID: params.dictProgClassID || null,
      dictProjectID: params.dictProjectID || null,
      accrualDt: params.accrualDt || null,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      payElID: params.payElID,
      paySum
    }
  }) : null
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
    baseSum,
    paySum,
    rate: params.rate || null,
    days: params.days,
    hours: params.hours,
    planHours: params.planHours,
    planDays: params.planDays,
    mtCount: params.mtCount,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    hoursByDays: params.hoursByDays,
    planHoursByDays: params.planHoursByDays,
    leadingHoursByDays: params.leadingHoursByDays,
    dictFundSourceID: params.dictFundSourceID || null,
    dictProgClassID: params.dictProgClassID || null,
    dictProjectID: params.dictProjectID || null,
    dictPositionID: params.dictPositionID || null,
    dictTechID: params.dictTechID || null,
    dictWorkOperationID: params.dictWorkOperationID || null,
    calcParams: params.calcParams || null,
    payment,
    // dictMeasureID,
    norm,
    planQuantity,
    yield: workYield,
    accrualDt
  }
}
