module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_docRegVacationCompensation set compensationPeriod = case when dateFrom <'2023-09-12' then '1' else '2' end`
  })
}
