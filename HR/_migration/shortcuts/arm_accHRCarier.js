/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accHRCarier',
    code: 'accHRCarierFolderDictionary',
    isFolder: 1,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 120,
    items: [
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictTaskScore',
        isFolder: 0,
        caption: 'Бали за завдання',
        caption_uk: 'Бали за завдання',
        caption_ru: 'Баллы за задание',
        caption_az: 'Tapşırıq üzrə qiymətlər',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTaskScore') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 330
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictCompetency',
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
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictAreasActivity',
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
        displayOrder: 228
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictPosReqrmnt',
        isFolder: 0,
        caption: 'Вимоги до посади',
        caption_uk: 'Вимоги до посади',
        caption_ru: 'Требования к должности',
        caption_az: 'Vəzifə təlimatları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictPosReqrmnt') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 230
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictBasicFunctn',
        isFolder: 0,
        caption: 'Основні функції організацій та підрозділів',
        caption_uk: 'Основні функції організацій та підрозділів',
        caption_ru: 'Основные функции организаций и подразделений',
        caption_az: 'Təşkilat və struktur vahidinin əsas funksiyaları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictBasicFunctn') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 240
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictProfCompetency',
        isFolder: 0,
        caption: 'Професійні компетентності',
        caption_uk: 'Професійні компетентності',
        caption_ru: 'Профессиональные компетентности',
        caption_az: 'Peşə bacarıqları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictProfCompetency') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 250
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictTrainingForm',
        isFolder: 0,
        caption: 'Види (форми навчання) професійної компетентності',
        caption_uk: 'Види (форми навчання) професійної компетентності',
        caption_ru: 'Виды (формы обучения) профессиональной компетентности',
        caption_az: 'Peşə bacarıqlarının növləri (təlim formaları)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTrainingForm') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 260
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierFolderDictionary',
        code: 'accHRCarier_dictTrainingTopic',
        isFolder: 0,
        caption: 'Орієнтовна тематика',
        caption_uk: 'Орієнтовна тематика',
        caption_ru: 'Ориентировочная тематика',
        caption_az: 'Təyinat mövzuları',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTrainingTopic') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 270
      }
    ]
  },
  {
    desktopCode: 'arm_accHRCarier',
    code: 'accHRCarierRating',
    isFolder: 1,
    caption: 'Оцінювання',
    caption_uk: 'Оцінювання',
    caption_ru: 'Оценивание',
    caption_az: 'Qiymətləndirmə',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-edit-outline',
    displayOrder: 10,
    items: [
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierRating',
        code: 'accHRCarier_search',
        isFolder: 0,
        caption: 'Оцінювання (пошук)',
        caption_uk: 'Оцінювання (пошук)',
        caption_ru: 'Оценивание (поиск)',
        caption_az: 'Qiymətləndirmə (axtarış)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empListAssessment') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierRating',
        code: 'accHRCarierAssesment',
        isFolder: 0,
        caption: 'Планування оцінювання',
        caption_uk: 'Планування оцінювання',
        caption_ru: 'Планирование оценивания',
        caption_az: 'Qiymətləndirmənin planlaşdırılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empAssessment') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierRating',
        code: 'accHRCarierAssesmentResult',
        isFolder: 0,
        caption: 'Результати виконання завдань',
        caption_uk: 'Результати виконання завдань',
        caption_ru: 'Результаты выполнения заданий',
        caption_az: 'Tapşırıqların icra nəticələri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empAssessmentResult') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierRating',
        code: 'hr_empReportEmpListEval',
        isFolder: 0,
        caption: 'Список державних службовців (за результатами оцінювання)',
        caption_uk: 'Список державних службовців (за результатами оцінювання)',
        caption_ru: 'Список государственных служащих (по результатам оценки)',
        caption_az: 'Dövlət qulluqçularının siyahısı (qiymətləndirilmə nəticələrinə görə)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_reportEmpListEvaluation') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 121
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierRating',
        code: 'hr_empReportEmpListForYearEval',
        isFolder: 0,
        caption: 'Список планування оцінювання (за завданнями)',
        caption_uk: 'Список планування оцінювання (за завданнями)',
        caption_ru: 'Список планирования оценивания (по заданиям)',
        caption_az: 'Qiymətəlndirilmənin planlaşdırma siyahısı (tapşırıqlara görə)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_reportEmpListForYearEval') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 122
      }
    ]
  },
  {
    desktopCode: 'arm_accHRCarier',
    code: 'accHRCarierTraining',
    isFolder: 1,
    caption: 'Індивідуальна програма',
    caption_uk: 'Індивідуальна програма',
    caption_ru: 'Индивидуальная программа',
    caption_az: 'Fərdi proqram',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-thumb',
    displayOrder: 20,
    items: [
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierTraining',
        code: 'accHRTrainingProgramA',
        isFolder: 0,
        caption: 'Індивідуальна програма (А)',
        caption_uk: 'Індивідуальна програма (А)',
        caption_ru: 'Индивидуальная программа (А)',
        caption_az: 'Fərdi proqram (A)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empTrainingProgramA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHRCarier',
        parentCode: 'accHRCarierTraining',
        code: 'accHRTrainingProgramB',
        isFolder: 0,
        caption: 'Індивідуальна програма (Б,В)',
        caption_uk: 'Індивідуальна програма (Б,В)',
        caption_ru: 'Индивидуальная программа (Б, В)',
        caption_az: 'Fərdi proqram (B, C)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empTrainingProgramB') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      }
    ]
  },
  {
    desktopCode: 'arm_accHRCarier',
    code: 'accHRCarierListPosition',
    isFolder: 0,
    caption: 'Пошук посади',
    caption_uk: 'Пошук посади',
    caption_ru: 'Поиск должности',
    caption_az: 'Vəzifə axtarışı',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empListPosition') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 100
  }
]
