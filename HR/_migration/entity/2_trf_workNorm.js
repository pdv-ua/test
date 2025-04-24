module.exports = [
  {
    entity: 'trf_workNorm',
    localeAttr: ['weekHours'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('trf_workNorm').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['name'],
    attrs: ['name', 'weekHours'],
    items: [
      ['Тижнева норма 40', 40],
      ['Тижнева норма 39', 39],
      ['Тижнева норма 38.5', 38.5],
      ['Тижнева норма 36', 36],
      ['Тижнева норма 33', 33],
      ['Тижнева норма 30', 30],
      ['Тижнева норма 25', 25],
      ['Тижнева норма 24', 24],
      ['Тижнева норма 20', 20],
      ['Тижнева норма 18', 18]
    ]
  }
]
