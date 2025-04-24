module.exports = `
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr align="center">
            <td><b>Таблиця 7. Наявність підстав для обліку стажу окремим категоріям осіб відповідно до законодавства</b></td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td width="30%">1. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків/серія (за наявності) та/або номер паспорта страхувальника*</td>
            <td width="10%">
                <!--<input id="HTIN" lz-type="DGHTINJ" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.HTIN####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
            <td width="50%">2. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків /серія (за наявності) та/або номер паспорта ліквідованого страхувальника* (заповнюється у разі подання звіту правонаступником)</td>
            <td width="10%">
                <!--<input id="HTIN1" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.HTIN1####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td class="td_box">
                <!--<input id="HNAME" lz-type="DGHNAME" style="width:100%;" value="">-->
                {{#textInput}}DECLAR.DECLARBODY.HNAME####{"style": "font-weight: bold;"}{{{}}}{{/textInput}}
            </td>
        </tr>
        <tr>
            <td align="center">(найменування страхувальника) </td>
        </tr>
    </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
    <tbody>
        <tr>
            <td width="20%">3. Звіт за місяць</td>
            <td class="td_box" width="5%">
                <!--<input id="HZM" lz-type="DGMonth" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.HZM{{{}}}{{/intInput}}
            </td>
            <td align="right" width="10%">pік</td>
            <td class="td_box" width="5%">
                <!--<input id="HZY" lz-type="DGYear" type="textbox" value="">-->
                {{#intInput}}DECLAR.DECLARBODY.HZY{{{}}}{{/intInput}}
            </td>
            <td align="right" width="10%">4. Тип</td>
            <td align="right" width="10%">початкова    </td>
            <td class="td_box" width="5%">
                <!--<input id="HZB" lz-choice="HZS,HZD" lz-type="DGchk" type="textbox" value="">-->
                {{#booleanInput}}DECLAR.DECLARBODY.HZB{{{}}}{{/booleanInput}}
            </td>
            <td align="right" width="10%">скасовуюча    </td>
            <td class="td_box" width="5%">
                <!--<input id="HZS" lz-choice="HZB,HZD" lz-type="DGchk" type="textbox" value="">-->
                {{#booleanInput}}DECLAR.DECLARBODY.HZS{{{}}}{{/booleanInput}}
            </td>
            <td align="right" width="10%">додаткова    </td>
            <td class="td_box" width="5%">
                <!--<input id="HZD" lz-choice="HZB,HZD" lz-type="DGchk" type="textbox" value="">-->
                {{#booleanInput}}DECLAR.DECLARBODY.HZD{{{}}}{{/booleanInput}}
            </td>
        </tr>
    </tbody>
</table>
<br>
<table id="table" style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse; border: 1px solid black;" border="1" cellspacing="0" cellpadding="0px" bordercolor="black" width="1485px">
  <thead>
    <tr>
      <td align="center" rowspan="2" width="2%" class="no-print">&nbsp;</td>
      <td align="center" rowspan="2" width="2%">5. № з/п  </td>
      <td align="center" rowspan="2" width="4%">6. Гро-<br>мадя-<br>нин<br> Украї-<br>ни</td>
      <td align="center" colspan="3" width="18%">7. Реєстраційний номер облікової картки платника податків або серія (за наявності) та/або номер паспорта за формою БКNNХХХХХХ / ПХХХХХХХХХ ЗО *</td>
	  <td align="center" colspan="3" width="16%">8. Код підстави для обліку спецстажу </td>
 	  <td align="center" width="8%">10. Початок періоду</td>
	  <td align="center" width="12%">12. Кількість днів</td>
	  <td align="center" colspan="2" width="13%">13. Кількість годин, хвилин</td>
	  <td align="center" width="20%">15. № наказу про проведення атестації робочого місця</td>	  
      <td align="center" rowspan="2" width="5%">17. Ознака/сезон</td>
    </tr>
    <tr>
	  <td align="center" colspan="6">9. Прізвище, ім’я, по батькові ЗО</td>  
	  <td align="center">11. Кінець періоду</td>  
	  <td align="center" colspan="3">14. Норма тривалості роботи для її зарахування за повний місяць спецстажу (дні або години/хвилини) </td>
	  <td align="center">16. Дата наказу про проведення атестації робочого місця</td>
    </tr>
  </thead>
  <tbody id="Process">
    {{#generatorRows}}T1{{{}}}{{/generatorRows}}
  </tbody>
</table>
<br>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1485px">
  <tbody>
  <tr>
    <td>* Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією та/або номером паспорта зазначаються, серія (за наявності) та номер БКNNXXXXXX, де БК -
	константа, що вказує на реєстрацію за паспортними даними; NN - дві українські літери серії паспорта (верхній регістр); XXXXXX - шість цифр номера паспорта (з ведучими нулями) або
	ПХХХХХХХХХ, де П - константа, що вказує на реєстрацію за паспортними даними; ХХХХХХХХХ – дев’ять цифр номера паспорта, що у формі пластикової картки.</td>
  </tr>
  </tbody>
</table>
<table style="table-layout: fixed; margin-left: 15px; font-family: TimesNewRoman; border-collapse: collapse;" cellspacing="0" cellpadding="0px" width="1050px">
   <tbody>
      <tr>
         <td width="85%">18. Дата формування у страхувальника:</td>
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
      <td width="15%">19. Керівник</td>
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
      <td>(податковий  номер /серія (за наявності) та/або номер паспорта*)</td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(підпис)</font>
      </td>
      <td>&nbsp;</td>
      <td align="center">
        <font size="-1">(ініціали та прізвище)</font>
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
      <td>20. Головний бухгалтер</td>
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
      <td>(податковий  номер /серія (за наявності) та/або номер паспорта*)</td>
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
