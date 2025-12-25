/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

export type NodeTypeId = 'ORIGIN' | 'SPREAD' | 'RITUAL' | 'INDUSTRY' | 'MODERN';

export type CategoryId = string;
export type CountryId = string;

export type SourceType =
  | 'museum'
  | 'academic_book'
  | 'university'
  | 'govt_culture'
  | 'journal'
  | 'reputable_media'
  | 'encyclopedia'
  | 'other';

export type SensitivityTag =
  | 'none'
  | 'disputed'
  | 'religion'
  | 'politics'
  | 'ethnicity'
  | 'war'
  | 'other';

export type ChapterTone = 'epic' | 'neutral' | 'playful';

export type YearRange = { startYear: number; endYear: number };

export type SourceHint = {
  sourceHintId: string;
  sourceType: SourceType;
  sourceName: string;
  year?: number;
  note?: string;
};

export type ChapterMeta = {
  categoryId: CategoryId;
  nodeTypeId: NodeTypeId;
  chapterTitle: string;
  chapterSubtitle?: string;
  chapterTone?: ChapterTone;
  displayTimeLabel: string;
  timeRange?: YearRange | null;
};

export type Country = {
  id: CountryId;
  name: string;
};

export type Category = {
  id: CategoryId;
  name: string;
  enabled: boolean;
};

export type KnowledgeCard = {
  cardId: string;
  countryId: CountryId;
  categoryId: CategoryId;
  nodeTypeId: NodeTypeId;

  title: string;
  facts: string[];
  keywords: string[];
  sourceHints: SourceHint[];

  sensitivityTag: SensitivityTag;

  factIdsUsed: string[];
  sourceHintIdsUsed: string[];
  knowledgeBaseVersion?: string;
  retrievalQueryHash?: string;
};

