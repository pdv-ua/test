const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const selectService = require('../AC/modules/dataServices/selectService')

me.on('insert:before', validateDefault)
me.on('update:before', validateDefault)

me.entity.addMethod('selectByOrg')

function validateDefault (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.isDefault || instanceData.isDefault) {
    if (execParams.isDefault) {
      const treePath = UB.Repository('hr_organization')
        .attrs('mi_treePath')
        .where('mi_data_id', '=', execParams.organizationID || instanceData.organizationID)
        .where('state', '=', 'ACTIVE')
        .limit(1)
        .selectScalar()
      if (treePath) {
        const subOrg = UB.Repository('hr_payOut').attrs('ID')
          .where('organizationID', '<>', execParams.organizationID || instanceData.organizationID)
          .where('organizationID', 'in', treePath.split('/').map(o => Number(o)))
          .where('subOrg', '=', 1)
          .where('isDefault', '=', 1)
          .limit(1)
          .selectScalar()
        if (subOrg) {
          throw new UB.UBAbort(`<<<${UB.i18n('Основний шаблон для виплати зарплати вже існує і належить іншій організації! Цей шаблон не може бути основним!')}>>>`)
        }
      }
    }
    const defaultPayOut = UB.Repository(__entityName)
      .attrs(['ID'])
      .where('ID', '!=', execParams.ID)
      .where('organizationID', '=', execParams.organizationID || instanceData.organizationID)
      .where('isDefault', '=', 1)
      .selectSingle()
    if (defaultPayOut) {
      const store = UB.DataStore(__entityName)
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: defaultPayOut.ID,
          isDefault: 0
        }
      })
    }
  }
}

me.selectByOrg = function (ctx) {
  let runsql
  let sqlBuilder = {

    text:
      ` SELECT {0} {1}
    FROM hr_payOut po 
    LEFT JOIN ac_orgAccount oa ON oa.ID = po.orgAccountID
    LEFT JOIN ac_contractor c ON c.ID = po.contractorID
    LEFT JOIN ac_contrAccount ca ON ca.ID = po.contrAccountID
    {2} {3} {4}
    `,
    clauses: {},
    aliases: {
      ID: { field: 'po.ID' },
      name: { field: 'po.name' },
      subOrg: { field: 'po.subOrg' },
      isDefault: { field: 'po.isDefault' },
      organizationID: { field: 'po.organizationID' },
      'orgAccountID.code': { field: 'oa.code' },
      'contractorID.name': { field: 'c.name' },
      'contrAccountID.code': { field: 'ca.code' },
      mi_modifyDate: { field: 'po.mi_modifyDate' }
    },
    params: {}
  }
  const orgID = (ctx.mParams.whereList && ctx.mParams.whereList.organizationID && ctx.mParams.whereList.organizationID.value) || 0
  delete ctx.mParams.whereList.organizationID
  const treePath = UB.Repository('hr_organization')
    .attrs('mi_treePath')
    .where('mi_data_id', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectScalar()
  const payOutIDs = UB.Repository('hr_payOut')
    .attrs(['ID'])
    .where('organizationID', 'equal', orgID, 'org')
    .where('subOrg', 'equal', 1, 'sub')
    .where('organizationID', 'in', treePath ? treePath.split('/').map(o => Number(o)) : [orgID], 'parent')
    .logic('([org] OR ([parent] AND [sub]))')
    .selectAsObject().map(o => o.ID)


  sqlBuilder.clauses = selectService.getClauses(ctx,
    sqlBuilder.params,
    sqlBuilder.aliases,
    `po.ID${entityBaseService.getInExpression('payOutIDs')}`,
    '',
    true)
  sqlBuilder.clauses.whereParams.payOutIDs = payOutIDs.length ? payOutIDs : [0]
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
