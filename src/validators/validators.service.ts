import { readFile } from 'fs/promises';

import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { CallOverrides } from '@ethersproject/contracts';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { range } from '@lido-nestjs/utils';
import {
  Inject,
  Injectable,
  LoggerService,
  OnModuleInit,
} from '@nestjs/common';

import { ConfigService } from 'common/config';
import { LRU } from 'common/helpers';
import {
  NODE_OPERATORS_REGISTRY_V1_TOKEN,
  NODE_OPERATORS_REGISTRY_V2_TOKEN,
  NodeOperatorStatusV1,
  NodeOperatorStatusV2,
  NodeOperatorsRegistryV1,
  NodeOperatorsRegistryV2,
  STAKE_MANAGER_TOKEN,
  STAKING_NFT_TOKEN,
  StakeManager,
  StakingNft,
  ValidatorInfo,
} from 'contracts';

import { POLIDO_V2_BLOCK, Status } from './validators.consts';
import { Validator } from './validators.interfaces';

@Injectable()
export class ValidatorsService implements OnModuleInit {
  private signersCache: LRU<string, number>;
  public monikers: Map<string, string>;

  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    @Inject(NODE_OPERATORS_REGISTRY_V1_TOKEN)
    protected readonly nodeOperatorsRegistryV1: NodeOperatorsRegistryV1,
    @Inject(NODE_OPERATORS_REGISTRY_V2_TOKEN)
    protected readonly nodeOperatorsRegistryV2: NodeOperatorsRegistryV2,
    @Inject(STAKE_MANAGER_TOKEN) protected readonly stakeManager: StakeManager,
    @Inject(STAKING_NFT_TOKEN) protected readonly stakingNFT: StakingNft,
  ) {
    this.signersCache = new LRU(500);
    this.monikers = new Map();
  }

  /**
   * Read monikers from the configured file path and return changes
   */
  public async syncMonikers(): Promise<Map<string, string>> {
    const path = this.configService.get('MONIKERS_JSON');
    const diff = new Map<string, string>();

    try {
      this.logger.debug('Reading monikers from JSON file');

      const json = await readFile(path, { encoding: 'utf8' });
      const monikers = JSON.parse(json);

      for (const k of Object.keys(monikers)) {
        const p = this.monikers.get(k);
        const v = monikers[k];

        if (!p || p !== v) {
          this.monikers.set(k, v);
          diff.set(k, v);
        }
      }
    } catch (err) {
      this.logger.error('Unable to synchonize monikers');
      this.logger.error(err);
      throw err;
    }

    return diff;
  }

  public async onModuleInit() {
    await this.syncMonikers();
  }

  /**
   * Check if validator is active at the given epoch
   */
  public isValidator(validator: ValidatorInfo, epoch: BigNumber): boolean {
    // StakeManager.sol:811
    return (
      validator.amount.gt(0) &&
      (validator.deactivationEpoch.isZero() ||
        validator.deactivationEpoch.gt(epoch)) &&
      validator.status === Status.Active
    );
  }

  /**
   * Get validator's moniker by id
   */
  public getMoniker(id: BigNumberish): string {
    const strId = id.toString();
    if (this.monikers.has(strId)) {
      return this.monikers.get(strId);
    }

    return `Anonymous ${strId}`;
  }

  /**
   * Get validator id by signer address.
   * Assume that signer address may used only once by the single one validator.
   */
  public async signerToValidatorId(
    signer: string,
    opts: CallOverrides,
  ): Promise<number> {
    const cached = this.signersCache.get(signer);
    if (cached !== undefined) return cached;

    const id = (
      await this.stakeManager.signerToValidator(signer, opts)
    ).toNumber();
    this.signersCache.set(signer, id);
    this.logger.debug(`Signer ${signer} bound with the validator ${id}`);

    return id;
  }

  private async getActiveLidoValidatorsIdsV1(
    opts: CallOverrides,
  ): Promise<number[]> {
    const ops = await this.nodeOperatorsRegistryV1.getOperatorIds(opts);
    const ids = await Promise.all(
      ops.map(async (id) => {
        const info = await this.nodeOperatorsRegistryV1[
          'getNodeOperator(uint256)'
        ](id, opts);
        if (info.status === NodeOperatorStatusV1.Active) {
          return info.validatorId.toNumber();
        }
      }),
    );

    return [...new Set(ids.filter(Boolean))]; // skip undefined for non-active operators
  }

  private async getActiveLidoValidatorsIdsV2(
    opts: CallOverrides,
  ): Promise<number[]> {
    const vIds = await this.nodeOperatorsRegistryV2.getValidatorIds(opts);
    const ids = await Promise.all(
      vIds.map(async (id) => {
        const status = await this.nodeOperatorsRegistryV2.getNodeOperatorStatus(
          id,
        );
        if (status === NodeOperatorStatusV2.Active) {
          return id.toNumber();
        }
      }),
    );

    return [...new Set(ids.filter(Boolean))]; // skip undefined for non-active operators
  }

  /**
   * Fetch Lido validators ids from the registry
   */
  private async getActiveLidoValidatorsIds(
    opts: CallOverrides,
  ): Promise<number[]> {
    const ids = this.isPoLidoV1(opts)
      ? await this.getActiveLidoValidatorsIdsV1(opts)
      : await this.getActiveLidoValidatorsIdsV2(opts);

    this.logger.debug(
      `Lido validators ids: [${ids}] at block ${opts.blockTag ?? 'latest'}`,
    );

    return ids;
  }

  public async getTrackedValidatorsIds(opts: CallOverrides): Promise<number[]> {
    const staticIds = this.configService.get('TRACKED_IDS');
    if (staticIds?.length) {
      return staticIds;
    }

    return await this.getActiveLidoValidatorsIds(opts);
  }

  /**
   * Fetch all validators ids from StakingNFT contract
   */
  public async getAllValidatorsIds(opts: CallOverrides): Promise<number[]> {
    const nftCount = await this.stakingNFT.totalSupply(opts);
    const ids = await Promise.all(
      range(0, nftCount.toNumber()).map(async (i) =>
        Number(await this.stakingNFT.tokenByIndex(i, opts)),
      ),
    );

    return ids;
  }

  /**
   * Get all validators information
   */
  public async getAllValidators(opts: CallOverrides): Promise<Validator[]> {
    const ids = await this.getAllValidatorsIds(opts);
    const vals = await Promise.all(
      ids.map(async (id) => {
        return { id, ...(await this.stakeManager.validators(id, opts)) };
      }),
    );

    return vals;
  }

  /**
   * Get validators active set
   */
  public async getValidatorsActiveSet(
    opts: CallOverrides,
    epoch?: BigNumber,
  ): Promise<Validator[]> {
    epoch = epoch || (await this.stakeManager.epoch(opts));
    const vals = (await this.getAllValidators(opts)).filter((v) =>
      this.isValidator(v, epoch),
    );

    return vals;
  }

  private isPoLidoV1(opts: CallOverrides): boolean {
    const blockTag = Number(opts?.blockTag);
    if (!blockTag) {
      // either undefined or 'latest'
      return false; // modern by default
    }

    const chainId = this.configService.get('CHAIN_ID');
    const shiftTs = POLIDO_V2_BLOCK[chainId];

    if (!shiftTs) {
      throw Error(`Unknown chain id ${chainId}`);
    }

    return blockTag < shiftTs;
  }
}
