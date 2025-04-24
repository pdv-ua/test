const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const _ = require('lodash')
const moment = require('moment')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const dateService = require('../../AC/modules/dataServices/dateService')
const periodService = require('../../HR/modules/periodService')
const nameCase = require('./nameCase')
const idParamService = require('../../HR/modules/idParamService')
const staffService = require('../../HR/modules/staffService')
const timService = require('../../HR/modules/timService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const nameCaseService = require('./nameCaseService')

/* global ubs_numcounter */
module.exports = {
  saveDetails,
  beforeDeleteOrder,
  checkOrderUpdate,
  getOrderNum,
  setDefaultAttribute,
  setFieldListAttribute,
  getEntityDetail,
  doPostingStaffOrder,
  doCancelPostingStaffOrder,
  doPostingStaffTable,
  doCancelPostingStaffTable,
  doCheckStaffList,
  updateOrganization,
  updateDepartment,
  updatePosition,
  updateEmployee,
  updateProfession,
  updateEmployeeOnStaff,
  setEmpOrderAttrs,
  getEntityByEmpOrderType,
  doPostingChgSalary,
  doCancelPostingChgSalary,
  insertByOrder,
  updateByOrder,
  deleteByOrder,
  createEmployeePosition,
  createRank,
  closeRank,
  closeEmployeePosition,
  cloneEmployeePosition,
  createWorkbookRecord,
  createOrderAccrual,
  closeAccrual,
  checkIsParaOk,
  createActingAccrual,
  deleteOrderActing,
  deleteActingAccrual,
  replaceAccrual,
  createExperience,
  createWorkSched,
  closeEmployeeNumber,
  setTimeSheet,
  restoreDeleted,
  saveOldValues,
  getOldValues,
  restoreOldValues,
  checkAttrs,
  getOrderDescription,
  getEmpOrderDetFields,
  experienceClearStartCalcDateAndFix,
  checkEmployeePositionDate,
  clearMiAttrs,
  saveOrderFundSource,
  copyEmpPosFundSource,
  getEmployeeFactPositionName,
  addNonClosableAccruals,
  tryClosePublServRangsExceptLast,
  postMissionOrder,
  cancelMissionOrderItem
}
function checkEmployeePositionDate ({
  dateFrom,
  dateTo,
  onDate,
  description = '',
  isRaise = false
}) {
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateService.shiftDate(dateTo)
  onDate = dateService.shiftDate(onDate)
  if (!(dateFrom <= onDate && dateTo >= onDate)) {
    if (isRaise) {
      throw new UB.UBAbort(`<<<${UB.i18n('Запис про призначення {0} не актуальний на дату {1}. Необхідно перевибрати працівника в пункті наказу', description, dateService.formatDate(onDate))}>>>`)
    }
    return false
  }
  return true
}

function getEmpOrderDetFields () {
  return ['ID', 'employeeID', 'orderID.orderDate', 'orderID.orderNumber', 'empOrderType', 'mi_unityEntity', 'orderID.description',
    'isGroup', 'organizationID.mi_data_id', 'employeeNumberID', 'orderID', 'paraID', 'orderState', 'paraID.orderState']
}

/**
 * Saves list of details
 * @example
 *
 *    entityBaseService.saveDetails(ctx, [{detailName: 'docExpRepPrep', entityName: 'ac_docExpRepPrepDt', docIDName: 'docExpRepID'}])
 *
 * @param {ubMethodParams} ctx
 * @param {Array<DocumentDetail>} details
 */
function saveDetails (ctx, details, runParams = {}) {
  if (!ctx.mParams.formData) return

  const formData = JSON.parse(ctx.mParams.formData)
  if (!formData.detail) return

  const docID = runParams.docID || ctx.mParams.execParams.ID
  details.forEach(detail => {
    const store = UB.DataStore(detail.entityName)
    const formDataDetail = formData.detail[detail.detailName]
    if (formDataDetail) {
      if (formDataDetail.insert) {
        formDataDetail.insert.forEach((record) => {
          delete record.ID
          delete record.mi_modifyDate
          const params = { [detail.docIDName]: docID }
          if (detail.detIDName && runParams.orderDetID) {
            params[detail.detIDName] = runParams.orderDetID
          }
          if (detail.defaultValue) {
            _.forEach(detail.defaultValue, (value, name) => {
              params[name] = value
            })
          }
          if (detail.JSONAttr) {
            detail.JSONAttr.forEach(attrName => {
              if (record[attrName] && typeof record[attrName] !== 'string') {
                record[attrName] = JSON.stringify(record[attrName])
              }
            })
          }
          store.run('insert', Object.assign({
            __skipRls: !!detail.skipRls,
            execParams: _.extend(record, params)
          }, runParams))
        })
      }
      if (formDataDetail.update) {
        formDataDetail.update.forEach((record) => {
          let isUpdate = !runParams.checkExist
          if (runParams.checkExist) {
            isUpdate = UB.Repository(detail.entityName).attrs(['ID']).selectById(record.ID)
          }
          if (isUpdate) {
            if (detail.JSONAttr) {
              detail.JSONAttr.forEach(attrName => {
                if (record[attrName] && typeof record[attrName] !== 'string') {
                  record[attrName] = JSON.stringify(record[attrName])
                }
              })
            }
            store.run('update', Object.assign({
              __skipRls: !!detail.skipRls,
              execParams: record
            }, runParams))
          }
        })
      }
      if (formDataDetail.del) {
        formDataDetail.del.forEach((record) => {
          let isDelete = !runParams.checkExist
          if (runParams.checkExist) {
            isDelete = UB.Repository(detail.entityName).attrs(['ID']).selectById(record.ID)
          }
          if (isDelete) {
            store.run('delete', Object.assign({
              __skipRls: !!detail.skipRls,
              execParams: {
                ID: record.ID,
                mi_modifyDate: record.mi_modifyDate
              }
            }, runParams))
          }
        })
      }
    }
    store.freeNative()
  })
}

/**
 * @param {String} entityName
 * @param {Object} execParams
 * @param {Object} instanceData
 */
function setDefaultAttribute (entityName, execParams, instanceData) {
  if (!instanceData) {
    if (!execParams.orderState) {
      execParams.orderState = 'PROJECT'
    }
    instanceData = {}
  }
  if ((!execParams.orderDate && !instanceData.orderDate) || execParams.orderDate === null) {
    execParams.orderDate = new Date()
  }

  if ((!execParams.orderNumber && !instanceData.orderNumber) || execParams.orderNumber === null) {
    execParams.orderNumber = getOrderNum(entityName,
      execParams.orderDate || instanceData.orderDate, execParams.organizationID || instanceData.organizationID)
  }
}

/**
 * @param {ubMethodParams} ctx
 */
function beforeDeleteOrder (ctx, stateAttrName = 'orderState', title = 'Наказ') {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  const instanceData = ctx.dataStore
  let message
  switch (instanceData.get(stateAttrName)) {
    case 'POSTED' : message = 'Проведено'
      break
    case 'PROCESSED' : message = 'Опрацьовано'
      break
    case 'RECONCILED' : message = 'Погоджено'
      break
    case 'ON_RECONCILATION' : message = 'На погодженні'
      break
    case 'ON_COMPLETION' : message = 'На доопрацюванні'
      break
    case 'RETURNED_FROM_RECONCILATION' : message = 'Повернутий з погодження'
      break
    case 'ON_PROCESSING': message = 'В процесі опрацювання'
      break
  }
  if (message) {
    throw new UB.UBAbort(`<<<${UB.i18n('{0} {1} має стан "{2}". Видалення неможливе.', title, instanceData.get('description'), message)}>>>`)
  }
}

/**
 * @param {ubMethodParams} ctx
 */
function checkOrderUpdate (ctx) {
  /* const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore
  if (instanceData.get('orderState') === 'POSTED' && execParams.orderState !== 'PROJECT') {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ ${instanceData.get('description')} - проведено. Зміни неможливі.')}>>>`)
  } */
}

/**
 * Generate next order number with prefix from settings
 * @param {String} orderEntity
 * @param {Date} orderDate
 * @param {Number} organization ID
 * @param {Number} [initValue=1]
 * @returns {String}
 */
function getOrderNum (orderEntity, orderDate, organization, initValue = 1) {
  const today = orderDate ? new Date(orderDate) : new Date()
  let numParams = UB.Repository('hr_counter').attrs(['prefix', 'period', 'size', 'organization'])
    .where('orderEntity', '=', orderEntity)
    .selectAsObject()

  const numParamsWithOrg = _.find(numParams, { organization: organization || null })

  if (!numParamsWithOrg) {
    numParams = _.find(numParams, { organization: null })
  } else {
    numParams = numParamsWithOrg
  }

  if (numParams) {
    let counterName = (numParams.prefix || '') + orderEntity + (numParams.organization || 'ALL')
    if (!numParams.period) {
      counterName += 'Y0000Q0M00D00'
    } else if (numParams.period === 'YEAR') {
      counterName += 'Y' + (today.getFullYear()).toString().padStart(4, '0') + 'Q0M00D00'
    } else if (numParams.period === 'QUARTER') {
      counterName += 'Y' + (today.getFullYear()).toString().padStart(4, '0') + 'Q' +
        parseInt((today.getMonth()) / 3 + 1).toString().padStart(1, '0') + 'M00D00'
    } else if (numParams.period === 'MONTH') {
      counterName += 'Y' + (today.getFullYear()).toString().padStart(4, '0') + 'Q' +
        parseInt(today.getMonth() / 3 + 1).toString().padStart(1, '0') +
        'M' + today.getMonth().toString().padStart(2, '0') + 'D00'
    } else if (numParams.period === 'DAY') {
      counterName += 'Y' + (today.getFullYear()).toString().padStart(4, '0') + 'Q' +
        parseInt(today.getMonth() / 3 + 1).toString().padStart(1, '0') +
        'M' + today.getMonth().toString().padStart(2, '0') + 'D' +
        today.getDate().toString().padStart(2, '0')
    }

    const size = numParams.size - (numParams.prefix ? numParams.prefix.length || 0 : 0)

    return (numParams.prefix || '') +
      (ubs_numcounter.getRegnum(counterName, initValue)).toString().padStart(size, '0')
  } else {
    const year = 'Y' + (today.getFullYear()).toString().padStart(4, '0') + 'Q0M00D00'
    return (ubs_numcounter.getRegnum('ALL' + orderEntity + year, initValue)).toString().padStart(7, '0')
  }
}

/**
 * @param {Array<string>} fieldList
 * @param {Array<string>} exceptAttributes
 */
function setFieldListAttribute (fieldList, exceptAttributes) {
  fieldList = _.union(fieldList, _.difference(['ID', 'mi_modifyDate', 'lineNum'], exceptAttributes))
  fieldList.forEach((item) => {
    const attrName = item.split('.')
    if (attrName.length > 1 && !_.includes(fieldList, attrName[0])) {
      fieldList.push(attrName[0])
    }
  })
  return fieldList
}

/**
 * @param {Number} instanceID
 * @param {Array<DocumentDetail>} details
 * @param {Boolean} return as data
 */
function getEntityDetail (instanceID, details, returnAsData = false) {
  const result = {}
  details.forEach((detail) => {
    const rep = UB.Repository(detail.entityName)
      .attrs(detail.fieldList)
      .where(detail.docIDName, '=', instanceID)
    if (detail.defaultValue) {
      _.forEach(detail.defaultValue, (value, name) => {
        rep.where(name, '=', value)
      })
    }
    if (detail.whereParams) {
      _.forEach(detail.whereParams, (value, name) => {
        rep.where(name, '=', value)
      })
    }
    if (detail.orderBy) {
      if (typeof detail.orderBy === 'string') {
        rep.orderBy(detail.orderBy)
      } else {
        detail.orderBy.forEach(orderAttr => {
          rep.orderBy(orderAttr)
        })
      }
    }
    result[detail.detailName] = rep.misc({ __skipRls: !!detail.skipRls }).selectAsObject()
    if (detail.subDetail) {
      detail.subDetail.forEach(subDetail => {
        result[detail.detailName].forEach(item => {
          const sub = UB.Repository(subDetail.subEntityName)
            .attrs(subDetail.subFieldList)
            .where(subDetail.subDocIDName, '=', item.ID)
          if (subDetail.whereParams) {
            _.forEach(subDetail.whereParams, (value, name) => {
              sub.where(name, '=', value)
            })
          }
          if (subDetail.orderBy) {
            sub.orderBy(subDetail.orderBy)
          }
          item[subDetail.subDetailName] = sub.misc({ __skipRls: !!detail.subDetail.skipRls }).selectAsObject()
        })
      })
    }
  })
  return returnAsData ? result : JSON.stringify(result)
}

function setPositionAccrual (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore
  const staffTableData = UB.Repository('hr_staffTable')
    .attrs(['orgID', 'dictReasonAccrualID.isIndexSalary', 'accrualChangeKind'])
    .selectById(execParams.ID)
  const entryOrderID = execParams.entryOrderID || instanceData.entryOrderID || execParams.ID
  const storePosition = UB.DataStore('hr_position')
  const storeEmployeePosition = UB.DataStore('hr_employeePosition')
  const storeStaffTableChange = UB.DataStore('hr_staffTableChange')
  const staffTableChange = []
  const employees = []

  const staffTableAccrual = UB.Repository('hr_staffTableAccrual')
    .attrs(['ID', 'positionType', 'dictPositionID', 'dictStatePayID', 'dictTarifCoeffID', 'quantity', 'previousAccrualSum', 'accrualSum'])
    .where('staffTableID', '=', execParams.ID)
    .where('staffTableAccrualID', 'isNull', 0)
    .selectAsObject()
  const staffTableAccrualDt = UB.Repository('hr_staffTableAccrual')
    .attrs(['ID', 'positionType', 'dictPositionID', 'dictStatePayID', 'dictTarifCoeffID', 'quantity', 'previousAccrualSum', 'accrualSum',
      'positionID.mi_data_id', 'staffTableAccrualID'])
    .where('staffTableID', '=', execParams.ID)
    .where('staffTableAccrualID', 'isNotNull', 0)
    .selectAsObject()

  const orgID = staffTableData.orgID
  const dateFrom = _.isDate(execParams.entryDate || instanceData.get('entryDate'))
    ? (execParams.entryDate || instanceData.get('entryDate'))
    : new Date(execParams.entryDate || instanceData.get('entryDate'))
  staffTableAccrual.forEach(accrual => {
    UB.Repository('hr_position').attrs(['mi_data_id'])
      .where('orgID', '=', orgID)
      .where('state', 'in', ['ACTIVE', 'CHANGES'])
      .where('dictPositionID', '=', accrual.dictPositionID)
      .whereIf(accrual.previousAccrualSum === null, 'accrualSum', 'isNull')
      .whereIf(accrual.previousAccrualSum !== null, 'accrualSum', '>', accrual.previousAccrualSum - 0.01)
      .whereIf(accrual.previousAccrualSum !== null, 'accrualSum', '<', accrual.previousAccrualSum + 0.01)
      .where('mi_dateTo', '>=', dateFrom)
      .whereIf(accrual.positionType, 'positionType', '=', accrual.positionType)
      .whereIf(!accrual.positionType, 'positionType', 'isNull')
      .whereIf(accrual.dictStatePayID, 'dictStatePayID', '=', accrual.dictStatePayID)
      .whereIf(!accrual.dictStatePayID, 'dictStatePayID', 'isNull')
      .whereIf(accrual.dictTarifCoeffID, 'dictTarifCoeffID', '=', accrual.dictTarifCoeffID)
      .whereIf(!accrual.dictTarifCoeffID, 'dictTarifCoeffID', 'isNull')
      .where('entryOrderID', '!=', entryOrderID)
      .misc({ __mip_recordhistory_all: true })
      .groupBy('mi_data_id')
      .selectAsObject().forEach(position => {
        const accrualDt = staffTableAccrualDt.find(o => o.staffTableAccrualID === accrual.ID && o['positionID.mi_data_id'] === position.mi_data_id)
        const accrualSum = accrualDt ? accrualDt.accrualSum : accrual.accrualSum
        if (accrualSum !== null && accrualSum !== undefined) {
          const positionHistory = UB.Repository('hr_position').attrs(['ID', 'mi_data_id', 'mi_treePath', 'priorID',
            'priorID.staffOrderID', 'nextID', 'nextID.staffOrderID',
            'staffOrderID', 'entryOrderID', 'changeStaffOrderID', 'mi_dateFrom', 'mi_dateTo', 'state',
            'positionType', 'dictPositionID', 'quantity', 'accrualSum', 'dictStatePayID', 'dictTarifCoeffID'])
            .where('orgID', '=', orgID)
            .where('mi_data_id', '=', position.mi_data_id)
            .where('state', 'in', ['ACTIVE', 'CHANGES'])
            .where('entryOrderID', '!=', entryOrderID)
            .misc({ __mip_recordhistory_all: true })
            .orderBy('mi_dateFrom')
            .orderBy('ID')
            .selectAsObject()

          let onDateIdx = positionHistory.findIndex(o => dateService.shiftDate(o.mi_dateFrom) < dateFrom &&
          dateService.shiftDate(o.mi_dateTo) >= dateFrom && o.positionType === accrual.positionType &&
          o.dictPositionID === accrual.dictPositionID && (o.dictStatePayID === accrual.dictStatePayID || o.dictTarifCoeffID === accrual.dictTarifCoeffID) &&
          o.accrualSum === accrual.previousAccrualSum && o.state === 'ACTIVE')
          if (onDateIdx >= 0) {
            const posOnDate = positionHistory[onDateIdx]
            const newID = storePosition.generateID()
            entityBaseService.cloneInstance('hr_position', posOnDate.ID, {
              ID: newID,
              mi_data_id: posOnDate.mi_data_id,
              mi_treePath: posOnDate.mi_treePath,
              mi_dateFrom: dateFrom,
              mi_dateTo: posOnDate.mi_dateTo,
              state: 'ACTIVE',
              staffOrderID: execParams.ID,
              entryOrderID: entryOrderID,
              changeStaffOrderID: posOnDate['nextID.staffOrderID'],
              priorID: posOnDate.ID,
              nextID: posOnDate.nextID,
              separationID: posOnDate.ID,
              accrualSum: accrualSum
            }, true, { skipBefore: true })
            storePosition.run('update', {
              skipBefore: true,
              __skipOptimisticLock: true,
              execParams: {
                ID: posOnDate.ID,
                nextID: newID,
                changeStaffOrderID: execParams.ID,
                mi_dateTo: dateService.shiftDate(posOnDate.mi_dateFrom) < dateFrom ? dateService.addDays(dateFrom, -1) : dateFrom,
                state: dateService.shiftDate(posOnDate.mi_dateFrom) < dateFrom ? posOnDate.state : 'CHANGES'
              }
            })
            if (posOnDate.nextID) {
              storePosition.run('update', {
                skipBefore: true,
                __skipOptimisticLock: true,
                execParams: {
                  ID: posOnDate.nextID,
                  priorID: newID
                }
              })
            }
            for (let i = onDateIdx + 1; i < positionHistory.length; i++) {
              const nextPos = positionHistory[i]
              if (nextPos.positionType === accrual.positionType && nextPos.dictPositionID === accrual.dictPositionID &&
                (nextPos.dictStatePayID === accrual.dictStatePayID || nextPos.dictTarifCoeffID === accrual.dictTarifCoeffID) &&
                nextPos.accrualSum === accrual.previousAccrualSum) {
                storePosition.run('update', {
                  skipBefore: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: nextPos.ID,
                    accrualSum: accrualSum
                  }
                })
                staffTableChange.push({
                  staffTableID: execParams.ID,
                  entityName: 'hr_position',
                  entityID: nextPos.ID,
                  previousAccrualSum: nextPos.accrualSum,
                  accrualSum: accrualSum
                })
              } else {
                i = positionHistory.length
              }
            }
          } else {
            onDateIdx = positionHistory.findIndex(o =>
              dateService.shiftDate(o.mi_dateFrom) >= dateFrom &&
            o.positionType === accrual.positionType && o.dictPositionID === accrual.dictPositionID &&
            (o.dictStatePayID === accrual.dictStatePayID || o.dictTarifCoeffID === accrual.dictTarifCoeffID) &&
            o.accrualSum === accrual.previousAccrualSum && o.state === 'ACTIVE')
            if (onDateIdx >= 0) {
              const posOnDate = positionHistory[onDateIdx]
              const newID = storePosition.generateID()
              posOnDate.mi_dateFrom = dateService.shiftDate(posOnDate.mi_dateFrom)
              posOnDate.mi_dateTo = dateService.shiftDate(posOnDate.mi_dateTo)
              const createdLater = posOnDate.mi_dateFrom > dateFrom
              entityBaseService.cloneInstance('hr_position', posOnDate.ID, {
                ID: newID,
                mi_data_id: posOnDate.mi_data_id,
                mi_treePath: posOnDate.mi_treePath,
                mi_dateFrom: createdLater ? posOnDate.mi_dateFrom : dateFrom,
                mi_dateTo: createdLater ? posOnDate.mi_dateFrom : dateFrom,
                state: 'ACTIVE',
                staffOrderID: execParams.ID,
                entryOrderID: entryOrderID,
                changeStaffOrderID: posOnDate.staffOrderID,
                priorID: posOnDate.mi_dateTo > (createdLater ? posOnDate.mi_dateFrom : dateFrom) ? posOnDate.priorID : posOnDate.ID,
                nextID: posOnDate.mi_dateTo > (createdLater ? posOnDate.mi_dateFrom : dateFrom) ? posOnDate.ID : posOnDate.nextID,
                separationID: posOnDate.ID,
                accrualSum: accrualSum
              }, true, { skipBefore: true })
              storePosition.run('update', {
                skipBefore: true,
                __skipOptimisticLock: true,
                execParams:
                Object.assign({
                  ID: posOnDate.ID
                }, posOnDate.mi_dateTo > (createdLater ? posOnDate.mi_dateFrom : dateFrom) ? {
                  priorID: newID,
                  accrualSum: accrualSum,
                  mi_dateFrom: dateService.addDays(createdLater ? posOnDate.mi_dateFrom : dateFrom, 1)
                } : {
                  nextID: newID,
                  changeStaffOrderID: execParams.ID,
                  state: 'CHANGES'
                })
              })
              if (posOnDate.mi_dateTo > (createdLater ? posOnDate.mi_dateFrom : dateFrom)) {
                staffTableChange.push({
                  staffTableID: execParams.ID,
                  entityName: 'hr_position',
                  entityID: posOnDate.ID,
                  previousAccrualSum: posOnDate.accrualSum,
                  accrualSum: accrualSum
                })
                if (posOnDate.priorID) {
                  storePosition.run('update', {
                    skipBefore: true,
                    __skipOptimisticLock: true,
                    execParams: {
                      ID: posOnDate.priorID,
                      nextID: newID,
                      changeStaffOrderID: execParams.ID
                    }
                  })
                }
              } else {
                if (posOnDate.nextID) {
                  storePosition.run('update', {
                    skipBefore: true,
                    __skipOptimisticLock: true,
                    execParams: {
                      ID: posOnDate.nextID,
                      priorID: newID
                    }
                  })
                }
              }

              for (let i = onDateIdx + 1; i < positionHistory.length; i++) {
                const nextPos = positionHistory[i]
                if (nextPos.positionType === accrual.positionType && nextPos.dictPositionID === accrual.dictPositionID &&
                  (nextPos.dictStatePayID === accrual.dictStatePayID || nextPos.dictTarifCoeffID === accrual.dictTarifCoeffID) &&
                  nextPos.accrualSum === accrual.previousAccrualSum) {
                  storePosition.run('update', {
                    skipBefore: true,
                    __skipOptimisticLock: true,
                    execParams: {
                      ID: nextPos.ID,
                      accrualSum: accrualSum
                    }
                  })
                  staffTableChange.push({
                    staffTableID: execParams.ID,
                    entityName: 'hr_position',
                    entityID: nextPos.ID,
                    previousAccrualSum: nextPos.accrualSum,
                    accrualSum: accrualSum
                  })
                } else {
                  i = positionHistory.length
                }
              }
            }
          }

          // Зміна призначень
          const employeePositions = staffTableData['accrualChangeKind'] === 'SKIP'
            ? []
            : UB.Repository('hr_employeePositionS')
              .attrs(['employeeNumberID', 'employeeID'])
              .where('organizationID', '=', orgID)
              .where('positionID', '=', position.mi_data_id)
              .where('dateTo', '>=', dateFrom)
              .groupBy(['ID', 'employeeNumberID', 'employeeID'])
              .misc({ __skipRls: true })
              .selectAsObject()
          employeePositions.forEach(empPos => {
            if (!employees.find(el => el.employeeNumberID === empPos.employeeNumberID)) {
              employees.push({ employeeNumberID: empPos.employeeNumberID, employeeID: empPos.employeeID })
            }
            const empPositions = UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'positionID', 'accrualSum', 'isActive', 'orderID',
                'changeOrderID', 'separationID'])
              .where('employeeNumberID', '=', empPos.employeeNumberID)
              .where('dateTo', '>=', dateFrom)
              .orderBy('dateFrom')
              .orderBy('isActive')
              .misc({ __skipRls: true })
              .selectAsObject()
            if (staffTableData['accrualChangeKind'] === 'ALL') {
              onDateIdx = empPositions.findIndex(o => dateService.shiftDate(o.dateFrom) < dateFrom &&
                dateService.shiftDate(o.dateTo) >= dateFrom && o.positionID === position.mi_data_id)
            } else {
              onDateIdx = empPositions.findIndex(o => dateService.shiftDate(o.dateFrom) < dateFrom &&
                dateService.shiftDate(o.dateTo) >= dateFrom && o.positionID === position.mi_data_id && o.accrualSum === accrual.previousAccrualSum)
            }
            if (onDateIdx >= 0) {
              const posOnDate = empPositions[onDateIdx]
              const newID = storeEmployeePosition.generateID()
              entityBaseService.cloneInstance('hr_employeePosition', posOnDate.ID, {
                ID: newID,
                dateFrom: dateFrom,
                dateTo: posOnDate.dateTo,
                isActive: 1,
                orderID: execParams.ID,
                changeOrderID: empPositions[onDateIdx + 1] ? empPositions[onDateIdx + 1].orderID : null,
                separationID: posOnDate.ID,
                accrualSum: accrualSum,
                isIndex: staffTableData['dictReasonAccrualID.isIndexSalary'] ? 1 : 0
              }, true, { skipBefore: true })
              copyEmpPosFundSource({ priorID: posOnDate.ID, newID, isDirect: true })
              storeEmployeePosition.run('update', {
                skipBefore: true,
                __skipRls: true,
                __skipOptimisticLock: true,
                execParams: {
                  ID: posOnDate.ID,
                  changeOrderID: execParams.ID,
                  dateTo: dateService.shiftDate(posOnDate.dateFrom) < dateFrom ? dateService.addDays(dateFrom, -1) : dateFrom,
                  isActive: dateService.shiftDate(posOnDate.dateFrom) < dateFrom ? posOnDate.isActive : 0
                }
              })
              for (let i = onDateIdx + 1; i < empPositions.length; i++) {
                const nextPos = empPositions[i]
                if (nextPos.positionID === position.mi_data_id && nextPos.accrualSum === accrual.previousAccrualSum) {
                  storeEmployeePosition.run('update', {
                    skipBefore: true,
                    __skipRls: true,
                    __skipOptimisticLock: true,
                    execParams: {
                      ID: nextPos.ID,
                      accrualSum: accrualSum
                    }
                  })
                  staffTableChange.push({
                    staffTableID: execParams.ID,
                    entityName: 'hr_employeePosition',
                    entityID: nextPos.ID,
                    previousAccrualSum: nextPos.accrualSum,
                    accrualSum: accrualSum
                  })
                }
              }
            } else {
              if (staffTableData['accrualChangeKind'] === 'ALL') {
                onDateIdx = empPositions.findIndex(o => dateService.shiftDate(o.dateFrom) >= dateFrom &&
                  o.positionID === position.mi_data_id)
              } else {
                onDateIdx = empPositions.findIndex(o => dateService.shiftDate(o.dateFrom) >= dateFrom &&
                  o.positionID === position.mi_data_id && o.accrualSum === accrual.previousAccrualSum)
              }
              if (onDateIdx >= 0) {
                const posOnDate = empPositions[onDateIdx]
                const newID = storeEmployeePosition.generateID()
                posOnDate.dateTo = dateService.shiftDate(posOnDate.dateTo)
                posOnDate.dateFrom = dateService.shiftDate(posOnDate.dateFrom)
                const createdLater = posOnDate.dateFrom > dateFrom
                entityBaseService.cloneInstance('hr_employeePosition', posOnDate.ID, {
                  ID: newID,
                  dateFrom: createdLater ? posOnDate.dateFrom : dateFrom,
                  dateTo: createdLater ? posOnDate.dateFrom : dateFrom,
                  isActive: 0,
                  orderID: execParams.ID,
                  changeOrderID: posOnDate.dateTo > (createdLater ? posOnDate.dateFrom : dateFrom)
                    ? posOnDate.orderID
                    : empPositions[onDateIdx + 1] ? empPositions[onDateIdx + 1].orderID : null,
                  separationID: posOnDate.ID,
                  accrualSum: accrualSum,
                  isIndex: staffTableData['dictReasonAccrualID.isIndexSalary'] ? 1 : 0
                }, true, { skipBefore: true })
                copyEmpPosFundSource({ priorID: posOnDate.ID, newID, isDirect: true })
                storeEmployeePosition.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: Object.assign({
                    ID: posOnDate.ID
                  }, posOnDate.dateTo > (createdLater ? posOnDate.dateFrom : dateFrom) ? {
                    accrualSum: accrualSum,
                    dateFrom: createdLater ? posOnDate.dateFrom : dateFrom
                  } : {
                    changeOrderID: execParams.ID,
                    isActive: 0
                  })
                })
                if (posOnDate.dateTo >= (createdLater ? posOnDate.dateFrom : dateFrom)) {
                  staffTableChange.push({
                    staffTableID: execParams.ID,
                    entityName: 'hr_employeePosition',
                    entityID: posOnDate.ID,
                    previousAccrualSum: posOnDate.accrualSum,
                    accrualSum: accrualSum
                  })
                  if (empPositions[onDateIdx - 1]) {
                    storeEmployeePosition.run('update', {
                      skipBefore: true,
                      __skipRls: true,
                      __skipOptimisticLock: true,
                      execParams: {
                        ID: empPositions[onDateIdx - 1].ID,
                        changeOrderID: execParams.ID
                      }
                    })
                  }
                }

                for (let i = onDateIdx + 1; i < empPositions.length; i++) {
                  const nextPos = empPositions[i]
                  if (nextPos.positionID === position.mi_data_id && nextPos.accrualSum === accrual.previousAccrualSum) {
                    storeEmployeePosition.run('update', {
                      skipBefore: true,
                      __skipRls: true,
                      __skipOptimisticLock: true,
                      execParams: {
                        ID: nextPos.ID,
                        accrualSum: accrualSum
                      }
                    })
                    staffTableChange.push({
                      staffTableID: execParams.ID,
                      entityName: 'hr_employeePosition',
                      entityID: nextPos.ID,
                      previousAccrualSum: nextPos.accrualSum,
                      accrualSum: accrualSum
                    })
                  }
                }
              }
            }
          })
        }
      })
  })

  staffTableChange.forEach(row => {
    storeStaffTableChange.run('insert', {
      __skipOptimisticLock: true,
      execParams: row
    })
  })

  return employees
}

function setCancelPositionAccrual (ctx) {
  const execParams = ctx.mParams.execParams
  const storePosition = UB.DataStore('hr_position')
  const storeEmployeePosition = UB.DataStore('hr_employeePosition')
  const storeEmployeePositionDel = UB.DataStore('tim_plan')
  const storeStaffTableChange = UB.DataStore('hr_staffTableChange')
  const staffTableData = UB.Repository('hr_staffTable').attrs(['entryDate']).selectById(execParams.ID)
  const entryDate = dateService.shiftDate(staffTableData.entryDate)
  const staffTableChange = UB.Repository('hr_staffTableChange')
    .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'
    ])
    .where('staffTableID', '=', execParams.ID)
    .selectAsObject()
  UB.Repository('hr_position').attrs(['mi_data_id'])
    .where('staffOrderID', '=', execParams.ID)
    .where('state', 'in', ['ACTIVE', 'CHANGES'])
    .misc({ __mip_recordhistory_all: true })
    .groupBy('mi_data_id')
    .selectAsObject().forEach(position => {
      const positionHistory = UB.Repository('hr_position').attrs(['ID', 'mi_data_id', 'mi_treePath', 'priorID', 'priorID.mi_dateTo',
        'priorID.staffOrderID', 'priorID.separationID', 'nextID', 'nextID.staffOrderID', 'priorID.state', 'separationID',
        'priorID.accrualSum', 'nextID.accrualSum', 'nextID.mi_dateFrom', 'nextID.nextID.mi_dateFrom', 'nextID.mi_dateTo', 'nextID.separationID',
        'staffOrderID', 'entryOrderID', 'changeStaffOrderID', 'mi_dateFrom', 'mi_dateTo', 'state',
        'positionType', 'dictPositionID', 'quantity', 'accrualSum'
      ])
        .where('mi_data_id', '=', position.mi_data_id)
        .where('state', 'in', ['ACTIVE', 'CHANGES'])
        .misc({ __mip_recordhistory_all: true })
        .orderBy('mi_dateFrom')
        .orderBy('mi_dateTo')
        .orderBy('ID')
        .selectAsObject()
      let onDateIdx = positionHistory.findIndex(o => o.staffOrderID === execParams.ID)
      if (onDateIdx >= 0) {
        const posOnDate = positionHistory[onDateIdx]
        if (posOnDate.priorID) {
          const changeOnPos = staffTableChange.find(o => o.entityName === 'hr_position' && o.entityID === posOnDate.priorID &&
          o.accrualSum === posOnDate['priorID.accrualSum'])
          storePosition.run('update', {
            skipBefore: true,
            __skipOptimisticLock: true,
            execParams: Object.assign({
              ID: posOnDate.priorID,
              nextID: posOnDate.nextID,
              changeStaffOrderID: posOnDate['nextID.staffOrderID']
            }, (posOnDate.priorID === posOnDate.separationID || posOnDate['priorID.separationID'] === posOnDate.separationID || posOnDate.ID === posOnDate['priorID.separationID']) ? {
              mi_dateTo: (posOnDate.priorID === posOnDate.separationID || posOnDate['priorID.separationID'] === posOnDate.ID || posOnDate['priorID.separationID'] === posOnDate.separationID)
                ? dateService.shiftDate(posOnDate.mi_dateTo) : dateService.shiftDate(posOnDate['priorID.mi_dateTo']),
              accrualSum: (posOnDate.priorID === posOnDate.separationID && changeOnPos) ? changeOnPos.previousAccrualSum : posOnDate['priorID.accrualSum'],
              separationID: posOnDate.ID === posOnDate['priorID.separationID'] ? posOnDate.separationID : posOnDate['priorID.separationID'],
              state: (posOnDate['nextID.mi_dateFrom'] &&
              dateService.shiftDate(posOnDate.mi_dateTo).getTime() === dateService.shiftDate(posOnDate['nextID.mi_dateFrom']).getTime()) ? 'CHANGES' : 'ACTIVE'
            } : {})
          })
          if (posOnDate.separationID) {
            const staffTableNextChange = UB.Repository('hr_staffTableChange')
              .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
              .where('entityName', '=', 'hr_position')
              .where('entityID', '=', posOnDate.separationID)
              .where('staffTableID', '=', posOnDate['priorID.staffOrderID'])
              .selectAsObject()
            const change = staffTableChange.find(o => o.entityName === 'hr_position' && o.entityID === posOnDate.separationID)
            if (staffTableNextChange.length && change) {
              staffTableNextChange.forEach(row => {
                storeStaffTableChange.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    accrualSum: change.accrualSum
                  }
                })
              })
            }
          }
        }
        if (posOnDate.nextID) {
          storePosition.run('update', {
            skipBefore: true,
            __skipOptimisticLock: true,
            execParams: Object.assign({
              ID: posOnDate.nextID,
              priorID: posOnDate.priorID
            }, (posOnDate.nextID === posOnDate.separationID || posOnDate['nextID.separationID'] === posOnDate.separationID || posOnDate.ID === posOnDate['nextID.separationID']) ? {
              mi_dateFrom: posOnDate['nextID'] === posOnDate.separationID ? dateService.shiftDate(posOnDate.mi_dateFrom) : dateService.shiftDate(posOnDate['nextID.mi_dateFrom']),
              separationID: posOnDate.ID === posOnDate['nextID.separationID'] ? posOnDate.separationID : posOnDate['nextID.separationID'],
              state: (posOnDate['nextID.nextID.mi_dateFrom'] &&
              dateService.shiftDate(posOnDate['nextID.mi_dateTo']).getTime() === dateService.shiftDate(posOnDate['nextID.nextID.mi_dateFrom']).getTime()) ? 'CHANGES' : 'ACTIVE',
              accrualSum: (posOnDate.priorID && dateService.shiftDate(posOnDate.mi_dateTo).getTime() === dateService.shiftDate(posOnDate['nextID.mi_dateTo']).getTime())
                ? posOnDate['priorID.accrualSum'] : posOnDate['nextID.accrualSum']
            } : {})
          })
          if (posOnDate.separationID) {
            const staffTableNextChange = UB.Repository('hr_staffTableChange')
              .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
              .where('entityName', '=', 'hr_position')
              .where('entityID', '=', posOnDate.separationID)
              .where('staffTableID', '=', posOnDate['nextID.staffOrderID'])
              .selectAsObject()
            const change = staffTableChange.find(o => o.entityName === 'hr_position' && o.entityID === posOnDate.separationID)
            if (staffTableNextChange.length && change) {
              staffTableNextChange.forEach(row => {
                storeStaffTableChange.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    previousAccrualSum: change.previousAccrualSum
                  }
                })
              })
            }
          }
        }

        storePosition.run('delete', {
          skipBefore: true,
          execParams: { ID: posOnDate.ID }
        })
        for (let i = onDateIdx + 1; i < positionHistory.length; i++) {
          const nextPos = positionHistory[i]
          const change = staffTableChange.find(o => o.entityName === 'hr_position' && o.entityID === nextPos.ID && o.accrualSum === nextPos.accrualSum)
          if (change && !UB.Repository('hr_staffTableChange')
            .attrs(['ID'])
            .where('entityName', '=', 'hr_position')
            .where('entityID', '=', nextPos.ID)
            .where('staffTableID', '!=', execParams.ID)
            .where('staffTableID.entryDate', '<', entryDate)
            .selectAsObject().length) {
            storePosition.run('update', {
              skipBefore: true,
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPos.ID,
                accrualSum: change.previousAccrualSum
              }
            })
          }
        }
      }
    })
  UB.Repository('hr_employeePositionS').attrs(['employeeNumberID', 'positionID'])
    .where('orderID', '=', execParams.ID)
    .groupBy(['employeeNumberID', 'positionID'])
    .misc({ __skipRls: true })
    .selectAsObject().forEach(position => {
      const positionHistory = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'positionID', 'accrualSum', 'isActive', 'orderID',
          'changeOrderID', 'separationID'])
        .misc({ __skipRls: true })
        .where('employeeNumberID', '=', position.employeeNumberID)
        .orderBy('dateFrom')
        .orderBy('isActive')
        .orderBy('dateTo')
        .orderBy('ID')
        .selectAsObject()
      let onDateIdx = positionHistory.findIndex(o => o.orderID === execParams.ID)
      if (onDateIdx >= 0) {
        const posOnDate = positionHistory[onDateIdx]
        if (positionHistory[onDateIdx - 1]) {
          const changeOnPos = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === positionHistory[onDateIdx - 1] &&
          o.accrualSum === positionHistory[onDateIdx - 1].accrualSum)
          const execParams = {
            ID: positionHistory[onDateIdx - 1].ID,
            changeOrderID: positionHistory[onDateIdx + 1] ? positionHistory[onDateIdx + 1].orderID : null
          }
          if (positionHistory[onDateIdx - 1].ID === posOnDate.separationID || positionHistory[onDateIdx - 1].separationID === posOnDate.separationID ||
            posOnDate.ID === positionHistory[onDateIdx - 1].separationID) {
            execParams.dateTo = dateService.shiftDate((positionHistory[onDateIdx - 1].ID === posOnDate.separationID || positionHistory[onDateIdx - 1].separationID === posOnDate.ID ||
              posOnDate.separationID === positionHistory[onDateIdx - 1].separationID)
              ? posOnDate.dateTo
              : positionHistory[onDateIdx - 1].dateTo)
            if (((positionHistory[onDateIdx - 1].ID === posOnDate.separationID && changeOnPos) ? changeOnPos.previousAccrualSum : positionHistory[onDateIdx - 1].accrualSum) !== positionHistory[onDateIdx - 1].accrualSum) {
              execParams.accrualSum = (positionHistory[onDateIdx - 1].ID === posOnDate.separationID && changeOnPos) ? changeOnPos.previousAccrualSum : positionHistory[onDateIdx - 1].accrualSum
            }
            execParams.separationID = posOnDate.ID === positionHistory[onDateIdx - 1].separationID ? posOnDate.separationID : positionHistory[onDateIdx - 1].separationID
            execParams.isActive = (positionHistory[onDateIdx + 1] && dateService.shiftDate(posOnDate.dateTo).getTime() === dateService.shiftDate(positionHistory[onDateIdx + 1].dateFrom).getTime()) ? 0 : 1
          }

          storeEmployeePosition.run('update', {
            skipBefore: true,
            __skipRls: true,
            __skipOptimisticLock: true,
            execParams
          })
          if (posOnDate.separationID) {
            const staffTableNextChange = UB.Repository('hr_staffTableChange')
              .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
              .where('entityName', '=', 'hr_employeePosition')
              .where('entityID', '=', posOnDate.separationID)
              .where('staffTableID', '=', positionHistory[onDateIdx - 1].orderID)
              .selectAsObject()
            const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === posOnDate.separationID)
            if (staffTableNextChange.length && change) {
              staffTableNextChange.forEach(row => {
                storeStaffTableChange.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    accrualSum: change.accrualSum
                  }
                })
              })
            }
          }
        }
        if (positionHistory[onDateIdx + 1] && (positionHistory[onDateIdx + 1].ID === posOnDate.separationID || positionHistory[onDateIdx + 1].separationID === posOnDate.separationID ||
        posOnDate.ID === positionHistory[onDateIdx + 1].separationID || (positionHistory[onDateIdx - 1] && positionHistory[onDateIdx - 1].separationID === positionHistory[onDateIdx + 1].ID))) {
          storeEmployeePosition.run('update', {
            skipBefore: true,
            __skipRls: true,
            __skipOptimisticLock: true,
            execParams: {
              ID: positionHistory[onDateIdx + 1].ID,
              separationID: posOnDate.ID === positionHistory[onDateIdx + 1].separationID ? posOnDate.separationID : positionHistory[onDateIdx + 1].separationID,
              dateFrom: dateService.shiftDate(positionHistory[onDateIdx + 1].ID === posOnDate.separationID ? posOnDate.dateFrom : positionHistory[onDateIdx + 1].dateFrom),
              isActive: (positionHistory[onDateIdx + 2] && dateService.shiftDate(positionHistory[onDateIdx + 1].dateTo).getTime() === dateService.shiftDate(positionHistory[onDateIdx + 2].dateFrom).getTime()) ? 0 : 1,
              accrualSum: (positionHistory[onDateIdx - 1] && dateService.shiftDate(posOnDate.dateTo).getTime() === dateService.shiftDate(positionHistory[onDateIdx + 1].dateFrom).getTime()) ? positionHistory[onDateIdx - 1].accrualSum : positionHistory[onDateIdx + 1].accrualSum
            }
          })
          if (posOnDate.separationID) {
            const staffTableNextChange = UB.Repository('hr_staffTableChange')
              .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
              .where('entityName', '=', 'hr_employeePosition')
              .where('entityID', '=', posOnDate.separationID)
              .where('staffTableID', '=', positionHistory[onDateIdx + 1].orderID)
              .selectAsObject()
            const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === posOnDate.separationID)
            if (staffTableNextChange.length && change) {
              staffTableNextChange.forEach(row => {
                storeStaffTableChange.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    previousAccrualSum: change.previousAccrualSum
                  }
                })
              })
            }
          }
        }
        storeEmployeePositionDel.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = :deleteDate:, mi_deleteUser = :userID:
                WHERE ID = :ID: `, { deleteDate: new Date(), userID: Session.uData.userID, ID: posOnDate.ID })

        for (let i = onDateIdx + 1; i < positionHistory.length; i++) {
          const nextPos = positionHistory[i]
          const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === nextPos.ID && o.accrualSum === nextPos.accrualSum)
          if (change && !UB.Repository('hr_staffTableChange')
            .attrs(['ID'])
            .where('entityName', '=', 'hr_employeePosition')
            .where('entityID', '=', nextPos.ID)
            .where('staffTableID', '!=', execParams.ID)
            .where('staffTableID.entryDate', '<', entryDate)
            .selectAsObject().length) {
            storeEmployeePosition.run('update', {
              skipBefore: true,
              __skipRls: true,
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPos.ID,
                accrualSum: change.previousAccrualSum
              }
            })
          }
        }
      }
    })
  staffTableChange.forEach(row => {
    storeStaffTableChange.run('delete', {
      __skipOptimisticLock: true,
      execParams: { ID: row.ID }
    })
  })
  let position = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
    .where('orderID', '=', execParams.ID)
    .misc({ __skipRls: true })
    .limit(1)
    .selectSingle()
  while (position) {
    const next = position.changeOrderID ? (UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
      .where('employeeNumberID', '=', position.employeeNumberID)
      .where('orderID', '=', position.changeOrderID)
      .misc({ __skipRls: true })
      .limit(1).selectSingle() || {}) : {}
    const prior = (UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
      .where('employeeNumberID', '=', position.employeeNumberID)
      .where('changeOrderID', '=', execParams.ID)
      .misc({ __skipRls: true })
      .limit(1).selectSingle() || {})

    if (prior.ID) {
      const execParams = {
        ID: prior.ID
      }
      if (prior.ID === position.separationID || prior.separationID === position.separationID) {
        execParams.dateTo = dateService.shiftDate(position.dateTo)
        if (next.ID && execParams.dateTo < dateService.addDays(dateService.shiftDate(next.dateFrom), -1)) {
          execParams.dateTo = dateService.addDays(dateService.shiftDate(next.dateFrom), -1)
        }
      }
      execParams.changeOrderID = next.ID ? next.orderID : null
      storeEmployeePosition.run('update', {
        skipBefore: true,
        __skipRls: true,
        __skipOptimisticLock: true,
        execParams
      })
    }
    if (next.ID) {
      const execParams = {
        ID: next.ID
      }
      if (next.ID === position.separationID || next.separationID === position.separationID) {
        execParams.dateFrom = dateService.shiftDate(position.dateFrom)
        if (prior.ID && execParams.dateFrom > dateService.addDays(dateService.shiftDate(prior.dateTo), 1)) {
          execParams.dateFrom = dateService.addDays(dateService.shiftDate(prior.dateTo), 1)
        }
      }
      storeEmployeePosition.run('update', {
        skipBefore: true,
        __skipRls: true,
        __skipOptimisticLock: true,
        execParams
      })
    }
    storeEmployeePositionDel.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = :deleteDate:, mi_deleteUser = :userID:
                WHERE ID = :ID: `, { deleteDate: new Date(), userID: Session.uData.userID, ID: position.ID })

    position = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
      .where('orderID', '=', execParams.ID)
      .misc({ __skipRls: true })
      .limit(1)
      .selectSingle()
  }
}

function doCheckStaffList (ctx) {
  const execParams = ctx.mParams.execParams
  const entryOrder = UB.Repository('hr_empOrder').attrs(['staffTableID', 'entryDate']).selectById(execParams.ID)
  const warningMessages = []
  const depBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_dateTo', 'code', 'fullName', 'description', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat',
      'parentUnitID', 'mi_data_id', 'liquidate', 'orgID'])
    .where('staffOrderID', '=', entryOrder.staffTableID)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const posBuilder = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_data_id', 'mi_dateTo', 'parentUnitID', 'liquidate', 'orgID'])
    .where('staffOrderID', '=', entryOrder.staffTableID)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  const dateFrom = _.isDate(entryOrder.entryDate) ? entryOrder.entryDate : new Date(entryOrder.entryDate)
  const dateTo = dateService.addDays(dateFrom, -1)
  depBuilder.forEach(row => {
    if (row.priorID) {
      if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
        const parentUnit = UB.Repository('hr_staffUnit')
          .attrs('description')
          .where('mi_data_id', '=', row['parentUnitID'])
          .orderBy('mi_dateFrom', 'desc')
          .limit(1)
          .selectSingle() || {}
        warningMessages.push(UB.i18n(`Підрозділ "{0}" має підпорядковані підрозділи у майбутніх періодах: "{1}" з {2}`,
          parentUnit.description || '', row.name, dateService.formatDate(dateService.shiftDate(row['priorID.mi_dateFrom']))))
      }
    }
  })
  posBuilder.forEach(row => {
    if (row.priorID) {
      if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
        const parentUnit = UB.Repository('hr_staffUnit')
          .attrs('description')
          .where('mi_data_id', '=', row['parentUnitID'])
          .orderBy('mi_dateFrom', 'desc')
          .limit(1)
          .selectSingle() || {}
        warningMessages.push(UB.i18n(`Підрозділ "{0}" має підпорядковані посади у майбутніх періодах: "{1}" з {2}`,
          parentUnit.description || '', row.name, dateService.formatDate(dateService.shiftDate(row['priorID.mi_dateFrom']))))
      }
    }
  })
  return warningMessages
}

function doPostingStaffOrder (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore
  const entryOrderID = execParams.entryOrderID || instanceData.entryOrderID || execParams.ID
  const errorMessages = []
  const entityName = instanceData.entity.code
  let notes = ''
  if (entityName === 'hr_staffOrder') {
    notes = (UB.Repository(entityName).attrs('notes').selectById(entryOrderID) || {}).notes
  }
  if (entityName === 'hr_staffTable') {
    let docType = UB.Repository('hr_staffTable').attrs(['docType']).selectById(execParams.ID).docType
    if (['ACCRUAL', 'ACCRUAL_CHANGES'].includes(docType)) {
      return setPositionAccrual(ctx)
    }
  }

  const orgStore = UB.DataStore('hr_organization')
  const depStore = UB.DataStore('hr_department')
  const posStore = UB.DataStore('hr_position')
  const orgBuilder = UB.Repository('hr_organization')
    .attrs(['ID', 'name', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_dateTo', 'mi_data_id', 'code', 'EDRPOUCode', 'taxCode', 'fullName', 'nameGen', 'nameDat', 'fullNameGen',
      'fullNameDat', 'description', 'parentUnitID', 'liquidate', 'hkved', 'ECBCode', 'hkvedS', 'hkoatuu', 'hkoatuuS',
      'hkopfg', 'hkopfgS', 'hkou', 'hkouS', 'dgoznNpr', 'kpol', 'riv', 'decisionDate', 'decisionNumber',
      'dictDksuID', 'dictSprStiID', 'classRisk', 'hkatottg', 'orgID'
    ])
    .where('staffOrderID', '=', execParams.ID)
    .joinCondition('priorID.nextID.mi_deleteDate', '>=', '#maxdate')
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const depBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_dateTo', 'code', 'fullName', 'description', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat',
      'parentUnitID', 'mi_data_id', 'liquidate', 'orgID'])
    .where('staffOrderID', '=', execParams.ID)
    .joinCondition('priorID.nextID.mi_deleteDate', '>=', '#maxdate')
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const posBuilder = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'fullName', 'priorID', 'priorID.nextID', 'priorID.nextID.entryOrderID.description', 'priorID.mi_dateFrom',
      'mi_data_id', 'mi_dateFrom', 'mi_dateTo', 'parentUnitID', 'liquidate', 'orgID'])
    .where('staffOrderID', '=', execParams.ID)
    .joinCondition('priorID.nextID.mi_deleteDate', '>=', '#maxdate')
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()
  const dateFrom = _.isDate(execParams.entryDate || instanceData.get('entryDate'))
    ? (execParams.entryDate || instanceData.get('entryDate'))
    : new Date(execParams.entryDate || instanceData.get('entryDate'))
  const dateTo = dateService.addDays(dateFrom, -1)
  orgBuilder.forEach(row => {
    if (!row['priorID.nextID']) {
      if (row.priorID) {
        if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
          errorMessages.push(UB.i18n(`Організацію {0} вже було змінено більш ранньою датою`, row.name))
        } else if (!errorMessages.length) {
          orgStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: dateTo,
              changeStaffOrderID: execParams.ID,
              nextID: row.ID
            }
          })
        }
      }
      if (!errorMessages.length) {
        if (dateService.shiftDate(row.mi_dateTo) > dateFrom || row.liquidate) {
          const updParams = {
            ID: row.ID,
            state: 'ACTIVE',
            entryOrderID: entryOrderID
          }
          if (notes !== 'IMPORT') {
            updParams.mi_dateFrom = dateFrom
          }
          orgStore.run('update', {
            __skipOptimisticLock: true,
            execParams: Object.assign(updParams, row.liquidate ? { mi_dateTo: dateFrom } : {})
          })
          updateOrganization(row)
          if (row.ID === row.mi_data_id) {
            periodService.createPeriod({
              orgID: row.mi_data_id,
              onDate: dateService.currentDate(),
              setCurrent: true
            })
            idParamService.insertDefaultData(row.mi_data_id)
          }
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Організацію {0} вже було змінено іншим наказом {1}`, row.name, row['priorID.nextID.entryOrderID.description']))
    }
  })
  depBuilder.forEach(row => {
    if (!row['priorID.nextID']) {
      if (row.priorID) {
        if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
          if (row.liquidate) {
            depStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: row.priorID,
                mi_dateTo: row['priorID.mi_dateFrom'],
                changeStaffOrderID: execParams.ID,
                nextID: row.ID
              }
            })
          } else {
            if (dateService.shiftDate(row['priorID.mi_dateFrom']).getTime() === dateFrom.getTime()) {
              depStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.priorID,
                  mi_dateTo: row['priorID.mi_dateFrom'],
                  changeStaffOrderID: execParams.ID,
                  nextID: row.ID,
                  state: 'CHANGES'
                }
              })
            } else {
              errorMessages.push(UB.i18n(`Підрозділ {0} вже було змінено більш ранньою датою`, row.name))
            }
          }
        } else if (!errorMessages.length) {
          const updParams = {
            ID: row.priorID,
            mi_dateTo: dateTo,
            changeStaffOrderID: execParams.ID,
            nextID: row.ID
          }
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: updParams
          })
        }
      }
      if (!errorMessages.length) {
        if ((dateService.shiftDate(row.mi_dateTo) > dateFrom || row.liquidate)) {
          const updParams = {
            ID: row.ID,
            state: 'ACTIVE',
            entryOrderID: entryOrderID
          }
          if (notes !== 'IMPORT') {
            updParams.mi_dateFrom = dateFrom
          }
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: Object.assign(updParams, row.liquidate ? { mi_dateTo: dateFrom } : {})
          })
          if (!ctx.mParams.isImport || !row.mi_dateTo || dateService.shiftDate(row.mi_dateTo).getFullYear() === 9999) {
            updateDepartment(row)
          }
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Підрозділ {0} вже було змінено іншим наказом {1}`, row.name, row['priorID.nextID.entryOrderID.description']))
    }
  })
  posBuilder.forEach(row => {
    if (!row['priorID.nextID']) {
      if (row.priorID) {
        if (dateService.shiftDate(row['priorID.mi_dateFrom']) > dateTo) {
          if (row.liquidate) {
            if (dateService.shiftDate(row['priorID.mi_dateFrom']) < dateFrom) {
              posStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.priorID,
                  mi_dateTo: row['priorID.mi_dateFrom'],
                  changeStaffOrderID: execParams.ID,
                  nextID: row.ID
                }
              })
            } else {
              errorMessages.push(UB.i18n(`Посаду {0} було створено більш пізньою датою {1}`, row.fullName, dateService.formatDate(row['priorID.mi_dateFrom'])))
            }
          } else {
            if (dateService.shiftDate(row['priorID.mi_dateFrom']).getTime() === dateFrom.getTime()) {
              posStore.run('update', {
                __skipOptimisticLock: true,
                execParams: {
                  ID: row.priorID,
                  mi_dateTo: row['priorID.mi_dateFrom'],
                  changeStaffOrderID: execParams.ID,
                  nextID: row.ID,
                  state: 'CHANGES'
                }
              })
            } else {
              errorMessages.push(UB.i18n(`Посаду {0} вже було змінено більш ранньою датою`, row.fullName))
            }
          }
        } else if (!errorMessages.length) {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: dateTo,
              changeStaffOrderID: execParams.ID,
              nextID: row.ID
            }
          })
        }
      }
      if (!errorMessages.length) {
        if (dateService.shiftDate(row.mi_dateTo) > dateFrom || row.liquidate) {
          if (row.liquidate) {
            const allowPostSettingsOrg = UB.Repository('ac_settingsOrg')
              .attrs(['value'])
              .where('organizationID', '=', row.orgID)
              .where('[constantID.code]', '=', 'allowDelBusyPositions')
              .selectScalar()

            const employeePosition = UB.Repository('hr_employeePositionS')
              .attrs(['ID', 'employeeID.fullFIO'])
              .where('positionID', '=', row.mi_data_id)
              .where('dateTo', '>', dateFrom)
              .selectAsObject()

            if (!allowPostSettingsOrg) {
              employeePosition.forEach(empPos => {
                errorMessages.push(UB.i18n(`Для посади {0} існує діюче призначення {1}`, row.fullName, empPos['employeeID.fullFIO']))
              })
            }
          }
          if (!errorMessages.length) {
            const updParams = {
              ID: row.ID,
              state: 'ACTIVE',
              entryOrderID: entryOrderID
            }
            if (notes !== 'IMPORT') {
              updParams.mi_dateFrom = dateFrom
            }
            posStore.run('update', {
              __skipOptimisticLock: true,
              execParams: Object.assign(updParams, row.liquidate ? { mi_dateTo: dateFrom } : {})
            })
            updatePosition(row)
          }
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Посаду {0} вже було змінено іншим наказом {1}`, row.fullName, row['priorID.nextID.entryOrderID.description']))
    }
  })
  orgStore.freeNative()
  depStore.freeNative()
  posStore.freeNative()
  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }

  return []
}

function doCancelPostingStaffOrder (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore
  const entityName = instanceData.entity.code
  let orderData = UB.Repository('hr_staffTable').attrs(['orderDate', 'entryDate']).selectById(execParams.ID)
  if (entityName === 'hr_staffTable') {
    let docType = UB.Repository('hr_staffTable').attrs(['docType']).selectById(execParams.ID).docType
    if (['ACCRUAL', 'ACCRUAL_CHANGES'].includes(docType)) {
      setCancelPositionAccrual(ctx)
      return
    }
  }
  if (entityName === 'hr_staffOrderOrgStructure') {
    orderData = UB.Repository('hr_staffOrderOrgStructure').attrs(['orderDate', 'entryDate']).selectById(execParams.ID)
  }

  const errorMessages = []

  const entryDate = dateService.shiftDate(['hr_staffTableOrgStructure', 'hr_staffTable'].includes(entityName) ? orderData.orderDate : instanceData.get('entryDate'))
  const orgStore = UB.DataStore('hr_organization')
  const depStore = UB.DataStore('hr_department')
  const posStore = UB.DataStore('hr_position')
  const orgBuilder = UB.Repository('hr_organization')
    .attrs(['ID', 'name', 'priorID', 'nextID', 'nextID.entryOrderID.description', 'state'])
    .where('staffOrderID', '=', execParams.ID)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const depBuilder = UB.Repository('hr_department')
    .attrs(['ID', 'name', 'priorID', 'nextID', 'nextID.entryOrderID.description', 'state', 'liquidate'])
    .where('staffOrderID', '=', execParams.ID)
    .misc({ __mip_recordhistory_all: true })
    .orderBy('mi_treePath')
    .selectAsObject()
  const posBuilder = UB.Repository('hr_position')
    .attrs(['ID', 'name', 'priorID', 'nextID', 'nextID.entryOrderID.description', 'state', 'liquidate'])
    .where('staffOrderID', '=', execParams.ID)
    .misc({ __mip_recordhistory_all: true })
    .selectAsObject()

  const maxDate = dateService.maxDate()
  orgBuilder.forEach(row => {
    if (!row.nextID) {
      if (!errorMessages.length) {
        if (row.priorID) {
          orgStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: maxDate,
              changeStaffOrderID: null,
              nextID: null
            }
          })
        }
        orgStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: row.ID,
            mi_dateFrom: entryDate,
            entryOrderID: null,
            state: 'NEW'
          }
        })
      }
    } else {
      errorMessages.push(UB.i18n(`Організацію {0} вже було змінено іншим наказом {1}`, row.name, row['nextID.entryOrderID.description']))
    }
  })
  depBuilder.forEach(row => {
    if (!row.nextID) {
      if (!errorMessages.length) {
        if (row.priorID) {
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: maxDate,
              changeStaffOrderID: null,
              nextID: null
            }
          })
        }
        if (row.liquidate) {
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              mi_dateFrom: entryDate,
              mi_dateTo: entryDate,
              entryOrderID: null,
              state: 'NEW'
            }
          })
        } else {
          depStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              mi_dateFrom: entryDate,
              entryOrderID: null,
              state: 'NEW'
            }
          })
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Підрозділ {0} вже було змінено іншим наказом {1}`, row.name, row['nextID.entryOrderID.description']))
    }
  })
  posBuilder.forEach(row => {
    if (!row.nextID) {
      if (!errorMessages.length) {
        if (row.priorID) {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.priorID,
              mi_dateTo: maxDate,
              changeStaffOrderID: null,
              nextID: null,
              state: 'ACTIVE'
            }
          })
        }
        if (row.liquidate) {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              mi_dateFrom: entryDate,
              mi_dateTo: entryDate,
              entryOrderID: null,
              state: 'NEW'
            }
          })
        } else {
          posStore.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              mi_dateFrom: entryDate,
              entryOrderID: null,
              state: 'NEW'
            }
          })
        }
      }
    } else {
      errorMessages.push(UB.i18n(`Посаду {0} вже було змінено іншим наказом {1}`, row.name, row['nextID.entryOrderID.description']))
    }
  })
  orgStore.freeNative()
  depStore.freeNative()
  posStore.freeNative()
  if (errorMessages.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ<br>{0}', errorMessages.join('<br>'))}>>>`)
  }
}

function doPostingStaffTable (orderID, entityName, entryOrderID, entryDate) {
  const order = UB.Repository(entityName).attrs(['ID', 'orderState', 'mi_modifyDate', 'docType', 'orgID', 'description']).selectById(orderID)
  const store = UB.DataStore(entityName)

  const hrOrder = UB.Repository('hr_order')
    .attrs('orderState')
    .selectById(entryOrderID)
  const prevOrderState = hrOrder ? hrOrder.orderState : null

  const staffTable = UB.Repository(entityName)
    .attrs('orderState')
    .selectById(orderID)
  const prevStaffTableState = staffTable ? staffTable.orderState : null

  if (!order) {
    const entName = entityName === 'hr_staffTable' ? UB.i18n('Штатний розпис') : UB.i18n('Планування структури')
    throw new UB.UBAbort(`<<<${UB.i18n('Проведення не можливе, було видалено {0}', entName)}>>>`)
  }

  if (order.orderState === 'POSTED') {
    const entName = entityName === 'hr_staffTable' ? UB.i18n('Штатний розпис вже застосований') : UB.i18n('Планування структури вже застосовано')
    throw new UB.UBAbort(`<<<${entName}>>>`)
  }
  const isProcessing = entityName === 'hr_staffTable' && (order.docType === 'ACCRUAL_CHANGES' || order.docType === 'ACCRUAL')
  let historyID
  if (isProcessing) {
    store.execSQL(`UPDATE hr_order SET orderState = :orderState:, oldOrderState = :oldOrderState: WHERE ID = :ID:`, {
      ID: entryOrderID,
      orderState: 'ON_PROCESSING',
      oldOrderState: prevOrderState || 'PROJECT'
    })
    store.execSQL(`UPDATE hr_empOrder SET orderState = :orderState: WHERE ID = :ID:`, { ID: entryOrderID, orderState: 'ON_PROCESSING' })

    store.execSQL(`UPDATE hr_order SET orderState = :orderState:, oldOrderState = :oldOrderState: WHERE ID = :ID:`, {
      ID: orderID,
      orderState: 'ON_PROCESSING',
      oldOrderState: prevStaffTableState || 'PROJECT'
    })
    store.execSQL(`UPDATE hr_staffTable SET orderState = :orderState: WHERE ID = :ID:`, { ID: orderID, orderState: 'ON_PROCESSING' })

    const historyStore = UB.DataStore('hr_orderProcessingHistory')
    historyID = historyStore.generateID()
    historyStore.run('insert', {
      __skipSelectAfterInsert: true,
      execParams: {
        ID: historyID,
        orgID: order.orgID,
        orderID: entryOrderID,
        timeStampBegin: dateService.currentDateTime(),
        timeStampEnd: null,
        userID: Session.uData.userID,
        description: UB.i18n('Проведення документа "{0}"', order.description)
      }
    })
    App.dbCommit()
  }
  try {
    store.run('update', {
      execParams: {
        ID: orderID,
        entryOrderID: entryOrderID,
        entryDate: entryDate,
        mi_modifyDate: order.mi_modifyDate,
        orderState: 'POSTED'
      }
    })
    if (isProcessing) {
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: entryOrderID, orderState: 'POSTED' })
      store.execSQL(`UPDATE hr_empOrder SET orderState = :orderState: WHERE ID = :ID:`, { ID: entryOrderID, orderState: 'POSTED' })
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: orderID, orderState: 'POSTED' })
      store.execSQL(`UPDATE hr_staffTable SET orderState = :orderState: WHERE ID = :ID:`, { ID: orderID, orderState: 'POSTED' })
      if (historyID) {
        store.execSQL(`UPDATE hr_orderProcessingHistory SET timeStampEnd = :timeStampEnd: WHERE ID = :ID:`, {
          ID: historyID,
          timeStampEnd: dateService.currentDateTime()
        })
      }
      App.dbCommit()
    }
  } catch (err) {
    if (isProcessing) {
      App.dbRollback()
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: entryOrderID, orderState: prevOrderState || 'PROJECT' })
      store.execSQL(`UPDATE hr_empOrder SET orderState = :orderState: WHERE ID = :ID:`, { ID: entryOrderID, orderState: prevOrderState || 'PROJECT' })
      store.execSQL(`UPDATE hr_order SET orderState = :orderState: WHERE ID = :ID:`, { ID: orderID, orderState: prevStaffTableState || 'PROJECT' })
      store.execSQL(`UPDATE hr_staffTable SET orderState = :orderState: WHERE ID = :ID:`, { ID: orderID, orderState: prevStaffTableState || 'PROJECT' })
      if (historyID) {
        const match = (err.message || '').match(/<<<(.*)>>>/)
        store.execSQL(`UPDATE hr_orderProcessingHistory SET timeStampEnd = :timeStampEnd:, description = :description: WHERE ID = :ID:`, {
          ID: historyID,
          timeStampEnd: dateService.currentDateTime(),
          description: match && match.length > 1 ? match[1] : err.message
        })
      }
      App.dbCommit()
    }
    throw new UB.UBAbort(err.message)
  }
  store.freeNative()
}

function doCancelPostingStaffTable (orderID, entityName) {
  const order = UB.Repository(entityName).attrs(['*']).selectById(orderID)
  const store = UB.DataStore(entityName)

  if (order.orderState === 'PROJECT') {
    const entName = entityName === 'STAFFLIST' ? UB.i18n('Штатний розпис вже розпроведений') : UB.i18n('Планування структури вже розпроведений')
    throw new UB.UBAbort(`<<<${entName}>>>`)
  }
  store.run('update', {
    execParams: {
      ID: orderID,
      entryOrderID: null,
      entryDate: order.orderDate,
      mi_modifyDate: order.mi_modifyDate,
      orderState: 'PROJECT'
    }
  })
}

function updateOrganization (data) {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const organization = UB.Repository('ac_organization').attrs(['ID', 'parentID', 'mi_deleteUser']).misc({ __allowSelectSafeDeleted: true }).where('ID', '=', data.mi_data_id).limit(1).selectSingle()
  const store = UB.DataStore('ac_organization')
  if (data.state === 'NEW') {
    if (data.mi_data_id === data.ID && organization) {
      store.run('delete', {
        isImportOperation: true,
        __skipOptimisticLock: true,
        entity: 'ac_organization',
        execParams: { ID: organization.ID }
      })
    }
    return
  }
  if (organization && organization.mi_deleteUser) {
    store.execSQL(`update ac_organization set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, { ID: organization.ID })
    store.execSQL(`update org_organization set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, { ID: organization.ID })
    store.execSQL(`update org_unit set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, { ID: organization.ID })
  }
  const existCode = data.code ? UB.Repository('ac_organization')
    .attrs(['ID'])
    .where('code', '=', data.code)
    .whereIf(organization, 'ID', '<>', organization ? organization.ID : 0)
    .limit(1)
    .selectSingle() : true
  const existEdrpo = data.EDRPOUCode ? UB.Repository('ac_organization')
    .attrs(['ID'])
    .where('code', '=', data.EDRPOUCode)
    .whereIf(organization, 'ID', '<>', organization ? organization.ID : 0)
    .limit(1)
    .selectSingle() : true
  const execParams = {
    ID: data.mi_data_id,
    organizationID: data.orgID,
    name: data.name,
    code: existCode ? (existEdrpo ? String(data.mi_data_id) : data.EDRPOUCode) : (data.code || String(data.mi_data_id)),
    taxCode: data.EDRPOUCode,
    fullName: data.fullName,
    nameGen: data.nameGen,
    nameDat: data.nameDat,
    fullNameGen: data.fullNameGen,
    fullNameDat: data.fullNameDat,
    description: data.description,
    OKPOCode: data.EDRPOUCode,
    hkved: data.hkved,
    ECBCode: data.ECBCode,
    hkvedS: data.hkvedS,
    hkoatuu: data.hkoatuu,
    hkoatuuS: data.hkoatuuS,
    hkopfg: data.hkopfg,
    hkopfgS: data.hkopfgS,
    hkou: data.hkou,
    hkouS: data.hkouS,
    dgoznNpr: data.dgoznNpr,
    kpol: data.kpol,
    riv: data.riv,
    decisionDate: data.decisionDate,
    decisionNumber: data.decisionNumber,
    dictDksuID: data.dictDksuID,
    hkatottg: data.hkatottg,
    dictSprStiID: data.dictSprStiID,
    showGlobal: data.showGlobal,
    mi_dateFrom: dateService.minDate()
  }

  if (data.parentUnitID && UB.Repository('org_unit').attrs(['ID']).selectById(data.parentUnitID)) {
    if (!organization || organization.parentID !== data.parentUnitID) {
      execParams.parentID = data.parentUnitID
    }
  }

  if (!execParams.OKPOCode && !organization) {
    execParams.OKPOCode = String(execParams.ID).substring(String(execParams.ID).length - 8)
  }
  const insertRow = () => {
    store.run(organization ? 'update' : 'insert', {
      isImportOperation: true,
      __skipOptimisticLock: true,
      entity: 'ac_organization',
      execParams: execParams
    })
  }
  try {
    // if (!organization || !organization.mi_deleteUser) {
    db.savepointWrap(insertRow)
    // }
  } catch (e) {}
  store.freeNative()
}

function updateDepartment (data) {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const department = UB.Repository('org_department').attrs(['ID', 'parentID', 'mi_deleteUser']).misc({ __allowSelectSafeDeleted: true }).where('ID', '=', data.mi_data_id).limit(1).selectSingle()
  const store = UB.DataStore('org_department')
  const execParams = {
    ID: data.mi_data_id,
    organizationID: data.orgID,
    name: data.name,
    code: data.code,
    fullName: data.fullName,
    nameGen: data.nameGen,
    nameDat: data.nameDat,
    fullNameGen: data.fullNameGen,
    fullNameDat: data.fullNameDat,
    description: data.description,
    mi_dateFrom: dateService.minDate()
  }
  if (data.parentUnitID && UB.Repository('org_unit').attrs(['ID']).selectById(data.parentUnitID)) {
    if ((department && department.parentID !== data.parentUnitID) || !department) {
      execParams.parentID = data.parentUnitID
    }
  }
  const insertRow = () => {
    store.run(department ? 'update' : 'insert', {
      __skipOptimisticLock: true,
      entity: 'org_department',
      execParams: execParams
    })
  }
  try {
    if (!department || !department.mi_deleteUser) {
      db.savepointWrap(insertRow)
    }
  } catch (e) {}
  store.freeNative()
}

function updatePosition (data) {

}

function updateEmployee (data) {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const employee = UB.Repository('org_employee').attrs(['ID', 'mi_deleteUser']).misc({ __allowSelectSafeDeleted: true }).where('ID', '=', data.ID).selectSingle()
  const store = UB.DataStore('org_employee')
  const execParams = {
    ID: data.ID,
    code: data.taxCode,
    organizationID: data.organizationID,
    lastName: data.lastName,
    firstName: data.firstName,
    middleName: data.middleName,
    birthDate: data.birthDate,
    sexType: (!data.sexType || data.sexType === 'N') ? '?' : (data.sexType === 'W' ? 'F' : 'M'),
    shortFIO: data.shortFIO,
    fullFIO: data.fullFIO
  }
  const insertRow = () => {
    store.run(employee ? 'update' : 'insert', {
      isImportOperation: true,
      byHR: true,
      __skipOptimisticLock: true,
      entity: 'org_employee',
      execParams: execParams
    })
  }
  try {
    if (!employee || !employee.mi_deleteUser) {
      db.savepointWrap(insertRow)
    }
  } catch (e) {
  }
  store.freeNative()
}

function updateProfession (data) {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const profession = UB.Repository('org_profession').attrs(['ID', 'mi_deleteUser']).misc({ __allowSelectSafeDeleted: true }).where('ID', '=', data.ID).selectSingle()
  const store = UB.DataStore('org_profession')
  const execParams = {
    ID: data.ID,
    code: data.code,
    name: data.name,
    fullName: data.fullName,
    nameGen: data.nameGen,
    nameDat: data.nameDat,
    fullNameGen: data.fullNameGen,
    fullNameDat: data.fullNameDat,
    description: data.description
  }
  const insertRow = () => {
    store.run(profession ? 'update' : 'insert', {
      isImportOperation: true,
      byHR: true,
      __skipOptimisticLock: true,
      entity: 'org_profession',
      execParams: execParams
    })
  }
  try {
    if (!profession || !profession.mi_deleteUser) {
      db.savepointWrap(insertRow)
    }
  } catch (e) {}
  store.freeNative()
}

function updateEmployeeOnStaff (employeePositionID, orgID) {
  if (settingsService.getByCode('hrSinkPosition', orgID)) {
    const sLang = global['hr_employeePosition'].entity.connectionConfig.supportLang
    const pos = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'employeeID', 'organizationID', 'departmentID', 'dictPositionID', 'dictPositionID.name', 'dictPositionID.fullName',
        'employeeNumberID.tabNum', 'workPlace', 'dateFrom', 'dateTo', 'description'])
      .selectById(employeePositionID)
    if (!pos || !pos.dictPositionID) {
      return
    }
    const store = UB.DataStore('org_employeeonstaff')
    const staff = UB.Repository('org_employeeonstaff')
      .attrs(['ID', 'employeeID', 'organizationID', 'staffUnitID', 'tabNo', 'employeeOnStaffType', 'mi_dateFrom', 'mi_dateTo', 'mi_deleteUser'])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(employeePositionID)
    if (staff && staff.mi_deleteUser) {
      store.execSQL(`UPDATE org_employeeonstaff SET mi_deleteDate = '9999-12-31', mi_deleteUser = null WHERE ID = :ID:`, {
        ID: staff.ID
      })
    }
    const storeStaffunit = UB.DataStore('org_staffunit')
    const storeEmployeeonstaff = UB.DataStore('org_employeeonstaff')
    let staffUnitID = UB.Repository('org_staffunit').attrs(['ID'])
      .where('organizationID', '=', pos.organizationID)
      .where('parentID', '=', pos.departmentID || pos.organizationID)
      .where('professionID', '=', pos.dictPositionID)
      .exists(UB.Repository('org_employeeonstaff')
        .correlation('staffUnitID', 'ID')
        .where('employeeID', '=', pos.employeeID)
      )
      .limit(1).selectScalar()
    if (!staffUnitID) {
      staffUnitID = storeStaffunit.generateID()
      const execParams = {
        ID: staffUnitID,
        organizationID: pos.organizationID,
        parentID: pos.departmentID || pos.organizationID,
        professionID: pos.dictPositionID,
        name: pos['dictPositionID.name'],
        fullName: pos['dictPositionID.fullName'] || pos['dictPositionID.name']

      }
      sLang.forEach(lang => {
        const suffix = '_' + lang + '^'
        execParams['name' + suffix] = pos['dictPositionID.name']
      })
      storeStaffunit.run('insert', {
        __skipOptimisticLock: true,
        entity: 'org_staffunit',
        execParams
      })
    }
    try {
      storeEmployeeonstaff.run(staff ? 'update' : 'insert', {
        entity: 'org_employeeonstaff',
        __skipOptimisticLock: true,
        execParams: {
          ID: pos.ID,
          employeeID: pos.employeeID,
          organizationID: pos.organizationID,
          staffUnitID,
          tabNo: pos['employeeNumberID.tabNum'],
          employeeOnStaffType: pos.workPlace || '4',
          mi_dateFrom: pos.dateFrom,
          mi_dateTo: pos.dateTo,
          description: pos.description
        }
      })
    } catch (e) {}
  }
}

function setEmpOrderAttrs (ctx, config) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const isExternal = execParams.isExternal === undefined ? instanceData.isExternal : execParams.isExternal
  const isGroup = execParams.isGroup === undefined ? instanceData.isGroup : execParams.isGroup
  const attrs = ctx.dataStore.entity.attributes
  config = config || {}

  if (!config.noSetDescription) {
    const attrDesc = attrs.description
    if (attrDesc) {
      const cs = attrDesc.customSettings
      if (cs && cs.compositeFields && cs.compositeFields.length) {
        execParams.description = entityBaseService.getCompositeAttributeValue(ctx, 'description', cs.compositeFields, cs.compositeSeparator, false)
      } else if (!execParams.description && execParams.paraID) {
        execParams.description = UB.Repository('hr_empOrderDet').attrs('description').where('ID', '=', execParams.paraID).select().get(0)
      }
    }
  }

  const attrIsExternal = attrs.isExternal
  if (attrIsExternal && ctx.mParams.method === 'insert' && execParams.isExternal === undefined) {
    execParams.isExternal = 0
  }

  const attrEmployeePositionID = attrs.employeePositionID
  let empPosIsNullable = true
  if (attrEmployeePositionID) {
    empPosIsNullable = attrEmployeePositionID.allowNull !== undefined ? attrEmployeePositionID.allowNull : true
    if (empPosIsNullable && (execParams.isExternal || (config.checkIsGroup && isGroup))) {
      execParams.employeePositionID = null
    }
  }
  const onDate = dateService.shiftDate(instanceData.dateFrom || new Date())
  if (execParams.employeePositionID) {
    const pos = UB.Repository('hr_employeePositionS')
      .attrs([
        'employeeNumberID',
        'employeeID',
        'employeeID.firstName',
        'employeeID.lastName',
        'employeeID.middleName',
        'departmentID',
        'positionID',
        'positionID.name',
        'employeeNumberID.tabNum',
        'departmentID.name',
        'dictPositionID.name'
      ])
      .where('ID', '=', execParams.employeePositionID)
      .joinCondition('positionID.mi_dateFrom', '<=', onDate)
      .joinCondition('positionID.mi_dateTo', '>=', onDate)
      .joinCondition('positionID.state', '=', 'ACTIVE')
      .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('departmentID.mi_dateFrom', '<=', onDate)
      .joinCondition('departmentID.mi_dateTo', '>=', onDate)
      .joinCondition('departmentID.state', '=', 'ACTIVE')
      .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
      .misc({ __allowSelectSafeDeleted: true })
      .select()
    let posName = pos.get('positionID.name')
    if (!posName) {
      if (pos.get('positionID')) {
        posName = UB.Repository('hr_position')
          .attrs('name')
          .where('ID', '=', pos.get('positionID'))
          .misc({ __mip_recordhistory_all: true })
          .select()
          .get('name') || ''
      } else {
        posName = pos.get('dictPositionID.name') || ''
      }
    }

    if (!execParams.firstName) {
      execParams.firstName = pos.get('employeeID.firstName')
    }
    if (!execParams.lastName) {
      execParams.lastName = pos.get('employeeID.lastName')
    }
    if (!execParams.middleName) {
      execParams.middleName = pos.get('employeeID.middleName')
    }
    let order
    if (!config.noSetEmpOrderType && !execParams.empOrderType && !instanceData.empOrderType && (execParams.orderID || execParams.paraID)) {
      if (execParams.paraID && execParams.paraID !== execParams.ID) {
        execParams.empOrderType = UB.Repository('hr_empOrderDet').attrs('empOrderType').where('ID', '=', execParams.paraID).selectScalar()
      } else {
        order = UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
        execParams.empOrderType = order.get('empOrderType')
      }
    }
    if (!execParams.organizationID && !instanceData.organizationID && execParams.orderID) {
      order = order || UB.Repository('hr_empOrder').attrs(['empOrderType', 'organizationID']).where('ID', '=', execParams.orderID).select()
      execParams.organizationID = order.get('organizationID')
    }

    execParams.employeeID = pos.get('employeeID')
    if (ctx.dataStore.entityCode !== 'hr_empOrderInternshipDet') {
      execParams.departmentID = pos.get('departmentID')
    }
    execParams.positionID = pos.get('positionID')
    execParams.employeeNumberID = pos.get('employeeNumberID')
    if (pos.get('departmentID.name')) {
      execParams.title = `${posName} ${pos.get('departmentID.name')} [${pos.get('employeeNumberID.tabNum')}]`
    } else {
      execParams.title = `${posName} [${pos.get('employeeNumberID.tabNum')}]`
    }
  } else {
    if (config.checkIsGroup && !isGroup) {
      if (execParams.employeePositionID !== undefined) {
        throw new UB.UBAbort(`<<<${UB.i18n('Не вказана посада')}>>>`)
      }
    } else {
      if (!empPosIsNullable && !isExternal && execParams.employeePositionID !== undefined && ctx.mParams.method === 'insert') {
        throw new UB.UBAbort(`<<<${UB.i18n('Не вказана посада')}>>>`)
      }
      if (ctx.mParams.method === 'insert' && !isExternal) {
        execParams.title = execParams.firstName = execParams.lastName = execParams.middleName = '..'
      }
      if (execParams.employeePositionID === null && !isExternal) {
        execParams.firstName = execParams.lastName = execParams.middleName = '..'
        execParams.employeeID = null
        execParams.employeeNumberID = null
        execParams.positionID = null
      } else {
        delete execParams.employeeID
        delete execParams.employeeNumberID
        delete execParams.positionID
        if (ctx.dataStore.entityCode !== 'hr_empOrderInternshipDet') {
          delete execParams.departmentID
        }
      }
    }
  }
}

function getEntityByEmpOrderType (empOrderType) {
  let typePart = empOrderType.toLowerCase()
  typePart = nameCase.cap(typePart)
  return `hr_empOrder${typePart}Det`
}

function doPostingChgSalary (orderID) {
  let onDateIdx
  const storeEmployeePosition = UB.DataStore('hr_employeePosition')
  const storeStaffTableChange = UB.DataStore('hr_staffTableChange')
  const staffTableChange = []
  UB.Repository('hr_empOrderChgsalaryDet')
    .attrs(['ID', 'dateFrom', 'dictReasonAccrualID.isIndexSalary'])
    .where('orderID', '=', orderID)
    .orderBy('dateFrom')
    .selectAsObject()
    .forEach(orderGroupDet => {
      const dateFrom = dateService.shiftDate(orderGroupDet.dateFrom)
      UB.Repository('hr_empOrderChgSalPosDet')
        .attrs(['ID', 'positionID', 'employeePositionID', 'employeePositionID.positionID', 'employeeNumberID',
          'employeeID', 'previousAccrualSum', 'accrualSum'])
        .where('orderID', '=', orderID)
        .where('paraID', '=', orderGroupDet.ID)
        .where('accrualSum', '>=', 0)
        .where('[employeePositionID.accrualSum] = [previousAccrualSum]', 'custom')
        .orderBy('employeePositionID.dateFrom')
        .selectAsObject()
        .forEach(empPos => {
          // Зміна призначень
          const empPositions = UB.Repository('hr_employeePositionS')
            .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'positionID', 'accrualSum', 'isActive', 'orderID',
              'changeOrderID', 'separationID'])
            .where('employeeNumberID', '=', empPos.employeeNumberID)
            // .where('dateTo', '>=', dateFrom)
            .orderBy('dateFrom')
            .orderBy('isActive')
            .misc({ __skipRls: true })
            .selectAsObject()
          onDateIdx = empPositions.findIndex(o => dateService.shiftDate(o.dateFrom) < dateFrom && dateService.shiftDate(o.dateTo) >= dateFrom)
          if (onDateIdx >= 0) {
            const posOnDate = empPositions[onDateIdx]
            const newID = storeEmployeePosition.generateID()
            entityBaseService.cloneInstance('hr_employeePosition', posOnDate.ID, {
              ID: newID,
              dateFrom: dateFrom,
              dateTo: posOnDate.dateTo,
              isActive: 1,
              orderID: orderID,
              changeOrderID: empPositions[onDateIdx + 1] ? empPositions[onDateIdx + 1].orderID : null,
              separationID: posOnDate.ID,
              accrualSum: empPos.accrualSum,
              raiseSalary: null,
              isIndex: orderGroupDet['dictReasonAccrualID.isIndexSalary'] ? 1 : 0
            }, true, { skipBefore: true })
            copyEmpPosFundSource({ priorID: posOnDate.ID, newID, isDirect: true })
            storeEmployeePosition.run('update', {
              skipBefore: true,
              __skipRls: true,
              __skipOptimisticLock: true,
              execParams: {
                ID: posOnDate.ID,
                changeOrderID: orderID,
                dateTo: dateService.shiftDate(posOnDate.dateFrom) < dateFrom ? dateService.addDays(dateFrom, -1) : dateFrom,
                isActive: dateService.shiftDate(posOnDate.dateFrom) < dateFrom ? posOnDate.isActive : 0
              }
            })
            for (let i = onDateIdx + 1; i < empPositions.length; i++) {
              const nextPos = empPositions[i]
              if (nextPos.positionID === empPos['employeePositionID.positionID'] && nextPos.accrualSum === empPos.previousAccrualSum) {
                storeEmployeePosition.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: nextPos.ID,
                    accrualSum: empPos.accrualSum
                  }
                })
                staffTableChange.push({
                  staffTableID: orderID,
                  entityName: 'hr_employeePosition',
                  entityID: nextPos.ID,
                  previousAccrualSum: nextPos.accrualSum,
                  accrualSum: empPos.accrualSum
                })
              }
            }
          } else {
            onDateIdx = empPositions.findIndex(o => dateService.shiftDate(o.dateFrom) >= dateFrom)
            if (onDateIdx >= 0) {
              const posOnDate = empPositions[onDateIdx]
              const newID = storeEmployeePosition.generateID()
              posOnDate.dateTo = dateService.shiftDate(posOnDate.dateTo)
              posOnDate.dateFrom = dateService.shiftDate(posOnDate.dateFrom)
              const createdLater = posOnDate.dateFrom > dateFrom
              entityBaseService.cloneInstance('hr_employeePosition', posOnDate.ID, {
                ID: newID,
                dateFrom: createdLater ? posOnDate.dateFrom : dateFrom,
                dateTo: createdLater ? posOnDate.dateFrom : dateFrom,
                isActive: 0,
                orderID: orderID,
                changeOrderID: posOnDate.dateTo > (createdLater ? posOnDate.dateFrom : dateFrom)
                  ? posOnDate.orderID
                  : empPositions[onDateIdx + 1] ? empPositions[onDateIdx + 1].orderID : null,
                separationID: posOnDate.ID,
                accrualSum: empPos.accrualSum,
                isIndex: orderGroupDet['dictReasonAccrualID.isIndexSalary'] ? 1 : 0
              }, true, { skipBefore: true })
              copyEmpPosFundSource({ priorID: posOnDate.ID, newID, isDirect: true })
              storeEmployeePosition.run('update', {
                skipBefore: true,
                __skipRls: true,
                __skipOptimisticLock: true,
                execParams: Object.assign({
                  ID: posOnDate.ID
                }, posOnDate.dateTo > (createdLater ? posOnDate.dateFrom : dateFrom) ? {
                  accrualSum: empPos.accrualSum,
                  dateFrom: createdLater ? posOnDate.dateFrom : dateFrom
                } : {
                  changeOrderID: orderID,
                  isActive: 0
                })
              })
              if (posOnDate.dateTo >= (createdLater ? posOnDate.dateFrom : dateFrom)) {
                staffTableChange.push({
                  staffTableID: orderID,
                  entityName: 'hr_employeePosition',
                  entityID: posOnDate.ID,
                  previousAccrualSum: posOnDate.accrualSum,
                  accrualSum: empPos.accrualSum
                })
                if (empPositions[onDateIdx - 1]) {
                  storeEmployeePosition.run('update', {
                    skipBefore: true,
                    __skipRls: true,
                    __skipOptimisticLock: true,
                    execParams: {
                      ID: empPositions[onDateIdx - 1].ID,
                      changeOrderID: orderID
                    }
                  })
                }
              }

              for (let i = onDateIdx + 1; i < empPositions.length; i++) {
                const nextPos = empPositions[i]
                if (nextPos.positionID === empPos['employeePositionID.positionID'] && nextPos.accrualSum === empPos.previousAccrualSum) {
                  storeEmployeePosition.run('update', {
                    skipBefore: true,
                    __skipRls: true,
                    __skipOptimisticLock: true,
                    execParams: {
                      ID: nextPos.ID,
                      accrualSum: empPos.accrualSum
                    }
                  })
                  staffTableChange.push({
                    staffTableID: orderID,
                    entityName: 'hr_employeePosition',
                    entityID: nextPos.ID,
                    previousAccrualSum: nextPos.accrualSum,
                    accrualSum: empPos.accrualSum
                  })
                }
              }
            }
          }
        })
    })
  staffTableChange.forEach(row => {
    storeStaffTableChange.run('insert', {
      __skipOptimisticLock: true,
      execParams: row
    })
  })
}

function doCancelPostingChgSalary (orderID) {
  const storeEmployeePosition = UB.DataStore('hr_employeePosition')
  const storeEmployeePositionDel = UB.DataStore('tim_plan')
  const storeStaffTableChange = UB.DataStore('hr_staffTableChange')
  const orderDet = UB.Repository('hr_empOrderChgsalaryDet').attrs(['dateFrom']).where('orderID', '=', orderID).limit(1).selectSingle()
  if (!orderDet) {
    return
  }
  const entryDate = dateService.shiftDate(orderDet.dateFrom)
  const staffTableChange = UB.Repository('hr_staffTableChange')
    .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
    .where('staffTableID', '=', orderID)
    .selectAsObject()
  UB.Repository('hr_employeePositionS').attrs(['employeeNumberID', 'positionID'])
    .where('orderID', '=', orderID)
    .groupBy(['employeeNumberID', 'positionID'])
    .misc({ __skipRls: true })
    .selectAsObject().forEach(position => {
      const positionHistory = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'positionID', 'accrualSum', 'isActive', 'orderID',
          'changeOrderID', 'separationID'])
        .misc({ __skipRls: true })
        .where('employeeNumberID', '=', position.employeeNumberID)
        .orderBy('dateFrom')
        .orderBy('isActive')
        .orderBy('dateTo')
        .orderBy('ID')
        .selectAsObject()
      let onDateIdx = positionHistory.findIndex(o => o.orderID === orderID)
      if (onDateIdx >= 0) {
        const posOnDate = positionHistory[onDateIdx]
        if (positionHistory[onDateIdx - 1]) {
          const changeOnPos = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === positionHistory[onDateIdx - 1] &&
          o.accrualSum === positionHistory[onDateIdx - 1].accrualSum)
          storeEmployeePosition.run('update', {
            skipBefore: true,
            __skipRls: true,
            __skipOptimisticLock: true,
            execParams: Object.assign({
              ID: positionHistory[onDateIdx - 1].ID,
              changeOrderID: positionHistory[onDateIdx + 1] ? positionHistory[onDateIdx + 1].orderID : null
            }, (positionHistory[onDateIdx - 1].ID === posOnDate.separationID || positionHistory[onDateIdx - 1].separationID === posOnDate.separationID ||
            posOnDate.ID === positionHistory[onDateIdx - 1].separationID) ? {
                dateTo: dateService.shiftDate((positionHistory[onDateIdx - 1].ID === posOnDate.separationID || positionHistory[onDateIdx - 1].separationID === posOnDate.ID ||
              posOnDate.separationID === positionHistory[onDateIdx - 1].separationID)
                  ? posOnDate.dateTo
                  : positionHistory[onDateIdx - 1].dateTo),
                accrualSum: (positionHistory[onDateIdx - 1].ID === posOnDate.separationID && changeOnPos) ? changeOnPos.previousAccrualSum : positionHistory[onDateIdx - 1].accrualSum,
                separationID: posOnDate.ID === positionHistory[onDateIdx - 1].separationID ? posOnDate.separationID : positionHistory[onDateIdx - 1].separationID,
                isActive: (positionHistory[onDateIdx + 1] && dateService.shiftDate(posOnDate.dateTo).getTime() === dateService.shiftDate(positionHistory[onDateIdx + 1].dateFrom).getTime()) ? 0 : 1
              } : {})
          })
          if (posOnDate.separationID) {
            const staffTableNextChange = UB.Repository('hr_staffTableChange')
              .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
              .where('entityName', '=', 'hr_employeePosition')
              .where('entityID', '=', posOnDate.separationID)
              .where('staffTableID', '=', positionHistory[onDateIdx - 1].orderID)
              .selectAsObject()
            const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === posOnDate.separationID)
            if (staffTableNextChange.length && change) {
              staffTableNextChange.forEach(row => {
                storeStaffTableChange.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    accrualSum: change.accrualSum
                  }
                })
              })
            }
          }
        }
        if (positionHistory[onDateIdx + 1] && (positionHistory[onDateIdx + 1].ID === posOnDate.separationID || positionHistory[onDateIdx + 1].separationID === posOnDate.separationID ||
        posOnDate.ID === positionHistory[onDateIdx + 1].separationID || (positionHistory[onDateIdx - 1] && positionHistory[onDateIdx - 1].separationID === positionHistory[onDateIdx + 1].ID))) {
          const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === positionHistory[onDateIdx + 1].ID)
          storeEmployeePosition.run('update', {
            skipBefore: true,
            __skipRls: true,
            __skipOptimisticLock: true,
            execParams: {
              ID: positionHistory[onDateIdx + 1].ID,
              separationID: posOnDate.ID === positionHistory[onDateIdx + 1].separationID ? posOnDate.separationID : positionHistory[onDateIdx + 1].separationID,
              dateFrom: dateService.shiftDate(positionHistory[onDateIdx + 1].ID === posOnDate.separationID ? posOnDate.dateFrom : positionHistory[onDateIdx + 1].dateFrom),
              isActive: (positionHistory[onDateIdx + 2] && dateService.shiftDate(positionHistory[onDateIdx + 1].dateTo).getTime() === dateService.shiftDate(positionHistory[onDateIdx + 2].dateFrom).getTime()) ? 0 : 1,
              accrualSum: change
                ? change.previousAccrualSum
                : ((positionHistory[onDateIdx - 1] && dateService.shiftDate(posOnDate.dateTo).getTime() === dateService.shiftDate(positionHistory[onDateIdx + 1].dateFrom).getTime())
                  ? positionHistory[onDateIdx - 1].accrualSum
                  : positionHistory[onDateIdx + 1].accrualSum)
            }
          })
          if (posOnDate.separationID) {
            const staffTableNextChange = UB.Repository('hr_staffTableChange')
              .attrs(['ID', 'entityName', 'entityID', 'previousAccrualSum', 'accrualSum'])
              .where('entityName', '=', 'hr_employeePosition')
              .where('entityID', '=', posOnDate.separationID)
              .where('staffTableID', '=', positionHistory[onDateIdx + 1].orderID)
              .selectAsObject()
            const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === posOnDate.separationID)
            if (staffTableNextChange.length && change) {
              staffTableNextChange.forEach(row => {
                storeStaffTableChange.run('update', {
                  skipBefore: true,
                  __skipRls: true,
                  __skipOptimisticLock: true,
                  execParams: {
                    ID: row.ID,
                    previousAccrualSum: change.previousAccrualSum
                  }
                })
              })
            }
          }
        }
        storeEmployeePositionDel.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = :deleteDate:, mi_deleteUser = :userID:
                WHERE ID = :ID: `, { deleteDate: new Date(), userID: Session.uData.userID, ID: posOnDate.ID })

        for (let i = onDateIdx + 1; i < positionHistory.length; i++) {
          const nextPos = positionHistory[i]
          const change = staffTableChange.find(o => o.entityName === 'hr_employeePosition' && o.entityID === nextPos.ID && o.accrualSum === nextPos.accrualSum)
          if (change && !UB.Repository('hr_staffTableChange')
            .attrs(['ID'])
            .where('entityName', '=', 'hr_employeePosition')
            .where('entityID', '=', nextPos.ID)
            .where('staffTableID', '!=', orderID)
            .where('staffTableID.entryDate', '<', entryDate)
            .selectAsObject().length) {
            storeEmployeePosition.run('update', {
              skipBefore: true,
              __skipRls: true,
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPos.ID,
                accrualSum: change.previousAccrualSum
              }
            })
          }
        }
      }
    })
  staffTableChange.forEach(row => {
    storeStaffTableChange.run('delete', {
      __skipOptimisticLock: true,
      execParams: { ID: row.ID }
    })
  })
  let position = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
    .where('orderID', '=', orderID)
    .misc({ __skipRls: true })
    .limit(1)
    .selectSingle()
  while (position) {
    const next = position.changeOrderID ? (UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
      .where('employeeNumberID', '=', position.employeeNumberID)
      .where('orderID', '=', position.changeOrderID)
      .misc({ __skipRls: true })
      .limit(1).selectSingle() || {}) : {}
    const prior = (UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
      .where('employeeNumberID', '=', position.employeeNumberID)
      .where('changeOrderID', '=', orderID)
      .misc({ __skipRls: true })
      .limit(1).selectSingle() || {})

    if (prior.ID) {
      const execParams = {
        ID: prior.ID
      }
      if (prior.ID === position.separationID || prior.separationID === position.separationID) {
        execParams.dateTo = dateService.shiftDate(position.dateTo)
        if (next.ID && execParams.dateTo < dateService.addDays(dateService.shiftDate(next.dateFrom), -1)) {
          execParams.dateTo = dateService.addDays(dateService.shiftDate(next.dateFrom), -1)
        }
      }
      execParams.changeOrderID = next.ID ? next.orderID : null
      storeEmployeePosition.run('update', {
        skipBefore: true,
        __skipRls: true,
        __skipOptimisticLock: true,
        execParams
      })
    }
    if (next.ID) {
      const execParams = {
        ID: next.ID
      }
      if (next.ID === position.separationID || next.separationID === position.separationID) {
        execParams.dateFrom = dateService.shiftDate(position.dateFrom)
        if (prior.ID && execParams.dateFrom > dateService.addDays(dateService.shiftDate(prior.dateTo), 1)) {
          execParams.dateFrom = dateService.addDays(dateService.shiftDate(prior.dateTo), 1)
        }
      }
      storeEmployeePosition.run('update', {
        skipBefore: true,
        __skipRls: true,
        __skipOptimisticLock: true,
        execParams
      })
    }
    storeEmployeePositionDel.execSQL(`UPDATE hr_employeePosition SET mi_deleteDate = :deleteDate:, mi_deleteUser = :userID:
                WHERE ID = :ID: `, { deleteDate: new Date(), userID: Session.uData.userID, ID: position.ID })

    position = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeNumberID', 'positionID', 'separationID', 'dateFrom', 'dateTo', 'orderID', 'changeOrderID'])
      .where('orderID', '=', orderID)
      .misc({ __skipRls: true })
      .limit(1)
      .selectSingle()
  }
//  throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ<br>')}>>>`)
}

function insertByOrder ({ store, params, saved, isImportOperation = false, mParams = {} }) {
  if (!store || !params || !saved) {
    throw new UB.UBAbort('<<<hr_empOrder.js->insertByOrder() - not full parameter list given>>>')
  }
  if (_.isString(store)) {
    store = UB.DataStore(store)
  }
  // params.changeOrderID = null

  if (store.entity.attributes.changeOrderID && params.changeOrderID === undefined) {
    throw new UB.UBAbort(`<<<hr_empOrder.js->insertByOrder() - for entity ${store.entity.code} param changeOrderID should be specified >>>`)
  }

  if (!params.ID) {
    params.ID = store.generateID()
  }
  store.run('insert', Object.assign({
    __skipSelectAfterInsert: true,
    isOrderOperation: true,
    isImportOperation: isImportOperation,
    execParams: params
  }, mParams))
  if (!saved.inserted) {
    saved.inserted = []
  }
  const savedObj = {}
  savedObj[store.entity.name] = params.ID
  saved.inserted.push(savedObj)
  return params.ID
}

function updateByOrder ({ store, params, saved, oldValues, mParams = {} }) {
  if (!store || !params || !saved || !oldValues) {
    throw new UB.UBAbort('<<<hr_empOrder.js->updateByOrder() - not full parameter list given>>>')
  }
  if (_.isString(store)) {
    store = UB.DataStore(store)
  }
  if (store.entity.attributes.changeOrderID) {
    if (params.changeOrderID === -1) { // явно укажем что не надо, см case 'VACATIONLONG при проведении, UBHR-7626
      delete params.changeOrderID
      delete oldValues.changeOrderID
    } else
    if (!params.changeOrderID || oldValues.changeOrderID === undefined) {
      throw new UB.UBAbort(`<<<hr_empOrder.js->updateByOrder() - for entity ${store.entity.code} param changeOrderID should be specified in params and oldValues>>>`)
    }
  }

  store.run('update', Object.assign({
    __skipOptimisticLock: true,
    isOrderOperation: true,
    execParams: params
  }, mParams))
  if (!saved.updated) {
    saved.updated = []
  }
  if (!oldValues.ID) {
    oldValues.ID = params.ID
  }
  const savedObj = {}
  savedObj[store.entity.name] = oldValues
  saved.updated.push(savedObj)
  return saved
}

function deleteByOrder ({ store, params, saved }) {
  if (!store || !params || !saved) {
    throw new UB.UBAbort('<<<hr_empOrder.js->deleteByOrder() - not full parameter list given>>>')
  }
  if (!params.ID) {
    throw new UB.UBAbort('<<<hr_empOrder.js->deleteByOrder() - ID should be specified>>>')
  }
  if (_.isString(store)) {
    store = UB.DataStore(store)
  }
  let savedObj = {}
  if (!store.entity.mixins.safeDelete) {
    savedObj[store.entity.name] = UB.Repository(store.entity.name).attrs('*').selectById(params.ID)
  } else {
    savedObj[store.entity.name] = { ID: params.ID }
  }
  store.run('delete', {
    isOrderOperation: true,
    execParams: {
      ID: params.ID
    }
  })
  if (!saved.deleted) {
    saved.deleted = []
  }
  saved.deleted.push(savedObj)
  return saved
}

function createEmployeePosition ({ para, saved, priorID, isCreateWorkBookRecord, isImportOperation = false, isNotCheckPosition = false, mParams = {} }) {
  if (para.asJSONObject) {
    para = JSON.parse(para.asJSONObject)[0]
  }
  const funcName = 'createEmployeePosition'
  const execParams = {}
  const defaultParams = {
    employeeNumberID: { allowNull: false },
    employeeID: { allowNull: false },
    organizationID: { allowNull: false, map: 'organizationID.mi_data_id' },
    departmentID: { allowNull: true, map: 'departmentID.mi_data_id' },
    positionID: { allowNull: true, map: 'positionID.mi_data_id' },
    workerType: { allowNull: true },
    workPlace: { allowNull: true },
    contractType: { allowNull: true },
    mtCount: { allowNull: true },
    dictContractKindID: { allowNull: true },
    dictTarifCoeffID: { allowNull: true },
    dictRankID: { allowNull: true, allowEmpty: true },
    isResponsible: { allowNull: true },
    orderID: { allowNull: false },
    payElID: { allowNull: true },
    accrualSum: { allowNull: true },
    changeOrderID: { allowNull: true },
    dateFrom: { allowNull: false },
    dateTo: { allowNull: false },
    dictTrialPeriodID: { allowNull: true, allowEmpty: true },
    dateTrialEnd: { allowNull: true, allowEmpty: true },
    // ------------------------
    dictCategoryECBID: { allowNull: true, allowEmpty: true },
    dictFundSourceID: { allowNull: true, allowEmpty: true },
    accountID: { allowNull: true, allowEmpty: true },
    workScheduleID: { allowNull: true, allowEmpty: true },
    dictStaffCatID: { allowNull: true, allowEmpty: true },
    // ------------------------
    dateNew: { allowNull: true, allowEmpty: true },
    d0: { allowNull: true, allowEmpty: true },
    d0Value: { allowNull: true, allowEmpty: true },
    d1: { allowNull: true, allowEmpty: true },
    d1Value: { allowNull: true, allowEmpty: true },
    d2: { allowNull: true, allowEmpty: true },
    d2Value: { allowNull: true, allowEmpty: true },
    d3: { allowNull: true, allowEmpty: true },
    d3Value: { allowNull: true, allowEmpty: true },
    d4: { allowNull: true, allowEmpty: true },
    d4Value: { allowNull: true, allowEmpty: true },
    d5: { allowNull: true, allowEmpty: true },
    d5Value: { allowNull: true, allowEmpty: true },
    d6: { allowNull: true, allowEmpty: true },
    d6Value: { allowNull: true, allowEmpty: true },
    d7: { allowNull: true, allowEmpty: true },
    d7Value: { allowNull: true, allowEmpty: true },
    d8: { allowNull: true, allowEmpty: true },
    d8Value: { allowNull: true, allowEmpty: true },
    d9: { allowNull: true, allowEmpty: true },
    d9Value: { allowNull: true, allowEmpty: true },
    raiseSalary: { allowNull: true, allowEmpty: true },
    isIndex: { allowNull: true, allowEmpty: true },
    separationID: { allowNull: true, allowEmpty: true },
    dictWagePayID: { allowNull: true, allowEmpty: true },
    dictPositionID: { allowNull: true, allowEmpty: true },
    departmentHistoryID: { allowNull: true, allowEmpty: true },
    planDateTo: { allowNull: true, allowEmpty: true },
    changedValues: { allowNull: true, allowEmpty: true },
    planHours: { allowNull: true, allowEmpty: true },
    dictEmpCategoryID: { allowNull: true, allowEmpty: true },
    posNameAddition: { allowNull: true, allowEmpty: true }
  }
  for (const param in defaultParams) {
    // eslint-disable-next-line no-prototype-builtins
    if (defaultParams.hasOwnProperty(param)) {
      const attr = defaultParams[param].map || param
      if (para[attr] === undefined) {
        if (!defaultParams[param].allowEmpty) {
          throw new UB.UBAbort(`<<<orderService.${funcName}()->param ${param} is undefined. It ${defaultParams[param].allowNull ? '' : 'not'} can be null >>>`)
        }
      } else
      if (para[attr] === null) {
        if (!defaultParams[param].allowNull) {
          throw new UB.UBAbort(`<<<orderService.${funcName}()->param ${param} is null. It not can be null >>>`)
        }
      }
      if (para[attr] !== undefined) {
        execParams[param] = para[attr]
      }
    }
  }
  if (!execParams.accrualSum) {
    execParams.accrualSum = 0
  }
  if (para.appointOrder) {
    execParams.appointOrder = para.appointOrder
  }
  if (para.appointReason) {
    execParams.appointReason = para.appointReason
  }
  if (!execParams.paraID) {
    execParams.paraID = para.ID || para.paraID
  }
  if (!execParams.paraID) {
    throw new UB.UBAbort(`<<<orderService.${funcName}()->param "paraID" should be specified>>>`)
  }
  execParams.changeOrderID = null
  let resultID = insertByOrder({
    isImportOperation: isImportOperation,
    store: 'hr_employeePosition',
    params: execParams,
    saved: saved,
    mParams: Object.assign({
      isNotCheckPosition: isNotCheckPosition
    }, mParams)
  })
  if (priorID) {
    // copy fund sources from prior item
    copyEmpPosFundSource({ priorID, newID: resultID, saved })
  }
  if (isCreateWorkBookRecord) {
    isCreateWorkBookRecord && createWorkbookRecord({
      employeePositionID: resultID,
      dateFrom: para.dateFrom,
      dateTo: para.dateTo,
      appointOrder: para.appointOrder,
      appointReason: para.appointReason,
      isOrgAppoint: para.isOrgAppoint || mParams.isOrgAppoint,
      dateTrialEnd: para.dateTrialEnd,
      employeeID: para.employeeID,
      positionType: mParams.positionType,
      workPosition: mParams.workPosition,
      positionCategory: mParams.positionCategory,
      workPlace: mParams.workPlace,
      orderID: para.orderID,
      organizationID: execParams.organizationID,
      empWorkPlace: para.workPlace,
      mtCount: para.mtCount || 1
    }, saved)
  }
  return resultID
}

function copyEmpPosFundSource ({ priorID, newID, isDirect = false, saved = null }) {
  const empPosFundSource = UB.Repository('hr_empPosFundSource')
    .attrs('employeeNumberID', 'dictFundSourceID', 'mtCount')
    .where('employeePositionID', '=', priorID)
    .selectAsObject()
  const store = UB.DataStore('hr_empPosFundSource')
  empPosFundSource.forEach(fs => {
    if (!isDirect && saved) {
      insertByOrder({
        store: 'hr_empPosFundSource',
        params: {
          employeePositionID: newID,
          employeeNumberID: fs.employeeNumberID,
          dictFundSourceID: fs.dictFundSourceID,
          mtCount: fs.mtCount
        },
        saved: saved
      })
    } else {
      store.run('insert', {
        execParams: {
          employeePositionID: newID,
          employeeNumberID: fs.employeeNumberID,
          dictFundSourceID: fs.dictFundSourceID,
          mtCount: fs.mtCount
        }
      })
    }
  })
  store.freeNative()
}

function createRank ({ para, saved, order, dateNext }) {
  closeRank({ para, saved })

  let rank = UB.Repository('hr_dictRank')
    .attrs(['ID', 'rankType', 'code'])
    .selectById(para.dictRankID)
  if (!dateNext) {
    dateNext = (rank.rankType === 'COMMON' && rank.code === '1') ? para.dateFrom : dateService.addYears(para.dateFrom, 3)
  }
  return insertByOrder({
    store: 'hr_publServRang',
    params: {
      dictRankID: para.dictRankID,
      dateFrom: para.dateFrom,
      employeeID: para.employeeID,
      dateNext,
      dateTo: dateService.maxDate(),
      orderDate: order.orderDate,
      orderNumber: order.orderNumberFull || order.orderNumber,
      orderID: order.ID,
      rankAssignKindID: para.rankAssignKindID || null
    },
    saved: saved
  })
}

function closeRank ({ para, saved, isSameDate = false }) {
  if (para.asJSONObject) {
    para = JSON.parse(para.asJSONObject)[0]
  }
  const closeDate = isSameDate ? para.dateFrom : dateService.addDays(para.dateFrom, -1)

  const rank = UB.Repository('hr_publServRang').attrs(['ID', 'dateFrom', 'dateTo', 'dateNext', 'mi_modifyDate', 'employeeID.fullFIO']).where('employeeID', '=', para.employeeID).orderByDesc('dateFrom').limit(1).selectSingle()
  if (rank) {
    if (dateService.shiftDate(closeDate) < dateService.shiftDate(rank.dateFrom)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо закрити ранг у особи {0} датою {1}. Дата початку {2}', rank['employeeID.fullFIO'], moment(closeDate).format('DD.MM.YYYY'), moment(rank.dateFrom).format('DD.MM.YYYY'))}>>>`)
    }
    updateByOrder({
      store: 'hr_publServRang',
      params: {
        ID: rank.ID,
        dateTo: closeDate
      },
      oldValues: {
        ID: rank.ID,
        dateTo: rank.dateTo
      },
      saved: saved
    })
  }
}

function createWorkbookRecord ({
  ID = null,
  employeePositionID,
  workPlace = null,
  workPosition = null,
  dateFrom = null,
  dateTo = null,
  organizationID = null,
  employeeID = null,
  orderID = null,
  dateTrialEnd = null,
  positionType = '1',
  appointOrder = undefined,
  appointReason = undefined,
  isOrgAppoint = undefined,
  positionCategory = undefined,
  empWorkPlace = '1',
  mtCount = 1
}, saved) {
  let execParams = {}
  Object.assign(execParams, arguments[0])
  for (let attr in execParams) {
    if (execParams.hasOwnProperty(attr) && execParams[attr] === undefined) {
      delete execParams[attr]
    }
  }
  if (!workPlace) {
    let org = UB.Repository('hr_organization')
      .attrs(['ID', 'description', 'name'])
      .where('state', '=', 'ACTIVE')
      .where('mi_data_id', '=', organizationID)
      .misc({ __mip_ondate: dateFrom })
      .limit(1)
      .selectSingle()
    if (!org) {
      org = UB.Repository('hr_organization')
        .attrs(['ID', 'description', 'name'])
        .where('state', '=', 'ACTIVE')
        .where('mi_data_id', '=', organizationID)
        .orderBy('mi_dateTo', 'desc')
        .misc({ __mip_recordhistory_all: true })
        .limit(1)
        .selectSingle()
    }
    workPlace = org.name
    execParams.workPlace = org.name
  }
  if (employeePositionID && execParams.workPosition) {
    const isOrderActualPositionName = settingsService.getByCode('hrOrderActualPositionName', organizationID)
    if (isOrderActualPositionName) {
      const factPositionName = getEmployeeFactPositionName(employeePositionID, dateFrom)
      if (factPositionName) execParams.workPosition = factPositionName
    }

    const dictPosition = UB.Repository('hr_employeePosition')
      .attrs(['ID', 'dictPositionID.dictProfessionID'])
      .selectById(employeePositionID)
    if (dictPosition && dictPosition['dictPositionID.dictProfessionID']) {
      execParams.dictProfessionID = dictPosition['dictPositionID.dictProfessionID']
    }
  }
  if (!workPlace || !dateFrom || !dateTo || !employeeID || !orderID || !organizationID) {
    throw new UB.UBAbort(`<<<orderService.setWorkbook() - on insert must specify full paramList but have ${JSON.stringify(execParams)}>>>`)
  }
  delete execParams.orderID
  insertByOrder({ store: 'hr_employeeWorkbook', params: execParams, saved: saved })
}

function findWorkbookRecord (employeePositionID, onDate) {
  const wbFieldList = ['ID', 'dateTo', 'dateFrom', 'dismOrder', 'dischargeReason', 'isOrgDismiss']
  let wb = UB.Repository('hr_employeeWorkbook').attrs(wbFieldList).where('employeePositionID', '=', employeePositionID).limit(1).selectSingle()
  if (wb) {
    return wb
  }
  let pos = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'dateFrom', 'employeeNumberID'])
    .where('ID', '=', employeePositionID)
    .misc({ __skipRls: true }).selectSingle()
  if (!pos) {
    return null
  }
  pos = UB.Repository('hr_employeePositionS').attrs(['ID', 'dateFrom', 'employeeNumberID'])
    .where('employeeNumberID', '=', pos.employeeNumberID)
    .where('dateFrom', '<', pos.dateFrom)
    .orderBy('dateFrom', 'desc')
    .selectAsObject()
  if (!pos) {
    return null
  }
  for (let i = 0, len = pos.length; i < len; i++) {
    wb = UB.Repository('hr_employeeWorkbook').attrs(wbFieldList)
      .where('employeePositionID', '=', pos[i].ID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .orderBy('dateTo', 'desc')
      .limit(1)
      .selectSingle()
    if (wb) {
      return wb
    }
  }
  return null
}

function closeWorkbookRecord ({
  employeePositionID,
  dateTo = null,
  organizationID = null,
  dismOrder = undefined,
  dischargeReason = undefined,
  isOrgDismiss = false
}, saved) {
  let wb = findWorkbookRecord(employeePositionID, dateService.shiftDate(dateTo))
  if (!wb) {
    return
  }

  if (dateService.shiftDate(new Date(wb.dateTo)) > dateService.shiftDate(dateTo) &&
    dateService.shiftDate(new Date(wb.dateFrom)) <= dateService.shiftDate(dateTo)
  ) {
    updateByOrder({
      store: 'hr_employeeWorkbook',
      params: {
        ID: wb.ID,
        dateTo: dateTo,
        dismOrder: dismOrder,
        dischargeReason: dischargeReason,
        isOrgDismiss: isOrgDismiss
      },
      saved: saved,
      oldValues: wb
    })
  }
}

function closeEmployeePosition ({ params, saved, oldValues = {}, mParams = {}, closeWorkbook = true }) {
  const funcName = 'closeEmployeePosition'
  if (!params.changeOrderID) {
    throw new UB.UBAbort(`<<<orderService.${funcName}()-> no  changeOrderID param specified>>>`)
  }
  if (!oldValues) {
    throw new UB.UBAbort(`<<<orderService..${funcName}()-> no  oldValues specified>>>`)
  }
  if (!params.ID) {
    throw new UB.UBAbort(`<<<orderService..${funcName}()-> no  ID param specified>>>`)
  }

  if (oldValues.dateFrom === undefined || oldValues.dateTo === undefined || oldValues.changeOrderID === undefined) {
    oldValues = UB.Repository('hr_employeePositionS')
      .attrs(['dateFrom', 'dateTo', 'changeOrderID', 'mi_deleteDate', 'description', 'isActive'])
      .misc({ __allowSelectSafeDeleted: true })
      .selectById(params.ID)
    if (!oldValues) {
      throw new UB.UBAbort(`<<<${UB.i18n('Посаду не знайдено, виберіть ще раз.')}>>>`)
    }
    if (new Date(oldValues.mi_deleteDate).getFullYear() !== 9999) {
      throw new UB.UBAbort(`<<<${UB.i18n('Посаду {0} було  було видалено, можливо, внаслідок розпроведення наказу, в якому вона була створена. Виберіть ще раз.', oldValues.description)}>>>`)
    }
    delete oldValues.mi_deleteDate
    delete oldValues.description
  }
  updateByOrder({ store: 'hr_employeePosition', params: params, saved: saved, oldValues: oldValues })
  if (closeWorkbook) {
    closeWorkbookRecord({
      employeePositionID: params.ID,
      dateTo: params.dateTo,
      dismOrder: params.dismOrder,
      dischargeReason: params.dischargeReason,
      isOrgDismiss: mParams.isOrgDismiss
    }, saved)
  }
  return saved
}

function cloneEmployeePosition ({ employeePositionID, params = {}, saved }) {
  const posAttrs = global.hr_employeePositionS.entity.attributes
  const attrList = Object.keys(posAttrs).filter(attr => attr.indexOf('mi_') !== 0 && !posAttrs[attr].mapping)
  if (!params.appointReason) {
    throw new UB.UBAbort(`<<<${UB.i18n('clonePosition() - appointReason should be specified')}>>>`)
  }
  if (!params.dateFrom) {
    throw new UB.UBAbort(`<<<${UB.i18n('clonePosition() - dateFrom should be specified')}>>>`)
  }
  if (!params.dateTo) {
    throw new UB.UBAbort(`<<<${UB.i18n('clonePosition() - dateTo should be specified')}>>>`)
  }
  attrList.push('mi_deleteDate')
  const pos = UB.Repository('hr_employeePositionS')
    .attrs(attrList)
    .where('ID', '=', employeePositionID)
    .misc({ __allowSelectSafeDeleted: true })
    .limit(1)
    .selectSingle()
  if (!pos || new Date(pos.mi_deleteDate).getFullYear() !== 9999) {
    throw new UB.UBAbort(`<<<${UB.i18n('Призначення {0} було видалено, можливо, в результаті розпроведення відповідного наказу. Небхідно перенабрати пункт наказу про подовження довготривалої відпустки', pos ? pos.description : '')}>>>`)
  }
  pos['organizationID.mi_data_id'] = pos.organizationID
  pos['departmentID.mi_data_id'] = pos.departmentID
  pos['positionID.mi_data_id'] = pos.positionID
  const execParams = Object.assign(pos, params)
  delete execParams.ID
  const newID = createEmployeePosition({
    para: execParams,
    saved: saved,
    isCreateWorkBookRecord: false,
    isImportOperation: false,
    isNotCheckPosition: true
  })
  copyEmpPosFundSource({ priorID: employeePositionID, newID, saved })
  return newID
}

function createOrderAccrual ({ para, saved, isClosePrev, skipAutoCalcCondition = false, isAddMethod74 = false, skipNonClosable = false }) {
  if (isClosePrev) {
    closeAccrual({ para, saved, skipNonClosable })
  }

  let accrual = UB.Repository('hr_empOrderAcc')
    .attrs(['ID', 'empOrderDetID', 'empOrderID', 'payElID', 'payElID.isAutoCalc', 'payElID.methodID.methodGroupID.groupType',
      'dateFrom', 'dateTo', 'dateToEmpty', 'accrualSum', 'accrualRate'])
    .where('empOrderDetID', '=', para.ID)
    .whereIf(!skipAutoCalcCondition, 'payElID.isAutoCalc', '=', 1)
    .where('isAutoNotClose', '=', 0)
    .where('payElID.methodID.methodGroupID.code', '!=', '1', 'methodGroupCode')
    .whereIf(isAddMethod74, 'payElID.methodID.code', '=', '74', 'methodCode')
    .where('payElID.methodID.methodGroupID.groupType', '=', 'PAYMENT')
  if (isAddMethod74) {
    accrual.logic('(([methodGroupCode]) OR ([methodCode]))')
  }
  accrual = accrual.selectAsObject()
  accrual.forEach(accrualItem => {
    if (!isClosePrev) {
      const dateTo = para.empOrderType === 'DISM' ? new Date(para.dateFrom) : dateService.addDays(para.dateFrom, -1)
      const existedAccrual = UB.Repository('hr_employeeAccrual')
        .attrs(['ID', 'dateTo', 'changeOrderID'])
        .where('employeeNumberID', '=', para.employeeNumberID)
        .where('dateFrom', '<=', para.dateFrom)
        .where('dateTo', '>=', para.dateFrom)
        .where('payElID', '=', accrualItem.payElID)
        .selectAsObject()
      if (existedAccrual.length) {
        existedAccrual.forEach(existedAccrualItem => {
          updateByOrder({
            store: 'hr_employeeAccrual',
            params: {
              ID: existedAccrualItem.ID,
              dateTo: dateTo,
              changeOrderID: para.orderID
            },
            oldValues: {
              dateTo: existedAccrualItem.dateTo,
              changeOrderID: existedAccrualItem.changeOrderID
            },
            saved: saved
          })
        })
      }
    }
    insertByOrder({
      store: 'hr_employeeAccrual',
      params: {
        employeeID: para.employeeID,
        employeeNumberID: para.employeeNumberID,
        payElID: accrualItem.payElID,
        dateFrom: accrualItem.dateFrom,
        dateTo: accrualItem.dateTo,
        accrualSum: accrualItem.accrualSum,
        accrualRate: accrualItem.accrualRate,
        // raiseSalary: para.raiseSalary || null,
        orderID: para.orderID,
        changeOrderID: null
      },
      saved: saved
    })
  })
}

function closeAccrual ({ para, saved, skipNonClosable }) {
  const accrual = UB.Repository('hr_employeeAccrual')
    .attrs(['ID', 'dateTo', 'changeOrderID'])
    .where('employeeNumberID', '=', para.employeeNumberID)
    .whereIf(skipNonClosable, 'payElID.notCloseOnChangeEmpPos', '!=', 1)
    .where('dateFrom', '<=', para.dateFrom)
    .where('dateTo', '>=', para.dateFrom)
    .selectAsObject()
  const dateTo = (para.empOrderType === 'DISM' || para.empOrderType === 'OUTPLURAL') ? new Date(para.dateFrom) : dateService.addDays(para.dateFrom, -1)
  accrual.forEach(accrualItem => {
    updateByOrder({
      store: 'hr_employeeAccrual',
      params: {
        ID: accrualItem.ID,
        dateTo: dateTo,
        changeOrderID: para.orderID
      },
      oldValues: {
        dateTo: accrualItem.dateTo,
        changeOrderID: accrualItem.changeOrderID
      },
      saved: saved
    })
  })
}

function replaceAccrual ({ employeeNumberID, payElID, dateFrom, dateTo, accrualSum, accrualRate, employeeID, orderID, saved, orderNumber, orderDate, dictFundSourceID }) {
  if (!saved) {
    throw new UB.UBAbort('<<<hr_empOrder.replaceAccrual()-> saved param must be provided>>>')
  }

  const newAccrualID = insertByOrder({
    store: 'hr_employeeAccrual',
    params: {
      employeeID: employeeID,
      employeeNumberID: employeeNumberID,
      payElID: payElID,
      dateFrom: dateFrom,
      dateTo: dateTo,
      accrualSum: accrualSum,
      accrualRate: accrualRate,
      orderID: orderID,
      orderNumber: orderNumber,
      orderDate: orderDate,
      dictFundSourceID: dictFundSourceID,
      changeOrderID: null
    },
    saved: saved
  })

  const newDateTo = dateService.addDays(dateFrom, -1)
  const accrual = UB.Repository('hr_employeeAccrual')
    .attrs(['ID', 'dateFrom', 'dateTo', 'changeOrderID'])
    .where('payElID', '=', payElID)
    .where('ID', '<>', newAccrualID)
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateFrom', '<', dateTo)
    .where('dateTo', '>', dateFrom)
    .selectAsObject()
  accrual.forEach(item => {
    const accrDateFrom = dateService.shiftDate(item.dateFrom)
    if (accrDateFrom > newDateTo) {
      const employee = UB.Repository('hr_employeeNumberS').attrs('description').selectById(employeeNumberID)
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - у працівника {0} вже є нарахування в обраному періоді', employee.description)}>>>`)
    }
    updateByOrder({
      store: 'hr_employeeAccrual',
      params: {
        ID: item.ID,
        dateTo: newDateTo,
        changeOrderID: orderID
      },
      saved: saved,
      oldValues: {
        dateTo: item.dateTo,
        changeOrderID: item.changeOrderID
      }
    })
  })
}

function createActingAccrual ({ paraID, para, saved }) {
  let acting = UB.Repository('hr_empOrderActingDet')
    .attrs('ID', 'employeeNumberID', 'employeePositionID', 'payForExtraLoad', 'dateFrom', 'dateTo', 'employeeID',
      'orderID.orderNumberFull', 'orderID.orderDate', 'payElID')
    .where('paraID', '=', paraID || para.ID)
    .where('payForExtraLoad', 'isNotNull')
    .where('payForExtraLoad', '<>', 0)
    .where('payElID', 'isNotNull')
    .selectAsObject()
  if (!acting.length) {
    return
  }

  let missingEmployeeNumberID = para.employeeNumberID || para['employeePositionID.employeeNumberID']
  if (!missingEmployeeNumberID && para.employeePositionID) {
    const empPos = UB.Repository('hr_employeePositionS')
      .attrs(['accrualSum', 'employeeNumberID'])
      .selectById(para.employeePositionID)
    missingEmployeeNumberID = empPos.employeeNumberID
    if (!missingEmployeeNumberID) {
      return
    }
  }
  acting.forEach(actingItem => {
    insertByOrder({
      store: 'hr_employeeAccrual',
      params: {
        employeeID: actingItem.employeeID,
        employeeNumberID: actingItem.employeeNumberID,
        payElID: actingItem.payElID,
        dateFrom: actingItem.dateFrom,
        dateTo: actingItem.dateTo,
        accrualRate: actingItem.payForExtraLoad,
        orderID: para.orderID,
        changeOrderID: null,
        missingEmployeeNumberID: missingEmployeeNumberID,
        orderState: 'POSTED',
        orderNumber: actingItem['orderID.orderNumberFull'],
        orderDate: actingItem['orderID.orderDate']
      },
      saved: saved
    })
  })
}

function deleteOrderActing ({ orderID, saved }) {
  deleteActingAccrual({ orderID, saved })

  let orderActing = UB.Repository('hr_empOrderActingDet')
    .attrs('ID')
    .where('orderID', '=', orderID)
    .selectAsObject()
  if (!orderActing.length) {
    return
  }
  orderActing.forEach(orderActingItem => {
    /* При видаленні в проведеному наказі буде помилка на перевірці hr_empOrderDet.checkIsEditable, неможливо видаляти в проведеному наказі */
    deleteByOrder({
      store: 'hr_empOrderActingDet',
      params: {
        ID: orderActingItem.ID
      },
      saved: saved
    })
  })
}

function deleteActingAccrual ({ orderID, saved }) {
  let empAccrual = UB.Repository('hr_employeeAccrual')
    .attrs('ID')
    .where('orderID', '=', orderID)
    .selectAsObject()
  if (!empAccrual.length) {
    return
  }
  empAccrual.forEach(empAccrualItem => {
    deleteByOrder({
      store: 'hr_employeeAccrual',
      params: {
        ID: empAccrualItem.ID
      },
      saved: saved
    })
  })
}

function checkIsParaOk (paraItem) {
  if (!paraItem) {
    throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - організація, підрозділ або посада неактуальні на дату наказу')}>>>`)
  }
}

function createExperience ({ para, saved }) {
  const orderExp = UB.Repository('hr_empOrderExperience')
    .attrs(['ID', 'empOrderDetID', 'empOrderID', 'dictExperienceID', 'calcDate', 'employeeExperienceID', 'employeeExperienceID.calcDate', 'employeeExperienceID.dictExperienceID'])
    .where('empOrderDetID', '=', para.ID)
    .selectAsObject({
      'employeeExperienceID.calcDate': 'oldCalcDate',
      'employeeExperienceID.dictExperienceID': 'oldDictExperienceID'
    })
  orderExp.forEach(item => {
    let empExp = UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'calcDate', 'startCalcDate', 'orderID', 'isFromWorkbook', 'modifyDate', 'modifyUserID'])
      .where('employeeID', '=', para.employeeID)
      .where('dictExperienceID', '=', item.dictExperienceID)
      .limit(1)
      .selectSingle()
    if (!empExp) {
      insertByOrder({
        store: 'hr_employeeExperience',
        params: {
          employeeID: para.employeeID,
          calcDate: item.calcDate,
          startCalcDate: dateService.isMaxDate(para.dateTo) ? null : para.dateTo,
          dictExperienceID: item.dictExperienceID,
          isFromWorkbook: false,
          orderID: para.orderID
        },
        saved: saved
      })
    } else {
      let calcDate = dateService.shiftDate(item.calcDate)
      let oldCalcDate = dateService.shiftDate(item.oldCalcDate)
      if (calcDate !== oldCalcDate) {
        updateByOrder({
          store: 'hr_employeeExperience',
          params: {
            ID: empExp.ID,
            calcDate: calcDate,
            startCalcDate: dateService.isMaxDate(para.dateTo) ? null : para.dateTo,
            isFromWorkbook: false,
            orderID: para.orderID
          },
          oldValues: empExp,
          saved: saved
        })
      }
    }
  })
  const employeeExp = UB.Repository('hr_employeeExperience')
    .attrs(['ID', 'calcDate', 'startCalcDate'])
    .where('employeeID', '=', para.employeeID)
    .where('dictExperienceID', 'notIn', orderExp.map(o => o.dictExperienceID))
    .where('startCalcDate', 'isNotNull')
    .selectAsObject()
  employeeExp.forEach(exp => {
    const ymd = dateService.getYmd(dateService.shiftDate(exp.calcDate), dateService.shiftDate(exp.startCalcDate), true)
    const newCalDate = dateService.addDays(dateService.getCalcDate(ymd.years, ymd.months, ymd.days, dateService.shiftDate(para.dateFrom)), -1)
    updateByOrder({
      store: 'hr_employeeExperience',
      params: {
        ID: exp.ID,
        calcDate: newCalDate,
        startCalcDate: dateService.isMaxDate(para.dateTo) ? null : para.dateTo,
        orderID: para.orderID
      },
      oldValues: exp,
      saved: saved
    })
  })
}

function createWorkSched ({
  params = {
    employeeID: undefined,
    dateFrom: undefined,
    workScheduleID: undefined,
    orderID: undefined,
    paraID: undefined,
    employeeNumberID: undefined
  },
  mParams = {
    isClosePrev: false
  },
  saved
}) {
  if (!params.workScheduleID) {
    return
  }
  const execParams = {
    employeeID: undefined,
    dateFrom: undefined,
    workScheduleID: undefined,
    orderID: undefined,
    paraID: undefined,
    employeeNumberID: undefined
  }
  for (const param in execParams) {
    if (!params[param]) {
      throw new UB.UBAbort(`<<<orderService.createWorkSched() - param params.${param} not defined>>>`)
    }
    execParams[param] = params[param]
  }
  const dateFrom = dateService.shiftDate(params.dateFrom)
  let wsch = UB.Repository('hr_empWorkShdChange')
    .attrs(['ID', 'dateTo'])
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .where('workScheduleID', '=', params.workScheduleID)
    .where('employeeNumberID', '=', params.employeeNumberID)
    .where('isActive', '=', 1)
    .limit(1)
    .selectSingle()
  if (wsch) {
    return
  }
  if (mParams.isClosePrev) {
    wsch = UB.Repository('hr_empWorkShdChange')
      .attrs(['ID', 'dateTo', 'dateFrom', 'isActive'])
      .where('dateFrom', '<=', dateFrom)
      .where('dateTo', '>=', dateFrom)
      .where('workScheduleID', '<>', params.workScheduleID)
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('isActive', '=', 1)
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectSingle()
    if (wsch) {
      const inOneDay = dateService.shiftDate(wsch.dateFrom).getTime() === dateService.shiftDate(dateFrom).getTime()
      updateByOrder({
        store: 'hr_empWorkShdChange',
        params: {
          ID: wsch.ID,
          dateTo: inOneDay ? dateService.shiftDate(wsch.dateFrom) : dateService.addDays(dateFrom, -1),
          isActive: inOneDay ? 0 : 1
        },
        saved: saved,
        oldValues: wsch
      })
    }
  }
  insertByOrder({
    store: 'hr_empWorkShdChange',
    params: execParams,
    saved: saved
  })
}

function setTimeSheet ({ para, saved, currentPeriod = {} }) {
  const funcName = `orderService.setTimeSheet()`
  const params = []
  const defaultParams = {
    orderID: { allowNull: false },
    employeeNumberID: { allowNull: false },
    periodID: { allowNull: false },
    dictTimeCostID: { allowNull: false },
    factHour: { allowNull: false },
    dateFrom: { allowNull: false },
    dateTo: { allowNull: false },
    mi_unityEntity: { allowNull: false }
  }

  for (const param in defaultParams) {
    // eslint-disable-next-line no-prototype-builtins
    if (defaultParams.hasOwnProperty(param)) {
      if (para[param] === undefined) {
        throw new UB.UBAbort(`<<<${funcName}=> param ${param} should be defined>>>`)
      }
      if (para[param] === null && !defaultParams[param].allowNull) {
        throw new UB.UBAbort(`<<<${funcName}=> param ${param} should not be null>>>`)
      }
    }
  }
  const employeeNumbers = [{
    employeeNumberID: para.employeeNumberID,
    dateFrom: para.dateFrom,
    dateTo: para.dateTo
  }]

  if (para.includeSecondJobs) {
    const secJobs = staffService.getSecondJobs(para.employeeID, para.employeeNumberID, para['employeeNumberID.orgID'], para.dateFrom, para.dateTo)
    secJobs.forEach(row => {
      employeeNumbers.push({
        employeeNumberID: row.employeeNumberID,
        dateFrom: Math.max(dateService.shiftDate(para.dateFrom), dateService.shiftDate(row.dateFrom)),
        dateTo: Math.min(dateService.shiftDate(para.dateTo), dateService.shiftDate(row.dateTo))
      })
    })
  }
  employeeNumbers.forEach(row => {
    let dayDate = dateService.shiftDate(row.dateFrom)
    let dateTo = dateService.shiftDate(row.dateTo)
    while (dayDate <= dateTo) {
      params.push({
        orderID: para.orderID,
        entityName: 'hr_empOrder',
        employeeNumberID: row.employeeNumberID,
        periodID: currentPeriod.ID || para.periodID,
        dateWork: dayDate,
        factTimeCostID: para.dictTimeCostID,
        factHour: 0
      })
      dayDate = dateService.nextDay(dayDate)
    }
  })
  timService.setTimeSheet(params)
  if (!saved.timService) {
    saved.timService = {}
  }
  if (!saved.timService[para.mi_unityEntity]) {
    saved.timService[para.mi_unityEntity] = params
  }
}

function closeEmployeeNumber ({ params, saved }) {
  if (!params.dateTo) {
    throw new UB.UBAbort('<<<closeEmployeeNumber() -> no dateTo >>>')
  }
  if (!params.ID) {
    throw new UB.UBAbort('<<<closeEmployeeNumber() -> no ID >>>')
  }
  const employeeNumber = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'dateTo', 'mi_deleteDate', 'employeeID.fullFIO', 'tabNum', 'changeOrderID'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectById(params.ID)
  if (!employeeNumber) {
    throw new UB.UBAbort(`<<<${UB.i18n('Таб № {0} {1} не знайдено, виберіть ще раз.', employeeNumber.tabNum, employeeNumber['employeeID.fullFIO'])}>>>`)
  } else if (new Date(employeeNumber.mi_deleteDate).getFullYear() !== 9999) {
    throw new UB.UBAbort(`<<<${UB.i18n('Таб № {0} {1} було видалено, можливо, внаслідок розпроведення наказу, в якому він був створений. Виберіть ще раз.', employeeNumber.tabNum, employeeNumber['employeeID.fullFIO'])}>>>`)
  }
  updateByOrder({
    store: 'hr_employeeNumber',
    params: {
      ID: params.ID,
      dateTo: params.dateTo,
      changeOrderID: params.changeOrderID
    },
    oldValues: {
      dateTo: employeeNumber.dateTo,
      changeOrderID: employeeNumber.changeOrderID
    },
    saved: saved
  })
  closeAccrual({
    para: {
      employeeNumberID: params.ID,
      dateFrom: params.dateTo,
      orderID: params.changeOrderID,
      empOrderType: params.empOrderType || null
    },
    saved: saved
  })
}

function restoreDeleted (deleted) {
  deleted.forEach(item => {
    const entity = Object.keys(item)[0]
    const store = UB.DataStore(entity)
    const execParams = item[entity]
    checkAttrs(entity, execParams)
    execParams.ID = store.generateID()
    if (!store.entity.mixins.safeDelete) {
      store.run('insert', {
        __skipSelectAfterInsert: true,
        execParams: execParams,
        isOrderOperation: true
      })
    } else {
      store.execSQL(`update ${entity} set mi_deleteDate = '9999-12-31', mi_deleteUser = null where ID = :ID:`, {
        ID: execParams.ID
      })
    }
  })
}

function saveOldValues (paraRow, values) {
  if (!global[paraRow.mi_unityEntity].entity.attributes.changedValues) {
    throw new UB.UBAbort(`<<<hr_empOrder.saveOldValues() -> Attribute "changedValues" not found in entity ${paraRow.mi_unityEntity}>>>`)
  }
  const para = UB.DataStore(paraRow.mi_unityEntity)
  para.run('update', {
    execParams: {
      ID: paraRow.ID,
      changedValues: values ? JSON.stringify(values) : null
    },
    isOrderOperation: true,
    __skipSelectAfterUpdate: true,
    __skipOptimisticLock: true
  })
}

function getOldValues (paraRow) {
  if (!paraRow.ID) {
    throw new UB.UBAbort('<<<hr_empOrder.getOldValues-> no ID given>>>')
  }
  const
    oldValues = UB.Repository('hr_empOrderDet').attrs(['changedValues']).where('ID', '=', paraRow.ID).limit(1).selectSingle().changedValues
  return !oldValues ? null : JSON.parse(oldValues)
}

function restoreOldValues (paraRow, oldValues, mParams = {}) {
  oldValues = oldValues || paraRow.changedValues || getOldValues(paraRow)
  if (!oldValues) {
    return
  }
  if (_.isString(oldValues)) {
    oldValues = JSON.parse(oldValues)
  }
  if (oldValues.updated && _.isArray(oldValues.updated)) {
    oldValues.updated.forEach(item => {
      const entName = Object.keys(item)[0]
      let execParams = item[entName]
      checkAttrs(entName, execParams)
      const fields = ['ID']
      if (execParams.changeOrderID && global[entName].entity.attributes.changeOrderID) {
        fields.push('changeOrderID')
      }
      const data = UB.Repository(entName).attrs(fields).misc({ __skipRls: true, __mip_recordhistory_all: true }).selectById(execParams.ID)
      if (data) {
        if (data.changeOrderID && data.changeOrderID !== paraRow.orderID) {
          let orderDesc = getOrderDescription(data.changeOrderID)
          orderDesc = orderDesc ? ' - ' + orderDesc : ''
          throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе - були зроблені зміни іншим наказом {0}', orderDesc)}>>>`)
        }
        UB.DataStore(entName).run('update', Object.assign({
          __skipOptimisticLock: true,
          __mip_recordhistory_all: true,
          __skipSelectAfterUpdate: true,
          __skipRls: true,
          // skipSetTimeSheet: true,
          isOrderOperation: true,
          execParams: execParams
        }, mParams))
      }
    })
  }

  if (oldValues.inserted && _.isArray(oldValues.inserted)) {
    oldValues.inserted.forEach(item => {
      const entName = Object.keys(item)[0]
      const ID = item[entName]
      const fields = ['ID']
      if (global[entName].entity.attributes.changeOrderID) {
        fields.push('changeOrderID')
      }
      const data = UB.Repository(entName).attrs(fields).misc({ __skipRls: true, __mip_recordhistory_all: true }).selectById(ID)
      if (data) {
        if (data.changeOrderID && data.changeOrderID !== paraRow.orderID) {
          const oDescription = getOrderDescription(data.changeOrderID)
          if (oDescription) {
            throw new UB.UBAbort(`<<<${UB.i18n('Скасування наказу неможливе - були зроблені зміни іншим наказом  - {0}', oDescription)}>>>`)
          }
        }
        UB.DataStore(entName).run('delete', Object.assign({
          __mip_recordhistory_all: true,
          __skipRls: true,
          isOrderOperation: true,
          execParams: {
            ID: ID
          }
        }, mParams))
      }
    })
  }
  if (oldValues.deleted) {
    restoreDeleted(oldValues.deleted)
  }
}

function checkAttrs (entity, attrs) {
  const entAttrs = global[entity].entity.attributes
  let attrToDel = []
  for (let i = 0; i < Object.keys(attrs).length; i++) {
    let attr = Object.keys(attrs)[i]
    if (!entAttrs[attr]) {
      attrToDel.push(attr)
    }
  }
  attrToDel.forEach(attr => {
    delete attrs[attr]
  })
}

function getOrderDescription (orderID) {
  return UB.Repository('hr_order').attrs('description').where('ID', '=', orderID).misc({ __mip_recordhistory_all: true }).select().get(0)
}

function experienceClearStartCalcDateAndFix ({
  employeeID,
  positionType,
  dateFrom,
  order,
  saved
}) {
  dateFrom = dateService.shiftDate(dateFrom)
  const dictExpByPosList = UB.Repository('hr_dictExperienceByPos')
    .attrs('dictExperienceID')
    .where('positionType', '=', positionType)
    .selectAsObject().map(item => item.dictExperienceID)
  if (!dictExpByPosList.length) {
    return
  }
  const empEx = UB.Repository('hr_employeeExperience')
    .attrs('ID', 'startCalcDate', 'calcDate', 'dictExperienceID', 'dictExperienceID.name')
    .where('employeeID', '=', employeeID)
    .where('dictExperienceID', 'in', dictExpByPosList)
    .selectAsObject()
  if (!empEx.length) {
    return
  }
  const descriptionExperience = []
  empEx.forEach(empExItem => {
    const exp = dateService.getYmd(dateService.shiftDate(empExItem.calcDate), dateFrom, true)
    exp.ID = empExItem.dictExperienceID
    exp.name = empExItem['dictExperienceID.name']
    exp.employeeID = employeeID
    exp.onDate = dateFrom
    exp.calcDate = empExItem.calcDate
    exp.employeeExperienceID = empExItem.ID
    descriptionExperience.push(exp)
  })
}

function clearMiAttrs (attrs) {
  for (const attr in attrs) {
    // eslint-disable-next-line no-prototype-builtins
    if (attrs.hasOwnProperty(attr)) {
      if (attr.startsWith('mi_')) {
        delete attrs[attr]
      }
    }
  }
}

function saveOrderFundSource (ctx) {
  if (ctx.mParams.fundSource) {
    const fundSource = JSON.parse(ctx.mParams.fundSource)
    const paraID = ctx.mParams.execParams.ID
    const curFundSource = UB.Repository('hr_empOrderFundSource')
      .attrs('ID')
      .where('paraID', '=', paraID)
      .selectAsObject()
    const store = UB.DataStore('hr_empOrderFundSource')
    curFundSource.forEach(row => {
      store.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
    let orderID = ctx.mParams.execParams.orderID
    if (ctx.mParams.method === 'update') {
      orderID = UB.Repository(ctx.dataStore.entityCode)
        .attrs('orderID')
        .where('ID', '=', paraID)
        .selectScalar()
    }
    fundSource.forEach(row => {
      store.run('insert', {
        execParams: {
          orderID,
          paraID,
          dictFundSourceID: row.dictFundSourceID,
          mtCount: row.mtCount
        }
      })
    })
  }
}

function getEmployeeFactPositionName (employeePositionID, onDate) {
  let factPositionName = null
  const empPos = UB.Repository('hr_employeePosition')
    .attrs(['employeeID', 'positionID', 'dictPositionID', 'departmentID', 'employeeID.sexType',
      'dictEmpCategoryID.name', 'dictEmpCategoryID.genName', 'organizationID', 'posNameAddition'])
    .selectById(employeePositionID)
  if (empPos) {
    const allowSelectDictPosition = settingsService.getByCode('hrOrderAllowSelectDictPosition', empPos.organizationID) === true
    const isUseSexType = settingsService.getByCode('hrUseSexTypeInOrders', empPos.organizationID)

    const position = empPos.positionID ? UB.Repository('hr_position')
      .attrs(['ID', 'dictPositionID', 'nameAddition', 'nameNomF', 'nameNom', 'name'])
      .where('mi_data_id', '=', empPos.positionID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('mi_dateTo', 'desc')
      .selectSingle() : null
    const department = empPos.departmentID ? UB.Repository('hr_department')
      .attrs(['ID', 'name', 'nameGen', 'mi_treePath'])
      .where('mi_data_id', '=', empPos.departmentID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .orderBy('mi_dateTo', 'desc')
      .selectSingle() : null

    const departmentTree = UB.Repository('hr_department')
      .attrs(['mi_data_id', 'name', 'nameGen', 'nameEng', 'fullNameGen', 'excludeNameInPos', 'mi_createDate'])
      .where('mi_data_id', 'in', department ? _.compact(String(department.mi_treePath).split('/').map(o => Number(o))) : [-1])
      .where('state', '=', 'ACTIVE', 'active')
      .where('liquidate', '=', 0, 'liqu')
      .orderBy('mi_treePath', 'desc')
      .misc({
        __mip_ondate: onDate
      })
      .selectAsObject()
    const departmentList = departmentTree.map(item => item.nameGen || item.name).join(' ') || ''

    let dictPositionID = allowSelectDictPosition ? empPos['dictPositionID'] : (position ? position['dictPositionID'] : null)
    const dictPosition = dictPositionID
      ? UB.Repository('hr_dictPosition')
        .attrs(['ID', 'name', 'nameNom', 'nameNomF'])
        .selectById(dictPositionID)
      : null

    let empCategoryName = empPos['dictEmpCategoryID.genName'] || ''
    if (empCategoryName) {
      empCategoryName = ' ' + empCategoryName
    }
    let posNameAddition = allowSelectDictPosition ? empPos['posNameAddition'] : (position ? position['nameAddition'] : '')
    if (posNameAddition) {
      posNameAddition = ' ' + posNameAddition
    } else {
      posNameAddition = ''
    }
    const posName = isUseSexType && empPos['employeeID.sexType'] === 'W'
      ? (dictPosition ? ' ' + (dictPosition.nameNomF || dictPosition.name) : (position ? ' ' + (position.nameNomF || position.name) : ''))
      : (dictPosition ? ' ' + (dictPosition.nameNom || dictPosition.name) : (position ? ' ' + (position.nameNom || position.name) : ''))
    factPositionName = nameCaseService.removeDuplicateWords(`${posName}${posNameAddition}${empCategoryName}${departmentList ? ' ' + departmentList : ''}`)
  }
  return factPositionName
}

function addNonClosableAccruals (employeePositionID, orderID, orderDetID, dateFrom) {
  const employeeNumberID = UB.Repository('hr_employeePositionS')
    .attrs('employeeNumberID')
    .where('ID', '=', employeePositionID)
    .selectScalar() || 0

  const orderAcc = UB.Repository('hr_empOrderAcc')
    .attrs('payElID')
    .where('empOrderID', '=', orderID)
    .where('empOrderDetID', '=', orderDetID)
    .where('isAutoNotClose', '=', 1)
    .selectAsArrayOfValues()

  const accruals = UB.Repository('hr_employeeAccrual')
    .attrs(['payElID', 'accrualRate', 'accrualSum', 'dateFrom', 'dateTo'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('payElID.notCloseOnChangeEmpPos', '=', 1)
    .whereIf(orderAcc.length, 'payElID', 'notIn', orderAcc)
    .where('dateFrom', '<=', dateFrom)
    .where('dateTo', '>=', dateFrom)
    .selectAsObject()
  const store = UB.DataStore('hr_empOrderAcc')
  accruals.forEach(item => {
    store.run('insert', {
      skipError: true,
      execParams: {
        empOrderID: orderID,
        empOrderDetID: orderDetID,
        payElID: item.payElID,
        dateFrom: dateFrom,
        dateTo: item.dateTo,
        accrualSum: item.accrualSum,
        accrualRate: item.accrualRate,
        isAutoNotClose: 1
      }
    })
  })
}

function tryClosePublServRangsExceptLast (employeeID, order, saved) {
  const ranks = UB.Repository('hr_publServRang')
    .attrs(['ID', 'dateTo', 'dateFrom', 'orderNumber', 'orderDate', 'orderID'])
    .where('[employeeID]', '=', employeeID)
    // .where('[dateTo]', '>=', '#maxdate')
    .where('[mi_deleteDate]', '>=', '#maxdate')
    .orderBy('dateFrom')
    .selectAsObject()

  for (let i = 0; i < ranks.length - 1; i++) {
    const curr = ranks[i]
    if (dateService.shiftDate(curr.dateTo).getTime() === dateService.maxDate().getTime()) {
      const next = ranks[i + 1]
      updateByOrder({
        store: 'hr_publServRang',
        params: {
          ID: curr.ID,
          dateTo: dateService.priorDay(next.dateFrom),
          orderDate: order.orderDate,
          orderNumber: order.orderNumberFull || order.orderNumber,
          orderID: order.ID
        },
        oldValues: {
          ID: curr.ID,
          dateTo: curr.dateTo,
          orderNumber: curr.orderNumber,
          orderDate: curr.orderDate,
          orderID: curr.orderID
        },
        saved: saved
      })
    }
  }
}

function getMissionOrderPara (id) {
  return UB.Repository('hr_empOrderEmployeeDet')
    .attrs(['ID',
      'empOrderMissionDetID.dateFrom',
      'empOrderMissionDetID.dateTo',
      'employeePositionID',
      'employeePositionID.accrualSum',
      'employeeNumberID',
      'employeeNumberID.orgID',
      'employeeID',
      'dictTimeCostID',
      'payElID',
      'payElID.dictTimeCostID',
      'empOrderMissionDetID.organizationID',
      'empOrderMissionDetID.dictTimeCostID',
      'empOrderMissionDetID.payElID',
      'empOrderMissionDetID.periodID',
      'empOrderMissionDetID.departmentID',
      'empOrderMissionDetID.cityID',
      'empOrderMissionDetID.cityName',
      'empOrderMissionDetID.destOrganizationID',
      'empOrderMissionDetID.destOrganizationName',
      'empOrderMissionDetID.dayCount',
      'empOrderMissionDetID.description',
      'empOrderMissionDetID.purpose',
      'empOrderMissionDetID.isInsideCountry',
      'empOrderMissionDetID.countryID',
      'empOrderMissionDetID.isNeedReport',
      'empOrderMissionDetID.isFromCatalog',
      'empOrderMissionDetID.groupCategory',
      'empOrderMissionDetID.dictProfCompetencyID',
      'empOrderMissionDetID.dictProfCompDevelopFormID',
      'empOrderMissionDetID.dictTrainingTopicID',
      'empOrderMissionDetID.dictTrainingTopicName',
      'empOrderMissionDetID.dictSpecialityID',
      'empOrderMissionDetID.lectureCycle',
      'empOrderMissionDetID.dictTrainingKindID',
      'empOrderMissionDetID.trainingDirection',
      'paraID.empOrderType',
      'orderID'])
    .where('ID', '=', id)
    .selectSingle({
      'empOrderMissionDetID.dateFrom': 'dateFrom',
      'empOrderMissionDetID.dateTo': 'dateTo',
      'empOrderMissionDetID.periodID': 'periodID',
      'empOrderMissionDetID.departmentID': 'departmentID',
      'empOrderMissionDetID.cityID': 'cityID',
      'empOrderMissionDetID.cityName': 'cityName',
      'empOrderMissionDetID.destOrganizationID': 'destOrganizationID',
      'empOrderMissionDetID.destOrganizationName': 'destOrganizationName',
      'empOrderMissionDetID.dayCount': 'dayCount',
      'empOrderMissionDetID.description': 'description',
      'empOrderMissionDetID.purpose': 'purpose',
      'empOrderMissionDetID.isInsideCountry': 'isInsideCountry',
      'empOrderMissionDetID.countryID': 'countryID',
      'empOrderMissionDetID.isNeedReport': 'isNeedReport',
      'empOrderMissionDetID.organizationID': 'organizationID',
      'empOrderMissionDetID.isFromCatalog': 'isFromCatalog',
      'empOrderMissionDetID.groupCategory': 'groupCategory',
      'empOrderMissionDetID.dictProfCompetencyID': 'dictProfCompetencyID',
      'empOrderMissionDetID.dictProfCompDevelopFormID': 'dictProfCompDevelopFormID',
      'empOrderMissionDetID.dictTrainingTopicID': 'dictTrainingTopicID',
      'empOrderMissionDetID.dictTrainingTopicName': 'dictTrainingTopicName',
      'empOrderMissionDetID.dictSpecialityID': 'dictSpecialityID',
      'empOrderMissionDetID.lectureCycle': 'lectureCycle',
      'empOrderMissionDetID.dictTrainingKindID': 'dictTrainingKindID',
      'empOrderMissionDetID.trainingDirection': 'trainingDirection'
    })
}

function postMissionOrder (order, item, periodID, currentPeriod, saved, missionItemID) {
  let para
  if (item.mi_unityEntity === 'hr_empOrderEmployeeDet') {
    para = getMissionOrderPara(item.ID)
  } else if (item.mi_unityEntity === 'hr_empOrderChangemissionDet') {
    para = getMissionOrderPara(missionItemID)
    const mItem = UB.Repository('hr_empOrderChangemissionDet')
      .attrs(['orderID', 'reason', 'dateFrom', 'dateTo', 'dayCount'])
      .where('ID', '=', item.ID).selectSingle()
    para.orderID = mItem.orderID
    para.reason = mItem.reason
    para.dateFrom = mItem.dateFrom
    para.dateTo = mItem.dateTo
    para.dayCount = mItem.dayCount
  } else {
    para = UB.Repository(item.mi_unityEntity).attrs(['ID', 'dateFrom', 'dateTo', 'employeeNumberID', 'dictTimeCostID',
      'periodID', 'orderID', 'employeePositionID.dateFrom', 'employeePositionID', 'employeeID',
      'employeeNumberID.orgID']).selectById(item.ID)
  }
  checkIsParaOk(para)
  if (!periodID) {
    throw new UB.UBAbort('<<<Для організації не знайдено поточного періоду, проведення неможливе>>')
  }
  para.periodID = periodID

  if (!para['payElID']) para.payElID = para['empOrderMissionDetID.payElID']
  if (!para['dictTimeCostID']) para.dictTimeCostID = para['payElID.dictTimeCostID']
  if (!para['dictTimeCostID']) para.dictTimeCostID = para['empOrderMissionDetID.dictTimeCostID']

  para.factHour = 0
  para.mi_unityEntity = item.mi_unityEntity
  const payEl = para.payElID
    ? UB.Repository('hr_payEl')
      .attrs(['ID', 'includeSecondJobs'])
      .selectById(para.payElID)
    : UB.Repository('hr_payEl')
      .attrs(['ID', 'includeSecondJobs'])
      .where('methodID.code', '=', '21')
      .where('dateFrom', '<=', dateService.shiftDate(para.dateFrom))
      .where('dateTo', '>=', dateService.shiftDate(para.dateFrom))
      .selectSingle()
  para.includeSecondJobs = payEl ? payEl.includeSecondJobs : false
  setTimeSheet({ para: para, saved: saved, currentPeriod })
  let execParams = {}
  let attrs = global.hr_employeeMission.entity.attributes
  for (const attr in attrs) {
    if (attrs.hasOwnProperty(attr)) {
      if (para[attr] !== undefined && attr !== 'ID') {
        execParams[attr] = para[attr]
      }
    }
  }
  execParams.paraID = para.ID
  delete para.ID
  insertByOrder({ store: 'hr_employeeMission', params: execParams, saved: saved })
  if (item.empOrderType === 'MISSION_TRAINING' || para['paraID.empOrderType'] === 'MISSION_TRAINING') {
    insertByOrder({
      store: 'hr_empCertificatnUp',
      params: {
        orderID: para.orderID,
        paraID: para.ID,
        educationName: para.destOrganizationName,
        dateFrom: para.dateFrom,
        dateTo: para.dateTo,
        isInsideCountry: para.isInsideCountry,
        countryID: para.countryID,
        groupCategory: para.isFromCatalog ? para.groupCategory : null,
        dictProfCompetencyID: para.isFromCatalog ? para.dictProfCompetencyID : null,
        dictProfCompDevelopFormID: para.dictProfCompDevelopFormID,
        dictTrainingTopicID: para.dictTrainingTopicID,
        dictTrainingTopicName: para.dictTrainingTopicName,
        employeeID: para.employeeID,
        orderNumber: order.orderNumberFull,
        orderDate: order.orderDate,
        srcOrganizationName: para['organizationID.name'],
        srcOrganizationID: order.organizationID,
        organizationID: order.organizationID,
        dictSpecialityID: para.dictSpecialityID,
        lectureCycle: para.lectureCycle,
        dictTrainingKindID: para.dictTrainingKindID,
        trainingDirection: para.trainingDirection
      },
      saved: saved
    })
  }
  para.ID = execParams.paraID
  if (item.mi_unityEntity === 'hr_empOrderChangemissionDet') {
    createActingAccrual({ paraID: item.paraID, para: para, saved: saved })
  } else {
    createActingAccrual({ para: para, saved: saved })
  }
}

function cancelMissionOrderItem (item) {
  timService.cancelTimeSheet(item.orderID, item.employeeNumberID ? [item.employeeNumberID] : null)
  restoreOldValues(item)
  /* если добавили скриптом в старый наказ, то при откате не удалится */
  let empMissionID = UB.Repository('hr_employeeMission').attrs('ID').where('paraID', '=', item.ID).selectAsObject()
  if (empMissionID.length) {
    const store = UB.DataStore('hr_employeeMission')
    empMissionID.forEach(mItem => {
      store.run('delete', {
        execParams: {
          ID: mItem.ID
        }
      })
    })
  }
  /* если восстановили при откате приказа о изменениях то удаляемм вручную */
  const json = item.changedValues ? JSON.parse(item.changedValues) : undefined
  if (json && json.inserted && json.inserted.length) {
    const saved = { inserted: [], updated: [] }
    const ids = json.inserted.filter(x => Object.keys(x).includes('hr_employeeAccrual')).map(x => x['hr_employeeAccrual'])
    ids.forEach(x => {
      const prev = UB.Repository('hr_employeeAccrual')
        .attrs(['orderID', 'employeeNumberID', 'payElID'])
        .misc({ __allowSelectSafeDeleted: true })
        .selectById(x)
      if (prev) {
        const eas = UB.Repository('hr_employeeAccrual').attrs(['ID'])
          .where('ID', '!=', x)
          .where('orderID', '=', prev.orderID)
          .where('employeeNumberID', '=', prev.employeeNumberID)
          .where('payElID', '=', prev.payElID)
          .selectAsObject()
        eas.forEach(ea => {
          deleteByOrder({
            store: 'hr_employeeAccrual',
            params: {
              ID: ea.ID
            },
            saved: saved
          })
        })
      }
    })
  }
}
