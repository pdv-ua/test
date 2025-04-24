const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: me.getSqlBuilderText(),
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      firstName: { field: 'emp.firstName' },
      lastName: { field: 'emp.lastName' },
      middleName: { field: 'emp.middleName' },
      fullFIO: { field: 'emp.fullFIO' },
      sexType: { field: 'emp.sexType' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      taxCode: { field: 'emp.taxCode' },
      posCategory: { field: staffService.getPosCatShortNameSql() },
      rankCur: { field: `
      (Select ${sqlDialect.top} rankTypes.name from hr_publServRang ranks 
        join hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID
        where 
        en.employeeID = ranks.employeeID 
        and ranks.dateFrom = 
            (select ${sqlDialect.top} r.dateFrom from hr_publServRang r
            where 
            r.employeeID = ranks.employeeID
            and r.dateFrom <= :dateFrom: 
            and r.dateTo >= :dateFrom: 
            and r.mi_deleteDate >= '9999-12-31' 
            order by r.dateFrom desc ${sqlDialect.limit}
            )
        and ranks.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit} 
        ) 
      ` },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depID: { field: 'ep.departmentID' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      dictPenaltyName: { field: 'dp.name' },
      dictPenaltyReasonName: { field: 'dpr.name' },
      docIssuedDate: { field: 'p.docIssuedDate' },
      dateClosed: { field: 'p.dateClosed' },
      appealDate: { field: 'p.appealDate' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.dateFrom = mParams.dateFrom
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY p.docIssuedDate, emp.fullFIO '

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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
  return ` ep.isActive = 1 
    and p.docIssuedDate <= :dateFrom: 
    and p.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'       
    and en.mi_deleteDate >= '9999-12-31' 
    and :onDate: between en.dateFrom and en.dateTo 
    and :onDate: between ep.dateFrom and ep.dateTo     
  ${orgClause}
  ${depClause}     
    `
}

me.getSqlBuilderText = function () {
  let txt = ` SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID       
      JOIN hr_employeePenalty p ON p.employeeID = emp.ID
      JOIN hr_dictPenalty dp ON dp.ID = p.dictPenaltyID
           and dp.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_dictPenaltyReason dpr ON dpr.ID = p.dictPenaltyReasonID
           and dpr.mi_deleteDate >= '9999-12-31'

      {2} {3} {4}
    `
  return txt
}
