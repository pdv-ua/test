const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  if (!ctx.mParams.isOrderOperation) {
    setDescription(ctx)
  }
}

function beforeUpdate (ctx) {
  if (!ctx.mParams.isOrderOperation) {
    setDescription(ctx)
  }
}

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.employeePositionID) {
    const pos = UB.Repository('hr_employeePositionS')
      .attrs([
        'employeeNumberID',
        'employeeID',
        'employeeID.firstName',
        'employeeID.lastName',
        'employeeID.middleName',
        'departmentID',
        'positionID',
        'positionID.name',
        'employeeNumberID.tabNum',
        'departmentID.name',
        'description'
      ])
      .where('ID', '=', execParams.employeePositionID)
      .select()

    execParams.firstName = pos.get('employeeID.firstName')
    execParams.lastName = pos.get('employeeID.lastName')
    execParams.middleName = pos.get('employeeID.middleName')
    execParams.employeeNumberID = pos.get('employeeNumberID')
    execParams.employeeID = pos.get('employeeID')
    execParams.departmentID = pos.get('departmentID')
    execParams.positionID = pos.get('positionID')
    if (pos.get('departmentID.name')) {
      execParams.title = String(`${pos.get('positionID.name') || ''} ${pos.get('departmentID.name')}  [${pos.get('employeeNumberID.tabNum')}]`).trim()
    } else {
      execParams.title = String(`${pos.get('positionID.name') || ''}  [${pos.get('employeeNumberID.tabNum')}]`).trim()
    }
    execParams.description = pos.get('description')
  }
}
