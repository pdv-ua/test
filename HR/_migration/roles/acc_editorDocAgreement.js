module.exports = [
  {
    name: 'acc_editorDocAgreement',
    description: 'Редагування документу під час погодження',
    description_uk: 'Редагування документу під час погодження',
    description_ru: 'Редактирование документа при согласовании',
    description_az: 'Təsdiq zamanı sənədin redaktə edilməsi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    elsRule: [
      {
        description: 'hr_empOrder',
        entityMask: 'hr_empOrder',
        methodMask: ['canEditOnReconciliation', 'editOnReconciliation', 'exchangeReview', 'sendReview', 'addStampData', 'getDocumentWithStampData']
      },
      {
        description: 'ac_service',
        entityMask: 'ac_service',
        methodMask: ['userIsMemberOf']
      }
    ]
  }
]
