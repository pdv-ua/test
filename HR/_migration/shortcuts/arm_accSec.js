/* global AC appAC $App */
module.exports = [
  {
    desktopCode: 'arm_accSec',
    code: 'accSec_FolderAccessRequestAll',
    isFolder: 1,
    caption: 'Заявки на надання доступу (опрацювання)',
    caption_uk: 'Заявки на надання доступу (опрацювання)',
    caption_ru: 'Заявки на предоставление доступа (обработка)',
    caption_az: 'Giriş istəkləri (işlənir)',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-cloud-download',
    displayOrder: 100,
    items: [
      {
        desktopCode: 'arm_accSec',
        code: 'accSec_AccessRequestONRECONCILATION',
        parentCode: 'accSec_FolderAccessRequestAll',
        isFolder: 0,
        caption: 'На погодженні',
        caption_uk: 'На погодженні',
        caption_ru: 'На согласовании',
        caption_az: 'Təsdiqdə',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}` },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}` }

            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'ONRECONCILATION'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 400
      },
      {
        desktopCode: 'arm_accSec',
        code: 'accSec_AccessRequestRECONCILED',
        parentCode: 'accSec_FolderAccessRequestAll',
        isFolder: 0,
        caption: 'Прийняті ',
        caption_uk: 'Прийняті',
        caption_ru: 'Принятые',
        caption_az: 'Qəbul edildi',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}` },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}` },
              { name: 'processingDate' },
              { name: 'processEmployeeNumID.description', description: `{{UB.i18n('Обробив')}}` }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'RECONCILED'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 500
      },
      {
        desktopCode: 'arm_accSec',
        code: 'accSec_AccessRequestCANCELED',
        parentCode: 'accSec_FolderAccessRequestAll',
        isFolder: 0,
        caption: 'Відхилені заявки',
        caption_uk: 'Відхилені заявки',
        caption_ru: 'Отклоненные заявки',
        caption_az: 'Rədd edilmiş tətbiqlər',
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'hr_accessRequest',
            method: 'select',
            fieldList: [
              { name: 'docNum' },
              { name: 'docDate' },
              { name: 'employeeNumberID.description', description: `{{UB.i18n('Працівник')}}` },
              { name: 'organizationID.description', description: `{{UB.i18n('Організація')}}` },
              { name: 'respEmployeeNumID.description', description: `{{UB.i18n('Уповноважений')}}` },
              { name: 'processingDate' },
              { name: 'processEmployeeNumID.description', description: `{{UB.i18n('Обробив')}}` },
              { name: 'cancelReason' }
            ],
            whereList: {
              requestState: {
                expression: '[requestState]',
                condition: 'equal',
                value: 'CANCELED'
              }
            },
            orderList: { docDate: { expression: 'docDate', order: 'asc' } }
          }]
        },
        cmpInitConfig: {
          disableAutoLoadStore: true,
          hideActions: ['showDetail', 'addNewByCurrent', 'addNew', 'del'],
          afterInit: function () {
            AC.viewUtils.setWhereListProperty(this, [
              ['organizationID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
              ['organizationID.mi_dateTo', '>=', appAC.globalApplicationDate()],
              ['organizationID.mi_deleteDate', '>=', '#maxdate'],
              ['organizationID.state', '=', 'ACTIVE']
            ])
          }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: '',
        displayOrder: 600
      }
    ]
  },
  {
    desktopCode: 'arm_accSec',
    code: 'acc_folder_users',
    isFolder: 1,
    caption: 'Користувачі',
    caption_uk: 'Користувачі',
    caption_ru: 'Пользователи',
    caption_az: 'İstifadəçilər',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fa fa-user',
    displayOrder: 200,
    items: [
      {
        desktopCode: 'arm_accSec',
        parentCode: 'acc_folder_users',
        code: 'accSec_ubaUser',
        isFolder: 0,
        caption: 'Список користувачів',
        caption_uk: 'Список користувачів',
        caption_ru: 'Список пользователей',
        caption_az: 'istifadəçilər siyahısı',
        cmdType: 'showList',
        cmdData: {
          'params': [
            {
              'entity': 'uba_user',
              'method': 'select',
              'fieldList': [
                'disabled',
                'isPending',
                'name',
                'firstName',
                'lastName'
              ]
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-user',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'acc_folder_users',
        code: 'accSec_userWithoutEmployee',
        isFolder: 0,
        caption: 'Список користувачів без призначення',
        caption_uk: 'Список користувачів без призначення',
        caption_ru: 'Список пользователей без назначения',
        caption_az: 'Tapşırığı olmayan istifadəçilərin siyahısı',
        cmdCode: {
          cmdType: 'showForm',
          formCode: function () { $App.runShortcutCommand('hr_userWithoutEmployee') }
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-user-minus',
        displayOrder: 15
      },
      /* {
        desktopCode: 'arm_accSec',
        parentCode: 'acc_folder_users',
        code: 'accSec_uba_advSecurity',
        isFolder: 0,
        caption: 'Додаткова безпека',
        caption_uk: 'Додаткова безпека',
        caption_ru: 'Дополнительная безопасность',
        caption_az: 'Əlavə təhlükəsizlik',
        cmdType: 'showList',
        cmdData: {
          'params': [
            {
              'entity': 'uba_advSecurity',
              'method': 'select',
              'fieldList': '*'
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-user-secret',
        displayOrder: 20
      }, */
      {
        desktopCode: 'arm_accSec',
        parentCode: 'acc_folder_users',
        code: 'accSec_uba_userrole',
        isFolder: 0,
        caption: 'Ролі користувачів',
        caption_uk: 'Ролі користувачів',
        caption_ru: 'Роли пользователей',
        caption_az: 'İstifadəçi rolları',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_userrole',
              'method': 'select',
              'fieldList': [
                'userID',
                'roleID'
              ]
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-user-secret',
        displayOrder: 25
      },

      {
        desktopCode: 'arm_accSec',
        parentCode: 'acc_folder_users',
        code: 'accSec_uba_usergroup',
        isFolder: 0,
        caption: 'Групи ролей користувачів',
        caption_uk: 'Групи ролей  користувачів',
        caption_ru: 'Группы ролей пользователей',
        caption_az: 'İstifadəçi rolları qrupları',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_usergroup',
              'method': 'select',
              'fieldList': [
                'userID',
                'groupID'
              ]
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-group',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'acc_folder_users',
        code: 'accSec_uba_usercertificate',
        isFolder: 0,
        caption: 'Сертифікати',
        caption_uk: 'Сертифікати',
        caption_ru: 'Сертификаты',
        caption_az: 'Sertifikatlar',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_usercertificate',
              'method': 'select',
              'fieldList': [
                'userID',
                'issuer_cn',
                'serial',
                'disabled',
                'revoked'
              ]
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-key',
        displayOrder: 40
      }
    ]
  },
  {
    desktopCode: 'arm_accSec',
    code: 'accSec_FolderAuditTrail',
    isFolder: 1,
    caption: 'Безпека',
    caption_uk: 'Безпека',
    caption_ru: 'Безопасность',
    caption_az: 'Təhlükəsizlik',
    inWindow: 0,
    isCollapsed: 0,
    iconCls: 'fas fa-user-secret',
    displayOrder: 300,
    items: [
      {
        desktopCode: 'arm_accSec',
        parentCode: 'accSec_FolderAuditTrail',
        code: 'accSec_uba_role',
        isFolder: 0,
        caption: 'Системні ролі',
        caption_uk: 'Системні ролі',
        caption_ru: 'Системные роли',
        caption_az: 'Sistem rolları',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_role',
              'method': 'select',
              'fieldList': '*'
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-user-secret',
        displayOrder: 10
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'accSec_FolderAuditTrail',
        code: 'accSec_uba_group',
        isFolder: 0,
        caption: 'Групи ролей',
        caption_ua: 'Групи ролей',
        caption_ru: 'Группы ролей',
        caption_az: 'Rol qrupları',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_group',
              'method': 'select',
              'fieldList': [
                'name',
                'description',
                'code'
              ]
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fa fa-group',
        displayOrder: 20
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'accSec_FolderAuditTrail',
        code: 'accSec_uba_els',
        isFolder: 0,
        caption: 'Права на методи (ELS)',
        caption_uk: 'Права на методи (ELS)',
        caption_ru: 'Права на методы (ELS)',
        caption_az: 'Metod hüquqları (ELS)',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_els',
              'method': 'select',
              'fieldList': ['code', 'description', 'disabled', 'entityMask', 'methodMask', 'ruleType', 'ruleRole']
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-external-link-alt',
        displayOrder: 30
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'accSec_FolderAuditTrail',
        code: 'accSec_uba_als',
        isFolder: 0,
        caption: 'Права на атрибути (ALS)',
        caption_uk: 'Права на атрибути (ALS)',
        caption_ru: 'Права на атрибуты (ALS)',
        caption_az: 'Atribut hüquqları (ALS)',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_als',
              'method': 'select',
              'fieldList': '*'
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-external-link-square-alt',
        displayOrder: 40
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'accSec_FolderAuditTrail',
        code: 'accSec_uba_audit',
        isFolder: 0,
        caption: 'Аудит безпеки',
        caption_uk: 'Аудит безпеки',
        caption_ru: 'Аудит безопасности',
        caption_az: 'Təhlükəsizlik yoxlaması',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_audit',
              'method': 'select',
              'fieldList': [
                'entity',
                'entityinfo_id',
                'actionType',
                'actionUser',
                'actionTime',
                'remoteIP',
                'targetUser',
                'targetGroup',
                'targetRole'
              ]
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'u-icon-person-success',
        displayOrder: 50
      },
      {
        desktopCode: 'arm_accSec',
        parentCode: 'accSec_FolderAuditTrail',
        code: 'accSec_uba_auditTrail',
        isFolder: 0,
        caption: 'Аудит',
        caption_uk: 'Аудит',
        caption_ru: 'Аудит',
        caption_az: 'Audit',
        cmdType: 'showList',
        cmdData: {
          params: [
            {
              'entity': 'uba_auditTrail',
              'method': 'select',
              'fieldList': '*'
            }
          ]
        },
        inWindow: 0,
        isCollapsed: 0,
        iconCls: 'fas fa-file-contract',
        displayOrder: 60
      }
    ]
  }
]
