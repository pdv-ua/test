module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table if exists hr_empOrdAcquaintanceListTemplate rename to hr_empOrderAcquaintListTpl`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table if exists hr_empOrdAcquaintanceListTemplateDet rename to hr_empOrderAcquaintListTplDet`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `IF (EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'hr_empOrdAcquaintanceListTemplate'))
        BEGIN
          exec sp_rename 'hr_empOrdAcquaintanceListTemplate', 'hr_empOrderAcquaintListTpl'
      END
      `
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `IF (EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'hr_empOrdAcquaintanceListTemplateDet'))
      BEGIN
        exec sp_rename 'hr_empOrdAcquaintanceListTemplateDet', 'hr_empOrderAcquaintListTplDet'
      END
      `
    })
  }
}
