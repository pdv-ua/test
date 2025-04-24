/* global AC Ext */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onControlChanged,
  onFormDataReady
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

const excludeFields = ['ID', 'employeeID', 'employeeNumberID', 'organizationID', 'departmentID', 'departmentHistoryID', 'positionID',
  'dateToEmpty', 'd0', 'd0Value', 'd1', 'd1Value', 'd2', 'd2Value', 'd3', 'd3Value', 'd4', 'd4Value', 'd5', 'd5Value',
  'd6', 'd6Value', 'd7', 'd7Value', 'd8', 'd8Value', 'd9', 'd9Value', 'orderID', 'changeOrderID', 'separationID', 'description',
  'isActive', 'vacancyDateFrom', 'vacancyDateTo', 'isResponsible', 'tabNum', 'orgName', 'dictPositionValue', 'posName', 'posCaption',
  'posTreePath', 'posMiTreePath', 'posDateTo', 'posDateFrom', 'posOrder', 'posProfCode', 'posCodeZKPPTR', 'depName', 'depCaption',
  'depTreePath', 'depMiTreePath', 'posCatCode', 'isOrgBoss', 'liquidate', 'posCatName', 'psCatName', 'psCatCode', 'dictWagePayName',
  'positionTypeName', 'positionType', 'empOrderID', 'closeOrderID', 'accrualSumDPLast', 'maxDateTo', 'empOrderType', 'paraID',
  'posIdxNum', 'posParentUnitID', 'posAccrualSum', 'mi_owner', 'mi_createDate', 'mi_createUser', 'mi_modifyDate',
  'mi_modifyUser', 'mi_deleteDate', 'mi_deleteUser']

const includeFields = ['dictPositionID', 'dictWagePayID', 'dateNew', 'workScheduleID',
  'mtCount', 'dictStaffCatID', 'workerType', 'dictTrialPeriodID', 'dateTrialEnd', 'dictFundSourceID', 'accountID',
  'dictCategoryECBID', 'contractType', 'dictContractKindID', 'dictTarifCoeffID', 'payElID', 'accrualSum',
  'raiseSalary', 'isIndex', 'dictRankID', 'workPlace', 'planDateTo']

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  const fields = AC.entityUtils.getAttributes('hr_employeePosition')
  const data = []
  for (let attrName in fields) {
    if (fields.hasOwnProperty(attrName) && includeFields.includes(attrName)) {
      data.push({
        description: fields[attrName].description + ' (' + fields[attrName].name + ')',
        name: fields[attrName].description,
        value: fields[attrName].name
      })
    }
  }
  const store = Ext.create('Ext.data.Store', {
    fields: ['name', 'description', 'value'],
    data: data
  })
  store.sort('name', 'ASC')
  me.empPosFields = data
  me.attr.attrName.bindStore(store)
  me.on('controlChanged', onControlChanged, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
  }
}

function onControlChanged (field, value) {
  const me = this
  switch (field.name) {
    case 'attrName':
      if (!me.attr.name.getValue()) {
        const selected = me.empPosFields.find(o => o.value === value)
        if (selected) me.attr.name.setValue(selected['name'])
      }
      break
  }
}
