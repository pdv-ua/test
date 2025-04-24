module.exports.run = (conn) => {
  const milService = conn.Repository('hr_empOrderMilserviceDet')
    .attrs(['ID', 'milType'])
    .selectAsObject()
  let dictMilDuty = conn.Repository('hr_dictMilitaryDuty')
    .attrs(['ID', 'code'])
    .where('code', 'in', ['1', '2'])
    .selectAsObject()
  let termDuty = dictMilDuty.find(itm => itm.code === '1')
  if (!termDuty) {
    conn.insert({
      entity: 'hr_dictMilitaryDuty',
      execParams: {
        code: '1',
        name: 'Строкова',
        orderTitle: 'на строкову військову службу',
        orderText: 'служби за контрактом'
      }
    })
  }
  let contractDuty = dictMilDuty.find(itm => itm.code === '2')
  if (!contractDuty) {
    conn.insert({
      entity: 'hr_dictMilitaryDuty',
      execParams: {
        code: '2',
        name: 'Контракт',
        orderTitle: 'за контрактом',
        orderText: 'строкової військової служби'
      }
    })
  }
  dictMilDuty = conn.Repository('hr_dictMilitaryDuty')
    .attrs(['ID', 'code'])
    .where('code', 'in', ['1', '2'])
    .selectAsObject()
  termDuty = dictMilDuty.find(itm => itm.code === '1')
  let termDutyID = termDuty.ID
  contractDuty = dictMilDuty.find(itm => itm.code === '2')
  let contractDutyID = contractDuty.ID

  milService.forEach(item => {
    conn.update({
      entity: 'hr_empOrderMilserviceDet',
      __skipOptimisticLock: true,
      execParams: {
        ID: item.ID,
        dictMilitaryDutyID: item.milType === 'CONTRACT' ? contractDutyID : termDutyID
      }
    })
  })
}
