module.exports.run = (conn) => {
  let reqList = conn.Repository('hr_request')
    .attrs(['ID', 'signatories'])
    .where('signatories', 'isNotNull')
    .selectAsObject()
  reqList.forEach(req => {
    const signatoriesList = req['signatories'].split(',').map((el, idx) => { return { itemIdx: idx + 1, stageKind: 'VISA', recipientID: Number(el) } })
    conn.run({
      entity: 'hr_request',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: req.ID,
        signatories: JSON.stringify(signatoriesList)
      }
    })
  })
}
