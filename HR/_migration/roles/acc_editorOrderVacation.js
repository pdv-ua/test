const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorOrderVacation',
    description: 'Редактор наказів про надання відпусток',
    description_uk: 'Редактор наказів про надання відпусток',
    description_ru: 'Редактор приказов о предоставлении отпусков',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderOrdersMove',
      'accHRFolderOrdersAbsence',
      'accHR_empOrderVacationA',
      'hr_empOrderVacationA',
      'accHR_empOrderVacationRetA',
      'hr_empOrderVacationRetA',
      'accHR_empOrderVacationProlongA',
      'hr_empOrderVacationProlongA',
      'accHR_empOrderVacationRevokeA',
      'hr_empOrderVacationRevokeA',
      'accHR_empOrderVacationCompA',
      'hr_empOrderVacationCompA',
      'accHR_empOrderMissionA',
      'hr_empOrderMissionA',
      'accHR_empOrderChangemissionA',
      'hr_empOrderChangemissionA',
      'hr_empOrderCancelmissionA',
      'hr_dictEventKnowledg'
    ],
    elsRule: [
      {
        description: 'Наказ з персоналу',
        entityMask: 'hr_empOrder',
        methodMask: [ ...crud, 'getWorkDays', 'getWorkDays4Vac', 'saveReportSettings', 'fillOrderAccrual', 'setDateAndNumber',
          'docPrintForm', 'repPrintForm', 'isWorkDay', 'fillOrderExperience', 'clearOrder*', 'fillOrderAccrualWithSave',
          'exchangeReview', 'sendReview'
        ]
      },
      { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['*'] },
      {
        description: 'Наказ про відпустку',
        entityMask: 'hr_empOrderVacationDet',
        methodMask: [ ...crud, 'getDescriptionExt', 'addPeriods', 'createOrder', 'addIntComb', 'addOrderItems',
          'checkVacPlanIsNotDeleted', 'checkSicknessCrossTimeSheet', 'addMultiOrder' ]
      },
      {
        description: 'Наказ про відкликання з відпустки',
        entityMask: 'hr_empOrderVacationrevokeDet',
        methodMask: [ ...crud, 'getDescriptionExt', 'addIntComb', 'checkNoVacDays', 'checkVacationCrossPeriod' ]
      },
      {
        description: 'Наказ про продовження відпустки',
        entityMask: 'hr_empOrderVacationprolongDet',
        methodMask: [ ...crud, 'getDescriptionExt', 'addIntComb', 'getVacDaysInSickness' ]
      },
      {
        description: 'Наказ про продовження неперіодичної відпустки',
        entityMask: 'hr_empOrderVacationprolonglDet',
        methodMask: [ ...crud, 'getDescriptionExt', 'addIntComb' ]
      },
      {
        description: 'Про компенсацію за роботу в вихідний день',
        entityMask: 'hr_empOrderCwsrelaxhdDet',
        methodMask: [...crud, 'addPeriods', 'checkSourceParaIDCross']
      },
      {
        description: 'Про компенсацію за роботу в вихідний день (груповий)',
        entityMask: 'hr_empOrderCwsrelaxhdgrpDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getTempExecution']
      },
      {
        description: 'ac_service',
        entityMask: 'ac_service',
        methodMask: ['userIsMemberOf']
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
