/* global AC UB $App appAC */

exports.formCode = {
  initComponentDone,
  onFormDataReady,
  onAfterSave,
  changeGridValue,
  showChangeForm
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.attr.orgID.setValueById(appAC.globalOrganization())
  }
}

function onAfterSave () {
  const me = this
  me.down('ubdetailgrid').getStore().load()
}

function showChangeForm (me, grid, permType, attrName, sourceData) {

}

function changeGridValue (me, grid) {
  UB.Repository('hr_department')
    .attrs(['mi_data_id', 'description'])
    .where('orgID', '=', me.attr.orgID.getValue())
    .where('state', '=', 'ACTIVE')
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('mi_dateFrom', '<=', appAC.globalApplicationDate())
    .where('mi_dateTo', '>=', appAC.globalApplicationDate())
    .orderBy('description')
    .selectAsObject({'mi_data_id': 'ID'}).then(sourceData => {
      UB.Repository('hr_dictMultiGroupDep')
        .attrs(['ID', 'departmentID'])
        .where('dictMultiGroupID', '=', me.instanceID)
        .selectAsObject({
          'departmentID': 'value'
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
                    entity: 'hr_dictMultiGroup',
                    method: 'updateDictMultiGroupDep',
                    dictMultiGroupID: me.instanceID,
                    data: JSON.stringify(data)
                  }).then(() => {
                    grid.getStore().load()
                  })
                }
              }
            }
          })
        })
    })
}
