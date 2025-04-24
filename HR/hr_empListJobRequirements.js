const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')
me.getSqlEdu = function (dialect) {
  const sqlTable = `from hr_employeeEducation edu 
  left join hr_dictEducationLevel lvl on lvl.id = edu.dictEducationLevelID and lvl.mi_deleteDate >= '9999-12-31' 
  where edu.employeeID = emp.ID and edu.mi_deleteDate >= '9999-12-31' `

  const field = dialect === 'MSSQL2012'
    ? `(CONCAT('; ', lvl.name, ' ', edu.educationName, ' ', edu.docSeries, ' ',  edu.docNumber, ' ', (CASE when edu.dateIssue is not null then CONCAT('${UB.i18n('від ')}', convert(char(10), edu.dateIssue, 104)) ELSE '' END)))`
    : `(CONCAT(lvl.name, ' ', edu.educationName, ' ', edu.docSeries, ' ',  edu.docNumber, ' ', (CASE when edu.dateIssue is not null then CONCAT('${UB.i18n('від ')}', to_char(edu.dateIssue, 'DD.MM.YYYY')) ELSE '' END)))`

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ${field} ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(${field}, '; ') ${sqlTable})`
}

me.getSqlScience = function (dialect) {
  const sqlTable = `from hr_empRangeScience rs 
  left join hr_dictDegree dict on dict.id = rs.dictDegreeID and dict.mi_deleteDate >= '9999-12-31' 
  where rs.employeeID = emp.ID and rs.mi_deleteDate >= '9999-12-31' `

  const field = dialect === 'MSSQL2012'
    ? `(CONCAT('; ', dict.name, ' ', rs.docNumber, ' ', (CASE when rs.docDate is not null then CONCAT('${UB.i18n('від ')}', convert(char(10), rs.docDate, 104)) ELSE '' END), ' ', rs.educationName))`
    : `(CONCAT(dict.name, ' ', rs.docNumber, ' ', (CASE when rs.docDate is not null then CONCAT('${UB.i18n('від ')}', to_char(rs.docDate, 'DD.MM.YYYY')) ELSE '' END), ' ', rs.educationName))`

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ${field} ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(${field}, '; ') ${sqlTable})`
}

me.getSqlAcadem = function (dialect) {
  const sqlTable = `from hr_empAcademStatus acs 
  left join hr_dictAcademStatus dict on dict.id = acs.dictAcademStatusID and dict.mi_deleteDate >= '9999-12-31' 
  where acs.employeeID = emp.ID and acs.mi_deleteDate >= '9999-12-31' `

  const field = dialect === 'MSSQL2012'
    ? `(CONCAT('; ', dict.name, ' ', acs.docNumber, ' ', (CASE when acs.docDate is not null then CONCAT('${UB.i18n('від ')}', convert(char(10), acs.docDate, 104)) ELSE '' END), ' ', acs.educationOrgName))`
    : `(CONCAT(dict.name, ' ', acs.docNumber, ' ', (CASE when acs.docDate is not null then CONCAT('${UB.i18n('від ')}', to_char(acs.docDate, 'DD.MM.YYYY')) ELSE '' END), ' ', acs.educationOrgName))`

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ${field} ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(${field}, '; ') ${sqlTable})`
}

me.getSqlCertification = function (dialect) {
  const sqlTable = `from hr_empCertificationAcc cer 
  left join hr_dictEmpCategory dict on dict.id = cer.dictEmpCategoryID and dict.mi_deleteDate >= '9999-12-31' 
  where cer.employeeID = emp.ID and cer.mi_deleteDate >= '9999-12-31' `

  const field = dialect === 'MSSQL2012'
    ? `(CONCAT('; ', cer.orderAuthor, ' ', cer.orderNumber, ' ', (CASE when cer.orderDate is not null then CONCAT('${UB.i18n('від ')}', convert(char(10), cer.orderDate, 104)) ELSE '' END), ' ', dict.name))`
    : `(CONCAT(cer.orderAuthor, ' ', cer.orderNumber, ' ', (CASE when cer.orderDate is not null then CONCAT('${UB.i18n('від ')}', to_char(cer.orderDate, 'DD.MM.YYYY')) ELSE '' END), ' ', dict.name))`

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ${field} ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(${field}, '; ') ${sqlTable})`
}

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const tempAccrualData = ctx.mParams.accrual
    ? `with tmpAcc as (
    select ep.employeenumberid, acc.payelid, acc.accrualsum, acc.accrualrate,
      ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'id', '')} as pos_id
    from hr_employeeposition ep
    left join hr_employeeaccrual acc on acc.employeenumberid = ep.employeenumberid and :onDate: between acc.datefrom and acc.dateto AND acc.isActive = 1
    where ep.mi_deletedate >= '9999-12-31' and :onDate: between ep.datefrom and ep.dateto
    and acc.mi_deletedate >= '9999-12-31' and :onDate: between acc.datefrom and acc.dateto
    and ep.positionid is not null
    ${staffService.getDepartmentClause(ctx.mParams.departmentID, ctx.mParams.includeChildDepts)}
    ${staffService.getOrganizationClause(ctx.mParams.organizationID, ctx.mParams.includeChildOrgs, ':onDate:', 'ep.organizationID')}    
  )` : ''

  let runsql
  const sqlBuilder = {
    text: tempAccrualData + `  SELECT {0} {1}
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID
    {2}
    {3}
    {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName, ' (',en.tabNum, ')' ))` },
      taxCode: { field: 'emp.taxCode' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      posID: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'id') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      dictStaffCat: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = ep.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      calcDate: { field: `(select calcDate from hr_employeeExperience exp
         where exp.employeeID = emp.ID and exp.mi_deleteDate >= '9999-12-31' and exp.dictExperienceID = ${ctx.mParams.dictExperienceID || 0})` },
      years: { field: `(select years from hr_positionExperience posExp  
         where posExp.positionID = ep.positionID and posExp.mi_deleteDate >= '9999-12-31' and posExp.dictExperienceID = ${ctx.mParams.dictExperienceID || 0})` },
      months: { field: `(select months from hr_positionExperience posExp  
         where posExp.positionID = ep.positionID and posExp.mi_deleteDate >= '9999-12-31' and posExp.dictExperienceID = ${ctx.mParams.dictExperienceID || 0})` },
      eduName: { field: me.getSqlEdu(sqlDialect.dialect) },
      scienceName: { field: me.getSqlScience(sqlDialect.dialect) },
      academName: { field: me.getSqlAcadem(sqlDialect.dialect) },
      dateAppointmentPos: { field: ` (select ${sqlDialect.top} ep.dateFrom
        from hr_employeePosition ep
        where ep.employeeNumberID = en.ID and ep.isActive = 1 
        and ep.mi_deleteDate >= '9999-12-31'
        and ep.isActive = 1
        and ep.organizationID = en.orgID
        and ep.positionID = (select ${sqlDialect.top} ep2.positionID  from hr_employeePosition ep2
               where ep2.employeeNumberID = en.ID and ep2.isActive = 1 
               and ep2.dateFrom <= en.dateTo and ep2.dateTo >= en.dateFrom
               and ep2.mi_deleteDate >= '9999-12-31'
               and ep2.isActive = 1
               and ep2.organizationID = en.orgID
               order by ep2.dateFrom desc ${sqlDialect.limit})
        order by ep.dateFrom ${sqlDialect.limit})
      ` },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      accrualSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'ep.accrualSum' },
      accrualSumPos: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : `${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'accrualSum', '')}` },
      certification: { field: me.getSqlCertification(sqlDialect.dialect) },
      tarifName: { field: `(select ${sqlDialect.top} dictTC.name from hr_dictTarifCoeff dictTC where dictTC.id = ep.dictTarifCoeffID and dictTC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      tarifNamePos: { field: ` (select ${sqlDialect.top} dictTC.name
        from hr_position posSubQ 
        left join hr_dictTarifCoeff dictTC on dictTC.id = posSubQ.dictTarifCoeffID and dictTC.mi_deleteDate >= '9999-12-31' 
        where posSubQ.mi_data_id = ep.positionID and posSubQ.state = 'ACTIVE' 
          and posSubQ.mi_dateFrom <= :onDate:  and posSubQ.mi_deleteDate >= '9999-12-31'
        order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})` },
      empCategoryPos: { field: ` (select ${sqlDialect.top} dictEC.name
        from hr_position posSubQ 
        left join hr_dictEmpCategory dictEC on dictEC.id = posSubQ.dictEmpCategoryID and dictEC.mi_deleteDate >= '9999-12-31' 
        where posSubQ.mi_data_id = ep.positionID and posSubQ.state = 'ACTIVE' 
          and posSubQ.mi_dateFrom <= :onDate:  and posSubQ.mi_deleteDate >= '9999-12-31'
        order by posSubQ.mi_dateFrom desc ${sqlDialect.limit})` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.dontRequirements = ctx.mParams.dontRequirements
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.dictEducationLevelID = ctx.mParams.dictEducationLevelID
  sqlBuilder.clauses.whereParams.dictDegreeID = ctx.mParams.dictDegreeID
  sqlBuilder.clauses.whereParams.dictAcademStatusID = ctx.mParams.dictAcademStatusID
  sqlBuilder.clauses.whereParams.dictExperienceID = ctx.mParams.dictExperienceID
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY fullFIO'

  if (ctx.mParams.options && ctx.mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql)
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

me.getWhereClause = function (mParams, sqlDialect) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  const whereEduLevelTypePosition = ` EXISTS(select ID from hr_positionEducation eduPos       
        where eduPos.positionID = ep.positionID and eduPos.mi_deleteDate >= '9999-12-31' ` +
    (mParams.dictEducationLevelID ? ` and eduPos.dictEducationLevelID in (${mParams.dictEducationLevelID}) ` : '') +
    ` and ${mParams.dontRequirements ? 'NOT' : ''} EXISTS(select ID from hr_employeeEducation edu
      where edu.employeeID = emp.ID and edu.mi_deleteDate >= '9999-12-31'
      and edu.dictEducationLevelID = eduPos.dictEducationLevelID ))`

  /*
  const whereDegreeLevel = ` EXISTS(select ID from hr_positionDegreeLevel rsPos
        where rsPos.positionID = ep.positionID and rsPos.mi_deleteDate >= '9999-12-31' ` +
    (mParams.dictDegreeID ? ` and rsPos.dictDegreeID in (${mParams.dictDegreeID}) ` : '') +
    ` and ${mParams.dontRequirements ? 'NOT' : ''} EXISTS(select ID from hr_empRangeScience rs
      where rs.employeeID = emp.ID and rs.mi_deleteDate >= '9999-12-31'
      and rs.dictDegreeID = rsPos.dictDegreeID ))`

  const whereAcademStatusPosition = ` EXISTS(select ID from hr_positionAcademStatus acsPos       
        where acsPos.positionID = ep.positionID and acsPos.mi_deleteDate >= '9999-12-31' ` +
    (mParams.dictAcademStatusID ? ` and acsPos.dictAcademStatusID in (${mParams.dictAcademStatusID}) ` : '') +
    ` and ${mParams.dontRequirements ? 'NOT' : ''} EXISTS(select ID from hr_empAcademStatus acs       
      where acs.employeeID = emp.ID and acs.mi_deleteDate >= '9999-12-31'      
      and acs.dictAcademStatusID = acsPos.dictAcademStatusID ))`
   */

  const whereEmployeeExperience = ` EXISTS(select ID from hr_positionExperience posExp       
        where posExp.positionID = ep.positionID and posExp.mi_deleteDate >= '9999-12-31' ` +
    (mParams.dictExperienceID ? ` and posExp.dictExperienceID = ${mParams.dictExperienceID} ` : '') +
    ` and ${mParams.dontRequirements ? 'NOT' : ''} EXISTS(select ID from hr_employeeExperience exp
      where exp.employeeID = emp.ID and exp.mi_deleteDate >= '9999-12-31'
      and ${sqlDialect.dialect === 'MSSQL2012' ? '(DATEDIFF(mm, exp.calcDate, :onDate:) - 1)' : "(date_part('year', AGE(:onDate:, exp.calcDate)) * 12 + date_part('month', AGE(:onDate:, exp.calcDate)))"} >= 
      (COALESCE(posExp.years, 0) * 12 + COALESCE(posExp.months, 0)) 
      and posExp.dictExperienceID = exp.dictExperienceID ))`

  const oper = mParams.dontRequirements ? ' or ' : ' and '
  let condition = ''
  if (mParams.dictEducationLevelID) {
    condition = whereEduLevelTypePosition
  }
  if (mParams.dictDegreeID) {
    const whereDegreeLevel =
      ` ( ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictDegreeID', '')} is not null ` +
      ` and ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictDegreeID', '')} ` +
      ` NOT IN (select dictDegreeID from hr_empRangeScience rs where rs.employeeID = emp.ID and rs.mi_deleteDate >= '9999-12-31' )) `
    condition += (condition.length ? oper : '') + whereDegreeLevel
  }
  if (mParams.dictAcademStatusID) {
    const whereAcademStatusPosition =
      ` ( ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictAcademStatusID', '')} is not null ` +
      ` and ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictAcademStatusID', '')} ` +
      ` NOT IN (select dictAcademStatusID from hr_empAcademStatus acs where acs.employeeID = emp.ID and acs.mi_deleteDate >= '9999-12-31' )) `
    condition += (condition.length ? oper : '') + whereAcademStatusPosition
  }
  if (mParams.dictExperienceID) {
    condition += (condition.length ? oper : '') + whereEmployeeExperience
  }

  if (mParams.salary) {
    condition += (condition.length ? oper : '') + ` (ep.accrualSum <> ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'accrualSum', '')}) `
  }

  if (mParams.category) {
    const whereCategory =
        ` ( ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictEmpCategoryID', '')} is not null ` +
        ` and ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictEmpCategoryID', '')} ` +
        ` NOT IN (select dictEmpCategoryID from hr_empCertificationAcc cer where cer.employeeID = emp.ID and cer.mi_deleteDate >= '9999-12-31' )) `
    condition += (condition.length ? oper : '') + whereCategory
  }

  if (mParams.tarif) {
    condition += (condition.length ? oper : '') + ` (ep.dictTarifCoeffID <> ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'dictTarifCoeffID', '')}) `
  }

  if (mParams.accrual) {
    condition += (condition.length ? oper : '') + `
    EXISTS (
      select pa.id from hr_positionaccrual pa 
        left join tmpAcc on pa.positionid = tmpAcc.pos_id and tmpAcc.employeenumberid = ep.employeeNumberID and pa.payelid = tmpAcc.payelid 
      where pa.positionID = ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'id', '')}
      and pa.mi_deletedate >= '9999-12-31' and :onDate: between pa.datefrom and pa.dateto
      and ((pa.accrualsum is not null and (tmpAcc.accrualsum != pa.accrualsum or tmpAcc.accrualsum is null))        
      or (pa.accrualrate is not null and (tmpAcc.accrualrate != pa.accrualrate or tmpAcc.accrualrate is null)))    
    ) `
  }

  condition = condition.length ? condition : '1 = 0'

  return ` emp.mi_deleteDate >= '9999-12-31'
    and en.mi_deleteDate >= '9999-12-31' 
    and ep.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo     
    and :onDate: between ep.dateFrom and ep.dateTo
    and ( ${condition} )
  ${orgClause}
  ${depClause}     
    `
}
