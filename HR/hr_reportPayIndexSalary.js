const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const dateService = require('../AC/modules/dataServices/dateService')
const orgService = require('../HR/modules/orgService')
const payElService = require('../HR/modules/payElService')
const payFundService = require('../HR/modules/payFundService')
const accrualService = require('../HR/modules/accrualService')
const employeeService = require('../HR/modules/employeeService')
const algorithmService = require('../HR/modules/algorithmService')

me.entity.addMethod('calcPlan')

me.calcPlan = function (ctx) {
  const params = ctx.mParams
  const orgID = params.orgID
  const cont = { emp: { } }
  // Дані організації
  cont.org = orgService.getOrgData(orgID)

  // Види оплат
  cont.payEl = payElService.getPayEl({ orgID })

  // Фонди
  cont.payFund = payFundService.getPayFund()
  if (params.dateFrom) {
    params.dateFrom = dateService.shiftDate(params.dateFrom)
  }
  if (params.dateTo) {
    params.dateTo = dateService.shiftDate(params.dateTo)
  }

  if (params.dateReport) {
    params.dateReport = dateService.shiftDate(params.dateReport)
  }

  if (!params.payElParams) {
    params.payElParams = []
  }
  params.payElParams.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })

  // Дані працівника (призначення, нарахування, табель)
  cont.employeeNumberID = params.employeeNumberID
  cont.emp = { [cont.employeeNumberID]: {} }
  cont.emp[cont.employeeNumberID].prop = employeeService.getEmpData(params.employeeNumberID, params.dateReport, params.dateReport)
  cont.emp[params.employeeNumberID].permanentAccrual = accrualService.getPermanentAccrual(orgID, params.employeeNumberID, cont, params.period)

  // Постійні нарахування
  const accr = cont.emp[cont.employeeNumberID].prop.employeePositions.find(o => dateService.shiftDate(o.dateFrom) <= params.dateTo && dateService.shiftDate(o.dateTo) >= params.dateTo)
  const permanentAccrual = {
    payElID: params.selectPayEl.payElID,
    dateFrom: params.selectPayEl.dateFrom,
    dateTo: params.selectPayEl.dateTo
  }

  let planSum = algorithmService.getPlanSum(params.dateTo, cont, permanentAccrual, accr, cont.emp[params.employeeNumberID].permanentAccrual) * (cont.payEl[accr.payElID].isMtCount ? (accr.mtCount || 1) : 1)

  params.resultData = planSum
}
