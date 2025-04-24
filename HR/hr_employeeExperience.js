/* eslint-disable prefer-destructuring */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const orderService = require('../HR/modules/orderService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const Session = require('@unitybase/ub').Session
const accrualService = require('../HR/modules/accrualService')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)
me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('update:after', afterUpdate)
me.on('select:after', afterSelect)

me.entity.addMethod('reCalcExperience')
me.entity.addMethod('getTotalExperience')
me.entity.addMethod('calculateExperience')
me.entity.addMethod('loadEmployeeExperience')
me.entity.addMethod('shiftIncorrectDates')
me.entity.addMethod('getOrgEmployeeExperienceList')
me.entity.addMethod('saveEmployeeExperienceList')

me.entity.addMethod('canEditOnDate')

me.canEditOnDate = () => {} // метод для перевірки можливості редагувати дату "Станом на"

me.details = [
  {
    detailName: 'employeeExperienceDt',
    entityName: 'hr_employeeExperienceDt',
    docIDName: 'employeeExperienceID',
    fieldList: orderService.setFieldListAttribute([
      'dateFrom', 'dateTo', 'koef', 'orderNumber', 'orderDate'
    ], ['lineNum'])
  }
]

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!ctx.mParams.isImport) {
    calcService.addCalcQueue({
      employeeNumbers:
        UB.Repository('hr_employeeNumberS').attrs('ID')
          .where('employeeID', '=', execParams.employeeID)
          .where('dateFrom', '<=', dateService.currentDate())
          .where('dateTo', '>=', dateService.currentDate())
          .selectAsObject().map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.modifyUserID = Session.userID
  execParams.modifyDate = new Date()
  const record = UB.Repository(__entityName)
    .attrs('ID')
    .where('employeeID', '=', execParams.employeeID)
    .where('dictExperienceID', '=', execParams.dictExperienceID)
    .where('employeeNumberID', '=', execParams.employeeNumberID || null)
    .selectSingle()
  if (record) throw new UB.UBAbort(`<<<${UB.i18n('Запис з таким видом стажу вже існує')}>>>`)
}

function beforeUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  execParams.modifyUserID = Session.userID
  execParams.modifyDate = new Date()
  if (!ctx.mParams.isOrderOperation && (execParams.calcDate !== undefined || execParams.startCalcDate !== undefined)) {
    execParams.isFromWorkbook = 0
  }
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (previousValues.employeeID && !ctx.mParams.isImport) {
    calcService.addCalcQueue({
      employeeNumbers:
        UB.Repository('hr_employeeNumberS').attrs('ID')
          .where('employeeID', '=', previousValues.employeeID)
          .where('dateFrom', '<=', dateService.currentDate())
          .where('dateTo', '>=', dateService.currentDate())
          .selectAsObject().map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
  orderService.saveDetails(ctx, me.details)
}

function afterUpdate (ctx) {
  const execParams = ctx.mParams.execParams
  ctx.mParams.detail = orderService.getEntityDetail(execParams.ID, me.details)
}

function afterSelect (ctx) {
  const mParams = ctx.mParams
  if (mParams.ID && !mParams.execParams) {
    ctx.mParams.detail = orderService.getEntityDetail(mParams.ID, me.details)
  }
}

function beforeDelete (ctx) {
  const previousValues = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}
  if (!ctx.mParams.isImport) {
    calcService.addCalcQueue({
      employeeNumbers:
        UB.Repository('hr_employeeNumberS').attrs('ID')
          .where('employeeID', '=', previousValues.employeeID)
          .where('dateFrom', '<=', dateService.currentDate())
          .where('dateTo', '>=', dateService.currentDate())
          .selectAsObject().map(o => o.ID),
      description: UB.i18n(`Змінено дані {0}`, __entityName)
    })
  }
  UB.DataStore(__entityName).execSQL(`update hr_empOrderExperience set employeeExperienceID = null where employeeExperienceID = ${ctx.mParams.execParams.ID}`, {})
}

function fixExperience (mParams) {
  if (!mParams.fixData || !mParams.fixData.length) {
    return
  }
  const onDate = dateService.shiftDate(mParams.onDate)
  const employeeID = mParams.employeeID
  const store = UB.DataStore('hr_employeeExperienceFix')
  /* UB.Repository('hr_employeeExperienceFix')
    .attrs(['ID'])
    .where('employeeID', '=', employeeID)
    .where('expOnDate', '=', onDate)
    .selectAsObject().forEach(item => {
      store.run('delete', {
        execParams: {
          ID: item.ID
        }
      })
    }) */
  store.run('insert', {
    execParams: {
      employeeID: employeeID,
      expOnDate: onDate,
      descriptionExperience: mParams.fixData,
      dateFixExperience: new Date(),
      respEmployeeNumID: Session.uData.employeeNumberID,
      respEmployeeFIO: UB.Repository('hr_employeeNumberS').attrs('employeeID.fullFIO').where('ID', '=', Session.uData.employeeNumberID).selectScalar(),
      organizationID: mParams.organizationID,
      comment: 'Зафіксовано під час перерахунку стажів'
    }
  })
}

me.reCalcExperience = ctx => {
  const mParams = ctx.mParams
  const onDate = dateService.shiftDate(mParams.onDate)
  if (mParams.fixData) {
    fixExperience(mParams)
  }
  const employeeID = mParams.employeeID
  const isJoin = typeof mParams.joinPeriods === 'boolean' ? mParams.joinPeriods : true
  const store = UB.DataStore('hr_employeeExperience')
  const dictExperience = UB.Repository('hr_dictExperience').attrs(['ID', 'name']).selectAsObject()
  const employeeExperience = UB.Repository('hr_employeeExperience').attrs(['ID'])
    .where('employeeID', '=', employeeID)
    .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  const employeeWorkBook = UB.Repository('hr_employeeWorkbookDt')
    .attrs(['ID', 'dateFrom', 'dateTo', 'dictExperienceID', 'coefficient'])
    .orderBy('dateFrom')
    .where('employeeWorkbookID.employeeID', '=', employeeID)
    .where('employeeWorkbookID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  const employee = UB.Repository('hr_employee')
    .attrs(['birthDate'])
    .where('ID', '=', employeeID)
    .selectSingle()
  const errorMessage = []

  employeeExperience.forEach(row => {
    store.run('delete', {
      execParams: {
        ID: row.ID
      }
    })
  })

  const calcMethod = settingsService.getByCode('hrCalcExperienceMethod', mParams.organizationID)
  dictExperience.forEach(experience => {
    let workBook = employeeWorkBook.filter(o => o.dictExperienceID === experience.ID)
    if (isJoin) workBook = joinPeriods(workBook)
    let calcDate
    if (workBook.length) {
      let maxDateTo = workBook[0].dateTo
      if (calcMethod === 'SIMPLE') {
        let countDays = 0
        let totalExp = {
          years: 0,
          months: 0,
          days: 0
        }
        let exp = {
          years: 0,
          months: 0,
          days: 0
        }
        workBook.forEach(work => {
          const ymd = dateService.getYmd(work.dateFrom, work.dateTo ? work.dateTo : onDate, true)
          const diff = dateService.ymdToDays(ymd)
          const coef = work.coefficient ? work.coefficient : 1
          countDays = Math.floor(diff * coef)
          exp = dateService.daysToYmd(countDays)
          totalExp = dateService.addYmd(totalExp, exp)
          if (maxDateTo < work.dateTo || !work.dateTo) maxDateTo = work.dateTo
        })
        countDays = -1 * dateService.ymdToDays(totalExp)
        calcDate = dateService.addDays(maxDateTo || onDate, countDays + 1)
      } else {
        let countDays = 0
        workBook.forEach(work => {
          const diff = dateService.dayDiff(work.dateFrom, work.dateTo ? work.dateTo : onDate) + 1
          const coef = work.coefficient ? work.coefficient : 1
          countDays -= Math.floor(diff * coef)
          if (maxDateTo < work.dateTo || !work.dateTo) maxDateTo = work.dateTo
        })
        calcDate = dateService.addDays(maxDateTo || onDate, countDays + 1)
      }
      if (calcDate) {
        if (employee.birthDate && dateService.shiftDate(employee.birthDate) >= calcDate) {
          errorMessage.push(experience.name)
        } else {
          store.run('insert', {
            execParams: {
              employeeID,
              dictExperienceID: experience.ID,
              calcDate,
              startCalcDate: maxDateTo,
              isFromWorkbook: true
            }
          })
        }
      }
    }
  })
  mParams.messages = JSON.stringify(errorMessage)
}

me.getTotalExperience = function (ctx) {
  const mParams = ctx.mParams
  if (!mParams.employeeID) return
  const onDate = mParams.onDate ? dateService.shiftDate(mParams.onDate) : dateService.currentDate()
  ctx.mParams.totalExperience = []

  function checkDateTo (dateTo) {
    return !dateTo || dateService.isMaxDate(dateTo) || dateTo > onDate ? onDate : dateTo
  }

  function calcMaxPeriod (list, maxDiff) {
    if (!list.length) return 0
    list.forEach((el, i) => {
      const dateTo = checkDateTo(el.dateTo)
      el.days = dateService.dayDiff(el.dateFrom, dateTo) + 1
      el.ymd = dateService.getYmd(el.dateFrom, dateTo, true)
      el.diff = i === 0 ? 0 : dateService.dayDiff(list[i - 1].dateTo, el.dateFrom)
    })
    let maxDays = list[0].days
    let curPeriodDays = list[0].days
    for (let i = 1; i < list.length; i++) {
      if (list[i].diff < maxDiff) {
        curPeriodDays += list[i].days
      } else {
        if (maxDays < curPeriodDays) {
          maxDays = curPeriodDays
        }
        curPeriodDays = list[i].days
      }
    }
    if (maxDays < curPeriodDays) {
      maxDays = curPeriodDays
    }
    return maxDays
  }

  const MAX_DIFF_TOTAL = Number(settingsService.getByCode('hrMaxDiffWorkExp', mParams.orgID || null) || 30)
  const MAX_DIFF_TOTAL_GOV = Number(settingsService.getByCode('hrMaxDiffGovExp', mParams.orgID || null) || 30)

  const methods = ['1', '3', '6']

  const expWbList = UB.Repository('hr_employeeWorkbookDt')
    .attrs(['dateFrom', 'dateTo', 'dictExperienceID.methodExpID.code', 'employeeWorkbookID.organizationID'])
    .orderBy('dateFrom')
    .where('employeeWorkbookID.employeeID', '=', mParams.employeeID)
    .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeWorkbookID.mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .selectAsObject()

  expWbList.forEach(record => {
    record.dateFrom = new Date(record.dateFrom)
    record.dateTo = !record.dateTo ? dateService.maxDate() : new Date(record.dateTo)
  })

  let expList = []
  const result = []
  methods.forEach(method => {
    expList = expWbList.filter(el => el['dictExperienceID.methodExpID.code'] === method)
    let totalExperience = 0
    let expListCorrected = joinPeriods(expList)
    if (method === '3' && mParams.orgID) {
      const expListInOrg = expWbList.filter(el => el['employeeWorkbookID.organizationID'] === mParams.orgID && el['dictExperienceID.methodExpID.code'] === '1')
      expListCorrected = joinPeriods(expListInOrg)
      expListCorrected.forEach(reco => {
        const dateTo = checkDateTo(reco.dateTo)
        const diff = dateService.dayDiff(reco.dateFrom, dateTo) + 1
        totalExperience += diff
      })
    }
    if (method === '1') {
      totalExperience = calcMaxPeriod(expListCorrected, MAX_DIFF_TOTAL)
    }
    if (method === '6') {
      totalExperience = calcMaxPeriod(expListCorrected, MAX_DIFF_TOTAL_GOV)
    }
    const calcDate = dateService.addDays(onDate, 1 - totalExperience)
    const calcYMD = totalExperience > 0 ? dateService.getYmd(calcDate, onDate, true) : { years: 0, months: 0, days: 0 }
    result.push({
      method: method,
      totalDays: totalExperience,
      years: calcYMD.years,
      months: calcYMD.months,
      days: calcYMD.days
    })
  })
  ctx.mParams.totalExperience = JSON.stringify(result)
}

function joinPeriods (list) {
  const result = []
  list.forEach(record => {
    const el = result.find(o => o.dateFrom === record.dateFrom && o.dateTo === record.dateTo)
    if (!el) {
      const idx = result.findIndex(el => el.dateFrom <= record.dateFrom && record.dateFrom <= el.dateTo)
      if (idx >= 0) {
        if (result[idx].dateTo < record.dateTo || !record.dateTo) {
          result[idx].dateTo = record.dateTo
        }
      } else {
        result.push(record)
      }
    }
  })
  return result
}

me.calculateExperience = function (ctx) {
  const experienceService = require('../HR/modules/experienceService')
  const params = ctx.mParams.execParams
  if (!params.employeeNumberID) return
  const onDate = params.onDate ? dateService.shiftDate(params.onDate) : dateService.currentDate()
  const fromDate = params.fromDate ? dateService.shiftDate(params.fromDate) : null
  ctx.mParams.experience = experienceService.calculateExperience(params.employeeNumberID, params.dictExperienceID, onDate, fromDate)
}

me.loadEmployeeExperience = function (ctx) {
  const experienceService = require('../HR/modules/experienceService')
  const params = ctx.mParams.execParams
  if (!params.employeeNumberID && !params.employeeID) return
  let onDate = params.onDate ? dateService.shiftDate(params.onDate) : dateService.currentDate()
  const fromDate = params.fromDate ? dateService.shiftDate(params.fromDate) : null
  const experienceList = []
  const employee = params.employeeNumberID
    ? UB.Repository('hr_employeeNumberS')
      .attrs('employeeID', 'dateFrom')
      .selectById(params.employeeNumberID)
    : {}

  const calcMethod = settingsService.getByCode('hrCalcExperienceMethod', params.orgID || params.organizationID)
  if (params.experienceCode) {
    params.experienceCode = JSON.parse(params.experienceCode)
  }
  const employeeID = params.employeeID || employee.employeeID

  const empPos = params.orgID
    ? UB.Repository('hr_employeePositionS')
      .attrs('employeeNumberID.dateFrom')
      .where('employeeID', '=', employeeID)
      .whereIf(params.employeeNumberID, 'employeeNumberID', '=', params.employeeNumberID)
      .where('organizationID', '=', params.orgID)
      .orderBy('dateFrom', 'asc')
      .selectSingle()
    : null

  const startWork = empPos ? dateService.shiftDate(empPos['employeeNumberID.dateFrom']) : null

  const employeeExp = UB.Repository('hr_employeeExperience')
    .attrs('ID', 'dictExperienceID', 'calcDate', 'startCalcDate', 'dictExperienceID.methodExpID.code', 'employeeNumberID',
      'modifyUserID', 'modifyUserID.employeeNumberID.employeeID.fullFIO', 'modifyDate', 'isFromWorkbook')
    .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
    .where('employeeID', '=', employeeID)
    .whereIf(params.experienceCode, 'dictExperienceID.methodExpID.code', 'in', params.experienceCode)
    .selectAsObject()
  employeeExp.forEach(row => {
    row.calcDate = dateService.shiftDate(row.calcDate)
    row.startCalcDate = dateService.shiftDate(row.startCalcDate)
  })

  const dictExperience = UB.Repository('hr_dictExperience')
    .attrs(['ID', 'name', 'methodExpID.code'])
    // .where('ID', 'in', dictExperienceIDs)
    .whereIf(params.experienceCode, 'methodExpID.code', 'in', params.experienceCode)
    .selectAsObject({
      'methodExpID.code': 'method'
    })
  if (startWork && onDate < startWork) {
    onDate = startWork
  }
  let empExp
  dictExperience.forEach(item => {
    let exp = {}
    empExp = null
    if (params.employeeNumberID) {
      exp = experienceService.calculateExperience(params.employeeNumberID, item.ID, onDate, fromDate)
      empExp = employeeExp.find(o => o.dictExperienceID === item.ID && o.employeeNumberID === params.employeeNumberID)
      exp.employeeNumberID = params.employeeNumberID
    } else if (params.employeeID) {
      empExp = employeeExp.find(o => o.dictExperienceID === item.ID)
      exp.employeeNumberID = null
      let ymd = { years: 0, months: 0, days: 0, calcDate: onDate, autoCalc: false, totalDays: 0 }
      if (empExp) {
        const calcDate = empExp.calcDate
        const onCalcDate = empExp.startCalcDate && empExp.startCalcDate < onDate ? empExp.startCalcDate : onDate
        ymd = dateService.getYmd(calcDate, onCalcDate, true)
        ymd.totalDays = dateService.dayDiff(calcDate, onCalcDate) + 1
      }
      exp = {
        years: ymd.years,
        months: ymd.months,
        days: ymd.days,
        autoCalc: false,
        totalDays: ymd.totalDays,
        excludeExperience: 0
      }
    }
    if (!empExp) {
      empExp = employeeExp.find(o => o.dictExperienceID === item.ID)
      exp.employeeNumberID = null
    }
    if (calcMethod === 'SIMPLE' && !exp.autoCalc && exp.totalDays > 0) {
      const ymd = dateService.daysToYmd(exp.totalDays)
      exp.years = ymd.years
      exp.months = ymd.months
      exp.days = ymd.days
    }
    exp.employeeExperienceID = empExp ? empExp.ID : null
    exp.dictExperienceID = item.ID
    exp.calcDate = empExp ? empExp.calcDate : null
    exp.method = item.method
    exp.name = item.name
    exp.startCalcDate = empExp ? empExp.startCalcDate : null
    exp.modifyUserName = empExp ? empExp['modifyUserID.employeeNumberID.employeeID.fullFIO'] : null
    exp.modifyDate = empExp ? empExp['modifyDate'] : null
    exp.isFromWorkbook = empExp ? empExp.isFromWorkbook : false
    exp.isFromWorkbookName = empExp ? (empExp.isFromWorkbook ? 'Так' : 'Hі') : ''
    if (startWork) {
      exp.referenceDate = onDate >= startWork ? onDate : startWork
    } else {
      exp.referenceDate = onDate
    }
    experienceList.push(exp)
  })
  ctx.mParams.experience = JSON.stringify(experienceList)
}

me.shiftIncorrectDates = () => {
  const store = UB.DataStore('hr_employeeExperience')
  if (entityBaseService.isPostgreSql()) {
    store.runSQL(`
        SELECT ID as "ID", calcDate as "calcDate"
          FROM hr_employeeExperience exp
          WHERE exp.mi_deleteDate>= '9999-12-31' AND DATE_PART('hour', exp.calcDate) <> 0
    `, {})
  } else {
    store.runSQL(`
      SELECT ID as "ID", calcDate as "calcDate"
        FROM hr_employeeExperience exp
        WHERE exp.mi_deleteDate>= '9999-12-31' AND DATEPART(HOUR, exp.calcDate) > 0
    `, {})
  }
  const empData = store.getAsJsObject()
  empData.forEach(row => {
    store.run('update', {
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        calcDate: dateService.shiftDate(row.calcDate)
      }
    })
  })
  store.freeNative()
}

/**
 * @param ctx {orgID, onDate, dictExperienceList: [dictExperienceID]}
 * @returns [{ID, tabNum, lastName, firstName, middleName, employeeID, dateFrom, dateTo, {dictExperienceID, }}]
 */
me.getOrgEmployeeExperienceList = function (ctx) {
  const experienceService = require('../HR/modules/experienceService')
  const orgService = require('../HR/modules/orgService')
  const payElService = require('../HR/modules/payElService')
  const employeeService = require('../HR/modules/employeeService')
  const params = ctx.mParams
  if (!params.orgID) return
  const onDate = params.onDate ? dateService.shiftDate(params.onDate) : dateService.currentDate()
  const empNumList = UB.Repository('hr_employeeNumber')
    .attrs(['ID', 'tabNum', 'tabNumSort', 'employeeID.fullFIO', 'employeeID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', params.orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .orderBy('tabNumSort')
    .selectAsObject({ 'ID': 'employeeNumberID', 'employeeID.fullFIO': 'fullFIO' })
  const emp = {}
  empNumList.forEach(empNum => {
    emp[empNum.employeeNumberID] = {}
    emp[empNum.employeeNumberID].prop = {
      employeeNumber: {
        dateFrom: dateService.shiftDate(empNum.dateFrom),
        dateTo: dateService.shiftDate(empNum.dateTo),
        employeeID: empNum.employeeID,
        orgID: empNum.orgID
      }
    }
  })
  const cont = {
    orgID: params.orgID,
    org: orgService.getOrgData(params.orgID),
    payEl: payElService.getPayEl({ orgID: params.orgID }),
    dict: {}
  }
  cont.dict.hr_dictExperience = UB.Repository('hr_dictExperience').attrs(['ID', 'code', 'methodExpID', 'methodExpID.code', 'dateFrom', 'dateTo']).selectAsObject()
  cont.dict.hr_dictSalaryMinSize = UB.Repository('hr_dictSalaryMinSize').attrs('*').orderBy('dateFrom', 'desc').selectAsObject()
  employeeService.loadEmployeeData({ orgID: params.orgID, cont, employeeNumbers: empNumList.map(o => o.employeeNumberID), dateFrom: onDate, dateTo: onDate, skipSecondJobs: true, skipParentEmployee: true, entityList: ['employeePosition', 'employeeExperience'] })
  const result = []
  empNumList.forEach(empNum => {
    const row = {}
    params.dictExperienceList.forEach(dictExperienceID => {
      const isPlan = false
      const experience = experienceService.calculateExperience(empNum.employeeNumberID, dictExperienceID, onDate, null, isPlan, cont)
      if (experience.years || experience.months || experience.days) {
        row['exp' + dictExperienceID] = `${experience.years}.${experience.months}.${experience.days}`
      } else {
        row['exp' + dictExperienceID] = ''
      }
    })
    result.push(Object.assign({}, empNum, row))
  })
  ctx.mParams.employeeExperience = JSON.stringify(result)
}

/**
 * @param ctx {orgID, onDate, data: [{empNumID, expID, value}]}
 */
me.saveEmployeeExperienceList = function (ctx) {
  const params = ctx.mParams
  if (!params.onDate) return
  const store = UB.DataStore(__entityName)
  const data = JSON.parse(params.data)
  const reCalcSalaryFromDate = {}
  const hrAutoSetRecalcDate = settingsService.getByCode('hrAutoSetRecalcDate', params.orgID)
  const calcMethod = settingsService.getByCode('hrCalcExperienceMethod', params.orgID)
  data.forEach(rec => {
    const years = rec.value.replace(/^([0-9]?[0-9])\.([0-1]?[0-1]|[0-9])\.([0-2]?[0-9]|[3]?[0])$/, '$1')
    const months = rec.value.replace(/^([0-9]?[0-9])\.([0-1]?[0-1]|[0-9])\.([0-2]?[0-9]|[3]?[0])$/, '$2')
    const days = rec.value.replace(/^([0-9]?[0-9])\.([0-1]?[0-1]|[0-9])\.([0-2]?[0-9]|[3]?[0])$/, '$3')
    let calcDate = params.onDate
    if (calcMethod === 'SIMPLE') {
      const dayCount = dateService.ymdToDays({ years, months, days })
      calcDate = dateService.addDays(calcDate, -dayCount + 1)
    } else {
      calcDate = dateService.getCalcDate(years, months, days, calcDate)
    }
    calcDate = dateService.shiftDate(calcDate)
    const reposEmpNum = UB.Repository('hr_employeeNumber')
    const reposEmpExp = UB.Repository(__entityName)
    const { employeeID, dateFrom } = reposEmpNum.attrs('employeeID', 'dateFrom').selectById(rec.empNumID)
    const experience = reposEmpExp.attrs('ID')
      .where('employeeID', '=', employeeID, 'empID')
      .where('employeeNumberID', 'isNull', undefined, 'empNumIDisNull')
      .where('employeeNumberID', '=', rec.empNumID, 'empNumID')
      .where('dictExperienceID', '=', rec.expID, 'expID')
      .orderBy('employeeNumberID')
      .logic('((([empID] AND [empNumIDisNull]) OR [empNumID]) AND [expID])')
      .selectSingle()
    if (experience) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: experience.ID,
          calcDate
        }
      })
    } else {
      store.run('insert', {
        execParams: {
          employeeID,
          employeeNumberID: rec.empNumID,
          dictExperienceID: rec.expID,
          calcDate
        }
      })
    }

    if (hrAutoSetRecalcDate) {
      const reCalcDate = dateService.unshiftDate(dateService.firstDayOfMonth(dateFrom > calcDate ? dateFrom : calcDate))
      if (!reCalcSalaryFromDate[rec.empNumID] || reCalcSalaryFromDate[rec.empNumID] > reCalcDate) {
        reCalcSalaryFromDate[rec.empNumID] = reCalcDate
      }
    }
  })
  store.freeNative()

  if (hrAutoSetRecalcDate) {
    for (const [employeeNumberID, reCalcDate] of Object.entries(reCalcSalaryFromDate)) {
      accrualService.setRecalculatePeriod({
        orgID: params.orgID,
        employeeNumberID,
        dateFrom: reCalcDate,
        entityName: __entityName,
        initiatorID: null,
        description: `${UB.i18n('Зміна стажу')} ${dateService.formatDate(dateService.shiftDate(employeeNumberID))}`
      })
    }
  }

  const employeeNumbers = data.map(o => o.empNumID).filter((value, index, self) => { return self.indexOf(value) === index })
  calcService.addCalcQueue({ employeeNumbers, calcBalance: 1, description: UB.i18n('Зміна стажу') })
}
