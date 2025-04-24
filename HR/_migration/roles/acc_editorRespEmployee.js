const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorRespEmployee',
    description: 'Ведення відповідальних по організації',
    description_uk: 'Ведення відповідальних по організації',
    description_ru: 'Ведение ответственных по организации',
    description_az: 'Təşkilat üzrə məsul şəxslərin siyahısının idarə edilməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderDictionary',
      'accStaffDictionary',
      'hr_orgRespPosition',
      'accStaff_dictRespEmployee'
    ],
    elsRule: [
      {
        description: 'Довідник "Відповідальні особи організації"',
        entityMask: 'hr_orgRespPosition',
        methodMask: [...crud]
      }
    ]
  }
]
