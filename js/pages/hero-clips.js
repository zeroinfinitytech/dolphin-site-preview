/* Hero clips (sweep v8.16, 2026-10-30): the ten city clips of the home hero, in order, grouped by country (UK, USA, Australia, New Zealand), and the text of
   their overlay in the five site languages (EN, NE, ES, KO, ZH; same order as js/core/i18n.js). Used by heroVideo() in js/home-v8.js.
   Files: img/video/h/<id>.webm (desktop, VP9), <id>.mp4 (desktop fallback), <id>-m.mp4 (phones <= 700 px), <id>-poster.webp, <id>-poster-m.webp.
   Sources and licences: img/CREDITS.md. Text is plain and factual: a place, one short sentence about what is on screen, no ranking, no number.
   Premium set 2026-11-01 (user: "modern premium videos of international cities and universities"): six 10 s clips, one or more per destination
   incl. Canada (London, New York, Columbia University, Toronto, Sydney, Queenstown); sources and licences in img/video/h/SOURCES.md.
   au-sydney and nz-queenstown-rem left the home rotation; their files stay (videos.html, server/cms-seed.json). Earlier: premium pass 2026-10-30: London, Boston, San Francisco, Melbourne and Queenstown replaced (old files kept in img/video/h/). Translations of the new
   lines (NE, ES, KO, ZH) are machine-drafted and still need a native check; the NE/KO/ZH place names Marin Headlands, Remarkables and Wakatipu are transliterations. */
(function(){
var DX=window.DX||(window.DX={});
var C={ /* country: slug (country.html?c=), name per language */
 uk:{s:'united-kingdom',n:['United Kingdom','बेलायत','Reino Unido','영국','英国'],x:['Explore United Kingdom','बेलायत हेर्नुहोस्','Explorar Reino Unido','영국 둘러보기','探索英国']},
 us:{s:'usa',n:['United States','संयुक्त राज्य अमेरिका','Estados Unidos','미국','美国'],x:['Explore the USA','अमेरिका हेर्नुहोस्','Explorar EE. UU.','미국 둘러보기','探索美国']},
 au:{s:'australia',n:['Australia','अष्ट्रेलिया','Australia','호주','澳大利亚'],x:['Explore Australia','अष्ट्रेलिया हेर्नुहोस्','Explorar Australia','호주 둘러보기','探索澳大利亚']},
 ca:{s:'canada',n:['Canada','क्यानडा','Canadá','캐나다','加拿大'],x:['Explore Canada','क्यानडा हेर्नुहोस्','Explorar Canadá','캐나다 둘러보기','探索加拿大']},
 nz:{s:'new-zealand',n:['New Zealand','न्युजिल्यान्ड','Nueva Zelanda','뉴질랜드','新西兰'],x:['Explore New Zealand','न्युजिल्यान्ड हेर्नुहोस्','Explorar Nueva Zelanda','뉴질랜드 둘러보기','探索新西兰']}
};
DX.heroClips=[
 {id:'uk-london-thames',c:C.uk,p:['London','लन्डन','Londres','런던','伦敦'],t:['Central London and the River Thames on a clear day.','सफा दिनमा मध्य लन्डन र टेम्स नदी।','El centro de Londres y el río Támesis en un día despejado.','맑은 날의 런던 중심부와 템스 강.','晴天里的伦敦市中心与泰晤士河。']},
 {id:'us-newyork-lower',c:C.us,p:['New York','न्यूयोर्क','Nueva York','뉴욕','纽约'],t:['Lower Manhattan in golden evening light.','साँझको सुनौलो उज्यालोमा लोअर म्यानह्याटन।','El bajo Manhattan bajo la luz dorada de la tarde.','황금빛 저녁 햇살 속의 로어 맨해튼.','金色暮光中的曼哈顿下城。']},
 {id:'us-columbia-butler',c:C.us,p:['New York','न्यूयोर्क','Nueva York','뉴욕','纽约'],t:['Butler Library at Columbia University.','कोलम्बिया विश्वविद्यालयको बटलर पुस्तकालय।','La Biblioteca Butler de la Universidad de Columbia.','컬럼비아 대학교의 버틀러 도서관.','哥伦比亚大学的巴特勒图书馆。']},
 {id:'ca-toronto',c:C.ca,p:['Toronto, Ontario','टोरन्टो, ओन्टारियो','Toronto, Ontario','토론토, 온타리오','多伦多，安大略省'],t:['The downtown skyline and the CN Tower on a clear day.','सफा दिनमा डाउनटाउनको आकाशरेखा र सीएन टावर।','El horizonte del centro y la Torre CN en un día despejado.','맑은 날의 도심 스카이라인과 CN 타워.','晴天里的市中心天际线与加拿大国家电视塔。']},
 {id:'au-sydney-opera',c:C.au,p:['Sydney, New South Wales','सिड्नी, न्यू साउथ वेल्स','Sídney, Nueva Gales del Sur','시드니, 뉴사우스웨일스','悉尼，新南威尔士州'],t:['The Opera House on Sydney Harbour.','सिड्नी बन्दरगाहमा ओपेरा हाउस।','La Ópera en la bahía de Sídney.','시드니 항구의 오페라 하우스.','悉尼港畔的歌剧院。']},
 {id:'nz-queenstown-lake',c:C.nz,p:['Queenstown, Otago','क्विन्सटाउन, ओटागो','Queenstown, Otago','퀸스타운, 오타고','皇后镇，奥塔哥'],t:['Lake Wakatipu below the Remarkables.','रिमार्केबल्स पर्वतमालामुनि वाकाटिपु ताल।','El lago Wakatipu bajo los Remarkables.','리마커블스산맥 아래의 와카티푸 호수.','卓越山脉下的瓦卡蒂普湖。']}
];
})();
