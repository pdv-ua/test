module.exports.run = (conn) => {
  const count = conn.Repository('trf_dictAccrualCond')
    .attrs('COUNT(*)')
    .misc({ __allowSelectSafeDeleted: true })
    .selectScalar()
  if (!count) {
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: 'insert into trf_dictAccrualCond(ID, dictAccrualDtID, conditionType, orgID) select ID, ID dictAccrualDtID, \'1\' conditionType, orgID from trf_dictAccrualDt where orgID is not null and mi_deleteDate >= \'9999-12-31\''
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: 'insert into trf_dictAccrualCond(ID, dictAccrualDtID, conditionType, dictPositionID) select ID, ID dictAccrualDtID, \'3\' conditionType, dictPositionID from trf_dictAccrualDt where dictPositionID is not null and mi_deleteDate >= \'9999-12-31\''
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: 'insert into trf_dictAccrualCond(ID, dictAccrualDtID, conditionType, dictQualificationID) select ID, ID dictAccrualDtID, \'8\' conditionType, dictQualificationID from trf_dictAccrualDt where dictQualificationID is not null and mi_deleteDate >= \'9999-12-31\''
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: 'insert into trf_dictAccrualCond(ID, dictAccrualDtID, conditionType, dictSubjectID) select ID, ID dictAccrualDtID, \'9\' conditionType, dictSubjectID from trf_dictAccrualDt where dictSubjectID is not null and mi_deleteDate >= \'9999-12-31\''
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: 'insert into trf_dictAccrualCond(ID, dictAccrualDtID, conditionType, dictPupilID) select ID, ID dictAccrualDtID, \'10\' conditionType, dictPupilID from trf_dictAccrualDt where dictPupilID is not null and mi_deleteDate >= \'9999-12-31\''
    })
    conn.xhr({
      endpoint: 'runSQL',
      URLParams: { CONNECTION: 'main' },
      data: 'update trf_dictAccrualDt set orgID = null, dictPositionID = null, dictQualificationID = null, dictSubjectID = null, dictPupilID = null'
    })
  }
}
