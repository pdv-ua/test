const fs = require('fs')
const path = require('path')

module.exports.run = (conn) => {
  const EDRPOUCode = '92010787' // НМУ Студенти

  const orgID = conn.Repository('hr_organization')
    .attrs(['mi_data_id'])
    .where('EDRPOUCode', '=', EDRPOUCode)
    .where('state', '=', 'ACTIVE')
    .selectScalar()

  const configFilePath = path.join('../../HR', '_apiconfig.json')
  if (orgID && fs.existsSync(configFilePath)) {
    const config = fs.readFileSync(configFilePath, 'utf8')
    conn.run({
      entity: 'ac_importConfig',
      method: 'insert',
      execParams: {
        orgID,
        code: 'importStudent',
        params: config
      }
    })
  }
}
