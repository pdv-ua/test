const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const timeCostService = require('../HR/modules/timeCostService')
const dateService = require('../AC/modules/dataServices/dateService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

me.entity.addMethod('addPeriods')
me.entity.addMethod('clearPeriods')

function getDescription (dateFrom) {
  let dateFromStr = dateService.formatDate(dateFrom)
  return UB.i18n(`Компенсація відпустки з {0}`, dateFromStr)
}

function setAttrs (ctx, op) {
  orderService.setEmpOrderAttrs(ctx, {
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let dateFrom = execParams.dateFrom || instanceData.dateFrom
  execParams.description = getDescription(dateFrom)
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

/* Додати залишки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.paraID пункт наказу
 * @param {number} ctx.mParams.execParams.orderID наказ
 * @param {number} ctx.mParams.execParams.employeeNumberID таб. номер
 * @return {string} текст помилки
 */
me.addPeriods = (ctx) => {
  const mParams = ctx.mParams
  const paraID = mParams.paraID
  const orderID = mParams.orderID
  const orgID = mParams.orgID
  const employeeNumberID = mParams.employeeNumberID
  const isOnlyCalc = mParams.onlyCalculate
  let onDate = mParams.onDate
  if (!onDate) {
    onDate = UB.Repository('hr_empOrderVacationcompDet')
      .attrs(['dateFrom'])
      .where('ID', '=', paraID)
      .selectScalar()
  }
  const fixMonth = orgID ? (settingsService.get('hrVacFixMonth', orgID) || 0) : 0
  const vacPeriods = []
  const periods = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dayDiff', 'dateFrom', 'dateTo', 'dayCountPlan', 'dayCountFact', 'dayComp', 'dayFix', 'isPartYear',
      'empVacationPlanID.dictVacationKindID.isProportional', 'empVacationPlanID.employeeNumberID.orgID', 'descriptionEx',
      'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.name', 'empVacationPlanID.dictVacationKindID.code'
    ])
    .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .where('empVacationPlanID.dictVacationKindID.isVactComp', '=', true)
    .where('dayDiff', '>', 0)
    .where('dateFrom', '<=', onDate)
    .selectAsObject({
      'empVacationPlanID.dictVacationKindID.isProportional': 'isProportional',
      'empVacationPlanID.employeeNumberID.orgID': 'orgID'
    })
  if (periods.length > 0) {
    const vacComp = UB.Repository('hr_empVacationComp')
      .attrs(['empVacationPeriodID', 'SUM([dayComp])'])
      .where('empVacationPeriodID.empVacationPlanID.employeeNumberID', '=', employeeNumberID)
      .where('empVacationPeriodID.mi_deleteDate', '>=', '#maxdate')
      .where('empVacationPeriodID.empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .groupBy(['empVacationPeriodID'])
      .selectAsObject({
        'SUM([dayComp])': 'dayComp'
      })
    const storeEmpVacListDet = UB.DataStore('hr_empOrderVacationcompListDet')
    if (!isOnlyCalc) {
      const empVacListDet = UB.Repository('hr_empOrderVacationcompListDet')
        .attrs(['ID'])
        .where('paraID', '=', paraID)
        .selectAsObject()
      const mdfDate = new Date()
      empVacListDet.forEach(vacItem => {
        storeEmpVacListDet.run('delete', {
          skipOrderDelete: true,
          execParams: {
            ID: vacItem.ID,
            mi_modifyDate: mdfDate
          }
        })
      })
    }
    for (let i = 0; i < periods.length; i++) {
      let period = periods[i]
      let dayDiff = period.dayDiff || 0
      let dayComp = dayDiff
      let isLast = new Date(period.dateTo) >= onDate
      if (isLast) {
        dayDiff = timeCostService.getDayDiffOnDate({ perItem: period, onDate: onDate, orgID: period.orgID, employeeNumberID, fixMonth }) || 0
        dayComp = dayDiff
        let vacCompItem = vacComp.find(compItem => compItem.empVacationPeriodID === period.ID)
        if (vacCompItem) {
          dayComp = dayComp > vacCompItem.dayComp ? dayComp - vacCompItem.dayComp : 0
        }
      }
      if (dayDiff > 0) {
        if (isOnlyCalc) {
          vacPeriods.push({
            empVacationPeriodID: period.ID,
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            'empVacationPeriodID.descriptionEx': period.descriptionEx,
            'empVacationPeriodID.empVacationPlanID.dictVacationKindID': period['empVacationPlanID.dictVacationKindID'],
            'empVacationPeriodID.empVacationPlanID.dictVacationKindID.name': period['empVacationPlanID.dictVacationKindID.name'],
            'dictVacationKindID.code': period['dictVacationKindID.code'],
            dayDiff: dayDiff,
            dayComp: dayComp
          })
        } else {
          storeEmpVacListDet.run('insert', {
            execParams: {
              itemIdx: i + 1,
              orderID: orderID,
              paraID: paraID,
              empVacationPeriodID: period.ID,
              dayDiff: dayDiff,
              dayComp: dayComp
            }
          })
        }
      }
    }
    storeEmpVacListDet.freeNative()
  }
  if (isOnlyCalc && vacPeriods.length) {
    mParams.vacPeriods = JSON.stringify(vacPeriods)
  }
  return true
}

/* Очистити залишки
 * @param {object} ctx контекст
 * @param {number} ctx.mParams.execParams.paraID пункт наказу
 */
me.clearPeriods = (ctx) => {
  const mParams = ctx.mParams
  const paraID = mParams.paraID
  const storeEmpVacListDet = UB.DataStore('hr_empOrderVacationcompListDet')
  const empVacListDet = UB.Repository('hr_empOrderVacationcompListDet')
    .attrs(['ID'])
    .where('paraID', '=', paraID)
    .selectAsObject()
  const mdfDate = new Date()
  empVacListDet.forEach(vacItem => {
    storeEmpVacListDet.run('delete', {
      skipOrderDelete: true,
      execParams: {
        ID: vacItem.ID,
        mi_modifyDate: mdfDate
      }
    })
  })
  storeEmpVacListDet.freeNative()
  return true
}

me.doPosting = function ({ item, order, isImportOperation, saved, isSingle = false }) {
  const compDet = UB.Repository('hr_empOrderVacationcompDet')
    .attrs(['errorText'])
    .selectById(item.ID)
  const para = UB.Repository('hr_empOrderVacationcompListDet')
    .attrs(['ID', 'paraID', 'empVacationPeriodID', 'dayComp', 'grantParaID.employeePositionID', 'grantParaID.employeeNumberID',
      'grantParaID.employeeID', 'grantParaID.dateFrom', 'empVacationPeriodID.empVacationPlanID.dictVacationKindID'])
    .where('paraID', '=', item.ID)
    .where('dayComp', '>', 0)
    .selectAsObject({
      'grantParaID.employeePositionID': 'employeePositionID',
      'grantParaID.employeeNumberID': 'employeeNumberID',
      'grantParaID.employeeID': 'employeeID',
      'grantParaID.dateFrom': 'dateFrom',
      'empVacationPeriodID.empVacationPlanID.dictVacationKindID': 'dictVacationKindID'
    })
  para.forEach(compItem => {
    orderService.insertByOrder({
      store: 'hr_empVacationComp',
      params: {
        empVacationPeriodID: compItem.empVacationPeriodID,
        dayComp: compItem.dayComp,
        recalcDate: compItem.dateFrom
      },
      saved: saved
    })

    orderService.insertByOrder({
      store: 'hr_employeeVacation',
      params: {
        organizationID: order.organizationID,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        orderID: item.orderID,
        paraID: compItem.paraID,
        dictVacationKindID: compItem.dictVacationKindID,
        employeeID: compItem.employeeID,
        employeePositionID: compItem.employeePositionID,
        employeeNumberID: compItem.employeeNumberID,
        dayCount: compItem.dayComp,
        cntDay: compItem.dayComp,
        dateFrom: compItem.dateFrom,
        dateTo: null,
        dictPeriodID: order.periodID,
        empVacationPeriodID: compItem.empVacationPeriodID,
        avgSum: 0,
        vacationStatus: 'COMP',
        orderState: 'POSTED'
      },
      saved: saved
    })
  })
  if (compDet.errorText) {
    orderService.updateByOrder({
      store: 'hr_empOrderVacationcompDet',
      params: {
        ID: para.ID,
        errorText: null
      },
      saved: saved,
      oldValues: {
        errorText: compDet.errorText
      }
    })
  }
}

me.doCancelPosting = function (item, isSingle) {
}
