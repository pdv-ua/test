const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const entityService = require('../HR/modules/entityService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.entity.addMethod('copyRecord')
me.entity.addMethod('deleteRecord')

function beforeInsert (ctx) {
  entityService.setAttrs(ctx)
  if (!ctx.mParams.isCloneInstance) {
    checkCrossRecord(ctx.mParams.execParams)
  }
}

function beforeUpdate (ctx) {
  entityService.setAttrs(ctx)
  checkCrossRecord(Object.assign({}, JSON.parse(ctx.dataStore.asJSONObject)[0] || {}, ctx.mParams.execParams))
}

function checkCrossRecord (data) {
  // const found = UB.Repository('trf_dictAccrualDt')
  //   .attrs('ID')
  //   .where('dictAccrualID', '=', data.dictAccrualID)
  //   .where('orgID', '=', data.orgID || null)
  //   .where('dictPositionID', '=', data.dictPositionID || null)
  //   .where('dictQualificationID', '=', data.dictQualificationID || null)
  //   .where('dictSubjectID', '=', data.dictSubjectID || null)
  //   // .where('calcRuleID', '=', data.calcRuleID || null)
  //   .where('dictPupilID', '=', data.dictPupilID || null)
  //   // .where('maxRate', '=', data.maxRate || null)
  //   .where('dateFrom', '<=', data.dateTo ? dateService.shiftDate(data.dateTo) : dateService.maxDate())
  //   .where('dateTo', '>=', data.dateFrom ? dateService.shiftDate(data.dateFrom) : dateService.minDate())
  //   .where('ID', '!=', data.ID)
  //   .selectSingle()
  // if (found) throw new UB.UBAbort(`<<<Період дії правила перетинається з іншим правилом. Виправіть період дії або видаліть запис>>>`)
}
me.copyRecord = function (ctx) {
  const params = ctx.mParams
  const cloneValue = params.exectParams
  const store = UB.DataStore(__entityName)
  const newDocID = store.generateID()
  entityBaseService.cloneInstance(__entityName, params.ID, {
    ID: newDocID,
    dateFromEmpty: cloneValue.dateFromEmpty,
    dateToEmpty: cloneValue.dateToEmpty,
    dictAccrualID: cloneValue.dictAccrualID,
    maxRate: cloneValue.maxRate,
    orgID: cloneValue.orgID,
    rate: cloneValue.rate
  })
  ctx.mParams.newID = newDocID
}

me.deleteRecord = function (ctx) {
  const { params } = ctx.mParams
  let store = UB.DataStore(params.entityName)
  if (params.safe) {
    const record = UB.Repository('hr_payEl').attrs(['ID', 'mi_modifyDate']).selectById(params.ID)
    if (record) {
      store.run('delete', {
        execParams: {
          ID: params.ID,
          mi_modifyDate: record.mi_modifyDate
        }
      })
    }
  } else {
    try {
      store.execSQL(`delete from trf_dictAccrualDt where ID = :ID:`, { ID: params.ID })
    } catch (e) {
      throw new UB.UBAbort(`<<<Видалення не виконано. ${e.toString()}>>>`)
    }
  }
}
