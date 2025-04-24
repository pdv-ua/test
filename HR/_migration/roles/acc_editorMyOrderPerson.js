const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorMyOrderPerson',
    description: 'Редактор наказів з персоналу (мої)',
    description_uk: 'Редактор наказів з персоналу (мої)',
    description_ru: 'Редактор приказов по персоналу (мои)',
    description_az: 'Kadrlar sifarişi redaktoru (mənim)',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHR_empOrderMeFolderA',
      'accHR_empOrderMeOrderA',
      'hr_empOrderMeOrderA',
      'accHR_empOrderMeOrderProjA',
      'hr_empOrderMeOrderProjA',
      'accHR_empOrderMeOrderTodayA',
      'hr_empOrderMeOrderTodayA',
      'accHR_empOrderMeOrderProjTodayA',
      'hr_empOrderMeOrderProjTodayA'
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
          'checkTabNum', 'addPeriods', 'loadEmployeeList',
          'createOrder', 'addList', 'fillOrderExperience', 'clearOrder*', 'doPosting_*', 'checkCrossTimeSheet',
          'recalc', 'checkRankInYear', 'clearActingDet', 'fillVacSubstitution', 'clearVacSubstitutionDet', 'vacSubstitutionNote',
          'checkVacSubstitution', 'validateVacSubstitution', 'updateBountyPayEl', 'fillOrderAccrualWithSave', 'calcVacationMoveList',
          'getVacListIDs', 'addStampData', 'getDocumentWithStampData'
        ]
      },
      { description: 'hr_empOrderFundSource', entityMask: 'hr_empOrderFundSource', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getPosFundSourceData', 'getOrderFundSourceData'] },
      { description: 'Про компенсацію за роботу в вихідний день', entityMask: 'hr_empOrderCwsrelaxhdDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addPeriods', 'checkSourceParaIDCross'] },
      { description: 'Про компенсацію за роботу в вихідний день (груповий)', entityMask: 'hr_empOrderCwsrelaxhdgrpDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
      { description: 'Додатки до наказів', entityMask: 'hr_orderAttachment', methodMask: [...crud] },
      { description: 'Лист ознайомлення', entityMask: 'hr_acquaintanceList', methodMask: ['*'] },
      { description: 'Лист погодження', entityMask: 'hr_empOrdListAppruv', methodMask: [...crud, 'updateEmpOrdListAppruvList', 'insertEmpOrdListAppruvList'] },
      {
        description: 'Этап согласования',
        entityMask: 'hr_recstage',
        methodMask: [
          ...crud,
          'startReconciliation',
          'stopReconciliation',
          'continueReconciliation',
          'cancelReconciliation', 'canVisibleStartReconciliation', 'canVisibleStopReconciliation',
          'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation'
        ]
      },
      { description: 'Участник согласования', entityMask: 'hr_recparticipant', methodMask: [...crud] },
      { description: 'hr_employee', entityMask: 'hr_employee', methodMask: ['getNextPublServRang'] },
      { description: 'Наказ з персоналу про звільнення. Деталь', entityMask: 'hr_empOrderDismDet', methodMask: [...crud, 'getDescriptionExt'] },
      { description: 'Наказ з персоналу про звільнення. Компенсація відпусток', entityMask: 'hr_empOrderDismVac', methodMask: ['groupSelect', 'addRecalcDays', 'clearRecalcDays', 'clear', 'getRecalcDays'] },
      { description: 'ac_service', entityMask: 'ac_service', methodMask: ['userIsMemberOf'] },
      {
        description: 'hr_employeePosition',
        entityMask: 'hr_employeePosition',
        methodMask: ['getOrderSignerInfo', 'getOrderSignerList']
      }, {
        description: 'hr_employeePositionS',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getAcceptEmployee', 'getTempExecution']
      },
      {
        description: 'Нарахування до пункту наказу',
        entityMask: 'hr_empOrderAcc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'replaceDateFrom', 'fillOrderAccrual', 'clearOrderAccrual']
      }
    ]
  }
]
