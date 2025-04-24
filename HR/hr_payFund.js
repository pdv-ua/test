const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeUpdate)

me.entity.addMethod('updatePayElEntry')
me.entity.addMethod('updateDictCategoryECB')
me.entity.addMethod('updateTimeCostEntry')
me.entity.addMethod('updateFundSource')
me.entity.addMethod('copyRecord')

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.code) {
    let codeList = String(execParams.code || '0').match(/\d+/g) || ['0']
    execParams.codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
  }
}

me.updatePayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore(mParams.entityDt)
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', { execParams: { payFundID: mParams.payFundID, payElID: ID } })
  })
  calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані ${mParams.entityDt}` })
}

me.updateDictCategoryECB = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payFundCategory')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', { execParams: { payFundID: mParams.payFundID, dictCategoryECBID: ID } })
  })
  calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payFundCategory` })
}

me.updateTimeCostEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payFundTimeCost')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        payFundID: mParams.payFundID,
        dictTimeCostID: ID,
        dateFromEmpty: null,
        dateToEmpty: null
      }
    })
  })
  calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payFundTimeCost` })
}

me.updateFundSource = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payFundSource')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        payFundID: mParams.payFundID,
        dictFundSourceID: ID,
        dateFromEmpty: null,
        dateToEmpty: null
      }
    })
  })
  calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payFundSource` })
}

function clearMiAttrs (attrs) {
  for (const attr in attrs) {
    if (attrs.hasOwnProperty(attr)) {
      if (attr.startsWith('mi_')) {
        delete attrs[attr]
      }
    }
  }
}

me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const payFund = UB.Repository(__entityName).attrs('*').selectById(params.ID)
  clearMiAttrs(payFund)
  let store = UB.DataStore(__entityName)
  const payFundID = store.generateID()
  payFund.ID = payFundID
  payFund.name = payFund.name + ' (копія)'
  store.run('insert', {
    execParams: payFund
  })
  store = UB.DataStore('hr_payFundBase')
  const payFundBase = UB.Repository('hr_payFundBase')
    .attrs(['payElID'])
    .where('payFundID', '=', params.ID)
    .selectAsObject()
  payFundBase.forEach(row => {
    store.run('insert', {
      execParams: {
        payFundID: payFundID,
        payElID: row.payElID
      }
    })
  })
  store = UB.DataStore('hr_payFundRate')
  const payFundRate = UB.Repository('hr_payFundRate')
    .attrs(['dateFrom', 'dateTo', 'rate'])
    .where('payFundID', '=', params.ID)
    .selectAsObject()
  payFundRate.forEach(row => {
    store.run('insert', {
      execParams: {
        payFundID: payFundID,
        rate: row.rate,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })
  store = UB.DataStore('hr_payFundCategory')
  const payFundCategory = UB.Repository('hr_payFundCategory')
    .attrs(['dictCategoryECBID'])
    .where('payFundID', '=', params.ID)
    .selectAsObject()
  payFundCategory.forEach(row => {
    store.run('insert', {
      execParams: {
        payFundID: payFundID,
        dictCategoryECBID: row.dictCategoryECBID
      }
    })
  })
  store = UB.DataStore('hr_payFundTimeCost')
  const payFundTimeCost = UB.Repository('hr_payFundTimeCost')
    .attrs(['dictTimeCostID', 'dateFrom', 'dateTo'])
    .where('payFundID', '=', params.ID)
    .selectAsObject()
  payFundTimeCost.forEach(row => {
    store.run('insert', {
      execParams: {
        payFundID: payFundID,
        dictTimeCostID: row.dictTimeCostID,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
    })
  })
  store = UB.DataStore('hr_idParam')
  const idParam = UB.Repository('hr_idParam')
    .attrs(['orgID', 'listParamID', 'orderN'])
    .where('valuesID', '=', params.ID)
    .selectAsObject()
  idParam.forEach(row => {
    store.run('insert', {
      execParams: {
        valuesID: payFundID,
        orgID: row.orgID,
        listParamID: row.listParamID
      }
    })
  })
  ctx.mParams.newID = payFundID
}
