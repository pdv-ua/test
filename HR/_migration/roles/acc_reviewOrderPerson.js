const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [
  {
    name: 'acc_reviewOrderPerson',
    description: 'Переглядач наказів з персоналу',
    description_uk: 'Переглядач наказів з персоналу',
    description_ru: 'Просмотрщик приказов по персоналу',
    description_az: 'işçi heyəti üzrə əmrlərə baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
    elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
  }
]

function getMethodSet () {
  let methodSet = ['getDescriptionExt', 'viewPrintForm', 'docPrintForm', 'getCalendDays', 'getMainPartIsUsed', 'groupSelect', // 5
    'addRecalcDays', 'clearRecalcDays', 'clear', 'getNextPublServRang', 'getEmpListExpAllowanceData', 'getTempExecution', // 11
    'selectPosGroups', 'userIsMemberOf', 'getRecalcDays', 'exchangeReview', 'sendReview', 'select'] // 17
  Array.of()
    .forEach((e, i) => { methodSet[i + 30] = e })
  return methodSet
}

function getRoleDef () {
  return [
    ['hr_empOrderCustom', 'accHR_empOrderCustom'],
    ['hr_empOrderExtract', 'accHR_empOrderExtract'],
    ['hr_empOrderAllA', 'accHR_empOrderAllA'],
    ['hr_empOrderRejected'],
    { accHRFolderOrdersMove: [
      ['hr_empOrderAppointA', 'accDst_empOrderAppointA', 'accHR_empOrderAppointA'],
      ['hr_empOrderMoveA', 'accDst_empOrderMoveA', 'accHR_empOrderMoveA'],
      ['hr_empOrderDismA', 'accDst_empOrderDismA', 'accHR_empOrderDismA',
        ['0', 'Наказ з персоналу про звільнення. Деталь', 'hr_empOrderDismDet'],
        ['5-8,14', 'Наказ з персоналу про звільнення. Компенсація відпусток', 'hr_empOrderDismVac']
      ],
      ['hr_empOrderAppointMoveA', 'accDst_empOrderAppointMoveA', 'accHR_empOrderAppointMoveA'],
      ['hr_empOrderActingOrdA', 'accDst_empOrderActingOrdA', 'accHR_empOrderActingOrdA'],
      ['hr_empOrderActingCloseA', 'accDts_empOrderActingCloseA', 'accHR_empOrderActingCloseA'],
      ['hr_empOrderRankA', 'accDst_empOrderRankA', 'accHR_empOrderRankA'],
      ['hr_empOrderCanceldismA', 'accDst_empOrderCanceldismA', 'accHR_empOrderCanceldismA'],
      ['hr_empOrderPluralistA', 'accDst_empOrderPluralistA', 'accHR_empOrderPluralistA'],
      ['hr_empOrderOutpluralA', 'accDst_empOrderOutpluralA', 'accHR_empOrderOutpluralA']
    ],
    accHRFolderOrdersAbsence: [
      ['hr_empOrderVacationA', 'accDst_empOrderVacationA', 'accHR_empOrderVacationA'],
      ['hr_empOrderVacationRetA', 'accDst_empOrderVacationRetA', 'accHR_empOrderVacationRetA'],
      ['hr_empOrderVacationProlongA', 'accDst_empOrderVacationProlongA', 'accHR_empOrderVacationProlongA'],
      ['hr_empOrderVacationRevokeA', 'accDst_empOrderVacationRevokeA', 'accHR_empOrderVacationRevokeA'],
      ['hr_empOrderMissionA', 'accDst_empOrderMissionA', 'accHR_empOrderMissionA'],
      ['hr_empOrderChangemissionA', 'accDst_empOrderChangemissionA', 'accHR_empOrderChangemissionA'],
      ['hr_empOrderVacationCompA', 'accDst_empOrderVacationCompA', 'accHR_empOrderVacationCompA']
    ],
    accHRFolderOrdersChgWorkSched: [
      ['hr_empOrderChgworksched', 'accDst_empOrderChgworksched', 'accHR_empOrderChgworksched'],
      ['hr_empOrderWeekendWork', 'accDst_empOrderWeekendWork', 'accHR_empOrderWeekendWork'],
      ['hr_empOrderRelaxHd', 'accDst_empOrderRelaxHd', 'accHR_empOrderRelaxHd'],
      ['hr_empOrderRelaxDonor', 'accDst_empOrderRelaxDonor', 'accHR_empOrderRelaxDonor'],
      ['hr_empOrderCwsWorkHour', 'accDst_empOrderCwsWorkHour', 'accHR_empOrderCwsWorkHour'],
      ['hr_empOrderOverPayA', 'accDst_empOrderOverPayA', 'accHR_empOrderOverPayA']
    ],
    accHRFolderOrdersChgSalary: [
      ['hr_empOrderAddSalaryA', 'accDst_empOrderAddSalaryA', 'accHR_empOrderAddSalaryA'],
      ['hr_empOrderBountyA', 'accDst_empOrderBountyA', 'accHR_empOrderBountyA'],
      ['hr_empOrderBountyHelpA', 'accDst_empOrderBountyHelpA', 'accHR_empOrderBountyHelpA'],
      ['hr_empOrderCancelSalaryA', 'accDst_empOrderAddSalaryGovA', 'accHR_empOrderAddSalaryGovA'],
      ['hr_empOrderAddSalaryGovA', 'accDst_empOrderCancelSalaryA', 'accHR_empOrderCancelSalaryA'],
      ['hr_empOrderRiskPayA', 'accDst_empOrderRiskPayA', 'accHR_empOrderRiskPayA'],
      ['hr_empOrderAddPayA', 'accDst_empOrderAddPayA', 'accHR_empOrderAddPayA'],
      ['hr_empOrderChgsalaryA', 'accDst_empOrderChgsalaryA', 'accHR_empOrderChgsalaryA']
    ],
    accHRFolderOrdersTraining: [
      ['hr_empOrderTrainingA', 'accDst_empOrderTrainingA', 'accHR_empOrderTrainingA'],
      ['hr_empOrderInternshipA', 'accDst_empOrderInternshipA', 'accHR_empOrderInternshipA']
    ],
    accHRFolderOrdersDisciplinary: [
      ['hr_empOrderBonusA', 'accDst_empOrderBonus', 'accHR_empOrderBonus'],
      ['hr_empOrderRewardA', 'accDst_empOrderReward', 'accHR_empOrderReward'],
      ['hr_empOrderPenaltyA', 'accDst_empOrderPenalty', 'accHR_empOrderPenalty']
    ],
    accHRFolderOrdersOther: [
      ['hr_empOrderChgEmployeeA', 'accDst_empOrderChgEmployeeA', 'accHR_empOrderChgEmployeeA'],
      ['hr_empOrderMilServiceA', 'accDst_empOrderMilServiceA', 'accHR_empOrderMilServiceA'],
      ['hr_empOrderMilServiceRetA', 'accDst_empOrderMilServiceRetA', 'accHR_empOrderMilServiceRetA'],
      ['hr_empOrderCancellationA', 'accDst_empOrderCancellationA', 'acc_hr_empOrderCancellationA'],
      ['acc_hr_empOrderCancelParaA', 'hr_empOrderCancelParaA', 'accDst_empOrderCancelParaA'],
      ['hr_empOrderAppointLiqA', 'accDst_empOrderAppointLiqA', 'accHREmpOrderAppointLiqA'],
      ['hr_empOrderTrialProlongA', 'accDst_empOrderTrialProlongA', 'accHREmpOrderTrialProlongA'],
      ['hr_empOrderChgPosition', 'accDst_HRChangePosition', 'accHRChangePosition'],
      ['hr_changePosSchLog', 'accHRchangePosSchLog', 'accDst_changePosSchLog'],
      ['hr_empOrderDowntimeA', 'accDst_empOrderDowntimeA', 'accHR_empOrderDowntimeA'],
      ['hr_empOrderRecallA', 'accDst_empOrderRecallA', 'accHR_empOrderRecallA'],
      ['hr_empOrderVehicleassign', 'accDst_empOrderVehicleassign', 'accHR_empOrderVehicleassign'],
      ['hr_empOrderMedexaminationA', 'accDst_empOrderMedexaminationA', 'accHR_empOrderMedexaminationA'],
      ['hr_empOrderAveragePay', 'accDst_empOrderAveragePay', 'accHR_empOrderAveragePay'],
      ['hr_empOrderCancelAveragePay', 'accDst_empOrderCancelAveragePay', 'accHR_empOrderCancelAveragePay']
    ],
    accDstFolderOrders: [
      'accDstFolderOrdersOther', 'accDstFolderOrdersMove', 'accDstFolderOrdersDisciplinary', 'accDstFolderOrdersTraining',
      'accDstFolderOrdersChgSalary', 'accDstFolderOrdersChgWorkSched', 'accDstFolderOrdersAbsence',
      'accDstFolderAllOrdersCheckBox', 'accDst_empOrderAllOrders'
    ] },
    ['',

      ['2,3,15,16', 'hr_empOrder', 'hr_empOrder'],
      ['4', 'Відпустки, які нараховуються працівнику', 'hr_empVacationPlan'],
      ['9', 'hr_employee', 'hr_employee'],
      ['11,12', 'Призначення працівника', 'hr_employeePositionS'],
      ['17', 'hr_empOrderCwsworkhourDet', 'hr_empOrderCwsworkhourDet'],
      ['13', 'ac_service', 'ac_service']
    ]
  ]
}
