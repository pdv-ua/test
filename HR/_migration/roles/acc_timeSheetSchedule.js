const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_timeSheetSchedule',
  description: 'Фахівець з налаштування графіків роботи організації',
  description_uk: 'Фахівець з налаштування графіків роботи організації',
  description_ru: 'Специалист по настройке графиков работы организации',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm', 'loadData', 'getEmployeePositionTMHRMIS',
    'calcPlan', 'runTableReport', 'updateCalendarHolidayDt', 'getHolidays', 'parseCsv', 'importData', 'updateCalendarChangeDt',
    'addWorkScheduleCopy']
  return methodSet
}

function getRoleDef () {
  return [
    {
      accTimSettings: [
        ['tim_calendar', 'accTim_calendar',
          ['0-7', 'Табель', 'tim_timeSheet'],
          ['0-4,10-13', 'Святкові дні', 'hr_calendarHoliday'],
          ['0-4,14', 'Перенесення днів', 'hr_calendarChange'],
          ['0-4', 'Святкові дні', 'hr_calendarHolidayDt'],
          ['0-4', 'Перенесення днів', 'hr_calendarChangeDt']
        ],
        ['hr_workSchedule', 'accTim_workSchedule', ['0-4,15', 'Графік роботи']],
        ['tim_plan', 'accTim_timPlan', ['0-4,8', 'Розклад роботи']]
      ]
    },
    ['', ['9', 'Звіти TIM', 'tim_report']]
  ]
}
