module.exports = [
  {
    name: 'acc_payrollNumberAllEdit',
    description: 'Фахівець з масової зміна значень в особових рахунках заробітної плати',
    description_uk: 'Фахівець з масової зміна значень в особових рахунках заробітної плати',
    description_ru: 'Специалист по массовой изменение значений в лицевых счетах заработной платы',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accSalary'],
    shortcutCodes: [
      'accSalary_employeeNumberList',
      'hr_employeeNumberList'
    ],
    elsRule: [
      {
        description: 'hr_employeeNumber',
        entityMask: 'hr_employeeNumber',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'getNextTabNum', 'checkParams', 'view', 'restoreRecord', 'dataCorrection' ]
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
      }
    ]
  }
]
