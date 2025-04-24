const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const accrualService = require('../HR/modules/accrualService')

me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)

function beforeInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  execParams.postedDate = new Date()
  if (execParams.paymentOrderDt) {
    mParams.paymentOrderDt = execParams.paymentOrderDt
    delete execParams.paymentOrderDt
  }
  if (execParams.paymentOrderAccDt) {
    mParams.paymentOrderAccDt = execParams.paymentOrderAccDt
    delete execParams.paymentOrderAccDt
  }
}
function afterInsert (ctx) {
  const mParams = ctx.mParams
  if (mParams.paymentOrderDt) {
    const paymentOrderDt = JSON.parse(mParams.paymentOrderDt)
    const store = UB.DataStore('hr_paymentOrderDt')
    paymentOrderDt.forEach(record => {
      delete record['employeeNumberID.description']
      record.paymentOrderID = mParams.execParams.ID
      store.run('insert', {
        execParams: record
      })
    })
  }
  if (mParams.paymentOrderAccDt) {
    const paymentOrderAccDt = JSON.parse(mParams.paymentOrderAccDt)
    const storeAcc = UB.DataStore('hr_paymentOrderAccDt')
    paymentOrderAccDt.forEach(record => {
      record.paymentOrderID = mParams.execParams.ID
      record.ID = accrualService.getID('S_HR_PAYMENTORDERACCDT')
      storeAcc.run('insert', {
        execParams: record
      })
    })
  }
}
function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.postedDate = new Date()
  if (execParams.paymentOrderAccDt) {
    const paymentOrderAccDt = JSON.parse(execParams.paymentOrderAccDt)
    const store = UB.DataStore('hr_paymentOrderAccDt')
    const storeAcc = UB.DataStore('hr_paymentOrderAccDt')
    store.execSQL(`DELETE FROM hr_paymentOrderAccDt WHERE paymentOrderID = :paymentOrderID:`,
      { paymentOrderID: execParams.ID })

    paymentOrderAccDt.forEach(record => {
      record.paymentOrderID = execParams.ID
      record.ID = accrualService.getID('S_HR_PAYMENTORDERACCDT')
      storeAcc.run('insert', {
        execParams: record
      })
    })
    delete execParams.paymentOrderAccDt
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_paymentOrderDt')
  store.execSQL(`DELETE FROM hr_paymentOrderDt WHERE paymentOrderID = :paymentOrderID:`, { paymentOrderID: execParams.ID })
  store.execSQL(`DELETE FROM hr_paymentOrderAccDt WHERE paymentOrderID = :paymentOrderID:`, { paymentOrderID: execParams.ID })
}
