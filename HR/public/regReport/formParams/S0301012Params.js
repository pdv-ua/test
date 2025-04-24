/* global UB _ AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const dictRepType = me.defaultValues.dictRepType || {}
    const d = new Date()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.PERIOD_MONTH.setValue(dictRepType['dictRepTypeID.periodMonth'])
    ctrls.C_DOC_CNT.setValue(1)
    ctrls.HFILL.setValue(d)

    const res = await UB.Repository('hr_organization')
      .attrs(['hkoatuu'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .orderBy('mi_dateFrom', 'desc')
      .selectSingle()
    if (res && res.hkoatuu) {
      ctrls.C_REG.setValue(res.hkoatuu.slice(0, 2))
      ctrls.C_RAJ.setValue(res.hkoatuu.slice(2, 5))
    }
    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.mainChief.employeeNumberID) {
      ctrls.bosID.setValueById(data.mainChief.employeeNumberID)
    }
    if (!ctrls.C_REG.getValue() || !ctrls.C_RAJ.getValue() || !ctrls.bosID.getValue()) {
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
          if (!ctrls.C_REG.getValue()) {
            ctrls.C_REG.setValue(contentData.formParams['C_REG'])
          }
          if (!ctrls.C_RAJ.getValue()) {
            ctrls.C_RAJ.setValue(contentData.formParams['C_RAJ'])
          }
          if (!ctrls.bosID.getValue()) {
            ctrls.bosID.setValueById(contentData.formParams['bosID'])
          }
        }
      }
    }
    /* setTimeout(() => {
      me.makeRegReport()
    }, 300) */
  },
  initForm: me => {
    const organizationID = me.record.get('organizationID') || me.defaultValues.organizationID
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.HFILL.on('change', (field, newValue, oldValue) => {
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
        })
    })
  },
  layout: { type: 'hbox' },
  items: [
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [
        {
          xtype: 'textfield',
          name: 'PERIOD_MONTH',
          fieldLabel: UB.i18n(`Звітний місяць`),
          formParams: true,
          readOnly: true,
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'C_DOC_CNT',
          formParams: true,
          fieldLabel: UB.i18n('Номер однотипного документа в періоді'),
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'C_REG',
          fieldLabel: UB.i18n(`Код області`),
          formParams: true,
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'textfield',
          name: 'C_RAJ',
          fieldLabel: UB.i18n(`Код району`),
          formParams: true,
          labelWidth: 300,
          allowBlank: false
        }
      ]
    },
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 2,
      items: [
        {
          xtype: 'ubdatefield',
          name: 'HFILL',
          formParams: true,
          fieldLabel: UB.i18n('Дата подання:'),
          labelWidth: 350,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'bosID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Відповідальна особа'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 350,
          allowBlank: false
        }
      ]
    }
  ]
}
