module.exports.run = (conn, migrationParams) => {
  const employeePayOut = conn.Repository('hr_employeePayOut')
    .attrs(['exportMethodIdOld', 'employeeNumberID.orgID'])
    .where('exportMethodIdOld', 'isNotNull')
    .selectAsObject({
      'employeeNumberID.orgID': 'organizationID',
      'exportMethodIdOld': 'exportMethodIdOld'
    })

  const itemList1 = [
    [ 'Приват24', 'branchCode', 'BRANCH', '', 3, 'C' ],
    [ 'Приват24', 'projectCode', 'ZPKOD', '', 3, 'C' ],
    [ 'Приват24', 'personalAccount', 'CARD_NO', '', 30, 'C' ],
    [ 'Приват24', 'taxCodeType', 'LSTBL', '', 10, 'C' ],
    [ 'Приват24', 'lastName', 'FAM', '', 50, 'C' ],
    [ 'Приват24', 'firstName', 'NAME', '', 50, 'C' ],
    [ 'Приват24', 'middleName', 'OT', '', 50, 'C' ],
    [ 'Приват24', 'paySum', 'RLSUM', '', 17, 'N' ],
    [ 'Приват24', 'taxCode9', 'INN', '', 20, 'C' ],
    [ 'Приват24', 'namePayRoll', 'RLKOD', '', 30, 'C' ],
    [ 'Приват24', 'bankSubAccount', 'CARD_PR_S', '', 29, 'C' ]
  ]
  const itemList2 = [
    [ 'Ощадбанк', 'taxCodeType', 'NSC', '', 29, 'C' ],
    [ 'Ощадбанк', 'paySum', 'SUMMA', '', 18, 'N' ],
    [ 'Ощадбанк', 'fullFIO', 'FIO', '', 38, 'C' ],
    [ 'Ощадбанк', 'taxCodeType', 'ID_KOD', '', 14, 'C' ]
  ]
  const itemList3 = [
    [ 'Райфайзенбанк', 'personalAccount', 'ACCT_CARD', '', 29, 'C' ],
    [ 'Райфайзенбанк', 'fullFIO', 'FIO', '', 38, 'C' ],
    [ 'Райфайзенбанк', 'paySum', 'SUMA', '', 18, 'N' ],
    [ 'Райфайзенбанк', 'taxCode10', 'ID_CODE', '', 14, 'C' ]
  ]
  const itemList4 = [
    [ 'Укргазбанк', 'personalAccount', 'SBK_NUM', '', 29, 'C' ],
    [ 'Укргазбанк', 'bankSubAccount', 'SBK_ACC', '', 29, 'C' ],
    [ 'Укргазбанк', 'paySum', 'SBK_SUM', '', 18, 'N' ],
    [ 'Укргазбанк', 'fullFIO', 'SBK_FIO', '', 38, 'C' ],
    [ 'Укргазбанк', 'taxCode10', 'SBK_INN', '', 38, 'C' ],
    [ 'Укргазбанк', 'personalAccount', 'IBAN_NUM', '', 14, 'C' ]
  ]

  if (employeePayOut.length) {
    employeePayOut.forEach(row => {
      let exportMethodID1
      let exportMethodID2
      let exportMethodID3
      let exportMethodID4

      if (row.exportMethodIdOld === '1') {
        exportMethodID1 = conn.Repository('hr_exportMethod')
          .attrs('ID')
          .where('name', '=', 'Приват24')
          .where('orgID', '=', row.organizationID)
          .selectScalar()
        if (!exportMethodID1) {
          exportMethodID1 = conn.insert({
            entity: 'hr_exportMethod',
            fieldList: ['ID'],
            execParams: {
              name: 'Приват24',
              shortName: 'Приват24',
              typeFile: 'filePay',
              isActive: 1,
              orgID: row.organizationID
            }
          })
        }
        if (exportMethodID1) {
          conn.xhr({
            endpoint: 'runSQL',
            URLParams: { CONNECTION: 'main' },
            data: `update hr_employeePayOut set exportMethodID = ${exportMethodID1} where exportMethodIdOld ='1'`
          })
          itemList1.forEach(item => {
            const exportFields = conn.Repository('hr_exportFields')
              .attrs('ID')
              .where('code', '=', item[1])
              .selectScalar()
            const exportMethodFields = exportFields ? conn.Repository('hr_exportMethodFields')
              .attrs('ID')
              .where('exportMethodID', '=', exportMethodID1)
              .where('exportFieldsID', '=', exportFields)
              .where('name', '=', item[2])
              .selectScalar() : null
            if (exportFields && !exportMethodFields) {
              conn.insert({
                entity: 'hr_exportMethodFields',
                execParams: {
                  exportMethodID: exportMethodID1,
                  exportFieldsID: exportFields,
                  name: item[2],
                  size: item[4],
                  typeColumn: item[5]
                }
              })
            }
          })
        }
      }
      if (row.exportMethodIdOld === '2') {
        exportMethodID2 = conn.Repository('hr_exportMethod')
          .attrs('ID')
          .where('name', '=', 'Ощадбанк')
          .where('orgID', '=', row.organizationID)
          .selectScalar()
        if (!exportMethodID2) {
          exportMethodID2 = conn.insert({
            entity: 'hr_exportMethod',
            fieldList: ['ID'],
            execParams: {
              name: 'Ощадбанк',
              shortName: 'Ощадбанк',
              typeFile: 'filePay',
              isActive: 1,
              orgID: row.organizationID
            }
          })
        }
        if (exportMethodID2) {
          conn.xhr({
            endpoint: 'runSQL',
            URLParams: { CONNECTION: 'main' },
            data: `update hr_employeePayOut set exportMethodID = ${exportMethodID2} where exportMethodIdOld ='2'`
          })
          itemList2.forEach(item => {
            const exportFields = conn.Repository('hr_exportFields')
              .attrs('ID')
              .where('code', '=', item[1])
              .selectScalar()
            const exportMethodFields = exportFields ? conn.Repository('hr_exportMethodFields')
              .attrs('ID')
              .where('exportMethodID', '=', exportMethodID2)
              .where('exportFieldsID', '=', exportFields)
              .where('name', '=', item[2])
              .selectScalar() : null
            if (exportFields && !exportMethodFields) {
              conn.insert({
                entity: 'hr_exportMethodFields',
                execParams: {
                  exportMethodID: exportMethodID2,
                  exportFieldsID: exportFields,
                  name: item[2],
                  size: item[4],
                  typeColumn: item[5]
                }
              })
            }
          })
        }
      }
      if (row.exportMethodIdOld === '3') {
        exportMethodID3 = conn.Repository('hr_exportMethod')
          .attrs('ID')
          .where('name', '=', 'Райфайзенбанк')
          .where('orgID', '=', row.organizationID)
          .selectScalar()
        if (!exportMethodID3) {
          exportMethodID3 = conn.insert({
            entity: 'hr_exportMethod',
            fieldList: ['ID'],
            execParams: {
              name: 'Райфайзенбанк',
              shortName: 'Райфайзенбанк',
              typeFile: 'filePay',
              isActive: 1,
              orgID: row.organizationID
            }
          })
        }
        if (exportMethodID3) {
          conn.xhr({
            endpoint: 'runSQL',
            URLParams: { CONNECTION: 'main' },
            data: `update hr_employeePayOut set exportMethodID = ${exportMethodID3} where exportMethodIdOld ='3'`
          })
          itemList3.forEach(item => {
            const exportFields = conn.Repository('hr_exportFields')
              .attrs('ID')
              .where('code', '=', item[1])
              .selectScalar()
            const exportMethodFields = exportFields ? conn.Repository('hr_exportMethodFields')
              .attrs('ID')
              .where('exportMethodID', '=', exportMethodID3)
              .where('exportFieldsID', '=', exportFields)
              .where('name', '=', item[2])
              .selectScalar() : null
            if (exportFields && !exportMethodFields) {
              conn.insert({
                entity: 'hr_exportMethodFields',
                execParams: {
                  exportMethodID: exportMethodID3,
                  exportFieldsID: exportFields,
                  name: item[2],
                  size: item[4],
                  typeColumn: item[5]
                }
              })
            }
          })
        }
      }
      if (row.exportMethodIdOld === '4') {
        exportMethodID4 = conn.Repository('hr_exportMethod')
          .attrs('ID')
          .where('name', '=', 'Укргазбанк')
          .where('orgID', '=', row.organizationID)
          .selectScalar()
        if (!exportMethodID4) {
          exportMethodID4 = conn.insert({
            entity: 'hr_exportMethod',
            fieldList: ['ID'],
            execParams: {
              name: 'Укргазбанк',
              shortName: 'Укргазбанк',
              typeFile: 'filePay',
              isActive: 1,
              orgID: row.organizationID
            }
          })
        }
        if (exportMethodID4) {
          conn.xhr({
            endpoint: 'runSQL',
            URLParams: { CONNECTION: 'main' },
            data: `update hr_employeePayOut set exportMethodID = ${exportMethodID4} where exportMethodIdOld ='4'`
          })
          itemList4.forEach(item => {
            const exportFields = conn.Repository('hr_exportFields')
              .attrs('ID')
              .where('code', '=', item[1])
              .selectScalar()
            const exportMethodFields = exportFields ? conn.Repository('hr_exportMethodFields')
              .attrs('ID')
              .where('exportMethodID', '=', exportMethodID4)
              .where('exportFieldsID', '=', exportFields)
              .where('name', '=', item[2])
              .selectScalar() : null
            if (exportFields && !exportMethodFields) {
              conn.insert({
                entity: 'hr_exportMethodFields',
                execParams: {
                  exportMethodID: exportMethodID4,
                  exportFieldsID: exportFields,
                  name: item[2],
                  size: item[4],
                  typeColumn: item[5]
                }
              })
            }
          })
        }
      }
    })
  }
}
