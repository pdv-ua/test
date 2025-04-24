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
  me.attr.dictPositionID = me.queryById('dictPositionID')
}

function initUBComponent () {
  const me = this

  me.attr.dictPositionID.store.ubRequest.whereList = {
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
          byOrgID: {
            condition: 'equal',
            expression: '[orgID]',
            value: appAC.globalOrganization()
          },
          byTab:
            me.tabsCode ? {
              expression: '[listParamID.code]',
              condition: 'in',
              values: { 'code': me.tabsCode }
            }
              : me.initialFieldValues.listParamID // don't remove this condition
                ? {
                  expression: '[listParamID]',
                  condition: '=',
                  value: me.initialFieldValues.listParamID
                }
                : {
                  expression: '[listParamID.code]',
                  condition: '=',
                  values: { 'code': '-1' }
                }

        }
      }
    }
    // byGroupType: {
    //   condition: 'equal',
    //   expression: '[methodID.methodGroupID.groupType]',
    //   value: 'PAYMENT'
    // }
  }
  if (!me.isNewInstance) {
    me.attr.dictPositionID.setValueById(me.record.get('valuesID'))
  }
}

function onFormDataReady () {
  const me = this

  if (me.editFld) {
    for (let atrName in me.attr) { me.attr[atrName].setReadOnly(atrName !== me.editFld) }
  }

  const valuesID = me.record.get('valuesID')
  valuesID !== me.attr.dictPositionID.getValue() && me.attr.dictPositionID.setValueById(valuesID || null)
}

function afterSave () {
  const me = this
  me.sender && me.sender.onRefresh ? me.sender.onRefresh() : me.sender && me.sender.panel.onRefresh && me.sender.panel.onRefresh()
}
