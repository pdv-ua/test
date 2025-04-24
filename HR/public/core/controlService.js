/* global Ext $App UB AC HR appAC _ */
module.exports = {
  getOrgCombo,
  getAttrOrgCombo,
  getDepCombo,
  getAttrDepPosBlock,
  get2DepCombo,
  getOneDepCombo,
  getRespEmpCombo,
  getRespPosEmpCombos,
  filterUnitByParent,
  filterUnitByOrg,
  showStaffTree,
  checkAndSaveForm,
  acGridOnAddNewSaveForm,
  acGridDelAutoCommit,
  setUnusedVacationDayList,
  getUnusedVacationDayPanel,
  setEmpPosList,
  getEmpPosPanel,
  getAppChildOrgCombo,
  getIDNameCombo,
  getEduOrgCombo,
  fixMultiSelectBox,
  setPeriodAbsenceList,
  getPeriodAbsencePanel,
  filterEmpPosCtrl,
  getOrderCombo,
  setFormErrors,
  getFormErrorsText,
  validateEditPromiseSupport,
  setValidateEditPromise,
  setCancelEditPromise,
  checkErrorsOnClose,
  setRowEditComboValueById,
  selectAndEdit,
  getVacationGroupPanel,
  getShortcutListStyle,
  getYearControl,
  getProgClassCombo,
  getFundSourceCombo,
  getSignatoryCombos,
  getPosCardMenu,
  getOrderFundSourceGrid,
  getIncludeChildOrgs,
  getIncludeChildDepts,
  onChangeIncludeChildOrgs,
  getTimeCostGroupInfo,
  getCustomOrgCombo,
  getCollapseInfoPanel
}

function getOrgCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'mi_data_id'
  const displayField = config.displayField || 'description'
  const fieldList = [valueField, displayField]
  const addFields = config.addFields
  if (addFields) {
    fieldList.push(...addFields)
  }
  const globalOrg = config.globalOrg || appAC.globalOrganization()
  const whereList = {
    state: {
      expression: '[state]',
      condition: '=',
      value: 'ACTIVE'
    }
  }
  if (config.orgFilter) {
    if (config.orgFilter === 'CURRENT') {
      whereList.orgID = {
        expression: '[mi_data_id]',
        condition: '=',
        value: globalOrg
      }
    } else if (config.orgFilter === 'WITH_CHILDS') {
      whereList.orgID = {
        expression: '[mi_treePath]',
        condition: 'like',
        value: `/${globalOrg}/%`
      }
    }
  }
  const res = {
    xtype: 'ubcombobox',
    name: config.name || 'organizationID',
    fieldLabel: config.fieldLabel || UB.i18n('Організація'),
    labelWidth: 120,
    gridFieldList: [{ name: valueField, visibility: false }, displayField, { name: 'parentUnitID.name', description: UB.i18n('Підпорядкування') },
    { name: 'tarifGroupID.name', description: UB.i18n('Тарифна група') }, 'jurisdiction', 'EDRPOUCode', 'taxCode'],
    valueField: valueField,
    displayField: displayField,
    allowBlank: config.allowBlank,
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    ubRequest: {
      entity: 'hr_organization',
      fieldList: fieldList,
      whereList: whereList,
      orderList: { orderBy: { expression: 'description' } },
      __mip_ondate: appAC.globalApplicationDate()
    },
    listeners: {
      render: function (ctrl) {
        ctrl.store.on('load', () => {
          if (!ctrl.store.isLoaded) {
            if (valueField === 'mi_data_id') {
              ctrl.setValueById(globalOrg)
            }
            ctrl.store.isLoaded = true
          }
        })
        ctrl.store.load()
      }
    }
  }
  return _.merge(res, config)
}

function getAttrOrgCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'mi_data_id'
  const displayField = config.displayField || 'description'
  config = config || {}
  const res = {
    attributeName: config.attributeName || 'organizationID',
    fieldLabel: config.fieldLabel || UB.i18n('Організація'),
    valueField: valueField,
    displayField: displayField,
    allowBlank: config.allowBlank,
    labelWidth: config.labelWidth || 120,
    fieldList: [valueField, displayField],
    gridFieldList: [{ name: valueField, visibility: false }, displayField, { name: 'parentUnitID.name', description: UB.i18n('Підпорядкування') },
    { name: 'tarifGroupID.name', description: UB.i18n('Тарифна група') }, 'jurisdiction', 'EDRPOUCode', 'taxCode'],
    whereList: {
      state: {
        expression: '[state]',
        condition: '=',
        values: {
          state: 'ACTIVE'
        }
      }
    },
    orderList: { orderBy: { expression: 'description' } },
    __mip_ondate: appAC.globalApplicationDate(),
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    listeners: {
      render: function (ctrl) {
        const form = ctrl.up('form')
        ctrl.store.on('load', () => {
          if (!ctrl.store.isLoaded) {
            if (valueField === 'mi_data_id') {
              if (form && !form.isEditMode) {
                ctrl.setValueById(appAC.globalOrganization())
                if (config.onSetDefaultOrg) {
                  config.onSetDefaultOrg(ctrl)
                }
              }
            }
            ctrl.store.isLoaded = true
          }
        })
        if (!form.isEditMode) {
          ctrl.store.load()
        }
      }
    }
  }
  return _.merge(res, config)
}

function getDepCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'mi_data_id'
  const displayField = config.displayField || 'name'
  const fieldList = [valueField, displayField, 'mi_treePath']
  const addFields = config.addFields
  if (addFields) {
    fieldList.push(...addFields)
  }
  config = config || {}
  const res = {
    xtype: 'ubcombobox',
    name: 'departmentID',
    fieldLabel: UB.i18n('Підрозділ'),
    labelWidth: 120,
    gridFieldList: ['code', displayField, valueField],
    valueField: valueField,
    displayField: displayField,
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    ubRequest: {
      entity: 'hr_department',
      fieldList: fieldList,
      whereList: {
        state: {
          expression: '[state]',
          condition: '=',
          values: {
            state: 'ACTIVE'
          }
        }
      },
      orderList: { orderBy: { expression: displayField } },
      __mip_ondate: appAC.globalApplicationDate()
    }
  }
  if (config.filterByGlobalOrg) {
    res.ubRequest.whereList.orgID = {
      expression: '[orgID]',
      condition: '=',
      values: {
        value: appAC.globalOrganization()
      }
    }
  }
  return _.merge(res, config)
}

function getAttrDepPosBlock (config) {
  function checkGlobalOrg (ctrl) {
    const me = ctrl.up('form')
    const orgIDField = config.orgIDField || 'organizationID'
    const orgID = me.record.get(orgIDField) || appAC.globalOrganization()
    const modes = ['clearStore']
    if (ctrl.name === 'departmentID') {
      filterUnitByOrg(ctrl, orgID, modes)
    } else if (ctrl.name === 'positionID') {
      filterUnitByParent(ctrl, orgID, modes)
    }
  }
  function recordLoadedOnce (record) {
    const me = this
    me.un('recordloaded', recordLoadedOnce)
    const departmentCtrl = me.getField('departmentID')
    const positionCtrl = me.getField('positionID')
    checkGlobalOrg(departmentCtrl)
    checkGlobalOrg(positionCtrl)
  }

  config = config || {}
  const valueField = config.valueField || 'ID'
  const displayField = config.displayField || 'name'
  const labelWidth = config.labelWidth || 140
  const fieldList = [valueField, displayField, 'mi_treePath']
  if (valueField !== 'mi_data_id') {
    fieldList.push('mi_data_id')
  }
  const whereList = config.whereList || {
    state: {
      expression: '[state]',
      condition: '=',
      values: { state: 'ACTIVE' }
    },
    orgID: {
      expression: '[orgID]',
      condition: '=',
      values: { value: appAC.globalOrganization() }
    }
  }
  const ubRequest = config.ubRequest || {
    orderList: { orderBy: { expression: displayField } },
    __mip_ondate: appAC.globalApplicationDate()
  }
  const depUbRequest = { ...ubRequest, entity: 'hr_department' }
  const posUbRequest = { ...ubRequest, entity: 'hr_position' }
  const depAttr = config.depAttr || 'departmentID'
  const posAttr = config.posAttr || 'positionID'
  const posCatWidth = config.posCatWidth || 250
  const depRightMargin = config.posCatWidth ? config.posCatWidth + 45 : posCatWidth + 15
  const depRowMargin = config.showPosCategory ? `0 ${depRightMargin} 0 0` : '0 15 0 0'
  // const fundSourceAttr = config.fundSourceAttr || 'dictFundSourceID'
  const res = {
    layout: { type: 'vbox', align: 'stretch' },
    items: [
      {
        layout: { type: 'hbox' },
        margin: depRowMargin,
        items: [
          {
            attributeName: depAttr,
            fieldLabel: config.depFieldLabel || UB.i18n('Підрозділ'),
            labelWidth: labelWidth,
            flex: 1,
            valueField: valueField,
            displayField: displayField,
            fieldList: fieldList,
            whereList: whereList,
            ubRequest: depUbRequest,
            gridFieldList: [ { name: valueField, visibility: false }, 'code', displayField, { name: 'parentName', description: UB.i18n('Підпорядкування') } ],
            hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
            disableModifyEntity: true,
            orgIDField: config.orgIDField,
            listeners: {
              render: function (ctrl) {
                // checkGlobalOrg(ctrl)
                ctrl.up('form').on('recordloaded', recordLoadedOnce)
              },
              change: function (ctrl) {
                if (ctrl.skipChange) {
                  delete ctrl.skipChange
                  return
                }
                const form = ctrl.up('form')
                const posCtrl = form.down(`[name=${posAttr}]`)
                const reco = AC.gridUtils.getCurrentRecord(ctrl)
                const depID = (reco && reco.get('mi_data_id')) || null
                filterUnitByParent(posCtrl, depID)
              }
            }
          },
          {
            xtype: 'button',
            cls: 'treeIconNotFocus',
            ubID: 'btnSelectByTree',
            width: 35,
            height: 35,
            margin: '0 2 0 -12',
            name: 'btnSelectByTree',
            listeners: {
              click: function (ctrl) {
                const me = ctrl.up('form')

                const departAttr = me.down(`[name=${depAttr}]`)
                if (departAttr && (departAttr.readOnly || departAttr.disabled)) return

                let useOnDate = config.onDateField ? me.record.get(config.onDateField) : null
                if (config.tryApplyOrderOnDate && !useOnDate) {
                  useOnDate = me.orderForm.attr.orderDate.value
                }

                if (useOnDate) {
                  showStaffTree(me, valueField, {
                    onDate: AC.dateService.truncTimeToUtcNull(useOnDate),
                    searchFeature: config.searchFeature,
                    dictFundSourceID: null
                  })
                } else {
                  showStaffTree(me, valueField, {
                    searchFeature: config.searchFeature,
                    dictFundSourceID: null
                  })
                }
              },
              focus: function setFocused (btn) {
                btn.removeCls('treeIconNotFocus')
                btn.addCls('treeIconFocus')
              },
              blur: function setNotFocused (btn) {
                btn.removeCls('treeIconFocus')
                btn.addCls('treeIconNotFocus')
              },
              render: ctrl => {
                ctrl.setTooltip(UB.i18n('Вибір підрозділу та посади з дерева орг. структури'))
              }
            }
          }
        ]
      }
    ]
  }
  const posCfg = {
    attributeName: posAttr,
    name: posAttr,
    fieldLabel: config.posFieldLabel || UB.i18n('Посада'),
    labelWidth: labelWidth,
    valueField: valueField,
    displayField: displayField,
    fieldList: fieldList.concat(['psCategory.name', 'psCategory', 'accrualSum', 'positionType', 'vacancyRate',
      'dictPositionID', 'payElID', 'departmentID', 'dictStaffCatID', 'dictStaffSubCatID', 'workScheduleID',
      'dictFundSourceID', 'dictCostTypeID', 'dictTarifCoeffID', 'dictEmpCategoryID', 'nameAddition'
    ]),
    gridFieldList: [ { name: valueField, visibility: false }, 'code', displayField, 'psCategory', 'positionType'/*,
      { name: 'parentUnitID.name', description: 'Підпорядкування' } */ ],
    whereList: whereList,
    ubRequest: posUbRequest,
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    orgIDField: config.orgIDField,
    listeners: {
      render: function (ctrl) {
        // checkGlobalOrg(ctrl)
      },
      change: function (ctrl) {
        const form = ctrl.up('form')
        const catCtrl = form.down('[name=posCategory]')
        if (catCtrl) {
          const reco = AC.gridUtils.getCurrentRecord(ctrl)
          const catName = (reco && reco.get('psCategory.name')) || ''
          catCtrl.setText(`${UB.i18n('Категорія посади:')} ${catName}`)
        }
      },
      select: ctrl => {
        const form = ctrl.up('form')
        const departmentID = ctrl.getFieldValue('departmentID')
        const depCtrl = form.getField('departmentID')
        if (!depCtrl || !departmentID || depCtrl.getFieldValue('mi_data_id') === departmentID) {
          return
        }
        depCtrl.skipChange = true
        depCtrl.setValueById(departmentID)
      }
    },
    ...config.posConfig || {}
  }
  if (config.vehicleField) {
    posCfg.fieldList.push(config.vehicleField)
  }
  if (config.showPosCategory) {
    posCfg.flex = 1
    const posPnl = {
      layout: { type: 'hbox' },
      items: [
        posCfg,
        {
          xtype: 'label',
          name: 'posCategory',
          text: UB.i18n('Категорія посади:'),
          cls: 'x-form-item-label',
          margin: config.posCatMargin || '10 0 5 0',
          width: posCatWidth
        }
      ]
    }
    res.items.push(posPnl)
  } else {
    res.items.push(posCfg)
  }
  return res
}

function get2DepCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'mi_data_id'
  const displayField = config.displayField || 'name'
  const onDate = AC.dateService.shiftDate(appAC.globalApplicationDate())
  const orgID = appAC.globalOrganization()
  const width = config.width || 650
  const labelWidth = config.labelWidth || 150
  config = config || {}
  const res = {
    layout: { type: config.layout || 'vbox' },
    defaults: { labelWidth: labelWidth },
    items: [
      {
        xtype: 'ubcombobox',
        name: 'structDepID',
        fieldLabel: UB.i18n('Самостійний підрозділ'),
        width: width,
        gridFieldList: ['code', displayField, valueField],
        valueField: valueField,
        displayField: displayField,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_department',
          fieldList: [valueField, displayField, 'nameGen'],
          whereList: {
            state: {
              expression: '[state]',
              condition: '=',
              values: {
                state: 'ACTIVE'
              }
            },
            orgID: {
              expression: '[orgID]',
              condition: '=',
              value: orgID
            },
            isStructDep: {
              expression: '[isStructDep]',
              condition: '=',
              value: true
            }
          },
          orderList: { orderBy: { expression: displayField } },
          __mip_ondate: onDate
        },
        listeners: {
          change: function (ctrl) {
            const form = ctrl.up('form')
            const childDepIDCtrl = form.down('[name=childDepID]')
            const onDateCtrl = form.down('[name=onDate]')
            const filterDate = (onDateCtrl && AC.dateService.shiftDate(onDateCtrl.getValue())) || onDate
            const orgCtrl = form.down('[name=organizationID]')
            const filterOrgID = (orgCtrl && orgCtrl.getValue()) || orgID
            const filter = [
              ['state', '=', 'ACTIVE'],
              ['orgID', '=', filterOrgID],
              ['isStructDep', '=', false]
            ]
            const structDep1ID = ctrl.getValue()
            if (structDep1ID) {
              filter.push(['parentUnitID', '=', structDep1ID])
            } else {
              filter.push(['isParentStructDep', '=', true])
            }
            childDepIDCtrl.__mip_ondate = filterDate
            AC.viewUtils.setWhereListProperty(childDepIDCtrl, filter, null, ['clearWhereList', 'clearStore', 'clearValue'])
          }
        }
      },
      {
        xtype: 'ubcombobox',
        name: 'childDepID',
        fieldLabel: UB.i18n('Підрозділ'),
        width: width,
        gridFieldList: ['code', displayField, valueField],
        valueField: valueField,
        displayField: displayField,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_department',
          fieldList: [valueField, displayField, 'nameGen', 'parentUnitID'],
          whereList: {
            state: {
              expression: '[state]',
              condition: '=',
              values: {
                state: 'ACTIVE'
              }
            },
            orgID: {
              expression: '[orgID]',
              condition: '=',
              value: orgID
            },
            departmentKindID: {
              expression: '[isStructDep]',
              condition: '=',
              value: false
            },
            parentUnitID: {
              expression: '[isParentStructDep]',
              condition: '=',
              value: true
            }
          },
          orderList: { orderBy: { expression: displayField } },
          __mip_ondate: onDate
        },
        listeners: {
          change: function (ctrl) {
            const form = ctrl.up('form')
            const childDep1ID = ctrl.getValue()
            if (childDep1ID) {
              const structDepIDCtrl = form.down('[name=structDepID]')
              const structDepID = structDepIDCtrl.getValue()
              if (!structDepID) {
                const structDepStore = structDepIDCtrl.getStore()
                if (!structDepStore.isLoaded) {
                  structDepStore.load()
                  structDepStore.isLoaded = true
                }
              }
            }
          }
        }
      }
    ]
  }
  return res
}

function getOneDepCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'mi_data_id'
  const displayField = config.displayField || 'name'
  const onDate = AC.dateService.shiftDate(appAC.globalApplicationDate())
  const orgID = appAC.globalOrganization()
  const width = config.width || 650
  const labelWidth = config.labelWidth || 150
  const childDepName = config.childDepName || 150
  const res = {
    layout: { type: 'vbox' },
    defaults: { labelWidth: labelWidth },
    items: [
      {
        xtype: 'ubcombobox',
        name: 'structDepID',
        fieldLabel: UB.i18n('Самостійний підрозділ'),
        width: width,
        gridFieldList: ['code', displayField, valueField],
        valueField: valueField,
        displayField: displayField,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_department',
          fieldList: [valueField, displayField, 'nameGen'],
          whereList: {
            state: {
              expression: '[state]',
              condition: '=',
              values: {
                state: 'ACTIVE'
              }
            },
            orgID: {
              expression: '[orgID]',
              condition: '=',
              value: orgID
            },
            isStructDep: {
              expression: '[isStructDep]',
              condition: '=',
              value: true
            }
          },
          orderList: { orderBy: { expression: displayField } },
          __mip_ondate: onDate
        },
        listeners: {
          change: function (ctrl) {
            const form = ctrl.up('form')
            const childDepIDCtrl = childDepName ? form.down(`[name=${childDepName}]`) : undefined
            const onDateCtrl = form.down('[name=onDate]')
            const filterDate = (onDateCtrl && AC.dateService.shiftDate(onDateCtrl.getValue())) || onDate
            const orgCtrl = form.down('[name=organizationID]')
            const filterOrgID = (orgCtrl && orgCtrl.getValue()) || orgID
            const filter = [
              ['state', '=', 'ACTIVE'],
              ['orgID', '=', filterOrgID],
              ['isStructDep', '=', false]
            ]
            const structDep1ID = ctrl.getValue()
            if (structDep1ID) {
              filter.push(['parentUnitID', '=', structDep1ID])
            } else {
              filter.push(['isParentStructDep', '=', true])
            }
            if (childDepIDCtrl) {
              childDepIDCtrl.__mip_ondate = filterDate
              AC.viewUtils.setWhereListProperty(childDepIDCtrl, filter, null, ['clearWhereList', 'clearStore', 'clearValue'])
            }
          }
        }
      }
    ]
  }
  return res
}

function getRespEmpCombo (config) {
  config = config || {}
  const res = {
    xtype: 'ubcombobox',
    name: 'respEmp',
    fieldLabel: config.fieldLabel || UB.i18n('Підписав'),
    labelWidth: config.labelWidth || 120,
    gridFieldList: ['description'],
    displayField: 'description',
    allowBlank: config.allowBlank,
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    ubRequest: {
      entity: 'hr_employeePositionS',
      fieldList: ['ID', 'description'],
      whereList: {
        organizationID: {
          expression: '[organizationID]',
          condition: '=',
          values: {
            value: appAC.globalOrganization()
          }
        },
        dateFrom: {
          expression: '[dateFrom]',
          condition: '<=',
          values: {
            value: appAC.globalApplicationDate()
          }
        },
        dateTo: {
          expression: '[dateTo]',
          condition: '>=',
          values: {
            value: appAC.globalApplicationDate()
          }
        },
        isActive: {
          expression: '[isActive]',
          condition: '=',
          values: {
            value: 1
          }
        }
      },
      orderList: { orderBy: { expression: 'description' } }
    },
    listeners: {
      render: function (ctrl) {
        if (config.defaultRefSigner) {
          ctrl.store.on('load', () => {
            if (!ctrl.store.isLoaded) {
              const orgID = appAC.globalOrganization()
              const onDate = appAC.globalApplicationDate()
              HR.reportUtils.getRefSignerInfo(orgID, onDate, ctrl, undefined, config.respPosition, config.onlyRespPosition).then(orgBossInfo => {
                if (orgBossInfo && orgBossInfo.ID && !config.skipAutoInput) {
                  ctrl.setValueById(orgBossInfo.ID)
                }
                ctrl.store.isLoaded = true
              })
            }
          })
        } else if (config.defaultOrgBoss) {
          ctrl.store.on('load', () => {
            if (!ctrl.store.isLoaded) {
              const orgID = appAC.globalOrganization()
              const onDate = appAC.globalApplicationDate()
              HR.reportUtils.getOrgBossInfo(orgID, onDate).then(orgBossInfo => {
                if (orgBossInfo && orgBossInfo.ID && !config.skipAutoInput) {
                  ctrl.setValueById(orgBossInfo.ID)
                }
                ctrl.store.isLoaded = true
              })
            }
          })
        }
        ctrl.store.load()
      }
    }
  }
  return _.merge(res, config)
}

function getRespPosEmpCombos (cfg) {
  cfg = cfg || {}
  const initialDate = appAC.globalApplicationDate()
  const orgID = appAC.globalOrganization()
  const width = cfg.width || 650
  const labelWidth = cfg.labelWidth || 150

  function filterRespEmp (form, posID) {
    const organizationIDCtrl = form.down('[name=organizationID]')
    const organizationID = (organizationIDCtrl && organizationIDCtrl.getValue()) || orgID
    const onDateCtrl = form.down('[name=onDate]')
    const onDate = (onDateCtrl && onDateCtrl.getValue()) || initialDate
    const respEmpIDCtrl = form.down('[name=respEmpID]')
    UB.Repository('hr_dictTempExecution')
      .attrs(['employeePositionID'])
      .where('organizationID', '=', organizationID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeePositionTempID.positionID', '=', posID)
      .selectAsObject()
      .then(tempExecData => {
        let whereArray = [['positionID', '=', posID, 'posID']]
        let logicalPredicates = null
        if (tempExecData.length) {
          whereArray.push(['ID', 'in', tempExecData.map(itm => itm.employeePositionID), 'IDList'])
          logicalPredicates = ['([posID] OR [IDList])']
        }
        AC.viewUtils.setWhereListProperty(respEmpIDCtrl, whereArray, logicalPredicates, ['clearStore', 'clearWhereList', 'clearValue'])
      })
  }

  return {
    layout: { type: 'vbox' },
    defaults: { labelWidth: labelWidth },
    items: [
      {
        xtype: 'ubcombobox',
        name: 'respPositionID',
        fieldLabel: UB.i18n('Посада'),
        valueField: 'mi_data_id',
        displayField: 'description',
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        gridFieldList: ['description'],
        width: width,
        disableContextMenu: true,
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_position',
          fieldList: ['mi_data_id', 'description', 'nameGen'],
          whereList: {
            orgID: {
              expression: '[orgID]',
              condition: '=',
              value: orgID
            },
            state: {
              expression: '[state]',
              condition: '=',
              value: 'ACTIVE'
            },
            mi_dateFrom: {
              expression: '[mi_dateFrom]',
              condition: '<=',
              value: initialDate
            },
            mi_dateTo: {
              expression: '[mi_dateTo]',
              condition: '>=',
              value: initialDate
            }
          },
          orderList: { orderBy: { expression: 'description' } }
        },
        listeners: {
          render: function (ctrl) {
            const store = ctrl.store
            function setDefVal () {
              const orgID = appAC.globalOrganization()
              const onDate = appAC.globalApplicationDate()
              HR.reportUtils.getRefSignerInfo(orgID, onDate).then(empPos => {
                if (empPos) {
                  ctrl.setValueById(empPos.positionID)
                  const form = ctrl.up('form')
                  filterRespEmp(form, empPos.positionID)
                }
              })
              store.un('load', setDefVal)
            }
            store.on('load', setDefVal)
            store.load()
          },
          change: function (ctrl) {
            const form = ctrl.up('form')
            let posID = ctrl.getValue() || 0
            filterRespEmp(form, posID)
          }
        }
      },
      {
        xtype: 'ubcombobox',
        name: 'respEmpID',
        fieldLabel: UB.i18n('Керівник'),
        displayField: 'description',
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        gridFieldList: ['description'],
        width: width,
        disableContextMenu: true,
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_employeePositionS',
          fieldList: ['ID', 'description', 'employeeID.shortFIO', 'positionID'],
          whereList: {
            organizationID: {
              expression: '[organizationID]',
              condition: '=',
              value: orgID
            },
            dateFrom: {
              expression: '[dateFrom]',
              condition: '<=',
              value: initialDate
            },
            dateTo: {
              expression: '[dateTo]',
              condition: '>=',
              value: initialDate
            },
            isOrgBoss: {
              expression: '',
              condition: 'subquery',
              subQueryType: 'exists',
              value: {
                entity: 'hr_orgRespPosition',
                fieldList: ['ID'],
                method: 'select',
                whereList: {
                  cond: {
                    expression: '[positionID]=[{master}.positionID]',
                    condition: 'custom'
                  },
                  mi_deleteDate: {
                    condition: 'equal',
                    expression: '[mi_deleteDate]',
                    value: '#maxdate'
                  },
                  organizationID: {
                    condition: 'custom',
                    expression: '[organizationID]=[{master}.organizationID]'
                  }
                }
              }
            }
          },
          orderList: { orderBy: { expression: 'description' } }
        }
      }
    ]
  }
}

function filterUnitByParent (ctrl, parentID, modes) {
  if (!ctrl) {
    return
  }
  const me = ctrl.up('form')
  modes = modes || ['clearStore', 'clearValue']
  const orgIDField = ctrl.orgIDField || 'organizationID'
  const orgID = me.record.get(orgIDField) // appAC.globalOrganization()
  const whereList = [
    ['orgID', '=', orgID]
  ]
  if (_.isArray(parentID)) {
    const pID = parentID.length ? parentID : [appAC.globalOrganization()]
    if (pID.length === 1) {
      whereList.push(['parentUnitID', '=', pID[0]])
    } else {
      whereList.push(['parentUnitID', 'in', pID])
    }
  } else {
    const pID = parentID || me.record.get(orgIDField)
    whereList.push(['parentUnitID', '=', pID])
  }
  if (ctrl.store && ctrl.store.ubRequest) {
    ctrl.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  }
  AC.viewUtils.setWhereListProperty(ctrl, whereList, null, modes)
}

function filterUnitByOrg (ctrl, orgID, modes) {
  if (!ctrl) {
    return
  }
  modes = modes || ['clearStore', 'clearValue']
  const whereList = [
    ['orgID', '=', orgID || appAC.globalOrganization()]
  ]
  if (ctrl.store && ctrl.store.ubRequest) {
    ctrl.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  }
  AC.viewUtils.setWhereListProperty(ctrl, whereList, null, modes)
}

function showStaffTree (form, valueField = 'ID', config = {}) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_staffTreeSelect',
    customParams: {
      organizationID: form.record.get('organizationID'),
      onDate: config.onDate || appAC.globalApplicationDate(),
      useFundSource: config.useFundSource,
      dictFundSourceID: config.dictFundSourceID,
      onSelectNodeHandler: tree => {
        const record = tree.getCurrentRecord()
        if (config.onSelectNodeHandler) {
          config.onSelectNodeHandler(record)
          return Promise.resolve(false)
        }
        if (form.isReadOnly) {
          return Promise.resolve(false)
        }
        let posID = null
        let depID = null
        const data = record.raw
        const posField = form.getField(config.posAttribute) || form.getField('positionID')
        const depField = form.getField('departmentID')
        const fundSourceField = form.getField(config.fundSourceAttr || 'dictFundSourceID')
        const pData = record.parentNode && record.parentNode.raw
        const depIDList = []
        switch (data.nodeType) {
          case 'DEPUNIT':
            depID = data[valueField]
            break
          case 'POSUNIT':
            posID = data[valueField]
            if (pData && pData.nodeType === 'DEPUNIT') {
              depID = pData[valueField]
            } else {
              let parent = record
              do {
                parent = parent.parentNode
                if (parent && parent.raw.nodeType === 'DEPUNIT' && parent.raw[valueField]) {
                  depIDList.push(parent.raw[valueField])
                }
              } while (parent && parent.raw.nodeType !== 'DEPUNIT')
              if (parent && parent.raw.nodeType === 'DEPUNIT') {
                depIDList.push(parent.raw[valueField])
                depID = parent.raw[valueField]
              }
            }
            break
        }
        if (posID || depID) {
          depField && depField.setValueById(depID)
          form.record.set('departmentID', depID)
          depField && filterUnitByParent(posField, depIDList.length ? depIDList : depID)
          if (posID) {
            posField.getStore().load(() => {
              posField.setValueById(posID)
              Ext.defer(() => {
                form.record.set(config.posAttribute || 'positionID', posID)
                if (config.useFundSource && !config.dictFundSourceID) {
                  if (fundSourceField) {
                    fundSourceField.skipChange = true
                    const value = posField.getFieldValue('dictFundSourceID')
                    fundSourceField.setValueById(value)
                    AC.viewUtils.setWhereListProperty(posField, [['dictFundSourceID', '=', value]], undefined, ['clearStore'])
                  }
                }
              }, 700)
            })
          }
        }
        Ext.defer(() => {
          posField.focus(true)
        }, 1000)
        return Promise.resolve(true)
      }
    }
  })
}

function checkAndSaveForm (form, callBackFn, failFn) {
  if (!form) {
    return Promise.resolve()
  }
  if (form.isDirty() || form.isNewInstance) {
    return form.saveForm().then(result => {
      if (result !== -1) {
        callBackFn && callBackFn()
      } else if (failFn) {
        failFn()
      }
      return Promise.resolve(result)
    })
  } else {
    callBackFn && callBackFn()
    return Promise.resolve(0)
  }
}

function acGridOnAddNewSaveForm (grid) {
  grid.onAddNew = function () {
    const form = grid.up('form')
    checkAndSaveForm(form, function () {
      grid.openForm()
    })
  }
}

/* use acGridDelAutoCommit acGrid with storeType = 'ub' */
function acGridDelAutoCommit (grid) {
  grid.getView().on('itemremove', function () {
    const gridSelection = grid.getSelectionModel().getSelection()
    if (gridSelection.length < 1) {
      return
    }
    const command = {
      entity: grid.ubStoreConfig.entity,
      method: 'delete',
      execParams: { ID: gridSelection[0].get('ID') }
    }
    $App.connection.run(command)
  })
}

function setUnusedVacationDayList ({ form, isSetDays = true, withNoCheck = false, showPeriods = false }) {
  const unusedVacationDayLabel = form.down('[name=unusedVacationDayLabel]')
  const reco = form.record
  const unusedVacationDayPanel = form.down('[name=unusedVacationDayPanel]')
  const dayDiffField = withNoCheck ? 'daysDiffNoCheck' : 'daysDiffOnDate'
  let employeePositionID = form.getField('employeePositionID').getValue()
  if (employeePositionID) {
    let onDate = form.getField('dateFrom').getValue()
    if (onDate && AC.dateService.isValid(onDate)) {
      onDate = AC.dateService.shiftDate(onDate)
    } else {
      onDate = appAC.globalApplicationDate()
    }
    $App.connection.run({
      entity: 'hr_empVacationPlan',
      method: 'selectAvailableVacationDays',
      employeePositionID: employeePositionID,
      orgID: reco.get('orderID.organizationID') || appAC.globalOrganization(),
      onDate: onDate,
      withPartTime: true,
      getPeriods: showPeriods,
      currTime: Date.now()
    }).then(mParams => {
      const empVacInfo = {
        data: []
      }
      const empVac = JSON.parse(mParams.resultData)
      const periods = showPeriods ? JSON.parse(mParams.repiods) : undefined
      const isLessThen6Months = mParams.isLessThen6Months
      let totalDays = 0
      let currentTabNum = -1
      const tabNumHeader = UB.i18n('Табельний номер')
      empVac.forEach(empVacItem => {
        totalDays += empVacItem[dayDiffField]
        if (currentTabNum !== empVacItem.tabNum) {
          currentTabNum = empVacItem.tabNum
          empVacInfo.data.push({ dictVacationKindID: 0, text: `${tabNumHeader} ${currentTabNum}` })
        }
        empVacInfo.data.push({ dictVacationKindID: empVacItem.dictVacationKindID, text: UB.i18n(`{0} - {1} дн.`, empVacItem.dictVacationKindName, empVacItem[dayDiffField]) })
      })
      const isLessThen6MonthsInfo = isLessThen6Months ? ` <span style="color: red; ">(${UB.i18n('на початок періоду відпустки відпрацьовано менше 6 місяців')})</span>` : ''
      const onDateStr = withNoCheck ? '' : `станом на дату ${AC.dateService.formatDate(onDate)} `
      empVacInfo.totalInfo = UB.i18n(`Невикористаних днів відпустки {0}- {1} дн.{2}`, onDateStr, totalDays, isLessThen6MonthsInfo)
      unusedVacationDayPanel.empVacInfo = empVacInfo
      unusedVacationDayPanel.setTitle(empVacInfo.totalInfo)
      let vacDayStr = ''
      if (empVacInfo.data.length) {
        empVacInfo.data.forEach(item => {
          if (item.dictVacationKindID === 0) {
            if (vacDayStr) {
              vacDayStr += '</ul>'
            }
            vacDayStr += item.text
            vacDayStr += '<ul>'
          } else {
            vacDayStr += `<li>${item.text}</li>`
            if (showPeriods) {
              let vacPeriods = periods.filter(per => per.dictVacationKindID === item.dictVacationKindID)
              if (vacPeriods.length > 0) {
                vacDayStr += '<ul>'
                vacPeriods.forEach(per => {
                  if (per.daysDiff) {
                    vacDayStr += `<li>${`${AC.dateService.formatDate(per.dateFrom)}-${AC.dateService.formatDate(per.dateTo)}: ${per.daysDiff} дн.`}</li>`
                  }
                })
                vacDayStr += '</ul>'
              }
            }
          }
        })
        if (vacDayStr) {
          vacDayStr += '</ul>'
        }
      }
      if (isSetDays) {
        let cntVacDay = form.getField('cntVacDay')
        if (cntVacDay && cntVacDay.getValue() !== totalDays) {
          cntVacDay.setValue(totalDays)
        }
      }
      unusedVacationDayLabel.setText(vacDayStr, false)
    })
  } else {
    unusedVacationDayPanel.setTitle(UB.i18n('Невикористані дні відпустки'))
  }
}

function getUnusedVacationDayPanel ({ panelConfig, labelConfig, dataConfig }) {
  panelConfig = panelConfig || {}
  labelConfig = labelConfig || {}
  dataConfig = dataConfig || {}
  const labelCfg = {
    xtype: 'label',
    name: 'unusedVacationDayLabel',
    cls: 'field-label-blue',
    padding: '5 5 5 5',
    flex: 1,
    ...labelConfig
  }
  return {
    xtype: 'panel',
    name: 'unusedVacationDayPanel',
    layout: { type: 'vbox', align: 'stretch' },
    collapsible: true,
    collapsed: true,
    cls: 'panel-bordered',
    header: {
      style: 'background-color: #e7e7e7;'
    },
    margin: '0 15 10 15',
    items: [
      labelCfg
    ],
    listeners: {
      afterrender: function (ctrl) {
        const form = ctrl.up('form')
        if (form) {
          form.on('formDataReady', function () {
            if (!form.isEditMode) {
              ctrl.collapsed && ctrl.expand()
            } else {
              !ctrl.collapsed && ctrl.collapse()
              if (!ctrl.collapsed) {
                ctrl.collapsed = true
              }
            }
            setUnusedVacationDayList({ form, isSetDays: false, withNoCheck: dataConfig.withNoCheck, showPeriods: dataConfig.showPeriods })
          })
          form.on('controlChanged', function (field) {
            if (form.isInnerChange) {
              return
            }
            if (form.formDataReady) {
              switch (field.name) {
                case 'employeePositionID':
                case 'dateFrom':
                  setUnusedVacationDayList({ form, isSetDays: false, withNoCheck: dataConfig.withNoCheck, showPeriods: dataConfig.showPeriods })
                  break
              }
            }
          }, form)
        }
      }
    },
    ...panelConfig
  }
}

function setEmpPosList (me) {
  const empPosLabel = me.down('[name=empPosLabel]')
  const empPosPanel = me.down('[name=empPosPanel]')
  empPosPanel.setTitle(UB.i18n('Призначення працівника'))
  let employeeID = me.getField('employeeID').getValue()
  if (employeeID) {
    let onDate = me.getField('dateFrom').getValue()
    if (onDate && AC.dateService.isValid(onDate)) {
      onDate = AC.dateService.shiftDate(onDate)
    } else {
      onDate = appAC.globalApplicationDate()
    }
    Promise.all([
      UB.Repository('hr_employeeNumberS')
        .attrs(['ID', 'tabNum'])
        .where('employeeID', '=', employeeID)
        .whereIf(me.record.get('organizationID'), 'orgID', '=', me.record.get('organizationID'))
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .orderBy('dateFrom')
        .selectAsObject(),
      UB.Repository('hr_employeePositionS')
        .attrs(['employeeNumberID', 'workPlace.name', 'posFullName', 'depName', 'dateFrom', 'dateToEmpty'])
        .where('employeeID', '=', employeeID)
        .whereIf(me.record.get('organizationID'), 'organizationID', '=', me.record.get('organizationID'))
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .selectAsObject()
    ]).then(([enData, empPosData]) => {
      let empPosStr = ''
      if (enData.length > 0) {
        empPosStr += '<ul>'
        enData.forEach(enItem => {
          let empPosItem = empPosData && empPosData.find(posItem => posItem.employeeNumberID === enItem.ID)
          if (empPosItem) {
            let dateFromStr = AC.dateService.formatDate(AC.dateService.shiftDate(empPosItem.dateFrom))
            let dateToStr = empPosItem.dateToEmpty ? AC.dateService.formatDate(AC.dateService.shiftDate(empPosItem.dateToEmpty)) : UB.i18n('т.ч.')
            let workPlace = empPosItem['workPlace.name'] ? ` (${empPosItem['workPlace.name']})` : ''
            let posName = empPosItem.posFullName
            let depName = empPosItem.depName ? ', ' + empPosItem.depName : ''
            empPosStr += `<li>${enItem.tabNum}${workPlace} - ${posName}${depName} (${dateFromStr} - ${dateToStr})</li>`
          } else {
            empPosStr += `<li>${enItem.tabNum} - ${UB.i18n('без призначень')}</li>`
          }
        })
        empPosStr += '</ul>'
      }
      empPosLabel.setText(empPosStr, false)
    })
  }
}

function getEmpPosPanel (panelConfig, labelConfig) {
  panelConfig = panelConfig || {}
  labelConfig = labelConfig || {}
  const labelCfg = {
    xtype: 'label',
    name: 'empPosLabel',
    cls: 'field-label-blue',
    padding: '5 5 5 5',
    flex: 1,
    ...labelConfig
  }
  return {
    xtype: 'panel',
    name: 'empPosPanel',
    layout: { type: 'vbox', align: 'stretch' },
    collapsible: true,
    collapsed: false,
    cls: 'panel-bordered',
    header: {
      style: 'background-color: #e7e7e7;'
    },
    margin: '0 15 10 15',
    items: [
      labelCfg
    ],
    listeners: {
      afterrender: function (ctrl) {
        const form = ctrl.up('form')
        if (form) {
          form.on('formDataReady', function () {
            ctrl.collapsed && ctrl.expand()
            setEmpPosList(form)
          })
          form.on('controlChanged', function (field) {
            if (form.isInnerChange) {
              return
            }
            if (form.formDataReady) {
              switch (field.name) {
                case 'employeeID':
                case 'dateFrom':
                  setEmpPosList(form)
                  break
              }
            }
          }, form)
        }
      }
    },
    ...panelConfig
  }
}

function getAppChildOrgCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'mi_data_id'
  const displayField = config.displayField || 'description'
  config = config || {}
  const res = {
    xtype: 'ubcombobox',
    name: config.name || 'organizationID',
    fieldLabel: config.fieldLabel || UB.i18n('Організація'),
    labelWidth: 120,
    gridFieldList: [{ name: valueField, visibility: false }, displayField, { name: 'parentUnitID.name', description: UB.i18n('Підпорядкування') },
    { name: 'tarifGroupID.name', description: UB.i18n('Тарифна група') }, 'jurisdiction', 'EDRPOUCode', 'taxCode'],
    valueField: valueField,
    displayField: displayField,
    allowBlank: config.allowBlank,
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    ubRequest: {
      entity: 'hr_organization',
      fieldList: [valueField, displayField],
      whereList: {
        state: {
          expression: '[state]',
          condition: '=',
          values: {
            state: 'ACTIVE'
          }
        },
        child: {
          expression: '[mi_treePath]',
          condition: 'like',
          values: {
            'orgId': appAC.globalOrganization()
          }
        }
      },
      orderList: { orderBy: { expression: 'description' } },
      __mip_ondate: appAC.globalApplicationDate()
    },
    listeners: {
      render: function (ctrl) {
        ctrl.store.on('load', () => {
          if (!ctrl.store.isLoaded) {
            if (valueField === 'mi_data_id') {
              ctrl.setValueById(appAC.globalOrganization())
            }
            ctrl.store.isLoaded = true
          }
        })
        ctrl.store.load()
      }
    }
  }
  return _.merge(res, config)
}

function getIDNameCombo (config) {
  config = config || {}
  const fieldID = config.fieldID
  const fieldName = config.fieldName
  const displayField = config.displayField || 'name'
  const valueField = config.valueField || 'ID'
  const maxLength = config.maxLength || 100
  let res = {
    xtype: 'ubcombobox',
    gridFieldList: config.gridFieldList || [displayField, 'code', { name: valueField, visibility: false }],
    name: fieldName,
    isFormField: true,
    valueField: displayField,
    displayField: displayField,
    allowCustomText: true,
    disableModifyEntity: true,
    triggerCls: 'hr-list-trigger',
    maxLength: maxLength,
    listeners: {
      render: function (ctrl) {
        const form = ctrl.up('form')
        ctrl.onControlChange = config.onControlChange
        ctrl.isInnerChange = false
        /* Вибір з довідника */
        form.on('recordloaded', () => {
          ctrl.isInnerChange = true
          ctrl.setValue(form.record.get(fieldName))
          ctrl.isInnerChange = false
        })
        ctrl.on('change', () => {
          if (ctrl.isInnerChange) {
            return
          }
          let oldValue = form.record.get(fieldName)
          if (oldValue !== ctrl.rawValue) {
            form.record.set(fieldName, ctrl.rawValue || null)
            const ctrlReco = AC.gridUtils.getCurrentRecord(ctrl)
            let value = (ctrlReco && ctrlReco.get(valueField)) || null
            form.record.set(fieldID, value)
            if (ctrl.onControlChange) {
              ctrl.onControlChange(ctrl, ctrl.rawValue)
            }
          }
        })
      },
      /* Вибір з combo */
      select: ctrl => {
        const form = ctrl.up('form')
        const ctrlReco = AC.gridUtils.getCurrentRecord(ctrl)
        ctrl.setValue(ctrl.rawValue)
        form.record.set(fieldName, ctrl.rawValue)
        let value = (ctrlReco && ctrlReco.get(valueField)) || null
        form.record.set(fieldID, value)
        if (ctrl.onControlChange) {
          ctrl.onControlChange(ctrl, ctrl.rawValue)
        }
      },
      blur: ctrl => {
        const form = ctrl.up('form')
        ctrl.setValue(ctrl.rawValue)
        form.record.set(fieldName, ctrl.rawValue)
        if (ctrl.onControlChange) {
          ctrl.onControlChange(ctrl, ctrl.rawValue)
        }
      },
      focus: ctrl => {
        ctrl.inputEl.dom.setAttribute('maxlength', maxLength)
      }
    }
  }
  delete config.fieldID
  delete config.fieldName
  res = _.merge(res, config)
  return res
}

function getEduOrgCombo (config) {
  config = config || {}
  config.fieldID = config.fieldID || 'educationOrgID'
  config.fieldName = config.fieldName || 'educationName'
  const fieldLabel = config.fieldLabel || UB.i18n('Заклад освіти')
  const maxLength = config.maxLength || 200
  const isChangeDocIssuer = config.isChangeDocIssuer
  config = _.merge(config, {
    fieldLabel: fieldLabel,
    allowBlank: config.allowBlank === undefined ? false : config.allowBlank,
    ubRequest: {
      entity: 'ac_contractor',
      fieldList: ['ID', 'name'],
      whereList: config.whereList || {
        orgBusinessType: {
          expression: '[orgBusinessTypeID.code]',
          condition: 'equal',
          value: 'edu'
        }
      },
      orderList: { orderBy: { 'expression': 'name', 'order': 'asc' } }
    },
    maxLength: maxLength,
    listeners: {
      focus: ctrl => {
        ctrl.inputEl.dom.setAttribute('maxlength', maxLength)
      },
      change: ctrl => {
        let me = ctrl.up('form')
        if (isChangeDocIssuer) {
          if (!me.attr.docIssuer.getValue() || !me.attr.employeeDocID.getValue()) {
            me.attr.docIssuer.setValue(me.attr.educationName.getValue())
          }
        }
      }
    }
  })
  return getIDNameCombo(config)
}

/* Виправлення помилки UBMultiSelectBox v.5.16, "unknown val type (source: orderList, valType=lvtObjArray)" */
function fixMultiSelectBox () {
  UB.ux.form.field.UBMultiSelectBox.prototype.onTriggerClick = function () {
    const me = this
    let win
    let storeMain
    let bBar
    let searchCtrl
    let doQueryTask
    let storeSel
    let allGrid
    let isInitialSelect = false
    let request

    function updateSelection () {
      var selModel = allGrid.getSelectionModel()
      isInitialSelect = true
      storeSel.each(function (record) {
        var rec; var idx = -1
        rec = storeMain.findRecord(me.valueField, record.get(me.valueField))
        if (rec) {
          idx = storeMain.indexOf(rec)
        }
        if (idx >= 0) {
          selModel.select(idx, true, true)
        }
      }, me)
      isInitialSelect = false
    }

    if (me.store.ubRequest) {
      request = Ext.clone(me.store.ubRequest)
      /* orderList assignment fix */
      if (!(request.orderList && Object.keys(request.orderList).length > 0)) {
        request.orderList = {
          _asc: {
            expression: me.displayField,
            order: 'ASC'
          }
        }
      }
      storeMain = Ext.create('UB.ux.data.UBStore', {
        ubRequest: request,
        autoLoad: false,
        autoDestroy: true,
        pageSize: 20000
      })
      storeMain.load()
      storeMain.on('load', function () {
        if (allGrid) {
          updateSelection()
        }
      })
    } else {
      storeMain = Ext.create('Ext.data.Store', {
        model: me.store.model,
        sorters: [{
          property: me.displayField
        }],
        proxy: {
          type: 'memory',
          enablePaging: true
        },
        autoLoad: false,
        autoDestroy: true
      })
      storeMain.load()
      storeMain.add(me.store.getRange(0, me.store.getCount() - 1))
    }

    bBar = Ext.widget('toolbar', {
      dock: 'bottom',
      border: '1 0 0 0',
      cls: 'ub-grid-info-panel',
      style: 'border-top-width: 1px !important;',
      items: [
        Ext.widget('tbfill'),
        Ext.widget('tbseparator'),
        me.pagingBar = Ext.create('UB.view.PagingToolbar', {// xtype: 'pagingtoolbar', 'Ext.toolbar.Paging'
          isPagingBar: true,
          cls: 'ub-grid-info-panel',
          border: 0,
          margin: 0,
          padding: '0 0 0 5',
          width: 180,
          store: storeMain
        })
      ]
    })

    if (!me.store.ubRequest) {
      bBar.hide()
    }

    doQueryTask = new Ext.util.DelayedTask(function () {
      var value = searchCtrl.getValue()
      if (value === '') {
        storeMain.filters.removeAtKey('searchTask')
        storeMain.clearFilter()
      } else {
        storeMain.filter({
          id: 'searchTask',
          property: me.displayField,
          condition: UB.core.UBCommand.condition.sqlecLike,
          value: searchCtrl.getValue()
        })
      }
    }, me)
    searchCtrl = Ext.widget('textfield', {
      labelWidth: 60,
      fieldLabel: UB.i18n('filter')
    })
    searchCtrl.on('change', function (sender, newVal) {
      doQueryTask.delay(me.queryDelay)
    })

    storeSel = Ext.create('Ext.data.Store', {
      model: me.store.model,
      sorters: [{
        property: me.displayField
      }],
      proxy: {
        type: 'memory'
      }
    })

    var val = me.getValue()
    if (val && val.length > 0) {
      if (me.store.ubRequest) {
        request = Ext.clone(me.store.ubRequest)
        delete request.orderList
        request.whereList = request.whereList || {}
        var valuesExpr = {}
        valuesExpr[me.valueField] = val
        request.whereList['selectedItems' + Date.now()] = {
          condition: 'in',
          expression: '[' + me.valueField + ']',
          values: valuesExpr
        }
        Ext.create('UB.ux.data.UBStore', { ubRequest: request }).load()
          .then(function (store) {
            storeSel.add(store.getRange(0, store.getCount() - 1))
            updateSelection()
          })
      } else {
        _.forEach(val, function (elm) {
          var rec = me.store.findRecord(me.valueField, elm)
          if (rec) {
            storeSel.add(rec)
          }
        })
      }
    }

    win = Ext.create('Ext.window.Window', {
      padding: '5 5 0 5',
      height: 450,
      width: 550,
      modal: true,
      stateful: !!me.store.ubRequest,
      stateId: 'nultiselect_' + (me.store.ubRequest ? me.store.ubRequest.entity : ''),
      layout: 'fit',
      title: UB.i18n('selectElements') + (me.fieldLabel ? ' - ' + me.fieldLabel : ''),
      items: [{
        layout: { type: 'hbox' },
        items: [ Ext.widget('grid', {
          xtype: 'grid',
          hideHeaders: true,
          flex: 1,
          title: UB.i18n('selectedElements'),
          store: storeSel,
          tbar: {
            items: []
          },
          columns: [{
            name: 'id',
            width: 25,
            dataIndex: me.valueField,
            renderer: function (value) {
              return '<a style="color: #141b9b; cursor:pointer;" class="fa fa-times"></a>'
            }
          },
          { name: 'name', dataIndex: me.displayField, flex: 1 }
          ],
          listeners: {
            cellclick: function (grd, td, cellIndex, record, tr, rowIndex, e, eOpts) {
              if (cellIndex === 0) {
                storeSel.remove(record)
                var idx = -1; var selModel = allGrid.getSelectionModel()
                var rec = storeMain.findRecord(me.valueField, record.get(me.valueField))
                if (rec) {
                  idx = storeMain.indexOf(rec)
                }
                if (idx >= 0) {
                  selModel.deselect(idx, true)
                }
              }
            },
            scope: me
          }
        }), {
          xtype: 'splitter'
        }, allGrid = Ext.widget('grid', {
          selModel: {
            selType: 'checkboxmodel',
            checkOnly: true,
            pruneRemoved: false,
            showHeaderCheckbox: true,
            listeners: {
              select: function (grd, record, index) {
                if (!isInitialSelect) {
                  storeSel.add(record)
                }
              },
              deselect: function (grd, record, index) {
                if (!isInitialSelect) {
                  var rec = storeSel.findRecord(me.valueField, record.get(me.valueField))
                  if (rec) {
                    storeSel.remove(rec)
                  }
                }
              },
              scope: me
            }
          },
          hideHeaders: true,
          flex: 1,
          title: UB.i18n('allElements'),
          store: storeMain,
          hideActionToolbar: true,
          tbar: {
            items: [searchCtrl]
          },
          bbar: bBar,
          columns: [
            { name: 'name', dataIndex: me.displayField, flex: 1 }
          ]
        })
        ]
      }],
      buttons: [{
        text: UB.i18n('clear'),
        iconCls: 'fa fa-eraser',
        handler: function () {
          storeSel.removeAll()
          isInitialSelect = true
          allGrid.getSelectionModel().deselectAll(true)
          isInitialSelect = false
        }
      }, {
        text: UB.i18n('selectAll'),
        tooltip: UB.i18n('selectAllOnPage'),
        handler: function () {
          var sm = allGrid.getSelectionModel(); var items = []; var rec
          sm.selectAll(true)
          sm.selected.each(function (record) {
            rec = storeSel.findRecord(me.valueField, record.get(me.valueField))
            if (!rec) {
              items.push(record)
            }
          })
          storeSel.add(items)
        }
      }, {
        xtype: 'panel',
        flex: 1
      }, {
        text: UB.i18n('ok'),
        iconCls: 'fa fa-check',
        handler: function () {
          me.setValue(storeSel.getRange(0, storeSel.getCount() - 1))
          win.close()
          me.fireEvent('itemSelected', me)
        }
      }, {
        text: UB.i18n('cancel'),
        iconCls: 'fa fa-times',
        handler: function () {
          win.close()
        }
      }]
    })

    win.center()
    win.show()
    updateSelection()

    win.on('close', function () {
      doQueryTask.cancel()
    })
  }
}

function setPeriodAbsenceList (me, params) {
  const periodAbsencePanel = me.down('[name=periodAbsencePanel]')
  const periodAbsenceLabel = me.down('[name=periodAbsenceLabel]')
  const employeePositionCtrl = me.getField('employeePositionID')
  const employeePositionReco = AC.gridUtils.getCurrentRecord(employeePositionCtrl)
  const dateToCtrl = me.getField(params.dateToField)
  const dateTo = dateToCtrl && dateToCtrl.getValue()
  if (employeePositionReco && dateTo) {
    $App.connection.run({
      entity: 'hr_empOrderTrialprolongDet',
      method: 'getTimeSheetAbsences',
      employeeNumberID: employeePositionReco.get('employeeNumberID'),
      dateFrom: employeePositionReco.get('dateFrom'),
      dateTo: dateTo
    }).then(mParams => {
      let vacInfo = JSON.parse(mParams.result)
      let totalDays = (vacInfo && vacInfo.totalDayCount) || 0
      let absDayStr = ''
      if (totalDays > 0) {
        if (vacInfo.data && vacInfo.data.length) {
          absDayStr += '<ul>'
          vacInfo.data.forEach(item => {
            absDayStr += `<li>${item.name}: ${item.dayCount} ${UB.i18n('дн.')} ${UB.i18n('з')} ${AC.dateService.formatDate(item.dateFrom)} ${UB.i18n('по')} ${AC.dateService.formatDate(item.dateTo)}</li>`
          })
          absDayStr += '</ul>'
        }
      }
      periodAbsencePanel.setTitle(UB.i18n(`Впродовж випробувального терміну кількість невиходів - {0} дн.`, totalDays))
      periodAbsenceLabel.setText(absDayStr, false)
    })
  } else {
    periodAbsencePanel.setTitle(UB.i18n('Невиходи працівника'))
    periodAbsenceLabel.setText('')
  }
}

function getPeriodAbsencePanel (params, panelConfig, labelConfig) {
  panelConfig = panelConfig || {}
  labelConfig = labelConfig || {}
  const labelCfg = {
    xtype: 'label',
    name: 'periodAbsenceLabel',
    cls: 'field-label-blue',
    flex: 1,
    ...labelConfig
  }
  return {
    xtype: 'panel',
    name: 'periodAbsencePanel',
    layout: { type: 'vbox', align: 'stretch' },
    collapsible: true,
    collapsed: true,
    cls: 'panel-bordered',
    header: {
      style: 'background-color: #e7e7e7;'
    },
    margin: '0 15 10 15',
    items: [
      labelCfg
    ],
    listeners: {
      afterrender: function (ctrl) {
        const form = ctrl.up('form')
        if (form) {
          form.on('formDataReady', function () {
            if (!form.isEditMode) {
              ctrl.collapsed && ctrl.expand()
            } else {
              !ctrl.collapsed && ctrl.collapse()
              if (!ctrl.collapsed) {
                ctrl.collapsed = true
              }
            }
            setPeriodAbsenceList(form, params)
          })
          if (params.setChangeEvent) {
            form.on('controlChanged', function (field) {
              if (form.isInnerChange) {
                return
              }
              if (form.formDataReady) {
                switch (field.name) {
                  case 'employeePositionID':
                  case params.dateChangeField:
                    setPeriodAbsenceList(form, params)
                    break
                }
              }
            }, form)
          }
        }
      }
    },
    ...panelConfig
  }
}

function filterEmpPosCtrl (form, posField, dateFromField, dateToField, toChangeFields) {
  const me = form
  if (me.isReadOnly) {
    return
  }
  const posCtrl = me.getField(posField)
  const dateFromCtrl = me.getField(dateFromField)

  posCtrl.setDisabled(false)
  if (AC.dateService.isValid(dateFromCtrl.getValue())) {
    const dateFrom = AC.dateService.truncTimeToUtcNull(dateFromCtrl.getValue())
    AC.viewUtils.setWhereListProperty(posCtrl, [
      ['dateFrom', '<=', dateFrom],
      ['dateTo', '>=', dateFrom]
    ])
    posCtrl.getStore().load()

    if (toChangeFields) {
      if (posCtrl.getValue()) {
        UB.Repository('hr_employeePositionS')
          .attrs('ID')
          .where('employeeNumberID', '=', posCtrl.getFieldValue('employeeNumberID'))
          .where('dateFrom', '<=', dateFrom)
          .where('dateTo', '>=', dateFrom)
          .selectSingle().then((item) => {
            posCtrl.setValueById(item ? item.ID : null)
          })
      }
    }
  }
}

function getOrderCombo (config) {
  config = config || {}
  const valueField = config.valueField || 'orderID'
  const displayField = config.displayField || 'orderID.description'
  let whereList = {
    isGroup: {
      expression: '[isGroup]',
      condition: '=',
      value: false
    },
    orderState: {
      expression: '[orderID.orderState]',
      condition: '=',
      value: 'POSTED'
    },
    organizationID: {
      expression: '[orderID.organizationID]',
      condition: '=',
      values: {
        value: appAC.globalOrganization()
      }
    }
  }
  if (config.empOrderType) {
    whereList.empOrderType = {
      expression: '[empOrderType]',
      condition: 'in',
      value: config.empOrderType
    }
  }
  if (config.employeeID) {
    whereList.employeeID = {
      condition: '=',
      expression: '[employeeID]',
      value: config.employeeID
    }
  }
  whereList = config.whereList ? _.merge(whereList, config.whereList) : whereList

  const res = {
    xtype: 'ubcombobox',
    name: config.name || 'orderID',
    fieldLabel: config.fieldLabel || UB.i18n('Наказ'),
    labelWidth: 120,
    gridFieldList: [
      { name: valueField, visibility: false }, { name: displayField, description: config.displayFieldDescription || UB.i18n('Опис наказу') },
      { name: 'orderID.empOrderType', description: UB.i18n('Тип наказу') },
      { name: 'orderID.orderDate', description: UB.i18n('Дата наказу'), format: 'd.m.Y' },
      { name: 'orderID.orderNumber', description: UB.i18n('Номер наказу') },
      { name: 'orderID.orderState', visibility: false }],
    valueField: valueField,
    displayField: displayField,
    allowBlank: config.allowBlank,
    hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
    disableModifyEntity: true,
    ubRequest: {
      entity: 'hr_empOrderDet',
      fieldList: [valueField, displayField, 'dateFrom', 'dateTo'],
      whereList: whereList,
      logicalPredicates: config.logicalPredicates || [],
      orderList: {
        orderBy: { expression: 'orderID.orderDate', order: 'desc' }
      }
    },
    listeners: {
      render: function (ctrl) {
        ctrl.store.on('load', () => {
          if (!ctrl.store.isLoaded) {
            const fltr = ctrl.store.data.items.filter(item => item.data['dateFrom'] <= appAC.globalApplicationDate() && (!item.data['dateTo'] || item.data['dateTo'] >= appAC.globalApplicationDate()))
            if (fltr && fltr.length && fltr[0].data['orderID']) {
              ctrl.setValueById(fltr[0].data['orderID'])
            }
            ctrl.store.isLoaded = true
          }
        })
        ctrl.store.load()
      }
    }
  }
  return _.merge(res, config)
}

function setFormErrors (form, formErrors, newErrors, errorTag, showMessage = false, errorLabelName = 'errors', aggregateErrors = false) {
  let result = []
  const errorLabel = form.down(`[name=${errorLabelName}]`)
  if (formErrors.length) {
    if (aggregateErrors) {
      result = result.concat(formErrors)
    } else {
      result = result.concat(formErrors.filter(err => err.tag !== errorTag && err.tag !== 0))
    }
  }
  if (newErrors.length) {
    newErrors.forEach(err => {
      if (!result.find(resItem => resItem.code === err.code)) {
        result.push(err)
      }
    })
  }
  let msg = getFormErrorsText(result)
  if (msg.length && showMessage) {
    $App.dialogInfo(msg, UB.i18n('Увага'))
  }
  errorLabel && errorLabel.setText(msg, false)
  return result
}

function getFormErrorsText (errors) {
  let res = ''
  if (errors && errors.length) {
    let items = []
    errors.forEach(err => {
      items.push(`<li>${err.msg}</li>`)
    })
    res = `${UB.i18n('Виявлені помилки')}:<br><ul>${items.join(' ')}</ul>`
  }
  return res
}

/** Row edit validation Promise support */
function validateEditPromiseSupport () {
  Ext.override(Ext.grid.plugin.RowEditing, {
    completeEdit: function () {
      const me = this
      if (me.editing) {
        const grid = me.context.grid
        if (grid && grid.validateEditPromiseFn) {
          grid.validateEditPromiseFn(me, me.context)
            .then(res => {
              if (res && me.validateEdit()) {
                me.editing = false
                me.fireEvent('edit', me, me.context)
              }
            })
        } else if (me.validateEdit()) {
          me.editing = false
          me.fireEvent('edit', me, me.context)
        }
      }
    },
    cancelEdit: function () {
      const me = this
      if (me.editing) {
        me.getContextFieldValues()
        me.getEditor().cancelEdit()
        const grid = me.context.grid
        if (grid && grid.cancelEditPromiseFn) {
          grid.cancelEditPromiseFn(me, me.context)
            .then(res => {
              me.editing = false
              me.fireEvent('canceledit', me, me.context)
            })
        } else {
          me.editing = false
          me.fireEvent('canceledit', me, me.context)
        }
        return
      }
      return true
    }
  })
}

function setValidateEditPromise (grid, fn) {
  grid.validateEditPromiseFn = fn
}

function setCancelEditPromise (grid, fn) {
  grid.cancelEditPromiseFn = fn
}

function checkErrorsOnClose (form, customCheckFn) {
  const me = form
  function doCloseWindow (win) {
    me.isClosing = true
    if (me.errorsIsNotSaved) {
      me.saveForm().then(function (saveStatus) {
        if (saveStatus >= 0) {
          me.closeWindow(true)
        }
      })
      return false
    }
    return me.beforeClose()
  }

  const wnd = me.getFormWin()
  wnd.on('beforeclose', win => {
    if (!me.dontCloseOnError && (win.closeForce || me.closeForce)) {
      return true
    }
    if (me.errors && me.errors.length) {
      if (me.canClose) {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Виявлені помилки. Продовжити?'))
          .then(res => {
            if (res) {
              let canClose = doCloseWindow(win)
              if (canClose) {
                me.closeWindow(true)
              }
            }
          })
      } else if (customCheckFn) {
        customCheckFn(me)
      } else {
        $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Виявлені помилки. Відмінити зміни і закрити?'))
          .then(res => {
            if (res) {
              me.closeWindow(true)
            }
          })
      }
      return false
    }
    return doCloseWindow(win)
  })
}

function setRowEditComboValueById (combo, id, callBackFn) {
  if (combo.xtype === 'ubcombobox') {
    const valueFieldSaved = combo.valueField
    combo.valueField = 'ID'
    try {
      combo.setValueById(id, undefined, callBackFn)
    } finally {
      combo.valueField = valueFieldSaved
    }
  } else {
    combo.setValue(id)
  }
}

/* UbGrid: Виділити запис з індексом params.idx чи з params.idxCode і відкрити форму редагування */
function selectAndEdit (grid, params) {
  function doSelectAndEdit () {
    let idx
    if (params.idxCode) {
      switch (params.idxCode) {
        case 'first':
          idx = 0
          break
        case 'last':
          idx = grid.store.getCount() - 1
          break
      }
    } else {
      idx = params.idx
    }
    if (idx >= 0) {
      grid.getSelectionModel().select(grid.store.getAt(idx))
      grid.doOnEdit()
    }
    grid.store.un('load', doSelectAndEdit)
  }
  grid.store.on('load', doSelectAndEdit)
}

function getVacationGroupPanel (form, cfg) {
  cfg = cfg || {}

  const orderForm = form.orderForm || form.sender.up('form')
  if (orderForm) {
    form.on('afterrender', () => {
      const reasonField = form.down('[name=reason]')
      orderForm.makeReasonSelector(form, { reasonField: reasonField, entityName: 'hr_dictReasonVacation' })
    }, form)
  }

  form.setVacationDays = function () {
    if (form.isInnerChange) {
      return
    }
    const dateFromCtrl = form.down('[name=dateFrom]')
    const dateFrom = dateFromCtrl.getValue()
    const dateToCtrl = form.down('[name=dateTo]')
    const dateTo = dateToCtrl.getValue()
    const dayCountCtrl = form.down('[name=dayCount]')
    if (!AC.dateService.isValid(dateFrom) || !AC.dateService.isValid(dateTo)) {
      form.isInnerChange = true
      try {
        dayCountCtrl.setValue(null)
      } finally {
        form.isInnerChange = false
      }
      return
    }
    $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getCalendDays4Vac',
      dateFrom: dateFrom,
      dateTo: dateTo,
      // monkey request prevention
      currTime: Date.now()
    }).then(mParams => {
      form.isInnerChange = true
      try {
        dayCountCtrl.setValue(mParams.daysCount)
      } finally {
        form.isInnerChange = false
      }
    })
  }

  form.setVacationDateTo = function () {
    if (form.isInnerChange) {
      return
    }
    const dateFromCtrl = form.down('[name=dateFrom]')
    const dateFrom = dateFromCtrl.getValue()
    const dateToCtrl = form.down('[name=dateTo]')
    const dayCountCtrl = form.down('[name=dayCount]')
    const dayCount = dayCountCtrl.getValue()
    if (!AC.dateService.isValid(dateFrom) || !dayCount) {
      form.isInnerChange = true
      try {
        dateToCtrl.setValue(null)
      } finally {
        form.isInnerChange = false
      }
      return
    }
    $App.connection.run({
      entity: 'hr_empOrder',
      method: 'getCalendDateTo4Vac',
      dateFrom: dateFrom,
      dayCount: dayCount,
      // monkey request prevention
      currTime: Date.now()
    }).then(mParams => {
      let dateTo = new Date(mParams.dateTo)
      if (AC.dateService.isValid(dateTo)) {
        form.isInnerChange = true
        try {
          dateToCtrl.setValue(dateTo)
        } finally {
          form.isInnerChange = false
        }
      }
    })
  }

  form.setHolidayInfo = function () {
    const holidayInfo = form.down('[name=holidayInfo]')
    const dateFromCtrl = form.down('[name=dateFrom]')
    const dateFrom = dateFromCtrl.getValue()
    const dateToCtrl = form.down('[name=dateTo]')
    const dateTo = dateToCtrl.getValue()
    HR.timeService.setHolidayInfo(holidayInfo, dateFrom, dateTo, appAC.globalOrganization())
  }

  function deleteRow () {
    const gridEmployees = form.down('[name=employees]')
    const currRecord = AC.gridUtils.getCurrentRecord(gridEmployees)
    if (currRecord) {
      gridEmployees.getStore().remove(currRecord)
    }
  }

  const ctxMenu = new Ext.menu.Menu({
    items: [
      {
        text: UB.i18n('Видалити'),
        iconCls: 'fa fa-trash-o',
        handler: () => {
          deleteRow()
        }
      }
    ]
  })

  return {
    layout: { type: 'vbox', align: 'stretch' },
    defaults: { labelWidth: 130 },
    items: [
      {
        xtype: 'ubcombobox',
        name: 'dictVacationKindID',
        fieldLabel: UB.i18n('Вид відпустки'),
        margin: '10 5 5 15',
        displayField: 'name',
        ubRequest: {
          entity: 'hr_dictVacationKind',
          fieldList: ['ID', 'code', 'name'],
          whereList: cfg.dictVacationKind && cfg.dictVacationKind.whereList,
          logicalPredicates: cfg.dictVacationKind && cfg.dictVacationKind.logicalPredicates,
          orderList: {
            orderBy: {
              expression: 'name',
              order: 'asc'
            }
          }
        }
      },
      {
        layout: { type: 'hbox' },
        items: [
          {
            xtype: 'datefield',
            name: 'dateFrom',
            fieldLabel: UB.i18n('Дата початку'),
            allowBlank: false,
            margin: '5 5 5 15',
            labelWidth: 130,
            width: 250,
            listeners: {
              change: () => {
                form.setVacationDays()
                form.setHolidayInfo()
              }
            }
          },
          {
            xtype: 'datefield',
            name: 'dateTo',
            fieldLabel: UB.i18n('Дата закінчення'),
            allowBlank: false,
            margin: '5 5 5 5',
            labelWidth: 130,
            width: 250,
            listeners: {
              change: () => {
                form.setVacationDays()
                form.setHolidayInfo()
              }
            }
          },
          {
            xtype: 'numberfield',
            name: 'dayCount',
            fieldLabel: UB.i18n('Днів'),
            allowBlank: false,
            vtype: 'numberValidator',
            margin: '5 5 5 5',
            decimalPrecision: 0,
            labelWidth: 50,
            width: 130,
            listeners: {
              change: () => {
                form.setVacationDateTo()
              }
            }
          }
        ]
      },
      {
        xtype: 'label',
        name: 'holidayInfo',
        text: '',
        cls: 'x-form-item-label field-label-red',
        margin: '10 10 5 15'
      },
      {
        layout: { type: 'hbox', align: 'top' },
        items: [
          {
            xtype: 'textarea',
            name: 'reason',
            fieldLabel: UB.i18n('Причина надання відпустки'),
            labelWidth: 130,
            rows: 5,
            flex: 1
          },
          {
            xtype: 'button',
            cls: 'list-icon',
            name: 'reasonButton',
            tooltip: UB.i18n('Вибрати'),
            width: 35,
            height: 35,
            margin: '0 2 0 -45',
            handler: btn => {
              form.down('[name=reason]').selectHandler(btn)
            }
          }
        ]
      },
      {
        xtype: 'grid',
        name: 'employees',
        margin: '5 5 5 10',
        height: 330,
        autoScroll: true,
        cls: 'ub-entity-grid',
        columns: [{ text: UB.i18n('Працівники'), dataIndex: 'name', flex: 1 }],
        dockedItems: [
          {
            xtype: 'toolbar',
            dock: 'top',
            items: [
              {
                xtype: 'button',
                name: 'btnSelect',
                tooltip: UB.i18n('Вибрати працівників'),
                iconCls: 'fas fa-angle-double-down',
                cls: 'fill-action',
                handler: btn => {
                  const gridEmployees = form.down('[name=employees]')
                  const store = gridEmployees.getStore()
                  const dateFromCtrl = form.down('[name=dateFrom]')
                  HR.orderManager.empOrderEmployeeSearch({
                    selected: store.data.items.map(o => o.get('ID')),
                    field: 'employeeNumberID',
                    orgID: (form.orderForm && form.orderForm.record.get('organizationID')) || appAC.globalOrganization(),
                    onDate: (dateFromCtrl && dateFromCtrl.getValue()) || appAC.globalApplicationDate(),
                    onSelectData: function (data, isDelete) {
                      let hasStoreItems = store.getCount() > 0
                      const storeItems = store.data.items
                      data.forEach(row => {
                        if (hasStoreItems && isDelete) {
                          store.removeAll()
                          hasStoreItems = false
                        }
                        let existedItem
                        if (hasStoreItems) {
                          existedItem = storeItems.find(rec => rec.get('ID') === row.employeeNumberID)
                        }
                        if (!existedItem) {
                          store.insert(store.data.length, [{ ID: row.employeeNumberID, name: row['description'] }])
                        }
                      })
                    }
                  })
                }
              },
              {
                xtype: 'button',
                name: 'btnDel',
                tooltip: UB.i18n('Видалити'),
                iconCls: 'fa fa-trash-o',
                cls: 'delete-action',
                handler: btn => {
                  deleteRow()
                }
              },
              {
                xtype: 'button',
                name: 'btnClear',
                tooltip: UB.i18n('Очистити'),
                iconCls: 'fas fa-eraser',
                cls: 'fill-action',
                handler: btn => {
                  const gridEmployees = form.down('[name=employees]')
                  const store = gridEmployees.getStore()
                  store.removeAll()
                }
              }
            ]
          }
        ],
        store: new Ext.data.ArrayStore({
          store: [],
          fields: ['ID', 'name']
        }),
        listeners: {
          itemcontextmenu: function (view, record, item, i, e) {
            e.stopEvent()
            ctxMenu.showAt(e.getXY())
          }
        }
      }
    ]
  }
}

function getShortcutListStyle () {
  return `
    body {
      background-color: #FFFFFF;
      color: #2f7c94;
      font-family: Roboto, Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.3;
    }
    .word-wrap {
      word-wrap: break-word;
      hyphens: auto
    }
    a {
      text-decoration: none;
      color: #2f7c94;
    }
    td,th {
      font-family: Roboto,Arial,Helvetica,sans-serif;
      font-size: 14px
    }
    .mce-pagebreak {
      cursor: default;
      display: block;
      border: 0;
      width: 100%;
      height: 5px;
      border: 1px dashed #666;
      margin-top: 15px;
      page-break-before: always
    }
    @media print {
      .mce-pagebreak {
        border: 0
      }
      a {
        text-decoration: none
      }
    }
  `
}

function getYearControl (config) {
  config = config || {}
  const yearCtrl = _.merge({
    xtype: 'numberfield',
    name: 'year',
    fieldLabel: UB.i18n('За рік'),
    allowBlank: false,
    labelWidth: 120,
    width: 240,
    minValue: 2000,
    maxValue: 2099,
    allowExponential: false,
    hideTrigger: true
  }, config)
  return {
    layout: { type: 'hbox' },
    items: [ yearCtrl ]
  }
}

function getProgClassCombo (config) {
  config = config || {}
  const res = {
    layout: { type: 'hbox' },
    items: [
      {
        xtype: 'ubtextfield',
        name: 'dictProgClass',
        fieldLabel: UB.i18n('Код проєкту (КПК)'),
        labelWidth: config.labelWidth || 150,
        width: config.width || 650,
        margin: config.margin || '2 5 0 15'
      },
      {
        xtype: 'button',
        cls: 'list-icon',
        name: 'reasonButton',
        tooltip: UB.i18n('Вибрати'),
        width: 35,
        height: 35,
        margin: '0 13 0 -45',
        hidden: !$App.domainInfo.entities['ac_dictProgClass'],
        handler: btn => {
          const entityName = 'ac_dictProgClass'
          const form = btn.up('form')
          const dictProgClassCtrl = form.down('[name=dictProgClass]')
          $App.doCommand({
            entity: entityName,
            cmdType: UB.core.UBCommand.commandType.showList,
            description: $App.domainInfo.get(entityName, true).getEntityDescription(),
            isModal: true,
            sender: dictProgClassCtrl,
            hideActions: [],
            onItemSelected: function (selected) {
              dictProgClassCtrl.setValue(selected.get('description'))
              Ext.defer(() => {
                dictProgClassCtrl.focus()
              }, 10)
            },
            cmpInitConfig: {
              onDeterminateForm: function (grid) {},
              entityConfig: {
                entity: entityName,
                method: 'select',
                fieldList: [{ name: 'ID', visibility: false }, { name: 'description' }],
                orderList: { obderBy: { expression: 'description' } }
              }
            }
          })
        }
      }
    ]
  }
  return res
}

function getFundSourceCombo (config) {
  config = config || {}
  const res = {
    xtype: 'ubcombobox',
    name: 'dictFundSourceID',
    fieldLabel: UB.i18n('Джерело фінансування'),
    labelWidth: config.labelWidth || 150,
    width: config.width || 650,
    hideEntityItemInContext: true,
    gridFieldList: ['ID', 'name', 'description'],
    valueField: 'ID',
    displayField: 'name',
    ubRequest: {
      entity: 'ac_fundSource',
      method: 'selectByOrg',
      fieldList: ['ID', 'name', 'dictProgClassDesc', 'dictFundTypeName']
    },
    listeners: {
      afterrender: function (ctrl) {
        ctrl.store.ubRequest.orgID = appAC.globalOrganization()
      },
      change: function (ctrl) {
        const form = ctrl.up('form')
        const dictProgClass = form.down('[name=dictProgClass]')
        const name = ctrl.getFieldValue('dictProgClassDesc')
        if (dictProgClass && name) {
          dictProgClass.setValue(name)
        }
      }
    }
  }
  return res
}

function getSignatoryCombos (config) {
  config = config || {}

  function filterRespEmpSignatoryCombos (form, posID, ctrlName) {
    const organizationID = appAC.globalOrganization()
    const onDate = appAC.globalApplicationDate()
    const respEmpIDCtrl = form.down(`[name=${ctrlName}]`)
    UB.Repository('hr_dictTempExecution')
      .attrs(['employeePositionID'])
      .where('organizationID', '=', organizationID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeePositionTempID.positionID', '=', posID, 'w1')
      .where('positionTempID', '=', posID, 'w2')
      .logic('([w1] or [w2])')
      .selectAsObject()
      .then(tempExecData => {
        const whereArray = [
          ['positionID', '=', posID, 'posID'],
          ['organizationID', '=', organizationID, ''],
          ['dateFrom', '<=', onDate, ''],
          ['dateTo', '>=', onDate, '']
        ]
        let logicalPredicates = null
        if (tempExecData.length) {
          whereArray.push(['ID', 'in', tempExecData.map(itm => itm.employeePositionID), 'IDList'])
          logicalPredicates = ['([posID] OR [IDList])']
        }
        AC.viewUtils.setWhereListProperty(respEmpIDCtrl, whereArray, logicalPredicates, ['clearStore', 'clearWhereList', 'clearValue'])
      })
  }

  const res = {
    layout: { type: 'hbox' },
    items: [
      {
        xtype: 'ubcombobox',
        name: config.name1 || 'respPositionID',
        fieldLabel: config.fieldLabel1 || UB.i18n('Підписант (посада)'),
        valueField: 'mi_data_id',
        displayField: 'description',
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        gridFieldList: ['description'],
        labelWidth: config.labelWidth || 160,
        width: config.width || 650,
        allowBlank: config.allowBlank,
        disableContextMenu: true,
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_position',
          fieldList: ['mi_data_id', 'description', 'nameGen'],
          whereList: {
            orgID: {
              expression: '[orgID]',
              condition: '=',
              value: appAC.globalOrganization()
            },
            state: {
              expression: '[state]',
              condition: '=',
              value: 'ACTIVE'
            },
            mi_dateFrom: {
              expression: '[mi_dateFrom]',
              condition: '<=',
              value: appAC.globalApplicationDate()
            },
            mi_dateTo: {
              expression: '[mi_dateTo]',
              condition: '>=',
              value: appAC.globalApplicationDate()
            },
            isSigner: {
              expression: '',
              condition: 'subquery',
              subQueryType: 'exists',
              value: {
                entity: 'hr_orgRespPosition',
                fieldList: ['ID'],
                method: 'select',
                whereList: {
                  cond: {
                    expression: '[positionID]=[{master}.mi_data_id]',
                    condition: 'custom'
                  },
                  mi_deleteDate: {
                    condition: 'equal',
                    expression: '[mi_deleteDate]',
                    value: '#maxdate'
                  },
                  organizationID: {
                    condition: 'custom',
                    expression: '[organizationID]=[{master}.orgID]'
                  },
                  signer4Ref: {
                    expression: '[respPosition]',
                    condition: 'equal',
                    value: 'signer4Ref'
                  }
                }
              }
            }
          },
          orderList: { orderBy: { expression: 'description' } }
        },
        listeners: {
          change: function (ctrl) {
            const form = ctrl.up('form')
            const posID = ctrl.getValue() || 0
            filterRespEmpSignatoryCombos(form, posID, config.name2 || 'respEmp')
          }
        }
      },
      {
        xtype: 'ubcombobox',
        name: config.name2 || 'respEmp',
        fieldLabel: config.fieldLabel2 || UB.i18n('Підписав'),
        displayField: 'description',
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        gridFieldList: ['description'],
        labelWidth: config.labelWidth || 160,
        width: config.width || 650,
        allowBlank: config.allowBlank,
        disableContextMenu: true,
        disableModifyEntity: true,
        ubRequest: {
          entity: 'hr_employeePositionS',
          fieldList: ['ID', 'description', 'employeeID.shortFIO', 'positionID'],
          orderList: { orderBy: { expression: 'description' } }
        },
        listeners: {
          render: function (ctrl) {
            const store = ctrl.store
            function setFirstVal () {
              const form = ctrl.up('form')
              const respPositionIDCtrl = form.down(`[name=${config.name1 || 'respPositionID'}]`)
              const posID = respPositionIDCtrl.getValue() || 0

              const storeItems = ctrl.store.data.items
              const selItem = _.find(storeItems, { data: { positionID: posID } })
              if (selItem) {
                ctrl.setValue(selItem.data.ID)
              }
            }
            store.on('load', setFirstVal)
            store.load()
          }
        }
      }
    ]
  }
  return _.merge(res, config)
}

function getPosCardMenu (grid) {
  return {
    text: UB.i18n('Картка посади'),
    iconCls: 'fa fa-briefcase',
    handler: function () {
      const reco = AC.gridUtils.getCurrentRecord(grid)
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_position',
        entity: 'hr_position',
        instanceID: reco.get('ID')
      })
    }
  }
}

function getOrderFundSourceGrid (config = {}) {
  const isFundSourceAccounting = AC.settings.get('hrFundSourceAccounting', appAC.globalOrganization())
  if (isFundSourceAccounting === 'ORDER') {
    return {
      xtype: 'panel',
      layout: {
        type: 'vbox'
      },
      margin: '5 15 5 15',
      padding: '0 0 0 0',
      cls: 'x-fieldset',
      name: config.panelName || 'fundSourcePanel',
      items: [
        {
          xtype: 'acGrid',
          name: 'positionFundSourceDt',
          height: 190,
          autoScroll: true,
          hideActions: ['addNewByCurrent', 'newVersion'],
          flex: 1,
          storeType: 'local',
          disablePaging: true,
          showToolBar: true,
          cellEditing: true,
          pageSize: 10000,
          hidePagingBar: true,
          summary: { mtCount: 'sum' },
          summaryDataOnClient: true,
          onBeforeEdit: function (control, context) {
            const me = context.grid.up('form')
            if (context.column.dataIndex === 'dictFundSourceID.description') {
              context.column.field.store.ubRequest.method = 'selectByOrg'
              context.column.field.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
              const data = context.grid.getData()
              const fundSourceIDs = data.map(o => o.dictFundSourceID).filter(Boolean)
              if (fundSourceIDs.length) {
                context.column.field.store.ubRequest.whereList = {
                  notInID: {
                    expression: '[ID]',
                    condition: 'notIn',
                    value: fundSourceIDs
                  }
                }
                context.column.field.store.load()
              }
            }
          },
          fields: [
            { name: 'ID' },
            { name: 'dictFundSourceID' },
            { name: 'dictFundSourceID.mi_deleteUser' },
            {
              name: 'dictFundSourceID.description',
              columnConfig: {
                text: UB.i18n('Джерело фінансування'),
                flex: 3,
                renderer: (value, meta, record) => {
                  if (record.get('dictFundSourceID.mi_deleteUser')) {
                    meta.tdCls = 'grd-line-through'
                    meta.tdAttr = 'data-qtip="' + 'Джерело фінансування видалене' + '"'
                  }
                  return value
                },
                editor: {
                  dataType: 'Entity',
                  hideEntityItemInContext: true,
                  associatedEntity: 'ac_fundSource',
                  allowBlank: false,
                  disableContextMenu: true,
                  storeAttributeValueField: 'dictFundSourceID',
                  fieldList: ['ID', 'description']
                }
              }
            },
            {
              name: 'mtCount',
              columnConfig: {
                text: UB.i18n('Кількість ставок'),
                flex: 1,
                summaryType: 'sum',
                floatFormat: 2,
                editor: {
                  dataType: 'Float',
                  decimalPrecision: 2,
                  minValue: 0,
                  allowBlank: false
                }
              }
            }
          ]
        }
      ]
    }
  } else {
    return {
      xtype: 'panel',
      layout: {
        type: 'vbox',
        align: 'stretch'
      },
      margin: '5 15 5 15',
      padding: '0 0 0 0',
      cls: 'x-fieldset',
      name: config.panelName || 'fundSourcePanel',
      flex: 1,
      items: [
        {
          xtype: 'acGrid',
          name: config.gridName || 'positionFundSourceDt',
          height: config.height || 190,
          autoScroll: true,
          hideActions: ['addNew', 'del', 'addNewByCurrent'],
          flex: 1,
          storeType: 'local',
          showToolBar: false,
          disablePaging: true,
          cellEditing: true,
          pageSize: 10000,
          hidePagingBar: true,
          summary: { quantity: 'sum' },
          summaryDataOnClient: true,
          fields: [
            { name: 'ID' },
            { name: 'dictFundSourceID' },
            { name: 'orderID' },
            { name: 'mi_modifyDate' },
            { name: 'dictFundSourceID.mi_deleteUser' },
            {
              name: 'dictFundSourceID.description',
              columnConfig: {
                text: UB.i18n('Джерело фінансування'),
                flex: 3,
                renderer: (value, meta, record) => {
                  if (record.get('dictFundSourceID.mi_deleteUser')) {
                    meta.tdCls = 'grd-line-through'
                    meta.tdAttr = 'data-qtip="' + 'Джерело фінансування видалене' + '"'
                  }
                  return value
                }
              }
            },
            {
              name: 'posTotal',
              columnConfig: {
                text: UB.i18n('Всього ставок'),
                flex: 1,
                floatFormat: 2
              }
            },
            {
              name: 'posVac',
              columnConfig: {
                text: UB.i18n('Вакантно'),
                flex: 1,
                floatFormat: 2
              }
            },
            {
              name: 'mtCount',
              columnConfig: {
                text: UB.i18n('Кількість ставок'),
                flex: 1,
                summaryType: 'sum',
                floatFormat: 2,
                editor: {
                  dataType: 'Float',
                  decimalPrecision: 2,
                  minValue: 0,
                  allowBlank: false
                }
              }
            }
          ]
        }
      ]
    }
  }
}

function onChangeIncludeChildOrgs (form, onDate = appAC.globalApplicationDate()) {
  const orgID = form.down('[name=organizationID]').getValue()
  const departmentID = form.down('[name=departmentID]')
  const includeChildOrgs = form.down('[name=includeChildOrgs]').getValue()
  const whereList = [
    ['state', '=', 'ACTIVE'],
    ['orgID.state', '=', 'ACTIVE'],
    ['orgID.mi_dateFrom', '<=', onDate],
    ['orgID.mi_dateTo', '>=', onDate]
  ]
  whereList.push(includeChildOrgs
    ? ['orgID.mi_treePath', 'like', `/${orgID || 0}/`]
    : ['orgID', '=', orgID || 0])
  AC.viewUtils.setWhereListProperty(departmentID, whereList, null, ['clearWhereList', 'clearValue', 'clearStore'])
  departmentID.setReadOnly(!orgID)
}

function getIncludeChildOrgs (accMainReportsSubOrg, config) {
  config = config || {}
  const res = {
    xtype: 'checkboxfield',
    name: config.name || 'includeChildOrgs',
    boxLabel: config.boxLabel || UB.i18n('з підлеглими'),
    labelWidth: config.noBoxLabel ? undefined : (config.labelWidth || 110),
    width: config.noWidth ? undefined : (config.width || 140),
    checked: config.checked || false,
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
  return _.merge(res, config)
}

function getIncludeChildDepts (config) {
  config = config || {}
  const res = {
    xtype: 'checkboxfield',
    name: config.name || 'includeChildDepts',
    boxLabel: config.noBoxLabel ? undefined : (config.boxLabel || UB.i18n('з підлеглими')),
    labelWidth: config.labelWidth || 110,
    width: config.noWidth ? undefined : (config.width || 140),
    checked: config.checked || false,
    readOnly: config.readOnly || true
  }
  return _.merge(res, config)
}

function getTimeCostGroupInfo (timeGroupCode, config) {
  config = config || {}
  const info = {
    xtype: 'panel',
    name: 'panelInfo',
    collapsible: true,
    collapsed: true,
    cls: 'panel-bordered-light',
    iconCls: 'iconInfo',
    title: UB.i18n('Інформація про групи елементів обліку робочого часу'),
    layout: {
      type: 'vbox'
    },
    width: 700,
    margin: '5 10 5 15',
    header: { style: 'background-color: rgba(0,0,0,.0); cursor: pointer; padding: 10px; color: #818181' },
    listeners: {
      render: function (panel) {
        panel.header.on('click', function () {
          if (panel.collapsed) {
            panel.expand()
          } else {
            panel.collapse()
          }
        })
      }
    },
    items: [
      {
        xtype: 'label',
        name: 'lblInfo',
        margin: '0 0 0 10',
        cls: 'x-form-item-label',
        height: config.labelHeight || 38,
        width: config.labelWidth || 670,
        text: UB.i18n('В цей список виводяться дні таких невиходів (згідно із налаштуванням в довіднику "Група елементів обліку робочого часу" з кодом {0})', timeGroupCode)
      },
      {
        xtype: 'acGrid',
        name: 'grid',
        stateId: UB.core.UBLocalStorageManager.getKeyUI('hr_empListMission_grid'),
        region: 'center',
        entity: 'hr_dictTimeCostGroup',
        flex: 1,
        height: config.gridHeight || 150,
        enableColumnHide: false,
        hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
        storeType: 'ub',
        readOnly: true,
        isReadOnly: true,
        storeAutoLoad: true,
        disablePaging: true,
        onSaveEditData: true,
        showToolBar: false,
        ubStoreConfig: {
          entity: 'hr_dictTimeCostGroup',
          method: 'select',
          fieldList: ['dictTimeCostID.code', 'dictTimeCostID.name', 'dictTimeGroupID.code'],
          whereList: {
            empAssessmentID: {
              expression: '[dictTimeGroupID.code]',
              condition: 'equal',
              value: timeGroupCode || ''
            },
            dateDelete1: {
              expression: '[dictTimeGroupID.mi_deleteDate]',
              condition: 'moreEqual',
              value: AC.dateService.maxDate()
            },
            dateDelete2: {
              expression: '[dictTimeCostID.mi_deleteDate]',
              condition: 'moreEqual',
              value: AC.dateService.maxDate()
            }
          }
        },
        fields: [
          { name: 'dictTimeCostID.code', columnConfig: { text: UB.i18n('Код'), width: 150 } },
          { name: 'dictTimeCostID.name', columnConfig: { text: UB.i18n('Назва'), width: 500 } }
        ]
      }
    ]
  }

  return _.merge(info, config)
}

function getCollapseInfoPanel (text, config) {
  config = config || {}
  const info = {
    xtype: 'panel',
    name: 'panelInfo',
    collapsible: true,
    collapsed: true,
    cls: 'panel-bordered-light',
    iconCls: 'iconInfo',
    title: UB.i18n('Інформація про данні за якими формується звіт'),
    layout: {
      type: 'vbox'
    },
    width: 700,
    margin: '5 10 5 15',
    header: { style: 'background-color: rgba(0,0,0,.0); cursor: pointer; padding: 10px; color: #818181' },
    listeners: {
      render: function (panel) {
        panel.header.on('click', function () {
          if (panel.collapsed) {
            panel.expand()
          } else {
            panel.collapse()
          }
        })
      }
    },
    items: [
      {
        xtype: 'label',
        name: 'lblInfo',
        margin: '0 0 0 10',
        cls: 'x-form-item-label',
        height: config.labelHeight || 38,
        width: config.labelWidth || '100%',
        text: UB.i18n(text)
      }
    ]
  }

  return _.merge(info, config)
}

function getCustomOrgCombo (config) {
  if (config.fieldID && config.fieldName && config.fieldLabel) {
    const maxLength = config.maxLength || 200
    const isChangeDocIssuer = config.isChangeDocIssuer
    config = _.merge(config, {
      fieldLabel: config.fieldLabel,
      allowBlank: config.allowBlank === undefined ? false : config.allowBlank,
      ubRequest: {
        entity: 'ac_contractor',
        fieldList: ['ID', 'name'],
        orderList: { orderBy: { 'expression': 'name', 'order': 'asc' } }
      },
      maxLength: maxLength,
      listeners: {
        focus: ctrl => {
          ctrl.inputEl.dom.setAttribute('maxlength', maxLength)
        },
        change: ctrl => {
          let me = ctrl.up('form')
          if (isChangeDocIssuer) {
            if (!me.attr.docIssued.getValue() && me.attr.docIssuedOrgID && !me.attr.docIssuedOrgID.getValue()) {
              me.attr.docIssued.setValue(me.attr.docIssuedOrgID.getValue())
            }
          }
        }
      }
    })
    return getIDNameCombo(config)
  }
}
