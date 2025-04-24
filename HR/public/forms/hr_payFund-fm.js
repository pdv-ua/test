/* global appAC AC UB $App */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onClose,
  onFormDataReady,
  setPayElEntry,
  setPayElExclude,
  changeGridValue,
  setTimeCost,
  setFundSource
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('aftersave', onAfterSave, me)
}

function initComponentDone () {
  const me = this
  me.actions.fDelete.hide()
  AC.viewUtils.setAttr(me)
}

function onAfterSave () {
  this.method = undefined
}

function onClose (ID, store, formWasSaved) {
  const me = this
  if (me.method === 'copyRecord' && !formWasSaved) {
    $App.connection.run({
      entity: 'hr_payFund',
      method: 'delete',
      execParams: {
        ID: me.instanceID
      }
    }).then(() => {
      me.sourceGrid && me.sourceGrid.onRefresh()
    })
  } else {
    me.sourceGrid && me.sourceGrid.onRefresh()
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('calcPeriod', 'SALARY')
    me.record.set('sequence', 0)
  }
  if (me.record.get('payFundMethodID.code') === '1') {
    me.attr.typeTaxECBID.setAllowBlank(false)
    me.attr.addMinSum.show()
    me.down('tabpanel').down('[itemId=fundRate]').tab.hide()
    me.down('tabpanel').down('[itemId=fundCategory]').tab.show()
    me.down('tabpanel').down('[itemId=fundExclude]').tab.show()
  } else {
    me.attr.typeTaxECBID.setAllowBlank(true)
    me.attr.addMinSum.hide()
    me.down('tabpanel').down('[itemId=fundRate]').tab.show()
    me.down('tabpanel').down('[itemId=fundCategory]').tab.hide()
    me.down('tabpanel').down('[itemId=fundExclude]').tab.hide()
  }
  if (me.method === 'copyRecord') {
    me.record.set('code', null)
    me.record.set('name', null)
  }
  me.attr.dictProgClassID[AC.settings.get('hrProgClassAcc', appAC.globalOrganization()) ? 'show' : 'hide']()
  me.attr.dictProjectID[AC.settings.get('hrProjectAcc', appAC.globalOrganization()) ? 'show' : 'hide']()
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  switch (field.name) {
    case 'payFundMethodID':
      if (field.getFieldValue('code') === '1') {
        me.attr.typeTaxECBID.setAllowBlank(false)
        me.down('tabpanel').down('[itemId=fundRate]').tab.hide()
        me.down('tabpanel').down('[itemId=fundCategory]').tab.show()
        me.down('tabpanel').down('[itemId=fundExclude]').tab.show()
        me.attr.typeTaxECBID.show()
        me.attr.sequence.show()
        me.attr.addMinSum.show()
      } else {
        me.attr.typeTaxECBID.setAllowBlank(true)
        me.down('tabpanel').down('[itemId=fundRate]').tab.show()
        me.down('tabpanel').down('[itemId=fundCategory]').tab.hide()
        me.down('tabpanel').down('[itemId=fundExclude]').tab.hide()
        me.attr.typeTaxECBID.hide()
        me.attr.sequence.hide()
        me.attr.addMinSum.hide()
      }
      break
  }
}
function setPayElEntry (me, grid) {
  UB.Repository('hr_payFundBase')
    .attrs(['ID', 'payElID'])
    .where('payFundID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          payElEntryType: ['PAYMENT'],
          selectData: result.map(o => o.payElID),
          sourceData: result,
          sourceAttr: 'payElID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_payFund',
                method: 'updatePayElEntry',
                entityDt: 'hr_payFundBase',
                payFundID: me.instanceID,
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
function setPayElExclude (me, grid) {
  UB.Repository('hr_payFundExclude')
    .attrs(['ID', 'payElID'])
    .where('payFundID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          payElEntryType: ['PAYMENT'],
          selectData: result.map(o => o.payElID),
          sourceData: result,
          sourceAttr: 'payElID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_payFund',
                method: 'updatePayElEntry',
                entityDt: 'hr_payFundExclude',
                payFundID: me.instanceID,
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
    case 'dictCategoryECB':
      UB.Repository('hr_dictCategoryECB')
        .attrs(['ID', 'description'])
        .orderBy('description')
        .selectAsObject().then(sourceData => {
          UB.Repository('hr_payFundCategory')
            .attrs(['ID', 'dictCategoryECBID'])
            .where('payFundID', '=', me.instanceID)
            .selectAsObject({
              'dictCategoryECBID': 'value'
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
                        entity: 'hr_payFund',
                        method: 'updateDictCategoryECB',
                        payFundID: me.instanceID,
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
      break
  }
}

function setTimeCost (me, grid) {
  UB.Repository('hr_payFundTimeCost')
    .attrs(['ID', 'dictTimeCostID'])
    .where('payFundID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_timeCostSelect',
        entity: 'hr_timeCostSelect',
        cmpInitConfig: {
          selectData: result.map(o => o.dictTimeCostID),
          sourceData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_payFund',
                method: 'updateTimeCostEntry',
                payFundID: me.instanceID,
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

function setFundSource (me, grid) {
  UB.Repository('ac_fundSource')
    .attrs(['ID', 'name'])
    .orderBy('name')
    .selectAsObject({ 'name': 'description' }).then(sourceData => {
      UB.Repository('hr_payFundSource')
        .attrs(['ID', 'dictFundSourceID'])
        .where('payFundID', '=', me.instanceID)
        .selectAsObject({
          'dictFundSourceID': 'value'
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
                    entity: 'hr_payFund',
                    method: 'updateFundSource',
                    payFundID: me.instanceID,
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
