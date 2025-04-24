module.exports = [
  {
    name: 'acc_editorTable',
    description: 'Редактор Штатного розпису',
    description_uk: 'Редактор Штатного розпису',
    description_ru: 'Редактор штатное расписание',
    description_az: 'Ştat cədvəlini tərtib edən',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff', 'arm_accDoc'],
    shortcutCodes: [
      'accStaffFolderOrder',
      'accHR_staffTable',
      'hr_staffTable',
      'accDocFolderStaffOrder',
      'accDoc_staffTableRejectedA',
      'hr_staffTableRejectedA',
      'accDoc_staffTableRejectedMyA',
      'hr_staffTableRejectedMyA',
      'accDoc_staffTableOnCompletionA',
      'hr_staffTableOnCompletionA',
      'accDoc_staffTableOnCompletionMyA',
      'hr_staffTableOnCompletionMyA',
      'accHR_empOrderChgsalaryA',
      'hr_empOrderChgsalaryA',
      'accHR_staffTableAccrual',
      'hr_staffTableAccrual',
      'accHR_staffTableYear',
      'hr_staffTableYear',
      'hr_empOrderStaffTableMove',
      'accHR_empOrderStaffTableMove',
      'accStaff_department',
      'hr_department',
      'accStaff_positionSearch',
      'hr_searchPosition',
      'hr_positionReport',
      'accStaff_positionReport',
      'hr_orgstructConsolidatedMilitary',
      'hr_orderProcessingHistory',
      'accStaff_dictNameAddition',
      'hr_dictNameAddition',
      'hr_dictEventKnowledg'
    ],
    elsRule:
      [
        {
          description: 'Посади',
          entityMask: 'hr_position',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'copyPosition', 'newVersionPosition',
            'calcFunds', 'updateFunds', 'updateAddDescription', 'updateAllPosAddDescription', 'updateAllPosFunds',
            'getPlanSumByPosition', 'getSupervisorPosition'
          ]
        },
        {
          description: 'Планування штатного розпису',
          entityMask: 'hr_staffTable',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'canCreateOrder', 'generateXLSX', 'checkQuantity',
            'applyOrgStructure', 'getStaffTableMoveEmployees', 'doCheckStaffList', 'fixEntryOrderState']
        },
        {
          description: 'Орг Структура',
          entityMask: 'hr_staffUnit',
          methodMask: ['select', 'determineChild', 'liquidate', 'restore', 'restoreChanges', 'copyUnitTree', 'createNewVersion',
            'reNumerateStaffUnit', 'getPositionInfo', 'checkUnitRight', 'setIdxNum']
        },
        {
          description: 'Наказ з персоналу',
          entityMask: 'hr_empOrder',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getValidatorWarning', 'doPosting_STAFFTABLEMOVE',
            'doPosting', 'exchangeReview', 'sendReview', 'addStampData', 'getDocumentWithStampData'
          ]
        },
        { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['*'] },
        {
          description: 'hr_empOrderChgsalaryDet',
          entityMask: 'hr_empOrderChgsalaryDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
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
          description: 'hr_employeePosition',
          entityMask: 'hr_employeePosition',
          methodMask: ['addnew', 'insert', 'update', 'delete', 'getOrderSignerInfo',
            'getOrderSignerList', 'getStaffTableSignerList']
        },
        {
          description: 'hr_employeePositionS',
          entityMask: 'hr_employeePositionS',
          methodMask: ['getAcceptEmployee', 'getTempExecution', 'getAcceptEmployeeExternal']
        },
        {
          description: 'Шаблон узгодження',
          entityMask: 'hr_recstageTemplate',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate']
        },
        {
          description: 'hr_recstage',
          entityMask: 'hr_recstage',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
            'continueReconciliation', 'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
            'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
        },
        {
          description: 'КПК',
          entityMask: 'ac_dictProgClass',
          methodMask: ['select']
        },
        {
          description: 'КФК',
          entityMask: 'ac_dictFunctClass',
          methodMask: ['select']
        },
        {
          description: 'Код відомчої класифікації',
          entityMask: 'sia_dictDepClass',
          methodMask: ['select']
        },
        {
          description: 'Коди доходів бюджету',
          entityMask: 'sia_dictBic',
          methodMask: ['select']
        },
        {
          description: 'Вид коштів',
          entityMask: 'sia_dictResourceType',
          methodMask: ['select']
        },
        {
          description: 'Підрозділи',
          entityMask: 'hr_department',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'editBorderQuantity', 'newVersionDepartment']
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
        {
          description: 'Посади (результати пошуку)',
          entityMask: 'hr_searchPosition',
          methodMask: ['getSearchSql', 'select4search']
        },
        {
          description: 'Нарахування',
          entityMask: 'hr_positionAccrual',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'hr_idParam',
          entityMask: 'hr_idParam',
          methodMask: ['select', 'updateValuesIDs']
        },
        {
          description: 'Участник согласования',
          entityMask: 'hr_recparticipant',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Доповнення до назви',
          entityMask: 'hr_dictNameAddition',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        { description: 'Посада. Кваліфікаційні вимоги. Освіта', entityMask: 'hr_positionEducation', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посада. Кваліфікаційні вимоги. Досвід роботи', entityMask: 'hr_positionExperience', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посада. Кваліфікаційні вимоги. Професійні знання', entityMask: 'hr_positionProfi', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посада. Кваліфікаційні вимоги. Комп\'ютерна грамотність', entityMask: 'hr_positionPcLiteracy', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посада. Кваліфікаційні вимоги. Вчене звання', entityMask: 'hr_positionAcademStatus', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посада. Кваліфікаційні вимоги. Науковий ступінь', entityMask: 'hr_positionDegreeLevel', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посадовий обов\'язок', entityMask: 'hr_positionResp', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Вид шкідливих умов праці', entityMask: 'hr_positionHarmful', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Додаткові параметри', entityMask: 'hr_positionAddParams', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'Посадова інструкція', entityMask: 'hr_positionInstruction', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'repPrintForm'] },
        { description: 'Основні посадові обов’язки', entityMask: 'hr_positionMainResponsibiliti', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadPositionRespons'] },
        { description: 'Права та обов’язки', entityMask: 'hr_positionRightResponsibiliti', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'hr_positionServiceCommunication', entityMask: 'hr_positionServiceCommunication', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
        { description: 'hr_positionInstructionAcqList', entityMask: 'hr_positionInstructionAcqList', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
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
