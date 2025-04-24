const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let txt = ''
  if (mParams.rankGroup) {
    txt = me.getSqlBuilderText(mParams.rankGroup)
  } else {
    txt = me.getSqlBuilderText('AR')
  }

  if (mParams.rankGroup === 'PR' && !mParams.fieldList.includes('employeeNumberID')) {
    mParams.fieldList = [...mParams.fieldList, 'employeeNumberID']
  }

  mParams.showNextRank = mParams.rankGroup !== 'PR'

  let runsql
  let sqlBuilder = {
    text: txt,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      posCategory: { field: staffService.getPosCatShortNameSql() },
      rankCur: { field: 'rankTypes.name' },
      dismDate: { field: sqlDialect.dialect === 'MSSQL2012'
        ? 'CASE year(ep.dateTo) WHEN 9999 THEN null ELSE ep.dateTo END'
        : 'CASE Extract(YEAR from ep.dateTo) WHEN 9999 THEN null ELSE ep.dateTo END'
      },
      rankDateFrom: { field: 'ranks.dateFrom' },
      rankDateNext: { field: 'ranks.dateNext' },
      rankComment: { field: 'ranks.comment' },

      sexType: { field: 'emp.sexType' },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      rankNext: { field: `(select ${sqlDialect.top} rt.name from hr_dictRank rt where rt.code = (cast(cast(rankTypes.code as integer) - 1 as varchar(50))) and rt.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') }
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
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(mParams.dateFrom || mParams.onDate)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(mParams.dateTo || mParams.onDate)
  sqlBuilder.clauses.whereParams.dictRangID = mParams.dictRangID
  sqlBuilder.clauses.whereParams.showDism = mParams.showDism
  if (mParams.rankGroup !== 'PR') {
    sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY ranks.dateFrom, emp.fullFIO'
  } else {
    sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.fullFIO, ranks.dateFrom desc'
  }

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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
  let whereClause = ''
  let rankGroup = mParams.rankGroup || 'AR'
  switch (rankGroup) {
    case 'AR':
      whereClause = ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'       
    and en.mi_deleteDate >= '9999-12-31'
    and en.dateTo >= :dateFrom: 
    and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 where ep2.isActive = 1 and ep2.dateTo >= :onDate: and  ep2.dateFrom <= :onDate:
    and ep2.employeeID = emp.ID  
    and ep2.mi_deleteDate >= '9999-12-31' 
    and ep2.organizationID = en.orgID 
    order by ep2.dateFrom desc ${sqlDialect.limit}) 
    and ranks.mi_deleteDate >= '9999-12-31' 
    and ranks.dateFrom = 
    (select ${sqlDialect.top} r.dateFrom from hr_publServRang r
    where 
    r.employeeID = ranks.employeeID
    and r.dateFrom <= :onDate:
    and r.dateTo >= :onDate: 
    and r.mi_deleteDate >= '9999-12-31' 
    order by r.dateFrom desc ${sqlDialect.limit}
    )
    and rankTypes.mi_deleteDate >= '9999-12-31'
   `
      if (mParams.dictRangID) whereClause += ' and rankTypes.ID = :dictRangID:'

      break

    case 'PR':
      whereClause = ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'   
    and en.mi_deleteDate >= '9999-12-31'
    and en.dateTo >= :dateFrom: 
    and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 where ep2.isActive = 1 and ep2.dateTo >= :dateFrom: and  ep2.dateFrom <= :dateTo:
    and ep2.employeeID = emp.ID 
    and ep2.mi_deleteDate >= '9999-12-31' 
    and ep2.organizationID = en.orgID 
    order by ep2.dateFrom desc ${sqlDialect.limit}) 
    and ranks.mi_deleteDate >= '9999-12-31'
    and ranks.dateFrom in 
    (select r.dateFrom from hr_publServRang r
    where 
    r.employeeID = ranks.employeeID
    and r.dateFrom <= :dateTo:
    and r.dateFrom >= :dateFrom: 
    and r.mi_deleteDate >= '9999-12-31'  
    ) 
    and rankTypes.mi_deleteDate >= '9999-12-31'
    `
      if (mParams.dictRangID) whereClause += ' and rankTypes.ID = :dictRangID:'
      break

    case 'NR':
      whereClause = ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'   
    and en.mi_deleteDate >= '9999-12-31' 
    and en.dateTo >= :dateFrom: 
    and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 where ep2.isActive = 1 and ep2.dateTo >= :dateFrom: and  ep2.dateFrom <= :dateTo:
    and ep2.employeeID = emp.ID 
    and ep2.mi_deleteDate >= '9999-12-31' 
    and ep2.organizationID = en.orgID 
    order by ep2.dateFrom desc ${sqlDialect.limit})
    and ranks.mi_deleteDate >= '9999-12-31'
    and ranks.dateFrom = 
    (select ${sqlDialect.top} r.dateFrom from hr_publServRang r
    where 
    r.employeeID = ranks.employeeID
    and r.dateNext <= :dateTo:
    and r.dateNext >= :dateFrom: 
    and r.dateTo > :dateFrom: 
    and r.mi_deleteDate >= '9999-12-31' 
    order by r.dateFrom desc ${sqlDialect.limit}
    ) 
    and rankTypes.mi_deleteDate >= '9999-12-31'
    `
      if (mParams.dictRangID) whereClause += ` and (cast(cast(rankTypes.code as integer) - 1 as varchar(50))) = (select hdr.code from hr_dictRank hdr where hdr.ID = :dictRangID: and hdr.mi_deleteDate >= '9999-12-31')`
      break
  }
  const maxRankClause = `AND COALESCE((SELECT ${sqlDialect.top} dps.dictRankID FROM hr_dictRankPsCategory dps 
      INNER JOIN hr_dictRank r ON dps.dictRankID=r.ID AND r.mi_deleteDate >='9999-12-31'
      WHERE dps.mi_deleteDate >='9999-12-31' AND dps.psCategory = (case when ep.positionID IS NOT NULL then (select ${sqlDialect.top} pos.psCategory from hr_position pos 
      where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' and  pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}) 
      else (select ${sqlDialect.top} psCategory from hr_dictPosition dp where dp.ID = ep.dictPositionID ${sqlDialect.limit}) end) 
    ORDER BY cast(r.code as integer) ${sqlDialect.limit}), 0) != rankTypes.ID`
  return `${whereClause} 
  ${orgClause}
  ${depClause}     
  ${maxRankClause}
  ${mParams.showDism ? '' : ' and ep.dateTo >= :dateTo: '}
  `
}

me.getSqlBuilderText = function (rankMode) {
  let txt = ''
  switch (rankMode) {
    case 'AR':
      txt = ` SELECT {0} {1}
      FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_publServRang ranks on en.employeeID = ranks.employeeID 
      JOIN hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID
      {2} {3} {4}
    `
      break

    case 'PR':
      txt = ` SELECT {0} {1}
      FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_publServRang ranks on en.employeeID = ranks.employeeID 
      JOIN hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID
      {2} {3} {4}
    `
      break

    case 'NR':
      txt = ` SELECT {0} {1}
      FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_publServRang ranks on en.employeeID = ranks.employeeID 
      JOIN hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID
      {2} {3} {4}
    `
      break
  }
  return txt
}
