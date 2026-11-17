import { readFileSync } from "fs";
import { join } from "path";
import { NodeNotFoundError, InvalidQueryError } from "./errors.js";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null;

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const artifactsDir = join(__dirname, "..", "artifacts");

export type NodeLevel = "act" | "part" | "chapter" | "section" | "sub_section" | "clause";

export interface PageIndexNode {
  node_id: string;
  snapshot_id: string;
  act_code: string;
  act_name: string;
  level: NodeLevel;
  number: string;
  title: string;
  text: string;
  parent_id: string | null;
  children_ids: string[];
  path: string[];
  source_url: string;
}

export interface SearchScope {
  act_code?: string;
  act_codes?: string[];
  level?: NodeLevel;
  snapshot_id?: string;
}

export interface SearchResult {
  node: PageIndexNode;
  relevance: number; // 0.0 - 1.0
  match_reason: string;
}

let allNodesMap: Map<string, PageIndexNode> = new Map();

function loadNodes() {
  if (allNodesMap.size > 0) return;

  // Load Contract Act (ICA) Tree
  try {
    const contractActPath = join(artifactsDir, "contract-act-tree.json");
    const contractActData = readFileSync(contractActPath, "utf-8");
    const contractActNodes = JSON.parse(contractActData);
    for (const node of contractActNodes) {
      const sourceId: string = node.id || node.node_id;
      let num = "";
      const match = sourceId.match(/s(\d+[A-Z]?)/);
      if (match) {
        num = match[1];
      }
      // Canonical "ACT-YEAR/S-n" like every other Act, the glossaries and the
      // LLM. The artifact's "contract-act:sN" ids still resolve via citationKey().
      const node_id = num ? `ICA-1872/S-${num}` : sourceId;

      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2026-05-19",
        act_code: "ICA-1872",
        act_name: "Indian Contract Act, 1872",
        level: (node.type || node.level || "section") as NodeLevel,
        number: num,
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || node.children || [],
        path: [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    // Fail silently or log warning if file does not exist yet (e.g. in clean repo builds)
    console.warn("Warning: Could not load contract-act-tree.json", err);
  }

  // Load CrPC Tree
  try {
    const crpcPath = join(artifactsDir, "crpc-tree.json");
    const crpcData = readFileSync(crpcPath, "utf-8");
    const crpcNodes = JSON.parse(crpcData);
    for (const node of crpcNodes) {
      const node_id = node.node_id || node.id;
      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2026-05-28",
        act_code: node.act_code || "CRPC-1973",
        act_name: node.act_name || "Code of Criminal Procedure, 1973",
        level: (node.level || node.type || "section") as NodeLevel,
        number: node.number || "",
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || node.children || [],
        path: node.path || [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    console.warn("Warning: Could not load crpc-tree.json", err);
  }

  // Load IPC Tree
  try {
    const ipcPath = join(artifactsDir, "ipc-tree.json");
    const ipcData = readFileSync(ipcPath, "utf-8");
    const ipcNodes = JSON.parse(ipcData);

    for (const node of ipcNodes) {
      const node_id = node.node_id || node.id;

      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2024-12-01",
        act_code: "IPC-1860",
        act_name: "Indian Penal Code, 1860",
        level: (node.level || "section") as NodeLevel,
        number: node.number || node_id.split("-").pop() || "",
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || [],
        path: node.path || [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };

      allNodesMap.set(node_id, normalizedNode);
    }
  } catch (error) {
    console.warn("IPC tree not found or failed to load:", error);
  }

  // Load CPC Tree
  try {
    const cpcPath = join(artifactsDir, "cpc-tree.json");
    const cpcData = readFileSync(cpcPath, "utf-8");
    const cpcNodes = JSON.parse(cpcData);

    for (const node of cpcNodes) {
      const node_id = node.node_id || node.id;

      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2026-06-11",
        act_code: node.act_code || "CPC-1908",
        act_name: node.act_name || "Code of Civil Procedure, 1908",
        level: (node.level || node.type || "section") as NodeLevel,
        number: node.number || "",
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || node.children || [],
        path: node.path || [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };

      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    console.warn("Warning: Could not load cpc-tree.json", err);
  }

  // Load NI Act Tree
  try {
    const niActPath = join(artifactsDir, "ni-act-tree.json");
    const niActData = readFileSync(niActPath, "utf-8");
    const niActTree = JSON.parse(niActData);

    const flattenNiNode = (node: any, parentId: string | null = null, path: string[] = []) => {
      const currentPath = [...path, node.node_id];
      const childrenIds = node.children ? node.children.map((c: any) => c.node_id) : [];

      const normalizedNode: PageIndexNode = {
        node_id: node.node_id,
        snapshot_id: node.snapshot_id || "2026-06-11",
        act_code: "NI-1881",
        act_name: "Negotiable Instruments Act, 1881",
        level: (node.level || "section") as NodeLevel,
        number: node.section_number || node.node_id.split("-").pop() || "",
        title: node.title || "",
        text: node.text || "",
        parent_id: node.parent_id || parentId,
        children_ids: childrenIds,
        path: currentPath,
        source_url: "https://indiacode.nic.in"
      };

      allNodesMap.set(normalizedNode.node_id, normalizedNode);

      if (node.children) {
        for (const child of node.children) {
          flattenNiNode(child, node.node_id, currentPath);
        }
      }
    };

    flattenNiNode(niActTree);
  } catch (err) {
    console.warn("Warning: Could not load ni-act-tree.json", err);
  }

  // Load RTI Act Tree
  try {
    let rtiPath = join(artifactsDir, "rti-act-2005.json");
    if (!require("fs").existsSync(rtiPath)) {
      rtiPath = join(__dirname, "..", "data", "rti-act-2005.json");
    }
    const rtiData = readFileSync(rtiPath, "utf-8");
    const rtiTree = JSON.parse(rtiData);

    const flattenRtiNode = (node: any, parentId: string | null = null, path: string[] = []) => {
      const currentPath = [...path, node.node_id];
      const childrenIds = node.children ? node.children.map((c: any) => c.node_id) : [];
      
      const normalizedNode: PageIndexNode = {
        node_id: node.node_id,
        snapshot_id: node.snapshot_id || "2026-05-28",
        act_code: "RTI-2005",
        act_name: "Right to Information Act, 2005",
        level: (node.level || "section") as NodeLevel,
        number: node.section_number || node.node_id.split("-").pop() || "",
        title: node.title || "",
        text: node.text || "",
        parent_id: node.parent_id || parentId,
        children_ids: childrenIds,
        path: currentPath,
        source_url: "https://indiacode.nic.in"
      };
      
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
      
      if (node.children) {
        for (const child of node.children) {
          flattenRtiNode(child, node.node_id, currentPath);
        }
      }
    };

    flattenRtiNode(rtiTree);
  } catch (err) {
    console.warn("Warning: Could not load rti-act-2005.json", err);
  }

  // Load IPC Tree (Flat Array)
  try {
    const ipcPath = join(artifactsDir, "ipc-tree.json");
    const ipcData = readFileSync(ipcPath, "utf-8");
    const ipcNodes = JSON.parse(ipcData);
    for (const node of ipcNodes) {
      const normalizedNode: PageIndexNode = {
        node_id: node.node_id,
        snapshot_id: node.snapshot_id || "2024-12-01",
        act_code: node.act_code || "IPC-1860",
        act_name: node.act_name || "Indian Penal Code, 1860",
        level: (node.level || "section") as NodeLevel,
        number: node.number || "",
        title: node.title || "",
        text: node.text || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || [],
        path: node.path || [node.node_id],
        source_url: node.source_url || "https://www.indiacode.nic.in/"
      };
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    console.warn("Warning: Could not load ipc-tree.json", err);
  }

  // Load NI Act Tree (Nested Tree)
  try {
    const niPath = join(artifactsDir, "ni-act-tree.json");
    const niData = readFileSync(niPath, "utf-8");
    const niTree = JSON.parse(niData);

    const flattenNiNode = (node: any, parentId: string | null = null, path: string[] = []) => {
      const currentPath = [...path, node.node_id];
      const childrenIds = node.children ? node.children.map((c: any) => c.node_id) : [];
      
      const normalizedNode: PageIndexNode = {
        node_id: node.node_id,
        snapshot_id: node.snapshot_id || "2026-06-11",
        act_code: "NI-1881",
        act_name: "Negotiable Instruments Act, 1881",
        level: (node.level || "section") as NodeLevel,
        number: node.section_number || node.number || "",
        title: node.title || "",
        text: node.text || "",
        parent_id: node.parent_id || parentId,
        children_ids: childrenIds,
        path: currentPath,
        source_url: "https://indiacode.nic.in"
      };
      
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
      
      if (node.children) {
        for (const child of node.children) {
          flattenNiNode(child, node.node_id, currentPath);
        }
      }
    };

    flattenNiNode(niTree);
  } catch (err) {
    console.warn("Warning: Could not load ni-act-tree.json", err);
  }

  // ── Acts that were on disk but never loaded (W4 audit) ────────────────────
  // Corpus trees: flat [{node_id, parent_id, node_type, label, text_content}]
  const corpusDir = join(__dirname, "..", "..", "..", "corpus", "acts");
  const corpusActs: Array<[string, string, string]> = [
    ["consumer-protection-act", "CPA-2019", "Consumer Protection Act, 2019"],
    ["it-act", "ITA-2000", "Information Technology Act, 2000"],
    ["dpdp-act-2023", "DPDP-2023", "Digital Personal Data Protection Act, 2023"],
    ["it-intermediary-rules-2021", "IT-RULES-2021", "IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021"],
  ];
  for (const [dir, actCode, actName] of corpusActs) {
    try {
      const rows = JSON.parse(readFileSync(join(corpusDir, dir, "tree.json"), "utf-8")) as any[];
      const children = new Map<string, string[]>();
      for (const r of rows) if (r.parent_id) children.set(r.parent_id, [...(children.get(r.parent_id) ?? []), r.node_id]);
      for (const r of rows) {
        const label: string = r.label || "";
        allNodesMap.set(r.node_id, {
          node_id: r.node_id,
          snapshot_id: r.snapshot_id || "2026-06-03",
          act_code: actCode,
          act_name: actName,
          level: (r.node_type === "root" ? "act" : r.node_type || "section") as NodeLevel,
          number: r.node_id.match(/(?:S|RULE)-([0-9A-Z]+)$/)?.[1] ?? "",
          title: label.includes(" — ") ? label.split(" — ").slice(1).join(" — ") : label,
          text: r.text_content || "",
          parent_id: r.parent_id || null,
          children_ids: children.get(r.node_id) ?? [],
          path: [r.node_id],
          source_url: "https://www.indiacode.nic.in",
        });
      }
    } catch (err) {
      console.warn(`Warning: Could not load corpus act ${dir}`, err);
    }
  }

  // Nested trees in data/: {node_id, title, level, section_number, text, children}
  const nestedActs: Array<[string, string, string]> = [
    ["whistleblower-protection-2014.json", "Whistleblower-2014", "Whistle Blowers Protection Act, 2014"],
    ["public-records-1993.json", "PublicRecords-1993", "Public Records Act, 1993"],
  ];
  for (const [file, actCode, actName] of nestedActs) {
    try {
      const walk = (n: any, parentId: string | null, path: string[]) => {
        const p = [...path, n.node_id];
        allNodesMap.set(n.node_id, {
          node_id: n.node_id,
          snapshot_id: n.snapshot_id || "2026-06-12",
          act_code: actCode,
          act_name: actName,
          level: (n.level || "section") as NodeLevel,
          number: n.section_number || "",
          title: n.title || "",
          text: n.text || "",
          parent_id: n.parent_id || parentId,
          children_ids: (n.children ?? []).map((c: any) => c.node_id),
          path: p,
          source_url: "https://www.indiacode.nic.in",
        });
        for (const c of n.children ?? []) walk(c, n.node_id, p);
      };
      walk(JSON.parse(readFileSync(join(__dirname, "..", "data", file), "utf-8")), null, []);
    } catch (err) {
      console.warn(`Warning: Could not load ${file}`, err);
    }
  }

  // Summary-only trees in src/acts/: {act: {id: "SRA_1963", short_title, nodes: [{section, title, summary}]}}
  // ponytail: these files carry section summaries, not bare-act text; swap in full text when ingested.
  for (const file of ["specific_relief_act_1963.json", "sale_of_goods_act_1930.json"]) {
    try {
      const act = JSON.parse(readFileSync(join(__dirname, "..", "src", "acts", file), "utf-8")).act;
      const actCode = String(act.id).replace("_", "-");          // SRA_1963 -> SRA-1963
      const sectionIds: string[] = [];
      for (const n of act.nodes ?? []) {
        const id = `${actCode}/S-${n.section}`;
        sectionIds.push(id);
        allNodesMap.set(id, {
          node_id: id,
          snapshot_id: "2026-06-12",
          act_code: actCode,
          act_name: act.short_title,
          level: "section",
          number: String(n.section),
          title: n.title || "",
          text: `[Summary] ${n.summary || ""}`,
          parent_id: actCode,
          children_ids: [],
          path: [actCode, id],
          source_url: act.india_code_url || "https://www.indiacode.nic.in",
        });
      }
      allNodesMap.set(actCode, {
        node_id: actCode, snapshot_id: "2026-06-12", act_code: actCode, act_name: act.short_title,
        level: "act", number: "", title: act.short_title, text: act.long_title || "",
        parent_id: null, children_ids: sectionIds, path: [actCode], source_url: act.india_code_url || "",
      });
    } catch (err) {
      console.warn(`Warning: Could not load ${file}`, err);
    }
  }

  for (const n of allNodesMap.values()) n.title = cleanSectionTitle(n.title);
}

/** Retrieve the exact canonical legal text of a specific node by its ID. */
/**
 * Canonical key for a citation: act + provision path WITHOUT chapter segments.
 *   "ICA-1872/CH-V/S-73"     → "ICA-1872|S-73"
 *   "contract-act:s73"       → "ICA-1872|S-73"   (legacy Contract Act ids)
 *   "CPC-1908/ORD-XXI/R-32"  → "CPC-1908|ORD-XXI/R-32"
 * Chapters are path decoration — LLMs (and people) get them wrong while the
 * act + section is right. The act and the section must still really exist.
 */
export function citationKey(id: string): string | null {
  const legacy = id.match(/^contract-act:s(\d+[A-Z]?)$/i);
  if (legacy) return `ICA-1872|S-${legacy[1].toUpperCase()}`;
  const parts = id.split("/");
  if (parts.length < 2) return null;
  const rest = parts.slice(1).filter((seg) => !/^(CH|PART)-/i.test(seg));
  return rest.length ? `${parts[0].toUpperCase()}|${rest.join("/").toUpperCase()}` : null;
}

let citationIndex: Map<string, PageIndexNode> | null = null;

function resolveNode(node_id: string): PageIndexNode | undefined {
  const exact = allNodesMap.get(node_id);
  if (exact) return exact;
  if (!citationIndex) {
    citationIndex = new Map();
    for (const n of allNodesMap.values()) {
      const key = citationKey(n.node_id);
      if (key && !citationIndex.has(key)) citationIndex.set(key, n);
    }
  }
  // Sub-clause citations ("…/S-2(9)", "…/S-138(b)") resolve to their section.
  const bare = node_id.replace(/(\([^)]*\))+$/, "");
  if (bare !== node_id && allNodesMap.has(bare)) return allNodesMap.get(bare);
  const key = citationKey(bare);
  return key ? citationIndex.get(key) : undefined;
}

export async function get_text(node_id: string): Promise<PageIndexNode> {
  loadNodes();
  const node = resolveNode(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  return node;
}

/** Given a parent node ID, return its immediate children. */
export async function descend(node_id: string): Promise<PageIndexNode[]> {
  loadNodes();
  const node = allNodesMap.get(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  const children: PageIndexNode[] = [];
  for (const childId of node.children_ids) {
    const child = allNodesMap.get(childId);
    if (child) {
      children.push(child);
    }
  }
  return children;
}

/** Given any node ID, return its full ancestor chain. */
export async function expand_path(node_id: string): Promise<PageIndexNode[]> {
  loadNodes();
  const node = allNodesMap.get(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  const pathNodes: PageIndexNode[] = [];
  for (const pathId of node.path) {
    const pathNode = allNodesMap.get(pathId);
    if (pathNode) {
      pathNodes.push(pathNode);
    }
  }
  return pathNodes;
}

/** Every node loaded from the act artifacts (used by the local DB seed). */
/**
 * Bare-act headings run straight into the section body
 * ("What agreements are contracts.—All agreements are contracts if…").
 * Keep only the heading so drawers, appendices and prompts get clean titles.
 */
export function cleanSectionTitle(title: string): string {
  return title.split(/\.\s*(?:—|–|--)\s*/)[0].replace(/\.$/, "").trim();
}

export function allNodes(): PageIndexNode[] {
  loadNodes();
  return [...allNodesMap.values()];
}

/** Search the PageIndex tree for relevant nodes. */
export async function search(query: string, scope?: SearchScope, top_k: number = 20): Promise<SearchResult[]> {
  if (!query || !query.trim()) {
    throw new InvalidQueryError("Search query cannot be empty");
  }
  loadNodes();

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (queryTerms.length === 0) {
    throw new InvalidQueryError("Search query cannot be empty");
  }

  // If DB/OpenAI is configured, use hybrid search
  if (supabase && openai) {
    let filterScopes: string[] | null = null;
    if (scope) {
      if (scope.act_codes && scope.act_codes.length > 0) {
        filterScopes = scope.act_codes;
      } else if (scope.act_code) {
        filterScopes = [scope.act_code];
      }
    }

    try {
      // 1. Embed query
      const embedRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      });
      const query_embedding = embedRes.data[0].embedding;

      // 2. Call RPC
      const { data, error } = await supabase.rpc("match_pageindex_nodes", {
        query_text: query,
        query_embedding,
        match_count: top_k,
        filter_scopes: filterScopes
      });

      if (error) {
        console.error("Hybrid search error:", error);
      } else if (data) {
        const results: SearchResult[] = [];
        for (const row of data) {
          const node = allNodesMap.get(row.node_id);
          if (node) {
            // Apply other scope filters if necessary
            if (scope?.level && node.level !== scope.level) continue;
            if (scope?.snapshot_id && node.snapshot_id !== scope.snapshot_id) continue;

            results.push({
              node,
              relevance: row.score,
              match_reason: `Hybrid match (similarity: ${row.similarity.toFixed(2)}, bm25: ${row.bm25_score.toFixed(2)})`
            });
          }
        }
        if (results.length > 0) {
          // Normalization already handled via score ensemble, return direct results
          return results.slice(0, top_k);
        }
      }
    } catch (err) {
      console.error("Failed to perform hybrid search:", err);
    }
  }

  const results: SearchResult[] = [];

  for (const node of allNodesMap.values()) {
    // Apply scope filters
    if (scope) {
      if (scope.act_codes && scope.act_codes.length > 0 && !scope.act_codes.includes(node.act_code)) continue;
      if (scope.act_code && node.act_code !== scope.act_code) continue;
      if (scope.level && node.level !== scope.level) continue;
      if (scope.snapshot_id && node.snapshot_id !== scope.snapshot_id) continue;
    }

    const titleLower = node.title.toLowerCase();
    const textLower = node.text.toLowerCase();

    let score = 0;
    let matchReason = "";

    // Exact matches
    if (titleLower.includes(query.toLowerCase())) {
      score += 5.0;
      matchReason = "Exact query match in title";
    } else if (textLower.includes(query.toLowerCase())) {
      score += 2.0;
      matchReason = "Exact query match in text";
    }

    // Term matches
    let termMatchesInTitle = 0;
    let termMatchesInText = 0;
    const titleWords = titleLower.split(/\s+/);
    let overlapBoost = 0;
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        termMatchesInTitle++;
        if (titleWords.includes(term)) {
          overlapBoost += 2.0;
        }
      }
      if (textLower.includes(term)) {
        termMatchesInText++;
      }
    }
    score += overlapBoost;
    score += termMatchesInTitle * 1.0;
    score += termMatchesInText * 2.0;

    if (titleLower.includes('request') && textLower.includes('right to information')) {
      score += 5.0;
    }

    if (!matchReason) {
      matchReason = `Matched ${termMatchesInTitle} terms in title, ${termMatchesInText} in text`;
    }
    if (score > 0) {
      results.push({
        node,
        relevance: score,
        match_reason: matchReason
      });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  const maxScore = results[0]?.relevance || 1;
  for (const r of results) {
    r.relevance = maxScore > 0 ? parseFloat((r.relevance / maxScore).toFixed(4)) : 0.0;
  }

  return results.slice(0, top_k);
}
