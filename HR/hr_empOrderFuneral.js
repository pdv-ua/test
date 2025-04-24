const UB = require('@unitybase/ub')
const orderService = require('../HR/modules/orderService')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

function beforeInsert (ctx) {
  ctx.mParams.execParams.orderState = 'PROJECT'
}

function beforeDelete (ctx) {
  orderService.beforeDeleteOrder(ctx)
  const execParams = ctx.mParams.execParams
  const errorMessages = []
  const inSicknessMeeting = UB.Repository('hr_sicknessMeetingDt')
    .attrs(['ID', 'sicknessMeetingID.orderState', 'sicknessMeetingID.orderNumber', 'sicknessMeetingID.orderDate'])
    .where('empOrderFuneralID', '=', execParams.ID)
    .where('sicknessMeetingID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()

  inSicknessMeeting.forEach(item => {
    if (item['sicknessMeetingID.orderState'] !== 'PROJECT') {
      errorMessages.push(UB.i18n(`Документ занесен у протокол №{0} від {1}, що проведено!`, item['sicknessMeetingID.orderNumber'], item['sicknessMeetingID.orderDate']))
    }
  })

  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо видалити документ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }

  if (inSicknessMeeting.length) {
    const store = UB.DataStore('hr_sicknessMeetingDt')
    inSicknessMeeting.forEach(item => {
      store.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
    store.freeNative()
  }
}

me.doPosting = function (ctx) {
}

me.doCancelPosting = function (ctx) {
}
