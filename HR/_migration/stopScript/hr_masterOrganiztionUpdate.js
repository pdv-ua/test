module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_order set masterOrganizationID = organizationID where masterOrganizationID is null'
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'update hr_empOrder set masterOrganizationID = organizationID where masterOrganizationID is null'
  })
}
