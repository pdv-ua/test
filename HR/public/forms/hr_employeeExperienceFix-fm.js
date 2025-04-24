/* global $App appAC AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  loadEmployeeExperience,
  onBeforeSave

}

function onBeforeSave () {
  // const me = this
  // if (me.isEditMode) {
  return Promise.resolve(true)
  // }
/*
  me.record.set('respEmployeeFIO', me.getField('respEmployeeNumID').getRawValue())
  const expOnDate = me.record.get('expOnDate')
  return UB.Repository(me.entityName)
    .attrs(['ID', 'employeeID.shortFIO', 'employeeID.fullFIO', 'respEmployeeFIO', 'dateFixExperience'])
    .where('employeeID', '=', me.record.get('employeeID'))
    .where('expOnDate', '=', expOnDate)
    .selectSingle().then(data => {
      if (data) {
        return $App.dialogYesNo('Попередження', UB.i18n(`Для працівника {0} станом на {1} вже були зафіксовані стажі (користувач {2}, {3}) . Оновити розрахунок? `, data['employeeID.shortFIO'], moment(expOnDate).format('DD.MM.YYYY'), data.respEmployeeFIO, moment(data.dateFixExperience).format('DD.MM.YYYY')))
      }
      return true
    })
*/
}

// me.attr.grid.store.loadData(data)
function loadEmployeeExperience () {
  const me = this
  const grid = me.down('[name=employeeExperiences]')
  if (me.expData) {
    grid.store.loadData(me.expData)
  } else {
    grid.store.loadData(JSON.parse(me.record.get('descriptionExperience')))
  }
}
function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('recordloaded', () => {
    me.loadEmployeeExperience()
  }, me)
  me.on('beforeClose', () => {
    if (me.sender && me.sender.loadData) {
      me.sender.loadData()
    }
  }, me)

  me.on('beforeDelete', function (a) {
    if (!me.isCreatedNew) {
      // throw new UB.UBAbortError()
    }
  })
}
function initComponentDone () {
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    me.record.set('employeeID', me.employeeID)
    me.record.set('dateFixExperience', new Date())
    me.record.set('respEmployeeNumID', $App.connection.userData().employeeNumberID)
    me.record.set('expOnDate', AC.dateService.shiftDate(me.expOnDate))
    me.isCreatedNew = true
  } else {
    if (!me.isCreatedNew) {
      me.getField('dateFixExperience').setReadOnly(true)
      // me.query('[attributeName]').forEach(item => item.setReadOnly(true))
      // me.actions.fDelete.setDisabled(true)
      // me.actions.fDelete.hide()
    }
  }
  if (me.expData) {
    me.record.set('descriptionExperience', JSON.stringify(me.expData))
  }
}

function controlChanged (field, value) {
  // const me = this
}
