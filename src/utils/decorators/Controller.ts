export const Controller = (prefix = '', tag = 'default'): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata('prefix', prefix, target)
    Reflect.defineMetadata('tag', tag, target)

    if (!Reflect.hasMetadata('routes', target)) {
      Reflect.defineMetadata('routes', [], target)
    }
    if (!Reflect.hasMetadata('validators', target)) {
      Reflect.defineMetadata('validators', {}, target)
    }
    if (!Reflect.hasMetadata('access_roles', target)) {
      Reflect.defineMetadata('access_roles', {}, target)
    }
  }
}
