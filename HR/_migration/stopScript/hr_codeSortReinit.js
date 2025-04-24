module.exports.run = (conn) => {
  const dictpayEl = conn.Repository('hr_payEl')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictpayEl.forEach(item => {
    let codeList = String(item.code || '0').match(/\d+/g)
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
      }
    })
  })

  const dictpayFund = conn.Repository('hr_payFund')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictpayFund.forEach(item => {
    let codeList = String(item.code || '0').match(/\d+/g)
    conn.update({
      entity: 'hr_payFund',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
      }
    })
  })

  const dictemployeeNumber = conn.Repository('hr_employeeNumber')
    .attrs(['ID', 'tabNum'])
    .selectAsObject()

  dictemployeeNumber.forEach(item => {
    let tabNumList = String(item.tabNum || '0').match(/\d+/g)
    conn.update({
      entity: 'hr_employeeNumber',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        tabNumSort: Number(`${(tabNumList[0] || '0').substring(0, 12)}.${((tabNumList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
      }
    })
  })

  const dictPosition = conn.Repository('hr_dictPosition')
    .attrs(['ID', 'code'])
    .selectAsObject()

  dictPosition.forEach(item => {
    let codeList = String(item.code || '0').match(/\d+/g)
    conn.update({
      entity: 'hr_dictPosition',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
      }
    })
  })

  const department = conn.Repository('hr_department')
    .attrs(['ID', 'code'])
    .selectAsObject()

  department.forEach(item => {
    let codeList = String(item.code || '0').match(/\d+/g)
    conn.update({
      entity: 'hr_department',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        codeSort: Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
      }
    })
  })
}
