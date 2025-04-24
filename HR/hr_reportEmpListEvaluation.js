const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text:
            ` SELECT {0} {1}
      FROM hr_empAssessmentResult ear
JOIN hr_empAssessment ea ON ea.ID = ear.assessmentID
JOIN hr_employeeNumber en ON en.ID = ea.employeeNumberID 
JOIN hr_employeePosition ep ON en.ID = ep.employeeNumberID and ep.isActive = 1
JOIN hr_employee emp on en.employeeID = emp.ID   
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      posCategory: { field: staffService.getPosCatShortNameSql() },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      conclusionDate: { field: 'ear.conclusionDate' },
      comment: { field: 'ear.comment' },
      assessmentResult: { field: `
      (CASE WHEN ear.avgValue is not null THEN (CONCAT(cast(ear.avgValue as numeric(5, 2)),' - ',(Select ${sqlDialect.top} enm.name from ubm_enum enm                  
where enm.eGroup = 'HR_ASSESSMENT_VALUE'  
and enm.code = ear.assessmentValue      
and enm.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}
))) ELSE (Select ${sqlDialect.top} enm.name from ubm_enum enm                  
where enm.eGroup = 'HR_ASSESSMENT_VALUE'  
and enm.code = ear.assessmentValue      
and enm.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}
) END )
      ` },
      rankName: { field: `
      (Select ${sqlDialect.top} rankTypes.name from hr_publServRang ranks 
        join hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID
        where 
        en.employeeID = ranks.employeeID 
        and ranks.dateFrom = 
            (select ${sqlDialect.top} r.dateFrom from hr_publServRang r
            where 
            r.employeeID = ranks.employeeID
            and :onDate: between r.dateFrom and r.dateTo            
            and r.mi_deleteDate >= '9999-12-31' 
            order by r.dateFrom desc ${sqlDialect.limit}
            )
        and ranks.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}
        ) 
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
  sqlBuilder.clauses.whereParams.year = mParams.year
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, emp.firstName'

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

  return ` ear.mi_deleteDate >= '9999-12-31' 
    and ea.mi_deleteDate >= '9999-12-31'
    and en.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo
    and :onDate: between ep.dateFrom and ep.dateTo    
    and ea.assessmentType = 'PERYEAR'
    and ear.assessmentValue is not null
    and ea.year=:year: 
  ${orgClause}
  ${depClause}     
   `
}
