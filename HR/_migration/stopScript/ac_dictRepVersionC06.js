module.exports.run = (conn) => {
  let dict = conn.Repository('ac_dictRepVersion')
    .attrs(['ID'])
    .where('code', '=', 'C06')
    .selectAsObject()

  dict.forEach(row => {
    conn.run({
      entity: 'ac_dictRepVersion',
      method: 'delete',
      execParams: { ID: row.ID },
      __skipOptimisticLock: true
    })
  })
}
