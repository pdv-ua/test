module.exports.run = (conn) => {
  const dict = conn.Repository('trf_document')
    .attrs(['ID'])
    .where('docState', '=', 'PROJECT')
    .exists(
      conn.Repository('trf_workPlace')
        .where('{self}.documentID', '=', '{master}.ID')
        .where('{self}.state', '=', 'PROJECT')
        .where('{self}.mi_deleteDate', '>=', '#maxdate')
    )
    .exists(
      conn.Repository('trf_workPlace')
        .where('{self}.documentID', '=', '{master}.ID')
        .where('{self}.state', '=', 'POSTED')
        .where('{self}.mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsObject()

  dict.forEach(item => {
    conn.update({
      entity: 'trf_document',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        docState: 'PARTIALLY'
      }
    })
  })
}
