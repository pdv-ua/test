module.exports = [
  {
    dialect: 'MSSQL2012',
    name: 'ISEAuthUserPlainReturnsRecordset',
    sql:
      `CREATE PROCEDURE [dbo].[ISEAuthUserPlainReturnsRecordset]
        @username varchar(64), @password varchar(255)
AS
BEGIN
   IF EXISTS( 
     select u.name as username from uba_user u 
          inner join hr_vpninfo v on u.ID = v.userID 
          where u.isPending <> 1 and u.disabled <> 1 and u.name = @username
          AND  v.uPasswordHashVpn  = @password
        )
        SELECT 0,11,'This is a very good user, give him all access','No Error'
            from uba_user u 
            inner join hr_vpninfo v on u.ID = v.userID 
            where u.isPending <> 1 and u.disabled <> 1 and u.name = @username
   ELSE
        SELECT 3,0,'odbc','ODBC Authen Error'
END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'ISEUserLookupReturnsRecordset',
    sql:
      `CREATE PROCEDURE [dbo].[ISEUserLookupReturnsRecordset]
        @username varchar(64)
AS
BEGIN
        IF EXISTS( select u.name from uba_user u
             inner join hr_vpninfo v on u.ID = v.userID
              where u.isPending <> 1 and u.disabled <> 1 and u.name = @username )
           SELECT 0,11,'This is a very good user, give him all access','No Error'
           FROM  uba_user u inner join hr_vpninfo v on u.ID = v.userID
           where u.name = @username and u.isPending <> 1 and u.disabled <> 1
        ELSE
          SELECT 3,0,'odbc','ODBC Authen Error'
END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'ISEFetchPasswordReturnsRecordset',
    sql:
      `CREATE PROCEDURE [dbo].[ISEFetchPasswordReturnsRecordset]
        @username varchar(64)
AS
BEGIN
        IF EXISTS( select u.name from uba_user u
                   inner join hr_vpninfo v on u.ID = v.userID
                   where u.isPending <> 1 and u.disabled <> 1 and u.name = @username)
           SELECT 0,11,'This is a very good user, give him all access','No Error', v.uPasswordHashVpn as password
           FROM  uba_user u inner join hr_vpninfo v on u.ID = v.userID
           where u.name = @username and u.isPending <> 1 and u.disabled <> 1
        ELSE
           SELECT 3,0,'odbc','ODBC Authen Error'
END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'ISEUserLookupReturnsRecordset',
    sql:
      `CREATE PROCEDURE [dbo].[ISEUserLookupReturnsRecordset]
        @username varchar(64)
AS
BEGIN
        IF EXISTS( select u.name from uba_user u
                   inner join hr_vpninfo v on u.ID = v.userID
                   where u.isPending <> 1 and u.disabled <> 1 and u.name = @username)
           SELECT 0,11,'This is a very good user, give him all access','No Error'
           FROM  uba_user u inner join hr_vpninfo v on u.ID = v.userID
           where u.name = @username and u.isPending <> 1 and u.disabled <> 1
        ELSE
           SELECT 3,0,'odbc','ODBC Authen Error'
END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'ISEGroupsH',
    sql:
      `CREATE PROCEDURE [dbo].[ISEGroupsH]
        @username varchar(64), @result int output
AS
BEGIN
        if exists ( select u.name from uba_user u
                                      inner join hr_vpninfo v on u.ID = v.userID
                                      where u.isPending <> 1 and u.disabled <> 1 and u.name = @username)
        begin
           set @result = 0
           select 'accountants', 'engineers', 'sales','test_group2'
        end
        else
           set @result = 1
END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'ISEAttrsH',
    sql:
      `CREATE PROCEDURE [dbo].[ISEAttrsH]
        @username varchar(64), @result int output
AS
BEGIN
        if exists ( select u.name from uba_user u
                                      inner join hr_vpninfo v on u.ID = v.userID
                                      where u.isPending <> 1 and u.disabled <> 1 and u.name = @username)
        begin
                set @result = 0
                 select
                   '' as phone, u.name as username, 'HR' as department, '99' as floor, 'hr' as memberOf, 0 as isManager
                 from uba_user u
                 inner join hr_vpninfo v on u.ID = v.userID
                 where u.isPending <> 1 and u.disabled <> 1 and u.name = @username
                -- select phone as phone, username as username, department as department, floor as floor, memberOf as memberOf, isManager as isManager
                -- from NetworkUsers where username = @username
        end
        else
                set @result = 1
END`
  }
]
