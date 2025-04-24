module.exports.run = (conn) => {
  const dict = conn.Repository('hr_dictTimePrint')
    .attrs(['ID', 'name', 'nameAdd', 'viewDays', 'orderN'])
    .orderBy('orderN')
    .selectAsObject()
  dict.forEach(row => {
    row.dictTimePrintID = row.ID
    row.paramType = '2'
    delete row.ID
    conn.insert({
      entity: 'tim_timeSheetPrintSettings',
      execParams: row
    })
  })
}
