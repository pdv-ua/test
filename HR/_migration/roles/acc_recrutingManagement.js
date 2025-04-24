module.exports = [
  {
    name: 'acc_recrutingManagement',
    description: 'Відповідальний за рекрутинг',
    description_uk: 'Відповідальний за рекрутинг',
    description_ru: 'Ответственный за рекрутинг',
    description_en: 'Responsible for recruiting',
    description_az: 'İşə qəbul üçün cavabdehdir',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHRRecruiting',
      'accHREmp_recruiting',
      'hr_contenderPositionList',
      'hr_employee',
      'accHREmp_employee'
    ],
    elsRule: [
      {
        description: 'hr_contenderPosition',
        entityMask: 'hr_contenderPosition',
        methodMask: ['*']
      },
      {
        description: 'hr_employeeNumberS',
        entityMask: 'hr_employeeNumberS',
        methodMask: ['select']
      },
      {
        description: 'hr_department',
        entityMask: 'hr_department',
        methodMask: ['select']
      },
      {
        description: 'hr_employee',
        entityMask: 'hr_employee',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'view', 'docPrintForm', 'repPrintForm', 'getNextPublServRang']
      },
      {
        description: 'hr_contenderPositionAttachment',
        entityMask: 'hr_contenderPositionAttachment',
        methodMask: ['*']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['select', 'getTempExecution', 'selectPosGroups']
      },
      {
        description: 'hr_position',
        entityMask: 'hr_position',
        methodMask: ['select']
      },
      {
        description: 'hr_dictTypeOfEmployment',
        entityMask: 'hr_dictTypeOfEmployment',
        methodMask: ['select']
      },
      {
        description: 'hr_dictTypeOfSourceOfEmployment',
        entityMask: 'hr_dictTypeOfSourceOfEmployment',
        methodMask: ['select']
      },
      {
        description: 'hr_organization',
        entityMask: 'hr_organization',
        methodMask: ['select']
      },
      {
        description: 'hr_positionVacContest',
        entityMask: 'hr_positionVacContest',
        methodMask: ['select', 'selectVacancies']
      },
      {
        description: 'Особи',
        entityMask: 'hr_employee',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'view', 'docPrintForm', 'repPrintForm']
      },
      {
        description: 'Адреси',
        entityMask: 'ac_address',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контакти',
        entityMask: 'hr_employeeContact',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Члени сім\'ї',
        entityMask: 'hr_employeeFamily',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Родичі',
        entityMask: 'hr_people',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Документи',
        entityMask: 'hr_employeeDocs',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Пільги',
        entityMask: 'hr_employeeBenefits',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Нагороди',
        entityMask: 'hr_employeeBonus',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Стягнення',
        entityMask: 'hr_employeePenalty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Військовий облік',
        entityMask: 'hr_empStateMilitary',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Інвалідність',
        entityMask: 'hr_employeeDisability',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Трудова книжка',
        entityMask: 'hr_employeeWorkbook',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'autoFillExperience', 'getPositionFullName']
      },
      {
        description: 'Стаж',
        entityMask: 'hr_employeeExperience',
        methodMask: ['select', 'getTotalExperience']
      },
      {
        description: 'Ранг держслужбовця',
        entityMask: 'hr_publServRang',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Освіта',
        entityMask: 'hr_employeeEducation',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Патенти та публікації',
        entityMask: 'hr_employeeSuccess',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Володіння мовами',
        entityMask: 'hr_employeeLanguage',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Науковий ступінь',
        entityMask: 'hr_empRangeScience',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вчене звання',
        entityMask: 'hr_empAcademStatus',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підвищення кваліфікації',
        entityMask: 'hr_empCertificatnUp',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeAudit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'docPrintForm']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeDocAuditDt',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спецперевірка/Очищення влади',
        entityMask: 'hr_employeeDocAudit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'docPrintForm']
      },
      {
        description: 'Додаткова інформація',
        entityMask: 'hr_empAddInform',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Дні відпустки за видами відпустки',
        entityMask: 'hr_dictVacationPlanDay',
        methodMask: ['select', 'getDayCount']
      },
      {
        description: 'Відпустки які нараховуються працівнику',
        entityMask: 'hr_empVacationPlan',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'selectAvailableVacationDays', 'selectData',
          'getAvailableVacationDays', 'getAvailableVacationDaysSql', 'getVacPeriodDays', 'getMainPartIsUsed', 'addDefaultVacationPlan',
          'getData', 'getVacPlanDays', 'autoAddPeriods', 'getVacFactDays', 'checkVacKindExists',
          'getDataReq'
        ]
      },
      {
        description: 'Період відпустки працівника',
        entityMask: 'hr_empVacationPeriod',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'selectData', 'getData', 'canEditVacFact', 'calcFields']
      },
      {
        description: 'Задачі оцінювання',
        entityMask: 'hr_empAssessmentTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'calcAvgValue']
      },
      {
        description: 'Задачі оцінювання',
        entityMask: 'hr_empAssessment',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Задачі оцінювання значення',
        entityMask: 'hr_empAssessmentTaskValue',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'service entity',
        entityMask: 'hr_rl',
        methodMask: ['viewPrintForm', 'getRL']
      },
      {
        description: 'Документи до пільг',
        entityMask: 'hr_employeeBenefitsDoc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Профіль особи з порталу вакансій',
        entityMask: 'hr_employeeInfoPortalVac',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Додаткові дані за організацією',
        entityMask: 'hr_employeeOrgInfo',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Форми допуску до інформації',
        entityMask: 'hr_employeeAccessInfo',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Організації спецперевірок',
        entityMask: 'hr_dictAuditOrg',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контрагент',
        entityMask: 'ac_contractor',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_employeeNumberInfo',
        entityMask: 'hr_employeeNumberInfo',
        methodMask: ['getData']
      },
      {
        description: 'hr_empWorkShdChange',
        entityMask: 'hr_empWorkShdChange',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спеціальність',
        entityMask: 'hr_specialty',
        methodMask: ['select', 'addnew', 'insert']
      },
      {
        description: 'Призов на військову службу',
        entityMask: 'hr_empConscription',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контракт',
        entityMask: 'hr_empMilitaryContract',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Додаткові гарантії працевлаштування',
        entityMask: 'hr_empAddGuarantees',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Військові звання',
        entityMask: 'hr_empMilitaryRanks',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Майно організації у працівника',
        entityMask: 'hr_employeeAssets',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'viewEmployeeAssets']
      },
      {
        description: 'hr_employeeCardShortcutList',
        entityMask: 'hr_employeeCardShortcutList',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_empOrder',
        entityMask: 'hr_empOrder',
        methodMask: ['repPrintForm',
          'select',
          'addnew',
          'insert',
          'update',
          'delete',
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
          'exchangeReview',
          'sendReview'
        ]
      },
      {
        description: 'Планування штатного розпису',
        entityMask: 'hr_staffTable',
        methodMask: ['select', 'generateXLSX']
      },
      {
        description: 'Орг Структура',
        entityMask: 'hr_staffTableOrgStructure',
        methodMask: ['*']
      },
      {
        description: 'hr_empOrderSignature',
        entityMask: 'hr_empOrderSignature',
        methodMask: ['*']
      },
      {
        description: 'Наказ з персоналу. Всі деталі',
        entityMask: 'hr_empOrderDet',
        methodMask: ['*']
      },
      {
        description: 'hr_empOrderAppointDet',
        entityMask: 'hr_empOrderAppointDet',
        methodMask: ['*']
      },
      {
        description: 'hr_orderAttachment',
        entityMask: 'hr_orderAttachment',
        methodMask: ['*']
      },
      {
        description: 'hr_order',
        entityMask: 'hr_order',
        methodMask: ['*']
      },
      {
        description: 'hr_orderStateHistory',
        entityMask: 'hr_orderStateHistory',
        methodMask: ['*']
      },
      {
        description: 'Лист ознайомлення',
        entityMask: 'hr_acquaintanceList',
        methodMask: ['*']
      },
      {
        description: 'Лист погодження',
        entityMask: 'hr_empOrdListAppruv',
        methodMask: ['*', 'updateEmpOrdListAppruvList', 'insertEmpOrdListAppruvList']
      },
      {
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [
          '*',
          'startReconciliation',
          'stopReconciliation',
          'continueReconciliation',
          'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation'
        ]
      },
      {
        description: 'Участник согласования',
        entityMask: 'hr_recparticipant',
        methodMask: ['*']
      },
      {
        description: 'hr_mailingLetter',
        entityMask: 'hr_mailingLetter',
        methodMask: ['*']
      },
      {
        description: 'hr_empOrderSignDet',
        entityMask: 'hr_empOrderSignDet',
        methodMask: ['*']
      },
      {
        description: 'hr_mailingLetterTemplate',
        entityMask: 'hr_mailingLetterTemplate',
        methodMask: ['*']
      },
      {
        description: 'hr_empOrdListAppruvTemplate',
        entityMask: 'hr_empOrdListAppruvTemplate',
        methodMask: ['*']
      },
      {
        description: 'hr_empOrderAcquaintListTpl',
        entityMask: 'hr_empOrderAcquaintListTpl',
        methodMask: ['*']
      },
      {
        description: 'hr_empOrderSignTemplate',
        entityMask: 'hr_empOrderSignTemplate',
        methodMask: ['*']
      },
      {
        description: 'Джерело фінансування',
        entityMask: 'ac_fundSource',
        methodMask: ['select']
      },
      {
        description: 'hr_workSchedule',
        entityMask: 'hr_workSchedule',
        methodMask: ['select']
      },
      {
        description: 'hr_payEl',
        entityMask: 'hr_payEl',
        methodMask: ['select']
      },
      {
        description: 'hr_method',
        entityMask: 'hr_method',
        methodMask: ['select']
      },
      {
        description: 'hr_empOrderExperience',
        entityMask: 'hr_empOrderExperience',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_empOrderAcc',
        entityMask: 'hr_empOrderAcc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'replaceDateFrom', 'fillOrderAccrual', 'clearOrderAccrual']
      },
      {
        description: 'hr_empOrderVacationPlan',
        entityMask: 'hr_empOrderVacationPlan',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addDefaultVacationPlan', 'getVacationPlanData', 'addDefaultPluralistVacationPlan', 'clearVacationPlan', 'addBalance']
      },
      {
        description: 'hr_empOrderDetConfig',
        entityMask: 'hr_empOrderDetConfig',
        methodMask: ['select']
      },
      {
        description: 'hr_employeeNumber',
        entityMask: 'hr_employeeNumber',
        methodMask: ['select', 'getNextTabNum']
      },
      {
        description: 'hr_positionTypeProps',
        entityMask: 'hr_positionTypeProps',
        methodMask: ['select']
      },
      {
        description: 'hr_staffUnit',
        entityMask: 'hr_staffUnit',
        methodMask: ['getVacationEmpPos', 'getVacationRate']
      },
      {
        description: 'hr_methodGroup',
        entityMask: 'hr_methodGroup',
        methodMask: ['select']
      },
      {
        description: 'hr_calendarHoliday',
        entityMask: 'hr_calendarHoliday',
        methodMask: ['select', 'getHolidays']
      },
      {
        description: 'hr_calendarChange',
        entityMask: 'hr_calendarChange',
        methodMask: ['select']
      },
      {
        description: 'hr_empOrderFundSource',
        entityMask: 'hr_empOrderFundSource',
        methodMask: ['select', 'getOrderFundSourceData']
      },
      {
        description: 'Друковані форми',
        entityMask: 'ubs_report',
        methodMask: ['select']
      },
      {
        description: 'hr_recstageTemplate',
        entityMask: 'hr_recstageTemplate',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'ac_docPrintSettings',
        entityMask: 'ac_docPrintSettings',
        methodMask: ['getOrgPrintSettings']
      },
      {
        description: 'hr_empLongTermAbsc',
        entityMask: 'hr_empLongTermAbsc',
        methodMask: ['select']
      },
      {
        description: 'hr_empOrderTaskDet',
        entityMask: 'hr_empOrderTaskDet',
        methodMask: ['select']
      }
    ]
  }
]
