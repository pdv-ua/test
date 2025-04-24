const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const accrualService = require('../HR/modules/accrualService')
const employeeService = require('../HR/modules/employeeService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:after', afterDelete)

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!ctx.mParams.isImport) {
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs('ID', 'orgID')
      .where('employeeID', '=', execParams.employeeID)
      .where('dateFrom', '<=', dateService.currentDate())
      .where('dateTo', '>=', dateService.currentDate())
      .selectAsObject()
    employeeNumber.forEach(row => {
      accrualService.setRecalculatePeriod({
        orgID: row.orgID,
        employeeNumberID: row.ID,
        dateFrom: execParams.dateFrom,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Ранг держслужбовця')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
    employeeService.updateAddDescriptionPerson(execParams.employeeID)
  }
}

function afterUpdate (ctx) {
  if (!ctx.mParams.isImport) {
    const instanceData = ctx.dataStore.getAsJsObject()[0] || {}
    employeeService.updateAddDescriptionPerson(instanceData.employeeID)
  }
}

function beforeInsert (ctx) {
  if (ctx.mParams.isOrderOperation || ctx.mParams.isImportOperation || ctx.mParams.isImport) {
    return
  }
  let execParams = ctx.mParams.execParams
  let prevRecID = UB.Repository(__entityName).attrs('ID').where('employeeID', '=', execParams.employeeID).where('dateTo', '=', '#maxdate').select().get(0)
  if (prevRecID) {
    let date = new Date(execParams.dateFrom)
    date.setDate(date.getDate() - 1)
    UB.DataStore(__entityName).run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: prevRecID,
        dateTo: date
      }
    })
  }
  const dictRankID = execParams.dictRankID || 0
  if (dictRankID) {
    const dictRank = UB.Repository('hr_dictRank')
      .attrs('nextRankMonth', 'code')
      .where('ID', '=', execParams.dictRankID)
      .selectSingle()
    if (dictRank.code === '1') {
      execParams.dateNext = null
    } else {
      const dateNext = dictRank.nextRankMonth > 0 ? dateService.addMonths(execParams.dateFrom, dictRank.nextRankMonth) : dateService.addYears(execParams.dateFrom, 3)
      execParams.dateNext = dateNext
    }
  }
  setOrderData(ctx)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  const dictRankID = execParams.dictRankID || 0
  if (dictRankID) {
    const dictRank = UB.Repository('hr_dictRank')
      .attrs('nextRankMonth', 'code')
      .where('ID', '=', dictRankID)
      .selectSingle()
    if (dictRank.code !== '1') {
      const dateNext = dictRank.nextRankMonth > 0 ? dateService.addMonths(instanceData.dateFrom, dictRank.nextRankMonth) : dateService.addYears(instanceData.dateFrom, 3)
      execParams.dateNext = dateNext
    }
  }
  setOrderData(ctx)
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (previousValues.employeeID && !ctx.mParams.isImport) {
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs('ID', 'orgID')
      .where('employeeID', '=', previousValues.employeeID)
      .where('dateFrom', '<=', dateService.currentDate())
      .where('dateTo', '>=', dateService.currentDate())
      .selectAsObject()
    if (Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'dateNext', 'comment'].includes(o))) {
      let calcDate = (execParams.dateFrom || previousValues.dateFrom)
      if (execParams.dateToEmpty || execParams.dateTo) {
        if (!Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'dateToEmpty', 'dateTo', 'dateNext'].includes(o))) {
          calcDate = dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo) < dateService.maxDate()
            ? dateService.addDays(dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo), 1) : execParams.dateToEmpty || execParams.dateTo
        }
      }
      employeeNumber.forEach(row => {
        accrualService.setRecalculatePeriod({
          orgID: row.orgID,
          employeeNumberID: row.ID,
          dateFrom: calcDate,
          entityName: __entityName,
          initiatorID: execParams.ID,
          description: `${UB.i18n('Ранг держслужбовця')} ${dateService.formatDate(dateService.shiftDate(calcDate))}`
        })
      })
      calcService.addCalcQueue({
        employeeNumbers: employeeNumber.map(o => o.ID),
        description: UB.i18n(`Змінено дані {0}`, __entityName)
      })
    }
  }
}

function beforeDelete (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!mParams.isOrderOperation && !mParams.isImportOperation) {
    let ov = ebs.getOldValues(ctx)
    let lastRecID = UB.Repository(__entityName).attrs('ID')
      .where('employeeID', '=', ov.employeeID)
      .where('dateTo', '>', new Date())
      .select()
    if (lastRecID.eof) {
      throw new UB.UBAbort(`<<<${UB.i18n('Для працівника не встановлено жодного діючого рангу!')}>>>`)
    }
  }
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  ctx.previousValues = previousValues
  if (!mParams.isImport) {
    const employeeNumber = UB.Repository('hr_employeeNumberS').attrs('ID', 'orgID')
      .where('employeeID', '=', previousValues.employeeID)
      .where('dateFrom', '<=', dateService.currentDate())
      .where('dateTo', '>=', dateService.currentDate())
      .selectAsObject()
    employeeNumber.forEach(row => {
      accrualService.setRecalculatePeriod({
        orgID: row.orgID,
        employeeNumberID: row.ID,
        dateFrom: previousValues.dateFrom,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Ранг держслужбовця')} ${UB.i18n('видалення')} ${dateService.formatDate(dateService.shiftDate(previousValues.dateFrom))}`
      })
    })
    calcService.addCalcQueue({
      employeeNumbers: employeeNumber.map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
}

function setOrderData (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.orderID === null) {
    execParams.orderNumber = null
    execParams.orderDate = null
  } else if (execParams.orderID) {
    const order = UB.Repository('hr_order').attrs(['orderNumber', 'orderDate']).selectById(execParams.orderID)
    if(!execParams.orderNumber)
      execParams.orderNumber = order.orderNumber
    if(!execParams.orderDate)  
      execParams.orderDate = order.orderDate ? dateService.shiftDate(order.orderDate) : null
  }
}

function afterDelete (ctx) {
  if (!ctx.mParams.isImport && ctx.previousValues) {
    employeeService.updateAddDescriptionPerson(ctx.previousValues.employeeID)
  }
}
