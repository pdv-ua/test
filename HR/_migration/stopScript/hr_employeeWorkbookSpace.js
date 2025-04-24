module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `Update hr_employeeWorkbook set workPlace = replace(workPlace, '1 ', '') where workPlace like '1 %'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `Update hr_employeeWorkbook set workPosition= replace(workPosition, ' : ', ': ') 
           where workPosition like '% : %'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `Update hr_employeeWorkbook set workPosition = replace(workPosition, ' , ', ', ') 
           where workPosition like '% , %'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `Update hr_employeeWorkbook set workPosition = replace(workPosition, ' | ', ', ') 
           where workPosition like '% | %'`
  })
}
