/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accFSSU',
    code: 'accFSSU_empOrderSickness',
    isFolder: 0,
    caption: 'Тимчасова непрацездатність',
    caption_uk: 'Тимчасова непрацездатність',
    caption_ru: 'Временная нетрудоспособность',
    caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderSickness') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 100
  },
  {
    desktopCode: 'arm_accFSSU',
    code: 'accFSSU_empOrderFuneral',
    isFolder: 0,
    caption: 'Допомога на поховання',
    caption_uk: 'Допомога на поховання',
    caption_ru: 'Пособие на погребение',
    caption_az: 'Dəfn müavinəti',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empOrderFuneral') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 200
  },
  {
    desktopCode: 'arm_accFSSU',
    code: 'accFSSU_sicknessMeeting',
    isFolder: 0,
    caption: 'Протокол комісії з соцстраху',
    caption_uk: 'Протокол комісії з соцстраху',
    caption_ru: 'Протокол комиссии по соцстраху',
    caption_az: 'Sosial Müdafiə Komissiyasının Protokolu',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_sicknessMeeting') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 300
  },
  {
    desktopCode: 'arm_accFSSU',
    code: 'accFSSUDictionary',
    isFolder: 1,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 400,
    items: [
      {
        desktopCode: 'arm_accFSSU',
        parentCode: 'accFSSUDictionary',
        code: 'accFSSU_dictIllnessReason',
        isFolder: 0,
        caption: 'Причини непрацездатності',
        caption_uk: 'Причини непрацездатності',
        caption_ru: 'Причины нетрудоспособности',
        caption_az: 'Əmək qabiliyyətinin itirilməsinin səbəbləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictIllnessReason') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accFSSU',
        parentCode: 'accFSSUDictionary',
        code: 'accFSSU_dictIllnessRegime',
        isFolder: 0,
        caption: 'Лікарняний режим',
        caption_uk: 'Лікарняний режим',
        caption_ru: 'Больничный режим',
        caption_az: 'Xəstəxana rejimi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictIllnessRegime') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accFSSU',
        parentCode: 'accFSSUDictionary',
        code: 'accFSSU_dictIllnessPercent',
        isFolder: 0,
        caption: 'Відсотки для лікарняних',
        caption_uk: 'Відсотки для лікарняних',
        caption_ru: 'Проценты больничных',
        caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsi vərəqələri üzrə faizi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictIllnessPercent') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accFSSU',
        parentCode: 'accFSSUDictionary',
        code: 'accFSSU_dictSumFuneral',
        isFolder: 0,
        caption: 'Допомога на поховання СС',
        caption_uk: 'Допомога на поховання СС',
        caption_ru: 'Пособие на погребение СС',
        caption_az: 'DSMF dəfn müavinəti',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictSumFuneral') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accFSSU',
        parentCode: 'accFSSUDictionary',
        code: 'accFSSU_dictCommission',
        isFolder: 0,
        caption: 'Комісії',
        caption_uk: 'Комісії',
        caption_ru: 'Комиссии',
        caption_az: 'Komissiyalar',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictCommission') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      }
    ]
  }

]
