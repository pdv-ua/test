module.exports = [
  {
    name: 'acc_reviewRequestInCab',
    description: 'Переглядач заяв "Підпорядковані працівники" - Особистий кабінет',
    description_uk: 'Переглядач заяв "Підпорядковані працівники" - Особистий кабінет',
    description_ru: 'Переглядач заяв "Підпорядковані працівники" - Особистий кабінет',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: [],
    elsRule: [
      {
        description: 'Заяви',
        entityMask: 'hr_request',
        methodMask: ['select', 'update', 'addnew', 'insert', 'viewPrintForm', 'showFromEmployeeTabs', 'showSubordinatesInEmpTabs']
      },
      {
        description: 'hr_employeeNumber',
        entityMask: 'hr_employeeNumber',
        methodMask: ['getSubordinates']
      }
    ]
  }
]
