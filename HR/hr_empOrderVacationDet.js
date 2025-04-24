const UB = require('@unitybase/ub')
const _ = require('lodash')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const orderService = require('../HR/modules/orderService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const timService = require('../HR/modules/timService')
const timeCostService = require('../HR/modules/timeCostService')
const nameCase = require('../HR/modules/nameCase')
const staffService = require('../HR/modules/staffService')
const settingsService = require('../AC/modules/entityServices/settingsService')

me.yearVacMainPart = timService.CONSTANTS.yearVacMainPart
me.yearVacMaxDays = timService.CONSTANTS.yearVacMaxDays
me.dNotVacDays = timService.CONSTANTS.dNotVacDays

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.entity.addMethod('getDescriptionExt')
me.entity.addMethod('addPeriods')
me.entity.addMethod('createOrder')
me.entity.addMethod('addOrderItems')
me.entity.addMethod('addIntComb')
me.entity.addMethod('addMultiOrder')
me.entity.addMethod('checkVacProlong')
me.entity.addMethod('checkVacPlanIsNotDeleted')
me.entity.addMethod('checkSicknessCrossTimeSheet')
me.entity.addMethod('doPosting')
me.entity.addMethod('doCancelPosting')

/**
 * Отримати розширений опис відпустки
 * @param {number} ID ID пункта наказу
 */
me.getDescriptionExt = function (ID) {
  let data = UB.Repository(__entityName)
    .attrs(['employeeID.shortFIO', 'dateFrom', 'dateTo', 'calcDateTo', 'description', 'orderID.orderNumber', 'orderID.orderDate'])
    .selectById(ID)
  let dateFrom = dateService.formatDate(data['dateFrom'])
  let dateTo = data.calcDateTo || data.dateTo
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  return UB.i18n(`{0}, з {1}{2}, № {3} від {4}`, data['employeeID.shortFIO'], dateFrom, dateToStr, data['orderID.orderNumber'], dateService.formatDate(data['orderID.orderDate']))
}

function getDescription (dateFrom, dateTo, dayCount, isMoneyHelp) {
  let dateFromStr = dateService.formatDate(dateFrom)
  let dateToStr = dateTo ? ' по ' + dateService.formatDate(dateTo) : ''
  let dayCountStr = dayCount ? ' тривалістю ' + dayCount + '  днів' : ''
  let isMoneyHelpStr = isMoneyHelp ? ', матдопомога' : ''
  return UB.i18n(`Відпустка з {0}{1}{2}{3}`, dateFromStr, dateToStr, dayCountStr, isMoneyHelpStr)
}

function setAttrs (ctx, op) {
  orderService.setEmpOrderAttrs(ctx, {
    checkIsGroup: true,
    noSetDescription: true
  })
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.dateFrom || execParams.dateTo || execParams.dayCount || execParams.isMoneyHelp) {
    let dateFrom = execParams.dateFrom || instanceData.dateFrom
    let dateTo = execParams.calcDateTo || instanceData.calcDateTo || execParams.dateTo || instanceData.dateTo
    let dayCount = execParams.calcDayCount || instanceData.calcDayCount || execParams.dayCount || instanceData.dayCount
    let isMoneyHelp = execParams.isMoneyHelp !== undefined ? execParams.isMoneyHelp : instanceData.isMoneyHelp
    execParams.description = getDescription(dateFrom, dateTo, dayCount, isMoneyHelp)
  }
  /* Check for "Record modified by another user" error */
  let currentDate = new Date()
  let modifyDate = execParams.mi_modifyDate || instanceData.mi_modifyDate
  if (currentDate > modifyDate) {
    execParams.mi_modifyDate = currentDate
  }
}

function beforeInsert (ctx) {
  global['hr_empOrderDet'].setItemIdx(ctx)
  setAttrs(ctx)
}

function beforeUpdate (ctx) {
  if (ctx.mParams.isOrderOperation) {
    return
  }
  setAttrs(ctx)
}

function checkPredefinedPeriodDays (vacCode, dayCount) {
  let res = { dayCount: dayCount }
  if (dayCount) {
    if (!me.predefinedPeriodDays) {
      me.predefinedPeriodDays = UB.Repository('hr_dictImpartibleVac')
        .attrs(['dictVacationKindID.code', 'dayCount'])
        .where('dictVacationKindID.mi_deleteDate', '>=', '#maxdate')
        .orderByDesc('dayCount')
        .selectAsObject({
          'dictVacationKindID.code': 'code'
        })
    }
    let predefValues = me.predefinedPeriodDays.filter(item => item.code === vacCode)
    if (predefValues.length) {
      let resDays = 0
      for (let i = 0; i < predefValues.length; i++) {
        let val = predefValues[i].dayCount
        if (val <= dayCount) {
          resDays = val
          break
        }
      }
      res.dayCount = resDays
    }
  }
  return res
}

/**
 * Додати періоди відпустки
 * @param {object} ctx
 * @param {string} ctx.mParams.mode режим виконання: 'CHECKONLY' - лише перевірка можливості додавання, 'ADDONLY' - додавання без перевірок, 'CHECK_AND_ADD' - перевірка і додавання
 * @param {number} ctx.mParams.virtualAdd повернення масиву доданих періодів в mParams.addedPeriods, без додавання їх в базі
 * @param {number} ctx.mParams.paraID ID деталі
 * @param {number} ctx.mParams.orderID ID наказу
 * @param {number} ctx.mParams.orgID ID організації
 * @param {number} ctx.mParams.dictVacationKindID вид відпустки, не обов'язкове
 * @param {number} ctx.mParams.favoriteVacKindID вид відпустки, який повинен першим вибиратися, не обов'язкове
 * @param {number} ctx.mParams.employeeNumberID ID запису з таб. номер працівника, передається, якщо paraID - пусте
 * @param {Date} ctx.mParams.dateFrom дата початку, передається, якщо paraID - пусте
 * @param {Date} ctx.mParams.dateTo дата закінчення, передається, якщо paraID - пусте
 * @return {Object} ctx.mParams.addedPeriods додані періоди, заповнюється при mParams.virtualAdd
 */
me.addPeriods = function (ctx) {
  const mParams = ctx.mParams
  const mode = mParams.mode || 'CHECK_AND_ADD'
  const toAdd = ['ADDONLY', 'CHECK_AND_ADD'].includes(mode)
  const toCheck = ['CHECK', 'CHECK_AND_ADD'].includes(mode)
  const toInsert = !mParams.virtualAdd
  const orderDetEntity = mParams.orderDetEntity || __entityName

  const paraID = mParams.paraID
  const orderID = mParams.orderID
  let dictVacationKindID = mParams.dictVacationKindID
  const favoriteVacKindID = mParams.favoriteVacKindID || 0
  let employeeNumberID
  let dateFrom
  let dateTo
  if (paraID) {
    const instanceData = UB.Repository(orderDetEntity)
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'dayCount'])
      .selectById(paraID)
    employeeNumberID = instanceData.employeeNumberID
    dateFrom = dateService.shiftDate(instanceData.dateFrom)
    dateTo = dateService.shiftDate(instanceData.dateTo)
  } else {
    employeeNumberID = mParams.employeeNumberID
    dateFrom = dateService.shiftDate(mParams.dateFrom)
    dateTo = dateService.shiftDate(mParams.dateTo)
  }
  const dictVacationKindList = mParams.payElID ? UB.Repository('hr_dictVacationKind')
    .attrs('ID').where('payElID', '=', mParams.payElID).selectAsArrayOfValues() : []

  let periods = UB.Repository('hr_empVacationPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'empVacationPlanID.dictVacationKindID', 'empVacationPlanID.dictVacationKindID.code',
      'empVacationPlanID.dictVacationKindID.name', 'empVacationPlanID.dictVacationKindID.vactAccum', 'descriptionEx',
      'isMainPart', 'dayCountPlan', 'dayDiff'])
    .where('empVacationPlanID.employeeNumberID', '=', employeeNumberID)
    .whereIf(dictVacationKindID, 'empVacationPlanID.dictVacationKindID', '=', dictVacationKindID)
    .whereIf(!dictVacationKindID && dictVacationKindList.length, 'empVacationPlanID.dictVacationKindID', 'in', dictVacationKindList)
    .where('empVacationPlanID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(dateFrom, 'dateFrom', '<=', dateFrom)
    .selectAsObject()
  if (periods.length > 0) {
    const storeEmpVacListDet = UB.DataStore('hr_empOrderVacationListDet')
    periods.forEach(per => {
      let orderIdx = 3
      if (per['empVacationPlanID.dictVacationKindID'] === favoriteVacKindID) {
        orderIdx = 0
      } else if (per['empVacationPlanID.dictVacationKindID.code'].startsWith('dYear')) {
        // Спочатку Щорічна основна відпустка
        orderIdx = 1
      } else if (per['empVacationPlanID.dictVacationKindID.vactAccum'] === '1') {
        // Потім відпустка з ознакою "Не накопичується"
        orderIdx = 2
      }
      per.orderIdx = orderIdx
    })

    let addedPeriods = []
    if (toAdd) {
      if (mParams.useNewPeriods) {
        const maxYear = Math.max.apply(null, periods.map(p => dateService.shiftDate(p.dateFrom).getFullYear()))
        periods.forEach(pItem => {
          pItem.byYear = dateService.shiftDate(pItem.dateFrom).getFullYear() === maxYear ? 0 : 1
        })
        periods = _.orderBy(periods, ['orderIdx', 'byYear', 'dateFrom'], ['asc', 'asc', 'asc'])
      } else {
        periods = _.orderBy(periods, ['orderIdx', 'dateFrom'], ['asc', 'asc'])
      }
      const mdfDate = new Date()
      if (toInsert) {
        const empVacListDet = UB.Repository('hr_empOrderVacationListDet')
          .attrs(['ID'])
          .where('paraID', '=', paraID)
          .selectAsObject()
        empVacListDet.forEach(vacItem => {
          storeEmpVacListDet.run('delete', {
            skipOrderDelete: true,
            execParams: {
              ID: vacItem.ID,
              mi_modifyDate: mdfDate
            }
          })
        })
      }

      let checkPredefDaysObj
      let calcDateFrom = dateFrom
      for (let i = 0; i < periods.length; i++) {
        let period = periods[i]
        dictVacationKindID = period['empVacationPlanID.dictVacationKindID']
        let vacFact = timeCostService.getVacFactDays({ currPeriodID: period.ID, orgID: mParams.orgID })
        let dayDiff = (vacFact[0] && vacFact[0].dayDiff) || 0
        let vacCode = period['empVacationPlanID.dictVacationKindID.code']
        let calcDayCount = timService.getVacDays(calcDateFrom, dateTo, dictVacationKindID, mParams.orgID)
        if (toCheck) {
          /* Перевірка, щоб тривалість днів відпустки не перевищувала доступні дні з урахуванням всіх пунктів даного наказу */
          let otherDayCount = UB.Repository('hr_empOrderVacationListDet')
            .attrs('SUM([dayCount])')
            .where('orderID', '=', orderID)
            .where('empVacationPeriodID', '=', period.ID)
            .selectScalar() || 0
          dayDiff -= otherDayCount
          if (dayDiff <= 0) {
            continue
          }
        }
        let isPeriodPart = calcDayCount < dayDiff
        let periodDayCount
        let periodDateTo
        const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', employeeNumberID).selectScalar()
        if (isPeriodPart) {
          /* Доступні дні періода покриваються всю кількість днів відпустки */
          periodDayCount = calcDayCount
          periodDateTo = dateTo
        } else {
          periodDayCount = dayDiff
          periodDateTo = timService.getVacDateTo(calcDateFrom, periodDayCount, dictVacationKindID, orgID)
        }
        if (periodDayCount > 0) {
          checkPredefDaysObj = checkPredefinedPeriodDays(vacCode, periodDayCount)
          periodDayCount = checkPredefDaysObj.dayCount
          periodDateTo = timService.getVacDateTo(calcDateFrom, periodDayCount, dictVacationKindID, orgID)
        }
        if (periodDayCount > 0) {
          let isContinuous = !period.isMainPart && periodDayCount >= me.yearVacMainPart
          let description = UB.i18n(`Відпустка з {0} по {1} тривалістю {2} днів`, dateService.formatDate(calcDateFrom), dateService.formatDate(periodDateTo), periodDayCount)
          let newPeriodRecord = {
            itemIdx: i + 1,
            paraID: paraID,
            orderID: orderID,
            dictVacationKindID: dictVacationKindID,
            dateFrom: calcDateFrom,
            dateTo: periodDateTo,
            dayCount: periodDayCount,
            empVacationPeriodID: period.ID,
            description: description,
            isContinuous: isContinuous,
            isPart: period.dayCountPlan > periodDayCount
          }
          if (toInsert) {
            storeEmpVacListDet.run('insert', {
              execParams: newPeriodRecord
            })
          } else {
            newPeriodRecord['dictVacationKindID.name'] = period['empVacationPlanID.dictVacationKindID.name']
            newPeriodRecord['empVacationPeriodID.descriptionEx'] = period.descriptionEx
            newPeriodRecord['dayDiff'] = period.dayDiff
            addedPeriods.push(newPeriodRecord)
          }
          calcDateFrom = dateService.addDays(periodDateTo, 1)
          if (calcDateFrom > dateTo) {
            break
          }
        }
      }
    }
    if (!toInsert && addedPeriods.length) {
      mParams.addedPeriods = JSON.stringify(addedPeriods)
    }
    storeEmpVacListDet.freeNative()
  }
  return true
}

/**
 * Створити наказ на відпустку для планових відпусток
 * @param {object} ctx
 * @param {string} IDs ID-и записів планування відпустки
 * @param {boolean} particle часткове використання відпустки
 */
me.createOrder = function (ctx) {
  let mParams = ctx.mParams
  let IDs = mParams.IDs
  let particle = mParams.particle
  if (!IDs || !IDs.length) {
    return false
  }
  const vacDataAll = UB.Repository('hr_vacationSchedule')
    .attrs(['ID', 'organizationID', 'employeePositionID', 'dictVacationKindID', 'dayCount', 'dateFrom', 'dateTo',
      'isBountyHelp', 'employeeNumberID.description', 'employeePositionID.changeOrderID', 'employeePositionID.dateTo',
      'employeePositionID.changeOrderID.empOrderType'])
    .where('ID', 'in', IDs)
    .selectAsObject()

  const vacData = []
  const empDism = []
  vacDataAll.forEach(vacItem => {
    let vacDateFrom = dateService.shiftDate(vacItem['dateFrom'])
    if (vacItem['employeePositionID.changeOrderID'] && vacItem['employeePositionID.changeOrderID.empOrderType'] === 'DISM' &&
      vacItem['employeePositionID.dateTo'] && dateService.shiftDate(vacItem['employeePositionID.dateTo']) < vacDateFrom
    ) {
      empDism.push(vacItem['employeeNumberID.description'])
    } else {
      vacData.push(vacItem)
    }
  })

  if (vacData.length) {
    let organizationID = vacData[0].organizationID
    let orderNumber = UB.i18n('(проєкт)')
    let orderDate = dateService.currentTruncDate()
    let orderClass = UB.Repository('hr_orderClass')
      .attrs('ID')
      .where('entityName', '=', 'hr_empOrder')
      .selectScalar()

    const empOrderStore = UB.DataStore('hr_empOrder')
    let orderID = empOrderStore.generateID()
    empOrderStore.run('insert', {
      execParams: {
        ID: orderID,
        orderNumber: orderNumber,
        orderDate: orderDate,
        entryDate: orderDate,
        organizationID: organizationID,
        empOrderType: 'VACATION',
        orderClass: orderClass,
        periodID: periodService.getCurrentPeriod(organizationID).ID,
        reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}',
        particle: particle
      }
    })
    empOrderStore.freeNative()

    const empOrderDetStore = UB.DataStore('hr_empOrderVacationDet')
    const vacScheduleStore = UB.DataStore('hr_vacationSchedule')

    const useNewPeriods = Boolean(settingsService.getByCode('hrUseNewPeriodsVacationSchedule', organizationID))

    vacData.forEach(vacItem => {
      let paraID = empOrderDetStore.generateID()
      let daysCount = timService.getVacDays(vacItem.dateFrom, vacItem.dateTo, vacItem.dictVacationKindID, organizationID)
      empOrderDetStore.run('insert', {
        execParams: {
          ID: paraID,
          orderID: orderID,
          itemIdx: 1,
          organizationID: organizationID,
          employeePositionID: vacItem.employeePositionID,
          empOrderType: 'VACATION',
          dayCount: daysCount,
          dateFrom: vacItem.dateFrom,
          dateTo: vacItem.dateTo,
          isGroup: true,
          isMoneyHelp: vacItem.isBountyHelp
        }
      })

      me.addPeriods({
        mParams: {
          mode: 'CHECK_AND_ADD',
          paraID: paraID,
          orderID: orderID,
          isContinuous: false,
          dictVacationKindID: vacItem.dictVacationKindID,
          orgID: organizationID,
          useNewPeriods
        }
      })

      vacScheduleStore.run('update', {
        __skipOptimisticLock: true,
        isOrderOperation: true,
        execParams: {
          ID: vacItem.ID,
          orderFactID: orderID,
          orderFactDetID: paraID
        }
      })
    })

    vacScheduleStore.freeNative()
    empOrderDetStore.freeNative()

    mParams.orderID = orderID
  }
  mParams.empDism = JSON.stringify(empDism)
  return true
}

/**
 * Додати пункти наказу для списку працівників
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {array} mParams.employeeNumberIDs масив таб. номерів працівників
 * @param {number} mParams.dictVacationKindID вид відпустки
 * @param {date} mParams.dateFrom дата початку відпустки
 * @param {date} mParams.dateTo дата закінчення відпустки
 * @param {number} mParams.dayCount кількість днів
 * @param {string} mParams.reason причина надання відпустки
 */
me.addOrderItems = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeeNumberIDs = mParams.employeeNumberIDs
  const dictVacationKindID = mParams.dictVacationKindID
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const dayCount = mParams.dayCount
  const reason = mParams.reason

  let resInfo = timeCostService.addOrderItems(__entityName, 'VACATION', orderID, employeeNumberIDs, dateFrom,
    dateTo, dayCount, true, {
      description: getDescription(dateFrom, dateTo, dayCount),
      dictVacationKindID: dictVacationKindID,
      reason: reason,
      isMoneyHelp: false
    }, (orderDetID) => {
      me.addPeriods({
        mParams: {
          mode: 'ADDONLY',
          paraID: orderDetID,
          orderID: orderID,
          favoriteVacKindID: dictVacationKindID,
          orgID: mParams.orgID
        }
      })
    })
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

/**
 * Додати пункти наказу для внутріншнього сумісництва
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {number} mParams.employeePositionID основне місце роботи працівника
 * @param {date} mParams.dateFrom дата початку відпустки
 * @param {date} mParams.dateTo дата закінчення відпустки
 * @param {number} mParams.dayCount кількість днів
 * @param {string} mParams.reason причина надання відпустки
 * @param {boolean} mParams.isRst пропорційно до відпрацьованого часу
 */
me.addIntComb = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const employeePositionID = mParams.employeePositionID
  const dateFrom = mParams.dateFrom
  const dateTo = mParams.dateTo
  const dayCount = mParams.dayCount
  const reason = mParams.reason
  const isRst = mParams.isRst

  let resInfo = timeCostService.addIntCombVacOrderItems(__entityName, 'VACATION', orderID, employeePositionID, dateFrom,
    dateTo, dayCount, true, {
      description: getDescription(dateFrom, dateTo, dayCount),
      reason: reason,
      isRst: isRst,
      isMoneyHelp: false
    }, (orderDetID) => {
      me.addPeriods({
        mParams: {
          mode: 'ADDONLY',
          paraID: orderDetID,
          orderID: orderID,
          orgID: mParams.orgID
        }
      })
    })
  mParams.res = resInfo.res
  if (resInfo.msg) {
    mParams.msg = resInfo.msg
  }
}

/**
 * Додати пункти наказу для всіх організацій
 * @param {object} ctx
 * @param {number} mParams.orderID наказ
 * @param {number} mParams.paraID пункт наказу
 */
me.addMultiOrder = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const paraID = mParams.paraID
  const empOrder = UB.Repository('hr_empOrder')
    .attrs('titleOrder', 'preamble', 'reason', 'empOrderType', 'orderDate', 'entryDate', 'orderClass', 'organizationID', 'documentOrderType')
    .selectById(orderID)
  if (!empOrder) {
    throw new UB.UBAbort(`<<<${UB.i18n('Наказ не знайдено, можливо його було видалено')}>>>`)
  }
  const para = UB.Repository(__entityName)
    .attrs('employeePositionID', 'employeeID', 'dictVacationKindID', 'empOrderType', 'isRst', 'isMoneyHelp', 'moneyHelpPayElID',
      'dayCount', 'dateFrom', 'dateTo', 'reason', 'reasonDoc', 'isContinuous', 'empNameCase', 'title',
      'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName'
    )
    .selectById(paraID)
  if (!para) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено пункт наказу, можливо його було видалено')}>>>`)
  }
  const orgList = []
  const empPosition = UB.Repository('hr_employeePositionS')
    .attrs('ID', 'organizationID', 'departmentID', 'positionID', 'employeeNumberID', 'description')
    .where('employeeID', '=', para.employeeID)
    .where('organizationID', '!=', empOrder.organizationID)
    .where('dateFrom', '<=', para.dateFrom)
    .where('dateTo', '>=', para.dateFrom)
    .selectAsObject()
  if (empPosition.length) {
    const empOrderStore = UB.DataStore('hr_empOrder')
    const vacDetStore = UB.DataStore(__entityName)
    empPosition.forEach(emp => {
      const periodID = (periodService.getCurrentPeriod(emp.organizationID) || {}).ID
      const masterOrganizationName = UB.Repository('hr_organization')
        .attrs('name')
        .where('mi_data_id', '=', emp.organizationID)
        .where('state', '=', 'ACTIVE')
        .orderBy('mi_dateFrom', 'desc')
        .selectScalar() || null
      orgList.push(masterOrganizationName)
      const newOrderID = empOrderStore.generateID()
      empOrderStore.run('insert', {
        execParams: {
          ID: newOrderID,
          orderNumber: UB.i18n('(проєкт)'),
          orderDate: empOrder['orderDate'],
          entryDate: empOrder['entryDate'],
          organizationID: emp.organizationID,
          masterOrganizationName,
          masterOrganizationID: emp.organizationID,
          empOrderType: empOrder['empOrderType'],
          orderClass: empOrder['orderClass'],
          titleOrder: empOrder['titleOrder'],
          preamble: empOrder['preamble'],
          reason: empOrder['reason'],
          periodID,
          documentOrderType: empOrder['documentOrderType'],
          reportSettings: '{"margin":{"top":13.5,"right":-2,"bottom":13.5,"left":2}}'
        }
      })
      const orderDetID = vacDetStore.generateID()
      vacDetStore.run('insert', {
        execParams: {
          ID: orderDetID,
          itemIdx: 1,
          orderID: newOrderID,
          departmentID: emp.departmentID,
          positionID: emp.positionID,
          organizationID: emp.organizationID,
          employeePositionID: emp.ID,
          dictVacationKindID: para['dictVacationKindID'],
          employeeNumberID: emp.employeeNumberID,
          employeeID: para['employeeID'],
          firstName: para['employeeID'],
          lastName: para['employeeID'],
          middleName: para['employeeID'],
          empNameCase: para['empNameCase'],
          title: emp['description'],
          empOrderType: para['empOrderType'],
          isRst: para['isRst'],
          isMoneyHelp: para['isMoneyHelp'],
          moneyHelpPayElID: para['moneyHelpPayElID'],
          dayCount: para['dayCount'],
          dateFrom: para['dateFrom'],
          dateTo: para['dateTo'],
          periodID,
          reason: para['reason'],
          reasonDoc: para['reasonDoc'],
          isContinuous: para['isContinuous'],
          isGroup: 1
        }
      })
      me.addPeriods({
        mParams: {
          mode: 'ADDONLY',
          paraID: orderDetID,
          orderID: newOrderID,
          favoriteVacKindID: para['dictVacationKindID'],
          orgID: emp.organizationID
        }
      })
    })
    if (orgList.length) {
      mParams.msg = `${UB.i18n('Створено накази в таких організаціях')}: <br/>${orgList.join('<br/>')}`
    }
  } else {
    mParams.msg = UB.i18n('Не знайдено призначень в інших організаціях')
  }
}

/* Перевірка, щоб не існувало наказу про продовження даної відпустки */
me.checkVacProlong = function (empOrderType, entityName, orderID) {
  const prolongDet = UB.Repository('hr_empOrderVacationprolongDet')
    .attrs(['firstName', 'middleName', 'lastName'])
    .where('grantVacationParaID.orderID', '=', orderID)
    .where('grantVacationParaID.mi_deleteDate', '>=', '#maxdate')
    .where('orderID.orderState', '!=', 'PROJECT')
    .selectAsObject()
  let errEmps = prolongDet.map(itm => nameCase.getEmpShortNameFromParts(itm.firstName, itm.middleName, itm.lastName))
  return errEmps.length ? UB.i18n(`Для працівник {0} {1} існує продовження відпустки`, errEmps.length === 1 ? 'а' : 'ів', errEmps.join(', ')) : null
}

/* Перевірка, щоб не було видалено право на відпустку */
me.checkVacPlanIsNotDeleted = function (ctx) {
  const mParams = ctx.mParams
  const orderID = mParams.orderID
  const vacDet = UB.Repository('hr_empOrderVacationListDet')
    .attrs(['employeeNumberID', 'dictVacationKindID', 'firstName', 'middleName', 'lastName'])
    .where('orderID', '=', orderID)
    .selectAsObject()
  const vacPlan = UB.Repository('hr_empVacationPlan')
    .attrs(['employeeNumberID', 'dictVacationKindID'])
    .where('employeeNumberID', 'in', vacDet.map(itm => itm.employeeNumberID))
    .selectAsObject()
  const vacDelPlan = []
  vacDet.forEach(vacItem => {
    let existedDelPlan = vacDelPlan.find(itm => itm.employeeNumberID === vacItem.employeeNumberID)
    if (!existedDelPlan) {
      let vacPlanItem = vacPlan.find(itm => itm.employeeNumberID === vacItem.employeeNumberID && itm.dictVacationKindID === vacItem.dictVacationKindID)
      if (!vacPlanItem) {
        vacDelPlan.push(vacItem)
      }
    }
  })
  let errEmps = vacDelPlan.map(itm => nameCase.getEmpShortNameFromParts(itm.firstName, itm.middleName, itm.lastName))
  mParams.result = errEmps.length ? UB.i18n(`Для працівник{0} {1} необхідно перевірити права на відпустки працівника, `, errEmps.length === 1 ? 'а' : 'ів', errEmps.join(', ')) +
    UB.i18n('вони можуть бути неправильні внаслідок ручного коригування прав після проведення цього наказу') : null
}

/* перевірка на перетин з лікарняними */
me.checkSicknessCrossTimeSheet = function (ctx) {
  const execParams = ctx.mParams.execParams
  const dateFrom = dateService.shiftDate(execParams.dateFrom)
  const dateTo = dateService.shiftDate(execParams.dateTo)
  const employeeNumberID = execParams.employeeNumberID
  const sicknessTimeCost = UB.Repository('hr_payEl')
    .attrs('dictTimeCostID')
    .where('methodID.methodGroupID.code', '=', 5)
    .where('dictTimeCostID', 'isNotNull')
    .selectAsObject()
  if (sicknessTimeCost.length) {
    const sicknessData = UB.Repository('tim_timeSheet')
      .attrs(['orderID', 'MIN([dateWork])', 'MAX([dateWork])'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateWork', '>=', dateFrom)
      .where('dateWork', '<=', dateTo)
      .where('isActive', '=', 1)
      .where('factTimeCostID', 'in', sicknessTimeCost.map(o => o.dictTimeCostID))
      .groupBy('orderID')
      .selectAsObject({
        'MIN([dateWork])': 'dateFrom',
        'MAX([dateWork])': 'dateTo'
      })
    if (sicknessData.length) {
      const periods = sicknessData.map(o => {
        return UB.i18n('з {0} по {1}', dateService.formatDate(o['dateFrom']), dateService.formatDate(o['dateTo']))
      }).join(', ')
      ctx.mParams.result = UB.i18n('В табелі працівника на період {0} існують елементи обліку - лікарняні', periods)
    }
  }
}

function postVacationList ({ item, order, isImportOperation, saved, isSingle = false, currentPeriod }) {
  const isVacation = (item.empOrderType === 'VACATION')
  const isVacationProlong = (item.empOrderType === 'VACATIONPROLONG')
  const paraAttrs = ['ID', 'paraID', 'paraID.ID', 'dateFrom', 'dateTo', 'dayCount', 'empVacationPeriodID', 'organizationID.mi_data_id',
    'employeeID', 'dictVacationKindID', 'employeePositionID', 'employeePositionID.dateFrom', 'employeePositionID.dateTo',
    'employeePositionID.accrualSum', 'employeeNumberID', 'dictVacationKindID.code', 'dictVacationKindID.dictTimeCostID',
    'orderID', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.description', 'isContinuous', 'dictVacationKindID.payElID.dictTimeCostID',
    'dictVacationKindID.payElID.dictTimeCostID.code', 'dictVacationKindID.payElID.includeSecondJobs', 'employeeNumberID.orgID', 'isBackOrder',
    'employeePositionID.changeOrderID', 'employeeNumberID.description', 'empVacationPeriodID.description']
  const paraQuery = UB.Repository(item.mi_unityEntity).attrs(paraAttrs)
  let para = paraQuery.selectById(item.ID)
  const orgID = para['organizationID.mi_data_id']
  if (!currentPeriod) {
    currentPeriod = periodService.getCurrentPeriod(order.organizationID)
  }
  let onDate = dateService.shiftDate(para.dateFrom)
  let posDateTo = dateService.shiftDate(para['employeePositionID.dateTo'])
  if (posDateTo <= onDate) {
    // try to find actual employee position
    const actualEmpPos = UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('employeeNumberID', '=', para.employeeNumberID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectSingle()
    const empPosStore = UB.DataStore(item.mi_unityEntity)
    if (actualEmpPos) {
      empPosStore.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          employeePositionID: actualEmpPos.ID
        }
      })
      para = paraQuery.selectById(item.ID)
    }
  }
  posDateTo = dateService.shiftDate(para['employeePositionID.dateTo'])
  let vacDateFrom = dateService.shiftDate(para['dateFrom'])
  if (para['employeePositionID.changeOrderID'] && posDateTo < vacDateFrom) {
    const order = UB.Repository('hr_order')
      .attrs('ID', 'orderState', 'empOrderType', 'description')
      .selectById(para['employeePositionID.changeOrderID'])
    if (order && order.empOrderType === 'DISM' && order.orderState === 'POSTED') {
      throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - працівника {0} було звільнено - {1}', para['employeeNumberID.description'], order.description)}>>>`)
    }
  }
  const vacDet = isVacation
    ? UB.Repository('hr_empOrderVacationDet')
      .attrs(['isMoneyHelp', 'errorText'])
      .selectById(para.paraID)
    : UB.Repository('hr_empOrderVacationprolongDet')
      .attrs(['action', 'causeVacationParaID', 'errorText'])
      .selectById(para.paraID)
  para.periodID = order.periodID
  para.mi_unityEntity = item.mi_unityEntity
  para.dictTimeCostID = para['dictVacationKindID.payElID.dictTimeCostID'] || para['dictVacationKindID.dictTimeCostID']
  para.includeSecondJobs = para['dictVacationKindID.payElID.includeSecondJobs']
  para.factHour = 0
  let isMovement = isVacationProlong && vacDet.action === 'TRANSFER'

  /* Занесення в табель та картку відпустки */
  if (!(isVacationProlong && isMovement)) {
    // Для наказу продовження переносити на сторінку "Відпустки" картки працівника лише при галочці "Продовження"
    // https://dev.intecracy.com/confluence/pages/viewpage.action?pageId=146146299
    orderService.setTimeSheet({ para: para, saved: saved, currentPeriod })
  }

  let dayCount
  let cntDay = null
  let vacationStatus
  switch (item.empOrderType) {
    case 'VACATIONPROLONG':
      if (isMovement) {
        vacationStatus = 'MOVE'
        if (vacDet.causeVacationParaID) {
          dayCount = -para.dayCount
          cntDay = dayCount
        } else {
          dayCount = null
        }
      } else {
        vacationStatus = 'PROLONG'
        dayCount = para.dayCount
      }
      break
    case 'VACATIONREVOKE':
      dayCount = -para.dayCount
      cntDay = dayCount
      vacationStatus = 'REVOKE'
      break
    default:
      dayCount = para.dayCount
      cntDay = dayCount
      vacationStatus = 'GRANT'
      break
  }
  orderService.insertByOrder({
    store: 'hr_employeeVacation',
    params: {
      organizationID: orgID,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      orderID: para.orderID,
      paraID: para.ID,
      dictVacationKindID: para.dictVacationKindID,
      employeeID: para.employeeID,
      employeePositionID: para.employeePositionID,
      employeeNumberID: para.employeeNumberID,
      dayCount: dayCount,
      cntDay: cntDay,
      dateFrom: para.dateFrom,
      dateTo: para.dateTo,
      dictPeriodID: order.periodID,
      empVacationPeriodID: para.empVacationPeriodID,
      avgSum: 0,
      vacationStatus: vacationStatus,
      orderState: 'POSTED',
      isMoneyHelp: (vacDet && vacDet.isMoneyHelp) || false
    },
    saved: saved
  })

  /* Для відпусток немає закладки нарахувань */
  // orderService.createOrderAccrual({ para: para, saved: saved, isClosePrev: false })

  /* Додаткові дії при проведенні */
  if (isVacation) {
    if (para['dictVacationKindID.code'] === 'dYear') {
      const isContinuous = para.isContinuous
      const yearVacMainPart = timService.CONSTANTS.yearVacMainPart
      const isMainPart = (isContinuous && dayCount >= yearVacMainPart)
      const isBackOrder = para.isBackOrder
      if (isMainPart || isBackOrder) {
        const per = UB.Repository('hr_empVacationPeriod')
          .attrs(['isMainPart', 'isBackOrder'])
          .selectById(para.empVacationPeriodID)
        if (!per) {
          throw new UB.UBAbort(`<<<${UB.i18n('Неможливо провести наказ - для працівника {0} не знайдено період відпустки "{1}", можливо його було видалено', para['employeeNumberID.description'], para['empVacationPeriodID.description'])}>>>`)
        }
        let prms = {
          ID: para.empVacationPeriodID
        }
        let oldVals = {}
        if (isMainPart) {
          prms.isMainPart = isMainPart
          oldVals.isMainPart = per.isMainPart
        }
        if (isBackOrder) {
          prms.isBackOrder = isBackOrder
          oldVals.isBackOrder = per.isBackOrder
        }
        orderService.updateByOrder({
          store: 'hr_empVacationPeriod',
          params: prms,
          saved: saved,
          oldValues: oldVals
        })
      }
    }
  } else if (isVacationProlong) {
    const empRankData = UB.Repository('hr_publServRang')
      .attrs(['ID', 'dictRankID.code', 'dateNext', 'comment'])
      .where('employeeID', '=', para.employeeID)
      .orderByDesc('dateFrom').limit(1)
      .selectSingle()
    if (empRankData && empRankData['dictRankID.code'] !== '1') {
      let newDateNext = dateService.addDays(empRankData.dateNext, dayCount)
      orderService.updateByOrder({
        store: 'hr_publServRang',
        params: {
          ID: empRankData.ID,
          dateNext: newDateNext,
          comment: `${empRankData.comment ? empRankData.comment + '; ' : 'Перенесення: '}${para['orderID.description'] ? para['orderID.description'] : ''}`
        },
        saved: saved,
        oldValues: {
          dateNext: empRankData.dateNext,
          comment: empRankData.comment
        }
      })
    }
  }

  if (isVacation || isVacationProlong) {
    let errorText = (vacDet && vacDet.errorText) || null
    if (errorText) {
      orderService.updateByOrder({
        store: isVacation ? 'hr_empOrderVacationDet' : 'hr_empOrderVacationprolongDet',
        params: {
          ID: para.paraID,
          errorText: null
        },
        saved: saved,
        oldValues: {
          errorText: errorText
        }
      })
    }
  }
}

me.doPosting = function ({ item, order, isImportOperation, saved, currentPeriod }) {
  let prolongVac
  let isCancel = false
  let isTransfer = false
  let isVacProlongDet = item.mi_unityEntity === 'hr_empOrderVacationprolongDet'
  let isVacListDet = item.mi_unityEntity === 'hr_empOrderVacationListDet'
  let isVacProlongType = item.empOrderType === 'VACATIONPROLONG'
  if (isVacProlongType) {
    let paraID = isVacListDet ? item.paraID : item.ID
    prolongVac = UB.Repository('hr_empOrderVacationprolongDet')
      .attrs(['action', 'grantVacationParaID', 'causeVacationParaID', 'empOrderSicknessID'])
      .selectById(paraID)
    isCancel = prolongVac && prolongVac.action === 'CANCEL'
    isTransfer = prolongVac && prolongVac.action === 'TRANSFER' && prolongVac['causeVacationParaID']
  }

  if (isVacListDet) {
    /* hr_empOrderVacationListDet, item.empOrderType in ['VACATION', 'VACATIONPROLONG'] */
    if (isVacProlongType) {
      if (!isCancel) {
        postVacationList(arguments[0])
      }
    } else {
      postVacationList(arguments[0])
    }
  } else if (item.mi_unityEntity === 'hr_empOrderVacationDet') {
    const para = UB.Repository(item.mi_unityEntity)
      .attrs(['ID', 'dateFrom', 'dateTo',
        'employeeID', 'employeePositionID', 'employeeNumberID', 'orderID'])
      .selectById(item.ID)
    orderService.createActingAccrual({ paraID: para.ID, para: para, saved: saved })
  } else if (isVacProlongDet) {
    const para = UB.Repository(item.mi_unityEntity)
      .attrs(['ID', 'dateFrom', 'dateTo', 'employeeID', 'employeePositionID', 'employeeNumberID', 'orderID'])
      .selectById(item.ID)
    orderService.createActingAccrual({ paraID: para.ID, para: para, saved: saved })
    /* hr_empOrderVacationprolongDet */
    if (isCancel) {
      const grantVac = UB.Repository('hr_empOrderVacationDet')
        .attrs(['orderID', 'orderID.periodID', 'employeePositionID', 'isMoneyHelp'])
        .selectById(prolongVac.grantVacationParaID)
      const grantVacList = UB.Repository('hr_empOrderVacationListDet')
        .attrs(['ID', 'dictVacationKindID', 'dateFrom', 'dateTo', 'empVacationPeriodID', 'dictVacationKindID.payElID.includeSecondJobs'])
        .where('paraID', '=', prolongVac.grantVacationParaID)
        .selectAsObject({
          'dictVacationKindID.payElID.includeSecondJobs': 'includeSecondJobs'
        })
      grantVacList.forEach(listItem => {
        let orgID = item['organizationID.mi_data_id']
        let employeeNumbers = [item.employeeNumberID]
        if (listItem.includeSecondJobs) {
          const secJobs = staffService.getSecondJobs(item.employeeID, item.employeeNumberID, orgID, listItem.dateFrom, listItem.dateTo)
          secJobs.forEach(row => {
            employeeNumbers.push(row.employeeNumberID)
          })
        }

        /* кількість днів по табелю визначаємо по основному таб. номеру para.employeeNumberID */
        const vacKindData = timService.getTimeSheetByVacationKind([item.employeeNumberID], listItem.dictVacationKindID, listItem.dateFrom, listItem.dateTo)
        let dayCount = -1 * vacKindData.length
        let cntDay = dayCount

        /* в табелі відміняємо відпустку по всім таб. номерам */
        let currentPeriod = { ID: grantVac['orderID.periodID'] }
        timService.cancelTimeSheetByOrder(grantVac.orderID, item.orderID, currentPeriod, listItem.dateFrom, listItem.dateTo, employeeNumbers, true)

        orderService.insertByOrder({
          store: 'hr_employeeVacation',
          params: {
            organizationID: orgID,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderID: item.orderID,
            paraID: item.ID,
            dictVacationKindID: listItem.dictVacationKindID,
            employeeID: item.employeeID,
            employeePositionID: grantVac.employeePositionID,
            employeeNumberID: item.employeeNumberID,
            dayCount: dayCount,
            cntDay: cntDay,
            dateFrom: listItem.dateFrom,
            dateTo: listItem.dateTo,
            dictPeriodID: grantVac.periodID,
            empVacationPeriodID: listItem.empVacationPeriodID,
            avgSum: 0,
            vacationStatus: 'CANCEL',
            orderState: 'POSTED',
            isMoneyHelp: false
          },
          saved: saved
        })

        /* Якщо наказ, що скасовується, мав ознаку надання матеріальної допомоги, то видалити позначку надання матеріальної
          допомоги у сутності hr_employeeVacation, встановлену наказом, що скасовується. */
        if (grantVac.isMoneyHelp) {
          let postedEmpVac = UB.Repository('hr_employeeVacation')
            .attrs(['ID'])
            .where('paraID', '=', listItem.ID)
            .selectAsObject()
          if (postedEmpVac.length > 0) {
            postedEmpVac.forEach(vacItem => {
              orderService.updateByOrder({
                store: 'hr_employeeVacation',
                params: {
                  ID: vacItem.ID,
                  isMoneyHelp: false
                },
                saved: saved,
                oldValues: {
                  isMoneyHelp: true
                }
              })
            })
          }
        }
      })

      /* Видалити записи ТВО, встановлені наказом що скасовується
        необхіно також перерахувати суми нарахувань за ТВО (https://dev.intecracy.com/confluence/pages/viewpage.action?pageId=146146299) */
      // orderService.deleteOrderActing({ orderID: grantVac.orderID, saved: saved })

      /* Якщо в наказі, де є пункт що скасовується, є також пункт про передачу матцінностей від працівника, якому скасовується
        відпустка, то встановити для відповідного запису у сутності hr_empOrderMaterialTransferDet ознаку скасування */
      const matTrans = UB.Repository('hr_empOrderMaterialtransferDet')
        .attrs(['ID'])
        .where('orderID', '=', grantVac.orderID)
        .where('employeeNumberID', '=', item.employeeNumberID)
        .selectAsObject()
      if (matTrans.length > 0) {
        matTrans.forEach(matTransItem => {
          orderService.updateByOrder({
            store: 'hr_empOrderMaterialtransferDet',
            params: {
              ID: matTransItem.ID,
              isCanceled: true
            },
            saved: saved,
            oldValues: {
              isCanceled: false
            }
          })
        })
      }
    }
    if (isTransfer) {
      const grantVac = UB.Repository('hr_empOrderVacationDet')
        .attrs(['orderID', 'orderID.periodID', 'employeePositionID', 'isMoneyHelp'])
        .selectById(prolongVac.grantVacationParaID)
      const grantVacList = UB.Repository('hr_empOrderVacationListDet')
        .attrs(['ID', 'dictVacationKindID', 'dictVacationKindID.name', 'dateFrom', 'dateTo', 'empVacationPeriodID'])
        .where('paraID', '=', prolongVac.grantVacationParaID)
        .selectAsObject()
      const causeVacacation = UB.Repository('hr_empOrderVacationlongDet')
        .attrs('dictVacationKindID', 'orderID.description')
        .selectById(prolongVac.causeVacationParaID)

      const causeVacacationKindID = causeVacacation['dictVacationKindID'] || 0

      grantVacList.forEach(listItem => {
        let orgID = item['organizationID.mi_data_id']

        /* кількість днів по табелю визначаємо по основному таб. номеру para.employeeNumberID */
        const vacKindData = timService.getTimeSheetByVacationKind([item.employeeNumberID], causeVacacationKindID, listItem.dateFrom, listItem.dateTo)
        let dayCount = -1 * vacKindData.length

        let vacPeriod = UB.Repository('hr_empVacationPeriod')
          .attrs('ID', 'dayCountFactCorr')
          .selectById(listItem.empVacationPeriodID || 0)
        if (vacPeriod) {
          orderService.updateByOrder({
            store: 'hr_empVacationPeriod',
            params: {
              ID: vacPeriod.ID,
              dayCountFactCorr: (vacPeriod.dayCountFactCorr || 0) + dayCount
            },
            oldValues: {
              dayCountFactCorr: vacPeriod.dayCountFactCorr
            },
            saved: saved
          })
        }

        const tdesc = UB.i18n('Перенесення днів відпустки ') +
          listItem['dictVacationKindID.name'] +
          UB.i18n(' з ') + dateService.formatDate(listItem.dateFrom) + UB.i18n(' по ') +
          dateService.formatDate(listItem.dateTo) +
          UB.i18n(' на підставі ') + causeVacacation['orderID.description'] +
          UB.i18n('. Наказ №') + order.orderNumber + UB.i18n(' від ') +
          dateService.formatDate(order.orderDate)

        orderService.insertByOrder({
          store: 'hr_employeeVacation',
          params: {
            organizationID: orgID,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderID: item.orderID,
            paraID: item.ID,
            dictVacationKindID: listItem.dictVacationKindID,
            employeeID: item.employeeID,
            employeePositionID: grantVac.employeePositionID,
            employeeNumberID: item.employeeNumberID,
            // UBHR-21173
            // dayCount: dayCount,
            // cntDay: dayCount,
            dateFrom: listItem.dateFrom,
            dateTo: listItem.dateTo,
            dictPeriodID: grantVac.periodID,
            empVacationPeriodID: listItem.empVacationPeriodID,
            avgSum: 0,
            vacationStatus: 'MOVE',
            orderState: 'POSTED',
            isMoneyHelp: false,
            description: tdesc,
            useCustomDesc: true
          },
          saved: saved
        })
      })
    } else if (prolongVac && prolongVac.action === 'TRANSFER') {
      const grantVac = UB.Repository('hr_empOrderVacationDet')
        .attrs(['orderID', 'orderID.periodID', 'employeePositionID', 'isMoneyHelp'])
        .selectById(prolongVac.grantVacationParaID)
      const grantVacList = UB.Repository('hr_empOrderVacationListDet')
        .attrs(['ID', 'dictVacationKindID', 'dictVacationKindID.name', 'dateFrom', 'dateTo', 'empVacationPeriodID'])
        .where('paraID', '=', prolongVac.grantVacationParaID)
        .selectAsObject()
      const empOrderSicknesses = prolongVac.empOrderSicknessID ? UB.Repository('hr_empOrderSicknessDt')
        .attrs(['dateFrom', 'dateTo', 'empOrderSicknessID.description']).orderBy('dateFrom', 'desc').where('empOrderSicknessID', '=', prolongVac.empOrderSicknessID)
        .selectAsObject()
        : []
      const causeVacacation = prolongVac.causeVacationParaID ? UB.Repository('hr_empOrderVacationlongDet')
        .attrs(['dateFrom', 'dateTo', 'orderID.description'])
        .selectById(prolongVac.causeVacationParaID)
        : []
      let maxDateFrom = dateService.minDate()
      let minDateTo = dateService.maxDate()
      let abortDesc = ''
      if (empOrderSicknesses && empOrderSicknesses.length) {
        maxDateFrom = empOrderSicknesses[0].dateFrom
        minDateTo = empOrderSicknesses[empOrderSicknesses.length - 1].dateTo
        abortDesc = empOrderSicknesses[0]['empOrderSicknessID.description']
      } else if (causeVacacation) {
        abortDesc = causeVacacation['orderID.description']
      }
      if (causeVacacation && causeVacacation.dateFrom > maxDateFrom) {
        maxDateFrom = causeVacacation.dateFrom
      }
      if (causeVacacation && causeVacacation.dateTo < minDateTo) {
        minDateTo = causeVacacation.dateTo
      }

      grantVacList.forEach(listItem => {
        let orgID = item['organizationID.mi_data_id']
        const tdesc = UB.i18n('Перенесення днів відпустки ') +
          listItem['dictVacationKindID.name'] +
          UB.i18n(' з ') + dateService.formatDate(listItem.dateFrom) + UB.i18n(' по ') +
          dateService.formatDate(listItem.dateTo) +
          UB.i18n(' на підставі ') + abortDesc +
          UB.i18n('. Наказ №') + order.orderNumber + UB.i18n(' від ') +
          dateService.formatDate(order.orderDate)
        orderService.insertByOrder({
          store: 'hr_employeeVacation',
          params: {
            organizationID: orgID,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderID: item.orderID,
            dateFrom: maxDateFrom > listItem.dateFrom ? maxDateFrom : listItem.dateFrom,
            dateTo: minDateTo < listItem.dateTo ? minDateTo : listItem.dateTo,
            paraID: item.ID,
            dictVacationKindID: listItem.dictVacationKindID,
            employeeID: item.employeeID,
            employeePositionID: grantVac.employeePositionID,
            employeeNumberID: item.employeeNumberID,
            empVacationPeriodID: listItem.empVacationPeriodID,
            dictPeriodID: grantVac.periodID,
            vacationStatus: 'MOVE',
            orderState: 'POSTED',
            isMoneyHelp: false,
            description: tdesc,
            useCustomDesc: true
          },
          saved: saved
        })
      })
    }
  }
}

me.doCancelPosting = function (item) {
  if (item.orderState === 'CANCELED') {
    return
  }
  let isVacListDet = item.mi_unityEntity === 'hr_empOrderVacationListDet'
  let paraID = isVacListDet ? item.paraID : item.ID
  if (item.empOrderType === 'VACATIONPROLONG') {
    let prolongVac = UB.Repository('hr_empOrderVacationprolongDet')
      .attrs(['action', 'employeeNumberID', 'grantVacationParaID'])
      .selectById(paraID)
    let isCancel = prolongVac && prolongVac.action === 'CANCEL'
    if (isCancel) {
      if (!isVacListDet) {
        timService.restoreTimeSheetByChangeOrder(item.orderID, item['organizationID.mi_data_id'])
      }
    } else {
      const empNumbers = [prolongVac['employeeNumberID']]
      const grantVacList = UB.Repository('hr_empOrderVacationListDet')
        .attrs(['dateFrom', 'dateTo', 'employeeID', 'employeeNumberID', 'employeeNumberID.orgID', 'dictVacationKindID.payElID.includeSecondJobs'])
        .where('paraID', '=', prolongVac.grantVacationParaID)
        .selectAsObject({
          'dictVacationKindID.payElID.includeSecondJobs': 'includeSecondJobs'
        })
      grantVacList.forEach(listItem => {
        if (listItem.includeSecondJobs) {
          const secJobs = staffService.getSecondJobs(listItem.employeeID, listItem.employeeNumberID, listItem['employeeNumberID.orgID'], listItem.dateFrom, listItem.dateTo)
          secJobs.forEach(row => {
            empNumbers.push(row.employeeNumberID)
          })
        }
      })
      timService.cancelTimeSheet(item.orderID, prolongVac ? empNumbers : null)
    }
  } else {
    const vacDet = UB.Repository('hr_empOrderVacationDet')
      .attrs('employeeNumberID')
      .selectById(paraID)
    const vacList = isVacListDet
      ? UB.Repository('hr_empOrderVacationListDet')
        .attrs(['dateFrom', 'dateTo', 'employeeID', 'employeeNumberID', 'employeeNumberID.orgID', 'dictVacationKindID.payElID.includeSecondJobs'])
        .where('ID', '=', item.ID)
        .selectAsObject({
          'dictVacationKindID.payElID.includeSecondJobs': 'includeSecondJobs'
        })
      : UB.Repository('hr_empOrderVacationListDet')
        .attrs(['dateFrom', 'dateTo', 'employeeID', 'employeeNumberID', 'employeeNumberID.orgID', 'dictVacationKindID.payElID.includeSecondJobs'])
        .where('paraID', '=', item.ID)
        .selectAsObject({
          'dictVacationKindID.payElID.includeSecondJobs': 'includeSecondJobs'
        })
    const empNumbers = [vacDet['employeeNumberID']]
    vacList.forEach(vac => {
      if (vac.includeSecondJobs) {
        const secJobs = staffService.getSecondJobs(vac.employeeID, vac.employeeNumberID, vac['employeeNumberID.orgID'], vac.dateFrom, vac.dateTo)
        secJobs.forEach(row => {
          empNumbers.push(row.employeeNumberID)
        })
      }
    })
    timService.cancelTimeSheet(item.orderID, vacDet ? empNumbers : null)
  }
  orderService.restoreOldValues(item)
}
