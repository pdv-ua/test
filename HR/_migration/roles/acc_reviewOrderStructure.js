module.exports = [
  {
    name: 'acc_reviewOrderStructure',
    description: 'Переглядач наказів за структурою',
    description_uk: 'Переглядач наказів за структурою',
    description_ru: 'Просмотрщик приказов по структуре',
    description_az: 'Struktur üzrə əmrlərə baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrgStruc',
      'accHR_empOrderOrgStructure',
      'hr_empOrderOrgStructure'
    ],
    elsRule: [
      {
        description: 'Наказ з персоналу',
        entityMask: 'hr_empOrder',
        methodMask: ['select']
      },
      {
        description: 'Наказ з персоналу. Всі деталі',
        entityMask: 'hr_empOrderDet',
        methodMask: ['select']
      },
      {
        description: 'Наказ з персоналу. Завдання',
        entityMask: 'hr_empOrderTaskDet',
        methodMask: ['select']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getTempExecution']
      },
      {
        description: 'ac_service',
        entityMask: 'ac_service',
        methodMask: ['userIsMemberOf']
      }
    ]
  }
]
