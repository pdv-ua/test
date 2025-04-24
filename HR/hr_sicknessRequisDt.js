const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:after', afterInsert)
me.on('delete:before', beforeDelete)
me.on('update:before', beforeUpdate)

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams) {
    const store = UB.DataStore('hr_sicknessRequisAccrual')
    const accrual = UB.Repository('hr_accrual')
      .attrs(['ID'])
      .where('employeeNumberID', '=', execParams.employeeNumberID)
      .whereIf(execParams.orderID, 'orderID', '=', execParams.orderID)
      .whereIf(!execParams.orderID && execParams.sourceID, 'ID', '=', execParams.sourceID)
      .where('payElID', '=', execParams.payElID)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .selectAsObject()
    accrual.forEach(row => {
      store.run('insert', {
        execParams: {
          sicknessRequisDtID: execParams.ID,
          accrualID: row.ID
        }
      })
    })
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams) {
    const store = UB.DataStore('hr_sicknessRequisAccrual')
    const sicknessAccrual = UB.Repository('hr_sicknessRequisAccrual')
      .attrs(['ID'])
      .where('sicknessRequisDtID', '=', execParams.ID)
      .selectAsObject()
    sicknessAccrual.forEach(row => {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  }
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams) {
    const store = UB.DataStore('hr_sicknessRequisAccrual')
    const param = UB.Repository('hr_sicknessRequisDt')
      .attrs(['employeeNumberID', 'orderID', 'payElID', 'sourceID'])
      .selectById(execParams.ID)
    const accruals = UB.Repository('hr_accrual')
      .attrs(['ID'])
      .where('employeeNumberID', '=', param.employeeNumberID)
      .whereIf(param.orderID, 'orderID', '=', param.orderID)
      .whereIf(!param.orderID && param.sourceID, 'ID', '=', param.sourceID)
      .where('payElID', '=', param.payElID)
      .where(`(flagsRec & 8192 != 8192)`, 'custom')
      .selectAsObject()
    accruals.forEach(accr => {
      const reqAccr = UB.Repository('hr_sicknessRequisAccrual')
        .attrs(['ID'])
        .where('sicknessRequisDtID', '=', execParams.ID)
        .where('accrualID', '=', accr.ID)
        .selectAsObject()
      if (!reqAccr.length) {
        store.run('insert', {
          execParams: {
            sicknessRequisDtID: execParams.ID,
            accrualID: accr.ID
          }
        })
      }
    })
  }
}
