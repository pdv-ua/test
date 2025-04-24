const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')
me.entity.addMethod('search2')

me.search = function (ctx) {
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const sqlBuilder = {
    text:
        ` SELECT {0} {1}
      FROM  hr_empAssessment ea 
      JOIN hr_employeeNumber en ON en.ID = ea.employeeNumberID 
      JOIN hr_employeePosition ep ON en.ID = ep.employeeNumberID and ep.isActive = 1
      JOIN hr_employee emp on en.employeeID = emp.ID  
      LEFT JOIN hr_empAssessmentResult ear on ear.assessmentID = ea.ID 
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      workPlace: { field: `(case when ep.workPlace is not null then ep.workPlace else '99' end)` },
      employeeNumberID: { field: 'ea.employeeNumberID ' },
      depID: { field: 'ep.departmentID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      posCategory: { field: staffService.getPosCatShortNameSql() },
      positionID: { field: 'ep.positionID' },
      actualPositionName: { field: 'ep.factPosition' },
      dateFrom: { field: 'ep.dateFrom' },
      dateTo: { field: 'ep.dateTo' },
      agreementDate: { field: 'ea.agreementDate' },
      assessmentValue: { field: `
        (Select ${sqlDialect.top} enm.name from ubm_enum enm
          where enm.eGroup = 'HR_ASSESSMENT_VALUE'
          and enm.code = ear.assessmentValue
          and enm.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}
        )
      ` },
      conclusionDate: { field: 'ear.conclusionDate' },
      acquaintanceDate: { field: 'ea.acquaintanceDate' },
      comment: { field: 'ea.comment' },
      agreedByPosition: { field: `
      (Select ${sqlDialect.top} ep2.description from hr_employeePosition ep2         
        where 
        ea.agreedByPositionID = ep2.ID ${sqlDialect.limit} 
        ) 
      ` },
      agreementState: { field: `
      (Select ${sqlDialect.top} enm.name from ubm_enum enm                  
 where enm.eGroup = 'HR_AGREEMENT_STATE'  
 and enm.code = ea.agreementState      
 and enm.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit} 
 )
      ` },
      taskCount: { field: `
      (Select count(*) from hr_empAssessmentTask eat         
        where 
        eat.empAssessmentID = ea.ID
        and eat.mi_deleteDate>='9999-12-31' 
        ) 
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
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.year = ctx.mParams.year
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, emp.firstName'

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

me.search2 = function (ctx) {
  let runsql
  const sqlBuilder = {
    text:
        ` SELECT {0} {1}
      FROM  hr_empAssessment ea 
      JOIN hr_empAssessmentTask eat on eat.empAssessmentID = ea.ID and eat.mi_deleteDate>='9999-12-31' 
      JOIN hr_employeeNumber en ON en.ID = ea.employeeNumberID 
      JOIN hr_employeePosition ep ON en.ID = ep.employeeNumberID and ep.isActive = 1
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'ea.employeeNumberID ' },
      issueDate: { field: 'eat.issueDate' },
      number: { field: 'eat.number' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.year = ctx.mParams.year
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY eat.number'

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

me.getWhereClause = function (mParams) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ea.mi_deleteDate >= '9999-12-31'
    and en.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo
    and :onDate: between ep.dateFrom and ep.dateTo    
    and ea.assessmentType = 'PERYEAR'   
    and ea.year=:year: 
  ${orgClause}
  ${depClause}     
   `
}
