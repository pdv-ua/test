module.exports = [
  {
    name: 'acc_editorOrderTable',
    description: 'Редактор наказів за Штатним розписом',
    description_uk: 'Редактор наказів за Штатним розписом',
    description_ru: 'Редактор приказов по штатному расписанию',
    description_az: 'Ştat cədvəli üzrə əmrləri tərtib edən',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrder',
      'accHR_empOrderStaffList',
      'hr_empOrderStaffList',
      'hr_empOrderStaffTableMove',
      'accHR_empOrderStaffTableMove',
      'accStaff_dictNameAddition',
      'hr_dictNameAddition',
      'hr_dictEventKnowledg'
    ],
    elsRule:
      [
        {
          description: 'Організації',
          entityMask: 'hr_organization',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_empOrder',
          entityMask: 'hr_empOrder',
          methodMask: [
            'repPrintForm',
            'select',
            'addnew',
            'insert',
            'update',
            'delete',
            'doPosting',
            'saveReportSettings',
            'fillOrderAccrual',
            'fillOrderAccrualWithSave',
            'getWorkDays',
            'getWorkDays4Vac',
            'setDateAndNumber',
            'docPrintForm',
            'getValidatorWarning',
            'isWorkDay',
            'fillOrderExperience',
            'clearOrder*',
            'doPosting_*',
            'exchangeReview',
            'sendReview',
            'addStampData', 'getDocumentWithStampData'
          ]
        },
        { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['*'] },
        {
          description: 'Підрозділи',
          entityMask: 'hr_department',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'newVersionDepartment']
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
          methodMask: ['select', 'determineChild', 'liquidate', 'restore', 'restoreChanges', 'copyUnitTree', 'reNumerateStaffUnit', 'getPositionInfo']
        },
        {
          description: 'Накази за штатним розписом',
          entityMask: 'hr_staffTable',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'canCreateOrder', 'generateXLSX', 'checkQuantity',
            'applyOrgStructure', 'getStaffTableMoveEmployees', 'doCheckStaffList']
        },
        { description: 'hr_staffTariffing', entityMask: 'hr_staffTariffing', methodMask: ['getStaffTariffingMoveEmployees'] },
        {
          description: 'Накази за штатним розписом. Detail',
          entityMask: 'hr_empOrderTaskDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_empOrderChgSalPosDet',
          entityMask: 'hr_empOrderChgSalPosDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Шаблон узгодження',
          entityMask: 'hr_recstageTemplate',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate']
        },
        {
          description: 'hr_empOrderStafftablemoveDet',
          entityMask: 'hr_empOrderStafftablemoveDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_empOrderSTMovePosDet',
          entityMask: 'hr_empOrderSTMovePosDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_employeePositionS',
          entityMask: 'hr_employeePositionS',
          methodMask: ['getTempExecution']
        },
        {
          description: 'hr_employeePosition',
          entityMask: 'hr_employeePosition',
          methodMask: ['getStaffTableSignerList']
        },
        {
          description: 'ac_service',
          entityMask: 'ac_service',
          methodMask: ['userIsMemberOf']
        },
        {
          description: 'Масова зміна окладів',
          entityMask: 'hr_massSalaryChange',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'fillByTariff', 'fillByScheme', 'applyChanges',
            'cancelChanges', 'clearChanges', 'calcAccruals', 'fillByAccrual']
        },
        {
          description: 'Масова зміна нарахувань',
          entityMask: 'hr_massAccrualChange',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'fillChanges', 'applyChanges', 'cancelChanges', 'clearChanges']
        },
        {
          description: 'Масова зміна посад',
          entityMask: 'hr_massPosChange',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadPosChanges', 'applyChanges', 'cancelChanges', 'clearChanges']
        },
        { description: 'Лист розсилки', entityMask: 'hr_mailingLetter', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Шаблон листа розсилки', entityMask: 'hr_mailingLetterTemplate', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate'] },
        { description: 'Шаблон листа розсилки. Учасники', entityMask: 'hr_mailingLetterTemplateDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Лист підписантів', entityMask: 'hr_empOrderSignDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Шаблон листа підписантів', entityMask: 'hr_empOrderSignTemplate', methodMask: ['*'] },
        { description: 'Шаблон листа підписантів. Учасники', entityMask: 'hr_empOrderSignTemplateDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Лист погодження', entityMask: 'hr_empOrdListAppruv', methodMask: ['*'] },
        { description: 'Шаблон листа погодження', entityMask: 'hr_empOrdListAppruvTemplate', methodMask: ['*'] },
        { description: 'Шаблон листа погодження. Учасники', entityMask: 'hr_empOrdListAppruvTemplateDt', methodMask: ['*'] },
        { description: 'Шаблон листа ознайомлення', entityMask: 'hr_empOrderAcquaintListTpl', methodMask: ['*'] },
        { description: 'Шаблон листа ознайомлення. Учасники', entityMask: 'hr_empOrderAcquaintListTplDet', methodMask: ['*'] },
        { description: 'Події ознайомлення', entityMask: 'hr_dictEventKnowledg', methodMask: [ '*' ] },
        {
          description: 'hr_employeeNumberS',
          entityMask: 'hr_employeeNumberS',
          methodMask: [ 'select' ]
        },
        {
          description: 'hr_orderStateHistory',
          entityMask: 'hr_orderStateHistory',
          methodMask: [ 'select' ]
        },
        {
          description: 'hr_empOrdListAppruv',
          entityMask: 'hr_empOrdListAppruv',
          methodMask: ['*']
        }
      ]
  }
]
