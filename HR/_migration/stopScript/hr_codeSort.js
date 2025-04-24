module.exports.run = (conn) => {
  const dictpayEl = conn.Repository('hr_payEl')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictpayEl.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(String(item.code || '').replace(/[^\d]/g, '') || 0)
      }
    })
  })

  const dictpayFund = conn.Repository('hr_payFund')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictpayFund.forEach(item => {
    conn.update({
      entity: 'hr_payFund',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(String(item.code || '').replace(/[^\d]/g, '') || 0)
      }
    })
  })
  const dictemployeeNumber = conn.Repository('hr_employeeNumber')
    .attrs(['ID', 'tabNum'])
    .selectAsObject()

  dictemployeeNumber.forEach(item => {
    conn.update({
      entity: 'hr_employeeNumber',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        tabNumSort: Number(String(item.tabNum || '').replace(/[^\d]/g, '') || 0)
      }
    })
  })
}
