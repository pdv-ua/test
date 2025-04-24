module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_staffUnit set quantity = (select dep.quantity from hr_department dep where dep.ID = hr_staffUnit.ID )
     where mi_unityEntity = 'hr_department' and quantity IS NULL`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` UPDATE hr_organization SET quantity = hr_organization.limitEmpNum`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: ` UPDATE hr_staffUnit set quantity = (select org.quantity from hr_organization org where org.ID = hr_staffUnit.ID )
       where mi_unityEntity = 'hr_organization' and quantity IS NULL`
  })
}
