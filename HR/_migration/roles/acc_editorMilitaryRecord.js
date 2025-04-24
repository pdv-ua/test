module.exports = [
  {
    name: 'acc_editorMilitaryRecord',
    description: 'Внесення даних по військовому обліку',
    description_uk: 'Внесення даних по військовому обліку',
    description_ru: 'Внесение данных по военному учету',
    description_az: 'Hərbi qeydiyyat haqqında məlumatların daxil edilməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'hr_employeeTabList',
      'hr_employeeTabListCurrent',
      'hr_employee',
      'hr_empListWarFare',
      'hr_reportEmpListMilitary',
      'hr_reportMilitaryRecruiters',
      'accHREmp_employeeTabListCurrent',
      'accHREmp_employeeTabList',
      'accHREmp_employee',
      'accHREmpFolderList',
      'hr_empListCustom',
      'reportsEmployee'
    ],
    elsRule: [
      {
        description: 'Особи',
        entityMask: 'hr_employee',
        methodMask: ['viewMilitary']
      },
      {
        description: 'Військовий облік',
        entityMask: 'hr_empStateMilitary',
        methodMask: ['addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
