const UB = require('@unitybase/ub')
const _ = require('lodash')
const dateService = require('../../AC/modules/dataServices/dateService')
const orderService = require('./orderService')
const nameCase = require('./nameCase')
const timService = require('./timService')
const settingsService = require('../../AC/modules/entityServices/settingsService')

module.exports = {
  validateOrderOnPost,
  validateOrderOnCancelPost,
  validateVacDayCount,
  validateVacationRet,
  validateYearMaxDate,
  checkImpartibleVac,
  checkMainPart,
  checkVacUsed,
  checkEmpDuplicates,
  checkFamilyTaxCode,
  getValidateMessageAPPOINT,
  getValidateMessageCERTIFICATION,
  getValidateMessageVACATION,
  getValidateMessageVACATIONPROLONG,
  getValidateMessageMOVE,
  getValidateMessagePLURALIST,
  getValidateMessageMILSERVICERET,
  getValidateMessageCWSHD,
  checkDuplicateEmployeeNumber,
  checkEmpRank4RankSave,
  getPostWarningAllType,
  getCancelPostWarningAllType,
  getCancelPostWarningAPPOINT,
  checkDChildPeriodDays,
  validateAveragePay
}

const commonValidators = [
  validateDeletedEmpNum
]

const groupableOrderTypes = ['VACATION', 'VACATIONPROLONG', 'VACATIONREVOKE']
const groupableOrderTypes4Sql = groupableOrderTypes.map(itm => `'${itm}'`).join(', ')

function getPostWarningAllType (empOrderType, orderID) {
  return checkDuplicateEmployeeNumber(empOrderType, orderID)
}

function checkDuplicateEmployeeNumber (empOrderType, orderID, extra = {}) {
  const errors = []
  let data
  if (extra.employeeID || extra.employeeNumberID || extra.employeePositionID) {
    data = []
    let paraID = extra.paraID
    let attrs = ['employeeID', 'employeeNumberID', 'employeeID.fullFIO']
    if (!paraID) {
      attrs.push('COUNT(*)')
    }
    let empOrderData = UB.Repository('hr_empOrderDet')
      .attrs(attrs)
      .where('orderID', '=', orderID)
      .whereIf(extra.employeeID, 'employeeID', '=', extra.employeeID)
      .whereIf(extra.employeeNumberID, 'employeeNumberID', '=', extra.employeeNumberID)
      .whereIf(extra.employeePositionID, 'employeePositionID', '=', extra.employeePositionID)
      .where('empOrderType', '!=', 'ACTING')
      .where('isGroup', '=', 0, 'isGroup0')
      .where('isGroup', '=', 1, 'isGroup1')
      .where('empOrderType', 'notIn', groupableOrderTypes, 'isNotGroupable')
      .where('empOrderType', 'in', groupableOrderTypes, 'isGroupable')
      .logic('(([isGroup0] and not [isNotGroupable]) OR ([isGroup1] and [isGroupable]))')
    if (paraID) {
      empOrderData = empOrderData.where('ID', '!=', paraID)
        .selectSingle({
          'employeeID.fullFIO': 'description'
        })
      if (empOrderData) {
        data.push(empOrderData)
      }
    } else {
      empOrderData = empOrderData.groupBy(['employeeID', 'employeeNumberID', 'employeeID.fullFIO', 'mi_unityEntity'])
        .selectSingle({
          'COUNT(*)': 'cnt',
          'employeeID.fullFIO': 'description'
        })
      if (empOrderData && empOrderData.cnt > 1) {
        data.push(empOrderData)
      }
    }
  } else {
    let sql = `select
      det.employeeNumberID, 
      emp.fullFIO as description,
      det.mi_unityEntity as mi_unityEntity,
      count(1) as total
    from hr_empOrderDet det
      join hr_employee emp on emp.ID = det.employeeID
        and emp.mi_deleteDate >= '9999-12-31'
    where det.orderID = :orderID:
      and det.employeeID is not null
      and det.mi_deleteDate >= '9999-12-31'
      and det.empOrderType <> 'ACTING'
      and ((det.isGroup = 0 and det.empOrderType not in (${groupableOrderTypes4Sql})) OR 
        (det.isGroup = 1 and det.empOrderType in (${groupableOrderTypes4Sql})))
    group by
      det.employeeID, det.employeeNumberID, emp.fullFIO, det.mi_unityEntity
    having count(1) > 1
  `
    const store = UB.DataStore('hr_empOrderDet')
    store.runSQL(sql, Object.assign({ orderID: orderID, empOrderType: empOrderType }, extra))
    data = store.getAsJsObject()
  }

  if (data.length) {
    errors.push(UB.i18n('Наступні працівники повторюються декілька разів в наказі:'))
  }
  data.forEach(item => {
    errors.push(item.description)
  })
  return errors
}

function getCancelPostWarningAllType (empOrderType, orderID, extra) {
  let res = {
    type: 'emplist',
    messages: []
  }
  if (!['PLURALIST', 'APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE'].includes(empOrderType)) {
    return res
  }
  let employeeNumberList = UB.Repository('hr_empOrderDet')
    .attrs(['employeeNumberID'])
    .where('employeeNumberID', 'isNotNull')
    .where('orderID', '=', orderID)
    .where('empOrderType', '=', empOrderType)
    .groupBy('employeeNumberID')
    .whereIf(empOrderType === 'PLURALIST', 'employeeNumberID', 'notIn',
      UB.Repository('hr_empOrderPluralistDet')
        .attrs(['employeeNumberID'])
        .where('orderID', '=', orderID)
        .where('isNewTabNum', '=', 0)
    ).selectAsObject().map(o => o.employeeNumberID)

  const empOrderEmployee = UB.Repository('hr_empOrderDet')
    .attrs(['employeeNumberID.description', 'orderID.description'])
    .where('employeeNumberID', 'in', employeeNumberList)
    .where('orderID', '!=', orderID)
    .selectAsObject({
      'employeeNumberID.description': 'description'
    })
  res.messages = _.uniq(empOrderEmployee.map(o => o['description']))
  return res
}

function getCancelPostWarningAPPOINT (empOrderType, orderID) {
  const errors = []
  if (!['PLURALIST', 'APPOINT', 'APPOINT_LIQ', 'APPOINT_MOVE'].includes(empOrderType)) {
    return errors
  }
  const employeeNumberList = UB.Repository('hr_empOrderDet')
    .attrs(['employeeNumberID'])
    .where('employeeNumberID', 'isNotNull')
    .where('orderID', '=', orderID)
    .where('empOrderType', '=', empOrderType)
    .groupBy('employeeNumberID')
    .selectAsObject().map(o => o.employeeNumberID)
  const empPosList = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.description'])
    .where('employeeNumberID', 'in', employeeNumberList)
    .where('orderID', '!=', orderID)
    .selectAsObject()
  empPosList.forEach(row => {
    errors.push(row['employeeNumberID.description'])
  })
  return errors
}

const typePostValidators = {
  VACATION: [ checkVacationPeriod, checkVacationCrossPeriod, checkVacationCrossTimeSheet,
    { entity: 'hr_empOrderVacationListDet', method: 'validateAvailableVacationDays' }
  ],
  VACATIONPROLONG: [ checkVacationPeriod, checkVacationCrossPeriod, checkVacationCrossTimeSheet ],
  VACATIONLONG: [ checkVacationCrossTimeSheet ],
  VACATIONREVOKE: [ checkBreakVacancy, checkNoVacDays, checkVacationRevokeCrossPeriod ],
  VACATIONCOMP: [ checkCompList ],
  MISSION: [ validatePositionDateFrom ],
  DISM: [ checkVacUsed ],
  CHGEMPLOYEE: [ checkEmpDuplicates ],
  BOUNTY_HELP: [ checkFamilyTaxCode ]
}

const typeCancelPostValidators = {
  VACATION: [
    { entity: 'hr_empOrderVacationDet', method: 'checkVacProlong' }
  ]
}

function getValidateMessageAPPOINT (empOrderType, orderID) {
  const errors = []
  errors.push(...checkEmpPosCount(empOrderType, orderID))
  errors.push(...checkFundSourceMtCount(empOrderType, orderID))
  return errors
}

function getValidateMessageCERTIFICATION (empOrderType, orderID) {
  const errors = []
  const badCategory = []
  const badTarifCoeffID = []
  let data = UB.Repository('hr_empOrderCertificationDet')
    .attrs('dictEmpCategoryID', 'employeeID', 'employeeID.fullFIO', 'dateFrom', 'dictTarifCoeffID', 'employeePositionID')
    .where('orderID', '=', orderID)
    .where('certificationType', '=', 'ASSIGN')
    .selectAsObject()
  data.forEach(item => {
    const lastCategory = UB.Repository('hr_empCertificationAcc')
      .attrs('dictEmpCategoryID')
      .where('employeeID', '=', item.employeeID)
      .where('certificationDate', '<', item.dateFrom)
      .orderByDesc('certificationDate')
      .limit(1)
      .selectSingle()
    if (lastCategory && item.dictEmpCategoryID === lastCategory.dictEmpCategoryID) {
      badCategory.push(item['employeeID.fullFIO'])
    }
    const lastDictTarifCoeffID = UB.Repository('hr_empTarifCategory')
      .attrs('dictTarifCoeffID')
      .where('employeeID', '=', item.employeeID)
      .where('dateFrom', '<', item.dateFrom)
      .orderByDesc('dateFrom')
      .limit(1)
      .selectSingle()
    if (lastDictTarifCoeffID && item.dictTarifCoeffID === lastDictTarifCoeffID.dictTarifCoeffID) {
      badTarifCoeffID.push(item['employeeID.fullFIO'])
    } else {
      const posDictTarifCoeffID = UB.Repository('hr_employeePositionS')
        .attrs('dictTarifCoeffID')
        .selectById(item.employeePositionID)
      if (posDictTarifCoeffID && item.dictTarifCoeffID === posDictTarifCoeffID.dictTarifCoeffID) {
        badTarifCoeffID.push(item['employeeID.fullFIO'])
      }
    }
  })
  if (badCategory.length) {
    errors.push(UB.i18n(`Для працівників {0} не змінено категорію працівника.`, badCategory.join(',')))
  }
  const order = UB.Repository('hr_empOrder')
    .attrs('ID', 'organizationID')
    .selectById(orderID)
  if (badTarifCoeffID.length && settingsService.getByCode('hrCertificationObligAttrs', order.organizationID) !== false) {
    errors.push(UB.i18n(`Для працівників {0} не змінено тарифний розряд працівника.`, badTarifCoeffID.join(',')))
  }
  return errors
}

function getValidateMessageVACATION (empOrderType, orderID) {
  return validateYearMaxDate(empOrderType, 'hr_empOrderVacationDet', orderID)
}

function getValidateMessageVACATIONPROLONG (empOrderType, orderID) {
  return validateYearMaxDate(empOrderType, 'hr_empOrderVacationprolongDet', orderID)
}

function getValidateMessageMOVE (empOrderType, orderID) {
  const errors = []
  errors.push(...checkEmpPosCount('MOVE', orderID))
  errors.push(...checkEmpPosCount('PROLONGATION', orderID))
  const data = UB.Repository('hr_empOrderProlongationDet')
    .attrs('employeeID', 'employeeID.fullFIO', 'employeePositionID', 'dateFrom', 'employeePositionID.positionID', 'positionID', 'positionID.mi_data_id')
    .where('orderID', '=', orderID)
    .selectAsObject()
  data.forEach(item => {
    if (item['employeePositionID.positionID'] !== item['positionID.mi_data_id']) {
      errors.push(UB.i18n('У працівника {0} могли змінитись умови прав на відпустку. Рекомендовано перевірити права на картці працівника', item['employeeID.fullFIO']))
    }
  })
  return errors
}

function getValidateMessagePLURALIST (empOrderType, orderID) {
  return checkEmpPosCount(empOrderType, orderID)
}

function getValidateMessageMILSERVICERET (empOrderType, orderID) {
  const errors = []
  const data = UB.Repository('hr_empOrderMilserviceretDet')
    .attrs(['ID', 'orderID', 'employeeNumberID', 'dateFrom', 'sourceParaID.dateFrom', 'sourceParaID', 'employeeNumberID.description'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  data.forEach(item => {
    const empVacPlan = UB.Repository('hr_empVacationPlan')
      .attrs(['ID'])
      .where('employeeNumberID', '=', item.employeeNumberID)
      .where('dictVacationKindID.isProportional', '=', 1)
      .where('isPause', '=', 1)
      .limit(1)
      .selectSingle()
    if (empVacPlan) {
      errors.push(UB.i18n('У працівника {0} є тимчасово призупинені права на відпустку. Рекомендовано відновити права на відпустку в картці працівника!', item['employeeNumberID.description']))
    }
  })
  return errors
}

function getValidateMessageCWSHD (empOrderType, orderID) {
  const errors = []
  const data = UB.Repository('hr_empOrderCwshdgrpEmp')
    .attrs(['ID', 'empOrderCwshdgrpDetID.dateFrom', 'employeePositionID', 'employeePositionID.description',
      'employeePositionID.workScheduleID', 'employeePositionID.organizationID'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  data.forEach(item => {
    const dateOf = dateService.shiftDate(item['empOrderCwshdgrpDetID.dateFrom'])
    let workScheduleID = item['employeePositionID.workScheduleID']
    if (!workScheduleID) {
      workScheduleID = UB.Repository('hr_workSchedule')
        .attrs(['ID'])
        .where('code', '=', 'Std')
        .selectScalar()
    }
    const plan = UB.Repository('tim_plan')
      .attrs('dictTimeCostID.code', 'workHours', 'ID')
      .where('organizationID', '=', item['employeePositionID.organizationID'])
      .where('workScheduleID', '=', workScheduleID)
      .where('dayDate', '=', dateOf)
      .limit(1)
      .selectSingle()

    const isWorkDay = plan ? (plan.workHours !== 0) : false
    if (isWorkDay) {
      errors.push(item['employeePositionID.description'])
    }
  })
  return errors
}

function checkEmpPosCount (empOrderType, orderID) {
  const errors = []
  let entityName
  switch (empOrderType) {
    case 'APPOINT':
      entityName = 'hr_empOrderAppointDet'
      break
    case 'MOVE':
      entityName = 'hr_empOrderMoveDet'
      break
    case 'PLURALIST':
      entityName = 'hr_empOrderPluralistDet'
      break
    case 'PROLONGATION':
      entityName = 'hr_empOrderProlongationDet'
      break
  }
  const isMove = empOrderType === 'MOVE' || empOrderType === 'PROLONGATION'
  const fieldList = ['employeeID', 'dateFrom', 'organizationID', 'employeeID.shortFIO', 'mtCount']
  if (isMove) {
    fieldList.push('employeePositionID')
  }
  const para = UB.Repository(entityName)
    .attrs(fieldList)
    .where('orderID', '=', orderID)
    .where(`coalesce(orderState, '') <> 'CANCELED'`, 'custom')
    .where('workPlace', 'in', ['1', '2'])
    .where('contractType', 'in', ['1', '4'])
    .selectAsObject()
  para.forEach(item => {
    let mtCount = item.mtCount
    const empPosCount = UB.Repository('hr_employeePositionS')
      .attrs('sum([mtCount])')
      .where('employeeID', '=', item.employeeID)
      .where('dateFrom', '<=', item.dateFrom)
      .where('dateTo', '>=', item.dateFrom)
      .where('workPlace', 'in', ['1', '2'])
      .whereIf(isMove, 'ID', '!=', item['employeePositionID'])
      .where('contractType', 'in', ['1', '4'])
      .selectScalar()
    mtCount += (empPosCount || 0)
    if (mtCount > 1.5) {
      errors.push(UB.i18n(`Увага! Загальна кількість призначень працівника {0} буде перевищувати 1.5 ставки!`, item['employeeID.shortFIO']))
    }
  })
  return errors
}

function checkEmpRank4RankSave (empOrderType, orderID) {
  const errors = []
  const para = UB.Repository('hr_empOrderAppointDet')
    .attrs('employeeID', 'dateFrom', 'employeeID.shortFIO', 'positionID.positionType', 'isRankSave')
    .where('orderID', '=', orderID)
    .where('isRankSave', '=', true)
    .selectAsObject({
      'employeeID.shortFIO': 'shortFIO',
      'positionID.positionType': 'positionType'
    })
  if (para.length > 0) {
    para.forEach(paraItem => {
      if (paraItem.positionType === '1' && paraItem.isRankSave) {
        /* CIVIL_SERVANT + isRankSave */
        /* UBHR-15313 - відмінено пошук рангу за 3 останні роки, береться взагалі останній ранг до дати призначення */
        // let rankDateFrom = dateService.addYears(paraItem.dateFrom, -3)
        let rankDateTo = paraItem.dateFrom
        const rankItem = UB.Repository('hr_publServRang')
          .attrs(['employeeID'])
          .where('employeeID', '=', paraItem.employeeID)
          // .where('dateFrom', '>', rankDateFrom)
          .where('dateFrom', '<=', rankDateTo)
          .orderBy('dateFrom', 'desc')
          .limit(1)
          .selectSingle()
        if (!rankItem) {
          errors.push(UB.i18n(`Для працівника {0} не була внесена інформація про ранги. Заповніть ранги на сторінці "Ранги держслужбовця" картки працівника`, paraItem.shortFIO))
        }
      }
    })
  }
  return errors
}

function getValidationEnabled (empOrderType) {
  let res = true
  if (['VACATION', 'VACATIONPROLONG'].includes(empOrderType)) {
    let constData = UB.Repository('ac_settings')
      .attrs(['value'])
      .where('[constantID.code]', '=', 'hrEmpOrderVacationValidator')
      .selectScalar()
    res = (constData === '1')
  }
  return res
}

function validateOrderOnPost (orderID) {
  if (!orderID) {
    return true
  }
  const empOrderType = UB.Repository('hr_empOrder')
    .attrs(['empOrderType'])
    .where('ID', '=', orderID)
    .selectScalar()
  if (!getValidationEnabled(empOrderType)) {
    return true
  }

  const entityName = orderService.getEntityByEmpOrderType(empOrderType)
  let errors = []
  commonValidators.forEach(func => {
    let errArray = func(orderID)
    if (errArray && errArray.length > 0) {
      errors = errors.concat(errArray)
    }
  })
  let validators = typePostValidators[empOrderType]
  if (validators) {
    validators.forEach(func => {
      if (_.isFunction(func)) {
        let err = func(empOrderType, entityName, orderID)
        if (err) {
          errors.push(err)
        }
      } else if (func.entity && func.method) {
        let e = global[func.entity][func.method](empOrderType, entityName, orderID)
        if (e) {
          errors.push(e)
        }
      }
    })
  }
  if (errors.length) {
    throw new UB.UBAbort(`<<<${errors.join('<br/>')}>>>`)
  }
  return true
}

function validateOrderOnCancelPost (orderID) {
  if (!orderID) {
    return true
  }
  const empOrderType = UB.Repository('hr_empOrder')
    .attrs(['empOrderType'])
    .where('ID', '=', orderID)
    .selectScalar()
  if (!getValidationEnabled(empOrderType)) {
    return true
  }

  const entityName = orderService.getEntityByEmpOrderType(empOrderType)
  let errors = []
  let validators = typeCancelPostValidators[empOrderType]
  if (validators) {
    validators.forEach(func => {
      if (_.isFunction(func)) {
        let err = func(empOrderType, entityName, orderID)
        if (err) {
          errors.push(err)
        }
      } else if (func.entity && func.method) {
        let e = global[func.entity][func.method](empOrderType, entityName, orderID)
        if (e) {
          errors.push(e)
        }
      }
    })
  }
  if (errors.length) {
    throw new UB.UBAbort(`<<<${errors.join('<br/>')}>>>`)
  }
  return true
}

function validateDeletedEmpNum (orderID) {
  let errors
  const orderDetDelEn = UB.Repository('hr_empOrderDet')
    .attrs(['employeeNumberID.description'])
    .where('orderID', '=', orderID)
    .where('employeeNumberID', 'isNotNull')
    .where('employeeNumberID.mi_deleteDate', '<', '9999-12-31')
    .selectAsObject()
  if (orderDetDelEn.length > 0) {
    errors = orderDetDelEn.map(itm => itm['employeeNumberID.description'])
  }
  if (errors && errors.length > 0) {
    errors = _.uniq(errors)
    errors.unshift('На поточний момент не існують табельні номера:')
    errors.push('Скоригуйте дані')
  }
  return errors
}

/* Перевірка, щоб дата початку детальної сутності була не менша за дату призначення на посаду */
/* Детальна сутність наказу повинна містити поля dateFrom, employeePositionID, firstName, middleName, lastName */
function validatePositionDateFrom (empOrderType, entityName, orderID) {
  const orderDet = UB.Repository(entityName)
    .attrs(['dateFrom', 'employeePositionID.dateFrom', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(item => {
    let itemDateFrom = dateService.shiftDate(item.dateFrom)
    let posDateFrom = dateService.shiftDate(item['employeePositionID.dateFrom'])
    if (posDateFrom > itemDateFrom) {
      let empName = nameCase.getEmpShortNameFromParts(item.firstName, item.middleName, item.lastName)
      errors.push(UB.i18n(`Для працівника {0} дата призначення на посаду більша за дата початку пункту наказу`, empName))
    }
  })
  return errors.length ? errors : null
}

/* Перевірка, щоб кількість днів в шапці пункту наказу на відпустку = сумарній кількості днів в деталях пункту наказу */
function validateVacDayCount (empOrderType, orderID) {
  const entityName = orderService.getEntityByEmpOrderType(empOrderType)
  const orderDet = UB.Repository(entityName)
    .attrs(['ID', 'dayCount', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(item => {
    let listDet = UB.Repository('hr_empOrderVacationListDet')
      .attrs(['SUM([dayCount])'])
      .where('paraID', '=', item.ID)
      .selectAsObject({
        'SUM([dayCount])': 'dayCount'
      })[0]
    if (item.dayCount && listDet && listDet.dayCount && item.dayCount !== listDet.dayCount) {
      let empName = nameCase.getEmpShortNameFromParts(item.firstName, item.middleName, item.lastName)
      errors.push(UB.i18n(`Для працівника {0} сума днів відпустки по видам відпусток ({1} дн.) не співпадає з кількістю днів пункту наказу ({2} дн.) `, empName, listDet.dayCount, item.dayCount))
    }
  })
  return errors.length ? errors : null
}

/* Перевірка, щоб кількість днів відпустки на рік не перевищувало 59 дн. */
function validateYearMaxDate (empOrderType, entityName, orderID) {
  const orderDet = UB.Repository(entityName)
    .attrs(['ID', 'employeeNumberID', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let yearListDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['paraID', 'dateFrom', 'dateTo', 'dayCount', 'dictVacationKindID'])
    .where('orderID', '=', orderID)
    .where('dictVacationKindID.isForYear', '=', true)
    .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  let errors = []
  const maxDays = timService.CONSTANTS.yearVacMaxDays
  orderDet.forEach(oitem => {
    let listDet = yearListDet.filter(itm => itm.paraID === oitem.ID)
    if (listDet.length) {
      let yearData = {}
      const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', oitem.employeeNumberID).selectScalar()
      listDet.forEach(item => {
        let yearFrom = new Date(item.dateFrom).getFullYear()
        let yearTo = new Date(item.dateTo).getFullYear()
        for (let currYear = yearFrom; currYear <= yearTo; currYear++) {
          let periodDateFrom = dateService.getYearBegin(currYear)
          let periodDateTo = dateService.getYearEnd(currYear)
          let currYearDaysFact = timService.getPeriodVacDaysByTimesheet(oitem.employeeNumberID, item.dictVacationKindID,
            periodDateFrom, periodDateTo, true)
          let itemDayCount = timService.getPeriodPlanVacDays(item.dateFrom, item.dateTo, periodDateFrom, periodDateTo,
            item.dictVacationKindID, item.dayCount, orgID)
          if (yearData[currYear]) {
            yearData[currYear] += itemDayCount
          } else {
            yearData[currYear] = currYearDaysFact + itemDayCount
          }
        }
      })
      Object.keys(yearData).forEach(yy => {
        if (yearData[yy] > maxDays) {
          let empName = nameCase.getEmpShortNameFromParts(oitem.firstName, oitem.middleName, oitem.lastName)
          errors.push(UB.i18n(`Для працівника {0} сумарна кількість днів щорічних відпусток за {1} рік перевищує {2} днів`, empName, yy, maxDays))
        }
      })
    }
  })
  return errors
}

function validateVacationRet (empOrderType, orderID) {
  const orderDet = UB.Repository('hr_empOrderVacationretDet')
    .attrs('ID', 'employeeNumberID', 'employeeNumberID.description', 'employeePositionID.description', 'empOrderVacationLongID', 'dateFrom', 'orderID.organizationID', 'orderID.description', 'employeePositionID')
    .where('orderID', '=', orderID)
    .where('empOrderType', '=', empOrderType)
    .selectAsObject()
  let errors = []

  orderDet.forEach(det => {
    const lastOrder = UB.Repository('hr_empOrderDet')
      .attrs('ID', 'dateFrom', 'dateTo', 'orderID.description')
      .where('empOrderType', 'in', ['VACATIONLONG', 'VACATIONPROLONGL'])
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('organizationID.mi_data_id', '=', det['orderID.organizationID'])
      .where('employeeNumberID', '=', det['employeeNumberID'])
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectSingle()
    if (lastOrder && dateService.shiftDate(det['dateFrom']) < dateService.shiftDate(lastOrder['dateFrom'])) {
      errors.push(UB.i18n(`Для працівника {0} існує {1} з більш пізньою датою`, det['employeeNumberID.description'], lastOrder['orderID.description']))
    }

    const existOrder = UB.Repository('hr_empOrderVacationretDet')
      .attrs(['ID', 'empOrderVacationLongID', 'orderID.description', 'dateFrom'])
      .where('empOrderVacationLongID', 'equal', det.empOrderVacationLongID)
      .where('employeePositionID', 'equal', det.employeePositionID)
      .where('orderID.orderState', 'in', ['POSTED'])
      .where('dateFrom', '>', det.dateFrom)
      .selectAsObject()
    if (existOrder && existOrder.length) {
      errors.push(`Увага. Працівника ${det['employeePositionID.description']} виведено з довготривалої відпустки з ${dateService.formatDate(existOrder[0].dateFrom)} за ${existOrder[0]['orderID.description']}. Для коректної роботи системи потрібно розпровести ${existOrder[0]['orderID.description']} перед проведенням поточного наказу.`)
    }
  })

  return errors.length ? errors : null
}

function checkImpartibleVac (employeeNumberID, vacationKindID, dateFrom, dayCount, dayCountFactCorr, daysDiff) {
  let res
  if (dayCount !== undefined) {
    const impartibleData = UB.Repository('hr_dictImpartibleVac')
      .attrs(['dayCount'])
      .where('dictVacationKindID', '=', vacationKindID)
      .orderBy('dayCount')
      .groupBy('dayCount')
      .selectAsObject()
    if (impartibleData.length > 0) {
      let impartibleDaysFound = false
      let impartibleDayArr = []
      for (let i = 0; i < impartibleData.length; i++) {
        let impartibleRec = impartibleData[i]
        if (impartibleRec.dayCount === dayCount) {
          impartibleDaysFound = true
        }
        impartibleDayArr.push(impartibleRec.dayCount)
      }
      let impartibleDays = impartibleDayArr.join(', ')
      if (!impartibleDaysFound) {
        return UB.i18n(`Невірно вказана тривалість відпустки. Можлива тривалість відпустки - {0} дн.`, impartibleDays)
      }

      dayCountFactCorr = dayCountFactCorr || 0
      daysDiff = daysDiff || 0
      if (dayCountFactCorr !== 0 || daysDiff !== 0) {
        let restDays = daysDiff ? daysDiff - dayCount : dayCount - dayCountFactCorr
        let isAllowedException = restDays === 0 || impartibleDayArr.includes(restDays)
        if (!isAllowedException) {
          return UB.i18n(`Невірно вказана тривалість відпустки. Можливий залишок відпустки - 0, {0} дн.`, impartibleDays)
        }
      }
    }
  }
  return res
}

function checkMainPart (employeeNumberID, dateFrom, dateTo, dayCount, isMainPart, addInfo, addInfoParams) {
  let res
  const hrEmpVacationPlan = global.hr_empVacationPlan
  const yearVacMainPart = timService.CONSTANTS.yearVacMainPart
  if (isMainPart === undefined) {
    isMainPart = dayCount >= yearVacMainPart
  }
  let currPeriodID
  if (!addInfo && addInfoParams) {
    const dictVacationKindCode = UB.Repository('hr_dictVacationKind')
      .attrs(['code'])
      .where('ID', '=', addInfoParams.dictVacationKindID)
      .selectScalar()
    if (dictVacationKindCode !== 'dYear') {
      return res
    }
    currPeriodID = addInfoParams.currPeriodID
    addInfo = { upToDate: isMainPart ? dateTo : undefined, currPeriodID: currPeriodID }
    hrEmpVacationPlan.getAvailableVacationDays(employeeNumberID, addInfoParams.orgID, dateFrom, addInfoParams.dictVacationKindID, addInfo)
  }
  let partPlanDays = addInfo.partPlanDays
  let currentPeriodDaysDiff = addInfo.currentPeriodDaysDiff
  let mainPartIsUsedParams = {
    mParams: {
      employeeNumberID: employeeNumberID,
      dateFrom: dateFrom,
      dateTo: dateTo,
      currPeriodID: currPeriodID
    }
  }
  hrEmpVacationPlan.getMainPartIsUsed(mainPartIsUsedParams)
  const mainPartIsUsed = mainPartIsUsedParams.mParams.result
  const isBackOrder = mainPartIsUsedParams.mParams.isBackOrder
  let isError = false
  if (!isBackOrder) {
    if (isMainPart) {
      /* Перевірка, чи доступна нерозривна кількість днів yearVacMainPart */
      isError = !mainPartIsUsed && dayCount < yearVacMainPart && partPlanDays < dayCount && (currentPeriodDaysDiff - dayCount) < yearVacMainPart
    } else {
      /* Перевірка, чи надалі буде доступна нерозривна кількість днів yearVacMainPart */
      isError = !mainPartIsUsed && partPlanDays < dayCount && (currentPeriodDaysDiff - dayCount) < yearVacMainPart
    }
  }
  if (isError) {
    res = UB.i18n(`Вам потрібно використати нерозривну частину відпустки - {0} календарних днів`, yearVacMainPart)
  }
  return res
}

function checkVacUsed (empOrderType, entityName, orderID) {
  let res
  const orderDet = UB.Repository(entityName)
    .attrs(['employeeNumberID', 'dateFrom', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  for (let i = 0; i < orderDet.length; i++) {
    let orderItem = orderDet[i]
    let vacPeriods4Del = UB.Repository('hr_empVacationPeriod')
      .attrs(['empVacationPlanID.dictVacationKindID.name'])
      .where('empVacationPlanID.employeeNumberID', '=', orderItem.employeeNumberID)
      .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
      .where('dateFrom', '>', orderItem.dateFrom)
      .where('dayCountFact', '>', 0)
      .selectAsObject()
    if (vacPeriods4Del.length > 0) {
      let perItem = vacPeriods4Del[0]
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      res = UB.i18n(`Працівнику {0} була надана відпустка в майбутньому періоді. ` +
          `Виправте дані в картці працівника сторінці "Право на відпустку" по виду відпустки ` +
          `"${perItem['empVacationPlanID.dictVacationKindID.name']}"`, empName)
      break
    }
  }
  return res
}

/* Перевірка на перетин з іншими відпустками працівника */
function checkVacationCrossPeriod (empOrderType, entityName, orderID) {
  const hrEmpOrderVacationListDet = global['hr_empOrderVacationListDet']
  const orderDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'orderID', 'employeeNumberID', 'employeePositionID', 'dateFrom', 'dateTo', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    /* неперіодична відпустка може перетинати періодичну, запит UBHR-10981 */
    .where('orderID.empOrderType', '!=', 'VACATIONLONG')
    .selectAsObject()
  let errors = []
  orderDet.forEach(orderItem => {
    let ctx = {
      mParams: {
        execParams: {
          employeeNumberID: orderItem.employeeNumberID,
          employeePositionID: orderItem.employeePositionID,
          dateFrom: orderItem.dateFrom,
          dateTo: orderItem.dateTo,
          orderID: orderItem.orderID,
          listDetID: orderItem.ID
        }
      }
    }
    hrEmpOrderVacationListDet.checkVacationCrossPeriod(ctx)
    if (ctx.mParams.msg) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(`${UB.i18n('Для працівника')} ${empName} ${nameCase.uncap(ctx.mParams.msg)}`)
    }
  })
  return errors.length ? errors : null
}

/* Перевірка в табелі на перетин з забороненими елементами */
function checkVacationCrossTimeSheet (empOrderType, entityName, orderID) {
  const hrEmpOrderVacationListDet = global['hr_empOrderVacationListDet']
  const orderDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['employeeNumberID', 'dictVacationKindID', 'dateFrom', 'dateTo', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(orderItem => {
    let ctx = {
      mParams: {
        execParams: {
          employeeNumberID: orderItem.employeeNumberID,
          dictVacationKindID: orderItem.dictVacationKindID,
          dateFrom: orderItem.dateFrom,
          dateTo: orderItem.dateTo
        }
      }
    }
    hrEmpOrderVacationListDet.checkVacationCrossTimeSheet(ctx)
    if (ctx.mParams.msg) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(`${UB.i18n('Для працівника')} ${empName} ${nameCase.uncap(ctx.mParams.msg)}`)
    }
  })
  return errors.length ? errors : null
}

/* Для відпустки з мат. допомогою перевірка, щоб за рік була лише одна така допомога */
function checkMoneyHelpVac (empOrderType, entityName, orderID) {
  const hrEmpOrderVacationListDet = global['hr_empOrderVacationListDet']
  const orderDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'paraID', 'orderID', 'employeeNumberID', 'dictVacationKindID', 'dateFrom', 'grantParaID.isMoneyHelp',
      'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(orderItem => {
    let ctx = {
      mParams: {
        execParams: {
          employeeNumberID: orderItem.employeeNumberID,
          dictVacationKindID: orderItem.dictVacationKindID,
          dateFrom: orderItem.dateFrom,
          orderID: orderItem.orderID,
          orderDetID: orderItem.paraID,
          isMoneyHelp: orderItem['grantParaID.isMoneyHelp'],
          skipVacKindCheck: true
        }
      }
    }
    hrEmpOrderVacationListDet.checkMoneyHelpVac(ctx)
    let msg = ctx.mParams.msg && JSON.parse(ctx.mParams.msg)
    if (msg && msg.length) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(`${UB.i18n('Для працівника')} ${empName} ${nameCase.uncap(msg[0].msg)}`)
    }
  })
  return errors.length ? errors : null
}

/* Перевірка, щоб в наказі не дублювалися працівники */
function checkEmpDuplicates (empOrderType, entityName, orderID) {
  const orderDet = UB.Repository('hr_empOrderDet')
    .attrs(['employeeID', 'employeeID.shortFIO', 'COUNT(*)'])
    .where('orderID', '=', orderID)
    .where('empOrderType', '=', 'CHGEMPLOYEE')
    .groupBy(['employeeID', 'employeeID.shortFIO'])
    .orderByDesc('COUNT(*)')
    .selectAsObject({
      'COUNT(*)': 'cnt'
    })
  let errors = []
  for (let i = 0; i < orderDet.length; i++) {
    let orderItem = orderDet[i]
    if (orderItem.cnt > 1) {
      errors.push(UB.i18n(`Для персони {0} зміни вказано декілька разів`, orderItem['employeeID.shortFIO']))
    } else {
      break
    }
  }
  return errors.length ? errors : null
}

/* Перевірка на перетин з іншими відкликаннями відпустки працівника */
function checkVacationRevokeCrossPeriod (empOrderType, entityName, orderID) {
  const hrEmpOrderVacationrevokeDet = global['hr_empOrderVacationrevokeDet']
  const orderDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['ID', 'orderID', 'employeeNumberID', 'dateFrom', 'dateTo', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(orderItem => {
    let ctx = {
      mParams: {
        execParams: {
          employeeNumberID: orderItem.employeeNumberID,
          dateFrom: orderItem.dateFrom,
          dateTo: orderItem.dateTo,
          orderID: orderItem.orderID,
          listDetID: orderItem.ID
        }
      }
    }
    hrEmpOrderVacationrevokeDet.checkVacationCrossPeriod(ctx)
    if (ctx.mParams.msg) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(`${UB.i18n('Для працівника')} ${empName} ${nameCase.uncap(ctx.mParams.msg)}`)
    }
  })
  return errors.length ? errors : null
}

/* Перевірка на дні відкликання, для яких не знайдено відпустку */
function checkNoVacDays (empOrderType, entityName, orderID) {
  const hrEmpOrderVacationrevokeDet = global['hr_empOrderVacationrevokeDet']
  const orderDet = UB.Repository('hr_empOrderVacationrevokeDet')
    .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(orderItem => {
    let ctx = {
      mParams: {
        execParams: {
          employeeNumberID: orderItem.employeeNumberID,
          dateFrom: orderItem.dateFrom,
          dateTo: orderItem.dateTo
        }
      }
    }
    hrEmpOrderVacationrevokeDet.checkNoVacDays(ctx)
    if (ctx.mParams.msg) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(`${UB.i18n('Для працівника')} ${empName} ${nameCase.uncap(ctx.mParams.msg)}`)
    }
  })
  return errors.length ? errors : null
}

/* Перевірка, щоб види відпустки в періодах мали позначку "Можливість відкликання з відпустки" */
function checkBreakVacancy (empOrderType, entityName, orderID) {
  const orderDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['dictVacationKindID.name', 'dictVacationKindID.isBreackVacancy', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  let errors = []
  orderDet.forEach(orderItem => {
    if (!orderItem['dictVacationKindID.isBreackVacancy']) {
      let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
      errors.push(UB.i18n(`Для працівника {0} вид відпустки '{1}' - без позначки "Переривання відпустки", що системою не дозволено. Налаштуйте види відпустки`, empName, orderItem['dictVacationKindID.name']))
    }
  })
  return errors.length ? errors : null
}

/* Перевірка, щоб для пункту наказу по компенсації відпустки існували записи по видам відпустки */
function checkCompList (empOrderType, entityName, orderID) {
  const noCompItems = UB.Repository('hr_empOrderVacationcompDet')
    .attrs(['ID', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .notExists(UB.Repository('hr_empOrderVacationcompListDet')
      .correlation('paraID', 'ID')
      .where('orderID', '=', orderID)
      .where('dayComp', '>', 0)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  let errors = []
  if (noCompItems.length > 0) {
    let empNames = noCompItems.map(item => nameCase.getEmpShortNameFromParts(item.firstName, item.middleName, item.lastName))
    errors.push(UB.i18n(`Не додано інформацію про кількість днів компенсації для працівників: {0}`, empNames.join(', ')))
  }
  return errors.length ? errors : null
}

/* Перевірка, щоб у пунктах наказу були вказані періоди */
function checkVacationPeriod (empOrderType, entityName, orderID) {
  let res = null
  const orderDet = UB.Repository('hr_empOrderDet')
    .attrs(['ID', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .where('isGroup', '=', true)
    .where('empOrderType', 'in', ['VACATION', 'VACATIONPROLONG', 'VACATIONREVOKE'])
    .notExists(UB.Repository('hr_empOrderVacationListDet')
      .correlation('paraID', 'ID')
      .where('isGroup', '=', false)
      .where('mi_deleteDate', '>=', '#maxdate'))
    .selectAsObject()
  const isProlong = (empOrderType === 'VACATIONPROLONG')
  let prolongDet
  if (isProlong) {
    prolongDet = UB.Repository('hr_empOrderVacationprolongDet')
      .attrs(['ID', 'action'])
      .where('orderID', '=', orderID)
      .selectAsObject()
  }
  let errEmps = []
  orderDet.forEach(orderItem => {
    if (isProlong) {
      let prolongDetItem = prolongDet.find(itm => itm.ID === orderItem.ID)
      if (prolongDetItem && prolongDetItem.action !== 'PROLONG') {
        // Для наказу продовження для режиму "Перенесення", "Скасування" - не перевіряти
        return
      }
    }
    let empName = nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName)
    if (!errEmps.includes(empName)) {
      errEmps.push(empName)
    }
  })
  if (errEmps.length) {
    if (isProlong) {
      res = UB.i18n(`Для працівника {0} необхідно заповнити дані про подовження відпустки`, errEmps.join(', '))
    } else {
      res = UB.i18n(`Існують пункти наказу, для яких не внесені періоди надання відпустки у {0}`, errEmps.join(', '))
    }
  }
  return res
}

function checkFundSourceMtCount (empOrderType, orderID) {
  const errors = []
  let entityName = null
  switch (empOrderType) {
    case 'APPOINT':
      entityName = 'hr_empOrderAppointDet'
      break
    case 'MOVE':
      entityName = 'hr_empOrderMoveDet'
      break
    case 'PLURALIST':
      entityName = 'hr_empOrderPluralistDet'
      break
    case 'PROLONGATION':
      entityName = 'hr_empOrderProlongationDet'
      break
  }
  const posWrongMtCount = UB.Repository(entityName)
    .attrs('firstName', 'middleName', 'lastName')
    .where('orderID', '=', orderID)
    .where('mtCount', '>', 1)
    .selectAsObject({
      'employeePositionID.description': 'description'
    })
  const errEmps = []
  posWrongMtCount.forEach(orderItem => {
    errEmps.push(nameCase.getEmpShortNameFromParts(orderItem.firstName, orderItem.middleName, orderItem.lastName))
  })
  if (errEmps.length) {
    errors.push(UB.i18n('Кількість ставок працівників {0} за основним місцем роботи більше 1', errEmps.join(',')))
  }
  const order = UB.Repository('hr_empOrder')
    .attrs('ID', 'organizationID')
    .selectById(orderID)
  const fundSourceAccounting = settingsService.getByCode('hrFundSourceAccounting', order.organizationID)
  if (fundSourceAccounting === 'STAFF') {
    const orderFundSource = UB.Repository('hr_empOrderFundSource')
      .attrs(['ID', 'dictFundSourceID', 'mtCount', 'paraID.positionID', 'paraID.dateFrom', 'paraID.firstName', 'paraID.middleName', 'paraID.lastName'])
      .where('orderID', '=', orderID)
      .where('paraID.positionID', 'isNotNull')
      .selectAsObject({
        'paraID.positionID': 'positionID',
        'paraID.dateFrom': 'dateFrom',
        'paraID.firstName': 'firstName',
        'paraID.middleName': 'middleName',
        'paraID.lastName': 'lastName'
      })
    orderFundSource.forEach(item => {
      const onDate = dateService.shiftDate(item.dateFrom)
      const posFundSource = global['hr_empOrderFundSource'].getPosFundSource(item.positionID, onDate, item.dictFundSourceID)
      posFundSource.forEach(fs => {
        if (fs.posVac < item.mtCount) {
          const delta = (item.mtCount || 0) - (fs.posVac || 0)
          const empName = nameCase.getEmpShortNameFromParts(item.firstName, item.middleName, item.lastName)
          errors.push(UB.i18n('Кількість ставок посади працівника {0} по джерелу фінансування "{1}" перевищена на {2}', empName, fs['dictFundSourceID.description'], delta.toFixed(2)))
        }
      })
    })
  }
  return errors
}

function checkFamilyTaxCode (empOrderType, entityName, orderID) {
  const orderDet = UB.Repository('hr_empOrderChgSalEmpDet')
    .attrs(['employeeFamilyID.peopleID.fullFIO'])
    .where('orderID', '=', orderID)
    .where('employeeFamilyID', 'isNotNull')
    .where('employeeFamilyID.peopleID.taxCode', 'isNull')
    .selectAsObject()
  let errors = []
  if (orderDet.length) {
    errors.push(UB.i18n(`Для оформлення виплати матеріальної допомоги необхідно заповнити значення коду "РНОКПП" для отримувача {0}`, orderDet.map(o => o['employeeFamilyID.peopleID.fullFIO']).join(',')))
  }
  return errors.length ? errors : null
}

/* Перевірка Додаткової соціальної відпустки працівникам, які мають дітей з урахуванням ознаки "Тільки залишки нового періоду надання відпустки" */
/* Перевіряються лише, щоб значення відповідало значенням попередніх періодів, якщо не встановлено вищевказану галочку (UBHR-15814) */
/* Перевірка відповідності "Тривалості неподільних частин відпусток" виконується методом hr_empOrderVacationListDet.checkImpartibleVac */
function checkDChildPeriodDays ({ employeeNumberID, dictVacationKindID, onDate, dayCount, isNewVacation }) {
  let msg = ''
  const vacKind = UB.Repository('hr_dictVacationKind')
    .attrs(['code'])
    .selectById(dictVacationKindID)
  if (vacKind.code === 'dChild') {
    const predefinedPeriodDays = UB.Repository('hr_dictImpartibleVac')
      .attrs(['dayCount'])
      .where('dictVacationKindID', '=', dictVacationKindID)
      .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('dayCount')
      .selectAsObject()
    if (predefinedPeriodDays && predefinedPeriodDays.length) {
      const predefDays = predefinedPeriodDays.map(pd => pd.dayCount)
      const minVal = _.min(predefDays) // 7 дн
      const maxVal = _.max(predefDays) // 17 дн
      if (!isNewVacation) {
        // перевіряємо всі періоди
        const vacPeriod = UB.Repository('hr_empVacationPeriod')
          .attrs(['dayCountPlan'])
          .where('dateFrom', '<=', onDate)
          .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
          .where('empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
          .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
          .orderBy('dateFrom')
          .selectAsObject()
        if (vacPeriod.length > 0) {
          const uDayCounts = [...new Set(vacPeriod.map(item => item.dayCountPlan))].sort((a, b) => a > b ? 1 : 0)
          /* Якщо в якомусь періоді було 17 дн, то не перевіряти, бо можна заносити любе знач. 7, 10 або 17 */
          if (!uDayCounts.includes(maxVal) && !uDayCounts.includes(dayCount)) {
            msg = UB.i18n('Для додаткової соціальної відпустки працівникам, які мають дітей тривалість днів не відповідає значенням попередніх періодів ({0})',
              uDayCounts.join(', '))
          }
        }
      }
      if (!msg) {
        // Перевіряємо поточний період
        const currPeriod = UB.Repository('hr_empVacationPeriod')
          .attrs(['dayCountPlan'])
          .where('dateFrom', '<=', onDate)
          .where('dateTo', '>=', onDate)
          .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
          .where('empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
          .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
          .limit(1)
          .selectSingle()
        if (currPeriod && currPeriod.dayCountPlan) {
          // Не може бути (dayCount = 7 та dayCountPlan = 10)
          if (dayCount === minVal && currPeriod.dayCountPlan < maxVal) {
            msg = UB.i18n('Для додаткової соціальної відпустки працівникам, які мають дітей тривалість днів не відповідає значенню поточного періоду {0}',
              currPeriod.dayCountPlan)
          }
        }
      }
    }
  }
  return msg
}

function validateAveragePay (empOrderType, orderID) {
  // перевіряємо наявність елементу обліку робочого часу
  const orderDet = UB.Repository('hr_empOrderAveragepayDet')
    .attrs('ID', 'payElID.dictTimeCostID', 'payElID.description')
    .where('orderID', '=', orderID)
    .where('empOrderType', '=', empOrderType)
    .exists(UB.Repository('hr_empOrderEmployeeDet')
      .correlation('paraID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject()
  const errors = []
  const noDictTimeCost = orderDet.filter(o => !o['payElID.dictTimeCostID'])
  if (noDictTimeCost.length) {
    errors.push(UB.i18n('Для наступних видів оплати не вказано елемент обліку робочого часу:'))
    errors.push(...noDictTimeCost.map(o => o['payElID.description']))
  } else {
    const employeeDet = UB.Repository('hr_empOrderEmployeeDet')
      .attrs('ID', 'employeePositionID', 'employeePositionID.description', 'dateFrom', 'dateTo', 'employeeID.fullFIO', 'employeeID')
      .where('paraID', 'in', orderDet.map(o => o.ID))
      .selectAsObject()
    const hasError = employeeDet.filter(o => !o.dateFrom || !o.dateTo)
    if (hasError.length) {
      errors.push(UB.i18n(`Для працівників {0} не заповнена "дата з" або "дата по"`, hasError.map(o => o['employeeID.fullFIO']).join(',')))
    } else {
      employeeDet.forEach(row => {
        row['dateFrom'] = dateService.shiftDate(row['dateFrom'])
        row['dateTo'] = dateService.shiftDate(row['dateTo'])
      })
      const crossEmp = []
      employeeDet.forEach(row => {
        const crossItem = employeeDet.find(o => o.ID !== row.ID && o.employeePositionID === row.employeePositionID && row['dateFrom'] <= o['dateTo'] && row['dateTo'] >= o['dateFrom'])
        if (crossItem && !crossEmp.find(o => o.employeeID === row.employeeID)) {
          crossEmp.push({
            employeeID: row.employeeID,
            description: row['employeeID.fullFIO']
          })
        }
      })
      if (crossEmp.length) {
        errors.push(UB.i18n(`Для працівників {0} внесені рядки з періодами роботи, які перетинаються`, crossEmp.map(o => o.description).join(',')))
      }
    }
  }
  return errors.length ? errors : null
}
