/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaffFolderOrg',
    isFolder: 1,
    caption: 'Організації',
    caption_uk: 'Організації',
    caption_ru: 'Организации',
    caption_az: 'Təşkilatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-building-o',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrg',
        code: 'accStaff_staffOrderOrgStructure',
        isFolder: 0,
        caption: 'Ведення Організацій',
        caption_uk: 'Ведення Організацій',
        caption_ru: 'Ведение Организаций',
        caption_az: 'Təşkilati İdarəetmə',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffOrderOrgStructure') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrg',
        code: 'accStaff_staffOrg',
        isFolder: 0,
        caption: 'ОРГАНІЗАЦІЇ',
        caption_uk: 'ОРГАНІЗАЦІЇ',
        caption_ru: 'ОРГАНИЗАЦИИ',
        caption_az: 'TƏŞKİLATLAR',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTreeOrg') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-building',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrg',
        code: 'accStaff_organization',
        isFolder: 0,
        caption: 'Організації (реєстр)',
        caption_uk: 'Організації (реєстр)',
        caption_ru: 'Организации (реестр)',
        caption_az: 'Təşkilatlar (reyestr)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_organization') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-building',
        displayOrder: 300
      }
    ]
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaffFolderOrgStruc',
    isFolder: 1,
    caption: 'Структура організації',
    caption_uk: 'Структура організації',
    caption_ru: 'Структура организации',
    caption_az: 'Təşkilatın strukturu',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cube',
    displayOrder: 5,
    items: [
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrgStruc',
        code: 'accHR_staffTableOrgStructure',
        isFolder: 0,
        caption: 'Планування Структури',
        caption_uk: 'Планування Структури',
        caption_ru: 'Планирование Структуры',
        caption_az: 'Strukturun planlaşdırılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableOrgStructure') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cube',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrgStruc',
        code: 'accHR_empOrderOrgStructure',
        isFolder: 0,
        caption: 'Накази про структуру Організації',
        caption_uk: 'Накази про структуру Організації',
        caption_ru: 'Приказы о структуре Организации',
        caption_az: 'Təşkilatın strukturuna dair əmrlər',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderOrgStructure') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 20
      }
    ]
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaffFolderOrder',
    isFolder: 1,
    caption: 'Штатний розпис',
    caption_uk: 'Штатний розпис',
    caption_ru: 'Штатное расписание',
    caption_az: 'Ştat cədvəli',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cubes',
    displayOrder: 20,
    items: [
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_staffTable',
        isFolder: 0,
        caption: 'Планування штатного розпису',
        caption_uk: 'Планування штатного розпису',
        caption_ru: 'Планирование штатного расписания',
        caption_az: 'Ştat cədvəlinin planlaşdırılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTable') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cubes',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_staffTableAccrual',
        isFolder: 0,
        caption: 'Планування змін посадових окладів',
        caption_uk: 'Планування змін посадових окладів',
        caption_ru: 'Планирование изменений должностных окладов',
        caption_az: 'Vəzifə maaşlarında dəyişikliklərin planlaşdırılması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableAccrual') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-money-bill-alt',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_empOrderStaffList',
        isFolder: 0,
        caption: 'Накази за штатним розписом',
        caption_uk: 'Накази за штатним розписом',
        caption_ru: 'Приказы по штатному расписанию',
        caption_az: 'Ştat cədvəli üzrə əmrlər',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderStaffList') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 140
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_empOrderChgsalaryA',
        isFolder: 0,
        caption: 'Встановлення окладів працівникам',
        caption_uk: 'Встановлення окладів працівникам',
        caption_ru: 'Установление окладов работникам',
        caption_az: 'Əməkdaşların vəzifə maaşlarının təyin edilməsi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderChgsalaryA') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-hryvnia',
        displayOrder: 160
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_empOrderStaffTableMove',
        isFolder: 0,
        caption: 'Рознесення змін за штатним розписом',
        caption_uk: 'Рознесення змін за штатним розписом',
        caption_ru: 'Разнесения изменений по штатному расписанию',
        caption_az: 'Ştat cədvəli üzrə dəyişikliklərin qeyd olunması',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_empOrderStaffTableMove') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-hryvnia',
        displayOrder: 160
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_staffTableYear',
        isFolder: 0,
        caption: 'Штатні розписи (групування)',
        caption_uk: 'Штатні розписи (групування)',
        caption_ru: 'Штатные расписания (группировка)',
        caption_az: 'Ştat cədvəli (cari il)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableYear') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cubes',
        displayOrder: 180
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accHR_staffTableAll',
        isFolder: 0,
        caption: 'Штатні розписи (всі)',
        caption_uk: 'Штатні розписи (всі)',
        caption_ru: 'Штатные расписания (все)',
        caption_az: 'Ştat cədvəli (hamısı)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffTableAll') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-cubes',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accStaff_staffOrder',
        isFolder: 0,
        caption: 'Штатний розпис (ведення)',
        caption_uk: 'Штатний розпис (ведення)',
        caption_ru: 'Штатное расписание (ведение)',
        caption_az: 'Ştat cədvəli (idarəetmə)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_staffOrder') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-list-alt',
        displayOrder: 300
      },
      {
        desktopCode: 'arm_accStaff',
        parentCode: 'accStaffFolderOrder',
        code: 'accStaff_orderProcessingHistory',
        isFolder: 0,
        caption: 'Історія проведення наказів ШР',
        caption_uk: 'Історія проведення наказів ШР',
        caption_ru: 'История проведения приказов ШР',
        caption_az: 'Sifarişlərin tarixi',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_orderProcessingHistory') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-history',
        displayOrder: 400
      }
    ]
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_staffValid',
    isFolder: 0,
    caption: 'ШТАТНА КНИГА',
    caption_uk: 'ШТАТНА КНИГА',
    caption_ru: 'ШТАТНАЯ КНИГА',
    caption_az: 'ŞTAT KİTABI',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_staffTreeValid') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-sitemap',
    displayOrder: 500
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_diagram',
    isFolder: 0,
    caption: 'Діаграми організаційної структури',
    caption_uk: 'Діаграми організаційної структури',
    caption_ru: 'Диаграммы организационной структуры',
    caption_az: 'Təşkilati struktur diaqramı',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_diagram') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-s-grid',
    displayOrder: 600
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_department',
    isFolder: 0,
    caption: 'Підрозділи',
    caption_uk: 'Підрозділи',
    caption_ru: 'Подразделения',
    caption_az: 'Struktur vahidi',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_department') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-home',
    displayOrder: 800
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_position',
    isFolder: 0,
    caption: 'Посади',
    caption_uk: 'Посади',
    caption_ru: 'Должности',
    caption_az: 'Vəzifələr',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_position') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-briefcase',
    displayOrder: 900
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_departmentAll',
    isFolder: 0,
    caption: 'Підрозділи (всі)',
    caption_uk: 'Підрозділи (всі)',
    caption_ru: 'Подразделения (все)',
    caption_az: 'Struktur vahidləri (hamısı)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_departmentAll') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-home',
    displayOrder: 800
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_positionAll',
    isFolder: 0,
    caption: 'Посади (всі)',
    caption_uk: 'Посади (всі)',
    caption_ru: 'Должности (все)',
    caption_az: 'Vəzifələr (hamısı)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_positionAll') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-briefcase',
    displayOrder: 900
  },
  /* {
      desktopCode: 'arm_accStaff',
      code: 'accStaff_position_vac',
      isFolder: 0,
      caption: 'Посади вакантні',
      caption_uk: 'Посади вакантні',
      caption_ru: 'Должности вакантные',
      caption_az: 'Vəzifələr boşdur',
      cmdCode: {
        cmdType: 'showForm',
        formCode: function () { $App.runShortcutCommand('hr_position_vac') }
      },
      inWindow: 0,
      isCollapsed: 0,
      iconCls: 'fa fa-briefcase',
      displayOrder: 1000
    }, */
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_positionVacContest',
    isFolder: 0,
    caption: 'Вакантні посади',
    caption_uk: 'Вакантні посади',
    caption_ru: 'Вакантные должности',
    caption_az: 'Vakant vəzifələr',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_positionVacContest') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-briefcase',
    displayOrder: 1005
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_empPosLiquidate',
    isFolder: 0,
    caption: 'Особи на ліквідованих посадах',
    caption_uk: 'Особи на ліквідованих посадах',
    caption_ru: 'Физические лица на ликвидированных должностях',
    caption_az: 'Ləğv edilmiş vəzifələrdəki şəxslər',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empPosLiquidate') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-briefcase',
    displayOrder: 1010
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_positionSearch',
    isFolder: 0,
    caption: 'Пошук посад',
    caption_uk: 'Пошук посад',
    caption_ru: 'Поиск по должности',
    caption_az: 'Vəzifə görə axtarış',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_searchPosition') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1020
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaff_positionReport',
    isFolder: 0,
    caption: 'Вибірки за посадами',
    caption_uk: 'Вибірки за посадами',
    caption_ru: 'Выборки по должностям',
    caption_az: 'Vəzifələrə görə nümunələr',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_positionReport') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1030
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaffFolderOrgstructReports',
    isFolder: 0,
    caption: 'Звіти за Оргструктурою',
    caption_uk: 'Звіти за Оргструктурою',
    caption_ru: 'Отчеты по Оргструктуре',
    caption_az: 'Təşkilati struktur hesabatları',
    cmdType: 'showForm',
    formCode: 'ac_shortcutList',
    cmpInitConfig: {
      shortcutCode: 'reportsOrgstruct',
      caption: 'Звіти за Оргструктурою',
      caption_uk: 'Звіти за Оргструктурою',
      caption_ru: 'Отчеты по Оргструктуре',
      tip: 'Звіти за Оргструктурою'
    },
    inWindow: 1,
    isCollapsed: 0,
    iconCls: 'fa fa-bar-chart-o',
    displayOrder: 1100
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaffOrgstructReports',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_reportListOrgstructure') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-bar-chart-o',
    displayOrder: 1101
  },
  {
    desktopCode: 'arm_accStaff',
    code: 'accStaffDictionary',
    isFolder: 0,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: 'hr_dictListOrgstructure'
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 2000
  }
]
