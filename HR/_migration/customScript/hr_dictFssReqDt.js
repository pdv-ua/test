module.exports.run = (conn) => {
  if (!conn.Repository('hr_dictFssReqDt').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()) {
    const dictFssReq = conn.Repository('hr_dictFssReq')
      .attrs(['ID', 'code'])
      .selectAsObject()
    const payEl = conn.Repository('hr_payEl')
      .attrs(['ID', 'methodID.code'])
      .where('methodID.code', 'in', ['18', '19', '20', '40', '38', '51', '52', '135', '149'])
      .selectAsObject()
    dictFssReq.forEach(fssReq => {
      if (fssReq.code === '1') {
        payEl.filter(o => ['18', '19', '20', '40', '38', '51', '52', '135'].includes(o['methodID.code'])).forEach(pay => {
          conn.insert({
            entity: 'hr_dictFssReqDt',
            execParams: {
              dictFssReqID: fssReq.ID,
              payElID: pay.ID
            }
          })
        })
      } else if (fssReq.code === '2') {
        payEl.filter(o => ['149'].includes(o['methodID.code'])).forEach(pay => {
          conn.insert({
            entity: 'hr_dictFssReqDt',
            execParams: {
              dictFssReqID: fssReq.ID,
              payElID: pay.ID
            }
          })
        })
      }
    })
  }
}
