const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
  '.mp4', '.mp3', '.wav', '.ogg', '.mov', '.avi',
  '.lock', '.map', '.min.js', '.min.css',
]);

const SKIP_PATHS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'out',
  'coverage', '.cache', 'vendor', 'target', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode', 'assets', 'public/images', 'static/images',
]);

const MAX_FILES = 60;
const MAX_TOTAL_CHARS = 120000;
const MAX_FILE_CHARS = 12000;

/**
 * Parse a GitHub URL into { owner, repo }.
 * Supports: https://github.com/owner/repo, https://www.github.com/owner/repo, owner/repo
 * @param {string} url
 * @returns {{ owner: string, repo: string } | null}
 */
function parseGitHubUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;

  // Normalize: strip trailing slash, query, fragments
  let cleaned = raw.replace(/[?#].*$/, '').replace(/\/+$/, '');

  // Try owner/repo shorthand
  const shortMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  // Full GitHub URL
  const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

/**
 * Build Authorization header if GITHUB_TOKEN is configured (better rate limits).
 */
function authHeaders() {
  if (process.env.GITHUB_TOKEN) {
    return { Authorization: `token ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' };
  }
  return { Accept: 'application/vnd.github+json' };
}

/**
 * Fetch the default branch for a repo.
 */
async function getDefaultBranch(owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('GitHub repo info failed:', res.status, body.slice(0, 200));
    return null;
  }
  const data = await res.json();
  return data.default_branch || 'main';
}

/**
 * Recursively fetch the file tree of a repo (Git Trees API).
 * @returns {Promise<Array<{ path: string, type: string }>>}
 */
async function getRepoTree(owner, repo) {
  const branch = (await getDefaultBranch(owner, repo)) || 'main';

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: authHeaders() }
  );
  if (!treeRes.ok) {
    const body = await treeRes.text().catch(() => '');
    console.warn('GitHub tree failed:', treeRes.status, body.slice(0, 200));
    return [];
  }
  const data = await treeRes.json();
  return Array.isArray(data.tree) ? data.tree : [];
}

/**
 * Fetch the raw content of a single file.
 * @returns {Promise<string>}
 */
async function fetchFileContent(owner, repo, branch, path) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURIComponent(path)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) return '';
  const text = await res.text();
  return text;
}

/**
 * Determine if a file path should be skipped (binary, build artifacts, etc.).
 */
function shouldSkip(path) {
  const parts = path.split('/');
  for (const part of parts) {
    if (SKIP_PATHS.has(part)) return true;
  }
  const lower = path.toLowerCase();
  for (const ext of SKIP_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Analyze a GitHub repository: fetch its structure and a sample of source files.
 *
 * @param {string} githubUrl
 * @returns {Promise<{
 *   ok: boolean,
 *   error?: string,
 *   repoName?: string,
 *   owner?: string,
 *   structure?: { fileCount: number, languages: string[], directories: string[], files: string[] },
 *   code?: string[]
 * }>}
 */
async function analyzeGithubRepo(githubUrl) {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) {
    return { ok: false, error: 'Invalid GitHub URL.' };
  }
  const { owner, repo } = parsed;

  try {
    const tree = await getRepoTree(owner, repo);
    const files = tree
      .filter((item) => item.type === 'blob' && !shouldSkip(item.path))
      .slice(0, MAX_FILES);

    const branch = (await getDefaultBranch(owner, repo)) || 'main';

    // Collect code samples (capped)
    const codeSamples = [];
    let totalChars = 0;

    for (const file of files) {
      if (totalChars >= MAX_TOTAL_CHARS || codeSamples.length >= 30) break;
      const content = await fetchFileContent(owner, repo, branch, file.path);
      const trimmed = content.slice(0, MAX_FILE_CHARS).trim();
      if (!trimmed) continue;
      totalChars += trimmed.length;
      codeSamples.push(`--- FILE: ${file.path} ---\n${trimmed}`);
    }

    // Structure summary
    const extensions = files
      .map((f) => {
        const idx = f.path.lastIndexOf('.');
        return idx >= 0 ? f.path.slice(idx).toLowerCase() : '';
      })
      .filter(Boolean);

    const languageCount = {};
    extensions.forEach((ext) => {
      const lang = mapExtensionToLanguage(ext);
      if (lang) languageCount[lang] = (languageCount[lang] || 0) + 1;
    });

    const directories = Array.from(
      new Set(files.map((f) => f.path.split('/').slice(0, -1).join('/') || '.'))
    ).slice(0, 30);

    return {
      ok: true,
      repoName: repo,
      owner,
      structure: {
        fileCount: files.length,
        languages: Object.entries(languageCount)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => ({ name: lang, count })),
        directories,
        files: files.map((f) => f.path).slice(0, 60),
      },
      code: codeSamples.join('\n\n').slice(0, MAX_TOTAL_CHARS),
    };
  } catch (err) {
    console.error('GitHub analysis error:', err?.message || err);
    return { ok: false, error: err?.message || 'Failed to fetch GitHub repository.' };
  }
}

/**
 * Map a file extension to a human-readable language label.
 */
function mapExtensionToLanguage(ext) {
  const map = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.java': 'Java',
    '.c': 'C',
    '.cpp': 'C++',
    '.h': 'C/C++',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sql': 'SQL',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.yml': 'YAML',
    '.yaml': 'YAML',
    '.xml': 'XML',
    '.sh': 'Shell',
    '.bat': 'Batch',
    '.dockerfile': 'Docker',
    '.vue': 'Vue',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.dart': 'Dart',
  };
  return map[ext] || null;
}

module.exports = {
  parseGitHubUrl,
  analyzeGithubRepo,
};
