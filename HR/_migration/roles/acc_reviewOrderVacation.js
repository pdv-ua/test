const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [
  {
    name: 'acc_reviewOrderVacation',
    description: 'Переглядач наказів про надання відпусток',
    description_uk: 'Переглядач наказів про надання відпусток',
    description_ru: 'Просмотрщик приказов о предоставлении отпусков',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
    elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
  }
]

function getMethodSet () {
  let methodSet = ['getTempExecution', 'userIsMemberOf']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['accHRFolderOrdersMove'],
    ['accHRFolderOrdersAbsence', 'accHR_empOrderVacationA', 'hr_empOrderVacationA'],
    ['accHR_empOrderVacationRetA', 'hr_empOrderVacationRetA'],
    ['accHR_empOrderVacationProlongA', 'hr_empOrderVacationProlongA'],
    ['accHR_empOrderVacationRevokeA', 'hr_empOrderVacationRevokeA'],
    ['accHR_empOrderVacationCompA', 'hr_empOrderVacationCompA'],
    ['accHR_empOrderMissionA', 'hr_empOrderMissionA'],
    ['accHR_empOrderChangemissionA', 'hr_empOrderChangemissionA'],
    ['',
      ['0', 'Призначення працівника', 'hr_employeePositionS'],
      ['1', 'ac_service', 'ac_service']
    ]
  ]
}
