module.exports = [
  {
    entity: 'hr_payFund',
    identifier: 'code',
    localeAttr: ['name'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payFund').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      typeTaxECBID: { associatedEntity: 'hr_dictTypeTaxECB', codeAttr: 'code' },
      payFundMethodID: { associatedEntity: 'hr_payFundMethod', codeAttr: 'code' }
    },
    attrs: ['code', 'name', 'payFundMethodID', 'typeTaxECBID', 'calcPeriod', 'sequence'],
    items: [
      ['00', 'ЄСВ. Доплата до мінімальної зарплати', '2', '1', 'SALARY', 100],
      ['01', 'ЄСВ. Заробітна плата', '1', '1', 'CALC', 2],
      ['02', 'ЄСВ. Інваліди', '1', '2', 'CALC', 2],
      ['03', 'ЄСВ. Договори ЦПХ', '1', '26', 'CALC', 3],
      ['04', 'ЄСВ. Лікарняні з ФОП', '1', '29', 'SALARY', 4],
      ['05', 'ЄСВ. Лікарняні з СС', '1', '29', 'SALARY', 5],
      ['06', 'ЄСВ. Лікарняні з ФОП (інваліди)', '1', '36', 'SALARY', 4],
      ['07', 'ЄСВ. Лікарняні з СС (інваліди)', '1', '36', 'SALARY', 5],
      ['08', 'ЄСВ. Відпустки', '1', '1', 'SALARY', 1],
      ['09', 'ЄСВ. Відпустки (інваліди)', '1', '2', 'SALARY', 1],
      ['10', 'ЄСВ. Лікарняні пологові', '1', '42', 'SALARY', 6],
      ['11', 'ЄСВ. Лікарняні пологові (інваліди)', '1', '43', 'SALARY', 6],
      ['12', 'ЄСВ. Зарплата держслужбовців', '1', '25', 'CALC', 2],
      ['13', 'ЄСВ. Відпустка держслужбовців', '1', '25', 'SALARY', 1],
      ['14', 'ЄСВ. Зарплата держслужбовців (інваліди)', '1', '32', 'CALC', 2],
      ['15', 'ЄСВ. Відпустка держслужбовців (інваліди)', '1', '32', 'SALARY', 1]
    ]
  }
]
