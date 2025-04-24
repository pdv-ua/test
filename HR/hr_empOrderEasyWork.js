const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const rlService = require('../HR/modules/rlService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('select:after', afterSelect)

me.entity.addMethod('calcAvgPay')
me.details = [
  {
    detailName: 'accrualAvg',
    entityName: 'hr_accrualAvg',
    docIDName: 'orderID',
    fieldList: orderService.setFieldListAttribute(['orderID', 'periodID.name', 'dateFrom', 'dateTo',
      'flagsFix', 'opDays', 'opHours', 'baseSum', 'baseSumNotIndex', 'opSum', 'opKoef', 'accrualDt'
    ], ['lineNum', 'mi_modifyDate'])
  }
]

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  setDefaultAttribute(ctx)
}

function beforeUpdate (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  setDefaultAttribute(ctx)
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail.orderRegistryDt.insert.forEach(item => {
      item.orderDateFrom = execParams.dateFrom || instanceData.dateFrom
      item.orderDateTo = execParams.dateTo || instanceData.dateTo
      item.orderDate = execParams.orderDate || instanceData.orderDate
      item.orderNumber = execParams.orderNumber || instanceData.orderNumber
      item.orderID = execParams.ID
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
}

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Документ {0} - проведено. Видалення неможливе.', instanceData.get('description'))}>>>`)
  }
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore('hr_orderRegistryDt')
  const orderRegistryDt = UB.Repository('hr_orderRegistryDt')
    .attrs(['ID', 'mi_modifyDate'])
    .where('orderID', '=', execParams.ID)
    .selectAsObject()
  orderRegistryDt.forEach(record => {
    store.run('delete', {
      skipOrderDelete: true,
      execParams: {
        ID: record.ID,
        mi_modifyDate: record.mi_modifyDate
      }
    })
  }
  )
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams

  const formData = JSON.parse(ctx.mParams.formData)
  formData.detail.orderRegistryDt.insert.forEach(item => {
    item.orderDateFrom = execParams.dateFrom
    item.orderDateTo = execParams.dateTo
    item.orderDate = execParams.orderDate
    item.orderNumber = execParams.orderNumber
    item.orderID = execParams.ID
    item.empOrderID = execParams.empOrderID || null
    item.empOrderDetID = execParams.empOrderDetID || null
  })
  ctx.mParams.formData = JSON.stringify(formData)

  orderService.saveDetails(ctx, me.details, { skipOrderDelete: true })
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function setDefaultAttribute (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
  if (!instanceData && !execParams.orderState) {
    execParams.orderState = 'PROJECT'
  }

  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = orderService.getOrderNum(me.entity.name,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
}

me.calcAvgPay = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const currentPeriod = periodService.getCurrentPeriod(params.orgID)
  params.periodCalcID = currentPeriod.ID
  mParams.resultData = JSON.stringify(rlService.calculateOrderAccrual(params))
}
