/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAddRequestForStuff',
    isFolder: 0,
    caption: 'Заявка на добір персоналу',
    caption_uk: 'Заявка на добір персоналу',
    caption_ru: 'Заявка на подбор персонала',
    caption_az: 'İşə qəbul ərizəsi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_requestForStuff') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-edit-outline',
    displayOrder: 10
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpRequestStuffMotion',
    isFolder: 0,
    caption: 'Подання щодо добору персоналу',
    caption_uk: 'Подання щодо добору персоналу',
    caption_ru: 'Представление по подбору персонала',
    caption_az: 'İşə qəbul üçün təqdimat',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_requestStuffMotion') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-th-list',
    displayOrder: 20
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAdd_competitionFolder',
    isFolder: 1,
    caption: 'Оголошення конкурсу',
    caption_uk: 'Оголошення конкурсу',
    caption_ru: 'Объявление конкурса',
    caption_az: 'Müsabiqə elanı',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-sound-o',
    displayOrder: 30,
    items: [
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAdd_competitionFolder',
        code: 'accHREmpAdd_adCompetition',
        isFolder: 0,
        caption: 'Накази про оголошення конкурсу',
        caption_uk: 'Накази про оголошення конкурсу',
        caption_ru: 'Приказы об объявлении конкурса',
        caption_az: 'Müsabiqə elanı əmrləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderAdCompetitionA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAdd_competitionFolder',
        code: 'accHREmpAdd_hr_listPosContestOrg',
        isFolder: 0,
        caption: 'Реєстр конкурсних посад',
        caption_uk: 'Реєстр конкурсних посад',
        caption_ru: 'Реестр конкурсных должностей',
        caption_az: 'Müsabiqəyə çıxarılmış vəzifələrin reyesteri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_listPosContestOrg') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAdd_competitionFolder',
        code: 'accHREmpAdd_hr_listPosContestAllA',
        isFolder: 0,
        caption: 'Реєстр конкурсних посад (всі)',
        caption_uk: 'Реєстр конкурсних посад (всі)',
        caption_ru: 'Реестр конкурсных должностей (все)',
        caption_az: 'Müsabiqəyə çıxarılmış vəzifələrin reyesteri (hamısı)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_listPosContestAllA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAdd_competitionFolder',
        code: 'accHREmpAdd_hr_listPosContestPubA',
        isFolder: 0,
        caption: 'Конкурсні посади (на оприлюднення)',
        caption_uk: 'Конкурсні посади (на оприлюднення)',
        caption_ru: 'Конкурсные должности (обнародования)',
        caption_az: 'Müsabiqəyə çıxarılmış vəzifələr (dərc olunma üçün)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_listPosContestPubA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 130
      }
    ]
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAdd_empListAudit',
    isFolder: 0,
    caption: 'Журнал перевірок',
    caption_uk: 'Журнал перевірок',
    caption_ru: 'Журнал проверок',
    caption_az: 'Yoxlama jurnalı',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empListAudit') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-document-checked',
    displayOrder: 40
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAdd_listPosContest',
    isFolder: 0,
    caption: 'Переможці (до призначення на посаду)',
    caption_uk: 'Переможці (до призначення на посаду)',
    caption_ru: 'Победители (до назначения на должность)',
    caption_az: 'Qaliblər (vəzifəyə təyinatdan əvvəl)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_listPosContestWin') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-s-flag',
    displayOrder: 50
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAdd_positionInstructionList',
    isFolder: 0,
    caption: 'Посадові інструкції',
    caption_uk: 'Посадові інструкції',
    caption_ru: 'Должностные инструкции',
    caption_az: 'Vəzifə təlimatları',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_positionInstructionList') }
    },
    inWindow: 0,
    iconCls: 'fa fa-file-text',
    isCollapsed: 0,
    displayOrder: 60
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAdd_CompetitionReport',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    cmdType: 'showForm',
    formCode: 'ac_shortcutList',
    cmpInitConfig: { shortcutCode: 'reportsHREmpAdd', caption: 'Звіти', tip: 'Звіти' },
    inWindow: 1,
    isCollapsed: 0,
    iconCls: 'fa fa-bar-chart-o',
    displayOrder: 100
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    code: 'accHREmpAddFolderDictionary',
    isFolder: 1,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqça',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 200,
    items: [
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAddFolderDictionary',
        code: 'accHREmpAdd_dictCompetency',
        isFolder: 0,
        caption: 'Компетенції',
        caption_uk: 'Компетенції',
        caption_ru: 'Компетенции',
        caption_az: 'Bacarıqlar',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictCompetency') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 220
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAddFolderDictionary',
        code: 'accHREmpAdd_dictBasicFunctn',
        isFolder: 0,
        caption: 'Основні функції організацій та підрозділів',
        caption_uk: 'Основні функції організацій та підрозділів',
        caption_ru: 'Основные функции организаций и подразделений',
        caption_az: 'Təşkilatın və struktur vahidinin əsas funksiyaları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictBasicFunctn') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 225
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAddFolderDictionary',
        code: 'accHREmpAdd_dictAreasActivity',
        isFolder: 0,
        caption: 'Напрями діяльності',
        caption_uk: 'Напрями діяльності',
        caption_ru: 'Направления деятельности',
        caption_az: 'Fəaliyyət istiqamətləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictAreasActivity') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 230
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAddFolderDictionary',
        code: 'accHREmpAdd_dictRequiredPara',
        isFolder: 0,
        caption: 'Пункти вимоги',
        caption_uk: 'Пункти вимоги',
        caption_ru: 'Пункты требования',
        caption_az: 'Tapşırıq bəndləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictRequiredPara') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 235
      },
      {
        desktopCode: 'arm_accHREmpAdd',
        parentCode: 'accHREmpAddFolderDictionary',
        code: 'accHREmpAdd_dictRequiredPosition',
        isFolder: 0,
        caption: 'Вимоги до посади',
        caption_uk: 'Вимоги до посади',
        caption_ru: 'Требования к должности',
        caption_az: 'Vəzifə təlimatları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictRequiredPosition') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 235
      }
    ]
  }
]
