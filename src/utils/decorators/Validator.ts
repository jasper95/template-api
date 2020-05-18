import { JSONSchema7 } from 'json-schema'

export type ControllerValidators = {
  [key: string]: JSONSchema7
}

const Validator = (validator: JSONSchema7): MethodDecorator => {
  return (target: object, propertyKey: string) => {
    if (!Reflect.hasMetadata('validators', target.constructor)) {
      Reflect.defineMetadata('validators', {}, target.constructor)
    }
    let validators = Reflect.getMetadata('validators', target.constructor) as ControllerValidators
    validators = {
      ...validators,
      [propertyKey]: validator,
    }
    Reflect.defineMetadata('validators', validators, target.constructor)
  }
}

export default Validator
