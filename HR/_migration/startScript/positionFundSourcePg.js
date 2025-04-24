module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `CREATE TABLE hr_positionFundSource (
      ID BIGINT not null,
      positionID BIGINT NOT NULL,
      dictFundSourceID BIGINT NOT NULL,
      quantity NUMERIC(19, 2) NOT NULL,
      mi_owner BIGINT not null,
      mi_createDate TIMESTAMP default timezone('utc'::text, now()) not null,
      mi_createUser BIGINT not null,
      mi_modifyDate TIMESTAMP default timezone('utc'::text, now()) not null,
      mi_modifyUser BIGINT not null,
      mi_deleteDate TIMESTAMP default '9999-12-31 00:00:00'::timestamp without time zone not null,
      mi_deleteUser BIGINT null
    )`
  })

  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `CREATE TABLE hr_empPosFundSource (
      ID BIGINT NOT NULL,
      employeeNumberID BIGINT NOT NULL,
      employeePositionID BIGINT NOT NULL,
      dictFundSourceID BIGINT NOT NULL,
      mtCount NUMERIC(19, 2),
      mi_owner BIGINT NOT NULL,
      mi_createDate timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
      mi_createUser BIGINT NOT NULL,
      mi_modifyDate timestamp NOT NULL DEFAULT timezone('utc'::text, now()),
      mi_modifyUser BIGINT NOT NULL,
      mi_deleteDate timestamp NOT NULL DEFAULT '9999-12-31 00:00:00'::timestamp without time zone,
      mi_deleteUser BIGINT NULL
    )`
  })
}
