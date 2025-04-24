module.exports = [
  {
    name: 'acc_editorEmployeeList',
    description: 'Редактор Реєстру осіб',
    description_uk: 'Редактор Реєстру осіб',
    description_ru: 'Редактор реестра лиц',
    description_az: 'Şəxslərin reyestrinə baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmp_employeeOrg',
      'ac_employeeOrg',
      'accHREmp_employeeTabList',
      'hr_employeeTabList',
      'accHREmp_employeeTabListCurrent',
      'accHREmp_employeePositionList',
      'hr_employeeTabListCurrent',
      'hr_employeePositionList',
      'accHREmp_employeeTabListNoStaff'
    ],
    elsRule: [
      {
        description: 'Особи - організації',
        entityMask: 'ac_employeeOrg',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Майно організації',
        entityMask: 'hr_Assets',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm']
      },
      {
        description: 'hr_employeeExperienceFix',
        entityMask: 'hr_employeeExperienceFix',
        methodMask: ['*']
      }
    ]
  }
]
