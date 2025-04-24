const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('search')
me.entity.addMethod('canSelectProcessed')

function fillFields (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.initialParaID) {
    let initialPara = UB.Repository('hr_empOrderDet')
      .attrs(['employeeID', 'employeePositionID', 'employeeNumberID', 'departmentID', 'positionID', 'firstName', 'lastName', 'middleName', 'title'])
      .selectById(execParams.initialParaID)
    for (const attr in initialPara) {
      // noinspection JSUnfilteredForInLoop
      execParams[attr] = initialPara[attr]
    }
  }
  if (execParams.dictTimeCostID) {
    execParams.description = UB.Repository('hr_dictTimeCost')
      .attrs(['description'])
      .selectById(execParams.dictTimeCostID).description
  }
}
/* function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams
} */

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  fillFields(ctx)
}

function beforeUpdate (ctx) {
  fillFields(ctx)
}

me.search = function (ctx) {
  const mParams = ctx.mParams
  const isCanSelectProcessed = App.domainInfo.isEntityMethodsAccessible(__entityName, 'canSelectProcessed')
  const orderStateWhere = isCanSelectProcessed ? `o.orderState in ('POSTED', 'PROCESSED')` : `o.orderState='POSTED'`
  let runsql
  let sqlBuilder = {
    text:
      ` SELECT {0} {1} FROM (
          SELECT o.ID,o.description,o.mi_modifyDate, o.organizationID  
              FROM hr_empOrder o 
              WHERE ${orderStateWhere} 
                AND EXISTS (SELECT 1  FROM tim_timeSheet ts WHERE ts.orderID=o.ID AND o.mi_deleteDate>='9999-12-31') AND o.mi_deleteDate>='9999-12-31'
          UNION 
          SELECT o.ID,o.description,o.mi_modifyDate,o.organizationID    
            FROM hr_empOrder o 
            WHERE ${orderStateWhere} AND EXISTS (SELECT 1 FROM tim_timeSheet ts LEFT JOIN hr_timeSheetChange ch ON ch.ID=ts.orderID  
                WHERE ch.orderID=o.ID AND ts.mi_deleteDate>='9999-12-31') AND o.mi_deleteDate>='9999-12-31'
  ) t        
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      ID: { field: 't.ID' },
      description: { field: 't.description' },
      organizationID: { field: 't.organizationID' }
    },
    params: {}
  }
  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY t.description ASC '

  if (mParams.options && mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      mParams.__totalRecCount = ctx.dataStore.get(0)
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

me.canSelectProcessed = () => {}
