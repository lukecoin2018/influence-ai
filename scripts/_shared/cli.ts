import type { ProgressFn } from '../../lib/pipeline/types';

/**
 * Prints lib/pipeline progress the way the scripts always printed it: whole
 * lines through console.log, and transient counters ("  500/23697") with a
 * carriage return so they overwrite in place.
 */
export const printProgress: ProgressFn = (message, transient) => {
  if (transient) process.stdout.write(`\r${message}`);
  else console.log(message);
};

/** Runs a CLI main(), printing the error and exiting 1 on failure — the one place process.exit lives. */
export function runCli(main: () => Promise<void>): void {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
