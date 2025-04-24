const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorDictionaryATU',
  description: 'Адміністратор довідників АТУ',
  description_uk: 'Адміністратор довідників АТУ',
  description_ru: 'Администратор справочников АТУ',
  description_az: 'ATU kataloqlarının administratoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHREmp'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return {
    accHREmpFolderDictATU: [
      ['ac_dictCountry', 'accHR_dictCountry', ['0-4', 'Країни', 'cdn_country']],
      ['ac_dictCity', 'accHR_dictCity', ['0-4', 'Населені пункти', 'cdn_city']],
      ['ac_dictRegion', 'accHR_dictRegion', ['0-4', 'Регіони', 'cdn_region']],
      ['cdn_citytype', 'accHR_citytype', ['0-4', 'Типи населених пунктів']]
    ]
  }
}
