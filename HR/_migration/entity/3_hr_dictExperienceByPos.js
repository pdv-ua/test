module.exports = [
  {
    entity: 'hr_dictExperienceByPos',
    notDelete: true,
    notUpdate: true,
    identifier: ['positionType', 'dictExperienceID'],
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictExperienceByPos').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      dictExperienceID: { associatedEntity: 'hr_dictExperience', codeAttr: 'code' }
    },
    attrs: [ 'positionType', 'dictExperienceID' ],
    items: [
      ['1', '1'],
      ['1', '4'],
      ['1', '6'],

      ['2', '1'],
      ['2', '4'],

      ['3', '1'],
      ['3', '4'],

      ['4', '1'],
      ['4', '4'],

      ['5', '1'],
      ['5', '4'],

      ['6', '1'],
      ['6', '4'],

      ['7', '1'],
      ['7', '4'],

      ['12', '1'],
      ['12', '4'],

      [null, '1'],
      [null, '4']
    ]
  }
]
