/* global HR $App AC Ext appAC UB _ appHR */
exports.formCode = {
  initComponentStart,
  initOrderComponentDone,
  addBaseActions,
  postInit,
  onAfterOrderSave,
  onFormDataReady,
  onControlChanged,
  calcWorkPlace,
  setPositionData,
  setAccrualData,
  setFocus,
  showListAccrualByPosition,
  onGridEdit,
  accrualGridColumns,
  sortAccrual,
  sortPositions
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['position', 'accrual'],
    stateAttrName: 'state'
  }
  getDictPositionProps(me)
  HR.orderManager.init(me)
}

function initOrderComponentDone () {
  const me = this
  me.actions['fDelete'].hide()
  me.attr.position.on('changeData', (grid, event) => {
    if (event === 'delete') {
      me.calcWorkPlace(me)
    }
  })
  me.attr.accrual.on('changeData', (grid, event) => {
    if (event === 'delete') {
      me.setAccrualData(me, me.attr.position.selectedRecord, grid.getData())
    }
  })
  me.attr.dateFrom.on('keypress', (ctrl, e) => {
    if (e.getKey() === e.ENTER) {
      if (me.record.get('state') !== 'POSTED') {
        getEmployeeExperience(me, me.attr.employeeNumberID.getValue(), ctrl.getValue())
        me.calcWorkPlace(me)
      }
    }
  })
  me.attr.dateFrom.on('blur', (ctrl) => {
    if (me.record.get('state') !== 'POSTED') {
      getEmployeeExperience(me, me.attr.employeeNumberID.getValue(), ctrl.getValue())
      me.calcWorkPlace(me)
    }
  })
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['postingAction', 'cancelPostingAction', 'calcWorkPlaceAction'],
    state: {
      PROJECT: { action: ['postingAction', 'calcWorkPlaceAction'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  me.actions.empNumAction = new Ext.Action({
    actionId: 'empNumAction',
    eventId: 'empNumAction',
    iconCls: 'el-icon-s-custom',
    cls: 'blue-action',
    tooltip: UB.i18n('Особовий рахунок'),
    text: UB.i18n('Особовий рахунок'),
    handler: function () {
      if (me.attr.employeeNumberID.getValue()) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumber',
          entity: 'hr_employeeNumber',
          instanceID: me.attr.employeeNumberID.getValue(),
          tabId: `hr_employeeNumber-${me.attr.employeeNumberID.getValue()}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })
  me.actions.rlAction = new Ext.Action({
    actionId: 'rlAction',
    eventId: 'rlAction',
    iconCls: 'el-icon-tickets',
    cls: 'blue-action',
    tooltip: UB.i18n('Розрахунковий лист'),
    text: UB.i18n('Розрахунковий лист'),
    handler: function () {
      if (me.attr.employeeNumberID.getValue()) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: {
              employeeNumberID: me.attr.employeeNumberID.getValue()
            }
          },
          tabId: `hr_rl${me.attr.employeeNumberID.getValue()}`,
          target: $App.getViewport().centralPanel
        })
      }
    },
    scope: me
  })
  me.actions.calcWorkPlaceAction = new Ext.Action({
    iconCls: 'fas fa-calculator',
    cls: 'green-action',
    scale: 'medium',
    tooltip: UB.i18n('Розрахувати'),
    text: UB.i18n('Розрахувати'),
    actionId: 'calcWorkPlaceAction',
    handler: function () {
      me.calcWorkPlace(me)
      getEmployeeExperience(me, me.record.get('employeeNumberID'), me.record.get('dateFrom'))
    }
  })
  const printAction = new Ext.Action({
    iconCls: 'fas fa-print ',
    cls: 'blue-action',
    text: UB.i18n('Друкувати'),
    actionId: 'printAction',
    eventId: 'printAction',
    handler: function () {
      const params = {
        employeeNumberID: me.attr.employeeNumberID.getValue(),
        issueDate: me.attr.dateFrom.getValue(),
        instanceID: me.instanceID,
        dateTo: me.attr.dateToEmpty.getValue(),
        orgID: appAC.globalOrganization(),
        onDate: me.attr.dateFrom.getValue(),
        sourcessFunding: me.attr.position.getStore().data.items.map(o => {
          return {
            dictProgClassID: o.data.dictProgClassID,
            dictFundSourceID: o.data.dictFundSourceID
          }
        })
      }
      if (me.isFormDirty()) {
        me.saveForm().then(res => {
          if (res !== -1) doReport(me, 'trf_reportList', params)
        })
      } else {
        doReport(me, 'trf_reportList', params)
      }
    }
  })
  me.actions.printAction = printAction
  HR.orderManager.addOrderAction(me)
}

function doReport (me, code, params) {
  let report = Ext.create('UBS.UBReport', {
    code: 'trf_workPlace_edu',
    type: 'html',
    params
  })
  report.init().then(function () {
    let transformToXlsx = true
    if (me.transformToXlsx) {
      if (Array.isArray(me.transformToXlsx)) {
        transformToXlsx = me.transformToXlsx.includes('trf_workPlace_edu')
      } else {
        transformToXlsx = me.transformToXlsx
      }
    }
    if (me.reportHiddenActions) {
      report.hiddenActions = me.reportHiddenActions
    }
    let config = {
      cmdType: 'showForm',
      formCode: 'ac_documentViewer',
      caption: UB.i18n('Друкована форма'),
      cmpInitConfig: { report: report, transformToXlsx },
      tabId: 'printDocument' + 'trf_workPlace_edu' + me.instanceID,
      description: 'Тарифікаційний листок',
      target: $App.getViewport().centralPanel,
      instanceID: me.instanceID,
      filterMenu: true
    }
    $App.doCommand(config)
  })
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.position.length')) {
    me.attr.position.setLocalStoreData(sortPositions(me.formData.detail.position, me.record.get('dictPositionID')))
    sortAccrual(me.formData.detail.position[0].accrual, me)
  } else if (data.method !== 'addnew') {
    me.attr.position.removeAll()
  }
  setFocus(me, 'position', me.attr.position.getStore().getAt(0))
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.position.setLocalStoreData(sortPositions(me.formData.detail.position, me.record.get('dictPositionID')), false, true)
    if (me.formData.detail.position.length) {
      sortAccrual(me.formData.detail.position[0].accrual, me)
      setFocus(me, 'position', me.attr.position.getStore().getAt(0))
    }
  }
}

function setFocus (me, gridName, record) {
  if (record) {
    const selModel = me.attr[gridName].getSelectionModel()
    let view = me.attr[gridName].getView()
    view.focus()
    selModel.select(record)
  }
}

function onFormDataReady () {
  const me = this
  const docDateFrom = me.record.get('documentID.dateFrom') || appAC.globalApplicationDate()
  const docDateTo = me.record.get('documentID.dateTo') || AC.dateService.maxDateUTC()
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  me.setTitle(`${me.record.get('description') || ''} документ № ${me.record.get('documentID.docNumber')} вiд ${AC.dateService.formatDate(me.record.get('documentID.docDate'), 'dd.mm.yyyy')} ${me.record.get('documentID.name')} ${UB.core.UBEnumManager.getStore('HR_ORDER_STATE').getById(me.record.get(me.orderConfig.stateAttrName)).data.name}`)
  me.attr.dictPositionID.setReadOnly(!!me.record.get('employeeNumberID'))
  me.attr.departmentID.setReadOnly(!!me.record.get('employeeNumberID'))
  me.record.get('documentID.type') === 'PLAN' ? me.attr.departmentID.setAllowBlank(true) : me.attr.departmentID.setAllowBlank(!!me.record.get('employeeNumberID'))

  AC.viewUtils.setFilterValue(me.attr.employeeNumberID,
    {
      orgID: me.record.get('documentID.orgID') || appAC.globalOrganization(),
      dateTo: { value: docDateFrom, condition: '>=' },
      dateFrom: { value: docDateTo, condition: '<=' },
      mainEmpNumberID: null
    })
  me.attr.departmentID.store.ubRequest.__mip_ondate = docDateFrom // appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('documentID.orgID') || appAC.globalOrganization(), state: 'ACTIVE' })
  getEmployeeExperience(me, me.record.get('employeeNumberID'), me.record.get('dateFrom'))
  me.setActionDisabled('calcWorkPlaceAction', me.record.get('state') === 'POSTED')
  setDateRange(me)
  positionGridColumns(me)
  accrualGridColumns(me)
  // me.attr.position.getStore().sort('posIndex', 'ASC')
}

function onControlChanged (me, field, value) {
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeeNumberID':
        me.record.set('employeeNumberID', value)
        me.attr.departmentID.setValueById(null)
        me.attr.dictPositionID.skipChanged = true
        me.attr.dictPositionID.setValueById(null)
        me.record.get('documentID.type') === 'PLAN' ? me.attr.departmentID.setAllowBlank(true) : me.attr.departmentID.setAllowBlank(!!value)
        setDateRange(me)
        if (value) {
          if (me.record.get('dateFrom') < me.attr.employeeNumberID.getVal('dateFrom')) {
            me.record.set('dateFrom', me.attr.employeeNumberID.getVal('dateFrom'))
          }
          me.attr.dictPositionID.setReadOnly(true)
          me.attr.departmentID.setReadOnly(true)
          UB.Repository('hr_employeePositionSR')
            .attrs(['departmentID', 'dictPositionID', 'payElID'])
            .where('employeeNumberID', '=', value)
            .where('dateFrom', '<=', AC.dateService.shiftDate(me.record.get('dateFrom')))
            .where('dateTo', '>=', AC.dateService.shiftDate(me.record.get('dateFrom')))
            .selectSingle()
            .then(result => {
              if (result) {
                me.record.set('departmentID', result.departmentID)
                me.record.set('dictPositionID', result.dictPositionID)
              }
              me.calcWorkPlace(me, true)
            })
        } else {
          me.attr.dictPositionID.setReadOnly(false)
          me.attr.departmentID.setReadOnly(false)
          me.calcWorkPlace(me, true)
        }
        getEmployeeExperience(me, value, me.attr.dateFrom.getValue())
        break
      case 'dictPositionID':
        me.record.set('dictPositionID', value)
        positionGridColumns(me)
        if (field.skipChanged) {
          field.skipChanged = false
        } else if (!field.readOnly && value) {
          me.calcWorkPlace(me, true)
        }
        break
    }
  }
}

function calcWorkPlace (me, clear = false) {
  const params = {
    orgID: me.record.get('documentID.orgID'),
    workPlace: {
      employeeNumberID: me.record.get('employeeNumberID'),
      departmentID: me.record.get('departmentID'),
      dictPositionID: me.record.get('dictPositionID'),
      documentID: me.record.get('documentID'),
      state: me.record.get('state'),
      ID: me.record.get('ID'),
      docDate: me.record.get('documentID.docDate'),
      dateFrom: me.record.get('dateFrom'),
      dateTo: me.record.get('dateToEmpty') || AC.dateService.maxDateUTC(),
      type: me.record.get('documentID.type')
    },
    params: { setDescription: true }
  }
  if (clear) {
    me.attr.position.removeAll()
    me.attr.accrual.removeAll()
    positionGridColumns(me)
    accrualGridColumns(me)
    if (!me.record.get('employeeNumberID') && !me.record.get('departmentID') && !me.record.get('dictPositionID')) {
      return
    }
  } else {
    const allRecord = me.attr.position.getStore().snapshot || me.attr.position.getStore().data
    const positions = []
    allRecord.items.forEach(function (rec) {
      const data = rec.getData()
      data.internalId = rec.internalId
      if (me.attr.position.selectedRecord &&
        me.attr.position.selectedRecord.internalId === data.internalId &&
        me.attr.position.selectedRecord.justInsertedAccrualIDs) {
        data.justInsertedAccrualIDs = me.attr.position.selectedRecord.justInsertedAccrualIDs
      }
      positions.push(data)
    })
    params.position = positions
  }
  me.setLoading(true)
  $App.connection.run({
    entity: 'trf_workPlace',
    method: 'calcPositions',
    params: JSON.stringify(params)
  }).then((mParams) => {
    const workPlace = JSON.parse(mParams.workPlace) || {}
    const position = JSON.parse(mParams.position)
    if (clear) {
      me.attr.position.getStore().insert(0, position)
      if (position.length) {
        setFocus(me, 'position', me.attr.position.getStore().getAt(0))
      }
    } else {
      let deleteDictPositionID = null
      if (workPlace && workPlace.dictPositionID && workPlace.dictPositionID !== me.attr.dictPositionID.getValue()) {
        deleteDictPositionID = me.attr.dictPositionID.getValue()
        me.attr.dictPositionID.skipChanged = true
        me.attr.dictPositionID.setValue(workPlace.dictPositionID)
      }
      // Обновить и добавить новые позиции
      position.forEach(pos => {
        let record = pos.internalId ? me.attr.position.getStore().getByInternalId(pos.internalId) : null
        if (!record) {
          me.attr.position.getStore().insert(0, pos)
          record = me.attr.position.getStore().getAt(0)
          pos.internalId = record.internalId
        }
        if (record) {
          Object.keys(pos).forEach(attrName => {
            if (attrName !== 'internalId') {
              record.set(attrName, pos[attrName])
            }
          })
          record.set('change', null)
          if (me.attr.position.selectedRecord && pos.internalId === me.attr.position.selectedRecord.internalId) {
            me.attr.accrual.setLocalStoreData(pos.accrual || [])
            sortAccrual(pos.accrual, me)
          }
        }
      })
      // Удалить старую позицию
      if (deleteDictPositionID) {
        const gridPosition = me.attr.position.getData()
        for (let i = gridPosition.length - 1; i >= 0; i--) {
          if (gridPosition[i].dictPositionID === deleteDictPositionID) {
            me.attr.position.removeDataRow(null, i)
          }
        }
      }

      // me.attr.position.getStore().sort(['posIndex', 'ASC'])
      // me.attr.position.setLocalStoreData(sortPositions(me.attr.position.getData(), workPlace.dictPositionID))
      // const pos = me.attr.position.getData()
      // for (let i = 0; i < pos.length; i++) {
      //   const record = me.attr.position.getStore().getAt(i)
      //   Object.keys(pos[i]).forEach(attrName => {
      //     if (attrName !== 'internalId') {
      //       record.set(attrName, pos[i][attrName])
      //     }
      //   })
      //   record.set('change', null)
      // }

      if (me.attr.position.selectedRecord) {
        setFocus(me, 'position', me.attr.position.selectedRecord)
      } else if (position.length) {
        setFocus(me, 'position', me.attr.position.getStore().getAt(0))
      }
    }
    me.setIsDirty(true)
    if (me.attr.position.GridSummary) {
      me.attr.position.GridSummary.dataBind()
    }
    positionGridColumns(me)
    accrualGridColumns(me)
    me.setLoading(false)
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}

function setPositionData (me, grid, record, formData) {
  if (!record) {
    let index = grid.getStore().data.length
    grid.getStore().insert(index, {})
    record = grid.getStore().getAt(index)
  }
  if (formData.posIndex) {
    grid.getStore().data.items.forEach(o => {
      const rec = grid.getStore().getByInternalId(o.internalId)
      if (rec) {
        const recPosIndex = rec.get('posIndex')
        if (recPosIndex >= formData.posIndex) {
          rec.set('posIndex', recPosIndex + 1)
        }
      }
    })
  }
  Object.keys(formData).forEach(name => {
    record.set(name, formData[name])
  })
  record.set('change', true)
  setFocus(me, 'position', record)
  me.calcWorkPlace(me)
}

function setAccrualData (me, currentPositionRow, recalcAccrual) {
  currentPositionRow.set('accrual', recalcAccrual)
  me.calcWorkPlace(me)
}

function showListAccrualByPosition (me) {
  if (me.attr.position.selectedRecord) {
    const onDate = me.attr.dateFrom.getValue()
    UB.Repository('hr_payEl')
      .attrs(['ID', 'code', 'name', 'description', 'methodID.code', 'methodID.methodGroupID.code', 'dictExperienceID'])
      .where('methodID.code', 'in', [
        '143', '144', '145', '146', '147', '156'
      ], 'byMethodCode')
      .exists(UB.Repository('trf_dictAccrual')
        .correlation('payElID', 'ID')
        .where('[payElID.methodID.methodGroupID.code]', 'in', ['1', '2'])
        .where('mi_deleteDate', '>=', '#maxdate'), 'byMethodGroupCode')
      .logic('([byMethodCode] OR [byMethodGroupCode])')
      .selectAsObject({
        payElID: 'ID',
        'payElID.code': 'code',
        'payElID.name': 'name',
        'methodID.methodGroupID.code': 'methodGroupID.code'
      })
      .then(sourceData => {
        const dictPositionID = me.attr.position.selectedRecord ? me.attr.position.selectedRecord.getData().dictPositionID : me.attr.dictPositionID
        UB.Repository('hr_dictPositionPayEl')
          .attrs(['payElID'])
          .where('dictPositionID', '=', dictPositionID)
          .selectAsObject()
          .then((dictPositionPayEl) => {
            return dictPositionPayEl.length
              ? sourceData.filter(s => dictPositionPayEl.find(e => e.payElID === s.ID))
              : sourceData
          })
          .then(sourceData => {
            getDictAccrualDt(appAC.globalOrganization())
              .then(mParams => {
                const dictAccrualDt = JSON.parse(mParams.dictAccrualDt) || {}
                dictAccrualDt.forEach(o => {
                  o.dateFrom = AC.dateService.shiftDate(o.dateFrom)
                  o.dateTo = AC.dateService.shiftDate(o.dateTo)
                })
                const selectData = []
                const accrual = me.attr.accrual.getData()
                accrual.forEach(record => {
                  if (!sourceData.find(o => o.payElID === record.payElID)) {
                    selectData.push({ ID: record.payElID, value: record.payElID })
                  }
                })
                removeNonActualAccruals({
                  dictAccrualDt,
                  orgID: appAC.globalOrganization(),
                  experience: me.employeeExperience,
                  position: me.attr.position.selectedRecord ? me.attr.position.selectedRecord.getData() : null,
                  payEl: sourceData,
                  accruals: accrual,
                  onDate
                })
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_payElListSelect',
                  cmpInitConfig: {
                    sourceData,
                    selectData,
                    onSelectData: (data) => {
                      if (data.remove.length) {
                        for (let i = accrual.length - 1; i >= 0; i--) {
                          if (data.remove.find(o => o === accrual[i].payElID)) {
                            accrual.splice(i, 1)
                          }
                        }
                      }
                      const justInsertedAccrualIDs = []
                      let internalId = 0
                      if (data.add.length) {
                        data.add.forEach(payElID => {
                          const source = sourceData.find(o => o.ID === payElID)
                          if (!(source['methodGroupID.code'] === '1' && accrual.find(o => o['payElID.methodID.code'] === source['methodID.code'])) &&
                            !(source['methodGroupID.code'] !== '1' && accrual.find(o => o['payElID.code'] === source['code']))) {
                            internalId++
                            justInsertedAccrualIDs.push(internalId)
                            accrual.push({
                              internalId,
                              payElID,
                              'payElID.methodID.code': source['methodID.code'],
                              dictPupilID: null,
                              baseSum: null,
                              experienceYears: null,
                              experienceMonths: null,
                              accrualRate: null,
                              rate: null,
                              hours: null,
                              accrualSum: null,
                              flagsFix: 0
                            })
                          }
                        })
                      }
                      me.attr.position.selectedRecord.set('accrual', accrual)
                      me.attr.position.selectedRecord.justInsertedAccrualIDs = justInsertedAccrualIDs
                      me.calcWorkPlace(me)
                      me.attr.position.selectedRecord.justInsertedAccrualIDs = null
                    }
                  }
                })
              })
          })
      })
  }
}

function getEmployeeExperience (me, employeeNumberID, onDate) {
  me.attr.employeeExperience.setValue()
  me.employeeExperience = []
  if (!employeeNumberID || !AC.dateService.isValid(onDate)) return
  me.setLoading(true)
  const params = { employeeNumberID, onDate }
  $App.connection.run({
    entity: 'trf_workPlace',
    method: 'calcEmployeeExperience',
    params: JSON.stringify(params)
  }).then((mParams) => {
    const expList = JSON.parse(mParams.employeeExperience)
    let value = ''
    if (expList && expList.length) {
      UB.Repository('hr_dictExperience')
        .attrs(['ID', 'name'])
        .selectAsObject()
        .then(expDict => {
          expList.forEach(rec => {
            me.employeeExperience.push(rec)
            if (value.length) value += ', '
            const dict = expDict.find(dict => dict.ID === rec.ID)
            value += UB.i18n(`{0}: {1} р. {2} м. {3} д.`, dict.name, rec.years, rec.months, rec.days)
          })
          me.attr.employeeExperience.setValue(value)
          me.setLoading(false)
        })
    } else {
      me.setLoading(false)
    }
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}

function onGridEdit (me, gridName, context, control) {
  if (context.column.field.flagsFix && context.value !== context.column.field.prevValue) {
    context.record.set('flagsFix', context.record.get('flagsFix') | context.column.field.flagsFix)
  }
}

function getDictAccrualDt (orgID) {
  const params = { orgID }
  return $App.connection.run({
    entity: 'trf_workPlace',
    method: 'getDictAccrualDt',
    params: JSON.stringify(params)
  })
}

function getDictAccrual (dictAccrualDt, payElID, orgID, positionID, qualID, subjID, pupilID, onDate) {
  const rule = dictAccrualDt.find(row =>
    (!onDate || (onDate <= row.dateTo && onDate >= row.dateFrom)) &&
    (!payElID || row.payElID === payElID) &&
    (!orgID || row.orgList.length === 0 || (row.excludeOrg && row.orgList.findIndex(o => o === orgID) < 0) || (!row.excludeOrg && row.orgList.findIndex(o => o === orgID) >= 0)) &&
    (!positionID || row.positionList.length === 0 || (row.excludePosition && row.positionList.findIndex(o => o === positionID) < 0) || (!row.excludePosition && row.positionList.findIndex(o => o === positionID) >= 0)) &&
    (!qualID || row.qualificationList.length === 0 || (row.excludeQualification && row.qualificationList.findIndex(o => o === qualID) < 0) || (!row.excludeQualification && row.qualificationList.findIndex(o => o === qualID) >= 0)) &&
    (!subjID || row.subjectList.length === 0 || (row.excludeSubject && row.subjectList.findIndex(o => o === subjID) < 0) || (!row.excludeSubject && row.subjectList.findIndex(o => o === subjID) >= 0)) &&
    (!pupilID || row.pupilList.length === 0 || (row.excludePupil && row.pupilList.findIndex(o => o === pupilID) < 0) || (!row.excludePupil && row.pupilList.findIndex(o => o === pupilID) >= 0)))
  return rule
}

function removeNonActualAccruals ({ dictAccrualDt, orgID, experience, position, payEl, accruals, onDate }) {
  const mainAccrual = accruals.find(o => ['1', '146', '147'].includes(o['payElID.methodID.code']))
  for (let i = payEl.length - 1; i >= 0; i--) {
    if (accruals.find(o => o.payElID === payEl[i].ID)) {
      continue
    }
    let isActual = false
    switch (payEl[i]['methodID.code']) {
      case '1':
        isActual = !mainAccrual || mainAccrual['payElID.methodID.code'] === '1'
        break
      case '4':
      case '154':
      case '155':
        isActual = getDictAccrual(dictAccrualDt, payEl[i].ID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, position.dictPupilID, onDate)
        break
      case '5':
        isActual = position.dictRankID
        break
      case '6':
        isActual = experience.find(o => o.ID === payEl[i].dictExperienceID)
        break
      case '143':
      case '145':
      case '144':
        isActual = true
        break
      case '146':
        isActual = !mainAccrual || mainAccrual['payElID.methodID.code'] === '146'
        break
      case '156':
        isActual = !mainAccrual || mainAccrual['payElID.methodID.code'] === '156'
        break
      case '147':
        isActual = !mainAccrual || mainAccrual['payElID.methodID.code'] === '147'
        break
      case '148':
        isActual = (!mainAccrual || mainAccrual['payElID.methodID.code'] === '146') && getDictAccrual(dictAccrualDt, payEl[i].ID, orgID, position.dictPositionID, position.dictQualificationID, position.dictSubjectID, position.dictPupilID, onDate)
        break
      case '152':
        isActual = position.dictEducationRankID
        break
    }
    if (!isActual) {
      payEl.splice(i, 1)
    }
  }
}

function setDateRange (me) {
  const docDateFrom = me.record.get('documentID.dateFrom') || appAC.globalApplicationDate()
  const docDateTo = me.record.get('documentID.dateTo') || AC.dateService.maxDateUTC()
  const empDateFrom = me.attr.employeeNumberID.getValue() ? me.attr.employeeNumberID.getVal('dateFrom') : null
  const empDateTo = me.attr.employeeNumberID.getValue() ? me.attr.employeeNumberID.getVal('dateTo') : null
  const minValue = empDateFrom ? docDateFrom > empDateFrom ? docDateFrom : empDateFrom : docDateFrom
  const maxValue = empDateTo ? docDateTo < empDateTo ? docDateTo : empDateTo : docDateTo
  if (me.record.get('dateFrom') < minValue) {
    me.record.set('dateFrom', minValue)
  }
  if (me.record.get('dateFrom') > maxValue) {
    me.record.set('dateFrom', maxValue)
  }
  if (me.record.get('dateToEmpty') && me.record.get('dateToEmpty') > maxValue) {
    me.record.set('dateToEmpty', maxValue)
  }
  if (me.record.get('dateToEmpty') && me.record.get('dateToEmpty') < minValue) {
    me.record.set('dateToEmpty', minValue)
  }
  me.attr.dateFrom.setMinValue(minValue)
  me.attr.dateFrom.setMaxValue(maxValue)
  me.attr.dateToEmpty.setMinValue(minValue)
  me.attr.dateToEmpty.setMaxValue(maxValue)
}

function getDictPositionProps (me) {
  UB.Repository('trf_dictPositionProps')
    .attrs(['subject', 'pupil', 'dictPositionID'])
    .selectAsObject()
    .then(result => { me.dictPositionProps = result })
}

function accrualGridColumns (me) {
  if (me.dictPositionProps && me.attr.accrual.selectedParentRecord) {
    const choicePosition = me.attr.accrual.selectedParentRecord.getData().dictPositionID
    const hidePosition = me.dictPositionProps.find(o => o.dictPositionID === choicePosition)
    if (hidePosition) {
      AC.gridUtils.setGridColumnVisible(me.attr.accrual, ['dictPupilID.name'], ['1', '2'].includes(hidePosition.pupil))
    } else {
      AC.gridUtils.setGridColumnVisible(me.attr.accrual, ['dictPupilID.name'], false)
    }
  }
  const accrual = me.attr.accrual.getData()
  const showHours = accrual.reduce((a, rec) => { return a || ['146', '148'].includes(rec['payElID.methodID.code']) }, false)
  AC.gridUtils.setGridColumnVisible(me.attr.accrual, ['hours'], showHours)
  const showLeadingClass = !!accrual.find(o => o['payElID.methodID.code'] === '154' || o.leadingClass) // Надбавка за класне керівництво
  AC.gridUtils.setGridColumnVisible(me.attr.accrual, ['leadingClass'], showLeadingClass)
}

function positionGridColumns (me) {
  const positionIDs = me.attr.position.getData().map(o => { return o.dictPositionID }).filter(o => { return o !== null })
  if (me.dictPositionProps) {
    let subjectFlag = false
    me.dictPositionProps.forEach(o => {
      if (positionIDs.find(id => id === o.dictPositionID)) {
        subjectFlag = true
      }
    })
    AC.gridUtils.setGridColumnVisible(me.attr.position, ['dictSubjectID.description'], subjectFlag)
  } else {
    AC.gridUtils.setGridColumnVisible(me.attr.position, ['dictSubjectID.description'], false)
  }
  const hrStaffCatByPosition = AC.settings.get('hrStaffCatByPosition', appAC.globalOrganization())
  const accCategory = (hrStaffCatByPosition
    ? appHR.getAccCategoryByPositionType(me.attr.dictPositionID.getFieldValue('positionType'))
    : me.attr.dictPositionID.getFieldValue('dictStaffCatID.accCategory')) || '1'
  AC.gridUtils.setGridColumnVisible(me.attr.position, ['dictRankID.description'], accCategory === '2')
  AC.gridUtils.setGridColumnVisible(me.attr.position, ['dictRankID.description'], accCategory === '2')
  AC.gridUtils.setGridColumnVisible(me.attr.position, ['dictEducationRankID.description'], accCategory !== '2')
  AC.gridUtils.setGridColumnVisible(me.attr.position, ['dictTarifCoeffID.name'], accCategory !== '2')
  // AC.gridUtils.setGridColumnVisible(me.attr.position, ['workScheduleID.name'], accCategory !== '2')
  AC.gridUtils.setGridColumnVisible(me.attr.position, ['workNormID.weekHours'], accCategory !== '2')
}

function sortAccrual (accrual, me) {
  // const codeSort = accrual.sort((a, b) => {
  //   return parseInt(a['payElID.description']) - parseInt(b['payElID.description'])
  // }).sort((a, b) => {
  //   return parseInt(a['dictPupilID.name']) - parseInt(b['dictPupilID.name'])
  // })
  // return me.attr.accrual.setLocalStoreData(codeSort)
  const sorted = accrual.sort((a, b) =>
    a['payElID.methodID.code'] === '143' ? -1
      : b['payElID.methodID.code'] === '143' ? 1
        : a['payElID.methodID.code'] === '144' ? -1
          : b['payElID.methodID.code'] === '144' ? 1
            : a['payElID.methodID.code'] === '152' ? -1
              : b['payElID.methodID.code'] === '152' ? 1
                : a['payElID.methodID.code'] === '145' ? -1
                  : b['payElID.methodID.code'] === '145' ? 1
                    : (a.dictPupilID || Number.MAX_VALUE) === (b.dictPupilID || Number.MAX_VALUE)
                      ? a['payElID.methodID.code'] === b['payElID.methodID.code']
                        ? Number(String(a['payElID.description'] || '').replace(/\s.*/g, '') || 0) - Number(String(b['payElID.description'] || '').replace(/\s.*/g, '') || 0)
                        : a['payElID.methodID.code'] === '146' ? -1
                          : b['payElID.methodID.code'] === '146' ? 1
                            : a['payElID.methodID.code'] === '147' ? -1
                              : b['payElID.methodID.code'] === '147' ? 1
                                : a['payElID.methodID.code'] === '156' ? -1
                                  : b['payElID.methodID.code'] === '156' ? 1
                                    : a['payElID'] === b['payElID'] ? -1
                                      : Number(String(a['payElID.description'] || '').replace(/\s.*/g, '') || 0) - Number(String(b['payElID.description'] || '').replace(/\s.*/g, '') || 0)
                      : a['dictPupilID.name'] && b['dictPupilID.name']
                        ? Number(a['dictPupilID.name'].replace(/[^\d]/g, '') || 0) - Number(b['dictPupilID.name'].replace(/[^\d]/g, '') || 0)
                        : (a.dictPupilID || Number.MAX_VALUE) - (b.dictPupilID || Number.MAX_VALUE)
  )
  return me.attr.accrual.setLocalStoreData(sorted)
}

function sortPositions (positions, mainPositionID) {
  return positions.sort((a, b) =>
    //   a.dictPositionID === mainPositionID
    //     ? -1
    //     : b.dictPositionID === mainPositionID
    //       ? 1
    //       : Number(String(a['dictPositionID.code'] || '').replace(/[^\d]/g, '') || 0) - Number(String(b['dictPositionID.code'] || '').replace(/[^\d]/g, '') || 0)
    (a.posIndex || 999) - (b.posIndex || 999)
  )
}
