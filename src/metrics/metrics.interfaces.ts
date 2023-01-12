import { Metric } from 'storage/entities';

export type TrackedValsPerfRate = Metric & {
  labels: {
    vId: string;
    moniker: string;
  };
};

export type AggrValsPerfRate = Metric & {
  labels: { [k: string]: never };
};

export type CmpValsPerfRate = Metric & TrackedValsPerfRate;
