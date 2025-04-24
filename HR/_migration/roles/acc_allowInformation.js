// acc_requestInformation
module.exports = [
  {
    name: 'acc_allowInformation',
    description: 'Надання інформації по особі',
    description_uk: 'Надання інформації по особі',
    description_ru: 'Предоставление информации по физическому лицу',
    description_az: 'Bir şəxs haqqında məlumatın verilməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHRFolderStaffRequest',
      'accHRStaffRequestSended',
      'hrAccStaffRequestSended',
      'accHRStaffRequestOwner',
      'hrAccStaffRequestOwner'
    ],
    elsRule: [
      {
        description: 'Запит на доступ інформації за Працівником',
        entityMask: 'hr_accessStaffRequest',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'setRequestState']
      },
      {
        description: 'Особи - організації',
        entityMask: 'ac_employeeOrg',
        methodMask: ['insert']
      },
      {
        description: 'hr_employeeExperience',
        entityMask: 'hr_employeeExperience',
        methodMask: ['getTotalExperience']
      }
    ]
  }
]
