/* global AC UB  $App */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  controlChanged,
  onBeforeSave,
  setIsDirty,
  showChangeForm,
  changeGridValue,
  setPayEl
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
  //   const dimValue = me.attr.dimControl.getValue(true)
  //   _.forEach(dimValue, (value, key) => {
  //     if (me.record.get(key) !== value) {
  //       me.record.set(key, value)
  //     }
  //   })
}

function changeParams (ctrl) {
  //   const me = ctrl.up('form')
  //   if (!ctrl.getValue()) {
  //     return
  //   }
  //   switch (ctrl.name) {
  //     case 'rate':
  //       me.attr.paySum.setValue()
  //       break
  //     case 'paySum':
  //       me.attr.rate.setValue()
  //       break
  //   }
}

function controlChanged (field, value) {
  const me = this
  // if (me.formDataReady) {
  //   switch (field.name) {
  //     case 'payElID':
  //       onViewChange(me, true)
  //       break
  //   }
  // }
}

function onFormDataReady () {
  const me = this
  // AC.viewUtils.setFilterValue(me.attr.payElID, {
  //   'methodID.methodGroupID.code': { value: '3', condition: '=' }
  // })
  // me.setTitle(`${me.record.get('payType') === 'PAYMENT' ? 'Постійне нарахування' : 'Постійне утримання'}${me.isNewInstance ? ' (створення)' : ''}`)
  onViewChange(me)
}

function onViewChange (me, doClear) {
  //   const clearPaySum = /^(RATE|DICT)$/.test(me.attr.payElID.getFieldValue('methodID.valuation'))
  //   const clearRate = /^(SUM|DICT)$/.test(me.attr.payElID.getFieldValue('methodID.valuation'))

  //   me.attr.paySum[me.record.get('payType') === 'OFFTAKE' || clearPaySum ? 'hide' : 'show']()
  //   me.attr.rate[me.record.get('payType') === 'OFFTAKE' || clearRate ? 'hide' : 'show']()
  //   me.attr.dictFundSourceID[me.record.get('payType') === 'OFFTAKE' ? 'hide' : 'show']()
  //   me.attr.dimControl[me.record.get('payType') === 'OFFTAKE' ? 'hide' : 'show']()

  //   if (doClear) {
  //     clearPaySum && me.attr.paySum.setValue(null)
  //     clearRate && me.attr.rate.setValue(null)
  //   }
}

function showChangeForm (me, grid, conditionType, attrName, sourceData) {
  UB.Repository('hr_dictKpiAccrualCond')
    .attrs(['ID', attrName])
    .where('dictKpiAccrualID', '=', me.instanceID)
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
                entity: 'hr_dictKpiAccrual',
                method: 'updateDictKpiAccrualCond',
                dictKpiAccrualID: me.instanceID,
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
  }
}

function setPayEl (me, grid) {
  UB.Repository('hr_dictKpiAccrualPayEl')
    .attrs(['ID', 'payElID'])
    .where('dictKpiAccrualID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          payElEntryType: ['PAYMENT'],
          methodGroupCode: ['3'],
          selectData: result.map(o => o.payElID),
          sourceData: result,
          sourceAttr: 'payElID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_dictKpiAccrual',
                method: 'updatePayEl',
                dictKpiAccrualID: me.instanceID,
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
