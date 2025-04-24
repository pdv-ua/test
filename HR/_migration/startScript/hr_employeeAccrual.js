module.exports.run = (conn) => {
  /* const payElID = conn.Repository('hr_payEl').attrs(['ID'])
    .where('code', '=', '72')
    .orderByDesc('mi_createDate')
    .selectScalar()

  if (payElID) {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: {CONNECTION: 'main'},
      data: `update hr_employeeAccrual set payElID = ${payElID} where ID in ( select ea.ID from hr_employeeAccrual ea join hr_payEl pe on pe.ID = ea.payElID where pe.code = '68' and ea.mi_deleteUser is null )`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: {CONNECTION: 'main'},
      data: `update hr_empOrderAddsalaryDet set payElID = ${payElID} where ID in ( select ea.ID from hr_empOrderAddsalaryDet ea join hr_payEl pe on pe.ID = ea.payElID where pe.code = '68' and ea.mi_deleteUser is null )`
    })
    // Включить в патч НАДС
   conn.xhr({
      endpoint: 'runSQL',
      URLParams: {CONNECTION: 'main'},
      data: `update hr_empOrderChgSalEmpDet set payElID = ${payElID} where ID in ( select ea.ID from hr_empOrderChgSalEmpDet ea join hr_payEl pe on pe.ID = ea.payElID where pe.code = '68' and ea.mi_deleteUser is null )`
    })

  } */
}
