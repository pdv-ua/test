module.exports = [
  {
    name: 'acc_editorDocAttachment',
    description: 'Редактор додатків до документів',
    description_uk: 'Редактор додатків до документів',
    description_ru: 'Редактор приложений к документам',
    description_az: 'Sənəd qoşmalarını tərtib edən',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [],
    elsRule:
      [
        {
          description: 'Додатки до штатної одиниці',
          entityMask: 'hr_staffUnitAttachment',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_orderAttachment',
          entityMask: 'hr_orderAttachment',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_attachDoc',
          entityMask: 'hr_attachDoc',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        }
      ]
  }
]
