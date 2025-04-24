const { dict } = require('../../../AC/modules/dataServices/rightService')
module.exports = [
  {
    section: 'Табельний облік',
    items: [
      {
        subSection: 'Документи',
        items: [
          {
            code: 'tim_timeSheet',
            name: 'Табель',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['tim_timeSheet', 'accTim_timeSheet'],
                els: { tim_timeSheet: ['select', 'loadData'], hr_dictSheetSigner: ['select'] }
              },
              {
                code: 'fillData',
                name: 'Сформувати',
                els: { tim_timeSheet: ['fillData'] }
              },
              {
                code: 'editPastPeriod',
                name: 'Редагувати закриті періоди',
                els: { tim_timeSheet: ['editPastPeriod'] }
              },
              {
                code: 'editBlockedRow',
                name: 'Показати все',
                els: { tim_timeSheet: ['editBlockedRow'] }
              },
              {
                code: 'blockTimeSheet',
                name: 'Блокувати всіх',
                els: { tim_timeSheet: ['blockTimeSheet'] }
              },
              {
                code: 'removeCorrect',
                name: 'Видаляти ручні коригування',
                els: { tim_timeSheet: ['removeCorrect'] }
              },
              {
                code: 'viewPrintForm',
                name: 'Друковані форми',
                els: { tim_timeSheet: ['viewPrintForm'] }
              },
              {
                code: 'checkBlock',
                name: 'Перевірка блокування табеля',
                els: { tim_timeSheet: ['selectTimeSheetBlockReport'] }
              },
              {
                code: 'allowUpdateDayData',
                name: 'Зміна даних по дням',
                els: { tim_timeSheet: ['updateData'] }
              },
              {
                code: 'viewOrderForm',
                name: 'Показувати форму наказу',
                els: { tim_timeSheet: ['viewOrderForm'] }
              },
              {
                code: 'editBlockedPeriod',
                name: 'Дозволити редагування в заблокованому періоді',
                els: { tim_timeSheet: ['editBlockedPeriod'] }
              },
              {
                code: 'canceledOrderDay',
                name: 'Скасувати наказ за днем',
                els: { tim_timeSheet: ['canceledOrderDay'] }
              },
              {
                code: 'cancelPastPeriod',
                name: 'Скасувати минулий період',
                els: { tim_timeSheet: ['cancelPastPeriod'] }
              },
              {
                code: 'tim_timeSheet_1',
                name: 'Друквана форма. Звіт з обліку робочого часу (табель)',
                els: { tim_timeSheet: ['tim_timeSheet_1'] }
              },
              {
                code: 'tim_timeSheet_11',
                name: 'Друквана форма. Звіт з обліку робочого часу (табель)',
                els: { tim_timeSheet: ['tim_timeSheet_11'] }
              },
              {
                code: 'tim_timeSheet_2',
                name: 'Друквана форма. Звіт з обліку робочого часу (табель уточнюючий)',
                els: { tim_timeSheet: ['tim_timeSheet_2'] }
              },
              {
                code: 'tim_timeSheet_3',
                name: 'Друквана форма. Звіт з обліку робочого часу (за першу половину місяця)',
                els: { tim_timeSheet: ['tim_timeSheet_3'] }
              },
              {
                code: 'tim_timeSheet_4',
                name: 'Друквана форма. Звіт з обліку робочого часу (HRMIS)',
                els: { tim_timeSheet: ['tim_timeSheet_4'] }
              },
              {
                code: 'tim_timeSheet_5',
                name: 'Друквана форма. Звіт з обліку робочого часу HRMIS (за першу половину місяця)',
                els: { tim_timeSheet: ['tim_timeSheet_5'] }
              },
              {
                code: 'tim_timeSheet_6',
                name: 'Друквана форма. Звіт з обліку робочого часу HRMIS (табель уточнюючий)',
                els: { tim_timeSheet: ['tim_timeSheet_6'] }
              },
              {
                code: 'tim_timeSheet_7',
                name: 'Друквана форма. Табель обліку робочого часу (Excel)',
                els: { tim_timeSheet: ['tim_timeSheet_7'] }
              },
              {
                code: 'tim_timeSheet_8',
                name: 'Друквана форма. Облік робочого часу у шкідливих умовах (Excel)',
                els: { tim_timeSheet: ['tim_timeSheet_8'] }
              }
            ]
          },
          {
            code: 'hr_empOrderUni',
            name: 'Універсальний документ',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['hr_empOrderUni', 'accTim_empOrderUni'],
                els: { hr_empOrderUni: ['select', 'getAllowedDepartments'], hr_orderAttachment: ['select'] }
              },
              {
                code: 'create',
                name: 'Створення',
                els: { hr_empOrderUni: ['addNew', 'insert', 'update'], hr_orderAttachment: ['addNew', 'insert', 'update'] }
              },
              {
                code: 'edit',
                name: 'Редагування',
                els: { hr_empOrderUni: ['update'], hr_orderAttachment: ['update'] }
              },
              {
                code: 'delete',
                name: 'Видалення',
                els: { hr_empOrderUni: ['delete'], hr_orderAttachment: ['delete'] }
              },
              {
                code: 'doPosting',
                name: 'Проведення',
                els: { hr_empOrderUni: ['doPosting'] }
              },
              {
                code: 'doCancelPosting',
                name: 'Відміна проведення',
                els: { hr_empOrderUni: ['doCancelPosting'] }
              },
              {
                code: 'canViewFirstDep',
                name: 'Перегляд документів структурного підрозділу і підпорядкованих',
                els: { hr_empOrderUni: ['canViewFirstDep'] }
              },
              {
                code: 'canViewOneDep',
                name: 'Перегляд документів підрозділу, в якому працює користувач',
                els: { hr_empOrderUni: ['canViewOneDep'] }
              },
              {
                code: 'canViewAllDep',
                name: 'Перегляд табеля всіх підрозділів',
                els: { hr_empOrderUni: ['canViewAllDep'] }
              },
              {
                code: 'editPastPeriod',
                name: 'Редагування минулих періодів',
                els: { hr_empOrderUni: ['editPastPeriod'] }
              }
            ]
          },
          {
            code: 'hr_timeSheetChange',
            name: 'Скорочення робочого дня/тижня',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['hr_timeSheetChange', 'accTim_timeSheetChange'],
                els: { hr_timeSheetChange: ['select'] }
              },
              {
                code: 'create',
                name: 'Створення',
                els: { hr_timeSheetChange: ['addNew', 'insert', 'update'] }
              },
              {
                code: 'edit',
                name: 'Редагування',
                els: { hr_timeSheetChange: ['update'] }
              },
              {
                code: 'delete',
                name: 'Видалення',
                els: { hr_timeSheetChange: ['delete'] }
              },
              {
                code: 'doPosting',
                name: 'Проведення',
                els: { hr_timeSheetChange: ['doPosting'] }
              },
              {
                code: 'doCancelPosting',
                name: 'Відміна проведення',
                els: { hr_timeSheetChange: ['doCancelPosting'] }
              }
            ]
          }
        ]
      },
      {
        subSection: 'Налаштування',
        items: [
          {
            code: 'tim_plan',
            name: 'Розклад роботи',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['tim_plan', 'accTim_timPlan', 'accTimSettings'],
                els: { tim_plan: ['select'] }
              },
              {
                code: 'calcPlan',
                name: 'Розрахувати',
                els: { tim_plan: ['calcPlan'] }
              }
            ]
          },
          {
            code: 'hr_workSchedule',
            name: 'Графіки робочого часу',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['hr_workSchedule', 'accTim_workSchedule', 'accTimSettings'],
                els: { hr_workSchedule: ['select'], hr_workScheduleDays: ['select'] }
              },
              {
                code: 'create',
                name: 'Створення',
                els: { hr_workSchedule: ['addNew', 'insert', 'update'], hr_workScheduleDays: ['addNew', 'insert', 'update'] }
              },
              {
                code: 'edit',
                name: 'Редагування',
                els: { hr_workSchedule: ['update'], hr_workScheduleDays: ['update'] }
              },
              {
                code: 'delete',
                name: 'Видалення',
                els: { hr_workSchedule: ['delete'], hr_workScheduleDays: ['delete'] }
              }
            ]
          },
          {
            code: 'tim_calendar',
            name: 'Календар',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['tim_calendar', 'accTim_calendar', 'accTimSettings'],
                els: { hr_calendarHoliday: ['select'], hr_calendarChange: ['select'] }
              },
              {
                code: 'create',
                name: 'Створення',
                els: { hr_calendarHoliday: ['addNew', 'insert', 'update'], hr_calendarChange: ['addNew', 'insert', 'update'] }
              },
              {
                code: 'edit',
                name: 'Редагування',
                els: { hr_calendarHoliday: ['update'], hr_calendarChange: ['update'] }
              },
              {
                code: 'delete',
                name: 'Видалення',
                els: { hr_calendarHoliday: ['delete'], hr_calendarChange: ['delete'] }
              }
            ]
          },
          {
            code: 'tim_timeSheetPrintSettings',
            name: 'Налаштування друкованої форми табеля',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: ['arm_accTim'],
                shortcuts: ['tim_timeSheetPrintSettings', 'accTim_timeSheetPrintSettings', 'accTimSettings'],
                els: { tim_timeSheetPrintSettings: ['select', 'loadData'] }
              },
              {
                code: 'create',
                name: 'Створення',
                els: { tim_timeSheetPrintSettings: ['addNew', 'insert', 'update', 'saveData'] }
              },
              {
                code: 'edit',
                name: 'Редагування',
                els: { tim_timeSheetPrintSettings: ['update', 'saveData'] }
              },
              {
                code: 'delete',
                name: 'Видалення',
                els: { tim_timeSheetPrintSettings: ['delete', 'saveData'] }
              }
            ]
          },
          dict('hr_dictTimeCost', 'Елементи обліку робочого часу', ['arm_accTim'], ['hr_dictTimeCost', 'accTim_timeCost', 'accTimSettings']),
          dict('hr_dictTimePrint', 'Відображення неявок у підсумках табеля', ['arm_accTim'], ['hr_dictTimePrint', 'accTim_timePrint', 'accTimSettings']),
          dict('hr_dictTimeCostInt', 'Можливий перетин елементів обліку', ['arm_accTim'], ['hr_dictTimeCostInt', 'accTim_dictTimeCostInt', 'accTimSettings'])
        ]
      }
    ]
  }
]
