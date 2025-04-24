/* global appAC AC Blob _ HR $App */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  onControlChanged,
  loadEmployeers
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)

  me.gridConfig = {
    detailGrids: ['receiverList']
  }
  AC.acEditGridManager.init(me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
}

function onFormDataReady () {
  const me = this
  let notificationTermList = ['notificationTerm1', 'notificationTerm2', 'notificationTerm3']
  notificationTermList.forEach(attr => {
    me.attr[attr].hide()
  })
  me.down('[name=receiverListTab]').tab.hide()

  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }

  me.down('[name=receiverListTab]').tab.hide()
  let labelText = 'Складаємо довільний текст нагадування використовуючи наступні «плейсхолдери» (поля, які будуть заповнюватись автоматично з бази)<br>' +
        'Прізвище {{{lastName}}}<br>' +
        'Ім’я {{{firstName}}}<br>' +
        'По батькові {{{middleName}}}<br>' +
        'Повне прізвище та ініціали {{{shortFIO}}}<br>' +
        'Повне ПІБ {{{fullFIO}}}<br>' +
        'Родовий (кого?) {{{genName}}}<br>' +
        'Давальний (кому?) {{{datName}}}<br>' +
        'Знахідний (про кого?) {{{accusativeName}}}<br>' +
        'Орудний (ким?) {{{insName}}}<br>' +
        'Місцевий (на кому?) {{{locName}}}<br>' +
        'Кличний {{{vocName}}}<br>'

  switch (me.attr.notificationKind.getValue()) {
    case 'vocationEvent':
      notificationTermList.forEach(attr => {
        me.attr[attr].show()
      })
      me.down('[name=receiverListTab]').tab.show()
      labelText = labelText + 'Текст сповіщення {{{notificationText}}}<br><br>'
      break
    case 'monthlyExpReminder':
      notificationTermList.forEach(attr => {
        me.attr[attr].setFieldLabel('У співробітника цього місяця змінюється кількість років стажу на')
        me.attr[attr].show()
      })
      me.attr.dictExperienceID.show()
      me.down('[name=receiverListTab]').tab.show()
      labelText = labelText + 'Текст сповіщення {{{notificationText}}}<br><br>'

      break
    case 'declineDocEvent':
      labelText = labelText + 'Зміст резолюції {{{resolutionText}}}<br><br>'
      break
  }
  me.down('[name=textInfoLabel]').setText(labelText +
        'Увага! Зображення мають бути завантажені у форматі .jpg та лише через меню "Вставити". Інакше їх відображення може бути не корректним.', false)
}

function onControlChanged (field, value, oldValue) {
  const me = this

  switch (field.name) {
    case 'notificationKind':
      ['notificationTerm1', 'notificationTerm2', 'notificationTerm3', 'dictExperienceID'].forEach(attr => {
        me.attr[attr].hide()
      })
      me.down('[name=receiverListTab]').tab.hide()
      let labelText = 'Складаємо довільний текст нагадування використовуючи наступні «плейсхолдери» (поля, які будуть заповнюватись автоматично з бази)<br>' +
        'Прізвище {{{lastName}}}<br>' +
        'Ім’я {{{firstName}}}<br>' +
        'По батькові {{{middleName}}}<br>' +
        'Повне прізвище та ініціали {{{shortFIO}}}<br>' +
        'Повне ПІБ {{{fullFIO}}}<br>' +
        'Родовий (кого?) {{{genName}}}<br>' +
        'Давальний (кому?) {{{datName}}}<br>' +
        'Знахідний (про кого?) {{{accusativeName}}}<br>' +
        'Орудний (ким?) {{{insName}}}<br>' +
        'Місцевий (на кому?) {{{locName}}}<br>' +
        'Кличний {{{vocName}}}<br>'

      switch (value) {
        case 'vocationEvent':
          ['notificationTerm1', 'notificationTerm2', 'notificationTerm3'].forEach(attr => {
            me.attr[attr].show()
          })
          me.down('[name=receiverListTab]').tab.show()
          labelText = labelText + 'Текст сповіщення {{{notificationText}}}<br><br>'
          break
        case 'monthlyExpReminder':
          ['notificationTerm1', 'notificationTerm2', 'notificationTerm3'].forEach(attr => {
            me.attr[attr].setFieldLabel('У співробітника цього місяця змінюється кількість років стажу на')
            me.attr[attr].show()
          })
          me.attr.dictExperienceID.show()
          me.down('[name=receiverListTab]').tab.show()
          labelText = labelText + 'Текст сповіщення {{{notificationText}}}<br><br>'

          break
        case 'declineDocEvent':
          labelText = labelText + 'Зміст резолюції {{{resolutionText}}}<br><br>'
          break
      }
      me.down('[name=textInfoLabel]').setText(labelText +
          'Увага! Зображення мають бути завантажені у форматі .jpg та лише через меню "Вставити". Інакше їх відображення може бути не корректним.', false)
      break
  }
}

function loadEmployeers (data, isDelete) {
  const me = this
  me.setLoading(true)
  const gridEmp = me.down('[name=hr_dictMailTmplByEventsDt]')
  const execParams = {
    entity: 'hr_dictMailTmplByEvents',
    method: 'loadEmployeeList',
    organizationID: me.record.get('organizationID'),
    records: data.map(o => o.employeeNumberID) || []
  }
  $App.connection.run(execParams)
    .then(() => {
      gridEmp.getStore().load()
      me.setLoading(false)
    })
}
