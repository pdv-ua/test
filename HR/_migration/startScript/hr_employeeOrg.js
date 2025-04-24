module.exports.run = (conn, migrationParams) => {
  if (migrationParams.dialect === 'PostgreSQL') {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_employeeOrg rename to ac_employeeOrg`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_employee add insuranceNum VARCHAR(20) null;`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_employee add whereRegisteredInPFU VARCHAR(100) null;`
    })
  } else {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `exec sp_rename 'hr_employeeOrg', 'ac_employeeOrg'`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_employee add insuranceNum NVARCHAR(20) null;`
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `alter table hr_employee add whereRegisteredInPFU NVARCHAR(100) null;`
    })
  }

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `alter table org_employee add organizationID BIGINT null`
  })

  function findCode (entity, attrName, value, pr) {
    if (conn.Repository(entity)
      .attrs(['ID'])
      .where(attrName, '=', value)
      .selectSingle()) {
      return findCode(entity, attrName, value + pr)
    } else {
      return value
    }
  }

  const orgEmpBuilder = conn.Repository('org_employee')
    .attrs(['ID', 'code', 'lastName', 'firstName', 'middleName', 'birthDate', 'sexType', 'shortFIO', 'fullFIO', 'organizationID', 'mi_deleteUser'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  const empBuilder = conn.Repository('hr_employee')
    .attrs(['ID', 'taxCode', 'lastName', 'firstName', 'middleName', 'birthDate', 'sexType', 'shortFIO', 'fullFIO', 'organizationID', 'mi_deleteUser'])
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  empBuilder.forEach(emp => {
    const hrEmp = orgEmpBuilder.find(o => o.ID === emp.ID)
    if (!hrEmp) {
      let code = findCode('org_employee', 'code', emp.taxCode, '_')
      conn.insert({
        entity: 'org_employee',
        isImportOperation: true,
        byHR: true,
        execParams: {
          ID: emp.ID,
          organizationID: emp.organizationID,
          code,
          lastName: emp.lastName,
          firstName: emp.firstName,
          middleName: emp.middleName,
          birthDate: emp.birthDate,
          sexType: (!emp.sexType || emp.sexType === '?') ? 'N' : (emp.sexType === 'F' ? 'W' : 'M'),
          shortFIO: emp.shortFIO || emp.firstName,
          fullFIO: emp.fullFIO || emp.firstName
        }
      })
      if (emp.mi_deleteUser) {
        conn.run({
          entity: 'org_employee',
          method: 'delete',
          execParams: { ID: emp.ID },
          __skipOptimisticLock: true
        })
      }
    }
  })

  orgEmpBuilder.forEach(emp => {
    const hrEmp = empBuilder.find(o => o.ID === emp.ID)
    if (!hrEmp) {
      let taxCode = findCode('hr_employee', 'taxCode', emp.code, '-')
      conn.insert({
        entity: 'hr_employee',
        isImportOperation: true,
        byAC: true,
        execParams: {
          ID: emp.ID,
          organizationID: emp.organizationID,
          taxCode,
          lastName: emp.lastName,
          firstName: emp.firstName,
          middleName: emp.middleName,
          birthDate: emp.birthDate,
          sexType: (!emp.sexType || emp.sexType === '?') ? 'N' : (emp.sexType === 'F' ? 'W' : 'M'),
          shortFIO: emp.shortFIO || emp.firstName,
          fullFIO: emp.fullFIO || emp.firstName
        }
      })
      if (emp.mi_deleteUser) {
        conn.run({
          entity: 'hr_employee',
          method: 'delete',
          execParams: { ID: emp.ID },
          __skipOptimisticLock: true
        })
      }
    }
  })
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `DELETE FROM ac_employeeOrg WHERE ID in (SELECT eo.ID 
          from ac_employeeOrg eo
          left join ac_organization o On o.ID = eo.organizationID
          where o.ID is null)`
  })
}
