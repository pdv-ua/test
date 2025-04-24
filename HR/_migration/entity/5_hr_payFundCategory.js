module.exports = [
  {
    entity: 'hr_payFundCategory',
    identifier: ['payFundID', 'dictCategoryECBID'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payFundCategory').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      payFundID: { associatedEntity: 'hr_payFund', codeAttr: 'code' },
      dictCategoryECBID: { associatedEntity: 'hr_dictCategoryECB', codeAttr: 'code' }
    },
    attrs: ['payFundID', 'dictCategoryECBID'],
    items: [
      ['01', '1'],
      ['02', '2'],
      ['03', '1'],
      ['03', '2'],
      ['03', '26'],
      ['04', '1'],
      ['04', '25'],
      ['05', '1'],
      ['05', '25'],
      ['06', '2'],
      ['07', '2'],
      ['08', '1'],
      ['09', '2'],
      ['10', '1'],
      ['10', '25'],
      ['11', '2'],
      ['12', '25'],
      ['13', '25'],
      ['14', '32'],
      ['15', '32']
    ]
  }
]
