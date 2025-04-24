const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: `SELECT {0} {1}
            FROM hr_empAssessment ast
            LEFT JOIN hr_position pos ON pos.ID = ast.positionID
            LEFT JOIN hr_employeeNumber emp ON emp.ID = ast.employeeNumberID
            LEFT JOIN hr_empAssessmentResult res ON ast.ID = res.assessmentID and res.mi_deleteDate>='9999-12-31'
            {2} {3} {4}`,
    clauses: {},
    aliases: {
      recordID: { field: 'ast.ID' },
      assessmentType: { field: 'ast.assessmentType' },
      assessmentTaskType: { field: 'ast.assessmentTaskType' },
      employeeID: { field: 'ast.employeeID' },
      employeeNumberID: { field: 'ast.employeeNumberID' },
      employeeDesc: { field: 'emp.description' },
      positionID: { field: `(select ${sqlDialect.top} name from hr_position where mi_data_id = ast.positionID and state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' order by mi_dateTo desc ${sqlDialect.limit})` },
      year: { field: 'ast.year' },
      psCategory: { field: `(select ${sqlDialect.top} psCategory from hr_position where mi_data_id = ast.positionID and state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' order by mi_dateTo desc ${sqlDialect.limit})` },
      departmentID: { field: `(select ${sqlDialect.top} description from hr_department where mi_data_id = ast.departmentID and state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' order by mi_dateTo desc ${sqlDialect.limit})` },
      assessmentValue: { field: 'res.assessmentValue' },
      agreementState: { field: 'ast.agreementState' },
      appealDate: { field: 'res.appealDate' },
      dictCompetencyID: { field: 'res.dictCompetencyID' }
    },
    params: {}
  }

  if (mParams.withoutAssessment) {
    sqlBuilder = {
      text: `SELECT {0} {1}
            FROM hr_employeeNumber en
            INNER JOIN hr_employee emp ON emp.ID = en.employeeID 
            JOIN hr_employeePosition ep ON ep.employeeNumberID = en.ID 
LEFT JOIN hr_position pos on pos.mi_data_id = ep.positionID              
  and pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
Where              
pos2.mi_data_id = ep.positionID              
and pos2.orgID = en.orgID               
and (pos2.mi_dateFrom <= en.dateTo or en.dateTo is null)             
and pos2.mi_dateTo >= en.dateFrom              
and pos2.mi_deleteDate >= '9999-12-31'              
and pos2.state = 'ACTIVE'             
order by pos2.mi_dateFrom desc ${sqlDialect.limit}            
)
            {2} {3} {4}`,
      clauses: {},
      aliases: {
        recordID: { field: 'NULL' },
        assessmentType: { field: 'NULL' },
        assessmentTaskType: { field: 'NULL' },
        employeeID: { field: 'en.employeeID' },
        employeeNumberID: { field: 'en.ID' },
        employeeDesc: { field: 'en.description' },
        positionID: { field: `(select ${sqlDialect.top} pos.name from hr_employeePosition ep join hr_position pos on pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and pos.mi_dateFrom <= en.dateTo and pos.mi_dateTo >= en.dateFrom and pos.mi_deleteDate >= '9999-12-31' where ep.employeeNumberID = en.ID and ep.isActive = 1 and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit})` },
        year: { field: 'NULL' },
        psCategory: { field: `(select ${sqlDialect.top} psCategory from hr_position where mi_data_id = ep.positionID and state = 'ACTIVE' and mi_deleteDate = '9999-12-31' order by mi_dateTo desc ${sqlDialect.limit})` },
        departmentID: { field: `(select ${sqlDialect.top} dep.name from hr_employeePosition ep join hr_department dep on dep.mi_data_id = ep.departmentID and dep.state = 'ACTIVE' and dep.mi_dateFrom <= en.dateTo and dep.mi_dateTo >= en.dateFrom and dep.mi_deleteDate >= '9999-12-31' where ep.employeeNumberID = en.ID and ep.isActive = 1  and ep.dateFrom <= en.dateTo and ep.dateTo >= en.dateFrom and ep.mi_deleteDate >= '9999-12-31' order by ep.dateFrom desc ${sqlDialect.limit})` },
        assessmentValue: { field: 'NULL' },
        agreementState: { field: 'NULL' },
        appealDate: { field: 'NULL' },
        dictCompetencyID: { field: 'NULL' }
      },
      params: {}
    }
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.year = mParams.year
  sqlBuilder.clauses.whereParams.psCategory = mParams.psCategory
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.dictCompetencyID = mParams.dictCompetencyID
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate || dateService.currentDate()

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.ID'

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

me.getWhereClause = function (mParams, sqlDialect) {
  let whereClause
  if (mParams.withoutAssessment) {
    whereClause = `
      en.orgID = :orgID:
      and en.dateFrom <= :onDate: and en.dateTo >= :onDate:      
      and en.mi_deleteUser is Null and emp.mi_deleteDate>='9999-12-31'
      and NOT EXISTS(SELECT ast.ID FROM hr_empAssessment ast WHERE ast.employeeID = en.employeeID AND ast.mi_deleteDate>='9999-12-31' and ast.year = :year: and ast.organizationID = :orgID:) 
      and ep.mi_deleteDate>='9999-12-31' 
and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2
where ep2.isActive = 1
and ep2.mi_deleteDate >= '9999-12-31' 
and ep2.employeeNumberID = ep.employeeNumberID 
order by ep2.dateFrom desc ${sqlDialect.limit})
    `
    if (mParams.psCategory != null) {
      whereClause = whereClause + `
        and (select ${sqlDialect.top} psCategory from hr_position where mi_data_id = ep.positionID and state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' order by mi_dateTo desc ${sqlDialect.limit}) = '${mParams.psCategory}'
        `
    }
  } else {
    whereClause = `
      ast.organizationID = :orgID:
      and ast.year = :year:
      and ast.mi_deleteDate>='9999-12-31'   
    `
    if (mParams.psCategory != null) {
      whereClause = whereClause + `
        and (select ${sqlDialect.top} psCategory from hr_position where mi_data_id = ast.positionID and state = 'ACTIVE' and mi_deleteDate >= '9999-12-31' order by mi_dateTo desc ${sqlDialect.limit}) = '${mParams.psCategory}'
        `
    }
    if (mParams.dictCompetencyID != null) {
      whereClause = whereClause + `
    and res.dictCompetencyID like '%` + mParams.dictCompetencyID + `%'
    `
    }
    if (mParams.withoutResult) {
      whereClause = whereClause + `
    and res.ID is NULL
    `
    }
    if (mParams.withoutTasks) {
      whereClause = whereClause + `
    and NOT EXISTS(SELECT et.ID FROM hr_empAssessmentTask et WHERE et.empAssessmentID = ast.ID AND et.mi_deleteUser is Null )
    `
    }
  }
  return whereClause
}
