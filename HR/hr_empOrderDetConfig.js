const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('loadDefaultConfig')

me.loadDefaultConfig = function (ctx) {
  const execParams = ctx.mParams.execParams
  if (execParams.organizationID) {
    const store = UB.DataStore(__entityName)
    const curConfig = UB.Repository(__entityName)
      .attrs(['ID'])
      .where('organizationID', '=', execParams.organizationID)
      .selectAsObject()
    curConfig.forEach(item => {
      store.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
    const defConfig = UB.Repository(__entityName)
      .attrs(['*'])
      .where('organizationID', 'isNull')
      .selectAsObject()
    defConfig.forEach(item => {
      store.run('insert', {
        execParams: {
          organizationID: execParams.organizationID,
          empOrderType: item.empOrderType,
          positionType: item.positionType,
          dictStaffCatID: item.dictStaffCatID,
          dictTimeCostID: item.dictTimeCostID,
          dictTimeCost2ID: item.dictTimeCost2ID,
          canEditDictTimeCost: item.canEditDictTimeCost,
          canEditDictTimeCost2: item.canEditDictTimeCost2,
          payElIDAccrual: item.payElIDAccrual,
          canEditPayElAccrual: item.canEditPayElAccrual,
          payElIDMain: item.payElIDMain,
          canEditPayElMain: item.canEditPayElMain,
          payElIDAdd: item.payElIDAdd,
          canEditPayElAdd: item.canEditPayElAdd,
          payElIDReplacement: item.payElIDReplacement,
          canEditPayElReplacement: item.canEditPayElReplacement,
          comment: item.comment,
          showTabNumInPrintForm: item.showTabNumInPrintForm
        }
      })
    })
  }
}
