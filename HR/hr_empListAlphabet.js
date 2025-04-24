const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let docKindIDs = ctx.mParams.docKindID || '-1'
  const orgType = settingsService.getByCode('hrFuncOrgType', ctx.mParams.organizationID)
  const sqlBuilder = {
    text:
        ` SELECT {0} {1}
      FROM hr_employeePosition ep 
        INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
        INNER JOIN hr_employee emp on en.employeeID = emp.ID
        ${ctx.mParams.workPlace ? '' : staffService.getSqlEmployeePositionOneWorkPlace(':dateFrom:')}       
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      employeeNumberID: { field: 'en.ID' },
      depID: { field: 'ep.departmentID' },
      fullFIO: { field: `(CONCAT(UPPER(emp.lastName),' ',emp.firstName,' ',emp.middleName))` },
      orgName: { field: staffService.getOrgFldOnDateSql(':dateFrom:', 'en.orgID', 'name') },
      depName: { field: staffService.getDepFldOnDateSql(':dateFrom:', 'ep.departmentID', 'name') },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(ep.departmentID, :dateFrom:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = ep.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      posName: { field: staffService.getPosFldOnDateSql(':dateFrom:', 'ep.positionID', ctx.mParams.fullPosName ? 'fullNameNom' : 'name') },
      actualPositionName: { field: 'ep.factPosition' },
      addDescrPerson: { field: 'en.addDescrPerson' },
      posTreePath: { field: staffService.getPosFldOnDateSql(':dateFrom:', 'ep.positionID', 'treePath', null) },
      phoneMobile: { field: 'emp.phoneMobile' },
      phoneWorking: { field: 'emp.phoneWorking' },
      phoneHome: { field: 'emp.phoneHome' },
      workPlace: { field: `(select ${sqlDialect.top} workPlace.name from ubm_enum workPlace where workPlace.code = ep.workPlace and workPlace.eGroup = 'HR_WORKER_PLACE' ${sqlDialect.limit})` },
      posCategory: { field: orgType === '2' ? staffService.getPosEnumFldOnDateSql(':dateFrom:', 'ep.positionID', 'psCategory', 'HR_POSITION_PSCATEGORY') : staffService.getPosEnumFldOnDateSql(':dateFrom:', 'ep.positionID', 'positionCategory', 'HR_POSITION_CATEGORY') },
      email: { field: `(select ${sqlDialect.top}  
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT ';' + cont.value
from hr_employeeContact cont  
join cdn_contacttype ct on cont.contactTypeID = ct.ID and ct.mi_deleteDate >= '9999-12-31' and ct.code = 'email'  
where cont.employeeID = emp.ID and cont.mi_deleteDate >= '9999-12-31' 

FOR XML PATH ('')), 1, 1, '' )`
    : `(SELECT STRING_AGG(cont.value, ';') from hr_employeeContact cont  
join cdn_contacttype ct on cont.contactTypeID = ct.ID and ct.mi_deleteDate >= '9999-12-31' and ct.code = 'email'  
where cont.employeeID = emp.ID and cont.mi_deleteDate >= '9999-12-31' )`}
from ac_address ad
 ${sqlDialect.limit} )` },
      address: { field: `(select ${sqlDialect.top}  
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT '+' + uben.name + ' ' + ad.address
from ac_address ad  
join ubm_enum uben on uben.eGroup = 'AC_ADDRESS_EMPTYPE' and uben.mi_deleteDate >= '9999-12-31' and uben.code = ad.addressType  
where ad.ownerID = emp.ID and ad.mi_deleteDate >= '9999-12-31' 
 
FOR XML PATH ('')), 1, 1, '' )`
    : `(SELECT STRING_AGG(CONCAT(uben.name, ' ', ad.address), '+') from ac_address ad  
join ubm_enum uben on uben.eGroup = 'AC_ADDRESS_EMPTYPE' and uben.mi_deleteDate >= '9999-12-31' and uben.code = ad.addressType  
where ad.ownerID = emp.ID and ad.mi_deleteDate >= '9999-12-31' )`}
from ac_address ad
 ${sqlDialect.limit} )` },
      contact: { field: `(select ${sqlDialect.top}  
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT '+' + ct.name + ' ' + cont.value
from hr_employeeContact cont  
join cdn_contacttype ct on cont.contactTypeID = ct.ID and ct.mi_deleteDate >= '9999-12-31' and ct.code <> 'email'  
where cont.employeeID = emp.ID and cont.mi_deleteDate >= '9999-12-31' 
FOR XML PATH ('')), 1, 1, '' )`
    : `(SELECT STRING_AGG(CONCAT(ct.name, ' ', cont.value), '+') from hr_employeeContact cont  
join cdn_contacttype ct on cont.contactTypeID = ct.ID and ct.mi_deleteDate >= '9999-12-31' and ct.code <> 'email'  
where cont.employeeID = emp.ID and cont.mi_deleteDate >= '9999-12-31' )`}
from ac_address ad
 ${sqlDialect.limit} )` },
      taxCode: { field: 'emp.taxCode' },
      documents: { field: `(select ${sqlDialect.top}
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `STUFF((SELECT ';' + d.description from hr_employeeDocs d  where d.employeeID = emp.ID AND d.dictDocKindID IN (${docKindIDs}) and d.mi_deleteDate >= '9999-12-31' 
FOR XML PATH ('')), 1, 1, '' )`
    : `(SELECT string_agg(d.description, ';') from hr_employeeDocs d where d.employeeID = emp.ID AND d.dictDocKindID IN (${docKindIDs})and d.mi_deleteDate >= '9999-12-31')`
} from hr_employeeDocs ${sqlDialect.limit} )` }
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
  sqlBuilder.clauses.whereParams.positionCategory = ctx.mParams.positionCategory
  sqlBuilder.clauses.whereParams.workPlace = ctx.mParams.workPlace
  sqlBuilder.clauses.whereParams.dateFrom = ctx.mParams.dateFrom
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY fullFIO'

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
  const depClause = staffService.getDepartmentClause(mParams.departmentID, mParams.includeChildDepts)
  const orgClause = staffService.getOrganizationClause(mParams.organizationID, mParams.includeChildOrgs)
  const psCatWhereClause = mParams.psCategory ? ` and ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'psCategory')} = '${mParams.psCategory}'` : ''
  const posCatWhereClause = mParams.positionCategory ? ` and ${staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'positionCategory')} = '${mParams.positionCategory}'` : ''
  const byWorkPlace = mParams.workPlace ? ` and ep.workPlace in (${mParams.workPlace.replace(/"/g, "'")})` : ''

  const whereClause = ` ep.isActive = 1  
    and ep.mi_deleteDate >= '9999-12-31' 
    and en.mi_deleteDate >= '9999-12-31'
    and :dateFrom: between en.dateFrom and en.dateTo
    and :dateFrom: between ep.dateFrom and ep.dateTo
    ${orgClause}
    ${depClause}     
    ${psCatWhereClause}
    ${posCatWhereClause}
    ${byWorkPlace}
   `
  return whereClause
}
