module.exports = [
  {
    name: 'acc_tarificationDictionary',
    description: 'Ведення довідників тарифікації',
    description_uk: 'Ведення довідників тарифікації',
    description_ru: 'Ведение справочников тарификации',
    description_en: 'Maintenance of tariff directories',
    description_az: 'Tarif üzrə mütəxəssis',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTariffing'],
    shortcutCodes: [
      // Довідники
      'accTariffing_dictListTarification',

      'accPay_AllDict',
      'hrPayDictionary',
      'hrPaySettings',

      'trf_tariffSheet',
      'hr_dictTarifCoeff',
      'trf_dictAccrual',
      'hr_dictSalaryRank',

      'ac_fundSourceList',
      'hr_dictStaffCat',
      'trf_dictPupil',
      'trf_dictQualification',
      'hr_dictEducationLevel',
      'hr_dictStaffSubCat',
      'hr_departmentSalary',
      'hr_dictPosition',
      'trf_dictPositionProps',
      'trf_dictSubject',
      'trf_dictEducationRank',
      'trf_workNorm',
      'trf_dictPart'
    ],
    elsRule: [
      {
        description: 'trf_tariffSheetDt',
        entityMask: 'trf_tariffSheetDt',
        methodMask: ['*']
      },
      {
        description: 'hr_employeeExperience',
        entityMask: 'hr_employeeExperience',
        methodMask: ['*']
      },
      {
        description: 'trf_document',
        entityMask: 'trf_document',
        methodMask: [ '*' ]
      },
      {
        description: 'trf_workPlace',
        entityMask: 'trf_workPlace',
        methodMask: [ '*' ]
      },
      {
        description: 'hr_dictPosition',
        entityMask: 'hr_dictPosition',
        methodMask: ['*']
      },
      {
        description: 'ac_fundSource',
        entityMask: 'ac_fundSource',
        methodMask: ['*']
      },
      {
        description: 'trf_dictPositionProps',
        entityMask: 'trf_dictPositionProps',
        methodMask: ['*']
      },
      {
        description: 'hr_departmentSalary',
        entityMask: 'hr_departmentSalary',
        methodMask: ['*']
      },
      {
        description: 'hr_dictTarifCoeff',
        entityMask: 'hr_dictTarifCoeff',
        methodMask: ['*']
      },
      {
        description: 'hr_dictStaffCat',
        entityMask: 'hr_dictStaffCat',
        methodMask: ['*']
      },
      {
        description: 'trf_dictPupil',
        entityMask: 'trf_dictPupil',
        methodMask: ['*']
      },
      {
        description: 'hr_dictSalaryRank',
        entityMask: 'hr_dictSalaryRank',
        methodMask: ['*']
      },
      {
        description: 'hr_dictStaffSubCat',
        entityMask: 'hr_dictStaffSubCat',
        methodMask: ['*']
      },
      {
        description: 'hr_dictEducationLevel',
        entityMask: 'hr_dictEducationLevel',
        methodMask: ['*']
      },
      {
        description: 'trf_dictEducationRank',
        entityMask: 'trf_dictEducationRank',
        methodMask: ['*']
      },
      {
        description: 'trf_workNorm',
        entityMask: 'trf_workNorm',
        methodMask: ['*']
      },
      {
        description: 'trf_dictPart',
        entityMask: 'trf_dictPart',
        methodMask: ['*']
      },
      {
        description: 'trf_dictQualification',
        entityMask: 'trf_dictQualification',
        methodMask: ['*']
      },
      {
        description: 'trf_dictSubject',
        entityMask: 'trf_dictSubject',
        methodMask: ['*']
      },
      {
        description: 'trf_position',
        entityMask: 'trf_position',
        methodMask: [ '*' ]
      },
      {
        description: 'trf_constructorReports',
        entityMask: 'trf_constructorReports',
        methodMask: [ '*' ]
      },
      {
        description: 'trf_constructorReportsSetting',
        entityMask: 'trf_constructorReportsSetting',
        methodMask: [ '*' ]
      },
      {
        description: 'Довідники',
        entityMask: 'hr_service',
        methodMask: ['*']
      },
      {
        description: 'trf_dictAccrual',
        entityMask: 'trf_dictAccrual',
        methodMask: ['*']
      },
      {
        description: 'trf_tariffSheet',
        entityMask: 'trf_tariffSheet',
        methodMask: [ '*' ]
      },
      {
        description: 'trf_annexMemorialOrder',
        entityMask: 'trf_annexMemorialOrder',
        methodMask: [ '*' ]
      },
      {
        description: 'trf_salaryCosts',
        entityMask: 'trf_salaryCosts',
        methodMask: [ '*' ]
      },
      {
        description: 'trf_consolidatedStatementDeductions',
        entityMask: 'trf_consolidatedStatementDeductions',
        methodMask: ['*']
      },
      {
        description: 'trf_consolidatedStatementDictProgClass',
        entityMask: 'trf_consolidatedStatementDictProgClass',
        methodMask: ['*']
      },
      {
        description: 'trf_consolidatedStatementDepartment',
        entityMask: 'trf_consolidatedStatementDepartment',
        methodMask: ['*']
      }
    ]
  }
]
