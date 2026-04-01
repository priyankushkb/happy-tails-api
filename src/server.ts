import { app } from './app';
import { ENV } from './lib/env';

app.listen(ENV.PORT, () => {
  console.log(
    `Happy Tails Home API running on http://localhost:${ENV.PORT} in ${ENV.NODE_ENV} mode`
  );
});