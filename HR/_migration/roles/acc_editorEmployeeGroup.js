module.exports = [
  {
    name: 'acc_editorEmployeeGroup',
    description: 'Ведення груп працівників',
    description_uk: 'Ведення груп працівників',
    description_ru: 'Ведение групп работников',
    description_az: 'İşçi qruplarının idarə edilməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'accHREmp_employeeGroup',
      'accHREmp_empGroupFolder',
      'accHREmp_employeeMyGroup',
      'hr_employeeGroup'
    ],
    elsRule:
      [
        {
          description: 'Група (персонал)',
          entityMask: 'hr_employeeGroup',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Група (персонал) - учасники',
          entityMask: 'hr_employeeGroupDet',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        }
      ]
  }
]
