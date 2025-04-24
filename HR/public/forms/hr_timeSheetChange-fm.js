/* global HR appAC appHR UB $App AC _ */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  postInit,
  onAfterOrderSave,
  setEmployeeNumbers,
  onControlChanged,
  fillTimeCostDay,
  clearTimeCostDay,
  beforePosting,
  saveEmpData
}

function initComponentStart () {
  let me = this
  me.orderConfig = {
    hideEditDocNumber: true,
    hideEditPeriodID: true,
    detailGrids: ['timeSheetChangeDay', 'timeSheetChangeEmp']
  }
  HR.orderManager.init(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.timeSheetChangeDay.length')) {
    me.attr.timeSheetChangeDay.setLocalStoreData(me.formData.detail.timeSheetChangeDay)
  } else if (data.method !== 'addnew') {
    me.attr.timeSheetChangeDay.removeAll()
  }
  if (_.get(me, 'formData.detail.timeSheetChangeEmp.length')) {
    me.formData.detail.timeSheetChangeEmp.forEach(row => {
      row['dateToEmpty'] = AC.dateService.shiftDate(row['dateToEmpty'])
    })
    me.attr.timeSheetChangeEmp.setLocalStoreData(me.formData.detail.timeSheetChangeEmp)
  } else if (data.method !== 'addnew') {
    me.attr.timeSheetChangeEmp.removeAll()
  }
}
function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.timeSheetChangeDay.setLocalStoreData(me.formData.detail.timeSheetChangeDay, false, true)
    me.formData.detail.timeSheetChangeEmp.forEach(row => {
      row['dateToEmpty'] = AC.dateService.shiftDate(row['dateToEmpty'])
    })
    me.attr.timeSheetChangeEmp.setLocalStoreData(me.formData.detail.timeSheetChangeEmp, false, true)
  }
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

function beforePosting () {
  const me = this
  const store = me.attr.timeSheetChangeEmp.getStore()
  const allRecords = store.snapshot || store.data
  if (allRecords.length) {
    return Promise.resolve(true)
  } else {
    $App.dialogInfo(UB.i18n('Неможливо провести документ. Список працівників порожній.'), UB.i18n('Увага!'))
    return Promise.resolve(false)
  }
}

/**
 * @event onFormDataReady
 * Fires when data bonded and all form required data loaded (combobox data, details data e.t.c.)
 */
function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    appHR.getCurrentPeriod(me.record.get('organizationID')).then(response => { me.attr.periodID.setValueById(response.ID) })
    me.fillTimeCostDay()
    if (!me.record.get('method')) me.record.set('method', '1')
  } else {
    setControls(me)
  }
  me.customPosting = doCustomPosting
}

function doCustomPosting (me) {
  me.saveForm()
    .then(function (result) {
      if (result !== -1) {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Провести документ?'))
          .then(function (choice) {
            if (choice) {
              me.setLoading(true)
              $App.connection.run({
                entity: 'hr_timeSheetChange',
                method: 'doPosting',
                execParams: {
                  ID: me.instanceID
                }
              }).then(() => {
                me.setLoading(false)
                me.loadInstance()
              }, err => {
                me.setLoading(false)
                throw err
              })
            }
          })
      }
    })
}

function fillTimeCostDay () {
  const me = this
  me.attr.timeSheetChangeDay.removeAll()
  UB.Repository('hr_dictTimeCost')
    .attrs(['ID', 'code', 'nameSmall'])
    .where('code', 'in', [appAC.langCodei18n('РбДн'), appAC.langCodei18n('Вих')])
    .selectAsObject().then(dictTimeCost => {
      const work = dictTimeCost.find(o => o.code === appAC.langCodei18n('РбДн'))
      const free = dictTimeCost.find(o => o.code === appAC.langCodei18n('Вих'))
      for (let i = 1; i < 8; i++) {
        me.attr.timeSheetChangeDay.addNewRecord(
          {
            numDay: i,
            'dictTimeCostID.nameSmall': (i < 6 ? work.nameSmall : free.nameSmall),
            dictTimeCostID: (i < 6 ? work.ID : free.ID),
            hoursWork: (i < 6 ? 8 : 0)
          }
        )
      }
    })
}

function clearTimeCostDay (row) {
  const me = this
  me.attr.timeSheetChangeDay.removeAll()
  if (row) me.attr.timeSheetChangeDay.addNewRecord(row)
}

function setEmployeeNumbers (me) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberSearch',
    isModal: true,
    cmpInitConfig: {
      orgID: me.record.get('organizationID'),
      readOnlyAttr: ['periodID'],
      defaultValues: {
        periodID: me.record.get('periodID'),
        depID: me.record.get('departmentID')
      },
      onSelect: (data) => {
        const store = me.attr.timeSheetChangeEmp.getStore()
        const allRecords = store.snapshot || store.data
        const existEmployeeNumbers = []

        data.forEach(row => {
          if (!allRecords.findBy(o => o.get('employeeNumberID') === row.employeeNumberID)) {
            me.attr.timeSheetChangeEmp.addNewRecord(
              {
                'employeeNumberID.description': row['employeeNumberID.description'],
                'employeeNumberID.depName': row['depName'],
                'employeeNumberID.posName': row['posName'],
                employeeNumberID: row.employeeNumberID,
                orderState: 'PROJECT',
                dateToEmpty: me.record.get('dateToEmpty')
              }
            )
          } else {
            existEmployeeNumbers.push(row['employeeNumberID.description'])
          }
        })
        me.setIsDirty(true)
        if (existEmployeeNumbers.length) {
          $App.dialogInfo(UB.i18n(`Працівники які вже були додані раніше</br>{0}`, existEmployeeNumbers.join('</br>')))
        }
      }
    }
  })
}

function setControls (me) {
  const method = me.attr.method.getValue()
  const tabPanel = me.down('tabpanel')
  const tabDay = tabPanel.down('[name=timeSheetChangeDay]')
  const tabEmp = tabPanel.down('[name=timeSheetChangeEmp]')
  me.attr.hoursMinus.setVisible(method === '1')
  if (method === '1') {
    tabDay.tab.hide()
    tabPanel.setActiveTab(tabEmp)
  } else {
    tabDay.tab.show()
    tabPanel.setActiveTab(tabDay)
  }
}

function onControlChanged (form, field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'method':
      setControls(me)
      break
    case 'dateToEmpty':
      if (!value || AC.dateService.isValid(value)) {
        const store = me.attr.timeSheetChangeEmp.getStore()
        store.each(record => {
          if (record.get('flagsFix') !== 1) {
            record.set('dateToEmpty', value)
          }
        })
      }
      break
  }
}

function saveEmpData (grid, record, formData) {
  const me = this
  const isEqualDateTo = (!formData['dateToEmpty'] && !me.record.get('dateToEmpty')) || (formData['dateToEmpty'] && me.record.get('dateToEmpty') && formData['dateToEmpty'].getTime() === me.record.get('dateToEmpty').getTime())
  if (!record) {
    grid.addNewRecord(
      {
        'employeeNumberID.description': formData['employeeNumberID.description'],
        'employeeNumberID.depName': formData['employeeNumberID.depName'],
        'employeeNumberID.posName': formData['employeeNumberID.posName'],
        employeeNumberID: formData.employeeNumberID,
        orderState: 'PROJECT',
        dateToEmpty: formData['dateToEmpty'] ? AC.dateService.truncTimeToUtcNull(formData['dateToEmpty']) : null,
        flagsFix: isEqualDateTo ? 0 : 1
      }
    )
  } else {
    record.set('employeeNumberID.description', formData['employeeNumberID.description'])
    record.set('employeeNumberID.depName', formData['employeeNumberID.depName'])
    record.set('employeeNumberID.posName', formData['employeeNumberID.posName'])
    record.set('employeeNumberID', formData.employeeNumberID)
    record.set('dateToEmpty', formData['dateToEmpty'] ? AC.dateService.truncTimeToUtcNull(formData['dateToEmpty']) : null)
    record.set('flagsFix', isEqualDateTo ? 0 : 1)
  }
  me.setIsDirty(true)
}
