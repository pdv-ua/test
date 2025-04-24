module.exports = [
  {
    name: 'acc_hrOrgEditor',
    description: 'Редактор організацій',
    description_uk: 'Редактор організацій',
    description_ru: 'Редактор организаций',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrg',
      'accStaff_staffOrderOrgStructure',
      'hr_staffOrderOrgStructure',
      'accStaff_staffOrg',
      'hr_staffTreeOrg',
      'accStaff_organization',
      'hr_organization'
    ],
    elsRule: [
      /* Базові права */
      { description: 'Друковані форми', entityMask: 'uba_auditTrail', methodMask: ['select'] },
      { description: 'Друковані форми', entityMask: 'ubs_report', methodMask: ['select'] },
      { description: 'Нумератор', entityMask: 'ubs_numcounter', methodMask: ['select', 'getRegnumCounter'] },
      {
        description: 'Підрозділи організації',
        entityMask: 'org_department',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Особи організації',
        entityMask: 'org_employee',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'МВО',
        entityMask: 'ac_respPerson',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Професії',
        entityMask: 'org_profession',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Штатні одиниці організації',
        entityMask: 'org_staffunit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Фіз особи',
        entityMask: 'cdn_person',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Призначення',
        entityMask: 'org_employeeonstaff',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      /* GL */
      { description: 'Можливі аналітики рахунку', entityMask: 'gl_accDim', methodMask: ['select'] },
      {
        description: 'Рахунок плану рахунків',
        entityMask: 'gl_account',
        methodMask: ['select', 'lock', 'unlock']
      },
      {
        description: 'План рахунків',
        entityMask: 'gl_chartOfAccount',
        methodMask: ['select']
      },
      {
        description: 'Аналітики',
        entityMask: 'gl_dimension',
        methodMask: ['select']
      },
      { description: 'Елементи обліку', entityMask: 'gl_dimValue', methodMask: ['select'] },
      {
        description: 'Можливі документи',
        entityMask: 'gl_docClass',
        methodMask: ['select']
      },
      { description: 'Документи', entityMask: 'gl_document', methodMask: ['select'] },
      { description: 'Факт операцій', entityMask: 'gl_entry', methodMask: ['select'] },
      { description: 'Журнал проведень', entityMask: 'gl_journalEntry', methodMask: ['select'] },
      { description: 'Аналітики проводок', entityMask: 'gl_journalEntryDim', methodMask: ['select'] },
      { description: 'Види операцій', entityMask: 'gl_operationKind', methodMask: ['select'] },
      /* AC */
      {
        description: 'Адреса',
        entityMask: 'ac_address',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Банки',
        entityMask: 'ac_bank',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getConfig']
      },
      {
        description: 'Країни',
        entityMask: 'cdn_country',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Міста',
        entityMask: 'cdn_city',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Регіони',
        entityMask: 'cdn_region',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Валюти',
        entityMask: 'cdn_currency',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Комісії документів',
        entityMask: 'ac_commission',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Константи',
        entityMask: 'ac_constant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Типи орг, контр',
        entityMask: 'cdn_orgbusinesstype',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Тип штатної одиниці',
        entityMask: 'cdn_staffunittype',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контакти',
        entityMask: 'cdn_contact',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Тип підрозділу',
        entityMask: 'cdn_deptype',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Професії',
        entityMask: 'cdn_profession',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Розрахункові рахунки контрагентів',
        entityMask: 'ac_contrAccount',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Контрагенти',
        entityMask: 'ac_contractor',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Відповідальна особа',
        entityMask: 'ac_contrRespPerson',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Нумерація документів',
        entityMask: 'ac_counter',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'search']
      },
      {
        description: 'Причини коригування ПН',
        entityMask: 'ac_dictAdjReasonTaxInv',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Код ознаки зведеної ПН',
        entityMask: 'ac_dictCodeConsTaxInv',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Комісії',
        entityMask: 'hr_dictCommission',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Комісії. Позиції',
        entityMask: 'hr_dictCommissionDt',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підтвердження ПДВ',
        entityMask: 'ac_dictConfirmVAT',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Спеціальний режим оподаткування ПДВ',
        entityMask: 'ac_dictSpecRegimVat',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'ДКПП',
        entityMask: 'ac_dictDKPP',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Територіальні органи ДКСУ',
        entityMask: 'ac_dictDksu',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      { description: 'Атрибути рахунків форм', entityMask: 'ac_dictEntityAttr', methodMask: ['select'] },
      {
        description: 'Курси валют',
        entityMask: 'ac_dictExchangeRate',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'getExchangeRateFromNBU']
      },
      {
        description: 'Групи НА',
        entityMask: 'ac_dictGroupAssets',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Одиниці виміру',
        entityMask: 'ac_dictMeasure',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вид Номенклатури',
        entityMask: 'ac_dictNomenclKind',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Види продукції, робіт та послуг',
        entityMask: 'ac_dictProductType',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Тип причини невидачі ПН',
        entityMask: 'ac_dictReasonTypeTax',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Регламентні звіти',
        entityMask: 'ac_dictRep',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Регламентні звіти. Додатки',
        entityMask: 'ac_dictRepDt',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Налагодження розрахунків регламентного звіту',
        entityMask: 'ac_dictRepSettingCalc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Термін подання',
        entityMask: 'ac_dictRepPeriod',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Періоди в звітах',
        entityMask: 'ac_dictRepType',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Версія регламентного звіту',
        entityMask: 'ac_dictRepVersion',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Територіальні органи МДЗУ',
        entityMask: 'ac_dictSprSti',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Види податків та відрахувань',
        entityMask: 'ac_dictTax',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Податкові пільги',
        entityMask: 'ac_dictTaxCredit',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Статті податкових Декларацій',
        entityMask: 'ac_dictTaxDeclRows',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      { description: 'Ставки ПДВ', entityMask: 'ac_dictTaxRate', methodMask: ['select'] },
      {
        description: 'Типи ТО МДЗУ',
        entityMask: 'ac_dictTsti',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'УКТ ЗЕД',
        entityMask: 'ac_dictUKTZED',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Місця зберігання (склади)',
        entityMask: 'ac_dictWarehouse',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Місця зберігання (склади)',
        entityMask: 'ac_dictWarehouseType',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Додатки до документів',
        entityMask: 'ac_docAttachment',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Статті виробничих витрат',
        entityMask: 'ac_expenditureItem',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Налагодження фінансових результатів',
        entityMask: 'ac_dictFinResTune',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      { description: 'Рахунки виду операції', entityMask: 'ac_operationAccount', methodMask: ['select'] },
      {
        description: 'Розрахунковий рахунок організації',
        entityMask: 'ac_orgAccount',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Організації',
        entityMask: 'ac_organization',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Відповідальна особа',
        entityMask: 'ac_orgRespPerson',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },

      {
        description: 'Загальні налаштування',
        entityMask: 'ac_settings',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'search']
      },
      {
        description: 'Налаштування організації',
        entityMask: 'ac_settingsOrg',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'search']
      },
      {
        description: 'Налаштування користувача',
        entityMask: 'ac_settingsEmp',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'search']
      },
      {
        description: 'Місяці',
        entityMask: 'ac_dictMonth',
        methodMask: ['select']
      },
      {
        description: 'Періоди',
        entityMask: 'ac_dictPeriod',
        methodMask: ['select']
      },
      {
        description: 'КЕКВ',
        entityMask: 'ac_dictEc',
        methodMask: ['select']
      },
      { description: 'ubm_navshortcut', entityMask: 'ubm_navshortcut', methodMask: ['select'] },
      { description: 'AC', entityMask: 'ac_*', methodMask: ['*'] },
      { description: 'HR', entityMask: 'hr_*', methodMask: ['*'] },
      { description: 'SIA', entityMask: 'sia_*', methodMask: ['select'] },
      { description: 'TIM', entityMask: 'tim_*', methodMask: ['*'] },
      { description: 'ubm_form', entityMask: 'ubm_form*', methodMask: ['select'] },
      { description: 'ubs_message', entityMask: 'ubs_message*', methodMask: ['select'] },
      { description: 'org_diagram', entityMask: 'org_diagram*', methodMask: ['*'] }
    ]
  }
]
