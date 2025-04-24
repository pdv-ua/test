module.exports = [
  {
    name: 'acc_mainHRMIS',
    description: 'Уповноважений HRMIS по Організації',
    description_uk: 'Уповноважений HRMIS по Організації',
    description_ru: 'Уполномоченный HRMIS по Организации',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accAdm'],
    shortcutCodes: [
      'accHRFolderAccessRequest',
      'accHRAccessRequestPROJECT',
      'hr_accessRequestPROJECT',
      'accHRAccessRequestONRECONCILATION',
      'hr_accessRequestONRECONCILATION',
      'accHRAccessRequestRECONCILED',
      'hr_accessRequestRECONCILED',
      'accHRAccessRequestCANCELED',
      'hr_accessRequestCANCELED',
      'uba_role',
      'accAdmHRUser',
      'uba_user',
      'hr_user'
    ],
    elsRule: [
      {
        description: 'Заявка на надання доступу',
        entityMask: 'hr_accessRequest',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'doSend' ]
      },
      {
        description: 'Група заявки на надання доступу',
        entityMask: 'hr_accessRequestGroup',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Організація заявки на надання доступу',
        entityMask: 'hr_accessRequestOrg',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Роль заявки на надання доступу',
        entityMask: 'hr_accessRequestRole',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Ролі',
        entityMask: 'uba_role',
        methodMask: [ 'select' ]
      },
      {
        description: 'Користувачі',
        entityMask: 'uba_user',
        methodMask: [ 'select' ]
      },
      {
        description: 'userRole',
        entityMask: 'uba_userrole',
        methodMask: [ 'select' ]
      },
      {
        description: 'uba_usergroup',
        entityMask: 'uba_usergroup',
        methodMask: [ 'select' ]
      },
      {
        description: 'Організації користувача',
        entityMask: 'ac_userOrganization',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_vpninfo',
        entityMask: 'hr_vpninfo',
        methodMask: [ 'select' ]
      }
    ]
  }
]
