/* global AC appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  initUBComponent
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('aftersave', afterSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.positionID = me.queryById('positionID')
}

function initUBComponent () {
  const me = this
  if (!me.isNewInstance) {
    me.attr.positionID.setValueById(me.record.get('valuesID'))
  }
}

function onFormDataReady () {
  const me = this
  me.attr.positionID.store.ubRequest.whereList = {
    state: {
      expression: '[state]',
      condition: '=',
      value: 'ACTIVE'
    },
    orgID: {
      expression: '[orgID]',
      condition: '=',
      value: me.record.get('orgID')
    },

    parentIsNull: {
      expression: '[parentUnitID]',
      condition: 'isNull'
    },
    parentDateFrom: {
      expression: '[parentUnitID.mi_dateFrom]',
      condition: 'lessEqual',
      value: appAC.globalApplicationDate()
    },
    parentDateTo: {
      expression: '[parentUnitID.mi_dateTo]',
      condition: 'moreEqual',
      value: appAC.globalApplicationDate()
    },
    parentState: {
      expression: '[parentUnitID.state]',
      condition: '=',
      value: 'ACTIVE'
    },
    dateFrom: {
      expression: '[mi_dateFrom]',
      condition: 'lessEqual',
      value: appAC.globalApplicationDate()
    },
    dateTo: {
      expression: '[mi_dateTo]',
      condition: 'moreEqual',
      value: appAC.globalApplicationDate()
    }
  }
  me.attr.positionID.store.ubRequest.logicalPredicates = ['([parentIsNull] OR ([parentState] AND [parentDateFrom] AND [parentDateTo]))']

  me.attr.positionID.store.ubRequest.whereList.byNotExists = {
    expression: '',
    condition: 'subquery',
    subQueryType: 'notExists',
    value: {
      entity: 'hr_idParam',
      fieldList: ['ID'],
      method: 'select',
      whereList: {
        cond: {
          expression: '[valuesID]=[{master}.ID]',
          condition: 'custom'
        },
        mi_deleteDate: {
          condition: 'equal',
          expression: '[mi_deleteDate]',
          value: '#maxdate'
        },
        byNotSelf: {
          condition: 'notEqual',
          expression: '[ID]',
          value: me.record.get('valuesID') || -1
        },
        byTab: {
          expression: '[listParamID]',
          condition: '=',
          value: me.initialFieldValues.listParamID
        }
      }
    }
  }
  me.attr.positionID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  delete me.attr.positionID.store.ubRequest.__mip_recordhistory_all
}

function afterSave () {
  const me = this
  me.sender && me.sender.onRefresh()
}
