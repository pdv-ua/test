module.exports = [
  {
    entity: 'hr_employeeCardSetting',
    notDelete: true,
    notUpdate: false,
    identifier: ['orgID'],
    attrs: ['orgID', 'isDefault', 'params'],
    items: [
      [
        0, 1, JSON.stringify([
          {
            groupCode: 'grpEmplCard',
            code: 'education',
            caption: 'Освіта',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'labor-activity',
            caption: 'Трудова діяльність',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'vacation',
            caption: 'Право на відпустки, відгули',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'work-sheets',
            caption: 'Мій Графік',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'time-sheets',
            caption: 'Мій Табель',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'settlement-sheets',
            caption: 'Розрахункові листи',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'assessment',
            caption: 'Оцінювання',
            sortNum: 1
          },
          {
            groupCode: 'grpEmplCard',
            code: 'evaluationKPI',
            caption: 'Оцінювання KPI',
            sortNum: 1
          },
          {
            groupCode: 'grpInfo',
            code: 'org-structure',
            caption: 'Оргструктура',
            sortNum: 2
          },
          {
            groupCode: 'grpInfo',
            code: 'reference',
            caption: 'Автодовідка',
            sortNum: 2
          },
          {
            groupCode: 'grpInfo',
            code: 'PositionInstructionAcq',
            caption: 'Посадова інструкція',
            sortNum: 2
          },
          {
            groupCode: 'grpMessage',
            code: 'statements',
            caption: 'Заяви',
            sortNum: 3
          },
          {
            groupCode: 'grpMessage',
            code: 'tasks',
            caption: 'Завдання',
            sortNum: 3
          },
          {
            groupCode: 'grpSubordinateEmployees',
            code: 'subordinates-list',
            caption: 'Підлеглі працівники',
            sortNum: 4
          },
          {
            groupCode: 'grpSubordinateEmployees',
            code: 'emp-statements',
            caption: 'Заяви працівників',
            sortNum: 4
          },
          {
            groupCode: 'grpSystemFunctions',
            code: 'vpn',
            caption: 'Встановити пароль VPN',
            sortNum: 4
          }
        ])
      ]
    ]
  }
]
