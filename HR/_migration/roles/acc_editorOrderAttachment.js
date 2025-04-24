module.exports = [
  {
    name: 'acc_editorOrderAttachment',
    description: 'Редактор додатків наказів',
    description_uk: 'Редактор додатків наказів',
    description_ru: 'Редактор приложений к приказам',
    description_az: 'Əlavə əmr redaktoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    elsRule: [
      {
        description: 'Додатки до наказів',
        entityMask: 'hr_orderAttachment',
        methodMask: [ 'canEditPostedOrderAttachments' ]
      }
    ]
  }
]
