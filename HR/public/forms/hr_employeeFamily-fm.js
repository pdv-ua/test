/* global AC HR _ */
exports.formCode = {
  initComponentStart,
  doFormDataReady,
  initComponentDone,
  initUBComponent,
  controlChanged
}

function controlChanged (ctrl, value) {
  const me = this
  switch (ctrl.name) {
    case 'peopleID.birthDate':
      if (ctrl.isValid()) {
        me.attr['peopleID.age'].setValue(AC.dateService.yearsDiff(me.attr['peopleID.birthDate'].getValue(), AC.dateService.currentDate()))
      } else {
        me.attr['peopleID.age'].setValue()
      }

      break
  }
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', doFormDataReady, me)
  me.on('controlChanged', me.controlChanged)
  HR.orderManager.createShowImportAction(me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('recordloaded', function (record, data) {
    const me = this
    if (me.isNewInstance) {
      if (me.defaultValues) {
        _.forEach(me.defaultValues, (value, name) => {
          me.record.set(name, value)
        })
      }
      if (!me.record.get('employeeID') && me.sender) {
        const sender = me.sender
        if (sender) {
          if (sender.attributeName === 'employeeFamilyID') {
            const senderForm = sender.up('form')
            let employeeID = senderForm.record.get('employeeID')
            if (!employeeID && senderForm.getField('employeeNumberID')) {
              employeeID = senderForm.getField('employeeNumberID').getFieldValue('employeeID')
            }
            me.record.set('employeeID', employeeID)
          } else if (sender.xtype === 'ubtableview') {
            const senderGrid = sender.ownerCt
            const empID = AC.viewUtils.getFilterValue(senderGrid, 'employeeID')
            me.record.set('employeeID', empID)
          }
        }
      }
    }
  })
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function initUBComponent () {
  const me = this
  me.sender = me.sender || me.gridSender
  HR.orderManager.setNextRecordMaker(me, [{
    employeeID: value => me.record.get('employeeID')
  }], 4)
}

function doFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  AC.viewUtils.setWhereListProperty(me.attr.peopleID, [
    [ 'employeeID', '=', me.record.get('employeeID') ]
  ], null, [])

  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
}

function createDevFormActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  allActions.menu.add({
    xtype: 'menuseparator'
  })
  allActions.menu.add({
    text: 'View data ' + me.entityName,
    handler: function () {
      AC.entityUtils.showgEntity(me.entityName)
    }
  })
}
