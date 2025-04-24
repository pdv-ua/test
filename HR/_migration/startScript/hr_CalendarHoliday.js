module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: "update hr_CalendarHoliday set dateFrom = '2000-01-01 00:00:00.000' where dateFrom is null"
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: "update hr_CalendarHoliday set dateTo = '9999-12-31 00:00:00.000' where dateTo is null"
  })
}
