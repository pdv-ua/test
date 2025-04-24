module.exports = [
  {
    name: 'acc_cancelOrder',
    description: 'Відміна проведення наказів',
    description_uk: 'Відміна проведення наказів',
    description_ru: 'Відміна проведення приказов',
    description_az: 'Əmrləri ləğv etmək',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: [],
    elsRule: [
      { description: 'Наказ про зміну штатного розпису', entityMask: 'hr_staffOrder', methodMask: ['doCancelPosting'] },
      { description: 'Ведення Організацій', entityMask: 'hr_staffOrderOrgStructure', methodMask: ['doCancelPosting'] },
      { description: 'Планування штатного розпису', entityMask: 'hr_staffTable', methodMask: ['doCancelPosting', 'generateXLSX'] },
      { description: 'Планування Структури', entityMask: 'hr_staffTableOrgStructure', methodMask: ['doCancelPosting'] },
      { description: 'Накази', entityMask: 'hr_empOrder', methodMask: ['doCancelPosting', 'doCancelPosting_*', 'exchangeReview', 'sendReview'] }
    ]
  }
]
