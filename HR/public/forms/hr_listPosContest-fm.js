/* global Ext $App AC UB */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  // onFormDataReady,
  // onCheckValidBeforeSaveForm
  addBaseActions,
  onBeforeSave
}

function initComponentStart () {
  const form = this
  form.on('formDataReady', () => onFormDataReady(form))
}

function initComponentDone () {
  const form = this
  createActions(form)
  AC.viewUtils.setAttr(form)
  const panel = form.down('[ubID=positionPanel]')
  if (panel) {
    panel.on('collapse', () => {
      setOrganizationDescription(form)
    })
  }
}

function addBaseActions () {
  const form = this

  let importAction = form.actions.importAction
  if (!importAction) {
    importAction = new Ext.Action({
      actionId: 'importAction',
      eventId: 'importAction',
      iconCls: 'mail_left',
      text: UB.i18n('Імпорт даних'),
      hidden: !AC.entityUtils.verifyRightsMethod(form.entityName, 'importData'),
      handler: function () {
        return doActionImport(form)
      },
      scope: form
    })
    form.actions.importAction = importAction
  }

  let approveAction = form.actions.postingAction
  if (!approveAction) {
    approveAction = new Ext.Action({
      actionId: 'approveAction',
      eventId: 'approveAction',
      iconCls: 'iconApprove',
      text: UB.i18n('Погодити'),
      // hidden: !AC.entityUtils.verifyRightsMethod(me.entityName, 'doPosting'),
      handler: function () {
        return doActionApprove(form)
      },
      scope: form
    })
    form.actions.approveAction = approveAction
  }

  let rejectAction = form.actions.cancelPostingAction
  if (!rejectAction) {
    rejectAction = new Ext.Action({
      actionId: 'rejectAction',
      eventId: 'rejectAction',
      iconCls: 'iconReject',
      text: UB.i18n('Відхилити'),
      handler: function () {
        return doActionReject(form)
      },
      scope: form
    })
    form.actions.rejectAction = rejectAction
  }

  form.callParent(arguments)
}

function createActions (form) {
  const tb = form.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Редагувати'),
    name: 'actionAllowEdit',
    handler: () => {
      ['state'].forEach(ctrlName => {
        const field = form.getField(ctrlName)
        if (field) {
          field.setReadOnly(false)
        }
      })
    }
  })
}

async function getOrgDescription (orgID) {
  const org = await UB.Repository('hr_organization')
    .attrs('description')
    .where('state', '=', 'ACTIVE')
    .where('mi_data_id', '=', orgID)
    .selectSingle().then(org => org)
  return org ? org.description : ''
}

async function setOrganizationDescription (form) {
  const orgDescription = form.orgDescription || await getOrgDescription(form.record.get('positionID.orgID'))
  form.orgDescription = orgDescription
  form.down('[name=organization]').setValue(orgDescription)
  const el = Ext.query('#organizationdescription')[0]
  if (el) el.innerHTML = orgDescription
}

async function onFormDataReady (form) {
  checkVisibleActions(form)
  setOrganizationDescription(form)
}

function checkVisibleActions (form) {
  const approveAction = form.actions.approveAction
  const rejectAction = form.actions.rejectAction
  const state = form.record.get('state')

  if (approveAction) {
    approveAction.setDisabled(true)
    if (state === 'NEW') {
      approveAction.setDisabled(false)
    }
  }
  if (rejectAction) {
    rejectAction.setDisabled(true)
    if (state === 'NEW') {
      rejectAction.setDisabled(false)
    }
  }
}

function doActionApprove (form) {
  form.record.set('state', 'AGREED')
  return form.saveForm()
}

function doActionReject (form) {
  form.record.set('state', 'REJECTED')
  return form.saveForm()
}

function doActionImport (form) {
  if (form.isNewInstance) {
    return
  }
  if (form.instanceID) {
    const cmdCode = {
      cmdType: 'showForm',
      formCode: 'hr_exportPosContest-import',
      entity: 'hr_export',
      customParams: {
        posContestID: form.instanceID
      }
    }
    $App.doCommand(cmdCode)
  }
}

function onBeforeSave () {
  const me = this
  return new Promise(resolve => {
    if (me.record.get('dateClose')) {
      me.record.set('state', 'COMPLETED')
    }
    resolve(true)
  })
}
