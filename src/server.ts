import type { NextApiRequest, NextApiResponse } from 'next'
import * as DelightRPC from 'delight-rpc'
import { isNull } from '@blackglory/prelude'

export function createServer<IAPI>(
  api: DelightRPC.ImplementationOf<IAPI>
, { basicAuth, parameterValidators, version, ownPropsOnly, channel }: {
    basicAuth?: (username: string, password: string) => PromiseLike<boolean> | boolean
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    ownPropsOnly?: boolean
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
  } = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return async function (req: NextApiRequest, res: NextApiResponse): Promise<void> {
    res.setHeader('Cache-Control', 'no-store')

    if (basicAuth) {
      const basicAuthRegExp = /^Basic (?<credentials>[A-Za-z0-9+/=]+)$/
      const authorization = req.headers['authorization']
      const result = authorization?.match(basicAuthRegExp)
      if (result?.groups?.credentials) {
        const credentials = Buffer.from(result.groups.credentials, 'base64').toString('utf8')
        const [username, password] = credentials.split(':')
        if (await basicAuth(username, password)) {
          return await handle(req, res)
        }
      }

      res.status(401).setHeader('WWW-Authenticate', 'Basic realm="Secure Area"').end()
    } else {
      await handle(req, res)
    }
  }

  async function handle(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const request = req.body
    if (DelightRPC.isRequest(request) || DelightRPC.isBatchRequest(request)) {
      const response = await DelightRPC.createResponse(
        api
      , req.body
      , {
          parameterValidators
        , version
        , ownPropsOnly
        , channel
        }
      )

      if (isNull(response)) {
        res.status(400).send('The server does not support channel')
      } else {
        res.status(200).json(response)
      }
    } else {
      res.status(400).send('The payload is not a valid Delight RPC request.')
    }
  }
}
