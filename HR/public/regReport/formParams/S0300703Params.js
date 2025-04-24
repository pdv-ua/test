/* global UB _ AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const d = new Date()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.PERIOD_YEAR.setValue(me.defaultValues.repYear)
    //ctrls.C_DOC_CNT.setValue(1)
    ctrls.HFILL.setValue(d)

    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.accChief.employeeNumberID) {
      ctrls.respID.setValueById(data.accChief.employeeNumberID)
    }
    if (!ctrls.respID.getValue()) {
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
          if (!ctrls.respID.getValue()) {
            ctrls.respID.setValueById(contentData.formParams['respID'])
          }
        }
      }
    }
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
          AC.viewUtils.setFilterValue(ctrls.respID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
        })
    })

    ctrls.typePay1.on('change', (field, newValue) => {
      if (newValue) ctrls.typePay2.setValue()
    })
    ctrls.typePay2.on('change', (field, newValue) => {
      if (newValue) ctrls.typePay1.setValue()
    })

    ctrls.typeActivity1.on('change', (field, newValue) => {
      if (newValue) ctrls.typeActivity2.setValue()
      if (newValue) ctrls.typeActivity3.setValue()
    })
    ctrls.typeActivity2.on('change', (field, newValue) => {
      if (newValue) ctrls.typeActivity1.setValue()
      if (newValue) ctrls.typeActivity3.setValue()
    })
    ctrls.typeActivity3.on('change', (field, newValue) => {
      if (newValue) ctrls.typeActivity1.setValue()
      if (newValue) ctrls.typeActivity2.setValue()
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
          name: 'PERIOD_YEAR',
          fieldLabel: UB.i18n(`Звітний рік`),
          formParams: true,
          //readOnly: true,
          labelWidth: 300,
          allowBlank: false
        },
        {
          xtype: 'checkbox',
          name: 'chkContract',
          formParams: true,
          value: true,
          labelWidth: 320,
          fieldLabel: UB.i18n('Чи діяв на підприємстві колективний договір (рядок 710)'),
        },
        {
          layout: { type: 'hbox', align: 'stretch' },
          flex: 1,
          items: [
            {
              layout: { type: 'vbox', align: 'stretch' },
              flex: 1,
              items: [
                {
                  xtype: 'label',
                  text: UB.i18n('Форма оплати, яка використовувалась для понад 50% працівників (рядок 720)'),
                  cls: 'x-form-item-label',
                  margin: '10 0 0 15'
                }
              ]
            },
            {
              layout: { type: 'vbox', align: 'stretch' },
              flex: 1,
              items: [
                {
                  xtype: 'checkbox',
                  name: 'typePay1',
                  formParams: true,
                  value: false,
                  labelWidth: 100,
                  fieldLabel: UB.i18n('почасова')
                },
                {
                  xtype: 'checkbox',
                  name: 'typePay2',
                  formParams: true,
                  value: false,
                  labelWidth: 100,
                  fieldLabel: UB.i18n('відрядна')
                }
              ]
            }
          ]
        },
        {
          xtype: 'checkbox',
          name: 'chkTarif',
          formParams: true,
          value: false,
          labelWidth: 320,
          fieldLabel: UB.i18n('Чи застосовувалась для організації оплати праці на підприємстві тарифна сітка (схема посадових окладів)? (рядок 730)'),
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
          labelWidth: 200,
          allowBlank: false
        },
        {
          xtype: 'ubcombobox',
          name: 'respID',
          formParams: true,
          displayField: 'description',
          fieldLabel: UB.i18n('Відповідальна особа'),
          ubRequest: {
            entity: 'hr_employeeNumberS',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: ['ID', 'description']
          },
          labelWidth: 200,
          allowBlank: false
        },
        {
          layout: { type: 'hbox', align: 'stretch' },
          // flex: 1,
          items: [
            {
              layout: { type: 'vbox', align: 'stretch' },
              //flex: 1,
              items: [
                {
                  xtype: 'label',
                  text: UB.i18n('Якщо звіт надається також за інших юридичних осіб, виберіть вид їхньої діяльності (рядок 735)'),
                  cls: 'x-form-item-label',
                  margin: '10 0 0 15',
                  labelWidth: 280,
                  width: 280
                }
              ]
            },
            {
              layout: { type: 'vbox', align: 'stretch' },
              flex: 1,
              items: [
                {
                  xtype: 'checkbox',
                  name: 'typeActivity1',
                  formParams: true,
                  value: false,
                  labelWidth: 200,
                  fieldLabel: UB.i18n('освіта')
                },
                {
                  xtype: 'checkbox',
                  name: 'typeActivity2',
                  formParams: true,
                  value: false,
                  labelWidth: 200,
                  fieldLabel: UB.i18n('охорона здоров’я та надання соціальної допомоги')
                },
                {
                  xtype: 'checkbox',
                  name: 'typeActivity3',
                  formParams: true,
                  value: false,
                  labelWidth: 200,
                  fieldLabel: UB.i18n('діяльність у сфері творчості, мистецтва та розваг')
                }
              ]
            },
          ]
        }
      ]
    }
  ]
}
