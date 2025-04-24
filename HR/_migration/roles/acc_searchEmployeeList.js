module.exports = [
  {
    name: 'acc_searchEmployeeList',
    description: 'Пошук Реєстру осіб',
    description_uk: 'Пошук Реєстру осіб',
    description_ru: 'Поиск Реестра физических лиц',
    description_az: 'Əməkdaşların reyestinin axtarışı',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmpSearch',
      'accHREmp_empSearch',
      'hr_searchEmployee',
      'accHREmp_personSearch',
      'hr_searchPerson',
      'accHREmp_positionSearch',
      'hr_searchPosition',
      'accStaff_positionSearch',
      'hr_positionReport',
      'accStaff_positionReport'
    ],
    elsRule: [
      {
        description: 'Працівники (результати пошуку)',
        entityMask: 'hr_searchEmployee',
        methodMask: ['getSearchSql', 'select4search', 'select4searchPos']
      },
      {
        description: 'Особи (результати пошуку)',
        entityMask: 'hr_searchPerson',
        methodMask: ['getSearchSql', 'select4search']
      },
      {
        description: 'Посади (результати пошуку)',
        entityMask: 'hr_searchPosition',
        methodMask: ['getSearchSql', 'select4search']
      },
      {
        description: 'Оргструктура',
        entityMask: 'hr_staffUnit',
        methodMask: ['checkUnitRight']
      },
      {
        description: 'Особи - організації',
        entityMask: 'ac_employeeOrg',
        methodMask: ['select']
      },
      {
        description: 'hr_employeeExperience',
        entityMask: 'hr_employeeExperience',
        methodMask: ['getTotalExperience']
      },
      {
        description: 'Звіти по пошуку',
        entityMask: 'hr_searchAndCompare',
        methodMask: ['search', 'runResultReport']
      },
      {
        description: 'hr_idParam',
        entityMask: 'hr_idParam',
        methodMask: ['select', 'updateValuesIDs']
      }
    ]
  }
]
