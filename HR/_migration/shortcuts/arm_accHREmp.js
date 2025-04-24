/* global $App */
module.exports = [
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employee',
    isFolder: 0,
    caption: 'Особи',
    caption_uk: 'Особи',
    caption_ru: 'Физические лица',
    caption_az: 'Şəxslər',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employee') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-street-view',
    displayOrder: 10
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employeeTabList',
    isFolder: 0,
    caption: 'Працівники',
    caption_uk: 'Працівники',
    caption_ru: 'Работники',
    caption_az: 'Əməkdaşlar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employeeTabList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-male',
    displayOrder: 20
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employeeTabListCurrent',
    isFolder: 0,
    caption: 'Працівники (діючі)',
    caption_uk: 'Працівники (діючі)',
    caption_ru: 'Работники (действующие)',
    caption_az: 'Əməkdaşlar (cari)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employeeTabListCurrent') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-male',
    displayOrder: 20
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employeeTabListNoStaff',
    isFolder: 0,
    caption: 'Працівники (позаштатні)',
    caption_uk: 'Працівники (позаштатні)',
    caption_ru: 'Работники (внештатные)',
    caption_az: 'Əməkdaşlar (ştatdan kənar)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: 'hr_employeeNumberList',
      customParams: {
        mode: 'NOSTAFF'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-male',
    displayOrder: 22
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employeePositionList',
    isFolder: 0,
    caption: 'Призначення працівників',
    caption_uk: 'Призначення працівників',
    caption_ru: 'Назначения работников',
    caption_az: 'Əməkdaşların təyinatı',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employeePositionList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-male',
    displayOrder: 23
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accImport_employeeAppChange',
    isFolder: 0,
    caption: 'Призначення працівників (редагування посади)',
    caption_uk: 'Призначення працівників (редагування посади)',
    caption_ru: 'Назначения работников (редактирование должности)',
    caption_az: 'Əməkdaşların təyinatı (vəzifənin redaktəsi)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: 'hr_employeeNumberList',
      customParams: {
        mode: 'IMPORT'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 24
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employeeOrg',
    isFolder: 0,
    caption: 'Особи - організації',
    caption_uk: 'Особи - організації',
    caption_ru: 'Физические лица - организации',
    caption_az: 'Şəxslər - təşkilatlar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('ac_employeeOrg') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-male',
    displayOrder: 25
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_employeeAll',
    isFolder: 0,
    caption: 'Особи (всі)',
    caption_uk: 'Особи (всі)',
    caption_ru: 'Физические лица (все)',
    caption_az: 'Şəxslər (hamısı)',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_employeeAll') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-male',
    displayOrder: 30
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_empGroupFolder',
    isFolder: 1,
    caption: 'Групи (персонал)',
    caption_uk: 'Групи (персонал)',
    caption_ru: 'Группы (персонал)',
    caption_az: 'Qrup (heyət)',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fas fa-user-plus',
    displayOrder: 115,
    items: [
      {
        desktopCode: 'arm_accHREmp',
        code: 'accHREmp_employeeGroup',
        isFolder: 0,
        parentCode: 'accHREmp_empGroupFolder',
        caption: 'Група (персонал)',
        caption_uk: 'Група (персонал)',
        caption_ru: 'Группа (персонал)',
        caption_az: 'Qrup (heyət)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_employeeGroup') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-users',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accHREmp',
        code: 'accHREmp_employeeMyGroup',
        isFolder: 0,
        parentCode: 'accHREmp_empGroupFolder',
        caption: 'Мої групи (персонал)',
        caption_uk: 'Мої групи (персонал)',
        caption_ru: 'Мої групи (персонал)',
        caption_az: 'Мої групи (персонал)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: 'hr_employeeMyGroup',
          entity: 'hr_employeeGroup',
          tabId: 'hr_employeeMyGroup',
          props: { showGlobalSettings: true }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-users',
        displayOrder: 20
      },
    ]
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmpFolderList',
    isFolder: 0,
    caption: 'Списки працівників',
    caption_uk: 'Списки працівників',
    caption_ru: 'Списки работников',
    caption_az: 'Əməkdaşların siyahısı',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empListCustom') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-ol',
    displayOrder: 110
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHRRecruiting',
    isFolder: 1,
    caption: 'Рекрутинг',
    caption_uk: 'Рекрутинг',
    caption_ru: 'Рекрутинг',
    caption_az: 'İşə qəbul',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fas fa-user-plus',
    displayOrder: 115,
    items: [
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHRRecruiting',
        code: 'accHREmp_recruiting',
        isFolder: 0,
        caption: 'Реєстр кандидатів',
        caption_uk: 'Реєстр кандидатів',
        caption_ru: 'Реестр кандидатов',
        caption_az: 'Namizədlərin qeydiyyatı',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_contenderPositionList') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'el-icon-user-solid',
        displayOrder: 10
      }
    ]
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmp_reportListEmployee',
    isFolder: 0,
    caption: 'Звіти з персоналу',
    caption_uk: 'Звіти з персоналу',
    caption_ru: 'Отчеты по персоналу',
    caption_az: 'İşçi heyəti üzrə hesabatlar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_reportListEmployee') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 115
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmpSearch',
    isFolder: 1,
    caption: 'Пошук',
    caption_uk: 'Пошук',
    caption_ru: 'Поиск',
    caption_az: 'Axtarış',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 120,
    items: [
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpSearch',
        code: 'accHREmp_empSearch',
        isFolder: 0,
        caption: 'Пошук працівників',
        caption_uk: 'Пошук працівників',
        caption_ru: 'Поиск работников',
        caption_az: 'Əməkdaşlar üzrə axtarış',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_searchEmployee') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'el-icon-search',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpSearch',
        code: 'accHREmp_personSearch',
        isFolder: 0,
        caption: 'Пошук осіб',
        caption_uk: 'Пошук осіб',
        caption_ru: 'Поиск физических лиц',
        caption_az: 'Şəxslər üzrə axtarış',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_searchPerson') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'el-icon-search',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpSearch',
        code: 'accHREmp_positionSearch',
        isFolder: 0,
        caption: 'Пошук посад',
        caption_uk: 'Пошук посад',
        caption_ru: 'Поиск по должности',
        caption_az: 'Vəzifə üzrə axtarış',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_searchPosition') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'el-icon-search',
        displayOrder: 30
      }
    ]
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHRFolderStaffRequest',
    isFolder: 1,
    caption: 'Доступ до інформації',
    caption_uk: 'Доступ до інформації',
    caption_ru: 'Доступ к информации',
    caption_az: 'Məlumatlara icazə',
    inWindow: 0,
    isCollapsed: 0,
    displayOrder: 200,
    iconCls: 'el-icon-unlock',
    items: [
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHRFolderStaffRequest',
        code: 'accHRStaffRequestNew',
        isFolder: 0,
        caption: 'Запросити Картку (нові)',
        caption_uk: 'Запросити Картку (нові)',
        caption_ru: 'Запросить Карточку (новые)',
        caption_az: 'Kart sorğusu (yeni)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hrAccStaffRequestNew') }
        },
        inWindow: 0,
        iconCls: 'fa fa-unlock-alt',
        isCollapsed: 0,
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHRFolderStaffRequest',
        code: 'accHRStaffRequestAll',
        isFolder: 0,
        caption: 'Запросити Картку (всі)',
        caption_uk: 'Запросити Картку (всі)',
        caption_ru: 'Запросить Карточку (все)',
        caption_az: 'Kart sorğusu (hamısı)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hrAccStaffRequestAll') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-unlock-alt',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHRFolderStaffRequest',
        code: 'accHRStaffRequestSended',
        isFolder: 0,
        caption: 'Надати Картку (на опрацювання)',
        caption_uk: 'Надати Картку (на опрацювання)',
        caption_ru: 'Предоставить Карточку (на обработку)',
        caption_az: 'Kartın təqdim olunması (tamamlanmaya)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hrAccStaffRequestSended') }
        },
        inWindow: 0,
        iconCls: 'fa fa-lock',
        isCollapsed: 0,
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHRFolderStaffRequest',
        code: 'accHRStaffRequestOwner',
        isFolder: 0,
        caption: 'Надати Картку (всі)',
        caption_uk: 'Надати Картку (всі)',
        caption_ru: 'Предоставить Карточку (все)',
        caption_az: 'Kartın təqdim olunması (hamısı)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hrAccStaffRequestOwner') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-lock',
        displayOrder: 130
      }
    ]
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmpFolderRequest',
    isFolder: 1,
    caption: 'Робота із Особистим кабінетом',
    caption_uk: 'Робота із Особистим кабінетом',
    caption_ru: 'Работа с Личным кабинетом',
    caption_az: 'Şəxsi kabinetlə iş',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-globe',
    displayOrder: 210,
    items: [
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderRequest',
        code: 'accHREmp_requestAll',
        isFolder: 0,
        caption: 'Заяви (всі)',
        caption_uk: 'Заяви (всі)',
        caption_ru: 'Заявления (все)',
        caption_az: 'Ərizələr (hamısı)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_request') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderRequest',
        code: 'accHREmp_request',
        isFolder: 0,
        caption: 'Заяви за організацією',
        caption_uk: 'Заяви за організацією',
        caption_ru: 'Заявления по организации',
        caption_az: 'Təşkilat üzrə ərizələr',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_request_local') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderRequest',
        code: 'accHREmp_requestSended',
        isFolder: 0,
        caption: 'Заяви (на попередню обробку)',
        caption_uk: 'Заяви (на попередню обробку)',
        caption_ru: 'Заявления (на предварительную обработку)',
        caption_az: 'Ərizələr (ilkin tamamlanma üçün)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_request_sended') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderRequest',
        code: 'accHREmp_requestAgreed',
        isFolder: 0,
        caption: 'Заяви (на опрацювання)',
        caption_uk: 'Заяви (на опрацювання)',
        caption_ru: 'Заявления (на обработку)',
        caption_az: 'Ərizələr (tamamlanma üçün)',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_request_agreed') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 130
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderRequest',
        code: 'accHREmp_employeeTaskDt',
        isFolder: 0,
        caption: 'Реєстр завдань',
        caption_uk: 'Реєстр завдань',
        caption_ru: 'Реестр задач',
        caption_az: 'Tapşırıqların reyestri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_employeeTaskDt') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-envelope-o',
        displayOrder: 200
      }
    ]
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmpFolderDictATU',
    isFolder: 1,
    caption: 'Адміністративно-територіальний устрій',
    caption_uk: 'Адміністративно-територіальний устрій',
    caption_ru: 'Административно-территориальное устройство',
    caption_az: 'İnzibati ərazi bölgüsü',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-globe',
    displayOrder: 220,
    items: [
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictATU',
        code: 'accHR_dictCountry',
        isFolder: 0,
        caption: 'Країни',
        caption_uk: 'Країни',
        caption_ru: 'Страны',
        caption_az: 'Ölkələr',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('ac_dictCountry') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictATU',
        code: 'accHR_dictCity',
        isFolder: 0,
        caption: 'Населені пункти',
        caption_uk: 'Населені пункти',
        caption_ru: 'Населенные пункты',
        caption_az: 'Yaşayış məntəqələri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('ac_dictCity') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictATU',
        code: 'accHR_dictRegion',
        isFolder: 0,
        caption: 'Регіони',
        caption_uk: 'Регіони',
        caption_ru: 'Регионы',
        caption_az: 'Bölgələr',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('ac_dictRegion') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accHREmp',
        parentCode: 'accHREmpFolderDictATU',
        code: 'accHR_citytype',
        isFolder: 0,
        caption: 'Типи населених пунктів',
        caption_uk: 'Типи населених пунктів',
        caption_ru: 'Типы населенных пунктов',
        caption_az: 'Yaşayış məntəqələrinin növü',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('cdn_citytype') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-globe',
        displayOrder: 100
      }
    ]
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmpFolderActing',
    isFolder: 0,
    caption: 'Виконуючі обов`язки',
    caption_uk: 'Виконуючі обов`язки',
    caption_ru: 'Исполняющие обязанности',
    caption_az: 'Vəzifələrini icra edən',
    cmdCode: {
      cmdType: 'showForm',
      formCode: function () { $App.runShortcutCommand('hr_empActingList') }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-ol',
    displayOrder: 230
  },
  {
    desktopCode: 'arm_accHREmp',
    code: 'accHREmpDictionary',
    isFolder: 0,
    caption: 'Довідники',
    caption_uk: 'Довідники',
    caption_ru: 'Справочники',
    caption_az: 'Soraqçalar',
    cmdCode: {
      cmdType: 'showForm',
      formCode: 'hr_dictListPersonal'
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-archive',
    displayOrder: 240
  }
]
