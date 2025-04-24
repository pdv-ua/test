/* global AC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  changeGridValue,
  showChangeForm
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  me.attr.experienceSpecID.getValue() ? me.down('[ubID=orderPanel]').show() : me.down('[ubID=orderPanel]').hide()
}

function controlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'experienceSpecID':
      value ? me.down('[ubID=orderPanel]').show() : me.down('[ubID=orderPanel]').hide()
      break
  }
}

function showChangeForm (me, grid, conditionType, attrName, sourceData) {
  UB.Repository('hr_dictExperienceDt')
    .attrs(['ID', attrName])
    .where('ID', '=', me.instanceID)
    .where('conditionType', '=', conditionType)
    .selectAsObject({
      [attrName]: 'value'
    })
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_elementSelect',
        cmpInitConfig: {
          sourceData,
          selectData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_dictExperience',
                method: 'updateDictExperience',
                dictExperienceID: me.instanceID,
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
    case 'position':
      UB.Repository('hr_dictPosition')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(result => {
          me.showChangeForm(me, grid, '3', 'dictPositionID', result)
        })
      break
    case 'dictExperienceDt':
      UB.Repository('hr_organization')
        .attrs(['mi_data_id', 'description'])
        .where('state', '=', 'ACTIVE')
        .orderBy('description')
        .selectAsObject({
          'mi_data_id': 'ID'
        }).then(result => {
          me.showChangeForm(me, grid, '1', 'organizationID', result)
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
  }
}
