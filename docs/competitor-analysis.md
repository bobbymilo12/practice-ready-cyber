# Competitor Analysis

Researched October 2026. Most product claims come from vendor marketing and have not been independently tested.

## 1. Comparable products

### A. NHS mandatory e-learning
| Product | What it is | Gap compared with PracticeReady |
| --- | --- | --- |
| **Data Security Awareness Level 1** (NHS e-Learning for Healthcare) | The national statutory and mandatory course. It covers data security, record keeping and the law, and ends with an eAssessment. Since 2023/24 the DSPT no longer sets a 95% completion target. Organisations now set training through their own training needs analysis. | It is generic, knowledge-based and the same for every organisation. It has no conversational practice and does not reflect local procedures. |
| **Blue Stream Academy** | A GP-practice e-learning suite with over 100 CPD modules, including Information Governance. Practices pay per completed module and get training records for audit. | Its content is compliance-focused. It is not a social engineering scenario tool and cannot be configured to a practice's own procedures. |
| **Virtual College IG Awareness** | A course of about 45 minutes, aligned with the Core Skills Training Framework, costing about £20 per learner. | It has the same limits as the other compliance courses. |

### B. Commercial security awareness platforms
| Product | What it is | Gap compared with PracticeReady |
| --- | --- | --- |
| **KnowBe4** | The market leader in phishing simulation. In July 2026 it added **simulated vishing**: spoofed local caller ID, personas and multi-step scenarios, with results feeding a Risk Score. | It is a corporate, email-first platform. Its vishing tests whether staff fall for a call, but it does not teach healthcare-specific decisions such as when to share or proxy access. It costs too much for a small GP practice. |
| **Hoxhunt / Adaptive Security** | AI-generated phishing, smishing, vishing and deepfake simulations. Adaptive uses OSINT about real employees. | Same as KnowBe4. They target enterprises, and live calls to real staff raise consent and ethics issues in a practice. |
| **Arsen** | An AI vishing add-on with adaptive dialogue that mimics help-desk impersonation. | It measures susceptibility, not correct procedure. It is not healthcare-specific. |
| **CybSafe** | A UK behavioural-science platform. Bolton NHS Trust is a case study. | It works at trust level and is generic, with no GP reception scenarios. |
| **Bob's Business** | A UK, NCSC-assured provider available on G-Cloud for £0.25–£49.99 per licence per year. It can build **bespoke courses** to a client's policies. | Bespoke content is a paid service delivered by the vendor. The organisation cannot configure it itself, and it is not conversational. |

### C. Healthcare communication simulators
| Product | What it is | Gap compared with PracticeReady |
| --- | --- | --- |
| **SimConverse** | An AI that role-plays patients and colleagues for healthcare communication practice. Users include Queensland Health and NHS Lothian. | It is closest in format (conversation practice), but it targets clinical communication rather than security or IG. |
| **SimFlow.ai / Cicero** | AI voice patient simulations with AI assessment. | Same. They focus on clinical and nursing communication. |

### D. Academic serious games
- *The Social Engineer* (Jansen and Fischbach, CHI PLAY 2020) is a VR game about social engineering awareness.
- Several phishing games (PhishDefend Quest, Security Awareness Adventure, disPHISHinformation) report gains, but one 2025 study (*Entertainment Computing*) reported a **null result**.
- I found **no rigorous evaluation of a telephone-pretexting training game**. This is a research gap worth citing.

## 2. Where PracticeReady differs

1. **Domain.** It is the only product found that targets GP reception social engineering. Every other product is either generic IG compliance or corporate cyber security.
2. **Teaching when to share as well as when to refuse.** Simulators only score "did they fall for it". PracticeReady teaches the Caldicott balance, including legitimate requests, so it does not train reflexive refusal.
3. **Local procedures.** The practice manager's setup (identifiers checked, who may receive results, escalation) drives the scenarios. Elsewhere this is either impossible or a paid bespoke service.
4. **Safe practice instead of live testing.** Trainees know they are training. There are no spoofed calls to real staff, which avoids the consent and trust problems of live vishing.
5. **Cost and scale.** It is designed for a single practice of 5–20 staff, not enterprise licensing.

## 3. Where competitors are ahead (be honest about this in the report)

| Area | Competitors | PracticeReady now |
| --- | --- | --- |
| Realism | AI voice and adaptive dialogue (Arsen, SimConverse, KnowBe4) | Text scenarios built from templates. The product review lists generic incorrect options as a High issue. |
| In-the-wild measurement | Live simulations measure real behaviour | Measures only performance in training scenarios |
| Compliance recognition | DSA L1 and Blue Stream count towards DSPT and CPD | Not accredited, so it complements mandatory training rather than replacing it |
| Content breadth | Hundreds of modules | A small set of focused topics |
| Maturity | Production platforms | Prototype with deployment blockers (see PRODUCT-REVIEW.md) |

## 4. Positioning statement

> PracticeReady sits between generic NHS IG e-learning, which is relevant but passive, and enterprise vishing simulators, which are active but generic and costly. It offers active, scenario-based practice that a small GP practice can configure to its own procedures.

Possible future work suggested by the competitors: optional speech or AI dialogue (as in SimConverse), and mapping outcomes to DSPT evidence so practices can use the results in their training needs analysis.

## Sources
- KnowBe4 vishing launch: https://www.knowbe4.com/press/knowbe4-combats-voice-based-threats-with-advanced-simulated-vishing-capabilities
- Arsen AI vishing: https://www.cpomagazine.com/?p=39153
- Resemble AI security awareness training: https://www.resemble.ai/products/security-awareness-training
- Hoxhunt vs Adaptive Security: https://hoxhunt.com/blog/hoxhunt-vs-adaptive-security
- Adaptive Security phishing simulation: https://www.adaptivesecurity.com/phishing-simulation
- DSPT e-learning FAQ: https://dsptoolkit.nhs.uk/Help/30
- DSPT training news: https://dsptoolkit.nhs.uk/News/Training
- Blue Stream Academy: https://www.bluestreamacademy.com
- Virtual College IG Awareness: https://www.virtual-college.co.uk/courses/information-governance-awareness-training
- CybSafe case studies: https://cybsafe.com/case-studies
- Bob's Business (G-Cloud): https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/324297188230750
- SimConverse: https://www.mobihealthnews.com/news/anz/simconverse-gets-seed-funding-expand-access-healthcare-communications-training
- The Social Engineer (CHI PLAY 2020): https://www.uni-ulm.de/fileadmin/website_uni_ulm/iui.inst.100/1-hci/hci-paper/2020/CHIPlay2020_TheSocialEngineer_Jansen.pdf
- What goes wrong during phishing education?: https://scholar.xjtlu.edu.cn:443/en/publications/what-goes-wrong-during-phishing-education-a-probe-into-a-game-bas
