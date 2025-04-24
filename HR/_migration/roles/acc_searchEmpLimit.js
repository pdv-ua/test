module.exports = [
  {
    name: 'acc_searchEmpLimit',
    description: 'Пошук працівників обмежений',
    description_uk: 'Пошук працівників обмежений',
    description_ru: 'Поиск работников ограничен',
    sessionTimeout: 30,

    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: [],
    elsRule:
                  [
                    {
                      description: 'Сервіс HR',
                      entityMask: 'hr_service',
                      methodMask: ['dashboard']
                    },
                    {
                      description: 'Особи',
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
                      description: 'Підписанти',
                      entityMask: 'hr_employeePosition',
                      methodMask: ['select']
                    },
                    {
                      description: 'hr_employeePositionS',
                      entityMask: 'hr_employeePositionS',
                      methodMask: [ 'select' ]
                    },
                    {
                      description: 'hr_employeePositionSR',
                      entityMask: 'hr_employeePositionSR',
                      methodMask: [ 'select' ]
                    },
                    {
                      description: 'Особи',
                      entityMask: 'hr_employee',
                      methodMask: ['select']
                    }
                  ]
  }
]
