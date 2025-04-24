const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const sqlBuilder = {
    text:
            ` SELECT {0} {1}
      FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID       
      LEFT JOIN hr_employeeBenefits eb on eb.employeeID = emp.ID and :onDate: between eb.dateFrom and eb.dateTo and eb.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_dictBenefitsKind ebkind on ebkind.ID = eb.dictBenefitsKindID and ebkind.mi_deleteDate >= '9999-12-31'   
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      empBenefitsID: { field: 'eb.ID' },
      depID: { field: 'ep.departmentID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      benefit: { field: 'ebkind.name' },
      dayCount: { field: `
      (Select SUM(ev.dayCount)  
 from hr_empVacationPlan ev       
 join hr_dictVacationKind vac on ev.dictVacationKindID = vac.ID              
 where ev.employeeID = emp.ID  
 and ev.employeeBenefitsID = eb.ID      
 and ev.employeeNumberID = en.ID       
 and ev.mi_deleteDate >= '9999-12-31'  
      )
      ` },
      benefitDateFrom: { field: 'eb.dateFrom' },
      // benefitDateTo: { field: 'eb.dateTo' },
      benefitDateTo: { field: `(case ${sqlDialect.dialect === 'MSSQL2012' ? 'year(eb.dateTo)' : 'Extract(YEAR from eb.dateTo)'} when 9999 then null else eb.dateTo end)` },

      comment: { field: 'eb.comment' },
      docNumber: { field: 'eb.docNumber' },
      benefDocs: { field: `
      (select ${sqlDialect.top}  
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT '; ' + pp.docDesc
        FROM 
        (select docs.ID as docsID, benDocs.employeeDocID as benDocsEmployeeDocID, docs.description as docDesc from
        hr_employeeDocs docs
        JOIN hr_employeeBenefitsDoc benDocs on benDocs.employeeDocID = docs.ID
        JOIN hr_employeeBenefits as benef1 on  benef1.ID = benDocs.employeeBenefitID
        where benef1.mi_deleteDate >= '9999-12-31'
        and benDocs.mi_deleteDate >= '9999-12-31'
        and docs.mi_deleteDate >= '9999-12-31'
        and benDocs.employeeBenefitID = eb.ID
        and benDocs.employeeID = emp.ID) as pp
        FOR XML PATH ('')), 1, 1, '' )`
    : `(SELECT STRING_AGG(pp.docDesc, '; ') FROM 
        (select docs.ID as docsID, benDocs.employeeDocID as benDocsEmployeeDocID, docs.description as docDesc from
        hr_employeeDocs docs
        JOIN hr_employeeBenefitsDoc benDocs on benDocs.employeeDocID = docs.ID
        JOIN hr_employeeBenefits as benef1 on  benef1.ID = benDocs.employeeBenefitID
        where benef1.mi_deleteDate >= '9999-12-31'
        and benDocs.mi_deleteDate >= '9999-12-31'
        and docs.mi_deleteDate >= '9999-12-31'
        and benDocs.employeeBenefitID = eb.ID
        and benDocs.employeeID = emp.ID) as pp)`}
        FROM hr_employeeBenefits
        ${sqlDialect.limit} )
      ` },
      disability: { field: `
      (SELECT ${sqlDialect.top}  
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT '; ' + distype.name + 
        case when disab.disabilityGroup is null then '' else ', група ' + disab.disabilityGroup end +        
        case when (datepart(year, disab.dateFrom) = 2000 or disab.dateFrom is null) then '' else ', з ' + convert(char(10), disab.dateFrom, 104) end +
        case when disab.dateTo is null or CONVERT(char(10), disab.dateTo, 104) = '31.12.9999' then '' else ' по ' + CONVERT(char(10), disab.dateTo, 104) end +
        case when doc.description is null then '' else ', ' + doc.description end
      FROM hr_employeeDisability disab       
        INNER JOIN hr_dictDisabilityType distype ON distype.ID = disab.disabilityID
        LEFT JOIN hr_employeeDocs doc ON doc.ID = disab.employeeDocID   
      WHERE 
        disab.employeeID = emp.ID and disab.mi_deleteDate >= '9999-12-31'
        and :dateFrom: between disab.dateFrom and disab.dateTo 
      FOR XML PATH ('')), 1, 1, '' )`
    : `(SELECT STRING_AGG(CONCAT(distype.name, 
        case when disab.disabilityGroup is null then '' else CONCAT(', група ', disab.disabilityGroup) end,        
        case when (Extract(YEAR from disab.dateFrom) = 2000 or disab.dateFrom is null) then '' else CONCAT(', з ', to_char(disab.dateFrom, 'DD.MM.YYYY')) end,
        case when disab.dateTo is null or Extract(YEAR from disab.dateTo) = 9999 then '' else CONCAT(' по ', to_char(disab.dateTo, 'DD.MM.YYYY')) end,
        case when doc.description is null then '' else CONCAT(', ', doc.description) end), '; ') FROM hr_employeeDisability disab       
        INNER JOIN hr_dictDisabilityType distype ON distype.ID = disab.disabilityID
        LEFT JOIN hr_employeeDocs doc ON doc.ID = disab.employeeDocID   
      WHERE 
        disab.employeeID = emp.ID and disab.mi_deleteDate >= '9999-12-31'
        and :dateFrom: between disab.dateFrom and disab.dateTo)`}
      FROM hr_employeeDisability dis
      ${sqlDialect.limit} )
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
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.workPlaceID = ctx.mParams.workPlaceID

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
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31'
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo    
    and ((
     EXISTS (select dis.ID from hr_employeeDisability dis
     where dis.employeeID = emp.ID and :dateFrom: between dis.dateFrom and dis.dateTo and dis.mi_deleteDate >= '9999-12-31')
     )
     or (ebkind.type = '1')
    )
    ${mParams.workPlaceID ? 'and ep.workPlace = :workPlaceID:' : ''}
    ${orgClause}
    ${depClause}
   `
}
