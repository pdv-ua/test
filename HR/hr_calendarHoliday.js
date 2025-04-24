const UB = require('@unitybase/ub')
const moment = require('moment')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const dateService = require('../AC/modules/dataServices/dateService')
const _ = require('lodash')
const iconv = require('iconv-lite')
const csv = require('@unitybase/base').csv
const calendarService = require('../HR/modules/calendarService')
const calcService = require('../HR/modules/calcService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)
me.on('insert:after', afterInsert)
me.on('update:after', afterInsert)
me.on('delete:after', afterInsert)

me.entity.addMethod('parseCsv')
me.entity.addMethod('importData')
me.entity.addMethod('getHolidays')
me.entity.addMethod('updateCalendarHolidayDt')

function afterInsert () {
  calcService.addCalcPlanQueue({ entityName: 'hr_calendarHoliday' })
}

function validatePeriod (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || {}

  let yearHoliday = execParams.yearHoliday || instanceData.yearHoliday
  const monthHoliday = execParams.monthHoliday || instanceData.monthHoliday
  const dayHoliday = execParams.dayHoliday || instanceData.dayHoliday

  if (monthHoliday) {
    const month = UB.Repository('ac_dictMonth')
      .attrs(['code'])
      .where('ID', '=', monthHoliday)
      .selectSingle()

    if (!yearHoliday) {
      yearHoliday = 2000 // любой высокосный
    }

    if (!moment([dayHoliday, month['code'], yearHoliday].join('.'), 'D.M.YYYY', true).isValid()) {
      throw new UB.UBAbort(`<<<${UB.i18n('Дата з днем {0} місяцем {1} та роком {2} є некоректною. Збереження неможливо!', dayHoliday, month['code'], yearHoliday)}>>>`)
    }
  }
}

function beforeInsert (ctx) {
  validatePeriod(ctx)
}

function beforeUpdate (ctx) {
  validatePeriod(ctx)
}

me.parseCsv = function (ctx) {
  const csvStr = iconv.decode(Buffer.from(ctx.mParams.data, 'base64'), ctx.mParams.encoding)
  csv.DETECT_TYPES = false
  let csvParsedData = csv.parse(csvStr, ';')
  csv.DETECT_TYPES = true
  let resData = {}
  resData.errMess = []
  resData.items = []
  csvParsedData.forEach((dataItem, idx) => {
    if (dataItem.filter(Boolean).length) {
      let row = {}
      switch (ctx.mParams.entityName) {
        case 'hr_calendarHoliday':
          let monthHoliday
          if (moment([dataItem[2]], 'D.M.YYYY', true).isValid()) {
            const dateHoliday = dataItem[2].split('.')
            row.dayHoliday = parseInt(dateHoliday[0])
            row.yearHoliday = parseInt(dateHoliday[2])
            monthHoliday = parseInt(dateHoliday[1])
          } else {
            if (parseInt(dataItem[0])) {
              row.dayHoliday = parseInt(dataItem[0])
            } else {
              row.dayHoliday = null
              resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "День"`, idx + 1))
            }
            if (dataItem[2]) {
              row.yearHoliday = parseInt(dataItem[2])
              if (isNaN(row.yearHoliday)) {
                resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "Рік"`, idx + 1))
              }
            } else {
              row.yearHoliday = null
            }
            if (parseInt(dataItem[1])) {
              monthHoliday = parseInt(dataItem[1])
            } else {
              monthHoliday = null
              resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "Місяць"`, idx + 1))
            }
          }
          if (row.dayHoliday && monthHoliday && !isNaN(row.yearHoliday)) {
            if (!moment([row.dayHoliday, monthHoliday, row.yearHoliday ? row.yearHoliday : 2000].join('.'), 'D.M.YYYY', true).isValid()) {
              resData.errMess.push(UB.i18n(`рядок {0}: Дата з днем {1}, місяцем {2} та роком {3} є некоректною`, idx + 1, row.dayHoliday, monthHoliday, row.yearHoliday))
            }
          }
          if (monthHoliday) {
            const month = UB.Repository('ac_dictMonth')
              .attrs(['ID'])
              .where('code', '=', monthHoliday)
              .selectSingle()
            if (!month) {
              resData.errMess.push(UB.i18n(`рядок {0}: Попередження - не знайдено запису в довіднику для значення {1} - "Місяць"`, idx + 1, monthHoliday))
            } else {
              row.monthHoliday = month['ID']
            }
          } else {
            row.monthHoliday = null
          }
          if (dataItem[3]) {
            row.name = _.escape(dataItem[3])
          } else {
            row.name = null
          }
          if (parseFloat(dataItem[4])) {
            row.shortDay = parseFloat(dataItem[4])
          } else {
            resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "Скорочення предсвяткового дня"`, idx + 1))
          }
          if (dataItem[5]) {
            if (!moment([dataItem[5]], 'D.M.YYYY', true).isValid()) {
              resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "Дата початку". Дата є некоректною`, idx + 1))
            } else {
              row.dateFrom = dateService.shiftDate(dataItem[5].split('.').reverse().join('-'))
            }
          } else if (row.dayHoliday && row.monthHoliday && row.name) {
            row.dateFrom = dateService.minDate()
          } else {
            row.dateFrom = null
          }
          if (dataItem[6]) {
            if (!moment([dataItem[6]], 'D.M.YYYY', true).isValid()) {
              resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "Дата закінчення". Дата є некоректною`, idx + 1))
            } else {
              row.dateTo = dateService.shiftDate(dataItem[6].split('.').reverse().join('-'))
            }
          } else if (row.dayHoliday && row.monthHoliday && row.name) {
            row.dateTo = dateService.maxDate()
          } else {
            row.dateTo = null
          }
          break
        case 'hr_calendarChange':
          if (!moment([dataItem[0]], 'D.M.YYYY', true).isValid()) {
            row.changeDateFrom = null
            resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "День, який переноситься". Дата є некоректною`, idx + 1))
          } else {
            row.changeDateFrom = dateService.shiftDate(dataItem[0].split('.').reverse().join('-'))
          }
          if (!moment([dataItem[1]], 'D.M.YYYY', true).isValid()) {
            row.changeDateTo = null
            resData.errMess.push(UB.i18n(`рядок {0}: Помилка в отриманні значення "День, на який переноситься". Дата є некоректною`, idx + 1))
          } else {
            row.changeDateTo = dateService.shiftDate(dataItem[1].split('.').reverse().join('-'))
          }
          break
      }
      resData.items.push(row)
    }
  })
  ctx.mParams.result = JSON.stringify(resData)
}

me.importData = function (ctx) {
  const data = JSON.parse(ctx.mParams.params)
  const store = UB.DataStore(ctx.mParams.entityName)
  const errorMessage = []
  data.items.forEach((row, idx) => {
    try {
      store.run('insert', {
        execParams: row
      })
    } catch (e) {
      errorMessage.push(UB.i18n(`рядок {0}: Помилка при вставці запису {1}`, idx + 1, e.message))
    }
  })
  ctx.mParams.resultData = JSON.stringify(errorMessage)
}

me.getHolidays = function (ctx) {
  const mParams = ctx.mParams
  mParams.result = JSON.stringify(calendarService.getHolidays(mParams.dateFrom, mParams.dateTo, mParams.orgID))
  return true
}

me.updateCalendarHolidayDt = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_calendarHolidayDt')
  data.remove.forEach(ID => {
    store.run('delete', { execParams: { ID: ID } })
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        calendarHolidayID: mParams.calendarHolidayID,
        orgID: ID
      }
    })
  })
  calcService.addCalcPlanQueue({ entityName: 'hr_calendarHoliday' })
}
