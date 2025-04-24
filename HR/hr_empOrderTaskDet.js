const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('delete:after', afterDelete)

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.task) {
    execParams.description = execParams.task.substring(0, 396)
    if (execParams.task.length > 400) {
      execParams.description += '...'
    }
  }
  if (execParams.respEmployeePositionID) {
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
      .where('ID', '=', execParams.respEmployeePositionID)
      .select()

    if (!execParams.firstName) {
      execParams.firstName = pos.get('employeeID.firstName')
    }
    if (!execParams.lastName) {
      execParams.lastName = pos.get('employeeID.lastName')
    }
    if (!execParams.middleName) {
      execParams.middleName = pos.get('employeeID.middleName')
    }
    if (!execParams.organizationID && execParams.orderID) {
      const order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.organizationID = order.get('organizationID')
    }
    execParams.employeeID = pos.get('employeeID')
    execParams.departmentID = pos.get('departmentID')
    execParams.positionID = pos.get('positionID')
    execParams.employeeNumberID = pos.get('employeeNumberID')
    /* if (pos.get('departmentID.name')) {
      execParams.title = `${pos.get('positionID.name')} ${pos.get('departmentID.name')}  [${pos.get('employeeNumberID.tabNum')}]`
    } else {
      execParams.title = `${pos.get('positionID.name')}  [${pos.get('employeeNumberID.tabNum')}]`
    } */
    execParams.title = pos.get('description')
  } else {
    if (execParams.respEmployeePositionID === null) {
      execParams.firstName = '...'
      execParams.lastName = '...'
      execParams.middleName = '...'
      execParams.title = '...'
      execParams.employeeID = null
      execParams.departmentID = null
      execParams.positionID = null
      execParams.employeeNumberID = null
    }
  }
}

function beforeInsert (ctx) {
  global.hr_empOrderDet.setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDescription(ctx)
}

function afterInsert (ctx) {
  const inParams = ctx.mParams.execParams
  const orderUnityStore = UB.DataStore('hr_employeeOrder')
  if (inParams.orderID && inParams.linkedEmployeePositionID) {
    const emp = UB.Repository('hr_employeePositionS')
      .attrs(['employeeID', 'employeeNumberID'])
      .selectById(inParams.linkedEmployeePositionID)
    orderUnityStore.run('insert', {
      execParams: {
        ID: inParams.ID,
        orderID: inParams.orderID,
        employeeID: emp.employeeID,
        employeeNumberID: emp.employeeNumberID,
        employeePositionID: inParams.linkedEmployeePositionID,
        mi_unityEntity: ctx.dataStore.entity.name
      }
    })
  }
}

function afterUpdate (ctx) {
  const inParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeeOrder').attrs(['ID']).selectById(inParams.ID)) {
    let ep = {
      ID: inParams.ID,
    }
    if (inParams.orderID) {
      ep.orderID = inParams.orderID
    }
    const orderUnityStore = UB.DataStore('hr_employeeOrder')
    if (inParams.linkedEmployeePositionID) {
      ep.employeePositionID = inParams.linkedEmployeePositionID

      const emp = UB.Repository('hr_employeePositionS')
        .attrs(['employeeID', 'employeeNumberID'])
        .selectById(inParams.linkedEmployeePositionID) || {}
      ep.employeeID = emp.employeeID
      ep.employeeNumberID = emp.employeeNumberID
    }

    if (inParams.orderID !== undefined) ep.orderID = inParams.orderID

    orderUnityStore.run('update', {
      execParams: ep,
      __skipOptimisticLock: true
    })
  }
}

function afterDelete (ctx) {
  const inParams = ctx.mParams.execParams
  if (UB.Repository('hr_employeeOrder').attrs(['ID']).selectById(inParams.ID)) {
    UB.DataStore('hr_employeeOrder').run('delete', {
      execParams: { ID: inParams.ID }
    })
  }
}
