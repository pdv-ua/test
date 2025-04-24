const UB = require('@unitybase/ub')
const dateService = require('../../../AC/modules/dataServices/dateService')
const orderService = require('../../../HR/modules/orderService')
const glCore = require('../../../GL/modules/glCore')
module.exports = {
  getConfig,
  getEntityConfig,
  getImpMapValue
}
const configList = {
  'HR': {
    cdn_contacttype: {
      entityName: 'cdn_contacttype',
      impEntityName: 'cdn_importContacttype',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Типи контактів',
      entityDescription_uk: 'Типи контактів',
      entityDescription_ru: 'Типи контактов',
      entityType: '1',
      loadMethod: 'skipLoad',
      sortOrder: 10,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictDisabilityType: entityName => Object.assign(Object.assign({}, cofig[entityName]), { sortOrder: 20 }),
    hr_dictBenefitsKind: {
      entityName: 'hr_dictBenefitsKind',
      impEntityName: 'hr_importDictBenefitsKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Види пільг',
      entityDescription_uk: 'Види пільг',
      entityDescription_ru: 'Виды льгот',
      entityType: '1',
      loadMethod: 'dict',
      sortOrder: 30,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictExperience: entityName => Object.assign(Object.assign({}, cofig[entityName]), { sortOrder: 40, loadMethod: 'skipLoad' }),
    hr_dictVacationKind: {
      entityName: 'hr_dictVacationKind',
      impEntityName: 'hr_importDictVacationKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Види відпусток',
      entityDescription_uk: 'Види відпусток',
      entityDescription_ru: 'Виды отпусков',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 50,
      dependence: {
        dictTimeCostID: 'hr_dictTimeCost',
        payElID: 'hr_payEl'
      },
      exists: dictExist,
      dictList: dictList
    },
    hr_dictBonusKind: {
      entityName: 'hr_dictBonusKind',
      impEntityName: 'hr_importDictBonusKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Види нагород',
      entityDescription_uk: 'Види нагород',
      entityDescription_ru: 'Виды наград',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 60,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictAddInfKind: {
      entityName: 'hr_dictAddInfKind',
      impEntityName: 'hr_importDictAddInfKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Види додаткової інформації',
      entityDescription_uk: 'Види додаткової інформації',
      entityDescription_ru: 'Виды дополнительной информации',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 65,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictBonusType: {
      entityName: 'hr_dictBonusType',
      impEntityName: 'hr_importDictBonusType',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Типи нагород',
      entityDescription_uk: 'Типи нагород',
      entityDescription_ru: 'Типы наград',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 70,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictPensionType: {
      loadDataType: '1',
      entityName: 'hr_dictPensionType',
      impEntityName: 'hr_importDictPensionType',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Типи пенсії',
      entityDescription_uk: 'Типи пенсії',
      entityDescription_ru: 'Типы пенсии',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 465,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictBonus: {
      entityName: 'hr_dictBonus',
      impEntityName: 'hr_importDictBonus',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Нагороди',
      entityDescription_uk: 'Нагороди',
      entityDescription_ru: 'Награды',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 80,
      setDefaultValueOnLoad: (row) => {
        row.isActive = row.isActive === '1'
        row.isEnc = row.isEnc === '1'
      },
      dependence: {
        bonusKindID: 'hr_dictBonusKind',
        bonusTypeID: 'hr_dictBonusType'
      },
      exists: dictExist,
      dictList: dictList
    },
    hr_dictEducationLevel: {
      entityName: 'hr_dictEducationLevel',
      impEntityName: 'hr_importDictEducationLevel',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Рівні освіти',
      entityDescription_uk: 'Рівні освіти',
      entityDescription_ru: 'Уровни образования',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 90,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictLanguageLevel: {
      entityName: 'hr_dictLanguageLevel',
      impEntityName: 'hr_importDictLanguageLevel',
      codeAttr: 'code',
      nameAttr: 'level',
      identifier: 'level',
      entityDescription: 'Рівні володіння мовою',
      entityDescription_uk: 'Рівні володіння мовою',
      entityDescription_ru: 'Уровни владения языком',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 100,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictLanguage: {
      entityName: 'hr_dictLanguage',
      impEntityName: 'hr_importDictLanguage',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Іноземні мови',
      entityDescription_uk: 'Іноземні мови',
      entityDescription_ru: 'Иностранные языки',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 110,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictKinshipKind: {
      entityName: 'hr_dictKinshipKind',
      impEntityName: 'hr_importDictKinshipKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Ступені споріднення',
      entityDescription_uk: 'Ступені споріднення',
      entityDescription_ru: 'Степени родства',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 120,
      exists: dictExist,
      dictList: dictList
    },
    ac_dictDocKind: entityName => Object.assign(Object.assign({}, cofig[entityName]), { sortOrder: 130 }),
    hr_dictSalaryScheme: {
      entityName: 'hr_dictSalaryScheme',
      impEntityName: 'hr_importDictSalaryScheme',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Схема посадових окладів',
      entityDescription_uk: 'Схема посадових окладів',
      entityDescription_ru: 'Схема должностных окладов',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 125,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictPenalty: {
      entityName: 'hr_dictPenalty',
      impEntityName: 'hr_importDictPenalty',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Види стягнень',
      entityDescription_uk: 'Види стягнень',
      entityDescription_ru: 'Виды взысканий',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 140,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictCases: {
      loadDataType: '1',
      entityName: 'hr_dictCases',
      impEntityName: 'hr_importDictCases',
      codeAttr: '',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Відмінки підрозділів',
      entityDescription_uk: 'Відмінки підрозділів',
      entityDescription_ru: 'Відмінки підрозділів',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 145,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictPenaltyReason: {
      entityName: 'hr_dictPenaltyReason',
      impEntityName: 'hr_importDictPenaltyReason',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Причини стягнень',
      entityDescription_uk: 'Причини стягнень',
      entityDescription_ru: 'Причины взысканий',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 160,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictMaritalStatusKind: {
      entityName: 'hr_dictMaritalStatusKind',
      impEntityName: 'hr_importDictMaritalStatusKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Сімейні стани',
      entityDescription_uk: 'Сімейні стани',
      entityDescription_ru: 'Семейные состояния',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 180,
      exists: dictExist,
      dictList: dictList
    },
    cdn_country: {
      entityName: 'cdn_country',
      impEntityName: 'hr_importCdn_country',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Країни світу',
      entityDescription_uk: 'Країни світу',
      entityDescription_ru: 'Страны мира',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 200,
      exists: dictExist,
      dictList: dictList
    },
    hr_specialty: {
      entityName: 'hr_specialty',
      impEntityName: 'hr_importSpecialty',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Спеціальності',
      entityDescription_uk: 'Спеціальності',
      entityDescription_ru: 'Специальности',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 220,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictEmpCategory: {
      entityName: 'hr_dictEmpCategory',
      impEntityName: 'hr_importDictEmpCategory',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Кваліфікаційна категорія',
      entityDescription_uk: 'Кваліфікаційна категорія',
      entityDescription_ru: 'Квалификационная категория',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 240,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictProfession: {
      loadDataType: '1',
      entityName: 'hr_dictProfession',
      impEntityName: 'hr_importDictProfession',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Кваліфікаційна категорія',
      entityDescription_uk: 'Кваліфікаційна категорія',
      entityDescription_ru: 'Квалификационная категория',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 245,
      dependence: {
        dictContractKindID: 'hr_dictContractKind',
        dictWagePayID: 'hr_dictWagePay'
      },
      exists: dictExist,
      dictList: dictList
    },
    hr_dictStaffCat: entityName => Object.assign(Object.assign({}, cofig[entityName]), { sortOrder: 260, loadMethod: 'skipLoad' }),
    hr_dictRank: {
      entityName: 'hr_dictRank',
      impEntityName: 'hr_importDictRank',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Ранги держслужбовця',
      entityDescription_uk: 'Ранги держслужбовця',
      entityDescription_ru: 'Ранги госслужащего',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 280,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictBranchScience: {
      entityName: 'hr_dictBranchScience',
      impEntityName: 'hr_importDictBranchScience',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Галузі науки',
      entityDescription_uk: 'Галузі науки',
      entityDescription_ru: 'Области науки',
      loadMethod: 'dict',
      entityType: '1',
      sortOrder: 300,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictDegree: {
      entityName: 'hr_dictDegree',
      impEntityName: 'hr_importDictDegree',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Наукові ступені',
      entityDescription_uk: 'Наукові ступені',
      entityDescription_ru: 'Научные степени',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 320,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictAcademStatus: {
      entityName: 'hr_dictAcademStatus',
      impEntityName: 'hr_importDictAcademStatus',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Вчені звання',
      entityDescription_uk: 'Вчені звання',
      entityDescription_ru: 'Ученые звания',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 340,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictMilitaryRank: {
      entityName: 'hr_dictMilitaryRank',
      impEntityName: 'hr_importDictMilitaryRank',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Військові звання',
      entityDescription_uk: 'Військові звання',
      entityDescription_ru: 'Воинские звания',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 360,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictMilitarySpeciality: {
      entityName: 'hr_dictMilitarySpeciality',
      impEntityName: 'hr_importDictMilitarySpeciality',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Військово-облікові спеціальності',
      entityDescription_uk: 'Військово-облікові спеціальності',
      entityDescription_ru: 'Военно-учетные специальности',
      loadMethod: 'dictLoad',
      entityType: '1',
      sortOrder: 380,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictMilitaryProfile: {
      entityName: 'hr_dictMilitaryProfile',
      impEntityName: 'hr_importDictMilitaryProfile',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Профілі підготовки офіцерів запасу',
      entityDescription_uk: 'Профілі підготовки офіцерів запасу',
      entityDescription_ru: 'Профили подготовки офицеров запаса',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 400,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictProfCompDevelopForm: {
      entityName: 'hr_dictProfCompDevelopForm',
      impEntityName: 'hr_impDictProfCompDevelopForm',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Форма підвищення рівня професійної компетентності',
      entityDescription_uk: 'Форма підвищення рівня професійної компетентності',
      entityDescription_ru: 'Форма повышения уровня профессиональной компетентности',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 420,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictProfCompetency: {
      entityName: 'hr_dictProfCompetency',
      impEntityName: 'hr_importDictProfCompetency',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: ['name', 'groupCategory'],
      entityDescription: 'Професійні компетентності',
      entityDescription_uk: 'Професійні компетентності',
      entityDescription_ru: 'Профессиональные компетентности',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 440,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictTrainingTopic: {
      entityName: 'hr_dictTrainingTopic',
      impEntityName: 'hr_importDictTrainingTopic',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: ['name', 'dictProfCompetencyID'],
      entityDescription: 'Орієнтовні тематики професійного навчання',
      entityDescription_uk: 'Орієнтовні тематики професійного навчання',
      entityDescription_ru: 'Ориентировочные тематики профессионального обучения',
      loadMethod: 'dictLoad',
      entityType: '1',
      sortOrder: 460,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictTrainingKind: {
      entityName: 'hr_dictTrainingKind',
      impEntityName: 'hr_importDictTrainingKind',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Види професійної підготовки',
      entityDescription_uk: 'Види професійної підготовки',
      entityDescription_ru: 'Виды профессиональной подготовки',
      loadMethod: 'dictLoad',
      entityType: '1',
      sortOrder: 480,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictStateMilitary: {
      entityName: 'hr_dictStateMilitary',
      impEntityName: 'hr_importDictStateMilitary',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Стани обліку військовозобов`язаних',
      entityDescription_uk: 'Стани обліку військовозобов`язаних',
      entityDescription_ru: 'Состояния учета военнообязанных',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 490,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictCategMilitary: {
      entityName: 'hr_dictCategMilitary',
      impEntityName: 'hr_importDictCategMilitary',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Категорії обліку військовозобов`язаних',
      entityDescription_uk: 'Категорії обліку військовозобов`язаних',
      entityDescription_ru: 'Категории учета военнообязанных',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 500,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictMilitarySuitable: {
      entityName: 'hr_dictMilitarySuitable',
      impEntityName: 'hr_importDictMilitarySuitable',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Придатність до військової служби',
      entityDescription_uk: 'Придатність до військової служби',
      entityDescription_ru: 'Категории годности к военной службе',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 600,
      exists: dictExist,
      dictList: dictList
    },
    hr_dictMilitaryGroup: {
      entityName: 'hr_dictMilitaryGroup',
      impEntityName: 'hr_importDictMilitaryGroup',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Групи обліку військовозобов`язаних',
      entityDescription_uk: 'Групи обліку військовозобов`язаних',
      entityDescription_ru: 'Группы учета военнообязанных',
      loadMethod: 'skipLoad',
      entityType: '1',
      sortOrder: 700,
      exists: dictExist,
      dictList: dictList
    }
  },
  'studentCSV': {
    hr_studentCard: {
      loadDataType: '1',
      entityName: 'hr_studentCard',
      impEntityName: 'hr_importStudentCard',
      codeAttr: 'code',
      nameAttr: 'name',
      identifier: 'name',
      entityDescription: 'Студенти',
      entityDescription_uk: 'Студенти',
      entityDescription_ru: 'Студенти',
      entityType: '5',
      loadMethod: 'studentCard',
      sortOrder: 1,
      exists: dictExist,
      dictList: dictList
    }
  }
}

function getConfig (appCode) {
  return appCode ? configList[appCode] : cofig
}

function getEntityConfig (entityName, appCode = null) {
  if (cofig[entityName] && !appCode) {
    return cofig[entityName]
  }
  if (appCode && configList[appCode][entityName]) {
    return configList[appCode][entityName]
  }
  for (const c in configList) {
    let eConfig = configList[c][entityName]
    if (eConfig) {
      return eConfig
    }
  }
  return null
}

const cofig = {
  // Довідники 1
  cdn_orgbusinesstype: {
    loadDataType: '1',
    entityName: 'cdn_orgbusinesstype',
    impEntityName: 'ac_importOrgbusinesstype',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Типи організацій, контрагентов',
    entityDescription_uk: 'Типи організацій, контрагентов',
    entityDescription_ru: 'Типи організацій, контрагентов',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 5,
    exists: dictExist,
    dictList: dictList
  },
  ac_bank: {
    loadDataType: '1',
    entityName: 'ac_bank',
    impEntityName: 'hr_importBank',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: ['name', 'MFO'],
    entityDescription: 'Банк',
    entityDescription_uk: 'Банк',
    entityDescription_ru: 'Банк',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 10,
    exists: dictExist,
    dictList: dictList
  },
  gl_account: {
    loadDataType: '1',
    entityName: 'gl_account',
    impEntityName: 'hr_importAccount',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Бухгалтерські рахунки',
    entityDescription_uk: 'Бухгалтерські рахунки',
    entityDescription_ru: 'Бухгалтерские счета',
    entityType: '1',
    loadMethod: 'skipLoad',
    sortOrder: 20,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictVacationKind: {
    loadDataType: '1',
    entityName: 'hr_dictVacationKind',
    impEntityName: 'hr_importDictVacationKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види відпусток',
    entityDescription_uk: 'Види відпусток',
    entityDescription_ru: 'Виды отпусков',
    loadMethod: 'skipLoad',
    entityType: '1',
    sortOrder: 30,
    dependence: {
      dictTimeCostID: 'hr_dictTimeCost',
      payElID: 'hr_payEl'
    },
    exists: dictExist,
    dictList: dictList
  },
  ac_dictDocKind: {
    loadDataType: '1',
    entityName: 'ac_dictDocKind',
    impEntityName: 'hr_importDictDocKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види документів',
    entityDescription_uk: 'Види документів',
    entityDescription_ru: 'Виды документов',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 40,
    defaultValues: {
      docType: () => {
        return '1'
      }
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictDisabilityType: {
    loadDataType: '1',
    entityName: 'hr_dictDisabilityType',
    impEntityName: 'hr_ImportDictDisabilityType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види інвалідності',
    entityDescription_uk: 'Види інвалідності',
    entityDescription_ru: 'Виды инвалидности',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 50,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictBonusKind: {
    loadDataType: '1',
    entityName: 'hr_dictBonusKind',
    impEntityName: 'hr_importDictBonusKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види нагород',
    entityDescription_uk: 'Види нагород',
    entityDescription_ru: 'Виды наград',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 60,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictAddInfKind: {
    loadDataType: '1',
    entityName: 'hr_dictAddInfKind',
    impEntityName: 'hr_importDictAddInfKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види додаткової інформації',
    entityDescription_uk: 'Види додаткової інформації',
    entityDescription_ru: 'Виды дополнительной информации',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 65,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictTimeCost: {
    loadDataType: '1',
    entityName: 'hr_dictTimeCost',
    impEntityName: 'hr_importDictTimeCost',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види обліку робочого часу',
    entityDescription_uk: 'Види обліку робочого часу',
    entityDescription_ru: 'Виды учета рабочего времени',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 70,
    setDefaultValueOnLoad: (row) => {
      row.isClose = row.isClose === '1'
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictBenefitsKind: {
    loadDataType: '1',
    entityName: 'hr_dictBenefitsKind',
    impEntityName: 'hr_importDictBenefitsKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види пільг',
    entityDescription_uk: 'Види пільг',
    entityDescription_ru: 'Виды льгот',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 80,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictTrainingKind: {
    loadDataType: '1',
    entityName: 'hr_dictTrainingKind',
    impEntityName: 'hr_importDictTrainingKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види професійної підготовки',
    entityDescription_uk: 'Види професійної підготовки',
    entityDescription_ru: 'Виды профессиональной подготовки',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 90,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictExperience: {
    loadDataType: '1',
    entityName: 'hr_dictExperience',
    impEntityName: 'hr_importDictExperience',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види стажів',
    entityDescription_uk: 'Види стажів',
    entityDescription_ru: 'Виды стажей',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 100,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictPenalty: {
    loadDataType: '1',
    entityName: 'hr_dictPenalty',
    impEntityName: 'hr_importDictPenalty',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види стягнень',
    entityDescription_uk: 'Види стягнень',
    entityDescription_ru: 'Виды взысканий',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 110,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictCases: {
    loadDataType: '1',
    entityName: 'hr_dictCases',
    impEntityName: 'hr_importDictCases',
    codeAttr: '',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Відмінки підрозділів',
    entityDescription_uk: 'Відмінки підрозділів',
    entityDescription_ru: 'Відмінки підрозділів',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 145,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictMilitaryRank: {
    loadDataType: '1',
    entityName: 'hr_dictMilitaryRank',
    impEntityName: 'hr_importDictMilitaryRank',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Військові звання',
    entityDescription_uk: 'Військові звання',
    entityDescription_ru: 'Воинские звания',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 120,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictMilitarySpeciality: {
    loadDataType: '1',
    entityName: 'hr_dictMilitarySpeciality',
    impEntityName: 'hr_importDictMilitarySpeciality',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Військово-облікові спеціальності',
    entityDescription_uk: 'Військово-облікові спеціальності',
    entityDescription_ru: 'Военно-учетные специальности',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 130,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictAcademStatus: {
    loadDataType: '1',
    entityName: 'hr_dictAcademStatus',
    impEntityName: 'hr_importDictAcademStatus',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Вчені звання',
    entityDescription_uk: 'Вчені звання',
    entityDescription_ru: 'Ученые звания',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 140,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictBranchScience: {
    loadDataType: '1',
    entityName: 'hr_dictBranchScience',
    impEntityName: 'hr_importDictBranchScience',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Галузі науки',
    entityDescription_uk: 'Галузі науки',
    entityDescription_ru: 'Области науки',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 150,
    exists: dictExist,
    dictList: dictList
  },
  hr_workSchedule: {
    loadDataType: '1',
    entityName: 'hr_workSchedule',
    impEntityName: 'hr_importWorkSchedule',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Графіки роботи',
    entityDescription_uk: 'Графіки роботи',
    entityDescription_ru: 'Графики работы',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 160,
    setDefaultValueOnLoad: (row) => {
      row.isPayDayOff = row.isPayDayOff === '1'
      row.isPayHoliday = row.isPayHoliday === '1'
      row.isHoliday = row.isHoliday === '1'
      row.isLastHoliday = row.isLastHoliday === '1'
      row.isChangeDay = row.isChangeDay === '1'
      row.isCalendar = row.isCalendar === '1'
      row.isMtCount = row.isMtCount === '1'
    },
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      }
    },
    exists: dictExist,
    dictList: (params, orgID) => {
      const attr = ['ID', params.codeAttr]
      if (params.nameAttr && params.nameAttr !== '') {
        attr.push(params.nameAttr)
      }
      const data = UB.Repository(params.entityName).attrs(attr).orderBy((params.nameAttr && params.nameAttr !== '') ? params.nameAttr : params.codeAttr)
        .where('organizationID', 'isNull', undefined, 'orgIsNull')
        .where('organizationID', '=', orgID, 'org')
        .logic('([org] OR [orgIsNull])')
        .selectAsObject({
          [params.nameAttr]: 'name',
          [params.codeAttr]: 'code'
        })
      data.forEach(row => {
        row.description = `${row.name}${(params.nameAttr && params.nameAttr !== '' && row.code) ? `[${row.code}]` : ''}`
      })
      return data
    }
  },
  hr_workScheduleDays: {
    loadDataType: '1',
    entityName: 'hr_workScheduleDays',
    impEntityName: 'hr_importWorkScheduleDays',
    codeAttr: 'ID',
    nameAttr: '',
    identifier: 'ID',
    entityDescription: 'Періоди графіків роботи',
    entityDescription_uk: 'Періоди графіків роботи',
    entityDescription_ru: 'Периоды графиков работы',
    entityType: '1',
    loadMethod: 'detail',
    sortOrder: 170,
    parentAttrIdentifier: 'workScheduleID',
    parentEntityName: 'hr_workSchedule',
    parentImpEntityName: 'hr_importWorkSchedule',
    map: false,
    inAttrConfig: {
      hoursWorkNight: (value) => { return value || 0 },
      hoursWorkEvening: (value) => { return value || 0 }
    },
    dependence: {
      dictTimeCostID: 'hr_dictTimeCost',
      workScheduleID: 'hr_workSchedule'
    }
  },
  hr_dictMilitaryGroup: {
    loadDataType: '1',
    entityName: 'hr_dictMilitaryGroup',
    impEntityName: 'hr_importDictMilitaryGroup',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Групи обліку військовозобов`язаних',
    entityDescription_uk: 'Групи обліку військовозобов`язаних',
    entityDescription_ru: 'Группы учета военнообязанных',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 180,
    exists: dictExist,
    dictList: dictList
  },
  ac_fundSource: {
    loadDataType: '1',
    entityName: 'ac_fundSource',
    impEntityName: 'hr_importFundSource',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Джерело фінансування',
    entityDescription_uk: 'Джерело фінансування',
    entityDescription_ru: 'Источник финансирования',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 190,
    exists: dictExist,
    dictList: dictList
  },
  ac_dictProgClass: {
    loadDataType: '1',
    entityName: 'ac_dictProgClass',
    impEntityName: 'ac_importDictProgClass',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Код програмної класифікації',
    entityDescription_uk: 'Код програмної класифікації',
    entityDescription_ru: 'Код программной классификации',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 195,
    exists: dictExist,
    dictList: dictList
  },
  hr_taxLimit: {
    loadDataType: '1',
    entityName: 'hr_taxLimit',
    impEntityName: 'hr_importTaxLimit',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Довідник пільг ПДФО',
    entityDescription_uk: 'Довідник пільг ПДФО',
    entityDescription_ru: 'Справочник льгот ПДФО',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 200,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictLanguage: {
    loadDataType: '1',
    entityName: 'hr_dictLanguage',
    impEntityName: 'hr_importDictLanguage',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Іноземні мови',
    entityDescription_uk: 'Іноземні мови',
    entityDescription_ru: 'Иностранные языки',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 210,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictCategoryECB: {
    loadDataType: '1',
    entityName: 'hr_dictCategoryECB',
    impEntityName: 'hr_importDictCategoryECB',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Категорії застрахованих осіб',
    entityDescription_uk: 'Категорії застрахованих осіб',
    entityDescription_ru: 'Категории застрахованных лиц',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 215,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictCategMilitary: {
    loadDataType: '1',
    entityName: 'hr_dictCategMilitary',
    impEntityName: 'hr_importDictCategMilitary',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Категорії обліку військовозобов`язаних',
    entityDescription_uk: 'Категорії обліку військовозобов`язаних',
    entityDescription_ru: 'Категории учета военнообязанных',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 220,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictStaffCat: {
    loadDataType: '1',
    entityName: 'hr_dictStaffCat',
    impEntityName: 'hr_importDictStaffCat',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Категорії персоналу',
    entityDescription_uk: 'Категорії персоналу',
    entityDescription_ru: 'Категории персонала',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 230,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictEmpCategory: {
    loadDataType: '1',
    entityName: 'hr_dictEmpCategory',
    impEntityName: 'hr_importDictEmpCategory',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Кваліфікаційна категорія',
    entityDescription_uk: 'Кваліфікаційна категорія',
    entityDescription_ru: 'Квалификационная категория',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 240,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictProfession: {
    loadDataType: '1',
    entityName: 'hr_dictProfession',
    impEntityName: 'hr_importDictProfession',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Класифікатор професій',
    entityDescription_uk: 'Класифікатор професій',
    entityDescription_ru: 'Класифікатор професій',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 245,
    dependence: {
      dictContractKindID: 'hr_dictContractKind',
      dictWagePayID: 'hr_dictWagePay'
    },
    exists: dictExist,
    dictList: dictList
  },
  ac_contractor: {
    loadDataType: '1',
    entityName: 'ac_contractor',
    impEntityName: 'hr_importContractor',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Контрагенти',
    entityDescription_uk: 'Контрагенти',
    entityDescription_ru: 'Контрагенты',
    setDefaultValueOnLoad: (row) => {
      row.nonResident = row.nonResident === '1'
    },
    // inAttrConfig: {
    // orgBusinessTypeID: getOrgBusinessType
    // },
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 250,
    exists: dictExist,
    dictList: dictList,
    dependence: {
      orgBusinessTypeID: 'cdn_orgbusinesstype'
    }
  },
  ac_contrAccount: {
    loadDataType: '1',
    entityName: 'ac_contrAccount',
    impEntityName: 'hr_importContrAccount',
    codeAttr: 'code',
    nameAttr: '',
    identifier: 'code',
    entityDescription: 'Розрахункові рахунки контрагентів',
    entityDescription_uk: 'Розрахункові рахунки контрагентів',
    entityDescription_ru: 'Расчетные счета контрагентов',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 260,
    map: false,
    dependence: { organizationID: 'ac_contractor', bankID: 'ac_bank' },
    defaultValues: {
      currencyID: () => {
        return UB.Repository('cdn_currency')
          .attrs('ID')
          .where('code3', '=', 'UAH')
          .selectScalar()
      }
    },
    exists: dictExist,
    dictList: dictList
  },
  cdn_country: {
    loadDataType: '1',
    entityName: 'cdn_country',
    impEntityName: 'hr_importCdn_country',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Країни світу',
    entityDescription_uk: 'Країни світу',
    entityDescription_ru: 'Страны мира',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 270,
    exists: dictExist,
    dictList: dictList
  },
  ac_dictCostType: {
    loadDataType: '1',
    entityName: 'ac_dictCostType',
    impEntityName: 'hr_importDictCostType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'code',
    entityDescription: 'Місце виникнення виробничих витрат',
    entityDescription_uk: 'Місце виникнення виробничих витрат',
    entityDescription_ru: 'Місце виникнення виробничих витрат',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 205,
    dependence: {
      accountID: 'gl_account'
    },
    beforeInsert: (orgID, row, importParams, params, map) => {
      const attrs = ['dictBalanceUnit', 'dictActivityType', 'dictDepCostKind', 'dictCostPlaceType', 'dictCostPlaceNumber']

      attrs.forEach(attr => {
        if (row[`${attr}Code`] && row[`${attr}Name`]) {
          row[`${attr}ID`] = getDictValue(`hr_${attr}`, row[`${attr}Code`], row[`${attr}Name`])
        }
        delete row[`${attr}Code`]
        delete row[`${attr}Name`]
      })
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictBonus: {
    loadDataType: '1',
    entityName: 'hr_dictBonus',
    impEntityName: 'hr_importDictBonus',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Нагороди',
    entityDescription_uk: 'Нагороди',
    entityDescription_ru: 'Награды',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 280,
    dependence: {
      bonusKindID: 'hr_dictBonusKind',
      bonusTypeID: 'hr_dictBonusType'
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictAreasOfEducation: {
    loadDataType: '1',
    entityName: 'hr_dictAreasOfEducation',
    impEntityName: 'hr_importDictAreasOfEducation',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Напрями освіти',
    entityDescription_uk: 'Напрями освіти',
    entityDescription_ru: 'Нправления образования',
    entityDescription_az: 'Təhsil sahələri',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 290,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictDegree: {
    loadDataType: '1',
    entityName: 'hr_dictDegree',
    impEntityName: 'hr_importDictDegree',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Наукові ступені',
    entityDescription_uk: 'Наукові ступені',
    entityDescription_ru: 'Научные степени',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 300,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictTrainingTopic: {
    loadDataType: '1',
    entityName: 'hr_dictTrainingTopic',
    impEntityName: 'hr_importDictTrainingTopic',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: ['name', 'dictProfCompetencyID'],
    entityDescription: 'Орієнтовні тематики професійного навчання',
    entityDescription_uk: 'Орієнтовні тематики професійного навчання',
    entityDescription_ru: 'Ориентировочные тематики профессионального обучения',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 310,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictStaffSubCat: {
    loadDataType: '1',
    entityName: 'hr_dictStaffSubCat',
    impEntityName: 'hr_importDictStaffSubCat',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Підкатегорії персоналу',
    entityDescription_uk: 'Підкатегорії персоналу',
    entityDescription_ru: 'Подкатегории персонала',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 320,
    dependence: { dictStaffCatID: 'hr_dictStaffCat', payStaffCatID: 'hr_dictStaffCat' },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictMilitarySuitable: {
    loadDataType: '1',
    entityName: 'hr_dictMilitarySuitable',
    impEntityName: 'hr_importDictMilitarySuitable',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Придатність до військової служби',
    entityDescription_uk: 'Придатність до військової служби',
    entityDescription_ru: 'Категории годности к военной службе',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 330,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictRankAssignKind: {
    loadDataType: '1',
    entityName: 'hr_dictRankAssignKind',
    impEntityName: 'hr_importDictRankAssignKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Вид присвоєння рангу держслужбовця',
    entityDescription_uk: 'Вид присвоєння рангу держслужбовця',
    entityDescription_ru: 'Вид присвоєння рангу держслужбовця',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 335,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictPenaltyReason: {
    loadDataType: '1',
    entityName: 'hr_dictPenaltyReason',
    impEntityName: 'hr_importDictPenaltyReason',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Причини стягнень',
    entityDescription_uk: 'Причини стягнень',
    entityDescription_ru: 'Причины взысканий',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 340,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictProfCompetency: {
    loadDataType: '1',
    entityName: 'hr_dictProfCompetency',
    impEntityName: 'hr_importDictProfCompetency',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: ['name', 'groupCategory'],
    entityDescription: 'Професійні компетентності',
    entityDescription_uk: 'Професійні компетентності',
    entityDescription_ru: 'Профессиональные компетентности',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 350,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictMilitaryProfile: {
    loadDataType: '1',
    entityName: 'hr_dictMilitaryProfile',
    impEntityName: 'hr_importDictMilitaryProfile',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Профілі підготовки офіцерів запасу',
    entityDescription_uk: 'Профілі підготовки офіцерів запасу',
    entityDescription_ru: 'Профили подготовки офицеров запаса',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 360,
    exists: dictExist,
    dictList: dictList
  },
  ac_dictProject: {
    loadDataType: '1',
    entityName: 'ac_dictProject',
    impEntityName: 'ac_importDictProject',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Проєкт',
    entityDescription_uk: 'Проєкт',
    entityDescription_ru: 'Проект',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 365,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictRank: {
    loadDataType: '1',
    entityName: 'hr_dictRank',
    impEntityName: 'hr_importDictRank',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Ранги держслужбовця',
    entityDescription_uk: 'Ранги держслужбовця',
    entityDescription_ru: 'Ранги госслужащего',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 370,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictLanguageLevel: {
    loadDataType: '1',
    entityName: 'hr_dictLanguageLevel',
    impEntityName: 'hr_importDictLanguageLevel',
    codeAttr: 'code',
    nameAttr: 'level',
    identifier: 'level',
    entityDescription: 'Рівні володіння мовою',
    entityDescription_uk: 'Рівні володіння мовою',
    entityDescription_ru: 'Уровни владения языком',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 380,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictEducationLevel: {
    loadDataType: '1',
    entityName: 'hr_dictEducationLevel',
    impEntityName: 'hr_importDictEducationLevel',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Рівні освіти',
    entityDescription_uk: 'Рівні освіти',
    entityDescription_ru: 'Уровни образования',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 390,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictTarifCoeff: {
    loadDataType: '1',
    entityName: 'hr_dictTarifCoeff',
    impEntityName: 'hr_importDictTarifCoeff',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Тарифний розряд',
    entityDescription_uk: 'Тарифний розряд',
    entityDescription_ru: 'Тарифный разряд',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 400,
    setDefaultValueOnLoad: (row) => {
      row.baseAccrual = row.baseAccrual === '1'
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictMaritalStatusKind: {
    loadDataType: '1',
    entityName: 'hr_dictMaritalStatusKind',
    impEntityName: 'hr_importDictMaritalStatusKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Сімейні стани',
    entityDescription_uk: 'Сімейні стани',
    entityDescription_ru: 'Семейные состояния',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 410,
    exists: dictExist,
    dictList: dictList
  },
  hr_specialty: {
    loadDataType: '1',
    entityName: 'hr_specialty',
    impEntityName: 'hr_importSpecialty',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Спеціальності',
    entityDescription_uk: 'Спеціальності',
    entityDescription_ru: 'Специальности',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 420,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictStateMilitary: {
    loadDataType: '1',
    entityName: 'hr_dictStateMilitary',
    impEntityName: 'hr_importDictStateMilitary',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Стани обліку військовозобов`язаних',
    entityDescription_uk: 'Стани обліку військовозобов`язаних',
    entityDescription_ru: 'Состояния учета военнообязанных',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 430,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictKinshipKind: {
    loadDataType: '1',
    entityName: 'hr_dictKinshipKind',
    impEntityName: 'hr_importDictKinshipKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Ступені споріднення',
    entityDescription_uk: 'Ступені споріднення',
    entityDescription_ru: 'Степени родства',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 440,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictSalaryScheme: {
    loadDataType: '1',
    entityName: 'hr_dictSalaryScheme',
    impEntityName: 'hr_importDictSalaryScheme',
    codeAttr: '',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Схема посадових окладів',
    entityDescription_uk: 'Схема посадових окладів',
    entityDescription_ru: 'Схема должностных окладов',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 445,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictSalarySchemeLevel: {
    loadDataType: '1',
    entityName: 'hr_dictSalarySchemeLevel',
    impEntityName: 'hr_importDictSalarySchemeLevel',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Рівень посадового окладу',
    entityDescription_uk: 'Рівень посадового окладу',
    entityDescription_ru: 'Уровень должностного оклада',
    entityDescription_az: 'Rəsmi əmək haqqı səviyyəsi',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 446,
    inAttrConfig: {
      accrualSum: convertNumber,
      accrualSumMin: convertNumber,
      accrualSumMax: convertNumber
    },
    dependence: {
      dictPositionID: 'hr_dictPosition',
      dictSalarySchemeID: 'hr_dictSalaryScheme'
    },
    beforeInsert: (orgID, row, importParams, params, map) => {
      let result = null
      result = {}
      result.saved = {
        dictSalarySchemeLevelID: row.ID,
        accrualSumMax: row.accrualSumMax,
        accrualSumMin: row.accrualSumMin,
        accrualSum: row.accrualSum,
        dateFrom: row.dateFrom,
        dateTo: row.dateTo
      }
      delete row.accrualSumMax
      delete row.accrualSumMin
      delete row.accrualSum
      delete row.dateFrom
      delete row.dateTo
      return result
    },
    afterInsert: (orgID, row, importParams, params, map, beforeInsert) => {
      if (beforeInsert.saved.accrualSum || beforeInsert.saved.accrualSumMin || beforeInsert.saved.accrualSumMax) {
        const dictSalarySchemeDetStore = UB.DataStore('hr_dictSalarySchemeDet')
        const SchemeDetID = dictSalarySchemeDetStore.generateID()
        dictSalarySchemeDetStore.run('insert', {
          isImportOperation: true,
          execParams: {
            ID: SchemeDetID,
            dictSalarySchemeLevelID: row.ID,
            accrualSum: beforeInsert.saved.accrualSum || beforeInsert.saved.accrualSumMin || beforeInsert.saved.accrualSumMax,
            accrualSumMin: beforeInsert.saved.accrualSumMin || beforeInsert.saved.accrualSumMax || beforeInsert.saved.accrualSum,
            accrualSumMax: beforeInsert.saved.accrualSumMax || beforeInsert.saved.accrualSumMin || beforeInsert.saved.accrualSum,
            dateFrom: beforeInsert.saved.dateFrom ? beforeInsert.saved.dateFrom : '',
            dateTo: beforeInsert.saved.dateTo ? beforeInsert.saved.dateTo : ''
          }
        })
        dictSalarySchemeDetStore.freeNative()
      }
    },
    exists: dictExist,
    dictList: dictList
  },
  cdn_contacttype: {
    loadDataType: '1',
    entityName: 'cdn_contacttype',
    impEntityName: 'cdn_importContacttype',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Типи контактів',
    entityDescription_uk: 'Типи контактів',
    entityDescription_ru: 'Типи контактов',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 450,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictBonusType: {
    loadDataType: '1',
    entityName: 'hr_dictBonusType',
    impEntityName: 'hr_importDictBonusType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Типи нагород',
    entityDescription_uk: 'Типи нагород',
    entityDescription_ru: 'Типы наград',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 460,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictPensionType: {
    loadDataType: '1',
    entityName: 'hr_dictPensionType',
    impEntityName: 'hr_importDictPensionType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Типи пенсії',
    entityDescription_uk: 'Типи пенсії',
    entityDescription_ru: 'Типы пенсии',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 465,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictProfCompDevelopForm: {
    loadDataType: '1',
    entityName: 'hr_dictProfCompDevelopForm',
    impEntityName: 'hr_impDictProfCompDevelopForm',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Форма підвищення рівня професійної компетентності',
    entityDescription_uk: 'Форма підвищення рівня професійної компетентності',
    entityDescription_ru: 'Форма повышения уровня профессиональной компетентности',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 470,
    exists: dictExist,
    dictList: dictList
  },

  hr_dictDepType: {
    loadDataType: '1',
    entityName: 'hr_dictDepType',
    impEntityName: 'hr_importDictDepType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Тип підрозділу',
    entityDescription_uk: 'Тип підрозділу',
    entityDescription_ru: 'Тип подразделения',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 480,
    exists: dictExist,
    dictList: dictList
  },
  hr_departmentKind: {
    loadDataType: '1',
    entityName: 'hr_departmentKind',
    impEntityName: 'hr_importDepartmentKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Вид підрозділу',
    entityDescription_uk: 'Вид підрозділу',
    entityDescription_ru: 'Вид подразделения',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 490,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictContractKind: {
    loadDataType: '1',
    entityName: 'hr_dictContractKind',
    impEntityName: 'hr_importDictContractKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види договору',
    entityDescription_uk: 'Види договору',
    entityDescription_ru: 'Види договору',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 500,
    exists: dictExist,
    dictList: dictList
  },
  // Оргструктура
  hr_organization: {
    loadDataType: '2',
    entityName: 'hr_organization',
    impEntityName: 'hr_importOrganization',
    codeAttr: 'EDRPOUCode',
    nameAttr: 'name',
    identifier: 'EDRPOUCode',
    entityDescription: 'Організації',
    entityDescription_uk: 'Організації',
    entityDescription_ru: 'Організации',
    entityType: '1',
    loadMethod: 'org',
    sortOrder: 1010,
    attrsConfig: {
      parentUnitID: (value, orgID) => { return (!value || value === 0) ? null : getImpMapValue(value, orgID, 'hr_organization') }
    },
    exists: orgExist,
    dictList: orgDictList
  },
  hr_department: {
    loadDataType: '2',
    entityName: 'hr_department',
    impEntityName: 'hr_importDepartment',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Підрозділи',
    entityDescription_uk: 'Підрозділи',
    entityDescription_ru: 'Подразделения',
    entityType: '1',
    loadMethod: 'org',
    sortOrder: 1020,
    additionalData: { entity: 'hr_departmentAddParams', attrKey: 'departmentID' },
    setDefaultValueOnLoad: (row) => {
      row.liquidate = row.liquidate === '1'
      if (!row.fullName || row.fullName === '') {
        if (row.name && row.name !== '') {
          row.fullName = row.name
        }
      }
    },
    attrsConfig: {
      parentUnitID: (value, orgID, rowOrgID) => { return (!value || value === 0) ? rowOrgID : getImpMapValue(value, orgID, 'hr_department') },
      state: (value, orgID) => {
        return (!value || value === '') ? 'ACTIVE' : value
      }
    },
    dependence: {
      dictDepTypeID: 'hr_dictDepType',
      departmentKindID: 'hr_departmentKind',
      employeeChiefID: 'hr_employee',
      curatorID: 'hr_employee'
    },
    exists: orgDepExist,
    dictList: orgDictList
  },
  hr_dictStatePay: {
    loadDataType: '2',
    entityName: 'hr_dictStatePay',
    impEntityName: 'hr_importDictStatePay',
    codeAttr: 'groupN',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Група оплати праці держслужбовців',
    entityDescription_uk: 'Група оплати праці держслужбовців',
    entityDescription_ru: 'Группа оплаты труда госслужащих',
    entityDescription_az: 'Dövlət qulluqçularının əmək haqqı qrupu',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 1025,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictPositionGroup: {
    loadDataType: '2',
    entityName: 'hr_dictPositionGroup',
    impEntityName: 'hr_importDictPositionGroup',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Група посади',
    entityDescription_uk: 'Група посади',
    entityDescription_ru: 'Група должности',
    entityDescription_az: 'İşçi heyəti kateqoriyası',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 1030,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictPositionKind: {
    loadDataType: '2',
    entityName: 'hr_dictPositionKind',
    impEntityName: 'hr_importDictPositionKind',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Вид посади',
    entityDescription_uk: 'Вид посади',
    entityDescription_ru: 'Вид должности',
    entityDescription_az: 'Vəzifə növü',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 1030,
    exists: dictExist,
    dictList: dictList
  },
  hr_dictPosition: {
    loadDataType: '2',
    entityName: 'hr_dictPosition',
    impEntityName: 'hr_importDictPosition',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Довідник посад',
    entityDescription_uk: 'Довідник посад',
    entityDescription_ru: 'Справочник должностей',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 1040,
    dependence: {
      dictStaffCatID: 'hr_dictStaffCat',
      dictProfessionID: 'hr_dictProfession',
      dictStatePayID: 'hr_dictStatePay'
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_dictNameAddition: {
    loadDataType: '2',
    entityName: 'hr_dictNameAddition',
    impEntityName: 'hr_importDictNameAddition',
    codeAttr: '',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Доповнення до назви',
    entityDescription_uk: 'Доповнення до назви',
    entityDescription_ru: 'Дополнение к названию',
    entityDescription_az: 'Başlığa əlavə',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 1045,
    exists: dictExist,
    dictList: dictList
  },
  hr_position: {
    loadDataType: '2',
    entityName: 'hr_position',
    impEntityName: 'hr_importPosition',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Штатні посади',
    entityDescription_uk: 'Штатні посади',
    entityDescription_ru: 'Штатные должности',
    entityType: '1',
    loadMethod: 'org',
    sortOrder: 1080,
    additionalData: { entity: 'hr_positionAddParams', attrKey: 'positionID' },
    setDefaultValueOnLoad: (row) => {
      row.liquidate = row.liquidate === '1'
      row.isOrgBoss = row.isOrgBoss === '1'
      row.reformer = row.reformer === '1'
    },
    dependence: {
      payElID: 'hr_payEl',
      dictPositionID: 'hr_dictPosition',
      dictFundSourceID: 'ac_fundSource',
      dictStaffCatID: 'hr_dictStaffCat',
      dictStaffSubCatID: 'hr_dictStaffSubCat',
      dictPositionGroupID: 'hr_dictPositionGroup',
      dictPositionKindID: 'hr_dictPositionKind',
      dictSalarySchemeLevelID: 'hr_dictSalarySchemeLevel',
      dictTarifCoeffID: 'hr_dictTarifCoeff',
      dictEmpCategoryID: 'hr_dictEmpCategory',
      workScheduleID: 'hr_workSchedule',
      dictCostTypeID: 'ac_dictCostType',
      dictStatePayID: 'hr_dictStatePay',
      nameAdditionID: 'hr_dictNameAddition'
    },
    inAttrConfig: {
      quantity: convertNumber,
      accrualSum: convertNumber
    },
    attrsConfig: {
      parentUnitID: (value, orgID, rowOrgID) => { return (!value || value === 0) ? rowOrgID : getImpMapValue(value, orgID, 'hr_department') }
    },
    exists: orgPositionExist,
    dictList: orgDictList
  },
  hr_positionFundSource: {
    loadDataType: '2',
    entityName: 'hr_positionFundSource',
    impEntityName: 'hr_importPositionFundSource',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Деталізація записів штатних посад',
    entityDescription_uk: 'Деталізація записів штатних посад',
    entityDescription_ru: 'Детализация записей штатных должностей',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 1085,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      quantity: convertNumber
    },
    dependence: {
      positionID: 'hr_position',
      dictFundSourceID: 'ac_fundSource'
    },
    afterInsert: (orgID, row, importParams, params, map, beforeInsert, errorMessages, impID) => {
      const inputID = UB.Repository('hr_importMap').attrs('inputID')
        .where('outputID', '=', row.positionID)
        .where('orgID', '=', orgID)
        .where('entityName', '=', 'hr_position')
        .limit(1)
        .selectSingle()
      const sumQuantityPositionFundSource = UB.Repository('hr_importPositionFundSource').attrs(['SUM([quantity])'])
        .where('positionID', '=', inputID.inputID)
        .where('orgID', '=', orgID)
        .limit(1)
        .selectSingle()
      const sumQuantityPosition = UB.Repository('hr_position').attrs(['ID', 'quantity', 'code', 'name', 'parentUnitID'])
        .where('mi_data_id', '=', row.positionID)
        .where('state', '=', 'ACTIVE')
        .orderByDesc('mi_dateTo')
        .limit(1)
        .selectSingle()
      if (sumQuantityPositionFundSource['SUM([quantity])'] !== sumQuantityPosition.quantity) {
        const department = UB.Repository('hr_department').attrs(['name'])
          .where('mi_data_id', '=', sumQuantityPosition.parentUnitID)
          .where('state', '=', 'ACTIVE')
          .orderByDesc('mi_dateTo')
          .limit(1)
          .selectSingle()
        errorMessages.push(UB.i18n(`ID(${impID}) У підрозділі ${department.name} посада "${sumQuantityPosition.code} ${sumQuantityPosition.name}" кількість ставок = ${sumQuantityPosition.quantity} ,що не відповідає сумарній кількості ставок по джерелам = ${sumQuantityPositionFundSource['SUM([quantity])']}`).substring(0, 1999))
      }
    }
  },
  hr_positionAccrual: {
    loadDataType: '2',
    entityName: 'hr_positionAccrual',
    impEntityName: 'hr_importPositionAccrual',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Нарахування посади',
    entityDescription_uk: 'Нарахування посади',
    entityDescription_ru: 'Начиления должности',
    entityDescription_az: 'Vəzifənin hesablanması',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 1090,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      positionID: 'hr_position',
      payElID: 'hr_payEl'
    }
  },
  ac_orgAccount: {
    loadDataType: '2',
    entityName: 'ac_orgAccount',
    impEntityName: 'hr_importOrgAccount',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Розрахункові рахунки організації',
    entityDescription_uk: 'Розрахункові рахунки організації',
    entityDescription_ru: 'Расчетные счета организации',
    entityType: '1',
    loadMethod: 'dict',
    map: false,
    sortOrder: 1350,
    attrsConfig: {
      bankID: (value, orgID) => { return getImpMapValue(value, orgID, 'ac_bank') }
    },
    defaultValues: {
      organizationID: (value, orgID) => { return orgID },
      currencyID: (value) => {
        return UB.Repository('cdn_currency')
          .attrs('ID')
          .where('code3', '=', value ? String(value) : 'UAH')
          .selectScalar()
      }
    },
    exists: dictExist,
    dictList: dictList
  },
  // Персонал
  hr_employee: {
    loadDataType: '3',
    entityName: 'hr_employee',
    impEntityName: 'hr_importEmployee',
    codeAttr: 'taxCode',
    nameAttr: 'fullFIO',
    identifier: 'taxCode',
    entityDescription: 'Фізичні особи',
    entityDescription_uk: 'Фізичні особи',
    entityDescription_ru: 'Физические лица',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2040,
    attrsConfig: {
      // birthDate: convertDate
    },
    setDefaultValueOnLoad: (row) => {
      row.isCitizen = row.isCitizen === '1'
      row.isInitiated = row.isInitiated === '1'
      if (!row.shortFIO || row.shortFIO === '') {
        if (row.lastName && row.lastName !== '') {
          row.shortFIO = row.lastName
          if (row.firstName && row.firstName !== '') {
            row.shortFIO = row.shortFIO + ' ' + row.firstName[0] + '.'
            if (row.middleName && row.middleName !== '') {
              row.shortFIO = row.shortFIO + ' ' + row.middleName[0] + '.'
            }
          }
        }
      }
      if (!row.fullFIO || row.fullFIO === '') {
        if (row.lastName && row.lastName !== '') {
          row.fullFIO = row.lastName
          if (row.firstName && row.firstName !== '') {
            row.fullFIO = row.fullFIO + ' ' + row.firstName
            if (row.middleName && row.middleName !== '') {
              row.fullFIO = row.fullFIO + ' ' + row.middleName
            }
          }
        }
      }
    },
    dependence: {
      dictEducationLevelID: 'hr_dictEducationLevel',
      citizenshipID: 'cdn_country',
      dictMaritalStatusKindID: 'hr_dictMaritalStatusKind',
      pensionTypeID: 'hr_dictPensionType',
      pensionDocID: 'hr_employeeDocs'
    },
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      }
    },
    inAttrConfig: {
      dictTaxCodeReasonID: (value) => {
        return value ? UB.Repository('hr_dictTaxCodeReason').attrs('ID').where('code', '=', value).selectScalar() : null
      },
      sexType: (value) => {
        return value === 'Ж' ? 'W' : value === 'Ч' ? 'M' : value
      },
      fullFIO: (value, orgID, entityName, row, importParams) => {
        let fullFIO = (value !== '' && value) ? value.replace(/[«´»„“‘’'"`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
        let fullFIOList = fullFIO.split(' ')
        if (fullFIO !== '' && fullFIO) {
          if (!row.shortFIO || row.shortFIO === '') {
            row.shortFIO = getShortFIO(fullFIO, importParams)
          }
          if (!row.firstName || row.firstName === '') {
            row.firstName = fullFIO.split(' ')[1] || null
          }
          if (!row.lastName || row.lastName === '') {
            row.lastName = (importParams && importParams.isUseRegOriginal) ? (fullFIO.split(' ')[0] || '') : (fullFIO.split(' ')[0] || '').toUpperCase()
            fullFIOList[0] = row.lastName
          }
          if (!row.middleName || row.middleName === '') {
            row.middleName = fullFIO.split(' ')[2] || null
          }
        }
        return fullFIOList.join(' ')
      },
      shortFIO: (value) => {
        return (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
      },
      firstName: (value) => {
        return (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
      },
      lastName: (value, orgID, entityName, row, importParams) => {
        value = (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
        return (importParams && importParams.isUseRegOriginal) ? value : value.toUpperCase()
      },
      middleName: (value) => {
        return (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
      }
    },
    outAttrConfig: {
      taxCode: (value, orgID, row) => {
        if (value !== '' && value) {
          if (!row.empTaxCodeType) {
            row.empTaxCodeType = value.length === 9 ? 'IDCARD' : value.length === 8 ? 'PASSPORT' : 'TAXCODE'
          }
          if (row.empTaxCodeType !== 'TAXCODE') {
            row.dictTaxCodeReasonID = UB.Repository('hr_dictTaxCodeReason').attrs('ID').where('code', '=', '02').selectScalar() || null
          }
        }
        return value
      }
    },
    exists: dictExist,
    dictList: dictList
  },
  ac_employeeOrg: {
    loadDataType: '3',
    entityName: 'ac_employeeOrg',
    impEntityName: 'ac_importEmployeeOrg',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Особи - організації',
    entityDescription_uk: 'Особи - організації',
    entityDescription_ru: 'Физические лица - организации',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2041,
    map: false,
    dependence: {
      employeeID: 'hr_employee',
      organizationID: 'hr_organization'
    },
    checkAddRow: (orgID, row) => {
      if (row.employeeID && row.organizationID) {
        const exists = UB.Repository('ac_employeeOrg')
          .attrs(['ID'])
          .where('organizationID', '=', row.organizationID)
          .where('employeeID', '=', row.employeeID)
          .selectSingle()
        return !exists
      } else {
        return true
      }
    }
  },
  hr_employeeNumber: {
    loadDataType: '3',
    entityName: 'hr_employeeNumber',
    impEntityName: 'hr_importEmployeeNumber',
    codeAttr: 'tabNum',
    nameAttr: 'descriptionWithDates',
    identifier: 'tabNum',
    entityDescription: 'Працівники (Особові рахунки)',
    entityDescription_uk: 'Працівники (Особові рахунки)',
    entityDescription_ru: 'Работники (Лицевые счета)',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2050,
    orgAttr: 'orgID',
    dependence: { employeeID: 'hr_employee', payOutID: 'hr_payOut' },
    defaultValues: {
      orgID: (orgID) => {
        return orgID
      }
    },
    inAttrConfig: {
      appointmentDate: convertDate,
      appointmentOrderDate: convertDate
    },
    removeAttr: ['taxCode'],
    removeAttrBeforeUpdate: ['appointmentDate', 'appointmentOrderDate', 'appointmentOrderNumber',
      'description', 'payOutID', 'personalAccount'],
    exists: employeeNumberExistWithOrg,
    dictList: dictListWithOrg
  },
  hr_employeePosition: {
    loadDataType: '3',
    entityName: 'hr_employeePosition',
    impEntityName: 'hr_importEmployeePosition',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Призначення працівників',
    entityDescription_uk: 'Призначення працівників',
    entityDescription_ru: 'Назначения работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2060,
    map: false,
    orgAttr: 'organizationID',
    setDefaultValueOnLoad: (row) => {
      row.isIndex = row.isIndex === '1'
      row.isResponsible = row.isResponsible === '1'
    },
    inAttrConfig: {
      accrualSum: convertNumber,
      mtCount: convertNumber
    },
    dependence: {
      employeeID: 'hr_employee',
      employeeNumberID: 'hr_employeeNumber',
      departmentID: 'hr_department',
      positionID: 'hr_position',
      dictPositionID: 'hr_dictPosition',
      workScheduleID: 'hr_workSchedule',
      dictStaffCatID: 'hr_dictStaffCat',
      dictFundSourceID: 'ac_fundSource',
      dictCategoryECBID: 'hr_dictCategoryECB',
      dictTarifCoeffID: 'hr_dictTarifCoeff',
      accountID: 'gl_account',
      payElID: 'hr_payEl',
      dictCostTypeID: 'ac_dictCostType',
      dictProgClassID: 'ac_dictProgClass',
      dictContractKindID: 'hr_dictContractKind',
      dictRankID: 'hr_dictRank'
    },
    loadData: (orgID) => {
      return UB.Repository('hr_importEmployeePosition')
        .attrs(['*'])
        .where('orgID', '=', orgID)
        .orderBy('workPlace')
        .orderBy('employeeNumberID')
        .orderBy('dateFrom')
        .orderBy('impID')
        .selectAsObject()
    },
    checkBeforeInsert: (orgID, row) => {
      const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['dateFrom', 'dateTo']).selectById(row.employeeNumberID)
      if (employeeNumber) {
        const dateFrom = dateService.shiftDate(Math.max(dateService.shiftDate(row.dateFrom), dateService.shiftDate(employeeNumber.dateFrom)))
        const dateTo = dateService.shiftDate(Math.min(dateService.shiftDate(row.dateTo), dateService.shiftDate(employeeNumber.dateTo)))
        if (dateFrom <= dateTo) {
          row.dateFrom = dateFrom
          row.dateTo = dateTo
        }
      }
    },
    removeAttr: ['orderNumber', 'orderDate', 'taxCode', 'tabNum', 'employeeNumberDateFrom'],
    afterInsert: (orgID, row, importParams, params, map, beforeInsert) => {
      if (beforeInsert) {
        beforeInsert.workbookRecord.employeePositionID = row.ID
        orderService.createWorkbookRecord(beforeInsert.workbookRecord, beforeInsert.saved)
      }
      if (row.dictFundSourceID && row.ID && row.employeeNumberID) {
        const store = UB.DataStore('hr_empPosFundSource')
        const empPosFundSource = UB.Repository('hr_empPosFundSource').attrs(['ID', 'dictFundSourceID']).where('employeePositionID', '=', row.ID).selectAsObject()
        empPosFundSource.forEach(row => {
          store.run('delete', {
            execParams: { ID: row.ID }
          })
        })
        store.run('insert', {
          execParams: {
            employeeNumberID: row.employeeNumberID,
            employeePositionID: row.ID,
            dictFundSourceID: row.dictFundSourceID,
            mtCount: 1
          }
        })
      }
    },
    beforeInsert: (orgID, row, importParams, params, map) => {
      if (row.dictCostTypeID) {
        if (!importParams.dimension) {
          importParams.dimension = {}
        }
        if (!importParams.dimension.dictCostTypeID) {
          importParams.dimension.dictCostTypeID = UB.Repository('gl_dimension').attrs(['ID']).where('entityName', '=', 'ac_dictCostType').selectScalar()
        }
        if (importParams.dimension.dictCostTypeID) {
          row.d0 = importParams.dimension.dictCostTypeID
          row.d0Value = row.dictCostTypeID
        }
      } else {
        row.d0 = null
        row.d0Value = null
      }
      delete row.dictCostTypeID
      if ((!params.isUpdate && map && map.outputID) || (!params.isAddNew && (!map || !map.outputID))) {
        return null
      }
      let result = null
      const store = UB.DataStore('hr_orderPay')
      const orderPayStore = UB.DataStore('hr_orderPay')
      const empOrderStore = UB.DataStore('hr_empOrder')
      const empOrderParaStore = UB.DataStore('hr_empOrderAppointDet')
      const employeeNumber = UB.Repository('hr_employeeNumberS').attrs(['ID', 'dateFrom', 'orderID', 'paraID', 'tabNum']).selectById(row.employeeNumberID)
      const employeePosition = (map && map.outputID) ? UB.Repository('hr_employeePositionS').attrs(['ID', 'orderID', 'paraID', 'orderID.orderClass.entityName', 'orderID.mi_deleteUser']).selectById(map.outputID) : null
      let isUpdate = false
      if (map && map.outputID) {
        if (employeePosition) {
          if (employeePosition['orderID.orderClass.entityName'] === 'hr_empOrder') {
            if (!employeePosition['orderID.mi_deleteUser'] && params.createStaffOrder && dateService.shiftDate(row.dateTo).getTime() === dateService.maxDate().getTime()) {
              isUpdate = true
            } else {
              store.execSQL(`UPDATE hr_empOrderDet set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where orderID = :ID:`,
                { deleteDate: new Date(), userID: 10, ID: employeePosition.orderID })
              store.execSQL(`UPDATE hr_empOrderAppointDet set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where orderID = :ID:`,
                { deleteDate: new Date(), userID: 10, ID: employeePosition.orderID })
              store.execSQL(`UPDATE hr_empOrder set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate:, orderState = :orderState:  where ID = :ID:`,
                { deleteDate: new Date(), userID: 10, ID: employeePosition.orderID, orderState: 'PROJECT' })
              store.execSQL(`UPDATE hr_order set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate:, orderState = :orderState:  where ID = :ID:`,
                { deleteDate: new Date(), userID: 10, ID: employeePosition.orderID, orderState: 'PROJECT' })
              store.execSQL(`UPDATE hr_employeeWorkbook set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate: where employeePositionID = :employeePositionID:`,
                { deleteDate: new Date(), userID: 10, employeePositionID: employeePosition.ID, orderState: 'PROJECT' })
            }
          } else if (params.createStaffOrder && dateService.shiftDate(row.dateTo).getTime() === dateService.maxDate().getTime()) {
            store.execSQL(`UPDATE hr_orderPay set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate:, orderState = :orderState:  where ID = :ID:`,
              { deleteDate: new Date(), userID: 10, ID: employeePosition.orderID, orderState: 'PROJECT' })
            store.execSQL(`UPDATE hr_order set mi_deleteUser = :userID:, mi_deleteDate = :deleteDate:, orderState = :orderState:  where ID = :ID:`,
              { deleteDate: new Date(), userID: 10, ID: employeePosition.orderID, orderState: 'PROJECT' })
          } else {
            isUpdate = true
          }
        }
      }

      if (isUpdate) {
        const employeePosition = UB.Repository('hr_employeePositionS').attrs(['orderID', 'paraID', 'orderID.orderClass.entityName']).selectById(map.outputID)
        if (employeePosition) {
          if (employeePosition['orderID.orderClass.entityName'] === 'hr_empOrder') {
            const onDate = dateService.shiftDate(employeeNumber.dateFrom)
            const position = row.positionID ? (UB.Repository('hr_position')
              .attrs(['ID', 'positionType', 'psCategory.name', 'fullNameNom', 'fullName'])
              .where('orgID', '=', orgID)
              .where('mi_data_id', '=', row.positionID)
              .misc({ __mip_recordhistory_all: true })
              .orderByDesc('mi_dateTo')
              .limit(1)
              .selectSingle() || {}) : {}
            const employeeWorkbook = UB.Repository('hr_employeeWorkbook')
              .attrs(['ID'])
              .where('employeePositionID', '=', map.outputID)
              .limit(1)
              .selectSingle()
            const appointOrder = `Наказ про призначення № ${row.orderNumber ? row.orderNumber : ''} від ${dateService.formatDate(onDate)}`
            const orderParams = {
              orderNumber: row.orderNumber ? row.orderNumber : '',
              orderDate: row.orderDate ? dateService.shiftDate(row.orderDate) : onDate,
              entryDate: row.orderDate ? dateService.shiftDate(row.orderDate) : onDate,
              description: appointOrder,
              impDateAppoint: onDate,
              comment: `import ${dateService.formatDate(row.orderDate ? dateService.shiftDate(row.orderDate) : onDate)}`,
              orderNumberFull: row.orderNumber ? row.orderNumber : ''
            }
            let empOrderUpdate = ''
            let orderUpdate = ''
            Object.keys(orderParams).forEach(name => {
              empOrderUpdate += (empOrderUpdate !== '' ? ', ' : '') + `${name} = :${name}:`
              if (['orderNumber', 'orderDate', 'entryDate', 'description'].includes(name)) {
                orderUpdate += (orderUpdate !== '' ? ', ' : '') + `${name} = :${name}:`
              }
            })
            orderParams.ID = employeePosition.orderID
            store.execSQL(`UPDATE hr_empOrder set ${empOrderUpdate}, orderState = 'POSTED' where ID = :ID:`, orderParams)
            store.execSQL(`UPDATE hr_order set ${orderUpdate}, orderState = 'POSTED' where ID = :ID:`, orderParams)
            let detUpdate = ''
            let paraDetUpdate = ''
            if (!row.workScheduleID) { row.workScheduleID = UB.Repository('hr_workSchedule').attrs('ID').where('code', '=', 'Std').selectScalar() }
            if (!row.dictContractKindID) { row.dictContractKindID = UB.Repository('hr_dictContractKind').attrs('ID').where('code', '=', '01').selectScalar() }
            const detParams = {
              departmentID: row.departmentID,
              positionID: position.ID,
              employeeID: row.employeeID,
              dateFrom: dateService.shiftDate(row.dateFrom),
              dateTo: dateService.shiftDate(row.dateTo),
              workPlace: row.workPlace || '1',
              contractType: row.contractType || '1',
              workerType: row.workerType || '1',
              mtCount: row.mtCount || 1,
              accrualSum: row.accrualSum,
              payElID: row.payElID,
              dictContractKindID: row.dictContractKindID,
              workScheduleID: row.workScheduleID,
              dictStaffCatID: row.dictStaffCatID,
              dictCategoryECBID: row.dictCategoryECBID,
              tabNum: employeeNumber.tabNum,
              dateStartWork: onDate,
              appointmentOrderDate: row.orderDate ? dateService.shiftDate(row.orderDate) : dateService.shiftDate(row.dateFrom),
              appointmentOrderNumber: row.orderNumber ? row.orderNumber : 'Імпорт'
            }
            Object.keys(detParams).forEach(name => {
              detUpdate += (detUpdate !== '' ? ', ' : '') + `${name} = :${name}:`
              if (['departmentID', 'positionID', 'employeeID', 'dateFrom', 'dateTo'].includes(name)) {
                paraDetUpdate += (paraDetUpdate !== '' ? ', ' : '') + `${name} = :${name}:`
              }
            })
            detParams.ID = employeePosition.paraID
            store.execSQL(`UPDATE hr_empOrderAppointDet set ${detUpdate} where ID = :ID:`, detParams)
            store.execSQL(`UPDATE hr_empOrderDet set ${paraDetUpdate} where ID = :ID:`, detParams)
            if (employeeWorkbook) {
              const workbookParams = {
                dateFrom: dateService.shiftDate(row.dateFrom),
                dateTo: dateService.shiftDate(row.dateTo),
                appointOrder: appointOrder,
                employeeID: row.employeeID,
                positionType: row.positionType,
                workPosition: position.fullNameNom || position.fullName,
                positionCategory: position.positionType === '1' ? position['psCategory.name'] : null,
                workPlace: row.workPlace,
                empWorkPlace: row.workPlace,
                mtCount: row.mtCount || 1
              }
              let workbookUpdate = ''
              Object.keys(workbookParams).forEach(name => {
                workbookUpdate += (workbookUpdate !== '' ? ', ' : '') + `${name} = :${name}:`
              })
              workbookParams.ID = employeeWorkbook.ID
              store.execSQL(`UPDATE hr_employeeWorkbook set ${workbookUpdate} where ID = :ID:`, workbookParams)
            }
          } else {
            orderPayStore.run('update', {
              __skipOptimisticLock: true,
              execParams: {
                ID: employeePosition.orderID,
                orderNumber: row.orderNumber ? row.orderNumber : 'Імпорт',
                orderDate: row.orderDate ? dateService.shiftDate(row.orderDate) : dateService.shiftDate(row.dateFrom),
                entryDate: row.orderDate ? dateService.shiftDate(row.orderDate) : dateService.shiftDate(row.dateFrom),
                orderState: 'POSTED'
              }
            })
          }
        }
      } else {
        if (params.createStaffOrder && dateService.shiftDate(row.dateTo).getTime() === dateService.maxDate().getTime()) {
          result = {}
          const orderID = empOrderStore.generateID()
          const onDate = dateService.shiftDate(employeeNumber.dateFrom)
          const position = row.positionID ? (UB.Repository('hr_position')
            .attrs(['ID', 'positionType', 'psCategory.name', 'fullNameNom', 'fullName'])
            .where('orgID', '=', orgID)
            .where('mi_data_id', '=', row.positionID)
            .misc({ __mip_recordhistory_all: true })
            .orderByDesc('mi_dateTo')
            .limit(1)
            .selectSingle() || {}) : {}
          const appointOrder = `Наказ про призначення № ${row.orderNumber ? row.orderNumber : ''} від ${dateService.formatDate(onDate)}`
          empOrderStore.run('insert', {
            isImportOperation: true,
            execParams: {
              ID: orderID,
              orderNumber: row.orderNumber ? row.orderNumber : '',
              orderNumberFull: row.orderNumber ? row.orderNumber : '',
              orderDate: row.orderDate ? dateService.shiftDate(row.orderDate) : onDate,
              entryDate: row.orderDate ? dateService.shiftDate(row.orderDate) : onDate,
              organizationID: orgID,
              empOrderType: 'APPOINT_MOVE',
              orderState: 'PROJECT',
              comment: `import ${dateService.formatDate(row.orderDate ? dateService.shiftDate(row.orderDate) : onDate)}`,
              impDateAppoint: onDate,
              reason: 'import',
              description: appointOrder
            }
          })
          const employeeWorkbookID = UB.DataStore('hr_employeeWorkbook').generateID()
          result.saved = { orderID, inserted: [{ hr_employeeWorkbook: employeeWorkbookID }, { hr_employeePosition: row.ID }], updated: [] }
          const paraID = store.generateID()
          result.paraID = paraID
          result.workbookRecord = {
            ID: employeeWorkbookID,
            dateFrom: dateService.shiftDate(row.dateFrom),
            dateTo: dateService.shiftDate(row.dateTo),
            appointOrder: appointOrder,
            isOrgAppoint: true,
            employeeID: row.employeeID,
            positionType: row.positionType,
            workPosition: position.fullNameNom || position.fullName,
            positionCategory: position.positionType === '1' ? position['psCategory.name'] : null,
            workPlace: row.workPlace,
            orderID: orderID,
            organizationID: orgID,
            empWorkPlace: row.workPlace,
            mtCount: row.mtCount || 1
          }
          if (!row.workScheduleID) { row.workScheduleID = UB.Repository('hr_workSchedule').attrs('ID').where('code', '=', 'Std').selectScalar() }
          if (!row.dictContractKindID) { row.dictContractKindID = UB.Repository('hr_dictContractKind').attrs('ID').where('code', '=', '01').selectScalar() }
          empOrderParaStore.run('insert', {
            isImportOperation: true,
            execParams: {
              ID: paraID,
              orderID: orderID,
              departmentID: row.departmentID,
              organizationID: orgID,
              employeeID: row.employeeID,
              empOrderType: 'APPOINT_MOVE',
              dateFrom: dateService.shiftDate(row.dateFrom),
              dateTo: dateService.shiftDate(row.dateTo),
              workPlace: row.workPlace || '1',
              positionID: position.ID,
              contractType: row.contractType || '1',
              workerType: row.workerType || '1',
              mtCount: row.mtCount || 1,
              accrualSum: row.accrualSum,
              payElID: row.payElID,
              dictContractKindID: row.dictContractKindID,
              workScheduleID: row.workScheduleID,
              dictStaffCatID: row.dictStaffCatID,
              dictCategoryECBID: row.dictCategoryECBID,
              tabNum: employeeNumber.tabNum,
              isAppoint: 1,
              isMove: 0,
              dateStartWork: onDate,
              appointmentOrderDate: row.orderDate ? dateService.shiftDate(row.orderDate) : dateService.shiftDate(row.dateFrom),
              appointmentOrderNumber: row.orderNumber ? row.orderNumber : 'Імпорт',
              changedValues: JSON.stringify(result.saved)
            }
          })
          store.execSQL(`UPDATE hr_empOrder set orderState = :orderState:  where ID = :ID:`,
            { ID: orderID, orderState: 'POSTED' })
          store.execSQL(`UPDATE hr_order set orderState = :orderState:  where ID = :ID:`,
            { ID: orderID, orderState: 'POSTED' })
          store.execSQL(`UPDATE hr_employeeNumber set orderID = :orderID:, paraID = :paraID: where ID = :ID:`,
            { orderID, paraID, ID: employeeNumber.ID })
          row.orderID = orderID
          row.paraID = paraID
          if (!params.isUpdate && map && map.outputID) {
            store.execSQL(`UPDATE hr_employeePosition set orderID = :orderID:, paraID = :paraID: where ID = :ID:`,
              { orderID, paraID, ID: map.outputID })
          }
        } else {
          const orderID = orderPayStore.generateID()
          orderPayStore.run('insert', {
            execParams: {
              ID: orderID,
              orderState: 'POSTED',
              empOrderType: 'APPOINT',
              orderNumber: row.orderNumber ? row.orderNumber : 'Імпорт',
              organizationID: orgID,
              orderDate: row.orderDate ? dateService.shiftDate(row.orderDate) : dateService.shiftDate(row.dateFrom),
              entryDate: row.orderDate ? dateService.shiftDate(row.orderDate) : dateService.shiftDate(row.dateFrom)
            }
          })
          row.orderID = orderID
          row.paraID = null
        }
      }
      empOrderParaStore.freeNative()
      empOrderStore.freeNative()
      store.freeNative()
      orderPayStore.freeNative()
      return result
    },
    checkAddRow: (orgID, row, map, impID, errorMessages) => {
      if (!row.employeeNumberID && row.taxCode && row.tabNum && row.employeeNumberDateFrom) {
        row.employeeNumberID = UB.Repository('hr_employeeNumberS')
          .attrs(['ID'])
          .where('orgID', '=', orgID)
          .where('employeeID.taxCode', '=', row.taxCode)
          .where('tabNum', '=', row.tabNum)
          .where('dateFrom', '=', dateService.shiftDate(row.employeeNumberDateFrom))
          .selectScalar()
      }
      if (map && map.outputID) {
        return true
      }
      if (row.employeeNumberID) {
        const employeePosition = UB.Repository('hr_employeePositionS')
          .attrs(['description'])
          .where('organizationID', '=', orgID)
          .where('employeeNumberID', '=', row.employeeNumberID)
          .where('dateFrom', '=', dateService.shiftDate(row.dateFrom))
          .selectScalar()
        if (employeePosition) {
          errorMessages.push(UB.i18n(`ID({0}) Запис призначення не імпортовано - у призначеннях вже є запис на таку дату {1} {2}`, impID, dateService.formatDate(row.dateFrom), employeePosition))
          return false
        } else {
          return true
        }
      } else {
        return true
      }
    },
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      },
      isActive: () => { return 1 }
    }
  },
  hr_empPosFundSource: {
    loadDataType: '3',
    entityName: 'hr_empPosFundSource',
    impEntityName: 'hr_importEmpPosFundSource',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Деталізація записів призначення працівників',
    entityDescription_uk: 'Деталізація записів призначення працівників',
    entityDescription_ru: 'Детализация записей назначения работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2065,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      mtCount: convertNumber
    },
    dependence: {
      employeePositionID: 'hr_employeePosition',
      dictFundSourceID: 'ac_fundSource'
    },
    beforeInsert: (orgID, row, importParams, params, map) => {
      const employeeNumber = UB.Repository('hr_employeePosition').attrs(['ID', 'employeeNumberID'])
        .where('ID', '=', row.employeePositionID)
        .limit(1)
        .selectSingle()
      if (employeeNumber) {
        row.employeeNumberID = employeeNumber.employeeNumberID
      }
    },
    afterInsert: (orgID, row, importParams, params, map, beforeInsert, errorMessages) => {
      const sumMtCount = UB.Repository('hr_empPosFundSource').attrs(['employeePositionID', 'SUM([mtCount])', 'employeeNumberID'])
        .where('employeePositionID', '=', row.employeePositionID)
        .where('mi_deleteDate', '=', '#maxdate')
        .groupBy(['employeePositionID', 'employeeNumberID'])
        .limit(1)
        .selectSingle()
      const employeeNumber = UB.Repository('hr_employeeNumber').attrs(['description'])
        .where('ID', '=', sumMtCount.employeeNumberID)
        .limit(1)
        .selectSingle()
      if (sumMtCount['SUM([mtCount])'] > 1) {
        errorMessages.push(UB.i18n(`У призначені ${employeeNumber.description} (${sumMtCount.employeePositionID}) сумарна кількість ставок = ${sumMtCount['SUM([mtCount])']}, що перевищує допустиме значення 1`).substring(0, 1999))
      }
    }
  },
  hr_publServRang: {
    loadDataType: '3',
    entityName: 'hr_publServRang',
    impEntityName: 'hr_importPublServRang',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Ранг держслужбовця',
    entityDescription_uk: 'Ранг держслужбовця',
    entityDescription_ru: 'Ранг держслужбовця',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2067,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictRankID: 'hr_dictRank',
      rankAssignKindID: 'hr_dictRankAssignKind'
    }
  },
  hr_employeeVehicle: {
    loadDataType: '3',
    entityName: 'hr_employeeVehicle',
    impEntityName: 'hr_importEmployeeVehicle',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Транспортні засоби працівника',
    entityDescription_uk: 'Транспортні засоби працівника',
    entityDescription_ru: 'Транспортні засоби працівника',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2090,
    map: true,
    orgAttr: 'orgID',
    inAttrConfig: {
      dateFrom: convertDate,
      dateTo: convertDate
    },
    dependence: {
      vehicleID: 'trans_vehicle'
    }
  },
  trans_vehicle: {
    loadDataType: '1',
    entityName: 'trans_vehicle',
    impEntityName: 'trans_importVehicle',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Транспортні засоби організації',
    entityDescription_uk: 'Транспортні засоби організації',
    entityDescription_ru: 'Транспортные средства организации',
    entityType: '1',
    loadMethod: 'dict',
    orgAttr: 'organizationID',
    defaultValues: {
      organizationID: (id) => {
        return id
      }
    },
    sortOrder: 2069,
    map: true,
    dependence: {
      modelID: 'trans_model',
      vehicleStateTypeID: 'trans_dictVehicleStateType'
    }
  },
  trans_model: {
    loadDataType: '1',
    entityName: 'trans_model',
    impEntityName: 'trans_importModel',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Моделі транспортних засобів',
    entityDescription_uk: 'Моделі транспортних засобів',
    entityDescription_ru: 'Модели транспортних средств',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 2069,
    map: true,
    dependence: {
      dictTypeID: 'trans_dictType'
    }
  },
  trans_dictType: {
    loadDataType: '1',
    entityName: 'trans_dictType',
    impEntityName: 'trans_importDictType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Типи ТЗ',
    entityDescription_uk: 'Типи ТЗ',
    entityDescription_ru: 'Типы ТЗ',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 2069,
    exists: dictExist,
    dictList: dictList
  },
  trans_dictVehicleStateType: {
    loadDataType: '1',
    entityName: 'trans_dictVehicleStateType',
    impEntityName: 'trans_importDictVehicleStateType',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Стан ТЗ',
    entityDescription_uk: 'Стан ТЗ',
    entityDescription_ru: 'Стан ТЗ',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 2069,
    exists: dictExist,
    dictList: dictList
  },
  ac_address: {
    loadDataType: '3',
    entityName: 'ac_address',
    impEntityName: 'ac_importAddress',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Адреси працівника',
    entityDescription_uk: 'Адреси працівника',
    entityDescription_ru: 'Адреса работника',
    entityDescription_az: 'İşçilərin ünvanları',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2200,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      ownerID: 'hr_employee',
      countryID: 'cdn_country'
    }
  },
  hr_empStateMilitary: {
    loadDataType: '3',
    entityName: 'hr_empStateMilitary',
    impEntityName: 'hr_importEmpStateMilitary',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Військовий облік',
    entityDescription_uk: 'Військовий облік',
    entityDescription_ru: 'Воинский учет',
    entityDescription_az: 'Hərbi mühasibat',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2210,
    map: false,
    orgAttr: 'orgID',
    setDefaultValueOnLoad: (row) => {
      row.isMobilOrder = row.isMobilOrder === '1'
      row.isRecruiter = row.isRecruiter === '1'
      row.isProtected = row.isProtected === '1'
    },
    dependence: {
      employeeID: 'hr_employee',
      dictStateMilitaryID: 'hr_dictStateMilitary',
      dictCategMilitaryID: 'hr_dictCategMilitary',
      dictMilitaryRankID: 'hr_dictMilitaryRank',
      dictMilitarySpecialityID: 'hr_dictMilitarySpeciality',
      dictMilitarySuitableID: 'hr_dictMilitarySuitable',
      dictMilitaryProfileID: 'hr_dictMilitaryProfile',
      dictMilitaryGroupID: 'hr_dictMilitaryGroup',
      employeeDocID: 'hr_employeeDocs',
      dictDocKindID: 'ac_dictDocKind'
    }
  },
  hr_employeeLanguage: {
    loadDataType: '3',
    entityName: 'hr_employeeLanguage',
    impEntityName: 'hr_importEmployeeLanguage',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Володіння мовами',
    entityDescription_uk: 'Володіння мовами',
    entityDescription_ru: 'Владение языками',
    entityDescription_az: 'Dil bacarıqları',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2230,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictLanguageID: 'hr_dictLanguage',
      dictLanguageLevelID: 'hr_dictLanguageLevel',
      employeeDocID: 'hr_employeeDocs'
    }
  },
  hr_empAcademStatus: {
    loadDataType: '3',
    entityName: 'hr_empAcademStatus',
    impEntityName: 'hr_importEmpAcademStatus',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Вчені звання працівника',
    entityDescription_uk: 'Вчені звання працівника',
    entityDescription_ru: 'Ученые звания работника',
    entityDescription_az: 'Elmi adlar',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2240,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictAcademStatusID: 'hr_dictAcademStatus',
      dictSpecialtyID: 'hr_specialty',
      educationOrgID: 'ac_contractor'
    }
  },
  hr_employeeVacation: {
    loadDataType: '3',
    entityName: 'hr_employeeVacation',
    impEntityName: 'hr_importEmployeeVacation',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Відпустка працівника (архів)',
    entityDescription_uk: 'Відпустка працівника (архів)',
    entityDescription_ru: 'Отпуск работника (архив)',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2245,
    map: false,
    orgAttr: 'orgID',
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      }
    },
    dependence: {
      employeeID: 'hr_employee',
      employeeNumberID: 'hr_employeeNumber',
      dictVacationKindID: 'hr_dictVacationKind'
    }
  },
  hr_employeeMission: {
    loadDataType: '3',
    entityName: 'hr_employeeMission',
    impEntityName: 'hr_importEmployeeMission',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Відрядження працівників',
    entityDescription_uk: 'Відрядження працівників',
    entityDescription_ru: 'Відрядження працівників',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2380,
    map: false,
    orgAttr: 'organizationID',
    dependence: {
      employeeNumberID: 'hr_employeeNumber',
      employeeID: 'hr_employee',
      countryID: 'cdn_country'
    }
  },
  hr_employeeDocs: {
    loadDataType: '3',
    entityName: 'hr_employeeDocs',
    impEntityName: 'hr_importEmployeeDocs',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Документи працівника',
    entityDescription_uk: 'Документи працівника',
    entityDescription_ru: 'Документы работника',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2250,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictDocKindID: 'ac_dictDocKind'
    }
  },
  hr_employeeChange: {
    loadDataType: '3',
    entityName: 'hr_employeeChange',
    impEntityName: 'hr_importEmployeeChange',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Зміна облікових даних',
    entityDescription_uk: 'Зміна облікових даних',
    entityDescription_ru: 'Изменение учетных данных',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2257,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      orderID: 'hr_empOrder',
      paraID: 'hr_empOrderDet',
      organizationID: 'hr_organization',
      employeeID: 'hr_employee',
      employeePositionID: 'hr_employeePositionS'
    }
  },
  hr_employeeDisability: {
    loadDataType: '3',
    entityName: 'hr_employeeDisability',
    impEntityName: 'hr_importEmployeeDisability',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Інвалідність працівників',
    entityDescription_uk: 'Інвалідність працівників',
    entityDescription_ru: 'Инвалидность работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2260,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      accrualSum: convertNumber,
      mtCount: convertNumber
    },
    dependence: {
      disabilityID: 'hr_dictDisabilityType',
      employeeID: 'hr_employee',
      employeeDocID: 'hr_employeeDocs'
    }
  },
  hr_empCertificationAcc: {
    loadDataType: '3',
    entityName: 'hr_empCertificationAcc',
    impEntityName: 'hr_importEmployeeCertificationAcc',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Атестація працівників',
    entityDescription_uk: 'Атестація працівників',
    entityDescription_ru: 'Аттестация работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2205,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      dictEmpCategoryID: 'hr_dictEmpCategory',
      employeeID: 'hr_employee',
      dictSpecialtyID: 'hr_specialty',
      orderAuthorID: 'ac_contractor',
      dictDocKindID: 'ac_dictDocKind',
      employeeDocID: 'hr_employeeDocs'
    }
  },
  hr_empAddInform: {
    loadDataType: '3',
    entityName: 'hr_empAddInform',
    impEntityName: 'hr_importEmployeeAddInform',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Додаткова інформація',
    entityDescription_uk: 'Додаткова інформація',
    entityDescription_ru: 'Дополнительная информация',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2256,
    map: false,
    dependence: {
      employeeID: 'hr_employee',
      dictAddInfKindID: 'hr_dictAddInfKind'
    }
  },
  hr_empLongTermAbsc: {
    loadDataType: '3',
    entityName: 'hr_empLongTermAbsc',
    impEntityName: 'hr_importEmployeeLongTermAbsc',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Довготривала відсутність',
    entityDescription_uk: 'Довготривала відсутність',
    entityDescription_ru: 'Длительное отсутствие',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2255,
    map: false,
    orgAttr: 'orgID',
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      }
    },
    dependence: {
      employeeNumberID: 'hr_employeeNumber'
    }
  },
  hr_employeeContact: {
    loadDataType: '3',
    entityName: 'hr_employeeContact',
    impEntityName: 'hr_importEmployeeContact',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Інші контакти',
    entityDescription_uk: 'Інші контакти',
    entityDescription_ru: 'Другие контакты',
    entityDescription_az: 'Digər əlaqələr',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2270,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      contactTypeID: 'cdn_contacttype'
    }
  },
  hr_employeeBonus: {
    loadDataType: '3',
    entityName: 'hr_employeeBonus',
    impEntityName: 'hr_importEmployeeBonus',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Нагороди',
    entityDescription_uk: 'Нагороди',
    entityDescription_ru: 'Награды',
    entityDescription_az: 'Mükafatlar',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2280,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictBonusID: 'hr_dictBonus'
    }
  },
  hr_empRangeScience: {
    loadDataType: '3',
    entityName: 'hr_empRangeScience',
    impEntityName: 'hr_importEmpRangeScience',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Науковий ступінь',
    entityDescription_uk: 'Науковий ступінь',
    entityDescription_ru: 'Научная степень',
    entityDescription_az: 'Dərəcə',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2290,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictBranchScienceID: 'hr_dictBranchScience',
      dictDegreeID: 'hr_dictDegree',
      dictSpecialtyID: 'hr_specialty'
    }
  },
  hr_employeeEducation: {
    loadDataType: '3',
    entityName: 'hr_employeeEducation',
    impEntityName: 'hr_importEmployeeEducation',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Освіта',
    entityDescription_uk: 'Освіта',
    entityDescription_ru: 'Образование',
    entityDescription_az: 'Təhsil',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2300,
    map: false,
    orgAttr: 'orgID',
    skipSetDate: true,
    setDefaultValueOnLoad: (row) => {
      row.isMain = row.isMain === '1'
    },
    dependence: {
      employeeID: 'hr_employee',
      dictEducationLevelID: 'hr_dictEducationLevel',
      dictAreasOfEduID: 'hr_dictAreasOfEducation',
      dictDegreeID: 'hr_dictDegree',
      dictDocKindID: 'ac_dictDocKind',
      dictSpecialtyID: 'hr_specialty',
      employeeDocID: 'hr_employeeDocs',
      educationOrgID: 'ac_contractor'
    }
  },
  hr_empCertificatnUp: {
    loadDataType: '3',
    entityName: 'hr_empCertificatnUp',
    impEntityName: 'hr_importEmpCertificatnUp',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Підвищення кваліфікації',
    entityDescription_uk: 'Підвищення кваліфікації',
    entityDescription_ru: 'Повышение квалификации',
    entityDescription_az: 'Sertifikatlaşdırma təhsili',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2310,
    map: false,
    orgAttr: 'orgID',
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      }
    },
    setDefaultValueOnLoad: (row) => {
      row.isInsideCountry = !row.isInsideCountry
    },
    dependence: {
      employeeID: 'hr_employee',
      educationOrgID: 'ac_contractor',
      dictProfCompDevelopFormID: 'hr_dictProfCompDevelopForm',
      dictTrainingTopicID: 'hr_dictTrainingTopic',
      countryID: 'cdn_country',
      dictProfCompetencyID: 'hr_dictProfCompetency',
      employeeDocID: 'hr_employeeDocs',
      dictDocKindID: 'ac_dictDocKind',
      dictSpecialityID: 'hr_specialty',
      dictTrainingKindID: 'hr_dictTrainingKind'
    }
  },
  hr_employeeTaxLimit: {
    loadDataType: '3',
    entityName: 'hr_employeeTaxLimit',
    impEntityName: 'hr_importEmployeeTaxLimit',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Пільги ПДФО працівників',
    entityDescription_uk: 'Пільги ПДФО працівників',
    entityDescription_ru: 'Льготы ПДФО работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2320,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      accrualSum: convertNumber,
      mtCount: convertNumber
    },
    dependence: {
      taxLimitID: 'hr_taxLimit',
      employeeNumberID: 'hr_employeeNumber'
    }
  },
  hr_employeeBenefits: {
    loadDataType: '3',
    entityName: 'hr_employeeBenefits',
    impEntityName: 'hr_importEmployeeBenefits',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Право на пільги',
    entityDescription_uk: 'Право на пільги',
    entityDescription_ru: 'Право на льготы',
    entityDescription_az: 'Uyğunluq',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2330,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictBenefitsKindID: 'hr_dictBenefitsKind',
      employeeFamilyID: 'hr_employeeFamily',
      employeeDisabilityID: 'hr_employeeDisability'
    }
  },
  hr_employeeBenefitsDoc: {
    loadDataType: '3',
    entityName: 'hr_employeeBenefitsDoc',
    impEntityName: 'hr_importEmployeeBenefitsDoc',
    codeAttr: 'ID',
    nameAttr: '',
    identifier: 'ID',
    entityDescription: 'Документи пільг',
    entityDescription_uk: 'Документи пільг',
    entityDescription_ru: 'Документи пільг',
    entityType: '1',
    loadMethod: 'detail',
    sortOrder: 3080,
    parentAttrIdentifier: 'employeeBenefitID',
    parentEntityName: 'hr_employeeBenefits',
    map: false,
    dependence: {
      employeeID: 'hr_employee',
      employeeBenefitID: 'hr_employeeBenefits',
      employeeDocID: 'hr_employeeDocs'
    }
  },
  hr_empVacationPeriod: {
    loadDataType: '3',
    entityName: 'hr_empVacationPeriod',
    impEntityName: 'hr_importEmployeeVacationPeriod',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Право на відпустку',
    entityDescription_uk: 'Право на відпустку',
    entityDescription_ru: 'Право на отпуск',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2335,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      employeeNumberID: 'hr_employeeNumber',
      dictVacationKindID: 'hr_dictVacationKind'
    },
    beforeInsert: (orgID, row, importParams, params, map) => {
      const empVacationPlanStore = UB.DataStore('hr_empVacationPlan')
      const empVacationPlan = UB.Repository('hr_empVacationPlan').attrs(['ID', 'dateFrom', 'dayCount'])
        .where('employeeID', '=', row.employeeID)
        .where('employeeNumberID', '=', row.employeeNumberID)
        .where('dictVacationKindID', '=', row.dictVacationKindID)
        .limit(1)
        .selectSingle()
      if (empVacationPlan) {
        row.empVacationPlanID = empVacationPlan.ID
        if (dateService.shiftDate(empVacationPlan.dateFrom) > dateService.shiftDate(row.dateFrom)) {
          empVacationPlanStore.run('update', {
            isImportOperation: true,
            __skipOptimisticLock: true,
            execParams: {
              ID: empVacationPlan.ID,
              dateFrom: row.dateFrom
            }
          })
        }
        if (dateService.shiftDate(empVacationPlan.dateFrom) < dateService.shiftDate(row.dateFrom)) {
          empVacationPlanStore.run('update', {
            isImportOperation: true,
            __skipOptimisticLock: true,
            execParams: {
              ID: empVacationPlan.ID,
              dayCount: row.dayCount
            }
          })
        }
      } else {
        const empVacationPlanID = empVacationPlanStore.generateID()
        empVacationPlanStore.run('insert', {
          isImportOperation: true,
          execParams: {
            ID: empVacationPlanID,
            dictVacationKindID: row.dictVacationKindID,
            employeeID: row.employeeID,
            employeeNumberID: row.employeeNumberID,
            dayCount: row.dayCount,
            dateFrom: row.dateFrom
          }
        })
        empVacationPlanStore.freeNative()
        row.empVacationPlanID = empVacationPlanID
      }

      row.dayCountFactCorr = row.dayCountFact
      row.dayCountPlan = row.dayCount
      delete row.dictVacationKindID
      delete row.employeeID
      delete row.employeeNumberID
      delete row.dayCount
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_employeeExperience: {
    loadDataType: '3',
    entityName: 'hr_employeeExperience',
    impEntityName: 'hr_importEmployeeExperience',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Стаж роботи працівника',
    entityDescription_uk: 'Стаж роботи працівника',
    entityDescription_ru: 'Стаж работы работника',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2340,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      employeeNumberID: 'hr_employeeNumber',
      dictExperienceID: 'hr_dictExperience'
    }
  },
  hr_employeePenalty: {
    loadDataType: '3',
    entityName: 'hr_employeePenalty',
    impEntityName: 'hr_importEmployeePenalty',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Стягнення',
    entityDescription_uk: 'Стягнення',
    entityDescription_ru: 'Взыскание',
    entityDescription_az: 'Cərimə',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2350,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictPenaltyID: 'hr_dictPenalty',
      dictPenaltyReasonID: 'hr_dictPenaltyReason'
    }
  },
  hr_employeeDocAudit: {
    loadDataType: '3',
    entityName: 'hr_employeeDocAudit',
    impEntityName: 'hr_importEmployeeDocAudit',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Спецперевірки',
    entityDescription_uk: 'Спецперевірки',
    entityDescription_ru: 'Спецпроверки',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2355,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      positionID: 'hr_position'
    },
    defaultValues: {
      orgID: (orgID) => {
        return orgID
      }
    }
  },
  hr_employeeWorkbook: {
    loadDataType: '3',
    entityName: 'hr_employeeWorkbook',
    impEntityName: 'hr_importEmployeeWorkbook',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Трудова книжка',
    entityDescription_uk: 'Трудова книжка',
    entityDescription_ru: 'Трудовая книжка',
    entityDescription_az: 'Məşğulluq tarixi',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2360,
    map: false,
    orgAttr: 'orgID',
    setDefaultValueOnLoad: (row) => {
      row.isManualWorkPlace = row.isManualWorkPlace === '1'
      row.isOrgAppoint = row.isOrgAppoint === '1'
      row.isOrgDismiss = row.isOrgDismiss === '1'
    },
    dependence: {
      employeeID: 'hr_employee',
      organizationID: 'hr_organization'
    }
  },
  hr_empTarifCategory: {
    loadDataType: '3',
    entityName: 'hr_empTarifCategory',
    impEntityName: 'hr_importEmployeeTarifCategory',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Тарифний розряд працівника',
    entityDescription_uk: 'Тарифний розряд працівника',
    entityDescription_ru: 'Тарифный разряд работника',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2365,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeID: 'hr_employee',
      dictTarifCoeffID: 'hr_dictTarifCoeff'
    }
  },
  hr_people: {
    loadDataType: '3',
    entityName: 'hr_people',
    impEntityName: 'hr_importPeople',
    codeAttr: '',
    nameAttr: 'fullFIO',
    identifier: 'fullFIO',
    entityDescription: 'Родичі',
    entityDescription_uk: 'Родичі',
    entityDescription_ru: 'Родственники',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2370,
    map: false,
    dependence: {
      employeeID: 'hr_employee',
      citizenshipID: 'cdn_country',
      dictEducationLevelID: 'hr_dictEducationLevel'
    },
    inAttrConfig: {
      sexType: (value) => {
        return value === 'Ж' ? 'W' : value === 'Ч' ? 'M' : value
      },
      fullFIO: (value, orgID, entityName, row, importParams) => {
        const fullFIO = (value !== '' && value) ? value.replace(/[«´»„“‘’'"`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
        if (fullFIO !== '' && fullFIO) {
          if (!row.shortFIO || row.shortFIO === '') {
            row.shortFIO = getShortFIO(fullFIO)
          }
          if (!row.firstName || row.firstName === '') {
            row.firstName = fullFIO.split(' ')[1] || null
          }
          if (!row.lastName || row.lastName === '') {
            row.lastName = (importParams && importParams.isUseRegOriginal) ? (fullFIO.split(' ')[0] || '') : (fullFIO.split(' ')[0] || '').toUpperCase()
          }
          if (!row.middleName || row.middleName === '') {
            row.middleName = fullFIO.split(' ')[2] || null
          }
        }
        return fullFIO
      },
      shortFIO: (value) => {
        return (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
      },
      firstName: (value) => {
        return (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
      },
      lastName: (value, orgID, entityName, row, importParams) => {
        value = (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
        return (importParams && importParams.isUseRegOriginal) ? value : value.toUpperCase()
      },
      middleName: (value) => {
        return (value !== '' && value) ? value.replace(/[«´»„“‘’'"'`]/gi, `’`).replace(/\s+/g, ' ').trim() : value
      }
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_employeeFamily: {
    loadDataType: '3',
    entityName: 'hr_employeeFamily',
    impEntityName: 'hr_importEmployeeFamily',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Члени сім\'ї',
    entityDescription_uk: 'Члени сім\'ї',
    entityDescription_ru: 'Члены семьи',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 2380,
    map: false,
    orgAttr: 'orgID',
    setDefaultValueOnLoad: (row) => {
      row.isDependent = row.isDependent === '1'
    },
    dependence: {
      employeeID: 'hr_employee',
      peopleID: 'hr_people',
      dictBenefitsKindID: 'hr_dictBenefitsKind',
      dictKinshipKindID: 'hr_dictKinshipKind'
    }
  },
  // Зарплата
  hr_method: {
    loadDataType: '4',
    entityName: 'hr_method',
    impEntityName: 'hr_importMethod',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Методи розрахунку видів оплати',
    entityDescription_uk: 'Методи розрахунку видів оплати',
    entityDescription_ru: 'Методы расчета видов оплаты',
    entityType: '1',
    loadMethod: 'skipLoad',
    sortOrder: 3010,
    exists: dictExist,
    dictList: dictList
  },
  hr_payEl: {
    loadDataType: '4',
    entityName: 'hr_payEl',
    impEntityName: 'hr_importPayEl',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види оплати',
    entityDescription_uk: 'Види оплати',
    entityDescription_ru: 'Виды оплаты',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3020,
    dependence: { methodID: 'hr_method' },
    setDefaultValueOnLoad: (row) => {
      row.isAutoCalc = row.isAutoCalc === '1'
      row.isRecalculate = row.isRecalculate === '1'
      row.roundAverage = row.roundAverage === '1'
      row.isMtCount = row.isMtCount === '1'
      row.ignoreInCalcPay = row.ignoreInCalcPay === '1'
      row.repaymentOnly = row.repaymentOnly === '1'
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_payElEntry: {
    loadDataType: '4',
    entityName: 'hr_payElEntry',
    impEntityName: 'hr_importPayElEntry',
    codeAttr: 'ID',
    nameAttr: '',
    identifier: 'ID',
    entityDescription: 'Таблиця входження видів оплати',
    entityDescription_uk: 'Таблиця входження видів оплати',
    entityDescription_ru: 'Таблица вхождения видов оплаты',
    entityType: '1',
    loadMethod: 'detail',
    sortOrder: 3030,
    parentAttrIdentifier: 'payElID',
    parentEntityName: 'hr_payEl',
    map: false,
    dependence: {
      payElID: 'hr_payEl',
      payElBaseID: 'hr_payEl'
    }
  },
  hr_dictTaxIndivid: {
    loadDataType: '4',
    entityName: 'hr_dictTaxIndivid',
    impEntityName: 'hr_importDictTaxIndivid',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Види доходу ПДФО',
    entityDescription_uk: 'Види доходу ПДФО',
    entityDescription_ru: 'Виды дохода ПДФО',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3040,
    exists: dictExist,
    dictList: dictList,
    defaultValues: {
      taxBreaks: () => {
        return 1
      }
    }
  },
  hr_payElTaxIndivid: {
    loadDataType: '4',
    entityName: 'hr_payElTaxIndivid',
    impEntityName: 'hr_importPayElTaxIndivid',
    codeAttr: 'ID',
    nameAttr: '',
    identifier: 'ID',
    entityDescription: 'Таблиця входження видів оплати у види доходу ПДФО',
    entityDescription_uk: 'Таблиця входження видів оплати у види доходу ПДФО',
    entityDescription_ru: 'Таблица вхождения видов оплаты в виды дохода ПДФО',
    entityType: '1',
    loadMethod: 'detail',
    sortOrder: 3050,
    parentAttrIdentifier: 'taxIndividID',
    parentEntityName: 'hr_dictTaxIndivid',
    map: false,
    dependence: {
      taxIndividID: 'hr_dictTaxIndivid',
      payElID: 'hr_payEl'
    }
  },
  hr_payFundMethod: {
    loadDataType: '4',
    entityName: 'hr_payFundMethod',
    impEntityName: 'hr_importPayFundMethod',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Методи розрахунку нарахувань на зарплату',
    entityDescription_uk: 'Методи розрахунку нарахувань на зарплату',
    entityDescription_ru: 'Методы расчета начислений на зарплату',
    loadMethod: 'skipLoad',
    entityType: '1',
    sortOrder: 3060,
    exists: dictExist,
    dictList: dictList
  },
  hr_payFund: {
    loadDataType: '4',
    entityName: 'hr_payFund',
    impEntityName: 'hr_importPayFund',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Нарахування на зарплату',
    entityDescription_uk: 'Нарахування на зарплату',
    entityDescription_ru: 'Начисления на зарплату',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3070,
    setDefaultValueOnLoad: (row) => {
      row.isAutoCalc = row.isAutoCalc === '1'
      row.isRecalculate = row.isRecalculate === '1'
    },
    dependence: { payFundMethodID: 'hr_payFundMethod' },
    attrsConfig: {
      payFundMethodID: (value, orgID) => { return getImpMapValue(value, orgID, 'hr_payFundMethod') }
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_payFundBase: {
    loadDataType: '4',
    entityName: 'hr_payFundBase',
    impEntityName: 'hr_importPayFundBase',
    codeAttr: 'ID',
    nameAttr: '',
    identifier: 'ID',
    entityDescription: 'Таблиця входження видів оплати у нарахування на зарплату',
    entityDescription_uk: 'Таблиця входження видів оплати у нарахування на зарплату',
    entityDescription_ru: 'Таблица вхождения видов оплаты в начисления на зарплату',
    entityType: '1',
    loadMethod: 'detail',
    sortOrder: 3080,
    parentAttrIdentifier: 'payFundID',
    parentEntityName: 'hr_payFund',
    map: false,
    dependence: {
      payElID: 'hr_payEl',
      payFundID: 'hr_payFund'
    }
  },
  hr_payPerm: {
    loadDataType: '4',
    entityName: 'hr_payPerm',
    impEntityName: 'hr_importPayPerm',
    codeAttr: 'payType',
    nameAttr: 'payElID',
    identifier: 'payElID',
    entityDescription: 'Постійні нарахування і утримання по організації',
    entityDescription_uk: 'Постійні нарахування і утримання по організації',
    entityDescription_ru: 'Постоянные начисления и удержания по организации',
    entityType: '1',
    loadMethod: 'dict',
    map: false,
    sortOrder: 3090,
    dependence: { dictFundSourceID: 'ac_fundSource', accountID: 'gl_account', payElID: 'hr_payEl' },
    detailScript: (row, orgID) => {
      const store = UB.DataStore('hr_payPermDt')
      store.run('insert', {
        execParams: {
          payPermID: row.ID,
          permType: '1',
          orgID: orgID
        }
      })
      store.freeNative()
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_employeeAccrual: {
    loadDataType: '4',
    entityName: 'hr_employeeAccrual',
    impEntityName: 'hr_importEmployeeAccrual',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Постійні нарахування працівників',
    entityDescription_uk: 'Постійні нарахування працівників',
    entityDescription_ru: 'Постоянные начисления работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3100,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      accrualSum: convertNumber,
      accrualRate: convertNumber
    },
    dependence: {
      employeeID: 'hr_employee',
      employeeNumberID: 'hr_employeeNumber',
      payElID: 'hr_payEl',
      dictFundSourceID: 'ac_fundSource',
      accountID: 'gl_account'
    },
    defaultValues: {
      isActive: () => { return 1 }
    },
    onBeforeImport: (entityName, orgID) => {
      const sore = UB.DataStore(entityName)
      const deleteStore = UB.DataStore('hr_employeeAccrual')
      sore.runSQL(`SELECT a.ID as "ID" FROM hr_employeeAccrual a
                        JOIN hr_employeeNumber n on n.ID = a.employeeNumberID and n.mi_deleteDate >= '9999-12-31'
                        LEFT JOIN hr_importMap m on a.ID = m.outputID and m.orgID = :orgID: and entityName = 'hr_employeeAccrual'
                        WHERE n.orgID = :orgID: and m.ID is NULL AND a.isActive = 1 and a.mi_deleteDate >= '9999-12-31' `,
      { orgID })
      const data = sore.getAsJsObject()

      data.forEach(row => {
        deleteStore.run('delete', {
          isImport: true,
          execParams: {
            ID: row.ID
          }
        })
      })
    }
  },
  hr_payCalcDateFrom: {
    loadDataType: '4',
    entityName: 'hr_payCalcDateFrom',
    impEntityName: 'hr_importPayCalcDateFrom',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Дата початку перерахунку зарплати працівників',
    entityDescription_uk: 'Дата початку перерахунку зарплати працівників',
    entityDescription_ru: 'Дата начала перерасчета зарплаты работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3110,
    map: false,
    orgAttr: 'orgID',
    outAttrConfig: {
      periodCalcID: getPeriodByDate,
      periodSalaryID: getPeriodByDate
    },
    dependence: {
      employeeNumberID: 'hr_employeeNumber'
    }
  },
  hr_payOut: {
    loadDataType: '4',
    entityName: 'hr_payOut',
    impEntityName: 'hr_importPayOut',
    codeAttr: '',
    nameAttr: 'name',
    identifier: 'name',
    entityDescription: 'Шаблони виплати',
    entityDescription_uk: 'Шаблони виплати',
    entityDescription_ru: 'Шаблоны выплаты',
    loadMethod: 'dict',
    entityType: '1',
    sortOrder: 3120,
    setDefaultValueOnLoad: (row) => {
      row.isDefault = row.isDefault === '1'
    },
    defaultValues: {
      organizationID: (orgID) => {
        return orgID
      }
    },
    dependence: {
      orgAccountID: 'ac_orgAccount',
      contractorID: 'ac_contractor',
      contrAccountID: 'ac_contrAccount',
      commissionOrgAccID: 'ac_orgAccount',
      commissionContrAccID: 'ac_contrAccount'
    },
    exists: dictExist,
    dictList: dictList
  },
  hr_payRetention: {
    loadDataType: '4',
    entityName: 'hr_payRetention',
    impEntityName: 'hr_importPayRetention',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Постійні утримання працівників',
    entityDescription_uk: 'Постійні утримання працівників',
    entityDescription_ru: 'Постоянные содержание работников',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3130,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      rate: convertNumber,
      baseSum: convertNumber,
      accrualSum: convertNumber,
      accrualRate: convertNumber,
      maxRate: convertNumber,
      minRate: convertNumber,
      debtSum: convertNumber,
      remindSum: convertNumber
    },
    dependence: {
      employeeID: 'hr_employee',
      employeeNumberID: 'hr_employeeNumber',
      payElID: 'hr_payEl',
      bankID: 'ac_bank',
      employeeFamilyID: 'hr_employeeFamily',
      dictFundSourceID: 'ac_fundSource',
      accountID: 'gl_account',
      contractorID: 'ac_contractor',
      contrAccountID: 'ac_contrAccount'
    }
  },
  hr_accrual: {
    loadDataType: '4',
    entityName: 'hr_accrual',
    impEntityName: 'hr_importAccrual',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Розрахункові листи',
    entityDescription_uk: 'Розрахункові листи',
    entityDescription_ru: 'Расчетные листы',
    entityType: '1',
    loadMethod: 'accrualSQL',
    pkGenerator: 'S_HR_ACCRUAL',
    sortOrder: 3140,
    map: false,
    orgAttr: 'orgID',
    withDetail: true,
    setDefaultValueOnLoad: (row) => {
      row.isAvg = row.isAvg === '1'
    },
    inAttrConfig: {
      baseSum: convertNumberNotNull,
      rate: convertNumberNotNull,
      days: convertNumberNotNull,
      hours: convertNumberNotNull,
      planHours: convertNumberNotNull,
      planDays: convertNumberNotNull,
      sumAvg: convertNumberNotNull
    },
    dependence: {
      employeeNumberID: 'hr_employeeNumber',
      payElID: 'hr_payEl',
      dictFundSourceID: 'ac_fundSource',
      dictProgClassID: 'ac_dictProgClass'
    }
  },
  hr_accrualDt: {
    loadDataType: '4',
    entityName: 'hr_accrualDt',
    impEntityName: 'hr_importAccrualDt',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Даталізація розрахункових листів',
    entityDescription_uk: 'Даталізація розрахункових листів',
    entityDescription_ru: 'Детализация расчетных листов',
    entityType: '1',
    loadMethod: 'detail',
    pkGenerator: 'S_HR_ACCRUALDT',
    sortOrder: 3150,
    map: false,
    orgAttr: 'orgID',
    parentAttrIdentifier: 'accrualID',
    parentEntityName: 'hr_accrual',
    inAttrConfig: {
      paySum: convertNumberNotNull
    },
    onBeforeImport: (dictStore, orgID) => {
      dictStore.execSQL(`DELETE FROM hr_accrualDt WHERE accrualID in 
         (SELECT a.ID FROM hr_accrual a where a.orgID = :orgID: AND a.flagsRec & 8 = 8) `,
      { orgID })
    },
    dependence: {
      accrualID: 'hr_accrual',
      dictFundSourceID: 'ac_fundSource',
      departmentID: 'hr_department',
      accountID: 'gl_account'
    }
  },
  hr_taxIndividAcc: {
    loadDataType: '4',
    entityName: 'hr_taxIndividAcc',
    impEntityName: 'hr_importTaxIndividAcc',
    codeAttr: 'ID',
    nameAttr: '',
    identifier: 'ID',
    entityDescription: 'Деталізація ПДФО за видами доходу',
    entityDescription_uk: 'Деталізація ПДФО за видами доходу',
    entityDescription_ru: 'Детализация ПДФО по видам дохода',
    entityType: '1',
    loadMethod: 'detail',
    sortOrder: 3160,
    map: false,
    parentAttrIdentifier: 'accrualID',
    parentEntityName: 'hr_accrual',
    inAttrConfig: {
      taxSum: convertNumberNotNull,
      incomeSum: convertNumberNotNull,
      privilegeSum: convertNumberNotNull,
      taxFreeSum: convertNumberNotNull
    },
    onBeforeImport: (dictStore, orgID) => {
      dictStore.execSQL(`DELETE FROM hr_taxIndividAcc WHERE accrualID in 
         (SELECT a.ID FROM hr_accrual a where a.orgID = :orgID: AND a.flagsRec & 8 = 8) `,
      { orgID })
    },
    dependence: {
      accrualID: 'hr_accrual',
      taxIndividID: 'hr_dictTaxIndivid',
      taxLimitID1: 'hr_taxLimit',
      taxLimitID2: 'hr_taxLimit',
      taxLimitID3: 'hr_taxLimit'
    }
  },
  hr_accrualBalance: {
    loadDataType: '4',
    entityName: 'hr_accrualBalance',
    impEntityName: 'hr_importAccrualBalance',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Сальдо по місяцям',
    entityDescription_uk: 'Сальдо по місяцям',
    entityDescription_ru: 'Сальдо по месяцам',
    entityType: '1',
    loadMethod: 'accrual',
    sortOrder: 3170,
    map: false,
    orgAttr: 'orgID',
    defaultValues: {
      isImport: () => { return 1 }
    },
    inAttrConfig: {
      sumFrom: convertNumberNotNull,
      sumPlus: convertNumberNotNull,
      sumMinus: convertNumberNotNull,
      sumPay: convertNumberNotNull,
      sumTo: convertNumberNotNull
    },
    dependence: {
      employeeNumberID: 'hr_employeeNumber',
      dictFundSourceID: 'ac_fundSource'
    },
    removeAttr: ['periodSalary', 'periodSalaryID', 'periodCalc']
  },
  hr_accrualFund: {
    loadDataType: '4',
    entityName: 'hr_accrualFund',
    impEntityName: 'hr_importAccrualFund',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Розрахунок нарахувань на ЗП',
    entityDescription_uk: 'Розрахунок нарахувань на ЗП',
    entityDescription_ru: 'Расчет начислений на ЗП',
    entityType: '1',
    loadMethod: 'accrualFundSQL',
    pkGenerator: 'S_HR_ACCRUALFUND',
    sortOrder: 3180,
    map: false,
    orgAttr: 'orgID',
    withDetail: true,
    inAttrConfig: {
      sourceSum: convertNumberNotNull,
      baseSum: convertNumberNotNull,
      rate: convertNumberNotNull,
      addMinSum: convertNumberNotNull,
      paySum: convertNumberNotNull
    },
    dependence: {
      employeeNumberID: 'hr_employeeNumber',
      payFundID: 'hr_payFund'
    }
  },
  hr_accrualFundDt: {
    loadDataType: '4',
    entityName: 'hr_accrualFundDt',
    impEntityName: 'hr_importAccrualFundDt',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Деталізація нарахувань на ЗП',
    entityDescription_uk: 'Деталізація нарахувань на ЗП',
    entityDescription_ru: 'Детализация начислений на ЗП',
    entityType: '1',
    loadMethod: 'dict',
    pkGenerator: 'S_HR_ACCRUALFUNDDT',
    sortOrder: 3190,
    map: false,
    orgAttr: 'orgID',
    inAttrConfig: {
      paySum: convertNumberNotNull,
      sourceSum: convertNumber,
      baseSum: convertNumber
    },
    dependence: {
      accrualFundID: 'hr_accrualFund',
      payElID: 'hr_payEl',
      dictFundSourceID: 'ac_fundSource',
      departmentID: 'hr_department',
      accountID: 'gl_account'
    }
  },
  hr_balanceVacation: {
    loadDataType: '4',
    entityName: 'hr_balanceVacation',
    impEntityName: 'hr_importBalanceVacation',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Баланс резерву відпусток',
    entityDescription_uk: 'Баланс резерву відпусток',
    entityDescription_ru: 'Баланс резерва отпусков',
    entityType: '1',
    loadMethod: 'dict',
    pkGenerator: 'S_HR_BALANCEVACATION',
    sortOrder: 3200,
    map: false,
    orgAttr: 'orgID',
    dependence: {
      employeeNumberID: 'hr_employeeNumber',
      payElID: 'hr_payEl',
      payFundID: 'hr_payFund',
      dictFundSourceID: 'ac_fundSource',
      departmentID: 'hr_department',
      dictProgClassID: 'ac_dictProgClass',
      dictProjectID: 'ac_dictProject',
      dictCostTypeID: 'ac_dictCostType'
    },
    outAttrConfig: {
      periodCalcID: getPeriodByDate
    },
    removeAttr: [ 'dictFundSourceID', 'departmentID', 'dictProgClassID', 'dictProjectID', 'dictCostTypeID', 'tabNum' ],
    defaultValues: {
      orgID: (orgID) => {
        return orgID
      }
    },
    beforeImport: (orgID) => {
      const store = UB.DataStore('hr_balanceVacation')
      store.execSQL(`DELETE FROM hr_balanceVacation WHERE orgID = :orgID:`, { orgID })
    },
    beforeInsert: (orgID, row) => {
      if (!row.employeeNumberID && row.tabNum) {
        row.employeeNumberID = UB.Repository('hr_employeeNumberS')
          .attrs(['ID'])
          .where('orgID', '=', orgID)
          .where('tabNum', '=', row.tabNum)
          .selectScalar()
      }
      const accrualDt = {
        dictFundSourceID: row.dictFundSourceID,
        departmentID: row.departmentID,
        dictProgClassID: row.dictProgClassID,
        dictProjectID: row.dictProjectID,
        paySum: row.sumFrom
      }
      if (row.dictCostTypeID) {
        const coa = glCore.getCOA()
        if (coa && coa.dims['ac_dictCostType']) {
          accrualDt.d0 = coa.dims['ac_dictCostType'].ID
          accrualDt.d0Value = row.dictCostTypeID
        }
      }
      row.accrualDt = JSON.stringify([accrualDt])
    }
  },
  hr_dictStudGroup: {
    loadDataType: '1',
    entityName: 'hr_dictStudGroup',
    impEntityName: 'hr_importDictStudGroup',
    codeAttr: 'code',
    nameAttr: 'name',
    identifier: 'code',
    entityDescription: 'Групи навчання',
    entityDescription_uk: 'Групи навчання',
    entityDescription_ru: 'Группы обучения',
    entityDescription_az: 'Tədris qrupları',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3500,
    exists: dictExist,
    dictList: dictList,
    dependence: {
      departmentID: 'hr_department'
    }
  },
  ac_integrateMap: {
    loadDataType: '1',
    entityName: 'ac_integrateMap',
    impEntityName: 'hr_importIntegrateMap',
    codeAttr: '',
    nameAttr: '',
    identifier: '',
    entityDescription: 'Інтеграція сутностей',
    entityDescription_uk: 'Інтеграція сутностей',
    entityDescription_ru: 'Интеграция сущностей',
    entityDescription_az: 'Müəssisələrin inteqrasiyası',
    entityType: '1',
    loadMethod: 'dict',
    sortOrder: 3510,
    map: false,
    exists: dictExist,
    dictList: dictList,
    beforeInsert: (orgID, row, importParams, params, map) => {
      row.internalID = 0
      if (!row.externalID) row.externalID = 0
      const entityName = String(row['entityName'])
      if (entityName.toUpperCase() === 'KTID2CLID' && row['extrnlSystmCode'] === 'EXPRESS') {
        row.internalID = row.impID
      } else if (entityName.toUpperCase() === 'HR_EMPLOYEENUMBER') {
        row.internalID = UB.Repository('hr_employeeNumber')
          .attrs('ID')
          .where('orgID', '=', orgID)
          .where('tabNum', '=', row['impCode'])
          .limit(1)
          .selectScalar() || null
      } else if (entityName === 'Addresses' && row['extrnlSystmCode'] === 'EXPRESS') {
        const employeeID = UB.Repository('ac_integrateMap')
          .attrs('internalID')
          .where('externalID', '=', row['impID'])
          .where('extrnlSystmCode', '=', 'EXPRESS')
          .where('entityName', '=', 'hr_employee')
          .limit(1)
          .selectScalar()
        if (employeeID) {
          row.internalID = UB.Repository('ac_address')
            .attrs('ID')
            .where('ownerID', '=', employeeID)
            .where('addressType', '=', '2')
            .limit(1)
            .selectScalar() || null
          if (row.internalID) {
            row['entityName'] = 'ac_address'
          }
        }
      } else if (entityName === 'Passports' && row['extrnlSystmCode'] === 'EXPRESS') {
        const employeeID = UB.Repository('ac_integrateMap')
          .attrs('internalID')
          .where('externalID', '=', row['impID'])
          .where('extrnlSystmCode', '=', 'EXPRESS')
          .where('entityName', '=', 'hr_employee')
          .limit(1)
          .selectScalar()
        if (employeeID) {
          row.internalID = UB.Repository('hr_employeeDocs')
            .attrs('ID')
            .where('employeeID', '=', employeeID)
            .where('dictDocKindID.code', '=', '1')
            .limit(1)
            .selectScalar() || null
          if (row.internalID) {
            row['entityName'] = 'hr_employeeDocs'
          }
        }
      } else {
        row.internalID = UB.Repository('hr_importMap')
          .attrs('outputID')
          .where('orgID', '=', orgID)
          .where('entityName', '=', row['entityName'])
          .where('inputID', '=', row['impID'])
          .limit(1)
          .selectScalar() || null
      }
      delete row['impCode']
    }
  },
  schedules: {
    loadDataType: '5',
    typeLoad: 'function',
    entityName: 'schedules',
    entityDescription: 'Сформувати розклад роботи',
    entityDescription_uk: 'Сформувати розклад роботи',
    entityDescription_ru: 'Сформировать расписание работы',
    entityType: '3',
    sortOrder: 5001,
    map: false
  },
  timesheet: {
    loadDataType: '5',
    typeLoad: 'function',
    entityName: 'timesheet',
    entityDescription: 'Сформувати табель',
    entityDescription_uk: 'Сформувати табель',
    entityDescription_ru: 'Сформировать табель',
    entityType: '3',
    sortOrder: 5002,
    map: false
  },
  balance: {
    loadDataType: '5',
    typeLoad: 'function',
    entityName: 'balance',
    entityDescription: 'Сформувати сальдо по періодам',
    entityDescription_uk: 'Сформувати сальдо по періодам',
    entityDescription_ru: 'Сформировать сальдо по периодам',
    entityType: '3',
    sortOrder: 5003,
    map: false
  },
  removeCorrect: {
    loadDataType: '5',
    typeLoad: 'function',
    entityName: 'removeCorrect',
    entityDescription: 'Видалити сформовані коригування табеля',
    entityDescription_uk: 'Видалити сформовані коригування табеля',
    entityDescription_ru: 'Удалить сформированные корректировки табеля',
    entityType: '3',
    sortOrder: 5004,
    map: false
  }

}

function convertDate (value) {
  return (value !== '' && value) ? dateService.shiftDate(value) : null
}
function convertNumber (value) {
  return (value !== '' && value) ? Number(value.replace(',', '.')) : null
}
function convertNumberNotNull (value) {
  return (value !== '' && value) ? Number(value.replace(',', '.')) : 0
}

function getImpMapValue (value, orgID, entityName) {
  return (value !== null && value !== undefined) ? UB.Repository('hr_importMap')
    .attrs('outputID')
    .where('orgID', '=', orgID)
    .where('entityName', '=', entityName)
    .where('inputID', '=', value)
    .selectScalar() : null
}

function orgExist (row, params, orgID) {
  const identifier = row[params.identifier] ? params.identifier : 'name'
  return row[identifier] ? UB.Repository(params.entityName).attrs(['mi_data_id', params.codeAttr, params.nameAttr])
    .where(identifier, '=', row[identifier])
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_recordhistory_all: true }).selectSingle({
      'mi_data_id': 'ID'
    }) : null
}

function orgDepExist (row, params, orgID) {
  const identifier = row[params.identifier] ? params.identifier : 'name'
  return row[identifier] ? UB.Repository(params.entityName).attrs(['mi_data_id', params.codeAttr, params.nameAttr]).where('orgID', '=', orgID)
    .where(identifier, '=', row[identifier])
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_recordhistory_all: true }).selectSingle({
      'mi_data_id': 'ID'
    }) : null
}

function orgPositionExist (row, params, orgID) {
  let parentUnitID = row.parentUnitID ? getImpMapValue(row.parentUnitID, orgID, 'hr_organization') : null
  return row[params.identifier] ? UB.Repository(params.entityName).attrs(['mi_data_id', params.codeAttr, params.nameAttr]).where('orgID', '=', orgID)
    .where(params.identifier, '=', row[params.identifier])
    .whereIf(parentUnitID, 'parentUnitID', '=', parentUnitID)
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_recordhistory_all: true }).selectSingle({
      'mi_data_id': 'ID'
    }) : null
}

function orgDictList (params, orgID) {
  const attrs = ['mi_data_id', params.codeAttr, params.nameAttr]
  if (!attrs.find(o => o === 'code')) attrs.push('code')
  const data = UB.Repository(params.entityName).attrs(attrs)
    // .where('orgID', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .orderBy(params.nameAttr)
    .selectAsObject({
      'mi_data_id': 'ID'
    })
  data.forEach(row => {
    row.description = `${row[params.nameAttr]} ${row[params.codeAttr] ? `[${row[params.codeAttr]}]` : row.code ? row.code : ''}`
  })
  return data
}

function dictExist (row, params) {
  const attr = ['ID', params.codeAttr]
  if (params.nameAttr && params.nameAttr !== '') {
    attr.push(params.nameAttr)
  }
  let identifier = params.identifier
  let repo = UB.Repository(params.entityName).attrs(attr)
  if (!(identifier instanceof Array)) {
    return row[identifier] ? repo.where(identifier, '=', row[identifier]).limit(1).selectSingle() : null
  }
  identifier.forEach(i => {
    repo = repo.whereIf(row[i], i, '=', row[i] || null)
  })
  return repo.limit(1).selectSingle()
}

function dictList (params) {
  const attr = ['ID', params.codeAttr]
  if (params.nameAttr && params.nameAttr !== '') {
    attr.push(params.nameAttr)
  }
  const data = UB.Repository(params.entityName).attrs(attr).orderBy((params.nameAttr && params.nameAttr !== '') ? params.nameAttr : params.codeAttr)
    .selectAsObject({
      [params.nameAttr]: 'name',
      [params.codeAttr]: 'code'
    })
  data.forEach(row => {
    row.description = `${row.name}${(params.nameAttr && params.nameAttr !== '' && row.code) ? `[${row.code}]` : ''}`
  })
  return data
}

// eslint-disable-next-line no-unused-vars
function dictExistWithOrg (row, params, orgID) {
  const attr = ['ID', params.codeAttr]
  if (params.nameAttr && params.nameAttr !== '') {
    attr.push(params.nameAttr)
  }
  let identifier = params.identifier
  let repo = UB.Repository(params.entityName).attrs(attr).where(params.orgAttr, '=', orgID)
  if (!(identifier instanceof Array)) {
    return repo.where(identifier, '=', row[identifier]).limit(1).selectSingle()
  }
  identifier.forEach(i => {
    repo = repo.where(i, '=', row[i] || null)
  })
  return repo.limit(1).selectSingle()
}

function employeeNumberExistWithOrg (row, params, orgID) {
  const attr = ['ID', params.codeAttr]
  if (params.nameAttr && params.nameAttr !== '') {
    attr.push(params.nameAttr)
  }
  if (row.impOrgID) {
    orgID = UB.Repository('hr_importMap')
      .attrs('outputID')
      .where('orgID', '=', orgID)
      .where('entityName', '=', 'hr_organization')
      .where('inputID', '=', Number(row.impOrgID))
      .selectScalar()
  }
  const result = row[params.identifier] ? UB.Repository(params.entityName).attrs(attr)
    .where(params.identifier, '=', row[params.identifier])
    // .whereIf(row.taxCode, 'employeeID.taxCode', '=', row.taxCode)
    .where(params.orgAttr, '=', orgID)
    .whereIf(row.dateFrom, 'dateFrom', '=', dateService.shiftDate(row.dateFrom))
    .limit(1)
    .selectSingle() : null
  if (!result) {
    const empNumber = row[params.identifier] ? UB.Repository(params.entityName).attrs(attr)
      .where(params.identifier, '=', row[params.identifier])
      .whereIf(row.taxCode, 'employeeID.taxCode', '=', row.taxCode)
      .where(params.orgAttr, '=', orgID)
      .selectAsObject() : null
    return empNumber.length === 1 ? empNumber[0] : null
  } else {
    return result
  }
}

function dictListWithOrg (params, orgID) {
  const attr = ['ID', params.codeAttr]
  if (params.nameAttr && params.nameAttr !== '') {
    attr.push(params.nameAttr)
  }
  if (params.isOrgList) {
    attr.push(params.orgAttr)
  }
  const data = UB.Repository(params.entityName)
    .attrs(attr)
    .whereIf(!params.isOrgList, params.orgAttr, '=', orgID)
    .orderBy((params.nameAttr && params.nameAttr !== '') ? params.nameAttr : params.codeAttr)
    .selectAsObject({
      [params.nameAttr]: 'name',
      [params.codeAttr]: 'code'
    })
  data.forEach(row => {
    row.description = `${row.name}${(params.nameAttr && params.nameAttr !== '' && row.code) ? `[${row.code}]` : ''}`
  })
  return data
}

function getPeriodByDate (value, orgID) {
  return (value !== null && value !== undefined) ? UB.Repository('hr_dictPeriod')
    .attrs('ID')
    .where('orgID', '=', orgID)
    .where('dateFrom', '=', dateService.shiftDate(value))
    .selectScalar() : null
}

function getOrgBusinessType (value) {
  return (value !== null && value !== undefined) ? UB.Repository('cdn_orgbusinesstype')
    .attrs('ID')
    .where('code', '=', value)
    .selectScalar() : null
}

// initialization
for (const c in configList) {
  const config = configList[c]
  for (const entityName in config) {
    if (config.hasOwnProperty(entityName)) {
      if (typeof config[entityName] === 'function') {
        config[entityName] = config[entityName](entityName)
      }
    }
  }
}

function getShortFIO (fullFIO) {
  let lastName = fullFIO.split(' ')[0]
  let firstName = fullFIO.split(' ')[1] || ''
  let middleName = fullFIO.split(' ')[2] || ''
  if (firstName) {
    firstName = firstName.substr(0, 1).toUpperCase() + '.'
  }
  if (middleName) {
    middleName = middleName.substr(0, 1).toUpperCase() + '.'
  }
  return (lastName + ' ' + firstName + ' ' + middleName).trim()
}

function getDictValue (entityName, code, name) {
  let ID = UB.Repository(entityName)
    .attrs('ID')
    .where('code', '=', code)
    .where('name', '=', name)
    .selectScalar()
  if (!ID) {
    const store = UB.DataStore(entityName)
    ID = store.generateID()
    store.run('insert', {
      execParams: { ID, code, name }
    })
  }
  return ID
}
