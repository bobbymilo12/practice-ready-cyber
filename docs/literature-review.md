# Literature Review

## Short version (PebblePad, ~400 words)

Most attacks on organisations don't need to beat the technology if they can get past the people. Mitnick and Simon (2002) give example after example of attackers getting sensitive information just by phoning someone and sounding convincing. Cialdini's (2007) work on persuasion explains why this works. People tend to go along with authority and urgency, which is exactly what a caller posing as a doctor or a panicking relative relies on. The scale is significant too: Verizon (2024) found that 68% of breaches involved a human element. However, most research focuses on phishing emails. Phone and face-to-face pretexting get much less attention (Krombholz et al., 2015), even though that's how a lot of sensitive information is actually handled.

This matters in healthcare. Health records count as special category data under UK GDPR, and WannaCry showed that GP practices are part of the NHS attack surface, with 595 of them infected (National Audit Office, 2018). Reception staff are in a difficult position. They're busy, they're on the phone all day, and requests from relatives or other professionals are completely normal. This makes it hard to tell a genuine request from a pretext.

NHS staff already complete yearly data security training (National Data Guardian, 2016), but the research suggests this kind of training doesn't change much. Bada, Sasse and Nurse (2019) found that awareness campaigns often fail because knowing the right answer isn't the same as doing it under pressure. Sasse, Brostoff and Weirich (2001) make the point that staff aren't careless; security advice often just doesn't fit how they actually work. More interactive training does better. Game-based and in-the-moment training both improved resistance to phishing (Sheng et al., 2007; Kumaraguru et al., 2010), although the effect fades unless training is repeated (Jampen et al., 2020). The limitation is that almost all of these studies are about spotting suspicious emails, not about handling a difficult phone call.

Existing tools fall short too. NHS e-learning is generic and the same for every practice. Vendors such as KnowBe4 have started simulating vishing calls (KnowBe4, 2026), but these test whether staff fall for an unannounced call rather than teach them the right procedure, and they're aimed at corporate users. None of them can reflect how an individual practice checks identity or handles third-party requests. The Caldicott Principles (National Data Guardian, 2020) also remind us that sharing information appropriately matters as much as protecting it, so training should build judgement rather than teach staff to refuse everything.

This is the gap I want to address. PracticeReady Cyber gives reception staff realistic, repeatable practice with phone and front-desk scenarios, based on their own practice's procedures, with progress tracked over time. It's a web application built on Supabase with row-level security, tested against the OWASP Top 10 (OWASP Foundation, 2021) and developed in two-week sprints.

---

# Full version

## 1. Social engineering and the human attack surface

Social engineering exploits people rather than technical vulnerabilities, persuading a target to disclose information or take an action that benefits the attacker. Mitnick and Simon (2002) showed through case studies that well-prepared callers routinely obtain sensitive information by impersonating colleagues, customers or officials, often over the telephone and without any technical intrusion. Hadnagy (2018) frames this as a repeatable process of information gathering, pretext development and elicitation, and argues that organisations defend against technical attacks far more systematically than against manipulation of their staff.

The psychological mechanisms behind these attacks are well established. Cialdini's (2007) principles of influence, particularly authority, scarcity (urgency), liking and social proof, map closely onto common pretexts: the caller claiming to be a doctor, the distressed relative who needs an answer now, or the "colleague" from another practice. Krombholz et al. (2015) classify social engineering attacks by channel (email, telephone, in person, social media) and by type (direct or indirect, human or technical), and note that attacks combining several channels are especially effective. Salahdine and Kaabouch (2019) reach a similar conclusion in their survey, identifying user training as one of the main countermeasures alongside technical controls.

The scale of the problem is reflected in industry data. The Verizon *Data Breach Investigations Report* (Verizon, 2024) found that 68% of breaches involved a non-malicious human element, such as falling for social engineering or making an error. However, much of the academic and commercial literature concentrates on email phishing, because it is easy to simulate and measure at scale. Voice-based attacks (vishing) and in-person pretexting are discussed widely in practitioner literature but have received far less empirical study. This imbalance is significant for front-line roles where most sensitive interactions happen by telephone or face to face.

## 2. Healthcare and general practice as a target

Health data is "special category" data under Article 9 of the UK GDPR, and its disclosure can cause serious harm to patients, from embarrassment to safeguarding risks when information reaches an abusive partner or estranged relative. The NHS's exposure to cyber threats was demonstrated by the 2017 WannaCry attack. The National Audit Office (2018) reported that at least 81 of 236 NHS trusts were disrupted and that 603 primary care and other NHS organisations were infected, including 595 GP practices. Ghafur et al. (2019) estimated that the attack led to thousands of cancelled appointments and significant financial cost. WannaCry was ransomware rather than social engineering, so it does not show that GP staff are vulnerable to manipulation. It does show that primary care is part of the attack surface and that security weaknesses in the NHS have real clinical consequences.

GP reception staff are in a particularly exposed position. They are the first point of contact for patients, handle high call volumes under time pressure, and must balance helpfulness against confidentiality. Callers asking for test results, appointment details or a patient's address on behalf of someone else are a routine part of the job, so the boundary between a legitimate request and a pretext is often unclear. This is the situation that Cialdini's principles of urgency and authority exploit.

## 3. The effectiveness of security awareness training

National policy recognises staff training as a core control. The National Data Guardian's review (2016) set out ten data security standards for health and care, including that all staff complete appropriate annual data security training and pass a mandatory test. In practice this is delivered through the Data Security and Protection Toolkit and generic e-learning.

The research evidence suggests that this kind of compliance training has limited effect on behaviour. Sasse, Brostoff and Weirich (2001) argued that users are not inherently the "weakest link". Insecure behaviour often comes from security demands that conflict with people's actual work, and education has to be relevant to their real tasks. Bada, Sasse and Nurse (2019) reviewed why awareness campaigns fail to change behaviour. They found that knowing the right action does not reliably lead to doing it, that fear-based messaging can be counterproductive, and that campaigns work better when they are tailored to the audience and build practical skills rather than simply transferring information.

Studies of interactive training are more encouraging. Sheng et al. (2007) found that *Anti-Phishing Phil*, a game-based approach, improved participants' ability to identify phishing websites compared with conventional materials. Kumaraguru et al. (2010) showed that embedded training, delivered at the moment a user falls for a simulated attack, improved resistance and was retained over time. Jampen et al. (2020), in a comparative review of anti-phishing training, concluded that training is generally effective but that its effects decay, so it needs to be repeated and made engaging.

These studies have limitations. Almost all of them concern email phishing, which is a recognition task (spotting a suspicious link), rather than the conversational judgement needed on a phone call. Many recruit students or general online participants rather than staff in a specific role, which limits how far the findings generalise to a GP reception desk. Even so, they consistently suggest that active, realistic and repeated practice beats passive, annual content. This is consistent with experiential learning theory (Kolb, 1984), in which learners build skills through cycles of concrete experience, reflection and application.

## 4. Existing solutions

Current options fall into three groups.

**NHS compliance e-learning.** NHS staff complete the national Data Security Awareness Level 1 course, which covers confidentiality, record keeping and the relevant law, followed by an eAssessment (NHS England, 2023). Since 2023/24 the Data Security and Protection Toolkit has dropped its fixed 95% completion target in favour of training set by each organisation's own training needs analysis (NHS England, 2023). GP-focused suites such as Blue Stream Academy (2026) offer similar information governance modules alongside other mandatory topics, with records kept for audit. These courses are recognised for compliance, but they are generic, knowledge-based and the same for every organisation.

**Commercial security awareness platforms.** Vendors such as KnowBe4 provide training libraries and simulated phishing campaigns, and in 2026 KnowBe4 added simulated voice phishing (vishing) with spoofed caller ID and multi-step scenarios (KnowBe4, 2026). Newer platforms such as Arsen and Adaptive Security use AI-generated voices and adaptive dialogue to simulate phone attacks (Arsen, 2025; Adaptive Security, 2026). These tools show that vendors now recognise voice-based attacks. However, they measure whether staff fall for an unannounced call rather than teaching the correct procedure, they target corporate users, and live test calls to real staff raise consent and trust concerns in a small practice. UK providers such as Bob's Business offer bespoke courses aligned with an organisation's policies, but the vendor writes these as a paid service, so the organisation cannot adapt them itself (Bob's Business, 2026).

**Healthcare communication simulators and serious games.** Platforms such as SimConverse use generative AI to role-play patients and colleagues for communication practice, and have been adopted by NHS Lothian (MobiHealthNews, 2024). They are the closest match in format, but they target clinical communication rather than information security. In research, serious games have been applied to social engineering awareness, including in virtual reality (Jansen and Fischbach, 2020), but evaluations concentrate on phishing. No rigorous evaluation of a training tool for telephone pretexting was found.

None of these groups addresses the specific problem this project targets: realistic practice at handling telephone and front-desk requests for patient information, in line with a practice's own procedures for verifying identity, handling third-party requests and escalating concerns. Generic training cannot reflect local variation, even though procedures differ between practices, for example in which identifiers are checked or who may receive results. Attack simulators reward refusal, whereas the Caldicott Principles also require staff to share information when it is justified (see Section 5). Existing products are nevertheless ahead in realism (AI voice and adaptive dialogue), in measuring behaviour outside training, and in formal compliance recognition. PracticeReady Cyber is therefore positioned as a complement to mandatory training rather than a replacement for it.

## 5. Legal, ethical and professional context

The project operates within the UK GDPR and the Data Protection Act 2018. Article 5 requires that personal data is processed with appropriate security, and Article 32 requires organisations to take appropriate technical and organisational measures, which explicitly include staff training. The Caldicott Principles (National Data Guardian, 2020) add a professional duty to share information only on a justified, need-to-know basis, while recognising that the duty to share can be as important as the duty to protect. A training tool must therefore teach staff when to share as well as when to refuse, rather than encouraging reflexive refusal that could harm patient care.

The platform itself must also handle data responsibly. Scenarios will use fictional patients only. Any personal data about trainees, such as names and scores, must be minimised, kept secure and retained only as long as needed, and progress tracking must be used to support staff rather than penalise them.

## 6. Technology and methodology

A web application was chosen so that staff can use it on existing practice computers without installation. The front end uses React with TypeScript and TanStack Start, and the back end uses Supabase, a hosted PostgreSQL service with built-in authentication. PostgreSQL row-level security allows access rules to be enforced in the database itself, so one practice's staff cannot read another practice's data even if the application layer is at fault. The OWASP Top 10 (OWASP Foundation, 2021) will be used as the baseline for security testing, which is essential for a security training product. Development will follow an agile, Scrum-based approach (Schwaber and Sutherland, 2020) with two-week sprints, so that the scenario design can be refined as it is tested.

## 7. Summary and identified gap

The literature shows that social engineering targets people, that healthcare data and NHS organisations are attractive targets, and that compliance-style awareness training rarely changes behaviour. Interactive, realistic and repeated training performs better, but existing research and products focus almost entirely on email phishing. There is a clear gap for scenario-based training that targets telephone and front-desk social engineering in general practice, adapts to each practice's local procedures and measures progress over time. PracticeReady Cyber is designed to address this gap.

## References

Adaptive Security (2026) *Phishing simulation*. Available at: https://www.adaptivesecurity.com/phishing-simulation (Accessed: 28 October 2026).

Arsen (2025) *Arsen launches AI-powered vishing simulation to help organizations combat voice phishing at scale*. CPO Magazine. Available at: https://www.cpomagazine.com/?p=39153 (Accessed: 28 October 2026).

Bada, M., Sasse, A.M. and Nurse, J.R.C. (2019) 'Cyber security awareness campaigns: why do they fail to change behaviour?', *arXiv preprint*, arXiv:1901.02672. Available at: https://arxiv.org/abs/1901.02672.

Blue Stream Academy (2026) *Online training for GP practices*. Available at: https://www.bluestreamacademy.com (Accessed: 28 October 2026).

Bob's Business (2026) *Cyber security awareness training*. Digital Marketplace G-Cloud listing. Available at: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/324297188230750 (Accessed: 28 October 2026).

Cialdini, R.B. (2007) *Influence: the psychology of persuasion*. Revised edn. New York: Harper Business.

Ghafur, S., Kristensen, S., Honeyford, K., Martin, G., Darzi, A. and Aylin, P. (2019) 'A retrospective impact analysis of the WannaCry cyberattack on the NHS', *npj Digital Medicine*, 2, article 98.

Hadnagy, C. (2018) *Social engineering: the science of human hacking*. 2nd edn. Indianapolis: Wiley.

Jampen, D., Gür, G., Sutter, T. and Tellenbach, B. (2020) 'Don't click: towards an effective anti-phishing training. A comparative literature review', *Human-centric Computing and Information Sciences*, 10, article 33.

Jansen, P. and Fischbach, F. (2020) 'The Social Engineer: an immersive virtual reality educational game to raise social engineering awareness', in *Extended Abstracts of the 2020 Annual Symposium on Computer-Human Interaction in Play (CHI PLAY '20)*. New York: ACM.

KnowBe4 (2026) *KnowBe4 combats voice-based threats with advanced simulated vishing capabilities*. Available at: https://www.knowbe4.com/press/knowbe4-combats-voice-based-threats-with-advanced-simulated-vishing-capabilities (Accessed: 28 October 2026).

Kolb, D.A. (1984) *Experiential learning: experience as the source of learning and development*. Englewood Cliffs: Prentice Hall.

Krombholz, K., Hobel, H., Huber, M. and Weippl, E. (2015) 'Advanced social engineering attacks', *Journal of Information Security and Applications*, 22, pp. 113–122.

Kumaraguru, P., Sheng, S., Acquisti, A., Cranor, L.F. and Hong, J. (2010) 'Teaching Johnny not to fall for phish', *ACM Transactions on Internet Technology*, 10(2), article 7.

Mitnick, K.D. and Simon, W.L. (2002) *The art of deception: controlling the human element of security*. Indianapolis: Wiley.

MobiHealthNews (2024) *SimConverse gets seed funding to expand access to healthcare communications training*. Available at: https://www.mobihealthnews.com/news/anz/simconverse-gets-seed-funding-expand-access-healthcare-communications-training (Accessed: 28 October 2026).

National Audit Office (2018) *Investigation: WannaCry cyber attack and the NHS*. HC 414. London: National Audit Office.

National Data Guardian (2016) *Review of data security, consent and opt-outs*. London: National Data Guardian for Health and Care.

National Data Guardian (2020) *The eight Caldicott Principles*. London: National Data Guardian for Health and Care.

NHS England (2023) *Data Security and Protection Toolkit: training*. Available at: https://dsptoolkit.nhs.uk/News/Training (Accessed: 28 October 2026).

OWASP Foundation (2021) *OWASP Top 10: 2021*. Available at: https://owasp.org/Top10/.

Salahdine, F. and Kaabouch, N. (2019) 'Social engineering attacks: a survey', *Future Internet*, 11(4), article 89.

Sasse, M.A., Brostoff, S. and Weirich, D. (2001) 'Transforming the "weakest link": a human/computer interaction approach to usable and effective security', *BT Technology Journal*, 19(3), pp. 122–131.

Schwaber, K. and Sutherland, J. (2020) *The Scrum guide*. Available at: https://scrumguides.org/.

Sheng, S., Magnien, B., Kumaraguru, P., Acquisti, A., Cranor, L.F., Hong, J. and Nunge, E. (2007) 'Anti-Phishing Phil: the design and evaluation of a game that teaches people not to fall for phish', in *Proceedings of the 3rd Symposium on Usable Privacy and Security (SOUPS)*. New York: ACM, pp. 88–99.

Verizon (2024) *2024 Data breach investigations report*. Verizon Business.
