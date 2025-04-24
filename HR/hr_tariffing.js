const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const payElService = require('../HR/modules/payElService')
const staffTariffingService = require('../HR/modules/staffTariffingService')

me.entity.addMethod('getReportDataFact')

me.getReportDataFact = function (ctx) {
  const reportParams = ctx.mParams.execParams

  const orgID = reportParams.orgID || 0
  const structDepID = reportParams.structDepID || 0
  const childDepID = reportParams.childDepID || 0
  const onDate = dateService.shiftDate(reportParams.onDate)

  // const usePayPermForPos = reportParams.usePayPermForPos // === undefined || reportParams.usePayPermForPos

  const depFilter = childDepID || structDepID

  const repCode = '07'
  const repSetElements = UB.Repository('hr_repSetElement')
    .attrs(['elementID', 'repSetParamID.code'])
    .where('repSetParamID.dictStReportID.code', '=', repCode)
    .where('dateFromNotEmpty', '<=', onDate)
    .where('dateToNotEmpty', '>=', onDate)
    .where('repSetParamID.dateFrom', '<=', onDate)
    .where('repSetParamID.dateTo', '>=', onDate)
    .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject({
      'repSetParamID.code': 'reportCode'
    })

  const reportPayElIDs = repSetElements.map(o => o.elementID)

  if (!reportPayElIDs.length) {
    reportPayElIDs.push(0)
  }

  const payElExperience = UB.Repository('hr_payElExperience')
    .attrs(['payElID', 'years', 'months', 'rate'])
    .where('payElID', 'in', reportPayElIDs)
    .orderBy('payElID')
    .orderBy('years', 'desc')
    .orderBy('months', 'desc')
    .selectAsObject()

  const dictSalaryRank = UB.Repository('hr_dictSalaryRank')
    .attrs('dictRankID', 'paySum')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()

  const cont = {
    orgID,
    payEl: payElService.getPayElEntrySum(),
    payElExperience,
    dictSalaryRank
  }

  const result = staffTariffingService.calculateStaffTariffing({
    cont,
    onDate,
    payElIDs: reportPayElIDs,
    dictFundSourceID: reportParams.dictFundSourceID,
    depFilter,
    onlyByTarif: reportParams.onlyByTarif,
    useHourlyPay: reportParams.useHourlyPay,
    normHour: reportParams.normHour
  })

  result.repSetElements = repSetElements
  result.payElExpData = payElExperience
  result.payElData = cont.payEl

  ctx.mParams.resultData = JSON.stringify(result)
}
