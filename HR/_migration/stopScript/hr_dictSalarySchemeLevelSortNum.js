module.exports.run = (conn) => {
  const dictSalarySchemeLevel = conn.Repository('hr_dictSalarySchemeLevel')
    .attrs(['ID', 'code', 'sortNumber'])
    .selectAsObject()

  dictSalarySchemeLevel.forEach(item => {
    !item.sortNumber && conn.update({
      entity: 'hr_dictSalarySchemeLevel',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        sortNumber: Number(String(item.code || '').replace(/[^\d]/g, '') || 0)
      }
    })
  })
}
