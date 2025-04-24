module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_empOrderExtract set masterOrganizationID = organizationID where masterOrganizationID is null'
  })
}
