import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name, { timestamp: true });

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

    super({
      adapter,
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "info" },
        { emit: "event", level: "warn" },
      ],
    });

    // Subscribe to query events
    this.$on("query", (event: Prisma.QueryEvent) => {
      this.logger.log(`Query: ${event.query}`);
      this.logger.log(`Params: ${event.params}`);
      this.logger.log(`Duration: ${event.duration}ms`);
    });

    // Subscribe to error events
    this.$on("error", (event: Prisma.LogEvent) => {
      this.logger.error(event.message);
    });

    // Subscribe to info/warn events
    this.$on("info", (event: Prisma.LogEvent) => {
      this.logger.log(event.message);
    });

    this.$on("warn", (event: Prisma.LogEvent) => {
      this.logger.warn(event.message);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Database disconnected");
  }
}
