/* global $App UB */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onClose,
  showChangeForm,
  changeGridValue,
  onControlChanged
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  me.attr = {
    calcRuleID: me.down('[name=calcRuleID]'),
    rate: me.down('[name=rate]'),
    maxRate: me.down('[name=maxRate]'),
    // dictPupilID: me.down('[name=dictPupilID]'),
    // dictSubjectID: me.down('[name=dictSubjectID]'),
    isAutoAdd: me.down('[name=isAutoAdd]'),
    isAutoHours: me.down('[name=isAutoHours]')
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    const dictAccrualID = me.sender.up('trf_dictAccrualDtList').customParams.dictAccrualID
    me.record.set('dictAccrualID', dictAccrualID)
  }

  const methodIDCode = me.sender.up('trf_dictAccrualDtList').customParams['methodID.code']

  if (['1', '5', '6'].includes(methodIDCode)) {
    me.attr.calcRuleID.hide()
  }
  if (['1', '5', '6'].includes(methodIDCode)) {
    me.attr.rate.hide()
    me.attr.rate.setAllowBlank(true)
  } else {
    me.attr.rate.show()
    me.attr.rate.setAllowBlank(false)
  }
  if (['143'].includes(methodIDCode)) {
    me.attr.calcRuleID.hide()
    me.attr.maxRate.hide()
    // me.attr.rate.setFieldLabel(UB.i18n('Коефіцієнт'))
  }
  if (['1', '5', '6'].includes(methodIDCode)) {
    me.attr.maxRate.hide()
  }
  if (['145', '147', '156'].includes(methodIDCode)) {
    // me.attr.dictPupilID.hide()
  }
  if (['1', '4', '5', '6', '144', '152', '154', '155'].includes(methodIDCode)) {
    // me.attr.dictPupilID.hide()
  }
  if (['1', '4', '5', '6', '144', '152', '154', '155'].includes(methodIDCode)) {
    // me.attr.dictSubjectID.hide()
  }
  if (!['144', '152', '148', '4', '6', '154', '155'].includes(methodIDCode)) {
    me.attr.isAutoAdd.hide()
  }
  if (!['148'].includes(methodIDCode)) {
    me.attr.isAutoHours.hide()
  }
  if (['8'].includes(me.attr.calcRuleID.getValue())) {
    me.attr.maxRate.setValue()
    me.attr.maxRate.hide()
  } else {
    me.attr.maxRate.show()
  }
}

function onControlChanged (ctrl, value) {
  const me = this
  if (['8'].includes(value)) {
    me.attr.maxRate.setValue()
    me.attr.maxRate.hide()
  } else {
    me.attr.maxRate.show()
  }
}
function onClose (ID, store, formWasSaved) {
  const me = this
  if (me.method === 'copyRecord' && !formWasSaved) {
    $App.connection.run({
      entity: 'trf_dictAccrualDt',
      method: 'deleteRecord',
      params: {
        entityName: 'trf_dictAccrualDt',
        safe: false,
        ID: me.instanceID
      }
    }).then(() => {
      me.sourceGrid && me.sourceGrid.onRefresh()
    })
  } else {
    me.sourceGrid && me.sourceGrid.onRefresh()
  }
}

function changeGridValue (me, grid) {
  switch (grid.name) {
    case 'organization':
      UB.Repository('hr_organization')
        .attrs(['mi_data_id', 'description'])
        .where('state', '=', 'ACTIVE')
        .orderBy('description')
        .selectAsObject({
          'mi_data_id': 'ID'
        }).then(result => {
          me.showChangeForm(me, grid, '1', 'orgID', result)
        })
      break
    case 'position':
      UB.Repository('hr_dictPosition')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, '3', 'dictPositionID', result)
        })
      break
    case 'qualification':
      UB.Repository('trf_dictQualification')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, '8', 'dictQualificationID', result)
        })
      break
    case 'subject':
      UB.Repository('trf_dictSubject')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, '9', 'dictSubjectID', result)
        })
      break
    case 'pupil':
      UB.Repository('trf_dictPupil')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, '10', 'dictPupilID', result)
        })
      break
  }
}

function showChangeForm (me, grid, conditionType, attrName, sourceData) {
  UB.Repository('trf_dictAccrualCond')
    .attrs(['ID', attrName])
    .where('dictAccrualDtID', '=', me.instanceID)
    .where('conditionType', '=', conditionType)
    .selectAsObject({
      [attrName]: 'value'
    })
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: grid.name === 'department' ? 'hr_departmentSelect' : 'hr_elementSelect',
        cmpInitConfig: {
          sourceData,
          selectData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'trf_dictAccrual',
                method: 'updateDictAccrualCond',
                dictAccrualDtID: me.instanceID,
                conditionType,
                data: JSON.stringify(data)
              }).then(() => {
                grid.getStore().load()
              })
            }
          }
        }
      })
    })
}
