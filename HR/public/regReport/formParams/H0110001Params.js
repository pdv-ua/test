/* global UB $App _ HR AC */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const d = AC.dateService.truncTimeToUtcNull(new Date())
    const { organizationID } = me.defaultValues
    const parameterControls = _.keyBy(me.query('[formParams=true]'), 'name')
    parameterControls.HFILL.setValue(d)
    if (me.defaultValues && me.defaultValues.repYear) {
      parameterControls.yearOfCurrentPeriod.setValue(me.defaultValues.repYear)
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
