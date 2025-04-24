module.exports.run = (conn, migrationParams) => {
  let dictTimeForm = conn.Repository('hr_dictTimeForm')
    .attrs(['ID', 'code', 'name', 'type'])
    .selectAsObject()

  const items = [
    ['1', 'Робочі години', '1'],
    ['2', 'Робочі дні', '2'],
    ['3', 'Графік роботи', '3'],
    ['4', 'Нічні години', '4'],
    ['11', 'Норма (днів)', '11'],
    ['12', 'Норма (годин)', '12'],
    ['18', 'Годин за нормою', '18'],
    ['20', 'Переробіток (норма)', '20'],
    ['22', 'Понаднормово (норма)', '22'],
    ['24', 'Святкові', '24'],
    ['25', 'Вихідні', '25'],
    ['26', 'Лікарняні', '26'],
    ['27', 'Відпустки', '27'],
    ['28', 'Відрядження', '28'],
    ['29', 'Інше', '29']
  ]
  items.forEach(row => {
    if (!dictTimeForm.find(o => o.type === row[2])) {
      conn.insert({
        entity: 'hr_dictTimeForm',
        execParams: {
          code: row[0],
          name: row[1],
          type: row[2]
        }
      })
    }
  })
}
