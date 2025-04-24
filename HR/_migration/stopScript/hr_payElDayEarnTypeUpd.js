module.exports.run = (conn) => {
  const EDRPOUCode = '02010787' // НМУ

  const nmuOrgID = conn.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('EDRPOUCode', '=', EDRPOUCode)
    .where('state', '=', 'ACTIVE')
    .selectScalar()

  const payElList = conn.Repository('hr_payEl')
    .attrs(['ID', 'methodID.code', 'planSumByFact'])
    .where('methodID.code', '=', '21')
    .selectAsObject()

  payElList.forEach(item => {
    conn.update({
      entity: 'hr_payEl',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dayEarningType: item['planSumByFact'] ? 'FACT' : (nmuOrgID ? 'PLANALL' : 'PLANFACT')
      }
    })
  })
}
