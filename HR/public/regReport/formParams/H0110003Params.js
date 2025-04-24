/* global UB $App _ HR AC appHR */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const d = AC.dateService.truncTimeToUtcNull(new Date())
    const { organizationID } = me.defaultValues
    const parameterControls = _.keyBy(me.query('[formParams=true]'), 'name')
    parameterControls.HFILL.setValue(d)
    if (me.defaultValues && me.defaultValues.repYear) {
      parameterControls.yearOfCurrentPeriod.setValue((parameterControls.yearOfCurrentPeriod.maxValue && parameterControls.yearOfCurrentPeriod.maxValue < me.defaultValues.repYear) ? parameterControls.yearOfCurrentPeriod.maxValue : me.defaultValues.repYear)
      me.getField('repYear').setValue(parameterControls.yearOfCurrentPeriod.getValue())
    }
    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief'])
    if (data.mainChief.employeeNumberID) {
      parameterControls.bosID.setValueById(data.mainChief.employeeNumberID)
    }
    if (!parameterControls.bosID.getValue()) {
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
          if (!parameterControls.bosID.getValue()) {
            parameterControls.bosID.setValueById(contentData.formParams['bosID'])
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
    appHR.getCurrentPeriod(me.record.get('organizationID') || me.defaultValues.organizationID).then(response => {
      ctrls.yearOfCurrentPeriod.setMaxValue(response.dateFrom.getFullYear())
      me.getField('repYear').setMaxValue(response.dateFrom.getFullYear())
      if (ctrls.yearOfCurrentPeriod.getValue() && response.dateFrom.getFullYear() < ctrls.yearOfCurrentPeriod.getValue()) {
        ctrls.yearOfCurrentPeriod.setValue(response.dateFrom.getFullYear())
        me.getField('repYear').setValue(response.dateFrom.getFullYear())
      }
    })
    me.getField('repYear').setReadOnly(true)
    ctrls.yearOfCurrentPeriod.on('change', (field, value) => {
      me.getField('repYear').setValue(value)
    })
    ctrls.HFILL.on('change', (field, newValue) => {
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
      width: 300,
      items: [
        {
          xtype: 'numberfield',
          name: 'yearOfCurrentPeriod',
          fieldLabel: UB.i18n(`Звітній рік`),
          formParams: true,
          hideTrigger: true,
          // readOnly: true,
          labelWidth: 150,
          allowBlank: false
        },
        {
          xtype: 'ubdatefield',
          name: 'HFILL',
          formParams: true,
          fieldLabel: UB.i18n('Дата подання:'),
          labelWidth: 150,
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
          fieldLabel: UB.i18n('Відповідальна особа'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 150,
          allowBlank: false
        }
      ]
    }
  ]
}
