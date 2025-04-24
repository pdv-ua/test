/* global $App  */
module.exports = [
  {
    desktopCode: 'arm_accTariffing',
    code: 'accTariffing_document',
    isFolder: 0,
    caption: 'Тарифікація',
    caption_uk: 'Тарифікація',
    caption_ru: 'Тарификация',
    caption_az: 'Tarifikasiya',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('trf_documentList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fas fa-money-check',
    displayOrder: 100
  },
  {
    desktopCode: 'arm_accTariffing',
    code: 'accTariffing_employeeNumberList',
    isFolder: 0,
    caption: 'Робочі місця',
    caption_uk: 'Робочі місця',
    caption_ru: 'Рабочие места',
    caption_az: 'İş yerləri',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('trf_employeeNumberList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-alt',
    displayOrder: 200
  },
  // {
  //   desktopCode: 'arm_accTariffing',
  //   code: 'accTariffing_orderRegistryShift',
  //   isFolder: 0,
  //   caption: 'Заміни',
  //   caption_uk: 'Заміни',
  //   caption_ru: 'Замены',
  //   caption_az: 'Əvəzetmələr',
  //   cmdCode: {
  //     cmdType: 'showForm',
  //     formCode: function () { $App.runShortcutCommand('hr_orderRegistryShift') }
  //   },
  //   inWindow: 0,
  //   isCollapsed: 0,
  //   iconCls: 'fa fa-file-text-o',
  //   displayOrder: 300
  // },
  {
    desktopCode: 'arm_accTariffing',
    code: 'accTariffingReportAll',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('trf_reports') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-bar-chart-o',
    displayOrder: 400
  },
  {
    desktopCode: 'arm_accTariffing',
    code: 'accTariffing_dictListTarification',
    isFolder: 0,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: 'hr_dictListTarification'
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 500
  }
]
