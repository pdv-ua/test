module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `UPDATE hr_dictStaffCat SET usage = '3' WHERE usage IS NULL`
  })
}
