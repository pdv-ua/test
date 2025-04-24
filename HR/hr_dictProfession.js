const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
/*
const UB = require('@unitybase/ub')
const App = UB.App
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
*/
const ebs = require('../AC/modules/entityServices/entityBaseService')

me.on('update:before', ctx => {
  ebs.setDateTo(ctx)
})
me.on('insert:before', ctx => {
  ctx.mParams.method = 'insert'
  ebs.setDateTo(ctx)
  let execParams = ctx.mParams.execParams
  if (!execParams.addName) {
    execParams.addName = execParams.name
  }
})
