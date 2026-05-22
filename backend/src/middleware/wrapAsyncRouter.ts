import { NextFunction, Request, RequestHandler, Response, Router } from 'express'

type RouteLayer = {
  handle: RequestHandler & { __smartleaseAsyncWrapped?: boolean }
}

function wrapHandler(handler: RouteLayer['handle']): RequestHandler {
  if (handler.__smartleaseAsyncWrapped || handler.length > 3) return handler

  const wrapped = function wrappedAsyncRoute(this: unknown, req: Request, res: Response, next: NextFunction) {
    try {
      const result = (handler as unknown as (
        this: unknown,
        req: Request,
        res: Response,
        next: NextFunction
      ) => unknown).call(this, req, res, next)

      const maybePromise = result as Promise<unknown> | undefined
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(next)
      }
      return result
    } catch (err) {
      next(err)
    }
  } as RequestHandler & { __smartleaseAsyncWrapped?: boolean }

  wrapped.__smartleaseAsyncWrapped = true
  return wrapped
}

export function wrapAsyncRouter(router: Router) {
  const stack = (router as any).stack || []
  for (const layer of stack) {
    const routeStack: RouteLayer[] | undefined = layer.route?.stack
    if (!routeStack) continue

    for (const routeLayer of routeStack) {
      routeLayer.handle = wrapHandler(routeLayer.handle) as RouteLayer['handle']
    }
  }

  return router
}
