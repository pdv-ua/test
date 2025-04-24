module.exports = [
  {
    entity: 'ac_settingsOrgTemplate',
    identifier: ['constantID'],
    notUpdate: true,
    notDelete: true,
    attrsConfig: {
      constantID: { associatedEntity: 'ac_constant', codeAttr: 'code' }
    },
    attrs: ['constantID', 'value'],
    items: [
      ['allowDelBusyPositions', '1'],
      ['needSignedStatement', '1'],
      ['employeePayrollTemplates', '0'],
      ['manualAccessStaffRequest', '1'],
      ['useCEP', '0'],
      ['hrResponsAbbr', 'В.о.'],
      ['hrFuncOrgType', '1'],
      ['hrDefaultPositionType', '12'],
      ['hrRoundAccrualStaffTable', '3'],
      ['hrStaffUnitQuantityRound', '3'],
      ['hrStaffTableDisallowLinkToPos', 1],
      ['hrEmpOrderVacationValidator', 1],
      ['hrOrderSetAccrualByPosition', 1],
      ['hrOrderAccrualByStaffTable', '0'],
      ['hrEmpOrderMoveAbsentArticle', '0'],
      ['hrEmpOrderMoveRank', '0'],
      ['hrTotalsOnlyIndepStructUnit', '0'],
      ['hrIgnoreDoublePosNameCases', '0'],
      ['hrEmpVacationSchedulerPrevYears', '1'],
      ['hrEmpVacationSchedulerWeeksToEnd', '2'],
      ['hrCheckNoPublServ', '1'],
      ['hrAutoSetDepIdxNum', '0'],
      ['hrOrderBonusRoundSum', 1]
    ]
  }
]
