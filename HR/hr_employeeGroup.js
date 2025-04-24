const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const entityService = require('./modules/entityService')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)

me.entity.addMethod('loadEmployees')
me.entity.addMethod('clearEmployees')
me.entity.addMethod('loadActiveEmployees')

function beforeUpdate (ctx) {
  entityService.setAttrs(ctx)
}

function beforeInsert (ctx) {
  entityService.setAttrs(ctx)
}

me.clearEmployees = function (ctx) {
  const empDet = UB.Repository('hr_employeeGroupDet')
    .attrs('ID')
    .where('employeeGroupID', '=', ctx.mParams.employeeGroupID)
    .selectAsObject()
  const store = UB.DataStore('hr_employeeGroupDet')

  empDet.forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })
}

me.loadEmployees = function (ctx) {
  const employeeGroupID = ctx.mParams.employeeGroupID
  const empIDs = ctx.mParams.items
  const isDelete = ctx.mParams.isDelete
  const dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  const store = UB.DataStore('hr_employeeGroupDet')

  if (isDelete) {
    const empDet = UB.Repository('hr_employeeGroupDet')
      .attrs('ID', 'employeeNumberID')
      .where('employeeGroupID', '=', employeeGroupID)
      .selectAsObject()
    empDet.forEach(row => {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  }
  empIDs.forEach(employeeNumberID => {
    store.run('insert', {
      execParams: {
        employeeGroupID,
        employeeNumberID,
        dateFrom
      }
    })
  })
}

me.loadActiveEmployees = function (ctx) {
  const employeeGroupID = ctx.mParams.employeeGroupID
  const dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  const store = UB.DataStore('hr_employeeGroupDet')

  const empIDs = UB.Repository('hr_employeeNumberS')
    .attrs('ID')
    .where('dateFrom', '<=', dateService.currentDate())
    .where('dateTo', '>=', dateService.currentDate())
    .where('orgID', '=', ctx.mParams.orgID)
    .selectAsObject()

  empIDs.forEach(emp => {
    store.run('insert', {
      execParams: {
        employeeGroupID,
        employeeNumberID: emp.ID,
        dateFrom
      }
    })
  })
}
