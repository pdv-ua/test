/* global AC appAC HR */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  onBeforeEditGrid,
  onRecordLoaded,
  getReportName
}

function initComponentStart () {
  const me = this
  me.defaultValues = me.defaultValues || {}
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.record.set('empOrderType', 'HRREPORT')
}

function onFormDataReady () {
  const me = this
  setDefaultValues(me)
}

function onRecordLoaded (record, data) {
  const me = this
  AC.viewUtils.setWhereListProperty(me.attr.employeeNumberID,
    [['orgID', '=', appAC.globalOrganization()]],
    undefined, ['clearStore', 'clearWhereList'])
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'employeeNumberID':
      me.record.set('employeeID', field.getFieldValue('employeeID'))
      setDefaultPosition(me, value)
      break
  }
}

function onBeforeEditGrid (rowEditor, context) {
  const me = this
  const editor = rowEditor.editor
  context.grid.optimizeColumnWidth(true)
  const itemIdxCtrl = editor.query('[name=itemIdx]')[0]
  const groupCategoryCtrl = editor.query('[name=groupCategory]')[0]
  const profCompetencyCtrl = editor.query('[name=dictProfCompetencyID.name]')[0]
  const dictTrainingFormCtrl = editor.query(`[name=dictTrainingFormID.name]`)[0]
  const dictTrainingTopicCtrl = editor.query(`[name=dictTrainingTopicID.name]`)[0]
  let groupCategory
  if (context.record.phantom) {
    const positionIDReco = AC.gridUtils.getCurrentRecord(me.attr.positionID)
    groupCategory = (positionIDReco && positionIDReco.get('psCategory')) || me.record.get('groupCategory')
    context.record.set('groupCategory', groupCategory)
  } else {
    groupCategory = context.record.get('groupCategory')
  }
  AC.viewUtils.setWhereListProperty(profCompetencyCtrl, [
    ['groupCategory', 'equal', groupCategory]
  ], undefined, ['clearWhereList'])
  AC.viewUtils.setWhereListProperty(dictTrainingFormCtrl, [
    ['groupCategory', 'equal', groupCategory]
  ], undefined, ['clearWhereList'])
  AC.viewUtils.setWhereListProperty(dictTrainingTopicCtrl, [
    ['dictProfCompetencyID', 'equal', context.record.get('dictProfCompetencyID')]
  ], undefined, ['clearWhereList'])
  itemIdxCtrl.setReadOnly(true)

  groupCategoryCtrl.on('change', ctrl => {
    let grpCat = ctrl.getValue() || '-1'
    AC.viewUtils.setWhereListProperty(profCompetencyCtrl, [
      ['groupCategory', 'equal', grpCat]
    ], undefined, ['clearValue', 'clearStore'])
    AC.viewUtils.setWhereListProperty(dictTrainingFormCtrl, [
      ['groupCategory', 'equal', grpCat]
    ], undefined, ['clearValue', 'clearStore'])
    AC.viewUtils.setWhereListProperty(dictTrainingTopicCtrl, [
      ['dictProfCompetencyID', 'equal', 0]
    ], undefined, ['clearValue', 'clearStore'])
  })
  profCompetencyCtrl.on('change', ctrl => {
    AC.viewUtils.setWhereListProperty(dictTrainingTopicCtrl, [
      ['dictProfCompetencyID', 'equal', ctrl.getFieldValue('ID') || 0]
    ], undefined, ['clearValue', 'clearStore'])
  })
}

function setDefaultValues (me) {
  if (me.isEditMode) {
    return
  }
  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.groupCategory) {
    me.record.set('groupCategory', grid.groupCategory)
    me.attr.groupCategory.setValue(grid.groupCategory)
  }
  me.record.set('organizationID', appAC.globalOrganization())
  setDefaultPosition(me)
}

function setDefaultPosition (me, employeeNumberID) {
  const empID = me.record.get('employeeID')
  const empNumberID = employeeNumberID || me.record.get('employeeNumberID')
  if (!empID) return
  HR.treeUtils.getEmpPosInfo(empID, empNumberID).then(empPosInfo => {
    if (empPosInfo) {
      empPosInfo.departmentID && me.attr.departmentID.setValueById(empPosInfo.departmentID)
      me.attr.positionID.setValueById(empPosInfo.positionID)
    }
  })
}

function getReportName () {
  const me = this
  return me.attr.groupCategory.getValue() === '2' ? 'hr_empTrainingProgram2' : 'hr_empTrainingProgram1'
}
