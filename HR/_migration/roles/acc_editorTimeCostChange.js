module.exports = [
  {
    name: 'acc_editorTimeCostChange',
    description: 'Служба персоналу, коригування табелю.',
    description_uk: 'Служба персоналу, коригування табелю.',
    description_ru: 'Служба персонала, корректировка табеля.',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderOrdersOther',
      'accHRTimeCostChange',
      'hr_timeCostChange'
    ],
    elsRule: [
      {
        description: 'Наказ з персоналу',
        entityMask: 'hr_empOrder*',
        methodMask: ['addnew', 'insert', 'update', 'delete', 'doPosting', 'checkTabNum',
          'clearDetail', 'saveReportSettings', 'fillOrderAccrual', 'getWorkDays', 'getCalendDays4Vac', 'getWorkDays4Vac',
          'getCalendDateTo4Vac', 'getWorkDateTo4Vac', 'setDateAndNumber', 'docPrintForm', 'repPrintForm', 'isWorkDay',
          'setItemIdx', 'moveItemUp', 'moveItemDown', 'enumerateItems', 'checkYearMissionDays', 'getYearInfo',
          'getDescriptionExt', 'getActiveVacationList', 'cloneVacationList', 'recalcBounty', 'fillEmployee',
          'addPeriods', 'loadEmployeeList', 'createOrder',
          'addList', 'getValidatorWarning', 'updateOrderFieldLastChangeDate', 'fillOrderExperience', 'updateBountyPayEl',
          'clearOrder*', 'doPosting_*', 'doCancelPosting', 'doCancelPosting_*', 'checkCrossTimeSheet',
          'fillOrderAccrualWithSave', 'calcVacationMoveList'
        ]
      },
      { description: 'Додатки до наказів', entityMask: 'hr_orderAttachment', methodMask: ['addnew', 'insert', 'update', 'delete'] },
      { description: 'Лист ознайомлення', entityMask: 'hr_acquaintanceList', methodMask: ['addnew', 'insert', 'update', 'delete', 'addEvaluationType'] },
      { description: 'Індекс номеру наказу', entityMask: 'hr_dictEmpOrderIndex', methodMask: ['*'] },
      { description: 'Зміна елемента обліку робочого часу у табелі', entityMask: 'hr_empOrderChgtimecostDet', methodMask: ['*'] },
      {
        description: 'hr_orderAttachment',
        entityMask: 'hr_orderAttachment',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_attachDoc',
        entityMask: 'hr_attachDoc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підписанти',
        entityMask: 'hr_employeePosition',
        methodMask: ['getOrderSignerInfo', 'getOrderSignerList']
      },
      {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getTempExecution']
      },
      {
        description: 'Періоди наказів про відпустку',
        entityMask: 'hr_empOrderVacationListDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'checkImpartibleVac', 'checkAvailableVacationDays',
          'checkMainPart', 'checkVacationCrossPeriod', 'checkEmpNumberPeriod', 'checkVacationCrossTimeSheet', 'checkContVacation',
          'checkNotPerVacDays', 'checkMoneyHelpVac', 'checkPeriodDayDiff'
        ]
      },
      {
        description: 'Нарахування до пункту наказу',
        entityMask: 'hr_empOrderAcc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'replaceDateFrom', 'fillOrderAccrual', 'clearOrderAccrual']
      }
    ]
  }
]
