const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')

me.entity.addMethod('saveSetting')

me.saveSetting = function (ctx) {
  const mParams = ctx.mParams
  const getConstructorReportsSetting = UB.Repository('trf_constructorReportsSetting')
    .attrs(['ID'])
    .where('organizationID', '=', mParams.orgID)
    .where('reportCode', '=', mParams.report)
    .where('mi_deleteDate', '>=', '#maxdate')
    .selectSingle()
  const store = UB.DataStore('trf_constructorReportsSetting')
  if (!getConstructorReportsSetting) {
    store.run('insert', {
      execParams: {
        organizationID: mParams.orgID,
        reportCode: mParams.report,
        params: mParams.execParams
      }
    })
  } else {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: getConstructorReportsSetting.ID,
        params: mParams.execParams
      }
    })
  }
}
