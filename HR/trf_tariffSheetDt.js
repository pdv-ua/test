const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const tarifficationService = require('../HR/modules/tarifficationService')

me.entity.addMethod('getDictTarifCoeff')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function setConditionExist (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if ((!execParams.degreeCondition || execParams.degreeCondition === '3') &&
   (execParams.dictEducationLevelID || (instanceData.dictEducationLevelID && execParams.degreeCondition))) {
    execParams.degreeCondition = '1'
  } else if (execParams.degreeCondition && !execParams.dictEducationLevelID && !instanceData.dictEducationLevelID) {
    execParams.degreeCondition = null
  }
  if ((!execParams.staffSubCatCondition || execParams.staffSubCatCondition === '3') &&
   (execParams.dictStaffSubCatID || (instanceData.dictStaffSubCatID && execParams.staffSubCatCondition))) {
    execParams.staffSubCatCondition = '1'
  } else if (execParams.staffSubCatCondition && !execParams.dictStaffSubCatID && !instanceData.dictStaffSubCatID) {
    execParams.staffSubCatCondition = null
  }
  if ((!execParams.qualificationCondition || execParams.qualificationCondition === '3') &&
  (execParams.dictQualificationID || instanceData.dictQualificationID) && execParams.qualificationCondition) {
    execParams.qualificationCondition = '1'
  } else if (execParams.qualificationCondition && !execParams.dictQualificationID && !instanceData.dictQualificationID) {
    execParams.qualificationCondition = null
  }
}

function checkConditionNull (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const execParams = ctx.mParams.execParams

  if ((execParams.dictEducationLevelID === null && execParams.dictEducationLevelID !== undefined && instanceData.dictEducationLevelID) ||
     (execParams.dictEducationLevelID === undefined && !instanceData.dictEducationLevelID)) {
    execParams.degreeCondition = null
  }
  if ((execParams.dictStaffSubCatID === null && execParams.dictStaffSubCatID !== undefined && instanceData.dictStaffSubCatID) ||
    (execParams.dictStaffSubCatID === undefined && !instanceData.dictStaffSubCatID)) {
    execParams.staffSubCatCondition = null
  }
  if ((execParams.dictQualificationID === null && execParams.dictQualificationID !== undefined && instanceData.dictQualificationID) ||
     (execParams.dictQualificationID === undefined && !instanceData.dictQualificationID)) {
    execParams.qualificationCondition = null
  }
}

function beforeInsert (ctx) {
  setConditionExist(ctx)
}

function beforeUpdate (ctx) {
  setConditionExist(ctx)
  checkConditionNull(ctx)
}

me.getDictTarifCoeff = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  mParams.resultData = JSON.stringify(tarifficationService.getDictTarifCoeff(params))
}
