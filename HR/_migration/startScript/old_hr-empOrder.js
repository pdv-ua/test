module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` delete from hr_order where orderClass in ( select ID from hr_orderClass where entityName in ('hr_empOrderAppoint', 'hr_empOrderDism', 'hr_empOrderMoving', 'hr_empOrderChangeSalary', 'hr_orderBonus') ) `
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` delete from hr_orderClass where entityName in ('hr_empOrderAppoint', 'hr_empOrderDism', 'hr_empOrderMoving', 'hr_empOrderChangeSalary', 'hr_orderBonus') `
  })
}
