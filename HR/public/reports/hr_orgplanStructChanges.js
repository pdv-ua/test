/* global _ UB AC HR appAC Ext */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для коррекстной выгрузки в Excel
      me.incomeParams = reportParams
    }
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    let staffTableID = reportParams.staffTableID || 0
    let onDate = AC.dateService.shiftDate(reportParams.orderDate) || appAC.globalApplicationDate()
    if (reportParams.caller && reportParams.caller.record) {
      const reco = reportParams.caller.record
      staffTableID = reportParams.instanceID
      onDate = AC.dateService.shiftDate(reco.get('orderDate'))
    }

    const result = {
      data: [],
      year: '',
      organizationName: '',
      orderInfo: '',
      approvedData: '',
      approvedFIO: '',
      approvedDepName: '',
      agreedData: '',
      agreedFIO: '',
      agreedDepName: '',
      agreedOrg: '',
      agreedInfo: '',
      approvedInfo: '',
      reconciliation: [],
      previousOrders: [],
      staffTableInfo: ''
    }
    if (!staffTableID) {
      return result
    }
    const staffTableData = await UB.Repository('hr_staffTableOrgStructure')
      .attrs(['orgID', 'orderDate', 'orderNumber', 'orgID.name', 'orgID.nameGen', 'changeListNumber',
        'entryOrderID.entryDate', 'entryOrderID.orderNumber', 'staffTableOrgStructureID',
        'staffTableOrgStructureID.orderDate', 'staffTableOrgStructureID.orderNumber'])
      .joinCondition('orgID.mi_dateFrom', '<=', onDate)
      .joinCondition('orgID.mi_dateTo', '>=', onDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .selectById(staffTableID)

    if (!staffTableData) {
      return result
    }

    const organizationID = staffTableData.orgID || 0
    result.organizationName = staffTableData['orgID.name'] || ''
    result.organizationNameGen = staffTableData['orgID.nameGen'] || staffTableData['orgID.name'] || ''
    result.year = onDate.getFullYear()
    result.changeListNumber = staffTableData.changeListNumber ? ` № ${staffTableData.changeListNumber}` : ''
    result.staffTableInfo = `${staffTableData['staffTableOrgStructureID.orderDate'] ? 'від ' + AC.dateService.formatDate(staffTableData['staffTableOrgStructureID.orderDate']) : ''}${staffTableData['staffTableOrgStructureID.orderNumber'] ? ' № ' + staffTableData['staffTableOrgStructureID.orderNumber'] : ''}`
    result.staffTableInfo = result.staffTableInfo ? '<br />' + result.staffTableInfo : ''
    const staffTableOrgStructureID = staffTableData.staffTableOrgStructureID || 0

    const previousStaffTables = staffTableOrgStructureID ? await UB.Repository('hr_staffTableOrgStructure')
      .attrs(['orderDate', 'orderNumber'])
      .where('staffTableOrgStructureID', '=', staffTableOrgStructureID)
      .where('orderState', '=', 'POSTED')
      .where('ID', '<>', staffTableID)
      .orderBy('entryOrderID.orderDate')
      .selectAsObject() : []
    result.previousOrders = previousStaffTables.map(el => {
      const text = `${el.orderDate ? 'від ' + AC.dateService.formatDate(el.orderDate) : ''}${el.orderNumber ? ' № ' + el.orderNumber : ''}`
      return {
        text: text ? `${text},<br />` : ''
      }
    })
    result.previousOrders.push({ text: UB.i18n('від ____________ № _____') })

    const orderState = staffTableData.orderState || ''
    if (staffTableData['entryOrderID.orderDate'] /* && staffTableData['entryOrderID.orderNumber'] && staffTableData['entryOrderID.entryDate'] */) {
      result.orderInfo = UB.i18n(`(вводиться в дію з {0}`, AC.dateService.getStringFormatDate(staffTableData['entryOrderID.entryDate'], '', '', ' року')) /* +
      UB.i18n(` наказом № {0} від {1})`, staffTableData['entryOrderID.orderNumber'], AC.dateService.getStringFormatDate(staffTableData['entryOrderID.orderDate'], '', ''))
      */
    }

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity

    const agreedOrg = await HR.reportUtils.getStaffAgreedOrgName(organizationID)
    if (agreedOrg) {
      result.agreedOrg = agreedOrg
    }

    let recparticipant = await UB.Repository('hr_recparticipant')
      .attrs(['ID', 'recStageID.orderIndex', 'employeePosition', 'employeePosition.organizationID'])
      .where('docID', '=', staffTableID)
      .where('recStageID.entityName', '=', 'hr_recstage')
      .selectAsObject()
    let tasks = await UB.Repository('hr_task')
      .attrs('executionDate', 'participantID')
      .where('docID', '=', staffTableID)
      .where('mi_wfState', '=', 'CLOSED')
      .where('participantID.recStageID.entityName', '=', 'hr_recstage')
      .orderBy('ID', 'desc')
      .selectAsObject()
    tasks = tasks ? _.groupBy(tasks, 'participantID') : []

    recparticipant = recparticipant ? _.groupBy(recparticipant, 'recStageID.orderIndex') : []
    if (recparticipant[1]) {
      const items = _.sortBy(recparticipant[1], 'ID')
      if (items) {
        const cnt = items.length > 2 ? 2 : items.length
        for (let i = 0; i < cnt; i++) {
          const info = await HR.reportUtils.getEmpPosInfo(items[i].employeePosition, onDate, false, '. ')
          result.reconciliation.push({
            name: info.name,
            namePos: info.nameFullPos
          })
        }
      }
    }
    if (recparticipant[2]) {
      const item = _.sortBy(recparticipant[2], 'ID')[0]
      const info = await HR.reportUtils.getEmpPosInfo(item.employeePosition, onDate, false, '. ')
      result.approvedData = tasks[item.ID] && tasks[item.ID][0].executionDate ? AC.dateService.formatDate(tasks[item.ID][0].executionDate) : UB.i18n('"_____"__________________ 20___ р.')
      result.approvedFIO = info.name ? `__________ ${info.name}` : ''
      result.approvedPosName = info.nameFullPos
    }
    if (recparticipant[3]) {
      const item = _.sortBy(recparticipant[3], 'ID')[0]
      const info = await HR.reportUtils.getEmpPosInfo(item.employeePosition, onDate, false, '. ')
      result.agreedData = tasks[item.ID] && tasks[item.ID][0].executionDate ? AC.dateService.formatDate(tasks[item.ID][0].executionDate) : UB.i18n('"_____"__________________ 20___ р.')
      result.agreedFIO = info.name ? `__________ ${info.name}` : ''
      result.agreedPosName = info.nameFullPos
    }
    result.agreedInfo = _.compact([result.agreedOrg, result.agreedPosName, result.agreedFIO, result.agreedData]).join('<br />')
    result.approvedInfo = _.compact([result.approvedPosName, result.approvedFIO, result.approvedData]).join('<br />')
    result.approvedInfo = result.approvedInfo ? '<br /><br />' + result.approvedInfo : ''

    const newOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'liquidate',
        'staffOrderID', 'state', 'idxNum', 'quantity', 'accrualSum'])
      .where('orgID', '=', organizationID)
      .where('state', '=', 'ACTIVE', 'stateAct')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('staffOrderID', '=', staffTableID || 0, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'), 'notOtherThanOrder')
      .logic('(([stateAct] AND [dateFrom] AND [dateTo] AND [notOtherThanOrder]) OR [order])')
      .orderBy('idxNum')
      .selectAsObject()

    /* Старі посади на onDate. Вважається, що нові зміни будуть введені в дію датою onDate */
    const oldOnDate = (orderState === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
    const oldOrgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'liquidate',
        'staffOrderID', 'state', 'idxNum', 'quantity'])
      .where('orgID', '=', organizationID)
      .where('mi_dateFrom', '<=', oldOnDate)
      .where('mi_dateTo', '>=', oldOnDate)
      .where('state', '=', 'ACTIVE')
      .where('liquidate', '=', 0)
      .selectAsObject()

    const delUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && orgItem.liquidate)
    const addUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && !orgItem.liquidate)
    /* В addUnits знаходяться нові та змінені оргодиниці. Змінені оргодиниці з addUnits повинні також попадати в ліквідовані delUnits зі старими окладами */
    const changedUnits = []
    const changedUnitIds = [0]
    addUnits.forEach(addUnit => {
      const currDataID = addUnit.mi_data_id
      const oldUnit = _.find(oldOrgStruct, { mi_data_id: currDataID })
      if (oldUnit) {
        changedUnits.push(oldUnit)
        changedUnitIds.push(currDataID)
      }
    })

    if (delUnits.length || addUnits.length || changedUnits.length) {
      const addPos = await UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'name', 'nameGen'])
        .where('orgID', '=', organizationID)
        .where('staffOrderID', '=', staffTableID)
        .where('liquidate', '=', 0)
        .where('parentUnitID', '=', organizationID) // need only root
        .misc({ __mip_recordhistory_all: true })
        .orderBy('idxNum')
        .selectAsObject()
      const pos = await UB.Repository('hr_position')
        .attrs(['ID', 'mi_data_id', 'name', 'nameGen'])
        .where('orgID', '=', organizationID)
        .where('staffOrderID', '=', staffTableID)
        .where('liquidate', '=', 1)
        .where('parentUnitID', '=', organizationID) // need only root
        .misc({ __mip_recordhistory_all: true })
        .orderBy('idxNum')
        .selectAsObject()
      const chgPos = await UB.Repository('hr_position')
        .attrs('ID', 'mi_data_id', 'name', 'nameGen')
        .where('orgID', '=', organizationID)
        .where('staffOrderID', '=', staffTableID)
        .where('mi_data_id', 'in', changedUnitIds)
        .where('parentUnitID', '=', organizationID) // need only root
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.fullName')
        .orderBy('dictPositionID.name')
        .selectAsObject()
      if (chgPos.length) {
        const chgOldPos = await UB.Repository('hr_position')
          .attrs('ID', 'name', 'nameGen')
          .where('orgID', '=', organizationID)
          .where('mi_data_id', 'in', changedUnitIds)
          .where('parentUnitID', '=', organizationID) // need only root
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: oldOnDate })
          .selectAsObject()
        // Для змінених вузлів дані треба брати з попереднього старого запису
        chgPos.forEach(chgPosItem => {
          const oldPosItem = _.find(chgOldPos, { mi_data_id: chgPosItem.mi_data_id })
          if (oldPosItem) {
            chgPosItem['name'] = oldPosItem['name']
            chgPosItem['nameGen'] = oldPosItem['nameGen']
          }
        })
      }

      const tree = me.generateDataForReport(organizationID, newOrgStruct, delUnits || [], changedUnits || [], addUnits || [], pos || [], chgPos || [], addPos || [])
      let index = 1
      if (tree && tree.delUnit.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Ліквідувати:`, index++), tree.delUnit)
        result.data.push(obj)
      }
      if (tree && tree.changeUnitName.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Перейменувати:`, index++), tree.changeUnitName)
        result.data.push(obj)
      }
      if (tree && tree.changeUnitCode.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Змінити код:`, index++), tree.changeUnitCode)
        result.data.push(obj)
      }
      if (tree && tree.addUnit.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Утворити:`, index++), tree.addUnit)
        result.data.push(obj)
      }
      if (tree && tree.delPos.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Вивести посади:`, index++), tree.delPos)
        result.data.push(obj)
      }
      if (tree && tree.addPos.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Ввести посади:`, index++), tree.addPos)
        result.data.push(obj)
      }
      if (tree && tree.chngQuantity.length) {
        const obj = me.makeDatas(UB.i18n(`{0}. Викласти у новій редакції із наступними змінами:`, index++), tree.chngQuantity, true)
        result.data.push(obj)
      }
    }

    return result
  },
  makeDatas: function (title, items, thisQuantity = false) {
    const obj = {
      name: title,
      thisQuantity: thisQuantity,
      items: items.map((el, ind) => {
        return {
          index: `${ind + 1}. `,
          text: el.text + (thisQuantity ? '' : ind === items.length - 1 ? '.' : ';'),
          oldQuantity: thisQuantity ? el.oldQuantity || 0 : 0,
          newQuantity: thisQuantity ? el.newQuantity || 0 : 0
        }
      })
    }
    return obj
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'checkboxfield',
              fieldLabel: UB.i18n('Не виводити відмінки'),
              labelWidth: 160,
              name: 'notShowCases',
              value: true
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          notShowCases: frm.findField('notShowCases').getValue()
        }
      }
    })
    return paramForm
  },
  generateDataForReport: function (itemID, orgStruct, delUnits, changedUnits, addUnits, delPos, changedPos, addPos) {
    if (!orgStruct || !orgStruct.length) return {}

    function makeItem (currentUnit, uDelete, uAdd, uChange) {
      const resultObj = {
        changeUnitCode: '',
        changeUnitName: '',
        addUnit: '',
        delUnit: '',
        addPos: '',
        delPos: '',
        chngQuantity: '',
        oldQuantity: 0,
        newQuantity: 0
      }

      if (currentUnit.mi_unityEntity === 'hr_department') {
        if (uChange && uAdd) {
          if (uAdd.code !== uChange.code) {
            resultObj.changeUnitCode = UB.i18n(`{0} отримає код {1} замість {2}`, uChange.name || '', uAdd.code, uChange.code)
          }
          if (uAdd.name !== uChange.name) {
            resultObj.changeUnitName = UB.i18n(`{0} у {1}`, uChange.name || '', uAdd.name)
          }
          if ((uAdd.quantity || 0) !== (uChange.quantity, 0)) {
            resultObj.chngQuantity = uAdd.name || ''
            resultObj.oldQuantity = uChange.quantity
            resultObj.newQuantity = uAdd.quantity
          }
        } else if (uAdd || uDelete) {
          if (uDelete) {
            resultObj.delUnit = uDelete.name
          } else {
            resultObj.addUnit = uAdd.name
          }
        }
      } else {
        if (uDelete) {
          resultObj.delPos = uDelete.nameGen || uDelete.name
        }
        if (uChange) {
          resultObj.delPos = uChange.nameGen || uChange.name
        }
        if (uAdd) {
          resultObj.addPos = uAdd.nameGen || uAdd.name
        }
      }

      return resultObj
    }

    function getData (parentID) {
      const result = {
        changeUnitCode: [],
        changeUnitName: [],
        addUnit: [],
        delUnit: [],
        addPos: [],
        delPos: [],
        chngQuantity: []
      }
      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
      curStruct.forEach(orgItem => {
        const del = orgItem.mi_unityEntity === 'hr_department'
          ? delUnits.find(item => item.mi_data_id === orgItem.mi_data_id)
          : delPos.find(item => item.mi_data_id === orgItem.mi_data_id)
        const add = orgItem.mi_unityEntity === 'hr_department'
          ? addUnits.find(item => item.mi_data_id === orgItem.mi_data_id)
          : addPos.find(item => item.mi_data_id === orgItem.mi_data_id)
        const chng = orgItem.mi_unityEntity === 'hr_department'
          ? changedUnits.find(item => item.mi_data_id === orgItem.mi_data_id)
          : changedPos.find(item => item.mi_data_id === orgItem.mi_data_id)

        const item = makeItem(orgItem, del, add, chng)
        if (item.changeUnitCode) {
          result.changeUnitCode.push({ text: item.changeUnitCode })
        }
        if (item.changeUnitName) {
          result.changeUnitName.push({ text: item.changeUnitName })
        }
        if (item.addUnit) {
          result.addUnit.push({ text: item.addUnit })
        }
        if (item.delUnit) {
          result.delUnit.push({ text: item.delUnit })
        }
        if (item.addPos) {
          result.addPos.push({ text: item.addPos })
        }
        if (item.delPos) {
          result.delPos.push({ text: item.delPos })
        }
        if (item.chngQuantity) {
          result.chngQuantity.push({
            text: item.chngQuantity,
            oldQuantity: item.oldQuantity,
            newQuantity: item.newQuantity
          })
        }

        if (orgItem.mi_unityEntity === 'hr_department') {
          const subTree = getData(orgItem.mi_data_id)
          result.changeUnitCode.push(...subTree.changeUnitCode)
          result.changeUnitName.push(...subTree.changeUnitName)
          result.addUnit.push(...subTree.addUnit)
          result.delUnit.push(...subTree.delUnit)
          result.addPos.push(...subTree.addPos)
          result.delPos.push(...subTree.delPos)
          result.chngQuantity.push(...subTree.chngQuantity)
        }
      })
      return result
    }

    const orgTree = getData(itemID)
    return orgTree || []
  }
}
