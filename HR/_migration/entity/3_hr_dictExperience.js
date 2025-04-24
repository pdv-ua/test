module.exports = [
  {
    entity: 'hr_dictExperience',
    localeAttr: ['name', 'printName'],
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictExperience').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['code'],
    attrsConfig: {
      methodExpID: { associatedEntity: 'hr_methodExp', codeAttr: 'code' }
    },
    attrs: [ 'code', 'name', 'printName', 'methodExpID', 'experienceSpecID', 'orderNumber', 'orderDate', 'experienceUnits' ],
    items: [
      ['1', 'Загальний стаж', 'Загальний стаж', '99', null, null, null, 'dayСalendar'],
      ['2', 'Неперервний стаж', 'Неперервний стаж', '99', null, null, null, 'dayСalendar'],
      ['3', 'Стаж в організації', 'Стаж в організації', '99', null, null, null, 'dayСalendar'],
      ['4', 'Страховий стаж', 'Страховий стаж', '99', null, null, null, 'dayСalendar'],
      ['5', 'Галузевий стаж', 'Галузевий стаж', '99', null, null, null, 'dayСalendar'],
      ['6', 'Стаж державної служби', 'Стаж державної служби', '99', null, null, null, 'dayСalendar'],
      ['7', 'Неперервний стаж державної служби', 'Неперервний стаж державної служби', '99', null, null, null, 'dayСalendar'],
      ['8', 'Спеціальний стаж', 'Спеціальний стаж', '99', null, null, null, 'dayСalendar'],
      ['9', 'Відпустка по догляду за дитиною', 'Відпустка по догляду за дитиною', '99', null, null, null, 'dayСalendar'],
      ['10', 'Стаж у фінансовій системі', 'Стаж у фінансовій системі', '10', null, null, null, 'dayСalendar'],
      ['11', 'Безперервний стаж в організації', 'Безперервний стаж в організації', '11', null, null, null, 'dayСalendar'],
      ['12', 'Стаж на керівних посадах в організації', 'Стаж на керівних посадах в організації', '12', null, null, null],
      ['13', 'Стаж в юридичній службі організації', 'Стаж в юридичній службі організації', '13', null, null, null, 'dayСalendar'],
      ['14', 'Вислуга в державних органах ПО', 'Вислуга в державних органах ПО', '14', null, null, null, 'dayСalendar'],
      ['15', 'Юридичний стаж', 'Юридичний стаж', '15', null, null, null, 'dayСalendar']
    ]
  }
]
