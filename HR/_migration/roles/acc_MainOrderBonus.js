// const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_MainOrderBonus',
    description: 'Відповідальний за преміювання персоналу',
    description_uk: 'Відповідальний за преміювання персоналу',
    description_ru: 'Ответственный за премирования персонала',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderOrdersChgSalary',
      'accHR_empOrderBountyA',
      'hr_empOrderBountyA',
      'hr_dictReasonBounty',
      'hr_empOrderAddSalaryA',
      'accHR_empOrderAddSalaryA',
      'hr_empOrderBountyHelpA',
      'accHR_empOrderBountyHelpA',
      'hr_empOrderAddSalaryGovA',
      'accHR_empOrderAddSalaryGovA',
      'hr_empOrderCancelSalaryA',
      'accHR_empOrderCancelSalaryA',
      'hr_dictEventKnowledg'
    ],
    elsRule: [
      { description: 'Наказ з персоналу',
        entityMask: 'hr_empOrder',
        methodMask: [
          'repPrintForm',
          'select',
          'addnew',
          'insert',
          'update',
          'delete',
          'doPosting',
          'doCancelPosting',
          'saveReportSettings',
          'fillOrderAccrual',
          'fillOrderAccrualWithSave',
          'getWorkDays',
          'getWorkDays4Vac',
          'setDateAndNumber',
          'docPrintForm',
          'isWorkDay',
          'getValidatorWarning',
          'fillOrderExperience',
          'clearOrder*',
          'doPosting_BOUNTY',
          'doCancelPosting_BOUNTY',
          'doPosting_ADDSALARY',
          'doCancelPosting_ADDSALARY',
          'doPosting_BOUNTY_HELP',
          'doPosting_CANCELSALARY',
          'doPosting_ADDSALARYGOV',
          'doCancelPosting_BOUNTY_HELP',
          'doCancelPosting_CANCELSALARY',
          'doCancelPosting_ADDSALARYGOV',
          'exchangeReview',
          'sendReview'
        ]
      },
      { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['*'] },
      { description: 'hr_empOrderDet', entityMask: 'hr_empOrderDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'hr_empOrderBountyDet', entityMask: 'hr_empOrderBountyDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadEmployeeList', 'fillEmployee', 'recalcBounty', 'updateBountyPayEl', 'importList'] },
      { description: 'hr_empOrderTaskDet', entityMask: 'hr_empOrderTaskDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'hr_empOrderChgSalEmpDet', entityMask: 'hr_empOrderChgSalEmpDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'fillCancelSalary', 'fillAddSalary'] },
      { description: 'hr_empOrderAddsalaryDet', entityMask: 'hr_empOrderAddsalaryDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'recalc', 'clearEmployees', 'loadAccrualChangesFromStaffTable', 'loadAccrualChangesFromStaffTariffing'] },
      { description: 'hr_empOrderAddsalarygovDet', entityMask: 'hr_empOrderAddsalarygovDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'checkAccrualDates'] },
      { description: 'hr_empOrderCancelsalaryDet', entityMask: 'hr_empOrderCancelsalaryDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      {
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
          'continueReconciliation', 'cancelReconciliation',
          'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
      },
      {
        description: 'Шаблон узгодження',
        entityMask: 'hr_recstageTemplate',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate']
      },
      {
        description: 'Лист ознайомлення',
        entityMask: 'hr_acquaintanceList',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addEvaluationType']
      },
      {
        description: 'hr_orderAttachment',
        entityMask: 'hr_orderAttachment',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictReasonBounty',
        entityMask: 'hr_dictReasonBounty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_employeePosition',
        entityMask: 'hr_employeePosition',
        methodMask: ['getOrderSignerInfo', 'getOrderSignerList']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getTempExecution']
      },
      { description: 'Лист розсилки', entityMask: 'hr_mailingLetter', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Шаблон листа розсилки', entityMask: 'hr_mailingLetterTemplate', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate'] },
      { description: 'Шаблон листа розсилки. Учасники', entityMask: 'hr_mailingLetterTemplateDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Лист підписантів', entityMask: 'hr_empOrderSignDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Шаблон листа підписантів', entityMask: 'hr_empOrderSignTemplate', methodMask: ['*'] },
      { description: 'Шаблон листа підписантів. Учасники', entityMask: 'hr_empOrderSignTemplateDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Нарахування до пункту наказу', entityMask: 'hr_empOrderAcc', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'replaceDateFrom', 'fillOrderAccrual', 'clearOrderAccrual'] },
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
