module.exports = [
  {
    name: 'acc_reviewDictionaryOrg',
    description: 'Переглядач довідників оргструктури та штатного розпису',
    description_uk: 'Переглядач довідників оргструктури та штатного розпису',
    description_ru: 'Просмотрщик справочников оргструктуры и штатного расписания',
    description_az: 'təşkilatın strukturunun və ştat cədvəlinin sorğu kitabçalarına baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderDictionary',
      'accStaffDictionary',
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
      'hr_dictReasonAccrual',
      'accStaff_dictReasonAccrual',
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
      'accStaff_dictSalaryScheme',
      'hr_dictSalaryScheme',
      'accStaff_dictCostType',
      'ac_dictCostType',
      'accStaff_dictBalanceUnit',
      'hr_dictBalanceUnit',
      'accStaff_dictCostPlaceType',
      'hr_dictCostPlaceType',
      'accStaff_dictActivityType',
      'ac_dictActivityType',
      'accStaff_dictDepCostKind',
      'hr_dictDepCostKind',
      'accStaff_dictCostPlaceNumber',
      'hr_dictCostPlaceNumber',
      'accStaff_dictSalarySchemeLevel',
      'hr_dictSalarySchemeLevel',
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
      'accStaff_dictEmpCategory',
      'hr_dictEmpCategory',
      'accStaff_dictPositionGroup',
      'hr_dictPositionGroup',
      'accStaff_dictPositionKind',
      'hr_dictPositionKind',
      'accStaff_dictNameAddition',
      'hr_dictNameAddition',
      'accStaff_addDescrPosition',
      'hr_addDescrPosition'
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
          methodMask: ['select']
        },
        {
          description: 'Тип підпорядкування',
          entityMask: 'hr_dictParentUnitType',
          methodMask: ['select']
        },
        {
          description: 'Основні функції організацій та підрозділів',
          entityMask: 'hr_dictBasicFunctn',
          methodMask: ['select']
        },
        {
          description: 'Класифікатори професій',
          entityMask: 'hr_dictProfession',
          methodMask: ['select']
        },
        {
          description: 'Довідник посад',
          entityMask: 'hr_dictPosition',
          methodMask: ['select']
        },
        {
          description: 'Типи підрозділів',
          entityMask: 'hr_dictDepType',
          methodMask: ['select']
        },
        {
          description: 'Типи посад держслужбовців',
          entityMask: 'hr_dictWagePay',
          methodMask: ['select']
        },
        {
          description: 'Нарахування для категорій посад',
          entityMask: 'hr_categPayEl',
          methodMask: ['select']
        },
        {
          description: 'Вид шкідливих умов праці',
          entityMask: 'hr_dictHarmfulKind',
          methodMask: ['select']
        },
        {
          description: 'Група оплати праці держслужбовців',
          entityMask: 'hr_dictStatePay',
          methodMask: ['select']
        },
        {
          description: 'Тип організації державних органів',
          entityMask: 'hr_dictGovernmType',
          methodMask: ['select']
        },
        {
          description: 'Вид підрозділу',
          entityMask: 'hr_departmentKind',
          methodMask: ['select']
        },
        {
          description: 'Рівень посадового окладу',
          entityMask: 'hr_dictSalarySchemeLevel',
          methodMask: ['select', 'update']
        }
      ]
  }
]
