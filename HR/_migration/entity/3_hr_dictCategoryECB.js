module.exports = [
  {
    entity: 'hr_dictCategoryECB',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictCategoryECB').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: 'code',
    attrsConfig: {
      dictTypeTaxECBID: { associatedEntity: 'hr_dictTypeTaxECB', codeAttr: 'code' }
    },
    attrs: ['code', 'name', 'dictTypeTaxECBID'],
    items: [
      ['1', 'Найманий працівник на загальних підставах', '1'],
      ['2', 'Працюючий інвалід', '2'],
      ['25', 'Держслужбовець', '25'],
      ['26', 'Угода ЦПХ', '26'],
      ['32', 'Держслужбовець - інвалід', '32']
    ]
  }
]
