# @delight-rpc/next.js
## Install
```sh
npm install --save @delight-rpc/next.js
# or
yarn add @delight-rpc/next.js
```

## Usage
```ts
// api.d.ts
interface IAPI {
  echo(message: string): string
}

// src/pages/api/rpc.ts
import { createServer } from '@delight-rpc/next.js'

const api: IAPI = {
  echo(message: string): string {
    return message
  }
}

export default createServer(api, {})
```

## API
### createServer
```ts
function createServer<IAPI>(
  api: IAPI
, options: {
    basicAuth?: (username: string, password: string) => PromiseLike<boolean> | boolean
  , parameterValidators?: DelightRPC.ParameterValidators<IAPI>
  }
): (req: NextApiRequest, res: NextApiResponse) => Promise<void>
```
