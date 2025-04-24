const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')

me.entity.addMethod('search')

me.on('delete:before', ctx => {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  if (UB.Repository(__entityName).attrs('orderID').selectById(ctx.mParams.execParams.ID).orderID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис було створено при проведенні наказу, видалення неможливе')}>>>`)
  }
})

me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('update:before', afterUpdate)

function updateEmployeeData (ctx) {
  const execParams = ctx.mParams.execParams
  const empStore = UB.DataStore('hr_employee')
  const employeeData = UB.Repository(__entityName).attrs('employeeID').selectById(execParams.ID)
  const employeeID = employeeData.employeeID
  const params = {}
  const fieldList = ['shortFIO', 'fullFIO', 'firstName', 'lastName', 'middleName', 'genName', 'datName', 'accusativeName', 'insName', 'locName']
  fieldList.forEach(field => {
    if (execParams[field] !== undefined) {
      params[field] = execParams[field]
    }
  })
  if (Object.keys(params).length) {
    params.ID = employeeID
    empStore.run('update', {
      __skipOptimisticLock: true,
      execParams: params
    })
  }

  if (execParams.fullFIO) {
    const empNumStore = UB.DataStore('hr_employeeNumber')
    const employeeNumberList = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'changeOrderID', 'description'])
      .where('employeeID', '=', employeeID)
      .whereIf(execParams.organizationID, 'orgID', '=', execParams.organizationID)
      .selectAsObject()
    employeeNumberList.forEach(item => {
      empNumStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          description: null
        }
      })
    })

    const empPosStore = UB.DataStore('hr_employeePosition')
    const employeePositionList = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'changeOrderID', 'description'])
      .where('employeeNumberID', 'in', employeeNumberList.map(item => item.ID))
      .selectAsObject()
    employeePositionList.forEach(item => {
      empPosStore.run('update', {
        __skipOptimisticLock: true,
        isDirectUpdate: true,
        execParams: {
          ID: item.ID,
          description: null
        }
      })
    })
  }
}

function afterInsert (ctx) {
  if (ctx.mParams.studForm) {
    updateEmployeeData(ctx, 'insert')
  }
}

function beforeDelete (ctx) {
  const execParams = ctx.mParams.execParams
  const empStore = UB.DataStore('hr_employee')
  const instanceData = UB.Repository(__entityName).attrs('*').selectById(execParams.ID)
  const employeeID = instanceData.employeeID
  const employeeData = UB.Repository('hr_employee').attrs('fullFIO').selectById(employeeID)
  if (instanceData['fullFIO'] === employeeData['fullFIO']) {
    const params = {
      ID: employeeID
    }
    const fieldList = ['shortFIO', 'fullFIO', 'firstName', 'lastName', 'middleName', 'genName', 'datName', 'accusativeName', 'insName', 'locName']
    fieldList.forEach(field => {
      params[field] = instanceData[field + 'Old']
    })
    empStore.run('update', {
      __skipOptimisticLock: true,
      execParams: params
    })

    const empNumStore = UB.DataStore('hr_employeeNumber')
    const employeeNumberList = UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'changeOrderID', 'description'])
      .where('employeeID', '=', employeeID)
      .selectAsObject()
    employeeNumberList.forEach(item => {
      empNumStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          description: null
        }
      })
    })

    const empPosStore = UB.DataStore('hr_employeePosition')
    const employeePositionList = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'changeOrderID', 'description'])
      .where('employeeNumberID', 'in', employeeNumberList.map(item => item.ID))
      .selectAsObject()
    employeePositionList.forEach(item => {
      empPosStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          description: null
        }
      })
    })
  }
}

function afterUpdate (ctx) {
  if (ctx.mParams.studForm) {
    updateEmployeeData(ctx, 'update')
  }
}

me.search = function (ctx) {
  let runsql
  const sqlBuilder = {
    text: ` 
    SELECT {0} {1}
    FROM hr_employeeChange ec 
    INNER JOIN hr_employee emp ON emp.ID = ec.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_employeePosition ep ON ep.ID = ec.employeePositionID
        and ep.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_empOrder eo ON eo.ID = ec.orderID  
        and eo.mi_deleteDate >= '9999-12-31'
    left join hr_employeeNumber en ON en.ID = ep.employeeNumberID
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      fullFIOOld: { field: `ec.fullFIOOld` },
      fullFIO: { field: `ec.fullFIO` },
      orderDate: { field: `eo.orderDate` },
      'employeeID.taxCode': { field: `emp.taxCode` },
      'taxCode': { field: `emp.taxCode` },
      additInform: { field: `(concat('Наказ № ',eo.orderNumber,' (таб.',en.tabNum, ')'))` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.dateTo
  if (ctx.mParams.onOrderDate) {
    sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY eo.orderDate asc'
  }

  runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
  ctx.inherite = false
  return true
}

me.getWhereClause = function () {
  return `eo.orderDate between :dateFrom: and :dateTo:
    and ec.organizationID = :organizationID:
    and ec.mi_deleteDate >= '9999-12-31' 
    and ec.orderID IS NOT NULL
   `
}
