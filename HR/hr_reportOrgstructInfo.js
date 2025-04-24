const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dataService = require('../AC/modules/dataServices/dataService')
const currencyService = require('../AC/modules/dataServices/currencyService')

me.entity.addMethod('getData')

me.getData = ctx => {
  let res = {}
  let attrs = App.domainInfo.entities[__entityName].attributes
  Object.keys(attrs).forEach(attr => {
    res[attr] = 0
  })

  let mParams = ctx.mParams
  let orgs = dataService.getNumberArray(mParams.orgs)
  let onDate = mParams.onDate ? new Date(mParams.onDate) : new Date()
  let currDate = mParams.currDate ? new Date(mParams.currDate) : new Date()
  let staffTableID = mParams.staffTableID
  const positionFunds = global['hr_positionFunds']
  const posGroups = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  let posBase = UB.Repository('hr_position')
    .attrs(['mi_data_id', 'positionType', 'psCategory', 'quantity', 'dictStatePayID.groupN'])
    .misc({ __mip_ondate: currDate })
    .where('state', '=', 'ACTIVE')
    .where('orgID', 'in', orgs)
    .where('liquidate', '=', 0)
    .selectAsObject()
  let posResults = UB.Repository('hr_position')
    .attrs(['mi_data_id', 'positionType', 'psCategory', 'quantity', 'dictStatePayID.groupN'])
    .where('liquidate', '=', 0)
    .where('mi_dateFrom', '<=', onDate, 'dateFrom')
    .where('mi_dateTo', '>=', onDate, 'dateTo')
    .where('state', '=', 'ACTIVE', 'active')
    .where('staffOrderID', '=', staffTableID, 'order')
    .whereIf(orgs, 'orgID', 'in', orgs)
    .notExists(UB.Repository('hr_staffUnit')
      .correlation('mi_data_id', 'mi_data_id')
      .where('staffOrderID', '=', staffTableID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notExist')
    .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
    .selectAsObject()
  if (posBase.length) {
    let fundData = positionFunds.getData({
      mParams: {
        orgs: orgs,
        onDate: currDate
      }
    })
    fundData.forEach(item => {
      res.fundSum1 += item.fundAll
      res.fundSum1_1 += item.fundBase
      res.fundSum1_2 += item.fundAdd
      res.fundSum1_3 += item.fundOther
    })
    let changesData = positionFunds.getData({
      mParams: {
        orgs: orgs,
        onDate: onDate,
        staffTableID: staffTableID
      }
    })
    changesData.forEach(item => {
      res.resultSum1 += item.fundAll
      res.resultSum1_1 += item.fundBase
      res.resultSum1_2 += item.fundAdd
      res.resultSum1_3 += item.fundOther
    })

    res.fundSum1 = currencyService.round(res.fundSum1, 2)
    res.fundSum1_1 = currencyService.round(res.fundSum1_1, 2)
    res.fundSum1_2 = currencyService.round(res.fundSum1_2, 2)
    res.fundSum1_3 = currencyService.round(res.fundSum1_3, 2)

    res.resultSum1 = currencyService.round(res.resultSum1, 2)
    res.resultSum1_1 = currencyService.round(res.resultSum1_1, 2)
    res.resultSum1_2 = currencyService.round(res.resultSum1_2, 2)
    res.resultSum1_3 = currencyService.round(res.resultSum1_3, 2)

    res.changesSum1 = res.resultSum1 - res.fundSum1
    res.changesSum1_1 = res.resultSum1_1 - res.fundSum1_1
    res.changesSum1_2 = res.resultSum1_2 - res.fundSum1_2
    res.changesSum1_3 = res.resultSum1_3 - res.fundSum1_3

    res.fundSum1_2_prc = res.fundSum1_2 > 0 ? currencyService.round(res.fundSum1_2 / res.fundSum1_1, 4) * 100 : 0
    res.fundSum1_3_prc = res.fundSum1_3 > 0 ? currencyService.round(res.fundSum1_3 / res.fundSum1_1, 4) * 100 : 0
    res.resultSum1_2_prc = res.resultSum1_2 > 0 ? currencyService.round(res.resultSum1_2 / res.resultSum1_1, 4) * 100 : 0
    res.resultSum1_3_prc = res.resultSum1_3 > 0 ? currencyService.round(res.resultSum1_3 / res.resultSum1_1, 4) * 100 : 0
    res.changesSum1_2_prc = res.resultSum1_2_prc - res.fundSum1_2_prc
    res.changesSum1_3_prc = res.resultSum1_3_prc - res.fundSum1_3_prc

    posBase.forEach(item => {
      res.fundSum2 += item.quantity
      if (['1', '2'].includes(item.psCategory)) {
        res.fundSum2_1_1 += item.quantity
      }
      let groupN = item['dictStatePayID.groupN']
      if (posGroups.includes(groupN)) {
        let groupField = `fundSum2_1_2_${groupN}`
        res[groupField] += item.quantity
      }
      if (item.positionType === '1') {
        // Держслужбовець
        res.fundSum2_1 += item.quantity
      } else if (item.positionType === '6') {
        // Патронатна служба
        res.fundSum2_2 += item.quantity
      } else if (item.positionType === '3') {
        // Працівник, з функцій обслуговування
        res.fundSum2_3 += item.quantity
      } else if (item.positionType === '7') {
        // Робітник
        res.fundSum2_4 += item.quantity
      }
    })

    posResults.forEach(item => {
      res.resultSum2 += item.quantity
      if (['1', '2'].includes(item.psCategory)) {
        res.resultSum2_1_1 += item.quantity
      }
      let groupN = item['dictStatePayID.groupN']
      if (posGroups.includes(groupN)) {
        let groupField = `resultSum2_1_2_${groupN}`
        res[groupField] += item.quantity
      }
      if (item.positionType === '1') {
        // Держслужбовець
        res.resultSum2_1 += item.quantity
      } else if (item.positionType === '6') {
        // Патронатна служба
        res.resultSum2_2 += item.quantity
      } else if (item.positionType === '3') {
        // Працівник, з функцій обслуговування
        res.resultSum2_3 += item.quantity
      } else if (item.positionType === '7') {
        // Робітник
        res.resultSum2_4 += item.quantity
      }
    })

    res.changesSum2 = res.resultSum2 - res.fundSum2
    res.changesSum2_1 = res.resultSum2_1 - res.fundSum2_1
    res.changesSum2_1_1 = res.resultSum2_1_1 - res.fundSum2_1_1
    res.changesSum2_2 = res.resultSum2_2 - res.fundSum2_2
    res.changesSum2_3 = res.resultSum2_3 - res.fundSum2_3
    res.changesSum2_4 = res.resultSum2_4 - res.fundSum2_4

    posGroups.forEach(groupN => {
      let fundGroupField = `fundSum2_1_2_${groupN}`
      let changesGroupField = `changesSum2_1_2_${groupN}`
      let resultGroupField = `resultSum2_1_2_${groupN}`
      res[changesGroupField] = res[resultGroupField] - res[fundGroupField]
    })

    res.fundSum2_1_1_prc = res.fundSum2_1_1 > 0 ? currencyService.round(res.fundSum2_1_1 / res.fundSum2, 4) * 100 : 0
    res.resultSum2_1_1_prc = res.resultSum2_1_1 > 0 ? currencyService.round(res.resultSum2_1_1 / res.resultSum2, 4) * 100 : 0
    res.changesSum2_1_1_prc = res.resultSum2_1_1_prc - res.fundSum2_1_1_prc
  }
  mParams.resultData = JSON.stringify(res)
}
