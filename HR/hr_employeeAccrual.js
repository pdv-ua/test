const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')
const timService = require('../HR/modules/timService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const accrualService = require('../HR/modules/accrualService')

me.on('delete:before', beforeDelete)
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

me.onAfterOrderEvent = function () {
  me.on('insert:after', afterInsert)
  me.on('update:after', afterUpdate)
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.description = UB.i18n('Постійні нарахування працівника')
  if (execParams.orderID) {
    const order = UB.Repository('hr_order')
      .attrs(['description'])
      .selectById(execParams.orderID)
    if (order && order.description) execParams.description = order.description
  }
  execParams.orderState = 'POSTED'
  const val = execParams.accrualSum || execParams.accrualRate || null
  execParams.descriptionExt = UB.i18n(`Діє з {0}{1} {2}`, dateService.formatDate(execParams.dateFrom || execParams.dateFromEmpty), val ? ', ' + val.toFixed(2) : '', execParams.accrualSum ? 'грн' : execParams.accrualRate ? '%' : '')
}

function afterInsert (ctx) {
  if (!ctx.mParams.isImport && !ctx.mParams.skipSetTimeSheet) {
    const execParams = ctx.mParams.execParams
    const payEl = UB.Repository('hr_payEl')
      .attrs('dictTimeCostID', 'dictTimeCostWorkID', 'dictTimeCostAvgID', 'isAutoCalc', 'isRecalculate')
      .selectById(execParams.payElID || null)
    const dictTimeCostID = payEl ? payEl.dictTimeCostID || payEl.dictTimeCostWorkID || payEl.dictTimeCostAvgID : null
    const employee = UB.Repository('hr_employeeNumberS').attrs(['description', 'orgID']).selectById(execParams.employeeNumberID)
    if (!employee) {
      // Запис з таб. номером видалено
      return
    }
    const currentPeriod = periodService.getCurrentPeriod(employee.orgID)
    if (payEl && (payEl.isAutoCalc || payEl.isRecalculate)) {
      accrualService.setRecalculatePeriod({
        orgID: employee.orgID,
        employeeNumberID: execParams.employeeNumberID,
        periodCalcID: currentPeriod.ID,
        dateFrom: execParams.dateFrom,
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Нарахування працівника')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
      })
    }
    if (dictTimeCostID) {
      const dictTimeCost = UB.Repository('hr_dictTimeCost')
        .attrs('*').selectById(dictTimeCostID)
      let dateFrom = execParams.dateFrom ? dateService.shiftDate(execParams.dateFrom) : (execParams.dateFromEmpty ? dateService.shiftDate(execParams.dateFromEmpty) : dateService.minDate())
      let dateTo = execParams.dateTo ? dateService.shiftDate(execParams.dateTo) : (execParams.dateToEmpty ? dateService.shiftDate(execParams.dateToEmpty) : null)
      const orderIDList = execParams.orderID ? [execParams.orderID] : []
      // check timeSheetChange
      if (execParams.orderID) {
        const timeSheetChangeID = UB.Repository('hr_timeSheetChangeEmp')
          .attrs('timeSheetChangeID')
          .where('employeeNumberID', '=', execParams.employeeNumberID)
          .where('timeSheetChangeID.orderID', '=', execParams.orderID)
          .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
          .selectScalar()
        if (timeSheetChangeID) {
          orderIDList.push(timeSheetChangeID)
        }
      }
      timService.checkCrossTimeSheet(execParams.employeeNumberID, dictTimeCostID, dateFrom, dateTo, orderIDList, true,
        UB.i18n('Неможливо додати постійне нарахування'))

      dateFrom = execParams.dateFrom ? dateService.shiftDate(execParams.dateFrom) : (execParams.dateFromEmpty ? dateService.shiftDate(execParams.dateFromEmpty) : null)
      if (dateFrom && dateFrom < currentPeriod.dateFrom) {
        dateTo = dateTo < currentPeriod.dateFrom ? dateTo : dateService.addDays(currentPeriod.dateFrom, -1)
        setTimeSheet(dictTimeCost, execParams.ID, currentPeriod.ID, execParams.employeeNumberID, dateFrom, dateTo)
      }
    }

    calcService.addCalcTimeSheetQueue({ employeeNumberID: execParams.employeeNumberID, entityName: 'hr_employeeAccrual' })
  }
  if (!ctx.mParams.isImport) {
    calcService.addCalcQueue({ employeeNumbers: [ctx.mParams.execParams.employeeNumberID], description: `Додано`, entityName: 'hr_employeeAccrual' })
  }
}

function setTimeSheet (dictTimeCost, orderID, periodID, employeeNumberID, dateFrom, dateTo) {
  const timeSheetData = UB.Repository('tim_timeSheet')
    .attrs(['ID', 'dateWork', 'planHour', 'factHour'])
    .where('employeeNumberID', '=', employeeNumberID)
    .where('dateWork', '>=', dateFrom)
    .where('dateWork', '<=', dateTo)
    .where('isActive', '=', 1)
    .orderBy('dateWork')
    .selectAsObject()
  timeSheetData.forEach(sheet => {
    sheet.dateWork = dateService.shiftDate(sheet.dateWork)
  })
  const timeSheetParams = []
  let date = dateService.shiftDate(dateFrom)
  while (date <= dateTo) {
    const timeSheetDay = timeSheetData.find(o => o.dateWork.getTime() === date.getTime())
    timeSheetParams.push({
      orderID: orderID,
      entityName: __entityName,
      employeeNumberID: employeeNumberID,
      periodID: periodID,
      dateWork: date,
      factTimeCostID: dictTimeCost.ID,
      factHour: timeSheetDay && (dictTimeCost.timeCostType === 'WORK' || dictTimeCost.isFactHour) ? timeSheetDay.planHour : 0
    })
    date = dateService.nextDay(date)
  }
  timService.setTimeSheet(timeSheetParams)
}

function beforeUpdate (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (!ctx.mParams.isImport) {
    ctx.mParams.previousValues = previousValues
    calcService.addCalcTimeSheetQueue({ employeeNumberID: previousValues.employeeNumberID, entityName: 'hr_employeeAccrual' })
  }
  const execParams = ctx.mParams.execParams
  const dateFrom = dateService.formatDate(execParams.dateFromEmpty || previousValues.dateFrom)
  const valSum = execParams.accrualSum !== undefined ? execParams.accrualSum : previousValues.accrualSum
  const valRate = execParams.accrualRate !== undefined ? execParams.accrualRate : previousValues.accrualRate
  const val = valSum ? valSum.toFixed(2) : (valRate ? valRate.toFixed(2) : '')
  execParams.descriptionExt = UB.i18n(`Діє з  {0}{1} {2}`, dateFrom, val ? ', ' + val : '', valSum ? 'грн' : valRate ? '%' : '')
}

function afterUpdate (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const previousValues = ctx.mParams.previousValues
    const pAccr = UB.Repository(__entityName)
      .attrs(['ID', 'payElID', 'dateFrom', 'dateTo', 'orderID', 'employeeNumberID', 'employeeNumberID.orgID'])
      .misc({ __skipRls: true, __skipAclRls: true })
      .selectById(execParams.ID)
    const payEl = UB.Repository('hr_payEl')
      .attrs('dictTimeCostID', 'dictTimeCostWorkID', 'dictTimeCostAvgID', 'isAutoCalc', 'isRecalculate')
      .selectById(pAccr.payElID)
    const dictTimeCostID = payEl ? payEl.dictTimeCostID || payEl.dictTimeCostWorkID || payEl.dictTimeCostAvgID : null
    const currentPeriod = periodService.getCurrentPeriod(pAccr['employeeNumberID.orgID'])
    if (execParams.dateFrom && dateService.shiftDate(execParams.dateFrom) < currentPeriod.dateFrom) {
      accrualService.setRecalculatePeriod({
        orgID: pAccr['employeeNumberID.orgID'],
        employeeNumberID: execParams.employeeNumberID || pAccr.employeeNumberID,
        periodCalcID: currentPeriod.ID,
        dateFrom: dateService.shiftDate(execParams.dateFrom),
        entityName: __entityName,
        initiatorID: execParams.ID,
        description: `${UB.i18n('Нарахування працівника')} ${dateService.formatDate(dateService.shiftDate(execParams.dateFrom))}`
      })
    }
    if (dictTimeCostID && !ctx.mParams.skipSetTimeSheet /* && !ctx.mParams.isOrderOperation */) {
      if (pAccr.orderID && execParams.dateTo) {
        let dateTo = dateService.shiftDate(previousValues.dateTo)
        const dateToNew = dateService.shiftDate(execParams.dateTo)
        if (dateToNew < dateTo) {
          timService.cancelTimeSheetByOrder(pAccr.orderID, pAccr.ID, currentPeriod, dateService.addDays(dateToNew, 1), null, [pAccr.employeeNumberID], true)
          let pAccrDateFrom = UB.Repository('tim_timeSheet')
            .attrs('dateWork')
            .where('orderID', '=', pAccr.ID)
            .orderBy('dateWork')
            .selectScalar()
          if (pAccrDateFrom) {
            const isActive = execParams.isActive !== undefined ? execParams.isActive : previousValues.isActive
            pAccrDateFrom = dateService.shiftDate(pAccrDateFrom)
            const newDateFrom = ((isActive && dateToNew >= pAccrDateFrom) || (!isActive && dateToNew > pAccrDateFrom)) ? dateService.addDays(dateToNew, 1) : pAccrDateFrom
            timService.cancelTimeSheetByOrder(pAccr.ID, pAccr.ID, currentPeriod, newDateFrom, null, [pAccr.employeeNumberID], true)
          }
        }
        if (dateToNew > dateTo) {
          timService.cancelTimeSheetByOrder(pAccr.orderID, pAccr.ID, currentPeriod, dateService.addDays(dateTo, 1), null, [pAccr.employeeNumberID])
          const dateFrom = dateService.addDays(dateTo, 1)
          timService.checkCrossTimeSheet(pAccr.employeeNumberID, dictTimeCostID, dateFrom, dateToNew, null, true,
            UB.i18n('Неможливо змінити постійне нарахування'))
          if (dateFrom < currentPeriod.dateTo) {
            dateTo = dateToNew < currentPeriod.dateTo ? dateToNew : currentPeriod.dateTo
            const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs('*').selectById(dictTimeCostID)
            setTimeSheet(dictTimeCost, execParams.ID, currentPeriod.ID, pAccr.employeeNumberID, dateFrom, dateTo)
          }
        }
      } else {
        const dateFrom = dateService.shiftDate(pAccr.dateFrom) || dateService.minDate()
        let dateTo = dateService.shiftDate(pAccr.dateTo)
        const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs('*').selectById(dictTimeCostID)
        if (ctx.mParams.execParams.changeOrderID || (!execParams.dateFrom && !execParams.payElID && execParams.dateTo && dateService.shiftDate(previousValues.dateTo) > execParams.dateTo)) {
          timService.cancelTimeSheetByOrder(pAccr.ID, pAccr.ID, currentPeriod, dateTo)
        } else {
          timService.cancelTimeSheetByOrder(pAccr.ID, pAccr.ID, currentPeriod, previousValues.dateFrom)
          timService.checkCrossTimeSheet(pAccr.employeeNumberID, dictTimeCostID, dateFrom, dateTo, pAccr.orderID ? [pAccr.orderID] : null, true,
            UB.i18n('Неможливо змінити постійне нарахування'))
        }
        if (!ctx.mParams.execParams.changeOrderID && !dateService.isMinDate(dateFrom) && dateFrom < currentPeriod.dateTo &&
          !(!execParams.dateFrom && !execParams.payElID && execParams.dateTo && dateService.shiftDate(previousValues.dateTo) > execParams.dateTo)) {
          const nextPeriod = periodService.getPeriod(currentPeriod.nextPeriodID)
          dateTo = dateTo < nextPeriod.dateTo ? dateTo : nextPeriod.dateTo
          setTimeSheet(dictTimeCost, execParams.ID, currentPeriod.ID, pAccr.employeeNumberID, dateFrom, dateTo)
        }
      }
    }
    if (Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'descriptionExt', 'description', 'changeOrderID', 'changeDateTo', 'nextID' ].includes(o))) {
      if (payEl && (payEl.isAutoCalc || payEl.isRecalculate)) {
        let calcDate = (execParams.dateFrom || previousValues.dateFrom)
        if (execParams.dateToEmpty || execParams.dateTo) {
          if (!Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser', 'dateToEmpty', 'dateTo',
            'descriptionExt', 'description', 'changeOrderID', 'changeDateTo', 'nextID'].includes(o))) {
            calcDate = dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo) < dateService.maxDate()
              ? dateService.addDays(dateService.shiftDate(execParams.dateToEmpty || execParams.dateTo), 1) : execParams.dateToEmpty || execParams.dateTo
          }
        }
        accrualService.setRecalculatePeriod({
          orgID: pAccr['employeeNumberID.orgID'],
          employeeNumberID: previousValues.employeeNumberID,
          periodCalcID: currentPeriod.ID,
          dateFrom: calcDate,
          entityName: __entityName,
          initiatorID: execParams.ID,
          description: `${UB.i18n('Нарахування працівника')} ${dateService.formatDate(dateService.shiftDate(calcDate))}`
        })
      }
      calcService.addCalcQueue({ employeeNumbers: [previousValues.employeeNumberID], description: `Змінено`, entityName: 'hr_employeeAccrual' })
    }
  }
}

function beforeDelete (ctx) {
  if (!ctx.mParams.isImport) {
    const execParams = ctx.mParams.execParams
    const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
    const dictTimeCostPayEl = UB.Repository('hr_payEl')
      .attrs('dictTimeCostID', 'dictTimeCostWorkID', 'dictTimeCostAvgID')
      .selectById(previousValues.payElID)
    const dictTimeCostID = dictTimeCostPayEl ? dictTimeCostPayEl.dictTimeCostID || dictTimeCostPayEl.dictTimeCostWorkID || dictTimeCostPayEl.dictTimeCostAvgID : null
    const employeeAccrual = UB.Repository('hr_employeeAccrual').attrs(['employeeNumberID.orgID']).selectById(execParams.ID)
    if (dictTimeCostID) {
      if (employeeAccrual) {
        const currentPeriod = periodService.getCurrentPeriod(employeeAccrual['employeeNumberID.orgID'])
        timService.cancelTimeSheetByOrder(previousValues.ID, previousValues.ID, currentPeriod, previousValues.dateFrom)
      }
    }
    accrualService.setRecalculatePeriod({
      orgID: employeeAccrual['employeeNumberID.orgID'],
      employeeNumberID: previousValues.employeeNumberID,
      dateFrom: previousValues.dateFrom,
      entityName: __entityName,
      initiatorID: execParams.ID,
      description: `${UB.i18n('Нарахування працівника')} ${UB.i18n('видалення')} ${dateService.formatDate(dateService.shiftDate(previousValues.dateFrom))}`
    })
    calcService.addCalcTimeSheetQueue({ employeeNumberID: previousValues.employeeNumberID, entityName: 'hr_employeeAccrual' })
    calcService.addCalcQueue({ employeeNumbers: [previousValues.employeeNumberID], description: `Видалено`, entityName: 'hr_employeeAccrual' })
  }
}

me.rls = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.ID) {
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    whereList.isActive = {
      expression: '[isActive]',
      condition: 'equal',
      value: 1
    }
  }
}
