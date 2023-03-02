import { BootstrapConsole } from 'nestjs-console';

import { ConsoleModule } from 'common/console';

const bootstrap = new BootstrapConsole({
  module: ConsoleModule,
  useDecorators: true,
});

bootstrap.init().then(async (app) => {
  try {
    await app.init();
    await bootstrap.boot();
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await app.close();
  }
});
