const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setAttrs (ctx) {
  const execParams = ctx.mParams.execParams
  let addressEmpType = execParams.addressEmpType
  if (addressEmpType) {
    execParams.addressType = addressEmpType
  }
}

function beforeInsert (ctx) {
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  setAttrs(ctx)
}
