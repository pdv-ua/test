const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_admData',
  description: 'Адміністратор Системи',
  description_uk: 'Адміністратор Системи',
  description_ru: 'Администратор Системы',
  description_az: 'Sistemin administratoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['adm_desktop', 'arm_accAdm', 'arm_accImport', 'arm_accHREmp'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'search', 'getRegnumCounter',
    'updateAttrEntry', 'loadDefaultConfig', 'allowEditAll', 'getOrgPrintSettings', '*', 'saveSelection',
    'doSave', 'doCopy', 'updateDt', 'createUsers', 'getImportData'
  ]
  return methodSet
}

function getRoleDef () {
  return [
    {
      accHRFolderSetupOrg: [
        ['hr_dictTempExecution', 'accAdm_dictTempExecution', ['0-4', 'Довідник ТВО за положенням']],
        ['ac_docPrintSettingsOrg', 'accAdmDocPrintSettingsOrg'],
        [
          'ac_settingsOrg', 'ac_settingsMyOrg',
          'accAdmSettingsMyOrg',
          'accHrEmpOrderDetConfig', 'arm_hrEmpOrderDetConfig',
          ['0-5,8', 'Налаштування організації', 'ac_settingsOrg']
        ]
      ],
      arm_accCfgHrSetup: [
        ['accAcSettingsOrgTemplate', 'ac_settingsOrgTemplate'],
        ['accHrPositionTypeProps', 'hr_positionTypeProps'],
        ['accHrEmpOrderDetConfigDef', 'hr_hrEmpOrderDetConfigDef']
      ],
      /* accAdmFolderConstant: [
        ['ac_constant', 'accAdmConstant', ['1-4', 'Константи']],
        ['ac_settings', 'accAdmSettings', ['1-5', 'Загальні налаштування']],
        ['ac_settingsEmp', 'accAdmSettingsEmp', ['1-5', 'Налаштування користувача']]
      ], */
      adm_folder_UI: [
        ['ubm_enum', ['0-4', 'Переліки']],
        ['ubm_desktop', ['0-4', 'Робочі столи']],
        ['ubm_navshortcut', ['0-4', 'Ярлики']],
        ['ubm_diagram', ['0-4', 'ER діаграми']],
        ['ubm_form', ['0-4', 'Форми']],
        ['ubs_report', ['0-4', 'Звіти']]
      ],
      adm_folder_misc: [
        ['ubs_settings', ['0-4', 'Налаштування']],
        ['ubs_filter', ['0-4', 'Збережені фільтри']],
        ['ubs_numcounter', ['0-4', 'Нумератори']],
        ['ubs_numcounterreserv', ['0-4', 'Нумератори (резерв)']],
        ['ubs_softLock', ['0-4', 'Блокування (SoftLocks)']],
        ['ubs_globalCache', ['0', 'Server-side cache']],
        ['ubs_message', ['0-4', 'Повідомлення']]
      ],
      adm_folder_UBQ: [
        ['ubq_scheduler', ['0', 'Планувальники задач']],
        ['ubq_messages', ['0-4', 'Черг']],
        ['ubq_runstat', ['0-4', 'Статистика']]
      ],
      accImportFolderSA: [
        [
          'accImport_payImport', // 'hr_importPlan',
          // 'accImport_studImport', //'hr_importStud',
          'accImportFolderSpecSA',
          'accImport_payImportCustom', // 'hr_importCustom',
          'accImport_payImportNumber', // 'hr_importNumber',
          'accImport_payImportRaiseSalary', // 'hr_importRaiseSalary',
          'accImport_empOrderCalcSpec', // 'hr_empOrderForCalcSpec',
          'accImport_detFormForRLAndSal', // 'hr_detFormForRLAndSal',
          'accImport_employeeNumberCorrection', //, 'hr_employeeNumberCorrection'
          'accImportFolderExtrnl',
          'accImport_IntegrateMap',
          'accImport_SynchronizedData'
        ]
      ]
    },
    ['adm_logView'],
    ['accHREmp_employeeTabListCurrent', 'hr_employeeTabListCurrent'],
    ['accAdmConstants',
      ['1-4,13-14', 'Константи', 'ac_constant'],
      ['1-5', 'Загальні налаштування', 'ac_settings'],
      ['1-5', 'Загальні налаштування', 'ac_settingsOrg'],
      ['1-5', 'Налаштування користувача', 'ac_settingsEmp']
    ],
    ['hr_counter', 'accAdmOrderCounter', ['1-4', 'Нумерація наказів']],
    ['ac_docPrintSettings', 'accAdmDocPrintSettings', ['0-4', 'Налаштування друку документів']],
    ['hr_reportSetParam', 'accAdmReportSetParam',
      ['0-4', 'Параметри налаштування', 'hr_repSetParam'],
      ['0-4', 'Входження елементів налаштування', 'hr_repSetElement']
    ],
    ['hr_employeeCardShortcutList', 'accAdmHREmployeeCabList',
      ['0-4,12', 'Параметри налаштування', 'hr_employeeCardShortcutList']
    ],
    ['hr_employeeCardSetting', 'accAdmHREmployeeCardSetting',
      ['0-4,12', 'Параметри налаштування', 'hr_employeeCardSetting']
    ],
    ['',
      ['0-4,15', 'Користувачі', 'uba_user'],
      ['1-5', 'Нумерація документів', 'ac_counter'],
      ['0-4', 'userRole', 'uba_userrole'],
      ['0-4', 'uba_usergroup', 'uba_usergroup'],
      ['0-4', 'Ролі', 'uba_role'],
      ['0-4', 'uba_subject', 'uba_subject'],
      ['0', 'uba_als', 'uba_als'],
      ['0', 'uba_els', 'uba_els'],
      ['0', 'ubm_*', 'ubm_*'],
      ['0', 'capi_userSettings', 'capi_userSettings'],
      ['1-4,6', 'Лічильник реєстраційних ключів', 'ubs_numcounter'],
      ['0-4', 'Повідомлення', 'ubs_message_edit'],
      ['0-4,7', 'Параметри налаштування пунктів наказів (можливі значення)', 'hr_empOrderDetConfigAttr'],
      ['0-4', 'Налаштування пунктів наказів (види оплати)', 'hr_empOrderDetConfig'],
      ['0-5', 'Шаблон налаштувань констант організації', 'ac_settingsOrgTemplate'],
      ['0-4', 'Організації', 'hr_organization'],
      ['0-4', 'Імпорт даних', 'hr_importPlan'],
      ['0-4', 'Імпорт списку студентів', 'hr_importStud'],
      ['11', 'Рішення для обробки даних', 'hr_importCustom'],
      ['11', 'hr_empOrderChgtimecostDet', 'hr_empOrderChgtimecostDet'],
      ['16', 'hr_user', 'hr_user'],
      ['17', 'hr_report', 'hr_report'],
      ['0,11', 'ac_integrateMap', 'ac_integrateMap']
    ]
  ]
}
