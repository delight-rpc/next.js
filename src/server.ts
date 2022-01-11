import type { NextApiRequest, NextApiResponse } from 'next'
import * as DelightRPC from 'delight-rpc'

export function createServer<IAPI>(
  api: DelightRPC.ImplementationOf<IAPI>
, options: {
    basicAuth?: (username: string, password: string) => PromiseLike<boolean> | boolean
  , parameterValidators?: DelightRPC.ParameterValidators<IAPI>
  }
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return async function (req: NextApiRequest, res: NextApiResponse): Promise<void> {
    if (options.basicAuth) {
      const basicAuthRegExp = /^Basic (?<credentials>[A-Za-z0-9+/=]+)$/
      const authorization = req.headers['authorization']
      const result = authorization?.match(basicAuthRegExp)
      if (result?.groups?.credentials) {
        const credentials = Buffer.from(result.groups.credentials, 'base64').toString('utf8')
        const [username, password] = credentials.split(':')
        if (await options.basicAuth(username, password)) {
          return await handle(req, res)
        }
      }

      res.status(401).setHeader('WWW-Authenticate', 'Basic realm="Secure Area"').end()
    } else {
      await handle(req, res)
    }
  }

  async function handle(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const response = await DelightRPC.createResponse(
      api
    , req.body
    , options.parameterValidators
    )
    res.status(200).json(response)
  }
}
