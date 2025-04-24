module.exports.run = (conn) => {
  conn.run({
    entity: 'hr_dictTaxIndivid',
    method: 'normalizePayElEntry'
  })
}
