module.exports.run = (conn) => {
    const export_methods_fields = conn.Repository('hr_exportMethodFields')
      .attrs(['ID', 'exportFieldsID.requiredTables', 'listParamID', 'listParam1ID'])
      .where('exportFieldsID.requiredTables', 'isNotNull')
      .selectAsObject()
      
      export_methods_fields.forEach(row => {
        const listParamsIds = []
        const requiredTables = JSON.parse(row['exportFieldsID.requiredTables'])
        
        if (row.listParamID && requiredTables[0]) {
          const p = Object.assign({}, requiredTables[0]);
          p.pid = row.listParamID
          listParamsIds.push(p)
        }
        if (row.listParam1ID && requiredTables[1])   {
          const p = Object.assign({}, requiredTables[1]);
          p.pid = row.listParam1ID
          listParamsIds.push(p)
        }
        
        if (listParamsIds.length) {
          const json = JSON.stringify(listParamsIds)
          conn.xhr({
            endpoint: 'runSQL',
            URLParams: { CONNECTION: 'main' },
            data: `update hr_exportMethodFields set listParamsIds = '${json}' where ID=${row.ID}`
          })
        }
      })
  }