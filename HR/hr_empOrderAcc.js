const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const moment = require('moment')
const ebs = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', ctx => {
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  checkOrder(ctx)
  checkPeriod(ctx)
  checkSumAndRate(ctx)
})
me.on('update:before', ctx => {
  ebs.setDateTo(ctx)
  checkOrder(ctx)
  checkPeriod(ctx)
  checkSumAndRate(ctx)
})
me.on('delete:before', ctx => {
  checkOrder(ctx)
})

me.entity.addMethod('replaceDateFrom')
me.entity.addMethod('fillOrderAccrual')
me.entity.addMethod('clearOrderAccrual')

function checkOrder (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  let orderID = execParams.empOrderID || instanceData.empOrderID
  let orderState
  if (!orderID) {
    orderState = UB.Repository(__entityName).attrs(['empOrderID.orderState']).selectById(execParams.ID)['empOrderID.orderState']
  } else {
    orderState = UB.Repository('hr_empOrder').attrs(['orderState']).selectById(orderID).orderState
  }
  if (orderState !== 'PROJECT' && orderState !== 'ON_COMPLETION') {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ проведенено, зміни неможливі')}>>>`)
  }
}

function checkSumAndRate (ctx) {
  let instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  const payElID = execParams.payElID || instanceData.payElID
  if (!ctx.mParams.skipError) {
    const methodValuation = UB.Repository('hr_payEl').attrs(['methodID.valuation']).selectById(payElID)
    if (methodValuation) {
      if (methodValuation['methodID.valuation'] === 'SUM' && !execParams.accrualSum && !instanceData.accrualSum) {
        throw new UB.UBAbort(`<<<${UB.i18n('Необхідно вказати суму')}>>>`)
      }
      if (methodValuation['methodID.valuation'] === 'RATE' && !execParams.accrualRate && !instanceData.accrualRate) {
        throw new UB.UBAbort(`<<<${UB.i18n('Необхідно вказати відсоток')}>>>`)
      }
      if ((methodValuation['methodID.valuation'] !== 'DICT') && !execParams.accrualSum && !execParams.accrualRate && !instanceData.accrualSum && !instanceData.accrualRate) {
        throw new UB.UBAbort(`<<<${UB.i18n('Необхідно вказати суму або відсоток')}>>>`)
      }
    }
  }
}

function checkPeriod (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (execParams.payElID === undefined && execParams.dateFrom === undefined && execParams.dateTo === undefined && execParams.empOrderDetID === undefined) {
    return
  }
  let dateFrom = "'" + moment(execParams.dateFrom || instanceData.dateFrom).add(-1, 'days').format('YYYY-MM-DD') + "'"
  let dateTo = execParams.dateTo || instanceData.dateTo
  if (dateTo === '#maxdate') {
    dateTo = `'9999-12-31'`
  } else {
    dateTo = "'" + moment(dateTo).format('YYYY-MM-DD') + "'"
  }
  let payElID = execParams.payElID || instanceData.payElID
  let empOrderDetID = execParams.empOrderDetID || instanceData.empOrderDetID
  let data = UB.Repository(__entityName).attrs('payElID')
    .where('payElID', '=', payElID)
    .where('empOrderDetID', '=', empOrderDetID)
    .where('ID', '<>', execParams.ID)
    .where(`((dateFrom >= ${dateFrom} and dateFrom < ${dateTo}) or 
            (dateTo <= ${dateTo} and dateTo > ${dateFrom}) or
            (dateFrom < ${dateTo} and dateTo > ${dateFrom}) or
            (dateFrom >= ${dateFrom} and dateTo <= ${dateTo}))`, 'custom')
    .select()
  if (!data.eof) {
    throw new UB.UBAbort(`<<<${UB.i18n('Виявлено перетин періодів однакових нарахувань у пункті наказу')}>>>`)
  }
}

me.replaceDateFrom = function (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.empOrderDetID && !execParams.dateFrom) {
    return
  }
  const accruals = UB.Repository(__entityName)
    .attrs('ID')
    .where('empOrderDetID', '=', execParams.empOrderDetID)
    .selectAsObject()
  const store = UB.DataStore(__entityName)
  accruals.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      skipError: true,
      execParams: {
        ID: row.ID,
        dateFrom: dateService.shiftDate(execParams.dateFrom)
      }
    })
  })
}

me.fillOrderAccrual = function (ctx) {
  const orderID = ctx.mParams.empOrderID
  const orderDetID = ctx.mParams.empOrderDetID
  const employeeID = ctx.mParams.employeeID
  const dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  const onlyNotClosable = ctx.mParams.onlyNotClosable

  const store = UB.DataStore('hr_empOrderAcc')

  UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderID', '=', orderID)
    .where('empOrderDetID', '=', orderDetID)
    .selectAsArrayOfValues().forEach(ID => {
      store.run('delete', {
        execParams: {
          ID
        }
      })
    })

  const accruals = UB.Repository('hr_employeeAccrual')
    .attrs(['payElID', 'accrualRate', 'accrualSum', 'dateFrom', 'dateTo'])
    .where('employeeID', '=', employeeID)
    .whereIf(onlyNotClosable, 'payElID.notCloseOnChangeEmpPos', '=', 1)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()
  accruals.forEach(item => {
    store.run('insert', {
      skipError: true,
      execParams: {
        empOrderID: orderID,
        empOrderDetID: orderDetID,
        payElID: item.payElID,
        dateFrom: dateFrom,
        dateTo: item.dateTo,
        accrualSum: item.accrualSum,
        accrualRate: item.accrualRate
      }
    })
  })
}

me.clearOrderAccrual = function (ctx) {
  const orderID = ctx.mParams.empOrderID
  const orderDetID = ctx.mParams.empOrderDetID
  const store = UB.DataStore('hr_empOrderAcc')
  UB.Repository('hr_empOrderAcc')
    .attrs('ID')
    .where('empOrderID', '=', orderID)
    .where('empOrderDetID', '=', orderDetID)
    .selectAsArrayOfValues()
    .forEach(ID => {
      store.run('delete', {
        execParams: {
          ID
        }
      })
    })
}
