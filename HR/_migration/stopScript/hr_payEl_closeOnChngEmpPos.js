module.exports.run = (conn) => {
  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code'])
    .where('methodID.code', 'in', ['3', '14', '15', '51', '54', '56', '57', '68', '134', '137', '138', '140', '153'])
    .selectAsObject()

  payElList.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        notCloseOnChangeEmpPos: true
      }
    })
  })
}
