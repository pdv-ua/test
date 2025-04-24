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
    const existingHRReportParam_1 = conn.Repository('hr_reportParam')
      .attrs(['ID'])
      .where('reportCode', '=', 'S0301016')
      .selectScalar();

    if (!existingHRReportParam_1) {
      const newHRReportParams = [
        {
          reportCode: 'S0301016',
          // listParamID: 'FOZP', // listParamID: { associatedEntity: 'hr_listParam', codeAttr: 'code' }
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'FOZP')
            .selectScalar()
        },
        {
          reportCode: 'S0301016',
          // listParamID: 'FDZP',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'FDZP')
            .selectScalar()
        },
        {
          reportCode: 'S0301016',
          // listParamID: 'ZKV',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'ZKV')
            .selectScalar()
        },
        {
          reportCode: 'S0301016',
          // listParamID: 'notAvgQuantity',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'notAvgQuantity')
            .selectScalar()
        },
        {
          reportCode: 'S0301016',
          // listParamID: 'notFOPS03',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'notFOPS03')
            .selectScalar()
        },
      ]

      newHRReportParams.forEach((hrParam) => {
        conn.insert({
          entity: 'hr_reportParam',
          __skipOptimisticLock: true,
          execParams: hrParam
        })
      })

      // test
      /*conn.insert({
        entity: 'hr_reportParam',
        identifier: ['reportCode', 'listParamID'],
        notDelete: true,
        notUpdate: true,
        attrsConfig: {
          listParamID: { associatedEntity: 'hr_listParam', codeAttr: 'code' }
        },
        attrs: ['reportCode', 'listParamID'],
        items: [
          // Форма № 1-ПВ Звіт із праці щомісячний
          [ 'S0301016', 'FOZP' ],
          [ 'S0301016', 'FDZP' ],
          [ 'S0301016', 'ZKV' ],
          [ 'S0301016', 'notAvgQuantity' ],
          [ 'S0301016', 'notFOPS03' ],
        ]
      })*/

      console.info('Params added for "Форма № 1-ПВ Звіт із праці щомісячний"')
    } else {
      console.info('Params for "Форма № 1-ПВ Звіт із праці щомісячний" already exist in base')
    }

    // Форма № 1-ПВ Звіт із праці щоквартальний
    const existingHRReportParam_2 = conn.Repository('hr_reportParam')
      .attrs(['ID'])
      .where('reportCode', '=', 'S0301121')
      .selectScalar();

    if (!existingHRReportParam_2) {
      const newHRReportParams = [
        {
          reportCode: 'S0301121',
          // listParamID: 'FOZP',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'FOZP')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: 'FDZP',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'FDZP')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: 'ZKV',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'ZKV')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: 'notAvgQuantity',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'notAvgQuantity')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: 'notAvgQuantityAll',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'notAvgQuantityAll')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: 'notFOPS03',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', 'notFOPS03')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '3050',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '3050')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '3060',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '3060')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '3090',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '3090')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '3100',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '3100')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '4080',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '4080')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '4100',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '4100')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5040',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5040')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5050',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5050')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5051',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5051')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5052',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5052')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5070',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5070')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5080',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5080')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '5090',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '5090')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '6000',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '6000')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '6020-6120',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '6020-6120')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '6150',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '6150')
            .selectScalar()
        },
        {
          reportCode: 'S0301121',
          // listParamID: '<K>',
          listParamID: conn.Repository('hr_listParam')
            .attrs(['ID'])
            .where('code', '=', '<K>')
            .selectScalar()
        },
      ]

      newHRReportParams.forEach((hrParam) => {
        conn.insert({
          entity: 'hr_reportParam',
          __skipOptimisticLock: true,
          execParams: hrParam
        })
      })

      // test
      /*conn.insert({
        entity: 'hr_reportParam',
        identifier: ['reportCode', 'listParamID'],
        notDelete: true,
        notUpdate: true,
        attrsConfig: {
          listParamID: { associatedEntity: 'hr_listParam', codeAttr: 'code' }
        },
        attrs: ['reportCode', 'listParamID'],
        items: [
          // Форма № 1-ПВ Звіт із праці щоквартальний
          [ 'S0301121', 'FOZP' ],
          [ 'S0301121', 'FDZP' ],
          [ 'S0301121', 'ZKV' ],
          [ 'S0301121', 'notAvgQuantity' ],
          [ 'S0301121', 'notAvgQuantityAll' ],
          [ 'S0301121', 'notFOPS03' ],
          [ 'S0301121', '3050' ],
          [ 'S0301121', '3060' ],
          [ 'S0301121', '3090' ],
          [ 'S0301121', '3100' ],
          [ 'S0301121', '4080' ],
          [ 'S0301121', '4100' ],
          [ 'S0301121', '5040' ],
          [ 'S0301121', '5050' ],
          [ 'S0301121', '5051' ],
          [ 'S0301121', '5052' ],
          [ 'S0301121', '5070' ],
          [ 'S0301121', '5080' ],
          [ 'S0301121', '5090' ],
          [ 'S0301121', '6000' ],
          [ 'S0301121', '6020-6120' ],
          [ 'S0301121', '6150' ],
          [ 'S0301121', '<K>' ],
        ]
      })*/

      console.info('Params added for "Форма № 1-ПВ Звіт із праці щоквартальний"')
    } else {
      console.info('Params for "Форма № 1-ПВ Звіт із праці щоквартальний" already exist in base')
    }
  } catch (error) {
    console.log(error);
  }
}
