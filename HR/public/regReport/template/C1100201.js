module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse;  width: 1090px;" cellspacing="0" cellpadding="0px" width="1090px">
  <tbody>
    <tr style="font-size: 12px;">
      <td align="center" valign="bottom" width="10%">&nbsp;</td>
      <td width="50%">&nbsp;</td>
      <td width="40%">Додаток 2<br/>до Порядку фінансування страхувальників для надання матеріального<br/>забезпечення застрахованим особам у зв’язку з тимчасовою втратою<br/>працездатності та окремих виплат потерпілим на виробництві за<br/>рахунок коштів Фонду соціального страхування України</td>
    </tr>
  </tbody>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px;  border-collapse: collapse; width: 1090px;" cellspacing="0" cellpadding="0px" width="1090px">
  <tbody>
    <tr align="center">
      <td colspan="9" style="font-weight: bold;">Повідомлення про виплату коштів застрахованим особам</td>
    </tr>
    <tr style="text-align: justify">
      <td colspan="9">Найменування страхувальника (прізвище, ім'я, по батькові для фізичних осіб)</td>
    </tr>
    <tr style="text-align: justify">
        <td class="td_box" colspan="9" style="border-bottom: 1px solid;">
        <!--<input id="CST_CAPTION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.CST_CAPTION{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="text-align: justify">
      <td colspan="3">Місцезнаходження (<i>місце проживання для фізичних осіб</i>)</td>   
      <td class="td_box" colspan="6" style="border-bottom: 1px solid;">
        <!--<input id="ADDRESS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.ADDRESS{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="height: 5px">
      <td colspan="9"></td>
    </tr>
    <tr>
        <td style="text-align: justify;">Телефон</td>        
        <td align="center" class="td_box" colspan="4" style="border-bottom: 1px solid;">
            <!--<input id="PHONE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
            {{#textInput}}DECLAR.DECLARBODY.PHONE{{{}}}{{/textInput}}
         </td>
         <td style="text-align: justify;" colspan="4"></td>
     </tr>
    <tr style="text-align: justify-all">
      <td colspan="9">Код за ЄДРПОУ <i>(реєстраційний номер облікової картки платника податків - для фізичних осіб або серія та номер паспорта (для фізичних осіб, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки податків та офіційно повідомили про це відповідний орган державної податкової служби і мають відмітку у паспорті)</i></td>
    </tr>
    <tr>            
        <td style="border-bottom: 1px solid;" colspan="9">
        <!--<input id="UNICODE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.UNICODE{{{}}}{{/textInput}}
      </td>     
     </tr>   
  </tbody>
</table>
<br/>
<table id="table" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 12px; border-collapse: collapse; border: 1px solid black; width: 1050px;" border="1" cellspacing="0" cellpadding="0px" width="1050px">
  <thead>  
    <tr>      
      <td align="center" class="no-print" style="width: 30px; text-align: center">&nbsp;</td>
      <td align="center" style="width: 50px;">№ з/п</td>
      <td align="center" style="width: 150px;">Прізвище</td>
      <td align="center" style="width: 150px;">Ім’я</td>
      <td align="center" style="width: 150px;">По батькові</td>
      <td align="center" style="width: 150px;">№ страхового свідоцтва (ідентифікаційний номер)</td>
      
      <td align="center" style="width: 200px;" colspan="2">Дані листка непрацездатності</td>
      
      <td align="center" style="width: 100px;">Дата виплати коштів застрахованій особі</td>
      <td align="center" style="width: 100px;">Сума за рахунок коштів Фонду (в гривнях з копійками)</td>      
    </tr>     
    <tr>
      <td align="center" style="width: 30px;" class="no-print"></td>
      <td align="center" style="width: 50px;"></td>
      <td align="center" style="width: 150px;"></td>
      <td align="center" style="width: 150px;"></td>
      <td align="center" style="width: 150px;"></td>
      <td align="center" style="width: 150px;"></td>
      
      <td align="center" style="width: 100px;">Серія</td>
      <td align="center" style="width: 100px;">Номер</td>
      
      <td align="center" style="width: 100px;"></td>
      <td align="center" style="width: 100px;"></td>      
    </tr>  
    </thead>
    <tbody id="Process">  
    {{#generatorRows}}T1{{{}}}{{/generatorRows}}
    <!---->
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px; border-collapse: collapse;  width: 1090px;" cellspacing="0" cellpadding="0px" width="1090px">
  <tbody>   
    <tr style="text-align: left;">
      <td>Керівник установи</td>
      <td>&nbsp;</td>
      <td>(підпис)</td>
      <td>&nbsp;</td>
      <td>(прізвище, ім'я, по батькові)</td>
      <td>
      <!--<input class="edtCss" id="CHIEF" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.CHIEF{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="text-align: left;">
      <td>Головний бухгалтер</td>
      <td>&nbsp;</td>
      <td>(підпис)</td>
      <td>&nbsp;</td>
      <td>(прізвище, ім'я, по батькові)</td>
      <td>
      <!--<input class="edtCss" id="BOOKKEEPER" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.BOOKKEEPER{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="text-align: left;">
      <td>МП (за наявності)</td>
      <td>&nbsp;</td>
      <td style="text-align: right">Дата</td>   
      <td>
      <!--<input id="DATE_FORMATION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGDate" type="textbox" value="">-->
      {{#dateInput}}DECLAR.DECLARBODY.DATE_FORMATION{{{}}}{{/dateInput}}
      </td>
      <td colspan="2">&nbsp;</td>
    </tr>
  </tbody>
</table>

`
