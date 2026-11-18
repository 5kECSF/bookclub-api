export const pick = (object, allowedKeys) => {
  //Iterates over the allowed keys only, much more effictive
  return allowedKeys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      // eslint-disable-next-line no-param-reassign
      if (object[key] !== 'undefined') {
        obj[key] = object[key];
      }
    }
    return obj;
  }, {});
};

export function removeKeys(obj: Record<string, any>, keysToRemove: string[]): Record<string, any> {
  const newObj: Record<string, any> = { ...obj }; // Create a shallow copy of the original object

  keysToRemove.forEach((key) => {
    if (newObj.hasOwnProperty(key)) {
      delete newObj[key]; // Remove the key if it exists in the object
    }
  });

  return newObj;
}

export function pickKeys(obj: Record<string, any>, keysToKeep: string[]): Record<string, any> {
  const newObj: Record<string, any> = {};

  keysToKeep.forEach((key) => {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] != 'null' || obj[key] != 'undefined') {
        newObj[key] = obj[key];
      }
    }
  });

  return newObj;
}

/**
 * parses booleans coming from query strings (`'false'` is truthy in JS)
 * returns `undefined` when the value is absent/unknown so callers can apply their own default
 */
export function parseBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(str)) return true;
  if (['false', '0', 'no'].includes(str)) return false;
  return undefined;
}

/** class-transformer `@Transform` callback for boolean query params */
export const toBoolTransform = ({ value }: { value: unknown }) => {
  const parsed = parseBool(value);
  return parsed === undefined ? value : parsed;
};
