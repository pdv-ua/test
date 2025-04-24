module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px;  border-collapse: collapse; width: 1050px;" border="1" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr align="left">
      <td width="(100% - 200px)">&nbsp;</td> 
      <td width="150px">ЗАТВЕРДЖЕНО</td>
    </tr>   
    <tr align="left">
      <td width="(100% - 200px)">&nbsp;</td> 
      <td width="150px">Наказ Міністерства соціальної <br>політики України<br>22.06.2018  № 928</td>
    </tr>
  </tbody>    
</table>
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px;  border-collapse: collapse; width: 1050px;" border="1"  cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr align="center">
      <td style="font-weight: bold; font-size: 16px;" width="100%">З В І Т</td>
    </tr>
    <tr align="center">
      <td style="font-weight: bold;" width="100%" >про виплату компенсацій, допомоги та надання пільг громадянам, які постраждали внаслідок Чорнобильської катастрофи, „7 ВК" (форма №1)</td>
    </tr>
  </tbody>
</table>
    
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px;  border-collapse: collapse; width: 1050px;" border="1"  cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr style="text-align: center">
      <td width="50px">&nbsp;</td> 
      <td width="100px" class="borderBottom">{{#textInput}}DECLAR.DECLARHEAD.TIN{{{}}}{{/textInput}}</td> 
      <td width="50px">&nbsp;</td> 
      <td width="(100% - 400px)" class="borderBottom" >{{#textInput}}DECLAR.DECLARHEAD.ORG{{{}}}{{/textInput}}</td>
      <td width="200px">&nbsp;</td> 
    </tr>
    
    <tr style="text-align: center; font-size: 8px; font-weight: bold; ">
      <td width="50px">&nbsp;</td> 
      <td width="100px">(код за ЄДРПОУ)</td> 
      <td width="50px">&nbsp;</td> 
      <td width="(100% - 400px)">(назва регіону)</td>
      <td width="200px">&nbsp;</td> 
    </tr>
  </tbody>
</table>

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 8px;  border-collapse: collapse; width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr style="font-weight: bold;">
      <td width="370px" style="text-align: right;">за</td>   
      <td width="(100% - 740px)" colspan="3" style="text-align: center; font-size: 12px; ">{{#textInput}}DECLAR.DECLARHEAD.PERIOD{{{}}}{{/textInput}} </td>
      <td width="370px" style="text-align: left;">року</td> 
    </tr>
    <tr style="text-align: center; ">
      <td width="370px" style="text-align: right; font-weight: bold;">періодичність:</td>   
      <td width="100px" >квартальна</td>
      <td width="(100% - 940px)" >піврічна</td>
      <td width="100px" >річна</td>
      <td width="370px">&nbsp;</td> 
    </tr>
    
  </tbody>
</table>

<table id="tableT1" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; font-size: 14pt; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1050px">
  <thead>   
    <tr style="font-size: 9pt; ">
		  <td class="borderAll" align="center" width="(100% - 975px)" rowspan="3">Найменування напряму бюджетної програми, видів компенсацій, допомоги, пільг</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">Код рядка</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">КЕКВ</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">Кількість осіб, яким нараховано компенсацію, допомогу або пільгу  (осіб)</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">Кількість осіб, яким виплачено компенсацію, допомогу або пільгу  (осіб)</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">Кількість здійснених виплат з початку року</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">Середній розмір виплати</td>
		  <td class="borderAll" align="center" width="130px" colspan="2">Кредиторська заборгованість на початок {{DECLAR.DECLARHEAD.PERIOD_YEAR}} року</td>
		  <td class="borderAll" align="center" width="65px" rowspan="3">Нараховано з початку року</td>
		  <td class="borderAll" align="center" width="130px" colspan="2">Профінансовано з початку року</td>
		  <td class="borderAll" align="center" width="130px" colspan="2">Фактично виплачено з початку року</td>
		  <td class="borderAll" align="center" width="130px" colspan="2">Сума зареєстрованої кредиторської  заборгованості на кінець звітного періоду</td>
    </tr>
    <tr style="font-size: 9pt; ">
		  <td class="borderAll" align="center" width="65px" rowspan="2">Усього</td>
		  <td class="borderAll" align="center" width="65px">з них </td>
		  <td class="borderAll" align="center" width="65px" rowspan="2">Усього</td>
		  <td class="borderAll" align="center" width="65px">з них </td>
		  <td class="borderAll" align="center" width="65px" rowspan="2">Усього</td>
		  <td class="borderAll" align="center" width="65px">з них </td>
		  <td class="borderAll" align="center" width="65px" rowspan="2">Усього</td>
		  <td class="borderAll" align="center" width="65px">з них </td>
    </tr>
    <tr style="font-size: 9pt; ">
		  <td class="borderAll" align="center" width="65px">прострочена заборгованість </td>
		  <td class="borderAll" align="center" width="65px">на погашення простроченої заборгованості {{DECLAR.DECLARHEAD.PERIOD_YEAR}} року</td>
		  <td class="borderAll" align="center" width="65px">на погашення простроченої заборгованості {{DECLAR.DECLARHEAD.PERIOD_YEAR}} року</td>
		  <td class="borderAll" align="center" width="65px">прострочена</td>
    </tr>
    <tr style="font-size: 8pt; ">
		  <td class="borderAll" align="center" width="(100% - 975px)">1</td>
		  <td class="borderAll" align="center" width="65px">2</td>
		  <td class="borderAll" align="center" width="65px">3</td>
		  <td class="borderAll" align="center" width="65px">4</td>
		  <td class="borderAll" align="center" width="65px">5</td>
		  <td class="borderAll" align="center" width="65px">6</td>
		  <td class="borderAll" align="center" width="65px">7</td>
		  <td class="borderAll" align="center" width="65px">8</td>
		  <td class="borderAll" align="center" width="65px">9</td>
		  <td class="borderAll" align="center" width="65px">10</td>
		  <td class="borderAll" align="center" width="65px">11</td>
		  <td class="borderAll" align="center" width="65px">12</td>
		  <td class="borderAll" align="center" width="65px">13</td>
		  <td class="borderAll" align="center" width="65px">14</td>
		  <td class="borderAll" align="center" width="65px">15</td>
		  <td class="borderAll" align="center" width="65px">16</td>              
    </tr>
  </thead>
  <tbody>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">Виплати підвищених стипендій, надання щорічної та додаткової відпусток, збереження заробітної плати у разі переведення на нижчеоплачувану роботу та у зв’язку з відселенням громадянам, які постраждали внаслідок Чорнобильської катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 10pt; font-weight: bold;">1</td>
		<td class="borderAll" align="center" style="font-size: 11pt; font-size: 11pt; font-weight: bold;">2730</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F14####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F15####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F16####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F17####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F18####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F19####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F110####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F111####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F112####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F113####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F114####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F115####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F116####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">отримання додаткової відпустки (14 робочих / 16 календарних днів на рік) - усього</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F141####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F151####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F161####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F171####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F181####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F191####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>категорія  I (пункт 22 статті 20 Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.1.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1411####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1511####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1611####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1711####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1811####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1911####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11011####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11211####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11311####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11411####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11511####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11611####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>категорія  II  (пункт 1статті 21 (22-20) Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.1.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1412####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1512####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1612####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1712####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1812####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1912####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11012####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11212####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11312####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11412####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11512####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11612####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>одному із батьків дитини-інваліда або особи, яка їх замінює (пункт 3 частини третьої статті 30 Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.1.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1413####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1513####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1613####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1713####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1813####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1913####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11013####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11213####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11313####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11413####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11513####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11613####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">щорічні відпустки працівникам, які працюють (перебувають у відрядженні) на територіях радіоактивного забруднення, надаються пропорційно відпрацьованому на цих територіях часу (стаття 47 Закону) - усього</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F142####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F152####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F162####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F172####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F182####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F192####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>у зонах відчуження та безумовного (обов'язкового) відселення - 44 календарні дні.</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.2.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1421####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1521####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1621####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1721####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1821####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1921####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11021####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11221####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11321####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11421####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11521####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11621####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>у зоні гарантованого добровільного відселення - 37 календарних днів.</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.2.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1422####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1522####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1622####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1722####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1822####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1922####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11022####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11222####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11322####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11422####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11522####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11622####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>у зоні посиленого радіоекологічного контролю (які до 01.01.2015 працювали, набули права на додаткову відпустку, але не використали ії) - 30 календарних днів</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.2.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1423####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1523####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1623####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1723####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1823####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1923####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11023####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11223####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11323####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11423####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11523####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11623####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">Виплата при переведенні у зв’язку із станом здоров’я на нижчеоплачувану роботу різниці між попереднім заробітком і заробітком на новій роботі до встановлення інвалідності або одужання, але не більше одного року - усього</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F143####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F153####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F163####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F173####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F183####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F193####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1163####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>категорія I (пункт 7статті 20 Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.3.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1431####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1531####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1631####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1731####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1831####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1931####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11031####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11231####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11331####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11431####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11531####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11631####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>категорія II ( пункт 1 (7-20) статті 21Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.3.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1432####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1532####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1632####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1732####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1832####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1932####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11032####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11232####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11332####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11432####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11532####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11632####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; "><i>категорія III для учасників ліквідації наслідків аварії на ЧАЕС (пункт 1 (7-20) статті 22  Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.3.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1433####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1533####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1633####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1733####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1833####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1933####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11033####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11233####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11333####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11433####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11533####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F11633####{{{}}}{{/currencyInput}}</td>              
  </tr>


	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">Збереження середньої заробітної плати за дні зборів у дорогу і влаштування на новому місці проживання, але не більше 14 робочих днів, а також за час перебування у дорозі виходячи з середньомісячного заробітку за попереднім місцем роботи (пункт 3 статті 36 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.4</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F144####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F154####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F164####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F174####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F184####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F194####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1104####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1134####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1144####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1154####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1164####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">Збереження середньої зарплати за період навчання новим професіям (спеціальностям), але не більше одного року, у разі неможливості працевлаштування громадянам, які відселені або самостійно переселилися на  нове місце проживання (пункт 6 статті 36 Закону) </td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.5</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F145####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F155####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F165####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F175####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F185####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F195####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1105####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1135####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1145####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1155####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1165####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;">Доплата громадянам, які працюють у зоні відчуження</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">1.6</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F146####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F156####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F166####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F176####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F186####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F196####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1106####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1136####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1146####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1156####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1166####{{{}}}{{/currencyInput}}</td>              
  </tr>
  

	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" rowspan="4">Виплата грошової компенсації на потерпілих дітей, які не харчуються в їдальнях навчальних закладів, а також за всі дні невідвідування ними навчальних закладів та забезпечення видатків на безоплатне харчування дітей, які постраждали внаслідок Чорнобильської катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" rowspan="4">2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">Всього:</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F24####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F25####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F26####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F27####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F28####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F29####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F210####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F211####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F212####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F213####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F214####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F215####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F216####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F242710####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F252710####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F262710####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F272710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F282710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F292710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2102710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2112710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2122710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2132710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2142710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2152710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2162710####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2730</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F242730####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F252730####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F262730####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F272730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F282730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F292730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2102730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2112730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2122730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2132730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2142730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2152730####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2162730####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F242240####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F252240####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F262240####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F272240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F282240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F292240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2102240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2112240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2122240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2132240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2142240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2152240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2162240####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >виплата грошових компенсацій сім’ям з дітьми, які не харчуються в зазначених  навчальних закладах, а також за всі дні, коли вони не відвідували ці заклади, до досягнення повноліття згідно з постановою Кабінету Міністрів України від 08.02.97 №155 - усього:</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F241####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F251####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F261####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F271####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F281####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F291####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>від 6 до 10 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.1.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2411####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2511####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2611####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2711####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2811####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2911####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21011####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21211####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21311####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21411####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21511####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21611####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>від 11 до 14 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.1.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2412####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2512####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2612####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2712####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2812####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2912####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21012####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21212####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21312####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21412####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21512####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21612####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>старше 14 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.1.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2413####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2513####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2613####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2713####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2813####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2913####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21013####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21213####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21313####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21413####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21513####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21613####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >безоплатне харчування дітей з інвалідністю, які потерпіли внаслідок Чорнобильської катастрофи - усього:</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2730  (діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F242####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F252####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F262####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F272####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F282####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F292####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>від 6 до 10 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.2.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; ">(діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2421####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2521####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2621####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2721####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2821####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2921####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21021####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21221####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21321####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21421####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21521####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21621####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>від 11 до 14 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.2.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; ">(діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2422####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2522####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2622####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2722####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2822####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2922####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21022####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21222####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21322####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21422####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21522####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21622####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>старше 14 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.2.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; ">(діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2423####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2523####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2623####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2723####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2823####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2923####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21023####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21223####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21323####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21423####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21523####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21623####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >безоплатне харчування дітей, які потерпіли внаслідок Чорнобильської катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2730 (діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F243####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F253####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F263####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F273####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F283####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F293####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2163####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>від 6 до 10 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.3.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; ">(діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2431####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2531####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2631####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2731####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2831####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2931####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21031####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21231####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21331####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21431####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21531####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21631####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>від 11 до 14 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.3.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; ">(діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2432####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2532####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2632####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2732####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2832####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2932####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21032####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21232####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21332####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21432####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21532####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21632####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" ><i>старше 14 років</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.3.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; ">(діто-дні)</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2433####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2533####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F2633####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2733####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2833####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2933####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21033####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21233####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21333####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21433####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21533####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F21633####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Витрати на поштові операції за напрямом</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >2.4</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F244####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F254####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F264####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F274####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F284####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F294####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2104####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2134####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2144####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2154####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F2164####{{{}}}{{/currencyInput}}</td>              
  </tr> 
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" rowspan="3">Виплата грошової компенсації за пільгове забезпечення продуктами харчування громадян, які постраждали внаслідок Чорнобильської катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" rowspan="3">3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">Всього:</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F34####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F35####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F36####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F37####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F38####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F39####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F310####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F311####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F312####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F313####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F314####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F315####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F316####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F342710####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F352710####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F362710####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F372710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F382710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F392710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3102710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3112710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3122710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3132710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3142710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3152710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3162710####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F342240####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F352240####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F362240####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F372240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F382240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F392240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3102240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3112240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3122240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3132240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3142240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3152240####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3162240####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >виплата компенсації в розмірі 50% вартості продуктів харчування за медичними нормами, встановленими МОЗ України категорії 1 (пункт 14 статті 20 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >3.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F341####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F351####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F361####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F371####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F381####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F391####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >виплата компенсації у розмірі 25% вартості продуктів харчування за фізіологічними нормами, встановленими МОЗ України категорії II (пункт 6 статті  21 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >3.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F342####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F352####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F362####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F372####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F382####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F392####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Витрати на поштові операції за напрямом</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >3.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F343####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F353####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F363####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F373####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F383####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F393####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F3163####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Компенсації за втрачене майно та оплата витрат у зв'язку з переїздом на нове місце проживання громадянам, які постраждали внаслідок Чорнобильської катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">4</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F44####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F45####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F46####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F47####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F48####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F49####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F410####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F411####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F412####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F413####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F414####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F415####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F416####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >компенсації громадянам за втрачене майно у зв'язку з евакуацією, відселенням або самостійним переселенням (стаття 35 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >4.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F441####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F451####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F461####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F471####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F481####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F491####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >витрати у зв'язку з переїздом на нове місце проживання (пункти 2, 4 статті 36 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >4.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F442####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F452####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F462####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F472####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F482####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F492####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >виплата одноразової допомоги у порядку та розмірі, встановлених КМУ, на кожного члена сім'ї (пункти 1, 2 статті 36 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >4.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F443####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F453####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F463####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F473####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F483####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F493####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F4163####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Витрати на проведення оцінки майна</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">5</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F54####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F55####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F56####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F57####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F58####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F59####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F510####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F511####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F512####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F513####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F514####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F515####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F516####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Компенсація за шкоду, заподіяну здоров’ю, та допомоги на оздоровлення, у разі звільнення з роботи громадян, які постраждали внаслідок Чорнобильської катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;">6</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66####{"style": "font-weight: bold;"}{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616####{"style": "font-weight: bold;"}{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Компенсації за шкоду, заподіяну здоров’ю особам, які стали інвалідами внаслідок Чорнобильської катастрофи, учасникам ліквідації наслідків аварії на Чорнобильській АЕС та сім'ям за втрату годувальника одноразова компенсація та щорічна допомога на оздоровлення (стаття 48 Закону, постанови Кабінету Міністрів України від  14.05.2015 № 285 та від 12.07.2005 № 562)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F641####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F651####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F661####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F671####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F681####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F691####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Одноразова компенсація (стаття 48 Закону, постанова Кабінету Міністрів України від 14.05.2015 № 285) - усього</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6411####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6511####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6611####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6711####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6811####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6911####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61011####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61211####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61311####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61411####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61511####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61611####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>інвалідам  I групи</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64111####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65111####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66111####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616111####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>інвалідам  II групи</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64112####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65112####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66112####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616112####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>інвалідам  III групи </i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64113####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65113####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66113####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616113####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>сім'ям, які втратили годувальника </i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1.4</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64114####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65114####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66114####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616114####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>батькам померлого</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1.5</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64115####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65115####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66115####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615115####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616115####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>дітям-інвалідам </i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.1.6</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64116####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65116####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66116####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615116####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616116####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Щорічна допомога на оздоровлення (стаття 48 Закону, постанова Кабінету Міністрів України від 12.07.2005 №562) - усього</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6412####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6512####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6612####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6712####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6812####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6912####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61012####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61212####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61312####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61412####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61512####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61612####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>інвалідам I  і II  групи</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64121####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65121####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66121####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616121####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>інвалідам III  групи </i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64122####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65122####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66122####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616122####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>дітям-інвалідам</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64123####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65123####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66123####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616123####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>II  категорія</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.4</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64124####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65124####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66124####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616124####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>III  категорії</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.5</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64125####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65125####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66125####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615125####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616125####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>кожній дитині, яка втратила внаслідок Чорнобильської катастрофи одного з батьків</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.6</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64126####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65126####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66126####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615126####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616126####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>евакуйованим із зони відчуження у 1996 р., включаючи дітей </i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.1.2.7</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F64127####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F65127####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F66127####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F67127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F68127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F69127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F610127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F611127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F612127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F613127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F614127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F615127####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F616127####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Виплата у разі вивільнення працівників у зв’язку з ліквідацією, реорганізацією, перепрофілюванням підприємства, установи, організації, скорочення чисельності або штату працівників допомоги в розмірі трикратної середньомісячної заробітної плати або штату працівників, а також збереження за їх бажанням посадового окладу, тарифної ставки (окладу) на новому місці роботи відповідно до пункту 7 частини першої статті 20, пункту 1 частини першої статті 21, пункту 1 частини першої статті 22 Закону - усього</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F642####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F652####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F662####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F672####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F682####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F692####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>категорія I ( пункт 7статті 20 Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.2.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6421####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6521####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6621####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6721####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6821####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6921####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61021####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61221####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61321####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61421####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61521####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61621####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>категорія II ( пункт 1 (7-20) статті 21 Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.2.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6422####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6522####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6622####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6722####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6822####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6922####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61022####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61222####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61322####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61422####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61522####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61622####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " ><i>категорія III - для учасників ліквідації наслідків аварії на ЧАЕС  (пункт 1 (7-20) статті 22 Закону)</i></td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.2.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; "></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6423####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6523####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F6623####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6723####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6823####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6923####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61023####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61223####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61323####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61423####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61523####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F61623####{{{}}}{{/currencyInput}}</td>              
  </tr>

	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Відшкодування у встановленому законодавством порядку втраченого заробітку, який вони мали до ушкодження здоров’я, якщо захворювання або каліцтво, що виникли у зв'язку з виконанням робіт, пов'язаних з ліквідацією наслідків аварії на ЧАЕС, призвели до стійкої втрати професійної працездатності (без встановлення інвалідності), що встановлено уповноваженою медичною комісією категорії II (пункт 8 статті 21 Закону)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F643####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F653####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F663####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F673####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F683####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F693####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6163####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Витрати на поштові операції за напрямом</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >6.4</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F644####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F654####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F664####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F674####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F684####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F694####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6104####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6114####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6124####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6134####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6144####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6154####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F6164####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Обслуговування банківських позик, наданих на пільгових умовах до 1999 року громадянам, які постраждали внаслідок Чорнобильської  катастрофи</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >7</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F74####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F75####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F76####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F77####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F78####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F79####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F710####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F711####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F712####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F713####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F714####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F715####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F716####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Оплата санаторно-курортного лікування громадянам, віднесених до категорії 1, та дітей-інвалідів, інвалідність яких пов'язана  з Чорнобильською катастрофою, та виплата грошової компенсації замість путівки</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F84####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F85####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F86####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F87####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F88####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F89####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F810####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F811####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F812####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F813####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F814####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F815####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F816####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Оплата санаторно-курортного лікування громадян віднесеннях до категорії 1 та дітей-інвалідів, інвалідність яких пов'язана з Чорнобильською катастрофою</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2730</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F841####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F851####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F861####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F871####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F881####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F891####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " >Путівки для дорослих, віднесених до категорії 1</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.1.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8411####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8511####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8611####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8711####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8811####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8911####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81011####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81211####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81311####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81411####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81511####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81611####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " >Путівки для дітей-інвалідів, інвалідність яких пов'язана з Чорнобильською катастрофою</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.1.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8412####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8512####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8612####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8712####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8812####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8912####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81012####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81212####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81312####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81412####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81512####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81612####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Грошова компенсація замість путівки</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F842####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F852####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F862####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F872####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F882####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F892####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " >громадянам, віднесеним до категорії 1</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.2.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8421####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8521####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8621####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8721####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8821####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8921####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81021####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81221####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81321####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81421####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81521####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81621####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " >дітям з інвалідністю, інвалідність яких пов'язана з Чорнобильською катасрофою.</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.2.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8422####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8522####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F8622####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8722####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8822####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8922####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81022####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81222####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81322####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81422####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81522####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F81622####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Витрати на поштові операції за напрямом</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >8.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F843####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F853####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F863####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F873####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F883####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F893####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F8163####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >Витрати на поштові операції (разом по програмі)</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >9</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F94####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F95####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F96####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F97####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F98####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F99####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F910####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F911####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F912####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F913####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F914####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F915####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F916####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >КПКВК 2501200 "Соціальний захист громадян, які постраждали внаслідок Чорнобильської катастрофи"</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >10</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">Всього:</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F104####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F105####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F106####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F107####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F108####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F109####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1010####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1011####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1012####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1013####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1014####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1015####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1016####{{{}}}{{/currencyInput}}</td>              
  </tr>

	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; " >з них по КЕКВ-ам:</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" ></td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;"></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>
		<td class="borderAll" align="right" ></td>              
  </tr>

	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >КЕКВ</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >10.1</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2240</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1041####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1051####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1061####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1071####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1081####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1091####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10101####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10111####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10121####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10131####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10141####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10151####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10161####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >КЕКВ</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >10.2</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2710</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1042####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1052####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1062####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1072####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1082####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1092####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10102####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10112####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10122####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10132####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10142####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10152####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10162####{{{}}}{{/currencyInput}}</td>              
  </tr>
	<tr>
		<td class="borderAll" align="left" style="font-size: 9pt; font-weight: bold;" >КЕКВ</td>
		<td class="borderAll" align="right" style="font-size: 8pt; font-weight: bold;" >10.3</td>
		<td class="borderAll" align="center" style="font-size: 10pt; font-weight: bold;">2730</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1043####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1053####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#intInput}}DECLAR.DECLARBODY.F1063####{{{}}}{{/intInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1073####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1083####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F1093####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10103####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10113####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10123####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10133####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10143####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10153####{{{}}}{{/currencyInput}}</td>
		<td class="borderAll" align="right" >{{#currencyInput}}DECLAR.DECLARBODY.F10163####{{{}}}{{/currencyInput}}</td>              
  </tr>


  </tbody>
</table>
<br clear="none">
<br clear="none">
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px; border-collapse: collapse;  width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr style="text-align: left;">
      <td style="text-align: right; font-weight: bold; ">Примітка</td>
      <td class="borderBottom" colspan="5">&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td style="font-weight: bold; ">Керівник установи</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>
        {{#textInput}}DECLAR.DECLARBODY.CHIEF{{{}}}{{/textInput}}
      </td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: center; font-size: 8px;">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td class="borderTop">(підпис)</td>
      <td>&nbsp;</td>
      <td class="borderTop">(прізвище, ім'я, по батькові)</td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td style="font-weight: bold; ">Головний бухгалтер</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>
        {{#textInput}}DECLAR.DECLARBODY.BOOKKEEPER{{{}}}{{/textInput}}
      </td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: center; font-size: 8px;">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td class="borderTop">(підпис)</td>
      <td>&nbsp;</td>
      <td class="borderTop">(прізвище, ім'я, по батькові)</td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td style="font-weight: bold; ">М.П.</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td style="text-align: right; ">Виконавець:</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.EXNAME{{{}}}{{/textInput}}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr style="text-align: left;">
      <td style="text-align: right;  ">тел.:</td>
      <td>{{#textInput}}DECLAR.DECLARBODY.TEL{{{}}}{{/textInput}}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>


<style>
    .borderAll {
        border: 1px solid #000;
    }
    .borderBottom {
        border-bottom: 1px  solid #000;
    }
    .borderTop {
        border-top: 1px  solid #000;
    }
</style>
`
