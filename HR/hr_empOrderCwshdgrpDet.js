const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const moment = require('moment')
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')
me.entity.addMethod('importList')

me.details = [
  {
    detailName: 'hr_empOrderCwshdgrpEmp',
    entityName: 'hr_empOrderCwshdgrpEmp',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'employeePositionID', 'employeePositionID.description', 'employeeID', 'dateRest', 'workHours', 'description'
    ], ['lineNum'])
  }
]

/**
 * Заповнення розширеного опису запису
 * Встановлює розширений опис запису деталі наказу, якщо сутність деталі має атрибут descriptionExt
 * Атрибут descriptionExt потрібен для вибору запису з комбобоксу (наприклад, при повернені з відпустки необхідно вибрати наказ, яким людина йшла у відпустку)
 * Встановлюється тільки при проведені наказу
 * @param {Number} ID ID запису
 */
me.getDescriptionExt = function (ID) {
  let d = UB.Repository(__entityName)
    .attrs(['orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  return UB.i18n(`Наказ про роботу у вихідні дні № {0} від {1}`, d['orderID.orderNumber'], moment(d['orderID.orderDate']).format('DD.MM.YYYY'))
}

function setAttrs (ctx) {
  let execParams = ctx.mParams.execParams
  if (execParams.dateFrom) {
    execParams.description = `${UB.i18n('Вихідний/святковий день')} ${dateService.getStringFormatDate(execParams.dateFrom, false, UB.i18n(' р.'))}`
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderCwshdgrpEmp'].insert.forEach(item => {
      item.orderID = execParams.orderID || instanceData.orderID
      item.organizationID = execParams.organizationID || instanceData.organizationID
      item.dateFrom = execParams.dateFrom || instanceData.dateFrom
      item.empOrderType = 'CWSHDGRP'
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details)
  if (execParams.dateFrom) {
    const store = UB.DataStore('hr_empOrderCwshdgrpEmp')
    UB.Repository('hr_empOrderCwshdgrpEmp')
      .attrs('ID')
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
      .forEach(row => {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            dateFrom: execParams.dateFrom
          }
        })
      })
    store.freeNative()
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderCwshdgrpEmp'].insert.forEach(item => {
      item.orderID = execParams.orderID
      item.organizationID = execParams.organizationID
      item.dateFrom = execParams.dateFrom
      item.empOrderType = 'CWSHDGRP'
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details)
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

me.doPosting = function ({ item, order, isImportOperation, currentPeriod, saved }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['dateFrom', 'typeCompensation', 'byRequest', 'dictTimeCostID', 'dictTimeCost2ID'])
    .selectById(item.ID)
  if (!currentPeriod) {
    currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  }
  if (para.dictTimeCostID) {
    const empList = UB.Repository('hr_empOrderCwshdgrpEmp')
      .attrs('employeeNumberID', 'employeeID', 'workHours', 'dateRest')
      .where('paraID', '=', item.ID)
      .selectAsObject()
    if (empList.length) {
      const dictVacationKindID = UB.Repository('hr_dictVacationKind')
        .attrs(['ID'])
        .where('code', '=', 'dWeekWork')
        .selectScalar()
      const timeSheet = []
      const vacStore = UB.DataStore('hr_empVacationPlan')
      empList.forEach(row => {
        if (para['typeCompensation'] === 'MONEY') {
          timeSheet.push({
            orderID: order.ID,
            employeeNumberID: row.employeeNumberID,
            periodID: currentPeriod.ID,
            dateWork: dateService.shiftDate(para.dateFrom),
            factTimeCostID: para.dictTimeCostID,
            factHour: row['workHours'],
            planHour: row['workHours'],
            overridePlanHours: true,
            isCorrection: true
          })
        } else {
          if (para['byRequest'] && dictVacationKindID) {
            let empVacPlanID
            const empVacPlan = UB.Repository('hr_empVacationPlan')
              .attrs(['ID', 'dayCount'])
              .where('dictVacationKindID', '=', dictVacationKindID)
              .where('employeeNumberID', '=', row.employeeNumberID)
              .where('employeeID', '=', row.employeeID)
              .where('dateTo', '=', '#maxdate')
              .selectSingle()
            if (empVacPlan) {
              empVacPlanID = empVacPlan.ID
            } else {
              empVacPlanID = vacStore.generateID()
              vacStore.run('insert', {
                __skipSelectAfterInsert: true,
                isOrderOperation: true,
                isImportOperation: isImportOperation,
                execParams: {
                  ID: empVacPlanID,
                  employeeNumberID: row.employeeNumberID,
                  employeeID: row.employeeID,
                  dictVacationKindID: dictVacationKindID,
                  dateFrom: para.dateFrom,
                  dateTo: dateService.maxDate(),
                  dayCount: 1,
                  orderID: null,
                  orderDetID: item.ID
                }
              })
            }
            orderService.insertByOrder({
              store: 'hr_empVacationPeriod',
              params: {
                empVacationPlanID: empVacPlanID,
                dateFrom: para.dateFrom,
                dateTo: para.dateFrom,
                dayCountPlan: 1,
                orderDetID: item.ID
              },
              saved: saved
            })
          }
          if (!para['byRequest']) {
            timeSheet.push({
              orderID: order.ID,
              employeeNumberID: row.employeeNumberID,
              periodID: currentPeriod.ID,
              dateWork: dateService.shiftDate(para.dateFrom),
              factTimeCostID: para.dictTimeCostID,
              factHour: row['workHours'],
              planHour: row['workHours'],
              overridePlanHours: true,
              isCorrection: true
            })
            if (row.dateRest && para.dictTimeCost2ID) {
              timeSheet.push({
                orderID: order.ID,
                employeeNumberID: row.employeeNumberID,
                periodID: currentPeriod.ID,
                dateWork: dateService.shiftDate(row.dateRest),
                factTimeCostID: para.dictTimeCost2ID,
                factHour: row['workHours'],
                planHour: row['workHours'],
                overridePlanHours: true,
                isCorrection: true
              })
            }
          }
        }
      })
      timService.setTimeSheet(timeSheet)
    }
  }
}

me.doCancelPosting = function (item) {
  const empNumbers = UB.Repository('hr_empOrderCwshdgrpEmp')
    .attrs('employeeNumberID')
    .where('paraID', '=', item.ID)
    .selectAsArrayOfValues()
  if (empNumbers.length) {
    timService.cancelTimeSheet(item.orderID, empNumbers)
  }
  orderService.restoreOldValues(item)
}

me.importList = function (ctx) {
  const mParams = ctx.mParams
  const organizationID = mParams.organizationID
  const onDate = dateService.shiftDate(mParams.onDate)
  const orderID = mParams.orderID
  const paraID = mParams.paraID
  const empOrderType = mParams.empOrderType
  const parsedData = JSON.parse(mParams.parsedData)
  const errors = []
  if (Array.isArray(parsedData) && parsedData.length) {
    const para = UB.Repository('hr_empOrderCwshdgrpDet')
      .attrs(['dateFrom', 'typeCompensation', 'byRequest', 'dictTimeCostID', 'dictTimeCost2ID'])
      .selectById(paraID)
    const employeeData = UB.Repository('hr_employeePositionS')
      .attrs('ID', 'description', 'employeeID', 'employeeNumberID', 'employeeNumberID.tabNum', 'employeeID.taxCode')
      .where('organizationID', '=', organizationID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeeNumberID.tabNum', 'in', parsedData.map(o => o.tabNum))
      .where('employeeID.taxCode', 'in', parsedData.map(o => o.taxCode))
      .selectAsObject({
        'employeeNumberID.tabNum': 'tabNum',
        'employeeID.taxCode': 'taxCode'
      })
    const data = []
    parsedData.forEach(item => {
      const emp = employeeData.find(o => o['tabNum'] === item['tabNum'] && o['taxCode'] === item['taxCode'])
      if (emp) {
        data.push({
          employeePositionID: emp['ID'],
          description: emp['description'],
          dateRest: dateService.getDateWithString(item['date']),
          workHours: Number(item['numberOfHours']) || 8,
          orderID,
          paraID,
          empOrderType,
          organizationID,
          dateFrom: para['dateFrom']
        })
      } else {
        errors.push(UB.i18n('Не знайдено працівника з таб.номером {0} та РНОКПП {1}', item['tabNum'], item['taxCode']))
      }
    })
    if (data.length) {
      const store = UB.DataStore('hr_empOrderCwshdgrpEmp')
      data.forEach(row => {
        store.run('insert', {
          execParams: row
        })
      })
    }
  }
  ctx.mParams.errors = JSON.stringify(errors)
}
