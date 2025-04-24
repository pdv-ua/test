module.exports = [
  {
    name: 'acc_reviewOrderTable',
    description: 'Переглядач наказів за Штатним розписом',
    description_uk: 'Переглядач наказів за Штатним розписом',
    description_ru: 'Просмотрщик приказов по штатному расписанию',
    description_az: 'Ştat cədvəli üzrə əmrlərə baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrder',
      'accHR_empOrderStaffList',
      'hr_empOrderStaffList',
      'hr_empOrderStaffTableMove',
      'accHR_empOrderStaffTableMove'
    ],
    elsRule:
      [
        {
          description: 'Організації',
          entityMask: 'hr_organization',
          methodMask: ['select']
        },
        {
          description: 'hr_empOrder',
          entityMask: 'hr_empOrder',
          methodMask: [ 'select' ]
        },
        {
          description: 'Підрозділи',
          entityMask: 'hr_department',
          methodMask: ['select']
        },
        {
          description: 'Посади',
          entityMask: 'hr_position',
          methodMask: ['select']
        },
        {
          description: 'Орг Структура',
          entityMask: 'hr_staffUnit',
          methodMask: ['select']
        },
        {
          description: 'Накази за штатним розписом',
          entityMask: 'hr_staffTable',
          methodMask: ['select', 'generateXLSX']
        },
        {
          description: 'Накази за штатним розписом. Detail',
          entityMask: 'hr_empOrderTaskDet',
          methodMask: ['select']
        },
        {
          description: 'hr_employeePosition',
          entityMask: 'hr_employeePosition',
          methodMask: ['select']
        },
        {
          description: 'hr_employeePositionS',
          entityMask: 'hr_employeePositionS',
          methodMask: [ 'select', 'getTempExecution' ]
        },
        {
          description: 'hr_employeePositionSR',
          entityMask: 'hr_employeePositionSR',
          methodMask: [ 'select' ]
        },
        {
          description: 'ac_service',
          entityMask: 'ac_service',
          methodMask: ['userIsMemberOf']
        }
      ]
  }
]
