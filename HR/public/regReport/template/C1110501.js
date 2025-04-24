module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; font-family: TimesNewRoman; font-size: 14px;" cellspacing="0" cellpadding="0px" width="1200px">
  <tbody>
    <tr>
      <td align="right" valign="bottom" width="50%">&nbsp;</td>
      <td width="40%">&nbsp;</td>
      <td width="10%">Додаток 1.5</td>
    </tr>
    <tr>
      <td align="left" valign="bottom" width="100%" colspan="3">V. Відшкодування вартості поховання потерпілого та пов’язаних з цим ритуальних послуг</td>      
    </tr>
  </tbody>
</table>
<br>
<table id="table" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse; border: 1px solid black; width: 1200px;" border="1" cellspacing="0" cellpadding="0px" width="1200px">
  <thead>  
  <tr align="center" valign="middle">
      <td align="center" rowspan="2" style="width: 30px; text-align: center" class="no-print">&nbsp;</td>
      <td style="width: 50px; text-align: center" rowspan="2">№з/п</td>  
      <td rowspan="2" style="width: 150px;">Прізвище</td>
      <td rowspan="2" style="width: 150px;">Ім’я</td>
      <td rowspan="2" style="width: 150px;">По&nbsp;батькові</td>
      <td rowspan="2" style="width: 150px;">№&nbsp;страхового свідоцтва<br/>(ідентифікаційний номер)&nbsp;або<br/>серія та номер паспорта померлого</td>
            
      <td colspan="2" style="width: 200px;">Дані акту про нещасний випадок або профзахворювання</td>  
      <td colspan="2" style="width: 200px;">Свідоцтво про смерть</td>    
      
      <td rowspan="2" style="width: 150px; text-align: left; vertical-align: top;">Витрати Фонду (сума в гривнях з копійками.)</td>
     
  </tr>
  
  <tr align="center" valign="middle">    
     <td style="width: 100px">Дата</td>
     <td style="width: 100px;">Номер</td>
     
     <td style="width: 100px;">Серія</td>
     <td style="width: 100px;">Номер</td>     
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
   </tr>    
   </thead>
  <tbody id="Process">
    {{#generatorRows}}T5{{{}}}{{/generatorRows}}
    <!---->
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;  width: 1200px;" cellspacing="0" cellpadding="0px" width="1200px">
  <tbody>   
    <tr style="text-align: left;">
      <td style="width: 200px;">Відповідальна особа  (посада)</td>
      <td style="width: 350px;">
      <!--<input rownum="1" id="D5_POSITION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D5_POSITION{{{}}}{{/textInput}}
      </td>
      <td style="width: 100px;">(підпис)</td>
      <td style="width: 300px;">&nbsp;</td>
      <td style="width: 50px;">(ПІБ)</td>
      <td style="width: 200px;">
      <!--<input rownum="1" id="D5_PERSON" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D5_PERSON{{{}}}{{/textInput}}
      </td>
    </tr>   
    <tr style="height: 5px;">     
      <td colspan="6"></td>     
    </tr>   
    <tr style="text-align: left;">
      <td>Контактний номер телефону</td>
      <td style="border-bottom: 1px solid black;">
      <!--<input rownum="1" id="D5_PHONE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D5_PHONE{{{}}}{{/textInput}}
      </td>      
      <td colspan="4">&nbsp;</td>     
    </tr>   
  </tbody>
</table>
`
