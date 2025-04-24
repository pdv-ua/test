const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const employeeAuditPrint = require('../HR/modules/printForm/employeeAuditPrint')

me.entity.addMethod('docPrintForm')

me.docPrintForm = function (ctx) {
  let mParams = ctx.mParams
  mParams.docs = employeeAuditPrint.getDocx(mParams.params)
}
