const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const selectService = require('../AC/modules/dataServices/selectService')

me.entity.addMethod('select4user')
me.entity.addMethod('beforedelete')
me.entity.addMethod('beforeupdate')

me.select4user = function (ctx) {
  let mParams = ctx.mParams
  let sql = `SELECT {0} 
    {1} 
  FROM (SELECT * FROM hr_searchTemplate t1 
        WHERE {2} 
          AND COALESCE(t1.isGlobal,0) = 0 
      UNION ALL 
      SELECT * FROM hr_searchTemplate t2 
        WHERE t2.isGlobal = 1 
        ) t 
    INNER JOIN uba_user u ON u.id = t.mi_owner 
    {3} 
    {4} 
    {5}`
  let currentUserClause = UB.format('t1.mi_owner = {0}', UB.Session.uData.userID)
  let orderClause = 't.name'
  let runsql
  let params = {}
  let clauses
  let aliases = {
    'ID': {
      field: 't.ID'
    },
    'code': {
      field: 't.code',
      fieldwhere: 't.code'
    },
    'name': {
      field: 't.name',
      fieldwhere: 't.name'
    },
    'description_text': {
      field: 't.description_text',
      fieldwhere: 't.description_text'
    },
    'template': {
      field: 't.template'
    },
    'isGlobal': {
      field: 't.isGlobal',
      fieldwhere: 't.isGlobal'
    },
    'mi_owner.name': {
      field: 'u.name',
      fieldwhere: 'u.name'
    },
    'mi_modifyDate': {
      field: 't.mi_modifyDate'
    },
    'searchEntity': {
      field: 't.searchEntity',
      fieldwhere: 't.searchEntity'
    }
  }
  clauses = selectService.getClauses(ctx, params, aliases, '', orderClause, true)
  runsql = UB.format(sql, clauses.limitClause, clauses.fieldList, currentUserClause, clauses.whereClause,
    clauses.orderClause, clauses.maxLimitClause)
  mParams.runsql = runsql
  mParams.whereParams = clauses.whereParams
  ctx.dataStore.runSQL(mParams.runsql, mParams.whereParams)
  ctx.inherite = false
  return true
}

me.checkUser = function (ctx, msg) {
  let mParams = ctx.mParams
  let execParams = mParams.execParams
  let rec = UB.Repository('hr_searchTemplate')
    .attrs(['mi_owner'])
    .where('ID', '=', execParams.ID)
    .selectSingle()
  if (rec && rec.mi_owner !== UB.Session.uData.userID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Помилка')}: ${msg}')}>>>`)
  }
}

me.beforedelete = function (ctx) {
  me.checkUser(ctx, 'Неможливо видалити шаблон, бо він створений іншим користувачем')
}

me.beforeupdate = function (ctx) {
  me.checkUser(ctx, 'Неможливо замінити шаблон, бо він створений іншим користувачем')
}
