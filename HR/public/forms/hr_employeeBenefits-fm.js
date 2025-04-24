/* global AC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  docGridBeforeEdit
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  HR.orderManager.createShowImportAction(me)
  if (AC.entityUtils.isAdmin()) {
    createDevFormActions(me)
  }
}

function onFormDataReady () {
  const me = this
  AC.viewUtils.setFilterValue(me.attr.employeeDisabilityID, {
    'employeeID': me.record.get('employeeID')
  })
  AC.viewUtils.setFilterValue(me.attr.employeeFamilyID, {
    'employeeID': me.record.get('employeeID')
  })
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
    me.down('[name=benefitsDoc]').readOnly = true
  }
  if (grid && !grid.employeeNumberID) {
    const tabPanel = me.down('tabpanel')
    tabPanel.items.items.forEach(function (item) {
      if (item.ubID !== 'hr_employeeBenefits') item.tab.hide()
    })
  }
  me.employeeNumberID = grid ? grid.employeeNumberID : null
}

function docGridBeforeEdit (rowEditor, context) {
  if (context.grid.isEditDisabled) {
    return false
  }
  let me = this
  let editor = rowEditor.editor

  let docDescription = editor.query(`[name=employeeDocID.description]`)[0]
  AC.viewUtils.setWhereListProperty(docDescription, [
    ['employeeID', '=', me.record.get('employeeID')]
  ])
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
