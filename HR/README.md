## Accounting for Ukraine State Institution

Entities and data specific for accounting for Ukrainian State Institution.

 - `_initialData/gl_account_budget.csv` - Chart of accounts as described in [ukrainial low #1203](http://zakon4.rada.gov.ua/laws/show/z0161-14)
 - `_initialData/gl_dimensions_budget.csv` - accounts dimensions as in [1C for State Institution configuration](http://1c.ua/ua/v8/RegionalSolutions_UA_BDG_COM.php)
 
### Named convention 

 - entity name should be in singular form
 - entity what represent **Dimension** starts with **sia_** prefix and lower-cased entity name: `sia_cashDesk`
 - entity what represent **Document** starts with **sia_d** prefix and upper case entity name: `sia_dInvestment`
 
