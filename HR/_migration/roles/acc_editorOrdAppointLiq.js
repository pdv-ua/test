// const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorOrdAppointLiq',
    description: 'Фахівець з внесення призначень на ліквідовані посади',
    description_uk: 'Фахівець з внесення призначень на ліквідовані посади',
    description_ru: 'Специалист по внесению назначений на ликвидированы должности',
    description_az: 'İşdən çıxarılan vəzifələrə təyinatların aparılması üzrə mütəxəssis',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR', 'arm_accDoc'],
    shortcutCodes: [
      'accHRFolderOrdersOther',
      'accHREmpOrderAppointLiqA',
      'hr_empOrderAppointLiqA',
      'accStaff_dictNameAddition',
      'hr_dictNameAddition',
      'hr_dictEventKnowledg'
    ],
    elsRule: [
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
          'isWorkDay',
          'fillOrderExperience',
          'clearOrder*',
          'doPosting_*',
          'exchangeReview',
          'sendReview'
        ]
      },
      {
        description: 'Наказ з персоналу. Всі деталі',
        entityMask: 'hr_empOrderDet',
        methodMask: [
          'select',
          'addnew',
          'insert',
          'update',
          'delete',
          'setItemIdx',
          'moveItemUp',
          'moveItemDown',
          'enumerateItems'
        ]
      },
      { description: 'hr_empOrderAppointDet', entityMask: 'hr_empOrderAppointDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'hr_empOrderExperience', entityMask: 'hr_empOrderExperience', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'hr_empOrderAcc', entityMask: 'hr_empOrderAcc', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'replaceDateFrom', 'fillOrderAccrual', 'clearOrderAccrual'] },
      { description: 'hr_empOrderFundSource', entityMask: 'hr_empOrderFundSource', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getPosFundSourceData', 'getOrderFundSourceData'] },
      {
        description: 'Особи',
        entityMask: 'hr_employeeNumber',
        methodMask: ['select', 'getNextTabNum', 'checkParams']
      },
      {
        description: 'hr_employeeNumberS',
        entityMask: 'hr_employeeNumberS',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_employeeNumberSR',
        entityMask: 'hr_employeeNumberSR',
        methodMask: [ 'select' ]
      },
      {
        description: 'hr_employee',
        entityMask: 'hr_employee',
        methodMask: ['getNextPublServRang']
      },
      {
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
          'continueReconciliation', 'cancelReconciliation',
          'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
      },
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
        description: 'Наказ з персоналу. Завдання',
        entityMask: 'hr_empOrderTaskDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Додатки',
        entityMask: 'hr_orderAttachment',
        methodMask: ['*']
      },
      {
        description: 'Завдання наказів',
        entityMask: 'hr_dictTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Посади',
        entityMask: 'hr_position',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'copyPosition', 'newVersionPosition']
      },
      {
        description: 'Доповнення до назви',
        entityMask: 'hr_dictNameAddition',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'ac_service',
        entityMask: 'ac_service',
        methodMask: ['userIsMemberOf']
      },
      {
        description: 'hr_employeePosition',
        entityMask: 'hr_employeePosition',
        methodMask: ['getOrderSignerInfo', 'getOrderSignerList']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getAcceptEmployee', 'getTempExecution']
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
