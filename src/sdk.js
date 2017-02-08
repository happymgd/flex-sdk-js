import axios from 'axios';
import { methodPath, assignDeep } from './utils';
import { reader, writer } from './serializer';
import paramsSerializer from './params_serializer';

const defaultOpts = {
  baseUrl: 'https://api.sharetribe.com',
  typeHandlers: [],
  endpoints: [],
  adapter: null,
};

const defaultEndpoints = [
  { path: 'marketplace/show' },
  { path: 'users/show' },
  { path: 'listings/show' },
  { path: 'listings/query' },
  { path: 'listings/search' },
];

// const logAndReturn = data => {
//   console.log(data);
//   return data;
// };

const handleSuccessResponse = (response) => {
  const { status, statusText, data } = response;

  return { status, statusText, data };
};

const handleFailureResponse = (error) => {
  const response = error.response;

  if (response) {
    // The request was made, but the server responses with a status code
    // other than 2xx
    const { status, statusText, data } = response;
    return Promise.reject({ status, statusText, data });
  }

  // Something happened in setting up the request that triggered an Error
  return Promise.reject(error);
};

const withAuthToken = (baseUrl, clientId) => {
  return axios.request({
    method: 'post',
    baseURL: 'http://localhost:8088/v1/',
    url: '/auth/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    data: `client_id=${clientId}&grant_type=client_credentials&scope=public-read`
  }).then((res) => res.data.access_token);
};

const createSdkMethod = (req, axiosInstance, baseUrl, clientId) =>
  (params = {}) =>
    withAuthToken(baseUrl, clientId).then((authToken) => {
      const authHeader = { Authorization: `Bearer ${authToken}` };
      const reqHeaders = req.headers || {};
      const headers = { ...authHeader, ...reqHeaders };

      return axiosInstance.request({ ...req, headers, params })
                          .then(handleSuccessResponse, handleFailureResponse);
    });

/**
 * Mutates 'obj' by adding endpoint methods to it.
 *
 * @param {Object} obj - Object that will be assigned with the endpoints.
 * @param {Object[]} endpoints - endpoint definitions
 * @param {Object} axiosInstance
 *
 */
const assignEndpoints = (obj, endpoints, axiosInstance, baseUrl, clientId) => {
  endpoints.forEach((ep) => {
    const req = {
      url: ep.path,
    };

    const sdkMethod = createSdkMethod(req, axiosInstance, baseUrl, clientId);

    // e.g. '/marketplace/users/show/' -> ['marketplace', 'users', 'show']
    const path = methodPath(ep.path);

    // Assign `sdkMethod` to path.
    //
    // E.g. assign obj.marketplace.users.show = sdkMethod
    assignDeep(obj, path, sdkMethod);
  });

  // Return the mutated obj
  return obj;
};

export default class SharetribeSdk {

  /**
     Instantiates a new SharetribeSdk instance.
     The constructor assumes the config options have been
     already validated.
   */
  constructor(config) {
    this.config = { ...defaultOpts, ...config };

    const { baseUrl, typeHandlers, endpoints, adapter, clientId } = this.config;

    if (!clientId) {
      throw new Error('clientId must be provided');
    }

    const { readers, writers } = typeHandlers.reduce((memo, handler) => {
      const r = {
        type: handler.type,
        reader: handler.reader,
      };
      const w = {
        type: handler.type,
        customType: handler.customType,
        writer: handler.writer,
      };

      memo.readers.push(r);
      memo.writers.push(w);

      return memo;
    }, { readers: [], writers: [] });

    const r = reader(readers);
    const w = writer(writers);

    const httpOpts = {
      headers: { Accept: 'application/transit' },
      baseURL: baseUrl,
      transformRequest: [
        // logAndReturn,
        data => w.write(data),
      ],
      transformResponse: [
        // logAndReturn,
        data => r.read(data),
      ],
      paramsSerializer,
      adapter,
    };

    const axiosInstance = axios.create(httpOpts);
    const allEndpoints = [...defaultEndpoints, ...endpoints];

    // Assign all endpoint definitions to 'this'
    assignEndpoints(this, allEndpoints, axiosInstance, baseUrl, clientId);
  }
}
