const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')
me.entity.addMethod('search2')

me.getOrderInfo = function (sqlDialect, empOrderTypes) {
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

me.getSqlEdu = function (dialect) {
	const sqlTable = `from hr_employeeEducation edu 
    inner join hr_dictEducationLevel lvl on lvl.id = edu.dictEducationLevelID and lvl.mi_deleteDate >= '9999-12-31' and lvl.educationType in ('1', '4')
    left join hr_specialty specialty on specialty.id = edu.dictSpecialtyID and specialty.mi_deleteDate >= '9999-12-31'
    left join hr_dictAreasOfEducation areaEdu on areaEdu.id = edu.dictAreasOfEduID and areaEdu.mi_deleteDate >= '9999-12-31'
  where edu.employeeID = emp.ID and edu.mi_deleteDate >= '9999-12-31' `

	const field = dialect === 'MSSQL2012'
		? `(CONCAT('; ', edu.docNumber, ' ',  edu.docSeries, ' ', specialty.name, ' ', areaEdu.name))`
		: `(CONCAT(edu.docNumber, ' ',  edu.docSeries, ' ', specialty.name, ' ', areaEdu.name))`

	return dialect === 'MSSQL2012'
		? ` STUFF((SELECT ${field} ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
		: `(SELECT STRING_AGG(${field}, '; ') ${sqlTable})`
}

me.getSqlFamily = function (dialect) {
  const sqlTable = `from hr_employeeFamily fam 
    inner join hr_people people on people.id = fam.peopleID and people.mi_deleteDate >= '9999-12-31'
    left join hr_dictKinshipKind dictKind on dictKind.id = fam.dictKinshipKindID and dictKind.mi_deleteDate >= '9999-12-31'
  where fam.employeeID = emp.ID and fam.mi_deleteDate >= '9999-12-31' `

  const field = dialect === 'MSSQL2012'
    ? `(CONCAT('; ', people.fullFIO, ' ',  dictKind.name, ' ', (CASE when people.birthDate is not null then STR(year(people.birthDate)) ELSE '' END)))`
    : `(CONCAT(people.fullFIO, ' ',  dictKind.name, ' ', (CASE when people.birthDate is not null then to_char(people.birthDate, 'YYYY') ELSE '' END)))`

  return dialect === 'MSSQL2012'
    ? ` STUFF((SELECT ${field} ${sqlTable} FOR XML PATH ('')), 1, 1, '')`
    : `(SELECT STRING_AGG(${field}, '; ') ${sqlTable})`
}

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text:
            ` SELECT {0} {1}
      FROM hr_employeePosition ep 
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID       
      JOIN hr_empStateMilitary mil on mil.employeeID = emp.ID
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      workPlace: { field: `(case when ep.workPlace is not null then ep.workPlace else '99' end)` },
      empStateMilitaryID: { field: 'mil.ID' },
      depID: { field: 'ep.departmentID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      posID: { field: 'ep.positionID' },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      posCategory: { field: `
      (select ${sqlDialect.top} uben.name 
        from hr_position pos         
        join ubm_enum uben on uben.code = pos.positionCategory and uben.eGroup = 'HR_POSITION_CATEGORY'
        where 
        pos.mi_data_id = ep.positionID 
        and en.ID = ep.employeeNumberID 
        and pos.mi_dateFrom <= en.dateTo 
        and pos.mi_dateTo >= en.dateFrom 
        and pos.mi_data_id = pos.mi_data_id 
        and pos.state = 'ACTIVE' 
        and pos.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}       
      )` },
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
      yearBirth: { field: sqlDialect.dialect === 'MSSQL2012' ? '(Year(emp.birthDate))' : `(DATE_PART('year', emp.birthDate))` },
      militaryRank: { field: `(Select ${sqlDialect.top} mr.name from hr_dictMilitaryRank mr 
        where mil.dictMilitaryRankID = mr.ID and mr.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
        ` },
      address: { field: `(Select ${sqlDialect.top} adr.address from ac_address adr 
        where adr.ownerID = emp.ID and adr.mi_deleteDate >= '9999-12-31' and adr.addressType = '1' ${sqlDialect.limit})
      ` },
      militarySpeciality: { field: `(Select ${sqlDialect.top} msp.name from hr_dictMilitarySpeciality msp 
        where mil.dictMilitarySpecialityID = msp.ID and msp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
      ` },
      militarySuitable: { field: `(Select ${sqlDialect.top} msu.name from hr_dictMilitarySuitable msu 
        where mil.dictMilitarySuitableID = msu.ID and msu.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
      ` },
      militaryOffice: { field: 'mil.office' },
      militaryState: { field: `(Select ${sqlDialect.top} mst.code from hr_dictStateMilitary mst 
        where mil.dictStateMilitaryID = mst.ID and mst.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
      ` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom

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
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  const sqlBuilder = {
    text:
      ` SELECT {0} {1}
      FROM hr_employeePosition ep 
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID       
      JOIN hr_empStateMilitary mil on mil.employeeID = emp.ID
      LEFT JOIN hr_dictMaritalStatusKind ms ON ms.ID = emp.dictMaritalStatusKindID and ms.mi_deleteDate >= '9999-12-31' 
      LEFT JOIN hr_dictCategMilitary cm ON cm.ID = mil.dictCategMilitaryID and cm.mi_deleteDate >= '9999-12-31' 
      LEFT JOIN hr_employeeDocs doc ON doc.ID = mil.employeeDocID and doc.mi_deleteDate >= '9999-12-31' 
        ${staffService.getSqlEmployeePositionOneWorkPlace()}       
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
			militaryRank: { field: `(Select ${sqlDialect.top} mr.name from hr_dictMilitaryRank mr 
        where mil.dictMilitaryRankID = mr.ID and mr.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
        ` },
			fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
			birthDate: { field: 'emp.birthDate' },
			regNumber: { field: `(CONCAT(mil.regNumber,' ',emp.taxCode))` },
      addDescrPerson: { field: 'en.addDescrPerson' },
			militarySpecialityCode: { field: `(Select ${sqlDialect.top} msp.code from hr_dictMilitarySpeciality msp 
        where mil.dictMilitarySpecialityID = msp.ID and msp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
      ` },
			militaryProfile: { field: `(Select ${sqlDialect.top} dmp.name from hr_dictMilitaryProfile dmp 
        where mil.dictMilitaryProfileID = dmp.ID and dmp.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit}) 
      ` },
      categyAndDoc: { field: `(CONCAT(cm.name, ' ', doc.description))` },
			eduName: { field: me.getSqlEdu(sqlDialect.dialect) },
			passport: { field: `(select ${sqlDialect.top} d.description from hr_employeeDocs d inner join ac_dictDocKind dk on dk.id = d.dictDocKindID and dk.docType = '1'
        where d.employeeID = emp.ID and d.state = '1' and d.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      address: { field: `(Select ${sqlDialect.top} adr.address from ac_address adr 
        where adr.ownerID = emp.ID and adr.mi_deleteDate >= '9999-12-31' and adr.addressType = '1' ${sqlDialect.limit})
      ` },
      address2: { field: `(Select ${sqlDialect.top} adr.address from ac_address adr 
        where adr.ownerID = emp.ID and adr.mi_deleteDate >= '9999-12-31' and adr.addressType = '2' ${sqlDialect.limit})
      ` },
      militaryOffice: { field: 'mil.office' },
      listInfo: { field: `(CONCAT(mil.listNumber, ' ', mil.listItem, ' ', mil.listChapter ))` },
      commandNumber: { field: `case when isMobilOrder = 1 then mil.commandNumber else '' end ` },
      delayDateTo: { field: 'mil.delayDateTo' },
      delayLaw: { field: 'mil.delayLaw' },
      isServesReserve: { field: 'mil.isServesReserve' },
      mmc: { field: `(CONCAT(mil.columnMMC,' ',mil.itemMMC))` },
      maritalStatus: { field: 'ms.name' },
      familyInfo: { field: me.getSqlFamily(sqlDialect.dialect) },
      depID: { field: 'ep.departmentID' },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      appointOrder: { field: me.getOrderInfo(sqlDialect, `'APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE'`) },
      messageDate: { field: 'mil.messageDate' },
      messageNumber: { field: 'mil.messageNumber' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause2(ctx.mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY mil.commandNumber, emp.fullFIO '

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
  const stateMilitaryClause = mParams.dictStateMilitaryID ? ` and mil.dictStateMilitaryID = ${mParams.dictStateMilitaryID}` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31' 
    and :dateFrom: between en.dateFrom and en.dateTo     
    and :dateFrom: between ep.dateFrom and ep.dateTo    
    and mil.mi_deleteDate >= '9999-12-31' 
    ${stateMilitaryClause}     
    ${orgClause}
    ${depClause}     
   `
}

me.getWhereClause2 = function (mParams) {
  const stateMilitaryClause = mParams.dictStateMilitaryID ? ` and mil.dictStateMilitaryID in (${mParams.dictStateMilitaryID})` : ''
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
  let typeClause = ''
  if (mParams.groupType === '1') {
    typeClause = `and mil.composition in ('4', '5', '6')`
  }
  if (mParams.groupType === '2') {
    typeClause = `and mil.composition in ('1', '2', '3')`
  }
  if (mParams.groupType === '3') {
    typeClause = `and emp.sexType = 'W'`
  }
  if (mParams.groupType === '4') {
    typeClause = 'and mil.isRecruiter = 1'
  }
  return ` ep.isActive = 1 
    and ep.organizationID = :organizationID:
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31' 
    and :onDate: between en.dateFrom and en.dateTo     
    and :onDate: between ep.dateFrom and ep.dateTo    
    and mil.mi_deleteDate >= '9999-12-31' 
    ${stateMilitaryClause}     
    ${orgClause}
    ${typeClause}
   `
}
