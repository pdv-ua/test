const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorDictionaryEmp',
  description: 'Адміністратор довідників персоналу',
  description_uk: 'Адміністратор довідників персоналу',
  description_ru: 'Администратор справочников персонала',
  description_az: 'Ştat cədvəlinin sorğu kitabçalarının administratoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHREmp', 'arm_accAdm'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'search', 'viewPrintForm', 'changeTariffCoeff',
    'updateAttrEntry', 'canEditActive', 'loadDefaultConfig', 'updateDictExperience', 'viewEmployeeAssets']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['ac_counter', ['0-5', 'Нумерація документів']],
    {
      accHREmpFolderDictionary: {
        accHREmpFolderDictVacation: [
          ['hr_dictVacationKind', 'accHREmp_dictVacationKind', ['0-4', 'Види відпусток']],
          ['hr_dictVacationPlanDayList', 'accHREmp_dictVacationPlanDayList',
            ['0-4', 'Дні відпустки за видами відпустки та типами посад', 'hr_dictVacationPlanDay']
          ],
          ['hr_dictImpartibleVac', 'accHREmp_dictImpartibleVac', ['0-4', 'Тривалість неподільних частин відпусток']],
          ['hr_dictVacCompException', 'accHREmp_dictVacCompException', ['0-4', 'Виключення при компенсації відпусток']]
        ],
        accHREmpFolderDictBonus: [
          ['hr_dictBonusKind', 'accHREmp_dictBonusKind', ['0-4', 'Вид нагороди']],
          ['hr_dictBonusType', 'accHREmp_dictBonusType', ['0-4', 'Тип нагороди']],
          ['hr_dictBonus', 'accHREmp_dictBonus', ['0-4,9', 'Нагорода']],
          ['hr_dictPenalty', 'accHREmp_dictPenalty', ['0-4', 'Стягнення']],
          ['hr_dictPenaltyReason', 'accHREmp_dictPenaltyReason', ['0-4', 'Причина стягнення']]
        ],
        accHREmpFolderDictEducation: [
          ['hr_dictEducationLevel', 'accStaff_dictEducationLevel', 'accHREmp_dictEducationLevel', ['0-4', 'Рівень освіти']],
          ['hr_dictAcademStatus', 'accHREmp_dictAcademStatus', ['0-4', 'Вчене звання']],
          ['hr_dictBranchScience', 'accHREmp_dictBranchScience', ['0-4', 'Галузь науки']],
          ['hr_specialty', 'accHREmp_specialty', ['0-4', 'Спеціальність']],
          ['hr_dictLanguage', 'accHREmp_dictLanguage', ['0-4', 'Іноземні мови']],
          ['hr_dictLanguageLevel', 'accHREmp_dictLanguageLevel', ['0-4', 'Рівні володіння мовами']],
          ['hr_dictDegree', 'accHREmp_dictDegree', ['0-4', 'Наукові ступені']],
          ['hr_dictAreasOfEducation', 'accHREmp_dictAreasOfEducation', ['0-4', 'Напрями освіти']],
          ['hr_dictProfCompDevelopForm', 'accHREmp_dictProfCompDevelopForm', ['0-4', 'Форми підвищення рівня професійної компетентності']],
          ['hr_dictTrainingKind', 'accHREmp_dictTrainingKind', ['0-4', 'Вид професійної підготовки']],
          ['hr_dictPublicationKind', 'accHREmp_dictPublicationKind', ['0-4', 'Вид публікації']]
        ],
        accHREmpFolderDictRecruiting: [
          ['hr_dictTypeOfEmployment', 'accHREmp_dictTypeOfEmployment', ['0-4', 'Вид найму']],
          ['hr_dictTypeOfSourceOfEmployment', 'accHREmp_dictTypeOfSourceOfEmployment', ['0-4', 'Вид джерела найму']]
        ],
        accHREmpFolderDictAudit: [
          ['hr_outgoingFalseFact', 'accHREmp_outgoingFalseFact', ['0-4', 'Факти подання неправдивої інформації']],
          ['hr_dictAuditOrg', 'accHREmp_dictAuditOrg', ['0-4', 'Організації спецперевірок']]
        ],
        accHREmpFolderDictAnother: [
          ['hr_dictTaskScore', 'accHREmp_dictTaskScore', ['0-4', 'Бали за завдання']],
          ['hr_dictAddInfKind', 'accHREmp_dictAddInfKind', ['0-4', 'Вид додаткової інформації']],
          ['hr_dictDisabilityType', 'accHREmp_dictDisabilityType', ['0-4', 'Вид інвалідності']],
          ['hr_dictBenefitsKind', 'accHREmp_dictBenefitsKind', ['0-4', 'Вид пільги']],
          ['hr_dictExperience', 'accHREmp_dictExperience', ['0-4, 11', 'Вид стажу']],
          ['ac_dictDocKind', 'accHREmp_dictDocKind', ['0-4', 'Види документів']],
          ['hr_dictCompetency', 'accHREmp_dictCompetency', ['0-4', 'Компетенції']],
          ['hr_dictCauseOfDeath', 'accHREmp_dictCauseOfDeath', ['0-4', 'Причина смерті']],
          ['hr_dictKinshipKind', 'accHREmp_dictKinshipKind', ['0-4', 'Ступені споріднення']],
          ['hr_dictPensionType', 'accHREmp_dictPensionType', ['0-4', 'Тип пенсії']],
          ['cdn_contacttype', 'accHREmp_contacttype', ['0-4', 'Тип контактів']],
          ['hr_dictCategAssets', 'accHREmp_dictCategAssets', ['0-6', 'Категорія майна']],
          ['hr_dictNameCase', 'accHREmp_dictNameCase', ['0-4', 'Налаштування відмінків', 'hr_namecase']],
          ['hr_dictTimeGroup', 'accTim_dictTimeGroup',
            ['0-4', 'Група елементів обліку робочого часу'],
            ['0-4', 'Входимість елементів обліку робочого часу в групу', 'hr_dictTimeCostGroup']
          ],
          ['hr_dictPensionAge', 'accHREmp_dictPensionAge', ['0-4', 'Пенсійний вік']],
          ['hr_addDescrPerson', 'accHR_addDescrPerson'],
          ['hr_dictTypeAsset', 'accHREmp_dictTypeAsset', ['0-6', 'Вид майна']],
          ['hr_dictGroupAssets', 'accHREmp_dictGroupAssets', ['0-6', 'Група майна']],
          ['hr_Assets', 'accHREmp_Assets', ['0-6', 'Майно']],
          ['dc_trans_vehicle', 'accHREmp_trans_vehicle', ['0-4', 'Траспортні засоби', 'trans_vehicle']]
        ],
        accHREmpFolderDictSearch: [
          ['hr_searchEmployeeTemplates', 'accHREmp_empSearchTemplates'],
          ['hr_searchPersonTemplates', 'accHREmp_personSearchTemplates'],
          ['hr_searchPositionTemplates', 'accHREmp_positionSearchTemplates']
        ],
        accHREmpFolderDictMilitary: [
          ['hr_dictCategMilitary', 'accHREmp_dictCategMilitary', ['0-4', 'Категорія обліку військовозобов\'язаних']],
          ['hr_dictStateMilitary', 'accHREmp_dictStateMilitary', ['0-4', 'Стан обліку військовозобов\'язаних']],
          ['hr_dictMilitaryRank', 'accHREmp_dictMilitaryRank', ['0-4', 'Військові звання']],
          ['hr_dictMilitarySpeciality', 'accHREmp_dictMilitarySpeciality', ['0-4', 'Військово-облікові спеціальності']],
          ['hr_dictMilitarySuitable', 'accHREmp_dictMilitarySuitable', ['0-4', 'Придатність до військової служби']],
          ['hr_dictMilitaryProfile', 'accHREmp_dictMilitaryProfile', ['0-4', 'Профілі підготовки офіцерів запасу']],
          ['hr_dictMilitaryGroup', 'accHREmp_dictMilitaryGroup', ['0-4', 'Групи обліку військовозобов\'язаних']],
          ['hr_dictNomMilitaryRank', 'accHREmp_dictNomMilitaryRank', ['0-4', 'Номенклатура військових звань']],
          ['hr_dictNomMilitaryRankKind', 'accHREmp_dictNomMilitaryRankKind', ['0-4', 'Типы номенклатур военных званий']],
          ['hr_dictTermMilitaryContract', 'accHREmp_dictTermMilitaryContract', ['0-4', 'Термін контракту військової служби']],
          ['hr_dictCheckMedical', 'accHREmp_dictCheckMedical', ['0-4', 'Тип медогляду']],
          ['hr_dictResultMedical', 'accHREmp_dictResultMedical', ['0-4', 'Результат медогляду']]
        ]
      },
      accStaffFolderDictionary: [
        ['hr_dictTarifCoeff', 'accStaff_dictTarifCoeff',
          ['0-4,7', 'Тарифні розряди, коефіцієнти'],
          ['0-4', 'Тарифні розряди, коефіцієнти (оклади)', 'hr_dictTarifCoeffDet']
        ],
        ['hr_dictLivingCost', 'accStaff_dictLivingCost', ['0-4', 'Прожитковий мінімум']],
        ['ac_dictCountry', 'accStaff_dictCountry', ['0-4', 'Довідник країн', 'cdn_country']],
        ['ac_dictRegion', 'accStaff_dictRegion', ['0-4', 'Довідник регіонів', 'cdn_region']],
        ['ac_dictCity', 'accStaff_dictCity', ['0-4', 'Населені пункти', 'cdn_city']],
        ['hr_dictFutureOfWork', 'accStaff_dictFutureOfWork', ['0-4', 'Особливості роботи']],
        ['hr_orgRespPosition', 'accStaff_dictRespEmployee', ['0-4', 'Відповідальні особи']]
      ],
      arm_accCfgHrSetup: ['accAcSettingsOrgTemplate', 'ac_settingsOrgTemplate']
    },
    ['',
      ['0-4', 'Заповнення атрибутів за типом посади (по замовченню)', 'hr_positionTypeProps'],
      ['0-4', 'Родичі', 'hr_people'],
      ['0-4', 'Вимога до персоналу', 'hr_dictRequirements'],
      ['0-4', 'Рівень користування ПК', 'hr_dictLevelUsePc'],
      ['0-4', 'Відмінки', 'hr_namecase'],
      ['0-4', 'Підстави для прийому на роботу', 'hr_dictReasonTrialProlong'],
      ['0-4', 'Шаблони пошуку', 'hr_searchTemplate'],
      ['0-4,8', 'Параметри налаштування пунктів наказів (можливі значення)', 'hr_empOrderDetConfigAttr'],
      ['0-4,10', 'Налаштування пунктів наказів (види оплати)', 'hr_empOrderDetConfig'],
      ['0-5', 'Шаблон налаштувань констант організації', 'ac_settingsOrgTemplate'],
      ['0-4', 'Вид стажу', 'hr_dictExperienceDt'],
      ['0-4', 'Військові звання', 'hr_empMilitaryRanks'],
      ['0-4', 'Категорія', 'hr_dictMilitaryRanksCategory'],
      ['0-4', 'Доповнення', 'hr_dictMilitaryRanksAddition'],
      ['0-4', 'Складові додаткової інформації працівника', 'hr_addDescrPerson'],
      ['0-4,11', 'Майно організації у працівника', 'hr_employeeAssets']
    ]
  ]
}
