module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_department set codeSort = case when isnumeric(replace(replace(code, '.', ''), ',', '') + '.0e0') = 1 then cast(replace(replace(code, '.', ''), ',', '') as int) else 0 end;`
  })
}
