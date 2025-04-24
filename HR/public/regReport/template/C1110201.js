module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; font-family: TimesNewRoman; font-size: 14px; width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td align="right" valign="bottom" width="50%">&nbsp;</td>
      <td width="40%">&nbsp;</td>
      <td width="10%">Додаток 1.2</td>
    </tr>
    <tr>
      <td align="left" valign="bottom" width="50%">ІІ Допомога на поховання</td>
      <td width="40%">&nbsp;</td>
      <td width="10%">&nbsp;</td>
    </tr>
  </tbody>
</table>
<br>
<table id="table" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse; border: 1px solid black; width: 1050px;" border="1" cellspacing="0" cellpadding="0px" width="1050px">   
  <thead>
  <tr align="center" valign="top">
      <td align="center" rowspan="2" style="width: 30px; text-align: center" class="no-print">&nbsp;</td>
      <td rowspan="2" style="text-align: center; width: 50px" rowspan="2">№з/п</td>  
      <td style="width: 100px">Прізвище</td>
      <td style="width: 100px">Ім’я</td>
      <td style="width: 100px">По&nbsp;батькові</td>
      <td style="width: 150px; text-align: left;">№&nbsp;страхового свідоцтва<br/>(ідентифікаційний<br/>номер) або серія та<br/>номер паспорта</td>     
      
      <td style="width: 100px">Прізвище</td>
      <td style="width: 100px">Ім’я</td>
      <td style="width: 100px" >По батькові</td>
      <td colspan="2" style="width: 200px; text-align: center;">Свідоцтво про смерть</td>
      <td style="width: 100px; text-align: left;">Витрати Фонду (сума в гривнях з копійками.)</td>
  </tr>
  
  <tr align="center" valign="top">    
     <td colspan="4">Одержувача допомоги **</td>
     <td colspan="3">Померлого</td>
     <td style="width: 100px">Серія</td>
     <td style="width: 100px">Номер</td>   
     <td></td>  
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
   </tr>    
  </thead>
  <tbody id="Process">  
    {{#generatorRows}}T2{{{}}}{{/generatorRows}}
    <!---->
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; border-collapse: collapse; font-family: TimesNewRoman; font-size: 12px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td align="left" valign="bottom">** Не заповнюється у разі, якщо поховання здійснювала юридична особа</td>
      <td align="left" valign="bottom">
      <!--<input rownum="1" id="T2RG12" lz-maxoccurs="9999" lz-minoccurs="0" lz-nillable="true" lz-type="IntColumn" type="textbox" value="">-->
        {{#noPrintIntInput}}T2RG12{{{}}}{{/noPrintIntInput}}
      </td>
    </tr>   
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;  width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>   
    <tr style="text-align: left;">
      <td style="width: 200px;">Відповідальна особа  (посада)</td>
      <td style="width: 250px;">
      <!--<input rownum="1" id="D2_POSITION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D2_POSITION{{{}}}{{/textInput}}
      </td>
      <td style="width: 100px;">(підпис)</td>
      <td style="width: 250px;">&nbsp;</td>
      <td style="width: 50px;">(ПІБ)</td>
      <td style="width: 200px;">
      <!--<input rownum="1" id="D2_PERSON" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D2_PERSON{{{}}}{{/textInput}}
      </td>
    </tr>   
    <tr style="height: 5px;">     
      <td colspan="6"></td>     
    </tr> 
    <tr style="text-align: left;">
      <td>Контактний номер телефону</td>
      <td style="border-bottom: 1px solid black;">
      <!--<input rownum="1" id="D2_PHONE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D2_PHONE{{{}}}{{/textInput}}
      </td>      
      <td colspan="4">&nbsp;</td>
    </tr>   
  </tbody>
</table>
`
