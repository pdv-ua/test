const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const staffService = require('./modules/staffService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text:
            ` SELECT {0} {1}
      FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID       
      JOIN hr_position pos on pos.mi_data_id = ep.positionID 
           and :dateFrom: between pos.mi_dateFrom and pos.mi_dateTo 
           and pos.mi_deleteDate >= '9999-12-31' 
           and pos.state = 'ACTIVE' 
      JOIN hr_positionHarmful harm on harm.positionID = pos.mi_data_id  
           and :dateFrom: between harm.dateFrom and harm.dateTo 
           and harm.mi_deleteDate >= '9999-12-31' 
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      fullFIO: { field: `(CONCAT(emp.lastName,' ',emp.firstName,' ',emp.middleName))` },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      posName: { field: 'pos.name' },
      actualPositionName: { field: 'ep.factPosition' },
      workPlace: { field: `(case when ep.workPlace is not null then ep.workPlace else '99' end)` },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') },
      posDateFrom: { field: `(Select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2                
                 JOIN hr_positionHarmful harm2 on harm2.positionID = ep2.positionID           
           and harm2.mi_deleteDate >= '9999-12-31' 
                 where ep2.isActive = 1 and ep2.organizationID = en.orgID 
                 and ep2.employeeID = emp.ID 
                 and ep2.mi_deleteDate >= '9999-12-31' 
                 order by ep2.dateFrom asc ${sqlDialect.limit})
      ` },
      workDateFrom: { field: `(Select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 where ep2.organizationID = en.orgID 
                 and ep2.isActive = 1 and ep2.employeeID = emp.ID 
                 and ep2.mi_deleteDate >= '9999-12-31' 
                 order by ep2.dateFrom asc ${sqlDialect.limit}) 
      ` }

    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = mParams.dateFrom
  sqlBuilder.clauses.whereParams.dictHarmfulKindID = mParams.dictHarmfulKindID

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

me.getWhereClause = function (mParams) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31' 
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo 
    and harm.dictHarmfulKindID = :dictHarmfulKindID:    
  ${orgClause}
  ${depClause}     
   `
}
