import { Metric } from 'storage/entities';

export type TrackedValsPerfRate = Metric & {
  labels: {
    vId: string;
    moniker: string;
  };
};

export type AggrValsPerfRate = Metric & {
  labels: Record<string, never>;
};
