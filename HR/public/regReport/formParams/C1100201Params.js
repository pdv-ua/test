/* global UB _ appAC AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const d = appAC.globalApplicationDate()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')

    const res = await UB.Repository('hr_organization')
      .attrs(['*'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: d })
      .orderBy('mi_dateTo', 'desc')
      .selectSingle()
    ctrls.C_DOC_CNT.setValue(1)
    if (res['FCCUCode']) ctrls.FCCUCode.setValue(res['FCCUCode'])
    if (res['EDRPOUCode']) ctrls.EDRPOUCode.setValue(res['EDRPOUCode'])
    ctrls.dateFill.setValue(d)
    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.mainChief.employeeNumberID) {
      ctrls.bosID.setValueById(data.mainChief.employeeNumberID)
    }
    if (data.accChief.employeeNumberID) {
      ctrls.buhID.setValueById(data.accChief.employeeNumberID)
    }
    if (!ctrls.bosID.getValue() || !ctrls.buhID.getValue() || !ctrls.FCCUCode.getValue() || !ctrls.EDRPOUCode.getValue()) {
      const regReportID = await UB.Repository('ac_regReport').attrs(['ID'])
        .where('dictRepID', '=', me.record.get('dictRepID'))
        .where('dictRepVersionID', '=', me.record.get('dictRepVersionID'))
        .where('organizationID', '=', me.record.get('organizationID'))
        .orderByDesc('mi_createDate')
        .selectScalar()
      if (regReportID) {
        const contentData = await $App.connection.getDocument({
          entity: 'ac_regReport',
          attribute: 'reportData',
          id: regReportID
        })
        if (contentData && contentData.formParams) {
          if (!ctrls.bosID.getValue()) {
            ctrls.bosID.setValueById(contentData.formParams['bosID'])
          }
          if (!ctrls.buhID.getValue()) {
            ctrls.buhID.setValueById(contentData.formParams['buhID'])
          }
          if (!ctrls.FCCUCode.getValue()) {
            ctrls.FCCUCode.setValue(contentData.formParams['FCCUCode'])
          }
          if (!ctrls.EDRPOUCode.getValue()) {
            ctrls.EDRPOUCode.setValue(contentData.formParams['EDRPOUCode'])
          }
        }
      }
    }

    const payRollID = me.defaultValues.sourceID
    if (payRollID) {
      ctrls.payRollID.setValue(payRollID)
    }
    /* setTimeout(() => {
      me.makeRegReport()
    }, 300) */
  },
  initForm: me => {
    me.isStart = true

    const organizationID = me.record.get('organizationID') || me.defaultValues.organizationID
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.dateFill.on('change', (field, newValue, oldValue) => {
      UB.Repository('hr_employeePositionS')
        .where('[organizationID]', '=', organizationID)
        .where('[dateFrom]', '<=', newValue)
        .where('[dateTo]', '>=', newValue)
        .attrs(['employeeNumberID'])
        .selectAsObject().then(positions => {
          const empNumIDs = positions.map(position => position.employeeNumberID)
          AC.viewUtils.setFilterValue(ctrls.bosID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
          AC.viewUtils.setFilterValue(ctrls.buhID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
          AC.viewUtils.setFilterValue(ctrls.payRollID, {
            organizationID: organizationID
          }, [])
        })
    })

    ctrls.payRollID.on('change', (field, newValue, oldValue) => {
      if (!newValue) ctrls.datePay.setValue()

      if (me.isStart) {
        me.isStart = false
        if (!me.isNewInstance) return
      }

      UB.Repository('hr_RollRequis')
        .attrs([ 'ID', 'payRollID.orderDate' ])
        .where('payRollID', '=', newValue)
        .selectSingle()
        .then(res => {
          res && res['payRollID.orderDate'] ? ctrls.datePay.setValue(res['payRollID.orderDate']) : ctrls.datePay.setValue()
        })
    })
  },
  layout: { type: 'hbox' },
  items: [
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [

        { xtype: 'label',
          text: UB.i18n('Відомість на виплату коштів за рахунок СС'),
          cls: 'x-form-item-label',
          margin: '10 0 0 15'
        },
        {
          xtype: 'ubcombobox',
          name: 'payRollID',
          formParams: true,
          displayField: 'description',
          ubRequest: {
            entity: 'hr_payRoll',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description'],
            whereList: {
              byPayElID: {
                expression: '[payElID.methodID.code]',
                condition: 'equal',
                values: { code: '53' }
              }
            }
          },
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'FCCUCode',
          formParams: true,
          fieldLabel: UB.i18n('Код робочого органу отримувача, до якого подається оригінал документа'),
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'EDRPOUCode',
          formParams: true,
          fieldLabel: UB.i18n('Код ЄДРПОУ'),
          labelWidth: 300,
          width: 800,
          allowBlank: false
        },
        {
          xtype: 'ubdatefield',
          name: 'datePay',
          formParams: true,
          fieldLabel: UB.i18n('Дата виплати:'),
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'ubdatefield',
          name: 'dateFill',
          formParams: true,
          fieldLabel: UB.i18n('Дата подання:'),
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'C_DOC_CNT',
          formParams: true,
          // fieldLabel: 'Номер однотипного документа в періоді',
          fieldLabel: UB.i18n('Номер документу у межах місяця'),
          labelWidth: 300,
          allowBlank: false
        }
      ]
    },
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [
        {
          xtype: 'ubcombobox',
          name: 'bosID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Керівник'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 205,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'buhID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Головний бухгалтер'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 205,
          allowBlank: false
        }
      ]
    }
  ]
}
