const crud = ['select', 'addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_editorTimeSheet',
    description: 'Фахівець з ведення табеля',
    description_uk: 'Фахівець з ведення табеля',
    description_ru: 'Специалист по ведению табеля',
    description_az: 'Tabelin müxabirləşməsi üzrə mütəxəssis',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accTim'],
    shortcutCodes: [
      'accTimSettings',
      'accTim_timPlan',
      'tim_plan',
      'accTim_timeSheet',
      'tim_timeSheet'
    ],
    elsRule:
      [
        {
          description: 'Розклад роботи',
          entityMask: 'tim_plan',
          methodMask: [...crud, 'calcPlan']
        },
        {
          description: 'Графік',
          entityMask: 'hr_workSchedule',
          methodMask: ['select']
        },
        {
          description: 'Табель',
          entityMask: 'tim_timeSheet',
          methodMask: [...crud, 'loadData', 'fillData', 'updateData', 'removeCorrect', 'canceledOrderDay', 'removeCanceled', 'blockTimeSheet', 'editPastPeriod']
        },
        {
          description: 'tim_report',
          entityMask: 'tim_report',
          methodMask: ['runTableReport']
        },
        {
          description: 'Додатки',
          entityMask: 'hr_orderAttachment',
          methodMask: ['*']
        }
      ]
  }
]
