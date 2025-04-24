module.exports = [
  {
    name: 'acc_reviewOrganization',
    description: 'Переглядач організацій',
    description_uk: 'Переглядач організацій',
    description_ru: 'Просмотрщик организаций',
    description_az: 'Təşkilatlara baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrg',
      'accStaff_staffOrderOrgStructure',
      'hr_staffOrderOrgStructure',
      'accStaff_staffOrg',
      'hr_staffTreeOrg',
      'accStaff_organization',
      'hr_organization'
    ],
    elsRule: [
      {
        description: 'Організації',
        entityMask: 'hr_organization',
        methodMask: ['select']
      },
      {
        description: 'Ведення Організацій',
        entityMask: 'hr_staffOrderOrgStructure',
        methodMask: ['select']
      },
      {
        description: 'Особи організації',
        entityMask: 'org_employee',
        methodMask: ['select']
      },
      {
        description: 'Основні функції',
        entityMask: 'hr_basicFunctn',
        methodMask: ['select']
      },
      {
        description: 'Адреси',
        entityMask: 'ac_address',
        methodMask: ['select']
      },
      {
        description: 'Відповідальні особи',
        entityMask: 'hr_orgRespPosition',
        methodMask: ['select']
      },
      {
        description: 'Розрахункові рахунки',
        entityMask: 'ac_orgAccount',
        methodMask: ['select']
      },
      {
        description: 'Посадова інструкція',
        entityMask: 'hr_positionInstruction',
        methodMask: ['select']
      },
      {
        description: 'Посадові обов`язки',
        entityMask: 'hr_positionResp',
        methodMask: ['select']
      },
      {
        description: 'Кваліфікаційні вимоги',
        entityMask: 'hr_positionQualif',
        methodMask: ['select']
      },
      {
        description: 'Для конкурсу',
        entityMask: 'hr_positionContest',
        methodMask: ['select']
      },
      {
        description: 'Нарахування',
        entityMask: 'hr_positionAccrual',
        methodMask: ['select']
      },
      {
        description: 'Шкідливість',
        entityMask: 'hr_positionHarmful',
        methodMask: ['select']
      },
      {
        description: 'Заявки на добір персоналу',
        entityMask: 'hr_requestForStuff',
        methodMask: ['select']
      },
      {
        description: 'ФОП для посади',
        entityMask: 'hr_positionFunds',
        methodMask: ['selectData', 'selectFunds', 'getStringData']
      },
      {
        description: 'hr_department',
        entityMask: 'hr_department',
        methodMask: ['select', 'getPosCount']
      },
      {
        description: 'Орг Структура',
        entityMask: 'hr_staffUnit',
        methodMask: ['select', 'getPositionCount', 'generateXLSX']
      }
    ]
  }
]
