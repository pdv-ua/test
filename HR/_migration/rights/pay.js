module.exports = [
  {
    section: 'Зарплата',
    items: [
      {
        subSection: 'Документи',
        items: [
          {
            code: 'hr_docRegVacation',
            name: 'Відпустка',
            methods: [
              {
                code: 'select',
                name: 'Перегляд',
                desktops: [],
                shortcuts: [],
                els: { hr_docRegVacation: ['select'], hr_docRegVacationDt: ['select'] }
              },
              {
                code: 'edit',
                name: 'Редагування',
                els: { hr_docRegVacation: ['addNew', 'insert', 'update', 'calcVacation', 'checkWorkDays'] }
              },
              {
                code: 'delete',
                name: 'Видалення',
                els: { hr_docRegVacation: ['delete'] }
              },
              {
                code: 'doPosting',
                name: 'Проведення',
                els: { hr_docRegVacation: ['delete'] }
              },
              {
                code: 'doCancelPosting',
                name: 'Відміна проведення',
                els: { hr_docRegVacation: ['doCancelPosting'] }
              }
            ]
          }
        ]
      }
    ]
  }
]
