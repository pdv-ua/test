const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_hr',
  description: 'Персонал',
  description_uk: 'Персонал',
  description_ru: 'Персонал',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHR', 'arm_accHREmp', 'arm_accHREmpAdd', 'arm_accStaff', 'arm_accOperation',
    'arm_accHRCarier', 'arm_accSec', 'arm_accDoc'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  let methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'getRegnumCounter',
    'lock', 'unlock', 'getConfig', 'getExchangeRateFromNBU', 'search', '*', // 11
    'userIsMemberOf']
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    ['accOperationDocument', 'accOperationDictionary', 'accOperationConfiguration', 'hr_dictPeriod', 'hr_method',
      'ac_constant', 'ac_counter', 'ac_profession', 'ac_settings', 'hr_dictSalaryRank', 'hr_dictTypeTaxECB',
      'hr_empVacationScheduleList', 'hr_empVacationScheduleListYear'], // Всі функції підсистеми
    ['accStaffFolderOrgstructReports', 'reportsOrgstruct', 'hr_reportOrgstruct', 'hr_reportOrgpos', 'hr_reportOrgcounts',
      'hr_reportOrgstructConsolidated', 'hr_reportOrgstructConsolidatedAccrual', 'hr_report_averageStatistics', 'hr_reportForm31e',
      'hr_reportAboutStaffing', 'hr_reportPositionByType', 'hr_orgstructConsolidatedMilitary', 'hr_reportOrgstructWithAccrual',
      'hr_reportOrgplan', 'hr_reportOrgcountsByCateg' /*, 'hr_reportOrgstructInfo' */, 'hr_reportVacanciesList', 'hr_reportTariffing2',
      'reportsStat', 'hr_reportKsds', 'hr_reportSetParam', 'hr_reportOrgposExpanded', 'hr_reportEmpCountPositionByCategory',
      'hr_organizationAddresses'],
    ['accHREmpFolderList', 'hr_empListBirth', 'hr_empListByAge', 'hr_empListAppointed', 'hr_empListMoved',
      'hr_empListDism', 'hr_empListRank', 'hr_empListAlphabet', 'hr_empListByChilds',
      'hr_empListMission', 'hr_empListOverNorm', 'hr_empListActiveVacation', 'hr_empListProfEducation',
      'hr_empListBonus', 'hr_reportAppoint', 'hr_empListWithPenalty', 'hr_empListEducation', 'hr_empListExpAllowanceOrder',
      'hr_empListEmpExperience', 'hr_empListCustom', 'hr_empListCertificationAcc', 'hr_empListWarFare', 'hr_empListCheckMedical',
      'hr_empListUnpaidLongVac', 'hr_empListUnpaidVac', 'hr_empListIllnessAbsent', 'hr_empListPayAvg2MonthAbsent', 'hr_empListByExperience', 'hr_reportMilitaryRecruiters', 'hr_empListChangeCredentials'],
    ['saSalary_empListTaxLimit', 'saSalary_empListSickLimit', 'accSalary_memorialOrder5', 'accSalary_memorialOrder5PayEl',
      'saSalary_reportGreaterMaxECB', 'saSalary_reportAddCostsECB', 'saSalary_reportDeducTax', 'saSalary_reportDeducMilitaryTax',
      'saSalary_reportRL', 'saSalary_reportRLMonth',
      'saSalary_reportInfoCard',
      // 'reportsItemEmployees',
      'accSalary_reportConsolAccDeduc', 'accSalary_annexMemorialOrder', 'accSalary_summaryActualCosts', 'saSalary_consolidatedStatementDeductions', 'saSalary_consolidatedStatementDictProgClass',
      'saSalary_consolidatedStatementDepartment', 'accSalary_accrualReportByLongVacation', 'accSalary_payrollEducation'],
    ['reportsEmployee', 'hr_reportEmpListHarmful', 'hr_reportEmpListMilitary', 'hr_reportEmpListDisability',
      'hr_reportEmpListChernobylVictims', 'hr_reportEmpListEvaluation', 'hr_reportEmpListForYearEval',
      'hr_reportEmpListChornobCompens', 'hr_reportEmpListAlphabet', 'hr_empListJobRequirements', 'hr_empListByDisability'],
    ['hr_regReportSalaryCfg', 'hr_regReportSalaryRun', 'hr_regReportSalary', 'hr_dictRepSalary', 'hr_salaryReportList',
      'hr_regReportSalary1DF', 'hr_regReportSalaryESV4', 'hr_regReportSalary1PVM', 'hr_regReportSalary1PVK', 'hr_regReportSalaryB',
      'hr_regReportSalaryFSS', 'hr_allReportSalaryCfg', 'saSalaryReportsAll', 'hr_reportTypicalOrgPlan', 'hr_reportTypicalOrgPlanByPay',
      'hr_reportempListEvents', 'accHREmpAdd_CompetitionReport', 'hr_vacanciesCompetitionList', 'hr_reportDepEvents', 'accSalary_posGroup',
      'saSalary_reportListDebtEmployees', 'saSalary_reportListAppointDismissEmployees', 'reportsEmpListByOrder', 'reportsEmpListByNonAttendance', 'hr_reportTariffing', 'hr_reportEmpAccrualList',
      'hr_reportTypicalOrgPlanByPayGroup', 'hr_reportForm1k', 'hr_reportForm1k_v2', 'hr_regReportSalaryPF'
    ], // Регламентована звітність
    ['hr_searchEmployee', 'hr_searchPerson', 'accHREmpSearch', 'accHREmp_empSearch', 'accHREmp_personSearch', 'hr_searchPosition', 'accHREmp_positionSearch'],
    ['accVacation_VacationScheduleReport', 'hr_empOrderVacationapschedAdd', 'hr_reportVacationExtract'],
    ['hr_staffTreeValid', 'accStaff_staffValid'],
    ['hr_diagram', 'accStaff_diagram'],
    ['hr_department', 'accStaff_department'],
    ['hr_position', 'accStaff_position'],
    // ['hr_position_vac', 'accStaff_position_vac'],
    ['hr_positionVacContest', 'accStaff_positionVacContest'],
    ['hr_empPosLiquidate', 'accStaff_empPosLiquidate'],
    ['hr_empOrderAllA', 'accHR_empOrderAllA'],
    ['hr_employee', 'accHREmp_employee'],
    ['hr_employeeTabList', 'hr_employeeTabListCurrent', 'hr_employeeNumberList', 'hr_employeePositionList', 'accHREmp_employeeTabList',
      'accHREmp_employeeTabListCurrent', 'accHREmp_employeePositionList', 'accHREmp_employeeTabListNoStaff'],
    ['hr_empListAudit', 'accHREmpAdd_empListAudit'],
    ['hr_empListPosition', 'accHRCarierListPosition'],
    ['hr_requestForStuff', 'accHREmpAddRequestForStuff'],
    ['hr_requestStuffMotion', 'accHREmpRequestStuffMotion'],
    ['accHRFolderStatReports'],
    ['ac_fundSourceList'],
    {
      accStaffFolderOrder: [
        ['hr_empOrderStaffList', 'accHR_empOrderStaffList'],
        ['hr_staffTable', 'accHR_staffTable'],
        ['hr_empOrderChgsalaryA', 'accHR_empOrderChgsalaryA']
      ],
      accDocFolderStaffOrder: [
        ['hr_taskMyStaffTableA', 'accDoc_taskMyStaffTableA'],
        ['hr_taskMyStaffTableClosedA', 'accDoc_taskMyStaffTableClosedA'],
        ['hr_staffTableRejectedA', 'accDoc_staffTableRejectedA'],
        ['hr_staffTableRejectedMyA', 'accDoc_staffTableRejectedMyA'],
        ['hr_staffTableOnCompletionA', 'accDoc_staffTableOnCompletionA'],
        ['hr_staffTableOnCompletionMyA', 'accDoc_staffTableOnCompletionMyA'],
        ['hr_staffTableOtherOrgA', 'accDoc_staffTableOtherOrgA'],
        ['hr_staffTableAll', 'accHR_staffTableAll'],
        ['hr_staffTableYear', 'accHR_staffTableYear']
      ],
      accStaffFolderOrgStruc: [
        ['hr_staffTableOrgStructure', 'accHR_staffTableOrgStructure'],
        ['hr_empOrderOrgStructure', 'accHR_empOrderOrgStructure']
      ],
      accStaffFolderOrg: ['hr_staffTreeOrg', 'accStaff_staffOrg'],
      accStaffFolderDictionary: [
        ['hr_dictTariffGroup', 'accStaff_dictTariffGroup'],
        ['hr_dictGovernmType', 'accStaff_dictGovernmType'],
        ['hr_dictPosition', 'accStaff_dictPosition'],
        ['hr_dictProfession', 'accStaff_dictProfession'],
        ['hr_dictLivingCost', 'accStaff_dictLivingCost'],
        ['hr_dictDepType', 'accStaff_dictDepType'],
        ['hr_dictWagePay', 'accStaff_dictWagePay'],
        ['hr_categPayEl', 'accStaff_categPayEl'],
        ['hr_dictHarmfulKind', 'accStaff_dictHarmfulKind'],
        ['hr_dictStatePay', 'accStaff_dictStatePay'],
        ['ac_dictCountry', 'accStaff_dictCountry'],
        ['ac_dictRegion', 'accStaff_dictRegion'],
        ['ac_dictCity', 'accStaff_dictCity'],
        ['hr_dictBasicFunctn', 'accHREmpAdd_dictBasicFunctn', 'accHRCarier_dictBasicFunctn', 'accStaff_dictBasicFunctn']
      ],
      accHREmpFolderDictionary: {
        accHREmpFolderDictVacation: [
          ['hr_dictVacationKind', 'accHR_dictVacationKind', 'accHREmp_dictVacationKind'],
          ['hr_dictVacationPlanDayList', 'accHREmp_dictVacationPlanDayList'],
          ['hr_dictImpartibleVac', 'accHREmp_dictImpartibleVac']
        ],
        accHREmpFolderDictMilitary: [
          ['hr_dictCategMilitary', 'accHREmp_dictCategMilitary'],
          ['hr_dictStateMilitary', 'accHREmp_dictStateMilitary'],
          ['hr_dictMilitaryRank', 'accHREmp_dictMilitaryRank'],
          ['hr_dictMilitarySpeciality', 'accHREmp_dictMilitarySpeciality'],
          ['hr_dictMilitarySuitable', 'accHREmp_dictMilitarySuitable'],
          ['hr_dictMilitaryProfile', 'accHREmp_dictMilitaryProfile'],
          ['hr_dictMilitaryGroup', 'accHREmp_dictMilitaryGroup'],
          ['hr_dictNomMilitaryRank', 'accHREmp_dictNomMilitaryRank'],
          ['hr_dictNomMilitaryRankKind', 'accHREmp_dictNomMilitaryRankKind']
        ],
        accHREmpFolderDictBonus: [
          ['hr_dictBonusKind', 'accHR_dictBonusKind', 'accHREmp_dictBonusKind'],
          ['hr_dictBonusType', 'accHR_dictBonusType', 'accHREmp_dictBonusType'],
          ['hr_dictBonus', 'accHR_dictBonus', 'accHREmp_dictBonus'],
          ['hr_dictPenalty', 'accHR_dictPenalty', 'accHREmp_dictPenalty'],
          ['hr_dictPenaltyReason', 'accHR_dictPenaltyReason', 'accHREmp_dictPenaltyReason']
        ],
        accHREmpFolderDictEducation: [
          ['hr_dictEducationLevel', 'accStaff_dictEducationLevel', 'accHREmp_dictEducationLevel'],
          ['hr_dictAcademStatus', 'accHREmp_dictAcademStatus'],
          ['hr_dictBranchScience', 'accHREmp_dictBranchScience'],
          ['hr_specialty', 'accHREmp_specialty'],
          ['hr_dictLanguage', 'accHREmp_dictLanguage'],
          ['hr_dictLanguageLevel', 'accHREmp_dictLanguageLevel'],
          ['hr_dictDegree', 'accHREmp_dictDegree']
        ],
        accHREmpFolderDictRecruiting: [
          ['hr_dictTypeOfEmployment', 'accHREmp_dictTypeOfEmployment'],
          ['hr_dictTypeOfSourceOfEmployment', 'accHREmp_dictTypeOfSourceOfEmployment']
        ],
        accHREmpFolderDictAudit: [
          ['hr_outgoingFalseFact', 'accHREmp_outgoingFalseFact'],
          ['hr_dictAuditOrg', 'accHREmp_dictAuditOrg']
        ],
        accHREmpFolderDictAnother: [
          ['hr_dictAddInfKind', 'accHREmp_dictAddInfKind'],
          ['hr_dictDisabilityType', 'accHREmp_dictDisabilityType'],
          ['hr_dictCauseOfDeath', 'accHREmp_dictCauseOfDeath'],
          ['hr_dictPensionType', 'accHREmp_dictPensionType'],
          ['hr_dictCategAssets', 'accHREmp_dictCategAssets'],
          ['hr_dictProfCompDevelopForm', 'accHREmp_dictProfCompDevelopForm'],
          ['hr_dictBenefitsKind', 'accHREmp_dictBenefitsKind'],
          ['hr_dictExperience', 'accHREmp_dictExperience'],
          ['ac_dictDocKind', 'accHREmp_dictDocKind'],
          ['hr_dictKinshipKind', 'accHREmp_dictKinshipKind'],
          ['hr_dictCompetency', 'accHREmpAdd_dictCompetency', 'accHRCarier_dictCompetency', 'accHREmp_dictCompetency'],
          ['hr_dictTaskScore', 'accHRCarier_dictTaskScore', 'accHREmp_dictTaskScore'],
          ['dc_trans_vehicle', 'accHREmp_trans_vehicle'],
          ['hr_Assets', 'accHREmp_Assets'],
          ['hr_dictRankReason', 'accHREmp_dictRankReason'],
          ['hr_dictRankPsCategory', 'accHREmp_dictRankPsCategory'],
          ['hr_dictSpecialRank', 'accHREmp_dictSpecialRank'],
          ['accHREmp_dictRank']
        ]
      },
      accHRFolderOrdersMove: [
        ['hr_empOrderAppointA', 'accDst_empOrderAppointA', 'accHR_empOrderAppointA'],
        ['hr_empOrderDismA', 'accDst_empOrderDismA', 'accHR_empOrderDismA'],
        ['hr_empOrderMoveA', 'accDst_empOrderMoveA', 'accHR_empOrderMoveA'],
        ['hr_empOrderAppointMoveA', 'accDst_empOrderAppointMoveA', 'accHR_empOrderAppointMoveA'],
        ['hr_empOrderCanceldismA', 'accDst_empOrderCanceldismA', 'accHR_empOrderCanceldismA'],
        ['hr_empOrderRankA', 'accDst_empOrderRankA', 'accHR_empOrderRankA'],
        ['hr_empOrderActingOrdA', 'accDst_empOrderActingOrdA', 'accHR_empOrderActingOrdA'],
        ['hr_empOrderPluralistA', 'accHR_empOrderPluralistA', 'accDst_empOrderPluralistA'],
        ['hr_empOrderOutpluralA', 'accHR_empOrderOutpluralA', 'accDst_empOrderOutpluralA']
      ],
      accHRFolderOrdersAbsence: [
        ['hr_empOrderMissionA', 'accDst_empOrderMissionA', 'accHR_empOrderMissionA'],
        ['hr_empOrderChangemissionA', 'accDst_empOrderChangemissionA', 'accHR_empOrderChangemissionA'],
        ['hr_empOrderCancelmissionA'],
        ['hr_empOrderVacationA', 'accDst_empOrderVacationA', 'accHR_empOrderVacationA'],
        ['hr_empOrderVacationRetA', 'accDst_empOrderVacationRetA', 'accHR_empOrderVacationRetA'],
        ['hr_empOrderVacationProlongA', 'accDst_empOrderVacationProlongA', 'accHR_empOrderVacationProlongA'],
        ['hr_empOrderVacationRevokeA', 'accDst_empOrderVacationRevokeA', 'accHR_empOrderVacationRevokeA'],
        ['hr_empOrderVacationCompA', 'accDst_empOrderVacationCompA', 'accHR_empOrderVacationCompA']
      ],
      accHRFolderOrdersChgWorkSched: [
        ['hr_empOrderChgworksched', 'accDst_empOrderChgworksched', 'accHR_empOrderChgworksched'],
        ['hr_empOrderWeekendWork', 'accDst_empOrderWeekendWork', 'accHR_empOrderWeekendWork'],
        ['hr_empOrderRelaxHd', 'accDst_empOrderRelaxHd', 'accHR_empOrderRelaxHd'],
        ['hr_empOrderCwsWorkHour', 'accDst_empOrderCwsWorkHour', 'accHR_empOrderCwsWorkHour'],
        ['hr_empOrderRelaxDonor', 'accDst_empOrderRelaxDonor', 'accHR_empOrderRelaxDonor'],
        ['hr_empOrderOverPayA', 'accDst_empOrderOverPayA', 'accHR_empOrderOverPayA']
      ],
      accHRFolderOrdersChgSalary: [
        ['hr_empOrderBountyA', 'accDst_empOrderBountyA', 'accHR_empOrderBountyA'],
        ['hr_empOrderBountyHelpA', 'accDst_empOrderBountyHelpA', 'accHR_empOrderBountyHelpA'],
        ['hr_empOrderAddSalaryA', 'accDst_empOrderAddSalaryA', 'accHR_empOrderAddSalaryA'],
        ['hr_empOrderAddSalaryGovA', 'accDst_empOrderAddSalaryGovA', 'accHR_empOrderAddSalaryGovA'],
        ['hr_empOrderCancelSalaryA', 'accDst_empOrderCancelSalaryA', 'accHR_empOrderCancelSalaryA'],
        ['hr_empOrderRiskPayA', 'accDst_empOrderRiskPayA', 'accHR_empOrderRiskPayA'],
        ['hr_empOrderAddPayA', 'accDst_empOrderAddPayA', 'accHR_empOrderAddPayA']
      ],
      accHRFolderOrdersTraining: [
        ['hr_empOrderTrainingA', 'accDst_empOrderTrainingA', 'accHR_empOrderTrainingA'],
        ['hr_empOrderInternshipA', 'accDst_empOrderInternshipA', 'accHR_empOrderInternshipA']
      ],
      accHRFolderOrdersDisciplinary: [
        ['hr_empOrderBonusA', 'accDst_empOrderBonus', 'accHR_empOrderBonus'],
        ['hr_empOrderRewardA', 'accDst_empOrderReward', 'accHR_empOrderReward'],
        ['hr_empOrderPenaltyA', 'accDst_empOrderPenalty', 'accHR_empOrderPenalty']
      ],
      accHRFolderOrdersOther: [
        ['hr_empOrderChgEmployeeA', 'accDst_empOrderChgEmployeeA', 'accHR_empOrderChgEmployeeA'],
        ['hr_empOrderMilServiceA', 'accDst_empOrderMilServiceA', 'accHR_empOrderMilServiceA'],
        ['hr_empOrderMilServiceRetA', 'accDst_empOrderMilServiceRetA', 'accHR_empOrderMilServiceRetA'],
        ['hr_empOrderDowntimeA', 'accDst_empOrderDowntimeA', 'accHR_empOrderDowntimeA'],
        ['accDstFolderAllOrdersCheckBox', 'accDst_empOrderAllOrders'],
        ['hr_empOrderMedexaminationA', 'accDst_empOrderMedexaminationA', 'accHR_empOrderMedexaminationA']
      ],
      accHRFolderDictionary: [
        ['hr_dictContractKind', 'accHR_dictContractKind'],
        ['hr_payEl', 'accHR_payEl'],
        ['hr_dictRankAssignKind', 'accHR_dictRankAssignKind'],
        ['hr_dictTask', 'accHR_dictTask'],
        ['hr_dictEmpOrderIndex', 'accHR_dictEmpOrderIndex'],
        ['hr_dictOrderDetReason', 'accHR_dictOrderDetReason'],
        ['hr_dictOrderDetReasonDoc', 'accHR_dictOrderDetReasonDoc'],
        ['hr_dictVacationCorr', 'accHR_dictVacationCorr'],
        ['hr_dictActingReason', 'accHR_dictActingReason'],
        ['hr_dictReasonDism', 'accHR_dictReasonDism'],
        ['hr_dictReasonMoving', 'accHR_dictReasonMoving'],
        ['hr_dictRank', 'accHR_dictRank'],
        ['hr_dictEmpOrderText', 'accHR_dictEmpOrderText'],
        ['hr_dictTarifCoeff', 'accStaff_dictTarifCoeff', 'accHR_dictTarifCoeff'],
        ['hr_dictAppointKind', 'accHR_dictAppointKind'],
        ['hr_dictStaffCat', 'accHR_dictStaffCat'],
        ['hr_dictStaffSubCat', 'accHR_dictStaffSubCat'],
        ['accHRFolderDictBonus'],
        ['hr_dictPensionAge', 'accHREmp_dictPensionAge', ['0-4', 'Пенсійний вік', 'hr_dictPensionAge']],
        ['hr_dictOrderDetOrderWord', 'accHR_dictOrderDetOrderWord'],
        ['hr_dictRestDaySchedule', 'accHR_dictRestDaySchedule'],
        {
          accHRFolderDictSick: [
            ['hr_dictIllnessKind', 'accHR_dictIllnessKind'],
            ['hr_dictIllnessReason', 'accHR_dictIllnessReason']
          ],
          accHRFolderDictContr: [
            ['ac_contractor', 'accHR_contractor', ['0-4', 'Контрагенти', 'ac_contractor']],
            ['cdn_orgbusinesstype', 'accHR_orgbusinesstype'],
            ['cdn_corrindex', 'accHR_corrindex'],
            ['cdn_orgownershiptype', 'accHR_orgownershiptype'],
            ['cdn_contacttype', 'accHR_contacttype'],
            ['ac_dictAlternateContractor', 'accHR_dictAlternateContractor'],
            ['ac_bank', 'accHR_bank'],
            ['ac_currency', 'accHR_currency']
          ]
        }
      ],
      accHRFolderAccessRequest: [
        ['hr_accessRequestPROJECT', 'accHRAccessRequestPROJECT'],
        ['hr_accessRequestONRECONCILATION', 'accHRAccessRequestONRECONCILATION'],
        ['hr_accessRequestRECONCILED', 'accHRAccessRequestRECONCILED'],
        ['hr_accessRequestCANCELED', 'accHRAccessRequestCANCELED']
      ],
      accDocFolderOrder: [
        ['hr_empOrderOnCompletion', 'accDoc_empOrderOnCompletion'],
        ['hr_empOrderRejected', 'accDoc_empOrderRejected'],
        ['hr_empOrderRejectedMy', 'accDoc_empOrderRejectedMy'],
        ['hr_empOrderOnCompletionMy', 'accDoc_empOrderOnCompletionMy'],
        ['hr_taskMy', 'accDoc_taskMy']
      ],
      accHREmpAddFolderDictionary: [
        ['hr_dictAreasActivity', 'accHRCarier_dictAreasActivity', 'accHREmpAdd_dictAreasActivity'],
        ['hr_dictRequiredPosition', 'accHREmpAdd_dictRequiredPosition'],
        ['hr_dictRequiredPara', 'accHREmpAdd_dictRequiredPara']
      ],
      accHRCarierFolderDictionary: ['hr_dictPosReqrmnt', 'accHRCarier_dictPosReqrmnt'],
      accHRCarierRating: ['hr_empListAssessment', 'accHRCarier_search'],
      accHREmpAdd_competitionFolder: [
        ['hr_empOrderAdCompetitionA', 'accHREmpAdd_adCompetition'],
        ['hr_listPosContestAllA', 'accHREmpAdd_hr_listPosContestAllA']
      ],
      accDstFolderOrders: [
        'accDstFolderOrdersOther', 'accDstFolderOrdersMove', 'accDstFolderOrdersDisciplinary', 'accDstFolderOrdersTraining',
        'accDstFolderOrdersChgSalary', 'accDstFolderOrdersChgWorkSched', 'accDstFolderOrdersAbsence'
      ]
    },
    ['', // Базові права
      ['0', 'Друковані форми', 'uba_auditTrail'],
      ['0', 'Друковані форми', 'ubs_report'],
      ['0,5', 'Нумератор', 'ubs_numcounter'],
      ['0-4', 'Підрозділи організації', 'org_department'],
      ['0-4', 'Особи організації', 'org_employee'],
      ['0-4', 'МВО', 'ac_respPerson'],
      ['0-4', 'Професії', 'org_profession'],
      ['0-4', 'Штатні одиниці організації', 'org_staffunit'],
      ['0-4', 'Фіз особи', 'cdn_person'],
      ['0-4', 'Призначення', 'org_employeeonstaff']

    ],
    ['', // GL
      ['0', 'Можливі аналітики рахунку', 'gl_accDim'],
      ['0,6-7', 'Рахунок плану рахунків', 'gl_account'],
      ['0', 'План рахунків', 'gl_chartOfAccount'],
      ['0', 'Аналітики', 'gl_dimension'],
      ['0', 'Елементи обліку', 'gl_dimValue'],
      ['0', 'Можливі документи', 'gl_docClass'],
      ['0', 'Документи', 'gl_document'],
      ['0', 'Факт операцій', 'gl_entry'],
      ['0', 'Журнал проведень', 'gl_journalEntry'],
      ['0', 'Аналітики проводок', 'gl_journalEntryDim'],
      ['0', 'Види операцій', 'gl_operationKind']
    ],
    ['', // AC
      ['0-4', 'Адреса', 'ac_address'],
      ['0-4,8', 'Банки', 'ac_bank'],
      ['0-4', 'Країни', 'cdn_country'],
      ['0-4', 'Міста', 'cdn_city'],
      ['0-4', 'Регіони', 'cdn_region'],
      ['0-4', 'Валюти', 'cdn_currency'],
      ['0-4', 'Комісії документів', 'ac_commission'],
      ['0-4', 'Константи', 'ac_constant'],
      ['0-4', 'Типи орг, контр', 'cdn_orgbusinesstype'],
      ['0-4', 'Тип штатної одиниці', 'cdn_staffunittype'],
      ['0-4', 'Контакти', 'cdn_contact'],
      ['0-4', 'Тип підрозділу', 'cdn_deptype'],
      ['0-4', 'Професії', 'cdn_profession'],
      ['0-4', 'Розрахункові рахунки контрагентів', 'ac_contrAccount'],
      ['0-4', 'Відповідальна особа', 'ac_contrRespPerson'],
      ['0-4', 'Нумерація документів', 'ac_counter'],
      ['0-4', 'Причини коригування ПН', 'ac_dictAdjReasonTaxInv'],
      ['0-4', 'Код ознаки зведеної ПН', 'ac_dictCodeConsTaxInv'],
      ['0-4', 'Комісії', 'ac_dictCommission'],
      ['0-4', 'Комісії. Позиції', 'ac_dictCommissionDt'],
      ['0-4', 'Підтвердження ПДВ', 'ac_dictConfirmVAT'],
      ['0-4', 'Спеціальний режим оподаткування ПДВ', 'ac_dictSpecRegimVat'],
      ['0-4', 'ДКПП', 'ac_dictDKPP'],
      ['0-4', 'Територіальні органи ДКСУ', 'ac_dictDksu'],
      ['0', 'Атрибути рахунків форм', 'ac_dictEntityAttr'],
      ['0-4,9', 'Курси валют', 'ac_dictExchangeRate'],
      ['0-4', 'Групи НА', 'ac_dictGroupAssets'],
      ['0-4', 'Одиниці виміру', 'ac_dictMeasure'],
      ['0-4', 'Вид Номенклатури', 'ac_dictNomenclKind'],
      ['0-4', 'Види продукції, робіт та послуг', 'ac_dictProductType'],
      ['0-4', 'Тип причини невидачі ПН', 'ac_dictReasonTypeTax'],
      ['0-4', 'Регламентні звіти', 'ac_dictRep'],
      ['0-4', 'Регламентні звіти. Додатки', 'ac_dictRepDt'],
      ['0-4', 'Налагодження розрахунків регламентного звіту', 'ac_dictRepSettingCalc'],
      ['0-4', 'Термін подання', 'ac_dictRepPeriod'],
      ['0-4', 'Періоди в звітах', 'ac_dictRepType'],
      ['0-4', 'Версія регламентного звіту', 'ac_dictRepVersion'],
      ['0-4', 'Територіальні органи МДЗУ', 'ac_dictSprSti'],
      ['0-4', 'Види податків та відрахувань', 'ac_dictTax'],
      ['0-4', 'Податкові пільги', 'ac_dictTaxCredit'],
      ['0-4', 'Статті податкових Декларацій', 'ac_dictTaxDeclRows'],
      ['0', 'Ставки ПДВ', 'ac_dictTaxRate'],
      ['0-4', 'Типи ТО МДЗУ', 'ac_dictTsti'],
      ['0-4', 'УКТ ЗЕД', 'ac_dictUKTZED'],
      ['0-4', 'Місця зберігання (склади)', 'ac_dictWarehouse'],
      ['0-4', 'Місця зберігання (склади)', 'ac_dictWarehouseType'],
      ['0-4', 'Додатки до документів', 'ac_docAttachment'],
      ['0-4', 'Статті виробничих витрат', 'ac_expenditureItem'],
      ['0-4', 'Налагодження фінансових результатів', 'ac_dictFinResTune'],
      ['0', 'Рахунки виду операції', 'ac_operationAccount'],
      ['0-4', 'Розрахунковий рахунок організації', 'ac_orgAccount'],
      ['0-4', 'Організації', 'ac_organization'],
      ['0-4', 'Відповідальна особа', 'ac_orgRespPerson'],
      ['0-4,10', 'Загальні налаштування', 'ac_settings'],
      ['0-4,10', 'Налаштування організації', 'ac_settingsOrg'],
      ['0-4,10', 'Налаштування користувача', 'ac_settingsEmp'],
      ['0', 'Місяці', 'ac_dictMonth'],
      ['0', 'Періоди', 'ac_dictPeriod'],
      ['0', 'КЕКВ', 'ac_dictEc'],
      ['11', 'hr_empListEmpExperience', 'hr_empListEmpExperience'],
      ['11', 'hr_empListEmpBountyHelp', 'hr_empListEmpBountyHelp'],
      ['12', 'ac_service', 'ac_service'],
      ['0-4', 'Номенклатура військових звань', 'hr_dictNomMilitaryRank'],
      ['0-4', 'Типы номенклатур военных званий', 'hr_dictNomMilitaryRankKind'],
      ['0-4', 'Група майна', 'hr_dictGroupAssets'],
      ['0-4', 'Налаштування форми коригування табеля', 'hr_dictTimeForm']
    ],
    ['',
      ['0', 'ubm_navshortcut', 'ubm_navshortcut'], ['0', 'SIA', 'sia_*'], ['0', 'ubm_form', 'ubm_form*'], ['0', 'ubs_message', 'ubs_message*'],
      ['11', 'AC', 'ac_*'], ['11', 'HR', 'hr_*'], ['11', 'TIM', 'tim_*'], ['11', 'org_diagram', 'org_diagram*']
    ]
  ]
}
