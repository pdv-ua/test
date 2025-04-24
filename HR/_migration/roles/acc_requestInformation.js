// acc_requestInformation
module.exports = [
  {
    name: 'acc_requestInformation',
    description: 'Запит інформації по особі',
    description_uk: 'Запит інформації по особі',
    description_ru: 'Запрос информации по лицу',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHRFolderStaffRequest',
      'accHRStaffRequestNew',
      'hrAccStaffRequestNew',
      'accHRStaffRequestAll',
      'hrAccStaffRequestAll'
    ],
    elsRule: [
      {
        description: 'Запит на доступ інформації за Працівником',
        entityMask: 'hr_accessStaffRequest',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'setRequestState']
      },
      {
        description: 'uba_user',
        entityMask: 'uba_user',
        methodMask: ['select']
      }
    ]
  }
]
