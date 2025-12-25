/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type {
  Category,
  CategoryId,
  ChapterMeta,
  Country,
  CountryId,
  KnowledgeCard,
  NodeTypeId,
  SourceHint,
  SourceType,
} from '../types';

export const DEMO_OBJECT = {
  objectName: '鸡蛋',
  objectGeneric: '蛋',
} as const;

export const NODE_TYPES: Array<{ id: NodeTypeId; label: string }> = [
  { id: 'ORIGIN', label: '起源' },
  { id: 'SPREAD', label: '传播' },
  { id: 'RITUAL', label: '礼仪' },
  { id: 'INDUSTRY', label: '产业' },
  { id: 'MODERN', label: '当代' },
];

export const CATEGORIES: Category[] = [
  { id: 'food_drink', name: '食物饮品（鸡蛋示例）', enabled: true },
  { id: 'kitchen', name: '餐厨器具（未开放）', enabled: false },
  { id: 'materials', name: '材料工艺（未开放）', enabled: false },
];

export const COUNTRIES: Country[] = [
  { id: 'CN', name: '中国' },
  { id: 'JP', name: '日本' },
  { id: 'KR', name: '韩国' },
  { id: 'VN', name: '越南' },
  { id: 'TH', name: '泰国' },
  { id: 'IN', name: '印度' },
  { id: 'TR', name: '土耳其' },
  { id: 'EG', name: '埃及' },
  { id: 'FR', name: '法国' },
  { id: 'GB', name: '英国' },
  { id: 'IT', name: '意大利' },
  { id: 'ES', name: '西班牙' },
  { id: 'DE', name: '德国' },
  { id: 'GR', name: '希腊' },
  { id: 'US', name: '美国' },
  { id: 'MX', name: '墨西哥' },
];

const COVERAGE_BY_CATEGORY: Record<CategoryId, Set<CountryId>> = {
  food_drink: new Set(['FR', 'JP']),
  kitchen: new Set(),
  materials: new Set(),
};

export function isCategoryEnabled(categoryId: CategoryId): boolean {
  return CATEGORIES.find((c) => c.id === categoryId)?.enabled ?? false;
}

export function isCountryCovered(countryId: CountryId, categoryId: CategoryId): boolean {
  if (!isCategoryEnabled(categoryId)) return false;
  return COVERAGE_BY_CATEGORY[categoryId]?.has(countryId) ?? false;
}

export function getCountry(countryId: CountryId): Country | null {
  return COUNTRIES.find((c) => c.id === countryId) ?? null;
}

export function getCategory(categoryId: CategoryId): Category | null {
  return CATEGORIES.find((c) => c.id === categoryId) ?? null;
}

export function getCardId(countryId: CountryId, nodeTypeId: NodeTypeId): string {
  return `${countryId}_${nodeTypeId}`;
}

const mkSourceHint = (
  sourceHintId: string,
  sourceType: SourceType,
  sourceName: string,
  year?: number
): SourceHint => ({ sourceHintId, sourceType, sourceName, year });

export const CHAPTERS_BY_NODE_TYPE: Record<NodeTypeId, Omit<ChapterMeta, 'categoryId'>> = {
  ORIGIN: {
    nodeTypeId: 'ORIGIN',
    chapterTitle: '巨兽与岛屿',
    displayTimeLabel: '7000万年前（白垩纪晚期）',
    timeRange: null,
  },
  SPREAD: {
    nodeTypeId: 'SPREAD',
    chapterTitle: '帝国的开胃菜 vs 泥土中的神物',
    displayTimeLabel: '公元1世纪（约公元50年）',
    timeRange: null,
  },
  RITUAL: {
    nodeTypeId: 'RITUAL',
    chapterTitle: '不朽的色彩 vs 斗争的血脉',
    displayTimeLabel: '15世纪（约1450年）',
    timeRange: null,
  },
  INDUSTRY: {
    nodeTypeId: 'INDUSTRY',
    chapterTitle: '宫廷的奢靡 vs 舶来的珍馐',
    displayTimeLabel: '17世纪中叶（约1650年）',
    timeRange: null,
  },
  MODERN: {
    nodeTypeId: 'MODERN',
    chapterTitle: '极致的烹饪 vs 文明的开化',
    displayTimeLabel: '19世纪末（约1890年）',
    timeRange: null,
  },
};

export function getChapterMeta(categoryId: CategoryId, nodeTypeId: NodeTypeId): ChapterMeta {
  const base = CHAPTERS_BY_NODE_TYPE[nodeTypeId];
  return { ...base, categoryId };
}

const DIALOGUES: Record<NodeTypeId, Record<CountryId, string>> = {
  ORIGIN: {
    FR: '在普罗旺斯的沙土巢穴里，我是巨鸟的血脉延续，不是食物。',
    JP: '在远古的列岛边缘，我更像兽脚类的蛋——面对火山与地震，只为活下去。',
  },
  SPREAD: {
    FR: '在高卢的罗马宴席上，我半熟剥壳、浸鱼酱与葡萄酒：一口开胃的秩序。',
    JP: '在弥生，我稀有而神圣：可能被当作种蛋守护，或只以符号陪伴祭祀。',
  },
  RITUAL: {
    FR: '我没上餐桌，而是与矿物颜料混合，把那抹蓝永久固定在木板上。',
    JP: '我被留作种蛋，在斗鸡的世界里孵化——被期待的是破壳后的力量。',
  },
  INDUSTRY: {
    FR: '在凡尔赛，我被打成蛋白霜：空气被揉进泡沫，甜点成了权力的轻盈。',
    JP: '在长崎，我与砂糖和面粉相遇：靠打发撑起卡斯特拉，异国甜味被本地化。',
  },
  MODERN: {
    FR: '在巴黎的铜锅里，我学会了欧姆蛋的规矩：金黄、半流心，像一门手艺课。',
    JP: '在明治的牛锅旁，我被生打在碗里蘸牛肉：这是拥抱新饮食的另一种勇气。',
  },
};

export function getDialogue(nodeTypeId: NodeTypeId, countryId: CountryId): string {
  return DIALOGUES[nodeTypeId]?.[countryId] ?? '（该国家/节点对话暂未覆盖）';
}

const card = (
  countryId: CountryId,
  nodeTypeId: NodeTypeId,
  title: string,
  facts: string[],
  keywords: string[],
  sourceHints: SourceHint[],
  sensitivityTag: KnowledgeCard['sensitivityTag']
): KnowledgeCard => {
  const cardId = getCardId(countryId, nodeTypeId);
  return {
    cardId,
    countryId,
    categoryId: 'food_drink',
    nodeTypeId,
    title,
    facts,
    keywords,
    sourceHints,
    sensitivityTag,
    factIdsUsed: facts.map((_, i) => `demo_fact_${cardId}_${i + 1}`),
    sourceHintIdsUsed: sourceHints.map((s) => s.sourceHintId),
    knowledgeBaseVersion: 'demo-egg-fr-jp-v1',
  };
};

const CARDS: Record<string, KnowledgeCard> = {
  [getCardId('FR', 'ORIGIN')]: card(
    'FR',
    'ORIGIN',
    '巨鸟之蛋：白垩纪巢穴与生命延续',
    [
      '白垩纪晚期欧洲存在多种大型鸟类或近鸟类，蛋壳与巢穴化石常用于推断繁殖行为。',
      '远古阶段证据有限，叙事应明确不确定性与推断边界。',
    ],
    ['Cretaceous', 'eggshell', 'nest', 'Gargantuavis'],
    [
      mkSourceHint('sh_fr_origin_1', 'journal', 'paleontology review（示意）', 2010),
      mkSourceHint('sh_fr_origin_2', 'encyclopedia', 'Wikipedia: Gargantuavis（示意）', 2024),
    ],
    'disputed'
  ),
  [getCardId('JP', 'ORIGIN')]: card(
    'JP',
    'ORIGIN',
    '兽脚类恐龙蛋：在地质剧烈的边缘',
    [
      '兽脚类恐龙的蛋形与巢穴信息可通过蛋壳结构与化石分布进行推测。',
      '火山喷发与地质活动会影响巢穴保存与发现，导致信息存在不确定性。',
    ],
    ['Theropod', 'dinosaur egg', 'Fukuiraptor', 'nest'],
    [
      mkSourceHint('sh_jp_origin_1', 'journal', 'dinosaur reproduction review（示意）', 2018),
      mkSourceHint('sh_jp_origin_2', 'encyclopedia', 'Wikipedia: Fukuiraptor（示意）', 2024),
    ],
    'disputed'
  ),
  [getCardId('FR', 'SPREAD')]: card(
    'FR',
    'SPREAD',
    '罗马宴席的开胃顺序：从鸡蛋到苹果',
    [
      '罗马饮食文化中鸡蛋常作为开胃菜出现，体现宴席结构与礼仪。',
      '鱼酱（Garum）是罗马常见调味品之一，常与酒与香料组合使用。',
    ],
    ['Roman cuisine', 'Garum', 'Gallo-Roman', 'Apicius'],
    [
      mkSourceHint('sh_fr_spread_1', 'academic_book', 'Apicius（示意）', 2006),
      mkSourceHint('sh_fr_spread_2', 'encyclopedia', 'Wikipedia: Garum（示意）', 2024),
    ],
    'none'
  ),
  [getCardId('JP', 'SPREAD')]: card(
    'JP',
    'SPREAD',
    '弥生的神圣种源：稀有家禽与仪式象征',
    [
      '鸡在日本早期传入与扩散的时间与地区并不一致，资料存在不确定性。',
      '作为报晓的象征，鸡可能被赋予仪式意义，食用并非主流。',
    ],
    ['Yayoi', 'ritual', 'domesticated chicken', 'symbol'],
    [
      mkSourceHint('sh_jp_spread_1', 'journal', 'archaeology overview（示意）', 2016),
      mkSourceHint('sh_jp_spread_2', 'encyclopedia', 'Britannica: chicken（示意）', 2020),
    ],
    'disputed'
  ),
  [getCardId('FR', 'RITUAL')]: card(
    'FR',
    'RITUAL',
    '蛋彩画（Tempera）：蛋黄作为颜料粘合剂',
    [
      '蛋彩画常用蛋黄作为粘合剂，与矿物色粉混合后上板成像。',
      '在油画普及前后，蛋彩在宗教画与装饰中长期存在。',
    ],
    ['Tempera', 'egg yolk binder', 'mineral pigments'],
    [
      mkSourceHint('sh_fr_ritual_1', 'encyclopedia', 'Britannica: Tempera（示意）', 2020),
      mkSourceHint('sh_fr_ritual_2', 'museum', 'Louvre education notes（示意）', 2015),
    ],
    'none'
  ),
  [getCardId('JP', 'RITUAL')]: card(
    'JP',
    'RITUAL',
    '斗鸡（Shamo）与孵化：被期待的破壳',
    [
      '斗鸡文化在不同时期与地区有不同形态，其兴盛往往与社会结构与娱乐需求有关。',
      '在这种语境下，鸡蛋可能更被视为孵化“斗鸡”的起点，而非食用。',
    ],
    ['Shamo', 'cockfighting', 'incubation'],
    [mkSourceHint('sh_jp_ritual_1', 'reputable_media', 'cultural history notes（示意）', 2019)],
    'none'
  ),
  [getCardId('FR', 'INDUSTRY')]: card(
    'FR',
    'INDUSTRY',
    '蛋白霜（Meringue）：宫廷甜点的空气感',
    [
      '蛋白在强力打发下能形成泡沫结构，烘烤后成为蛋白霜类甜点。',
      '17世纪法国宫廷饮食文化强调造型与质地，对甜点工艺发展有推动。',
    ],
    ['Meringue', 'Versailles', 'egg white foam'],
    [mkSourceHint('sh_fr_industry_1', 'academic_book', 'The Oxford Companion to Food（示意）', 2014)],
    'none'
  ),
  [getCardId('JP', 'INDUSTRY')]: card(
    'JP',
    'INDUSTRY',
    '卡斯特拉（Castella）：长崎的南蛮甜味',
    [
      '江户初期锁国下长崎是重要对外窗口，葡萄牙甜点技法在此传播并本地化。',
      '卡斯特拉依靠鸡蛋打发来支撑结构，是早期引入的西式蛋糕之一。',
    ],
    ['Castella', 'Nagasaki', 'Nanban'],
    [
      mkSourceHint('sh_jp_industry_1', 'reputable_media', 'Nagasaki tourism（示意）', 2020),
      mkSourceHint('sh_jp_industry_2', 'encyclopedia', 'Wikipedia: Castella（示意）', 2024),
    ],
    'none'
  ),
  [getCardId('FR', 'MODERN')]: card(
    'FR',
    'MODERN',
    '欧姆蛋的标准化：金黄与半流心的训练题',
    ['19世纪末法国餐饮职业化推动了菜式与工序的标准化训练。', '法式欧姆蛋常强调外观金黄、内部湿润（半流心）等要点。'],
    ['Omelette', 'Belle Époque', 'haute cuisine', 'Escoffier'],
    [
      mkSourceHint('sh_fr_modern_1', 'academic_book', 'Larousse Gastronomique（示意）', 2018),
      mkSourceHint('sh_fr_modern_2', 'reputable_media', 'Serious Eats: French omelette（示意）', 2022),
    ],
    'none'
  ),
  [getCardId('JP', 'MODERN')]: card(
    'JP',
    'MODERN',
    '牛锅与生蛋蘸料：明治的饮食转向',
    [
      '明治维新后饮食结构变化，牛肉料理常被视为“文明开化”的象征之一。',
      '寿喜烧常用生鸡蛋蘸食以降温并增加滑嫩口感（注意食品安全）。',
    ],
    ['Gyunabe', 'Sukiyaki', 'Meiji era', 'raw egg dip'],
    [
      mkSourceHint('sh_jp_modern_1', 'reputable_media', 'NHK Food（示意）', 2021),
      mkSourceHint('sh_jp_modern_2', 'encyclopedia', 'Wikipedia: Sukiyaki（示意）', 2024),
    ],
    'none'
  ),
};

export function getCard(cardId: string): KnowledgeCard | null {
  return CARDS[cardId] ?? null;
}

export function getSessionCards(
  categoryId: CategoryId,
  countryA: CountryId,
  countryB: CountryId
): Array<{ nodeTypeId: NodeTypeId; a: KnowledgeCard; b: KnowledgeCard; chapter: ChapterMeta }> {
  return NODE_TYPES.map(({ id }) => {
    const chapter = getChapterMeta(categoryId, id);
    const a = CARDS[getCardId(countryA, id)]!;
    const b = CARDS[getCardId(countryB, id)]!;
    return { nodeTypeId: id, a, b, chapter };
  });
}
