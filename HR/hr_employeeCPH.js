const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)

function beforeInsert (ctx) {
  setDescription(ctx)
  const execParams = ctx.mParams.execParams
  if (execParams.payElID && execParams.paySumMonth) {
    const store = UB.DataStore('hr_employeeAccrual')
    execParams.employeeAccrualID = store.generateID()
    const employeeID = UB.Repository('hr_employeeNumberS').attrs(['employeeID']).where('ID', '=', execParams.employeeNumberID).selectScalar()
    store.run('insert', {
      execParams: {
        ID: execParams.employeeAccrualID,
        employeeNumberID: execParams.employeeNumberID,
        employeeID,
        payElID: execParams.payElID,
        accrualSum: execParams.paySumMonth || 0,
        remindSum: execParams.remindSum || 0,
        dateFrom: dateService.shiftDate(execParams.dateFrom),
        dateTo: execParams.dateTo ? dateService.shiftDate(execParams.dateTo) : dateService.maxDate(),
        orderNumber: execParams.orderNumber,
        orderDate: execParams.orderDate
      }
    })
  }
}

function beforeUpdate (ctx) {
  setDescription(ctx)
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const store = UB.DataStore('hr_employeeAccrual')
  if (!ctx.mParams.skipEmployeeAccrual) {
    if (!instanceData.employeeAccrualID) {
      if ((execParams.payElID || (execParams.payElID === undefined && instanceData.payElID)) &&
        (execParams.paySumMonth || (execParams.paySumMonth === undefined && instanceData.paySumMonth))) {
        execParams.employeeAccrualID = store.generateID()
        const employeeID = UB.Repository('hr_employeeNumberS').attrs(['employeeID']).where('ID', '=', execParams.employeeNumberID || instanceData.employeeNumberID).selectScalar()
        store.run('insert', {
          execParams: {
            ID: execParams.employeeAccrualID,
            employeeNumberID: execParams.employeeNumberID || instanceData.employeeNumberID,
            employeeID,
            payElID: execParams.payElID || instanceData.payElID,
            accrualSum: execParams.paySumMonth !== undefined ? (execParams.paySumMonth || 0) : instanceData.paySumMonth,
            remindSum: execParams.remindSum !== undefined ? (execParams.remindSum || 0) : instanceData.remindSum,
            dateFrom: dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom),
            dateTo: (execParams.dateTo || (execParams.dateTo === undefined && instanceData.dateTo)) ? dateService.shiftDate(execParams.dateTo || instanceData.dateTo) : dateService.maxDate(),
            orderNumber: execParams.orderNumber || instanceData.orderNumber,
            orderDate: execParams.orderDate || instanceData.orderDate
          }
        })
      }
    } else {
      const employeeAccrual = UB.Repository('hr_employeeAccrual')
        .attrs(['mi_deleteUser'])
        .where('ID', '=', instanceData.employeeAccrualID)
        .misc({ __allowSelectSafeDeleted: true })
        .selectSingle()

      if ((execParams.payElID === null || execParams.paySumMonth === null) && !employeeAccrual.mi_deleteUser) {
        store.run('delete', {
          execParams: {
            ID: instanceData.employeeAccrualID
          }
        })
      } else if ((execParams.payElID || instanceData.payElID) && (execParams.payElID || instanceData.payElID)) {
        if (employeeAccrual.mi_deleteUser) {
          store.execSQL(`update hr_employeeAccrual set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, {
            ID: instanceData.employeeAccrualID
          })
          store.execSQL(`update hr_order set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, {
            ID: instanceData.employeeAccrualID
          })
        }
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: instanceData.employeeAccrualID,
            dateFrom: dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom),
            dateTo: (execParams.dateTo || (execParams.dateTo === undefined && instanceData.dateTo)) ? dateService.shiftDate(execParams.dateTo || instanceData.dateTo) : dateService.maxDate(),
            payElID: execParams.payElID || instanceData.payElID,
            accrualSum: execParams.paySumMonth !== undefined ? (execParams.paySumMonth || 0) : instanceData.paySumMonth,
            remindSum: execParams.remindSum !== undefined ? (execParams.remindSum || 0) : instanceData.remindSum,
            orderNumber: execParams.orderNumber || instanceData.orderNumber,
            orderDate: execParams.orderDate || instanceData.orderDate
          }
        })
      }
    }
  }
}

function beforeDelete (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (instanceData.employeeAccrualID) {
    const employeeAccrual = UB.Repository('hr_employeeAccrual')
      .attrs(['mi_deleteUser'])
      .where('ID', '=', instanceData.employeeAccrualID)
      .misc({ __allowSelectSafeDeleted: true })
      .selectSingle()
    if (!employeeAccrual.mi_deleteUser) {
      const store = UB.DataStore('hr_employeeAccrual')
      store.run('delete', {
        execParams: {
          ID: instanceData.employeeAccrualID
        }
      })
    }
  }
}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const fullFIO = UB.Repository('hr_employeeNumberS')
    .attrs(['employeeID.fullFIO'])
    .where('ID', '=', execParams.employeeNumberID || instanceData.employeeNumberID)
    .select().get(0)
  let period = UB.i18n(`з {0}`, dateService.formatDate(execParams.dateFrom || instanceData.dateFrom))
  if (execParams.dateTo || instanceData.dateTo) {
    period += UB.i18n(` по {0}`, dateService.formatDate(execParams.dateTo || instanceData.dateTo))
  }
  execParams.description = UB.i18n(`{0} № {1} від {2} {3}`, fullFIO, (execParams.orderNumber || instanceData.orderNumber) || ' ', dateService.formatDate(execParams.orderDate || instanceData.orderDate), period)
}
