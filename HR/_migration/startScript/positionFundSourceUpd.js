module.exports.run = (conn) => {
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
