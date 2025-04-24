module.exports.run = (conn) => {
  const dict = conn.Repository('tim_timeSheetPrintConfig')
    .attrs(['ID', 'orgID', 'printParams'])
    .selectAsObject()
  dict.forEach(row => {
    if (row.printParams) {
      const printParams = JSON.parse(row.printParams)
      const params = {
        n: {
          timeSheetMain: '1',
          timeSheetColName: '№ п/п',
          orderN: 1,
          colWidth: 20,
          fontSizeData: 10,
          fontSizeHeader: 10
        },
        tabNum: {
          timeSheetMain: '2',
          timeSheetColName: 'Таб. №',
          orderN: 2,
          colWidth: 40,
          fontSizeData: 10,
          fontSizeHeader: 10
        },
        sexType: {
          timeSheetMain: '3',
          timeSheetColName: 'Стать',
          orderN: 3,
          colWidth: 20,
          fontSizeData: 10,
          fontSizeHeader: 10
        },
        fullFIO: {
          timeSheetMain: '4',
          timeSheetColName: 'ПІБ',
          orderN: 4,
          colWidth: 200,
          fontSizeData: 10,
          fontSizeHeader: 10
        },
        posName: {
          timeSheetMain: '5',
          timeSheetColName: 'Посада',
          orderN: 5,
          colWidth: 200,
          fontSizeData: 10,
          fontSizeHeader: 10
        }
      }
      if (printParams.columnCfg) {
        Object.keys(params).forEach(paramName => {
          if (printParams.columnCfg[paramName]) {
            conn.insert({
              entity: 'tim_timeSheetPrintSettings',
              execParams: {
                orgID: row.orgID,
                paramType: '5',
                timeSheetMain: params[paramName].timeSheetMain,
                timeSheetColName: params[paramName].timeSheetColName,
                orderN: params[paramName].orderN,
                colWidth: printParams.columnCfg.colWidth || params[paramName].colWidth,
                fontSizeData: printParams.columnCfg.fontSizeData || params[paramName].fontSizeData,
                fontSizeHeader: printParams.columnCfg.fontSizeHeader || params[paramName].fontSizeHeader,
                isVertical: 0
              }
            })
          }
        })
      }
    }
  })
}
