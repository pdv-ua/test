const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: `
      select {0} {1}
        from hr_employeeDocAuditDt ea

      join hr_employeeDocAudit hda 
        on ea.employeeDocAuditID=hda.ID
      
      join hr_employee emp 
        on emp.ID = ea.employeeID
    
      left join hr_dictAuditOrg aud 
        on aud.ID = ea.organizationAuditID
       
      left join ac_contractor acc
        on aud.contractorID = acc.ID
      
      left join hr_outgoingFalseFact hro
        on ea.resultFactID = hro.ID
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'emp.ID' },
      employeeNumberID: { field: `(SELECT ${sqlDialect.top} ID FROM hr_employeeNumber en WHERE en.employeeID=emp.ID AND en.orgID = :orgID:
          and en.dateFrom <= :onDate: and en.dateTo >= :onDate: AND en.mi_deleteDate >= '9999-12-31') ${sqlDialect.limit}` },
      lastName: { field: 'emp.lastName' },
      firstName: { field: 'emp.firstName' },
      middleName: { field: 'emp.middleName' },
      auditType: { field: 'aud.auditType' },
      ingoingDate: { field: 'ea.ingoingDate' },
      ingoingNumber: { field: 'ea.ingoingNumber' },
      controlDate: { field: 'ea.controlDate' },
      outgoingDate: { field: 'ea.outgoingDate' },
      outgoingNumber: { field: 'ea.outgoingNumber' },
      outgoingComment: { field: 'ea.outgoingComment' },
      resultDate: { field: 'ea.resultDate' },
      auditOrganization: { field: 'COALESCE(acc.name, ea.organizationAuditName)' },
      resultFactCode: { field: 'hro.code' },
      resultFactName: { field: 'hro.name' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.dateFrom = mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = mParams.dateTo
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.auditOrganizationName = mParams.auditOrganizationName
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY ea.ingoingDate, emp.lastName'

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

me.getWhereClause = function (mParams) {
  return `
    ea.controlDate >= :dateFrom:
    and ea.controlDate <= :dateTo:    
    and hda.orgID = :orgID:
    ${(mParams.auditOrganizationName) ? "and (acc.name like '%" + mParams.auditOrganizationName + "%' OR ea.organizationAuditName like '%" + mParams.auditOrganizationName + "%')" : ''}        
    and emp.mi_deleteDate >= '9999-12-31'
    and COALESCE(aud.mi_deleteDate, '9999-12-31') = '9999-12-31'
    and ea.mi_deleteDate >= '9999-12-31'
    and EXISTS (SELECT 1  FROM ac_employeeOrg WHERE employeeID=emp.ID AND organizationID = :orgID: AND mi_deleteDate >= '9999-12-31')
  `
}
