/* eslint-disable no-tabs */
const UB = require('@unitybase/ub')
const dateService = require('../../AC/modules/dataServices/dateService')
const selectService = require('../../AC/modules/dataServices/selectService')

module.exports = {
  getHolidays,
  getHolidayWithSql,
  getMonthCount
}

function getHolidays (dateFrom, dateTo, orgID) {
  const result = []
  dateFrom = dateService.shiftDate(dateFrom)
  dateTo = dateService.shiftDate(dateTo)
  if (!dateFrom || !dateService.isValid(dateFrom) || !dateTo || !dateService.isValid(dateTo)) {
    return result
  }
  const holidays = UB.Repository('hr_calendarHoliday')
    .attrs(['dayHoliday', 'monthHoliday.code', 'yearHoliday', 'dateFrom', 'dateTo'])
    .where('yearHoliday', '>=', dateFrom.getFullYear(), 'yearFrom')
    .where('yearHoliday', '<=', dateTo.getFullYear(), 'yearTo')
    .where('yearHoliday', 'isNull', undefined, 'yearNull')
    .where('dateFrom', '<=', dateTo, 'dateFrom')
    .where('dateTo', '>=', dateFrom, 'dateTo')
    .where('dateFrom', 'isNull', undefined, 'dateFromIsNull')
    .where('dateTo', 'isNull', undefined, 'dateToIsNull')
    // condition by orgID {
    .where('excludeOrg', '=', 0, 'excOrg')
    .where('excludeOrg', '=', 1, 'inexcOrg')
    .exists(UB.Repository('hr_calendarHolidayDt')
      .correlation('calendarHolidayID', 'ID')
      .where('orgID', '=', orgID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'org'
    ).notExists(UB.Repository('hr_calendarHolidayDt')
      .correlation('calendarHolidayID', 'ID')
      .where('mi_deleteDate', '>=', '#maxdate'),
    'notOrg')
    .notExists(UB.Repository('hr_calendarHolidayDt')
      .correlation('calendarHolidayID', 'ID')
      .where('orgID', '=', orgID)
      .where('mi_deleteDate', '>=', '#maxdate'),
    'inorg'
    )
    // condition by orgID }
    .logic('(([yearFrom] and [yearTo]) or ([yearNull])) and (([dateFrom]) or [dateFromIsNull]) and (([dateTo]) or [dateToIsNull])' +
    ' AND (([org] AND [excOrg]) OR ([notOrg]) OR ([inorg] AND [inexcOrg]))' // condition by orgID
    )
    .selectAsObject()

  holidays.forEach(holiday => {
    holiday.dateFrom = (holiday.dateFrom && dateService.shiftDate(holiday.dateFrom)) || dateService.minDate()
    holiday.dateTo = (holiday.dateTo && dateService.shiftDate(holiday.dateTo)) || dateService.maxDate()
    if (holiday.yearHoliday) {
      const date = dateService.shiftDate(new Date(holiday.yearHoliday, holiday['monthHoliday.code'] - 1, holiday.dayHoliday))
      if ((dateFrom <= date) && (dateTo >= date) && !dateService.includes(result, date) && holiday.dateFrom <= date && date <= holiday.dateTo) {
        result.push(date)
      }
    } else {
      let dt = dateService.shiftDate(new Date(dateFrom.getFullYear(), holiday['monthHoliday.code'] - 1, holiday.dayHoliday))
      while (dt <= dateTo) {
        if ((dateFrom <= dt) && (dateTo >= dt) && !dateService.includes(result, dt) && holiday.dateFrom <= dt && dt <= holiday.dateTo) {
          result.push(dt)
        }
        dt = dateService.addYears(dt, 1)
      }
    }
  })

  return result
}

function getHolidayWithSql (dateFromStr, dateToStr, alias = 'holidays') {
  let pDateFrom = `'${dateFromStr}'`
  let pDateTo = `'${dateToStr}'`
  let yearFrom = selectService.getYearFn(pDateFrom)
  let yearTo = selectService.getYearFn(pDateTo)
  let concat = selectService.concatOperator()
  return `years AS
    (SELECT ${yearFrom} as yy
      UNION ALL
      SELECT yy + 1 as yy
      FROM years
      WHERE yy <= ${yearTo}),
    ${alias} AS	
      (SELECT DISTINCT dayDate
      FROM
        (SELECT h.dateFrom, h.dateTo,
          CAST(CAST(h.yearHoliday as varchar) ${concat} '-' ${concat} CAST(m.code as varchar) ${concat} '-' ${concat} CAST(h.dayHoliday as varchar) as DATE) as dayDate
        FROM hr_calendarHoliday h
          INNER JOIN ac_dictMonth m ON m.ID = h.monthHoliday
        WHERE h.yearHoliday is not null
          and h.yearHoliday between ${yearFrom} and ${yearTo}
          and h.dateTo >= '${dateFromStr}'
          and h.dateFrom <= '${dateToStr}'
          and h.mi_deleteDate >= '9999-12-31'
        UNION
        SELECT h.dateFrom, h.dateTo,
          CAST(CAST(years.yy as varchar) ${concat} '-' ${concat} CAST(m.code as varchar) ${concat} '-' ${concat} CAST(h.dayHoliday as varchar) as DATE) as dayDate
        FROM hr_calendarHoliday h
          INNER JOIN ac_dictMonth m ON m.ID = h.monthHoliday
          INNER JOIN years ON years.yy between ${yearFrom} and ${yearTo}
        WHERE
          h.yearHoliday is null
          and h.dateTo >= ${pDateFrom}
          and h.dateFrom <= ${pDateTo}
          and h.mi_deleteDate >= '9999-12-31') d
      WHERE d.dayDate between ${pDateFrom} and ${pDateTo}
        and d.dayDate between d.dateFrom and d.dateTo) 
  `
}

function getMonthCount ({ orgID, fromDate, onDate, employeeNumberID, dictStaffCatID, cont }) {
  let res = null
  if (!dictStaffCatID) {
    dictStaffCatID = UB.Repository('hr_employeePositionS')
      .attrs(['dictStaffCatID'])
      .where('employeeNumberID', '=', employeeNumberID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('isActive', '=', true)
      .selectScalar()
  }
  if (dictStaffCatID) {
    let monthCount = cont
      ? (cont.dict.hr_dictVacCompException.find(o => o.dictStaffCatID === dictStaffCatID && o.dateFrom <= onDate && o.dateTo >= onDate) || {}).monthCount
      : UB.Repository('hr_dictVacCompException')
        .attrs('monthCount')
        .where('dictStaffCatID', '=', dictStaffCatID)
        .where('dateFromNotEmpty', '<=', onDate)
        .where('dateToNotEmpty', '>=', onDate)
        .where('orgID', '=', orgID, 'orgID')
        .where('orgID', 'isNull', undefined, 'orgNull')
        .logic('([orgID] OR [orgNull])')
        .orderByDesc('orgID')
        .selectScalar()
    if (monthCount) {
      let periodMonths = dateService.monthDiff(fromDate, onDate)
      res = (periodMonths >= monthCount) ? 12 : monthCount
    }
  }
  return res
}
