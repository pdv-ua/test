const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

function formSqlBuilder (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  if (ctx.mParams.includeChildOrgs) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('mi_treePath', 'like', `/${ctx.mParams.organizationID}%`)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: ctx.mParams.dateFrom })
      .selectAsObject()
    ctx.mParams.orgIDs = orgs.map(itm => itm.mi_data_id)
  } else {
    ctx.mParams.orgIDs = [ctx.mParams.organizationID]
  }
  ctx.mParams.orgIDs = ctx.mParams.orgIDs.join(', ')

  const sqlText = ctx.mParams.byAccrual
    ? `SELECT {0} {1}
    FROM hr_accrual acc
    JOIN hr_employeeNumber en on acc.employeeNumberID = en.ID
    JOIN hr_employeePosition ep ON en.ID = ep.employeeNumberID
    JOIN hr_employee emp on en.employeeID = emp.ID
    INNER JOIN hr_payEl pf ON pf.ID = acc.payElID and pf.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_method meth on pf.methodID = meth.ID and meth.mi_deleteDate >= '9999-12-31' 
    INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID and methGr.mi_deleteDate >= '9999-12-31' and methGr.code = 7  
    LEFT JOIN hr_order ord ON ord.id = acc.orderID and ord.mi_deleteDate >= '9999-12-31'
    LEFT JOIN ubm_enum e_workPlace ON e_workPlace.code = ep.workPlace
        and e_workPlace.eGroup = 'HR_WORKER_PLACE'
    `
    : `SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID  
      JOIN hr_employee emp on en.employeeID = emp.ID 
      LEFT JOIN ubm_enum e_workPlace ON e_workPlace.code = ep.workPlace
        and e_workPlace.eGroup = 'HR_WORKER_PLACE'
     JOIN (
       select payElID, employeeNumberID, orderID, avgCount, accrualCount, accrualRate, newValue, dateFrom, dateTo, 1 as isBounty, null as cancelOrder
       from  hr_empOrderChgSalEmpDet 
       where  organizationID in (${ctx.mParams.orgIDs})and mi_deleteDate >= '9999-12-31'        
       union all  
       select moneyHelpPayElID as payElID, employeeNumberID, orderID, 0 as avgCount, 0 as accrualCount, 0 as accrualRate, 0 as newValue, dateFrom, dateTo, 0 as isBounty,
          (SELECT ${sqlDialect.top} ho.description FROM hr_empOrderVacationprolongDet hvp JOIN hr_empOrder ho ON hvp.orderID=ho.ID WHERE hvp.grantVacationParaID = det.ID AND ho.orderState <> 'PROJECT' AND hvp.mi_deleteDate >='9999-12-31' ${sqlDialect.limit}) AS cancelOrder       
       from  hr_empOrderVacationDet det
       where  organizationID in (${ctx.mParams.orgIDs}) and mi_deleteDate >= '9999-12-31' and moneyHelpPayElID is not null and isMoneyHelp = 1 
      ) acc on acc.employeeNumberID = ep.employeeNumberID 
      INNER JOIN hr_payEl pf ON pf.ID = acc.payElID and pf.mi_deleteDate >= '9999-12-31' 
      INNER JOIN hr_method meth on pf.methodID = meth.ID and meth.mi_deleteDate >= '9999-12-31' 
      INNER JOIN hr_methodGroup methGr on meth.methodGroupID = methGr.ID and methGr.mi_deleteDate >= '9999-12-31' and methGr.code = 7  
      INNER JOIN hr_order ord ON ord.id = acc.orderID and ord.orderState in ('POSTED', 'PROCESSED') and ord.mi_deleteDate >= '9999-12-31' `

  const sqlBuilder = {
    text: ` ${sqlText}  

      {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      tabNum: { field: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      accrual: { field: ctx.mParams.byAccrual
        ? `(case when pf.calcAvgType = 'AVG' and acc.rate is not null and acc.rate > 0 then CONCAT(cast(acc.rate / 100 as numeric(5, 2)), ' середніх заробітків')
                 when pf.calcAvgType = 'PLAN' and acc.rate is not null and acc.rate > 0 then CONCAT(cast(acc.rate / 100 as numeric(5, 2)), ' окладів')
                 when meth.valuation = 'SUMRATE' and acc.paySum is not null and acc.paySum > 0 then CONCAT(acc.paySum, ' грн') 
                 when meth.valuation = 'SUM' and acc.paySum is not null and acc.paySum > 0 then CONCAT(acc.paySum, ' грн') 
                 when meth.valuation = 'RATE' and acc.rate is not null and acc.rate > 0 then CONCAT(acc.rate, ' %')
                 else '' end )`
        : `(case when acc.isBounty = 1 and acc.avgCount is not null and acc.avgCount > 0 then CONCAT(acc.avgCount, ' середніх заробітків') 
                 when acc.isBounty = 1 and acc.accrualCount is not null and acc.accrualCount > 0 then CONCAT(acc.accrualCount, ' окладів') 
                 when acc.isBounty = 1 and acc.accrualRate is not null and acc.accrualRate > 0 then CONCAT(acc.accrualRate, ' %') 
                 when acc.isBounty = 1 and acc.newValue is not null and acc.newValue > 0 then CONCAT(acc.newValue, ' грн') 
                 when acc.isBounty = 0 and pf.calcAvgType = 'PLAN' then '1 окладів'
                 when acc.isBounty = 0 and pf.calcAvgType <> 'PLAN' then '1 середніх заробітків' else '' end )` },
      payElName: { field: 'pf.name' },
      orderDescription: { field: 'ord.description' },
      actualPositionName: { field: 'ep.factPosition' },
      posName: { field: staffService.getPosFldOnDateSql('COALESCE(ord.entryDate, :dateFrom: )', 'ep.positionID', 'name') },
      depName: { field: staffService.getDepFldOnDateSql('COALESCE(ord.entryDate, :dateFrom: )', 'ep.departmentID', 'name') },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, COALESCE(ord.entryDate, :dateFrom: ), en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, COALESCE(ord.entryDate, :dateFrom: ), en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') },
      dictStaffCatName: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = ep.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      workPlaceName: { field: 'e_workPlace.name' },
      cancelOrder: { field: ctx.mParams.byAccrual ? 'null' : 'acc.cancelOrder' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)

  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(ctx.mParams.dateTo)
  sqlBuilder.clauses.whereParams.payElID = ctx.mParams.payElID
  sqlBuilder.clauses.whereParams.dictStaffCatID = ctx.mParams.dictStaffCatID
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName'

  return sqlBuilder
}

me.search = function (ctx) {
  const sqlBuilder = formSqlBuilder(ctx)
  let runsql

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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts, ':dateFrom:')
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs, ':dateFrom:')
  const payElIDClause = mParams.payElID ? ` and acc.payElID in (${mParams.payElID}) ` : ''
  const dictStaffCatClause = mParams.dictStaffCatID ? ` and ep.dictStaffCatID = ${mParams.dictStaffCatID} ` : ''
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const periodClause = mParams.byAccrual
    ? ' acc.dateFrom <= :dateTo: and acc.dateTo >= :dateFrom: '
    : ' acc.dateFrom between :dateFrom: and :dateTo: '
  const notExistReversal = mParams.byAccrual ? `AND acc.flagsRec & 512 = 0 AND NOT EXISTS(SELECT 1 FROM hr_accrual a where a.employeeNumberID = en.ID and a.linkToParentID = acc.ID and a.flagsRec & 512 = 512)` : ''
  return `
    ${periodClause}
    ${payElIDClause} 
    ${dictStaffCatClause} 
    ${workPlaceClause}
    ${orgClause}
    ${depClause}
    ${notExistReversal}
    and ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'   
    and en.mi_deleteDate >= '9999-12-31'    
    and COALESCE(ord.orderDate, :dateFrom: ) between ep.dateFrom and ep.dateTo 
    and ep.isActive = 1       
    `
}
