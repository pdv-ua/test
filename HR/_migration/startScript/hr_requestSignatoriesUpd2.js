module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `alter table hr_request alter column signatories type JSONB USING signatories::jsonb`
  })
}
