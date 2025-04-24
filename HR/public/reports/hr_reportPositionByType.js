/* global $App AC UB HR _ Ext appAC UBS */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const onDate4Sql = AC.dateService.shiftDate(reportParams.onDate)
    const totalObj = {
      bold: 'font-weight: bold; ',
      id: -2,
      value: UB.i18n('Всього'),
      columnsValues: []
    }

    let result = {
      columnNames: [],
      firstRow: [],
      data: [],
      title: [],
      onDate: onDate4Sql,
      positionCategory: reportParams.positionCategory,
      dictPositionKindID: reportParams.dictPositionKindID,
      dictPositionGroupID: reportParams.dictPositionGroupID,
      dictEmpCategoryID: reportParams.dictEmpCategoryID,
      dictTarifCoeffID: reportParams.dictTarifCoeffID,
      dictWagePayID: reportParams.dictWagePayID,
      width: 750
    }
    // reportParams.includeChildOrgs = reportParams.departmentID ? false : reportParams.includeChildOrgs
    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate4Sql, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs && orgs.length ? orgs.map(itm => itm.mi_data_id) : [reportParams.organizationID]
    result.organizationIDs = childOrgIDs.join(',')
    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    const departments = await HR.orgStructReportUtils.getDepartmentIDs(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    result.departmentIDs = departments.join(',')

    result.organizationName = (orgNames ? HR.nameCase.cap(orgNames.nameGen || orgNames.name || '') : '') +
      (reportParams.includeChildOrgs ? ` (${UB.i18n('з підлеглими')})` : '')
    result.title.push({ text: UB.i18n(`Кількість посад організації {0} в розрізі категорій персоналу на {1} року`,
      result.organizationName, AC.dateService.formatDate(reportParams.onDate)) })

    const departmentName = reportParams.departmentID ? await UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', reportParams.departmentID)
      .where('orgID', 'in', childOrgIDs)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({ __mip_ondate: onDate4Sql })
      .selectScalar() : ''
    if (departmentName) {
      result.title.push({ text: departmentName })
      result.departmentName = departmentName
    }

    if (reportParams.positionTypeName) {
      result.title.push({ text: UB.i18n('Тип посади') + ': ' + reportParams.positionTypeName })
    }

    if (reportParams.positionCategoryName) {
      result.title.push({ text: UB.i18n('Категорія посади') + ': ' + reportParams.positionCategoryName })
    }

    if (reportParams.dictPositionKindName) {
      result.title.push({ text: UB.i18n('Вид посади') + ': ' + reportParams.dictPositionKindName })
    }

    if (reportParams.dictPositionGroupName) {
      result.title.push({ text: UB.i18n('Група посади') + ': ' + reportParams.dictPositionGroupName })
    }

    if (reportParams.dictEmpCategoryName) {
      result.title.push({ text: UB.i18n('Кваліфікаційна категорія') + ': ' + reportParams.dictEmpCategoryName })
    }

    if (reportParams.dictTarifCoeffName) {
      result.title.push({ text: UB.i18n('Тарифний розряд') + ': ' + reportParams.dictTarifCoeffName })
    }

    if (reportParams.dictWagePayName) {
      result.title.push({ text: UB.i18n('Тип посади держслужбовця') + ': ' + reportParams.dictWagePayName })
    }

    let posData = await UB.Repository('hr_position')
      .attrs(['dictStaffCatID', 'dictStaffCatID.code', 'dictStaffCatID.name', 'quantity', 'positionType'])
      .where('state', '=', 'ACTIVE')
      .whereIf(childOrgIDs.length, 'orgID', 'in', childOrgIDs)
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .whereIf(reportParams.positionType, 'positionType', '=', reportParams.positionType)
      .whereIf(reportParams.positionCategory, 'positionCategory', '=', reportParams.positionCategory)
      .whereIf(reportParams.dictPositionKindID, 'dictPositionKindID', '=', reportParams.dictPositionKindID)
      .whereIf(reportParams.dictPositionGroupID, 'dictPositionGroupID', '=', reportParams.dictPositionGroupID)
      .whereIf(reportParams.dictEmpCategoryID, 'dictEmpCategoryID', '=', reportParams.dictEmpCategoryID)
      .whereIf(reportParams.dictTarifCoeffID, 'dictTarifCoeffID', '=', reportParams.dictTarifCoeffID)
      .whereIf(reportParams.dictWagePayID, 'dictWagePayID', '=', reportParams.dictWagePayID)
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject()
    const positionTypes = _.uniq(posData.map(el => el.positionType || ''))
    posData = _.groupBy(posData, 'dictStaffCatID')

    const dictPositionType = positionTypes.length ? await UB.Repository('ubm_enum')
      .attrs(['name', 'code', 'eGroup'])
      .where('eGroup', '=', 'HR_POSITION_TYPE')
      .whereIf(positionTypes.length, 'code', 'in', positionTypes)
      .orderBy('code')
      .selectAsObject() : []
    if (positionTypes.indexOf('') !== -1) {
      dictPositionType.push({
        code: null,
        name: 'Тип посади не визначено'
      })
    }

    const w1 = 200
    const w2 = 160
    result.colSpan = dictPositionType.length + 2
    result.columnNames = [{
      colwidth: w1,
      name: UB.i18n('Категорія персоналу')
    }]
    result.columnNames.push(...dictPositionType.map(elem => {
      return {
        colwidth: w2,
        name: elem.name
      }
    }))
    result.columnNames.push({
      colwidth: w2,
      name: UB.i18n('Разом')
    })
    for (let i = 0; i < result.columnNames.length; i++) {
      result.firstRow.push({
        colwidth: result.columnNames[i].colwidth,
        title: ''
      })
    }
    result.width = w1 + w2 * (dictPositionType.length + 1)

    for (let i = 0; i < dictPositionType.length + 1; i++) {
      totalObj.columnsValues.push({
        name: i < dictPositionType.length ? dictPositionType[i].name : '',
        id: i < dictPositionType.length ? dictPositionType[i].code : '',
        value: 0
      })
    }

    _.forEach(posData, posItems => {
      const obj = {
        bold: '',
        id: posItems[0].dictStaffCatID || -1,
        code: posItems[0].dictStaffCatID ? parseInt(posItems[0]['dictStaffCatID.code']) : 9999999,
        value: posItems[0].dictStaffCatID ? posItems[0]['dictStaffCatID.name'] : UB.i18n('Не визначено'),
        columnsValues: []
      }
      const totalValue = posItems.reduce((res, item) => (res + (item.quantity || 0)), 0)

      posItems = _.groupBy(posItems, 'positionType')

      for (let i = 0; i < dictPositionType.length; i++) {
        const value = (posItems[dictPositionType[i].code] || []).reduce((res, item) => (res + (item.quantity || 0)), 0)
        obj.columnsValues.push({
          name: dictPositionType[i].name,
          id: dictPositionType[i].code,
          value: HR.reportUtils.quantityToString(value, 'decimal2')
        })
        totalObj.columnsValues[i].value += value
      }
      obj.columnsValues.push({
        ename: '',
        id: '',
        value: HR.reportUtils.quantityToString(totalValue, 'decimal2')
      })
      totalObj.columnsValues[dictPositionType.length].value += totalValue
      result.data.push(obj)
    })

    result.data = _.sortBy(result.data, 'code')
    for (let i = 0; i <= dictPositionType.length; i++) {
      totalObj.columnsValues[i].value = HR.reportUtils.quantityToString(totalObj.columnsValues[i].value, 'decimal2')
    }

    result.data.push(totalObj)

    return result
  },
  onParamPanelConfig: function () {
    const me = this
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const orgType = AC.settings.get('hrFuncOrgType', appAC.globalOrganization())

    me.paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 160,
                  width: 670,
                  readOnly: !accMainReportsSubOrg,
                  ubRequest: {
                    entity: 'hr_organization',
                    fieldList: ['mi_data_id', 'description', 'mi_treePath'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        value: 'ACTIVE'
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        value: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
                      }
                    },
                    orderList: { orderBy: { expression: 'description' } },
                    __mip_ondate: appAC.globalApplicationDate()
                  },
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      HR.controlService.onChangeIncludeChildOrgs(form)
                    }
                  }
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg)
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 160,
                  width: 670,
                  displayField: 'description',
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=includeChildDepts]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=includeChildDepts]').setValue()
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildDepts()
              ]
            },
            {
              xtype: 'datefield',
              name: 'onDate',
              labelWidth: 160,
              width: 290,
              allowBlank: false,
              fieldLabel: UB.i18n('Станом на'),
              value: appAC.globalApplicationDate()
            },
            {
              xtype: 'ubcombobox',
              name: 'positionType',
              fieldLabel: UB.i18n('Тип посади'),
              hideEntityItemInContext: true,
              enumGroupFilter: 'HR_POSITION_TYPE',
              valueField: 'code',
              displayField: 'name',
              labelWidth: 160,
              width: 670,
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
                whereList: {
                  eGroup: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    value: 'HR_POSITION_TYPE'
                  }
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'positionCategory',
              fieldLabel: UB.i18n('Категорія посади'),
              hideEntityItemInContext: true,
              enumGroupFilter: 'HR_POSITION_CATEGORY',
              valueField: 'code',
              displayField: 'name',
              labelWidth: 160,
              width: 670,
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['code', 'name', 'eGroup', 'sortOrder'],
                whereList: {
                  eGroup: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    value: 'HR_POSITION_CATEGORY'
                  }
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictPositionKindID',
              fieldLabel: UB.i18n('Вид посади'),
              labelWidth: 160,
              width: 670,
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'hr_dictPositionKind',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictPositionGroupID',
              fieldLabel: UB.i18n('Група посади'),
              labelWidth: 160,
              width: 670,
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'hr_dictPositionGroup',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictEmpCategoryID',
              fieldLabel: UB.i18n('Кваліфікаційна категорія'),
              labelWidth: 160,
              width: 670,
              valueField: 'ID',
              displayField: 'name',
              hidden: !(orgType === '1'),
              ubRequest: {
                entity: 'hr_dictEmpCategory',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictTarifCoeffID',
              fieldLabel: UB.i18n('Тарифний розряд'),
              labelWidth: 160,
              width: 670,
              valueField: 'ID',
              displayField: 'name',
              hidden: !(orgType === '1'),
              ubRequest: {
                entity: 'hr_dictTarifCoeff',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'dictWagePayID',
              fieldLabel: UB.i18n('Тип посади держслужбовця'),
              labelWidth: 160,
              width: 670,
              valueField: 'ID',
              displayField: 'name',
              hidden: !(orgType === '2'),
              ubRequest: {
                entity: 'hr_dictWagePay',
                method: 'select',
                fieldList: ['ID', 'description', 'name'],
                orderList: { orderBy: { expression: 'description' } }
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue() || false,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue()),
          positionType: frm.findField('positionType').getValue(),
          positionTypeName: frm.findField('positionType').getRawValue(),
          positionCategory: frm.findField('positionCategory').getValue(),
          positionCategoryName: frm.findField('positionCategory').getRawValue(),
          dictPositionKindID: frm.findField('dictPositionKindID').getValue(),
          dictPositionKindName: frm.findField('dictPositionKindID').getRawValue(),
          dictPositionGroupID: frm.findField('dictPositionGroupID').getValue(),
          dictPositionGroupName: frm.findField('dictPositionGroupID').getRawValue(),
          dictEmpCategoryID: frm.findField('dictEmpCategoryID').getValue(),
          dictEmpCategoryName: frm.findField('dictEmpCategoryID').getRawValue(),
          dictTarifCoeffID: frm.findField('dictTarifCoeffID').getValue(),
          dictTarifCoeffName: frm.findField('dictTarifCoeffID').getRawValue(),
          dictWagePayID: frm.findField('dictWagePayID').getValue(),
          dictWagePayName: frm.findField('dictWagePayID').getRawValue()
        }
      }
    })
    return me.paramForm
  },
  onReportClick: function (e) {
    e.preventDefault()
    const cellInfo = UBS.UBReport.cellInfo(e)
    const reportParams = {
      organizationName: cellInfo.table.dataset.organizationname || '',
      organizationIDs: cellInfo.table.dataset.organizationids || '',
      departmentIDs: cellInfo.table.dataset.departmentids || '',
      departmentName: cellInfo.table.dataset.departmentname || '',
      onDate: new Date(cellInfo.table.dataset.ondate),
      dictStaffCatID: cellInfo.row.dataset.id ? parseInt(cellInfo.row.dataset.id, 10) : 0,
      dictStaffCatName: cellInfo.row.dataset.name || '',
      positionType: cellInfo.cell.dataset.positiontype,
      positionTypeName: cellInfo.cell.dataset.positiontypename || '',
      positionCategory: cellInfo.table.dataset.positionсategory,
      positionCategoryName: cellInfo.table.dataset.positionсategoryname,
      dictPositionKindID: cellInfo.table.dataset.dictpositionkindid,
      dictPositionKindName: cellInfo.table.dataset.dictpositionkindname || '',
      dictPositionGroupID: cellInfo.table.dataset.dictpositiongroupid,
      dictPositionGroupName: cellInfo.table.dataset.dictpositiongroupname || '',
      dictEmpCategoryID: cellInfo.table.dataset.dictempcategoryid,
      dictEmpCategoryName: cellInfo.table.dataset.dictempcategoryname || '',
      dictTarifCoeffID: cellInfo.table.dataset.dicttarifcoeffid,
      dictTarifCoeffName: cellInfo.table.dataset.dicttarifcoeffname || '',
      dictWagePayID: cellInfo.table.dataset.dictwagepayid,
      dictWagePayName: cellInfo.table.dataset.dictwagepayname || ''
    }
    if (cellInfo.cell.innerText === '0') {
      $App.dialogInfo(UB.i18n('Посади відсутні'))
    } else {
      $App.doCommand({
        cmdType: 'showReport',
        description: 'Перелік посад',
        cmdData: {
          reportCode: 'hr_reportPositionByTypeDD',
          reportType: 'html',
          reportParams: reportParams
        }
      })
    }
  }
}
