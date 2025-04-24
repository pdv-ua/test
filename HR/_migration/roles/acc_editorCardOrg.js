const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorCardOrg',
  description: 'Редактор карток організацій',
  description_uk: 'Редактор карток організацій',
  description_ru: 'Редактор карточек организаций',
  description_az: 'Təşkilat kartı redaktoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accStaff'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  const methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'allowEditOwn']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return {
    accStaffFolderOrg: [
      'hr_organization', 'accStaff_organization',
      ['0-5', 'Організація'],
      ['0-4', 'Розрахунковий рахунок організації', 'ac_orgAccount'],
      ['0-4', 'Адреса', 'ac_address'],
      ['0-4', 'Основні функції організацій та підрозділів', 'hr_basicFunctn'],
      ['0-4', 'Додатки до штатної одиниці', 'hr_staffUnitAttachment']
    ]
  }
}
