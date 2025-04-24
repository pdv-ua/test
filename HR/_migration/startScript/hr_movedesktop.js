module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `DELETE FROM uba_els WHERE code LIKE 'acc_editorStud_ac_fundSource_%'`
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `DELETE FROM uba_els WHERE code LIKE 'acc_editorStud_hr_employeeBenefitsDoc_%'`
  })
}
