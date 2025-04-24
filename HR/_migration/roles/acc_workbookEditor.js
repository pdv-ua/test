module.exports = [
  {
    name: 'acc_workbookEditor',
    description: 'Можливість редагування трудової діяльності',
    description_uk: 'Можливість редагування трудової діяльності',
    description_ru: 'Возможность редактирования трудовой деятельности',
    description_az: 'Əmək fəaliyyətinin redaktə edilməsi imkanı',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql,loadImportWorkbookData',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmp_employee',
      'hr_employee',
      'accHREmp_employeeTabList',
      'hr_employeeTabList',
      'accHREmp_employeePositionList'
    ],
    elsRule:
      [
        {
          description: 'Трудова книжка працівника',
          entityMask: 'hr_employeeWorkbook',
          methodMask: ['accWorkbookEditAlways', 'update', 'getPositionFullName']
        }
      ]
  }
]
