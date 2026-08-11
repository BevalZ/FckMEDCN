# External evidence candidate retrieval — 2026-08-12

This file records reproducible candidate-source retrievals for human review. It is not an approval record and does not change any `pending` status.

## Retrieval environment

- Access date: 2026-08-12 (Asia/Shanghai)
- Fast research CLI: unavailable in the current environment
- Fallback: bounded public web lookup followed by direct retrieval from the publisher/government page
- Academic databases: PubMed E-utilities and Crossref REST API, unauthenticated low-rate access

## Government and regulator candidates

| Evidence id | Direct source | Publication date | Verification performed |
|---|---|---|---|
| 国家卫健委 | https://www.gov.cn/zhengce/zhengceku/202412/content_6994470.htm | 2024-12-06 | Page identifies National Health Commission notice 国卫医政函〔2024〕259号 and `12356` as the national unified psychological-assistance number. |
| 普通高等学校学生管理规定 | https://www.gov.cn/gongbao/content/2017/content_5220900.htm | 2017-02-04 | State Council Gazette copy of Ministry of Education Order No. 41. |
| 科研诚信案件调查处理规则 | https://www.gov.cn/zhengce/zhengceku/2022-09/14/content_5709819.htm | 2022-08-25 | Government policy database copy issued by the Ministry of Science and Technology and 21 other departments. |
| 职称制度改革文件 | https://www.gov.cn/zhengce/zhengceku/2021-08/05/content_5629566.htm | 2021-06-30 | Joint guidance from MOHRSS, NHC and NATCM. |
| 教育部历年统计 | https://www.moe.gov.cn/jyb_sjzl/sjzl_fztjgb/202410/t20241024_1159002.html | 2024-10-24 | 2023 national education bulletin states higher-education gross enrolment ratio was 60.2%. |
| 人社部职业技能提升计划 | https://www.gov.cn/zhengce/content/2019-05/24/content_5394415.htm | 2019-05-24 | State Council General Office action plan; whether it supports the ending-card labour-shortage wording still requires human review. |

### Hotline correction

The previous card used `400-161-9995` while attributing it to the National Health Commission. Public lookup associated that number with the Hope24 crisis-intervention hotline, not an NHC national number. The candidate source above directly supports `12356`; the card was corrected while the evidence remains `pending`.

## PubMed: physician burnout in China

- Target: systematic reviews/meta-analyses of burnout prevalence among doctors in China
- Endpoint: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
- Parameters: `db=pubmed`, `retmode=json`, `retmax=10`, `sort=relevance`
- Query: `(physician*[Title/Abstract] OR doctor*[Title/Abstract]) AND China[Title/Abstract] AND burnout[Title/Abstract] AND (systematic review[Title/Abstract] OR meta-analysis[Publication Type])`
- Count returned: 8; records retrieved: 8
- Selected candidate: PMID `35855985`, DOI `10.1016/j.heliyon.2022.e09821`
- Title: *Burnout among doctors in China through 2020: A systematic review and meta-analysis*
- PubMed abstract: 64 studies, 48,638 doctors; overall burnout prevalence 75.48% (95% CI 69.20–81.26%).
- Crossref endpoint: `https://api.crossref.org/works/10.1016%2Fj.heliyon.2022.e09821`
- Electronic article date from PubMed XML: 2022-06-28

## PubMed: publication-to-retraction interval

- Target: empirical analyses of time from publication to retraction
- Endpoint and paging: same PubMed endpoints as above, `retmax=10`
- Query: `(retracted publication*[Title/Abstract] OR retracted article*[Title/Abstract]) AND (time to retraction[Title/Abstract] OR retraction time[Title/Abstract] OR latency[Title/Abstract])`
- Count returned: 12; summaries retrieved: first 10 relevance-ranked records
- Selected candidate: PMID `23861902`, DOI `10.1371/journal.pone.0068397`
- Title: *Why Has the Number of Scientific Retractions Increased?*
- Abstract result: 2,047 PubMed-indexed retracted articles; mean publication-to-retraction interval 32.91 months.
- Crossref endpoint: `https://api.crossref.org/works/10.1371%2Fjournal.pone.0068397`
- Crossref publication date: 2013-07-08

## Pruned unsupported claims

Generic labels such as “行业调研”, “公开报道”, institution homepages, salary ranges, and unsupported percentages were removed from the release-candidate fact cards and evidence registry. Git history preserves the wording if a future contributor finds a specific publication that directly supports it; restoration still requires human review.
