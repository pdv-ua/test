/* eslint-disable prefer-destructuring */
const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const calcService = require('../HR/modules/calcService')
const settingsService = require('../AC/modules/entityServices/settingsService')
const accrualService = require('../HR/modules/accrualService')
const employeeService = require('../HR/modules/employeeService')

me.entity.addMethod('getOrgEmployeeKpiList')
me.entity.addMethod('saveEmployeeKpiList')
me.entity.addMethod('loadEmployeeKpiList')

/**
 * @param ctx {orgID, onDate, dictKpiList: [dictKpiID]}
 * @returns [{ID, tabNum, lastName, firstName, middleName, employeeID, dateFrom, dateTo, {dictKpiID, }}]
 */
me.getOrgEmployeeKpiList = function (ctx) {
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
  const empKpi = UB.Repository('hr_employeeKpi')
    .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'KPI'])
    .where('employeeNumberID.orgID', '=', params.orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()
  const result = []
  empNumList.forEach(empNum => {
    const kpi = empKpi.find(o => o.employeeNumberID === empNum.employeeNumberID)
    result.push(Object.assign({}, empNum, kpi || {}))
  })
  ctx.mParams.employeeKpi = JSON.stringify(result)
}

/**
 * @param ctx {orgID, onDate, data: [{empNumID, expID, value}]}
 */
me.saveEmployeeKpiList = function (ctx) {
  const params = ctx.mParams
  if (!params.onDate) return
  const store = UB.DataStore(__entityName)
  const data = JSON.parse(params.data)
  const reCalcSalaryFromDate = {}
  const hrAutoSetRecalcDate = settingsService.getByCode('hrAutoSetRecalcDate', params.orgID)
  data.forEach(rec => {
    const calcDate = dateService.shiftDate(params.onDate)
    const dateFrom = params.dateFrom ? dateService.shiftDate(params.dateFrom) : dateService.firstDayOfMonth(calcDate)
    const dateTo = params.dateTo ? dateService.shiftDate(params.dateTo) : dateService.lastDayOfMonth(calcDate)
    if (rec.ID) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: rec.ID,
          KPI: rec.KPI
        }
      })
    } else {
      store.run('insert', {
        execParams: {
          employeeNumberID: rec.employeeNumberID,
          dateFrom,
          dateTo,
          KPI: rec.KPI
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
        description: `${UB.i18n('Зміна KPI')} ${dateService.formatDate(dateService.shiftDate(employeeNumberID))}`
      })
    }
  }

  const employeeNumbers = data.map(o => o.empNumID).filter((value, index, self) => { return self.indexOf(value) === index })
  calcService.addCalcQueue({ employeeNumbers, calcBalance: 1, description: UB.i18n('Зміна KPI') })
}

me.loadEmployeeKpiList = function (ctx) {
  const mParams = ctx.mParams
  const params = JSON.parse(mParams.params)
  if (!params.data) {
    params.data = []
  }
  const store = UB.DataStore(__entityName)
  params.data.forEach((rec) => {
    rec.dateFrom = rec.dateFrom ? dateService.shiftDate(rec.dateFrom) : dateService.firstDayOfMonth(dateService.shiftDate(params.onDate))
    rec.dateTo = rec.dateTo ? dateService.shiftDate(rec.dateTo) : dateService.lastDayOfMonth(dateService.shiftDate(params.onDate))
    const employeeNumber = employeeService.getEmployeeNumber({ orgID: params.orgID, employeeNumberID: rec.employeeNumberID, tabNum: rec.tabNum, taxCode: rec.taxCode, dateFrom: rec.dateFrom, dateTo: rec.dateTo, rowIdx: rec.idx })
    if (employeeNumber) {
      rec.employeeNumberID = employeeNumber.ID
      const ID = UB.Repository('hr_employeeKpi')
        .attrs(['ID'])
        .where('employeeNumberID', '=', rec.employeeNumberID)
        .where('dateFrom', '=', rec.dateFrom)
        .where('dateTo', '=', rec.dateTo)
        .selectScalar()
      if (ID) {
        store.run('update', {
          __skipOptimisticLock: true,
          execParams: {
            ID,
            dateFrom: rec.dateFrom,
            dateTo: rec.dateTo,
            KPI: rec.KPI
          }
        })
      } else {
        store.run('insert', {
          execParams: {
            employeeNumberID: rec.employeeNumberID,
            dateFrom: rec.dateFrom,
            dateTo: rec.dateTo,
            KPI: rec.KPI
          }
        })
      }
    }
  })
}
