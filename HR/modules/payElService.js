const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')

const maxDate = dateService.maxDate()
const minDate = dateService.minDate()

function shiftDateTo (value) {
  return (value === '9999-12-31T00:00:00Z' || value === '9999-12-31T00:00Z') ? maxDate : dateService.shiftDate(value)
}
function shiftDateFrom (value) {
  return (value === '2000-01-01T00:00:00Z' || value === '2000-01-01T00:00Z') ? minDate : dateService.shiftDate(value)
}

module.exports = {
  getPayEl,
  filterPayEl,
  findPayElByMethod,
  getPayElEntrySum
}

function getPayEl ({ orgID, getAll = true }) {
  const result = {}
  const depend = {}
  let payElAlimonyLimit = []
  const payEls = UB.Repository('hr_payEl').attrs(['*', 'dictTimeCostID.isFactHour']).misc({ __allowSelectSafeDeleted: true }).selectAsObject()
  const method = UB.Repository('hr_method')
    .misc({ __allowSelectSafeDeleted: true })
    .attrs(['ID', 'code', 'name', 'algorithm', 'methodGroupID.code', 'methodGroupID.groupType', 'dayAccumCondition', 'dayAverageCondition'])
    .selectAsObject({
      'methodGroupID.code': 'groupCode',
      'methodGroupID.groupType': 'groupType'
    })
  // const existPayEl = UB.Repository('hr_payEl').misc({ __allowSelectSafeDeleted: true }).correlation('ID', 'payElID')
  depend.payElEntry = UB.Repository('hr_payElEntry').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate').where('payElBaseID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject()
  depend.payElTaxIndividEntry = UB.Repository('hr_payElTaxIndividEntry').attrs(['ID', 'payElID', 'taxIndividID',
    'dateFrom', 'dateTo', 'taxIndividID.code', 'taxIndividID.taxBreaks', 'taxIndividID.priority']).where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID')
    .orderBy('taxIndividID.priority')
    .selectAsObject({
      'taxIndividID.code': 'code',
      'taxIndividID.taxBreaks': 'taxBreaks',
      'taxIndividID.priority': 'priority'
    })
  depend.payElTaxIndivid = UB.Repository('hr_payElTaxIndivid')
    .attrs(['ID', 'taxIndividID', 'taxIndividID.dateFrom', 'taxIndividID.dateTo', 'taxIndividID.taxBreaks', 'payElID'])
    .where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject(
      {
        'taxIndividID.dateFrom': 'dateFrom',
        'taxIndividID.dateTo': 'dateTo',
        'taxIndividID.taxBreaks': 'taxBreaks'
      }
    )
  depend.payElDepend = UB.Repository('hr_payElDepend').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject()
  depend.payElRate = UB.Repository('hr_payElRate').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject()
  depend.payElTimeCost = UB.Repository('hr_payElTimeCost').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject()
  payElAlimonyLimit = UB.Repository('hr_payElAlimonyLimit').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').orderByDesc('dateFrom').selectAsObject()
  depend.payElExperience = UB.Repository('hr_payElExperience').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('payElID').orderBy('years').orderBy('months').orderBy('dateFrom').selectAsObject()
  depend.payElFundSource = UB.Repository('hr_payElFundSource').attrs(['*']).where('payElID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject()
  /* Object.keys(depend).forEach(name => {
    depend[name].forEach(o => {
      o.dateFrom = dateService.shiftDate(o.dateFrom)
      o.dateTo = dateService.shiftDate(o.dateTo)
    })
  }) */
  /* payElAlimonyLimit.forEach(o => {
    o.dateFrom = dateService.shiftDate(o.dateFrom)
  }) */
  payEls.forEach(pEl => {
    let el = Object.assign({}, pEl)
    el.dateFrom = shiftDateFrom(el.dateFrom)
    el.dateTo = shiftDateTo(el.dateTo)
    result[el.ID] = el
    result[el.ID].method = method.find(o => o.ID === el.methodID)
    result[el.ID].payElEntry = []
    result[el.ID].payElEntrySum = []
    result[el.ID].payElEntryTime = []
    result[el.ID].payElEntryMinSum = []
    result[el.ID].payElEntryPlanSum = []
    result[el.ID].payElAddRetention = []
    result[el.ID].payElAccrualReserve = []
    result[el.ID].payElUseReserve = []
    result[el.ID].payElTimeCost = []
    result[el.ID].payElTimeCostNot = []
    result[el.ID].payElTimeExclPremium = []
    result[el.ID].payElFundSource = []
    result[el.ID].payElExperience = []
    result[el.ID].payElTaxIndividEntry = []
    result[el.ID].payElTaxIndivid = []
    result[el.ID].payElRate = []
    result[el.ID].payElAlimonyLimit = []
    result[el.ID].payElDepend = []
  })

  Object.keys(depend).forEach(name => {
    depend[name].forEach(o => {
      if (result[o.payElID]) {
        o.dateFrom = shiftDateFrom(o.dateFrom)
        o.dateTo = shiftDateTo(o.dateTo)
        switch (name) {
          case 'payElEntry':
            result[o.payElID].payElEntry.push(o)
            switch (o.entryType) {
              case 'SUM':
                result[o.payElID].payElEntrySum.push(o)
                break
              case 'TIME':
                result[o.payElID].payElEntryTime.push(o)
                break
              case 'MINSUM':
                result[o.payElID].payElEntryMinSum.push(o)
                break
              case 'PLANSUM':
                result[o.payElID].payElEntryPlanSum.push(o)
                break
              case 'ADDRETENTION':
                result[o.payElID].payElAddRetention.push(o)
                break
              case 'ACCRUALRESERVE':
                result[o.payElID].payElAccrualReserve.push(o)
                break
              case 'USERESERVE':
                result[o.payElID].payElUseReserve.push(o)
                break
            }

            break
          case 'payElTimeCost':
            switch (o.entryType) {
              case 'INTIME':
                result[o.payElID].payElTimeCost.push(o)
                break
              case 'NOTTIME':
                result[o.payElID].payElTimeCostNot.push(o)
                break
              case 'EXCLUDE_TIME_PREMIUM':
                result[o.payElID].payElTimeExclPremium.push(o)
                break
            }
            break
          case 'payElFundSource':
          case 'payElExperience':
          case 'payElTaxIndividEntry':
          case 'payElTaxIndivid':
          case 'payElRate':
          case 'payElDepend':
            result[o.payElID][name].push(o)
            break
        }
      }
    })
  })

  payElAlimonyLimit.forEach(o => {
    if (result[o.payElID]) {
      o.dateFrom = shiftDateFrom(o.dateFrom)
      result[o.payElID].payElAlimonyLimit.push(o)
    }
  })
  console.log('Кінець payEls')
  /* payEls.forEach(pEl => {
    let el = Object.assign({}, pEl)
    el.dateFrom = dateService.shiftDate(el.dateFrom)
    el.dateTo = dateService.shiftDate(el.dateTo)
    result[el.ID] = el
    result[el.ID].method = method.find(o => o.ID === el.methodID)
    result[el.ID].payElEntry = depend.payElEntry.filter(o => o.payElID === el.ID)
    result[el.ID].payElEntrySum = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'SUM')
    result[el.ID].payElEntryTime = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'TIME')
    result[el.ID].payElEntryMinSum = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'MINSUM')
    result[el.ID].payElEntryPlanSum = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'PLANSUM')
    result[el.ID].payElAddRetention = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'ADDRETENTION')
    result[el.ID].payElAccrualReserve = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'ACCRUALRESERVE')
    result[el.ID].payElUseReserve = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'USERESERVE')
    result[el.ID].payElTimeCost = depend.payElTimeCost.filter(o => o.payElID === el.ID && o.entryType === 'INTIME')
    result[el.ID].payElTimeCostNot = depend.payElTimeCost.filter(o => o.payElID === el.ID && o.entryType === 'NOTTIME')
    result[el.ID].payElTimeExclPremium = depend.payElTimeCost.filter(o => o.payElID === el.ID && o.entryType === 'EXCLUDE_TIME_PREMIUM')

    result[el.ID].payElFundSource = depend.payElFundSource.filter(o => o.payElID === el.ID)
    result[el.ID].payElExperience = depend.payElExperience.filter(o => o.payElID === el.ID)
    result[el.ID].payElTaxIndividEntry = depend.payElTaxIndividEntry.filter(o => o.payElID === el.ID)
    result[el.ID].payElTaxIndivid = depend.payElTaxIndivid.filter(o => o.payElID === el.ID)
    result[el.ID].payElRate = depend.payElRate.filter(o => o.payElID === el.ID)
    result[el.ID].payElAlimonyLimit = payElAlimonyLimit.filter(o => o.payElID === el.ID)
    result[el.ID].payElDepend = depend.payElDepend.filter(o => o.payElID === el.ID)
  }) */
  return result
}

function filterPayEl ({ cont, groupCodes = [], methodCodes = [] }) {
  const result = []
  Object.keys(cont.payEl).forEach(payElID => {
    if (groupCodes.includes(cont.payEl[payElID].method.groupCode) || methodCodes.includes(cont.payEl[payElID].method.code)) {
      result.push(cont.payEl[payElID].ID)
    }
  })
  return result
}
function findPayElByMethod ({ cont, methodCode, onDate }) {
  let result = null
  Object.keys(cont.payEl).forEach(payElID => {
    if (!result && methodCode === cont.payEl[payElID].method.code && cont.payEl[payElID].dateFrom <= onDate && cont.payEl[payElID].dateTo >= onDate && !cont.payEl[payElID].mi_deleteUser) {
      result = Number(payElID)
    }
  })
  return result
}

function getPayElEntrySum () {
  const result = {}
  const depend = {}
  const payEls = UB.Repository('hr_payEl').attrs(['*']).misc({ __allowSelectSafeDeleted: true }).selectAsObject()
  const method = UB.Repository('hr_method')
    .misc({ __allowSelectSafeDeleted: true })
    .attrs(['ID', 'code', 'name', 'algorithm', 'methodGroupID.code', 'methodGroupID.groupType', 'dayAccumCondition', 'dayAverageCondition'])
    .selectAsObject({
      'methodGroupID.code': 'groupCode',
      'methodGroupID.groupType': 'groupType'
    })
  // const existPayEl = UB.Repository('hr_payEl').misc({ __allowSelectSafeDeleted: true }).correlation('ID', 'payElID')
  depend.payElEntry = UB.Repository('hr_payElEntry').attrs(['*']).where('entryType', '=', 'SUM').where('payElID.mi_deleteDate', '>=', '#maxdate').where('payElBaseID.mi_deleteDate', '>=', '#maxdate').orderBy('payElID').selectAsObject()
  payEls.forEach(pEl => {
    let el = Object.assign({}, pEl)
    el.dateFrom = shiftDateFrom(el.dateFrom)
    el.dateTo = shiftDateTo(el.dateTo)
    result[el.ID] = el
    result[el.ID].method = method.find(o => o.ID === el.methodID)
    result[el.ID].payElEntrySum = []
  })
  Object.keys(depend).forEach(name => {
    depend[name].forEach(o => {
      if (result[o.payElID]) {
        o.dateFrom = shiftDateFrom(o.dateFrom)
        o.dateTo = shiftDateTo(o.dateTo)
        result[o.payElID].payElEntrySum.push(o)
      }
    })
  })

  /* Object.keys(depend).forEach(name => {
    depend[name].forEach(o => {
      o.dateFrom = dateService.shiftDate(o.dateFrom)
      o.dateTo = dateService.shiftDate(o.dateTo)
    })
  })
  payEls.forEach(pEl => {
    let el = Object.assign({}, pEl)
    el.dateFrom = dateService.shiftDate(el.dateFrom)
    el.dateTo = dateService.shiftDate(el.dateTo)
    result[el.ID] = el
    result[el.ID].method = method.find(o => o.ID === el.methodID)
    result[el.ID].payElEntrySum = depend.payElEntry.filter(o => o.payElID === el.ID && o.entryType === 'SUM')
  }) */
  return result
}
