module.exports = [{
  name: 'acc_editorOrderStructure',
  description: 'Редактор наказів за структурою',
  description_uk: 'Редактор наказів за структурою',
  description_ru: 'Редактор приказов по структуре',
  description_az: 'Struktur üzrə əmrləri tərtib edən',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accStaff'],
  shortcutCodes: [
    'hr_empOrderOrgStructure',
    'accHR_empOrderOrgStructure',
    'hr_dictEventKnowledg'
  ],
  elsRule: [
    {
      description: 'Наказ з персоналу',
      entityMask: 'hr_empOrder',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'repPrintForm', 'saveReportSettings',
        'fillOrderAccrual', 'getWorkDays', 'getWorkDays4Vac', 'setDateAndNumber', 'docPrintForm', 'isWorkDay',
        'fillOrderExperience', 'clearOrder*', 'doPosting_*', 'fillOrderAccrualWithSave',
        'doCancelPosting', 'doCancelPosting_ORGSTRUCTURE', 'getValidatorWarning', 'exchangeReview', 'sendReview', 'addStampData', 'getDocumentWithStampData'
      ]
    },
    {
      description: 'Індекс номеру наказу',
      entityMask: 'hr_dictEmpOrderIndex',
      methodMask: ['*']
    },
    {
      description: 'Наказ з персоналу. Всі деталі',
      entityMask: 'hr_empOrderDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'setItemIdx', 'moveItemUp', 'moveItemDown', 'enumerateItems']
    },
    {
      description: 'Наказ з персоналу. Завдання',
      entityMask: 'hr_empOrderTaskDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
    },
    {
      description: 'Этап согласования',
      entityMask: 'hr_recstage',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
        'continueReconciliation', 'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
        'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation'
      ]
    },
    { description: 'Додатки до наказів', entityMask: 'hr_orderAttachment', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    {
      description: 'Участник согласования',
      entityMask: 'hr_recparticipant',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
    },
    {
      description: 'Лист ознайомлення',
      entityMask: 'hr_acquaintanceList',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addEvaluationType']
    },
    {
      description: 'Шаблон узгодження',
      entityMask: 'hr_recstageTemplate',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate']
    },
    {
      description: 'Призначення',
      entityMask: 'hr_employeePosition',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getOrderSignerInfo']
    },
    {
      description: 'Призначення працівника',
      entityMask: 'hr_employeePositionS',
      methodMask: ['getTempExecution', 'selectPosGroups']
    },
    {
      description: 'ac_service',
      entityMask: 'ac_service',
      methodMask: ['userIsMemberOf']
    },
    { description: 'Заголовок та преамбула', entityMask: 'hr_dictEmpOrderText', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Підстава наказу', entityMask: 'hr_dictOrderDetReason', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Завдання', entityMask: 'hr_dictTask', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
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
}]
