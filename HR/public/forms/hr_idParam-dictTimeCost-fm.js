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
  me.attr.dictTimeCostID = me.queryById('dictTimeCostID')
}

function initUBComponent () {
  const me = this
  me.attr.dictTimeCostID.store.ubRequest.whereList = {
    byNotExists: {
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
            expression: '[valuesID]',
            value: me.record.get('valuesID') || -1
          },
          byTab: {
            expression: '[listParamID.code]',
            condition: 'in',
            values: { 'code': me.tabsCode }
          },
          byOrgID: {
            condition: 'equal',
            expression: '[orgID]',
            value: appAC.globalOrganization()
          }
        }
      }
    },
    byTimeCostType: {
      condition: 'notEqual',
      expression: '[timeCostType]',
      value: 'OTHER'
    }
  }
  if (!me.isNewInstance) {
    me.attr.dictTimeCostID.setValueById(me.record.get('valuesID'))
  }
}

function onFormDataReady () {
  const me = this

  const valuesID = me.record.get('valuesID')
  valuesID !== me.attr.dictTimeCostID.getValue() && me.attr.dictTimeCostID.setValueById(valuesID || null)
}

function afterSave () {
  const me = this
  me.sender && me.sender.onRefresh ? me.sender.onRefresh() : me.sender && me.sender.panel.onRefresh && me.sender.panel.onRefresh()
}
