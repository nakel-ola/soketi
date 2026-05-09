import { Cli } from './cli';
import { Command } from 'commander';

const program = new Command();

program
    .name('soketi')
    .usage('<command> [options]');

program
    .command('start')
    .description('Start the server.')
    .option('--config <path>', 'The path for the config file. (optional)')
    .action((options) => Cli.start(options));

program.parse();
