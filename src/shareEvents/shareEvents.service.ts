import { BigNumber } from '@ethersproject/bignumber';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import {
  EVENTS_HUB_TOKEN,
  EventsHub,
  STAKING_INFO_TOKEN,
  ST_MATIC_ADDRESS,
  StakingInfo,
  TypedEvent,
} from 'contracts';
import { ShareBurnedWithIdEvent } from 'contracts/generated/EventsHub';
import { ShareMintedEvent } from 'contracts/generated/StakingInfo';
import { ShareEvent, ShareEventType } from 'storage/entities';
import { ValidatorsService } from 'validators';

const MATIC_DECIMALS = 18;

@Injectable()
export class ShareEventsService {
  constructor(
    @Inject(STAKING_INFO_TOKEN) protected readonly stakingInfo: StakingInfo,
    @Inject(EVENTS_HUB_TOKEN) protected readonly eventsHub: EventsHub,
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected readonly validators: ValidatorsService,

    protected readonly dataSource: DataSource,
  ) {
    this.chainId = this.configService.get('CHAIN_ID');
  }

  protected chainId: number;

  /**
   * Get shares minting events within the given blocks range
   */
  public async getStakeEvents(
    fromBlock: number,
    toBlock?: number,
  ): Promise<ShareMintedEvent[]> {
    const events = await this.stakingInfo.queryFilter(
      this.stakingInfo.filters.ShareMinted(
        undefined,
        ST_MATIC_ADDRESS[this.chainId],
      ),
      fromBlock,
      toBlock ?? fromBlock, // check the fromBlock only if no toBlock provided
    );

    this.logger.log(
      `${events.length} event(s) of type ShareMintedEvent found between blocks ${fromBlock} and ${toBlock}`,
    );

    return events;
  }

  /**
   * Get shares burning events within the given blocks range
   */
  public async getUnstakeEvents(
    fromBlock: number,
    toBlock?: number,
  ): Promise<ShareBurnedWithIdEvent[]> {
    const events = await this.eventsHub.queryFilter(
      this.eventsHub.filters.ShareBurnedWithId(
        undefined,
        ST_MATIC_ADDRESS[this.chainId],
      ),
      fromBlock,
      toBlock ?? fromBlock, // check the fromBlock only if no toBlock provided
    );

    this.logger.log(
      `${events.length} event(s) of type ShareBurnedWithIdEvent found between blocks ${fromBlock} and ${toBlock}`,
    );

    return events;
  }

  private guessEventType(event: TypedEvent): ShareEventType {
    const topic0 = event.topics.at(0);

    if (this.stakingInfo.filters.ShareMinted().topics.flat().includes(topic0)) {
      return ShareEventType.Minted;
    }

    if (
      this.eventsHub.filters.ShareBurnedWithId().topics.flat().includes(topic0)
    ) {
      return ShareEventType.Burned;
    }

    throw Error('Unable to determine the given event type');
  }

  public async processShareEvent(
    event: ShareMintedEvent | ShareBurnedWithIdEvent,
  ): Promise<ShareEvent> {
    const eventBlock = await event.getBlock();
    const entity = new ShareEvent();

    entity.blockTimestamp = eventBlock.timestamp;
    entity.blockNumber = eventBlock.number;
    entity.logIndex = event.logIndex;

    entity.vId = event.args.validatorId.toNumber();
    entity.moniker = this.validators.getMoniker(entity.vId);

    entity.type = this.guessEventType(event);
    entity.amount = event.args.amount
      .div(BigNumber.from(10).pow(MATIC_DECIMALS))
      .toNumber();

    return entity;
  }

  /**
   * Save the checkpoint and related entities to the storage
   */
  public async storeEvent(entity: ShareEvent): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(entity);

      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.warn('Unable to store share event');
      this.logger.error(err);

      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get the one event from the selected end (last / first)
   */
  public async getOneInOrder(
    type: ShareEventType,
    direction: 'asc' | 'desc',
  ): Promise<ShareEvent | null> {
    const entries = await this.dataSource.manager.find(ShareEvent, {
      where: {
        type,
      },
      order: {
        blockTimestamp: {
          direction,
        },
      },
      take: 1,
    });

    return entries.pop() ?? null;
  }

  public async getLastStakeEvent(): Promise<ShareEvent | null> {
    return await this.getOneInOrder(ShareEventType.Minted, 'desc');
  }

  public async getLastUnstakeEvent(): Promise<ShareEvent | null> {
    return await this.getOneInOrder(ShareEventType.Burned, 'desc');
  }
}
