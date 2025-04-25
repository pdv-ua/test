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
    // ПДФО_ЄСВ
    const subCodes = ['001','101','104','105','106']
    subCodes.forEach(subCode => {
      const versionOldID = conn.Repository('ac_dictRepVersion')
      .attrs(['ID'])
      .where('code', '=', 'J05')
      .where('subCode', '=', subCode)
      .where('version', '=', '09')
      .selectScalar()
      if (versionOldID) {
        conn.update({
          entity: 'ac_dictRepVersion',
          __skipOptimisticLock: true,
          execParams: {
            ID: versionOldID,
            dateTo: '2024-12-31T00:00:00Z'
          }
        })  
      }          
    })
    console.info('ac_dictRep - J0509 dateTo updated');

    // ПДФО_ЄСВ_2025
    let reportParamId = conn.Repository('ac_dictRep')
      .attrs(['ID'])
      .where('code', '=', 'J05')
      .where('subCode', '=', '001')
      .where('codeName', '=', 'ПДФО_ЄСВ_2025')
      .selectScalar()
    console.info('ac_dictRep - id: ' + reportParamId);

    if (reportParamId) {
      conn.update({
        entity: 'ac_dictRep',
        __skipOptimisticLock: true,
        execParams: {
          ID: reportParamId,
          mainParamsForm: 'J0500110Params'
        }
      })
      console.info('ac_dictRep - mainParamsForm updated to J0500110Params');

    } else {
      conn.insert({
        entity: 'ac_dictRep',
        __skipOptimisticLock: true,
        execParams: {
          code: 'J05',
          subCode: '001',
          fullCode: 'J05001',
          codeName: 'ПДФО_ЄСВ_2025',
          repGroup: 'taxation',
          name: 'Податковий розрахунок сум доходу, нарахованого (сплаченого) на користь платників податків - фізичних осіб, і сум утриманого з них податку, а також сум нарахованого єдиного внеску',
          isFolder: 0,
          isAdditional: 0,
          isOrigin: 1,
          autoUpdateSettingCalc: 1,
          mainParamsForm: 'J0500110Params',
          model: 'HR',
          description: 'ПДФО_ЄСВ Податковий розрахунок сум доходу, нарахованого (сплаченого) на користь платників податків - фізичних осіб, і сум утриманого з них податку, а також сум нарахованого єдиного внеску',
        }
      })
      console.info('ac_dictRep - mainParamsForm inserted to J0500110Params');

      reportParamId = conn.Repository('ac_dictRep')
        .attrs(['ID'])
        .where('code', '=', 'J05')
        .where('subCode', '=', '001')
        .where('codeName', '=', 'ПДФО_ЄСВ_2025')
        .selectScalar()
      console.info('ac_dictRep - id: ' + reportParamId);
    }

    const subCodesWithCodeName = [
      {subCode: '001', codeName: 'ПДФО_ЄСВ_2025'},
      {subCode: '101', codeName: 'Додаток 1'},
      {subCode: '104', codeName: 'Додаток 4 ДФ'},
      {subCode: '105', codeName: 'Додаток 5'},
      {subCode: '106', codeName: 'Додаток 6'},
    ]
  
    subCodesWithCodeName.forEach(subCodeWithCodeName => {
      const { subCode, codeName } = subCodeWithCodeName
      const versionNewID = conn.Repository('ac_dictRepVersion')
      .attrs(['ID'])
      .where('code', '=', 'J05')
      .where('subCode', '=', subCode)
      .where('version', '=', '10')
      .selectScalar()

      if (!versionNewID) {
        const currentReportParamId = conn.Repository('ac_dictRep')
          .attrs(['ID'])
          .where('code', '=', 'J05')
          .where('subCode', '=', subCode)
          .where('codeName', '=', codeName)
          .selectScalar()

        conn.insert({
          entity: 'ac_dictRepVersion',
          __skipOptimisticLock: true,
          execParams: {
            code: 'J05',
            subCode: subCode,
            version: '10',
            dictRepID: currentReportParamId, // ПДФО_ЄСВ_2025,
            dateFrom: '2025-01-01T00:00:00Z',
            dateTo: null,
          }
        })
      }  
    })
    console.info('ac_dictRepVersion -  J05 v10 inserted');

    const dictRepTypeCodes = [1, 2, 3, 5, 6, 7, 10, 11, 12, 15, 16, 17]
    dictRepTypeCodes.forEach(dictRepTypeCode => {
      const dictRepTypeID = conn.Repository('ac_dictRepType')
        .attrs(['ID'])
        .where('code', '=', dictRepTypeCode)
        .selectScalar()
      const existRow = conn.Repository('ac_dictRepPeriod')
        .attrs(['ID'])
        .where('dictRepID', '=', reportParamId)
        .where('dictRepTypeID', '=', dictRepTypeID)
        .selectScalar()

      if (dictRepTypeID && !existRow) {
        conn.insert({
          entity: 'ac_dictRepPeriod',
          __skipOptimisticLock: true,
          execParams: {
            dictRepID: reportParamId,
            dictRepTypeID: dictRepTypeID
          }
        })
      }
    })
    console.info('ac_dictRepPeriod - J05001 inserted');

  } catch (error) {
    console.log(error);
  }
}
