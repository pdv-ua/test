/* global AC HR appAC UB UBS */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  initUBComponent,
  onFormDataReady,
  fillData,
  onAfterSave,
  enableControls
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('beforesave', beforeSave, me)
  me.on('afterSave', me.onAfterSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.parentForm = me.sender.up('form')
  createDevFormActions(me)
}

function initUBComponent () {
  const me = this
  me.dataBind = {
    fullFIO: {
      value: '({lastName} || "?") + " " + ({firstName} || "?") + ({middleName} ? " " + {middleName}:"")'
    },
    shortFIO: {
      value: '({lastName} || "?") + " " + ({firstName} || "?")[0].toUpperCase() + "." + ({middleName} ? {middleName}[0].toUpperCase() + "." : "")'
    }
  }
  UBS.dataBinder.applyBinding(me)
}

function fillData () {
  const me = this
  let employeeID = me.record.get('employeeID')
  if (!employeeID) {
    return
  }
  me.record.set('organizationID', appAC.globalOrganization())
  let fields = ['lastName', 'firstName', 'middleName', 'genName', 'datName', 'accusativeName', 'insName', 'locName', 'shortFIO', 'fullFIO']
  UB.Repository('hr_employee').attrs(fields).selectById(employeeID).then(data => {
    fields.forEach(item => {
      me.record.set(item, data[item])
      me.record.set(item + 'Old', data[item])
    })
  })
}

function enableControls () {
  const me = this
  let isEnabled = me.record.get('orderID') === null
  HR.orderManager.enableControls({
    me: me,
    isEnabled: isEnabled
  })
  me.fields.forEach(item => {
    if (item.attributeName.indexOf('Old') !== -1) {
      item.setReadOnly(true)
    }
  })
  me.getField('orderNumberFull').setReadOnly(!isEnabled)
  me.getField('orderDate').setReadOnly(!isEnabled)
}

function onFormDataReady () {
  const me = this
  me.enableControls()
  if (me.record.get('orderID') === null) {
    let orderDocTab = me.down('[name=hr_empOrderDocs]')
    if (orderDocTab) {
      orderDocTab.close()
    }
    if (me.isNewInstance) {
      me.fillData()
    }
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
}

function beforeSave (me, params) {
  params.studForm = me.parentForm && me.parentForm.formCode === 'hr_employeeStud'
}

function onAfterSave () {
  const me = this
  if (me.parentForm && me.parentForm.formCode === 'hr_employeeStud') {
    me.parentForm.loadInstance()
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
