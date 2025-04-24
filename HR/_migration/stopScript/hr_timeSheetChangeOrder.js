module.exports.run = (conn) => {
  const timeSheet = conn.Repository('tim_timeSheet')
    .attrs(['ID'])
    .where('changeOrderID', 'isNotNull')
    .selectAsObject()

  timeSheet.forEach(item => {
    conn.update({
      entity: 'tim_timeSheet',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        isCanceled: 1
      }
    })
  })
}
