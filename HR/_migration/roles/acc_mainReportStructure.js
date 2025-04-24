module.exports = [
  {
    name: 'acc_mainReportStructure',
    description: 'Користувач звітів «Оргструктура» та «Штатний розпис»',
    description_uk: 'Користувач звітів «Оргструктура» та «Штатний розпис»',
    description_ru: 'Пользователь отчетов «Оргструктура» и «Штатное расписание»',
    description_az: '«Təşkilati struktur» və «Ştat cədvəli» hesabatlarının istifadəçisi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderOrgstructReports',
      'reportsOrgstruct',
      'hr_reportOrgplan',
      'hr_reportOrgcountsByCateg',
      'hr_reportVacanciesList',
      'hr_reportOrgcounts',
      'hr_reportOrgstruct',
      'hr_reportOrgpos',
      'hr_reportTypicalOrgPlan',
      'hr_reportDepEvents',
      // 'hr_reportOrgstructInfo',
      'hr_reportOrgposCount',
      'hr_reportOrgposExpanded',
      'hr_reportEmpCountPositionByCategory',
      'hr_reportTypicalOrgPlanByPayGroup',
      'hr_reportTariffing2',
      'hr_reportOrgstructConsolidated',
      'hr_reportOrgstructConsolidatedAccrual',
      'hr_reportAboutStaffing',
      'hr_reportPositionByType',
      'hr_orgstructConsolidatedMilitary',
      'hr_reportOrgstructWithAccrual',
      'hr_organizationAddresses'
    ],
    elsRule: [
      {
        description: 'Звіти за Оргструктурою',
        entityMask: 'hr_reportOrgcountsByCateg',
        methodMask: ['getGrouppedByParentUnitAndCategData', 'selectEmpPosData', 'getGrouppedByParentUnitData']
      },
      {
        description: 'hr_positionFunds',
        entityMask: 'hr_positionFunds',
        methodMask: ['getStringData']
      },
      {
        description: 'Звіти за Оргструктурою',
        entityMask: 'hr_reportOrgstructInfo',
        methodMask: ['getData']
      },
      {
        description: 'Звіти. Тарифікація',
        entityMask: 'hr_tariffing',
        methodMask: ['getReportDataFact']
      },
      {
        description: 'Звіти за Оргструктурою в Excel',
        entityMask: 'hr_report',
        methodMask: ['runTypicalOrgPlanByPay', 'runTariffing', 'runTypicalOrgPlanByPayGrp', 'getAvgListEmpCount', 'getAvgListEmpCount', 'getListEmpCount']
      }
    ]
  }
]
