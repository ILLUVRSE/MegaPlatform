import path from "path";
import { promises as fs } from "fs";

const operators = new Set(["eq", "neq", "in", "not_in", "gte", "lte", "exists", "contains"]);
const effects = new Set(["allow", "deny"]);
const targetKinds = new Set(["api", "infra", "any"]);

const defaultPolicy: PolicyDocument = {
  version: "2.0",
  defaultEffect: "deny",
  rules: []
};

export type PolicyCondition = {
  key: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gte" | "lte" | "exists" | "contains";
  value?: unknown;
};

export type PolicyRule = {
  id: string;
  scope: string;
  action: string;
  effect: "allow" | "deny";
  priority: number;
  targetKind?: "api" | "infra" | "any";
  resources?: string[];
  operations?: string[];
  conditions: PolicyCondition[];
};

export type PolicyDocument = {
  version: string;
  defaultEffect: "allow" | "deny";
  rules: PolicyRule[];
};

export type PolicyDecisionInput = {
  scope: string;
  action: string;
  target?: {
    kind: "api" | "infra";
    resource?: string;
    operation?: string;
    id?: string;
  };
  attributes: Record<string, unknown>;
};

type EvaluatePolicyDecisionOptions = {
  policy?: unknown;
  policyPath?: string;
  rootDir?: string;
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot(startDir = process.cwd()) {
  let current = startDir;
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return startDir;
}

function parseYamlScalar(rawValue: string): unknown {
  const value = rawValue.trim();
  if (value === "") return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((entry) => parseYamlScalar(entry.trim()));
  }
  return value;
}

type ParsedLine = {
  indent: number;
  value: string;
};

function toParsedLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, ""))
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      indent: line.match(/^ */)?.[0].length ?? 0,
      value: line.trim()
    }));
}

function parseYamlBlock(lines: ParsedLine[], startIndex: number, indent: number): [unknown, number] {
  if (startIndex >= lines.length) return [{}, startIndex];
  if (lines[startIndex].value.startsWith("- ")) {
    return parseYamlSequence(lines, startIndex, indent);
  }
  return parseYamlObject(lines, startIndex, indent);
}

function parseYamlSequence(lines: ParsedLine[], startIndex: number, indent: number): [unknown[], number] {
  const items: unknown[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < indent || !line.value.startsWith("- ")) break;
    if (line.indent !== indent) break;

    const itemValue = line.value.slice(2).trim();
    if (!itemValue) {
      const [child, nextIndex] = parseYamlBlock(lines, index + 1, indent + 2);
      items.push(child);
      index = nextIndex;
      continue;
    }

    const separatorIndex = itemValue.indexOf(":");
    if (separatorIndex > 0) {
      const key = itemValue.slice(0, separatorIndex).trim();
      const remainder = itemValue.slice(separatorIndex + 1).trim();
      const objectItem: Record<string, unknown> = {};
      objectItem[key] = remainder ? parseYamlScalar(remainder) : {};
      index += 1;

      while (index < lines.length && lines[index].indent > indent) {
        const [childObject, nextIndex] = parseYamlObject(lines, index, indent + 2);
        Object.assign(objectItem, childObject);
        index = nextIndex;
      }

      items.push(objectItem);
      continue;
    }

    items.push(parseYamlScalar(itemValue));
    index += 1;
  }

  return [items, index];
}

function parseYamlObject(lines: ParsedLine[], startIndex: number, indent: number): [Record<string, unknown>, number] {
  const objectValue: Record<string, unknown> = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent < indent) break;
    if (line.indent !== indent || line.value.startsWith("- ")) break;

    const separatorIndex = line.value.indexOf(":");
    if (separatorIndex < 0) {
      throw new Error(`Invalid YAML line: ${line.value}`);
    }

    const key = line.value.slice(0, separatorIndex).trim();
    const remainder = line.value.slice(separatorIndex + 1).trim();

    if (remainder) {
      objectValue[key] = parseYamlScalar(remainder);
      index += 1;
      continue;
    }

    if (index + 1 >= lines.length || lines[index + 1].indent <= indent) {
      objectValue[key] = {};
      index += 1;
      continue;
    }

    const [child, nextIndex] = parseYamlBlock(lines, index + 1, lines[index + 1].indent);
    objectValue[key] = child;
    index = nextIndex;
  }

  return [objectValue, index];
}

function parsePolicySource(raw: string, formatHint?: "json" | "yaml"): unknown {
  if (formatHint === "json") return JSON.parse(raw);
  if (formatHint === "yaml") {
    const [parsed] = parseYamlBlock(toParsedLines(raw), 0, 0);
    return parsed;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const [parsed] = parseYamlBlock(toParsedLines(raw), 0, 0);
    return parsed;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCondition(value: unknown): value is PolicyCondition {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.operator === "string" &&
    operators.has(value.operator)
  );
}

function isRule(value: unknown): value is PolicyRule {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.scope === "string" &&
    value.scope.length > 0 &&
    typeof value.action === "string" &&
    value.action.length > 0 &&
    typeof value.effect === "string" &&
    effects.has(value.effect) &&
    typeof value.priority === "number" &&
    Number.isInteger(value.priority) &&
    (!("targetKind" in value) || value.targetKind === undefined || (typeof value.targetKind === "string" && targetKinds.has(value.targetKind))) &&
    (!("resources" in value) ||
      value.resources === undefined ||
      (Array.isArray(value.resources) && value.resources.every((entry) => typeof entry === "string" && entry.length > 0))) &&
    (!("operations" in value) ||
      value.operations === undefined ||
      (Array.isArray(value.operations) && value.operations.every((entry) => typeof entry === "string" && entry.length > 0))) &&
    Array.isArray(value.conditions) &&
    value.conditions.every((condition) => isCondition(condition))
  );
}

function normalizePolicy(policy: unknown): PolicyDocument {
  if (
    !isRecord(policy) ||
    typeof policy.version !== "string" ||
    policy.version.length === 0 ||
    typeof policy.defaultEffect !== "string" ||
    !effects.has(policy.defaultEffect) ||
    !Array.isArray(policy.rules) ||
    !policy.rules.every((rule) => isRule(rule))
  ) {
    return defaultPolicy;
  }

  return {
    version: policy.version,
    defaultEffect: policy.defaultEffect as "allow" | "deny",
    rules: [...policy.rules].sort((a, b) => b.priority - a.priority)
  };
}

function getValueAtPath(source: Record<string, unknown>, key: string) {
  if (key in source) return source[key];

  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

function matchesCondition(condition: PolicyCondition, attributes: Record<string, unknown>) {
  const observed = getValueAtPath(attributes, condition.key);
  switch (condition.operator) {
    case "eq":
      return observed === condition.value;
    case "neq":
      return observed !== condition.value;
    case "in":
      return Array.isArray(condition.value) ? condition.value.includes(observed) : false;
    case "not_in":
      return Array.isArray(condition.value) ? !condition.value.includes(observed) : true;
    case "gte":
      return typeof observed === "number" && typeof condition.value === "number" && observed >= condition.value;
    case "lte":
      return typeof observed === "number" && typeof condition.value === "number" && observed <= condition.value;
    case "exists":
      return condition.value === false ? typeof observed === "undefined" : typeof observed !== "undefined";
    case "contains":
      if (typeof observed === "string" && typeof condition.value === "string") {
        return observed.includes(condition.value);
      }
      return Array.isArray(observed) ? observed.includes(condition.value) : false;
    default:
      return false;
  }
}

function matchesTarget(rule: PolicyRule, input: PolicyDecisionInput) {
  const target = input.target;
  if (rule.targetKind && rule.targetKind !== "any" && rule.targetKind !== target?.kind) return false;
  if (rule.resources?.length) {
    if (!target?.resource || !rule.resources.includes(target.resource)) return false;
  }
  if (rule.operations?.length) {
    if (!target?.operation || !rule.operations.includes(target.operation)) return false;
  }
  return true;
}

export async function loadPolicyEngineConfig(options: Pick<EvaluatePolicyDecisionOptions, "policyPath" | "rootDir"> = {}) {
  const root = await findRepoRoot(options.rootDir);
  const candidatePaths = options.policyPath
    ? [options.policyPath]
    : [
        path.join(root, "ops", "governance", "policy-engine-v2.json"),
        path.join(root, "ops", "governance", "policy-engine-v2.yaml"),
        path.join(root, "ops", "governance", "policy-engine-v2.yml")
      ];

  for (const candidatePath of candidatePaths) {
    try {
      const raw = await fs.readFile(candidatePath, "utf-8");
      const formatHint = candidatePath.endsWith(".json") ? "json" : "yaml";
      return normalizePolicy(parsePolicySource(raw, formatHint));
    } catch {
      continue;
    }
  }

  return defaultPolicy;
}

export async function evaluatePolicyDecision(rawInput: unknown, options: EvaluatePolicyDecisionOptions = {}) {
  if (
    !isRecord(rawInput) ||
    typeof rawInput.scope !== "string" ||
    rawInput.scope.length === 0 ||
    typeof rawInput.action !== "string" ||
    rawInput.action.length === 0 ||
    ("target" in rawInput &&
      rawInput.target !== undefined &&
      (!isRecord(rawInput.target) ||
        (rawInput.target.kind !== undefined && rawInput.target.kind !== "api" && rawInput.target.kind !== "infra"))) ||
    ("attributes" in rawInput && rawInput.attributes !== undefined && !isRecord(rawInput.attributes))
  ) {
    return {
      ok: false as const,
      allow: false,
      reason: "invalid_input",
      matchedRuleId: null,
      policyVersion: defaultPolicy.version
    };
  }

  const targetSource = isRecord(rawInput.target) ? rawInput.target : undefined;
  const input: PolicyDecisionInput = {
    scope: rawInput.scope,
    action: rawInput.action,
    target: targetSource
      ? {
          kind: targetSource.kind === "infra" ? "infra" : "api",
          resource: typeof targetSource.resource === "string" ? targetSource.resource : undefined,
          operation: typeof targetSource.operation === "string" ? targetSource.operation : undefined,
          id: typeof targetSource.id === "string" ? targetSource.id : undefined
        }
      : undefined,
    attributes: isRecord(rawInput.attributes) ? rawInput.attributes : {}
  };
  const policy = options.policy
    ? normalizePolicy(typeof options.policy === "string" ? parsePolicySource(options.policy) : options.policy)
    : await loadPolicyEngineConfig(options);
  const candidateRules = policy.rules.filter(
    (rule) => rule.scope === input.scope && rule.action === input.action && matchesTarget(rule, input)
  );
  const evaluationContext = {
    scope: input.scope,
    action: input.action,
    target: input.target ?? null,
    attributes: input.attributes,
    ...input.attributes
  };

  for (const rule of candidateRules) {
    const pass = rule.conditions.every((condition) => matchesCondition(condition, evaluationContext));
    if (pass) {
      return {
        ok: true as const,
        allow: rule.effect === "allow",
        reason: `matched:${rule.id}`,
        matchedRuleId: rule.id,
        effect: rule.effect,
        policyVersion: policy.version
      };
    }
  }

  return {
    ok: true as const,
    allow: policy.defaultEffect === "allow",
    reason: "default_effect",
    matchedRuleId: null,
    effect: policy.defaultEffect,
    policyVersion: policy.version
  };
}
