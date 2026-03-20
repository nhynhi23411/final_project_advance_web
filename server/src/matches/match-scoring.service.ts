import { Injectable } from "@nestjs/common";

export interface MatchWeights {
  category_weight: number;
  text_weight: number;
  location_weight: number;
  time_weight: number;
  attributes_weight: number;
}

@Injectable()
export class MatchScoringService {
  normalizeWeights(weights: MatchWeights): MatchWeights {
    const sum =
      weights.category_weight +
      weights.text_weight +
      weights.location_weight +
      weights.time_weight +
      weights.attributes_weight;

    if (!sum || sum <= 0) {
      return {
        category_weight: 20,
        text_weight: 35,
        location_weight: 25,
        time_weight: 10,
        attributes_weight: 10,
      };
    }

    return {
      category_weight: (weights.category_weight / sum) * 100,
      text_weight: (weights.text_weight / sum) * 100,
      location_weight: (weights.location_weight / sum) * 100,
      time_weight: (weights.time_weight / sum) * 100,
      attributes_weight: (weights.attributes_weight / sum) * 100,
    };
  }

  private safeText(v: unknown): string {
    return String(v || "").toLowerCase().trim();
  }

  private tokenize(v: string): Set<string> {
    return new Set(v.split(/\s+/).filter(Boolean));
  }

  private textSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const sa = this.tokenize(a);
    const sb = this.tokenize(b);
    if (!sa.size || !sb.size) return 0;
    const inter = [...sa].filter((w) => sb.has(w)).length;
    return (2 * inter) / (sa.size + sb.size);
  }

  private dateDiffScore(a?: string | Date, b?: string | Date): number {
    if (!a || !b) return 0;
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    if (Number.isNaN(da) || Number.isNaN(db)) return 0;
    const dayDiff = Math.abs(da - db) / (1000 * 60 * 60 * 24);
    if (dayDiff <= 1) return 1;
    if (dayDiff <= 3) return 0.8;
    if (dayDiff <= 7) return 0.6;
    if (dayDiff <= 14) return 0.4;
    if (dayDiff <= 30) return 0.2;
    return 0;
  }

  compute(lostPost: any, foundPost: any, rawWeights: MatchWeights) {
    const weights = this.normalizeWeights(rawWeights);

    const categoryScore =
      this.safeText(lostPost?.category) === this.safeText(foundPost?.category) ? 1 : 0;

    const textA = `${this.safeText(lostPost?.title)} ${this.safeText(lostPost?.description)}`.trim();
    const textB = `${this.safeText(foundPost?.title)} ${this.safeText(foundPost?.description)}`.trim();
    const textScore = this.textSimilarity(textA, textB);

    const lostAddress = this.safeText(lostPost?.location?.address || lostPost?.location_text);
    const foundAddress = this.safeText(foundPost?.location?.address || foundPost?.location_text);
    const locationScore = this.textSimilarity(lostAddress, foundAddress);

    const timeScore = this.dateDiffScore(
      lostPost?.metadata?.lost_found_date || lostPost?.lost_found_date,
      foundPost?.metadata?.lost_found_date || foundPost?.lost_found_date,
    );

    const attrA = `${this.safeText(lostPost?.metadata?.color)} ${this.safeText(
      lostPost?.metadata?.brand,
    )} ${this.safeText(lostPost?.metadata?.distinctive_marks)}`.trim();
    const attrB = `${this.safeText(foundPost?.metadata?.color)} ${this.safeText(
      foundPost?.metadata?.brand,
    )} ${this.safeText(foundPost?.metadata?.distinctive_marks)}`.trim();
    const attributesScore = this.textSimilarity(attrA, attrB);

    const confidence =
      categoryScore * weights.category_weight +
      textScore * weights.text_weight +
      locationScore * weights.location_weight +
      timeScore * weights.time_weight +
      attributesScore * weights.attributes_weight;

    return {
      confidence_score: Math.max(0, Math.min(100, Number(confidence.toFixed(2)))),
      signals: {
        category: Number(categoryScore.toFixed(4)),
        text: Number(textScore.toFixed(4)),
        location: Number(locationScore.toFixed(4)),
        time: Number(timeScore.toFixed(4)),
        attributes: Number(attributesScore.toFixed(4)),
      },
    };
  }
}

