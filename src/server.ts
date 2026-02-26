import type { NextApiRequest, NextApiResponse } from 'next'
import * as DelightRPC from 'delight-rpc'
import { isNull } from '@blackglory/prelude'
import { AbortController } from 'extra-abort'
import { SyncDestructor } from 'extra-defer'
import { HashMap } from '@blackglory/structures'

export function createServer<IAPI>(
  api: DelightRPC.ImplementationOf<IAPI>
, { basicAuth, parameterValidators, version, ownPropsOnly, channel }: {
    basicAuth?: (username: string, password: string) => PromiseLike<boolean> | boolean
    parameterValidators?: DelightRPC.ParameterValidators<IAPI>
    version?: `${number}.${number}.${number}`
    ownPropsOnly?: boolean
    channel?: string | RegExp | typeof DelightRPC.AnyChannel
  } = {}
): [
  server: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
, close: () => void
] {
  const destructor = new SyncDestructor()

  const channelIdToController: HashMap<
    {
      channel?: string
    , id: string
    }
  , AbortController
  > = new HashMap(({ channel, id }) => JSON.stringify([channel, id]))
  destructor.defer(abortAllPendings)

  return [server, close]

  function close(): void {
    destructor.execute()
  }

  function abortAllPendings(): void {
    for (const controller of channelIdToController.values()) {
      controller.abort()
    }

    channelIdToController.clear()
  }

  async function server(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    res.setHeader('Cache-Control', 'no-store')

    if (basicAuth) {
      const basicAuthRegExp = /^Basic (?<credentials>[A-Za-z0-9+/=]+)$/
      const authorization = req.headers['authorization']
      const result = authorization?.match(basicAuthRegExp)
      if (result?.groups?.credentials) {
        const credentials = Buffer.from(
          result.groups.credentials
        , 'base64'
        ).toString('utf8')
        const [username, password] = credentials.split(':')

        if (await basicAuth(username, password)) {
          return await handleMessage(req, res)
        }
      }

      res
        .status(401)
        .setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
        .end()
    } else {
      await handleMessage(req, res)
    }
  }

  async function handleMessage(
    req: NextApiRequest
  , res: NextApiResponse
  ): Promise<void> {
    const message = req.body
    if (DelightRPC.isRequest(message) || DelightRPC.isBatchRequest(message)) {
      const destructor = new SyncDestructor()

      const controller = new AbortController()
      channelIdToController.set(message, controller)
      destructor.defer(() => channelIdToController.delete(message))

      const response = await DelightRPC.createResponse(
        api
      , req.body
      , {
          parameterValidators
        , version
        , ownPropsOnly
        , channel
        , signal: controller.signal
        }
      )

      if (isNull(response)) {
        res
          .status(400)
          .send('The server does not support this channel.')
      } else {
        res
          .status(200)
          .json(response)
      }
    } else if (DelightRPC.isAbort(message)) {
      if (DelightRPC.matchChannel(message, channel)) {
        channelIdToController.get(message)?.abort()
        channelIdToController.delete(message)

        res
          .status(204)
          .send('')
      } else {
        res
          .status(400)
          .send(`The server does not support this channel.`)
      }
    } else {
      res
        .status(400)
        .send('The payload is not a valid Delight RPC request.')
    }
  }
}
