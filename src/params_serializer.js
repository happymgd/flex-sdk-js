import _ from 'lodash';
import { UUID, LatLng, LatLngBounds } from './types';

/**
 * Takes a value for query string and returns it in encoded form.
 *
 * Uses `encodeURIComponent` with few exceptions:
 *
 * - Don't encode comma (,)
 *
 * Inspired by the `encode` function in Axios:
 * https://github.com/mzabriskie/axios/blob/b8f6f5049cf3da8126a184b6b270316402b5b374/lib/helpers/buildURL.js#L5
 */
const encode = value => encodeURIComponent(value).replace(/%2C/gi, ',');

/**
 * Take `key` and `value` and return a key-value tuple where
 * key and value are stringified.
 *
 * TODO Consider moving this function closer to the type definitions,
 * maybe in types.js file(?).
 */
const serialize = (key, value) => {
  let v = value;

  if (value instanceof UUID) {
    v = value.uuid;
  } else if (value instanceof LatLng) {
    v = `${value.lat},${value.lng}`;
  } else if (value instanceof LatLngBounds) {
    v = `${value.ne.lat},${value.ne.lng},${value.sw.lat},${value.sw.lng}`;
  } else if (Array.isArray(value)) {
    v = value;
  } else if (typeof value === 'object') {
    throw new Error(`Don't know how to serialize query parameter '${key}': ${value}`);
  }

  return [key, encode(v)];
};

const paramsSerializer = params =>
  _.map(params, (value, key) => serialize(key, value).join('=')).join('&');

export default paramsSerializer;
