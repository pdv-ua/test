/* global appAC AC */
exports.formCode = {
  initComponentStart,
  onFormDataReady,
  initComponentDone,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
  AC.viewUtils.setFilterValue(me.attr.employeeNumberList, { orgID: me.attr.organizationID.getValue() || 0 })
  me.attr.employeeNumberList.setReadOnly(!(me.attr.organizationID.getValue() && me.attr.organizationID.getValue() === appAC.globalOrganization()))
  me.attr.requestTextInfoPanel = me.down('[name=requestTextInfoLabel]')
  setValueRequestTextInfoLabel(me)
}
function setValueRequestTextInfoLabel (me) {
  let defaultText = 'Складаємо довільний текст заяви використовуючи наступні «плейсхолдери» (поля, які будуть заповнюватись автоматично з бази)<br>' +
  'Прізвище {{lastName}}<br>' +
  'Ім’я {{firstName}}<br>' +
  'По батькові {{middleName}}<br>' +
  'Повне прізвище та ініціали {{shortFIO}}<br>' +
  'Повне ПІБ {{fullFIO}}<br>' +
  'Родовий (кого?) {{genName}}<br>' +
  'Давальний (кому?) {{datName}}<br>' +
  'Знахідний (про кого?) {{accusativeName}}<br>' +
  'Орудний (ким?) {{insName}}<br>' +
  'Місцевий (на кому?) {{locName}}<br>' +
  'Кличний {{vocName}}<br>' +
  'Дата з {{dateFrom}}<br>' +
  'Дата по {{dateTo}}<br>' +
  'Причина {{reason}}<br>'
  const lastRow = 'нерозривний пробіл &'
  if ((me.attr.requestType.getValue() === 'REQUEST_UNIVERSAL') && (me.attr.isDateFrom.getValue()) && (me.attr.isDateTo.getValue())) {
    defaultText = defaultText + 'Кількість днів {{dayCount}}<br>'
  }
  defaultText = defaultText + lastRow
  me.attr.requestTextInfoPanel.setText(defaultText, false)
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'organizationID':
      me.attr.employeeNumberList.setReadOnly(!(value && value === appAC.globalOrganization()))
      me.attr.employeeNumberList.setValue()
      AC.viewUtils.setFilterValue(me.attr.employeeNumberList, { orgID: me.attr.organizationID.getValue() || 0 })

      break
    case 'procRule':
      if (me.attr.procRule.getValue() === 'TIMESHEET' && me.attr.requestType.getValue() === 'REQUEST_UNIVERSAL') {
        me.attr.dictTimeCostID.setAllowBlank(false)
        me.attr.isDateFrom.setValue(true)
        me.attr.isDateFrom.setReadOnly(true)
        me.attr.isDateTo.setValue(true)
        me.attr.isDateTo.setReadOnly(true)
      } else {
        me.attr.isDateTo.setReadOnly(false)
        me.attr.isDateFrom.setReadOnly(false)
        me.attr.dictTimeCostID.setAllowBlank(true)
      }
      break
    case 'requestType':
      if (me.attr.procRule.getValue() === 'TIMESHEET' && me.attr.requestType.getValue() === 'REQUEST_UNIVERSAL') {
        me.attr.dictTimeCostID.setAllowBlank(false)
        me.attr.isDateFrom.setValue(true)
        me.attr.isDateFrom.setReadOnly(true)
        me.attr.isDateTo.setValue(true)
        me.attr.isDateTo.setReadOnly(true)
      } else {
        me.attr.isDateTo.setReadOnly(false)
        me.attr.isDateFrom.setReadOnly(false)
        me.attr.dictTimeCostID.setAllowBlank(true)
      }
      break
  }
}
