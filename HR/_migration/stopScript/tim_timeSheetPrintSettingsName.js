module.exports.run = (conn) => {
  const dict = conn.Repository('tim_timeSheetPrintSettings')
    .attrs(['ID', 'timeSheetColName', 'timeSheetWork.name'])
    .selectAsObject()
  dict.forEach(row => {
    if (row['timeSheetWork.name'] && !row.timeSheetColName) {
      conn.update({
        entity: 'tim_timeSheetPrintSettings',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          timeSheetColName: row['timeSheetWork.name']
        }
      })
    }
  })
}
