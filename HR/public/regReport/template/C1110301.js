module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; font-family: TimesNewRoman; font-size: 14px;" cellspacing="0" cellpadding="0px" width="1230px">
  <tbody>
    <tr>
      <td align="right" valign="bottom" width="50%">&nbsp;</td>
      <td width="40%">&nbsp;</td>
      <td width="10%">Додаток 1.3</td>
    </tr>
    <tr>
      <td align="left" valign="bottom" width="100%" colspan="3">IIІ. Нарахування допомоги по тимчасовій непрацездатності внаслідок нещасного випадку або профзахворювання</td>      
    </tr>
  </tbody>
</table>
<br>
<table id="table" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse; border: 1px solid black; width: 1230px;" border="1" cellspacing="0" cellpadding="0px" width="1230px">
  <thead>  
  <tr align="left" valign="top">
      <td align="center" rowspan="2" style="width: 30px; text-align: center" class="no-print">&nbsp;</td>
      <td style="width: 50px; text-align: center" rowspan="2">№з/п</td>  
      <td rowspan="2" style="width: 100px;">Прізвище</td>
      <td rowspan="2" style="width: 100px;">Ім’я</td>
      <td rowspan="2" style="width: 100px;">По&nbsp;батькові</td>
      <td rowspan="2" style="width: 100px;">№&nbsp;страхового свідоцтва<br/>(ідентифікаційний номер)&nbsp;або<br/>серія та номер паспорта</td>
      <td rowspan="2" style="width: 100px;">Основне місце&nbsp;роботи -1;<br/>сумісництво -2; ФОП -3;<br/>за договором ЦПХ -4</td>
      
      <td colspan="2" style="width: 150px; text-align: left">Дані акту про нещасний випадок або профзахворювання</td>  
      <td colspan="2" style="width: 150px; text-align: left">Дані листка непрацездатності</td>    
      
      <td rowspan="2" style="width: 100px;">Причина непрацездатності&nbsp;*</td>
      <td colspan="2" style="width: 130px; text-align: center">Період непрацездатності</td>
      
      <td colspan="2" style="width: 150px; text-align: center">Витрати Фонду</td>
     
  </tr>
  
  <tr align="left" valign="bottom" style="height: 80px;">    
     <td style="width: 60px;"><span style="transform: rotate(-90deg) translateX(8px) translateY(25px); display: inline-block;">Дата</span></td>
     <td style="width: 90px;"><span style="transform: rotate(-90deg) translateX(11px) translateY(20px); display: inline-block;">Номер</span></td>
     
     <td style="width: 60px;"><span style="transform: rotate(-90deg) translateX(8px) translateY(20px); display: inline-block;">Серія</span></td>
     <td style="width: 90px;"><span style="transform: rotate(-90deg) translateX(11px) translateY(20px); display: inline-block;">Номер</span></td>
     
     
     <td style="width: 60px;"><span style="transform: rotate(-90deg) translateX(15px) translateY(10px); display: inline-block;">З&nbsp;(Дата)</span></td>
     <td style="width: 60px;"><span style="transform: rotate(-90deg) translateX(20px) translateY(5px); display: inline-block;">До&nbsp;(Дата)</span></td>
     
    
     <td style="width: 75px;"><span style="transform: rotate(-90deg) translateX(5px) translateY(25px); display: inline-block;">Дні</span></td>
     <td style="width: 75px;"><span style="transform: rotate(-90deg) translateX(8px) translateY(10px); display: inline-block;">Сума&nbsp;в<br/>гривнях&nbsp;з<br/>копійками</span></td>     
    
  </tr>
    <tr align="center" valign="center">
    <td align="center" style="width: 30px; text-align: center" class="no-print">&nbsp;</td>
     <td>1</td>
     <td>2</td>
     <td>3</td>
     <td>4</td>
     <td>5</td>
     <td>6</td>
     <td>7</td>
     <td>8</td>
     <td>9</td>
     <td>10</td>
     <td>11</td>
     <td>12</td>
     <td>13</td>
     <td>14</td>
     <td>15</td>    
   </tr>    
   </thead>
  <tbody id="Process">
    {{#generatorRows}}T3{{{}}}{{/generatorRows}}
    <!---->
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; border-collapse: collapse; font-family: TimesNewRoman; font-size: 12px;" cellspacing="0" cellpadding="0px" width="1230px">
  <tbody>
    <tr>
      <td align="left" valign="bottom" width="100%">* причина непрацездатності відображається за даними листка непрацездатності: 1- загальне захворювання; 3 – захворювання внаслідок аварії на ЧАЕС; 5- невиробничі травми; 6- контакт з хворими на інфекційні захворювання та бактеріоносійство; 7- санаторно - курортне лікування; 8 – вагітність та пологи; 9 – ортопедичне протезування; 10 –догляд
      </td>
    </tr>   
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;  width: 1230px;" cellspacing="0" cellpadding="0px" width="1230px">
  <tbody>   
    <tr style="text-align: left;">
      <td style="width: 200px;">Відповідальна особа  (посада)</td>
      <td style="width: 350px;">
      <!--<input rownum="1" id="D3_POSITION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D3_POSITION{{{}}}{{/textInput}}
      </td>
      <td style="width: 100px;">(підпис)</td>
      <td style="width: 330px;">&nbsp;</td>
      <td style="width: 50px;">(ПІБ)</td>
      <td style="width: 200px;">
      <!--<input rownum="1" id="D3_PERSON" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D3_PERSON{{{}}}{{/textInput}}
      </td>
    </tr>   
    <tr style="height: 5px;">     
      <td colspan="6"></td>     
    </tr>   
    <tr style="text-align: left;">
      <td>Контактний номер телефону</td>
      <td style="border-bottom: 1px solid black;">
      <!--<input rownum="1" id="D3_PHONE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D3_PHONE{{{}}}{{/textInput}}
      </td>      
      <td colspan="4">&nbsp;</td>     
    </tr>   
  </tbody>
</table>
`
