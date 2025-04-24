const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_mainReportList',
  description: 'Користувач звітів-списків',
  description_uk: 'Користувач звітів-списків',
  description_ru: 'Пользователь отчетов-списков',
  description_az: 'Hesabat-siyahıların istifadəçisi',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHREmp'],
  shortcutCodes: [
    'accHREmpFolderList',
    'hr_empListCustom',
    'hr_empListBirth',
    'hr_empListByAge',
    'hr_empListAppointed',
    'hr_empListMoved',
    'hr_empListDism',
    'hr_empListAudit',
    'hr_empListAlphabet',
    'hr_empListAppointments',
    'hr_empListRank',
    'hr_empListByChilds',
    'hr_empListMission',
    'hr_empListActiveVacation',
    'hr_empListOverNorm',
    'hr_empListUnpaidLongVac',
    'hr_empListUnpaidVac',
    'hr_empListBonus',
    'hr_empListWithPenalty',
    'hr_empListEducation',
    'hr_empListProfEducation',
    'hr_empListByExperience',
    'hr_empListIllnessAbsent',
    'hr_empListPayAvg2MonthAbsent',
    'hr_accrualReportTimeCost',
    'hr_reportempListEvents',
    'hr_reportEmpListForYearEval',
    'hr_reportEmpListChornobCompens',
    'reportsEmpListByOrder',
    'reportsEmpListByNonAttendance',
    'hr_empListExpAllowanceOrder',
    'hr_empActingList',
    'hr_empListEmpExperience',
    'hr_reportListEmployee',
    'hr_reportHospitalEmpCounts',
    'hr_reportEmpCountPosByCategory',
    'hr_reportHospitalF17Doctors',
    'hr_reportHospitalF17PensionDoctors',
    'hr_reportHospitalF17Nurses',
    'hr_reportHospitalF17PensionNurses',
    'hr_reportHospitalF20Staff',
    'hr_reportHospitalF20NotMed',
    'hr_reportTypicalOrgPlanByPay',
    'hr_reportTariffing',
    'hr_reportEmpAccrualList',
    'hr_reportTypicalOrgPlanByPayGroup',
    'accHREmp_reportListEmployee',
    'hr_reportForm1k',
    'hr_reportForm1k_v2',
    'hr_empListUnusedVacationEmployee',
    'hr_empListNotplannedVacationEmployee',
    'hr_empListCertificationAcc',
    'hr_reportAboutStaffing_person',
    'hr_regReportEmployment',
    'hr_regReport10PI',
    'hr_empListEmpBountyHelp',
    'hr_empListWarFare',
    'hr_empListCheckMedical',
    'hr_reportOrgcountsByCateg',
    'hr_reportMilitaryRecruiters',
    'hr_empListUnusedVacationByPeriodsEmployee',
    'hr_empListDayFixVacation',
    'hr_employeeByFundingSources',
    'hr_empReportOnFixedVacationDays',
    'hr_empListChangeCredentials',
    'reportsEmployee',
    'hr_organizationAddresses'
  ],
  elsRule:
    [
      {
        description: 'Призначення працівника',
        entityMask: 'hr_employeePositionS',
        methodMask: ['getTempExecution', 'selectPosGroups']
      },
      {
        description: 'Список призначень',
        entityMask: 'hr_empListAppointments',
        methodMask: ['searchEmployeeMtCountSum', 'search']
      },
      {
        description: 'Встановлення надбавки за вислугу',
        entityMask: 'hr_empListExpAllowance',
        methodMask: ['createOrder', 'getEmpListExpAllowanceData', 'search', 'getData']
      },
      {
        description: 'Вивантаження у Excel',
        entityMask: 'hr_empListEmpExperience',
        methodMask: ['generateXLSX', 'createOrderCertification', 'createOrderBusinessTripEducation']
      },
      {
        description: 'Входження елементів налаштування',
        entityMask: 'hr_repSetElement',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Регламентований звіт',
        entityMask: 'ac_regReport',
        methodMask: ['*']
      },
      {
        description: 'hr_report',
        entityMask: 'hr_report',
        methodMask: ['*']
      },
      {
        description: 'hr_tariffing',
        entityMask: 'hr_tariffing',
        methodMask: ['select', 'getReportDataFact']
      },
      {
        description: 'hr_accrualReport',
        entityMask: 'hr_accrualReport',
        methodMask: [ 'getTimeCostData' ]
      }
    ]
}]
