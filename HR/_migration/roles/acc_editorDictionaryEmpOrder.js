module.exports = [
  {
    name: 'acc_editorDictionaryEmpOrder',
    description: 'Адміністратор довідників наказів з персоналу',
    description_uk: 'Адміністратор довідників наказів з персоналу',
    description_ru: 'Администратор справочников приказов по персоналу',
    description_az: 'Ştat cədvəli üzrə əmlərin sorğu kitabçalarının administratoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderDictionary',
      'accHRDictionary',
      'accHRFolderDictSick',
      'accHR_dictIllnessKind',
      'hr_dictIllnessKind',
      'accHR_dictIllnessReason',
      'accHR_dictSicknessDay',
      'hr_dictSicknessDay',
      'hr_dictIllnessReason',
      'accHR_dictVacationKind',
      'hr_dictVacationKind',

      'accHRFolderDictContr',
      'accHR_contractor',
      'ac_contractor',
      'accHR_orgbusinesstype',
      'cdn_orgbusinesstype',
      'accHR_corrindex',
      'cdn_corrindex',
      'accHR_orgownershiptype',
      'cdn_orgownershiptype',
      'accHR_contacttype',
      'cdn_contacttype',
      'accHR_dictAlternateContractor',
      'ac_dictAlternateContractor',
      'accHR_bank',
      'ac_bank',
      'accHR_currency',
      'ac_currency',
      'accHRFolderDictBonus',
      'accHR_dictBonusKind',
      'hr_dictBonusKind',
      'accHR_dictBonusType',
      'hr_dictBonusType',
      'accHR_dictBonus',
      'hr_dictBonus',
      'accHR_dictPenalty',
      'hr_dictPenalty',
      'accHR_dictPenaltyReason',
      'hr_dictPenaltyReason',
      'ac_fundSourceList',
      'accHR_dictContractKind',
      'hr_dictContractKind',
      'accHR_payEl',
      'hr_payEl',
      'accHR_dictRankAssignKind',
      'hr_dictRankAssignKind',
      'accHR_dictTask',
      'hr_dictTask',
      'accHR_dictEmpOrderIndex',
      'hr_dictEmpOrderIndex',
      'accHR_dictStaffCat',
      'hr_dictStaffCat',
      'accHR_dictStaffSubCat',
      'hr_dictStaffSubCat',
      'accHR_dictOrderDetReason',
      'hr_dictOrderDetReason',
      'accHR_dictOrderDetReasonDoc',
      'hr_dictOrderDetReasonDoc',
      'accHR_dictVacationCorr',
      'hr_dictVacationCorr',
      'accHR_dictActingReason',
      'hr_dictActingReason',
      'accHR_dictReasonDism',
      'hr_dictReasonDism',
      'accHR_dictReasonMoving',
      'hr_dictReasonMoving',
      'accHR_dictRank',
      'hr_dictRank',
      'hr_dictSpecialRank',
      'accHREmp_dictSpecialRank',
      'accHR_dictEmpOrderText',
      'hr_dictEmpOrderText',
      'accHR_dictTarifCoeff',
      'hr_dictTarifCoeff',
      'accHR_dictAppointKind',
      'hr_dictAppointKind',
      'accHR_dictTempExecution',
      'hr_dictTempExecution',
      'accHREmpFolderDictAnother',
      'accHREmp_dictExperienceByPos',
      'hr_dictExperienceByPos',
      'accHR_dictRankPsCategory',
      'hr_dictRankPsCategory',
      'accHR_dictMissionPurpose',
      'hr_dictMissionPurpose',
      'accHR_dictMissionPhrase',
      'hr_dictMissionPhrase',
      'hr_dictEmpPosAttr',
      'accHR_dictEmpPosAttr',
      'hr_dictReasonAccrual',
      'accHRFolderDictMilitary',
      'accHR_dictMilitaryDuty',
      'hr_dictMilitaryDuty',
      'hr_dictTermContract',
      'accHR_dictTermContract',
      'accStaff_dictSalaryScheme',
      'hr_dictSalaryScheme',
      'accHR_dictParticipantType',
      'hr_dictParticipantType',
      'accHR_dictParticipant',
      'hr_dictParticipant',
      'accHR_dictRestDaySchedule',
      'hr_dictRestDaySchedule',
      'hr_dictEventKnowledg'
    ],
    elsRule: [
      {
        description: 'Типи листів непрацездатності',
        entityMask: 'hr_dictIllnessKind',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'hr_dictSicknessDay',
        entityMask: 'hr_dictSicknessDay',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'hr_dictSicknessDayDt',
        entityMask: 'hr_dictSicknessDayDt',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Причини непрацездатності',
        entityMask: 'hr_dictIllnessReason',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Види відпусток',
        entityMask: 'hr_dictVacationKind',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Контрагент',
        entityMask: 'ac_contractor',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },

      {
        description: 'Тарифні розряди, коефіцієнти',
        entityMask: 'hr_dictTarifCoeff',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'changeTariffCoeff' ]
      },
      {
        description: 'Тарифні розряди, коефіцієнти (оклади)',
        entityMask: 'hr_dictTarifCoeffDet',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Вид нагороди',
        entityMask: 'hr_dictBonusKind',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Тип нагороди',
        entityMask: 'hr_dictBonusType',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },

      {
        description: 'Підстави коригування відпустки',
        entityMask: 'hr_dictVacationCorr',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Ранги держслужбовця',
        entityMask: 'hr_dictRank',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Спеціальні звання',
        entityMask: 'hr_dictSpecialRank',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Тип призначення',
        entityMask: 'hr_dictAppointKind',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Причина звільнення',
        entityMask: 'hr_dictReasonDism',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Причини переміщення',
        entityMask: 'hr_dictReasonMoving',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Термін контракту',
        entityMask: 'hr_dictTermContract',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Довідник країн',
        entityMask: 'cdn_country',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Довідник регіонів',
        entityMask: 'cdn_region',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Населені пункти',
        entityMask: 'cdn_city',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Категорії персоналу',
        entityMask: 'hr_dictStaffCat',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Підкатегорії персоналу',
        entityMask: 'hr_dictStaffSubCat',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Типи організацій',
        entityMask: 'cdn_orgbusinesstype',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Індекси кореспондентів',
        entityMask: 'cdn_corrindex',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Форма власності',
        entityMask: 'cdn_orgownershiptype',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Типи контактів',
        entityMask: 'cdn_contacttype',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Альтернативний одержувач',
        entityMask: 'ac_dictAlternateContractor',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Банк',
        entityMask: 'ac_bank',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'getConfig' ]
      },
      {
        description: 'Валюти',
        entityMask: 'cdn_currency',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Нагорода',
        entityMask: 'hr_dictBonus',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Стягнення',
        entityMask: 'hr_dictPenalty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Причина стягнення',
        entityMask: 'hr_dictPenaltyReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вид договору',
        entityMask: 'hr_dictContractKind',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Джерела фінансування',
        entityMask: 'ac_fundSource',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вид присвоєння рангу держслужбовця',
        entityMask: 'hr_dictRankAssignKind',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Завдання наказів',
        entityMask: 'hr_dictTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Завдання наказів',
        entityMask: 'hr_dictTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Індекс номеру наказу',
        entityMask: 'hr_dictEmpOrderIndex',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава наказу',
        entityMask: 'hr_dictOrderDetReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава-документ наказу',
        entityMask: 'hr_dictOrderDetReasonDoc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Причина виконання обов\'язків',
        entityMask: 'hr_dictActingReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Стандартні значення текстових полів для наказів з персоналу',
        entityMask: 'hr_dictEmpOrderText',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'ТВО за положенням',
        entityMask: 'hr_dictTempExecution',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Стаж роботи за типами посад',
        entityMask: 'hr_dictExperienceByPos',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Ранги держслужбовця по категоріям посади',
        entityMask: 'hr_dictRankPsCategory',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Мета відрядження',
        entityMask: 'hr_dictMissionPurpose',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вимоги до звіту про відрядження',
        entityMask: 'hr_dictMissionPhrase',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Причина присвоєння рангу',
        entityMask: 'hr_dictRankReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Довідник параметрів призначень',
        entityMask: 'hr_dictEmpPosAttr',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава змін окладів',
        entityMask: 'hr_dictReasonAccrual',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Військова служба',
        entityMask: 'hr_dictMilitaryDuty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Адреса',
        entityMask: 'ac_address',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Схема посадових окладів',
        entityMask: 'hr_dictSalaryScheme',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'updateSalarySchemeOrg', 'recalcSalaryScheme',
          'raiseSalaryScheme', 'cancelSalaryScheme'
        ]
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
        description: 'Вид учасника розсилки',
        entityMask: 'hr_dictParticipantType',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Учасник розсилки',
        entityMask: 'hr_dictParticipant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Розпорядок роботи у вихідні/святкові дні',
        entityMask: 'hr_dictRestDaySchedule',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Події ознайомлення',
        entityMask: 'hr_dictEventKnowledg',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'hr_dictReasonTempAvgPay',
        entityMask: 'hr_dictReasonTempAvgPay',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
