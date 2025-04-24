/* global Ext AC HR _ UB $App appAC Blob  */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  selectPreamble,
  filterPosition,
  addBaseActions
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.isVacantPos = me.down('[name=isVacant]')
}

function onRecordLoaded () {
  const me = this
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.attr.dateFrom.setValue(appAC.globalApplicationDate())
    me.attr.organizationID.setValue(appAC.globalOrganization())
  }
  me.setTitle(`Кандидат на посаду ${me.attr.status.getRawValue()}`)
  showCreateOrderAction(me)
  AC.viewUtils.setFilterValue(me.attr.empOrderAppointID, { employeeID: me.record.get('employeeID'), organizationID: appAC.globalOrganization() })
  AC.viewUtils.setFilterValue(me.attr.empOrderDismID, { employeeID: me.record.get('employeeID'), organizationID: appAC.globalOrganization(), 'orderID.orderState': 'POSTED' })
}

function onControlChanged (field, value) {
  const me = this
  if (field.getName() === 'positionID' && field.lastSelection[0]) {
    me.attr.positionName.setValue(field.lastSelection[0].getData().caption)
    if (field.getValue()) me.attr.departmentID.setValue(field.getStore().data.items.find(o => o.data.ID === value).data.departmentID)
    showCreateOrderAction(me)
  }

  if (field.getName() === 'employeeID') {
    AC.viewUtils.setFilterValue(me.attr.empOrderAppointID, { employeeID: value, organizationID: appAC.globalOrganization() }, ['clearValue'])
    AC.viewUtils.setFilterValue(me.attr.empOrderDismID, { employeeID: value, organizationID: appAC.globalOrganization(), 'orderID.orderState': 'POSTED' }, ['clearValue'])
  }
}

function selectPreamble () {
  const me = this
  const entityName = 'hr_employee'
  const fieldConfig = {
    entity: entityName,
    cmdType: UB.core.UBCommand.commandType.showList,
    description: 'Кандидат',
    isModal: true,
    sender: me,
    hideActions: [],
    onItemSelected: function (selected) {
      me.record.set('fullName', selected.get('fullFIO'))
      me.record.set('employeeID', selected.get('ID'))
      Ext.defer(function () {
        me.attr.fullName.focus(false, 1)
      }, 500)
      // showCreateOrderAction(me)
    },
    cmpInitConfig: {
      entityConfig: {
        entity: entityName,
        method: 'select',
        fieldList: ['tabNum', 'fullFIO', 'state', 'ID'],
        whereList: {
          organizationID: {
            expression: '[organizationID]',
            condition: '=',
            value: appAC.globalOrganization()
          }
        }
      }
    }
  }
  $App.doCommand(fieldConfig)
}
async function filterPosition (isVacant) {
  const me = this
  const orgID = appAC.globalOrganization()
  const posCtrl = me.attr.positionID
  if (isVacant) {
    const dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))
    const departmentIDs = await UB.Repository('hr_department')
      .attrs(['mi_data_id'])
      .where('orgID', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .selectAsArrayOfValues()
    const vacationPos = await $App.connection.run({
      entity: 'hr_positionVacContest',
      method: 'selectVacancies',
      orgID,
      onDate: AC.dateService.addDays(dateFrom, 1),
      greaterThanZero: true,
      __mip_recordhistory_all: true,
      whereList: {
        parentUnitID: {
          expression: '[parentUnitID]',
          condition: 'in',
          value: departmentIDs
        }
      },
      fieldList: ['ID', 'description', 'code', 'psCategory', 'positionType', 'vacCount', 'parentUnitID']
    })
    const vacationPosIDs = vacationPos.resultData.data.map(o => o[0])
    AC.viewUtils.setWhereListProperty(posCtrl, [['ID', 'in', vacationPosIDs]], undefined, ['clearStore', 'clearWhereList'])
  } else {
    const positionID = await UB.Repository('hr_position').attrs(['mi_data_id'])
      .where('orgID', '=', orgID)
      .where('mi_dateFrom', '<=', appAC.globalApplicationDate())
      .where('mi_dateTo', '>=', appAC.globalApplicationDate())
      .where('vacancyRate', 'isNotNull')
      .selectAsArrayOfValues()
    AC.viewUtils.setWhereListProperty(posCtrl, [['ID', 'in', positionID]], undefined, ['clearStore', 'clearWhereList'])
  }
}

function addBaseActions () {
  const me = this
  me.callParent(arguments)

  me.actions.print = new Ext.Action({
    iconCls: 'fas fa-print',
    cls: 'blue-action',
    tooltip: UB.i18n('Друк резюме'),
    text: UB.i18n('Друк резюме'),
    actionId: 'print',
    handler: function () {
      const res = me.record.get('resume')
      if (!res) {
        $App.dialogInfo(UB.i18n('Увага! У даного кандидата не заповнено резюме!'))
      } else {
        const report = Ext.create('UBS.UBReport', {
          code: 'hr_empResume',
          type: 'pdf',
          params: {
            instanceID: me.instanceID
          }
        })
        const pdfFileName = UB.i18n('Резюме') + (me.record.get('fullName') ? ' ' + me.record.get('fullName') : '')
        report.makeReport().then(function (data) {
          const blobData = new Blob([data.reportData], { type: 'application/pdf' })
          const fileName = `${pdfFileName}.pdf`
          window.saveAs(blobData, fileName)
        })
      }
    }
  })

  me.actions.createOrder = new Ext.Action({
    iconCls: 'fas fa-edit',
    cls: 'fill-action',
    scale: 'medium',
    tooltip: UB.i18n('Створити наказ про призначення'),
    text: UB.i18n('Створити наказ про призначення'),
    actionId: 'createOrder',
    hidden: true,
    handler: function () {
      $App.connection.run({
        entity: 'hr_contenderPosition',
        method: 'createOrder',
        empOrderType: 'APPOINT',
        organizationID: appAC.globalOrganization(),
        onDate: appAC.globalApplicationDate(),
        employeeID: me.attr.employeeID.getValue(),
        positionID: me.attr.positionID.getValue(),
        dateFrom: me.attr.dateApprove.getValue(),
        departmentID: me.attr.departmentID.getValue(),
        respEmployeeNumID: me.attr.recruterID.getValue(),
        instanceID: me.instanceID
      }).then(mParams => {
        const empOrderAppointDetID = mParams.empOrderAppointDetID ? mParams.empOrderAppointDetID : null
        if (mParams.orderID) {
          const commandConfig = {
            formCode: 'hr_empOrder',
            entity: 'hr_empOrder',
            cmdType: 'showForm',
            instanceID: mParams.orderID,
            sender: me,
            isModal: false,
            employeeID: mParams.employeeID,
            positionID: mParams.positionID,
            dateFrom: mParams.dateFrom,
            departmentID: mParams.departmentID,
            respEmployeeNumID: mParams.respEmployeeNumID,
            empOrderAppointDetID,
            cmpInitConfig: {
              initComponentStart () {
                const formOrder = this
                formOrder.on('recordloaded', createOrderDetail)
              }
            }
          }
          $App.doCommand(commandConfig)
        }
      })
    }
  })
}
function showCreateOrderAction (me, field) {
  me.attr.positionID.getValue() && me.attr.fullName.getValue() ? me.actions.createOrder.show() : me.actions.createOrder.hide()
}
function createOrderDetail () {
  const formOrder = this
  const empOrderType = 'APPOINT'
  formOrder.un('recordloaded', createOrderDetail)
  $App.doCommand({
    cmdType: 'showForm',
    entity: 'hr_empOrderAppointDet',
    sender: formOrder.query('[paraGrid=true]')[0],
    isModal: true,
    instanceID: formOrder.commandConfig.empOrderAppointDetID,
    customParams: {
      isGroup: false,
      empOrderType,
      contenderForm: this.commandConfig.sender
    },
    cmpInitConfig: {
      beforeRender: function () {
        const form = this
        form.on('formDataReadyFinished', function () {
          if (this.isNewInstance) {
            const depCtrl = this.down('[name=departmentID]')
            if (depCtrl) depCtrl.setValue(this.commandConfig.initialFieldValues.departmentID)
            const posCtrl = this.down('[name=positionID]')
            if (posCtrl) posCtrl.setValue(this.commandConfig.initialFieldValues.positionID)
          }
        },
        form.on('aftersave', function () {
          const appointIDCtrl = this.commandConfig.customParams.contenderForm.down('[name=empOrderAppointID]')
          if (appointIDCtrl && this.down('[name=employeeID]').getValue() === this.commandConfig.initialFieldValues.employeeID) {
            appointIDCtrl.setValueById(this.instanceID)
          }
        }))
      }
    },
    initialFieldValues: {
      positionID: formOrder.commandConfig.positionID,
      employeeID: formOrder.commandConfig.employeeID,
      dateFrom: AC.dateService.shiftDate(formOrder.commandConfig.dateFrom),
      departmentID: formOrder.commandConfig.departmentID
    }
  })
}
