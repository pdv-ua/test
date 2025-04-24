module.exports = [
  {
    entity: 'hr_dictStaffCat',
    identifier: ['code'],
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictStaffCat').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrs: ['code', 'name', 'accCategory'],
    items: [
      [ '01', 'Держслужбовці', '2' ],
      [ '02', 'Спеціалісти', '1' ],
      [ '03', 'Обслуговуючий персонал', '1' ],
      [ '04', 'Договори ЦПХ', '7' ],
      [ '05', 'Інші', '6' ]
    ]
  }
]
