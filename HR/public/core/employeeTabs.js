/* global $App UB _ AC HR appAC Ext SystemJS saveAs Blob moment */

module.exports = {
  getTabConfig,
  getEmpCardMenu,
  onDeterminateCard,
  onDeterminateCardWithAccess,
  onDeterminateEmpNumberCard,
  getOrderCardMenu,
  getEmpCardWoorkbookOpenOrderMenu,
  calcWoorkbookExp,
  runEmpCard,
  refreshEmployeeNumberInfo,
  loadSchedule,
  openEmpCard
}

function getTabConfig (nodeId, form) {
  const employeeNumberID = form.employeeNumberID || null
  const limitedAccess = !AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess')
  const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
  const tabs = {
    ac_address: {
      title: UB.i18n('Адреси'),
      items: [
        {
          xtype: 'ubdetailgrid',
          name: 'addressesDetail',
          autoScroll: true,
          hideActions: form.readOnly ? ['del'] : [],
          flex: 1,
          readOnly: form.readOnly,
          entityConfig: {
            entity: 'ac_address',
            method: 'select',
            fieldList: [
              { name: 'addressEmpType' },
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
            ]
          },
          masterFields: ['ID'],
          detailFields: ['ownerID'],
          cmpInitConfig: {
            afterInit: function () {
              const req = this.store.ubRequest
              req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                req.whereList, this.masterFields, this.detailFields, form.record
              )
              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'ac_address',
                formCode: 'ac_address',
                cmpInitConfig: {
                  defaultValues: { ownerID: form.instanceID },
                  isEmpAddrType: true
                }
              }
            }
          }
        }
        /* AC.gridUtils.getDefaultGridConfig({
          entityName: 'ac_address',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['ownerID']
        }) */
      ]
    },
    hr_employeeContact: {
      title: UB.i18n('Інші контакти'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          readOnly: form.readOnly,
          entityName: 'hr_employeeContact',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_employeeNumberContactAddress: {
      title: UB.i18n('Адреси'),
      layout: { type: 'border' },
      items: [
        {
          region: 'center',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'ubdetailgrid',
              name: 'addressesDetail',
              autoScroll: true,
              hideActions: form.readOnly ? ['del'] : [],
              readOnly: form.readOnly,
              flex: 1,
              entityConfig: {
                entity: 'ac_address',
                method: 'select',
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
                ]
              },
              cmpInitConfig: {
                afterInit: function () {
                  const req = this.store.ubRequest
                  req.whereList = {
                    ownerID: {
                      expression: '[ownerID]',
                      condition: 'equal',
                      values: { value: form.record.get('employeeID') }
                    }
                  }
                  this.readOnly = form.readOnly
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
            }
          ]
        },
        {
          region: 'south',
          layout: { type: 'vbox', align: 'stretch' },
          height: 300,
          split: true,
          title: UB.i18n('Інші контакти'),
          items: [
            {
              xtype: 'ubdetailgrid',
              name: 'contactDetail',
              autoScroll: true,
              hideActions: form.readOnly ? ['del'] : [],
              flex: 1,
              readOnly: form.readOnly,
              entityConfig: {
                entity: 'hr_employeeContact',
                method: 'select',
                fieldList: [
                  { name: 'contactTypeID' },
                  { name: 'value' },
                  { name: 'employeeID', visibility: false }
                ]
              },
              masterFields: ['ID'],
              detailFields: ['employeeID'],
              cmpInitConfig: {
                afterInit: function () {
                  const req = this.store.ubRequest
                  req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                    req.whereList, this.masterFields, this.detailFields, form.record
                  )
                  this.readOnly = form.readOnly
                },
                onDeterminateForm: function (grid) {
                  return {
                    entityName: 'hr_employeeContact',
                    formCode: 'hr_employeeContact',
                    cmpInitConfig: {
                      defaultValues: { employeeID: form.record.get('employeeID') }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    },
    hr_employeeNumberDocs: {
      title: UB.i18n('Посвідчення особи'),
      layout: { type: 'border' },
      items: [
        {
          region: 'center',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'ubdetailgrid',
              name: 'addressesDetail',
              autoScroll: true,
              hideActions: form.readOnly ? ['del'] : [],
              flex: 1,
              readOnly: form.readOnly,
              entityConfig: {
                entity: 'hr_employeeDocs',
                method: 'select',
                fieldList: [
                  { name: 'dictDocKindID', description: UB.i18n('Вид документа') },
                  { name: 'docSeries', description: UB.i18n('Серія') },
                  { name: 'docNumber', description: UB.i18n('№ документа') },
                  { name: 'docIssued', description: UB.i18n('Ким видано') },
                  { name: 'docIssuedDate', description: UB.i18n('Дата видачі') },
                  { name: 'docValidUntil', description: UB.i18n('Дiйсний до') },
                  { name: 'state', description: UB.i18n('Стан документа') },
                  { name: 'comment', description: UB.i18n('Примітки') },
                  { name: 'employeeID', visibility: false }
                ]
              },
              cmpInitConfig: {
                afterInit: function () {
                  const req = this.store.ubRequest
                  req.whereList = {
                    employeeID: {
                      expression: '[employeeID]',
                      condition: 'equal',
                      values: { value: form.record.get('employeeID') }
                    }
                  }
                  this.readOnly = form.readOnly
                },
                onDeterminateForm: function (grid) {
                  return {
                    entityName: 'hr_employeeDocs',
                    formCode: 'hr_employeeDocs',
                    cmpInitConfig: {
                      defaultValues: { ownerID: form.record.get('employeeID') },
                      hideActions: form.readOnly ? ['fDelete'] : []
                    }
                  }
                }
              }
            }
          ]
        }
        /*
        {
          region: 'south',
          layout: { type: 'vbox', align: 'stretch' },
          height: 300,
          split: true,
          title: UB.i18n('Інші контакти'),
          items: [
            {
              xtype: 'ubdetailgrid',
              name: 'contactDetail',
              autoScroll: true,
              hideActions: [],
              flex: 1,
              entityConfig: {
                entity: 'hr_employeeContact',
                method: 'select',
                fieldList: [
                  { name: 'contactTypeID' },
                  { name: 'value' },
                  { name: 'employeeID', visibility: false }
                ]
              },
              masterFields: ['ID'],
              detailFields: ['employeeID'],
              cmpInitConfig: {
                afterInit: function () {
                  let req = this.store.ubRequest
                  req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                    req.whereList, this.masterFields, this.detailFields, form.record
                  )
                },
                onDeterminateForm: function (grid) {
                  return {
                    entityName: 'hr_employeeContact',
                    formCode: 'hr_employeeContact',
                    cmpInitConfig: {
                      defaultValues: { employeeID: form.record.get('employeeID') }
                    }
                  }
                }
              }
            }
          ]
        }
        */
      ]
    },
    hr_employeeFamily: {
      title: UB.i18n('Члени сім\'ї'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictKinshipKindID.name', description: UB.i18n('Член сім\'ї') },
            { name: 'peopleID.description', description: UB.i18n('ПІБ') },
            { name: 'peopleID.birthDate', description: UB.i18n('Дата народження') },
            { name: 'peopleID.age', description: UB.i18n('Вік') },
            { name: 'dateToEmpty' },
            { name: 'peopleID.phoneMobile', description: UB.i18n('Телефон') },
            { name: 'peopleID.email', description: 'Email' },
            { name: 'dictBenefitsKindID.name', description: UB.i18n('Пільга') },
            { name: 'isDependent' },
            { name: 'comment' }
          ],
          entityName: 'hr_employeeFamily',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_empAddInform: {
      title: UB.i18n('Додаткова інформація'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictAddInfKindID', description: UB.i18n('Інформація') },
            { name: 'strAddInform', description: UB.i18n('Значення') }
          ],
          entityName: 'hr_empAddInform',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_employeeAccessInfo: {
      title: UB.i18n('Форми допуску до інформації'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'assessmentType' },
            { name: 'orderFixExperienceNum' },
            { name: 'dateFrom' },
            { name: 'dateTo' }
          ],
          entityName: 'hr_employeeAccessInfo',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const gridStore = this.getStore()
              gridStore.ubRequest.whereList.orgID = {
                expression: '[organizationID]',
                condition: 'equal',
                value: appAC.globalOrganization()
              }
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeAccessInfo',
                formCode: 'hr_employeeAccessInfo',
                cmpInitConfig: {
                  defaultValues: { employeeNumberID: employeeNumberID }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeePluralList: {
      title: UB.i18n('Особові рахунки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeNumberSR',
          fieldList: [
            { name: 'tabNum', description: UB.i18n('Таб.№') },
            { name: 'workPlace', description: UB.i18n('Місце роботи') },
            { name: 'posName' },
            { name: 'depName' },
            { name: 'dateFrom', description: UB.i18n('Дата прийому') },
            { name: 'dateToEmpty', description: UB.i18n('Дата звільнення') },
            { name: 'employeeID', visibility: false },
            { name: 'orgID', visibility: false },
            { name: 'orgName', description: UB.i18n('Організація') }
          ],
          whereList: {},
          masterEntityName: 'hr_employee',
          masterFields: ['employeeID'],
          detailFields: ['employeeID'],
          cmpInitConfig: {
            hideActions: ['edit', 'addNewByCurrent', 'del', 'addNew'],
            hideMenuAllActions: true,
            toolbarActionList: ['refresh', 'addNew'],
            afterInit: function () {
              let req = this.store.ubRequest
              if (AC.settings.get('hrShowOtherOrgsTabNums', appAC.globalOrganization())) {
                Object.assign(req.whereList, {
                  ID: {
                    expression: '[ID]',
                    condition: 'notEqual',
                    value: employeeNumberID || 0
                  }
                })
              } else {
                Object.assign(req.whereList, {
                  ID: {
                    expression: '[ID]',
                    condition: 'notEqual',
                    value: employeeNumberID || 0
                  },
                  orgID: {
                    expression: '[orgID]',
                    condition: 'equal',
                    value: appAC.globalOrganization()
                  }
                })
              }
            },
            openForm: function () {},
            onItemDblClick: function (grid, record) {
              let ubdetailgrid = grid.up('ubdetailgrid')
              let orgIDs = $App.connection.userData('userOrg') || []
              if (!AC.settings.get('hrShowOtherOrgsTabNums', appAC.globalOrganization()) || (AC.settings.get('hrShowOtherOrgsTabNums', appAC.globalOrganization()) && orgIDs.includes(record.get('orgID')))) {
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_employee',
                  entity: 'hr_employee',
                  tabId: 'hr_employee' + record.get('ID'),
                  target: $App.getViewport().centralPanel,
                  sender: ubdetailgrid.getView(),
                  store: ubdetailgrid.store,
                  instanceID: record.get('employeeID'),
                  cmpInitConfig: {
                    employeeNumberID: record.get('ID')
                  }
                })
              }
            }
          }
        })
      ]
    },
    hr_employeeTaxLimit: {
      title: UB.i18n('Пільги ПДФО'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFromEmpty', format: 'm.Y' },
            { name: 'dateToEmpty', format: 'm.Y' },
            { name: 'taxLimitID.name', description: UB.i18n('Вид пільги') },
            { name: 'amountChild' }
          ],
          orderList: { orderBy: { expression: 'dateFromEmpty', order: 'asc' } },
          entityName: 'hr_employeeTaxLimit',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeNumberID'],
          detailFields: ['employeeNumberID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            sortableColumns: false,
            afterInit: function () {
              const req = this.store.ubRequest
              form.record.data.employeeNumberID = employeeNumberID
              req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                req.whereList, this.masterFields, this.detailFields, form.record
              )

              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeTaxLimit',
                formCode: 'hr_employeeTaxLimit',
                cmpInitConfig: {
                  defaultValues: { employeeNumberID: employeeNumberID }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeSickLimit: {
      title: UB.i18n('Пільги лікарняних'),
      items: [
        {
          xtype: 'ubdetailgrid',
          name: 'employeeSickLimit',
          autoScroll: true,
          readOnly: form.readOnly,
          flex: 1,
          sortableColumns: false,
          disableSearchBar: true,
          rowEditing: true,
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
            ],
            orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } }
          },
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            onBeforeEdit: function (rowEditor, context) {
              const grid = context.grid
              grid.optimizeColumnWidth(true)
              if (grid.isEditDisabled) {
                return false
              }

              const editor = rowEditor.editor
              const me = editor.up('form')
              AC.viewUtils.setWhereListProperty(editor.query('[name=employeeFamilyID.peopleID.shortFIO]')[0], [
                ['employeeID', '=', me.record.get('ID')]
              ])

              const typeSickLimitCtrl = editor.query('[name=typeSickLimit]')[0]
              const dictSickLimitID = editor.query(`[name=dictSickLimitID.name]`)[0]
              typeSickLimitCtrl.setReadOnly(true)
              dictSickLimitID.on('change', (ctrl, value) => {
                typeSickLimitCtrl.setValue(ctrl.getFieldValue('typeSickLimit'))
              })
              typeSickLimitCtrl.on('change', (ctrl, value) => {
                if (value !== '1' && value !== '2') {
                  editor.query('[name=employeeFamilyID.peopleID.shortFIO]')[0].setValue(null)
                }
                editor.query('[name=employeeFamilyID.peopleID.shortFIO]')[0].setReadOnly(value !== '1' && value !== '2')
                editor.query('[name=avgSum]')[0].setReadOnly(value !== '4')
                editor.query('[name=avgSum]')[0].setValue(null)
              })
              return true
            }
          }
        }
      ]
    },
    hr_employeeDocs: {
      title: UB.i18n('Документи працівника'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
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
          entityName: 'hr_employeeDocs',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_publServRang: {
      title: UB.i18n('Ранг держслужбовця'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'employeeID', visibility: false },
            { name: 'dictRankID.name', description: UB.i18n('Ранг') },
            { name: 'dateFrom' },
            { name: 'dateToEmpty' },
            {
              name: 'dateNext'
            },
            { name: 'orderNumber' },
            { name: 'orderDate' },
            { name: 'comment' }
          ],
          entityName: 'hr_publServRang',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            customInit: function () {
              AC.gridUtils.tuneGridColumns(this, {
                dateNext: {
                  renderer: function (value) {
                    return (value && value === AC.dateService.maxDate()) ? '' : AC.dateService.formatDate(value)
                  }
                }
              })
            }
          }
        })
      ]
    },
    hr_empAssessment: {
      title: UB.i18n('Оцінювання'),
      ubID: 'employeeAssesment',
      items: [
        AC.gridUtils.getDefaultGridConfig({
          header: false,
          fieldList: [
            { name: 'employeeID', visibility: false },
            { name: 'employeeNumberID', visibility: false },
            { name: 'assessmentType' },
            { name: 'assessmentTaskType' },
            { name: 'periodTypeID.name', description: UB.i18n('Період') },
            { name: 'year', format: '0', config: { align: 'center' } },
            { name: 'assessmentValue' },
            { name: 'avgValue' },
            { name: 'agreementState' },
            { name: 'organizationID.name', description: UB.i18n('Організація') },
            { name: 'hasResult', visibility: false },
            { name: 'empAssessmentResultID', visibility: false }
          ],
          whereList: {
            orgDateFrom: {
              expression: '[organizationID.mi_dateFrom]',
              condition: 'lessEqual',
              value: appAC.globalApplicationDate()
            },
            orgDateTo: {
              expression: '[organizationID.mi_dateTo]',
              condition: 'moreEqual',
              value: appAC.globalApplicationDate()
            },
            orgState: {
              expression: '[organizationID.state]',
              condition: 'equal',
              value: 'ACTIVE'
            },
            orgDel: {
              expression: '[organizationID.mi_deleteDate]',
              condition: 'equal',
              value: '#maxdate'
            }
          },
          entityName: 'hr_empAssessment',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            customInit: function () {
              const me = this
              AC.gridUtils.tuneGridColumns(me, {
                avgValue: {
                  renderer: function (value) {
                    if (!value) return
                    return value.toFixed(2)
                  }
                }
              })
            },
            afterInit: function () {
              const grid = this
              this.readOnly = form.readOnly
              const actCol = Ext.create('Ext.grid.column.Column', {
                xtype: 'actioncolumn',
                text: '',
                width: 40,
                align: 'center',
                filterable: false,
                sortable: false,
                renderer: function (value, meta, record) {
                  if (record.get('hasResult') > 0) {
                    const id = Ext.id()
                    Ext.defer(function () {
                      Ext.widget('button', {
                        renderTo: Ext.query('#' + id)[0],
                        tooltip: UB.i18n('Переглянути висновок'),
                        scale: 'small',
                        margin: '0 0 0 0',
                        iconCls: 'fas fa-file-invoice',
                        cls: 'blue-action',
                        handler: function (btn) {
                          const empAssessmentResultID = record.get('empAssessmentResultID')
                          $App.doCommand({
                            cmdType: 'showForm',
                            entity: 'hr_empAssessmentResult',
                            formCode: 'hr_empAssessmentResult',
                            instanceID: empAssessmentResultID,
                            tabId: 'hr_empAssessmentResult' + empAssessmentResultID,
                            target: $App.getViewport().centralPanel,
                            title: UB.i18n(`Результат виконання завдань`)
                          })
                        }
                      })
                    }, 50)
                    return Ext.String.format('<div id="{0}"></div>', id)
                  }
                }
              })
              grid.headerCt.insert(0, actCol)
              grid.columns.unshift(actCol)
            },
            getRowClass: (data) => {
              switch (data.get('assessmentValue')) {
                case 'PERFECT': return 'ub-row-green'
                case 'POSITIVE': return 'ub-row-yellow'
                case 'NEGATIVE': return 'ub-row-red'
                default: return 'ub-row-lightgrey'
              }
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empAssessment',
                formCode: 'hr_empAssessment',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: form.employeeNumberID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeWorkbook: {
      title: UB.i18n('Трудова книжка працівника'),
      items: [
        {
          xtype: 'acGrid',
          name: 'gridWorkBook',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employee_gridWorkBook'),
          region: 'center',
          entity: 'hr_employeeWorkbook',
          formCode: 'hr_employeeWorkbook',
          flex: 1,
          hideActions: form.readOnly ? ['del', 'addNewByCurrent'] : ['addNewByCurrent'],
          storeType: 'ub',
          storeAutoLoad: true,
          disablePaging: true,
          onSaveEditData: true,
          showToolBar: true,
          multilineRows: true,
          enableExpandableRows: true,
          autoSaveParentForm: true,
          readOnly: form.readOnly || !$App.domainInfo.isEntityMethodsAccessible('hr_employeeWorkbook', 'update'),
          isReadOnly: form.readOnly || !$App.domainInfo.isEntityMethodsAccessible('hr_employeeWorkbook', 'update'),
          ubStoreConfig: {
            entity: 'hr_employeeWorkbook',
            method: 'select',
            fieldList: ['ID', 'dateFrom', 'dateToEmpty', 'positionType.name', 'workPosition', 'workPlace',
              'employeePositionID.employeeNumberID.tabNum', 'dischargeReason', 'description', 'baseDocument', 'isAuto',
              'employeeID', 'positionType', 'employeePositionID.changeOrderID', 'hasDetails', 'empWorkPlace',
              'empWorkPlace.name', 'mtCount', 'appointOrder', 'dismOrder', 'appointReason', 'employeePositionID'],
            whereList: {
              employeeID: {
                expression: '[employeeID]',
                condition: 'equal',
                value: form.instanceID
              }
            },
            orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } }
          },
          expandedRowConfig: {
            onExpandBody: function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.addRowCls(record.index, 'grd-bold')
              loadWoorkbookExp(record)
                .then(data => {
                  record.expData = data
                  if (data) {
                    let detail = ` <style type="text/css">.table { width: 100%; padding:10px;} #td { text-indent: 20px} .span { color: #104ab9} </style>
                      <td class="x-grid-cell-rowbody" colspan="10"><div class="x-grid-rowbody">
                      <div style="width: 100%"><TABLE>
                      `
                    data.forEach(item => {
                      detail += `<TR>
                    <TD style="width:350px; font-weight: normal;">${UB.i18n('Вид стажу')}: <span class = "span">${item['dictExperienceID.name']}</span></TD>
                    <TD style="width:150px; font-weight: normal;">${UB.i18n('Дата з')}: <span class = "span">${item.dateFrom ? AC.dateService.formatDate(item.dateFrom) : ''}</span></TD>
                    <TD style="width:110px; font-weight: normal;">${UB.i18n('по')}: <span class = "span">${item.dateTo ? AC.dateService.formatDate(item.dateTo) : ''}</span></TD>
                    <TD style="width:100px; font-weight: normal;">${UB.i18n('Років')}: <span class = "span">${item.years || 0}</span></TD>
                    <TD style="width:100px; font-weight: normal;">${UB.i18n('Місяців')}: <span class = "span">${item.months || 0}</span></TD>
                    <TD style="width:100px; font-weight: normal;">${UB.i18n('Днів')}: <span class = "span">${item.days || 0}</span></TD>
                    <TD style="width:160px; font-weight: normal;">${UB.i18n('Кількість у днях')}: <span class = "span">${item.countDaysGiven || 0}</span></TD>
                    </TR>`
                    })
                    detail += '</TABLE></div></td>'
                    expandRow.innerHTML = detail
                    grid.getView().refreshSize()
                  }
                })
            },
            onCollapseBody: function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.removeRowCls(record.index, 'grd-bold')
            }
          },
          fields: [
            { name: 'ID' },
            {
              name: 'dateFrom',
              columnConfig: {
                text: UB.i18n('Дата початку'),
                dataType: 'Date',
                dateFormat: 'd.m.Y',
                width: 150,
                align: 'center'
              }
            },
            {
              name: 'dateToEmpty',
              columnConfig: {
                text: UB.i18n('Дата закінчення'),
                dataType: 'Date',
                dateFormat: 'd.m.Y',
                width: 150,
                align: 'center'
              }
            },
            { name: 'positionType.name', columnConfig: { text: UB.i18n('Тип посади'), width: 120 } },
            { name: 'workPosition', columnConfig: { text: UB.i18n('Посада'), width: 250 } },
            {
              name: 'workPlace',
              columnConfig: {
                text: UB.i18n('Місце роботи'),
                width: 250,
                renderer: (value, meta, record) => {
                  return record.get('employeePositionID') ? `<span style="font-weight: bold;">${value}</span>` : value
                }
              }
            },
            { name: 'appointOrder', columnConfig: { text: UB.i18n('Наказ (про початок)'), width: 200 } },
            { name: 'appointReason', columnConfig: { text: UB.i18n('Умови призначення'), width: 200 } },
            { name: 'dismOrder', columnConfig: { text: UB.i18n('Наказ (про закінчення)'), width: 200 } },
            { name: 'dischargeReason', columnConfig: { text: UB.i18n('Причина звільнення'), width: 200 } },
            { name: 'employeePositionID.employeeNumberID.tabNum', columnConfig: { text: UB.i18n('Таб №'), width: 60 } },
            { name: 'isAuto', columnConfig: { text: UB.i18n('Створений автоматично'), width: 150, align: 'center', booleanFormat: true } },
            {
              name: 'empWorkPlace',
              columnConfig: {
                text: UB.i18n('Ставок'),
                width: 250,
                align: 'center',
                renderer: (value, meta, record) => {
                  const empWorkPlaceName = record.get('empWorkPlace.name') || ''
                  return record.get('mtCount') ? (empWorkPlaceName ? empWorkPlaceName + ', ' : '') + record.get('mtCount') : empWorkPlaceName
                }
              }
            },
            { name: 'empWorkPlace.name' },
            { name: 'mtCount' },
            { name: 'positionType' },
            { name: 'employeeID' },
            { name: 'employeePositionID' },
            { name: 'employeePositionID.changeOrderID' },
            { name: 'hasDetails' }
          ],
          afterInit: function (grid) {
            AC.viewUtils.setWhereListProperty(grid, [['employeeID', '=', form.instanceID]], null, [])
          },
          onAfterRender: function (grid) {
            HR.controlService.acGridDelAutoCommit(grid)
            if (!form.employeeNumberID) {
              const tb = grid.down('toolbar')
              let action = tb.down(`[actionId=printAction]`)
              action && action.hide()
            }
            grid.setReadOnly(form.readOnly || !$App.domainInfo.isEntityMethodsAccessible('hr_employeeWorkbook', 'update'))

            grid.menu.query('[initialCls=delete-action]')[0].handler = function (keyCode, e) {
              onDelEmployeeWorkbook(grid, keyCode, e)
            }
            grid.actionsKeyMap.del.bindings[0].fn = function (keyCode, e) {
              onDelEmployeeWorkbook(grid, keyCode, e)
            }
          },
          getRowClass: function (row) {
            return row.get('hasDetails') ? '' : 'ub-row-yellow'
          },
          customToolBarActions: [
            {
              tooltip: UB.i18n('Оновити'),
              scale: 'medium',
              iconCls: 'u-icon-refresh',
              handler: function (btn) {
                const grid = btn.up('[name=gridWorkBook]')
                grid.loadData()
              }
            },
            {
              tooltip: UB.i18n('Заповнення стажу за періодами роботи'),
              scale: 'medium',
              iconCls: 'fas fa-calculator',
              disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_employeeWorkbook', 'autoFillExperience'),
              cls: 'fill-action',
              handler: function (btn) {
                const grid = btn.up('[name=gridWorkBook]')
                $App.connection.run({
                  entity: 'hr_employeeWorkbook',
                  method: 'autoFillExperience',
                  employeeID: form.instanceID
                }).then((data) => {
                  grid.loadData()
                })
              }
            },
            {
              tooltip: UB.i18n('Завантажити дані з csv файлу'),
              scale: 'medium',
              iconCls: 'el-icon-upload',
              cls: 'fill-action',
              handler: function (btn) {
                const grid = btn.up('[name=gridWorkBook]')
                Ext.create('AC.controls.acUploadFileAjax', {
                  scope: this,
                  height: 400,
                  customArea: {
                    xtype: 'panel',
                    region: 'center',
                    height: 250,
                    items: [
                      {
                        xtype: 'combobox',
                        width: 250,
                        editable: false,
                        name: 'encoding',
                        fieldLabel: UB.i18n('Кодування'),
                        allowBlank: false,
                        store: Ext.create('Ext.data.Store', {
                          fields: ['text', 'value'],
                          data: [
                            {
                              text: 'utf8',
                              value: 'utf8'
                            },
                            {
                              text: 'win1251',
                              value: 'win1251'
                            }
                          ]
                        })
                      }
                    ]
                  },
                  listeners: {
                    afterrender: function (cmp) {
                      this.fieldFile.fileInputEl.set({
                        accept: '.csv'
                      })
                      const encodingCtrl = this.down('[name=encoding]')
                      encodingCtrl.setValue('utf8')
                    }
                  },
                  upLoad: function (btn) {
                    const dialogWindow = btn.up('window')
                    const inputDom = this.fieldFile.fileInputEl.dom
                    if (inputDom.files.length === 0) {
                      return
                    }
                    form.setLoading(UB.i18n('Виконується завантаження даних'))
                    const file = inputDom.files[0]
                    btn.disable()
                    const encodingCtrl = this.down('[name=encoding]')
                    $App.dialogYesNo('Попередження', 'Увага! старі трудові записи може бути перезаписано<br><b>Продовжити виконання?</b>').then((res) => {
                      if (res) {
                        UB.connection.post('loadImportWorkbookData', file, {
                          params: {
                            orgID: appAC.globalOrganization(),
                            encoding: (encodingCtrl ? encodingCtrl.getValue() : null) || 'utf8',
                            fileName: file.name,
                            employeeID: form.instanceID,
                            taxCode: form.attr.taxCode.getValue()
                          },
                          headers: { 'Content-Type': 'application/octet-stream' }
                        }).then((response) => {
                          if (response.data && typeof response.data === 'object' && response.data.error) {
                            $App.dialogError(response.data.error)
                          }
                          grid.loadData()
                          form.setLoading(false)
                        }, (err) => {
                          form.setLoading(false)
                          if (err.config && err.config.timeout) {
                            $App.dialogInfo(UB.i18n('Операція виконується на сервері застосувань,\n та потребує додаткового часу для завершення.\n Зачекайте будь ласка, операцію буде виконано'))
                          } else {
                            throw err
                          }
                        }).finally(() => {
                          form.setLoading(false)
                        })
                        dialogWindow.close()
                      }
                    })
                  }
                })
              }
            },
            {
              name: 'unloadCsvSample',
              text: 'Вивантажити шаблон',
              cls: 'fill-action',
              scale: 'medium',
              tooltip: UB.i18n('Вивантажити шаблон'),
              handler: function (ctrl) {
                const attrs = ['Дата початку', 'Дата кінця', 'Наказ (про початок)', 'Наказ (про закінчення)', 'Місце роботи', 'Посада', 'Тип посади']
                const content = attrs.reduce((res, item, index, arr) => {
                  res += index !== arr.length - 1 ? `${item};` : item
                  return res
                }, '')
                $App.connection.run({
                  entity: 'ac_service',
                  method: 'exportCsv',
                  content: content
                }).then(({ result }) => {
                  AC.filesService.saveAsByBase64Buffer(result, 'Шаблон трудової книжки.csv', { type: 'text/plain' })
                })
              }
            },
            {
              tooltip: UB.i18n('Друкувати'),
              iconCls: 'fas fa-print',
              cls: 'blue-action',
              hidden: !form.employeeNumberID,
              menu: [{
                hidden: !form.employeeNumberID,
                text: UB.i18n('Трудова діяльність'),
                code: 'hr_printEmployeeWorkbook',
                reportCode: 'hr_printEmployeeWorkbook',
                handler: function () {
                  $App.doCommand({
                    cmdType: 'showReport',
                    caption: UB.i18n('Друкована форма.'),
                    tabId: 'printDocument_hr_employeeWorkbook' + Date.now(),
                    target: $App.getViewport().centralPanel,
                    cmdData: {
                      reportCode: 'hr_printEmployeeWorkbook',
                      reportParams: {
                        employeeNumberID: form.employeeNumberID || 0,
                        instanceID: form.instanceID
                      },
                      reportOptions: {
                        allowExportToExcel: true,
                        isModal: false
                      }
                    }
                  })
                }
              }, {
                hidden: !form.employeeNumberID,
                text: UB.i18n('Стаж (за трудовою книжкою)'),
                code: 'hr_printEmployeeWorkbookDt',
                reportCode: 'hr_printEmployeeWorkbookDt',
                handler: function () {
                  $App.doCommand({
                    cmdType: 'showReport',
                    caption: UB.i18n('Друкована форма.'),
                    tabId: 'printDocument_hr_employeeWorkbookDt' + Date.now(),
                    target: $App.getViewport().centralPanel,
                    cmdData: {
                      reportCode: 'hr_printEmployeeWorkbookDt',
                      reportParams: {
                        employeeNumberID: form.employeeNumberID || 0,
                        instanceID: form.instanceID
                      },
                      reportOptions: {
                        allowExportToExcel: true,
                        isModal: false
                      }
                    }
                  })
                }
              }]
            }
          ]
        },
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення') },
            { name: 'positionType', description: UB.i18n('Тип посади') },
            { name: 'workPosition', description: UB.i18n('Посада') },
            { name: 'workPlace', description: UB.i18n('Місце роботи') },
            { name: 'employeePositionID.employeeNumberID.tabNum', description: UB.i18n('Таб №'), visibility: true },
            { name: 'dischargeReason', description: UB.i18n('Причина звільнення') },
            { name: 'description', description: UB.i18n('Опис') },
            { name: 'baseDocument', description: UB.i18n('Документ підстава') },
            { name: 'isAuto', description: UB.i18n('Створений автоматично'), visibility: true },
            { name: 'employeeID', visibility: false },
            { name: 'employeePositionID.paraID', visibility: false },
            { name: 'employeePositionID.orderID.orderClass.entityName', visibility: false },
            { name: 'employeePositionID.orderID', visibility: false },
            { name: 'employeePositionID.changeOrderID', visibility: false }
          ],
          entityName: 'hr_employeeWorkbook',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              const grid = this
              const menuItemOpen = getEmpCardWoorkbookOpenOrderMenu(grid)
              const menuItemClose = {
                ubID: 'itemClose',
                text: UB.i18n('Переглянути наказ Закінчення'),
                iconCls: 'el-icon-circle-close',
                handler: item => {
                  const record = AC.gridUtils.getCurrentRecord(grid)
                  if (!record) {
                    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
                    return
                  }
                  UB.Repository('hr_empOrderDet').attrs(['mi_unityEntity', 'ID'])
                    .where('mi_unityEntity', 'in', ['hr_empOrderDismDet', 'hr_empOrderMoveDet'])
                    .where('employeeID', '=', record.get('employeeID'))
                    .where('orderID', '=', record.get('employeePositionID.changeOrderID'))
                    .selectSingle().then(row => {
                      if (row) {
                        $App.doCommand({
                          cmdType: 'showForm',
                          entityName: row.mi_unityEntity,
                          entity: row.mi_unityEntity,
                          isModal: true,
                          instanceID: row.ID
                        })
                      } else {
                        AC.viewUtils.showToast(UB.i18n('Наказ про переміщення або звільнення не знайдено'))
                      }
                    })
                }
              }
              grid.menu.add([menuItemOpen, menuItemClose])
              grid.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    // ---------------------------------------------- ACTING ----------------------------------------------------------
    hr_employeeActing: {
      title: UB.i18n('Покладання обов\'язків'),
      items: [
        {
          xtype: 'tabpanel',
          items: [
            {
              title: UB.i18n('Працівник виконував обов\'язки'),
              xtype: 'ubdetailgrid',
              name: 'actingForMe',
              autoScroll: true,
              hideActions: ['addNew', 'addNewByCurrent', 'newVersion', 'history', 'showPreview', 'itemLink', 'commandLink', 'showDetail', 'edit', 'del'],
              flex: 1,
              readOnly: form.readOnly,
              entityConfig: {
                entity: 'hr_empOrderDet',
                method: 'select',
                fieldList: [
                  { name: 'organizationID.name', description: UB.i18n('Організація') },
                  { name: 'orderID.orderNumber', visibility: false },
                  { name: 'orderID.orderNumberFull', description: UB.i18n('Номер наказу з індексом') },
                  { name: 'orderID.orderDate', description: UB.i18n('Дата наказу') },
                  { name: 'paraID.positionID.description', description: UB.i18n('Посада') },
                  { name: 'dateFrom', description: UB.i18n('Дата початку') },
                  { name: 'dateTo', description: UB.i18n('Дата закінчення') },
                  { name: 'orderID', visibility: false },
                  { name: 'dayCount' }
                ],
                whereList: {
                  empOrderType: {
                    expression: '[empOrderType]',
                    condition: 'equal',
                    values: { value: 'ACTING' }
                  },
                  cancelParaID: {
                    expression: '[cancelParaID]',
                    condition: 'isNull'
                  },
                  empOrderState: {
                    expression: '[orderID.orderState]',
                    condition: 'in',
                    values: { value: ['POSTED', 'PROCESSED'] }
                  }
                }
              },
              masterFields: ['ID'],
              detailFields: ['employeeID'],
              cmpInitConfig: {
                customActions: [
                  {
                    text: 'Припинити виконання обов`язків',
                    actionId: 'stopEmpActing',
                    iconCls: 'fa fa-times',
                    noActionButton: true,
                    scale: 'medium',
                    disabled: true,
                    handler: function (btn) {
                      const me = btn.up('form')
                      const grid = btn.up('[name=actingForMe]')
                      const reco = AC.gridUtils.getCurrentRecord(grid)
                      if (!reco) {
                        $App.dialogInfo(UB.i18n('Не вибрано запис'), UB.i18n('Увага'))
                        return
                      }
                      let dateTo
                      $App.doCommand({
                        cmdType: 'showForm',
                        formCode: 'hr_selectDateTo',
                        cmpInitConfig: {
                          defaultValues: { dateFrom: reco.data.dateFrom },
                          onSelect: function (selectedDateTo) {
                            dateTo = AC.dateService.unshiftDate(selectedDateTo)
                            me.setLoading(true)
                            $App.connection.run({
                              entity: 'hr_empOrderActingDet',
                              method: 'closeDateTo',
                              itemID: reco.get('ID'),
                              dateTo: dateTo
                            }).then(mParams => {
                              if (mParams.result) {
                                grid.onRefresh()
                                AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', false)
                                AC.gridUtils.enableCustomAction(grid, 'clearEmpActDateTo', false)
                              }
                              me.setLoading(false)
                            })
                          }
                        }
                      })
                    }
                  },
                  {
                    text: UB.i18n('Очистити дату закінчення'),
                    actionId: 'clearEmpActDateTo',
                    iconCls: 'fas fa-eraser',
                    cls: 'fill-action',
                    noActionButton: true,
                    disabled: true,
                    handler: function (btn) {
                      const me = btn.up('form')
                      const grid = btn.up('[name=actingForMe]')
                      const reco = AC.gridUtils.getCurrentRecord(grid)
                      if (!reco) {
                        $App.dialogInfo(UB.i18n('Не вибрано запис'), UB.i18n('Увага'))
                        return
                      }
                      me.setLoading(true)
                      $App.connection.run({
                        entity: 'hr_empOrderActingDet',
                        method: 'closeDateTo',
                        itemID: reco.get('ID'),
                        dateTo: null
                      }).then(mParams => {
                        if (mParams.result) {
                          grid.onRefresh()
                          AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', false)
                          AC.gridUtils.enableCustomAction(grid, 'clearEmpActDateTo', false)
                        }
                        me.setLoading(false)
                      })
                    }
                  }
                ],
                afterInit: function () {
                  const grid = this
                  const req = this.store.ubRequest
                  req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                    req.whereList, this.masterFields, this.detailFields, form.record
                  )
                  grid.readOnly = form.readOnly
                  grid.enableButtons = (selected) => {
                    if (grid.store.data.items.length === 0) {
                      return
                    }
                    const data = selected && selected[0] ? selected[0].data : null
                    if (data) {
                      let dateTo = data.dateTo
                      let canStop = !(dateTo)
                      let canClearDateTo = !!(dateTo)
                      AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', canStop)
                      AC.gridUtils.enableCustomAction(grid, 'clearEmpActDateTo', canClearDateTo)
                    } else {
                      AC.gridUtils.enableCustomAction(grid, 'stopEmpActing', false)
                      AC.gridUtils.enableCustomAction(grid, 'clearEmpActDateTo', false)
                    }
                  }
                  grid.on('selectionchange', (selectionModel, selected, eOpts) => {
                    grid.enableButtons(selected)
                  })
                  grid.store.on('load', () => {
                    grid.enableButtons()
                  })
                },
                onDeterminateForm: function (grid) {
                  throw new UB.UBAbortError()
                },
                onItemDblClick: function (grid, record) {
                  if (record.get('orderID')) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entityName: 'hr_empOrder',
                      entity: 'hr_empOrder',
                      isModal: true,
                      instanceID: record.get('orderID')
                    })
                  }
                }
              }
            },
            {
              title: UB.i18n('Виконували обов\'язки працівника'),
              xtype: 'ubdetailgrid',
              name: 'actingForOther',
              autoScroll: true,
              hideActions: ['addNew', 'addNewByCurrent', 'newVersion', 'history', 'showPreview', 'itemLink', 'commandLink', 'showDetail', 'edit', 'del'],
              flex: 1,
              readOnly: form.readOnly,
              entityConfig: {
                entity: 'hr_empOrderDet',
                method: 'select',
                fieldList: [
                  { name: 'organizationID.name', description: UB.i18n('Організація') },
                  { name: 'orderID.orderNumber', visibility: false },
                  { name: 'orderID.orderNumberFull', description: UB.i18n('Номер наказу з індексом') },
                  { name: 'orderID.orderDate', description: UB.i18n('Дата наказу') },
                  { name: 'paraID.positionID.description', description: UB.i18n('Посада') },
                  { name: 'employeePositionID.description', description: UB.i18n('Виконуючий обов\'язки') },
                  { name: 'dateFrom', description: UB.i18n('Дата початку') },
                  { name: 'dateTo', description: UB.i18n('Дата закінчення') },
                  { name: 'orderID', visibility: false },
                  { name: 'dayCount' }
                ],
                whereList: {
                  empOrderType: {
                    expression: '[empOrderType]',
                    condition: 'in',
                    values: { value: ['ACTING'] }
                  },
                  cancelParaID: {
                    expression: '[cancelParaID]',
                    condition: 'isNull'
                  },
                  empOrderState: {
                    expression: '[orderID.orderState]',
                    condition: 'in',
                    values: { value: ['POSTED', 'PROCESSED'] }
                  }
                }
              },
              cmpInitConfig: {
                customActions: [
                  {
                    text: 'Припинити виконання обов`язків',
                    actionId: 'stopOtherActing',
                    iconCls: 'fa fa-times',
                    noActionButton: true,
                    scale: 'medium',
                    disabled: true,
                    handler: function (btn) {
                      const me = btn.up('form')
                      const grid = btn.up('[name=actingForOther]')
                      const reco = AC.gridUtils.getCurrentRecord(grid)
                      if (!reco) {
                        $App.dialogInfo(UB.i18n('Не вибрано запис'), UB.i18n('Увага'))
                        return
                      }
                      let dateTo
                      $App.doCommand({
                        cmdType: 'showForm',
                        formCode: 'hr_selectDateTo',
                        cmpInitConfig: {
                          defaultValues: { dateFrom: reco.data.dateFrom },
                          onSelect: function (selectedDateTo) {
                            dateTo = AC.dateService.unshiftDate(selectedDateTo)
                            me.setLoading(true)
                            $App.connection.run({
                              entity: 'hr_empOrderActingDet',
                              method: 'closeDateTo',
                              itemID: reco.get('ID'),
                              dateTo: dateTo
                            }).then(mParams => {
                              if (mParams.result) {
                                grid.onRefresh()
                                AC.gridUtils.enableCustomAction(grid, 'stopOtherActing', false)
                                AC.gridUtils.enableCustomAction(grid, 'clearOtherActDateTo', false)
                              }
                              me.setLoading(false)
                            })
                          }
                        }
                      })
                    }
                  },
                  {
                    text: UB.i18n('Очистити дату закінчення'),
                    actionId: 'clearOtherActDateTo',
                    iconCls: 'fas fa-eraser',
                    noActionButton: true,
                    cls: 'fill-action',
                    disabled: true,
                    handler: function (btn) {
                      const me = btn.up('form')
                      const grid = btn.up('[name=actingForOther]')
                      const reco = AC.gridUtils.getCurrentRecord(grid)
                      if (!reco) {
                        $App.dialogInfo(UB.i18n('Не вибрано запис'), UB.i18n('Увага'))
                        return
                      }
                      me.setLoading(true)
                      $App.connection.run({
                        entity: 'hr_empOrderActingDet',
                        method: 'closeDateTo',
                        itemID: reco.get('ID'),
                        dateTo: null
                      }).then(mParams => {
                        if (mParams.result) {
                          grid.onRefresh()
                          AC.gridUtils.enableCustomAction(grid, 'stopOtherActing', false)
                          AC.gridUtils.enableCustomAction(grid, 'clearOtherActDateTo', false)
                        }
                        me.setLoading(false)
                      })
                    }
                  }
                ],
                afterInit: function () {
                  const grid = this
                  const req = grid.store.ubRequest
                  req.whereList.employeeID = {
                    expression: '[paraID.employeeID]',
                    condition: 'equal',
                    value: form.record.get('ID')
                  }
                  /* let req = this.store.ubRequest
                   req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                     req.whereList, this.masterFields, this.detailFields, form.record
                   ) */
                  grid.readOnly = form.readOnly
                  grid.enableButtons = (selected) => {
                    if (grid.store.data.items.length === 0) {
                      return
                    }
                    const data = selected && selected[0] ? selected[0].data : null
                    if (data) {
                      let dateTo = data.dateTo
                      let canStop = !(dateTo)
                      let canClearDateTo = !!(dateTo)
                      AC.gridUtils.enableCustomAction(grid, 'stopOtherActing', canStop)
                      AC.gridUtils.enableCustomAction(grid, 'clearOtherActDateTo', canClearDateTo)
                    } else {
                      AC.gridUtils.enableCustomAction(grid, 'stopOtherActing', false)
                      AC.gridUtils.enableCustomAction(grid, 'clearOtherActDateTo', false)
                    }
                  }
                  grid.on('selectionchange', (selectionModel, selected, eOpts) => {
                    grid.enableButtons(selected)
                  })
                  grid.store.on('load', () => {
                    grid.enableButtons()
                  })
                },
                onDeterminateForm: function (grid) {
                  throw new UB.UBAbortError()
                },
                onItemDblClick: function (grid, record) {
                  if (record.get('orderID')) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entityName: 'hr_empOrder',
                      entity: 'hr_empOrder',
                      isModal: true,
                      instanceID: record.get('orderID')
                    })
                  }
                }
              }
            }
          ]
        }
      ]
    },
    // ----------------------------------------------ACTING END-------------------------------------------------------------
    hr_employeePositionOrg: {
      title: UB.i18n('Просування в органі'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Дата початку'), format: 'd.m.Y' },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення'), format: 'd.m.Y' },
            { name: 'positionType', description: UB.i18n('Тип посади') },
            { name: 'workPosition', description: UB.i18n('Посада') },
            { name: 'workPlace', description: UB.i18n('Місце роботи') },
            { name: 'appointOrder', description: UB.i18n('Наказ (про початок)') },
            { name: 'appointReason', description: UB.i18n('Умови призначення') },
            { name: 'dismOrder', description: UB.i18n('Наказ (про закінчення)') },
            { name: 'dischargeReason', description: UB.i18n('Причина звільнення') },
            { name: 'employeePositionID.employeeNumberID.tabNum', description: UB.i18n('Таб №') },
            { name: 'isAuto', description: UB.i18n('Створений автоматично') },
            { name: 'empWorkPlace', description: UB.i18n('Ставок') },
            { name: 'empWorkPlace.name', visibility: false },
            { name: 'mtCount', visibility: false },
            { name: 'positionType.name', visibility: false },
            { name: 'employeePositionID', visibility: false },
            { name: 'employeePositionID.changeOrderID', visibility: false },
            { name: 'hasDetails', visibility: false },
            { name: 'employeePositionID.orderID', visibility: false },
            { name: 'employeeID', visibility: false },
            { name: 'employeePositionID.paraID', visibility: false },
            { name: 'employeePositionID.orderID.orderClass.entityName', visibility: false }
          ],
          entityName: 'hr_employeeWorkbook',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              const grid = this
              const menuItem1 = getEmpCardWoorkbookOpenOrderMenu(grid)
              const menuItemClose = {
                ubID: 'itemClose',
                text: UB.i18n('Переглянути наказ Закінчення'),
                iconCls: 'el-icon-circle-close',
                handler: item => {
                  const record = AC.gridUtils.getCurrentRecord(grid)
                  if (!record) {
                    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
                    return
                  }
                  UB.Repository('hr_empOrderDet').attrs(['mi_unityEntity', 'ID'])
                    .where('mi_unityEntity', 'in', ['hr_empOrderDismDet', 'hr_empOrderMoveDet'])
                    .where('employeeID', '=', record.get('employeeID'))
                    .where('orderID', '=', record.get('employeePositionID.changeOrderID'))
                    .selectSingle().then(row => {
                      if (row) {
                        $App.doCommand({
                          cmdType: 'showForm',
                          entityName: row.mi_unityEntity,
                          entity: row.mi_unityEntity,
                          isModal: true,
                          instanceID: row.ID
                        })
                      } else {
                        AC.viewUtils.showToast(UB.i18n('Наказ про переміщення або звільнення не знайдено'))
                      }
                    })
                }
              }
              AC.gridUtils.tuneGridColumns(grid, {
                workPlace: {
                  renderer: (value, meta, record) => {
                    return record.get('employeePositionID') ? `<span style="font-weight: bold;">${value}</span>` : value
                  }
                },
                empWorkPlace: {
                  renderer: (value, meta, record) => {
                    const empWorkPlaceName = record.get('empWorkPlace.name') || ''
                    return record.get('mtCount') ? (empWorkPlaceName ? empWorkPlaceName + ', ' : '') + record.get('mtCount') : empWorkPlaceName
                  }
                },
                'positionType': {
                  renderer: (value, meta, record) => {
                    return record.get('positionType.name')
                  }
                }
              })
              grid.menu.add([menuItem1, menuItemClose])
              AC.gridUtils.setGlobalOrganization(grid, 'organizationID')
              grid.readOnly = form.readOnly
              grid.store.sort('dateFrom', 'ASC')
            }
          }
        })
      ]
    },
    hr_employeeBonus: {
      title: UB.i18n('Нагороди'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictBonusID.name', description: UB.i18n('Нагорода') },
            { name: 'docIssuedDate' },
            { name: 'docNumber' },
            { name: 'docIssued', description: UB.i18n('Ким видано') },
            { name: 'dictBonusID.bonusTypeID.name', description: UB.i18n('Тип нагороди') },
            { name: 'comment', description: UB.i18n('Примітки') }
          ],
          whereList: {
            dictBonusDel: {
              expression: '[dictBonusID.mi_deleteDate]',
              condition: 'equal',
              value: '#maxdate'
            }
          },
          entityName: 'hr_employeeBonus',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_employeePenalty: {
      title: UB.i18n('Стягнення'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictPenaltyID.name', description: UB.i18n('Стягнення') },
            { name: 'dictPenaltyReasonID.name', description: UB.i18n('Причина стягнення') },
            { name: 'docIssuedDate', description: UB.i18n('Дата накладання') },
            { name: 'docIssued', description: UB.i18n('Ким надано') },
            { name: 'docDescription', description: UB.i18n('Опис') },
            { name: 'dateClosed', description: UB.i18n('Дата зняття') },
            { name: 'comment', description: UB.i18n('Примітки') }
          ],
          entityName: 'hr_employeePenalty',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              if (employeeNumberID) {
                /*
                let req = this.getStore().ubRequest
                req.whereList = {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                }
                */
              }
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_empMilitaryRanks: {
      title: UB.i18n('Військові звання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orderDate', description: UB.i18n('Дата присвоєння') },
            { name: 'dictMilitaryRankID.name', description: UB.i18n('Військове звання') },
            { name: 'dictMilitaryRankTypeID.name', description: UB.i18n('Вид присвоєння') },
            { name: 'type', description: UB.i18n('Вид служби') }
          ],
          entityName: 'hr_empMilitaryRanks',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_empStateMilitary: {
      title: UB.i18n('Військовий облік'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictStateMilitaryID.name', description: UB.i18n('Стан обліку') },
            { name: 'dictMilitaryGroupID.name', description: UB.i18n('Група обліку') },
            { name: 'groupAccounting', description: UB.i18n('Вид військ') },
            { name: 'composition', description: UB.i18n('Склад') },
            { name: 'dictCategMilitaryID.name', description: UB.i18n('Категорія') },
            { name: 'dictMilitaryRankID.name', description: UB.i18n('Військове звання') },
            { name: 'dictMilitarySpecialityID.name', description: UB.i18n('Військово-облікова спеціальність') },
            { name: 'dictMilitarySuitableID.name', description: UB.i18n('Придатність до військової служби') },
            { name: 'office', description: UB.i18n('Назва військкомату за місцем реєстрації') },
            { name: 'comment', description: UB.i18n('Примітки') }
          ],
          entityName: 'hr_empStateMilitary',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_empConscription: {
      title: UB.i18n('Призов на військову службу'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'startDate', description: UB.i18n('Дата призову') },
            { name: 'office', description: UB.i18n('Військкомат') },
            { name: 'dismissDate', description: UB.i18n('Дата звільнення') },
            { name: 'employeeDocID.description', description: UB.i18n('Наказ') },
            { name: 'dictDocKindID.name', visibility: false },
            { name: 'docNumber', visibility: false },
            { name: 'docSeries', visibility: false },
            { name: 'docIssuer', visibility: false },
            { name: 'dateIssue', visibility: false }
          ],
          entityName: 'hr_empConscription',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const grid = this
              AC.gridUtils.tuneGridColumns(grid, {
                'employeeDocID.description': {
                  renderer: function (value, meta, record) {
                    return value || `${record.get('dictDocKindID.name') || ''} ${record.get('docSeries') || ''} ${record.get('docNumber') || ''} ${record.get('dateIssue') ? 'від ' + AC.dateService.formatDate(record.get('dateIssue')) : ''} ${record.get('docIssuer') ? 'виданий ' + record.get('docIssuer') : ''}`
                  }
                }
              })
            }
          }
        })
      ]
    },
    hr_empMilitaryContract: {
      title: UB.i18n('Контракт'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateTo', description: UB.i18n('Дата закінчення') },
            { name: 'dictTermMilitaryContractID.name', description: UB.i18n('Термін контракту') },
            { name: 'description', description: UB.i18n('Опис') }
          ],
          entityName: 'hr_empMilitaryContract',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    hr_employeeDisability: {
      title: UB.i18n('Інвалідність'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'disabilityID.name', description: UB.i18n('Вид інвалідності') },
            { name: 'disabilityGroup', description: UB.i18n('Група інвалідності') },
            { name: 'dateFromEmpty', description: UB.i18n('Дата початку') },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення') },
            { name: 'disabilityID.dictVacationKindID', description: UB.i18n('Вид відпустки') }
          ],
          entityName: 'hr_employeeDisability',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_empRangeScience: {
      title: UB.i18n('Науковий ступінь'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictDegreeID.name', description: UB.i18n('Науковий ступінь') },
            { name: 'dictBranchScienceID.name', description: UB.i18n('Галузь науки') },
            { name: 'dictSpecialtyID.name', description: UB.i18n('Спеціальність') },
            { name: 'educationName', description: UB.i18n('Науковий заклад') },
            { name: 'docNumber', description: UB.i18n('№ атестата, диплома') },
            { name: 'docDate', description: UB.i18n('Дата видачі') },
            { name: 'comment', description: UB.i18n('Примітки') }
          ],
          entityName: 'hr_empRangeScience',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_empCertificatnUp: {
      title: UB.i18n('Професійне навчання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateTo', description: UB.i18n('Дата закінчення') },
            { name: 'educationName', description: UB.i18n('Заклад освіти') },
            { name: 'dictTrainingTopicID', description: UB.i18n('Тематика') },
            { name: 'docType', description: UB.i18n('Тип документа про закінчення') },
            { name: 'docNumber', description: UB.i18n('Номер документа') },
            { name: 'docDate', description: UB.i18n('Дата видачі') },
            { name: 'comment', description: UB.i18n('Примітки') },
            { name: 'organizationID.name', description: UB.i18n('Внесено в') }
          ],
          orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } },
          entityName: 'hr_empCertificatnUp',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            orgDateFrom: {
              expression: '[organizationID.mi_dateFrom]',
              condition: 'lessEqual',
              value: new Date()
            }
          },
          joinAs: ['orgDateFrom'],
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del', 'addNewByCurrent'] : ['addNewByCurrent'],
            afterInit: function () {
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_empQualification: {
      title: UB.i18n('Підвищення кваліфікації'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Початок з') },
            { name: 'dateTo', description: UB.i18n('По') },
            { name: 'educationName', description: UB.i18n('Заклад освіти') },
            { name: 'dictSpecialityID', description: UB.i18n('Спеціальність') },
            { name: 'dictTrainingKindID', description: UB.i18n('Вид підготовки') },
            { name: 'lectureCycle', description: UB.i18n('Назва циклу') },
            { name: 'dictTrainingKindID.trainingLevel', description: UB.i18n('Рівень підготовки') }
          ],
          orderList: { orderBy: { expression: 'dateFrom', order: 'desc' } },
          entityName: 'hr_empCertificatnUp',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            orgDateFrom: {
              expression: '[organizationID.mi_dateFrom]',
              condition: 'lessEqual',
              value: new Date()
            }
          },
          joinAs: ['orgDateFrom'],
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del', 'addNewByCurrent'] : ['addNewByCurrent'],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empCertificatnUp',
                formCode: 'hr_empQualification',
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_empCertificationAcc: {
      title: UB.i18n('Атестація/Кваліфікація'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'certificationDate', description: UB.i18n('Дата атестації') },
            { name: 'validityDate', description: UB.i18n('Термін по ') },
            { name: 'dictEmpCategoryID', description: UB.i18n('Категорія') },
            { name: 'typeCertification', description: UB.i18n('Вид атестації') },
            { name: 'dictSpecialtyID', description: UB.i18n('Спеціальність') },
            { name: 'orderNumber', description: UB.i18n('Номер наказу') },
            { name: 'orderDate', description: UB.i18n('Дата наказу') },
            { name: 'orderAuthor', description: UB.i18n('Видавник наказу') }
          ],
          orderList: { orderBy: { expression: 'certificationDate', order: 'desc' } },
          entityName: 'hr_empCertificationAcc',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            _onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empCertificationAcc',
                formCode: 'hr_empCertificationAcc',
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeSuccess: {
      title: UB.i18n('Патенти та публікації'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'typeSuccess', description: UB.i18n('Тип') },
            { name: 'dictPublicationKindID', description: UB.i18n('Вид публікації') },
            { name: 'name', description: UB.i18n('Назва') },
            { name: 'yearPublication', description: UB.i18n('Рік публікації') },
            { name: 'published', description: UB.i18n('Опубліковано') },
            { name: 'authors', description: UB.i18n('Автори') },
            { name: 'publishingHouse', description: UB.i18n('Видавництво') }
          ],
          orderList: { orderBy: { expression: 'yearPublication', order: 'desc' } },
          entityName: 'hr_employeeSuccess',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            _onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeSuccess',
                formCode: 'hr_employeeSuccess',
                cmpInitConfig: {
                  defaultValues: {
                    employeeID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_empAcademStatus: {
      title: UB.i18n('Вчене звання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictAcademStatusID.name', description: UB.i18n('Вчене звання') },
            { name: 'setStatus', description: UB.i18n('Присвоєння звання') },
            { name: 'dictSpecialtyID.name', description: UB.i18n('Спеціальність') },
            { name: 'educationName', description: UB.i18n('Назва кафедри') },
            { name: 'docNumber', description: UB.i18n('№ атестата, диплома') },
            { name: 'docDate', description: UB.i18n('Дата видачі') },
            { name: 'comment', description: UB.i18n('Примітки') }
          ],
          entityName: 'hr_empAcademStatus',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_employeeLanguage: {
      title: UB.i18n('Володіння мовами'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictLanguageID.name', description: UB.i18n('Іноземна мова') },
            { name: 'dictLanguageLevelID.level', description: UB.i18n('Рівень володіння') },
            { name: 'docNumber' },
            { name: 'docSeries' },
            { name: 'docIssuer' },
            { name: 'dateIssue' }
          ],
          entityName: 'hr_employeeLanguage',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_employeeEducation: {
      title: UB.i18n('Освіта'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictEducationLevelID.nominalName', description: UB.i18n('Рівень освіти') },
            { name: 'dictAreasOfEduID.name', description: UB.i18n('Напрям освіти') },
            { name: 'educationName' },
            { name: 'dateFrom' },
            { name: 'dateTo' },
            { name: 'educationForm' },
            { name: 'dictSpecialtyID.name', description: UB.i18n('Спеціальність') },
            { name: 'qualification' },
            { name: 'dictDegreeID.name', description: UB.i18n('Науковий ступінь') },
            { name: 'docNumber' },
            { name: 'docSeries' },
            { name: 'docIssuer' },
            { name: 'dateIssue' }
          ],
          entityName: 'hr_employeeEducation',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_request: {
      title: UB.i18n('Заяви'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_request',
          fieldList: [
            { name: 'requestType' },
            { name: 'mi_createDate', description: UB.i18n('Дата створення') },
            { name: 'requestState' }
          ],
          whereList: {
            employeeNumberID: {
              expression: '[employeeNumberID]',
              condition: 'equal',
              value: employeeNumberID
            },
            requestState: {
              expression: '[requestState]',
              condition: 'notIn',
              values: { value: ['NEW'] }
            }
          },
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeNumberID'],
          detailFields: ['employeeNumberID'],
          cmpInitConfig: {
            hideActions: ['edit', 'addNewByCurrent', 'del', 'addNew'],
            hideMenuAllActions: true,
            toolbarActionList: ['refresh'],
            afterInit: function () {
              let req = this.store.ubRequest
            },
            openForm: function () {},
            onItemDblClick: function (grid, record) {
              let ubdetailgrid = grid.up('ubdetailgrid')
              if (AC.entityUtils.verifyRightsMethod('hr_request', 'showFromEmployeeTabs')) {
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_request',
                  entity: 'hr_request',
                  tabId: 'hr_request' + record.get('ID'),
                  target: $App.getViewport().centralPanel,
                  sender: ubdetailgrid.getView(),
                  store: ubdetailgrid.store,
                  instanceID: record.get('ID'),
                  cmpInitConfig: {
                    employeeNumberID: record.get('ID')
                  }
                })
              }
            }
          }
        })
      ]
    },
    hr_employeeBenefits: {
      title: UB.i18n('Право на пільги'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictBenefitsKindID.name', description: UB.i18n('Вид пільги') },
            { name: 'dateFrom', description: UB.i18n('Дата початку') },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення') },
            { name: 'employeeFamilyID.peopleID.shortFIO', description: UB.i18n('Людина, на догляд за якою надається пільга') },
            { name: 'comment', description: UB.i18n('Примітки') },
            { name: 'dictBenefitsKindID.dictVacationKindID.description', description: UB.i18n('Вид відпустки') }
          ],
          orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } },
          entityName: 'hr_employeeBenefits',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              this.employeeNumberID = employeeNumberID
            }
          }

        })
      ]
    },
    hr_employeeTrialPeriod: {
      title: UB.i18n('Випробувальний термін'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeTrialPeriod',
          fieldList: [
            { name: 'employeePositionID.posName', description: UB.i18n('Посада') },
            { name: 'dateTrialEnd', config: { align: 'center' } },
            { name: 'orderID.description', description: UB.i18n('Наказ') },
            { name: 'dateFrom', config: { align: 'center' } },
            { name: 'dateTo', config: { align: 'center' } }
          ],
          whereList: {},
          orderList: {
            dateFrom: { expression: '[dateFrom]', order: 'desc' }
          },
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del', 'addNew', 'addNewByCurrent'] : [],
            afterInit: function () {
              const req = this.getStore().ubRequest
              if (employeeNumberID) {
                _.merge(req.whereList, {
                  employeeID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    value: employeeNumberID
                  }
                })
              } else {
                _.merge(req.whereList, {
                  employeeID: {
                    expression: '[employeeNumberID]',
                    condition: 'isNull'
                  }
                })
              }
              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeTrialPeriod',
                formCode: 'hr_employeeTrialPeriod',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_empAssessment1: {
      title: UB.i18n('Оцінювання'),
      ubID: 'employeeAssesment1',
      items: [
        AC.gridUtils.getDefaultGridConfig({
          header: false,
          fieldList: [
            { name: 'employeeID', visibility: false },
            { name: 'employeeNumberID', visibility: false },
            { name: 'assessmentType' },
            { name: 'assessmentTaskType' },
            { name: 'periodTypeID.name', description: UB.i18n('Період') },
            { name: 'year', format: '0', config: { align: 'center' } },
            { name: 'assessmentValue' },
            { name: 'avgValue' },
            { name: 'agreementState' },
            { name: 'organizationID.name', description: UB.i18n('Організація') },
            { name: 'hasResult', visibility: false },
            { name: 'empAssessmentResultID', visibility: false }
          ],
          whereList: {
            orgDateFrom: {
              expression: '[organizationID.mi_dateFrom]',
              condition: 'lessEqual',
              value: appAC.globalApplicationDate()
            },
            orgDateTo: {
              expression: '[organizationID.mi_dateTo]',
              condition: 'moreEqual',
              value: appAC.globalApplicationDate()
            },
            orgState: {
              expression: '[organizationID.state]',
              condition: 'equal',
              value: 'ACTIVE'
            },
            orgDel: {
              expression: '[organizationID.mi_deleteDate]',
              condition: 'equal',
              value: '#maxdate'
            }
          },
          entityName: 'hr_empAssessment',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            customInit: function () {
              const me = this
              AC.gridUtils.tuneGridColumns(me, {
                avgValue: {
                  renderer: function (value) {
                    if (!value) return
                    return value.toFixed(2)
                  }
                }
              })
            },
            afterInit: function () {
              const grid = this
              this.readOnly = form.readOnly
              const actCol = Ext.create('Ext.grid.column.Column', {
                xtype: 'actioncolumn',
                text: '',
                width: 40,
                align: 'center',
                filterable: false,
                sortable: false,
                renderer: function (value, meta, record) {
                  if (record.get('hasResult') > 0) {
                    const id = Ext.id()
                    Ext.defer(function () {
                      Ext.widget('button', {
                        renderTo: Ext.query('#' + id)[0],
                        tooltip: UB.i18n('Переглянути висновок'),
                        scale: 'small',
                        margin: '0 0 0 0',
                        iconCls: 'fas fa-file-invoice',
                        cls: 'blue-action',
                        handler: function (btn) {
                          const empAssessmentResultID = record.get('empAssessmentResultID')
                          $App.doCommand({
                            cmdType: 'showForm',
                            entity: 'hr_empAssessmentResult',
                            formCode: 'hr_empAssessmentResult',
                            instanceID: empAssessmentResultID,
                            tabId: 'hr_empAssessmentResult' + empAssessmentResultID,
                            target: $App.getViewport().centralPanel,
                            title: UB.i18n(`Результат виконання завдань`)
                          })
                        }
                      })
                    }, 50)
                    return Ext.String.format('<div id="{0}"></div>', id)
                  }
                }
              })
              grid.headerCt.insert(0, actCol)
              grid.columns.unshift(actCol)
            },
            getRowClass: (data) => {
              switch (data.get('assessmentValue')) {
                case 'PERFECT': return 'ub-row-green'
                case 'POSITIVE': return 'ub-row-yellow'
                case 'NEGATIVE': return 'ub-row-red'
                default: return 'ub-row-lightgrey'
              }
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empAssessment',
                formCode: 'hr_empAssessment',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: form.employeeNumberID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeExperience: {
      title: UB.i18n('Стаж роботи'),
      layout: { type: 'vbox', align: 'stretch' },
      items: [
        {
          flex: 1,
          xtype: 'experienceControl',
          readOnly: form.readOnly,
          employeeNumberID: employeeNumberID,
          clearEmployeeNumber: true
        }
      ]
    },
    hr_employeeExperienceFix: {
      title: UB.i18n('Архів розрахунків'),
      name: 'expFixForm',
      layout: { type: 'border' },
      items: [
        {
          xtype: 'acGrid',
          name: 'expFixGrid',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employee_expFixGrid'),
          region: 'center',
          entity: 'hr_employeeExperienceFix',
          flex: 1,
          hideActions: ['del', 'addNew'],
          storeType: 'ub',
          storeAutoLoad: true,
          disablePaging: true,
          onSaveEditData: true,
          showToolBar: true,
          multilineRows: true,
          enableExpandableRows: true,
          ubStoreConfig: {
            entity: 'hr_employeeExperienceFix',
            method: 'select',
            fieldList: ['ID', 'employeeID', 'dateFixExperience', 'orderFixExperienceDate', 'orderFixExperienceNum', 'descriptionExperience', 'expData'],
            whereList: {
              employeeID: {
                expression: '[employeeID]',
                condition: 'equal',
                value: form.instanceID
              }
            },
            orderList: {
              orderBy: { expression: 'dateFixExperience', order: 'desc' }
            }
          },
          expandedRowConfig: {
            onExpandBody: async function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.addRowCls(record.index, 'grd-bold')
              const data = JSON.parse(record.get('descriptionExperience'))
              const expData = await UB.Repository('hr_employeeExperience')
                .attrs(['ID', 'dictExperienceID', 'calcDate'])
                .where('employeeID', '=', form.instanceID || null)
                .where('employeeNumberID', 'isNull')
                .selectAsObject()

              record.periods = data
              let detail = ` <style type="text/css">.table { width: 100%; padding:10px;} #td { text-indent: 20px} .span { color: #104ab9} .span.alert { color: #cc3333;} </style>
                <td class="x-grid-cell-rowbody" colspan="10"><div class="x-grid-rowbody">
                <div style="width: 100%"><TABLE>
                `
              data.forEach(item => {
                const exp = expData.find(o => o.dictExperienceID === item.ID)
                const rowclass = exp ? '' : 'alert'
                const dateclass = exp && AC.dateService.formatDate(exp.calcDate, 'YYYYMMDD') !== AC.dateService.formatDate(item.calcDate, 'YYYYMMDD') ? 'alert' : ''
                detail += `<TR>
                  <TD style="width:400px; font-weight: normal;"><span class = "span ${rowclass}">${item.name}</span></TD>
                  <TD style="width:300px; font-weight: normal;">${UB.i18n('Приведена дата')} <span class = "span ${dateclass}">${AC.dateService.formatDate(item.calcDate)}</span></TD>
                  <TD style="width:150px; font-weight: normal;">${UB.i18n('Років')}: <span class = "span">${item.years}</span></TD>
                  <TD style="width:150px; font-weight: normal;">${UB.i18n('Міс.')}: <span class = "span">${item.months}</span></TD>
                  <TD style="width:150px; font-weight: normal;">${UB.i18n('Днів')}: <span class = "span">${item.days}</span></TD>
                  </TR>`
              })
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
            { name: 'employeeID' },
            { name: 'expOnDate',
              columnConfig: { text: UB.i18n('Станом на'),
                width: 100,
                dataType: 'Date',
                dateFormat: 'd.m.Y',
                align: 'center'
              } },
            { name: 'dateFixExperience',
              columnConfig: { text: UB.i18n('Дата/час фіксації'),
                width: 150,
                dataType: 'Date',
                dateFormat: 'd.m.Y H:i',
                align: 'center'
              } },
            { name: 'comment', columnConfig: { text: UB.i18n('Коментар'), width: 250 } },
            { name: 'reasonDoc', columnConfig: { text: UB.i18n('Підстава'), width: 250 } },
            { name: 'respEmployeeNumID.description', columnConfig: { text: UB.i18n('Зафіксував'), width: 250 } },
            { name: 'organizationName', columnConfig: { text: UB.i18n('Організація'), width: 250 } },
            { name: 'descriptionExperience', visibility: false },
            { name: 'ID', visibility: false }
          ],
          onItemDoubleClick: function (gridview, record) {
            if (record.get('ID')) {
              $App.doCommand({
                cmdType: 'showForm',
                entity: 'hr_employeeExperienceFix',
                isModal: true,
                instanceID: record.get('ID'),
                sender: gridview.up('[name=expFixGrid]')
              })
            }
          },
          onAfterRender: function (grid) {
            HR.controlService.acGridDelAutoCommit(grid)
          },
          customToolBarActions: [
            {
              tooltip: UB.i18n('Оновити'),
              scale: 'medium',
              iconCls: 'u-icon-refresh',
              handler: function (btn) {
                const grid = btn.up('[name=expFixGrid]')
                const expFeature = grid.getView().features.find(f => f.recordsExpanded)
                if (expFeature) {
                  for (const ID in expFeature.recordsExpanded) {
                    if (expFeature.recordsExpanded.hasOwnProperty(ID)) {
                      expFeature.recordsExpanded[ID] = false
                    }
                  }
                }
                grid.loadData()
              }
            },
            {
              scale: 'medium',
              iconCls: 'fas fa-file-excel',
              tooltip: UB.i18n('Сформувати'),
              cls: 'green-action',
              handler: function (btn) {
                function repo ({ title, fName, data }) {
                  function setStyles () {
                    defFont = stl.fonts.add({
                      code: 'def',
                      name: 'Calibri',
                      fontSize: 11,
                      scheme: 'minor'
                    })
                    stl.fonts.add({
                      code: 'defBold',
                      name: 'Calibri',
                      fontSize: 11,
                      scheme: 'minor',
                      bold: true
                    })

                    borderFull = stl.borders.add({
                      left: {
                        style: 'thin'
                      },
                      right: {
                        style: 'thin'
                      },
                      top: {
                        style: 'thin'
                      },
                      bottom: {
                        style: 'thin'
                      }
                    })
                    stl.alignments.add({
                      code: 'Hright',
                      horizontal: 'right'
                    })
                    stl.alignments.add({
                      code: 'Hcenter',
                      horizontal: 'center',
                      wrapText: '1'
                    })
                    stl.alignments.add({
                      code: 'HVcenter',
                      horizontal: 'center',
                      vertical: 'center',
                      wrapText: '1'
                    })
                    stl.alignments.add({
                      code: 'wrapText',
                      wrapText: '1'
                    })
                    styleCol = stl.getStyle({
                      font: defFont
                    })
                    headerStyle = stl.getStyle({
                      font: stl.fonts.named.defBold,
                      alignment: stl.alignments.named.HVcenter
                    })
                    rowHeaderStyle = stl.getStyle({
                      font: stl.fonts.named.defBold,
                      fill: 'EBEDED',
                      border: borderFull,
                      alignment: stl.alignments.named.HVcenter
                    })
                  }
                  let
                    wb, defFont, ws, borderFull, headerStyle, rowHeaderStyle, stl, styleCol
                  if (!Ext.ux.exporter.xlsxFormatter.XlsxFormatter.libsLoaded) {
                    SystemJS.import('@unitybase/xlsx/dist/xlsx-all.min.js').then((injectedXLSX) => {
                      window.XLSX = injectedXLSX
                      Ext.ux.exporter.xlsxFormatter.XlsxFormatter.libsLoaded = true
                      repo(arguments[0])
                    })
                    return
                  }
                  wb = new window.XLSX.XLSXWorkbook()
                  wb.useSharedString = true
                  stl = wb.style
                  setStyles()
                  ws = wb.addWorkSheet({ caption: UB.i18n('Зафіксований стаж'), name: UB.i18n('Зафіксований стаж') })
                  ws.addMerge({ colFrom: 1, colTo: 9 })
                  ws.addRow({ value: title, column: 1, style: headerStyle }, {}, { height: 40 })
                  ws.setColsProperties([
                    { column: 1, width: 20 },
                    { column: 2, width: 20 },
                    { column: 3, width: 40 },
                    { column: 4, width: 40 },
                    { column: 5, width: 20 },
                    { column: 6, width: 10 },
                    { column: 7, width: 10 },
                    { column: 8, width: 10 },
                    { column: 9, width: 40 }
                  ])
                  ws.addRow([
                    { column: 1, value: UB.i18n('Дата фіксації стажу'), style: rowHeaderStyle },
                    { column: 2, value: UB.i18n('На дату'), style: rowHeaderStyle },
                    { column: 3, value: UB.i18n('Документ підстава'), style: rowHeaderStyle },
                    { column: 4, value: UB.i18n('Вид стажу'), style: rowHeaderStyle },
                    { column: 5, value: UB.i18n('Приведена дата'), style: rowHeaderStyle },
                    { column: 6, value: UB.i18n('Років'), style: rowHeaderStyle },
                    { column: 7, value: UB.i18n('Місяців'), style: rowHeaderStyle },
                    { column: 8, value: UB.i18n('Днів'), style: rowHeaderStyle },
                    { column: 9, value: UB.i18n('Організація'), style: rowHeaderStyle }
                  ], null, { height: 30 })
                  data.forEach((fix, idx) => {
                    fix.expData.forEach((item, idx) => {
                      ws.addRow([
                        { column: 1, value: moment(fix.dateFixExperience).format('DD.MM.YYYY'), style: styleCol },
                        { column: 2, value: moment(fix.expOnDate).format('DD.MM.YYYY'), style: styleCol },
                        { column: 3, value: fix.reasonDoc, style: styleCol },
                        { column: 4, value: item.name, style: styleCol },
                        { column: 5, value: `${moment(item.calcDate).format('DD.MM.YYYY')}`, style: styleCol },
                        { column: 6, value: item.years, style: styleCol },
                        { column: 7, value: item.months, style: styleCol },
                        { column: 8, value: item.days, style: styleCol },
                        { column: 9, value: fix.organizationName, style: styleCol }
                      ], null, { height: 20 })
                    })
                    if (idx !== data.length - 1) {
                      ws.addMerge({ colFrom: 1, colTo: 9 })
                      ws.addRow([{ column: 1, value: '', style: styleCol }])
                    }
                  })
                  const rData = wb.render()
                  const dBlob = new Blob([rData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) // data:  ;base64
                  saveAs(dBlob, fName + '.xlsx')
                }
                const me = btn.up('form')
                UB.Repository('hr_employeeExperienceFix').attrs('dateFixExperience', 'expOnDate', 'orderFixExperienceDate', 'reasonDoc', 'descriptionExperience', 'organizationName', 'employeeID.fullFIO')
                  .where('employeeID', '=', me.instanceID)
                  .where('organizationID', '=', appAC.globalOrganization())
                  .orderBy('dateFixExperience')
                  .orderBy('expOnDate')
                  .selectAsObject()
                  .then(data => {
                    data.forEach(item => {
                      item.expData = JSON.parse(item.descriptionExperience)
                      delete item.descriptionExperience
                    })
                    if (data.length) {
                      repo({ title: `${UB.i18n('Зафіксований стаж')} ${data[0]['employeeID.fullFIO']} ${moment(new Date()).format('DD.MM.YYYY')}`, fName: UB.i18n('Зафіксований стаж'), data: data })
                    }
                  })
              }
            },
            {
              tooltip: UB.i18n('Відновити стаж зі збереженого'),
              iconCls: 'u-icon-redo',
              cls: 'blue-action',
              handler: function (btn) {
                const grid = btn.up('[name=expFixGrid]')
                const record = AC.gridUtils.getCurrentRecord(grid)
                if (record) {
                  return $App.dialogYesNo('Попередження', UB.i18n(`Вказана на вкладинці "Стаж роботи" інформація буде замінена зафіксованими даними. Продовжити?`))
                    .then(isAgree => {
                      if (isAgree) {
                        const me = grid.up('form')
                        me.setLoading(UB.i18n('Відновлення...'))
                        $App.connection.run({
                          entity: 'hr_employeeExperienceFix',
                          method: 'restoreFromFix',
                          ID: record.get('ID')
                        }).then(mParams => {
                          grid.up('form').setLoading(false)
                          me.down('[xtype=experienceControl]').loadEmployeeExperience()
                        })
                      }
                    })
                }
              }
            }
          ]
        }
      ]
    },
    hr_employeeExperienceCont: {
      title: UB.i18n('Неперервний стаж за трудовою книжкою'),
      items: [
        {
          xtype: 'experienceTotalControl'
        }
      ]
    },
    hr_employeePosition: {
      title: UB.i18n('Історія змін'),
      items: [
        {
          xtype: 'label',
          margin: '2 15 1 15',
          text: UB.i18n('Відсутній доступ для перегляду інформації'),
          hidden: !(form.limitedAccess && limitedAccess),
          style: {
            color: 'red'
          }
        },
        {
          xtype: 'acGrid',
          name: 'gridEmpPosition',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employee_gridEmpPosition'),
          flex: 1,
          region: 'center',
          autoScroll: true,
          storeType: 'ub',
          disablePaging: true,
          entity: 'hr_employeePositionS',
          formCode: 'hr_employeePosition',
          storeAutoLoad: true,
          onSaveEditData: true,
          showToolBar: true,
          multilineRows: true,
          readOnly: form.readOnly,
          hideActions: ['addNew', 'addNewByCurrent', 'del'],
          ubStoreConfig: {
            entity: 'hr_employeePositionSR',
            method: 'select',
            fieldList: ['ID', 'dateFrom', 'dateTo', 'orderID.orderNumber', 'orderID.orderDate', 'workerType', 'depNameActual', 'posNameActual', 'factPosition',
              'workScheduleID.name', 'payElID.name', 'mtCount', 'accrualSum', 'raiseSalary', 'isIndex', 'dictStaffCatID.name',
              'workPlace', 'dictFundSourceID.name', 'dictCategoryECBID.name', 'accountID.code', 'fundSourceNames'
            ],
            whereList: {
              employeeNumberID: {
                expression: '[employeeNumberID]',
                condition: 'equal',
                value: employeeNumberID
              }
            },
            orderList: { orderBy: { expression: 'dateFrom' } }
          },
          customContextActions: [
            {
              text: UB.i18n('Видалити'),
              scale: 'medium',
              iconCls: 'u-icon-delete',
              hidden: !AC.entityUtils.verifyRightsMethod('hr_employeePosition', 'canDelete'),
              handler: function (btn) {
                const grid = btn.up().grid
                let reco = AC.gridUtils.getCurrentRecord(grid)
                if (reco && reco.get('ID')) {
                  if (AC.entityUtils.verifyRightsMethod('hr_employeePosition', 'canDelete')) {
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
                const grid = me.down('[name=gridEmpPosition]')
                grid.getStore().load()
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
              const workerTypeObj = UB.core.UBEnumManager.getStore('HR_WORKER_TYPE').getById(record.get('workerType'))
              const workPlaceObj = UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').getById(record.get('workPlace'))
              const prior = data.sort((a, b) => ((new Date(b.dateFrom)).getTime() - ((new Date(a.dateFrom)).getTime())))
                .find(o => (new Date(o.dateTo)) < new Date(record.get('dateFrom'))) || {}
              const depName = `${record.get('depNameActual') !== prior.depNameActual ? '<b>' : ''}${record.get('depNameActual') || ''}${record.get('depNameActual') !== prior.depNameActual ? '</b>' : ''}`
              const posName = `${record.get('posNameActual') !== prior.posNameActual ? '<b>' : ''}${record.get('posNameActual') || ''}${record.get('posNameActual') !== prior.posNameActual ? '</b>' : ''}`
              const workSchedule = `${record.get('workScheduleID.name') !== prior['workScheduleID.name'] ? '<b>' : ''}${record.get('workScheduleID.name') || ''}${record.get('workScheduleID.name') !== prior['workScheduleID.name'] ? '</b>' : ''}`
              const payEl = `${record.get('payElID.name') !== prior['payElID.name'] ? '<b>' : ''}${record.get('payElID.name') || ''}${record.get('payElID.name') !== prior['payElID.name'] ? '</b>' : ''}`
              const dictStaffCat = `${record.get('dictStaffCatID.name') !== prior['dictStaffCatID.name'] ? '<b>' : ''}${record.get('dictStaffCatID.name') || ''}${record.get('dictStaffCatID.name') !== prior['dictStaffCatID.name'] ? '</b>' : ''}`
              const accrualSum = `${record.get('accrualSum') !== prior.accrualSum ? '<b>' : ''}${AC.currencyService.formatAsCurrency(notShowSalary ? 0 : record.get('accrualSum'))}${record.get('accrualSum') !== prior.accrualSum ? '</b>' : ''}`
              const workerType = `${record.get('workerType') !== prior.workerType ? '<b>' : ''}${workerTypeObj ? workerTypeObj.get('name') : ''}${record.get('workerType') !== prior.workerType ? '</b>' : ''}`
              const mtCount = `${record.get('mtCount') !== prior.mtCount ? '<b>' : ''}${record.get('mtCount') || ''}${record.get('mtCount') !== prior.mtCount ? '</b>' : ''}`
              const workPlace = `${record.get('workPlace') !== prior.workPlace ? '<b>' : ''}${workPlaceObj ? workPlaceObj.get('name') : ''}${record.get('workPlace') !== prior.workPlace ? '</b>' : ''}`

              const fundSource = record.get('fundSourceNames') || []
              let fundSourceName = fundSource.map(row => `${row.name} ${row.mtCount}`).join(', ')
              let priorFundSourceName = ''
              if (prior) {
                const priorFundSource = prior.fundSourceNames || []
                priorFundSourceName = priorFundSource.map(row => `${row.name} ${row.mtCount}`).join(', ')
              }

              const dictFundSource = `${fundSourceName !== priorFundSourceName ? '<b>' : ''}${fundSourceName}${fundSourceName !== priorFundSourceName ? '</b>' : ''}`
              const dictCategoryECB = `${record.get('dictCategoryECBID.name') !== prior['dictCategoryECBID.name'] ? '<b>' : ''}${record.get('dictCategoryECBID.name') || ''}${record.get('dictCategoryECBID.name') !== prior['dictCategoryECBID.name'] ? '</b>' : ''}`
              const account = `${record.get('accountID.code') !== prior['accountID.code'] ? '<b>' : ''}${record.get('accountID.code') || ''}${record.get('accountID.code') !== prior['accountID.code'] ? '</b>' : ''}`

              let detail = ` <style type="text/css">.table { width: 100%; padding:10px;} #td { text-indent: 20px} .span { color: #104ab9} </style>
            <td class="x-grid-cell-rowbody" colspan="10"><div class="x-grid-rowbody ">
            <div style="width: 100%"><TABLE style="width:100%">
            <TR><TD style="width:19%; font-weight: normal;">${UB.i18n('Підрозділ')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${depName}</span></TD>
            <TD style="width:2%"></TD>
            <TD style="width:19%; font-weight: normal;">${UB.i18n('Графік роботи')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${workSchedule}</span></TD></TR>
            <TR><TD style="width:19%; font-weight: normal;">${UB.i18n('Посада')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${posName}</span></TD>
            <TD style="width:2%"></TD>
            <TD style="width:19%; font-weight: normal;">${UB.i18n('Система оплати')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${payEl}</span></TD></TR>
            <TR><TD style="width:19%; font-weight: normal;">${UB.i18n('Категорія персоналу')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${dictStaffCat}</span></TD>
            <TD style="width:2%"></TD>
            <TD style="width:19%; font-weight: normal;">${UB.i18n('Оклад')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${accrualSum}</span></TD></TR>
            
            <TR><TD style="width:19%; font-weight: normal;">${UB.i18n('Місце роботи')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${workPlace}</span></TD>
            <TD style="width:2%"></TD>
            <TD style="width:19%; font-weight: normal;">${UB.i18n('Кількість ставок')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${mtCount}</span></TD></TR>
            
            <TR><TD style="width:19%; font-weight: normal;">${UB.i18n('Вид зайнятості')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${workerType}</span></TD>
            <TD style="width:2%"></TD>
            <TD style="width:19%; font-weight: normal;">${UB.i18n('Джерело фінансування')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${dictFundSource}</span></TD></TR>
            
            <TR><TD style="width:19%; font-weight: normal;">${UB.i18n('Категорія застр. особи')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${dictCategoryECB}</span></TD>
            <TD style="width:2%"></TD>
            <TD style="width:19%; font-weight: normal;">${UB.i18n('Рахунок витрат')}</TD>
            <TD style="width:30%; font-weight: normal;"><span class = "span">${account}</span></TD></TR>
`
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
              name: 'depNameActual',
              columnConfig: {
                text: UB.i18n('Підрозділ'),
                width: 150
              }
            },
            {
              name: 'posNameActual',
              columnConfig: {
                text: UB.i18n('Посада'),
                flex: 1
              }
            },
            Object.assign({ name: 'factPosition' }, AC.settings.get('hrOrderActualPositionName', appAC.globalOrganization()) ? {
              columnConfig: {
                text: UB.i18n('Фактична посада'),
                flex: 1
              }
            } : {}),
            {
              name: 'accrualSum',
              columnConfig: {
                text: UB.i18n('Оклад'),
                width: 150,
                renderer: function (value) {
                  if (_.isNumber(value)) {
                    return Ext.util.Format.currency(AC.currencyService.round(notShowSalary ? 0 : value, 2), '', 2)
                  } else return notShowSalary ? 0 : value
                }
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
            { name: 'mtCount' },
            { name: 'raiseSalary' },
            { name: 'isIndex' },
            { name: 'workPlace' },
            { name: 'fundSourceNames' },
            { name: 'accountID.code' },
            { name: 'dictCategoryECBID.name' }
          ],
          pagerConfig: { pageSize: 1000 },
          enableExpandableRows: true,
          afterInit: function (grid) {
            if (employeeNumberID) {
              AC.viewUtils.setWhereListProperty(grid, [['employeeNumberID', 'equal', employeeNumberID]], null, [])
            }
            grid.readOnly = form.readOnly
          },
          onDeterminateForm: function () {
            return {
              entityName: 'hr_employeePosition',
              formCode: 'hr_employeePosition'
            }
          }
        }
      ]
    },
    hr_employeePositionOrder: {
      title: UB.i18n('Призначення / Переведення'),
      items: [
        {
          xtype: 'label',
          margin: '2 15 1 15',
          text: UB.i18n('Відсутній доступ для перегляду інформації'),
          hidden: !(form.limitedAccess && limitedAccess),
          style: {
            color: 'red'
          }
        },
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { align: 'center' } },
            { name: 'dateFrom', config: { align: 'center' } },
            // { name: 'dateToEmpty', config: { align: 'center' } },
            { name: 'orderID.empOrderType', description: UB.i18n('Тип наказу') },
            { name: 'depName', description: UB.i18n('Підрозділ') },
            { name: 'posName', description: UB.i18n('Посада') },
            { name: 'dictRankID.description', description: UB.i18n('Ранг') },
            { name: 'dictTrialPeriodID.name', description: UB.i18n('Випробувальний строк') },
            { name: 'workPlace' },
            { name: 'workScheduleID.name', description: UB.i18n('Графік роботи') },
            { name: 'workerType' },
            { name: 'contractType' },
            { name: 'mtCount', config: { align: 'center' }, format: '0.00' },
            { name: 'dictContractKindID.name', description: UB.i18n('Вид договору') },
            { name: 'dictTarifCoeffID.name', description: UB.i18n('Тарифний розряд') },
            { name: 'orderID.orderClass.entityName', visibility: false },
            { name: 'isResponsible', config: { align: 'center' } },
            { name: 'orderID', visibility: false },
            { name: 'paraID', visibility: false },
            { name: 'paraID.mi_unityEntity', visibility: false }
          ],
          entityName: 'hr_employeePositionSR',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            orderType: {
              expression: '[orderID.empOrderType]',
              condition: 'in',
              value: ['APPOINT', 'MOVE', 'APPOINT_LIQ', 'APPOINT_MOVE', 'CANCELDISM', 'PLURALIST', 'VACATIONPROLONG']
            },
            notCWS: {
              expression: `[paraID.mi_unityEntity]`,
              condition: 'notEqual',
              value: 'hr_empOrderCwsDet'
            },
            paraIsNull: {
              expression: `[paraID]`,
              condition: 'isNull'
            }
          },
          logicalPredicates: ['([notCWS] OR [paraIsNull])'],
          orderList: {
            tabNum: { expression: '[employeeNumberID.tabNum]' },
            dateFrom: { expression: '[dateFrom]' }
          },
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del', 'addNew'],
            onItemDblClick: function (grid, record) {
              const paraID = record.get('paraID')
              if (paraID) {
                // const empOrderType = record.get('orderID.empOrderType')
                const entityName = record.get('paraID.mi_unityEntity')// HR.orderManager.getDetailEntityName(empOrderType)
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: entityName,
                  entityName: entityName,
                  entity: entityName,
                  isModal: true,
                  instanceID: paraID,
                  sender: grid
                })
              } else {
                AC.viewUtils.showToast(UB.i18n('Через те, що дані були мігровані з іншої системи – накази відсутні'))
              }
            },
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                req.whereList.employeeNumberID = {
                  expression: '[employeeNumberID]',
                  condition: 'equal',
                  value: employeeNumberID
                }
              }
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_employeePositionStaffTable: {
      title: UB.i18n('Зміна окладів'),
      items: [
        {
          xtype: 'label',
          margin: '2 15 1 15',
          text: UB.i18n('Відсутній доступ для перегляду інформації'),
          hidden: !(form.limitedAccess && limitedAccess),
          style: {
            color: 'red'
          }
        },
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orderID.orderClass.entityName', visibility: false },
            { name: 'orderID.empOrderType', visibility: false },
            { name: 'orderID', visibility: false },
            { name: 'employeeNumberID.limitedAccess', visibility: false },
            { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { align: 'center' } },
            { name: 'dateFrom', config: { align: 'center' } },
            { name: 'dateToEmpty', config: { align: 'center' } },
            { name: 'accrualSum', description: UB.i18n('Оклад'), config: { align: 'right' } },
            { name: 'depName', description: UB.i18n('Підрозділ') },
            { name: 'posName', description: UB.i18n('Посада') }
          ],
          entityName: 'hr_employeePositionSR',
          ubID: 'hr_employeePositionStaffTable',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            orderType: {
              expression: '[orderID.empOrderType]',
              condition: 'in',
              value: ['STAFFTABLE', 'CERTIFICATION', 'CHGSALARY']
            },
            orderDate: {
              expression: '[orderID.entryDate] >= [dateFrom]',
              condition: 'custom'
            }
          },
          orderList: {
            tabNum: { expression: '[employeeNumberID.tabNum]' },
            dateFrom: { expression: '[dateFrom]' }
          },
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del', 'addNew', 'edit'],
            onItemDblClick: function (grid, record) {
            },
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                req.whereList.employeeNumberID = {
                  expression: '[employeeNumberID]',
                  condition: 'equal',
                  value: employeeNumberID
                }
              }
              if (notShowSalary) {
                const renderer = {
                  accrualSum: {
                    renderer: function (value, meta, record) {
                      return notShowSalary ? 0 : (record.get ? record.get('employeeNumberID.limitedAccess') : record[3]) ? 0 : value
                    }
                  }
                }
                AC.gridUtils.tuneGridColumns(this, renderer)
              }
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_empOrder: {
      title: UB.i18n('Накази'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orderID.description', description: UB.i18n('Наказ') },
            { name: 'orderID.orderDate', format: 'd.m.Y', description: UB.i18n('Дата наказу') },
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
                    if (store.ubRequest.whereList.employeeNumberID.value === employeeNumberID) {
                      delete store.ubRequest.whereList.employeeNumberID
                      store.load()
                    }
                  } else {
                    const req = store.ubRequest
                    req.whereList.employeeNumberID = {
                      expression: '[employeeNumberID]',
                      condition: 'equal',
                      value: employeeNumberID
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
              if (employeeNumberID) {
                const req = grid.getStore().ubRequest
                req.whereList.employeeNumberID = {
                  expression: '[employeeNumberID]',
                  condition: 'equal',
                  value: employeeNumberID
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
            }/*,
            onDeterminateForm: function (grid) {
              let reco = AC.gridUtils.getCurrentRecord(grid)
              return {
                entityName: reco.get('orderID.orderClass.entityName')
              }
            } */
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
            { name: 'orderNumber', visibility: false },
            { name: 'orderID', visibility: false },
            { name: 'description', config: { align: 'center' }, description: UB.i18n('Опис') }

          ],
          whereList: {},
          masterEntityName: 'hr_employee',
          orderList: {
            dateFrom: { expression: '[dateFromTo]', order: 'desc' }
          },
          masterFields: ['ID'],
          detailFields: ['employeeID'],
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
              if (employeeNumberID) {
                const req = grid.getStore().ubRequest
                req.whereList = {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                }
              }
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
              this.menu.add([{
                xtype: 'menuseparator'
              },
              {
                text: UB.i18n('Перейти до наказу'),
                iconCls: 'fas fa-file-alt',
                handler: () => {
                  const reco = AC.gridUtils.getCurrentRecord(this)
                  if (reco && reco.get('orderID')) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entityName: 'hr_empOrder',
                      entity: 'hr_empOrder',
                      isModal: true,
                      instanceID: reco.get('orderID')
                    })
                  }
                }
              }])
            }
          }
        })
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
          whereList: {},
          masterEntityName: 'hr_employee',
          orderList: {
            dateFrom: { expression: '[dateFrom]', order: 'desc' }
          },
          masterFields: ['ID'],
          detailFields: ['employeeNumberID.employeeID'],
          cmpInitConfig: {
            hideActions: ['del'],
            afterInit: function () {
              const grid = this
              if (employeeNumberID) {
                const req = grid.getStore().ubRequest
                req.whereList = {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                }
              }
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empLongTermAbsc',
                formCode: 'hr_empLongTermAbsc',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_longTermReplace: {
      title: UB.i18n('Заміщення довготривалої відсутності'),
      items: [
        {
          xtype: 'tabpanel',
          items: [
            AC.gridUtils.getDefaultGridConfig({
              title: UB.i18n('Хто заміщує працівника'),
              entityName: 'hr_longTermReplace',
              fieldList: [
                { name: 'employeeNumberReplID.tabNum', description: UB.i18n('Таб №'), simpleFilter: true },
                { name: 'employeeNumberReplID.employeeID.fullFIO', description: UB.i18n('ПІБ'), simpleFilter: true },
                { name: 'dateFrom', config: { align: 'center' } },
                { name: 'createOrderCaption', description: UB.i18n('За наказом'), simpleFilter: true },
                { name: 'dateToEmpty', config: { align: 'center' } },
                { name: 'changeOrderCaption', description: UB.i18n('За наказом'), simpleFilter: true },
                { name: 'employeeNumberReplID.posName', description: UB.i18n('Посада'), simpleFilter: true }
              ],
              whereList: {},
              masterEntityName: 'hr_employee',
              orderList: {
                dateFrom: { expression: '[dateFrom]', order: 'desc' }
              },
              masterFields: ['ID'],
              detailFields: ['employeeNumberAbsID.employeeID'],
              cmpInitConfig: {
                hideActions: ['del'],
                afterInit: function () {
                  const grid = this
                  if (employeeNumberID) {
                    const req = grid.getStore().ubRequest
                    req.whereList = {
                      employeeNumberID: {
                        expression: '[employeeNumberAbsID]',
                        condition: 'equal',
                        value: employeeNumberID
                      }
                    }
                  }
                },
                onDeterminateForm: function (grid) {
                  return {
                    entityName: 'hr_longTermReplace',
                    formCode: 'hr_longTermReplace',
                    cmpInitConfig: {
                      defaultValues: {
                        employeeNumberAbsID: employeeNumberID
                      }
                    }
                  }
                }
              }
            }),
            AC.gridUtils.getDefaultGridConfig({
              title: UB.i18n('Кого заміщує працівник'),
              entityName: 'hr_longTermReplace',
              fieldList: [
                { name: 'employeeNumberAbsID.tabNum', description: UB.i18n('Таб №'), simpleFilter: true },
                { name: 'employeeNumberAbsID.employeeID.fullFIO', description: UB.i18n('ПІБ'), simpleFilter: true },
                { name: 'dateFrom', config: { align: 'center' } },
                { name: 'createOrderCaption', description: UB.i18n('За наказом'), simpleFilter: true },
                { name: 'dateToEmpty', config: { align: 'center' } },
                { name: 'changeOrderCaption', description: UB.i18n('За наказом'), simpleFilter: true },
                { name: 'employeeNumberAbsID.posName', description: UB.i18n('Посада'), simpleFilter: true }
              ],
              whereList: {},
              masterEntityName: 'hr_employee',
              orderList: {
                dateFrom: { expression: '[dateFrom]', order: 'desc' }
              },
              masterFields: ['ID'],
              detailFields: ['employeeNumberReplID.employeeID'],
              cmpInitConfig: {
                hideActions: ['del'],
                afterInit: function () {
                  const grid = this
                  if (employeeNumberID) {
                    const req = grid.getStore().ubRequest
                    req.whereList = {
                      employeeNumberID: {
                        expression: '[employeeNumberReplID]',
                        condition: 'equal',
                        value: employeeNumberID
                      }
                    }
                  }
                },
                onDeterminateForm: function (grid) {
                  return {
                    entityName: 'hr_longTermReplace',
                    formCode: 'hr_longTermReplace',
                    cmpInitConfig: {
                      defaultValues: {
                        employeeNumberReplID: employeeNumberID
                      }
                    }
                  }
                }
              }
            })
          ]
        }
      ]
    },
    hr_empOrderSickness: {
      title: UB.i18n('Лікарняні'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_empOrderSickness',
          fieldList: [
            { name: 'serie' },
            { name: 'number' },
            { name: 'orderDate', description: UB.i18n('Дата видачі'), config: { align: 'center' } },
            { name: 'dateFrom', config: { align: 'center' } },
            { name: 'dateTo', config: { align: 'center' } },
            { name: 'parentID.description', description: UB.i18n('Попередній лист') },
            { name: 'illnessReasonID.name', description: UB.i18n('Причина непрацездатності') },
            { name: 'employeeFamilyID.employeeID.shortFIO', description: UB.i18n('Догляд за') },
            { name: 'actNumber', config: { align: 'center' } },
            { name: 'actDate', config: { align: 'center' } },
            { name: 'orderState', config: { align: 'center' } }
          ],
          whereList: {},
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNew', 'addNewByCurrent', 'del', 'postingAction', 'cancelPostingAction', 'calcAction', 'uncalcAction'],
            getRowClass: function (row) {
              switch (row.get('orderState')) {
                case 'POSTED':
                  return 'ub-row-green'
                case 'PROCESSED':
                  return 'ub-row-yellow'
                default:
                  return 'ub-row-lightgrey'
              }
            },
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                })
              }
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_empOrderUni: {
      title: UB.i18n('Інші невиходи'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_empOrderUni',
          fieldList: [
            { name: 'employeeNumberID.tabNum', description: UB.i18n('Табельний номер') },
            { name: 'dictTimeCostID.name', description: UB.i18n('Вид невиходу') },
            { name: 'dateFrom', description: UB.i18n('Дата початку невиходу') },
            { name: 'dateTo', description: UB.i18n('Дата закінчення невиходу') },
            { name: 'periodID', description: UB.i18n('Період розрахунку') },
            { name: 'orderNumber', description: UB.i18n('Номер документа') },
            { name: 'orderDate', description: UB.i18n('Дата документа') },
            { name: 'orderState', description: UB.i18n('Стан') }
          ],
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del'],
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
              this.readOnly = form.readOnly
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
              employeeID: {
                expression: '[employeeID]',
                condition: 'equal',
                value: form.instanceID
              }
            },
            orderList: {
              dictVacationKindID: { expression: 'dictVacationKindID.name' },
              dateFrom: { expression: 'dateFrom', order: 'desc' }
            },
            customParams: {
              onDate: appAC.globalApplicationDate()
            }
          },
          customParams: {
            employeeID: form.instanceID,
            employeeNumberID: employeeNumberID
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
                detail += `<TD style="width:300px;">${UB.i18n('Коментар')}</TD>
                  `
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
                  detail += `<TD style="width:300px;text-align: left;"><span class = "span">${item.comment || ''}</span></TD>
                    `
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
            if (employeeNumberID) {
              AC.viewUtils.setWhereListProperty(grid, [['employeeNumberID', 'equal', employeeNumberID]], null, [])
            }
            grid.readOnly = form.readOnly
          },
          onAfterRender: function (grid) {
            const gridStore = grid.getStore()
            gridStore.on('beforeload', (store, data) => {
              grid.getStore().ubRequest.onDate = appAC.globalApplicationDate()
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
                    employeeNumberID: form.employeeNumberID
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
              hidden: !form.employeeNumberID,
              handler: function (btn) {
                const reportDesc = UB.i18n('Довідка про кількість невикористаних днів відпустки')
                const report = Ext.create('UBS.UBReport', {
                  code: 'hr_empNotUsedVacation',
                  type: 'html',
                  params: {
                    employeeID: form.instanceID,
                    employeeNumberID: form.employeeNumberID,
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
              hidden: !form.employeeNumberID,
              handler: function (btn) {
                const grid = btn.up('[name=gridPlan]')
                const employeeID = form.instanceID
                const employeeNumberID = form.employeeNumberID
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
    hr_empMission: {
      title: UB.i18n('Відрядження'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeMission',
          fieldList: [
            { name: 'countryID.name', description: UB.i18n('Країна') },
            { name: 'destOrganizationName', description: UB.i18n('Організація') },
            { name: 'cityName', description: UB.i18n('Нас. пункт') },
            { name: 'dateFrom', description: UB.i18n('З дати'), config: { align: 'center' } },
            { name: 'dayCount', description: UB.i18n('Днів'), config: { align: 'center' } },
            { name: 'dateTo', description: UB.i18n('По дату'), config: { align: 'center' } },
            { name: 'paraID.title', description: UB.i18n('Посада') },
            { name: 'orderID.orderNumberFull', description: UB.i18n('Номер наказу'), config: { align: 'center' } },
            { name: 'orderID.orderDate', description: UB.i18n('Дата наказу'), config: { align: 'center' } },
            { name: 'reportDate', description: UB.i18n('Дата подачі звіту'), config: { align: 'center' } },
            { name: 'requisites', description: UB.i18n('Реквізити звіту') },
            { name: 'comment', description: UB.i18n('Коментар') },
            { name: 'orderID', visibility: false },
            { name: 'paraID', visibility: false }
          ],
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: [ 'addNew', 'addNewByCurrent', 'del' ],
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                req.whereList.employeeNumberID = {
                  expression: '[employeeNumberID]',
                  condition: 'equal',
                  values: { value: employeeNumberID }
                }
              }
              this.readOnly = form.readOnly
              this.menu.add([{
                xtype: 'menuseparator'
              },
              {
                text: UB.i18n('Перейти до наказу'),
                iconCls: 'fas fa-file-alt',
                handler: () => {
                  const reco = AC.gridUtils.getCurrentRecord(this)
                  if (reco && reco.get('orderID')) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      entityName: 'hr_empOrder',
                      entity: 'hr_empOrder',
                      isModal: true,
                      instanceID: reco.get('orderID')
                    })
                  }
                }
              }])
            }
            /*
            onDeterminateForm: function (grid) {
              throw new UB.UBAbortError()
            }, */

          }
        })
      ]
    },
    hr_accrualBalance: {
      title: UB.i18n('Розрахункова відомість заробітної плати'),
      items: [
        {
          xtype: 'label',
          margin: '2 15 1 15',
          text: UB.i18n('Відсутній доступ для перегляду інформації'),
          hidden: !(form.limitedAccess && limitedAccess) || notShowSalary,
          style: {
            color: 'red'
          }
        },
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_accrualBalance',
          summary: { sumPlus: 'sum', sumMinus: 'sum', sumPay: 'sum' },
          fieldList: [
            { name: 'periodCalcID', visibility: false },
            { name: 'periodCalcID.description', description: UB.i18n('Період') },
            {
              name: 'sumFrom',
              format: '0.00',
              config: { align: 'right' },
              description: UB.i18n('Сальдо вхідне')
            },
            {
              name: 'sumPlus',
              format: '0.00',
              config: { align: 'right' },
              description: UB.i18n('Нараховано')
            },
            {
              name: 'sumMinus',
              format: '0.00',
              config: { align: 'right' },
              description: UB.i18n('Утримано')
            },
            {
              name: 'sumPay',
              format: '0.00',
              config: { align: 'right' },
              description: UB.i18n('Виплачено')
            },
            {
              name: 'sumTo',
              format: '0.00',
              config: { align: 'right' },
              description: UB.i18n('Сальдо вихідне')
            }
          ],
          orderList: { orderBy: { expression: 'periodCalcID.dateFrom', order: 'desc' } },
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNew', 'edit', 'addNewByCurrent', 'del', 'postingAction', 'cancelPostingAction', 'calcAction', 'uncalcAction'],
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                req.whereList = {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                }
              }
              AC.gridUtils.tuneGridColumns(this, {
                sumFrom: {
                  renderer: function (value, meta, record) {
                    if (value < 0) {
                      meta.tdCls = 'grd-color-red'
                    }
                    return value
                  }
                },
                sumTo: {
                  renderer: function (value, meta, record) {
                    if (value < 0) {
                      meta.tdCls = 'grd-color-red'
                    }
                    return value
                  }
                }
              })
              this.readOnly = form.readOnly
            },
            onItemDblClick: function (grid, record) {
              if (this.readOnly) return
              if (grid.readOnly) return
              const gridSelection = grid.getSelectionModel().getSelection()
              if (gridSelection.length) {
                $App.doCommand({
                  cmdType: 'showForm',
                  formCode: 'hr_rl',
                  entity: 'hr_rl',
                  cmpInitConfig: {
                    defaultValues: {
                      employeeID: form.record.get('employeeID'),
                      employeeNumberID: employeeNumberID,
                      periodID: gridSelection[0].get('periodCalcID')
                    }
                  },
                  tabId: `hr_rl${employeeNumberID}`,
                  target: $App.getViewport().centralPanel

                })
              }
            }
          }
        })
      ]
    },
    hr_employeeAccrualPayment: {
      title: UB.i18n('Постійні нарахування'),
      items: [
        {
          xtype: 'label',
          margin: '2 15 1 15',
          text: UB.i18n('Відсутній доступ для перегляду інформації'),
          hidden: !(form.limitedAccess && limitedAccess),
          style: {
            color: 'red'
          }
        },
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_employeeAccrualEdit',
          fieldList: [
            { name: 'ID', visibility: false },
            { name: 'entityName', visibility: false },
            { name: 'payElDescription', description: UB.i18n('Вид нарахування') },
            { name: 'dateFrom', description: UB.i18n('Дата початку дії') },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення дії') },
            { name: 'accrualSum', description: UB.i18n('Сума') },
            { name: 'accrualRate', description: UB.i18n('Відсоток'), format: '0.00' },
            { name: 'orderDescription', description: UB.i18n('Наказ') },
            { name: 'orderID', visibility: false },
            { name: 'dateTo', visibility: false }
          ],
          whereList: {},
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'edit', 'del'],
            customInit: function () {
              AC.gridUtils.tuneGridColumns(this, {
                accrualRate: {
                  renderer: function (value) {
                    return !value ? '' : value.toFixed(2)
                  }
                },
                accrualSum: {
                  renderer: function (value) {
                    return !value ? '' : notShowSalary ? 0 : value.toFixed(2)
                  }
                }
              })
            },
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    value: employeeNumberID
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
              }
              this.readOnly = form.readOnly
            },
            getRowClass: function (record) {
              const me = this.up()
              if (record.get('entityName') === 'hr_employeeAccrual') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                const onDate = me.down('[name=onDate]').getValue()
                if (!(dateFrom <= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()) && dateTo >= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()))) {
                  return 'grd-color-grey'
                }
              } else {
                return 'grd-color-blue'
              }
            },
            onItemDblClick: function (grid, record) {
              const currentRowGrid = grid.store.count() ? grid.getSelectionModel().getSelection()[0] : null
              if (currentRowGrid && currentRowGrid.get('entityName') === 'hr_payPerm') {
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
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeAccrual',
                formCode: 'hr_employeeAccrualEdit',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.record.get('ID')
                  }
                }
              }
            },
            listeners: {
              render: (grid) => {
                grid.menu.removeAll()
                grid.menu.add([HR.employeeTabs.getOrderCardMenu(grid)])
              }
            }
          }
        })
      ]
    },
    hr_payRetention: {
      title: UB.i18n('Постійні утримання'),
      items: [
        {
          xtype: 'label',
          margin: '2 15 1 15',
          text: UB.i18n('Відсутній доступ для перегляду інформації'),
          hidden: !(form.limitedAccess && limitedAccess),
          style: {
            color: 'red'
          }
        },
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_payRetentionEdit',
          fieldList: [
            { name: 'ID', visibility: false },
            { name: 'entityName', visibility: false },
            { name: 'payElDescription', description: UB.i18n('Вид утримання') },
            { name: 'dateFrom', description: UB.i18n('Початок') },
            { name: 'dateTo', description: UB.i18n('Кінець') },
            { name: 'rate', description: '%', format: '0.00' },
            { name: 'baseSum', description: UB.i18n('Сума') },
            { name: 'paymentMethod', description: UB.i18n('Спосіб виплати') }
          ],
          whereList: {},
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'del', 'edit'],
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
            customInit: function () {
              AC.gridUtils.tuneGridColumns(this, {
                rate: {
                  renderer: function (value) {
                    return !value ? '' : value.toFixed(2)
                  }
                },
                baseSum: {
                  renderer: function (value) {
                    return !value ? '' : notShowSalary ? 0 : value.toFixed(2)
                  }
                }
              })
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_payRetention',
                formCode: 'hr_payRetention',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.record.get('ID')
                  }
                }
              }
            },
            getRowClass: function (record) {
              if (record.get('entityName') === 'hr_payRetention') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                if (!(dateFrom <= AC.dateService.currentDate() && dateTo >= AC.dateService.currentDate())) {
                  return 'grd-color-grey'
                }
              } else if (record.get('entityName') === 'trf_accrual') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                const isOnDate = dateFrom <= AC.dateService.currentDate() && dateTo >= AC.dateService.currentDate()
                return (isOnDate ? 'grd-color-lightgreen' : 'grd-color-grey') + ' ' + (['143', '144', '145', '152'].includes(record.get('methodCode')) ? 'grd-italic' : '')
              } else {
                return 'grd-color-blue'
              }
            },
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    value: employeeNumberID
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
              }
              this.readOnly = form.readOnly
            },
            listeners: {
              render: (grid) => {
                grid.menu.removeAll()
                grid.menu.add([HR.employeeTabs.getOrderCardMenu(grid)])
              }
            }
          }
        })
      ]
    },
    hr_payOut: {
      title: UB.i18n('Виплата зарплати'),
      autoScroll: true,
      flex: 1,
      layout: 'border',
      items: [
        {
          region: 'north',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'ubcombobox',
              name: 'payOutID',
              readOnly: true,
              hideEntityItemInContext: true,
              labelWidth: 200,
              fieldLabel: UB.i18n('Шаблон виплати'),
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'hr_payOut',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'organizationID']
              }
            },
            {
              xtype: 'textfield',
              name: 'personalAccount',
              labelWidth: 200,
              readOnly: true,
              recordValue: 'employeeNumberID.personalAccount',
              fieldLabel: UB.i18n('Номер особового рахунку'),
              maxLength: 30,
              enforceMaxLength: true
            }
          ]
        },
        AC.gridUtils.getDefaultGridConfig({
          title: UB.i18n('Інші способи виплати зарплати'),
          region: 'center',
          flex: 1,
          entityName: 'hr_employeePayOut',
          fieldList: [
            { name: 'dateFromEmpty', description: UB.i18n('Початок') },
            { name: 'dateToEmpty', description: UB.i18n('Кінець') },
            { name: 'paymentMethod' },
            { name: 'bankAccount', description: UB.i18n('Номер р/р') },
            { name: 'personalAccount', description: UB.i18n('Номер о/р') },
            { name: 'bankID.name', description: UB.i18n('Банк') },
            { name: 'employeeNumberID', visibility: false }
          ],
          whereList: {},
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'addNew', 'edit', 'del'],
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeePayOut',
                formCode: 'hr_employeePayOut',
                cmpInitConfig: {
                  isEditable: () => { return false },
                  defaultValues: {
                    employeeID: form.instanceID,
                    employeeNumberID: employeeNumberID
                  }
                }
              }
            },
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    value: employeeNumberID
                  }
                })
              }
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_accrual: {
      title: UB.i18n('Розрахункові листи'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          entityName: 'hr_accrual',
          fieldList: [
            { name: 'employeeNumberID.tabNum', description: UB.i18n('Табельний номер') },
            { name: 'employeeNumberID.posName', description: UB.i18n('Посада') },
            { name: 'payElID.methodID.methodGroupID.groupType', description: UB.i18n('Тип нарахування') },
            { name: 'payElID.name', description: UB.i18n('Елемент розрахунків') },
            { name: 'days', description: UB.i18n('Днів') },
            { name: 'hours', description: UB.i18n('Годин') },
            { name: 'periodCalcID.description', description: UB.i18n('Період розрахунку') },
            { name: 'periodSalaryID.description', description: UB.i18n('Період нарахування') },
            { name: 'paySum', description: UB.i18n('Сума') },
            { name: 'rate', description: UB.i18n('Відсоток') },
            { name: 'baseSum', description: UB.i18n('Сума бази') }
          ],
          summary: { paySum: 'sum' },
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeNumberID.employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit'],
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                req.whereList = {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                }
              }
              this.readOnly = form.readOnly
            },
            onItemDblClick: function (grid, record) {
              return false
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
            { name: 'paySum' }
          ],
          whereList: {},
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del', 'addNewByCurrent'] : ['addNewByCurrent'],
            afterInit: function () {
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeNumberID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    values: { value: employeeNumberID }
                  }
                })
              }
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_employeeAuditSpec: {
      title: UB.i18n('Перевірки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orgName', description: UB.i18n('Організація') },
            { name: 'posName', description: UB.i18n('Посада') },
            { name: 'docNumber', description: UB.i18n('Номер довідки') },
            { name: 'docDate', description: UB.i18n('Дата') },
            { name: 'endDate', description: UB.i18n('Дата закінчення') },
            { name: 'preventInfoResult' }
          ],
          entityName: 'hr_employeeDocAudit',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            auditType: {
              expression: '[auditType]',
              condition: 'equal',
              value: '1'
            }
          },
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            auditType: '1',
            afterInit: function () {
              this.readOnly = form.readOnly
            }
          }
        })
      ]
    },
    hr_employeeAuditClear: {
      title: UB.i18n('Перевірки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'orgName', description: UB.i18n('Організація') },
            { name: 'posName', description: UB.i18n('Посада') },
            { name: 'docNumber', description: UB.i18n('Номер довідки') },
            { name: 'docDate', description: UB.i18n('Дата') },
            { name: 'endDate', description: UB.i18n('Дата закінчення') },
            { name: 'preventInfoResult' }
          ],
          entityName: 'hr_employeeDocAudit',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          whereList: {
            orderState: {
              expression: '[auditType]',
              condition: 'equal',
              value: '2'
            }
          },
          cmpInitConfig: {
            auditType: '2',
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              this.employeeNumberID = employeeNumberID
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeDocAudit',
                formCode: 'hr_employeeDocAudit',
                cmpInitConfig: {
                  employeeNumberID: form.employeeNumberID
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeNumberServ: {
      title: UB.i18n('Державна служба'),
      items: [
        {
          layout: {
            type: 'hbox',
            align: 'top'
          },
          items: [
            {
              layout: {
                type: 'vbox',
                align: 'stretch'
              },
              flex: 1,
              defaults: { labelWidth: 260 },
              items: [
                {
                  xtype: 'ubdatefield',
                  name: 'oathDate',
                  formParams: true,
                  fieldLabel: UB.i18n('Дата присяги держслужбовця')
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('Не є громадянином іншої держави'),
                  name: 'isCitizen'
                },
                {
                  xtype: 'ubtextfield',
                  name: 'deputy',
                  width: 350,
                  fieldLabel: UB.i18n('Депутат ради')
                },
                {
                  xtype: 'ubtextfield',
                  name: 'scientificWorks',
                  width: 350,
                  fieldLabel: UB.i18n('Наукові праці та винаходи')
                },
                {
                  xtype: 'ubtextfield',
                  name: 'civilOther',
                  width: 350,
                  fieldLabel: UB.i18n('Інші відомості')
                },
                {
                  xtype: 'checkboxfield',
                  fieldLabel: UB.i18n('З вимогами і обмеженнями проходження держслужби ознайомлений'),
                  name: 'isInitiated'
                },
                {
                  xtype: 'tabpanel',
                  region: 'center',
                  items: [
                    {
                      xtype: 'ubdetailgrid',
                      name: 'publServRang',
                      autoScroll: true,
                      title: UB.i18n('Ранг держслужбовця'),
                      layout: 'fit',
                      // hideActions: ['addNew', 'edit', 'del', 'addNewByCurrent', 'newVersion', 'history', 'showPreview', 'itemLink', 'commandLink', 'showDetail'],
                      cmdType: 'showList',
                      hideActions: form.readOnly ? ['del'] : [],
                      entityConfig: {
                        entity: 'hr_publServRang',
                        method: 'select',
                        fieldList: [
                          { name: 'employeeID', visibility: false },
                          { name: 'dictRankID.name', description: UB.i18n('Ранг') },
                          { name: 'dateFrom' },
                          { name: 'dateToEmpty' },
                          { name: 'dateNext' },
                          { name: 'orderNumber' },
                          { name: 'orderDate' }
                        ]
                      },
                      readOnly: form.readOnly,
                      cmpInitConfig: {
                        afterInit: function () {
                          const req = this.getStore().ubRequest
                          req.whereList = {
                            employeeID: {
                              expression: '[employeeID]',
                              condition: 'equal',
                              values: { value: form.record.get('employeeID') }
                            }
                          }
                        },
                        onDeterminateForm: function (grid) {
                          return {
                            entityName: 'hr_publServRang',
                            formCode: 'hr_publServRang',
                            cmpInitConfig: {
                              defaultValues: { employeeID: form.record.get('employeeID') }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              ]
            }
          ],
          listeners: {
            render: function () {
              if (employeeNumberID) {
                form.setLoading(true)
                UB.Repository('hr_employeeNumberS')
                  .attrs(['employeeID.oathDate', 'employeeID.isCitizen', 'employeeID.deputy', 'employeeID.scientificWorks',
                    'employeeID.civilOther', 'employeeID.isInitiated'])
                  .where('ID', '=', employeeNumberID)
                  .selectSingle()
                  .then(employeeNumber => {
                    if (employeeNumber) {
                      form.down('[name=oathDate]').setValue(employeeNumber['employeeID.oathDate'])
                      form.down('[name=isCitizen]').setValue(employeeNumber['employeeID.isCitizen'])
                      form.down('[name=deputy]').setValue(employeeNumber['employeeID.deputy'])
                      form.down('[name=scientificWorks]').setValue(employeeNumber['employeeID.scientificWorks'])
                      form.down('[name=civilOther]').setValue(employeeNumber['employeeID.civilOther'])
                      form.down('[name=isInitiated]').setValue(employeeNumber['employeeID.isInitiated'])
                    }
                    form.setLoading(false)
                  })
              }
            }
          }
        }
      ]
    },
    hr_employeeInfoPortalVac: {
      title: UB.i18n('Профіль особи з порталу вакансій'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateProfile' },
            { name: 'fullFIO' },
            { name: 'externalID' }
          ],
          entityName: 'hr_employeeInfoPortalVac',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_empCheckMedical: {
      title: UB.i18n('Медогляд'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictCheckMedicalID.name', description: UB.i18n('Тип медогляду') },
            { name: 'dateCheck' },
            { name: 'dateTo' },
            { name: 'dateNext' },
            { name: 'orderID.description', description: UB.i18n('За наказом') }
          ],
          entityName: 'hr_empCheckMedical',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const gridStore = this.getStore()
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empCheckMedical',
                formCode: 'hr_empCheckMedical',
                cmpInitConfig: {
                  defaultValues: { employeeID: form.record.get('ID') }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeSpecialRank: {
      title: UB.i18n('Спеціальні звання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dictSpecialRankID.name', description: UB.i18n('Звання') },
            { name: 'dictSpecialRankID.rankType', description: UB.i18n('Тип звання') },
            { name: 'dateFrom' },
            { name: 'dateToEmpty' },
            { name: 'dateNext' },
            { name: 'orderNumber' },
            { name: 'orderDate' },
            { name: 'comment' }
          ],
          entityName: 'hr_employeeSpecialRank',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['dictSpecialRankID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const gridStore = this.getStore()
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeSpecialRank',
                formCode: 'hr_employeeSpecialRank',
                cmpInitConfig: {
                  defaultValues: { employeeID: form.record.get('ID') }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeAssets: {
      title: UB.i18n('Майно організації у працівника'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'assetsID.description', description: 'Найменування' },
            { name: 'dateFrom' },
            { name: 'dateTo' }
          ],
          entityName: 'hr_employeeAssets',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const gridStore = this.getStore()
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeAssets',
                formCode: 'hr_employeeAssets',
                cmpInitConfig: {
                  defaultValues: { employeeID: form.record.get('ID') }
                }
              }
            }
          }
        })
      ]
    },
    hr_employeeVehicle: {
      title: UB.i18n('Транспортні засоби працівника'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'strVehicle', description: 'Транспортний засіб' },
            { name: 'ownershipVehicle' },
            { name: 'dateFrom', description: 'Дата початку дії' },
            { name: 'dateToEmpty', description: 'Дата закінчення дії' },
            { name: 'orderID.description', description: 'За наказом' }
          ],
          entityName: 'hr_employeeVehicle',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const gridStore = this.getStore()
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeVehicle',
                formCode: 'hr_employeeVehicle',
                cmpInitConfig: {
                  defaultValues: { employeeID: form.record.get('ID') }
                }
              }
            }
          }
        })
      ]
    },
    hr_empWorkShdChange: {
      title: UB.i18n('Зміна графіку роботи'),
      name: 'empWorkSchChange',
      layout: { type: 'border' },
      items: [
        {
          xtype: 'acGrid',
          name: 'gridScheduleChange',
          stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_employee_gridScheduleChange'),
          region: 'center',
          entity: 'hr_empWorkShdChange',
          formCode: 'hr_empWorkShdChange',
          flex: 1,
          hideActions: ['addNew', 'del', 'addNewByCurrent'],
          readOnly: true,
          isReadOnly: true,
          storeType: 'ub',
          storeAutoLoad: true,
          disablePaging: true,
          onSaveEditData: true,
          showToolBar: true,
          multilineRows: true,
          enableExpandableRows: true,
          ubStoreConfig: {
            entity: 'hr_empWorkShdChange',
            method: 'select',
            fieldList: ['ID', 'employeeID', 'workScheduleID', 'workScheduleID.name', 'dateFrom', 'dateToEmpty', 'orderID', 'paraID', 'orderID.description', 'employeeNumberID.description'],
            whereList: {
              employeeNumberID: {
                expression: '[employeeNumberID]',
                condition: 'equal',
                value: employeeNumberID
              }
            },
            orderList: {
              orderBy: { expression: 'dateFrom', order: 'asc' }
            },
            customParams: {
              onDate: appAC.globalApplicationDate()
            }
          },
          expandedRowConfig: {
            onExpandBody: async function (rowNode, record, expandRow, eOpts) {
              const grid = this
              const view = grid.getView()
              view.addRowCls(record.index, 'grd-bold')
              const data = await loadSchedule(grid, record)
              record.schedule = data
              const showHoursNew = !record.get('workScheduleID')
              let detail = ` <style type="text/css">.table { width: 100%; padding:10px;} #td { text-indent: 20px} .span { color: #104ab9} </style>
                <td class="x-grid-cell-rowbody" colspan="10"><div class="x-grid-rowbody">
                <div style="width: 100%"><TABLE>
                `
              if (data.length) {
                detail += `<TR style="text-align: center; font-weight: normal;">
                  <TD style="width:75px;">${UB.i18n('Номер дня')}</TD>
                  <TD style="width:400px;">${UB.i18n('Елемент обліку робочого часу')}</TD>
                  <TD style="width:100px;">${UB.i18n('Години роботи')}</TD>` +
                  (showHoursNew ? `<TD style="width:100px;">${UB.i18n('Години роботи (встановлені значення)')}</TD>` : '') +
                  `<TD style="width:100px;">${UB.i18n('Початок о')}</TD>
                  <TD style="width:100px;">${UB.i18n('Закінчення о')}</TD>
                  <TD style="width:100px;">${UB.i18n('Перерва з')}</TD>
                  <TD style="width:100px;">${UB.i18n('Перерва по')}</TD>
                `
                detail += `</TR>`
                data.forEach(item => {
                  detail += `<TR style="text-align: center; font-weight: normal;">
                    <TD style="width:75px;"><span class = "span">${item.numDay}</span></TD>
                    <TD style="width:400px; text-align: left;"><span class = "span">${item['dictTimeCostID.name']}</span></TD>
                    <TD style="width:100px;"><span class = "span">${item.hoursWork}</span></TD>` +
                    (showHoursNew ? `<TD style="width:100px;"><span class = "span">${item.hoursWorkNew || ''}</span></TD>` : '') +
                    `<TD style="width:100px;"><span class = "span">${item.timeFrom ? item.timeFrom : ''}</span></TD>
                    <TD style="width:100px;"><span class = "span">${item.timeTo ? item.timeTo : ''}</span></TD>
                    <TD style="width:100px;"><span class = "span">${item.recreationFrom ? item.recreationFrom : ''}</span></TD>
                    <TD style="width:100px;"><span class = "span">${item.recreationTo ? item.recreationTo : ''}</span></TD>
                    `
                  detail += `</TR>`
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
            { name: 'workScheduleID' },
            {
              name: 'workScheduleID.name',
              columnConfig: {
                text: UB.i18n('Графік роботи'),
                width: 400,
                renderer: function (value) {
                  return !value ? UB.i18n('Зміна робочого часу') : value
                }
              }
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
            { name: 'orderID' },
            { name: 'paraID' },
            { name: 'orderID.description', columnConfig: { text: UB.i18n('Встановлений наказом'), width: 500 } },
            { name: 'employeeNumberID.tabNum',
              columnConfig: {
                text: UB.i18n('Табельний №'),
                width: 100
              }
            }
          ],
          afterInit: function (grid) {
            grid.readOnly = form.readOnly
          },
          customToolBarActions: [
            {
              tooltip: UB.i18n('Оновити'),
              scale: 'medium',
              iconCls: 'u-icon-refresh',
              handler: function (btn) {
                const grid = btn.up('[name=gridScheduleChange]')
                grid.loadData()
              }
            }
          ]
        }
      ]
    },
    hr_empTarifCategory: {
      title: UB.i18n('Тарифні розряди'),
      name: 'empTariffCategory',
      items: [
        /* {
              title: UB.i18n('Категорія'),
              xtype: 'ubdetailgrid',
              autoScroll: true,
              flex: 1,
              readOnly: form.readOnly,
              entityConfig: {
                entity: 'hr_personCategory',
                method: 'select',
                fieldList: [
                  { name: 'dictEmpCategoryID.name', description: UB.i18n('Категорія') },
                  { name: 'dateFrom' },
                  { name: 'dateToEmpty' },
                  { name: 'orderCause' }
                ],
                orderList: {
                  orderBy: { expression: 'dateFrom', order: 'asc' }
                }
              },
              masterFields: ['ID'],
              detailFields: ['employeeID'],
              cmpInitConfig: {
                afterInit: function () {
                  this.readOnly = form.readOnly
                }
              }
            }, */
        {
          // title: 'Тарифні розряди',
          xtype: 'ubdetailgrid',
          autoScroll: true,
          flex: 1,
          readOnly: form.readOnly,
          hideActions: ['addNewByCurrent'],
          entityConfig: {
            entity: 'hr_empTarifCategory',
            method: 'select',
            fieldList: [
              { name: 'dictTarifCoeffID.name', description: UB.i18n('Тарифний розряд') },
              { name: 'dateFrom' },
              { name: 'dateToEmpty' },
              { name: 'orderCause' }
            ],
            orderList: {
              orderBy: { expression: 'dateFrom', order: 'asc' }
            }
          },
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          cmpInitConfig: {
            afterInit: function () {
              this.readOnly = form.readOnly
            }
          }
        }
      ]
    },
    hr_employeeTabNumList: {
      title: UB.i18n('Табельні номери'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'tabNum', description: UB.i18n('Таб. №'), config: { align: 'center' } },
            { name: 'dateFrom', description: UB.i18n('Дата початку'), config: { align: 'center' } },
            { name: 'dateToEmpty', description: UB.i18n('Дата закінчення'), config: { align: 'center' } }
          ],
          entityName: 'hr_employeeNumber',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          orderList: {
            tabNum: { expression: '[tabNumSort]' }
          },
          whereList: {
            orgID: {
              expression: '[orgID]',
              condition: 'equal',
              value: appAC.globalOrganization()
            }
          },
          cmpInitConfig: {
            hideActions: ['addNewByCurrent', 'addNew'],
            afterInit: function () {
              AC.gridUtils.setGlobalOrganization(this, 'orgID')
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeNumber',
                formCode: 'hr_employeeNumberEdit'
              }
            }
          }
        })
      ]
    },
    hr_studEducationKind: {
      title: UB.i18n('Вид навчання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'tabNum' },
            { name: 'dateFrom' },
            { name: 'dateToEmpty' },
            { name: 'typeStudy' },
            { name: 'formStudy' },
            { name: 'dictLevelID.description', description: UB.i18n('Освітній рівень') }
          ],
          orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } },
          entityName: 'hr_studEducationKind',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeNumberID'],
          detailFields: ['employeeNumberID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const req = this.store.ubRequest
              form.record.data.employeeNumberID = employeeNumberID
              req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                req.whereList, this.masterFields, this.detailFields, form.record
              )
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_studEducationKind',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_studEducationHistory: {
      title: UB.i18n('Навчання'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'depName', description: UB.i18n('Факультет') },
            { name: 'groupID.name', description: UB.i18n('Група') },
            { name: 'dateFrom' },
            { name: 'dateToEmpty' },
            { name: 'semester' },
            { name: 'studyYear' }
          ],
          orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } },
          entityName: 'hr_studEducationHistory',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeNumberID'],
          detailFields: ['employeeNumberID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const req = this.store.ubRequest
              form.record.data.employeeNumberID = employeeNumberID
              req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                req.whereList, this.masterFields, this.detailFields, form.record
              )
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_studEducationHistory',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_studStipend: {
      title: UB.i18n('Стипендія'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom' },
            { name: 'dateToEmpty' },
            { name: 'averageScore', config: { decimalPrecision: 2 } },
            { name: 'typeStipend' },
            { name: 'sumStipend' }
          ],
          orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } },
          entityName: 'hr_studStipend',
          masterEntityName: 'hr_employeeNumber',
          masterFields: ['employeeNumberID'],
          detailFields: ['employeeNumberID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
              const req = this.store.ubRequest
              form.record.data.employeeNumberID = employeeNumberID
              req.whereList = UB.core.UBCommand.addMasterDetailRelation(
                req.whereList, this.masterFields, this.detailFields, form.record
              )
              AC.gridUtils.tuneGridColumns(this, {
                averageScore: {
                  renderer: function (value) {
                    return _.isNumber(value) && value !== 0 ? Ext.util.Format.currency(value, '', 2) : ''
                  }
                }
              })
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_studStipend',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.instanceID
                  }
                }
              }
            }
          }
        })
      ]
    },
    hr_studOverPay: {
      title: UB.i18n('Доплата до стипендії'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom' },
            { name: 'dateTo' },
            { name: 'typeOverpay.description', description: UB.i18n('Тип доплати') },
            { name: 'sumOverpay' }
          ],
          entityName: 'hr_studOverPay',
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
          detailFields: ['employeeID'],
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_studOverPay',
                cmpInitConfig: {
                  defaultValues: { employeeNumberID: employeeNumberID }
                }
              }
            }
          }
        })
      ]
    },
    hr_studVacation: {
      title: UB.i18n('Відпустки'),
      items: [
        AC.gridUtils.getDefaultGridConfig({
          fieldList: [
            { name: 'dateFrom' },
            { name: 'dateTo' },
            { name: 'orderNumber' },
            { name: 'orderDate' }
          ],
          whereList: {
            employeeNumberID: {
              expression: '[employeeNumberID]',
              condition: 'equal',
              value: employeeNumberID
            }
          },
          orderList: { orderBy: { expression: 'dateFrom', order: 'asc' } },
          entityName: 'hr_empLongTermAbsc',
          readOnly: form.readOnly,
          cmpInitConfig: {
            hideActions: form.readOnly ? ['del'] : [],
            afterInit: function () {
              this.readOnly = form.readOnly
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_empLongTermAbsc',
                cmpInitConfig: {
                  defaultValues: { employeeNumberID: employeeNumberID }
                }
              }
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
          masterEntityName: 'hr_employee',
          masterFields: ['ID'],
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
    },
    hr_employeeAccrualStud: {
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
          whereList: {},
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
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    value: employeeNumberID
                  }
                })
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
              }
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_employeeAccrual',
                formCode: 'hr_employeeAccrualEdit',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.record.get('ID')
                  }
                }
              }
            },
            getRowClass: function (record, rowIndex, rowParams, store) {
              const me = this.up()
              if (record.get('entityName') === 'hr_employeeAccrual') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                const onDate = me.down('[name=onDate]').getValue()
                if (!(dateFrom <= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()) && dateTo >= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()))) {
                  return 'grd-color-grey'
                }
              } else if (record.get('entityName') === 'trf_accrual') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                const onDate = me.down('[name=onDate]').getValue()
                const isOnDate = (dateFrom <= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()) && dateTo >= (onDate ? AC.dateService.shiftDate(onDate) : AC.dateService.currentDate()))
                return (isOnDate ? 'grd-color-grey' : 'grd-color-lightgreen') + ' ' + (['143', '144', '145', '152'].includes(record.get('methodCode')) ? 'grd-italic' : '')
              } else {
                return record.get('permDisabledID') ? 'grd-color-grey-bold' : 'grd-color-blue'
              }
            }
          }
        })
      ]
    },
    hr_payRetentionStud: {
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
          whereList: {},
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
              if (employeeNumberID) {
                const req = this.getStore().ubRequest
                _.merge(req.whereList, {
                  employeeID: {
                    expression: '[employeeNumberID]',
                    condition: 'equal',
                    value: employeeNumberID
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
              }
            },
            onDeterminateForm: function (grid) {
              return {
                entityName: 'hr_payRetention',
                formCode: 'hr_payRetention',
                cmpInitConfig: {
                  defaultValues: {
                    employeeNumberID: employeeNumberID,
                    employeeID: form.record.get('ID')
                  }
                }
              }
            },
            getRowClass: function (record, rowIndex, rowParams, store) {
              if (record.get('entityName') === 'hr_payRetention') {
                const dateFrom = record.get('dateFrom') ? AC.dateService.shiftDate(record.get('dateFrom')) : AC.dateService.minDate()
                const dateTo = record.get('dateTo') ? AC.dateService.shiftDate(record.get('dateTo')) : AC.dateService.maxDate()
                if (!(dateFrom <= (store.ubRequest.onDate || AC.dateService.currentDate()) && dateTo >= (store.ubRequest.onDate || AC.dateService.currentDate()))) {
                  return 'grd-color-grey'
                }
              } else {
                return record.get('permDisabledID') ? 'grd-color-grey-bold' : 'grd-color-blue'
              }
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
  const initData = (form.initialConfig && form.initialConfig.data) || {}

  Object.keys(initData).forEach(field => {
    const fieldVal = initData[field]
    if (fieldVal) {
      form.record.set(field, fieldVal)
    }
  })
  items && items.forEach(item => {
    const entityConfig = item.entityConfig || (item.cmdData && item.cmdData.params && item.cmdData.params[0])
    if (entityConfig && entityConfig.entity && $App.domainInfo.entities[entityConfig.entity] &&
      $App.domainInfo.entities[entityConfig.entity] && $App.domainInfo.entities[entityConfig.entity].attributes.employeeID) {
      entityConfig.whereList = entityConfig.whereList || {}
      entityConfig.whereList.employeeID = {
        expression: '[employeeID]',
        condition: 'equal',
        values: {
          val: form.instanceID
        }
      }
      if (item.masterFields && item.detailFields && item) {
        item.cmpInitConfig.parentContext = {}
        _.forEach(item.masterFields, (masterField, index) => {
          let masterID = form.record.get(masterField)
          if (!masterID && masterField === 'ID') {
            masterID = form.instanceID
          }
          item.cmpInitConfig.parentContext[item.detailFields[index]] = masterID
        })
      }
    }
    item.items && prepareAttr(item.items, form)
  })
}

function getEmpCardMenu (grid, checkStatus = false) {
  const empNumFld = AC.gridUtils.getFieldByName(grid, 'employeeNumberID')
  return {
    text: empNumFld ? UB.i18n('Відкрити картку працівника') : UB.i18n('Відкрити картку особи'),
    iconCls: 'fa fa-male',
    disabled: !AC.entityUtils.verifyRightsMethod('hr_employee', 'view'),
    handler: function () {
      let reco = AC.gridUtils.getCurrentRecord(grid)
      if (!reco && grid.menu && grid.menu.record) {
        reco = grid.menu.record
      }
      if (!reco) {
        AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
        return
      }
      if (checkStatus) {
        if (reco.get('requestState') !== 'AGREED') {
          AC.viewUtils.showToast(UB.i18n('Перегляд заборонено'), UB.i18n('Доступ до картки не надано'))
          return
        }
      }
      const employeeNumberID = reco.get('employeeNumberID')
      const cmpInitConfig = employeeNumberID ? { employeeNumberID: employeeNumberID } : {}
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_employee',
        entity: 'hr_employee',
        sender: grid,
        instanceID: reco.get('employeeID'),
        cmpInitConfig: cmpInitConfig
      })
    }
  }
}

function getOrderCardMenu (grid) {
  return {
    text: UB.i18n('Відкрити наказ'),
    iconCls: 'fa fa-male',
    handler: function () {
      const record = AC.gridUtils.getCurrentRecord(grid)
      if (record.get('orderID')) {
        UB.Repository('hr_order')
          .attrs(['ID', 'orderClass'])
          .where('ID', '=', record.get('orderID'))
          .selectSingle().then(orderClass => {
            if (orderClass && orderClass.orderClass) {
              UB.Repository('hr_orderClass')
                .attrs(['ID', 'entityName'])
                .where('ID', '=', orderClass.orderClass)
                .selectSingle().then(entityName => {
                  if (entityName && entityName.entityName) {
                    $App.doCommand({
                      cmdType: 'showForm',
                      formCode: entityName.entityName,
                      entityName: entityName.entityName,
                      entity: entityName.entityName,
                      isModal: true,
                      instanceID: record.get('orderID')
                    })
                  }
                })
            }
          })
      }
    }
  }
}

function getForOpenWoorkbookOrder (orderID, employeeID) {
  return Promise.resolve().then(() => {
    if (orderID) {
      return UB.Repository('hr_empOrderDet')
        .attrs(['ID', 'mi_unityEntity'])
        .where('employeeID', '=', employeeID)
        .where('orderID', '=', orderID)
        .where('mi_unityEntity', 'in', ['hr_empOrderAppointDet', 'hr_empOrderMoveDet'])
        .selectSingle()
        .then(data => {
          if (data) {
            const result = {
              mi_unityEntity: data.mi_unityEntity,
              ID: data.ID
            }
            return result
          } else {
            return null
          }
        })
    } else {
      return null
    }
  })
}

function calcWoorkbookExp (gridData) {
  gridData.forEach(row => {
    row.dateFrom = AC.dateService.shiftDate(row.dateFrom)
    if (row.dateTo) {
      row.dateTo = AC.dateService.shiftDate(row.dateTo)
    }
    const onDate = row.dateTo || AC.dateService.currentDate()
    const ymd = AC.dateService.getYmd(row.dateFrom, onDate, true)
    row.countDays = row.dateFrom <= onDate ? (AC.dateService.dateDiff(row.dateFrom, onDate) || 0) + 1 : 0
    row.countDaysGiven = Math.floor(row.countDays * (row.coefficient ? row.coefficient : 1))
    row.years = ymd.years
    row.months = ymd.months
    row.days = ymd.days
  })
}

function loadWoorkbookExp (record) {
  if (!record.expData) {
    return $App.connection.run({
      entity: 'hr_employeeWorkbook',
      method: 'select',
      fieldList: ['ID'],
      ID: record.get('ID')
    }).then(mParams => {
      const data = JSON.parse(mParams.detail).employeeWorkbookDt
      calcWoorkbookExp(data)
      return Promise.resolve(data)
    })
  } else {
    return Promise.resolve(record.expData)
  }
}

function getEmpCardWoorkbookOpenOrderMenu (grid) {
  const action = new Ext.Action({
    text: UB.i18n('Переглянути наказ Вступу на посаду'),
    iconCls: 'fa fa-user-circle-o',
    handler: function () {
      const record = AC.gridUtils.getCurrentRecord(grid)
      if (!record) {
        AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
        return
      }
      const orderID = record.get('employeePositionID.orderID')
      const employeeID = record.get('employeeID')
      return getForOpenWoorkbookOrder(orderID, employeeID).then(result => {
        if (result) {
          $App.doCommand({
            cmdType: 'showForm',
            entityName: result.mi_unityEntity,
            entity: result.mi_unityEntity,
            isModal: true,
            instanceID: result.ID
          })
        } else {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Наказ не знайдено'))
        }
      })
    }
  })
  grid.on('itemcontextmenu', function (/* grid, record, item, index, event, eOpts */) {
    action.setDisabled(true)
    const record = AC.gridUtils.getCurrentRecord(grid)
    if (record) {
      const orderID = record.get('employeePositionID.orderID')
      const employeeID = record.get('employeeID')
      grid.menu.down('[ubID=itemClose]').setDisabled((!record.get('dateToEmpty') || !record.get('employeePositionID.changeOrderID')))
      getForOpenWoorkbookOrder(orderID, employeeID).then(result => {
        if (result) {
          action.setDisabled(false)
        }
      })
    }
  })
  return action
}

function onDeterminateCard (grid) {
  const reco = AC.gridUtils.getCurrentRecord(grid)
  if (reco) {
    return {
      formCode: 'hr_employee',
      entityName: 'hr_employee',
      entity: 'hr_employee',
      instanceID: reco.get('employeeID'),
      cmpInitConfig: {
        employeeNumberID: reco.get('employeeNumberID')
      }
    }
  }
}

function onDeterminateCardWithAccess (grid) {
  const reco = AC.gridUtils.getCurrentRecord(grid)
  if (reco) {
    let limitedAccess
    try {
      limitedAccess = reco.get('limitedAccess')
    } catch (e) { }
    if (!limitedAccess || AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess')) {
      return {
        formCode: 'hr_employee',
        entityName: 'hr_employee',
        entity: 'hr_employee',
        instanceID: reco.get('employeeID'),
        cmpInitConfig: {
          employeeNumberID: reco.get('employeeNumberID')
        }
      }
    } else {
      $App.dialogError(UB.i18n('У вас немає прав для перегляду цієї картки!'))
    }
  }
}
function onDeterminateEmpNumberCard (grid) {
  const reco = AC.gridUtils.getCurrentRecord(grid)
  if (reco) {
    return {
      formCode: 'hr_employeeNumber',
      entityName: 'hr_employeeNumber',
      entity: 'hr_employeeNumber',
      instanceID: reco.get('hr_employeeNumber')
    }
  }
}

function runEmpCard (cfg) {
  const runCfg = {
    cmdType: 'showForm',
    formCode: 'hr_employee',
    entity: 'hr_employee',
    instanceID: cfg.employeeID,
    title: cfg.title || UB.i18n('Картка працівника'),
    tabId: 'hr_employee_' + cfg.employeeID,
    isModal: (cfg.isModal !== undefined) ? cfg.isModal : true
  }
  if (cfg.isModal === false) {
    runCfg.target = $App.getViewport().centralPanel
  }
  runCfg.cmpInitConfig = cfg.cmpInitConfig || {}
  if (cfg.employeeNumberID) {
    runCfg.cmpInitConfig.employeeNumberID = cfg.employeeNumberID
  }
  if (cfg.nodeId) {
    runCfg.customParams = cfg.customParams || {}
    runCfg.customParams.nodeId = cfg.nodeId
  }
  $App.doCommand(runCfg)
}

function refreshEmployeeNumberInfo (form, panel) {
  return
  const formFields = [
    { name: 'fullFIO', type: 'label' },
    { name: 'tabNum', type: 'text' },
    { name: 'taxCode', type: 'text' },
    { name: 'numberOS', type: 'text' },
    { name: 'phoneMobile', type: 'text' },
    { name: 'email', type: 'text' },
    { name: 'appointDate', type: 'date' },
    { name: 'appointOrderNumber', type: 'text' },
    { name: 'appointOrderDate', type: 'date' },
    { name: 'appointTrialDate', type: 'date' },
    { name: 'dismDate', type: 'date' },
    { name: 'dismOrderNumber', type: 'text' },
    { name: 'dismOrderDate', type: 'date' },
    { name: 'dismReason', type: 'text' },
    { name: 'catName', type: 'text' },
    { name: 'workPlace', type: 'text' },
    { name: 'workerTypeName', type: 'text' },
    { name: 'depName', type: 'text' },
    { name: 'posName', type: 'text' },
    { name: 'posCatName', type: 'text' },
    { name: 'posTypeName', type: 'text' },
    { name: 'appointType', type: 'text' },
    { name: 'appointContract', type: 'text' },
    { name: 'posOrderNumber', type: 'text' },
    { name: 'posOrderDate', type: 'date' },
    { name: 'posDateFrom', type: 'date' },
    { name: 'payElName', type: 'text' },
    { name: 'mtCount', type: 'text' },
    { name: 'accrualSum', type: 'text' },
    { name: 'rankName', type: 'text' },
    { name: 'rankDateFrom', type: 'date' },
    { name: 'rankOrderNumber', type: 'text' },
    { name: 'rankOrderDate', type: 'date' },
    { name: 'milName', type: 'text' },
    { name: 'milSuitName', type: 'text' },
    { name: 'disabilityGroup', type: 'text' },
    { name: 'disabilityType', type: 'text' },
    { name: 'accessTypeName', type: 'text' },
    { name: 'accessDateFrom', type: 'date' },
    { name: 'numberIdentCard', type: 'text' },
    { name: 'numberPermit', type: 'text' },
    { name: 'insuranceNum', type: 'text' },
    { name: 'whereRegisteredInPFU', type: 'text' },
    { name: 'passDesc', type: 'text' },
    { name: 'vacDateTo', type: 'date' },
    { name: 'accessDateFrom', type: 'date' },
    { name: 'vacKindName', type: 'text' },
    { name: 'educationList', type: 'text' },
    { name: 'address', type: 'text' }
  ]

  if (!panel) {
    panel = form.down('[name=employeeNumberInfoPanel]')
  }
  if (!panel) {
    panel = form.down('tabpanel')
  }

  function setField (data, name, type) {
    if (data[name]) {
      const ctrl = panel.down(`[name=${name}]`)
      if (ctrl) {
        if (type === 'date') {
          ctrl.setValue(AC.dateService.formatDate(data[name]))
        } else if (type === 'label') {
          if (ctrl.setText) ctrl.setText(data[name])
          else if (ctrl.setValue) ctrl.setValue(data[name])
        } else {
          ctrl.setValue(data[name])
        }
      }
    }
  }

  $App.connection.run({
    entity: 'hr_employeeNumberInfo',
    method: 'getData',
    employeeNumberID: form.employeeNumberID,
    onDate: appAC.globalApplicationDate()
  }).then(mParams => {
    const data = JSON.parse(mParams.resultData)
    if (data) {
      if (data.photo) {
        const photo = panel.down('[name=photo]')
        photo && photo.setValue && photo.setValue(data.photo, form.instanceID, true)
      }
      formFields.forEach(field => {
        setField(data, field.name, field.type)
      })
    }
  })
}

function onDelEmployeeWorkbook (grid, keyCode, e) {
  const gridSelection = grid.getSelectionModel().getSelection()
  if (gridSelection.length === 0) {
    AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Не вибраний запис'))
    return
  }
  if (gridSelection[0].data['employeePositionID.employeeNumberID.tabNum']) {
    const roles = $App.connection.userData().roles.toUpperCase().split(',')
    if (!roles.includes('acc_adminEmpWorkbook'.toUpperCase())) {
      AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Неможливо видалити запис - до запису прив\'язане призначення'))
      return
    }
  }
  e.stopEvent()
  grid.onDel()
}

function loadSchedule (grid, record) {
  if (!record.schedule) {
    let schedule
    if (record.get('workScheduleID')) {
      schedule = UB.Repository('hr_workScheduleDays')
        .attrs(['dictTimeCostID', 'dictTimeCostID.name', 'numDay', 'hoursWork', 'timeFrom', 'timeTo', 'recreationFrom', 'recreationTo'])
        .where('workScheduleID', '=', record.get('workScheduleID') || 0)
        .orderBy('numDay', 'asc')
        .selectAsObject()
    } else {
      schedule = UB.Repository('hr_empOrderCwsWorkHourDayDet')
        .attrs(['dictTimeCostID', 'dictTimeCostID.name', 'numDay', 'hoursWork',
          'hoursWorkNew', 'timeFrom', 'timeTo', 'recreationFrom', 'recreationTo'])
        .where('paraID', '=', record.get('paraID') || 0)
        .orderBy('numDay', 'asc')
        .selectAsObject()
    }
    return schedule
  } else {
    return Promise.resolve(record.schedule)
  }
}

function openEmpCard (grid, record) {
  if (AC.entityUtils.verifyRightsMethod('hr_employee', 'view')) {
    let ubdetailgrid = grid.up('ubdetailgrid')
    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'hr_employee',
      entity: 'hr_employee',
      tabId: 'hr_employee' + record.get('ID'),
      target: $App.getViewport().centralPanel,
      store: ubdetailgrid.store,
      instanceID: record.get('employeeID'),
      cmpInitConfig: {
        employeeNumberID: record.get('ID')
      }
    })
  }
}
