const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const orderService = require('../HR/modules/orderService')
const periodService = require('../HR/modules/periodService')
const timService = require('../HR/modules/timService')

me.details = [
  {
    detailName: 'empOrderMedexaminationListDet',
    entityName: 'hr_empOrderMedexaminationListDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'orderID', 'paraID', 'employeePositionID'
    ], ['lineNum'])
  }
]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)

me.entity.addMethod('clearDetail')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

function getDescription () {
  return UB.i18n(`компенсацію за проходження медогляду`)
}

function setAttrs (ctx, op) {
  const execParams = ctx.mParams.execParams
  execParams.description = getDescription()
  execParams.title = '..'
}

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

function afterInsert (ctx) {
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  orderService.saveDetails(ctx, me.details)
}

/* Очищення працівників пункту наказу
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.paraID пункт наказу
 */
me.clearDetail = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderMedexaminationListDet')
  const existing = UB.Repository('hr_empOrderMedexaminationListDet')
    .attrs('ID')
    .where('paraID', '=', mParams.paraID)
    .selectAsObject()
  existing.forEach(item => {
    ds.run('delete', { execParams: { ID: item.ID } })
  })
  ds.freeNative()
}

me.doPosting = function (orderID) {
  const store = UB.DataStore('hr_empCheckMedical')
  UB.Repository('hr_empOrderMedexaminationDet')
    .attrs(['ID', 'dictTimeCostID', 'payElID', 'organizationID', 'dictVacationKindID',
      'dictVacationKindID.dictTimeCostID', 'orderID.orderDate', 'dictCheckMedicalID'])
    .where('orderID', '=', orderID)
    .selectAsObject()
    .forEach(para => {
      UB.Repository('hr_empOrderMedexaminationListDet')
        .attrs(['ID', 'dateFrom', 'dateTo', 'dateNextMedEx', 'employeeID', 'paraID', 'employeePositionID', 'employeeNumberID'])
        .where('paraID', '=', para.ID)
        .selectAsObject()
        .forEach(row => {
          const newID = store.generateID()
          store.run('insert', {
            __skipSelectAfterInsert: true,
            isOrderOperation: true,
            execParams: {
              ID: newID,
              employeeID: row.employeeID,
              dateCheck: row.dateFrom,
              dateTo: row.dateTo,
              dateNext: row.dateNextMedEx,
              orderID: orderID,
              paraID: row.paraID,
              dictCheckMedicalID: para.dictCheckMedicalID
            }
          })

          let currentPeriod = periodService.getCurrentPeriod(para.organizationID)
          let timeCostID
          if (para['dictVacationKindID.dictTimeCostID']) {
            timeCostID = para['dictVacationKindID.dictTimeCostID']
          }
          if (para['dictTimeCostID']) {
            timeCostID = para['dictTimeCostID']
          }

          if (timeCostID) {
            const params = []
            let dayDate = dateService.shiftDate(row.dateFrom)
            let dateTo = dateService.shiftDate(row.dateTo)
            while (dayDate <= dateTo) {
              params.push({
                orderID: orderID,
                entityName: 'hr_empOrder',
                employeeNumberID: row.employeeNumberID,
                periodID: currentPeriod.ID,
                dateWork: dayDate,
                factTimeCostID: timeCostID
              })
              dayDate = dateService.nextDay(dayDate)
            }
            timService.setTimeSheet(params)
          }

          if (para.dictVacationKindID) {
            const dayCount = dateService.dayDiff(dateService.shiftDate(row.dateFrom), dateService.shiftDate(row.dateTo)) + 1
            setVacationDays(row.employeeID, row.employeeNumberID,
              para.dictVacationKindID,
              para['orderID.orderDate'],
              dayCount,
              para.ID)
          }
        })
    })
}

me.doCancelPosting = function (order) {
  const store = UB.DataStore('hr_empCheckMedical')
  const rows = UB.Repository('hr_empCheckMedical')
    .attrs(['ID'])
    .where('orderID', '=', order.ID)
    .selectAsObject()
  rows.forEach(row => {
    store.run('delete', {
      skipOrderDelete: true,
      execParams: {
        ID: row.ID
      }
    })
  })

  const storeVacPlan = UB.DataStore('hr_empVacationPlan')
  UB.Repository('hr_empOrderMedexaminationDet')
    .attrs(['ID'])
    .where('orderID', '=', order.ID)
    .selectAsObject()
    .forEach(para => {
      UB.Repository('hr_empVacationPlan')
        .attrs(['ID'])
        .where('orderDetID', '=', para.ID)
        .selectAsObject()
        .forEach(plan => {
          storeVacPlan.run('delete', {
            skipOrderDelete: true,
            execParams: {
              ID: plan.ID
            }
          })
        })
    })

  timService.removeTimeSheetChange(order.ID)
  timService.cancelTimeSheet(order.ID)
}

function setVacationDays (employeeID, employeeNumberID, dictVacationKindID, dateFrom, dayCount, paraID) {
  const saved = { inserted: [], updated: [] }
  const empVacPlanID = UB.DataStore('hr_empVacationPlan').generateID()
  orderService.insertByOrder({
    store: 'hr_empVacationPlan',
    params: {
      ID: empVacPlanID,
      employeeNumberID,
      employeeID,
      dictVacationKindID,
      dateFrom,
      dayCount,
      orderID: null,
      orderDetID: paraID
    },
    saved
  })
  orderService.insertByOrder({
    store: 'hr_empVacationPeriod',
    params: {
      empVacationPlanID: empVacPlanID,
      dateFrom,
      dateTo: dateService.addDays(dateFrom, dayCount - 1),
      dayCountPlan: dayCount
    },
    saved: saved
  })
}
