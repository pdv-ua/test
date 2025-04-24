const UB = require('@unitybase/ub')
const fs = require('fs')
const dateService = require('../../../AC/modules/dataServices/dateService')
const entityBaseService = require('../../../AC/modules/entityServices/entityBaseService')

const publicOrgCount = 2635

module.exports = {
  fillPublicTotals,
  fillPublicTotalsInternal,
  exportPublicTotals,
  getMainSql
}

function getMainSql () {
  const notInPosTypes = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'hrExportCfgUntransferedPosTypes')
    .selectScalar()
  const isNotInPosTypes = !!notInPosTypes
  const notInPosTypesArray = isNotInPosTypes && notInPosTypes.split(',')
  const notInPosTypes4Sql = isNotInPosTypes ? notInPosTypesArray.map(itm => `'${itm}'`).join(',') : `'0'`

  let sql = `SELECT o.mi_data_id, o.name, d.cnt as dept_count, pos.cnt as pos_count, ep.cnt as emppos_count,
  o.limitEmpNum as limit_empnum, CASE WHEN o.limitEmpNum is null THEN 0 ELSE (Coalesce(ep.cnt, 0) * 100 / Coalesce(o.limitEmpNum, 1)) END as emppos_percent
FROM 
  hr_exportTotals t
  INNER JOIN hr_organization o ON o.state = 'ACTIVE'
    and o.mi_dateFrom <= :onDate:
    and o.mi_dateTo >= :onDate:
    and o.mi_deleteDate >= '9999-12-31'
  INNER JOIN hr_dictParentUnitType pt ON pt.id = o.parentUnitTypeID
    and pt.mi_deleteDate >= '9999-12-31'
    and pt.code <> 'non'
  LEFT JOIN 
    (SELECT d.orgID, COUNT(1) as cnt
    FROM hr_department d
      LEFT JOIN hr_staffUnit pu ON pu.mi_data_id = d.parentUnitID 
    WHERE d.mi_deleteDate >= '9999-12-31'
      and d.state = 'ACTIVE'
      and d.mi_dateFrom <= :onDate:
      and d.mi_dateTo >= :onDate:
      and (d.parentUnitID IS NULL OR (pu.state='ACTIVE' and pu.mi_dateFrom <= :onDate: and pu.mi_dateTo >= :onDate:))
    GROUP BY d.orgID) d ON d.orgID = o.mi_data_id
  LEFT JOIN 
    (SELECT pos.orgID, SUM(pos.quantity) as cnt
    FROM hr_position pos
      LEFT JOIN hr_staffUnit pu ON pu.mi_data_id = pos.parentUnitID
    WHERE pos.mi_deleteDate >= '9999-12-31'
      and pos.mi_dateFrom <= :onDate:
      and pos.mi_dateTo >= :onDate:
      and pos.state = 'ACTIVE'
      and (pos.parentUnitID IS NULL OR (pu.state='ACTIVE' and pu.mi_dateFrom <= :onDate: and pu.mi_dateTo >= :onDate:))
    GROUP BY pos.orgID) pos ON pos.orgID = o.mi_data_id
  LEFT JOIN 
    (SELECT ep.organizationID, SUM(ep.mtCount) as cnt
    FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
      ${isNotInPosTypes ? 'INNER' : 'LEFT'} JOIN hr_position p ON p.mi_data_id = ep.positionID
        and p.state = 'ACTIVE'
        and p.mi_deleteDate >= '9999-12-31'
        and p.mi_dateFrom = 
          (SELECT MAX(p2.mi_dateFrom)
            FROM hr_position p2
            WHERE p2.mi_data_id = p.mi_data_id
              and p2.mi_deleteDate >= '9999-12-31'
              and p2.state = 'ACTIVE')
        and p.positionType not in (${notInPosTypes4Sql})
    WHERE ep.mi_deleteDate >= '9999-12-31'
      and ep.dateFrom <= :onDate:
      and ep.dateTo >= :onDate:
      and ep.isActive = 1
    GROUP BY ep.organizationID) ep ON ep.organizationID = o.mi_data_id
WHERE t.id = 1
  and o.limitEmpNum > 0
  and ((SELECT COUNT(DISTINCT ep.employeeNumberID) as cnt
    FROM hr_employeePosition ep
      INNER JOIN hr_employeeNumber en ON en.ID = ep.employeeNumberID
      ${isNotInPosTypes ? 'INNER' : 'LEFT'} JOIN hr_position p ON p.mi_data_id = ep.positionID
        and p.state = 'ACTIVE'
        and p.mi_deleteDate >= '9999-12-31'
        and p.mi_dateFrom = 
          (SELECT MAX(p2.mi_dateFrom)
            FROM hr_position p2
            WHERE p2.mi_data_id = p.mi_data_id
              and p2.mi_deleteDate >= '9999-12-31'
              and p2.state = 'ACTIVE')
        and p.positionType not in (${notInPosTypes4Sql})
    WHERE ep.mi_deleteDate >= '9999-12-31'
      and ep.dateFrom <= :onDate:
      and ep.dateTo >= :onDate:
      and ep.isActive = 1
      and ep.organizationID = o.mi_data_id
    ) * 100.0 / COALESCE(o.limitEmpNum, 1)) >= COALESCE(t.appointPercent,0)`
  return sql
}

/**
 * Перерахунок сумарних даних для публічного порталу
 * @param {Date} ctx.mParams.onDate - на дату
 * @param {Int} ctx.mParams.orgTotalAll - всього організацій
 * @param {Int} ctx.mParams.appointPercent - Відсоток призначень (не менше)
 * @param {Bool} ctx.mParams.refreshCurrentDataOnly - Оновлювати тільки поточні дані
 * @param {Object} ctx.mParams.formData - дані попереднього розрахунку
 **/
function fillPublicTotals (ctx) {
  const mParams = ctx.mParams
  const onDate = mParams.onDate ? new Date(mParams.onDate) : new Date()
  return fillPublicTotalsInternal({
    onDate,
    orgTotalAll: mParams.orgTotalAll,
    appointPercent: mParams.appointPercent,
    refreshCurrentData: mParams.refreshCurrentData,
    formData: mParams.formData
  })
}

function fillPublicTotalsInternal ({ onDate, orgTotalAll, appointPercent, refreshCurrentData, formData }) {
  appointPercent = appointPercent || 0
  let onDate01 = dateService.firstDayOfYear(onDate)
  let isFormData = !!formData
  let calcAll = !refreshCurrentData
  const isMsSql = entityBaseService.isMsSql()
  const totalsSql = `SELECT
      COUNT(DISTINCT d.mi_data_id) as org_count,
      SUM(d.emppos_count) as emp_count,
      ROUND((COUNT(DISTINCT d.mi_data_id) * 100.0/ ${orgTotalAll || publicOrgCount})${isMsSql ? ', 0' : ''}) as org_prc
    FROM (${getMainSql()}
      ) d
  `
  const store = UB.DataStore('hr_exportTotals')
  store.runSQL(totalsSql, { onDate: onDate })
  const dataOnDate = JSON.parse(store.asJSONObject)[0]

  let toCalcOrgTotal01 = (calcAll || (isFormData && (formData.orgTotal01 === undefined || formData.orgTotal01 === null)))
  let toCalcEmpTotal01 = (calcAll || (isFormData && (formData.empTotal01 === undefined || formData.empTotal01 === null)))
  let toCalcOrgPrc01 = (calcAll || (isFormData && (formData.fillOrgPrc01 === undefined || formData.fillOrgPrc01 === null)))

  let data01
  if (toCalcOrgTotal01 || toCalcEmpTotal01 || toCalcOrgPrc01) {
    store.runSQL(totalsSql, { onDate: onDate01 })
    data01 = JSON.parse(store.asJSONObject)[0]
  }

  let setSql = []
  setSql.push(`orgTotal = ${dataOnDate.org_count}`)
  if (toCalcOrgTotal01) {
    setSql.push(`orgTotal01 = ${data01.org_count}`)
  }
  setSql.push(`empTotal = ${dataOnDate.emp_count}`)
  if (toCalcEmpTotal01) {
    setSql.push(`empTotal01 = ${data01.emp_count}`)
  }
  setSql.push(`fillOrgPrc = ${dataOnDate.org_prc}`)
  if (toCalcOrgPrc01) {
    setSql.push(`fillOrgPrc01 = ${data01.org_prc}`)
  }

  const sqltext = `UPDATE
    hr_exportTotals
  SET
    ${setSql.join(`,
    `)}
    , calcDate = ${dateService.formatDate4Sql(onDate)}
  WHERE
    hr_exportTotals.ID = 1
    `
  store.execSQL(sqltext, {})
  store.freeNative()
  return true
}

function exportPublicTotals (onDate, exportPath) {
  const privateCabinetURL = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'privateCabinetURL')
    .selectScalar()
  const fields = ['orgTotal', 'orgTotal01', 'empTotal', 'empTotal01', 'fillOrgPrc', 'fillOrgPrc01', 'sitePurpose']
  const dataRow = UB.Repository('hr_exportTotals')
    .attrs(fields)
    .limit(1)
    .selectSingle()
  let data = [[ dataRow.orgTotal || 0, dataRow.orgTotal01 || 0, dataRow.empTotal || 0, dataRow.empTotal01 || 0,
    dataRow.fillOrgPrc || 0, dataRow.fillOrgPrc01 || 0, dataRow.sitePurpose, privateCabinetURL ]]
  let dataTable = {
    fields: [...fields, 'privateCabinetURL'],
    data: data
  }
  fs.writeFileSync(exportPath, JSON.stringify(dataTable))
  return exportPath
}
