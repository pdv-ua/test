const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const orderService = require('../HR/modules/orderService')
const timService = require('./modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('doPosting')
me.entity.addMethod('importList')

me.details = [
  {
    detailName: 'hr_empOrderEmployeeDet',
    entityName: 'hr_empOrderEmployeeDet',
    docIDName: 'paraID',
    fieldList: orderService.setFieldListAttribute([
      'itemIdx', 'employeePositionID', 'employeePositionID.description', 'employeeID', 'dateFrom', 'dateTo', 'description'
    ], ['lineNum'])
  }
]

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  ctx.mParams.method = 'insert'
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ebs.setDateTo(ctx)
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderEmployeeDet'].insert.forEach(item => {
      item.orderID = execParams.orderID || instanceData.orderID
      item.isExternal = 0
    })
    ctx.mParams.formData = JSON.stringify(formData)
  }
  orderService.saveDetails(ctx, me.details)
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (ctx.mParams.formData) {
    const formData = JSON.parse(ctx.mParams.formData)
    formData.detail['hr_empOrderEmployeeDet'].insert.forEach(item => {
      item.orderID = execParams.orderID
      item.isExternal = 0
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

me.doPosting = function ({ item, order, saved }) {
  const para = UB.Repository(item.mi_unityEntity)
    .attrs(['ID', 'orderID', 'payElID', 'payElID.dictTimeCostID'])
    .selectById(item.ID)
  if (para['payElID.dictTimeCostID']) {
    const params = []
    const employeeDet = UB.Repository('hr_empOrderEmployeeDet')
      .attrs('employeePositionID', 'employeePositionID.employeeNumberID', 'employeePositionID.description', 'dateFrom', 'dateTo')
      .where('paraID', '=', item.ID)
      .selectAsObject()
    employeeDet.forEach(row => {
      let dayDate = dateService.shiftDate(row.dateFrom)
      let dateTo = dateService.shiftDate(row.dateTo)
      while (dayDate <= dateTo) {
        params.push({
          orderID: para.orderID,
          entityName: 'hr_empOrder',
          employeeNumberID: row['employeePositionID.employeeNumberID'],
          periodID: order.periodID,
          dateWork: dayDate,
          factTimeCostID: para['payElID.dictTimeCostID'],
          factHour: 8
        })
        dayDate = dateService.nextDay(dayDate)
      }
    })
    timService.setTimeSheet(params)
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
        const dateFrom = dateService.getDateWithString(item['dateFrom'])
        const dateTo = dateService.getDateWithString(item['dateTo'])
        if (!dateFrom || !dateTo) {
          errors.push(UB.i18n('Для працівника з таб.номером {0} та РНОКПП {1} не вказана "Дата з" або "Дата по"', item['tabNum'], item['taxCode']))
        } else if (dateFrom <= dateTo) {
          data.push({
            employeePositionID: emp['ID'],
            description: emp['description'],
            dateFrom,
            dateTo,
            orderID,
            paraID,
            empOrderType
          })
        } else {
          errors.push(UB.i18n('Для працівника з таб.номером {0} та РНОКПП {1} "Дата з" повинна бути менше за "Дата по"', item['tabNum'], item['taxCode']))
        }
      } else {
        errors.push(UB.i18n('Не знайдено працівника з таб.номером {0} та РНОКПП {1}', item['tabNum'], item['taxCode']))
      }
    })
    if (data.length) {
      const store = UB.DataStore('hr_empOrderEmployeeDet')
      data.forEach(row => {
        store.run('insert', {
          execParams: row
        })
      })
    }
  }
  ctx.mParams.errors = JSON.stringify(errors)
}
