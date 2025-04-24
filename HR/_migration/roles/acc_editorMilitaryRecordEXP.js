module.exports = [
  {
    name: 'acc_editorMilitaryRecordEXP',
    description: 'Внесення даних по військовому обліку (розширена)',
    description_uk: 'Внесення даних по військовому обліку (розширена)',
    description_ru: 'Внесение данных по военному учету',
    description_az: 'Hərbi qeydiyyat haqqında məlumatların daxil edilməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'hr_employeeTabList',
      'hr_employee',
      'hr_empListWarFare',
      'hr_reportMilitaryRecruiters',
      'accHREmp_employeeTabListCurrent',
      'accHREmp_employeeTabList',
      'accHREmp_employee',
      'accHREmpFolderList',
      'reportsEmpListCommon',

      'reportsEmployee',
      'hr_empListCustom',
      'hr_reportEmpListMilitary',
      'hr_employeeTabListCurrent',
      'hr_empListByChilds',
      'hr_empListEducation',
      'hr_reportEmpListAlphabet',
      'hr_reportEmpListDisability',
      'hr_empListByDisability'
    ],
    elsRule: [
      {
        description: 'Особи',
        entityMask: 'hr_employee',
        methodMask: ['viewMilitaryEXP']
      },
      {
        description: 'Військовий облік',
        entityMask: 'hr_empStateMilitary',
        methodMask: ['addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_service',
        entityMask: 'hr_service',
        methodMask: ['notShowSalary']
      }
    ]
  }
]
