import { createLogger, format, transports } from 'winston'
import { getConfig } from './environment';
export const logger = createLogger();

if (getConfig(process.env).env === 'production') {
    logger.add(new transports.File({ filename: 'error.log', level: 'error' }));
    logger.add(new transports.File({ filename: 'server.log' }))
}

logger.add(new transports.Console({
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(info => `[${info.level}] ${info.timestamp} ${info.message}`)
    ),  
}));