const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.getSqlEmpLongTermAbsc = function (dialect) {
  const sqlTable = `from hr_empLongTermAbsc absc where absc.employeeNumberID = en.ID
  and absc.mi_deleteDate >= '9999-12-31' and :onDate: between absc.dateFrom and absc.dateTo 
  group by absc.description, absc.dateFrom order by absc.dateFrom `

  const sql = dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + absc.description ${sqlTable} FOR XML PATH ('')), 1, 0, '')`
    : `(SELECT STRING_AGG(absc.description, ', ') ${sqlTable})`

  return sql
}

me.getSqlSpecialty = function (dialect) {
  const sqlTable = `from hr_employeeEducation edu 
  left join hr_specialty sp on sp.id = edu.dictSpecialtyID and sp.mi_deleteDate >= '9999-12-31' 
  where edu.employeeID = emp.ID and edu.mi_deleteDate >= '9999-12-31' `

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ', ' + sp.name ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(sp.name, ', ') ${sqlTable})`
}

me.getSqlCategory = function (dialect) {
  const sqlTable = `from hr_empCertificationAcc cer 
  left join hr_dictEmpCategory dict on dict.id = cer.dictEmpCategoryID and dict.mi_deleteDate >= '9999-12-31' 
  where cer.employeeID = emp.ID and cer.mi_deleteDate >= '9999-12-31' `

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ', ' + dict.name ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(dict.name, ', ') ${sqlTable})`
}

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    INNER JOIN hr_empCheckMedical empCM on empCM.employeeID = emp.ID and empCM.mi_deleteDate >= '9999-12-31'
    LEFT JOIN hr_dictCheckMedical dictCM on dictCM.ID = empCM.dictCheckMedicalID and dictCM.mi_deleteDate >= '9999-12-31'   
    LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
        and ep2.dateFrom <= :onDate:   
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
        ${staffService.getSqlEmployeePositionOneWorkPlace(':onDate:', 'ep', ctx.mParams.workPlace)}       
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      startWork: { field: `en.dateFrom` },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName, ' (', en.tabNum, ')' ))` },
      sexType: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
      taxCode: { field: 'emp.taxCode' },
      posName: { field: `( case when ep.positionID IS NULL then '${UB.i18n('Поза штатом')}' else ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name')} end)` },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      specialtyName: { field: me.getSqlSpecialty(sqlDialect.dialect) },
      categoryName: { field: me.getSqlCategory(sqlDialect.dialect) },
      workPlace: { field: `concat((select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit}), ${me.getSqlEmpLongTermAbsc(sqlDialect.dialect)})` },
      employeePositionID: { field: 'ep.ID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      depID: { field: 'ep.departmentID' },
      documentInfo: { field: `(select ${sqlDialect.top} CONCAT(d.description, ' ', d.docIssued) from hr_employeeDocs d inner join ac_dictDocKind dk on dk.id = d.dictDocKindID and dk.docType = '1'
        where d.employeeID = emp.ID and d.state = '1' and d.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      dictCheckMedicalName: { field: 'dictCM.name' },
      dateCheck: { field: 'empCM.dateCheck' },
      dateNext: { field: 'empCM.dateNext' },
      dictStaffCatName: { field: `
      (select ${sqlDialect.top} dict.name 
        from hr_position pos         
        join hr_dictStaffCat dict on dict.id = pos.dictStaffCatID
        where 
        pos.mi_data_id = ep.positionID 
        and :onDate: between pos.mi_dateFrom and pos.mi_dateTo 
        and pos.mi_data_id = pos.mi_data_id 
        and pos.state = 'ACTIVE' 
        and pos.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}       
      )` },
      dictCostTypeName: { field: `
      (select ${sqlDialect.top} dict.name 
        from hr_position pos         
        join ac_dictCostType dict on dict.id = pos.dictCostTypeID 
        where 
        pos.mi_data_id = ep.positionID 
        and pos.mi_dateFrom <= en.dateTo 
        and pos.mi_dateTo >= en.dateFrom 
        and pos.mi_data_id = pos.mi_data_id 
        and pos.state = 'ACTIVE' 
        and pos.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}       
      )` }
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
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.dateTo
  sqlBuilder.clauses.whereParams.dateFromNext = ctx.mParams.dateFromNext
  sqlBuilder.clauses.whereParams.dateToNext = ctx.mParams.dateToNext
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.dictCheckMedicalID = ctx.mParams.dictCheckMedicalID
  sqlBuilder.clauses.whereParams.dictEmpCategoryID = ctx.mParams.dictEmpCategoryID
  sqlBuilder.clauses.whereParams.dictStaffCatID = ctx.mParams.dictStaffCatID
  sqlBuilder.clauses.whereParams.dictSpecialtyID = ctx.mParams.dictSpecialtyID

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO '

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
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
  const dictCheckMedicalClause = mParams.dictCheckMedicalID ? ` and empCM.dictCheckMedicalID = ${mParams.dictCheckMedicalID} ` : ''
  const dictStaffCatClause = mParams.dictStaffCatID ? ` and ep.positionID in (select mi_data_id from hr_position pos where pos.state = 'ACTIVE'
    and :onDate: between pos.mi_dateFrom and pos.mi_dateTo
    and pos.mi_deleteDate >= '9999-12-31' and pos.dictStaffCatID = ${mParams.dictStaffCatID})` : ''
  const dictEmpCategoryClause = mParams.dictEmpCategoryID ? ` and EXISTS (select id from hr_empCertificationAcc cer where cer.employeeID = emp.ID
    and cer.mi_deleteDate >= '9999-12-31' and cer.dictEmpCategoryID = ${mParams.dictEmpCategoryID})` : ''
  const dictSpecialtyClause = mParams.dictSpecialtyID ? ` and EXISTS (select id from hr_employeeEducation edu where edu.employeeID = emp.ID
   and edu.mi_deleteDate >= '9999-12-31' and edu.dictSpecialtyID = ${mParams.dictSpecialtyID})` : ''
  const datesClause = (mParams.dateFrom ? ' and empCM.dateCheck >= :dateFrom: ' : '') + (mParams.dateTo ? ' and empCM.dateCheck <= :dateTo: ' : '') +
  (mParams.dateFromNext ? ' and empCM.dateNext >= :dateFromNext: ' : '') + (mParams.dateToNext ? ' and empCM.dateNext <= :dateToNext: ' : '')

  return ` en.mi_deleteDate >= '9999-12-31' 
  and (en.dateTo > :onDate: or en.dateTo is null)
  ${datesClause} 
  ${dictCheckMedicalClause} 
  ${dictEmpCategoryClause} 
  ${dictStaffCatClause} 
  ${dictSpecialtyClause} 
  ${workPlaceClause} 
  ${orgClause}
  ${depClause}     
  `
}
