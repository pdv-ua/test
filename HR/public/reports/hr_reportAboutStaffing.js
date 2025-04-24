/* global $App AC UB HR _ Ext appAC UBS */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams, me.reportType).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams, reportType) {
    const onDate4Sql = AC.dateService.shiftDate(reportParams.onDate)
    const totalObj = {
      bold: 'font-weight: bold; ',
      id: -2,
      name: UB.i18n('ВСЬОГО'),
      quantity: 0,
      personCount: 0,
      personCountAbsc: 0,
      mtCount: 0,
      percentPerson: 0,
      percentMtCount: 0
    }
    let result = {
      data: [],
      posName: '',
      empName: '',
      ondate: onDate4Sql,
      onDate: AC.dateService.formatDate(reportParams.onDate),
      workPlaceID: reportParams.workPlace || ''
    }
    reportParams.includeChildOrgs = reportParams.departmentID ? false : reportParams.includeChildOrgs

    if (reportParams.respEmp) {
      const respPosInfo = await HR.orgStructReportUtils.getSingerInfo(reportParams.respEmp, reportParams.respPositionID, onDate4Sql)
      result.posName = (respPosInfo && respPosInfo.positionName) || ''
      result.empName = (respPosInfo && respPosInfo.employeeName) || ''
    }

    const orgs = await HR.orgStructReportUtils.getOrganizationData(onDate4Sql, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id)
    result.organizationIDs = childOrgIDs.join(',')

    const orgNames = _.find(orgs, { 'mi_data_id': reportParams.organizationID })
    result.organizationName = orgNames ? HR.nameCase.cap(orgNames.name || '') + (reportParams.includeChildOrgs ? ' (з підлеглими)' : '') : ''
    const departments = await HR.orgStructReportUtils.getDepartmentIDs(onDate4Sql, childOrgIDs, reportParams.departmentID, reportParams.includeChildDepts)
    const workPlace = reportParams.workPlace ? reportParams.workPlace.split(',').map(o => o.replace(/["']/g, "")) : ''
    result.departmentIDs = departments.join(',')

    result.departmentName = reportParams.departmentID ? await UB.Repository('hr_department')
      .attrs(['name'])
      .where('mi_data_id', '=', reportParams.departmentID)
      .where('orgID', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .where('mi_deleteDate', '>=', '#maxdate')
      .misc({ __mip_ondate: onDate4Sql })
      .selectScalar() : ''

    result.workPlaceName = workPlace && workPlace.length ? reportParams.workPlace.split(',').map(o => o.replace(/["']/g, "")).map(o => {
      return UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').getById(o).get('name')
    }).join(', ') || '' : ''
    result.workPlace = result.workPlaceName ? UB.i18n(`Місце роботи: {0}`, result.workPlaceName) : ''

    let posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'dictStaffCatID', 'dictStaffCatID.code', 'dictStaffCatID.name', 'quantity', 'orgID'])
      .where('state', '=', 'ACTIVE')
      .whereIf(childOrgIDs.length, 'orgID', 'in', childOrgIDs)
      .whereIf(departments.length, 'parentUnitID', 'in', departments)
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject()
    posData = _.groupBy(posData, 'dictStaffCatID')

    let empData = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'employeeNumberID', 'mtCount', 'positionID.dictStaffCatID', 'positionID.dictStaffCatID.code',
        'positionID.dictStaffCatID.name', 'positionID.quantity', 'workPlace'])
      .where('isActive', '=', true)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('dateFrom', '<=', onDate4Sql)
      .where('dateTo', '>=', onDate4Sql)
      .whereIf(childOrgIDs.length, 'organizationID', 'in', childOrgIDs)
      .whereIf(departments.length, 'departmentID', 'in', departments)
      .whereIf(workPlace.length, 'workPlace', 'in', workPlace)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_dateFrom', '<=', onDate4Sql)
      .where('positionID.mi_dateTo', '>=', onDate4Sql)
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    const employeeIDs = empData.length > 1024 ? [] : _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
    let empLongTermAbsc = await UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID'])
      .where('organizationID', 'in', childOrgIDs)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeNumberID', 'in', employeeIDs)
      .whereIf(!employeeIDs || employeeIDs.length === 0, 'employeeNumberID', '=', 0)
      .where('dateFrom', '<=', onDate4Sql)
      .where('dateTo', '>=', onDate4Sql)
      .selectAsObject()
    empLongTermAbsc = empLongTermAbsc.map(e => e.employeeNumberID)

    _.forEach(posData, posItems => {
      const positions = posItems.map(p => p.mi_data_id)
      const obj = {
        showA: reportType !== 'xlsx',
        bold: '',
        id: posItems[0].dictStaffCatID || -1,
        code: posItems[0].dictStaffCatID ? parseInt(posItems[0]['dictStaffCatID.code']) : 9999999,
        name: posItems[0].dictStaffCatID ? posItems[0]['dictStaffCatID.name'] : UB.i18n('Не визначено'),
        quantity: posItems.reduce((res, item) => (res + (item.quantity || 0)), 0),
        personCount: empData.filter(e => ['1', '3'].includes(e.workPlace) && positions.indexOf(e.positionID) !== -1).length,
        personCountAbsc: empData.filter(e => ['1', '3'].includes(e.workPlace) && positions.indexOf(e.positionID) !== -1 && empLongTermAbsc.indexOf(e.employeeNumberID) !== -1).length,
        mtCount: empData.filter(e => positions.indexOf(e.positionID) !== -1 && empLongTermAbsc.indexOf(e.employeeNumberID) === -1).reduce((res, item) => (res + (item.mtCount || 0)), 0),
        percentPerson: 0,
        percentMtCount: 0
      }
      if (obj.quantity) {
        obj.percentPerson = AC.currencyService.round((obj.personCount * 100) / obj.quantity, 2)
        obj.percentMtCount = AC.currencyService.round((obj.mtCount * 100) / obj.quantity, 2)
      }
      obj.roundToQuantity1 = HR.reportUtils.getQuantityFractional(obj.quantity)
      obj.roundToQuantity2 = HR.reportUtils.getQuantityFractional(obj.mtCount)
      obj.roundToQuantity3 = HR.reportUtils.getQuantityFractional(obj.percentPerson)
      obj.roundToQuantity4 = HR.reportUtils.getQuantityFractional(obj.percentMtCount)

      totalObj.quantity += obj.quantity
      totalObj.personCount += obj.personCount
      totalObj.personCountAbsc += obj.personCountAbsc
      totalObj.mtCount += obj.mtCount
      result.data.push(obj)
    })

    result.data = _.sortBy(result.data, 'code')
    if (totalObj.quantity) {
      totalObj.percentPerson = AC.currencyService.round((totalObj.personCount * 100) / totalObj.quantity, 2)
      totalObj.percentMtCount = AC.currencyService.round((totalObj.mtCount * 100) / totalObj.quantity, 2)
    }
    totalObj.roundToQuantity1 = HR.reportUtils.getQuantityFractional(totalObj.quantity)
    totalObj.roundToQuantity2 = HR.reportUtils.getQuantityFractional(totalObj.mtCount)
    totalObj.roundToQuantity3 = HR.reportUtils.getQuantityFractional(totalObj.percentPerson)
    totalObj.roundToQuantity4 = HR.reportUtils.getQuantityFractional(totalObj.percentMtCount)

    result.data.push(totalObj)

    return result
  },
  onParamPanelConfig: function () {
    const me = this
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')

    function filterRespEmpSignatoryCombos (form, posID, ctrlName) {
      const respEmpIDCtrl = form.down(`[name=${ctrlName}]`)
      let store = respEmpIDCtrl.getStore ? respEmpIDCtrl.getStore() : respEmpIDCtrl.store
      store.ubRequest.positionID = posID
      store.ubRequest.onDate = appAC.globalApplicationDate()
      store.ubRequest.method = 'getTempExecution'

      store.load().then(() => {
        respEmpIDCtrl.clearIsPhantom()
      })
    }

    function onChangeIncludeChildOrgs (form) {
      const orgID = form.down('[name=organizationID]').getValue()
      const departmentID = form.down('[name=departmentID]')
      const positionID = form.down('[name=respPositionID]')
      const respEmp = form.down('[name=respEmp]')
      respEmp.clearValue()
      const includeChildOrgs = form.down('[name=includeChildOrgs]').getValue()
      const whereList = [
        ['state', '=', 'ACTIVE'],
        ['orgID.state', '=', 'ACTIVE'],
        ['orgID.mi_dateFrom', '<=', appAC.globalApplicationDate()],
        ['orgID.mi_dateTo', '>=', appAC.globalApplicationDate()]
      ]
      whereList.push(includeChildOrgs
        ? ['orgID.mi_treePath', 'like', `/${orgID || 0}/`]
        : ['orgID', '=', orgID || 0])
      AC.viewUtils.setWhereListProperty(departmentID, whereList, null, ['clearWhereList', 'clearValue', 'clearStore'])
      departmentID.setReadOnly(!orgID)
      AC.viewUtils.setWhereListProperty(positionID, whereList, null, ['clearWhereList', 'clearValue', 'clearStore'])
      positionID.setReadOnly(!orgID)
    }

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
                        values: {
                          state: 'ACTIVE'
                        }
                      },
                      path: {
                        expression: accMainReportsSubOrg ? '[mi_treePath]' : '[mi_data_id]',
                        condition: accMainReportsSubOrg ? 'like' : '=',
                        values: {
                          state: accMainReportsSubOrg ? `/${appAC.globalOrganization()}/` : appAC.globalOrganization()
                        }
                      }
                    },
                    orderList: { orderBy: { expression: 'description' } },
                    __mip_ondate: appAC.globalApplicationDate()
                  },
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      onChangeIncludeChildOrgs(form)
                    }
                  }
                }),
                {
                  xtype: 'checkboxfield',
                  name: 'includeChildOrgs',
                  boxLabel: UB.i18n('з підлеглими'),
                  labelWidth: 110,
                  width: 140,
                  checked: false,
                  readOnly: !accMainReportsSubOrg,
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('[name=paramPanel]') || ctrl.up('form')
                      if (form) {
                        onChangeIncludeChildOrgs(form)
                      }
                    }
                  }
                }
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
              xtype: 'ubboxselect',
              name: 'workPlace',
              fieldLabel: UB.i18n('Місце роботи'),
              hideEntityItemInContext: true,
              enumGroupFilter: 'HR_WORKER_PLACE',
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
                    values: { 'eGroup': 'HR_WORKER_PLACE' }
                  }
                }
              }
            },
            {
              xtype: 'datefield',
              name: 'onDate',
              labelWidth: 160,
              width: 270,
              allowBlank: false,
              fieldLabel: UB.i18n('Станом на'),
              value: appAC.globalApplicationDate()
            },
            {
              layout: { type: 'vbox', align: 'stretch' },
              items: [
                {
                  xtype: 'ubcombobox',
                  name: 'respPositionID',
                  fieldLabel: UB.i18n('Підписант (посада)'),
                  valueField: 'mi_data_id',
                  displayField: 'description',
                  hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
                  gridFieldList: ['description'],
                  labelWidth: 160,
                  width: 670,
                  allowBlank: true,
                  disableContextMenu: true,
                  disableModifyEntity: true,
                  ubRequest: {
                    entity: 'hr_position',
                    fieldList: ['mi_data_id', 'description', 'nameGen'],
                    whereList: {
                      state: {
                        expression: '[state]',
                        condition: '=',
                        value: 'ACTIVE'
                      },
                      orgID: {
                        expression: '[orgID]',
                        condition: '=',
                        values: { value: appAC.globalOrganization() }
                      }
                    },
                    __mip_ondate: appAC.globalApplicationDate(),
                    orderList: { orderBy: { expression: 'description' } }
                  },
                  listeners: {
                    change: function (ctrl) {
                      const form = ctrl.up('form')
                      const posID = ctrl.getValue() || 0
                      filterRespEmpSignatoryCombos(form, posID, 'respEmp')
                    }
                  }
                },
                {
                  xtype: 'ubcombobox',
                  name: 'respEmp',
                  fieldLabel: UB.i18n('Підписав'),
                  displayField: 'description',
                  hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
                  gridFieldList: ['description'],
                  labelWidth: 160,
                  width: 670,
                  allowBlank: true,
                  disableContextMenu: true,
                  disableModifyEntity: true,
                  fieldList: ['ID', 'description', 'positionID', 'employeeID', 'employeeNumberID'],
                  valueField: 'ID',
                  ubRequest: {
                    entity: 'hr_employeePositionS',
                    method: 'getTempExecution',
                    fieldList: ['ID', 'description', 'positionID', 'employeeID', 'employeeNumberID'],
                    gridFieldList: ['description'],
                    orderList: { orderBy: { expression: 'description' } }
                  },
                  listeners: {
                    render: function (ctrl) {
                      const store = ctrl.store
                      function setFirstVal () {
                        const storeItems = ctrl.store.data.items
                        const form = ctrl.up('form')
                        const respPositionIDCtrl = form.down('[name=respPositionID]')
                        const posID = respPositionIDCtrl.getValue() || 0
                        const selItem = _.find(storeItems, { data: { positionID: posID } })
                        if (selItem && storeItems.length === 1) {
                          ctrl.setValue(selItem.data.ID)
                        } else {
                          ctrl.clearValue()
                        }
                      }
                      store.on('load', setFirstVal)
                      store.load()
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          workPlace: frm.findField('workPlace').getValue(),
          organizationID: frm.findField('organizationID').getValue(),
          departmentID: frm.findField('departmentID').getValue(),
          includeChildOrgs: frm.findField('includeChildOrgs').getValue() || false,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue()),
          respPositionID: frm.findField('respPositionID').getValue(),
          respEmp: frm.findField('respEmp').getValue()
        }
      }
    })
    return me.paramForm
  },
  onReportClick: function (e) {
    const whereList = {}
    function addWhereCondition (clauseName, expression, condition, value) {
      whereList[clauseName] = value
        ? {
          expression: expression,
          condition: condition,
          values: { 'v1': value }
        }
        : {
          expression: expression,
          condition: condition
        }
    }

    e.preventDefault()
    const cellInfo = UBS.UBReport.cellInfo(e)

    const organizationIDs = cellInfo.table.dataset.organizationids
    const departmentIDs = cellInfo.table.dataset.departmentids
    const onDate = new Date(cellInfo.table.dataset.ondate)
    const category = cellInfo.row.dataset.categoryid ? parseInt(cellInfo.row.dataset.categoryid, 10) : 0
    const categoryName = cellInfo.row.dataset.categoryname || ''
    const workPlace = cellInfo.table.dataset.workplace ? cellInfo.table.dataset.workplace.split(',').map(o => o.replace(/["']/g, "")) : ''
    const workPlaceName = cellInfo.table.dataset.workplacename ? cellInfo.table.dataset.workplacename.split(',').map(o => o.replace(/["']/g, "")).join(', ') : ''

    if (cellInfo.colIndex === 1) {
      addWhereCondition('organizationID', '[orgID]', 'in', organizationIDs.split(','))
      addWhereCondition('dateFrom', '[mi_dateFrom]', '<=', onDate)
      addWhereCondition('dateTo', '[mi_dateTo]', '>=', onDate)
      addWhereCondition('isActive', '[state]', '=', 'ACTIVE')
    } else {
      addWhereCondition('organizationID', '[organizationID]', 'in', organizationIDs.split(','))
      addWhereCondition('dateFrom', '[dateFrom]', '<=', onDate)
      addWhereCondition('dateTo', '[dateTo]', '>=', onDate)
      addWhereCondition('isActive', '[isActive]', '=', 1)
      addWhereCondition('pstate', '[positionID.state]', '=', 'ACTIVE')
      addWhereCondition('pdateFrom', '[positionID.mi_dateFrom]', '<=', onDate)
      addWhereCondition('pdateTo', '[positionID.mi_dateTo]', '>=', onDate)
      addWhereCondition('pdeleteDate', '[positionID.mi_deleteDate]', '>=', '#maxdate')
    }

    if (departmentIDs && departmentIDs.length) {
      addWhereCondition('departmentID', '[departmentID]', 'in', departmentIDs.split(','))
    }

    if (category && category > -1) {
      addWhereCondition('category', cellInfo.colIndex === 1 ? '[dictStaffCatID]' : '[positionID.dictStaffCatID]', '=', category)
    }

    if (category && category === -1) {
      addWhereCondition('category', cellInfo.colIndex === 1 ? '[dictStaffCatID]' : '[positionID.dictStaffCatID]', 'isNull', null)
    }

    if ((cellInfo.colIndex !== 1) && workPlace && workPlace.length) {
      addWhereCondition('workPlace', '[workPlace]', 'in', workPlace)
    }

    if (cellInfo.colIndex === 3) {
      whereList['abs'] = {
        expression: '',
        condition: 'subquery',
        subQueryType: 'Exists',
        value: {
          entity: 'hr_empLongTermAbsc',
          fieldList: [],
          method: 'select',
          whereList: {
            cond: {
              expression: '[employeeNumberID]=[{master}.employeeNumberID]',
              condition: 'custom'
            },
            orgID: {
              condition: 'in',
              expression: '[organizationID]',
              value: organizationIDs.split(',')
            },
            dateFrom: {
              condition: '<=',
              expression: '[dateFrom]',
              value: onDate
            },
            dateTo: {
              condition: '>=',
              expression: '[dateTo]',
              value: onDate
            }
          }
        }
      }
    }
    if (cellInfo.colIndex === 4) {
      whereList['abs'] = {
        expression: '',
        condition: 'subquery',
        subQueryType: 'notExists',
        value: {
          entity: 'hr_empLongTermAbsc',
          fieldList: [],
          method: 'select',
          whereList: {
            cond: {
              expression: '[employeeNumberID]=[{master}.employeeNumberID]',
              condition: 'custom'
            },
            orgID: {
              condition: 'in',
              expression: '[organizationID]',
              value: organizationIDs.split(',')
            },
            dateFrom: {
              condition: '<=',
              expression: '[dateFrom]',
              value: onDate
            },
            dateTo: {
              condition: '>=',
              expression: '[dateTo]',
              value: onDate
            }
          }
        }
      }
    }
    const fieldList = cellInfo.colIndex === 1
      ? [
        { name: 'ID', visibility: false },
        { name: 'name', description: UB.i18n('Назва посади') },
        {
          name: 'quantity',
          description: UB.i18n('Кількість посад'),
          config: { width: 140, align: 'center' },
          format: '0.00'
        },
        { name: 'departmentName', description: UB.i18n('Підрозділ') },
        { name: 'selfStructDepName', description: UB.i18n('Структурний підрозділ') },
        { name: 'orgName', description: UB.i18n('Організація') }
      ]
      : [
        { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { width: 100 } },
        { name: 'description', description: UB.i18n('ПІБ, посада, підрозділ') },
        {
          name: 'mtCount',
          description: UB.i18n('Кількість ставок'),
          visibility: cellInfo.colIndex === 4,
          config: { width: 140, align: 'center' },
          format: '0.00'
        },
        { name: 'depName', description: UB.i18n('Підрозділ'), visibility: cellInfo.colIndex !== 4 },
        { name: 'selfStructDepName', description: UB.i18n('Структурний підрозділ'), visibility: cellInfo.colIndex !== 4 },
        { name: 'orgName', description: UB.i18n('Організація'), visibility: cellInfo.colIndex !== 4 },
        { name: 'employeeNumberID', visibility: false },
        { name: 'employeeID', visibility: false }
      ]

    const title = cellInfo.colIndex === 1
      ? UB.i18n(`Перелік посад{0}`, categoryName && category && category !== -2 ? ', ' + categoryName : '')
      : UB.i18n(`Перелік працівників{0}{1}`, categoryName && category && category !== -2 ? ', ' + categoryName : '', workPlaceName ? ', ' + workPlaceName : '')
    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      description: title,
      cmpInitConfig: {
        dfm: {
          size: {
            width: 900,
            height: 500
          }
        },
        onItemDblClick: function (grid, record) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: cellInfo.colIndex === 1 ? 'hr_position' : 'hr_employee',
            entity: cellInfo.colIndex === 1 ? 'hr_position' : 'hr_employee',
            instanceID: cellInfo.colIndex === 1 ? record.get('ID') : record.get('employeeID'),
            cmpInitConfig: {
              employeeNumberID: cellInfo.colIndex === 1 ? record.get('ID') : record.get('employeeNumberID')
            }
          })
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: cellInfo.colIndex === 1 ? 'hr_position' : 'hr_employeePositionS',
          method: 'select',
          fieldList: fieldList,
          whereList: whereList,
          orderList: {
            description: {
              expression: '[description]',
              order: 'asc'
            }
          }
        }]
      }
    })
  }

}
