const UB = require('@unitybase/ub')
// const _ = require('lodash')

module.exports = {
  doPosting,
  doCancelPosting
}

function getOnDateOrgID (orgID, onDate) {
  const org = UB.Repository('hr_organization')
    .attrs(['ID', 'mi_data_id'])
    .where('mi_data_id', '=', orgID)
    .where('mi_dateFrom', '<=', onDate)
    .where('mi_dateTo', '>=', onDate)
    .where('state', '=', 'ACTIVE')
    .where('mi_deleteDate', '>=', '#maxdate')
    .limit(1)
    .selectSingle()
  return org && org.ID
}

/**
 * @param {ubMethodParams} ctx
 */
function doPosting (ctx) {
  const execParams = ctx.mParams.execParams
  const orderID = execParams.ID

  const listPosContestRep = UB.DataStore('hr_listPosContest')

  const existPosContest = UB.Repository('hr_listPosContest')
    .attrs(['ID', 'orderID', 'paraID', 'paraPosID', 'organizationID', 'positionID', 'state'])
    .where('orderID', '=', orderID)
    .selectAsObject()

  const details = UB.Repository('hr_empOrderCompetitionadDet')
    .attrs(['ID', 'itemIdx'])
    .where('orderID', '=', orderID)
    .selectAsObject()

  details.forEach(detailItem => {
    const detailsPos = UB.Repository('hr_empOrderCompetitionadPosDet')
      .attrs(['ID', 'itemIdx', 'orderID', 'paraID', 'organizationID', 'positionID'])
      .where('paraID', '=', detailItem.ID)
      .selectAsObject()

    detailsPos.forEach(detailPosItem => {
      const paraID = detailItem.ID
      const paraPosID = detailPosItem.ID

      const found = existPosContest.find(ite => ite.paraID === paraID && ite.paraPosID === paraPosID)
      if (!found) {
        const onDate = new Date()
        const orgID = getOnDateOrgID(detailPosItem.organizationID, onDate)
        const execParams = {
          orderID: detailPosItem.orderID,
          paraID: paraID,
          paraPosID: paraPosID,
          organizationID: orgID,
          positionID: detailPosItem.positionID,
          state: 'NEW'
        }
        listPosContestRep.run('insert', {
          execParams: execParams
        })
      }
    })
  })

  // listPosContestRep.generateID()
}

/**
 * @param {ubMethodParams} ctx
 */
function doCancelPosting (ctx) {
  const execParams = ctx.mParams.execParams
  const orderID = execParams.ID

  const listPosContestRep = UB.DataStore('hr_listPosContest')

  const existPosContest = UB.Repository('hr_listPosContest')
    .attrs(['ID', 'orderID', 'paraID', 'paraPosID', 'organizationID', 'positionID', 'state'])
    .where('orderID', '=', orderID)
    .selectAsObject()

  const details = UB.Repository('hr_empOrderCompetitionadDet')
    .attrs(['ID', 'itemIdx'])
    .where('orderID', '=', orderID)
    .selectAsObject()

  details.forEach(detailItem => {
    const detailsPos = UB.Repository('hr_empOrderCompetitionadPosDet')
      .attrs(['ID', 'itemIdx', 'orderID', 'paraID', 'organizationID', 'positionID'])
      .where('paraID', '=', detailItem.ID)
      .selectAsObject()

    detailsPos.forEach(detailPosItem => {
      const paraID = detailItem.ID
      const paraPosID = detailPosItem.ID

      const found = existPosContest.find(ite => ite.paraID === paraID && ite.paraPosID === paraPosID)
      if (found) {
        if (found.state !== 'NEW') {
          throw new UB.UBAbort(`<<<${UB.i18n('Скасування даного наказу неможливе: наказ в опрацюванні {0}', found.state)}>>>`)
        }

        listPosContestRep.run('delete', {
          __skipOptimisticLock: true,
          execParams: {
            ID: found.ID
          }
        })
      }
    })
  })
}
