module.exports = [
  {
    entity: 'hr_payElExperience',
    identifier: ['payElID', 'years', 'months', 'rate'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payElExperience').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      payElID: { associatedEntity: 'hr_payEl', codeAttr: 'code' }
    },
    attrs: ['payElID', 'years', 'months', 'rate'],
    items: [
      ['6', 1, 0, 5],
      ['6', 2, 0, 10],
      ['6', 3, 0, 15],
      ['6', 4, 0, 20],
      ['17', 0, 0, 50],
      ['17', 3, 0, 60],
      ['17', 5, 0, 70],
      ['17', 8, 0, 100],
      ['18', 0, 0, 50],
      ['18', 3, 0, 60],
      ['18', 5, 0, 70],
      ['18', 8, 0, 100],
      ['19', 0, 0, 50],
      ['19', 3, 0, 60],
      ['19', 5, 0, 70],
      ['19', 8, 0, 100],
      ['20', 0, 0, 50],
      ['20', 3, 0, 60],
      ['20', 5, 0, 70],
      ['20', 8, 0, 100],
      ['40', 0, 0, 50],
      ['40', 3, 0, 60],
      ['40', 5, 0, 70],
      ['40', 8, 0, 100],
      ['48', 0, 0, 50],
      ['48', 3, 0, 60],
      ['48', 5, 0, 70],
      ['48', 8, 0, 100],
      ['149', 0, 0, 50],
      ['149', 3, 0, 60],
      ['149', 5, 0, 70],
      ['149', 8, 0, 100]
    ]
  }
]
