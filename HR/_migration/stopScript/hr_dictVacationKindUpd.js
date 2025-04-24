module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: 'UPDATE hr_dictVacationKind SET isTempVacancy = 0 WHERE code = \'dPrCh\' AND mi_deleteDate>=\'9999-12-31\''
  })
}
