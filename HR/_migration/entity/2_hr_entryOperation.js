module.exports = [
  {
    entity: 'hr_entryOperation',
    identifier: 'code',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_entryOperation').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrs: ['code', 'name'],
    items: [
      ['001', 'Нараховано зарплату'],
      ['002', 'Нарахувано допомоги СС'],
      ['003', 'Утримано із зарплати'],
      ['004', 'Утримано за виконавчими листами'],
      ['005', 'Утримано ПДФО'],
      ['006', 'Утримано військовий збір'],
      ['007', 'Утримано профспілкові внески'],
      ['008', 'Нараховано ЕСВ на зарплату'],
      ['009', 'Нараховано ЕСВ на лікарняні'],
      ['010', 'Нараховано ЕСВ на допомогу СС']
    ]
  }
]
