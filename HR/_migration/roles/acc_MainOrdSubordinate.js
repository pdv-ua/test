const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_MainOrdSubordinate',
  description: 'Фахівець з внесення наказів підлеглих організацій',
  description_uk: 'Фахівець з внесення наказів підлеглих організацій',
  description_ru: 'Специалист по внесению приказов подчиненных организаций',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHR', 'arm_accDoc'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'checkTabNum', // 6
    'clearDetail', 'saveReportSettings', 'fillOrderAccrual', 'getWorkDays', 'getCalendDays4Vac', 'getWorkDays4Vac', // 12
    'getCalendDateTo4Vac', 'getWorkDateTo4Vac', 'setDateAndNumber', 'docPrintForm', 'repPrintForm', 'isWorkDay', // 18
    'setItemIdx', 'moveItemUp', 'moveItemDown', 'enumerateItems', 'checkYearMissionDays', 'getYearInfo', // 24
    'getDescriptionExt', 'getActiveVacationList', 'cloneVacationList', 'recalcBounty', 'fillEmployee', 'addPeriods', // 30
    'loadEmployeeList', 'createOrder', 'addList', 'getValidatorWarning', 'updateOrderFieldLastChangeDate', 'fillOrderExperience', 'clearOrder*', 'doPosting_*', // 38
    'closeDateTo', 'checkRankInYear', 'updateBountyPayEl', 'userIsMemberOf', 'calcVacationMoveList', 'getVacListIDs', 'importList' // 45
  ]

  Array.of('startReconciliation', 'stopReconciliation', 'continueReconciliation', 'cancelReconciliation', 'canVisibleStartReconciliation', // 54
    'canVisibleStopReconciliation', 'canVisibleContinueReconciliation', 'canVisibleCancelReconciliation', // 57
    'getNextPublServRang', 'copyPosition', 'fillAddSalary', 'fillCancelSalary', // 61
    'groupSelect', 'addRecalcDays', 'clearRecalcDays', 'clear', 'createMoveOrder', 'loadFromTemplate', 'getTimeSheetAbsences', // 68
    'getTempExecution', 'getOrderSignerInfo', 'addIntComb', 'addOrderItems', 'checkNoVacDays', 'canCreateEmployeePosition', // 74
    'selectPosGroups', 'getVacDaysInSickness', 'newVersionPosition', 'getOrderSignerList', 'calcFunds', 'getPlanSumByPosition', 'getRecalcDays', // 81
    'addMultiOrder', 'addStampData', 'getDocumentWithStampData') // 84
    .forEach((e, i) => { methodSet[i + 50] = e })

  Array.of('checkImpartibleVac', 'checkAvailableVacationDays', 'checkMainPart', 'checkVacationCrossPeriod', 'checkEmpNumberPeriod', // 104
    'checkVacationCrossTimeSheet', 'checkContVacation', 'checkNotPerVacDays', 'checkMoneyHelpVac', 'clearPeriods', 'checkPeriodDayDiff', // 110
    'addDefaultVacationPlan', 'getVacationPlanData', 'clearEmployees', 'checkAccrualDates', 'addDefaultPluralistVacationPlan', 'closeDateTo', // 116
    'clearVacationPlan', 'checkVacPlanIsNotDeleted', 'addBalance', 'loadAccrualChangesFromStaffTable', 'checkSicknessCrossTimeSheet', 'loadAccrualChangesFromStaffTariffing') // 122
    .forEach((e, i) => { methodSet[i + 100] = e })

  Array.of('clearActingDet', 'fillVacSubstitution', 'clearVacSubstitutionDet', 'vacSubstitutionNote', 'checkVacSubstitution', 'validateVacSubstitution',
    'createOrderBusinessTripEducation', 'createOrderEducation', 'canEditOrdersSubordinate', 'fillOrderAccrualWithSave', 'replaceDateFrom', 'addEvaluationType', 'setInitWorkHour') // 212
    .forEach((e, i) => { methodSet[i + 200] = e })
  return methodSet
}

function getRoleDef () {
  return [
    ['hr_empOrderCustom', 'accHR_empOrderCustom'],
    ['hr_empOrderExtract', 'accHR_empOrderExtract'],
    ['hr_settingsEmpOrder', 'accHR_settingsEmpOrder'],
    {
      accHRFolderOrdersMove: [
        ['hr_empOrderCanceldismA', 'accDst_empOrderCanceldismA', 'accHR_empOrderCanceldismA'],
        ['hr_empOrderRankA', 'accDst_empOrderRankA', 'accHR_empOrderRankA'],
        ['hr_empOrderActingOrdA', 'accDst_empOrderActingOrdA', 'accHR_empOrderActingOrdA'],
        ['hr_empOrderActingCloseA', 'accDts_empOrderActingCloseA', 'accHR_empOrderActingCloseA'],
        ['hr_empOrderDismA', 'accDst_empOrderDismA', 'accHR_empOrderDismA',
          ['62-65,81', 'Наказ з персоналу про звільнення. Компенсація відпусток', 'hr_empOrderDismVac'],
          ['0-4,25', 'Наказ з персоналу про звільнення. Деталь', 'hr_empOrderDismDet']
        ],
        ['hr_empOrderMoveA', 'accDst_empOrderMoveA', 'accHR_empOrderMoveA'],
        ['hr_empOrderAppointA', 'accDst_empOrderAppointA', 'accHR_empOrderAppointA'],
        ['hr_empOrderAppointMoveA', 'accDst_empOrderAppointMoveA', 'accHR_empOrderAppointMoveA'],
        ['hr_empOrderPluralistA', 'accDst_empOrderPluralistA', 'accHR_empOrderPluralistA',
          ['0-6,43', '', 'hr_empOrderPluralisDet']],
        ['hr_empOrderOutpluralA', 'accDst_empOrderOutpluralA', 'accHR_empOrderOutpluralA']
      ],
      accHRFolderOrdersAbsence: [
        ['hr_empOrderMissionA', 'accDst_empOrderMissionA', 'accHR_empOrderMissionA'],
        ['hr_empOrderChangemissionA', 'accDst_empOrderChangemissionA', 'accHR_empOrderChangemissionA'],
        ['hr_empOrderVacationRetA', 'accDst_empOrderVacationRetA', 'accHR_empOrderVacationRetA',
          ['25,66', 'Наказ про вихід із неоплачуваної відпустки', 'hr_empOrderVacationretDet']],
        ['hr_empOrderVacationRevokeA', 'accDst_empOrderVacationRevokeA', 'accHR_empOrderVacationRevokeA'],
        ['hr_empOrderVacationProlongA', 'accDst_empOrderVacationProlongA', 'accHR_empOrderVacationProlongA'],
        ['hr_empOrderVacationA', 'accDst_empOrderVacationA', 'accHR_empOrderVacationA'],
        ['hr_empOrderVacationCompA', 'accDst_empOrderVacationCompA', 'accHR_empOrderVacationCompA']
      ],
      accHRFolderOrdersChgWorkSched: [
        ['hr_empOrderCwsWorkHour', 'accDst_empOrderCwsWorkHour', 'accHR_empOrderCwsWorkHour'],
        ['hr_empOrderRelaxDonor', 'accDst_empOrderRelaxDonor', 'accHR_empOrderRelaxDonor'],
        ['hr_empOrderRelaxHd', 'accDst_empOrderRelaxHd', 'accHR_empOrderRelaxHd'],
        ['hr_empOrderWeekendWork', 'accDst_empOrderWeekendWork', 'accHR_empOrderWeekendWork'],
        ['hr_empOrderChgworksched', 'accDst_empOrderChgworksched', 'accHR_empOrderChgworksched'],
        ['accHR_empOrderOverPayA', 'accDst_empOrderOverPayA', 'hr_empOrderOverPayA']
      ],
      accHRFolderOrdersChgSalary: [
        ['hr_empOrderCancelSalaryA', 'accDst_empOrderCancelSalaryA', 'accHR_empOrderCancelSalaryA'],
        ['accHR_empOrderRiskPayA', 'accDst_empOrderRiskPayA', 'hr_empOrderRiskPayA'],
        ['hr_empOrderAddSalaryGovA', 'accDst_empOrderAddSalaryGovA', 'accHR_empOrderAddSalaryGovA'],
        ['hr_empOrderBountyHelpA', 'accDst_empOrderBountyHelpA', 'accHR_empOrderBountyHelpA'],
        ['hr_empOrderBountyA', 'accDst_empOrderBountyA', 'accHR_empOrderBountyA'],
        ['hr_empOrderAddSalaryA', 'accDst_empOrderAddSalaryA', 'accHR_empOrderAddSalaryA'],
        ['accHR_empOrderAddPayA', 'accDst_empOrderAddPayA', 'hr_empOrderAddPayA']
      ],
      accHRFolderOrdersTraining: [
        ['hr_empOrderInternshipA', 'accDst_empOrderInternshipA', 'accHR_empOrderInternshipA'],
        ['hr_empOrderTrainingA', 'accDst_empOrderTrainingA', 'accHR_empOrderTrainingA'],
        ['hr_dictOrderDetReason', ['0-4', 'Підстава наказу']]
      ],
      accHRFolderOrdersDisciplinary: [
        ['hr_empOrderPenaltyA', 'accDst_empOrderPenalty', 'accHR_empOrderPenalty'],
        ['hr_empOrderRewardA', 'accDst_empOrderReward', 'accHR_empOrderReward'],
        ['hr_empOrderBonusA', 'accDst_empOrderBonus', 'accHR_empOrderBonus']
      ],
      accHRFolderOrdersOther: [
        ['hr_empOrderCancellationA', 'accDst_empOrderCancellationA', 'acc_hr_empOrderCancellationA'],
        ['hr_empOrderMilServiceRetA', 'accDst_empOrderMilServiceRetA', 'accHR_empOrderMilServiceRetA'],
        ['hr_empOrderMilServiceA', 'accDst_empOrderMilServiceA', 'accHR_empOrderMilServiceA'],
        ['hr_empOrderChgEmployeeA', 'accDst_empOrderChgEmployeeA', 'accHR_empOrderChgEmployeeA'],
        ['hr_empOrderCancelParaA', 'accDst_empOrderCancelParaA', 'acc_hr_empOrderCancelParaA'],
        ['hr_empOrderTrialProlongA', 'accDst_empOrderTrialProlongA', 'accHREmpOrderTrialProlongA',
          ['25,68', 'Наказ про продовження випробувального терміну', 'hr_empOrderTrialprolongDet']
        ],
        ['accHRChangePosition', 'hr_empOrderChgPosition', 'accDst_HRChangePosition'],
        ['accHR_empOrderDowntimeA', 'hr_empOrderDowntimeA', 'accDst_empOrderDowntimeA'],
        ['hr_changePosSchLog', 'accHRchangePosSchLog', 'accDst_changePosSchLog',
          ['0', 'Лог шедулера створення призначень при тимчасовій зміні']
        ],
        ['accDstFolderAllOrdersCheckBox', 'accDst_empOrderAllOrders'],
        ['hr_empOrderMedexaminationA', 'accDst_empOrderMedexaminationA', 'accHR_empOrderMedexaminationA'],
        ['hr_empOrderAveragePay', 'accDst_empOrderAveragePay', 'accHR_empOrderAveragePay'],
        ['hr_empOrderCancelAveragePay', 'accDst_empOrderCancelAveragePay', 'accHR_empOrderCancelAveragePay']
      ],
      accDocFolderOrder: [
        ['hr_empOrderRejected', 'accDoc_empOrderRejected'],
        ['hr_empOrderRejectedMy', 'accDoc_empOrderRejectedMy'],
        ['hr_empOrderOnCompletion', 'accDoc_empOrderOnCompletion'],
        ['hr_empOrderOnCompletionMy', 'accDoc_empOrderOnCompletionMy']
      ],
      accDstFolderOrders: [
        'accDstFolderOrdersOther', 'accDstFolderOrdersMove', 'accDstFolderOrdersDisciplinary', 'accDstFolderOrdersTraining',
        'accDstFolderOrdersChgSalary', 'accDstFolderOrdersChgWorkSched', 'accDstFolderOrdersAbsence'
      ],
      accHREmpFolderActing: [
        ['hr_empActingList',
          ['116', 'Виконуючі обов\'язки', 'hr_empActingList']
        ]
      ]
    },
    ['',
      ['0-41,43,83,84,200-205,208-210', 'Наказ з персоналу', 'hr_empOrder*'],
      ['206-207', 'Наказ з персоналу', 'hr_empListEmpExperience'],
      ['0-4', 'Додатки до наказів', 'hr_orderAttachment'],
      ['0-4,211', 'Лист ознайомлення', 'hr_acquaintanceList'],
      ['0-4,50-57', 'Этап согласования', 'hr_recstage'],
      ['0-4', 'Участник согласования', 'hr_recparticipant'],
      ['58', 'Особа', 'hr_employee'],
      ['0-4,59,77,79,80', 'Посада', 'hr_position'],
      ['0-4', 'Доповнення до назви', 'hr_dictNameAddition'],
      ['0-4', 'Заголовок та преамбула', 'hr_dictEmpOrderText'],
      ['0-4,60-61', 'Наказ про встановлення посадових окладів. Працівники', 'hr_empOrderChgSalEmpDet'],
      ['0-4', 'Підстави для прийому на роботу', 'hr_dictReasonTrialProlong'],
      ['0-4', 'Завдання', 'hr_dictTask'],
      ['0-4,67', 'Шаблон узгодження', 'hr_recstageTemplate'],
      ['0-4', 'Мета відрядження', 'hr_dictMissionPurpose'],
      ['0-4', 'Вимоги до звіту про відрядження', 'hr_dictMissionPhrase'],
      ['0-4,70,78', 'Призначення працівника', 'hr_employeePosition'],
      ['0,69,75', 'Призначення працівника', 'hr_employeePositionS'],
      ['0-4,7,100-108,110', 'Періоди наказів про відпустку', 'hr_empOrderVacationListDet'],
      ['0-4,71,72,118,121,82', 'Накази на періодичну відпустку', 'hr_empOrderVacationDet'],
      ['0-4,71,72,82', 'Накази на неперіодичну відпустку', 'hr_empOrderVacationlongDet'],
      ['0-4,71,76', 'Накази на продовження відпустки', 'hr_empOrderVacationprolongDet'],
      ['0-4,25,71', 'Наказ про продовження неперіодичної відпустки', 'hr_empOrderVacationprolonglDet'],
      ['0-4,71,73,103', 'Накази на відкликання з відпустки', 'hr_empOrderVacationrevokeDet'],
      ['0-4,30,109', 'Компенсація відпустки', 'hr_empOrderVacationcompDet'],
      ['0-4', 'Виконуючі обов\'язки', 'hr_vacationScheduleActing'],
      ['0-4,74', 'hr_empOrderChgpositionDet', 'hr_empOrderChgpositionDet'],
      ['0-4,7,31', 'Наказ про простій, тимчасове призупинення', 'hr_empOrderDowntimeDet'],
      ['0-4', 'Працівники для наказу про простій, тимчасове призупинення', 'hr_empOrderDowntimeListDet'],
      ['0-4,31', 'Наказ про вихід з простою або тимчасового призупинення', 'hr_empOrderExitdowntimeDet'],
      ['0-4', 'Працівники для наказу про вихід з простою або тимчасового призупинення', 'hr_empOrderExitdowntimeListDet'],
      ['0-4,7,39', 'Покладання обов\'язків', 'hr_empOrderActingDet'],
      ['0-4,111,112,115,117,119', 'Право на відпустку (для наказів)', 'hr_empOrderVacationPlan'],
      ['113,120,122', 'Наказ про встановлення надбавок', 'hr_empOrderAddsalaryDet'],
      ['114', 'Наказ про встановлення надбавок за вислугу років', 'hr_empOrderAddsalarygovDet'],
      ['0-4', 'Підстави для передачі мат. цінностей', 'hr_dictReasonMaterialtransfer'],
      ['0-4,7,31', 'Наказ про оплату додаткової роботи', 'hr_empOrderAddpayDet'],
      ['44', 'ac_service', 'ac_service'],
      ['0-4,212', 'hr_empOrderCwsworkhourDet', 'hr_empOrderCwsworkhourDet'],
      ['0-5', 'hr_empOrderTempavgpayDet', 'hr_empOrderTempavgpayDet'],
      ['0-4,45', 'hr_empOrderAveragepayDet', 'hr_empOrderAveragepayDet'],
      ['0-4,45', 'hr_empOrderCwshdgrpDet', 'hr_empOrderCwshdgrpDet'],
      ['0-4', 'hr_empOrderCancelavgpayDet', 'hr_empOrderCancelavgpayDet']
    ]
  ]
}
