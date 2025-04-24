module.exports.run = (conn) => {
  if (!conn.Repository('hr_employeeSickLimit').attrs(['ID']).where('dictSickLimitID', 'isNotNull').misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()) {
    const dictSickLimits = conn.Repository('hr_dictSickLimit')
      .attrs(['ID', 'typeSickLimit'])
      .selectAsObject()
    const employeeSickLimits = conn.Repository('hr_employeeSickLimit')
      .attrs(['ID', 'typeSickLimit'])
      .selectAsObject()
    employeeSickLimits.forEach(employeeSickLimit => {
      const dictSickLimit = dictSickLimits.find(o => o.typeSickLimit === employeeSickLimit.typeSickLimit)
      if (dictSickLimit) {
        conn.update({
          entity: 'hr_employeeSickLimit',
          execParams: {
            ID: employeeSickLimit.ID,
            dictSickLimitID: dictSickLimit.ID
          },
          __skipOptimisticLock: true
        })
      }
    })
  }
}
