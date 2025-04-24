module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_repFavorites rename to ac_repFavorites`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `exec sp_rename 'hr_repFavorites', 'ac_repFavorites'`
    })
  }
}
