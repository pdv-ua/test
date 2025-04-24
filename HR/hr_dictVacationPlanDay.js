const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDayCount')

me.getDayCount = function (ctx) {
  let mParams = ctx.mParams
  let dictVacationKindID = mParams.dictVacationKindID
  let positionType = mParams.positionType
  let dictGovernmTypeID = mParams.dictGovernmTypeID
  let dictStaffCatID = mParams.dictStaffCatID
  let dictStaffSubCatID = mParams.dictStaffSubCatID
  let onDate = mParams.onDate || new Date()
  onDate = onDate && new Date(onDate)
  if (dictVacationKindID && onDate) {
    let vacPlanDays = UB.Repository(__entityName)
      .attrs(['positionType', 'dayCount', 'dictGovernmTypeID', 'dictStaffCatID', 'dictStaffSubCatID'])
      .where('dictVacationKindID', '=', dictVacationKindID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
    if (vacPlanDays.length) {
      let vacPlanDayReco
      if (positionType) {
        vacPlanDayReco = vacPlanDays.find(item => item.positionType === positionType)
        if (!vacPlanDayReco) {
          vacPlanDays = vacPlanDays.filter(item => !item.positionType)
          vacPlanDayReco = vacPlanDays.find(item => !item.positionType)
        } else {
          vacPlanDays = vacPlanDays.filter(item => item.positionType === positionType)
        }
      }
      if (dictGovernmTypeID) {
        vacPlanDayReco = vacPlanDays.find(item => item.dictGovernmTypeID === dictGovernmTypeID)
        if (!vacPlanDayReco) {
          vacPlanDayReco = vacPlanDays.find(item => !item.dictGovernmTypeID)
          vacPlanDays = vacPlanDays.filter(item => !item.dictGovernmTypeID)
        } else {
          vacPlanDays = vacPlanDays.filter(item => item.dictGovernmTypeID === dictGovernmTypeID)
        }
      }
      if (dictStaffCatID) {
        vacPlanDayReco = vacPlanDays.find(item => item.dictStaffCatID === dictStaffCatID)
        if (!vacPlanDayReco) {
          vacPlanDayReco = vacPlanDays.find(item => !item.dictStaffCatID)
          vacPlanDays = vacPlanDays.filter(item => !item.dictStaffCatID)
        } else {
          vacPlanDays = vacPlanDays.filter(item => item.dictStaffCatID === dictStaffCatID)
        }
      }
      if (dictStaffSubCatID) {
        vacPlanDayReco = vacPlanDays.find(item => item.dictStaffSubCatID === dictStaffSubCatID)
        if (!vacPlanDayReco) {
          vacPlanDayReco = vacPlanDays.find(item => !item.dictStaffSubCatID)
        }
      }
      if (!vacPlanDayReco) {
        vacPlanDayReco = vacPlanDays.find(item => !item.positionType && !item.dictGovernmTypeID && !item.dictStaffCatID && !item.dictStaffSubCatID)
      }
      mParams.dayCount = (vacPlanDayReco && vacPlanDayReco.dayCount) || 0
    }
  }
}

function setAttr (ctx) {
  const execParams = ctx.mParams.execParams
  let dateTo
  if (execParams.dateToEmpty !== undefined) {
    dateTo = execParams.dateToEmpty
  }
  if (dateTo) {
    execParams.dateTo = dateTo
  } else {
    execParams.dateTo = dateService.maxDate()
  }
}

function beforeInsert (ctx) {
  setAttr(ctx)
}

function beforeUpdate (ctx) {
  setAttr(ctx)
}
