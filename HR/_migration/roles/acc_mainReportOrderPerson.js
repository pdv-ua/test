module.exports = [
  {
    name: 'acc_mainReportOrderPerson',
    description: 'Користувач звітів за Наказами з персоналу',
    description_uk: 'Користувач звітів за Наказами з персоналу',
    description_ru: 'Пользователь отчетов по Приказами по персоналу',
    description_az: 'Əməkdaşlar haqqında əmrlər üzrə hesabatların istifadəçisi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderStatReports',
      'hr_reportKsds',
      'hr_reportSetParam',
      'hr_reportAppoint'
    ],
    elsRule: [
      { description: 'Наказ про зміну штатного розпису', entityMask: 'hr_reportKsds', methodMask: ['selectWithVacCount'] },
      {
        description: 'Наказ з персоналу',
        entityMask: 'hr_empOrder',
        methodMask: ['select', 'getWorkDays', 'getWorkDays4Vac', 'saveReportSettings', 'fillOrderAccrual', 'setDateAndNumber',
          'docPrintForm', 'repPrintForm', 'isWorkDay', 'fillOrderExperience', 'clearOrder*', 'fillOrderAccrualWithSave',
          'exchangeReview', 'sendReview'
        ]
      },
      {
        description: 'hr_exportToXML',
        entityMask: 'hr_exportToXML',
        methodMask: [ 'export' ]
      }
    ]
  }
]
