const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('exportDataPosContestAll')
me.entity.addMethod('exportDataPosContestPub')
me.entity.addMethod('importData')

me.exportDataPosContestAll = function () {}
me.exportDataPosContestPub = function () {}
me.importData = function () {}
