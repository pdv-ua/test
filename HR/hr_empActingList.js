const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('select')
me.entity.addMethod('closeDateTo')

me.select = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text:
      ` SELECT {0} {1} FROM (
          SELECT 
            pos.name AS posName,
            empPos.factPosition as actualPositionName,
            emp.fullFIO AS fullFIO,
            ${sqlDialect.dialect === 'MSSQL2012'
    ? `(case year(act.dateFrom) when 2000 then null else act.dateFrom end) AS dateFrom,
            (case year(act.dateTo) when 9999 then null else act.dateTo end) AS dateTo,`
    : `(case Extract(YEAR from act.dateFrom) when 2000 then null else act.dateFrom end) AS dateFrom,
            (case Extract(YEAR from act.dateTo) when 9999 then null else act.dateTo end) AS dateTo,`}
            o.description AS orderDescription,
            empTemp.fullFIO AS tempFullFIO,
            (case when empPosTemp.positionID IS NOT NULL then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = empPosTemp.positionID and pos.state = 'ACTIVE' 
              AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) else (select dp.name from hr_dictPosition dp where dp.ID = empPosTemp.dictPositionID) end) AS tempPosName,
            empPosTemp.factPosition as tempActualPositionName,
            act.ID,
            'hr_empOrderActingDet' AS entityName,
            act.organizationID,
            act.condition
          FROM hr_empOrderActingDet act  
            INNER JOIN hr_empOrderDet det ON det.ID=act.paraID  
            INNER JOIN hr_employeePosition empPosTemp ON empPosTemp.ID=act.employeePositionID and empPosTemp.isActive = 1  
            LEFT JOIN hr_employee empTemp ON empTemp.ID=empPosTemp.employeeID  
            INNER JOIN hr_empOrder o ON o.ID=act.orderID  
            LEFT JOIN hr_position pos ON pos.ID=det.positionID  
            LEFT JOIN hr_employeePosition empPos ON empPos.ID=det.employeePositionID and empPos.isActive = 1 
            LEFT JOIN hr_employee emp ON emp.ID=empPos.employeeID  
            WHERE act.empOrderType = 'ACTING' AND o.orderState in ('POSTED', 'PROCESSED') AND act.mi_deleteDate>='9999-12-31' AND act.cancelParaID IS NULL
          UNION
            SELECT 
              (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = dte.positionTempID and pos.state = 'ACTIVE' 
                AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) AS posName,
                empPosTemp.factPosition as actualPositionName,
              empTemp.fullFIO AS fullFIO,
               ${sqlDialect.dialect === 'MSSQL2012'
    ? `(case year(dte.dateFrom) when 2000 then null else dte.dateFrom end) AS dateFrom,
              (case year(dte.dateTo) when 9999 then null else dte.dateTo end) AS dateTo,`
    : `(case Extract(YEAR from dte.dateFrom) when 2000 then null else dte.dateFrom end) AS dateFrom,
              (case Extract(YEAR from dte.dateTo) when 9999 then null else dte.dateTo end) AS dateTo,`}
              NULL AS orderDescription,
              emp.fullFIO AS tempFullFIO,
              (case when empPos.positionID IS NOT NULL then (select ${sqlDialect.top} pos.name from hr_position pos where pos.mi_data_id = empPos.positionID and pos.state = 'ACTIVE' 
                AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) else (select dp.name from hr_dictPosition dp where dp.ID = empPos.dictPositionID) end) AS tempPosName,
              empPos.factPosition as tempActualPositionName,
              dte.ID,
              'hr_dictTempExecution' AS entityName,
              dte.organizationID,
              NULL as condition
            FROM hr_dictTempExecution dte
              LEFT JOIN hr_employeePosition empPosTemp ON empPosTemp.ID=dte.employeePositionTempID and empPosTemp.isActive = 1
              LEFT JOIN hr_employee empTemp ON empTemp.ID=empPosTemp.employeeID  
              INNER JOIN hr_employeePosition empPos ON empPos.ID=dte.employeePositionID and empPos.isActive = 1 
              LEFT JOIN hr_employee emp ON emp.ID=empPos.employeeID   
              WHERE dte.mi_deleteDate>='9999-12-31'
    ) t        
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      ID: { field: 't.ID' },
      organizationID: { field: 't.organizationID' },
      dateFrom: { field: 't.dateFrom' },
      dateTo: { field: 't.dateTo' },
      fullFIO: { field: 't.fullFIO' },
      posName: { field: 't.posName' },
      actualPositionName: { field: 't.actualPositionName' },
      tempFullFIO: { field: 't.tempFullFIO' },
      tempPosName: { field: 't.tempPosName' },
      tempActualPositionName: { field: 't.tempActualPositionName' },
      orderDescription: { field: 't.orderDescription' },
      entityName: { field: 't.entityName' },
      condition: { field: 't.condition' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    '',
    '',
    true)

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

/**
 * Закрити дату закінчення виконання обов'язків
 * @param {object} ctx
 * @param {number} ctx.mParams.itemID ID пункту наказу про виконання обов'язків (hr_empOrderActingDet)
 * @param {string} ctx.mParams.entityName назва сутності hr_empOrderActingDet | hr_dictTempExecution
 * @param {date} ctx.mParams.dateTo дата закінчення виконання обов'язків
 */
me.closeDateTo = function (ctx) {
  const mParams = ctx.mParams
  const itemID = ctx.mParams.itemID
  const itemIDs = ctx.mParams.itemIDs
  const dateTo = (ctx.mParams.dateTo && dateService.shiftDate(ctx.mParams.dateTo)) || null
  const entityName = ctx.mParams.entityName
  if (!entityName || !['hr_empOrderActingDet', 'hr_dictTempExecution'].includes(entityName)) return
  if (itemID || itemIDs) {
    const store = UB.DataStore(entityName)
    if (itemIDs) {
      itemIDs.forEach(id => {
        store.run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          execParams: {
            ID: id,
            dateTo: dateTo
          }
        })
      })
    } else {
      store.run('update', {
        __skipOptimisticLock: true,
        __skipSelectAfterUpdate: true,
        execParams: {
          ID: itemID,
          dateTo: dateTo
        }
      })
    }
    store.freeNative()
    mParams.result = true
  }
}
