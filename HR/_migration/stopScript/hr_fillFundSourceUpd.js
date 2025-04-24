module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_positionFundSource set mi_deleteDate = mi_modifyDate, mi_deleteUser = mi_modifyUser where mi_deleteDate>='9999-12-31'`
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_empPosFundSource set mi_deleteDate = mi_modifyDate, mi_deleteUser = mi_modifyUser where mi_deleteDate>='9999-12-31'`
  })

  const posFundSource = conn.Repository('hr_position')
    .attrs(['ID', 'dictFundSourceID', 'quantity'])
    .where('dictFundSourceID', 'isNotNull')
    .selectAsObject()

  posFundSource.forEach(row => {
    conn.insert({
      entity: 'hr_positionFundSource',
      execParams: {
        positionID: row.ID,
        dictFundSourceID: row.dictFundSourceID,
        quantity: row.quantity
      }
    })
  })

  const empFundSource = conn.Repository('hr_employeePosition')
    .attrs(['ID', 'employeeNumberID', 'dictFundSourceID', 'mtCount'])
    .where('dictFundSourceID', 'isNotNull')
    .misc({ __skipRls: true })
    .selectAsObject()

  empFundSource.forEach(row => {
    conn.insert({
      entity: 'hr_empPosFundSource',
      execParams: {
        employeePositionID: row.ID,
        employeeNumberID: row.employeeNumberID,
        dictFundSourceID: row.dictFundSourceID,
        mtCount: row.mtCount || 1
      }
    })
  })
}
