/* global AC $App Ext appAC UB HR appHR */
module.exports = [
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'ac_settingsMyOrg',
    isFolder: 0,
    caption: 'Константи організації',
    caption_uk: 'Константи організації',
    caption_ru: 'Константы организации',
    caption_az: 'Təşkilatın sabitləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'ac_settingsOrg',
        method: 'search',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
          { name: 'constantID.codeName', description: `{{UB.i18n('Параметр')}}` },
          { name: 'value' },
          { name: 'comment' }
        ],
        orderList: {
          orderBy: { expression: 'constantID.codeName', order: 'asc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      customActions: [
        {
          text: `{{UB.i18n('Завантажити за замовчанням')}}`,
          tooltip: `{{UB.i18n('Завантажити за замовчанням')}}`,
          iconCls: 'fas fa-angle-double-down',
          cls: 'fill-action',
          scale: 'medium',
          handler: function (btn) {
            $App.dialogYesNo('Попередження', `${UB.i18n('Завантажити за замовчанням')}?`)
              .then(res => {
                if (res) {
                  const grid = btn.up('grid')
                  $App.connection.run({
                    entity: 'ac_settingsOrg',
                    method: 'loadDefaultConfig',
                    execParams: {
                      organizationID: appAC.globalOrganization()
                    }
                  }).then(() => {
                    grid.getStore().load()
                  })
                }
              })
          }
        },
        {
          text: `{{UB.i18n('Видалити всі')}}`,
          tooltip: `{{UB.i18n('Видалити всі')}}`,
          iconCls: 'fa fa-eraser',
          cls: 'add-list-action',
          scale: 'medium',
          handler: function (btn) {
            $App.dialogYesNo('Попередження', `${UB.i18n('Видалити всі')}?`)
              .then(res => {
                if (res) {
                  const grid = btn.up('grid')
                  $App.connection.run({
                    entity: 'ac_settingsOrg',
                    method: 'deleteAllOrgConfig',
                    execParams: {
                      organizationID: appAC.globalOrganization()
                    }
                  }).then(() => {
                    grid.getStore().load()
                  })
                }
              })
          }
        }
      ],
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          entityName: {
            renderer: function (value) {
              return $App.domainInfo.entities[value].caption
            }
          }
        })
      },
      onDeterminateForm: function () {
        return {
          entityName: 'ac_settingsOrg',
          formCode: 'ac_settingsOrg',
          cmpInitConfig: {
            disableChangeOrg: true
          }
        }
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_employeeCardShortcutList',
    isFolder: 0,
    caption: 'Налаштування картки працівника',
    caption_uk: 'Налаштування картки працівника',
    caption_ru: 'Настройка карточки работника',
    caption_az: 'İşçi kartının qurulması',
    cmdType: 'showForm',
    formCode: 'hr_employeeCardShortcutList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_employeeCardSetting',
    isFolder: 0,
    caption: 'Налаштування картки працівника в особистому кабінеті',
    caption_uk: 'Налаштування картки працівника в особистому кабінеті',
    caption_ru: 'Настройка карты работника в личном кабинете',
    caption_az: 'Şəxsi kabinetdə işçinin kartının qurulması',
    cmdType: 'showForm',
    formCode: 'hr_employeeCardSetting',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_user',
    isFolder: 0,
    caption: 'Список користувачів організацій',
    caption_uk: 'Список користувачів організацій',
    caption_ru: 'Список пользователей организации',
    caption_az: 'Təşkilatın istifadəçilərinin siyahısı',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'uba_user',
        method: 'select',
        // disableAutoLoadStore: true,
        fieldList: [
          { name: 'employeeNumberID.employeeID.fullFIO', description: `{{UB.i18n('ПІБ')}}`, simpleFilter: true },
          { name: 'employeeNumberID.tabNum', description: `{{UB.i18n('Табельний номер')}}`, simpleFilter: true },
          'name',
          'disabled',
          'isPending'
        ]
      }]
    },
    cmpInitConfig: {
      customActions: [
        {
          text: `{{UB.i18n('Додати всіх')}}`,
          actionId: 'actionAddAll',
          iconCls: 'fas fa-angle-double-down',
          name: 'actionAddAll',
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_user\', \'createUsers\')}}',
          noActionButton: true,
          scale: 'medium',
          handler: function (btn) {
            const grid = btn.up('grid')
            $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Створити користувачів для всіх працівників організації?')).then(result => {
              if (result) {
                grid.setLoading(true)
                $App.connection.run({
                  entity: 'hr_user',
                  method: 'createUsers',
                  orgID: appAC.globalOrganization(),
                  onDate: appAC.globalApplicationDate()
                }).then(() => {
                  grid.onRefresh()
                  grid.setLoading(false)
                }, err => {
                  grid.setLoading(false)
                  throw err
                })
              }
            })
          }
        }
      ],
      onDeterminateForm: function () {
        return {
          entityName: 'uba_user',
          formCode: 'hr_user'
        }
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'employeeNumberID.orgID')
        this.store.load()
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_payCalc',
    isFolder: 0,
    caption: 'Перерахунок ЗП',
    caption_uk: 'Перерахунок ЗП',
    caption_ru: 'Перерасчет ЗП',
    caption_az: 'Maaşın yenidən hesablanması',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payCalc',
        method: 'select',
        fieldList: [
          { name: 'orgID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'timeStampBegin' },
          { name: 'timeStampEnd' },
          { name: 'numCount' },
          { name: 'result', description: `{{UB.i18n('Час перерахунку в секундах')}}` },
          { name: 'calcBalance' },
          { name: 'description' }
        ],
        whereList: {
          state: {
            expression: '[orgID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          dateTo: {
            expression: '[orgID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgNull: {
            expression: '[orgID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([state] AND [dateTo]) OR [orgNull])'],
        orderList: {
          orderBy: { expression: 'timeStampBegin', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      customInit: function () {
        const grid = this
        AC.gridUtils.tuneGridColumns(grid, {
          timeStampBegin: {
            renderer: function (value) {
              return value ? AC.dateService.formatDate(AC.dateService.unshiftDate(value), 'dd.mm.yyyy hh:nn:ss') : value
            }
          },
          timeStampEnd: {
            renderer: function (value) {
              return value ? AC.dateService.formatDate(AC.dateService.unshiftDate(value), 'dd.mm.yyyy hh:nn:ss') : value
            }
          }
        })
      },
      onDeterminateForm: function () {
        return false
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del', 'edit']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_calcQueueLog',
    isFolder: 0,
    caption: 'Запуск перерахунку ЗП',
    caption_uk: 'Запуск перерахунку ЗП',
    caption_ru: 'Запуск перерасчета ЗП',
    caption_az: 'Maaşların yenidən hesablanmasına başlanma',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_calcQueueLog',
        method: 'select',
        fieldList: [

          { name: 'orgID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'actionType' },
          { name: 'actionTime', format: 'd.m.Y  H:i:s' },
          { name: 'allOrgCalc' },
          { name: 'orgCalc' },
          { name: 'numCount' },
          { name: 'calcBalance' },
          { name: 'description' },
          { name: 'mi_createUser.name', description: `{{UB.i18n('Користувач')}}`, simpleFilter: true },
          { name: 'mi_createUser.employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true }
        ],
        whereList: {
          state: {
            expression: '[orgID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          dateTo: {
            expression: '[orgID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgNull: {
            expression: '[orgID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([state] AND [dateTo]) OR [orgNull])'],
        orderList: {
          orderBy: { expression: 'actionTime', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      onDeterminateForm: function () {
        return false
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del', 'edit']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_calcQueue',
    isFolder: 0,
    caption: 'Черга перерахунку ЗП',
    caption_uk: 'Черга перерахунку ЗП',
    caption_ru: 'Очередь перерасчета ЗП',
    caption_az: 'Hesablama növbəsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_calcQueue',
        method: 'select',
        fieldList: [
          { name: 'allOrganization' },
          { name: 'orgID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'empOrganizationID.name', description: `{{UB.i18n('Організація працівника')}}`, simpleFilter: true },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true }
        ],
        whereList: {
          state: {
            expression: '[orgID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          dateTo: {
            expression: '[orgID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgNull: {
            expression: '[orgID]',
            condition: 'isNull'
          },
          empState: {
            expression: '[empOrganizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          empDateTo: {
            expression: '[empOrganizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          empOrgNull: {
            expression: '[empOrganizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['((([state] AND [dateTo]) OR [orgNull]) AND (([empState] AND [empDateTo]) OR [empOrgNull]))']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      onDeterminateForm: function () {
        return false
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del', 'edit']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_userWithoutEmployee',
    isFolder: 0,
    caption: 'Список користувачів без призначення',
    caption_uk: 'Список користувачів без призначення',
    caption_ru: 'Список пользователей без назначения',
    caption_az: 'Təyinatı olmayan istifadəçilərin siyahısı',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'uba_user',
        method: 'select',
        fieldList: [
          { name: 'employeeNumberID.employeeID.fullFIO', description: `{{UB.i18n('ПІБ')}}`, simpleFilter: true },
          'name',
          'disabled',
          'isPending'
        ],
        whereList: {
          employeeNumberID: {
            expression: '[employeeNumberID]',
            condition: 'isNull'
          }
        }
      }]
    },
    cmpInitConfig: {
      onDeterminateForm: function () {
        return {
          entityName: 'uba_user',
          formCode: 'hr_user'
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_settingsEmpOrder',
    isFolder: 0,
    caption: 'Налаштування наказів',
    caption_uk: 'Налаштування наказів',
    caption_ru: 'Настройка приказов',
    caption_az: 'Əmrlərin tənzimlənməsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'ac_settingsOrg',
        method: 'search',
        fieldList: [
          { name: 'constantID.codeName', description: `{{UB.i18n('Параметр')}}` },
          { name: 'value' },
          { name: 'comment' }
        ],
        'whereList': {
          'constantID.constantGroup.code': {
            'expression': '[constantID.constantGroup.code]',
            'condition': '=',
            'value': 'empOrder'
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          entityName: {
            renderer: function (value) {
              return $App.domainInfo.entities[value].caption
            }
          },
          value: {
            renderer: function (value) {
              return value === '0' ? 'Ні' : value === '1' ? 'Так' : value
            }
          }
        })
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      onDeterminateForm: function (grid) {
        return {
          cmpInitConfig: { constantGroup: 'empOrder' }
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_settingsPayRoll',
    isFolder: 0,
    caption: 'Параметри обліку зарплати',
    caption_uk: 'Параметри обліку зарплати',
    caption_ru: 'Параметры учета зарплаты',
    caption_az: 'Əmək haqqı uçotu parametrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'ac_settingsOrg',
        method: 'search',
        fieldList: [
          { name: 'constantID.codeName', description: `{{UB.i18n('Параметр')}}` },
          { name: 'value' },
          { name: 'comment' }
        ],
        whereList: {
          payRoll: {
            expression: '[constantID.constantGroup.code]',
            condition: '=',
            value: 'payRoll'
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          entityName: {
            renderer: function (value) {
              return $App.domainInfo.entities[value].caption
            }
          },
          value: {
            renderer: function (value) {
              return value === '0' ? 'Ні' : value === '1' ? 'Так' : value
            }
          }
        })
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      onDeterminateForm: function (grid) {
        return {
          cmpInitConfig: {
            constantGroup: 'payRoll',
            disableChangeOrg: true
          }
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  /** ******TIM*************/
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'tim_calendar',
    isFolder: 0,
    caption: 'Календар',
    caption_uk: 'Календар',
    caption_ru: 'Календарь',
    caption_az: 'Təqvim',
    cmdType: 'showForm',
    formCode: 'tim_calendar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 110
  },
  {
    desktopCode: 'arm_accTim',
    parentCode: 'dictionaryCfg',
    code: 'tim_plan',
    isFolder: 0,
    caption: 'Розклад роботи',
    caption_uk: 'Розклад роботи',
    caption_ru: 'Расписание работы',
    caption_en: 'Work schedule',
    caption_az: 'İş cədvəli',
    cmdType: 'showForm',
    formCode: 'tim_plan',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 160
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'tim_timeSheet',
    isFolder: 0,
    caption: 'Табель',
    caption_uk: 'Табель',
    caption_ru: 'Табель',
    caption_az: 'Cədvəl',
    cmdType: 'showForm',
    formCode: 'tim_timeSheet',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 170
  },
  /* ******* Довідники ************ */
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBasicFunctn',
    isFolder: 0,
    caption: 'Основні функції організацій та підрозділів',
    caption_uk: 'Основні функції організацій та підрозділів',
    caption_ru: 'Основные функции организаций и подразделений',
    caption_az: 'Təşkilatın və tabeli struktur vahidlərinin əsas funksiyaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBasicFunctn',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'descrFunc', description: `{{UB.i18n('Опис')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_positionTypeProps',
    isFolder: 0,
    caption: 'Заповнення атрибутів за типом посади (по замовченню)',
    caption_uk: 'Заповнення атрибутів за типом посади (по замовченню)',
    caption_ru: 'Заполнение атрибутов по типу должности (по умолчанию)',
    caption_az: 'Vəzifə növünə görə atributların doldurulması (susmaya görə)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_positionTypeProps',
        method: 'select',
        fieldList: [
          {
            name: 'positionType',
            description: `{{UB.i18n('Тип посади')}}`
          },
          {
            name: 'dictStaffCatID.description',
            description: `{{UB.i18n('Категорія персоналу')}}`
          },
          {
            name: 'positionCategory',
            description: `{{UB.i18n('Категорія посади')}}`
          },
          {
            name: 'contractType',
            description: `{{UB.i18n('Тип договору')}}`
          },
          {
            name: 'dictContractKindID.name',
            description: `{{UB.i18n('Вид договору')}}`
          },
          {
            name: 'workPlace',
            description: `{{UB.i18n('Місце роботи')}}`
          },
          {
            name: 'workerType',
            description: `{{UB.i18n('Форма зайнятості')}}`
          },
          {
            name: 'workScheduleID.name',
            description: `{{UB.i18n('Графік роботи')}}`
          },
          {
            name: 'payElID.name',
            description: `{{UB.i18n('Вид оплати')}}`
          },
          {
            name: 'dictFundSourceID.name',
            description: `{{UB.i18n('Джерело фінансування')}}`
          }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_hrEmpOrderDetConfigAttr',
    isFolder: 0,
    caption: 'Параметри налаштування пунктів наказів (можливі значення)',
    caption_uk: 'Параметри налаштування пунктів наказів (можливі значення)',
    caption_ru: 'Параметры настройки пунктов приказов (возможные значения)',
    caption_az: 'Əmr maddələrini tənzimləmələri parametrləri (mümkün dəyərlər)',
    cmdType: 'showForm',
    formCode: 'hr_empOrderDetConfigAttr',
    inWindow: 1,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_dictRequestKind',
    isFolder: 0,
    caption: 'Вид заяв',
    caption_uk: 'Вид заяв',
    caption_ru: 'Вид заявлений',
    caption_az: 'Tətbiqlərin növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRequestKind',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'requestType' },
          { name: 'procRule' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_hrEmpOrderDetConfigDef',
    isFolder: 0,
    caption: 'Шаблон налаштування пунктів наказів (види оплати)',
    caption_uk: 'Шаблон налаштування пунктів наказів (види оплати)',
    caption_ru: 'Шаблон настройки пунктов приказов (виды оплаты)',
    caption_az: 'Əmr maddəsi tənzimləmələri şablonu (ödəniş növləri)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrderDetConfig',
        method: 'select',
        fieldList: [
          { name: 'empOrderTypeName' },
          { name: 'positionType' },
          { name: 'dictStaffCatID.description', description: `{{UB.i18n('Категорія персоналу')}}`, simpleFilter: true },
          { name: 'dictTimeCostID.description', description: `{{UB.i18n('Елемент обліку робочого часу')}}`, simpleFilter: true },
          { name: 'payElIDAccrual.description', description: `{{UB.i18n('Система оплати')}}`, simpleFilter: true },
          { name: 'payElIDMain.description', description: `{{UB.i18n('Вид оплати (основний)')}}`, simpleFilter: true },
          { name: 'payElIDAdd.description', description: `{{UB.i18n('Вид оплати (додатково)')}}`, simpleFilter: true },
          { name: 'payElIDReplacement.description', description: `{{UB.i18n('Вид оплати за ТВО')}}`, simpleFilter: true },
          { name: 'comment' },
          { name: 'showTabNumInPrintForm', description: `{{UB.i18n('Виводити табельний номер')}}` }
        ],
        orderList: { empOrderType: { expression: 'empOrderTypeName' } },
        whereList: {
          organizationID: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        }
      }]
    },
    cmpInitConfig: {
      onDeterminateForm: function () {
        return {
          cmpInitConfig: { isDefault: true }
        }
      },
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          showTabNumInPrintForm: {
            renderer: function (value) {
              return !value || value === 'Ні' ? '' : 'Так'
            }
          }
        })
      },
      afterInit: function () {
        $App.dialogError('Налаштування цього довідника можуть призвести до некоректної роботи наказів всієї системи. Будь-які зміни необхідно погоджувати із Особами, відповідальними за працездатність системи. Зміни може здійснювати лише сертифіковний адміністратор системи!', 'Увага!')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBonus',
    isFolder: 0,
    caption: 'Нагороди',
    caption_uk: 'Нагороди',
    caption_ru: 'Награды',
    caption_az: 'Mükafatlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBonus',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'abbr' },
          { name: 'bonusKindID.name', description: `{{UB.i18n('Вид нагороди')}}` },
          { name: 'bonusTypeID.name', description: `{{UB.i18n('Тип нагороди')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBonusKind',
    isFolder: 0,
    caption: 'Види нагород',
    caption_uk: 'Види нагород',
    caption_ru: 'Виды наград',
    caption_az: 'Mükafat növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBonusKind',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPenalty',
    isFolder: 0,
    caption: 'Стягнення',
    caption_uk: 'Стягнення',
    caption_ru: 'Взыскание',
    caption_az: 'Cəza növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPenalty',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'idxNum' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPenaltyReason',
    isFolder: 0,
    caption: 'Причини стягнення',
    caption_uk: 'Причини стягнення',
    caption_ru: 'Причины взыскания',
    caption_az: 'Cəzalandırma üçün əsası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPenaltyReason',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'idxNum' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictReasonBounty',
    isFolder: 0,
    caption: 'Підстава для преміювання',
    caption_uk: 'Підстава для преміювання',
    caption_ru: 'Основание для премирования',
    caption_az: 'Mükafatlandırma üçün əsas',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictReasonBounty',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStateMilitary',
    isFolder: 0,
    caption: 'Стани обліку військовозобов\'язаних',
    caption_uk: 'Стани обліку військовозобов\'язаних',
    caption_ru: 'Состояние учета военнообязанных',
    caption_az: 'Hərbi mükəlləfiyətlilərin qeydiyyat vəziyyəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStateMilitary',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCategMilitary',
    isFolder: 0,
    caption: 'Категорії обліку військовозобов\'язаних',
    caption_uk: 'Категорії обліку військовозобов\'язаних',
    caption_ru: 'Категория учета военнообязанных',
    caption_az: 'Hərbi mükəlləfiyətlilərin qeydiyyat kateqoriyası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCategMilitary',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_specialty',
    isFolder: 0,
    caption: 'Спеціальності',
    caption_uk: 'Спеціальності',
    caption_ru: 'Специальности',
    caption_az: 'İxtisas',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_specialty',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'specialityType', description: `{{UB.i18n('Тип спеціальності')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBranchScience',
    isFolder: 0,
    caption: 'Галузі науки',
    caption_uk: 'Галузі науки',
    caption_ru: 'Отрасли науки',
    caption_az: 'Elm sahələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBranchScience',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'shortName', description: `{{UB.i18n('Скорочена назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictAcademStatus',
    isFolder: 0,
    caption: 'Вчені звання',
    caption_uk: 'Вчені звання',
    caption_ru: 'Ученые звания',
    caption_az: 'Elmi adlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictAcademStatus',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictProfCompDevelopForm',
    isFolder: 0,
    caption: 'Форми підвищення рівня професійної компетентності',
    caption_uk: 'Форми підвищення рівня професійної компетентності',
    caption_ru: 'Формы повышения уровня профессиональной компетентности',
    caption_az: 'Peşəkar səriştənin səviyyəsinin artırılması formaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictProfCompDevelopForm',
        method: 'select',
        fieldList: [
          { name: 'code', visibility: false },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTrainingKind',
    isFolder: 0,
    caption: 'Вид професійної підготовки',
    caption_uk: 'Вид професійної підготовки',
    caption_ru: 'Вид профессиональной подготовки',
    caption_az: 'Peşə hazırlığı növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTrainingKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dictStaffCatID.description' },
          { name: 'trainingLevel' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPublicationKind',
    isFolder: 0,
    caption: 'Вид публікації',
    caption_uk: 'Вид публікації',
    caption_ru: 'Вид публикации',
    caption_az: 'Nəşrin növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPublicationKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBonusType',
    isFolder: 0,
    caption: 'Типи нагород',
    caption_uk: 'Типи нагород',
    caption_ru: 'Типы наград',
    caption_az: 'Mükafat növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBonusType',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStaffCat',
    isFolder: 0,
    caption: 'Категорії персоналу',
    caption_uk: 'Категорії персоналу',
    caption_ru: 'Категории персонала',
    caption_az: 'İşçi heyətinin kateqoriyası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStaffCat',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'accCategory' },
          { name: 'usage' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStaffSubCat',
    isFolder: 0,
    caption: 'Підкатегорії персоналу',
    caption_uk: 'Підкатегорії персоналу',
    caption_ru: 'Подкатегории персонала',
    caption_az: 'İşçi heyətinin alt kateqoriyaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStaffSubCat',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dictStaffCatID.description' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictReasonAccrual',
    isFolder: 0,
    caption: 'Підстави змін окладів',
    caption_uk: 'Підстави змін окладів',
    caption_ru: 'Основание изменений окладов',
    caption_az: 'Maaş dəyişiklikləri üçün əsas',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictReasonAccrual',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'isIndexSalary' },
          { name: 'isSignAction' },
          { name: 'description', visibility: false }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStatePay',
    isFolder: 0,
    caption: 'Групи оплати праці держслужбовців',
    caption_uk: 'Групи оплати праці держслужбовців',
    caption_ru: 'Группы оплаты труда госслужащих',
    caption_az: 'Dövlət qulluqçularının əməyin ödənilməsi qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStatePay',
        method: 'select',
        fieldList: [
          { name: 'groupN' },
          { name: 'name' },
          { name: 'prim' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_payPerm',
    isFolder: 0,
    caption: 'Постійні нарахування організації',
    caption_uk: 'Постійні нарахування організації',
    caption_ru: 'Постоянные начисления организации',
    caption_az: 'Təşkilatın mütəmadi köçürmələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payPerm',
        method: 'select',
        fieldList: [
          { name: 'payElID.description', description: `{{UB.i18n('Вид оплати')}}` },
          { name: 'paySum', format: '0.00' },
          { name: 'rate', format: '0.000000' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ],
        whereList: {
          payType: {
            expression: '[payType]',
            condition: 'equal',
            values: {
              payType: 'PAYMENT'
            }
          }
        },
        orderList: {
          code: { expression: '[payElID.code]', order: 'asc' }
        }
      }]
    },
    cmpInitConfig: {
      payType: 'PAYMENT',
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          rate: {
            renderer: function (value) {
              return AC.currencyService.valueAsMinDecimalPrecision(value, 2)
            }
          }
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_payPermHold',
    isFolder: 0,
    caption: 'Постійні утримання організації',
    caption_uk: 'Постійні утримання організації',
    caption_ru: 'Постоянные удержания организации',
    caption_az: 'Təşkilatın mütəmadi saxlanması',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payPerm',
        method: 'select',
        fieldList: [
          { name: 'payElID.description', description: `{{UB.i18n('Вид оплати')}}` },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ],
        whereList: {
          payType: {
            expression: '[payType]',
            condition: 'equal',
            values: {
              payType: 'OFFTAKE'
            }
          }
        },
        orderList: {
          code: { expression: '[payElID.code]', order: 'asc' }
        }
      }]
    },
    cmpInitConfig: {
      payType: 'OFFTAKE',
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Постійні утримання'))
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_fundPerm',
    isFolder: 0,
    caption: 'Постійні нарахування на ЗП',
    caption_uk: 'Постійні нарахування на ЗП',
    caption_ru: 'Постоянные начисления на ЗП',
    caption_az: 'ZP-yə daimi hesablamalar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_fundPerm',
        method: 'select',
        fieldList: [
          { name: 'payFundID.description', description: `{{UB.i18n('Нарахування на зарплату')}}` },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ],
        orderList: {
          code: { expression: '[payFundID.code]', order: 'asc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_rl',
    isFolder: 0,
    caption: 'Розрахунковий лист',
    caption_uk: 'Розрахунковий лист',
    caption_ru: 'Расчётный лист',
    caption_az: 'Hesabat siyahısı',
    cmdType: 'showForm',
    formCode: 'hr_rl',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_paySummary',
    isFolder: 0,
    caption: 'Розрахункова відомість',
    caption_uk: 'Розрахункова відомість',
    caption_ru: 'Расчётная ведомость',
    caption_az: 'Hesabat tabeli',
    cmdType: 'showForm',
    formCode: 'hr_paySummary',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_staffTreeValid',
    isFolder: 0,
    caption: 'ШТАТНА КНИГА',
    caption_uk: 'ШТАТНА КНИГА',
    caption_ru: 'ШТАТНАЯ КНИГА',
    caption_az: 'Ştat cədvəli',
    cmdType: 'showForm',
    formCode: 'hr_staffTreeValid',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_staffTreeOrg',
    isFolder: 0,
    caption: 'ОРГАНІЗАЦІЇ',
    caption_uk: 'ОРГАНІЗАЦІЇ',
    caption_ru: 'ОРГАНИЗАЦИИ',
    caption_az: 'TƏŞKİLATLAR',
    cmdType: 'showForm',
    formCode: 'hr_staffTreeOrg',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_diagram',
    isFolder: 0,
    caption: 'Діаграми організаційної структури',
    caption_uk: 'Діаграми організаційної структури',
    caption_ru: 'Диаграммы организационной структуры',
    caption_az: 'Təşkilatın strukturunun qrafik',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'org_diagram',
        method: 'select',
        fieldList: [
          { name: 'caption' },
          { name: 'orgunitID.caption' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_organization',
    isFolder: 0,
    caption: 'Організації (реєстр)',
    caption_uk: 'Організації (реєстр)',
    caption_ru: 'Организации (реестр)',
    caption_az: 'Təşkilatlar (qeydiyyatdan keçin)',
    cmdType: 'showForm',
    formCode: 'hr_organizationList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_department',
    isFolder: 0,
    caption: 'Підрозділи (персонал)',
    caption_uk: 'Підрозділи (персонал)',
    caption_ru: 'Подразделения (персонал)',
    caption_az: 'Struktur vahidi (işçi heyəti)',
    cmdType: 'showForm',
    formCode: 'hr_departmentList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_departmentSalary',
    isFolder: 0,
    caption: 'Підрозділи',
    caption_uk: 'Підрозділи',
    caption_ru: 'Подразделения',
    caption_az: 'Struktur vahidi',
    cmdType: 'showForm',
    formCode: 'hr_departmentSalaryList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_departmentAll',
    isFolder: 0,
    caption: 'Підрозділи всі (персонал)',
    caption_uk: 'Підрозділи всі (персонал)',
    caption_ru: 'Подразделения все (персонал)',
    caption_az: 'Bütün struktur vahidləri (işçi heyət)',
    cmdType: 'showForm',
    formCode: 'hr_departmentListAll',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_position',
    isFolder: 0,
    caption: 'Посади (персонал)',
    caption_uk: 'Посади (персонал)',
    caption_ru: 'Должности (персонал)',
    caption_az: 'Vəzifələr (işçi heyət)',
    cmdType: 'showForm',
    formCode: 'hr_positionList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_positionAll',
    isFolder: 0,
    caption: 'Посади всі (персонал)',
    caption_uk: 'Посади всі (персонал)',
    caption_ru: 'Должности все (персонал)',
    caption_az: 'Bütün vəzifələr (işçi heyəti)',
    cmdType: 'showForm',
    formCode: 'hr_positionListAll',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_position_vac',
    isFolder: 0,
    caption: 'Вакантні посади',
    caption_uk: 'Вакантні посади',
    caption_ru: 'Вакантные должности',
    caption_az: 'Vakant vəzifələr',
    cmdType: 'showForm',
    formCode: 'hr_position-vac',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_positionVacContest',
    isFolder: 0,
    caption: 'Вакантні посади (конкурс)',
    caption_uk: 'Вакантні посади (конкурс)',
    caption_ru: 'Вакантные должности (конкурс)',
    caption_az: 'Vakant vəzifələr (müsabiqə)',
    cmdType: 'showForm',
    formCode: 'hr_positionVacContest',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employee',
    isFolder: 0,
    caption: 'Особи (персонал)',
    caption_uk: 'Особи (персонал)',
    caption_ru: 'Физические лица (персонал)',
    caption_az: 'Şəxslər (işçi heyəti)',
    cmdType: 'showForm',
    formCode: 'hr_employeeList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeeAll',
    isFolder: 0,
    caption: 'Особи (всі)',
    caption_uk: 'Особи (всі)',
    caption_ru: 'Физические лица (все)',
    caption_az: 'Şəxslər (hamısı)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_employee',
        method: 'select',
        fieldList: [
          { name: 'lastName' },
          { name: 'firstName' },
          { name: 'middleName' },
          { name: 'tabNum' },
          { name: 'sexType' },
          { name: 'taxCode' },
          { name: 'birthDate' },
          { name: 'age' },
          { name: 'citizenshipID.name', description: `{{UB.i18n('Громадянство')}}` },
          { name: 'fullFIO', description: `{{UB.i18n('Опис')}}`, visibility: false }
        ],
        whereList: {
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          }
        }
      }]
    },
    cmpInitConfig: {
      hideActions: ['showDetail', 'addNewByCurrent']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeeTabList',
    isFolder: 0,
    caption: 'Працівники',
    caption_uk: 'Працівники',
    caption_ru: 'Работники',
    caption_az: 'Əməkdaşlar',
    cmdType: 'showForm',
    formCode: 'hr_employeeTabList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeeTabListCurrent',
    isFolder: 0,
    caption: 'Працівники (діючі)',
    caption_uk: 'Працівники (діючі)',
    caption_ru: 'Работники (действующие)',
    caption_az: 'Əməkdaşlar (aktiv)',
    cmdType: 'showForm',
    formCode: 'hr_employeeTabListCurrent',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeeListNoStaff',
    isFolder: 0,
    caption: 'Працівники (позаштатні)',
    caption_uk: 'Працівники (позаштатні)',
    caption_ru: 'Работники (внештатные)',
    caption_az: 'Əməkdaşlar (ştatdankənar)',
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberList',
    cmdData: {
      customParams: {
        mode: 'NOSTAFF'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'trf_employeeNumberList',
    isFolder: 0,
    cmdType: 'showForm',
    caption: 'Робочі місця',
    caption_uk: 'Робочі місця',
    caption_ru: 'Рабочие места',
    caption_az: 'İş yerləri',
    formCode: 'hr_employeeNumberList',
    cmpInitConfig: {
      caption: 'Робочі місця',
      caption_uk: 'Робочі місця',
      caption_ru: 'Рабочие места',
      tip: `{{UB.i18n('Робочі місця')}}`,
      model: 'HR',
      cmdData: {
        customParams: {
          mode: 'WORKPLACE'
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-alt',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeePositionList',
    isFolder: 0,
    caption: 'Призначення працівників',
    caption_uk: 'Призначення працівників',
    caption_ru: 'Назначения работников',
    caption_az: 'Əməkdaş təyinatları',
    cmdType: 'showForm',
    formCode: 'hr_employeePositionList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_positionInstructionList',
    isFolder: 0,
    caption: 'Посадові інструкції',
    caption_uk: 'Посадові інструкції',
    caption_ru: 'Должностные инструкции',
    caption_az: 'Vəzifə təlimatları',
    cmdType: 'showForm',
    formCode: 'hr_positionInstructionList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeeNumberList',
    isFolder: 0,
    caption: 'Особові рахунки',
    caption_uk: 'Особові рахунки',
    caption_ru: 'Лицевые счета',
    caption_az: 'Şəxsi hesablar',
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_empListAudit',
    isFolder: 0,
    caption: 'Журнал перевірок',
    caption_uk: 'Журнал перевірок',
    caption_ru: 'Журнал проверок',
    caption_az: 'Yoxlama jurnalı',
    cmdType: 'showForm',
    formCode: 'hr_empListAudit',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_empListCustom',
    isFolder: 0,
    caption: 'Списки працівників',
    caption_uk: 'Списки працівників',
    caption_ru: 'Списки работников',
    caption_az: 'Əməkdaşların siyahısı',
    cmdType: 'showForm',
    formCode: 'hr_empListCustom',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    code: 'reportsEmpListCommon',
    isFolder: 1,
    caption: 'Списки працівників',
    caption_uk: 'Списки працівників',
    caption_ru: 'Списки работников',
    caption_az: 'Əməkdaşların siyahısı',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListAlphabet',
        isFolder: 0,
        caption: 'За алфавітом',
        caption_uk: 'За алфавітом',
        caption_ru: 'По алфавиту',
        caption_az: 'Əlifba sırası ilə',
        cmdType: 'showForm',
        formCode: 'hr_empListAlphabet',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListByAge',
        isFolder: 0,
        caption: 'За віком',
        caption_uk: 'За віком',
        caption_ru: 'По возрасту',
        caption_az: 'Yaşa görə',
        cmdType: 'showForm',
        formCode: 'hr_empListByAge',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 2
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListBirth',
        isFolder: 0,
        caption: 'Дні народження',
        caption_uk: 'Дні народження',
        caption_ru: 'Дни рождения',
        caption_az: 'Doğum günləri',
        cmdType: 'showForm',
        formCode: 'hr_empListBirth',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListByExperience',
        isFolder: 0,
        caption: 'Державні службовці з визначенням терміну служби',
        caption_uk: 'Державні службовці з визначенням терміну служби',
        caption_ru: 'Государственные служащие с определением срока службы',
        caption_az: 'Müəyyən xidmət müddəti ilə dövlət qulluqçuları',
        cmdType: 'showForm',
        formCode: 'hr_empListByExperience',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 4
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListByChilds',
        isFolder: 0,
        caption: 'Мають дітей (за віком)',
        caption_uk: 'Мають дітей (за віком)',
        caption_ru: 'Имеют детей (по возрасту)',
        caption_az: 'Övladı olanlar (yaşa görə)',
        cmdType: 'showForm',
        formCode: 'hr_empListByChilds',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 5
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListEducation',
        isFolder: 0,
        caption: 'За освітою',
        caption_uk: 'За освітою',
        caption_ru: 'По образованию',
        caption_az: 'Təhsilə görə',
        cmdType: 'showForm',
        formCode: 'hr_empListEducation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 6
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListProfEducation',
        isFolder: 0,
        caption: 'За професійним навчанням',
        caption_uk: 'За професійним навчанням',
        caption_ru: 'По профессиональному обучению',
        caption_az: 'Peşə təhsilinə görə',
        cmdType: 'showForm',
        formCode: 'hr_empListProfEducation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 7
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListCertificationAcc',
        isFolder: 0,
        caption: 'За атестацією',
        caption_uk: 'За атестацією',
        caption_ru: 'По аттестаци',
        caption_az: 'Attestasiyaya görə',
        cmdType: 'showForm',
        formCode: 'hr_empListCertificationAcc',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 8
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListAppointments',
        isFolder: 0,
        caption: 'Список призначень',
        caption_uk: 'Список призначень',
        caption_ru: 'Список назначений',
        caption_az: 'Randevuların siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_empListAppointments',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 9
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListCheckMedical',
        isFolder: 0,
        caption: 'За проходженням медоглядів',
        caption_uk: 'За проходженням медоглядів',
        caption_ru: 'По прохождению медосмотров',
        caption_az: 'Tibbi müayinələrdən keçdikdən sonra',
        cmdType: 'showForm',
        formCode: 'hr_empListCheckMedical',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListCommon',
        code: 'hr_empListChangeCredentials',
        isFolder: 0,
        caption: 'За зміною облікових даних',
        caption_uk: 'За зміною облікових даних',
        caption_ru: 'За изменением учетных данных',
        caption_az: 'Etimadnamələri dəyişdirməklə',
        cmdType: 'showForm',
        formCode: 'hr_empListChangeCredentials',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsEmpListByOrder',
    isFolder: 1,
    caption: 'За наказами з персоналу',
    caption_uk: 'За наказами з персоналу',
    caption_ru: 'Согласно приказам по персоналу',
    caption_az: 'Kadr əmrinə əsasən',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 2,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListRank',
        isFolder: 0,
        caption: 'Присвоєння рангів',
        caption_uk: 'Присвоєння рангів',
        caption_ru: 'Присвоение рангов',
        caption_az: 'Dərəcələrin verilməsi',
        cmdType: 'showForm',
        formCode: 'hr_empListRank',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListBonus',
        isFolder: 0,
        caption: 'Нагороджені працівники',
        caption_uk: 'Нагороджені працівники',
        caption_ru: 'Награжденные работники',
        caption_az: 'Mükafatlandırılmış əməkdaşlar',
        cmdType: 'showForm',
        formCode: 'hr_empListBonus',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 2
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListWithPenalty',
        isFolder: 0,
        caption: 'Із дисциплінарними порушеннями',
        caption_uk: 'Із дисциплінарними порушеннями',
        caption_ru: 'С дисциплинарными проступками',
        caption_az: 'İntizam pozuntusu ilə',
        cmdType: 'showForm',
        formCode: 'hr_empListWithPenalty',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListAppointed',
        isFolder: 0,
        caption: 'Призначені за період',
        caption_uk: 'Призначені за період',
        caption_ru: 'Назначенные за период',
        caption_az: 'Dövr üzrə təyinatlar',
        cmdType: 'showForm',
        formCode: 'hr_empListAppointed',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 4
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListMoved',
        isFolder: 0,
        caption: 'Переведені за період',
        caption_uk: 'Переведені за період',
        caption_ru: 'Переведенные за период',
        caption_az: 'Dövr üzrə keçirilmişlər',
        cmdType: 'showForm',
        formCode: 'hr_empListMoved',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 5
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListDism',
        isFolder: 0,
        caption: 'Звільнені за період',
        caption_uk: 'Звільнені за період',
        caption_ru: 'Уволенные за период',
        caption_az: 'Dövr üzrə işdən azad olunmuşlar',
        cmdType: 'showForm',
        formCode: 'hr_empListDism',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 6
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListOverNorm',
        isFolder: 0,
        caption: 'Працювали понаднормово, в вихідні дні',
        caption_uk: 'Працювали понаднормово, в вихідні дні',
        caption_ru: 'Работали сверхурочно, в выходные дни',
        caption_az: 'Həftə sonları iş vaxtından artıq işləyənlər',
        cmdType: 'showForm',
        formCode: 'hr_empListOverNorm',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 7
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListExpAllowanceOrder',
        isFolder: 0,
        caption: 'Встановлення надбавки за вислугу',
        caption_uk: 'Встановлення надбавки за вислугу',
        caption_ru: 'Установка надбавок за выслугу',
        caption_az: 'Staja görə müavinətlərin təyin edilməsi',
        cmdType: 'showForm',
        formCode: 'hr_empListExpAllowanceOrder',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 8
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListEmpExperience',
        isFolder: 0,
        caption: 'Список працівників за стажами',
        caption_uk: 'Список працівників за стажами',
        caption_ru: 'Список работников по стажам',
        caption_az: 'Staja görə əməkdaşların siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_empListEmpExperience',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 9
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empListEmpBountyHelp',
        isFolder: 0,
        caption: 'Список працівників, яким призначено матдопомогу',
        caption_uk: 'Список працівників, яким призначено матдопомогу',
        caption_ru: 'Список работников, которым назначена матпомощь',
        caption_az: 'Analıq müavinəti təyin olunan əməkdaşların siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_empListEmpBountyHelp',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empActingList',
        isFolder: 0,
        caption: "Виконуючі обов'язки",
        caption_uk: "Виконуючі обов'язки",
        caption_ru: 'Исполняющие обязаности',
        caption_az: 'Vəzifə öhdəliklərini yerinə yetirən',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              entity: 'hr_empActingList',
              method: 'select',
              fieldList: [
                { name: 'posName', description: `{{UB.i18n('Посада')}}` },
                { name: 'actualPositionName', description: `{{UB.i18n('Фактична посада')}}` },
                { name: 'fullFIO', description: `{{UB.i18n('ПІБ')}}` },
                { name: 'tempFullFIO', description: "{{UB.i18n(`Виконуючий обов'язки`)}}" },
                { name: 'tempPosName', description: "{{UB.i18n(`Посада виконуючого обов'язки`)}}" },
                { name: 'tempActualPositionName', description: "{{UB.i18n(`Фактична посада виконуючого обов'язки`)}}" },
                { name: 'dateFrom', description: `{{UB.i18n('Дата початку')}}` },
                { name: 'dateTo', description: `{{UB.i18n('Дата закінчення')}}` },
                { name: 'orderDescription', description: `{{UB.i18n('Документ підстава')}}` },
                { name: 'condition', description: `{{UB.i18n('Умова закінчення')}}` },
                { name: 'entityName', visibility: false }
              ]
            }
          ]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['addNew', 'addNewByCurrent', 'edit', 'newVersion', 'del', 'history', 'showPreview', 'itemLink',
            'commandLink', 'showDetail', 'audit'],
          listeners: {
            render: (grid) => {
              const useActualPositionName = AC.settings.get('hrOrderActualPositionName', appAC.globalOrganization()) === true
              let colActualPositionName = AC.gridUtils.getColumnByIndex(grid, 'actualPositionName')
              colActualPositionName.setVisible(useActualPositionName)
              colActualPositionName = AC.gridUtils.getColumnByIndex(grid, 'tempActualPositionName')
              colActualPositionName.setVisible(useActualPositionName)
            }
          },
          onDeterminateForm: function (grid) {
            const rec = AC.gridUtils.getCurrentRecord(grid)
            return {
              entityName: rec.get('entityName'),
              cmpInitConfig: {
                hideActions: ['fDelete'],
                isReadOnly: true
              }
            }
          },
          customActions: [
            {
              text: `{{UB.i18n('Припинити')}}`,
              actionId: 'stopEmpActing',
              iconCls: 'fa fa-times',
              noActionButton: true,
              scale: 'medium',
              disabled: true,
              handler: function (btn) {
                const grid = btn.up('grid')
                const reco = AC.gridUtils.getCurrentRecord(grid)
                if (!reco) {
                  $App.dialogInfo(UB.i18n('Не вибрано запис'), UB.i18n('Увага'))
                  return
                }
                let dateTo
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_selectDateTo',
                  cmpInitConfig: {
                    defaultValues: { dateFrom: reco.data.dateFrom },
                    onSelect: function (selectedDateTo) {
                      dateTo = AC.dateService.unshiftDate(selectedDateTo)
                      grid.setLoading(true)
                      $App.connection.run({
                        entity: 'hr_empActingList',
                        method: 'closeDateTo',
                        itemID: reco.get('ID'),
                        entityName: reco.get('entityName'),
                        dateTo: dateTo
                      }).then(mParams => {
                        if (mParams.result) {
                          grid.onRefresh()
                          AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', false)
                          AC.gridUtils.enableCustomAction(grid, 'clearActingDateTo', false)
                        }
                        grid.setLoading(false)
                      }, (err) => {
                        grid.setLoading(false)
                        throw err
                      })
                    }
                  }
                })
              }
            },
            {
              text: `{{UB.i18n('Очистити дату закінчення')}}`,
              actionId: 'clearActingDateTo',
              iconCls: 'fas fa-eraser',
              cls: 'fill-action',
              noActionButton: true,
              disabled: true,
              handler: function (btn) {
                const grid = btn.up('grid')
                const reco = AC.gridUtils.getCurrentRecord(grid)
                if (!reco) {
                  $App.dialogInfo(UB.i18n('Не вибрано запис'), UB.i18n('Увага'))
                  return
                }
                grid.setLoading(true)
                $App.connection.run({
                  entity: 'hr_empActingList',
                  method: 'closeDateTo',
                  itemID: reco.get('ID'),
                  entityName: reco.get('entityName'),
                  dateTo: null
                }).then(mParams => {
                  if (mParams.result) {
                    grid.onRefresh()
                    AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', false)
                    AC.gridUtils.enableCustomAction(grid, 'clearActingDateTo', false)
                  }
                  grid.setLoading(false)
                }, (err) => {
                  grid.setLoading(false)
                  throw err
                })
              }
            }
          ],
          afterInit: function () {
            const grid = this
            AC.gridUtils.setGlobalOrganization(grid, 'organizationID')
            grid.on('selectionchange', function (selectionModel, selected, eOpts) {
              let onDate = AC.dateService.addDays(appAC.globalApplicationDate(), -1)
              const data = selected && selected[0] && selected[0].data
              let dateTo = data && data.dateTo
              let canStop = data && (dateTo || AC.dateService.maxDate()) > onDate
              let canClearDateTo = !!(data && dateTo)
              AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', canStop)
              AC.gridUtils.enableCustomAction(grid, 'clearActingDateTo', canClearDateTo)
            })
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 11
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByOrder',
        code: 'hr_empPosLiquidate',
        isFolder: 0,
        caption: 'Особи на ліквідованих посадах',
        caption_uk: 'Особи на ліквідованих посадах',
        caption_ru: 'Физические лица на ликидированных должностях',
        caption_az: 'Ləğv olunmuş vəzifələrdə şəxslər',
        cmdType: 'showForm',
        formCode: 'hr_empPosLiquidate',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 12
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsEmployee',
    isFolder: 1,
    caption: 'Звіти з персоналу',
    caption_uk: 'Звіти з персоналу',
    caption_ru: 'Отчеты по персоналу',
    caption_az: 'İşçi heyəti üzrə hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListMilitary',
        isFolder: 0,
        caption: 'Список військовозобов\'язаних',
        caption_uk: 'Список військовозобов\'язаних',
        caption_ru: 'Список военнообязаных',
        caption_az: 'Hərbi mükəlləfiyyətlilərin siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListMilitary',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 90
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListUnusedVacationEmployee',
        isFolder: 0,
        caption: 'Невикористані відпустки',
        caption_uk: 'Невикористані відпустки',
        caption_ru: 'Неиспользованные отпуска',
        caption_az: 'İstifadə olunmamış məzuniyyətlər',
        cmdType: 'showForm',
        formCode: 'hr_empListUnusedVacation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 32
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListUnusedVacationByPeriodsEmployee',
        isFolder: 0,
        caption: 'Невикористані відпустки по робочим періодам',
        caption_uk: 'Невикористані відпустки по робочим періодам',
        caption_ru: 'Неиспользованные отпуска по рабочим периодам',
        caption_az: 'İş vaxtı üçün istifadə olunmamış tətillər',
        cmdType: 'showForm',
        formCode: 'hr_empListUnusedVacationByPeriods',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 33
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListNotplannedVacationEmployee',
        isFolder: 0,
        caption: 'Працівники, які відсутні у Графіку відпусток',
        caption_uk: 'Працівники, які відсутні у Графіку відпусток',
        caption_ru: 'Работники, которые отсутствуют в Графике отпусков',
        caption_az: 'Məzuniyyət qrafikində olmayan əməkdaşlar',
        cmdType: 'showForm',
        formCode: 'hr_empListNotplannedVacation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 34
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListDisability',
        isFolder: 0,
        caption: 'Список осіб з пільгами',
        caption_uk: 'Список осіб з пільгами',
        caption_ru: 'Список физических лиц с льготами',
        caption_az: 'Faydaları olan insanların siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListDisability',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListChernobylVictims',
        isFolder: 0,
        caption: 'Список працівників, які постраждали внаслідок Чорнобильської катастрофи',
        caption_uk: 'Список працівників, які постраждали внаслідок Чорнобильської катастрофи',
        caption_ru: 'Список работников, пострадавших вследствие Чернобыльской катастрофы',
        caption_az: 'Çernobıl fəlakətindən zərər çəkən işçilərin siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListChernobylVictims',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListHarmful',
        isFolder: 0,
        caption: 'Список працівників, які працюють в шкідливих умовах на поточну дату',
        caption_uk: 'Список працівників, які працюють в шкідливих умовах на поточну дату',
        caption_ru: 'Список работников, работающих во вредных условиях на текущую дату',
        caption_az: 'Cari tarixə zərərli işlərdə çalışan əməkdaşların siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListHarmful',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 60
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportempListEvents',
        isFolder: 0,
        caption: 'Список працівників, які були прийняті, звільнені, переведені (за період)',
        caption_uk: 'Список працівників, які були прийняті, звільнені, переведені (за період)',
        caption_ru: 'Список работников, принятых, уволенных, переведенных (за период)',
        caption_az: 'Təyin olunan, azad olunan və keçirilən əməkdaşların siyahısı (dövr üzrə)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_empListEvents',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListEvaluation',
        isFolder: 0,
        caption: 'Список державних службовців (за результатами оцінювання)',
        caption_uk: 'Список державних службовців (за результатами оцінювання)',
        caption_ru: 'Список государственных служащих (по результатам оценивания)',
        caption_az: 'Dövlət qulluqçularının siyahısı (qiymətləndirmənin nəticəsinə görə)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListEvaluation',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 80
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListForYearEval',
        isFolder: 0,
        caption: 'Список планування оцінювання (за завданнями)',
        caption_uk: 'Список планування оцінювання (за завданнями)',
        caption_ru: 'Список планирование оценивания (по заданиям)',
        caption_az: 'Qiymətləndirmənin planlaşdırması cədvəli (tapşırıqlar üzrə)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListForYearEval',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 70
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListChornobCompens',
        isFolder: 0,
        caption: 'Список працівників з додатковими днями відпустки (Чорнобильські)',
        caption_uk: 'Список працівників з додатковими днями відпустки (Чорнобильські)',
        caption_ru: 'Список работников с дополнительными днями отпуска (Чернобыльские)',
        caption_az: 'Əlavə məzuniyyət günləri olan əməkdaşların siyahısı (Çernobıl)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListChornobCompens',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportEmpListAlphabet',
        isFolder: 0,
        caption: 'Список працівників (Контакти)',
        caption_uk: 'Список працівників (Контакти)',
        caption_ru: 'Список работников (Контакты)',
        caption_az: 'Əməkdaşların siyahısı (Əlaqə vasitələri)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpListAlphabet',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListJobRequirements',
        isFolder: 0,
        caption: 'Список працівників за відповідністю вимогам по посаді',
        caption_uk: 'Список працівників за відповідністю вимогам по посаді',
        caption_ru: 'Список работников за соответствием требованиям по должности',
        caption_az: 'Vəzifə tələblərinə uyğun olan əməkdaşların siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_empListJobRequirements',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListByDisability',
        isFolder: 0,
        caption: 'Список осіб з інвалідністю',
        caption_uk: 'Список осіб з інвалідністю',
        caption_ru: 'Список физических лиц с инвалидностью',
        caption_az: 'Əlilliyi olan insanların siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_empListByDisability',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListWarFare',
        isFolder: 0,
        caption: 'Список учасників бойових дій',
        caption_uk: 'Список учасників бойових дій',
        caption_ru: 'Список учасников боевых действий',
        caption_az: 'Hərbi əməliyyatların iştirakçılarının siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_empListWarFare',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_reportMilitaryRecruiters',
        isFolder: 0,
        caption: 'Списки персонального військового обліку, Додаток 5',
        caption_uk: 'Списки персонального військового обліку, Додаток 5',
        caption_ru: 'Списки персонального военного учета, Приложение 5',
        caption_az: 'Şəxsi hərbi qeydlərin siyahıları, Əlavə 5',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportMilitaryRecruiters',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 130
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_empListDayFixVacation',
        isFolder: 0,
        caption: 'Фіксовані дні відпустки',
        caption_uk: 'Фіксовані дні відпустки',
        caption_ru: 'Фиксированные дни отпуска',
        caption_az: 'Sabit tətil günləri',
        cmdType: 'showForm',
        formCode: 'hr_empListDayFixVacation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 140
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmployee',
        code: 'hr_employeeByFundingSources',
        isFolder: 0,
        caption: 'Список працівників за джерелами фінансування',
        caption_uk: 'Список працівників за джерелами фінансування',
        caption_ru: 'Список работников по источникам финансирования',
        caption_az: 'Maliyyələşdirmə mənbələrinə görə işçilərin siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_employeeByFundingSources',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsEmpListByNonAttendance',
    isFolder: 1,
    caption: 'За неявками',
    caption_uk: 'За неявками',
    caption_ru: 'По неявкам',
    caption_az: 'İş yerinə gəlməmə',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 4,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_empListMission',
        isFolder: 0,
        caption: 'У відрядженні',
        caption_uk: 'У відрядженні',
        caption_ru: 'В командировке',
        caption_az: 'Ezamiyyətdə',
        cmdType: 'showForm',
        formCode: 'hr_empListMission',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_empListActiveVacation',
        isFolder: 0,
        caption: 'У відпустці',
        caption_uk: 'У відпустці',
        caption_ru: 'В отпуске',
        caption_az: 'Məzuniyyətdə',
        cmdType: 'showForm',
        formCode: 'hr_empListActiveVacation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 2
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_empListUnpaidVac',
        isFolder: 0,
        caption: 'У неоплачуваній відпустці',
        caption_uk: 'У неоплачуваній відпустці',
        caption_ru: 'В неоплачиваемом отпуске',
        caption_az: 'Ödənişsiz məzuniyyətdə',
        cmdType: 'showForm',
        formCode: 'hr_empListUnpaidVac',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_empListUnpaidLongVac',
        isFolder: 0,
        caption: 'У неоплачуваній довгій відпустці',
        caption_uk: 'У неоплачуваній довгій відпустці',
        caption_ru: 'В неоплачиваемом длительном отпуске',
        caption_az: 'Uzadılmış ödənişsiz məzuniyyətdə',
        cmdType: 'showForm',
        formCode: 'hr_empListUnpaidLongVac',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 4
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_empListIllnessAbsent',
        isFolder: 0,
        caption: 'Відсутні через хворобу',
        caption_uk: 'Відсутні через хворобу',
        caption_ru: 'Отсутствуют по болезни',
        caption_az: 'Xəstəliyə görə iş yerinə gəlməmişdir',
        cmdType: 'showForm',
        formCode: 'hr_empListIllnessAbsent',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 5
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_empListPayAvg2MonthAbsent',
        isFolder: 0,
        caption: 'Відсутні з виплатою по середньому за 2 місяці',
        caption_uk: 'Відсутні з виплатою по середньому за 2 місяці',
        caption_ru: 'Отсутствуют с выплатой по среднему за 2 месяца',
        caption_az: '2 aylıq orta əmək haqqına görə ödənişlə iş yerinə gəlmir',
        cmdType: 'showForm',
        formCode: 'hr_empListPayAvg2MonthAbsent',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 6
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListByNonAttendance',
        code: 'hr_accrualReportTimeCost',
        isFolder: 0,
        caption: 'Список працівників з елементами обліку у табелі',
        caption_uk: 'Список працівників з елементами обліку у табелі',
        caption_ru: 'Список работников с элементами учета в табеле',
        caption_az: 'Cədvəldə uçot elementləri olan işçilərin siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-timeCost',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 8
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsEmpListSettingsByNonAttendance',
    isFolder: 1,
    caption: 'Налаштування списків за неявками',
    caption_uk: 'Налаштування списків за неявками',
    caption_ru: 'Настройки списков по неявкам',
    caption_az: 'İş yerinə gəlməmə siyahısının tənzimləmələri',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 5,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsEmpListSettingsByNonAttendance',
        code: 'hr_dictTimeGroupFromEmpList',
        isFolder: 0,
        caption: 'Групи елеменів обліку робочого часу',
        caption_uk: 'Групи елеменів обліку робочого часу',
        caption_ru: 'Группы элементов учета рабочего времени',
        caption_az: 'İş vaxtının uçotu qruplarının elementləri',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_dictTimeGroup') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 1
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTarifCoeff',
    isFolder: 0,
    caption: 'Тарифні розряди, коефіцієнти',
    caption_uk: 'Тарифні розряди, коефіцієнти',
    caption_ru: 'Тарифные разряды, коэффициенты',
    caption_az: 'Tarif kateqoriyaları, əmsallar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTarifCoeff',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'koef' },
          { name: 'accrualSum' },
          { name: 'dateFrom', config: { align: 'center' } },
          { name: 'dateToEmpty', config: { align: 'center' } }
        ],
        orderList: {
          dateFrom: { expression: '[dateFrom]', order: 'desc' },
          koef: { expression: '[koef]', order: 'asc' }
        }
      }]
    },
    cmpInitConfig: {
      customActions: [
        {
          text: `{{UB.i18n('Змінити тарифну ставку')}}`,
          iconCls: 'fa fa-money-check',
          cls: 'add-new-action',
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_dictTarifCoeff\', \'changeTariffCoeff\')}}',
          handler: function (btn) {
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_dictTarifCoeffChange',
              isModal: true,
              sender: btn.up('form')
            })
          }
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMultiGroup',
    isFolder: 0,
    caption: 'Групи підрозділів для меню',
    caption_uk: 'Групи підрозділів для меню',
    caption_ru: 'Группы подразделений для меню',
    caption_az: 'Menyular üçün alt bölmələr qrupları',
    cmdType: 'showForm',
    formCode: 'hr_dictMultiGroupList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSalaryScheme',
    isFolder: 0,
    caption: 'Схема посадових окладів',
    caption_uk: 'Схема посадових окладів',
    caption_ru: 'Схема должностных окладов',
    caption_az: 'Vəzifə maaşları sxemi',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_dictSalaryScheme',
          method: 'select',
          fieldList: [
            { name: 'name' },
            { name: 'schemeType' }
          ]
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictFssReq',
    isFolder: 0,
    caption: 'Типи заявок СС',
    caption_uk: 'Типи заявок СС',
    caption_ru: 'Типи заявок СС',
    caption_az: 'DSMF ərizələrinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictFssReq',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dateFromEmpty', config: { align: 'center' } },
          { name: 'dateToEmpty', config: { align: 'center' } }
        ],
        orderList: {
          dateFrom: { expression: '[dateFrom]', order: 'desc' },
          code: { expression: '[code]', order: 'asc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTariffGroup',
    isFolder: 0,
    caption: 'Тарифні групи організацій',
    caption_uk: 'Тарифні групи організацій',
    caption_ru: 'Тарифные группы организации',
    caption_az: 'Təşkilatın tarif qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTariffGroup',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Найменування')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictWorkType',
    isFolder: 0,
    caption: 'Види робіт',
    caption_uk: 'Види робіт',
    caption_ru: 'Виды работ',
    caption_az: 'İş növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictWorkType',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'shortName', description: `{{UB.i18n('Скорочена назва')}}` },
          { name: 'payElID.description', description: `{{UB.i18n('Вид оплати')}}` },
          { name: 'tariffSum', description: `{{UB.i18n('Тариф')}}` },
          { name: 'name', description: `{{UB.i18n('Повна назва')}}` }
        ]
      }]
    },
    cmpInitConfig: {
      hideActions: ['del']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSheetSigner',
    isFolder: 0,
    caption: 'Налаштування підписантів табеля',
    caption_uk: 'Налаштування підписантів табеля',
    caption_ru: 'Настройка подписантов табеля',
    caption_az: 'Hesabat kartı imzalayanların konfiqurasiyası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSheetSigner',
        method: 'select',
        fieldList: [
          { name: 'orderN', description: `{{UB.i18n('№ з/п')}}` },
          { name: 'signerName', description: `{{UB.i18n('Назва підписанта')}}` },
          { name: 'employeePositionID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'departmentID.description', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSigners',
    isFolder: 0,
    caption: 'Налаштування підписантів',
    caption_uk: 'Налаштування підписантів',
    caption_ru: 'Настройка подписантов',
    caption_az: 'Hesabat kartı imzalayanların',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSigners',
        method: 'select',
        fieldList: [
          { name: 'orderN', description: `{{UB.i18n('№ з/п')}}` },
          { name: 'signerName', description: `{{UB.i18n('Назва підписанта')}}` },
          { name: 'signerCode', description: `{{UB.i18n('Код підписанта')}}` },
          { name: 'signerType', description: `{{UB.i18n('Тип підписанта')}}` },
          { name: 'employeePositionID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'departmentID.description', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictDepType',
    isFolder: 0,
    caption: 'Типи підрозділів (персонал)',
    caption_uk: 'Типи підрозділів (персонал)',
    caption_ru: 'Типы подразделений (персонал)',
    caption_az: 'Struktur vahidi növləri (işçi heyəti)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictDepType',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Найменування')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictWagePay',
    isFolder: 0,
    caption: 'Типи посад держслужбовців',
    caption_uk: 'Типи посад держслужбовців',
    caption_ru: 'Типы должностей госслужащих',
    caption_az: 'Dövlət qulluğu vəzifələrinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictWagePay',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'jurisdiction', description: `{{UB.i18n('Юрисдикція держоргану')}}` },
          { name: 'paySum', description: `{{UB.i18n('Посадовий оклад')}}` },
          { name: 'dateFromEmpty', description: `{{UB.i18n('Дата з')}}` },
          { name: 'dateToEmpty', description: `{{UB.i18n('Дата по')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_categPayEl',
    isFolder: 0,
    caption: 'Нарахування для категорій посад',
    caption_uk: 'Нарахування для категорій посад',
    caption_ru: 'Начисление для категорий должностей',
    caption_az: 'Vəzifə kateqoriyalarına görə köçürmələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_categPayEl',
        method: 'select',
        fieldList: [
          { name: 'category' },
          { name: 'isPublicService' },
          { name: 'payElID.description' },
          { name: 'publicServiceType' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictProfession',
    isFolder: 0,
    caption: 'Класифікатори професій',
    caption_uk: 'Класифікатори професій',
    caption_ru: 'Классификаторы профессий',
    caption_az: 'İxtisas təsnifatçıları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictProfession',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name' },
          { name: 'codeZKPPTR' },
          { name: 'codeETKD' },
          { name: 'codeDKHP' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPosition',
    isFolder: 0,
    caption: 'Довідник посад',
    caption_uk: 'Довідник посад',
    caption_ru: 'Справочник должностей',
    caption_az: 'Vəzifə soraqçası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPosition',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'idxNum' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' },
          { name: 'nameNom', description: `{{UB.i18n('Назва в називному відмінку')}}` },
          { name: 'nameGen', description: `{{UB.i18n('Назва в родовому відмінку')}}` },
          { name: 'nameDat', description: `{{UB.i18n('Назва в давальному відмінку')}}` },
          { name: 'nameAcc', description: `{{UB.i18n('Назва в знахідному відмінку')}}` },
          { name: 'nameOr', description: `{{UB.i18n('Назва в орудному відмінку')}}` },
          { name: 'nameLoc', description: `{{UB.i18n('Назва в місцевому відмінку')}}` },
          { name: 'nameVoc', description: `{{UB.i18n('Назва в кличному відмінку')}}` },
          { name: 'fullName', description: `{{UB.i18n('Повна назва')}}` },
          { name: 'fullNameNom', description: `{{UB.i18n('Повна назва в називному відмінку')}}` },
          { name: 'fullNameGen', description: `{{UB.i18n('Повна назва в родовому відмінку')}}` },
          { name: 'fullNameDat', description: `{{UB.i18n('Повна назва в давальному відмінку')}}` },
          { name: 'fullNameAcc', description: `{{UB.i18n('Повна назва в знахідному відмінку')}}` },
          { name: 'fullNameOr', description: `{{UB.i18n('Повна назва в орудному відмінку')}}` },
          { name: 'fullNameLoc', description: `{{UB.i18n('Повна назва в місцевому відмінку')}}` },
          { name: 'fullNameVoc', description: `{{UB.i18n('Повна назва в кличному відмінку')}}` },
          { name: 'nameForeign' },
          { name: 'dictStaffCatID.description' },
          { name: 'dictWagePayID.description' },
          { name: 'positionCategory' },
          { name: 'dictStatePayID.description' },
          { name: 'psCategory' },
          { name: 'positionType' },
          { name: 'dictStaffSubCatID.description' },
          { name: 'dictSpecialtyID.name' },
          { name: 'dictEmpCategoryID.description' },
          { name: 'dictTarifCoeffID.description' },
          { name: 'workScheduleID.name' },
          { name: 'dictProfessionID.name', description: `{{UB.i18n('Класифікатор професій')}}` },
          { name: 'dictProfessionID.codeZKPPTR', description: `{{UB.i18n('Код ЗКППТР')}}` },
          { name: 'dictProfessionID.codeETKD', description: `{{UB.i18n('Випуск ЄТКД')}}` },
          { name: 'dictProfessionID.codeDKHP', description: `{{UB.i18n('Випуск ДКХП')}}` },
          { name: 'isActive', description: `{{UB.i18n('Ознака дії')}}` },
          { name: 'dictSalarySchemeLevelID.name', description: `{{UB.i18n('Група (рівень) за схемою посадових окладів')}}` },
          { name: 'dictCostTypeID.description', description: `{{UB.i18n('Місце виникнення витрат')}}` },
          { name: 'paymentType', description: `{{UB.i18n('Тип оплати')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictPositionProps',
    isFolder: 0,
    caption: 'Посади викладачів',
    caption_uk: 'Посади викладачів',
    caption_ru: 'Должности преподавателей',
    caption_az: 'Müəllim vəzifəsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_dictPositionProps',
        method: 'select',
        fieldList: [
          { name: 'dictPositionID.code', description: 'Код' },
          { name: 'dictPositionID.name', description: 'Назва' },
          { name: 'subject' },
          { name: 'pupil' }
        ]
      }]
    },
    cmpInitConfig: {
      hideActions: ['addNewByCurrent'],
      customActions: [{
        text: `{{UB.i18n('Додати списком')}}`,
        iconCls: 'u-icon-edit-alt',
        cls: 'fill-action',
        scale: 'medium',
        handler: function (btn) {
          const grid = btn.up('grid')
          UB.Repository('hr_dictPosition')
            .attrs(['ID', 'code', 'name', 'codeSort', 'description'])
            .orderBy('codeSort')
            .selectAsObject().then(sourceData => {
              const selectData = []
              grid.getData().forEach(o => selectData.push(Object.assign({ value: o.dictPositionID, ID: o.ID })))
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_elementSelect',
                isModal: true,
                sender: btn.up('form'),
                cmpInitConfig: {
                  sourceData,
                  selectData,
                  onSelectData: (data) => {
                    $App.connection.run({
                      entity: 'trf_dictPositionProps',
                      method: 'updateDictPositionProps',
                      data: JSON.stringify(data)
                    }).then(() => {
                      grid.getStore().load()
                    })
                  }
                }
              })
            })
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictHarmfulKind',
    isFolder: 0,
    caption: 'Види шкідливих умов праці',
    caption_uk: 'Види шкідливих умов праці',
    caption_ru: 'Виды вредных условий труда',
    caption_az: 'Zərərli iş şəraitinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictHarmfulKind',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Найменування')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_taxLimitList',
    isFolder: 0,
    caption: 'Пільги ПДФО',
    caption_uk: 'Пільги ПДФО',
    caption_ru: 'Льготы ПДФО',
    caption_az: 'Gəlir vergisi üzrə imtiyazlar',
    cmdType: 'showForm',
    formCode: 'hr_taxLimitList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_taxRate',
    isFolder: 0,
    caption: 'Ставки ПДФО',
    caption_uk: 'Ставки ПДФО',
    caption_ru: 'Ставки ПДФО',
    caption_az: 'Gəlir vergisi dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_taxRate',
        method: 'select',
        fieldList: [
          { name: 'yearFrom', format: '0000', config: { align: 'center' } },
          { name: 'sumFrom', format: '0.' },
          { name: 'rate' }
        ]
      }]
    },
    cmpInitConfig: {
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          sumFrom: {
            renderer: function (value) {
              return !value ? '' : value
            }
          }
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSalaryRank',
    isFolder: 0,
    caption: 'Надбавки за ранги держслужбовцям',
    caption_uk: 'Надбавки за ранги держслужбовцям',
    caption_ru: 'Надбавки за ранг госслужащим',
    caption_az: 'Dövlət qulluqçularının kateqoriyaları üzrə əlavələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSalaryRank',
        method: 'select',
        fieldList: [
          { name: 'dictRankID.description', description: `{{UB.i18n('Ранг')}}` },
          { name: 'paySum' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictIllnessPercent',
    isFolder: 0,
    caption: 'Відсотки для лікарняного (від стажу)',
    caption_uk: 'Відсотки для лікарняного (від стажу)',
    caption_ru: 'Проценты для больничного (от стажа)',
    caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsi ilə bağlı faizlər (staja görə)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictIllnessPercent',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'value', config: { align: 'center' } },
          { name: 'minMonths', config: { align: 'center' } },
          { name: 'dateFromEmpty', config: { align: 'center' } },
          { name: 'dateToEmpty', config: { align: 'center' } }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictVacationCorr',
    isFolder: 0,
    caption: 'Підстави коригування відпустки',
    caption_uk: 'Підстави коригування відпустки',
    caption_ru: 'Основания корректировки отпуска',
    caption_az: 'Məzuniyyət düzəlişlərinin əsasları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictVacationCorr',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'shortname' },
          { name: 'isCorr' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEducationLevel',
    isFolder: 0,
    caption: 'Рівні освіти',
    caption_uk: 'Рівні освіти',
    caption_ru: 'Уровни образования',
    caption_az: 'Təhsil səviyyələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEducationLevel',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'nominalName' },
          { name: 'level' },
          { name: 'educationKind' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBenefitsKind',
    isFolder: 0,
    caption: 'Види пільг',
    caption_uk: 'Види пільг',
    caption_ru: 'Виды льгот',
    caption_az: 'İmtiyaz növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBenefitsKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'type' },
          { name: 'dictVacationKindID.description', description: `{{UB.i18n('Вид відпустки')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRank',
    isFolder: 0,
    caption: 'Ранги держслужбовців',
    caption_uk: 'Ранги держслужбовців',
    caption_ru: 'Ранги госслужащих',
    caption_az: 'Dövlət qulluqçularının ixtisas dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRank',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_counter',
    isFolder: 0,
    caption: 'Нумерація наказів',
    caption_uk: 'Нумерація наказів',
    caption_ru: 'Нумерация приказов',
    caption_az: 'Əmrlərin nömrələnməsi',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_counter',
          method: 'select',
          fieldList: ['orderEntity', 'prefix', 'size', 'period', 'organization.name']
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1000
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictExperience',
    isFolder: 0,
    caption: 'Стаж роботи',
    caption_uk: 'Стаж роботи',
    caption_ru: 'Стаж работы',
    caption_az: 'İş stajları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictExperience',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictExperienceSpec',
    isFolder: 0,
    caption: 'Підстави обліку спецстажу',
    caption_uk: 'Підстави обліку спецстажу',
    caption_ru: 'Основания учета спецстажа',
    caption_az: 'Xüsusi staj uçotu üçün əsaslar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictExperienceSpec',
        method: 'select',
        fieldList: [
          { name: 'num' },
          { name: 'code' },
          { name: 'fullName' },
          { name: 'shortName' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictExperienceByPos',
    isFolder: 0,
    caption: 'Стажі за типами посад',
    caption_uk: 'Стажі за типами посад',
    caption_ru: 'Стажи по типам должностей',
    caption_az: 'Müvafiq vəzifələrdə staj',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictExperienceByPos',
        method: 'select',
        fieldList: [
          { name: 'positionType' },
          { name: 'dictExperienceID.name' },
          { name: 'useInOrders' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictLanguage',
    isFolder: 0,
    caption: 'Іноземні мови',
    caption_uk: 'Іноземні мови',
    caption_ru: 'Иностранные языки',
    caption_az: 'Xarici dillər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictLanguage',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictLanguageLevel',
    isFolder: 0,
    caption: 'Рівні володіння мовами',
    caption_uk: 'Рівні володіння мовами',
    caption_ru: 'Уровни владения языками',
    caption_az: 'Dil bilikləri səviyyəsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictLanguageLevel',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'level' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictDegree',
    isFolder: 0,
    caption: 'Наукові ступені',
    caption_uk: 'Наукові ступені',
    caption_ru: 'Научные степени',
    caption_az: 'Elmi dərəcələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictDegree',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictAreasOfEducation',
    isFolder: 0,
    caption: 'Напрями освіти',
    caption_uk: 'Напрями освіти',
    caption_ru: 'Направления образования',
    caption_az: 'Təhsil istiqamətləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictAreasOfEducation',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictKinshipKind',
    isFolder: 0,
    caption: 'Ступені споріднення',
    caption_uk: 'Ступені споріднення',
    caption_ru: 'Степени родства',
    caption_az: 'Qohumluq dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictKinshipKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictContractKind',
    isFolder: 0,
    caption: 'Види договорів',
    caption_uk: 'Види договорів',
    caption_ru: 'Виды договоров',
    caption_az: 'Müqavilə növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictContractKind',
        method: 'select',
        fieldList: [
          { name: 'contractType' },
          { name: 'code' },
          { name: 'name' },
          { name: 'isTerm' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictReasonDism',
    isFolder: 0,
    caption: 'Причини звільнення',
    caption_uk: 'Причини звільнення',
    caption_ru: 'Причины увольнения',
    caption_az: 'İşdən azad olunma səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictReasonDism',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'lawName' },
          { name: 'dismPayValue' },
          { name: 'dismPaySum' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictReasonMoving',
    isFolder: 0,
    caption: 'Причини переміщення',
    caption_uk: 'Причини переміщення',
    caption_ru: 'Причины перемещения',
    caption_az: 'Keçirilmə səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictReasonMoving',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictReasonTempAvgPay',
    isFolder: 0,
    caption: 'Причини тимчасового переведення з оплатою по середньому',
    caption_uk: 'Причини тимчасового переведення з оплатою по середньому',
    caption_ru: 'Причины временного перевода с оплатой по среднему',
    caption_az: 'Orta hesabla ödənişlə müvəqqəti köçürmənin səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictReasonTempAvgPay',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTermContract',
    isFolder: 0,
    caption: 'Термін контракту',
    caption_uk: 'Термін контракту',
    caption_ru: 'Срок контракта',
    caption_az: 'Müqavilənin müddəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTermContract',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'months' },
          { name: 'fullName' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictIllnessKind',
    isFolder: 0,
    caption: 'Типи листів непрацездатності',
    caption_uk: 'Типи листів непрацездатності',
    caption_ru: 'Типы больничных листов',
    caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsi vərəqələrinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictIllnessKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'shortname' },
          { name: 'isRst' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictIndexSalary',
    isFolder: 0,
    caption: 'Індекси споживчих цін',
    caption_uk: 'Індекси споживчих цін',
    caption_ru: 'Индекс потребительских цен',
    caption_az: 'İstehlakçı qiymətləri indeksi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictIndexSalary',
        method: 'select',
        fieldList: [
          {
            name: 'dateFrom',
            description: `{{UB.i18n('Дата')}}`,
            config: { align: 'center' }
          },
          {
            name: 'indexValue',
            description: `{{UB.i18n('Індекс')}}`
          },
          {
            name: 'isBase',
            description: `{{UB.i18n('Місяць підвищення доходу')}}`,
            config: { align: 'center' }
          }
        ],
        orderList: {
          orderBy: { expression: 'dateFrom', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          isBase: {
            renderer: function (value) {
              return !value || value === 'Ні' ? '' : 'Так'
            }
          }
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictIllnessReason',
    isFolder: 0,
    caption: 'Причини непрацездатності',
    caption_uk: 'Причини непрацездатності',
    caption_ru: 'Причины нетрудоспособности',
    caption_az: 'Əmək qabiliyyətinin itirilməsi səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictIllnessReason',
        method: 'select',
        fieldList: [
          { name: 'illnessKind' },
          { name: 'code' },
          { name: 'name' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' },
          { name: 'payElFOPID.description', description: `{{UB.i18n('Вид оплати за рахунок ФОП')}}` },
          { name: 'maxDayFOP' },
          { name: 'payElFSSUID.description', description: `{{UB.i18n('Вид оплати за рахунок СС')}}` },
          { name: 'orderN' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSicknessDay',
    isFolder: 0,
    caption: 'Обмеження днів сплати для лікарняних',
    caption_uk: 'Обмеження днів сплати для лікарняних',
    caption_ru: 'Ограничения дней уплаты для больничных',
    caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsinə görə ödənişli günlərin son həddi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSicknessDay',
        method: 'select',
        fieldList: [
          { name: 'dictIllnessReasonID.name' },
          { name: 'maxDay' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictIllnessRegime',
    isFolder: 0,
    caption: 'Лікарняні режими',
    caption_uk: 'Лікарняні режими',
    caption_ru: 'Больничные режимы',
    caption_az: 'Xəstəxana rejimləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictIllnessRegime',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictFutureOfWork',
    isFolder: 0,
    caption: 'Особливості роботи',
    caption_uk: 'Особливості роботи',
    caption_ru: 'Особенности работы',
    caption_az: 'İşin xüsusiyyətləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictFutureOfWork',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictLevelUsePc',
    isFolder: 0,
    caption: 'Рівні користування ПК',
    caption_uk: 'Рівні користування ПК',
    caption_ru: 'Уровень пользования ПК',
    caption_az: 'Komputer bilikləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictLevelUsePc',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRequiredPara',
    isFolder: 0,
    caption: 'Пункти вимоги',
    caption_uk: 'Пункти вимоги',
    caption_ru: 'Пункты требования',
    caption_az: 'Tələb maddələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRequiredPara',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'requirementKind' },
          { name: 'isActive' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRequiredPosition',
    isFolder: 0,
    caption: 'Вимоги до посад (професійні знання)',
    caption_uk: 'Вимоги до посад (професійні знання)',
    caption_ru: 'Требования к должности (профессиональные знания)',
    caption_az: 'Vəzifə tələbləri (ixtisas bilikləri)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRequiredPosition',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'requirementKind' },
          { name: 'dictRequiredParaID.name', description: `{{UB.i18n('Пункт вимог')}}` },
          { name: 'isActive' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_dictPeriod',
    isFolder: 0,
    caption: 'Розрахункові періоди',
    caption_uk: 'Розрахункові періоди',
    caption_ru: 'Расчетные периоды',
    caption_az: 'Hesabat dövrləri',
    cmdType: 'showForm',
    formCode: 'hr_dictPeriodList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTimeGroup',
    isFolder: 0,
    caption: 'Групи елементів обліку робочого часу',
    caption_uk: 'Групи елементів обліку робочого часу',
    caption_ru: 'Группы элементов учета рабочего времени',
    caption_az: 'İş vaxtı uçotunun atributlarının qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTimeGroup',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTimeCost',
    isFolder: 0,
    caption: 'Елементи обліку робочого часу',
    caption_uk: 'Елементи обліку робочого часу',
    caption_ru: 'Элементы учета рабочего времени',
    caption_az: 'İş vaxt uçotunun atributları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTimeCost',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'dictTimePrintName', description: `{{UB.i18n('Колонка для відображення невиходу у табелі')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'nameSmall', description: `{{UB.i18n('Коротка назва')}}` },
          { name: 'nameShort', config: { align: 'center' } },
          { name: 'timeCostType' }
        ]
      }]
    },
    cmpInitConfig: {
      hideActions: ['addNewByCurrent'],
      listeners: {
        render: grid => {
          const copyAction = {
            text: UB.i18n('Копіювати'),
            iconCls: 'el-icon-copy-document',
            disabled: !AC.entityUtils.verifyRightsMethod('hr_dictTimeCost', 'addnew'),
            handler: function (btn) {
              let record = AC.gridUtils.getCurrentRecord(grid)
              grid.setLoading(true)
              if (!record) {
                AC.viewUtils.showToast('Помилка', 'Не вибрано запис')
                return
              }
              const dictTimeCostID = record.get('ID')
              $App.connection.run({
                entity: 'hr_dictTimeCost',
                method: 'copyRecord',
                ID: dictTimeCostID
              }).then((mParams) => {
                grid.onRefresh()
                grid.setLoading(false)
                $App.doCommand({
                  cmdType: 'showForm',
                  entity: 'hr_dictTimeCost',
                  formCode: 'hr_dictTimeCost',
                  instanceID: mParams.instanceID,
                  tabId: 'hr_dictTimeCost_copyRecord' + Date.now(),
                  target: $App.getViewport().centralPanel,
                  cmpInitConfig: {
                    method: 'copyRecord',
                    sourceGrid: grid
                  }
                })
              }, err => {
                grid.setLoading(false)
                throw err
              })
            }
          }
          grid.menu.insert(1, copyAction)
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTimeCostInt',
    isFolder: 0,
    caption: 'Можливий перетин елементів обліку',
    caption_uk: 'Можливий перетин елементів обліку',
    caption_ru: 'Возможное пересечение элементов учета',
    caption_az: 'Uçot attributlarının mümkün kəsişməsləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTimeCostInt',
        method: 'select',
        fieldList: [
          { name: 'dictTimeCost1ID.nameSmall' },
          { name: 'dictTimeCost2ID.nameSmall' },
          { name: 'priorityType', config: { align: 'center' } },
          { name: 'dateFrom', format: 'd.m.Y', config: { align: 'center' } },
          { name: 'dateTo', format: 'd.m.Y', config: { align: 'center' } }
        ]
      }]
    },
    cmpInitConfig: {
      customInit: function () {
        AC.gridUtils.renderer(this, ['dateFrom', 'dateTo'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_workSchedule',
    isFolder: 0,
    caption: 'Графіки робочого часу',
    caption_uk: 'Графіки робочого часу',
    caption_ru: 'Графики рабочего времени',
    caption_az: 'İş vaxtı qrafikləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_workSchedule',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}`, config: { align: 'center' } },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'dateFrom', description: `{{UB.i18n('Дата початку дії')}}`, config: { align: 'center' } },
          { name: 'dateTo', description: `{{UB.i18n('Дата закінчення дії')}}`, config: { align: 'center' } },
          { name: 'begins', description: `{{UB.i18n('Починається з')}}` },
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true }
        ],
        whereList: {
          state: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          organizationID: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([organizationID] AND [state]) OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      customInit: function () {
        AC.gridUtils.renderer(this, ['dateFrom', 'dateTo'])
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCases',
    isFolder: 0,
    caption: 'Відмінки підрозділів',
    caption_uk: 'Відмінки підрозділів',
    caption_ru: 'Падежи подразделений',
    caption_az: 'Struktur vahidlərinin halları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCases',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'nameNom' },
          { name: 'nameGen' },
          { name: 'nameDat' },
          { name: 'nameAcc' },
          { name: 'nameOr' },
          { name: 'nameLoc' },
          { name: 'nameVoc' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_payEl',
    isFolder: 0,
    caption: 'Види оплати',
    caption_uk: 'Види оплати',
    caption_ru: 'Виды оплаты',
    caption_az: 'Ödəniş növləri',
    cmdType: 'showForm',
    formCode: 'hr_payElList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_methodGroup',
    isFolder: 0,
    caption: 'Групи методів розрахунку',
    caption_uk: 'Групи методів розрахунку',
    caption_ru: 'Группы методов расчета',
    caption_az: 'Hesablaşma metodu qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_methodGroup',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_method',
    isFolder: 0,
    caption: 'Методи розрахунку видів оплати',
    caption_uk: 'Методи розрахунку видів оплати',
    caption_ru: 'Методы расчета видов оплаты',
    caption_az: 'Ödəniş növlərinin hesablanması metodları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_method',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'methodGroupID.name', description: `{{UB.i18n('Група методів розрахунку')}}` },
          { name: 'methodGroupID.groupType', description: `{{UB.i18n('Тип метода')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_payFundMethod',
    isFolder: 0,
    caption: 'Методи розрахунку нарахувань на зарплату',
    caption_uk: 'Методи розрахунку нарахувань на зарплату',
    caption_ru: 'Методы расчета начисленый на зарплату',
    caption_az: 'Əmək haqqının hesablanması metodları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payFundMethod',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_entryOperation',
    isFolder: 0,
    caption: 'Типові операції',
    caption_uk: 'Типові операції',
    caption_ru: 'Типовые операции',
    caption_az: 'Tipik əməliyyatlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_entryOperation',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_accrualReportPrintSettings',
    isFolder: 0,
    caption: 'Налаштування друку довідок',
    caption_uk: 'Налаштування друку довідок',
    caption_ru: 'Настройка печати справок',
    caption_az: 'Çap parametrlərinə kömək edin',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_accrualReportPrintSettings',
          method: 'select',
          fieldList: [
            { name: 'organizationID.description', description: 'Організація' }
          ],
          whereList: {
            posDateFrom: {
              expression: '[organizationID.mi_dateFrom]',
              condition: 'lessEqual',
              value: '{{appAC.globalApplicationDate()}}'
            },
            posDateTo: {
              expression: '[organizationID.mi_dateTo]',
              condition: 'moreEqual',
              value: '{{appAC.globalApplicationDate()}}'
            },
            posState: {
              expression: '[organizationID.state]',
              condition: '=',
              value: 'ACTIVE'
            }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      onDeterminateForm: function () {
        return {
          entityName: 'hr_accrualReportPrintSettings',
          formCode: 'hr_accrualReportPrintSettings',
          cmpInitConfig: {
            disableChangeOrg: true,
            defaultValues: {
              organizationID: appAC.globalOrganization()
            }
          }
        }
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_payDim',
    isFolder: 0,
    caption: 'Шифри витрат',
    caption_uk: 'Шифри витрат',
    caption_ru: 'Шифр затрат',
    caption_az: 'Xərc maddəsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payDim',
        method: 'select',
        fieldList: [
          { name: 'dimension.description', description: `{{UB.i18n('Аналітика')}}` },
          { name: 'dimOrder' },
          { name: 'required' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_methodExp',
    isFolder: 0,
    caption: 'Методи розрахунку стажів',
    caption_uk: 'Методи розрахунку стажів',
    caption_ru: 'Методы расчета стажей',
    caption_az: 'Staj hesablanması metodları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_methodExp',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTaxIndivid',
    isFolder: 0,
    caption: 'Види доходів фізичних осіб',
    caption_uk: 'Види доходів фізичних осіб',
    caption_ru: 'Виды доходов физических лиц',
    caption_az: 'Şəxslərin gəlir növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTaxIndivid',
        method: 'select',
        fieldList: [
          { name: 'code', config: { align: 'center' } },
          { name: 'codeReport', config: { align: 'center' } },
          { name: 'name' },
          { name: 'taxBreaks', config: { align: 'center' } },
          { name: 'priority' },
          {
            name: 'dateFromEmpty',
            description: `{{UB.i18n('Дата початку')}}`,
            format: 'd.m.Y',
            tooltip: 'Дата початку дії',
            config: { align: 'center' }
          },
          {
            name: 'dateToEmpty',
            description: `{{UB.i18n('Дата закінчення')}}`,
            format: 'd.m.Y',
            tooltip: 'Дата закінчення дії',
            config: { align: 'center' }
          }
        ]
      }]
    },
    cmpInitConfig: {
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          taxBreaks: {
            renderer: function (value) {
              return !value || value === 'Ні' ? '' : 'Так'
            }
          }
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictHoliday',
    isFolder: 0,
    caption: 'Свята',
    caption_uk: 'Свята',
    caption_ru: 'Праздники',
    caption_az: 'Bayramlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictHoliday',
        method: 'select',
        fieldList: [
          {
            name: 'dictTimeCostID.name',
            description: `{{UB.i18n('Елементи обліку робочого часу')}}`,
            tooltip: 'Елементи обліку робочого часу'
          },
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'onDate', description: `{{UB.i18n('Дата')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_maxBaseECB',
    isFolder: 0,
    caption: 'База нарахування ЄСВ',
    caption_uk: 'База нарахування ЄСВ',
    caption_ru: 'База начисления ЕСВ',
    caption_az: 'Birdəfəlik sosial ödənişin mənbəyi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_maxBaseECB',
        method: 'select',
        fieldList: [
          { name: 'dateFrom', format: 'd.m.Y', config: { align: 'center' } },
          { name: 'dateTo', visibility: false },
          { name: 'minSum', format: '0.00' },
          { name: 'maxSum', format: '0.00' }
        ],
        orderList: {
          orderBy: { expression: 'dateTo', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          minSum: { renderer: function (value) { return !value ? '' : value.toFixed(2) } },
          maxSum: { renderer: function (value) { return !value ? '' : value.toFixed(2) } }
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictParentUnitType',
    isFolder: 0,
    caption: 'Типи підпорядкування',
    caption_uk: 'Типи підпорядкування',
    caption_ru: 'Типы подчинения',
    caption_az: 'Subordinasiya növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictParentUnitType',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_outgoingFalseFact',
    isFolder: 0,
    caption: 'Факти подання неправдивої інформації',
    caption_uk: 'Факти подання неправдивої інформації',
    caption_ru: 'Факты представление ложной информации',
    caption_az: 'Səhv məlumat təqdim etmə faktları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_outgoingFalseFact',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictDisabilityType',
    isFolder: 0,
    caption: 'Види інвалідності',
    caption_uk: 'Види інвалідності',
    caption_ru: 'Виды инвалидности',
    caption_az: 'Əlillik növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictDisabilityType',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'dictVacationKindID', description: `{{UB.i18n('Вид відпустки')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictAddInfKind',
    isFolder: 0,
    caption: 'Види додаткової інформації',
    caption_uk: 'Види додаткової інформації',
    caption_ru: 'Виды дополнительной информации',
    caption_az: 'Əlavə məlumat növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictAddInfKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictAuditOrg',
    isFolder: 0,
    caption: 'Організації спецперевірок',
    caption_uk: 'Організації спецперевірок',
    caption_ru: 'Организации спецпроверок',
    caption_az: 'Xüsusi yoxlama orqanları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictAuditOrg',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'contractorID.name', description: `{{UB.i18n('Назва')}}` },
          { name: 'auditType' },
          { name: 'abbreviation' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_payFund',
    isFolder: 0,
    caption: 'Нарахування на зарплату',
    caption_uk: 'Нарахування на зарплату',
    caption_ru: 'Начисления для зарплаты',
    caption_az: 'Əmək haqqı hesablaşmaları',
    cmdType: 'showForm',
    formCode: 'hr_payFundList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCauseOfDeath',
    isFolder: 0,
    caption: 'Причини смерті',
    caption_uk: 'Причини смерті',
    caption_ru: 'Причины смерти',
    caption_az: 'Ölüm səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCauseOfDeath',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRankAssignKind',
    isFolder: 0,
    caption: 'Види присвоєння рангу держслужбовцям',
    caption_uk: 'Види присвоєння рангу держслужбовцям',
    caption_ru: 'Виды присвоения ранга госслужащего',
    caption_az: 'Dövlət qulluqçusu dərəcəsinin verilməsi növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRankAssignKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictAppointKind',
    isFolder: 0,
    caption: 'Типи (підстави) призначення',
    caption_uk: 'Типи (підстави) призначення',
    caption_ru: 'Типы (основания) назначения',
    caption_az: 'Təyinat növləri (əsasları)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictAppointKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'type' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_dictTempExecution',
    isFolder: 0,
    caption: 'ТВО за положенням',
    caption_uk: 'ТВО за положенням',
    caption_ru: 'ВИО по положению',
    caption_az: 'Vəzifəyə görə VIE',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTempExecution',
        method: 'select',
        fieldList: [
          { name: 'employeePositionID.description' },
          { name: 'employeePositionTempID.description' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' },
          { name: 'numQueue' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    }
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPensionType',
    isFolder: 0,
    caption: 'Типи пенсії',
    caption_uk: 'Типи пенсії',
    caption_ru: 'Типы пенсий',
    caption_az: 'Təqaüd növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPensionType',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCategAssets',
    isFolder: 0,
    caption: 'Категорії майна',
    caption_uk: 'Категорії майна',
    caption_ru: 'Категории имущества',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCategAssets',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_empVacationScheduleList',
    isFolder: 0,
    caption: 'Заплановані відпустки',
    caption_uk: 'Заплановані відпустки',
    caption_ru: 'Запланированные отпуска',
    caption_az: 'Planlaşdırılmış məzuniyyətlər',
    cmdType: 'showForm',
    formCode: 'hr_vacationScheduleList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_empVacationScheduleListYear',
    isFolder: 0,
    caption: 'Графік відпусток (рік)',
    caption_uk: 'Графік відпусток (рік)',
    caption_ru: 'График отпусков (год)',
    caption_az: 'Məzuniyyət qrafiki (il)',
    cmdType: 'showForm',
    formCode: 'hr_vacationScheduleListYear',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictVacationPlanDayList',
    isFolder: 0,
    caption: 'Дні відпустки за видами відпустки та типами посад',
    caption_uk: 'Дні відпустки за видами відпустки та типами посад',
    caption_ru: 'Дни отпуска по видам отпуска и типами должностей',
    caption_az: 'Vəzifə və məzuniyyət növlərinə görə məzuniyyət günləri',
    cmdType: 'showForm',
    formCode: 'hr_dictVacationPlanDayList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictImpartibleVac',
    isFolder: 0,
    caption: 'Тривалість неподільних частин відпусток',
    caption_uk: 'Тривалість неподільних частин відпусток',
    caption_ru: 'Продолжительность неделимых частей отпусков',
    caption_az: 'Məzuniyyətin bölünməyən hissələrinin müddətləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictImpartibleVac',
        method: 'select',
        fieldList: [
          { name: 'dictVacationKindID.name', description: `{{UB.i18n('Вид відпустки')}}` },
          { name: 'dayCount', description: `{{UB.i18n('Кількість днів нерозривної частини')}}`, config: { align: 'center' } }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictVacCompException',
    isFolder: 0,
    caption: 'Виключення при компенсації відпусток',
    caption_uk: 'Виключення при компенсації відпусток',
    caption_ru: 'Исключения при компенсации отпусков',
    caption_az: 'Məzuniyyət kompensasiyası istisnaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictVacCompException',
        method: 'select',
        fieldList: [
          { name: 'orgID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'dictStaffCatID.description', description: `{{UB.i18n('Категорія персоналу')}}`, simpleFilter: true },
          { name: 'monthCount', format: '0.', config: { align: 'center' } },
          { name: 'dateFrom', config: { align: 'center' } },
          { name: 'dateTo', config: { align: 'center' } }
        ],
        whereList: {
          state: {
            expression: '[orgID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          organizationID: {
            expression: '[orgID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgIsNull: {
            expression: '[orgID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([state] AND [organizationID]) OR [orgIsNull])'],
        orderList: {
          orgID: { expression: '[orgID.name]', order: 'asc' },
          dictStaffCatID: { expression: '[dictStaffCatID.description]', order: 'asc' },
          dateFrom: { expression: '[dateFrom]', order: 'asc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganizationEx({ grid: this, orgAttr: 'orgID', allowNull: true })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCommission',
    isFolder: 0,
    caption: 'Комісії (HR)',
    caption_uk: 'Комісії (HR)',
    caption_ru: 'Комиссии (HR)',
    caption_az: 'Komissiyalar (İK)',
    cmdType: 'showForm',
    formCode: 'hr_dictCommissionList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  /** ******Накази*************/
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffOrder',
    isFolder: 0,
    caption: 'Накази штатного розкладу',
    caption_uk: 'Накази штатного розкладу',
    caption_ru: 'Приказы штатного расписания',
    caption_az: 'Ştat cədvəli üzrə əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffOrder',
        method: 'select',
        fieldList: [
          {
            name: 'orderState',
            description: `{{UB.i18n('Статус')}}`,
            config: { align: 'center' },
            format: '{{appHR.stateFormat}}'
          },
          { name: 'orderNumber' },
          { name: 'orderDate', format: 'd.m.Y H:i:s' },
          { name: 'entryDate', description: `{{UB.i18n('Вступ в дію')}}` },
          { name: 'orgName', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'respEmployeeID.description', description: `{{UB.i18n('Підписав')}}` },
          { name: 'textOrder' },
          { name: 'description', visibility: false }
        ],
        whereList: {
          isImportOrder: {
            expression: '[isImportOrder]',
            condition: 'equal',
            value: false
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffOrderOrgStructure',
    isFolder: 0,
    caption: 'Ведення Організацій',
    caption_uk: 'Ведення Організацій',
    caption_ru: 'Ведение организации',
    caption_az: 'Təşkilatın idarəçiliyi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffOrderOrgStructure',
        method: 'select',
        fieldList: [
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`,
            config: { align: 'center' },
            format: '{{appHR.stateFormat}}'
          },
          { name: 'orderNumber' },
          { name: 'orderDate', format: 'd.m.Y H:i:s' },
          { name: 'entryDate', description: `{{UB.i18n('Вступ в дію')}}` },
          { name: 'orgID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'respEmployeeID.description', description: `{{UB.i18n('Підписав')}}` },
          { name: 'textOrder' },
          { name: 'description', visibility: false }
        ],
        whereList: {
          state: {
            expression: '[orgID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          organizationID: {
            expression: '[orgID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          organizationNull: {
            expression: '[orgID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([state] AND [organizationID]) OR [organizationNull])'],
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTable',
    isFolder: 0,
    caption: 'Планування штатного розпису',
    caption_uk: 'Планування штатного розпису',
    caption_ru: 'Планирование штатного расписания',
    caption_az: 'Ştat cədvəlinin planlaşdırılması',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'ID', visibility: false },
          { name: 'name' },
          { name: 'orderNumber' },
          { name: 'orgName', description: `{{UB.i18n('Організація')}}` },
          { name: 'entryOrderDescription', description: `{{UB.i18n('Наказ вступу в дію')}}` },
          { name: 'entryOrderID', visibility: false },
          { name: 'entryOrderEntryDate', description: `{{UB.i18n('Дата вступу в дію')}}` },
          { name: 'textOrder' },
          { name: 'comment' },
          { name: 'description', visibility: false },
          { name: 'docType' },
          { name: 'orderState' },
          { name: 'changeListNumber', description: `{{UB.i18n('Номер переліку змін')}}` },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` }
        ],
        whereList: {
          docType: {
            expression: '[docType]',
            condition: 'notIn',
            value: ['ACCRUAL', 'ACCRUAL_CHANGES']
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        const grid = this
        const orgID = appAC.globalOrganization()
        const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
        if (notShowSalary) {
          grid.getStore().ubRequest.whereList.notShowSalary = {
            expression: `[ID]`,
            condition: 'equal',
            value: 0
          }
          grid.down('toolbar').insert(5, {
            xtype: 'label',
            margin: '2 15 1 15',
            text: UB.i18n('Відсутній доступ для перегляду інформації'),
            style: { color: 'red' }
          })
        }
        grid.empOrderType = 'STAFFLIST'
        AC.gridUtils.setGlobalOrganization(grid, 'orgID')
        if (AC.settings.get('hrTaskMessage', orgID)) {
          let actCol = Ext.create('Ext.grid.column.Column', {
            xtype: 'actioncolumn',
            dataIndex: 'ID',
            text: '',
            width: 40,
            align: 'center',
            filterable: false,
            sortable: false,
            renderer: function (value, meta, record) {
              if (record.get && record.get('orderState') === 'POSTED') {
                let id = Ext.id()
                Ext.defer(function () {
                  Ext.widget('button', {
                    renderTo: Ext.query('#' + id)[0],
                    tooltip: UB.i18n('Надіслати повідомлення'),
                    scale: 'small',
                    margin: '0 0 0 0',
                    iconCls: 'u-button__icon u-icon-bell',
                    cls: 'blue-action',
                    handler: function (btn) {
                      $App.connection.run({
                        entity: 'hr_staffTable',
                        method: 'sendNotificationMsg',
                        orgID: orgID,
                        instanceID: record.get('ID'),
                        dateFrom: record.get('mi_createDate'),
                        dateTo: AC.dateService.addMonths(record.get('mi_createDate'), 2)
                      }).then(() => {
                        grid.getStore().load()
                      })
                    }
                  })
                }, 50)
                return Ext.String.format('<div id="{0}"></div>', id)
              }
            }
          })
          grid.headerCt.insert(0, actCol)
          grid.columns.unshift(actCol)
        }
      },
      listeners: {
        render: grid => {
          grid.menu.add([{
            text: UB.i18n('Перейти до наказу'),
            handler: function () {
              const reco = AC.gridUtils.getCurrentRecord(grid)
              if (!reco) {
                AC.viewUtils.showToast('Помилка', 'Не вибраний запис')
                return
              }
              appHR.showStaffOrderForm(reco.get('ID'), reco.get('entryOrderID'))
            }
          }])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableAccrual',
    isFolder: 0,
    caption: 'Зміна окладу',
    caption_uk: 'Зміна окладу',
    caption_ru: 'Изменение оклада',
    caption_az: 'Maaş dəyişikliyi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'orderNumber' },
          { name: 'orgName', description: `{{UB.i18n('Організація')}}` },
          { name: 'entryOrderDescription', description: `{{UB.i18n('Наказ вступу в дію')}}` },
          { name: 'entryOrderID', visibility: false },
          { name: 'entryOrderEntryDate', description: `{{UB.i18n('Дата вступу в дію')}}` },
          { name: 'textOrder' },
          { name: 'comment' },
          { name: 'description', visibility: false },
          { name: 'docType' },
          { name: 'orderState' },
          { name: 'changeListNumber', description: `{{UB.i18n('Номер переліку змін')}}` },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` }
        ],
        whereList: {
          docType: {
            expression: '[docType]',
            condition: 'in',
            value: ['ACCRUAL', 'ACCRUAL_CHANGES']
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        const grid = this
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
        this.empOrderType = 'STAFFLIST'
        const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
        if (notShowSalary) {
          grid.getStore().ubRequest.whereList.notShowSalary = {
            expression: `[ID]`,
            condition: 'equal',
            value: 0
          }
          grid.down('toolbar').insert(5, {
            xtype: 'label',
            margin: '2 15 1 15',
            text: UB.i18n('Відсутній доступ для перегляду інформації'),
            style: { color: 'red' }
          })
        }
      },
      onDeterminateForm: function (grid) {
        return {
          entityName: 'hr_staffTable',
          formCode: 'hr_staffTableAccrual'
        }
      },
      listeners: {
        render: grid => {
          grid.menu.add([{
            text: UB.i18n('Перейти до наказу'),
            handler: function () {
              const reco = AC.gridUtils.getCurrentRecord(grid)
              if (!reco) {
                AC.viewUtils.showToast('Помилка', 'Не вибраний запис')
                return
              }
              appHR.showStaffOrderForm(reco.get('ID'), reco.get('entryOrderID'))
            }
          }])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableAll',
    isFolder: 0,
    caption: 'Штатні розписи (всі)',
    caption_uk: 'Штатні розписи (всі)',
    caption_ru: 'Штатные расписания (все)',
    caption_az: 'Ştat cədvəlləri (hamısı)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'orderNumber' },
          { name: 'orgName', description: `{{UB.i18n('Організація')}}` },
          { name: 'withChild', visibility: false },
          { name: 'docType' },
          { name: 'entryOrderID.description', description: `{{UB.i18n('Наказ вступу в дію')}}`, simpleFilter: true },
          { name: 'entryOrderID', visibility: false },
          { name: 'entryDate' },
          { name: 'textOrder' },
          { name: 'comment' },
          { name: 'orderState', visibility: false },
          { name: 'description', visibility: false }
        ],
        whereList: {
          orderState: {
            expression: '[orderState]',
            condition: 'equal',
            value: 'POSTED'
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        const grid = this
        this.empOrderType = 'STAFFLIST'
        const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
        if (notShowSalary) {
          grid.getStore().ubRequest.whereList.notShowSalary = {
            expression: `[ID]`,
            condition: 'equal',
            value: 0
          }
          grid.down('toolbar').insert(5, {
            xtype: 'label',
            margin: '2 15 1 15',
            text: UB.i18n('Відсутній доступ для перегляду інформації'),
            style: { color: 'red' }
          })
        }
      },
      onDeterminateForm: function (grid) {
        const res = {
          entityName: 'hr_staffTable',
          formCode: 'hr_staffTable'
        }
        const reco = AC.gridUtils.getCurrentRecord(grid)
        if (reco && ['ACCRUAL', 'ACCRUAL_CHANGES'].includes(reco.get('docType'))) {
          res.formCode = 'hr_staffTableAccrual'
        }
        return res
      },
      listeners: {
        render: grid => {
          grid.menu.add([{
            text: UB.i18n('Перейти до наказу'),
            handler: function () {
              const reco = AC.gridUtils.getCurrentRecord(grid)
              if (!reco) {
                AC.viewUtils.showToast('Помилка', 'Не вибраний запис')
                return
              }
              appHR.showStaffOrderForm(reco.get('ID'), reco.get('entryOrderID'))
            }
          }])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableYear',
    isFolder: 0,
    caption: 'Штатні розписи (групування)',
    caption_uk: 'Штатні розписи (групування)',
    caption_ru: 'Штатные расписания (группировка)',
    caption_az: 'Ştat cədvəlləri (qruplaşma)',
    cmdType: 'showForm',
    formCode: 'hr_staffTableYear',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableOrgStructure',
    isFolder: 0,
    caption: 'Планування Структури',
    caption_uk: 'Планування Структури',
    caption_ru: 'Планирование Структуры',
    caption_az: 'Strukturun planlaşdırılması',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTableOrgStructure',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'orderNumber' },
          { name: 'description' },
          { name: 'docType' },
          { name: 'entryOrderID.description', description: `{{UB.i18n('Наказ вступу в дію')}}`, simpleFilter: true },
          { name: 'entryOrderID', visibility: false },
          { name: 'textOrder' },
          { name: 'comment' },
          { name: 'orgName', description: `{{UB.i18n('Організація')}}` },
          { name: 'orderState', visibility: false }
        ],
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
      },
      listeners: {
        render: grid => {
          grid.menu.add([{
            text: UB.i18n('Перейти до наказу'),
            handler: function () {
              const reco = AC.gridUtils.getCurrentRecord(grid)
              if (!reco) {
                AC.viewUtils.showToast('Помилка', 'Не вибраний запис')
                return
              }
              appHR.showStaffOrderForm(reco.get('ID'), reco.get('entryOrderID'))
            }
          }])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderSickness',
    isFolder: 0,
    caption: 'Листи непрацездатності',
    caption_uk: 'Листи непрацездатності',
    caption_ru: 'Больничный лист',
    caption_az: 'Əmək qabiliyyətinin müvəqqəti itiriliməsi vərəqəsi',
    cmdType: 'showForm',
    formCode: 'hr_empOrderSicknessList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderFuneral',
    isFolder: 0,
    caption: 'Допомога на поховання',
    caption_uk: 'Допомога на поховання',
    caption_ru: 'Пособие на погребение',
    caption_az: 'Dəfn müavinəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrderFuneral',
        method: 'select',
        fieldList: [
          { name: 'orderDate' },
          { name: 'employeeFuneralID.employeeID.fullFIO', description: `{{UB.i18n('Отримувач допомоги')}}`, simpleFilter: true },
          { name: 'employeeFuneralID.employeeNumberID.tabNum', description: `{{UB.i18n('Табельний номер')}}`, simpleFilter: true },
          { name: 'dead', description: `{{UB.i18n('Померлий')}}` },
          { name: 'sertificate', description: `{{UB.i18n('Свідоцтво про смерть')}}` },
          { name: 'orderState' },
          { name: 'sicknessMeeting', description: `{{UB.i18n('Протокол комісії')}}` },
          { name: 'mi_createDate', config: { align: 'center' }, description: `{{UB.i18n('Дата створення')}}` }
        ],
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        let res
        switch (row.get('orderState')) {
          case 'POSTED':
            res = 'ub-row-green'
            break
          case 'PROCESSED':
            res = 'ub-row-yellow'
            break
          default:
            res = 'ub-row-lightgrey'
            break
        }
        return res
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
        AC.gridUtils.tuneGridColumns(this, {
          parentID: {
            renderer: function (value) {
              return value ? 'Продовжений' : 'Первинний'
            }
          }
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_sicknessMeeting',
    isFolder: 0,
    caption: 'Протоколи комісії з соц. страху',
    caption_uk: 'Протоколи комісії з соц. страху',
    caption_ru: 'Протоколы комиссии по социальному страхованию',
    caption_az: 'Sosial Müdafiə komissiyasının protokolu',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_sicknessMeeting',
        method: 'select',
        fieldList: [
          { name: 'orderDate', config: { align: 'center' } },
          { name: 'orderNumber', config: { align: 'center' } },
          { name: 'orderState', config: { align: 'center' }, format: '{{appHR.stateFormat}}' },
          { name: 'mi_createDate', config: { align: 'center' }, description: `{{UB.i18n('Дата створення')}}` }
        ],
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        let res
        switch (row.get('orderState')) {
          case 'POSTED':
            res = 'ub-row-green'
            break
          case 'PROCESSED':
            res = 'ub-row-yellow'
            break
          default:
            res = 'ub-row-lightgrey'
            break
        }
        return res
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictLivingCost',
    isFolder: 0,
    caption: 'Прожитковий мінімум',
    caption_uk: 'Прожитковий мінімум',
    caption_ru: 'Прожиточный минимум',
    caption_az: 'Yaşayış minimumu',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictLivingCost',
        method: 'select',
        fieldList: [
          { name: 'dateFrom', config: { align: 'center' } },
          { name: 'childrenUnder6', format: '0.' },
          { name: 'childrenTo18', format: '0.' },
          { name: 'workingPerson', format: '0.' },
          { name: 'nonWorkingPerson', format: '0.' }
        ],
        orderList: {
          orderBy: { expression: 'dateFrom', order: 'desc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictVacationKind',
    isFolder: 0,
    caption: 'Види відпусток',
    caption_uk: 'Види відпусток',
    caption_ru: 'Виды отпусков',
    caption_az: 'Məzuniyyət növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictVacationKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'shortName' },
          { name: 'isDate', config: { align: 'center' } },
          { name: 'isRst', config: { align: 'center' } },
          { name: 'isDay', config: { align: 'center' } },
          { name: 'reason', config: { align: 'center' } },
          { name: 'isVactComp', config: { align: 'center' } },
          { name: 'isDismComp', config: { align: 'center' } },
          { name: 'vactAccum' },
          { name: 'dictTimeCostID.nameSmall', description: `{{UB.i18n('Позначення в табелі')}}` },
          { name: 'payElID.name', description: `{{UB.i18n('Види оплати')}}` },
          { name: 'orderN' },
          { name: 'isProportional', config: { align: 'center' } },
          { name: 'isForYear', config: { align: 'center' } }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSalaryMinSize',
    isFolder: 0,
    caption: 'Мінімальна зарплата',
    caption_uk: 'Мінімальна зарплата',
    caption_ru: 'Минимальная зарплата',
    caption_az: 'Minimum əmək haqqı',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSalaryMinSize',
        method: 'select',
        fieldList: [
          { name: 'dateFrom', config: { align: 'center' } },
          { name: 'monthValue', format: '0.' },
          { name: 'hourValue', format: '0.00' }
        ],
        orderList: {
          orderBy: { expression: 'dateFrom', order: 'desc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSumFuneral',
    isFolder: 0,
    caption: 'Допомога на поховання СС',
    caption_uk: 'Допомога на поховання СС',
    caption_ru: 'Пособие на погребение СС',
    caption_az: 'DSMF dəfn müavinəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSumFuneral',
        method: 'select',
        fieldList: [
          { name: 'dateFromEmpty', config: { align: 'center' } },
          { name: 'dateToEmpty', config: { align: 'center' } },
          { name: 'suma', format: '0.00' }
        ],
        orderList: {
          orderBy: { expression: 'dateFromEmpty', order: 'desc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSickLimit',
    isFolder: 0,
    caption: 'Пільги для лікарняних',
    caption_uk: 'Пільги для лікарняних',
    caption_ru: 'Льготы для больничных',
    caption_az: 'Əmək qabiliyyətinin müvəqqəti itirilməsi ilə bağlı imtiyazlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSickLimit',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'fullName' },
          { name: 'typeSickLimit' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSicknessCause',
    isFolder: 0,
    caption: 'Причини розбіжності суми для лікарняних',
    caption_uk: 'Причини розбіжності суми для лікарняних',
    caption_ru: 'Причины расхождения суммы для больничных',
    caption_az: 'Xəstəlik məzuniyyətinin məbləğindəki uyğunsuzluğun səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSicknessCause',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'fullName' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_exportMethod',
    isFolder: 0,
    caption: 'Файли експорту',
    caption_uk: 'Файли експорту',
    caption_ru: 'Файлы экспорта',
    caption_az: 'Faylları ixrac edin',
    cmdType: 'showForm',
    formCode: 'hr_exportMethodList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_payOut',
    isFolder: 0,
    caption: 'Шаблони виплати зарплати',
    caption_uk: 'Шаблони виплати зарплати',
    caption_ru: 'Шаблоны выплаты зарплаты',
    caption_az: 'Əmək haqqı ödənişi şablonları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payOut',
        method: 'selectByOrg',
        fieldList: [
          { name: 'name' },
          { name: 'orgAccountID.code' },
          { name: 'contractorID.name' },
          { name: 'contrAccountID.code' },
          { name: 'isDefault', visibility: false },
          { name: 'organizationID', visibility: false },
          { name: 'subOrg', visibility: false }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent', 'del'],
      getRowClass: function (row) {
        return row.get('isDefault') ? ((row.store && row.store.data.items.filter(o => o.get('isDefault')).length) > 1 ? 'grd-color-red' : 'grd-bold') : ''
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      listeners: {
        render: (grid) => {
          grid.menu.add([
            {
              text: UB.i18n('Видалити запис'),
              iconCls: 'fa fa-trash-o',
              ubID: 'itemDelete',
              handler: function (context) {
                const record = context.up('').record || AC.gridUtils.getCurrentRecord(grid)
                if (record && record.get('organizationID') === appAC.globalOrganization()) {
                  grid.onDel()
                }
              }
            }])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_payObligatory',
    isFolder: 0,
    caption: 'Обов\'язкові платежі при виплаті зарплати',
    caption_uk: 'Обов\'язкові платежі при виплаті зарплати',
    caption_ru: 'Обязательные платежи при выплате зарплаты',
    caption_az: 'Əmək haqqı ödənişi zamanı məcburi ödəmələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_payObligatory',
        method: 'select',
        fieldList: [
          { name: 'name', description: `{{UB.i18n('Назва')}}` },
          { name: 'orgAccountID.code' },
          { name: 'contractorID.name' },
          { name: 'contrAccountID.code' }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_departmentKind',
    isFolder: 0,
    caption: 'Види підрозділів',
    caption_uk: 'Види підрозділів',
    caption_ru: 'Виды подразделений',
    caption_az: 'Struktur vahidi növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_departmentKind',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}` },
          { name: 'name', description: `{{UB.i18n('Назва')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'orgStrCfg',
    code: 'hr_orgRespPosition',
    isFolder: 0,
    caption: 'Відповідальні особи організації',
    caption_uk: 'Відповідальні особи організації',
    caption_ru: 'Ответственные физические лица организаций',
    caption_az: 'Təşkilatların məsul şəxsləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_orgRespPosition',
        method: 'select',
        fieldList: [
          { name: 'organizationID', visibility: false },
          { name: 'respPosition' },
          { name: 'positionID.name', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'dateFromEmpty', format: 'd.m.Y' },
          { name: 'dateToEmpty', format: 'd.m.Y' }
        ],
        whereList: {
          posDateFrom: {
            expression: '[positionID.mi_dateFrom]',
            condition: 'lessEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          posDateTo: {
            expression: '[positionID.mi_dateTo]',
            condition: 'moreEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          posState: {
            expression: '[positionID.state]',
            condition: '=',
            value: 'ACTIVE'
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictAreasActivity',
    isFolder: 0,
    caption: 'Напрями діяльності',
    caption_uk: 'Напрями діяльності',
    caption_ru: 'Направления деятельности',
    caption_az: 'Fəaliyyət istiqamətləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictAreasActivity',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'section' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPosReqrmnt',
    isFolder: 0,
    caption: 'Вимоги до посад',
    caption_uk: 'Вимоги до посад',
    caption_ru: 'Требования к должности',
    caption_az: 'Vəzifəyə dair tələblər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPosReqrmnt',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'parentID.name' },
          { name: 'dictAreasActivityID.name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },

  // ************************************************************* Накази з персоналу ************************************************
  {
    desktopCode: 'arm_accCfg',
    parentCode: null,
    code: 'hr_empOrderCustom',
    isFolder: 0,
    caption: 'Накази з Персоналу',
    caption_uk: 'Накази з Персоналу',
    caption_ru: 'Приказы по Персоналу',
    caption_az: 'Kadr əmrləri',
    cmdType: 'showForm',
    formCode: 'hr_empOrderCustom',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-list-ol',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderBonusA',
    isFolder: 0,
    caption: 'Накази про нагородження',
    caption_uk: 'Накази про нагородження',
    caption_ru: 'Приказы о награждениях',
    caption_az: 'Mükafatlandırma əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },
          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'BONUS'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про нагородження'))
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRewardA',
    isFolder: 0,
    caption: 'Накази про заохочення',
    caption_uk: 'Накази про заохочення',
    caption_ru: 'Приказы о поощрении',
    caption_az: 'Həvəsləndirmə əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },
          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'REWARD'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про заохочення'))
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderPenaltyA',
    isFolder: 0,
    caption: 'Накази про дисциплінарні стягнення',
    caption_uk: 'Накази про дисциплінарні стягнення',
    caption_ru: 'Приказы о дисциплинарных взысканиях',
    caption_az: 'İntizam tənbehi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'PENALTY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про дисциплінарне стягнення'))
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAppointA',
    isFolder: 0,
    caption: 'Накази про призначення',
    caption_uk: 'Накази про призначення',
    caption_ru: 'Приказы о назначениях',
    caption_az: 'Təyinat əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'APPOINT'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про призначення'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      _customActions: [{
        text: `{{UB.i18n('Додати новий')}}`,
        actionId: 'addByType',
        iconCls: 'fas fa-plus',
        cls: 'add-new-action',
        menu: [{
          text: `{{UB.i18n('держслужбовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '1'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('службовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '2'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('працівники')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '3'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('військовослужбовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '4'
              }
            })
          }
        }
        ]

      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAppointMoveA',
    isFolder: 0,
    caption: 'Накази про первинне призначення, переведення',
    caption_uk: 'Накази про первинне призначення, переведення',
    caption_ru: 'Приказы о первичном назначении, переведении',
    caption_az: 'İlkin təyinat, keçirilrmə əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'APPOINT_MOVE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про первинне призначення, переведення'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderPluralistA',
    isFolder: 0,
    caption: 'Накази про сумісництво та суміщення',
    caption_uk: 'Накази про сумісництво та суміщення',
    caption_ru: 'Приказы о совместительстве и совмещении',
    caption_az: 'Yarımştat iş əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: '=',
            value: 'PLURALIST'
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про сумісництво та суміщення'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      _customActions: [{
        text: `{{UB.i18n('Додати новий')}}`,
        actionId: 'addByType',
        iconCls: 'fas fa-plus',
        cls: 'add-new-action',
        menu: []
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderOutpluralA',
    isFolder: 0,
    caption: 'Накази про припиненя сумісництва',
    caption_uk: 'Накази про припиненя сумісництва',
    caption_ru: 'Приказ о прекращении совместительства',
    caption_az: 'Yarımştat işin dayandırılması əmri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'OUTPLURAL'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про припиненя сумісництва'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAppointLiqA',
    isFolder: 0,
    caption: 'Призначення на ліквідовані посади',
    caption_uk: 'Призначення на ліквідовані посади',
    caption_ru: 'Назначение на ликвидированные должности',
    caption_az: 'Ləğv olunmuş vəzifələrə təyinat',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'APPOINT_LIQ'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Призначення на ліквідовані посади'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      _customActions: [{
        text: `{{UB.i18n('Додати новий')}}`,
        actionId: 'addByType',
        iconCls: 'fas fa-plus',
        cls: 'add-new-action',
        menu: [{
          text: `{{UB.i18n('держслужбовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '1'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('службовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '2'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('працівники')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '3'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('військовослужбовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '4'
              }
            })
          }
        }
        ]

      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderTrialProlongA',
    isFolder: 0,
    caption: 'Продовження випробувального терміну',
    caption_uk: 'Продовження випробувального терміну',
    caption_ru: 'Продление испытательного срока',
    caption_az: 'Sınaq müddətinin uzadılması',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'TRIALPROLONG'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Продовження випробувального терміну'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      },
      _customActions: [{
        text: `{{UB.i18n('Додати новий')}}`,
        actionId: 'addByType',
        iconCls: 'fas fa-plus',
        cls: 'add-new-action',
        menu: [{
          text: `{{UB.i18n('держслужбовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '1'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('службовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '2'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('працівники')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '3'
              }
            })
          }
        },
        {
          text: `{{UB.i18n('військовослужбовці')}}`,
          handler: item => {
            const grid = item.up('entitygridpanel')
            $App.doCommand({
              cmdType: 'showForm',
              entity: grid.entityName,
              sender: grid,
              isModal: false,
              target: $App.getViewport().centralPanel,
              tabId: grid.entityName + ('ext' + Ext.id(null, 'addNew')),
              customParams: {
                HR_POSITION_TYPE: '4'
              }
            })
          }
        }
        ]

      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMoveA',
    isFolder: 0,
    caption: 'Наказ про переведення (переміщення, просування, ротація)',
    caption_uk: 'Наказ про переведення (переміщення, просування, ротація)',
    caption_ru: 'Приказ о переведении (перемещении, продвигании, ротации)',
    caption_az: 'Keçirilmə əmri (yerdəyişmə, yüksəliş, rotasiya)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'MOVE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про переведення'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderDismA',
    isFolder: 0,
    caption: 'Накази про звільнення',
    caption_uk: 'Накази про звільнення',
    caption_ru: 'Приказы об увольнении',
    caption_az: 'İşdən azad olunma əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'DISM'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про звільнення'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderBountyA',
    isFolder: 0,
    caption: 'Накази про преміювання',
    caption_uk: 'Накази про преміювання',
    caption_ru: 'Приказы о премировании',
    caption_az: 'Mükafatlandırma əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'BOUNTY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про преміювання'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderBountyHelpA',
    isFolder: 0,
    caption: 'Накази про матеріальну допомогу',
    caption_uk: 'Накази про матеріальну допомогу',
    caption_ru: 'Приказы о материальной помощи',
    caption_az: 'Maddi yardım əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'BOUNTY_HELP'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про матеріальну допомогу'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCanceldismA',
    isFolder: 0,
    caption: 'Накази про поновлення на посаді',
    caption_uk: 'Накази про поновлення на посаді',
    caption_ru: 'Приказы о возобновлении на должность',
    caption_az: 'Vəzifə yenilənməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CANCELDISM'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про поновлення на посаді'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMilServiceA',
    isFolder: 0,
    caption: 'Накази про військову службу',
    caption_uk: 'Накази про військову службу',
    caption_ru: 'Приказы о воинской службе',
    caption_az: 'Hərbi xidmət əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'MILSERVICE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про військову службу'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMilServiceRetA',
    isFolder: 0,
    caption: 'Накази про повернення до виконання посадових обов`язків',
    caption_uk: 'Накази про повернення до виконання посадових обов`язків',
    caption_ru: 'Приказы о возвращении к выполнению должностных обязанностей',
    caption_az: 'Vəzifə öhdəliklərini yerinə yetirilməsinə qayıtma əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'MILSERVICERET'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про повернення до виконання посадових обов`язків'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRankA',
    isFolder: 0,
    caption: 'Накази про присвоєння рангу',
    caption_uk: 'Накази про присвоєння рангу',
    caption_ru: 'Приказы о присвоении ранга',
    caption_az: 'Dərəcənin verilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'RANK'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про присвоєння рангу'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMissionA',
    isFolder: 0,
    caption: 'Накази про відрядження',
    caption_uk: 'Накази про відрядження',
    caption_ru: 'Приказы о командировке',
    caption_az: 'Ezamiyyət əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'MISSION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про відрядження'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderChangemissionA',
    isFolder: 0,
    caption: 'Накази про зміну відрядження',
    caption_uk: 'Накази про зміну відрядження',
    caption_ru: 'Приказы о изменениях командировки',
    caption_az: 'Ezamiyyət əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CHANGEMISSION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про зміну відрядження'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCancelmissionA',
    isFolder: 0,
    caption: 'Накази про скасування відрядження',
    caption_uk: 'Накази про скасування відрядження',
    caption_ru: 'Приказы о отмене командировки',
    caption_az: 'Ezamiyyət əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CANCELMISSION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про скасування відрядження'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderActingOrdA',
    isFolder: 0,
    caption: 'Накази про покладання обов`язків',
    caption_uk: 'Накази про покладання обов`язків',
    caption_ru: 'Приказы о возложении обязанностей',
    caption_az: 'Vəzifə öhdəliklərinin müəyyən edilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'ACTINGORD'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про покладання обов`язків'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderActingCloseA',
    isFolder: 0,
    caption: 'Накази про припинення виконання обов`язків',
    caption_uk: 'Накази про припинення виконання обов`язків',
    caption_ru: 'Приказы о прекращении исполнения обязанностей',
    caption_az: 'Vəzifə öhdəliklərinin yerinə yetirilməsinə xitam verilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'ACTINGCLOSE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про припинення виконання обов`язків'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderChgEmployeeA',
    isFolder: 0,
    caption: 'Накази про зміну облікових даних',
    caption_uk: 'Накази про зміну облікових даних',
    caption_ru: 'Приказы об изменении учетных данных',
    caption_az: 'Uçot məumatlarının dəyişdirilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CHGEMPLOYEE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про зміну облікових даних'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCancellationA',
    isFolder: 0,
    caption: 'Накази Скасування',
    caption_uk: 'Накази Скасування',
    caption_ru: 'Приказы об Отмене',
    caption_az: 'Ləğv edilmə əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CANCELLATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази Скасування'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCancelParaA',
    isFolder: 0,
    caption: 'Накази скасування пункту',
    caption_uk: 'Накази скасування пункту',
    caption_ru: 'Приказы об отмене пункта',
    caption_az: 'Əmr maddəsinin ləğv edilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CANCELPARA'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази скасування пункту'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderChgsalaryA',
    isFolder: 0,
    caption: 'Накази про встановлення посадового окладу',
    caption_uk: 'Накази про встановлення посадового окладу',
    caption_ru: 'Приказы об установлении должностного оклада',
    caption_az: 'Vəzifə maaşının müəyyən edilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CHGSALARY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про встановлення посадового окладу'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        const grid = this
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        AC.gridUtils.checkActionByUserRights(this, 'hr_empOrderChgsalaryDet')
        const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
        if (notShowSalary) {
          grid.getStore().ubRequest.whereList.notShowSalary = {
            expression: `[ID]`,
            condition: 'equal',
            value: 0
          }
          grid.down('toolbar').insert(5, {
            xtype: 'label',
            margin: '2 15 1 15',
            text: UB.i18n('Відсутній доступ для перегляду інформації'),
            style: { color: 'red' }
          })
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderStaffTableMove',
    isFolder: 0,
    caption: 'Рознесення змін за штатним розписом',
    caption_uk: 'Рознесення змін за штатним розписом',
    caption_ru: 'Разнесение изменений по штатному расписанию',
    caption_az: 'Dəyişikliklərin ştat cədvəlinə köçürülməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'STAFFTABLEMOVE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Рознесення змін за штатним розписом'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        const grid = this
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        AC.gridUtils.checkActionByUserRights(this, 'hr_empOrderStafftablemoveDet')
        const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
        if (notShowSalary) {
          grid.getStore().ubRequest.whereList.notShowSalary = {
            expression: `[ID]`,
            condition: 'equal',
            value: 0
          }
          grid.down('toolbar').insert(5, {
            xtype: 'label',
            margin: '2 15 1 15',
            text: UB.i18n('Відсутній доступ для перегляду інформації'),
            style: { color: 'red' }
          })
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderChgPosition',
    isFolder: 0,
    caption: 'Наказ про зміну призначень',
    caption_uk: 'Наказ про зміну призначень',
    caption_ru: 'Приказы об изменении назначений',
    caption_az: 'Təyinatın dəyişdirilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CHGPOSITION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про зміну призначень'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  // закрепление транспортных средств
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVehicleassign',
    isFolder: 0,
    caption: 'Накази про закріплення транспортніх засобів',
    caption_uk: 'Накази про закріплення транспортніх засобів',
    caption_ru: 'Приказы о закреплении транспортных средств',
    caption_az: 'Приказы о закреплении транспортных средств',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VEHICLEASSIGN'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про закріплення транспортних засобів'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  // компенсація за проходження медогляду
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMedexaminationA',
    isFolder: 0,
    caption: 'Накази про компенсацію за проходження медогляду',
    caption_uk: 'Накази про компенсацію за проходження медогляду',
    caption_ru: 'Накази про компенсацію за проходження медогляду',
    caption_az: 'Накази про компенсацію за проходження медогляду',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'MEDEXAMINATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про компенсацію за проходження медогляду'))
        }
      },

      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  // Завдання по плануванню ШР
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_taskMyStaffTableA',
    isFolder: 0,
    caption: 'Мої завдання (ШР)',
    caption_uk: 'Мої завдання (ШР)',
    caption_ru: 'Мои задания (ШР)',
    caption_az: 'Mənim tapşırıqlarım (SR)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_task',
        method: 'select',
        fieldList: [
          { name: 'participantID.recStageID.stageKind', description: `{{UB.i18n('Тип')}}` },
          { name: 'docID.description', description: `{{UB.i18n('Наказ')}}` },
          { name: 'docID.orderDate', description: `{{UB.i18n('Дата наказу')}}` },
          { name: 'docID.orderNumber', description: `{{UB.i18n('Номер наказу')}}` }
        ],
        whereList: {
          state: {
            expression: '[mi_wfState]',
            condition: 'equal',
            values: {
              empOrderType: 'NEW'
            }
          },
          empOrderType: {
            expression: '[docID.empOrderType]',
            condition: 'equal',
            value: 'STAFFTABLE'
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Мої завдання (ШР)'))
        },
        afterInit: function () {
          const me = this
          const employeeNumberID = $App.connection.userData().employeeNumberID
          UB.Repository('hr_empOrderActingDet')
            .attrs('paraID.positionID.mi_data_id')
            .where('employeeNumberID', '=', employeeNumberID || 0)
            .where('orderID.orderState', '=', 'POSTED')
            .where('dateFrom', '<=', new Date(appAC.globalApplicationDate()))
            .where('dateTo', '>=', new Date(appAC.globalApplicationDate()))
            .selectAsObject()
            .then(positions => {
              const pos = positions ? positions.map(p => p['paraID.positionID.mi_data_id']) : 0
              return Promise.all([
                UB.Repository('hr_dictTempExecution')
                  .attrs('employeePositionTempID.employeeNumberID')
                  .where('employeePositionID.employeeNumberID', '=', employeeNumberID || 0)
                  .where('dateFrom', '<=', new Date(appAC.globalApplicationDate()))
                  .where('dateTo', '>=', new Date(appAC.globalApplicationDate()))
                  .where('employeePositionTempID.employeeNumberID', 'isNotNull')
                  .selectAsObject(),
                UB.Repository('hr_employeePositionS')
                  .attrs('employeeNumberID')
                  .where('positionID', 'in', pos)
                  .selectAsObject()
              ])
            })
            .then(([dictTempExecution, p2]) => {
              const dictTempExecutionIds = dictTempExecution ? dictTempExecution.map(i => i['employeePositionTempID.employeeNumberID']) : 0
              const employeePositionIDs = p2 ? p2.map(i => i['employeeNumberID']) : 0
              me.getStore().ubRequest.whereList
                .employeePositionID = {
                  expression: '[employeePositionID.employeeNumberID]',
                  condition: 'in',
                  value: [employeeNumberID || 0, ...dictTempExecutionIds, ...employeePositionIDs]
                }
              me.getStore().load()
            })
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_taskMyStaffTableClosedA',
    isFolder: 0,
    caption: 'Виконані завдання (ШР)',
    caption_uk: 'Виконані завдання (ШР)',
    caption_ru: 'Выполненые задания (ШР)',
    caption_az: 'İcra olunmuş tapşırıqlar (SR)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_task',
        method: 'select',
        fieldList: [
          { name: 'participantID.recStageID.stageKind', description: `{{UB.i18n('Тип')}}` },
          { name: 'docID.description', description: `{{UB.i18n('Наказ')}}` },
          { name: 'docID.orderDate', description: `{{UB.i18n('Дата наказу')}}` },
          { name: 'docID.orderNumber', description: `{{UB.i18n('Номер наказу')}}` }
        ],
        whereList: {
          state: {
            expression: '[mi_wfState]',
            condition: 'equal',
            values: {
              empOrderType: 'CLOSED'
            }
          },
          empOrderType: {
            expression: '[docID.empOrderType]',
            condition: 'equal',
            value: 'STAFFTABLE'
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Виконані завдання (ШР)'))
        },
        afterInit: function () {
          const me = this
          const employeeNumberID = $App.connection.userData().employeeNumberID
          UB.Repository('hr_empOrderActingDet')
            .attrs('paraID.positionID.mi_data_id')
            .where('employeeNumberID', '=', employeeNumberID || 0)
            .where('orderID.orderState', '=', 'POSTED')
            .where('dateFrom', '<=', new Date(appAC.globalApplicationDate()))
            .where('dateTo', '>=', new Date(appAC.globalApplicationDate()))
            .selectAsObject()
            .then(positions => {
              const pos = positions ? positions.map(p => p['paraID.positionID.mi_data_id']) : 0
              return Promise.all([
                UB.Repository('hr_dictTempExecution')
                  .attrs('employeePositionTempID.employeeNumberID')
                  .where('employeePositionID.employeeNumberID', '=', employeeNumberID || 0)
                  .where('dateFrom', '<=', new Date(appAC.globalApplicationDate()))
                  .where('dateTo', '>=', new Date(appAC.globalApplicationDate()))
                  .where('employeePositionTempID.employeeNumberID', 'isNotNull')
                  .selectAsObject(),
                UB.Repository('hr_employeePositionS')
                  .attrs('employeeNumberID')
                  .where('positionID', 'in', pos)
                  .selectAsObject()
              ])
            })
            .then(([dictTempExecution, p2]) => {
              const dictTempExecutionIds = dictTempExecution ? dictTempExecution.map(i => i['employeePositionTempID.employeeNumberID']) : 0
              const employeePositionIDs = p2 ? p2.map(i => i['employeeNumberID']) : 0
              me.getStore().ubRequest.whereList
                .employeePositionID = {
                  expression: '[employeePositionID.employeeNumberID]',
                  condition: 'in',
                  value: [employeeNumberID || 0, ...dictTempExecutionIds, ...employeePositionIDs]
                }
              me.getStore().load()
            })
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableRejectedA',
    isFolder: 0,
    caption: 'Відхилені проєкти',
    caption_uk: 'Відхилені проєкти',
    caption_ru: 'Отклоненные проекты',
    caption_az: 'Ləğv edilmiş layihələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumber' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'description', visibility: true },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              empOrderType: 'RETURNED_FROM_RECONCILATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Відхилені проєкти'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableRejectedMyA',
    isFolder: 0,
    caption: 'Відхилені проєкти (мої)',
    caption_uk: 'Відхилені проєкти (мої)',
    caption_ru: 'Отклоненные проекты (мои)',
    caption_az: 'Ləğv edilmiş layihələr (mənim)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumber' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'description', visibility: true },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              empOrderType: 'RETURNED_FROM_RECONCILATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Відхилені проєкти (мої)'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        const employeeNumberID = $App.connection.userData('employeeNumberID') || null
        AC.viewUtils.setWhereListProperty(this, [
          ['respEmployeeNumID', '=', employeeNumberID]
        ])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableOnCompletionA',
    isFolder: 0,
    caption: 'Проєкти на доопрацювання',
    caption_uk: 'Проєкти на доопрацювання',
    caption_ru: 'Проекты на доработку',
    caption_az: 'Tamamlanma üçün layihələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumber' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'description', visibility: true },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              empOrderType: 'ON_COMPLETION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Проєкти на доопрацювання'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableOnCompletionMyA',
    isFolder: 0,
    caption: 'Проєкти на доопрацювання (мої)',
    caption_uk: 'Проєкти на доопрацювання (мої)',
    caption_ru: 'Проекты на доработку (мои)',
    caption_az: 'Tamamlanma üçün layihələr (mənim)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumber' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'description', visibility: true },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              empOrderType: 'ON_COMPLETION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Проєкти на доопрацювання (мої)'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        // AC.gridUtils.setGlobalOrganization(this, 'orgID')
        const employeeNumberID = $App.connection.userData('employeeNumberID') || null
        AC.viewUtils.setWhereListProperty(this, [
          ['respEmployeeNumID', '=', employeeNumberID]
        ])
        /*
        AC.viewUtils.setWhereListProperty(this, [
          ['mi_createUser', '=', $App.connection.userData().userID]
        ])
        */
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_staffTableOtherOrgA',
    isFolder: 0,
    caption: 'Проєкти на погодження з інших організацій',
    caption_uk: 'Проєкти на погодження з інших організацій',
    caption_ru: 'Проекты на согласование с других организаций',
    caption_az: 'Digər təşkilatlardan razılaşdırma üçün layihələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_staffTable',
        method: 'select',
        fieldList: [{
          name: 'empOrderType'
        },
        {
          name: 'orderNumber'
        },
        {
          name: 'orderDate',
          description: `{{UB.i18n('Дата наказу')}}`,
          format: 'd.m.Y'
        },
        {
          name: 'description',
          visibility: true
        },
        {
          name: 'mi_createDate',
          description: `{{UB.i18n('Дата створення')}}`
        }
        ],
        whereList: {
          exists: {
            expression: '',
            condition: 'subquery',
            subQueryType: 'exists',
            value: {
              entity: 'hr_recparticipant',
              fieldList: [],
              method: 'select',
              whereList: {
                orderID: {
                  expression: '[recStageID.docID]=[{master}.ID]',
                  condition: 'custom'
                },
                dateFrom: {
                  expression: '[employeePosition.dateFrom]<=[{master}.orderDate]',
                  condition: 'custom'
                },
                dateTo: {
                  expression: '[employeePosition.dateTo]>=[{master}.orderDate]',
                  condition: 'custom'
                },
                organizationID: {
                  expression: '[employeePosition.organizationID.mi_data_id]',
                  condition: 'equal',
                  value: 0 /* заповнюється на afterInit */
                }
              }
            }
          }
        },
        orderList: {
          orderBy: {
            expression: 'orderDate',
            order: 'desc'
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Проєкти на погодження з інших організацій'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        AC.viewUtils.setWhereListProperty(this, [
          ['orgID', 'notEqual', appAC.globalOrganization()]
        ])
        this.getStore().ubRequest.whereList.exists.value.whereList.organizationID.value = appAC.globalOrganization()
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderTrainingA',
    isFolder: 0,
    caption: 'Накази про направлення на навчання',
    caption_uk: 'Накази про направлення на навчання',
    caption_ru: 'Приказы о направлении на обучение',
    caption_az: 'Təlimə göndərilmə əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'TRAINING'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про направлення на навчання'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCertificationA',
    isFolder: 0,
    caption: 'Про присвоєння кваліфікації',
    caption_uk: 'Про присвоєння кваліфікації',
    caption_ru: 'О присвоении квалификации',
    caption_az: 'İxtisas dərəcəsinin verilməsi haqqında',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CERTIFICATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про присвоєння кваліфікаці'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderInternshipA',
    isFolder: 0,
    caption: 'Стажування',
    caption_uk: 'Стажування',
    caption_ru: 'Стажировка',
    caption_az: 'Staj müddəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'INTERNSHIP'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про стажування'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderChgworksched',
    isFolder: 0,
    caption: 'Накази про зміну графіку роботи',
    caption_uk: 'Накази про зміну графіку роботи',
    caption_ru: 'Приказы об изменении графика работы',
    caption_az: 'İş qrafiki dəyişdirilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CWS'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про зміну графіку роботи'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderWeekendWork',
    isFolder: 0,
    caption: 'Накази про роботу в вихідні дні',
    caption_uk: 'Накази про роботу в вихідні дні',
    caption_ru: 'Приказы о работе в выходные дни',
    caption_az: 'Həftə sonunun iş günü olaraq müəyyən edilməsi əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CWSHD'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про роботу в вихідні дні'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRelaxDonor',
    isFolder: 0,
    caption: 'Про день відпочинку за донорство',
    caption_uk: 'Про день відпочинку за донорство',
    caption_ru: 'Про деннь отдыха за донорство',
    caption_az: 'Donorluqla əlaqədar istirahət gününün verilməsi haqqında',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CWSRELAXDONOR'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Про день відпочинку за донорство'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRelaxHd',
    isFolder: 0,
    caption: 'Про компенсацію за роботу в вихідний день',
    caption_uk: 'Про компенсацію за роботу в вихідний день',
    caption_ru: 'О компенсации за работу в выходной день',
    caption_az: 'İstirahət günü işləməyə görə kompensasiya haqqında',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CWSRELAXHD'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Про день відпочинку за роботу в вихідний день'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCwsWorkHour',
    isFolder: 0,
    caption: 'Про встановлення робочого часу',
    caption_uk: 'Про встановлення робочого часу',
    caption_ru: 'Об установлении рабочего времени',
    caption_az: 'İş vaxtının müəyyən olunması haqqında',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CWSWORKHOUR'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Про встановлення робочого часу'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAveragePay',
    isFolder: 0,
    caption: 'Про оплату за середнім',
    caption_uk: 'Про оплату за середнім',
    caption_ru: 'Об оплате по среднему',
    caption_az: 'Orta hesabla ödəniş haqqında',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'AVERAGEPAY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Про оплату за середнім'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCancelAveragePay',
    isFolder: 0,
    caption: 'Про закінчення оплати по середньому',
    caption_uk: 'Про закінчення оплати по середньому',
    caption_ru: 'Об окончании оплаты по среднему',
    caption_az: 'Orta hesabla ödənişin başa çatması haqqında',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CANCELAVGPAY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Про закінчення оплати по середньому'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderOrgStructure',
    isFolder: 0,
    caption: 'Накази про структуру Організації',
    caption_uk: 'Накази про структуру Організації',
    caption_ru: 'Приказы о структуре Организации',
    caption_az: 'Təşkilatın strukturuna dair əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'entryDate', description: `{{UB.i18n('Дата вступу в дію')}}`, format: 'd.m.Y' },
          { name: 'staffTableOrgStructureID.description', description: `{{UB.i18n('Структура')}}` },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}`, visibility: false },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'staffTableOrgStructureID', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'ORGSTRUCTURE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function (grid) {
          grid.setTitle(UB.i18n('Накази про структуру Організації'))
          grid.menu.add([
            {
              text: `{{UB.i18n('Переглянути Структуру')}}`,
              iconCls: 'fa fa-cubes',
              ubID: 'showStaffTableOrgStructure',
              handler: () => {
                const reco = AC.gridUtils.getCurrentRecord(grid)
                if (reco) {
                  // const docType = reco.get('staffTableOrgStructureID.docType')
                  const formCode = 'hr_staffTableOrgStructure'
                  const staffTableOrgStructureID = reco.get('staffTableOrgStructureID')
                  if (staffTableOrgStructureID) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entity: 'hr_staffTableOrgStructure',
                      formCode: formCode,
                      instanceID: staffTableOrgStructureID,
                      tabId: formCode + '_' + staffTableOrgStructureID,
                      target: $App.getViewport().centralPanel,
                      title: `Планування структури`
                    })
                  }
                }
              }
            }
          ])
          grid.on('selectionchange', (selectionModel, selected, eOpts) => {
            const showStaffTableOrgStructureMenuItem = grid.menu.items.find(item => item.ubID === 'showStaffTableOrgStructure')
            if (showStaffTableOrgStructureMenuItem) {
              const reco = AC.gridUtils.getCurrentRecord(grid)
              const isStaffTableOrgStructureID = reco && reco.get('staffTableOrgStructureID')
              if (isStaffTableOrgStructureID) {
                showStaffTableOrgStructureMenuItem.enable()
              } else {
                showStaffTableOrgStructureMenuItem.disable()
              }
            }
          })
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderStaffList',
    isFolder: 0,
    caption: 'Накази за штатним розписом',
    caption_uk: 'Накази за штатним розписом',
    caption_ru: 'Приказы по штатному расписанию',
    caption_az: 'Ştat cədvəli üzrə əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'entryDate', description: `{{UB.i18n('Дата вступу в дію')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'orderState', description: `{{UB.i18n('Стан')}}` },
          { name: 'staffTableID.description', description: `{{UB.i18n('Штатний розпис (перелік змін)')}}` },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` },
          { name: 'staffTableID', visibility: false },
          { name: 'staffTableID.docType', visibility: false }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'STAFFLIST'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function (grid) {
          grid.setTitle(UB.i18n('Накази за штатним розписом'))
          grid.menu.add([
            {
              text: UB.i18n('Переглянути ШР'),
              iconCls: 'fa fa-cubes',
              ubID: 'showStaffTable',
              handler: () => {
                const reco = AC.gridUtils.getCurrentRecord(grid)
                if (reco) {
                  const docType = reco.get('staffTableID.docType')
                  const formCode = ['ACCRUAL', 'ACCRUAL_CHANGES'].includes(docType) ? 'hr_staffTableAccrual' : 'hr_staffTable'
                  const staffTableID = reco.get('staffTableID')
                  if (staffTableID) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entity: 'hr_staffTable',
                      formCode: formCode,
                      instanceID: staffTableID,
                      tabId: formCode + '_' + staffTableID,
                      target: $App.getViewport().centralPanel,
                      title: `Штатний розпис`
                    })
                  }
                }
              }
            }
          ])
          grid.on('selectionchange', (selectionModel, selected, eOpts) => {
            const showStaffTableMenuItem = grid.menu.items.find(item => item.ubID === 'showStaffTable')
            if (showStaffTableMenuItem) {
              const reco = AC.gridUtils.getCurrentRecord(grid)
              const isStaffTableID = reco && reco.get('staffTableID')
              if (isStaffTableID) {
                showStaffTableMenuItem.enable()
              } else {
                showStaffTableMenuItem.disable()
              }
            }
          })
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAddSalaryA',
    isFolder: 0,
    caption: 'Накази про зміни нарахувань',
    caption_uk: 'Накази про зміни нарахувань',
    caption_ru: 'Приказы об изменение начислений',
    caption_az: 'Hesablaşmaların dəyişdirilməsi haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'ADDSALARY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про зміни нарахувань'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAddSalaryGovA',
    isFolder: 0,
    caption: 'Накази про встановлення надбавок за вислугу років',
    caption_uk: 'Накази про встановлення надбавок за вислугу років',
    caption_ru: 'Приказы про установление надбавок за выслугу лет',
    caption_az: 'Xidmət illərinə görə  əlavələrin müəyyən edilməsi haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'ADDSALARYGOV'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про встановлення надбавок за вислугу років'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderCancelSalaryA',
    isFolder: 0,
    caption: 'Накази про скасування нарахувань',
    caption_uk: 'Накази про скасування нарахувань',
    caption_ru: 'Приказы об отмене начислений',
    caption_az: 'Hesablaşmaların ləğv edilməsi haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CANCELSALARY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про скасування нарахувань'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderOverPayA',
    isFolder: 0,
    caption: 'Накази про понаднормову працю',
    caption_uk: 'Накази про понаднормову працю',
    caption_ru: 'Приказы про сврхурочный труд',
    caption_az: 'Əlavə iş haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'OVERPAY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Наказ про понаднормову працю'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRiskPayA',
    isFolder: 0,
    caption: 'Наказ про підвищення оплати за шкідливість',
    caption_uk: 'Наказ про підвищення оплати за шкідливість',
    caption_ru: 'Приказ о повышении оплаты за вредность',
    caption_az: 'Zərərli iş şəraitinə görə əmək haqqının artırılması haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'RISKPAY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Наказ про підвищення оплати за шкідливість'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAddPayA',
    isFolder: 0,
    caption: 'Наказ про оплату додаткової роботи',
    caption_uk: 'Наказ про оплату додаткової роботи',
    caption_ru: 'Приказ об оплате дополнительной работы',
    caption_az: 'Əlavə işin ödənilməsi haqqında əmr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'ADDPAY'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Наказ про оплату додаткової роботи'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationA',
    isFolder: 0,
    caption: 'Накази про відпустки',
    caption_uk: 'Накази про відпустки',
    caption_ru: 'Приказы об отпусках',
    caption_az: 'Məzuniyyət haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VACATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про відпустки'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },

  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationLongA',
    isFolder: 0,
    caption: 'Накази про неоплачувані відпустки',
    caption_uk: 'Накази про неоплачувані відпустки',
    caption_ru: 'Приказы о неоплачиваемых отпусках',
    caption_az: 'Ödənişsiz məzuniyyət haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VACATIONLONG'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про неоплачувані відпустки'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationRetA',
    isFolder: 0,
    caption: 'Накази про вихід із неоплачуваної відпустки',
    caption_uk: 'Накази про вихід із неоплачуваної відпустки',
    caption_ru: 'Приказы о выходе из неоплачиваемого отпуска',
    caption_az: 'Ödənişsiz məzuniyyətə çıxarılma haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VACATIONRET'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про вихід із неоплачуваної відпустки'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationRevokeA',
    isFolder: 0,
    caption: 'Накази про відкликання з відпустки',
    caption_uk: 'Накази про відкликання з відпустки',
    caption_ru: 'Приказы об отзыве из отпуска',
    caption_az: 'Məzuniyyətdən geri çağırılma əmrləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VACATIONREVOKE'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про відкликання з відпустки'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationProlongA',
    isFolder: 0,
    caption: 'Продовження, перенесення, скасування відпустки',
    caption_uk: 'Продовження, перенесення, скасування відпустки',
    caption_ru: 'Продление, перенос, отмена отпуска',
    caption_az: 'Məzuniyyətin uzadılması, köçürülməsi, ləğvi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VACATIONPROLONG'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Продовження, перенесення, скасування відпустки'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationCompA',
    isFolder: 0,
    caption: 'Накази про компенсацію відпустки',
    caption_uk: 'Накази про компенсацію відпустки',
    caption_ru: 'Приказ о компенсации отпуска',
    caption_az: 'Məzuniyyət kompensasiyasının ödənilməsi haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          { name: 'orderState', description: `{{UB.i18n('Стан')}}` },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'VACATIONCOMP'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про компенсацію відпустки'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderDowntimeA',
    isFolder: 0,
    caption: 'Накази про простої',
    caption_uk: 'Накази про простої',
    caption_ru: 'Приказы о простое',
    caption_az: 'Məcburi boş dayanma haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          { name: 'orderState', description: `{{UB.i18n('Стан')}}` },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'DOWNTIME'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про простій, тимчасове призупинення'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRecallA',
    isFolder: 0,
    caption: 'Накази про відкликання з відрядження, навчання, простою',
    caption_uk: 'Накази про відкликання з відрядження, навчання, простою',
    caption_ru: 'Приказы об отзыве из командировки, учебы, простоя',
    caption_az: 'İşgüzar səfərlər, təlimlər, fasilələr üçün sifarişləri geri çağırın',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'RECALL'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про відкликання з відрядження, навчання, простою'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_registrySheet',
    isFolder: 0,
    caption: 'Реєстр електронних табелів',
    caption_uk: 'Реєстр електронних табелів',
    caption_ru: 'Реєстр електронних табелів',
    caption_az: 'Реєстр електронних табелів',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_registrySheet',
        method: 'select',
        fieldList: [
          { name: 'description', description: `{{UB.i18n('Опис')}}` }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderUni',
    isFolder: 0,
    caption: 'Універсальний документ',
    caption_uk: 'Універсальний документ',
    caption_ru: 'Универсальный документ',
    caption_az: 'Ümumi sənəd',
    cmdType: 'showForm',
    formCode: 'hr_empOrderUniList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAllA',
    isFolder: 0,
    caption: 'Накази (всі)',
    caption_uk: 'Накази (всі)',
    caption_ru: 'Приказы (все)',
    caption_az: 'Əmrlər (hamısı)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },

          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        },
        whereList: {
          notExtract: {
            expression: '[empOrderType]',
            condition: 'notEqual',
            value: 'EXTRACT'
          }
        }

      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази (всі)'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderExtract',
    isFolder: 0,
    caption: 'Витяги',
    caption_uk: 'Витяги',
    caption_ru: 'Выписки из приказов',
    caption_az: 'Əmrlərdən çıxarışlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrderExtract',
        method: 'select',
        fieldList: [
          { name: 'orderNumber', description: `{{UB.i18n('Номер')}}`, format: 'd.m.Y' },
          { name: 'orderDate', description: `{{UB.i18n('Дата')}}`, format: 'd.m.Y' },
          { name: 'orderID.orderNumber', description: `{{UB.i18n('Номер наказу')}}` },
          { name: 'orderID.orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'orderID.empOrderType', description: `{{UB.i18n('Вид наказу')}}` },
          { name: 'orderID.titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'orderID.comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'orderID.description', visibility: false },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },
          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Витяги'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMeOrderA',
    isFolder: 0,
    caption: 'Мої накази',
    caption_uk: 'Мої накази',
    caption_ru: 'Мои приказы',
    caption_az: 'Mənim əmrlərim',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empOrder',
          method: 'select',
          fieldList: [
            { name: 'empOrderType' },
            { name: 'orderNumberFullView' },
            { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
            { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
            { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
            {
              name: 'orderState',
              description: `{{UB.i18n('Стан')}}`
            },
            { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
            { name: 'description', visibility: false },
            { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
            { name: 'mOrganizationName' },
            { name: 'organizationName' },
            { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

            { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
          ],
          whereList: {
            my: {
              expression: '[mi_createUser]',
              condition: 'equal',
              values: {
                my: '#currentUserID'
              }
            },
            orderState: {
              expression: '[orderState]',
              condition: 'equal',
              value: 'POSTED'
            }
          },
          orderList: {
            orderBy: { expression: 'orderDate', order: 'desc' }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Мої накази'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-calendar',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMeOrderProjA',
    isFolder: 0,
    caption: 'Мої проєкти',
    caption_uk: 'Мої проєкти',
    caption_ru: 'Мои проекты',
    caption_az: 'Mənim layihələrim',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empOrder',
          method: 'select',
          fieldList: [
            { name: 'empOrderType' },
            { name: 'orderNumberFullView' },
            { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
            { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
            { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
            {
              name: 'orderState',
              description: `{{UB.i18n('Стан')}}`
            },
            { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
            { name: 'description', visibility: false },
            { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
            { name: 'mOrganizationName' },
            { name: 'organizationName' },
            { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

            { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
          ],
          whereList: {
            my: {
              expression: '[mi_createUser]',
              condition: 'equal',
              values: {
                my: '#currentUserID'
              }
            },
            orderState: {
              expression: '[orderState]',
              condition: 'equal',
              value: 'PROJECT'
            }
          },
          orderList: {
            orderBy: { expression: 'orderDate', order: 'desc' }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Мої проєкти'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-calendar',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMeOrderTodayA',
    isFolder: 0,
    caption: 'Мої накази за сьогодні',
    caption_uk: 'Мої накази за сьогодні',
    caption_ru: 'Мои приказы за сегодня',
    caption_az: 'Mənim bu günə olan əmrlərim',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empOrder',
          method: 'select',
          fieldList: [
            { name: 'empOrderType' },
            { name: 'orderNumberFullView' },
            { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
            { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
            { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
            {
              name: 'orderState',
              description: `{{UB.i18n('Стан')}}`
            },
            { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
            { name: 'description', visibility: false },
            { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
            { name: 'mOrganizationName' },
            { name: 'organizationName' },
            { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

            { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
          ],
          whereList: {
            my: {
              expression: '[mi_createUser]',
              condition: 'equal',
              values: {
                my: '#currentUserID'
              }
            },
            orderState: {
              expression: '[orderState]',
              condition: 'equal',
              value: 'POSTED'
            }
          },
          orderList: {
            orderBy: { expression: 'orderDate', order: 'desc' }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Мої накази за сьогодні'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        const grid = this
        const whereList = grid.getStore().ubRequest.whereList

        const curDate = new Date(appAC.globalApplicationDate())
        const curDateMin = new Date(curDate.setHours(0, 0, 0))
        const curDateMax = new Date(curDate.setHours(23, 59, 59))
        whereList.orderDate1 = {
          expression: '[mi_createDate]',
          condition: '>=',
          value: curDateMin
        }
        whereList.orderDate2 = {
          expression: '[mi_createDate]',
          condition: '<=',
          value: curDateMax
        }

        AC.gridUtils.setGlobalOrganization(grid, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-calendar-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderMeOrderProjTodayA',
    isFolder: 0,
    caption: 'Мої проєкти за сьогодні',
    caption_uk: 'Мої проєкти за сьогодні',
    caption_ru: 'Мои проекты за сегодня',
    caption_az: 'Mənim bu günə olan layihələrim',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empOrder',
          method: 'select',
          fieldList: [
            { name: 'empOrderType' },
            { name: 'orderNumberFullView' },
            { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
            { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
            { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
            {
              name: 'orderState',
              description: `{{UB.i18n('Стан')}}`
            },
            { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
            { name: 'description', visibility: false },
            { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
            { name: 'mOrganizationName' },
            { name: 'organizationName' },
            { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

            { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
          ],
          whereList: {
            my: {
              expression: '[mi_createUser]',
              condition: 'equal',
              values: {
                my: '#currentUserID'
              }
            },
            orderState: {
              expression: '[orderState]',
              condition: 'equal',
              value: 'PROJECT'
            }
          },
          orderList: {
            orderBy: { expression: 'orderDate', order: 'desc' }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Мої проєкти за сьогодні'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        const grid = this
        const whereList = grid.getStore().ubRequest.whereList

        const curDate = new Date(appAC.globalApplicationDate())
        const curDateMin = new Date(curDate.setHours(0, 0, 0))
        const curDateMax = new Date(curDate.setHours(23, 59, 59))
        whereList.orderDate1 = {
          expression: '[mi_createDate]',
          condition: '>=',
          value: curDateMin
        }
        whereList.orderDate2 = {
          expression: '[mi_createDate]',
          condition: '<=',
          value: curDateMax
        }

        AC.gridUtils.setGlobalOrganization(grid, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-calendar-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderForCalcAll',
    isFolder: 0,
    caption: 'Вхідні документи',
    caption_uk: 'Вхідні документи',
    caption_ru: 'Входящие документы',
    caption_az: 'Daxil olan sənədlər',
    cmdType: 'showForm',
    formCode: 'hr_empOrderForCalcAll',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderAdCompetitionA',
    isFolder: 0,
    caption: 'Накази про оголошення конкурсу',
    caption_uk: 'Накази про оголошення конкурсу',
    caption_ru: 'Приказы об объявлении конкурса',
    caption_az: 'Müsabiqə elan edilməsi haqqında əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'COMPETITIONAD'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      },
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази про оголошення конкурсу'))
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    parentCode: 'documentsCfg',
    code: 'hr_timeSheetChange',
    isFolder: 0,
    caption: 'Скорочення робочого дня/тижня',
    caption_uk: 'Скорочення робочого дня/тижня',
    caption_ru: 'Сокращение рабочего дня/недели',
    caption_az: 'İş gününün həftəsinin qısaldılması',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_timeSheetChange',
        method: 'select',
        fieldList: [
          { name: 'dateFrom' },
          { name: 'dateToEmpty' },
          { name: 'typeSheetChange', config: { width: 160 } },
          { name: 'employeeList', config: { width: 200 } },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}`, config: { hidden: true } },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`,
            config: { align: 'center', hidden: true },
            format: '{{appHR.stateFormat}}'
          },
          { name: 'orderNumber' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'description', visibility: false },
          { name: 'hasPosted', visibility: false },
          { name: 'hasProject', visibility: false }
        ],
        orderList: {
          orderBy: { expression: 'dateFrom', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return row.get('orderState') === 'POSTED' && !row.get('hasProject') ? 'ub-row-green' : (row.get('hasPosted') && row.get('hasProject') ? 'ub-row-light-blue' : 'ub-row-lightgrey')
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accHREmpAdd',
    parentCode: 'documentsCfg',
    code: 'hr_timeCostChange',
    isFolder: 0,
    caption: 'Коригування неявок за наказами',
    caption_uk: 'Коригування неявок за наказами',
    caption_ru: 'Корректировка неявок по приказам',
    caption_az: 'Əmrlərdə çatışmazlıqların düzəldilməsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          orderType: {
            expression: '[empOrderType]',
            condition: 'equal',
            values: {
              empOrderType: 'CHGTIMECOST'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Коригування неявок за наказами'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
        HR.orderManager.setMasterOrgFilter(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_orderRegistryList',
    isFolder: 0,
    caption: 'Документи нарахування',
    caption_uk: 'Документи нарахування',
    caption_ru: 'Документы начисления',
    caption_az: 'Hesablaşma sənədləri',
    cmdType: 'showForm',
    formCode: 'hr_orderRegistryList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_orderRegistryTable',
    isFolder: 0,
    caption: 'Документи нарахування',
    caption_uk: 'Документи нарахування',
    caption_ru: 'Документы начисления',
    caption_az: 'Hesablaşma sənədləri',
    cmdType: 'showForm',
    formCode: 'hr_orderRegistryTable',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_orderRegistryShift',
    isFolder: 0,
    cmdType: 'showForm',
    caption: 'Заміни',
    caption_uk: 'Заміни',
    caption_ru: 'Замены',
    caption_az: 'Əvəzetmələr',
    formCode: 'hr_orderRegistryList',
    cmpInitConfig: {
      cmdData: {
        customParams: {
          orderTypes: ['hr_orderRegistryShift']
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_payRollList',
    isFolder: 0,
    caption: 'Платіжні відомості',
    caption_uk: 'Платіжні відомості',
    caption_ru: 'Платежные ведомости',
    caption_az: 'Əmək haqqı cədvəli',
    cmdType: 'showForm',
    formCode: 'hr_payRollList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'hr_regReportSalaryCfg',
    code: 'hr_empSicknessRequis',
    isFolder: 0,
    caption: 'Заява-розрахунок СС',
    caption_uk: 'Заява-розрахунок СС',
    caption_ru: 'Заявление-расчет СС',
    caption_az: 'DSMF-nin hesabat bəyannaməsi',
    cmdType: 'showForm',
    formCode: 'hr_sicknessRequisList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 5000
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsOrgstruct',
    isFolder: 1,
    caption: 'Звіти за Оргструктурою',
    caption_uk: 'Звіти за Оргструктурою',
    caption_ru: 'Отчеты по Оргструктуре',
    caption_az: 'Təşkilati struktur uzrə hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgstruct',
        isFolder: 0,
        caption: 'Штатний розпис',
        caption_uk: 'Штатний розпис',
        caption_ru: 'Штатное расписание',
        caption_az: 'Ştat cədvəli',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgstruct',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgstructWithAccrual',
        isFolder: 0,
        caption: 'Штатний розпис з нарахуваннями',
        caption_uk: 'Штатний розпис з нарахуваннями',
        caption_ru: 'Штатное расписание c начислениями',
        caption_az: 'Ştat cədvəli hesablama ilə',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgstructWithAccrual',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 15
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgpos',
        isFolder: 0,
        caption: 'Штатно-посадовий список',
        caption_uk: 'Штатно-посадовий список',
        caption_ru: 'Штатно-должностной список',
        caption_az: 'Ştat vəzifələrinin siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgpos',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgcounts',
        isFolder: 0,
        caption: 'Структура та чисельність штатних одиниць',
        caption_uk: 'Структура та чисельність штатних одиниць',
        caption_ru: 'Структура и численность штатных единиц',
        caption_az: 'Ştat vahidlərinin strukturu və sayı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgcounts',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgplan',
        isFolder: 0,
        caption: 'Плановий штатний розпис',
        caption_uk: 'Плановий штатний розпис',
        caption_ru: 'Плановое штатное расписание',
        caption_az: 'Planlaşdırılmış ştat cədvəli',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgplan',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgcountsByCateg',
        isFolder: 0,
        caption: 'Довідка про кількість штатних одиниць та ФЗП за категоріями персоналу',
        caption_uk: 'Довідка про кількість штатних одиниць та ФЗП за категоріями персоналу',
        caption_ru: 'Справка о количестве штатных единиц и ФЗП по категориям персонала',
        caption_az: 'Kadrlar kateqoriyası üzrə ştat vahidlərinin sayı və əmək haqqı fondu haqqında məlumat',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgcountsByCateg',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportVacanciesList',
        isFolder: 0,
        caption: 'Перелік вакантних посад',
        caption_uk: 'Перелік вакантних посад',
        caption_ru: 'Перечень вакантных должностей',
        caption_az: 'Vakant vəzifələrin siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_vacanciesList',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 60
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportTypicalOrgPlan',
        isFolder: 0,
        caption: 'Типовий штатний розпис',
        caption_uk: 'Типовий штатний розпис',
        caption_ru: 'Типовое штатное расписание',
        caption_az: 'Standart ştat cədvəli',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_TypicalOrgPlan',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 70
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportDepEvents',
        isFolder: 0,
        caption: 'Звіт про кадрові зміни по підрозділу (за період)',
        caption_uk: 'Звіт про кадрові зміни по підрозділу (за період)',
        caption_ru: 'Отчет о кадровых изменениях по подразделению (за период)',
        caption_az: 'Struktur vahidləri üzrə kadr dəyişiklikləri barədə hesabat (dövr üzrə)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportDepEvents',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 80
      },
      /* {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgstructInfo',
        isFolder: 0,
        caption: 'Інформація до штатного розпису (змін до штатного розпису) органу виконавчої влади',
        caption_uk: 'Інформація до штатного розпису (змін до штатного розпису) органу виконавчої влади',
        caption_ru: 'Информация к штатному расписанию (изменения в штатное расписание) органа исполнительной власти',
        caption_az: 'Müvafiq icra hakimiyyəti orqanının ştat cədvəli haqqında (ştat cədvəlində dəyişikliklər) məlumat',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgstructInfo',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 90
      }, */
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgposCount',
        isFolder: 0,
        caption: 'Звіт щодо кількості посад у штатному розписі',
        caption_uk: 'Звіт щодо кількості посад у штатному розписі',
        caption_ru: 'Отчет по количеству должностей в штатном расписании',
        caption_az: 'Ştat cədvəlində vəzifələrin sayı barədə hesabat',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgposCounts',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgposExpanded',
        isFolder: 0,
        caption: 'Розширений штатно-посадовий список',
        caption_uk: 'Розширений штатно-посадовий список',
        caption_ru: 'Расширенный штатно-должностной список',
        caption_az: 'Ştat vəzifələri üzrə ətraflı cədvəl',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgposExpanded',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportEmpCountPositionByCategory',
        isFolder: 0,
        caption: 'Кількісний склад за категоріями посад',
        caption_uk: 'Кількісний склад за категоріями посад',
        caption_ru: 'Количественный состав по категориям должностей',
        caption_az: 'Vəzifə kateqoriyalarına görə say tərkibi',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportEmpCountPositionByCategory',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportTypicalOrgPlanByPayGroup',
        isFolder: 0,
        caption: 'Штатний розпис з доплатами та надбавками (по видам нарахувань)',
        caption_uk: 'Штатний розпис з доплатами та надбавками (по видам нарахувань)',
        caption_ru: 'Штатное разписание с доплатами и надбавками (по видам начислений)',
        caption_az: 'Əlavələr və müavinətlər ilə ştat cədvəli (hesablama növünə görə)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_TypicalOrgPlanByPayGroup',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 130
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgstructConsolidated',
        isFolder: 0,
        caption: 'Зведений штатний розпис',
        caption_uk: 'Зведений штатний розпис',
        caption_ru: 'Сводное штатное расписание',
        caption_az: 'Ümumiləşdirilmiş ştat cədvəli',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgstructConsolidated',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 140
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportOrgstructConsolidatedAccrual',
        isFolder: 0,
        caption: 'Зведений штатний розпис з доплатами та надбавками',
        caption_uk: 'Зведений штатний розпис з доплатами та надбавками',
        caption_ru: 'Сводное штатное расписание с доплатами и надбавками',
        caption_az: 'Əlavə ödənişlər və müavinətlərlə birlikdə konsolidasiya edilmiş işçilər siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgstructConsolidatedAccrual',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 140
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportForm31e',
        isFolder: 0,
        caption: 'Форма 31 енерго',
        caption_uk: 'Форма 31 енерго',
        caption_ru: 'Форма 31 энерго',
        caption_az: 'Forma 31 enerji',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportForm31e',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 150
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_report_averageStatistics',
        isFolder: 0,
        caption: 'Звіт по середньообліковій чисельності та середньомісячній зарплаті',
        caption_uk: 'Звіт по середньообліковій чисельності та середньомісячній зарплаті',
        caption_ru: 'Отчет по среднеучетной численности и среднемесячной зарплате',
        caption_az: 'Orta say və orta aylıq əmək haqqı haqqında hesabat verin',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_report_averageStatistics',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 43
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportAverageSalary',
        isFolder: 0,
        caption: 'Звіт по середній заробітній платі',
        caption_uk: 'Звіт по середній заробітній платі',
        caption_ru: 'Отчет по средней заработной плате',
        caption_az: 'Orta əmək haqqı haqqında hesabat',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportAverageSalary',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 160
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportAboutStaffing',
        isFolder: 0,
        caption: 'Про укомплектованість',
        caption_uk: 'Про укомплектованість',
        caption_ru: 'Про укомплектованность',
        caption_az: 'Kadr təminatı haqqında',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportAboutStaffing',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 170
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_reportPositionByType',
        isFolder: 0,
        caption: 'Кількість посад організації в розрізі категорій персоналу',
        caption_uk: 'Кількість посад організації в розрізі категорій персоналу',
        caption_ru: 'Количество должностей организации в разрезе категорий персонала',
        caption_az: 'Kateqoriyalara görə təşkilatdakı vəzifələrin sayı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportPositionByType',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 180
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsOrgstruct',
        code: 'hr_orgstructConsolidatedMilitary',
        isFolder: 0,
        caption: 'Зведений штатний розпис (ВС)',
        caption_uk: 'Зведений штатний розпис (ВС)',
        caption_ru: 'Сводное штатное расписание (ВС)',
        caption_az: 'Ümumiləşdirilmiş ştat cədvəli (military)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_orgstructConsolidatedMilitary',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 190
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsAppointment',
    isFolder: 1,
    caption: 'Списки для контролю даних',
    caption_uk: 'Списки для контролю даних',
    caption_ru: 'Списки для контроля данных',
    caption_az: 'Списки для контроля данных',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsAppointment',
        code: 'hr_empListdictPosition',
        isFolder: 0,
        caption: 'Штатні посади',
        caption_uk: 'Штатні посади',
        caption_ru: 'Штатные должности',
        caption_az: 'Kadr mövqeləri',
        cmdType: 'showForm',
        formCode: 'hr_empListdictPosition',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 6
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsAppointment',
        code: 'hr_empListControlDictPosition',
        isFolder: 0,
        caption: 'Довідник посад',
        caption_uk: 'Довідник посад',
        caption_ru: 'Справочник должностей',
        caption_az: 'Vəzifələr kataloqu',
        cmdType: 'showForm',
        formCode: 'hr_empListControlDictPosition',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 6
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_reportListOrgstructure',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    cmdType: 'showForm',
    formCode: 'hr_reportListOrgstructure',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportTypicalOrgPlanByPay',
    isFolder: 0,
    caption: 'Штатний розпис з доплатами та надбавками',
    caption_uk: 'Штатний розпис з доплатами та надбавками',
    caption_ru: 'Штатное расписание с доплатами и надбавками',
    caption_az: 'Əlavə ödəniş və müavinətlər nəzərə alınmaqla ştat cədvəli',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_TypicalOrgPlanByPay',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 75
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportTariffing',
    isFolder: 0,
    caption: 'Тарифікаційний список (фактичний)',
    caption_uk: 'Тарифікаційний список (фактичний)',
    caption_ru: 'Тарификационный список (фактический)',
    caption_az: 'Tarif siyahısı (faktiki)',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_tariffing',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 76
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportsOrgstruct',
    code: 'hr_reportTariffing2',
    isFolder: 0,
    caption: 'Тарифікаційний список (фактичний)',
    caption_uk: 'Тарифікаційний список (фактичний)',
    caption_ru: 'Тарификационный список (фактический)',
    caption_az: 'Tarif siyahısı (faktiki)',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_tariffing',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 76
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'trf_allReportsCfg',
    code: 'regReportsItemDNZEmployees',
    isFolder: 0,
    caption: 'Тарифікаційний список працівників ДНЗ',
    caption_uk: 'Тарифікаційний список працівників ДНЗ',
    caption_ru: 'Тарифікаційний список працівників ДНЗ',
    caption_az: 'Тарифікаційний список працівників ДНЗ',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3009,
    cmdType: 'showForm',
    formCode: 'trf_constructorReports',
    cmdData: {
        reportCode: 'trf_reportEmpDNZList',
        reportType: 'html',
        reportOptions: {
          allowExportToExcel: false
        }
    }
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportsEmployee',
    code: 'hr_reportEmpAccrualList',
    isFolder: 0,
    caption: 'Список працівників за нарахуванням',
    caption_uk: 'Список працівників за нарахуванням',
    caption_ru: 'Список сотрудников по начислениям',
    caption_az: 'Hesablamalar üzrə əməkdaşların siyahısı',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportEmpAccrualList',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 77
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportsOrgstruct',
    code: 'hr_organizationAddresses',
    isFolder: 0,
    caption: 'Адреси організацій',
    caption_uk: 'Адреси організацій',
    caption_ru: 'Адреса организаций',
    caption_az: 'Təşkilatların ünvanları',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_organizationAddresses',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 78
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsStat',
    isFolder: 1,
    caption: 'Статистичні звіти',
    caption_uk: 'Статистичні звіти',
    caption_ru: 'Статистические отчеты',
    caption_az: 'Statistik hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsStat',
        code: 'hr_reportKsds',
        isFolder: 0,
        caption: 'Форма КСДС',
        caption_uk: 'Форма КСДС',
        caption_ru: 'Форма КСДС',
        caption_az: 'Dövlət qulluqçularının say tərkibi forması',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_ksds',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsStat',
        code: 'hr_reportAppoint',
        isFolder: 0,
        caption: 'Повідомлення про прийняття працівника на роботу',
        caption_uk: 'Повідомлення про прийняття працівника на роботу',
        caption_ru: 'Сообщение о принятии работника на работу',
        caption_az: 'Əməkdaşın işə təyin olunması haqqında bildiriş',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportAppoint',
          reportType: 'pdf'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsStat',
        code: 'hr_reportForm1k',
        isFolder: 0,
        caption: 'Форма 1–к. Кількість, склад та переміщення працівників',
        caption_uk: 'Форма 1–к. Кількість, склад та переміщення працівників',
        caption_ru: 'Форма 1–к. Колличество, состав и перемещения работников',
        caption_az: 'Forma 1-k. İşçilərin sayı, tərkibi və hərəkəti',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_form1k',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsStat',
        code: 'hr_reportForm1k_v2',
        isFolder: 0,
        caption: 'Кількість та склад працівників',
        caption_uk: 'Кількість та склад працівників',
        caption_ru: 'Колличество и состав работников',
        caption_az: 'İşçilərin sayı və tərkibi',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_form1k_v2',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_regReportSalaryCfg',
    isFolder: 1,
    caption: 'Регламентовані звіти',
    caption_uk: 'Регламентовані звіти',
    caption_ru: 'Регламентированные отчеты',
    caption_az: 'Reqlamentləşdirilmiş hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryRun',
        isFolder: 0,
        caption: 'Створити звіт',
        caption_uk: 'Створити звіт',
        caption_ru: 'Создать отчет',
        caption_az: 'Hesabat yaratmaq',
        cmdType: 'showForm',
        formCode: 'ac_regReportSelect',
        cmpInitConfig: {
          shortcutCode: 'hr_regReportSalaryRun',
          caption: 'Створити звіт',
          caption_uk: 'Створити звіт',
          caption_ru: 'Создать отчет',
          tip: `{{UB.i18n('Створити звіт')}}`,
          repCode: [
            'J05001',
            'J30004', 'J30401', 'J30402', 'J30403', 'J30404', 'J30405', 'J30406', 'J30407', 'J30408', 'J30409',
            'S03010', 'S03011', 'S02201', 'S03030', 'S03007',
            'C11001', 'C11101', 'C11102', 'C11103', 'C11104', 'C11105', 'C11002',
            'H03010', 'H01100', 'H02100', 'H04010', 'H05010'
          ],
          repGroup: ['statistical', 'taxation', 'fssu', 'pf'],
          model: 'HR'
        },
        inWindow: 1,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 3000
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalary',
        isFolder: 0,
        caption: 'Реєстр регламентованих звітів',
        caption_uk: 'Реєстр регламентованих звітів',
        caption_ru: 'Реестр регламентированных отчетов',
        caption_az: 'Tənzimlənən hesabatların reyestri',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'in',
                  values: {
                    'dictRepID.fullCode': [
                      'J05001',
                      'J30004', 'J30401', 'J30402', 'J30403', 'J30404', 'J30405', 'J30406', 'J30407', 'J30408', 'J30409',
                      'S03010', 'S03011', 'S02201', 'S03030', 'S03007',
                      'C11001', 'C11101', 'C11102', 'C11103', 'C11104', 'C11105', 'C11002', 'C1100101', 'H03010',
                      'H01100', 'H02100', 'H04010', 'H05010'
                    ]
                  }
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            listeners: {
              render: function () {
                this.setTitle(UB.i18n('Реєстр регламентованих звітів'))
              }
            },
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'fas fa-plus',
                cls: 'add-new-action',
                hidden: '{{!AC.entityUtils.verifyRightsMethod(\'ac_regReport\', \'addnew\')}}',
                handler: function () {
                  $App.runShortcutCommand('hr_regReportSalaryRun', true)
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4001
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryPDFOESV',
        isFolder: 0,
        caption: `Об'єднаний звіт з ПДФО та ЄСВ`,
        caption_uk: 'Об\'єднаний звіт з ПДФО та ЄСВ',
        caption_ru: 'Объединенный отчет по НДФЛ и ЕСВ',
        caption_az: 'Fiziki şəxslərin gəlir vergisi və birdəfəlik sosial ödəmələr üzrə ümumiləşdirilmiş hesabat',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'comment', description: `{{UB.i18n('Додатково')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.code]',
                  condition: '=',
                  value: 'J05'
                },
                subCode: {
                  expression: '[dictRepID.subCode]',
                  condition: '=',
                  value: '001'
                },
                codeName: {
                  expression: '[dictRepID.codeName]',
                  condition: '=',
                  value: 'ПДФО_ЄСВ'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'taxation',
                    repCode: 'J05',
                    subCode: '001',
                    codeName: 'ПДФО_ЄСВ',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4002
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryPDFOESV2025',
        isFolder: 0,
        caption: `Об'єднаний звіт з ПДФО та ЄСВ 2025`,
        caption_uk: 'Об\'єднаний звіт з ПДФО та ЄСВ 2025',
        caption_ru: 'Объединенный отчет по НДФЛ и ЕСВ 2025',
        caption_az: 'Fiziki şəxslərin gəlir vergisi və 2025-ə dair birdəfəlik sosial ödəmələr üzrə ümumiləşdirilmiş hesabat',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'comment', description: `{{UB.i18n('Додатково')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.code]',
                  condition: '=',
                  value: 'J05'
                },
                subCode: {
                  expression: '[dictRepID.subCode]',
                  condition: '=',
                  value: '001'
                },
                codeName: {
                  expression: '[dictRepID.codeName]',
                  condition: '=',
                  value: 'ПДФО_ЄСВ_2025'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'taxation',
                    repCode: 'J05',
                    subCode: '001',
                    codeName: 'ПДФО_ЄСВ_2025',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4002
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalary1DF',
        isFolder: 0,
        caption: 'Довідка "Форма 1-ДФ"',
        caption_uk: 'Довідка "Форма 1-ДФ"',
        caption_ru: 'Справка "Форма 1-ДФ"',
        caption_az: 'Fiziki şəxslərin gəlir vergisi barədə arayış',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.code]',
                  condition: '=',
                  value: 'J05'
                },
                subCode: {
                  expression: '[dictRepID.subCode]',
                  condition: '=',
                  value: '001'
                },
                codeName: {
                  expression: '[dictRepID.codeName]',
                  condition: '=',
                  value: '1 ДФ'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'taxation',
                    repCode: 'J05',
                    subCode: '001',
                    codeName: '1 ДФ',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4003
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryESV4',
        isFolder: 0,
        caption: 'Відомість ЄСВ (Додаток 4)',
        caption_uk: 'Відомість ЄСВ (Додаток 4)',
        caption_ru: 'Ведомость ЕСВ (Приложение 4)',
        caption_az: 'Birdəfəlik sosial ödəmələr cədvəli',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.code]',
                  condition: '=',
                  value: 'J30'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  appHR.regReportSalaryForm({
                    repGroup: 'taxation',
                    repCode: 'J30',
                    subCode: '004',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4004
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalary1PVM',
        isFolder: 0,
        caption: 'Звіт з праці 1-ПВ місячна',
        caption_uk: 'Звіт з праці 1-ПВ місячна',
        caption_ru: 'Отчет по труду 1-ПВ месячная',
        caption_az: 'Əmək haqqı üzrə aylıq mədaxil hesabatı',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'S03010'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'statistical',
                    repCode: 'S03',
                    subCode: '010',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4005
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryB',
        isFolder: 0,
        caption: 'Форма № 3-борг',
        caption_uk: 'Форма № 3-борг',
        caption_ru: 'Форма № 3-долг',
        caption_az: '3 nömrəli borc forması',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'S02201'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  appHR.regReportSalaryForm({
                    repGroup: 'statistical',
                    repCode: 'S02',
                    subCode: '201',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4005
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalary1PVK',
        isFolder: 0,
        caption: 'Звіт з праці 1-ПВ квартальна',
        caption_uk: 'Звіт з праці 1-ПВ квартальна',
        caption_ru: 'Отчет по труду 1-ПВ квартальная',
        caption_az: 'Əmək haqqı üzrə rüblük mədaxil hesabatı',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
                { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'S03011'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'statistical',
                    repCode: 'S03',
                    subCode: '011',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4006
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryFSS',
        isFolder: 0,
        caption: 'Повідомлення у СС про виплату коштів',
        caption_uk: 'Повідомлення у СС про виплату коштів',
        caption_ru: 'Уведомление СС о выплате средств',
        caption_az: 'DSMF hesabına ödənişlər haqqında  bildiriş',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
                { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'C11002'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'fssu',
                    repCode: 'C11',
                    subCode: '002',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 6000
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalaryPF',
        isFolder: 0,
        caption: 'Заява-розрахунок ПФ',
        caption_uk: 'Заява-розрахунок ПФ',
        caption_ru: 'Заява-розрахунок ПФ',
        caption_az: 'Заява-розрахунок ПФ',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
                { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'H04010'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'pf',
                    repCode: 'H04',
                    subCode: '010',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 6000
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportFundCHAES',
        isFolder: 0,
        caption: 'Звіт у фонд ЧАЕС',
        caption_uk: 'Звіт у фонд ЧАЕС',
        caption_ru: 'Отчет в фонд ЧАЭС',
        caption_az: 'Çernobıl AES fond hesabatı',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
                { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'H03010'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'statistical',
                    repCode: 'H03',
                    subCode: '010',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 7000
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalary1RS',
        isFolder: 0,
        caption: 'Звіт про витрати на утримання робочої сили ',
        caption_uk: '1-РС Звіт про витрати на утримання робочої сили',
        caption_ru: '1-РС Отчет о расходах на содержание рабочей силы',
        caption_az: '1-RS Əmək xərcləri haqqında hesabat',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
                { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'S03030'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  // $App.runShortcutCommand('hr_regReportSalaryRun', true)
                  appHR.regReportSalaryForm({
                    repGroup: 'statistical',
                    repCode: 'S03',
                    subCode: '030',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4006
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryCfg',
        code: 'hr_regReportSalary7VK',
        isFolder: 0,
        caption: 'Про виплату компенсацій, допомоги та надання пільг громадянам, які постраждали внаслідок Чорнобильської катастрофи',
        caption_uk: 'Про виплату компенсацій, допомоги та надання пільг громадянам, які постраждали внаслідок Чорнобильської катастрофи',
        caption_ru: 'О выплате компенсаций, помощи и предоставления льгот гражданам, пострадавшим в результате Чернобыльской катастрофы',
        caption_az: 'Çernobıl qəzası nəticəsində zərər çəkmiş vətəndaşlara kompensasiyaların, yardımların və müavinətlərin ödənilməsi haqqında',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_regReport',
              method: 'select',
              fieldList: [
                { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
                { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
                { name: 'codeName' },
                { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
                { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
                { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false }
              ],
              whereList: {
                code: {
                  expression: '[dictRepID.fullCode]',
                  condition: 'equal',
                  value: 'H05010'
                }
              },
              orderList: {
                repYear: {
                  expression: '[repYear]', order: 'desc'
                },
                period: {
                  expression: '[dictRepTypeID.code]', order: 'asc'
                },
                mi_modifyDate: {
                  expression: '[mi_modifyDate]', order: 'desc'
                }
              }
            }]
          },
          cmpInitConfig: {
            disableAutoLoadStore: true,
            hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
            customActions: [
              {
                text: `{{UB.i18n('Створити звіт')}}`,
                iconCls: 'u-icon-add',
                cls: 'add-new-action',
                handler: function () {
                  appHR.regReportSalaryForm({
                    repGroup: 'statistical',
                    repCode: 'H05',
                    subCode: '010',
                    disableRepCode: true,
                    disableSubCode: true,
                    disableOrg: true,
                    autoSetPeriod: true
                  })
                }
              }
            ],
            onDeterminateForm: function (grid) {
              return {
                cmpInitConfig: { model: 'HR' }
              }
            },
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 9000
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'hr_regReportSalaryCfg',
    code: 'hr_regReport10PI',
    isFolder: 0,
    caption: 'Форма № 10-ПОІ (річна)',
    caption_uk: 'Форма № 10-ПОІ (річна)',
    caption_ru: 'Форма № 10-ПИ (годовая)',
    caption_az: 'Forma № 10-PI (illik)',
    cmdCode: {
      cmdType: 'showList',
      cmdData: {
        params: [{
          entity: 'ac_regReport',
          method: 'select',
          fieldList: [
            { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
            { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
            { name: 'codeName' },
            { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
            { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
            { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
            { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
          ],
          whereList: {
            code: {
              expression: '[dictRepID.fullCode]',
              condition: 'equal',
              value: 'H01100'
            }
          },
          orderList: {
            repYear: {
              expression: '[repYear]', order: 'desc'
            },
            period: {
              expression: '[dictRepTypeID.code]', order: 'asc'
            },
            mi_modifyDate: {
              expression: '[mi_modifyDate]', order: 'desc'
            }
          }
        }]
      },
      cmpInitConfig: {
        disableAutoLoadStore: true,
        hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
        customActions: [
          {
            text: `{{UB.i18n('Створити звіт')}}`,
            iconCls: 'u-icon-add',
            cls: 'add-new-action',
            handler: function () {
              appHR.regReportSalaryForm({
                repGroup: 'statistical',
                repCode: 'H01',
                subCode: '100',
                disableRepCode: true,
                disableSubCode: true,
                disableOrg: true,
                autoSetPeriod: true
              })
            }
          }
        ],
        onDeterminateForm: function (grid) {
          return {
            cmpInitConfig: { model: 'HR' }
          }
        },
        afterInit: function () {
          AC.gridUtils.setGlobalOrganization(this, 'organizationID')
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 7001
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_empListControlAppointment',
    isFolder: 0,
    caption: 'Призначення',
    caption_uk: 'Призначення',
    caption_ru: 'Назначение',
    caption_az: 'Təyinat',
    cmdType: 'showForm',
    formCode: 'hr_empListControlAppointment',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 6
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_empListControlEmployeePosition',
    isFolder: 0,
    caption: 'Працівники, що мають 2 та більше активних призначень',
    caption_uk: 'Працівники, що мають 2 та більше активних призначень',
    caption_ru: 'Работники, имеющие 2 и более активных назначений',
    caption_az: 'Працівники, що мають 2 та більше активних призначень',
    cmdType: 'showForm',
    formCode: 'hr_empListControlEmployeePosition',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 6
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_empReportOnFixedVacationDays',
    isFolder: 0,
    caption: 'Звіт за фіксованими днями відпустки',
    caption_uk: 'Звіт за фіксованими днями відпустки',
    caption_ru: 'Отчет по фиксированным дням отпуска',
    caption_az: 'Müəyyən edilmiş tətil günləri haqqında hesabat',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_empReportOnFixedVacationDays',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 50
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_empListExtraRankAssignments',
    isFolder: 0,
    caption: 'Працівники, що мають 2 та більше активних записів щодо присвоєння рангу',
    caption_uk: 'Працівники, що мають 2 та більше активних записів щодо присвоєння рангу',
    caption_ru: 'Работники, имеющие 2 и более активных записей по присвоению ранга',
    caption_az: '2 və ya daha çox aktiv rütbə təyinatı olan işçilər',
    cmdType: 'showForm',
    formCode: 'hr_empListExtraRankAssignments',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 6
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'hr_regReportSalaryCfg',
    code: 'hr_regReportEmployment',
    isFolder: 0,
    caption: 'ІНФОРМАЦІЯ про зайнятість (річна)',
    caption_uk: 'ІНФОРМАЦІЯ про зайнятість (річна)',
    caption_ru: 'ИНФОРМАЦИЯ о занятости (годовая)',
    caption_az: 'İŞ MƏLUMATLARI (illik)',
    cmdCode: {
      cmdType: 'showList',
      cmdData: {
        params: [{
          entity: 'ac_regReport',
          method: 'select',
          fieldList: [
            { name: 'repYear', description: `{{UB.i18n('Рік')}}` },
            { name: 'dictRepTypeID.name', description: `{{UB.i18n('Період')}}` },
            { name: 'codeName' },
            { name: 'mi_modifyDate', description: `{{UB.i18n('Дата')}}` },
            { name: 'dictRepID.name', description: `{{UB.i18n('Звіт')}}` },
            { name: 'dictRepVersionID.description', description: `{{UB.i18n('Версія звіта')}}`, visibility: false },
            { name: 'organizationID.name', description: `{{UB.i18n('Організація')}}`, simpleFilter: true, visibility: false }
          ],
          whereList: {
            code: {
              expression: '[dictRepID.fullCode]',
              condition: 'equal',
              value: 'H02100'
            }
          },
          orderList: {
            repYear: {
              expression: '[repYear]', order: 'desc'
            },
            period: {
              expression: '[dictRepTypeID.code]', order: 'asc'
            },
            mi_modifyDate: {
              expression: '[mi_modifyDate]', order: 'desc'
            }
          }
        }]
      },
      cmpInitConfig: {
        disableAutoLoadStore: true,
        hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
        customActions: [
          {
            text: `{{UB.i18n('Створити звіт')}}`,
            iconCls: 'u-icon-add',
            cls: 'add-new-action',
            handler: function () {
              appHR.regReportSalaryForm({
                repGroup: 'statistical',
                repCode: 'H02',
                subCode: '100',
                disableRepCode: true,
                disableSubCode: true,
                disableOrg: true,
                autoSetPeriod: true
              })
            }
          }
        ],
        onDeterminateForm: function (grid) {
          return {
            cmpInitConfig: { model: 'HR' }
          }
        },
        afterInit: function () {
          AC.gridUtils.setGlobalOrganization(this, 'organizationID')
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 7001
  },
  {
    desktopCode: 'arm_accSalary',
    parentCode: 'hr_regReportSalaryCfg',
    code: 'hr_accrualReportPayment',
    isFolder: 0,
    caption: 'Звіт про здійснені відрахування та виплати',
    caption_uk: 'Звіт про здійснені відрахування та виплати',
    caption_ru: 'Отчет о проведенных отчислениях и выплатах',
    caption_az: 'Həyata keçirilmiş ayırmalar və ödənişlər üzrə hesabat',
    cmdType: 'showForm',
    formCode: 'hr_accrual-report',
    cmdData: {
      reportCode: 'hr_accrual-payment'
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 7500
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_allReportSalaryCfg',
    isFolder: 1,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 2,
    items: [
      {
        desktopCode: 'arm_accSalary',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_memorialOrder5',
        isFolder: 0,
        caption: 'Меморіальний ордер № 5',
        caption_uk: 'Меморіальний ордер № 5',
        caption_ru: 'Мемориальный ордер № 5',
        caption_az: 'Ölüm orderi',
        cmdType: 'showForm',
        formCode: 'hr_memorialOrder5',
        cmdData: {
          reportCode: 'trf_annexMemorialOrder',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_memorialOrder5PayEl',
        isFolder: 0,
        caption: 'Меморіальний ордер № 5 (види оплат)',
        caption_uk: 'Меморіальний ордер № 5 (види оплат)',
        caption_ru: 'Мемориальний ордер № 5 (виды оплат)',
        caption_az: 'Ölüm orderi (ödəniş növləri)',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_memorialOrder5PayEl',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_annexMemorialOrder',
        isFolder: 0,
        caption: 'Додаток до меморіального ордеру №5',
        caption_uk: 'Додаток до меморіального ордеру №5',
        caption_ru: 'Дополнение к мемориальному ордеру №5',
        caption_az: '5 nömrəli memorial ordenə əlavə',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_annexMemorialOrder',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 31
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_payrollEducation',
        isFolder: 0,
        caption: 'Розрахункова відомість (освіта)',
        caption_uk: 'Розрахункова відомість (освіта)',
        caption_ru: 'Расчетная ведомость (образование)',
        caption_az: 'Əmək haqqı (təhsil)',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_payrollEducation',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 31
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportN6',
        isFolder: 0,
        caption: 'Форма № П-6 "Розрахунково-платіжна відомість працівника"',
        caption_uk: 'Форма № П-6 "Розрахунково-платіжна відомість працівника"',
        caption_ru: 'Форма № П-6 "Расчетно-платежная ведомость работника"',
        caption_az: 'Əməkdaşın hesablaşma ödəniş cədvəli',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-N6',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportN7',
        isFolder: 0,
        caption: 'Форма № П-7 "Розрахунково-платіжна відомість (зведена)"',
        caption_uk: 'Форма № П-7 "Розрахунково-платіжна відомість (зведена)"',
        caption_ru: 'Форма № П-7 "Расчетно-платежная ведомость (сводная)"',
        caption_az: 'Əmək haqqı hesabatı cədvəli (ümumiləşdirilmiş)',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-N7',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_summaryActualCosts',
        isFolder: 0,
        caption: 'Зведена відомість фактичних витрат на заробітну плату працівникам освіти',
        caption_uk: 'Зведена відомість фактичних витрат на заробітну плату працівникам освіти',
        caption_ru: 'Сводная ведомость фактически выплат на зарплату сотрудникам',
        caption_az: 'İşçilərə faktiki ödənişlər haqqında konsolidə edilmiş hesabat',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_salaryCosts',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 41
      },

      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportFOP',
        isFolder: 0,
        caption: 'Звіт з ФОП',
        caption_uk: 'Звіт з ФОП',
        caption_ru: 'Отчет по ФЛП',
        caption_az: 'FOP-dan reportaj',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-FOP',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 43
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportByLongVacation',
        isFolder: 0,
        caption: 'Список працівників, що знаходяться у довготривалих відпустках',
        caption_uk: 'Список працівників, що знаходяться у довготривалих відпустках',
        caption_ru: 'Список работников, которые находятся в долгосрочном отпуске',
        caption_az: 'Список працівників, що знаходяться у довготривалих відпустках',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_empListByLongVacation',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 43
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportWork',
        isFolder: 0,
        caption: 'Звіт з праці',
        caption_uk: 'Звіт з праці',
        caption_ru: 'Отчет по труду',
        caption_az: 'Əmək hesabatı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-workReport',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 45
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportIndividualEmpContract',
        isFolder: 0,
        caption: 'Звіт по індивідуальним трудовим договорам (контракт)',
        caption_uk: 'Звіт по індивідуальним трудовим договорам (контракт)',
        caption_ru: 'Отчет по индивидуальным трудовым договорам (контракт)',
        caption_az: 'Fərdi əmək müqavilələri (müqavilə) haqqında hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-individualEmpContract',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 47
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_reportConsolAccDeduc',
        isFolder: 0,
        caption: 'Консолідований звіт про нарахування та відрахування',
        caption_uk: 'Консолідований звіт про нарахування та відрахування',
        caption_ru: 'Консолидированный отчет о начислениях и отчислениях',
        caption_az: 'Hesablama və ayırmalar üzrə ümumiləşdirilmiş cədvəl',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportConsolAccDeduc',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportIncTax',
        isFolder: 0,
        caption: 'Звіт про дохід, з якого вираховується ЄСВ за видами нарахувань',
        caption_uk: 'Звіт про дохід, з якого вираховується ЄСВ за видами нарахувань',
        caption_ru: 'Отчет о доходах, из которых исчисляется ЕСВ по видам начислений',
        caption_az: 'Hesablama növlərinə görə birdəfəlik sosial ödəmələr çıxılmaqla gəlirlərin hesabatı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-incTax',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 60
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_posGroup',
        isFolder: 0,
        caption: 'Відомість нарахувань зп по посадам',
        caption_uk: 'Відомість нарахувань зп по посадам',
        caption_ru: 'Ведомость начислений зп по должностям',
        caption_az: 'Vəzifə üzrə əmək haqqı hesablamaları cədvəli',
        cmdType: 'showForm',
        formCode: 'hr_posGroupAccural',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 70
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportCalcFunds',
        isFolder: 0,
        caption: 'Відомість розрахунку нарахувань у фонди',
        caption_uk: 'Відомість розрахунку нарахувань у фонди',
        caption_ru: 'Ведомость расчета начислений в фонды',
        caption_az: 'Fondlara köçürmələrin hesablanması üzrə hesabat cədvəli',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-calcFunds',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 80
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportGreaterMaxECB',
        isFolder: 0,
        caption: 'Звіт про суми, що перевищують максимальну суму для розрахунку ЄСВ',
        caption_uk: 'Звіт про суми, що перевищують максимальну суму для розрахунку ЄСВ',
        caption_ru: 'Отчет о суммах, превышающих максимальную сумму для расчета ЕСВ',
        caption_az: 'Birdəfəlik sosial ödəniş hesabatları üzrə maksimal məbləği keçən məbləğlərin hesabatı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportGreaterMaxECB',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportAddCostsECB',
        isFolder: 0,
        caption: 'Звіт про додаткові витрати ЄСВ на мінімальну заробітну плату',
        caption_uk: 'Звіт про додаткові витрати ЄСВ на мінімальну заробітну плату',
        caption_ru: 'Отчет о дополнительных расходах ЕСВ на минимальную заработную плату',
        caption_az: 'Minimal əmək haqqı ödənişinə görə əlavə birdəfəlik sosial ödəniş xərclərinin hesabatı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportAddCostsECB',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportDeducTax',
        isFolder: 0,
        caption: 'Звіт про відрахування податку з доходів фізичних осіб',
        caption_uk: 'Звіт про відрахування податку з доходів фізичних осіб',
        caption_ru: 'Отчет об отчислении налога с доходов физических лиц',
        caption_az: 'Fiziki şəxslərin gəlirlərindən vergilərin çıxılması hesabatı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_reportDeducTax',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportDeducMilitaryTax',
        isFolder: 0,
        caption: 'Звіт про відрахування військового збору працівників',
        caption_uk: 'Звіт про відрахування військового збору працівників',
        caption_ru: 'Отчет об отчислении военного сбора работников',
        caption_az: 'Əməkdaşların hərbi yığımdan çıxarılması haqqında hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_reportDeducMilitaryTax',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportAccrualReleased',
        isFolder: 0,
        caption: 'Звіт про нарахування звільненим',
        caption_uk: 'Звіт про нарахування звільненим',
        caption_ru: 'Отчет о начислении уволенным',
        caption_az: 'İşdən azad olunanların hesablanmasına dair hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_reportAccrualReleased',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 45
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_accrualReportMinWage',
        isFolder: 0,
        caption: 'Звіт про нарахування працівникові доплати до мінімальної заробітної плати',
        caption_uk: 'Звіт про нарахування працівникові доплати до мінімальної заробітної плати',
        caption_ru: 'Отчет о начислении работнику доплаты до минимальной заработной платы',
        caption_az: 'Əməkdaşa minimal əmək haqqı məbləgində  əlavə ödəniş hesablanması barədə hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-minWage',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 50
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_accrualReportVacation',
        isFolder: 0,
        caption: 'Звіт про розрахункові суми оплати відпусток та компенсації за невикористані відпустки',
        caption_uk: 'Звіт про розрахункові суми оплати відпусток та компенсації за невикористані відпустки',
        caption_ru: 'Отчет о расчетных суммах оплаты отпусков и компенсации за неиспользованные отпуска',
        caption_az: 'İstifadə olunmamış məzuniyyətə görə məzuniyyət haqqlarının və kompensasiyaların  hesablaşma məbləğləri barədə hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-vacation',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 60
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_accrualReportBonus',
        isFolder: 0,
        caption: 'Звіт про сплату премій',
        caption_uk: 'Звіт про сплату премій',
        caption_ru: 'Отчет об уплате премий',
        caption_az: 'Mükafatların ödənilməsi barədə hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-bonus',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 70
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportControlCalcVacReserve',
        isFolder: 0,
        caption: 'Звіт контролю розрахунку резерву відпусток',
        caption_uk: 'Звіт контролю розрахунку резерву відпусток',
        caption_ru: 'Отчет контроля расчета резерва отпусков',
        caption_az: 'Məzuniyyət ehtiyatının hesablanmasına nəzarət hesabatı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-controlCalcVacReserve',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 75
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_accrualReportPaySickness',
        isFolder: 0,
        caption: 'Звіт про розрахункові суми оплати праці за хворобою',
        caption_uk: 'Звіт про розрахункові суми оплати праці за хворобою',
        caption_ru: 'Отчет о расчетных суммах оплаты труда по болезни',
        caption_az: 'Xəstəliyə görə əməyin odənilməsinin hesablaşma məbləğləri üzrə hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-sickness',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 80
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_accrualReportAliment',
        isFolder: 0,
        caption: 'Звіт про розрахунок аліментів, виконавчих листів та погашення забов\'язань',
        caption_uk: 'Звіт про розрахунок аліментів, виконавчих листів та погашення забов\'язань',
        caption_ru: 'Отчет о расчете алиментов, исполнительных листов и погашении обязательств',
        caption_az: 'Alimentlərin hesablanması, icra məktubları və öhdəliklərin ödənilməsi haqqında hesabat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-aliment',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 90
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportListDebtEmployees',
        isFolder: 0,
        caption: 'Список працівників, які мають заборгованість на кінець місяця',
        caption_uk: 'Список працівників, які мають заборгованість на кінець місяця',
        caption_ru: 'Список работников, имеющих задолженность на конец месяца',
        caption_az: 'Ayın sonunda borcları olan işçilərin siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-debtEmployees',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportListAppointDismissEmployees',
        isFolder: 0,
        caption: 'Список працівників, що були прийняті або звільнені у періоді',
        caption_uk: 'Список працівників, що були прийняті або звільнені у періоді',
        caption_ru: 'Список работников, принятых или уволенных в периоде',
        caption_az: 'Dövr ərzində işə qəbul edilmiş və ya işdən çıxarılan işçilərin siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-listAppointDismissEmp',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_accrualReportUnionPay',
        isFolder: 0,
        caption: 'Звіт про відрахування профспілкових внесків',
        caption_uk: 'Звіт про відрахування профспілкових внесків',
        caption_ru: 'Отчет об отчислении профсоюзных взносов',
        caption_az: 'Həmkarlar İttifaqı ödənişlərinin çıxılması haqqında hesabatı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-unionPay',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportIncome',
        isFolder: 0,
        caption: 'Довідка про доходи для субсидії',
        caption_uk: 'Довідка про доходи для субсидії',
        caption_ru: 'Справка о доходах для субсидии',
        caption_az: 'Subsidiya gəlirləri üçün arayış',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-income'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportIncomeTax',
        isFolder: 0,
        caption: 'Довідка про доходи для податкової',
        caption_uk: 'Довідка про доходи для податкової',
        caption_ru: 'Справка о доходах для налоговой',
        caption_az: 'Vergi gəlirləri üçün arayış',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-incomeTax'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 100
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportPayIndexSalary',
        isFolder: 0,
        caption: 'Довідка про розрахунок індексації заробітної плати',
        caption_uk: 'Довідка про розрахунок індексації заробітної плати',
        caption_ru: 'Справка о расчете индексации заработной платы',
        caption_az: 'Əmək haqqı indeksasiyasının hesablaşması üzrə  arayış',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-payIndexSalary',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 110
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportCredit',
        isFolder: 0,
        caption: 'Довідка про заробітну плату для отримання кредиту',
        caption_uk: 'Довідка про заробітну плату для отримання кредиту',
        caption_ru: 'Справка о заработной плате для получения кредита',
        caption_az: 'Kredit əldə olunması üçün əmək haqqı arayışı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-credit'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 120
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportEmbassyPayroll',
        isFolder: 0,
        caption: 'Довідка про заробітну плату для посольства',
        caption_uk: 'Довідка про заробітну плату для посольства',
        caption_ru: 'Справка о заработной плате для посольства',
        caption_az: 'Səfirliyə təqdim olunması üçün əmək haqqı arayışı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-payrollEmbassy'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 130
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportRequirePayroll',
        isFolder: 0,
        caption: 'Довідка про заробітну плату за місцем вимоги',
        caption_uk: 'Довідка про заробітну плату за місцем вимоги',
        caption_ru: 'Справка о заработной плате по месту требования',
        caption_az: 'Tələb olunan təyinat üzrə əmək haqqı arayışı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-payrollRequire'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 140
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportAvgSalary13',
        isFolder: 0,
        caption: 'Довідка про середню заробітну плату (для призначення допомоги) (Додаток 1 до Постанови № 13)',
        caption_uk: 'Довідка про середню заробітну плату (для призначення допомоги) (Додаток 1 до Постанови № 13)',
        caption_ru: 'Справка о средней заработной плате (для назначения помощи) (Приложение 1 к Постановлению № 13)',
        caption_az: 'Orta əmək haqqı haqqında arayış (yardım təyin edilməsi üçün)',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-avgSalary13'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 150
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportAvgSalaryMain',
        isFolder: 0,
        caption: 'Довідка про середню заробітну плату за основним місцем роботи',
        caption_uk: 'Довідка про середню заробітну плату за основним місцем роботи',
        caption_ru: 'Справка о средней заработной плате по основному месту работы',
        caption_az: 'İş yerinə görə orta əmək haqqı haqqında arayış',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-avgSalaryMain'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 160
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'hr_accrualReportAvgSalaryFSS',
        isFolder: 0,
        caption: 'Довідка для СС (безробіття)',
        caption_uk: 'Довідка для СС (безробіття)',
        caption_ru: 'Справка для СС (безработица)',
        caption_az: 'DSMF üçün arayış (işsizlik)',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-avgSalaryFSS'
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 170
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportRL',
        isFolder: 0,
        caption: 'Розрахунковий лист за період',
        caption_uk: 'Розрахунковий лист за період',
        caption_ru: 'Расчетный лист за период',
        caption_az: 'Dövr üzrə hesablaşma siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-rl',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 180
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportRLMonth',
        isFolder: 0,
        caption: 'Розрахунковий лист списком',
        caption_uk: 'Розрахунковий лист списком',
        caption_ru: 'Расчетный лист списком',
        caption_az: 'Əmək haqqı siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-rlMonth',
          reportOptions: {
            allowExportToExcel: false
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 190
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportRLMonthEdu',
        isFolder: 0,
        caption: 'Розрахунковий лист списком (Освіта)',
        caption_uk: 'Розрахунковий лист списком (Освіта)',
        caption_ru: 'Расчетный лист списком (Образование)',
        caption_az: 'Əmək haqqı siyahısı (Təhsil)',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-rlMonthEdu',
          reportOptions: {
            allowExportToExcel: false
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 190
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportRLEmail',
        isFolder: 0,
        caption: 'Розсилка розрахункових листів на email',
        caption_uk: 'Розсилка розрахункових листів на email',
        caption_ru: 'Рассылка расчетных листов на email',
        caption_az: 'Elektron poçt ünvanına daxil olun',
        cmdType: 'showForm',
        formCode: 'hr_accrual-rlMail',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 190
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportInfoCard',
        isFolder: 0,
        caption: 'Картка-довідка',
        caption_uk: 'Картка-довідка',
        caption_ru: 'Карточка-справка',
        caption_az: 'Kitabça-arayış',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-infoCard',
          reportOptions: {
            allowExportToExcel: false
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 200
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_empListTaxLimit',
        isFolder: 0,
        caption: 'Список працівників, які мають податкові соціальні пільги',
        caption_uk: 'Список працівників, які мають податкові соціальні пільги',
        caption_ru: 'Список работников, имеющих налоговые социальные льготы',
        caption_az: 'Sosial vergi imtiyazı olan əməkdaşların siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_empListTaxLimit',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_empListSickLimit',
        isFolder: 0,
        caption: 'Список працівників, які мають пільги з виплат у звязку з хворобою',
        caption_uk: 'Список працівників, які мають пільги з виплат у звязку з хворобою',
        caption_ru: 'Список работников, имеющих льготы по выплатам в связи с болезнью',
        caption_az: 'Xəstəliklə əlaqədar ödəniş imtiyazları olan əməkdaşların siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_empListSickLimit',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportConsolCateg',
        isFolder: 0,
        caption: 'Зведена відомість видів оплати по категоріям персоналу',
        caption_uk: 'Зведена відомість видів оплати по категоріям персоналу',
        caption_ru: 'Сводная ведомость видов оплаты по категориям персонала',
        caption_az: 'İşçi heyəti kateqoriyaları üzrə ödəniş növlərinin ümumiləşdirilmiş cədvəli',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-consolCateg',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 90
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportPaySummary',
        isFolder: 0,
        caption: 'Розрахункова відомість (довільна форма)',
        caption_uk: 'Розрахункова відомість (довільна форма)',
        caption_ru: 'Расчетная ведомость (произвольная форма)',
        caption_az: 'Hesablaşma cədvəli (ixtiyari forma)',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-paySummary',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 91
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportSickRegister',
        isFolder: 0,
        caption: 'Реєстр листів непрацездатності',
        caption_uk: 'Реєстр листів непрацездатності',
        caption_ru: 'Реестр больничных листов',
        caption_az: 'Xəstəlik vərəqələrinin reyesteri',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-sickRegister',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 92
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_reportControlCalcESV',
        isFolder: 0,
        caption: 'Контроль розрахунку ЄСВ',
        caption_uk: 'Контроль розрахунку ЄСВ',
        caption_ru: 'Контроль расчета ЕСВ',
        caption_az: 'SRS hesablanmasına nəzarət',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportControlCalcESV',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 93
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportTimeCost',
        isFolder: 0,
        caption: 'Список працівників з елементами обліку у табелі',
        caption_uk: 'Список працівників з елементами обліку у табелі',
        caption_ru: 'Список работников с элементами учета в табеле',
        caption_az: 'Cədvəldə uçot elementləri olan işçilərin siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-timeCost',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 94
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_consolidatedStatementDeductions',
        isFolder: 0,
        caption: 'Зведена відомість нарахувань та утримань (Організації та КПК)',
        caption_uk: 'Зведена відомість нарахувань та утримань (Організації та КПК)',
        caption_ru: 'Сведенная ведомость начислений и удержани(Организании и КПК)',
        caption_az: 'Ödənişlərin və tutulmaların xülasə siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_consolidatedStatementDeductions',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 95
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_consolidatedStatementDictProgClass',
        isFolder: 0,
        caption: 'Зведена відомість нарахувань та утримань (КПК)',
        caption_uk: 'Зведена відомість нарахувань та утримань (КПК)',
        caption_ru: 'Сведенная ведомость начислений и удержани(КПК)',
        caption_az: 'Ödənişlərin və tutulmaların xülasə siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_consolidatedStatementDictProgClass',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 96
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'saSalary_consolidatedStatementDepartment',
        isFolder: 0,
        caption: 'Зведена відомість нарахувань та утримань (Підрозділи)',
        caption_uk: 'Зведена відомість нарахувань та утримань (Підрозділи)',
        caption_ru: 'Сведенная ведомость начислений и удержани(Подразделения)',
        caption_az: 'Ödənişlərin və tutulmaların xülasə siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_consolidatedStatementDepartment',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 97
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportGeneralRegistry',
        isFolder: 0,
        caption: 'Загальний реєстр нараховано/утримано',
        caption_uk: 'Загальний реєстр нараховано/утримано',
        caption_ru: 'Общий реестр начисленно/удержанно',
        caption_az: 'Ümumi reyestr tutuldu/tutuldu',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-generalRegistry',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 98
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReport1NC',
        isFolder: 0,
        caption: 'Звіт 1-НС',
        caption_uk: 'Звіт 1-НС',
        caption_ru: 'Отчет 1-НС',
        caption_az: 'Звіт 1-НС',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-1NC',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 99
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportGroupReport',
        isFolder: 0,
        caption: 'Протокол групи звітів',
        caption_uk: 'Протокол групи звітів',
        caption_ru: 'Протокол группы отчетов',
        caption_az: 'Qrup protokollarını bildirin',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-groupReport',
          reportOptions: {
            allowExportToExcel: false
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 99
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_accrualReportCostItems',
        isFolder: 0,
        caption: 'Зведена вiдомiсть по статтях затрат',
        caption_uk: 'Зведена вiдомiсть по статтях затрат',
        caption_ru: 'Сводная ведомость по статьям затрат',
        caption_az: 'Xərc maddələri üzrə ümumiləşdirilmiş məlumat',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-costItems',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 101
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_allReportSalaryCfg',
        code: 'accSalary_employeeAccrualList',
        isFolder: 0,
        caption: 'Список працівників по записах у постійних нарахуваннях/утриманнях',
        caption_uk: 'Список працівників по записах у постійних нарахуваннях/утриманнях',
        caption_ru: 'Список работников по записям в постоянных начислениях/удержаниях',
        caption_az: 'Daimi hesablamalar/xidmətlər üzrə qeydlərə əsasən işçilərin siyahısı',
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        cmdData: {
          reportCode: 'hr_accrual-employeeAccrualList',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 102
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_regReportSalaryParamsCfg',
    isFolder: 1,
    caption: '-',
    caption_uk: '-',
    caption_ru: '-',
    caption_az: '-',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryParamsCfg',
        code: 'hr_salaryReportList',
        isFolder: 0,
        caption: 'Усі звіти ...',
        caption_uk: 'Усі звіти ...',
        caption_ru: 'Все отчеты ...',
        caption_az: 'Bütün hesabatlar ...',
        cmdType: 'showForm',
        formCode: 'hr_salaryReportsList',
        inWindow: 1,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4000
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'hr_regReportSalaryParamsCfg',
        code: 'hr_dictRepSalary',
        isFolder: 0,
        caption: 'Параметри звітів ...',
        caption_uk: 'Параметри звітів ...',
        caption_ru: 'Параметры отчетов ...',
        caption_az: 'Hesabat parametrləri ...',
        cmdCode: {
          cmdType: 'showList',
          cmdData: {
            params: [{
              entity: 'ac_dictRep',
              method: 'select',
              fieldList: [
                { name: 'name' },
                { name: 'codeName' },
                { name: 'fullCode' },
                { name: 'isOrigin' },
                { name: 'autoUpdateSettingCalc' },
                { name: 'description', visibility: false },
                { name: 'isFolder', visibility: false }
              ],
              whereList: {
                isFolder: {
                  expression: '[isFolder]',
                  condition: 'equal',
                  values: { isFolder: 0 }
                },
                code: {
                  expression: '[fullCode]',
                  condition: 'in',
                  values: {
                    fullCode: [
                      'J05001',
                      'J30004', 'J30401', 'J30402', 'J30403', 'J30404', 'J30405', 'J30406', 'J30407', 'J30408', 'J30409',
                      'S03010', 'S03011',
                      'S03030', 'S03007',
                      'C11001', 'C11101', 'C11102', 'C11103', 'C11104', 'C11105',
                      'C11002'
                    ]
                  }
                }
              }
            }]
          },
          cmpInitConfig: {
            hideActions: ['showDetail', 'addNewByCurrent']
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4010
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchEmployee',
    isFolder: 0,
    caption: 'Пошук працівників',
    caption_uk: 'Пошук працівників',
    caption_ru: 'Поиск работников',
    caption_az: 'Əməkdaş axtarışı',
    cmdType: 'showForm',
    formCode: 'hr_searchEmployee',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchPerson',
    isFolder: 0,
    caption: 'Пошук осіб',
    caption_uk: 'Пошук осіб',
    caption_ru: 'Поиск физических лиц',
    caption_az: 'Şəxslərin axtarışı',
    cmdType: 'showForm',
    formCode: 'hr_searchPerson',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchPosition',
    isFolder: 0,
    caption: 'Пошук посад',
    caption_uk: 'Пошук посад',
    caption_ru: 'Поиск по должности',
    caption_az: 'Vəzifəyə görə axtarış',
    cmdType: 'showForm',
    formCode: 'hr_searchPosition',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchEmployeeSalary',
    isFolder: 0,
    caption: 'Пошук працівників',
    caption_uk: 'Пошук працівників',
    caption_ru: 'Поиск работников',
    caption_az: 'Əməkdaş axtarışı',
    cmdType: 'showForm',
    formCode: 'hr_searchEmployeeSalary',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchPersonTemplates',
    isFolder: 0,
    caption: 'Шаблони для пошуку осіб',
    caption_uk: 'Шаблони для пошуку осіб',
    caption_ru: 'Шаблоны для поиска физических лиц',
    caption_az: 'Şəxslərin axtarışı üçün şablonlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_searchTemplate',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'description_text' },
          { name: 'isGlobal' },
          { name: 'userName' }
        ],
        whereList: {
          searchEntity: {
            expression: '[searchEntity]',
            condition: 'equal',
            value: 'hr_searchPerson'
          }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchPositionTemplates',
    isFolder: 0,
    caption: 'Шаблони для пошуку посад',
    caption_uk: 'Шаблони для пошуку посад',
    caption_ru: 'Шаблоны для поиска по должности',
    caption_az: 'Vəzifə üzrə axtarış üçün şablonlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_searchTemplate',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'description_text' },
          { name: 'isGlobal' },
          { name: 'userName' }
        ],
        whereList: {
          searchEntity: {
            expression: '[searchEntity]',
            condition: 'equal',
            value: 'hr_position'
          }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_searchEmployeeTemplates',
    isFolder: 0,
    caption: 'Шаблони для пошуку працівників',
    caption_uk: 'Шаблони для пошуку працівників',
    caption_ru: 'Шаблоны для поиска работников',
    caption_az: 'Əməkdaş axtarışı üçün şablonlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_searchTemplate',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'description_text' },
          { name: 'isGlobal' },
          { name: 'userName' }
        ],
        whereList: {
          searchEntity: {
            expression: '[searchEntity]',
            condition: 'equal',
            value: 'hr_employee'
          }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_positionReport',
    isFolder: 0,
    caption: 'Вибірки за посадами',
    caption_uk: 'Вибірки за посадами',
    caption_ru: 'Выборки по должностям',
    caption_az: 'Vəzifələrə görə nümunələr',
    cmdType: 'showForm',
    formCode: 'hr_positionReport',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-search',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMilitaryRank',
    isFolder: 0,
    caption: 'Військові звання',
    caption_uk: 'Військові звання',
    caption_ru: 'Воинские звания',
    caption_az: 'Hərbi rütbələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMilitaryRank',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'type' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMilitarySpeciality',
    isFolder: 0,
    caption: 'Військово-облікові спеціальності',
    caption_uk: 'Військово-облікові спеціальності',
    caption_ru: 'Военно-учетные специальности',
    caption_az: 'Hərbi uçot ixtisasları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMilitarySpeciality',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMilitarySuitable',
    isFolder: 0,
    caption: 'Придатність до військової служби',
    caption_uk: 'Придатність до військової служби',
    caption_ru: 'Категории годности к военной службе',
    caption_az: 'Hərbi xidmətə yararlılıq dərəcəsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMilitarySuitable',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMilitaryProfile',
    isFolder: 0,
    caption: 'Профілі підготовки офіцерів запасу',
    caption_uk: 'Профілі підготовки офіцерів запасу',
    caption_ru: 'Профили подготовки офицеров запаса',
    caption_az: 'Ehtiyatda olan zabitlərin hazırlıq istiqamətləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMilitaryProfile',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMilitaryGroup',
    isFolder: 0,
    caption: 'Групи обліку військовозобов\'язаних',
    caption_uk: 'Групи обліку військовозобов\'язаних',
    caption_ru: 'Группы учета военнообязанных',
    caption_az: 'Hərbi mükəlləfiyətlilərin uçot qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMilitaryGroup',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMilitaryDuty',
    isFolder: 0,
    caption: 'Військова служба',
    caption_uk: 'Військова служба',
    caption_ru: 'Военная служба',
    caption_az: 'Hərbi xidmət',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMilitaryDuty',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'orderTitle' },
          { name: 'orderText' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTypeTaxECB',
    isFolder: 0,
    caption: 'Ставки ЄСВ',
    caption_uk: 'Ставки ЄСВ',
    caption_ru: 'Ставки ЕСВ',
    caption_az: 'Birdəfəlik sosial müavinət dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTypeTaxECB',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}`, tooltip: 'Код' },
          { name: 'name', description: `{{UB.i18n('Назва')}}`, tooltip: 'Назва' }
        ]
      }]
    },
    cmpInitConfig: {
      hideActions: ['addNewByCurrent'],
      listeners: {
        render: grid => {
          grid.menu.add([
            {
              text: `{{UB.i18n('Копіювати')}}`,
              disabled: !AC.entityUtils.verifyRightsMethod('hr_dictTypeTaxECB', 'addnew'),
              handler: function () {
                let record = AC.gridUtils.getCurrentRecord(grid)
                if (!record) {
                  AC.viewUtils.showToast('Помилка', 'Не вибрано запис')
                  return
                }
                const payElID = record.get('ID')
                $App.connection.run({
                  entity: 'hr_dictTypeTaxECB',
                  method: 'copyRecord',
                  ID: payElID
                }).then((mParams) => {
                  grid.onRefresh()
                  $App.doCommand({
                    cmdType: 'showForm',
                    entity: 'hr_dictTypeTaxECB',
                    formCode: 'hr_dictTypeTaxECB',
                    instanceID: mParams.newID,
                    tabId: 'hr_dictTypeTaxECB_copyRecord' + Date.now(),
                    target: $App.getViewport().centralPanel,
                    cmpInitConfig: {
                      method: 'copyRecord',
                      sourceGrid: grid
                    }
                  })
                })
              }
            }
          ])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCategoryECB',
    isFolder: 0,
    caption: 'Категорії застрахованих осіб',
    caption_uk: 'Категорії застрахованих осіб',
    caption_ru: 'Категории застрахованных лиц',
    caption_az: 'Sığortalıların kateqoriyaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCategoryECB',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}`, tooltip: 'Код' },
          { name: 'name', description: `{{UB.i18n('Назва')}}`, tooltip: 'Назва' },
          { name: 'dictTypeTaxECBID.name', description: `{{UB.i18n('Ставка ЄСВ')}}`, tooltip: 'Ставка ЄСВ' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCompetency',
    isFolder: 0,
    caption: 'Компетенції',
    caption_uk: 'Компетенції',
    caption_ru: 'Компетенции',
    caption_az: 'Bacarıqlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCompetency',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'psCategory', config: { align: 'center' } }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTaskScore',
    isFolder: 0,
    caption: 'Бали за завдання',
    caption_uk: 'Бали за завдання',
    caption_ru: 'Баллы за задание',
    caption_az: 'Tapşırıq üçün qiymətlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTaskScore',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'description' },
          { name: 'score', config: { align: 'center' } }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCheckMedical',
    isFolder: 0,
    caption: 'Тип медогляду',
    caption_uk: 'Тип медогляду',
    caption_ru: 'Тип медосмотра',
    caption_az: 'Tibbi müayinənin növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCheckMedical',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictResultMedical',
    isFolder: 0,
    caption: 'Результати медогляду',
    caption_uk: 'Результати медогляду',
    caption_ru: 'Результаты медосмотра',
    caption_az: 'Tibbi müayinənin nəticələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictResultMedical',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictNameCase',
    isFolder: 0,
    caption: 'Налаштування відмінків',
    caption_uk: 'Налаштування відмінків',
    caption_ru: 'Настройка падежей',
    caption_az: 'Halların tənzimləmələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_namecase',
        method: 'select',
        fieldList: [
          { name: 'sexType' },
          { name: 'namePart' },
          { name: 'suff' },
          { name: 'gen' },
          { name: 'dat' },
          { name: 'acc' },
          { name: 'ins' },
          { name: 'loc' },
          { name: 'voc' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTask',
    isFolder: 0,
    caption: 'Завдання наказів',
    caption_uk: 'Завдання наказів',
    caption_ru: 'Задание приказов',
    caption_az: 'Əmrlərin tapşırıqları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTask',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'task' },
          { name: 'empOrderType' },
          { name: 'isCommon' },
          { name: 'isActive' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEmpOrderText',
    isFolder: 0,
    caption: 'Заголовки та Преамбули',
    caption_uk: 'Заголовки та Преамбули',
    caption_ru: 'Заголовки и преамбулы',
    caption_az: 'Başlıqlar və preambulalar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEmpOrderText',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'titleOrder' },
          { name: 'empOrderType' },
          { name: 'preamble' },
          { name: 'comment' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEmpOrderIndex',
    isFolder: 0,
    caption: 'Індекси номерів наказів',
    caption_uk: 'Індекси номерів наказів',
    caption_ru: 'Индексы номеров приказов',
    caption_az: 'Əmrlərin indeks nömrələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEmpOrderIndex',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'empOrderType' },
          { name: 'isActive' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRestDaySchedule',
    isFolder: 0,
    caption: 'Розпорядок роботи у вихідні/святкові дні',
    caption_uk: 'Розпорядок роботи у вихідні/святкові дні',
    caption_ru: 'Розпорядок роботи у вихідні/святкові дні',
    caption_az: 'Розпорядок роботи у вихідні/святкові дні',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRestDaySchedule',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictOrderDetReason',
    isFolder: 0,
    caption: 'Підстави наказів',
    caption_uk: 'Підстави наказів',
    caption_ru: 'Основания приказов',
    caption_az: 'Əmrlərin əsasları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictOrderDetReason',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'empOrderType' },
          { name: 'reason' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictOrderDetReasonDoc',
    isFolder: 0,
    caption: 'Підстави-документи наказів',
    caption_uk: 'Підстави-документи наказів',
    caption_ru: 'Документы-основания приказов',
    caption_az: 'Əmrlərin əsasları sənədləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictOrderDetReasonDoc',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'empOrderType' },
          { name: 'reason' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictActingReason',
    isFolder: 0,
    caption: 'Причини виконання обов\'язків',
    caption_uk: 'Причини виконання обов\'язків',
    caption_ru: 'Причины выполнения обязанностей',
    caption_az: 'Vəzifə öhdəliklərinin yerinə yetirmə səbəbləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictActingReason',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'description' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_request',
    isFolder: 0,
    caption: 'Заяви (всі)',
    caption_uk: 'Заяви (всі)',
    caption_ru: 'Заявления (все)',
    caption_az: 'Ərizələr (hamısı)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_request',
        method: 'select',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
          { name: 'requestType' },
          { name: 'requestNumber' },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'requestDescription' },
          { name: 'requestReason' },
          { name: 'lastName' },
          { name: 'firstName' },
          { name: 'middleName' },
          { name: 'vacationKindID.name', description: `{{UB.i18n('Вид відпустки')}}` },
          { name: 'dateFrom' },
          { name: 'dateTo' },
          { name: 'dayCount' },
          { name: 'dictRequestKindID.name', description: `{{UB.i18n('Вид заяви')}}` },
          { name: 'reasonDocument' },
          { name: 'requestState' },
          { name: 'comment' },
          { name: 'orderID.description', description: `{{UB.i18n('Наказ')}}`, simpleFilter: true },
          { name: 'requestResponse' }
        ],
        whereList: {
          orgState: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          orgDateTo: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgDeleteDate: {
            expression: '[organizationID.mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          }
        }
      }]
    },
    cmpInitConfig: {
      hideActions: ['showDetail', 'addNew', 'addNewByCurrent', 'del'],
      getRowClass: function (row) {
        return row.get('requestState') === 'COMPLITED' ? 'ub-row-green'
          : row.get('requestState') === 'SENDED' ? 'ub-row-yellow'
            : row.get('requestState') === 'REJECTED' ? 'ub-row-red'
              : row.get('requestState') === 'AGREED' ? 'ub-row-blue' : 'ub-row-lightgrey'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_request_local',
    isFolder: 0,
    caption: 'Заяви за організацією',
    caption_uk: 'Заяви за організацією',
    caption_ru: 'Заявления по организации',
    caption_az: 'Təşkilat üzrə ərizələr',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_request',
        method: 'select',
        fieldList: [
          { name: 'requestNumber' },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'requestType' },
          { name: 'vacationKindID.name', description: `{{UB.i18n('Вид відпустки')}}` },
          { name: 'dateFrom' },
          { name: 'dateTo' },
          { name: 'dayCount' },
          { name: 'dictRequestKindID.name', description: `{{UB.i18n('Вид заяви')}}` },
          { name: 'requestDescription' },
          { name: 'requestReason' },
          { name: 'reasonDocument' },
          { name: 'requestState' },
          { name: 'comment' },
          { name: 'orderID.description', description: `{{UB.i18n('Наказ')}}`, simpleFilter: true },
          { name: 'requestResponse' }
        ],
        whereList: {
          requestState: {
            expression: '[requestState]',
            condition: 'notEqual',
            value: 'NEW'
          }
        },
        orderList: {
          orderBy: { expression: 'requestDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNew', 'addNewByCurrent', 'del'],
      getRowClass: function (row) {
        return row.get('requestState') === 'COMPLITED' ? 'ub-row-green'
          : row.get('requestState') === 'SENDED' ? 'ub-row-yellow'
            : row.get('requestState') === 'REJECTED' ? 'ub-row-red'
              : row.get('requestState') === 'AGREED' ? 'ub-row-blue' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_request_sended',
    isFolder: 0,
    caption: 'Заяви (на попередню обробку)',
    caption_uk: 'Заяви (на попередню обробку)',
    caption_ru: 'Заявления (на предварительную обработку)',
    caption_az: 'Ərizələr (ilkin işləmə üçün)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_request',
        method: 'select',
        fieldList: [
          { name: 'requestNumber' },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'requestType' },
          { name: 'vacationKindID.name', description: `{{UB.i18n('Вид відпустки')}}` },
          { name: 'dateFrom' },
          { name: 'dateTo' },
          { name: 'dayCount' },
          { name: 'dictRequestKindID.name', description: `{{UB.i18n('Вид заяви')}}` },
          { name: 'requestDescription' },
          { name: 'requestReason' },
          { name: 'reasonDocument' },
          { name: 'requestState' },
          { name: 'comment' },
          { name: 'orderID.description', description: `{{UB.i18n('Наказ')}}`, simpleFilter: true },
          { name: 'requestResponse' }
        ],
        whereList: {
          requestState: {
            expression: '[requestState]',
            condition: 'equal',
            value: 'SENDED'
          }
        },
        orderList: {
          orderBy: { expression: 'requestDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNew', 'addNewByCurrent', 'del'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      getRowClass: function (row) {
        return row.get('requestState') === 'COMPLITED' ? 'ub-row-green'
          : row.get('requestState') === 'SENDED' ? 'ub-row-yellow'
            : row.get('requestState') === 'REJECTED' ? 'ub-row-red'
              : row.get('requestState') === 'AGREED' ? 'ub-row-blue' : 'ub-row-lightgrey'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_request_agreed',
    isFolder: 0,
    caption: 'Заяви (на опрацювання)',
    caption_uk: 'Заяви (на опрацювання)',
    caption_ru: 'Заявления (на обработку)',
    caption_az: 'Ərizələr (işləmə üçün)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_request',
        method: 'select',
        fieldList: [
          { name: 'requestNumber' },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'requestType' },
          { name: 'vacationKindID.name', description: `{{UB.i18n('Вид відпустки')}}` },
          { name: 'dateFrom' },
          { name: 'dateTo' },
          { name: 'dayCount' },
          { name: 'dictRequestKindID.name', description: `{{UB.i18n('Вид заяви')}}` },
          { name: 'requestDescription' },
          { name: 'requestReason' },
          { name: 'reasonDocument' },
          { name: 'requestState' },
          { name: 'comment' },
          { name: 'orderID.description', description: `{{UB.i18n('Наказ')}}`, simpleFilter: true },
          { name: 'requestResponse' }
        ],
        whereList: {
          requestState: {
            expression: '[requestState]',
            condition: 'equal',
            value: 'AGREED'
          }
        },
        orderList: {
          orderBy: { expression: 'requestDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNew', 'addNewByCurrent', 'del'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      getRowClass: function (row) {
        return row.get('requestState') === 'COMPLITED' ? 'ub-row-green'
          : row.get('requestState') === 'SENDED' ? 'ub-row-yellow'
            : row.get('requestState') === 'REJECTED' ? 'ub-row-red'
              : row.get('requestState') === 'AGREED' ? 'ub-row-blue' : 'ub-row-lightgrey'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_employeeTaskDt',
    isFolder: 0,
    caption: 'Реєстр завдань',
    caption_uk: 'Реєстр завдань',
    caption_ru: 'Реестр задач',
    caption_az: 'Tapşırıqların reyestri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_employeeTaskDt',
        method: 'select',
        fieldList: [
          { name: 'employeeTaskID.taskDate', description: `{{UB.i18n('Дата завдання')}}`, simpleFilter: true },
          { name: 'employeeTaskID.dateTo', description: `{{UB.i18n('Дата закінчення')}}`, simpleFilter: true },
          { name: 'employeeTaskID.dateFrom', description: `{{UB.i18n('Дата початку')}}`, simpleFilter: true },
          { name: 'employeeTaskID.taskDescription', description: `{{UB.i18n('Зміст завдання')}}`, simpleFilter: true },
          { name: 'commentDt', description: `{{UB.i18n('Коментар')}}` },
          { name: 'employeeTaskID.taskNumber', description: `{{UB.i18n('Номер завдання')}}`, simpleFilter: true },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
          { name: 'answer', description: `{{UB.i18n('Результат')}}` },
          { name: 'taskDtState', description: `{{UB.i18n('Стан виконання')}}` },
          { name: 'employeeTaskID.taskType', description: `{{UB.i18n('Тип завдання')}}` },
          { name: 'employeeTaskID', visibility: false }
        ],
        whereList: {
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          }
        },
        orderList: {
          orderBy: { expression: 'employeeTaskID.taskDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNewByCurrent'],
      getRowClass: function (row) {
        switch (row.get('taskDtState')) {
          case 'NEW':
            return 'ub-row-red'
          case 'SENDED':
            return 'ub-row-yellow'
          case 'COMPLITED':
            return 'ub-row-green'
          default:
            return 'ub-row-lightgrey'
        }
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'employeeTaskID.organizationID')
      },
      onDeterminateForm: function (grid) {
        if (grid.isNewInstance) {
          delete grid.isNewInstance
        }
        const reco = AC.gridUtils.getCurrentRecord(grid)
        return {
          entityName: 'hr_employeeTask',
          formCode: 'hr_employeeTask',
          instanceID: reco ? reco.get('employeeTaskID') : null
        }
      },
      onAddNew: function () {
        this.isNewInstance = true
        $App.doCommand({
          cmdType: 'showForm',
          entity: 'hr_employeeTask',
          target: $App.getViewport().centralPanel,
          tabId: 'hr_employeeTask' + Date.now(),
          sender: this
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRejected',
    isFolder: 0,
    caption: 'Відхилені накази',
    caption_uk: 'Відхилені накази',
    caption_ru: 'Отклоненные приказы',
    caption_az: 'Ləğv edilmiş əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`,
            visibility: false
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              empOrderType: 'RETURNED_FROM_RECONCILATION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Відхилені накази'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderRejectedMy',
    isFolder: 0,
    caption: 'Відхилені накази (мої)',
    caption_uk: 'Відхилені накази (мої)',
    caption_ru: 'Отклоненные приказы (мои)',
    caption_az: 'Ləğv edilmiş əmrlər (mənim)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`,
            visibility: false
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              empOrderType: 'RETURNED_FROM_RECONCILATION'
            }
          },
          my: {
            expression: '[mi_createUser]',
            condition: 'equal',
            values: {
              my: '#currentUserID'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Відхилені накази (мої)'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderOnCompletion',
    isFolder: 0,
    caption: 'Накази на доопрацюванні',
    caption_uk: 'Накази на доопрацюванні',
    caption_ru: 'Приказы на доработке',
    caption_az: 'Tamamlanma üçün əmrlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`,
            visibility: false
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              state: 'ON_COMPLETION'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази на доопрацюванні'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderOnCompletionMy',
    isFolder: 0,
    caption: 'Накази на доопрацюванні (мої)',
    caption_uk: 'Накази на доопрацюванні (мої)',
    caption_ru: 'Приказы на доработке (мои)',
    caption_az: 'Tamamlanma üçün əmrlər (mənim)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrder',
        method: 'select',
        fieldList: [
          { name: 'empOrderType' },
          { name: 'orderNumberFullView' },
          { name: 'orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
          { name: 'titleOrder', description: `{{UB.i18n('Заголовок')}}` },
          { name: 'employeeList', description: `{{UB.i18n('Список осіб')}}` },
          {
            name: 'orderState',
            description: `{{UB.i18n('Стан')}}`,
            visibility: false
          },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` },
          { name: 'description', visibility: false },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення')}}` },
          { name: 'mOrganizationName' },
          { name: 'organizationName' },
          { name: 'respEmployeePositionID.description', description: `{{UB.i18n('Підписав')}}` },

          { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Відповідальний')}}` }
        ],
        whereList: {
          state: {
            expression: '[orderState]',
            condition: 'equal',
            values: {
              state: 'ON_COMPLETION'
            }
          },
          my: {
            expression: '[mi_createUser]',
            condition: 'equal',
            values: {
              my: '#currentUserID'
            }
          }
        },
        orderList: {
          orderBy: { expression: 'orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Накази на доопрацюванні (мої)'))
        }
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, ['organizationID', 'masterOrganizationID'])
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_taskMy',
    isFolder: 0,
    caption: 'Мої завдання',
    caption_uk: 'Мої завдання',
    caption_ru: 'Мои задания',
    caption_az: 'Mənim tapşırıqlarım',
    cmdType: 'showForm',
    formCode: 'hr_taskList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_taskMyAllEntities',
    isFolder: 0,
    caption: 'Мої завдання',
    caption_uk: 'Мої завдання',
    caption_ru: 'Мои задания',
    caption_az: 'Mənim tapşırıqlarım',
    cmdType: 'showForm',
    formCode: 'hr_taskList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_taskMyComplete',
    isFolder: 0,
    caption: 'Виконаня задачі',
    caption_uk: 'Виконаня задачі',
    caption_ru: 'Выполненные задания',
    caption_az: 'İcra olumuş tapşırıqlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_task',
        method: 'select',
        fieldList: [
          { name: 'participantID.recStageID.stageKind', description: `{{UB.i18n('Тип')}}` },
          { name: 'docID.description', description: `{{UB.i18n('Наказ')}}` },
          { name: 'docID.orderDate', description: `{{UB.i18n('Дата наказу')}}` },
          { name: 'docID.orderNumber', description: `{{UB.i18n('Номер наказу')}}` },
          { name: 'docID.mOrganizationName', description: `{{UB.i18n('Видано в')}}` },
          { name: 'docID.organizationName', description: `{{UB.i18n('По організації')}}` },
          { name: 'executionDate', description: `{{UB.i18n('Дата виконнання')}}` },
          { name: 'resolutionText', description: `{{UB.i18n('Зміст резолюції')}}` }
        ],
        whereList: {
          state: {
            expression: '[mi_wfState]',
            condition: 'equal',
            values: {
              empOrderType: 'CLOSED'
            }
          },
          entityClass: {
            expression: '[docID.orderClass.entityName]',
            condition: 'in',
            value: ['hr_empOrder', 'hr_staffTable']
          },
          employeePositionID: {
            expression: '[employeePositionID.employeeNumberID]',
            condition: 'in',
            value: [0]
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      forceDataLoad: true,
      afterInit: function () {
        const me = this
        const employeeNumberID = $App.connection.userData().employeeNumberID
        UB.Repository('hr_empOrderActingDet')
          .attrs('paraID.positionID.mi_data_id')
          .where('employeeNumberID', '=', employeeNumberID || 0)
          .where('orderID.orderState', '=', 'POSTED')
          .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .selectAsObject()
          .then(positions => {
            const pos = positions ? positions.map(p => p['paraID.positionID.mi_data_id']) : [0]
            return Promise.all([
              UB.Repository('hr_dictTempExecution')
                .attrs('employeePositionTempID.employeeNumberID')
                .where('employeePositionID.employeeNumberID', '=', employeeNumberID || 0)
                .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
                .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
                .where('employeePositionTempID.employeeNumberID', 'isNotNull')
                .selectAsObject(),
              UB.Repository('hr_employeePositionS')
                .attrs('employeeNumberID')
                .where('positionID', 'in', pos)
                .selectAsObject()
            ])
          })
          .then(([dictTempExecution, p2]) => {
            const dictTempExecutionIds = dictTempExecution ? dictTempExecution.map(i => i['employeePositionTempID.employeeNumberID'] || 0) : 0
            const employeePositionIDs = p2 ? p2.map(i => i['employeeNumberID'] || 0) : 0
            me.getStore().ubRequest.whereList
              .employeePositionID = {
                expression: '[employeePositionID.employeeNumberID]',
                condition: 'in',
                value: [employeeNumberID || 0, ...dictTempExecutionIds, ...employeePositionIDs]
              }
            me.getStore().load()
          })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_taskMyCompleteAllEntities',
    isFolder: 0,
    caption: 'Виконані завдання (мої)',
    caption_uk: 'Виконані завдання (мої)',
    caption_ru: 'Выполненные задания (мои)',
    caption_az: 'İcra olumuş tapşırıqlar (mənim)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_task',
        method: 'select',
        fieldList: [
          { name: 'participantID.recStageID.stageKind', description: `{{UB.i18n('Тип')}}` },
          { name: 'docID.description', description: `{{UB.i18n('Документ')}}` },
          { name: 'docID.orderDate', description: `{{UB.i18n('Дата документа')}}` },
          { name: 'docID.empOrderID.mi_createDate', description: `{{UB.i18n('Дата створення документа')}}` },
          { name: 'mi_createDate', description: `{{UB.i18n('Дата створення задачі')}}` },
          { name: 'docID.orderNumber', description: `{{UB.i18n('Номер документа')}}` },
          { name: 'executionDate', description: `{{UB.i18n('Дата виконнання задачі')}}` },
          { name: 'resolutionText', description: `{{UB.i18n('Зміст резолюції')}}` }
        ],
        whereList: {
          state: {
            expression: '[mi_wfState]',
            condition: 'equal',
            values: {
              empOrderType: 'CLOSED'
            }
          },
          employeePositionID: {
            expression: '[employeePositionID.employeeNumberID]',
            condition: 'in',
            value: [0]
          }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      forceDataLoad: true,
      afterInit: function () {
        const me = this
        const employeeNumberID = $App.connection.userData().employeeNumberID
        UB.Repository('hr_empOrderActingDet')
          .attrs('paraID.positionID.mi_data_id')
          .where('employeeNumberID', '=', employeeNumberID || 0)
          .where('orderID.orderState', '=', 'POSTED')
          .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
          .selectAsObject()
          .then(positions => {
            const pos = positions ? positions.map(p => p['paraID.positionID.mi_data_id']) : 0
            return Promise.all([
              UB.Repository('hr_dictTempExecution')
                .attrs('employeePositionTempID.employeeNumberID')
                .where('employeePositionID.employeeNumberID', '=', employeeNumberID || 0)
                .where('dateFrom', '<=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
                .where('dateTo', '>=', AC.dateService.shiftDate(appAC.globalApplicationDate()))
                .where('employeePositionTempID.employeeNumberID', 'isNotNull')
                .selectAsObject(),
              UB.Repository('hr_employeePositionS')
                .attrs('employeeNumberID')
                .where('positionID', 'in', pos)
                .selectAsObject()
            ])
          })
          .then(([dictTempExecution, p2]) => {
            const dictTempExecutionIds = dictTempExecution ? dictTempExecution.map(i => i['employeePositionTempID.employeeNumberID'] || 0) : 0
            const employeePositionIDs = p2 ? p2.map(i => i['employeeNumberID'] || 0) : 0
            me.getStore().ubRequest.whereList
              .employeePositionID = {
                expression: '[employeePositionID.employeeNumberID]',
                condition: 'in',
                value: [employeeNumberID || 0, ...dictTempExecutionIds, ...employeePositionIDs]
              }
            me.getStore().load()
          })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empOrderVacationApSchedA',
    isFolder: 0,
    caption: 'Затвердження графіку відпусток',
    caption_uk: 'Затвердження графіку відпусток',
    caption_ru: 'Утверждение графика отпусков',
    caption_az: 'Məzuniyyət qrafikinin təsdiqlənməsi',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empOrderVacationapschedDet',
          method: 'select',
          fieldList: [
            { name: 'orderID.orderNumberFullView', description: `{{UB.i18n('Наказ з індексом')}}` },
            { name: 'orderID.orderDate', description: `{{UB.i18n('Дата наказу')}}`, format: 'd.m.Y' },
            { name: 'year', description: `{{UB.i18n('Рік')}}`, config: { align: 'center' }, format: '0' },
            { name: 'positionCategory', description: `{{UB.i18n('Категорія посади')}}` },
            {
              name: 'orderID.orderState',
              description: `{{UB.i18n('Стан')}}`
            },
            { name: 'isCorr', description: `{{UB.i18n('Корегування')}}`, config: { align: 'center' } },
            { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
            { name: 'orderID', visibility: false }
          ],
          whereList: {
            orderType: {
              expression: '[empOrderType]',
              condition: 'equal',
              values: {
                empOrderType: 'VACATIONAPSCHED'
              }
            },
            order_deleteDate: {
              expression: '[orderID.mi_deleteDate]',
              condition: 'equal',
              value: '#maxdate'
            },
            orgState: {
              expression: '[organizationID.state]',
              condition: 'equal',
              value: 'ACTIVE'
            },
            orgDateTo: {
              expression: '[organizationID.mi_dateTo]',
              condition: 'equal',
              value: '#maxdate'
            },
            orgDeleteDate: {
              expression: '[organizationID.mi_deleteDate]',
              condition: 'equal',
              value: '#maxdate'
            }
          },
          orderList: {
            orderBy: { expression: 'orderID.orderDate', order: 'desc' }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['showDetail', 'addNew', 'addNewByCurrent'],
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderID.orderState'))
      },
      afterInit: function () {
        const grid = this
        AC.gridUtils.setGlobalOrganization(grid, 'organizationID')

        const whereList = grid.getStore().ubRequest.whereList
        const curDate = new Date(appAC.globalApplicationDate())
        whereList.org_dateFrom = {
          expression: '[organizationID.mi_dateFrom]',
          condition: '<=',
          value: curDate
        }
        whereList.org_dateTo = {
          expression: '[organizationID.mi_dateTo]',
          condition: '>=',
          value: curDate
        }
      },
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Затвердження графіку відпусток'))
        }
      },
      onDeterminateForm: function (grid) {
        const reco = AC.gridUtils.getCurrentRecord(grid)
        const instanceID = (!grid.isNewForm && reco && reco.get('orderID')) || null
        grid.isNewForm = false
        return {
          entityName: 'hr_empOrder',
          formCode: 'hr_empOrder',
          instanceID: instanceID,
          cmpInitConfig: {
            checkDetailOnClose: true,
            forceRefreshSenderGrid: true,
            onDetailChangedRefreshSenderGrid: true,
            sender: grid
          }
        }
      },
      customActions: [
        {
          text: `{{UB.i18n('Додати')}}`,
          iconCls: 'u-icon-add',
          cls: 'add-new-action',
          handler: function (btn) {
            const grid = btn.up('entitygridpanel')
            grid.isNewForm = true
            grid.openForm()
          }
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_empListAssessment',
    isFolder: 0,
    caption: 'Оцінювання (пошук)',
    caption_uk: 'Оцінювання (пошук)',
    caption_ru: 'Оценивание (поиск)',
    caption_az: 'Qiymətləndirmə (axtarış)',
    cmdType: 'showForm',
    formCode: 'hr_empListAssessment',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_empAssessment',
    isFolder: 0,
    caption: 'Планування оцінювання',
    caption_uk: 'Планування оцінювання',
    caption_ru: 'Планирование оценивания',
    caption_az: 'Qiymətləndirmənin planlaşdırılması',
    cmdType: 'showForm',
    formCode: 'hr_empAssessmentList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_empAssessmentResult',
    isFolder: 0,
    caption: 'Результати виконання завдань',
    caption_uk: 'Результати виконання завдань',
    caption_ru: 'Результаты выполнения заданий',
    caption_az: 'Tapşırıq yerinə yetirilməsinin nəticələri',
    cmdType: 'showForm',
    formCode: 'hr_empAssessmentResultList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_empTrainingProgramA',
    isFolder: 0,
    caption: 'Індивідуальна програма (А)',
    caption_uk: 'Індивідуальна програма (А)',
    caption_ru: 'Индивидуальная программа (А)',
    caption_az: 'Fərdi proqram (A)',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empTrainingProgram',
          method: 'select',
          fieldList: [
            { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
            { name: 'posName', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
            { name: 'depName', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true },
            { name: 'groupCategory' }
          ],
          whereList: {
            orderState: {
              expression: '[groupCategory]',
              condition: 'equal',
              value: '1'
            }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      groupCategory: '1',
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      hideActions: ['addNewByCurrent'],
      listeners: {
        render: grid => {
          grid.menu.add([
            {
              text: `{{UB.i18n('Копіювати')}}`,
              disabled: !AC.entityUtils.verifyRightsMethod('hr_empTrainingProgram', 'addnew'),
              handler: function () {
                let record = AC.gridUtils.getCurrentRecord(grid)
                if (!record) {
                  AC.viewUtils.showToast('Помилка', 'Не вибрано запис')
                  return
                }
                const payElID = record.get('ID')
                $App.connection.run({
                  entity: 'hr_empTrainingProgram',
                  method: 'copyRecord',
                  ID: payElID
                }).then((mParams) => {
                  grid.onRefresh()
                  $App.doCommand({
                    cmdType: 'showForm',
                    entity: 'hr_empTrainingProgram',
                    formCode: 'hr_empTrainingProgram',
                    instanceID: mParams.newID,
                    tabId: 'hr_empTrainingProgram_copyRecord' + Date.now(),
                    target: $App.getViewport().centralPanel,
                    cmpInitConfig: {
                      method: 'copyRecord',
                      sourceGrid: grid
                    }
                  })
                })
              }
            }
          ])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_empTrainingProgramB',
    isFolder: 0,
    caption: 'Індивідуальна програма (Б,В)',
    caption_uk: 'Індивідуальна програма (Б,В)',
    caption_ru: 'Индивидуальная программа (Б,В)',
    caption_az: 'Fərdi proqram (B, C)',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_empTrainingProgram',
          method: 'select',
          fieldList: [
            { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
            { name: 'posName', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
            { name: 'depName', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true },
            { name: 'groupCategory' }
          ],
          whereList: {
            orderState: {
              expression: '[groupCategory]',
              condition: 'equal',
              value: '2'
            }
          }
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      groupCategory: '2',
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      hideActions: ['addNewByCurrent'],
      listeners: {
        render: grid => {
          grid.menu.add([
            {
              text: `{{UB.i18n('Копіювати')}}`,
              disabled: !AC.entityUtils.verifyRightsMethod('hr_empTrainingProgram', 'addnew'),
              handler: function () {
                let record = AC.gridUtils.getCurrentRecord(grid)
                if (!record) {
                  AC.viewUtils.showToast('Помилка', 'Не вибрано запис')
                  return
                }
                const payElID = record.get('ID')
                $App.connection.run({
                  entity: 'hr_empTrainingProgram',
                  method: 'copyRecord',
                  ID: payElID
                }).then((mParams) => {
                  grid.onRefresh()
                  $App.doCommand({
                    cmdType: 'showForm',
                    entity: 'hr_empTrainingProgram',
                    formCode: 'hr_empTrainingProgram',
                    instanceID: mParams.newID,
                    tabId: 'hr_empTrainingProgram_copyRecord' + Date.now(),
                    target: $App.getViewport().centralPanel,
                    cmpInitConfig: {
                      method: 'copyRecord',
                      sourceGrid: grid
                    }
                  })
                })
              }
            }
          ])
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictProfCompetency',
    isFolder: 0,
    caption: 'Професійні компетентності',
    caption_uk: 'Професійні компетентності',
    caption_ru: 'Профессиональные компетентности',
    caption_az: 'Peşəkar bacarıqlar',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_dictProfCompetency',
          method: 'select',
          fieldList: [
            { name: 'code' },
            { name: 'name' },
            { name: 'description' },
            { name: 'groupCategory' }
          ]
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTrainingForm',
    isFolder: 0,
    caption: 'Види (форми навчання) професійної компетентності',
    caption_uk: 'Види (форми навчання) професійної компетентності',
    caption_ru: 'Виды (формы обучения) профессиональной компетентности',
    caption_az: 'Peşəkar bacarıqların növləri (təlim formaları)',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_dictTrainingForm',
          method: 'select',
          fieldList: [
            { name: 'code' },
            { name: 'name' },
            { name: 'description' },
            { name: 'groupCategory' }
          ]
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTrainingTopic',
    isFolder: 0,
    caption: 'Орієнтовні тематики',
    caption_uk: 'Орієнтовні тематики',
    caption_ru: 'Ориентировочные тематики',
    caption_az: 'İstiqamətləndirici mövzular',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_dictTrainingTopic',
          method: 'select',
          fieldList: [
            { name: 'code' },
            { name: 'name' },
            { name: 'description' },
            { name: 'dictProfCompetencyID.name', description: `{{UB.i18n('Найменування професійної компетентності')}}` }
          ]
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_empListPosition',
    isFolder: 0,
    caption: 'Пошук посади',
    caption_uk: 'Пошук посади',
    caption_ru: 'Поиск должности',
    caption_az: 'Vəzifə axtarışı',
    cmdType: 'showForm',
    formCode: 'hr_empListPosition',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_listPosContestOrg',
    isFolder: 0,
    caption: 'Реєстр конкурсних посад',
    caption_uk: 'Реєстр конкурсних посад',
    caption_ru: 'Реестр конкурсных должностей',
    caption_az: 'Müsabiqə üçün olan vəzifələrin reyestri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_listPosContest',
        method: 'select',
        fieldList: [
          { name: 'orderID.description', description: `{{UB.i18n('Наказ Оголошення конкурсу')}}`, simpleFilter: true },
          { name: 'paraPosID.departmentID.description', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true },
          { name: 'paraPosID.description', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'positionID.name', description: `{{UB.i18n('Вакантна Посада')}}`, simpleFilter: true },
          { name: 'state', description: `{{UB.i18n('Стан')}}` },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` }
        ],
        whereList: {
          orgDateFrom: {
            expression: '[organizationID.mi_dateFrom]',
            condition: 'lessEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          orgDateTo: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'moreEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          orgState: {
            expression: '[organizationID.state]',
            condition: '=',
            value: 'ACTIVE'
          },
          posDateFrom: {
            expression: '[positionID.mi_dateFrom]',
            condition: 'lessEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          posDateTo: {
            expression: '[positionID.mi_dateTo]',
            condition: 'moreEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          posState: {
            expression: '[positionID.state]',
            condition: '=',
            value: 'ACTIVE'
          }
        },
        orderList: {
          orderBy: { expression: 'orderID.orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNew', 'edit', 'del', 'showDetail', 'addNewByCurrent', 'newVersion'],
      getRowClass: function (row) {
        return row.get('state') === 'ACTIVE' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID.mi_data_id')
      },
      customActions: [
        {
          actionId: 'exportData',
          eventId: 'exportData',
          iconCls: 'iconSend',
          text: `{{UB.i18n('Експорт даних')}}`,
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_listPosContest\', \'exportDataPosContestAll\')}}',
          handler: function (btn) {
            const cmdCode = {
              cmdType: 'showForm',
              formCode: 'hr_exportPosContest-export',
              entity: 'hr_export',
              customParams: {
                states: []
              }
            }
            $App.doCommand(cmdCode)
          }
        },
        {
          actionId: 'importData',
          eventId: 'importData',
          iconCls: 'mail_left',
          text: `{{UB.i18n('Імпорт даних')}}`,
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_listPosContest\', \'exportDataPosContestPub\')}}',
          handler: function (btn) {
            const cmdCode = {
              cmdType: 'showForm',
              formCode: 'hr_exportPosContest-import',
              entity: 'hr_export',
              customParams: {
                states: []
              }
            }
            $App.doCommand(cmdCode)
          }
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_listPosContestAllA',
    isFolder: 0,
    caption: 'Реєстр конкурсних посад (всі)',
    caption_uk: 'Реєстр конкурсних посад (всі)',
    caption_ru: 'Реестр конкурсных должностей (все)',
    caption_az: 'Müsabiqə üçün olan vəzifələrin reyesteri (hamısı)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_listPosContest',
        method: 'select',
        fieldList: [
          { name: 'orderID.description', description: `{{UB.i18n('Наказ Оголошення конкурсу')}}`, simpleFilter: true },
          { name: 'paraPosID.departmentID.description', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true },
          { name: 'paraPosID.description', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'positionID.name', description: `{{UB.i18n('Вакантна Посада')}}`, simpleFilter: true },
          { name: 'state', description: `{{UB.i18n('Стан')}}` },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` }
        ],
        whereList: {
          orgDateFrom: {
            expression: '[organizationID.mi_dateFrom]',
            condition: 'lessEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          orgDateTo: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'moreEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          orgState: {
            expression: '[organizationID.state]',
            condition: '=',
            value: 'ACTIVE'
          },
          orgDeleteDate: {
            expression: '[organizationID.mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          },
          posDateFrom: {
            expression: '[positionID.mi_dateFrom]',
            condition: 'lessEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          posDateTo: {
            expression: '[positionID.mi_dateTo]',
            condition: 'moreEqual',
            value: '{{appAC.globalApplicationDate()}}'
          },
          posState: {
            expression: '[positionID.state]',
            condition: '=',
            value: 'ACTIVE'
          }
        },
        orderList: {
          orderBy: { expression: 'orderID.orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNew', 'edit', 'del', 'showDetail', 'addNewByCurrent', 'newVersion'],
      getRowClass: function (row) {
        return row.get('state') === 'ACTIVE' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      customActions: [
        {
          actionId: 'exportData',
          eventId: 'exportData',
          iconCls: 'iconSend',
          text: `{{UB.i18n('Експорт даних')}}`,
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_listPosContest\', \'exportDataPosContestAll\')}}',
          handler: function (btn) {
            const cmdCode = {
              cmdType: 'showForm',
              formCode: 'hr_exportPosContest-export',
              entity: 'hr_export',
              customParams: {
                states: []
              }
            }
            $App.doCommand(cmdCode)
          }
        },
        {
          actionId: 'importData',
          eventId: 'importData',
          iconCls: 'mail_left',
          text: `{{UB.i18n('Імпорт даних')}}`,
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_listPosContest\', \'exportDataPosContestPub\')}}',
          handler: function (btn) {
            const cmdCode = {
              cmdType: 'showForm',
              formCode: 'hr_exportPosContest-import',
              entity: 'hr_export',
              customParams: {
                states: []
              }
            }
            $App.doCommand(cmdCode)
          }
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_listPosContestPubA',
    isFolder: 0,
    caption: 'Конкурсні посади (на оприлюднення)',
    caption_uk: 'Конкурсні посади (на оприлюднення)',
    caption_ru: 'Конкурсные должности (на обнародование)',
    caption_az: 'Müsabiqə üçün olan vəzifələr (dərc olunma üçün)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_listPosContest',
        method: 'select',
        fieldList: [
          { name: 'orderID.description', description: `{{UB.i18n('Наказ Оголошення конкурсу')}}`, simpleFilter: true },
          { name: 'paraID.description', description: `{{UB.i18n('Груповий наказ')}}`, simpleFilter: true },
          { name: 'paraPosID.description', description: `{{UB.i18n('Деталь групового наказ')}}`, simpleFilter: true },
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'positionID.name', description: `{{UB.i18n('Вакантна Посада')}}`, simpleFilter: true },
          { name: 'state', description: `{{UB.i18n('Стан')}}` },
          { name: 'comment', description: `{{UB.i18n('Коментар')}}` }
        ],
        whereList: {
          state: {
            expression: '[state]',
            condition: 'equal',
            value: 'NEW'
          },
          orgState: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          orgDateTo: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgDeleteDate: {
            expression: '[organizationID.mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          }
        },
        orderList: {
          orderBy: { expression: 'orderID.orderDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNew', 'edit', 'del', 'showDetail', 'addNewByCurrent', 'newVersion'],
      getRowClass: function (row) {
        return row.get('state') === 'ACTIVE' ? 'ub-row-green' : 'ub-row-lightgrey'
      },
      customActions: [
        {
          actionId: 'exportData',
          eventId: 'exportData',
          iconCls: 'iconSend',
          text: `{{UB.i18n('Експорт даних')}}`,
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_listPosContest\', \'exportDataPosContestPub\')}}',
          handler: async function (btn) {
            const parent = btn.up('entitygridpanel')
            parent.setLoading(true)
            const fileName = 'posContest.json'
            const states = ['AGREED']

            await $App.connection.xhr({
              method: 'POST',
              url: 'getPosContest',
              data: {
                onDate: appAC.globalApplicationDate(),
                states: states,
                createDateFrom: null,
                createDateTo: null
              }
            }).then(response => {
              parent.setLoading(false)
              const resultData = response.data
              if (resultData) {
                AC.filesService.saveAsPlain(JSON.stringify(resultData), fileName)
              }
            }).catch((error) => {
              parent.setLoading(false)
              throw error
            })
          }
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_listPosContestWin',
    isFolder: 0,
    caption: 'Переможці (до призначення на посаду)',
    caption_uk: 'Переможці (до призначення на посаду)',
    caption_ru: 'Победители (до назначения на должность)',
    caption_az: 'Qaliblər (təyinatdan əvvəl)',
    cmdType: 'showForm',
    formCode: 'hr_listPosContestWin',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTimePrint',
    isFolder: 0,
    caption: 'Відображення неявок у підсумках табеля',
    caption_uk: 'Відображення неявок у підсумках табеля',
    caption_ru: 'Отображение неявок в итогах табеля',
    caption_az: 'Cədvəl nəticələrində çatışmazlıqların göstərilməsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTimePrint',
        method: 'select',
        fieldList: [
          { name: 'code', description: `{{UB.i18n('Код')}}`, tooltip: 'Код' },
          { name: 'name', description: `{{UB.i18n('Назва')}}`, tooltip: 'Назва' },
          { name: 'nameAdd', description: `{{UB.i18n('Відображення кодів')}}`, tooltip: 'Відображення кодів' },
          { name: 'orderN', description: `{{UB.i18n('Порядок відображення колонок')}}`, tooltip: 'Порядок відображення колонок' }
        ],
        orderList: {
          orderBy: { expression: 'orderN', order: 'asc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'tim_timeSheetPrintSettings',
    isFolder: 0,
    caption: 'Налаштування друкованої форми табеля',
    caption_uk: 'Налаштування друкованої форми табеля',
    caption_ru: 'Настройка печатной формы табеля',
    caption_az: 'Hesabat kartının çap formasının qurulması',
    cmdType: 'showForm',
    formCode: 'tim_timeSheetPrintSettings',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_requestForStuff',
    isFolder: 0,
    caption: 'Заявка на добір персоналу',
    caption_uk: 'Заявка на добір персоналу',
    caption_ru: 'Заявка на подбор персонала',
    caption_az: 'Əməkdaş yığımı üçün müraciəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_requestForStuff',
        method: 'select',
        fieldList: [
          { name: 'requestNumber' },
          { name: 'requestDate' },
          { name: 'positionID.name', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'departmentID.name', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true },
          { name: 'assignmentType', visibility: false },
          { name: 'positionResp', visibility: false },
          { name: 'positionInstruction', visibility: false },
          { name: 'sphereOfResp', visibility: false },
          { name: 'futuresOfWork', visibility: false },
          { name: 'descOfExtRelatins', visibility: false },
          { name: 'orderState', visibility: false }
        ],
        orderList: {
          orderBy: { expression: 'requestDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hr_requestStuffMotion',
    isFolder: 0,
    caption: 'Подання щодо добору персоналу',
    caption_uk: 'Подання щодо добору персоналу',
    caption_ru: 'Представление по подбору персонала',
    caption_az: 'Əməkdaş yığımı üzrə təqdimat',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_requestStuffMotion',
        method: 'select',
        fieldList: [
          { name: 'requestForStuffID.depName', description: `{{UB.i18n('Підрозділ')}}`, simpleFilter: true },
          { name: 'requestForStuffID.posName', description: `{{UB.i18n('Назва посади')}}`, simpleFilter: true },
          { name: 'requestForStuffID.positionID.positionCategory', description: `{{UB.i18n('Категорія')}}` },
          { name: 'requestStaffMotionGoal', description: `{{UB.i18n('Мета подання')}}` },
          { name: 'orderState', description: `{{UB.i18n('Стан')}}` }
        ],
        orderList: {
          orderBy: { expression: 'requestForStuffID.requestDate', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
        const onDate = appAC.globalApplicationDate()
        this.getStore().ubRequest.joinAs = ['depFrom', 'depTo', 'depActive', 'depDelete']
        AC.viewUtils.setWhereListProperty(this, [
          ['requestForStuffID.departmentID.mi_dateFrom', 'lessEqual', onDate, 'depFrom'],
          ['requestForStuffID.departmentID.mi_dateTo', 'moreEqual', onDate, 'depTo'],
          ['requestForStuffID.departmentID.state', 'equal', 'ACTIVE', 'depActive'],
          ['requestForStuffID.departmentID.mi_deleteDate', 'equal', '#maxdate', 'depDelete'],
          ['requestForStuffID.positionID.mi_dateFrom', 'lessEqual', onDate],
          ['requestForStuffID.positionID.mi_dateTo', 'moreEqual', onDate],
          ['requestForStuffID.positionID.state', 'equal', 'ACTIVE'],
          ['requestForStuffID.positionID.mi_deleteDate', 'equal', '#maxdate']
        ])
      },
      getRowClass: function (row) {
        return AC.gridUtils.getOrderRowClass(row.get('orderState'))
      },
      listeners: {
        render: grid => {
          grid.optimizeColumnWidth(true)
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_reportSetParam',
    isFolder: 0,
    caption: 'Налаштування статистичних звітів',
    caption_uk: 'Налаштування статистичних звітів',
    caption_ru: 'Настройка статистических отчетов',
    caption_az: 'Statistik hesabatların tənzimləməsi',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'hr_repSetParam',
          method: 'select',
          fieldList: [
            'code',
            'name',
            { name: 'dictStReportID.name', description: `{{UB.i18n('Звіт')}}` },
            { name: 'reportNumStr', description: `{{UB.i18n('Номер')}}` },
            { name: 'statisticType', description: `{{UB.i18n('Вид статистики')}}` },
            'dateFromEmpty',
            'dateToEmpty'
          ]
        }
      ]
    },
    cmpInitConfig: {
      hideActions: [
        'addNewByCurrent'
      ],
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this)
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1000
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsTim',
    isFolder: 1,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsTim',
        code: 'hr_empOrderVacationapschedAdd',
        isFolder: 0,
        caption: 'Графік відпусток',
        caption_uk: 'Графік відпусток',
        caption_ru: 'График отпусков',
        caption_az: 'Məzuniyyət qrafiki',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_empOrderVacationapschedAdd',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsTim',
        code: 'hr_reportVacationExtract',
        isFolder: 0,
        caption: 'Витяг з графіку надання щорічних відпусток',
        caption_uk: 'Витяг з графіку надання щорічних відпусток',
        caption_ru: 'Извлечение из графика предоставления ежегодных отпусков',
        caption_az: 'İllik məzuniyyət verilməsinin qrafidən çıxarılması',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_reportVacationExtract',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsTim',
        code: 'hr_empListUnusedVacation',
        isFolder: 0,
        caption: 'Невикористані відпустки',
        caption_uk: 'Невикористані відпустки',
        caption_ru: 'Неиспользованные отпуска',
        caption_az: 'İstifadə olunmamış məzuniyyətlər',
        cmdType: 'showForm',
        formCode: 'hr_empListUnusedVacation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsTim',
        code: 'hr_empListNotplannedVacation',
        isFolder: 0,
        caption: 'Працівники, які відсутні у Графіку відпусток',
        caption_uk: 'Працівники, які відсутні у Графіку відпусток',
        caption_ru: 'Работники, которые отсутствуют в Графике отпусков',
        caption_az: 'Məzuniyyət qrafikində olmayan əməkdaşlar',
        cmdType: 'showForm',
        formCode: 'hr_empListNotplannedVacation',
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 40
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'reportsHREmpAdd',
    isFolder: 1,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'reportsHREmpAdd',
        code: 'hr_vacanciesCompetitionList',
        isFolder: 0,
        caption: 'Перелік вакантних посад з проведенням конкурсу',
        caption_uk: 'Перелік вакантних посад з проведенням конкурсу',
        caption_ru: 'Перечень вакантных должностей с проведением конкурса',
        caption_az: 'Müsabiqə yolu ilə vakant vəzifələrin siyahısı',
        cmdType: 'showReport',
        cmdData: {
          reportCode: 'hr_vacanciesCompetitionList',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hrAccStaffRequestAll',
    isFolder: 0,
    caption: 'Запросити Картку (всі)',
    caption_uk: 'Запросити Картку (всі)',
    caption_ru: 'Запросить Карточку (все)',
    caption_az: 'Şəxsi anket formasını sorğulanması (hamısı)',
    cmdType: 'showForm',
    formCode: 'hr_accessStaffRequestList',
    cmdData: {
      customParams: {
        type: 'REQUEST',
        caption: 'Запросити Картку (всі)',
        caption_uk: 'Запросити Картку (всі)',
        caption_ru: 'Запросить Карточку (все)',
        caption_az: 'İstək Kartı (hamısı)'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hrAccStaffRequestNew',
    isFolder: 0,
    caption: 'Запросити Картку (нові)',
    caption_uk: 'Запросити Картку (нові)',
    caption_ru: 'Запросить Карточку (новые)',
    caption_az: 'Şəxsi anket formasını sorğulanması (yenilər)',
    cmdType: 'showForm',
    formCode: 'hr_accessStaffRequestList',
    cmdData: {
      customParams: {
        type: 'REQUEST',
        requestState: 'NEW',
        caption: 'Запросити Картку (нові)',
        caption_uk: 'Запросити Картку (нові)',
        caption_ru: 'Запросить Карточку (новые)',
        caption_az: 'İstək Kartı (yeni)'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hrAccStaffRequestSended',
    isFolder: 0,
    caption: 'Надати Картку (на опрацювання)',
    caption_uk: 'Надати Картку (на опрацювання)',
    caption_ru: 'Предоставить Карточку (на обработку)',
    caption_az: 'Şəxsi anket formasının təqdim edilməsi(işləmə üçün)',
    cmdType: 'showForm',
    formCode: 'hr_accessStaffRequestList',
    cmdData: {
      customParams: {
        type: 'GRANT',
        requestState: 'SENDED',
        caption: 'Надати Картку (на опрацювання)',
        caption_uk: 'Надати Картку (на опрацювання)',
        caption_ru: 'Предоставить Карточку (на обработку)',
        caption_az: 'Kart təqdim edin (emal üçün)'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'otherCfg',
    code: 'hrAccStaffRequestOwner',
    isFolder: 0,
    caption: 'Надати Картку (всі)',
    caption_uk: 'Надати Картку (всі)',
    caption_ru: 'Предоставить Карточку (все)',
    caption_az: 'Şəxsi anket formasını təqdim etmək(hamısı)',
    cmdType: 'showForm',
    formCode: 'hr_accessStaffRequestList',
    cmdData: {
      customParams: {
        type: 'GRANT',
        caption: 'Надати Картку (всі)',
        caption_uk: 'Надати Картку (всі)',
        caption_ru: 'Предоставить Карточку (все)',
        caption_az: 'Kart təmin edin (hamısı)'
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'accessCfg',
    isFolder: 1,
    caption: 'Заявки на надання доступу',
    caption_uk: 'Заявки на надання доступу',
    caption_ru: 'Заявка на получение доступа',
    caption_az: 'Məlumatlara icazə əldə olunması üçün müraciət',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1000,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestPROJECT',
        isFolder: 0,
        caption: 'Заявки на надання доступу (Нові)',
        caption_uk: 'Заявки на надання доступу (Нові)',
        caption_ru: 'Заявки на предоставление доступа (Новые)',
        caption_az: 'İcazə verilməsi üçün ərizə (Yeni)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true }

            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'PROJECT'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent'],
          afterInit: function () {
            AC.gridUtils.setGlobalOrganization(this, 'organizationID')
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestONRECONCILATION',
        isFolder: 0,
        caption: 'Заявки на надання доступу (На погодженні)',
        caption_uk: 'Заявки на надання доступу (На погодженні)',
        caption_ru: 'Заявки на предоставление доступа (на согласовании)',
        caption_az: 'İcazə verilməsi üçün ərizə (razılaşdırma üçün)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true }

            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'ONRECONCILATION'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            if (!AC.entityUtils.verifyRightsMethod('hr_accessRequest', 'allOrgAccess')) {
              AC.gridUtils.setGlobalOrganization(this, 'organizationID')
            }
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestRECONCILED',
        isFolder: 0,
        caption: 'Заявки на надання доступу (Прийняті)',
        caption_uk: 'Заявки на надання доступу (Прийняті)',
        caption_ru: 'Заявки на предоставление доступа (Принятые)',
        caption_az: 'İcazə verilməsi üçün ərizə (Qəbul olunmuş)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true },
              { name: 'processingDate' },
              { name: 'processEmployeeNumID.description', description: `{{UB.i18n('Обробив')}}`, simpleFilter: true }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'RECONCILED'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.gridUtils.setGlobalOrganization(this, 'organizationID')
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestCANCELED',
        isFolder: 0,
        caption: 'Заявки на надання доступу (Відхилені заявки)',
        caption_uk: 'Заявки на надання доступу (Відхилені заявки)',
        caption_ru: 'Заявки на предоставление доступа (Отклоненные заявки)',
        caption_az: 'İcazə verilməsi üçün ərizə (ləğv edilmiş ərizələr)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true },
              { name: 'processingDate' },
              { name: 'processEmployeeNumID.description', description: `{{UB.i18n('Обробив')}}`, simpleFilter: true },
              { name: 'cancelReason' }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'CANCELED'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.gridUtils.setGlobalOrganization(this, 'organizationID')
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestAllPROJECT',
        isFolder: 0,
        caption: 'Заявки на надання доступу (опрацювання) (Нові)',
        caption_uk: 'Заявки на надання доступу (опрацювання) (Нові)',
        caption_ru: 'Заявки на предоставление доступа (обработка) (Новые)',
        caption_az: 'İcazə verilməsi üçün ərizə (icrada) (Yeni)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true }

            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'PROJECT'
              },
              orgState: {
                expression: '[organizationID.state]',
                condition: 'equal',
                value: 'ACTIVE'
              },
              orgDateTo: {
                expression: '[organizationID.mi_dateTo]',
                condition: 'equal',
                value: '#maxdate'
              },
              orgDeleteDate: {
                expression: '[organizationID.mi_deleteDate]',
                condition: 'equal',
                value: '#maxdate'
              }
            }
          }]
        },
        cmpInitConfig: {
          hideActions: ['showDetail', 'addNewByCurrent'],
          disableAutoLoadStore: true,
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestAllONRECONCILATION',
        isFolder: 0,
        caption: 'Заявки на надання доступу (опрацювання) (На погодженні)',
        caption_uk: 'Заявки на надання доступу (опрацювання) (На погодженні)',
        caption_ru: 'Заявки на предоставление доступа (обработка) (на согласовании)',
        caption_az: 'İcazə verilməsi üçün ərizə (icrada) (razılaşdırma üçün)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'ONRECONCILATION'
              },
              orgState: {
                expression: '[organizationID.state]',
                condition: 'equal',
                value: 'ACTIVE'
              },
              orgDateTo: {
                expression: '[organizationID.mi_dateTo]',
                condition: 'equal',
                value: '#maxdate'
              },
              orgDeleteDate: {
                expression: '[organizationID.mi_deleteDate]',
                condition: 'equal',
                value: '#maxdate'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestAllRECONCILED',
        isFolder: 0,
        caption: 'Заявки на надання доступу (опрацювання) (Прийняті)',
        caption_uk: 'Заявки на надання доступу (опрацювання) (Прийняті)',
        caption_ru: 'Заявки на предоставление доступа (обработка) (Принятые)',
        caption_az: 'İcazə verilməsi üçün ərizə (icrada) (Qəbul olunmuş)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true },
              { name: 'processingDate' },
              { name: 'processEmployeeNumID.description', description: `{{UB.i18n('Обробив')}}`, simpleFilter: true }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'RECONCILED'
              },
              orgState: {
                expression: '[organizationID.state]',
                condition: 'equal',
                value: 'ACTIVE'
              },
              orgDateTo: {
                expression: '[organizationID.mi_dateTo]',
                condition: 'equal',
                value: '#maxdate'
              },
              orgDeleteDate: {
                expression: '[organizationID.mi_deleteDate]',
                condition: 'equal',
                value: '#maxdate'
              }
            }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'accessCfg',
        code: 'hr_accessRequestAllCANCELED',
        isFolder: 0,
        caption: 'Заявки на надання доступу (опрацювання) (Відхилені заявки)',
        caption_uk: 'Заявки на надання доступу (опрацювання) (Відхилені заявки)',
        caption_ru: 'Заявки на предоставление доступа (обработка) (Отклоненные заявки)',
        caption_az: 'İcazə verilməsi üçün ərizə (icrada) (ləğv olunmuş ərizələr)',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}`, simpleFilter: true },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}`, simpleFilter: true },
              { name: 'processingDate' },
              { name: 'processEmployeeNumID.description', description: `{{UB.i18n('Обробив')}}`, simpleFilter: true },
              { name: 'cancelReason' }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'CANCELED'
              },
              orgState: {
                expression: '[organizationID.state]',
                condition: 'equal',
                value: 'ACTIVE'
              },
              orgDateTo: {
                expression: '[organizationID.mi_dateTo]',
                condition: 'equal',
                value: '#maxdate'
              },
              orgDeleteDate: {
                expression: '[organizationID.mi_deleteDate]',
                condition: 'equal',
                value: '#maxdate'
              }
            }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 10
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_indexWork',
    isFolder: 0,
    caption: 'Дані для індексації зовнішніх сумісників',
    caption_uk: 'Дані для індексації зовнішніх сумісників',
    caption_ru: 'Данные для индексации внешних совместителей',
    caption_az: 'Xarici yarımştat işlərin indeksləşdirilməsi üçün məlumatlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_indexWork',
        method: 'select',
        fieldList: [
          { name: 'employeeID.fullFIO', description: `{{UB.i18n('Співробітник')}}` },
          { name: 'periodID.name', description: `{{UB.i18n('Період розрахунку')}}` },
          { name: 'dateFrom' },
          { name: 'dateTo' },
          { name: 'rateIndexYes' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRankPsCategory',
    isFolder: 0,
    caption: 'Ранги держслужби по категоріям посад',
    caption_uk: 'Ранги держслужби по категоріям посад',
    caption_ru: 'Ранги госслужбы по категориям должностей',
    caption_az: 'Vəzifə təsnifatlarına dövlət qulluğunun ixtisas dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRankPsCategory',
        method: 'select',
        fieldList: [
          { name: 'psCategory' },
          { name: 'dictRankID.name', description: `{{UB.i18n('Ранг держслужбовця')}}` }
        ],
        orderList: {
          orderBy: { expression: 'psCategory', order: 'asc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEmpCategory',
    isFolder: 0,
    caption: 'Кваліфікаційна категорія персоналу',
    caption_uk: 'Кваліфікаційна категорія персоналу',
    caption_ru: 'Квалификационная категория персонала',
    caption_az: 'İşçi heyətin ixtisas dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEmpCategory',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dictTarifCoeffID.name', description: `{{UB.i18n('Тарифний розряд')}}` }
        ],
        orderList: {
          orderBy: { expression: 'code', order: 'asc' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMissionPurpose',
    isFolder: 0,
    caption: 'Мета відрядження',
    caption_uk: 'Мета відрядження',
    caption_ru: 'Цель командировки',
    caption_az: 'Ezamiyyət məqsədi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMissionPurpose',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMissionPhrase',
    isFolder: 0,
    caption: 'Вимоги до звіту про відрядження',
    caption_uk: 'Вимоги до звіту про відрядження',
    caption_ru: 'Требования к отчету о командировке',
    caption_az: 'Ezamiyyət hesabatına dair tələblər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMissionPhrase',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'phrase' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRankReason',
    isFolder: 0,
    caption: 'Причина присвоєння рангу',
    caption_uk: 'Причина присвоєння рангу',
    caption_ru: 'Причина присвоения ранга',
    caption_az: 'Dərəcənin verilmə səbəbi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRankReason',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEventKnowledg',
    isFolder: 0,
    caption: 'Події ознайомлення',
    caption_uk: 'Події ознайомлення',
    caption_ru: 'События ознакомления',
    caption_az: 'Tanışlıq hadisələri',
    cmdType: 'showForm',
    formCode: 'hr_dictEventKnowledgList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'cdn_citytype',
    isFolder: 0,
    caption: 'Типи населених пунктів',
    caption_uk: 'Типи населених пунктів',
    caption_ru: 'Типы населенных пунктов',
    caption_az: 'Yaşayış məntəqələrinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'cdn_citytype',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_salaryReports',
    isFolder: 0,
    caption: 'Звіти з заробітної плати',
    caption_uk: 'Звіти з заробітної плати',
    caption_ru: 'Отчеты по заработной плате',
    caption_az: 'Əmək haqqı hesabatları',
    cmdType: 'showForm',
    formCode: 'hr_salaryReports',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'trf_reports',
    isFolder: 0,
    caption: 'Звіти',
    caption_uk: 'Звіти',
    caption_ru: 'Отчеты',
    caption_az: 'Hesabatları',
    cmdType: 'showForm',
    formCode: 'trf_reports',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEmpPosAttr',
    isFolder: 0,
    caption: 'Параметри призначення',
    caption_uk: 'Параметри призначення',
    caption_ru: 'Параметры назначения',
    caption_az: 'Təyinat göstəriciləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEmpPosAttr',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'attrName' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_changePosSchLog',
    isFolder: 0,
    caption: 'Журнал змін тимчасових призначень',
    caption_uk: 'Журнал змін тимчасових призначень',
    caption_ru: 'Журнал изменений временных назначений',
    caption_az: 'Müvəqqəti təyinatların dəyişdirilməsi jurnalı',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_changePosSchLog',
        method: 'select',
        fieldList: [
          { name: 'actionDate' },
          { name: 'planDateTo' },
          { name: 'employeePositionID.tabNum', description: `{{UB.i18n('Таб.номер')}}` },
          { name: 'fullFIO' },
          { name: 'actionMessage' },
          { name: 'changedValues' }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent', 'addNew', 'newVersion', 'del', 'showDetail', 'edit'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'arm_hrEmpOrderDetConfig',
    isFolder: 0,
    caption: 'Налаштування пунктів наказів (види оплати)',
    caption_uk: 'Налаштування пунктів наказів (види оплати)',
    caption_ru: 'Настройка пунктов приказов (виды оплаты)',
    caption_az: 'Əmr maddələrinin tənzimləmələri (ödəniş növləri)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empOrderDetConfig',
        method: 'select',
        fieldList: [
          { name: 'empOrderTypeName', description: `{{UB.i18n('Тип наказу')}}`, simpleFilter: true },
          { name: 'empOrderType', visibility: false },
          { name: 'positionType' },
          { name: 'dictStaffCatID.description', description: `{{UB.i18n('Категорія персоналу')}}`, simpleFilter: true },
          { name: 'dictTimeCostID.nameSmall', description: `{{UB.i18n('Елемент обліку робочого часу')}}`, simpleFilter: true },
          { name: 'payElIDAccrual.description', description: `{{UB.i18n('Система оплати')}}`, simpleFilter: true },
          { name: 'payElIDMain.description', description: `{{UB.i18n('Вид оплати (основний)')}}`, simpleFilter: true },
          { name: 'payElIDAdd.description', description: `{{UB.i18n('Вид оплати (додатково)')}}`, simpleFilter: true },
          { name: 'payElIDReplacement.name', description: `{{UB.i18n('Вид оплати за ТВО')}}`, simpleFilter: true },
          { name: 'comment' },
          { name: 'showTabNumInPrintForm', description: `{{UB.i18n('Виводити табельний номер')}}` }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      customInit: function () {
        AC.gridUtils.tuneGridColumns(this, {
          showTabNumInPrintForm: {
            renderer: function (value) {
              return !value || value === 'Ні' ? '' : 'Так'
            }
          }
        })
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      },
      customActions: [
        {
          iconCls: 'fas fa-angle-double-down',
          cls: 'fill-action',
          scale: 'medium',
          tooltip: 'Завантажити за замовчанням',
          text: `{{UB.i18n('Завантажити за замовчанням')}}`,
          hidden: '{{!AC.entityUtils.verifyRightsMethod(\'hr_empOrderDetConfig\', \'loadDefaultConfig\')}}',
          handler: function (btn) {
            const grid = btn.up('grid')
            $App.dialogYesNo(UB.i18n('Увага'), UB.i18n('Існуючі записи буде видалено. Продовжити')).then(result => {
              if (result) {
                $App.connection.run({
                  entity: 'hr_empOrderDetConfig',
                  method: 'loadDefaultConfig',
                  execParams: {
                    organizationID: appAC.globalOrganization()
                  }
                }).then(() => {
                  grid.getStore().load()
                })
              }
            })
          }
        }
      ]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPensionAge',
    isFolder: 0,
    caption: 'Вік виходу на пенсію',
    caption_uk: 'Вік виходу на пенсію',
    caption_ru: 'Возраст выхода на пенсию',
    caption_az: 'Təqaüd çıxma yaşı',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPensionAge',
        method: 'select',
        fieldList: [
          { name: 'sexType' },
          { name: 'years', config: { align: 'center' } },
          { name: 'months', config: { align: 'center' } },
          { name: 'dateFrom', config: { align: 'center' } },
          { name: 'dateToEmpty', config: { align: 'center' } }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'hr_reportListEmployee',
    isFolder: 0,
    caption: 'Звіти з персоналу',
    caption_uk: 'Звіти з персоналу',
    caption_ru: 'Отчеты по персоналу',
    caption_az: 'İşçi heyəti üzrə hesabatlar',
    cmdType: 'showForm',
    formCode: 'hr_reportListEmployee',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalEmpCounts',
    isFolder: 0,
    caption: 'Кількісний склад організації',
    caption_uk: 'Кількісний склад організації',
    caption_ru: 'Количественный состав организации',
    caption_az: 'Təşkilatın say tərkibi',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalEmpCounts',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportAboutStaffing_person',
    isFolder: 0,
    caption: 'Про укомплектованість',
    caption_uk: 'Про укомплектованість',
    caption_ru: 'Про укомплектованность',
    caption_az: 'Kadr təminatı haqqında',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportAboutStaffing',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportEmpCountPosByCategory',
    isFolder: 0,
    caption: 'Кількісний склад за категоріями посад',
    caption_uk: 'Кількісний склад за категоріями посад',
    caption_ru: 'Количественный состав по категориям должностей',
    caption_az: 'Vəzifə təsnifatları üzrə say tərkibi',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportEmpCountPositionByCategory',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 2
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalF17Doctors',
    isFolder: 0,
    caption: 'Форма 17. Лікарі',
    caption_uk: 'Форма 17. Лікарі',
    caption_ru: 'Форма 17. Врачи',
    caption_az: 'Forma 17. Həkimlər',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalF17Doctors',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalF17PensionDoctors',
    isFolder: 0,
    caption: 'Форма 17. Лікарі пенсійного віку',
    caption_uk: 'Форма 17. Лікарі пенсійного віку',
    caption_ru: 'Форма 17. Врачи пенсионного возраста',
    caption_az: 'Forma 17. Təqaüd yaşına çatmış həkimlər',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalF17PensionDoctors',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalF17Nurses',
    isFolder: 0,
    caption: 'Форма 17. Середній медичний персонал',
    caption_uk: 'Форма 17. Середній медичний персонал',
    caption_ru: 'Форма 17. Средний медицинский персонал',
    caption_az: 'Forma 17. Orta dərəcəli tibbi heyət',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalF17Nurses',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalF17PensionNurses',
    isFolder: 0,
    caption: 'Форма 17. Середній медичний персонал пенсійного віку',
    caption_uk: 'Форма 17. Середній медичний персонал пенсійного віку',
    caption_ru: 'Форма 17. Средний медицинский персонал пенсионного возраста',
    caption_az: 'Forma 17. Təqaüd yaşına çatmış orta tibbi heyət',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalF17PensionNurses',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalF20Staff',
    isFolder: 0,
    caption: 'Форма 20. Штати закладу на кінець звітного року',
    caption_uk: 'Форма 20. Штати закладу на кінець звітного року',
    caption_ru: 'Форма 20. Штаты учреждения на конец отчетного года',
    caption_az: 'Forma 20. Hesabat ilinin sonuna müəsisənin ştat vahidləri',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalF20Staff',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'reportCfg',
    code: 'hr_reportHospitalF20NotMed',
    isFolder: 0,
    caption: 'Форма 20. Кількість фізичних осіб спеціалістів з вищою немедичною освітою - основних працівників',
    caption_uk: 'Форма 20. Кількість фізичних осіб спеціалістів з вищою немедичною освітою - основних працівників',
    caption_ru: 'Форма 20. Количество физических лиц специалистов с высшим немедицинским образованием - основных работников',
    caption_az: 'Form 20. Yüksək qeyri-tibb təhsili olan şəxslərin, mütəxəssislərin sayı - əsas işçilər',
    cmdType: 'showReport',
    cmdData: {
      reportCode: 'hr_reportHospitalF20NotMed',
      reportType: 'html',
      reportOptions: {
        allowExportToExcel: true
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictPupil',
    isFolder: 0,
    caption: 'Категорії учнів',
    caption_uk: 'Категорії учнів',
    caption_ru: 'Категории учащихся',
    caption_az: 'İştirakçıların təsnifatı',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_dictPupil',
        method: 'select',
        fieldList: ['code', 'name']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictEducationRank',
    isFolder: 0,
    caption: 'Тарифікаційні звання',
    caption_uk: 'Тарифікаційні звання',
    caption_ru: 'Тарификационные звания',
    caption_az: 'Tarif dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_dictEducationRank',
        method: 'select',
        fieldList: ['code', 'name']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictQualification',
    isFolder: 0,
    caption: 'Кваліфікаційні категорії',
    caption_uk: 'Кваліфікаційні категорії',
    caption_ru: 'Квалификационные категории',
    caption_az: 'İxtisas dərəcələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_dictQualification',
        method: 'select',
        fieldList: ['code', 'name']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictSubject',
    isFolder: 0,
    caption: 'Предмети (дисципліни)',
    caption_uk: 'Предмети (дисципліни)',
    caption_ru: 'Предметы (дисциплины)',
    caption_az: 'Əlamətlər (intizam)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_dictSubject',
        method: 'select',
        fieldList: ['code', 'name']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'trf_tariffSheet',
    isFolder: 0,
    caption: 'Тарифікаційна сітка',
    caption_uk: 'Тарифікаційна сітка',
    caption_ru: 'Тарификационная сетка',
    caption_az: 'Tarif cədvəli',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_tariffSheet',
        method: 'select',
        fieldList: ['code', 'name']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictAccrual',
    isFolder: 0,
    caption: 'Види нарахувань тарифікації',
    caption_uk: 'Види нарахувань тарифікації',
    caption_ru: 'Виды начислений тарификации',
    caption_az: 'Tariflərin hesablanması növləri',
    cmdType: 'showForm',
    formCode: 'trf_dictAccrual',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'trf_documentList',
    isFolder: 0,
    caption: 'Тарифікація',
    caption_uk: 'Тарифікація',
    caption_ru: 'Тарификация',
    caption_az: 'Tarif müəyyən edilməsi',
    cmdType: 'showForm',
    formCode: 'trf_documentList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fas fa-money-check',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPositionGroup',
    isFolder: 0,
    caption: 'Група посади',
    caption_uk: 'Група посади',
    caption_ru: 'Группа должности',
    caption_az: 'Vəzifə qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPositionGroup',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'fullName' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictPositionKind',
    isFolder: 0,
    caption: 'Вид посади',
    caption_uk: 'Вид посади',
    caption_ru: 'Вид должности',
    caption_az: 'Vəzifə növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictPositionKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'fullName' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictDepCostKind',
    isFolder: 0,
    caption: 'Вид підрозділу МВВ',
    caption_uk: 'Вид підрозділу МВВ',
    caption_ru: 'Вид подразделения МВЗ',
    caption_az: 'Tabeli struktur vahidlərinin xərc sahələri növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictDepCostKind',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictBalanceUnit',
    isFolder: 0,
    caption: 'Балансові одиниці',
    caption_uk: 'Балансові одиниці',
    caption_ru: 'Балансовые единицы',
    caption_az: 'Balans maddələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictBalanceUnit',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCostPlaceType',
    isFolder: 0,
    caption: 'Тип місця виникнення витрат',
    caption_uk: 'Тип місця виникнення витрат',
    caption_ru: 'Тип места возникновения затрат',
    caption_az: 'Xərc sahələrinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCostPlaceType',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictCostPlaceNumber',
    isFolder: 0,
    caption: 'Порядкові номера місця виникнення витрат',
    caption_uk: 'Порядкові номера місця виникнення витрат',
    caption_ru: 'Порядковые номера места возникновения затрат',
    caption_az: 'Xərc sahələrinin sıra nömrələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictCostPlaceNumber',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSalarySchemeLevel',
    isFolder: 0,
    caption: 'Рівень посадового окладу',
    caption_uk: 'Рівень посадового окладу',
    caption_ru: 'Уровень должностного оклада',
    caption_az: 'Уровень должностного оклада',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSalarySchemeLevel',
        method: 'select',
        fieldList: [
          { name: 'dictSalarySchemeID.name', description: `{{UB.i18n('Схема посадових окладів')}}` },
          { name: 'name' },
          { name: 'sortNumber' },
          { name: 'code' },
          { name: 'dictPositionID.name', description: `{{UB.i18n('Посада')}}` },
          { name: 'isActive' },
          { name: 'dateFrom' },
          { name: 'dateTo' },
          { name: 'accrualSumMin' },
          { name: 'accrualSumMax' },
          { name: 'accrualSumAvg' },
          { name: 'coefMin' },
          { name: 'coefMax' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictNameAddition',
    isFolder: 0,
    caption: 'Доповнення до назви',
    caption_uk: 'Доповнення до назви',
    caption_ru: 'Дополнение к названию',
    caption_az: 'Başlığa əlavə',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictNameAddition',
        method: 'select',
        fieldList: [
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'ac_docPrintSettingsOrg',
    isFolder: 0,
    caption: 'Налаштування друку документів',
    caption_uk: 'Налаштування друку документів',
    caption_ru: 'Налаштування друку документів',
    caption_az: 'Rəsmi əmək haqqı sxemi',
    cmdType: 'showList',
    cmdData: {
      params: [
        {
          entity: 'ac_docPrintSettings',
          method: 'select',
          fieldList: [
            { name: 'organizationID.description', description: 'Організація' }
          ]
        }
      ]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      onDeterminateForm: function () {
        return {
          entityName: 'ac_docPrintSettings',
          formCode: 'ac_docPrintSettings',
          cmpInitConfig: {
            disableChangeOrg: true,
            defaultValues: {
              organizationID: appAC.globalOrganization()
            }
          }
        }
      },
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_workNorm',
    isFolder: 0,
    caption: 'Норми тривалості робочого часу',
    caption_uk: 'Норми тривалості робочого часу',
    caption_ru: 'Нормы продолжительности рабочего времени',
    caption_az: 'İş vaxtı normaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_workNorm',
        method: 'select',
        fieldList: ['code', 'weekHours', 'name', 'dateFromEmpty', 'dateToEmpty'],
        orderList: { name: { 'expression': 'name', 'order': 'asc' }, dateTo: { 'expression': 'dateTo', 'order': 'desc' } }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      forceDataLoad: true,
      afterInit: function () {
        const grid = this
        const store = grid.getStore()
        const ubRequest = grid.getStore().ubRequest
        grid.down('toolbar').insert(2, Ext.create('Ext.Button', {
          tooltip: grid.isShowAll ? UB.i18n('Приховати всі') : UB.i18n('Показати всі'),
          iconCls: 'fas fa-eye',
          cls: 'grey-action',
          listeners: {
            click: function (btn) {
              grid.isShowAll = !grid.isShowAll
              btn.setTooltip(grid.isShowAll ? UB.i18n('Приховати всі') : UB.i18n('Показати всі'))
              if (grid.isShowAll) {
                delete store.ubRequest.whereList.dateFrom
                delete store.ubRequest.whereList.dateTo
                store.load()
              } else {
                appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
                  if (!ubRequest.whereList) {
                    ubRequest.whereList = {}
                  }
                  ubRequest.whereList.dateFrom = {
                    expression: '[dateFrom]',
                    condition: '<=',
                    value: response ? response.dateTo : appAC.globalApplicationDate()
                  }
                  ubRequest.whereList.dateTo = {
                    expression: '[dateTo]',
                    condition: '>=',
                    value: response ? response.dateFrom : appAC.globalApplicationDate()
                  }
                  store.load()
                })
              }
            }
          }
        }))

        appHR.getCurrentPeriod(appAC.globalOrganization()).then(response => {
          ubRequest.whereList = {
            dateFrom: {
              expression: '[dateFrom]',
              condition: '<=',
              value: response ? response.dateTo : appAC.globalApplicationDate()
            },
            dateTo: {
              expression: '[dateTo]',
              condition: '>=',
              value: response ? response.dateFrom : appAC.globalApplicationDate()
            }
          }
          store.load()
        })
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'trf_dictPart',
    isFolder: 0,
    caption: 'Розділи тарифікації',
    caption_uk: 'Розділи тарифікації',
    caption_ru: 'Разделы тарификации',
    caption_az: 'Tarif bölmələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'trf_dictPart',
        method: 'select',
        fieldList: ['code', 'name', 'isMain']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_addDescrPosition',
    isFolder: 0,
    caption: 'Складові додаткової інформації посади',
    caption_uk: 'Складові додаткової інформації посади',
    caption_ru: 'Составляющие дополнительной информации должности',
    caption_az: 'Əlavə iş məlumatının komponentləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_addDescrPosition',
        method: 'select',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
          { name: 'idxNum', width: 150 },
          { name: 'value' },
          { name: 'name' }
        ],
        whereList: {
          orgState: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          orgDateTo: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgDeleteDate: {
            expression: '[organizationID.mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          }
        },
        orderList: { orderBy: { 'expression': 'idxNum', 'order': 'asc' } }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_addDescrPerson',
    isFolder: 0,
    caption: 'Складові додаткової інформації працівника',
    caption_uk: 'Складові додаткової інформації працівника',
    caption_ru: 'Составляющие дополнительной информации работника',
    caption_az: 'Əlavə işçi məlumatının komponentləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_addDescrPerson',
        method: 'select',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
          { name: 'idxNum', width: 150 },
          { name: 'value' },
          { name: 'name' }
        ],
        whereList: {

          orgState: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          orgDateTo: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgDeleteDate: {
            expression: '[organizationID.mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          }
        },
        orderList: { orderBy: { 'expression': 'idxNum', 'order': 'asc' } }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      hideActions: ['addNewByCurrent'],
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictNomMilitaryRank',
    isFolder: 0,
    caption: 'Номенклатура військових звань',
    caption_uk: 'Номенклатура військових звань',
    caption_ru: 'Номенклатура военных званий',
    caption_az: 'Hərbi rütbələrin nomenklaturası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictNomMilitaryRank',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dictNomMilitaryRankKindID.name', description: `{{UB.i18n('Тип номенклатури')}}` }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictNomMilitaryRankKind',
    isFolder: 0,
    caption: 'Типи номенклатур військових звань',
    caption_uk: 'Типи номенклатур військових звань',
    caption_ru: 'Типы номенклатур военных званий',
    caption_az: 'Hərbi rütbələrin nomenklaturalarının növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictNomMilitaryRankKind',
        method: 'select',
        fieldList: ['code', 'name']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTermMilitaryContract',
    isFolder: 0,
    caption: 'Термін контракту військової служби',
    caption_uk: 'Термін контракту військової служби',
    caption_ru: 'Срок контракта военной службы',
    caption_az: 'Hərbi xidmət müqaviləsinin müddəti',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTermMilitaryContract',
        method: 'select',
        fieldList: ['code', 'name', 'abbreviation']
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'configurationCfg',
    code: 'hr_orderProcessingHistory',
    isFolder: 0,
    caption: 'Історія проведення наказів ШР',
    caption_uk: 'Історія проведення наказів ШР',
    caption_ru: 'История проведения приказов ШР',
    caption_az: 'Sifarişlərin tarixi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_orderProcessingHistory',
        method: 'select',
        fieldList: [
          { name: 'orderID.description', description: `{{UB.i18n('Наказ')}}`, simpleFilter: true },
          { name: 'timeStampBegin' },
          { name: 'timeStampEnd' },
          { name: 'description' },
          { name: 'userID.name', description: `{{UB.i18n('Користувач')}}`, simpleFilter: true }
        ],
        orderList: {
          orderBy: { expression: 'timeStampBegin', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      customInit: function () {
        const grid = this
        AC.gridUtils.setGlobalOrganization(grid, 'orgID')
        AC.gridUtils.tuneGridColumns(grid, {
          timeStampBegin: {
            renderer: function (value) {
              return value ? AC.dateService.formatDate(AC.dateService.unshiftDate(value), 'dd.mm.yyyy hh:nn:ss') : value
            }
          },
          timeStampEnd: {
            renderer: function (value) {
              return value ? AC.dateService.formatDate(AC.dateService.unshiftDate(value), 'dd.mm.yyyy hh:nn:ss') : value
            }
          }
        })
      },
      onDeterminateForm: function () {
        return false
      },
      onItemDblClick: function () {
        return false
      },
      hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del', 'edit']
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictWorkOperation',
    isFolder: 0,
    caption: 'Операційно-трудові нормативи',
    caption_uk: 'Операційно-трудові нормативи',
    caption_ru: 'Операционно-трудовые нормативы',
    caption_az: 'Əməliyyat və əmək standartları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictWorkOperation',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name', simpleFilter: true },
          { name: 'dictWorkGroupID.name', description: `{{UB.i18n('Група')}}`, simpleFilter: true },
          { name: 'payment', simpleFilter: true },
          { name: 'norm' },
          { name: 'dictMeasureID.symbolUkr', description: `{{UB.i18n('Одиниця виміру')}}`, simpleFilter: true },
          { name: 'rate', description: `{{UB.i18n('Тариф')}}`, visibility: false },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_orderRegistryWorkShift',
    isFolder: 0,
    cmdType: 'showForm',
    caption: 'Змінний бригадний наряд',
    caption_uk: 'Змінний бригадний наряд',
    caption_ru: 'Сменный бригадный наряд',
    caption_az: 'Briqadanın iş növbəsi',
    formCode: 'hr_orderRegistryList',
    cmpInitConfig: {
      cmdData: {
        customParams: {
          orderTypes: ['hr_orderRegistryWorkShift']
        }
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTech',
    isFolder: 0,
    caption: 'Технологічні карти',
    caption_uk: 'Технологічні карти',
    caption_ru: 'Технологические карты',
    caption_az: 'Texnoloji kartlar',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTech',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name', simpleFilter: true },
          { name: 'nomenclatureID.name', description: `{{UB.i18n('Продукція')}}`, simpleFilter: true },
          { name: 'quantity', simpleFilter: true },
          { name: 'nomenclatureID.dictMeasureID.symbolUkr', description: `{{UB.i18n('Одиниця виміру')}}`, simpleFilter: true },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' },
          { name: 'dateFrom', visibility: false },
          { name: 'dateTo', visibility: false }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTariffingPayEl',
    isFolder: 0,
    caption: 'Види оплат тарифікаційного списку',
    caption_uk: 'Види оплат тарифікаційного списку',
    caption_ru: 'Виды оплат тарификационного списка',
    caption_az: 'Tarif siyahısı ödənişlərinin növləri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTariffingPayEl',
        method: 'select',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'itemIdx' },
          { name: 'nameColumn' },
          { name: 'payElID.description', description: `{{UB.i18n('Вид оплати')}}`, simpleFilter: true },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ],
        orderList: {
          orderBy: { expression: 'itemIdx' }
        },
        whereList: {
          state: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          organizationID: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([organizationID] AND [state]) OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEmpCatTarifPos',
    isFolder: 0,
    caption: 'Категорії та тарифні розряди посад',
    caption_uk: 'Категорії та тарифні розряди посад',
    caption_ru: 'Категории и тарифные разряды должностей',
    caption_az: 'Vəzifələrin kateqoriyaları və tarif səviyyələri',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEmpCatTarifPos',
        method: 'select',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'dictPositionID.description', description: `{{UB.i18n('Посада')}}`, simpleFilter: true },
          { name: 'dictEmpCategoryID.description', description: `{{UB.i18n('Кваліфікаційна категорія')}}`, simpleFilter: true },
          { name: 'dictTarifCoeffID.description', description: `{{UB.i18n('Тарифний розряд')}}`, simpleFilter: true },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ],
        whereList: {
          state: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          organizationID: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([organizationID] AND [state]) OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStaffCatAccrual',
    isFolder: 0,
    caption: 'Нарахування за категоріями персоналу',
    caption_uk: 'Нарахування за категоріями персоналу',
    caption_ru: 'Начисление по категориям персонала',
    caption_az: 'Kadrlar kateqoriyalarına görə ödənişlər',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStaffCatAccrual',
        method: 'select',
        fieldList: [
          { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}`, simpleFilter: true },
          { name: 'dictStaffCatID.description', description: `{{UB.i18n('Категорія персоналу')}}`, simpleFilter: true },
          { name: 'payElID.description', description: `{{UB.i18n('Вид оплати')}}`, simpleFilter: true },
          { name: 'valuation', description: `{{UB.i18n('Оцінка')}}` },
          { name: 'value' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ],
        whereList: {
          state: {
            expression: '[organizationID.state]',
            condition: 'equal',
            value: 'ACTIVE'
          },
          organizationID: {
            expression: '[organizationID.mi_dateTo]',
            condition: 'equal',
            value: '#maxdate'
          },
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['(([organizationID] AND [state]) OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictParticipantType',
    isFolder: 0,
    caption: 'Вид учасника розсилки',
    caption_uk: 'Вид учасника розсилки',
    caption_ru: 'Вид участника рассылки',
    caption_az: 'Poçt göndərmə iştirakçısının növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictParticipantType',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'isTable' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictMissionCostCategory',
    isFolder: 0,
    caption: 'Категорія витрат відрядження',
    caption_uk: 'Категорія витрат відрядження',
    caption_ru: 'Категория командировочных расходов',
    caption_az: 'Səyahət xərclərinin kateqoriyası',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictMissionCostCategory',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictParticipant',
    isFolder: 0,
    caption: 'Учасник розсилки',
    caption_uk: 'Учасник розсилки',
    caption_ru: 'Участник рассылки',
    caption_az: 'Poçt üzvü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictParticipant',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'trf_regReportParamsCfg',
    isFolder: 1,
    caption: '-',
    caption_uk: '-',
    caption_ru: '-',
    caption_az: '-',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_regReportParamsCfg',
        code: 'trf_reportParamsList',
        isFolder: 0,
        caption: 'Усі звіти ...',
        caption_uk: 'Усі звіти ...',
        caption_ru: 'Все отчеты ...',
        caption_az: 'Bütün hesabatlar ...',
        cmdType: 'showForm',
        formCode: 'trf_reportParamsList',
        inWindow: 1,
        isCollapsed: 0,
        iconCls: 'fa fa-file-text-o',
        displayOrder: 4000
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    code: 'trf_allReportsCfg',
    isFolder: 1,
    caption: 'Всі звіти',
    caption_uk: 'Всі звіти',
    caption_ru: 'Все отчеты',
    caption_az: 'Hesabatlar',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1,
    items: [
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'wholeSchoolIndicators',
        isFolder: 0,
        caption: 'Загальношкільні показники',
        caption_uk: 'Загальношкільні показники',
        caption_ru: 'Общешкольные показатели',
        caption_az: 'Məktəb miqyasında göstəricilər',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_wholeSchoolIndicators',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3002
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'reportList',
        isFolder: 0,
        caption: 'Тарифікаційні листки в дві колонки',
        caption_uk: 'Тарифікаційні листки в дві колонки',
        caption_ru: 'Тарификационные листы в две колонки',
        caption_az: 'Tarif siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_reportList',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3007
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'regSummaryStatementRates',
        isFolder: 0,
        caption: 'Зведена відомість фактично зайнятих ставок',
        caption_uk: 'Зведена відомість фактично зайнятих ставок',
        caption_ru: 'Сводная ведомость фактически занятых ставок',
        caption_az: 'Əslində işlədilən faizlərin xülasəsi',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_reportSummaryStatementRates',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3004
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'regStatement',
        isFolder: 0,
        caption: 'Зведена тарифікаційна відомість',
        caption_uk: 'Зведена тарифікаційна відомість',
        caption_ru: 'Тарификационная ведомость',
        caption_az: 'Tarif siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_statement',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3005
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'regReportListOneColum',
        isFolder: 0,
        caption: 'Тарифікаційні листки',
        caption_uk: 'Тарифікаційні листки',
        caption_ru: 'Тарификационные листы',
        caption_az: 'Tarif siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_reportList',
          reportType: 'html',
          reportColum: 1,
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3006
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'regReportsItemEmployees',
        isFolder: 0,
        caption: 'Тарифікаційний список працівників',
        caption_uk: 'Тарифікаційний список працівників',
        caption_ru: 'Тарификационный список сотрудников',
        caption_az: 'Tarif siyahısı',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_reportEmpList',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: false
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3008
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'regReportsTimesheet',
        isFolder: 0,
        caption: 'Табель обліку використання робочого часу (педперсонал)',
        caption_uk: 'Табель обліку використання робочого часу (педперсонал)',
        caption_ru: 'Табель учета рабочего времени (педперсонал)',
        caption_az: 'İş vaxtından istifadənin uçot cədvəli',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_reportsTimesheet',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3010
      },
      {
        desktopCode: 'arm_accCfg',
        parentCode: 'trf_allReportsCfg',
        code: 'reportsTimesheetTechnicalStaff',
        isFolder: 0,
        caption: 'Табель обліку використання робочого часу (сади та тех.персонал шкіл)',
        caption_uk: 'Табель обліку використання робочого часу (сади та тех.персонал шкіл)',
        caption_ru: 'Табель учета использования рабочего времени (сады и тех.персонал школ)',
        caption_az: 'İş vaxtından istifadənin uçot cədvəli (uşaq bağçaları və məktəblərin texniki işçiləri)',
        cmdType: 'showForm',
        formCode: 'trf_constructorReports',
        cmdData: {
          reportCode: 'trf_reportsTimesheetTechnicalStaff',
          reportType: 'html',
          reportOptions: {
            allowExportToExcel: true
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 3012
      }
    ]
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_dictKpiAccrual',
    isFolder: 0,
    caption: 'Нарахування за KPI',
    caption_uk: 'Нарахування за KPI',
    caption_ru: 'Начисления по KPI',
    caption_az: 'KPI hesablamaları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictKpiAccrual',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 3008
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStipendAmount',
    isFolder: 0,
    caption: 'Розмір стипендії',
    caption_uk: 'Розмір стипендії',
    caption_ru: 'Размер стипендии',
    caption_az: 'Təqaüdün ölçüsü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStipendAmount',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'dictTypeStipendID.description', description: `{{UB.i18n('Тип стипендії')}}`, simpleFilter: true },
          { name: 'payElID.description', description: `{{UB.i18n('Вид оплати')}}`, simpleFilter: true },
          { name: 'dateFromEmpty' },
          { name: 'dateToEmpty' },
          { name: 'averageScoreMin' },
          { name: 'averageScoreMax' },
          { name: 'accrualSum' }
        ],
        orderList: {
          orderBy: { expression: 'code' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'orgID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_groupReport',
    isFolder: 0,
    caption: 'Протоколи групи звітів',
    caption_uk: 'Протоколи групи звітів',
    caption_ru: 'Протоколы группы отчетов',
    caption_az: 'Qrup protokollarını bildirin',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_groupReport',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'shortName' },
          { name: 'name' }
        ],
        orderList: {
          orderBy: { expression: 'code' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTypeStipend',
    isFolder: 0,
    caption: 'Тип стипендії',
    caption_uk: 'Тип стипендії',
    caption_ru: 'Тип стипендии',
    caption_az: 'Təqaüd növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTypeStipend',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'orderN' }
        ],
        orderList: {
          orderBy: { expression: 'code' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTypeStudy',
    isFolder: 0,
    caption: 'Вид навчання',
    caption_uk: 'Вид навчання',
    caption_ru: 'Вид обучения',
    caption_az: 'Təlim növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTypeStudy',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ],
        orderList: {
          orderBy: { expression: 'code' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictEducLevel',
    isFolder: 0,
    caption: 'Освітній рівень',
    caption_uk: 'Освітній рівень',
    caption_ru: 'Образовательный уровень',
    caption_az: 'Təhsil səviyyəsi',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictEducLevel',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ],
        orderList: {
          orderBy: { expression: 'code' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictStudGroup',
    isFolder: 0,
    caption: 'Групи навчання',
    caption_uk: 'Групи навчання',
    caption_ru: 'Группы обучения',
    caption_az: 'Tədris qrupları',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictStudGroup',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'depName' }
        ],
        orderList: {
          orderBy: { expression: 'code' }
        }
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'persCfg',
    code: 'hr_employeeGroup',
    isFolder: 0,
    caption: 'Група/команда (персонал)',
    caption_uk: 'Група/команда (персонал)',
    caption_ru: 'Группа/команда (персонал)',
    caption_az: 'Qrup (heyət)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_employeeGroup',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'quantity' },
          { name: 'chiefID.employeeID.fullFIO', description: `{{UB.i18n('Керівник')}}`, simpleFilter: true },
          { name: 'dateFrom' },
          { name: 'dateToEmpty' },
          { name: 'description' }
        ]
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTypeAsset',
    isFolder: 0,
    caption: 'Вид майна',
    caption_uk: 'Вид майна',
    caption_ru: 'Вид майна',
    caption_az: 'Вид майна(az)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTypeAsset',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictGroupAssets',
    isFolder: 0,
    caption: 'Група майна',
    caption_uk: 'Група майна',
    caption_ru: 'Группа имущества',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictGroupAssets',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTimeForm',
    isFolder: 0,
    caption: 'Налаштування форми коригування табеля',
    caption_uk: 'Налаштування форми коригування табеля',
    caption_ru: 'Налаштування форми коригування табеля',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTimeForm',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'type' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTypeOfSourceOfEmployment',
    isFolder: 0,
    caption: 'Вид джерела найму',
    caption_uk: 'Вид джерела найму',
    caption_ru: 'Вид источника найма',
    caption_az: 'Вид джерела найму(az)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTypeOfSourceOfEmployment',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictTypeOfEmployment',
    isFolder: 0,
    caption: 'Вид найму',
    caption_uk: 'Вид найму',
    caption_ru: 'Вид найма',
    caption_az: 'Вид найму(az)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictTypeOfEmployment',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictOrderDetOrderWord',
    isFolder: 0,
    caption: 'Формулювання наказу',
    caption_uk: 'Формулювання наказу',
    caption_ru: 'Формулировка приказа',
    caption_az: 'Sifarişin mətni',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictOrderDetOrderWord',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'empOrderType' },
          { name: 'orderWord' }
        ],
        whereList: {
          orgIsNull: {
            expression: '[organizationID]',
            condition: 'isNull'
          }
        },
        logicalPredicates: ['([organizationID] OR [orgIsNull])']
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      afterInit: function () {
        AC.gridUtils.setGlobalOrganization(this, 'organizationID')
      }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_contenderPositionList',
    isFolder: 0,
    caption: 'Реєстр кандидатів',
    caption_uk: 'Реєстр кандидатів',
    caption_ru: 'Реестр кандидатов',
    caption_az: 'Namizədlərin qeydiyyatı',
    cmdType: 'showForm',
    formCode: 'hr_contenderPositionList',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'el-icon-user-solid',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictRequestKindDictionaryCfg',
    isFolder: 0,
    caption: 'Вид заяв',
    caption_uk: 'Вид заяв',
    caption_ru: 'Вид заявлений',
    caption_az: 'Tətbiqlərin növü',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictRequestKind',
        method: 'select',
        fieldList: [
          { name: 'name' },
          { name: 'requestType' },
          { name: 'procRule' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'dictionaryCfg',
    code: 'hr_dictSpecialRank',
    isFolder: 0,
    caption: 'Спеціальне звання',
    caption_uk: 'Спеціальне звання',
    caption_ru: 'Специальное звание',
    caption_az: 'Спеціальне звання (аз)',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_dictSpecialRank',
        method: 'select',
        fieldList: [
          { name: 'code' },
          { name: 'name' },
          { name: 'rankType' },
          { name: 'nextRankMonth' },
          { name: 'dictSpecialRankNextID' }
        ]
      }]
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: '',
    displayOrder: 1
  },
  {
    desktopCode: 'arm_accCfg',
    parentCode: 'documentsCfg',
    code: 'hr_empSheduledLeaveMessages',
    isFolder: 0,
    caption: 'Повідомлення про заплановану відпустку',
    caption_uk: 'Повідомлення про заплановану відпустку',
    caption_ru: 'Notification of planned vacation',
    caption_az: 'Notification of planned vacation',
    cmdType: 'showList',
    cmdData: {
      params: [{
        entity: 'hr_empSheduledLeaveMessages',
        method: 'select',
        fieldList: [
          { name: 'date', description: `{{UB.i18n('Дата повідомлення')}}`, format: 'd.m.Y' },
          { name: 'employeeNumberID.tabNum', description: `{{UB.i18n('Табельний номер')}}` },
          { name: 'employeeNumberID.description', description: `{{UB.i18n('ПІБ')}}` },
          { name: 'orderID', description: `{{UB.i18n('Наказ')}}` },
          { name: 'printed', description: `{{UB.i18n('Відправлено')}}` },
          { name: 'sent', description: `{{UB.i18n('Роздруковано')}}` },
          { name: 'organizationID' }
        ],
        orderList: {
          orderBy: { expression: 'date', order: 'desc' }
        }
      }]
    },
    cmpInitConfig: {
      disableAutoLoadStore: true,
      listeners: {
        render: function () {
          this.setTitle(UB.i18n('Повідомлення про заплановану відпустку'))
        }
      },
      hideActions: ['showDetail']
      // afterInit: function () {
      //   AC.gridUtils.setGlobalOrganization(this, ['organizationID'])
      // }
    },
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-file-text-o',
    displayOrder: 1
  }
]
