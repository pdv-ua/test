const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const benKindClause = mParams.dictBenefitsKind ? ` and bfk2.ID = :dictBenefitsKind: ` : ''
  const sqlDialect = entityBaseService.getSQLDialect()
  // TODO: rewrite sqlBuilder and his where params
  let runsql
  const sqlBuilder = {
    text: ` SELECT {0} {1}
      FROM hr_employeePosition ep 
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID  
      LEFT JOIN ac_address adr on adr.ID =  (select ${sqlDialect.top} adr2.ID from ac_address adr2 
where adr2.ownerID = emp.ID 
and adr2.mi_deleteDate >= '9999-12-31' 
and adr2.addressType = '2' 
order by adr2.mi_createDate desc ${sqlDialect.limit})      
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      firstName: { field: 'emp.firstName' },
      lastName: { field: 'emp.lastName' },
      middleName: { field: 'emp.middleName' },
      benName: { field: `${sqlDialect.dialect === 'MSSQL2012'
        ? ` STUFF((SELECT '; ' + bfk2.name     
FROM hr_employeeBenefits bn2 JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID      
WHERE    bn2.mi_deleteDate >= '9999-12-31'      and bn2.mi_deleteDate >= '9999-12-31'    and bfk2.mi_deleteDate >= '9999-12-31'     
and  bfk2.type = '3' and :onDate: between bn2.dateFrom and bn2.dateTo     and bn2.employeeID = emp.ID  
${benKindClause}  
FOR XML PATH ('')), 1, 1, '')`
        : `(SELECT STRING_AGG(bfk2.name, '; ') FROM hr_employeeBenefits bn2 JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID      
WHERE    bn2.mi_deleteDate >= '9999-12-31'      and bn2.mi_deleteDate >= '9999-12-31'    and bfk2.mi_deleteDate >= '9999-12-31'     
and  bfk2.type = '3' and :onDate: between bn2.dateFrom and bn2.dateTo     and bn2.employeeID = emp.ID  
${benKindClause})`}` },
      benComment: { field: ` ${sqlDialect.dialect === 'MSSQL2012'
        ? `STUFF((SELECT '; ' + bn2.comment     
FROM hr_employeeBenefits bn2    
JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID      
WHERE bn2.mi_deleteDate >= '9999-12-31' and bn2.mi_deleteDate >= '9999-12-31'    
and bfk2.mi_deleteDate >= '9999-12-31' and  bfk2.type = '3' and :onDate: between bn2.dateFrom and bn2.dateTo     
and bn2.employeeID = emp.ID   
${benKindClause} 
FOR XML PATH ('')), 1, 1, '')`
        : `(SELECT STRING_AGG(bn2.comment, '; ') FROM hr_employeeBenefits bn2    
JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID      
WHERE bn2.mi_deleteDate >= '9999-12-31' and bn2.mi_deleteDate >= '9999-12-31'    
and bfk2.mi_deleteDate >= '9999-12-31' and  bfk2.type = '3' and :onDate: between bn2.dateFrom and bn2.dateTo     
and bn2.employeeID = emp.ID   
${benKindClause} )`}` },
      regAddress: { field: 'adr.address' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      workPlace: { field: `(case when ep.workPlace is not null then ep.workPlace else '99' end)` },
      actualPositionName: { field: 'ep.factPosition' },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      empDocs: {
        field: ` ${sqlDialect.dialect === 'MSSQL2012'
          ? `STUFF((SELECT DISTINCT '; ' + doc2.description      FROM hr_employeeBenefits bn2      
JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID   
JOIN hr_employeeBenefitsDoc benDoc2 on benDoc2.employeeBenefitID = bn2.ID 
and benDoc2.mi_deleteDate >= '9999-12-31'  
JOIN hr_employeeDocs doc2 on doc2.ID = benDoc2.employeeDocID  
and doc2.mi_deleteDate >= '9999-12-31'         
JOIN ac_dictDocKind docKind2 on docKind2.ID = doc2.dictDocKindID and docKind2.docType = '2' and docKind2.mi_deleteDate >= '9999-12-31'  
WHERE     bn2.mi_deleteDate >= '9999-12-31'  and bfk2.mi_deleteDate >= '9999-12-31'      and bfk2.type = '3'     and :onDate: between bn2.dateFrom and bn2.dateTo      
${benKindClause} 
and bn2.employeeID = emp.ID  FOR XML PATH ('')), 1, 1, ''    )`
          : `(SELECT STRING_AGG(doc2.description, '; ') FROM hr_employeeBenefits bn2      
JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID   
JOIN hr_employeeBenefitsDoc benDoc2 on benDoc2.employeeBenefitID = bn2.ID 
and benDoc2.mi_deleteDate >= '9999-12-31'  
JOIN hr_employeeDocs doc2 on doc2.ID = benDoc2.employeeDocID  
and doc2.mi_deleteDate >= '9999-12-31'         
JOIN ac_dictDocKind docKind2 on docKind2.ID = doc2.dictDocKindID and docKind2.docType = '2' and docKind2.mi_deleteDate >= '9999-12-31'  
WHERE     bn2.mi_deleteDate >= '9999-12-31'  and bfk2.mi_deleteDate >= '9999-12-31'      and bfk2.type = '3'     and :onDate: between bn2.dateFrom and bn2.dateTo      
${benKindClause} 
and bn2.employeeID = emp.ID)`}`
      }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.regionID = mParams.regionID
  sqlBuilder.clauses.whereParams.dictBenefitsKind = mParams.dictBenefitsKind
  sqlBuilder.clauses.groupClause = ` GROUP BY emp.firstName, emp.lastName, emp.middleName, adr.address, emp.ID, en.dateFrom , 
  en.dateTo, en.ID, ep.departmentID ,ep.positionID, en.orgID, ep.dictPositionID`
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

me.getWhereClause = function (mParams, sqlDialect) {
  const benKindClause = mParams.dictBenefitsKind ? ` and dicBen.ID = :dictBenefitsKind: ` : ''
  const regionClause = mParams.regionID ? ` and adr.regionID = :regionID: ` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return `
     ep.isActive = 1 
    and :onDate: between en.dateFrom and en.dateTo 
    and ep.mi_deleteDate >= '9999-12-31'
    and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 where ep2.isActive = 1 and  ep2.dateTo >= :onDate: and  ep2.dateFrom <= :onDate:
       and ep2.employeeID = emp.ID and ep2.mi_deleteDate >= '9999-12-31' 
       and ep2.organizationID = en.orgID order by ep2.dateFrom desc ${sqlDialect.limit})   
    ${orgClause}
    ${depClause}     
    ${regionClause} 
    and en.mi_deleteDate >= '9999-12-31' 
    and emp.mi_deleteDate >= '9999-12-31'  
    and EXISTS(select ben.ID from hr_employeeBenefits ben       
        JOIN hr_dictBenefitsKind dicBen on dicBen.ID = ben.dictBenefitsKindID 
        where ben.employeeID = emp.ID and ben.dateFrom <= :onDate: and ben.dateTo >= :onDate: and dicBen.type = '3' 
        ${benKindClause} 
        and ben.mi_deleteDate >= '9999-12-31' 
        and dicBen.mi_deleteDate >= '9999-12-31'  
    )        
  `
}
