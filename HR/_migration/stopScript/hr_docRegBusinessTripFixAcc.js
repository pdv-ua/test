module.exports.run = (conn) => {
  const accruals = conn.Repository('hr_accrual')
    .attrs(['ID', 'flagsRec', 'avgCalcType'])
    .where('payElID.methodID.code', '=', '21')
    .selectAsObject()
  accruals.forEach(acc => {
    let flag = 0
    if (acc.avgCalcType === 'PREVIOUS') {
      flag = 1 << 6
    } else if (acc.avgCalcType === 'FACT') {
      flag = 1 << 7
    } else if (acc.avgCalcType === 'PLAN') {
      flag = 1 << 8
    }
    const flagsRec = acc.flagsRec | flag
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: `update hr_accrual SET flagsRec = ${flagsRec} WHERE ID = ${acc.ID}`
    })
  })
}
