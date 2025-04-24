module.exports = [
  {
    name: 'acc_reviewDocAttachment',
    description: 'Перегляд додатків до документів',
    description_uk: 'Перегляд додатків до документів',
    description_ru: 'Просмотр приложений к документам',
    description_az: 'Sənəd qoşmalarına baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [],
    elsRule:
      [
        {
          description: 'Додатки до штатної одиниці',
          entityMask: 'hr_staffUnitAttachment',
          methodMask: ['select']
        },
        {
          description: 'hr_orderAttachment',
          entityMask: 'hr_orderAttachment',
          methodMask: ['select']
        },
        {
          description: 'hr_orderAttachment',
          entityMask: 'hr_orderAttachment',
          methodMask: ['select']
        }
      ]
  }
]
