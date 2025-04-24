module.exports.run = conn => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `
      update hr_timeSheetChangeEmp
      set dateTo = tc.dateTo, orderState = tc.orderState
      from hr_timeSheetChange tc 
      where hr_timeSheetChangeEmp.timeSheetChangeID = tc.ID
    `
  })
}
