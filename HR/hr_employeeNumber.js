const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const timService = require('../HR/modules/timService')
const periodService = require('../HR/modules/periodService')
const employeeService = require('../HR/modules/employeeService')
const entityService = require('../HR/modules/entityService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const accrualService = require('../HR/modules/accrualService')
const timeSheetService = require('../TIM/modules/timeSheetService')
const orderService = require('../HR/modules/orderService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('insert:after', afterInsert)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)
me.on('delete:after', afterDelete)
me.on('delete:before', beforeDelete)

me.entity.addMethod('getNextTabNum')
me.entity.addMethod('checkParams')
me.entity.addMethod('view')
me.entity.addMethod('setFormReadOnly')
me.entity.addMethod('restoreRecord')
me.entity.addMethod('canEditDates')
me.entity.addMethod('dataCorrection')
me.entity.addMethod('employeeLimitedAccess')
me.entity.addMethod('checkDateWork')
me.entity.addMethod('updateAddPersonDescription')
me.entity.addMethod('getParentEmpNumbers')
me.entity.addMethod('getSubordinates')
me.entity.addMethod('setCardKind')

me.view = () => {}

me.setFormReadOnly = () => {} // метод для переглядача обліку ЗП

me.canEditDates = () => {} // метод для перевірки можливості редагування дат

me.setCardKind = (ctx) => {
  const mParams = ctx.mParams
  const empNumStore = UB.DataStore('hr_employeeNumber')
  empNumStore.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: mParams.employeeNumberID,
      kind: mParams.kind
    }
  })
}

me.employeeLimitedAccess = (ctx) => {
  if (!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
    const mParams = ctx.mParams
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    whereList.limitedAccess = {
      expression: '[limitedAccess]',
      condition: 'equal',
      value: 0
    }
  }
} // метод для перевірки обмеженого доступу
me.employeeNumberAccess = (ctx) => {
  if (!App.domainInfo.isEntityMethodsAccessible('hr_employeeNumber', 'employeeLimitedAccess')) {
    const mParams = ctx.mParams
    let whereList = mParams.whereList
    if (!whereList) {
      mParams.whereList = {}
      whereList = mParams.whereList
    }
    whereList.limitedAccess = {
      expression: '[employeeNumberID.limitedAccess]',
      condition: 'equal',
      value: 0
    }
  }
} // метод для перевірки обмеженого доступу

function beforeDelete (ctx) {
  const instanceData = ctx.dataStore
  const mParams = ctx.mParams
  const execParams = ctx.mParams.execParams
  ctx.previousValues = ctx.dataStore.getAsJsObject()[0] || {}
  if (!mParams.isOrderOperation && !mParams.isImport) {
    if (instanceData.get('orderID')) {
      if (UB.Repository('hr_order').attrs(['ID']).where('ID', '=', instanceData.get('orderID')).where('orderClass.entityName', '=', 'hr_empOrder').selectSingle()) {
        throw new UB.UBAbort(`<<<${UB.i18n('Існує наказ відділу кадрів, за яким працівника прийнято на роботу. Видалення можливе лише через скасування проведення наказу відділу кадрів.')}>>>`)
      }
    }
    const empOrderPosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('employeeNumberID', '=', execParams.ID)
      .where('orderID.orderClass.entityName', '=', 'hr_empOrder')
      .limit(1)
      .selectSingle()

    if (empOrderPosition) {
      throw new UB.UBAbort(`<<<${UB.i18n('Для працівника існують призначення створені наказом з персоналу. Видалення неможливе.')}>>>`)
    }

    const empPosStore = UB.DataStore('hr_employeePosition')
    const employeePosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('employeeNumberID', '=', execParams.ID)
      .selectAsObject()
    employeePosition.forEach(row => {
      empPosStore.run('update', {
        __skipOptimisticLock: true,
        skipBefore: true,
        execParams: {
          ID: row.ID,
          deletedByEmployee: 1
        }
      })
      empPosStore.run('delete', {
        skipBefore: true,
        execParams: {
          ID: row.ID
        }
      })
    })
  }

  const accrual = UB.Repository('hr_accrual').attrs(['ID']).where('employeeNumberID', '=', execParams.ID).where('periodCalcID.isClosed', '=', 1).limit(1).selectSingle()
  if (accrual) {
    throw new UB.UBAbort(`<<<${UB.i18n('У закритих періодах розрахункового листа працівника є записи. Видалення неможливе.')}>>>`)
  }
  const accrualPay = UB.Repository('hr_accrual').attrs(['ID']).where('employeeNumberID', '=', execParams.ID).where('payElID.methodID.methodGroupID.groupType', '=', 'FORPAY').limit(1).selectSingle()
  if (accrualPay) {
    throw new UB.UBAbort(`<<<${UB.i18n('У працівника існують записи виплати. Видалення неможливе.')}>>>`)
  }

  const orderRegistry = UB.Repository('hr_orderRegistryDt').attrs(['orderRegistryID.description']).where('employeeNumberID', '=', execParams.ID).where('orderRegistryID.mi_deleteDate', '>=', '#maxdate').limit(1).selectSingle()
  if (orderRegistry) {
    throw new UB.UBAbort(`<<<${UB.i18n('Для працівника існує документ нарахування {0}. Видалення неможливе.', orderRegistry['orderRegistryID.description'])}>>>`)
  }
  const payRoll = UB.Repository('hr_payRollDt').attrs(['payRollID.description']).where('employeeNumberID', '=', execParams.ID).where('reason', '=', '0').where('payRollID.mi_deleteDate', '>=', '#maxdate').selectAsObject()
  if (payRoll.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('Працівника включено до платіжних відомостей {0}. Видалення неможливе.', payRoll.map(o => o['payRollID.description']).join('<br>'))}>>>`)
  }

  const mainPosition = UB.Repository('hr_employeePositionS')
    .attrs(['dateFrom', 'dateTo'])
    .where('employeeNumberID', '=', execParams.ID)
    .where('dateFrom', '<=', dateService.currentDate())
    .where('dateTo', '>=', dateService.currentDate())
    .where('workPlace', '=', '1')
    .selectAsObject()
  mainPosition.forEach(pos => {
    if (UB.Repository('hr_employeePositionS')
      .attrs(['ID'])
      .where('organizationID', '=', instanceData.get('orgID'))
      .where('employeeID', '=', instanceData.get('employeeID'))
      .where('employeeNumberID', '!=', execParams.ID)
      .where('dateFrom', '<=', dateService.shiftDate(pos.dateTo))
      .where('dateTo', '>=', dateService.shiftDate(pos.dateFrom))
      .where('workPlace', '=', '2')
      .limit(1)
      .selectSingle()) {
      throw new UB.UBAbort(`<<<${UB.i18n('Для працівника існує призначення внутрішнім сумісником. Видалення неможливе.')}>>>`)
    }
  })
  const employeeNumberStore = UB.DataStore('hr_employeeNumber')
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .where('mainEmpNumberID', '=', execParams.ID)
    .where('empWorkPlace', '=', '5')
    .selectAsObject()
  employeeNumbers.forEach(row => {
    employeeNumberStore.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })

  const store = UB.DataStore('hr_accrual')
  store.execSQL(`DELETE FROM tim_timeSheet WHERE employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_calcQueue WHERE  employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_calcTimeSheetQueue WHERE  employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_employeeNumState WHERE  employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID in (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:)`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_accrualAvg WHERE accrualID in (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:)`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID in (SELECT ID FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:)`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_accrual WHERE employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_accrualFundDt WHERE accrualFundID in (SELECT ID FROM hr_accrualFund WHERE employeeNumberID = :employeeNumberID:)`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_accrualFund WHERE  employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.execSQL(`DELETE FROM hr_accrualBalance WHERE  employeeNumberID = :employeeNumberID:`,
    { employeeNumberID: execParams.ID })
  store.freeNative()
}

function beforeInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (execParams.tabNum && !ctx.mParams.isImport && !ctx.mParams.skipCheckTabNum) {
    const allowSameTabNum = settingsService.getByCode('hrAllowSameTabNum', execParams.orgID)
    const excludeEmployeeID = allowSameTabNum ? execParams.employeeID : null
    const emp = employeeService.getEmpByTabNum(execParams.ID, execParams.tabNum, execParams.orgID, excludeEmployeeID)
    if (emp) {
      throw new UB.UBAbort(`<<<${UB.i18n('Табельний номер {0} вже призначено для особового рахунку {1}. Збереження неможливе. Виправіть табельний номер', execParams.tabNum, emp.description)}>>>`)
    }
  }
  if (!execParams.dateTo) {
    execParams.dateTo = dateService.maxDate()
  }
  if (mParams.formData) {
    saveEmployee(ctx)
  }
  setDescriptionAttribute(ctx)
  if (execParams.tabNum) {
    setTabNumAttribute(ctx)
  }
}

function beforeUpdate (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (execParams.tabNum && !ctx.mParams.isImport) {
    const allowSameTabNum = settingsService.getByCode('hrAllowSameTabNum', execParams.orgID || previousValues.orgID)
    const excludeEmployeeID = allowSameTabNum ? execParams.employeeID || previousValues.employeeID : null
    const emp = employeeService.getEmpByTabNum(execParams.ID, execParams.tabNum, previousValues.orgID, excludeEmployeeID)
    if (emp) {
      throw new UB.UBAbort(`<<<${UB.i18n('Табельний номер {0} вже призначено для особового рахунку {1}. Збереження неможливе. Виправіть табельний номер', execParams.tabNum, emp.description)}>>>`)
    }
  }
  entityService.setAttrs(ctx, true, previousValues)
  ctx.previousValues = previousValues
  if (ctx.mParams.formData) {
    saveEmployee(ctx)
    saveFormData(ctx)
  }
  setDescriptionAttribute(ctx)
  if (execParams.tabNum) {
    setTabNumAttribute(ctx)
  }
  if (execParams.dateFrom) {
    const firstEmpPos = UB.Repository('hr_employeePositionS')
      .attrs(['dateFrom'])
      .where('employeeNumberID', '=', execParams.ID)
      .orderBy('dateFrom', 'asc')
      .limit(1)
      .selectSingle()
    if (firstEmpPos && new Date(execParams.dateFrom) > new Date(firstEmpPos.dateFrom)) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата початку дії {0} не може бути більшою за дату початку дії призначення {1}', dateService.formatDate(execParams.dateFrom), dateService.formatDate(firstEmpPos.dateFrom))}>>>`)
    }
  }
  const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
  const period = periodService.getCurrentPeriod(execParams.orgID || previousValues.orgID)
  if (execParams.dateFrom && (execParams.orderID || previousValues.orderID)) {
    timService.cancelTimeSheet(execParams.orderID || previousValues.orderID, [execParams.ID])
    const timeSheetParams = []
    if (dateService.shiftDate(execParams.dateFrom).getDate() !== 1) {
      let date = dateService.firstDayOfMonth(dateService.shiftDate(execParams.dateFrom))
      let dateTo = dateService.shiftDate(Math.min(dateService.lastDayOfMonth(date), dateService.addDays(dateService.shiftDate(execParams.dateFrom), -1)))
      if (period.ID && dictTimeCost) {
        while (date <= dateTo) {
          timeSheetParams.push({
            orderID: execParams.orderID || previousValues.orderID,
            employeeNumberID: execParams.ID,
            periodID: period.ID,
            dateWork: date,
            factTimeCostID: dictTimeCost,
            factHour: 0
          })
          date = dateService.nextDay(date)
        }
        timService.setTimeSheet(timeSheetParams)
      }
    }
  }
  if (execParams.dateTo) {
    const employeeNumbers = UB.Repository('hr_employeeNumberS')
      .attrs(['ID'])
      .where('mainEmpNumberID', '=', execParams.ID)
      .where('empWorkPlace', '=', '5')
      .selectAsObject()
    const lastTrfWorkPlace = UB.Repository('trf_workPlace')
      .attrs('ID', 'dateFrom', 'dateTo')
      .where('employeeNumberID', '=', execParams.ID)
      .orderByDesc('dateTo')
      .limit(1)
      .selectSingle()
    if (lastTrfWorkPlace) {
      if (dateService.shiftDate(previousValues.dateTo).getFullYear() === 9999 || dateService.shiftDate(lastTrfWorkPlace.dateTo).getTime() === dateService.shiftDate(previousValues.dateTo).getTime()) {
        const trfWorkPlaceStore = UB.DataStore('trf_workPlace')
        trfWorkPlaceStore.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: lastTrfWorkPlace.ID,
            dateTo: execParams.dateTo
          }
        })
      }
    }

    const employeeNumberStore = UB.DataStore('hr_employeeNumber')
    const changeOrderID = (execParams.changeOrderID || execParams.changeOrderID === null) ? execParams.changeOrderID : previousValues.changeOrderID
    employeeNumbers.forEach(row => {
      employeeNumberStore.run('update', {
        __skipOptimisticLock: true,
        formData: {
          employee: {},
          position: {},
          rank: {},
          dism: { dateTo: execParams.dateTo, changeOrderID }
        },
        execParams: {
          ID: row.ID,
          dateTo: execParams.dateTo,
          changeOrderID
        }
      })
    })
  }

  const timeSheetStore = UB.DataStore('tim_timeSheet')
  if (execParams.dateTo && (execParams.changeOrderID || previousValues.changeOrderID)) {
    if (dateService.shiftDate(execParams.dateTo) < dateService.maxDate()) {
      const mainPosition = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeID', 'organizationID', 'dateFrom', 'dateTo', 'description'])
        .where('employeeNumberID', '=', execParams.ID)
        .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo))
        .where('dateTo', '>=', dateService.shiftDate(execParams.dateTo))
        .where('workPlace', '=', '1')
        .limit(1)
        .selectSingle()
      if (mainPosition) {
        const secPos = UB.Repository('hr_employeePositionS')
          .attrs(['ID'])
          .where('organizationID', '=', mainPosition.organizationID)
          .where('employeeID', '=', mainPosition.employeeID)
          .where('employeeNumberID', '<>', execParams.ID)
          .where('dateFrom', '<=', dateService.shiftDate(execParams.dateTo))
          .where('dateTo', '>', dateService.shiftDate(execParams.dateTo))
          .where('workPlace', '=', '2')
          .limit(1)
          .selectSingle()
        if (secPos) {
          throw new UB.UBAbort(`<<<${UB.i18n('У працівника {0} є призначення внутрішнім сумісником! Звільнення неможливе!', mainPosition.description)}>>>`)
        }
      }
    }

    if (dateService.isMaxDate(previousValues.dateTo)) {
      timService.cancelTimeSheet(execParams.changeOrderID || previousValues.changeOrderID, [execParams.ID])
    } else {
      const cancelDateFrom = dateService.addDays(dateService.shiftDate(previousValues.dateTo), 1)
      timService.cancelTimeSheetByOrder(previousValues.changeOrderID || execParams.changeOrderID, execParams.changeOrderID || previousValues.changeOrderID, period, cancelDateFrom, null, [execParams.ID], true)
    }
    const timeSheetParams = []
    let date = dateService.addDays(dateService.shiftDate(execParams.dateTo), 1)
    let dateTo = dateService.lastDayOfMonth(dateService.shiftDate(execParams.dateTo))
    if (period.ID && dictTimeCost) {
      while (date <= dateTo) {
        timeSheetParams.push({
          orderID: execParams.changeOrderID || previousValues.changeOrderID,
          employeeNumberID: execParams.ID,
          periodID: period.ID,
          dateWork: date,
          factTimeCostID: dictTimeCost,
          factHour: 0
        })
        date = dateService.nextDay(date)
      }
      timService.setTimeSheet(timeSheetParams)
      let timeSheets = UB.Repository('tim_timeSheet')
        .attrs(['ID'])
        .where('employeeNumberID', '=', execParams.ID)
        .where('dateWork', '>', dateTo)
        .where('isSchedule', '=', 1)
        .where('isCanceled', '=', 0)
        .selectAsObject()
      timeSheets.forEach(row => {
        timeSheetStore.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      })
      timeSheets = UB.Repository('tim_timeSheet')
        .attrs(['ID'])
        .where('employeeNumberID', '=', execParams.ID)
        .where('dateWork', '>', dateTo)
        .where('orderID.orderClass.entityName', 'in', ['hr_timeSheetChange', 'hr_employeeAccrual'])
        .where('isCanceled', '=', 0)
        .selectAsObject()
      timeSheets.forEach(row => {
        timeSheetStore.run('delete', {
          execParams: {
            ID: row.ID
          }
        })
      })
    }
  }
  if (dictTimeCost && period.ID && execParams.dateTo) {
    const timeSheets = UB.Repository('tim_timeSheet')
      .attrs(['ID'])
      .where('employeeNumberID', '=', execParams.ID)
      .where('dateWork', '<=', dateService.shiftDate(execParams.dateTo))
      .where('dateWork', '>=', dateService.shiftDate(execParams.dateFrom || previousValues.dateFrom))
      .where('factTimeCostID', '=', dictTimeCost)
      .where('isActive', '=', 1)
      .selectAsObject()
    timeSheets.forEach(row => {
      timeSheetStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
    if (period.ID && execParams.dateTo && dateService.shiftDate(execParams.dateTo).getFullYear() < 9999) {
      let date = dateService.addDays(dateService.shiftDate(execParams.dateTo), 1)
      let dateTo = dateService.lastDayOfMonth(dateService.shiftDate(execParams.dateTo))
      const timeSheetNo = UB.Repository('tim_timeSheet')
        .attrs(['ID', 'dateWork'])
        .where('employeeNumberID', '=', execParams.ID)
        .where('dateWork', '>=', date)
        .where('dateWork', '<=', dateTo)
        .where('factTimeCostID', '=', dictTimeCost)
        .selectAsObject()
      if (dateTo.getDate() !== dateService.shiftDate(execParams.dateTo).getDate()) {
        const timeSheetParams = []
        while (date <= dateTo) {
          if (!timeSheetNo.find(o => dateService.shiftDate(o.dateWork).getTime() === date.getTime())) {
            timeSheetParams.push({
              orderID: execParams.orderID || previousValues.orderID,
              employeeNumberID: execParams.ID,
              periodID: period.ID,
              dateWork: date,
              factTimeCostID: dictTimeCost,
              factHour: 0
            })
          }
          date = dateService.nextDay(date)
        }
        if (timeSheetParams.length) {
          timService.setTimeSheet(timeSheetParams)
        }
      }
    }
    if (previousValues.changeOrderID && execParams.changeOrderID === null) {
      timService.restoreTimeSheetByChangeOrder(previousValues.changeOrderID, execParams.orgID || previousValues.orgID, dictTimeCost)
    }
  }
}

function afterInsert (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const store = UB.DataStore('hr_employeeNumState')
  if (mParams.formData) {
    saveFormData(ctx)
  }
  store.run('insert', { execParams: { employeeNumberID: execParams.ID } })
  if (mParams.formData) {
    loadDetail(mParams, execParams.ID)
  }
  if (!ctx.mParams.isImport) {
    calcService.addCalcQueue({ employeeNumbers: [execParams.ID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
  if (execParams.orderID || mParams.formData) {
    if (!execParams.orderID) {
      execParams.orderID = UB.Repository(__entityName).attrs('orderID').where('ID', '=', execParams.ID).selectScalar()
    }
    if (dateService.shiftDate(execParams.dateFrom).getDate() !== 1) {
      const timeSheetParams = []
      let date = dateService.firstDayOfMonth(dateService.shiftDate(execParams.dateFrom))
      let dateTo = dateService.shiftDate(Math.min(dateService.lastDayOfMonth(date), dateService.addDays(dateService.shiftDate(execParams.dateFrom), -1)))
      const period = periodService.getCurrentPeriod(execParams.orgID)
      const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
      if (period.ID && dictTimeCost) {
        while (date <= dateTo) {
          timeSheetParams.push({
            orderID: execParams.orderID,
            employeeNumberID: execParams.ID,
            periodID: period.ID,
            dateWork: date,
            factTimeCostID: dictTimeCost,
            factHour: 0
          })
          date = dateService.nextDay(date)
        }
        timService.setTimeSheet(timeSheetParams)
      }
    }
    if (dateService.shiftDate(execParams.dateTo).getFullYear() < 9999) {
      let date = dateService.addDays(dateService.shiftDate(execParams.dateTo), 1)
      let dateTo = dateService.lastDayOfMonth(dateService.shiftDate(execParams.dateTo))
      if (dateTo.getDate() !== dateService.shiftDate(execParams.dateTo).getDate()) {
        const timeSheetParams = []
        const period = periodService.getCurrentPeriod(execParams.orgID)
        const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
        if (period.ID && dictTimeCost) {
          while (date <= dateTo) {
            timeSheetParams.push({
              orderID: execParams.orderID,
              employeeNumberID: execParams.ID,
              periodID: period.ID,
              dateWork: date,
              factTimeCostID: dictTimeCost,
              factHour: 0
            })
            date = dateService.nextDay(date)
          }
          timService.setTimeSheet(timeSheetParams)
        }
      }
    }
  }
}

function afterUpdate (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (execParams.tabNum) {
    UB.Repository('hr_employeePositionS')
      .attrs('ID')
      .where('employeeNumberID', '=', execParams.ID)
      .orderBy('dateFrom')
      .selectAsObject()
      .forEach((item) => {
        UB.DataStore('hr_employeePosition').run('update', {
          __skipOptimisticLock: true,
          __skipSelectAfterUpdate: true,
          isImport: mParams.isImport || false,
          execParams: {
            ID: item.ID,
            description: null
          }
        })
      })
  }
  if (mParams.formData) {
    loadDetail(mParams, mParams.execParams.ID)
  }
  if (!ctx.mParams.isImport) {
    calcService.addCalcQueue({ employeeNumbers: [mParams.execParams.ID], description: UB.i18n(`Змінено дані {0}`, __entityName) })
  }
}

function afterDelete (ctx) {
  const timeSheet = UB.Repository('tim_timeSheet')
    .attrs(['ID'])
    .where('employeeNumberID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  const store = UB.DataStore('tim_timeSheet')
  timeSheet.forEach(row => {
    store.run('delete', {
      __skipOptimisticLock: true,
      __selectBeforeDelete: true,
      __skipRls: true,
      __skipAclRls: true,
      execParams: {
        ID: row.ID
      }
    })
  })
  if (!ctx.mParams.isImport && ctx.previousValues) {
    calcService.addCalcQueue({ orgID: ctx.previousValues.orgID, calcBalance: 1, description: UB.i18n(`Видалено{0} {1} ({2}-{3}) {4}`, ctx.mParams.isOrderOperation ? ' Наказом' : '', ctx.previousValues.description, dateService.formatDate(ctx.previousValues.dateFrom), dateService.formatDate(ctx.previousValues.dateTo, __entityName)) })
  }
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams && (mParams.fieldList || []).includes('mi_deleteUser')) {
    loadDetail(mParams, mParams.ID)
  }
}

function loadDetail (mParams, instanceID) {
  let detail = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'dateFrom', 'dateTo', 'employeeID.taxCode', 'employeeID.empTaxCodeType', 'employeeID.sexType', 'employeeID.birthDate',
      'employeeID.age', 'employeeID', 'employeeID.oathDate', 'employeeID.isCitizen', 'employeeID.deputy',
      'employeeID.scientificWorks', 'employeeID.civilOther', 'employeeID.isInitiated', 'employeeID.citizenshipID' ])
    .selectById(instanceID) || {}

  Object.assign(detail, UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'accountID', 'accountID.code', 'accountID.name', 'accrualSum', 'changeOrderID',
      'changeOrderID.orderClass.entityName', 'changeOrderID.orderDate', 'changeOrderID.orderNumber', 'dateTo',
      'departmentID', 'depCaption', 'dictCategoryECBID', 'dictCategoryECBID.caption',
      'dictTarifCoeffID', 'dictTarifCoeffID.name', 'dictPositionID', 'dictPositionID.caption', 'dictStaffCatID',
      'dictStaffCatID.caption', 'isIndex', 'mtCount', 'payElID', 'payElID.methodID.code', 'payElID.name',
      'posCaption', 'positionID', 'raiseSalary', 'workerType', 'workPlace', 'workScheduleID', 'workScheduleID.caption',
      'isFactWorkSchedule', 'dictCostTypeID', 'factPosition', 'dictEmpCategoryID', 'dictEmpCategoryID.description',
      'posNameAddition', 'dictQualificationID', 'dictQualificationID.description', 'orderID.orderClass.entityName'
    ])
    .orderByDesc('dateTo')
    .where('employeeNumberID', '=', instanceID)
    .limit(1)
    .selectSingle({
      'ID': 'employeePositionID',
      'accountID': 'positionID.accountID',
      'accountID.code': 'positionID.accountIDCode',
      'accountID.name': 'positionID.accountIDName',
      'dictCostTypeID': 'positionID.dictCostTypeID',
      'dictCostTypeID.description': 'positionID.dictCostTypeIDName',
      'accrualSum': 'positionID.accrualSum',
      'changeOrderID': 'positionID.changeOrderID',
      'changeOrderID.orderClass.entityName': 'positionID.dismissOrderClassName',
      'changeOrderID.orderDate': 'positionID.dismissOrderDate',
      'changeOrderID.orderNumber': 'positionID.dismissOrderNumber',
      'dateTo': 'positionID.dateTo',
      'departmentID': 'positionID.departmentID',
      'depCaption': 'positionID.departmentIDName',
      'dictCategoryECBID': 'positionID.dictCategoryECBID',
      'dictCategoryECBID.caption': 'positionID.dictCategoryECBIDName',
      'dictTarifCoeffID': 'positionID.dictTarifCoeffID',
      'dictTarifCoeffID.name': 'positionID.dictTarifCoeffIDName',
      'dictPositionID': 'positionID.dictPositionID',
      'dictPositionID.caption': 'positionID.dictPositionIDName',
      'dictStaffCatID': 'positionID.dictStaffCatID',
      'dictStaffCatID.caption': 'positionID.dictStaffCatIDName',
      'isIndex': 'positionID.isIndex',
      'isFactWorkSchedule': 'positionID.isFactWorkSchedule',
      'mtCount': 'positionID.mtCount',
      'payElID': 'positionID.payElID',
      'payElID.name': 'positionID.payElIDName',
      'posCaption': 'positionID.positionIDName',
      'positionID': 'positionID.positionID',
      'raiseSalary': 'positionID.raiseSalary',
      'workerType': 'positionID.workerType',
      'workPlace': 'positionID.workPlace',
      'workScheduleID': 'positionID.workScheduleID',
      'workScheduleID.caption': 'positionID.workScheduleIDName',
      'dictEmpCategoryID': 'positionID.dictEmpCategoryID',
      'dictEmpCategoryID.description': 'positionID.dictEmpCategoryIDName',
      'dictQualificationID': 'positionID.dictQualificationID',
      'dictQualificationID.description': 'positionID.dictQualificationIDName',
      'posNameAddition': 'positionID.posNameAddition',
      'orderID.orderClass.entityName': 'orderEntityName'
    })
  )
  Object.assign(detail, UB.Repository('hr_employeePositionS')
    .attrs(['dateFrom', 'orderID', 'orderID.orderClass.entityName', 'orderID.orderDate', 'orderID.orderNumber',
      'paraID', 'paraID.mi_unityEntity'])
    .orderBy('dateFrom')
    .orderBy('isActive')
    .where('employeeNumberID', '=', instanceID)
    .limit(1)
    .misc({ __skipRls: true })
    .selectSingle({
      'dateFrom': 'positionID.dateFrom',
      'orderID': 'positionID.orderID',
      'orderID.orderClass.entityName': 'positionID.appointOrderClassName',
      'orderID.orderDate': 'positionID.appointOrderDate',
      'orderID.orderNumber': 'positionID.appointOrderNumber'
    })
  )
  if (detail.employeePositionID) {
    detail.positionFundSourceDt = JSON.stringify(UB.Repository('hr_empPosFundSource')
      .attrs(['ID', 'employeePositionID', 'employeeNumberID', 'dictFundSourceID', 'dictFundSourceID.mi_deleteUser', 'dictFundSourceID.description',
        'dictProjectID', 'dictProjectID.description', 'dictProgClassID', 'dictProgClassID.description', 'mtCount', 'mi_modifyDate'])
      .where('employeePositionID', '=', detail.employeePositionID)
      .selectAsObject())
  }

  if (detail['positionID.orderID']) {
    if (detail['positionID.appointOrderClassName'] === 'hr_orderPay') {
      const order = UB.Repository('hr_orderPay').attrs(['dictAppointKindID', 'dictAppointKindID.caption']).selectById(detail['positionID.orderID'])
      if (order) {
        detail['positionID.dictAppointKindID'] = order.dictAppointKindID
        detail['positionID.dictAppointKindIDName'] = order['dictAppointKindID.caption']
      }
    } else if (detail['positionID.appointOrderClassName'] === 'hr_empOrder' && detail['paraID'] && ['hr_empOrderAppointDet', 'hr_empOrderMoveDet'].includes(detail['paraID.mi_unityEntity'])) {
      const order = UB.Repository(detail['paraID.mi_unityEntity']).attrs(['dictAppointKindID', 'dictAppointKindID.caption']).selectById(detail['paraID'])
      if (order) {
        detail['positionID.dictAppointKindID'] = order.dictAppointKindID
        detail['positionID.dictAppointKindIDName'] = order['dictAppointKindID.caption']
      }
    }
  }
  if (detail['positionID.changeOrderID']) {
    if (detail['positionID.dismissOrderClassName'] === 'hr_orderPay') {
      const order = UB.Repository('hr_orderPay').attrs(['reasonDismID', 'reasonDismID.caption']).selectById(detail['positionID.changeOrderID'])
      if (order) {
        detail['positionID.reasonDismID'] = order.reasonDismID
        detail['positionID.reasonDismIDName'] = order['reasonDismID.caption']
      }
    } else {
      if (detail['positionID.dismissOrderClassName'] === 'hr_empOrder') {
        const order = UB.Repository('hr_empOrderDismDet').attrs(['dictReasonDismID', 'dictReasonDismID.caption'])
          .where('orderID', '=', detail['positionID.changeOrderID']).where('employeeNumberID', '=', instanceID).limit(1).selectSingle()
        if (order) {
          detail['positionID.reasonDismID'] = order.dictReasonDismID
          detail['positionID.reasonDismIDName'] = order['dictReasonDismID.caption']
        }
      }
    }
  }
  detail.employeeID && Object.assign(detail, UB.Repository('hr_publServRang')
    .attrs(['dictRankID', 'dictRankID.name', 'dateFrom', 'orderNumber', 'orderDate', 'orderID'])
    .orderByDesc('dateTo')
    .where('employeeID', '=', detail.employeeID)
    .limit(1)
    .selectSingle({
      'dateFrom': 'rankID.rankDateFrom',
      'dictRankID': 'rankID.dictRankID',
      'dictRankID.name': 'rankID.dictRankIDName',
      'orderNumber': 'rankID.rankOrderNumber',
      'orderDate': 'rankID.rankOrderDate',
      'orderID': 'rankID.orderID'
    })
  )
  if (detail.dateTo && dateService.maxDate().getTime() === dateService.shiftDate(detail.dateTo).getTime()) {
    detail.dateTo = null
    detail['positionID.dismissOrderNumber'] = null
    detail['positionID.dismissOrderDate'] = null
    detail['positionID.reasonDismID'] = null
  }
  mParams.detail = detail
}

function saveEmployee (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (mParams.formData && Object.keys(mParams.formData.employee).length) {
    const employee = mParams.formData.employee
    const empStore = UB.DataStore('hr_employee')
    const employeeID = execParams.employeeID || instanceData.employeeID || empStore.generateID()
    const empExecParams = {
      ID: employeeID
    }
    if (employee.taxCode) {
      empExecParams.taxCode = employee.taxCode
    }
    if (employee.empTaxCodeType) {
      empExecParams.empTaxCodeType = employee.empTaxCodeType
    }
    if (employee.fullFIO) {
      const fio = employee.fullFIO.split(' ')
      empExecParams.fullFIO = employee.fullFIO
      empExecParams.lastName = fio[0]
      empExecParams.firstName = fio[1]
      empExecParams.middleName = fio.length > 2 ? fio[2] : null
      empExecParams.shortFIO = `${fio[0]} ${fio[1][0].toUpperCase()}. ${fio.length > 2 ? `${fio[2][0].toUpperCase()}.` : ''}`
      empExecParams.genName = employee.fullFIO
      empExecParams.datName = employee.fullFIO
      empExecParams.accusativeName = employee.fullFIO
      empExecParams.insName = employee.fullFIO
      empExecParams.locName = employee.fullFIO
    }
    if (!execParams.employeeID && !instanceData.employeeID) {
      empExecParams.organizationID = execParams.orgID
    }
    const attrs = ['sexType', 'isCitizen', 'deputy', 'scientificWorks', 'civilOther', 'isInitiated', 'citizenshipID']
    const attrsDate = ['birthDate', 'oathDate']
    attrs.forEach(attrName => {
      if (employee[attrName] !== undefined) {
        empExecParams[attrName] = employee[attrName]
      }
    })
    attrsDate.forEach(attrName => {
      if (employee[attrName] !== undefined) {
        empExecParams[attrName] = employee[attrName] ? dateService.shiftDate(employee[attrName]) : employee[attrName]
      }
    })

    empStore.run((execParams.employeeID || instanceData.employeeID) ? 'update' : 'insert', {
      __skipOptimisticLock: true,
      execParams: empExecParams
    })

    if (!execParams.employeeID && !instanceData.employeeID) {
      execParams.employeeID = employeeID
    }
  }
}

function saveFormData (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  const orderStore = UB.DataStore('hr_orderPay')
  const storePosition = UB.DataStore('hr_employeePosition')
  const storePosFundSource = UB.DataStore('hr_empPosFundSource')
  const storeNumber = UB.DataStore('hr_employeeNumber')
  const orders = {}
  if (mParams.formData && Object.keys(mParams.formData.position).length) {
    let entryDate = dateService.shiftDate(mParams.formData.position.dateFrom || mParams.formData.entryDate)
    const position = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'orderID', 'orderID.orderDate', 'orderID.orderNumber', 'orderID.orderClass.entityName',
        'changeOrderID', 'changeOrderID.orderDate', 'changeOrderID.orderNumber', 'changeOrderID.orderClass.entityName',
        'dateFrom', 'dateTo', 'payElID', 'accrualSum', 'raiseSalary', 'isIndex', 'isFactWorkSchedule',
        'departmentID', 'positionID', 'workScheduleID', 'workerType', 'mtCount', 'dictStaffCatID', 'dictPositionID',
        'workPlace', 'dictCategoryECBID', 'accountID', 'dictTarifCoeffID',
        'd0', 'd0Value', 'd1', 'd1Value', 'd2', 'd2Value', 'd3', 'd3Value', 'd4', 'd4Value', 'd5', 'd5Value',
        'd6', 'd6Value', 'd7', 'd7Value', 'd8', 'd8Value', 'd9', 'd9Value',
        'planHours', 'contractType', 'dictContractKindID', 'dictRankID', 'isResponsible', 'planDateTo'
      ])
      .orderByDesc('dateTo')
      .where('employeeNumberID', '=', execParams.ID)
      .limit(1)
      .selectSingle() || {}
    const firstPosition = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'orderID', 'orderID.orderClass.entityName'])
      .orderBy('dateFrom')
      .where('employeeNumberID', '=', execParams.ID)
      .limit(1)
      .selectSingle()

    if (position.orderID && !mParams.formData.position.dictAppointKindID && position['orderID.orderClass.entityName'] === 'hr_orderPay') {
      const order = UB.Repository('hr_orderPay').attrs(['dictAppointKindID']).selectById(position.orderID)
      orders.dictAppointKindID = order && order.dictAppointKindID ? order.dictAppointKindID : null
    }
    let orderID = mParams.formData.newAppointOrder || !position.orderID ? orderStore.generateID() : position.orderID
    let orderDate = mParams.formData.position.appointOrderDate || mParams.formData.orderDate || null
    if (mParams.formData.newAppointOrder || !position.orderID) {
      orderStore.run('insert', {
        execParams: {
          ID: orderID,
          employeeNumberID: execParams.ID,
          orderState: 'POSTED',
          empOrderType: position.ID ? 'MOVE' : 'APPOINT',
          dictAppointKindID: mParams.formData.position.dictAppointKindID || orders.dictAppointKindID || null,
          orderNumber: mParams.formData.position.appointOrderNumber || mParams.formData.orderNumber || null,
          orderDate: orderDate ? dateService.shiftDate(orderDate) : null,
          entryDate: entryDate,
          description: `${position.ID ? UB.i18n('Додано призначення через особовий рахунок') : UB.i18n('Прийнято на роботу через особовий рахунок')
          } ${mParams.formData.position.appointOrderNumber || mParams.formData.orderNumber || ''} ${orderDate ? dateService.formatDate(dateService.shiftDate(execParams.orderDate)) : ''}`
        }
      })
      if (!position.ID) {
        const numberStore = UB.DataStore('hr_employeeNumber')
        numberStore.execSQL(`UPDATE hr_employeeNumber SET orderID = :orderID: WHERE ID = :employeeNumberID:`, { orderID, employeeNumberID: execParams.ID })
        /*
        const timeSheetParams = []
        if (dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom).getDate() !== 1) {
          let date = dateService.firstDayOfMonth(dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom))
          let dateTo = dateService.shiftDate(Math.min(dateService.lastDayOfMonth(date), dateService.addDays(dateService.shiftDate(execParams.dateFrom || instanceData.dateFrom), -1)))
          const period = periodService.getCurrentPeriod(execParams.orgID || instanceData.orgID)
          const dictTimeCost = UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
          if (period.ID && dictTimeCost) {
            while (date <= dateTo) {
              timeSheetParams.push({
                orderID: orderID,
                employeeNumberID: execParams.ID,
                periodID: period.ID,
                dateWork: date,
                factTimeCostID: dictTimeCost,
                factHour: 0
              })
              date = dateService.nextDay(date)
            }
            timService.setTimeSheet(timeSheetParams)
            console.log('### case 4')
          }
        }
        */
      }
    }
    if (firstPosition) {
      if (mParams.formData.position.dateFrom) {
        storePosition.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: firstPosition.ID,
            dateFrom: dateService.shiftDate(mParams.formData.position.dateFrom)
          }
        })
      }
      if (firstPosition.orderID && firstPosition['orderID.orderClass.entityName'] === 'hr_orderPay' &&
        (mParams.formData.position.appointOrderDate || mParams.formData.position.appointOrderNumber ||
        mParams.formData.position.dictAppointKindID)) {
        let prm = { ID: firstPosition.orderID }
        if (mParams.formData.position.appointOrderDate) prm.orderDate = mParams.formData.position.appointOrderDate
        if (mParams.formData.position.appointOrderNumber) prm.orderNumber = mParams.formData.position.appointOrderNumber
        if (mParams.formData.position.dictAppointKindID) prm.dictAppointKindID = mParams.formData.position.dictAppointKindID

        orderStore.run('update', {
          __skipOptimisticLock: true,
          execParams: prm
        })
      }
    }
    if (mParams.formData.newAppointOrder || !position.orderID) {
      if (position.ID) {
        storePosition.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: position.ID,
            dateTo: dateService.addDays(entryDate, -1),
            changeOrderID: orderID
          }
        })
      }
      const insertParams = {
        ID: storePosition.generateID(),
        orderID: orderID,
        employeeID: execParams.employeeID || instanceData.employeeID,
        employeeNumberID: execParams.ID,
        organizationID: execParams.orgID || instanceData.orgID,
        departmentID: mParams.formData.position.departmentID !== undefined ? mParams.formData.position.departmentID : (position.departmentID || null),
        positionID: mParams.formData.position.positionID !== undefined ? mParams.formData.position.positionID : (position.positionID || null),
        workScheduleID: mParams.formData.position.workScheduleID !== undefined ? mParams.formData.position.workScheduleID : (position.workScheduleID || null),
        dictTarifCoeffID: mParams.formData.position.dictTarifCoeffID !== undefined ? mParams.formData.position.dictTarifCoeffID : (position.dictTarifCoeffID || null),
        workerType: mParams.formData.position.workerType !== undefined ? mParams.formData.position.workerType : (position.workerType || null),
        workPlace: mParams.formData.position.workPlace !== undefined ? mParams.formData.position.workPlace : (position.workPlace || null),
        mtCount: mParams.formData.position.mtCount !== undefined ? mParams.formData.position.mtCount : (position.mtCount || null),
        dictCategoryECBID: mParams.formData.position.dictCategoryECBID !== undefined ? mParams.formData.position.dictCategoryECBID : (position.dictCategoryECBID || null),
        accountID: mParams.formData.position.accountID !== undefined ? mParams.formData.position.accountID : (position.accountID || null),
        dateFrom: entryDate,
        dateTo: mParams.formData.dateToPosition ? dateService.shiftDate(mParams.formData.dateToPosition) : dateService.maxDate(),
        changeDateTo: dateService.maxDate(),
        dictStaffCatID: mParams.formData.position.dictStaffCatID !== undefined ? mParams.formData.position.dictStaffCatID : (position.dictStaffCatID || null),
        dictPositionID: mParams.formData.position.dictPositionID !== undefined ? mParams.formData.position.dictPositionID : (position.dictPositionID || null),
        payElID: mParams.formData.position.payElID !== undefined ? mParams.formData.position.payElID : (position.payElID || null),
        accrualSum: mParams.formData.position.accrualSum !== undefined ? mParams.formData.position.accrualSum : (position.accrualSum || null),
        raiseSalary: mParams.formData.position.raiseSalary === null ? null
          : (mParams.formData.position.raiseSalary || position.raiseSalary) ? dateService.shiftDate(mParams.formData.position.raiseSalary || position.raiseSalary) : null,
        isIndex: mParams.formData.position.isIndex !== undefined ? mParams.formData.position.isIndex : position.isIndex !== undefined ? position.isIndex : 0,
        isFactWorkSchedule: mParams.formData.position.isFactWorkSchedule !== undefined ? mParams.formData.position.isFactWorkSchedule : position.isFactWorkSchedule !== undefined ? position.isFactWorkSchedule : 0,
        planHours: position.planHours || null,
        contractType: position.contractType || null,
        dictContractKindID: position.dictContractKindID || null,
        dictRankID: position.dictRankID || null,
        isResponsible: position.isResponsible || 0,
        planDateTo: position.planDateTo ? dateService.shiftDate(position.planDateTo) : null,
        dictEmpCategoryID: mParams.formData.position.dictEmpCategoryID !== undefined ? mParams.formData.position.dictEmpCategoryID : (position.dictEmpCategoryID || null),
        dictQualificationID: mParams.formData.position.dictQualificationID !== undefined ? mParams.formData.position.dictQualificationID : (position.dictQualificationID || null),
        posNameAddition: mParams.formData.position.posNameAddition !== undefined ? mParams.formData.position.posNameAddition : (position.posNameAddition || null)
      }
      if (mParams.formData.position.dictCostTypeID !== undefined) {
        setDimensionInPosition(mParams.formData.position.dictCostTypeID, 'ac_dictCostType', insertParams, position)
      }
      storePosition.run('insert', { execParams: insertParams })
      if (mParams.formData.position.positionFundSource) {
        const positionFundSource = JSON.parse(mParams.formData.position.positionFundSource)
        positionFundSource.forEach(row => {
          delete row.ID
          delete row.mi_modifyDate
          delete row['dictFundSourceID.description']
          delete row['dictProjectID.description']
          delete row['dictProgClassID.description']
          delete row['dictFundSourceID.mi_deleteUser']
          delete row['dictProjectID.mi_deleteUser']
          delete row['dictProgClassID.mi_deleteUser']
          row.employeePositionID = insertParams.ID
          storePosFundSource.run('insert', { execParams: row })
        })
      }
    } else {
      const updateParams = {
        ID: position.ID
      }
      Object.keys(mParams.formData.position).forEach(attr => {
        if (['workPlace', 'dictCategoryECBID', 'accountID', 'workerType', 'departmentID', 'positionID',
          'dictStaffCatID', 'workScheduleID', 'dictTarifCoeffID', 'dictPositionID', 'payElID', 'mtCount', 'accrualSum',
          'raiseSalary', 'isIndex', 'isFactWorkSchedule', 'dictEmpCategoryID', 'dictQualificationID', 'posNameAddition'].includes(attr)) {
          updateParams[attr] = mParams.formData.position[attr]
        }
      })
      if (mParams.formData.dateToPosition) {
        updateParams.dateTo = dateService.shiftDate(mParams.formData.dateToPosition)
      }
      if (mParams.formData.position.dictCostTypeID !== undefined) {
        setDimensionInPosition(mParams.formData.position.dictCostTypeID, 'ac_dictCostType', updateParams, position)
      }

      storePosition.run('update', {
        __skipOptimisticLock: true,
        execParams: updateParams
      })
      if (mParams.formData.position.positionFundSourceDt) {
        const positionFundSourceDt = JSON.parse(mParams.formData.position.positionFundSourceDt)
        orderService.saveDetails(
          { mParams: { formData: JSON.stringify({ detail: { positionFundSourceDt } }) } },
          [{
            detailName: 'positionFundSourceDt',
            entityName: 'hr_empPosFundSource',
            docIDName: 'employeePositionID',
            fieldList: ['ID', 'mi_modifyDate', 'employeeNumberID', 'dictFundSourceID', 'dictProjectID', 'dictProgClassID', 'mtCount']
          }], { docID: position.ID })
      }
    }
  }
  if (mParams.formData && Object.keys(mParams.formData.dism).length) {
    const position = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'changeOrderID', 'dateTo'])
      .orderByDesc('dateTo')
      .where('employeeNumberID', '=', execParams.ID)
      .limit(1)
      .selectSingle()

    if (!position) {
      throw new UB.UBAbort(`<<<${UB.i18n('Звільнення неможливе. Відсутнє призначення.')}>>>`)
    }
    let entryDate = mParams.formData.dism.dateTo === null
      ? dateService.maxDate() : dateService.shiftDate(mParams.formData.dism.dateTo || mParams.formData.entryDate)
    if (entryDate < dateService.maxDate()) {
      const lastTrfWorkPlace = UB.Repository('trf_workPlace')
        .attrs('ID', 'dateFrom', 'dateTo')
        .where('employeeNumberID', '=', execParams.ID)
        .orderByDesc('dateTo')
        .limit(1)
        .selectSingle()
      if (lastTrfWorkPlace) {
        if (entryDate < dateService.shiftDate(lastTrfWorkPlace.dateFrom)) {
          throw new UB.UBAbort(`<<<${UB.i18n('Увага, знайдена тарифікація, у якої дата початку {0} більша за дату звільнення {1}!', dateService.formatDate(lastTrfWorkPlace.dateFrom), dateService.formatDate(entryDate))}>>>`)
        }
      }
    }
    let orderDate = mParams.formData.dism.dismissOrderDate || mParams.formData.orderDate || null
    let changeOrderID = position.changeOrderID
    if (!changeOrderID) {
      changeOrderID = orderStore.generateID()
      orderStore.run('insert', {
        execParams: {
          ID: changeOrderID,
          employeeNumberID: execParams.ID,
          orderState: 'POSTED',
          empOrderType: 'DISM',
          reasonDismID: mParams.formData.dism.reasonDismID || null,
          orderNumber: mParams.formData.dism.dismissOrderNumber || mParams.formData.orderNumber || null,
          orderDate: orderDate ? dateService.shiftDate(orderDate) : null,
          entryDate: entryDate,
          description: `${UB.i18n('Звільнено через особовий рахунок')
          } ${mParams.formData.dism.dismissOrderNumber || mParams.formData.orderNumber || ''} ${orderDate ? dateService.formatDate(dateService.shiftDate(orderDate)) : ''}`
        }
      })
      if (!(instanceData.dateTo !== position.dateTo && dateService.shiftDate(position.dateTo) <= entryDate)) {
        storePosition.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: position.ID,
            dateTo: entryDate,
            changeOrderID: changeOrderID
          }
        })
      }
      storeNumber.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: execParams.ID,
          dateTo: entryDate,
          changeOrderID: changeOrderID
        }
      })
    } else {
      if (mParams.formData.dism.dateTo === null) {
        if (!(instanceData.dateTo !== position.dateTo && dateService.shiftDate(position.dateTo) <= entryDate)) {
          storePosition.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: position.ID,
              dateTo: dateService.maxDate(),
              changeOrderID: null
            }
          })
        }
        storeNumber.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: execParams.ID,
            dateTo: dateService.maxDate(),
            changeOrderID: null
          }
        })
      } else {
        let orderParams = { ID: changeOrderID }
        if (mParams.formData.dism.dateTo) {
          orderParams.entryDate = dateService.shiftDate(mParams.formData.dism.dateTo)
          storePosition.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: position.ID,
              dateTo: dateService.shiftDate(mParams.formData.dism.dateTo)
            }
          })
          storeNumber.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: execParams.ID,
              dateTo: dateService.shiftDate(mParams.formData.dism.dateTo)
            }
          })
        }
        if (mParams.formData.dism.dismissOrderNumber) {
          orderParams.orderNumber = mParams.formData.dism.dismissOrderNumber
        }
        if (mParams.formData.dism.dismissOrderDate) {
          orderParams.orderDate = dateService.shiftDate(mParams.formData.dism.dismissOrderDate)
        }
        if (mParams.formData.dism.reasonDismID) {
          orderParams.reasonDismID = mParams.formData.dism.reasonDismID
        }
        const order = UB.Repository('hr_order')
          .attrs(['orderClass.entityName'])
          .selectById(changeOrderID)
        if (order && order['orderClass.entityName'] === 'hr_orderPay') {
          orderStore.run('update', {
            __skipOptimisticLock: true,
            execParams: orderParams
          })
        }
      }
    }
  }
  if (mParams.formData && Object.keys(mParams.formData.rank).length) {
    let entryDate = dateService.shiftDate(mParams.formData.rank.rankDateFrom || mParams.formData.entryDate)
    const storeRank = UB.DataStore('hr_publServRang')
    const rank = UB.Repository('hr_publServRang')
      .attrs(['ID', 'dictRankID', 'dictRankID.name', 'dateFrom', 'orderNumber', 'orderDate', 'orderID'])
      .orderByDesc('dateTo')
      .where('employeeID', '=', execParams.employeeID || instanceData.employeeID)
      .limit(1)
      .selectSingle() || {}
    let orderID = mParams.formData.newRankOrder ? orderStore.generateID() : null
    let orderDate = mParams.formData.rank.rankOrderDate || mParams.formData.orderDate || null
    if (mParams.formData.newRankOrder) {
      orderStore.run('insert', {
        execParams: {
          ID: orderID,
          employeeNumberID: execParams.ID,
          orderState: 'POSTED',
          empOrderType: 'RANK',
          orderNumber: mParams.formData.rank.rankOrderNumber || mParams.formData.orderNumber || null,
          orderDate: orderDate ? dateService.shiftDate(orderDate) : null,
          entryDate: entryDate,
          description: `${UB.i18n('Змінено ранг через особовий рахунок')} ${mParams.formData.rank.rankOrderNumber || mParams.formData.orderNumber || ''} ${orderDate ? dateService.formatDate(dateService.shiftDate(orderDate)) : ''}`
        }
      })
      if (rank && rank.ID) {
        storeRank.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID: rank.ID,
            dateTo: dateService.addDays(entryDate, -1)
          }
        })
      }
      if (!mParams.formData.rank.dictRankID && !rank.dictRankID) {
        throw new UB.UBAbort(`<<<${UB.i18n('Необхідно вказати ранг')}>>>`)
      }
      storeRank.run('insert', {
        __skipOptimisticLock: true,
        execParams: {
          employeeID: execParams.employeeID || instanceData.employeeID,
          dictRankID: mParams.formData.rank.dictRankID || rank.dictRankID,
          dateFrom: entryDate,
          dateTo: dateService.maxDate(),
          dateNext: dateService.addYears(entryDate, 3),
          orderID: orderID,
          orderNumber: mParams.formData.rank.rankOrderNumber || mParams.formData.orderNumber || null,
          orderDate: orderDate ? dateService.shiftDate(orderDate) : null
        }
      })
    } else {
      let rankParams = { ID: rank.ID }
      if (rank && rank.orderID && (mParams.formData.rank.rankOrderNumber || mParams.formData.rank.rankOrderDate !== undefined)) {
        let orderParams = { ID: rank.orderID }
        if (mParams.formData.rank.rankOrderNumber) {
          orderParams.orderNumber = mParams.formData.rank.rankOrderNumber
          rankParams.orderNumber = mParams.formData.rank.rankOrderNumber
        }
        if (mParams.formData.rank.rankOrderDate !== undefined) {
          orderParams.orderDate = mParams.formData.rank.rankOrderDate ? dateService.shiftDate(mParams.formData.rank.rankOrderDate) : null
          rankParams.orderDate = mParams.formData.rank.rankOrderDate ? dateService.shiftDate(mParams.formData.rank.rankOrderDate) : null
        }
        orderStore.run('update', {
          __skipOptimisticLock: true,
          execParams: orderParams
        })
      }

      if (mParams.formData.rank.rankDateFrom) {
        rankParams.dateFrom = dateService.shiftDate(mParams.formData.rank.rankDateFrom)
        rankParams.dateNext = dateService.addYears(rankParams.dateFrom, 3)
      }
      if (mParams.formData.rank.dictRankID) {
        rankParams.dictRankID = mParams.formData.rank.dictRankID
      }
      storeRank.run('update', {
        __skipOptimisticLock: true,
        execParams: rankParams
      })
    }
  }
}

function setDescriptionAttribute (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  let employee = UB.Repository('hr_employee')
    .attrs(['fullFIO'])
    .where('ID', '=', execParams.employeeID || instanceData.employeeID)
    .misc({ __mip_ondate: execParams.dateFrom || instanceData.dateFrom })
    .selectScalar() || ''
  if (!employee) {
    employee = UB.Repository('hr_employee')
      .attrs(['fullFIO'])
      .where('ID', '=', execParams.employeeID || instanceData.employeeID)
      .misc({ __mip_ondate: execParams.dateFrom || instanceData.dateFrom, __allowSelectSafeDeleted: true })
      .selectScalar() || ''
  }
  execParams.description = employee + ' [' + (execParams.tabNum || instanceData.tabNum || '') + ']'
}

function setTabNumAttribute (ctx) {
  const execParams = ctx.mParams.execParams
  const tabNumList = String(execParams.tabNum || '0').match(/\d+/g)
  execParams.tabNumSort = Array.isArray(tabNumList) ? Number(`${(tabNumList[0] || '0').substring(0, 12)}.${((tabNumList[1] || '0').padStart(6, '0')).substring(0, 6)}`) : 0
  execParams.tabNumMain = Array.isArray(tabNumList) ? Number((tabNumList[0] || '0').substring(0, 12)) : 0
  execParams.tabNumIndex = Array.isArray(tabNumList) ? Number((tabNumList[1] || '0').substring(0, 6)) : 0
}

me.checkParams = ctx => {
  const mParams = ctx.mParams
  const params = mParams.params
  const errorMessages = []
  if (params.taxCode && !params.employeeID) {
    const employee = UB.Repository('hr_employee')
      .attrs(['fullFIO'])
      .where('taxCode', '=', params.taxCode)
      .selectScalar()
    if (employee) {
      errorMessages.push(UB.i18n(`Вже існує працівник {0} з РНОКПП {1}`, employee, params.taxCode))
    }
  }

  mParams.errorMessages = JSON.stringify(errorMessages)
}

me.nextTabNum = function (orgID, orderItemID) {
  const store = UB.DataStore(__entityName)
  store.runSQL(App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
    ? `select max(cast(floor(coalesce(try_convert(FLOAT, tabNum), 0)) as bigint)) as "tabNum" 
                     from hr_employeeNumber 
                     where orgID = :orgID: and isnumeric(tabNum) = 1 
                     and mi_deleteDate >= '9999-12-31'`
    : `select max(cast(floor(case when tabNum ~ '^([0-9]+\\.?[0-9]*|\\.[0-9]+)$' then tabNum::float else 0 end) as bigint)) as "tabNum" 
                     from hr_employeeNumber 
                     where orgID = :orgID:
                     and mi_deleteDate >= '9999-12-31'`,
  { orgID })
  let data = store.getAsJsObject()[0]
  let tabNum = data && data.tabNum ? data.tabNum : 0
  if (orderItemID) {
    store.runSQL(App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
      ? `select max(cast(floor(coalesce(try_convert(FLOAT, tabNum), 0)) as bigint)) as "tabNum" 
                    from hr_empOrderAppointDet 
                    where ID <> :ID: and organizationID = :orgID:
                    and isnumeric(tabNum) = 1 and mi_deleteDate >= '9999-12-31'`
      : `select max(cast(floor(case when tabNum ~ '^([0-9]+\\.?[0-9]*|\\.[0-9]+)$' then tabNum::float else 0 end) as bigint)) as "tabNum" 
                    from hr_empOrderAppointDet 
                    where ID <> :ID: and organizationID = :orgID:
                    and mi_deleteDate >= '9999-12-31'`,
    {
      ID: orderItemID,
      orgID
    })
    data = store.getAsJsObject()[0]
    if (data && data.tabNum && data.tabNum > tabNum) {
      tabNum = data.tabNum
    }
    store.runSQL(App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012'
      ? `select max(cast(floor(coalesce(try_convert(FLOAT, tabNum), 0)) as bigint)) as "tabNum" 
                    from hr_empOrderPluralistDet 
                    where ID <> :ID: and organizationID = :orgID:   
                    and isnumeric(tabNum) = 1 and mi_deleteDate >= '9999-12-31'`
      : `select max(cast(floor(case when tabNum ~ '^([0-9]+\\.?[0-9]*|\\.[0-9]+)$' then tabNum::float else 0 end) as bigint)) as "tabNum" 
                    from hr_empOrderPluralistDet 
                    where ID <> :ID: and organizationID = :orgID:   
                   and mi_deleteDate >= '9999-12-31'`,
    {
      ID: orderItemID,
      orgID
    })
    data = store.getAsJsObject()[0]
    if (data && data.tabNum && data.tabNum > tabNum) {
      tabNum = data.tabNum
    }
  }
  return tabNum
}

me.getNextTabNum = ctx => {
  const mParams = ctx.mParams
  const useSingleTabNum = settingsService.getByCode('hrUseSingleEmployeeTabNum', ctx.mParams.organizationID)
  if (useSingleTabNum) {
    const employeeID = ctx.mParams.employeeID
    let tabNum
    if (employeeID) {
      const empTabNum = UB.Repository(__entityName)
        .attrs('tabNum')
        .where('employeeID', '=', employeeID)
        .where('orgID', '=', ctx.mParams.organizationID)
        .orderBy('tabNumSort', 'desc')
        .limit(1)
        .selectScalar()
      const tabNumList = empTabNum ? [empTabNum] : []
      if (mParams.orderItemID) {
        const appointTabNum = UB.Repository('hr_empOrderAppointDet')
          .attrs('max([tabNum])')
          .where('employeeID', '=', employeeID)
          .where('organizationID', '=', ctx.mParams.organizationID)
          .where('ID', '<>', mParams.orderItemID)
          .selectScalar()
        if (appointTabNum) tabNumList.push(appointTabNum)
        const pluralTabNum = UB.Repository('hr_empOrderPluralistDet')
          .attrs('max([tabNum])')
          .where('employeeID', '=', employeeID)
          .where('organizationID', '=', ctx.mParams.organizationID)
          .where('ID', '<>', mParams.orderItemID)
          .selectScalar()
        if (pluralTabNum) tabNumList.push(pluralTabNum)
      }
      if (tabNumList.length) {
        const indexes = [0]
        const tabNums = []
        tabNumList.forEach(tn => {
          const parts = String(tn).split('.')
          if (parts.length > 1) {
            indexes.push(Number(String(parts[1] || '').replace(/[^\d]/g, '') || 0))
            tabNums.push(Number(String(parts[0] || '').replace(/[^\d]/g, '') || 0))
          } else {
            tabNums.push(Number(String(tn || '').replace(/[^\d]/g, '') || 0))
          }
        })
        const nextIndex = Math.max(...indexes) + 1
        const mainTabNum = tabNums.length ? Math.max(...tabNums) : me.nextTabNum(ctx.mParams.organizationID, mParams.orderItemID)
        mParams.tabNum = tabNum = `${mainTabNum}.${nextIndex}`
      }
    }
    if (!tabNum) {
      const tabNum = me.nextTabNum(ctx.mParams.organizationID, mParams.orderItemID)
      mParams.tabNum = String(tabNum + 1) + '.1'
    }
  } else {
    const tabNum = me.nextTabNum(ctx.mParams.organizationID, mParams.orderItemID)
    mParams.tabNum = tabNum + 1
  }
  return mParams.tabNum
}

me.restoreRecord = function (ctx) {
  const execParams = ctx.mParams.execParams
  const store = UB.DataStore(__entityName)
  const employeePosition = UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'dateFrom', 'dateTo', 'workPlace'])
    .where('employeeNumberID', '=', execParams.ID)
    .where('deletedByEmployee', '=', 1)
    .misc({
      __allowSelectSafeDeleted: true
    })
    .selectAsObject()
  const onDate = dateService.shiftDate(execParams.onDate)
  const empPosMain = employeePosition.find(o => o.workPlace === '1' && dateService.shiftDate(o.dateFrom) <= onDate && onDate <= dateService.shiftDate(o.dateTo))
  const empPosCur = UB.Repository('hr_employeePositionS')
    .attrs(['ID'])
    .where('employeeID', '=', execParams.employeeID)
    .where('workPlace', '=', '1')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .limit(1)
    .selectSingle()
  if (empPosMain && empPosCur) {
    throw new UB.UBAbort(`<<<${UB.i18n('Вже існує особовий рахунок працівника з "Місце роботи: Основне". Відновлення не можливе.')}>>>`)
  }

  const order = UB.Repository(__entityName)
    .attrs(['orderID.orderClass.entityName'])
    .where('ID', '=', execParams.ID)
    .misc({
      __allowSelectSafeDeleted: true
    })
    .limit(1)
    .selectSingle()
  if (order && order['orderID.orderClass.entityName'] === 'hr_empOrder') {
    throw new UB.UBAbort(`<<<${UB.i18n('Запис було видалено наказом відділу кадрів. Відновлення неможливе.')}>>>`)
  }
  store.execSQL(`update hr_employeeNumber set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL where ID = :ID:`, {
    ID: execParams.ID
  })
  if (!UB.Repository('hr_employeeNumState')
    .attrs(['ID'])
    .where('employeeNumberID', '=', execParams.ID)
    .limit(1)
    .selectSingle()) {
    const employeeNumStateStore = UB.DataStore('hr_employeeNumState')
    employeeNumStateStore.run('insert', { execParams: { employeeNumberID: execParams.ID } })
  }

  const empPosStore = UB.DataStore('hr_employeePosition')
  employeePosition.forEach(row => {
    empPosStore.execSQL(`update hr_employeePosition set mi_deleteDate = '9999-12-31', mi_deleteUser = NULL, deletedByEmployee = 0 where ID = :ID:`, {
      ID: row.ID
    })
  })
}

me.dataCorrection = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const action = execParams.action
  const employeeNumberIDs = execParams.employeeNumbers || []
  const params = execParams.params || {}
  if (execParams.dateFrom && !execParams.dateTo) execParams.dateTo = dateService.maxDate()
  const result = []
  if (!employeeNumberIDs.length) return
  const employeeNumbers = UB.Repository(__entityName)
    .attrs('ID', 'employeeID', 'description')
    .where('ID', 'in', employeeNumberIDs)
    .selectAsObject()
  switch (action) {
    case 'updateEmployeePosition':
      updateEmployeePosition(employeeNumbers, execParams, params, result)
      break
    case 'createEmployeePosition':
      createEmployeePosition(employeeNumbers, execParams, params, result)
      break
    case 'updateEmployeeAccrual':
      updateEmployeeAccrual(employeeNumbers, execParams, params, result)
      break
    case 'createEmployeeAccrual':
      createEmployeeAccrual(employeeNumbers, execParams, params, result)
      break
    case 'updatePayRetention':
      updatePayRetention(employeeNumbers, execParams, params, result)
      break
    case 'createPayRetention':
      createPayRetention(employeeNumbers, execParams, params, result)
      break
    case 'updatePayOutTemplate':
      updatePayOutTemplate(employeeNumbers, execParams, params, result)
  }
  mParams.result = JSON.stringify(result)
}

function updateEmployeePosition (employeeNumbers, execParams, params, result = []) {
  const storePosition = UB.DataStore('hr_employeePosition')
  employeeNumbers.forEach(row => {
    const empPosList = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', row.ID)
      .whereIf(execParams.dateFrom, 'dateTo', '>=', dateService.shiftDate(execParams.dateFrom))
      .whereIf(execParams.dateTo, 'dateFrom', '<=', dateService.shiftDate(execParams.dateTo))
      .selectAsObject()

    let minDateFrom
    let maxDateTo

    try {
      empPosList.forEach(item => {
        params.ID = item.ID
        storePosition.run('update', {
          isImport: true,
          __skipOptimisticLock: true,
          execParams: params
        })
        if (!minDateFrom || minDateFrom > item.dateFrom) {
          minDateFrom = item.dateFrom
        }
        if (!maxDateTo || maxDateTo < item.dateTo) {
          maxDateTo = item.dateTo
        }
      })
      if (minDateFrom && maxDateTo && (params.workScheduleID !== undefined || params.mtCount !== undefined)) {
        accrualService.setRecalculatePeriod({
          orgID: execParams.orgID,
          employeeNumberID: row.ID,
          dateFrom: minDateFrom,
          entityName: __entityName,
          initiatorID: execParams.ID,
          description: `${UB.i18n('Особовий рахунок')} ${dateService.formatDate(dateService.shiftDate(minDateFrom))}`
        })
        setTimeSheet(row.ID, execParams.orgID, minDateFrom, maxDateTo)
      }
      App.dbCommit()
    } catch (e) {
      result.push({
        ID: row.ID,
        description: row.description,
        message: e.message
      })
      App.dbRollback()
    }
  })
  employeeNumbers.forEach(row => {
    calcService.addCalcTimeSheetQueue({ employeeNumberID: row.ID, entityName: 'hr_employeeNumber' })
  })
}

function setTimeSheet (employeeNumberID, organizationID, dateFrom, dateTo) {
  const currentPeriod = periodService.getCurrentPeriod(organizationID)
  const periods = periodService.getPeriodsByDate(organizationID,
    dateService.shiftDate(Math.max(dateService.shiftDate(dateFrom), dateService.addMonths(currentPeriod.dateFrom, -3))),
    dateService.shiftDate(Math.min(dateService.shiftDate(dateTo), currentPeriod.dateTo)))

  periods.forEach(period => {
    timeSheetService.fillTimeSheet({
      organizationID,
      periodID: period.ID,
      employeeNumbers: [employeeNumberID],
      checkPeriod: false,
      isImport: true
    })
  })
}

function createEmployeePosition (employeeNumbers, execParams, params, result = []) {
  const storePosition = UB.DataStore('hr_employeePosition')
  employeeNumbers.forEach(row => {
    const empPos = UB.Repository('hr_employeePositionS')
      .attrs('ID', 'dateFrom', 'dateTo')
      .where('employeeNumberID', '=', row.ID)
      .where('dateFrom', '<=', dateService.shiftDate(execParams.dateFrom))
      .where('dateTo', '>=', dateService.shiftDate(execParams.dateFrom))
      .limit(1)
      .selectSingle()
    const orderID = createOrder(row.ID, execParams, empPos ? 'MOVE' : 'APPOINT')
    if (empPos) {
      const nextPosition = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'dateFrom', 'dateTo'])
        .where('employeeNumberID', '=', row.ID)
        .where('dateFrom', '>=', dateService.shiftDate(execParams.dateFrom))
        .orderBy('dateTo', 'DESC')
        .limit(1)
        .selectSingle()
      if (!dateService.isMaxDate(execParams.dateTo) && dateService.shiftDate(empPos.dateTo) >= dateService.shiftDate(execParams.dateTo)) {
        result.push({
          ID: row.ID,
          description: row.description,
          message: UB.i18n('Попереднє призначення має більш ранню дату закінчення дії')
        })
      } else if (nextPosition && dateService.shiftDate(nextPosition.dateTo) <= dateService.shiftDate(execParams.dateTo)) {
        result.push({
          ID: row.ID,
          description: row.description,
          message: UB.i18n('Наступне призначення має більш ранню дату закінчення дії')
        })
      } else {
        try {
          // закриваємо призначення на дату початку нового
          storePosition.run('update', {
            __skipOptimisticLock: true,
            execParams: {
              ID: empPos.ID,
              dateTo: dateService.addDays(dateService.shiftDate(execParams.dateFrom), -1),
              changeOrderID: orderID
            }
          })
          // оновлюємо наступне призначення
          if (nextPosition) {
            storePosition.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPosition.ID,
                dateFrom: dateService.addDays(dateService.shiftDate(execParams.dateTo), 1),
                changeOrderID: orderID
              }
            })
          }
          const pos = UB.Repository('hr_employeePosition')
            .attrs('*')
            .where('employeeNumberID', '=', row.ID)
            .selectById(empPos.ID)
          for (let attr in params) {
            if (params.hasOwnProperty(attr)) {
              pos[attr] = params[attr]
            }
          }
          delete pos.changeOrderID
          pos.orderID = orderID
          pos.dateFrom = dateService.shiftDate(execParams.dateFrom)
          pos.dateTo = dateService.shiftDate(execParams.dateTo)
          pos.dateToEmpty = pos.dateTo
          for (const attr in pos) {
            // eslint-disable-next-line no-prototype-builtins
            if (pos.hasOwnProperty(attr)) {
              if (attr.startsWith('mi_')) {
                delete pos[attr]
              }
            }
          }
          pos.ID = storePosition.generateID()
          storePosition.run('insert', {
            execParams: pos
          })
          App.dbCommit()
        } catch (e) {
          result.push({
            ID: row.ID,
            description: row.description,
            message: e.message
          })
          App.dbRollback()
        }
      }
    } else {
      const nextPosition = UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'dateFrom', 'dateTo'])
        .where('employeeNumberID', '=', row.ID)
        .where('dateFrom', '>=', dateService.shiftDate(execParams.dateFrom))
        .orderBy('dateTo', 'DESC')
        .limit(1)
        .selectSingle()
      try {
        if (nextPosition) {
          if (dateService.shiftDate(nextPosition.dateTo) <= dateService.shiftDate(execParams.dateTo)) {
            result.push({
              ID: row.ID,
              description: row.description,
              message: UB.i18n('Наступне призначення має більш ранню дату закінчення дії')
            })
          } else {
            storePosition.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: nextPosition.ID,
                dateFrom: dateService.addDays(dateService.shiftDate(execParams.dateTo), 1),
                changeOrderID: orderID
              }
            })
          }
        }
        storePosition.run('insert', {
          execParams: Object.assign({
            ID: storePosition.generateID(),
            employeeID: row.employeeID,
            employeeNumberID: row.ID,
            organizationID: execParams.orgID,
            dateFrom: dateService.shiftDate(execParams.dateFrom),
            dateTo: dateService.shiftDate(execParams.dateTo),
            orderID: orderID,
            isActive: 1
          }, params)
        })
        App.dbCommit()
      } catch (e) {
        result.push({
          ID: row.ID,
          description: row.description,
          message: e.message
        })
        App.dbRollback()
      }
    }
    // оновлюємо наступні призначення згідно вибраних параметрів
    if (!result.length) {
      const empPosList = UB.Repository('hr_employeePositionS')
        .attrs('ID')
        .where('employeeNumberID', '=', row.ID)
        .where('dateFrom', '>=', dateService.shiftDate(execParams.dateTo))
        .selectAsObject()
      empPosList.forEach(item => {
        params.ID = item.ID
        try {
          storePosition.run('update', {
            __skipOptimisticLock: true,
            execParams: params
          })
          App.dbCommit()
        } catch (e) {
          result.push({
            ID: row.ID,
            description: row.description,
            message: e.message
          })
          App.dbRollback()
        }
      })
    }
  })
}

function updateEmployeeAccrual (employeeNumbers, execParams, params, result = []) {
  const store = UB.DataStore('hr_employeeAccrual')
  const empAccruals = UB.Repository('hr_employeeAccrual')
    .attrs('ID', 'employeeNumberID', 'employeeNumberID.description')
    .where('employeeNumberID', 'in', employeeNumbers.map(o => o.ID))
    .whereIf(execParams.dateFrom, 'dateTo', '>=', dateService.shiftDate(execParams.dateFrom))
    .whereIf(execParams.dateTo, 'dateFrom', '<=', dateService.shiftDate(execParams.dateTo))
    .whereIf(params.payElID, 'payElID', '=', params.payElID)
    .selectAsObject()
  empAccruals.forEach(accr => {
    params.ID = accr.ID
    try {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: params
      })
    } catch (e) {
      result.push({
        ID: accr['employeeNumberID'],
        description: accr['employeeNumberID.description'],
        message: e.message
      })
    }
  })
}

function createEmployeeAccrual (employeeNumbers, execParams, params, result = []) {
  const store = UB.DataStore('hr_employeeAccrual')
  employeeNumbers.forEach(row => {
    try {
      store.run('insert', {
        execParams: Object.assign({
          ID: store.generateID(),
          employeeNumberID: row.ID,
          employeeID: row.employeeID,
          dateFrom: dateService.shiftDate(execParams.dateFrom),
          dateTo: dateService.shiftDate(execParams.dateTo),
          orderNumber: execParams.orderNumber,
          orderDate: execParams.orderDate
        }, params)
      })
    } catch (e) {
      result.push({
        ID: row.ID,
        description: row.description,
        message: e.message
      })
    }
  })
}

function updatePayRetention (employeeNumbers, execParams, params, result = []) {
  const store = UB.DataStore('hr_payRetention')
  const empAccruals = UB.Repository('hr_payRetention')
    .attrs('ID', 'employeeNumberID', 'employeeNumberID.description')
    .where('employeeNumberID', 'in', employeeNumbers.map(o => o.ID))
    .whereIf(execParams.dateFrom, 'dateTo', '>=', dateService.shiftDate(execParams.dateFrom))
    .whereIf(execParams.dateTo, 'dateFrom', '<=', dateService.shiftDate(execParams.dateTo))
    .whereIf(params.payElID, 'payElID', '=', params.payElID)
    .selectAsObject()
  empAccruals.forEach(accr => {
    params.ID = accr.ID
    try {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: params
      })
    } catch (e) {
      result.push({
        ID: accr['employeeNumberID'],
        description: accr['employeeNumberID.description'],
        message: e.message
      })
    }
  })
}

function createPayRetention (employeeNumbers, execParams, params, result = []) {
  const store = UB.DataStore('hr_payRetention')
  employeeNumbers.forEach(row => {
    try {
      store.run('insert', {
        execParams: Object.assign({
          ID: store.generateID(),
          employeeNumberID: row.ID,
          dateFrom: dateService.shiftDate(execParams.dateFrom),
          dateTo: dateService.shiftDate(execParams.dateTo)
        }, params)
      })
    } catch (e) {
      result.push({
        ID: row.ID,
        description: row.description,
        message: e.message
      })
    }
  })
}

function updatePayOutTemplate (employeeNumbers, execParams, params, result = []) {
  const store = UB.DataStore('hr_employeeNumber')
  const empNumbers = UB.Repository('hr_employeeNumber')
    .attrs('ID', 'description')
    .where('ID', 'in', employeeNumbers.map(o => o.ID))
    .selectAsObject()
  empNumbers.forEach(accr => {
    params.ID = accr.ID
    try {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: params
      })
    } catch (e) {
      result.push({
        ID: accr['ID'],
        description: accr['description'],
        message: e.message
      })
    }
  })
}

function createOrder (employeeNumberID, execParams, empOrderType = 'MOVE') {
  const orderStore = UB.DataStore('hr_orderPay')
  const orderID = orderStore.generateID()

  const description = `${empOrderType === 'APPOINT' ? UB.i18n('Прийнято на роботу через особовий рахунок')
    : empOrderType === 'DISM' ? UB.i18n('Звільнено через особовий рахунок')
      : empOrderType === 'MOVE' ? UB.i18n('Додано призначення через особовий рахунок') : ''
  } ${execParams.orderNumber || ''} ${dateService.formatDate(dateService.shiftDate(execParams.orderDate))}`

  orderStore.run('insert', {
    execParams: {
      ID: orderID,
      employeeNumberID: employeeNumberID,
      orderState: 'POSTED',
      empOrderType: empOrderType,
      orderNumber: execParams.orderNumber || null,
      orderDate: dateService.shiftDate(execParams.orderDate),
      entryDate: dateService.shiftDate(execParams.dateFrom) || dateService.shiftDate(execParams.orderDate),
      description
    }
  })
  App.dbCommit()
  return orderID
}

function setDimensionInPosition (value, dimEntity, params, position) {
  const dimID = UB.Repository('gl_dimension').attrs(['ID']).where('entityName', '=', dimEntity).selectScalar()
  if (dimID) {
    let dimKey
    let epsKey
    for (let i = 0; i < 10; i++) {
      if (position[`d${i}`] === dimID) {
        dimKey = `d${i}`
      }
      if (!epsKey && !position[`d${i}`]) {
        epsKey = `d${i}`
      }
    }
    if (!dimKey) {
      dimKey = epsKey
    }
    params[dimKey] = dimID
    params[`${dimKey}Value`] = value
  }
}

me.checkDateWork = function (ctx) {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  const emp = UB.Repository(__entityName)
    .attrs(['dateFrom', 'dateTo', 'parentEmpNumberID'])
    .selectById(mParams.employeeNumberID)
  mParams.isValid = true
  if (!emp) return

  let employeeNumberDateFrom = dateService.shiftDate(emp.dateFrom)
  if (emp['parentEmpNumberID']) {
    const parentEmpNumbers = []
    employeeService.getParentEmpNumberIDs(mParams.employeeNumberID, parentEmpNumbers)
    parentEmpNumbers.forEach(emp => {
      if (employeeNumberDateFrom > emp.dateFrom) employeeNumberDateFrom = emp.dateFrom
    })
  }
  const employeeNumberDateTo = dateService.shiftDate(emp.dateTo)
  if (employeeNumberDateFrom > onDate || onDate > employeeNumberDateTo) {
    mParams.isValid = false
  }
}

me.updateAddPersonDescription = function (ctx) {
  const mParams = ctx.mParams
  if (mParams.employeeNumberID) {
    employeeService.updateEmployeeAddPersonDescription(mParams.employeeNumberID)
  }
}

me.getParentEmpNumbers = function (ctx) {
  const mParams = ctx.mParams
  const emp = UB.Repository(__entityName)
    .attrs(['parentEmpNumberID'])
    .selectById(mParams.employeeNumberID)
  const parentEmpNumbers = []
  if (emp && emp['parentEmpNumberID']) {
    employeeService.getParentEmpNumberIDs(mParams.employeeNumberID, parentEmpNumbers)
  }
  mParams.parentEmpNumbers = JSON.stringify(parentEmpNumbers)
}

me.getSubordinates = function (ctx) {
  const mParams = ctx.mParams
  const result = employeeService.getSubordinates(mParams.employeeNumberID, dateService.shiftDate(mParams.onDate))
  mParams.resultData = JSON.stringify(result)
}
