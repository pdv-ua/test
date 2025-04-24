/* global AC appAC UB $App */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onControlChanged,
  setPayElEntry,
  setPayFundEntry,
  selectOrgList,
  showOrgList,
  setControlsByIncludeSubOrg
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
  AC.viewUtils.setFilterValue(me.attr.orgAccountID, { organizationID: me.record.get('organizationID') }, ['setDisabled'])
  AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: me.record.get('contractorID') }, ['setDisabled'])
  setControlsByIncludeSubOrg(me)
}

function onControlChanged (field, value) {
  const me = field.up('form')
  switch (field.name) {
    case 'organizationID':
      AC.viewUtils.setFilterValue(me.attr.orgAccountID, { organizationID: value }, ['clearValue', 'setDisabled'])
      break
    case 'contractorID':
      AC.viewUtils.setFilterValue(me.attr.contrAccountID, { organizationID: value }, ['clearValue', 'setDisabled'])
      break
    // case 'includeSubOrg':
    //   const grid = me.down('[name=ogranization]')
    //   me.setControlsByIncludeSubOrg(me, grid)
    //   break
  }
}

function setPayElEntry (me, grid, entityName) {
  UB.Repository(entityName)
    .attrs(['ID', 'payElID', 'dateFrom', 'dateTo'])
    .where('ownerID', '=', me.instanceID)
    .orderBy('dateFrom', 'asc')
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelectWithPeriod',
        cmpInitConfig: {
          withPeriod: true,
          sourceData: result,
          sourceAttr: 'payElID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length || data.update.length) {
              $App.connection.run({
                entity: 'hr_payObligatory',
                method: 'updatePayElEntry',
                ownerID: me.instanceID,
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

function setPayFundEntry (me, grid, entityName) {
  UB.Repository(entityName)
    .attrs(['ID', 'fundID', 'dateFrom', 'dateTo'])
    .where('ownerID', '=', me.instanceID)
    .orderBy('dateFrom', 'asc')
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payFundSelectWithPeriod',
        cmpInitConfig: {
          withPeriod: true,
          sourceData: result,
          sourceAttr: 'fundID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length || data.update.length) {
              $App.connection.run({
                entity: 'hr_payObligatory',
                method: 'updatePayFundEntry',
                ownerID: me.instanceID,
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

function selectOrgList (me, grid) {
  UB.Repository('ac_organization')
    .attrs(['ID', 'description'])
    .orderBy('description')
    .selectAsObject()
    .then(result => {
      me.showOrgList(me, grid, result)
    })
}

function showOrgList (me, grid, sourceData) {
  UB.Repository('hr_payObligatoryOrg')
    .attrs(['ID', 'orgID'])
    .where('payObligatoryID', '=', me.instanceID)
    .selectAsObject({
      'orgID': 'value'
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
                entity: 'hr_payObligatory',
                method: 'updatePayObligatoryOrg',
                payObligatoryID: me.instanceID,
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

function setControlsByIncludeSubOrg (me, grid = null) {
  const orgID = appAC.globalOrganization() // me.record.get('orgID')
  if (!AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')) {
  } else {
    UB.Repository('ac_organization')
      .attrs(['ID'])
      .limit(1)
      .where('parentID', '=', orgID)
      .selectAsObject()
      .then(result => {
        const hasSubOrg = !!result.length
        const tabs = me.down('[name=tabs]')
        const child = tabs.child('[name=tabOrgList]')
        const { tab } = child
        if (tab) {
          if (hasSubOrg) {
            if (grid) {
              grid.getStore().load()
              tabs.setActiveTab(1)
            }
            tab.show()
          } else {
            const activeTab = tabs.getActiveTab()
            if (activeTab.name === 'tabOrgList') {
              tabs.setActiveTab(0)
            }
            tab.hide()
          }
        }
      })
  }
}
