const UB = require('@unitybase/ub')
const moment = require('moment')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService')
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setDescription (ctx) {
  const execParams = ctx.mParams.execParams
  let parts = ebs.getCompositeAttributeValue(ctx, 'description',
    ['payElID.name', 'departmentID.name', 'dateFrom'], '^', true).split('^')
  execParams.description = UB.i18n(`{0} Вид оплати "{1}" з {2} `, parts[1] ? ('Підрозділ ' + parts[1] + ',') : '', parts[0], moment(parts[2], 'DD.MM.YYYY').format('LL'))
  execParams.title = execParams.description
  if (execParams.payElID) {
    let emp = UB.Repository('hr_empOrderChgSalEmpDet').attrs('ID', 'mi_modifyDate').where('paraID', '=', execParams.ID).selectAsObject()
    let empStore = UB.DataStore('hr_empOrderChgSalEmpDet')
    emp.forEach(item => {
      empStore.run('update', {
        execParams: {
          ID: item.ID,
          payElID: execParams.payElID,
          mi_modifyDate: item.mi_modifyDate
        }
      })
    })
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setDescription(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setDescription(ctx)
}
