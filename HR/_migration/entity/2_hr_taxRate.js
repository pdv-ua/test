module.exports = [
  {
    entity: 'hr_taxRate',
    notDelete: true,
    notUpdate: true,
    identifier: ['yearFrom', 'sumFrom', 'rate'],
    attrs: ['yearFrom', 'sumFrom', 'rate'],
    items: [
      [ 2004, 0, 13 ],
      [ 2007, 0, 15 ],
      [ 2011, 0, 15 ],
      [ 2011, 9410, 17 ],
      [ 2012, 0, 15 ],
      [ 2012, 10730, 17 ],
      [ 2013, 0, 15 ],
      [ 2013, 11470, 17 ],
      [ 2014, 0, 15 ],
      [ 2014, 12180, 17 ],
      [ 2015, 0, 15 ],
      [ 2015, 12180, 20 ],
      [ 2016, 0, 18 ]
    ]
  }
]
