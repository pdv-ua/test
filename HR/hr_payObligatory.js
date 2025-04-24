const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')

me.on('delete:before', beforeDelete)

me.entity.addMethod('updatePayElEntry')
me.entity.addMethod('updatePayFundEntry')
me.entity.addMethod('updatePayObligatoryOrg')

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_paymentOrder')
  store.execSQL(`DELETE FROM hr_paymentOrderDt WHERE paymentOrderID in (SELECT ID FROM hr_paymentOrder WHERE payObligatoryID = :payObligatoryID: AND payRollID IS NULL)`,
    { payObligatoryID: execParams.ID })
  store.execSQL(`DELETE FROM hr_paymentOrderAccDt WHERE paymentOrderID in (SELECT ID FROM hr_paymentOrder WHERE payObligatoryID = :payObligatoryID: AND payRollID IS NULL)`,
    { payObligatoryID: execParams.ID })
  store.execSQL(`DELETE FROM hr_paymentOrder WHERE payObligatoryID = :payObligatoryID: AND payRollID IS NULL`
    , { payObligatoryID: execParams.ID })
}

me.updatePayElEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payElDepend')
  data.remove.forEach(row => {
    store.run('delete', { execParams: { ID: row.ID } })
  })
  data.update.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: row.ID,
        dateFromEmpty: dateService.shiftDate(row.dateFrom),
        dateToEmpty: dateService.shiftDate(row.dateTo)
      }
    })
  })
  data.add.forEach(row => {
    store.run('insert', {
      skipUpdate: true,
      execParams: {
        ownerID: mParams.ownerID,
        payElID: row.payElID,
        dateFromEmpty: dateService.shiftDate(row.dateFrom),
        dateToEmpty: dateService.shiftDate(row.dateTo)
      }
    })
  })
  calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payElDepend` })
}
me.updatePayFundEntry = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payFundDepend')
  data.remove.forEach(row => {
    store.run('delete', { execParams: { ID: row.ID } })
  })
  data.update.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      skipUpdate: true,
      execParams: {
        ID: row.ID,
        dateFromEmpty: dateService.shiftDate(row.dateFrom),
        dateToEmpty: dateService.shiftDate(row.dateTo)
      }
    })
  })
  data.add.forEach(row => {
    store.run('insert', {
      skipUpdate: true,
      execParams: {
        ownerID: mParams.ownerID,
        fundID: row.fundID,
        dateFromEmpty: dateService.shiftDate(row.dateFrom),
        dateToEmpty: dateService.shiftDate(row.dateTo)
      }
    })
  })
  calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_payFundDepend` })
}

me.updatePayObligatoryOrg = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_payObligatoryOrg')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        payObligatoryID: mParams.payObligatoryID,
        orgID: ID
      }
    })
  })
}
