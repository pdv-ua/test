module.exports = [
  {
    name: 'acc_reviewTable',
    description: 'Переглядач Штатного розпису',
    description_uk: 'Переглядач Штатного розпису',
    description_ru: 'Просмотрщик штатное расписание',
    description_az: 'Ştat cədvəlinə baxış',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [ 'arm_accStaff', 'arm_accDoc' ],
    shortcutCodes: [
      'accStaffFolderOrder',
      'accHR_staffTable',
      'hr_staffTable',

      // 'accStaff_position_vac',
      // 'hr_position_vac',

      'accStaff_positionVacContest',
      'hr_positionVacContest',

      'accStaff_empPosLiquidate',
      'hr_empPosLiquidate',
      'accDocFolderStaffOrder',
      'accDoc_staffTableRejectedA',
      'hr_staffTableRejectedA',
      'accDoc_staffTableRejectedMyA',
      'hr_staffTableRejectedMyA',
      'accDoc_staffTableOnCompletionA',
      'hr_staffTableOnCompletionA',
      'accDoc_staffTableOnCompletionMyA',
      'hr_staffTableOnCompletionMyA',
      'accHR_empOrderChgsalaryA',
      'hr_empOrderChgsalaryA',
      'accHR_staffTableAccrual',
      'hr_staffTableAccrual',
      'accHR_staffTableYear',
      'hr_staffTableYear',
      'accStaff_staffValid',
      'hr_staffTreeValid',
      'accStaff_positionSearch',
      'hr_searchPosition',
      'hr_orgstructConsolidatedMilitary',
      'hr_positionReport',
      'accStaff_positionReport',
      'hr_orderProcessingHistory'
    ],
    elsRule:
      [
        {
          description: 'Посади',
          entityMask: 'hr_position',
          methodMask: ['select']
        },
        {
          description: 'Планування штатного розпису',
          entityMask: 'hr_staffTable',
          methodMask: ['select', 'generateXLSX']
        },
        {
          description: 'Орг Структура',
          entityMask: 'hr_staffUnit',
          methodMask: ['select', 'checkUnitRight']
        },
        {
          description: 'Орг Структура',
          entityMask: 'hr_positionVacContest',
          methodMask: ['selectVacancies', 'getVacancies', 'getVacanciesWithVacFrom', 'selectVacanciesWithVacFrom']
        },
        {
          description: 'Орг hr_empOrder',
          entityMask: 'hr_empOrder',
          methodMask: ['repPrintForm', 'isWorkDay']
        },
        {
          description: 'Орг Структура',
          entityMask: 'hr_department',
          methodMask: ['getWithQuantityFact']
        },
        {
          description: 'hr_employeePosition',
          entityMask: 'hr_employeePosition',
          methodMask: ['select', 'getStaffTableSignerList']
        },
        {
          description: 'hr_employeePositionS',
          entityMask: 'hr_employeePositionS',
          methodMask: [ 'select', 'getTempExecution' ]
        },
        {
          description: 'hr_employeePositionSR',
          entityMask: 'hr_employeePositionSR',
          methodMask: [ 'select' ]
        },
        {
          description: 'Посади (результати пошуку)',
          entityMask: 'hr_searchPosition',
          methodMask: ['getSearchSql', 'select4search']
        },
        {
          description: 'hr_idParam',
          entityMask: 'hr_idParam',
          methodMask: ['select', 'updateValuesIDs']
        }
      ]
  }
]
