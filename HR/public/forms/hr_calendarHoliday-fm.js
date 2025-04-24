/* global UB  $App */
exports.formCode = {
  initComponentStart,
  changeGridValue,
  showChangeForm,
  onAfterSave
}

function initComponentStart () {
  const me = this
  me.on('afterSave', me.onAfterSave, me)
}

function onAfterSave () {
  const me = this
  const parentForm = me.sender && me.sender.up('form')
  if (parentForm) {
    parentForm.onPeriodHolidayChange(parentForm)
  }
}

function changeGridValue (me, grid) {
  UB.Repository('hr_organization')
    .attrs(['mi_data_id', 'description'])
    .where('state', '=', 'ACTIVE')
    .orderBy('description')
    // .where('mi_data_id', '=', appAC.globalOrganization() || 0)
    .selectAsObject({
      'mi_data_id': 'ID'
    }).then(result => {
      me.showChangeForm(me, grid, '1', 'orgID', result)
    })
}

function showChangeForm (me, grid, permType, attrName, sourceData) {
  UB.Repository('hr_calendarHolidayDt')
    .attrs(['ID', attrName])
    .where('calendarHolidayID', '=', me.instanceID)
    .selectAsObject({
      [attrName]: 'value'
    })
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_elementSelect',
        cmpInitConfig: {
          sourceData,
          selectData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_calendarHoliday',
                method: 'updateCalendarHolidayDt',
                calendarHolidayID: me.instanceID,
                data: JSON.stringify(data)
              }).then(() => {
                grid.getStore().load()
              })
            }
          }
        }
      })
    })
}
