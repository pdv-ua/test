const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_admSecurity',
  description: 'Адміністратор безпеки',
  description_uk: 'Адміністратор безпеки',
  description_ru: 'Администратор безопасности',
  description_az: 'Təhlükəsizlik administratoru',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accSec'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm', 'doSend', 'doAccept', 'doReject', 'search', 'setpassword',
    'getRegnumCounter', 'getCertificate', 'docPrintForm', 'repPrintForm', 'updateGroupRole', 'copyRecord', 'updateDt']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    {
      adm_folder_security: [
        ['uba_els', ['0-4', 'uba_els']],
        ['uba_als', ['0-4', 'uba_als']],
        ['uba_otp', ['0-4', 'Одноразові паролі']],
        ['uba_audit-securityDashboard']
      ],
      adm_folder_misc: ['ubs_settings', 'ubs_filter', 'ubs_numcounter', 'ubs_numcounterreserv', 'ubs_softLock', 'ubs_globalCache', 'ubs_message'],
      adm_folder_UI: ['ubm_enum', 'ubm_desktop', 'ubm_navshortcut', 'ubm_diagram', 'ubm_form', 'ubs_report'],
      adm_folder_UBQ: ['ubq_scheduler', 'ubq_messages', 'ubq_runstat'],
      acc_folder_users: [
        ['uba_user', 'accSec_ubaUser', 'hr_userWithoutEmployee', 'accSec_userWithoutEmployee', ['0-4,17', 'Користувачі']],

        ['uba_userrole', 'accSec_uba_userrole', ['0-4', 'userRole']],

        ['uba_usergroup', 'accSec_uba_usergroup', ['0-4', 'uba_usergroup']],
        ['uba_usercertificate', 'accSec_uba_usercertificate', ['1-4,12', 'Сертифікати']]
      ],
      accSec_FolderAccessRequestAll: ['accSec_AccessRequestONRECONCILATION', 'accSec_AccessRequestRECONCILED', 'accSec_AccessRequestCANCELED'],
      accSec_FolderAuditTrail: [
        ['uba_role', 'accSec_uba_role', ['0-4', 'Ролі', 'uba_role']],
        ['uba_group', 'accSec_uba_group', ['1-4,15-16', 'Групи користувачів']],
        ['accSec_uba_els'],
        ['accSec_uba_als'],
        ['uba_auditTrail', 'accSec_uba_auditTrail', ['0-4', 'Аудит']],
        ['uba_audit', 'accSec_uba_audit', ['0-4', 'Аудит безпеки']]
      ]
    },
    ['adm_logView'],
    ['adm_folder_users'],
    ['ac_user'],
    ['hr_user', 'accAdmHRUser'],
    ['',
      ['0,3,6-8', 'Заявка на надання доступу', 'hr_accessRequest'],
      ['0-4,9', 'Нумерація документів', 'ac_counter'],
      ['0-4,10', 'Доступ до VPN', 'hr_vpninfo'],
      ['0-4', 'Організації користувача', 'ac_userOrganization'],
      ['0-4', 'uba_grouprole', 'uba_grouprole'],
      ['1-4,11', 'Лічильник реєстраційних ключів', 'ubs_numcounter'],
      ['0-4', 'Перераховані значення', 'ubm_enum'],
      ['0-4', 'Робочий стіл', 'ubm_desktop'],
      ['0-4', 'Ярлик', 'ubm_navshortcut'],
      ['0-4', 'Діаграми сутностей', 'ubm_diagram'],
      ['0-4', 'Визначення інтерфейсних форм', 'ubm_form'],
      ['0-4', 'Шаблони звітів', 'ubs_report'],
      ['0-4', 'Песимістичні блокування', 'ubs_softLock'],
      ['0-4', 'Зарезервовані лічильники реєстраційних ключів', 'ubs_numcounterreserv'],
      ['0', 'Server-side global cache', 'ubs_globalCache'],
      ['0-4', 'Повідомлення', 'ubs_message_edit'],
      ['0', 'Планувальники задач', 'ubq_scheduler'],
      ['0-4', 'Черга', 'ubq_messages'],
      ['0-4', 'Статистика', 'ubq_runstat'],
      ['0-4', 'uba_subject', 'uba_subject'],
      ['0,13-14', 'Особа', 'hr_employee']
    ]
  ]
}
