module.exports.run = (conn) => {
  const highEduLevelNomName = 'Вища'
  const middleEduLevelNomName = 'Середня'
  const dictEduLevel = conn.Repository('hr_dictEducationLevel')
    .attrs(['ID', 'nominalName'])
    .where('nominalName', 'in', [highEduLevelNomName, middleEduLevelNomName])
    .selectAsObject()

  dictEduLevel.forEach(dictItem => {
    let educationType
    switch (dictItem.nominalName) {
      case highEduLevelNomName:
        educationType = '1'
        break
      case middleEduLevelNomName:
        educationType = '2'
        break
    }
    educationType && conn.update({
      entity: 'hr_dictEducationLevel',
      __skipOptimisticLock: true,
      execParams: {
        ID: dictItem.ID,
        educationType: educationType
      }
    })
  })
}
