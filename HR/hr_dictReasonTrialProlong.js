const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
/* global ubs_numcounter */
me.on('insert:before', beforeInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.code) {
    execParams.code = (ubs_numcounter.getRegnum(__entityName)).toString().padStart(3, '0')
  }
}
