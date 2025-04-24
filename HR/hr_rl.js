const UB = require('@unitybase/ub')
const Session = UB.Session
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const employeeService = require('../HR/modules/employeeService')
const rlService = require('../HR/modules/rlService')
const accrualService = require('../HR/modules/accrualService')
const payElService = require('../HR/modules/payElService')
const dateService = require('../AC/modules/dataServices/dateService')
const periodService = require('../HR/modules/periodService')
const algorithmService = require('../HR/modules/algorithmService')
const calendarService = require('../HR/modules/calendarService')
const calcService = require('../HR/modules/calcService')
const glCore = require('../GL/modules/glCore')
const settingsService = require('../AC/modules/entityServices/settingsService')
const UBMail = require('@unitybase/mailer')
const staffService = require('../HR/modules/staffService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const UBServerReport = require('@unitybase/ubs/modules/UBServerReport')
const mailQueue = require('@unitybase/ubq/modules/mail-queue')
const App = UB.App
me.entity.addMethod('sendReportOnEmail')
me.entity.addMethod('getRL')
me.entity.addMethod('view')
me.entity.addMethod('calcAccrual')
me.entity.addMethod('saveAccrual')
me.entity.addMethod('saveOrderAccrual')
me.entity.addMethod('deleteAccrual')
me.entity.addMethod('viewPrintForm')
me.entity.addMethod('getWorkTime')
me.entity.addMethod('getDimension')
me.entity.addMethod('getExperience')
me.entity.addMethod('getCalcAccrual')
me.entity.addMethod('getReversalAccrual')
me.entity.addMethod('getBalance')
me.entity.addMethod('selectEmployeeMailList')
me.entity.addMethod('getParamsOnServer')

me.view = () => {}

me.getRL = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.periodID || !mParams.orgID || !mParams.employeeNumberID) {
    return
  }
  mParams.employeeData = employeeService.getEmployeeDataOnPeriod(mParams)
  const period = periodService.getPeriod(mParams.periodID)
  if (!mParams.isPrintForm) {
    let recalculatePeiodID = mParams.recalculatePeiodID || null
    if (!recalculatePeiodID && periodService.getPeriod(period.priorPeriodID).isCurrent && !mParams.changeRecalculatePeriod) {
      recalculatePeiodID = accrualService.getRecalculatePeriod(mParams.employeeNumberID, mParams.periodID)
    }
    if (period.isCurrent || (!period.isClosed && recalculatePeiodID && periodService.getPeriod(period.priorPeriodID).isCurrent && recalculatePeiodID === period.ID)) {
      const payCalcID = rlService.startPayCalc(mParams.orgID, 1, 0, UB.i18n(`Розрахунковий лист {0}`, period.name))
      if (mParams.changeRecalculatePeriod) {
        accrualService.setRecalculatePeriod({ orgID: mParams.orgID,
          employeeNumberID: mParams.employeeNumberID,
          periodCalcID: mParams.periodID,
          periodSalaryID: recalculatePeiodID,
          autoSetRecalcDate: false,
          alwaysChangePeriod: true,
          nextPeriod: (!period.isClosed && periodService.getPeriod(period.priorPeriodID).isCurrent) })
      }
      const isCurrent = period.isCurrent
      period.isCurrent = 1
      mParams.periodName = period.name
      mParams.periodDescription = period.description
      rlService.autoCalculate({
        cont: { periodCalc: period },
        orgID: mParams.orgID,
        periodID: mParams.periodID,
        payCalcID,
        employeeNumbers: [mParams.employeeNumberID],
        returnCalcData: true,
        calculateProperty: { calcType: 1 << 5 }
      })
      rlService.stopPayCalc(payCalcID)
      if (isCurrent && recalculatePeiodID && mParams.changeRecalculatePeriod) {
        calcService.addCalcQueue({ employeeNumbers: [mParams.employeeNumberID], calcBalance: 1, description: UB.i18n(`Розрахунковий лист {0}`, period.name) })
      }
    } else if (!period.isCurrent && !period.isClosed && (!recalculatePeiodID || recalculatePeiodID !== period.ID) && periodService.getPeriod(period.priorPeriodID).isCurrent &&
      mParams.changeRecalculatePeriod) {
      accrualService.setRecalculatePeriod({ orgID: mParams.orgID, employeeNumberID: mParams.employeeNumberID, periodCalcID: mParams.periodID, periodSalaryID: null, autoSetRecalcDate: false, nextPeriod: true })
      accrualService.removeAutoCalcAccrual({ orgID: mParams.orgID, employeeNumberID: mParams.employeeNumberID, periodID: period.ID })
    }
  }

  const dictFundSourceIDs = mParams.dictFundSourceIDs ? JSON.parse(mParams.dictFundSourceIDs) : null
  const dictProgClassIDs = mParams.dictProgClassIDs ? JSON.parse(mParams.dictProgClassIDs) : null
  const dictProjectIDs = mParams.dictProjectIDs ? JSON.parse(mParams.dictProjectIDs) : null
  const resultData = accrualService.getAccrualForRl({ period, employeeNumberID: mParams.employeeNumberID, noEmployeePart: mParams.noEmployeePart, dictFundSourceIDs, dictProgClassIDs, dictProjectIDs, includeSecEmp: mParams.includeSecEmp })
  mParams.balance = accrualService.getAccrualBalance(mParams.employeeNumberID, period.priorPeriodID, null, dictFundSourceIDs, null, dictProgClassIDs, null, dictProjectIDs)
  if (mParams.includeSecEmp && resultData.secondaryJobsNumbers.length) {
    resultData.secondaryJobsNumbers.forEach(empNum => {
      mParams.balance += accrualService.getAccrualBalance(empNum.employeeNumberID, period.priorPeriodID, null, dictFundSourceIDs, null, dictProgClassIDs, null, dictProjectIDs)
    })
  }
  mParams.resultData = JSON.stringify(resultData)
  if (mParams.detailBalance) {
    const dictFundSourceFSSU = UB.Repository('ac_fundSource').attrs(['ID']).where('dictFundTypeID.code', '=', '02').selectAsObject().map(o => o.ID)
    mParams.balanceIn = accrualService.getAccrualBalance(mParams.employeeNumberID, period.priorPeriodID, dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
    mParams.balanceInFssu = dictFundSourceFSSU.length ? accrualService.getAccrualBalanceByFund(mParams.employeeNumberID, period.priorPeriodID, dictFundSourceFSSU) : 0
    mParams.balanceOut = accrualService.getAccrualBalance(mParams.employeeNumberID, period.ID, dictFundSourceFSSU.length ? dictFundSourceFSSU : [0])
    mParams.balanceOutFssu = dictFundSourceFSSU.length ? accrualService.getAccrualBalanceByFund(mParams.employeeNumberID, period.ID, dictFundSourceFSSU) : 0
  }
  if (mParams.detailFundSourceBalance) {
    mParams.fundSourceBalance = JSON.stringify(UB.Repository('hr_accrualBalance')
      .attrs(['dictFundSourceID.name', 'sumFrom', 'sumTo'])
      .where('employeeNumberID', '=', mParams.employeeNumberID)
      .where('periodCalcID', '=', period.ID)
      .selectAsObject({
        'dictFundSourceID.name': 'name'
      }))
  }
  mParams.currentPeriod = periodService.getCurrentPeriod(mParams.orgID)
  mParams.recalcPeiodID = accrualService.getRecalculatePeriod(mParams.employeeNumberID, mParams.periodID)
}

me.calcAccrual = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  params.dateFrom = dateService.shiftDate(params.dateFrom)
  params.dateTo = dateService.shiftDate(params.dateTo)
  const orgID = UB.Repository('hr_employeeNumberS').attrs(['orgID']).selectById(params.employeeNumberID).orgID
  mParams.resultData = JSON.stringify(rlService.calculateAccrual({ orgID, payElParams: [params], periodCalcID: params.periodCalcID, periodSalaryID: params.periodSalaryID })[0])
}

me.saveAccrual = function (ctx) {
  const timService = require('../HR/modules/timService')
  const params = JSON.parse(ctx.mParams.params)
  const payEl = payElService.getPayEl({})
  params.periodSalary = dateService.shiftDate(params.periodSalary)
  params.periodCalc = dateService.shiftDate(params.periodCalc)
  if (params.dateFrom) {
    params.dateFrom = dateService.shiftDate(params.dateFrom)
  }
  if (params.dateTo) {
    params.dateTo = dateService.shiftDate(params.dateTo)
  }
  if (params.dateFromAvg) {
    params.dateFromAvg = dateService.shiftDate(params.dateFromAvg)
  }
  if (params.dateToAvg) {
    params.dateToAvg = dateService.shiftDate(params.dateToAvg)
  }
  const period = periodService.getPeriod(params.periodCalcID)
  if (!period.isCurrent && payEl[params.payElID].method.code !== '151' && !payEl[params.payElID].ignoreInCalcPay) {
    throw new UB.UBAbort(`<<<${UB.i18n('Зміни можливі тільки в поточному періоді')}>>>`)
  } else {
    const group = payEl[params.payElID].method.groupCode
    const method = payEl[params.payElID].method.code
    if (isTimeSheet(group, method)) {
      if (!params.orderID) {
        const orderStore = UB.DataStore('hr_orderPay')
        params.orderID = orderStore.generateID()
        orderStore.run('insert', {
          execParams: {
            ID: params.orderID,
            employeeNumberID: params.employeeNumberID,
            orderState: 'POSTED',
            empOrderType: getOrderType(method),
            entryDate: dateService.currentDate(),
            description: UB.i18n('Розрахунковий лист')
          }
        })
      } else {
        //  timService.cancelTimeSheetByOrder([params.orderID, params.empOrderID || 0, params.timeSheetID || 0], params.orderID, currentPeriod, params.dateFrom, null, [params.employeeNumberID], true)
        // timService.cancelTimeSheet([params.orderID, params.empOrderID || 0, params.timeSheetID || 0])
      }
      if (payEl[params.payElID].dictTimeCostID && !(params.flagsRec & 1 << 10) && !(params.flagsRec & 1 << 12) && !(params.flagsRec & 1 << 9)) {
        const timeSheetParams = []
        let date = params.dateFrom
        const dateTo = params.dateTo
        while (date <= dateTo) {
          if (!params.mask || (params.mask & 1 << (date.getDate() - 1))) {
            timeSheetParams.push({
              orderID: params.orderID,
              entityName: 'hr_orderPay',
              employeeNumberID: params.employeeNumberID,
              periodID: params.periodCalcID,
              dateWork: date,
              factTimeCostID: payEl[params.payElID].dictTimeCostID,
              factHour: 0
            })
          }
          date = dateService.nextDay(date)
        }
        timService.setTimeSheet(timeSheetParams)
      }
    }
    params.createUserID = Session.uData.userID
    if (ctx.mParams.reversalAccrual) {
      const reversalAccrual = JSON.parse(ctx.mParams.reversalAccrual)
      if (params.payElID === reversalAccrual.payElID && params.periodSalaryID === reversalAccrual.periodSalaryID) {
        params.linkToParentID = reversalAccrual.linkToParentID
      }
      accrualService.saveAccrual({ accrual: params })
      reversalAccrual.periodSalary = dateService.shiftDate(reversalAccrual.periodSalary)
      reversalAccrual.periodCalc = dateService.shiftDate(reversalAccrual.periodCalc)
      if (reversalAccrual.dateFrom) {
        reversalAccrual.dateFrom = dateService.shiftDate(reversalAccrual.dateFrom)
      }
      if (reversalAccrual.dateTo) {
        reversalAccrual.dateTo = dateService.shiftDate(reversalAccrual.dateTo)
      }
      if (reversalAccrual.dateFromAvg) {
        reversalAccrual.dateFromAvg = dateService.shiftDate(reversalAccrual.dateFromAvg)
      }
      if (reversalAccrual.dateToAvg) {
        reversalAccrual.dateToAvg = dateService.shiftDate(reversalAccrual.dateToAvg)
      }
      reversalAccrual.createUserID = Session.uData.userID
      accrualService.saveAccrual({ accrual: reversalAccrual })
      if (ctx.mParams.addReversal) {
        const cont = { payEl: payElService.getPayEl({ orgID: params.orgID }) }
        const addReversal = JSON.parse(ctx.mParams.addReversal)
        addReversal.forEach(accrual => {
          const result = getReversal(accrual.orgID, accrual.employeeNumberID, accrual.ID)
          const reversalValues = result.reversalValues
          const createAccrual = result.defaultValues
          reversalValues.createUserID = Session.uData.userID
          createAccrual.createUserID = Session.uData.userID
          createAccrual.linkToParentID = reversalValues.linkToParentID
          createAccrual.flagsRec = 4 | 1 << 5
          accrualService.saveAccrual({ accrual: reversalValues })

          createAccrual.baseSum = params.baseSum
          createAccrual.days = params.days
          createAccrual.hours = params.hours
          let paySumAccrual = accrualService.roundPayEl((createAccrual.baseSum / ((((!createAccrual.flagsRec || createAccrual.flagsRec & 1 << 5)) ? createAccrual.planHours : createAccrual.planDays) /
                        ((!createAccrual.flagsRec || createAccrual.flagsRec & 1 << 5) ? createAccrual.hours : createAccrual.days)) * (cont.payEl[createAccrual.payElID].isMtCount ? (createAccrual.mtCount || 1) : 1) *
                        ((createAccrual.rate !== null && createAccrual.rate >= 0) ? (createAccrual.rate / 100) : 1)) || 0, cont.payEl[createAccrual.payElID].roundUpTo)
          createAccrual.paySum = Number.isFinite(paySumAccrual) ? accrualService.roundPayEl(paySumAccrual, cont.payEl[params.payElID].roundUpTo) : 0

          createAccrual.accrualDt = algorithmService.correctAccrualDt(createAccrual.accrualDt || [], createAccrual.paySum)
          accrualService.saveAccrual({ accrual: createAccrual })
        })
      }
    } else {
      accrualService.saveAccrual({ accrual: params })
    }
    calcService.addCalcQueue({ employeeNumbers: [params.employeeNumberID], description: `Ручне збереження запису в розрахунковому листі` })
  }
}

me.saveOrderAccrual = function (ctx) {
  const mParams = ctx.mParams
  const accruals = JSON.parse(mParams.accruals)

  accruals.forEach(accrual => {
    if (!periodService.getPeriod(accrual.periodCalcID).isCurrent) {
      throw new UB.UBAbort(`<<<${UB.i18n('Зміни можливі тільки в поточному періоді')}>>>`)
    }
    accrualService.saveAccrual({ accrual })
  })
  if (accruals.length) {
    calcService.addCalcQueue({
      employeeNumbers: [accruals[0].employeeNumberID],
      description: `Ручне збереження запису в розрахунковому листі`
    })
  }
}

me.deleteAccrual = function (ctx) {
  const timService = require('../HR/modules/timService')
  const record = UB.Repository('hr_accrual')
    .attrs('payElID.methodID.code', 'payElID.methodID.methodGroupID.code', 'orderID', 'employeeNumberID', 'flagsRec',
      'orderID.orderClass.entityName', 'orgID')
    .selectById(ctx.mParams.ID)
  if (!record) {
    throw new UB.UBAbort(`<<<${UB.i18n('Розрахунковий лист було змінено. Оновіть і спробуйте видалити ще раз')}>>>`)
  }
  const group = record['payElID.methodID.methodGroupID.code']
  const method = record['payElID.methodID.code']
  if (isTimeSheet(group, method) && record.orderID && record['orderID.orderClass.entityName'] === 'hr_orderPay' &&
    !(record.flagsRec & 1 << 10) && !(record.flagsRec & 1 << 12) && !(record.flagsRec & 1 << 9)) {
    timService.cancelTimeSheet(record.orderID)
    if (UB.Repository('hr_orderPay').attrs('ID').selectById(record.orderID)) {
      const orderStore = UB.DataStore('hr_orderPay')
      orderStore.run('delete', {
        execParams: {
          ID: record.orderID
        }
      })
    }
  }
  if (record.flagsRec & 1 << 9 && record.orderID) {
    timService.restoreTimeSheetByChangeOrder(record.orderID, record.orgID)
  }
  accrualService.deleteAccrual(ctx.mParams.ID)
  calcService.addCalcQueue({ employeeNumbers: [record.employeeNumberID], description: `Ручне видалення запису в розрахунковому листі` })
}

me.viewPrintForm = function (ctx) {
  const mParams = ctx.mParams
  mParams.content = JSON.stringify({ instanceID: mParams.instanceID })
}

me.getDimension = function (ctx) {
  const coa = glCore.getCOA()
  const mParams = ctx.mParams
  const accrualDt = JSON.parse(mParams.params)
  const dictFundSource = []
  const dimValue = []
  const department = []
  const hrProgClassAcc = settingsService.getByCode('hrProgClassAcc', mParams.orgID)
  const hrProjectAcc = settingsService.getByCode('hrProjectAcc', mParams.orgID)
  const progClass = []
  const project = []
  accrualDt.forEach(row => {
    row.dtData = JSON.stringify(row)
    row.accountID = row.accountID ? coa.byId[row.accountID].code : ''
    if (row.dictFundSourceID) {
      dictFundSource.push(row.dictFundSourceID)
    }
    if (row.departmentID) {
      department.push(row.departmentID)
    }
    if (hrProgClassAcc && row.dictProgClassID) {
      progClass.push(row.dictProgClassID)
    }
    if (hrProjectAcc && row.dictProjectID) {
      project.push(row.dictProjectID)
    }
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        row[`d${i}`] = coa.dimsById[row[`d${i}`]].description
        if (row[`d${i}Value`]) {
          dimValue.push(row[`d${i}Value`])
        }
      }
    }
  })

  const fundSource = dictFundSource.length ? UB.Repository('ac_fundSource')
    .attrs(['ID', 'name'])
    .where('ID', 'in', dictFundSource)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  const dictFundSources = dictFundSource.length ? UB.Repository('ac_dictFundSource')
    .attrs(['ID', 'fundSourceID', 'name'])
    .where('organizationID', '=', mParams.orgID)
    .where('fundSourceID', 'in', dictFundSource)
    .selectAsObject() : []
  const dims = dimValue.length ? UB.Repository('gl_dimValue')
    .attrs(['ID', 'caption'])
    .where('ID', 'in', dimValue)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  const dep = department.length ? UB.Repository('org_department')
    .attrs(['ID', 'name'])
    .where('ID', 'in', department)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  const dictProgClass = progClass.length ? UB.Repository('ac_dictProgClass')
    .attrs(['ID', 'description'])
    .where('ID', 'in', progClass)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject({ description: 'name' }) : []
  const dictProject = project.length ? UB.Repository('ac_dictProject')
    .attrs(['ID', 'description'])
    .where('ID', 'in', project)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject({ description: 'name' }) : []
  accrualDt.forEach(row => {
    if (row.dictFundSourceID) {
      const dictFund = fundSource.find(o => o.ID === row.dictFundSourceID)
      const dictFundSource = dictFundSources.find(o => o.fundSourceID === row.dictFundSourceID)
      if (dictFundSource && !mParams.fundSourceName) {
        row.dictFundSourceID = `${(dictFund ? dictFund.name : '')} (${dictFundSource.name})`
      } else {
        row.dictFundSourceID = dictFund ? dictFund.name : ''
      }
    } else {
      row.dictFundSourceID = ''
    }
    if (row.departmentID) {
      const depProp = dep.find(o => o.ID === row.departmentID)
      row.departmentID = depProp ? depProp.name : ''
    } else {
      row.departmentID = ''
    }
    if (hrProgClassAcc && row.dictProgClassID) {
      const progClassProp = dictProgClass.find(o => o.ID === row.dictProgClassID)
      row.dictProgClassID = progClassProp ? progClassProp.name : ''
    }
    if (hrProjectAcc && row.dictProjectID) {
      const projectProp = dictProject.find(o => o.ID === row.dictProjectID)
      row.dictProjectID = projectProp ? projectProp.name : ''
    }
    for (let i = 0; i < 10; i++) {
      if (row[`d${i}`]) {
        if (row[`d${i}Value`]) {
          const dimV = dims.find(o => o.ID === row[`d${i}Value`])
          row[`d${i}Value`] = dimV ? dimV.caption : ''
        }
      }
    }
  })

  mParams.resultData = JSON.stringify(accrualDt)
}

me.getWorkTime = function (ctx) {
  const timService = require('../HR/modules/timService')
  const mParams = ctx.mParams
  const params = mParams.params
  const result = {}
  const cont = {}
  // Види оплат
  cont.payEl = payElService.getPayEl({})
  cont.emp = { [params.employeeNumberID]: {} }
  cont.employeeNumberID = params.employeeNumberID
  const period = periodService.getPeriod(params.periodSalaryID)
  const orgID = UB.Repository('hr_employeeNumber').attrs(['orgID']).where('ID', '=', params.employeeNumberID).selectScalar()
  cont.orgID = orgID
  cont.holidays = calendarService.getHolidays(dateService.shiftDate(params.dateFrom), dateService.shiftDate(params.dateTo), orgID)
  let isSummarized = false
  // Дані працівника (призначення, нарахування, табель)
  cont.emp[cont.employeeNumberID].prop = employeeService.getEmpData(params.employeeNumberID, period.dateFrom, period.dateTo)

  if (!cont.emp[cont.employeeNumberID].prop.employeeNumber) {
    return
  }
  const position = cont.emp[cont.employeeNumberID].prop.employeePositions.find(pos => pos.dateFrom <= dateService.shiftDate(params.dateFrom) &&
    pos.dateTo >= dateService.shiftDate(params.dateFrom))
  const workSchedule = (position && position.workScheduleID)
    ? UB.Repository('hr_workSchedule').attrs(['ID', 'isSummarized', 'payElID', 'isPayDayOff', 'isPayHoliday', 'isNightHours', 'isEveningHours']).selectById(position.workScheduleID)
    : null
  if (cont.payEl[params.payElID].method.groupCode === 1 && workSchedule && workSchedule.isSummarized && !cont.payEl[params.payElID].payOverNorm) {
    isSummarized = true
  }
  switch (params.attrName) {
    case 'days' : {
      if (params.days) {
        const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => o.dateWork >= period.dateFrom && o.dateWork <= period.dateTo)
        const byFact = ['12'].includes(cont.payEl[params.payElID].method.code)
        let payTime = getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: dateService.shiftDate(params.dateFrom), dateTo: dateService.shiftDate(params.dateTo), limit: { days: params.days }, byFact, isSummarized })
        if (['7', '8', '10', '11', '56', '153', '207'].includes(cont.payEl[params.payElID].method.code)) {
          Object.assign(payTime, algorithmService.getPayTimeByPayEl(cont, params.payElID, payTime.mask, cont.emp[cont.employeeNumberID].prop.timeSheets, dateService.shiftDate(params.dateFrom), dateService.shiftDate(params.dateTo), workSchedule))
        }
        if (!(params.flagsFix & 1 << 7) && payTime.days >= params.days) {
          result.hours = payTime.hours
          result.hoursByDays = JSON.stringify(payTime.hoursByDays)
        }
        result.mask = payTime.days >= params.days ? payTime.mask : 0
      }
      break
    }
    case 'hours' : {
      if (params.hours) {
        const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => dateService.shiftDate(o.dateWork) >= period.dateFrom && dateService.shiftDate(o.dateWork) <= period.dateTo)
        const byFact = ['12'].includes(cont.payEl[params.payElID].method.code)
        const payTime = getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: dateService.shiftDate(params.dateFrom), dateTo: dateService.shiftDate(params.dateTo), limit: { hours: params.hours }, byFact, isSummarized })
        if (['7', '8', '10', '11', '56', '153', '207'].includes(cont.payEl[params.payElID].method.code)) {
          Object.assign(payTime, algorithmService.getPayTimeByPayEl(cont, params.payElID, payTime.mask, cont.emp[cont.employeeNumberID].prop.timeSheets, dateService.shiftDate(params.dateFrom), dateService.shiftDate(params.dateTo), workSchedule))
        }
        if (!(params.flagsFix & 1 << 6) && payTime.hours >= params.hours) {
          result.days = payTime.days
        }
        result.mask = payTime.hours >= params.hours ? payTime.mask : 0
        result.hoursByDays = JSON.stringify(payTime.hoursByDays)
      }
      break
    }
    case 'planDays' : {
      if (params.planDays) {
        const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => dateService.shiftDate(o.dateWork) >= period.dateFrom && dateService.shiftDate(o.dateWork) <= period.dateTo)
        const payTime = getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: dateService.shiftDate(params.dateFrom), dateTo: dateService.shiftDate(params.dateTo), limit: { planDays: params.planDays }, isSummarized })
        if (!(params.flagsFix & 1 << 5)) {
          result.planHours = payTime.planHours
          result.planHoursByDays = JSON.stringify(payTime.planHoursByDays)
        }
      }
      break
    }
    case 'planHours' : {
      if (params.planHours) {
        const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => dateService.shiftDate(o.dateWork) >= period.dateFrom && dateService.shiftDate(o.dateWork) <= period.dateTo)
        const payTime = getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: dateService.shiftDate(params.dateFrom), dateTo: dateService.shiftDate(params.dateTo), limit: { planHours: params.planHours }, isSummarized })
        if (!(params.flagsFix & 1 << 4)) {
          result.planDays = payTime.planDays
        }
        result.planHoursByDays = JSON.stringify(payTime.planHoursByDays)
      }
      break
    }
    case 'dateFrom' :
    case 'dateTo' :
      if (params.dateFrom && params.dateTo) {
        const timeSheets = cont.emp[cont.employeeNumberID].prop.timeSheets.filter(o => dateService.shiftDate(o.dateWork) >= period.dateFrom && dateService.shiftDate(o.dateWork) <= period.dateTo)
        const payTime = getTimeByTimeSheet({ cont, payElID: params.payElID, timeSheets, dateFrom: dateService.shiftDate(params.dateFrom), dateTo: dateService.shiftDate(params.dateTo), isSummarized })
        if (['7', '8', '10', '11', '56', '153', '207'].includes(cont.payEl[params.payElID].method.code)) {
          Object.assign(payTime, algorithmService.getPayTimeByPayEl(cont, params.payElID, payTime.mask, cont.emp[cont.employeeNumberID].prop.timeSheets, dateService.shiftDate(params.dateFrom), dateService.shiftDate(params.dateTo), workSchedule))
        }
        const group = cont.payEl[params.payElID].method.groupCode
        const method = cont.payEl[params.payElID].method.code
        if (isTimeSheet(group, method)) {
          payTime.days = timService.getDaysByCondition(dateService.shiftDate(params.dateFrom), dateService.shiftDate(params.dateTo), cont.payEl[params.payElID].method.dayAccumCondition, orgID)
          payTime.mask = timService.getMaskByCondition(dateService.shiftDate(params.dateFrom), dateService.shiftDate(params.dateTo), cont.payEl[params.payElID].method.dayAccumCondition, orgID)
        }
        result.hours = payTime.hours
        result.days = payTime.days
        result.mask = payTime.mask
        result.planHours = payTime.planHours
        result.planDays = payTime.planDays
        result.hoursByDays = JSON.stringify(payTime.hoursByDays)
        result.planHoursByDays = JSON.stringify(payTime.planHoursByDays)
        if (params.flagsFix) {
          result.flagsFix = params.flagsFix & ~(1 << 4) & ~(1 << 5) & ~(1 << 6) & ~(1 << 7)
        }
      }
      break
  }

  mParams.resultData = result
}

function getTimeByTimeSheet ({ cont, payElID, timeSheets, dateFrom, dateTo, limit, byFact, isSummarized }) {
  const result = {
    days: 0,
    hours: 0,
    planDays: 0,
    planHours: 0,
    mask: 0,
    hoursByDays: {},
    planHoursByDays: {},
    leadingHoursByDays: {},
    fullTime: true,
    overtimePlan: 0,
    overtimeFact: 0
  }
  const planAttrName = (['PLAN'].includes(cont.payEl[payElID].useTimeSheetBy) ? 'plan' : 'norm')
  const payElTimeCost = []
  let addMask = 0
  const payElEntryTime = []
  cont.payEl[payElID].payElEntryTime.forEach(row => {
    if (row.dateFrom <= dateTo && row.dateTo >= dateFrom) {
      payElEntryTime.push(row.payElBaseID)
    }
  })

  if (payElEntryTime.length && ['4', '5', '6', '9', '33', '148', '154', '155'].includes(cont.payEl[payElID].method.code)) {
    cont.emp[cont.employeeNumberID].accrual = accrualService.getAccrual(cont.orgID, cont.employeeNumberID, dateService.addYears(dateFrom, -1))
    cont.emp[cont.employeeNumberID].accrual.forEach(acc => {
      if (acc.dateFrom <= dateTo && acc.dateTo >= dateFrom && payElEntryTime.includes(acc.payElID) &&
        !(acc.flagsRec & 1 << 10) && !(acc.flagsRec & 1 << 12) && !(acc.flagsRec & 1 << 9)) {
        let mask = acc.mask
        let maskAdd = acc.maskAdd || 0
        cont.emp[cont.employeeNumberID].accrual.forEach(rev => {
          if (rev.linkToParentID === acc.ID && rev.flagsRec & 1 << 9 && !(rev.flagsRec & 1 << 12)) {
            mask = mask & ~rev.mask
            maskAdd = maskAdd & ~rev.maskAdd
          }
        })
        addMask = addMask | (mask & ~maskAdd)
      }
    })
  }

  if (cont.payEl[payElID].payElTimeCost.length) {
    payElTimeCost.push(...cont.payEl[payElID].payElTimeCost)
  } else {
    cont.payEl[payElID].payElEntryTime.forEach(elEntry => {
      if (cont.payEl[elEntry.payElBaseID].payElTimeCost.length) {
        payElTimeCost.push(...cont.payEl[elEntry.payElBaseID].payElTimeCost)
      }
      if (cont.payEl[elEntry.payElBaseID].dictTimeCostID) {
        payElTimeCost.push({ dictTimeCostID: cont.payEl[elEntry.payElBaseID].dictTimeCostID, dateFrom: elEntry.dateFrom, dateTo: elEntry.dateTo })
      }
      if (cont.payEl[elEntry.payElBaseID].dictTimeCostWorkID) {
        payElTimeCost.push({ dictTimeCostID: cont.payEl[elEntry.payElBaseID].dictTimeCostWorkID, dateFrom: elEntry.dateFrom, dateTo: elEntry.dateTo })
      }
      if (cont.payEl[elEntry.payElBaseID].dictTimeCostAvgID) {
        payElTimeCost.push({ dictTimeCostID: cont.payEl[elEntry.payElBaseID].dictTimeCostAvgID, dateFrom: elEntry.dateFrom, dateTo: elEntry.dateTo })
      }
    })
  }
  if (!limit) {
    limit = {}
  }
  timeSheets.forEach(row => {
    if ((limit.planHours <= 0) ||
      (limit.planDays <= 0) ||
      (limit.days <= 0) ||
      (limit.hours <= 0)
    ) { return }
    let planHours = limit.planHours ? ((row[`${planAttrName}Hour`] > limit.planHours) ? limit.planHours : row[`${planAttrName}Hour`]) : row[`${planAttrName}Hour`]
    const factHour = (cont.payEl[payElID].method.code === '137' && !row.isFactHour) ? planHours : row.factHour
    result.planHours += planHours
    result.planHoursByDays[String(dateService.shiftDate(row.dateWork).getDate())] = planHours
    if (isSummarized && row.dateWork >= dateFrom && row.dateWork <= dateTo && (factHour > 0 || row.factTimeCostType === 'FREE')) {
      result.overtimePlan = result.overtimePlan + (row[`${planAttrName}Hour`] || 0)
      result.overtimeFact = result.overtimeFact + (factHour || 0)
    }
    result.planDays += planHours > 0 ? 1 : 0
    if (limit.planDays) {
      limit.planDays -= planHours > 0 ? 1 : 0
    }
    if (limit.planHours) {
      limit.planHours -= planHours
    }
    const timeCost = payElTimeCost.length ? payElTimeCost.find(o =>
      o.dictTimeCostID === row.factTimeCostID && o.dateFrom <= row.dateWork && o.dateTo >= row.dateWork) : true
    const isValid = !(byFact && factHour <= 0)
    if (timeCost && row.dateWork >= dateFrom && row.dateWork <= dateTo && isValid && (!addMask || (addMask & 1 << (row.dateWork.getDate() - 1)))) {
      let hours = limit.hours ? ((factHour > limit.hours) ? limit.hours : factHour) : factHour
      const dayCount = timeCost
        ? (
          row.isDayAsPlan
            ? (payElTimeCost.length ? (row.planTimeCostType === 'WORK' ? 1 : 0) : (['WORK', 'FREE'].includes(row.factTimeCostType) && row.planTimeCostType === 'WORK') ? 1 : 0)
            : (payElTimeCost.length ? (row.factTimeCostType !== 'FREE' ? 1 : 0) : (row.factTimeCostType === 'WORK' ? 1 : 0))
        )
        : (hours > 0 ? 1 : 0)
      result.days += dayCount
      if (dayCount || (row.isDayAsPlan && payElTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID))) {
        result.hours += hours
      }
      result.hoursByDays[String(row.dateWork.getDate())] = (dayCount || (row.isDayAsPlan && payElTimeCost.find(o => o.dictTimeCostID === row.factTimeCostID))) ? hours : 0

      if (limit.days) {
        limit.days -= dayCount
      }
      if (limit.hours) {
        limit.hours -= hours
      }
      if (row.planTimeCostType === 'WORK' && hours !== planHours && !row.isDayAsPlan) {
        result.fullTime = false
      }
      if ((!row.isDayAsPlan && (hours > 0 || planHours > 0)) || (row.isDayAsPlan && ((cont.payEl[payElID].calcProportion === 'HOUR' && factHour) ||
          (cont.payEl[payElID].calcProportion === 'DAY' && dayCount)))) {
        result.mask = result.mask | 1 << ((row.dateWork).getDate() - 1)
      }
    }
  })

  result.leadingHoursByDays = Object.assign({}, result.hoursByDays)
  if (isSummarized) {
    result.overtime = accrualService.round(Math.max(0, result.overtimeFact - Math.min(result.overtimeFact, result.overtimePlan)), 3)
    if (result.overtime > 0) {
      let hours = result.hours
      let hourSum = 0
      let corrDay
      result.hours = result.hours - result.overtime
      Object.keys(result.hoursByDays).forEach(dayNum => {
        if (result.hoursByDays[dayNum] > 0) {
          if (!corrDay) {
            corrDay = dayNum
          }
          result.hoursByDays[dayNum] = accrualService.round(result.hoursByDays[dayNum] / hours * result.hours)
          hourSum = hourSum + result.hoursByDays[dayNum]
        }
      })
      if (hourSum !== result.hours && corrDay) {
        result.hoursByDays[corrDay] = accrualService.round(result.hoursByDays[corrDay] + result.hours - hourSum)
      }
    }
  }
  return result
}

me.getExperience = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  const cont = {}
  cont.payEl = payElService.getPayEl({ orgID: params.orgID })
  cont.emp = { [params.employeeNumberID]: {} }
  cont.employeeNumberID = params.employeeNumberID
  cont.emp[cont.employeeNumberID].prop = employeeService.getEmpData(cont.employeeNumberID, params.dateFrom, params.dateTo)
  const result = algorithmService.getExpirience(cont, params.payElID, dateService.shiftDate(params.dateTo), true)
  const payEl = cont.payEl[params.payElID]
  Object.assign(result, UB.Repository('hr_dictExperience').attrs('name').selectById(payEl.dictExperienceID))
  mParams.resultData = JSON.stringify(result)
}

me.getCalcAccrual = function (ctx) {
  const mParams = ctx.mParams
  const employeeNumberID = mParams.employeeNumberID || null
  const employeeNumbers = [employeeNumberID]
  const orgID = UB.Repository('hr_employeeNumberS').attrs('orgID').where('ID', '=', employeeNumberID).selectScalar() || null
  if (!orgID || !employeeNumberID) return
  const periodID = UB.Repository('hr_dictPeriod').attrs('ID')
    .where('orgID', '=', orgID)
    .where('isCurrent', '=', true)
    .selectScalar()
  if (!periodID) return
  rlService.getCalcAccrual({}, orgID, employeeNumbers, periodID, null, false)
}

me.getReversalAccrual = function (ctx) {
  const mParams = ctx.mParams
  const result = getReversal(mParams.orgID, mParams.employeeNumberID, mParams.accrualID)
  mParams.defaultValues = JSON.stringify(result.defaultValues)
  mParams.reversalValues = JSON.stringify(result.reversalValues)
  mParams.addReversal = result.addReversal ? JSON.stringify(result.addReversal) : null
}

function getReversal (orgID, employeeNumberID, accrualID) {
  const currentPeriod = periodService.getCurrentPeriod(orgID)
  const accr = UB.Repository('hr_accrual').attrs(['*', 'payElID.methodID.code', 'orderID.orderClass.entityName']).selectById(accrualID)
  const accrualDt = UB.Repository('hr_accrualDt').attrs(['*', 'dictFundSourceID.dictFundTypeID.code']).where('accrualID', '=', accrualID).selectAsObject()
  const isFSSU = accrualDt.find(o => o['dictFundSourceID.dictFundTypeID.code'] === '02')
  const orderEntityName = accr['orderID.orderClass.entityName']
  const methodCode = accr['payElID.methodID.code']
  const accrPeriodCalcID = accr.periodCalcID
  delete accr['orderID.orderClass.entityName']
  delete accr['payElID.methodID.code']
  if (isFSSU) {
    const sicknessRequis = UB.Repository('hr_sicknessRequisAccrual')
      .attrs('sicknessRequisDtID.sicknessRequisID.description')
      .where('accrualID', '=', accrualID)
      .selectSingle()
    if (sicknessRequis) {
      throw new UB.UBAbort(`<<<${UB.i18n('Запис додано до Заяви-розрахунку СС {0}', sicknessRequis['sicknessRequisDtID.sicknessRequisID.description'])}>>>`)
    }
  }
  accrualDt.forEach(accr => {
    delete accr['dictFundSourceID.dictFundTypeID.code']
  })
  const taxIndividAcc = UB.Repository('hr_taxIndividAcc')
    .attrs(['ID', 'taxIndividID', 'taxIndividID.name', 'taxSum', 'incomeSum', 'taxFreeSum', 'privilegeSum', 'accrualID'])
    .where('accrualID', '=', accrualID)
    .selectAsObject()
  const accrualAvg = accrualService.getAccrualAvgByAccrual([accr],
    ['ID', 'accrualID', 'orderID', 'periodID', 'periodID.name', 'dateFrom', 'dateTo', 'flagsFix', 'opDays', 'baseSum',
      'baseSumNotIndex', 'opSum', 'opKoef'])
  if (!accrualDt.length) {
    accrualDt.push({ paySum: accr.paySum })
  }
  const reversalAccruals = UB.Repository('hr_accrual')
    .attrs('*')
    .where('employeeNumberID', '=', employeeNumberID)
    .where('linkToParentID', '=', accrualID)
    .selectAsObject()
  const accIDs = reversalAccruals.map(o => o.ID)
  const reversalTaxIndividAcc = UB.Repository('hr_taxIndividAcc')
    .attrs(['ID', 'taxIndividID', 'taxSum', 'incomeSum', 'taxFreeSum', 'privilegeSum', 'accrualID'])
    .where('accrualID', 'in', accIDs)
    .selectAsObject()
  const reversalAccrualDt = UB.Repository('hr_accrualDt')
    .attrs(['*'])
    .where('accrualID', 'in', accIDs)
    .orderBy('accrualID')
    .selectAsObject()
  let paySum = accr.paySum
  let days = accr.days
  let hours = accr.hours
  accr.taxIndividAcc = taxIndividAcc
  accr.accrualDt = accrualDt
  reversalAccruals.forEach(o => {
    if (((o.flagsRec & 1 << 9) || (o.flagsRec & 1 << 10 && dateService.shiftDate(o.periodCalc) < currentPeriod.dateFrom)) && !(o.flagsRec & 1 << 12)) {
      paySum = paySum + o.paySum
      if (accr.days && o.flagsRec & 1 << 9) {
        days += o.days
      }
      if (accr.hours && o.flagsRec & 1 << 9) {
        hours += o.hours
      }
      const revAccrualDt = reversalAccrualDt.filter(r => r.accrualID === o.ID)
      if (!revAccrualDt.length) {
        accr.accrualDt.push(...revAccrualDt)
      } else {
        accr.accrualDt.push({ paySum: o.paySum })
      }
      if (taxIndividAcc.length) {
        const revTaxIndividAcc = reversalTaxIndividAcc.filter(r => r.accrualID === o.ID)
        revTaxIndividAcc.forEach(revDt => {
          const taxIndAcc = taxIndividAcc.filter(t => t.taxIndividID === revDt.taxIndividID)
          if (taxIndAcc) {
            taxIndAcc.taxSum = accrualService.round(taxIndAcc.taxSum + revDt.taxSum, 6)
            taxIndAcc.incomeSum = accrualService.round(taxIndAcc.incomeSum + revDt.incomeSum, 6)
            taxIndAcc.privilegeSum = accrualService.round(taxIndAcc.privilegeSum + revDt.privilegeSum, 6)
          } else {
            taxIndividAcc.push({
              taxIndividID: revDt.taxIndividID,
              taxSum: revDt.taxSum,
              incomeSum: revDt.incomeSum,
              privilegeSum: revDt.privilegeSum
            })
          }
        })
      }
    }
  })
  algorithmService.calcGroupSumAccrualDt(accr.accrualDt, paySum, true)
  accr.paySum = paySum
  accr.flagsRec = accr.flagsRec & ~(1 << 1)
  accr.periodCalcID = currentPeriod.ID
  accr.periodCalc = currentPeriod.dateFrom
  accr.days = days
  accr.hours = hours
  accr.linkToParentID = accr.ID
  delete accr.ID
  accr.accrualDt.forEach(accrDt => {
    delete accrDt.ID
  })
  const reversalValues = Object.assign({}, accr)
  delete reversalValues.ID
  // reversalValues.linkToParentID = accr.ID
  reversalValues.paySum = -1 * reversalValues.paySum
  reversalValues.baseSum = -1 * reversalValues.baseSum
  reversalValues.flagsRec = (1 << 2 | 1 << 9) | (accr.flagsRec & 1 << 5)
  reversalValues.planHours = reversalValues.planHours ? -1 * reversalValues.planHours : reversalValues.planHours
  reversalValues.planDays = reversalValues.planDays ? -1 * reversalValues.planDays : reversalValues.planDays
  reversalValues.days = reversalValues.days ? -1 * reversalValues.days : reversalValues.days
  reversalValues.hours = reversalValues.hours ? -1 * reversalValues.hours : reversalValues.hours

  reversalValues.taxIndividAcc.forEach(taxIndivud => {
    delete taxIndivud.ID
    delete taxIndivud['taxIndividID.name']
    taxIndivud.taxSum *= -1
    taxIndivud.incomeSum *= -1
    taxIndivud.privilegeSum *= -1
  })
  delete reversalValues.accrualDt
  reversalValues.accrualDt = []
  if (accr.accrualDt && accr.accrualDt.length) {
    accr.accrualDt.forEach(dt => {
      const accDt = Object.assign({}, dt)
      delete accDt.ID
      delete accDt.accrualID
      accDt.paySum *= -1
      reversalValues.accrualDt.push(accDt)
    })
  }

  accr.accrualAvg = accrualAvg.filter(o => o.accrualID === accr.ID)
  if (!accr.accrualAvg.length && accrualAvg.length) {
    accr.accrualAvg = accrualAvg.filter(o => o.orderID === accr.orderID && o.accrualID === null)
  }
  let addReversal = null
  if (orderEntityName === 'hr_docRegShift' && methodCode === '150' && accr.orderID) {
    addReversal = UB.Repository('hr_accrual')
      .attrs(['ID', 'orgID', 'employeeNumberID'])
      .where('employeeNumberID', '=', accr.employeeNumberID)
      .where('orgID', '=', accr.orgID)
      .where('orderID', '=', accr.orderID)
      .where('payElID.methodID.code', '!=', '150')
      .where('periodCalcID', '=', accrPeriodCalcID)
      .where('periodSalaryID', '=', accr.periodSalaryID)
      .where(`(flagsRec & 4 = 0)`, 'custom')
      .selectAsObject()
  }
  return {
    defaultValues: accr,
    reversalValues,
    addReversal
  }
}

me.getBalance = function (ctx) {
  const mParams = ctx.mParams
  const periodCalc = periodService.getPeriod(mParams.periodID)
  const resultData = []
  const secondaryJobsNumbers = mParams.secondaryJobsNumbers ? JSON.parse(mParams.secondaryJobsNumbers) : []
  const accrualBalance = UB.Repository('hr_accrualBalance')
    .attrs(['dictFundSourceID', 'dictProgClassID', 'dictProjectID', 'sumFrom', 'sumTo'])
    .whereIf(!secondaryJobsNumbers.length, 'employeeNumberID', '=', mParams.employeeNumberID)
    .whereIf(secondaryJobsNumbers.length, 'employeeNumberID', 'in', [mParams.employeeNumberID].concat(secondaryJobsNumbers.map(o => o.employeeNumberID)))
    .where('periodCalcID', '=', mParams.periodID)
    .selectAsObject()
  const dictFundSource = accrualBalance.map(o => o.dictFundSourceID || 0)
  const progClass = accrualBalance.map(o => o.dictProgClassID || 0)
  const project = accrualBalance.map(o => o.dictProjectID || 0)
  const fundSource = dictFundSource.length ? UB.Repository('ac_fundSource')
    .attrs(['ID', 'name'])
    .where('ID', 'in', dictFundSource)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  const dictFundSources = dictFundSource.length ? UB.Repository('ac_dictFundSource')
    .attrs(['ID', 'fundSourceID', 'name'])
    .where('organizationID', '=', mParams.orgID)
    .where('fundSourceID', 'in', dictFundSource)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  const dictProgClass = progClass.length ? UB.Repository('ac_dictProgClass')
    .attrs(['ID', 'name'])
    .where('ID', 'in', progClass)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  const dictProject = project.length ? UB.Repository('ac_dictProject')
    .attrs(['ID', 'description'])
    .where('ID', 'in', project)
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject() : []
  accrualBalance.forEach(row => {
    const resultRow = {}
    resultRow.paySum = mParams.inBalance ? row.sumFrom : row.sumTo
    if (resultRow.paySum !== 0) {
      if (row.dictFundSourceID) {
        const dictFund = fundSource.find(o => o.ID === row.dictFundSourceID)
        const dictFundSource = dictFundSources.find(o => o.fundSourceID === row.dictFundSourceID)
        if (dictFundSource) {
          resultRow.dictFundSourceID = `${(dictFund ? dictFund.name : '')} (${dictFundSource.name})`
        } else {
          resultRow.dictFundSourceID = dictFund ? dictFund.name : ''
        }
      } else {
        resultRow.dictFundSourceID = ''
      }
      if (row.dictProgClassID) {
        const progClassProp = dictProgClass.find(o => o.ID === row.dictProgClassID)
        resultRow.dictProgClassID = progClassProp ? progClassProp.name : ''
      }
      if (row.dictProjectID) {
        const dictProjectProp = dictProject.find(o => o.ID === row.dictProjectID)
        resultRow.dictProjectID = dictProjectProp ? dictProjectProp.description : ''
      }
      resultData.push(resultRow)
    }
  })
  mParams.resultData = JSON.stringify(resultData)
  mParams.onDate = dateService.formatDate(mParams.inBalance ? periodCalc.dateFrom : periodCalc.dateTo)
}

function isTimeSheet (group, method) {
  if (group === 1 || group === 5) { return true }
  if (group === 4 && !['16', '71'].includes(method)) { return true }
  if (['21', '23', '59', '68', '73', '44'].includes(method)) { return true }
  return false
}

function getOrderType (method) {
  return method === '41' ? 'UNPAIDABSENCE' : 'SINGLEPAYMENT'
}

me.sendReportOnEmail = (ctx) => {
  const params = ctx.mParams.params
  const mailerParams = App.serverConfig.application.customSettings.mailerConfig
  if (!mailerParams) {
    throw new Error('В файлі концігурації не налаштовано конфігурацію відправки листів')
  }
  const period = periodService.getPeriod(params.periodID)
  if (!period) return
  const mailTemplate = {
    subject: `Розрахунковий лист за ${period.name}`
  }
  const reportSendList = JSON.parse(params.reportSendList)

  reportSendList.forEach(row => {
    const report = UBServerReport.makeReport('hr_rl_1', 'pdf', {
      orgID: params.orgID,
      employeeNumberID: row.employeeNumberID,
      periodID: params.periodID
    })
    let attachments = [{
      attachName: `Розрахунковий лист за ${period.name}.pdf`,
      data: report.reportData
    }]

    try {
      const message = {
        subject: mailTemplate.subject,
        bodyType: UBMail.TubSendMailBodyType.Text,
        body: `Розрахунковий лист за ${period.name}`,
        attachments,
        from: mailerParams.fromAddr || 'no-reply@a5erp.solutions',
        to: [row.email]
      }
      mailQueue.queueMail(message)
      params.ok = true
      params.sendedList = params.sendedList ? `${params.sendedList}, ${row.email}` : row.email
    } catch (e) {
      params.message = e.message
    }
  })
}

me.selectEmployeeMailList = (ctx) => {
  const mParams = ctx.mParams
  const period = periodService.getPeriod(mParams.periodID)
  if (!period) return
  let sqlDialect = entityBaseService.getSQLDialect()
  const SQL = `
        SELECT en.employeeID "employeeID", en.ID "employeeNumberID", en.tabNum "tabNum", emp.shortFIO "shortFIO",
        ${staffService.getDepNameByIDSql()} as "depName",
        ${staffService.getPosNameByIDSql()} as "posName",
        (SELECT ${sqlDialect.top} d.name from hr_department d where d.orgID = en.orgID and d.parentUnitID = en.orgID and state = 'ACTIVE' and ( select ${sqlDialect.top} dep3.mi_treePath  from hr_department dep3  where dep3.mi_data_id = ep.departmentID and dep3.state = 'ACTIVE'  order by dep3.mi_dateTo desc ${sqlDialect.limit}) LIKE CONCAT('%',d.mi_treePath,'%') order by d.mi_dateTo desc ${sqlDialect.limit}) as "selfStructDepName"
      FROM hr_employeeNumber en 
      
      JOIN hr_employeePosition ep on ep.employeeNumberID = en.ID and ep.isActive = 1 
      and ep.ID = (select ${sqlDialect.top} ep2.ID from hr_employeePosition ep2
      where ep2.isActive = 1
      and ep2.mi_deleteDate >= '9999-12-31' 
      and ep2.employeeNumberID = ep.employeeNumberID    
      and ep2.dateFrom <= :dateTo:  
      order by ep2.dateFrom desc ${sqlDialect.limit})
      JOIN hr_employee emp on en.employeeID = emp.ID 
     where 
      en.orgID = :organizationID:
      and ep.mi_deleteDate >= '9999-12-31' 
          and en.mi_deleteDate >= '9999-12-31'
          and ep.isActive = 1 
      and en.empWorkPlace is null 
      AND (
        (en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom:) 
        or ( exists (select 1 from hr_accrualBalance a where a.employeeNumberID = en.ID and a.periodCalcID = :periodID: and sumFrom <> 0))
        or ( exists (select 1 from hr_accrual a where a.employeeNumberID = en.ID and a.periodCalcID = :periodID: AND flagsRec & 8192 = 0 ))
      )
       GROUP BY en.ID, en.employeeID, en.tabNum, emp.shortFIO, ep.departmentID, en.dateTo, en.dateFrom, en.orgID, ep.positionID, ep.dictPositionID
  `
  const store = UB.DataStore('hr_employeeNumber')
  store.runSQL(SQL, {
    organizationID: ctx.mParams.orgID,
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    periodID: mParams.periodID
  })
  const data = store.getAsJsObject()
  ctx.mParams.result = JSON.stringify(data)
}

me.getParamsOnServer = (data) => {
  const currencyService = require('../AC/public/core/currencyService')
  const reportUtils = require('../HR/public/core/reportUtils')

  const datesParams = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  // const resultData = JSON.parse(data.rl.resultData).accrual

  const resultData = JSON.parse(data.resultData).accrual
  const params = {
    periodDescription: '',
    departmentName: data.employeeData ? data.employeeData.departmentName : '',
    employee: data.employeeData ? `${data.employeeData.tabNum} ${data.employeeData.fullFIO}` : '',
    position: data.employeeData ? data.employeeData.factPosName : '',
    timeSheets: data.employeeData ? UB.i18n(`{0} днів / {1} год.`, data.employeeData.planDay, data.employeeData.planHour) : '',
    sumAccrual: data.employeeData ? data.employeeData.accrualSum : '',
    orgSumFrom: data.balanceIn ? currencyService.formatAsCurrency(data.balanceIn) : '0,00',
    fssuSumFrom: data.balanceInFssu ? currencyService.formatAsCurrency(data.balanceInFssu) : '0,00',
    debtFirst: data.balanceOut ? currencyService.formatAsCurrency(data.balanceOut) : '0,00',
    debtSec: data.balanceOutFssu ? currencyService.formatAsCurrency(data.balanceOutFssu) : '0,00',
    payoutName: '',
    taxLimit: (data.employeeData && data.employeeData.taxLimit) ? data.employeeData.taxLimit : 'Пільга відсутня'
  }

  // group
  let groupAccrual = []
  resultData.forEach(acc => {
    let groupObj = groupAccrual.find(obj => obj.payType === acc.payType && obj.payElID === acc.payElID && obj.dateFrom === acc.dateFrom && obj.dateTo === acc.dateTo &&
      ((!acc.rate && !obj.rate) || obj.rate === acc.rate))

    if (!groupObj) {
      if (acc.rate === 0)acc.rate = null
      groupAccrual.push(Object.assign({}, acc))
    } else {
      groupObj.days = groupObj.days || 0
      groupObj.hours = groupObj.hours || 0
      groupObj.paySum = currencyService.round(groupObj.paySum += acc.paySum)
      groupObj.days = currencyService.round(groupObj.days += acc.days)
      groupObj.hours = currencyService.round(groupObj.hours += acc.hours)
    }
  })

  const accrualArr = groupAccrual.filter(item => item['payType'] === 'PAYMENT')
  accrualArr.sort((a, b) => {
    if (a.periodSalaryID === b.periodSalaryID) {
      if (a.code === b.code) {
        return dateService.shiftDate(a.dateFrom) - dateService.shiftDate(b.dateFrom)
      }
      return a.code - b.code
    }
    return dateService.shiftDate(a.periodSalary) - dateService.shiftDate(b.periodSalary)
  })

  let prevPeriodSalaryID
  let accrual = []
  accrualArr.forEach(item => {
    if (item.days || item.hours || item.paySum) {
      const dateFrom = item.dateFrom ? item.dateFrom.toLocaleString('uk-UA', datesParams) : ''
      const dateTo = item.dateTo ? item.dateTo.toLocaleString('uk-UA', datesParams) : ''
      if (prevPeriodSalaryID !== item.periodSalaryID) {
        accrual.push({ periodSalaryAcc: { perSalAccName: item['periodSalaryID.name'] } })
        prevPeriodSalaryID = item.periodSalaryID
      }

      const roundToRate = reportUtils.getQuantityFractional(item.rate)
      accrual.push({
        payElNameAcc: item.description,
        paySumAcc: currencyService.formatAsCurrency(item.paySum),
        periodAcc: `${dateService.formatDate(dateFrom, 'dd.mm.yy')}-${dateService.formatDate(dateTo, 'dd.mm.yy')}`,
        daysAcc: item.days || item.hours ? `${item.days ? item.days : 0}/${item.hours ? item.hours : 0}` : '',
        payRate: item.rate ? reportUtils.quantityToString(item.rate, roundToRate) : ''
      })
    }
  })

  const paySumAccTotal = accrualArr.reduce((sum, item) => {
    sum += item.paySum
    return sum
  }, 0)
  params.paySumAccTotal = currencyService.formatAsCurrency(paySumAccTotal)
  // params.periodDescription = resultData.length ? resultData[0].periodName : data.periodName
  params.periodDescription = data.periodName ? data.periodName : data.period.name
  const keepsArr = groupAccrual.filter(item => item['payType'] === 'OFFTAKE')
  keepsArr.sort((a, b) => {
    if (a.periodSalaryID === b.periodSalaryID) {
      if (a.code === b.code) {
        return dateService.shiftDate(a.dateFrom) - dateService.shiftDate(b.dateFrom)
      }
      return a.code - b.code
    }
    return dateService.shiftDate(a.periodSalary) - dateService.shiftDate(b.periodSalary)
  })
  prevPeriodSalaryID = null
  let keeps = []
  keepsArr.forEach(item => {
    if (item.paySum || item.rate) {
      const dateFrom = item.dateFrom.toLocaleString('uk-UA', datesParams)
      const dateTo = item.dateTo.toLocaleString('uk-UA', datesParams)
      if (prevPeriodSalaryID !== item.periodSalaryID) {
        keeps.push({ periodSalaryKeep: { perSalKeepName: item['periodSalaryID.name'] } })
        prevPeriodSalaryID = item.periodSalaryID
      }

      const roundToRate = reportUtils.getQuantityFractional(item.rate)
      keeps.push({
        payElNameKeep: item.description,
        paySumKeep: currencyService.formatAsCurrency(item.paySum),
        periodKeep: `${dateService.formatDate(dateFrom, 'dd.mm.yy')}-${dateService.formatDate(dateTo, 'dd.mm.yy')}`,
        keepRate: item.rate ? reportUtils.quantityToString(item.rate, roundToRate) : ''
      })
    }
  })

  const paySumKeepTotal = keepsArr.reduce((sum, item) => {
    sum += item.paySum
    return sum
  }, 0)
  params.paySumKeepTotal = currencyService.formatAsCurrency(paySumKeepTotal)

  const paySumTotal = paySumAccTotal - paySumKeepTotal
  params.paySumTotal = currencyService.formatAsCurrency(paySumTotal)

  const payouts = resultData.filter(item => item['payType'] === 'FORPAY')
  params.payouts = payouts.map(item => {
    const dateFrom = item.dateFrom.toLocaleString('uk-UA', datesParams)
    const dateTo = item.dateTo.toLocaleString('uk-UA', datesParams)

    return {
      payoutName: item.name,
      payoutDate: dateService.formatDate(item.orderDate),
      payoutPeriod: `${dateService.formatDate(dateFrom, 'dd.mm.yy')}-${dateService.formatDate(dateTo, 'dd.mm.yy')}`,
      payoutSum: currencyService.formatAsCurrency(item.paySum)
    }
  })

  const payoutSumTotal = payouts.reduce((sum, item) => {
    sum += item.paySum
    return sum
  }, 0)
  const iter = accrual.length >= keeps.length ? accrual.length : keeps.length
  let result = []
  const joinArr = (accrual, keeps) => {
    for (let i = 0; i < iter; i++) {
      if (keeps[i] === undefined || null) {
        keeps[i] = ''
      } else if (accrual[i] === undefined || null) {
        accrual[i] = ''
      }
      let arrSum = Object.assign({}, accrual[i], keeps[i])
      result[i] = arrSum
    }
    return result
  }
  result = joinArr(accrual, keeps)
  params.payEl = result

  params.payoutSumTotal = currencyService.formatAsCurrency(payoutSumTotal)
  return params
}
