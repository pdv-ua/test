module.exports.run = (conn) => {
  const codes = ['J05', 'J30', 'S03', 'C11']
  const reports = conn.Repository('ac_dictRep').attrs(['ID'])
    .where('model', 'isNull')
    .where('code', 'in', codes)
    .selectAsObject()

  if (reports.length) {
    reports.forEach(report => {
      conn.update({
        entity: 'ac_dictRep',
        execParams: {
          ID: report.ID,
          model: 'HR'
        },
        __skipOptimisticLock: true
      })
    })
    console.log(`ac_dictRep updated`)
  }
}
