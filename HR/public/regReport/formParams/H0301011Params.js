/* global UB _ AC HR appAC appHR appHR */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async function (me) {
    const d = new Date()
    const { organizationID, periodID, repYear } = me.defaultValues
    const parameterControls = _.keyBy(me.query('[formParams=true]'), 'name')
    const response = await UB.Repository('ac_dictRepPeriod')
      .attrs(['dictRepTypeID.periodMonth'])
      .selectById(periodID, { 'dictRepTypeID.periodMonth': 'periodMonth' })
    const dateFrom = AC.dateService.shiftDate(new Date(repYear, response.periodMonth - 1, 1))
    let accPeriod = await appHR.getPeriodOnDate(organizationID, dateFrom)
    if (!accPeriod.ID) {
      accPeriod = await appHR.getCurrentPeriod(organizationID)
    }
    me.down('[name=periodStartID]').setValueById(accPeriod.ID)
    me.down('[name=periodEndID]').setValueById(accPeriod.ID)
    parameterControls.monthOfCurrentPeriod.setValue(response.periodMonth)
    parameterControls.yearOfCurrentPeriod.setValue(repYear)
    parameterControls.dateStateOn.setValue(d)
    HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief']).then(data => {
      if (data.mainChief.employeeNumberID) {
        parameterControls.bosID.setValueById(data.mainChief.employeeNumberID)
      }
      if (data.accChief.employeeNumberID) {
        parameterControls.respID.setValueById(data.accChief.employeeNumberID)
      }
    })
  },
  initForm: me => {
    const organizationID = me.record.get('organizationID') || me.defaultValues.organizationID
    const parameterControls = _.keyBy(me.query('[formParams=true]'), 'name')
    parameterControls.dateStateOn.on('change', (field, newValue, oldValue) => {
      UB.Repository('hr_employeePositionS')
        .where('[organizationID]', '=', organizationID)
        .where('[dateFrom]', '<=', newValue)
        .where('[dateTo]', '>=', newValue)
        .attrs(['employeeNumberID'])
        .selectAsObject().then(positions => {
          const empNumIDs = positions.map(position => position.employeeNumberID)
          AC.viewUtils.setFilterValue(parameterControls.bosID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
          AC.viewUtils.setFilterValue(parameterControls.respID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
        })
    })
    AC.viewUtils.setFilterValue(me.down('[name=periodStartID]'), {
      orgID: appAC.globalOrganization()
    }, [])
    AC.viewUtils.setFilterValue(me.down('[name=periodEndID]'), {
      orgID: appAC.globalOrganization()
    }, [])
  },
  layout: { type: 'hbox' },
  items: [
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 1,
      items: [
        {
          xtype: 'ubdatefield',
          name: 'dateStateOn',
          formParams: true,
          fieldLabel: UB.i18n('Станом на:'),
          labelWidth: 250,
          allowBlank: false
        },
        {
          name: 'periodStartID',
          xtype: 'ubcombobox',
          fieldLabel: UB.i18n('Початок періоду нарахувань'),
          pageSize: 50,
          width: 420,
          labelWidth: 250,
          formParams: true,
          ubRequest: {
            entity: 'hr_dictPeriod',
            fieldList: ['ID', 'description', 'dateFrom', 'dateTo', 'orgID'],
            orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } }
          },
          listeners: {
            expand: appHR.periodExpand
          }
        },
        {
          name: 'periodEndID',
          xtype: 'ubcombobox',
          fieldLabel: UB.i18n('Кінець періоду нарахувань'),
          pageSize: 50,
          width: 420,
          labelWidth: 250,
          formParams: true,
          ubRequest: {
            entity: 'hr_dictPeriod',
            fieldList: ['ID', 'description', 'dateFrom', 'dateTo', 'orgID'],
            orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } }
          },
          listeners: {
            expand: appHR.periodExpand
          }
        },
        {
          xtype: 'numberfield',
          name: 'monthOfCurrentPeriod',
          fieldLabel: UB.i18n(`Звітній місяць`),
          formParams: true,
          hideTrigger: true,
          labelWidth: 250,
          allowBlank: false
        },
        {
          xtype: 'numberfield',
          name: 'yearOfCurrentPeriod',
          fieldLabel: UB.i18n(`Звітній рік`),
          formParams: true,
          hideTrigger: true,
          labelWidth: 250,
          allowBlank: false
        }
      ]
    },
    {
      layout: { type: 'vbox', align: 'stretch' },
      flex: 2,
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
          labelWidth: 350,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'respID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Головний бухгалтер'),
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
