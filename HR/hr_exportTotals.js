const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const path = require('path')
const fs = require('fs')
const exp = require('./hr_export')
const expPublicTotals = require('./modules/export/publicTotals')
const exportOrgPrint = require('./modules/printForm/exportOrgPrint')
const { generateBase64Str } = require('../AC/modules/dataServices/filesService')

me.entity.addMethod('fillPublicTotals')
me.entity.addMethod('exportPublicTotals')
me.entity.addMethod('getJsonFile')
me.entity.addMethod('runOrgReport')

me.fillPublicTotals = function (ctx) {
  return expPublicTotals.fillPublicTotals(ctx)
}

me.exportPublicTotals = function (ctx) {
  const mParams = ctx.mParams
  const exportPath = exp.getExportPath()
  const exportFilePath = path.join(exportPath, 'publicTotals.json')
  mParams.resultPath = expPublicTotals.exportPublicTotals(mParams.onDate, exportFilePath)
  return true
}

me.getJsonFile = function (ctx) {
  const mParams = ctx.mParams
  mParams.resultData = fs.readFileSync(mParams.exportPath, 'utf8')
  return true
}

me.runOrgReport = function (ctx) {
  const mParams = ctx.mParams
  const result = exportOrgPrint.getXlsx()
  mParams.data = JSON.stringify(generateBase64Str(result))
}
