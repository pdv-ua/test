const argv = require('@unitybase/base').argv
const http = require('http')

module.exports = function addOrgTypes() {
  console.info('=====================================');
  console.info(' Add hr_reportParam');
  console.info('=====================================');

  const Session = argv.establishConnectionFromCmdLineAttributes();
  const conn = Session.connection;
  http.setGlobalConnectionDefaults({ receiveTimeout: 1200000 });
  const reportCodes = [
    'notAvgQuantity',
    'ECBR011G3',
    'ECBR012G3',
    'ECBR013G3',
    'ECBR014G3',
    'ECBR015G3',
    'ECBVAC',
    'ECBT1RG13',
    'ECBT1RG14',
    'ECBT1RG16',
    'ECBTDOPTC',
    'ECBR016G3',
    'ECBR095G3'
  ]

  try {
    // ПДФО_ЄСВ
    const existingHRReportParam = conn.Repository('hr_reportParam')
      .attrs(['ID'])
      .where('reportCode', '=', 'J0500110')
      .selectScalar();

    if (!existingHRReportParam) {
      const hrListParamIDs = conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', 'in', reportCodes)
            .selectAsArrayOfValues()

        hrListParamIDs.forEach((id) => {
        conn.insert({
          entity: 'hr_reportParam',
          __skipOptimisticLock: true,
          execParams: {
            reportCode: 'J0500110',
            listParamID: id
          }
        })
      })
      console.info('Params added for "ПДФО_ЄСВ"')
    } else {
      console.info('Params for "ПДФО_ЄСВ" already exist in base')
    }
  } catch (error) {
    console.log(error)
  }
}
