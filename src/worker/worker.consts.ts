export const MAX_EXPECTED_BLOCK_FREQUENCY_SECONDS = 120;
export const SECS_PER_BLOCK = 12; // PoS
export const DRY_RUN_WINDOW = Math.floor((3 * 3600) / SECS_PER_BLOCK);
export const CHECKPOINTS_TO_KEEP = 100;
export const METRICS_COMPUTE_BATCH_SIZE = 100;
export const STALE_CHECKPOINT_THRESHOLD = 3 * 3600;

export const METRICS_RETENTION_JOB_NAME = 'metrics_retention';
export const METRICS_COMPUTE_JOB_NAME = 'metrics_compute';
export const STAKE_EVENTS_JOB_NAME = 'stake_events';
export const MAIN_JOB_NAME = 'main';
