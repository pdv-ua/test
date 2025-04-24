const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('search')

me.search = function (ctx) {
  const mParams = ctx.mParams
  const sqlDialect = entityBaseService.getSQLDialect()
  let runsql
  let sqlBuilder = {
    text: ` WITH tree (mi_data_id, parentUnitID, mi_unityEntity, name, levelDep, depName, depID, mi_dateFrom, mi_dateTo)
     AS 
     (
     Select top 100 st.mi_data_id, st.parentUnitID, st.mi_unityEntity, st.name, 0 as levelDep, st.name as depName, st.mi_data_id as depID, st.mi_dateFrom, st.mi_dateTo 
     From hr_staffUnit st 
     Where 
       st.orgID = :orgID:
       and st.mi_unityEntity != 'hr_organization'      
       and st.mi_deleteDate >= '9999-12-31'
       and :onDate: between st.mi_dateFrom and st.mi_dateTo
       and st.state = 'ACTIVE' 
       order by st.mi_dateFrom desc 
     UNION ALL 
     Select t2.mi_data_id, t2.parentUnitID, t2.mi_unityEntity, t2.name, t1.levelDep + 1, depName, depID, t2.mi_dateFrom, t2.mi_dateTo  
     From hr_staffUnit t2 
     join tree t1 On t2.mi_data_id = t1.parentUnitID and t2.mi_unityEntity != 'hr_organization'  
     Where  
       :onDate: between t2.mi_dateFrom and t2.mi_dateTo
       and t2.mi_deleteDate >= '9999-12-31'
       and t2.state = 'ACTIVE'
     ) 
    SELECT DISTINCT {0} {1}
    FROM tree 
      join ( 
      ${sqlDialect.dialect === 'MSSQL2012'
    ? `SELECT top 100 depID, depTree = STUFF( 
      (select '/ ' +  name FROM tree mt1 where mt1.depID = mt2.depID 
      order by mt1.levelDep desc 
      FOR XML PATH ('')), 1, 1, ''
      )`
    : `SELECT depID, depTree = (SELECT STRING_AGG(name, '/ ') FROM tree mt1 where mt1.depID = mt2.depID 
      order by mt1.levelDep desc)`}
      FROM tree mt2
    )as tb on tb.depID = tree.depID 
      RIGHT JOIN hr_employeePosition ep ON ep.departmentID = tree.depID 
      JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID 
      JOIN hr_employee emp on en.employeeID = emp.ID 
      JOIN hr_publServRang ranks on en.employeeID = ranks.employeeID 
      JOIN hr_dictRank rankTypes on rankTypes.ID = ranks.dictRankID

      JOIN hr_employeeEducation ed ON ed.employeeID = emp.ID
      JOIN hr_dictEducationLevel edl ON edl.ID = ed.dictEducationLevelID
           and edl.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_specialty s ON s.ID = ed.dictSpecialtyID
           and s.mi_deleteDate >= '9999-12-31'
      LEFT JOIN hr_dictDegree dd ON dd.ID = ed.dictDegreeID
           and dd.mi_deleteDate >= '9999-12-31'

      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeID: { field: 'en.employeeID' },
      firstName: { field: 'emp.firstName' },
      lastName: { field: 'emp.lastName' },
      middleName: { field: 'emp.middleName' },
      sexType: { field: 'emp.sexType' },
      tabNum: { field: 'en.tabNum', fieldwhere: 'en.tabNum' },
      taxCode: { field: 'emp.taxCode' },
      posCategory: { field: staffService.getPosCatShortNameSql() },
      rankCur: { field: 'rankTypes.name' },
      posName: { field: staffService.getPosFldOnDateSql(':onDate:', 'ep.positionID', 'name') },
      depName: { field: staffService.getDepFldOnDateSql(':onDate:', 'ep.departmentID', 'name') },
      // posName: { field: staffService.getPosNameSql() },
      // depName: { field: 'tree.depName' },
      depTree: { field: 'tb.depTree' },
      depFirst: { field: `(Select ${sqlDialect.top} tree1.name from tree tree1 where tree1.depID = ep.departmentID order by tree1.levelDep desc ${sqlDialect.limit})` },
      dictEducationLevelName: { field: 'edl.name' },
      dictSpecialtyName: { field: 's.name' },
      qualification: { field: 'ed.qualification' },
      dictDegreeName: { field: 'dd.name' },
      docSeries: { field: 'ed.docSeries' },
      docNumber: { field: 'ed.docNumber' },
      dateIssue: { field: 'ed.dateIssue' },
      educationName: { field: 'ed.educationName' }
    },
    params: {}
  }

  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    me.getWhereClause(mParams, sqlDialect),
    '',
    true)
  sqlBuilder.clauses.whereParams.orgID = mParams.orgID
  sqlBuilder.clauses.whereParams.onDate = mParams.onDate
  sqlBuilder.clauses.whereParams.dictEducationLevelID = mParams.dictEducationLevelID
  sqlBuilder.clauses.orderClause = sqlBuilder.clauses.orderClause || 'ORDER BY emp.lastName, emp.firstName, emp.middleName, ed.dateIssue'

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

me.getWhereClause = function (mParams, sqlDialect) {
  let whereClause = ` en.orgID = :orgID: 
    and ed.dateIssue <= :onDate: 
    ${mParams.dictEducationLevelID ? 'and ed.dictEducationLevelID = :dictEducationLevelID:' : ''}
    and ed.mi_deleteDate >= '9999-12-31'
    and ep.mi_deleteDate >= '9999-12-31'       
    and en.mi_deleteDate >= '9999-12-31'
    and ep.dateFrom = (select ${sqlDialect.top} ep2.dateFrom from hr_employeePosition ep2 where ep2.dateTo >= :onDate: and  ep2.dateFrom <= :onDate:
       and ep2.employeeID = emp.ID and ep2.mi_deleteDate >= '9999-12-31' 
       and ep2.organizationID = en.orgID order by ep2.dateFrom desc ${sqlDialect.limit}) 
    and ranks.dateFrom = ( select ${sqlDialect.top} r.dateFrom from hr_publServRang r
      where r.employeeID = ranks.employeeID and r.mi_deleteDate >= '9999-12-31'
      and r.dateFrom <= :onDate:  and r.dateTo >= :onDate: 
      order by r.dateFrom desc ${sqlDialect.limit})
    `
  return whereClause
}
