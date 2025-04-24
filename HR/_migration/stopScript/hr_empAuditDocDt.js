module.exports.run = (conn) => {
  const empAuditDet = conn.Repository('hr_employeeDocAuditDt')
    .attrs('*')
    .selectAsObject()

  empAuditDet.forEach(item => {
    if (item.organizationAuditID) {
      const orgAudit = conn.Repository('hr_dictAuditOrg').attrs('contractorID.name').selectById(item.organizationAuditID)
      conn.update({
        entity: 'hr_employeeDocAuditDt',
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          organizationAuditName: orgAudit['contractorID.name']
        }
      })
    }
  })
}
