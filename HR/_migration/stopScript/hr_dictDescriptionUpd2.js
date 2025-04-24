module.exports.run = (conn) => {
  const dictList = ['hr_dictMilitarySpeciality', 'hr_dictMilitaryRank']
  dictList.forEach(dictName => {
    const dict = conn.Repository(dictName)
      .attrs(['ID'])
      .selectAsObject()

    dict.forEach(item => {
      conn.update({
        entity: dictName,
        __skipOptimisticLock: true,
        execParams: {
          ID: item.ID,
          description: null
        }
      })
    })
  })
}
