module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="45%">1. Звіт за місяць</td>
         <td class="td_box" width="15%">
            <!--<input class="edtCss" id="HZM" lz-type="DGMonth" type="textbox" value="">-->
            {{#intInput}}DECLAR.DECLARBODY.HZM{{{}}}{{/intInput}}
         </td>
         <td align="right" width="10%">pік</td>
         <td class="td_box" width="20%">
            <!--<input class="edtCss" id="HZY" lz-type="DGYear" type="textbox" value="">-->
            {{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}
         </td>
         <td width="10%">&nbsp;</td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="50%">2. Код за ЄДРПОУ або податковий номер/серія (за наявності) та номер паспорта страхувальника*</td>
         <td width="45%">
            <!--<input class="edtCss" id="HTIN" lz-type="DGHTINJ" type="textbox" value="">-->
            {{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
         <td width="5%">&nbsp;</td>
      </tr>
      <tr>
         <td>3. Код за ЄДРПОУ або податковий номер/серія (занаявності)  та/або  номер паспорта  ліквідованого/припиненого страхувальника (заповнюється у разіподання звіту правонаступником)    </td>
         <td>
            <!--<input class="edtCss" id="HTIN1" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">-->
            {{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="10%"><b>Страхувальник </b></td>
         <td class="td_box">
            <!--<input id="HNAME" lz-type="DGHNAME" style="width:100%;" value="">-->
            {{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
         </td>
      </tr>
      <tr>
         <td>&nbsp;</td>
         <td align="center">(найменування страхувальника) </td>
      </tr>
   </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr align="center">
            <td><b>Таблиця 4. Нарахування єдиного внеску на загальнообов'язкове державне соціальне страхування на суми грошового забезпечення та на суми допомоги у зв’язку з вагітністю та пологами</b></td>
        </tr>
        <tr align="center">
            <td><b>Розділ I</b></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="90%">Кількість осіб, яким у звітному періоді нараховано грошове забезпечення</td>
            <td class="td_box" width="10%">
                <!--<input class="edtCss" id="R0101G1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.R0101G1{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" width="5%"> № з/п</td>
            <td align="center" width="85%"> Назва показника</td>
            <td align="center" width="10%"> Сума (грн.)</td>
        </tr>
        <tr>
            <td align="center"> 1 </td>
            <td align="center"> 2 </td>
            <td align="center"> 3 </td>
        </tr>
        <tr>
            <td align="center"> 1 </td>
            <td> Загальна сума грошового забезпечення </td>
            <td align="right">
                <!--<input class="edtCss" id="R0101G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0101G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 2 </td>
            <td> Сума грошового забезпечення, на яку нараховується єдиний внесок, та додаткової бази нарахування, усього (р. 2.1 + р. 2.2)</td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 2 =  р.2.1 + р.2.2" expr_eq="^R01021G3+^R01022G3" id="R0102G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0102G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 2.1 </td>
            <td> Сума грошового забезпечення, на яку нараховується єдиний внесок (у межах максимальної величини бази нарахування єдиного внеску)</td>
            <td align="right">
                <!--<input class="edtCss" id="R01021G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01021G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 2.2 </td>
            <td> Додаткова база нарахування єдиного внеску </td>
            <td align="right">
                <!--<input class="edtCss" id="R01022G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01022G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 3 </td>
            <td> Нараховано єдиного внеску, усього (р. 3.1 + р. 3.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 3 =  р.3.1 + р.3.2" expr_eq="^R01031G3+^R01032G3" id="R0103G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0103G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 3.1 </td>
            <td> Нараховано єдиного внеску (22,0 %) </td>
            <td align="right">
                <!--<input class="edtCss" id="R01031G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01031G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 3.2</td>
            <td>Нараховано на суми різниці між розміром мінімальної заробітної плати та фактично нарахованого грошового забезпечення (22,0 %)</td>
            <td align="right">
                <!--<input class="edtCss" id="R01032G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01032G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 4 </td>
            <td> Сума, на яку збільшено єдиний внесок у зв'язку з виправленням помилки, допущеної у попередніх звітних періодах (р. 4.1 + р. 4.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 4 =  р.4.1 + р.4.2" expr_eq="^R01041G3+^R01042G3" id="R0104G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0104G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 4.1 </td>
            <td> (22,0 %, 34,7 %), в т. ч. донараховано суму грошового забезпечення до розміру мінімальної заробітної плати</td>
            <td align="right">
                <!--<input class="edtCss" id="R01041G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01041G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 4.2 </td>
            <td> 2,6 % </td>
            <td align="right">
                <!--<input class="edtCss" id="R01042G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01042G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td>Зміст помилки<br>
                <!--<input id="R0104G2S" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.R0104G2S{{{}}}{{/textInput}}
            </td>
            <td align="right">&nbsp;</td>
        </tr>
        <tr>
            <td align="center"> 5 </td>
            <td> Сума, на яку зменшено єдиний внесок у зв'язку з виправленням помилки, допущеної у попередніх звітних періодах (р. 5.1 + р. 5.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 5 =  р.5.1 + р.5.2" expr_eq="^R01051G3+^R01052G3" id="R0105G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0105G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 5.1 </td>
            <td> (34,7 %, 22,0 %), в т. ч. зменшено суму грошового забезпечення, виходячи з розміру мінімальної заробітної плати</td>
            <td align="right">
                <!--<input class="edtCss" id="R01051G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01051G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 5.2 </td>
            <td> 2,6 % </td>
            <td align="right">
                <!--<input class="edtCss" id="R01052G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01052G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td>Зміст помилки<br>
                <!--<input id="R0105G2S" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.R0105G2S{{{}}}{{/textInput}}
            </td>
            <td align="right">&nbsp;</td>
        </tr>
        <tr>
            <td align="center"> 6 </td>
            <td> Загальна сума єдиного внеску (р. 3 + р. 4 - р. 5) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 6 = р.3 + р.4 - р.5" expr_eq="^R0103G3+^R0104G3-^R0105G3" id="R0106G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0106G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 6.1 </td>
            <td> Нараховано єдиного внеску, (22,0 %) (р. 3 + р. 4.1 - р. 5.1) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 6.1 = р.3 + р.4.1 - р.5.1" expr_eq="^R0103G3+^R01041G3-^R01051G3" id="R01061G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01061G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 6.2 </td>
            <td> Утримано єдиного внеску (4.2 - р. 5.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ І. Рядок 6.2 = р.4.2 - р.5.2" expr_eq="^R01042G3-^R01052G3" id="R01062G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R01062G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
    </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr align="center">
            <td><b>Розділ II</b></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
    <tbody>
        <tr>
            <td width="90%">Кількість осіб, яким у звітному періоді нараховано допомогу у зв’язку з вагітністю та пологами  </td>
            <td class="td_box" width="10%">
                <!--<input class="edtCss" id="R0201G1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:nonNegativeInteger" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.R0201G1{{{}}}{{/intInput}}
            </td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px" border="1" bordercolor="black" cellspacing="0">
    <tbody>
        <tr>
            <td align="center" width="5%"> № з/п</td>
            <td align="center" width="85%"> Назва показника</td>
            <td align="center" width="10%"> Сума (грн.)</td>
        </tr>
        <tr>
            <td align="center"> 1 </td>
            <td align="center"> 2 </td>
            <td align="center"> 3 </td>
        </tr>
        <tr>
            <td align="center"> 1 </td>
            <td> Загальна сума допомоги у зв’язку з вагітністю та пологами</td>
            <td align="right">
                <!--<input class="edtCss" id="R0201G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0201G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 2 </td>
            <td> Сума допомоги у зв’язку з вагітністю та пологами, на яку нараховується єдиний внесок, та додаткової бази нарахування, усього (р. 2.1 + р. 2.2)</td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 2 =  р.2.1 + р.2.2" expr_eq="^R02021G3+^R02022G3" id="R0202G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0202G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 2.1 </td>
            <td> Сума допомоги у зв’язку з вагітністю та пологами, на яку нараховується єдиний внесок (у межах максимальної величини бази нарахування єдиного внеску) </td>
            <td align="right">
                <!--<input class="edtCss" id="R02021G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02021G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 2.2 </td>
            <td> Додаткова база нарахування єдиного внеску</td>
            <td align="right">
                <!--<input class="edtCss" id="R02022G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02022G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 3 </td>
            <td> Нараховано єдиного внеску, усього (р. 3.1 + 3.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 3 =  р.3.1 + р.3.2" expr_eq="^R02031G3+^R02032G3" id="R0203G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0203G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 3.1 </td>
            <td> Нараховано єдиного внеску, (22,0 %)</td>
            <td align="right">
                <!--<input class="edtCss" id="R02031G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02031G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 3.2 </td>
            <td> Нараховано на суми різниці між розміром мінімальної заробітної плати та фактично нарахованою сумою допомоги у зв’язку з вагітністю та пологами (22,0%)</td>
            <td align="right">
                <!--<input class="edtCss" id="R02032G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02032G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 4 </td>
            <td>Сума, на яку збільшено єдиний внесок у зв'язку з виправленням помилки, допущеної в попередніх звітних періодах (р. 4.1 + р. 4.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 4 =  р.4.1 + р.4.2" expr_eq="^R02041G3+^R02042G3" id="R0204G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0204G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 4.1 </td>
            <td>22,0 %, 33,2 %, в т.ч. донараховано суму допомоги у зв’язку з вагітністю та пологами до розміру мінімальної заробітної плати </td>
            <td align="right">
                <!--<input class="edtCss" id="R02041G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02041G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
            <tr>
            <td align="center"> 4.2 </td>
            <td>2 % </td>
            <td align="right">
                <!--<input class="edtCss" id="R02042G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02042G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td>Зміст помилки<br>
                <!--<input id="R0204G2S" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.R0204G2S{{{}}}{{/textInput}}
            </td>
            <td align="right">&nbsp;</td>
        </tr>
        <tr>
            <td align="center"> 5 </td>
            <td> Сума, на яку зменшено єдиний внесок у зв'язку з виправленням помилки, допущеної в попередніх звітних періодах (р. 5.1 + р. 5.2)  </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 5 =  р.5.1 + р.5.2" expr_eq="^R02051G3+^R02052G3" id="R0205G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0205G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 5.1 </td>
            <td> 22,0 %, 33,2 %, в т.ч. зменшено суму допомоги у зв’язку з вагітністю та пологами, виходячи з розміру мінімальної заробітної плати</td>
            <td align="right">
                <!--<input class="edtCss" id="R02051G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02051G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 5.2 </td>
            <td> 2 %</td>
            <td align="right">
                <!--<input class="edtCss" id="R02052G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02052G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center">&nbsp;</td>
            <td>Зміст помилки<br>
                <!--<input id="R0205G2S" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" style="width:100%;" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.R0205G2S{{{}}}{{/textInput}}
            </td>
            <td align="right">&nbsp;</td>
        </tr>
        <tr>
            <td align="center"> 6 </td>
            <td> Загальна сума єдиного внеску (р. 3 + р. 4 - р. 5) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 6 = р.3 + р.4 - р.5" expr_eq="^R0203G3+^R0204G3-^R0205G3" id="R0206G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R0206G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 6.1 </td>
            <td> Нараховано єдиного внеску, 22,0 %,  33,2 % (р. 3 + р. 4.1 - р. 5.1) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 6.1 = р.3 + р.4.1 - р.5.1" expr_eq="^R0203G3+^R02041G3-^R02051G3" id="R02061G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02061G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
        <tr>
            <td align="center"> 6.2 </td>
            <td> Утримано єдиного внеску, 2 % (р. 4.2 - р. 5.2) </td>
            <td align="right">
                <!--<input class="edtCss" descr_eq="Розділ ІІ. Рядок 6.2 = р.4.2 - р.5.2" expr_eq="^R02042G3-^R02052G3" id="R02062G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">-->
                {{#currencyInput}}DECLAR.DECLARBODY.R02062G3{{{}}}{{/currencyInput}}
            </td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="85%">Дата формування у страхувальника </td>
         <td align="center" class="td_box" width="10%">
            <!--<input class="edtCss" id="HFILL" lz-type="DGDate" type="textbox" value="">-->
            {{#dateInput}}DECLAR.DECLARBODY.HFILL{{{}}}{{/dateInput}}
         </td>
      </tr>
   </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td width="15%">Керівник  </td>
      <td width="5%">&nbsp;</td>
      <td class="td_box" width="30%">
        <!--<input class="edtCss" id="HKBOS" lz-type="DGLong" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HKBOS{{{}}}{{/textInput}}
      </td>
      <td width="5%">&nbsp;</td>
      <td class="td_unln" width="10%">&nbsp;</td>
      <td width="5%">&nbsp;</td>
      <td class="td_box" width="30%">
        <!--<input id="HBOS" lz-type="DGHBOS" style="width:100%;" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HBOS{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>(реєстраційний номер облікової картки платника податків та/або серія (за наявності) та номер паспорта*)      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(підпис)</font>
      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">        (ініціали та прізвище)  </font>
      </td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr>
      <td>Головний бухгалтер</td>
      <td>&nbsp;</td>
      <td class="td_box">
        <!--<input class="edtCss" id="HKBUH" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HKBUH{{{}}}{{/textInput}}
      </td>
      <td>&nbsp;</td>
      <td class="td_unln">&nbsp;</td>
      <td>&nbsp;</td>
      <td class="td_box">
        <!--<input id="HBUH" lz-minoccurs="0" lz-nillable="true" lz-type="DGHBUH" style="width:100%;" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HBUH{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>(реєстраційний номер облікової картки платника податків та/або серія (за наявності) та номер паспорта*)       </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(підпис)</font>
      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(ініціали та прізвище)  </font>
      </td>
    </tr>
  </tbody>
</table>
`
