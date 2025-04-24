const UB = require('@unitybase/ub')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const dateService = require('../../AC/modules/dataServices/dateService')

module.exports = {
  setAttrs,
  checkPeriod,
  getFieldSize,
  fixLineBreaks,
  removeExtraChars
}

/**
 * @param {ubMethodParams} ctx
 * @param {Boolean} [checkDate=true]
 * @param {object} [previousValues] Instance values BEFORE insert/update operation. Can de passed by caller to prevent
 *   multiple `JSON.parse(ctx.dataStore.asJSONObject)[0]` calls
 */
function setAttrs (ctx, checkDate = true, previousValues, setCompositeValue = true) {
  const execParams = ctx.mParams.execParams
  const instanceData = previousValues === undefined ? (JSON.parse(ctx.dataStore.asJSONObject)[0] || {}) : previousValues
  const entity = ctx.dataStore.entity
  if (setCompositeValue) {
    if (entity.attributes.description && entity.attributes.description.customSettings &&
      entity.attributes.description.customSettings.compositeFields) {
      execParams.description = entityBaseService.getCompositeAttributeValue(ctx, 'description')
    }
    if (entity.attributes.caption && entity.attributes.caption.customSettings &&
      entity.attributes.caption.customSettings.compositeFields) {
      execParams.caption = entityBaseService.getCompositeAttributeValue(ctx, 'caption')
    }
  }
  const dateFromAttr = entity.attributes.mi_dateFrom ? 'mi_dateFrom' : 'dateFrom'
  const dateToAttr = entity.attributes.mi_dateTo ? 'mi_dateTo' : 'dateTo'
  if (entity.attributes.dateToEmpty) {
    if (execParams.dateToEmpty !== undefined) {
      if (!execParams.dateToEmpty) {
        execParams[dateToAttr] = dateService.maxDate()
      } else {
        execParams[dateToAttr] = execParams.dateToEmpty
      }
    } else {
      if (ctx.mParams.method === 'insert') {
        execParams[dateToAttr] = dateService.maxDate()
      }
    }
  }
  if (entity.attributes.dateFromEmpty) {
    if (execParams.dateFromEmpty !== undefined) {
      if (!execParams.dateFromEmpty) {
        execParams[dateFromAttr] = dateService.minDate()
      } else {
        execParams[dateFromAttr] = execParams.dateFromEmpty
      }
    } else {
      if (ctx.mParams.method === 'insert') {
        execParams[dateFromAttr] = dateService.minDate()
      }
    }
  }
  let isAdmin = entityBaseService.userIsMemberOf({ roleNames: ['admin'] })
  if (entity.attributes.dateTo) {
    if ((!execParams.dateTo && !instanceData.dateTo) || execParams.dateTo === null) {
      execParams.dateTo = dateService.maxDate()
    }
    if (checkDate && new Date(execParams.dateFrom || instanceData.dateFrom) > new Date(execParams.dateTo || instanceData.dateTo)) {
      const errorMsg = getEntityData(entity, execParams, instanceData)
      throw new UB.UBAbort(`<<<${UB.i18n('{0}Дата початку дії {1} не може бути більшою за дату закінчення дії {2}', errorMsg, dateService.formatDate(execParams.dateFrom || instanceData.dateFrom), dateService.formatDate(execParams.dateTo || instanceData.dateTo))} (${isAdmin ? ctx.dataStore.entity.code : ''} ${isAdmin ? execParams.ID : ''})>>>`)
    }
  }
  if (entity.attributes.mi_dateTo) {
    if ((!execParams.mi_dateTo && !instanceData.mi_dateTo) || execParams.mi_dateTo === null) {
      execParams.mi_dateTo = dateService.maxDate()
    }
    if (checkDate && new Date(execParams.mi_dateFrom || instanceData.mi_dateFrom) > new Date(execParams.mi_dateTo || instanceData.mi_dateTo)) {
      const errorMsg = getEntityData(entity, execParams, instanceData)
      throw new UB.UBAbort(`<<<${UB.i18n('{0}Дата початку дії {1} не може бути більшою за дату закінчення дії {2}', errorMsg, dateService.formatDate(execParams.mi_dateFrom || instanceData.mi_dateFrom), dateService.formatDate(execParams.mi_dateTo || instanceData.mi_dateTo))} (${isAdmin ? ctx.dataStore.entity.code : ''} ${isAdmin ? execParams.ID : ''})>>>`)
    }
  }
}

function getEntityData (entity, execParams, instanceData) {
  const data = []
  const entityCaption = entity.caption || entity.description
  if (entityCaption) {
    data.push(entityCaption)
  }
  if (entity.attributes.employeePositionID && (execParams.employeePositionID || instanceData.employeePositionID)) {
    const employeePosition = UB.Repository('hr_employeePosition').attrs('description').selectById(execParams.employeePositionID || instanceData.employeePositionID)
    employeePosition && data.push(employeePosition.description)
  } else if (entity.attributes.employeeNumberID && (execParams.employeeNumberID || instanceData.employeeNumberID)) {
    const employeeNumber = UB.Repository('hr_employeeNumber').attrs('description').selectById(execParams.employeeNumberID || instanceData.employeeNumberID)
    employeeNumber && data.push(employeeNumber.description)
  } else if (entity.attributes.employeeID && (execParams.employeeID || instanceData.employeeID)) {
    const employee = UB.Repository('hr_employee').attrs('fullFIO').selectById(execParams.employeeID || instanceData.employeeID)
    employee && data.push(employee.description)
  }
  if (entity.attributes.description && (execParams.description || instanceData.description)) {
    data.push(execParams.description || instanceData.description)
  }
  return (data.length ? data.join('. ') + '. ' : '')
}

/**
 * @param {ubMethodParams} ctx
 * @param {object} [previousValues] Instance values BEFORE insert/update operation. Can de passed by caller to prevent
 *   multiple `JSON.parse(ctx.dataStore.asJSONObject)[0]` calls
 */
function checkPeriod (ctx, previousValues) {
  const execParams = ctx.mParams.execParams
  const instanceData = previousValues === undefined ? (JSON.parse(ctx.dataStore.asJSONObject)[0] || {}) : previousValues
  const entity = ctx.dataStore.entity
  const isAdmin = entityBaseService.userIsMemberOf({ roleNames: ['admin'] })

  if (entity.attributes.dateTo) {
    if (new Date(execParams.dateFrom || instanceData.dateFrom) > new Date(execParams.dateTo || instanceData.dateTo)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата початку дії не може бути більшою за дату закінчення дії')}>>>`)
    }
  }
  if (entity.attributes.mi_dateTo) {
    if (new Date(execParams.mi_dateFrom || instanceData.mi_dateFrom) > new Date(execParams.mi_dateTo || instanceData.mi_dateTo)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата початку дії не може бути більшою за дату закінчення дії')} (${isAdmin ? ctx.dataStore.entity.code : ''} ${isAdmin ? execParams.ID : ''})>>>`)
    }
  }
}

function getFieldSize (dataStore, fieldName) {
  const entity = dataStore.entity
  if (entity.attributes[fieldName]) {
    return entity.attributes[fieldName].size
  }
}

/**
 * @param {ubMethodParams} ctx
 * @param {Array} [attrs]
 * @param {String} newSubStr
 */
function fixLineBreaks (ctx, attrs = [], newSubStr = ' ') {
  const execParams = ctx.mParams.execParams
  attrs.forEach(attr => {
    if (execParams[attr]) {
      const value = String(execParams[attr])
      execParams[attr] = value.replace(/(\r\n|\r|\n)/g, newSubStr).trim()
    }
  })
}

/**
 * @param {ubMethodParams} ctx
 * @param {Array} [attrs]
 * @param {String} newSubStr
 */
function removeExtraChars (ctx, attrs = [], newSubStr = '') {
  const execParams = ctx.mParams.execParams
  attrs.forEach(attr => {
    if (execParams[attr]) {
      const value = String(execParams[attr])
      if (!value.match(/(\r|\n)/g)) {
        // eslint-disable-next-line no-control-regex
        execParams[attr] = value.replace(/[\x01-\x1F]/g, newSubStr)
      }
    }
  })
}
