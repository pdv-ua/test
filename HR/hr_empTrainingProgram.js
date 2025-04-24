const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')
const staffService = require('./modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.entity.addMethod('copyRecord')
me.entity.addMethod('selectDataByID')

function formSqlBuilder (ctx) {
  const sqlDialect = entityBaseService.getSQLDialect()
  const sqlBuilder = {
    text: `
      select {0} {1}
      FROM hr_empTrainingProgram et
JOIN hr_employeeNumber en on et.employeeNumberID = en.ID and en.mi_deleteDate >= '9999-12-31'
JOIN hr_employee emp on en.employeeID = emp.ID and emp.mi_deleteDate >= '9999-12-31'  
      {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      employeeName: { field: 'emp.fullFIO' },
      orgName: { field: staffService.getOrgFldOnDateSql(':onDate:', 'et.organizationID', 'name') },
      positionName: { field: staffService.getPosFldOnDateSql(':onDate:', 'et.positionID', 'name', 'null') },
      departmentName: { field: staffService.getDepFldOnDateSql(':onDate:', 'et.departmentID', 'name') },
      departmentID: { field: 'et.departmentID' },
      structDepName: { field: `${sqlDialect.scheme}depStructName2(et.departmentID, :onDate:, en.orgID, (select ${sqlDialect.top} pos.mi_dateTo from hr_position pos where pos.mi_data_id = et.positionID and pos.state = 'ACTIVE' AND pos.mi_deleteDate >= '9999-12-31' order by pos.mi_dateTo desc ${sqlDialect.limit}))` },
      psCategory: { field: staffService.getPosFldOnDateSql(':onDate:', 'et.positionID', 'psCategory', 'null') }
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
  sqlBuilder.clauses.whereParams.trainingID = ctx.mParams.trainingID

  return sqlBuilder
}

me.selectDataByID = function (ctx) {
  const sqlBuilder = formSqlBuilder(ctx)
  const runsql = UB.format(sqlBuilder.text,
    sqlBuilder.clauses.limitClause,
    sqlBuilder.clauses.fieldList,
    sqlBuilder.clauses.whereClause,
    sqlBuilder.clauses.orderClause,
    sqlBuilder.clauses.maxLimitClause)

  const empTP = UB.DataStore('hr_empTrainingProgram')
  empTP.runSQL(runsql, sqlBuilder.clauses.whereParams)

  const emps = JSON.parse(empTP.asJSONObject)
  ctx.mParams.resultData = JSON.stringify(emps)
}

me.getWhereClause = function () {
  return ` et.ID = :trainingID: and et.mi_deleteDate >= '9999-12-31' `
}

me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const store = UB.DataStore(__entityName)
  const newID = store.generateID()
  entityBaseService.cloneInstance(__entityName, params.ID, {
    ID: newID
  })
  const empTrainingProgram = UB.Repository('hr_empTrainingProgramDet')
    .attrs(['ID'])
    .where('empTrainingProgramID', '=', params.ID)
    .selectAsObject()
  empTrainingProgram.forEach(row => {
    entityBaseService.cloneInstance('hr_empTrainingProgramDet', row.ID, {
      empTrainingProgramID: newID
    })
  })
  ctx.mParams.newID = newID
}
