export function assertDestructiveCommandAllowed(
  command: 'seed' | 'reset' | 'clear',
): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`The ${command} command is disabled in production.`);
  }

  const confirmationVariable = `CONFIRM_DESTRUCTIVE_${command.toUpperCase()}`;
  if (process.env[confirmationVariable] !== 'true') {
    throw new Error(
      `${command} deletes database data. Set ${confirmationVariable}=true only after confirming the target database.`,
    );
  }
}
