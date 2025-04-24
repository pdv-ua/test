/* global UB $App AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addByListHandler
}

let me
function initComponentStart () { // Вызывается прямо перед запуском инициализации формы.
  me = this
}

function initComponentDone () {
  me.on('beforeSaveForm', function (a, b, c, d) {})
  me.on('beforeClose', function (a) {})
  me.on('recordloaded', function (a) {
    me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
      if (modified.includes('dummy')) {

      }
    })
  })
  me.on('formDataReady', function (a) {
    HR.orderManager.showIf(me)
  })
  me.on('beforeSaveForm', function (a) {})
  me.on('aftersave', function (a) {})
  me.on('beforeDelete', function (a) {})
  me.on('afterDelete', function (a) {})
  me.on('beforeClose', function (a) {})
}

function addByListHandler (btn) {
  $App.doCommand({
    cmdType: 'showList',
    isModal: true,
    cmdData: {
      params: [
        {
          entity: 'hr_elementSetType',
          method: 'select',
          fieldList: [
            { name: 'code', visibility: false },
            'name'
          ],
          orderList: {
            orderBy: {
              expression: 'name',
              order: 'asc'
            }
          }
        }
      ]
    },
    onItemSelected: elementSetTypeSelect
  })
}

function elementSetTypeSelect (selected) {
  const currentDate = appAC.globalApplicationDate()
  const currentSqlDate = AC.dateService.unshiftDate(currentDate)
  const store = me.getDetails()[0].getStore()
  const detailsData = (store.snapshot || store.data).items.map(o => o.getData())
  let sourceData = detailsData.filter(o => o['elementSetTypeID.code'] === selected.data.code &&
    new Date(o.dateFrom) <= currentSqlDate && (o.dateToEmpty === null || new Date(o.dateToEmpty) >= currentSqlDate))

  switch (selected.data.code) {
    case 'hr_payEl':
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelect',
        cmpInitConfig: {
          withPeriod: true,
          sourceData,
          selectData: sourceData.map(o => o.elementID),
          sourceAttr: 'elementID',
          getDescription: true,
          onSelectData: data => {
            Promise.all(
              data.add.map(dataItem => {
                return $App.connection.insert({
                  entity: 'hr_repSetElement',
                  fieldList: ['repSetParamID', 'elementSetTypeID', 'elementID'],
                  execParams: {
                    repSetParamID: me.instanceID,
                    elementSetTypeID: selected.data.ID,
                    elementID: dataItem.ID,
                    elementInfo: dataItem.description,
                    dateFrom: currentDate
                  }
                })
              }).concat(
                data.remove.map(ID => {
                  let sourceItem = sourceData.find(itm => itm.ID === ID)
                  return $App.connection.update({
                    entity: 'hr_repSetElement',
                    isInternalOperation: true,
                    execParams: {
                      ID: ID,
                      dateTo: AC.dateService.priorDay(currentDate),
                      mi_modifyDate: sourceItem.mi_modifyDate
                    }
                  })
                })
              )
            ).then(() => {
              store.load()
            })
          }
        }
      })
      break

    case 'hr_dictTimeCost':
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_timeCostSelect',
        cmpInitConfig: {
          withPeriod: true,
          sourceData,
          selectData: sourceData.map(o => o.elementID),
          sourceAttr: 'elementID',
          getDescription: true,
          onSelectData: data => {
            Promise.all(
              data.add.map(dataItem => {
                return $App.connection.insert({
                  entity: 'hr_repSetElement',
                  fieldList: ['repSetParamID', 'elementSetTypeID', 'elementID', 'dateFrom'],
                  execParams: {
                    repSetParamID: me.instanceID,
                    elementSetTypeID: selected.data.ID,
                    elementID: dataItem.ID,
                    elementInfo: dataItem.description,
                    dateFrom: currentDate
                  }
                })
              }).concat(
                data.remove.map(ID => {
                  let sourceItem = sourceData.find(itm => itm.ID === ID)
                  return $App.connection.update({
                    entity: 'hr_repSetElement',
                    isInternalOperation: true,
                    execParams: {
                      ID: ID,
                      dateTo: AC.dateService.priorDay(currentDate),
                      mi_modifyDate: sourceItem.mi_modifyDate
                    }
                  })
                })
              )
            ).then(() => {
              store.load()
            })
          }
        }
      })
      break

    case 'hr_dictDep':
    case 'hr_dictPos':
      const dictCode = selected.data.code
      let entity = dictCode === 'hr_dictDep' ? 'hr_department' : 'hr_position'
      let orgID = appAC.globalOrganization()
      let onDate = appAC.globalApplicationDate()
      const fieldList = [
        { name: 'mi_data_id', visibility: false }
      ]
      let displayField
      if (dictCode === 'hr_dictDep') {
        fieldList.push({ name: 'name', description: UB.i18n('Назва') })
        fieldList.push({ name: 'parentName' })
        displayField = 'name'
      } else if (dictCode === 'hr_dictPos') {
        fieldList.push({ name: 'posDepName', description: UB.i18n('Посада, підрозділ') })
        displayField = 'posDepName'
      }
      $App.doCommand({
        cmdType: 'showList',
        isModal: true,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        cmdData: {
          params: [
            {
              entity: entity,
              method: 'select',
              fieldList: fieldList,
              whereList: {
                orgID: {
                  expression: '[orgID]',
                  condition: 'equal',
                  value: orgID
                },
                dateFrom: {
                  expression: '[mi_dateFrom]',
                  condition: 'lessEqual',
                  value: onDate
                },
                dateTo: {
                  expression: '[mi_dateTo]',
                  condition: 'moreEqual',
                  value: onDate
                },
                state: {
                  expression: '[state]',
                  condition: 'equal',
                  value: 'ACTIVE'
                }
              },
              orderList: {
                orderBy: {
                  expression: displayField,
                  order: 'asc'
                }
              }
            }
          ]
        },
        cmpInitConfig: {
          selModel: {
            selectionMode: 'MULTI',
            showHeaderCheckbox: true,
            checkOnly: false,
            selType: 'checkboxmodel'
          },
          onItemSelect: selItem => {
            const grid = selItem.up('grid')
            let commandList = []
            const selModel = grid.getSelectionModel()
            selModel.selected.each(record => {
              let elmID = record.get('mi_data_id')
              let elmInfo = record.get(displayField)
              if (elmInfo.length > 200) {
                elmInfo = elmInfo.substring(0, 200 - 3) + '...'
              }
              let existedElm = sourceData.find(o => o.elementID === elmID)
              if (!existedElm) {
                commandList.push({
                  entity: 'hr_repSetElement',
                  method: 'insert',
                  execParams: {
                    repSetParamID: me.instanceID,
                    elementSetTypeID: selected.data.ID,
                    elementID: elmID,
                    elementInfo: elmInfo
                  }
                })
              }
            })
            if (commandList.length) {
              $App.connection.runTrans(commandList)
                .then((transResult) => {
                  store.load()
                })
            }
            grid.up('window').close()
          }
        }
      })
      break
    case 'hr_dictPosition':
      let dictOnDate = appAC.globalApplicationDate()
      const dictDisplayField = 'description'
      const dictFieldList = [
        { name: dictDisplayField, description: UB.i18n('Назва') },
        { name: 'ID', visibility: false }
      ]
      const dictWhereList = {
        dateFrom: {
          expression: '[dateFrom]',
          condition: 'lessEqual',
          value: dictOnDate
        },
        dateTo: {
          expression: '[dateTo]',
          condition: 'moreEqual',
          value: dictOnDate
        }
      }
      $App.doCommand({
        cmdType: 'showList',
        isModal: true,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        cmdData: {
          params: [
            {
              entity: selected.data.code,
              method: 'select',
              fieldList: dictFieldList,
              whereList: dictWhereList,
              orderList: { orderBy: { expression: dictDisplayField, order: 'asc' } }
            }
          ]
        },
        cmpInitConfig: {
          selModel: {
            selectionMode: 'MULTI',
            showHeaderCheckbox: true,
            checkOnly: false,
            selType: 'checkboxmodel'
          },
          onItemSelect: selItem => {
            const grid = selItem.up('grid')
            let commandList = []
            const selModel = grid.getSelectionModel()
            selModel.selected.each(record => {
              let elmID = record.get('ID')
              let elmName = record.get(dictDisplayField)
              let existedElm = sourceData.find(o => o.elementID === elmID)
              if (!existedElm) {
                commandList.push({
                  entity: 'hr_repSetElement',
                  method: 'insert',
                  execParams: {
                    repSetParamID: me.instanceID,
                    elementSetTypeID: selected.data.ID,
                    elementID: elmID,
                    elementInfo: elmName
                  }
                })
              }
            })
            if (commandList.length) {
              $App.connection.runTrans(commandList)
                .then((transResult) => {
                  store.load()
                })
            }
            grid.up('window').close()
          }
        }
      })
      break

    case 'hr_dictPositionGroup':
    case 'gl_account':
      $App.doCommand({
        cmdType: 'showList',
        isModal: true,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        cmdData: {
          params: [
            {
              entity: selected.data.code,
              method: 'select',
              fieldList: [
                { name: 'name', description: UB.i18n('Назва') },
                { name: 'ID', visibility: false }
              ],
              orderList: { orderBy: { expression: 'name', order: 'asc' } }
            }
          ]
        },
        cmpInitConfig: {
          selModel: {
            selectionMode: 'MULTI',
            showHeaderCheckbox: true,
            checkOnly: false,
            selType: 'checkboxmodel'
          },
          onItemSelect: selItem => {
            const grid = selItem.up('grid')
            let commandList = []
            const selModel = grid.getSelectionModel()
            selModel.selected.each(record => {
              let elmID = record.get('ID')
              let elmName = record.get('name')
              let existedElm = sourceData.find(o => o.elementID === elmID)
              if (!existedElm) {
                commandList.push({
                  entity: 'hr_repSetElement',
                  method: 'insert',
                  execParams: {
                    repSetParamID: me.instanceID,
                    elementSetTypeID: selected.data.ID,
                    elementID: elmID,
                    elementInfo: elmName
                  }
                })
              }
            })
            if (commandList.length) {
              $App.connection.runTrans(commandList)
                .then(() => {
                  store.load()
                })
            }
            grid.up('window').close()
          }
        }
      })
      break

    default:
      $App.doCommand({
        cmdType: 'showList',
        isModal: true,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        cmdData: { params: [
          { entity: selected.data.code, method: 'select', fieldList: '*' }
        ] },
        onItemSelected: sel => {
          let elmID = sel.data.ID
          let elmName = sel.data.description || sel.data.name || ''
          let existedElm = sourceData.find(o => o.elementID === elmID)
          if (!existedElm) {
            $App.connection.insert({
              entity: 'hr_repSetElement',
              fieldList: ['repSetParamID', 'elementSetTypeID', 'elementID', 'dateFrom'],
              execParams: {
                repSetParamID: me.instanceID,
                elementSetTypeID: selected.data.ID,
                elementID: elmID,
                elementInfo: elmName,
                dateFrom: AC.dateService.currentDate()
              }
            }).then(store.load())
          }
        }
      })
  }
}
