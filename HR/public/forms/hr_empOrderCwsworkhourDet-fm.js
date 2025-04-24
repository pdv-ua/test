/* global HR AC $App appAC */
exports.formCode = {
  setTitleByOrderType,
  initComponentStart,
  initComponentDone,
  loadEmployeers,
  initWorkSchedule,
  onFormDataReady,
  enableControls,
  controlChanged
}

function setTitleByOrderType () {
  this.orderForm.setTitleByOrderType(this)
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
}

function onFormDataReady () {
  const me = this
  AC.viewUtils.setWhereListProperty(me.attr.workScheduleID,
    [ ['organizationID', 'isNull', null, 'orgIsNull'],
      ['organizationID', '=', me.record.get('orgID') || appAC.globalOrganization(), 'orgID']
    ],
    ['(([orgIsNull]) OR ([orgID]))'],
    ['clearWhereList']
  )
  me.enableControls()
}

function initComponentDone () {
  let me = this
  let sender = me.sender

  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (me.orderForm) {
    me.orderState = me.orderForm.record.get('orderState')
  } else {
    me.orderState = 'PROJECT'
  }

  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })

  me.on('recordloaded', function (a) {
    let me = this

    me.setTitleByOrderType()

    if (me.isNewInstance) {
      me.record.set('isGroup', 1)
      if (me.orderForm) {
        me.record.set('orderID', me.orderForm.instanceID)
        me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
        me.record.set('organizationID', me.orderForm.record.get('organizationID'))
      }
      if (me.customParams.empOrderType) {
        me.record.set('empOrderType', me.customParams.empOrderType)
      } else {
        me.record.set('empOrderType', 'CWSWORKHOUR')
      }
    }

    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    HR.orderManager.disabledIf(me)
    HR.orderManager.setDateChecker(me, {
      dateFrom: me.getField('dateFrom'),
      dateTo: me.getField('dateTo')
    })
  })
}

function initWorkSchedule (workScheduleID) {
  const me = this
  if (workScheduleID) {
    me.saveForm().then(result => {
      if (result !== -1) {
        me.setLoading(true)
        $App.connection.run({
          entity: 'hr_empOrderCwsworkhourDet',
          method: 'setInitWorkHour',
          organizationID: me.record.get('organizationID'),
          workScheduleID,
          orderID: me.orderForm.instanceID,
          paraID: me.instanceID
        }).then(() => {
          const grid = me.down('[name=empOrderCwsWorkHourDayDetGrid]')
          grid.getStore().load()
          me.setLoading(false)
        }, err => {
          me.setLoading(false)
          throw err
        })
      }
    })
  }
}

function loadEmployeers (data, isDelete) {
  const me = this
  me.setLoading(true)
  $App.connection.run({
    entity: 'hr_empOrderCwsworkhourDet',
    method: 'loadEmployeeList',
    organizationID: me.record.get('organizationID'),
    orderID: me.orderForm.instanceID,
    paraID: me.instanceID,
    empOrderType: 'CWSWORKHOUR',
    isDeleteExisting: isDelete,
    records: data.map(o => o.employeePositionID) || []
  }).then(() => {
    const gridEmp = me.down('[name=empOrderEmployeeDet]')
    gridEmp.onRefresh()
    me.setLoading(false)
  }, err => {
    me.setLoading(false)
    throw err
  })
}

function enableControls () {
  const me = this
  let isPosted = me.masterForm.enableParaControls(this)

  isPosted && me.down('[name=fillData]').hide()
  this.isReadOnly = isPosted
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'workScheduleID':
        if (me.attr.empOrderCwsWorkHourDayDetGrid.getStore().data.items.length) {
          $App.dialogYesNo('deletionDialogConfirmCaption', 'Буде змінено графік робочогу часу на новий. Ви впевнені?').then(res => {
            if (res) {
              me.initWorkSchedule(value)
            }
          })
        } else {
          me.initWorkSchedule(value)
        }
        break
    }
  }
}
