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
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en 
    INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        AND emp.mi_deleteDate >= '9999-12-31'     
    INNER JOIN  (SELECT ts.employeeNumberID as employeeNumberID
      ,o.dateFrom as dateFrom, o.dateTo as dateTo, o.illReason as illReason, o.dayCount as dayCount,
      o.serie, o.orderDate
    FROM tim_timeSheet ts 
    INNER join (select o.ID, 
    coalesce(ordsc.employeeNumberID, drs.employeeNumberID, tou.employeeNumberID) as employeeNumberID, 
    coalesce(ordsc.dateFrom, drs.dateFrom, tou.dateFrom) as dateFrom,
    coalesce(ordsc.dateTo, drs.dateTo, tou.dateTo) as dateTo,
    coalesce(ordscr.name, drsr.name) as illReason,
    ${sqlDialect.dialect === 'MSSQL2012'
    ? `DATEDIFF(day, coalesce(ordsc.dateFrom, drs.dateFrom, tou.dateFrom), coalesce(ordsc.dateTo, drs.dateTo, tou.dateTo)) + 1`
    : `date_part('days', coalesce(ordsc.dateTo, drs.dateTo, tou.dateTo) - coalesce(ordsc.dateFrom, drs.dateFrom, tou.dateFrom)) + 1`}
     as dayCount,
     case when ordsc.id is not null then CONCAT(ordsc.serie, ' ', ordsc.number)
          when drs.id is not null then CONCAT(drs.seria, ' ', drs.orderNumber) else '' end as serie,      
     case when ordsc.id is not null then ordsc.orderDate 
          when drs.id is not null then drs.orderDate else null end as orderDate
  from hr_order o       
Left join hr_empOrderSickness ordsc 
join hr_dictIllnessReason ordscr on ordscr.ID = ordsc.illnessReasonID and ordscr.mi_deleteDate >= '9999-12-31'  
On ordsc.ID = o.ID and ordsc.mi_deleteDate >= '9999-12-31' 
Left join hr_docRegSickness drs   
join hr_dictIllnessReason drsr on drsr.ID = drs.dictIllnessReasonID and drsr.mi_deleteDate >= '9999-12-31'  
On drs.ID = o.ID and drs.mi_deleteDate >= '9999-12-31' 
Left join hr_empOrderUni tou on tou.ID = o.ID and tou.mi_deleteDate >= '9999-12-31'
    ) o  ON o.ID = ts.orderID and o.employeeNumberID = ts.employeeNumberID
    WHERE ts.isActive = 1
      and ts.dateWork between :dateFrom: and :dateTo:
      and ts.mi_deleteDate >= '9999-12-31'
      and EXISTS (SELECT 1 FROM hr_dictTimeCostGroup tcgr
        INNER JOIN hr_dictTimeGroup gr ON gr.ID = tcgr.dictTimeGroupID
          and gr.mi_deleteDate >= '9999-12-31'
        WHERE tcgr.dictTimeCostID = ts.factTimeCostID
          and :dateFrom: between tcgr.dateFrom and tcgr.dateTo
          and tcgr.mi_deleteDate >= '9999-12-31'
          and gr.code = 'LST_SICKNESS') 
     GROUP BY ts.employeeNumberID, ts.orderID, ts.factTimeCostID
     ,o.dateFrom, o.dateTo, o.illReason, o.dayCount, o.serie, o.orderDate  
    ) ts  ON ts.employeeNumberID = en.ID 
        
    LEFT JOIN  hr_employeePosition ep ON 
 ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
 ep2.employeeNumberID = en.ID 
 and ep2.isActive = 1
 and ep2.dateFrom <= :dateTo:   
 and ep2.mi_deleteDate >= '9999-12-31' 
 order by ep2.dateFrom desc ${sqlDialect.limit})
    {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: 'emp.fullFIO' },
      taxCode: { field: 'emp.taxCode' },
      sexType: { field: 'emp.sexType' },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      dayCount: { field: 'ts.dayCount' },
      illDateFrom: { field: 'ts.dateFrom' },
      illDateTo: { field: 'ts.dateTo' },
      illnessReason: { field: 'ts.illReason' },
      serie: { field: 'ts.serie' },
      orderDate: { field: 'ts.orderDate' },
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

  return ` en.mi_deleteDate >= '9999-12-31'
  and (en.dateTo > :dateFrom: or en.dateTo is null)
  ${workPlaceClause} 
  ${orgClause}
  ${depClause}     
  `
}
