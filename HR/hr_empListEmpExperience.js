const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const dateService = require('../AC/modules/dataServices/dateService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const { XLSXWorkbook } = require('@unitybase/xlsx')
const tpManager = require('../AC/modules/documentBuilder/tpManager')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const dateOption = {
  year: 'numeric',
  month: 'numeric',
  day: '2-digit'
}
const _ = require('lodash')

me.entity.addMethod('search')
me.entity.addMethod('generateXLSX')
me.entity.addMethod('generatePlanXLSX')
me.entity.addMethod('createOrderCertification')
me.entity.addMethod('createOrderBusinessTripEducation')
me.entity.addMethod('createOrderEducation')

function getConvertDateSQL (paramName, attr) {
  const sqlDialect = entityBaseService.getSQLDialect()
  return sqlDialect.dialect === 'MSSQL2012'
    ? `CONVERT(datetime, CAST(DATEPART(year, :${paramName}:) AS varchar(4))
        + (CASE WHEN DATEPART(month, ${attr}) < 10  THEN '0' + CAST(DATEPART(month, ${attr}) AS varchar(2))
        ELSE CAST(DATEPART(month, ${attr}) AS varchar(2)) END)
        + (CASE WHEN DATEPART(month, ${attr}) = 2 and DATEPART(day, ${attr}) = 29 THEN '28'
          WHEN DATEPART(day, ${attr}) < 10  THEN '0' + CAST(DATEPART(day, ${attr}) AS varchar(2))
        ELSE CAST(DATEPART(day, ${attr}) AS varchar(2)) END), 112)`
    : `cast(
      cast(extract(year from cast(:${paramName}: as timestamp)) as varchar(4)) || 
      (case when extract(month from ${attr}) < 10 then '0' || cast(extract(month from ${attr}) as varchar(2)) else cast(extract(month from ${attr}) as varchar(2)) end) || 
      (case when extract(month from ${attr}) = 2 and extract(day from ${attr}) = 29 then '28' when extract(day from ${attr}) < 10 then '0' ||
       cast(extract(day from ${attr}) as varchar(2)) else cast(extract(day from ${attr}) as varchar(2)) end)
    as timestamp)`
}

function formSqlBuilder (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const joinExp = `
  JOIN (
    SELECT exp2.employeeID, experience.ID, experience.name as expname, exp2.calcDate as calcDate
      , (CASE 
      WHEN ${getConvertDateSQL('dateFrom', 'exp2.calcDate')} between :dateFrom: and :dateTo:          
      THEN ${getConvertDateSQL('dateFrom', 'exp2.calcDate')}         
      WHEN ${getConvertDateSQL('dateTo', 'exp2.calcDate')} between :dateFrom: and :dateTo:          
      THEN ${getConvertDateSQL('dateTo', 'exp2.calcDate')}         
      ELSE '9999-12-31' END) AS setDate      
    From hr_employeeExperience exp2
      join hr_dictExperience experience on exp2.dictExperienceID = experience.ID and experience.mi_deleteDate >= '9999-12-31'      
    Where exp2.mi_deleteDate >= '9999-12-31'         
  ) exp on emp.ID = exp.employeeID `

  const joinCertificatnUp = `
   LEFT JOIN (
    SELECT cup.employeeID, cup.dateFrom,
      ( CASE WHEN cup.dateFrom is null THEN 0 
      WHEN ${getConvertDateSQL('dateFrom', 'cup.dateFrom')} between :dateFrom: and :dateTo:          
      THEN ${sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(yy, cup.dateFrom, ${getConvertDateSQL('dateFrom', 'cup.dateFrom')})`
    : `DATE_PART('year', AGE(${getConvertDateSQL('dateFrom', 'cup.dateFrom')}, cup.dateFrom))`} 
      WHEN ${getConvertDateSQL('dateTo', 'cup.dateFrom')} between :dateFrom: and :dateTo:          
      THEN ${sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(yy, cup.dateFrom, ${getConvertDateSQL('dateTo', 'cup.dateFrom')})` : `DATE_PART('year', AGE(${getConvertDateSQL('dateTo', 'cup.dateFrom')}, cup.dateFrom))`}    
      ELSE 0 END) AS years 
     
    From (select max(dictCU.dateFrom) as dateFrom, dictCU.employeeID from hr_empCertificatnUp dictCU where dictCU.mi_deleteDate >= '9999-12-31' group by dictCU.employeeID) cup        
  ) empCertificatnUp on emp.ID = empCertificatnUp.employeeID `

  const sqlBuilder = {
    text: `  SELECT {0} {1}
    FROM hr_employeePosition ep  
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID  
      JOIN hr_employee emp on en.employeeID = emp.ID 
      ${joinExp}  
      ${joinCertificatnUp}  
      LEFT JOIN ubm_enum e_workPlace ON e_workPlace.code = ep.workPlace
        and e_workPlace.eGroup = 'HR_WORKER_PLACE'
      JOIN hr_position pos on pos.ID = (select ${sqlDialect.top} pos.ID from hr_position pos
        WHERE pos.mi_data_id = ep.positionID              
          and pos.orgID = en.orgID  
          and pos.mi_dateFrom <= :dateTo:   
          and pos.mi_deleteDate >= '9999-12-31'              
          and pos.state = 'ACTIVE'             
        ORDER BY pos.mi_dateFrom desc ${sqlDialect.limit})  
      {2} {3} {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      employeePositionID: { field: 'ep.ID' },
      positionID: { field: 'ep.positionID' },
      departmentID: { field: 'ep.departmentID' },
      tabNum: { field: 'en.tabNum' },
      lastName: { field: 'emp.lastName' },
      firstName: { field: 'emp.firstName' },
      middleName: { field: 'emp.middleName' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      expName: { field: 'exp.expname' },
      calcDate: { field: 'exp.calcDate' },
      workYear: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `FLOOR((CASE WHEN DATEDIFF(dd, en.dateFrom, :onDate:) < 0 THEN 0 ELSE DATEDIFF(dd, en.dateFrom, :onDate:) END) / 365)`
        : `(CASE WHEN DATE_PART('year', AGE(:onDate:, en.dateFrom)) < 0 THEN 0 ELSE DATE_PART('year', AGE(:onDate:, en.dateFrom)) END)`
      },
      stageYear: { field: sqlDialect.dialect === 'MSSQL2012'
        ? `(CASE WHEN DATEDIFF(yy, exp.calcDate, exp.setDate) < 0 THEN 0 ELSE DATEDIFF(yy, exp.calcDate, exp.setDate) END)`
        : `(CASE WHEN DATE_PART('year', AGE(exp.setDate, exp.calcDate)) < 0 THEN 0 ELSE DATE_PART('year', AGE(exp.setDate, exp.calcDate)) END)`
      },
      setDate: { field: 'exp.setDate' },
      posName: { field: 'pos.name' },
      actualPositionName: { field: 'ep.factPosition' },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      depIdxNum: { field: staffService.getDepFldOnDateOnlySql('exp.setDate', 'ep.departmentID', 'idxNum') },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, exp.setDate, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'en.orgID', 'name') },
      depTree: { field: `${sqlDialect.scheme}depNamePath2(ep.departmentID, exp.setDate, en.orgID, '/ ', (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      workPlace: { field: 'ep.workPlace' },
      workPlaceName: { field: 'e_workPlace.name' },
      dictStaffCatID: { field: 'ep.dictStaffCatID' },
      dictStaffCat: { field: `(select ${sqlDialect.top} dictSC.name from hr_dictStaffCat dictSC where dictSC.id = ep.dictStaffCatID and dictSC.mi_deleteDate >= '9999-12-31' ${sqlDialect.limit})` },
      eduName: { field: ` ${sqlDialect.dialect === 'MSSQL2012'
        ? `STUFF((select (CONCAT(', ', (CASE when ee.dateIssue is not null then FORMAT(ee.dateIssue AT TIME ZONE 'UTC' AT TIME ZONE 'Central European Standard Time', 'dd.MM.yyyy') ELSE '' END),' ',ee.docNumber,' ',ee.qualification, ' ', edu.name, ' ', s.name)) from hr_employeeEducation ee 
      LEFT JOIN hr_dictEducationLevel edu ON edu.id = ee.dictEducationLevelID and edu.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_specialty s ON s.ID = ee.dictSpecialtyID and s.mi_deleteDate >= '9999-12-31'
      where ee.employeeID = en.employeeID and ee.mi_deleteDate >= '9999-12-31' order by ee.dateFrom FOR XML PATH('')), 1, 2, '')`
        : `(SELECT STRING_AGG(CONCAT((case when ee.dateIssue is not null then to_char(ee.dateIssue, 'DD.MM.YYYY') else '' end), ' ', ee.docNumber, ' ', ee.qualification, ' ', edu.name, ' ', s.name), ', ') from hr_employeeEducation ee 
      LEFT JOIN hr_dictEducationLevel edu ON edu.id = ee.dictEducationLevelID and edu.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_specialty s ON s.ID = ee.dictSpecialtyID and s.mi_deleteDate >= '9999-12-31'
      where ee.employeeID = en.employeeID and ee.mi_deleteDate >= '9999-12-31' group by ee.dateFrom order by ee.dateFrom)`} ` },
      certificatDate: { field: `empCertificatnUp.dateFrom` },
      certificatYear: { field: `(CASE WHEN empCertificatnUp.years is null THEN 0 WHEN empCertificatnUp.years < 0 THEN 0 ELSE empCertificatnUp.years END)` },
      certificatDateTo: { field: `(select ${sqlDialect.top} ecp.dateTo from hr_empCertificatnUp ecp 
      where ecp.employeeID = en.employeeID and ecp.mi_deleteDate >= '9999-12-31' order by ecp.dateTo desc ${sqlDialect.limit})` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(ctx.mParams),
    '',
    true
  )
  sqlBuilder.clauses.whereParams.onDate = ctx.mParams.onDate
  sqlBuilder.clauses.whereParams.organizationID = ctx.mParams.organizationID
  sqlBuilder.clauses.whereParams.includeChildOrgs = ctx.mParams.includeChildOrgs
  sqlBuilder.clauses.whereParams.departmentID = ctx.mParams.departmentID
  sqlBuilder.clauses.whereParams.includeChildDepts = ctx.mParams.includeChildDepts
  sqlBuilder.clauses.whereParams.dateFrom = dateService.shiftDate(ctx.mParams.dateFrom)
  sqlBuilder.clauses.whereParams.dateTo = dateService.shiftDate(ctx.mParams.dateTo)
  sqlBuilder.clauses.whereParams.workPlace = ctx.mParams.workPlace
  sqlBuilder.clauses.whereParams.experience = ctx.mParams.experience
  sqlBuilder.clauses.whereParams.dictStaffCatID = ctx.mParams.dictStaffCatID
  sqlBuilder.clauses.whereParams.dictExperience = ctx.mParams.dictExperience
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, "stageYear"'

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
    sqlBuilder.clauses.maxLimitClause
  )

  ctx.dataStore.runSQL(runsql, sqlBuilder.clauses.whereParams)

  ctx.inherite = false
  return true
}

me.getWhereClause = function (mParams) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const dictStaffCatClause = mParams.dictStaffCatID ? ` and ep.dictStaffCatID = ${mParams.dictStaffCatID} ` : ''
  const workPlaceClause = mParams.workPlace ? ` and ep.workPlace = '${mParams.workPlace}' ` : ''
  const dictExperienceClause = mParams.dictExperience ? ` and exp.id in (${mParams.dictExperience}) ` : ''
  const expYearClause = mParams.expYear ? ` and ${sqlDialect.dialect === 'MSSQL2012' ? `DATEDIFF(yy, exp.calcDate, exp.setDate)` : `DATE_PART('year', AGE(exp.setDate, exp.calcDate))`} = ${mParams.expYear} ` : ''
  const yearExpClause = mParams.yearExp || mParams.yearExp === 0 ? ` and (CASE WHEN empCertificatnUp.years is null THEN 0 WHEN empCertificatnUp.years < 0 THEN 0 ELSE empCertificatnUp.years END) = ${mParams.yearExp} ` : ''
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)

  return ` ep.isActive = 1 
    and ep.mi_deleteDate >= '9999-12-31'   
    and en.mi_deleteDate >= '9999-12-31'    
    and :onDate: between ep.dateFrom and ep.dateTo 
    and ep.isActive = 1  
    and exp.setDate between :dateFrom: and :dateTo:
    ${yearExpClause} 
    ${expYearClause} 
    ${dictExperienceClause} 
    ${dictStaffCatClause} 
    ${workPlaceClause}
    ${orgClause}
    ${depClause}     
    `
}

me.generateXLSX = function (ctx) {
  const viewData = JSON.parse(ctx.mParams.viewData)
  const doc = new tpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '1',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 12
        },
        height: 8
      }
    },
    docTable: {
      baseStyle: 'baseBlock',
      font: { size: 12, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: [
          { width: 10 }, { width: 30 }, { width: 30 },
          { width: 15 }, { width: 15 }, { width: 30 },
          { width: 30 }, { width: 30 }, { width: 20 },
          { width: 20 }, { width: 15 }, { width: 15 }, { width: 30 }
        ]
      }
    }
  }, 'xlsx')

  const wb = new XLSXWorkbook()
  const fillBG = wb.style.fills.add({ fgColor: { rgb: 'F0F0F0' } })
  const styleCap = { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'center' }
  const styleRow = { align: 'left' }
  const styleNum = { align: 'right', format: '0' }
  const styleDate = { align: 'right' }
  const table = []
  table.push([
    { content: ctx.mParams.title || '', style: { height: 40, font: { size: 12, type: 'Bold' }, align: 'center', colSpan: 13 } }
  ])

  table.push([
    { content: UB.i18n('Таб. №'), style: styleCap },
    { content: UB.i18n('ПІБ'), style: styleCap },
    { content: UB.i18n('Стаж (назва)'), style: styleCap },
    { content: UB.i18n('Років'), style: styleCap },
    { content: UB.i18n('Дата встановлення'), style: styleCap },
    { content: UB.i18n('Посада'), style: styleCap },
    { content: UB.i18n('Підрозділ'), style: styleCap },
    { content: UB.i18n('Структурний підрозділ'), style: styleCap },
    { content: UB.i18n('Місце роботи'), style: styleCap },
    { content: UB.i18n('Категорія персоналу'), style: styleCap },
    { content: UB.i18n('Років роботи'), style: styleCap },
    { content: UB.i18n('Атестація, курси'), style: styleCap },
    { content: UB.i18n('Освіта'), style: styleCap }
  ])
  viewData.forEach(row => {
    table.push([
      { content: row.tabNum || '', style: styleRow },
      { content: row.fullFIO || '', style: styleRow },
      { content: row.expName || '', style: styleRow },
      { content: row.stageYear || '0', style: styleNum },
      { content: row.setDate ? new Date(row.setDate).toLocaleString('uk-UA', dateOption) : '', style: styleDate },
      { content: row.posName || '', style: styleRow },
      { content: row.depName || '', style: styleRow },
      { content: row.structDepName || '', style: styleRow },
      { content: row.workPlaceName || '', style: styleRow },
      { content: row.dictStaffCat || '', style: styleRow },
      { content: row.workYear || '0', style: styleNum },
      { content: row.certificatDate ? new Date(row.certificatDate).toLocaleString('uk-UA', dateOption) : '', style: styleDate },
      { content: row.eduName || '', style: styleRow }
    ])
  })

  doc.table(table, 'docTable')
  ctx.mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}

me.createOrderCertification = function (ctx) {
  const orderStore = UB.DataStore('hr_empOrder')
  if (!ctx.mParams.execParams.orderID) {
    ctx.mParams.execParams.orderID = orderStore.generateID()
    orderStore.run(
      'insert',
      {
        execParams: {
          ID: ctx.mParams.execParams.orderID,
          organizationID: ctx.mParams.execParams.orgID,
          masterOrganizationName: ctx.mParams.execParams.masterOrganizationName,
          masterOrganizationID: ctx.mParams.execParams.masterOrganizationID,
          orderState: 'PROJECT',
          empOrderType: 'CERTIFICATION',
          orderDate: dateService.currentDate(),
          entryDate: dateService.currentDate()
        }
      }
    )
  } else {
    const order = UB.Repository('hr_empOrder').attrs(['orderState']).selectById(ctx.mParams.execParams.orderID)
    if (!order) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ не знайдено. Можливо його було видалено!')}>>>`)
    }
    if (order.orderState !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ вже оброблено. Неможливо змінити!')}>>>`)
    }
  }

  const orderDetStore = UB.DataStore('hr_empOrderCertificationDet')
  const empPositions = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'positionID', 'departmentID', 'organizationID', 'payElID', 'positionType'])
    .where('ID', 'in', ctx.mParams.execParams.empPositions)
    .selectAsObject()

  empPositions.forEach(row => {
    const empTarifCategory = UB.Repository('hr_empTarifCategory')
      .attrs('dictTarifCoeffID')
      .where('employeeID', '=', row.employeeID)
      .orderBy('dateFrom', 'desc')
      .selectSingle() || {}

    let props = {}
    if (!row.payElID && row.positionType) {
      props = UB.Repository('hr_positionTypeProps')
        .attrs('payElID')
        .where('positionType', '=', row.positionType)
        .where('organizationID', '=', row.organizationID)
        .selectSingle() || {}
    }

    const onDate = dateService.currentDate()
    const tariffCoef = UB.Repository('hr_dictTarifCoeffDet')
      .attrs('accrualSum')
      .where('dictTarifCoeffID', '=', empTarifCategory.dictTarifCoeffID || null)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle() || {}

    orderDetStore.run(
      'insert',
      {
        execParams: {
          orderID: ctx.mParams.execParams.orderID,
          orderState: 'PROJECT',
          employeePositionID: row.ID,
          employeeID: row.employeeID,
          employeeNumberID: row.employeeNumberID,
          organizationID: row.organizationID,
          departmentID: row.departmentID,
          positionID: row.positionID,
          destOrganizationID: ctx.mParams.execParams.destOrganizationID,
          destOrganizationName: ctx.mParams.execParams.destOrganizationName,
          orderNumber: ctx.mParams.execParams.orderNumber,
          orderDate: ctx.mParams.execParams.orderDate,
          certificationType: ctx.mParams.execParams.certificationType,
          dictEmpCategoryID: ctx.mParams.execParams.dictEmpCategoryID,
          dictSpecialtyID: ctx.mParams.execParams.dictSpecialtyID,
          dictTarifCoeffID: empTarifCategory ? empTarifCategory.dictTarifCoeffID : null,
          payElID: row.payElID || props.payElID || null,
          tarifSalary: tariffCoef.accrualSum || 0,
          dateFrom: ctx.mParams.execParams.dateFrom,
          dateTo: ctx.mParams.execParams.dateTo,
          docNumber: ctx.mParams.execParams.docNumber,
          empOrderType: 'CERTIFICATION',
          info: ctx.mParams.execParams.info,
          reason: ctx.mParams.execParams.reason
        }
      }
    )
  })
}

me.createOrderBusinessTripEducation = function (ctx) {
  const orderStore = UB.DataStore('hr_empOrder')
  if (!ctx.mParams.execParams.orderID) {
    ctx.mParams.execParams.orderID = orderStore.generateID()
    orderStore.run(
      'insert',
      {
        execParams: {
          ID: ctx.mParams.execParams.orderID,
          organizationID: ctx.mParams.execParams.orgID,
          masterOrganizationName: ctx.mParams.execParams.masterOrganizationName,
          masterOrganizationID: ctx.mParams.execParams.masterOrganizationID,
          orderState: 'PROJECT',
          empOrderType: 'MISSION',
          orderDate: dateService.currentDate(),
          entryDate: dateService.currentDate()
        }
      }
    )
  } else {
    const order = UB.Repository('hr_empOrder').attrs(['orderState']).selectById(ctx.mParams.execParams.orderID)
    if (!order) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ не знайдено. Можливо його було видалено!')}>>>`)
    }
    if (order.orderState !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ вже оброблено. Неможливо змінити!')}>>>`)
    }
  }

  const orderDetStore = UB.DataStore('hr_empOrderMissionDet')
  const empPositions = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName',
      'positionID', 'departmentID', 'organizationID', 'payElID', 'positionType'])
    .where('ID', 'in', ctx.mParams.execParams.empPositions)
    .selectAsObject()

  empPositions.forEach(row => {
    orderDetStore.run(
      'insert',
      {
        execParams: {
          orderID: ctx.mParams.execParams.orderID,
          orderState: 'PROJECT',
          employeePositionID: row.ID,
          employeeID: row.employeeID,
          firstName: row['employeeID.firstName'],
          lastName: row['employeeID.lastName'],
          middleName: row['employeeID.middleName'],
          employeeNumberID: row.employeeNumberID,
          organizationID: row.organizationID,
          departmentID: row.departmentID,
          positionID: row.positionID,
          destOrganizationID: ctx.mParams.execParams.destOrganizationID,
          destOrganizationName: ctx.mParams.execParams.destOrganizationName,
          cityID: ctx.mParams.execParams.cityID,
          cityName: ctx.mParams.execParams.cityName,
          dateFrom: ctx.mParams.execParams.dateFrom,
          dateTo: ctx.mParams.execParams.dateTo,
          dayCount: ctx.mParams.execParams.dayCount,
          dictProfCompDevelopFormID: ctx.mParams.execParams.dictProfCompDevelopFormID,
          dictTrainingTopicName: ctx.mParams.execParams.dictTrainingTopicName,
          dictTrainingTopicID: ctx.mParams.execParams.dictTrainingTopicID,
          isNeedReport: 0,
          empOrderType: 'MISSION_TRAINING'
        }
      }
    )
  })
}

me.createOrderEducation = function (ctx) {
  const orderStore = UB.DataStore('hr_empOrder')
  if (!ctx.mParams.execParams.orderID) {
    ctx.mParams.execParams.orderID = orderStore.generateID()
    orderStore.run(
      'insert',
      {
        execParams: {
          ID: ctx.mParams.execParams.orderID,
          organizationID: ctx.mParams.execParams.orgID,
          masterOrganizationName: ctx.mParams.execParams.masterOrganizationName,
          masterOrganizationID: ctx.mParams.execParams.masterOrganizationID,
          orderState: 'PROJECT',
          empOrderType: 'TRAINING',
          orderDate: dateService.currentDate(),
          entryDate: dateService.currentDate()
        }
      }
    )
  } else {
    const order = UB.Repository('hr_empOrder').attrs(['orderState']).selectById(ctx.mParams.execParams.orderID)
    if (!order) {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ не знайдено. Можливо його було видалено!')}>>>`)
    }
    if (order.orderState !== 'PROJECT') {
      throw new UB.UBAbort(`<<<${UB.i18n('Наказ вже оброблено. Неможливо змінити!')}>>>`)
    }
  }

  const orderDetStore = UB.DataStore('hr_empOrderTrainingDet')
  const employeeStore = UB.DataStore('hr_empOrderEmployeeDet')
  const empPositions = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'employeeID', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName',
      'positionID', 'departmentID', 'organizationID', 'payElID', 'positionType'])
    .where('ID', 'in', ctx.mParams.execParams.empPositions)
    .selectAsObject()

  const orderDetStoreID = orderDetStore.generateID()
  orderDetStore.run(
    'insert',
    {
      execParams: {
        ID: orderDetStoreID,
        orderID: ctx.mParams.execParams.orderID,
        orderState: 'PROJECT',
        organizationID: ctx.mParams.execParams.orgID,
        destOrganizationID: ctx.mParams.execParams.destOrganizationID,
        destOrganizationName: ctx.mParams.execParams.destOrganizationName,
        cityID: ctx.mParams.execParams.cityID,
        cityName: ctx.mParams.execParams.cityName,
        dateFrom: ctx.mParams.execParams.dateFrom,
        dateTo: ctx.mParams.execParams.dateTo,
        dayCount: ctx.mParams.execParams.dayCount,
        dictProfCompDevelopFormID: ctx.mParams.execParams.dictProfCompDevelopFormID,
        dictTrainingTopicName: ctx.mParams.execParams.dictTrainingTopicName,
        dictTrainingTopicID: ctx.mParams.execParams.dictTrainingTopicID,
        isGroup: 1,
        empOrderType: 'TRAINING'
      }
    }
  )
  empPositions.forEach(row => {
    employeeStore.run(
      'insert',
      {
        execParams: {
          paraID: orderDetStoreID,
          isEmpAgreed: false,
          isExternal: false,
          organizationID: row.organizationID,
          orderID: ctx.mParams.execParams.orderID,
          employeePositionID: row.ID,
          positionID: row.positionID
        }
      }
    )
  })
}

me.generatePlanXLSX = function (ctx) {
  const viewData = JSON.parse(ctx.mParams.viewData)
  const columnsCount = 12 - (ctx.mParams.showDepInRow ? 2 : 0) - (ctx.mParams.increaseQualifications ? 0 : 3)
  const tableConfig = [{ width: 10 }, { width: 30 }, { width: 30 }, { width: 12 }]
  if (ctx.mParams.increaseQualifications) {
    tableConfig.push(...[{ width: 13 }, { width: 20 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 20 }])
  } else {
    tableConfig.push(...[{ width: 20 }, { width: 20 }, { width: 20 }])
  }
  if (!ctx.mParams.showDepInRow) {
    tableConfig.push({ width: 30 })
    tableConfig.push({ width: 30 })
  }
  const doc = new tpManager({
    document: {
      margin: {
        top: 10,
        right: 8,
        bottom: 8,
        left: 20
      },
      align: 'left',
      orientation: '1',
      bottomColontitle: {
        font: {
          name: 'TimesNewRoman',
          type: 'Normal',
          size: 12
        },
        height: 8
      }
    },
    docHeadTable: {
      baseStyle: 'baseBlock',
      font: { size: 12, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      columns: {
        verticalAlign: 'center',
        config: tableConfig
      }
    },
    docTable: {
      baseStyle: 'baseBlock',
      font: { size: 12, name: 'TimesNewRoman' },
      align: 'left',
      wordWrap: true,
      allowEmpty: true,
      border: { left: 0.5, top: 0.5, bottom: 0.5, right: 0.5 },
      columns: {
        verticalAlign: 'center',
        config: tableConfig
      }
    }
  }, 'xlsx')

  const wb = new XLSXWorkbook()
  const fillBG = wb.style.fills.add({ fgColor: { rgb: 'F0F0F0' } })
  const styleCap = { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'center' }
  const styleCap2Row = { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'center', rowSpan: 2 }
  const styleCap2Col = { fill: fillBG, font: { size: 12, type: 'Bold' }, align: 'center', colSpan: 2 }
  const styleRowCenter = { align: 'center' }
  const styleRow = { align: 'left' }
  const styleNum = { align: 'right', format: '0' }
  const tableHead = []
  const tableBody = []

  function makeTitle (text) {
    const row = []
    for (let i = 0; i < columnsCount - 3; i++) {
      row.push({ content: '' })
    }
    row.push({ content: text, style: { font: { size: 12, type: 'Bold' }, align: 'left', colSpan: 3 } })
    return row
  }
  const organizationName = UB.Repository('hr_organization').attrs('name')
    .where('mi_data_id', '=', ctx.mParams.organizationID)
    .where('mi_dateFrom', '<=', ctx.mParams.dateFrom)
    .where('mi_dateTo', '>=', ctx.mParams.dateFrom)
    .where('state', '=', 'ACTIVE')
    .selectScalar() || ''

  const orgBoss = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeID.lastName', 'employeeID.firstName', 'employeeID.middleName', 'employeeID.fullFIO', 'positionID.name'])
    .where('organizationID', '=', ctx.mParams.organizationID)
    .where('dateFrom', '<=', ctx.mParams.dateFrom)
    .where('dateTo', '>=', ctx.mParams.dateFrom)
    .where('positionID.state', '=', 'ACTIVE')
    .where('positionID.isOrgBoss', '=', 1)
    .where('positionID.mi_dateFrom', '<=', ctx.mParams.dateFrom)
    .where('positionID.mi_dateTo', '>=', ctx.mParams.dateFrom)
    .where('positionID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeID.mi_deleteDate', '>=', '#maxdate')
    .selectSingle()

  const orgBossPos = orgBoss && orgBoss['positionID.name'] ? orgBoss['positionID.name'] : '___________________________'

  const employeeInfo = {}

  let ids = _.compact(_.uniq(viewData.map(item => item.dictStaffCatID)))
  if (ctx.mParams.dictStaffCatID) {
    ids.push(ctx.mParams.dictStaffCatID)
  }
  const codes = ids && ids.length ? UB.Repository('hr_repSetElement')
    .attrs(['repSetParamID.code', 'elementID'])
    .where('repSetParamID.code', 'in', ['KSR1', 'KSR2'])
    .where('dateFromNotEmpty', '<=', ctx.mParams.dateFrom)
    .where('dateToNotEmpty', '>=', ctx.mParams.dateFrom)
    .where('repSetParamID.dateFrom', '<=', ctx.mParams.dateFrom)
    .where('repSetParamID.dateTo', '>=', ctx.mParams.dateFrom)
    .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
    .where('elementID', 'in', ids)
    .selectAsObject({
      'repSetParamID.code': 'code'
    }) : []

  ids = _.uniq(viewData.map(item => item.employeeID))
  let empCertificationAcc = UB.Repository('hr_empCertificationAcc')
    .attrs(['employeeID', 'dictSpecialtyID', 'dictSpecialtyID.name', 'dictEmpCategoryID.name', 'certificationDate'])
    .whereIf(ids && ids.length > 0, 'employeeID', 'in', ids)
    .whereIf(!ids && ids.length === 0, 'employeeID', '=', 0)
    .selectAsObject()
  empCertificationAcc = empCertificationAcc && empCertificationAcc.length ? _.groupBy(empCertificationAcc, 'employeeID') : []

  _.forEach(empCertificationAcc, items => {
    const row = []
    const employeeID = items[0].employeeID || 0
    items = _.groupBy(items, 'dictSpecialtyID')
    _.forEach(items, specs => {
      specs = _.sortBy(specs, 'certificationDate').reverse()
      row.push(`${specs[0]['dictEmpCategoryID.name'] || ''}, ${specs[0]['dictSpecialtyID.name'] || ''}, ${specs[0].certificationDate ? dateService.formatDate(specs[0].certificationDate) : ''}`)
    })
    employeeInfo[employeeID] = {
      certification: row.join('; '),
      eduDate: null
    }
  })

  let employeeEducation = UB.Repository('hr_employeeEducation')
    .attrs(['employeeID', 'dateTo', 'dictEducationLevelID.educationType'])
    .whereIf(ids && ids.length > 0, 'employeeID', 'in', ids)
    .whereIf(!ids && ids.length === 0, 'employeeID', '=', 0)
    .where('dateTo', 'isNotNull')
    .selectAsObject({
      'dictEducationLevelID.educationType': 'educationType'
    })
  employeeEducation = employeeEducation && employeeEducation.length ? _.groupBy(employeeEducation, 'employeeID') : []
  _.forEach(employeeEducation, items => {
    const employeeID = items[0].employeeID || 0
    let fltr = items.filter(item => (item.educationType && item.educationType === '1'))
    fltr = fltr && fltr.length ? _.sortBy(fltr, 'dateTo') : _.sortBy(items, 'dateTo').reverse()
    if (employeeInfo[employeeID]) {
      employeeInfo[employeeID].eduDate = fltr[0].dateTo
    } else {
      employeeInfo[employeeID] = {
        certification: null,
        eduDate: fltr[0].dateTo
      }
    }
  })
  ids = viewData.filter(item => item.workPlace !== '1')
  ids = ids && ids.length ? _.uniq(ids.map(item => item.employeeID)) : []
  let employeePositionVacancy = ids && ids.length ? UB.Repository('hr_empLongTermAbsc')
    .attrs(['employeeNumberID.employeeID', 'employeeNumberID.dateFrom', 'dateFrom', 'dateTo'])
    .where('organizationID', '=', ctx.mParams.organizationID)
    .where('employeeNumberID.employeeID', 'in', ids)
    .where('employeeNumberID.employeeID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', ctx.mParams.onDate)
    .where('dateTo', '>=', ctx.mParams.onDate)
    .selectAsObject({
      'employeeNumberID.employeeID': 'employeeID'
    }) : []

  employeePositionVacancy = employeePositionVacancy && employeePositionVacancy.length ? _.groupBy(employeePositionVacancy, 'employeeID') : []

  function formatName (lastName, name, middleName, separator = '.') {
    if (!lastName && !name && !middleName) {
      return ''
    }
    return (name ? name.charAt(0).toUpperCase() + separator : '') + (middleName ? lastName.charAt(0).toUpperCase() + separator : '') + (lastName || '')
  }

  const orgBossName = orgBoss ? formatName(orgBoss['employeeID.lastName'], orgBoss['employeeID.firstName'], orgBoss['employeeID.middleName']) : ''

  tableHead.push(makeTitle('"ЗАТВЕРДЖУЮ"'))
  tableHead.push(makeTitle(orgBossPos))
  tableHead.push(makeTitle(organizationName))
  tableHead.push(makeTitle(`____________________ ${orgBossName}`))
  tableHead.push(makeTitle(''))
  tableHead.push(makeTitle('"__" ___________ 20__ р.'))

  tableHead.push([{ content: '', style: { font: { size: 12, type: 'Bold' }, align: 'center', colSpan: columnsCount } }])
  tableHead.push([{ content: 'ПЛАН', style: { font: { size: 12, type: 'Bold' }, align: 'center', colSpan: columnsCount } }])

  let code = codes && codes.length ? codes.filter(item => (item.elementID === ctx.mParams.dictStaffCatID)) : undefined
  code = code && code.length ? code[0].code : ''
  if (code === 'KSR1') { // Лікарі
    tableHead.push([{
      content: 'атестації лікарів спеціалістів з вищою освітою',
      style: { font: { size: 12, type: 'Bold' }, align: 'center', colSpan: columnsCount }
    }])
  } else if (code === 'KSR2') { // Середній медичний персонал
    tableHead.push([{
      content: 'підвищення кваліфікації, атестації та переатестації молодших  спеціалістів з медичною освітою',
      style: { font: { size: 12, type: 'Bold' }, align: 'center', colSpan: columnsCount }
    }])
  } else {
    tableHead.push([{
      content: 'підвищення кваліфікації, атестації та переатестації',
      style: { font: { size: 12, type: 'Bold' }, align: 'center', colSpan: columnsCount }
    }])
  }
  tableHead.push([{ content: UB.i18n(`{0} на {1}`, organizationName, dateService.formatDate(ctx.mParams.dateFrom)), style: { font: { size: 12, type: 'Bold' }, align: 'center', colSpan: columnsCount } }])

  doc.setFormat()
  let columnName = [
    { content: '№\nп/п', style: ctx.mParams.increaseQualifications ? styleCap2Row : styleCap },
    { content: 'Прізвище, імя, по батькові', style: ctx.mParams.increaseQualifications ? styleCap2Row : styleCap },
    { content: 'Посада', style: ctx.mParams.increaseQualifications ? styleCap2Row : styleCap },
    { content: 'Рік закінчення учбового закладу', style: ctx.mParams.increaseQualifications ? styleCap2Row : styleCap }
  ]
  if (ctx.mParams.increaseQualifications) {
    columnName.push({ content: 'Останнє', style: styleCap2Col })
    columnName.push({ content: 'Планування', style: styleCap2Col })
    columnName.push({ content: 'Дата виконання', style: styleCap2Col })
  } else {
    columnName.push({ content: 'Остання атестація', style: styleCap })
    columnName.push({ content: 'Планування атестації', style: styleCap })
    columnName.push({ content: 'Виконання, дата атестації', style: styleCap })
  }
  if (!ctx.mParams.showDepInRow) {
    columnName.push({ content: 'Самостійний підрозділ', style: ctx.mParams.increaseQualifications ? styleCap2Row : styleCap })
    columnName.push({ content: 'Підрозділ', style: ctx.mParams.increaseQualifications ? styleCap2Row : styleCap })
  }
  tableBody.push(columnName)
  if (ctx.mParams.increaseQualifications) {
    columnName = []
    if (ctx.mParams.increaseQualifications) {
      for (let i = 0; i < 3; i++) {
        columnName.push({ content: 'Підвищення кваліфікації', style: styleCap })
        columnName.push({ content: 'Атестація', style: styleCap })
      }
    }
    tableBody.push(columnName)
  }

  function sortData (a, b) {
    if (a.depIdxNum === b.depIdxNum) {
      return 0
    } else if (a.depIdxNum === null) {
      return -1
    } else if (b.depIdxNum === null) {
      return 1
    }
    return a.depIdxNum < b.depIdxNum ? -1 : 1
  }

  const viewDataGrouped = ctx.mParams.showDepInRow ? _.groupBy(viewData.sort(sortData), 'depName') : { 'null': viewData }
  let npp = 1
  _.forEach(viewDataGrouped, viewData => {
    if (ctx.mParams.showDepInRow) {
      tableBody.push([
        { content: '', style: styleRow },
        { content: UB.i18n(`Підрозділ: {0}`, viewData[0].depName || ''), style: { font: { size: 12, type: 'Bold' }, align: 'left', colSpan: columnsCount - 1 } }
      ])
    }
    viewData.forEach(row => {
      const dataRow = [
        { content: npp++, style: styleNum },
        { content: row.fullFIO || '', style: styleRow },
        { content: row.posName || '', style: styleRow },
        { content: (employeeInfo[row.employeeID] && employeeInfo[row.employeeID].eduDate) ? dateService.formatDate(employeeInfo[row.employeeID].eduDate, 'yyyy') : '', style: styleRowCenter }
      ]
      if (ctx.mParams.increaseQualifications) {
        dataRow.push({ content: row.certificatDateTo ? dateService.formatDate(row.certificatDateTo) : '', style: styleRowCenter })
      }
      dataRow.push({ content: employeeInfo[row.employeeID] ? employeeInfo[row.employeeID].certification || '' : '', style: styleRow })

      code = row.dictStaffCatID && codes && codes.length ? codes.filter(item => (item.elementID === row.dictStaffCatID)) : undefined
      code = code && code.length ? code[0].code : ''

      const workYear = row.workPlace === '1' ? row.workYear : (employeePositionVacancy[row.employeeID] ? dateService.yearsDiff(row.calcDate, employeePositionVacancy[row.employeeID][0]['employeeNumberID.dateFrom']) : 0)
      const vacFrom = row.workPlace === '1' ? (employeePositionVacancy[row.employeeID] ? employeePositionVacancy[row.employeeID][0].dateFrom : null) : null
      const vacTo = row.workPlace === '1' ? (employeePositionVacancy[row.employeeID] ? employeePositionVacancy[row.employeeID][0].dateTo : null) : null
      const minus = ((workYear < 1) || (vacFrom && vacTo && vacFrom <= ctx.mParams.dateFrom && vacTo >= ctx.mParams.dateFrom) ||
        (vacFrom && vacTo && dateService.dayDiff(ctx.mParams.dateFrom, vacTo) < 183))

      if (ctx.mParams.increaseQualifications) {
        // KSR2 середній медперсонал
        dataRow.push({ content: code === 'KSR2' && row.stageYear > 0 && row.stageYear % 5 === 0 && !minus ? '+' : '-', style: styleRowCenter })
      }

      if (code === 'KSR1') { // лікарі
        let value = '-'
        if (row.stageYear === 5 && employeeInfo[row.employeeID].eduDate && dateService.yearsDiff(employeeInfo[row.employeeID].eduDate, ctx.mParams.dateFrom) >= 5) {
          value = '+'
        } else if (row.stageYear === 7) {
          value = '+'
        } else if (row.stageYear >= 10 && row.stageYear % 5 === 0) {
          value = '+'
        }
        dataRow.push({ content: value, style: styleRowCenter })
      } else if (code === 'KSR2') { // середній медперсонал
        dataRow.push({ content: row.stageYear > 0 && row.stageYear % 5 === 0 && !minus ? '+' : '-', style: styleRowCenter })
      } else {
        dataRow.push({ content: '-', style: styleRowCenter })
      }

      if (ctx.mParams.increaseQualifications) {
        dataRow.push({ content: '', style: styleRow })
      }
      dataRow.push({ content: '', style: styleRow })

      if (!ctx.mParams.showDepInRow) {
        dataRow.push({ content: row.structDepName || '', style: styleRow })
        dataRow.push({ content: row.depName || '', style: styleRow })
      }
      tableBody.push(dataRow)
    })
  })

  doc.table(tableHead, 'docHeadTable')
  doc.table(tableBody, 'docTable')
  ctx.mParams.data = JSON.stringify(generateBase64Str(doc.getDocument()))
}
