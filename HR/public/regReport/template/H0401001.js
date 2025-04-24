module.exports = `
<!--%pageOrientation:landscape-->

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px;  border-collapse: collapse; width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
  <tbody>
   <tr align="left">
      <td width="100px"></td> 
      <td width="100px"></td> 
      <td width="850px">Заява-розрахунок що до сплати за листками непрацездатності застрахованих осіб</td>
    </tr>
    
    <tr style="text-align: justify">
       <td align="left" width="10%">Організація</td>
       <td class="td_box" colspan="2" style="border-bottom: 1px solid black; min-height: 14px;">
        <!--<input id="CST_CAPTION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.ORG{{{}}}{{/textInput}}
      </td>
    </tr>
     <tr style="text-align: justify">
       <td align="left" width="10%">Підрозділ</td>
       <td class="td_box" colspan="2" style="border-bottom: 1px solid black; min-height: 14px;">
        <!--<input id="CST_CAPTION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.DEP{{{}}}{{/textInput}}
      </td>
    </tr>
    
    <tr style="text-align: justify">
    <td style="text-align: left;">Дата подання</td>   
      <td>
      <!--<input id="DATE_FORMATION" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="DGDate" type="textbox" value="">-->
      {{#dateInput}}DECLAR.DECLARBODY.DATE_FORMATION{{{}}}{{/dateInput}}
      </td>
      <td></td> 
    </tr>
    
  </tbody>
</table>
<table id="tableT1" style="table-layout: auto; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1050px">
        <thead>   
        <tr>
                <td width="50px" align="center" class="no-print"></td>
                <td align="center" width="50px">No з/п</td>
                <td align="center" width="100px">Унікальний номер листка непрацездатності</td>
                <td align="center" width="100px">Кількість днів, що підлягають оплаті (всього)</td>
                <td align="center" width="100px">Кількість днів, що підлягають оплаті (у т. ч. за рахунок коштів Фонду) </td>
                <td align="center" width="100px">Сума (в гривнях з копійками) (всього)</td>
                <td align="center" width="100px">Сума (в гривнях з копійками) (у т. ч. за рахунок коштів Фонду)</td>
                <td align="center" width="100px">В тому числі за пільгою постраждалим на ЧАЕС за рахунок коштів Фонду (днів)</td>
                <td align="center" width="100px">В тому числі за пільгою постраждалим на ЧАЕС за рахунок коштів Фонду (в гривнях з копійками)</td>
                <td align="center" width="100px">Номер посвідчення (ЧАЕС)</td>
                <td align="center" width="100px">Дата направлення на МСЕК (за наявності)</td>
                <td align="center" width="100px">Пільга непрацездатної особи</td>
                <td align="center" width="100px">Причина розбіжності суми</td>
                <td align="center" width="100px">Причина розбіжності суми (інша)</td>
              
            </tr>
            </thead>
            <tbody id="Process">
                {{#generatorRows}}T1{{{}}}{{/generatorRows}}
            </tbody>
</table>

<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; font-size: 14px; border-collapse: collapse;  width: 1050px;" cellspacing="0" cellpadding="0px" width="1050px">
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
      <td>Відповідальний</td>
      <td>&nbsp;</td>
      <td>(підпис)</td>
      <td>&nbsp;</td>
      <td>(прізвище, ім'я, по батькові)</td>
      <td>
      <!--<input class="edtCss" id="BOOKKEEPER" lz-maxoccurs="1" lz-minoccurs="0" lz-nillable="true" lz-type="xs:string" type="textbox" value="">-->
        {{#textInput}}DECLAR.DECLARBODY.D1_PERSON{{{}}}{{/textInput}}
      </td>
    </tr>
  </tbody>
</table>
`
