const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]
// const orderService = require('../HR/modules/orderService')
const ebs = require('../AC/modules/entityServices/entityBaseService')
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)

me.entity.addMethod('loadEmployeeList')

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  const fields = ebs.getCompositeAttributeValue(ctx, 'description', ['payElID.name', 'payRate'], '^', true).split('^')
  execParams.description = fields[0] + ', відсоток ' + fields[1]
  execParams.title = '..'
}

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  // const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.payElID || execParams.periodID || execParams.payRate !== undefined || execParams.departmentID !== undefined) {
    const emp = UB.Repository('hr_empOrderChgSalEmpDet')
      .attrs(['ID'])
      .where('paraID', '=', execParams.ID)
      .selectAsObject()
    const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
    emp.forEach(item => {
      ds.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
  }
  setDescription(ctx)
}

me.loadEmployeeList = function (ctx) {
  const mParams = ctx.mParams
  const ds = UB.DataStore('hr_empOrderChgSalEmpDet')
  if (mParams.isDeleteExisting) {
    const existing = UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .select()
    while (!existing.eof) {
      ds.run('delete', { execParams: { ID: existing.get('ID') } })
      existing.next()
    }
  }
  // const empOrderType = mParams.empOrderType
  const employeePosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'employeeNumberID', 'positionID', 'organizationID')
    .where('ID', 'in', mParams.records)
    .selectAsObject()
  employeePosition.filter(item => item.positionID !== null).forEach(item => {
    const isRecordNotExists = mParams.isDeleteExisting || UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID')
      .where('paraID', '=', mParams.paraID)
      .where('employeePositionID', '=', item.ID)
      .select()
      .eof
    if (isRecordNotExists) {
      ds.run('insert', {
        execParams: {
          empOrderType: mParams.empOrderType,
          employeePositionID: item.ID,
          employeeNumberID: item.employeeNumberID,
          positionID: item.positionID,
          accrualRate: mParams.accrualRate,
          newValue: mParams.newValue,
          payElID: mParams.payElID,
          dictFundSourceID: mParams.dictFundSourceID,
          orderID: mParams.orderID,
          paraID: mParams.paraID,
          dateFrom: mParams.dateFrom,
          dateTo: mParams.dateTo
        }
      })
    }
  })
}

function afterUpdate (ctx) {
  if (ctx.mParams.isOrderOperation || ctx.mParams.execParams.dictFundSourceID === undefined) {
    return
  }
  const detail = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['ID', 'payElID', 'dictFundSourceID'])
    .where('paraID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  let store = UB.DataStore('hr_empOrderChgSalEmpDet')
  detail.forEach(item => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        payElID: item.payElID,
        dictFundSourceID: ctx.mParams.execParams.dictFundSourceID
      }
    })
  })
}
