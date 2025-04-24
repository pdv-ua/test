/* global AC */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('beforesave', function (ctrl, params) {
    if (!params.execParams.docID && me.customParams.parentNode && me.customParams.parentNode.raw.ID) {
      params.execParams[me.up('recpanel').parentField] = me.customParams.parentNode.raw.ID
    }
  })
  me.on('afterrender', function (ctrl, params) {
    let parentForm = me.up('form')
    let empOrderType = parentForm ? parentForm.record.get('empOrderType') : null
    if (!empOrderType) {
      parentForm = me.sender.up('form')
      if (parentForm && parentForm.recPanel) {
        empOrderType = parentForm.recPanel._empOrderType
      }
    }
    if (empOrderType !== 'STAFFTABLE') {
      let stageKind = me.getField('stageKind')
      let store = stageKind.getStore()
      store.clearFilter()
      store.filter((row) => {
        return !row.get('code').toUpperCase().includes('_EXT')
      })
    }
  })
  me.on('beforeClose', ctrl => {
    if (me.sender) {
      const grid = me.sender.getStore ? me.sender : (me.sender.panel && me.sender.panel.getStore) ? me.sender.panel : null
      if (grid) {
        grid.getStore().load()
      }
    }
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  const orderForm = me.up('[formCode=hr_empOrder]')
  let readOnly = false
  if (orderForm && orderForm.allowChangeDocument) {
    readOnly = ['ON_RECONCILATION', 'RECONCILED', 'POSTED'].includes(orderForm.record.get('orderState')) || !orderForm.allowChangeDocument()
  }
  if (!readOnly) {
    readOnly = ['WAIT_RESOLUTION', 'COMPLETED'].includes(me.record.get('mi_wfState'))
  }
  let grid = me.down('ubdetailgrid')
  me.makeGridReadonly(grid, readOnly)
  grid.actions.edit.setDisabled(readOnly)
  grid.setReadOnly(readOnly)
  if (readOnly) {
    me.disableEdit()
    me.actions.fDelete.disable()
  } else {
    me.enableEdit()
    me.actions.fDelete.enable()
  }
  // template
  if (me.record.get('recstageTemplateID')) {
    let grid = me.down('[name=orderRegistryDt]')
    let vCol
    grid.columns.forEach(col => {
      if (col.dataIndex !== 'employeePosition.description') {
        col.hide()
      } else {
        vCol = col
      }
    })
    vCol.flex = 1
    vCol.setText(UB.i18n('Учасник'))
    vCol.setWidth(200)
  }
}
