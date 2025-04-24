module.exports = [
  {
    name: 'acc_editorStructure',
    description: 'Планувальник структури організації',
    description_uk: 'Планувальник структури організації',
    description_ru: 'Планировщик структуры организации',
    description_az: 'Təşkilatın strukturunu planlaşdıran',
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
      'hr_diagram',
      'hr_orgstructConsolidatedMilitary',
      'accStaff_dictNameAddition',
      'hr_dictNameAddition'
    ],
    elsRule: [
      {
        description: 'Підписанти',
        entityMask: 'hr_employeePosition',
        methodMask: ['getOrderSignerInfo', 'getOrderSignerList']
      },
      {
        description: 'Організації',
        entityMask: 'hr_organization',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підрозділи',
        entityMask: 'hr_department',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getPosCount', 'editBorderQuantity', 'newVersionDepartment']
      },
      {
        description: 'Посади',
        entityMask: 'hr_position',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'copyPosition', 'newVersionPosition',
          'calcFunds', 'updateFunds', 'updateAddDescription', 'updateAllPosAddDescription', 'updateAllPosFunds', 'getPlanSumByPosition']
      },
      {
        description: 'Доповнення до назви',
        entityMask: 'hr_dictNameAddition',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Орг Структура',
        entityMask: 'hr_staffUnit',
        methodMask: ['select', 'determineChild', 'liquidate', 'restore', 'restoreChanges', 'copyUnitTree', 'getPositionInfo',
          'createNewVersion', 'setIdxNum', 'getPositionCount', 'setPositionCount', 'generateXLSX', 'reNumerateStaffUnit']
      },
      {
        description: 'Орг Структура',
        entityMask: 'hr_staffTableOrgStructure',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'checkQuantity']
      },
      {
        description: 'Накази',
        entityMask: 'hr_order',
        methodMask: ['select', 'update']
      },
      {
        description: 'Діаграми',
        entityMask: 'org_diagram',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
