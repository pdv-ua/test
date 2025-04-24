const crud = ['select', 'addnew', 'insert', 'update', 'delete']

module.exports = [
  {
    name: 'acc_reviewPlanVacation',
    description: 'Переглядач планування відпусток',
    description_uk: 'Переглядач планування відпусток',
    description_ru: 'Просмотрщик планирования отпусков',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accVacation'],
    shortcutCodes: [
      'accVacation_VacationScheduleList',
      'hr_empVacationScheduleList',
      'accVacation_VacationScheduleListYear',
      'hr_empVacationScheduleListYear',
      'accVacation_VacationApSched',
      'hr_empOrderVacationApSchedA',
      'accVacation_VacationScheduleReport',
      'hr_empListUnusedVacation',
      'hr_empListNotplannedVacation',
      'hr_empOrderVacationapschedAdd',
      'hr_reportVacationExtract'
    ],
    elsRule: [
      {
        description: 'Табельний номер',
        entityMask: 'hr_employeeNumber',
        methodMask: ['select']
      },
      {
        description: 'hr_employeeNumberS',
        entityMask: 'hr_employeeNumberS',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_employeeNumberSR',
        entityMask: 'hr_employeeNumberSR',
        methodMask: [ 'select' ]
      },
      {
        description: 'Види відпусток',
        entityMask: 'hr_dictVacationKind',
        methodMask: [...crud]
      },
      {
        description: 'Періоди відпустки працівника',
        entityMask: 'hr_empVacationPeriod',
        methodMask: [...crud]
      },
      {
        description: 'Відпустка працівника',
        entityMask: 'hr_employeeVacation',
        methodMask: ['getDaycount']
      }
    ]
  }
]
