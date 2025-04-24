module.exports = [
  {
    name: 'acc_mainFOP',
    description: 'Відповідальний за Фонд оплати праці',
    description_uk: 'Відповідальний за Фонд оплати праці',
    description_ru: 'Ответственный за Фонд оплаты труда',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'hr_reportSetParam'
    ],
    elsRule: [

    ]
  }
]
