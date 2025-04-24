const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

function getOrderInfo (sqlDialect, empOrderTypes) {
  const dateSql = sqlDialect.dialect === 'MSSQL2012'
    ? `(CASE when ord.orderDate is not null then CONCAT('${UB.i18n('від ')}', convert(char(10), ord.orderDate, 104)) ELSE '' END)`
    : `(CASE when ord.orderDate is not null then CONCAT('${UB.i18n('від ')}', to_char(ord.orderDate, 'DD.MM.YYYY')) ELSE '' END)`
  const numberSql = `(case when ord.orderNumber is not null then CONCAT('№', ord.orderNumber) else '' end)`
  return `(select ${sqlDialect.top} CONCAT(${numberSql}, ' ', ${dateSql}) 
  from hr_empOrderDet det join hr_order ord on ord.id = det.orderID 
  where det.employeeNumberID = en.id and ord.orderState in ('POSTED', 'PROCESSED') 
  and det.mi_deleteDate >= '9999-12-31' and ord.mi_deleteDate >= '9999-12-31'
  and det.empOrderType in (${empOrderTypes}) order by ord.id  desc ${sqlDialect.limit}) `
}

function formSqlBuilder (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()

  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM hr_employeeNumber en
    LEFT JOIN  hr_employeePosition ep ON 
      ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2 where 
        ep2.employeeNumberID = en.ID 
        and ep2.isActive = 1
      ${ctx.mParams.showDism
    ? ' and ((:dateTo: between ep2.dateFrom and ep2.dateTo ) or' +
     `( ep2.dateTo between :dateFrom: and :dateTo: and not exists(select id from hr_employeePosition p1 WHERE p1.employeeNumberID = en.ID AND :dateTo: between p1.dateFrom and p1.dateTo AND p1.isActive = 1 AND p1.mi_deleteDate >= '9999-12-31' ) )) `
    : ' and :dateTo: between ep2.dateFrom and ep2.dateTo '}
        and ep2.mi_deleteDate >= '9999-12-31' 
        order by ep2.dateFrom desc ${sqlDialect.limit})
      JOIN hr_employee emp on en.employeeID = emp.ID  
      JOIN hr_employeeDisability disability on disability.employeeID = emp.ID
      LEFT JOIN hr_employeeBenefits benefits on benefits.employeeID = emp.ID and benefits.employeeDisabilityID = disability.id and benefits.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_dictBenefitsKind ebkind on ebkind.ID = benefits.dictBenefitsKindID and ebkind.mi_deleteDate >= '9999-12-31'   

      {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      employeeNumberID: { field: 'en.ID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName, ' (',en.tabNum, ')' ))` },
      sexType: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
      birthDate: { field: 'emp.birthDate' },
      disabilityName: { field: `(select ${sqlDialect.top} dictDT.name from hr_dictDisabilityType dictDT where dictDT.id = disability.disabilityID and dictDT.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      disabilityGroup: { field: 'disability.disabilityGroup' },
      disabilityDateFrom: { field: 'disability.dateFrom' },
      disabilityDateTo: { field: 'disability.dateTo' },
      docIssuer: { field: 'disability.docIssuer' },
      employeeDoc: { field: `(select ${sqlDialect.top} docs.description from hr_employeeDocs docs where docs.id = disability.employeeDocID and docs.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      benefitName: { field: 'ebkind.name' },
      benefitsDateFrom: { field: 'benefits.dateFrom' },
      benefitsDateTo: { field: 'benefits.dateTo' },
      dayCount: { field: ` (Select SUM(ev.dayCount) from hr_empVacationPlan ev       
         join hr_dictVacationKind vac on ev.dictVacationKindID = vac.ID              
         where ev.employeeID = emp.ID and ev.employeeBenefitsID = benefits.ID and ev.employeeNumberID = en.ID and ev.mi_deleteDate >= '9999-12-31') ` },
      startWork: { field: `en.dateFrom` },
      dictStaffCatName: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = ep.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      appointOrder: { field: getOrderInfo(sqlDialect, `'APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE'`) },
      dismissOrder: { field: getOrderInfo(sqlDialect, `'DISM'`) },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      depFirst: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateTo:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, :dateTo:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      dictCostTypeName: { field: `
      (select ${sqlDialect.top} dict.name 
        from hr_position pos         
        join ac_dictCostType dict on dict.id = pos.dictCostTypeID 
        where 
        pos.mi_data_id = ep.positionID 
        and pos.mi_dateFrom <= en.dateTo 
        and pos.mi_dateTo >= en.dateFrom 
        and pos.mi_data_id = pos.mi_data_id 
        and pos.state = 'ACTIVE' 
        and pos.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}       
      )` },
      age: { field: staffService.getEmpAgeSql('emp.birthDate', 'dateTo') },
      homeAddress: { field: `
      (select ${sqlDialect.top} adrInfo.address  from ac_address adrInfo        
        where adrInfo.ownerID = emp.ID and adrInfo.addressType = '1' and adrInfo.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}       
      )` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)

  // sqlBuilder.clauses.whereParams.onDate = dateService.shiftDate(ctx.mParams.onDate)
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(ctx.mParams.dateTo)
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.positionID = ctx.mParams.positionID
  sqlBuilder.clauses.whereParams.workPlace = ctx.mParams.workPlace
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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts, ':dateTo: ')
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs, ':dateTo: ')
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const whereClause = ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'   
    and en.mi_deleteDate >= '9999-12-31'    
    and disability.mi_deleteDate >= '9999-12-31'    
    and disability.dateFrom <= :dateTo: 
    and disability.dateTo >= :dateFrom: 
    
    ${mParams.positionID ? ` and ep.positionID = ${mParams.positionID}` : ''}
    ${orgClause}
    ${depClause}
    ${workPlaceClause}
    `

  return whereClause
}
