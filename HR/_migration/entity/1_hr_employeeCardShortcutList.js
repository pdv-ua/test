module.exports = [
  {
    entity: 'hr_employeeCardShortcutList',
    notDelete: true,
    notUpdate: false,
    identifier: ['orgID'],
    attrs: ['orgID', 'isDefault', 'params'],
    items: [
      [
        0, 1, JSON.stringify([
          {
            groupCode: 'grpCommon',
            code: 'hr_employee',
            caption: 'Загальні дані',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'ac_address',
            caption: 'Адреси',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeContact',
            caption: 'Інші контакти',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeFamily',
            caption: 'Члени сім\'ї',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeDocs',
            caption: 'Документи',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeBenefits',
            caption: 'Право на пільги',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeBonus',
            caption: 'Нагороди',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeePenalty',
            caption: 'Стягнення',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeCgh',
            caption: 'Зміна облікових даних',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeDisability',
            caption: 'Інвалідність',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_employeeOrgInfo',
            caption: 'Додаткові дані за організацією',
            sortNum: 1
          },
          {
            groupCode: 'grpCommon',
            code: 'hr_empAddGuarantees',
            caption: 'Додаткові гарантії працевлаштування',
            sortNum: 1
          },
          {
            groupCode: 'grpWork',
            code: 'hr_employeeWorkbook',
            caption: 'Трудова книжка',
            sortNum: 1
          },
          {
            groupCode: 'grpWork',
            code: 'hr_employeePositionOrg',
            caption: 'Просування в органі',
            sortNum: 1
          },
          {
            groupCode: 'grpWork',
            code: 'hr_employeeExperience',
            caption: 'Стаж',
            sortNum: 1
          },
          {
            groupCode: 'grpWork',
            code: 'hr_employeeTrialPeriod',
            caption: 'Випробувальний термін',
            sortNum: 1
          },
          {
            groupCode: 'grpWork',
            code: 'hr_empAssessment1',
            caption: 'Оцінювання',
            sortNum: 1
          },
          {
            groupCode: 'grpWork',
            code: 'hr_employeeSpecialRank',
            caption: 'Спеціальні звання',
            sortNum: 1
          },
          {
            groupCode: 'grpPublServ',
            code: 'hr_employeeCivilCommon',
            caption: 'Загальні дані держслужбовця',
            sortNum: 2
          },
          {
            groupCode: 'grpPublServ',
            code: 'hr_publServRang',
            caption: 'Ранг держслужбовця',
            sortNum: 2
          },
          {
            groupCode: 'grpPublServ',
            code: 'hr_empAssessment',
            caption: 'Оцінювання',
            sortNum: 2
          },
          {
            groupCode: 'militaryService',
            code: 'hr_empMilitaryRanks',
            caption: 'Військові звання',
            sortNum: 3
          },
          {
            groupCode: 'militaryService',
            code: 'hr_empStateMilitary',
            caption: 'Військовий облік',
            sortNum: 3
          },
          {
            groupCode: 'militaryService',
            code: 'hr_empConscription',
            caption: 'Призов на ВС',
            sortNum: 3
          },
          {
            groupCode: 'militaryService',
            code: 'hr_empMilitaryContract',
            caption: 'Контракт',
            sortNum: 3
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_employeeEducation',
            caption: 'Освіта',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_employeeLanguage',
            caption: 'Володіння мовами',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_empRangeScience',
            caption: 'Науковий ступінь',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_empAcademStatus',
            caption: 'Вчене звання',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_empCertificatnUp',
            caption: 'Професійне навчання',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_empQualification',
            caption: 'Підвищення кваліфікації',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_empCertificationAcc',
            caption: 'Атестація/Кваліфікація',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_empTarifCategory',
            caption: 'Тарифні розряди',
            sortNum: 4
          },
          {
            groupCode: 'grpEdu',
            code: 'hr_employeeSuccess',
            caption: 'Патенти та публікації',
            sortNum: 4
          },
          {
            groupCode: 'hr_request',
            code: 'hr_request',
            caption: 'Заяви',
            sortNum: 5
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_empOrder',
            caption: 'Накази',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_employeePosition',
            caption: 'Історія змін',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_employeePositionOrder',
            caption: 'Призначення / Переведення',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_employeePositionStaffTable',
            caption: 'Зміна окладів',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_empOrderSickness',
            caption: 'Лікарняні',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_empOrderUni',
            caption: 'Інші невиходи',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_empMission',
            caption: 'Відрядження',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_employeeActing',
            caption: 'Покладання обов\'язків',
            sortNum: 6
          },
          {
            groupCode: 'grpOrder',
            code: 'hr_empWorkShdChange',
            caption: 'Зміна графіку роботи',
            sortNum: 6
          },
          {
            groupCode: 'grpVac',
            code: 'hr_empVacationPlan',
            caption: 'Право на відпустки, відгули',
            sortNum: 7
          },
          {
            groupCode: 'grpVac',
            code: 'hr_employeeVacation',
            caption: 'Відпустки',
            sortNum: 7
          },
          {
            groupCode: 'grpVac',
            code: 'hr_empLongTermAbsc',
            caption: 'Довготривала відсутність',
            sortNum: 7
          },
          {
            groupCode: 'grpVac',
            code: 'hr_longTermReplace',
            caption: 'Заміщення довготривалої відсутності',
            sortNum: 7
          },
          {
            groupCode: 'grpSa',
            code: 'hr_employeeAccrualPayment',
            caption: 'Постійні нарахування',
            sortNum: 8
          },
          {
            groupCode: 'grpSa',
            code: 'hr_payRetention',
            caption: 'Постійні утримання',
            sortNum: 8
          },
          {
            groupCode: 'grpSa',
            code: 'hr_payOut',
            caption: 'Виплата зарплати',
            sortNum: 8
          },
          {
            groupCode: 'grpSa',
            code: 'hr_employeeTaxLimit',
            caption: 'Пільги ПДФО',
            sortNum: 8
          },
          {
            groupCode: 'grpSa',
            code: 'hr_employeeSickLimit',
            caption: 'Пільги лікарняних',
            sortNum: 8
          },
          {
            groupCode: 'grpSa',
            code: 'hr_accrualBalance',
            caption: 'Розрахункова відомість заробітної плати',
            sortNum: 8
          },
          {
            groupCode: 'grpAudit',
            code: 'hr_employeeAuditSpec',
            caption: 'Спецперевірка',
            sortNum: 9
          },
          {
            groupCode: 'grpAudit',
            code: 'hr_employeeAuditClear',
            caption: 'Очищення влади',
            sortNum: 9
          },
          {
            groupCode: 'grpOther',
            code: 'hr_empAddInform',
            caption: 'Додаткова інформація',
            sortNum: 10
          },
          {
            groupCode: 'grpOther',
            code: 'hr_employeePension',
            caption: 'Пенсія',
            sortNum: 10
          },
          {
            groupCode: 'grpOther',
            code: 'hr_employeeInfoPortalVac',
            caption: 'Профіль особи з порталу вакансій',
            sortNum: 10
          },
          {
            groupCode: 'grpOther',
            code: 'hr_employeeAccessInfo',
            caption: 'Форми допуску до інформації',
            sortNum: 10
          },
          {
            groupCode: 'grpOther',
            code: 'hr_empCheckMedical',
            caption: 'Медогляд',
            sortNum: 10
          },
          {
            groupCode: 'grpOther',
            code: 'hr_employeeAssets',
            caption: 'Майно організації у працівника',
            sortNum: 10
          },
          {
            groupCode: 'grpOther',
            code: 'hr_employeeVehicle',
            caption: 'Транспортні засоби працівника',
            sortNum: 10
          },
          {
            groupCode: 'hr_employeePluralList',
            code: 'hr_employeePluralList',
            caption: 'Особові рахунки',
            sortNum: 11
          }
        ])
      ]
    ]
  }
]
