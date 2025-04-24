const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('search')

me.getDegree = function (sqlDialect) {
  return `(Select ${sqlDialect.top} dict.name from hr_empRangeScience rs 
    left join hr_dictDegree dict on dict.id = rs.dictDegreeID and dict.mi_deleteDate >= '9999-12-31' 
    where rs.employeeID = emp.ID and rs.mi_deleteDate >= '9999-12-31'
    order by coalesce(rs.docDate, '9999-12-31')DESC, rs.id DESC ${sqlDialect.limit})`
}

me.getAcadem = function (sqlDialect) {
  return `(Select ${sqlDialect.top} dict.name from hr_empAcademStatus acs 
    left join hr_dictAcademStatus dict on dict.id = acs.dictAcademStatusID and dict.mi_deleteDate >= '9999-12-31' 
    left join hr_dictAcademStatus stat on stat.id = acs.dictAcademStatusID and dict.mi_deleteDate >= '9999-12-31'      
    where acs.employeeID = emp.ID and acs.mi_deleteDate >= '9999-12-31'
    order by (case when stat.isOfficial = 1 then 1 else 2 end), (case when coalesce(acs.setStatus, '') = 'BYORG' then 1 else 2 end),
    coalesce(acs.docDate, '9999-12-31') DESC, acs.id DESC ${sqlDialect.limit}) `
}

me.search = function (ctx) {
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const orgType = settingsService.getByCode('hrFuncOrgType', ctx.mParams.organizationID)
  const sqlBuilder = {
    text: me.getSqlBuilderText(),
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      taxCode: { field: 'emp.taxCode' },
      fullFIO: { field: 'emp.fullFIO' },
      posCategory: { field: orgType === '2' ? staffService.getPosCatShortNameSql() : staffService.getPosCategoryShortNameSql() },
      rankCur: {
        field: `(Select ${sqlDialect.top} rankTypes.name from hr_publServRang ranks 
        join hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID
        where 
        en.employeeID = ranks.employeeID 
        and ranks.dateFrom = 
            (select ${sqlDialect.top} r.dateFrom from hr_publServRang r
            where 
            r.employeeID = ranks.employeeID
            and r.dateFrom <= :onDate: 
            and r.dateTo >= :onDate: 
            and r.mi_deleteDate >= '9999-12-31' 
            order by r.dateFrom desc ${sqlDialect.limit}
            )
        and ranks.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}
        ) 
      `
      },
      dictEduLevelName: { field: 'de.name' },
      dictSpecialtyName: { field: 'spec.name' },
      qualification: { field: 'p.qualification' },
      dictDegreeName: { field: 'degr.name' },
      docSeries: { field: 'p.docSeries' },
      docNumber: { field: 'p.docNumber' },
      dateIssue: { field: 'p.dateIssue' },
      educationName: { field: 'p.educationName' },
      academName: { field: me.getAcadem(sqlDialect) },
      degreeName: { field: me.getDegree(sqlDialect) },
      sexType: { field: 'emp.sexType' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
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
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO, p.dateIssue'

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

  return ` ep.isActive = 1      
    and p.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'       
    and en.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo 
    and :onDate: between ep.dateFrom and ep.dateTo    
    ${mParams.dictEducationLevelType && !mParams.lastEducationLevelType ? ` and p.dictEducationLevelID in (${mParams.dictEducationLevelType})` : ''}
    ${mParams.lastEducationLevelType ? ` and p.isMain = 1 ` : ''}
    ${orgClause}
    ${depClause}     
    `
}

me.getSqlBuilderText = function () {
  const txt = ` SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_employeeEducation p ON p.employeeID = emp.ID
      JOIN hr_dictEducationLevel de ON de.ID = p.dictEducationLevelID
           and de.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_specialty spec ON spec.ID = p.dictSpecialtyID
           and spec.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_dictDegree degr ON degr.ID = p.dictDegreeID
           and degr.mi_deleteDate >= '9999-12-31'
      ${staffService.getSqlEmployeePositionOneWorkPlace()}       

      {2} {3} {4}
    `
  return txt
}
