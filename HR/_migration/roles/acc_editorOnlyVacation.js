const crud = ['select', 'addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorOnlyVacation',
    description: 'Редактор наказів про відпустки',
    description_uk: 'Редактор наказів про відпустки',
    description_ru: 'Редактор приказов об отпусках',
    description_az: 'Tətil sifarişlərinin redaktoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR', 'arm_accHREmp'],
    shortcutCodes: [
      'accHRFolderOrdersMove',
      'accHRFolderOrdersAbsence',
      'accHR_empOrderVacationA',
      'hr_empOrderVacationA',
      'accHR_empOrderVacationProlongA',
      'hr_empOrderVacationProlongA',
      'accHR_empOrderVacationRevokeA',
      'hr_empOrderVacationRevokeA',
      'accHR_empOrderVacationRetA',
      'hr_empOrderVacationRetA',
      'accHR_empOrderVacationCompA',
      'hr_empOrderVacationCompA',
      'accHREmpFolderList',
      'reportsEmpListByNonAttendance',
      'hr_empListCustom',
      'hr_empListUnusedVacation',
      'hr_empListActiveVacation',
      'hr_empListUnpaidVac',
      'hr_empListUnpaidLongVac',
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
          'getCalendDays',
          'getCalendDays4Vac',
          'fillOrderExperience',
          'clearOrder*',
          'doPosting_VACATION',
          'doCancelPosting_VACATION',
          'doPosting_VACATION_G',
          'doCancelPosting_VACATION_G',
          'doPosting_VACATIONREVOKE',
          'doCancelPosting_VACATIONREVOKE',
          'doPosting_VACRETPROLONG',
          'doCancelPosting_VACRETPROLONG',
          'doPosting_VACATIONPROLONG',
          'doCancelPosting_VACATIONPROLONG',
          'doPosting_VACATIONPROLONGL',
          'doCancelPosting_VACATIONPROLONGL',
          'doPosting_VACATIONUNPAID',
          'doCancelPosting_VACATIONUNPAID',
          'doPosting_VACATIONLONG',
          'doCancelPosting_VACATIONLONG',
          'doPosting_VACATIONLONG_G',
          'doCancelPosting_VACATIONLONG_G',
          'doPosting_VACATIONRET',
          'doCancelPosting_VACATIONRET',
          'doPosting_VACATIONCOMP',
          'doCancelPosting_VACATIONCOMP',
          'exchangeReview',
          'sendReview'
        ]
      },
      {
        description: 'Участник согласования',
        entityMask: 'hr_recparticipant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_empOrderVacretprolongDet',
        entityMask: 'hr_empOrderVacretprolongDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_empOrderVacSubstitutionDet',
        entityMask: 'hr_empOrderVacSubstitutionDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'fillVacSubstitution', 'vacSubstitutionNote', 'checkVacSubstitution', 'validateVacSubstitution', 'clearVacSubstitutionDet', 'clearActingDet']
      },
      {
        description: 'hr_recstageTemplate',
        entityMask: 'hr_recstageTemplate',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава наказу',
        entityMask: 'hr_dictOrderDetReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Виконуючі обовязки',
        entityMask: 'hr_empOrderActingDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'closeDateTo', 'clearDetail']
      },
      {
        description: 'Заголовок та преамбула',
        entityMask: 'hr_dictEmpOrderText',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictOrderDetReasonDoc',
        entityMask: 'hr_dictOrderDetReasonDoc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictReasonVacation',
        entityMask: 'hr_dictReasonVacation',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Завдання',
        entityMask: 'hr_dictTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      { description: 'hr_empOrderDet', entityMask: 'hr_empOrderDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
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
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete', 'startReconciliation', 'stopReconciliation',
          'continueReconciliation', 'cancelReconciliation',
          'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
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
      { description: 'Невикористані відпустки', entityMask: 'hr_empListUnusedVacation', methodMask: ['*'] },
      { description: 'У відпустці', entityMask: 'hr_empListActiveVacation', methodMask: [...crud, 'search'] },
      { description: 'У неоплачуваній відпустці', entityMask: 'hr_empListUnpaidVac', methodMask: [...crud, 'search'] },
      { description: 'У неоплачуваній довгій відпустці', entityMask: 'hr_empListUnpaidLongVac', methodMask: [...crud, 'search'] },
      { description: 'Списки працівників', entityMask: 'hr_empListCustom', methodMask: ['*'] },
      { description: 'hr_empOrderVacationA', entityMask: 'hr_empOrderVacationA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationDet', entityMask: 'hr_empOrderVacationDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationprolongA', entityMask: 'hr_empOrderVacationprolongA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationprolongDet', entityMask: 'hr_empOrderVacationprolongDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationprolonglDet', entityMask: 'hr_empOrderVacationprolonglDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationprolongA', entityMask: 'hr_empOrderVacationprolongA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationprolongDet', entityMask: 'hr_empOrderVacationprolongDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationlongA', entityMask: 'hr_empOrderVacationlongA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationlongDet', entityMask: 'hr_empOrderVacationlongDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationrevokeA', entityMask: 'hr_empOrderVacationrevokeA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationrevokeDet', entityMask: 'hr_empOrderVacationrevokeDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationretA', entityMask: 'hr_empOrderVacationretA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationretDet', entityMask: 'hr_empOrderVacationretDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationcompA', entityMask: 'hr_empOrderVacationcompA', methodMask: ['*'] },
      { description: 'hr_empOrderVacationcompDet', entityMask: 'hr_empOrderVacationcompDet', methodMask: ['*'] },
      { description: 'hr_empOrderVacationListDet', entityMask: 'hr_empOrderVacationListDet', methodMask: ['*'] },
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
      }
    ]
  }
]
