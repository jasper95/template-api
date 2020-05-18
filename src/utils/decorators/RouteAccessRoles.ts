export type UserRole = 'Admin'
export const USER_ROLES: UserRole[] = ['Admin']
export const ADMIN_ROLES: UserRole[] = ['Admin']
export type ControllerRouteAccessRoles = {
  [key: string]: UserRole[]
}

const RouteAccessRoles = (roles: UserRole[] = USER_ROLES): MethodDecorator => {
  return (target: object, propertyKey: string) => {
    if (!Reflect.hasMetadata('access_roles', target.constructor)) {
      Reflect.defineMetadata('access_roles', {}, target.constructor)
    }
    let access_roles = Reflect.getMetadata('access_roles', target.constructor) as ControllerRouteAccessRoles
    access_roles = {
      ...access_roles,
      [propertyKey]: roles,
    }
    Reflect.defineMetadata('access_roles', access_roles, target.constructor)
  }
}

export default RouteAccessRoles
