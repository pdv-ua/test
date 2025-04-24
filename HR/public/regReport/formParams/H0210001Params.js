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
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    const dateTo = new Date(me.defaultValues.repYear, 12, 31)
    ctrls.staffing.setValue(0)
    me.setLoading(true)
    const organiozations = me.defaultValues.includeSubOrg
      ? await UB.Repository('hr_organization')
        .attrs(['mi_data_id'])
        .where('state', '=', 'ACTIVE')
        .where('mi_treePath', 'like', `%/${organizationID}/%`)
        .where('mi_dateFrom', '<=', dateTo)
        .where('mi_dateTo', '>=', dateTo)
        .groupBy('mi_data_id')
        .misc({ __mip_recordhistory_all: true })
        .selectAsObject()
      : [{ mi_data_id: organizationID }]
    const promises = []
    organiozations.map(o => o.mi_data_id).forEach((orgID) => {
      promises.push(
        $App.connection.run({
          entity: 'hr_report',
          method: 'getListEmpCount',
          params: JSON.stringify({
            orgID: orgID,
            onDate: dateTo
          })
        })
      )
    })
    Promise.all(promises).then(mParamsArray => {
      let resultALL = 0
      mParamsArray.forEach(mParams => {
        if (mParams.resultData) {
          const result = JSON.parse(mParams.resultData)
          resultALL = Math.round((resultALL || 0) + result)
        }
      })
      ctrls.staffing.setValue(resultALL)
      me.setLoading(false)
    }, (err) => {
      me.setLoading(false)
      throw err
    })
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
        },
        {
          xtype: 'numberfield',
          name: 'staffing',
          fieldLabel: UB.i18n(`Штатна чисельність`),
          formParams: true,
          hideTrigger: true,
          // readOnly: true,
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
