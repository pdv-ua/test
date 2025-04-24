const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorOnlyMission',
    description: 'Редактор наказів про відрядження',
    description_uk: 'Редактор наказів про відрядження',
    description_ru: 'Редактор приказов о командировках',
    description_az: 'Ezamiyyət redaktoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR', 'arm_accHREmp'],
    shortcutCodes: [
      'accHRFolderOrdersAbsence',
      'accDst_empOrderMissionA',
      'hr_empOrderMissionA',
      'accHR_empOrderMissionA',
      'accDst_empOrderChangemissionA',
      'hr_empOrderChangemissionA',
      'accHR_empOrderChangemissionA',
      'hr_empOrderCancelmissionA',
      'accHREmpFolderList',
      'reportsEmpListByNonAttendance',
      'hr_empListMission',
      'hr_empListCustom',
      'hr_dictEventKnowledg'
    ],
    elsRule: [
      {
        description: 'Наказ з персоналу',
        entityMask: 'hr_empOrder',
        methodMask: [
          'repPrintForm',
          'select',
          'addnew',
          'insert',
          'update',
          'delete',
          'doPosting',
          'doPosting_CHANGEMISSION',
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
          'getCalendDays',
          'getCalendDays4Vac',
          'doPosting_MISSION',
          'doCancelPosting_MISSION',
          'doPosting_MISSION_TRAINING',
          'doCancelPosting_MISSION_TRAINING',
          'doPosting_MISSION_G',
          'doCancelPosting_MISSION_G',
          'doPosting_MISSION',
          'doCancelPosting_MISSION',
          'exchangeReview',
          'sendReview'
        ]
      },
      {
        description: 'Підстава наказу',
        entityMask: 'hr_dictOrderDetReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Виконуючі обовязки',
        entityMask: 'hr_empOrderActingDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Шаблон узгодження',
        entityMask: 'hr_recstageTemplate',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate']
      },
      {
        description: 'hr_orderAttachment',
        entityMask: 'hr_orderAttachment',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Лист ознайомлення',
        entityMask: 'hr_acquaintanceList',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addEvaluationType']
      },
      {
        description: 'hr_recstageTemplate',
        entityMask: 'hr_recstageTemplate',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Заголовок та преамбула',
        entityMask: 'hr_dictEmpOrderText',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Участник согласования',
        entityMask: 'hr_recparticipant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Завдання',
        entityMask: 'hr_dictTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_empOrderEmployeeDet',
        entityMask: 'hr_empOrderEmployeeDet',
        methodMask: [...crud]
      },
      {
        description: 'hr_empOrderTaskDet',
        entityMask: 'hr_empOrderTaskDet',
        methodMask: [...crud]
      },
      {
        description: 'hr_empOrderMaterialtransferDet',
        entityMask: 'hr_empOrderMaterialtransferDet',
        methodMask: [...crud]
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getTempExecution']
      },
      {
        description: 'Підписанти',
        entityMask: 'hr_employeePosition',
        methodMask: ['getOrderSignerInfo', 'getOrderSignerList']
      },
      {
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
          'continueReconciliation', 'cancelReconciliation',
          'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
      },
      { description: 'hr_missionFinSource', entityMask: 'hr_missionFinSource', methodMask: ['*'] },
      { description: 'hr_empOrderMissionA', entityMask: 'hr_empOrderMissionA', methodMask: ['*'] },
      { description: 'hr_empOrderMissionDet', entityMask: 'hr_empOrderMissionDet', methodMask: ['*'] },
      { description: 'hr_empOrderChangemissionA', entityMask: 'hr_empOrderChangemissionA', methodMask: ['*'] },
      { description: 'hr_empOrderCancelmissionA', entityMask: 'hr_empOrderCancelmissionA', methodMask: ['*'] },
      { description: 'Лист розсилки', entityMask: 'hr_mailingLetter', methodMask: [...crud] },
      { description: 'Шаблон листа розсилки', entityMask: 'hr_mailingLetterTemplate', methodMask: ['*'] },
      { description: 'Шаблон листа розсилки. Учасники', entityMask: 'hr_mailingLetterTemplateDet', methodMask: [...crud] },
      { description: 'Лист підписантів', entityMask: 'hr_empOrderSignDet', methodMask: [...crud] },
      { description: 'Шаблон листа підписантів', entityMask: 'hr_empOrderSignTemplate', methodMask: ['*'] },
      { description: 'Шаблон листа підписантів. Учасники', entityMask: 'hr_empOrderSignTemplateDet', methodMask: [...crud] },
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
      },
      { description: 'Призначення працівника', entityMask: 'hr_employeePositionS', methodMask: ['select', 'getTempExecution', 'selectPosGroups'] },
      {
        description: 'hr_empOrderChangemissionDet',
        entityMask: 'hr_empOrderChangemissionDet',
        methodMask: [...crud]
      },
      {
        description: 'hr_empOrderCancelmissionDet',
        entityMask: 'hr_empOrderCancelmissionDet',
        methodMask: [...crud]
      }
    ]
  }
]
