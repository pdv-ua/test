const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const currencyService = require('../AC/modules/dataServices/currencyService')

me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.entity.addMethod('calcAvgValue')

function afterInsert (ctx) {
  me.calcAvgValue(ctx)
}

function afterUpdate (ctx) {
  me.calcAvgValue(ctx)
}

me.calcAvgValue = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const empAssessmentID = execParams.empAssessmentID || instanceData.empAssessmentID
  const empAssessmentResultID = UB.Repository('hr_empAssessmentResult')
    .attrs('ID')
    .where('assessmentID', '=', empAssessmentID)
    .selectScalar()
  if (empAssessmentResultID) {
    let empAssessmentTasks = UB.Repository(__entityName)
      .attrs('dictTaskScoreID.score')
      .where('empAssessmentID', '=', empAssessmentID)
      .where('dictTaskScoreID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    let avgValueSum = 0.0
    let avgValueCount = 0
    empAssessmentTasks.forEach(task => {
      avgValueSum += task['dictTaskScoreID.score']
      avgValueCount++
    })
    let avgValue = null
    let assessmentValue = null
    if (avgValueCount > 0) {
      avgValue = currencyService.round(avgValueSum / avgValueCount, 2)
      if (avgValue >= 3.65) {
        assessmentValue = 'PERFECT'
      } else if (avgValue >= 2.5 && avgValue < 3.65) {
        assessmentValue = 'POSITIVE'
      } else {
        assessmentValue = 'NEGATIVE'
      }
    }
    UB.DataStore('hr_empAssessmentResult').run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: empAssessmentResultID,
        avgValue: avgValue,
        assessmentValue: assessmentValue
      }
    })
  }
}
