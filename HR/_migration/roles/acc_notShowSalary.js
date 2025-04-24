module.exports = [
  {
    name: 'acc_notShowSalary',
    description: 'Відсутність прав перегляду окладів',
    description_uk: 'Відсутність прав перегляду окладів',
    description_ru: 'Отсутствие прав пересмотра окладов',
    description_az: 'Əmək haqqının dəyişdirilməsi hüququ yoxdur',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: [
    ],
    elsRule:
      [
        {
          description: 'hr_service',
          entityMask: 'hr_service',
          methodMask: ['notShowSalary']
        }
      ]
  }
]