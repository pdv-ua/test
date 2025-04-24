module.exports = [
  {
    name: 'acc_procPrivateOffice',
    description: 'Відповідальний за обробку заяв з особистого кабінету',
    description_uk: 'Відповідальний за обробку заяв з особистого кабінету',
    description_ru: 'Ответственный за обработку заявлений из личного кабинета',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmpFolderRequest',
      'hr_request',
      'accHREmp_request',
      'hr_request_local',
      'accHREmp_requestSended',
      'accHREmp_requestAgreed',
      'hr_request_sended',
      'hr_request_agreed',
      'accHREmp_employeeTaskDt',
      'hr_employeeTaskDt'
    ],
    elsRule: [
      {
        description: 'Заяви',
        entityMask: 'hr_request',
        methodMask: ['select', 'update', 'addnew', 'insert', 'viewPrintForm', 'showFromEmployeeTabs']
      },
      {
        description: 'hr_recstage',
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
        description: 'Участник согласования',
        entityMask: 'hr_recparticipant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Завдання працівнику, деталь',
        entityMask: 'hr_employeeTaskDt',
        methodMask: ['select', 'addnew', 'insert', 'delete', 'update']
      },
      {
        description: 'hr_employeeTask',
        entityMask: 'hr_employeeTask',
        methodMask: ['select', 'addnew', 'insert', 'delete', 'update', 'sendToExecution']
      },
      {
        description: 'hr_attachDoc',
        entityMask: 'hr_attachDoc',
        methodMask: ['select', 'addnew', 'insert', 'delete', 'update']
      },
      {
        description: 'hr_orderAttachment',
        entityMask: 'hr_orderAttachment',
        methodMask: ['select', 'addnew', 'insert', 'delete', 'update', 'saveParentAttachments']
      }
    ]
  }
]
