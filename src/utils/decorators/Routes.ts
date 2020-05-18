import { HttpMethod, RouteDefinition, SwaggerParams } from 'types'

export const Get = (path?: string, swagger_params?: SwaggerParams): MethodDecorator => {
  return getDecoratorHandler(path, 'get', swagger_params)
}

export const Post = (path?: string, swagger_params?: SwaggerParams): MethodDecorator => {
  return getDecoratorHandler(path, 'post', swagger_params)
}

export const Put = (path?: string, swagger_params?: SwaggerParams): MethodDecorator => {
  return getDecoratorHandler(path, 'put', swagger_params)
}

export const Delete = (path?: string, swagger_params?: SwaggerParams): MethodDecorator => {
  return getDecoratorHandler(path, 'del', swagger_params)
}

export function getDecoratorHandler(path = '', requestMethod: HttpMethod, swagger_params?: SwaggerParams) {
  return (target: object, propertyKey: string): void => {
    if (!Reflect.hasMetadata('routes', target.constructor)) {
      Reflect.defineMetadata('routes', [], target.constructor)
    }

    const routes = Reflect.getMetadata('routes', target.constructor) as Array<RouteDefinition>

    routes.push({
      requestMethod,
      path,
      methodName: propertyKey,
      swagger_params,
    })
    Reflect.defineMetadata('routes', routes, target.constructor)
  }
}
