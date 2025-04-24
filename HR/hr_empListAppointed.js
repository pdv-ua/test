const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('search')
me.entity.addMethod('search2')

me.search = function (ctx) {
  ctx.mParams.workPlace = ctx.mParams.workPlace ? ctx.mParams.workPlace.replace(/"/g, "'") : ''
  const orgType = settingsService.getByCode('hrFuncOrgType', ctx.mParams.organizationID)
  const byOrder = ctx.mParams.beFormedGroup === 'byOrders'
  const sqlDialect = entityBaseService.getSQLDialect()
  if (ctx.mParams.typeOrg || ctx.mParams.includeChildOrgs) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('mi_treePath', 'like', `/${ctx.mParams.organizationID}%`)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: ctx.mParams.dateTo })
      .selectAsObject()
    ctx.mParams.orgIDs = orgs.map(itm => itm.mi_data_id)
  } else {
    ctx.mParams.orgIDs = [ctx.mParams.organizationID]
  }
  ctx.mParams.orgIDs = ctx.mParams.orgIDs.join(', ')
  let runsql
  let sqlBuilder
  if (byOrder) {
    sqlBuilder = {
      text: ` SELECT {0} {1}
      FROM
        hr_empOrder o
        INNER JOIN hr_empOrderAppointDet ad ON ad.orderID = o.ID
          and ad.empOrderType in ('APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE')
          and (ad.empOrderType in ('APPOINT', 'APPOINT_LIQ') or (ad.isAppoint = 1 and ad.empOrderType = 'APPOINT_MOVE'))
          and ad.mi_deleteDate >= '9999-12-31'
          and ad.dateFrom between :dateFrom: and :dateTo:
        INNER JOIN hr_employeePosition ep ON ep.ID = ad.employeePositionID
          and ep.orderID = o.ID
          and ad.dateFrom between ep.dateFrom and ep.dateTo
          and ep.mi_deleteDate >= '9999-12-31'
          and ep.organizationID in (${ctx.mParams.orgIDs})
        INNER JOIN hr_employeeNumber en ON en.ID = ad.employeeNumberID
          and en.mi_deleteDate >= '9999-12-31'
          and en.orgID in (${ctx.mParams.orgIDs})
        INNER JOIN hr_employee emp ON emp.ID = en.employeeID
          and emp.mi_deleteDate >= '9999-12-31' 
        LEFT JOIN hr_position pos ON pos.mi_data_id = ep.positionID
          and pos.state = 'ACTIVE' 
          and pos.mi_dateFrom <= ep.dateFrom
          and pos.mi_dateTo >= ep.dateFrom 
          and pos.mi_deleteDate >= '9999-12-31'
          and pos.orgID in (${ctx.mParams.orgIDs})
        LEFT JOIN hr_department dep ON dep.mi_data_id = ep.departmentID
          and dep.state = 'ACTIVE'
          and dep.mi_dateFrom <= ep.dateFrom
          and dep.mi_dateTo >= ep.dateFrom 
          and dep.mi_deleteDate >= '9999-12-31'
          and dep.orgID in (${ctx.mParams.orgIDs})
      {2}
      {3}
      {4}`,
      clauses: {},
      aliases: {
        employeeID: { field: 'en.employeeID' },
        limitedAccess: { field: 'en.limitedAccess' },
        employeeNumberID: { field: 'en.ID' },
        addDescrPerson: { field: 'en.addDescrPerson' },
        tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
        fullFIO: { field: 'emp.fullFIO' },
        taxCode: { field: 'emp.taxCode' },
        sexType: { field: 'emp.sexType' },
        sexTypeName: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
        appointDate: { field: 'ep.dateFrom' },
        actualPositionName: { field: 'ep.factPosition' },
        dictStatePayName: { field: `(select ${sqlDialect.top} dsp.name from hr_dictStatePay dsp where dsp.ID = pos.dictStatePayID and dsp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        positionType: { field: 'pos.positionType' },
        positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = pos.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
        posName: { field: ctx.mParams.fullPosName ? 'pos.fullNameNom' : 'pos.name' },
        depName: { field: staffService.getDepFldOnDateSql('ad.dateFrom', 'ep.departmentID', 'name') },
        structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, ad.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
        depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, ad.dateFrom, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
        birthDate: { field: 'emp.birthDate' },
        age: { field: staffService.getEmpAgeSql() },
        appointKindName: { field: `(select ${sqlDialect.top} dak.name from hr_dictAppointKind dak where dak.ID = ad.dictAppointKindID and dak.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        dateTrialEnd: { field: 'ad.dateTrialEnd' },
        dismDate: { field: `(CASE WHEN en.dateTo = '9999-12-31' THEN null ELSE en.dateTo END)` },
        numberOS: { field: `(select ${sqlDialect.top} eoinfo.numberOS from hr_employeeOrgInfo eoinfo where eoinfo.mi_deleteDate >= '9999-12-31' and eoinfo.employeeID = emp.ID and eoinfo.organizationID = en.orgID ${sqlDialect.limit})` },
        posCategory: { field: orgType === '2' ? staffService.getPosCatShortNameSql() : staffService.getPosCategoryShortNameSql() },
        rank: { field: `(CASE WHEN exists ${staffService.getRankNameSql('en', ':dateTo:')}  
          THEN ${staffService.getRankNameSql('en', ':dateTo:')} 
          WHEN exists ${staffService.getRankNameSql('en', ':onDate:')} 
          THEN ${staffService.getRankNameSql('en', ':onDate:')} ELSE null END)` },
        orderNumberFull: { field: `(select ${sqlDialect.top} empord.orderNumberFull from hr_empOrder empord where ep.orderID = empord.ID and empord.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        orderDate: { field: 'o.orderDate' },
        appointOrder: { field: null },
        appointReason: { field: 'ad.reason' },
        contractType: { field: `(select ${sqlDialect.top} contractType.name from ubm_enum contractType where contractType.code = ad.contractType and contractType.eGroup = 'HR_CONTRACT_TYPE' ${sqlDialect.limit})` },
        dictContractKind: { field: `(select ${sqlDialect.top} dictCK.name from hr_dictContractKind dictCK where dictCK.id = ad.dictContractKindID and dictCK.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ad.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
        workerType: { field: `(select ${sqlDialect.top} workerType.name from ubm_enum workerType where workerType.code = ad.workerType and workerType.eGroup = 'HR_WORKER_TYPE' ${sqlDialect.limit})` },
        dictStaffCat: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = ad.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        workSchedule: { field: `(select ${sqlDialect.top} ws.name from hr_workSchedule ws where ws.id = ad.workScheduleID and ws.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        mtCount: { field: 'ad.mtCount' },
        payEl: { field: `(select ${sqlDialect.top} pe.name from hr_payEl pe where pe.id = ad.payElID and pe.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        accrualSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'ad.accrualSum' },
        organizationID: { field: 'o.organizationID' },
        orgName: { field: `(Select ${sqlDialect.top} org.name from hr_organization org 
          where o.organizationID = org.mi_data_id
            and org.mi_deleteDate >= '9999-12-31' and org.state = 'ACTIVE'
            and org.mi_dateFrom <= o.orderDate and org.mi_dateTo >= o.orderDate ${sqlDialect.limit})` },
        masterOrganizationID: { field: 'o.masterOrganizationID' },
        orgMasterName: { field: `(Select ${sqlDialect.top} org.name from hr_organization org 
          where o.masterOrganizationID = org.mi_data_id
            and org.mi_deleteDate >= '9999-12-31' and org.state = 'ACTIVE'
            and org.mi_dateFrom <= o.orderDate and org.mi_dateTo >= o.orderDate ${sqlDialect.limit})` },
        selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, ad.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
      },
      params: {}
    }
  } else {
    sqlBuilder = {
      text: ` SELECT {0} {1}
      FROM hr_employeeWorkbook wb
        INNER JOIN hr_employee emp ON emp.ID = wb.employeeID
          and emp.mi_deleteDate >= '9999-12-31'        
      {2}
      {3}
      {4}`,
      clauses: {},
      aliases: {
        limitedAccess: { field: 'null' },
        employeeID: { field: 'wb.employeeID' },
        employeeNumberID: { field: `(select ${sqlDialect.top} en2.ID from hr_employeeNumber en2 where en2.employeeID = wb.employeeID 
          and wb.dateFrom between en2.dateFrom and en2.dateTo and en2.mi_deleteDate >= '9999-12-31' and en2.orgID = wb.organizationID ${sqlDialect.limit})` },
        tabNum: { field: `(select ${sqlDialect.top} en2.tabNum from hr_employeeNumber en2 where en2.employeeID = wb.employeeID 
          and wb.dateFrom between en2.dateFrom and en2.dateTo and en2.mi_deleteDate >= '9999-12-31' and en2.orgID = wb.organizationID ${sqlDialect.limit})` },
        fullFIO: { field: 'emp.fullFIO' },
        taxCode: { field: 'emp.taxCode' },
        sexType: { field: 'emp.sexType' },
        sexTypeName: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
        appointDate: { field: 'wb.dateFrom' },
        actualPositionName: { field: 'null' },
        posName: { field: 'wb.workPosition' },
        positionType: { field: 'wb.positionType' },
        positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = wb.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
        dictStatePayName: { field: `null` },
        depName: { field: 'null' },
        structDepName: { field: 'null' },
        depTree: { field: 'null' },
        selfStructDepName: { field: 'null' },
        orgMasterName: { field: 'null' },
        addDescrPerson: { field: 'null' },
        birthDate: { field: 'emp.birthDate' },
        age: { field: staffService.getEmpAgeSql() },
        appointKindName: { field: null },
        dateTrialEnd: { field: 'wb.dateTrialEnd' },
        dismDate: { field: '(CASE WHEN wb.isOrgDismiss = 1 THEN wb.dateTo ELSE null END)' },
        numberOS: { field: `(select ${sqlDialect.top} eoinfo.numberOS from hr_employeeOrgInfo eoinfo where eoinfo.mi_deleteDate >= '9999-12-31' and eoinfo.employeeID = emp.ID and eoinfo.organizationID = wb.organizationID ${sqlDialect.limit})` },
        posCategory: { field: 'wb.positionCategory' },
        rank: { field: `(CASE WHEN exists ${staffService.getEmpRankNameSql('emp.ID', ':dateTo:')}  
          THEN ${staffService.getEmpRankNameSql('emp.ID', ':dateTo:')} 
          WHEN exists ${staffService.getEmpRankNameSql('emp.ID', ':onDate:')} 
          THEN ${staffService.getEmpRankNameSql('emp.ID', ':onDate:')} ELSE null END)` },
        orderNumberFull: { field: null },
        orderDate: { field: null },
        appointOrder: { field: 'coalesce(emp.empOrderAppoint, wb.appointOrder)' },
        appointReason: { field: 'wb.appointReason' },
        workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = wb.empWorkPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
        orgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'wb.organizationID', 'name') }
      },
      params: {}
    }
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
  sqlBuilder.clauses.whereParams.typeOrg = ctx.mParams.typeOrg
  sqlBuilder.clauses.whereParams.workPlace = ctx.mParams.workPlace
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || (byOrder ? 'ORDER BY emp.fullFIO, ad.dateFrom'
    : 'ORDER BY emp.lastName, wb.dateFrom')
  //if (byOrder && !App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
  //  sqlBuilder.clauses.whereClause += ' AND en.limitedAccess = 0 '
  //}

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

me.search2 = function (ctx) {
  if (ctx.mParams.typeOrg || ctx.mParams.includeChildOrgs) {
    const orgs = UB.Repository('hr_organization')
      .attrs(['mi_data_id'])
      .where('mi_treePath', 'like', `/${ctx.mParams.organizationID}%`)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: ctx.mParams.dateTo })
      .selectAsObject()
    ctx.mParams.orgIDs = orgs.map(itm => itm.mi_data_id)
  } else {
    ctx.mParams.orgIDs = [ctx.mParams.organizationID]
  }
  ctx.mParams.orgIDs = ctx.mParams.orgIDs.join(', ')

  let runsql
  const sqlDialect = entityBaseService.getSQLDialect()
  const sqlBuilder = {
    text: ` SELECT {0} {1}
    FROM 
      hr_empOrder o
      INNER JOIN hr_empOrderAppointDet ad ON ad.orderID = o.ID 
        AND (ad.empOrderType in ('APPOINT', 'APPOINT_LIQ') or (ad.isAppoint = 1 and ad.empOrderType = 'APPOINT_MOVE')) and ad.mi_deleteDate >= '9999-12-31'        
      INNER JOIN hr_employeePosition ep ON ep.ID = ad.employeePositionID
        and ep.orderID = o.ID
        and ad.dateFrom between ep.dateFrom and ep.dateTo 
        and ep.mi_deleteDate >= '9999-12-31'
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
        and en.mi_deleteDate >= '9999-12-31' 
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        and emp.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_position pos ON pos.mi_data_id = ep.positionID
        and pos.state = 'ACTIVE' 
        and pos.mi_dateFrom <= ep.dateFrom
        and pos.mi_dateTo >= ep.dateFrom 
        and pos.mi_deleteDate >= '9999-12-31'
        and pos.orgID in (${ctx.mParams.orgIDs})
    {2}
    {3}
    {4}`,
    clauses: {},
    aliases: {
      employeePositionID: { field: 'ep.ID' },
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      depID: { field: 'ep.departmentID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      taxCode: { field: 'emp.taxCode' },
      sexTypeName: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
      positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = pos.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
      posCategory: { field: `(CASE WHEN pos.positionType ='1' THEN ${staffService.getPosCatShortNameSql()} ELSE null END)` },
      dictStatePayName: { field: `(select ${sqlDialect.top} dsp.name from hr_dictStatePay dsp where dsp.ID = pos.dictStatePayID and dsp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dateFrom: { field: 'ad.dateFrom' },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name', 'ep.dictPositionID') },
      actualPositionName: { field: 'ep.factPosition' },
      posIndex: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'idxNum', 'ep.dictPositionID') },
      orderNumber: { field: 'o.orderNumberFull' },
      orderDate: { field: 'o.orderDate' },
      comment: { field: 'o.comment' },
      empOrderType: { field: 'ad.empOrderType' },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, ad.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      workPlace: { field: 'ad.workPlace' },
      organizationID: { field: 'o.organizationID' },
      orgName: { field: `(Select ${sqlDialect.top} org.name from hr_organization org 
        where o.organizationID = org.mi_data_id
          and org.mi_deleteDate >= '9999-12-31' and org.state = 'ACTIVE'
          and org.mi_dateFrom <= o.orderDate and org.mi_dateTo >= o.orderDate ${sqlDialect.limit})` },
      isAppoint: { field: 'ad.isAppoint' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause2(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.whereParams.dateTo = ctx.mParams.dateTo
  sqlBuilder.clauses.whereParams.typeOrg = ctx.mParams.typeOrg
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  // sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY ad.dateFrom, emp.lastName'
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || ''

  if (ctx.mParams.options && ctx.mParams.options.totalRequired) {
    runsql = UB.format(sqlBuilder.text, '', 'count(*)', sqlBuilder.clauses.whereClause, '', '')
    ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)
    if (!ctx.dataStore.eof) {
      ctx.mParams.__totalRecCount = ctx.dataStore.get(0)
    }
  }
  //if (!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
  //  sqlBuilder.clauses.whereClause += ' AND en.limitedAccess = 0 '
  //}
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
  const byOrder = mParams.beFormedGroup === 'byOrders'
  if (byOrder) {
    const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
    const orgClause2 = mParams.typeOrg ? '' : staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
    const byWorkPlace = mParams.workPlace ? ` and ad.workPlace in (${mParams.workPlace})` : ''
    const kindClause = mParams.dictAppointKindID ? `ad.dictAppointKindID = ${mParams.dictAppointKindID}` : '1 = 1'
    const orgClause = mParams.typeOrg
      ? `and ((o.organizationID <> o.masterOrganizationID and o.organizationID in (${mParams.orgIDs}))
       or (o.organizationID <> o.masterOrganizationID and o.masterOrganizationID in (${mParams.orgIDs}))
       or (o.organizationID = o.masterOrganizationID and o.organizationID = ${mParams.organizationID}))`
      : `and o.organizationID = o.masterOrganizationID and o.organizationID in (${mParams.orgIDs})`
    return ` o.orderState in ('POSTED', 'PROCESSED') and o.mi_deleteDate >= '9999-12-31'
      ${byWorkPlace}
      ${orgClause}
      ${orgClause2}
      ${depClause}
      and ${kindClause}
      `
  } else {
    const byWorkPlace = mParams.workPlace ? ` and wb.empWorkPlace in (${mParams.workPlace})` : ''
    return ` wb.isOrgAppoint = 1
      and wb.organizationID in (${mParams.orgIDs})     
      and wb.mi_deleteDate >= '9999-12-31'
      and wb.dateFrom between :dateFrom: and :dateTo:
      ${byWorkPlace}
      `
  }
}

me.getWhereClause2 = function (mParams) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause2 = mParams.typeOrg ? '' : staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  const dateClause = mParams.dateFrom && mParams.dateTo ? 'ad.dateFrom between :dateFrom: and :dateTo: ' : '1 = 1'
  const orgClause = mParams.typeOrg
    ? `and ((o.organizationID <> o.masterOrganizationID and o.organizationID in (${mParams.orgIDs}))
     or (o.organizationID <> o.masterOrganizationID and o.masterOrganizationID in (${mParams.orgIDs}))
     or (o.organizationID = o.masterOrganizationID and o.organizationID = ${mParams.organizationID}))`
    : `and o.organizationID = o.masterOrganizationID and o.organizationID in (${mParams.orgIDs})`
  const whereClause = ` o.orderState in ('POSTED', 'PROCESSED') and o.mi_deleteDate >= '9999-12-31'
    and ${dateClause}
    ${orgClause2}
    ${depClause}
    ${orgClause}
    `
  return whereClause
}
