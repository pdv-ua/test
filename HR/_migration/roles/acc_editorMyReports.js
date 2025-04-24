module.exports = [
  {
    name: 'acc_editorMyReports',
    description: 'Доступність дашборду "Мої звіти"',
    description_uk: 'Доступність дашборду "Мої звіти"',
    description_ru: 'Доступність дашборду "Мої звіти"',
    description_az: 'Доступність дашборду "Мої звіти"',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    /*shortcutCodes: [

      ],*/
    elsRule: [
      {
        description: 'hr_service',
        entityMask: 'hr_service',
        methodMask: ['dashboard', 'myReportsDashboard']
      }
    ]
  }
]
