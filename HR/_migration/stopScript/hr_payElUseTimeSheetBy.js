module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code'])
    .where('methodID.code', 'in', ['7', '8', '10', '11', '153', '207', '137', '138'])
    .selectAsObject()

  payElList.forEach(item => {
    const execParams = {
      ID: item.ID,
      useTimeSheetBy: 'NORMA'
    }
    if (['7', '8', '10', '11', '153', '207'].includes(item['methodID.code'])) {
      execParams.normTimeBy = 'MONTH'
    }
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams
    })
  })
}