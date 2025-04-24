/* global AC UB $App */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  setReportEntry,
  loadReportParams,
  onParamSelect,
  addByList
}

const supportedLists = ['hr_payEl', 'hr_position', 'hr_employeeNumber', 'hr_dictTimeCost']

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
  const me = this

  AC.viewUtils.setAttr(me)

  me.paramGrid = me.down('[name=reportParamGrid]')
  me.reportGrid = me.down('[name=gridReport]')
  me.reportValuesGrid = me.down('[name=reportValuesGrid]')
  me.reportValuesPanel = me.down('[name=reportValuesPanel]')
  me.valuesListBtn = me.down('[name=valuesList]')

  const gridStore = me.reportGrid.getStore()
  gridStore.on('load', (store, data) => {
    me.loadReportParams(data)
  })
}

function onFormDataReady () {
  const me = this
  me.onParamSelect(null)
}

function setReportEntry (me, grid) {
  UB.Repository('hr_dictReport')
    .attrs(['ID', 'name'])
    .selectAsObject()
    .then(result => {
      const selectedData = grid.getData().map(o => {
        return { value: o['dictReportID'], name: o['dictReportID.name'], description: o['dictReportID.name'], ID: o.ID }
      })
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_elementSelect',
        cmpInitConfig: {
          sourceData: result,
          selectData: selectedData,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              $App.connection.run({
                entity: 'hr_groupReport',
                method: 'updateReportEntry',
                groupReportID: me.instanceID,
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

async function loadReportParams () {
  const me = this
  const reportParams = await UB.Repository('hr_groupReportParam')
    .attrs('ID', 'reportParamID', 'reportParamID.listParamID', 'reportParamID.listParamID.shortName',
      'reportParamID.listParamID.code', 'reportParamID.listParamID.fullName', 'reportParamID.listParamID.tableName',
      'groupReportDtID.dictReportID.code', 'groupReportDtID.dictReportID.shortName', 'groupReportDtID.dictReportID')
    .where('groupReportDtID.groupReportID', '=', me.instanceID)
    .orderBy('groupReportDtID.orderN')
    .selectAsObject({
      'reportParamID.listParamID': 'listParamID',
      'reportParamID.listParamID.shortName': 'listParamID.shortName',
      'reportParamID.listParamID.fullName': 'listParamID.fullName',
      'reportParamID.listParamID.tableName': 'listParamID.tableName',
      'reportParamID.listParamID.code': 'listParamID.code',
      'groupReportDtID.dictReportID.code': 'reportCode',
      'groupReportDtID.dictReportID.shortName': 'reportName',
      'groupReportDtID.dictReportID': 'dictReportID'
    })
  me.paramGrid.store.loadData(reportParams)
}

function onParamSelect (selectedRow) {
  const me = this
  const store = me.reportValuesGrid.getStore()
  let orgID = appAC.globalOrganization()

  if (!selectedRow || !selectedRow.get('ID')) {
    me.attr.currentParamFld.setValue('')
    me.reportValuesGrid.parentContext = {
      listParamID: null,
      orgID: null
    }
    store.ubRequest.tableNameForMapping = null
    store.ubRequest.whereList.byParam = {
      expression: '[listParamID]',
      condition: 'isNull'
    }
    store.ubRequest.whereList.byOrg = {
      expression: '[orgID]',
      condition: 'isNull'
    }
    me.reportValuesPanel.hide()
  } else {
    me.attr.currentParamFld.setValue(selectedRow.get('listParamID.fullName'))
    me.reportValuesGrid.parentContext = {
      listParamID: selectedRow.get('listParamID'),
      listParamCode: selectedRow.get('listParamID.code'),
      orgID: orgID
    }
    store.ubRequest.tableNameForMapping = selectedRow.get('listParamID.tableName')
    store.ubRequest.whereList.byParam = {
      expression: '[listParamID]',
      condition: 'equal',
      values: { paramID: me.reportValuesGrid.parentContext.listParamID }
    }
    store.ubRequest.whereList.byOrg = {
      expression: '[orgID]',
      condition: 'equal',
      values: { orgID: me.reportValuesGrid.parentContext.orgID }
    }
    me.valuesListBtn.setVisible(supportedLists.indexOf(store.ubRequest.tableNameForMapping) >= 0)
    if (me.valuesListBtn.isVisible()) {
      me.reportValuesGrid.actions.addNew.hide()
      me.reportValuesGrid.actions.del.hide()
    } else {
      me.reportValuesGrid.actions.addNew.show()
      me.reportValuesGrid.actions.del.show()
    }
    me.reportValuesPanel.show()
  }
  me.reportValuesGrid.onRefresh()
}

function addByList () {
  const me = this
  if (supportedLists.indexOf(me.reportValuesGrid.store.ubRequest.tableNameForMapping) < 0) {
    return
  }
  UB.Repository('hr_idParam')
    .where('[listParamID]', '=', me.reportValuesGrid.parentContext.listParamID)
    .where('[orgID]', '=', me.reportValuesGrid.parentContext.orgID)
    .attrs(['ID', 'valuesID'])
    .selectAsObject()
    .then(result => {
      switch (me.reportValuesGrid.store.ubRequest.tableNameForMapping) {
        case 'hr_payEl':
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_payElSelect',
            cmpInitConfig: {
              withPeriod: true,
              payElEntryType: ['PAYMENT'],
              selectData: result.map(o => o.valuesID),
              sourceData: result,
              sourceAttr: 'valuesID',
              listParamID: me.reportValuesGrid.parentContext.listParamID,
              tabsCode: ['FOZP', 'FDZP', 'ZKV'].includes(me.reportValuesGrid.parentContext.listParamCode) ? ['FOZP', 'FDZP', 'ZKV'] : null,
              orgID: me.reportValuesGrid.parentContext.orgID,
              onSelectData: (data) => {
                if (data.remove.length || data.add.length) {
                  $App.connection.run({
                    entity: 'hr_idParam',
                    method: 'updateValuesIDs',
                    listParamID: me.reportValuesGrid.parentContext.listParamID,
                    orgID: me.reportValuesGrid.parentContext.orgID,
                    data: JSON.stringify(data)
                  }).then(() => {
                    me.reportValuesGrid.getStore().load()
                  })
                }
              }
            }
          })
          break
        case 'hr_position':
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_positionSearch',
            isModal: true,
            cmpInitConfig: {
              orgID: me.reportValuesGrid.parentContext.orgID,
              readOnlyAttr: [],
              onSelect: (data) => {
                const existPositions = []
                data.forEach(row => {
                  if (result.filter(o => o.valuesID === row.mi_data_id).length === 0) {
                    $App.connection.insert({
                      entity: 'hr_idParam',
                      execParams: {
                        orgID: me.reportValuesGrid.parentContext.orgID,
                        listParamID: me.reportValuesGrid.parentContext.listParamID,
                        valuesID: row.mi_data_id
                      }
                    })
                  } else {
                    existPositions.push(row['description'])
                  }
                })
                if (existPositions.length) {
                  $App.dialogInfo(UB.i18n(`Посади які вже були додані раніше </br> {0}`, existPositions.join('</br>')))
                }
                me.reportValuesGrid.getStore().load()
              }
            }
          })
          break
        case 'hr_employeeNumber':
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_employeeNumberSearch',
            isModal: true,
            cmpInitConfig: {
              orgID: me.reportValuesGrid.parentContext.orgID,
              readOnlyAttr: [],
              onSelect: (data) => {
                const existEmployeeNumbers = []

                data.forEach(row => {
                  if (result.filter(o => o.valuesID === row.employeeNumberID).length === 0) {
                    $App.connection.insert({
                      entity: 'hr_idParam',
                      execParams: {
                        orgID: me.reportValuesGrid.parentContext.orgID,
                        listParamID: me.reportValuesGrid.parentContext.listParamID,
                        valuesID: row.employeeNumberID
                      }
                    })
                  } else {
                    existEmployeeNumbers.push(row['employeeNumberID.description'])
                  }
                })
                if (existEmployeeNumbers.length) {
                  $App.dialogInfo(UB.i18n(`Працівники які вже були додані раніше </br> {0}`, existEmployeeNumbers.join('</br>')))
                }
                me.reportValuesGrid.getStore().load()
              }
            }
          })
          break
        case 'hr_dictTimeCost':
          const grid = me.reportValuesGrid
          const sourceData = (grid.getStore().snapshot || grid.getStore().data).items.map(o => o.getData())
          const selectData = sourceData.map(o => o.descriptionID)
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_timeCostSelect',
            entity: 'hr_dictTimeCost',
            store: grid.getStore(),
            cmpInitConfig: {
              selectData,
              sourceData,
              exclude: ['OTHER'],
              onSelectData: (data) => {
                if (data.remove.length || data.add.length) {
                  $App.connection.run({
                    entity: 'hr_idParam',
                    method: 'updateValuesIDs',
                    listParamID: me.reportValuesGrid.parentContext.listParamID,
                    orgID: me.reportValuesGrid.parentContext.orgID,
                    data: JSON.stringify(data)
                  }).then(() => {
                    grid.getStore().load()
                  })
                }
              }
            }
          })
          break
      }
    })
}
