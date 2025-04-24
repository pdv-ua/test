module.exports = `
<!--%pageOrientation:landscape-->
<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body><table border="0" width="100%">
<tbody><tr align="center">
<td>
<b>Таблиця 9. Відомості про осіб, які проходять строкову  військову службу </b>
</td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td width="15%">1. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків /серія 
(за наявності) та/або  номер паспорта страхувальника*</td>
<td class="td_box" width="10%">
<input id="HTIN" lz-type="DGHTINJ" type="textbox" value="">
</td>
<td align="right" width="25%">2. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків 
/серія (за наявності) та/або  номер паспорта ліквідованого страхувальника* (заповнюється у разі подання звіту 
правонаступником)</td>
<td class="td_box" width="10%">
<input id="HTIN1" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">
</td>
</tr>
</tbody></table>
<table border="0" cellspacing="4" width="100%">
<tbody><tr>
<td class="td_box">
<input id="HNAME" lz-type="DGHNAME" style="width:100%;" value="">
</td>
</tr>
<tr>
<td align="center">(найменування страхувальника) </td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td width="20%">3. Звітний місяць</td>
<td class="td_box" width="5%">
<input id="HZM" lz-type="DGMonth" type="textbox" value="">
</td>
<td align="right" width="10%">pік</td>
<td class="td_box" width="5%">
<input id="HZY" lz-type="DGYear" type="textbox" value="">
</td>
<td align="right" width="10%">4. Тип</td>
<td align="right" width="10%">початкова    </td>
<td class="td_box" width="5%">
<input id="HZB" lz-choice="HZS" lz-type="DGchk" type="textbox" value="">
</td>
<td align="right" width="10%">скасовуюча    </td>
<td class="td_box" width="5%">
<input id="HZS" lz-choice="HZB" lz-type="DGchk" type="textbox" value="">
</td>
</tr>
</tbody></table>
<br>
<table border="1" bordercolor="black" cellspacing="0" width="100%">
<thead>
<tr>
<td align="center" rowspan="2" width="5%">  №  з/п  </td>
<td align="center" rowspan="2" width="10%"> 6. Реєстраційний номер облікової картки платника податків або серія та/або 
 номер паспорта за формою БКNNХХХХХХ/ПХХХХХХХХХ ЗО *</td>
<td align="center" rowspan="2" width="15%"> 7. Прізвище      <br>  Iм'я		<br> По батькові  </td>
<td align="center" rowspan="2" width="5%"> 8. Код категорії ЗО  </td>
<td align="center" colspan="2"> 9.  Дані про період строкової служби у звітному місяці  </td>
<td align="center" rowspan="2" width="10%"> 12. Місяць та рік, за який проведено нарахування </td>
<td align="center" rowspan="2" width="10%"> 13.  Грошове забезпечення (але не менше мінімального розміру 
заробітної плати, встановленого законодавством)<br>       (грн. коп.)</td>
<td align="center" rowspan="2" width="10%"> 14. Сума  нарахованого єдиного внеску <br>       (грн. коп.) </td>
</tr>
<tr>
<td align="center" width="5%"> 10. Дата початку  </td>
<td align="center" width="5%"> 11. Дата закінчення  </td>
</tr>
</thead>
<tbody id="Process">
<tr>
<td align="center"> 5 </td>
<td align="center"> 6 </td>
<td align="center"> 7 </td>
<td align="center"> 8 </td>
<td align="center"> 10 </td>
<td align="center"> 11 </td>
<td align="center"> 12 </td>
<td align="center"> 13 </td>
<td align="center"> 14 </td>
</tr>
<tr align="center" id="StretchTable" rownum="1">
<td>
<span id="spRownum">1</span>
</td>
<td>
<input rownum="1" id="T1RXXXXG6S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="NumZOColumn" type="textbox" value="" lz-ref-id="PERSONAL_EMPLOYEE" lz-ref-link="T1RXXXXG6S:ipn,T1RXXXXG71S:nameLast,T1RXXXXG72S:nameFirst,T1RXXXXG73S:nameMiddle" lz-ref-type="personal">
</td>
<td>
<input rownum="1" id="T1RXXXXG71S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="StrColumn" type="textbox" value="">
<br>
<input rownum="1" id="T1RXXXXG72S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="StrColumn" type="textbox" value="">
<br>
<input rownum="1" id="T1RXXXXG73S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="StrColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG8" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="I2inomColumn" type="textbox" value="" lz-ref-id="031" lz-ref-link="T1RXXXXG8:alias" lz-ref-type="common">
</td>
<td>
<input rownum="1" id="T1RXXXXG10" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="DMColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG11" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="DMColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" descr_eq="" expr_eq="(^T1RXXXXG6S!=&#39;&#39;)?^HZM:&#39;&#39;" id="T1RXXXXG121" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="MonthColumn" type="textbox" value=""> .
			 <input rownum="1" descr_eq="" expr_eq="(^T1RXXXXG6S!=&#39;&#39;)?^HZY:&#39;&#39;" id="T1RXXXXG122" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="YearColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" descr_ge="Грошове забезпечення (але не менше мінімального розміру заробітної плати, встановленого законодавством (з 01.01.2018 - 3723 грн.)" expr_ge="((^T1RXXXXG122&gt;=2018)?3723:0)" id="T1RXXXXG13" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="Decimal2Column" type="textbox" value="">
</td>
<td>
<input rownum="1" descr_eq="Сума  нарахованого єдиного внеску = гр.13 *22%" expr_eq="((^T1RXXXXG122&gt;=2016)?^T1RXXXXG13*22/100:^T1RXXXXG14)" id="T1RXXXXG14" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="Decimal2Column" type="textbox" value="">
</td>
</tr>
</tbody>
<tbody><tr>
<td colspan="7"> Усього</td>
<td width="10%">
<input descr_eq=" Разом за аркушем документів графа 13 = сума по гр.13" expr_eq="SUM(^T1RXXXXG13)" id="R01G13" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td width="10%">
<input descr_eq=" Разом за аркушем документів графа 14 = сума по гр.14" expr_eq="SUM(^T1RXXXXG14)" id="R01G14" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
</tbody></table>
<br>
<table border="0" width="100%">
<tbody><tr>
<td>*  Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією та/або 
номером паспорта, зазначаються: серія (за наявності) та номер БКNNXXXXXX, де БК - константа, що вказує на реєстрацію 
за паспортними даними; NN - дві українські літери серії паспорта (верхній регістр); XXXXXX - шість цифр номера паспорта
 (з ведучими нулями) або ПХХХХХХХХХ, де П - константа, що вказує на реєстрацію за паспортними даними; 
ХХХХХХХХХ – дев’ять цифр номера паспорта, що у формі пластикової картки.</td>
</tr>
</tbody></table>
<br>
<table border="0" width="50%">
<tbody><tr>
<td width="35%">15. Дата формування у страхувальника: </td>
<td align="center" class="td_box" width="10%">
<input id="HFILL" lz-type="DGDate" type="textbox" value="">
</td>
</tr>
</tbody></table>
<br>
<table border="0" width="100%">
<tbody><tr>
<td width="15%">16. Керівник  </td>
<td width="5%">&nbsp;</td>
<td class="td_box" width="15%">
<input id="HKBOS" lz-type="DGLong" type="textbox" value="">
</td>
<td width="5%">&nbsp;</td>
<td class="td_unln" width="10%">&nbsp;</td>
<td width="5%">&nbsp;</td>
<td class="td_box" width="35%">
<input id="HBOS" lz-type="DGHBOS" style="width:100%;" value="">
</td>
</tr>
<tr>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>(реєстраційний номер облікової картки платника податків або серія (за наявності) та/або  номер паспорта*)  </td>
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
<td>17. Головний бухгалтер</td>
<td>&nbsp;</td>
<td class="td_box">
<input id="HKBUH" lz-minoccurs="0" lz-nillable="true" lz-type="DGLong" type="textbox" value="">
</td>
<td>&nbsp;</td>
<td class="td_unln">&nbsp;</td>
<td>&nbsp;</td>
<td class="td_box">
<input id="HBUH" lz-minoccurs="0" lz-nillable="true" lz-type="DGHBUH" style="width:100%;" value="">
</td>
</tr>
<tr>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>(реєстраційний номер облікової картки платника податків або серія (за наявності) та/або  номер паспорта*)  </td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(підпис)</font>
</td>
<td>&nbsp;</td>
<td align="center">
<font size="-1">(ініціали та прізвище)</font>
</td>
</tr>
</tbody></table>
<br>
<table width="100%">
<tbody><tr align="center">
<td>М.П. (за наявності)</td>
</tr>
</tbody></table>
</body></html>
`
