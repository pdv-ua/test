module.exports.run = (conn) => {
  conn.xhr({
    endpoint: 'runSQL',
    URLParams: { CONNECTION: 'main' },
    data: `WITH ord AS (SELECT DISTINCT det.orderID AS orderID, hr.orderState AS newOrderState
      FROM hr_orderRegistry hr INNER JOIN hr_orderRegistryDt det ON hr.ID=det.orderRegistryID
        INNER JOIN hr_order o ON o.id=det.orderID WHERE hr.orderState!=o.orderState
        AND hr.mi_deleteDate>='9999-12-31' AND det.mi_deleteDate>='9999-12-31' AND o.mi_deleteDate>='9999-12-31')
      UPDATE hr_order SET orderState = ord.newOrderState FROM ord WHERE ID=ord.orderID`
  })
}
