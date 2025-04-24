/* global appAC AC Ext UB $App */

exports.formCode = {
  initComponentStart,
  initComponentDone
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}
function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function onFormDataReady () {
  const me = this
  const entryDate = AC.dateService.todayDate()
  const tb = me.down('toolbar')
  if (!me.down('[ubID=btnNextMenu]')) {
    tb.insert(4,
      Ext.create('Ext.Button', {
        ubID: 'btnNextMenu',
        xtype: 'button',
        text: UB.i18n('Додати ще (F7)'),
        handler: function () {
          makeNextRecord(me)
        }
      }))
    const wnd = me.getFormWin() || me.up()
    Ext.util.KeyMap({
      target: (wnd && wnd.getEl()) || me,
      binding: [{
        key: Ext.EventObject.F7,
        fn: function (keyCode, e) {
          makeNextRecord(me)
        }
      }]
    })
  }

  me.attr.departmentID.store.ubRequest.__mip_ondate = entryDate
  delete me.attr.departmentID.store.ubRequest.__mip_recordhistory_all
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('payObligatoryID.organizationID') || appAC.globalOrganization() })
  me.attr.positionID.store.ubRequest.__mip_ondate = entryDate
  delete me.attr.positionID.store.ubRequest.__mip_recordhistory_all
  AC.viewUtils.setWhereListProperty(me.attr.positionID, [
    ['parentUnitID', '=', me.record.get('departmentID')],
    [ 'orgID', '=', me.record.get('payObligatoryID.organizationID') || appAC.globalOrganization() ]
  ], null, [])
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('payObligatoryID.organizationID') || appAC.globalOrganization() })
  AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: me.record.get('contractorID') }, ['setDisabled'])
  me.down('[name=parentTreeDepName]').setText(me.record.get('departmentID.parentTreeDepName'))
  setEmployeePositionFilter(me, me.record.get('departmentID'), me.record.get('positionID'), me.record.get('dictPositionID'))
  if (me.isNewInstance && me.defaultValues) {
    me.record.set('payObligatoryID', me.defaultValues.payObligatoryID)
    me.attr.contractorID.skipChange = true
    me.attr.contractorID.setValueById(me.defaultValues.contractorID)
    me.attr.contrAccountID.setValueById(me.defaultValues.contrAccountID)
  } else if (me.isNewInstance && me.record.get('departmentID')) {
    me.attr.departmentID.clearValue()
  }
  if (AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())) {
    me.attr.positionID.show()
  } else {
    me.attr.positionID.hide()
  }
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'departmentID':
      me.down('[name=parentTreeDepName]').setText(field.getFieldValue('parentTreeDepName'))
      AC.viewUtils.setWhereListProperty(me.attr.positionID, [
        ['orgID', '=', me.record.get('payObligatoryID.organizationID') || appAC.globalOrganization()],
        ['parentUnitID', '=', value],
        ['state', '=', 'ACTIVE']
      ], null, ['clearWhereList', 'clearValue', 'clearStore'])
      setEmployeePositionFilter(me, value, me.record.get('positionID'), me.record.get('dictPositionID'), true)
      me.attr.dictPositionID.clearValue()
      break
    case 'positionID':
      setEmployeePositionFilter(me, me.record.get('departmentID'), value, me.record.get('dictPositionID'), true)
      me.attr.dictPositionID.setValueById(field.getFieldValue('dictPositionID'))
      break
    case 'dictPositionID':
      setEmployeePositionFilter(me, me.record.get('departmentID'), me.record.get('positionID'), value, true)
      break
    case 'contractorID':
      AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: value }, me.attr.contractorID.skipChange ? [] : ['clearValue', 'setDisabled'])
      me.attr.contractorID.skipChange = false
      break
    case 'employeePositionID':
      me.attr.employeeNumberID.setValue(field.getFieldValue('employeeNumberID'))
      break
  }
}

function setEmployeePositionFilter (me, departmentID, positionID, dictPositionID, clearValue) {
  const employeePositionFilter = {
    organizationID: me.record.get('payObligatoryID.organizationID') || appAC.globalOrganization(),
    dateTo: { value: appAC.globalApplicationDate(), condition: '>=' },
    dateFrom: { value: appAC.globalApplicationDate(), condition: '<=' }
  }
  if (departmentID) {
    employeePositionFilter.departmentID = departmentID
  }
  if (positionID) {
    employeePositionFilter.positionID = positionID
  }
  if (dictPositionID) {
    employeePositionFilter.dictPositionID = dictPositionID
  }

  AC.viewUtils.setFilterValue(me.attr.employeePositionID, employeePositionFilter, clearValue ? ['clearValue'] : [])
}

function makeNextRecord (form) {
  const me = form
  me.fromMakeNextRecord = true
  me.saveForm()
    .then(function (saveStatus) {
      if (saveStatus >= 0) {
        const grid = me.sender || AC.gridUtils.getSenderGrid(me)
        const store = grid && grid.getStore && grid.getStore()
        const runParams = {
          cmdType: 'showForm',
          formCode: me.formCode,
          entity: me.entityName,
          instanceID: null,
          isModal: true,
          tabId: null,
          sender: me.gridSender,
          gridSender: me.gridSender,
          cmpInitConfig: {
            gridSender: me.gridSender,
            sender: me.sender,
            defaultValues: {
              payObligatoryID: me.record.get('payObligatoryID'),
              contractorID: me.record.get('contractorID'),
              contrAccountID: me.record.get('contrAccountID')
            }
          }
        }
        if (store) {
          store.load().then(() => {
            $App.doCommand(runParams)
            me.closeWindow(true)
          })
        } else {
          $App.doCommand(runParams)
          me.closeWindow(true)
        }
      }
    })
}
