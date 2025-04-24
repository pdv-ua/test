module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_docPrintSettings rename to ac_docPrintSettings`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `exec sp_rename 'hr_docPrintSettings', 'ac_docPrintSettings'`
    })
  }
}
