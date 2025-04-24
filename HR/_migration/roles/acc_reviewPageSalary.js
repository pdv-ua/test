
module.exports = [
  {
    name: 'acc_reviewPageSalary',
    description: 'Переглядач Електронної картки Працівника - ЗП',
    description_uk: 'Переглядач Електронної картки Працівника - ЗП',
    description_ru: 'Просмотрщик Электронной карточки Работника - ЗП',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
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
        description: 'Особи',
        entityMask: 'hr_employee',
        methodMask: ['select', 'view', 'docPrintForm', 'repPrintForm']
      },
      {
        description: 'Особи',
        entityMask: 'hr_employeeNumber',
        methodMask: ['select', 'update', 'view', 'getNextTabNum', 'checkParams']
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
        description: 'Організації',
        entityMask: 'hr_employee',
        methodMask: ['viewAccrualBalance']
      }
    ]
  }
]
