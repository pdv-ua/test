/* global AC _ UB  $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  controlChanged,
  onBeforeSave,
  setIsDirty,
  showChangeForm,
  changeGridValue
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
}

function setIsDirty (value) {
  const me = this
  me.setActionDisabled('save', !value)
  me.setActionDisabled('saveAndClose', !value)
  me.record.dirty = value
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid', 'accountDimensionsControl'])
  me.attr.paySum.on('blur', changeParams)
  me.attr.rate.on('blur', changeParams)
}

function onBeforeSave () {
  const me = this
  const dimValue = me.attr.dimControl.getValue(true)
  _.forEach(dimValue, (value, key) => {
    if (me.record.get(key) !== value) {
      me.record.set(key, value)
    }
  })
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (!ctrl.getValue()) {
    return
  }
  switch (ctrl.name) {
    case 'rate':
      me.attr.paySum.setValue()
      break
    case 'paySum':
      me.attr.rate.setValue()
      break
  }
}

function setPayElWhereListDate (me) {
  let dateFrom = me.attr.dateFromEmpty.getValue() || me.attr.dateToEmpty.getValue() || null
  let dateTo = me.attr.dateToEmpty.getValue() || me.attr.dateFromEmpty.getValue() || null
  if (dateFrom && dateTo && me.attr.dateFromEmpty.isValid() && me.attr.dateToEmpty.isValid()) {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      'methodID.methodGroupID.groupType': me.record.get('payType'),
      'methodID.code': { value: '33', condition: '<>' },
      'dateTo': { value: dateFrom, condition: '>=' },
      'dateFrom': { value: dateTo, condition: '<=' }
    })
  } else {
    AC.viewUtils.setFilterValue(me.attr.payElID, {
      'methodID.methodGroupID.groupType': me.record.get('payType'),
      'methodID.code': { value: '33', condition: '<>' }
    })
  }
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'payElID':
        onViewChange(me, true)
        break
      case 'dateFromEmpty':
        setPayElWhereListDate(me)
        break
      case 'dateToEmpty':
        setPayElWhereListDate(me)
        break
    }
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('payType', me.sender.ownerCt.payType)
  }
  AC.viewUtils.setFilterValue(me.attr.payElID, {
    'methodID.methodGroupID.groupType': me.record.get('payType'),
    'methodID.code': { value: '33', condition: '<>' }
  })
  me.setTitle(`${me.record.get('payType') === 'PAYMENT' ? 'Постійне нарахування' : 'Постійне утримання'}${me.isNewInstance ? ' (створення)' : ''}`)
  me.attr.dimControl.setValue(me.record.getData())
  onViewChange(me)
  setPayElWhereListDate(me)
}

function onViewChange (me, doClear) {
  const clearPaySum = /^(RATE|DICT)$/.test(me.attr.payElID.getFieldValue('methodID.valuation'))
  const clearRate = /^(SUM|DICT)$/.test(me.attr.payElID.getFieldValue('methodID.valuation'))

  me.attr.paySum[me.record.get('payType') === 'OFFTAKE' || clearPaySum ? 'hide' : 'show']()
  me.attr.rate[me.record.get('payType') === 'OFFTAKE' || clearRate ? 'hide' : 'show']()
  me.attr.dictFundSourceID[me.record.get('payType') === 'OFFTAKE' ? 'hide' : 'show']()
  me.attr.dimControl[me.record.get('payType') === 'OFFTAKE' ? 'hide' : 'show']()
  me.attr.limitSum[['204', '205', '6'].includes(me.attr.payElID.getFieldValue('methodID.code')) ? 'show' : 'hide']()
  if (doClear) {
    clearPaySum && me.attr.paySum.setValue(null)
    clearRate && me.attr.rate.setValue(null)
  }
}

function showChangeForm (me, grid, permType, attrName, sourceData) {
  UB.Repository('hr_payPermDt')
    .attrs(['ID', attrName])
    .where('payPermID', '=', me.instanceID)
    .where('permType', '=', permType)
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
                entity: 'hr_payPerm',
                method: 'updatePayPermDt',
                payPermID: me.instanceID,
                permType,
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
    case 'department':
      me.showChangeForm(me, grid, '4', 'departmentID', [])
      break
    case 'position':
      UB.Repository('hr_dictPosition')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, '3', 'dictPositionID', result)
        })
      break
    case 'dictStaffCat':
      UB.Repository('hr_dictStaffCat')
        .attrs(['ID', 'name'])
        .orderBy('name')
        .selectAsObject({
          'name': 'description'
        }).then(result => {
          me.showChangeForm(me, grid, '2', 'dictStaffCatID', result)
        })
      break
    case 'workPlace': {
      const result = []
      UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').each(record => {
        result.push({
          ID: record.get('code'),
          description: record.get('name')
        })
      })
      me.showChangeForm(me, grid, '5', 'workPlace', result)
      break
    }
    case 'workerType': {
      const result = []
      UB.core.UBEnumManager.getStore('HR_WORKER_TYPE').each(record => {
        result.push({
          ID: record.get('code'),
          description: record.get('name')
        })
      })
      me.showChangeForm(me, grid, '6', 'workerType', result)
      break
    }
    case 'dictEmpCategory':
      UB.Repository('hr_dictEmpCategory')
        .attrs(['ID', 'name'])
        .orderBy('name')
        .selectAsObject({
          'name': 'description'
        }).then(result => {
          me.showChangeForm(me, grid, '11', 'dictEmpCategoryID', result)
        })
      break
  }
}
