module.exports = [
  {
    name: 'acc_editorDictionaryOrg',
    description: 'Адміністратор довідників оргструктури та штатного розпису',
    description_uk: 'Адміністратор довідників оргструктури та штатного розпису',
    description_ru: 'Администратор справочников оргструктуры и штатного расписания',
    description_az: 'Təşkilatın strukturunun və ştat cədvəlinin sorğu kitabçalarının administratoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderDictionary',
      'hr_dictTariffGroup',
      'accStaff_dictTariffGroup',
      'hr_dictParentUnitType',
      'accStaff_dictParentUnitType',
      'hr_dictBasicFunctn',
      'accStaff_dictBasicFunctn',
      'accStaff_dictPosition',
      'hr_dictPosition',
      'hr_dictProfession',
      'accStaff_dictProfession',
      'hr_dictDepType',
      'accStaff_dictDepType',
      'hr_dictWagePay',
      'accStaff_dictWagePay',
      'hr_categPayEl',
      'accStaff_categPayEl',
      'hr_dictHarmfulKind',
      'accStaff_dictHarmfulKind',
      'hr_dictStatePay',
      'accStaff_dictStatePay',
      'hr_dictGovernmType',
      'accStaff_dictGovernmType',
      'hr_departmentKind',
      'accStaff_departmentKind',
      'hr_dictEmpCategory',
      'accStaff_dictEmpCategory',
      'hr_dictReasonAccrual',
      'accStaff_dictReasonAccrual',
      'accStaff_dictPositionKind',
      'hr_dictPositionKind',
      'accStaff_dictPositionGroup',
      'hr_dictPositionGroup',
      'accStaff_dictSalaryScheme',
      'hr_dictSalaryScheme',
      'accStaff_dictActivityType',
      'ac_dictActivityType',
      'accStaff_dictDepCostKind',
      'hr_dictDepCostKind',
      'accStaff_dictBalanceUnit',
      'hr_dictBalanceUnit',
      'accStaff_dictCostPlaceType',
      'hr_dictCostPlaceType',
      'accStaff_dictCostPlaceNumber',
      'hr_dictCostPlaceNumber',
      'accStaff_dictCostType',
      'ac_dictCostType',
      'hr_addDescrPosition',
      'accStaff_addDescrPosition',
      // Тарифікація
      'accStaffFolderTariffing',
      'accStaff_dictTariffingPayEl',
      'hr_dictTariffingPayEl',
      'accStaff_dictEmpCatTarifPos',
      'hr_dictEmpCatTarifPos',
      'accStaff_dictStaffCatAccrual',
      'hr_dictStaffCatAccrual',
      // Інше
      'accStaffFolderOther',
      'accStaff_dictTarifCoeff',
      'hr_dictTarifCoeff',
      'accStaff_dictLivingCost',
      'hr_dictLivingCost',
      'accStaff_dictEducationLevel',
      'hr_dictEducationLevel',
      'accStaff_dictFutureOfWork',
      'hr_dictFutureOfWork',
      // Організації та підрозділи
      'accStaffFolderOrgsAndDeps',
      'accStaff_dictRespEmployee',
      'hr_orgRespPosition',
      // Адмінистративно-територіальний устрій
      'accStaffFolderTerritory',
      'accStaff_dictCountry',
      'ac_dictCountry',
      'accStaff_dictRegion',
      'ac_dictRegion',
      'accStaff_dictCity',
      'ac_dictCity',
      // Посади
      'accStaffFolderPositions',
      'accStaff_dictNameAddition',
      'hr_dictNameAddition'
    ],
    elsRule:
      [
        {
          description: 'Орг Структура',
          entityMask: 'hr_staffUnit',
          methodMask: ['select']
        },
        {
          description: 'Орг Структура',
          entityMask: 'hr_positionVacContest',
          methodMask: ['selectVacancies', 'getVacancies', 'getVacanciesWithVacFrom', 'selectVacanciesWithVacFrom']
        },
        {
          description: 'Тарифні групи організацій',
          entityMask: 'hr_dictTariffGroup',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Тип підпорядкування',
          entityMask: 'hr_dictParentUnitType',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Основні функції організацій та підрозділів',
          entityMask: 'hr_dictBasicFunctn',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Класифікатори професій',
          entityMask: 'hr_dictProfession',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Типи підрозділів',
          entityMask: 'hr_dictDepType',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Типи посад держслужбовців',
          entityMask: 'hr_dictWagePay',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Нарахування для категорій посад',
          entityMask: 'hr_categPayEl',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Вид шкідливих умов праці',
          entityMask: 'hr_dictHarmfulKind',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Група оплати праці держслужбовців',
          entityMask: 'hr_dictStatePay',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Тип організації державних органів',
          entityMask: 'hr_dictGovernmType',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Вид підрозділу',
          entityMask: 'hr_departmentKind',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Напрями діяльності',
          entityMask: 'hr_dictAreasActivity',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Територіальні органи Міністерства доходів і зборів України',
          entityMask: 'ac_dictSprSti',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Територіальні органи Державної казначейської служби України',
          entityMask: 'ac_dictDksu',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Сімейний стан',
          entityMask: 'hr_dictMaritalStatusKind',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Кваліфікаційна категорія персоналу',
          entityMask: 'hr_dictEmpCategory',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Підстава змін окладів',
          entityMask: 'hr_dictReasonAccrual',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Довідник видів посад',
          entityMask: 'hr_dictPositionKind',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Довідник груп посад',
          entityMask: 'hr_dictPositionGroup',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Схема посадових окладів',
          entityMask: 'hr_dictSalaryScheme',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'updateSalarySchemeOrg', 'recalcSalaryScheme',
            'raiseSalaryScheme', 'cancelSalaryScheme']
        },
        {
          description: 'Схема посадових окладів (базові суми)',
          entityMask: 'hr_dictSalarySchemeBase',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Рівень посадового окладу',
          entityMask: 'hr_dictSalarySchemeLevel',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'recalcSalaryScheme']
        },
        {
          description: 'Схема посадових окладів (оклади)',
          entityMask: 'hr_dictSalarySchemeDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Місце виникнення виробничих витрат (МВВ)',
          entityMask: 'ac_dictCostType',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Порядкові номера місця виникнення витрат',
          entityMask: 'hr_dictCostPlaceNumber',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Тип місця виникнення витрат',
          entityMask: 'hr_dictCostPlaceType',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Балансові одиниці',
          entityMask: 'hr_dictBalanceUnit',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Вид підрозділу МВВ',
          entityMask: 'hr_dictDepCostKind',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Види діяльності',
          entityMask: 'ac_dictActivityType',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Складові додаткової інформації посади',
          entityMask: 'hr_addDescrPosition',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Види оплат тарифікаційного списку',
          entityMask: 'hr_dictTariffingPayEl',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Категорії та тарифні розряди посад',
          entityMask: 'hr_dictEmpCatTarifPos',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Нарахування за категоріями персоналу',
          entityMask: 'hr_dictStaffCatAccrual',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Види оплати по посаді',
          entityMask: 'hr_dictPositionPayEl',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadByCategory']
        },
        {
          description: 'Право на відпустку',
          entityMask: 'hr_dictPosVacationPlan',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        }
      ]
  }
]
