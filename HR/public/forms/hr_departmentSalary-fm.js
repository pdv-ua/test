/* global Ext AC HR _ UB $App appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  controlChanged,
  setBasicFunctn,
  onAfterSave,
  setCases
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('beforesave', onBeforeSave, me)

  me.caseAttrName = ['nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc']
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
}

function onRecordLoaded (record, data) {
  const me = this
  const autoSetIdxNum = AC.settings.get('hrAutoSetDepIdxNum', appAC.globalOrganization())
  if (me.isNewInstance) {
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        let control = me.getField(name)
        if (control) {
          control.setValue(value) /* control.setValueById - не встановлює значення, якщо кількість записів в комбо > store.pageSize (30) */
        }
        me.record.set(name, value)
      })
    }
    let parentUnitID = me.record.get('parentUnitID')
    if (parentUnitID) {
      Promise.all([
        UB.Repository('hr_staffUnit')
          .attrs(['mi_unityEntity'])
          .selectById(parentUnitID),
        UB.Repository('hr_departmentKind')
          .attrs(['ID'])
          .where('code', '=', '1')
          .selectScalar()
      ]).then(([{ mi_unityEntity: parentEntity }, typeID]) => {
        if (parentEntity === 'hr_organization') {
          me.record.set('departmentKindID', typeID)
        }
      })
    }
    if (!me.record.get('mi_data_id')) {
      me.record.set('mi_data_id', me.instanceID)
    }
    me.record.set('state', 'ACTIVE')
    if (!me.record.get('orgID')) {
      me.record.set('orgID', appAC.globalOrganization())
    }
    if (autoSetIdxNum && !me.record.get('idxNum') && parentUnitID) {
      $App.connection.run({
        entity: 'hr_staffUnit',
        method: 'setIdxNum',
        dbMethod: data.method,
        execParams: {
          idxNum: null,
          parentUnitID: parentUnitID
        }
      }).then(mParams => {
        const execParams = mParams.execParams
        let idxNum = execParams.idxNum
        if (idxNum) {
          me.record.set('idxNum', idxNum)
        }
      })
    }
  }
  autoSetIdxNum && me.attr.idxNum.setDisabled(!me.isNewInstance)
}

function onFormDataReady () {
  const me = this
  const filterParams = [
    ['state', '=', 'ACTIVE'],
    ['mi_dateFrom', '<=', appAC.globalApplicationDate()],
    ['mi_dateTo', '>', appAC.globalApplicationDate()],
    ['mi_data_id', '!=', me.record.get('mi_data_id')],
    ['mi_unityEntity', '!=', 'hr_position'],
    ['orgID', '=', me.record.get('orgID') || appAC.globalOrganization()]
  ]
  AC.viewUtils.setWhereListProperty(me.attr.parentUnitID, filterParams)

  me.storedData = {
    nameNom: me.record.get('nameNom'),
    nameGen: me.record.get('nameGen'),
    nameDat: me.record.get('nameDat'),
    nameAcc: me.record.get('nameAcc'),
    nameOr: me.record.get('nameOr'),
    nameLoc: me.record.get('nameLoc'),
    nameVoc: me.record.get('nameVoc')
  }
  me.storedData = {}

  me.caseAttrName.forEach(attrName => {
    me.storedData[attrName] = me.record.get(attrName)
  })
}

function setBasicFunctn (me) { /// ???????? Что то не так
  const parentUnitID = me.attr.parentUnitID.getValue()
  if (!parentUnitID) {
    return
  }
  const grid = me.attr.basicFunctn
  UB.Repository('hr_basicFunctn')
    .attrs(['ID', 'basicFunctnID.name', 'serviceFunctions', 'comment'])
    .where('orgPositionID', '=', parentUnitID)
    .where('basicFunctnID', 'notIncludes',
      UB.Repository('hr_basicFunctn')
        .attrs(['basicFunctnID'])
        .where('orgPositionID', '=', me.record.get('ID'))
        .where('mi_deleteUser', 'isNull')
    )
    .selectAsObject()
    .then(res => {
      const store = grid.getStore()
      res.forEach(item => {
        store.add(item)
      })
    })
}

function controlChanged (field, value) {
  const me = this
  if (me.formDataReady) {
    switch (field.name) {
      case 'name':
        me.attr.fullName.setValue(value)
        if (!me.cases) {
          me.setLoading(true)
          UB.Repository('hr_dictCases')
            .attrs('*')
            .selectAsObject()
            .then(result => {
              me.cases = result
              me.setCases(value, result)
              me.setLoading(false)
            })
        } else {
          me.setCases(value, me.cases)
        }

        break
      case 'parentUnitID':
        const grid = me.attr.basicFunctn
        grid.onRefresh()
        me.attr.mi_dateFrom.setValue(field.getFieldValue('mi_dateFrom'))
        break
    }
  }
}

function setCases (value, cases) {
  const me = this
  const newCases = {}
  if (!value) {
    me.caseAttrName.forEach(_case => {
      me.attr[_case].setValue('')
    })
    return
  }
  me.caseAttrName.forEach(_case => {
    newCases[_case] = value
  })
  cases.forEach(item => {
    const reg = new RegExp(`^${item.name}`, 'i')
    if (value.match(reg)) {
      me.caseAttrName.forEach(_case => {
        newCases[_case] = item[_case] ? value.replace(reg, item[_case]) : ''
      })
    }
    const depTypeCode = me.attr.departmentKindID.getFieldValue('code')
    me.caseAttrName.forEach(_case => {
      if (newCases[_case]) {
        me.attr[_case].setValue(depTypeCode === '1' ? newCases[_case][0].toUpperCase() + newCases[_case].slice(1) : newCases[_case][0].toLowerCase() + newCases[_case].slice(1))
      } else {
        me.attr[_case].setValue(newCases['nameNom'])
      }
    })
  })
}

function onAfterSave () {
  let me = this
  if (me.onCustomSave) {
    me.onCustomSave(me)
  }
}

function onBeforeSave (me, params) {
  params.isSalaryOperation = true
}
