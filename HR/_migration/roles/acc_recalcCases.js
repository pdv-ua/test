module.exports = [
  {
    name: 'acc_recalcCases',
    description: 'Перерахунок відмінків підрозділів',
    description_uk: 'Перерахунок відмінків підрозділів',
    description_ru: 'Пересчет падежей подразделений',
    description_az: 'Şöbələrin hallarının təkrar hesablanması',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaff_staffValid',
      'hr_staffTreeValid'
    ],
    elsRule: [
      {
        description: 'hr_department',
        entityMask: 'hr_department',
        methodMask: [ 'recalcCases' ]
      }
    ]
  }
]
