/* global AC _ UB appAC $App */
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

function setPayFundWhereListDate (me) {
  let dateFrom = me.attr.dateFromEmpty.getValue() || me.attr.dateToEmpty.getValue() || null
  let dateTo = me.attr.dateToEmpty.getValue() || me.attr.dateFromEmpty.getValue() || null
  if (dateFrom && dateTo && me.attr.dateFromEmpty.isValid() && me.attr.dateToEmpty.isValid()) {
    AC.viewUtils.setFilterValue(me.attr.payFundID, {
      'dateTo': { value: dateFrom, condition: '>=' },
      'dateFrom': { value: dateTo, condition: '<=' },
      isAutoCalc: 1
    })
  } else {
    AC.viewUtils.setFilterValue(me.attr.payFundID, {
      isAutoCalc: 1
    })
  }
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'payFundID':
        break
      case 'dateFromEmpty':
        setPayFundWhereListDate(me)
        break
      case 'dateToEmpty':
        setPayFundWhereListDate(me)
        break
    }
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {

  }
  me.attr.dimControl.setValue(me.record.getData())
  setPayFundWhereListDate(me)
}

function showChangeForm (me, grid, permType, attrName, sourceData) {
  UB.Repository('hr_fundPermDt')
    .attrs(['ID', attrName])
    .where('fundPermID', '=', me.instanceID)
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
                entity: 'hr_fundPerm',
                method: 'updateFundPermDt',
                fundPermID: me.instanceID,
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
      case 'tabnum':
        UB.Repository('hr_employeeNumberS')
          .attrs(['ID', 'description'])
          .orderBy('description')
          .where('orgID', '=', appAC.globalOrganization())
          .where('tabNumIndex', '=', 0)
          .selectAsObject().then(result => {
            me.showChangeForm(me, grid, '7', 'tabNumID', result)
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
