const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.getDocumentInfo = function (sqlDialect, field) {
  return `(select ${sqlDialect.top} ${field} 
    from hr_employeeDocs d 
    inner join ac_dictDocKind dk on dk.id = d.dictDocKindID and dk.docType = '3'
    where d.employeeID = emp.ID and d.state = '1' and (d.docValidUntil is null or d.docValidUntil >= :dateTo: or (d.docValidUntil >= :dateFrom: and d.docValidUntil <= :dateTo: )) 
    and d.mi_deleteDate >= '9999-12-31' and dk.mi_deleteDate >= '9999-12-31' order by d.docIssuedDate desc, d.id desc ${sqlDialect.limit})`
}

me.getBenefitsInfo = function (sqlDialect, field) {
  return `(select ${sqlDialect.top} ${field} 
  from hr_employeeBenefits ben
  JOIN hr_dictBenefitsKind dicBen on dicBen.ID = ben.dictBenefitsKindID and dicBen.code = '31'
  where ben.employeeID = emp.ID and ben.dateFrom <= :dateTo: and ben.dateTo >= :dateFrom:
    and ben.mi_deleteDate >= '9999-12-31' and dicBen.mi_deleteDate >= '9999-12-31'
    and not exists( select 1 from hr_employeeDocs d 
    inner join ac_dictDocKind dk on dk.id = d.dictDocKindID and dk.docType = '3'
    where d.employeeID = emp.ID and d.state = '1' and (d.docValidUntil is null or d.docValidUntil >= :dateTo: or (d.docValidUntil >= :dateFrom: and d.docValidUntil <= :dateTo: )) 
    and d.mi_deleteDate >= '9999-12-31' and dk.mi_deleteDate >= '9999-12-31')
    order by ben.dateFrom desc, ben.id desc ${sqlDialect.limit})
     `
}

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'
    LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
        and ep2.dateFrom <= :dateTo:   
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
        ${staffService.getSqlEmployeePositionOneWorkPlace(':dateTo:', 'ep', ctx.mParams.workPlace)}       
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      sexType: { field: 'emp.sexType' },
      posName: { field: `( case when ep.positionID IS NULL then '${UB.i18n('Поза штатом')}' else ${staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'name')} end)` },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      employeePositionID: { field: 'ep.ID' },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name') },
      depID: { field: 'ep.departmentID' },
      docKind: { field: `concat(${me.getDocumentInfo(sqlDialect, 'dk.name')}, ${me.getBenefitsInfo(sqlDialect, `CONCAT('Пільга: ', dicBen.name)`)})` },
      docSeries: { field: me.getDocumentInfo(sqlDialect, 'd.docSeries') },
      docNumber: { field: me.getDocumentInfo(sqlDialect, 'd.docNumber') },
      docValidUntil: { field: me.getDocumentInfo(sqlDialect, 'd.docValidUntil') },
      docIssuedDate: { field: `COALESCE(${me.getDocumentInfo(sqlDialect, 'd.docIssuedDate')}, ${me.getBenefitsInfo(sqlDialect, 'ben.dateFrom')})` },
      selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateTo:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
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
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
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
  const dictStaffCatClause = mParams.dictStaffCatID ? `and ep.dictStaffCatID = ${mParams.dictStaffCatID} ` : ''

  return ` en.mi_deleteDate >= '9999-12-31' 
  and (en.dateTo > :dateFrom: or en.dateTo is null)
  and (EXISTS (select ben.ID from hr_employeeBenefits ben       
        JOIN hr_dictBenefitsKind dicBen on dicBen.ID = ben.dictBenefitsKindID and dicBen.code = '31'
        where ben.employeeID = emp.ID and ben.dateFrom <= :dateTo: and ben.dateTo >= :dateFrom: 
           and ben.mi_deleteDate >= '9999-12-31' and dicBen.mi_deleteDate >= '9999-12-31')  
  or EXISTS (select d.ID from hr_employeeDocs d       
        JOIN ac_dictDocKind dk on dk.id = d.dictDocKindID and dk.docType = '3' and d.state = '1'
        where d.employeeID = emp.ID and (d.docValidUntil is null or d.docValidUntil >= :dateTo: or (d.docValidUntil >= :dateFrom: and d.docValidUntil <= :dateTo: ))
           and d.mi_deleteDate >= '9999-12-31' and dk.mi_deleteDate >= '9999-12-31')      
  )      

  ${dictStaffCatClause} 
  ${workPlaceClause} 
  ${orgClause}
  ${depClause}     
  `
}
