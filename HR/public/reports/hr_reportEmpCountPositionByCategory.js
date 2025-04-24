/* global Ext $App UB AC HR _ UBS appAC */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = {
      organizationID: reportParams.organizationID,
      onDateStr: AC.dateService.formatDate(reportParams.onDate),
      onDate: reportParams.onDate,
      orgNameGen: '',
      columnNames: [],
      rows: [],
      totals: [],
      width: 750
    }

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(reportParams.orgID)
    result.roundToQuantity = settingsOrg.roundToQuantity

    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', reportParams.organizationID)
      .misc({ __mip_ondate: reportParams.onDate })
      .selectSingle()
    result.orgNameGen = (orgData && (orgData.nameGen || orgData.name)) || ''
    result.orgNameGen += reportParams.includeChildOrgs ? ` (${UB.i18n('з підлеглими')})` : ''

    const orgs = await HR.orgStructReportUtils.getOrganizationData(reportParams.onDate, reportParams.organizationID, reportParams.includeChildOrgs)
    const childOrgIDs = orgs.map(itm => itm.mi_data_id) || [reportParams.organizationID]
    result.organizationIDs = childOrgIDs.join(',')

    const dictWorkPlace = await UB.Repository('ubm_enum')
      .attrs(['name', 'code', 'eGroup'])
      .where('eGroup', '=', 'HR_WORKER_PLACE')
      .orderBy('code')
      .selectAsObject()

    let w1 = 200
    const w2 = Math.round((result.width - w1) / (dictWorkPlace.length + 1))
    w1 = 750 - w2 * (dictWorkPlace.length + 1)
    result.colSpan = dictWorkPlace.length + 2
    result.columnNames = [{
      colwidth: w1,
      name: UB.i18n('Категорія')
    }]
    result.columnNames.push(...dictWorkPlace.map(elem => {
      return {
        colwidth: w2,
        name: elem.name
      }
    }))
    result.columnNames.push({
      colwidth: w2,
      name: UB.i18n('Разом')
    })

    result.totals = [{
      value: UB.i18n('Всього'),
      onlyText: true
    }]
    for (let i = 0; i < dictWorkPlace.length + 1; i++) {
      result.totals.push({
        workplacename: i < dictWorkPlace.length ? dictWorkPlace[i].name : '',
        workplace: i < dictWorkPlace.length ? dictWorkPlace[i].code : '',
        value: 0
      })
    }

    const dictCategory = await UB.Repository('hr_dictStaffCat')
      .attrs(['ID', 'name', 'code'])
      .orderBy('code')
      .selectAsObject() || []
    dictCategory.push({
      ID: 'null',
      name: UB.i18n('Не визначено'),
      code: ''
    })

    let employeePosition = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'dictStaffCatID', 'workPlace', 'mtCount'])
      .where('isActive', '=', true)
      .where('organizationID', 'in', childOrgIDs)
      .where('dateFrom', '<=', reportParams.onDate)
      .where('dateTo', '>=', reportParams.onDate)
      .where('employeeNumberID.dateFrom', '<=', reportParams.onDate)
      .where('employeeNumberID.dateTo', '>=', reportParams.onDate)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    employeePosition = employeePosition && employeePosition.length ? _.groupBy(employeePosition, 'dictStaffCatID') : []

    _.forEach(dictCategory, category => {
      const byCategory = employeePosition[category.ID] || []
      let totalByCategory = byCategory.reduce((res, item) => res + (!result.roundToQuantity ? item.mtCount || 0 : AC.currencyService.round(item.mtCount || 0, result.roundToQuantity === 'numberGroup' ? 0 : result.roundToQuantity === 'decimal1' ? 1 : 2)), 0)
      if (totalByCategory) {
        const item = [{
          onlyText: true,
          value: category.name
        }]
        const categoryByWorkPlace = _.groupBy(byCategory, 'workPlace')
        _.forEach(dictWorkPlace, (workPlace, i) => {
          const byWorkPlace = categoryByWorkPlace[workPlace.code] || []
          const totalByWorkPlace = byWorkPlace.reduce((res, item) => res + (!result.roundToQuantity ? item.mtCount || 0 : AC.currencyService.round(item.mtCount || 0, result.roundToQuantity === 'numberGroup' ? 0 : result.roundToQuantity === 'decimal1' ? 1 : 2)), 0)
          const rt = result.roundToQuantity || HR.reportUtils.getQuantityFractional(totalByWorkPlace)
          item.push({
            categoryname: category.name,
            categoryid: category.ID === 'null' ? '-1' : category.ID,
            workplacename: workPlace.name,
            workplace: workPlace.code,
            value: totalByWorkPlace,
            valueStr: HR.reportUtils.quantityToString(totalByWorkPlace, rt)
          })
          result.totals[i + 1].value += totalByWorkPlace
        })
        const rt = result.roundToQuantity || HR.reportUtils.getQuantityFractional(totalByCategory)
        totalByCategory = AC.currencyService.round(totalByCategory || 0, rt === 'numberGroup' ? 0 : rt === 'decimal1' ? 1 : 2)
        item.push({
          categoryname: category.name,
          categoryid: category.ID === 'null' ? '-1' : category.ID,
          workplacename: '',
          workplace: '',
          value: totalByCategory,
          valueStr: HR.reportUtils.quantityToString(totalByCategory, rt)
        })
        result.totals[dictWorkPlace.length + 1].value += totalByCategory
        result.rows.push({
          columns: item
        })
      }
    })

    for (let i = 1; i < result.totals.length; i++) {
      result.totals[i].roundToQuantity = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.totals[i].value)
      result.totals[i].valueStr = HR.reportUtils.quantityToString(result.totals[i].value, result.totals[i].roundToQuantity)
    }
    return result
  },

  onReportClick: function (e) {
    e.preventDefault()
    const cellInfo = UBS.UBReport.cellInfo(e)

    const organizationIDs = cellInfo.table.dataset.organizationids ? cellInfo.table.dataset.organizationids.split(',').map(o => Number(o) || null) : [0]
    const onDate = new Date(cellInfo.table.dataset.ondate)
    const category = cellInfo.cell.dataset.categoryid ? parseInt(cellInfo.cell.dataset.categoryid, 10) : 0
    const categoryName = cellInfo.cell.dataset.categoryname || ''
    const workPlace = cellInfo.cell.dataset.workplace || ''
    const workPlaceName = cellInfo.cell.dataset.workplacename || ''
    drillDown(organizationIDs, onDate, category, categoryName, workPlace, workPlaceName)
  },

  onParamPanelConfig: function () {
    const accMainReportsSubOrg = AC.entityUtils.verifyRightsMethod('ac_service', 'subOrg')
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: {type: 'vbox' },
          items: [
            {
              xtype: 'panel',
              layout: {type: 'hbox'},
              items: [
                HR.controlService.getOrgCombo({
                  labelWidth: 120,
                  width: 600,
                  flex: 1,
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
                  }
                }),
                HR.controlService.getIncludeChildOrgs(accMainReportsSubOrg,
                  {
                    listeners: {
                      change: function (ctrl) {

                      }
                    }
                  })
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  fieldLabel: UB.i18n('Станом на'),
                  value: appAC.globalApplicationDate(),
                  allowBlank: false,
                  labelWidth: 120,
                  width: 240
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          organizationID: frm.findField('organizationID').getValue() || 0,
          includeChildOrgs: frm.findField('includeChildOrgs').getValue(),
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || appAC.globalApplicationDate())
        }
      }
    })
    return paramForm
  }
}

function drillDown (organizationIDs, onDate, category, categoryName, workPlace, workPlaceName) {
  onDate = AC.dateService.shiftDate(onDate)

  const whereList = {
    organizationID: {
      expression: '[organizationID]',
      condition: 'in',
      value:  organizationIDs
    },
    dateFrom: {
      expression: '[dateFrom]',
      condition: '<=',
      value: onDate
    },
    dateTo: {
      expression: '[dateTo]',
      condition: '>=',
      value: onDate
    },
    isActive: {
      expression: '[isActive]',
      condition: '=',
      value: 1
    }
  }
  if (category && category !== -1) {
    whereList.category = {
      expression: '[dictStaffCatID]',
      condition: '=',
      value: category
    }
  }
  if (category && category === -1) {
    whereList.category = {
      expression: '[dictStaffCatID]',
      condition: 'isNull'
    }
  }
  if (workPlace) {
    whereList.workPlace = {
      expression: '[workPlace]',
      condition: '=',
      value: workPlace
    }
  }
  $App.doCommand({
    cmdType: 'showList',
    isModal: true,
    description: UB.i18n(`Кількісний склад організації{0}{1}`, categoryName ? ', ' + categoryName : '', workPlaceName ? ', ' + workPlaceName : ''),
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
          formCode: 'hr_employee',
          entity: 'hr_employee',
          instanceID: record.get('employeeID'),
          cmpInitConfig: {
            employeeNumberID: record.get('employeeNumberID')
          }
        })
      }
    },
    hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
    cmdData: {
      params: [{
        entity: 'hr_employeePositionS',
        method: 'select',
        fieldList: [
          { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { width: 100 } },
          { name: 'description', description: UB.i18n('ПІБ, посада, підрозділ') },
          {
            name: 'mtCount',
            description: UB.i18n('Кількість ставок'),
            config: { width: 140, align: 'center' },
            format: '0.00'
          },
          { name: 'employeeNumberID', visibility: false },
          { name: 'employeeID', visibility: false }
        ],
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
