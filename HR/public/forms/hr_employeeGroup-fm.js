/* global Ext _ AC $App UB appAC HR */
// const dateService = require('../AC/modules/dataServices/dateService')
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  loadEmployees,
  loadActiveEmployee,
  clearEmployees
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onRecordLoaded (record, data) {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  }
}

function onFormDataReady () {
  const me = this

  if (me.attr.isAllEmployees.getValue()) {
    const toolbarGridEmployee = me.down('[name=gridEmployee]').down('toolbar')
    toolbarGridEmployee.items.items.forEach(el => {
      if (el.actionId) el.setDisabled(true)
    })
  }
}

function onControlChanged (field, value) {
  const me = this
  if (me.isInnerControlChange) {
    return
  }
  switch (field.name) {
    case 'otherReasons':
      break
    case 'isAllEmployees':
      if (value) {
        const gridEmployee = me.down('[name=gridEmployee]').getData()
        if (gridEmployee && gridEmployee.length) {
          $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Увага! Список учасників буде очищено. Продовжити?'))
            .then(function (choice) {
              if (choice) {
                me.clearEmployees()
                // me.loadActiveEmployee()
                const toolbarGridEmployee = me.down('[name=gridEmployee]').down('toolbar')
                toolbarGridEmployee.items.items.forEach(el => {
                  if (el.actionId) el.setDisabled(true)
                })
              } else {
                me.attr.isAllEmployees.setValue(!value)
              }
            })
        } else {
          me.clearEmployees()
          // me.loadActiveEmployee()
          const toolbarGridEmployee = me.down('[name=gridEmployee]').down('toolbar')
          toolbarGridEmployee.items.items.forEach(el => {
            if (el.actionId) el.setDisabled(true)
          })
        }
      } else {
        const toolbarGridEmployee = me.down('[name=gridEmployee]').down('toolbar')
        toolbarGridEmployee.items.items.forEach(el => {
          if (el.actionId) el.setDisabled(false)
        })
      }
      break
  }
}

function loadEmployees (data, isDelete) {
  const me = this
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_employeeGroup',
    method: 'loadEmployees',
    employeeGroupID: me.instanceID,
    isDelete,
    dateFrom: me.record.get('dateFrom'),
    items: data.map(o => o.employeeNumberID)
  }).then(() => {
    me.setLoading(false)
    const gridEmp = me.down('[name=gridEmployee]')
    gridEmp.onRefresh()
  }, err => {
    me.setLoading(false)
    throw err
  })
}

function clearEmployees () {
  const me = this
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_employeeGroup',
    method: 'clearEmployees',
    employeeGroupID: me.instanceID
  }).then(() => {
    me.setLoading(false)
    const gridEmp = me.down('[name=gridEmployee]')
    gridEmp.onRefresh()
  }, err => {
    me.setLoading(false)
    throw err
  })
}

function loadActiveEmployee () {
  const me = this
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_employeeGroup',
    method: 'loadActiveEmployees',
    employeeGroupID: me.instanceID,
    dateFrom: me.record.get('dateFrom'),
    orgID: appAC.globalOrganization()
  }).then(() => {
    me.setLoading(false)
    const gridEmp = me.down('[name=gridEmployee]')
    gridEmp.onRefresh()
  }, err => {
    me.setLoading(false)
    throw err
  })
}
