module.exports = [
  {
    name: 'acc_reviewDictionaryEmp',
    description: 'Переглядач довідників персоналу',
    description_uk: 'Переглядач довідників персоналу',
    description_ru: 'Просмотрщик справочников персонала',
    description_az: 'Ştat cədvəlinin sorğu kitabçalarına baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmpFolderDictionary',
      'accHREmpDictionary',
      'accHREmpFolderDictVacation',
      'accHREmp_dictVacationKind',
      'hr_dictVacationKind',
      'accHREmp_dictVacationPlanDayList',
      'hr_dictVacationPlanDayList',
      'accHREmp_dictImpartibleVac',
      'hr_dictImpartibleVac',
      'accHREmp_dictVacCompException',
      'hr_dictVacCompException',
      'accHREmpFolderDictMilitary',
      'accHREmp_dictCategMilitary',
      'hr_dictCategMilitary',
      'accHREmp_dictStateMilitary',
      'hr_dictStateMilitary',
      'accHREmpFolderDictBonus',
      'accHREmp_dictBonusKind',
      'hr_dictBonusKind',
      'accHREmp_dictBonusType',
      'hr_dictBonusType',
      'accHREmp_dictBonus',
      'hr_dictBonus',
      'accHREmp_dictPenalty',
      'hr_dictPenalty',
      'accHREmp_dictPenaltyReason',
      'hr_dictPenaltyReason',
      'accHREmpFolderDictEducation',
      'accHREmp_dictEducationLevel',
      'hr_dictEducationLevel',
      'accHREmp_dictAcademStatus',
      'hr_dictAcademStatus',
      'accHREmp_dictBranchScience',
      'hr_dictBranchScience',
      'accHREmp_specialty',
      'hr_specialty',
      'accHREmp_dictLanguage',
      'hr_dictLanguage',
      'accHREmp_dictLanguageLevel',
      'hr_dictLanguageLevel',
      'accHREmp_dictDegree',
      'hr_dictDegree',
      'accHREmp_dictAreasOfEducation',
      'hr_dictAreasOfEducation',
      'accHREmpFolderDictAudit',
      'accHREmp_outgoingFalseFact',
      'hr_outgoingFalseFact',
      'accHREmp_dictAuditOrg',
      'hr_dictAuditOrg',
      'accHREmpFolderDictAnother',
      'accHREmp_dictExperienceByPos',
      'hr_dictExperienceByPos',
      'accHREmp_dictTaskScore',
      'hr_dictTaskScore',
      'accHREmp_dictAddInfKind',
      'hr_dictAddInfKind',
      'accHREmp_dictDisabilityType',
      'hr_dictDisabilityType',
      'accHREmp_dictBenefitsKind',
      'hr_dictBenefitsKind',
      'accHREmp_dictExperience',
      'hr_dictExperience',
      'accHREmp_dictDocKind',
      'ac_dictDocKind',
      'accHREmp_dictCompetency',
      'hr_dictCompetency',
      'accHREmp_dictCauseOfDeath',
      'hr_dictCauseOfDeath',
      'accHREmp_dictKinshipKind',
      'hr_dictKinshipKind',
      'accHREmp_dictPensionType',
      'hr_dictPensionType',
      'accHREmp_contacttype',
      'cdn_contacttype',
      'accHREmp_dictProfCompDevelopForm',
      'hr_dictProfCompDevelopForm',
      'accHREmp_dictNameCase',
      'hr_dictNameCase',
      'accHREmp_dictTrainingKind',
      'hr_dictTrainingKind',
      'accHREmp_dictPublicationKind',
      'hr_dictPublicationKind',
      'accTim_dictTimeGroup',
      'hr_dictTimeGroup',
      'hr_dictPensionAge',
      'accHREmp_dictPensionAge',
      'accHREmp_dictNomMilitaryRank',
      'hr_dictNomMilitaryRank',
      'accHREmp_dictNomMilitaryRankKind',
      'hr_dictNomMilitaryRankKind',
      'hr_addDescrPerson',
      'accHR_addDescrPerson',
      'hr_dictTermMilitaryContract',
      'accHREmp_dictTermMilitaryContract',
      'hr_dictCheckMedical',
      'accHREmp_dictCheckMedical',
      'hr_dictResultMedical',
      'accHREmp_dictResultMedical',
      'accHREmpFolderDictRecruiting',
      'hr_dictTypeOfEmployment',
      'accHREmp_dictTypeOfEmployment',
      'hr_dictTypeOfSourceOfEmployment',
      'accHREmp_dictTypeOfSourceOfEmployment',
      'accHREmp_Assets',
      'hr_Assets',
      'dc_trans_vehicle',
      'accHREmp_trans_vehicle'
    ],
    elsRule:
      [
        {
          description: 'Вид пільги',
          entityMask: 'hr_dictBenefitsKind',
          methodMask: ['select']
        },
        {
          description: 'Вид стажу',
          entityMask: 'hr_dictExperience',
          methodMask: ['select']
        },
        {
          description: 'Іноземні мови',
          entityMask: 'hr_dictLanguage',
          methodMask: ['select']
        },
        {
          description: 'Рівні володіння мовами',
          entityMask: 'hr_dictLanguageLevel',
          methodMask: ['select']
        },
        {
          description: 'Наукові ступені',
          entityMask: 'hr_dictDegree',
          methodMask: ['select']
        },
        {
          description: 'Напрями освіти',
          entityMask: 'hr_dictAreasOfEducation',
          methodMask: ['select']
        },
        {
          description: 'Види документів',
          entityMask: 'ac_dictDocKind',
          methodMask: ['select']
        },
        {
          description: 'Ступені споріднення',
          entityMask: 'hr_dictKinshipKind',
          methodMask: ['select']
        },
        {
          description: 'Компетенції',
          entityMask: 'hr_dictCompetency',
          methodMask: ['select']
        },
        {
          description: 'Бали за завдання',
          entityMask: 'hr_dictTaskScore',
          methodMask: ['select']
        },
        {
          description: 'Тривалість неподільних частин відпусток',
          entityMask: 'hr_dictImpartibleVac',
          methodMask: ['select']
        },
        {
          description: 'Виключення при компенсації відпусток',
          entityMask: 'hr_dictVacCompException',
          methodMask: ['select']
        },
        {
          description: 'Форми підвищення рівня професійної компетентності',
          entityMask: 'hr_dictProfCompDevelopForm',
          methodMask: ['select']
        },
        {
          description: 'Вид професійної підготовки',
          entityMask: 'hr_dictTrainingKind',
          methodMask: ['select']
        },
        {
          description: 'Група елементів обліку робочого часу',
          entityMask: 'hr_dictTimeGroup',
          methodMask: ['select']
        },
        {
          description: 'Категорія',
          entityMask: 'hr_dictMilitaryRanksCategory',
          methodMask: ['select']
        },
        {
          description: 'Доповнення',
          entityMask: 'hr_dictMilitaryRanksAddition',
          methodMask: ['select']
        },
        {
          description: 'Пенсійний вік',
          entityMask: 'hr_dictPensionAge',
          methodMask: ['select']
        },
        {
          description: 'Номенклатура військових звань',
          entityMask: 'hr_dictNomMilitaryRank',
          methodMask: ['select']
        },
        {
          description: 'Типи номенклатур військових звань',
          entityMask: 'hr_dictNomMilitaryRankKind',
          methodMask: ['select']
        },
        {
          description: 'hr_dictCheckMedical',
          entityMask: 'hr_dictCheckMedical',
          methodMask: ['select']
        },
        {
          description: 'hr_empCheckMedical',
          entityMask: 'hr_empCheckMedical',
          methodMask: ['select']
        },
        {
          description: 'hr_dictResultMedical',
          entityMask: 'hr_dictResultMedical',
          methodMask: ['select']
        },
        {
          description: 'cdn_contacttype',
          entityMask: 'cdn_contacttype',
          methodMask: ['select']
        },
        {
          description: 'Вид джерела найму',
          entityMask: 'hr_dictTypeOfSourceOfEmployment',
          methodMask: ['select']
        },
        {
          description: 'Вид найму',
          entityMask: 'hr_dictTypeOfEmployment',
          methodMask: ['select']
        },
        {
          description: 'Майно',
          entityMask: 'hr_Assets',
          methodMask: ['select']
        },
        {
          description: 'Транспортні засоби',
          entityMask: 'trans_vehicle',
          methodMask: ['select']
        },
        {
          description: 'trans_model',
          entityMask: 'trans_model',
          methodMask: ['select']
        }
      ]
  }
]
