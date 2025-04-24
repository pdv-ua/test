module.exports = [
  {
    entity: 'hr_dictReportParam',
    identifier: ['dictReportID', 'reportCode'],
    attrsConfig: {
      dictReportID: { associatedEntity: 'hr_dictReport', codeAttr: 'code' }
    },
    attrs: ['dictReportID', 'reportCode'],
    items: [
      [ 'hr_accrual-timeCost', 'ReportTimeCost' ],
      [ 'hr_empListByLongVacation', 'ReportSheetTimeCost' ]
    ]
  }
]
