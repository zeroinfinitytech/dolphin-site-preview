/* Blog pages only (2026-10-31, user: "proper UI"). Shared by blogs.html and blog-post.html; loaded last, after photos.js and site.js.
   1. The nine real articles from dolphin.edu.np (2026-10-31; the note above POSTS lists the block types).
   2. blog-post.html: renders ?id=1..9 (no id shows article 1; an unknown id shows a friendly not-found) with textContent only. Reader features (2026-10-31,
      after the ZeroInfinity blog reader): Listen (speechSynthesis), share, reading progress, table of contents with scroll-spy, text size, print,
      previous / next, related articles.
      It runs as soon as this deferred script executes, i.e. before DOMContentLoaded, so site.js (chrome, reveals, reading holds) sees the final page.
   3. blogs.html: topic filter (aria-pressed buttons hide other topics; the count line is a polite live region). Without JS the filter bar stays
      hidden (CSS shows it under html.js) and every article is visible.
   4. Self-contained photo expansion, the same as js/page-events.js: this page does not load pages-v7.js / home-v8.js (where DX.phExpand lives). */
(function(){
 /* 2026-10-31: the nine REAL articles from the client's live site (dolphin.edu.np/blogs/, captured 2026-10-31), condensed faithfully from the originals in
    _incoming/dolphin-edu-np-2026-10-31/pages/<slug>.md (same headings and claims, shorter sentences, emoji and Unicode-bold removed). Ids run newest first.
    Figures that need a fact-check (GAPS.md D) only appear with a closing note {n} telling the reader to check current rules with a counsellor.
    mid: one photograph placed before the h2 that opens the second half of the article (column width, caption; never read aloud).
    Body blocks: {p} paragraph, {h} subheading (h2, feeds the contents list), {q} pull quote, {l:[...]} bullet list, {n} closing note. faq:[[q,a],...] renders
    as a visible "Questions and answers" section (and FAQPage structured data). by: shown author (Dolphin Education unless the original names a person).
    photo: the original's featured image (img/photos/blog-*, client's own material) except id 9, whose original image shows Shanghai (wrong country). */
 var BY='Dolphin Education';
 var POSTS={
  1:{
   date:'2026-10-02',slug:'new-zealand-student-visa-interview-preparation',
   mid:{photo:"counsel-desk-papers",pos:"50% 45%",alt:"Three people go through papers together at an office desk",cap:"Know what is in your own documents before an interview. Illustrative photograph."},
   title:'Interview Preparation for New Zealand: Complete Guide for Nepali Students',
   topic:'Visas',key:'visa',about:'preparing for a New Zealand interview',
   photo:'blog-nz-interview',pos:'50% 40%',alt:'Two women talk across a desk in a bright office, illustrative photography',
   excerpt:'How to prepare for a New Zealand student visa or admission interview: know your course, provider, finances and plans, and explain them honestly.',
   body:[
    {p:'Interview preparation matters if your education provider asks for an admission interview, or if Immigration New Zealand asks questions while it processes your student visa. Not every applicant is interviewed, but every applicant should be able to explain their own application.'},
    {p:'For Nepali students, preparing is not about memorising answers from the internet. It is about understanding your academic background, your course and university choice, your finances and your plans, and explaining them clearly and honestly.'},
    {h:'Why preparation matters'},
    {p:'Immigration New Zealand expects students to genuinely intend to study, make academic progress, attend their approved place of study and comply with their visa conditions. Preparation is not about finding the perfect answer; it is about understanding the decisions behind your application.'},
    {h:'What to know before the interview'},
    {l:['Course: its name, level, duration, subjects and why it is relevant to you','Education provider: the institution, its location and why you chose it','Academic history: your previous qualification, subjects and results','Study gap: what you did during it, if you have one','Finances: tuition, living costs and where the money comes from','Sponsor: your relationship, their occupation and their support','Career plan: how the course relates to your future','New Zealand: why it fits your study plans']},
    {h:'Your course, your provider and why New Zealand'},
    {p:'Research the course structure, major subjects, duration and learning outcomes, and be ready to say how it builds on what you studied in Nepal. If you are changing field, explain why, based on your real circumstances.'},
    {p:'When you are asked why you chose a university, or New Zealand, avoid answers that would fit any student. Connect your choice to the specific programme and to your own plans.'},
    {h:'Study gaps and finances'},
    {p:'If you have a study gap, explain truthfully when it started and ended, what you did and why you are returning to study. Never invent work or training to make an application look stronger.'},
    {p:'Know your tuition fee, who pays it, how living costs are covered, and whether a loan, a scholarship or a sponsor is involved. Immigration New Zealand may ask where funds came from, especially large or unusual deposits. It also runs a Funds Transfer Scheme that students from Nepal may be able to use; using it does not guarantee a visa.'},
    {q:'Interview preparation is not about learning a fixed script. It is about understanding your study plan and explaining it honestly.'},
    {h:'Questions you can practise'},
    {l:['Tell me about yourself.','What did you study in Nepal?','Why did you choose this course, and this university or college?','Why do you want to study in New Zealand?','What were you doing during your study gap?','Who will fund your education, and what does your sponsor do?','What are your plans after graduation?']},
    {p:'These are practice questions, not an official Immigration New Zealand list. Answer directly: first the answer, then the reason, then a supporting detail.'},
    {h:'Mistakes to avoid'},
    {p:'Do not recite memorised answers, contradict your documents, guess financial details, give false information, talk only about work, or arrive without knowing your course. Mock interviews help you practise answering unexpected follow-up questions.'},
    {h:'How Dolphin helps'},
    {p:'Dolphin Education runs interview preparation classes for student visa and university admission interviews, with coaching, mock interviews and personal feedback, alongside course selection, applications, documents and visa guidance from its New Baneshwor office.'},
    {n:'Visa requirements change over time. Check the current rules with your counsellor and on immigration.govt.nz.'}
   ],
   faq:[['Is an interview required for a New Zealand student visa?','Not every applicant has a separate interview. Immigration New Zealand assesses your application and evidence, and may ask questions, including in an interview.'],
    ['Should I memorise interview answers?','No. Understand your application and practise explaining the key information in your own words, so follow-up questions are easier.'],
    ['Can I talk about working in New Zealand?','Answer honestly. Your study plan should be genuine, and any work must follow your student visa conditions.'],
    ['What if I have a study gap?','Explain honestly what you were doing, and bring supporting evidence where it is relevant.']]
  },
  2:{
   date:'2026-07-10',slug:'post-study-work-visa-in-new-zealand',
   mid:{photo:"grad-massey",pos:"50% 40%",alt:"Graduates in gowns and mortarboards walking in a graduation procession under a blue sky",cap:"A graduation procession at Massey University, New Zealand."},
   title:'Post Study Work Visa in New Zealand 2026: Complete Guide for Nepali Students',
   topic:'Visas',key:'visa',about:'working in New Zealand after you graduate',
   photo:'blog-nz-pswv',pos:'50% 50%',alt:'The New Zealand flag flying against a blue sky',
   excerpt:'Who qualifies for New Zealand’s Post Study Work Visa, how long it lasts, when to apply, and the changes announced for late 2026.',
   body:[
    {p:'Many students choose New Zealand for the chance to work there after graduating. That promise is real, but it only pays off if you understand the rules: every year students miss deadlines, pick the wrong course level, or assume a qualification brings open work rights when it does not.'},
    {h:'The Post Study Work Visa'},
    {p:'The Post Study Work Visa (PSWV) is the main route for international graduates to stay and work in New Zealand. It is an open work visa: in most cases you can work for any employer, in any role, anywhere in the country. To qualify you generally need one of these:'},
    {l:['A degree at Level 7 or higher, studied full-time in New Zealand for at least 30 weeks','A Level 8, 9 or 10 qualification (postgraduate diploma, master’s or doctorate), studied full-time for at least 30 weeks','A Level 4 to 7 non-degree qualification, studied full-time for its whole duration and on the official list of eligible qualifications']},
    {p:'Not every diploma or certificate qualifies. If you are choosing a non-degree course, check that it is on the eligible list before you enrol, not after you graduate.'},
    {h:'How long you can stay'},
    {p:'Master’s and doctoral graduates can get the full three years. Bachelor’s graduates usually receive a visa matching the length of their study, and non-degree graduates a visa matching their study, up to the maximum for that qualification. You can only be granted a Post Study Work Visa once in your lifetime.'},
    {q:'It is far easier to plan for the visa you want at the start of your journey than to work around the one you are left with at the end.'},
    {h:'Changes announced for late 2026'},
    {p:'Immigration New Zealand has announced two changes for graduates from 16 November 2026. A new Short-Term Graduate Work Visa will give eligible graduates up to six months of open work rights, aimed at Level 5 to 7 qualifications studied full-time for at least 24 weeks.'},
    {p:'The PSWV is also being extended to graduates of a Level 7 Graduate Diploma who already hold a bachelor’s degree, from New Zealand or elsewhere, as long as the Graduate Diploma was studied full-time in New Zealand for its whole duration.'},
    {h:'Applying'},
    {p:'In most cases you apply from within New Zealand, within three months of your student visa expiring; doctoral students have up to six months. You need proof of your completed qualification, evidence of funds, and possibly medical or police certificates. If you apply before your student visa expires, you can generally keep working under your current conditions while the application is processed.'},
    {h:'Towards residence'},
    {p:'For many students the PSWV is a stepping stone. Work in a Green List occupation, or one that scores well under the Skilled Migrant Category, may lead towards residence, but this is not automatic and the policy changes often.'},
    {h:'Honest tips'},
    {l:['Choose your qualification level deliberately: a Level 7 degree or higher gives open work rights.','Keep your finances documented well before you apply.','Ask in writing whether a specific programme is currently eligible for the PSWV.','Watch the November 2026 changes if you plan a Graduate Diploma.']},
    {n:'Visa rules, funds requirements, fees and dates are as Dolphin published them in July 2026 and change often. Check the current rules with your counsellor and on immigration.govt.nz before you apply.'}
   ],
   faq:[['Can I apply for the Post Study Work Visa more than once?','No. You can only be granted one Post Study Work Visa in your lifetime, even if you later complete a higher qualification.'],
    ['Do I need a job offer to apply?','No. The standard Post Study Work Visa for degree-level graduates gives open work rights, so no job offer is needed.'],
    ['What happens if I miss the three-month window?','You risk losing eligibility, so apply as soon as your qualification is confirmed and before your student visa expires.']]
  },
  3:{
   date:'2026-07-02',slug:'best-countries-to-study-abroad-for-nepali-students',
   mid:{photo:"passport-boarding",pos:"50% 50%",alt:"A passport and boarding passes on a laptop",cap:"Passport, tickets and a plan: the last steps after choosing a country. Illustrative photograph."},
   title:'Best Countries to Study Abroad for Nepali Students in 2026',
   topic:'Destinations',key:'dest',about:'choosing a destination',
   photo:'blog-best-countries',pos:'50% 50%',alt:'Flags of many countries side by side, among them the United States and the United Kingdom',
   excerpt:'Australia, Canada, the UK, the USA and New Zealand compared for Nepali students: costs, work rights, post-study visas and which country suits which goal.',
   body:[
    {p:'The most popular destinations for Nepali students in 2026 are Australia, Canada, the United Kingdom, the United States and New Zealand. Each offers strong universities, part-time work while studying and a route to work after graduation, but they suit different budgets and goals.'},
    {h:'The five at a glance'},
    {l:['Australia: tuition about AUD 20,000 to 45,000 a year; 48 hours of work per fortnight; a 2 to 4 year post-study visa (Subclass 485)','Canada: about CAD 15,000 to 35,000 a year; 24 hours a week; up to 3 years on a Post-Graduation Work Permit','United Kingdom: about GBP 14,000 to 25,000 a year; 20 hours a week; the Graduate Route, being reduced to 18 months for applications from 1 January 2027','United States: about USD 18,000 to 65,000 a year; 20 hours a week on campus; 12 to 36 months of OPT','New Zealand: about NZD 22,000 to 35,000 a year; 25 hours a week; 1 to 3 years on a Post Study Work Visa']},
    {h:'New Zealand: the underrated choice'},
    {p:'The article calls New Zealand the most underrated destination for Nepali students: tuition is often lower than comparable Australian programmes, part-time work rose to 25 hours a week, and the visa process is clear, with a smaller pool of applicants.'},
    {h:'Australia: the most popular'},
    {p:'Australia remains the most popular choice. In January 2026 Nepal moved to Assessment Level 3, which means every document is checked more thoroughly. It is not a ban or a cap: students with genuine, traceable documents continue to be approved, but the whole file must be submitted up front.'},
    {h:'Canada, the UK and the USA'},
    {p:'Canada offers one of the clearest routes to permanent residence, through Express Entry and provincial programmes, and in 2026 master’s and PhD students at public universities are exempt from the study permit cap. The UK suits students who want a respected master’s degree in one year. The USA is strongest for funded postgraduate study in STEM, where assistantships can cover tuition, but the F-1 interview needs careful preparation.'},
    {q:'There is no single best country. The right one depends on your budget, your subject and your long-term goal.'},
    {h:'Which country suits which student'},
    {l:['Lowest total cost: New Zealand','Fastest master’s degree: the United Kingdom','Clearest residence pathway: Canada','Research and STEM funding: the United States','Largest Nepali community: Australia']},
    {h:'Making the decision'},
    {l:['Work out a real yearly budget, with a buffer.','Match your field of study to the country that rewards it.','Decide your long-term goal: residence, a career, or returning to Nepal.','Check your academic eligibility and English scores.','Understand post-study work rights in detail.','Apply to at least three institutions.']},
    {p:'Whatever the destination, genuine documents with a traceable financial history and a personal, consistent statement of purpose matter most. Start 8 to 12 months before your intake.'},
    {n:'Figures, fees and visa rules are as Dolphin published them in July 2026. They change often: check the current rules with your counsellor before you rely on them.'}
   ],
   faq:[['Which is the best country to study abroad for Nepali students in 2026?','It depends on your goals: New Zealand for the lowest cost, the UK for the fastest degree, Canada or Australia for residence pathways, and the USA for STEM research funding.'],
    ['Is Australia still accepting student visa applications from Nepal?','Yes. Assessment Level 3 means stricter document checks, not a quota or a ban.'],
    ['How early should I start?','Begin 8 to 12 months before your intended intake, to leave time for tests, documents and applications.']]
  },
  4:{
   date:'2026-06-05',slug:'intake-in-new-zealand',
   mid:{photo:"docs-clipboard",pos:"50% 50%",alt:"Signing a form on a clipboard beside a laptop",cap:"Start the application six to eight months before your intake. Illustrative photograph."},
   title:'Intakes in New Zealand',
   topic:'Courses and intakes',key:'plan',about:'choosing an intake',
   photo:'blog-nz-intakes',pos:'50% 55%',alt:'The Auckland skyline and Sky Tower across the harbour on a clear day',
   excerpt:'New Zealand’s February, July and November intakes explained: what each offers, who it suits, and when to start your application.',
   body:[
    {p:'Choosing the right intake helps you plan your studies, visa, accommodation and finances. New Zealand has three intakes, February, July and November, each with different course availability and deadlines.'},
    {h:'February intake'},
    {p:'February is the main and most popular intake, when most universities and colleges offer the widest range of courses. It suits students looking for the most course options, scholarship applicants, and anyone planning a full academic year with more internship and campus opportunities.'},
    {h:'July intake'},
    {p:'July is the second major intake, with a good range of undergraduate and postgraduate programmes and usually less competition. It suits students who missed February, need more preparation time, or are waiting for results or test scores.'},
    {h:'November intake'},
    {p:'November is a minor intake, offered only for selected programmes and institutions, mostly diploma, vocational and certificate courses. It can mean smaller classes and faster admission.'},
    {q:'The best intake depends on your course, your readiness, your budget and your goals.'},
    {h:'Universities with more than one intake'},
    {p:'Universities offering February and July intakes include the University of Auckland, the University of Otago, Victoria University of Wellington, Massey University, AUT, the University of Waikato, Lincoln University and the University of Canterbury. Always check the intake dates for your specific course.'},
    {h:'Documents and timing'},
    {l:['Academic transcripts and certificates','A valid passport','An IELTS, PTE or TOEFL score','A statement of purpose','Recommendation letters','An updated CV','Financial documents','Work experience certificates, if required']},
    {p:'Start preparing at least 6 to 8 months before your intake. Applying early gives better course availability, more scholarship and accommodation options, and less stress.'},
    {n:'Intake dates vary by institution and course. Confirm them with your counsellor.'}
   ],
   faq:[['How many intakes does New Zealand have?','Three: February, July and November.'],
    ['Which intake is best?','February is the most popular, with the widest choice of courses and scholarships. July is a good alternative if you need more time.'],
    ['Can I defer my admission to a later intake?','Many universities allow deferral, subject to their own policies and conditions.']]
  },
  5:{
   date:'2026-06-02',slug:'popular-courses-in-new-zealand-in-2026',
   mid:{photo:"students-notes",pos:"50% 45%",alt:"Two students walk and discuss notes on a university campus",cap:"Choose the course first, then the university. Illustrative photograph."},
   title:'Popular Courses in New Zealand in 2026',
   topic:'Courses and intakes',key:'plan',about:'choosing a course',
   photo:'blog-nz-courses',pos:'50% 50%',alt:'A student writes notes at a wooden desk beside a laptop, a tablet and a cup of coffee',
   excerpt:'The course areas Nepali students choose in New Zealand, from IT and engineering to nursing and hospitality, and how to pick the right one for you.',
   body:[
    {p:'Many students focus on choosing a university and overlook the course. Yet the course shapes your career: it affects your job prospects, your access to high-demand industries, internships and long-term growth.'},
    {h:'Information technology and data'},
    {p:'IT is one of the most popular fields in New Zealand, from software development and cloud computing to cybersecurity, data science and artificial intelligence. Graduates work as developers, analysts, security specialists and engineers.'},
    {h:'Engineering and construction'},
    {p:'New Zealand’s engineering programmes are practical and industry-focused, across civil, mechanical, electrical, software, environmental and mechatronics engineering. Construction management covers project planning, quantity surveying and building management.'},
    {h:'Business and management'},
    {p:'Business programmes build leadership, marketing, finance and strategy skills, with specialisations such as international business, accounting, human resources and project management. Their strength is that they open doors across many industries.'},
    {h:'Nursing and healthcare'},
    {p:'Many Nepali students choose nursing and healthcare for the profession’s stability and respect. Programmes include nursing, public health, healthcare management, medical laboratory science and physiotherapy.'},
    {h:'Hospitality, agriculture and creative arts'},
    {p:'Tourism is a key New Zealand industry, which supports hotel, tourism and event management courses. Agriculture and agribusiness draw on the country’s research-led farming, and creative programmes cover graphic design, animation, film, game design and UX design.'},
    {q:'There is no single best course for everyone. The right one depends on your background, your goals, your interests, your budget and your plans.'},
    {h:'Which course should you choose?'},
    {l:['Your academic background and strengths','The career you actually want','What you genuinely enjoy studying','The tuition and living costs your family can sustain','Whether you plan to return home or use post-study work pathways']},
    {p:'Dolphin Education counsellors look at the whole picture with you and help you find courses that fit your goals, along with IELTS and PTE preparation, SOP and document support, visa guidance and mock interviews.'},
    {n:'Job demand and work rights change over time. Check the current picture with your counsellor.'}
   ],
   faq:[['Can international students work while studying in New Zealand?','Generally yes: part-time during study and full-time during scheduled holidays, subject to visa conditions.'],
    ['Is IELTS required to study in New Zealand?','Most institutions ask for proof of English, such as IELTS or PTE; some offer alternatives depending on your background.'],
    ['Can I study in New Zealand after +2?','Yes. You can apply for undergraduate programmes after completing higher secondary education.']]
  },
  6:{
   date:'2026-05-22',slug:'top-universities-in-new-zealand',
   mid:{photo:"otago-clocktower",pos:"50% 50%",alt:"The ornate blue-stone Clocktower building of the University of Otago behind a lawn",cap:"The Clocktower building, University of Otago, Dunedin."},
   title:'Top universities in New Zealand',
   topic:'University guides',key:'uni',about:'New Zealand’s universities',
   photo:'blog-nz-top-unis',pos:'50% 50%',alt:'Auckland city and the Sky Tower seen from a green hillside',
   excerpt:'New Zealand’s eight public universities, what each is known for, indicative fees, and the scholarships international students can look for.',
   body:[
    {p:'New Zealand has eight public universities, known for quality education, cultural diversity and post-study opportunities. Choosing the right one shapes both your results and your experience.'},
    {h:'University of Auckland'},
    {p:'Established in 1883, New Zealand’s top-ranked university, with a strong global reputation and research network. Popular for engineering, business, computer science, medicine and law.'},
    {h:'University of Otago'},
    {p:'Founded in 1869, New Zealand’s oldest university, known for its research culture and for health, medical and life sciences, dentistry and law.'},
    {h:'Victoria University of Wellington'},
    {p:'Established in 1897 in the capital, strong in law, policy, international relations and the humanities, with easy access to internships and national institutions.'},
    {h:'University of Canterbury'},
    {p:'Established in 1873 in Christchurch, known for engineering, science and technology, with hands-on, industry-linked learning.'},
    {h:'Massey University'},
    {p:'Established in 1927, with campuses in Auckland, Wellington and Palmerston North; known for applied learning, agriculture, veterinary science, aviation, design and business.'},
    {h:'Auckland University of Technology'},
    {p:'Established in 2000, one of the fastest-growing universities, with industry-driven courses in business, health sciences and creative technologies.'},
    {h:'Lincoln University'},
    {p:'Established in 1978, specialising in land-based study: agriculture, environmental management and sustainability.'},
    {h:'University of Waikato'},
    {p:'Established in 1964, known for research, an internationally recognised business school, and computer science, engineering, law and environmental science.'},
    {h:'Fees and scholarships'},
    {p:'The article gave indicative annual tuition for international students of roughly NZD 26,000 to 55,000, depending on the university, the course and the level of study. Scholarships include the New Zealand Government’s Manaaki Scholarships for postgraduate study and university awards such as the University of Auckland International Student Excellence Scholarship; some cover part of the tuition, others living costs and travel too.'},
    {q:'Apply early and meet the eligibility criteria: that is the key to securing financial support.'},
    {n:'Fees and rankings are as Dolphin published them in May 2026 and change every year. Check current fees with your counsellor.'}
   ],
   faq:[['Which are the top universities in New Zealand?','The eight public universities: Auckland, Otago, Victoria University of Wellington, Canterbury, Massey, AUT, Lincoln and Waikato.'],
    ['When are the major intakes?','Usually February and July, with additional intakes for some programmes.']]
  },
  7:{
   date:'2026-05-22',slug:'top-reasons-to-study-in-new-zealand-from-nepal',
   mid:{photo:"hero-tekapo",pos:"50% 50%",alt:"Turquoise Lake Tekapo with snow-capped mountains and purple lupins",cap:"Lake Tekapo and the Southern Alps, South Island, New Zealand."},
   title:'Top 7 reasons to study in New Zealand from Nepal',
   topic:'Destinations',key:'dest',about:'why students choose New Zealand',
   photo:'blog-nz-reasons',pos:'50% 50%',alt:'The Auckland skyline reflected in still water at dusk',
   excerpt:'Recognised degrees, lower costs, work rights, post-study visas, safety and a clear visa process: why Nepali students choose New Zealand.',
   body:[
    {p:'Studying abroad has become the wish of many Nepali students, for quality education, global exposure and better careers. New Zealand is one of the fastest-growing choices.'},
    {h:'1. A recognised education system'},
    {p:'Practical learning, research and skill development, at universities such as Auckland, Otago, Massey and Victoria University of Wellington, across IT, business, healthcare, engineering and hospitality.'},
    {h:'2. Affordable tuition'},
    {p:'New Zealand is generally more cost-effective than Australia, Canada or the UK. The article gave typical tuition of NZD 20,000 to 35,000 a year for undergraduate and NZD 25,000 to 45,000 for postgraduate study.'},
    {h:'3. Work while you study'},
    {p:'Students can work up to 25 hours a week during term and full-time in the holidays.'},
    {h:'4. A high standard of living'},
    {p:'Modern cities, a clean environment and reliable healthcare and transport. Auckland, Wellington and Christchurch are popular with international students.'},
    {h:'5. Post-study work'},
    {p:'Eligible graduates can apply for a post-study work visa, up to three years after a bachelor’s or master’s degree depending on the qualification, to work in their field and build a professional network.'},
    {h:'6. Safe and peaceful'},
    {p:'Low crime, friendly communities and a multicultural society help students, and their parents, feel at ease.'},
    {h:'7. A clear admission and visa process'},
    {p:'With proper documents and genuine intentions, the process is simple and clear. The article gave typical English requirements of IELTS 6.0 (no band below 5.5) for diplomas and bachelor’s degrees, and 6.5 (no band below 6.0) for master’s degrees; requirements vary by programme.'},
    {q:'Start early, choose the right course, and take the first step with proper guidance.'},
    {h:'Why Dolphin for New Zealand'},
    {p:'Dolphin Education states that it was among the first consultancies in Nepal to introduce and officially promote Study in New Zealand. It supports students from course choice and counselling to documents, SOP guidance, IELTS and PTE classes, mock interviews and the visa.'},
    {n:'Fees, work hours and visa rules are as Dolphin published them in May 2026. Check the current rules with your counsellor.'}
   ],
   faq:[['Can Nepali students work while studying in New Zealand?','Yes: up to 25 hours a week during study and full-time in the holidays, as published in May 2026.'],
    ['Can I stay in New Zealand after graduation?','Eligible graduates can apply for a post-study work visa.'],
    ['Is New Zealand safe for international students?','New Zealand is considered one of the safest countries in the world.']]
  },
  8:{
   date:'2025-05-20',slug:'study-in-australia-trusted-study-abroad-consultant',
   mid:{photo:"au-sydney-uni",pos:"50% 50%",alt:"The sandstone Main Quadrangle building of the University of Sydney",cap:"The Main Quadrangle, University of Sydney, Australia."},by:'Saru Desar',
   title:'Study in Australia – Trusted Study Abroad Consultant',
   topic:'Destinations',key:'dest',about:'studying in Australia',
   photo:'blog-australia',pos:'50% 50%',alt:'High-rise towers along the beach on the Gold Coast, Australia',
   excerpt:'Why Nepali students choose Australia, and how Dolphin Education in New Baneshwor helps with counselling, admissions, test preparation and the visa.',
   body:[
    {p:'Australia is one of the most popular destinations for international students, with world-class universities, a multicultural environment and strong career opportunities.'},
    {h:'Why Australia'},
    {l:['Globally recognised degrees, from institutions such as the University of Melbourne, UNSW and Monash University','An English-speaking country','Work while you study: up to 48 hours per fortnight during term and full-time in the holidays','A post-study work visa to stay and work after graduation','A safe, inclusive and diverse society']},
    {h:'How Dolphin helps'},
    {l:['Free counselling and career guidance, with personal university and course recommendations','University admissions: applications, documents and interview preparation','IELTS and PTE preparation, with coaching and study materials','Visa documentation: the statement of purpose and financial documents','Pre-departure support, so you know what to expect']},
    {p:'An earlier version of this article mentioned the Genuine Temporary Entrant (GTE) requirement. Australia has replaced it with the Genuine Student (GS) requirement, and your counsellor helps you prepare the GS statement.'},
    {n:'Work hours and visa rules change. Check the current rules with your counsellor.'}
   ]
  },
  9:{
   date:'2024-07-25',slug:'the-best-universities-in-new-zealand-a-comprehensive-guide',
   mid:{photo:"nz-auckland-uni",pos:"50% 45%",alt:"The white Clock Tower building of the University of Auckland",cap:"The Clock Tower, University of Auckland."},
   title:'The Best Universities in New Zealand: A Comprehensive Guide',
   topic:'University guides',key:'uni',about:'New Zealand’s leading universities',
   photo:'a-nz-wellington',pos:'55% 52%',alt:'Wellington, New Zealand’s capital, beside its harbour, illustrative photography',
   excerpt:'Four New Zealand universities that stand out for teaching, research and student life: Auckland, Otago, Victoria University of Wellington and Canterbury.',
   body:[
    {p:'New Zealand, known for its landscapes and culture, is also home to universities with high-quality teaching, research opportunities and a welcoming environment for international students.'},
    {h:'University of Auckland'},
    {p:'In Auckland: New Zealand’s largest and highest-ranked university, placed within the top 100 in the QS World University Rankings. Known for research in engineering, medicine and the social sciences, with its main campus in the heart of the city.'},
    {h:'University of Otago'},
    {p:'In Dunedin: founded in 1869 as New Zealand’s oldest university, and consistently within the QS top 200. Strong in health sciences, the humanities and business, on a campus often called one of the most beautiful in the world.'},
    {h:'Victoria University of Wellington'},
    {p:'In the capital: among the top 250 universities in the QS rankings, known for law, the humanities and creative arts, with close ties to government and industry.'},
    {h:'University of Canterbury'},
    {p:'In Christchurch: within the QS top 300, celebrated for engineering, science and education, with strong research and industry partnerships.'},
    {n:'Rankings are as published in July 2024 and change every year. Check the latest with your counsellor.'}
   ]
  }
 };
 window.DX_BLOG=POSTS;

 function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
 function btext(b){return b.l?b.l.join(' '):String(b.p||b.h||b.q||b.n||'')}
 function words(p){var n=p.title.split(/\s+/).length;p.body.forEach(function(b){n+=btext(b).split(/\s+/).length});(p.faq||[]).forEach(function(f){n+=(f[0]+' '+f[1]).split(/\s+/).length});return n}
 var SITE='https://dolphin.edu.np/';
 function imgUrl(p){var m=(window.DX_PH||{})[p.photo],w=m?Math.min(1600,m.w):1200;return SITE+'img/photos/'+p.photo+'-'+w+'.webp'}
 function mins(p){return Math.max(1,Math.ceil(words(p)/200))}
 /* "2 min read" as two spans: i18n.js matches whole element texts, so "min read" is translated on its own and the number stays */
 function readTime(node,p){node.textContent='';node.appendChild(el('span','bl-n',String(mins(p))));node.appendChild(document.createTextNode(' '));node.appendChild(el('span',null,'min read'))}
 function lang(){return(document.documentElement.lang||'en').toLowerCase()}
 var NE_M=['जनवरी','फेब्रुअरी','मार्च','अप्रिल','मे','जुन','जुलाई','अगस्ट','सेप्टेम्बर','अक्टोबर','नोभेम्बर','डिसेम्बर'];
 function neDigits(n){return String(n).replace(/\d/g,function(d){return'०१२३४५६७८९'[d]})}
 function fmtDate(iso){try{var d=new Date(iso+'T12:00:00'),l=lang(),s=new Intl.DateTimeFormat(l==='en'?'en-GB':l,{day:'numeric',month:'long',year:'numeric'}).format(d);
  /* browsers without Nepali locale data fall back to English: write the Nepali date ourselves */
  if(l==='ne'&&!/[ऀ-ॿ]/.test(s))s=neDigits(d.getFullYear())+' '+NE_M[d.getMonth()]+' '+neDigits(d.getDate());return s}catch(e){return iso}}
 function slug(t,i){return's'+(i+1)+'-'+t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)}
 var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function hdr(){var v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr'));return isNaN(v)?82:v}
 function jump(t){var y=t.getBoundingClientRect().top+window.scrollY-hdr()-28;
  if(window.DX&&window.DX.scrollTo&&!reduce)window.DX.scrollTo(Math.max(0,y));else window.scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'})}

 /* one article card (image on top, small-caps label, serif title, meta): previous / next and the related articles share it */
 function card(id,p,label,meta){
  var a=el('a','bl-cd');a.href='blog-post.html?id='+id;
  var f=el('figure','bl-ph bl-cd-ph');f.setAttribute('aria-hidden','true');
  var im=document.createElement('img');im.dataset.ph=p.photo;im.dataset.sizes='(max-width:700px) 92vw, 420px';if(p.pos)im.dataset.pos=p.pos;im.alt='';f.appendChild(im);a.appendChild(f);
  a.appendChild(el('span','bl-k',label));a.appendChild(el('span','bl-cd-t',p.title));
  var m=el('span','bl-cd-m');m.appendChild(el('span',null,meta==='date'?fmtDate(p.date):p.topic));m.appendChild(document.createTextNode(' · '));
  var rt=el('span');readTime(rt,p);m.appendChild(rt);a.appendChild(m);return a
 }

 /* related: same topic first, then articles not already offered as previous / next, then the newest; never the open post */
 function related(id,n){var p=POSTS[id];return Object.keys(POSTS).map(Number).filter(function(k){return k!==id})
  .sort(function(a,b){var adj=function(k){return Math.abs(k-id)===1?1:0}; /* previous / next are already shown above: others first */
   return(POSTS[b].key===p.key)-(POSTS[a].key===p.key)||adj(a)-adj(b)||String(POSTS[b].date).localeCompare(String(POSTS[a].date))}).slice(0,n)}

 function notFound(){
  document.title='Article not found | Dolphin Education';
  var rb=document.createElement('meta');rb.name='robots';rb.content='noindex';document.head.appendChild(rb);
  var set=function(i,t){var e=document.getElementById(i);if(e)e.textContent=t};
  set('postTopic','Blog');set('postTitle','We could not find that article');
  set('postLead','The link may be old or mistyped. Every article is listed on the blog page.');
  ['postMeta','blTools','more'].forEach(function(i){var e=document.getElementById(i);if(e)e.hidden=true});
  var ph=document.querySelector('.bl-hd-ph');if(ph)ph.hidden=true;
  var art=document.querySelector('.bl-art');if(art)art.hidden=true;
  var nf=document.getElementById('postNf');if(nf)nf.hidden=false;
  document.documentElement.classList.add('bl-nf')
 }

 var CUR=null; /* {id,p,units} of the open article, for the reader */
 /* the article on the page: ?id=N (built-in ids, newest first) or ?slug=... (a post from the Content Manager store; built-in posts match by their slug) */
 function wanted(){var s=new URLSearchParams(location.search),q=s.get('id'),sl=s.get('slug');
  if(sl){var k=Object.keys(POSTS).filter(function(x){return POSTS[x].slug===sl})[0];return{id:k?+k:null,slug:sl}}
  var id=q==null||q===''?1:(/^\d+$/.test(q)?parseInt(q,10):NaN); /* no id: the latest article; an unknown id: not found */
  return{id:POSTS[id]?id:null,slug:POSTS[id]?POSTS[id].slug:null}}
 function renderPost(){
  var root=document.getElementById('postTitle');if(!root)return;
  var w=wanted();
  if(w.id==null){notFound();return}
  paint(POSTS[w.id],w.id,null)
 }
 /* a store photo (media object) on an <img>; site files work under / and /site/ */
 function rel(s){return window.DX&&DX.live?DX.live.relSrc(s):s}
 function mediaImg(im,m,sizes){im.removeAttribute('data-ph');im.src=rel(m.src);if(m.urls){im.srcset=Object.keys(m.urls).map(function(w){return rel(m.urls[w])+' '+w+'w'}).join(', ');im.sizes=sizes}
  if(m.width){im.width=m.width;im.height=m.height}im.decoding='async'}
 var DATE=null,dateObs=false;
 /* p: a built-in post or one converted from the store; id: its built-in id or null; nav: the store's {previous,next,related} for a store-only post */
 function paint(p,id,nav){
  var root=document.getElementById('postTitle');if(!root)return;
  /* a store post can replace the not-found view */
  document.documentElement.classList.remove('bl-nf');var nr=document.querySelector('meta[name=robots][content=noindex]');if(nr)nr.remove();
  ['postMeta','blTools','more'].forEach(function(i){var e=document.getElementById(i);if(e)e.hidden=false});
  var ph0=document.querySelector('.bl-hd-ph');if(ph0)ph0.hidden=false;var art0=document.querySelector('.bl-art');if(art0)art0.hidden=false;var nf0=document.getElementById('postNf');if(nf0)nf0.hidden=true;
  document.title=p.title+' | Dolphin Education';
  ['meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]'].forEach(function(s){var m=document.querySelector(s);if(m)m.setAttribute('content',p.excerpt)});
  ['meta[property="og:title"]','meta[name="twitter:title"]'].forEach(function(s){var m=document.querySelector(s);if(m)m.setAttribute('content',p.title)});
  root.textContent=p.title;
  var set=function(i,t){var e=document.getElementById(i);if(e)e.textContent=t};
  set('postTopic',p.topic);set('postBy',p.by||BY);set('postAbout',p.about);set('postLead',p.excerpt);
  var tm=document.getElementById('postTime');if(tm)readTime(tm,p);
  var dt=document.getElementById('postDate');DATE=p.date;
  if(dt&&p.date){dt.dateTime=p.date;dt.textContent=fmtDate(p.date);
   /* the date follows the page language (i18n.js sets <html lang>) */
   if(!dateObs){dateObs=true;new MutationObserver(function(){if(!DATE)return;var t=fmtDate(DATE);if(dt.textContent!==t)dt.textContent=t}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}}
  var im=document.getElementById('postImg');
  if(im){if(p.photo){if(im.dataset.cur!==p.photo){im.removeAttribute('srcset');im.dataset.ph=p.photo;im.dataset.cur=p.photo}if(p.pos)im.dataset.pos=p.pos}
   else if(p.cover){mediaImg(im,p.cover,'100vw');im.dataset.cur=''}
   im.alt=p.alt||''}
  /* body: every block carries data-tts (its index in the reading order: 0 is the title) so the reader can mark the one being spoken */
  var units=[{el:root,text:p.title}],heads=[];
  root.dataset.tts='0';
  var body=document.getElementById('postBody');
  if(body){
   body.textContent='';body.lang='en';
   var add=function(n,t){n.dataset.tts=String(units.length);units.push({el:n,text:t});body.appendChild(n)};
   var notes=[],nh=p.body.filter(function(b){return b.h}).length,mh=Math.ceil(nh/2),hi=0,hasImg=p.body.some(function(b){return b.img});
   /* the mid-article photo (not part of units: Listen skips it and its caption) */
   var fig=function(m,mm){var fg=el('figure','bl-midf'),fr=el('div','bl-ph bl-mid'),im=document.createElement('img');
    if(mm)mediaImg(im,mm,'(max-width:800px) 92vw, 720px');else{im.dataset.ph=m.photo;im.dataset.pos=m.pos||'50% 50%';im.dataset.sizes='(max-width:800px) 92vw, 720px'}
    im.alt=m.alt||'';fr.appendChild(im);fg.appendChild(fr);if(m.cap)fg.appendChild(el('figcaption',null,m.cap));body.appendChild(fg)};
   var midFig=function(){if(p.mid&&!hasImg)fig(p.mid)};
   p.body.forEach(function(b,i){var n;if(b.n){notes.push(b);return}
    if(b.img){fig({alt:b.alt,cap:b.cap},b.img);return}
    if(b.h){if(hi===mh&&nh>1)midFig();hi++}
    if(b.h){n=el('h2',null,b.h);n.id=slug(b.h,heads.length);n.tabIndex=-1;heads.push(n)}
    else if(b.q){n=el('blockquote','bl-pq');n.appendChild(el('p',null,b.q))}
    else if(b.l){n=el(b.o?'ol':'ul','bl-ul');b.l.forEach(function(t){n.appendChild(el('li',null,t))})}
    else n=el('p',i===0?'bl-stand':null,b.p);
    add(n,btext(b))
   });
   /* the original article's questions and answers, shown as a section of its own (the FAQPage structured data below matches it) */
   if(p.faq&&p.faq.length){var fh=el('h2',null,'Questions and answers');fh.id=slug('Questions and answers',heads.length);fh.tabIndex=-1;heads.push(fh);add(fh,'Questions and answers');
    p.faq.forEach(function(f){add(el('h3','bl-fq',f[0]),f[0]);add(el('p','bl-fa',f[1]),f[1])})}
   /* the closing 'check current rules' note always ends the article */
   notes.forEach(function(b){add(el('p','bl-note',b.n),b.n)});
  }
  var endBy=document.querySelector('.bl-end p:not(.bl-end-l)');if(endBy)endBy.textContent=p.by?'Written by '+p.by+', Dolphin Education, New Baneshwor, Kathmandu.':'Written by the Dolphin Education counselling team, New Baneshwor, Kathmandu.';
  CUR={id:id,p:p,units:units};
  toc(heads);
  /* previous / next by publication order (ids run newest first); a store-only post uses the store's own neighbours */
  var pn=document.getElementById('blPn'),more=document.getElementById('moreList');
  if(id!=null){
   if(pn){pn.textContent='';
    [[id+1,'Previous article','bl-pn-p'],[id-1,'Next article','bl-pn-n']].forEach(function(x){
     var o=POSTS[x[0]];if(!o)return;var c=card(x[0],o,x[1],'topic');c.classList.add(x[2]);pn.appendChild(c)});
    pn.classList.toggle('is-one',pn.children.length===1)}
   if(more){more.textContent='';related(id,3).forEach(function(k){var li=el('li');li.appendChild(card(k,POSTS[k],POSTS[k].topic,'date'));more.appendChild(li)})}
  }else if(nav){
   if(pn){pn.textContent='';[[nav.previous,'Previous article','bl-pn-p'],[nav.next,'Next article','bl-pn-n']].forEach(function(x){if(!x[0])return;var c=briefCard(x[0],x[1]);c.classList.add(x[2]);pn.appendChild(c)});
    pn.classList.toggle('is-one',pn.children.length===1)}
   if(more){more.textContent='';(nav.related||[]).forEach(function(r){var li=el('li');li.appendChild(briefCard(r,r.category||'Blog'));more.appendChild(li)})}
  }
  /* structured data for the article */
  var url=SITE+(p.slug?'blog-post.html?slug='+encodeURIComponent(p.slug):'blog-post.html?id='+id),ORG={'@id':SITE+'#org'},image=p.photo?imgUrl(p):p.cover?SITE+String(rel(p.cover.src)).replace(/^\//,''):SITE+'img/og/og-default.jpg';
  ['ldPost','ldFaq'].forEach(function(i){var o=document.getElementById(i);if(o)o.remove()});
  var ld=document.createElement('script');ld.type='application/ld+json';ld.id='ldPost';
  ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting','@id':url+'#post',headline:p.title,description:p.excerpt,image:image,datePublished:p.date+'T09:00:00+05:45',dateModified:p.date+'T09:00:00+05:45',
   articleSection:'Education',keywords:p.topic,wordCount:words(p),inLanguage:'en',url:url,mainEntityOfPage:{'@type':'WebPage','@id':url},
   author:p.by?{'@type':'Person',name:p.by,worksFor:ORG}:{'@type':'Organization','@id':SITE+'#org',name:'Dolphin Education',url:SITE},publisher:ORG,isPartOf:{'@type':'Blog','@id':SITE+'blogs.html#blog'}});
  document.head.appendChild(ld);
  if(p.faq&&p.faq.length){var fq=document.createElement('script');fq.type='application/ld+json';fq.id='ldFaq';
   fq.textContent=JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:p.faq.map(function(f){return{'@type':'Question',name:f[0],acceptedAnswer:{'@type':'Answer',text:f[1]}}})});document.head.appendChild(fq)}
  /* the breadcrumb's last item, the canonical link and the share image name this article */
  var cr=document.getElementById('ldCrumb');if(cr)try{var cj=JSON.parse(cr.textContent),li=cj.itemListElement[cj.itemListElement.length-1];li.name=p.title;li.item=url;cr.textContent=JSON.stringify(cj)}catch(e){}
  var cn=document.querySelector('link[rel="canonical"]');if(cn)cn.href=url;var ou=document.querySelector('meta[property="og:url"]');if(ou)ou.setAttribute('content',url);
  ['meta[property="og:image"]','meta[name="twitter:image"]'].forEach(function(s){var m=document.querySelector(s);if(m)m.setAttribute('content',image)});
  var oa=document.querySelector('meta[property="og:image:alt"]');if(oa)oa.setAttribute('content',p.alt||'');
  ['meta[property="og:image:width"]','meta[property="og:image:height"]'].forEach(function(s){var m=document.querySelector(s);if(m)m.remove()});
  var ot=document.querySelector('meta[property="og:type"]');if(ot)ot.setAttribute('content','article');
  share(p,id);
 }
 /* a card for a store post (previous / next / related of a store-only article) */
 function briefCard(b,label){var k=Object.keys(POSTS).filter(function(x){return POSTS[x].slug===b.slug||POSTS[x].title===b.title})[0];
  if(k)return card(+k,POSTS[k],label,'topic');
  var a=el('a','bl-cd');a.href='blog-post.html?slug='+encodeURIComponent(b.slug);
  var f=el('figure','bl-ph bl-cd-ph');f.setAttribute('aria-hidden','true');if(b.cover){var im=document.createElement('img');mediaImg(im,b.cover,'(max-width:700px) 92vw, 420px');im.alt='';im.loading='lazy';f.appendChild(im)}a.appendChild(f);
  a.appendChild(el('span','bl-k',label));a.appendChild(el('span','bl-cd-t',b.title));return a}

 /* ---- the Content Manager store (js/core/site-live.js, 2026-11-01): the built-in article shows first; the store's version replaces it when it differs ---- */
 var KEYS={'Visas':'visa','Destinations':'dest','University guides':'uni','Courses and intakes':'plan'};
 function fromStore(o,base){var body=[],faq=[];
  (o.body||[]).forEach(function(b){if((b.t==='heading'||b.t==='paragraph'||b.t==='quote')&&!String(b.text||'').trim())return;if(b.t==='heading')body.push({h:b.text});else if(b.t==='paragraph')body.push({p:b.text});else if(b.t==='list')body.push({l:b.items||[],o:!!b.ordered});
   else if(b.t==='quote'){if(/^note$/i.test(b.cite||''))body.push({n:b.text});else body.push({q:b.text})}else if(b.t==='faq')faq.push([b.q,b.a]);else if(b.t==='image'&&b.media)body.push({img:b.media,cap:b.caption,alt:b.alt})});
  base=base||{};var cov=o.cover,cn=cov&&cov.filename?String(cov.filename).replace(/\.[a-z0-9]+$/i,''):'',same=cn&&cn===base.photo;
  return{slug:o.slug,title:o.title,topic:o.category||base.topic||'Blog',key:KEYS[o.category]||base.key,about:base.about||String(o.category||'your plans').toLowerCase(),
   photo:same?base.photo:(cov?null:base.photo),pos:same?base.pos:null,cover:same?null:cov,alt:(cov&&cov.alt)||base.alt||'',excerpt:o.standfirst||base.excerpt||'',
   body:body.length?body:base.body||[],faq:faq.length?faq:(o.body&&o.body.length?[]:base.faq||[]),mid:base.mid,by:o.author&&o.author!==BY?o.author:null,date:String(o.published_at||base.date||'').slice(0,10)}}
 function sig(p){return JSON.stringify([p.title,p.topic,p.excerpt,p.by||'',p.date,p.photo||(p.cover&&p.cover.src)||'',(p.body||[]).map(btext).concat((p.body||[]).filter(function(b){return b.img}).map(function(b){return b.img.src})),p.faq||[]])}
 function matchPost(list,w){var base=w.id!=null?POSTS[w.id]:null,nt=function(t){return String(t||'').replace(/[‘’]/g,"'").toLowerCase().trim()};
  return list.filter(function(x){return x.slug===w.slug||(base&&x.slug===base.slug)})[0]||(base&&list.filter(function(x){return nt(x.title)===nt(base.title)})[0])||null}
 var postAsked=false;
 function livePost(b,ch){if(postAsked||(ch&&ch.indexOf('posts')<0))return;var w=wanted(),hit=matchPost((b&&b.posts)||[],w);if(!hit)return;postAsked=true;
  var L=window.DX&&DX.live?DX.live.lang:'en';
  fetch('/api/site/posts/'+encodeURIComponent(hit.slug)+'?lang='+L,{headers:{Accept:'application/json'},credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).then(function(o){if(!o)return;
   var base=w.id!=null?POSTS[w.id]:null,p=fromStore(o,base);if(base&&sig(p)===sig(base))return;
   paint(p,w.id,w.id==null?{previous:o.previous,next:o.next,related:o.related}:null);photos();
   if(window.DX_READER&&DX_READER.rebuild)DX_READER.rebuild();else listen();if(window.ScrollTrigger)window.ScrollTrigger.refresh()}).catch(function(){})}
 /* blogs.html: rows follow the store (title, standfirst, category, date); rows it no longer lists go; new posts are added by date */
 function liveList(b,ch){if(ch&&ch.indexOf('posts')<0)return;var list=document.getElementById('blList'),P=b&&b.posts;if(!list||!P||!P.length)return;
  var rowsL=[].slice.call(list.querySelectorAll('li.bl-row')),idOf=function(r){var a=r.querySelector('a.bl-a'),m=a&&a.getAttribute('href').match(/id=(\d+)/);return m?+m[1]:null},used=[];
  P.forEach(function(o){var r=rowsL.filter(function(x){if(used.indexOf(x)>-1)return false;if(x.dataset.slug)return x.dataset.slug===o.slug;var i=idOf(x);return i&&POSTS[i]&&matchPost([o],{id:i,slug:POSTS[i].slug})})[0];
   if(!r){r=el('li','bl-row');r.innerHTML='<figure class="bl-ph bl-th" aria-hidden="true"></figure><div class="bl-rm"><p class="bl-k"></p><h3><a class="bl-a"></a></h3><p class="bl-ex"></p><p class="bl-fm"><span class="bl-rt"><time></time></span><span class="bl-tl" aria-hidden="true">Read the article</span></p></div>';
    r.querySelector('a.bl-a').href='blog-post.html?slug='+encodeURIComponent(o.slug);if(o.cover){var im=document.createElement('img');mediaImg(im,o.cover,'(max-width:700px) 34vw, 260px');im.alt='';im.loading='lazy';r.querySelector('figure').appendChild(im)}
    list.appendChild(r)}
   r.dataset.slug=o.slug;used.push(r);if(KEYS[o.category])r.dataset.topic=KEYS[o.category];
   var s=function(q,v){var e=r.querySelector(q);if(e&&v&&e.textContent!==v)e.textContent=v};
   s('a.bl-a',o.title);s('.bl-ex',o.standfirst);s('.bl-k',(o.category||'Blog')+(r.classList.contains('bl-feat')?' · Latest':''));
   var t=r.querySelector('time'),d=String(o.published_at||'').slice(0,10);if(t&&d){t.setAttribute('datetime',d);t.textContent=fmtDate(d)}});
  rowsL.forEach(function(r){if(used.indexOf(r)<0)r.remove()});
  var feat=list.querySelector('.bl-feat');
  used.slice().sort(function(a,b){return String(b.querySelector('time').getAttribute('datetime')).localeCompare(String(a.querySelector('time').getAttribute('datetime')))})
   .forEach(function(r){if(r!==feat)list.appendChild(r)});
  var on=document.querySelector('.bl-filt button[aria-pressed="true"]'),f=on?on.dataset.f:'all';[].forEach.call(list.querySelectorAll('li.bl-row'),function(r){r.hidden=!(f==='all'||r.dataset.topic===f)});
  if(window.ScrollTrigger)window.ScrollTrigger.refresh()}

 /* ---- table of contents: built from the h2s, active section follows the reading line; a disclosure below 1280 px (2026-10-31: raised from 1180 so the side column never squeezes the contents list) ---- */
 var TOC={heads:[],links:[]};
 function toc(heads){
  var side=document.getElementById('blSide'),list=document.getElementById('blToc'),btn=document.getElementById('blTocBtn');
  if(!side||!list)return;
  var w=document.getElementById('blTocWrap');if(w)w.hidden=heads.length<2;
  list.textContent='';
  TOC.heads=heads;TOC.links=heads.map(function(h){var li=el('li'),a=el('a',null,h.textContent);a.href='#'+h.id;li.appendChild(a);list.appendChild(li);
   a.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();jump(h);try{history.replaceState(null,'','#'+h.id)}catch(x){}
    setTimeout(function(){h.focus({preventScroll:true})},reduce?0:600);if(btn&&btn.getAttribute('aria-expanded')==='true')btn.click()});return a});
  if(TOC.wired){spy();return}TOC.wired=true;
  if(btn)btn.addEventListener('click',function(){var o=btn.getAttribute('aria-expanded')!=='true';btn.setAttribute('aria-expanded',String(o));list.classList.toggle('is-open',o);
   var lb=btn.querySelector('.bl-tb');if(lb)lb.textContent=o?'Close':'Contents'});
  var raf=0;function spy(){raf=0;var line=hdr()+140,cur=-1,H=TOC.heads;
   for(var i=0;i<H.length;i++){if(H[i].getBoundingClientRect().top<=line)cur=i}
   TOC.links.forEach(function(a,i){if(i===cur)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})}
  TOC.spy=spy;
  addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(spy)},{passive:true});addEventListener('resize',spy);spy();
  if(location.hash){var t=document.getElementById(location.hash.slice(1));if(t&&heads.indexOf(t)>=0)setTimeout(function(){jump(t)},300)}
 }

 /* ---- reading progress across the article column, plus back to top ---- */
 function progress(){
  var bar=document.getElementById('blProg'),art=document.querySelector('.bl-art');if(!bar||!art)return;
  var raf=0;function upd(){raf=0;var r=art.getBoundingClientRect(),h=innerHeight,total=r.height-h*.6,done=-r.top+h*.4;
   var f=total>0?Math.min(1,Math.max(0,done/total)):0;bar.style.transform='scaleX('+f.toFixed(4)+')'}
  addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(upd)},{passive:true});addEventListener('resize',upd);upd();
  var top=document.getElementById('blTop');
  if(top)top.addEventListener('click',function(e){e.preventDefault();if(window.DX&&window.DX.scrollTo&&!reduce)window.DX.scrollTo(0);else scrollTo({top:0,behavior:reduce?'auto':'smooth'});
   var t=document.getElementById('postTitle');if(t){t.tabIndex=-1;setTimeout(function(){t.focus({preventScroll:true})},reduce?0:700)}});
 }

 /* ---- text size (kept per visitor) and print ---- */
 var SIZES=[.9,1,1.12,1.25];
 function textSize(){
  var body=document.getElementById('postBody'),dn=document.getElementById('blSzDn'),up=document.getElementById('blSzUp');if(!body||!dn||!up)return;
  var i=1;try{var s=parseFloat(localStorage.getItem('dx-read-size'));if(SIZES.indexOf(s)>=0)i=SIZES.indexOf(s)}catch(e){}
  function ap(){body.style.setProperty('--bl-scale',SIZES[i]);dn.disabled=i===0;up.disabled=i===SIZES.length-1;try{localStorage.setItem('dx-read-size',String(SIZES[i]))}catch(e){}}
  dn.addEventListener('click',function(){if(i>0){i--;ap()}});up.addEventListener('click',function(){if(i<SIZES.length-1){i++;ap()}});ap();
  var pr=document.getElementById('blPrint');if(pr)pr.addEventListener('click',function(){window.print()});
 }

 /* ---- sharing: native sheet where the browser has one, plus plain links; the URL is the clean article address (no hash, no extra parameters) ---- */
 var SH={};
 function share(p,id){
  var url=location.origin+location.pathname+(p.slug?'?slug='+encodeURIComponent(p.slug):'?id='+id),E=encodeURIComponent;SH.p=p;SH.url=url;
  var L={fb:'https://www.facebook.com/sharer/sharer.php?u='+E(url),wa:'https://wa.me/?text='+E(p.title+' '+url),x:'https://twitter.com/intent/tweet?text='+E(p.title)+'&url='+E(url),
   li:'https://www.linkedin.com/sharing/share-offsite/?url='+E(url),em:'mailto:?subject='+E(p.title)+'&body='+E(p.excerpt+'\n\n'+url)};
  document.querySelectorAll('[data-share]').forEach(function(a){var h=L[a.dataset.share];if(h)a.href=h});
  var note=document.getElementById('blShareNote'),cp=document.getElementById('blCopy'),tm=0;
  function say(t){if(!note)return;note.textContent=t;clearTimeout(tm);tm=setTimeout(function(){note.textContent=''},2400)}
  if(SH.wired)return;SH.wired=true;
  if(cp)cp.addEventListener('click',function(){var url=SH.url;
   var ok=function(){cp.classList.add('is-done');setTimeout(function(){cp.classList.remove('is-done')},2000);say('Link copied')};
   var fb=function(){try{var t=el('textarea');t.value=url;t.setAttribute('readonly','');t.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(t);t.select();var r=document.execCommand('copy');t.remove();if(r)ok();else say('Copy the address bar')}catch(e){say('Copy the address bar')}};
   if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(url).then(ok,fb);else fb()});
  var nb=document.getElementById('blShare'),row=document.getElementById('share');
  if(nb)nb.addEventListener('click',function(){var p=SH.p,url=SH.url;
   if(navigator.share){navigator.share({title:p.title,text:p.excerpt,url:url}).catch(function(){});return}
   if(row){jump(row);var f=row.querySelector('a,button');if(f)setTimeout(function(){f.focus({preventScroll:true})},reduce?0:700)}});
  if(navigator.share&&nb)nb.dataset.native='1';
 }

 /* ---- Listen: the article read aloud with the browser's speechSynthesis (after js/readerController.js on the ZeroInfinity site).
    The text is cut into sentence-sized pieces and ONE piece is spoken at a time (Chrome silently stops long utterances after ~15 s); a watchdog moves on if a
    piece never reports its end; Android has no real pause, so there pause stops and resume says the piece again. Nothing is spoken until Listen is pressed,
    and speech stops when the page is left. Hidden entirely when the browser has no speechSynthesis. ---- */
 function listen(){
  var box=document.getElementById('blListen');if(!box||!CUR)return;
  var synth=('speechSynthesis' in window&&'SpeechSynthesisUtterance' in window)?window.speechSynthesis:null;
  if(!synth){box.hidden=true;return}
  var SOFT=/android/i.test(navigator.userAgent),SPEEDS=[.8,1,1.25,1.5];
  var play=document.getElementById('blPlay'),stop=document.getElementById('blStop'),sp=document.getElementById('blSpeed'),live=document.getElementById('blLive');
  var speed=1;try{var v=parseFloat(localStorage.getItem('dx-read-speed'));if(SPEEDS.indexOf(v)>=0)speed=v}catch(e){}
  /* pieces: sentences joined up to ~220 characters, each remembers its block */
  var chunks=[];function build(){chunks=[];CUR.units.forEach(function(u,ui){var ss=u.text.match(/[^.!?;:]+[.!?;:]*["”’)]*\s*/g)||[u.text],buf='';
   ss.forEach(function(s){if((buf+s).length>220&&buf){chunks.push({t:buf.trim(),u:ui});buf=''}buf+=s});if(buf.trim())chunks.push({t:buf.trim(),u:ui})})}build();
  var st='idle',idx=0,tok=0,watch=0,keep=null,again=false,lastU=-1;
  function voices(){return synth.getVoices()||[]}
  function score(v){var n=(v.name||'').toLowerCase(),s=0;if(/natural|neural|online/.test(n))s+=6;if(/google/.test(n))s+=4;if(/samantha|daniel|serena|libby|sonia|aria|jenny|guy|ryan/.test(n))s+=3;if(v.localService===false)s+=1;
   var l=(v.lang||'').toLowerCase().replace('_','-');if(l==='en-gb')s+=2;else if(l==='en-us')s+=1.5;else if(l==='en-in')s+=1;return s}
  function voiceFor(text){var vs=voices(),base=function(v){return(v.lang||'').toLowerCase().replace('_','-').split('-')[0]};
   /* Devanagari text on the Nepali page: a Nepali voice, else Hindi (same script); otherwise the best English voice */
   if(lang()==='ne'&&/[ऀ-ॿ]/.test(text)){var ne=vs.filter(function(v){return base(v)==='ne'})[0]||vs.filter(function(v){return base(v)==='hi'})[0];if(ne)return ne}
   var en=vs.filter(function(v){return base(v)==='en'}).sort(function(a,b){return score(b)-score(a)});return en[0]||null}
  function clearW(){clearTimeout(watch);watch=0}
  function hard(){tok++;clearW();synth.cancel();if(synth.paused)synth.resume()}
  function mark(u){document.querySelectorAll('[data-tts].is-reading').forEach(function(e){e.classList.remove('is-reading')});if(u<0)return;
   var e=CUR.units[u]&&CUR.units[u].el;if(!e)return;e.classList.add('is-reading');
   if(u!==lastU){lastU=u;var r=e.getBoundingClientRect();if(r.top<hdr()+20||r.bottom>innerHeight-80){var y=scrollY+r.top-innerHeight*.3;
    if(window.DX&&window.DX.scrollTo&&!reduce)window.DX.scrollTo(Math.max(0,y));else scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'})}}}
  function ui(){var on=st!=='idle';box.classList.toggle('is-on',on);
   play.querySelector('span').textContent=st==='playing'?'Pause':st==='paused'?'Resume':'Listen';
   play.setAttribute('aria-pressed',String(st==='playing'));stop.hidden=!on;sp.hidden=!on;
   sp.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(parseFloat(b.dataset.s)===speed))})}
  function setSt(s,msg){st=s;ui();if(msg!=null&&live)live.textContent=msg}
  function finish(){clearW();keep=null;mark(-1);lastU=-1;idx=0;setSt('idle','Finished reading')}
  function speakAt(i){if(i>=chunks.length){finish();return}
   var my=++tok,c=chunks[i],u=new SpeechSynthesisUtterance(c.t),v=voiceFor(c.t);
   if(v){u.voice=v;u.lang=v.lang}else u.lang=lang()==='ne'&&/[ऀ-ॿ]/.test(c.t)?'ne-NP':'en-GB';
   u.rate=speed;u.pitch=1;u.volume=1;
   var next=function(){if(tok!==my)return;clearW();speakAt(i+1)};
   u.onend=next;
   u.onerror=function(e){if(tok!==my||e.error==='interrupted'||e.error==='canceled')return;if(e.error==='not-allowed'){api.stop();return}next()};
   keep=u;idx=i;clearW();
   watch=setTimeout(function(){if(tok===my&&st==='playing'&&!synth.paused){hard();speakAt(i+1)}},c.t.length/(11*u.rate)*1000+6000);
   if(st!=='playing')setSt('playing','Reading aloud');mark(c.u);
   synth.speak(u)}
  var api={
   play:function(){if(st==='paused')return api.resume();if(st==='playing')return;hard();speakAt(idx)},
   pause:function(){if(st!=='playing')return;clearW();if(SOFT)hard();else synth.pause();again=SOFT;setSt('paused','Paused')},
   resume:function(){if(st!=='paused')return;var t=tok;
    if(again||SOFT){again=false;st='resuming';speakAt(idx);return}
    synth.resume();setSt('playing','Reading aloud');
    setTimeout(function(){if(tok===t&&st==='playing'&&!synth.speaking)speakAt(idx)},400); /* Chrome sometimes loses the paused piece */
    clearW();watch=setTimeout(function(){if(tok===t&&st==='playing'){hard();speakAt(idx+1)}},20000)},
   stop:function(){hard();again=false;keep=null;mark(-1);lastU=-1;idx=0;if(st!=='idle')setSt('idle','Stopped')},
   speed:function(x){speed=x;try{localStorage.setItem('dx-read-speed',String(x))}catch(e){}ui();
    if(st==='playing'){hard();speakAt(idx)}else if(st==='paused'){hard();again=true}},
   get state(){return{status:st,index:idx,total:chunks.length,speed:speed}}
  };
  api.rebuild=function(){api.stop();build()};
  window.DX_READER=api;
  play.addEventListener('click',function(){if(st==='playing')api.pause();else api.play()});
  stop.addEventListener('click',function(){api.stop();play.focus()});
  sp.addEventListener('click',function(e){var b=e.target.closest('button[data-s]');if(b)api.speed(parseFloat(b.dataset.s))});
  addEventListener('pagehide',function(){synth.cancel()});
  addEventListener('beforeunload',function(){synth.cancel()});
  if(synth.addEventListener)synth.addEventListener('voiceschanged',function(){});voices();
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&st!=='idle')api.stop()});
  synth.cancel(); /* nothing left over from a previous page */
  ui();box.hidden=false
 }

 function photos(){
  var PH=window.DX_PH||{};
  var imgs=document.querySelectorAll('img[data-ph]');
  for(var i=0;i<imgs.length;i++){(function(im){
   var n=im.dataset.ph,m=PH[n];if(!m)return;
   var ws=[800,1200,1600,2400,3200].filter(function(w){return w<=m.w});if(!ws.length)ws=[m.w];
   var src=function(w){return'img/photos/'+n+'-'+w+'.webp'};
   im.src=src(Math.min(1600,ws[ws.length-1]));
   im.srcset=ws.map(function(w){return src(w)+' '+w+'w'}).join(', ');
   im.sizes=im.dataset.sizes||'100vw';im.width=m.w;im.height=m.h;
   if(!im.hasAttribute('loading'))im.loading='lazy';im.decoding='async';
   if(im.dataset.pos)im.style.objectPosition=im.dataset.pos;
   var f=im.closest('figure');if(f&&m.c)f.style.setProperty('--phc',m.c);
   im.removeAttribute('data-ph')
  })(imgs[i])}
 }

 function filter(){
  var bar=document.querySelector('.bl-filt'),items=document.querySelectorAll('#blList>[data-topic]'),out=document.getElementById('blCount');
  if(!bar||!items.length)return;
  var btns=bar.querySelectorAll('button[data-f]'),total=items.length;
  bar.addEventListener('click',function(e){
   var b=e.target.closest('button[data-f]');if(!b)return;
   var f=b.dataset.f,n=0;
   for(var i=0;i<btns.length;i++)btns[i].setAttribute('aria-pressed',btns[i]===b?'true':'false');
   for(var j=0;j<items.length;j++){var show=f==='all'||items[j].dataset.topic===f;items[j].hidden=!show;if(show)n++}
   if(out)out.textContent=f==='all'?'Showing all articles':'Showing articles about '+b.textContent.trim().toLowerCase();
   if(window.ScrollTrigger)window.ScrollTrigger.refresh()
  })
 }

 /* blogs.html: the list's publication dates follow the page language, like the article's own date */
 function listDates(){if(!document.getElementById('blList'))return;
  /* re-queried each time: rows the live store adds later must follow the language too */
  var go=function(){var ts=document.querySelectorAll('#blList time[datetime]');for(var i=0;i<ts.length;i++){var t=fmtDate(ts[i].getAttribute('datetime'));if(ts[i].textContent!==t)ts[i].textContent=t}};go();
  new MutationObserver(go).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})}
 /* QA 2026-11-01: the header placeholder ("Dolphin Education blog", empty standfirst) used to paint before this deferred script ran, then the real
    post pushed the article down (CLS 0.15-0.33 on phones and tablets). page-blog.css keeps the post column hidden until bl-on is set here. */
 function run(){renderPost();document.documentElement.classList.add('bl-on');photos();filter();listDates();if(document.getElementById('postTitle')){progress();textSize();if(CUR)listen()}
  if(window.DX&&DX.live){if(document.getElementById('postTitle'))DX.live.on(livePost);if(document.getElementById('blList'))DX.live.on(liveList)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
