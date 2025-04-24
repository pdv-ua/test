const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const sqlBuilder = {
    text: ` 
    SELECT {0} {1}
    FROM hr_position pos 
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      structDepName: { field: `${sqlDialect.scheme}depStructName(pos.parentUnitID, :orderDate:, :orgID: )` },
      posID: { field: `pos.ID` },
      posName: { field: `pos.name` },
      quantity: { field: 'pos.quantity' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.orgID = ctx.mParams.orgID
  sqlBuilder.clauses.whereParams.orderDate = dateService.shiftDate(ctx.mParams.orderDate)
  sqlBuilder.clauses.whereParams.staffTableID = ctx.mParams.staffTableID

  if (ctx.mParams.options && ctx.mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      ctx.mParams.__totalRecCount = ctx.dataStore.get(0)
    }
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
  return ` pos.orgID = :orgID: 
    and pos.mi_deleteDate >= '9999-12-31' 
    and pos.positionType = '3'        
    and ((pos.state = 'ACTIVE' and pos.liquidate = 0) or (pos.state = 'NEW' and pos.staffOrderID = :staffTableID:))     
    and :orderDate: between pos.mi_dateFrom and pos.mi_dateTo     
   `
}
