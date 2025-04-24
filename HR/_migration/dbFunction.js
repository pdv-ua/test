module.exports = [
  {
    dialect: 'MSSQL2012',
    name: 'depNamePath',
    sql: ` CREATE FUNCTION depNamePath (@startDepID BIGINT, @onDate DATETIME, @orgID BIGINT, @delimiter VARCHAR(2))
    RETURNS VARCHAR(2000) AS
    BEGIN
      DECLARE @result VARCHAR(2000) = null;
      DECLARE @mi_data_id BIGINT;
      DECLARE @name VARCHAR(250);
      DECLARE @CURSOR CURSOR;
      
      SET @CURSOR = CURSOR SCROLL
      FOR
          with RecursiveQuery (mi_data_id, parentUnitID, name, levelDep) as (
            Select st.mi_data_id, st.parentUnitID, st.name, 0 as levelDep
            From hr_staffUnit st
            Where
              st.orgID = @orgID
              and st.mi_data_id = (select a.mi_data_id from hr_staffUnit a where a.id = @startDepID)
              and st.mi_unityEntity != 'hr_organization'
              and st.mi_deleteDate >= '9999-12-31'
              and @onDate between st.mi_dateFrom and st.mi_dateTo
              and st.state = 'ACTIVE'
            UNION ALL
            Select t2.mi_data_id, t2.parentUnitID, t2.name, t1.levelDep + 1
            From hr_staffUnit t2
              join RecursiveQuery t1 On t2.mi_data_id = t1.parentUnitID
                and t2.mi_unityEntity != 'hr_organization'
            Where
              @onDate between t2.mi_dateFrom and t2.mi_dateTo
              and t2.mi_deleteDate >= '9999-12-31'
              and t2.state = 'ACTIVE'
          )
          select rq.mi_data_id, rq.name
          from RecursiveQuery rq
          order by rq.levelDep asc

      OPEN @CURSOR
      FETCH NEXT FROM @CURSOR INTO @mi_data_id, @name
      WHILE @@FETCH_STATUS = 0
      BEGIN
          if (@result is null)
          begin
              SET @result = @name;
          end
          else
          begin
             SET @result = LEFT(@name + @delimiter + @result, 2000);
          end;

          FETCH NEXT FROM @CURSOR INTO @mi_data_id, @name;
      END;
      CLOSE @CURSOR;
      RETURN @result;
  END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'depNamePath2',
    sql: ` CREATE FUNCTION depNamePath2 (@startDepID BIGINT, @onDate DATETIME, @orgID BIGINT, @delimiter VARCHAR(2), @onDate2 DATETIME)
    RETURNS VARCHAR(2000) AS
    BEGIN
      DECLARE @result VARCHAR(2000);
      SET @result = dbo.depNamePath(@startDepID, @onDate, @orgID, @delimiter);
      IF @result is null
      BEGIN
        SET @result = dbo.depNamePath(@startDepID, @onDate2, @orgID, @delimiter);
      END;
      RETURN @result;
  END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'depStructName',
    sql: `CREATE FUNCTION depStructName (@startDepID BIGINT, @onDate DATETIME, @orgID BIGINT)
  RETURNS VARCHAR(250) AS
  BEGIN
      DECLARE @result VARCHAR(250) = null;
      DECLARE @mi_data_id BIGINT;
      DECLARE @name VARCHAR(250);
      DECLARE @CURSOR CURSOR;
      SET @CURSOR = CURSOR SCROLL
      FOR
          with RecursiveQuery (mi_data_id, parentUnitID, name, levelDep) as (
            Select st.mi_data_id, st.parentUnitID, st.name, 0 as levelDep
            From hr_staffUnit st
            Where
              st.orgID = @orgID
              and st.mi_data_id = (select a.mi_data_id from hr_staffUnit a where a.id = @startDepID)
              and st.mi_unityEntity != 'hr_organization'
              and st.mi_deleteDate >= '9999-12-31'
              and @onDate between st.mi_dateFrom and st.mi_dateTo
              and st.state = 'ACTIVE'
            UNION ALL
              Select t2.mi_data_id, t2.parentUnitID, t2.name, t1.levelDep + 1
              From hr_staffUnit t2
              join RecursiveQuery t1 On t2.mi_data_id = t1.parentUnitID
                and t2.mi_unityEntity != 'hr_organization'
            Where
              @onDate between t2.mi_dateFrom and t2.mi_dateTo
              and t2.mi_deleteDate >= '9999-12-31'
              and t2.state = 'ACTIVE'
          )
          select TOP 1 rq.mi_data_id, rq.name
          from RecursiveQuery rq
          order by rq.levelDep desc

      OPEN @CURSOR
      FETCH NEXT FROM @CURSOR INTO @mi_data_id, @name
      WHILE @@FETCH_STATUS = 0
      BEGIN
         SET @result = @name;
         FETCH NEXT FROM @CURSOR INTO @mi_data_id, @name;
      END;
      CLOSE @CURSOR;
      RETURN @result;
  END`
  },
  {
    dialect: 'MSSQL2012',
    name: 'depStructName2',
    sql: `CREATE FUNCTION depStructName2 (@startDepID BIGINT, @onDate DATETIME, @orgID BIGINT, @onDate2 DATETIME)
  RETURNS VARCHAR(250) AS
  BEGIN
      DECLARE @result VARCHAR(250) = null;
      SET @result = dbo.depStructName(@startDepID, @onDate, @orgID);
      IF @result is null
      BEGIN
        SET @result = dbo.depStructName(@startDepID, @onDate2, @orgID);
      END;
      RETURN @result;
  END`
  },
  {
    dialect: 'PostgreSQL',
    name: 'depNamePath',
    sql: `create or replace function depnamepath (p_startdepid bigint, p_ondate timestamp, p_orgid bigint, p_delimiter varchar(2))
    returns varchar(2000) as $$
    declare
      dep record;    
      resulttext varchar(2000) := null;
    begin
      for dep in 
        with recursive recursivequery (mi_data_id, parentunitid, name, leveldep) as (
            select st.mi_data_id, st.parentunitid, st.name, 0 as leveldep
            from hr_staffunit st
            where st.orgid = p_orgid 
              and st.mi_data_id = (select a.mi_data_id from hr_staffunit a where a.id = p_startdepid)
              and st.mi_unityentity != 'hr_organization'
              and st.mi_deleteDate >= '9999-12-31'
              and p_ondate between st.mi_datefrom and st.mi_dateto
              and st.state = 'ACTIVE'
            union all
            select t2.mi_data_id, t2.parentunitid, t2.name, t1.leveldep + 1
            from hr_staffunit t2
            join recursivequery t1 on t2.mi_data_id = t1.parentunitid
              and t2.mi_unityentity != 'hr_organization'
            where
              p_ondate between t2.mi_datefrom and t2.mi_dateto
              and t2.mi_deleteDate >= '9999-12-31'
              and t2.state = 'ACTIVE'
          )
        select rq.mi_data_id, rq.name
        from recursivequery rq
        order by rq.leveldep asc
      loop  
           resulttext := left(concat(dep.name, p_delimiter, resulttext), 2000);
      end loop; 
      return resulttext;
    end
    $$ language plpgsql called on null input;`
  },
  {
    dialect: 'PostgreSQL',
    name: 'depNamePath2',
    sql: `create or replace function depnamepath2 (p_startdepid bigint, p_ondate timestamp, p_orgid bigint, p_delimiter varchar(2), p_ondate2 timestamp)
    returns varchar(2000) as $$
      declare dep record;    
      resulttext varchar(2000) := null;
    begin
      resulttext := depnamepath(p_startdepid, p_ondate, p_orgid, p_delimiter);
      if resulttext is null then
        resulttext := depnamepath(p_startdepid, p_ondate2, p_orgid, p_delimiter);
      end if;
      return resulttext;
    end
    $$ language plpgsql called on null input;`
  },
  {
    dialect: 'PostgreSQL',
    name: 'depStructName',
    sql: `create or replace function depstructname (p_startdepid bigint, p_ondate timestamp, p_orgid bigint)
    returns varchar(250) as $$
    declare
      dep record;    
      resulttext varchar(250) := null;
    begin
      for dep in 
        with recursive recursivequery (mi_data_id, parentunitid, name, leveldep) as (
          select st.mi_data_id, st.parentunitid, st.name, 0 as leveldep
          from hr_staffunit st
          where
            st.orgid = p_orgid
            and st.mi_data_id = (select a.mi_data_id from hr_staffunit a where a.id = p_startdepid)
            and st.mi_unityentity != 'hr_organization'
            and st.mi_deleteDate >= '9999-12-31'
            and p_ondate between st.mi_datefrom and st.mi_dateto
            and st.state = 'ACTIVE'
          union all
          select t2.mi_data_id, t2.parentunitid, t2.name, t1.leveldep + 1
          from hr_staffunit t2
            join recursivequery t1 on t2.mi_data_id = t1.parentunitid
              and t2.mi_unityentity != 'hr_organization'
          where
            p_ondate between t2.mi_datefrom and t2.mi_dateto
            and t2.mi_deleteDate >= '9999-12-31'
            and t2.state = 'ACTIVE'
        )
        select rq.mi_data_id, rq.name
        from recursivequery rq
        order by rq.leveldep desc
        limit 1
      loop  
        resulttext := dep.name;
      end loop; 
      return resulttext;
    end
    $$ language plpgsql called on null input;`
  },
  {
    dialect: 'PostgreSQL',
    name: 'depStructName2',
    sql: `create or replace function depstructname2 (p_startdepid bigint, p_ondate timestamp, p_orgid bigint, p_ondate2 timestamp)
    returns varchar(250) as $$
    declare
      dep record;    
      resulttext varchar(250) := null;
    begin
      resulttext := depstructname(p_startdepid, p_ondate, p_orgid);
      if resulttext is null then
        resulttext := depstructname(p_startdepid, p_ondate2, p_orgid);
      end if;
      return resulttext;
    end
    $$ language plpgsql called on null input;`
  },
  {
    dialect: 'PostgreSQL',
    name: 'remove_chars_from_string',
    sql: `create or replace function remove_chars_from_string(p_str character varying)
    returns int as $$
    declare
      STR character varying;
      REZ int; 
    begin
      if p_str is null or LENGTH(p_str) = 0 then begin REZ = 0; end;
	    	else begin
			    STR = regexp_replace(p_str, '[^0-9]+', '', 'g');
			    REZ = cast(STR as int);
		    end;
	    end if;
	    return REZ;
    end
    $$ language plpgsql called on null input;`
  },
  {
    dialect: 'MSSQL2012',
    name: 'remove_chars_from_string',
    sql: ` CREATE FUNCTION remove_chars_from_string(@p_str varchar(100))
    RETURNS integer AS
    BEGIN
      declare  @REZ integer;
      
      if (@p_str is null or LEN(@p_str) = 0) begin SET @REZ = 0 end;
      else begin 	
        WHILE PATINDEX('%[^0-9]%', @p_str) > 0
          BEGIN
              SET @p_str = STUFF(@p_str, PATINDEX('%[^0-9]%', @p_str), 1, '');
          END;
         SET @REZ = cast(@p_str as integer); 
      end;

      RETURN @REZ;
  END`
  }
]
