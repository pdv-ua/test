module.exports = [
  {
    name: 'acc_mainReportPerson',
    description: 'Користувач звітів з персоналу',
    description_uk: 'Користувач звітів з персоналу',
    description_ru: 'Пользователь отчетов по персоналу',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmp'],
    shortcutCodes: [
      // 'accHREmpFolderReports',
      'hr_empListCustom',
      'reportsEmployee',
      'hr_reportEmpListMilitary',
      // 'hr_empListUnusedVacationEmployee',
      // 'hr_empListNotplannedVacationEmployee',
      'hr_reportEmpListDisability',
      'hr_reportEmpListChernobylVictims',
      'hr_reportEmpListHarmful',
      'hr_reportEmpListEvaluation',
      'hr_reportempListEvents',
      'hr_reportEmpListForYearEval',
      'hr_reportEmpListChornobCompens',
      'hr_reportEmpListAlphabet',
      'hr_empListJobRequirements',
      'hr_empListByDisability',
      'hr_reportOrgpos',

      'reportsEmpListCommon',
      'hr_empListAlphabet',
      'hr_empListAppointments',
      'hr_empListByAge',
      'hr_empListBirth',
      'hr_empListByExperience',
      'hr_empListByChilds',
      'hr_empListEducation',
      'hr_empListProfEducation',
      'hr_empListCertificationAcc',
      'hr_empListCheckMedical',
      'hr_empListChangeCredentials',
      'reportsEmpListByOrder',
      'hr_empListRank',
      'hr_empListBonus',
      'hr_empListWithPenalty',
      'hr_empListAppointed',
      'hr_empListMoved',
      'hr_empListDism',
      'hr_empListOverNorm',
      'hr_empListExpAllowanceOrder',
      'hr_empListEmpExperience',
      // 'hr_empListEmpBountyHelp',

      'reportsEmpListByNonAttendance',
      'hr_empListMission',
      'hr_empListActiveVacation',
      'hr_empListUnpaidVac',
      'hr_empListUnpaidLongVac',
      'hr_empListIllnessAbsent',
      'hr_empListPayAvg2MonthAbsent',
      'hr_empListWarFare',
      'hr_reportMilitaryRecruiters'
      // 'hr_empListExpAllowance'
    ],
    elsRule: [
      {
        description: 'Список призначень',
        entityMask: 'hr_empListAppointments',
        methodMask: ['searchEmployeeMtCountSum', 'search']
      }
    ]
  }
]
