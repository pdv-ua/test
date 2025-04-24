const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const storeService = require('../AC/modules/dataServices/localStoreService')

me.entity.addMethod('selectData')
me.entity.addMethod('selectFunds')
me.entity.addMethod('getStringData')

me.selectData = ctx => {
  let data = me.getData(ctx)
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  ctx.inherited = false
  return true
}

me.selectFunds = ctx => {
  let recTotals = {
    name: UB.i18n('ФОП всього'),
    fundMonth: 0,
    fundQuarter: 0,
    fundYear: 0
  }
  let recBasepay = {
    name: UB.i18n('Фонд основної заробітної плати'),
    fundMonth: 0,
    fundQuarter: 0,
    fundYear: 0
  }
  let recAddpay = {
    name: UB.i18n('Фонд додаткової заробітної плати'),
    fundMonth: 0,
    fundQuarter: 0,
    fundYear: 0
  }
  let recOthers = {
    name: UB.i18n('Інші заохочувальні та компенсаційні виплати'),
    fundMonth: 0,
    fundQuarter: 0,
    fundYear: 0
  }

  let posData = me.getData(ctx)
  let posItem = posData[0]
  if (posItem) {
    const quarterMonthes = 3
    const yearMonthes = 12

    recBasepay.fundMonth = posItem.fundBase
    recBasepay.fundQuarter = recBasepay.fundMonth * quarterMonthes
    recBasepay.fundYear = recBasepay.fundMonth * yearMonthes
    recAddpay.fundMonth = posItem.fundAdd
    recAddpay.fundQuarter = recAddpay.fundMonth * quarterMonthes
    recAddpay.fundYear = recAddpay.fundMonth * yearMonthes
    recOthers.fundMonth = posItem.fundOther
    recOthers.fundQuarter = recOthers.fundMonth * quarterMonthes
    recOthers.fundYear = recOthers.fundMonth * yearMonthes

    recTotals.fundMonth = recBasepay.fundMonth + recAddpay.fundMonth + recOthers.fundMonth
    recTotals.fundQuarter = recBasepay.fundQuarter + recAddpay.fundQuarter + recOthers.fundQuarter
    recTotals.fundYear = recBasepay.fundYear + recAddpay.fundYear + recOthers.fundYear
  }

  let data = [
    recTotals,
    recBasepay,
    recAddpay,
    recOthers
  ]
  storeService.initArrayToStore(ctx.dataStore, data, ctx.mParams)
  ctx.inherited = false
  return true
}

me.getStringData = ctx => {
  ctx.mParams.resultData = JSON.stringify(me.getData(ctx))
}

me.getData = ctx => {
  let mParams = ctx.mParams
  let positionID = mParams.positionID
  let staffTableID = mParams.staffTableID
  let orgs = mParams.orgs
  let onDate = mParams.onDate
  let fundCodes = mParams.fundCodes || ['FOP_BASE', 'FOP_ADD', 'FOP_OTHER']

  let posData = UB.Repository('hr_position')
    .attrs(['ID', 'positionType', 'psCategory', 'parentUnitID', 'accrualSum', 'quantity'])
  if (positionID) {
    posData = posData.where('ID', '=', positionID)
      .misc({ __mip_recordhistory_all: true })
  } else if (staffTableID) {
    posData = posData
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
  } else {
    posData = posData.where('orgID', 'in', orgs)
      .where('liquidate', '=', 0)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
  }
  posData = posData.selectAsObject()
  if (posData.length) {
    let accrData = UB.Repository('hr_positionAccrual')
      .attrs(['positionID', 'accrualSum', 'accrualRate', 'payElID', 'payElID.code'])
      .whereIf(positionID, 'positionID', '=', positionID)
      .whereIf(orgs, 'positionID.orgID', 'in', orgs)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
    let setupData = UB.Repository('hr_repSetElement')
      .attrs(['repSetParamID.code', 'elementSetTypeID.code', 'elementID'])
      .whereIf(fundCodes, 'repSetParamID.code', 'in', fundCodes)
      .where('elementSetTypeID.code', '=', 'hr_payEl')
      .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
      .where('dateFrom', '<=', onDate, 'dateFromOnDate')
      .where('dateTo', 'isNull', undefined, 'dateToIsNull')
      .where('dateTo', '>=', onDate, 'dateToOnDate')
      .logic('([dateFromIsNull] or [dateFromOnDate]) and ([dateToIsNull] or [dateToOnDate])')
      .selectAsObject()
    posData.forEach(posItem => {
      posItem.basepay = posItem.accrualSum || 0
      posItem.fundBase = posItem.basepay * posItem.quantity
      posItem.fundAdd = 0
      posItem.fundOther = 0
      posItem.fundAll = posItem.fundBase
      let accrPosData = accrData.filter(itm => itm.positionID === posItem.ID)
      for (let i = 0; i < accrPosData.length; i++) {
        let accrPosItem = accrPosData[i]
        let payElCode = accrPosItem['payElID.code']
        let accrElements = setupData.filter(item => { return item.elementID === accrPosItem.payElID })
        for (let j = 0; j < accrElements.length; j++) {
          let accrElement = accrElements[j]
          let repSetParamCode = accrElement['repSetParamID.code']
          let fundSum = getSum(accrPosItem.accrualSum, accrPosItem.accrualRate, posItem.basepay, posItem.quantity)
          posItem.fundAll += fundSum
          posItem.fundCode = repSetParamCode
          if (repSetParamCode === 'FOP_BASE') {
            if (payElCode !== '1') {
              posItem.fundBase += fundSum
            }
          } else if (repSetParamCode === 'FOP_ADD') {
            posItem.fundAdd += fundSum
          } else if (repSetParamCode === 'FOP_OTHER') {
            posItem.fundOther += fundSum
          }
        }
      }
    })
  }
  return posData
}

function getSum (value, rate, basepay, quantity = 1) {
  value = value || 0
  let res = rate ? Math.round(basepay * rate / 100) : value
  return res * quantity
}
