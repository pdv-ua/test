module.exports.run = (conn, migrationParams) => {
  const posBuilder = conn.Repository('hr_dictPosition')
    .attrs(['ID', 'code', 'name', 'fullName', 'nameGen', 'nameDat', 'fullNameGen', 'fullNameDat', 'description', 'mi_deleteUser'])
    .notExists(conn.Repository('org_profession').correlation('ID', 'ID'))
    .misc({ __allowSelectSafeDeleted: true })
    .selectAsObject()

  posBuilder.forEach(row => {
    const del = !!row.mi_deleteUser
    delete row.mi_deleteUser
    conn.insert({
      entity: 'org_profession',
      execParams: row
    })
    if (del) {
      conn.run({
        entity: 'org_profession',
        method: 'delete',
        execParams: { ID: row.ID },
        __skipOptimisticLock: true
      })
    }
  })
}
