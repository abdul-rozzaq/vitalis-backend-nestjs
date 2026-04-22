import { WinstonModule, utilities as nestWinstonModuleUtilities } from "nest-winston";
import * as winston from "winston";
import LokiTransport from "winston-loki";

export const createWinstonLogger = () => {
  const removeStack = winston.format((info) => {
    delete info.stack;
    return info;
  });

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.json(),
        nestWinstonModuleUtilities.format.nestLike("Vitalis", {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
  ];

  if (process.env.LOKI_HOST) {
    transports.push(
      new LokiTransport({
        host: process.env.LOKI_HOST, // .env dan oladi
        labels: { app: "vitalis-backend" },
        json: true,
        format: winston.format.combine(removeStack(), winston.format.json()),
        replaceTimestamp: true,
        onConnectionError: (err) => console.error(err),
      }),
    );
  }

  return WinstonModule.createLogger({
    transports,
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json()),
  });
};
