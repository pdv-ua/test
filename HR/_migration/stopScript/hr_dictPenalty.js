module.exports.run = (conn) => {
  const penalty = conn.Repository('hr_dictPenalty')
    .attrs(['ID', 'name'])
    .misc({
      __mip_recordhistory_all: true
    })
    .selectAsObject()

  penalty.forEach(pen => {
    conn.update({
      entity: 'hr_dictPenalty',
      __skipOptimisticLock: true,
      execParams: {
        ID: pen.ID,
        isActive: true,
        preamble: 'За поданням дисциплінарної комісії з розгляду дисциплінарних справ',
        directive: 'НАКЛАСТИ ДИСЦИПЛІНАРНЕ СТЯГНЕННЯ у виді'
      }
    })
  })
}
