/* global $App HR UB _ AC appAC Ext */
module.exports = {
  getTabConfig
}

function getTabConfig (nodeId, form) {
  const tabs = {
    hr_employeeSickLimit: {
      title: UB.i18n('Пільги лікарняних'),
      items: [
        {
          xtype: 'ubdetailgrid',
          name: 'employeeSickLimit',
          autoScroll: true,
          hideActions: [],
          flex: 1,
          entityConfig: {
            entity: 'hr_employeeSickLimit',
            method: 'select',
            fieldList: [
              {
                name: 'dictSickLimitID.name',
                description: UB.i18n('Пільга'),
                editor: {
                  fieldList: ['ID', 'name', 'typeSickLimit']
                }
              },
              { name: 'typeSickLimit', description: UB.i18n('Вид пільги') },
              { name: 'dateFrom', description: UB.i18n('Діє з') },
              { name: 'dateToEmpty', description: UB.i18n('Діє по') },
              { name: 'employeeFamilyID.peopleID.shortFIO', description: UB.i18n('Людина, на догляд за якою надається пільга') },
              { name: 'docNumber', description: UB.i18n('Серія та № документа') },
              { name: 'docDate', description: UB.i18n('Дата видачі') },
              { name: 'avgSum', description: UB.i18n('Середньоденний заробіток') }
            ]
          },
          rowEditing: true,
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID'],
          onBeforeEdit: function (rowEditor, context) {
            context.grid.optimizeColumnWidth(true)
            if (context.grid.isEditDisabled) {
              return false
            }

            let editor = rowEditor.editor
            let me = editor.up('form')

            let typeSickLimit = editor.query(`[name=typeSickLimit]`)[0]
            const dictSickLimitID = editor.query(`[name=dictSickLimitID.name]`)[0]
            typeSickLimit.setReadOnly(true)
            AC.viewUtils.setWhereListProperty(editor.query(`[name=employeeFamilyID.peopleID.shortFIO]`)[0], [
              ['employeeID', '=', me.record.get('employeeID')]
            ])
            dictSickLimitID.on('change', (ctrl, value) => {
              typeSickLimit.setValue(ctrl.getFieldValue('typeSickLimit'))
            })
            typeSickLimit.on('change', (ctrl, value) => {
              editor.query(`[name=employeeFamilyID.peopleID.shortFIO]`)[0].setReadOnly(value !== '1' && value !== '2')
              editor.query(`[name=avgSum]`)[0].setReadOnly(value !== '4')

              editor.query(`[name=employeeFamilyID.peopleID.shortFIO]`)[0].setValue(null)
              editor.query(`[name=avgSum]`)[0].setValue(null)
            })
          },
          cmpInitConfig: {
          }
        }
      ]
    },
    hr_employeeDisability: {
      title: UB.i18n('Інвалідність'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'disabilityID.name', description: UB.i18n('Вид інвалідності') },
            { name: 'disabilityGroup', description: UB.i18n('Група інвалідності') },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з') },
            { name: 'dateToEmpty', description: UB.i18n('Діє по') }

          ],
          entityName: 'hr_employeeDisability',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID']
        })
      ]
    },
    hr_employeeTaxLimit: {
      title: UB.i18n('Пільги ПДФО'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeTaxLimit',
          fieldList: [
            { name: 'dateFromEmpty', format: 'm.Y' },
            { name: 'dateToEmpty', format: 'm.Y' },
            { name: 'taxLimitID.name', description: UB.i18n('Вид пільги') },
            { name: 'amountChild' }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID']
        })
      ]
    },
    hr_employeeNumberPosition: {
      title: UB.i18n('Призначення'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeePositionSR',
          name: 'employeePositionGrid',
          fieldList: [
            { name: 'organizationID.name', description: UB.i18n('Організація') },
            { name: 'departmentID.name', description: UB.i18n('Підрозділ') },
            { name: 'positionID.name', description: UB.i18n('Посада') },
            { name: 'dateFrom', description: UB.i18n('Діє з') },
            { name: 'dateToEmpty', description: UB.i18n('Діє по') },
            { name: 'workScheduleID.name', description: UB.i18n('Графік роботи') },
            'workerType',
            'workPlace',
            'mtCount',
            { name: 'dictCategoryECBIDID.name', description: UB.i18n('Категорія застрахованої особи') },
            { name: 'dictFundSourceID.name', description: UB.i18n('Джерело фінансування') },
            { name: 'dictTarifCoeffID.name', description: UB.i18n('Тарифний розряд') },
            { name: 'accountID.code', description: UB.i18n('Рахунок витрат') },
            { name: 'mi_deleteUser', visibility: false }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del'],
            getRowClass: function (row) {
              return row.get('mi_deleteUser') ? 'grd-color-grey' : ''
            },
            customActions: [
              {
                // xtype: 'button',
                name: 'viewDeletedBtn',
                text: UB.i18n('Показати видалені записи'),
                iconCls: 'fas fa-ban',
                cls: 'red-action',
                scale: 'medium',
                noActionButton: true,
                handler: function (btn) {
                  const me = btn.up('form')
                  const grid = me.up('[name=employeePositionGrid]')
                  grid.viewDeleted = !grid.viewDeleted
                  btn.addCls(grid.viewDeleted ? 'add-new-action' : 'red-action')
                  btn.removeCls(!grid.viewDeleted ? 'add-new-action' : 'red-action')
                  btn.setTooltip(!grid.viewDeleted ? UB.i18n('Показати видалені записи') : UB.i18n('Приховати видалені записи'))
                  grid.getStore().ubRequest.__allowSelectSafeDeleted = grid.viewDeleted
                  grid.getStore().reload(true)
                }
              }
            ],
            onDeterminateForm: function () {
              return {
                entityName: 'hr_employeePosition',
                formCode: 'hr_employeePosition',
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.record.get('employeeID')
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeNumberPositionEdit: {
      title: UB.i18n('Призначення'),
      items: [
        {
          xtype: 'acGrid',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employeeNumber_employeePositionEdit'),
          flex: 1,
          region: 'center',
          autoScroll: true,
          storeType: 'ub',
          disablePaging: true,
          entity: 'hr_employeePosition',
          formCode: 'hr_employeePositionEdit',
          onSaveEditData: true,
          showToolBar: true,
          multilineRows: true,
          hideActions: ['addNew', 'addNewByCurrent', 'del'],
          onAfterRender: function (grid) {
            if (!AC.settings.get('hrUseStaffingTable', appAC.globalOrganization())) {
              AC.gridUtils.setGridColumnVisible(grid, ['posName'], false)
              AC.gridUtils.setGridColumnVisible(grid, ['dictPositionID.name'], true)
            }
            AC.gridUtils.setGridColumnVisible(grid, ['factPosName'], AC.settings.get('hrOrderActualPositionName', appAC.globalOrganization()))
          },
          getRowClass: function (row) {
            return row.get('mi_deleteUser') ? 'grd-color-grey' : ''
          },
          ubStoreConfig: {
            entity: 'hr_employeePositionSR',
            method: 'select',
            fieldList: ['ID', 'dateFrom', 'dateTo', 'orderID.orderNumber', 'orderID.orderDate', 'workerType', 'depName', 'posName',
              'workScheduleID.name', 'payElID.name', 'mtCount', 'accrualSum', 'raiseSalary', 'isIndex', 'orderID.orderClass.entityName',
              'dictStaffCatID.name', 'workPlace', 'fundSourceNames', 'dictCategoryECBID.name', 'factPosName',
              'accountID.code', 'payElID.methodID.code', 'dictPositionID.name', 'fundSourceNames', 'mi_deleteUser'
            ],
            whereList: {
              employeeNumberID: {
                expression: '[employeeNumberID]',
                condition: 'equal',
                value: form.instanceID
              }
            },
            orderList: { orderBy: { expression: 'dateFrom' } }
          },
          customContextActions: [
            {
              text: UB.i18n('Видалити'),
              scale: 'medium',
              iconCls: 'u-icon-delete',
              handler: function (btn) {
                const grid = btn.up().grid
                let reco = AC.gridUtils.getCurrentRecord(grid)
                if (reco && reco.get('ID')) {
                  if (['hr_orderPay', 'hr_staffTable'].includes(reco.get('orderID.orderClass.entityName'))) {
                    $App.dialogYesNo('deletionDialogConfirmCaption', UB.i18n('Буде видалено запис. Ви впевнені?')
                    ).then(function (res) {
                      if (res) {
                        $App.connection.run({
                          entity: 'hr_employeePosition',
                          method: 'delete',
                          execParams: {
                            ID: reco.get('ID')
                          }
                        }).then(() => {
                          grid.getStore().load()
                        })
                      }
                    })
                  } else {
                    $App.dialogError(UB.i18n('Призначення було створене наказом з персоналу. Видалення неможливе!'))
                  }
                }
              }
            }
          ],
          customToolBarActions: [
            {
              xtype: 'button',
              tooltip: UB.i18n('Оновити'),
              scale: 'medium',
              iconCls: 'u-icon-refresh',
              handler: function (btn) {
                const me = btn.up('form')
                const grid = me.down('[formCode=hr_employeePositionEdit]')
                grid.getStore().load()
              }
            },
            {
              xtype: 'button',
              tooltip: UB.i18n('Додати'),
              scale: 'medium',
              iconCls: 'u-icon-add',
              cls: 'add-new-action',
              handler: function (btn) {
                const me = btn.up('form')
                const grid = me.down('[formCode=hr_employeePositionEdit]')
                UB.Repository('hr_employeePositionS')
                  .attrs(['*'])
                  .where('employeeNumberID', '=', form.instanceID)
                  .orderByDesc('dateTo')
                  .selectSingle().then(response => {
                    if (response) {
                      UB.Repository('hr_empPosFundSource')
                        .attrs(['employeeNumberID', 'dictFundSourceID', 'dictFundSourceID.description', 'mtCount'])
                        .where('employeePositionID', '=', response.ID)
                        .selectAsObject().then(fundSources => {
                          if (!response) {
                            response = {}
                          }
                          if (fundSources.length) {
                            response.fundSources = fundSources
                          } else {
                            delete response.fundSources
                          }
                          delete response.ID
                          delete response.mi_modifyDate
                          grid.openForm(response)
                        })
                    } else {
                      response = {}
                      grid.openForm(response)
                    }
                  })
              }
            },
            {
              xtype: 'button',
              tooltip: UB.i18n('Показати видалені записи'),
              iconCls: 'fas fa-ban',
              cls: 'red-action',
              scale: 'medium',
              noActionButton: true,
              handler: function (btn) {
                const me = btn.up('form')
                const grid = me.down('[formCode=hr_employeePositionEdit]')
                grid.viewDeleted = !grid.viewDeleted
                btn.addCls(grid.viewDeleted ? 'add-new-action' : 'red-action')
                btn.removeCls(!grid.viewDeleted ? 'add-new-action' : 'red-action')
                btn.setTooltip(!grid.viewDeleted ? UB.i18n('Показати видалені записи') : UB.i18n('Приховати видалені записи'))
                grid.getStore().ubRequest.__allowSelectSafeDeleted = grid.viewDeleted
                grid.getStore().load(true)
              }
            }
          ],
          expandedRowConfig: {
            onExpandBody: function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.addRowCls(record.index, 'grd-bold')
              const data = []
              record.store.data.items.forEach(item => {
                data.push(item.getData())
              })
              let fundSourceName = ''
              const fundSource = record.get('fundSourceNames') || []
              fundSource.forEach(row => {
                fundSourceName += (fundSourceName !== '' ? ', ' : '') + `${row.name} ${row.mtCount}`
              })
              const workerTypeObj = UB.core.UBEnumManager.getStore('HR_WORKER_TYPE').getById(record.get('workerType'))
              const workPlaceObj = UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').getById(record.get('workPlace'))
              const prior = data.sort((a, b) => ((new Date(b.dateFrom)).getTime() - ((new Date(a.dateFrom)).getTime())))
                .find(o => (new Date(o.dateTo)) < new Date(record.get('dateFrom'))) || { }
              let priorFundSourceName = ''
              if (prior) {
                const priorFundSource = prior.fundSourceNames || []
                priorFundSource.forEach(row => {
                  priorFundSourceName += (priorFundSourceName !== '' ? ', ' : '') + `${row.name} ${row.mtCount}`
                })
              }
              const workSchedule = `${record.get('workScheduleID.name') !== prior['workScheduleID.name'] ? '<b>' : ''}${record.get('workScheduleID.name') || ''}${record.get('workScheduleID.name') !== prior['workScheduleID.name'] ? '</b>' : ''}`
              const payEl = `${record.get('payElID.name') !== prior['payElID.name'] ? '<b>' : ''}${record.get('payElID.name') || ''}${record.get('payElID.name') !== prior['payElID.name'] ? '</b>' : ''}`
              const dictStaffCat = `${record.get('dictStaffCatID.name') !== prior['dictStaffCatID.name'] ? '<b>' : ''}${record.get('dictStaffCatID.name') || ''}${record.get('dictStaffCatID.name') !== prior['dictStaffCatID.name'] ? '</b>' : ''}`
              const accrualSum = `${record.get('accrualSum') !== prior.accrualSum ? '<b>' : ''}${AC.currencyService.formatAsCurrency(record.get('accrualSum'))}${record.get('accrualSum') !== prior.accrualSum ? '</b>' : ''}`
              const workerType = `${record.get('workerType') !== prior.workerType ? '<b>' : ''}${workerTypeObj ? workerTypeObj.get('name') : ''}${record.get('workerType') !== prior.workerType ? '</b>' : ''}`
              const mtCount = `${record.get('mtCount') !== prior.mtCount ? '<b>' : ''}${record.get('mtCount') || ''}${record.get('mtCount') !== prior.mtCount ? '</b>' : ''}`
              const workPlace = `${record.get('workPlace') !== prior.workPlace ? '<b>' : ''}${workPlaceObj ? workPlaceObj.get('name') : ''}${record.get('workPlace') !== prior.workPlace ? '</b>' : ''}`
              const dictFundSource = `${fundSourceName !== priorFundSourceName ? '<b>' : ''}${fundSourceName || ''}${fundSourceName !== priorFundSourceName ? '</b>' : ''}`
              const dictCategoryECB = `${record.get('dictCategoryECBID.name') !== prior['dictCategoryECBID.name'] ? '<b>' : ''}${record.get('dictCategoryECBID.name') || ''}${record.get('dictCategoryECBID.name') !== prior['dictCategoryECBID.name'] ? '</b>' : ''}`
              const account = `${record.get('accountID.code') !== prior['accountID.code'] ? '<b>' : ''}${record.get('accountID.code') || ''}${record.get('accountID.code') !== prior['accountID.code'] ? '</b>' : ''}`
              let detail = ` <style type="text/css">.table { width: 100%; padding:10px;} #td { text-indent: 20px} .span { color: #104ab9} </style>
              <td class="x-grid-cell-rowbody" colspan="10"><div class="x-grid-rowbody ">
              <div style="width: 100%"><TABLE style="width:100%">
              <TR>
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Графік роботи')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${workSchedule}</span></TD>
              <TD style="width:2%"></TD>
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Система оплати')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${payEl}</span></TD>
              </TR>`
              const hrTariffingEducational = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
              if (!hrTariffingEducational) {
                detail +=
                  `<TR>
                <TD style="width:19%; font-weight: normal;">${UB.i18n('Оклад')}</TD>
                <TD style="width:30%; font-weight: normal;"><span class = "span">${accrualSum}</span></TD>
                <TD style="width:2%"></TD>
                <TD style="width:19%; font-weight: normal;">${UB.i18n('Кількість ставок')}</TD>
                <TD style="width:30%; font-weight: normal;"><span class = "span">${mtCount}</span></TD>
                </TR>`
              }
              detail += `<TR>`
              const hrStaffCatByPosition = AC.settings.get('hrStaffCatByPosition', appAC.globalOrganization())
              if (!hrStaffCatByPosition) {
                detail += `
                <TD style="width:19%; font-weight: normal;">${UB.i18n('Категорія персоналу')}</TD>
                <TD style="width:30%; font-weight: normal;"><span class = "span">${dictStaffCat}</span></TD>
                <TD style="width:2%"></TD>`
              }
              detail += `
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Категорія застр. особи')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${dictCategoryECB}</span></TD>
              </TR>`
              detail += `
              <TR>
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Місце роботи')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${workPlace}</span></TD>
              <TD style="width:2%"></TD>
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Форма зайнятості')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${workerType}</span></TD>
              </TR>`
              detail += `
              <TR>
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Джерело фінансування')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${dictFundSource}</span></TD>
              <TD style="width:2%"></TD>
              <TD style="width:19%; font-weight: normal;">${UB.i18n('Рахунок витрат')}</TD>
              <TD style="width:30%; font-weight: normal;"><span class = "span">${account}</span></TD>
              </TR>`
              detail += '</TABLE></div></td>'
              expandRow.innerHTML = detail
            },
            onCollapseBody: function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.removeRowCls(record.index, 'grd-bold')
            }
          },
          fields: [
            { name: 'ID' },
            { name: 'mi_deleteUser' },
            {
              name: 'dateFrom',
              columnConfig: {
                text: UB.i18n('Діє з'),
                width: 100,
                dateFormat: 'd.m.Y'
              }
            },
            {
              name: 'dateToEmpty',
              columnConfig: {
                text: UB.i18n('Діє по'),
                width: 100,
                dateFormat: 'd.m.Y'
              }
            },
            {
              name: 'depName',
              columnConfig: {
                text: UB.i18n('Підрозділ'),
                width: 150
              }
            },
            {
              name: 'posName',
              columnConfig: {
                text: UB.i18n('Штатна посада'),
                flex: 1
              }
            },
            {
              name: 'dictPositionID.name',
              columnConfig: {
                text: UB.i18n('Посада'),
                flex: 1,
                hidden: true
              }
            },
            {
              name: 'factPosName',
              columnConfig: {
                text: UB.i18n('Фактична посада'),
                flex: 1
              }
            },
            {
              name: 'accrualSum',
              columnConfig: {
                text: UB.i18n('Оклад'),
                width: 150
              }
            },
            {
              name: 'orderID.orderNumber',
              columnConfig: {
                text: UB.i18n('Номер наказу'),
                width: 120
              }
            },
            {
              name: 'orderID.orderDate',
              columnConfig: {
                text: UB.i18n('Дата наказу'),
                width: 100,
                dateFormat: 'd.m.Y'
              }
            },
            { name: 'dateTo' },
            { name: 'workerType' },
            { name: 'dictStaffCatID.name' },
            { name: 'workScheduleID.name' },
            { name: 'payElID.name' },
            { name: 'payElID.methodID.code' },
            { name: 'mtCount' },
            { name: 'raiseSalary' },
            { name: 'isIndex' },
            { name: 'workPlace' },
            { name: 'fundSourceNames' },
            { name: 'dictFundSourceID.name' },
            { name: 'accountID.code' },
            { name: 'dictCategoryECBID.name' },
            { name: 'orderID.orderClass.entityName' }
          ],
          pagerConfig: { pageSize: 1000 },
          enableExpandableRows: true
        }
      ]
    },
    trf_position: {
      title: 'Тарифікація',
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'trf_workPlace',
          method: 'select',
          fieldList: [
            { name: 'ID', visibility: false, description: UB.i18n('ID') },
            { name: 'employeeNumberID', visibility: false, description: UB.i18n('employeeNumberID') },
            { name: 'documentID.type', visibility: false, description: UB.i18n('Тип документу') },
            { name: 'documentID.ID', visibility: false },
            { name: 'isPreviousPeriod', visibility: false },
            { name: 'isCurrent', visibility: false },
            { name: 'dateTo', visibility: false },
            { name: 'dateFrom', description: UB.i18n('Початок') },
            { name: 'dateToEmpty', description: UB.i18n('Кінець'), visibility: false },
            { name: 'documentID.docNumber', description: UB.i18n('Номер') },
            { name: 'documentID.docDate', description: UB.i18n('Дата') },
            { name: 'state', visibility: true },
            { name: 'accrualSum', description: UB.i18n('Сума'), format: '0.00' },
            { name: 'position', description: UB.i18n('Посад') },
            { name: 'sumTrfPosition', description: UB.i18n('Ставок'), format: '0' },
            { name: 'orderNumber', description: UB.i18n('Номер наказу') },
            { name: 'orderDate', description: UB.i18n('Дата наказу') },
            { name: 'documentID.name', description: UB.i18n('Назва документу') }
          ],
          whereList: Object.assign({
            employeeNumberID: {
              expression: '[employeeNumberID]',
              condition: 'equal',
              value: form.record.get('mainEmpNumberID') || form.instanceID
            },
            type: {
              expression: '[documentID.type]',
              condition: 'equal',
              value: 'FACT'
            }
          }, form.record.get('empDictPositionID') ? { trfPosition: {
            expression: '',
            condition: 'subquery',
            subQueryType: 'exists',
            value: {
              entity: 'trf_position',
              fieldList: ['ID'],
              method: 'select',
              whereList: {
                cond: {
                  expression: '[workPlaceID]=[{master}.ID]',
                  condition: 'custom'
                },
                mi_deleteDate: {
                  condition: 'equal',
                  expression: '[mi_deleteDate]',
                  value: '#maxdate'
                },
                dictPositionID: {
                  condition: 'equal',
                  expression: '[dictPositionID]',
                  value: form.record.get('empDictPositionID')
                }
              }
            }
          } } : {}),
          orderList: {
            orderBy: {
              expression: 'dateFrom',
              order: 'asc'
            }
          },
          masterEntityName: 'trf_workPlace',
          masterFields: ['ID'],
          detailFields: ['documentID'],
          cmpInitConfig: {
            hideActions: ['addNew'],
            disableSearchBar: true,
            hideMenuAllActions: true,
            sortableColumns: false,
            onItemDblClick: function (grid, record) {
              $App.doCommand({
                cmdType: 'showForm',
                entity: 'trf_workPlace',
                formCode: 'trf_workPlaceEdit',
                instanceID: record.get('ID'),
                tabId: `trf_workPlace-${record.get('ID') || (new Date()).getTime()}`,
                target: $App.getViewport().centralPanel,
                sender: grid,
                cmpInitConfig: {
                  defaultValues: {
                    documentID: record.get('documentID.ID'),
                    dateFrom: record.get('dateFrom'),
                    dateTo: record.get('dateTo'),
                    'documentID.orgID': appAC.globalOrganization(),
                    'documentID.docNumber': record.get('documentID.docNumber'),
                    'documentID.docDate': record.get('documentID.docDate'),
                    'documentID.name': record.get('documentID.name')
                  }
                }
              })
            },
            getRowClass: function (row) {
              if (row.get('isCurrent')) {
                return 'font-weight-bold'
              }
              if (row.get('state') === 'PROJECT') {
                return 'grd-color-grey'
              }
              return row.get('state') === 'POSTED' && row.get('isPreviousPeriod') ? 'ub-row-green font-weight-bold' : null
            },
            afterInit: function () {
              AC.gridUtils.tuneGridColumns(this, {
                accrualSum: {
                  renderer: value => value || ''
                }
              })
            }
          }
        })
      ]
    },
    hr_employeeKpi: {
      title: 'KPI',
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeKpi',
          method: 'select',
          fieldList: [
            { name: 'ID', visibility: false, description: UB.i18n('ID') },
            { name: 'employeeNumberID', visibility: false, description: UB.i18n('employeeNumberID') },
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateTo', visibility: false },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення') },
            { name: 'KPI', description: UB.i18n('KPI'), format: '0.0000' }
          ],
          // whereList: {
          //   employeeNumberID: {
          //     expression: '[employeeNumberID]',
          //     condition: 'equal',
          //     value: form.instanceID
          //   }
          // },
          orderList: {
            orderBy: {
              expression: 'dateFrom',
              order: 'asc'
            }
          },
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'] // ,
          // cmpInitConfig: {
          //   hideActions: ['addNewByCurrent', 'del', 'edit', 'audit', 'itemLink'],
          //   onItemDblClick: function (grid, record) {
          //     let ubdetailgrid = grid.up('ubdetailgrid')
          //     $App.doCommand({
          //       cmdType: 'showForm',
          //       formCode: 'hr_employeeKpiEdit',
          //       entity: 'hr_employeeKpi',
          //       isModal: true,
          //       instanceID: record.get('ID'),
          //       sender: ubdetailgrid.getView(),
          //       store: ubdetailgrid.store
          //     })
          //   }
          // }
        })
      ]
    },
    hr_employeeNumber: {
      title: UB.i18n('Інші особові рахунки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeNumberSR',
          name: 'employeeNumberGrid',
          fieldList: [
            { name: 'tabNum', description: UB.i18n('Таб.№') },
            { name: 'workPlace', description: UB.i18n('Місце роботи') },
            { name: 'posName' },
            { name: 'depName' },
            { name: 'dateFrom', description: UB.i18n('Дата прийому') },
            { name: 'dateToEmpty', description: UB.i18n('Дата звільнення') },
            { name: 'orgID', visibility: false },
            { name: 'orgName', description: UB.i18n('Організація') }
          ],
          whereList: {},
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID'],
          cmpInitConfig: {
            hideActions: ['edit', 'addNewByCurrent', 'del'],
            hideMenuAllActions: true,
            toolbarActionList: ['refresh', 'addNew'],
            afterInit: function () {
              let req = this.store.ubRequest
              if (AC.settings.get('hrShowOtherOrgsTabNums', appAC.globalOrganization())) {
                Object.assign(req.whereList, {
                  ID: {
                    expression: '[ID]',
                    condition: 'notEqual',
                    value: form.instanceID
                  }
                })
              } else {
                Object.assign(req.whereList, {
                  ID: {
                    expression: '[ID]',
                    condition: 'notEqual',
                    value: form.instanceID
                  },
                  orgID: {
                    expression: '[orgID]',
                    condition: 'equal',
                    value: form.record.get('orgID')
                  }
                })
                if (form.record.get('parentEmpNumberID')) {
                  Object.assign(req.whereList, {
                    parentID: {
                      expression: '[ID]',
                      condition: 'equal',
                      value: form.record.get('parentEmpNumberID')
                    }
                  })
                  req.logicalPredicates = ['([orgID] OR [parentID])']
                }
              }
            },
            openForm: function () {},
            onItemDblClick: function (grid, record) {
              let ubdetailgrid = grid.up('ubdetailgrid')
              let orgIDs = $App.connection.userData('userOrg') || []
              if (!AC.settings.get('hrShowOtherOrgsTabNums', appAC.globalOrganization()) || (AC.settings.get('hrShowOtherOrgsTabNums', appAC.globalOrganization()) && orgIDs.includes(record.get('orgID')))) {
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_employeeNumber',
                  entity: 'hr_employeeNumber',
                  tabId: 'hr_employeeNumber' + record.get('ID'),
                  target: $App.getViewport().centralPanel,
                  sender: ubdetailgrid.getView(),
                  store: ubdetailgrid.store,
                  instanceID: record.get('ID')
                })
              }
            },
            onAddNew: function () {
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_employeeNumber',
                entity: 'hr_employeeNumber',
                tabId: 'hr_employeeNumber' + 'ext' + Ext.id(null, 'addNew'),
                target: $App.getViewport().centralPanel,
                sender: this,
                store: this.store,
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.attr.employeeID.getValue(),
                    workPlace: '2',
                    dictStaffCatID: form.attr.dictStaffCatID.getValue(),
                    workScheduleID: form.attr.workScheduleID.getValue(),
                    mtCount: 0.5,
                    payElID: form.attr.payElID.getValue(),
                    dateFrom: new Date(),
                    workerType: '1'
                  }
                }
              })
            }
          }
        })
      ]
    },
    hr_orderRegistryDt: {
      title: UB.i18n('Неявки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_orderRegistryDt',
          method: 'selectDistinct',
          fieldList: [
            { name: 'periodCalcID', visibility: false },
            { name: 'employeeNumberID', visibility: false },
            { name: 'employeeNumberID.tabNum', visibility: false },
            { name: 'employeeNumberID.employeeID.fullFIO', visibility: false },
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateTo', description: UB.i18n('Дата закінчення') },
            { name: 'payElID.name', description: UB.i18n('Вид оплати') },
            { name: 'periodSalaryID.name', description: UB.i18n('Період нарахування') },
            { name: 'orderRegistryID', visibility: false }
          ],
          whereList: {
          },
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            onItemContextMenu: function () {},
            disableSearchBar: true,
            hideMenuAllActions: true,
            whereListByDates: function () {
              const appDate = appAC.globalApplicationDate()
              const appYear = appDate.getFullYear()
              const appMonth = appDate.getMonth()
              const timezoneOffset = -appDate.getTimezoneOffset()
              return {
                byAppDateFrom: {
                  expression: '[dateFrom]',
                  condition: '>=',
                  value: AC.dateService.shiftDate(new Date(appYear, appMonth, 1, 0, timezoneOffset))
                },
                byAppDateTo: {
                  expression: '[dateTo]',
                  condition: '<=',
                  value: AC.dateService.shiftDate(new Date(appYear, appMonth + 1, 0, 0, timezoneOffset))
                }
              }
            },
            afterInit: async function () {
              let req = this.store.ubRequest
              Object.assign(req.whereList, this.whereListByDates())
            },
            customActions: [{
              text: UB.i18n('Показати всі'),
              iconCls: 'fa fa-eye',
              itemId: 'showAll',
              handler: function (btn) {
                const grid = btn.up().up()
                grid.queryById('showCurr').show()
                btn.hide()
                delete grid.store.ubRequest.whereList.byAppDateFrom
                delete grid.store.ubRequest.whereList.byAppDateTo
                grid.onRefresh()
              }
            },
            {
              text: UB.i18n('Показати поточні'),
              hidden: true,
              iconCls: 'fa fa-eye-slash',
              itemId: 'showCurr',
              handler: function (btn) {
                const grid = btn.up().up()
                grid.queryById('showAll').show()
                btn.hide()
                Object.assign(grid.store.ubRequest.whereList, grid.cmpInitConfig.whereListByDates())
                grid.onRefresh()
              }
            }
            ],
            toolbarActionList: ['refresh'],
            sortableColumns: false,
            openForm: function () {

            },
            onItemDblClick: function (grid, record) {
              let ubdetailgrid = grid.up('ubdetailgrid')
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_rl',
                entity: 'hr_rl',
                tabId: 'hr_rl' + form.record.get('ID'),
                target: $App.getViewport().centralPanel,
                sender: ubdetailgrid.getView(),
                store: ubdetailgrid.store,
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: form.record.get('ID'),
                    periodID: record.get('periodCalcID')
                  }
                }
              })
            }
          }
        })
      ]
    },
    hr_employeeVacation: {
      title: UB.i18n('Відпустки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeVacation',
          fieldList: [
            { name: 'employeeNumberID.tabNum', description: UB.i18n('Табельний номер') },
            { name: 'dictVacationKindID.name', description: UB.i18n('Вид відпустки') },
            { name: 'vacationStatus', description: UB.i18n('Тип наказу') },
            { name: 'dateFrom', config: { align: 'center' } },
            { name: 'dateTo', config: { align: 'center' } },
            { name: 'cntDayRst', config: { align: 'center' } },
            { name: 'cntDayNoRst', config: { align: 'center' } },
            { name: 'dayCount', config: { align: 'center' }, description: UB.i18n('Кількість днів') },
            { name: 'orderID.orderNumberFullView', config: { align: 'center' }, description: UB.i18n('Номер наказу') },
            { name: 'empVacationPeriodID.description', config: { align: 'center' }, description: UB.i18n('Період відпустки') },
            { name: 'orderDate', config: { align: 'center' } },
            { name: 'isMoneyHelp', config: { align: 'center' }, description: UB.i18n('Мат. допомога') },
            { name: 'orderID.orderState', config: { align: 'center' }, description: UB.i18n('Стан') },
            { name: 'orderNumber', visibility: false }
          ],
          masterEntityName: 'hr_employeeNumber',
          orderList: {
            dateFrom: { expression: '[dateFrom]', order: 'desc' }
          },
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del', 'postingAction', 'cancelPostingAction', 'calcAction', 'uncalcAction', 'addNew'],
            getRowClass: function (row) {
              switch (row.get('orderID.orderState')) {
                case 'POSTED':
                  return 'ub-row-green'
                case 'PROCESSED':
                  return 'ub-row-yellow'
                default:
                  return 'ub-row-lightgrey'
              }
            },
            afterInit: function () {
              const grid = this
              grid.readOnly = form.readOnly
              AC.gridUtils.tuneGridColumns(grid, {
                isMoneyHelp: {
                  renderer: function (value, meta, record) {
                    return value ? UB.i18n('Так') : ''
                  }
                },
                'orderID.orderNumberFullView': {
                  renderer: function (value, meta, record) {
                    return value || (record.get ? record.get('orderNumber') : record[13])
                  }
                }
              })
              AC.gridUtils.changeEditToView(grid)
            }
          }
        })
      ]
    },
    hr_empVacationPlan: {
      title: UB.i18n('Право на відпустки, відгули'),
      name: 'empVacationForm',
      layout: { type: 'border' },
      items: [
        {
          xtype: 'acGrid',
          name: 'gridPlan',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employee_gridPlan'),
          region: 'center',
          entity: 'hr_empVacationPlan',
          formCode: 'hr_empVacationPlan',
          flex: 1,
          hideActions: form.readOnly ? ['del'] : [],
          readOnly: form.readOnly || !$App.domainInfo.isEntityMethodsAccessible('hr_empVacationPlan', 'addnew'),
          isReadOnly: form.readOnly,
          storeType: 'ub',
          storeAutoLoad: true,
          disablePaging: true,
          onSaveEditData: true,
          showToolBar: true,
          multilineRows: true,
          enableExpandableRows: true,
          ubStoreConfig: {
            entity: 'hr_empVacationPlan',
            method: 'selectData',
            fieldList: ['ID', 'employeeID', 'employeeNumberID.tabNum', 'dictVacationKindID.name', 'dayCount', 'dayDiff',
              'dayComp', 'dayReturn', 'dayToUse', 'dateFrom', 'dateToEmpty', 'reason', 'employeeNumberID', 'orderID',
              'dictVacationKindID', 'dictVacationKindID.code'],
            whereList: {
              employeeNumberID: {
                expression: '[employeeNumberID]',
                condition: 'equal',
                value: form.instanceID
              }
            },
            orderList: {
              orderBy: { expression: 'dateFrom', order: 'desc' }
            },
            customParams: {
              onDate: appAC.globalApplicationDate()
            }
          },
          customParams: {
            employeeID: form.record.get('employeeID'),
            employeeNumberID: form.instanceID
          },
          expandedRowConfig: {
            onExpandBody: async function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.addRowCls(record.index, 'grd-bold')
              const onDate = appAC.globalApplicationDate()
              const fixMonth = AC.settings.get('hrVacFixMonth', appAC.globalOrganization())
              const data = await HR.timeService.loadVacPeriods(grid, record, onDate)
              record.periods = data
              const vacKindCode = record.get('dictVacationKindID.code')
              const isStateVac = vacKindCode === 'dState'
              const hasDayComp = (record.get('dayComp') > 0) || (record.get('dayRecalc') > 0) || (record.get('dayReturn') > 0)
              let detail = ` <style type="text/css">.table { width: 100%; padding:10px;} #td { text-indent: 20px} .span { color: #104ab9} </style>
                <td class="x-grid-cell-rowbody" colspan="10"><div class="x-grid-rowbody">
                <div style="width: 100%"><TABLE>
                `
              if (data.length) {
                detail += `<TR style="text-align: center; font-weight: normal;">
                  <TD style="width:150px;">${UB.i18n('Період з')}</TD>
                  <TD style="width:110px;">${UB.i18n('по')}</TD>
                  <TD style="width:130px;">${UB.i18n('Кількість днів')}</TD>
                  <TD style="width:150px;">${UB.i18n('Використано днів')}</TD>
                `
                if (fixMonth > 0) {
                  detail += `<TD style="width:150px;">${UB.i18n('Зафіксовано днів')}</TD>
                  `
                }
                if (hasDayComp) {
                  detail += `<TD style="width:110px;">${UB.i18n('Компенсовано')}</TD>
                  <TD style="width:110px;">${UB.i18n('Перераховано')}</TD>
                  <TD style="width:110px;">${UB.i18n('Відраховано')}</TD>
                  `
                }
                detail += `<TD style="width:150px;">${UB.i18n('Залишилося днів')}</TD>
                  `
                detail += `<TD style="width:150px;">${UB.i18n('Доступно днів')}</TD>
                  `
                if (isStateVac) {
                  detail += `<TD style="width:150px;">${UB.i18n('Стаж ДС, років')}</TD>
                  `
                }
                detail += `</TR>
                  `
                data.forEach(item => {
                  detail += `<TR style="text-align: center; font-weight: normal;">
                    <TD style="width:150px;"><span class = "span">${item.dateFrom ? AC.dateService.formatDate(item.dateFrom) : ''}</span></TD>
                    <TD style="width:110px;"><span class = "span">${item.dateTo ? AC.dateService.formatDate(item.dateTo) : ''}</span></TD>
                    <TD style="width:130px;"><span class = "span">${item.dayCountPlan}</span></TD>
                    <TD style="width:150px;"><span class = "span">${item.dayCountFact}</span></TD>
                    `
                  if (fixMonth > 0) {
                    detail += `<TD style="width:150px;"><span class = "span">${item.dayFix || 0}</span></TD>
                    `
                  }
                  if (hasDayComp) {
                    detail += `<TD style="width:110px;"><span class = "span">${item.dayComp}</span></TD>
                    <TD style="width:110px;"><span class = "span">${item.dayRecalc}</span></TD>
                    <TD style="width:110px;"><span class = "span">${item.dayReturn}</span></TD>
                    `
                  }
                  detail += `<TD style="width:150px;"><span class = "span">${item.dayDiff}</span></TD>
                    `
                  detail += `<TD style="width:150px;"><span class = "span">${item.dayDiffOnDate}</span></TD>
                    `
                  if (isStateVac) {
                    detail += `<TD style="width:150px;"><span class = "span">${item.expYears || ''}</span></TD>
                    `
                  }
                  detail += `</TR>
                  `
                })
              }
              detail += '</TABLE></div></td>'
              expandRow.innerHTML = detail
              grid.getView().refreshSize()
            },
            onCollapseBody: function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.removeRowCls(record.index, 'grd-bold')
            }
          },
          fields: [
            { name: 'ID' },
            { name: 'employeeID' },
            { name: 'employeeNumberID.tabNum', columnConfig: { text: UB.i18n('Табельний номер'), width: 140 } },
            { name: 'dictVacationKindID.name', columnConfig: { text: UB.i18n('Вид відпустки'), width: 300 } },
            {
              name: 'dayCount',
              columnConfig: { text: UB.i18n('Днів відпустки за рік'), dataType: 'Int', width: 170, align: 'center' }
            },
            {
              name: 'dayDiff',
              columnConfig: { text: UB.i18n('Залишилося днів'), dataType: 'Int', width: 130, align: 'center' }
            },
            {
              name: 'dayToUse',
              columnConfig: { text: UB.i18n('Доступно днів'), dataType: 'Int', width: 120, align: 'center' }
            },
            {
              name: 'dateFrom',
              columnConfig: {
                text: UB.i18n('Дата початку дії'),
                dataType: 'Date',
                dateFormat: 'd.m.Y',
                width: 150,
                align: 'center'
              }
            },
            {
              name: 'dateToEmpty',
              columnConfig: {
                text: UB.i18n('Дата закінчення дії'),
                dataType: 'Date',
                dateFormat: 'd.m.Y',
                width: 150,
                align: 'center'
              }
            },
            { name: 'reason', columnConfig: { text: UB.i18n('Підстава'), flex: 1 } },
            { name: 'dayComp' },
            { name: 'dayReturn' },
            { name: 'employeeNumberID' },
            { name: 'dictVacationKindID' },
            { name: 'dictVacationKindID.code' },
            { name: 'orderID' }
          ],
          afterInit: function (grid) {
            grid.readOnly = form.readOnly
          },
          onAfterRender: function (grid) {
            const gridStore = grid.getStore()
            gridStore.on('load', (store, data) => {
              grid.ubStoreConfig.customParams.onDate = appAC.globalApplicationDate()
            })
            HR.controlService.acGridDelAutoCommit(grid)
            grid.setReadOnly(form.readOnly || !$App.domainInfo.isEntityMethodsAccessible('hr_empVacationPlan', 'addnew'))
          },
          customToolBarActions: [
            {
              tooltip: UB.i18n('Оновити'),
              scale: 'medium',
              iconCls: 'u-icon-refresh',
              handler: function (btn) {
                const grid = btn.up('[name=gridPlan]')
                $App.connection.run({
                  entity: 'hr_empVacationPeriod',
                  method: 'calcFields',
                  execParams: {
                    employeeNumberID: form.instanceID
                  }
                }).then(() => {
                  grid.loadData()
                })
              }
            },
            {
              tooltip: UB.i18n('Друкувати'),
              iconCls: 'fas fa-print',
              cls: 'blue-action',
              hidden: !form.instanceID,
              handler: function (btn) {
                const reportDesc = UB.i18n('Довідка про кількість невикористаних днів відпустки')
                const report = Ext.create('UBS.UBReport', {
                  code: 'hr_empNotUsedVacation',
                  type: 'html',
                  params: {
                    employeeID: form.record.get('employeeID'),
                    employeeNumberID: form.instanceID,
                    tabNum: form.tabNum,
                    reportDescription: reportDesc
                  }
                })
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'ac_documentViewer',
                  caption: UB.i18n('Друкована форма'),
                  cmpInitConfig: { report: report },
                  tabId: 'printDocument_hr_empNotUsedVacation_' + form.instanceID,
                  description: reportDesc,
                  target: $App.getViewport().centralPanel
                })
              }
            },
            {
              tooltip: UB.i18n('Додати права на відпустку'),
              iconCls: 'fas fa-angle-double-down',
              cls: 'fill-action',
              hidden: !form.instanceID,
              handler: function (btn) {
                const grid = btn.up('[name=gridPlan]')
                const employeeID = form.record.get('employeeID')
                const employeeNumberID = form.instanceID
                const orgID = appAC.globalOrganization()
                const onDate = appAC.globalApplicationDate()
                HR.treeUtils.getEmpPosInfo(employeeID, employeeNumberID, orgID, onDate, ['positionID.positionType',
                  'positionID.dictStaffCatID', 'positionID.dictStaffSubCatID', 'organizationID.dictGovernmTypeID', 'dictPositionID']).then(empPosInfo => {
                  if (empPosInfo) {
                    const positionType = empPosInfo['positionID.positionType']
                    form.setLoading(true)
                    $App.connection.run({
                      entity: 'hr_empVacationPlan',
                      method: 'addDefaultVacationPlan',
                      employeeID: employeeID,
                      employeeNumberID: employeeNumberID,
                      positionType: positionType,
                      dictGovernmTypeID: empPosInfo['organizationID.dictGovernmTypeID'],
                      dictStaffCatID: empPosInfo['positionID.dictStaffCatID'],
                      dictStaffSubCatID: empPosInfo['positionID.dictStaffSubCatID'],
                      dictPositionID: empPosInfo['dictPositionID'],
                      onDate: onDate
                    }).then(mParams => {
                      form.setLoading(false)
                      if (mParams.msg) {
                        $App.dialogInfo(mParams.msg)
                      }
                      grid.loadData()
                    }).catch((e) => {
                      form.setLoading(false)
                      $App.dialogError(AC.viewUtils.parseUBErrorMessage(e.message), UB.i18n('Помилка'))
                    })
                  } else {
                    $App.dialogInfo(UB.i18n('На поточну дату не знайдено посаду для даного працівника'))
                  }
                })
              }
            }
          ]
        }
      ]
    },
    hr_empLongTermAbsc: {
      title: UB.i18n('Довготривала відсутність'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_empLongTermAbsc',
          fieldList: [
            { name: 'dateFrom', config: { align: 'center' } },
            { name: 'dateToEmpty', config: { align: 'center' } },
            { name: 'description' }
          ],
          masterEntityName: 'hr_employeeNumber',
          orderList: {
            dateFrom: { expression: '[dateFrom]', order: 'desc' }
          },
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            hideActions: ['del'],
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empLongTermAbsc',
                formCode: 'hr_empLongTermAbsc',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_accrualBalance: {
      title: UB.i18n('Розрахункова відомість заробітної плати'),
      items: [
        {
          xtype: 'acGrid',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employeeNumber_employeeAccrualBalance'),
          flex: 1,
          region: 'center',
          autoScroll: true,
          storeType: 'local',
          disablePaging: true,
          showToolBar: true,
          fields: [
            { name: 'periodCalcID', visibility: false },
            { name: 'periodCalcID.isCurrent', visibility: false },
            { name: 'periodCalcID.name', visibility: false },
            {
              name: 'periodCalcID.description',
              columnConfig: {
                text: UB.i18n('Період'),
                renderer: (value, meta, record) => {
                  return record.data ? record.data['periodCalcID.isCurrent'] ? record.data['periodCalcID.description'] : record.data['periodCalcID.name'] : value
                },
                sortable: false
              }
            },
            { name: 'dictFundSourceID.name', columnConfig: { text: UB.i18n('Джерело фінансування') }, filterable: false },
            {
              name: 'sumFrom',
              columnConfig: {
                text: UB.i18n('Сальдо вхідне'),
                floatFormat: 2,
                align: 'right',
                sortable: false,
                renderer: function (value, meta, record) {
                  if (value < 0 && meta) {
                    meta.tdCls = 'grd-color-red'
                  }
                  return _.isNumber(value) ? Ext.util.Format.currency(value, '', 2) : value
                }
              }
            },
            {
              name: 'sumPlus',
              columnConfig: {
                text: UB.i18n('Нараховано'),
                floatFormat: 2,
                align: 'right',
                sortable: false,
                renderer: function (value, meta, record) {
                  return _.isNumber(value) ? Ext.util.Format.currency(value, '', 2) : value
                }
              }
            },
            {
              name: 'sumMinus',
              columnConfig: {
                text: UB.i18n('Утримано'),
                floatFormat: 2,
                align: 'right',
                sortable: false,
                renderer: function (value, meta, record) {
                  return _.isNumber(value) ? Ext.util.Format.currency(value, '', 2) : value
                }
              }
            },
            {
              name: 'sumPay',
              columnConfig: {
                text: UB.i18n('Виплачено'),
                floatFormat: 2,
                align: 'right',
                sortable: false,
                renderer: function (value, meta, record) {
                  return _.isNumber(value) ? Ext.util.Format.currency(value, '', 2) : value
                }
              }
            },
            {
              name: 'sumTo',
              columnConfig: {
                text: UB.i18n('Сальдо вихідне'),
                floatFormat: 2,
                align: 'right',
                sortable: false,
                renderer: function (value, meta, record) {
                  if (value < 0 && meta) {
                    meta.tdCls = 'grd-color-red'
                  }
                  return _.isNumber(value) ? Ext.util.Format.currency(value, '', 2) : value
                }
              }
            }
          ],
          summary: { sumPlus: 'sum', sumMinus: 'sum', sumPay: 'sum' },
          summaryDataOnClient: true,
          hideActions: ['addNew', 'edit', 'addNewByCurrent', 'del', 'postingAction', 'cancelPostingAction', 'calcAction', 'uncalcAction'],
          getRowClass: function (record, rowIndex, rowParams, store) {
            return record.get('periodCalcID.isCurrent') ? 'grd-bold' : ''
          },
          onItemDoubleClick: function (row, record) {
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_rl',
              entity: 'hr_rl',
              tabId: 'hr_rl' + form.instanceID,
              target: $App.getViewport().centralPanel,
              cmpInitConfig: {
                defaultValues: {
                  employeeID: form.record.get('employeeID'),
                  employeeNumberID: form.instanceID,
                  periodID: record.get('periodCalcID')
                }
              }
            })
          },
          onAfterRender: function (grid) {
            const tb = grid.down('toolbar')
            tb.insert(1, Ext.create('Ext.Button', {
              xtype: 'button',
              iconCls: 'u-icon-refresh',
              tooltip: UB.i18n('Оновити'),
              handler: function () {
                const dictFundSourceFilter = form.down('[name=dictFundSourceFilterID]')
                loadEmployeeAccrualBalance(form, grid, dictFundSourceFilter ? dictFundSourceFilter.getValue() : null)
              }
            }))

            if (AC.entityUtils.verifyRightsMethod('hr_rl', 'getCalcAccrual')) {
              $App.connection.run({
                entity: 'hr_rl',
                method: 'getCalcAccrual',
                employeeNumberID: form.record.get('ID')
              })
            }
            const dictFundSourceFilter = Ext.create('Ext.form.field.ComboBox',
              {
                xtype: 'ubcombobox',
                name: 'dictFundSourceFilterID',
                fieldLabel: UB.i18n('Джерело фінансування'),
                labelWidth: 130,
                displayField: 'name',
                valueField: 'ID',
                selectOnFocus: true,
                width: 350,
                listeners: {
                  change: function (ctrl, value) {
                    loadEmployeeAccrualBalance(form, grid, value)
                  }
                }
              })
            tb.insert(2, dictFundSourceFilter)
            let store
            let fundsList = [{ ID: -1, name: UB.i18n('Без джерела фінансування') }]
            UB.Repository('ac_fundSource')
              .attrs(['ID', 'name'])
              .where('ID', 'in', UB.Repository('hr_accrualBalance')
                .attrs('dictFundSourceID').where('employeeNumberID', '=', form.record.get('ID'))
              )
              .orderBy('dateFrom', 'desc')
              .selectAsObject().then(funds => {
                if (funds.length) {
                  UB.Repository('ac_dictFundSource')
                    .attrs(['ID', 'name', 'fundSourceID'])
                    .where('organizationID', '=', appAC.globalOrganization())
                    .where('fundSourceID', 'in', funds.map(o => o.ID))
                    .selectAsObject()
                    .then(dictFunds => {
                      funds.map(fund => {
                        let dictFund = dictFunds.find(f => f.fundSourceID === fund.ID)
                        if (dictFund && dictFund.name) fund.name += ` (${dictFund.name})`
                      })
                      store = Ext.create('Ext.data.Store', {
                        fields: ['ID', 'name'],
                        data: fundsList.concat(funds)
                      })
                      dictFundSourceFilter.bindStore(store)
                    })
                } else {
                  store = Ext.create('Ext.data.Store', {
                    fields: ['ID', 'name'],
                    data: fundsList
                  })
                  dictFundSourceFilter.bindStore(store)
                }
              })
            loadEmployeeAccrualBalance(form, grid)
          }
        }
      ]
    },
    hr_empOrder: {
      title: UB.i18n('Накази'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orderID.description', description: UB.i18n('Наказ') },
            { name: 'orderID', visibility: false },
            { name: 'orderID.masterOrganizationID', visibility: false },
            { name: 'orderID.organizationID', visibility: false },
            { name: 'orderID.orderClass.entityName', visibility: false },
            { name: 'orderID.orderState', visibility: false },
            { name: 'employeeID', visibility: false }
          ],
          name: 'gridEmpOrder',
          entityName: 'hr_employeeOrder',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            orgID: {
              // expression: '[orderID.periodID.orgID]',
              expression: '[orderID.organizationID]',
              condition: 'equal',
              values: { value: appAC.globalOrganization() }
            },
            mOrgID: {
              // expression: '[orderID.periodID.orgID]',
              expression: '[orderID.masterOrganizationID]',
              condition: 'equal',
              values: { value: appAC.globalOrganization() }
            }
          },
          orderList: { orderBy: { expression: 'orderID.orderDate', order: 'desc' } },
          logicalPredicates: ['([mOrgID] OR [orgID])'],
          cmpInitConfig: {
            hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del'],
            customActions: [
              {
                text: UB.i18n('Переглянути всі накази'),
                actionId: 'filterTabNum',
                iconCls: 'fa fa-filter',
                scale: 'medium',
                noActionButton: true,
                cls: 'green-action',
                handler: function () {
                  const me = this
                  const store = me.up('[name=gridEmpOrder]').getStore()
                  if (store.ubRequest.whereList.employeeNumberID) {
                    if (store.ubRequest.whereList.employeeNumberID.value === form.instanceID) {
                      delete store.ubRequest.whereList.employeeNumberID
                      store.load()
                    }
                  } else {
                    const req = store.ubRequest
                    req.whereList.employeeNumberID = {
                      expression: '[employeeNumberID]',
                      condition: 'equal',
                      value: form.instanceID
                    }
                    store.load()
                  }
                }
              }
            ],
            afterInit: function () {
              const grid = this
              form.globalOrganizationChange = () => {
                grid.store.ubRequest.whereList.orgID = {
                  // expression: '[orderID.periodID.orgID]',
                  expression: '[orderID.organizationID]',
                  condition: 'equal',
                  values: { value: appAC.globalOrganization() }
                }
              }
              if (form.instanceID) {
                const req = grid.getStore().ubRequest
                req.whereList.employeeNumberID = {
                  expression: '[employeeNumberID]',
                  condition: 'equal',
                  value: form.instanceID
                }
              }
              if (form.record.get('employeeID')) {
                const req = grid.getStore().ubRequest
                req.whereList.employeeID = {
                  expression: '[employeeID]',
                  condition: 'equal',
                  value: form.record.get('employeeID')
                }
              }

              this.readOnly = form.readOnly
            },
            getRowClass: function (row) {
              return AC.gridUtils.getOrderRowClass(row.get('orderID.orderState'))
            },
            onItemDblClick: function (grid, record) {
              if (record.get('orderID')) {
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: record.get('orderID.orderClass.entityName'),
                  entityName: record.get('orderID.orderClass.entityName'),
                  entity: record.get('orderID.orderClass.entityName'),
                  isModal: true,
                  instanceID: record.get('orderID'),
                  customParams: {
                    isMasterOrg: record.get('orderID.organizationID') !== record.get('orderID.masterOrganizationID')
                  }
                })
              }
            }
          }
        })
      ]
    },
    hr_employeeAccrualEdit: {
      title: UB.i18n('Постійні нарахування'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeAccrualEdit',
          method: 'select',
          fieldList: [
            { name: 'ID', visibility: false },
            { name: 'permDisabledID', visibility: false },
            { name: 'entityName', visibility: false },
            { name: 'payElDescription', description: UB.i18n('Вид нарахування') },
            { name: 'dateFrom', description: UB.i18n('Початок') },
            { name: 'dateToEmpty', description: UB.i18n('Кінець') },
            { name: 'accrualRate', description: '%' },
            { name: 'accrualSum', description: UB.i18n('Сума') },
            { name: 'orderDescription', description: UB.i18n('Наказ') },
            { name: 'dateTo', visibility: false },
            { name: 'methodCode', visibility: false }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del', 'edit', 'audit', 'itemLink'],
            onItemDblClick: function (grid, record) {
              const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
              if (currentRowGrid && ['hr_payPerm', 'trf_accrual'].includes(currentRowGrid.get('entityName'))) {
                return
              }
              let ubdetailgrid = grid.up('ubdetailgrid')
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_employeeAccrualEdit',
                entity: 'hr_employeeAccrual',
                isModal: true,
                instanceID: record.get('ID'),
                sender: ubdetailgrid.getView(),
                store: ubdetailgrid.store
              })
            },
            afterInit: function () {
              AC.gridUtils.tuneGridColumns(this, {
                accrualRate: {
                  renderer: function (value) {
                    return value === 0 ? null : AC.currencyService.valueAsMinDecimalPrecision(value, 2)
                  }
                },
                accrualSum: {
                  renderer: function (value) {
                    return value === 0 ? null : AC.currencyService.valueAsMinDecimalPrecision(value, 2)
                  }
                }
              })
              const grid = this
              const dateFilter = Ext.create('Ext.panel.Panel',
                {
                  layout: { type: 'vbox' },
                  items: [
                    {
                      xtype: 'ubdatefield',
                      fieldLabel: UB.i18n('На дату'),
                      name: 'onDate',
                      labelWidth: 80,
                      width: 230,
                      listeners: {
                        change: (ctrl) => {
                          const store = grid.getStore()
                          if (ctrl.getValue() && ctrl.isValid()) {
                            store.ubRequest.onDate = ctrl.getValue()
                          } else {
                            delete store.ubRequest.onDate
                          }
                          store.load()
                        },
                        blur: (ctrl) => {
                          const store = grid.getStore()
                          if (ctrl.getValue() && ctrl.isValid()) {
                            store.ubRequest.onDate = ctrl.getValue()
                          } else {
                            delete store.ubRequest.onDate
                          }
                          store.load()
                        }
                      }
                    }
                  ]
                }
              )
              grid.down('toolbar').insert(2, dateFilter)
              grid.menu.add(
                [
                  {
                    scale: 'medium',
                    iconCls: 'u-icon-copy',
                    cls: 'add-currect-action',
                    text: UB.i18n('Copy'),
                    disabled: !AC.entityUtils.verifyRightsMethod('hr_employeeAccrual', 'addnew'),
                    handler: function () {
                      const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
                      if (currentRowGrid && ['hr_payPerm', 'trf_accrual'].includes(currentRowGrid.get('entityName'))) {
                        throw new UB.UBAbortError()
                      } else {
                        grid.onAddNewByCurrent()
                      }
                    }
                  },
                  {
                    scale: 'medium',
                    iconCls: 'u-icon-delete',
                    cls: 'delete-action',
                    text: UB.i18n('Delete'),
                    disabled: !AC.entityUtils.verifyRightsMethod('hr_employeeAccrual', 'delete'),
                    handler: function () {
                      const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'trf_accrual') {
                        return
                      }
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm') {
                        if (!currentRowGrid.get('permDisabledID')) {
                          $App.dialogYesNo('deletionDialogConfirmCaption',
                            UB.format(UB.i18n('deleteConfirmationWithCaption'), 'Постійні нарахування', currentRowGrid.get('payElDescription'))
                          ).then(res => {
                            if (res) {
                              $App.connection.run({
                                entity: 'hr_payPermDisable',
                                method: 'insert',
                                execParams: { payPermID: currentRowGrid.get('ID'), employeeNumberID: form.instanceID }
                              }).then(() => {
                                grid.getStore().load()
                              })
                            }
                          })
                        }
                      } else {
                        $App.dialogYesNo('deletionDialogConfirmCaption',
                          UB.format(UB.i18n('deleteConfirmationWithCaption'), 'Постійні нарахування', currentRowGrid.get('payElDescription'))
                        ).then(res => {
                          if (res) {
                            $App.connection.run({
                              entity: 'hr_employeeAccrual',
                              method: 'delete',
                              execParams: { ID: currentRowGrid.get('ID') }
                            }).then(() => {
                              grid.getStore().load()
                            })
                          }
                        })
                      }
                    }
                  },
                  {
                    scale: 'medium',
                    iconCls: 'u-icon-desktop-swap',
                    cls: 'delete-action',
                    text: UB.i18n('Відміна видалення'),
                    disabled: !AC.entityUtils.verifyRightsMethod('hr_payPermDisable', 'delete'),
                    handler: function () {
                      const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'trf_accrual') {
                        return
                      }
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm' && currentRowGrid.get('permDisabledID')) {
                        $App.connection.run({
                          entity: 'hr_payPermDisable',
                          method: 'delete',
                          execParams: { ID: currentRowGrid.get('permDisabledID') }
                        }).then(() => {
                          grid.getStore().load()
                        })
                      }
                    }
                  }
                ]
              )
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeAccrual',
                formCode: 'hr_employeeAccrualEdit',
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.record.get('employeeID')
                  }
                }
              }
            },
            getRowClass: function (record, rowIndex, rowParams, store) {
              const me = this.up()
              const form = me.up('form')
              const onDate = me.down('[name=onDate]').getValue()
              if (record.get('entityName') === 'hr_employeeAccrual') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                if (onDate) {
                  if (!(dateFrom <= AC.dateService.shiftDate(onDate) && dateTo >= AC.dateService.shiftDate(onDate))) {
                    return 'grd-color-grey'
                  }
                } else if (form.currentPeriod) {
                  if (!(dateFrom <= form.currentPeriod.dateTo && dateTo >= form.currentPeriod.dateFrom)) {
                    return 'grd-color-grey'
                  }
                }
              } else if (record.get('entityName') === 'trf_accrual') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                if (onDate) {
                  const isOnDate = (dateFrom <= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()) && dateTo >= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()))
                  return (isOnDate ? 'grd-color-lightgreen' : 'grd-color-grey') + ' ' + (['143', '144', '145', '152'].includes(record.get('methodCode')) ? 'grd-italic' : '')
                } else if (form.currentPeriod) {
                  const isOnDate = (dateFrom <= form.currentPeriod.dateTo && dateTo >= form.currentPeriod.dateFrom)
                  return (isOnDate ? 'grd-color-lightgreen' : 'grd-color-grey') + ' ' + (['143', '144', '145', '152'].includes(record.get('methodCode')) ? 'grd-italic' : '')
                }
              } else {
                return record.get('permDisabledID') ? 'grd-color-grey-bold' : 'grd-color-blue'
              }
            }
          }
        })
      ]
    },
    hr_payRetention: {
      title: UB.i18n('Постійні утримання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_payRetentionEdit',
          method: 'select',
          fieldList: [
            { name: 'ID', visibility: false },
            { name: 'permDisabledID', visibility: false },
            { name: 'entityName', visibility: false },
            { name: 'payElDescription', description: UB.i18n('Вид нарахування') },
            { name: 'dateFrom', description: UB.i18n('Початок') },
            { name: 'dateTo', description: UB.i18n('Кінець') },
            { name: 'rate', description: '%', format: '0.00' },
            { name: 'baseSum', description: UB.i18n('Сума') },
            { name: 'paymentMethod', description: UB.i18n('Спосіб виплати') }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del', 'edit', 'audit', 'itemLink'],
            onItemDblClick: function (grid, record) {
              const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
              if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm') {
                return
              }
              let ubdetailgrid = grid.up('ubdetailgrid')
              $App.doCommand({
                cmdType: 'showForm',
                formCode: 'hr_payRetention',
                entity: 'hr_payRetention',
                isModal: true,
                instanceID: record.get('ID'),
                sender: ubdetailgrid.getView(),
                store: ubdetailgrid.store
              })
            },
            afterInit: function () {
              AC.gridUtils.tuneGridColumns(this, {
                baseSum: {
                  renderer: function (value) {
                    return value === 0 ? null : AC.currencyService.valueAsMinDecimalPrecision(value, 2)
                  }
                },
                rate: {
                  renderer: function (value) {
                    return value === 0 ? null : AC.currencyService.valueAsMinDecimalPrecision(value, 2)
                  }
                }
              })
              const grid = this
              const dateFilter = Ext.create('Ext.panel.Panel',
                {
                  layout: { type: 'vbox' },
                  items: [
                    {
                      xtype: 'ubdatefield',
                      fieldLabel: UB.i18n('На дату'),
                      labelWidth: 80,
                      width: 230,
                      listeners: {
                        change: (ctrl) => {
                          const store = grid.getStore()
                          if (ctrl.getValue() && ctrl.isValid()) {
                            store.ubRequest.onDate = ctrl.getValue()
                          } else {
                            delete store.ubRequest.onDate
                          }
                          store.load()
                        },
                        blur: (ctrl) => {
                          const store = grid.getStore()
                          if (ctrl.getValue() && ctrl.isValid()) {
                            store.ubRequest.onDate = ctrl.getValue()
                          } else {
                            delete store.ubRequest.onDate
                          }
                          store.load()
                        }
                      }
                    }
                  ]
                }
              )
              grid.down('toolbar').insert(2, dateFilter)
              grid.menu.add(
                [
                  {
                    scale: 'medium',
                    iconCls: 'u-icon-copy',
                    cls: 'add-currect-action',
                    text: UB.i18n('Copy'),
                    disabled: !AC.entityUtils.verifyRightsMethod('hr_payRetention', 'addnew'),
                    handler: function () {
                      const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm') {
                        throw new UB.UBAbortError()
                      } else {
                        grid.onAddNewByCurrent()
                      }
                    }
                  },
                  {
                    scale: 'medium',
                    iconCls: 'u-icon-delete',
                    cls: 'delete-action',
                    text: UB.i18n('Delete'),
                    disabled: !AC.entityUtils.verifyRightsMethod('hr_payRetention', 'delete'),
                    handler: function () {
                      const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm') {
                        if (!currentRowGrid.get('permDisabledID')) {
                          $App.dialogYesNo('deletionDialogConfirmCaption',
                            UB.format(UB.i18n('deleteConfirmationWithCaption'), 'Постійні утримання', currentRowGrid.get('payElDescription'))
                          ).then(res => {
                            if (res) {
                              $App.connection.run({
                                entity: 'hr_payPermDisable',
                                method: 'insert',
                                execParams: { payPermID: currentRowGrid.get('ID'), employeeNumberID: form.instanceID }
                              }).then(() => {
                                grid.getStore().load()
                              })
                            }
                          })
                        }
                      } else {
                        $App.dialogYesNo('deletionDialogConfirmCaption',
                          UB.format(UB.i18n('deleteConfirmationWithCaption'), 'Постійні утримання', currentRowGrid.get('payElDescription'))
                        ).then(res => {
                          if (res) {
                            $App.connection.run({
                              entity: 'hr_payRetention',
                              method: 'delete',
                              execParams: { ID: currentRowGrid.get('ID') }
                            }).then(() => {
                              grid.getStore().load()
                            })
                          }
                        })
                      }
                    }
                  },
                  {
                    scale: 'medium',
                    iconCls: 'u-icon-desktop-swap',
                    cls: 'delete-action',
                    text: UB.i18n('Відміна видалення'),
                    disabled: !AC.entityUtils.verifyRightsMethod('hr_payPermDisable', 'delete'),
                    handler: function () {
                      const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
                      if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm' && currentRowGrid.get('permDisabledID')) {
                        $App.connection.run({
                          entity: 'hr_payPermDisable',
                          method: 'delete',
                          execParams: { ID: currentRowGrid.get('permDisabledID') }
                        }).then(() => {
                          grid.getStore().load()
                        })
                      }
                    }
                  }
                ]
              )
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_payRetention',
                formCode: 'hr_payRetention',
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.record.get('employeeID')
                  }
                }
              }
            },
            getRowClass: function (record, rowIndex, rowParams, store) {
              const me = this.up()
              const form = me.up('form')
              const onDate = store.ubRequest.onDate
              if (record.get('entityName') === 'hr_payRetention') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                if (onDate) {
                  if (!(dateFrom <= AC.dateService.shiftDate(onDate) && dateTo >= AC.dateService.shiftDate(onDate))) {
                    return 'grd-color-grey'
                  }
                } else if (form.currentPeriod) {
                  if (!(dateFrom <= form.currentPeriod.dateTo && dateTo >= form.currentPeriod.dateFrom)) {
                    return 'grd-color-grey'
                  }
                }
              } else {
                return record.get('permDisabledID') ? 'grd-color-grey-bold' : 'grd-color-blue'
              }
            }
          }
        })
      ]
    },
    hr_employeeCPH: {
      title: UB.i18n('Договори ЦПХ'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeCPH',
          fieldList: [
            { name: 'orderNumber' },
            { name: 'orderDate' },
            { name: 'dateFrom' },
            { name: 'dateTo' },
            { name: 'payElID.description' },
            { name: 'paySum', format: '0.00' }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            hideActions: ['addNewByCurrent']
          }
        })
      ]
    },
    hr_employeeExperience: {
      title: UB.i18n('Стаж роботи'),
      items: [
        {
          xtype: 'experienceEmpControl'
        }
      ]
    },
    hr_employeeWorkbook: {
      title: UB.i18n('Трудова книжка працівника'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeWorkbook',
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення') },
            { name: 'positionType', description: UB.i18n('Тип посади') },
            { name: 'workPosition', description: UB.i18n('Посада') },
            { name: 'workPlace', description: UB.i18n('Місце роботи') },
            { name: 'dischargeReason', description: UB.i18n('Причина звільнення') },
            { name: 'description', description: UB.i18n('Опис') },
            { name: 'baseDocument', description: UB.i18n('Документ підстава') },
            { name: 'isAuto', description: UB.i18n('Створений автоматично'), visibility: true },
            { name: 'employeePositionID.orderID', visibility: false },
            { name: 'employeeID', visibility: false },
            { name: 'employeePositionID.paraID', visibility: false },
            { name: 'employeePositionID.orderID.orderClass.entityName', visibility: false }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID']
        })
      ]
    },
    hr_employeeNumberContactAddress: {

      title: UB.i18n('Інші контакти'),
      items: [
        {
          xtype: 'tabpanel',
          flex: 1,
          items: [
            {
              title: UB.i18n('Адреси'),
              layout: 'fit',
              items: [
                AC.gridUtils.getDefaultGridConfig({
                  entityName: 'ac_address',
                  fieldList: [
                    { name: 'addressType' },
                    { name: 'postIndex' },
                    { name: 'countryID.name', description: UB.i18n('Країна') },
                    { name: 'regionID.name', description: UB.i18n('Область') },
                    { name: 'districtID.name', description: UB.i18n('Район') },
                    { name: 'cityID.name', description: UB.i18n('Населений пункт') },
                    { name: 'cityDistrictID.name', description: UB.i18n('Район міста') },
                    { name: 'street' },
                    { name: 'house' },
                    { name: 'section' },
                    { name: 'apartment' },
                    { name: 'address' },
                    { name: 'ownerID', visibility: false }
                  ],
                  masterEntityName: 'hr_employeeNumber',
                  masterFields: ['employeeID'],
                  detailFields: ['ownerID'],
                  cmpInitConfig: {
                    afterInit: function () {
                      let req = this.store.ubRequest
                      req.whereList = {
                        ownerID: {
                          expression: '[ownerID]',
                          condition: 'equal',
                          value: form.record.get('employeeID')
                        }
                      }
                    },
                    onDeterminateForm: function (grid) {
                      return {
                        entityName: 'ac_address',
                        formCode: 'ac_address',
                        cmpInitConfig: {
                          defaultValues: { ownerID: form.record.get('employeeID') }
                        }
                      }
                    }
                  }
                })
              ]
            },
            {
              title: UB.i18n('Інші контакти'),
              layout: 'fit',
              items: [
                AC.gridUtils.getDefaultGridConfig({
                  entityName: 'hr_employeeContact',
                  fieldList: [
                    { name: 'contactTypeID' },
                    { name: 'value' },
                    { name: 'employeeID', visibility: false }
                  ],
                  masterEntityName: 'hr_employeeNumber',
                  masterFields: ['employeeID'],
                  detailFields: ['employeeID'],
                  cmpInitConfig: {
                    onDeterminateForm: function () {
                      return {
                        entityName: 'hr_employeeContact',
                        formCode: 'hr_employeeContact',
                        cmpInitConfig: {
                          defaultValues: { employeeID: form.record.get('employeeID') }
                        }
                      }
                    }
                  }
                })
              ]
            }
          ]
        }
      ]
    },
    hr_employeeDocs: {
      title: UB.i18n('Документи працівника'),
      items: [

        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeDocs',
          fieldList: [
            { name: 'dictDocKindID', description: UB.i18n('Вид документа') },
            { name: 'docSeries', description: UB.i18n('Серія') },
            { name: 'docNumber', description: UB.i18n('№ документа') },
            { name: 'docIssued', description: UB.i18n('Ким видано') },
            { name: 'docIssuedDate', description: UB.i18n('Дата видачі') },
            { name: 'docValidUntil', description: UB.i18n('Дiйсний до') },
            { name: 'state', description: UB.i18n('Стан документа') },
            { name: 'comment', description: UB.i18n('Примітки') },
            { name: 'dictDocKindID.vacationKindID.description', description: UB.i18n('Вид відпустки') }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID'],
          cmpInitConfig: {
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeDocs',
                formCode: 'hr_employeeDocs',
                cmpInitConfig: {
                  defaultValues: { ownerID: form.record.get('employeeID') }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeFamily: {
      title: UB.i18n('Члени сім\'ї'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeFamily',
          fieldList: [
            { name: 'dictKinshipKindID.name', description: UB.i18n('Член сім\'ї') },
            { name: 'peopleID.description', description: UB.i18n('ПІБ') },
            { name: 'peopleID.birthDate', description: UB.i18n('Дата народження') },
            { name: 'dateToEmpty' },
            { name: 'peopleID.phoneMobile', description: UB.i18n('Телефон') },
            { name: 'peopleID.email', description: 'Email' },
            { name: 'dictBenefitsKindID.name', description: UB.i18n('Пільга') },
            { name: 'isDependent' },
            { name: 'comment' }
          ],
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID']
        })
      ]
    },
    hr_employeeCgh: {
      title: UB.i18n('Зміна облікових даних'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orderNumberFull', description: UB.i18n('№ наказу') },
            { name: 'orderDate', description: UB.i18n('Дата наказу') },
            { name: 'orderID', visibility: false },
            { name: 'paraID', visibility: false },
            { name: 'fullFIOOld', description: UB.i18n('ПІБ попереднє') },
            { name: 'fullFIO', description: UB.i18n('ПІБ нове') }
          ],
          entityName: 'hr_employeeChange',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del', 'addNewByCurrent'] : ['addNewByCurrent'],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              if (grid.isNewInstance) {
                delete grid.isNewInstance
              }
              return null
            },
            _onAddNew: function () {
              this.isNewInstance = true
              $App.doCommand({
                cmdType: 'showForm',
                entity: 'hr_empOrder',
                sender: this,
                customParams: {
                  empOrderType: 'CHGEMPLOYEE'
                }
              })
            }
          }
        })
      ]
    },
    hr_empAddGuarantees: {
      title: UB.i18n('Додаткові гарантії працевлаштування'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'addGuarant', description: UB.i18n('Категорія гарантій працевлаштування') },
            { name: 'dateFrom', description: UB.i18n('Діє з') },
            { name: 'dateToEmpty', description: UB.i18n('Діє по') },
            { name: 'docSeries', description: UB.i18n('Серія') },
            { name: 'docNumber', description: UB.i18n('№ документа') },
            { name: 'docIssuer', description: UB.i18n('Ким видано') },
            { name: 'dateIssue', description: UB.i18n('Дата видачі') }
          ],
          entityName: 'hr_empAddGuarantees',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    }
  }

  let tab = tabs[nodeId]
  if (!tab) {
    return null
  }
  tab = _.cloneDeep(tab)
  tab.nodeId = nodeId
  tab.layout = tab.layout || 'fit'
  prepareAttr(tab.items, form)
  return tab
}

function prepareAttr (items, form) {
  const initData = form.initialConfig && form.initialConfig.data
  if (initData) {
    Object.keys(initData).forEach(field => {
      let fieldVal = initData[field]
      if (fieldVal) {
        form.record.set(field, fieldVal)
      }
    })
  }
  items && items.forEach(item => {
    let entityConfig = item.entityConfig || (item.cmdData && item.cmdData.params && item.cmdData.params[0])
    if (entityConfig && entityConfig.entity && $App.domainInfo.entities[entityConfig.entity] &&
      $App.domainInfo.entities[entityConfig.entity] && ($App.domainInfo.entities[entityConfig.entity].attributes['employeeNumberID'] ||
        $App.domainInfo.entities[entityConfig.entity].attributes['employeeID'])) {
      if ($App.domainInfo.entities[entityConfig.entity].attributes['employeeID']) {
        entityConfig.whereList = entityConfig.whereList || {}
        entityConfig.whereList.employeeID = {
          expression: '[employeeID]',
          condition: 'equal',
          value: form.record.get('employeeID')
        }
      }
      if ($App.domainInfo.entities[entityConfig.entity].attributes['employeeNumberID'] && entityConfig.entity !== 'trf_workPlace') {
        entityConfig.whereList = entityConfig.whereList || {}
        entityConfig.whereList.employeeID = {
          expression: '[employeeNumberID]',
          condition: 'equal',
          value: form.instanceID
        }
      }
      if (item.masterFields && item.detailFields && item) {
        item.cmpInitConfig.parentContext = {}
        _.forEach(item.masterFields, (masterField, index) => {
          item.cmpInitConfig.parentContext[item.detailFields[index]] = form.record.get(masterField)
        })
      }
    }
    item.items && prepareAttr(item.items, form)
  })
}

function loadEmployeeAccrualBalance (me, grid, dictFundSourceID) {
  grid.setLoading(true)
  const repository = dictFundSourceID
    ? UB.Repository('hr_accrualBalance')
      .attrs(['periodCalcID', 'periodCalcID.isCurrent', 'periodCalcID.name', 'periodCalcID.description',
        'dictFundSourceID.name', 'sumFrom', 'sumPlus', 'sumMinus', 'sumPay', 'sumTo'])
      .where('employeeNumberID', '=', me.record.get('ID'))
      .where('ID', '!=', AC.dataService.getUniqueInt())
      .whereIf(dictFundSourceID !== -1, 'dictFundSourceID', '=', dictFundSourceID)
      .whereIf(dictFundSourceID === -1, 'dictFundSourceID', 'isNull')
      .orderBy('[periodCalcID.dateFrom]', 'DESC')
      .selectAsObject()
    : UB.Repository('hr_accrualBalance')
      .attrs(['periodCalcID', 'periodCalcID.dateFrom', 'periodCalcID.isCurrent', 'periodCalcID.name', 'periodCalcID.description',
        'sum([sumFrom])', 'sum([sumPlus])', 'sum([sumMinus])', 'sum([sumPay])', 'sum([sumTo])'])
      .where('employeeNumberID', '=', me.record.get('ID'))
      .where('ID', '!=', AC.dataService.getUniqueInt())
      .orderBy('[periodCalcID.dateFrom]', 'DESC')
      .groupBy(['periodCalcID', 'periodCalcID.dateFrom', 'periodCalcID.isCurrent', 'periodCalcID.name', 'periodCalcID.description'])
      .selectAsObject({
        'sum([sumFrom])': 'sumFrom',
        'sum([sumPlus])': 'sumPlus',
        'sum([sumMinus])': 'sumMinus',
        'sum([sumPay])': 'sumPay',
        'sum([sumTo])': 'sumTo'
      })

  repository.then(data => {
    grid.getStore().removeAll()
    grid.getStore().loadData(data)
    grid.GridSummary.dataBind()
    grid.setLoading(false)
  }).catch(() => {
    grid.setLoading(false)
  })
}
