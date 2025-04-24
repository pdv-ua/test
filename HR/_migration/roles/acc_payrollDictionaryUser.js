module.exports = [
  {
    name: 'acc_payrollDictionaryUser',
    description: 'Користувач довідників заробітної плати',
    description_uk: 'Користувач довідників заробітної плати',
    description_ru: 'Пользователь справочников заработной платы',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accSalary'],
    shortcutCodes: [
      'saSalaryDictionary',
      'hrPayDictionary',
      'hrPayDictTop',
      'hrPaySettings',
      // База нарахування ЄСВ
      'accPay_maxBaseECB',
      'hr_maxBaseECB',
      // Види доходів фізичних осіб
      'accPay_dictTaxIndivid',
      'hr_dictTaxIndivid',
      // Допомога на поховання СС
      'accPay_dictSumFuneral',
      'hr_dictSumFuneral',
      // Індекс споживчих цін
      'accPay_dictIndexSalary',
      'hr_dictIndexSalary',
      // Календар
      'accPay_Сalendar',
      'tim_calendar',
      // Категорії застрахованих осіб
      'accPay_dictCategoryECB',
      'hr_dictCategoryECB',
      // Мінімальна зарплата
      'accPay_dictSalaryMinSize',
      'hr_dictSalaryMinSize',
      // Підстави обліку спецстажу
      'accPay_dictExperienceSpec',
      'hr_dictExperienceSpec',
      // Пільги ПДФО
      'accPay_taxLimitList',
      'hr_taxLimitList',
      // Пільги для лікарняних
      'accPay_dictSickLimit',
      'hr_dictSickLimit',
      // Причини розбіжності суми для лікарняних
      'accPay_dictSicknessCause',
      'hr_dictSicknessCause',
      // Причини непрацездатності
      'accPay_dictIllnessReason',
      'hr_dictIllnessReason',
      // Прожитковий мінімум
      'accPay_dictLivingCost',
      'hr_dictLivingCost',
      // Надбавки за ранги держслужбовців
      'accPay_dictSalaryRank',
      'hr_dictSalaryRank',
      // Ставки ЄСВ
      'accPay_dictTypeTaxECB',
      'hr_dictTypeTaxECB',
      // Ставки ПДФО
      'accPay_taxRate',
      'hr_taxRate',
      // Тарифні розряди
      'accPay_dictTarifCoeff',
      'hr_dictTarifCoeff',
      'ac_fundSourceList'
    ],
    elsRule: [
      {
        description: 'hr_maxBaseECB',
        entityMask: 'hr_maxBaseECB',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictTaxIndivid',
        entityMask: 'hr_dictTaxIndivid',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictSumFuneral',
        entityMask: 'hr_dictSumFuneral',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictIndexSalary',
        entityMask: 'hr_dictIndexSalary',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_calendarHoliday',
        entityMask: 'hr_calendarHoliday',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_calendarChange',
        entityMask: 'hr_calendarChange',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_calendarHolidayDt',
        entityMask: 'hr_calendarHoliday',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_calendarChangeDt',
        entityMask: 'hr_calendarChange',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictCategoryECB',
        entityMask: 'hr_dictCategoryECB',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictSalaryMinSize',
        entityMask: 'hr_dictSalaryMinSize',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictExperienceSpec',
        entityMask: 'hr_dictExperienceSpec',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_taxLimit',
        entityMask: 'hr_taxLimit',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictIllnessReason',
        entityMask: 'hr_dictIllnessReason',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictLivingCost',
        entityMask: 'hr_dictLivingCost',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictSalaryRank',
        entityMask: 'hr_dictSalaryRank',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictTypeTaxECB',
        entityMask: 'hr_dictTypeTaxECB',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_taxRate',
        entityMask: 'hr_taxRate',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictTarifCoeff',
        entityMask: 'hr_dictTarifCoeff',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictTarifCoeffDet',
        entityMask: 'hr_dictTarifCoeffDet',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictSickLimit',
        entityMask: 'hr_dictSickLimit',
        methodMask: ['select']
      },
      {
        description: 'hr_dictSicknessCause',
        entityMask: 'hr_dictSicknessCause',
        methodMask: [ 'select' ]
      },
      {
        description: 'Джерела фінансування',
        entityMask: 'ac_fundSource',
        methodMask: [ 'select' ]
      }
    ]
  }
]
