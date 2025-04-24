const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_mainPrintPerson',
  description: 'Користувач друкованих форм документів за Наказами з персоналу',
  description_uk: 'Користувач друкованих форм документів за Наказами з персоналу',
  description_ru: 'Пользователь печатных форм документов по Приказами по персоналу',
  description_az: 'Əməkdaşlar haqqında əmrlər üzrə sənədlərin çap formalarının istifadəçisi',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHR'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'search', 'viewPrintForm', 'userIsMemberOf']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    { accHRFolderOrdersMove: [
      ['hr_empOrderAppointA', 'accDst_empOrderAppointA', 'accHR_empOrderAppointA'],
      ['hr_empOrderMoveA', 'accDst_empOrderMoveA', 'accHR_empOrderMoveA'],
      ['hr_empOrderDismA', 'accDst_empOrderDismA', 'accHR_empOrderDismA'],
      ['hr_empOrderAppointMoveA', 'accDst_empOrderAppointMoveA', 'accHR_empOrderAppointMoveA'],
      ['hr_empOrderActingOrdA', 'accDst_empOrderActingOrdA', 'accHR_empOrderActingOrdA'],
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
      ['hr_empOrderChangemissionA', 'accDst_empOrderChangemissionA', 'accHR_empOrderChangemissionA']
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
      ['hr_empOrderAddSalaryGovA', 'accDst_empOrderAddSalaryGovA', 'accHR_empOrderAddSalaryGovA'],
      ['hr_empOrderCancelSalaryA', 'accDst_empOrderCancelSalaryA', 'accHR_empOrderCancelSalaryA'],
      ['hr_empOrderRiskPayA', 'accDst_empOrderRiskPayA', 'accHR_empOrderRiskPayA'],
      ['hr_empOrderAddPayA', 'accDst_empOrderAddPayA', 'accHR_empOrderAddPayA']
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
      ['hr_empOrderCancelParaA', 'acc_hr_empOrderCancelParaA', 'accDst_empOrderCancelParaA'],
      ['accDstFolderAllOrdersCheckBox', 'accDst_empOrderAllOrders']
    ] },
    ['',
      ['0-2', 'HR', 'hr_*'],
      ['3', 'ac_service', 'ac_service'],
      ['0', 'hr_empOrderCwsworkhourDet', 'hr_empOrderCwsworkhourDet']
    ]
  ]
}
