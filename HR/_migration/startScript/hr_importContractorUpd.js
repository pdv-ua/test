module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'alter table hr_importContractor drop column orgBusinessTypeID'
  })
}
