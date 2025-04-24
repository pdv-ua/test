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
    detailName: 'hr_empOrderCwsRelaxhdGrpEmp',
    entityName: 'hr_empOrderCwsRelaxhdGrpEmp',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'employeePositionID', 'employeePositionID.description', 'employeeID', 'dateFrom', 'dateRest', 'workHours',
      'description', 'reasonOrderID', 'reasonOrderID.description', 'employeeNumberID'
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
  return UB.i18n(`Наказ про компенсацію за роботу в вихідний день № {0} від {1}`, d['orderID.orderNumber'], moment(d['orderID.orderDate']).format('DD.MM.YYYY'))
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderCwsRelaxhdGrpEmp'].insert.forEach(item => {
      item.orderID = execParams.orderID || instanceData.orderID
      item.organizationID = execParams.organizationID || instanceData.organizationID
      item.empOrderType = 'CWSRELAXHDGRP'
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderCwsRelaxhdGrpEmp'].insert.forEach(item => {
      item.orderID = execParams.orderID
      item.organizationID = execParams.organizationID
      item.empOrderType = 'CWSRELAXHDGRP'
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
    .attrs(['typeCompensation', 'dictTimeCostID', 'dictTimeCost2ID'])
    .selectById(item.ID)
  if (!currentPeriod) {
    currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  }
  if (para.dictTimeCostID) {
    const empList = UB.Repository('hr_empOrderCwsRelaxhdGrpEmp')
      .attrs('employeePositionID', 'employeeNumberID', 'employeeID', 'workHours', 'dateRest', 'dateFrom', 'reasonOrderID')
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
        timeSheet.push({
          orderID: order.ID,
          employeeNumberID: row.employeeNumberID,
          periodID: currentPeriod.ID,
          dateWork: dateService.shiftDate(row.dateFrom),
          factTimeCostID: para.dictTimeCostID,
          factHour: row['workHours'],
          planHour: row['workHours'],
          overridePlanHours: true,
          isCorrection: true
        })
        if (para['typeCompensation'] === 'HOLIDAY' && row.dateRest && para.dictTimeCost2ID) {
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
        if (row['reasonOrderID']) {
          const empVacPeriod = UB.Repository('hr_empVacationPeriod')
            .attrs('ID', 'dayCountPlan', 'dayDiff')
            .where('orderDetID.orderID', '=', row['reasonOrderID'])
            .where('empVacationPlanID.employeeNumberID', '=', row.employeeNumberID)
            .where('dayDiff', '>', 0)
            .limit(1)
            .selectSingle({
              'empVacationPlanID.dictVacationKindID': 'dictVacationKindID'
            })
          if (empVacPeriod) {
            orderService.updateByOrder({
              store: 'hr_empVacationPeriod',
              params: {
                ID: empVacPeriod.ID,
                dayCountPlan: (empVacPeriod.dayCountPlan || 0) - 1,
                dayDiff: (empVacPeriod.dayDiff || 0) - 1
              },
              oldValues: {
                dayCountPlan: empVacPeriod.dayCountPlan,
                dayDiff: empVacPeriod.dayDiff
              },
              saved: saved
            })
          }
        }
        if (!row['reasonOrderID'] && !row['dateRest']) {
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
                dateFrom: row.dateFrom,
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
              dateFrom: row.dateFrom,
              dateTo: row.dateFrom,
              dayCountPlan: 1,
              orderDetID: item.ID
            },
            saved: saved
          })
        }
      })
      timService.setTimeSheet(timeSheet)
      vacStore.freeNative()
    }
  }
}

me.doCancelPosting = function (item) {
  const empNumbers = UB.Repository('hr_empOrderCwsRelaxhdGrpEmp')
    .attrs('employeeNumberID')
    .where('paraID', '=', item.ID)
    .selectAsArrayOfValues()
  orderService.restoreOldValues(item)
  if (empNumbers.length) {
    timService.cancelTimeSheet(item.orderID, empNumbers)
    const empVacPlan = UB.Repository('hr_empVacationPlan')
      .attrs(['ID'])
      .where('employeeNumberID', 'in', empNumbers)
      .where('orderDetID', '=', item.ID)
      .selectAsObject()
    const store = UB.DataStore('hr_empVacationPlan')
    empVacPlan.forEach(vacPlan => {
      const vacPeriod = UB.Repository('hr_empVacationPeriod')
        .attrs('ID')
        .where('empVacationPlanID', '=', vacPlan.ID)
        .limit(1)
        .selectSingle()
      if (!vacPeriod) {
        store.run('delete', {
          execParams: {
            ID: vacPlan.ID
          }
        })
      }
    })
    store.freeNative()
  }
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
          organizationID,
          employeePositionID: emp['ID'],
          description: emp['description'],
          dateFrom: dateService.getDateWithString(item['workDay']),
          dateRest: dateService.getDateWithString(item['dayOff']),
          workHours: Number(item['numberOfHours']) || 8,
          orderID,
          paraID,
          empOrderType
        })
      } else {
        errors.push(UB.i18n('Не знайдено працівника з таб.номером {0} та РНОКПП {1}', item['tabNum'], item['taxCode']))
      }
    })
    if (data.length) {
      const store = UB.DataStore('hr_empOrderCwsRelaxhdGrpEmp')
      data.forEach(row => {
        store.run('insert', {
          execParams: row
        })
      })
    }
  }
  ctx.mParams.errors = errors.length ? JSON.stringify(errors) : null
}
