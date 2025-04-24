module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `CREATE TABLE hr_positionFundSource (
      ID BIGINT NOT NULL
      ,positionID BIGINT NOT NULL
      ,dictFundSourceID BIGINT NOT NULL
      ,quantity NUMERIC(19, 2) NOT NULL
      ,mi_owner BIGINT NOT NULL
      ,mi_createDate DATETIME NOT NULL CONSTRAINT hr_positionFundSource_MI_CREATEDATE_DEF DEFAULT (GETUTCDATE())
      ,mi_createUser BIGINT NOT NULL
      ,mi_modifyDate DATETIME NOT NULL CONSTRAINT hr_positionFundSource_MI_MODIFYDATE_DEF DEFAULT (GETUTCDATE())
      ,mi_modifyUser BIGINT NOT NULL
      ,mi_deleteDate DATETIME NOT NULL CONSTRAINT hr_positionFundSource_MI_DELETEDATE_DEF DEFAULT (CONVERT([datetime], '31.12.9999', (104)))
      ,mi_deleteUser BIGINT NULL
    )`
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `CREATE TABLE hr_empPosFundSource (
      ID BIGINT NOT NULL
      ,employeeNumberID BIGINT NOT NULL
      ,employeePositionID BIGINT NOT NULL
      ,dictFundSourceID BIGINT NOT NULL
      ,mtCount NUMERIC(19, 2)
      ,mi_owner BIGINT NOT NULL
      ,mi_createDate DATETIME NOT NULL CONSTRAINT hr_employeePositionFundSource_MI_CREATEDATE_DEF DEFAULT (GETUTCDATE())
      ,mi_createUser BIGINT NOT NULL
      ,mi_modifyDate DATETIME NOT NULL CONSTRAINT hr_employeePositionFundSource_MI_MODIFYDATE_DEF DEFAULT (GETUTCDATE())
      ,mi_modifyUser BIGINT NOT NULL
      ,mi_deleteDate DATETIME NOT NULL CONSTRAINT hr_employeePositionFundSource_MI_DELETEDATE_DEF DEFAULT (CONVERT([datetime], '31.12.9999', (104)))
      ,mi_deleteUser BIGINT NULL
    )`
  })
}
