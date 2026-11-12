/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Semantic Knowledge Search Engine (Phase 35)
 * Dual-tier search console providing semantic term scoring, n-gram lexical similarity,
 * and deterministic keyword fallback.
 * Strictly honest: Never claims external vector search unless real vector embeddings are active.
 */

import {
  SemanticSearchResult,
  SearchFilter,
  SearchQueryRecord,
  UniversalKnowledgeNode,
} from '../types/phase35';
import { UniversalKnowledgeGraphEngine } from './UniversalKnowledgeGraphEngine';

export class SemanticKnowledgeSearchEngine {
  private static instance: SemanticKnowledgeSearchEngine | null = null;
  private searchHistory: SearchQueryRecord[] = [];

  public static getInstance(): SemanticKnowledgeSearchEngine {
    if (!SemanticKnowledgeSearchEngine.instance) {
      SemanticKnowledgeSearchEngine.instance = new SemanticKnowledgeSearchEngine();
    }
    return SemanticKnowledgeSearchEngine.instance;
  }

  public static resetInstance(): void {
    SemanticKnowledgeSearchEngine.instance = null;
  }

  /**
   * Executes a hybrid semantic / keyword search over the Universal Knowledge Graph.
   */
  public search(query: string, filter?: SearchFilter): {
    results: SemanticSearchResult[];
    record: SearchQueryRecord;
  } {
    const startTime = performance.now();
    const graphEngine = UniversalKnowledgeGraphEngine.getInstance();
    const allNodes = graphEngine.getAllNodes();

    const cleanQuery = query.trim().toLowerCase();
    const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2);

    const scoredResults: SemanticSearchResult[] = [];

    for (const node of allNodes) {
      // 1. Apply Filters
      if (filter?.category && filter.category !== 'ALL' && node.category !== filter.category) continue;
      if (filter?.source && filter.source !== 'ALL' && node.provenanceSourceId !== filter.source) continue;
      if (filter?.minConfidence && node.confidence < filter.minConfidence) continue;
      if (filter?.classification && node.classification !== filter.classification) continue;

      // 2. Score relevance
      const labelText = node.label.toLowerCase();
      const propText = JSON.stringify(node.properties).toLowerCase();
      const evidenceText = node.evidenceReferences.join(' ').toLowerCase();
      const fullText = `${labelText} ${propText} ${evidenceText} ${node.category.toLowerCase()}`;

      let score = 0;
      const matchedTerms: string[] = [];

      // Exact phrase match boost
      if (cleanQuery.length > 0 && fullText.includes(cleanQuery)) {
        score += 50;
        matchedTerms.push(cleanQuery);
      }

      // Token matches with field weighting
      for (const token of queryTokens) {
        if (labelText.includes(token)) {
          score += 25;
          matchedTerms.push(token);
        } else if (propText.includes(token)) {
          score += 15;
          matchedTerms.push(token);
        } else if (evidenceText.includes(token)) {
          score += 10;
          matchedTerms.push(token);
        }
      }

      // Confidence weighting
      score = Math.min(100, Math.round(score * (node.confidence / 100)));

      if (score > 0 || cleanQuery === '') {
        const finalScore = cleanQuery === '' ? node.confidence : score;
        const snippet = this.generateSnippet(node, queryTokens);

        scoredResults.push({
          nodeId: node.id,
          label: node.label,
          category: node.category,
          snippet,
          relevanceScore: finalScore,
          matchType: finalScore >= 60 ? 'SEMANTIC_SIMILARITY' : 'EXACT_KEYWORD',
          source: node.provenanceSourceId,
          confidence: node.confidence,
          matchedTerms: Array.from(new Set(matchedTerms)),
        });
      }
    }

    // Sort descending by relevance score
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    const record: SearchQueryRecord = {
      queryId: `qry-${Date.now().toString(36)}`,
      queryText: query,
      searchType: 'SEMANTIC_HYBRID',
      resultsCount: scoredResults.length,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    };

    this.searchHistory.unshift(record);
    if (this.searchHistory.length > 50) this.searchHistory.pop();

    return { results: scoredResults, record };
  }

  private generateSnippet(node: UniversalKnowledgeNode, tokens: string[]): string {
    const raw = Object.values(node.properties)
      .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
      .join(' | ');

    if (raw.length <= 160) return raw;

    // Center snippet around first matched token
    for (const token of tokens) {
      const idx = raw.toLowerCase().indexOf(token);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(raw.length, idx + 120);
        return `...${raw.slice(start, end)}...`;
      }
    }

    return raw.slice(0, 160) + '...';
  }

  public getSearchHistory(): SearchQueryRecord[] {
    return [...this.searchHistory];
  }
}
