/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accVacation',
    code: 'accVacation_VacationScheduleList',
    isFolder: 0,
    caption: 'Заплановані відпустки',
    caption_uk: 'Заплановані відпустки',
    caption_ru: 'Запланированные отпуска',
    caption_az: 'Planlaşdırılmış məzuniyyətlər',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empVacationScheduleList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 30
  },
  {
    desktopCode: 'arm_accVacation',
    code: 'accVacation_VacationApSched',
    isFolder: 0,
    caption: 'Затвердження графіку відпусток',
    caption_uk: 'Затвердження графіку відпусток',
    caption_ru: 'Утверждении графика отпусков',
    caption_az: 'Məzuniyyət qrafikinin təsdiqlənməsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderVacationApSchedA') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 40
  },
  {
    desktopCode: 'arm_accVacation',
    code: 'accVacation_VacationScheduleListYear',
    isFolder: 0,
    caption: 'Графік відпусток (рік)',
    caption_uk: 'Графік відпусток (рік)',
    caption_ru: 'График отпусков (год)',
    caption_az: 'Məzuniyyət qrafiki (il)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empVacationScheduleListYear') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 50
  },
  {
    desktopCode: 'arm_accVacation',
    code: 'accVacation_VacationScheduleReport',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    cmdType: 'showForm',
    formCode: 'ac_shortcutList',
    cmpInitConfig: { shortcutCode: 'reportsTim', caption: 'Звіти', tip: 'Звіти' },
    inWindow: 1,
    isCollapsed: 0,
    iconCls: 'fa fa-bar-chart-o',
    displayOrder: 100
  }
]
