const UB = require('@unitybase/ub')
const App = UB.App
const Session = UB.Session
const dateService = require('../../AC/modules/dataServices/dateService')

module.exports = {
  getPeriod,
  getPeriods,
  getPreviousPeriods,
  getPeriodsByDate,
  getArrayPeriods,
  getPeriodsByDateFromCont,
  getPeriodOnDate,
  getPeriodIDByDate,
  createPeriod,
  getCurrentPeriod,
  closePeriod,
  openPeriod,
  closeCurrentPeriod,
  openCurrentPeriod,
  applyAccrual,
  cancelApplyAccrual,
  getPeriodByParams

}

function getPeriod (periodID) {
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['orgID', 'dateFrom', 'dateTo', 'dictMonthID', 'isClosed', 'isBlock', 'isCurrent', 'name', 'priorPeriodID', 'nextPeriodID', 'description'])
    .selectById(periodID)
  return {
    ID: periodID,
    orgID: period.orgID,
    dateFrom: dateService.shiftDate(period.dateFrom),
    dateTo: dateService.shiftDate(period.dateTo),
    dictMonthID: period.dictMonthID,
    isClosed: period.isClosed,
    isCurrent: period.isCurrent,
    isBlock: period.isBlock,
    name: period.name,
    priorPeriodID: period.priorPeriodID,
    nextPeriodID: period.nextPeriodID,
    description: period.description
  }
}

function getPeriods (periodIDs) {
  const result = []
  if (periodIDs && periodIDs.length) {
    const periods = UB.Repository('hr_dictPeriod')
      .attrs(['ID', 'dateFrom', 'dateTo', 'isClosed', 'isCurrent', 'isBlock', 'dictMonthID'])
      .where('ID', 'in', periodIDs)
      .selectAsObject()
    periods.forEach(period => {
      result.push({
        ID: period.ID,
        dateFrom: dateService.shiftDate(period.dateFrom),
        dateTo: dateService.shiftDate(period.dateTo),
        dictMonthID: period.dictMonthID,
        isClosed: period.isClosed,
        isCurrent: period.isCurrent,
        isBlock: period.isBlock
      })
    })
  }
  return result
}

function getPeriodOnDate (orgID, onDate) {
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'dictMonthID', 'isClosed', 'isCurrent', 'isBlock', 'name', 'priorPeriodID', 'nextPeriodID'])
    .where('orgID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .limit(1)
    .selectSingle()
  if (!period) {
    return null
  }
  return {
    ID: period.ID,
    orgID: period.orgID,
    dateFrom: dateService.shiftDate(period.dateFrom),
    dateTo: dateService.shiftDate(period.dateTo),
    dictMonthID: period.dictMonthID,
    isClosed: period.isClosed,
    isCurrent: period.isCurrent,
    isBlock: period.isBlock,
    name: period.name,
    priorPeriodID: period.priorPeriodID,
    nextPeriodID: period.nextPeriodID
  }
}

function getPreviousPeriods (orgID, onDate, count) {
  let dt = dateService.priorDay(dateService.firstDayOfMonth(onDate))
  let df = dateService.addMonths(dt, -1 * count)
  return UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'description', 'dateFrom', 'dateTo'])
    .where('orgID', '=', orgID)
    .where('dateFrom', '>=', df)
    .where('dateFrom', '<=', dt)
    .orderBy('dateFrom')
    .selectAsObject()
}

function getArrayPeriods (orgID, onDate) {
  // const dateFrom = dateService.addMonths(onDate, -36)
  // const dateTo = dateService.addMonths(onDate, 36)
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'name', 'isClosed', 'isCurrent', 'isBlock', 'priorPeriodID', 'nextPeriodID'])
    .where('orgID', '=', orgID)
    // .where('dateTo', '>=', dateFrom)
  // .where('dateFrom', '<=', dateTo)
    .orderBy('dateFrom')
    .selectAsObject()
  period.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  return period
}

function getPeriodsByDateFromCont (cont, dateFrom, dateTo) {
  if (!cont.periods) {
    cont.periods = getArrayPeriods(cont.orgID, dateTo)
  }
  return cont.periods.filter(o => o.dateTo >= dateFrom && o.dateFrom <= dateTo)
}

function getPeriodsByDate (orgID, dateFrom, dateTo) {
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'name', 'isClosed', 'isCurrent', 'isBlock', 'priorPeriodID', 'nextPeriodID'])
    .where('orgID', '=', orgID)
    .where('dateTo', '>=', dateFrom)
    .where('dateFrom', '<=', dateTo)
    .orderBy('dateFrom')
    .selectAsObject()
  period.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
  })
  return period
}

function getPeriodIDByDate (periods, date) {
  let result = null
  if (periods && periods.length) {
    for (let i = 0; i < periods.length; i++) {
      let period = periods[i]
      let byDate = dateService.shiftDate(date)
      let dateFrom = dateService.shiftDate(period.dateFrom)
      let dateTo = dateService.shiftDate(period.dateTo)
      if (dateFrom <= byDate && dateTo >= byDate) {
        result = period.ID
        break
      }
    }
  }
  return result
}

function createPeriod ({ orgID, onDate, setCurrent, startDate }) {
  let store = UB.DataStore('hr_dictPeriod')
  const months = UB.Repository('ac_dictMonth').attrs(['ID', 'code', 'name']).selectAsObject()
  const existPeriod = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'orgID', 'pYear', 'dictMonthID', 'priorPeriodID', 'nextPeriodID'])
    .where('orgID', '=', orgID)
    .selectAsObject()
  const firstCurrentDay = dateService.firstDayOfMonth(onDate)
  const firstDayYear = dateService.firstDayOfYear(onDate)
  if (!startDate) {
    startDate = dateService.addMonths(firstDayYear, -36)
  }
  const lastDate = dateService.addMonths(dateService.shiftDate(new Date(firstCurrentDay.getFullYear(), 11, 1, 0, 0, 0)), 36)
  let month = months.find(o => o.code === (startDate.getMonth() + 1)).code
  let year = startDate.getFullYear()
  let priorMonth = month === 1 ? 12 : month - 1
  let priorMonthID = months.find(o => o.code === priorMonth).ID
  let priorYear = month === 1 ? year - 1 : year
  const priorPeriod = existPeriod.find(o => o.dictMonthID === priorMonthID && o.pYear === priorYear)
  let priorPeriodID = priorPeriod ? priorPeriod.ID : null
  let date = dateService.shiftDate(startDate)
  const insertPeriods = []
  const updatePeriods = []
  while (date < lastDate) {
    const month = months.find(o => o.code === (date.getMonth() + 1))
    const monthID = month.ID
    const period = existPeriod.find(o => o.dictMonthID === monthID && o.pYear === date.getFullYear())
    const nextDate = dateService.addMonths(date, 1)
    const nextMonthID = months.find(o => o.code === (nextDate.getMonth() + 1)).ID
    const nextPeriod = existPeriod.find(o => o.dictMonthID === nextMonthID && o.pYear === nextDate.getFullYear())
    if (!period) {
      const ID = store.generateID()
      const execParams = {
        ID: ID,
        orgID: orgID,
        pYear: date.getFullYear(),
        dictMonthID: monthID,
        priorPeriodID: priorPeriodID,
        nextPeriodID: nextPeriod ? nextPeriod.ID : null,
        isCurrent: setCurrent ? (date.getTime() === firstCurrentDay.getTime() ? 1 : 0) : 0,
        isClosed: setCurrent ? (date < firstCurrentDay ? 1 : 0) : 0,
        userID: Session.uData.userID,
        date: new Date((new Date()).setMilliseconds(0))
      }
      execParams.dateFrom = dateService.shiftDate(new Date(execParams.pYear, month.code - 1, 1, 0, 0, 0))
      execParams.dateTo = dateService.lastDayOfMonth(execParams.dateFrom)
      let suffix = `${execParams.isCurrent ? UB.i18n('Поточний') : ''}${execParams.isClosed ? UB.i18n('Закритий') : ''}${execParams.isBlock ? `, ${UB.i18n('Заблокований')}` : ''}`
      if (suffix) suffix = ` (${suffix})`
      execParams.description = `${month.name} ${execParams.pYear}${suffix}`
      execParams.name = `${month.name} ${execParams.pYear}`
      insertPeriods.push(execParams)
      if (priorPeriodID) {
        updatePeriods.push({
          ID: priorPeriodID,
          nextPeriodID: ID
        })
      }
      priorPeriodID = ID
    } else {
      priorPeriodID = period.ID
    }
    date = dateService.addMonths(date, 1)
  }
  if (insertPeriods.length) {
    if (App.dbConnections.DEFAULT.config.dialect === 'MSSQL2012') {
      store.execSQL(
        `INSERT INTO hr_dictPeriod (ID,orgID,pYear,dictMonthID,priorPeriodID,nextPeriodID,isCurrent,isClosed,dateFrom,dateTo,
        description,name,mi_owner,mi_createDate,mi_createUser,mi_modifyDate,mi_modifyUser)
       select * from OPENJSON(?) 
       WITH (   
        ID bigint '$.ID',
        orgID bigint '$.orgID',
        pYear int '$.pYear',
        dictMonthID bigint '$.dictMonthID',
        priorPeriodID bigint '$.priorPeriodID',
        nextPeriodID bigint '$.nextPeriodID',
        isCurrent numeric(1) '$.isCurrent', 
        isClosed numeric(1) '$.isClosed', 
        dateFrom datetime '$.dateFrom',
        dateTo datetime '$.dateTo',
        description nvarchar(40) '$.description',
        name nvarchar(40) '$.name',
        mi_owner bigint '$.userID',
        mi_createDate datetime '$.date',
        mi_createUser bigint '$.userID',
        mi_modifyDate datetime '$.date',
        mi_modifyUser bigint '$.userID'
      )`, { p1: JSON.stringify(insertPeriods) })
    } else {
      store.execSQL(
        `INSERT INTO hr_dictPeriod (ID,orgID,pYear,dictMonthID,priorPeriodID,nextPeriodID,isCurrent,isClosed,dateFrom,dateTo,
        description,name,mi_owner,mi_createDate,mi_createUser,mi_modifyDate,mi_modifyUser) (
            SELECT (data->>'ID')::BIGINT, 
            (data->>'orgID')::BIGINT,
            (data->>'pYear')::INT, 
            (data->>'dictMonthID')::BIGINT,
            (data->>'priorPeriodID')::BIGINT,
            (data->>'nextPeriodID')::BIGINT,
            (data->>'isCurrent')::SMALLINT,
            (data->>'isClosed')::SMALLINT,
            (data->>'dateFrom')::TIMESTAMP, 
            (data->>'dateTo')::TIMESTAMP, 
            (data->>'description')::CHARACTER VARYING(40),
            (data->>'name')::CHARACTER VARYING(40),
            (data->>'userID')::BIGINT,
            (data->>'date')::TIMESTAMP, 
            (data->>'userID')::BIGINT,
            (data->>'date')::TIMESTAMP, 
            (data->>'userID')::BIGINT
            FROM ( SELECT json_array_elements(?::json) AS data) tmp
            )`, { p1: JSON.stringify(insertPeriods) })
    }
  }
  updatePeriods.forEach(udata => {
    store.execSQL(
      `UPDATE hr_dictPeriod SET nextPeriodID=:nextPeriodID: WHERE ID= :ID:`,
      udata)
  })

  store.freeNative()
  store = null
  // global.gc()
}

function getCurrentPeriod (orgID) {
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'isCurrent', 'isClosed', 'isBlock', 'nextPeriodID', 'priorPeriodID',
      'orgID', 'name', 'mi_modifyDate', 'pYear', 'dictMonthID.code'
    ])
    .where('orgID', '=', orgID)
    .where('isCurrent', '=', 1)
    .limit(1)
    .selectSingle({ 'dictMonthID.code': 'pMonth' })

  return period ? {
    ID: period.ID,
    dateFrom: dateService.shiftDate(period.dateFrom),
    dateTo: dateService.shiftDate(period.dateTo),
    isCurrent: period.isCurrent,
    isClosed: period.isClosed,
    isBlock: period.isBlock,
    nextPeriodID: period.nextPeriodID,
    priorPeriodID: period.priorPeriodID,
    orgID: period.orgID,
    name: period.name,
    pMonth: period.pMonth,
    mi_modifyDate: period.mi_modifyDate
  } : { ID: null, dateFrom: null, dateTo: null, isCurrent: null, isClosed: null, isBlock: null, nextPeriodID: null, priorPeriodID: null, orgID: null, name: null, mi_modifyDate: null, pYear: null, pMonth: null }
}

function closePeriod (period) {
  const periodStore = UB.DataStore('hr_dictPeriod')
  const periodHistoryStore = UB.DataStore('hr_dictPeriodHistory')
  closeCurrentPeriod(period)
  periodStore.run('update', {
    execParams: {
      ID: period.ID,
      isClosed: 1,
      isCurrent: 0,
      mi_modifyDate: period.mi_modifyDate
    }
  })
  periodHistoryStore.run('insert', {
    execParams: {
      periodID: period.ID,
      dateFrom: new Date(),
      periodState: 'CLOSE',
      appVersion: App.domainInfo.models.HR.version,
      platformVersion: process.version
    }
  })
  const nextPeriod = getPeriod(period.nextPeriodID)

  periodStore.run('update', {
    __skipOptimisticLock: true,
    execParams: {
      ID: nextPeriod.ID,
      isCurrent: 1
    }
  })
  periodHistoryStore.run('insert', {
    execParams: {
      periodID: nextPeriod.ID,
      dateFrom: new Date(),
      periodState: 'CURRENT',
      appVersion: App.domainInfo.models.HR.version,
      platformVersion: process.version
    }
  })
  periodStore.freeNative()
  periodHistoryStore.freeNative()
  createPeriod({ orgID: period.orgID, onDate: period.dateFrom })
  openCurrentPeriod(nextPeriod)
}

function openPeriod (period) {
  const accrualService = require('../../HR/modules/accrualService')
  const calcService = require('../../HR/modules/calcService')
  const paySummaryService = require('../../HR/modules/paySummaryService')
  const periodStore = UB.DataStore('hr_dictPeriod')
  const periodHistoryStore = UB.DataStore('hr_dictPeriodHistory')
  const store = UB.DataStore('hr_paySummary')
  accrualService.removeAutoCalcAccrual({ orgID: period.orgID, periodID: period.ID })
  paySummaryService.deleteEntry(period.ID)
  store.execSQL(`DELETE FROM hr_payCalcSummarySheet WHERE periodID = :periodID: AND orgID = :orgID: `, { periodID: period.ID, orgID: period.orgID })
  store.execSQL(`DELETE FROM hr_payFundSummarySheet WHERE periodID = :periodID: AND orgID = :orgID:`, { periodID: period.ID, orgID: period.orgID })
  periodStore.run('update', {
    execParams: {
      ID: period.ID,
      isCurrent: 0,
      mi_modifyDate: period.mi_modifyDate
    }
  })
  periodHistoryStore.run('insert', {
    execParams: {
      periodID: period.ID,
      dateFrom: new Date(),
      periodState: 'OPEN',
      appVersion: App.domainInfo.models.HR.version,
      platformVersion: process.version
    }
  })
  cancelApplyAccrual(period.orgID, period.priorPeriodID)
  periodStore.run('update', {
    execParams: {
      ID: period.priorPeriodID,
      isCurrent: 1,
      isClosed: 0,
      mi_modifyDate: period['nextPeriodID.mi_modifyDate']
    }
  })

  periodHistoryStore.run('insert', {
    execParams: {
      periodID: period.priorPeriodID,
      dateFrom: new Date(),
      periodState: 'CURRENT',
      appVersion: App.domainInfo.models.HR.version,
      platformVersion: process.version
    }
  })

  calcService.addCalcPlanQueue({ orgID: period.orgID, description: `${UB.i18n('Відкрито період')} ${dateService.formatDate(dateService.addMonths(period.dateFrom, -1))}` })
  periodStore.freeNative()
  periodHistoryStore.freeNative()
}

function closeCurrentPeriod (period) {
  const paySummaryService = require('../../HR/modules/paySummaryService')
  const employeeNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID'])
    .where('orgID', '=', period.orgID)
    .where('dateFrom', '<=', period.dateTo)
    .where('dateTo', '>=', period.dateFrom)
    .selectAsObject().map(o => o.ID)
  const recalcEmployeeNumbers = UB.Repository('hr_employeeNumState')
    .attrs(['employeeNumberID'])
    .where('flags', '=', 0)
    .where('employeeNumberID', 'in', employeeNumbers)
    .selectAsObject()
  const calcOrgState = UB.Repository('hr_calcOrgState')
    .attrs(['flags'])
    .where('orgID', '=', period.orgID)
    .selectScalar()
  if (recalcEmployeeNumbers.length || !calcOrgState) {
    throw new UB.UBAbort(`<<<${UB.i18n('Триває розрахунок заробітної плати. Зачекайте завершення')}>>>`)
  }
  restoreData(period)
  paySummaryService.savePeriodOrgEntry(period.orgID, period)
  applyAccrual(period)
}

function restoreData (period) {
  const store = UB.DataStore('hr_employeeNumState')
  store.execSQL(`UPDATE hr_employeePosition SET changeOrderID = subquery.changeOrderID
FROM (select p.ID, n.changeOrderID from hr_employeePosition p
JOIN hr_employeeNumber n ON n.ID = p.employeeNumberID
WHERE p.organizationID = :orgID: AND p.dateTo < '9999-12-31' AND n.dateTo < '9999-12-31' AND n.changeOrderID is not null 
AND p.changeOrderID is null AND p.dateTo = n.dateTo) AS subquery 
WHERE  hr_employeePosition.ID = subquery.ID`,
  {

    orgID: period.orgID
  })
}

function openCurrentPeriod (period) {
  const db = App.dbConnections[App.domainInfo.entities.ubm_enum.connectionName]
  const store = UB.DataStore('hr_employeeNumState')
  const calcService = require('../../HR/modules/calcService')
  const accrualService = require('../../HR/modules/accrualService')
  const runQuery = () => {
    store.execSQL(`UPDATE hr_employeeNumState SET flags = 0, mi_modifyDate = :modifyDate: 
        WHERE flags != 0 AND employeeNumberID IN (SELECT en.ID FROM hr_employeeNumber en
        WHERE en.orgID = :orgID: AND en.dateFrom <= :dateTo: AND en.dateTo >= :dateFrom: AND 
         en.mi_deleteDate >= '9999-12-31')`,
    {
      modifyDate: new Date((new Date()).setMilliseconds(0)),
      orgID: period.orgID,
      dateFrom: period.dateFrom,
      dateTo: period.dateTo
    })

    store.execSQL(`DELETE FROM tim_timeSheet WHERE ID IN (SELECT t.ID
       FROM tim_timeSheet t
       JOIN hr_employeeNumber n ON n.ID = t.employeeNumberID
       JOIN hr_order o ON o.ID = t.orderID
       JOIN hr_orderClass c ON c.ID = o.orderClass
       WHERE n.orgID = :orgID: AND t.mi_deleteDate >= '9999-12-31' AND t.dateWork >= :dateFrom: AND 
       n.dateTo < :dateFrom: AND c.entityName IN ('hr_timeSheetChange', 'hr_employeeAccrual'))`,
    {
      orgID: period.orgID,
      dateFrom: period.dateFrom
    })
  }
  try {
    db.savepointWrap(runQuery)
  } catch (error) {
    console.error(error)
  }

  store.freeNative()
  accrualService.removeAutoCalcAccrual({ orgID: period.orgID, periodID: period.ID })
  // removeDismTimeSheet(period)
  calcService.addCalcPlanQueue({ orgID: period.orgID, description: `${UB.i18n('Відкрито період')} ${dateService.formatDate(period.dateFrom)}` })
  // calcService.addCalcTimeSheetQueue({ orgID: period.orgID, description: `${UB.i18n('Відкрито період')} ${dateService.formatDate(period.dateFrom)}` })
  // calcService.addCalcQueue({ orgID: period.orgID, description: `Відкрито період ${dateService.formatDate(period.dateFrom)}` })
}

function applyAccrual (period) {
  const accrualService = require('../../HR/modules/accrualService')
  const accruals = UB.Repository('hr_accrual')
    .attrs(['ID', 'incomingDebtSum', 'calculatedSum', 'repaymentDebtSum', 'repaymentSum', 'source', 'sourceID', 'paySum', 'payElID.methodID.code'])
    .where('orgID', '=', period.orgID)
    .where('periodCalcID', '=', period.ID)
    .where('payElID.methodID.code', 'in', ['31', '61', '3'])
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .selectAsObject()
  const employeeAccrualStore = UB.DataStore('hr_employeeAccrual')
  const employeeCPHStore = UB.DataStore('hr_employeeCPH')
  accruals.forEach(row => {
    if (row.source === 'hr_payRetention' && ['31', '61'].includes(row['payElID.methodID.code'])) {
      const payRetention = UB.Repository(row.source).attrs(['remindSum']).selectById(row.sourceID)
      if (payRetention) {
        const alimonyStore = UB.DataStore(row.source)
        alimonyStore.run('update', {
          __skipOptimisticLock: true,
          isImport: true,
          execParams: {
            ID: row.sourceID,
            remindSum: accrualService.round((payRetention.remindSum || 0) + (row.calculatedSum || 0) - (row.repaymentDebtSum || 0) - (row.repaymentSum || 0))
          }
        })
        alimonyStore.freeNative()
      }
    } else if (row.source === 'hr_employeeAccrual' && row['payElID.methodID.code'] === '3') {
      const employeeAccrual = UB.Repository(row.source).attrs(['remindSum']).selectById(row.sourceID)
      if (employeeAccrual) {
        employeeAccrualStore.run('update', {
          __skipOptimisticLock: true,
          isImport: true,
          execParams: {
            ID: row.sourceID,
            remindSum: accrualService.round((employeeAccrual.remindSum || 0) - row.paySum)
          }
        })
        const employeeCPH = UB.Repository('hr_employeeCPH').attrs(['ID']).where('employeeAccrualID', '=', row.sourceID).selectSingle()
        if (employeeCPH) {
          employeeCPHStore.run('update', {
            __skipOptimisticLock: true,
            skipEmployeeAccrual: true,
            execParams: {
              ID: employeeCPH.ID,
              remindSum: accrualService.round((employeeAccrual.remindSum || 0) - row.paySum)
            }
          })
        }
      }
    }
  })
}

function cancelApplyAccrual (orgID, periodID) {
  const accrualService = require('../../HR/modules/accrualService')
  const alimony = UB.Repository('hr_accrual')
    .attrs(['ID', 'incomingDebtSum', 'calculatedSum', 'repaymentDebtSum', 'repaymentSum', 'source', 'sourceID', 'paySum', 'payElID.methodID.code'])
    .where('orgID', '=', orgID)
    .where('periodCalcID', '=', periodID)
    .where('payElID.methodID.code', 'in', ['31', '61', '3'])
    .where(`(flagsRec & 8192 != 8192)`, 'custom')
    .selectAsObject()
  const employeeAccrualStore = UB.DataStore('hr_employeeAccrual')
  const employeeCPHStore = UB.DataStore('hr_employeeCPH')
  alimony.forEach(row => {
    if (row.source === 'hr_payRetention' && ['31', '61'].includes(row['payElID.methodID.code'])) {
      const payRetention = UB.Repository(row.source).attrs(['remindSum']).selectById(row.sourceID)
      if (payRetention) {
        const alimonyStore = UB.DataStore(row.source)
        alimonyStore.run('update', {
          __skipOptimisticLock: true,
          isImport: true,
          execParams: {
            ID: row.sourceID,
            remindSum: accrualService.round((payRetention.remindSum || 0) - (row.calculatedSum || 0) + (row.repaymentDebtSum || 0) + (row.repaymentSum || 0))
          }
        })
        alimonyStore.freeNative()
      }
    } else if (row.source === 'hr_employeeAccrual' && row['payElID.methodID.code'] === '3') {
      const employeeAccrual = UB.Repository(row.source).attrs(['remindSum']).selectById(row.sourceID)
      if (employeeAccrual) {
        employeeAccrualStore.run('update', {
          __skipOptimisticLock: true,
          isImport: true,
          execParams: {
            ID: row.sourceID,
            remindSum: accrualService.round((employeeAccrual.remindSum || 0) + row.paySum)
          }
        })
        const employeeCPH = UB.Repository('hr_employeeCPH').attrs(['ID']).where('employeeAccrualID', '=', row.sourceID).selectSingle()
        if (employeeCPH) {
          employeeCPHStore.run('update', {
            __skipOptimisticLock: true,
            skipEmployeeAccrual: true,
            execParams: {
              ID: employeeCPH.ID,
              remindSum: accrualService.round((employeeAccrual.remindSum || 0) + row.paySum)
            }
          })
        }
      }
    }
  })
}

function getPeriodByParams (orgID, pYear, dictMonthID) {
  const period = UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'dateFrom', 'dateTo', 'dictMonthID', 'isClosed', 'isBlock', 'isCurrent', 'name', 'priorPeriodID', 'nextPeriodID', 'description'])
    .where('orgID', '=', orgID)
    .where('pYear', '=', pYear)
    .where('dictMonthID', '=', dictMonthID)
    .limit(1)
    .selectSingle()
  return period ? {
    ID: period.ID,
    orgID: period.orgID,
    dateFrom: dateService.shiftDate(period.dateFrom),
    dateTo: dateService.shiftDate(period.dateTo),
    dictMonthID: period.dictMonthID,
    isClosed: period.isClosed,
    isCurrent: period.isCurrent,
    isBlock: period.isBlock,
    name: period.name,
    priorPeriodID: period.priorPeriodID,
    nextPeriodID: period.nextPeriodID,
    description: period.description
  } : {}
}
