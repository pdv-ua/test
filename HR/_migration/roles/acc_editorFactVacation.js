module.exports = [
  {
    name: 'acc_editorFactVacation',
    description: 'Ручне редагування використаних днів в праві на відпустку',
    description_uk: 'Ручне редагування використаних днів в праві на відпустку',
    description_ru: 'Ручное редактирование использованных дней в праве на отпуск',
    description_az: 'Məzuniyyət hüququnda istifadə olunan günlərin əl ilə redaktəsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmp_employeeTabList',
      'hr_employeeTabList',
      'accHREmp_employeeTabListCurrent',
      'hr_employeeTabListCurrent'
    ],
    elsRule: [
      {
        description: 'Ручне коригування днів використання відпустки',
        entityMask: 'hr_empVacationPeriod',
        methodMask: ['*']
      },
      {
        description: 'hr_empVacationPlan',
        entityMask: 'hr_empVacationPlan',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'checkVacKindExists']
      },
      {
        description: 'Ручне коригування днів використання відпустки',
        entityMask: 'hr_empOrderVacationListDet',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete', 'checkImpartibleVac']
      }
    ]
  }
]
