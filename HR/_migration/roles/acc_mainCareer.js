// const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_mainCareer',
    description: 'Ведення даних за службовою кар’єрою',
    description_uk: 'Ведення даних за службовою кар’єрою',
    description_ru: 'Ведение данных по служебной карьерой',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHRCarier'],
    shortcutCodes: [
      'accHRCarierRating',
      'accHRCarierTraining',
      'accHRCarier_search',
      'hr_empListAssessment',
      'accHRCarierAssesmentResult',
      'hr_empAssessmentResult',
      'accHRCarierListPosition',
      'hr_empListPosition',
      'accHRCarierAssesment',
      'hr_empAssessment',
      'accHRTrainingProgramA',
      'hr_empTrainingProgramA',
      'accHRTrainingProgramB',
      'hr_empTrainingProgramB',
      'accHRCarierFolderDictionary',
      'accHRCarier_dictCompetency',
      'hr_dictCompetency',
      'accHRCarier_dictAreasActivity',
      'hr_dictAreasActivity',
      'accHRCarier_dictPosReqrmnt',
      'hr_dictPosReqrmnt',
      'accHRCarier_dictBasicFunctn',
      'hr_dictBasicFunctn',
      'accHRCarier_dictProfCompetency',
      'hr_dictProfCompetency',
      'accHRCarier_dictTrainingForm',
      'hr_dictTrainingForm',
      'accHRCarier_dictTrainingTopic',
      'hr_dictTrainingTopic',
      'accHRCarier_dictTaskScore',
      'hr_dictTaskScore',
      'hr_empReportEmpListEval',
      'hr_reportEmpListEvaluation',
      'reportsEmployee',
      'hr_empReportEmpListForYearEval',
      'hr_reportEmpListForYearEval',
      'accHREmpFolderList',
      'hr_empListCustom'
    ],
    elsRule: [
      { description: 'Оцінювання (пошук)', entityMask: 'hr_empListAssessment', methodMask: ['select', 'search'] },
      { description: 'Висновок оцінювання', entityMask: 'hr_empAssessmentResult', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Пошук посади', entityMask: 'hr_empListPosition', methodMask: ['select', 'search'] },
      { description: 'Оцінювання', entityMask: 'hr_empAssessment', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Задачі оцінювання', entityMask: 'hr_empAssessmentTask', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Показники задачі оцінювання', entityMask: 'hr_empAssessmentTaskValue', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      {
        description: 'hr_attachDoc',
        entityMask: 'hr_attachDoc',
        methodMask: ['select', 'addnew', 'insert', 'delete', 'update']
      },
      {
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
          'continueReconciliation', 'cancelReconciliation']
      },
      {
        description: 'Участник согласования',
        entityMask: 'hr_recparticipant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Індивідуальна програма підвищення рівня професійної компетентності',
        entityMask: 'hr_empTrainingProgramDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'enumerateItems', 'moveItemUp', 'moveItemDown']
      },
      {
        description: 'Професійні компетентності',
        entityMask: 'hr_dictProfCompetency',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Види (форми навчання) професійної компетентності',
        entityMask: 'hr_dictTrainingForm',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Орієнтовна тематика',
        entityMask: 'hr_dictTrainingTopic',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Бали за завдання',
        entityMask: 'hr_dictTaskScore',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      { description: 'Індивідуальна програма підвищення рівня професійної компетентності', entityMask: 'hr_empTrainingProgram', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Компетенції', entityMask: 'hr_dictCompetency', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Напрями діяльності', entityMask: 'hr_dictAreasActivity', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Вимоги до посади', entityMask: 'hr_dictPosReqrmnt', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Основні функції організацій та підрозділів', entityMask: 'hr_dictBasicFunctn', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      {
        description: 'Орг Структура',
        entityMask: 'hr_positionVacContest',
        methodMask: ['selectVacancies', 'getVacancies', 'getVacanciesWithVacFrom', 'selectVacanciesWithVacFrom']
      }
    ]
  }
]
