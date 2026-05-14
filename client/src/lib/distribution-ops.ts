export interface DistributionOpsEntry {
  date: string; // ISO date format YYYY-MM-DD
  postsCount: number;
  dmsCount: number;
  creatorOutreachCount: number;
  cacInputValue?: number; // For tracking CAC trend
  notes?: string;
  createdAt: number; // timestamp
}

export interface DistributionOpsTrend {
  avgPostsPerDay: number;
  avgDmsPerDay: number;
  avgCreatorOutreachPerDay: number;
  totalDaysTracked: number;
  latestEntry?: DistributionOpsEntry;
  trend: DistributionOpsEntry[];
}

const STORAGE_KEY = "lockstep_distribution_ops_v1";

export const distributionOps = {
  getEntries(): DistributionOpsEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addEntry(entry: Omit<DistributionOpsEntry, "createdAt">): DistributionOpsEntry {
    const entries = this.getEntries();
    const newEntry: DistributionOpsEntry = {
      ...entry,
      createdAt: Date.now(),
    };

    // Replace if same date exists, otherwise append
    const existingIndex = entries.findIndex((e) => e.date === entry.date);
    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries.push(newEntry);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    return newEntry;
  },

  updateEntry(date: string, updates: Partial<DistributionOpsEntry>): DistributionOpsEntry | null {
    const entries = this.getEntries();
    const index = entries.findIndex((e) => e.date === date);
    if (index < 0) return null;

    const updated = { ...entries[index], ...updates, createdAt: entries[index].createdAt };
    entries[index] = updated;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    return updated;
  },

  deleteEntry(date: string): boolean {
    const entries = this.getEntries();
    const filtered = entries.filter((e) => e.date !== date);
    if (filtered.length === entries.length) return false;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    return true;
  },

  getTrend(): DistributionOpsTrend {
    const entries = this.getEntries();

    if (entries.length === 0) {
      return {
        avgPostsPerDay: 0,
        avgDmsPerDay: 0,
        avgCreatorOutreachPerDay: 0,
        totalDaysTracked: 0,
        trend: [],
      };
    }

    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const avgPostsPerDay = entries.reduce((sum, e) => sum + e.postsCount, 0) / entries.length;
    const avgDmsPerDay = entries.reduce((sum, e) => sum + e.dmsCount, 0) / entries.length;
    const avgCreatorOutreachPerDay = entries.reduce((sum, e) => sum + e.creatorOutreachCount, 0) / entries.length;

    return {
      avgPostsPerDay,
      avgDmsPerDay,
      avgCreatorOutreachPerDay,
      totalDaysTracked: entries.length,
      latestEntry: sorted[sorted.length - 1],
      trend: sorted,
    };
  },

  clearAllEntries(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  exportCsv(): string {
    const entries = this.getEntries();
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const columns = ["date", "postsCount", "dmsCount", "creatorOutreachCount", "cacInputValue", "notes"];
    const lines = [columns.join(",")];

    for (const entry of sorted) {
      const row = [
        `"${entry.date}"`,
        entry.postsCount,
        entry.dmsCount,
        entry.creatorOutreachCount,
        entry.cacInputValue ?? "",
        `"${(entry.notes ?? "").replace(/"/g, '""')}"`,
      ];
      lines.push(row.join(","));
    }

    return lines.join("\n");
  },
};
