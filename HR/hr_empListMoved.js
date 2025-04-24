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
    FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
        and en.mi_deleteDate >= '9999-12-31' and en.orgID in (${ctx.mParams.orgIDs})
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
        and emp.mi_deleteDate >= '9999-12-31' 
      INNER JOIN (
        SELECT empOrderType, employeeNumberID, employeePositionID, dictReasonMovingKindID, orderID, employeeID, dateFrom,
          departmentID, positionID, reason, contractType, dictContractKindID, workPlace, workerType, dictStaffCatID, 
          workScheduleID, mtCount, accrualSum, payElID, 0 as isMove, factPosition as factPositionTo
        FROM hr_empOrderMoveDet 
        WHERE empOrderType = 'MOVE'
          and mi_deleteDate >= '9999-12-31'
        UNION ALL
        SELECT det.empOrderType, det.employeeNumberID, det.employeePositionID, null as dictReasonMovingKindID, det.orderID, det.employeeID, det.dateFrom,
          det.departmentID, det.positionID, det.reason, det.contractType, det.dictContractKindID, det.workPlace, det.workerType, det.dictStaffCatID, 
          det.workScheduleID, det.mtCount, det.accrualSum, det.payElID, det.isMove, epDet.factPosition as factPositionTo
        FROM hr_empOrderAppointDet det
        INNER JOIN hr_employeePosition epDet on epDet.id = det.employeePositionID  
        WHERE det.isMove = 1
          and det.empOrderType = 'APPOINT_MOVE'
          and det.mi_deleteDate >= '9999-12-31' and epDet.mi_deleteDate >= '9999-12-31'
        ) md ON md.employeePositionID = ep.ID
      INNER JOIN hr_order o ON o.ID = md.orderID
        AND o.orderState in ('POSTED', 'PROCESSED') and o.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_position pos ON pos.ID = ${staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'ID', null, ctx.mParams.orgIDs)}
      LEFT JOIN hr_department dep ON dep.ID = ${staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'ID', ctx.mParams.orgIDs)}
      LEFT JOIN hr_position posTo ON posTo.ID = md.positionID and pos.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_department depTo ON depTo.ID = md.departmentID and dep.mi_deleteDate >= '9999-12-31'
    {2}
    {3}
    {4}`,
      clauses: {},
      aliases: {
        employeeID: { field: 'md.employeeID' },
        employeeNumberID: { field: 'en.ID' },
        addDescrPerson: { field: 'en.addDescrPerson' },
        tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
        fullFIO: { field: 'emp.fullFIO' },
        taxCode: { field: 'emp.taxCode' },
        sexType: { field: 'emp.sexType' },
        moveDate: { field: 'md.dateFrom' },
        dictStatePayName: { field: `(select ${sqlDialect.top} dsp.name from hr_dictStatePay dsp where dsp.ID = pos.dictStatePayID and dsp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        positionType: { field: 'pos.positionType' },
        positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = pos.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
        posNameTo: { field: ctx.mParams.fullPosName ? 'posTo.fullNameNom' : 'posTo.name' },
        actualPositionName: { field: `Case when md.isMove = 1 then '${UB.i18n('Немає інформації')}' else ep.factPosition end` },
        actualPositionNameTo: { field: 'md.factPositionTo' },
        depID: { field: 'ep.departmentID' },
        mDepID: { field: 'md.departmentID' },
        depName: { field: `Case when md.isMove = 1 then '${UB.i18n('Немає інформації')}' else ${staffService.getDepFldOnDateSql('md.dateFrom', 'ep.departmentID', 'name')} end` },
        // depNameTo: { field: staffService.getDepFldOnDateSql('md.dateFrom', 'md.departmentID', 'name') },
        depNameTo: { field: `(select ${sqlDialect.top} dep.name from hr_department dep where dep.ID = md.departmentID and dep.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        selfStructDepName: { field: `${sqlDialect.scheme}depStructName2(md.departmentID, md.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
        birthDate: { field: 'emp.birthDate' },
        age: { field: staffService.getEmpAgeSql() },
        dismDate: { field: `(CASE WHEN en.dateTo = '9999-12-31' THEN null ELSE en.dateTo END)` },
        numberOS: { field: `(select ${sqlDialect.top} eoinfo.numberOS from hr_employeeOrgInfo eoinfo where eoinfo.mi_deleteDate >= '9999-12-31' and eoinfo.employeeID = emp.ID and eoinfo.organizationID = en.orgID ${sqlDialect.limit})` },
        posCategory: { field: orgType === '2' ? staffService.getPosCatShortNameSql() : staffService.getPosCategoryShortNameSql() },
        rank: { field: `(CASE WHEN exists ${staffService.getRankNameSql('en', ':dateTo:')}  
          THEN ${staffService.getRankNameSql('en', ':dateTo:')} 
          WHEN exists ${staffService.getRankNameSql('en', ':onDate:')} 
          THEN ${staffService.getRankNameSql('en', ':onDate:')} ELSE null END)` },
        orderNumberFull: { field: `(select ${sqlDialect.top} empord.orderNumberFull from hr_empOrder empord where md.orderID = empord.ID and empord.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        orderDate: { field: 'o.orderDate' },
        moveOrder: { field: null },
        reasonMovingKind: { field: `(select ${sqlDialect.top} rm.name from hr_dictReasonMoving rm where md.dictReasonMovingKindID = rm.ID and rm.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        moveReason: { field: 'md.reason' },
        contractType: { field: `(select ${sqlDialect.top} contractType.name from ubm_enum contractType where contractType.code = md.contractType and contractType.eGroup = 'HR_CONTRACT_TYPE' ${sqlDialect.limit})` },
        dictContractKind: { field: `(select ${sqlDialect.top} dictCK.name from hr_dictContractKind dictCK where dictCK.id = md.dictContractKindID and dictCK.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = md.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
        workerType: { field: `(select ${sqlDialect.top} workerType.name from ubm_enum workerType where workerType.code = md.workerType and workerType.eGroup = 'HR_WORKER_TYPE' ${sqlDialect.limit})` },
        dictStaffCat: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = md.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        workSchedule: { field: `(select ${sqlDialect.top} ws.name from hr_workSchedule ws where ws.id = md.workScheduleID and ws.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        mtCount: { field: 'md.mtCount' },
        payEl: { field: `(select ${sqlDialect.top} pe.name from hr_payEl pe where pe.id = md.payElID and pe.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
        accrualSum: { field: (App.domainInfo.isEntityMethodsAccessible('hr_service', 'notShowSalary') && !entityBaseService.isAdmin()) ? '0' : 'md.accrualSum' },
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
        posName: { field: ctx.mParams.fullPosName
            ? `(case when md.empOrderType = 'MOVE' then pos.fullNameNom else '${UB.i18n('Немає інформації')}' end)`
            : `(case when md.empOrderType = 'MOVE' then pos.name else '${UB.i18n('Немає інформації')}' end)` },
        depTree: { field: `(case when md.empOrderType = 'MOVE' then ${sqlDialect.scheme}depNamePath2(ep.departmentID, :onDate:, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit})) else '' end)` }
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
        moveDate: { field: 'wb.dateFrom' },
        actualPositionName: { field: 'null' },
        actualPositionNameTo: { field: 'null' },
        posName: { field: 'null' },
        posNameTo: { field: 'wb.workPosition' },
        positionType: { field: 'wb.positionType' },
        positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = wb.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
        dictStatePayName: { field: `null` },
        depNameTo: { field: 'null' },
        depName: { field: 'null' },
        depFirst: { field: 'null' },
        depTree: { field: 'null' },
        addDescrPerson: { field: 'null' },
        birthDate: { field: 'emp.birthDate' },
        age: { field: staffService.getEmpAgeSql() },
        dismDate: { field: '(CASE WHEN wb.isOrgDismiss = 1 THEN wb.dateTo ELSE null END)' },
        numberOS: { field: `(select ${sqlDialect.top} eoinfo.numberOS from hr_employeeOrgInfo eoinfo where eoinfo.mi_deleteDate >= '9999-12-31' and eoinfo.employeeID = emp.ID and eoinfo.organizationID = wb.organizationID ${sqlDialect.limit} )` },
        posCategory: { field: 'wb.positionCategory' },
        rank: { field: `(CASE WHEN exists ${staffService.getEmpRankNameSql('emp.ID', ':dateTo:')}  
          THEN ${staffService.getEmpRankNameSql('emp.ID', ':dateTo:')} 
          WHEN exists ${staffService.getEmpRankNameSql('emp.ID', ':onDate:')} 
          THEN ${staffService.getEmpRankNameSql('emp.ID', ':onDate:')} ELSE null END)` },
        orderNumberFull: { field: null },
        orderDate: { field: null },
        moveOrder: { field: 'wb.appointOrder' },
        reasonMovingKind: { field: null },
        moveReason: { field: 'wb.appointReason' },
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
    me.getWhereClause(ctx.mParams, sqlDialect),
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
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || (byOrder ? 'ORDER BY emp.fullFIO, md.dateFrom'
    : 'ORDER BY emp.fullFIO, wb.dateFrom')

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
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
        and en.mi_deleteDate >= '9999-12-31' and en.orgID in (${ctx.mParams.orgIDs})
      INNER JOIN hr_employee emp ON emp.ID = en.employeeID
      INNER JOIN hr_empOrder o ON o.ID = ep.orderID
        AND o.orderState in ('POSTED', 'PROCESSED')
      INNER JOIN (
        SELECT empOrderType, employeeNumberID, orderID, employeeID, dateFrom, departmentID, 0 as isMove 
          FROM hr_empOrderMoveDet 
          WHERE  empOrderType = 'MOVE'
            and mi_deleteDate >= '9999-12-31'
        UNION ALL
        SELECT empOrderType, employeeNumberID, orderID, employeeID, dateFrom, departmentID, isMove 
          FROM hr_empOrderAppointDet 
          WHERE isMove = 1
            and empOrderType = 'APPOINT_MOVE'
            and mi_deleteDate >= '9999-12-31'
      ) md ON md.orderID = o.ID
        AND md.employeeID = ep.employeeID and md.employeeNumberID = ep.employeeNumberID
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
      employeeID: { field: 'md.employeeID' },
      depID: { field: 'ep.departmentID' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      taxCode: { field: 'emp.taxCode' },
      sexTypeName: { field: `(select ${sqlDialect.top} sex.name from ubm_enum sex where sex.code = emp.sexType and sex.eGroup = 'HR_SEX_TYPE' ${sqlDialect.limit})` },
      positionTypeName: { field: `(select ${sqlDialect.top} positionType.name from ubm_enum positionType where positionType.code = pos.positionType and positionType.eGroup = 'HR_POSITION_TYPE' ${sqlDialect.limit})` },
      posCategory: { field: `(CASE WHEN pos.positionType ='1' THEN ${staffService.getPosCatShortNameSql()} ELSE null END)` },
      dictStatePayName: { field: `(select ${sqlDialect.top} dsp.name from hr_dictStatePay dsp where dsp.ID = pos.dictStatePayID and dsp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      dateFrom: { field: 'md.dateFrom' },
      empOrderType: { field: 'md.empOrderType' },
      posName: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name', 'ep.dictPositionID') },
      actualPositionName: { field: 'ep.factPosition' },
      posIndex: { field: staffService.getPosFldOnDateSql(':dateTo:', 'ep.positionID', 'idxNum', 'ep.dictPositionID') },
      orderNumber: { field: 'o.orderNumberFull' },
      orderDate: { field: 'o.orderDate' },
      comment: { field: 'o.comment' },
      depName: { field: staffService.getDepFldOnDateSql(':dateTo:', 'ep.departmentID', 'name') },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, md.dateFrom, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      organizationID: { field: 'o.organizationID' },
      orgName: { field: `(Select ${sqlDialect.top} org.name from hr_organization org 
        where o.organizationID = org.mi_data_id
          and org.mi_deleteDate >= '9999-12-31' and org.state = 'ACTIVE'
          and org.mi_dateFrom <= o.orderDate and org.mi_dateTo >= o.orderDate ${sqlDialect.limit})` },
      isMove: { field: 'md.isMove' },
      empOrgName: { field: staffService.getOrgFldOnDateSql(':dateTo:', 'en.orgID ', 'name') }
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
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.typeOrg = ctx.mParams.typeOrg
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || '' // 'ORDER BY md.dateFrom, emp.lastName'

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

me.getWhereClause = function (mParams, sqlDialect) {
  const byOrder = mParams.beFormedGroup === 'byOrders'
  let whereClause
  if (byOrder) {
    const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
    const orgClause2 = mParams.typeOrg ? '' : staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
    const byWorkPlace = mParams.workPlace ? ` and md.workPlace in (${mParams.workPlace})` : ''
    const kindClause = mParams.dictReasonMovingKindID ? `md.dictReasonMovingKindID = ${mParams.dictReasonMovingKindID}` : '1 = 1'
    const orgClause = mParams.typeOrg
      ? `and ((o.organizationID <> o.masterOrganizationID and o.organizationID in (${mParams.orgIDs}))
     or (o.organizationID <> o.masterOrganizationID and o.masterOrganizationID in (${mParams.orgIDs}))
     or (o.organizationID = o.masterOrganizationID and o.organizationID = ${mParams.organizationID}))`
      : `and o.organizationID = o.masterOrganizationID and o.organizationID in (${mParams.orgIDs})`
    whereClause = ` md.dateFrom between :dateFrom: and :dateTo:
        ${orgClause}
        ${orgClause2}
        ${depClause}
        ${byWorkPlace}
    and ${kindClause}
    `
  } else {
    const byWorkPlace = mParams.workPlace ? ` and wb.empWorkPlace in (${mParams.workPlace})` : ''
    whereClause = `  wb.mi_deleteDate >= '9999-12-31'  
  and emp.mi_deleteDate >= '9999-12-31'
  and wb.isOrgAppoint = 0
  and wb.organizationID in (${mParams.orgIDs}) 
  and wb.dateFrom between :dateFrom: and :dateTo:
  and exists (
    select wb3.dateFrom 
    from hr_employeeWorkbook wb3 
    where 
      wb3.organizationID in (${mParams.orgIDs})  
      and wb3.employeeID = wb.employeeID
      and wb3.mi_deleteDate >= '9999-12-31'  
      and wb3.isOrgDismiss = 0
      and wb3.dateFrom = 
        (select ${sqlDialect.top} wb2.dateFrom 
          from hr_employeeWorkbook wb2 
          where
            wb2.organizationID in (${mParams.orgIDs})  
            and wb2.employeeID = wb.employeeID
            and wb2.dateFrom < wb.dateFrom
            and wb2.mi_deleteDate >= '9999-12-31'  
          order by wb2.dateFrom desc ${sqlDialect.limit})
    )
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
  const whereClause = ` md.dateFrom between :dateFrom: and :dateTo:
    and en.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'
    ${depClause}
    ${orgClause2}
    ${orgClause}
    `
  return whereClause
}
