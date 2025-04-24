const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const searchResultPrint = require('./modules/printForm/searchResultPrint')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')
me.entity.addMethod('runResultReport')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const isMsSql = entityBaseService.isMsSql()
  let runsql
  let sqlBuilder = {
    text: `WITH addr AS (
        select a.ownerID, a.address
        from ac_address a
        where a.mi_deleteDate >= '9999-12-31'
          and a.addressType = '1'
      ),
      benefits AS ( 
        select eb.employeeID, bk.name
        from hr_employeeBenefits eb
          inner join hr_dictBenefitsKind bk on bk.ID = eb.dictBenefitsKindID
            and bk.mi_deleteDate >= '9999-12-31'
        where eb.mi_deleteDate >= '9999-12-31'
      ),
      bonuses AS ( 
        select eb.employeeID, db.name
        from hr_employeeBonus eb
          inner join hr_dictBonus db on db.ID = eb.dictBonusID
            and db.mi_deleteDate >= '9999-12-31'
        where eb.mi_deleteDate >= '9999-12-31'
      ),
      penalties AS ( 
        select ep.employeeID, dp.name
        from hr_employeePenalty ep
          inner join hr_dictPenalty dp on dp.ID = ep.dictPenaltyID
            and dp.mi_deleteDate >= '9999-12-31'
        where ep.mi_deleteDate >= '9999-12-31'
          and ep.dateClosed is null
      ),
      languages AS (
        select el.employeeID, dl.name, dll.level as lvl
        from hr_employeeLanguage el
          inner join hr_dictLanguage dl on dl.ID = el.dictLanguageID
            and dl.mi_deleteDate >= '9999-12-31'
          left join hr_dictLanguageLevel dll on dll.ID = el.dictLanguageLevelID
            and dl.mi_deleteDate >= '9999-12-31'
        where el.mi_deleteDate >= '9999-12-31'
      ),
      science AS ( 
        select ers.employeeID, dd.name, db.name as branch
        from hr_empRangeScience ers
          inner join hr_dictDegree dd on dd.ID = ers.dictDegreeID
            and dd.mi_deleteDate >= '9999-12-31'
          inner join hr_dictBranchScience db on db.ID = ers.dictBranchScienceID
            and db.mi_deleteDate >= '9999-12-31'
        where ers.mi_deleteDate >= '9999-12-31'
      ),
      addinfo AS (
        select ei.employeeID, da.name, ei.strAddInform
        from hr_empAddInform ei
          inner join hr_dictAddInfKind da on da.ID = ei.dictAddInfKindID
            and da.mi_deleteDate >= '9999-12-31'
        where ei.mi_deleteDate >= '9999-12-31'
      )     
    SELECT {0} {1}
    FROM hr_employee emp
      LEFT JOIN hr_dictMaritalStatusKind mStatus ON mStatus.ID = emp.dictMaritalStatusKindID
    {2}
    {3}
    {4}`,
    clauses: {},
    aliases: {
      employeeID: { field: 'emp.ID' },
      employeeName: { field: 'emp.shortFIO' },
      addr: { field: `${isMsSql
        ? `STUFF((select ', ' + a.address from addr a where a.ownerID = emp.ID FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(a.address, ', ') from addr a where a.ownerID = emp.ID)`}` },
      age: { field: staffService.getEmpAgeSql() },
      familyState: { field: 'mStatus.name' },
      benefits: { field: `${isMsSql
        ? `STUFF((select ', ' + b.name from benefits b where b.employeeID = emp.ID order by b.name FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(b.name, ', ') from benefits b where b.employeeID = emp.ID)`}` },
      bonuses: { field: `${isMsSql
        ? `STUFF((select ', ' + b.name from bonuses b where b.employeeID = emp.ID order by b.name FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(b.name, ', ') from bonuses b where b.employeeID = emp.ID)`}` },
      penalties: { field: `${isMsSql
        ? `STUFF((select ', ' + p.name from penalties p where p.employeeID = emp.ID order by p.name FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(p.name, ', ') from penalties p where p.employeeID = emp.ID)`}` },
      languages: { field: `${isMsSql
        ? `STUFF((select ', ' + l.name + case when len (l.lvl) > 0 then ' ' + l.lvl else '' end from languages l where l.employeeID = emp.ID order by l.name FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(CONCAT(l.name, case when length(l.lvl) > 0 then CONCAT(' ', l.lvl) else '' end), ', ') from languages l where l.employeeID = emp.ID)`}` },
      science: { field: `${isMsSql
        ? `STUFF((select ', ' + s.name + ' (' + s.branch + ')' from science s where s.employeeID = emp.ID order by s.name FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(CONCAT(s.name, ' (', s.branch, ')'), ', ') from science s where s.employeeID = emp.ID)`}` },
      addInfo: { field: `${isMsSql
        ? `STUFF((select ', ' + ai.name + case when len (ai.strAddInform) > 0 then ' - ' + ai.strAddInform else '' end from addinfo ai where ai.employeeID = emp.ID order by ai.name FOR XML PATH('')), 1, 1, '')`
        : `(SELECT STRING_AGG(CONCAT(ai.name, case when length(ai.strAddInform) > 0 then CONCAT(' - ', ai.strAddInform) else '' end), ', ') from addinfo ai where ai.employeeID = emp.ID)`}` }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams),
    '',
    true)
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.shortFIO'

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

me.getWhereClause = function (mParams) {
  let whereClause = `emp.mi_deleteDate >= '9999-12-31'
    and emp.ID in (${mParams.empIDs || 0})`
  return whereClause
}

me.runResultReport = function (ctx) {
  const requestParams = ctx.mParams
  const result = searchResultPrint.getXlsx(JSON.parse(requestParams.params))
  requestParams.resp = JSON.stringify(generateBase64Str(result))
}
