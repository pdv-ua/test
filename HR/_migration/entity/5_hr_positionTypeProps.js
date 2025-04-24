module.exports = [
  {
    entity: 'hr_positionTypeProps',
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_positionTypeProps').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['positionType'],
    attrsConfig: {
      dictStaffCatID: { associatedEntity: 'hr_dictStaffCat', codeAttr: 'code' },
      dictContractKindID: { associatedEntity: 'hr_dictContractKind', codeAttr: 'code' },
      workScheduleID: { associatedEntity: 'hr_workSchedule', codeAttr: 'code' },
      payElID: { associatedEntity: 'hr_payEl', codeAttr: 'code' }
    },
    attrs: ['positionType', 'dictStaffCatID', 'positionCategory', 'contractType', 'dictContractKindID', 'workPlace', 'workerType', 'workScheduleID', 'payElID', 'paymentType', 'canEditPayElAccrual'],
    items: [
      [ '12', null, null, '1', '01', '1', '1', 'Std', '1', 'ACCRUAL', 1 ]
    ]
  }
]
