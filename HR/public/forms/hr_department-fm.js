/* global Ext AC HR _ UB $App appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  // initOrderComponentDone,
  onClose,
  addBaseActions,
  onRecordLoaded,
  onFormDataReady,
  controlChanged,
  setBasicFunctn,
  onBeforeSave,
  onAfterSave,
  setCases,
  setDepartmentKind,
  setEmployeeChiefFilter
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', controlChanged, me)
  me.on('recordloaded', onRecordLoaded, me)
  me.on('beforesave', beforeSave, me)

  me.caseAttrName = ['nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc']
}

function onClose () {
  const me = this
  if (me.afterClose && typeof me.afterClose === 'function') {
    me.afterClose()
  }
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me, ['ubdetailgrid'])
  createActions(me)
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  let createNewVersion = me.actions.createNewVersion
  if (!createNewVersion) {
    createNewVersion = new Ext.Action({
      actionId: 'createNewVersion',
      eventId: 'createNewVersion',
      iconCls: 'iconCreateDoc',
      text: UB.i18n('Внести зміни'),
      hidden: true,
      handler: function () {
        HR.treeUtils.newVersionDep(me.instanceID)
      },
      scope: me
    })
    me.actions.createNewVersion = createNewVersion
  }
}

function createActions (me) {
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }
  const customReadOnly = me.customSettings && me.customSettings.readOnly

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  !customReadOnly && allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    iconCls: 'iconEdit',
    handler: function () {
      ['idxNum', 'name', 'fullName', 'dictDepTypeID', 'departmentKindID', 'excludeNameInPos', 'dictDepTypeID', 'code',
        'nameEng', 'positionChiefID', 'curatorID', 'employeeChiefID'
      ].forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
      me.attr.idxNum.setDisabled(false)
      me.caseAttrName.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(ctrlName === 'nameNome')
      })
    }
  })
  !customReadOnly && (AC.entityUtils.verifyRightsMethod('hr_department', 'editBorderQuantity')) && allActions.menu.add({
    text: UB.i18n('Редагувати граничну кількість посад'),
    name: 'actionAllowEditBorderQuantity',
    iconCls: 'iconEdit',
    handler: function () {
      ['quantity', 'quantityLead'].forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(false)
      })
      me.attr.idxNum.setDisabled(false)
      me.caseAttrName.forEach(ctrlName => {
        me.attr[ctrlName].setReadOnly(ctrlName === 'nameNome')
      })
    }
  })
  allActions.menu.add({
    text: UB.i18n('Оновити відмінки поточного запису'),
    name: 'actionAllowregenerateCases',
    iconCls: 'u-icon-refresh',
    disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_department', 'recalcCases'),
    handler: async function () {
      me.setLoading(true)
      if (!me.cases) {
        me.setLoading(true)
        UB.Repository('hr_dictCases')
          .attrs('*')
          .selectAsObject()
          .then(result => {
            me.cases = result
            me.setCases(me.attr.name.getValue(), result)
            me.setLoading(false)
          })
      } else {
        me.setCases(me.attr.name.getValue(), me.cases)
      }
      me.setLoading(false)
      AC.viewUtils.showToast(UB.i18n('Відмінки оновлено'))
    }
  })

  allActions.menu.add({
    text: UB.i18n('Оновити відмінки підлеглих'),
    name: 'actionAllowregenerateCases',
    iconCls: 'u-icon-refresh',
    disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_department', 'recalcCases'),
    handler: function () {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_department',
        method: 'recalcCases',
        ID: me.record.get('ID'),
        staffOrderID: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID') : null,
        mi_data_id: me.record.get('mi_data_id'),
        onDate: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID.entryDate') : appAC.globalApplicationDate(),
        name: me.record.get('name'),
        onlyPos: false,
        withChild: true
      }).then(() => {
        me.setLoading(false)
        AC.viewUtils.showToast(UB.i18n('Відмінки оновлено'))
      })
    }
  })

  allActions.menu.add({
    text: UB.i18n('Оновити відмінки підлеглих посад'),
    name: 'actionAllowregenerateCases',
    iconCls: 'u-icon-refresh',
    disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_department', 'recalcCases'),
    handler: function () {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_department',
        method: 'recalcCases',
        ID: me.record.get('ID'),
        staffOrderID: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID') : null,
        mi_data_id: me.record.get('mi_data_id'),
        onDate: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID.entryDate') : appAC.globalApplicationDate(),
        name: me.record.get('name'),
        onlyPos: false,
        withChild: false,
        onlyPosWithChild: true
      }).then(() => {
        me.setLoading(false)
        AC.viewUtils.showToast(UB.i18n('Відмінки оновлено'))
      })
    }
  })
}

function setDepartmentKind (parentUnitID) {
  if (!parentUnitID) return
  const me = this
  Promise.all([
    UB.Repository('hr_staffUnit')
      .attrs(['mi_unityEntity'])
      .selectById(parentUnitID),
    UB.Repository('hr_departmentKind')
      .attrs(['ID', 'code'])
      .where('code', 'in', ['1', '2'])
      .selectAsObject()
  ]).then(([{
    mi_unityEntity: parentEntity
  }, kindList]) => {
    if (parentEntity === 'hr_organization') {
      const kind = kindList.find(o => o.code === '1')
      me.record.set('departmentKindID', kind ? kind.ID : null)
    } else {
      const kind = kindList.find(o => o.code === '2')
      me.record.set('departmentKindID', kind ? kind.ID : null)
    }
  })
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
    if (me.customParams.isNameOnly) {
      me.record.set('state', 'NEW')
      me.record.set('isSecondaryChanges', 0)
    } else if (me.record.get('ID') === me.record.get('mi_data_id') || !me.record.get('mi_data_id')) {
      me.record.set('isSecondaryChanges', 0)
    } else {
      me.record.set('isSecondaryChanges', 1)
    }

    let parentUnitID = me.record.get('parentUnitID')
    if (parentUnitID) {
      me.setDepartmentKind(parentUnitID)
    }
    if (!me.record.get('mi_data_id')) {
      me.record.set('mi_data_id', me.instanceID)
    }
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
  me.attr.parentUnitID.setDisabled(!record.get('staffOrderID'))
  autoSetIdxNum && me.attr.idxNum.setDisabled(!me.isNewInstance)
}

function setParentUnitExtraFilterParams (filterParams, me) {
  const allowLinkToPos = AC.settings.get('hrStaffTableDisallowLinkToPos') === false
  if (!allowLinkToPos) {
    filterParams.push(['mi_unityEntity', 'in', ['hr_organization', 'hr_department']])
    if (!me.isReadOnly && me.attr.parentUnitID.getFieldValue('mi_unityEntity') === 'hr_position') {
      me.attr.parentUnitID.clearValue()
    }
  }
  const rootID = (me.defaultValues && me.defaultValues.rootID) || (me.customParams && me.customParams.rootID)
  if (!me.isReadOnly && me.attr.parentUnitID.getFieldValue('mi_unityEntity') === 'hr_organization' && rootID && rootID !== me.attr.parentUnitID.getValue()) {
    me.attr.parentUnitID.clearValue()
  }
}

async function onFormDataReady () {
  const me = this
  const customReadOnly = me.customSettings && me.customSettings.readOnly
  const orderState = me.record.get('staffOrderID.orderState')
  const readOnly = (me.record.get('state') === 'ACTIVE' || (orderState && orderState !== 'PROJECT') || customReadOnly) && !me.isDirectCreate
  me.isReadOnly = readOnly
  AC.viewUtils.setFormReadOnly(
    me,
    readOnly, ['mi_dateFrom', 'dateToEmpty', 'staffOrderID', 'entryOrderID', 'quantityFact']
  )
  AC.viewUtils.setFilterValue(me.attr.staffOrderID, {
    orderState: 'PROJECT'
  })
  AC.viewUtils.setFilterValue(me.attr.positionChiefID, { departmentID: me.record.get('mi_data_id') })
  AC.viewUtils.setFilterValue(me.attr.positionCuratorID, { orgID: me.record.get('orgID') || appAC.globalOrganization() })

  if (me.record.get('staffOrderID.entryDate')) {
    const filterParams = [
      ['state', '=', 'ACTIVE', 'active'],
      ['state', '=', 'NEW', 'new'],
      ['mi_dateFrom', '<=', AC.dateService.shiftDate(me.record.get('staffOrderID.entryDate'))],
      ['mi_dateTo', '>', AC.dateService.shiftDate(me.record.get('staffOrderID.entryDate'))],
      ['staffOrderID', '=', me.record.get('staffOrderID'), 'order'],
      ['mi_data_id', '!=', me.record.get('mi_data_id')],
      ['orgID', '=', me.record.get('orgID') || appAC.globalOrganization()]
    ]
    if (me.defaultValues && me.defaultValues.rootID) {
      filterParams.push(['mi_treePath', 'like', `%/${me.defaultValues.rootID}/%`])
    } else if (me.customParams && me.customParams.rootID) {
      filterParams.push(['mi_treePath', 'like', `%/${me.customParams.rootID}/%`])
    }
    setParentUnitExtraFilterParams(filterParams, me)
    AC.viewUtils.setWhereListProperty(me.attr.parentUnitID, filterParams, ['([active] OR ([new] AND [order]))'])
  }
  me.actions.createNewVersion.setDisabled(!readOnly)

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
  let quantityFact = me.record.get('quantityFact')
  if (me.sender && me.sender.dictFundSourceID) {
    quantityFact = await UB.Repository('hr_position')
      .attrs(['SUM([quantity])'])
      .where('state', '=', 'ACTIVE')
      .where('parentUnitID', '=', me.record.get('mi_data_id'))
      .where('dictFundSourceID', '=', me.sender.dictFundSourceID)
      .selectScalar()
  }
  me.down('[name=quantityFact]').setValue(quantityFact)
  if (me.isDirectCreate) {
    me.attr.staffOrderID.setAllowBlank(true)
    me.attr.staffOrderID.hide()
    me.attr.entryOrderID.hide()
    me.attr.mi_dateFrom.setReadOnly(false)
    me.attr.dateToEmpty.setReadOnly(false)
  }
  me.setEmployeeChiefFilter(me.record.get('positionChiefID'))
  const store = me.attr.curatorID.getStore()
  store.ubRequest.whereList = {
    exists: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'ac_employeeOrg',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[employeeID]=[{master}.ID]',
            condition: 'custom'
          },
          orgID: {
            condition: 'equal',
            expression: '[organizationID]',
            value: me.record.get('orgID')
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[employeeID.mi_deleteDate]',
            value: '#maxdate'
          },
          mi_deleteDateOrg: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          }
        }
      }
    }
  }
  store.load()
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
      case 'staffOrderID':
        me.attr.mi_dateFrom.setValue(field.getFieldValue('entryDate'))
        if (value) {
          const entryDate = AC.dateService.shiftDate(field.getFieldValue('entryDate'))
          let clearValue = true
          if (me.attr.parentUnitID.getValue() &&
                        ((new Date(me.attr.parentUnitID.getFieldValue('mi_dateFrom')) <= entryDate) &&
                            (me.attr.parentUnitID.getFieldValue('state') === 'ACTIVE' || me.attr.parentUnitID.getFieldValue('staffOrderID') === value))
          ) {
            clearValue = false
          }
          const filterParams = [
            ['state', '=', 'ACTIVE', 'active'],
            ['state', '=', 'NEW', 'new'],
            ['mi_dateFrom', '<=', entryDate],
            ['mi_dateTo', '>', entryDate],
            ['staffOrderID', '=', value, 'order'],
            ['mi_data_id', '!=', me.record.get('mi_data_id')]
          ]
          if (me.record.get('mi_data_id') !== me.instanceID) {
            filterParams.push(['orgID', '=', me.record.get('orgID')])
          }
          if (me.defaultValues && me.defaultValues.rootID) {
            filterParams.push(['mi_treePath', 'like', `%/${me.defaultValues.rootID}/%`])
          } else if (me.customParams && me.customParams.rootID) {
            filterParams.push(['mi_treePath', 'like', `%/${me.customParams.rootID}/%`])
          }
          setParentUnitExtraFilterParams(filterParams, me)
          AC.viewUtils.setWhereListProperty(me.attr.parentUnitID,
            filterParams, ['([active] OR ([new] AND [order]))'],
            clearValue ? ['clearWhereList', 'clearValue', 'clearStore'] : []
          )
        }
        me.attr.parentUnitID.setDisabled(!value)
        break
      case 'name':
        me.attr.fullName.setValue(value)
        me.attr.nameEng.setValue()
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
        me.setDepartmentKind(value)
        const grid = me.attr.basicFunctn
        grid.onRefresh()
        break
      case 'code':
        const autoSetIdxNum = AC.settings.get('hrAutoSetDepIdxNum', appAC.globalOrganization())
        let intCode = parseInt(value)
        if (autoSetIdxNum && intCode && intCode <= 99999999) {
          me.attr.idxNum.setValue(intCode)
        }
        break
      case 'positionChiefID':
        me.setEmployeeChiefFilter(value, true)
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
        me.attr[_case].setValue(depTypeCode === '1' ? newCases[_case][0].toUpperCase() + newCases[_case].slice(1).toLowerCase() : newCases[_case][0].toLowerCase() + newCases[_case].slice(1).toLowerCase())
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
  /*
      $App.connection.run({
        entity: 'hr_department',
        method: 'recalcCases',
        ID: me.record.get('ID'),
        staffOrderID: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID') : null,
        mi_data_id: me.record.get('mi_data_id'),
        onDate: me.record.get('state') === 'NEW' ? me.record.get('staffOrderID.entryDate') : appAC.globalApplicationDate(),
        name: me.record.get('name'),
        withChild: true
      })
  */
}

async function onBeforeSave () {
  const me = this
  if (me.customParams && me.customParams.isNameOnly) {
    const casesData = await UB.Repository('hr_dictCases')
      .attrs('*')
      .selectAsObject()
    me.cases = casesData
    me.setCases(me.attr.name.getValue(), casesData)
  }
  return true
}

function beforeSave (me, params) {
  params.isDirectCreate = me.isDirectCreate
  params.recalcCases = me.customParams && me.customParams.isNameOnly
}

function setEmployeeChiefFilter (positionChiefID, isClear) {
  const me = this
  const allowSelectOrgEmployee = AC.settings.get('hrDepChiefAllowSelectEmployee', appAC.globalOrganization())
  const store = me.attr.employeeChiefID.getStore()
  if (isClear) {
    me.attr.employeeChiefID.clearValue()
  }
  if (allowSelectOrgEmployee) {
    store.ubRequest.whereList = {
      exists: {
        expression: '',
        condition: 'subquery',
        subQueryType: 'Exists',
        value: {
          entity: 'ac_employeeOrg',
          fieldList: [],
          method: 'select',
          whereList: {
            cond: {
              expression: '[employeeID]=[{master}.ID]',
              condition: 'custom'
            },
            orgID: {
              condition: 'equal',
              expression: '[organizationID]',
              value: me.record.get('orgID')
            },
            mi_deleteDate: {
              condition: 'equal',
              expression: '[employeeID.mi_deleteDate]',
              value: '#maxdate'
            },
            mi_deleteDateOrg: {
              condition: 'equal',
              expression: '[mi_deleteDate]',
              value: '#maxdate'
            }
          }
        }
      }
    }
  } else {
    if (positionChiefID) {
      store.ubRequest.whereList = {
        exists: {
          expression: '',
          condition: 'subquery',
          subQueryType: 'exists',
          value: {
            entity: 'hr_employeePositionS',
            fieldList: [],
            method: 'select',
            whereList: {
              cond: {
                expression: '[employeeID]=[{master}.ID]',
                condition: 'custom'
              },
              pos: {
                expression: '[positionID]',
                condition: '=',
                value: positionChiefID
              },
              dateFrom: {
                condition: '<=',
                expression: '[dateFrom]',
                value: appAC.globalApplicationDate()
              },
              dateTo: {
                condition: '>=',
                expression: '[dateTo]',
                value: appAC.globalApplicationDate()
              },
              isActive: {
                condition: '=',
                expression: '[isActive]',
                value: 1
              },
              mi_deleteDate: {
                condition: 'equal',
                expression: '[mi_deleteDate]',
                value: '#maxdate'
              }
            }
          }
        }
      }
      store.load()
    } else {
      store.ubRequest.whereList = {
        exists: {
          expression: '',
          condition: 'subquery',
          subQueryType: 'exists',
          value: {
            entity: 'hr_employeePositionS',
            fieldList: [],
            method: 'select',
            whereList: {
              cond: {
                expression: '[employeeID]=[{master}.ID]',
                condition: 'custom'
              },
              dep: {
                expression: '[departmentID]',
                condition: '=',
                value: me.record.get('mi_data_id')
              },
              dateFrom: {
                condition: '<=',
                expression: '[dateFrom]',
                value: appAC.globalApplicationDate()
              },
              dateTo: {
                condition: '>=',
                expression: '[dateTo]',
                value: appAC.globalApplicationDate()
              },
              isActive: {
                condition: '=',
                expression: '[isActive]',
                value: 1
              },
              mi_deleteDate: {
                condition: 'equal',
                expression: '[mi_deleteDate]',
                value: '#maxdate'
              }
            }
          }
        }
      }
    }
    store.load().then(() => {
      if (store.getCount() === 1) {
        me.attr.employeeChiefID.setValueById(store.data.items[0].get('ID'))
      }
    })
  }
}
