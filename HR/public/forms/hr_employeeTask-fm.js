/* global appAC AC $App, Ext HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  onFormDataReady,
  onCheckValidBeforeSaveForm,
  onControlChanged,
  loadEmployeers
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.gridConfig = {
    detailGrids: ['employeeTaskDt']
  }
  AC.acEditGridManager.init(me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  let grid = me.down('[name=employeeTaskDt]')

  grid.getStore().on('load', store => {
    let record = store.getAt(0)
    const isEnabled = !record || record.get('taskDtState') === 'NEW'
    HR.orderManager.enableControls({
      me: me,
      isEnabled: isEnabled
    })

    if (!isEnabled) {
      me.down('docAttachment').setReadOnly(true)
      const addEmp = me.down('[ubID=btnAddEmp]')
      addEmp.hide()
    }
  })
}

function onControlChanged (field, value) {
  const me = this

  if (me.formDataReady) {
    switch (field.name) {
      case 'dateFrom':
        if (field.getValue() && field.isValid) {
          me.attr.dateTo.setMinValue(AC.dateService.shiftDate(field.getValue()))
        }
        break
      case 'dateTo':
        if (field.getValue() && field.isValid) {
          me.attr.dateFrom.setMaxValue(AC.dateService.shiftDate(field.getValue()))
        }
        break
    }
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)

  let sendToExecution = me.actions.sendToExecution
  if (!sendToExecution) {
    sendToExecution = new Ext.Action({
      actionId: 'sendToExecution',
      eventId: 'sendToExecution',
      iconCls: 'iconSend',
      text: UB.i18n('Надіслати на виконання'),
      handler: function () {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_employeeTask',
          method: 'sendToExecution',
          execParams: {
            ID: me.instanceID
          }
        }).then(mParams => {
          me.setLoading(false)
          me.onRefresh()
        }).catch(e => {
          me.setLoading(false)
          me.onRefresh()
          throw e
        })
      },
      scope: me
    })
    me.actions.sendToExecution = sendToExecution
  }
}

function onFormDataReady () {
  const me = this
  const sendToExecution = me.actions.sendToExecution
  if (me.isNewInstance) {
    sendToExecution.setDisabled(true)
    if (!me.record.get('organizationID')) {
      me.record.set('organizationID', appAC.globalOrganization())
      me.record.set('taskDate', AC.dateService.todayDate())
      me.record.set('dateFrom', AC.dateService.todayDate())
    }
  } else {
    const taskDateSent = me.record.get('taskDateSent')
    sendToExecution.setDisabled(!!taskDateSent)
  }
  me.attr.dateTo.setMinValue(me.record.get('dateFrom') ? AC.dateService.shiftDate(me.record.get('dateFrom')) : null)
  me.attr.dateFrom.setMaxValue(me.record.get('dateTo') ? AC.dateService.shiftDate(me.record.get('dateTo')) : null)
}

function onCheckValidBeforeSaveForm () {
  const me = this
  return Promise.resolve(true)
  if (!me.attr.employeeTaskDt.store.getCount()) {
    $App.dialogInfo(UB.i18n(`Неможливо зберегти, необхідно додати працівників.`))
    return Promise.resolve(false)
  } else {
    return Promise.resolve(true)
  }
}

function loadEmployeers (data, isDelete) {
  const me = this
  const grid = me.down('[name=employeeTaskDt]')

  me.setLoading(true)
  const execParams = {
    entity: 'hr_employeeTaskDt',
    method: 'loadEmployeeList',
    employeeTaskID: me.record.get('ID'),
    taskDtState: 'NEW',
    isDeleteExisting: isDelete,
    records: data.map(o => o.employeeNumberID) || []
  }

  $App.connection.run(execParams)
    .then(() => {
      grid.getStore().load()
      me.setLoading(false)
    })
}
