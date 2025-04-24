/* global HR AC UBS UB */
/* jshint maxerr: 10000 */
exports.formCode = {
  controlChanged,
  initComponentStart: function () {
    const me = this
    me.on('afterrender', function () {
      let win = this.window
      if (win) {
        if (!win.height) {
          win.height = 600
        }
        if (!win.width) {
          win.width = 800
        }
      }
    })
    me.on('controlChanged', controlChanged, me)
    me.on('afterrender', () => {
      me.orderForm.makeReasonSelector && me.orderForm.makeReasonSelector(me)
    })

    // eslint-disable-next-line no-caller
    callParentFromCmdConfig(me, arguments.callee.name)
  },

  addBaseActions: function () {
    const me = this
    me.callParent(arguments)
  },

  initUBComponent: function () { // Вызывается после окончания привязки данных к элементам формы. Непосредственно перед formDataReady  и перед снятием блокировки формы (затемнение) .
    const me = this
    me.dataBind = {
      fullFIO: {
        value: '({lastName} || "?") + " " + ({firstName} || "?") + ({middleName} ? " " + {middleName}:"")'
      },
      shortFIO: {
        value: '({lastName} || "?") + " " + ({firstName} || "?")[0].toUpperCase() + "." + ({middleName} ? {middleName}[0].toUpperCase() + "." : "")'
      }
    }
    UBS.dataBinder.applyBinding(me)
  },

  enableControls: function () {
    const me = this
    let isPosted
    if (me.masterForm && me.masterForm.enableParaControls) {
      isPosted = me.masterForm.enableParaControls(me)
    } else {
      isPosted = true
      me.query('[attributeName]').forEach(item => {
        if (!item.setReadOnly) {
          return
        }
        item.setReadOnly(isPosted)
      })
      me.actions.fDelete.setDisabled(isPosted)
      let grids = me.query('entitygridpanel')
      grids.forEach(grid => {
        let actions = [grid.down('[name=fillFromStaff]'), grid.actions.fDelete, grid.actions.addNew, grid.actions.addNewByCurrent]
        grid.isEditDisabled = isPosted
        actions.forEach(item => {
          if (item) {
            if (isPosted) {
              item.hide()
            } else {
              item.show()
            }
            item.setDisabled(isPosted)
          }
        })
      })
    }
    me.down('[attributeName=employeePositionID]').setVisible(!isPosted)
    me.down('[attributeName=posDescriptionOld]').setVisible(isPosted)
    me.down('[attributeName=employeeID.taxCode]').setReadOnly(true)
  },

  filterEmployeePosition: function () {
    const me = this
    if (me.orderForm.filterEmployeePosition) {
      me.orderForm.filterEmployeePosition(me, {
        attrToFilter: 'employeePositionID',
        clearValue: false
      })
    }
  },

  initComponentDone: function () {
    const me = this
    if (me.customParams.orderForm) {
      me.masterForm = me.orderForm = me.customParams.orderForm
    } else {
      me.masterForm = me.orderForm = me.sender.up('form')
    }
    me.orderState = me.orderForm.record.get('orderState')

    me.onBeforeSave = () => {
      me.record.set('paraID', me.instanceID)
      if (!me.record.get('fullFIO')) {
        me.record.set('fullFIO', me.getField('fullFIO').getValue())
      }
      if (!me.record.get('shortFIO')) {
        me.record.set('shortFIO', me.getField('shortFIO').getValue())
      }
      ['genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName']
        .filter(attr => !me.record.get(attr))
        .forEach(attr => me.record.set(attr, me.record.get('fullFIO')))

      return Promise.resolve(true)
    }
    me.on('recordloaded', function (a) {
      const me = this
      if (me.isNewInstance) {
        me.record.set('orderID', me.orderForm.instanceID)
        me.record.set('organizationID', me.orderForm.record.get('organizationID'))
        me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
      }
      me.filterEmployeePosition()
      me.record.store.on('update', (store, reco, oper, modified, eOpts) => {})
      HR.orderManager.setTitleByOrderType(me)
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
      me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
      let isProject = me.orderState === 'PROJECT'
      if (isProject && !me.isNextRecordMakerExists) {
        me.isNextRecordMakerExists = true
        HR.orderManager.setNextRecordMaker(me, [
          'dictReasonDismID',
          {
            isExternal: value => value,
            bonusID: value => value,
            organizationID: value => me.masterForm.record.get('organizationID'),
            empOrderType: value => value,
            orderID: value => value
          }
        ], 4)
      }
    })
    me.on('formDataReady', function (a) {
      HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
      me.enableControls()
    })
    /*this.on('beforeSaveForm', function (a) {})
    this.on('aftersave', function (a) {})
    this.on('beforeDelete', function (a) {})
    this.on('afterDelete', function (a) {})
    this.on('beforeClose', function (a) {
      if (me.sender) {
        let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
        if (grid) {
          grid.onRefresh()
        }
      }
    })*/

    AC.viewUtils.setAttr(me)

    const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
    if (isEnableReasonDoc) {
      me.down('[name=reasonDocPanel]').show()
    }
  }
}

function getCurrentRecord (entity, fieldList, ID) {
  return UB.Repository(entity)
    .attrs(fieldList)
    .selectById(ID)
}

function controlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'employeePositionID':
      me.record.set('employeeID.taxCode', null)
      me.record.set('employeeID.sexType', null)
      me.record.set('description', null)
      me.record.set('title', null)
      me.record.set('employeeID', null)
      me.record.set('posDescriptionOld', null)
      const employeePositionID = field.getValue()
      getCurrentRecord(field.store.ubRequest.entity, field.store.ubRequest.fieldList, employeePositionID).then((reco) => {
        if (!reco) {
          return
        }
        me.record.set('employeeNumberID', reco.employeeNumberID)
        me.record.set('posDescriptionOld', reco.description)
        me.record.set('title', reco.description)
        const fillFields = ['lastName', 'firstName', 'middleName', 'genName', 'datName', 'accusativeName', 'insName', 'locName', 'vocName', 'shortFIO', 'fullFIO', 'taxCode', 'sexType']
        return UB.Repository('hr_employee')
          .attrs(fillFields)
          .selectById(reco.employeeID)
          .then(data => {
            if (data) {
              me.record.set('employeeID', reco.employeeID)
              me.record.set('description', HR.reportUtils.getFullName(data.lastName, data.firstName, data.middleName))
              fillFields.forEach(item => {
                me.record.set(item === 'taxCode' ? 'employeeID.taxCode' : item, data[item])
                if (item !== 'taxCode' && item !== 'sexType') {
                  me.record.set(item + 'Old', data[item])
                }
              })
            }
            me.fireEvent('employeePositionChanged')
          })
      })
      break
    case 'fullFIO':
      // me.record.set('fullFIO', value)
      break
    case 'shortFIO':
      // me.record.set('shortFIO', value)
      break
  }
}

function callParentFromCmdConfig (form, funcName) {
  const func = form.commandConfig && form.commandConfig.cmpInitConfig && form.commandConfig.cmpInitConfig[funcName]
  if (func) {
    return func.apply(form, null)
  }
}
