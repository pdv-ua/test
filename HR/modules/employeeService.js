const UB = require('@unitybase/ub')
const entityBaseService = require('../../AC/modules/entityServices/entityBaseService')
const dateService = require('../../AC/modules/dataServices/dateService')
const periodService = require('./periodService')
const settingsService = require('../../AC/modules/entityServices/settingsService')
const accrualService = require('../../HR/modules/accrualService')

module.exports = {
  getEmployeeDataOnPeriod,
  getEmpData,
  loadEmployeeData,
  loadSecondJobs,
  loadWorkPlace,
  loadEmployeeTimeSheet,
  getEmpByTabNum,
  getEmpTariffingData,
  recalcEmpStartWork,
  getChildEmpNumberIDs,
  getParentEmpNumberIDs,
  getMainPosition,
  getAddDescriptionPerson,
  updateAddDescriptionPerson,
  updateEmployeeAddPersonDescription,
  getPlanSum,
  loadTariffingAccruals,
  getEmployeeKpi,
  getEmployeeNumber,
  getPriorEmployeeNumber,
  getSubordinates
}

/**
 * @param params {Object} [periodID, period, employeeNumber]
 * @returns {Array}
 */

function getEmployeeDataOnPeriod (params) {
  if (!params.period) {
    params.period = periodService.getPeriod(params.periodID)
  }
  const employeeData = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID.tabNum', 'employeeID', 'employeeID.fullFIO', 'posCaption', 'depCaption', 'workScheduleID', 'workScheduleID.caption',
      'payElID', 'payElID.description', 'payElID.methodID.code', 'accrualSum', 'mtCount', 'dictPositionName', 'factPosition', 'factPosName',
      'employeeID.taxCode', 'dictFundSourceID.name', 'workPlace.name', 'workerType.name', 'employeeNumberID.empWorkPlace',
      'employeeNumberID.empDictPositionID', 'employeeNumberID.mainEmpNumberID'])
    .orderByDesc('dateTo')
    .where('employeeNumberID', '=', params.employeeNumberID)
    .where('dateFrom', '<=', params.period.dateTo)
    .where('dateTo', '>=', params.period.dateFrom)
    .limit(1)
    .selectSingle({
      'employeeNumberID.tabNum': 'tabNum',
      'workScheduleID.caption': 'workScheduleName',
      'payElID.description': 'payElName',
      'posCaption': 'posName',
      'depCaption': 'depName',
      'employeeID.taxCode': 'taxCode',
      'dictFundSourceID.name': 'dictFundSource',
      'workPlace.name': 'workPlace',
      'workerType.name': 'workerType',
      'employeeNumberID.empWorkPlace': 'empWorkPlace',
      'employeeNumberID.empDictPositionID': 'empDictPositionID',
      'employeeNumberID.mainEmpNumberID': 'mainEmpNumberID',
      'employeeID.fullFIO': 'fullFIO'
    })
  if (employeeData) {
    const useActualPositionName = settingsService.getByCode('hrOrderActualPositionName', params.orgID) === true
    const employeeChange = UB.Repository('hr_employeeChange')
      .attrs(['ID', 'fullFIOOld', 'orderDate'])
      .where('employeeID', '=', employeeData['employeeID'])
      .where('orderDate', '>', params.period.dateTo)
      .orderBy('orderDate', 'asc')
      .selectSingle()
    if (employeeChange) {
      employeeData.fullFIO = employeeChange.fullFIOOld
    }

    employeeData.positionName = useActualPositionName ? employeeData.factPosition : employeeData.posName
    employeeData.factPosName = useActualPositionName ? employeeData.factPosName : employeeData.posName
    employeeData.departmentName = employeeData.depName
    employeeData.workPlaceName = `${employeeData.workPlace || ''}, (${employeeData.workerType || ''})`
    employeeData.planHour = 0
    employeeData.normHour = 0
    employeeData.factHour = 0
    employeeData.planDay = 0
    employeeData.normDay = 0
    employeeData.factDay = 0
    employeeData.taxLimit = ''
    employeeData.taxLimitShort = ''
    if (employeeData['payElID.methodID.code'] === '2') {
      employeeData.payMethod = 'Тариф'
    } else {
      employeeData.payMethod = 'Оклад'
    }
    UB.Repository('tim_timeSheet')
      .attrs(['planHour', 'normHour', 'factHour', 'factTimeCostID.timeCostType', 'planTimeCostID.timeCostType', 'normTimeCostID.timeCostType',
        'planID.workScheduleID.isDayAsPlan'])
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('isActive', '=', 1)
      .where('dateWork', '>=', params.period.dateFrom)
      .where('dateWork', '<=', params.period.dateTo)
      .selectAsObject({
        'factTimeCostID.timeCostType': 'factTimeCostType',
        'planTimeCostID.timeCostType': 'planTimeCostType',
        'normTimeCostID.timeCostType': 'normTimeCostType',
        'planID.workScheduleID.isDayAsPlan': 'isDayAsPlan'
      }).forEach(row => {
        const factHour = ((row.factHour && row.factTimeCostType === 'WORK') ? row.factHour : 0)
        employeeData.planHour += row.planHour
        employeeData.normHour += row.normHour
        employeeData.factHour += factHour
        employeeData.planDay += row.planHour > 0 ? 1 : 0
        employeeData.normDay += row.normHour > 0 ? 1 : 0
        employeeData.factDay += (row.isDayAsPlan ? ((['WORK', 'FREE'].includes(row.factTimeCostType) && row.planTimeCostType === 'WORK' ? 1 : 0))
          : (row.factTimeCostType === 'WORK' ? 1 : 0))
      })
    const taxLimit = UB.Repository('hr_employeeTaxLimit')
      .attrs(['taxLimitID.name', 'dateFrom', 'dateTo'])
      .where('employeeNumberID', '=', params.employeeNumberID)
      .where('dateFrom', '<=', params.period.dateTo)
      .where('dateTo', '>=', params.period.dateFrom)
      .selectAsObject()
      .reduce(function (acc, item, index, array) {
        if (array.length === 1) {
          return acc + item['taxLimitID.name']
        }
        return array.length === index + 1 ? acc + item['taxLimitID.name'] + '.' : acc + item['taxLimitID.name'] + ', '
      }, '')

    employeeData.employeeID = params.employeeNumberID
    employeeData.taxLimit = taxLimit
    employeeData.taxLimitShort = taxLimit.substring(0, 72) || 'Відсутні'
    let accrualSum = (!employeeData.accrualSum || employeeData.accrualSum === 0) ? '' : `${employeeData.accrualSum}`
    let mtCount = (!employeeData.mtCount || employeeData.mtCount === 0) ? '' : ` (${employeeData.mtCount})`
    employeeData.systemPay = accrualSum + mtCount
  }
  return employeeData || null
}

function getEmpData (employeeNumberID, dateFrom, dateTo, period, cont) {
  const result = {}

  //Change pdv 12.08.24
  // add fields tabNumSort and tabNumIndex for find main trf position
  result.employeeNumber = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'employeeID', 'orgID', 'dateFrom', 'dateTo', 'payOutID', 'personalAccount', 'parentEmpNumberID', 'description', 'empWorkPlace',
      'empDictPositionID', 'mainEmpNumberID','tabNumSort','tabNumIndex'])
    .selectById(employeeNumberID)
  if (result.employeeNumber) {
    result.employeeNumber.dateFrom = dateService.shiftDate(result.employeeNumber.dateFrom)
    result.employeeNumber.dateTo = dateService.shiftDate(result.employeeNumber.dateTo)

    result.employeePositions = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'organizationID', 'departmentID', 'positionID', 'dateFrom', 'dateTo',
        'workScheduleID', 'mtCount', 'dictStaffCatID', 'workerType', 'workPlace', 'dictFundSourceID', 'fundSources', 'dictCategoryECBID',
        'contractType', 'dictContractKindID', 'dictTarifCoeffID', 'payElID', 'accrualSum', 'raiseSalary', 'isIndex',
        'dictPositionID', 'accountID', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
        'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value', 'dictStaffCatID.accCategory', 'dictEmpCategoryID'
      ])
      .where('employeeNumberID', '=', employeeNumberID)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeePositions.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      if (row.fundSources) {
        row.fundSources = JSON.parse(row.fundSources)
      }
      if (row.workScheduleID && cont && cont.dict && cont.dict.hr_workSchedule) {
        const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === row.workScheduleID)
        if (workSchedule) {
          row.isSummarized = workSchedule.isSummarized
          row.periodSummarized = workSchedule.periodSummarized
        }
      }
    })

    const parentEmpNumbers = []
    if (result.employeeNumber['parentEmpNumberID']) {
      getParentEmpNumberIDs(employeeNumberID, parentEmpNumbers)
    }
    result.parentEmpNumbers = parentEmpNumbers
    result.employeeAccruals = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'accrualRate',
        'missingEmployeeNumberID', 'orderID', 'dictFundSourceID', 'accountID', 'accrualParams', 'limitSum', 'remindSum',
        'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
        'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeAccruals.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    result.employeeRetentions = UB.Repository('hr_payRetention')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'payElID', 'rate', 'baseSum', 'paymentMethod',
        'bankID', 'employeeFamilyID', 'employeeFamilyID.peopleID.birthDate', 'maxRate', 'minRate', 'debtSum', 'remindSum',
        'dateIdxFrom'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeRetentions.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })

    result.payPermDisable = UB.Repository('hr_payPermDisable')
      .attrs(['payPermID', 'employeeNumberID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .selectAsObject()
    const empNumbers = [employeeNumberID]
    parentEmpNumbers.forEach(row => {
      empNumbers.push(row.employeeNumberID)
    })
    const dictTimeCostExclude = (cont && cont.dict && cont.dict.hr_dictTimeCost)
      ? (cont.dict.hr_dictTimeCost.find(o => o.code === entityBaseService.langCodei18n('Ні')) || {}).ID
      : UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
    result.timeSheets = UB.Repository('tim_timeSheet')
      .attrs(['ID', 'dateWork', 'planTimeCostID', 'normTimeCostID', 'factTimeCostID', 'factHour', 'factHourNight',
        'factHourEvening', 'planHour', 'normHour', 'planHourNight', 'planHourEvening', 'planTimeCostID.timeCostType', 'normTimeCostID.timeCostType',
        'factTimeCostID.timeCostType', 'factTimeCostID.isFactHour', 'mtCount', 'orderID', 'isCorrection',
        'planID.workScheduleID.isDayAsPlan', 'factHourHarmful', 'employeeNumberID', 'typeSheetChange',
        'planID.workScheduleID.isSummarized', 'planID.workScheduleID.periodSummarized', 'factHourDop', 'factHourPlus',
        'normMonthDay', 'normMonthHour', 'planMonthDay', 'planMonthHour'])
      .where('employeeNumberID', 'in', empNumbers)
      .where('isActive', '=', 1)
      .where('dateWork', '>=', dateService.addYears(dateFrom, -1))
      .where('dateWork', '<=', dateService.lastDayOfMonth(dateTo))
      .whereIf(dictTimeCostExclude && parentEmpNumbers.length, 'factTimeCostID', '!=', dictTimeCostExclude, 'dtce')
      .whereIf(dictTimeCostExclude && parentEmpNumbers.length, 'employeeNumberID', '=', employeeNumberID, 'emn')
      .logic(dictTimeCostExclude && parentEmpNumbers.length ? '([dtce] OR [emn])' : '(1 = 1)')
      .orderBy('dateWork')
      .selectAsObject({
        'normTimeCostID.timeCostType': 'normTimeCostType',
        'planTimeCostID.timeCostType': 'planTimeCostType',
        'factTimeCostID.timeCostType': 'factTimeCostType',
        'factTimeCostID.isFactHour': 'isFactHour',
        'planID.workScheduleID.isDayAsPlan': 'isDayAsPlan',
        'planID.workScheduleID.isSummarized': 'isSummarized',
        'planID.workScheduleID.periodSummarized': 'periodSummarized'
      })
    result.timeSheets.forEach(row => {
      row.dateWork = dateService.shiftDate(row.dateWork)
      // row.employeeNumberID = employeeNumberID
    })
    result.timeSheetDateFrom = dateService.addYears(dateFrom, -1)
    result.timeSheetDateTo = dateService.lastDayOfMonth(dateTo)
    if (period && !result.timeSheets.find(o => o.dateWork >= period.dateFrom && o.dateWork <= period.dateTo)) {
      const timeSheetService = require('../../TIM/modules/timeSheetService')
      timeSheetService.fillTimeSheet({
        organizationID: period.orgID,
        periodID: period.ID,
        employeeNumbers: [employeeNumberID],
        checkPeriod: false
      })
      result.timeSheets = UB.Repository('tim_timeSheet')
        .attrs(['ID', 'dateWork', 'planTimeCostID', 'normTimeCostID', 'factTimeCostID', 'factHour', 'factHourNight',
          'factHourEvening', 'planHour', 'normHour', 'planHourNight', 'planHourEvening', 'planTimeCostID.timeCostType', 'normTimeCostID.timeCostType',
          'factTimeCostID.timeCostType', 'factTimeCostID.isFactHour', 'mtCount', 'orderID', 'isCorrection',
          'planID.workScheduleID.isDayAsPlan', 'factHourHarmful', 'employeeNumberID', 'typeSheetChange',
          'planID.workScheduleID.isSummarized', 'planID.workScheduleID.periodSummarized', 'factHourDop',
          'normMonthDay', 'normMonthHour', 'planMonthDay', 'planMonthHour', 'factHourPlus'])
        .where('employeeNumberID', 'in', empNumbers)
        .where('isActive', '=', 1)
        .where('dateWork', '>=', dateService.addYears(dateFrom, -1))
        .where('dateWork', '<=', dateService.lastDayOfMonth(dateTo))
        .whereIf(dictTimeCostExclude && parentEmpNumbers.length, 'factTimeCostID', '!=', dictTimeCostExclude, 'dtce')
        .whereIf(dictTimeCostExclude && parentEmpNumbers.length, 'employeeNumberID', '=', employeeNumberID, 'emn')
        .logic(dictTimeCostExclude && parentEmpNumbers.length ? '([dtce] OR [emn])' : '(1 = 1)')
        .orderBy('dateWork')
        .selectAsObject({
          'normTimeCostID.timeCostType': 'normTimeCostType',
          'planTimeCostID.timeCostType': 'planTimeCostType',
          'factTimeCostID.timeCostType': 'factTimeCostType',
          'factTimeCostID.isFactHour': 'isFactHour',
          'planID.workScheduleID.isDayAsPlan': 'isDayAsPlan',
          'planID.workScheduleID.isSummarized': 'isSummarized',
          'planID.workScheduleID.periodSummarized': 'periodSummarized'
        })
      result.timeSheets.forEach(row => {
        row.dateWork = dateService.shiftDate(row.dateWork)
      })
    }
    if (parentEmpNumbers.length) {
      const timeSheet = result.timeSheets
      result.timeSheets = []
      result.timeSheetsWithParent = []
      timeSheet.forEach(row => {
        if (row.employeeNumberID === employeeNumberID) {
          result.timeSheets.push(row)
        }
        row.employeeNumberID = employeeNumberID
        if (dictTimeCostExclude !== row.factTimeCostID || row.dateWork >= result.employeeNumber.dateFrom) {
          result.timeSheetsWithParent.push(row)
        }
      })
    }
    if (cont && cont.constants && cont.constants.hrTimeSheetReCalcDate) {
      result.timeSheetsPrior = parentEmpNumbers.length ? result.timeSheetsWithParent : result.timeSheets
      result.timeSheets = result.timeSheets.filter(o => o.dateWork >= cont.constants.hrTimeSheetReCalcDate)
    }
    result.experience = []
    result.experienceDt = []
    const experience = UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'dictExperienceID', 'calcDate', 'employeeNumberID', 'employeeID', 'startCalcDate'])
      .where('employeeID', '=', result.employeeNumber.employeeID)
      .where('employeeNumberID', '=', employeeNumberID, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .logic('([empNum] OR [empNumNull])')
      .orderBy('dictExperienceID')
      .orderByDesc('employeeNumberID')
      .selectAsObject()

    const experienceDetails = UB.Repository('hr_employeeExperienceDt')
      .attrs(['ID', 'employeeExperienceID.employeeID', 'employeeExperienceID.employeeNumberID',
        'employeeExperienceID.dictExperienceID', 'dateFrom', 'dateTo', 'koef'])
      .where('employeeExperienceID', 'in', experience.map(o => o.ID))
      .where('employeeExperienceID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'employeeExperienceID.dictExperienceID': 'dictExperienceID',
        'employeeExperienceID.employeeID': 'employeeID',
        'employeeExperienceID.employeeNumberID': 'employeeNumberID'
      })
    experience.forEach(row => {
      row.calcDate = dateService.shiftDate(row.calcDate)
      if (row.employeeNumberID || !experience.find(o => o.dictExperienceID === row.dictExperienceID && !!o.employeeNumberID)) {
        result.experience.push(row)
        experienceDetails.filter(o => o.employeeNumberID === row.employeeNumberID && o.dictExperienceID === row.dictExperienceID).forEach(det => {
          result.experienceDt.push(det)
        })
      }
    })

    result.employeeTaxLimit = UB.Repository('hr_employeeTaxLimit')
      .attrs(['ID', 'dateFrom', 'dateTo', 'taxLimitID', 'amountChild', 'taxLimitID.taxLimitType',
        'taxLimitID.size', 'taxLimitID.maxBase', 'taxLimitID.dateFrom', 'taxLimitID.dateTo'])
      .where('employeeNumberID', '=', employeeNumberID)
      .selectAsObject()
    result.employeeTaxLimit.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      row['taxLimitID.dateFrom'] = dateService.shiftDate(row['taxLimitID.dateFrom'])
      row['taxLimitID.dateTo'] = dateService.shiftDate(row['taxLimitID.dateTo'])
    })
    result.employeeDisability = UB.Repository('hr_employeeDisability')
      .attrs(['ID', 'disabilityID', 'disabilityGroup', 'dateFrom', 'dateTo'])
      .where('employeeID', '=', result.employeeNumber.employeeID)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeDisability.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    result.employeeBenefits = UB.Repository('hr_employeeBenefits')
      .attrs(['ID', 'dictBenefitsKindID', 'employeeFamilyID', 'coef', 'avgSum', 'employeeDisabilityID', 'dateFrom', 'dateTo'])
      .where('employeeID', '=', result.employeeNumber.employeeID)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeBenefits.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    result.workBookDet = UB.Repository('hr_employeeWorkbookDt')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dictExperienceID', 'coefficient'])
      .where('employeeWorkbookID.employeeID', '=', result.employeeNumber.employeeID)
      .orderBy('dateFrom')
      .selectAsObject()
    result.workBookDet.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
    })
    result.salaryRank = []
    const publServRang = UB.Repository('hr_publServRang')
      .attrs(['ID', 'dictRankID', 'dateFrom', 'dateTo'])
      .where('employeeID', '=', result.employeeNumber.employeeID)
      .orderBy('dateFrom')
      .selectAsObject()
    publServRang.forEach(o => {
      o.dateFrom = dateService.shiftDate(o.dateFrom)
      o.dateTo = dateService.shiftDate(o.dateTo)
    })
    if (publServRang.length) {
      let dictSalaryRank = UB.Repository('hr_dictSalaryRank')
        .attrs(['ID', 'dictRankID', 'paySum', 'dateFrom', 'dateTo'])
        .where('dictRankID', 'in', publServRang.map(o => o.dictRankID))
        .orderBy('dateFrom')
        .selectAsObject()
      dictSalaryRank.forEach(o => {
        o.dateFrom = dateService.shiftDate(o.dateFrom)
        o.dateTo = dateService.shiftDate(o.dateTo)
      })
      publServRang.forEach(row => {
        const salaryRank = dictSalaryRank.filter(o => o.dictRankID === row.dictRankID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
        salaryRank.forEach(rank => {
          result.salaryRank.push({
            ID: row.ID,
            dictRankID: row.dictRankID,
            paySum: rank.paySum,
            dateFrom: rank.dateFrom >= row.dateFrom ? rank.dateFrom : row.dateFrom,
            dateTo: rank.dateTo <= row.dateTo ? rank.dateTo : row.dateTo
          })
        })
      })
      dictSalaryRank = null
    }
    if (result.employeeNumber.dateFrom < dateFrom || result.employeeNumber.dateFrom.getDate() === 1) {
      result.employeeNumber.startWork = result.employeeNumber.dateFrom
    } else {
      let startWork = dateService.shiftDate(result.employeeNumber.dateFrom)
      let date = dateService.firstDayOfMonth(startWork)
      let isHoliday = true
      for (let day = date.getDate(); day < startWork.getDate(); day++) {
        const timeSheetDay = result.timeSheets.find(o => o.dateWork.getTime() === date.getTime())
        if (!timeSheetDay || timeSheetDay.normTimeCostType !== 'FREE') {
          isHoliday = false
        }
        date = dateService.addDays(date, 1)
      }
      result.employeeNumber.startWork = isHoliday ? dateService.firstDayOfMonth(startWork) : result.employeeNumber.dateFrom
    }
    if (result.employeeNumber.dateTo > dateTo || result.employeeNumber.dateTo.getDate() === dateService.lastDayOfMonth(result.employeeNumber.dateTo).getDate()) {
      result.employeeNumber.finishWork = result.employeeNumber.dateTo
    } else {
      let finishWork = dateService.lastDayOfMonth(result.employeeNumber.dateTo)
      let date = dateService.addDays(result.employeeNumber.dateTo, 1)
      let isHoliday = true
      for (let day = date.getDate(); day <= finishWork.getDate(); day++) {
        const timeSheetDay = result.timeSheets.find(o => o.dateWork.getTime() === date.getTime())
        if (!timeSheetDay || timeSheetDay.normTimeCostType !== 'FREE') {
          isHoliday = false
        }
        date = dateService.addDays(date, 1)
      }
      result.employeeNumber.finishWork = isHoliday ? finishWork : result.employeeNumber.dateTo
    }
    if (result.employeePositions.length) {
      result.employeePositions[0].dateFrom = result.employeeNumber.startWork
    }

    getEmpTariffingData(cont, result, dateFrom, dateTo)

    result.employeeKpi = []
    if ((cont && cont.constants) ? cont.constants.hrKPI : settingsService.getByCode('hrKPI', result.employeeNumber.orgID)) {
      result.employeeKpi = UB.Repository('hr_employeeKpi')
        .attrs(['ID', 'dateFrom', 'dateTo', 'KPI'])
        .where('employeeNumberID', '=', employeeNumberID)
        .orderBy('dateFrom')
        .selectAsObject()
      result.employeeKpi.forEach(o => {
        o.dateFrom = dateService.shiftDate(o.dateFrom)
        o.dateTo = dateService.shiftDate(o.dateTo)
      })
    }
  }
  return result
}

function loadSecondJobs (orgID, cont, employeeNumberID) {
  if (!cont.secJobs) {
    cont.secJobs = {}
  }
  if (!employeeNumberID || !cont.emp[employeeNumberID] || cont.secJobs[cont.emp[employeeNumberID].prop.employeeNumber.employeeID]) {
    return
  }
  const secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'employeeID', 'employeeNumberID.orgID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
      'employeeNumberID.payOutID', 'employeeNumberID.personalAccount', 'dateFrom', 'dateTo'])
    .where('organizationID', '=', orgID)
    .where('employeeID', '=', cont.emp[employeeNumberID].prop.employeeNumber.employeeID)
    .where('employeeNumberID.employeeID', '=', cont.emp[employeeNumberID].prop.employeeNumber.employeeID)
    .where('workPlace', '=', '2')
    .where('employeeNumberID', '!=', employeeNumberID)
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .selectAsObject()
  secondaryJobsNumbers.forEach(row => {
    if (!cont.secJobs[row.employeeID]) {
      cont.secJobs[row.employeeID] = []
    }
    if (!cont.secJobs[row.employeeID].find(o => o.employeeNumberID === row.employeeNumberID)) {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      row['employeeNumberID.dateFrom'] = dateService.shiftDate(row['employeeNumberID.dateFrom'])
      row['employeeNumberID.dateTo'] = dateService.shiftDate(row['employeeNumberID.dateTo'])
      cont.secJobs[row.employeeID].push(row)
    }
  })
}
function loadWorkPlace (orgID, cont, employeeNumberID) {
  const result = []
  if (!employeeNumberID || !cont.emp[employeeNumberID]) {
    return result
  }
  const secondaryJobsNumbers = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'employeeID', 'orgID', 'dateFrom', 'dateTo',
      'payOutID', 'personalAccount', 'empWorkPlace'])
    .where('mainEmpNumberID', '=', employeeNumberID)
    .where('orgID', '=', orgID)
    .where('empWorkPlace', '=', '5')
    .selectAsObject({
      'ID': 'employeeNumberID',
      'orgID': 'employeeNumberID.orgID',
      'dateFrom': 'employeeNumberID.dateFrom',
      'dateTo': 'employeeNumberID.dateTo',
      'payOutID': 'employeeNumberID.payOutID',
      'personalAccount': 'employeeNumberID.personalAccount'
    })
  secondaryJobsNumbers.forEach(row => {
    if (!result.find(o => o.employeeNumberID === row.employeeNumberID)) {
      row['employeeNumberID.dateFrom'] = dateService.shiftDate(row['employeeNumberID.dateFrom'])
      row['employeeNumberID.dateTo'] = dateService.shiftDate(row['employeeNumberID.dateTo'])
      result.push(row)
    }
  })
  return result
}
function getParentEmpNumberIDs (employeeNumberID, empNumbers) {
  const emp = UB.Repository('hr_employeeNumberS')
    .attrs('parentEmpNumberID', 'parentEmpNumberID.orgID', 'parentEmpNumberID.dateFrom', 'parentEmpNumberID.dateTo',
      'parentEmpNumberID.empWorkPlace', 'parentEmpNumberID.empDictPositionID', 'parentEmpNumberID.mainEmpNumberID')
    .selectById(employeeNumberID)
  if (emp && emp['parentEmpNumberID']) {
    empNumbers.push({
      employeeNumberID: emp['parentEmpNumberID'],
      dateFrom: dateService.shiftDate(emp['parentEmpNumberID.dateFrom']),
      dateTo: dateService.shiftDate(emp['parentEmpNumberID.dateTo']),
      orgID: emp['parentEmpNumberID.orgID'],
      empWorkPlace: emp['parentEmpNumberID.empWorkPlace'],
      empDictPositionID: emp['parentEmpNumberID.empDictPositionID'],
      mainEmpNumberID: emp['parentEmpNumberID.mainEmpNumberID']
    })
    getParentEmpNumberIDs(emp['parentEmpNumberID'], empNumbers)
  }
}

function loadEmployeeTimeSheet ({ cont, empNumbers, dateFrom, dateTo, dictTimeCostExclude }) {
  let result = {}
  if (!dictTimeCostExclude) {
    dictTimeCostExclude = dictTimeCostExclude = (cont && cont.dict && cont.dict.hr_dictTimeCost)
      ? (cont.dict.hr_dictTimeCost.find(o => o.code === entityBaseService.langCodei18n('Ні')) || {}).ID
      : UB.Repository('hr_dictTimeCost').attrs(['ID']).where('[code]', '=', entityBaseService.langCodei18n('Ні')).limit(1).selectScalar()
  }
  const store = UB.DataStore('tim_timeSheet')
  store.runSQL(`SELECT A01.ID,A01.employeeNumberID,A01.dateWork,A01.planHour,A01.planTimeCostID,A01.factTimeCostID,
    A01.factHour,A01.factHourNight,A01.isCorrection,A01.factHourEvening, A04.timeCostType,A01.mtCount,A01.orderID, 
    A01.planHourNight,A01.planHourEvening,A05.timeCostType, A05.isFactHour, wh.isDayAsPlan, A01.factHourHarmful, 
    A01.typeSheetChange, wh.isSummarized, wh.periodSummarized, A01.factHourDop, A01.normMonthDay, A01.normMonthHour,
    A01.normHour, A06.timeCostType,A01.planMonthDay,A01.planMonthHour,A01.normTimeCostID,A01.factHourPlus
    FROM tim_timeSheet A01 LEFT JOIN hr_dictTimeCost A04 ON A04.ID=A01.planTimeCostID
    LEFT JOIN hr_dictTimeCost A05 ON A05.ID=A01.factTimeCostID LEFT JOIN tim_plan pl ON pl.ID = A01.planID 
    LEFT JOIN hr_workSchedule wh ON wh.ID = pl.workScheduleID LEFT JOIN hr_dictTimeCost A06 ON A06.ID=A01.normTimeCostID 
    WHERE A01.employeeNumberID${entityBaseService.getInExpression('empNumbers')}
    AND A01.isActive=1 AND A01.dateWork>= :dateFrom: AND A01.dateWork<=:dateTo:  AND A01.mi_deleteDate >= '9999-12-31' ORDER BY 3 ASC`,
  {
    empNumbers,
    dateFrom: dateFrom,
    dateTo: dateService.lastDayOfMonth(dateTo)
  })
  result.timeSheets = store.getAsJsArray()
  store.freeNative()
  result.timeSheets.data.forEach(row => {
    const dateWork = dateService.shiftDate(row[2])
    if (!cont.emp[row[1]].prop.parentEmpNumbers.length || dictTimeCostExclude !== row[5] || dateWork >= cont.emp[row[1]].prop.employeeNumber.dateFrom) {
      cont.emp[row[1]].prop.timeSheets.push({
        ID: row[0],
        employeeNumberID: row[1],
        dateWork,
        planHour: row[3],
        planTimeCostID: row[4],
        factTimeCostID: row[5],
        factHour: row[6],
        factHourNight: row[7],
        isCorrection: row[8],
        factHourEvening: row[9],
        timeCostType: row[10],
        planTimeCostType: row[10],
        mtCount: row[11],
        orderID: row[12],
        planHourNight: row[13],
        planHourEvening: row[14],
        factTimeCostType: row[15],
        isFactHour: row[16],
        isDayAsPlan: row[17],
        factHourHarmful: row[18],
        typeSheetChange: row[19],
        isSummarized: row[20],
        periodSummarized: row[21],
        factHourDop: row[22],
        normMonthDay: row[23],
        normMonthHour: row[24],
        normHour: row[25],
        normTimeCostType: row[26],
        planMonthDay: row[27],
        planMonthHour: row[28],
        normTimeCostID: row[29],
        factHourPlus: row[30]
      })
    }
  })
  return result
}

function loadEmployeeData ({ orgID, cont = {}, employeeNumbers = [], dateFrom, dateTo, skipSecondJobs = false, skipParentEmployee = false, entityList = [] }) {
  if (!cont.emp) { cont.emp = {} }
  const result = {}
  if (!employeeNumbers.length) { return }
  const useTariffing = (cont && cont.constants) ? cont.constants.hrTariffingEducational : settingsService.getByCode('hrTariffingEducational', orgID)
  const selectEmpNumbers = typeof employeeNumbers[0] === 'object' ? employeeNumbers.map(o => o.employeeNumberID) : employeeNumbers
  result.employeeNumber = UB.Repository('hr_employeeNumberS')
    .attrs(['ID', 'employeeID', 'orgID', 'dateFrom', 'dateTo', 'payOutID', 'personalAccount', 'parentEmpNumberID', 'description', 'empWorkPlace', 'empDictPositionID', 'mainEmpNumberID'])
    .where('ID', 'in', selectEmpNumbers).selectAsObject()
  const empNumbers = []
  const empNumberTariff = []
  const employeeIDs = []
  const employeeIDNumID = {}
  result.employeeNumber.forEach(row => {
    const parentEmpNumbers = []
    if (!skipParentEmployee && row['parentEmpNumberID']) {
      getParentEmpNumberIDs(row.ID, parentEmpNumbers)
    }
    cont.emp[row.ID] = {
      prop: {
        employeePositions: [],
        employeeAccruals: [],
        employeeRetentions: [],
        payPermDisable: [],
        timeSheets: [],
        experience: [],
        experienceDt: [],
        employeeTaxLimit: [],
        employeeDisability: [],
        employeeBenefits: [],
        salaryRank: [],
        workBookDet: [],
        parentEmpNumbers: parentEmpNumbers,
        useTariffing: useTariffing,
        tariffingAccruals: [],
        unionTariffingAccruals: []
      }
    }
    parentEmpNumbers.forEach(par => {
      cont.emp[par.employeeNumberID] = {
        prop: {
          employeePositions: [],
          employeeAccruals: [],
          employeeRetentions: [],
          payPermDisable: [],
          timeSheets: [],
          experience: [],
          experienceDt: [],
          employeeTaxLimit: [],
          employeeDisability: [],
          employeeBenefits: [],
          salaryRank: [],
          workBookDet: [],
          parentEmpNumbers: [],
          useTariffing: useTariffing,
          tariffingAccruals: [],
          unionTariffingAccruals: []
        }
      }
      empNumbers.push(par.employeeNumberID)
      empNumberTariff.push({
        employeeNumberID: par.employeeNumberID,
        empWorkPlace: par.empWorkPlace,
        empDictPositionID: par.empDictPositionID,
        mainEmpNumberID: par.mainEmpNumberID
      })
    })
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    cont.emp[row.ID].prop.employeeNumber = row
    empNumbers.push(row.ID)
    empNumberTariff.push({
      employeeNumberID: row.employeeNumberID,
      empWorkPlace: row.empWorkPlace,
      empDictPositionID: row.empDictPositionID,
      mainEmpNumberID: row.mainEmpNumberID
    })
    employeeIDs.push(row.employeeID)
    if (!employeeIDNumID[row.employeeID]) {
      employeeIDNumID[row.employeeID] = []
    }
    employeeIDNumID[row.employeeID].push(row.ID)
  })
  if (!cont.secJobs) {
    cont.secJobs = {}
  }
  if (!skipSecondJobs) {
    result.secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'employeeID', 'employeeNumberID.orgID', 'employeeNumberID.dateFrom', 'employeeNumberID.dateTo',
        'employeeNumberID.payOutID', 'employeeNumberID.personalAccount', 'dateFrom', 'dateTo', 'employeeNumberID.description',
        'employeeNumberID.empWorkPlace', 'employeeNumberID.empDictPositionID', 'employeeNumberID.mainEmpNumberID'])
      .where('employeeID', 'in', employeeIDs)
      .where('organizationID', '=', orgID)
      .where('workPlace', '=', '2')
      .selectAsObject()
    result.secondaryJobsNumbers.forEach(row => {
      if (!cont.secJobs[row.employeeID]) {
        cont.secJobs[row.employeeID] = []
      }
      if (!cont.secJobs[row.employeeID].find(o => o.employeeNumberID === row.employeeNumberID)) {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        row['employeeNumberID.dateFrom'] = dateService.shiftDate(row['employeeNumberID.dateFrom'])
        row['employeeNumberID.dateTo'] = dateService.shiftDate(row['employeeNumberID.dateTo'])
        cont.secJobs[row.employeeID].push(row)
        if (!cont.emp[row.employeeNumberID]) {
          empNumbers.push(row.employeeNumberID)
          empNumberTariff.push({
            employeeNumberID: row.employeeNumberID,
            empWorkPlace: row.empWorkPlace,
            empDictPositionID: row.empDictPositionID,
            mainEmpNumberID: row.mainEmpNumberID
          })
          cont.emp[row.employeeNumberID] = {
            prop: {
              employeePositions: [],
              employeeAccruals: [],
              employeeRetentions: [],
              payPermDisable: [],
              timeSheets: [],
              experience: [],
              experienceDt: [],
              employeeTaxLimit: [],
              employeeDisability: [],
              employeeBenefits: [],
              salaryRank: [],
              workBookDet: [],
              parentEmpNumbers: [],
              useTariffing,
              tariffingAccruals: [],
              unionTariffingAccruals: []
            }
          }
          cont.emp[row.employeeNumberID].prop.employeeNumber = {
            ID: row.employeeNumberID,
            employeeID: row.employeeID,
            orgID: row['employeeNumberID.orgID'],
            dateFrom: row['employeeNumberID.dateFrom'],
            dateTo: row['employeeNumberID.dateTo'],
            payOutID: row['employeeNumberID.payOutID'],
            personalAccount: row['employeeNumberID.personalAccount'],
            description: row['employeeNumberID.description'],
            empWorkPlace: row['employeeNumberID.empWorkPlace'],
            empDictPositionID: row['employeeNumberID.empDictPositionID'],
            mainEmpNumberID: row['employeeNumberID.mainEmpNumberID']
          }
          employeeIDNumID[row.employeeID].push(row.employeeNumberID)
        }
      }
    })
  }
  if (!entityList.length || entityList.includes('employeePosition')) {
    result.employeePositions = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'organizationID', 'departmentID', 'positionID', 'dateFrom', 'dateTo',
        'workScheduleID', 'mtCount', 'dictStaffCatID', 'workerType', 'workPlace', 'dictFundSourceID', 'fundSources', 'dictCategoryECBID',
        'contractType', 'dictContractKindID', 'dictTarifCoeffID', 'payElID', 'accrualSum', 'raiseSalary', 'isIndex',
        'dictPositionID', 'accountID', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
        'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value', 'dictStaffCatID.accCategory'
      ])
      .where('employeeNumberID', 'in', empNumbers)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeePositions.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      cont.emp[row.employeeNumberID].prop.employeePositions.push(row)
      if (row.fundSources) {
        row.fundSources = JSON.parse(row.fundSources)
      }
      if (row.workScheduleID && cont && cont.dict && cont.dict.hr_workSchedule) {
        const workSchedule = cont.dict.hr_workSchedule.find(o => o.ID === row.workScheduleID)
        if (workSchedule) {
          row.isSummarized = workSchedule.isSummarized
          row.periodSummarized = workSchedule.periodSummarized
        }
      }
    })
  }
  if (!entityList.length || entityList.includes('employeeAccrual')) {
    result.employeeAccruals = UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'accrualRate',
        'orderID', 'dictFundSourceID', 'accountID', 'accrualParams', 'limitSum', 'remindSum',
        'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9',
        'd0Value', 'd1Value', 'd2Value', 'd3Value', 'd4Value', 'd5Value', 'd6Value', 'd7Value', 'd8Value', 'd9Value'])
      .where('employeeNumberID', 'in', empNumbers)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeAccruals.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      cont.emp[row.employeeNumberID].prop.employeeAccruals.push(row)
    })
  }
  if (!entityList.length || entityList.includes('employeeRetentions')) {
    result.employeeRetentions = UB.Repository('hr_payRetention')
      .attrs(['ID', 'employeeNumberID', 'dateFrom', 'dateTo', 'payElID', 'rate', 'baseSum', 'paymentMethod',
        'bankID', 'employeeFamilyID', 'employeeFamilyID.peopleID.birthDate', 'maxRate', 'minRate', 'debtSum', 'remindSum',
        'dateIdxFrom'])
      .where('employeeNumberID', 'in', empNumbers)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeRetentions.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      cont.emp[row.employeeNumberID].prop.employeeRetentions.push(row)
    })
  }
  if (!entityList.length || entityList.includes('payPermDisable')) {
    result.payPermDisable = UB.Repository('hr_payPermDisable')
      .attrs(['payPermID', 'employeeNumberID'])
      .where('employeeNumberID', 'in', empNumbers)
      .selectAsObject()
    result.payPermDisable.forEach(row => {
      cont.emp[row.employeeNumberID].prop.payPermDisable.push(row)
    })
  }
  if (!entityList.length || entityList.includes('timeSheet')) {
    const dictTimeCostExclude = UB.Repository('hr_dictTimeCost')
      .attrs(['ID'])
      .where('[code]', '=', entityBaseService.langCodei18n('Ні'))
      .limit(1)
      .selectScalar()
    result.timeSheets = loadEmployeeTimeSheet({ cont, empNumbers, dateFrom, dateTo, dictTimeCostExclude })
    result.employeeNumber.forEach(row => {
      if (cont.emp[row.ID].prop.parentEmpNumbers.length) {
        cont.emp[row.ID].prop.parentEmpNumbers.forEach(par => {
          cont.emp[par.employeeNumberID].prop.timeSheets.forEach(ts => {
            if (dictTimeCostExclude !== ts.factTimeCostID) {
              ts.employeeNumberID = row.ID
              cont.emp[row.ID].prop.timeSheets.push(ts)
            }
          })
        })
      }
    })
  }
  result.employeeNumber.forEach(row => {
    if (cont.emp[row.ID].prop.parentEmpNumbers.length) {
      cont.emp[row.ID].prop.parentEmpNumbers.forEach(par => {
        delete cont.emp[par.employeeNumberID]
      })
    }
  })
  if (!entityList.length || entityList.includes('employeeExperience')) {
    const experience = UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'dictExperienceID', 'calcDate', 'employeeNumberID', 'employeeID', 'startCalcDate'])
      .where('employeeID', 'in', employeeIDs)
      .where('employeeNumberID', 'in', empNumbers, 'empNum')
      .where('employeeNumberID', 'isNull', undefined, 'empNumNull')
      .where('dictExperienceID.mi_deleteDate', '>=', '#maxdate')
      .logic('([empNum] OR [empNumNull])')
      .orderBy('dictExperienceID')
      .orderByDesc('employeeNumberID')
      .selectAsObject()

    const experienceDetails = UB.Repository('hr_employeeExperienceDt')
      .attrs(['ID', 'employeeExperienceID.employeeID', 'employeeExperienceID.employeeNumberID',
        'employeeExperienceID.dictExperienceID', 'dateFrom', 'dateTo', 'koef'])
      .where('employeeExperienceID', 'in', experience.map(o => o.ID))
      .where('employeeExperienceID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'employeeExperienceID.dictExperienceID': 'dictExperienceID',
        'employeeExperienceID.employeeID': 'employeeID',
        'employeeExperienceID.employeeNumberID': 'employeeNumberID'
      })
    experience.forEach(row => {
      row.calcDate = dateService.shiftDate(row.calcDate)
      if (row.employeeNumberID) {
        if (cont.emp[row.employeeNumberID]) {
          cont.emp[row.employeeNumberID].prop.experience.push(row)
          experienceDetails.filter(o => o.employeeNumberID === row.employeeNumberID && o.dictExperienceID === row.dictExperienceID).forEach(det => {
            cont.emp[row.employeeNumberID].prop.experienceDt.push(det)
          })
        }
      } else if (employeeIDNumID[row.employeeID]) {
        employeeIDNumID[row.employeeID].forEach(numID => {
          if (cont.emp[numID] && !cont.emp[numID].prop.experience.find(o => o.dictExperienceID === row.dictExperienceID)) {
            cont.emp[numID].prop.experience.push(row)
            experienceDetails.filter(o => o.employeeID === row.employeeID && o.dictExperienceID === row.dictExperienceID).forEach(det => {
              cont.emp[numID].prop.experienceDt.push(det)
            })
          }
        })
      }
    })
  }
  if (!entityList.length || entityList.includes('employeeTaxLimit')) {
    result.employeeTaxLimit = UB.Repository('hr_employeeTaxLimit')
      .attrs(['ID', 'dateFrom', 'dateTo', 'taxLimitID', 'amountChild', 'taxLimitID.taxLimitType',
        'taxLimitID.size', 'taxLimitID.maxBase', 'taxLimitID.dateFrom', 'taxLimitID.dateTo', 'employeeNumberID'])
      .where('employeeNumberID', 'in', empNumbers)
      .selectAsObject()
    result.employeeTaxLimit.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      row['taxLimitID.dateFrom'] = dateService.shiftDate(row['taxLimitID.dateFrom'])
      row['taxLimitID.dateTo'] = dateService.shiftDate(row['taxLimitID.dateTo'])
      if (cont.emp[row.employeeNumberID]) {
        cont.emp[row.employeeNumberID].prop.employeeTaxLimit.push(row)
      }
    })
  }
  if (!entityList.length || entityList.includes('employeeDisability')) {
    result.employeeDisability = UB.Repository('hr_employeeDisability')
      .attrs(['ID', 'disabilityID', 'disabilityGroup', 'dateFrom', 'dateTo', 'employeeID'])
      .where('employeeID', 'in', employeeIDs)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeDisability.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      if (employeeIDNumID[row.employeeID]) {
        employeeIDNumID[row.employeeID].forEach(numID => {
          cont.emp[numID].prop.employeeDisability.push(row)
        })
      }
    })
  }

  if (!entityList.length || entityList.includes('employeeBenefits')) {
    result.employeeBenefits = UB.Repository('hr_employeeBenefits')
      .attrs(['ID', 'dictBenefitsKindID', 'employeeFamilyID', 'coef', 'avgSum', 'employeeDisabilityID', 'dateFrom', 'dateTo', 'employeeID'])
      .where('employeeID', 'in', employeeIDs)
      .orderBy('dateFrom')
      .selectAsObject()
    result.employeeBenefits.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      if (employeeIDNumID[row.employeeID]) {
        employeeIDNumID[row.employeeID].forEach(numID => {
          cont.emp[numID].prop.employeeBenefits.push(row)
        })
      }
    })
  }
  if (!entityList.length || entityList.includes('salaryRank')) {
    result.salaryRank = []
    const dictSalaryRank = UB.Repository('hr_dictSalaryRank')
      .attrs(['ID', 'dictRankID', 'paySum', 'dateFrom', 'dateTo'])
      .orderBy('dateFrom')
      .selectAsObject()
    dictSalaryRank.forEach(o => {
      o.dateFrom = dateService.shiftDate(o.dateFrom)
      o.dateTo = dateService.shiftDate(o.dateTo)
    })
    const publServRang = UB.Repository('hr_publServRang')
      .attrs(['ID', 'dictRankID', 'dateFrom', 'dateTo', 'employeeID'])
      .where('employeeID', 'in', employeeIDs)
      .orderBy('dateFrom')
      .selectAsObject()
    publServRang.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      if (employeeIDNumID[row.employeeID]) {
        employeeIDNumID[row.employeeID].forEach(numID => {
          const salaryRank = dictSalaryRank.filter(o => o.dictRankID === row.dictRankID && o.dateFrom <= row.dateTo && o.dateTo >= row.dateFrom)
          salaryRank.forEach(rank => {
            cont.emp[numID].prop.salaryRank.push({
              ID: row.ID,
              dictRankID: row.dictRankID,
              paySum: rank.paySum,
              dateFrom: rank.dateFrom >= row.dateFrom ? rank.dateFrom : row.dateFrom,
              dateTo: rank.dateTo <= row.dateTo ? rank.dateTo : row.dateTo
            })
          })
        })
      }
    })
  }

  if (!entityList.length || entityList.includes('workBookDet')) {
    const employeeWorkbookDet = UB.Repository('hr_employeeWorkbookDt')
      .attrs(['ID', 'dateFrom', 'dateTo', 'dictExperienceID', 'coefficient', 'employeeWorkbookID.employeeID'])
      .where('employeeWorkbookID.employeeID', 'in', employeeIDs)
      .orderBy('dateFrom')
      .selectAsObject({
        'employeeWorkbookID.employeeID': 'employeeID'
      })
    employeeWorkbookDet.forEach(row => {
      row.dateFrom = dateService.shiftDate(row.dateFrom)
      row.dateTo = dateService.shiftDate(row.dateTo)
      if (employeeIDNumID[row.employeeID]) {
        employeeIDNumID[row.employeeID].forEach(numID => {
          cont.emp[numID].prop.workBookDet.push(row)
        })
      }
    })
  }
  Object.keys(cont.emp).forEach(employeeNumberID => {
    if (cont.emp[employeeNumberID] && cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.employeeNumber) {
      calcEmpStartWork(employeeNumberID, dateFrom, cont)
      if (cont.emp[employeeNumberID].prop.employeeNumber.dateTo > dateTo ||
        cont.emp[employeeNumberID].prop.employeeNumber.dateTo.getDate() === dateService.lastDayOfMonth(cont.emp[employeeNumberID].prop.employeeNumber.dateTo).getDate()) {
        cont.emp[employeeNumberID].prop.employeeNumber.finishWork = cont.emp[employeeNumberID].prop.employeeNumber.dateTo
      } else {
        let finishWork = dateService.lastDayOfMonth(cont.emp[employeeNumberID].prop.employeeNumber.dateTo)
        let date = dateService.addDays(cont.emp[employeeNumberID].prop.employeeNumber.dateTo, 1)
        let isHoliday = true
        for (let day = date.getDate(); day <= finishWork.getDate(); day++) {
          const timeSheetDay = cont.emp[employeeNumberID].prop.timeSheets.find(o => o.dateWork.getTime() === date.getTime())
          if (!timeSheetDay || timeSheetDay.normTimeCostType !== 'FREE') {
            isHoliday = false
          }
          date = dateService.addDays(date, 1)
        }
        cont.emp[employeeNumberID].prop.employeeNumber.finishWork = isHoliday ? finishWork : cont.emp[employeeNumberID].prop.employeeNumber.dateTo
      }
      if (cont.emp[employeeNumberID].prop.employeePositions.length) {
        cont.emp[employeeNumberID].prop.employeePositions[0].dateFrom = cont.emp[employeeNumberID].prop.employeeNumber.startWork
      }
    }
  })
  if (useTariffing) {
    if (!entityList.length || entityList.includes('tariffingAccruals')) {
      const minDateFrom = dateService.addMonths(dateFrom, -18)
      const { tariffingAccruals, unionTariffingAccruals } = loadTariffingAccruals(empNumberTariff, minDateFrom, dateTo)
      result.tariffingAccruals = tariffingAccruals
      result.unionTariffingAccruals = unionTariffingAccruals
      tariffingAccruals.forEach(row => {
        const emp = empNumberTariff.find(o => o.mainEmpNumberID === row.employeeNumberID && o.empDictPositionID === row.dictPositionID && o.empWorkPlace === '5')
        if (emp && cont.emp[emp.employeeNumberID]) {
          row.employeeNumberID = emp.employeeNumberID
          cont.emp[emp.employeeNumberID].prop.tariffingAccruals.push(row)
        }
      })
      unionTariffingAccruals.forEach(row => {
        const emp = empNumberTariff.find(o => o.mainEmpNumberID === row.employeeNumberID && o.empDictPositionID === row.dictPositionID && o.empWorkPlace === '5')
        if (emp && cont.emp[emp.employeeNumberID]) {
          row.employeeNumberID = emp.employeeNumberID
          cont.emp[row.employeeNumberID].prop.unionTariffingAccruals.push(row)
        }
      })
    }
  }
}

function calcEmpStartWork (employeeNumberID, dateFrom, cont) {
  if (cont.emp[employeeNumberID].prop.employeeNumber) {
    if (cont.emp[employeeNumberID].prop.employeeNumber.dateFrom < dateFrom || cont.emp[employeeNumberID].prop.employeeNumber.dateFrom.getDate() === 1) {
      cont.emp[employeeNumberID].prop.employeeNumber.startWork = cont.emp[employeeNumberID].prop.employeeNumber.dateFrom
    } else {
      let startWork = dateService.shiftDate(cont.emp[employeeNumberID].prop.employeeNumber.dateFrom)
      let date = dateService.firstDayOfMonth(startWork)
      let isHoliday = true
      for (let day = date.getDate(); day < startWork.getDate(); day++) {
        const timeSheetDay = cont.emp[employeeNumberID].prop.timeSheets.find(o => o.dateWork.getTime() === date.getTime())
        if (!timeSheetDay || timeSheetDay.normTimeCostType !== 'FREE') {
          isHoliday = false
        }
        date = dateService.addDays(date, 1)
      }
      cont.emp[employeeNumberID].prop.employeeNumber.startWork = isHoliday ? dateService.firstDayOfMonth(startWork) : cont.emp[employeeNumberID].prop.employeeNumber.dateFrom
    }
  }
}

function recalcEmpStartWork (employeeNumberID, dateFrom, cont) {
  if (cont.emp[employeeNumberID].prop && cont.emp[employeeNumberID].prop.parentEmpNumbers.length) {
    cont.emp[employeeNumberID].prop.parentEmpNumbers.forEach(par => {
      cont.emp[employeeNumberID].prop.employeeNumber.dateFrom = dateService.shiftDate(Math.min(par.dateFrom, cont.emp[employeeNumberID].prop.employeeNumber.dateFrom))
    })
    calcEmpStartWork(employeeNumberID, dateFrom, cont)
  }
}

function getEmpByTabNum (ID, tabNum, orgID, excludeEmployeeID) {
  const employee = UB.Repository('hr_employeeNumberS')
    .attrs(['description'])
    .where('orgID', '=', orgID)
    .where('tabNum', '=', tabNum)
    .where('ID', '!=', ID)
    .whereIf(excludeEmployeeID, 'employeeID', '!=', excludeEmployeeID)
    .limit(1)
    .selectSingle()
  return employee
}

function getEmpTariffingData (cont, result, dateFrom, dateTo) {
  result.tariffingAccruals = []
  result.unionTariffingAccruals = []
  result.useTariffing = false
  if ((cont && cont.constants) ? cont.constants.hrTariffingEducational : settingsService.getByCode('hrTariffingEducational', result.employeeNumber.orgID)) {
    result.useTariffing = true
    if (result.employeeNumber.empWorkPlace === '5' && result.employeeNumber.mainEmpNumberID) {
      result.tariffingAccruals = UB.Repository('trf_accrual')
        .attrs(['positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.workPlaceID.employeeNumberID',
          'payElID', 'payElID.methodID.code', 'positionID.workPlaceID.dateFrom', 'positionID.workPlaceID.dateTo', 'accrualSum', 'rate',
          'positionID.workPlaceID', 'positionID.dictFundSourceID', 'baseSum', 'flagsFix', 'accrualRate',
          'positionID.workNormID', 'positionID.workNormID.weekHours', 'hours', 'positionID.dictProgClassID', 'positionID.dictPositionID',
          'positionID.posIndex', 'dictPupilID', 'positionID.rate'
        ])
        .where('positionID.workPlaceID.employeeNumberID', '=', result.employeeNumber.mainEmpNumberID)
        .where('positionID.dictPositionID', '=', result.employeeNumber.empDictPositionID)
        .where('positionID.workPlaceID.state', '=', 'POSTED')
        .where('positionID.workPlaceID.documentID.type', '=', 'FACT')
        .where('positionID.workPlaceID.dateFrom', '<=', dateTo)
        .where('positionID.workPlaceID.dateTo', '>=', dateFrom)
        .where('payElID.methodID.methodGroupID.code', 'in', ['1', '2'])
        .orderBy('payElID')
        .orderBy('positionID.workPlaceID.dateFrom')
        .selectAsObject({
          'positionID': 'ID',
          'positionID.workPlaceID.employeeNumberID.employeeID': 'employeeID',
          'positionID.workPlaceID.employeeNumberID': 'employeeNumberID',
          'positionID.workPlaceID.dateFrom': 'dateFrom',
          'positionID.workPlaceID.dateTo': 'dateTo',
          'positionID.workPlaceID': 'groupID',
          'payElID.methodID.code': 'methodCode',
          'positionID.dictFundSourceID': 'dictFundSourceID',
          'positionID.dictRankID': 'dictRankID',
          'positionID.rate': 'mtCount',
          'accrualSum': 'paySum',
          'positionID.workNormID': 'workNormID',
          'positionID.workNormID.weekHours': 'weekHours',
          'hours': 'loadHours',
          'positionID.dictProgClassID': 'dictProgClassID',
          'positionID.dictPositionID': 'dictPositionID',
          'positionID.posIndex': 'posIndex'
        })
      result.tariffingAccruals.forEach(row => {
        row.dateFrom = dateService.shiftDate(row.dateFrom)
        row.dateTo = dateService.shiftDate(row.dateTo)
        row.employeeNumberID = result.employeeNumber.ID
        normalizeTariffingAccrual(row)
        const union = !['1', '146', '147', '156'].includes(row.methodCode) ? result.unionTariffingAccruals.find(o => o.payElID === row.payElID &&
          o.dateFrom.getTime() === row.dateFrom.getTime() && o.dateTo.getTime() === row.dateTo.getTime() && row.rate === o.rate) : null
        if (!union) {
          result.unionTariffingAccruals.push(row)
        }
      })
    }
  }
}

function getChildEmpNumberIDs (employeeNumberID) {
  const emp = UB.Repository('hr_employeeNumberS')
    .attrs('ID', 'orgID')
    .where('parentEmpNumberID', '=', employeeNumberID)
    .limit(1)
    .selectSingle()
  if (emp) {
    return getChildEmpNumberIDs(emp.ID) || emp
  } else {
    return null
  }
}

function getMainPosition ({ orgID, employeeID, employeeNumberID, dateFrom, dateTo, fields }) {
  fields = fields || ['ID']
  if (employeeNumberID) {
    fields = [...fields, 'employeeID', 'workPlace']
    const empPosByEn = UB.Repository('hr_employeePositionS')
      .attrs(fields)
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('workPlace', '=', '1')
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .limit(1)
      .selectSingle()
    if (empPosByEn && empPosByEn.workPlace === '1') {
      return empPosByEn
    }
    if (!employeeID) {
      employeeID = (empPosByEn && empPosByEn.employeeID) || UB.Repository('hr_employeeNumberS')
        .attrs(['employeeID'])
        .where('ID', '=', employeeNumberID)
        .selectScalar()
    }
  }
  return UB.Repository('hr_employeePositionS')
    .attrs(fields)
    .where('organizationID', '=', orgID)
    .where('employeeID', '=', employeeID)
    .where('employeeNumberID.employeeID', '=', employeeID)
    .where('dateFrom', '<=', dateTo)
    .where('dateTo', '>=', dateFrom)
    .where('workPlace', '=', '1')
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()
}

function getAddDescriptionPerson (employeeNumberID) {
  const emp = UB.Repository('hr_employeeNumber')
    .attrs(['ID', 'employeeID', 'orgID', 'employeeID.addInfo'])
    .misc({ __mip_recordhistory_all: true })
    .selectById(employeeNumberID)
  const empPos = UB.Repository('hr_employeePositionS')
    .attrs('dictStaffCatID.name', 'dictTarifCoeffID.name', 'dictTarifCoeffID.code')
    .where('employeeNumberID', '=', employeeNumberID)
    .orderBy('dateFrom', 'desc')
    .limit(1)
    .selectSingle()

  const addParams = []
  if (emp) {
    const addDescrParam = UB.Repository('hr_addDescrPerson')
      .attrs('idxNum', 'value', 'name', 'dictFilter')
      .where('organizationID', '=', emp.orgID)
      .orderBy('idxNum')
      .selectAsObject()
    const employeeID = emp.employeeID
    addDescrParam.forEach(param => {
      let nameParam = param.name || ''
      let value
      if (param.value === 'EXTRA') {
        value = emp['employeeID.addInfo']
      }
      if (param.value === 'MILITARY_RANK') {
        const militaryRank = UB.Repository('hr_empMilitaryRanks')
          .attrs('dictMilitaryRankID.name', 'type.name', 'orderDate')
          .where('employeeID', '=', employeeID)
          .orderBy('orderDate', 'desc')
          .orderBy('mi_createDate', 'desc')
          .limit(1)
          .selectSingle()
        if (militaryRank) {
          // "<військове звання> [<вид служби>] [- <дата наказу про присвоєння>]"
          value = militaryRank['dictMilitaryRankID.name'] + (' ' + (militaryRank['type.name'] || '')).trim() + (militaryRank.orderDate ? ' - ' + dateService.formatDate(militaryRank.orderDate) : '')
          value = value.trim()
        }
      }
      if (param.value === 'EMP_CATEGORY') {
        const empCategory = UB.Repository('hr_empCertificationAcc')
          .attrs('dictEmpCategoryID.description')
          .where('employeeID', '=', employeeID)
          .orderBy('certificationDate', 'desc')
          .limit(1)
          .selectSingle()
        if (empCategory) {
          value = empCategory['dictEmpCategoryID.description']
        }
      }
      if (param.value === 'EMP_CATEGORYTERM') {
        const empCategory = UB.Repository('hr_empCertificationAcc')
          .attrs(['dictEmpCategoryID.description', 'validityDate'])
          .where('employeeID', '=', employeeID)
          .orderBy('certificationDate', 'desc')
          .limit(1)
          .selectSingle()
        if (empCategory) {
          value = `${empCategory['dictEmpCategoryID.description']}${empCategory['validityDate'] ? ` (${dateService.formatDate(empCategory['validityDate'])})` : ''}`
        }
      }
      if (param.value === 'RANK') {
        const empRank = UB.Repository('hr_publServRang')
          .attrs('dictRankID.description')
          .where('employeeID', '=', employeeID)
          .orderBy('dateFrom', 'desc')
          .limit(1)
          .selectSingle()
        if (empRank) {
          value = empRank['dictRankID.description']
        }
      }
      if (param.value === 'ACADEM_STATUS') {
        const empAcademStatus = UB.Repository('hr_empAcademStatus')
          .attrs('dictAcademStatusID.name', 'docDate')
          .where('employeeID', '=', employeeID)
          .orderBy('docDate', 'desc')
          .orderBy('mi_createDate', 'desc')
          .limit(1)
          .selectSingle()
        if (empAcademStatus) {
          value = empAcademStatus['dictAcademStatusID.name'] + (empAcademStatus.docDate ? ' - ' + dateService.formatDate(empAcademStatus.docDate) : '')
        }
      }
      if (param.value === 'DEGREE') {
        const degrees = []
        const branches = UB.Repository('hr_empRangeScience')
          .attrs('dictBranchScienceID')
          .where('employeeID', '=', employeeID)
          .groupBy('dictBranchScienceID')
          .selectAsObject()
        branches.forEach(item => {
          const empDegree = UB.Repository('hr_empRangeScience')
            .attrs('dictDegreeID.shortName', 'dictDegreeID.name', 'docDate')
            .where('employeeID', '=', employeeID)
            .where('dictBranchScienceID', '=', item.dictBranchScienceID)
            .orderBy('docDate', 'desc')
            .orderBy('mi_createDate', 'desc')
            .limit(1)
            .selectSingle()
          if (empDegree) {
            degrees.push((empDegree['dictDegreeID.shortName'] || empDegree['dictDegreeID.name']) + (empDegree.docDate ? ' - ' + dateService.formatDate(empDegree.docDate) : ''))
          }
        })
        value = degrees.join(', ')
      }
      if (param.value === 'CONTACT' && param.dictFilter) {
        const contacts = UB.Repository('hr_employeeContact')
          .attrs('contactTypeID.shortName', 'value')
          .where('employeeID', '=', employeeID)
          .where('contactTypeID', '=', param.dictFilter)
          .selectAsObject({
            'contactTypeID.shortName': 'contactName'
          })
        if (contacts.length) {
          nameParam = contacts[0].contactName + ': '
          value = contacts.map(o => o.value).join(';').trim()
        }
      }
      if (param.value === 'TARIF_COEFF') {
        if (empPos) {
          value = empPos['dictTarifCoeffID.code']
        }
      }
      if (param.value === 'STAFF_CATEGORY') {
        if (empPos) {
          value = empPos['dictStaffCatID.name']
        }
      }
      if (param.value === 'REPLACES') {
        const longTermReplace = []
        UB.Repository('hr_longTermReplace')
          .attrs('ID', 'employeeNumberAbsID.employeeID.fullFIO')
          .where('employeeNumberReplID', '=', employeeNumberID)
          .where('dateFrom', '<=', dateService.todayDate())
          .where('dateTo', '>', dateService.todayDate())
          .selectAsObject()
          .forEach(term => {
            longTermReplace.push(`заміщує ${term['employeeNumberAbsID.employeeID.fullFIO']}`)
          })
        if (longTermReplace.length) {
          value = longTermReplace.join(',')
        }
      }

      if (value) {
        addParams.push(`${nameParam}${value}`)
      }
    })
  }
  return addParams.length ? addParams.join(', ') : null
}

function updateEmployeeAddPersonDescription (employeeNumberID) {
  if (employeeNumberID) {
    const store = UB.DataStore('hr_employeeNumber')
    const addDescrPerson = getAddDescriptionPerson(employeeNumberID)
    if (addDescrPerson) {
      store.run('update', {
        __skipOptimisticLock: true,
        isImport: true,
        execParams: {
          ID: employeeNumberID,
          addDescrPerson: addDescrPerson
        }
      })
    }
  }
}

function updateAddDescriptionPerson (employeeID) {
  if (!employeeID) return
  const curDate = dateService.currentDate()
  UB.Repository('hr_employeeNumberS')
    .attrs('ID')
    .where('dateFrom', '<=', curDate)
    .where('dateTo', '>=', curDate)
    .where('employeeID', '=', employeeID)
    .selectAsObject()
    .forEach((item) => {
      updateEmployeeAddPersonDescription(item.ID)
    })
}

function normalizeTariffingAccrual (row) {
  // row.flagsRec = 0
  // row.flagsFix = 0
  if (row.flagsFix & 1 << 4) {
    // Зафіксована фактична сума у тарифікації
    // Для розрахунку від суми тарифікації, пропорційно відпрацьованого часу, без використання кількості ставок
    row.baseSum = row.paySum
    row.flagsFix |= 1 // Фіксуємо вихідну суму
    row.paySum = null
    row.mtCount = null
    row.flagsFix = (1 << 8) // Фіксуємо кількість ставок === null
    row.rate = null
  } else if (!row.paySum) {
    row.baseSum = 0
  }
  if (['143', '145', '144', '152'].includes(row.methodCode)) {
    // Для розрахунку планового заробітку getPlanSum()
    row.baseSum = row.paySum
  }
}

function getExperienceRate (payElExpData, payElID, years, months) {
  let res = 0
  const expData = payElExpData.filter(itm => itm.payElID === payElID)
  for (let i = 0; i < expData.length; i++) {
    let expItem = expData[i]
    if (years * 12 + months >= expItem.years * 12 + expItem.months) {
      res = expItem.rate || 0
      break
    }
  }
  return res
}

function getPlanSum (onDate, cont, permanentAccrual, salaryAccrual = {}, permanentAccruals, calcPayEl = [], withPrcent = false, basePlanSum = 0, withCount = false) {
  let planSum = basePlanSum * (withCount ? (salaryAccrual.mtCount || 0) : 1)
  const calcPayEls = []
  let accrualSum = salaryAccrual.basepayHour || salaryAccrual.baseSum || salaryAccrual.accrualSum || 0
  if (withCount) {
    accrualSum = accrualSum * (salaryAccrual.mtCount || 0)
  }
  if (cont.payEl[permanentAccrual.payElID].method.code === '144') {
    planSum = accrualSum
    if (cont.payEl[permanentAccrual.payElID].dictTarifCoeffID && cont.tarifData && cont.tarifData[cont.payEl[permanentAccrual.payElID].dictTarifCoeffID]) {
      planSum = cont.tarifData[cont.payEl[permanentAccrual.payElID].dictTarifCoeffID] ? cont.tarifData[cont.payEl[permanentAccrual.payElID].dictTarifCoeffID] * (withCount ? (salaryAccrual.mtCount || 0) : 1) : accrualSum
    }
  }
  calcPayEls.push(...calcPayEl)
  let rate = permanentAccrual.rate
  if (permanentAccrual.baseSum && cont.payEl[permanentAccrual.payElID].method.code !== '49') {
    return permanentAccrual.baseSum * (withCount ? (salaryAccrual.mtCount || 0) : 1)
  }
  if (['7', '8', '24'].includes(cont.payEl[permanentAccrual.payElID].method.code)) {
    return 0
  }
  // надбавка за ранг
  if (cont.payEl[permanentAccrual.payElID].method.code === '5') {
    let salRank = cont.dictSalaryRank.find(o => o.dictRankID === salaryAccrual.dictRankID)
    if (salRank && salRank.paySum) {
      return salRank.paySum * (withCount ? (salaryAccrual.mtCount || 0) : 1)
    }
  }
  // надбавка за вислугу років
  if (cont.payEl[permanentAccrual.payElID].method.code === '6') {
    if (!salaryAccrual.expData) {
      salaryAccrual.expData = []
    }
    const exp = salaryAccrual.expData.find(o => o.dictExperienceID === cont.payEl[permanentAccrual.payElID].dictExperienceID)
    if (exp) {
      rate = getExperienceRate(cont.payElExperience, permanentAccrual.payElID, exp.ymd.years, exp.ymd.months)
      permanentAccrual.rate = rate
    }
  }
  if (calcPayEls.find(o => o === permanentAccrual.payElID)) {
    return planSum
  }
  calcPayEls.push(permanentAccrual.payElID)
  const payElEntry = cont.payEl[permanentAccrual.payElID].payElEntrySum.filter(o => o.dateFrom <= onDate && o.dateTo >= onDate)
  if (payElEntry.find(o => o.payElBaseID === salaryAccrual.payElID)) {
    planSum += accrualService.round(accrualSum)
  }
  if (cont.payEl[permanentAccrual.payElID].method.code === '49') {
    rate = 0
  }

  permanentAccruals.forEach(perAccr => {
    const payEl = cont.payEl[perAccr.payElID]
    if (payEl.method.groupType === 'PAYMENT' && ![1, 6, 7, 8, 9].includes(payEl.method.groupCode) &&
      !['9', '10', '11', '50', '56', '66', '138'].includes(payEl.method.code) && permanentAccrual.payElID !== payEl.ID &&
      !calcPayEls.find(o => o === payEl.ID) && payElEntry.find(o => o.payElBaseID === payEl.ID)
    ) {
      const sum = getPlanSum(onDate, cont, perAccr, salaryAccrual, permanentAccruals, calcPayEls, true, basePlanSum, withCount)
      planSum += accrualService.round(sum)
    }
  })
  if (cont.payEl[permanentAccrual.payElID].method.code === '49') {
    const accBaseSum = salaryAccrual.mtCount !== 1 ? accrualService.round((permanentAccrual.baseSum || 0) * (salaryAccrual.mtCount || 0)) : permanentAccrual.baseSum
    planSum = salaryAccrual.mtCount !== 1 && !withCount ? accrualService.round((planSum || 0) * (salaryAccrual.mtCount || 0)) : planSum
    return planSum < accBaseSum ? accrualService.round(accBaseSum - planSum) : 0
  }
  if (withPrcent) {
    planSum = accrualService.round(planSum / 100 * (rate || 0))
  }
  return planSum
}

function loadTariffingAccruals (empNumberTariff, dateFrom, dateTo) {
  const unionTariffingAccruals = []
  const mainEmpNumbers = []
  empNumberTariff.forEach(row => {
    if (row.mainEmpNumberID && row.empWorkPlace === '5' && !mainEmpNumbers.find(o => o === row.mainEmpNumberID)) {
      mainEmpNumbers.push(row.mainEmpNumberID)
    }
  })
  const tariffingAccruals = UB.Repository('trf_accrual')
    .attrs(['positionID', 'positionID.workPlaceID.employeeNumberID.employeeID', 'positionID.workPlaceID.employeeNumberID',
      'payElID', 'payElID.methodID.code', 'positionID.workPlaceID.dateFrom', 'positionID.workPlaceID.dateTo', 'accrualSum', 'rate',
      'positionID.workPlaceID', 'positionID.dictFundSourceID', 'baseSum', 'flagsFix', 'accrualRate',
      'positionID.workNormID', 'positionID.workNormID.weekHours', 'hours', 'positionID.dictProgClassID', 'positionID.dictPositionID',
      'positionID.posIndex'
    ])
    .where('positionID.workPlaceID.employeeNumberID', 'in', mainEmpNumbers)
    // .where('[employeeNumberID.dateFrom]=[dateFrom]', 'custom')
    .where('positionID.workPlaceID.state', '=', 'POSTED')
    .where('positionID.workPlaceID.documentID.type', '=', 'FACT')
    .where('positionID.workPlaceID.dateFrom', '<=', dateTo)
    .where('positionID.workPlaceID.dateTo', '>=', dateFrom)
    .where('payElID.methodID.methodGroupID.code', 'in', ['1', '2'])
    .orderBy('positionID.workPlaceID.employeeNumberID')
    .orderBy('positionID.workPlaceID.dateFrom')
    .orderBy('payElID')
    .selectAsObject({
      'positionID': 'ID',
      'positionID.workPlaceID.employeeNumberID.employeeID': 'employeeID',
      'positionID.workPlaceID.employeeNumberID': 'employeeNumberID',
      'positionID.workPlaceID.dateFrom': 'dateFrom',
      'positionID.workPlaceID.dateTo': 'dateTo',
      'positionID.workPlaceID': 'groupID',
      'payElID.methodID.code': 'methodCode',
      'positionID.dictFundSourceID': 'dictFundSourceID',
      'positionID.dictRankID': 'dictRankID',
      'accrualRate': 'mtCount',
      'accrualSum': 'paySum',
      'positionID.workNormID': 'workNormID',
      'positionID.workNormID.weekHours': 'weekHours',
      'hours': 'loadHours',
      'positionID.dictProgClassID': 'dictProgClassID',
      'positionID.dictPositionID': 'dictPositionID',
      'positionID.posIndex': 'posIndex'
    })
  tariffingAccruals.forEach(row => {
    row.dateFrom = dateService.shiftDate(row.dateFrom)
    row.dateTo = dateService.shiftDate(row.dateTo)
    normalizeTariffingAccrual(row)
    const union = !['1', '146', '147', '156'].includes(row.methodCode) ? unionTariffingAccruals.find(o => o.payElID === row.payElID &&
      o.dateFrom.getTime() === row.dateFrom.getTime() && o.dateTo.getTime() === row.dateTo.getTime() && row.rate === o.rate) : null
    if (!union) {
      unionTariffingAccruals.push(row)
    }
  })
  return { tariffingAccruals, unionTariffingAccruals }
}

function getEmployeeKpi (cont, employeeNumberID, onDate) {
  if (!cont.emp[employeeNumberID].prop.employeeKpi || !cont.emp[employeeNumberID].prop.employeeKpi.length) return 0
  const found = cont.emp[employeeNumberID].prop.employeeKpi.find(o => o.dateFrom <= onDate && o.dateTo >= onDate) || 0
  return found ? found.KPI : 0
}

function getEmployeeNumber ({ orgID, employeeNumberID, tabNum, taxCode, dateFrom, dateTo, rowIdx }) {
  if (!employeeNumberID && !tabNum && !taxCode) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не визначено Таб.№ або РНОКПП або ID особового рахунку працівника. Запис № {0}. Уточніть параметри пошуку працівника.', rowIdx)}>>>`)
  }
  const found = UB.Repository('hr_employeeNumber')
    .attrs(['ID', 'tabNum', 'description'])
    .where('orgID', '=', orgID)
    .whereIf(employeeNumberID, 'ID', '=', employeeNumberID)
    .whereIf(tabNum, 'tabNum', '=', tabNum)
    .whereIf(taxCode, 'employeeID.taxCode', '=', taxCode)
    .whereIf(dateFrom, 'dateTo', '>=', dateFrom)
    .whereIf(dateTo, 'dateFrom', '<=', dateTo)
    .selectAsObject()
  if (found.length > 1) {
    throw new UB.UBAbort(`<<<${UB.i18n('За визначеними Таб.№ або РНОКПП знайдено більш ніж один особовий рахунок працівника. Запис № {0}. Уточніть параметри пошуку працівника.', rowIdx)}>>>`)
  }
  if (!found.length) {
    throw new UB.UBAbort(`<<<${UB.i18n('За визначеними Таб.№ або РНОКПП або ID не знайдено особовий рахунок працівника. Запис № {0}. Уточніть параметри пошуку працівника.', rowIdx)}>>>`)
  }
  return found[0]
}

function getPriorEmployeeNumber (orgID, cont, employeeNumberID, workPlace) {
  const priorTab = []
  if (!employeeNumberID || !cont.emp[employeeNumberID] || cont.secJobs[cont.emp[employeeNumberID].prop.employeeNumber.employeeID]) {
    return []
  }
  const secondaryJobsNumbers = UB.Repository('hr_employeePositionS')
    .attrs(['employeeNumberID', 'employeeNumberID.orgID'])
    .where('employeeID', '=', cont.emp[employeeNumberID].prop.employeeNumber.employeeID)
    .where('employeeNumberID.employeeID', '=', cont.emp[employeeNumberID].prop.employeeNumber.employeeID)
    .where('employeeNumberID', '!=', employeeNumberID)
    .where('employeeNumberID.dateTo', workPlace === '1' ? '<=' : '<', cont.emp[employeeNumberID].prop.employeeNumber.dateTo)
    .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
    .whereIf(!cont.constants.hrShowOtherOrgsTabNums, 'organizationID', '=', orgID)
    .where('workPlace', '!=', '2')
    .groupBy()
    .selectAsObject()
  secondaryJobsNumbers.forEach(row => {
    if (!priorTab.find(o => o.employeeNumberID === row.employeeNumberID)) {
      priorTab.push({ employeeNumberID: row.employeeNumberID, orgID: row['employeeNumberID.orgID'] })
    }
  })
  return priorTab
}

/**
 * get list of subordinates employees
 * @param employeeNumberID {Number}
 * @param onDate {Date}
 * @returns {Array}
 *
 */
function getSubordinates (employeeNumberID, onDate) {
  const result = []
  // by group
  let empGroup
  const employeeGroupList = UB.Repository('hr_employeeGroup')
    .attrs('ID', 'name', 'isAllEmployees', 'organizationID')
    .where('chiefID', '=', employeeNumberID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject()
  const isAllEmployees = employeeGroupList.find(el => el.isAllEmployees)

  if (isAllEmployees) {
    empGroup = UB.Repository('hr_employeeNumberS')
      .attrs('ID')
      .where('orgID', '=', isAllEmployees.organizationID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject({
        'ID': 'employeeNumberID'
      })
  } else {
    empGroup = UB.Repository('hr_employeeGroupDet')
      .attrs('employeeNumberID', 'employeeGroupID.name')
      .where('employeeGroupID.chiefID', '=', employeeNumberID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeeGroupID.dateFrom', '<=', onDate)
      .where('employeeGroupID.dateTo', '>=', onDate)
      .selectAsObject()
  }

  if (empGroup.length) {
    const empPosList = UB.Repository('hr_employeePositionS')
      .attrs('ID', 'employeeID', 'employeeNumberID')
      .where('employeeNumberID', 'in', empGroup.map(o => o.employeeNumberID))
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
    empPosList.forEach(row => {
      const groups = empGroup.filter(o => o.employeeNumberID === row.employeeNumberID)
      groups.forEach(grp => {
        result.push({
          employeePositionID: row.ID,
          employeeID: row.employeeID,
          employeeNumberID: row.employeeNumberID,
          description: !isAllEmployees ? grp['employeeGroupID.name'] : 'Всі працівники організації',
          source: 'group'
        })
      })
    })
  }
  const store = UB.DataStore('hr_employeePositionS')
  // by position
  const posList = []
  UB.Repository('hr_employeePositionS')
    .attrs('ID', 'employeeID', 'employeeNumberID', 'positionID')
    .where('employeeNumberID', '=', employeeNumberID)
    .where('positionID', 'isNotNull')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject().forEach(emp => {
      posList.push(emp['positionID'])
    })
  const dateCondition = entityBaseService.isMsSql()
    ? `COALESCE(act.dateFrom, CONVERT(datetime, '01.01.2000', 104)) AND COALESCE(act.dateTo, CONVERT(datetime, '31.12.9999', 104))`
    : 'COALESCE(act.dateFrom, make_timestamp(2000, 1, 1, 0, 0, 0)) AND COALESCE(act.dateTo, make_timestamp(9990, 12, 31, 0, 0, 0))'
  store.runSQL(`SELECT DISTINCT
     pos.mi_data_id as "positionID"
    FROM hr_empOrderActingDet act
      INNER JOIN hr_empOrderDet det ON det.ID = act.paraID
      INNER JOIN hr_empOrder o ON det.orderID = o.ID
      INNER JOIN hr_employeePosition empPosTemp ON empPosTemp.ID = act.employeePositionID AND empPosTemp.isActive = 1
      LEFT JOIN hr_employee empTemp ON empTemp.ID = empPosTemp.employeeID
      LEFT JOIN hr_position pos ON pos.ID = det.positionID
      LEFT JOIN hr_employeePosition empPos ON empPos.ID = det.employeePositionID AND empPos.isActive = 1
      LEFT JOIN hr_employee emp ON emp.ID = empPos.employeeID
    WHERE act.empOrderType = 'ACTING'
      AND o.orderState IN ('POSTED', 'PROCESSED')
      AND act.mi_deleteDate >= '9999-12-31' 
      and act.employeeNumberID = :employeeNumberID:
      and :onDate: BETWEEN ${dateCondition} 
  `, {
    employeeNumberID,
    onDate
  })
  store.getAsJsObject().forEach(row => {
    posList.push(row['positionID'])
  })
  UB.Repository('hr_dictTempExecution')
    .attrs('positionTempID', 'employeePositionTempID.positionID')
    .where('employeePositionID.employeeNumberID', '=', employeeNumberID)
    .where('employeePositionID.isActive', '=', 1)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectAsObject().forEach(row => {
      if (row['employeePositionTempID.positionID']) {
        posList.push(row['employeePositionTempID.positionID'])
      } else if (row['positionTempID']) {
        posList.push(row['positionTempID'])
      }
    })

  if (posList.length) {
    const depIDs = []
    const depSubordinated = UB.Repository('hr_department')
      .attrs('ID', 'mi_data_id', 'mi_treePath')
      .where('positionChiefID', 'in', posList)
      .misc({ __mip_ondate: onDate })
      .selectAsObject()
    depSubordinated.forEach(row => {
      const departments = UB.Repository('hr_department')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', onDate)
        .where('mi_dateTo', '>=', onDate)
        .where('mi_treePath', 'startsWith', row.mi_treePath)
        .misc({ __mip_recordhistory_all: true })
        .groupBy('mi_data_id')
        .selectAsArrayOfValues()
      depIDs.push(...departments)
    })
    if (depIDs.length) {
      const empPosList = UB.Repository('hr_employeePositionS')
        .attrs('ID', 'employeeID', 'employeeNumberID', 'depName')
        .where('departmentID', 'in', depIDs)
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .where('employeeNumberID', '!=', employeeNumberID)
        .selectAsObject()
      empPosList.forEach(row => {
        result.push({
          employeePositionID: row.ID,
          employeeID: row.employeeID,
          employeeNumberID: row.employeeNumberID,
          description: row.depName,
          source: 'position'
        })
      })
    }
  }
  return result
}
