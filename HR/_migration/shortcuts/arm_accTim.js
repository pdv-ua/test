/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accTim',
    code: 'accTim_timeSheet',
    isFolder: 0,
    caption: 'Табель',
    caption_uk: 'Табель',
    caption_ru: 'Табель',
    caption_az: 'Tabel',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('tim_timeSheet') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 100
  },
  {
    desktopCode: 'arm_accTim',
    code: 'accTim_registrySheet',
    isFolder: 0,
    caption: 'Реєстр електронних табелів',
    caption_uk: 'Реєстр електронних табелів',
    caption_ru: 'Реєстр електронних табелів',
    caption_az: 'Реєстр електронних табелів',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_registrySheet') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 150
  },
  {
    desktopCode: 'arm_accTim',
    code: 'accTim_empOrderUni',
    isFolder: 0,
    caption: 'Універсальний документ',
    caption_uk: 'Універсальний документ',
    caption_ru: 'Универсальный документ',
    caption_az: 'Universal sənəd',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderUni') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 200
  },
  {
    desktopCode: 'arm_accTim',
    code: 'accTim_timeSheetChange',
    isFolder: 0,
    caption: 'Скорочення робочого дня/тижня',
    caption_uk: 'Скорочення робочого дня/тижня',
    caption_ru: 'Сокращение рабочего дня/недели',
    caption_az: 'İş gününün / həftənin qısaldılması',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_timeSheetChange') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 300
  },
  {
    desktopCode: 'arm_accTim',
    code: 'accTimSettings',
    isFolder: 1,
    caption: 'Налаштування',
    caption_uk: 'Налаштування',
    caption_ru: 'Настройки',
    caption_az: 'Tənzimləmələr',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cogs',
    displayOrder: 400,
    items: [
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_timPlan',
        isFolder: 0,
        caption: 'Розклад роботи',
        caption_uk: 'Розклад роботи',
        caption_ru: 'Расписание работы',
        caption_az: 'İş qrafiki',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('tim_plan') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_workSchedule',
        isFolder: 0,
        caption: 'Графіки робочого часу',
        caption_uk: 'Графіки робочого часу',
        caption_ru: 'Графики рабочего времени',
        caption_az: 'İş vaxtı qrafiki',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_workSchedule') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_calendar',
        isFolder: 0,
        caption: 'Календар',
        caption_uk: 'Календар',
        caption_ru: 'Календарь',
        caption_az: 'Təqvim',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('tim_calendar') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_timeCost',
        isFolder: 0,
        caption: 'Елементи обліку робочого часу',
        caption_uk: 'Елементи обліку робочого часу',
        caption_ru: 'Элементы учета рабочего времени',
        caption_az: 'İş vaxtının uçot elementləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTimeCost') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_timePrint',
        isFolder: 0,
        caption: 'Відображення неявок у підсумках табеля',
        caption_uk: 'Відображення неявок у підсумках табеля',
        caption_ru: 'Отображение неявок в итогах табеля',
        caption_az: 'Tabel nəticələrində iş yerində olmamanın göstərilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTimePrint') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 550
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_timeSheetPrintSettings',
        isFolder: 0,
        caption: 'Налаштування друкованої форми табеля',
        caption_uk: 'Налаштування друкованої форми табеля',
        caption_ru: 'Настройка печатной формы табеля',
        caption_az: 'Hesabat kartının çap formasının qurulması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('tim_timeSheetPrintSettings') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 560
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_dictTimeCostInt',
        isFolder: 0,
        caption: 'Можливий перетин елементів обліку',
        caption_uk: 'Можливий перетин елементів обліку',
        caption_ru: 'Возможное пересечение элементов учета',
        caption_az: 'Uçot elementlərinin mümkün kəsişməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTimeCostInt') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      },
      {
        desktopCode: 'arm_accTim',
        parentCode: 'accTimSettings',
        code: 'accTim_dictTimeForm',
        isFolder: 0,
        caption: 'Налаштування форми коригування табеля',
        caption_uk: 'Налаштування форми коригування табеля',
        caption_ru: 'Налаштування форми коригування табеля',
        caption_az: 'Налаштування форми коригування табеля',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTimeForm') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 610
      }
    ]
  }
]
