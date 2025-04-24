/* global appAC appHR HR AC $App */

exports.formCode = {
  initComponentStart,
  onControlChanged,
  onFormDataReady,
  addBaseActions,
  postInit
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

function initComponentStart () {
  const me = this
  me.orderConfig = {
    hideEditPeriodID: true,
    hideEditDocNumber: true
  }

  HR.orderManager.init(me)
}

function postInit (me) {
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
}

function onFormDataReady () {
  const me = this
  const orgID = appAC.globalOrganization()
  if (me.isNewInstance) {
    appHR.getCurrentPeriod(orgID)
      .then(({ ID }) => me.attr.periodID.setValueById(ID))
    me.attr.docDate.setValue(AC.dateService.currentDate())
  }
  const isFirstDepRole = AC.entityUtils.verifyRightsMethod('hr_empOrderUni', 'canViewFirstDep')
  const isOneDepRole = AC.entityUtils.verifyRightsMethod('hr_empOrderUni', 'canViewOneDep')
  const isAllDepRole = AC.entityUtils.verifyRightsMethod('hr_empOrderUni', 'canViewAllDep')

  if (isAllDepRole) {
    AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
      organizationID: me.record.get('organizationID') || orgID,
      dateTo: { value: me.record.get('orderDate'), condition: '>=' },
      dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
    })
  } else if (isFirstDepRole || isOneDepRole) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_empOrderUni',
      method: 'getAllowedDepartments',
      onDate: appAC.globalApplicationDate(),
      orgID: appAC.globalOrganization(),
      isFirstDep: isFirstDepRole,
      employeeNumberID: $App.connection.userData().employeeNumberID
    }).then((mParams) => {
      if (mParams.departments) {
        let departments = JSON.parse(mParams.departments)
        if (!departments || !departments.length) departments = [0]
        AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
          organizationID: me.record.get('organizationID') || orgID,
          dateTo: { value: me.record.get('orderDate'), condition: '>=' },
          dateFrom: { value: me.record.get('orderDate'), condition: '<=' },
          departmentID: { value: departments, condition: 'in' }
        })
      }
    }).finally(() => {
      me.setLoading(false)
    })
  } else {
    AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
      organizationID: me.record.get('organizationID') || orgID,
      dateTo: { value: me.record.get('orderDate'), condition: '>=' },
      dateFrom: { value: me.record.get('orderDate'), condition: '<=' }
    })
  }

  const grid = AC.gridUtils.getSenderGrid(me)
  if (grid && grid.readOnly) {
    AC.viewUtils.setFormReadOnly(me, true, [], true)
    me.actions['fDelete'].hide()
    me.setActionDisabled('fDelete', true)
  }
}

function onControlChanged (me, field, value) {
  if (me.formDataReady) {
    switch (field.name) {
      case 'employeePositionID':
        me.record.set('employeeNumberID', field.getFieldValue('employeeNumberID'))
        me.record.set('employeeID', field.getFieldValue('employeeID'))
        break
      case 'orderDate':
        if (field.isValid()) {
          const orderDate = AC.dateService.truncTimeToUtcNull(value)
          AC.viewUtils.setFilterValue(me.attr.employeePositionID, {
            organizationID: me.record.get('organizationID'),
            dateTo: { value: orderDate, condition: '>=' },
            dateFrom: { value: orderDate, condition: '<=' }
          }, ['clearValue'])
        }
        break
      case 'isFullDay':
        if (value) {
          me.attr.hourDay.setValue(null)
        } else {
          me.attr.dictTimeCostID.setValueById(null)
        }
        break
      case 'dateFrom':
        if (me.attr.dateFrom.getValue() && me.attr.dateFrom.isValid() && me.attr.dateTo.getValue() && me.attr.dateTo.isValid() &&
           me.attr.dateFrom.getValue() > me.attr.dateTo.getValue()) {
          me.attr.dateTo.setValue(me.attr.dateFrom.getValue())
        }
        break
      case 'dateTo':
        if (me.attr.dateFrom.getValue() && me.attr.dateFrom.isValid() && me.attr.dateTo.getValue() && me.attr.dateTo.isValid() &&
          me.attr.dateFrom.getValue() > me.attr.dateTo.getValue()) {
          me.attr.dateFrom.setValue(me.attr.dateTo.getValue())
        }
        break
    }
  }
}
