module.exports = [{
  name: 'acc_editorOrderPerson',
  description: 'Редактор наказів з персоналу',
  description_uk: 'Редактор наказів з персоналу',
  description_ru: 'Редактор приказов по персоналу',
  description_az: 'Ştat cədvəli üzrə əmrləri tərtib edən',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: [],
  shortcutCodes: [
    'accStaff_dictNameAddition',
    'hr_dictNameAddition',
    'hr_dictEventKnowledg'
  ],
  elsRule: [
    { description: 'hr_empOrder', entityMask: 'hr_empOrder', methodMask: ['select', 'exchangeReview', 'sendReview'] },
    {
      description: 'Наказ з персоналу',
      entityMask: 'hr_empOrder*',
      methodMask: ['select', 'addnew', 'insert',
        'update', 'delete', 'doPosting', 'checkTabNum', 'clearDetail', 'saveReportSettings', 'fillOrderAccrual', 'getWorkDays',
        'getCalendDays4Vac', 'getWorkDays4Vac', 'getCalendDateTo4Vac', 'getWorkDateTo4Vac', 'setDateAndNumber', 'docPrintForm',
        'repPrintForm', 'isWorkDay', 'setItemIdx', 'moveItemUp', 'moveItemDown', 'enumerateItems', 'checkYearMissionDays',
        'getYearInfo', 'getDescriptionExt', 'getActiveVacationList', 'cloneVacationList', 'recalcBounty', 'fillEmployee', 'addPeriods',
        'loadEmployeeList', 'createOrder', 'addList', 'getValidatorWarning', 'updateOrderFieldLastChangeDate', 'fillOrderExperience',
        'clearOrder*', 'doPosting_*', 'search', 'checkCrossTimeSheet', 'closeDateTo', 'checkRankInYear',
        'updateBountyPayEl', 'fillOrderAccrualWithSave', 'calcVacationMoveList', 'clearActingDet', 'fillVacSubstitution',
        'clearVacSubstitutionDet', 'vacSubstitutionNote', 'checkVacSubstitution', 'validateVacSubstitution', 'canEditOrdersMainOrg',
        'getVacListIDs', 'addStampData', 'getDocumentWithStampData', 'importList']
    },
    { description: 'Наказ з персоналу', entityMask: 'hr_empListEmpExperience', methodMask: ['createOrderBusinessTripEducation', 'createOrderEducation'] },
    { description: 'Додатки до наказів', entityMask: 'hr_orderAttachment', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Лист ознайомлення', entityMask: 'hr_acquaintanceList', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addEvaluationType'] },
    { description: 'hr_empOrderFundSource', entityMask: 'hr_empOrderFundSource', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    {
      description: 'Этап согласования',
      entityMask: 'hr_recstage',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete',
        'startReconciliation', 'stopReconciliation', 'continueReconciliation', 'cancelReconciliation', 'canVisibleStartReconciliation',
        'canVisibleStopReconciliation', 'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation']
    },
    { description: 'Участник согласования', entityMask: 'hr_recparticipant', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Особа', entityMask: 'hr_employee', methodMask: ['getNextPublServRang'] },
    {
      description: 'Посада',
      entityMask: 'hr_position',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'copyPosition',
        'newVersionPosition', 'calcFunds', 'getPlanSumByPosition']
    },
    {
      description: 'Доповнення до назви',
      entityMask: 'hr_dictNameAddition',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
    },
    { description: 'Заголовок та преамбула', entityMask: 'hr_dictEmpOrderText', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    {
      description: 'Наказ про встановлення посадових окладів. Працівники',
      entityMask: 'hr_empOrderChgSalEmpDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'fillAddSalary', 'fillCancelSalary']
    },
    { description: 'Підстави для прийому на роботу', entityMask: 'hr_dictReasonTrialProlong', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Завдання', entityMask: 'hr_dictTask', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Шаблон узгодження', entityMask: 'hr_recstageTemplate', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadFromTemplate'] },
    { description: 'Мета відрядження', entityMask: 'hr_dictMissionPurpose', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Вимоги до звіту про відрядження', entityMask: 'hr_dictMissionPhrase', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Призначення працівника', entityMask: 'hr_employeePosition', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getOrderSignerInfo', 'getOrderSignerList'] },
    { description: 'Призначення працівника', entityMask: 'hr_employeePositionS', methodMask: ['select', 'getTempExecution', 'selectPosGroups'] },
    {
      description: 'Періоди наказів про відпустку',
      entityMask: 'hr_empOrderVacationListDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete',
        'clearDetail', 'checkImpartibleVac', 'checkAvailableVacationDays', 'checkMainPart', 'checkVacationCrossPeriod', 'checkEmpNumberPeriod',
        'checkVacationCrossTimeSheet', 'checkContVacation', 'checkNotPerVacDays', 'checkMoneyHelpVac', 'checkPeriodDayDiff']
    },
    { description: 'Накази на періодичну відпустку',
      entityMask: 'hr_empOrderVacationDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addIntComb', 'addOrderItems',
        'checkVacPlanIsNotDeleted', 'checkSicknessCrossTimeSheet', 'addMultiOrder']
    },
    {
      description: 'Накази на неперіодичну відпустку',
      entityMask: 'hr_empOrderVacationlongDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addIntComb', 'addOrderItems', 'addMultiOrder']
    },
    {
      description: 'Накази на продовження відпустки',
      entityMask: 'hr_empOrderVacationprolongDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete',
        'addIntComb', 'getVacDaysInSickness']
    },
    {
      description: 'Наказ про продовження неперіодичної відпустки',
      entityMask: 'hr_empOrderVacationprolonglDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete',
        'addIntComb', 'getDescriptionExt']
    },
    {
      description: 'Накази на відкликання з відпустки',
      entityMask: 'hr_empOrderVacationrevokeDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete',
        'addIntComb', 'checkNoVacDays', 'checkVacationCrossPeriod']
    },
    { description: 'Компенсація відпустки', entityMask: 'hr_empOrderVacationcompDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addPeriods', 'clearPeriods'] },
    { description: 'Про компенсацію за роботу в вихідний день', entityMask: 'hr_empOrderCwsrelaxhdDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addPeriods', 'checkSourceParaIDCross'] },
    { description: 'Про компенсацію за роботу в вихідний день (груповий)', entityMask: 'hr_empOrderCwsrelaxhdgrpDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Виконуючі обов\'язки', entityMask: 'hr_vacationScheduleActing', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'hr_empOrderChgpositionDet', entityMask: 'hr_empOrderChgpositionDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'canCreateEmployeePosition'] },
    { description: 'Наказ про простій, тимчасове призупинення', entityMask: 'hr_empOrderDowntimeDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'clearDetail', 'loadEmployeeList'] },
    { description: 'Працівники для наказу про простій, тимчасове призупинення', entityMask: 'hr_empOrderDowntimeListDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Наказ про тимчасове призупинення роботи', entityMask: 'hr_empOrderTempsuspendDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Покладання обов\'язків', entityMask: 'hr_empOrderActingDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'clearDetail', 'closeDateTo'] },
    { description: 'Наказ про вихід з простою або тимчасового призупинення', entityMask: 'hr_empOrderExitdowntimeDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'loadEmployeeList'] },
    { description: 'Працівники для наказу про вихід з простою або тимчасового призупинення', entityMask: 'hr_empOrderExitdowntimeListDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    {
      description: 'Право на відпустку (для наказів)',
      entityMask: 'hr_empOrderVacationPlan',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'addDefaultVacationPlan', 'getVacationPlanData',
        'addDefaultPluralistVacationPlan', 'clearVacationPlan', 'addBalance']
    },
    { description: 'Наказ про встановлення надбавок', entityMask: 'hr_empOrderAddsalaryDet', methodMask: ['clearEmployees', 'loadAccrualChangesFromStaffTable', 'loadAccrualChangesFromStaffTariffing'] },
    { description: 'Наказ про встановлення надбавок за вислугу років', entityMask: 'hr_empOrderAddsalarygovDet', methodMask: ['checkAccrualDates'] },
    { description: 'Підстави для передачі мат. цінностей', entityMask: 'hr_dictReasonMaterialtransfer', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
    { description: 'Наказ про оплату додаткової роботи', entityMask: 'hr_empOrderAddpayDet', methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'clearDetail', 'loadEmployeeList'] },
    { description: 'hr_staffTable', entityMask: 'hr_staffTable', methodMask: ['getStaffTableMoveEmployees', 'select'] },
    { description: 'hr_staffTariffing', entityMask: 'hr_staffTariffing', methodMask: ['getStaffTariffingMoveEmployees'] },
    { description: 'hr_empOrderVacretprolongDet', entityMask: 'hr_empOrderVacretprolongDet', methodMask: ['addIntComb', 'checkNoVacDays', 'checkVacationCrossPeriod'] },
    {
      description: 'Наказ з персоналу про звільнення. Компенсація відпусток',
      entityMask: 'hr_empOrderDismVac',
      methodMask: ['groupSelect', 'addRecalcDays', 'clearRecalcDays', 'clear', 'getRecalcDays']
    },
    {
      description: 'Наказ з персоналу про звільнення. Деталь',
      entityMask: 'hr_empOrderDismDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getDescriptionExt', 'canEditDismReason']
    },
    {
      description: 'Наказ про відкликання з відрядження, навчання, простою. Періоди відкликання',
      entityMask: 'hr_empOrderRecallListDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'clearDetail']
    },
    { description: 'Наказ про відкликання з відрядження, навчання, простою',
      entityMask: 'hr_empOrderRecallDet',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
    },
    { description: 'Виконуючі обов\'язки', entityMask: 'hr_empActingList', methodMask: ['closeDateTo'] },
    { description: 'Наказ про продовження випробувального терміну', entityMask: 'hr_empOrderTrialprolongDet', methodMask: ['getDescriptionExt', 'getTimeSheetAbsences'] },
    { description: 'Лог шедулера створення призначень при тимчасовій зміні', entityMask: 'hr_changePosSchLog', methodMask: ['select'] },
    { description: 'Наказ про вихід із неоплачуваної відпустки', entityMask: 'hr_empOrderVacationretDet', methodMask: ['getDescriptionExt', 'createMoveOrder'] },
    { description: 'Підстава наказу', entityMask: 'hr_dictOrderDetReason', methodMask: ['select', 'addnew', 'insert', 'update', 'delete'] },
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
    },
    {
      description: 'hr_dictOrderDetOrderWord',
      entityMask: 'hr_dictOrderDetOrderWord',
      methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
    },
    {
      description: 'Про закріплення транспортних засобів',
      entityMask: 'hr_empOrderVehicleassign',
      methodMask: ['*']
    },
    {
      description: 'Про компенсацію за проходження медогляду',
      entityMask: 'hr_empOrderMedexamination',
      methodMask: ['*']
    },
    {
      description: 'hr_empOrderCwsworkhourDet',
      entityMask: 'hr_empOrderCwsworkhourDet',
      methodMask: ['*']
    },
    {
      description: 'hr_empOrderTempavgpayDet',
      entityMask: 'hr_empOrderTempavgpayDet',
      methodMask: ['*']
    },
    {
      description: 'hr_empOrderAveragepayDet',
      entityMask: 'hr_empOrderAveragepayDet',
      methodMask: ['*']
    },
    {
      description: 'hr_empOrderCancelavgpayDet',
      entityMask: 'hr_empOrderCancelavgpayDet',
      methodMask: ['*']
    },
    {
      description: 'hr_empOrderCwshdgrpDet',
      entityMask: 'hr_empOrderCwshdgrpDet',
      methodMask: ['*']
    }
  ]
}]
