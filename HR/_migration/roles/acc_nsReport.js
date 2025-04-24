module.exports = [
  {
    name: 'acc_nsReport',
    description: 'Звіт 1-НС',
    description_uk: 'Звіт 1-НС',
    description_ru: 'Отчет 1-НС',
    description_az: '1NS',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: [],
    elsRule:
      [
        {
          description: 'hr_accrualReport',
          entityMask: 'hr_accrualReport',
          methodMask: ['get1NC']
        },
        {
          description: 'hr_idParam',
          entityMask: 'hr_idParam',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'updateValuesIDs']
        },
        {
          description: 'hr_repSetElement',
          entityMask: 'hr_repSetElement',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        }
      ]
  }
]
