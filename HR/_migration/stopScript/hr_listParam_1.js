module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_listParam set fullName = 'Відпустка', shortName = 'Відпустка' WHERE code = 'salary6'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_listParam set fullName = 'Лікарняні', shortName = 'Лікарняні' WHERE code = 'salary7'`
  })
}
