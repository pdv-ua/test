const argv = require('@unitybase/base').argv
const http = require('http')

module.exports = function addAccountTypeEnum() {
  console.info('=======================================================');
  console.info(' Add new hr reports ');
  console.info('=======================================================');

  const Session = argv.establishConnectionFromCmdLineAttributes();
  const conn = Session.connection;
  http.setGlobalConnectionDefaults({ receiveTimeout: 1200000 });

  try {
    // Форма № 1-ПВ Звіт із праці щомісячний
    const reportParamId_1 = conn.Repository('ac_dictRep')
      .attrs(['ID'])
      .where('code', '=', 'S03')
      .where('subCode', '=', '010')
      .selectScalar();

    if (reportParamId_1) {
      conn.update({
          entity: 'ac_dictRep',
          __skipOptimisticLock: true,
          execParams: {
            ID: reportParamId_1,
            mainParamsForm: 'S0301016Params'
          }
        })
      console.info('ac_dictRep - mainParamsForm updated to S0301016Params');

      const versionId_old = conn.Repository('ac_dictRepVersion')
        .attrs(['ID'])
        .where('code', '=', 'S03')
        .where('subCode', '=', '010')
        .where('version', '=', '15')
        .selectScalar();

      conn.update({
          entity: 'ac_dictRepVersion',
          __skipOptimisticLock: true,
          execParams: {
            ID: versionId_old,
            dateTo: '2024-12-31T00:00:00Z' // '2023-12-31 00:00:00'
          }
        })
      console.info('ac_dictRep - S0301015 dateTo updated');

      const versionId_new = conn.Repository('ac_dictRepVersion')
        .attrs(['ID'])
        .where('code', '=', 'S03')
        .where('subCode', '=', '010')
        .where('version', '=', '16')
        .selectScalar();

      if (!versionId_new) {
        conn.insert({
            entity: 'ac_dictRepVersion',
            __skipOptimisticLock: true,
            execParams: {
              code: 'S03',
              subCode: '010',
              version: '16',
              dictRepID: reportParamId_1, // '1-ПВ місячна',
              dateFrom: '2025-01-01T00:00:00Z',
              dateTo: null,
            }
          })
        console.info('ac_dictRep - S0301016 inserted');
      }
    }

    // ==============================================================================
    // Форма № 1-ПВ Звіт із праці щоквартальний
    const reportParamId_2 = conn.Repository('ac_dictRep')
      .attrs(['ID'])
      .where('code', '=', 'S03')
      .where('subCode', '=', '011')
      .selectScalar();

    if (reportParamId_2) {
      conn.update({
          entity: 'ac_dictRep',
          __skipOptimisticLock: true,
          execParams: {
            ID: reportParamId_2,
            mainParamsForm: 'S0301121Params'
          }
        })
      console.info('ac_dictRep - mainParamsForm updated to S0301121Params');

      const versionId_old = conn.Repository('ac_dictRepVersion')
        .attrs(['ID'])
        .where('code', '=', 'S03')
        .where('subCode', '=', '011')
        .where('version', '=', '20')
        .selectScalar();

      conn.update({
          entity: 'ac_dictRepVersion',
          __skipOptimisticLock: true,
          execParams: {
            ID: versionId_old,
            dateTo: '2024-12-31T00:00:00Z' // '2023-12-31 00:00:00'
          }
        })
      console.info('ac_dictRep - S0301120 dateTo updated');

      const versionId_new = conn.Repository('ac_dictRepVersion')
        .attrs(['ID'])
        .where('code', '=', 'S03')
        .where('subCode', '=', '011')
        .where('version', '=', '21')
        .selectScalar();

      if (!versionId_new) {
        conn.insert({
            entity: 'ac_dictRepVersion',
            __skipOptimisticLock: true,
            execParams: {
              code: 'S03',
              subCode: '011',
              version: '21',
              dictRepID: reportParamId_2, // '1-ПВ квартальна',
              dateFrom: '2025-01-01T00:00:00Z',
              dateTo: null,
            }
          })
        console.info('ac_dictRep - S0301121 inserted');
      }
    }
  } catch (error) {
    console.log(error);
  }
}
