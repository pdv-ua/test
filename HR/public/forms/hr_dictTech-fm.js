/* global _ AC $App UB */

exports.formCode = {
  initComponentStart,
  onInitComponentDone,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  onCheckValidBeforeSaveForm,
  setMaterialList
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['gridDictTechMaterial', 'gridDictTechOperation']
  }
  AC.acEditGridManager.init(me)
}

function initComponentDone () {
  // const me = this
}

function onInitComponentDone () {
  const me = this
  me.attr.gridDictTechMaterial.on('changeData', (grid, action) => {
    if (action === 'delete') {
      const store = grid.getStore()
      const allRecords = store.snapshot || store.data
      let lineNum = 1
      allRecords.each(record => {
        record.set('lineNum', lineNum)
        lineNum++
      })
    }
  })

  me.attr.gridDictTechOperation.on('changeData', (grid, action) => {
    if (action === 'delete') {
      const store = grid.getStore()
      const allRecords = store.snapshot || store.data
      let lineNum = 1
      allRecords.each(record => {
        record.set('lineNum', lineNum)
        lineNum++
      })
    }
  })
}
function onRecordLoaded (record, data) {
  // const me = this
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
    me.record.set('dateFrom', AC.dateService.minDate())
    me.record.set('dateTo', AC.dateService.maxDate())
  }
  me.attr['nomenclatureID.dictMeasureID.symbolUkr'].setValue(me.attr.nomenclatureID.getFieldValue('dictMeasureID.symbolUkr'))
}

function onControlChanged (me, field, value, oldValue) {
  switch (field.name) {
    case 'nomenclatureID':
      me.attr['nomenclatureID.dictMeasureID.symbolUkr'].setValue(me.attr.nomenclatureID.getFieldValue('dictMeasureID.symbolUkr'))
      break
  }
}

function onCheckValidBeforeSaveForm () {
  const me = this
  let result = true

  const materialList = me.attr.gridDictTechMaterial.getData()
  for (let i = 0; i < materialList.length; i++) {
    if (!materialList[i].nomenclatureID) {
      $App.dialogInfo(UB.i18n('Не заповнено вид сировини'))
      result = false
      return Promise.resolve(result)
    }
    if (!materialList[i].quantity || !_.isNumber(materialList[i].quantity)) {
      $App.dialogInfo(UB.i18n('Не визначена кількість сировини'))
      result = false
      return Promise.resolve(result)
    }
  }

  const operationList = me.attr.gridDictTechOperation.getData()
  for (let i = 0; i < operationList.length; i++) {
    if (!operationList[i].dictWorkOperationID) {
      $App.dialogInfo(UB.i18n('Не заповнено вид операції'))
      result = false
      return Promise.resolve(result)
    }
    if (!operationList[i].quantity || !_.isNumber(operationList[i].quantity)) {
      $App.dialogInfo(UB.i18n('Не визначена кількість операцій'))
      result = false
      return Promise.resolve(result)
    }
  }

  return Promise.resolve(result)
}

function setMaterialList (me) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_dictMaterialList',
    isModal: true,
    cmpInitConfig: {
      onDate: AC.dateService.currentDate(),
      onSelect: (data) => {
        const records = []
        const store = me.attr.gridDictTechMaterial.getStore()
        const insertGridRecords = () => {
          me.attr.gridDictTechMaterial.getStore().un('clear', insertGridRecords)
          let lineNum = store.data.length
          data.forEach(row => {
            if (!store.findRecord('nomenclatureID', row.ID)) {
              const record = {
                lineNum: ++lineNum,
                ID: null,
                nomenclatureID: row.ID,
                'nomenclatureID.description': row.description,
                quantity: 0,
                'nomenclatureID.dictMeasureID.symbolUkr': row['nomenclatureID.dictMeasureID.symbolUkr']
              }
              records.push(record)
            }
          })
          if (records.length) {
            // const bind = () => {
            //   me.attr.gridDictTechMaterial.getStore().un('add', bind)
            //   me.attr.gridDictTechMaterial.GridSummary.dataBind()
            // }
            // me.attr.gridDictTechMaterial.getStore().on('add', bind)
            me.attr.gridDictTechMaterial.getStore().insert(me.attr.gridDictTechMaterial.getStore().data.length, records)
            me.setIsDirty(true)
          }
        }

        if (me.attr.gridDictTechMaterial.getStore().count()) {
          $App.dialogYesNo('Попередження', UB.i18n('Видалити наявні записи?'))
            .then(res => {
              if (res) {
                me.attr.gridDictTechMaterial.getStore().on('clear', insertGridRecords)
                me.attr.gridDictTechMaterial.removeAll()
              } else {
                insertGridRecords()
              }
            })
        } else {
          insertGridRecords()
        }
      }
    }
  })
}
