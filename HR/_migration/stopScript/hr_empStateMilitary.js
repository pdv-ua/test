
module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `update hr_empStateMilitary
set dictStateMilitaryID = 
(
CASE
WHEN EXISTS
(
select top 1 a.id from hr_dictStateMilitary a
where
a.id<>emp.dictStateMilitaryID
and a.mi_deleteDate>='9999-12-31'
and lower(a.name) =
(
select b.name from hr_dictStateMilitary b
where b.id= emp.dictStateMilitaryID
)
)
THEN
(
select top 1 a.id from hr_dictStateMilitary a
where
a.id<>emp.dictStateMilitaryID
and a.mi_deleteDate>='9999-12-31'
and lower(a.name) =
(
select b.name from hr_dictStateMilitary b
where b.id= emp.dictStateMilitaryID
)
)
ELSE
dictStateMilitaryID
END
)
from hr_empStateMilitary emp
where
emp.dictStateMilitaryID in
(
select
id from hr_dictStateMilitary
where mi_deleteUser is not null
)`
  })
}
