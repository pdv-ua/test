module.exports = [
  {
    name: 'acc_reviewStructure',
    description: 'Переглядач структури організації',
    description_uk: 'Переглядач структури організації',
    description_ru: 'Просмотрщик структуры организации',
    description_az: 'Təşkilatın strukturuna baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrgStruc',
      'accHR_staffTableOrgStructure',
      'hr_staffTableOrgStructure',
      'accStaff_staffValid',
      'hr_staffTreeValid',
      'accStaff_department',
      'hr_department',
      'accStaff_position',
      'hr_position',
      'accStaff_diagram',
      'hr_diagram'
    ],
    elsRule: [
      {
        description: 'Організації',
        entityMask: 'hr_organization',
        methodMask: ['select']
      },
      {
        description: 'Підрозділи',
        entityMask: 'hr_department',
        methodMask: ['select', 'getPosCount']
      },
      {
        description: 'Посади',
        entityMask: 'hr_position',
        methodMask: ['select']
      },
      {
        description: 'Орг Структура',
        entityMask: 'hr_staffUnit',
        methodMask: ['select', 'checkUnitRight', 'getPositionCount']
      },
      {
        description: 'Орг Структура',
        entityMask: 'hr_staffTableOrgStructure',
        methodMask: ['select']
      },
      {
        description: 'Накази',
        entityMask: 'hr_order',
        methodMask: ['select']
      },
      {
        description: 'hr_searchEmployee',
        entityMask: 'hr_searchEmployee',
        methodMask: ['getSearchSql']
      },
      {
        description: 'hr_searchPosition',
        entityMask: 'hr_searchPosition',
        methodMask: ['getSearchSql']
      },
      {
        description: 'hr_report',
        entityMask: 'hr_report',
        methodMask: ['generateXlsx', 'getAvgListEmpCount', 'getListEmpCount']
      },
      {
        description: 'hr_employee',
        entityMask: 'hr_employee',
        methodMask: ['view']
      },
      {
        description: 'Шаблони пошуку',
        entityMask: 'hr_searchTemplate',
        methodMask: ['select4user', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Звіти за Оргструктурою',
        entityMask: 'hr_reportOrgcountsByCateg',
        methodMask: ['getGrouppedByParentUnitAndCategData', 'selectEmpPosData', 'getGrouppedByParentUnitData']
      },
      {
        description: 'hr_positionFunds',
        entityMask: 'hr_positionFunds',
        methodMask: ['getStringData']
      },
      {
        description: 'Звіти за Оргструктурою',
        entityMask: 'hr_reportOrgstructInfo',
        methodMask: ['getData']
      },
      {
        description: 'Звіти за Оргструктурою в Excel',
        entityMask: 'hr_report',
        methodMask: ['runTypicalOrgPlanByPay', 'runTariffing', 'runTypicalOrgPlanByPayGrp', 'getAvgListEmpCount', 'getAvgListEmpCount', 'getListEmpCount']
      }
    ]
  }
]
