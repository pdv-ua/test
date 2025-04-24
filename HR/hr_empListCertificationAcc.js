const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.getSqlEmpLongTermAbsc = function (dialect) {
  const sqlTable = `from hr_empLongTermAbsc absc where absc.employeeNumberID = en.ID
  and absc.mi_deleteDate >= '9999-12-31' and :onDate: between absc.dateFrom and absc.dateTo 
  group by absc.description, absc.dateFrom order by absc.dateFrom `

  const sql = dialect === 'MSSQL2012'
    ? `STUFF((SELECT ', ' + absc.description ${sqlTable} FOR XML PATH ('')), 1, 2, '')`
    : `(SELECT STRING_AGG(absc.description, ', ') ${sqlTable})`

  return sql
}

me.search = function (ctx) {
  ctx.mParams.workPlace = ctx.mParams.workPlace ? ctx.mParams.workPlace.replace(/"/g, "'") : ''
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text: ` 
      with Education as (
      SELECT p.isMain, p.employeeID, e_educationType.name as educationTypeName,
      (select ${sqlDialect.top} cdn_country.name
      from ac_address adr 
      JOIN cdn_country ON cdn_country.id = adr.countryID and cdn_country.mi_deleteDate >= '9999-12-31'
      where adr.ownerID = p.educationOrgID and adr.mi_deleteDate >= '9999-12-31'
      order by case when adr.addressType = '2' then 1 else 2 end asc, adr.id desc
      ${sqlDialect.limit}) as countryName,
      (select ${sqlDialect.top} cdn_city.description
      from ac_address adr 
      JOIN cdn_city ON cdn_city.id = adr.cityID and cdn_city.mi_deleteDate >= '9999-12-31'
      where adr.ownerID = p.educationOrgID and adr.mi_deleteDate >= '9999-12-31'
      order by case when adr.addressType = '2' then 1 else 2 end asc, adr.id desc
      ${sqlDialect.limit}) as cityName,
      ac_contractor.name as educationOrgName,
      spec.name as specialty, p.dateTo as eduDateTo,
      p.docNumber, p.docIssuer, p.dateIssue
  
      FROM hr_employeeEducation p 
      JOIN hr_dictEducationLevel de ON de.ID = p.dictEducationLevelID
           and de.mi_deleteDate >= '9999-12-31'      
      LEFT JOIN ubm_enum e_educationType ON e_educationType.code = de.educationType
        and e_educationType.eGroup = 'HR_EDUCATION_LEVEL'      
      LEFT JOIN ac_contractor ON ac_contractor.id = p.educationOrgID and ac_contractor.mi_deleteDate >= '9999-12-31'  
      LEFT JOIN hr_specialty spec ON spec.ID = p.dictSpecialtyID
           and spec.mi_deleteDate >= '9999-12-31'      
      where p.mi_deleteDate >= '9999-12-31' and  (p.isMain = 1 or e_educationType.code in ('1', '2'))  
      ) 
     SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_empCertificationAcc eca ON eca.employeeID = emp.ID
      LEFT JOIN hr_employeeDocs docs on docs.id = employeeDocID and docs.mi_deleteDate >= '9999-12-31'
      ${staffService.getSqlEmployeePositionOneWorkPlace()}       
    {2}
    {3}
    {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'eca.employeeID' },
      employeeNumberID: { field: 'ep.employeeNumberID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName, ' (',en.tabNum, ')' ))` },
      sexType: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
      birthDate: { field: 'emp.birthDate' },
      taxCode: { field: 'emp.taxCode' },
      typeCertification: { field: `(select ${sqlDialect.top} enum.name from ubm_enum enum where enum.code = eca.typeCertification and enum.eGroup = 'HR_CERTIFICATION_TYPE' ${sqlDialect.limit})` },
      certificationDate: { field: 'eca.certificationDate' },
      validityDate: { field: 'eca.validityDate' },
      dictEmpCategoryName: { field: `(select ${sqlDialect.top} dict.name from hr_dictEmpCategory dict where dict.id = eca.dictEmpCategoryID and dict.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dictSpecialtyName: { field: `(select ${sqlDialect.top} dict.name from hr_specialty dict where dict.id = eca.dictSpecialtyID and dict.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      employeeDocName: { field: `docs.description` },
      orderInfo: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CONCAT(convert(char(10), eca.orderDate, 104),' ', eca.orderNumber,' ',eca.orderAuthor))`
        : `(CONCAT(to_char(eca.orderDate, 'DD.MM.YYYY'),' ', eca.orderNumber,' ',eca.orderAuthor))`
      },
      comment: { field: 'eca.comment' },
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
      startWork: { field: `ep.dateFrom` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
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
      )` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      educationTypeName: { field: `(select ${sqlDialect.top} edu.educationTypeName from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      countryName: { field: `(select ${sqlDialect.top} edu.countryName from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      cityName: { field: `(select ${sqlDialect.top} edu.cityName from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      educationOrgName: { field: `(select ${sqlDialect.top} edu.educationOrgName from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      specialty: { field: `(select ${sqlDialect.top} edu.specialty from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      eduDateTo: { field: `(select ${sqlDialect.top} edu.eduDateTo from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      docNumber: { field: `(select ${sqlDialect.top} edu.docNumber from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      docIssuer: { field: `(select ${sqlDialect.top} edu.docIssuer from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      docIssuedDate: { field: `(select ${sqlDialect.top} edu.dateIssue from Education edu where edu.employeeID = emp.ID order by case when edu.isMain = 1 then 1 else 2 end asc, edu.eduDateTo desc ${sqlDialect.limit})` },
      passport: { field: `(select ${sqlDialect.top} d.description from hr_employeeDocs d inner join ac_dictDocKind dk on dk.id = d.dictDocKindID and dk.docType = '1'
        where d.employeeID = emp.ID and d.state = '1' and d.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      workPlace: { field: `concat((select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit}), ' ', ${me.getSqlEmpLongTermAbsc(sqlDialect.dialect)})` }

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
  sqlBuilder.clauses.whereParams.onDate = dateService.shiftDate(ctx.mParams.onDate)
  sqlBuilder.clauses.whereParams.dateFrom1 = dateService.shiftDate(ctx.mParams.dateFrom1)
  sqlBuilder.clauses.whereParams.dateTo1 = dateService.shiftDate(ctx.mParams.dateTo1)
  sqlBuilder.clauses.whereParams.dateFrom2 = dateService.shiftDate(ctx.mParams.dateFrom2)
  sqlBuilder.clauses.whereParams.dateTo2 = dateService.shiftDate(ctx.mParams.dateTo2)
  sqlBuilder.clauses.whereParams.dateFrom3 = dateService.shiftDate(ctx.mParams.dateFrom3)
  sqlBuilder.clauses.whereParams.dateTo3 = dateService.shiftDate(ctx.mParams.dateTo3)
  sqlBuilder.clauses.whereParams.workPlace = ctx.mParams.workPlace

  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY fullFIO'

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
  const byWorkPlace = mParams.workPlace ? ` and ep.workPlace in (${mParams.workPlace})` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1     
    and ep.mi_deleteDate >= '9999-12-31'       
    and en.mi_deleteDate >= '9999-12-31'
    and emp.mi_deleteDate >= '9999-12-31'
    and eca.mi_deleteDate >= '9999-12-31'
    and :onDate: between en.dateFrom and en.dateTo 
    and :onDate: between ep.dateFrom and ep.dateTo
    ${mParams.dateFrom1 ? ` and eca.validityDate >= :dateFrom1: ` : ''}
    ${mParams.dateTo1 ? ` and eca.validityDate <= :dateTo1: ` : ''}
    ${mParams.dateFrom2 ? ` and docs.docValidUntil >= :dateFrom2: ` : ''}
    ${mParams.dateTo2 ? ` and docs.docValidUntil <= :dateTo2: ` : ''}
    ${mParams.dateFrom3 ? ` and eca.certificationDate >= :dateFrom3: ` : ''}
    ${mParams.dateTo3 ? ` and eca.certificationDate <= :dateTo3: ` : ''}
    ${mParams.dictPositionID ? ` and ep.dictPositionID = ${mParams.dictPositionID}` : ''}
    ${mParams.positionID ? ` and ep.positionID = ${mParams.positionID}` : ''}
    ${mParams.dictSpecialtyID ? ` and eca.dictSpecialtyID = ${mParams.dictSpecialtyID}` : ''}
    ${mParams.dictEmpCategoryID ? ` and eca.dictEmpCategoryID = ${mParams.dictEmpCategoryID}` : ''}
    ${mParams.certificationType ? ` and eca.typeCertification = '${mParams.certificationType}'` : ''}
    ${orgClause}
    ${depClause}     
    ${byWorkPlace}
    ${mParams.dictStaffCatID ? `and ep.positionID in (select mi_data_id from hr_position pos where pos.state = 'ACTIVE'
        and :onDate: between pos.mi_dateFrom and pos.mi_dateTo
        and pos.mi_deleteDate >= '9999-12-31' and pos.dictStaffCatID = ${mParams.dictStaffCatID})` : ''}
    `
}
