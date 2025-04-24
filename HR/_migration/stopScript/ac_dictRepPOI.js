module.exports.run = (conn) => {
  let dict = conn.Repository('ac_dictRep')
    .attrs(['ID'])
    .where('code', '=', 'H01')
    .where('subCode', '=', '100')
    .where('repGroup', '=', 'statistical')
    .where('codeName', '=', 'Форма № 10-ПІ (річна)')
    .selectSingle()
  if (dict) {
    conn.run({
      entity: 'ac_dictRep',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: dict.ID,
        codeName: 'Форма № 10-ПОІ (річна)'
      }
    })
  }
}
