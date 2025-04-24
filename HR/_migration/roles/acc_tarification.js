module.exports = [
  {
    name: 'acc_tarification',
    description: 'Фахівець з тарифікації',
    description_uk: 'Фахівець з тарифікації',
    description_ru: 'Специалист по тарификации',
    description_en: 'Tarification specialist',
    description_az: 'Tarif üzrə mütəxəssis',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTariffing'],
    shortcutCodes: [
      'accTariffing_document',
      'trf_documentList',
      'accTariffingReportAll',
      'accTariffing_employeeNumberList',
      'trf_employeeNumberList',

      // Звіти
      'trf_reports',
      'trf_regReportParamsCfg',
      'trf_allReportsCfg',
      'trf_reportParamsList',
      'wholeSchoolIndicators',
      'regSummaryStatementRates',
      'regStatement',
      'reportList',
      'regReportListOneColum',
      'regReportsItemEmployees',
      'saSalary_reportRLMonthEdu',
      'saSalary_consolidatedStatementDeductions',
      'saSalary_consolidatedStatementDictProgClass',
      'saSalary_consolidatedStatementDepartment',
      // Звіт Додаток до меморіального ордеру №5 (освіта), розміщений в заробітня плата/консолідовані звіти
      'accSalary_annexMemorialOrder',
      'accSalary_payrollEducation',
      // Зведена відомість фактичних витрат на заробітну плату працівникам освіти, розміщений в заробітня плата/консолідовані звіти
      'accSalary_summaryActualCosts',
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
      'trf_dictPart',
      'regReportsTimesheet',
      'reportsTimesheetTechnicalStaff'
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
        methodMask: ['select']
      },
      {
        description: 'ac_fundSource',
        entityMask: 'ac_fundSource',
        methodMask: ['select']
      },
      {
        description: 'trf_dictPositionProps',
        entityMask: 'trf_dictPositionProps',
        methodMask: ['select']
      },
      {
        description: 'hr_departmentSalary',
        entityMask: 'hr_departmentSalary',
        methodMask: ['select']
      },
      {
        description: 'hr_dictTarifCoeff',
        entityMask: 'hr_dictTarifCoeff',
        methodMask: ['select']
      },
      {
        description: 'hr_dictStaffCat',
        entityMask: 'hr_dictStaffCat',
        methodMask: ['select']
      },
      {
        description: 'trf_dictPupil',
        entityMask: 'trf_dictPupil',
        methodMask: ['select']
      },
      {
        description: 'hr_dictSalaryRank',
        entityMask: 'hr_dictSalaryRank',
        methodMask: ['select']
      },
      {
        description: 'hr_dictStaffSubCat',
        entityMask: 'hr_dictStaffSubCat',
        methodMask: ['select']
      },
      {
        description: 'hr_dictEducationLevel',
        entityMask: 'hr_dictEducationLevel',
        methodMask: ['select']
      },
      {
        description: 'trf_dictEducationRank',
        entityMask: 'trf_dictEducationRank',
        methodMask: ['select']
      },
      {
        description: 'trf_workNorm',
        entityMask: 'trf_workNorm',
        methodMask: ['select']
      },
      {
        description: 'trf_dictPart',
        entityMask: 'trf_dictPart',
        methodMask: ['select']
      },
      {
        description: 'trf_dictQualification',
        entityMask: 'trf_dictQualification',
        methodMask: ['select']
      },
      {
        description: 'trf_dictSubject',
        entityMask: 'trf_dictSubject',
        methodMask: ['select']
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
        methodMask: ['select']
      },
      {
        description: 'trf_dictAccrual',
        entityMask: 'trf_dictAccrual',
        methodMask: ['select']
      },
      {
        description: 'trf_tariffSheet',
        entityMask: 'trf_tariffSheet',
        methodMask: [ 'select' ]
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
      },
      {
        description: 'hr_accrualReport',
        entityMask: 'hr_accrualReport',
        methodMask: ['getRLMonthDataEdu']
      },
      {
        description: 'hr_accrual-rlMonthEdu',
        entityMask: 'hr_accrual-rlMonthEdu',
        methodMask: ['*']
      }
    ]
  }
]
