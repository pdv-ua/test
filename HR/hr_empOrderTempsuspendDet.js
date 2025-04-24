const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timService = require('../HR/modules/timService')
const calcService = require('../HR/modules/calcService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

function setAttrs (ctx) {
  orderService.setEmpOrderAttrs(ctx)
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

me.doPosting = function ({ item, order, isImportOperation, saved, isSingle = false, currentPeriod }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'dateFrom', 'dateTo', 'organizationID.mi_data_id', 'employeeID', 'employeePositionID', 'employeePositionID.accrualSum', 'employeePositionID.changeOrderID', 'employeeNumberID', 'employeeNumberID.description', 'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.description', 'errorText', 'isTempVacancy'])
    .selectById(item.ID)
  para.mi_unityEntity = item.mi_unityEntity

  const startVac = dateService.shiftDate(para.dateFrom)
  const vacPlan = UB.Repository('hr_empVacationPlan')
    .attrs('ID', 'isPause', 'dateFrom', 'dateTo', 'pauseOrderDetID', 'dictVacationKindID.isProportional')
    .where('employeeNumberID', '=', para.employeeNumberID)
    .where('dateTo', '>=', startVac)
    .selectAsObject()
  vacPlan.forEach(vacPlanItem => {
    const vacPeriod = UB.Repository('hr_empVacationPeriod')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dayCountPlan'])
      .where('empVacationPlanID', '=', vacPlanItem.ID)
      .selectAsObject()
    vacPeriod.forEach(perItem => {
      const periodDateFrom = dateService.shiftDate(perItem.dateFrom)
      const periodDateTo = dateService.shiftDate(perItem.dateTo)
      if (periodDateFrom > startVac) {
        orderService.deleteByOrder({
          store: 'hr_empVacationPeriod',
          params: {
            ID: perItem.ID
          },
          saved
        })
      } else if (periodDateFrom <= startVac && startVac < periodDateTo) {
        const params = {
          ID: perItem.ID,
          dateTo: dateService.addDays(startVac, -1)
        }
        const oldValues = {
          dateTo: perItem.dateTo
        }
        if (vacPlanItem['dictVacationKindID.isProportional']) {
          oldValues.dayCountPlan = perItem.dayCountPlan
          params.dayCountPlan = Math.round(perItem.dayCountPlan * dateService.dateDiff(periodDateFrom, params.dateTo) / (dateService.dateDiff(periodDateFrom, periodDateTo)))
        }
        orderService.updateByOrder({
          store: 'hr_empVacationPeriod',
          params,
          saved,
          oldValues
        })
      }
    })
    if (dateService.shiftDate(vacPlanItem.dateFrom) <= startVac) {
      orderService.updateByOrder({
        store: 'hr_empVacationPlan',
        params: {
          ID: vacPlanItem.ID,
          isPause: true,
          pauseOrderDetID: para.ID
        },
        saved: saved,
        oldValues: {
          isPause: vacPlanItem.isPause,
          pauseOrderDetID: vacPlanItem.pauseOrderDetID
        }
      })
    } else {
      orderService.deleteByOrder({
        store: 'hr_empVacationPlan',
        params: {
          ID: vacPlanItem.ID
        },
        saved: saved
      })
    }
  })

  let errorText = para.errorText || null
  if (errorText) {
    orderService.updateByOrder({
      store: 'hr_empOrderTempsuspendDet',
      params: {
        ID: para.ID,
        errorText: null
      },
      saved: saved,
      oldValues: {
        errorText: errorText
      }
    })
  }
  orderService.createActingAccrual({ para: para, saved: saved })
  if (isSingle) {
    orderService.saveOldValues(item, saved)
  }
}

me.doCancelPosting = function (item, isSingle = false) {
  if (item.orderState === 'CANCELED') {
    return
  }
  if (!isSingle) {
    timService.removeTimeSheetChange(item.orderID)
    timService.cancelTimeSheet(item.orderID)
  } else {
    let employeeNumberID = item.employeeNumberID

    if (!employeeNumberID) {
      employeeNumberID = UB.Repository(item.mi_unityEntity).attrs('employeeNumberID').selectById(item.ID).employeeNumberID
    }
    if (!employeeNumberID) {
      throw new UB.UBAbort(`${__entityName}.doCancelPosting -> no employeeNumberID found`)
    }
    timService.removeTimeSheetChange(item.orderID, item.ID)
    timService.cancelTimeSheet(item.orderID, [employeeNumberID])
    calcService.addCalcTimeSheetQueue({ employeeNumberID, entityName: 'hr_empOrderVacationlongDet' })
  }
  orderService.restoreOldValues(item)
}
