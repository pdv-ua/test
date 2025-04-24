module.exports = [
  {
    entity: 'hr_payElEntry',
    identifier: ['payElID', 'payElBaseID', 'entryType'],
    notUpdate: true,
    notDelete: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payElEntry').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      payElID: { associatedEntity: 'hr_payEl', codeAttr: 'code' },
      payElBaseID: { associatedEntity: 'hr_payEl', codeAttr: 'code' }
    },
    attrs: ['payElID', 'payElBaseID', 'entryType'],
    items: [
      ['4', '1', 'SUM'],
      ['4', '1', 'TIME'],
      ['5', '1', 'TIME'],
      ['6', '1', 'SUM'],
      ['6', '1', 'TIME'],
      ['7', '1', 'SUM'],
      ['7', '1', 'TIME'],
      ['8', '1', 'SUM'],
      ['8', '1', 'TIME'],
      ['9', '1', 'SUM'],
      ['9', '1', 'TIME'],
      ['10', '1', 'SUM'],
      ['10', '1', 'TIME'],
      ['11', '1', 'SUM'],
      ['11', '1', 'TIME'],
      ['12', '1', 'SUM'],
      ['13', '1', 'SUM'],
      ['14', '1', 'SUM'],
      ['16', '1', 'SUM'],

      ['17', '1', 'SUM'],
      ['18', '1', 'SUM'],
      ['19', '1', 'SUM'],
      ['20', '1', 'SUM'],

      ['24', '1', 'SUM'],
      ['24', '4', 'SUM'],
      ['24', '5', 'SUM'],
      ['24', '6', 'SUM'],
      ['24', '1', 'TIME'],

      ['40', '1', 'SUM'],
      ['48', '1', 'SUM'],

      ['21', '1', 'SUM'],
      ['23', '1', 'SUM'],
      ['33', '1', 'SUM'],
      ['33', '1', 'TIME'],
      ['36', '1', 'SUM'],
      ['57', '1', 'SUM'],
      ['73', '1', 'SUM'],
      ['140', '1', 'SUM'],
      ['149', '1', 'SUM']
    ]
  }
]
