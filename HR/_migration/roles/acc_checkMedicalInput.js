module.exports = [
  {
    name: 'acc_checkMedicalInput',
    description: 'Відповідальний за внесення результатів медогляду',
    description_uk: 'Відповідальний за внесення результатів медогляду',
    description_ru: 'Ответственный за внесение результатов медосмотра',
    description_az: 'Tibbi müayinənin nəticələrinin daxil edilməsinə cavabdehdir',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      'hr_dictCheckMedical',
      'accHREmp_dictCheckMedical',
      'hr_dictResultMedical',
      'accHREmp_dictResultMedical',
      'accHREmpDictionary',
      'accHREmpFolderDictAnother',
      'accHREmpFolderDictionary',

      'accHREmp_employee',
      'hr_employee',
      'accHREmp_employeeTabListCurrent',
      'hr_employeeTabListCurrent'
    ],
    elsRule: [
      {
        description: 'hr_dictCheckMedical',
        entityMask: 'hr_dictCheckMedical',
        methodMask: ['*']
      },
      {
        description: 'hr_empCheckMedical',
        entityMask: 'hr_empCheckMedical',
        methodMask: ['*']
      },
      {
        description: 'hr_dictResultMedical',
        entityMask: 'hr_dictResultMedical',
        methodMask: ['*']
      }
    ]
  }
]
