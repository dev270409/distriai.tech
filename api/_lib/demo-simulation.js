const DEMO_STATUSES = [
  'SUBMITTING',
  'FRAGMENTING',
  'SCHEDULING',
  'EXECUTING',
  'VALIDATING',
  'COMPLETED'
];

const STAGE_WINDOWS_MS = {
  SUBMITTING: 0,
  FRAGMENTING: 4_000,
  SCHEDULING: 9_000,
  EXECUTING: 16_000,
  VALIDATING: 22_000,
  COMPLETED: 27_000
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seedFromString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFloat(seed, offset = 0) {
  const x = Math.sin(seed + offset * 13.37) * 10000;
  return x - Math.floor(x);
}

function makeHash(label, imageId, seed) {
  const raw = `${label}:${imageId}:${seed}`;
  const numeric = seedFromString(raw).toString(16).padStart(8, '0');
  return `0x${numeric}${numeric}${numeric}${numeric}${numeric}${numeric}${numeric}${numeric}`;
}

function buildNodes(imageId, seed) {
  const count = 4;
  const nodes = [];

  for (let i = 0; i < count; i += 1) {
    const reputation = clamp(0.78 + seededFloat(seed, i) * 0.2, 0, 0.99);
    const stakeWeight = clamp(0.5 + seededFloat(seed, i + 20) * 0.45, 0.5, 0.95);
    const sybilIp = clamp(0.7 + seededFloat(seed, i + 40) * 0.3, 0, 1);
    const sybilAsn = clamp(0.65 + seededFloat(seed, i + 60) * 0.35, 0, 1);
    const sybilWallet = clamp(0.75 + seededFloat(seed, i + 80) * 0.2, 0, 1);
    const sybilScore = Number(((sybilIp + sybilAsn + sybilWallet) / 3).toFixed(3));

    nodes.push({
      node_id: `node-${imageId.toString().padStart(4, '0')}-${i + 1}`,
      reputation: Number(reputation.toFixed(3)),
      stake_weight: Number(stakeWeight.toFixed(3)),
      latency_ms: Math.round(40 + seededFloat(seed, i + 100) * 70),
      sybil_components: {
        ip_diversity: Number(sybilIp.toFixed(3)),
        asn_distribution: Number(sybilAsn.toFixed(3)),
        wallet_age_quality: Number(sybilWallet.toFixed(3))
      },
      sybil_score: sybilScore
    });
  }

  return nodes;
}

function buildFragmentPlan(imageId, seed, nodes) {
  const fragmentCount = 6 + Math.floor(seededFloat(seed, 5) * 7);
  const fragments = [];

  for (let i = 0; i < fragmentCount; i += 1) {
    const node = nodes[i % nodes.length];
    fragments.push({
      fragment_id: `img-${imageId}-frag-${(i + 1).toString().padStart(2, '0')}`,
      byte_range: [i * 8192, (i + 1) * 8192 - 1],
      deterministic_hash: makeHash('fragment', imageId, seed + i),
      assigned_node: node.node_id,
      estimated_latency_ms: node.latency_ms + Math.round(seededFloat(seed, i + 120) * 25)
    });
  }

  return fragments;
}

export function buildDemoTaskPayload(imageId, taskId) {
  const seed = seedFromString(`${imageId}:${taskId}`);
  const nodes = buildNodes(imageId, seed);
  const fragments = buildFragmentPlan(imageId, seed, nodes);

  const nodeLogs = {
    submission: {
      accepted_at: new Date().toISOString(),
      deterministic_split: {
        micro_unit_count: fragments.length,
        split_strategy: 'fixed-size-8KB',
        fragment_root: makeHash('fragment-root', imageId, seed)
      }
    },
    scheduling: {
      mode: 'deterministic_weighted_round_robin',
      ranking_inputs: ['reputation', 'stake_weight', 'sybil_score', 'latency_ms'],
      selected_nodes: nodes,
      assignments: fragments.map((fragment) => ({
        fragment_id: fragment.fragment_id,
        assigned_node: fragment.assigned_node,
        score_basis: '0.4*reputation + 0.35*sybil + 0.25*stake'
      }))
    },
    execution: {
      environment: {
        runtime: 'wasm-sandbox-v1',
        model_digest: makeHash('model-digest', imageId, seed),
        deterministic_seed: seed
      },
      fragment_runs: fragments.map((fragment, index) => ({
        fragment_id: fragment.fragment_id,
        node_id: fragment.assigned_node,
        result_hash: makeHash('result', imageId, seed + index),
        execution_ms: fragment.estimated_latency_ms,
        log: 'Fixed execution environment (immutable model + deterministic kernel)'
      }))
    },
    validation: {
      quorum: 3,
      validator_nodes: nodes.slice(0, 3).map((node) => node.node_id),
      consensus_hash: makeHash('consensus', imageId, seed),
      method: 'multi-node-majority-with-trace-hash'
    }
  };

  const auditTrail = {
    task_id: taskId,
    image_id: imageId,
    hashes: {
      submission_hash: makeHash('submission', imageId, seed),
      fragment_root_hash: nodeLogs.submission.deterministic_split.fragment_root,
      execution_trace_hash: makeHash('execution-trace', imageId, seed),
      consensus_hash: nodeLogs.validation.consensus_hash,
      delivery_hash: makeHash('delivery', imageId, seed)
    },
    proof_mode: 'EXECUTION_TRACE_HASH',
    verification: {
      deterministic_replay: true,
      validator_quorum_met: true,
      signatures_collected: 3
    }
  };

  return {
    nodeLogs,
    auditTrail,
    fragments
  };
}

export function getStatusByElapsedMs(elapsedMs) {
  if (elapsedMs >= STAGE_WINDOWS_MS.COMPLETED) {
    return 'COMPLETED';
  }

  if (elapsedMs >= STAGE_WINDOWS_MS.VALIDATING) {
    return 'VALIDATING';
  }

  if (elapsedMs >= STAGE_WINDOWS_MS.EXECUTING) {
    return 'EXECUTING';
  }

  if (elapsedMs >= STAGE_WINDOWS_MS.SCHEDULING) {
    return 'SCHEDULING';
  }

  if (elapsedMs >= STAGE_WINDOWS_MS.FRAGMENTING) {
    return 'FRAGMENTING';
  }

  return 'SUBMITTING';
}

export function getTaskProjection(task) {
  const createdAtMs = new Date(task.created_at).getTime();
  const elapsedMs = Date.now() - createdAtMs;
  const status = getStatusByElapsedMs(elapsedMs);

  return {
    ...task,
    status,
    progress_pct: Math.min(100, Math.round((elapsedMs / STAGE_WINDOWS_MS.COMPLETED) * 100)),
    stage_windows_ms: STAGE_WINDOWS_MS,
    all_statuses: DEMO_STATUSES
  };
}
