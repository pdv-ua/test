module.exports = `
<!--%pageOrientation:landscape-->
<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body><table border="0" width="100%">
<tbody><tr align="center">
<td>
<b>Таблиця 8. Відомості про осіб, які доглядають за дитиною до досягнення нею трирічного віку  та відповідно 
до закону отримують допомогу по догляду за дитиною до досягнення нею трирічного віку та/або при народженні дитини,  
при усиновленні дитини, та осіб із числа непрацюючих працездатних батьків, усиновителів, опікунів, піклувальників, 
які фактично здійснюють догляд за дитиною з інвалідністю, а також непрацюючих працездатних осіб, які здійснюють 
догляд за особою з інвалідністю I групи або за особою похилого віку, яка за висновком медичного закладу потребує 
постійного стороннього догляду або досягла 80-річного віку, якщо такі непрацюючі працездатні особи отримують допомогу, 
надбавку або компенсацію відповідно до законодавства, та нарахування сум єдиного внеску за патронатних вихователів, 
батьків-вихователів дитячих будинків сімейного типу, прийомних батьків, якщо вони отримують грошове забезпечення 
відповідно до законодавства</b>
</td>
</tr>
<tr align="center">
<td>(заповнюється районними (міськими) управліннями праці та соціального захисту населення)</td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td width="20%">1. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків /серія (за наявності)  
та/або  номер паспорта страхувальника* </td>
<td class="td_box" width="10%">
<input id="HTIN" lz-type="DGHTINJ" type="textbox" value="">
</td>
<td align="right" width="35%">2. Код за ЄДРПОУ або реєстраційний номер облікової картки платника податків /серія
 (за наявності)  та/або  номер паспорта ліквідованого страхувальника* (заповнюється у разі подання звіту 
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
<table border="1" bordercolor="black" cellspacing="0" width="120%">
<thead>
<tr>
<td align="center" rowspan="2" width="5%">  №  з/п  </td>
<td align="center" rowspan="2" width="5%"> 6. Громадянин України   <br>          (1-так,             0-ні) </td>
<td align="center" rowspan="2" width="10%"> 7. Податковий номер або серія та/або  номер паспорта за формою
 БКNNХХХХХХ/ПХХХХХХХХХ ЗО *</td>
<td align="center" rowspan="2" width="15%"> 8. Прізвище  <br>        Iм'я     <br>		По батькові  </td>
<td align="center" rowspan="2" width="5%"> 9.Код категорії ЗО  </td>
<td align="center" colspan="2"> 10.  Дані про період отримання грошового забезпечення/    допомоги (компенсації) 	</td>
<td align="center" rowspan="2" width="5%"> 13. Код типу нарахувань** </td>
<td align="center" rowspan="2" width="10%"> 14. Місяць та рік, за який проведено нарахування  </td>
<td align="center" rowspan="2" width="10%"> 15.   Загальна сума нарахованого грошового забезпечення/допомоги/   
компенсації/мінімальний розмір заробітної плати, встановлений законодавством (усього з початку звітного місяця)
<br>       (грн. коп.)                  </td>
<td align="center" rowspan="2" width="10%"> 16.  Сума нарахованого грошового забезпечення  у  межах 
максимальної величини/допомоги/ надбавки/компенсації/мінімальний розмір заробітної плати, встановлений законодавством, 
на яку нараховується єдиний внесок <br>       (грн. коп.)     </td>
<td align="center" rowspan="2" width="10%"> 17. Сума нарахованого єдиного  внеску <br>       (грн. коп.) </td>
</tr>
<tr>
<td align="center" width="5%"> 11. Дата початку </td>
<td align="center" width="5%"> 12. Дата закінчення    </td>
</tr>
</thead>
<tbody id="Process">
<tr>
<td align="center"> 5 </td>
<td align="center"> 6 </td>
<td align="center"> 7 </td>
<td align="center"> 8 </td>
<td align="center"> 9 </td>
<td align="center"> 11 </td>
<td align="center"> 12 </td>
<td align="center"> 13 </td>
<td align="center"> 14 </td>
<td align="center"> 15 </td>
<td align="center"> 16 </td>
<td align="center"> 17 </td>
</tr>
<tr align="center" id="StretchTable" rownum="1">
<td>
<span id="spRownum">1</span>
</td>
<td>
<input rownum="1" id="T1RXXXXG6" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="OznColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG7S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="NumZOColumn" type="textbox" value="" lz-ref-id="PERSONAL_EMPLOYEE" lz-ref-link="T1RXXXXG7S:ipn,T1RXXXXG81S:nameLast,T1RXXXXG82S:nameFirst,T1RXXXXG83S:nameMiddle" lz-ref-type="personal">
</td>
<td>
<input rownum="1" id="T1RXXXXG81S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="StrColumn" type="textbox" value="">
<br>
<input rownum="1" id="T1RXXXXG82S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="StrColumn" type="textbox" value="">
<br>
<input rownum="1" id="T1RXXXXG83S" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="StrColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG9" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="I2inomColumn" type="textbox" value="" lz-ref-id="031" lz-ref-link="T1RXXXXG9:alias" lz-ref-type="common">
</td>
<td>
<input rownum="1" id="T1RXXXXG11" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="DMColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG12" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="DMColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG13" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="KvColumn" type="textbox" value="" lz-ref-id="035" lz-ref-link="T1RXXXXG13:alias" lz-ref-type="common">
</td>
<td>
<input rownum="1" descr_eq="" expr_eq="(^T1RXXXXG7S!=&#39;&#39;)?^HZM:&#39;&#39;" id="T1RXXXXG141" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="MonthColumn" type="textbox" value=""> .
			<input rownum="1" descr_eq="" expr_eq="(^T1RXXXXG7S!=&#39;&#39;)?^HZY:&#39;&#39;" id="T1RXXXXG142" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="YearColumn" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG15" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="Decimal2Column" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG16" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="Decimal2Column" type="textbox" value="">
</td>
<td>
<input rownum="1" id="T1RXXXXG17" lz-maxoccurs="999999" lz-minoccurs="0" lz-nillable="true" lz-type="Decimal2Column" type="textbox" value="">
</td>
</tr>
</tbody>
<tbody><tr>
<td colspan="9"> Усього</td>
<td width="10%">
<input descr_eq="Усього 15 = сума по гр.15" expr_eq="SUM(^T1RXXXXG15)" id="R01G15" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td width="10%">
<input descr_eq="Усього 16 = сума по гр.16" expr_eq="SUM(^T1RXXXXG16)" id="R01G16" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
<td width="10%">
<input descr_eq="Усього 17 = сума по гр.17" expr_eq="SUM(^T1RXXXXG17)" id="R01G17" lz-minoccurs="0" lz-nillable="true" lz-type="DGdecimal2" type="textbox" value="">
</td>
</tr>
</tbody></table>
<br>
<table border="0" width="100%">
<tbody><tr>
<td>* Для фізичних осіб, які мають відмітку в паспорті про право здійснювати будь-які платежі за серією та/або 
номером паспорта зазначаються, серія та номер БКNNXXXXXX, де БК - константа, що вказує на реєстрацію 
за паспортними даними; NN - дві українські літери серії паспорта (верхній регістр); XXXXXX - шість цифр номера паспорта 
(з ведучими нулями) або ПХХХХХХХХХ, де П - константа, що вказує на реєстрацію за паспортними даними;
 ХХХХХХХХХ – дев’ять цифр номера паспорта , що у формі пластикової картки.</td>
</tr>
<tr>
<td>** Код типу нарахувань: </td>
</tr>
<tr>
<td>1 - сума нарахованого грошового забезпечення  /допомоги/ компенсації/мінімальний розмір заробітної плати, 
встановлений законодавством,  на яку за результатами проведеної  перевірки органом Пенсійного фонду України 
донараховано суму єдиного внеску або суму внесків на загальнообов'язкове державне пенсійне страхування за період 
до 01 січня 2011 року;</td>
</tr>
<tr>
<td>2 - сума нарахованого грошового забезпечення/допомоги/надбавки/ компенсації/мінімальний розмір 
заробітної плати, встановлений законодавством, на яку за результатами проведеної перевірки органом Пенсійного фонду 
України зменшено зайво нараховану суму єдиного внеску або суму внесків на загальнообов'язкове державне пенсійне 
страхування за період до 01 січня 2011 року;</td>
</tr>
<tr>
<td>3 - сума нарахованого грошового забезпечення/допомоги/ компенсації/мінімальний розмір заробітної плати, 
встановлений законодавством,  на яку страхувальником самостійно донараховано суму єдиного внеску або суму 
внесків на загальнообов'язкове державне пенсійне страхування за період до 01 січня 2011 року;</td>
</tr>
<tr>
<td>4 - сума нарахованого грошового забезпечення/допомоги/надбавки/ компенсації/мінімальний розмір заробітної 
плати, встановлений законодавством, на яку страхувальником самостійно зменшено зайво нараховану суму єдиного 
внеску або суму внесків на загальнообов'язкове державне пенсійне страхування за період до 01 січня 2011 року.</td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td align="right" width="35%">18. Дата формування у страхувальника: </td>
<td align="center" class="td_box" width="10%">
<input id="HFILL" lz-type="DGDate" type="textbox" value="">
</td>
</tr>
</tbody></table>
<table border="0" width="100%">
<tbody><tr>
<td width="15%">19. Керівник  </td>
<td width="5%">&nbsp;</td>
<td class="td_box" width="15%">
<input id="HKBOS" lz-type="DGLong" type="textbox" value="">
</td>
<td width="5%">&nbsp;</td>
<td class="td_unln" width="10%">&nbsp;</td>
<td width="5%">&nbsp;</td>
<td class="td_box" width="45%">
<input id="HBOS" lz-type="DGHBOS" style="width:100%;" value="">
</td>
</tr>
<tr>
<td>&nbsp;</td>
<td>&nbsp;</td>
<td>(податковий  номер або серія (за наявності)  та/або  номер паспорта*) </td>
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
<td>(податковий  номер або серія (за наявності)  та/або  номер паспорта*) </td>
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
