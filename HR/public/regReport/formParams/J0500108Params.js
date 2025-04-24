/* global UB _ Ext AC HR $App */

module.exports = {
  name: 'mainParams',
  setDefaultValues: async (me) => {
    const organizationID = me.defaultValues.organizationID
    const dictRepType = me.defaultValues.dictRepType || {}
    const d = new Date()
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')

    const res = await UB.Repository('hr_organization')
      .attrs(['dictSprStiID', 'EDRPOUCode'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .selectSingle()
    ctrls.PERIOD_MONTH.setValue(dictRepType['dictRepTypeID.periodMonth'])
    ctrls.C_DOC_STAN.getStore().load()
    ctrls.C_DOC_STAN.setValue('1')
    // ctrls.C_DOC_CNT.setValue(1)
    ctrls.C_DOC_TYPE.setValue(1)
    ctrls.hkstiOrig.setValueById(res.dictSprStiID)
    ctrls.hkstiCopy.setValueById(res.dictSprStiID)
    ctrls.HFILL.setValue(d)
    ctrls.FORM_TYPE.setValue('HZ')
    ctrls.recordsAmount.setValue(9000)
    ctrls.isIncludeOrg4.setValue(true)
    const data = await HR.reportUtils.getRespPosition(organizationID, d, ['mainChief', 'accChief'])
    if (data.mainChief.employeeNumberID) {
      ctrls.bosID.setValueById(data.mainChief.employeeNumberID)
    }
    if (data.accChief.employeeNumberID) {
      ctrls.buhID.setValueById(data.accChief.employeeNumberID)
    }
    if (!ctrls.hkstiOrig.getValue() || !ctrls.hkstiCopy.getValue() || !ctrls.bosID.getValue() || !ctrls.buhID.getValue()) {
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
          if (!ctrls.hkstiOrig.getValue()) {
            ctrls.hkstiOrig.setValueById(contentData.formParams['hkstiOrig'])
          }
          if (!ctrls.hkstiCopy.getValue()) {
            ctrls.hkstiCopy.setValueById(contentData.formParams['hkstiCopy'])
          }
          if (!ctrls.bosID.getValue()) {
            ctrls.bosID.setValueById(contentData.formParams['bosID'])
          }
          if (!ctrls.buhID.getValue()) {
            ctrls.buhID.setValueById(contentData.formParams['buhID'])
          }
        }
      }
    }
    /* setTimeout(() => {
      me.makeRegReport()
    }, 300) */
  },
  initForm: async me => {
    const organizationID = me.record.get('organizationID') || me.defaultValues.organizationID
    const ctrls = _.keyBy(me.query('[formParams=true]'), 'name')
    ctrls.PERIOD_FROM[ctrls.FORM_TYPE.getValue() === 'HZD' ? 'show' : 'hide']()
    ctrls.PERIOD_TO[ctrls.FORM_TYPE.getValue() === 'HZD' ? 'show' : 'hide']()
    AC.viewUtils.setAttr(me)
    AC.viewUtils.setFilterValue(me.attr.employeeNumberID, { orgID: organizationID })
    me.periodFromID = null
    me.periodToID = null
    me.getComment = (me) => {
      let comment = ''
      if (me.attr.FORM_TYPE.getValue() === 'HZD') {
        comment = `${me.attr.employeeNumberID.getFieldValue('description') || ''}`
        comment = `${comment}${comment.length ? '; ' : ''}${me.attr.FORM_PIDSTAVA.getRawValue() || ''}`
      }
      me.query('[commentAttr=true]').forEach(field => {
        if (field.getValue()) {
          comment = `${comment}${comment.length ? '; ' : ''}${field.getFieldValue(field.displayField)}`
        }
      })
      return comment
    }
    const periodMonth = me.attr.periodID.getFieldValue('dictRepTypeID.periodMonth') || me.record.get('dictRepTypeID.periodMonth')
    if (periodMonth) {
      UB.Repository('hr_dictPeriod').attrs(['ID', 'isCurrent'])
        .where('orgID', '=', organizationID)
        .where('pYear', '=', me.record.get('repYear'))
        .where('dictMonthID.code', '>=', periodMonth - 2)
        .where('dictMonthID.code', '<=', periodMonth)
        .orderBy('dateFrom')
        .selectAsObject()
        .then(perid => {
          AC.viewUtils.setFilterValue(ctrls.PERIOD_FROM, { ID: perid.map(o => o.ID) })
          AC.viewUtils.setFilterValue(ctrls.PERIOD_TO, { ID: perid.map(o => o.ID) })
          if (perid.length) {
            me.periodFromID = (perid.find(o => o.isCurrent) || perid[0]).ID
            me.periodToID = perid[perid.length - 1].ID
          }
        })
    }
    ctrls.FORM_TYPE.on('change', (ctrl, value) => {
      ctrls.PERIOD_FROM[value === 'HZD' ? 'show' : 'hide']()
      ctrls.PERIOD_TO[value === 'HZD' ? 'show' : 'hide']()
      ctrls.employeeNumberID[value === 'HZD' ? 'show' : 'hide']()
      ctrls.FORM_PIDSTAVA.setReadOnly(value !== 'HZD')
      ctrls.C_DOC_TYPE.setValue('1')
      if (value !== 'HZ' && !ctrls.C_DOC_TYPE.getValue()) {
        UB.Repository('ac_regReport').attrs(['ID'])
          .where('dictRepID', '=', me.record.get('dictRepID'))
          .where('dictRepVersionID', '=', me.record.get('dictRepVersionID'))
          .where('organizationID', '=', me.record.get('organizationID'))
          .where('repYear', '=', me.record.get('repYear'))
          .where('dictRepTypeID', '=', me.record.get('dictRepTypeID'))
          .where('ID', '!=', me.instanceID)
          .orderByDesc('mi_createDate')
          .selectSingle()
          .then(reports => {
            let num = 1
            if (reports) {
              $App.connection.getDocument({
                entity: 'ac_regReport',
                attribute: 'reportData',
                id: reports.ID
              }).then(contentData => {
                if (contentData && contentData.formParams && contentData.formParams['C_DOC_TYPE'] &&
                  Number(contentData.formParams['C_DOC_TYPE']) >= num) {
                  num = Number(contentData.formParams['C_DOC_TYPE']) + 1
                  ctrls.C_DOC_TYPE.setValue(num)
                }
              })
            }
          })
      }
      if (value === 'HZD') {
        if (!ctrls.PERIOD_FROM.getValue()) {
          ctrls.PERIOD_FROM.setValueById(me.periodFromID)
        }
        if (!ctrls.PERIOD_TO.getValue()) {
          ctrls.PERIOD_TO.setValueById(me.periodToID)
        }
      }
    })
    ctrls.contractorID.getStore().ubRequest.whereList.exists = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'hr_payObligatoryDep',
        fieldList: [],
        method: 'select',
        whereList: {
          cond: {
            expression: '[contractorID]=[{master}.ID]',
            condition: 'custom'
          },
          orgID: {
            condition: 'equal',
            expression: '[payObligatoryID.organizationID]',
            value: organizationID
          }
        }
      }
    }

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
          AC.viewUtils.setFilterValue(ctrls.buhID, {
            orgID: organizationID,
            ID: empNumIDs
          }, [])
        })
    })
  },
  layout: { type: 'vbox', align: 'stretch' },
  flex: 1,
  autoScroll: true,
  items: [
    {
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
              labelWidth: 200,
              allowBlank: false
            },
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
              name: 'C_DOC_STAN',
              formParams: true,
              fieldLabel: UB.i18n('Стан документа'),
              valueField: 'code',
              displayField: 'name',
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
                whereList: {
                  eGroup: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: { 'eGroup': 'AC_DOC_STAN' }
                  }
                },
                idProperty: 'code',
                autoLoad: true
              },
              labelWidth: 200,
              allowBlank: false
            },
            {
              xtype: 'combobox',
              name: 'FORM_TYPE',
              formParams: true,
              fieldLabel: UB.i18n('Тип форми'),
              valueField: 'code',
              displayField: 'name',
              store: Ext.create('Ext.data.Store', {
                fields: ['code', 'name'],
                data: [
                  { 'code': 'HZ', 'name': UB.i18n('звітній (1)') },
                  { 'code': 'HZN', 'name': UB.i18n('звітний новий (2)') },
                  { 'code': 'HZD', 'name': UB.i18n('довідковий (4)') }
                ]
              }),
              labelWidth: 200,
              allowBlank: false
            },
            {
              xtype: 'checkbox',
              name: 'isIncludeOrg4',
              formParams: true,
              value: false,
              labelWidth: 200,
              fieldLabel: UB.i18n('Відображати у Додатку 4 (ДФ) дані підпорядкованих огранізацій')
            },
            {
              xtype: 'combobox',
              name: 'FORM_PIDSTAVA',
              formParams: true,
              fieldLabel: UB.i18n('Підстава подання'),
              valueField: 'code',
              displayField: 'name',
              readOnly: true,
              store: Ext.create('Ext.data.Store', {
                fields: ['code', 'name'],
                data: [
                  { 'code': '1', 'name': UB.i18n('для призначення пенсії (1)') },
                  { 'code': '2', 'name': UB.i18n('для призначення інших соціальних виплат (2)') }
                ]
              }),
              labelWidth: 200
            },
            {
              xtype: 'empNumComboBox',
              name: 'employeeNumberID',
              displayField: 'description',
              fieldLabel: UB.i18n('Працівник'),
              hidden: true,
              formParams: true,
              addWorkPeriod: true,
              ubRequest: {
                entity: 'hr_employeeNumberSR',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'description', 'orgID', 'dateFrom', 'dateTo']
              },
              labelWidth: 200
            },
            {
              xtype: 'ubcombobox',
              name: 'PERIOD_FROM',
              hidden: true,
              formParams: true,
              fieldLabel: UB.i18n('Початок періоду'),
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'hr_dictPeriod',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'orgID', 'dateFrom', 'dateTo']
              },
              labelWidth: 200
            },
            {
              xtype: 'ubcombobox',
              name: 'PERIOD_TO',
              hidden: true,
              formParams: true,
              fieldLabel: UB.i18n('Кінець періоду'),
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'hr_dictPeriod',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'orgID', 'dateFrom', 'dateTo']
              },
              labelWidth: 200
            }
          ]
        },
        {
          layout: { type: 'vbox', align: 'stretch' },
          flex: 2,
          items: [
            {
              xtype: 'textfield',
              name: 'C_DOC_TYPE',
              formParams: true,
              fieldLabel: UB.i18n('Номер розрахунку'),
              labelWidth: 350,
              allowBlank: false
            },
            {
              xtype: 'ubcombobox',
              name: 'hkstiOrig',
              formParams: true,
              displayField: 'description',
              fieldLabel: UB.i18n('Код ДПІ, до якого подається оригінал документа'),
              ubRequest: {
                entity: 'ac_dictSprSti',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'nameSti', 'hksti', 'description']
              },
              labelWidth: 350,
              allowBlank: false
            },
            {
              xtype: 'ubcombobox',
              name: 'hkstiCopy',
              formParams: true,
              displayField: 'description',
              fieldLabel: UB.i18n('Код ДПІ, до якого подається копія документа'),
              ubRequest: {
                entity: 'ac_dictSprSti',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'nameSti', 'hksti', 'description']
              },
              labelWidth: 350,
              allowBlank: false
            },
            {
              xtype: 'ubcombobox',
              name: 'contractorID',
              formParams: true,
              commentAttr: true,
              displayField: 'description',
              fieldLabel: UB.i18n('Отримувач податку відокремлених підрозділів'),
              ubRequest: {
                entity: 'ac_contractor',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'description'],
                whereList: {}
              },
              labelWidth: 350
            },
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
              name: 'buhID',
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
    },
    {
      xtype: 'fieldset',
      margin: '5 15 5 15',
      title: UB.i18n(`Додаткові параметри`),
      layout: { type: 'hbox' },
      items: [
        {
          layout: { type: 'vbox', align: 'stretch' },
          flex: 1,
          items: [
            {
              xtype: 'textfield',
              name: 'recordsAmount',
              fieldLabel: UB.i18n(`Кількість записів у порції`),
              formParams: true,
              labelWidth: 380,
              maskRe: AC.validators.maskRe('numberValidator'),
              allowBlank: false
            },
            {
              xtype: 'checkbox',
              name: 'isInclude157',
              formParams: true,
              labelWidth: 380,
              fieldLabel: UB.i18n('Вид доходу 157 "Дохід, виплачений самозайнятій особі"')
            },
            {
              xtype: 'checkbox',
              name: 'isCalculatePaidIncome',
              formParams: true,
              labelWidth: 380,
              fieldLabel: UB.i18n('Визначати виплачений дохід у пропорції Виплачено / До виплати')
            },
            {
              xtype: 'checkbox',
              name: 'isCalculatePaidTax',
              formParams: true,
              labelWidth: 380,
              fieldLabel: UB.i18n('Визначати перерахований дохід за сумами обов\'язкових платежів')
            }
          ]
        },
        {
          layout: { type: 'vbox', align: 'stretch' },
          flex: 1,
          items: [
            {
              xtype: 'checkbox',
              name: 'isInclude5',
              formParams: true,
              value: false,
              labelWidth: 380,
              fieldLabel: UB.i18n('У додатку 5 відображати переведення')
            },
            {
              xtype: 'checkbox',
              name: 'isIncludePluralist5',
              formParams: true,
              value: false,
              labelWidth: 380,
              fieldLabel: UB.i18n('У додатку 5 відображати внутрішніх сумісників')
            },
            {
              xtype: 'checkbox',
              name: 'isIncludeProf5',
              formParams: true,
              value: false,
              labelWidth: 380,
              fieldLabel: UB.i18n('У додатку 5 не вважати посаду зміненою без зміні коду класифікатора професій')
            },
            {
              xtype: 'checkbox',
              name: 'isIncludePos5',
              formParams: true,
              value: false,
              labelWidth: 380,
              fieldLabel: UB.i18n('У додатку 5 не відображати переведення при зміні підрозділу без зміни посади')
            },
            {
              xtype: 'checkbox',
              name: 'isIncludeTwoRow5',
              formParams: true,
              value: false,
              labelWidth: 380,
              fieldLabel: UB.i18n('У додатку 5 переведення показувати двома рядками')
            }
          ]
        }
      ]
    }
  ]
}
