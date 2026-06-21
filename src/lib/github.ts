// ─────────────────────────────────────────────────────────────────────────
// Build-time GitHub data engine.
// Pulls live repo metadata for the personal user + studio org, normalizes it,
// and merges it onto the curated featured projects in site.config.ts.
//
// Design rules:
//  - Authenticate with GITHUB_TOKEN when present (Netlify build env); fall back
//    to unauthenticated requests locally. Either way, NEVER throw — a network
//    failure or rate-limit must degrade to curated-only data, not break build.
//  - Curated `featured` entries are the spine; live data decorates them.
// ─────────────────────────────────────────────────────────────────────────

import { site, type FeaturedProject, type ProjectStatus } from '../data/site.config';

const TOKEN = process.env.GITHUB_TOKEN;
const API = 'https://api.github.com';

export interface GitHubRepo {
  fullName: string; // owner/name
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  size: number; // KB, from the repos API
  pushedAt: string; // ISO
  htmlUrl: string;
  fork: boolean;
  archived: boolean;
}

export interface LanguageSlice {
  name: string;
  bytes: number;
  pct: number; // 0–100, rounded
}

export interface RepoBar {
  name: string;
  size: number; // KB
  pct: number; // 0–100 relative to largest
  language: string | null;
  stars: number;
}

/** A project ready to render: curated fields + any merged live data. */
export interface Project extends FeaturedProject {
  live?: {
    language: string | null;
    stars: number;
    pushedAt: string;
    htmlUrl: string;
    commits?: number;
  };
}

export interface SiteData {
  projects: Project[];
  stats: {
    publicRepos: number;
    languages: string[];
    lastPush: string | null;
    /** True when live data could not be fetched (curated-only fallback). */
    degraded: boolean;
  };
  /** Build-time "Code in the wild" visualization data. */
  viz: {
    totalSizeKB: number;
    languageBytes: LanguageSlice[];
    topRepos: RepoBar[];
  };
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'jimmyneyhart.com-build',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      console.warn(`[github] ${res.status} ${res.statusText} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[github] fetch failed for ${url}:`, err);
    return null;
  }
}

interface RawRepo {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  size: number;
  pushed_at: string;
  html_url: string;
  fork: boolean;
  archived: boolean;
}

async function fetchReposFor(kind: 'users' | 'orgs', login: string): Promise<GitHubRepo[]> {
  const raw = await fetchJson<RawRepo[]>(
    `${API}/${kind}/${login}/repos?per_page=100&sort=pushed`,
  );
  if (!raw) return [];
  return raw.map((r) => ({
    fullName: r.full_name,
    name: r.name,
    description: r.description,
    language: r.language,
    topics: r.topics ?? [],
    stars: r.stargazers_count,
    size: r.size ?? 0,
    pushedAt: r.pushed_at,
    htmlUrl: r.html_url,
    fork: r.fork,
    archived: r.archived,
  }));
}

/** Cheap commit count via the Link header on a 1-per-page commits request. */
async function fetchCommitCount(fullName: string): Promise<number | undefined> {
  try {
    const res = await fetch(`${API}/repos/${fullName}/commits?per_page=1`, {
      headers: headers(),
    });
    if (!res.ok) return undefined;
    const link = res.headers.get('link');
    if (link) {
      const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      if (match) return Number(match[1]);
    }
    // No Link header → single page of results; count them.
    const body = (await res.json()) as unknown[];
    return Array.isArray(body) ? body.length : undefined;
  } catch {
    return undefined;
  }
}

/** Per-repo language byte breakdown ({ TypeScript: 12345, ... }). */
async function fetchLanguages(fullName: string): Promise<Record<string, number>> {
  const data = await fetchJson<Record<string, number>>(
    `${API}/repos/${fullName}/languages`,
  );
  return data ?? {};
}

function statusFromRepo(repo: GitHubRepo): ProjectStatus {
  if (repo.archived) return 'ARCHIVED';
  return 'OPEN SOURCE';
}

export async function getSiteData(): Promise<SiteData> {
  const { user, org } = site.sources;
  const denylist = new Set(site.denylist.map((s) => s.toLowerCase()));

  const [userRepos, orgRepos] = await Promise.all([
    fetchReposFor('users', user),
    fetchReposFor('orgs', org),
  ]);

  const allRepos = [...userRepos, ...orgRepos];
  const degraded = allRepos.length === 0;

  const repoByName = new Map<string, GitHubRepo>();
  for (const r of allRepos) repoByName.set(r.fullName.toLowerCase(), r);

  // 1) Curated projects are the spine; merge live data where a repo is bound.
  const curatedRepoNames = new Set(
    site.featured.filter((f) => f.repo).map((f) => f.repo!.toLowerCase()),
  );

  const projects: Project[] = [];
  for (const f of site.featured) {
    const project: Project = { ...f };
    if (f.repo) {
      const repo = repoByName.get(f.repo.toLowerCase());
      if (repo) {
        const commits = await fetchCommitCount(repo.fullName);
        project.live = {
          language: repo.language,
          stars: repo.stars,
          pushedAt: repo.pushedAt,
          htmlUrl: repo.htmlUrl,
          commits,
        };
        if (!project.url) project.url = repo.htmlUrl;
      }
    }
    projects.push(project);
  }

  // 2) Auto-append any remaining public repos not already curated / denylisted.
  for (const repo of allRepos) {
    const key = repo.fullName.toLowerCase();
    if (repo.fork) continue;
    if (denylist.has(key)) continue;
    if (curatedRepoNames.has(key)) continue;

    const commits = await fetchCommitCount(repo.fullName);
    projects.push({
      id: repo.fullName,
      repo: repo.fullName,
      title: repo.name,
      blurb: repo.description ?? 'No description provided.',
      status: statusFromRepo(repo),
      url: repo.htmlUrl,
      tags: repo.topics.slice(0, 4),
      source: repo.fullName.toLowerCase().startsWith(`${org.toLowerCase()}/`)
        ? 'studio'
        : 'personal',
      live: {
        language: repo.language,
        stars: repo.stars,
        pushedAt: repo.pushedAt,
        htmlUrl: repo.htmlUrl,
        commits,
      },
    });
  }

  // 3) Honest stats strip. Count every non-fork public repo across both
  //    accounts (the denylist only governs project-card auto-listing, not
  //    the aggregate footprint).
  const visibleRepos = allRepos.filter((r) => !r.fork);
  const languages = Array.from(
    new Set(visibleRepos.map((r) => r.language).filter((l): l is string => !!l)),
  );
  const lastPush =
    visibleRepos.length > 0
      ? visibleRepos
          .map((r) => r.pushedAt)
          .sort()
          .at(-1) ?? null
      : null;

  // 4) "Code in the wild" viz — aggregate language bytes across visible repos
  //    and rank repos by size. All build-time, so no client fetch / loading.
  const langTotals: Record<string, number> = {};
  await Promise.all(
    visibleRepos.map(async (r) => {
      const langs = await fetchLanguages(r.fullName);
      for (const [name, bytes] of Object.entries(langs)) {
        langTotals[name] = (langTotals[name] ?? 0) + bytes;
      }
    }),
  );

  const totalBytes = Object.values(langTotals).reduce((s, v) => s + v, 0);
  const sortedLangs = Object.entries(langTotals).sort((a, b) => b[1] - a[1]);
  const topLangs = sortedLangs.slice(0, 5);
  const restBytes = sortedLangs.slice(5).reduce((s, [, v]) => s + v, 0);
  const languageBytes: LanguageSlice[] = topLangs.map(([name, bytes]) => ({
    name,
    bytes,
    pct: totalBytes ? Math.round((bytes / totalBytes) * 100) : 0,
  }));
  if (restBytes > 0) {
    languageBytes.push({
      name: 'Other',
      bytes: restBytes,
      pct: totalBytes ? Math.round((restBytes / totalBytes) * 100) : 0,
    });
  }

  const maxSize = Math.max(1, ...visibleRepos.map((r) => r.size));
  const topRepos: RepoBar[] = [...visibleRepos]
    .sort((a, b) => b.size - a.size)
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      size: r.size,
      pct: Math.max(4, Math.round((r.size / maxSize) * 100)),
      language: r.language,
      stars: r.stars,
    }));

  const totalSizeKB = visibleRepos.reduce((s, r) => s + r.size, 0);

  return {
    projects,
    stats: {
      publicRepos: visibleRepos.length,
      languages,
      lastPush,
      degraded,
    },
    viz: {
      totalSizeKB,
      languageBytes,
      topRepos,
    },
  };
}
