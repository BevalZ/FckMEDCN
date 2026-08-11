import type { NewsTickerItem, NewsType } from './news';

interface NewsTopic {
  key: string;
  label: string;
  types: readonly NewsType[];
  developments: readonly string[];
  impacts: readonly string[];
}

const SEASONS = ['春季', '夏季', '秋季', '冬季'] as const;

// 游戏内行业快讯模板：使用趋势性、匿名化措辞，不把未来年份包装成真实报道。
const NEWS_TOPICS: readonly NewsTopic[] = [
  {
    key: 'education', label: '医学教育', types: ['event', 'warning', 'irony'],
    developments: ['多所医学院调整临床实践课比重', '模拟诊疗课程覆盖更多年级', '临床教师评价加入带教质量', '医学课程压缩重复理论内容', '跨专业团队训练进入培养方案', '毕业考核增加真实场景沟通'],
    impacts: ['学生希望见习机会分配更透明', '基层教学基地承接能力受到关注', '带教医生的时间成本再次进入讨论', '课程改革能否减轻背诵负担仍待观察', '患者安全与沟通能力被放到更前面', '院校之间的培养质量差异成为焦点'],
  },
  {
    key: 'residency', label: '住院医师培训', types: ['warning', 'event', 'irony'],
    developments: ['多地重新评估规培轮转强度', '住培基地公开年度带教反馈', '规培补助与值班量联动引发讨论', '结业考核增加临床推理环节', '基地探索弹性轮转与补休制度', '住培质量督导开始抽查真实排班'],
    impacts: ['年轻医生最关心的仍是休息能否落实', '不同基地待遇差距仍然明显', '培训与单纯补充人力的边界被再次追问', '学员希望申诉渠道真正独立运行', '高负荷科室的人才流失压力上升', '规范化培训的含金量取决于日常带教'],
  },
  {
    key: 'primary', label: '基层医疗', types: ['event', 'warning', 'event'],
    developments: ['县域医共体扩大专科协作范围', '基层门诊上线远程会诊排班', '家庭医生团队增加慢病随访时段', '乡镇卫生院更新基础检验设备', '城市医院试行长期下沉坐诊', '基层急救转运网络继续补点'],
    impacts: ['常见病留在本地诊治的比例有望提高', '人才留用仍比短期支援更困难', '远程建议如何落地执行成为关键', '设备到位后仍需要稳定的技术培训', '群众更关心夜间和节假日能否找到医生', '上下级医院的责任边界需要同步明确'],
  },
  {
    key: 'operations', label: '医院运营', types: ['warning', 'irony', 'event'],
    developments: ['公立医院细化科室成本核算', '多家医院调整绩效分配规则', '大型设备采购增加全过程留痕', '门诊流程试行分时段精细调度', '医院后勤服务引入患者评价', '院内会议开始压缩非临床报表'],
    impacts: ['临床科室担心管理指标继续加码', '患者等待时间成为最直观的评价标准', '成本压力不能转化为不必要的检查', '一线人员希望减少重复填表', '运营效率与医疗质量需要同时守住', '管理改进最终仍要落到诊疗体验'],
  },
  {
    key: 'insurance', label: '医保支付', types: ['event', 'warning', 'irony'],
    developments: ['医保支付规则增加临床沟通环节', '多地公开年度基金使用分析', '按病种付费覆盖更多常见疾病', '医保审核强化病案首页质量', '异地结算继续扩大直接覆盖范围', '门诊慢病保障目录动态调整'],
    impacts: ['医生希望合理诊疗不被简单等同于控费', '病案质量直接影响科室结算结果', '患者对自费项目解释提出更高要求', '医院需要避免把支付压力转嫁给个人', '跨地区政策差异仍给就医带来困扰', '精细管理不能替代个体化临床判断'],
  },
  {
    key: 'research', label: '临床科研', types: ['warning', 'event', 'irony'],
    developments: ['科研机构加强原始数据抽查', '医学期刊更新统计报告要求', '多中心研究推广统一数据字典', '伦理审查增加持续跟踪节点', '医院试行科研助理共享平台', '职称评价继续降低单篇论文权重'],
    impacts: ['研究团队需要为数据可追溯投入更多时间', '临床问题本身重新成为选题起点', '年轻医生期待获得稳定的方法学支持', '署名与贡献说明必须更加透明', '负结果能否被正常发表仍受关注', '科研诚信不应只在出事后才被强调'],
  },
  {
    key: 'digital', label: '数字医疗', types: ['event', 'warning', 'irony'],
    developments: ['医疗人工智能增加上线前临床验证', '电子病历系统试行减少重复录入', '远程监测设备进入更多慢病门诊', '影像辅助工具加入误差反馈入口', '医院探索患者数据分级授权', '智能随访系统扩大人工复核比例'],
    impacts: ['最终诊疗责任仍需由明确的人员承担', '技术节省的时间应真正回到患者身上', '算法偏差与适用人群必须持续监测', '隐私保护不能只依赖一纸同意书', '系统故障时的人工备用流程受到重视', '一线医护希望拥有拒绝错误建议的空间'],
  },
  {
    key: 'nursing', label: '护理队伍', types: ['event', 'warning', 'tragedy'],
    developments: ['护理岗位重新评估夜班配置', '专科护士培养覆盖更多临床领域', '医院试行护理文书精简计划', '护理门诊增加伤口与慢病服务', '多地调查护士职业倦怠状况', '院内转运流程强化护士交接权限'],
    impacts: ['人员配置是否真正增加仍是核心问题', '专业价值需要在薪酬和晋升中体现', '减少无效记录有助于回到床旁', '医护之间的平等沟通关系受到关注', '高风险操作需要更充分的双人核对', '稳定队伍比短期招聘更考验管理能力'],
  },
  {
    key: 'emergency', label: '急诊重症', types: ['warning', 'tragedy', 'event'],
    developments: ['急诊分级系统更新高风险识别规则', '重症转运增加床位实时协调', '胸痛卒中救治网络继续下沉', '医院复盘夜间抢救资源配置', '院前急救与急诊共享关键病情信息', '多学科快速响应团队扩大覆盖时段'],
    impacts: ['时间敏感疾病最怕流程在交接处停住', '高峰期人力配置仍是薄弱环节', '绿色通道需要避免只停留在标牌上', '抢救记录完整性直接关系后续复盘', '急诊拥堵不能单靠医护加速解决', '区域协同效果取决于每个节点都能响应'],
  },
  {
    key: 'safety', label: '患者安全', types: ['warning', 'tragedy', 'event'],
    developments: ['多家医院公开年度不良事件改进项', '危急值闭环增加超时升级提醒', '手术安全核查引入随机现场观察', '用药核对覆盖更多转科与出院场景', '院感监测强化重点科室主动报告', '病理与检验标本增加全流程追踪'],
    impacts: ['主动报告需要免于简单追责的环境', '流程改进应避免变成新的形式负担', '患者和家属也需要清晰的风险沟通', '团队协作比个人记忆更可靠', '近失事件同样值得被认真复盘', '安全指标必须能够反映真实临床过程'],
  },
  {
    key: 'wellbeing', label: '医务健康', types: ['warning', 'irony', 'tragedy'],
    developments: ['医务人员健康调查扩大夜班样本', '部分医院试行强制补休登记', '心理支持热线增加匿名咨询渠道', '职业暴露随访纳入统一平台', '高负荷科室探索连续值班上限', '职工体检增加睡眠与情绪筛查'],
    impacts: ['真正休息比打卡式关怀更受期待', '求助记录不应影响晋升与评价', '科室文化需要允许医生说自己撑不住', '健康风险不能长期由个人硬扛', '排班改进需要足够人手作为前提', '照顾医务人员也是患者安全的一部分'],
  },
  {
    key: 'population', label: '公共健康', types: ['event', 'warning', 'event'],
    developments: ['老龄健康服务增加综合评估门诊', '重点人群疫苗接种加强社区提醒', '慢病管理试行跨机构共享计划', '公共卫生监测更新异常信号规则', '康复与安宁疗护服务继续扩容', '学校与职场健康项目增加医学支持'],
    impacts: ['连续照护需要医院与社区共同承担', '健康信息触达不能遗漏数字弱势人群', '预防投入的效果往往要多年后才能看到', '数据共享必须同步守住个人隐私', '老龄化让多病共存管理更加迫切', '公共健康能力最终体现在日常基层服务'],
  },
];

function buildGeneratedNews(): NewsTickerItem[] {
  const items: NewsTickerItem[] = [];
  for (let year = 2024; year <= 2046; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      NEWS_TOPICS.forEach((topic, topicIndex) => {
        for (let variant = 0; variant < 3; variant++) {
          const development = topic.developments[(year + quarter + topicIndex + variant * 2) % topic.developments.length];
          const impact = topic.impacts[(year * 3 + quarter + topicIndex * 2 + variant) % topic.impacts.length];
          items.push({
            id: `brief_${year}q${quarter}_${topic.key}_${variant + 1}`,
            year,
            quarter,
            headline: `【${year}年${SEASONS[quarter - 1]}·${topic.label}】${development}，${impact}`,
            type: topic.types[variant % topic.types.length],
          });
        }
      });
    }
  }
  return items;
}

export const GENERATED_NEWS_TICKER = buildGeneratedNews();
