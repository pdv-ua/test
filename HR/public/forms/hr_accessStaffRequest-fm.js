/* global $App AC Ext appAC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  addBaseActions,
  onChangeTaxCode,
  setFilterEmployeeOwner,
  setupByState,
  setRequestState
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function initComponentDone () {
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('organizationID', appAC.globalOrganization())
    me.record.set('userID', $App.connection.userData().userID)
    me.record.set('requestState', 'NEW')
    me.record.set('isAuto', false)
    me.record.set('docDate', AC.dateService.currentDate())
    setOrganizationOwnerFilter(me, [0], 'clearValue')
  } else {
    me.down('[name=organizationOwnerID]').setValue(me.record.get('organizationOwnerID'))
  }
  me.setupByState()
}

function onChangeTaxCode (me, field) {
  if (!field.value) return
  if (field.value === field.originalValue) return
  field.resetOriginalValue()
  UB.Repository('hr_employee')
    .attrs('lastName', 'firstName', 'middleName', 'birthDate', 'ID')
    .where('taxCode', '=', field.value)
    .selectSingle()
    .then(person => {
      if (person) {
        me.record.set('lastName', person.lastName)
        me.record.set('firstName', person.firstName)
        me.record.set('middleName', person.middleName)
        me.record.set('birthDate', person.birthDate)
        me.record.set('employeeID', person.ID)
      } else {
        me.record.set('lastName', null)
        me.record.set('firstName', null)
        me.record.set('middleName', null)
        me.record.set('birthDate', null)
        AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Особу не знайдено'))
      }
      me.setFilterEmployeeOwner(me, 'clearValue')
    })
}

function setFilterEmployeeOwner (me, clearMode = '') {
  const curDate = AC.dateService.currentDate()
  UB.Repository('hr_employeeNumberS')
    .attrs('orgID')
    .where('employeeID', '=', me.record.get('employeeID'))
    .where('dateFrom', '<=', curDate)
    .where('dateTo', '>=', curDate)
    .where('orgID.mi_dateFrom', '<=', curDate)
    .where('orgID.mi_dateTo', '>=', curDate)
    .where('orgID.state', '=', 'ACTIVE')
    .where('orgID', '!=', me.record.get('organizationID'))
    .selectAsObject()
    .then(data => {
      if (data && data.length) {
        const listOfIDs = data.map(o => o.orgID)
        setOrganizationOwnerFilter(me, listOfIDs, clearMode)
      } else {
        UB.Repository('ac_employeeOrg')
          .attrs('organizationID')
          .where('employeeID', '=', me.record.get('employeeID'))
          .where('organizationID', '!=', me.record.get('organizationID'))
          .selectAsObject()
          .then(data => {
            if (data && data.length) {
              const listOfIDs = data.map(o => o.organizationID)
              setOrganizationOwnerFilter(me, listOfIDs, clearMode)
            }
          })
      }
    })
}

function setOrganizationOwnerFilter (me, listOfIDs, clearMode = '') {
  const organizationOwnerCtrl = me.down('[name=organizationOwnerID]')
  const curDate = AC.dateService.currentDate()
  AC.viewUtils.setWhereListProperty(organizationOwnerCtrl, [
    ['state', '=', 'ACTIVE'],
    ['mi_data_id', 'in', listOfIDs.length ? listOfIDs : [0]],
    ['mi_dateFrom', '<=', curDate],
    ['mi_dateTo', '>=', curDate]
  ], undefined, ['clearStore', 'clearWhereList', clearMode])
}

function setupByState () {
  const me = this
  const isOwner = me.isNewInstance ? false : me.record.get('organizationOwnerID') === appAC.globalOrganization()
  const state = me.record.get('requestState')
  if (isOwner) {
    me.baseFieldList.forEach(item => { if (item !== 'comment') me.getField(item).setReadOnly(true) })
    if (state === 'SENDED') {
      me.down('[actionId=actionAcceptId]').show()
    } else {
      me.down('[actionId=actionAcceptId]').hide()
    }
  } else {
    if (state === 'NEW') {
      if (!me.isNewInstance) {
        me.down('[actionId=actionSendId]').show()
      }
      me.setFilterEmployeeOwner(me)
      me.getField('comment').setReadOnly(true)
    } else {
      me.down('[actionId=actionSendId]').hide()
    }
    if (state !== 'NEW') {
      ['taxCode', 'lastName', 'firstName', 'middleName', 'birthDate', 'organizationOwnerID', 'comment', 'reason']
        .forEach(item => me.getField(item).setReadOnly(true))
    }
  }
}

function setRequestState (state) {
  const me = this
  $App.connection.run({
    entity: 'hr_accessStaffRequest',
    method: 'setRequestState',
    execParams: {
      ID: me.instanceID,
      state: state
    }
  }).then(mParams => {
    if (mParams.result) {
      AC.viewUtils.showToast(mParams.result)
    }
    me.loadInstance()
    me.setupByState()
  }).catch(e => {
    AC.viewUtils.showToast(UB.i18n('Помилка'), e.message)
  })
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)
  me.actions.actionSendId = new Ext.Action({
    actionId: 'actionSendId',
    actionText: UB.i18n('Надіслати запит'),
    hidden: true,
    handler: () => {
      me.setRequestState('SENDED')
    }
  })
  me.actions.actionAcceptId = new Ext.Action({
    actionId: 'actionAcceptId',
    actionText: UB.i18n('Надати доступ'),
    hidden: true,
    handler: () => {
      me.setRequestState('AGREED')
    }
  })
  me.actions.actionRejectId = new Ext.Action({
    actionId: 'actionRejectId',
    actionText: UB.i18n('Відхилити'),
    hidden: true,
    handler: () => {
      me.setRequestState('REJECTED')
    }
  })
}
