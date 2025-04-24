const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const dateService = require('../AC/modules/dataServices/dateService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const staffService = require('./modules/staffService')

me.entity.addMethod('getPaySicknessDataGrid')

me.getPaySicknessDataGrid = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', mParams.organizationID) === true
  let runsql

  let orgIDs = [mParams.organizationID]
  if (mParams.includeSubOrg) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('state', '=', 'ACTIVE')
      .where('mi_treePath', 'like', `%/${mParams.organizationID}/%`)
      .where('mi_dateFrom', '<=', dateService.shiftDate(mParams.periodToDateTo))
      .where('mi_dateTo', '>=', dateService.shiftDate(mParams.periodToDateTo))
      .groupBy('mi_data_id')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    if (orgs.length) {
      orgIDs = orgs.map(o => o.mi_data_id)
    }
  }

  let sqlBuilder = {
    text: ` SELECT {0} {1}
            FROM hr_accrual acc
INNER JOIN hr_dictPeriod period ON period.ID = acc.periodCalcID AND period.orgID = acc.orgID AND period.mi_deleteDate >= '9999-12-31'            
JOIN hr_employeeNumber en on en.ID = acc.employeeNumberID
JOIN hr_employee emp on en.employeeID = emp.ID 
JOIN hr_payEl pl on acc.payElID = pl.ID
JOIN hr_method meth on pl.methodID = meth.ID 
JOIN hr_methodGroup methgr on meth.methodGroupID = methgr.ID
JOIN hr_dictPeriod salperiod on salperiod.ID = acc.periodSalaryID
JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1 
and ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
where ep2.isActive = 1
and ep2.mi_deleteDate >= '9999-12-31' 
and ep2.employeeNumberID = ep.employeeNumberID    
and ep2.dateFrom <= :periodTo: 
order by ep2.dateFrom desc ${sqlDialect.limit})
LEFT JOIN hr_department dep on dep.ID = (select ${sqlDialect.top} dep2.ID from hr_department dep2              
  Where               
  dep2.mi_data_id = ep.departmentID                
  and dep2.orgID = en.orgID                
  and dep2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
 when en.dateTo <= :periodTo: then en.dateTo 
 end)                
  and dep2.mi_deleteDate >= '9999-12-31'               
  and dep2.state = 'ACTIVE'              
  order by dep2.mi_dateFrom desc ${sqlDialect.limit})
  LEFT JOIN hr_organization org on org.ID = (select ${sqlDialect.top} org2.ID from hr_organization org2              
  Where               
  org2.mi_data_id = en.orgID                
  and org2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
                                when en.dateTo <= :periodTo: then en.dateTo end)                
  and org2.mi_deleteDate >= '9999-12-31'               
  and org2.state = 'ACTIVE'              
  order by org2.mi_dateFrom desc ${sqlDialect.limit})
LEFT JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos2.ID from hr_position pos2              
Where              
pos2.mi_data_id = ep.positionID              
and pos2.orgID = en.orgID 
and pos2.mi_dateFrom <= (case when (en.dateTo is null or en.dateTo > :periodTo:) then :periodTo: 
 when en.dateTo <= :periodTo: then en.dateTo 
 end) 
and pos2.mi_deleteDate >= '9999-12-31'              
and pos2.state = 'ACTIVE' 
order by pos2.mi_dateFrom desc ${sqlDialect.limit}            
) 
            {2} {3} {4}`,
    clauses: {},
    aliases: {
      'sum([paySum])': { field: 'sum(acc.paySum)' },
      'sum([days])': { field: 'sum(acc.days)' },
      tabNum: { field: 'en.tabNum' },
      fullFIO: { field: 'emp.fullFIO' },
      oblPeriod: { field: 'salperiod.name' },
      payElID: { field: 'acc.payElID' },
      payElCode: { field: 'pl.code' },
      payElName: { field: 'pl.name' },
      depName: { field: 'dep.name' },
      organizationID: { field: 'en.orgID' },
      orgName: { field: 'org.name' },
      baseSum: { field: 'acc.baseSum' },
      days: { field: 'acc.days' },
      paySum: { field: 'acc.paySum' },
      rate: { field: 'acc.rate' },
      posName: { field: useActualPositionName
        ? 'ep.factPosName'
        : staffService.getPosFldOnDateSql2(':periodTo:', 'ep.positionID', 'name', 'ep.dictPositionID') },
      period: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CASE when methgr.code is not null and methgr.code = '5' and (datepart(year, acc.dateTo) = 9999 or acc.dateTo is null) and acc.dateFrom is not null then CONCAT('з ', format(acc.dateFrom, 'dd.MM.yyyy'))
  when methgr.code is not null and methgr.code = '5' and acc.dateFrom is null and acc.dateTo is not null and datepart(year, acc.dateTo) != 9999 then CONCAT('по ', format(acc.dateTo, 'dd.MM.yyyy'))
  when methgr.code is not null and methgr.code = '5' and acc.dateFrom is not null and acc.dateTo is not null and datepart(year, acc.dateTo) != 9999 then CONCAT('з ', format(acc.dateFrom, 'dd.MM.yyyy'), ' по ', format(acc.dateTo, 'dd.MM.yyyy'))
  ELSE '' END)`
        : `(CASE when methgr.code is not null and methgr.code = '5' and (extract(YEAR from acc.dateTo) = 9999 or acc.dateTo is null) and acc.dateFrom is not null then CONCAT('з ', to_char(acc.dateFrom, 'DD.MM.YYYY'))
  when methgr.code is not null and methgr.code = '5' and acc.dateFrom is null and acc.dateTo is not null and extract(YEAR from acc.dateTo) != 9999 then CONCAT('по ', to_char(acc.dateTo, 'DD.MM.YYYY'))
  when methgr.code is not null and methgr.code = '5' and acc.dateFrom is not null and acc.dateTo is not null and extract(YEAR from acc.dateTo) != 9999 then CONCAT('з ', to_char(acc.dateFrom, 'DD.MM.YYYY'), ' по ', to_char(acc.dateTo, 'DD.MM.YYYY'))
  ELSE '' END)`
      },
      dateFrom: { field: `(CASE when methgr.code is not null and methgr.code = '5' and acc.dateTo is not null then acc.dateFrom ELSE null END)` },
      dateTo: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CASE when methgr.code is not null and methgr.code = '5' and not (datepart(year, acc.dateTo) = 9999 or acc.dateTo is null) then acc.dateTo ELSE null END)`
        : `(CASE when methgr.code is not null and methgr.code = '5' and not (extract(YEAR from acc.dateTo) = 9999 or acc.dateTo is null) then acc.dateTo ELSE null END)`
      },
      departmentID: { field: 'ep.departmentID' },
      positionID: { field: 'ep.positionID' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)

  sqlBuilder.clauses.whereParams.orgIDs = orgIDs
  sqlBuilder.clauses.whereParams.periodFrom = dateService.shiftDate(mParams.periodFromDateFrom)
  sqlBuilder.clauses.whereParams.periodTo = dateService.shiftDate(mParams.periodToDateTo)
  sqlBuilder.clauses.whereParams.depID = mParams.departmentID

  let aggregate = mParams.fieldList.filter(el => el.indexOf('sum(') !== -1)
  sqlBuilder.clauses.orderClause = aggregate.length > 0 ? sqlBuilder.clauses.orderClause : sqlBuilder.clauses.orderClause || 'ORDER BY dep.treePath, pos.idxNum, emp.fullFIO, pl.name, salperiod.dateFrom'

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

me.getWhereClause = function (params) {
  const limitedAccess = !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')
  let whereDep = ''
  if (params.departmentID && params.includeSubDep) {
    whereDep = ` and ep.departmentID IN (select su.mi_data_id 
      from hr_staffUnit su where  su.mi_deleteDate >= '9999-12-31' 
      and orgID ${entityBaseService.getInExpression('orgIDs')}
      and mi_treePath like '%${params.departmentID}%'
      and su.state = 'ACTIVE') `
  } else if (params.departmentID && !params.includeSubDep) {
    whereDep = ` and ep.departmentID = :depID: `
  }

  return `
    en.orgID ${entityBaseService.getInExpression('orgIDs')}
    and period.dateFrom <= :periodTo: AND period.dateTo >= :periodFrom:  
    and (acc.flagsRec & 8192 != 8192) and methgr.code = '5'
    ${limitedAccess ? ' AND en.limitedAccess = 0 ' : ''}
    and en.mi_deleteDate >= '9999-12-31' 
    and ep.mi_deleteDate >= '9999-12-31'
    and emp.mi_deleteDate >= '9999-12-31'
    ${whereDep} 
    `
}
