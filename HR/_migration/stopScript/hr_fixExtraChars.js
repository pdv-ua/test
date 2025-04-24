module.exports.run = (conn) => {
  const entities = [
    {
      entityName: 'hr_position',
      fields: ['code', 'name', 'fullName', 'description', 'nameAddition', 'caption', 'nameEng',
        'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
        'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF',
        'nameLocF', 'nameVocF', 'fullNameNomF', 'fullNameGenF', 'fullNameDatF', 'fullNameAccF', 'fullNameOrF', 'fullNameLocF',
        'fullNameVocF', 'nameEngF', 'fullNameEng', 'fullNameEngF'
      ]
    },
    {
      entityName: 'hr_department',
      fields: ['code', 'name', 'fullName', 'description', 'nameEng', 'caption',
        'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen',
        'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc'
      ]
    },
    {
      entityName: 'hr_dictPosition',
      fields: ['code', 'name', 'fullName', 'description', 'caption', 'nameEng',
        'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
        'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF',
        'nameLocF', 'nameVocF', 'nameEngF', 'fullNameEng', 'nameForeign'
      ]
    },
    {
      entityName: 'hr_organization',
      fields: ['code', 'name', 'fullName', 'description', 'nameEng', 'EDRPOUCode', 'taxCode',
        'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
        'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'shortName'
      ]
    }
  ]
  entities.forEach(row => {
    const items = conn.Repository(row.entityName)
      .attrs(row.fields.concat('ID'))
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()
    items.forEach(item => {
      let isUpdate = false
      let params = {
        ID: item.ID
      }
      row.fields.forEach(attr => {
        if (item[attr]) {
          // eslint-disable-next-line no-control-regex
          if (item[attr].match(/[\x01-\x1F]/g) && !item[attr].match(/(\r|\n)/g)) {
            // eslint-disable-next-line no-control-regex
            params[attr] = item[attr].replace(/[\x01-\x1F]/g, '').trim()
            isUpdate = true
          }
        }
      })
      if (isUpdate) {
        conn.update({
          entity: row.entityName,
          execParams: params,
          __skipOptimisticLock: true
        })
      }
    })
  })
}
