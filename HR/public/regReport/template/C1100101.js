module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px; border-collapse: collapse;  width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr style="font-size: 12px;">
      <td align="center" valign="bottom" width="10%">&nbsp;</td>
      <td width="50%">&nbsp;</td>
      <td width="40%">Додаток 1<br/>до Порядку фінансування страхувальників для надання матеріального забезпечення застрахованим особам у зв’язку з тимчасовою втратою працездатності та окремих виплат потерпілим на виробництві за рахунок коштів Фонду соціального страхування України</td>
    </tr>
  </tbody>
</table>
<br>
<table style="page-break-after: always; table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px;  border-collapse: collapse; width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr align="center">
      <td colspan="8">ЗАЯВА-РОЗРАХУНОК</td>
    </tr>
    <tr style="text-align: justify">
      <td colspan="8">Просимо здійснити фінансування для надання матеріального забезпечення застрахованим особам, страхових виплат потерпілим на виробництві, відшкодування вартості поховання потерпілого та пов’язаних з цим ритуальних послуг  за рахунок коштів Фонду.<br/>Повідомляємо наші реквізити:<br/>Найменування страхувальника (<i>прізвище,  ім'я,  по  батькові для фізичних осіб</i>)</td>
    </tr>
    <tr style="text-align: justify">
        <td class="td_box" colspan="8" style="border-bottom: 1px solid black; min-height: 14px;">
        <!--<input id="CST_CAPTION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.CST_CAPTION{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="text-align: justify;">
      <td colspan="8">Місцезнаходження (<i>місце проживання для фізичних осіб</i>)</td>
    </tr>
    <tr>
      <td class="td_box" colspan="8" style="border-bottom: 1px solid black; min-height: 14px;">
        <!--<input id="ADDRESS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.ADDRESS{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="height: 5px">
      <td colspan="8"></td>
    </tr>
    <tr>
        <td style="text-align: justify;">Телефон</td>        
        <td align="center" class="td_box" colspan="4" style="border-bottom: 1px solid black;">
            <!--<input class="edtCss" id="PHONE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
            {{#textInput}}DECLAR.DECLARBODY.PHONE{{{}}}{{/textInput}}
         </td>
         <td style="text-align: justify;" colspan="3"></td>
     </tr>
    <tr style="text-align: justify-all">
      <td colspan="8">Код за ЄДРПОУ <i>(реєстраційний номер облікової картки платника податків - для фізичних осіб або серія та номер паспорта (для фізичних осіб, які через свої релігійні переконання відмовляються від прийняття реєстраційного номера облікової картки податків та офіційно повідомили про це відповідний орган державної податкової служби і мають відмітку у паспорті)</i></td>
    </tr>
    <tr>            
        <td style="border-bottom: 1px solid black; height: 14px;" colspan="8">
        <!--<input class="edtCss" id="UNICODE" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.UNICODE{{{}}}{{/textInput}}
      </td>     
     </tr>
    <tr style="text-align: left">
      <td colspan="8">Окремий поточний рахунок у банку або окремий рахунок у відповідному органі Державного казначейства України </td>
    </tr>
    <tr style="text-align: left">
      <td colspan="8" style="border-bottom: 1px solid black; height: 14px;">
      <!--<input class="edtCss" id="CAPTION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.CAPTION{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="text-align: center; font-size: 12px">
      <td colspan="8">(назва банку або органу Державного казначейства)</td>
    </tr>
    <tr style="text-align: left">
      <td colspan="8" style="border-bottom: 1px solid black; height: 14px;">
      <!--<input class="edtCss" id="ACCOUNT" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.ACCOUNT{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr style="text-align: center; font-size: 12px">
      <td colspan="8">(номер рахунку, відкритого відповідно до пункту другого статті 34 Закону України "Про загальнообов'язкове державне соціальне страхування")</td>
    </tr>
     <tr style="height: 20px">
      <td colspan="8"></td>
    </tr>
     <tr>
        <td style="text-align: justify;">МФО </td>        
        <td align="left" class="td_box" colspan="3" style="border-bottom: 1px solid black;">
           <!--<input class="edtCss" id="MFO" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.MFO{{{}}}{{/textInput}}
         </td>
         <td style="text-align: justify;" colspan="4"></td>
     </tr>     
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
  
    <tr>
      <td align="center" width="4%">№ з/п</td>
      <td align="center" width="26%">Вид матеріального забезпечення та виплат потерпілим на виробництві</td>
      <td align="center" width="24%">Кількість днів для п.1, 2, 2.1, 4, 5<br/>Кількість осіб для п.3, 6</td>
      <td align="center" width="23%">Сума (в гривнях з копійками)</td>
      <td align="center" width="23%">Примітка</td>
    </tr>
    <tr>
      <td align="center">1</td>
      <td align="center">2</td>
      <td align="center">3</td>
      <td align="center">4</td>
      <td align="center"></td>
    </tr>
    <tr style="page-break-inside: avoid;">
      <td align="left"> 1</td>
      <td>Допомога по тимчасовій непрацездатності</td>
      <td align="left">
      <!--<input class="edtCss" id="TVP_DAYS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.TVP_DAYS{{{}}}{{/intInput}}
      </td>
      <td align="left">
      <!--<input class="edtCss" id="TVP_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
      {{#currencyInput}}DECLAR.DECLARBODY.TVP_SUM{{{}}}{{/currencyInput}}
      </td>
      <td align="left">
        <!--<input class="edtCss" id="N16" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.N16{{{}}}{{/booleanInput}} Додаток 1.1<br/>N16</td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 1.1</td>
      <td><i>У тому числі виплата за пільгами постраждалим внаслідок ЧАЕС</i></td>
      <td align="left">
      <!--<input class="edtCss" id="TVP_CHAES_DAYS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.TVP_CHAES_DAYS{{{}}}{{/intInput}}
      </td>
      <td align="left">
      <!--<input class="edtCss" id="TVP_CHAES_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.TVP_CHAES_SUM{{{}}}{{/currencyInput}}</td></td>
      <td align="left"></td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 2</td>
      <td>Допомога по вагітності та пологах</td>
      <td align="left">
       <!--<input class="edtCss" id="MATERNITY_DAYS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value=""-->
        {{#intInput}}DECLAR.DECLARBODY.MATERNITY_DAYS{{{}}}{{/intInput}}</td>
      <td align="left">
      <!--<input class="edtCss" id="MATERNITY_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.MATERNITY_SUM{{{}}}{{/currencyInput}}</td>
      <td align="left">
        <!--<input class="edtCss" id="N17" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.N17{{{}}}{{/booleanInput}} Додаток 1.1<br/>N17</td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 2.1</td>
      <td><i>У тому числі виплата за пільгами постраждалим внаслідок ЧАЕС</i></td>
      <td align="left">
      <!--<input class="edtCss" id="MATERNITY_CHAES_DAYS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.MATERNITY_CHAES_DAYS{{{}}}{{/intInput}}</td>
      <td align="left">
      <!--<input class="edtCss" id="MATERNITY_CHAES_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.MATERNITY_CHAES_SUM{{{}}}{{/currencyInput}}</td>
      <td align="left"></td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 3</td>
      <td>Допомога на поховання</td>
      <td align="left">
      <!--<input class="edtCss" id="FUNERAL_COUNT" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.FUNERAL_COUNT{{{}}}{{/intInput}}
      </td>
      <td align="left">
      <!--<input class="edtCss" id="FUNERAL_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.FUNERAL_SUM{{{}}}{{/currencyInput}}
      </td>
      <td align="left">
        <!--<input class="edtCss" id="N18" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.N18{{{}}}{{/booleanInput}} Додаток 1.2<br/>N18</td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 4</td>
      <td>Допомога по тимчасовій непрацездатності внаслідок нещасного випадку або профзахворювання</td>
      <td align="left">
      <!--<input class="edtCss" id="ACCEDENT_DAYS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.ACCEDENT_DAYS{{{}}}{{/intInput}}</td>
      <td align="left">
      <!--<input class="edtCss" id="ACCEDENT_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.ACCEDENT_SUM{{{}}}{{/currencyInput}}</td>
      <td align="left">
        <!--<input class="edtCss" id="N19" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.N19{{{}}}{{/booleanInput}} Додаток 1.3<br/>N19</td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 5</td>
      <td>Виплата у разі переведення потерпілого на легшу, нижчеоплачувану роботу</td>
      <td align="left">
      <!--<input class="edtCss" id="SIMPLIFIED_DAYS" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.SIMPLIFIED_DAYS{{{}}}{{/intInput}}</td>
      <td align="left">
      <!--<input class="edtCss" id="SIMPLIFIED_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.SIMPLIFIED_SUM{{{}}}{{/currencyInput}}</td>
      <td align="left">
        <!--<input class="edtCss" id="N20" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.N20{{{}}}{{/booleanInput}} Додаток 1.4<br/>N20</td>
    </tr>
    
    <tr style="page-break-inside: avoid;">
      <td align="left"> 6</td>
      <td>Відшкодування вартості поховання потерпілого та пов’язаних з цим ритуальних послуг</td>
      <td align="left">
      <!--<input class="edtCss" id="GRAVE_COUNT" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.GRAVE_COUNT{{{}}}{{/intInput}}</td>
      <td align="left">
      <!--<input class="edtCss" id="GRAVE_SUM" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.GRAVE_SUM{{{}}}{{/currencyInput}}</td>
      <td align="left">
        <!--<input class="edtCss" id="N21" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:integer" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.N21{{{}}}{{/booleanInput}} Додаток 1.5<br/>N21</td>
    </tr>
    
     <tr style="page-break-inside: avoid;">
      <td align="left"> 7</td>
      <td align="right">ВСЬОГО</td>
      <td align="center">X</td>
      <td align="center">
      <!--<input class="edtCss" id="SUM_ALL" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
        {{#currencyInput}}DECLAR.DECLARBODY.SUM_ALL{{{}}}{{/currencyInput}}</td>
      <td align="left"></td>
    </tr>    
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px; border-collapse: collapse;  width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
   <tr style="text-align: left;">
      <td colspan="6">Додатки 1.1 – 1.5 заповнюються тільки для тих видів виплат, на які замовляються кошти.</td>      
    </tr>
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
      <td colspan="2">&nbsp;</td>
      <td colspan="2" style="text-align: right;">Дата складання заяви-розрахунку </td>   
      <td>
      <!--<input id="DATE_FORMATION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGDate" type="textbox" value="">-->
      {{#dateInput}}DECLAR.DECLARBODY.DATE_FORMATION{{{}}}{{/dateInput}}
      </td>
    </tr>
  </tbody>
</table>

`
