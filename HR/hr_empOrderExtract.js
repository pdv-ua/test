const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const UB = require('@unitybase/ub')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.on('insert:after', afterInsert)
me.on('update:before', afterUpdate)
me.on('delete:after', afterDelete)

function setAttrs (ctx) {
  let execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.departmentID && execParams.employeePositionID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Недопустимо одночасно вказувати і працівника і підрозділ')}>>>`)
  }
  if (execParams.departmentID && instanceData.employeePositionID && execParams.employeePositionID !== null) {
    throw new UB.UBAbort(`<<<${UB.i18n('Недопустимо одночасно вказувати і працівника і підрозділ')}>>>`)
  }
  if (execParams.employeePositionID && instanceData.departmentID && execParams.departmentID !== null) {
    throw new UB.UBAbort(`<<<${UB.i18n('Недопустимо одночасно вказувати і працівника і підрозділ')}>>>`)
  }

  if (execParams.orderDate !== undefined || execParams.orderNumber !== undefined || execParams.orderID !== undefined) {
    const parts = entityBaseService.getCompositeAttributeValue(ctx, 'description', ['orderDate', 'orderNumber', 'orderID.description', 'entryDate'], '^', true).split('^')
    execParams.description = UB.i18n(`Витяг № {0} від {1}, ({2})}`, parts[1] || '?', dateService.formatDate(parts[0] || parts[3]), parts[2])
  }
}
function setEmpOrder (ctx, method) {
  let execParams = ctx.mParams.execParams
  let fieldList = ['ID', 'empOrderType', 'description', 'organizationID', 'orderState', 'respEmployeeNumID', 'respEmployeeNumberID', 'respEmployeePositionID', 'respPositionID', 'respEmployeeID', 'entryDate', 'orderDate', 'orderNumber', 'mi_modifyDate']
  let empOrderParams = { ID: execParams.ID }
  if (method !== 'delete') {
    fieldList.forEach(f => {
      if (execParams[f] !== undefined) {
        empOrderParams[f] = execParams[f]
      }
    })
  }
  UB.DataStore('hr_empOrder').run(method, {
    execParams: empOrderParams
  })
}
function beforeInsert (ctx) {
  setAttrs(ctx)
}
function afterInsert (ctx) {
  setEmpOrder(ctx, 'insert')
}
function afterUpdate (ctx) {
  setEmpOrder(ctx, 'update')
}
function afterDelete (ctx) {
  setEmpOrder(ctx, 'delete')
}

function beforeUpdate (ctx) {
  setAttrs(ctx)
}
