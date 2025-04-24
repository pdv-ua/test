const dateService = require('../../../AC/modules/dataServices/dateService')

module.exports.run = (conn) => {
  const empAudit = conn.Repository('hr_employeeAudit')
    .attrs('*')
    .selectAsObject()

  const empAuditDoc = []
  empAudit.forEach(item => {
    if (!empAuditDoc[item.employeeID]) {
      const empPosition = conn.Repository('hr_employeePosition')
        .attrs('positionID', 'organizationID')
        .misc({
          __mip_ondate: dateService.currentDate()
        })
        .where('employeeID', '=', item.employeeID)
        .selectSingle() || {}
      const employee = conn.Repository('hr_employee')
        .attrs('organizationID')
        .selectById(item.employeeID)

      let orgID = empPosition.organizationID || employee.organizationID

      if (!orgID) {
        const empOrg = conn.Repository('ac_employeeOrg')
          .attrs('*')
          .where('employeeID', '=', item.employeeID)
          .selectSingle()
        if (empOrg && empOrg.organisationID) orgID = empOrg.organisationID
      }

      const auditType = conn.Repository('hr_dictAuditOrg')
        .attrs('auditType')
        .selectById(item.organizationAuditID)

      empAuditDoc[item.employeeID] = conn.insert({
        entity: 'hr_employeeDocAudit',
        fieldList: ['ID'],
        execParams: {
          employeeID: item.employeeID,
          orgID: orgID,
          positionID: empPosition.positionID || null,
          auditType: auditType.auditType || 1,
          docNumber: '0'
        }
      })
    }
    conn.insert({
      entity: 'hr_employeeDocAuditDt',
      execParams: {
        employeeDocAuditID: empAuditDoc[item.employeeID],
        employeeID: item.employeeID,
        organizationAuditID: item.organizationAuditID,
        ingoingDate: item.ingoingDate,
        ingoingNumber: item.ingoingNumber,
        ingoingComment: item.ingoingComment,
        controlDate: item.controlDate,
        outgoingDate: item.outgoingDate,
        outgoingNumber: item.outgoingNumber,
        outgoingComment: item.outgoingComment,
        resultFactID: item.resultFactID,
        resultComment: item.resultComment,
        resultDate: item.resultDate,
        auditResult: item.auditResult
      }
    })
  })
}
