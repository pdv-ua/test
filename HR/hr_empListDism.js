const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')
me.entity.addMethod('search2')

me.search = function (ctx) {
  ctx.mParams.workPlace = ctx.mParams.workPlace ? ctx.mParams.workPlace.replace(/"/g, "'") : ''
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
    FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
        and en.mi_deleteDate >= '9999-12-31' 
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        and emp.mi_deleteDate >= '9999-12-31' 
      INNER JOIN ( select employeePositionID, orderID, dateFrom, dictReasonDismID, reason, empOrderType, mi_deleteDate from 
      hr_empOrderDismDet dd1 
        where dd1.empOrderType = 'DISM' and dd1.mi_deleteDate >= '9999-12-31'
        and dd1.dateFrom between :dateFrom: and :dateTo:
      union
      select employeePositionID, orderID, dateFrom, dictReasonDismID, reason, 'DISM' as empOrderType, mi_deleteDate from hr_empOrderTransferDet dd2 
        where dd2.empOrderType = 'TRANSFER' and dd2.mi_deleteDate >= '9999-12-31'
        and dd2.dateFrom between :dateFrom: and :dateTo:
        ) dd ON dd.employeePositionID = ep.ID
        
      INNER JOIN hr_empOrder o ON o.ID = dd.orderID
        and o.orderState in ('POSTED', 'PROCESSED')
        and o.mi_deleteDate >= '9999-12-31'
        and o.organizationID in (${ctx.mParams.orgIDs})
      LEFT JOIN hr_position pos ON pos.ID = ${staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'ID', null, ctx.mParams.orgIDs)} 
      LEFT JOIN hr_department dep ON dep.ID = ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'ID', ctx.mParams.orgIDs)} 
    {2}
    {3}
    {4}`,
      clauses: {},
      aliases: {
        employeeID: { field: 'en.employeeID' },
        employeeNumberID: { field: 'en.ID' },
        addDescrPerson: { field: 'en.addDescrPerson' },
        tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
        fullFIO: { field: 'emp.fullFIO' },
        taxCode: { field: 'emp.taxCode' },
        sexType: { field: 'emp.sexType' },
        sexTypeName: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
        dismDate: { field: 'dd.dateFrom' },
        actualPositionName: { field: 'ep.factPosition' },
        posName: { field: ctx.mParams.fullPosName ? 'pos.fullNameNom' : 'pos.name' },
        dictStatePayName: { field: `(select ${sqlDialect.top} dsp.name from hr_dictStatePay dsp where dsp.ID = pos.dictStatePayID and dsp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        positionType: { field: 'pos.positionType' },
        positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = pos.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
        depID: { field: 'ep.departmentID' },
        depName: { field: staffService.getDepFldOnDateSql('dd.dateFrom', 'ep.departmentID', 'name') },
        depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, dd.dateFrom, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
        structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, dd.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
        birthDate: { field: 'emp.birthDate' },
        age: { field: staffService.getEmpAgeSql() },
        numberOS: { field: `(select ${sqlDialect.top} eoinfo.numberOS from hr_employeeOrgInfo eoinfo where eoinfo.mi_deleteDate >= '9999-12-31' and eoinfo.employeeID = emp.ID and eoinfo.organizationID = en.orgID ${sqlDialect.limit})` },
        posCategory: { field: `(CASE WHEN pos.positionType ='1' THEN ${staffService.getPosCatShortNameSql()} ELSE (select ${sqlDialect.top} enm.name from hr_dictPosition dp inner join ubm_enum enm on enm.code = dp.positionCategory and enm.eGroup = 'HR_POSITION_CATEGORY' where dp.id = pos.dictPositionID ${sqlDialect.limit}) END)` },
        rank: { field: `(CASE WHEN exists ${staffService.getRankNameSql('en', ':dateTo:')}  
          THEN ${staffService.getRankNameSql('en', ':dateTo:')} 
          WHEN exists ${staffService.getRankNameSql('en', ':onDate:')} 
          THEN ${staffService.getRankNameSql('en', ':onDate:')} ELSE null END)` },
        orderNumberFull: { field: 'o.orderNumberFull' },
        orderDate: { field: 'o.orderDate' },
        dismOrder: { field: null },
        dictReasonDism: { field: `(select ${sqlDialect.top} ddk.name from hr_dictReasonDism ddk where ddk.ID = dd.dictReasonDismID and ddk.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        dictReasonDismLaw: { field: `(select ${sqlDialect.top} ddk.lawName from hr_dictReasonDism ddk where ddk.ID = dd.dictReasonDismID and ddk.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        dismReason: { field: 'dd.reason' },
        workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
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
        selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, dd.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` }
      },
      params: {}
    }
  } else {
    sqlBuilder = {
      text: ` SELECT {0} {1}
      FROM hr_employeeWorkbook wb
        INNER JOIN hr_employee emp ON emp.ID = wb.employeeID         
      {2}
      {3}
      {4}`,
      clauses: {},
      aliases: {
        employeeID: { field: 'wb.employeeID' },
        employeeNumberID: { field: `(select ${sqlDialect.top} en2.ID from hr_employeeNumber en2 where en2.employeeID = wb.employeeID 
          and wb.dateFrom between en2.dateFrom and en2.dateTo and en2.mi_deleteDate >= '9999-12-31' and en2.orgID = wb.organizationID ${sqlDialect.limit})` },
        tabNum: { field: `(select ${sqlDialect.top} en2.tabNum from hr_employeeNumber en2 where en2.employeeID = wb.employeeID 
          and wb.dateFrom between en2.dateFrom and en2.dateTo and en2.mi_deleteDate >= '9999-12-31' and en2.orgID = wb.organizationID ${sqlDialect.limit})` },
        fullFIO: { field: 'emp.fullFIO' },
        taxCode: { field: 'emp.taxCode' },
        sexType: { field: 'emp.sexType' },
        sexTypeName: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
        dismDate: { field: 'wb.dateTo' },
        actualPositionName: { field: 'null' },
        posName: { field: 'wb.workPosition' },
        positionType: { field: 'wb.positionType' },
        positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = wb.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
        dictStatePayName: { field: `null` },
        depName: { field: 'null' },
        structDepName: { field: 'null' },
        depTree: { field: 'null' },
        birthDate: { field: 'emp.birthDate' },
        addDescrPerson: { field: 'null' },
        age: { field: staffService.getEmpAgeSql() },
        numberOS: { field: `(select ${sqlDialect.top} eoinfo.numberOS from hr_employeeOrgInfo eoinfo where eoinfo.mi_deleteDate >= '9999-12-31' and eoinfo.employeeID = emp.ID and eoinfo.organizationID = wb.organizationID ${sqlDialect.limit} )` },
        posCategory: { field: 'wb.positionCategory' },
        rank: { field: `(CASE WHEN exists ${staffService.getEmpRankNameSql('emp.ID', ':dateTo:')}  
          THEN ${staffService.getEmpRankNameSql('emp.ID', ':dateTo:')} 
          WHEN exists ${staffService.getEmpRankNameSql('emp.ID', ':onDate:')} 
          THEN ${staffService.getEmpRankNameSql('emp.ID', ':onDate:')} ELSE null END)` },
        orderNumberFull: { field: null },
        orderDate: { field: null },
        dismOrder: { field: 'wb.dismOrder' },
        dictReasonDism: { field: null },
        dismReason: { field: 'wb.dischargeReason' },
        dictReasonDismLaw: { field: null },
        workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = wb.empWorkPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
        selfStructDepName: { field: 'null' },
        orgMasterName: { field: 'null' },
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
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || (byOrder ? 'ORDER BY emp.fullFIO, dd.dateFrom'
    : 'ORDER BY emp.fullFIO, wb.dateTo')

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
    FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID and en.orgID in (${ctx.mParams.orgIDs})
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
      INNER JOIN ( select employeePositionID, orderID, dateFrom, dictReasonDismID, reason, empOrderType, mi_deleteDate from 
      hr_empOrderDismDet dd1 
        where dd1.empOrderType = 'DISM' and dd1.mi_deleteDate >= '9999-12-31'
        and dd1.dateFrom between :dateFrom: and :dateTo:
      union
      select employeePositionID, orderID, dateFrom, dictReasonDismID, reason, 'DISM' as empOrderType, mi_deleteDate from hr_empOrderTransferDet dd2 
        where dd2.empOrderType = 'TRANSFER' and dd2.mi_deleteDate >= '9999-12-31'
        and dd2.dateFrom between :dateFrom: and :dateTo:
        ) dd ON dd.employeePositionID = ep.ID
      INNER JOIN hr_empOrder o ON o.ID = dd.orderID
        AND o.orderState in ('POSTED', 'PROCESSED')
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
      dateFrom: { field: 'dd.dateFrom' },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name', 'ep.dictPositionID') },
      actualPositionName: { field: 'ep.factPosition' },
      posIndex: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'idxNum', 'ep.dictPositionID') },
      orderNumber: { field: 'o.orderNumberFull' },
      orderDate: { field: 'o.orderDate' },
      comment: { field: 'o.comment' },
      empOrderType: { field: 'dd.empOrderType' },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, dd.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      organizationID: { field: 'o.organizationID' },
      orgName: { field: `(Select ${sqlDialect.top} org.name from hr_organization org 
        where o.organizationID = org.mi_data_id
          and org.mi_deleteDate >= '9999-12-31' and org.state = 'ACTIVE'
          and org.mi_dateFrom <= o.orderDate and org.mi_dateTo >= o.orderDate ${sqlDialect.limit})` }
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
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || '' // 'ORDER BY dd.dateFrom, emp.lastName'

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
  const byOrder = mParams.beFormedGroup === 'byOrders'
  let whereClause
  if (byOrder) {
    const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
    const orgClause2 = mParams.typeOrg ? '' : staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
    const byWorkPlace = mParams.workPlace ? ` and ep.workPlace in (${mParams.workPlace})` : ''
    const kindClause = mParams.dictReasonDismID ? `dd.dictReasonDismID = ${mParams.dictReasonDismID}` : '1 = 1'
    const orgClause = mParams.typeOrg
      ? `and ((o.organizationID <> o.masterOrganizationID and o.organizationID in (${mParams.orgIDs}))
     or (o.organizationID <> o.masterOrganizationID and o.masterOrganizationID in (${mParams.orgIDs}))
     or (o.organizationID = o.masterOrganizationID and o.organizationID = ${mParams.organizationID}))`
      : `and o.organizationID = o.masterOrganizationID and o.organizationID in (${mParams.orgIDs})`
    whereClause = ` ep.mi_deleteDate >= '9999-12-31'    
      ${byWorkPlace}
      ${orgClause}
      ${orgClause2}
      ${depClause}
      and ${kindClause}
    `
  } else {
    const byWorkPlace = mParams.workPlace ? ` and wb.empWorkPlace in (${mParams.workPlace})` : ''
    whereClause = ` wb.mi_deleteDate >= '9999-12-31'  
      and emp.mi_deleteDate >= '9999-12-31'
      and wb.isOrgDismiss = 1
      and wb.organizationID in (${mParams.orgIDs}) 
      and wb.dateTo between :dateFrom: and :dateTo:
      and wb.dateTo != '9999-12-31'
      ${byWorkPlace}
      `
  }
  return whereClause
}

me.getWhereClause2 = function (mParams) {
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause2 = mParams.typeOrg ? '' : staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
  const orgClause = mParams.typeOrg
    ? `and ((o.organizationID <> o.masterOrganizationID and o.organizationID in (${mParams.orgIDs}))
     or (o.organizationID <> o.masterOrganizationID and o.masterOrganizationID in (${mParams.orgIDs}))
     or (o.organizationID = o.masterOrganizationID and o.organizationID = ${mParams.organizationID}))`
    : `and o.organizationID = o.masterOrganizationID and o.organizationID in (${mParams.orgIDs})`
  return ` ep.organizationID in (${mParams.orgIDs})
    and en.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'
    and dd.dateFrom between :dateFrom: and :dateTo:
    and dd.mi_deleteDate >= '9999-12-31'
    ${depClause}
    ${orgClause2}
    ${orgClause}
    `
}
