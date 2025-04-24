const path = require('path')
const fs = require('fs')
const { dataLoader, csv } = require('@unitybase/base')
const execSql = require('@unitybase/ubcli/lib/execSql')


// to fill more tables with more csv just expand this array!
const fileData = [
  {
    csvName: "hr_dictacademstatus.sql",
    metaName: "hr_DictAcademStatus",
    columns: "id;code;name;setstatus;isofficial;namegen;namedat;mi_owner;mi_createdate;mi_createuser;mi_modifydate;mi_modifyuser;mi_deletedate;mi_deleteuser"
  }
]

const fillTables = (fileData, session ) => {
  const {connection} = session
  fileData.forEach(({ csvName, metaName, columns, mainField }) => {
      
   
 let options = {
      connection: 'main',
      file: path.join(__dirname,'data',csvName),
      optimistic: true,
      progress: false
  }
 execSql(options)

      //const fContent = fs.readFileSync(path.join(__dirname,'data',csvName), { encoding: 'utf8' }).trim()
      //if (!fContent) {
     //   throw new Error(`File ${csvName} is empty or not exist`)
     // }

      //delete all
      //connection.doDelete({entity: metaName})

      //const csvData = csv.parse(fContent)
      //const splitColumns = columns.split(';')
      //const mainFieldIndex = splitColumns.findIndex(field => field === mainField)
      //const notExisted = csvData.filter(row => !conn.lookup(metaName, 'ID', conn.Repository(metaName).where(mainField, '=', row[mainFieldIndex]).ubql().whereList))
      //const arrColumns = splitColumns.map((_, index) => index)
      //console.info(`\t\tFill ${metaName} table from ${csvName}`)
      //dataLoader.loadArrayData(conn, csvData, metaName, splitColumns, arrColumns, 1000)
    }
  )
}

module.exports = function (session) {
  fillTables(fileData, session)
}