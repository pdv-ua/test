module.exports.run = (conn) => {
  const organization = conn.Repository('hr_organization')
    .attrs(['ID'])
    .selectAsObject()

  organization.forEach(org => {
    let signer = conn.Repository('hr_dictSheetSigner')
      .attrs(['ID'])
      .where('signerName', '=', 'Відповідальна особа')
      .where('code', '=', 1)
      .selectSingle()
    if (!signer) {
      conn.insert({
        entity: 'hr_dictSheetSigner',
        execParams: {
          orderN: 1,
          signerName: 'Відповідальна особа',
          orgID: org.ID
        }
      })
    }
    signer = conn.Repository('hr_dictSheetSigner')
      .attrs(['ID'])
      .where('signerName', '=', 'Керівник структурного підрозділу')
      .where('code', '=', 2)
      .selectSingle()
    if (!signer) {
      conn.insert({
        entity: 'hr_dictSheetSigner',
        execParams: {
          orderN: 2,
          signerName: 'Керівник структурного підрозділу',
          orgID: org.ID
        }
      })
    }
    signer = conn.Repository('hr_dictSheetSigner')
      .attrs(['ID'])
      .where('signerName', '=', 'Керівник установи')
      .where('code', '=', 3)
      .selectSingle()
    if (!signer) {
      conn.insert({
        entity: 'hr_dictSheetSigner',
        execParams: {
          orderN: 3,
          signerName: 'Керівник установи',
          orgID: org.ID
        }
      })
    }
  })
}