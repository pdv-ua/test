module.exports.run = (conn) => {
  const empOrderMission = conn.Repository('hr_empOrderMissionDet')
    .attrs(['ID'])
    .where('empOrderType', '=', 'MISSION_TRAINING')
    .misc({ __skipRls: true })
    .selectAsObject()
  empOrderMission.forEach(row => {
    const empDet = conn.Repository('hr_empOrderEmployeeDet')
      .attrs(['dictSpecialityID', 'lectureCycle', 'dictTrainingKindID', 'trainingDirection'])
      .where('paraID', '=', row.ID)
      .selectSingle()
    if (empDet) {
      conn.update({
        entity: 'hr_empOrderMissionDet',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          dictSpecialityID: empDet.dictSpecialityID,
          lectureCycle: empDet.lectureCycle,
          dictTrainingKindID: empDet.dictTrainingKindID,
          trainingDirection: empDet.trainingDirection
        }
      })
    }
  })
  const empOrderTraining = conn.Repository('hr_empOrderTrainingDet')
    .attrs(['ID'])
    .where('empOrderType', '=', 'TRAINING')
    .misc({ __skipRls: true })
    .selectAsObject()
  empOrderTraining.forEach(row => {
    const empDet = conn.Repository('hr_empOrderEmployeeDet')
      .attrs(['dictSpecialityID', 'lectureCycle', 'dictTrainingKindID', 'trainingDirection'])
      .where('paraID', '=', row.ID)
      .selectSingle()
    if (empDet) {
      conn.update({
        entity: 'hr_empOrderTrainingDet',
        __skipOptimisticLock: true,
        execParams: {
          ID: row.ID,
          dictSpecialityID: empDet.dictSpecialityID,
          lectureCycle: empDet.lectureCycle,
          dictTrainingKindID: empDet.dictTrainingKindID,
          trainingDirection: empDet.trainingDirection
        }
      })
    }
  })
}
