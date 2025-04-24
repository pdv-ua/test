module.exports = [
  {
    name: 'acc_reviewDictionaryEmpOrder',
    description: 'Переглядач довідників наказів з персоналу',
    description_uk: 'Переглядач довідників наказів з персоналу',
    description_ru: 'Просмотрщик справочников приказов по персоналу',
    description_az: 'Ştat cədvəli üzrə əmlərin sorğu kitabçalarına baxış',
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
      'accHREmp_dictSpecialRank',
      'hr_dictSpecialRank',
      'accHR_dictEmpOrderText',
      'hr_dictEmpOrderText',
      'accHR_dictTarifCoeff',
      'hr_dictTarifCoeff',
      'accHR_dictAppointKind',
      'hr_dictAppointKind',
      'accHR_dictTempExecution',
      'hr_dictTempExecution',
      'accHR_dictRankPsCategory',
      'hr_dictRankPsCategory',
      'accHR_dictMissionPurpose',
      'hr_dictMissionPurpose',
      'accHR_dictMissionPhrase',
      'hr_dictMissionPhrase',

      'accHREmpFolderDictMilitary',
      'accHREmp_dictCategMilitary',
      'hr_dictCategMilitary',
      'accHREmp_dictStateMilitary',
      'hr_dictStateMilitary',
      'accHREmp_dictMilitaryRank',
      'hr_dictMilitaryRank',
      'accHREmp_dictMilitarySpeciality',
      'hr_dictMilitarySpeciality',
      'accHREmp_dictMilitarySuitable',
      'hr_dictMilitarySuitable',
      'accHREmp_dictMilitaryProfile',
      'hr_dictMilitaryProfile',
      'accHREmp_dictMilitaryGroup',
      'hr_dictMilitaryGroup',
      'accHR_dictRankReason',
      'hr_dictRankReason',
      'accHR_dictOrderDetOrderWord',
      'accHR_dictRestDaySchedule',
      'hr_dictRestDaySchedule'
    ],
    elsRule: [
      {
        description: 'Типи листів непрацездатності',
        entityMask: 'hr_dictIllnessKind',
        methodMask: [ 'select' ]
      },
      {
        description: 'Причини непрацездатності',
        entityMask: 'hr_dictIllnessReason',
        methodMask: [ 'select' ]
      },
      {
        description: 'Види відпусток',
        entityMask: 'hr_dictVacationKind',
        methodMask: [ 'select' ]
      },
      {
        description: 'Факти подання неправдивої інформації',
        entityMask: 'hr_outgoingFalseFact',
        methodMask: [ 'select' ]
      },
      {
        description: 'Тарифні розряди, коефіцієнти',
        entityMask: 'hr_dictTarifCoeff',
        methodMask: [ 'select' ]
      },
      {
        description: 'Рівень освіти',
        entityMask: 'hr_dictEducationLevel',
        methodMask: [ 'select' ]
      },
      {
        description: 'Вид нагороди',
        entityMask: 'hr_dictBonusKind',
        methodMask: [ 'select' ]
      },
      {
        description: 'Вчене звання',
        entityMask: 'hr_dictAcademStatus',
        methodMask: [ 'select' ]
      },
      {
        description: 'Галузь науки',
        entityMask: 'hr_dictBranchScience',
        methodMask: [ 'select' ]
      },
      {
        description: 'Категорія обліку військовозобов`язаних',
        entityMask: 'hr_dictCategMilitary',
        methodMask: [ 'select' ]
      },
      {
        description: 'Стан обліку військовозобов`язаних',
        entityMask: 'hr_dictStateMilitary',
        methodMask: [ 'select' ]
      },
      {
        description: 'Військові звання',
        entityMask: 'hr_dictMilitaryRank',
        methodMask: ['select']
      },
      {
        description: 'Військово-облікові спеціальності',
        entityMask: 'hr_dictMilitarySpeciality',
        methodMask: ['select']
      },
      {
        description: 'Придатність до військової служби',
        entityMask: 'hr_dictMilitarySuitable',
        methodMask: ['select']
      },
      {
        description: 'Профілі підготовки офіцерів запасу',
        entityMask: 'hr_dictMilitaryProfile',
        methodMask: ['select']
      },
      {
        description: 'Групи обліку військовозобов\'язаних',
        entityMask: 'hr_dictMilitaryGroup',
        methodMask: ['select']
      },
      {
        description: 'Тип нагороди',
        entityMask: 'hr_dictBonusType',
        methodMask: [ 'select' ]
      },
      {
        description: 'Прожитковий мінімум',
        entityMask: 'hr_dictLivingCost',
        methodMask: [ 'select' ]
      },
      {
        description: 'Надбавки за ранг держслужбовця',
        entityMask: 'hr_dictSalaryRank',
        methodMask: [ 'select' ]
      },
      {
        description: 'Підстави коригування відпустки',
        entityMask: 'hr_dictVacationCorr',
        methodMask: [ 'select' ]
      },
      {
        description: 'Ранги держслужбовця',
        entityMask: 'hr_dictRank',
        methodMask: [ 'select' ]
      },
      {
        description: 'Індекс споживчих цін',
        entityMask: 'hr_dictIndexSalary',
        methodMask: [ 'select' ]
      },
      {
        description: 'Графік роботи',
        entityMask: 'hr_workSchedule',
        methodMask: [ 'select' ]
      },
      {
        description: 'Тип призначення',
        entityMask: 'hr_dictAppointKind',
        methodMask: [ 'select' ]
      },
      {
        description: 'Причина звільнення',
        entityMask: 'hr_dictReasonDism',
        methodMask: [ 'select' ]
      },
      {
        description: 'Причини переміщення',
        entityMask: 'hr_dictReasonMoving',
        methodMask: [ 'select' ]
      },
      {
        description: 'Довідник регіонів',
        entityMask: 'cdn_region',
        methodMask: [ 'select' ]
      },
      {
        description: 'Населені пункти',
        entityMask: 'cdn_city',
        methodMask: [ 'select' ]
      },
      {
        description: 'Вид інвалідності',
        entityMask: 'hr_dictDisabilityType',
        methodMask: [ 'select' ]
      },
      {
        description: 'Категорії персоналу',
        entityMask: 'hr_dictStaffCat',
        methodMask: [ 'select' ]
      },
      {
        description: 'Підкатегорії персоналу',
        entityMask: 'hr_dictStaffSubCat',
        methodMask: [ 'select' ]
      },
      {
        description: 'ТВО за положенням',
        entityMask: 'hr_dictTempExecution',
        methodMask: ['select']
      },
      {
        description: 'Ранги держслужбовця по категоріям посади',
        entityMask: 'hr_dictRankPsCategory',
        methodMask: ['select']
      },
      {
        description: 'Мета відрядження',
        entityMask: 'hr_dictMissionPurpose',
        methodMask: ['select']
      },
      {
        description: 'Вимоги до звіту про відрядження',
        entityMask: 'hr_dictMissionPhrase',
        methodMask: ['select']
      },
      {
        description: 'Причина присвоєння рангу',
        entityMask: 'hr_dictRankReason',
        methodMask: ['select']
      },
      {
        description: 'hr_dictOrderDetOrderWord',
        entityMask: 'hr_dictOrderDetOrderWord',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Розпорядок роботи у вихідні/святкові дні',
        entityMask: 'hr_dictRestDaySchedule',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_dictReasonTempAvgPay',
        entityMask: 'hr_dictReasonTempAvgPay',
        methodMask: ['select']
      }
    ]
  }
]
