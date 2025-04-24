module.exports.run = (conn, migrationParams) => {
  const positions = conn.Repository('hr_position')
    .attrs(['ID', 'dictProfessionID'])
    .misc({
      __mip_recordhistory_all: true,
      __allowSelectSafeDeleted: true
    })
    .where('dictPositionID', 'isNull')
    .selectAsObject()

  positions.forEach(pos => {
    if (pos.dictProfessionID) {
      const dictProfession = conn.Repository('hr_dictProfession')
        .attrs(['ID', 'code', 'name', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'dictWagePayID',
          'positionCategory', 'psCategory' ])
        .selectById(pos.dictProfessionID)
      const dictPosition = conn.Repository('hr_dictPosition')
        .attrs(['ID'])
        .where('dictProfessionID', '=', pos.dictProfessionID)
        .selectSingle()
      let dictPositionID
      if (!dictPosition) {
        dictPositionID = conn.insert({
          entity: 'hr_dictPosition',
          fieldList: ['ID'],
          execParams: {
            dictProfessionID: dictProfession.ID,
            code: dictProfession.code,
            name: dictProfession.name,
            nameGen: dictProfession.nameGen,
            nameDat: dictProfession.nameDat,
            nameAcc: dictProfession.nameAcc,
            nameOr: dictProfession.nameOr,
            nameLoc: dictProfession.nameLoc,
            nameVoc: dictProfession.nameVoc,
            dictWagePayID: dictProfession.dictWagePayID,
            positionCategory: dictProfession.positionCategory,
            psCategory: dictProfession.psCategory
          }
        })
      } else {
        dictPositionID = dictPosition.ID
      }
      conn.xhr({
        endpoint: 'runSQL',
        URLParams: { CONNECTION: 'main' },
        data: `update hr_position set dictPositionID = ${dictPositionID} where ID = ${pos.ID}`
      })
    }
  })
}
