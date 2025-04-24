/*
const migrationService = require('../../../AC/_migration/migrationService')
*/
module.exports = [{
  name: 'acc_mainOrgAdmin',
  description: 'Відповідальний за налаштування організації',
  description_uk: 'Відповідальний за налаштування організації',
  description_ru: 'Ответственный за настройку организации',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accAdm'],
  shortcutCodes: [
    'accHRFolderSetupOrg',
    'hr_employeeCardShortcutList',
    'accAdmHREmployeeCabList',
    'hr_dictTempExecution',
    'accAdm_dictTempExecution',
    'ac_settingsMyOrg',
    'accAdmSettingsMyOrg',
    'accAdmEmployeePhoto',
    'ac_docPrintSettingsOrg',
    'accAdmDocPrintSettingsOrg',
    'arm_hrEmpOrderDetConfig',
    'accHrEmpOrderDetConfig',
    'accEmpRefSettings',
    'arm_accCfgHrSetup'
  ], // migrationService.getShortcutCodes(getRoleDef()),
  elsRule: [
    {
      description: 'hr_dictTempExecution',
      entityMask: 'hr_dictTempExecution',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update']
    },
    {
      description: 'ac_settingsOrg',
      entityMask: 'ac_settingsOrg',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update', 'search', 'loadDefaultConfig']
    },
    {
      description: 'ac_docPrintSettings',
      entityMask: 'ac_docPrintSettings',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update']
    },
    {
      description: 'hr_empOrderDetConfig',
      entityMask: 'hr_empOrderDetConfig',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update', 'loadDefaultConfig']
    },
    {
      description: 'hr_empOrderDetConfigAttr',
      entityMask: 'hr_empOrderDetConfigAttr',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update']
    },
    {
      description: 'hr_employee',
      entityMask: 'hr_employee',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update']
    },
    {
      description: 'hr_employeeDocs',
      entityMask: 'hr_employeeDocs',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update']
    },
    {
      description: 'hr_attachDoc',
      entityMask: 'hr_attachDoc',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update']
    },
    {
      description: 'hr_recstage',
      entityMask: 'hr_recstage',
      methodMask: ['canStopReconciliation']
    },
    {
      description: 'hr_empImportPhoto',
      entityMask: 'hr_empImportPhoto',
      methodMask: ['*']
    },
    {
      description: 'hr_employeeCardShortcutList',
      entityMask: 'hr_employeeCardShortcutList',
      methodMask: ['select', 'addnew', 'delete', 'insert', 'update', 'saveSelection']
    },
    {
      description: 'Налаштування відображення довідок в системі',
      entityMask: 'hr_empRefSettings',
      methodMask: ['select', 'insert', 'delete', 'update']
    }
  ]
}]
