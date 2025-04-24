module.exports = `
<!--%pageOrientation:landscape-->
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td align="center" valign="bottom" width="50%">&nbsp;</td>
      <td width="10%">&nbsp;</td>
      <td width="40%">Додаток 4<br>до Порядку формування та подання страхувальниками звіту щодо сум нарахованого єдиного внеску на загальнообов’язкове державне соціальне страхування (пункт 1 розділу ІІІ)</td>
    </tr>
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr align="center">
      <td colspan="6"><b>Звіт про суми нарахованої заробітної плати (доходу, грошового забезпечення, допомоги, надбавки, компенсації) застрахованих осіб та суми нарахованого єдиного внеску на загальнообов’язкове державне соціальне страхування</b></td>
    </tr>
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td width="70%">1. Звіт за місяць</td>
      <td class="td_box" width="5%">
        <!--<input class="edtCss" id="HZM" lz-type="DGMonth" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.HZM{{{}}}{{/intInput}}
      </td>
      <td align="right" width="15%">рік:</td>
      <td class="td_box" width="5%">
        <!--<input class="edtCss" id="HZY" lz-type="DGYear" type="textbox" value="">-->
        {{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}
      </td>
      <td align="right" width="5%">&nbsp;</td>
    </tr>
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td align="center" style="border: 1px solid black; height: 19px;" width="30%">Подають:</td>
      <td align="center" style="border: 1px solid black; height: 19px;" width="20%">Терміни подання</td>
      <td width="5%">&nbsp;</td>
      <td width="45%" align="center" rowspan="2">
        <table border="0" cellspacing="0" width="60%">
          <tbody>
            <tr>
              <td align="center" colspan="2"><b>Форма № Д4 (місячна)</b></td>
            </tr>
            <tr>
              <td align="right" class="td_box" width="10%">
                <!--<input class="edtCss" id="HZB" lz-choice="HZS,HZD" lz-type="DGchk" type="textbox" value="">-->                
                {{#booleanInput}}DECLAR.DECLARBODY.HZB{{{}}}{{/booleanInput}}
              </td>
              <td><i>(початкова)</i></td>
            </tr>
            <tr>
              <td align="right" class="td_box" width="10%">
                <!--<input class="edtCss" id="HZS" lz-choice="HZB,HZD" lz-type="DGchk" type="textbox" value="">-->                
                {{#booleanInput}}DECLAR.DECLARBODY.HZS{{{}}}{{/booleanInput}}
              </td>
              <td><i>(скасовуюча)</i></td>
            </tr>
            <tr>
              <td align="right" class="td_box" width="10%">
                <!--<input class="edtCss" id="HZD" lz-choice="HZB,HZS" lz-type="DGchk" type="textbox" value="">-->  
                {{#booleanInput}}DECLAR.DECLARBODY.HZD{{{}}}{{/booleanInput}}
              </td>
              <td><i>(додаткова)</i></td>
            </tr>
            <tr>
              <td align="center" colspan="2">ЗАТВЕРДЖЕНО<br>Наказ Міністерства фінансів України<br>15 травня  2018  року. № 511<br>за погодженням з Держстатом</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td align="left" style="border: 1px solid black;">Страхувальники, фізичні особи - підприємці, у тому числі ті, які обрали спрощену систему оподаткування, особи,  які  провадять незалежну професійну діяльність, які використовують працю фізичних осіб, районні (міські) управління праці та соціального захисту населення, - відповідним органам доходів і зборів за місцем реєстрації</td>
      <td align="left" style="border: 1px solid black;" align="left" valign="top">Не пізніше ніж через 20 календарних днів, що настають за останнім календарним днем звітного місяця</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td width="25%">2. Код за ЄДРПОУ або  реєстраційний номер облікової картки платника податків/ серія(за наявності) та/або номер паспорта страхувальника* </td>
      <td style="border: 2px solid black;" width="25%">
        <!--<input class="edtCss" id="HTIN" lz-type="DGHTINJ" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
      <td width="25%">3. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків/серія (за наявності) та/або номер паспорта ліквідованого страхувальника*   (заповнюється у разі подання звіту правонаступником)  </td>
      <td style="border: 1px solid black;" width="25%">
        <!--<input class="edtCss" id="HTIN1" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
    </tr>
  </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td>4. Найменування / прізвище, ім’я, по батькові </td>
      <td class="td_box" colspan="3">
        <!--<input id="HNAME" lz-type="DGHNAME" style="width:100%;" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr>
      <td></td>
      <td align="center" colspan="3">      (страхувальника/фізичної особи)</td>
    </tr>
    <tr>
      <td>Місцезнаходження / Місце проживання</td>
      <td class="td_box" colspan="3">
        <!--<input id="HLOC" lz-type="DGHLOC" style="width:100%;" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HLOC####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
    </tr>
    <tr>
      <td>Телефон </td>
      <td align="center" class="td_box">
        <!--<input class="edtCss" id="HTEL" lz-minoccurs="0" lz-nillable="true" lz-type="DGHTEL" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.HTEL####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
      <td align="center"  colspan="2" class="td_box">&nbsp;</td>
    </tr>
  </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td colspan="3">5. Код територіального органу доходів і зборів, до якого подається звіт   </td>
      <td class="td_box">
        <!--<input class="edtCss" id="HKSTI" lz-type="DGc_dpi" type="textbox" value="" lz-ref-id="HSTI" lz-ref-link="HKSTI:alias" lz-ref-type="common">-->
        {{#textInput}}DECLAR.DECLARBODY.HKSTI####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
      </td>
    </tr>
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td align="center"><b>Перелік таблиць звіту</b></td>
    </tr>
  </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td align="center" width="4%"> № з/п</td>
      <td align="center" width="70%"> Назва таблиці</td>
      <td align="center" width="10%"> Відмітка про подання</td>
    </tr>
    <tr>
      <td align="center"> 1</td>
      <td> Нарахування єдиного внеску </td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040112.HTIN?1:0" id="R001G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R001G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
      <td align="center"> 2</td>
      <td> Нарахування єдиного внеску на загальнообов'язкове державне соціальне страхування за деякі категорії застрахованих осіб</td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040212.HTIN?1:0" id="R002G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R002G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
      <td align="center"> 3</td>
      <td> Нарахування єдиного внеску на загальнообов'язкове державне соціальне страхування за осіб, які проходять строкову військову службу</td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040312.HTIN?1:0" id="R003G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R003G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
    <td align="center">4</td>
      <td>Нарахування єдиного внеску на загальнообов’язкове державне соціальне страхування  на суми грошового забезпечення</td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040412.HTIN?1:0" id="R004G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R004G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
      <td align="center">5</td>
      <td>Відомості про трудові відносини застрахованих осіб</td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040512.HTIN?1:0" id="R005G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R005G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
      <td align="center">6</td>
      <td>Відомості про нарахування заробітної плати (доходу) застрахованим особам</td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040612.HTIN?1:0" id="R006G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R006G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
      <td align="center">7</td>
      <td>Наявність підстав для обліку стажу окремим категоріям осіб відповідно до законодавства  </td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040712.HTIN?1:0" id="R007G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->       
        {{#booleanInput}}DECLAR.DECLARBODY.R007G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
      <td align="center">8</td>
      <td>Відомості про осіб, які доглядають за дитиною до досягнення нею трирічного віку та відповідно до закону отримують 
      допомогу по догляду за дитиною до досягнення нею трирічного віку та/або при народженні дитини, усиновленні дитини,
      та осіб із числа непрацюючих працездатних батьків, усиновителів, опікунів, піклувальників, які фактично здійснюють догляд 
      за дитиною з інвалідністю, а також непрацюючих працездатних осіб, які здійснюють догляд за особою з інвалідністю I групи 
      або за особою похилого віку, яка за висновком медичного закладу потребує постійного стороннього догляду або
      досягла 80-річного віку, якщо такі непрацюючі працездатні особи отримують допомогу,  надбавку або компенсацію 
      відповідно до законодавства, та нарахування сум єдиного внеску за патронатних вихователів, батьків-вихователів дитячих 
      будинків сімейного типу, прийомних батьків, якщо вони отримують грошове забезпечення відповідно до законодавства</td>
      <td align="center">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040812.HTIN?1:0" id="R008G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R008G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
    <tr>
    <td align="center">9</td>
      <td>Відомості про осіб, які проходять строкову військову службу</td>
      <td align="right">
        <!--<input class="edtCss" descr_eq="" expr_eq="^J3040912.HTIN?1:0" id="R009G3" lz-minoccurs="0" lz-nillable="true" lz-type="DGchk" type="textbox" value="">-->
        {{#booleanInput}}DECLAR.DECLARBODY.R009G3{{{}}}{{/booleanInput}}
      </td>
    </tr>
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
    <tr>
      <td> * Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією та номером  паспорта.</td>
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
