const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text:
            ` SELECT {0} {1}
      FROM hr_employeePosition ep  
JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
JOIN hr_employee emp ON emp.ID = en.employeeID
LEFT JOIN (SELECT bn.employeeID,
  ( ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF(
   (SELECT '; ' + bfk2.name 
   FROM hr_employeeBenefits bn2 
   JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID
   WHERE
   bn2.mi_deleteDate >= '9999-12-31'  
   and bn2.mi_deleteDate >= '9999-12-31'
   and bfk2.mi_deleteDate >= '9999-12-31' 
   and  bfk2.type = '3'
   and :dateFrom: between bn2.dateFrom and bn2.dateTo 
   and bn2.employeeID = bn.employeeID
   FOR XML PATH ('')), 1, 1, ''
   )`
    : `(SELECT STRING_AGG(bfk2.name, '; ') FROM hr_employeeBenefits bn2 
   JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID
   WHERE
   bn2.mi_deleteDate >= '9999-12-31'  
   and bn2.mi_deleteDate >= '9999-12-31'
   and bfk2.mi_deleteDate >= '9999-12-31' 
   and  bfk2.type = '3'
   and :dateFrom: between bn2.dateFrom and bn2.dateTo 
   and bn2.employeeID = bn.employeeID)`}) as benefitName, 
  ( ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT '; ' + bn2.comment FROM hr_employeeBenefits bn2 
   JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID   
   WHERE
   bn2.mi_deleteDate >= '9999-12-31'  
   and bn2.mi_deleteDate >= '9999-12-31'
   and bfk2.mi_deleteDate >= '9999-12-31' 
   and  bfk2.type = '3'
   and :dateFrom: between bn2.dateFrom and bn2.dateTo 
   and bn2.employeeID = bn.employeeID
   FOR XML PATH ('')), 1, 1, ''
   )`
    : `(SELECT STRING_AGG(bn2.comment, '; ') FROM hr_employeeBenefits bn2 
   JOIN hr_dictBenefitsKind bfk2 on bfk2.ID = bn2.dictBenefitsKindID   
   WHERE
   bn2.mi_deleteDate >= '9999-12-31'  
   and bn2.mi_deleteDate >= '9999-12-31'
   and bfk2.mi_deleteDate >= '9999-12-31' 
   and  bfk2.type = '3'
   and :dateFrom: between bn2.dateFrom and bn2.dateTo 
   and bn2.employeeID = bn.employeeID)`}) as benefitComment 
FROM hr_employeeBenefits bn
JOIN hr_dictBenefitsKind bfk on bfk.ID = bn.dictBenefitsKindID 
WHERE
bn.mi_deleteDate >= '9999-12-31'  
and bfk.mi_deleteDate >= '9999-12-31' 
and  bfk.type = '3'
and :dateFrom: between bn.dateFrom and bn.dateTo
GROUP BY bn.employeeID
)ebn ON en.employeeID = ebn.employeeID

LEFT JOIN (SELECT vp.employeeNumberID
,sum(vp.dayCount) as dayCount
FROM hr_empVacationPlan vp
WHERE
vp.mi_deleteDate >= '9999-12-31'  
and vp.dictVacationKindID in (${ctx.mParams.dictVacationKindID})
and :dateFrom: between vp.dateFrom and vp.dateTo
GROUP BY vp.employeeNumberID
) vac ON en.ID = vac.employeeNumberID
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateFrom:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':dateFrom:', 'ep.departmentID', 'name') },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') },
      // posName: { field: staffService.getPosNameByIDSql() },
      posName: { field: staffService.getPosFldOnDateSql(':dateFrom:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      benefitName: { field: 'ebn.benefitName' },
      dayCount: { field: 'vac.dayCount' },
      benefitComment: { field: 'ebn.benefitComment' },
      vacations: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(SELECT STUFF((select ', ' + vk.name FROM hr_empVacationPlan vp 
        JOIN hr_dictVacationKind vk on vk.ID = vp.dictVacationKindID
        WHERE vp.mi_deleteDate >= '9999-12-31' and vk.mi_deleteDate >= '9999-12-31'
          and vp.dictVacationKindID in (${ctx.mParams.dictVacationKindID})
          and :dateFrom: between vp.dateFrom and vp.dateTo 
          and vp.employeeNumberID = en.ID
        FOR XML PATH ('')), 1, 1, ''))`
        : `(SELECT STRING_AGG(vk.name, ', ') FROM hr_empVacationPlan vp 
        JOIN hr_dictVacationKind vk on vk.ID = vp.dictVacationKindID
        WHERE vp.mi_deleteDate >= '9999-12-31' and vk.mi_deleteDate >= '9999-12-31'
          and vp.dictVacationKindID in (${ctx.mParams.dictVacationKindID})
          and :dateFrom: between vp.dateFrom and vp.dateTo 
          and vp.employeeNumberID = en.ID)` }
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
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dictVacationKindID = ctx.mParams.dictVacationKindID
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

me.getWhereClause = function (mParams) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1 
    and en.mi_deleteDate >= '9999-12-31' 
    and ep.mi_deleteDate >= '9999-12-31' 
    and emp.mi_deleteDate >= '9999-12-31' 
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo 
    -- and vac.dayCount is not null 
    and ((ebn.benefitName is not null) or (vac.dayCount is not null)) 
  ${orgClause}
  ${depClause}     
   `
}
