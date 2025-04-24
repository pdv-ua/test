module.exports.run = (conn) => {
  const employeeOrgInfo = conn.Repository('hr_employeeOrgInfo')
    .attrs(['ID', 'employeeID', 'numberOS', 'numberIdentCard',
      'numberPermit', 'domainName', 'comment', 'addInfo'])
    .orderBy('mi_modifyDate')
    .selectAsObject()

  employeeOrgInfo.forEach(row => {
    conn.update({
      entity: 'hr_employee',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.employeeID,
        numberOS: row.numberOS,
        numberIdentCard: row.numberIdentCard,
        numberPermit: row.numberPermit,
        domainName: row.domainName,
        comment: row.comment,
        addInfo: row.addInfo
      }
    })
  })
}
