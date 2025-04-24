const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const ebs = require('../AC/modules/entityServices/entityBaseService.js')
// const dateService = require('../AC/modules/dataServices/dateService')

me.entity.addMethod('restoreFromFix')
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.restoreFromFix = ctx => {
  const { mParams } = ctx
  if (!mParams.ID) {
    return
  }
  let fix = UB.Repository(__entityName).attrs('employeeID', 'descriptionExperience').selectById(mParams.ID)
  let data = JSON.parse(fix.descriptionExperience)
  const store = UB.DataStore('hr_employeeExperience')
  UB.Repository('hr_employeeExperience')
    .attrs(['ID'])
    .where('employeeID', '=', fix.employeeID)
    .selectAsObject().forEach(item => {
      store.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    })
  data.forEach(item => {
    if (item.calcDate) {
      store.run('insert', {
        execParams: {
          dictExperienceID: item.dictExperienceID,
          employeeID: fix.employeeID,
          calcDate: item.calcDate,
          isFromWorkbook: item.isFromWorkbook
        }
      })
    }
  })
}

function setReasonDoc (ctx) {
  const { execParams } = ctx.mParams
  if (execParams.reason === undefined && execParams.orderFixExperienceNum === undefined && execParams.orderFixExperienceDate === undefined) {
    return
  }
  const parts = ebs.getCompositeAttributeValue(ctx, 'reasonDoc', ['reason', 'orderFixExperienceNum', 'orderFixExperienceDate'], '^', true).split('^')
  execParams.reasonDoc = `${(parts[0] || '')}  №  ${parts[1] || ''}`
  if (parts[2]) {
    execParams.reasonDoc += UB.i18n(` від {0}`, parts[2])
  }
}

function afterInsert (ctx) {
/*
  const execParams = ctx.mParams.execParams
  const data = UB.Repository(__entityName)
    .attrs(['ID'])
    .where('employeeID', '=', execParams.employeeID)
    .where('expOnDate', '=', execParams.expOnDate)
    .where('ID', '<>', execParams.ID)
    .selectSingle()
  if (data) {
    throw new UB.UBAbort('<<<${UB.i18n('Стаж на дату вже зафіксований')}>>>')
  }
*/
}

function beforeInsert (ctx) {
  let execParams = ctx.mParams.execParams
  execParams.organizationName = UB.Repository('hr_organization')
    .attrs('name')
    .where('mi_data_id', '=', execParams.organizationID)
    .misc({ __mip_ondate: execParams.dateFixExperience })
    .selectSingle().name
  setReasonDoc(ctx)
}

function beforeUpdate (ctx) {
  // const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  setReasonDoc(ctx)
}

function beforeDelete (ctx) {
  // const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
}
